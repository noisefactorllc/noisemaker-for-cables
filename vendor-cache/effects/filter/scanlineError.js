/* filter/scanlineError */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Scanline Error",namespace:"filter",func:"scanlineError",tags:["distort","glitch"],description:"Scanline glitch effect/VHS tape artifacts",globals:{mode:{type:"int",default:1,uniform:"mode",choices:{scanline:0,vhs:1},ui:{label:"mode",control:"dropdown"}},timeOffset:{type:"float",default:0,uniform:"timeOffset",min:-10,max:10,step:.01,ui:{label:"time offset",control:"slider"}},distortion:{type:"float",default:1,uniform:"distortion",min:0,max:3,step:.01,ui:{label:"distortion",control:"slider"}},noise:{type:"float",default:1,uniform:"noise",min:0,max:3,step:.01,ui:{label:"noise",control:"slider"}},speed:{type:"float",default:1,uniform:"speed",min:0,max:5,step:.1,ui:{label:"speed",control:"slider"}}},passes:[{name:"main",program:"scanlineError",inputs:{inputTex:"inputTex"},uniforms:{speed:"speed",timeOffset:"timeOffset",distortion:"distortion",noise:"noise",mode:"mode",time:"time"},outputs:{fragColor:"outputTex"}}]});var i={scanlineError:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Scanline glitch effect with two modes:
// - scanlineError: simplex noise bands with horizontal displacement and additive white noise
// - vhs: hash-based value noise with gradient-gated displacement and noise blending

const float TAU = 6.283185307179586;

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float speed;
uniform float timeOffset;
uniform float distortion;
uniform float noise;
uniform float mode;
uniform float time;
uniform float renderScale;

out vec4 fragColor;

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

// =====================================================================
// Simplex noise (scanlineError mode)
// =====================================================================

vec3 mod289_vec3(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289_vec4(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289_vec4(((x * 34.0) + 1.0) * x);
}

vec4 taylor_inv_sqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float simplex_noise(vec3 v) {
    vec2 c = vec2(1.0 / 6.0, 1.0 / 3.0);
    vec4 d = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i0 = floor(v + dot(v, vec3(c.y)));
    vec3 x0 = v - i0 + dot(i0, vec3(c.x));

    vec3 step1 = step(vec3(x0.y, x0.z, x0.x), x0);
    vec3 l = vec3(1.0) - step1;
    vec3 i1 = min(step1, vec3(l.z, l.x, l.y));
    vec3 i2 = max(step1, vec3(l.z, l.x, l.y));

    vec3 x1 = x0 - i1 + vec3(c.x);
    vec3 x2 = x0 - i2 + vec3(c.y);
    vec3 x3 = x0 - vec3(d.y);

    vec3 i = mod289_vec3(i0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.14285714285714285;
    vec3 ns = n_ * vec3(d.w, d.y, d.z) - vec3(d.x, d.z, d.x);

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.y;
    vec4 y = y_ * ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.x, x.y, y.x, y.y);
    vec4 b1 = vec4(x.z, x.w, y.z, y.w);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = vec4(b0.x, b0.z, b0.y, b0.w)
        + vec4(s0.x, s0.z, s0.y, s0.w) * vec4(sh.x, sh.x, sh.y, sh.y);
    vec4 a1 = vec4(b1.x, b1.z, b1.y, b1.w)
        + vec4(s1.x, s1.z, s1.y, s1.w) * vec4(sh.z, sh.z, sh.w, sh.w);

    vec3 g0 = vec3(a0.x, a0.y, h.x);
    vec3 g1 = vec3(a0.z, a0.w, h.y);
    vec3 g2 = vec3(a1.x, a1.y, h.z);
    vec3 g3 = vec3(a1.z, a1.w, h.w);

    vec4 norm = taylor_inv_sqrt(vec4(
        dot(g0, g0),
        dot(g1, g1),
        dot(g2, g2),
        dot(g3, g3)
    ));

    vec3 g0n = g0 * norm.x;
    vec3 g1n = g1 * norm.y;
    vec3 g2n = g2 * norm.z;
    vec3 g3n = g3 * norm.w;

    float m0 = max(0.6 - dot(x0, x0), 0.0);
    float m1 = max(0.6 - dot(x1, x1), 0.0);
    float m2 = max(0.6 - dot(x2, x2), 0.0);
    float m3 = max(0.6 - dot(x3, x3), 0.0);

    float m0sq = m0 * m0;
    float m1sq = m1 * m1;
    float m2sq = m2 * m2;
    float m3sq = m3 * m3;

    return 42.0 * (
        m0sq * m0sq * dot(g0n, x0)
        + m1sq * m1sq * dot(g1n, x1)
        + m2sq * m2sq * dot(g2n, x2)
        + m3sq * m3sq * dot(g3n, x3)
    );
}

float periodic_value(float t, float value) {
    return sin((t - value) * TAU) * 0.5 + 0.5;
}

vec2 normalized_coord(uvec2 coord, vec2 dims) {
    float width_safe = max(dims.x, 1.0);
    float height_safe = max(dims.y, 1.0);
    return vec2(
        (float(coord.x) + 0.5) / width_safe,
        (float(coord.y) + 0.5) / height_safe
    );
}

float compute_simplex_value(vec2 coord, vec2 freq, float t, float speed_value, vec3 offset) {
    float freq_x = max(freq.x, 1.0);
    float freq_y = max(freq.y, 1.0);
    float angle = cos(t * TAU) * speed_value;
    vec3 sampleVec = vec3(
        coord.x * freq_x + offset.x,
        coord.y * freq_y + offset.y,
        angle + offset.z
    );
    return simplex_noise(sampleVec);
}

float compute_value_noise(
    vec2 coord,
    vec2 freq,
    float t,
    float speed_value,
    vec3 base_seed,
    vec3 time_seed
) {
    float base_noise = compute_simplex_value(coord, freq, t, speed_value, base_seed);
    float value = clamp01(base_noise * 0.5 + 0.5);

    if (speed_value != 0.0 && t != 0.0) {
        float time_noise_raw = compute_simplex_value(coord, freq, 0.0, 1.0, time_seed);
        float time_value = clamp01(time_noise_raw * 0.5 + 0.5);
        float scaled_time = periodic_value(t, time_value) * speed_value;
        value = periodic_value(scaled_time, value);
    }

    return clamp01(value);
}

float compute_exponential_noise(
    vec2 coord,
    vec2 freq,
    float t,
    float speed_value,
    vec3 base_seed,
    vec3 time_seed
) {
    float base = compute_value_noise(coord, freq, t, speed_value, base_seed, time_seed);
    return pow(base, 4.0);
}

int wrap_coord(int coord, int limit) {
    if (limit <= 0) {
        return 0;
    }
    int wrapped = coord % limit;
    if (wrapped < 0) {
        wrapped += limit;
    }
    return wrapped;
}

const vec3 BASE_SEED_LINE = vec3(37.0, 91.0, 53.0);
const vec3 TIME_SEED_LINE = vec3(
    BASE_SEED_LINE.x + 97.0,
    BASE_SEED_LINE.y + 59.0,
    BASE_SEED_LINE.z + 131.0
);
const vec3 BASE_SEED_SWERVE = vec3(11.0, 73.0, 29.0);
const vec3 TIME_SEED_SWERVE = vec3(
    BASE_SEED_SWERVE.x + 89.0,
    BASE_SEED_SWERVE.y + 41.0,
    BASE_SEED_SWERVE.z + 149.0
);
const vec3 BASE_SEED_WHITE = vec3(67.0, 29.0, 149.0);
const vec3 TIME_SEED_WHITE = vec3(
    BASE_SEED_WHITE.x + 113.0,
    BASE_SEED_WHITE.y + 53.0,
    BASE_SEED_WHITE.z + 173.0
);

// =====================================================================
// Hash-based value noise (vhs mode)
// =====================================================================

// PCG PRNG
uvec3 pcg(uvec3 v) {
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

float hashNoise(vec3 p) {
    uvec3 seed = uvec3(floatBitsToUint(p.x), floatBitsToUint(p.y), floatBitsToUint(p.z));
    return float(pcg(seed).x) / float(0xffffffffu);
}

float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    float c000 = hashNoise(i);
    float c100 = hashNoise(i + vec3(1.0, 0.0, 0.0));
    float c010 = hashNoise(i + vec3(0.0, 1.0, 0.0));
    float c110 = hashNoise(i + vec3(1.0, 1.0, 0.0));
    float c001 = hashNoise(i + vec3(0.0, 0.0, 1.0));
    float c101 = hashNoise(i + vec3(1.0, 0.0, 1.0));
    float c011 = hashNoise(i + vec3(0.0, 1.0, 1.0));
    float c111 = hashNoise(i + vec3(1.0, 1.0, 1.0));

    return mix(
        mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y),
        mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y),
        u.z
    );
}

float vhs_computeNoise(vec2 coord, vec2 freq, float t, float spd, vec3 baseOff, vec3 timeOff) {
    vec3 p = vec3(
        coord.x * freq.x + baseOff.x,
        coord.y * freq.y + baseOff.y,
        cos(t * TAU) * spd + baseOff.z
    );

    float val = valueNoise(p);

    if (spd != 0.0 && t != 0.0) {
        vec3 tp = vec3(
            coord.x * freq.x + timeOff.x,
            coord.y * freq.y + timeOff.y,
            timeOff.z
        );
        float timeVal = valueNoise(tp);
        float scaledTime = periodic_value(t, timeVal) * spd;
        val = periodic_value(scaledTime, val);
    }

    return clamp(val, 0.0, 1.0);
}

float vhs_gradValue(float yNorm, float freqY, float t, float spd) {
    float base = vhs_computeNoise(
        vec2(0.0, yNorm),
        vec2(1.0, freqY),
        t, spd,
        vec3(17.0, 29.0, 47.0),
        vec3(71.0, 113.0, 191.0)
    );
    float g = max(base - 0.5, 0.0);
    return min(g * 2.0, 1.0);
}

float vhs_scanNoise(vec2 coord, vec2 freq, float t, float spd) {
    return vhs_computeNoise(coord, freq, t, spd,
        vec3(37.0, 59.0, 83.0),
        vec3(131.0, 173.0, 211.0)
    );
}

// =====================================================================
// Main
// =====================================================================

void main() {
    uvec3 gid = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), 0u);

    ivec2 input_size = textureSize(inputTex, 0);
    uint tile_width = uint(input_size.x);
    uint tile_height = uint(input_size.y);

    if (tile_width == 0u || tile_height == 0u || gid.x >= tile_width || gid.y >= tile_height) {
        fragColor = vec4(0.0);
        return;
    }

    // Compute canvas resolution for tile-aware rendering
    vec2 fullRes = fullResolution.x > 0.0 ? (fullResolution / renderScale) : vec2(input_size);
    float width_f = fullRes.x;
    float height_f = fullRes.y;
    vec2 dims = vec2(width_f, height_f);
    
    // Global pixel coordinate for pattern generation and sampling
    vec2 globalGid_f = vec2(float(gid.x) + tileOffset.x, float(gid.y) + tileOffset.y);
    uvec2 globalGid = uvec2(uint(globalGid_f.x), uint(globalGid_f.y));
    float time_value = time + timeOffset;
    float speed_value = max(speed, 0.0);
    int m = int(mode);

    if (m == 1) {
        // VHS mode
        float yNorm = (float(globalGid.y) + 0.5) / fullResolution.y;
        float xNorm = (float(globalGid.x) + 0.5) / fullResolution.x;
        vec2 destCoord = vec2(xNorm, yNorm);

        float gradDest = vhs_gradValue(yNorm, 5.0, time_value, speed_value);

        float scanBase = floor(height_f * 0.5) + 1.0;
        vec2 scanFreq;
        if (height_f < width_f) {
            scanFreq = vec2(scanBase * (height_f / width_f), scanBase);
        } else {
            scanFreq = vec2(scanBase, scanBase * (width_f / height_f));
        }

        float scanDest = vhs_scanNoise(destCoord, scanFreq, time_value, speed_value * 100.0);

        float fullWidth = fullResolution.x > 0.0 ? fullResolution.x : width_f;
        float shiftAmount = floor(scanDest * fullWidth * gradDest * gradDest * distortion);
        
        float globalSampleX = float(globalGid.x) - shiftAmount;
        int wrappedGlobalX = wrap_coord(int(globalSampleX), int(fullWidth));
        int localSampleX = wrappedGlobalX - int(tileOffset.x);
        if (localSampleX < 0) localSampleX += int(tile_width);
        localSampleX = clamp(localSampleX, 0, int(tile_width) - 1);

        vec4 srcTexel = texelFetch(inputTex, ivec2(localSampleX, int(gid.y)), 0);

        float srcXNorm = (float(wrappedGlobalX) + 0.5) / fullResolution.x;
        float scanSource = vhs_scanNoise(vec2(srcXNorm, yNorm), scanFreq, time_value, speed_value * 100.0);
        float gradSource = vhs_gradValue(yNorm, 5.0, time_value, speed_value);

        vec3 noiseColor = vec3(scanSource);
        vec3 blended = mix(srcTexel.rgb, noiseColor, gradSource * noise);

        fragColor = vec4(blended, srcTexel.a);
    } else {
        // Scanline error mode (default)
        ivec2 base_coord = ivec2(int(gid.x), int(gid.y));
        vec4 input_texel = texelFetch(inputTex, base_coord, 0);

        vec2 coord_norm = normalized_coord(globalGid, dims);
        vec2 freq_line = vec2(
            max(floor(width_f * 0.5), 1.0),
            max(floor(height_f * 0.5), 1.0)
        );
        float swerve_height = max(floor(height_f * 0.01), 1.0);
        vec2 freq_swerve = vec2(1.0, swerve_height);
        vec2 swerve_coord = vec2(0.0, coord_norm.y);

        float line_noise = compute_exponential_noise(
            coord_norm, freq_line, time_value, speed_value * 10.0,
            BASE_SEED_LINE, TIME_SEED_LINE
        );
        line_noise = max(line_noise - 0.25, 0.0) * 2.0;

        float swerve_noise = compute_exponential_noise(
            swerve_coord, freq_swerve, time_value, speed_value,
            BASE_SEED_SWERVE, TIME_SEED_SWERVE
        );
        swerve_noise = max(swerve_noise - 0.25, 0.0) * 2.0;

        float line_weighted = line_noise * swerve_noise;
        float swerve_weight = swerve_noise * 2.0;

        float white_base = compute_value_noise(
            coord_norm, freq_line, time_value, speed_value * 100.0,
            BASE_SEED_WHITE, TIME_SEED_WHITE
        );
        float white_weighted = white_base * swerve_weight;

        float combined_error = clamp01(line_weighted + white_weighted);
        float fullWidth = fullResolution.x > 0.0 ? fullResolution.x : width_f;
        float shift_amount = combined_error * fullWidth * 0.025 * distortion;
        int shift_pixels = int(floor(shift_amount));
        
        float globalSampleX = float(globalGid.x) - float(shift_pixels);
        int wrappedGlobalX = wrap_coord(int(globalSampleX), int(fullWidth));
        int localSampleX = wrappedGlobalX - int(tileOffset.x);
        if (localSampleX < 0) localSampleX += int(tile_width);
        localSampleX = clamp(localSampleX, 0, int(tile_width) - 1);

        vec4 texel = texelFetch(inputTex, ivec2(localSampleX, int(gid.y)), 0);

        float additive = clamp(line_weighted * white_weighted * 4.0 * noise, 0.0, 4.0);
        vec3 boosted = clamp(texel.rgb + vec3(additive), vec3(0.0), vec3(1.0));

        fragColor = vec4(boosted, texel.a);
    }
}
`,wgsl:`// Scanline glitch effect with two modes:
// - scanlineError: simplex noise bands with horizontal displacement and additive white noise
// - vhs: hash-based value noise with gradient-gated displacement and noise blending

const TAU: f32 = 6.283185307179586;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> speed: f32;
@group(0) @binding(2) var<uniform> timeOffset: f32;
@group(0) @binding(3) var<uniform> distortion: f32;
@group(0) @binding(4) var<uniform> noise_amount: f32;
@group(0) @binding(5) var<uniform> mode: f32;
@group(0) @binding(6) var<uniform> time: f32;

fn clamp01(value: f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

// =====================================================================
// Simplex noise (scanlineError mode)
// =====================================================================

fn mod289_vec3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_vec4(x: vec4<f32>) -> vec4<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec4<f32>) -> vec4<f32> {
    return mod289_vec4(((x * 34.0) + 1.0) * x);
}

fn taylor_inv_sqrt(r: vec4<f32>) -> vec4<f32> {
    return 1.79284291400159 - 0.85373472095314 * r;
}

fn simplex_noise(v: vec3<f32>) -> f32 {
    let c = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);
    let d = vec4<f32>(0.0, 0.5, 1.0, 2.0);

    let i0 = floor(v + dot(v, vec3<f32>(c.y)));
    let x0 = v - i0 + dot(i0, vec3<f32>(c.x));

    let step1 = step(vec3<f32>(x0.y, x0.z, x0.x), x0);
    let l = vec3<f32>(1.0) - step1;
    let i1 = min(step1, vec3<f32>(l.z, l.x, l.y));
    let i2 = max(step1, vec3<f32>(l.z, l.x, l.y));

    let x1 = x0 - i1 + vec3<f32>(c.x);
    let x2 = x0 - i2 + vec3<f32>(c.y);
    let x3 = x0 - vec3<f32>(d.y);

    let i = mod289_vec3(i0);
    let p = permute(permute(permute(
        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));

    let n_ = 0.14285714285714285;
    let ns = n_ * vec3<f32>(d.w, d.y, d.z) - vec3<f32>(d.x, d.z, d.x);

    let j = p - 49.0 * floor(p * ns.z * ns.z);
    let x_ = floor(j * ns.z);
    let y_ = floor(j - 7.0 * x_);

    let x = x_ * ns.x + ns.y;
    let y = y_ * ns.x + ns.y;
    let h = 1.0 - abs(x) - abs(y);

    let b0 = vec4<f32>(x.x, x.y, y.x, y.y);
    let b1 = vec4<f32>(x.z, x.w, y.z, y.w);

    let s0 = floor(b0) * 2.0 + 1.0;
    let s1 = floor(b1) * 2.0 + 1.0;
    let sh = -step(h, vec4<f32>(0.0));

    let a0 = vec4<f32>(b0.x, b0.z, b0.y, b0.w) + vec4<f32>(s0.x, s0.z, s0.y, s0.w) * vec4<f32>(sh.x, sh.x, sh.y, sh.y);
    let a1 = vec4<f32>(b1.x, b1.z, b1.y, b1.w) + vec4<f32>(s1.x, s1.z, s1.y, s1.w) * vec4<f32>(sh.z, sh.z, sh.w, sh.w);

    let g0 = vec3<f32>(a0.x, a0.y, h.x);
    let g1 = vec3<f32>(a0.z, a0.w, h.y);
    let g2 = vec3<f32>(a1.x, a1.y, h.z);
    let g3 = vec3<f32>(a1.z, a1.w, h.w);

    let norm = taylor_inv_sqrt(vec4<f32>(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));

    let g0n = g0 * norm.x;
    let g1n = g1 * norm.y;
    let g2n = g2 * norm.z;
    let g3n = g3 * norm.w;

    let m0 = max(0.6 - dot(x0, x0), 0.0);
    let m1 = max(0.6 - dot(x1, x1), 0.0);
    let m2 = max(0.6 - dot(x2, x2), 0.0);
    let m3 = max(0.6 - dot(x3, x3), 0.0);

    let m0sq = m0 * m0;
    let m1sq = m1 * m1;
    let m2sq = m2 * m2;
    let m3sq = m3 * m3;

    return 42.0 * (
        m0sq * m0sq * dot(g0n, x0) +
        m1sq * m1sq * dot(g1n, x1) +
        m2sq * m2sq * dot(g2n, x2) +
        m3sq * m3sq * dot(g3n, x3)
    );
}

fn periodic_value(t: f32, value: f32) -> f32 {
    return sin((t - value) * TAU) * 0.5 + 0.5;
}

fn compute_simplex_value(coord: vec2<f32>, freq: vec2<f32>, t: f32, speed_value: f32, offset: vec3<f32>) -> f32 {
    let freq_x = max(freq.x, 1.0);
    let freq_y = max(freq.y, 1.0);
    let angle = cos(t * TAU) * speed_value;
    let sampleVec = vec3<f32>(coord.x * freq_x + offset.x, coord.y * freq_y + offset.y, angle + offset.z);
    return simplex_noise(sampleVec);
}

fn compute_value_noise(coord: vec2<f32>, freq: vec2<f32>, t: f32, speed_value: f32, base_seed: vec3<f32>, time_seed: vec3<f32>) -> f32 {
    let base_noise = compute_simplex_value(coord, freq, t, speed_value, base_seed);
    var value = clamp01(base_noise * 0.5 + 0.5);

    if (speed_value != 0.0 && t != 0.0) {
        let time_noise_raw = compute_simplex_value(coord, freq, 0.0, 1.0, time_seed);
        let time_value = clamp01(time_noise_raw * 0.5 + 0.5);
        let scaled_time = periodic_value(t, time_value) * speed_value;
        value = periodic_value(scaled_time, value);
    }

    return clamp01(value);
}

fn compute_exponential_noise(coord: vec2<f32>, freq: vec2<f32>, t: f32, speed_value: f32, base_seed: vec3<f32>, time_seed: vec3<f32>) -> f32 {
    let base = compute_value_noise(coord, freq, t, speed_value, base_seed, time_seed);
    return pow(base, 4.0);
}

fn wrap_coord(coord: i32, limit: i32) -> i32 {
    if (limit <= 0) {
        return 0;
    }
    var wrapped = coord % limit;
    if (wrapped < 0) {
        wrapped = wrapped + limit;
    }
    return wrapped;
}

const BASE_SEED_LINE: vec3<f32> = vec3<f32>(37.0, 91.0, 53.0);
const TIME_SEED_LINE: vec3<f32> = vec3<f32>(134.0, 150.0, 184.0);
const BASE_SEED_SWERVE: vec3<f32> = vec3<f32>(11.0, 73.0, 29.0);
const TIME_SEED_SWERVE: vec3<f32> = vec3<f32>(100.0, 114.0, 178.0);
const BASE_SEED_WHITE: vec3<f32> = vec3<f32>(67.0, 29.0, 149.0);
const TIME_SEED_WHITE: vec3<f32> = vec3<f32>(180.0, 82.0, 322.0);

// =====================================================================
// Hash-based value noise (vhs mode)
// =====================================================================

// PCG PRNG
fn pcg(seed: vec3<u32>) -> vec3<u32> {
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

fn hashNoise(p: vec3<f32>) -> f32 {
    let seed = vec3<u32>(bitcast<u32>(p.x), bitcast<u32>(p.y), bitcast<u32>(p.z));
    return f32(pcg(seed).x) / f32(0xffffffffu);
}

fn valueNoise(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    let c000 = hashNoise(i);
    let c100 = hashNoise(i + vec3<f32>(1.0, 0.0, 0.0));
    let c010 = hashNoise(i + vec3<f32>(0.0, 1.0, 0.0));
    let c110 = hashNoise(i + vec3<f32>(1.0, 1.0, 0.0));
    let c001 = hashNoise(i + vec3<f32>(0.0, 0.0, 1.0));
    let c101 = hashNoise(i + vec3<f32>(1.0, 0.0, 1.0));
    let c011 = hashNoise(i + vec3<f32>(0.0, 1.0, 1.0));
    let c111 = hashNoise(i + vec3<f32>(1.0, 1.0, 1.0));

    return mix(
        mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y),
        mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y),
        u.z
    );
}

fn vhs_computeNoise(coord: vec2<f32>, freq: vec2<f32>, t: f32, spd: f32, baseOff: vec3<f32>, timeOff: vec3<f32>) -> f32 {
    let p = vec3<f32>(
        coord.x * freq.x + baseOff.x,
        coord.y * freq.y + baseOff.y,
        cos(t * TAU) * spd + baseOff.z
    );

    var val = valueNoise(p);

    if (spd != 0.0 && t != 0.0) {
        let tp = vec3<f32>(
            coord.x * freq.x + timeOff.x,
            coord.y * freq.y + timeOff.y,
            timeOff.z
        );
        let timeVal = valueNoise(tp);
        let scaledTime = periodic_value(t, timeVal) * spd;
        val = periodic_value(scaledTime, val);
    }

    return clamp(val, 0.0, 1.0);
}

fn vhs_gradValue(yNorm: f32, freqY: f32, t: f32, spd: f32) -> f32 {
    let base = vhs_computeNoise(
        vec2<f32>(0.0, yNorm),
        vec2<f32>(1.0, freqY),
        t, spd,
        vec3<f32>(17.0, 29.0, 47.0),
        vec3<f32>(71.0, 113.0, 191.0)
    );
    var g = max(base - 0.5, 0.0);
    g = min(g * 2.0, 1.0);
    return g;
}

fn vhs_scanNoise(coord: vec2<f32>, freq: vec2<f32>, t: f32, spd: f32) -> f32 {
    return vhs_computeNoise(coord, freq, t, spd,
        vec3<f32>(37.0, 59.0, 83.0),
        vec3<f32>(131.0, 173.0, 211.0)
    );
}

// =====================================================================
// Main
// =====================================================================

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex));
    let coord = vec2<i32>(in.position.xy);

    let width = i32(dims.x);
    let height = i32(dims.y);

    if (width == 0 || height == 0) {
        return vec4<f32>(0.0);
    }

    let width_f = dims.x;
    let height_f = dims.y;
    let time_value = time + timeOffset;
    let speed_value = max(speed, 0.0);
    let m = i32(mode);

    if (m == 1) {
        // VHS mode
        let yNorm = (f32(coord.y) + 0.5) / height_f;
        let xNorm = (f32(coord.x) + 0.5) / width_f;
        let destCoord = vec2<f32>(xNorm, yNorm);

        let gradDest = vhs_gradValue(yNorm, 5.0, time_value, speed_value);

        let scanBase = floor(height_f * 0.5) + 1.0;
        let scanFreq = select(
            vec2<f32>(scanBase * (height_f / width_f), scanBase),
            vec2<f32>(scanBase, scanBase * (width_f / height_f)),
            height_f < width_f
        );

        let scanDest = vhs_scanNoise(destCoord, scanFreq, time_value, speed_value * 100.0);

        let shiftAmount = i32(floor(scanDest * width_f * gradDest * gradDest * distortion));
        let srcX = wrap_coord(coord.x - shiftAmount, width);

        let srcTexel = textureLoad(inputTex, vec2<i32>(srcX, coord.y), 0);

        let srcXNorm = (f32(srcX) + 0.5) / width_f;
        let scanSource = vhs_scanNoise(vec2<f32>(srcXNorm, yNorm), scanFreq, time_value, speed_value * 100.0);
        let gradSource = vhs_gradValue(yNorm, 5.0, time_value, speed_value);

        let noiseColor = vec3<f32>(scanSource);
        let blended = mix(srcTexel.rgb, noiseColor, gradSource * noise_amount);

        return vec4<f32>(blended, srcTexel.a);
    } else {
        // Scanline error mode (default)
        let input_texel = textureLoad(inputTex, coord, 0);

        let coord_norm = (vec2<f32>(coord) + 0.5) / dims;
        let freq_line = vec2<f32>(max(floor(width_f * 0.5), 1.0), max(floor(height_f * 0.5), 1.0));
        let swerve_height = max(floor(height_f * 0.01), 1.0);
        let freq_swerve = vec2<f32>(1.0, swerve_height);
        let swerve_coord = vec2<f32>(0.0, coord_norm.y);

        var line_noise = compute_exponential_noise(coord_norm, freq_line, time_value, speed_value * 10.0, BASE_SEED_LINE, TIME_SEED_LINE);
        line_noise = max(line_noise - 0.25, 0.0) * 2.0;

        var swerve_noise = compute_exponential_noise(swerve_coord, freq_swerve, time_value, speed_value, BASE_SEED_SWERVE, TIME_SEED_SWERVE);
        swerve_noise = max(swerve_noise - 0.25, 0.0) * 2.0;

        let line_weighted = line_noise * swerve_noise;
        let swerve_weight = swerve_noise * 2.0;

        let white_base = compute_value_noise(coord_norm, freq_line, time_value, speed_value * 100.0, BASE_SEED_WHITE, TIME_SEED_WHITE);
        let white_weighted = white_base * swerve_weight;

        let combined_error = clamp01(line_weighted + white_weighted);
        let shift_amount = combined_error * width_f * 0.025 * distortion;
        let shift_pixels = i32(floor(shift_amount));
        let sample_x = wrap_coord(coord.x - shift_pixels, width);

        let texel = textureLoad(inputTex, vec2<i32>(sample_x, coord.y), 0);

        let additive = clamp(line_weighted * white_weighted * 4.0 * noise_amount, 0.0, 4.0);
        let boosted = clamp(texel.rgb + vec3<f32>(additive), vec3<f32>(0.0), vec3<f32>(1.0));

        return vec4<f32>(boosted, texel.a);
    }
}
`}},s=`# scanlineError

Scanline glitch effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | vhs | scanline/vhs | Glitch style |
| timeOffset | float | 0 | -10-10 | Time offset |
| distortion | float | 1 | 0-3 | Horizontal displacement amount |
| noise | float | 1 | 0-3 | Noise overlay amount |
| speed | float | 1 | 0-5 | Animation speed |

## Notes

- **scanline** mode uses simplex noise with exponential thresholding for sharp glitch bursts
- **vhs** mode uses hash-based value noise with gradient gating for smoother VHS tracking artifacts

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scanlineError()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(i))n.shaders[o]={...e}}n&&s&&(n.help=s);var f="filter/scanlineError",v="filter",d="scanlineError",m=n;export{m as default,f as effectId,d as effectName,s as help,v as namespace};
