/* synth/curl */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Curl",namespace:"synth",func:"curl",tags:["noise"],description:"3D curl noise using simplex noise",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},aspectRatio:{slot:0,components:"w"},scale:{slot:1,components:"x"},seed:{slot:1,components:"y"},speed:{slot:1,components:"z"},intensity:{slot:2,components:"z"},tileOffset:{slot:3,components:"xy"},fullResolution:{slot:3,components:"zw"}},globals:{scale:{type:"float",default:16,uniform:"scale",min:.5,max:20,ui:{label:"scale",control:"slider"}},octaves:{type:"int",default:1,define:"OCTAVES",min:1,max:3,ui:{label:"octaves",control:"slider"}},seed:{type:"int",default:0,uniform:"seed",min:0,max:1e3,ui:{label:"seed",control:"slider"}},ridges:{type:"boolean",default:!0,define:"RIDGES",ui:{label:"ridges",control:"checkbox"}},intensity:{type:"float",default:1,uniform:"intensity",min:0,max:2,ui:{label:"intensity",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},outputMode:{type:"int",default:3,define:"OUTPUT_MODE",choices:{flowX:0,flowY:1,flowZ:2,full:3,magnitude:4},ui:{label:"output",control:"dropdown"}}},passes:[{name:"render",program:"curl",inputs:{},outputs:{fragColor:"outputTex"}}]});var s={curl:{glsl:`#version 300 es
precision highp float;

// OCTAVES, RIDGES, OUTPUT_MODE are compile-time defines injected by the
// runtime (see definition.js \`globals.{octaves,ridges,outputMode}.define\`).
//
// The primary win is OCTAVES: curlNoise3D calls fbmSimplex3D 12 times per
// pixel, each of which loops \`for (i = 0; i < 3; i++) if (i >= octaves) break\`.
// ANGLE unrolls the 3-iteration loop and runtime-guards each iteration. With
// OCTAVES as a compile-time constant the loop bound collapses and dead
// iterations vanish, so the default octaves=1 case drops from 36 simplex3D
// inlines per pixel to 12 \u2014 that's the single biggest contributor to this
// effect's ~600 ms cold compile on Windows Chrome.
#ifndef OCTAVES
#define OCTAVES 1
#endif
#ifndef RIDGES
#define RIDGES true
#endif
#ifndef OUTPUT_MODE
#define OUTPUT_MODE 3
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float scale;
uniform int seed;
uniform float speed;
uniform float intensity;

out vec4 fragColor;

// ============================================================================
// 3D Simplex Noise Implementation
// Based on Stefan Gustavson's implementation
// ============================================================================

// Permutation polynomial: (34x^2 + 10x) mod 289
vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 10.0) * x, 289.0);
}
vec4 permute(vec4 x) {
    return mod(((x * 34.0) + 10.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// 3D Simplex noise with seed support
float simplex3D(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    // Apply seed offset to input
    v += float(seed) * 0.1271;
    
    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    // Permutations
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    // Gradients: 7x7 points over a square, mapped onto an octahedron
    float n_ = 0.142857142857; // 1/7
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// FBM \u2014 loop bound is the compile-time OCTAVES macro so ANGLE fully unrolls
// and DCE's the unused iterations.
float fbmSimplex3D(vec3 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    float maxAmp = 0.0;

    for (int i = 0; i < OCTAVES; i++) {
        float n = simplex3D(p * freq);

        sum += n * amp;
        maxAmp += amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    return sum / maxAmp;
}

// ============================================================================
// 3D Curl Noise
// curl(F) = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
// ============================================================================

vec3 curlNoise3D(vec3 p) {
    const float eps = 1.0;

    // We need 3 independent scalar fields to compute curl of a vector field
    // Use offset positions to create decorrelated fields
    float a = (sin(time * 6.28318) * (speed) + 1.0) / float(OCTAVES) * 0.2;
    float b = (cos(time * 6.28318) * (speed) + 1.0) / float(OCTAVES) * 0.2;

    vec3 offset1 = vec3(a, b, 0.0);
    vec3 offset2 = vec3(31.416 - a, 47.853 - b, 12.793);
    vec3 offset3 = vec3(93.719 - b, 61.248 - a, 73.561);

    // Sample Fx derivatives
    float Fx_py = fbmSimplex3D(p + vec3(0.0, eps, 0.0) - offset1);
    float Fx_ny = fbmSimplex3D(p - vec3(0.0, eps, 0.0) + offset1);
    float Fx_pz = fbmSimplex3D(p + vec3(0.0, 0.0, eps) - offset1);
    float Fx_nz = fbmSimplex3D(p - vec3(0.0, 0.0, eps) + offset1);

    // Sample Fy derivatives
    float Fy_px = fbmSimplex3D(p + vec3(eps, 0.0, 0.0) - offset2);
    float Fy_nx = fbmSimplex3D(p - vec3(eps, 0.0, 0.0) + offset2);
    float Fy_pz = fbmSimplex3D(p + vec3(0.0, 0.0, eps) - offset2);
    float Fy_nz = fbmSimplex3D(p - vec3(0.0, 0.0, eps) + offset2);

    // Sample Fz derivatives
    float Fz_px = fbmSimplex3D(p + vec3(eps, 0.0, 0.0) - offset3);
    float Fz_nx = fbmSimplex3D(p - vec3(eps, 0.0, 0.0) + offset3);
    float Fz_py = fbmSimplex3D(p + vec3(0.0, eps, 0.0) - offset3);
    float Fz_ny = fbmSimplex3D(p - vec3(0.0, eps, 0.0) + offset3);
    
    // Compute partial derivatives
    float dFx_dy = (Fx_py - Fx_ny) / (2.0 * eps);
    float dFx_dz = (Fx_pz - Fx_nz) / (2.0 * eps);
    float dFy_dx = (Fy_px - Fy_nx) / (2.0 * eps);
    float dFy_dz = (Fy_pz - Fy_nz) / (2.0 * eps);
    float dFz_dx = (Fz_px - Fz_nx) / (2.0 * eps);
    float dFz_dy = (Fz_py - Fz_ny) / (2.0 * eps);
    
    // curl = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
    return vec3(
        dFz_dy - dFy_dz,
        dFx_dz - dFz_dx,
        dFy_dx - dFx_dy
    );
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    float aspect = fullResolution.x / fullResolution.y;

    // Center and scale coordinates
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
    vec3 p = vec3(centered * (21.0 - scale), 0.5);

    // Compute 3D curl noise
    vec3 curl = curlNoise3D(p);

    // Smooth compression to [0, 1] \u2014 tanh saturates gracefully, intensity controls curve
    curl = tanh(curl * intensity) * 0.5 + 0.5;

    vec3 color;

#if OUTPUT_MODE == 0
    // flowX: curl.x component
    color = vec3(curl.x);
#elif OUTPUT_MODE == 1
    // flowY: curl.y component
    color = vec3(curl.y);
#elif OUTPUT_MODE == 2
    // flowZ: curl.z component
    color = vec3(curl.z);
#elif OUTPUT_MODE == 3
    // full: all three components as RGB
    color = curl;
#else
    // magnitude: length of curl vector
    {
        vec3 curlCentered = curl * 2.0 - 1.0; // Back to [-1, 1]
        float mag = length(curlCentered);
        color = vec3(mag);
    }
#endif

    if (RIDGES) {
        color = 1.0 - abs(color * 2.0 - 1.0);
    }

    fragColor = vec4(color, 1.0);
}
`,wgsl:`// OCTAVES, RIDGES, OUTPUT_MODE are compile-time consts injected by the
// runtime via injectDefines (see definition.js \`globals.{octaves,ridges,
// outputMode}.define\`). Same fix as the GLSL backend \u2014 collapsing the
// fbmSimplex3D loop bound from runtime to compile-time drops the default
// case from 36 simplex3D inlines/pixel to 12.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    aspectRatio: f32,
    scale: f32,
    // f32, not i32: definition uniformLayout slots are packed with setFloat32
    // (packUniformsWithLayout) \u2014 an i32 field here reads the float's bit pattern.
    seed: f32,
    speed: f32,
    // Slots kept as padding so field offsets still match the definition.js
    // vec4 uniformLayout \u2014 the JS-side packer targets the vec4 component
    // offsets explicitly and needs the WGSL struct to line up.
    _pad_octaves: f32,     // was octaves \u2014 now compile-time OCTAVES
    _pad_ridges: f32,      // was ridges \u2014 now compile-time RIDGES
    _pad_outputMode: f32,  // was outputMode \u2014 now compile-time OUTPUT_MODE
    intensity: f32,
    _pad_intensity_w: f32, // slot 2.w padding so tile fields land on slot 3
    tileOffset: vec2f,     // slot 3.xy
    fullResolution: vec2f, // slot 3.zw
}

@group(0) @binding(0) var<uniform> u: Uniforms;

// ============================================================================
// 3D Simplex Noise Implementation
// Based on Stefan Gustavson's implementation
// ============================================================================

// Permutation polynomial: (34x^2 + 10x) mod 289
fn permute3(x: vec3f) -> vec3f {
    return (((x * 34.0) + 10.0) * x) % 289.0;
}

fn permute4(x: vec4f) -> vec4f {
    return (((x * 34.0) + 10.0) * x) % 289.0;
}

fn taylorInvSqrt(r: vec4f) -> vec4f {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// 3D Simplex noise with seed support
fn simplex3D(v: vec3f) -> f32 {
    let C = vec2f(1.0 / 6.0, 1.0 / 3.0);
    let D = vec4f(0.0, 0.5, 1.0, 2.0);
    
    // Apply seed offset to input
    let vSeeded = v + u.seed * 0.1271;
    
    // First corner
    let i = floor(vSeeded + dot(vSeeded, C.yyy));
    let x0 = vSeeded - i + dot(i, C.xxx);
    
    // Other corners
    let g = step(x0.yzx, x0.xyz);
    let l = 1.0 - g;
    let i1 = min(g.xyz, l.zxy);
    let i2 = max(g.xyz, l.zxy);
    
    let x1 = x0 - i1 + C.xxx;
    let x2 = x0 - i2 + C.yyy;
    let x3 = x0 - D.yyy;
    
    // Permutations
    let iMod = (i % 289.0 + 289.0) % 289.0;
    let p = permute4(permute4(permute4(
        iMod.z + vec4f(0.0, i1.z, i2.z, 1.0))
        + iMod.y + vec4f(0.0, i1.y, i2.y, 1.0))
        + iMod.x + vec4f(0.0, i1.x, i2.x, 1.0));
    
    // Gradients: 7x7 points over a square, mapped onto an octahedron
    let n_ = 0.142857142857; // 1/7
    let ns = n_ * D.wyz - D.xzx;
    
    let j = p - 49.0 * floor(p * ns.z * ns.z);
    
    let x_ = floor(j * ns.z);
    let y_ = floor(j - 7.0 * x_);
    
    let x = x_ * ns.x + ns.yyyy;
    let y = y_ * ns.x + ns.yyyy;
    let h = 1.0 - abs(x) - abs(y);
    
    let b0 = vec4f(x.xy, y.xy);
    let b1 = vec4f(x.zw, y.zw);
    
    let s0 = floor(b0) * 2.0 + 1.0;
    let s1 = floor(b1) * 2.0 + 1.0;
    let sh = -step(h, vec4f(0.0));
    
    let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    let a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    let p0 = vec3f(a0.xy, h.x);
    let p1 = vec3f(a0.zw, h.y);
    let p2 = vec3f(a1.xy, h.z);
    let p3 = vec3f(a1.zw, h.w);
    
    // Normalise gradients
    let norm = taylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    let p0n = p0 * norm.x;
    let p1n = p1 * norm.y;
    let p2n = p2 * norm.z;
    let p3n = p3 * norm.w;
    
    // Mix final noise value
    var m = max(0.6 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
    m = m * m;
    return 42.0 * dot(m * m, vec4f(dot(p0n, x0), dot(p1n, x1), dot(p2n, x2), dot(p3n, x3)));
}

// FBM \u2014 loop bound is the compile-time OCTAVES const so Dawn fully unrolls
// and DCE's the unused iterations.
fn fbmSimplex3D(p: vec3f) -> f32 {
    var sum: f32 = 0.0;
    var amp: f32 = 1.0;
    var freq: f32 = 1.0;
    var maxAmp: f32 = 0.0;

    for (var i: i32 = 0; i < OCTAVES; i = i + 1) {
        var n = simplex3D(p * freq);

        sum = sum + n * amp;
        maxAmp = maxAmp + amp;
        freq = freq * 2.0;
        amp = amp * 0.5;
    }

    return sum / maxAmp;
}

// ============================================================================
// 3D Curl Noise
// curl(F) = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
// ============================================================================

fn curlNoise3D(p: vec3f) -> vec3f {
    let eps: f32 = 1.0;

    // We need 3 independent scalar fields to compute curl of a vector field
    // Use offset positions to create decorrelated fields
    let a = (sin(u.time * 6.28318) * (u.speed) + 1.0) / f32(OCTAVES) * 0.2;
    let b = (cos(u.time * 6.28318) * (u.speed) + 1.0) / f32(OCTAVES) * 0.2;

    let offset1 = vec3f(a, b, 0.0);
    let offset2 = vec3f(31.416 - a, 47.853 - b, 12.793);
    let offset3 = vec3f(93.719 - b, 61.248 - a, 73.561);

    // Sample Fx derivatives
    let Fx_py = fbmSimplex3D(p + vec3f(0.0, eps, 0.0) - offset1);
    let Fx_ny = fbmSimplex3D(p - vec3f(0.0, eps, 0.0) + offset1);
    let Fx_pz = fbmSimplex3D(p + vec3f(0.0, 0.0, eps) - offset1);
    let Fx_nz = fbmSimplex3D(p - vec3f(0.0, 0.0, eps) + offset1);

    // Sample Fy derivatives
    let Fy_px = fbmSimplex3D(p + vec3f(eps, 0.0, 0.0) - offset2);
    let Fy_nx = fbmSimplex3D(p - vec3f(eps, 0.0, 0.0) + offset2);
    let Fy_pz = fbmSimplex3D(p + vec3f(0.0, 0.0, eps) - offset2);
    let Fy_nz = fbmSimplex3D(p - vec3f(0.0, 0.0, eps) + offset2);

    // Sample Fz derivatives
    let Fz_px = fbmSimplex3D(p + vec3f(eps, 0.0, 0.0) - offset3);
    let Fz_nx = fbmSimplex3D(p - vec3f(eps, 0.0, 0.0) + offset3);
    let Fz_py = fbmSimplex3D(p + vec3f(0.0, eps, 0.0) - offset3);
    let Fz_ny = fbmSimplex3D(p - vec3f(0.0, eps, 0.0) + offset3);
    
    // Compute partial derivatives
    let dFx_dy = (Fx_py - Fx_ny) / (2.0 * eps);
    let dFx_dz = (Fx_pz - Fx_nz) / (2.0 * eps);
    let dFy_dx = (Fy_px - Fy_nx) / (2.0 * eps);
    let dFy_dz = (Fy_pz - Fy_nz) / (2.0 * eps);
    let dFz_dx = (Fz_px - Fz_nx) / (2.0 * eps);
    let dFz_dy = (Fz_py - Fz_ny) / (2.0 * eps);
    
    // curl = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
    return vec3f(
        dFz_dy - dFy_dz,
        dFx_dz - dFz_dx,
        dFy_dx - dFx_dy
    );
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = (fragCoord.xy + u.tileOffset) / u.fullResolution;
    let aspect = u.fullResolution.x / u.fullResolution.y;

    // Center and scale coordinates
    let centered = (uv - 0.5) * vec2f(aspect, 1.0);
    let p = vec3f(centered * (21.0 - u.scale), 0.5);

    // Compute 3D curl noise
    var curl = curlNoise3D(p);

    // Smooth compression to [0, 1] \u2014 tanh saturates gracefully, intensity controls curve
    let curlNorm = tanh(curl * u.intensity) * 0.5 + 0.5;

    var color: vec3f;

    if (OUTPUT_MODE == 0) {
        // flowX: curl.x component
        color = vec3f(curlNorm.x);
    } else if (OUTPUT_MODE == 1) {
        // flowY: curl.y component
        color = vec3f(curlNorm.y);
    } else if (OUTPUT_MODE == 2) {
        // flowZ: curl.z component
        color = vec3f(curlNorm.z);
    } else if (OUTPUT_MODE == 3) {
        // full: all three components as RGB
        color = curlNorm;
    } else {
        // magnitude: length of curl vector
        let curlCentered = curlNorm * 2.0 - 1.0; // Back to [-1, 1]
        let mag = length(curlCentered);
        color = vec3f(mag);
    }

    if (RIDGES) {
        color = 1.0 - abs(color * 2.0 - 1.0);
    }

    return vec4f(color, 1.0);
}
`}},l=`# curl

3D curl noise using simplex noise

## Description

Curl noise produces smooth, swirling flow fields by computing the curl of a 3D vector potential field built from three decorrelated simplex noise functions. The curl operation ensures the resulting vector field is divergence-free, meaning particles following the flow won't accumulate or disperse\u2014making it ideal for fluid simulations and organic motion patterns.

The effect animates by moving through the z-axis of the 3D noise space, creating smooth temporal evolution.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | float | 16 | 0.5-20 | Scale |
| octaves | int | 1 | 1-3 | Octaves |
| seed | float | 0 | 0-1000 | Seed |
| ridges | bool | true | - | Ridges |
| intensity | float | 1 | 0-2 | Intensity |
| speed | int | 1 | 0-5 | Speed |
| outputMode | int | full | flowX/flowY/flowZ/full/magnitude | Output |

## Notes

Output modes:
- **flowX**: Curl X component as grayscale
- **flowY**: Curl Y component as grayscale
- **flowZ**: Curl Z component as grayscale
- **full**: All three components as RGB (X=R, Y=G, Z=B)
- **magnitude**: Length of the curl vector as grayscale

Use cases: fluid flow visualization, particle system motion paths, organic swirling patterns, flow field generation, abstract generative art.

## Usage

\`\`\`
search synth

curl()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(s))n.shaders[o]={...e}}n&&l&&(n.help=l);var p="synth/curl",c="synth",d="curl",m=n;export{m as default,p as effectId,d as effectName,l as help,c as namespace};
