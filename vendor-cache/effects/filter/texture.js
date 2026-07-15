/* filter/texture */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Texture",namespace:"filter",func:"texture",tags:["noise"],description:"Procedural surface and material texture overlay",globals:{mode:{type:"int",default:3,define:"MODE",choices:{canvas:0,crosshatch:1,halftone:2,paper:3,stucco:4,regular:5,soft:6,sprinkles:7,clumped:8,contrasty:9,enlarged:10,stippled:11,horizontal:12,vertical:13,speckle:14},ui:{label:"mode",control:"dropdown"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},scale:{type:"float",default:1,uniform:"scale",min:.1,max:10,step:.1,randMax:4,ui:{label:"scale",control:"slider"}},intensity:{type:"float",default:40,uniform:"intensity",min:0,max:100,ui:{label:"intensity",control:"slider",enabledBy:{param:"mode",gt:4}}},contrast:{type:"float",default:50,uniform:"contrast",min:0,max:100,ui:{label:"contrast",control:"slider",enabledBy:{param:"mode",gt:4}}},mono:{type:"boolean",default:!0,uniform:"mono",ui:{label:"mono",control:"checkbox",enabledBy:{param:"mode",gt:4}}}},defaultProgram:`search filter, synth

solid(color: #d1d1d1)
  .texture(alpha: 0.75)
  .write(o0)`,passes:[{name:"main",program:"texture",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha",scale:"scale",intensity:"intensity",contrast:"contrast",mono:"mono"},outputs:{fragColor:"outputTex"}}]});var l={texture:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Texture effect: generate a height field from one of several texture modes,
// derive shading from the gradient, then blend back into the source pixels.
// Modes: 0=canvas, 1=crosshatch, 2=halftone, 3=paper, 4=stucco
//
// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`). Compile-time specialization matters here because
// height_field() is called 5 times per pixel (center + 4 neighbors for the
// gradient). With a runtime int dispatch, ANGLE inlines all 5 variant height
// functions at each call site \u2014 25 variant inlines per pixel. Baking MODE
// lets the compiler emit only the active variant (5 inlines of one function).
#ifndef MODE
#define MODE 3
#endif

uniform sampler2D inputTex;
uniform float time;
uniform float alpha;
uniform float scale;
uniform float intensity;
uniform float contrast;
uniform bool mono;
uniform vec2 tileOffset;
uniform vec2 fullResolution;

in vec2 v_texCoord;
out vec4 fragColor;

const float PI = 3.14159265359;
const float INV_UINT32_MAX = 1.0 / 4294967295.0;
const int Z_LOOP = 2;
const float SHADE_GAIN = 4.4;

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

float s_curve01(float value) {
    float c = clamp01(value);
    return c * c * (3.0 - 2.0 * c);
}

float fade(float t) {
    return t * t * (3.0 - 2.0 * t);
}

vec2 freq_for_shape(float base_freq, vec2 dims) {
    float w = max(dims.x, 1.0);
    float h = max(dims.y, 1.0);
    if (abs(w - h) < 0.5) {
        return vec2(base_freq, base_freq);
    }
    if (w > h) {
        return vec2(base_freq, base_freq * w / h);
    }
    return vec2(base_freq * h / w, base_freq);
}

uint hash_uint(uint x) {
    x ^= x >> 16u;
    x *= 0x7feb352du;
    x ^= x >> 15u;
    x *= 0x846ca68bu;
    x ^= x >> 16u;
    return x;
}

float fast_hash(ivec3 p, uint salt) {
    uint h = salt ^ 0x9e3779b9u;
    h ^= uint(p.x) * 0x27d4eb2du;
    h = hash_uint(h);
    h ^= uint(p.y) * 0xc2b2ae35u;
    h = hash_uint(h);
    h ^= uint(p.z) * 0x165667b1u;
    h = hash_uint(h);
    return float(h) * INV_UINT32_MAX;
}

float value_noise(vec2 uv, vec2 freq, float motion, uint salt) {
    vec2 scaled_uv = uv * max(freq, vec2(1.0, 1.0));
    vec2 cell_floor = floor(scaled_uv);
    vec2 frac_part = fract(scaled_uv);
    ivec2 base_cell = ivec2(cell_floor);

    float z_floor = floor(motion);
    float z_frac = fract(motion);
    int z0 = int(z_floor) % Z_LOOP;
    int z1 = (z0 + 1) % Z_LOOP;

    float c000 = fast_hash(ivec3(base_cell.x + 0, base_cell.y + 0, z0), salt);
    float c100 = fast_hash(ivec3(base_cell.x + 1, base_cell.y + 0, z0), salt);
    float c010 = fast_hash(ivec3(base_cell.x + 0, base_cell.y + 1, z0), salt);
    float c110 = fast_hash(ivec3(base_cell.x + 1, base_cell.y + 1, z0), salt);
    float c001 = fast_hash(ivec3(base_cell.x + 0, base_cell.y + 0, z1), salt);
    float c101 = fast_hash(ivec3(base_cell.x + 1, base_cell.y + 0, z1), salt);
    float c011 = fast_hash(ivec3(base_cell.x + 0, base_cell.y + 1, z1), salt);
    float c111 = fast_hash(ivec3(base_cell.x + 1, base_cell.y + 1, z1), salt);

    float tx = fade(frac_part.x);
    float ty = fade(frac_part.y);
    float tz = fade(z_frac);

    float x00 = mix(c000, c100, tx);
    float x10 = mix(c010, c110, tx);
    float x01 = mix(c001, c101, tx);
    float x11 = mix(c011, c111, tx);

    float y0 = mix(x00, x10, ty);
    float y1 = mix(x01, x11, ty);

    return mix(y0, y1, tz);
}

// Paper: 3-octave ridged noise (original texture)
float height_paper(vec2 uv, vec2 base_freq, float motion) {
    vec2 freq = max(base_freq, vec2(1.0, 1.0));
    float amplitude = 0.5;
    float accum = 0.0;
    float total = 0.0;

    for (int octave = 0; octave < 3; octave++) {
        uint salt = 0x9e3779b9u * uint(octave + 1);
        float samp = value_noise(uv, freq, motion + float(octave) * 0.37, salt);
        float ridged = 1.0 - abs(samp * 2.0 - 1.0);
        accum += ridged * amplitude;
        total += amplitude;
        freq *= 2.0;
        amplitude *= 0.55;
    }

    return total > 0.0 ? clamp01(accum / total) : clamp01(accum);
}

// Stucco: 2-octave smooth noise, lower frequency, rounder bumps
float height_stucco(vec2 uv, vec2 base_freq, float motion) {
    vec2 freq = max(base_freq, vec2(1.0, 1.0));
    float amplitude = 0.5;
    float accum = 0.0;
    float total = 0.0;

    for (int octave = 0; octave < 2; octave++) {
        uint salt = 0x9e3779b9u * uint(octave + 1);
        float samp = value_noise(uv, freq, motion + float(octave) * 0.37, salt);
        accum += samp * amplitude;
        total += amplitude;
        freq *= 2.0;
        amplitude *= 0.5;
    }

    return total > 0.0 ? clamp01(accum / total) : clamp01(accum);
}

// Canvas: woven fabric pattern with slight noise perturbation
float height_canvas(vec2 uv, vec2 base_freq, float motion) {
    vec2 st = uv * base_freq;
    float warpX = abs(sin(st.x * PI));
    float weftY = abs(sin(st.y * PI));
    float weave = warpX * weftY;

    // Add subtle noise irregularity
    float noise = value_noise(uv, base_freq * 0.5, motion, 0x12345678u);
    return clamp01(weave * 0.85 + noise * 0.15);
}

// Halftone: regular circular dot grid
float height_halftone(vec2 uv, vec2 base_freq) {
    vec2 st = uv * base_freq;
    vec2 cell = fract(st) - 0.5;
    float dot = 1.0 - clamp01(length(cell) * 3.0);
    return dot * dot;
}

// Crosshatch: two overlapping diagonal sine ridges
float height_crosshatch(vec2 uv, vec2 base_freq) {
    vec2 st = uv * base_freq;
    float d1 = abs(sin((st.x + st.y) * PI));
    float d2 = abs(sin((st.x - st.y) * PI));
    return clamp01(d1 * d2);
}

// Dispatch to the active mode's height function \u2014 single variant selected
// at compile time by the MODE define.
float height_field(vec2 uv, vec2 base_freq, float motion) {
#if MODE == 0
    return height_canvas(uv, base_freq, motion);
#elif MODE == 1
    return height_crosshatch(uv, base_freq);
#elif MODE == 2
    return height_halftone(uv, base_freq);
#elif MODE == 4
    return height_stucco(uv, base_freq, motion);
#else
    return height_paper(uv, base_freq, motion);  // 3 = paper (default)
#endif
}

uint material_hash(ivec2 p, uint salt, uint layer) {
    uint h = salt ^ (layer * 0x9e3779b9u);
    h ^= uint(p.x) * 0x27d4eb2du;
    h = hash_uint(h);
    h ^= uint(p.y) * 0xc2b2ae35u;
    return hash_uint(h);
}

vec2 material_gradient(ivec2 p, uint salt, uint layer) {
    uint h = material_hash(p, salt, layer);
    vec2 gradient = vec2(float(h & 0xffffu), float(h >> 16u)) * (2.0 / 65535.0) - 1.0;
    return gradient * inversesqrt(max(dot(gradient, gradient), 0.000001));
}

vec2 material_fade(vec2 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float material_gradient_layer(vec2 p, uint salt, uint layer) {
    ivec2 cell = ivec2(floor(p));
    vec2 local = fract(p);
    float n00 = dot(material_gradient(cell, salt, layer), local);
    float n10 = dot(material_gradient(cell + ivec2(1, 0), salt, layer), local - vec2(1.0, 0.0));
    float n01 = dot(material_gradient(cell + ivec2(0, 1), salt, layer), local - vec2(0.0, 1.0));
    float n11 = dot(material_gradient(cell + ivec2(1, 1), salt, layer), local - vec2(1.0, 1.0));
    vec2 blend = material_fade(local);
    return mix(mix(n00, n10, blend.x), mix(n01, n11, blend.x), blend.y);
}

float material_noise(vec2 globalPixel, vec2 cellSize, float motion, uint salt) {
    vec2 p = globalPixel / max(cellSize, vec2(0.5));
    float zFloor = floor(motion);
    int z0 = int(zFloor) % Z_LOOP;
    int z1 = (z0 + 1) % Z_LOOP;
    float n0 = material_gradient_layer(p, salt, uint(z0));
    float n1 = material_gradient_layer(p, salt, uint(z1));
    float n = mix(n0, n1, material_fade(vec2(fract(motion))).x);
    return clamp01(0.5 + n * 0.72);
}

float material_soft(vec2 globalPixel, float motion, uint salt, float size) {
    // Two incommensurate gradient fields make a smooth isotropic surface.
    // Quintic interpolation keeps enlarged cells continuous without exposing
    // the square lattice that value noise reveals at high scale.
    vec2 primaryCell = vec2(max(size * 3.25, 1.5));
    float primary = material_noise(globalPixel, primaryCell, motion, salt);
    float secondary = material_noise(globalPixel + vec2(17.31, 29.17), primaryCell * 1.87,
        motion + 0.41, salt ^ 0x68bc21ebu);
    return primary * 0.68 + secondary * 0.32;
}

float material_directional(vec2 globalPixel, float motion, uint salt, float size) {
    // Strongly anisotropic gradient fields create continuous fibers directly,
    // avoiding both a stretched square lattice and a costly multi-tap blur.
    vec2 primaryCell = vec2(max(size * 22.0, 8.0), max(size * 2.0, 1.25));
    vec2 secondaryCell = vec2(max(size * 37.0, 13.0), max(size * 3.7, 2.3));
    float primary = material_noise(globalPixel, primaryCell, motion, salt);
    float secondary = material_noise(globalPixel + vec2(19.37, 11.83), secondaryCell,
        motion + 0.41, salt ^ 0x68bc21ebu);
    return primary * 0.72 + secondary * 0.28;
}

float material_sprinkles(vec2 globalPixel, float motion, uint salt, float size) {
    vec2 p = globalPixel / max(4.0 * size, 1.0) + vec2(motion * 0.31, motion * 0.19);
    ivec2 baseCell = ivec2(floor(p));
    vec2 local = fract(p);
    float nearest = 10.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            ivec2 cell = baseCell + ivec2(x, y);
            float jx = fast_hash(ivec3(cell, 0), salt) - 0.5;
            float jy = fast_hash(ivec3(cell, 1), salt ^ 0x68bc21ebu) - 0.5;
            vec2 point = vec2(float(x), float(y)) + 0.5 + vec2(jx, jy) * 0.6;
            nearest = min(nearest, length(local - point));
        }
    }
    return mix(0.45, 1.0, 1.0 - smoothstep(0.10, 0.22, nearest));
}

float material_edge_mask(vec2 uv, vec2 pixelStep) {
    float l = dot(texture(inputTex, uv - vec2(pixelStep.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
    float r = dot(texture(inputTex, uv + vec2(pixelStep.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
    float d = dot(texture(inputTex, uv - vec2(0.0, pixelStep.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
    float u = dot(texture(inputTex, uv + vec2(0.0, pixelStep.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
    return clamp(length(vec2(r - l, u - d)) * 6.0, 0.0, 1.0);
}

float material_value(vec2 globalPixel, vec2 dims, vec2 uv, float motion, uint salt) {
    float size = max(scale, 0.1);
#if MODE == 6
    return material_soft(globalPixel, motion, salt, size);
#elif MODE == 7
    return material_sprinkles(globalPixel, motion, salt, size);
#elif MODE == 8
    float a = material_noise(globalPixel, vec2(13.0 * size), motion, salt);
    float b = material_noise(globalPixel, vec2(6.0 * size), motion + 0.31, salt ^ 0x9e3779b9u);
    float c = material_noise(globalPixel, vec2(2.5 * size), motion + 0.67, salt ^ 0x85ebca6bu);
    return a * 0.58 + b * 0.28 + c * 0.14;
#elif MODE == 9
    float n = material_noise(globalPixel, vec2(max(size * 1.5, 0.8)), motion, salt);
    return s_curve01(s_curve01(n));
#elif MODE == 10
    return material_noise(globalPixel, vec2(4.5 * size), motion, salt);
#elif MODE == 11
    return step(0.5, material_noise(globalPixel, vec2(max(size * 1.5, 0.8)), motion, salt));
#elif MODE == 12
    return material_directional(globalPixel, motion, salt, size);
#elif MODE == 13
    return material_directional(globalPixel.yx, motion, salt, size);
#elif MODE == 14
    float n = material_noise(globalPixel, vec2(max(size * 1.5, 0.8)), motion, salt);
    return mix(0.5, n, material_edge_mask(uv, 1.0 / dims));
#else
    return material_noise(globalPixel, vec2(max(size * 1.5, 0.8)), motion, salt);
#endif
}

float shape_material(float raw) {
    float amount = intensity / 40.0;
    float shaped = raw * amount + 0.5 * (1.0 - amount);
    float c = clamp(contrast / 100.0, 0.0, 1.0);
    if (c < 0.5) return mix(0.5, shaped, c * 2.0);
    return mix(shaped, s_curve01(shaped), (c - 0.5) * 2.0);
}

void main() {
    vec4 base_color = texture(inputTex, v_texCoord);
    vec2 dims = vec2(textureSize(inputTex, 0));
    vec2 pixel_step = 1.0 / dims;

    float a = clamp(alpha, 0.0, 1.0);
    if (a <= 0.0) {
        fragColor = base_color;
        return;
    }

#if MODE >= 5
    vec2 globalDims = fullResolution.x > 0.0 ? fullResolution : dims;
    vec2 globalPixel = gl_FragCoord.xy + tileOffset;
    float materialMotion = time * float(Z_LOOP);
    float r = shape_material(material_value(globalPixel, globalDims, v_texCoord, materialMotion, 0x1234abcdu));
    vec3 material = vec3(r);
    if (!mono) {
        material.g = shape_material(material_value(globalPixel, globalDims, v_texCoord, materialMotion, 0x68bc21ebu));
        material.b = shape_material(material_value(globalPixel, globalDims, v_texCoord, materialMotion, 0x02e5be93u));
    }
    fragColor = vec4(clamp(mix(base_color.rgb, material, a), 0.0, 1.0), base_color.a);
    return;
#endif

    // Paper and stucco use different base frequencies
#if MODE == 4
    float freq_scale = 48.0;
#else
    float freq_scale = 24.0;
#endif
    vec2 base_freq = freq_for_shape(freq_scale * (10.01 - scale), dims);
    float motion = time * float(Z_LOOP);

    // Sample height field at center and 4 neighbors for gradient
    float h_center = height_field(v_texCoord, base_freq, motion);
    float h_right  = height_field(v_texCoord + vec2(pixel_step.x, 0.0), base_freq, motion);
    float h_left   = height_field(v_texCoord - vec2(pixel_step.x, 0.0), base_freq, motion);
    float h_up     = height_field(v_texCoord + vec2(0.0, pixel_step.y), base_freq, motion);
    float h_down   = height_field(v_texCoord - vec2(0.0, pixel_step.y), base_freq, motion);

    float gx = h_right - h_left;
    float gy = h_down - h_up;
    float gradient = sqrt(gx * gx + gy * gy);

    // Stucco uses stronger shading for more pronounced bumps
#if MODE == 4
    float gain = SHADE_GAIN * 0.5;
#else
    float gain = SHADE_GAIN * 0.25;
#endif
    float shade_base = clamp01(gradient * gain);

    float highlight_mix = clamp01((shade_base * shade_base) * 1.25);
    float base_factor = 0.9 + h_center * 0.35;
    float factor = clamp(base_factor + highlight_mix * 0.35, 0.85, 1.6);

    vec3 scaled_rgb = clamp(base_color.rgb * factor, 0.0, 1.0);

    fragColor = vec4(mix(base_color.rgb, scaled_rgb, a), base_color.a);
}
`,wgsl:`// Texture effect: generate a height field from one of several texture modes,
// derive shading from the gradient, then blend back into the source pixels.
// Modes: 0=canvas, 1=crosshatch, 2=halftone, 3=paper, 4=stucco
//
// MODE is a compile-time const injected by the runtime via injectDefines
// (see definition.js \`globals.mode.define\`). Same fix as the GLSL backend \u2014
// collapses the 5-way height_field dispatch so Dawn constant-folds it and
// emits only one variant body per compiled program. The old \`mode\` binding
// at @group(0) @binding(2) is removed; bindings 3/4/5 keep their original
// indices (WGSL binding numbers don't need to be contiguous).

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var u_sampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> alpha: f32;
@group(0) @binding(4) var<uniform> scale: f32;
@group(0) @binding(5) var<uniform> time: f32;
@group(0) @binding(6) var<uniform> intensity: f32;
@group(0) @binding(7) var<uniform> contrast: f32;
@group(0) @binding(8) var<uniform> mono: i32;
@group(0) @binding(9) var<uniform> tileOffset: vec2<f32>;
@group(0) @binding(10) var<uniform> fullResolution: vec2<f32>;

const PI: f32 = 3.14159265359;
const INV_UINT32_MAX: f32 = 1.0 / 4294967295.0;
const Z_LOOP: i32 = 2;
const SHADE_GAIN: f32 = 4.4;

fn clamp01(value: f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn s_curve01(value: f32) -> f32 {
    let c: f32 = clamp01(value);
    return c * c * (3.0 - 2.0 * c);
}

fn fade(t: f32) -> f32 {
    return t * t * (3.0 - 2.0 * t);
}

fn freq_for_shape(base_freq: f32, dims: vec2<f32>) -> vec2<f32> {
    let w: f32 = max(dims.x, 1.0);
    let h: f32 = max(dims.y, 1.0);
    if (abs(w - h) < 0.5) {
        return vec2<f32>(base_freq, base_freq);
    }
    if (w > h) {
        return vec2<f32>(base_freq, base_freq * w / h);
    }
    return vec2<f32>(base_freq * h / w, base_freq);
}

fn hash_uint(x_in: u32) -> u32 {
    var x: u32 = x_in;
    x ^= x >> 16u;
    x *= 0x7feb352du;
    x ^= x >> 15u;
    x *= 0x846ca68bu;
    x ^= x >> 16u;
    return x;
}

fn fast_hash(p: vec3<i32>, salt: u32) -> f32 {
    var h: u32 = salt ^ 0x9e3779b9u;
    h ^= bitcast<u32>(p.x) * 0x27d4eb2du;
    h = hash_uint(h);
    h ^= bitcast<u32>(p.y) * 0xc2b2ae35u;
    h = hash_uint(h);
    h ^= bitcast<u32>(p.z) * 0x165667b1u;
    h = hash_uint(h);
    return f32(h) * INV_UINT32_MAX;
}

fn value_noise(uv: vec2<f32>, freq: vec2<f32>, motion: f32, salt: u32) -> f32 {
    let scaled_uv: vec2<f32> = uv * max(freq, vec2<f32>(1.0, 1.0));
    let cell_floor: vec2<f32> = floor(scaled_uv);
    let frac_part: vec2<f32> = fract(scaled_uv);
    let base_cell: vec2<i32> = vec2<i32>(i32(cell_floor.x), i32(cell_floor.y));

    let z_floor: f32 = floor(motion);
    let z_frac: f32 = fract(motion);
    let z0: i32 = i32(z_floor) % Z_LOOP;
    let z1: i32 = (z0 + 1) % Z_LOOP;

    let c000: f32 = fast_hash(vec3<i32>(base_cell.x + 0, base_cell.y + 0, z0), salt);
    let c100: f32 = fast_hash(vec3<i32>(base_cell.x + 1, base_cell.y + 0, z0), salt);
    let c010: f32 = fast_hash(vec3<i32>(base_cell.x + 0, base_cell.y + 1, z0), salt);
    let c110: f32 = fast_hash(vec3<i32>(base_cell.x + 1, base_cell.y + 1, z0), salt);
    let c001: f32 = fast_hash(vec3<i32>(base_cell.x + 0, base_cell.y + 0, z1), salt);
    let c101: f32 = fast_hash(vec3<i32>(base_cell.x + 1, base_cell.y + 0, z1), salt);
    let c011: f32 = fast_hash(vec3<i32>(base_cell.x + 0, base_cell.y + 1, z1), salt);
    let c111: f32 = fast_hash(vec3<i32>(base_cell.x + 1, base_cell.y + 1, z1), salt);

    let tx: f32 = fade(frac_part.x);
    let ty: f32 = fade(frac_part.y);
    let tz: f32 = fade(z_frac);

    let x00: f32 = mix(c000, c100, tx);
    let x10: f32 = mix(c010, c110, tx);
    let x01: f32 = mix(c001, c101, tx);
    let x11: f32 = mix(c011, c111, tx);

    let y0: f32 = mix(x00, x10, ty);
    let y1: f32 = mix(x01, x11, ty);

    return mix(y0, y1, tz);
}

// Paper: 3-octave ridged noise (original texture)
fn height_paper(uv: vec2<f32>, base_freq: vec2<f32>, motion: f32) -> f32 {
    var freq: vec2<f32> = max(base_freq, vec2<f32>(1.0, 1.0));
    var amplitude: f32 = 0.5;
    var accum: f32 = 0.0;
    var total: f32 = 0.0;

    for (var octave: u32 = 0u; octave < 3u; octave = octave + 1u) {
        let salt: u32 = 0x9e3779b9u * (octave + 1u);
        let sample_val: f32 = value_noise(uv, freq, motion + f32(octave) * 0.37, salt);
        let ridged: f32 = 1.0 - abs(sample_val * 2.0 - 1.0);
        accum = accum + ridged * amplitude;
        total = total + amplitude;
        freq = freq * 2.0;
        amplitude = amplitude * 0.55;
    }

    if (total <= 0.0) { return clamp01(accum); }
    return clamp01(accum / total);
}

// Stucco: 2-octave smooth noise, lower frequency, rounder bumps
fn height_stucco(uv: vec2<f32>, base_freq: vec2<f32>, motion: f32) -> f32 {
    var freq: vec2<f32> = max(base_freq, vec2<f32>(1.0, 1.0));
    var amplitude: f32 = 0.5;
    var accum: f32 = 0.0;
    var total: f32 = 0.0;

    for (var octave: u32 = 0u; octave < 2u; octave = octave + 1u) {
        let salt: u32 = 0x9e3779b9u * (octave + 1u);
        let sample_val: f32 = value_noise(uv, freq, motion + f32(octave) * 0.37, salt);
        accum = accum + sample_val * amplitude;
        total = total + amplitude;
        freq = freq * 2.0;
        amplitude = amplitude * 0.5;
    }

    if (total <= 0.0) { return clamp01(accum); }
    return clamp01(accum / total);
}

// Canvas: woven fabric pattern with slight noise perturbation
fn height_canvas(uv: vec2<f32>, base_freq: vec2<f32>, motion: f32) -> f32 {
    let st: vec2<f32> = uv * base_freq;
    let warpX: f32 = abs(sin(st.x * PI));
    let weftY: f32 = abs(sin(st.y * PI));
    let weave: f32 = warpX * weftY;

    let noise: f32 = value_noise(uv, base_freq * 0.5, motion, 0x12345678u);
    return clamp01(weave * 0.85 + noise * 0.15);
}

// Halftone: regular circular dot grid
fn height_halftone(uv: vec2<f32>, base_freq: vec2<f32>) -> f32 {
    let st: vec2<f32> = uv * base_freq;
    let cell: vec2<f32> = fract(st) - 0.5;
    let dot: f32 = 1.0 - clamp01(length(cell) * 3.0);
    return dot * dot;
}

// Crosshatch: two overlapping diagonal sine ridges
fn height_crosshatch(uv: vec2<f32>, base_freq: vec2<f32>) -> f32 {
    let st: vec2<f32> = uv * base_freq;
    let d1: f32 = abs(sin((st.x + st.y) * PI));
    let d2: f32 = abs(sin((st.x - st.y) * PI));
    return clamp01(d1 * d2);
}

// Dispatch to the active mode's height function \u2014 single variant selected
// at compile time by the MODE const (Dawn constant-folds).
fn height_field(uv: vec2<f32>, base_freq: vec2<f32>, motion: f32) -> f32 {
    if (MODE == 0) { return height_canvas(uv, base_freq, motion); }
    if (MODE == 1) { return height_crosshatch(uv, base_freq); }
    if (MODE == 2) { return height_halftone(uv, base_freq); }
    if (MODE == 4) { return height_stucco(uv, base_freq, motion); }
    return height_paper(uv, base_freq, motion);  // 3 = paper (default)
}

fn material_hash(p: vec2<i32>, salt: u32, layer: u32) -> u32 {
    var h: u32 = salt ^ (layer * 0x9e3779b9u);
    h ^= bitcast<u32>(p.x) * 0x27d4eb2du;
    h = hash_uint(h);
    h ^= bitcast<u32>(p.y) * 0xc2b2ae35u;
    return hash_uint(h);
}

fn material_gradient(p: vec2<i32>, salt: u32, layer: u32) -> vec2<f32> {
    let h: u32 = material_hash(p, salt, layer);
    var gradient = vec2<f32>(f32(h & 0xffffu), f32(h >> 16u)) * (2.0 / 65535.0) - 1.0;
    gradient *= inverseSqrt(max(dot(gradient, gradient), 0.000001));
    return gradient;
}

fn material_fade(t: vec2<f32>) -> vec2<f32> {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn material_gradient_layer(p: vec2<f32>, salt: u32, layer: u32) -> f32 {
    let cellFloor = floor(p);
    let cell = vec2<i32>(i32(cellFloor.x), i32(cellFloor.y));
    let local = fract(p);
    let n00 = dot(material_gradient(cell, salt, layer), local);
    let n10 = dot(material_gradient(cell + vec2<i32>(1, 0), salt, layer), local - vec2<f32>(1.0, 0.0));
    let n01 = dot(material_gradient(cell + vec2<i32>(0, 1), salt, layer), local - vec2<f32>(0.0, 1.0));
    let n11 = dot(material_gradient(cell + vec2<i32>(1, 1), salt, layer), local - vec2<f32>(1.0, 1.0));
    let blend = material_fade(local);
    return mix(mix(n00, n10, blend.x), mix(n01, n11, blend.x), blend.y);
}

fn material_noise(globalPixel: vec2<f32>, cellSize: vec2<f32>, motion: f32, salt: u32) -> f32 {
    let p = globalPixel / max(cellSize, vec2<f32>(0.5));
    let zFloor = floor(motion);
    let z0 = i32(zFloor) % Z_LOOP;
    let z1 = (z0 + 1) % Z_LOOP;
    let n0 = material_gradient_layer(p, salt, u32(z0));
    let n1 = material_gradient_layer(p, salt, u32(z1));
    let n = mix(n0, n1, material_fade(vec2<f32>(fract(motion))).x);
    return clamp01(0.5 + n * 0.72);
}

fn material_soft(globalPixel: vec2<f32>, motion: f32, salt: u32, size: f32) -> f32 {
    // Two incommensurate gradient fields make a smooth isotropic surface.
    // Quintic interpolation keeps enlarged cells continuous without exposing
    // the square lattice that value noise reveals at high scale.
    let primaryCell = vec2<f32>(max(size * 3.25, 1.5));
    let primary = material_noise(globalPixel, primaryCell, motion, salt);
    let secondary = material_noise(globalPixel + vec2<f32>(17.31, 29.17), primaryCell * 1.87,
        motion + 0.41, salt ^ 0x68bc21ebu);
    return primary * 0.68 + secondary * 0.32;
}

fn material_directional(globalPixel: vec2<f32>, motion: f32, salt: u32, size: f32) -> f32 {
    // Strongly anisotropic gradient fields create continuous fibers directly,
    // avoiding both a stretched square lattice and a costly multi-tap blur.
    let primaryCell = vec2<f32>(max(size * 22.0, 8.0), max(size * 2.0, 1.25));
    let secondaryCell = vec2<f32>(max(size * 37.0, 13.0), max(size * 3.7, 2.3));
    let primary = material_noise(globalPixel, primaryCell, motion, salt);
    let secondary = material_noise(globalPixel + vec2<f32>(19.37, 11.83), secondaryCell,
        motion + 0.41, salt ^ 0x68bc21ebu);
    return primary * 0.72 + secondary * 0.28;
}

fn material_sprinkles(globalPixel: vec2<f32>, motion: f32, salt: u32, size: f32) -> f32 {
    let p: vec2<f32> = globalPixel / max(4.0 * size, 1.0) + vec2<f32>(motion * 0.31, motion * 0.19);
    let cellFloor = floor(p);
    let baseCell = vec2<i32>(i32(cellFloor.x), i32(cellFloor.y));
    let local = fract(p);
    var nearest = 10.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let cell = baseCell + vec2<i32>(x, y);
            let jx = fast_hash(vec3<i32>(cell, 0), salt) - 0.5;
            let jy = fast_hash(vec3<i32>(cell, 1), salt ^ 0x68bc21ebu) - 0.5;
            let point = vec2<f32>(f32(x), f32(y)) + 0.5 + vec2<f32>(jx, jy) * 0.6;
            nearest = min(nearest, length(local - point));
        }
    }
    return mix(0.45, 1.0, 1.0 - smoothstep(0.10, 0.22, nearest));
}

fn material_edge_mask(uv: vec2<f32>, pixelStep: vec2<f32>) -> f32 {
    let weights: vec3<f32> = vec3<f32>(0.2126, 0.7152, 0.0722);
    let l: f32 = dot(textureSample(inputTex, u_sampler, uv - vec2<f32>(pixelStep.x, 0.0)).xyz, weights);
    let r: f32 = dot(textureSample(inputTex, u_sampler, uv + vec2<f32>(pixelStep.x, 0.0)).xyz, weights);
    let d: f32 = dot(textureSample(inputTex, u_sampler, uv - vec2<f32>(0.0, pixelStep.y)).xyz, weights);
    let u: f32 = dot(textureSample(inputTex, u_sampler, uv + vec2<f32>(0.0, pixelStep.y)).xyz, weights);
    return clamp(length(vec2<f32>(r - l, u - d)) * 6.0, 0.0, 1.0);
}

fn material_value(globalPixel: vec2<f32>, dims: vec2<f32>, uv: vec2<f32>, motion: f32, salt: u32) -> f32 {
    let size: f32 = max(scale, 0.1);
    if (MODE == 6) {
        return material_soft(globalPixel, motion, salt, size);
    }
    if (MODE == 7) {
        return material_sprinkles(globalPixel, motion, salt, size);
    }
    if (MODE == 8) {
        let a: f32 = material_noise(globalPixel, vec2<f32>(13.0 * size), motion, salt);
        let b: f32 = material_noise(globalPixel, vec2<f32>(6.0 * size), motion + 0.31, salt ^ 0x9e3779b9u);
        let c: f32 = material_noise(globalPixel, vec2<f32>(2.5 * size), motion + 0.67, salt ^ 0x85ebca6bu);
        return a * 0.58 + b * 0.28 + c * 0.14;
    }
    if (MODE == 9) {
        let n: f32 = material_noise(globalPixel, vec2<f32>(max(size * 1.5, 0.8)), motion, salt);
        return s_curve01(s_curve01(n));
    }
    if (MODE == 10) {
        return material_noise(globalPixel, vec2<f32>(4.5 * size), motion, salt);
    }
    if (MODE == 11) {
        return step(0.5, material_noise(globalPixel, vec2<f32>(max(size * 1.5, 0.8)), motion, salt));
    }
    if (MODE == 12) {
        return material_directional(globalPixel, motion, salt, size);
    }
    if (MODE == 13) {
        return material_directional(globalPixel.yx, motion, salt, size);
    }
    if (MODE == 14) {
        let n: f32 = material_noise(globalPixel, vec2<f32>(max(size * 1.5, 0.8)), motion, salt);
        return mix(0.5, n, material_edge_mask(uv, 1.0 / dims));
    }
    return material_noise(globalPixel, vec2<f32>(max(size * 1.5, 0.8)), motion, salt);
}

fn shape_material(raw: f32) -> f32 {
    let amount: f32 = intensity / 40.0;
    let shaped: f32 = raw * amount + 0.5 * (1.0 - amount);
    let c: f32 = clamp(contrast / 100.0, 0.0, 1.0);
    if (c < 0.5) { return mix(0.5, shaped, c * 2.0); }
    return mix(shaped, s_curve01(shaped), (c - 0.5) * 2.0);
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Modes 0..4 retain their established sampling contract. The material
    // modes were added later and normalize the source UV so their presented
    // image matches the GLSL backend instead of inheriting that old flip.
    var sourceUV = in.uv;
    if (MODE >= 5) { sourceUV.y = 1.0 - sourceUV.y; }
    let base_color: vec4<f32> = textureSample(inputTex, u_sampler, sourceUV);
    let dims: vec2<f32> = vec2<f32>(textureDimensions(inputTex, 0));
    let pixel_step: vec2<f32> = 1.0 / dims;

    let a: f32 = clamp(alpha, 0.0, 1.0);
    if (a <= 0.0) {
        return base_color;
    }

    if (MODE >= 5) {
        var globalDims: vec2<f32> = dims;
        if (fullResolution.x > 0.0) { globalDims = fullResolution; }
        let globalPixel: vec2<f32> = in.position.xy + tileOffset;
        let materialMotion: f32 = time * f32(Z_LOOP);
        let r: f32 = shape_material(material_value(globalPixel, globalDims, sourceUV, materialMotion, 0x1234abcdu));
        var material: vec3<f32> = vec3<f32>(r);
        if (mono == 0) {
            material.g = shape_material(material_value(globalPixel, globalDims, sourceUV, materialMotion, 0x68bc21ebu));
            material.b = shape_material(material_value(globalPixel, globalDims, sourceUV, materialMotion, 0x02e5be93u));
        }
        return vec4<f32>(clamp(mix(base_color.xyz, material, a), vec3<f32>(0.0), vec3<f32>(1.0)), base_color.w);
    }

    // Paper and stucco use different base frequencies
    var freq_scale: f32 = 24.0;
    if (MODE == 4) { freq_scale = 48.0; }
    let base_freq: vec2<f32> = freq_for_shape(freq_scale * (10.01 - scale), dims);
    let motion: f32 = time * f32(Z_LOOP);

    // Sample height field at center and 4 neighbors for gradient
    let h_center: f32 = height_field(in.uv, base_freq, motion);
    let h_right: f32 = height_field(in.uv + vec2<f32>(pixel_step.x, 0.0), base_freq, motion);
    let h_left: f32 = height_field(in.uv - vec2<f32>(pixel_step.x, 0.0), base_freq, motion);
    let h_up: f32 = height_field(in.uv + vec2<f32>(0.0, pixel_step.y), base_freq, motion);
    let h_down: f32 = height_field(in.uv - vec2<f32>(0.0, pixel_step.y), base_freq, motion);

    let gx: f32 = h_right - h_left;
    let gy: f32 = h_down - h_up;
    let gradient: f32 = sqrt(gx * gx + gy * gy);

    // Stucco uses stronger shading for more pronounced bumps
    var gain: f32 = SHADE_GAIN * 0.25;
    if (MODE == 4) { gain = SHADE_GAIN * 0.5; }
    let shade_base: f32 = clamp01(gradient * gain);

    let highlight_mix: f32 = clamp01((shade_base * shade_base) * 1.25);
    let base_factor: f32 = 0.9 + h_center * 0.35;
    let factor: f32 = clamp(base_factor + highlight_mix * 0.35, 0.85, 1.6);

    let scaled_rgb: vec3<f32> = clamp(base_color.xyz * factor, vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(mix(base_color.xyz, scaled_rgb, a), base_color.w);
}
`}},i=`# texture

Procedural surface and material texture overlay. Surface modes derive bump-map
shading from a height field; material modes blend a controlled noise structure
into the source image.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | paper | see Modes | Texture type |
| alpha | float | 0.5 | 0-1 | Blend opacity |
| scale | float | 1.0 | 0.1-10 | Texture density |
| intensity | float | 40 | 0-100 | Material-noise deviation from neutral; active for regular through speckle |
| contrast | float | 50 | 0-100 | Material-noise contrast; active for regular through speckle |
| mono | bool | true | - | Use one noise field for all channels; active for regular through speckle |

## Modes

- **canvas** \u2014 woven fabric pattern with subtle noise irregularity
- **crosshatch** \u2014 two overlapping diagonal line patterns
- **halftone** \u2014 regular circular dot grid
- **paper** \u2014 ridged multi-octave noise with embossed shading
- **stucco** \u2014 smooth, blobby bumps with strong shadows
- **regular** \u2014 fine, smoothly interpolated material noise
- **soft** \u2014 compact isotropic low-pass noise with fine cells and no hard plateaus
- **sprinkles** \u2014 sparse rounded bright marks over a neutral field
- **clumped** \u2014 broad multi-scale clusters
- **contrasty** \u2014 steep, crisp tonal noise
- **enlarged** \u2014 coarse smoothly interpolated cells
- **stippled** \u2014 binary ink-like points
- **horizontal** \u2014 elongated horizontal fibers
- **vertical** \u2014 elongated vertical fibers
- **speckle** \u2014 fine noise concentrated around source-image edges

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .texture()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(l).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(l))n.shaders[a]={...e}}n&&i&&(n.help=i);var f="filter/texture",u="filter",m="texture",v=n;export{v as default,f as effectId,m as effectName,i as help,u as namespace};
