/* filter/stipple */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Stipple",namespace:"filter",func:"stipple",tags:["pixel","noise","artist"],description:"Discrete random marks reproducing image tone: pointillize dots, mezzotint dots/lines/strokes, or reticulation (Pointillize, Mezzotint, Reticulation)",globals:{mode:{type:"int",default:0,define:"MODE",choices:{pointillize:0,mezzoDots:1,mezzoLines:2,mezzoStrokes:3,reticulation:4},ui:{label:"mode",control:"dropdown"}},cellSize:{type:"float",default:8,uniform:"cellSize",min:3,max:64,ui:{label:"cell size",control:"slider",enabledBy:{param:"mode",eq:0}}},grainSize:{type:"float",default:2,uniform:"grainSize",min:.5,max:16,ui:{label:"grain size",control:"slider",enabledBy:{param:"mode",neq:0}}},density:{type:"float",default:50,uniform:"density",min:0,max:100,ui:{label:"density",control:"slider",enabledBy:{param:"mode",neq:0}}},paperColor:{type:"color",default:[.98,.96,.9],uniform:"paperColor",ui:{label:"paper color",control:"color",enabledBy:{param:"mode",eq:0}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},passes:[{name:"render",program:"stipple",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={stipple:{glsl:`/*
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
 * Every hash, noise, distance and blend runs in unsigned integer fixed
 * point (12-bit fractions, 16-bit values) from the integer pixel
 * coordinate, with a PCG3D hash of the lattice cell and seed, and reads
 * texels with texelFetch. Float hashes and thresholds round and fuse
 * differently in the WebGL2 and WebGPU compilers; integers give both
 * backends the same bytes.
 *
 * mezzoStrokes rotates the sampling position 45 degrees before shaping
 * the anisotropic (line) noise, in the mat2(c,-s,s,c) rotation form
 * shared with filter/halftone. The rotated y is offset by 2^20 px so the
 * unsigned position stays positive.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
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

// hash - PCG3D integer hash (Jarzynski & Olano 2020).
uvec3 pcg3d(uvec3 v_in) {
    uvec3 v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> uvec3(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

// 16-bit hash of a lattice cell and seed.
uint hash16(uvec2 cell, uint s) {
    return pcg3d(uvec3(cell, s)).x >> 16u;
}

// Channel value as 16-bit unorm. Scaling by 65536 is exact, so the floor is too.
uint unorm16(float x) {
    return min(uint(clamp(x, 0.0, 1.0) * 65536.0), 65535u);
}

// luminance - Rec. 709 luminance, 16-bit, weights summing to 65536.
uint lum16(vec3 c) {
    return (unorm16(c.r) * 13933u + unorm16(c.g) * 46872u + unorm16(c.b) * 4731u) >> 16u;
}

// Smoothstep weight t * t * (3 - 2t) of a 12-bit fraction.
uint smooth12(uint t) {
    return (((t * t) >> 12u) * (12288u - 2u * t)) >> 12u;
}

// value noise - value noise at position n / d in lattice cells, 16-bit.
uint vnoise(uvec2 n, uvec2 d, uint s) {
    uvec2 i = n / d;
    uvec2 f = ((n - i * d) << uvec2(12u)) / d;
    uint ux = smooth12(f.x);
    uint uy = smooth12(f.y);
    uint ab = (hash16(i, s) * (4096u - ux) + hash16(i + uvec2(1u, 0u), s) * ux) >> 12u;
    uint cd = (hash16(i + uvec2(0u, 1u), s) * (4096u - ux) + hash16(i + uvec2(1u, 1u), s) * ux) >> 12u;
    return (ab * (4096u - uy) + cd * uy) >> 12u;
}

// fBm - 5 octaves of value noise on a lattice of 4 * grain, each at 2.03x
// the frequency and half the amplitude: octave k's lattice is
// 4 * grain * M[k] / 65536, with M[k] = 65536 / 2.03^k.
uint fbm(uvec2 n, uint grain, uint s) {
    const uint M[5] = uint[5](65536u, 32284u, 15903u, 7834u, 3859u);
    uint v = 0u;
    for (int k = 0; k < 5; k++) {
        uint dk = max((grain * M[k] + 8192u) >> 14u, 1u);
        v += vnoise(n, uvec2(dk), s) >> uint(k + 1);
    }
    return v;
}

// Floor of the integer square root: a float estimate, corrected in integers.
uint isqrt(uint x) {
    uint r = uint(sqrt(float(x)));
    if (r * r > x) r--;
    if (r * r > x) r--;
    if ((r + 1u) * (r + 1u) <= x) r++;
    if ((r + 1u) * (r + 1u) <= x) r++;
    return r;
}

// Mezzo and reticulation threshold step(edge + (density - 50) / 100, value)
// on 16-bit values, density in 1/256 units, multiplied through by 25.
float inkStep(uint edge, uint value, int d256) {
    return 25 * int(value) + 819200 >= 25 * int(edge) + 64 * d256 ? 1.0 : 0.0;
}

void main() {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    ivec2 texSize = textureSize(inputTex, 0);
    // Global (tile-aware) pixel. Positions are pixel centers in 1/256 px,
    // (2 * px + 1) * 128, over sizes in 1/256 px.
    uvec2 px = uvec2(texel + ivec2(tileOffset));
    uvec2 center = (2u * px + 1u) * 128u;
    vec4 src = texelFetch(inputTex, texel, 0);
    uint s = uint(seed);
    int d256 = int(floor(density * 256.0));
    uint g256 = clamp(uint(max(grainSize, 0.0) * 256.0), 1u, 32768u);
    vec3 result;

#if MODE == 0
    // Pointillize: one dot per jittered Voronoi cell (cellSize px),
    // colored and sized from the image at that cell's own seed
    // point; darker seed colors get bigger dots. Background is
    // paperColor. The dot edge blends over 2 px on each side, close to
    // the 1.5 * fwidth(d) it used before.
    uint c256 = clamp(uint(max(cellSize, 0.0) * 256.0), 1u, 65535u);
    uvec2 g = center / c256;
    ivec2 f = ivec2(((center - g * c256) << uvec2(12u)) / c256);
    // Jittered-grid Voronoi in 12-bit cell units: seed point = cell + 0.5 +
    // (hash - 0.5) * 0.9. Search radius is one ring of neighbor cells, so
    // the jitter stays within [0, 1] for the nearest seed to be in the window.
    int best = 0x7fffffff;
    ivec2 bestPt = ivec2(0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            ivec2 cell = ivec2(x, y);
            uvec2 h = pcg3d(uvec3(uvec2(ivec2(g) + cell), s)).xy >> uvec2(16u);
            ivec2 pt = cell * 4096 + 205 + ivec2(((h * 9u) / 10u) >> uvec2(4u));
            ivec2 dv = pt - f;
            int dd = dv.x * dv.x + dv.y * dv.y;
            if (dd < best) {
                best = dd;
                bestPt = pt;
            }
        }
    }
    // Seed point in 1/256 px, measured from the cell to the lower left so
    // the offset stays positive; the dot's color is the texel under it.
    ivec2 seed256 = (ivec2(g) - 1) * int(c256) + ivec2((uvec2(bestPt + 4096) * c256) >> uvec2(12u));
    ivec2 seedTexel = clamp((max(seed256, ivec2(0)) >> 8) - ivec2(tileOffset), ivec2(0), texSize - 1);
    vec3 seedColor = texelFetch(inputTex, seedTexel, 0).rgb;
    int radius = 1434 + int((1638u * (65535u - lum16(seedColor))) >> 16u);
    int d = int(isqrt(uint(best)));
    int aa = int(2097152u / c256);
    uint t = d <= radius - aa ? 0u : (d >= radius + aa ? 4096u : (uint(d - radius + aa) << 12u) / uint(2 * aa));
    uint inside = 4096u - smooth12(t);
    uvec3 paper = uvec3(unorm16(paperColor.r), unorm16(paperColor.g), unorm16(paperColor.b));
    uvec3 ink = uvec3(unorm16(seedColor.r), unorm16(seedColor.g), unorm16(seedColor.b));
    result = vec3((paper * (4096u - inside) + ink * inside) >> uvec3(12u)) / 65536.0;
#elif MODE == 1 || MODE == 2 || MODE == 3
    // Mezzotint dots/lines/strokes: per-channel hard threshold
    // against shaped value noise. density biases the threshold (n)
    // directly, so higher density raises n and lowers the fraction
    // of channel values that clear it - i.e. more ink.
    uvec2 pos = center;
    uint grain = g256;
#if MODE == 3
    // Rotate 45 degrees: x' = (x + y) / sqrt2, y' = (y - x) / sqrt2. The
    // 1 / sqrt2 moves into the grain size (92682 = sqrt2 * 65536).
    pos = uvec2((px.x + px.y + 1u) * 256u, (px.y + 1048576u - px.x) * 256u);
    grain = (g256 * 92682u + 32768u) >> 16u;
#endif
    uvec2 lattice;
#if MODE == 1
    lattice = uvec2(grain);
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
    lattice = uvec2(grain, grain * 8u);
#endif
    uint n = vnoise(pos, lattice, s);
    result = vec3(inkStep(n, unorm16(src.r), d256), inkStep(n, unorm16(src.g), d256), inkStep(n, unorm16(src.b), d256));
#else
    // Reticulation: two-tone ink/paper tonemap against clumped fBm
    // noise; the noise amplitude is luminance-modulated so shadows
    // fill in with broad dense clumps and highlights break into
    // fine grain. density biases the ink/paper balance using the
    // exact same (density-50)/100 term the mezzo branch applies to
    // its threshold, since clumpNoise vs l is structurally the same
    // threshold-vs-value pairing as mezzo's n vs channel.
    uint l = lum16(src.rgb);
    // Amplitude mix(1.2, 0.6, l) in 1/65536 units.
    uint amp = 78643u - ((39322u * l) >> 16u);
    uint clumpNoise = (fbm(center, g256, s) * (amp >> 2u)) >> 14u;
    result = inkStep(clumpNoise, l, d256) > 0.5 ? vec3(0.97) : vec3(0.05);
#endif

    fragColor = vec4(result, src.a);
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
 * Every hash, noise, distance and blend runs in unsigned integer fixed
 * point from the integer pixel coordinate, with the same PCG3D hash and
 * texel reads as stipple.glsl, so both backends produce the same bytes.
 * mezzoStrokes's 45-degree rotation is the integer form of GLSL's
 * column-major mat2(c,-s,s,c) multiplication, so the marks keep the same
 * presented slope on both backends.
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

// binding(0) is unused: every read is a textureLoad.
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// hash - PCG3D integer hash (Jarzynski & Olano 2020).
fn pcg3d(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

// 16-bit hash of a lattice cell and seed.
fn hash16(cell: vec2<u32>, s: u32) -> u32 {
    return pcg3d(vec3<u32>(cell, s)).x >> 16u;
}

// Channel value as 16-bit unorm. Scaling by 65536 is exact, so the floor is too.
fn unorm16(x: f32) -> u32 {
    return min(u32(clamp(x, 0.0, 1.0) * 65536.0), 65535u);
}

// luminance - Rec. 709 luminance, 16-bit, weights summing to 65536.
fn lum16(c: vec3<f32>) -> u32 {
    return (unorm16(c.r) * 13933u + unorm16(c.g) * 46872u + unorm16(c.b) * 4731u) >> 16u;
}

// Smoothstep weight t * t * (3 - 2t) of a 12-bit fraction.
fn smooth12(t: u32) -> u32 {
    return (((t * t) >> 12u) * (12288u - 2u * t)) >> 12u;
}

// value noise - value noise at position n / d in lattice cells, 16-bit.
fn vnoise(n: vec2<u32>, d: vec2<u32>, s: u32) -> u32 {
    let i = n / d;
    let f = ((n - i * d) << vec2<u32>(12u)) / d;
    let ux = smooth12(f.x);
    let uy = smooth12(f.y);
    let ab = (hash16(i, s) * (4096u - ux) + hash16(i + vec2<u32>(1u, 0u), s) * ux) >> 12u;
    let cd = (hash16(i + vec2<u32>(0u, 1u), s) * (4096u - ux) + hash16(i + vec2<u32>(1u, 1u), s) * ux) >> 12u;
    return (ab * (4096u - uy) + cd * uy) >> 12u;
}

// fBm - 5 octaves of value noise on a lattice of 4 * grain, each at 2.03x
// the frequency and half the amplitude: octave k's lattice is
// 4 * grain * M[k] / 65536, with M[k] = 65536 / 2.03^k.
fn fbm(n: vec2<u32>, grain: u32, s: u32) -> u32 {
    var M = array<u32, 5>(65536u, 32284u, 15903u, 7834u, 3859u);
    var v = 0u;
    for (var k = 0u; k < 5u; k++) {
        let dk = max((grain * M[k] + 8192u) >> 14u, 1u);
        v += vnoise(n, vec2<u32>(dk), s) >> (k + 1u);
    }
    return v;
}

// Floor of the integer square root: a float estimate, corrected in integers.
fn isqrt(x: u32) -> u32 {
    var r = u32(sqrt(f32(x)));
    if (r * r > x) { r--; }
    if (r * r > x) { r--; }
    if ((r + 1u) * (r + 1u) <= x) { r++; }
    if ((r + 1u) * (r + 1u) <= x) { r++; }
    return r;
}

// Mezzo and reticulation threshold step(edge + (density - 50) / 100, value)
// on 16-bit values, density in 1/256 units, multiplied through by 25.
fn inkStep(edge: u32, value: u32, d256: i32) -> f32 {
    return select(0.0, 1.0, 25 * i32(value) + 819200 >= 25 * i32(edge) + 64 * d256);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texel = vec2<i32>(pos.xy);
    let texSize = vec2<i32>(textureDimensions(inputTex));
    // Global (tile-aware) pixel. Positions are pixel centers in 1/256 px,
    // (2 * px + 1) * 128, over sizes in 1/256 px.
    let px = vec2<u32>(texel + vec2<i32>(uniforms.tileOffset));
    let center = (2u * px + 1u) * 128u;
    let src = textureLoad(inputTex, texel, 0);
    let s = u32(uniforms.seed);
    let d256 = i32(floor(uniforms.density * 256.0));
    let g256 = clamp(u32(max(uniforms.grainSize, 0.0) * 256.0), 1u, 32768u);
    var result: vec3<f32>;

    if (MODE == 0) {
        // Pointillize. The dot edge blends over 2 px on each side.
        let c256 = clamp(u32(max(uniforms.cellSize, 0.0) * 256.0), 1u, 65535u);
        let g = center / c256;
        let f = vec2<i32>(((center - g * c256) << vec2<u32>(12u)) / c256);
        // Jittered-grid Voronoi in 12-bit cell units: seed point = cell +
        // 0.5 + (hash - 0.5) * 0.9.
        var best = 2147483647;
        var bestPt = vec2<i32>(0);
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let cell = vec2<i32>(x, y);
                let h = pcg3d(vec3<u32>(vec2<u32>(vec2<i32>(g) + cell), s)).xy >> vec2<u32>(16u);
                let pt = cell * 4096 + 205 + vec2<i32>(((h * 9u) / 10u) >> vec2<u32>(4u));
                let dv = pt - f;
                let dd = dv.x * dv.x + dv.y * dv.y;
                if (dd < best) {
                    best = dd;
                    bestPt = pt;
                }
            }
        }
        // Seed point in 1/256 px, measured from the cell to the lower left
        // so the offset stays positive; the dot's color is the texel under it.
        let seed256 = (vec2<i32>(g) - 1) * i32(c256) + vec2<i32>((vec2<u32>(bestPt + 4096) * c256) >> vec2<u32>(12u));
        let seedTexel = clamp((max(seed256, vec2<i32>(0)) >> vec2<u32>(8u)) - vec2<i32>(uniforms.tileOffset), vec2<i32>(0), texSize - 1);
        let seedColor = textureLoad(inputTex, seedTexel, 0).rgb;
        let radius = 1434 + i32((1638u * (65535u - lum16(seedColor))) >> 16u);
        let d = i32(isqrt(u32(best)));
        let aa = i32(2097152u / c256);
        var t = 0u;
        if (d >= radius + aa) {
            t = 4096u;
        } else if (d > radius - aa) {
            t = (u32(d - radius + aa) << 12u) / u32(2 * aa);
        }
        let inside = 4096u - smooth12(t);
        let paper = vec3<u32>(unorm16(uniforms.paperColor.r), unorm16(uniforms.paperColor.g), unorm16(uniforms.paperColor.b));
        let ink = vec3<u32>(unorm16(seedColor.r), unorm16(seedColor.g), unorm16(seedColor.b));
        result = vec3<f32>((paper * (4096u - inside) + ink * inside) >> vec3<u32>(12u)) / 65536.0;
    } else if (MODE == 1 || MODE == 2 || MODE == 3) {
        // Mezzotint dots/lines/strokes.
        var p = center;
        var grain = g256;
        if (MODE == 3) {
            // Rotate 45 degrees: x' = (x + y) / sqrt2, y' = (y - x) / sqrt2,
            // with the 1 / sqrt2 in the grain size; see stipple.glsl.
            p = vec2<u32>((px.x + px.y + 1u) * 256u, (px.y + 1048576u - px.x) * 256u);
            grain = (g256 * 92682u + 32768u) >> 16u;
        }
        var lattice = vec2<u32>(grain);
        if (MODE != 1) {
            // See stipple.glsl: Y keeps the coarse scale, X the fine
            // scale, so streaks run vertically.
            lattice = vec2<u32>(grain, grain * 8u);
        }
        let n = vnoise(p, lattice, s);
        result = vec3<f32>(inkStep(n, unorm16(src.r), d256), inkStep(n, unorm16(src.g), d256), inkStep(n, unorm16(src.b), d256));
    } else {
        // Reticulation, with amplitude mix(1.2, 0.6, l) in 1/65536 units.
        let l = lum16(src.rgb);
        let amp = 78643u - ((39322u * l) >> 16u);
        let clumpNoise = (fbm(center, g256, s) * (amp >> 2u)) >> 14u;
        result = select(vec3<f32>(0.05), vec3<f32>(0.97), inkStep(clumpNoise, l, d256) > 0.5);
    }

    return vec4<f32>(result, src.a);
}
`}},o=`# stipple

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
- Pointillize dot radius grows with the cell seed point's inverse luminance (darker areas get bigger dots), matching Pointillize's tendency to thicken coverage in shadow regions; dot edges blend over about 2 px on each side.
- Hashes, noise and thresholds run in integer arithmetic on the integer pixel coordinate, so WebGL2 and WebGPU give identical output for identical input.
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
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(s))n.shaders[i]={...e}}n&&o&&(n.help=o);var c="filter/stipple",d="filter",p="stipple",h=n;export{h as default,c as effectId,p as effectName,o as help,d as namespace};
