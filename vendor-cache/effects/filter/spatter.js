/* filter/spatter */
var i=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new i({name:"Spatter",namespace:"filter",func:"spatter",tags:["noise"],description:"Paint spatter effect",globals:{color:{type:"color",default:[.875,.125,.125],uniform:"color",ui:{label:"color",control:"color"}},density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #d4d4d4)
  .spatter(density: 1)
  .write(o0)`,passes:[{name:"main",program:"spatter",inputs:{inputTex:"inputTex"},uniforms:{color:"color",density:"density",alpha:"alpha",seed:"seed"},outputs:{fragColor:"outputTex"}}]});var r={spatter:{glsl:`/*
 * Spatter: Multi-layer procedural paint spatter effect.
 *
 * Grid-based noise matching Python reference implementation:
 * 1. Random values generated at INTEGER GRID POINTS via PCG hash
 * 2. pow(x, 4) exponential distribution applied AT GRID POINTS (before interpolation)
 * 3. Upscaled to full resolution via bicubic/bilinear/cosine interpolation
 * 4. Multi-octave FBM with brightness/contrast thresholding
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform vec3 color;
uniform float density;
uniform float alpha;
uniform int seed;

out vec4 fragColor;

// --- PCG PRNG ---

uvec3 pcg3(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

uint pcg(uint v) {
    return pcg3(uvec3(v, 0u, 0u)).x;
}

float hashf(uint h) {
    return float(pcg3(uvec3(h, 0u, 0u)).x) / float(0xffffffffu);
}

// --- Grid value: random float in [0,1] at each integer grid point ---

float gridVal(ivec2 p, uint sd) {
    uvec3 h = pcg3(uvec3(uint(p.x + 32768), uint(p.y + 32768), sd));
    return float(h.x) / float(0xffffffffu);
}

// --- Catmull-Rom cubic interpolation ---

float cubic(float a, float b, float c, float d, float t) {
    float t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2.0*b) + (-a+c)*t + (2.0*a - 5.0*b + 4.0*c - d)*t2 + (-a + 3.0*b - 3.0*c + d)*t3);
}

// --- Bicubic exp grid noise (smear layer) ---
// Evaluates 4x4 grid neighborhood. pow(x,4) at grid points, then bicubic interpolate.

float bicubicExpGrid(vec2 pos, uint sd) {
    ivec2 c = ivec2(floor(pos));
    vec2 f = fract(pos);
    float r0 = cubic(pow(gridVal(c+ivec2(-1,-1),sd),4.0), pow(gridVal(c+ivec2(0,-1),sd),4.0), pow(gridVal(c+ivec2(1,-1),sd),4.0), pow(gridVal(c+ivec2(2,-1),sd),4.0), f.x);
    float r1 = cubic(pow(gridVal(c+ivec2(-1,0),sd),4.0), pow(gridVal(c+ivec2(0,0),sd),4.0), pow(gridVal(c+ivec2(1,0),sd),4.0), pow(gridVal(c+ivec2(2,0),sd),4.0), f.x);
    float r2 = cubic(pow(gridVal(c+ivec2(-1,1),sd),4.0), pow(gridVal(c+ivec2(0,1),sd),4.0), pow(gridVal(c+ivec2(1,1),sd),4.0), pow(gridVal(c+ivec2(2,1),sd),4.0), f.x);
    float r3 = cubic(pow(gridVal(c+ivec2(-1,2),sd),4.0), pow(gridVal(c+ivec2(0,2),sd),4.0), pow(gridVal(c+ivec2(1,2),sd),4.0), pow(gridVal(c+ivec2(2,2),sd),4.0), f.x);
    return clamp(cubic(r0, r1, r2, r3, f.y), 0.0, 1.0);
}

// --- Bilinear exp grid noise (dots & specks) ---

float bilinearExpGrid(vec2 pos, uint sd) {
    ivec2 c = ivec2(floor(pos));
    vec2 f = fract(pos);
    float v00 = pow(gridVal(c, sd), 4.0);
    float v10 = pow(gridVal(c + ivec2(1,0), sd), 4.0);
    float v01 = pow(gridVal(c + ivec2(0,1), sd), 4.0);
    float v11 = pow(gridVal(c + ivec2(1,1), sd), 4.0);
    return mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
}

// --- Cosine exp grid noise (removal layer) ---

float cosineExpGrid(vec2 pos, uint sd) {
    ivec2 c = ivec2(floor(pos));
    vec2 f = fract(pos);
    vec2 t = (1.0 - cos(f * 3.14159265)) * 0.5;
    float v00 = pow(gridVal(c, sd), 4.0);
    float v10 = pow(gridVal(c + ivec2(1,0), sd), 4.0);
    float v01 = pow(gridVal(c + ivec2(0,1), sd), 4.0);
    float v11 = pow(gridVal(c + ivec2(1,1), sd), 4.0);
    return mix(mix(v00, v10, t.x), mix(v01, v11, t.x), t.y);
}

// --- FBM functions ---
// Python simple_multires: per octave, freq doubles, weight halves.
// Each octave gets a different seed (offset by 10000).

// 6-octave bicubic exp FBM (smear)
// Weight sum = 0.984375
float expFbm6Bicubic(vec2 uv, vec2 freq, uint sd) {
    float a = 0.0;
    a += bicubicExpGrid(uv * freq,        sd          ) * 0.5;
    a += bicubicExpGrid(uv * freq * 2.0,  sd + 10000u ) * 0.25;
    a += bicubicExpGrid(uv * freq * 4.0,  sd + 20000u ) * 0.125;
    a += bicubicExpGrid(uv * freq * 8.0,  sd + 30000u ) * 0.0625;
    a += bicubicExpGrid(uv * freq * 16.0, sd + 40000u ) * 0.03125;
    a += bicubicExpGrid(uv * freq * 32.0, sd + 50000u ) * 0.015625;
    return a / 0.984375;
}

// 4-octave bilinear exp FBM (dots & specks)
// Weight sum = 0.9375
float expFbm4Bilinear(vec2 uv, vec2 freq, uint sd) {
    float a = 0.0;
    a += bilinearExpGrid(uv * freq,       sd          ) * 0.5;
    a += bilinearExpGrid(uv * freq * 2.0, sd + 10000u ) * 0.25;
    a += bilinearExpGrid(uv * freq * 4.0, sd + 20000u ) * 0.125;
    a += bilinearExpGrid(uv * freq * 8.0, sd + 30000u ) * 0.0625;
    return a / 0.9375;
}

// 3-octave cosine exp+ridged FBM (removal)
// Ridge applied AFTER interpolation (per-pixel), not at grid points.
// Weight sum = 0.875
float expRidgedFbm3Cosine(vec2 uv, vec2 freq, uint sd) {
    float a = 0.0;
    float v;
    v = cosineExpGrid(uv * freq,       sd          );
    a += (1.0 - abs(2.0 * v - 1.0)) * 0.5;
    v = cosineExpGrid(uv * freq * 2.0, sd + 10000u );
    a += (1.0 - abs(2.0 * v - 1.0)) * 0.25;
    v = cosineExpGrid(uv * freq * 4.0, sd + 20000u );
    a += (1.0 - abs(2.0 * v - 1.0)) * 0.125;
    return a / 0.875;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 dims = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(dims);
    vec4 base = texture(inputTex, uv);

    // Use global UV for noise pattern so it tiles correctly at large resolutions
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : vec2(dims);
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    // Aspect-corrected UV for noise sampling
    float aspect = fullRes.x / fullRes.y;
    vec2 nUV = globalUV * vec2(aspect, 1.0);

    uint s = uint(seed) * 17u;

    // Seed-derived random frequencies (matching Python ranges)
    float smearFreq = mix(3.0, 6.0, hashf(pcg(s + 10u)));
    float dotFreq   = mix(32.0, 64.0, hashf(pcg(s + 50u)));
    float speckFreq = mix(150.0, 200.0, hashf(pcg(s + 90u)));
    float ridgeFreq = mix(2.0, 3.0, hashf(pcg(s + 130u)));

    // -- Layer 1: Large smear (6-oct bicubic exp FBM, domain warped) --
    // Python: warp with freq=[2-3, 1-3], displacement=1+random()
    float warpFreqX = mix(2.0, 3.0, hashf(pcg(s + 160u)));
    float warpFreqY = mix(1.0, 3.0, hashf(pcg(s + 170u)));
    // Use bilinear for warp displacement (simpler, just UV offsets)
    float warpX = bilinearExpGrid(nUV * vec2(warpFreqX, warpFreqY), s + 200u);
    float warpY = bilinearExpGrid(nUV * vec2(warpFreqX, warpFreqY), s + 300u);
    float disp = 1.0 + hashf(pcg(s + 150u));
    vec2 warpedUV = nUV + (vec2(warpX, warpY) - 0.5) * disp * 0.12;
    float smear = expFbm6Bicubic(warpedUV, vec2(smearFreq), s + 100u);

    // -- Layer 2: Medium dots (4-oct bilinear exp FBM + brightness/contrast) --
    // Python: adjustBrightness(-1.0) + adjustContrast(4.0)
    // Analytical equivalent with mean~0.2: clamp(4*v - 1.6, 0, 1)
    float dots = expFbm4Bilinear(nUV, vec2(dotFreq), s + 43u);
    dots = clamp(4.0 * dots - 1.6, 0.0, 1.0);

    // -- Layer 3: Fine specks (4-oct bilinear exp FBM + brightness/contrast) --
    // Python: adjustBrightness(-1.25) + adjustContrast(4.0)
    // Analytical equivalent: clamp(4*v - 2.0, 0, 1)
    float specks = expFbm4Bilinear(nUV, vec2(speckFreq), s + 71u);
    specks = clamp(4.0 * specks - 2.0, 0.0, 1.0);

    // Combine: max of layers (Python uses tf.maximum)
    float combined = max(smear, max(dots, specks));

    // Subtract exp+ridged noise for breaks
    float ridge = expRidgedFbm3Cosine(nUV, vec2(ridgeFreq), s + 89u);
    combined = max(0.0, combined - ridge);

    // Density scales before threshold
    combined *= (0.5 + density * 2.0);

    // Python: blend_layers(normalize(smear), shape, 0.005, tensor, splash*tensor)
    // With feather=0.005 and 2 layers, this is a sharp step at 0.5
    float mask = step(0.5, combined);

    // Color blend: where mask=1, show color * input; where mask=0, show input
    vec3 colored = base.rgb * color;
    vec3 result = mix(base.rgb, mix(base.rgb, colored, mask), alpha);

    fragColor = vec4(result, base.a);
}
`,wgsl:`/*
 * Spatter: Multi-layer procedural paint spatter effect.
 * Grid-based hash noise with explicit interpolation.
 * Exp-distributed FBM with brightness/contrast thresholding,
 * blend_layers with feather=0.005 (sharp step at 0.5).
 */

struct Uniforms {
    density: f32,
    alpha: f32,
    seed: i32,
    _pad0: f32,
    color: vec3<f32>,
    _pad1: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<uniform> time: f32;

// --- PCG PRNG ---

fn pcg3(seed: vec3<u32>) -> vec3<u32> {
    var v = seed * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn pcg(v_in: u32) -> u32 {
    return pcg3(vec3<u32>(v_in, 0u, 0u)).x;
}

fn hashf(h: u32) -> f32 {
    return f32(pcg3(vec3<u32>(h, 0u, 0u)).x) / f32(0xffffffffu);
}

// --- Grid value: hash at integer grid point ---

fn gridVal(p: vec2<i32>, sd: u32) -> f32 {
    let h = pcg3(vec3<u32>(u32(p.x + 32768), u32(p.y + 32768), sd));
    return f32(h.x) / f32(0xffffffffu);
}

// --- Catmull-Rom cubic interpolation helper ---

fn cubic(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    return 0.5 * ((2.0 * b) + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3);
}

// --- Bicubic exp grid (Catmull-Rom, 4x4 neighborhood) ---
// pow(x,4) applied at grid points, then bicubic interpolation

fn bicubicExpGrid(pos: vec2<f32>, sd: u32) -> f32 {
    let ip = vec2<i32>(floor(pos));
    let fp = fract(pos);

    // Evaluate 4x4 grid with exp distribution at grid points
    var row0: f32; var row1: f32; var row2: f32; var row3: f32;

    // Row -1
    let g00 = pow(gridVal(vec2<i32>(ip.x - 1, ip.y - 1), sd), 4.0);
    let g10 = pow(gridVal(vec2<i32>(ip.x,     ip.y - 1), sd), 4.0);
    let g20 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y - 1), sd), 4.0);
    let g30 = pow(gridVal(vec2<i32>(ip.x + 2, ip.y - 1), sd), 4.0);
    row0 = cubic(g00, g10, g20, g30, fp.x);

    // Row 0
    let g01 = pow(gridVal(vec2<i32>(ip.x - 1, ip.y), sd), 4.0);
    let g11 = pow(gridVal(vec2<i32>(ip.x,     ip.y), sd), 4.0);
    let g21 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y), sd), 4.0);
    let g31 = pow(gridVal(vec2<i32>(ip.x + 2, ip.y), sd), 4.0);
    row1 = cubic(g01, g11, g21, g31, fp.x);

    // Row +1
    let g02 = pow(gridVal(vec2<i32>(ip.x - 1, ip.y + 1), sd), 4.0);
    let g12 = pow(gridVal(vec2<i32>(ip.x,     ip.y + 1), sd), 4.0);
    let g22 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y + 1), sd), 4.0);
    let g32 = pow(gridVal(vec2<i32>(ip.x + 2, ip.y + 1), sd), 4.0);
    row2 = cubic(g02, g12, g22, g32, fp.x);

    // Row +2
    let g03 = pow(gridVal(vec2<i32>(ip.x - 1, ip.y + 2), sd), 4.0);
    let g13 = pow(gridVal(vec2<i32>(ip.x,     ip.y + 2), sd), 4.0);
    let g23 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y + 2), sd), 4.0);
    let g33 = pow(gridVal(vec2<i32>(ip.x + 2, ip.y + 2), sd), 4.0);
    row3 = cubic(g03, g13, g23, g33, fp.x);

    return clamp(cubic(row0, row1, row2, row3, fp.y), 0.0, 1.0);
}

// --- Bilinear exp grid (2x2 neighborhood) ---
// pow(x,4) applied at grid points, then bilinear interpolation

fn bilinearExpGrid(pos: vec2<f32>, sd: u32) -> f32 {
    let ip = vec2<i32>(floor(pos));
    let fp = fract(pos);

    let v00 = pow(gridVal(ip, sd), 4.0);
    let v10 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y), sd), 4.0);
    let v01 = pow(gridVal(vec2<i32>(ip.x, ip.y + 1), sd), 4.0);
    let v11 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y + 1), sd), 4.0);

    let mx0 = mix(v00, v10, fp.x);
    let mx1 = mix(v01, v11, fp.x);
    return mix(mx0, mx1, fp.y);
}

// --- Cosine exp grid (2x2 neighborhood with cosine interpolation) ---
// pow(x,4) applied at grid points, cosine-smoothed interpolation

fn cosineExpGrid(pos: vec2<f32>, sd: u32) -> f32 {
    let ip = vec2<i32>(floor(pos));
    let fp = fract(pos);

    let tx = (1.0 - cos(fp.x * 3.14159265358979)) * 0.5;
    let ty = (1.0 - cos(fp.y * 3.14159265358979)) * 0.5;

    let v00 = pow(gridVal(ip, sd), 4.0);
    let v10 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y), sd), 4.0);
    let v01 = pow(gridVal(vec2<i32>(ip.x, ip.y + 1), sd), 4.0);
    let v11 = pow(gridVal(vec2<i32>(ip.x + 1, ip.y + 1), sd), 4.0);

    let mx0 = mix(v00, v10, tx);
    let mx1 = mix(v01, v11, tx);
    return mix(mx0, mx1, ty);
}

// --- FBM functions ---

// 6-octave exp FBM with bicubic interpolation (smear layer)
fn expFbm6Bicubic(uv: vec2<f32>, freq: vec2<f32>, sd: u32) -> f32 {
    var a: f32 = 0.0;
    a = a + bicubicExpGrid(uv * freq,        sd           ) * 0.5;
    a = a + bicubicExpGrid(uv * freq * 2.0,  sd + 10000u  ) * 0.25;
    a = a + bicubicExpGrid(uv * freq * 4.0,  sd + 20000u  ) * 0.125;
    a = a + bicubicExpGrid(uv * freq * 8.0,  sd + 30000u  ) * 0.0625;
    a = a + bicubicExpGrid(uv * freq * 16.0, sd + 40000u  ) * 0.03125;
    a = a + bicubicExpGrid(uv * freq * 32.0, sd + 50000u  ) * 0.015625;
    return a / 0.984375;
}

// 4-octave exp FBM with bilinear interpolation (dots & specks)
fn expFbm4Bilinear(uv: vec2<f32>, freq: vec2<f32>, sd: u32) -> f32 {
    var a: f32 = 0.0;
    a = a + bilinearExpGrid(uv * freq,        sd           ) * 0.5;
    a = a + bilinearExpGrid(uv * freq * 2.0,  sd + 10000u  ) * 0.25;
    a = a + bilinearExpGrid(uv * freq * 4.0,  sd + 20000u  ) * 0.125;
    a = a + bilinearExpGrid(uv * freq * 8.0,  sd + 30000u  ) * 0.0625;
    return a / 0.9375;
}

// 3-octave exp+ridged FBM with cosine interpolation (removal layer)
// Ridge transform applied AFTER interpolation (per-pixel), not at grid points
fn expRidgedFbm3Cosine(uv: vec2<f32>, freq: vec2<f32>, sd: u32) -> f32 {
    var a: f32 = 0.0;
    var v: f32;
    v = cosineExpGrid(uv * freq,        sd          );
    a = a + (1.0 - abs(2.0 * v - 1.0)) * 0.5;
    v = cosineExpGrid(uv * freq * 2.0,  sd + 10000u );
    a = a + (1.0 - abs(2.0 * v - 1.0)) * 0.25;
    v = cosineExpGrid(uv * freq * 4.0,  sd + 20000u );
    a = a + (1.0 - abs(2.0 * v - 1.0)) * 0.125;
    return a / 0.875;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dims: vec2<f32> = vec2<f32>(textureDimensions(inputTex));
    let uv = (pos.xy + uniforms.tileOffset) / uniforms.fullResolution;
    let base: vec4<f32> = textureSample(inputTex, inputSampler, uv);

    // Aspect-corrected UV for noise sampling
    let aspect: f32 = uniforms.fullResolution.x / uniforms.fullResolution.y;
    let nUV: vec2<f32> = uv * vec2<f32>(aspect, 1.0);

    let s: u32 = u32(uniforms.seed) * 17u;
    let user_color: vec3<f32> = uniforms.color;

    // Seed-derived random frequencies (matching Python ranges)
    let smearFreq: f32 = mix(3.0, 6.0, hashf(pcg(s + 10u)));
    let dotFreq: f32   = mix(32.0, 64.0, hashf(pcg(s + 50u)));
    let speckFreq: f32 = mix(150.0, 200.0, hashf(pcg(s + 90u)));
    let ridgeFreq: f32 = mix(2.0, 3.0, hashf(pcg(s + 130u)));

    // -- Layer 1: Large smear (6-oct bicubic exp FBM, domain warped) --
    let warpFreqX: f32 = mix(2.0, 3.0, hashf(pcg(s + 160u)));
    let warpFreqY: f32 = mix(1.0, 3.0, hashf(pcg(s + 170u)));
    let warpX: f32 = bilinearExpGrid(nUV * vec2<f32>(warpFreqX, warpFreqY), s + 200u);
    let warpY: f32 = bilinearExpGrid(nUV * vec2<f32>(warpFreqX, warpFreqY), s + 300u);
    let disp: f32 = 1.0 + hashf(pcg(s + 150u));
    let warpedUV: vec2<f32> = nUV + (vec2<f32>(warpX, warpY) - 0.5) * disp * 0.12;
    let smear: f32 = expFbm6Bicubic(warpedUV, vec2<f32>(smearFreq), s + 100u);

    // -- Layer 2: Medium dots (4-oct bilinear exp FBM + brightness/contrast) --
    var dots: f32 = expFbm4Bilinear(nUV, vec2<f32>(dotFreq), s + 43u);
    dots = clamp(4.0 * dots - 1.6, 0.0, 1.0);

    // -- Layer 3: Fine specks (4-oct bilinear exp FBM + brightness/contrast) --
    var specks: f32 = expFbm4Bilinear(nUV, vec2<f32>(speckFreq), s + 71u);
    specks = clamp(4.0 * specks - 2.0, 0.0, 1.0);

    // Combine: max of layers
    var combined: f32 = max(smear, max(dots, specks));

    // Subtract exp+ridged cosine noise for breaks
    let ridge: f32 = expRidgedFbm3Cosine(nUV, vec2<f32>(ridgeFreq), s + 89u);
    combined = max(0.0, combined - ridge);

    // Density scales before threshold
    combined = combined * (0.5 + uniforms.density * 2.0);

    // Sharp step at 0.5 (Python blend_layers with feather=0.005)
    let mask: f32 = step(0.5, combined);

    // Color blend
    let colored: vec3<f32> = base.rgb * user_color;
    let result: vec3<f32> = mix(base.rgb, mix(base.rgb, colored, mask), uniforms.alpha);

    return vec4<f32>(result, base.a);
}
`}},a=`# spatter

Paint spatter effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | [0.875, 0.125, 0.125] | - | Spatter color |
| density | float | 0.5 | 0-1 | Spatter density |
| alpha | float | 0.75 | 0-1 | Spatter opacity |
| seed | int | 1 | 1-100 | Random seed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .spatter()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(r))n.shaders[t]={...e}}n&&a&&(n.help=a);var c="filter/spatter",d="filter",f="spatter",u=n;export{u as default,c as effectId,f as effectName,a as help,d as namespace};
