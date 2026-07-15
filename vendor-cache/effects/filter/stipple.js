/* filter/stipple */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Stipple",namespace:"filter",func:"stipple",tags:["pixel","noise","artist"],description:"Discrete random marks reproducing image tone: pointillize dots, mezzotint dots/lines/strokes, or reticulation (Pointillize, Mezzotint, Reticulation)",globals:{mode:{type:"int",default:0,define:"MODE",choices:{pointillize:0,mezzoDots:1,mezzoLines:2,mezzoStrokes:3,reticulation:4},ui:{label:"mode",control:"dropdown"}},cellSize:{type:"float",default:8,uniform:"cellSize",min:3,max:64,ui:{label:"cell size",control:"slider",enabledBy:{param:"mode",eq:0}}},grainSize:{type:"float",default:2,uniform:"grainSize",min:.5,max:16,ui:{label:"grain size",control:"slider",enabledBy:{param:"mode",neq:0}}},density:{type:"float",default:50,uniform:"density",min:0,max:100,ui:{label:"density",control:"slider",enabledBy:{param:"mode",neq:0}}},paperColor:{type:"color",default:[.98,.96,.9],uniform:"paperColor",ui:{label:"paper color",control:"color",enabledBy:{param:"mode",eq:0}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},passes:[{name:"render",program:"stipple",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={stipple:{glsl:`/*
 * Stipple - discrete random marks reproducing image tone. Covers three
 * filters via \`mode\`:
 *
 *   pointillize (0)  - Colored dots on a paper
 *                       background, one dot per jittered-grid Voronoi
 *                       cell (Voronoi), sized by that cell's own darkness.
 *                       Inside the dot the color is the image sampled at
 *                       the cell's seed point (flat per dot, like real
 *                       pointillism); outside is paperColor.
 *   mezzoDots/Lines/Strokes (1/2/3) - Mezzotint dots/lines/
 *                       strokes conversion types: each RGB channel is
 *                       independently hard-thresholded against a shaped
 *                       value-noise field, producing the harsh per-
 *                       channel black/white/primary speckle real
 *                       mezzotint conversion has. No AA is applied to the
 *                       threshold; mezzotint is a hard binary process, and
 *                       softening it would blur the per-
 *                       channel color separation that makes the effect
 *                       read as mezzotint rather than an ordered dither.
 *   reticulation (4) - A two-tone ink/paper tonemap driven by fBm "clump" noise
 *                       whose amplitude is modulated by local luminance,
 *                       so shadows fill in with dense broad clumps and
 *                       highlights break up into fine grain.
 *
 * Single pass on global (tile-aware) pixel coordinates so every pattern
 * (Voronoi grid, noise field) is continuous across CLI render tiles.
 *
 * \`density\` biases the ink/paper balance in BOTH the mezzo branch (its
 * threshold n) and the reticulation branch (its threshold clumpNoise)
 * with the identical (density-50)/100 term. Density acts as reticulation
 * balance / mezzo bias, and clumpNoise-vs-lum is
 * structurally the same threshold-vs-value pairing as mezzo's n-vs-
 * channel, so the same bias mechanism was extended there for a
 * consistent, non-dead control across every mode that enables it.
 *
 * mezzoStrokes rotates the sampling position 45 degrees before shaping
 * the anisotropic (line) noise. That rotation is applied to
 * position-derived geometry (the fragment's own global coordinate), using
 * the mat2(c,-s,s,c) rotation form shared with filter/halftone.
 * The rotation can push the noise-lookup position negative even though
 * globalCoord itself never is; every noise/hash function below is built
 * from \`floor\`/\`fract\`, which are floor-based (not truncated) in GLSL
 * for negative inputs, so no separate floored-mod wrap is needed here
 * (same reasoning as filter/halftone's rotated cell math).
 */

#ifdef GL_ES
precision highp float;
#endif

// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`). Wrapping the 5-way variant dispatch in #if blocks
// instead of a runtime int dispatch lets the compiler drop the unreachable
// mode arms instead of inlining all 5 at the single call site.
#ifndef MODE
#define MODE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float cellSize;
uniform float grainSize;
uniform float density;
uniform vec3 paperColor;
uniform int seed;

out vec4 fragColor;

// hash - hash / jitter.
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// luminance - luminance.
float lum(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// value noise - value noise + fBm.
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

// Voronoi - jittered-grid Voronoi cell: returns xy = seed point in the same
// cell-space units as \`p\`, zw = integer cell id. Search radius is one
// ring of neighbor cells, so jitter must stay within [0, 1] for the
// nearest seed to always be found within the search window.
vec4 voronoiCell(vec2 p, float jitter, float seedVal) {
    vec2 g = floor(p);
    vec2 f = p - g;
    float best = 1e9;
    vec4 res = vec4(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 cell = vec2(float(x), float(y));
            vec2 pt = cell + 0.5 + (hash22(g + cell + seedVal * 101.7) - 0.5) * jitter;
            float d = dot(pt - f, pt - f);
            if (d < best) {
                best = d;
                res = vec4(g + pt, g + cell);
            }
        }
    }
    return res;
}

// ink/paper tonemapping - ink/paper tonemap.
vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Rotates a position-derived (global pixel space) vector by angleDeg.
// GLSL mat2(c,-s,s,c) rotation for the global pixel coordinate.
vec2 rotate2D(vec2 v, float angleDeg) {
    float a = radians(angleDeg);
    float co = cos(a);
    float si = sin(a);
    return mat2(co, -si, si, co) * v;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / resolution;
    float alpha = texture(inputTex, uv).a;
    vec3 result;

#if MODE == 0
    // Pointillize: one dot per jittered Voronoi cell (cellSize px),
    // colored and sized from the image at that cell's own seed
    // point; darker seed colors get bigger dots. Background is
    // paperColor. fwidth-based AA on the dot edge.
    vec2 p = globalCoord / cellSize;
    vec4 cell = voronoiCell(p, 0.9, float(seed));
    vec2 seedGc = cell.xy * cellSize;
    vec2 seedUV = clamp((seedGc - tileOffset) / resolution, 0.0, 1.0);
    vec3 seedColor = texture(inputTex, seedUV).rgb;
    float radius = 0.35 + 0.4 * (1.0 - lum(seedColor));
    float d = length(p - cell.xy);
    float aa = max(fwidth(d) * 1.5, 0.00001);
    float inside = 1.0 - smoothstep(radius - aa, radius + aa, d);
    result = mix(paperColor, seedColor, inside);
#elif MODE == 1 || MODE == 2 || MODE == 3
    // Mezzotint dots/lines/strokes: per-channel hard threshold
    // against shaped value noise. density biases the threshold (n)
    // directly, so higher density raises n and lowers the fraction
    // of channel values that clear it - i.e. more ink.
    vec2 gc = globalCoord;
#if MODE == 3
    gc = rotate2D(gc, 45.0);
#endif
    vec2 noiseP;
#if MODE == 1
    noiseP = gc / grainSize;
#else
    // Anisotropic (line) noise: the Y component keeps the coarse
    // (grainSize*8) scale and X keeps the fine (grainSize) scale,
    // so the field is coherent/slowly-varying down each column
    // and decorrelates quickly across a row - i.e. streaks
    // elongated along Y (vertical). Swapped from a
    // literal x-coarse/y-fine reading of the spec, which was
    // verified (lag-1 luma autocorrelation on a solid-color
    // source region: 0.94 along X vs 0.49 along Y before this
    // swap) to render HORIZONTAL streaks instead.
    noiseP = gc * vec2(1.0 / grainSize, 1.0 / (grainSize * 8.0));
#endif
    float n = vnoise(noiseP + float(seed) * 101.7);
    n += (density - 50.0) / 100.0;
    vec3 src = texture(inputTex, uv).rgb;
    result = vec3(step(n, src.r), step(n, src.g), step(n, src.b));
#else
    // Reticulation: two-tone ink/paper tonemap against clumped fBm
    // noise; the noise amplitude is luminance-modulated so shadows
    // fill in with broad dense clumps and highlights break into
    // fine grain. density biases the ink/paper balance using the
    // exact same (density-50)/100 term the mezzo branch applies to
    // its threshold, since clumpNoise vs l is structurally the same
    // threshold-vs-value pairing as mezzo's n vs channel.
    vec3 src = texture(inputTex, uv).rgb;
    float l = lum(src);
    float clumpNoise = fbm(globalCoord / (grainSize * 4.0) + float(seed) * 101.7) * mix(1.2, 0.6, l);
    clumpNoise += (density - 50.0) / 100.0;
    result = tonemap2(step(clumpNoise, l), vec3(0.05), vec3(0.97));
#endif

    fragColor = vec4(result, alpha);
}
`,wgsl:`/*
 * Stipple - discrete random marks reproducing image tone. See
 * stipple.glsl for the full algorithm derivation and mode
 * mapping; this is a 1:1 port.
 *
 * tileOffset converts tile-local positions into global procedural
 * coordinates and converts each global pointillize seed back into the local
 * input texture. It is zero for ordinary full-frame renders.
 *
 * mezzoStrokes's 45-degree rotation matches GLSL's column-major
 * mat2(c,-s,s,c) multiplication numerically so the marks keep the same
 * presented slope on both backends. Every noise/hash helper below is built from WGSL's
 * \`floor\`/\`fract\`, which - like GLSL's - are floor-based (not
 * truncated) for negative inputs, so the negative positions the
 * rotation can produce need no separate floored-mod wrap.
 *
 * MODE is a compile-time const injected by the runtime via injectDefines
 * (see definition.js \`globals.mode.define\`). Same fix as the GLSL
 * backend - collapses the 5-way mode dispatch so it constant-folds
 * instead of branching on a runtime uniform. The old \`mode\` field is
 * removed from Uniforms; the packer maps the remaining fields by name to
 * recomputed byte offsets, so removal is safe.
 */

struct Uniforms {
    cellSize: f32,
    grainSize: f32,
    density: f32,
    paperColor: vec3<f32>,
    seed: i32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// hash - hash / jitter.
fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.xyx) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.xx + p3.yz) * p3.zy);
}

// luminance - luminance.
fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// value noise - value noise + fBm.
fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

fn fbm(p_in: vec2<f32>) -> f32 {
    var p = p_in;
    var v = 0.0;
    var a = 0.5;
    for (var i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

// Voronoi - jittered-grid Voronoi cell: returns xy = seed point in the same
// cell-space units as \`p\`, zw = integer cell id.
fn voronoiCell(p: vec2<f32>, jitter: f32, seedVal: f32) -> vec4<f32> {
    let g = floor(p);
    let f = p - g;
    var best = 1e9;
    var res = vec4<f32>(0.0);
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let cell = vec2<f32>(f32(x), f32(y));
            let pt = cell + 0.5 + (hash22(g + cell + seedVal * 101.7) - 0.5) * jitter;
            let d = dot(pt - f, pt - f);
            if (d < best) {
                best = d;
                res = vec4<f32>(g + pt, g + cell);
            }
        }
    }
    return res;
}

// ink/paper tonemapping - ink/paper tonemap.
fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Numeric expansion of GLSL mat2(co,-si,si,co) * v.
fn rotate2D(v: vec2<f32>, angleDeg: f32) -> vec2<f32> {
    let a = radians(angleDeg);
    let co = cos(a);
    let si = sin(a);
    return vec2<f32>(co * v.x + si * v.y, -si * v.x + co * v.y);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = pos.xy / texSize;
    let alpha = textureSample(inputTex, inputSampler, uv).a;
    var result: vec3<f32>;

    if (MODE == 0) {
        // Pointillize.
        let p = globalCoord / uniforms.cellSize;
        let cell = voronoiCell(p, 0.9, f32(uniforms.seed));
        let seedGc = cell.xy * uniforms.cellSize;
        let seedUV = clamp((seedGc - uniforms.tileOffset) / texSize,
            vec2<f32>(0.0), vec2<f32>(1.0));
        let seedColor = textureSample(inputTex, inputSampler, seedUV).rgb;
        let radius = 0.35 + 0.4 * (1.0 - lum(seedColor));
        let d = length(p - cell.xy);
        let aa = max(fwidth(d) * 1.5, 0.00001);
        let inside = 1.0 - smoothstep(radius - aa, radius + aa, d);
        result = mix(uniforms.paperColor, seedColor, inside);
    } else if (MODE == 1 || MODE == 2 || MODE == 3) {
        // Mezzotint dots/lines/strokes.
        var gc = globalCoord;
        if (MODE == 3) {
            gc = rotate2D(gc, 45.0);
        }
        var noiseP: vec2<f32>;
        if (MODE == 1) {
            noiseP = gc / uniforms.grainSize;
        } else {
            // See stipple.glsl: Y keeps the coarse scale, X the fine
            // scale, so streaks run vertically.
            noiseP = gc * vec2<f32>(1.0 / uniforms.grainSize, 1.0 / (uniforms.grainSize * 8.0));
        }
        var n = vnoise(noiseP + f32(uniforms.seed) * 101.7);
        n = n + (uniforms.density - 50.0) / 100.0;
        let src = textureSample(inputTex, inputSampler, uv).rgb;
        result = vec3<f32>(step(n, src.r), step(n, src.g), step(n, src.b));
    } else {
        // Reticulation.
        let src = textureSample(inputTex, inputSampler, uv).rgb;
        let l = lum(src);
        var clumpNoise = fbm(globalCoord / (uniforms.grainSize * 4.0) + f32(uniforms.seed) * 101.7) * mix(1.2, 0.6, l);
        clumpNoise = clumpNoise + (uniforms.density - 50.0) / 100.0;
        result = tonemap2(step(clumpNoise, l), vec3<f32>(0.05), vec3<f32>(0.97));
    }

    return vec4<f32>(result, alpha);
}
`}},s=`# stipple

Discrete random marks reproducing image tone: pointillize dots, mezzotint dots/lines/strokes, or reticulation (Pointillize, Mezzotint, Reticulation)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | 0 | pointillize:0, mezzoDots:1, mezzoLines:2, mezzoStrokes:3, reticulation:4 | pointillize paints colored dots on paperColor, one per Voronoi cell; mezzoDots/Lines/Strokes hard-threshold each RGB channel against isotropic/vertical-streak/diagonal-streak value noise (Mezzotint's three conversion types); reticulation is a two-tone ink/paper tonemap against clumped fBm noise |
| cellSize | float | 8 | 3-64 | pointillize-only; Voronoi cell size in pixels (dot spacing) |
| grainSize | float | 2 | 0.5-16 | mezzo/reticulation-only; noise scale - smaller values give finer grain |
| density | float | 50 | 0-100 | mezzo/reticulation-only; biases the noise threshold - higher values darken the result (more ink) |
| paperColor | color | [0.98, 0.96, 0.9] | - | pointillize-only; background color showing between dots |
| seed | int | 1 | 1-100 | Randomizes the dot jitter / noise field pattern without changing its statistics |

## Notes

- Single pass, evaluated on global (tile-aware) pixel coordinates so the dot grid and noise fields align seamlessly across CLI render tiles.
- Pointillize dot radius grows with the cell seed point's inverse luminance (darker areas get bigger dots), matching Pointillize's tendency to thicken coverage in shadow regions; edges are antialiased via \`fwidth\`.
- Mezzotint modes are intentionally hard-edged (no antialiasing) - real mezzotint conversion is a binary process, and each RGB channel is thresholded independently, which is what produces the characteristic colored (non-grayscale) speckle on color images.
- mezzoLines streaks noise vertically; mezzoStrokes uses the same streaked noise rotated 45 degrees for a diagonal engraving look.
- Reticulation's clump noise amplitude is modulated by local luminance so shadows fill in with dense, broad clumps while highlights break up into fine grain.
- Covers pointillize dots, mezzotint marks, and reticulated ink/paper texture in one effect.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .stipple()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(o))n.shaders[i]={...e}}n&&s&&(n.help=s);var p="filter/stipple",d="filter",f="stipple",u=n;export{u as default,p as effectId,f as effectName,s as help,d as namespace};
