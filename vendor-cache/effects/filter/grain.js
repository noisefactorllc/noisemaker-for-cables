/* filter/grain */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var l=new n({name:"Grain",namespace:"filter",func:"grain",tags:["noise"],description:"Film grain overlay",globals:{alpha:{type:"float",default:.25,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},pause:{type:"boolean",default:!1,uniform:"pause",ui:{label:"pause",control:"checkbox"}}},passes:[{name:"main",program:"grain",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha",pause:"pause"},outputs:{fragColor:"outputTex"}}]});var a={grain:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Grain: blend the source image with animated value noise.
// Mirrors noisemaker.effects.grain, which calls value.values()
// using simplex-based value noise with bicubic interpolation.

const float PI = 3.14159265358979323846;
const float TAU = 6.28318530717958647692;
const float UINT32_TO_FLOAT = 1.0 / 4294967296.0;
const uint CHANNEL_COUNT = 4u;
const uint INTERPOLATION_CONSTANT = 0u;
const uint INTERPOLATION_LINEAR = 1u;
const uint INTERPOLATION_COSINE = 2u;
const uint INTERPOLATION_BICUBIC = 3u;
const uint BASE_SEED = 0x1234u;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float alpha;
uniform float time;
uniform float pause;

out vec4 fragColor;

uint as_u32(float value) {
    return uint(max(round(value), 0.0));
}

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

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

float random_from_cell_3d(ivec3 cell, uint seed) {
    uvec3 hashed = uvec3(
        uint(cell.x) ^ seed,
        uint(cell.y) ^ (seed * 0x9e3779b9u + 0x7f4a7c15u),
        uint(cell.z) ^ (seed * 0x632be59bu + 0x5bf03635u)
    );
    uvec3 noise = pcg3d(hashed);
    return float(noise.x) * UINT32_TO_FLOAT;
}

float periodic_value(float time_value, float sample_val) {
    return (sin((time_value - sample_val) * TAU) + 1.0) * 0.5;
}

float interpolation_weight(float value, uint spline_order) {
    if (spline_order == INTERPOLATION_COSINE) {
        float clamped = clamp(value, 0.0, 1.0);
        float angle = clamped * PI;
        float cos_value = cos(angle);
        return (1.0 - cos_value) * 0.5;
    }
    return value;
}

float blend_cubic(float a, float b, float c, float d, float g) {
    float t = clamp(g, 0.0, 1.0);
    float t2 = t * t;
    float a0 = ((d - c) - a) + b;
    float a1 = (a - b) - a0;
    float a2 = c - a;
    float a3 = b;
    float term1 = (a0 * t) * t2;
    float term2 = a1 * t2;
    float term3 = (a2 * t) + a3;
    return (term1 + term2) + term3;
}

float sample_bicubic_layer(
    ivec2 cell,
    vec2 frac,
    int z_cell,
    uint base_seed
) {
    float row0 = blend_cubic(
        random_from_cell_3d(ivec3(cell.x - 1, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 0, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 1, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 2, cell.y - 1, z_cell), base_seed),
        frac.x
    );
    float row1 = blend_cubic(
        random_from_cell_3d(ivec3(cell.x - 1, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 0, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 1, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 2, cell.y + 0, z_cell), base_seed),
        frac.x
    );
    float row2 = blend_cubic(
        random_from_cell_3d(ivec3(cell.x - 1, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 0, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 1, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 2, cell.y + 1, z_cell), base_seed),
        frac.x
    );
    float row3 = blend_cubic(
        random_from_cell_3d(ivec3(cell.x - 1, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 0, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 1, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(ivec3(cell.x + 2, cell.y + 2, z_cell), base_seed),
        frac.x
    );
    return blend_cubic(row0, row1, row2, row3, frac.y);
}

float sample_raw_value_noise(
    vec2 uv,
    vec2 freq,
    uint base_seed,
    float time_value,
    float speed_value,
    uint spline_order
) {
    vec2 scaled_freq = max(freq, vec2(1.0, 1.0));
    vec2 scaled_uv = uv * scaled_freq;
    vec2 cell_f = floor(scaled_uv);
    ivec2 cell = ivec2(int(cell_f.x), int(cell_f.y));
    vec2 frac = fract(scaled_uv);
    float angle = time_value * TAU;
    float time_coord = cos(angle) * speed_value;
    float time_floor = floor(time_coord);
    int time_cell = int(time_floor);
    float time_frac = fract(time_coord);

    if (spline_order == INTERPOLATION_CONSTANT) {
        return random_from_cell_3d(ivec3(cell.x, cell.y, time_cell), base_seed);
    }

    if (spline_order == INTERPOLATION_LINEAR) {
        float tl = random_from_cell_3d(ivec3(cell.x, cell.y, time_cell), base_seed);
        float tr = random_from_cell_3d(ivec3(cell.x + 1, cell.y, time_cell), base_seed);
        float bl = random_from_cell_3d(ivec3(cell.x, cell.y + 1, time_cell), base_seed);
        float br = random_from_cell_3d(ivec3(cell.x + 1, cell.y + 1, time_cell), base_seed);
        float weight_x = interpolation_weight(frac.x, spline_order);
        float top = mix(tl, tr, weight_x);
        float bottom = mix(bl, br, weight_x);
        float weight_y = interpolation_weight(frac.y, spline_order);
        return mix(top, bottom, weight_y);
    }

    if (spline_order == INTERPOLATION_COSINE) {
        float weight_x = interpolation_weight(frac.x, spline_order);
        float weight_y = interpolation_weight(frac.y, spline_order);
        float tl = random_from_cell_3d(ivec3(cell.x, cell.y, time_cell), base_seed);
        float tr = random_from_cell_3d(ivec3(cell.x + 1, cell.y, time_cell), base_seed);
        float bl = random_from_cell_3d(ivec3(cell.x, cell.y + 1, time_cell), base_seed);
        float br = random_from_cell_3d(ivec3(cell.x + 1, cell.y + 1, time_cell), base_seed);
        float top = mix(tl, tr, weight_x);
        float bottom = mix(bl, br, weight_x);
        return mix(top, bottom, weight_y);
    }

    float slice0 = sample_bicubic_layer(cell, frac, time_cell - 1, base_seed);
    float slice1 = sample_bicubic_layer(cell, frac, time_cell + 0, base_seed);
    float slice2 = sample_bicubic_layer(cell, frac, time_cell + 1, base_seed);
    float slice3 = sample_bicubic_layer(cell, frac, time_cell + 2, base_seed);
    return blend_cubic(slice0, slice1, slice2, slice3, time_frac);
}

float sample_value_noise(
    vec2 uv,
    vec2 freq,
    uint seed,
    float time_value,
    float speed_value,
    uint spline_order
) {
    uint base_seed = seed;
    float base_value = sample_raw_value_noise(
        uv,
        freq,
        base_seed,
        time_value,
        speed_value,
        spline_order
    );

    if (speed_value == 0.0 || time_value == 0.0) {
        return base_value;
    }

    uint time_seed = base_seed + 0x9e3779b1u;
    float time_field = sample_raw_value_noise(
        uv,
        freq,
        time_seed,
        0.0,
        1.0,
        spline_order
    );
    float scaled_time = periodic_value(time_value, time_field) * speed_value;
    return periodic_value(scaled_time, base_value);
}

float sample_grain_noise(
    uvec2 pixel_coords,
    vec2 dims,
    float time_value,
    float speed_value
) {
    float width = max(dims.x, 1.0);
    float height = max(dims.y, 1.0);
    vec2 uv = vec2(float(pixel_coords.x) / width, float(pixel_coords.y) / height);
    vec2 freq = vec2(width, height);
    return sample_value_noise(uv, freq, BASE_SEED, time_value, speed_value, INTERPOLATION_BICUBIC);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    uvec3 global_id = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), 0u);

    vec2 res = fullResolution.x > 0.0 ? fullResolution : resolution;
    uint u_width = max(as_u32(res.x), 1u);
    uint u_height = max(as_u32(res.y), 1u);
    uvec2 global_pixel = uvec2(uint(gl_FragCoord.x + tileOffset.x), uint(gl_FragCoord.y + tileOffset.y));
    if (global_pixel.x >= u_width || global_pixel.y >= u_height) {
        return;
    }

    ivec2 coords = ivec2(int(global_id.x), int(global_id.y));
    vec4 texel = texelFetch(inputTex, coords, 0);

    float blend_alpha = clamp(alpha, 0.0, 1.0);
    if (blend_alpha <= 0.0) {
        fragColor = texel;
        return;
    }

    float effective_time = pause > 0.5 ? 0.0 : time;

    float rs = max(renderScale, 1.0);
    float noise_value = sample_grain_noise(
        global_pixel,
        vec2(float(u_width) / rs, float(u_height) / rs),
        effective_time,
        100.0
    );
    vec3 noise_rgb = vec3(noise_value);
    vec3 mixed_rgb = mix(texel.rgb, noise_rgb, blend_alpha);
    fragColor = vec4(
        clamp01(mixed_rgb.x),
        clamp01(mixed_rgb.y),
        clamp01(mixed_rgb.z),
        texel.a
    );
}
`,wgsl:`// Grain: blend the source image with animated value noise.
// Mirrors noisemaker.effects.grain, which calls value.values()
// using simplex-based value noise with bicubic interpolation.

const PI : f32 = 3.14159265358979323846;
const TAU : f32 = 6.28318530717958647692;
const UINT32_TO_FLOAT : f32 = 1.0 / 4294967296.0;
const CHANNEL_COUNT : u32 = 4u;
const INTERPOLATION_CONSTANT : u32 = 0u;
const INTERPOLATION_LINEAR : u32 = 1u;
const INTERPOLATION_COSINE : u32 = 2u;
const INTERPOLATION_BICUBIC : u32 = 3u;
const BASE_SEED : u32 = 0x1234u;

struct GrainParams {
    width : f32,
    height : f32,
    channels : f32,
    alpha : f32,
    time : f32,
    pause : f32,
    renderScale : f32,
    _pad0 : f32,
    tileOffset : vec2<f32>,
    fullResolution : vec2<f32>,
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> params : GrainParams;

fn as_u32(value : f32) -> u32 {
    return u32(max(round(value), 0.0));
}

fn clamp01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn pcg3d(v_in : vec3<u32>) -> vec3<u32> {
    var v : vec3<u32> = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn random_from_cell_3d(cell : vec3<i32>, seed : u32) -> f32 {
    let hashed : vec3<u32> = vec3<u32>(
        bitcast<u32>(cell.x) ^ seed,
        bitcast<u32>(cell.y) ^ (seed * 0x9e3779b9u + 0x7f4a7c15u),
        bitcast<u32>(cell.z) ^ (seed * 0x632be59bu + 0x5bf03635u),
    );
    let noise : vec3<u32> = pcg3d(hashed);
    return f32(noise.x) * UINT32_TO_FLOAT;
}

fn periodic_value(time_value : f32, sample : f32) -> f32 {
    return (sin((time_value - sample) * TAU) + 1.0) * 0.5;
}

fn interpolation_weight(value : f32, spline_order : u32) -> f32 {
    if (spline_order == INTERPOLATION_COSINE) {
        let clamped : f32 = clamp(value, 0.0, 1.0);
        let angle : f32 = clamped * PI;
        let cos_value : f32 = cos(angle);
        return (1.0 - cos_value) * 0.5;
    }
    return value;
}

fn blend_cubic(a : f32, b : f32, c : f32, d : f32, g : f32) -> f32 {
    let t : f32 = clamp(g, 0.0, 1.0);
    let t2 : f32 = t * t;
    let a0 : f32 = ((d - c) - a) + b;
    let a1 : f32 = (a - b) - a0;
    let a2 : f32 = c - a;
    let a3 : f32 = b;
    let term1 : f32 = (a0 * t) * t2;
    let term2 : f32 = a1 * t2;
    let term3 : f32 = (a2 * t) + a3;
    return (term1 + term2) + term3;
}

fn sample_bicubic_layer(
    cell : vec2<i32>,
    frac : vec2<f32>,
    z_cell : i32,
    base_seed : u32,
) -> f32 {
    let row0 : f32 = blend_cubic(
        random_from_cell_3d(vec3<i32>(cell.x - 1, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 0, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y - 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 2, cell.y - 1, z_cell), base_seed),
        frac.x,
    );
    let row1 : f32 = blend_cubic(
        random_from_cell_3d(vec3<i32>(cell.x - 1, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 0, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y + 0, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 2, cell.y + 0, z_cell), base_seed),
        frac.x,
    );
    let row2 : f32 = blend_cubic(
        random_from_cell_3d(vec3<i32>(cell.x - 1, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 0, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y + 1, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 2, cell.y + 1, z_cell), base_seed),
        frac.x,
    );
    let row3 : f32 = blend_cubic(
        random_from_cell_3d(vec3<i32>(cell.x - 1, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 0, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y + 2, z_cell), base_seed),
        random_from_cell_3d(vec3<i32>(cell.x + 2, cell.y + 2, z_cell), base_seed),
        frac.x,
    );
    return blend_cubic(row0, row1, row2, row3, frac.y);
}

fn sample_raw_value_noise(
    uv : vec2<f32>,
    freq : vec2<f32>,
    base_seed : u32,
    time_value : f32,
    speed_value : f32,
    spline_order : u32,
) -> f32 {
    let scaled_freq : vec2<f32> = max(freq, vec2<f32>(1.0, 1.0));
    let scaled_uv : vec2<f32> = uv * scaled_freq;
    let cell_f : vec2<f32> = floor(scaled_uv);
    let cell : vec2<i32> = vec2<i32>(i32(cell_f.x), i32(cell_f.y));
    let frac : vec2<f32> = fract(scaled_uv);
    let angle : f32 = time_value * TAU;
    let time_coord : f32 = cos(angle) * speed_value;
    let time_floor : f32 = floor(time_coord);
    let time_cell : i32 = i32(time_floor);
    let time_frac : f32 = fract(time_coord);

    if (spline_order == INTERPOLATION_CONSTANT) {
        return random_from_cell_3d(vec3<i32>(cell.x, cell.y, time_cell), base_seed);
    }

    if (spline_order == INTERPOLATION_LINEAR) {
        let tl : f32 = random_from_cell_3d(vec3<i32>(cell.x, cell.y, time_cell), base_seed);
        let tr : f32 = random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y, time_cell), base_seed);
        let bl : f32 = random_from_cell_3d(vec3<i32>(cell.x, cell.y + 1, time_cell), base_seed);
        let br : f32 = random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y + 1, time_cell), base_seed);
        let weight_x : f32 = interpolation_weight(frac.x, spline_order);
        let top : f32 = mix(tl, tr, weight_x);
        let bottom : f32 = mix(bl, br, weight_x);
        let weight_y : f32 = interpolation_weight(frac.y, spline_order);
        return mix(top, bottom, weight_y);
    }

    if (spline_order == INTERPOLATION_COSINE) {
        let weight_x : f32 = interpolation_weight(frac.x, spline_order);
        let weight_y : f32 = interpolation_weight(frac.y, spline_order);
        let tl : f32 = random_from_cell_3d(vec3<i32>(cell.x, cell.y, time_cell), base_seed);
        let tr : f32 = random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y, time_cell), base_seed);
        let bl : f32 = random_from_cell_3d(vec3<i32>(cell.x, cell.y + 1, time_cell), base_seed);
        let br : f32 = random_from_cell_3d(vec3<i32>(cell.x + 1, cell.y + 1, time_cell), base_seed);
        let top : f32 = mix(tl, tr, weight_x);
        let bottom : f32 = mix(bl, br, weight_x);
        return mix(top, bottom, weight_y);
    }

    let slice0 : f32 = sample_bicubic_layer(cell, frac, time_cell - 1, base_seed);
    let slice1 : f32 = sample_bicubic_layer(cell, frac, time_cell + 0, base_seed);
    let slice2 : f32 = sample_bicubic_layer(cell, frac, time_cell + 1, base_seed);
    let slice3 : f32 = sample_bicubic_layer(cell, frac, time_cell + 2, base_seed);
    return blend_cubic(slice0, slice1, slice2, slice3, time_frac);
}

fn sample_value_noise(
    uv : vec2<f32>,
    freq : vec2<f32>,
    seed : u32,
    time_value : f32,
    speed_value : f32,
    spline_order : u32,
) -> f32 {
    let base_seed : u32 = seed;
    let base_value : f32 = sample_raw_value_noise(
        uv,
        freq,
        base_seed,
        time_value,
        speed_value,
        spline_order,
    );

    if (speed_value == 0.0 || time_value == 0.0) {
        return base_value;
    }

    let time_seed : u32 = base_seed + 0x9e3779b1u;
    let time_field : f32 = sample_raw_value_noise(
        uv,
        freq,
        time_seed,
        0.0,
        1.0,
        spline_order,
    );
    let scaled_time : f32 = periodic_value(time_value, time_field) * speed_value;
    return periodic_value(scaled_time, base_value);
}

fn sample_grain_noise(
    pixel_coords : vec2<u32>,
    dims : vec2<f32>,
    time_value : f32,
    speed_value : f32,
) -> f32 {
    let width : f32 = max(dims.x, 1.0);
    let height : f32 = max(dims.y, 1.0);
    let uv : vec2<f32> = vec2<f32>(f32(pixel_coords.x) / width, f32(pixel_coords.y) / height);
    let freq : vec2<f32> = vec2<f32>(width, height);
    return sample_value_noise(uv, freq, BASE_SEED, time_value, speed_value, INTERPOLATION_BICUBIC);
}

fn write_pixel(base_index : u32, rgba : vec4<f32>) {
    output_buffer[base_index + 0u] = rgba.x;
    output_buffer[base_index + 1u] = rgba.y;
    output_buffer[base_index + 2u] = rgba.z;
    output_buffer[base_index + 3u] = rgba.w;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let width : u32 = max(as_u32(params.width), 1u);
    let height : u32 = max(as_u32(params.height), 1u);
    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let full_width : u32 = select(width, max(as_u32(params.fullResolution.x), 1u), params.fullResolution.x > 0.0);
    let full_height : u32 = select(height, max(as_u32(params.fullResolution.y), 1u), params.fullResolution.y > 0.0);
    let tile_offset : vec2<i32> = vec2<i32>(
        i32(round(params.tileOffset.x)),
        i32(round(params.tileOffset.y)),
    );
    let global_pixel_signed : vec2<i32> = vec2<i32>(gid.xy) + tile_offset;
    if (global_pixel_signed.x < 0 || global_pixel_signed.y < 0 ||
        global_pixel_signed.x >= i32(full_width) || global_pixel_signed.y >= i32(full_height)) {
        return;
    }
    let global_pixel : vec2<u32> = vec2<u32>(global_pixel_signed);

    let coords : vec2<i32> = vec2<i32>(i32(gid.x), i32(gid.y));
    let texel : vec4<f32> = textureLoad(inputTex, coords, 0);
    let pixel_index : u32 = gid.y * width + gid.x;
    let base_index : u32 = pixel_index * CHANNEL_COUNT;

    let blend_alpha : f32 = clamp(params.alpha, 0.0, 1.0);
    if (blend_alpha <= 0.0) {
        write_pixel(base_index, texel);
        return;
    }

    // When paused, use time=0 for static noise; otherwise use actual time
    let effective_time : f32 = select(params.time, 0.0, params.pause > 0.5);

    let rs : f32 = max(params.renderScale, 1.0);
    let noise_value : f32 = sample_grain_noise(
        global_pixel,
        vec2<f32>(f32(full_width), f32(full_height)) / rs,
        effective_time,
        100.0,
    );
    let noise_rgb : vec3<f32> = vec3<f32>(noise_value);
    let mixed_rgb : vec3<f32> = mix(texel.rgb, noise_rgb, blend_alpha);
    write_pixel(base_index, vec4<f32>(
        clamp01(mixed_rgb.x),
        clamp01(mixed_rgb.y),
        clamp01(mixed_rgb.z),
        texel.a,
    ));
}
`}},i=`# grain

Film grain overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 0.25 | 0-1 | Alpha |
| pause | bool | false | - | Pause |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .grain()
  .write(o0)

render(o0)
\`\`\`
`;if(l&&Object.keys(a).length>0){l.shaders||(l.shaders={});for(let[t,e]of Object.entries(a))l.shaders[t]={...e}}l&&i&&(l.help=i);var o="filter/grain",f="filter",u="grain",d=l;export{d as default,o as effectId,u as effectName,i as help,f as namespace};
