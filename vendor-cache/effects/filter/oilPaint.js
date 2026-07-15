/* filter/oilPaint */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Oil Paint",namespace:"filter",func:"oilPaint",tags:["blur","edges","artist"],description:"Painterly oil-paint effect covering Facet, Paint Daubs, Dry Brush, Fresco, Palette Knife, and Sponge modes over a sector-Kuwahara flattening core",globals:{mode:{type:"int",default:1,define:"MODE",choices:{facet:0,daubs:1,dryBrush:2,fresco:3,knife:4,sponge:5},ui:{label:"mode",control:"dropdown"}},size:{type:"float",default:6,uniform:"size",min:1,max:12,step:.5,ui:{label:"size",control:"slider"}},detail:{type:"float",default:50,uniform:"detail",min:0,max:100,ui:{label:"detail",control:"slider",enabledBy:{param:"mode",neq:0}}},texture:{type:"float",default:20,uniform:"textureAmount",min:0,max:100,ui:{label:"texture",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider",enabledBy:{param:"mode",eq:5}}}},textures:{_paintTmp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"flatten",program:"oilFlatten",inputs:{inputTex:"inputTex"},uniforms:{size:"size"},outputs:{fragColor:"_paintTmp"}},{name:"post",program:"oilPost",inputs:{inputTex:"inputTex",flatTex:"_paintTmp"},uniforms:{size:"size",detail:"detail",textureAmount:"textureAmount",seed:"seed"},outputs:{fragColor:"outputTex"}}]});var i={oilFlatten:{glsl:`/*
 * Oil Paint - flatten pass: 8-sector Kuwahara filter. Reduces
 * the input to per-pixel flat color patches -- the painterly "dab"
 * substrate that oilPost.glsl reshapes per MODE. facet mode uses a
 * tighter radius (min(size, 3)) so its patches read as small flat
 * polygons rather than large brush strokes.
 *
 * MODE is a compile-time define injected by the runtime (see definition.js
 * globals.mode.define), same mechanism as filter/texture and filter/grain.
 */

#ifndef MODE
#define MODE 1
#endif

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform float size;

out vec4 fragColor;

void main() {
    // Integer fragment center: every neighbor offset is an integer, so samples
    // land exactly on texel centers.
    ivec2 icenter = ivec2(gl_FragCoord.xy);
    ivec2 dims = textureSize(inputTex, 0);

#if MODE == 0
    float radius = min(size, 3.0);
#else
    float radius = size;
#endif
    float fr = clamp(radius, 1.0, 12.0);
    float frSq = fr * fr;
    int sampleLimit = int(ceil(fr));

    // Eight octant accumulators in explicit registers -- NOT a dynamically
    // indexed fragment-local array. On WebGL2/ANGLE such an array spills to
    // memory and every one of the ~113 per-pixel accumulations pays a
    // round-trip; explicit variables stay in registers. Each sample is still
    // added to its own sector in scan order, so the result is bit-identical.
    vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
    vec3 m4 = vec3(0.0), m5 = vec3(0.0), m6 = vec3(0.0), m7 = vec3(0.0);
    vec3 q0 = vec3(0.0), q1 = vec3(0.0), q2 = vec3(0.0), q3 = vec3(0.0);
    vec3 q4 = vec3(0.0), q5 = vec3(0.0), q6 = vec3(0.0), q7 = vec3(0.0);
    float n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0;
    float n4 = 0.0, n5 = 0.0, n6 = 0.0, n7 = 0.0;

    for (int y = -sampleLimit; y <= sampleLimit; y++) {
        for (int x = -sampleLimit; x <= sampleLimit; x++) {
            vec2 d = vec2(float(x), float(y));
            if (abs(d.x) > fr || abs(d.y) > fr || dot(d, d) > frSq) { continue; }
            // Stride-2 outer ring: fr > 8.0 only when size > 8 (default
            // size = 6, so fr <= 8 keeps this branch dead and the loop
            // bit-identical to the pre-optimization version at every size
            // <= 8 -- unreachable by construction, not just by luck).
            // Beyond radius 8 the ring is thinned to every other lattice
            // point on a Manhattan/checkerboard parity (|x|+|y| even
            // survives): a diagonal checkerboard was picked over a
            // row/column stride so the thinned ring stays isotropic (no
            // horizontal/vertical bias) instead of halving in just one
            // axis.
            if (fr > 8.0 && dot(d, d) > 64.0 && (abs(x) + abs(y)) % 2 != 0) { continue; }

            // Octant classification without atan2. A naive independent
            // 3-bit test (bx = d.x<0, by = d.y<0, bm = abs(d.x)<abs(d.y),
            // sector = lookup(bx,by,bm)) cannot reproduce the atan2
            // formula it replaces: at d=(0,5) and d=(1,2) all three
            // booleans agree (false,false,true) yet the atan2 formula
            // bins them into different sectors (6 vs 5) -- no function of
            // 3 independent bits can separate them, because which side of
            // the x==0 (or y==0) axis a point falls on depends on the
            // SIGN OF THE OTHER COORDINATE, not just its own. The fix:
            // test each quadrant as a joint (x, y) condition rather than
            // two independent signs. Derived by hand and verified against
            // the atan2 formula for every integer offset in
            // [-12,12]x[-12,12] (all 625 offsets, 0 mismatches, plus 3M
            // random continuous samples): each quadrant test below is
            // closed on the axis it enters on and open on the axis it
            // exits on, matching atan2's counter-clockwise
            // closed-lower-bound convention; the magnitude-compare
            // strictness (< vs <=) alternates per quadrant because the
            // diagonal tie always resolves to the higher-angle sector.
            // (0,0) has no angle; pin it to sector 4, matching the
            // original atan2 guard's result.
            // Samples sit on texel centers, so texelFetch returns the identical
            // texel that clamp-to-edge bilinear did while skipping the filter
            // unit -- the WebGL2/ANGLE bottleneck on a 100+ tap window. The
            // clamp reproduces the sampler's clamp-to-edge behavior.
            ivec2 sc = clamp(icenter + ivec2(x, y), ivec2(0), dims - ivec2(1));
            vec3 c = texelFetch(inputTex, sc, 0).rgb;
            vec3 cc = c * c;
            // Octant classification fused with accumulation: the joint
            // per-quadrant tests select the sector, and each sample is added
            // directly to that sector's explicit accumulator -- no computed
            // array index is ever formed.
            if (x == 0 && y == 0) {
                m4 += c; q4 += cc; n4 += 1.0;
            } else if (d.x > 0.0 && d.y >= 0.0) {
                if (abs(d.x) <= abs(d.y)) { m5 += c; q5 += cc; n5 += 1.0; }
                else                      { m4 += c; q4 += cc; n4 += 1.0; }
            } else if (d.x <= 0.0 && d.y > 0.0) {
                if (abs(d.x) < abs(d.y))  { m6 += c; q6 += cc; n6 += 1.0; }
                else                      { m7 += c; q7 += cc; n7 += 1.0; }
            } else if (d.x < 0.0 && d.y <= 0.0) {
                if (abs(d.x) <= abs(d.y)) { m1 += c; q1 += cc; n1 += 1.0; }
                else                      { m0 += c; q0 += cc; n0 += 1.0; }
            } else {
                // remaining case: d.x >= 0.0 && d.y < 0.0
                if (abs(d.x) < abs(d.y))  { m2 += c; q2 += cc; n2 += 1.0; }
                else                      { m3 += c; q3 += cc; n3 += 1.0; }
            }
        }
    }

    vec3 bestC = vec3(0.0);
    float bestV = 1e9;
    // Unrolled lowest-variance selection over the 8 sectors, evaluated 0..7 in
    // the same order as the original loop so ties resolve to the identical sector.
    if (n0 >= 1.0) { vec3 m = m0 / n0; vec3 v = q0 / n0 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n1 >= 1.0) { vec3 m = m1 / n1; vec3 v = q1 / n1 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n2 >= 1.0) { vec3 m = m2 / n2; vec3 v = q2 / n2 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n3 >= 1.0) { vec3 m = m3 / n3; vec3 v = q3 / n3 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n4 >= 1.0) { vec3 m = m4 / n4; vec3 v = q4 / n4 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n5 >= 1.0) { vec3 m = m5 / n5; vec3 v = q5 / n5 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n6 >= 1.0) { vec3 m = m6 / n6; vec3 v = q6 / n6 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n7 >= 1.0) { vec3 m = m7 / n7; vec3 v = q7 / n7 - m * m; float tv = v.r + v.g + v.b; if (tv < bestV) { bestV = tv; bestC = m; } }

    fragColor = vec4(bestC, 1.0);
}
`,wgsl:`/*
 * Oil Paint - flatten pass: 8-sector Kuwahara filter. See
 * glsl/oilFlatten.glsl for the full algorithm description. MODE is a
 * compile-time const injected by the runtime via injectDefines (see
 * definition.js globals.mode.define), same mechanism as filter/texture
 * and filter/grain.
 */

struct Uniforms {
    size: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let px = 1.0 / texSize;

    var radius = uniforms.size;
    if (MODE == 0) {
        radius = min(uniforms.size, 3.0);
    }
    let fr = clamp(radius, 1.0, 12.0);
    let frSq = fr * fr;
    let sample_limit = i32(ceil(fr));

    // Eight octant accumulators in explicit registers -- NOT a dynamically
    // indexed array. Mirrors glsl/oilFlatten.glsl; each sample is added to its
    // own sector in scan order, so the result is bit-identical.
    var m0 = vec3<f32>(0.0); var m1 = vec3<f32>(0.0); var m2 = vec3<f32>(0.0); var m3 = vec3<f32>(0.0);
    var m4 = vec3<f32>(0.0); var m5 = vec3<f32>(0.0); var m6 = vec3<f32>(0.0); var m7 = vec3<f32>(0.0);
    var q0 = vec3<f32>(0.0); var q1 = vec3<f32>(0.0); var q2 = vec3<f32>(0.0); var q3 = vec3<f32>(0.0);
    var q4 = vec3<f32>(0.0); var q5 = vec3<f32>(0.0); var q6 = vec3<f32>(0.0); var q7 = vec3<f32>(0.0);
    var n0 = 0.0; var n1 = 0.0; var n2 = 0.0; var n3 = 0.0;
    var n4 = 0.0; var n5 = 0.0; var n6 = 0.0; var n7 = 0.0;

    for (var y: i32 = -sample_limit; y <= sample_limit; y++) {
        for (var x: i32 = -sample_limit; x <= sample_limit; x++) {
            let d = vec2<f32>(f32(x), f32(y));
            if (abs(d.x) > fr || abs(d.y) > fr || dot(d, d) > frSq) { continue; }
            // Stride-2 outer ring: see glsl/oilFlatten.glsl for the full
            // rationale. fr > 8.0 only when size > 8 (default size = 6
            // keeps fr <= 8 and this branch dead, so output is
            // bit-identical to the pre-optimization version at every
            // size <= 8). Manhattan/checkerboard parity (|x|+|y| even
            // survives) keeps the thinned ring isotropic rather than
            // halving in just one axis.
            if (fr > 8.0 && dot(d, d) > 64.0 && (abs(x) + abs(y)) % 2 != 0) { continue; }

            // Octant classification without atan2 -- see
            // glsl/oilFlatten.glsl for the full derivation, including the
            // proof that a naive independent 3-bit test cannot reproduce
            // the atan2 formula exactly (a joint per-quadrant test is
            // required instead). Verified against the atan2 formula for
            // every integer offset in [-12,12]x[-12,12]. (0,0) has no
            // angle; pin it to sector 4, matching the original atan2
            // guard's result.
            let c = textureSample(inputTex, inputSampler, uv + d * px).rgb;
            let cc = c * c;
            // Octant classification fused with accumulation: no computed array
            // index is ever formed (mirrors glsl/oilFlatten.glsl).
            if (x == 0 && y == 0) {
                m4 += c; q4 += cc; n4 += 1.0;
            } else if (d.x > 0.0 && d.y >= 0.0) {
                if (abs(d.x) <= abs(d.y)) { m5 += c; q5 += cc; n5 += 1.0; }
                else { m4 += c; q4 += cc; n4 += 1.0; }
            } else if (d.x <= 0.0 && d.y > 0.0) {
                if (abs(d.x) < abs(d.y)) { m6 += c; q6 += cc; n6 += 1.0; }
                else { m7 += c; q7 += cc; n7 += 1.0; }
            } else if (d.x < 0.0 && d.y <= 0.0) {
                if (abs(d.x) <= abs(d.y)) { m1 += c; q1 += cc; n1 += 1.0; }
                else { m0 += c; q0 += cc; n0 += 1.0; }
            } else {
                // remaining case: d.x >= 0.0 && d.y < 0.0
                if (abs(d.x) < abs(d.y)) { m2 += c; q2 += cc; n2 += 1.0; }
                else { m3 += c; q3 += cc; n3 += 1.0; }
            }
        }
    }

    var bestC = vec3<f32>(0.0);
    var bestV: f32 = 1e9;
    // Unrolled lowest-variance selection, evaluated 0..7 in the same order as
    // the original loop so ties resolve to the identical sector.
    if (n0 >= 1.0) { let m = m0 / n0; let v = q0 / n0 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n1 >= 1.0) { let m = m1 / n1; let v = q1 / n1 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n2 >= 1.0) { let m = m2 / n2; let v = q2 / n2 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n3 >= 1.0) { let m = m3 / n3; let v = q3 / n3 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n4 >= 1.0) { let m = m4 / n4; let v = q4 / n4 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n5 >= 1.0) { let m = m5 / n5; let v = q5 / n5 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n6 >= 1.0) { let m = m6 / n6; let v = q6 / n6 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }
    if (n7 >= 1.0) { let m = m7 / n7; let v = q7 / n7 - m * m; let tv = v.x + v.y + v.z; if (tv < bestV) { bestV = tv; bestC = m; } }

    return vec4<f32>(bestC, 1.0);
}
`},oilPost:{glsl:`/*
 * Oil Paint - post pass: reshapes the flattened (oilFlatten) result into
 * one of six classic-filter fidelity painterly looks selected by MODE, then
 * applies a shared granulation pass to every mode.
 *   facet (0)     - passthrough of the flattened patches.
 *   daubs (1)     - unsharp the flattened patches for crisp dab edges.
 *   dryBrush (2)  - posterize + a slight edge darken.
 *   fresco (3)    - darken edges by local gradient magnitude, then an
 *                   S-curve contrast boost.
 *   knife (4)     - soften patch boundaries with a tent blur mixed by
 *                   \`detail\`.
 *   sponge (5)    - blotchy fbm-driven brightness bands.
 *
 * MODE is a compile-time define injected by the runtime (see definition.js
 * globals.mode.define), same mechanism as filter/texture and filter/grain.
 */

#ifndef MODE
#define MODE 1
#endif

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D flatTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float size;
uniform float detail;
uniform float textureAmount;
uniform int seed;

out vec4 fragColor;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

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

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Sobel gradient gradient, applied to the FLATTENED texture (fresco/dryBrush edges).
vec2 lumGradientFlat(vec2 uv) {
    vec2 px = 1.0 / resolution;
    float tl = lum(texture(flatTex, uv + px * vec2(-1.0,  1.0)).rgb);
    float  l = lum(texture(flatTex, uv + px * vec2(-1.0,  0.0)).rgb);
    float bl = lum(texture(flatTex, uv + px * vec2(-1.0, -1.0)).rgb);
    float tr = lum(texture(flatTex, uv + px * vec2( 1.0,  1.0)).rgb);
    float  r = lum(texture(flatTex, uv + px * vec2( 1.0,  0.0)).rgb);
    float br = lum(texture(flatTex, uv + px * vec2( 1.0, -1.0)).rgb);
    float  t = lum(texture(flatTex, uv + px * vec2( 0.0,  1.0)).rgb);
    float  b = lum(texture(flatTex, uv + px * vec2( 0.0, -1.0)).rgb);
    return vec2(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

// 3x3 tent blur of the flattened texture. Shared by daubs' unsharp
// mask (MODE 1) and knife's softening blend (MODE 4) -- same blur, ONE WAY
// ONLY; only the per-mode mix weight differs.
vec3 tent3x3(vec2 uv) {
    vec2 px = 1.0 / resolution;
    vec3 sum = vec3(0.0);
    float wsum = 0.0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            float w = (dx == 0 ? 2.0 : 1.0) * (dy == 0 ? 2.0 : 1.0);
            sum += texture(flatTex, uv + vec2(float(dx), float(dy)) * px).rgb * w;
            wsum += w;
        }
    }
    return sum / wsum;
}

float sCurve(float x) {
    float t = clamp(x, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

// Dispatch to the active mode's reshape -- single variant selected at
// compile time by the MODE define.
vec3 modeColor(vec2 uv, vec3 c, vec2 globalCoord) {
#if MODE == 0
    return c;
#elif MODE == 1
    vec3 blurred = tent3x3(uv);
    return c + (c - blurred) * (detail / 25.0);
#elif MODE == 2
    // GLSL round() ties are implementation-defined; floor(x + 0.5) is a
    // deterministic round-half-up that matches WGSL bit-for-bit.
    float levels = floor(mix(8.0, 3.0, detail / 100.0) + 0.5);
    vec3 poster = floor(c * levels) / levels;
    float gradMag = length(lumGradientFlat(uv));
    // 1.5 is the gradient-to-alpha gain and 0.15 caps edge darkening.
    // This reuses fresco's
    // (MODE 3) lumGradientFlat helper but applies it as a subtler,
    // capped darken rather than fresco's stronger detail-scaled darken.
    float edgeDarken = clamp(gradMag * 1.5, 0.0, 1.0) * 0.15;
    return poster * (1.0 - edgeDarken);
#elif MODE == 3
    float gradMag = length(lumGradientFlat(uv));
    vec3 darkened = c * (1.0 - 0.6 * (detail / 100.0) * gradMag);
    return vec3(sCurve(darkened.r), sCurve(darkened.g), sCurve(darkened.b));
#elif MODE == 4
    vec3 blurred = tent3x3(uv);
    return mix(c, blurred, detail / 100.0);
#else
    // sponge (5, default/fallback)
    float band = fbm((globalCoord + float(seed) * 37.0) / (4.0 + size));
    float shift = (band * 2.0 - 1.0) * (detail / 100.0) * 0.25;
    return clamp(c + vec3(shift), 0.0, 1.0);
#endif
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec3 c = texture(flatTex, uv).rgb;

    // Tile-aware integer global pixel coordinate for noise/hash inputs.
    // KERNEL sampling above (tent3x3/lumGradientFlat) uses the local uv
    // path; NOISE/hash uses this integer global pixel instead.
    vec2 globalCoord = floor(gl_FragCoord.xy) + tileOffset;

    vec3 outc = modeColor(uv, c, globalCoord);

    // Granulation (all modes): mix in a subtle brightness-modulating noise.
    // textureAmount = 0 is a no-op (mix factor 0).
    vec3 grained = outc * (0.85 + 0.3 * vnoise(globalCoord / 2.0));
    outc = mix(outc, grained, (textureAmount / 100.0) * 0.5);

    fragColor = vec4(clamp(outc, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Oil Paint - post pass: reshapes the flattened (oilFlatten) result into
 * one of six classic-filter fidelity painterly looks selected by MODE, then
 * applies a shared granulation pass to every mode. See glsl/oilPost.glsl
 * for the full per-mode algorithm description. MODE is a compile-time
 * const injected by the runtime via injectDefines (see definition.js
 * globals.mode.define), same mechanism as filter/texture and filter/grain.
 * globalCoord = floor(pos.xy) + tileOffset is the WGSL equivalent of
 * GLSL's globalCoord (floor(gl_FragCoord.xy) + tileOffset); tileOffset is
 * runtime-provided so the grain/paper hash stays continuous across CLI
 * render tiles, same as filter/wind and filter/scatter. Unlike wind/scatter
 * (which keep the raw +0.5-centered coordinate symmetrically between
 * backends, no floor()), oilPaint floor()s it down to an integer pixel
 * coordinate -- a stricter, independent choice made here to satisfy an
 * integer-derived noise/hash input, not a convention borrowed from
 * wind/scatter.
 */

struct Uniforms {
    size: f32,
    detail: f32,
    textureAmount: f32,
    seed: i32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var flatTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

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
    for (var i: i32 = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// Sobel gradient gradient, applied to the FLATTENED texture (fresco/dryBrush edges).
fn lumGradientFlat(uv: vec2<f32>) -> vec2<f32> {
    let texSize = vec2<f32>(textureDimensions(flatTex));
    let px = 1.0 / texSize;
    let tl = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>(-1.0,  1.0)).rgb);
    let l  = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>(-1.0,  0.0)).rgb);
    let bl = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>(-1.0, -1.0)).rgb);
    let tr = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>( 1.0,  1.0)).rgb);
    let r  = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>( 1.0,  0.0)).rgb);
    let br = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>( 1.0, -1.0)).rgb);
    let t  = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>( 0.0,  1.0)).rgb);
    let b  = lum(textureSample(flatTex, inputSampler, uv + px * vec2<f32>( 0.0, -1.0)).rgb);
    return vec2<f32>(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                      tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

// 3x3 tent blur of the flattened texture. Shared by daubs' unsharp
// mask (MODE 1) and knife's softening blend (MODE 4) -- same blur, ONE WAY
// ONLY; only the per-mode mix weight differs.
fn tent3x3(uv: vec2<f32>) -> vec3<f32> {
    let texSize = vec2<f32>(textureDimensions(flatTex));
    let px = 1.0 / texSize;
    var sum = vec3<f32>(0.0);
    var wsum = 0.0;
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            let w = select(1.0, 2.0, dx == 0) * select(1.0, 2.0, dy == 0);
            sum += textureSample(flatTex, inputSampler, uv + vec2<f32>(f32(dx), f32(dy)) * px).rgb * w;
            wsum += w;
        }
    }
    return sum / wsum;
}

fn sCurve(x: f32) -> f32 {
    let t = clamp(x, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

// Dispatch to the active mode's reshape -- single variant selected at
// compile time by the MODE const (Dawn constant-folds).
fn modeColor(uv: vec2<f32>, c: vec3<f32>, globalCoord: vec2<f32>) -> vec3<f32> {
    if (MODE == 0) {
        return c;
    }
    if (MODE == 1) {
        let blurred = tent3x3(uv);
        return c + (c - blurred) * (uniforms.detail / 25.0);
    }
    if (MODE == 2) {
        // GLSL round() ties are implementation-defined; floor(x + 0.5) is a
        // deterministic round-half-up that matches GLSL bit-for-bit.
        let levels = floor(mix(8.0, 3.0, uniforms.detail / 100.0) + 0.5);
        let poster = floor(c * levels) / levels;
        let gradMag = length(lumGradientFlat(uv));
        // 1.5 is the gradient-to-alpha gain and 0.15 caps edge darkening.
        // This reuses fresco's
        // (MODE 3) lumGradientFlat helper but applies it as a subtler,
        // capped darken rather than fresco's stronger detail-scaled darken.
        let edgeDarken = clamp(gradMag * 1.5, 0.0, 1.0) * 0.15;
        return poster * (1.0 - edgeDarken);
    }
    if (MODE == 3) {
        let gradMag = length(lumGradientFlat(uv));
        let darkened = c * (1.0 - 0.6 * (uniforms.detail / 100.0) * gradMag);
        return vec3<f32>(sCurve(darkened.x), sCurve(darkened.y), sCurve(darkened.z));
    }
    if (MODE == 4) {
        let blurred = tent3x3(uv);
        return mix(c, blurred, uniforms.detail / 100.0);
    }
    // sponge (5, default/fallback)
    let band = fbm((globalCoord + f32(uniforms.seed) * 37.0) / (4.0 + uniforms.size));
    let shift = (band * 2.0 - 1.0) * (uniforms.detail / 100.0) * 0.25;
    return clamp(c + vec3<f32>(shift), vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let c = textureSample(flatTex, inputSampler, uv).rgb;

    // Tile-aware integer global pixel coordinate for noise/hash inputs,
    // matching GLSL's floor(gl_FragCoord.xy) + tileOffset (see file header).
    let globalCoord = floor(pos.xy) + uniforms.tileOffset;

    var outc = modeColor(uv, c, globalCoord);

    let grained = outc * (0.85 + 0.3 * vnoise(globalCoord / 2.0));
    outc = mix(outc, grained, (uniforms.textureAmount / 100.0) * 0.5);

    return vec4<f32>(clamp(outc, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},r=`# oilPaint

Painterly filter with facet, daubs, dry-brush, fresco, palette-knife, and sponge modes over a shared sector-Kuwahara flattening core.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | daubs | facet/daubs/dryBrush/fresco/knife/sponge | Painterly style |
| size | float | 6 | 1-12 | Kuwahara sector radius (px); controls dab/patch scale |
| detail | float | 50 | 0-100 | Per-mode strength; inactive in facet mode |
| texture | float | 20 | 0-100 | Granulation noise mixed into the result |
| seed | int | 1 | 1-100 | Sponge banding variation; enabled only in sponge mode |

## Modes

- **facet** -- passthrough of the flattened sector-Kuwahara result, using a tighter radius (\`min(size, 3)\`) for small flat polygon facets rather than large brush strokes.
- **daubs** (default) -- unsharp-sharpens the flattened patches so their boundaries read as crisp brush dabs; \`detail\` sets the sharpen strength.
- **dryBrush** -- posterizes the flattened color to \`round(mix(8, 3, detail / 100))\` levels with a slight edge darken, mimicking scrubby dry-brush patches.
- **fresco** -- darkens edges by up to 60% of \`detail\`, scaled by local gradient magnitude, then applies a contrast S-curve for a punchy, dark-edged look.
- **knife** -- mixes the flattened result with a 3x3 tent blur by \`detail\`, softening patch boundaries into flat palette-knife strokes.
- **sponge** -- modulates brightness in blotchy bands driven by fbm noise (seeded by \`seed\`, scaled by \`size\`), darkening and lightening by up to \`detail / 100 * 0.25\`.

All modes finish with a granulation pass that mixes in a subtle brightness-modulating noise texture, scaled by \`texture\`.

## Notes

- Two-pass effect: \`oilFlatten\` computes an 8-sector Kuwahara filter (radius = \`size\`, or \`min(size, 3)\` for facet) into an internal texture; \`oilPost\` reshapes that flattened result per \`mode\` and applies granulation.
- \`mode\` is a compile-time selector: each value compiles as its own shader variant.
- Flagged for performance: the Kuwahara pass is a bounded but wide neighborhood sum (up to 625 taps per pixel at \`size\` = 12).

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .oilPaint()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(i))n.shaders[a]={...e}}n&&r&&(n.help=r);var c="filter/oilPaint",d="filter",u="oilPaint",m=n;export{m as default,c as effectId,u as effectName,r as help,d as namespace};
