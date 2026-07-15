/* filter/craquelure */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Craquelure",namespace:"filter",func:"craquelure",tags:["noise","edges","artist"],description:"Cracked-plaster groove network with carved relief shading over the image (Craquelure)",globals:{spacing:{type:"float",default:40,uniform:"spacing",min:5,max:100,ui:{label:"spacing",control:"slider"}},depth:{type:"float",default:50,uniform:"depth",min:0,max:100,ui:{label:"depth",control:"slider"}},brightness:{type:"float",default:50,uniform:"brightness",min:0,max:100,ui:{label:"brightness",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},passes:[{name:"render",program:"craquelure",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={craquelure:{glsl:`/*
 * Craquelure - cracked-plaster groove network with carved relief over the
 * image.
 *
 * Crack field: Voronoi's jittered-grid Voronoi cell (see voronoiCell in e.g.
 * filter/stipple.glsl) is extended here to voronoiF1F2, which tracks the
 * nearest (F1) AND second-nearest (F2) seed distances instead of just the
 * nearest cell id. (F2 - F1) is the standard "distance to the Voronoi
 * border" proxy: it is exactly 0 ON a cell border (where two seeds are
 * equidistant) and grows the further a point sits from any border, so
 * \`k = 1 - smoothstep(0, edge, (F2-F1)*spacing)\` is a ridge function that
 * peaks at 1 exactly on cell borders and falls to 0 within \`edge\` pixels
 * - i.e. the crack groove cross-section. \`edge = 1.5 + depth/100*2\` is
 * the groove's half-width in px, so \`depth\` widens the crack band.
 *
 * Voronoi jitter is fixed at 1.0 (the maximum value Voronoi's 3x3-neighbor
 * search window supports - see voronoiF1F2's docstring: the search is
 * exact for F1 at this jitter, with F2 only rarely under-counted near a
 * cell's corner) for maximally irregular, organic plate shapes, matching
 * real crazed plaster/glaze.
 *
 * Border wobble: before the Voronoi search, the sample position is
 * perturbed by two INDEPENDENT noise taps, one per axis -
 * \`vec2(vnoise(gc/6), vnoise(gc/6 + vec2(37.7, 91.3))) * 2\` px (same 2px
 * amplitude as a single-scalar wobble; the additive offset decorrelates
 * the second tap from the first). A single scalar broadcast to both axes
 * only displaces the sample along the (1,1) diagonal, leaving
 * diagonal-tangent border segments unperturbed - a visible blind spot.
 * Independent per-axis taps wobble the crack path in every direction, so
 * borders weave organically regardless of their local tangent angle.
 *
 * Wall shading: the crack mask k is re-evaluated at 4 neighboring
 * (gc +/- 1px on each axis) positions to build a true central-difference
 * gradient of k (5 bounded Voronoi evaluations total). A cheaper
 * forward-difference, as filter/relief's rlShade.glsl
 * uses for its cheap-to-sample blurred-luminance height field, would
 * bias the bevel normal off-axis for a feature this narrow, since k's
 * transition width can be as little as 1.5px). The height fed to filter/relief's
 * reliefShade (see filter/relief) is -k, NOT +k: a crack is a carved
 * groove (a dip), not a raised ridge, so height must FALL toward the
 * crack center. This is implemented by negating hC/hR/hT (hC = -kC, hR
 * = hC - centralGradX, hT = hC - centralGradY) so reliefShade's internal
 * forward-difference subtraction reproduces the true central-difference
 * gradient of -k exactly - equivalently, this flips the sign of the
 * gradient/normal reliefShade sees versus feeding +k directly, which is
 * what puts the lit wall on the correct (concave-groove) side of the
 * crack. Light angle is fixed at 135 degrees (filter/relief's default
 * convention - upper-left; craquelure exposes no
 * lightAngle param). reliefShade's flat-gradient (grad=0) baseline is
 * dot((0,0,1), normalize(vec3(cos135, sin135, 0.75))) = 0.75/1.25 = 0.6
 * EXACTLY, not 0.5 - the shade term is remapped from reliefShade's 0..1
 * output to a subtle \`1 +/- 0.25*depth/100\` multiplier band centered on
 * shade==0.6 (not 0.5), and additionally gated by \`wallMask =
 * smoothstep(0, 0.02, gradMagK)\` (gradMagK = length of the same
 * central-diff gradient of k used above) so the multiplier is pinned to
 * EXACTLY 1.0 on flat ground regardless of depth or any future light-
 * vector change, instead of leaking a small global brightening
 * everywhere (the old unmasked, 0.5-centered version leaked because
 * reliefShade's true flat baseline is 0.6). This multiplier is applied
 * on top of the crack darkening - matching filter/relief's notePaper
 * mode precedent of multiplying a shade term onto color (\`sheet *
 * mix(0.6, 1.4, shade)\`).
 *
 * Output: \`c * mix(1, 0.35 + brightness/100*0.5, k)\` darkens the image
 * inside cracks (brightness raises the floor, i.e. higher brightness =
 * shallower/paler cracks), then the wall-shade multiplier is applied on
 * top - matching filter/relief's notePaper mode precedent of multiplying
 * a shade term onto color (\`sheet * mix(0.6, 1.4, shade)\`).
 *
 * Single pass, evaluated on global (tile-aware) pixel coordinates so the
 * crack network is continuous across CLI render tiles.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float spacing;
uniform float depth;
uniform float brightness;
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

// value noise - value noise (fBm not needed here).
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Voronoi extended - jittered-grid Voronoi F1/F2: returns x = nearest seed
// distance (F1), y = second-nearest seed distance (F2), in the same
// cell-space units as \`p\`. Squared distances are compared internally
// (cheaper); sqrt is taken only for the two winners since the crack
// metric (F2-F1) needs true (not squared) distances to stay in
// consistent px-proportional units once multiplied by \`spacing\`. Search
// radius is one ring of neighbor cells, so jitter must stay within
// [0, 1] to keep both candidates in-window; this is an EXACT guarantee
// for F1 (the true nearest neighbor cannot be more than one cell away
// at this jitter), but F2 (the second-nearest) can rarely be
// under-counted near a cell's corner at jitter's [0, 1] maximum, where
// the true second-nearest seed can sit just outside the 1-ring window -
// a minor, infrequent error in the crack metric, not a hard guarantee.
vec2 voronoiF1F2(vec2 p, float jitter, float seedVal) {
    vec2 g = floor(p);
    vec2 f = p - g;
    float best = 1e9;
    float second = 1e9;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 cell = vec2(float(x), float(y));
            vec2 pt = cell + 0.5 + (hash22(g + cell + seedVal * 101.7) - 0.5) * jitter;
            float d = dot(pt - f, pt - f);
            if (d < best) {
                second = best;
                best = d;
            } else if (d < second) {
                second = d;
            }
        }
    }
    return vec2(sqrt(best), sqrt(second));
}

// Directional relief shading from height.
float reliefShade(float hC, float hR, float hT, float strength, float lightAngleDeg) {
    vec2 grad = vec2(hR - hC, hT - hC) * strength;
    vec3 n = normalize(vec3(-grad, 1.0));
    float a = radians(lightAngleDeg);
    vec3 L = normalize(vec3(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

// Crack mask k at global pixel position gc: 1 on a cell border, falling
// to 0 within \`edge\` px (see file header for the F2-F1 derivation).
float crackMask(vec2 gc, float spacingPx, float depthPct, float seedVal) {
    vec2 wob = vec2(vnoise(gc / 6.0), vnoise(gc / 6.0 + vec2(37.7, 91.3))) * 2.0;
    vec2 p = (gc + wob) / spacingPx;
    vec2 f1f2 = voronoiF1F2(p, 1.0, seedVal);
    float d = (f1f2.y - f1f2.x) * spacingPx;
    float edge = 1.5 + depthPct / 100.0 * 2.0;
    return 1.0 - smoothstep(0.0, edge, d);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    float seedF = float(seed);

    float kC = crackMask(globalCoord, spacing, depth, seedF);
    float kR = crackMask(globalCoord + vec2(1.0, 0.0), spacing, depth, seedF);
    float kL = crackMask(globalCoord - vec2(1.0, 0.0), spacing, depth, seedF);
    float kT = crackMask(globalCoord + vec2(0.0, 1.0), spacing, depth, seedF);
    float kB = crackMask(globalCoord - vec2(0.0, 1.0), spacing, depth, seedF);

    // Central-difference gradient of k; feeds both reliefShade's synthetic
    // height samples below and wallMask's locality gate.
    vec2 gradK = vec2((kR - kL) * 0.5, (kT - kB) * 0.5);

    // Height fed to reliefShade is -k: a crack is a carved groove (a dip),
    // not a raised ridge, so height must fall toward the crack center.
    // Negating hC/hR/hT flips the sign of the gradient/normal reliefShade
    // sees, which flips which groove wall catches the light (see header).
    float hC = -kC;
    float hR = hC - gradK.x;
    float hT = hC - gradK.y;
    float shadeStrength = 6.0;
    float shade = reliefShade(hC, hR, hT, shadeStrength, 135.0);

    // reliefShade's flat-gradient baseline is 0.6, not 0.5 (see header) -
    // recenter on it, and gate by wallMask so flat ground away from any
    // crack gets EXACTLY shadeMul == 1.0 (gradK saturates to exactly 0
    // there by smoothstep's clamped range).
    float gradMagK = length(gradK);
    float wallMask = smoothstep(0.0, 0.02, gradMagK);
    float shadeMul = 1.0 + (shade - 0.6) * 2.0 * (0.25 * depth / 100.0) * wallMask;

    vec3 darkened = src.rgb * mix(1.0, 0.35 + brightness / 100.0 * 0.5, kC);
    vec3 result = clamp(darkened * shadeMul, 0.0, 1.0);

    fragColor = vec4(result, src.a);
}
`,wgsl:`/*
 * Craquelure - cracked-plaster groove network with carved relief over the
 * image. See craquelure.glsl for the full algorithm derivation (F2-F1
 * crack metric, border wobble, central-difference wall shading via filter/relief's
 * reliefShade, fixed 135-degree light, brightness/depth composition);
 * this is a 1:1 port.
 *
 * tileOffset converts tile-local positions into global procedural
 * coordinates, matching GLSL's \`gl_FragCoord.xy + tileOffset\`: globalCoord
 * seeds the crack mask's Voronoi hash (via crackMask's wobble/Voronoi
 * chain) so the crack network is continuous across CLI render tiles. It
 * is zero for ordinary full-frame renders (see filter/stipple's WGSL
 * port for the same pattern). The input-texture UV stays tile-local
 * (\`pos.xy / texSize\`, matching GLSL's \`gl_FragCoord.xy / resolution\`).
 * The crack pattern is seeded by global pixel position (tileOffset + local
 * coord), never normalized by the full image size, so neither backend
 * declares a fullResolution uniform.
 *
 * Every vector built in this shader (the wobble offset, the Voronoi
 * search cell/seed geometry, the k-gradient sample taps) comes from
 * \`floor\`/\`fract\` only (hash-, value-noise-, and Voronoi-derived, no \`mod\`), which - like GLSL -
 * are floor-based (not truncated) for negative inputs in WGSL, so no
 * floored-mod wrap is needed anywhere here. The light vector L is a
 * plain function of the fixed 135-degree angle constant, not fragment-
 * coordinate-derived at all, so it is textually identical to the GLSL.
 */

struct Uniforms {
    spacing: f32,
    depth: f32,
    brightness: f32,
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

// value noise - value noise (fBm not needed here).
fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

// Voronoi extended - jittered-grid Voronoi F1/F2: returns x = nearest seed
// distance (F1), y = second-nearest seed distance (F2). The 1-ring
// search is exact for F1; F2 can rarely be under-counted near a cell's
// corner at jitter's [0, 1] maximum. See craquelure.glsl's voronoiF1F2
// for the full derivation.
fn voronoiF1F2(p: vec2<f32>, jitter: f32, seedVal: f32) -> vec2<f32> {
    let g = floor(p);
    let f = p - g;
    var best = 1e9;
    var second = 1e9;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let cell = vec2<f32>(f32(x), f32(y));
            let pt = cell + 0.5 + (hash22(g + cell + seedVal * 101.7) - 0.5) * jitter;
            let d = dot(pt - f, pt - f);
            if (d < best) {
                second = best;
                best = d;
            } else if (d < second) {
                second = d;
            }
        }
    }
    return vec2<f32>(sqrt(best), sqrt(second));
}

// Directional relief shading from height.
fn reliefShade(hC: f32, hR: f32, hT: f32, strength: f32, lightAngleDeg: f32) -> f32 {
    let grad = vec2<f32>(hR - hC, hT - hC) * strength;
    let n = normalize(vec3<f32>(-grad, 1.0));
    let a = radians(lightAngleDeg);
    let L = normalize(vec3<f32>(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

// Crack mask k at global pixel position gc: 1 on a cell border, falling
// to 0 within \`edge\` px (see craquelure.glsl's file header).
fn crackMask(gc: vec2<f32>, spacingPx: f32, depthPct: f32, seedVal: f32) -> f32 {
    let wob = vec2<f32>(vnoise(gc / 6.0), vnoise(gc / 6.0 + vec2<f32>(37.7, 91.3))) * 2.0;
    let p = (gc + wob) / spacingPx;
    let f1f2 = voronoiF1F2(p, 1.0, seedVal);
    let d = (f1f2.y - f1f2.x) * spacingPx;
    let edge = 1.5 + depthPct / 100.0 * 2.0;
    return 1.0 - smoothstep(0.0, edge, d);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let seedF = f32(uniforms.seed);

    let kC = crackMask(globalCoord, uniforms.spacing, uniforms.depth, seedF);
    let kR = crackMask(globalCoord + vec2<f32>(1.0, 0.0), uniforms.spacing, uniforms.depth, seedF);
    let kL = crackMask(globalCoord - vec2<f32>(1.0, 0.0), uniforms.spacing, uniforms.depth, seedF);
    let kT = crackMask(globalCoord + vec2<f32>(0.0, 1.0), uniforms.spacing, uniforms.depth, seedF);
    let kB = crackMask(globalCoord - vec2<f32>(0.0, 1.0), uniforms.spacing, uniforms.depth, seedF);

    // Central-difference gradient of k; feeds both reliefShade's synthetic
    // height samples below and wallMask's locality gate.
    let gradK = vec2<f32>((kR - kL) * 0.5, (kT - kB) * 0.5);

    // Height fed to reliefShade is -k: a crack is a carved groove (a dip),
    // not a raised ridge - see craquelure.glsl for the full derivation.
    let hC = -kC;
    let hR = hC - gradK.x;
    let hT = hC - gradK.y;
    let shadeStrength = 6.0;
    let shade = reliefShade(hC, hR, hT, shadeStrength, 135.0);

    // reliefShade's flat-gradient baseline is 0.6, not 0.5 - recenter on
    // it, and gate by wallMask so flat ground gets EXACTLY shadeMul ==
    // 1.0 (gradK saturates to exactly 0 away from any crack).
    let gradMagK = length(gradK);
    let wallMask = smoothstep(0.0, 0.02, gradMagK);
    let shadeMul = 1.0 + (shade - 0.6) * 2.0 * (0.25 * uniforms.depth / 100.0) * wallMask;

    let darkened = src.rgb * mix(1.0, 0.35 + uniforms.brightness / 100.0 * 0.5, kC);
    let result = clamp(darkened * shadeMul, vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(result, src.a);
}
`}},s=`# craquelure

Cracked-plaster groove network with carved relief shading over the image (Craquelure)

## Description

A jittered Voronoi cell field carves an organic network of plate-like
cracks across the image: the difference between each pixel's nearest and
second-nearest cell-seed distances (F2-F1) approaches zero exactly on a
cell border, producing a ridge-shaped groove mask that is darkened onto
the source image and beveled with directional relief shading (fixed
upper-left light) on the groove walls for a 3D carved-plaster look. The
crack borders are wobbled with a small noise perturbation so they read
as organic fissures rather than straight polygon edges.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| spacing | float | 40 | 5-100 | Crack cell size in pixels - larger values produce fewer, larger cracked plates |
| depth | float | 50 | 0-100 | Groove width and wall-shading strength - higher values widen the cracks and deepen the 3D bevel on their walls |
| brightness | float | 50 | 0-100 | Crack darkness - higher values leave cracks shallower and paler; lower values darken them toward black |
| seed | int | 1 | 1-100 | Randomizes the crack network's cell layout without changing its statistics |

## Notes

- Single pass, evaluated on global (tile-aware) pixel coordinates so the crack network and its wobble are continuous across CLI render tiles.
- The crack mask is a ridge function of \`(F2-F1) * spacing\`, where F1/F2 are the nearest/second-nearest distances from a jittered Voronoi cell search (Voronoi jitter is fixed at maximum for irregular, organic plate shapes).
- Wall shading is computed from a true central-difference gradient of the crack mask (5 bounded Voronoi evaluations per pixel total) fed through the same directional relief-shading model used by \`filter/relief\`, with the light angle fixed at 135 degrees (upper-left).
- Produces an organic cracked-plaster or crazed-glaze surface.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .craquelure()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(r))n.shaders[a]={...e}}n&&s&&(n.help=s);var c="filter/craquelure",h="filter",f="craquelure",p=n;export{p as default,c as effectId,f as effectName,s as help,h as namespace};
