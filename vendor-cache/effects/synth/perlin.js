/* synth/perlin */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Perlin",namespace:"synth",func:"perlin",tags:["noise"],description:"Perlin-like noise with optional warping",globals:{scale:{type:"float",default:25,min:0,max:100,randMin:15,uniform:"scale",ui:{label:"scale"}},octaves:{type:"int",default:1,min:1,max:6,uniform:"octaves",ui:{label:"octaves"}},colorMode:{type:"int",default:1,uniform:"colorMode",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}},dimensions:{type:"int",default:2,min:2,max:3,uniform:"dimensions",define:"DIMENSIONS",ui:{label:"dimensions"}},ridges:{type:"boolean",default:!1,uniform:"ridges",ui:{label:"ridges"}},warpIterations:{type:"int",default:0,min:0,max:4,uniform:"warpIterations",ui:{label:"warp iterations",category:"warp"}},warpScale:{type:"float",default:50,min:0,max:100,uniform:"warpScale",ui:{label:"warp scale",category:"warp",enabledBy:{param:"warpIterations",neq:0}}},warpIntensity:{type:"float",default:50,min:0,max:100,uniform:"warpIntensity",ui:{label:"warp intensity",category:"warp",enabledBy:{param:"warpIterations",neq:0}}},seed:{type:"int",default:0,min:0,max:100,uniform:"seed",ui:{label:"seed"}},speed:{type:"int",default:1,min:0,max:5,zero:0,randMax:2,uniform:"speed",ui:{label:"speed"}}},passes:[{name:"main",program:"perlin",inputs:{},outputs:{color:"outputTex"}}]});var a={perlin:{glsl:`#version 300 es
precision highp float;
precision highp int;

// DIMENSIONS is a compile-time define injected by the runtime (see
// definition.js \`globals.dimensions.define\`). Picks 2D vs 3D noise at
// compile time so the unused implementation gets DCE'd. Avoids ANGLE\u2192D3D
// inlining both fbm2D + fbm3D + domainWarp2D + domainWarp3D into main(),
// which was producing a 1.3s compile via filter/adjust on Windows Chrome.
#ifndef DIMENSIONS
#define DIMENSIONS 2
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float time;
uniform float scale;
uniform int seed;
uniform int octaves;
uniform int colorMode;
uniform int ridges;
uniform int warpIterations;
uniform float warpScale;
uniform float warpIntensity;
uniform float speed;

out vec4 fragColor;

/* 3D gradient noise with quintic interpolation
   Animated using periodic z-axis for seamless looping
   2D output is a cross-section through 3D noise volume
   
   Also supports 2D periodic noise using time-animated gradients */

const float TAU = 6.283185307179586;
const float Z_PERIOD = 4.0;  // Period length in z-axis lattice units

// PCG PRNG for 2D mode
uvec3 pcg(uvec3 v) {
    v = v * uint(1664525) + uint(1013904223);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> uint(16);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec3 prng(vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}

// 3D hash using multiple rounds of mixing
// Based on techniques from "Hash Functions for GPU Rendering" (Jarzynski & Olano, 2020)
float hash3(vec3 p) {
    // Add seed to input to vary the noise pattern
    p = p + float(seed) * 0.1;
    
    // Convert to unsigned integer-like values via large multipliers
    uvec3 q = uvec3(ivec3(p * 1000.0) + 65536);
    
    // Multiple rounds of mixing for thorough decorrelation
    q = q * 1664525u + 1013904223u;  // LCG constants
    q.x += q.y * q.z;
    q.y += q.z * q.x;
    q.z += q.x * q.y;
    
    q ^= q >> 16u;
    
    q.x += q.y * q.z;
    q.y += q.z * q.x;
    q.z += q.x * q.y;
    
    return float(q.x ^ q.y ^ q.z) / 4294967295.0;
}

// Gradient from hash - returns normalized 3D vector
vec3 grad3(vec3 p) {
    // Generate 3 independent random values
    float h1 = hash3(p);
    float h2 = hash3(p + 127.1);
    float h3 = hash3(p + 269.5);
    
    // Generate independent gradient components - each component is [-1, 1]
    vec3 g = vec3(
        h1 * 2.0 - 1.0,
        h2 * 2.0 - 1.0,
        h3 * 2.0 - 1.0
    );
    
    return normalize(g);
}

// Quintic interpolation for smooth transitions (no visible seams)
float quintic(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float smoothlerp(float x, float a, float b) {
    return a + quintic(x) * (b - a);
}

// Wrap z index for periodicity at lattice level
float wrapZ(float z) {
    return mod(z, Z_PERIOD);
}

#if DIMENSIONS == 2
// 2D periodic grid function - gradient angle animates with time
float grid2D(vec2 st, vec2 cell, float timeAngle, float channelOffset) {
    float angle = prng(vec3(cell + float(seed), 1.0)).r * TAU;
    angle += timeAngle + channelOffset * TAU;  // Animate gradient rotation
    vec2 gradient = vec2(cos(angle), sin(angle));
    vec2 dist = st - cell;
    return dot(gradient, dist);
}

// 2D periodic Perlin noise - time animates gradient angles for seamless loop
float noise2D(vec2 st, float timeAngle, float channelOffset) {
    vec2 cell = floor(st);
    vec2 f = fract(st);
    
    float tl = grid2D(st, cell, timeAngle, channelOffset);
    float tr = grid2D(st, vec2(cell.x + 1.0, cell.y), timeAngle, channelOffset);
    float bl = grid2D(st, vec2(cell.x, cell.y + 1.0), timeAngle, channelOffset);
    float br = grid2D(st, cell + 1.0, timeAngle, channelOffset);
    
    float upper = smoothlerp(f.x, tl, tr);
    float lower = smoothlerp(f.x, bl, br);
    float val = smoothlerp(f.y, upper, lower);
    
    return val;  // Returns -1..1
}
#endif

#if DIMENSIONS == 3
// 3D gradient noise - Perlin-style with quintic interpolation
// z-axis is periodic with period Z_PERIOD
float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // Quintic interpolation curves
    vec3 u = vec3(quintic(f.x), quintic(f.y), quintic(f.z));
    
    // Wrap z indices for periodicity - gradients at z=0 and z=Z_PERIOD will match
    float iz0 = wrapZ(i.z);
    float iz1 = wrapZ(i.z + 1.0);
    
    // 8 corners of 3D cube with wrapped z
    float n000 = dot(grad3(vec3(i.xy, iz0) + vec3(0,0,0)), f - vec3(0,0,0));
    float n100 = dot(grad3(vec3(i.xy, iz0) + vec3(1,0,0)), f - vec3(1,0,0));
    float n010 = dot(grad3(vec3(i.xy, iz0) + vec3(0,1,0)), f - vec3(0,1,0));
    float n110 = dot(grad3(vec3(i.xy, iz0) + vec3(1,1,0)), f - vec3(1,1,0));
    float n001 = dot(grad3(vec3(i.xy, iz1) + vec3(0,0,0)), f - vec3(0,0,1));
    float n101 = dot(grad3(vec3(i.xy, iz1) + vec3(1,0,0)), f - vec3(1,0,1));
    float n011 = dot(grad3(vec3(i.xy, iz1) + vec3(0,1,0)), f - vec3(0,1,1));
    float n111 = dot(grad3(vec3(i.xy, iz1) + vec3(1,1,0)), f - vec3(1,1,1));
    
    // Trilinear interpolation along x
    float nx00 = mix(n000, n100, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx11 = mix(n011, n111, u.x);
    
    // Interpolation along y
    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);
    
    // Final interpolation along z
    return mix(nxy0, nxy1, u.z);
}
#endif

#if DIMENSIONS == 2
// FBM for 2D periodic noise
float fbm2D(vec2 st, float timeAngle, float channelOffset, int ridgedMode) {
    const int MAX_OCT = 8;
    float amplitude = 0.5;
    float frequency = 1.0;
    float sum = 0.0;
    float maxVal = 0.0;
    int oct = octaves;
    if (oct < 1) oct = 1;
    
    for (int i = 0; i < MAX_OCT; i++) {
        if (i >= oct) break;
        float n = noise2D(st * frequency, timeAngle, channelOffset);  // -1..1
        n = clamp(n * 1.5, -1.0, 1.0);
        if (ridgedMode == 1) {
            n = 1.0 - abs(n);
        } else {
            n = (n + 1.0) * 0.5;
        }
        sum += n * amplitude;
        maxVal += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return sum / maxVal;
}
#endif

#if DIMENSIONS == 3
// FBM using 3D noise with circular time for seamless looping
// 2D cross-section moves through 3D noise as time varies
float fbm3D(vec2 st, float timeAngle, float channelOffset, int ridgedMode) {
    const int MAX_OCT = 8;
    float amplitude = 0.5;
    float frequency = 1.0;
    float sum = 0.0;
    float maxVal = 0.0;
    int oct = octaves;
    if (oct < 1) oct = 1;
    
    // Linear time traversal with periodic z-axis
    // time goes 0->1, map to 0->Z_PERIOD for one complete loop
    float z = timeAngle / TAU * Z_PERIOD + channelOffset;
    
    for (int i = 0; i < MAX_OCT; i++) {
        if (i >= oct) break;
        vec3 p = vec3(st * frequency, z);
        float n = noise3D(p);  // -1..1
        // Scale up by ~1.5 to spread the gaussian-ish distribution
        // Perlin noise rarely hits +-1, so this expands the usable range
        n = clamp(n * 1.5, -1.0, 1.0);
        if (ridgedMode == 1) {
            n = 1.0 - abs(n);  // fold at zero, gives 0..1 with ridges at zero-crossings
        } else {
            n = (n + 1.0) * 0.5;  // normalize to 0..1
        }
        sum += n * amplitude;
        maxVal += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return sum / maxVal;
}
#endif

#if DIMENSIONS == 2
// Single-octave warp noise helper (cheap, no fbm)
float warpNoise2D(vec2 p, float timeAngle) {
    return noise2D(p, timeAngle, 0.0);
}

// Domain warp: iteratively displace coordinates using noise
// Each iteration uses a different spatial offset so it samples a distinct noise field
vec2 domainWarp2D(vec2 st, float timeAngle, int iterations, float wScale, float wIntensity) {
    float wFreq = max(0.1, 100.0 / max(wScale, 0.01));
    float disp = wIntensity * 0.02;
    vec2 p = st;
    for (int i = 0; i < 4; i++) {
        if (i >= iterations) break;
        float fi = float(i);
        float nx = warpNoise2D(p * wFreq + vec2(fi * 5.2 + 1.7, fi * 1.3 + 13.7), timeAngle);
        float ny = warpNoise2D(p * wFreq + vec2(fi * 2.8 + 7.3, fi * 4.1 + 3.9), timeAngle);
        p += vec2(nx, ny) * disp;
    }
    return p;
}
#endif

#if DIMENSIONS == 3
float warpNoise3D(vec2 p, float z) {
    return noise3D(vec3(p, z));
}

vec2 domainWarp3D(vec2 st, float z, int iterations, float wScale, float wIntensity) {
    float wFreq = max(0.1, 100.0 / max(wScale, 0.01));
    float disp = wIntensity * 0.02;
    vec2 p = st;
    for (int i = 0; i < 4; i++) {
        if (i >= iterations) break;
        float fi = float(i);
        float nx = warpNoise3D(p * wFreq + vec2(fi * 5.2 + 1.7, fi * 1.3 + 13.7), z);
        float ny = warpNoise3D(p * wFreq + vec2(fi * 2.8 + 7.3, fi * 4.1 + 3.9), z);
        p += vec2(nx, ny) * disp;
    }
    return p;
}
#endif

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 res = fullResolution;
    if (res.x < 1.0) res = vec2(1024.0, 1024.0);
    vec2 st = (gl_FragCoord.xy + tileOffset) / res;
    // Center UVs so zoom scales from center, not corner
    st -= 0.5;
    st.x *= aspect;
    // Invert scale to match vnoise convention: higher scale = fewer cells (zoomed in)
    float freq = max(0.1, 100.0 / max(scale, 0.01));
    st *= freq;
    // Offset to keep noise coords positive (avoids hash artifacts at boundaries)
    st += 1000.0;
    
    // time is 0-1 representing position around circle for seamless looping
    // speed multiplies the time to control animation speed
    float timeAngle = time * speed * TAU;

    // Apply domain warp if enabled
#if DIMENSIONS == 2
    if (warpIterations > 0) {
        st = domainWarp2D(st, timeAngle, warpIterations, warpScale, warpIntensity);
    }
#else
    float zWarp = timeAngle / TAU * Z_PERIOD;
    if (warpIterations > 0) {
        st = domainWarp3D(st, zWarp, warpIterations, warpScale, warpIntensity);
    }
#endif

    float r, g, b;

#if DIMENSIONS == 2
    // 2D periodic noise (faster)
    r = fbm2D(st, timeAngle, 0.0, ridges);
    g = fbm2D(st, timeAngle, 0.333, ridges);
    b = fbm2D(st, timeAngle, 0.667, ridges);
#else
    // 3D cross-section noise (original)
    r = fbm3D(st, timeAngle, 0.0, ridges);
    g = fbm3D(st, timeAngle, 1.33, ridges);
    b = fbm3D(st, timeAngle, 2.67, ridges);
#endif
    
    vec3 col;
    if (colorMode == 0) {
        // Mono mode
        col = vec3(r);
    } else {
        // RGB mode
        col = vec3(r, g, b);
    }
    
    fragColor = vec4(col, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
//
// DIMENSIONS is a compile-time const injected by the runtime via injectDefines.
// See synth/perlin/definition.js \`globals.dimensions.define\`. Picking 2D vs 3D
// at compile time lets the WGSL compiler dead-code-eliminate the unused
// implementation. The Params.dimensions field is left in place to preserve the
// uniform layout but is no longer read by the shader.

struct Params {
    resolution: vec2<f32>,
    aspect: f32,
    time: f32,
    scale: f32,
    seed: i32,
    octaves: i32,
    colorMode: i32,
    dimensions: i32,
    ridges: i32,
    speed: f32,
    warpIterations: i32,
    warpScale: f32,
    warpIntensity: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

/* 3D gradient noise with quintic interpolation
   Animated using periodic z-axis for seamless looping
   2D output is a cross-section through 3D noise volume

   Also supports 2D periodic noise using time-animated gradients */

const TAU: f32 = 6.283185307179586;
const Z_PERIOD: f32 = 4.0;  // Period length in z-axis lattice units

// PCG PRNG for 2D mode
fn pcg(v_in: vec3<u32>) -> vec3<u32> {
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

fn prng(p_in: vec3<f32>) -> vec3<f32> {
    var p = p_in;
    p.x = select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0);
    p.y = select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0);
    p.z = select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0);
    return vec3<f32>(pcg(vec3<u32>(p))) / f32(0xffffffff);
}

// 3D hash using multiple rounds of mixing
// Based on techniques from "Hash Functions for GPU Rendering" (Jarzynski & Olano, 2020)
fn hash3(p: vec3<f32>) -> f32 {
    // Add seed to input to vary the noise pattern
    let ps = p + f32(params.seed) * 0.1;

    // Convert to unsigned integer values via large multipliers
    var q = vec3<u32>(vec3<i32>(ps * 1000.0) + 65536);

    // Multiple rounds of mixing for thorough decorrelation
    q = q * 1664525u + 1013904223u;  // LCG constants
    q.x = q.x + q.y * q.z;
    q.y = q.y + q.z * q.x;
    q.z = q.z + q.x * q.y;

    q = q ^ (q >> vec3<u32>(16u));

    q.x = q.x + q.y * q.z;
    q.y = q.y + q.z * q.x;
    q.z = q.z + q.x * q.y;

    return f32(q.x ^ q.y ^ q.z) / 4294967295.0;
}

// Gradient from hash - returns normalized 3D vector
fn grad3(p: vec3<f32>) -> vec3<f32> {
    let h1 = hash3(p);
    let h2 = hash3(p + 127.1);
    let h3 = hash3(p + 269.5);

    // Generate independent gradient components - each component is [-1, 1]
    let g = vec3<f32>(
        h1 * 2.0 - 1.0,
        h2 * 2.0 - 1.0,
        h3 * 2.0 - 1.0
    );

    return normalize(g);
}

// Quintic interpolation for smooth transitions
fn quintic(t: f32) -> f32 {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn smoothlerp(x: f32, a: f32, b: f32) -> f32 {
    return a + quintic(x) * (b - a);
}

// Wrap z index for periodicity at lattice level
fn wrapZ(z: f32) -> f32 {
    return (z % Z_PERIOD + Z_PERIOD) % Z_PERIOD;
}

// 2D periodic grid function - gradient angle animates with time
fn grid2D(st: vec2<f32>, cell: vec2<f32>, timeAngle: f32, channelOffset: f32) -> f32 {
    var angle = prng(vec3<f32>(cell + f32(params.seed), 1.0)).r * TAU;
    angle = angle + timeAngle + channelOffset * TAU;  // Animate gradient rotation
    let gradient = vec2<f32>(cos(angle), sin(angle));
    let dist = st - cell;
    return dot(gradient, dist);
}

// 2D periodic Perlin noise - time animates gradient angles for seamless loop
fn noise2D(st: vec2<f32>, timeAngle: f32, channelOffset: f32) -> f32 {
    let cell = floor(st);
    let f = fract(st);

    let tl = grid2D(st, cell, timeAngle, channelOffset);
    let tr = grid2D(st, vec2<f32>(cell.x + 1.0, cell.y), timeAngle, channelOffset);
    let bl = grid2D(st, vec2<f32>(cell.x, cell.y + 1.0), timeAngle, channelOffset);
    let br = grid2D(st, cell + 1.0, timeAngle, channelOffset);

    let upper = smoothlerp(f.x, tl, tr);
    let lower = smoothlerp(f.x, bl, br);
    let val = smoothlerp(f.y, upper, lower);

    return val;  // Returns -1..1
}

// 3D gradient noise - Perlin-style with quintic interpolation
// z-axis is periodic with period Z_PERIOD
fn noise3D(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);

    let u = vec3<f32>(quintic(f.x), quintic(f.y), quintic(f.z));

    // Wrap z indices for periodicity - gradients at z=0 and z=Z_PERIOD will match
    let iz0 = wrapZ(i.z);
    let iz1 = wrapZ(i.z + 1.0);

    // 8 corners of 3D cube with wrapped z
    let n000 = dot(grad3(vec3<f32>(i.xy, iz0) + vec3<f32>(0.0, 0.0, 0.0)), f - vec3<f32>(0.0, 0.0, 0.0));
    let n100 = dot(grad3(vec3<f32>(i.xy, iz0) + vec3<f32>(1.0, 0.0, 0.0)), f - vec3<f32>(1.0, 0.0, 0.0));
    let n010 = dot(grad3(vec3<f32>(i.xy, iz0) + vec3<f32>(0.0, 1.0, 0.0)), f - vec3<f32>(0.0, 1.0, 0.0));
    let n110 = dot(grad3(vec3<f32>(i.xy, iz0) + vec3<f32>(1.0, 1.0, 0.0)), f - vec3<f32>(1.0, 1.0, 0.0));
    let n001 = dot(grad3(vec3<f32>(i.xy, iz1) + vec3<f32>(0.0, 0.0, 0.0)), f - vec3<f32>(0.0, 0.0, 1.0));
    let n101 = dot(grad3(vec3<f32>(i.xy, iz1) + vec3<f32>(1.0, 0.0, 0.0)), f - vec3<f32>(1.0, 0.0, 1.0));
    let n011 = dot(grad3(vec3<f32>(i.xy, iz1) + vec3<f32>(0.0, 1.0, 0.0)), f - vec3<f32>(0.0, 1.0, 1.0));
    let n111 = dot(grad3(vec3<f32>(i.xy, iz1) + vec3<f32>(1.0, 1.0, 0.0)), f - vec3<f32>(1.0, 1.0, 1.0));

    let nx00 = mix(n000, n100, u.x);
    let nx10 = mix(n010, n110, u.x);
    let nx01 = mix(n001, n101, u.x);
    let nx11 = mix(n011, n111, u.x);

    let nxy0 = mix(nx00, nx10, u.y);
    let nxy1 = mix(nx01, nx11, u.y);

    return mix(nxy0, nxy1, u.z);
}

// FBM for 2D periodic noise
fn fbm2D(st: vec2<f32>, timeAngle: f32, channelOffset: f32, ridgedMode: i32) -> f32 {
    let MAX_OCT: i32 = 8;
    var amplitude: f32 = 0.5;
    var frequency: f32 = 1.0;
    var sum: f32 = 0.0;
    var maxVal: f32 = 0.0;
    var oct = params.octaves;
    if (oct < 1) { oct = 1; }

    for (var i: i32 = 0; i < MAX_OCT; i = i + 1) {
        if (i >= oct) { break; }
        var n = noise2D(st * frequency, timeAngle, channelOffset);  // -1..1
        n = clamp(n * 1.5, -1.0, 1.0);
        if (ridgedMode == 1) {
            n = 1.0 - abs(n);
        } else {
            n = (n + 1.0) * 0.5;
        }
        sum = sum + n * amplitude;
        maxVal = maxVal + amplitude;
        frequency = frequency * 2.0;
        amplitude = amplitude * 0.5;
    }
    return sum / maxVal;
}

// FBM using 3D noise with circular time for seamless looping
// 2D cross-section moves through 3D noise as time varies
fn fbm3D(st: vec2<f32>, timeAngle: f32, channelOffset: f32, ridgedMode: i32) -> f32 {
    let MAX_OCT: i32 = 8;
    var amplitude: f32 = 0.5;
    var frequency: f32 = 1.0;
    var sum: f32 = 0.0;
    var maxVal: f32 = 0.0;
    var oct = params.octaves;
    if (oct < 1) { oct = 1; }

    // Linear time traversal with periodic z-axis
    // time goes 0->1, map to 0->Z_PERIOD for one complete loop
    let z = timeAngle / TAU * Z_PERIOD + channelOffset;

    for (var i: i32 = 0; i < MAX_OCT; i = i + 1) {
        if (i >= oct) { break; }
        let p = vec3<f32>(st * frequency, z);
        var n = noise3D(p);  // -1..1
        // Scale up by ~1.5 to spread the gaussian-ish distribution
        // Perlin noise rarely hits +-1, so this expands the usable range
        n = clamp(n * 1.5, -1.0, 1.0);
        if (ridgedMode == 1) {
            n = 1.0 - abs(n);  // fold at zero, gives 0..1 with ridges at zero-crossings
        } else {
            n = (n + 1.0) * 0.5;  // normalize to 0..1
        }
        sum = sum + n * amplitude;
        maxVal = maxVal + amplitude;
        frequency = frequency * 2.0;
        amplitude = amplitude * 0.5;
    }
    return sum / maxVal;
}

// Single-octave warp noise helpers (cheap, no fbm)
fn warpNoise2D(p: vec2<f32>, timeAngle: f32) -> f32 {
    return noise2D(p, timeAngle, 0.0);
}

fn warpNoise3D(p: vec2<f32>, z: f32) -> f32 {
    return noise3D(vec3<f32>(p, z));
}

// Domain warp: iteratively displace coordinates using noise
fn domainWarp2D(st: vec2<f32>, timeAngle: f32, iterations: i32, wScale: f32, wIntensity: f32) -> vec2<f32> {
    let wFreq = max(0.1, 100.0 / max(wScale, 0.01));
    let disp = wIntensity * 0.02;
    var p = st;
    for (var i: i32 = 0; i < 4; i = i + 1) {
        if (i >= iterations) { break; }
        let fi = f32(i);
        let nx = warpNoise2D(p * wFreq + vec2<f32>(fi * 5.2 + 1.7, fi * 1.3 + 13.7), timeAngle);
        let ny = warpNoise2D(p * wFreq + vec2<f32>(fi * 2.8 + 7.3, fi * 4.1 + 3.9), timeAngle);
        p = p + vec2<f32>(nx, ny) * disp;
    }
    return p;
}

fn domainWarp3D(st: vec2<f32>, z: f32, iterations: i32, wScale: f32, wIntensity: f32) -> vec2<f32> {
    let wFreq = max(0.1, 100.0 / max(wScale, 0.01));
    let disp = wIntensity * 0.02;
    var p = st;
    for (var i: i32 = 0; i < 4; i = i + 1) {
        if (i >= iterations) { break; }
        let fi = f32(i);
        let nx = warpNoise3D(p * wFreq + vec2<f32>(fi * 5.2 + 1.7, fi * 1.3 + 13.7), z);
        let ny = warpNoise3D(p * wFreq + vec2<f32>(fi * 2.8 + 7.3, fi * 4.1 + 3.9), z);
        p = p + vec2<f32>(nx, ny) * disp;
    }
    return p;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    var res = params.resolution;
    if (res.x < 1.0) { res = vec2<f32>(1024.0, 1024.0); }
    var st = (position.xy + params.tileOffset) / params.fullResolution;
    // Center UVs so zoom scales from center, not corner
    st = st - 0.5;
    st.x = st.x * params.aspect;
    // Invert scale to match vnoise convention: higher scale = fewer cells (zoomed in)
    let freq = max(0.1, 100.0 / max(params.scale, 0.01));
    st = st * freq;
    // Offset to keep noise coords positive (avoids hash artifacts at boundaries)
    st = st + 1000.0;

    // time is 0-1 representing position around circle for seamless looping
    // speed multiplies the time to control animation speed
    let timeAngle = params.time * params.speed * TAU;

    // Apply domain warp if enabled
    if (params.warpIterations > 0) {
        if (DIMENSIONS == 2) {
            st = domainWarp2D(st, timeAngle, params.warpIterations, params.warpScale, params.warpIntensity);
        } else {
            let z = timeAngle / TAU * Z_PERIOD;
            st = domainWarp3D(st, z, params.warpIterations, params.warpScale, params.warpIntensity);
        }
    }

    var r: f32;
    var g: f32;
    var b: f32;

    if (DIMENSIONS == 2) {
        // 2D periodic noise (faster)
        r = fbm2D(st, timeAngle, 0.0, params.ridges);
        g = fbm2D(st, timeAngle, 0.333, params.ridges);
        b = fbm2D(st, timeAngle, 0.667, params.ridges);
    } else {
        // 3D cross-section noise (original)
        r = fbm3D(st, timeAngle, 0.0, params.ridges);
        g = fbm3D(st, timeAngle, 1.33, params.ridges);
        b = fbm3D(st, timeAngle, 2.67, params.ridges);
    }

    var col: vec3<f32>;
    if (params.colorMode == 0) {
        // Mono mode
        col = vec3<f32>(r);
    } else {
        // RGB mode
        col = vec3<f32>(r, g, b);
    }

    return vec4<f32>(col, 1.0);
}
`}},o=`# perlin

Perlin-like noise with a periodic Z

## Description

Generates classic Perlin gradient noise with optional fractal octaves. Supports 2D and 3D dimensions with animated looping through the Z axis.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | float | 25 | 0-100 | - |
| octaves | int | 1 | 1-6 | - |
| colorMode | int | rgb | mono/rgb | Color mode |
| dimensions | int | 2 | 2-3 | - |
| ridges | boolean | false | - | - |
| warpIterations | int | 0 | 0-4 | Domain warp iterations (0 = off) |
| warpScale | float | 50 | 0-100 | Warp noise frequency |
| warpIntensity | float | 50 | 0-100 | Warp displacement amount |
| seed | int | 0 | 0-100 | - |
| speed | int | 1 | 0-5 | - |

## Notes

- **Domain warp** displaces coordinates using noise before computing the main perlin noise, creating organic swirling distortion
- Higher iterations produce more complex, folded patterns
- warpScale controls the frequency of the warp noise relative to the base noise
- warpIntensity controls how far coordinates are displaced

## Usage

\`\`\`
search synth

perlin()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(a))e.shaders[i]={...n}}e&&o&&(e.help=o);var c="synth/perlin",p="synth",m="perlin",d=e;export{d as default,c as effectId,m as effectName,o as help,p as namespace};
