/* synth3d/noise3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Noise3D",namespace:"synth3d",func:"noise3d",tags:["3d","noise"],description:"3D simplex noise volume",textures:{volumeCache:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},scale:{type:"float",default:3,min:0,max:100,uniform:"scale",ui:{label:"scale"}},octaves:{type:"int",default:1,min:1,max:6,define:"OCTAVES",ui:{label:"octaves"}},colorMode:{type:"int",default:0,define:"COLOR_MODE",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}},ridges:{type:"boolean",default:!1,define:"RIDGES",ui:{label:"ridges"}},seed:{type:"int",default:0,min:0,max:100,uniform:"seed",ui:{label:"seed"}},speed:{type:"int",default:1,min:0,max:5,zero:0,uniform:"speed",ui:{label:"speed"}}},passes:[{name:"precompute",program:"precompute",drawBuffers:2,viewport:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096}},inputs:{},outputs:{color:"volumeCache",geoOut:"geoBuffer"}}],outputGeo:"geoBuffer",outputTex3d:"volumeCache"});var o={precompute:{glsl:`#version 300 es
precision highp float;

// OCTAVES, COLOR_MODE, RIDGES are compile-time #defines injected by the
// expander. Baking them lets the GLSL compiler unroll the fbm4D loop and
// dead-code-eliminate the unused color/ridges branches.
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float scale;
uniform int seed;
uniform int volumeSize;
uniform float speed;

// MRT outputs: volume cache and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

// Volume dimensions - stored as 2D atlas
// Atlas layout: volumeSize x (volumeSize * volumeSize)
// Pixel (x, y) maps to 3D coordinate (x, y % volumeSize, y / volumeSize)

const float TAU = 6.283185307179586;
const float W_PERIOD = 4.0;  // Period length in w-axis lattice units for seamless time loop

// Improved hash using multiple rounds of mixing (4D version)
float hash4(vec4 p) {
    vec4 ps = p + float(seed) * 0.1;
    uvec4 q = uvec4(ivec4(ps * 1000.0) + 65536);
    q = q * 1664525u + 1013904223u;
    q.x += q.y * q.z;
    q.y += q.z * q.w;
    q.z += q.w * q.x;
    q.w += q.x * q.y;
    q ^= q >> 16u;
    q.x += q.y * q.z;
    q.y += q.z * q.w;
    q.z += q.w * q.x;
    q.w += q.x * q.y;
    return float(q.x ^ q.y ^ q.z ^ q.w) / 4294967295.0;
}

// Gradient from hash - returns normalized 4D vector
vec4 grad4(vec4 p) {
    float h1 = hash4(p);
    float h2 = hash4(p + 127.1);
    float h3 = hash4(p + 269.5);
    float h4 = hash4(p + 419.2);
    vec4 g = vec4(
        h1 * 2.0 - 1.0,
        h2 * 2.0 - 1.0,
        h3 * 2.0 - 1.0,
        h4 * 2.0 - 1.0
    );
    return normalize(g);
}

// Quintic interpolation for smooth transitions
float quintic(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Wrap w index for periodicity at lattice level
float wrapW(float w) {
    return mod(w, W_PERIOD);
}

// 4D gradient noise - Perlin-style with quintic interpolation
// w-axis is periodic with period W_PERIOD for seamless time looping
float noise4D(vec4 p) {
    vec4 i = floor(p);
    vec4 f = fract(p);
    
    vec4 u = vec4(quintic(f.x), quintic(f.y), quintic(f.z), quintic(f.w));
    
    // Wrap w indices for periodicity
    float iw0 = wrapW(i.w);
    float iw1 = wrapW(i.w + 1.0);
    
    // 16 corners of 4D hypercube with wrapped w
    // w=0 corners
    float n0000 = dot(grad4(vec4(i.xyz, iw0) + vec4(0,0,0,0)), f - vec4(0,0,0,0));
    float n1000 = dot(grad4(vec4(i.xyz, iw0) + vec4(1,0,0,0)), f - vec4(1,0,0,0));
    float n0100 = dot(grad4(vec4(i.xyz, iw0) + vec4(0,1,0,0)), f - vec4(0,1,0,0));
    float n1100 = dot(grad4(vec4(i.xyz, iw0) + vec4(1,1,0,0)), f - vec4(1,1,0,0));
    float n0010 = dot(grad4(vec4(i.xyz, iw0) + vec4(0,0,1,0)), f - vec4(0,0,1,0));
    float n1010 = dot(grad4(vec4(i.xyz, iw0) + vec4(1,0,1,0)), f - vec4(1,0,1,0));
    float n0110 = dot(grad4(vec4(i.xyz, iw0) + vec4(0,1,1,0)), f - vec4(0,1,1,0));
    float n1110 = dot(grad4(vec4(i.xyz, iw0) + vec4(1,1,1,0)), f - vec4(1,1,1,0));
    // w=1 corners
    float n0001 = dot(grad4(vec4(i.xyz, iw1) + vec4(0,0,0,0)), f - vec4(0,0,0,1));
    float n1001 = dot(grad4(vec4(i.xyz, iw1) + vec4(1,0,0,0)), f - vec4(1,0,0,1));
    float n0101 = dot(grad4(vec4(i.xyz, iw1) + vec4(0,1,0,0)), f - vec4(0,1,0,1));
    float n1101 = dot(grad4(vec4(i.xyz, iw1) + vec4(1,1,0,0)), f - vec4(1,1,0,1));
    float n0011 = dot(grad4(vec4(i.xyz, iw1) + vec4(0,0,1,0)), f - vec4(0,0,1,1));
    float n1011 = dot(grad4(vec4(i.xyz, iw1) + vec4(1,0,1,0)), f - vec4(1,0,1,1));
    float n0111 = dot(grad4(vec4(i.xyz, iw1) + vec4(0,1,1,0)), f - vec4(0,1,1,1));
    float n1111 = dot(grad4(vec4(i.xyz, iw1) + vec4(1,1,1,0)), f - vec4(1,1,1,1));
    
    // Quadrilinear interpolation
    // First along x
    float nx000 = mix(n0000, n1000, u.x);
    float nx100 = mix(n0100, n1100, u.x);
    float nx010 = mix(n0010, n1010, u.x);
    float nx110 = mix(n0110, n1110, u.x);
    float nx001 = mix(n0001, n1001, u.x);
    float nx101 = mix(n0101, n1101, u.x);
    float nx011 = mix(n0011, n1011, u.x);
    float nx111 = mix(n0111, n1111, u.x);
    
    // Then along y
    float nxy00 = mix(nx000, nx100, u.y);
    float nxy10 = mix(nx010, nx110, u.y);
    float nxy01 = mix(nx001, nx101, u.y);
    float nxy11 = mix(nx011, nx111, u.y);
    
    // Then along z
    float nxyz0 = mix(nxy00, nxy10, u.z);
    float nxyz1 = mix(nxy01, nxy11, u.z);
    
    // Finally along w
    return mix(nxyz0, nxyz1, u.w);
}

// FBM using 4D noise with periodic w for time. OCTAVES is a compile-time
// #define so the loop bound is static; RIDGES likewise lets the per-octave
// branch get DCE'd.
float fbm4D(vec4 p) {
    float amplitude = 0.5;
    float frequency = 1.0;
    float sum = 0.0;
    float maxVal = 0.0;

    for (int i = 0; i < OCTAVES; i++) {
        vec4 pos = vec4(p.xyz * frequency, p.w);
        float n = noise4D(pos);
        n = clamp(n * 1.5, -1.0, 1.0);
        if (RIDGES) {
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

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    // Use uniform for volume size
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Atlas is volSize x (volSize * volSize)
    // Pixel (x, y) maps to 3D coordinate (x, y % volSize, y / volSize)
    
    ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
    
    int x = pixelCoord.x;
    int y = pixelCoord.y % volSize;
    int z = pixelCoord.y / volSize;
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        fragColor = vec4(0.0);
        geoOut = vec4(0.5, 0.5, 0.5, 0.0);  // neutral normal, zero density
        return;
    }
    
    // Convert to normalized 3D coordinates in [-1, 1] world space (bounding box)
    // This matches the bounding box used in the main raymarching shader
    vec3 p = vec3(float(x), float(y), float(z)) / (volSizeF - 1.0) * 2.0 - 1.0;
    
    // Scale for noise density (same as main shader)
    vec3 scaledP = p * scale;
    
    // Linear time traversal with periodic w-axis
    // time goes 0->1, map to 0->W_PERIOD for one complete loop
    // speed multiplies time to control animation speed
    float w = time * speed * W_PERIOD;
    
    // Compute 4D FBM noise at this point with time as w
    vec4 p4d = vec4(scaledP, w);
    float noiseVal = fbm4D(p4d);

    // Compute analytical gradient using finite differences in noise space
    // Use small epsilon scaled to the noise frequency
    float eps = 0.01 / scale;
    float nx = fbm4D(vec4(scaledP + vec3(eps, 0.0, 0.0), w));
    float ny = fbm4D(vec4(scaledP + vec3(0.0, eps, 0.0), w));
    float nz = fbm4D(vec4(scaledP + vec3(0.0, 0.0, eps), w));

    // Gradient points from low to high density
    vec3 gradient = vec3(nx - noiseVal, ny - noiseVal, nz - noiseVal) / eps;

    // Normal points outward (from high to low density), encode in [0,1] range
    vec3 normal = normalize(-gradient + vec3(1e-6));

    // Output volume data based on COLOR_MODE (compile-time #define).
    if (COLOR_MODE == 0) {
        fragColor = vec4(noiseVal, noiseVal, noiseVal, 1.0);
    } else {
        // For RGB color mode, compute 3 different noise channels with offsets
        float g = fbm4D(vec4(scaledP, w) + vec4(0.0, 0.0, 0.0, 1.33));
        float b = fbm4D(vec4(scaledP, w) + vec4(0.0, 0.0, 0.0, 2.67));
        fragColor = vec4(noiseVal, g, b, 1.0);
    }
    
    // Output analytical geometry: normal.xyz encoded [0,1], density in w
    geoOut = vec4(normal * 0.5 + 0.5, noiseVal);
}
`,wgsl:`// WGSL version \u2013 WebGPU
// OCTAVES, COLOR_MODE, RIDGES are compile-time defines injected by the
// expander (see definition.js). They drove a ~1.7s background compile in
// Dawn before being promoted; baking them lets the optimizer fully unroll
// the fbm4D octave loop, dead-code-eliminate the unused color/ridges
// branches, and drop the overall compile cost dramatically.
@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> scale: f32;
@group(0) @binding(2) var<uniform> seed: i32;
@group(0) @binding(3) var<uniform> volumeSize: i32;
@group(0) @binding(4) var<uniform> speed: f32;

// MRT output structure
struct FragmentOutput {
    @location(0) fragColor: vec4<f32>,
    @location(1) geoOut: vec4<f32>,
}

// Volume dimensions - stored as 2D atlas
// Atlas layout: volumeSize x (volumeSize * volumeSize)

const TAU: f32 = 6.283185307179586;
const W_PERIOD: f32 = 4.0;  // Period length in w-axis lattice units for seamless time loop

// Improved hash using multiple rounds of mixing (4D version)
fn hash4(p: vec4<f32>) -> f32 {
    let ps = p + f32(seed) * 0.1;
    var q = vec4<u32>(vec4<i32>(ps * 1000.0) + 65536);
    q = q * 1664525u + 1013904223u;
    q.x = q.x + q.y * q.z;
    q.y = q.y + q.z * q.w;
    q.z = q.z + q.w * q.x;
    q.w = q.w + q.x * q.y;
    q = q ^ (q >> vec4<u32>(16u));
    q.x = q.x + q.y * q.z;
    q.y = q.y + q.z * q.w;
    q.z = q.z + q.w * q.x;
    q.w = q.w + q.x * q.y;
    return f32(q.x ^ q.y ^ q.z ^ q.w) / 4294967295.0;
}

// Gradient from hash - returns normalized 4D vector
fn grad4(p: vec4<f32>) -> vec4<f32> {
    let h1 = hash4(p);
    let h2 = hash4(p + 127.1);
    let h3 = hash4(p + 269.5);
    let h4 = hash4(p + 419.2);
    let g = vec4<f32>(
        h1 * 2.0 - 1.0,
        h2 * 2.0 - 1.0,
        h3 * 2.0 - 1.0,
        h4 * 2.0 - 1.0
    );
    return normalize(g);
}

// Quintic interpolation for smooth transitions
fn quintic(t: f32) -> f32 {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Wrap w index for periodicity at lattice level
fn wrapW(w: f32) -> f32 {
    return (w % W_PERIOD + W_PERIOD) % W_PERIOD;
}

// 4D gradient noise - Perlin-style with quintic interpolation
// w-axis is periodic with period W_PERIOD for seamless time looping
fn noise4D(p: vec4<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    let u = vec4<f32>(quintic(f.x), quintic(f.y), quintic(f.z), quintic(f.w));
    
    // Wrap w indices for periodicity
    let iw0 = wrapW(i.w);
    let iw1 = wrapW(i.w + 1.0);
    
    // 16 corners of 4D hypercube with wrapped w
    // w=0 corners
    let n0000 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(0.0, 0.0, 0.0, 0.0)), f - vec4<f32>(0.0, 0.0, 0.0, 0.0));
    let n1000 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(1.0, 0.0, 0.0, 0.0)), f - vec4<f32>(1.0, 0.0, 0.0, 0.0));
    let n0100 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(0.0, 1.0, 0.0, 0.0)), f - vec4<f32>(0.0, 1.0, 0.0, 0.0));
    let n1100 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(1.0, 1.0, 0.0, 0.0)), f - vec4<f32>(1.0, 1.0, 0.0, 0.0));
    let n0010 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(0.0, 0.0, 1.0, 0.0)), f - vec4<f32>(0.0, 0.0, 1.0, 0.0));
    let n1010 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(1.0, 0.0, 1.0, 0.0)), f - vec4<f32>(1.0, 0.0, 1.0, 0.0));
    let n0110 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(0.0, 1.0, 1.0, 0.0)), f - vec4<f32>(0.0, 1.0, 1.0, 0.0));
    let n1110 = dot(grad4(vec4<f32>(i.xyz, iw0) + vec4<f32>(1.0, 1.0, 1.0, 0.0)), f - vec4<f32>(1.0, 1.0, 1.0, 0.0));
    // w=1 corners
    let n0001 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(0.0, 0.0, 0.0, 0.0)), f - vec4<f32>(0.0, 0.0, 0.0, 1.0));
    let n1001 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(1.0, 0.0, 0.0, 0.0)), f - vec4<f32>(1.0, 0.0, 0.0, 1.0));
    let n0101 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(0.0, 1.0, 0.0, 0.0)), f - vec4<f32>(0.0, 1.0, 0.0, 1.0));
    let n1101 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(1.0, 1.0, 0.0, 0.0)), f - vec4<f32>(1.0, 1.0, 0.0, 1.0));
    let n0011 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(0.0, 0.0, 1.0, 0.0)), f - vec4<f32>(0.0, 0.0, 1.0, 1.0));
    let n1011 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(1.0, 0.0, 1.0, 0.0)), f - vec4<f32>(1.0, 0.0, 1.0, 1.0));
    let n0111 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(0.0, 1.0, 1.0, 0.0)), f - vec4<f32>(0.0, 1.0, 1.0, 1.0));
    let n1111 = dot(grad4(vec4<f32>(i.xyz, iw1) + vec4<f32>(1.0, 1.0, 1.0, 0.0)), f - vec4<f32>(1.0, 1.0, 1.0, 1.0));
    
    // Quadrilinear interpolation
    // First along x
    let nx000 = mix(n0000, n1000, u.x);
    let nx100 = mix(n0100, n1100, u.x);
    let nx010 = mix(n0010, n1010, u.x);
    let nx110 = mix(n0110, n1110, u.x);
    let nx001 = mix(n0001, n1001, u.x);
    let nx101 = mix(n0101, n1101, u.x);
    let nx011 = mix(n0011, n1011, u.x);
    let nx111 = mix(n0111, n1111, u.x);
    
    // Then along y
    let nxy00 = mix(nx000, nx100, u.y);
    let nxy10 = mix(nx010, nx110, u.y);
    let nxy01 = mix(nx001, nx101, u.y);
    let nxy11 = mix(nx011, nx111, u.y);
    
    // Then along z
    let nxyz0 = mix(nxy00, nxy10, u.z);
    let nxyz1 = mix(nxy01, nxy11, u.z);
    
    // Finally along w
    return mix(nxyz0, nxyz1, u.w);
}

// FBM using 4D noise with periodic w for time.
// OCTAVES is a compile-time const so the loop bound is static and the
// optimizer fully unrolls it. RIDGES is a compile-time bool so the per-octave
// branch is dead-code-eliminated.
fn fbm4D(p: vec4<f32>) -> f32 {
    var amplitude: f32 = 0.5;
    var frequency: f32 = 1.0;
    var sum: f32 = 0.0;
    var maxVal: f32 = 0.0;

    for (var i: i32 = 0; i < OCTAVES; i = i + 1) {
        let pos = vec4<f32>(p.xyz * frequency, p.w);
        var n = noise4D(pos);
        n = clamp(n * 1.5, -1.0, 1.0);
        if (RIDGES) {
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

@fragment
fn main(@builtin(position) position: vec4<f32>) -> FragmentOutput {
    // Use uniform for volume size
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    // Atlas is volSize x (volSize * volSize)
    // Pixel (x, y) maps to 3D coordinate (x, y % volSize, y / volSize)
    
    let pixelCoord = vec2<i32>(position.xy);
    
    let x = pixelCoord.x;
    let y = pixelCoord.y % volSize;
    let z = pixelCoord.y / volSize;
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        return FragmentOutput(vec4<f32>(0.0), vec4<f32>(0.5, 0.5, 0.5, 0.0));
    }
    
    // Convert to normalized 3D coordinates in [-1, 1] world space (bounding box)
    let p = vec3<f32>(f32(x), f32(y), f32(z)) / (volSizeF - 1.0) * 2.0 - 1.0;
    
    // Scale for noise density
    let scaledP = p * scale;
    
    // Linear time traversal with periodic w-axis
    // time goes 0->1, map to 0->W_PERIOD for one complete loop
    // speed multiplies time to control animation speed
    let w = time * speed * W_PERIOD;
    
    // Compute 4D FBM noise at this point with time as w
    let p4d = vec4<f32>(scaledP, w);
    let noiseVal = fbm4D(p4d);

    // Compute analytical gradient using finite differences in noise space
    let eps = 0.01 / scale;
    let nx = fbm4D(vec4<f32>(scaledP + vec3<f32>(eps, 0.0, 0.0), w));
    let ny = fbm4D(vec4<f32>(scaledP + vec3<f32>(0.0, eps, 0.0), w));
    let nz = fbm4D(vec4<f32>(scaledP + vec3<f32>(0.0, 0.0, eps), w));

    // Gradient points from low to high density
    let gradient = vec3<f32>(nx - noiseVal, ny - noiseVal, nz - noiseVal) / eps;

    // Normal points outward (from high to low density), encode in [0,1] range
    let normal = normalize(-gradient + vec3<f32>(1e-6));

    // Output volume data based on colorMode (compile-time const).
    var fragColor: vec4<f32>;
    if (COLOR_MODE == 0) {
        fragColor = vec4<f32>(noiseVal, noiseVal, noiseVal, 1.0);
    } else {
        // For RGB color mode, compute 3 different noise channels with offsets
        let g = fbm4D(vec4<f32>(scaledP, w) + vec4<f32>(0.0, 0.0, 0.0, 1.33));
        let b = fbm4D(vec4<f32>(scaledP, w) + vec4<f32>(0.0, 0.0, 0.0, 2.67));
        fragColor = vec4<f32>(noiseVal, g, b, 1.0);
    }
    
    // Output analytical geometry: normal.xyz encoded [0,1], density in w
    let geoOut = vec4<f32>(normal * 0.5 + 0.5, noiseVal);
    
    return FragmentOutput(fragColor, geoOut);
}`}},a=`# noise3d

3D simplex noise volume

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x64 | x16/x32/x64/x128 | Volume size |
| scale | float | 3 | 0-100 | - |
| octaves | int | 1 | 1-6 | - |
| colorMode | int | mono | mono/rgb | Color mode |
| ridges | boolean | false | - | - |
| seed | int | 0 | 0-100 | - |
| speed | int | 1 | 0-5 | - |

## Usage

\`\`\`
search synth3d, filter3d, render

noise3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(o))n.shaders[i]={...e}}n&&a&&(n.help=a);var c="synth3d/noise3d",d="synth3d",u="noise3d",m=n;export{m as default,c as effectId,u as effectName,a as help,d as namespace};
