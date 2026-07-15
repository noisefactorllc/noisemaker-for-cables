/* filter/degauss */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Degauss",namespace:"filter",func:"degauss",tags:["distort"],description:"CRT degauss effect",globals:{displacement:{type:"float",default:.0625,uniform:"displacement",min:0,max:.25,step:.001,ui:{label:"displacement",control:"slider"}},direction:{type:"float",default:0,uniform:"direction",min:-180,max:180,ui:{label:"direction",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},speed:{type:"float",default:1,uniform:"speed",min:0,max:2,step:.1,ui:{label:"speed",control:"slider"}}},defaultProgram:`search filter, synth

testPattern()
.degauss()
.write(o0)`,passes:[{name:"main",program:"degauss",inputs:{inputTex:"inputTex"},uniforms:{displacement:"displacement",speed:"speed",seed:"seed",direction:"direction"},outputs:{fragColor:"outputTex"}}]});var a={degauss:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Degauss: simulate a CRT-style degaussing wobble by lens-warping
// each color channel independently. Based on the Python
// implementation in effects.degauss(), which repeatedly invokes
// lens_warp() with simplex noise-derived displacements.

const float TAU = 6.28318530717958647692;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float displacement;
uniform float speed;
uniform int seed;
uniform float direction;

out vec4 fragColor;

uint as_u32(float value) {
    return uint(max(value, 0.0));
}

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

int wrap_index(int value, int limit) {
    if (limit <= 0) {
        return 0;
    }
    int wrapped = value % limit;
    if (wrapped < 0) {
        wrapped = wrapped + limit;
    }
    return wrapped;
}

float wrap_float(float value, float limit) {
    if (limit <= 0.0) {
        return 0.0;
    }
    float result = value - floor(value / limit) * limit;
    if (result < 0.0) {
        result = result + limit;
    }
    return result;
}

vec2 freq_for_shape(float base_freq, float width, float height) {
    if (base_freq <= 0.0) {
        return vec2(1.0, 1.0);
    }

    if (abs(width - height) < 1e-5) {
        return vec2(base_freq, base_freq);
    }

    if (height < width && height > 0.0) {
        return vec2(base_freq, base_freq * width / height);
    }

    if (width > 0.0) {
        return vec2(base_freq * height / width, base_freq);
    }

    return vec2(base_freq, base_freq);
}

float normalized_sine(float value) {
    return sin(value) * 0.5 + 0.5;
}

float periodic_value(float time, float value) {
    return normalized_sine((time - value) * TAU);
}

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
    vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i0 = floor(v + dot(v, vec3(C.y)));
    vec3 x0 = v - i0 + dot(i0, vec3(C.x));

    vec3 step1 = step(vec3(x0.y, x0.z, x0.x), x0);
    vec3 l = vec3(1.0) - step1;
    vec3 i1 = min(step1, vec3(l.z, l.x, l.y));
    vec3 i2 = max(step1, vec3(l.z, l.x, l.y));

    vec3 x1 = x0 - i1 + vec3(C.x);
    vec3 x2 = x0 - i2 + vec3(C.y);
    vec3 x3 = x0 - vec3(D.y);

    vec3 i = mod289_vec3(i0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.14285714285714285;
    vec3 ns = n_ * vec3(D.w, D.y, D.z) - vec3(D.x, D.z, D.x);

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

float compute_noise_value(
    uvec2 coord,
    float width,
    float height,
    vec2 freq,
    float time,
    float speed,
    uint channel
) {
    float width_safe = max(width, 1.0);
    float height_safe = max(height, 1.0);
    float freq_x = max(freq.y, 1.0);
    float freq_y = max(freq.x, 1.0);

    vec2 uv = vec2(
        (float(coord.x) / width_safe) * freq_x,
        (float(coord.y) / height_safe) * freq_y
    );

    float angle = time * TAU;
    float z_base = cos(angle) * speed;
    float channel_offset = float(channel) * 37.0;
    float seed_offset = float(seed) * 73.0;
    vec3 base_seed = vec3(
        17.0 + channel_offset + seed_offset,
        29.0 + channel_offset * 1.3 + seed_offset * 1.1,
        47.0 + channel_offset * 1.7 + seed_offset * 0.7
    );

    float base_noise = simplex_noise(vec3(
        uv.x + base_seed.x,
        uv.y + base_seed.y,
        z_base + base_seed.z
    ));

    float value = clamp(base_noise * 0.5 + 0.5, 0.0, 1.0);

    if (speed != 0.0 && time != 0.0) {
        vec3 time_seed = vec3(
            base_seed.x + 54.0,
            base_seed.y + 82.0,
            base_seed.z + 124.0
        );
        float time_noise = simplex_noise(vec3(
            uv.x + time_seed.x,
            uv.y + time_seed.y,
            time_seed.z
        ));
        float time_value = clamp(time_noise * 0.5 + 0.5, 0.0, 1.0);
        float scaled_time = periodic_value(time, time_value) * speed;
        value = clamp01(periodic_value(scaled_time, value));
    }

    return clamp01(value);
}

float singularity_mask(vec2 uv, float width, float height) {
    if (width <= 0.0 || height <= 0.0) {
        return 0.0;
    }

    vec2 delta = abs(uv - vec2(0.5, 0.5));
    float aspect = width / height;
    vec2 scaled = vec2(delta.x * aspect, delta.y);
    float max_radius = length(vec2(aspect * 0.5, 0.5));
    if (max_radius <= 0.0) {
        return 0.0;
    }

    float normalized = clamp(length(scaled) / max_radius, 0.0, 1.0);
    float masked = sqrt(normalized);
    return pow(masked, 5.0);
}

vec4 sample_bilinear(vec2 pos, float width, float height) {
    float width_f = max(width, 1.0);
    float height_f = max(height, 1.0);

    float wrapped_x = wrap_float(pos.x, width_f);
    float wrapped_y = wrap_float(pos.y, height_f);

    int x0 = int(floor(wrapped_x));
    int y0 = int(floor(wrapped_y));

    int width_i = int(max(width, 1.0));
    int height_i = int(max(height, 1.0));

    if (x0 < 0) {
        x0 = 0;
    } else if (x0 >= width_i) {
        x0 = width_i - 1;
    }

    if (y0 < 0) {
        y0 = 0;
    } else if (y0 >= height_i) {
        y0 = height_i - 1;
    }

    int x1 = wrap_index(x0 + 1, width_i);
    int y1 = wrap_index(y0 + 1, height_i);

    float fx = clamp(wrapped_x - float(x0), 0.0, 1.0);
    float fy = clamp(wrapped_y - float(y0), 0.0, 1.0);

    vec4 tex00 = texelFetch(inputTex, ivec2(x0, y0), 0);
    vec4 tex10 = texelFetch(inputTex, ivec2(x1, y0), 0);
    vec4 tex01 = texelFetch(inputTex, ivec2(x0, y1), 0);
    vec4 tex11 = texelFetch(inputTex, ivec2(x1, y1), 0);

    vec4 mix_x0 = mix(tex00, tex10, vec4(fx));
    vec4 mix_x1 = mix(tex01, tex11, vec4(fx));
    return mix(mix_x0, mix_x1, vec4(fy));
}

float warped_channel_value(
    uint channel,
    uvec2 coord,
    vec2 base_pos,
    float width,
    float height,
    vec2 freq,
    float displacement,
    float mask,
    float time,
    float speed
) {
    float noise_value = compute_noise_value(coord, width, height, freq, time, speed, channel);
    float centered = (noise_value * 2.0 - 1.0) * mask;
    float angle = centered * TAU;
    vec2 offset = vec2(cos(angle), sin(angle)) * displacement * vec2(resolution.x, resolution.y);

    // Rotate offset by direction
    float dirRad = direction * TAU / 360.0;
    float dc = cos(dirRad);
    float ds = sin(dirRad);
    offset = vec2(offset.x * dc - offset.y * ds, offset.x * ds + offset.y * dc);
    
    vec2 sample_pos = base_pos + offset;
    vec4 sampled = sample_bilinear(sample_pos, resolution.x, resolution.y);
    
    if (channel == 0u) return sampled.r;
    if (channel == 1u) return sampled.g;
    if (channel == 2u) return sampled.b;
    return sampled.a;
}

void main() {
    uvec3 global_id = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), 0u);

    uint width = as_u32(resolution.x);
    uint height = as_u32(resolution.y);
    if (global_id.x >= width || global_id.y >= height) {
        return;
    }

    vec2 coords = vec2(int(global_id.x), int(global_id.y));
    vec4 original = texelFetch(inputTex, ivec2(coords), 0);

    if (displacement == 0.0) {
        fragColor = original;
        return;
    }

    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float width_f = fullRes.x;
    float height_f = fullRes.y;
    vec2 uv = (vec2(float(global_id.x) + tileOffset.x, float(global_id.y) + tileOffset.y) + vec2(0.5, 0.5))
        / vec2(max(width_f, 1.0), max(height_f, 1.0));
    float mask = singularity_mask(uv, width_f, height_f);
    if (mask <= 0.0) {
        fragColor = original;
        return;
    }

    float renderScale = fullResolution.x > 0.0 ? fullResolution.x / max(resolution.x, 1.0) : 1.0;
    bool isTiling = renderScale > 1.01;
    float maxOffsetPixels = isTiling ? 256.0 : max(resolution.x, resolution.y);
    float maxAllowedDisplacement = maxOffsetPixels / max(resolution.x, 1.0);
    float clampedDisplacement = min(displacement, maxAllowedDisplacement);

    vec2 freq = freq_for_shape(2.0, width_f, height_f);
    vec2 base_pos = vec2(float(global_id.x), float(global_id.y));
    vec2 globalCoordVec = vec2(float(global_id.x), float(global_id.y)) + tileOffset;
    uvec2 coord = uvec2(globalCoordVec);

    float red = warped_channel_value(
        0u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        clampedDisplacement,
        mask,
        time,
        speed
    );
    float green = warped_channel_value(
        1u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        clampedDisplacement,
        mask,
        time,
        speed
    );
    float blue = warped_channel_value(
        2u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        clampedDisplacement,
        mask,
        time,
        speed
    );
    float alpha = clamp01(original.w);

    fragColor = vec4(red, green, blue, alpha);
}`,wgsl:`// Degauss: simulate a CRT-style degaussing wobble by lens-warping
// each color channel independently. Based on the Python
// implementation in effects.degauss(), which repeatedly invokes
// lens_warp() with simplex noise-derived displacements.

const TAU : f32 = 6.28318530717958647692;

struct DegaussParams {
    dims0 : vec4<f32>, // (width, height, displacement, time)
    dims1 : vec4<f32>, // (speed, seed, direction, _pad)
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> params : DegaussParams;

fn as_u32(value : f32) -> u32 {
    return u32(max(value, 0.0));
}

fn clamp01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn wrap_index(value : i32, limit : i32) -> i32 {
    if (limit <= 0) {
        return 0;
    }
    var wrapped : i32 = value % limit;
    if (wrapped < 0) {
        wrapped = wrapped + limit;
    }
    return wrapped;
}

fn wrap_float(value : f32, limit : f32) -> f32 {
    if (limit <= 0.0) {
        return 0.0;
    }
    var result : f32 = value - floor(value / limit) * limit;
    if (result < 0.0) {
        result = result + limit;
    }
    return result;
}

fn freq_for_shape(base_freq : f32, width : f32, height : f32) -> vec2<f32> {
    if (base_freq <= 0.0) {
        return vec2<f32>(1.0, 1.0);
    }

    if (abs(width - height) < 1e-5) {
        return vec2<f32>(base_freq, base_freq);
    }

    if (height < width && height > 0.0) {
        return vec2<f32>(base_freq, base_freq * width / height);
    }

    if (width > 0.0) {
        return vec2<f32>(base_freq * height / width, base_freq);
    }

    return vec2<f32>(base_freq, base_freq);
}

fn normalized_sine(value : f32) -> f32 {
    return sin(value) * 0.5 + 0.5;
}

fn periodic_value(time : f32, value : f32) -> f32 {
    return normalized_sine((time - value) * TAU);
}

fn mod289_vec3(x : vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_vec4(x : vec4<f32>) -> vec4<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x : vec4<f32>) -> vec4<f32> {
    return mod289_vec4(((x * 34.0) + 1.0) * x);
}

fn taylor_inv_sqrt(r : vec4<f32>) -> vec4<f32> {
    return 1.79284291400159 - 0.85373472095314 * r;
}

fn simplex_noise(v : vec3<f32>) -> f32 {
    let C : vec2<f32> = vec2<f32>(1.0 / 6.0, 1.0 / 3.0);
    let D : vec4<f32> = vec4<f32>(0.0, 0.5, 1.0, 2.0);

    let i0 : vec3<f32> = floor(v + dot(v, vec3<f32>(C.y)));
    let x0 : vec3<f32> = v - i0 + dot(i0, vec3<f32>(C.x));

    let step1 : vec3<f32> = step(vec3<f32>(x0.y, x0.z, x0.x), x0);
    let l : vec3<f32> = vec3<f32>(1.0) - step1;
    let i1 : vec3<f32> = min(step1, vec3<f32>(l.z, l.x, l.y));
    let i2 : vec3<f32> = max(step1, vec3<f32>(l.z, l.x, l.y));

    let x1 : vec3<f32> = x0 - i1 + vec3<f32>(C.x);
    let x2 : vec3<f32> = x0 - i2 + vec3<f32>(C.y);
    let x3 : vec3<f32> = x0 - vec3<f32>(D.y);

    let i = mod289_vec3(i0);
    let p = permute(permute(permute(
        i.z + vec4<f32>(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4<f32>(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4<f32>(0.0, i1.x, i2.x, 1.0));

    let n_ : f32 = 0.14285714285714285;
    let ns : vec3<f32> = n_ * vec3<f32>(D.w, D.y, D.z) - vec3<f32>(D.x, D.z, D.x);

    let j : vec4<f32> = p - 49.0 * floor(p * ns.z * ns.z);
    let x_ : vec4<f32> = floor(j * ns.z);
    let y_ : vec4<f32> = floor(j - 7.0 * x_);

    let x = x_ * ns.x + ns.y;
    let y = y_ * ns.x + ns.y;
    let h = 1.0 - abs(x) - abs(y);

    let b0 : vec4<f32> = vec4<f32>(x.x, x.y, y.x, y.y);
    let b1 : vec4<f32> = vec4<f32>(x.z, x.w, y.z, y.w);

    let s0 : vec4<f32> = floor(b0) * 2.0 + 1.0;
    let s1 : vec4<f32> = floor(b1) * 2.0 + 1.0;
    let sh : vec4<f32> = -step(h, vec4<f32>(0.0));

    let a0 : vec4<f32> = vec4<f32>(b0.x, b0.z, b0.y, b0.w)
        + vec4<f32>(s0.x, s0.z, s0.y, s0.w) * vec4<f32>(sh.x, sh.x, sh.y, sh.y);
    let a1 : vec4<f32> = vec4<f32>(b1.x, b1.z, b1.y, b1.w)
        + vec4<f32>(s1.x, s1.z, s1.y, s1.w) * vec4<f32>(sh.z, sh.z, sh.w, sh.w);

    let g0 : vec3<f32> = vec3<f32>(a0.x, a0.y, h.x);
    let g1 : vec3<f32> = vec3<f32>(a0.z, a0.w, h.y);
    let g2 : vec3<f32> = vec3<f32>(a1.x, a1.y, h.z);
    let g3 : vec3<f32> = vec3<f32>(a1.z, a1.w, h.w);

    let norm : vec4<f32> = taylor_inv_sqrt(vec4<f32>(
        dot(g0, g0),
        dot(g1, g1),
        dot(g2, g2),
        dot(g3, g3)
    ));

    let g0n : vec3<f32> = g0 * norm.x;
    let g1n : vec3<f32> = g1 * norm.y;
    let g2n : vec3<f32> = g2 * norm.z;
    let g3n : vec3<f32> = g3 * norm.w;

    let m0 : f32 = max(0.6 - dot(x0, x0), 0.0);
    let m1 : f32 = max(0.6 - dot(x1, x1), 0.0);
    let m2 : f32 = max(0.6 - dot(x2, x2), 0.0);
    let m3 : f32 = max(0.6 - dot(x3, x3), 0.0);

    let m0sq : f32 = m0 * m0;
    let m1sq : f32 = m1 * m1;
    let m2sq : f32 = m2 * m2;
    let m3sq : f32 = m3 * m3;

    return 42.0 * (
        m0sq * m0sq * dot(g0n, x0)
        + m1sq * m1sq * dot(g1n, x1)
        + m2sq * m2sq * dot(g2n, x2)
        + m3sq * m3sq * dot(g3n, x3)
    );
}

fn compute_noise_value(
    coord : vec2<u32>,
    width : f32,
    height : f32,
    freq : vec2<f32>,
    time : f32,
    speed : f32,
    channel : u32,
) -> f32 {
    let width_safe : f32 = max(width, 1.0);
    let height_safe : f32 = max(height, 1.0);
    let freq_x : f32 = max(freq.y, 1.0);
    let freq_y : f32 = max(freq.x, 1.0);

    let uv : vec2<f32> = vec2<f32>(
        (f32(coord.x) / width_safe) * freq_x,
        (f32(coord.y) / height_safe) * freq_y
    );

    let angle : f32 = time * TAU;
    let z_base : f32 = cos(angle) * speed;
    let channel_offset : f32 = f32(channel) * 37.0;
    let seed_offset : f32 = f32(i32(params.dims1.y)) * 73.0;
    let base_seed : vec3<f32> = vec3<f32>(
        17.0 + channel_offset + seed_offset,
        29.0 + channel_offset * 1.3 + seed_offset * 1.1,
        47.0 + channel_offset * 1.7 + seed_offset * 0.7
    );

    let base_noise : f32 = simplex_noise(vec3<f32>(
        uv.x + base_seed.x,
        uv.y + base_seed.y,
        z_base + base_seed.z
    ));

    var value : f32 = clamp(base_noise * 0.5 + 0.5, 0.0, 1.0);

    if (speed != 0.0 && time != 0.0) {
        let time_seed : vec3<f32> = vec3<f32>(
            base_seed.x + 54.0,
            base_seed.y + 82.0,
            base_seed.z + 124.0
        );
        let time_noise : f32 = simplex_noise(vec3<f32>(
            uv.x + time_seed.x,
            uv.y + time_seed.y,
            time_seed.z
        ));
        let time_value : f32 = clamp(time_noise * 0.5 + 0.5, 0.0, 1.0);
        let scaled_time : f32 = periodic_value(time, time_value) * speed;
        value = clamp01(periodic_value(scaled_time, value));
    }

    return clamp01(value);
}

fn singularity_mask(uv : vec2<f32>, width : f32, height : f32) -> f32 {
    if (width <= 0.0 || height <= 0.0) {
        return 0.0;
    }

    let delta : vec2<f32> = abs(uv - vec2<f32>(0.5, 0.5));
    let aspect : f32 = width / height;
    let scaled : vec2<f32> = vec2<f32>(delta.x * aspect, delta.y);
    let max_radius : f32 = length(vec2<f32>(aspect * 0.5, 0.5));
    if (max_radius <= 0.0) {
        return 0.0;
    }

    let normalized : f32 = clamp(length(scaled) / max_radius, 0.0, 1.0);
    let masked : f32 = sqrt(normalized);
    return pow(masked, 5.0);
}

fn sample_bilinear(pos : vec2<f32>, width : f32, height : f32) -> vec4<f32> {
    let width_f : f32 = max(width, 1.0);
    let height_f : f32 = max(height, 1.0);

    let wrapped_x : f32 = wrap_float(pos.x, width_f);
    let wrapped_y : f32 = wrap_float(pos.y, height_f);

    var x0 : i32 = i32(floor(wrapped_x));
    var y0 : i32 = i32(floor(wrapped_y));

    let width_i : i32 = i32(max(width, 1.0));
    let height_i : i32 = i32(max(height, 1.0));

    if (x0 < 0) {
        x0 = 0;
    } else if (x0 >= width_i) {
        x0 = width_i - 1;
    }

    if (y0 < 0) {
        y0 = 0;
    } else if (y0 >= height_i) {
        y0 = height_i - 1;
    }

    let x1 : i32 = wrap_index(x0 + 1, width_i);
    let y1 : i32 = wrap_index(y0 + 1, height_i);

    let fx : f32 = clamp(wrapped_x - f32(x0), 0.0, 1.0);
    let fy : f32 = clamp(wrapped_y - f32(y0), 0.0, 1.0);

    let tex00 : vec4<f32> = textureLoad(inputTex, vec2<i32>(x0, y0), 0);
    let tex10 : vec4<f32> = textureLoad(inputTex, vec2<i32>(x1, y0), 0);
    let tex01 : vec4<f32> = textureLoad(inputTex, vec2<i32>(x0, y1), 0);
    let tex11 : vec4<f32> = textureLoad(inputTex, vec2<i32>(x1, y1), 0);

    let mix_x0 : vec4<f32> = mix(tex00, tex10, vec4<f32>(fx));
    let mix_x1 : vec4<f32> = mix(tex01, tex11, vec4<f32>(fx));
    return mix(mix_x0, mix_x1, vec4<f32>(fy));
}

fn warped_channel_value(
    channel : u32,
    coord : vec2<u32>,
    base_pos : vec2<f32>,
    width : f32,
    height : f32,
    freq : vec2<f32>,
    displacement : f32,
    mask : f32,
    time : f32,
    speed : f32,
) -> f32 {
    let noise_value : f32 = compute_noise_value(coord, width, height, freq, time, speed, channel);
    let centered : f32 = (noise_value * 2.0 - 1.0) * mask;
    let angle : f32 = centered * TAU;
    var offset : vec2<f32> = vec2<f32>(cos(angle), sin(angle)) * displacement * vec2<f32>(width, height);

    // Rotate offset by direction
    let dirRad : f32 = params.dims1.z * TAU / 360.0;
    let dc : f32 = cos(dirRad);
    let ds : f32 = sin(dirRad);
    offset = vec2<f32>(offset.x * dc - offset.y * ds, offset.x * ds + offset.y * dc);
    let sample : vec4<f32> = sample_bilinear(base_pos + offset, width, height);

    switch channel {
        case 0u: {
            return clamp01(sample.x);
        }
        case 1u: {
            return clamp01(sample.y);
        }
        default: {
            return clamp01(sample.z);
        }
    }
}

fn store_pixel(base_index : u32, value : vec4<f32>) {
    output_buffer[base_index + 0u] = value.x;
    output_buffer[base_index + 1u] = value.y;
    output_buffer[base_index + 2u] = value.z;
    output_buffer[base_index + 3u] = value.w;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let width : u32 = as_u32(params.dims0.x);
    let height : u32 = as_u32(params.dims0.y);
    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let pixel_index : u32 = gid.y * width + gid.x;
    let base_index : u32 = pixel_index * 4u;
    let coords : vec2<i32> = vec2<i32>(i32(gid.x), i32(gid.y));
    let original : vec4<f32> = textureLoad(inputTex, coords, 0);

    let displacement : f32 = params.dims0.z;
    if (displacement == 0.0) {
        store_pixel(base_index, original);
        return;
    }

    let width_f : f32 = params.dims0.x;
    let height_f : f32 = params.dims0.y;
    let uv : vec2<f32> = (vec2<f32>(f32(gid.x), f32(gid.y)) + vec2<f32>(0.5, 0.5))
        / vec2<f32>(max(width_f, 1.0), max(height_f, 1.0));
    let mask : f32 = singularity_mask(uv, width_f, height_f);
    if (mask <= 0.0) {
        store_pixel(base_index, original);
        return;
    }

    let freq : vec2<f32> = freq_for_shape(2.0, width_f, height_f);
    let base_pos : vec2<f32> = vec2<f32>(f32(gid.x), f32(gid.y));
    let coord : vec2<u32> = gid.xy;

    let time : f32 = params.dims0.w;
    let speed : f32 = params.dims1.x;

    let red : f32 = warped_channel_value(
        0u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        displacement,
        mask,
        time,
        speed,
    );
    let green : f32 = warped_channel_value(
        1u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        displacement,
        mask,
        time,
        speed,
    );
    let blue : f32 = warped_channel_value(
        2u,
        coord,
        base_pos,
        width_f,
        height_f,
        freq,
        displacement,
        mask,
        time,
        speed,
    );
    let alpha : f32 = clamp01(original.w);

    store_pixel(base_index, vec4<f32>(red, green, blue, alpha));
}
`}},s=`# degauss

CRT degauss effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| displacement | float | 0.0625 | 0-0.25 | Displacement amount |
| direction | float | 0 | -180-180 | Displacement direction |
| seed | int | 1 | 1-100 | Random seed |
| speed | float | 1.0 | 0-2 | Animation speed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .degauss()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(a))n.shaders[i]={...e}}n&&s&&(n.help=s);var c="filter/degauss",d="filter",u="degauss",m=n;export{m as default,c as effectId,u as effectName,s as help,d as namespace};
