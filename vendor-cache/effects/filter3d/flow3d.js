/* filter3d/flow3d */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Flow3D",namespace:"filter3d",func:"flow3d",tags:["3d","sim"],description:"3D agent-based flow field",textures:{volumeCache:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},global_flow3d_state1:{width:512,height:512,format:"rgba16f"},global_flow3d_state2:{width:512,height:512,format:"rgba16f"},global_flow3d_state3:{width:512,height:512,format:"rgba16f"},global_flow3d_trail:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},global_flow3d_blended:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:32,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},ui:{label:"volume size",control:"dropdown"}},behavior:{type:"int",default:1,define:"BEHAVIOR",choices:{none:0,obedient:1,crosshatch:2,unruly:3,chaotic:4,randomMix:5,meandering:10},ui:{label:"behavior",control:"dropdown"}},density:{type:"float",default:20,uniform:"density",min:1,max:100,step:1,ui:{label:"density",control:"slider"}},stride:{type:"float",default:1,uniform:"stride",min:.1,max:10,step:.1,ui:{label:"stride",control:"slider"}},strideDeviation:{type:"float",default:.05,uniform:"strideDeviation",min:0,max:.5,step:.01,ui:{label:"deviation",control:"slider"}},kink:{type:"float",default:1,uniform:"kink",min:0,max:10,step:.1,ui:{label:"kink",control:"slider"}},intensity:{type:"float",default:90,uniform:"intensity",min:0,max:100,step:1,ui:{label:"persistence",control:"slider"}},inputIntensity:{type:"float",default:50,uniform:"inputIntensity",min:0,max:100,step:1,ui:{label:"input mix",control:"slider"}},lifetime:{type:"float",default:30,uniform:"lifetime",min:0,max:60,step:1,ui:{label:"lifetime",control:"slider"}}},passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{stateTex1:"global_flow3d_state1",stateTex2:"global_flow3d_state2",stateTex3:"global_flow3d_state3",mixerTex:"inputTex3d",inputGeoTex:"inputGeo"},uniforms:{density:"density",stride:"stride",strideDeviation:"strideDeviation",kink:"kink",lifetime:"lifetime",volumeSize:"volumeSize"},outputs:{outState1:"global_flow3d_state1",outState2:"global_flow3d_state2",outState3:"global_flow3d_state3"}},{name:"diffuse",program:"diffuse",viewport:{width:{param:"volumeSize",default:32,inputOverride:"inputTex3d"},height:{param:"volumeSize",power:2,default:1024,inputOverride:"inputTex3d"}},inputs:{sourceTex:"global_flow3d_trail"},uniforms:{intensity:"intensity"},outputs:{fragColor:"global_flow3d_trail"}},{name:"copy",program:"copy",viewport:{width:{param:"volumeSize",default:32,inputOverride:"inputTex3d"},height:{param:"volumeSize",power:2,default:1024,inputOverride:"inputTex3d"}},inputs:{sourceTex:"global_flow3d_trail"},outputs:{fragColor:"global_flow3d_trail"}},{name:"deposit",program:"deposit",drawMode:"points",count:262144,blend:!0,viewport:{width:{param:"volumeSize",default:32,inputOverride:"inputTex3d"},height:{param:"volumeSize",power:2,default:1024,inputOverride:"inputTex3d"}},inputs:{stateTex1:"global_flow3d_state1",stateTex2:"global_flow3d_state2"},uniforms:{density:"density",volumeSize:"volumeSize"},outputs:{fragColor:"global_flow3d_trail"}},{name:"blend",program:"blend",viewport:{width:{param:"volumeSize",default:32,inputOverride:"inputTex3d"},height:{param:"volumeSize",power:2,default:1024,inputOverride:"inputTex3d"}},inputs:{mixerTex:"inputTex3d",trailTex:"global_flow3d_trail"},uniforms:{inputIntensity:"inputIntensity"},outputs:{fragColor:"global_flow3d_blended"}}],outputGeo:"geoBuffer",outputTex3d:"global_flow3d_blended"});var a={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;
/*
 * Flow3D agent pass - Direct and faithful port of nu/flow agent.glsl to 3D
 * 
 * Agent format (matching 2D flow):
 * - state1: [x, y, z, rotRand]        - 3D position + per-agent rotation random
 * - state2: [r, g, b, seed]           - color + seed
 * - state3: [age, initialized, strideRand, 0] - age, init flag, per-agent stride random
 */

// BEHAVIOR is a compile-time define injected by the runtime (see
// definition.js \`globals.behavior.define\`). Same Knob 2 rationale as the
// rest of the series: the 7-way computeRotationBias() dispatch was a
// runtime uniform int that HLSL inlined at every call site (once per agent
// per frame). Baking it lets ANGLE emit only one rotation-bias branch.
#ifndef BEHAVIOR
#define BEHAVIOR 1
#endif

uniform sampler2D stateTex1;
uniform sampler2D stateTex2;
uniform sampler2D stateTex3;
uniform sampler2D mixerTex;
uniform float stride;
uniform float strideDeviation;
uniform float kink;
uniform float time;
uniform float lifetime;
uniform float density;
uniform int volumeSize;

layout(location = 0) out vec4 outState1;
layout(location = 1) out vec4 outState2;
layout(location = 2) out vec4 outState3;

const float TAU = 6.283185307179586;
const float PI = 3.141592653589793;
const float RIGHT_ANGLE = 1.5707963267948966;

uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

vec3 hash3(uint seed) {
    return vec3(hash(seed), hash(seed + 1u), hash(seed + 2u));
}

float wrap_float(float value, float size) {
    if (size <= 0.0) return 0.0;
    float scaled = floor(value / size);
    float wrapped = value - scaled * size;
    if (wrapped < 0.0) wrapped += size;
    return wrapped;
}

int wrap_int(int value, int size) {
    if (size <= 0) return 0;
    int result = value % size;
    if (result < 0) result += size;
    return result;
}

// Convert 3D voxel coord to 2D atlas texel coord
ivec2 atlasTexel(ivec3 p, int volSize) {
    ivec3 clamped = clamp(p, ivec3(0), ivec3(volSize - 1));
    return ivec2(clamped.x, clamped.y + clamped.z * volSize);
}

// Sample 3D volume at integer voxel position (matching 2D texelFetch pattern)
vec4 sampleVoxel(ivec3 voxel, int volSize) {
    ivec3 clamped = clamp(voxel, ivec3(0), ivec3(volSize - 1));
    return texelFetch(mixerTex, atlasTexel(clamped, volSize), 0);
}

// sRGB to linear conversion
float srgb_to_linear(float value) {
    if (value <= 0.04045) return value / 12.92;
    return pow((value + 0.055) / 1.055, 2.4);
}

float cube_root(float value) {
    if (value == 0.0) return 0.0;
    float sign_value = value >= 0.0 ? 1.0 : -1.0;
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

// OKLab L (luminance) from RGB - exact match from 2D flow
float oklab_l(vec3 rgb) {
    float r_lin = srgb_to_linear(clamp(rgb.x, 0.0, 1.0));
    float g_lin = srgb_to_linear(clamp(rgb.y, 0.0, 1.0));
    float b_lin = srgb_to_linear(clamp(rgb.z, 0.0, 1.0));
    float l = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    float m = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    float s = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;
    return 0.2104542553 * cube_root(l) + 0.7936177850 * cube_root(m) - 0.0040720468 * cube_root(s);
}

float normalized_sine(float value) {
    return (sin(value) + 1.0) * 0.5;
}

// Compute rotation bias based on BEHAVIOR compile-time define - direct port
// from 2D flow. For 3D, we use this for azimuthal angle, same logic as 2D.
// Only the active BEHAVIOR branch compiles into the pipeline.
float computeRotationBias(float baseHeading, float baseRotRand, float time, int agentIndex, int totalAgents) {
#if BEHAVIOR <= 0
    return 0.0;
#elif BEHAVIOR == 1
    // Obedient: all same direction
    return baseHeading;
#elif BEHAVIOR == 2
    // Crosshatch: 4 cardinal directions (same as 2D)
    return baseHeading + floor(baseRotRand * 4.0) * RIGHT_ANGLE;
#elif BEHAVIOR == 3
    // Unruly: small deviation from base
    return baseHeading + (baseRotRand - 0.5) * 0.25;
#elif BEHAVIOR == 4
    // Chaotic: random direction
    return baseRotRand * TAU;
#elif BEHAVIOR == 5
    // Random Mix: divide agents into 4 quarters
    int quarterSize = max(1, totalAgents / 4);
    int band = agentIndex / quarterSize;
    if (band <= 0) {
        return baseHeading;
    } else if (band == 1) {
        return baseHeading + floor(baseRotRand * 4.0) * RIGHT_ANGLE;
    } else if (band == 2) {
        return baseHeading + (baseRotRand - 0.5) * 0.25;
    } else {
        return baseRotRand * TAU;
    }
#elif BEHAVIOR == 10
    // Meandering
    return normalized_sine((time - baseRotRand) * TAU);
#else
    return baseRotRand * TAU;
#endif
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    // Use actual state texture size, not canvas resolution
    ivec2 stateTexSize = textureSize(stateTex1, 0);
    int width = stateTexSize.x;
    int height = stateTexSize.y;
    
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Read current agent state
    vec4 state1 = texelFetch(stateTex1, coord, 0);  // x, y, z, rotRand
    vec4 state2 = texelFetch(stateTex2, coord, 0);  // r, g, b, seed
    vec4 state3 = texelFetch(stateTex3, coord, 0);  // age, initialized, strideRand, 0
    
    float flow_x = state1.x;
    float flow_y = state1.y;
    float flow_z = state1.z;
    float rotRand = state1.w;  // Per-agent random [0,1] for rotation variation
    float cr = state2.x;
    float cg = state2.y;
    float cb = state2.z;
    float seed_f = state2.w;
    float age = state3.x;
    float initialized = state3.y;
    float strideRand = state3.z;  // Per-agent random [-0.5, 0.5] for stride variation
    
    uint agentSeed = uint(coord.x + coord.y * width);
    uint baseSeed = agentSeed + uint(time * 1000.0);
    
    int totalAgents = width * height;
    int agentIndex = coord.x + coord.y * width;
    
    // Check if this agent needs initialization
    if (initialized < 0.5) {
        // Initialize agent at random 3D position within volume
        vec3 pos = hash3(agentSeed);
        flow_x = pos.x * volSizeF;
        flow_y = pos.y * volSizeF;
        flow_z = pos.z * volSizeF;
        
        // Store per-agent random [0,1] for rotation variation
        rotRand = hash(agentSeed + 200u);
        
        // Store per-agent random value for stride deviation
        strideRand = hash(agentSeed + 300u) - 0.5;  // Range [-0.5, 0.5]
        
        // Sample color from input 3D volume
        int xi = wrap_int(int(flow_x), volSize);
        int yi = wrap_int(int(flow_y), volSize);
        int zi = wrap_int(int(flow_z), volSize);
        vec4 inputColor = sampleVoxel(ivec3(xi, yi, zi), volSize);
        cr = inputColor.r;
        cg = inputColor.g;
        cb = inputColor.b;
        
        seed_f = float(agentSeed);
        age = 0.0;
        initialized = 1.0;
    }
    
    // Check for respawn based on lifetime
    float agentPhase = float(agentIndex) / float(max(totalAgents, 1));
    float staggeredAge = age + agentPhase * lifetime;
    
    bool shouldRespawn = lifetime > 0.0 && staggeredAge >= lifetime;
    
    if (shouldRespawn) {
        // Respawn at new random location
        vec3 pos = hash3(baseSeed);
        flow_x = pos.x * volSizeF;
        flow_y = pos.y * volSizeF;
        flow_z = pos.z * volSizeF;
        
        // New random for rotation variation
        rotRand = hash(baseSeed + 200u);
        
        // Sample new color from input 3D volume
        int xi = wrap_int(int(flow_x), volSize);
        int yi = wrap_int(int(flow_y), volSize);
        int zi = wrap_int(int(flow_z), volSize);
        vec4 inputColor = sampleVoxel(ivec3(xi, yi, zi), volSize);
        cr = inputColor.r;
        cg = inputColor.g;
        cb = inputColor.b;
        
        age = 0.0;
    }
    
    // Sample input texture at current position for flow direction
    // This is THE KEY: luminance of input determines agent direction
    int xi = wrap_int(int(flow_x), volSize);
    int yi = wrap_int(int(flow_y), volSize);
    int zi = wrap_int(int(flow_z), volSize);
    vec4 texel = sampleVoxel(ivec3(xi, yi, zi), volSize);
    float indexValue = oklab_l(texel.rgb);
    
    // Compute rotation bias based on BEHAVIOR compile-time define
    float baseHeading = hash(0u) * TAU;
    float rotationBias = computeRotationBias(baseHeading, rotRand, time, agentIndex, totalAgents);
    
    // For 3D: azimuth angle (XY plane) - direct extension of 2D angle
    float azimuth = indexValue * TAU * kink + rotationBias;
    
    // Elevation: use indexValue to modulate vertical movement
    // This extends the 2D angle concept to 3D
    float elevation = (indexValue - 0.5) * PI * kink * 0.5;
    
    // Compute stride with deviation (exact match to 2D flow)
    float scale = max(volSizeF / 64.0, 1.0);
    float devFactor = 1.0 + strideRand * 2.0 * strideDeviation;
    float actualStride = max(0.1, stride * scale * devFactor);
    
    // Move agent in 3D (extending 2D sin/cos to include Z)
    float cosElev = cos(elevation);
    float newX = flow_x + sin(azimuth) * cosElev * actualStride;
    float newY = flow_y + cos(azimuth) * cosElev * actualStride;
    float newZ = flow_z + sin(elevation) * actualStride;
    
    // Wrap position within volume
    newX = wrap_float(newX, volSizeF);
    newY = wrap_float(newY, volSizeF);
    newZ = wrap_float(newZ, volSizeF);
    
    age += 0.016;  // Approximate frame time
    
    // Output updated state
    outState1 = vec4(newX, newY, newZ, rotRand);
    outState2 = vec4(cr, cg, cb, seed_f);
    outState3 = vec4(age, initialized, strideRand, 0.0);
}
`,wgsl:`/*
 * Flow3D agent pass (WGSL) - 3D GPGPU agent simulation with MRT output
 * 
 * Agent format:
 * - state1: [x, y, z, rotRand]     - 3D position + rotation randomness
 * - state2: [r, g, b, seed]        - color + seed
 * - state3: [age, initialized, theta, phi] - age, init flag, spherical angles
 */

struct Outputs {
    @location(0) outState1: vec4<f32>,
    @location(1) outState2: vec4<f32>,
    @location(2) outState3: vec4<f32>,
}

// BEHAVIOR is a compile-time const injected by the runtime via injectDefines
// (see definition.js \`globals.behavior.define\`). Same fix as the GLSL
// backend \u2014 emits only one rotation-bias branch per compiled program. The
// old \`behavior\` binding at @group(0) @binding(9) is removed.

@group(0) @binding(0) var stateTex1: texture_2d<f32>;
@group(0) @binding(1) var stateTex2: texture_2d<f32>;
@group(0) @binding(2) var stateTex3: texture_2d<f32>;
@group(0) @binding(3) var mixerTex: texture_2d<f32>;
@group(0) @binding(4) var<uniform> stride: f32;
@group(0) @binding(5) var<uniform> strideDeviation: f32;
@group(0) @binding(6) var<uniform> kink: f32;
@group(0) @binding(7) var<uniform> time: f32;
@group(0) @binding(8) var<uniform> lifetime: f32;
@group(0) @binding(10) var<uniform> volumeSize: i32;

const TAU: f32 = 6.283185307179586;
const PI: f32 = 3.141592653589793;
const RIGHT_ANGLE: f32 = 1.5707963267948966;

fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

fn hash3(seed: u32) -> vec3<f32> {
    return vec3<f32>(hash(seed), hash(seed + 1u), hash(seed + 2u));
}

fn wrap_float(value: f32, size: f32) -> f32 {
    if (size <= 0.0) { return 0.0; }
    let scaled = floor(value / size);
    var wrapped = value - scaled * size;
    if (wrapped < 0.0) { wrapped = wrapped + size; }
    return wrapped;
}

fn wrap_int(value: i32, size: i32) -> i32 {
    if (size <= 0) { return 0; }
    var result = value % size;
    if (result < 0) { result = result + size; }
    return result;
}

// Convert 3D voxel coord to 2D atlas texel coord
fn atlasTexel(p: vec3<i32>, volSize: i32) -> vec2<i32> {
    let clamped = clamp(p, vec3<i32>(0), vec3<i32>(volSize - 1));
    return vec2<i32>(clamped.x, clamped.y + clamped.z * volSize);
}

// Sample 3D volume with trilinear interpolation
fn sampleVolume(pos: vec3<f32>, volSize: i32) -> vec4<f32> {
    let volSizeF = f32(volSize);
    let texelPos = clamp(pos, vec3<f32>(0.0), vec3<f32>(volSizeF - 1.0));
    let texelFloor = floor(texelPos);
    let frac = texelPos - texelFloor;
    
    let i0 = vec3<i32>(texelFloor);
    let i1 = min(i0 + 1, vec3<i32>(volSize - 1));
    
    let c000 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i0.x, i0.y, i0.z), volSize), 0);
    let c100 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i1.x, i0.y, i0.z), volSize), 0);
    let c010 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i0.x, i1.y, i0.z), volSize), 0);
    let c110 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i1.x, i1.y, i0.z), volSize), 0);
    let c001 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i0.x, i0.y, i1.z), volSize), 0);
    let c101 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i1.x, i0.y, i1.z), volSize), 0);
    let c011 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i0.x, i1.y, i1.z), volSize), 0);
    let c111 = textureLoad(mixerTex, atlasTexel(vec3<i32>(i1.x, i1.y, i1.z), volSize), 0);
    
    let c00 = mix(c000, c100, frac.x);
    let c10 = mix(c010, c110, frac.x);
    let c01 = mix(c001, c101, frac.x);
    let c11 = mix(c011, c111, frac.x);
    
    let c0 = mix(c00, c10, frac.y);
    let c1 = mix(c01, c11, frac.y);
    
    return mix(c0, c1, frac.z);
}

fn getFallbackColor(pos: vec3<f32>, seed: u32) -> vec3<f32> {
    var col = hash3(seed + u32(pos.x * 10.0 + pos.y * 100.0 + pos.z * 1000.0));
    col = col * 0.5 + 0.25 + hash3(seed) * 0.25;
    return clamp(col, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn srgb_to_linear(value: f32) -> f32 {
    if (value <= 0.04045) { return value / 12.92; }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn cube_root(value: f32) -> f32 {
    if (value == 0.0) { return 0.0; }
    let sign_value = select(-1.0, 1.0, value >= 0.0);
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

fn oklab_l(rgb: vec3<f32>) -> f32 {
    let r_lin = srgb_to_linear(clamp(rgb.x, 0.0, 1.0));
    let g_lin = srgb_to_linear(clamp(rgb.y, 0.0, 1.0));
    let b_lin = srgb_to_linear(clamp(rgb.z, 0.0, 1.0));
    let l = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    let m = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    let s = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;
    return 0.2104542553 * cube_root(l) + 0.7936177850 * cube_root(m) - 0.0040720468 * cube_root(s);
}

fn normalized_sine(value: f32) -> f32 {
    return (sin(value) + 1.0) * 0.5;
}

fn computeRotationBias(baseHeading: f32, baseRotRand: f32, time: f32, agentIndex: i32, totalAgents: i32) -> f32 {
    if (BEHAVIOR <= 0) {
        return 0.0;
    } else if (BEHAVIOR == 1) {
        return baseHeading;
    } else if (BEHAVIOR == 2) {
        // Crosshatch: 4 cardinal directions (PI/2 spacing) to match the 2D
        // reference in points/flow and the GLSL flow3d backend.
        return baseHeading + floor(baseRotRand * 4.0) * RIGHT_ANGLE;
    } else if (BEHAVIOR == 3) {
        return baseHeading + (baseRotRand - 0.5) * 0.25;
    } else if (BEHAVIOR == 4) {
        return baseRotRand * TAU;
    } else if (BEHAVIOR == 5) {
        let quarterSize = max(1, totalAgents / 4);
        let band = agentIndex / quarterSize;
        if (band <= 0) {
            return baseHeading;
        } else if (band == 1) {
            // Also 4 cardinal directions for parity with 2D reference.
            return baseHeading + floor(baseRotRand * 4.0) * RIGHT_ANGLE;
        } else if (band == 2) {
            return baseHeading + (baseRotRand - 0.5) * 0.25;
        } else {
            return baseRotRand * TAU;
        }
    } else if (BEHAVIOR == 10) {
        return normalized_sine((time - baseRotRand) * TAU);
    } else {
        return baseRotRand * TAU;
    }
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> Outputs {
    var output: Outputs;
    
    let coord = vec2<i32>(position.xy);
    // Use actual state texture size, not canvas resolution
    let stateTexSize = textureDimensions(stateTex1, 0);
    let width = i32(stateTexSize.x);
    let height = i32(stateTexSize.y);
    
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    let state1 = textureLoad(stateTex1, coord, 0);
    let state2 = textureLoad(stateTex2, coord, 0);
    let state3 = textureLoad(stateTex3, coord, 0);
    
    var flow_x = state1.x;
    var flow_y = state1.y;
    var flow_z = state1.z;
    var rotRand = state1.w;
    var cr = state2.x;
    var cg = state2.y;
    var cb = state2.z;
    var seed_f = state2.w;
    var age = state3.x;
    var initialized = state3.y;
    var theta = state3.z;
    var phi = state3.w;
    
    let agentSeed = u32(coord.x + coord.y * width);
    let baseSeed = agentSeed + u32(time * 1000.0);
    
    let totalAgents = width * height;
    let agentIndex = coord.x + coord.y * width;
    
    // Initialize agent if needed
    if (initialized < 0.5) {
        let pos = hash3(agentSeed);
        flow_x = pos.x * volSizeF;
        flow_y = pos.y * volSizeF;
        flow_z = pos.z * volSizeF;
        
        rotRand = hash(agentSeed + 200u);
        theta = hash(agentSeed + 300u) * TAU;
        phi = acos(2.0 * hash(agentSeed + 400u) - 1.0);
        
        let inputColor = sampleVolume(vec3<f32>(flow_x, flow_y, flow_z), volSize);
        
        if (length(inputColor.rgb) < 0.01) {
            let fallbackCol = getFallbackColor(vec3<f32>(flow_x, flow_y, flow_z), agentSeed);
            cr = fallbackCol.r;
            cg = fallbackCol.g;
            cb = fallbackCol.b;
        } else {
            cr = inputColor.r;
            cg = inputColor.g;
            cb = inputColor.b;
        }
        
        seed_f = f32(agentSeed);
        age = 0.0;
        initialized = 1.0;
    }
    
    // Check for respawn
    let agentPhase = f32(agentIndex) / f32(max(totalAgents, 1));
    let staggeredAge = age + agentPhase * lifetime;
    let shouldRespawn = lifetime > 0.0 && staggeredAge >= lifetime;
    
    if (shouldRespawn) {
        let pos = hash3(baseSeed);
        flow_x = pos.x * volSizeF;
        flow_y = pos.y * volSizeF;
        flow_z = pos.z * volSizeF;
        
        rotRand = hash(baseSeed + 200u);
        theta = hash(baseSeed + 300u) * TAU;
        phi = acos(2.0 * hash(baseSeed + 400u) - 1.0);
        
        let inputColor = sampleVolume(vec3<f32>(flow_x, flow_y, flow_z), volSize);
        
        if (length(inputColor.rgb) < 0.01) {
            let fallbackCol = getFallbackColor(vec3<f32>(flow_x, flow_y, flow_z), baseSeed);
            cr = fallbackCol.r;
            cg = fallbackCol.g;
            cb = fallbackCol.b;
        } else {
            cr = inputColor.r;
            cg = inputColor.g;
            cb = inputColor.b;
        }
        
        age = 0.0;
    }
    
    // Sample input for flow direction
    let texel = sampleVolume(vec3<f32>(flow_x, flow_y, flow_z), volSize);
    
    var indexValue: f32;
    if (length(texel.rgb) < 0.01) {
        indexValue = hash(u32(flow_x * 10.0 + flow_y * 100.0 + flow_z * 1000.0 + time * 10.0));
    } else {
        indexValue = oklab_l(texel.rgb);
    }
    
    let baseHeading = hash(0u) * TAU;
    let rotationBias = computeRotationBias(baseHeading, rotRand, time, agentIndex, totalAgents);
    
    theta = theta + indexValue * TAU * kink * 0.1 + rotationBias * 0.1;
    phi = phi + (indexValue - 0.5) * PI * kink * 0.1;
    phi = clamp(phi, 0.01, PI - 0.01);
    
    let sinPhi = sin(phi);
    let cosPhi = cos(phi);
    let sinTheta = sin(theta);
    let cosTheta = cos(theta);
    
    let direction = vec3<f32>(
        sinPhi * cosTheta,
        sinPhi * sinTheta,
        cosPhi
    );
    
    let scale = max(volSizeF / 64.0, 1.0);
    let strideRand = hash(agentSeed + 500u) - 0.5;
    let devFactor = 1.0 + strideRand * 2.0 * strideDeviation;
    let actualStride = max(0.1, stride * scale * devFactor);
    
    var newX = flow_x + direction.x * actualStride;
    var newY = flow_y + direction.y * actualStride;
    var newZ = flow_z + direction.z * actualStride;
    
    newX = wrap_float(newX, volSizeF);
    newY = wrap_float(newY, volSizeF);
    newZ = wrap_float(newZ, volSizeF);
    
    age = age + 0.016;
    
    output.outState1 = vec4<f32>(newX, newY, newZ, rotRand);
    output.outState2 = vec4<f32>(cr, cg, cb, seed_f);
    output.outState3 = vec4<f32>(age, initialized, theta, phi);
    
    return output;
}
`},blend:{glsl:`#version 300 es
precision highp float;
/*
 * Flow3D blend pass - Combine input 3D volume with trail 3D volume
 * Direct port of nu/flow blend.glsl to 3D atlas format
 * 
 * Both mixerTex (inputTex3d) and trailTex are 2D atlas representations
 * of 3D volumes (width=volumeSize, height=volumeSize\xB2)
 */

uniform sampler2D mixerTex;
uniform sampler2D trailTex;
uniform float inputIntensity;

out vec4 fragColor;

void main() {
    // Use actual output texture size, not canvas resolution
    ivec2 outputSize = textureSize(trailTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(outputSize);
    
    // Both textures are 3D atlas format, sample directly
    float inputIntensityValue = inputIntensity / 100.0;
    vec4 baseSample = texture(mixerTex, uv);
    vec4 baseColor = vec4(baseSample.rgb * inputIntensityValue, baseSample.a);
    
    vec4 trailColor = texture(trailTex, uv);
    
    // Combine: add trail on top of input (same as 2D flow)
    vec3 combinedRgb = clamp(baseColor.rgb + trailColor.rgb, vec3(0.0), vec3(1.0));
    float finalAlpha = clamp(max(baseColor.a, trailColor.a), 0.0, 1.0);
    
    fragColor = vec4(combinedRgb, finalAlpha);
}
`,wgsl:`/*
 * Flow3D blend pass (WGSL) - Combine input 3D volume with trail 3D volume
 * Direct port of nu/flow blend to 3D atlas format
 * 
 * Both mixerTex (inputTex3d) and trailTex are 2D atlas representations
 * of 3D volumes (width=volumeSize, height=volumeSize\xB2)
 */

@group(0) @binding(0) var mixerTex: texture_2d<f32>;
@group(0) @binding(1) var trailTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> inputIntensity: f32;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(position.xy);
    
    // Both textures are 3D atlas format, sample directly with integer coords
    let inputIntensityValue = inputIntensity / 100.0;
    let baseSample = textureLoad(mixerTex, coord, 0);
    let baseColor = vec4<f32>(baseSample.rgb * inputIntensityValue, baseSample.a);
    
    let trailColor = textureLoad(trailTex, coord, 0);
    
    // Combine: add trail on top of input (same as 2D flow)
    let combinedRgb = clamp(baseColor.rgb + trailColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
    let finalAlpha = clamp(max(baseColor.a, trailColor.a), 0.0, 1.0);
    
    return vec4<f32>(combinedRgb, finalAlpha);
}
`},copy:{glsl:`#version 300 es
precision highp float;

// Copy Pass - Blit source to destination (for ping-pong correction after diffuse)
// This ensures the decayed trail is in the write buffer before deposit blends onto it

uniform sampler2D sourceTex;

out vec4 fragColor;

void main() {
    // Use actual texture size, not canvas resolution
    ivec2 texSize = textureSize(sourceTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    fragColor = texture(sourceTex, uv);
}
`,wgsl:`/*
 * Flow3D copy pass (WGSL) - Blit source to destination (for ping-pong correction after diffuse)
 * This ensures the decayed trail is in the write buffer before deposit blends onto it
 */

@group(0) @binding(0) var sourceTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(position.xy);
    return textureLoad(sourceTex, coord, 0);
}
`},deposit:{vertex:`#version 300 es
precision highp float;
// Flow3D deposit vertex shader - positions agents in 3D volume atlas
// Reads 3D agent positions and converts to 2D atlas coordinates for deposit

uniform sampler2D stateTex1;
uniform sampler2D stateTex2;
uniform float density;
uniform int volumeSize;

out vec4 vColor;

void main() {
    int agentIndex = gl_VertexID;
    // Use actual state texture size, not canvas resolution
    ivec2 stateTexSize = textureSize(stateTex1, 0);
    int texWidth = stateTexSize.x;
    int texHeight = stateTexSize.y;
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Calculate max agents based on density
    int maxDim = max(texWidth, texHeight);
    int maxAgents = int(float(maxDim) * density * 0.2);
    
    // Skip if beyond agent count
    if (agentIndex >= maxAgents) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // Off-screen
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Map agent index to state texture coordinate
    int stateTexWidth = texWidth;
    int stateX = agentIndex % stateTexWidth;
    int stateY = agentIndex / stateTexWidth;
    
    if (stateY >= texHeight) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Read agent state (3D position in state1.xyz)
    vec4 state1 = texelFetch(stateTex1, ivec2(stateX, stateY), 0);
    vec4 state2 = texelFetch(stateTex2, ivec2(stateX, stateY), 0);
    
    float x = state1.x;  // [0, volSize)
    float y = state1.y;  // [0, volSize)
    float z = state1.z;  // [0, volSize)
    
    // Convert 3D position to 2D atlas position
    // Atlas layout: width = volSize, height = volSize * volSize
    // y_atlas = y_voxel + z_voxel * volSize
    float atlasX = x;
    float atlasY = y + floor(z) * volSizeF;
    
    // Convert to normalized device coordinates
    // Atlas dimensions: volSize x (volSize * volSize)
    float atlasWidth = volSizeF;
    float atlasHeight = volSizeF * volSizeF;
    
    vec2 ndc = vec2(
        (atlasX / atlasWidth) * 2.0 - 1.0,
        (atlasY / atlasHeight) * 2.0 - 1.0
    );
    
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = 1.0;
    
    // Pass agent color to fragment shader
    vColor = vec4(state2.rgb, 1.0);
}
`,fragment:`#version 300 es
precision highp float;
// Flow3D deposit fragment shader - outputs agent color at point position

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,wgsl:`/*
 * Flow3D deposit pass (WGSL) - positions agents in 3D volume atlas
 */

@group(0) @binding(0) var stateTex1: texture_2d<f32>;
@group(0) @binding(1) var stateTex2: texture_2d<f32>;
@group(0) @binding(2) var<uniform> density: f32;
@group(0) @binding(3) var<uniform> volumeSize: i32;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vColor: vec4<f32>,
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    
    let agentIndex = i32(vertexIndex);
    // Use actual state texture size, not canvas resolution
    let stateTexSize = textureDimensions(stateTex1, 0);
    let texWidth = i32(stateTexSize.x);
    let texHeight = i32(stateTexSize.y);
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    // Calculate max agents based on density
    let maxDim = max(texWidth, texHeight);
    let maxAgents = i32(f32(maxDim) * density * 0.2);
    
    // Skip if beyond agent count
    if (agentIndex >= maxAgents) {
        output.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        output.vColor = vec4<f32>(0.0);
        return output;
    }
    
    // Map agent index to state texture coordinate
    let stateTexWidth = texWidth;
    let stateX = agentIndex % stateTexWidth;
    let stateY = agentIndex / stateTexWidth;
    
    if (stateY >= texHeight) {
        output.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        output.vColor = vec4<f32>(0.0);
        return output;
    }
    
    // Read agent state (3D position in state1.xyz)
    let state1 = textureLoad(stateTex1, vec2<i32>(stateX, stateY), 0);
    let state2 = textureLoad(stateTex2, vec2<i32>(stateX, stateY), 0);
    
    let x = state1.x;
    let y = state1.y;
    let z = state1.z;
    
    // Convert 3D position to 2D atlas position
    // Atlas layout: width = volSize, height = volSize * volSize
    let atlasX = x;
    let atlasY = y + floor(z) * volSizeF;
    
    // Convert to normalized device coordinates
    let atlasWidth = volSizeF;
    let atlasHeight = volSizeF * volSizeF;
    
    let ndc = vec2<f32>(
        (atlasX / atlasWidth) * 2.0 - 1.0,
        (atlasY / atlasHeight) * 2.0 - 1.0
    );
    
    output.position = vec4<f32>(ndc, 0.0, 1.0);
    output.vColor = vec4<f32>(state2.rgb, 1.0);
    
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.vColor;
}
`},diffuse:{glsl:`#version 300 es
precision highp float;
// Flow3D diffuse pass - decay the 3D trail volume
// Operates on the 2D atlas representation of the 3D volume

uniform sampler2D sourceTex;
uniform float intensity;

out vec4 fragColor;

void main() {
    // Use actual texture size, not canvas resolution
    ivec2 texSize = textureSize(sourceTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    
    // Sample the trail texture directly (no blur for now, matching 2D flow)
    vec4 trailColor = texture(sourceTex, uv);
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    float decay = clamp(intensity / 100.0, 0.0, 1.0);
    fragColor = trailColor * decay;
}
`,wgsl:`/*
 * Flow3D diffuse pass (WGSL) - decay the 3D trail volume
 */

@group(0) @binding(0) var sourceTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> intensity: f32;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(position.xy);
    
    // Sample the trail texture directly (no blur)
    let trailColor = textureLoad(sourceTex, coord, 0);
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    let decay = clamp(intensity / 100.0, 0.0, 1.0);
    return trailColor * decay;
}
`}},o=`# flow3d

3D agent-based flow field

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x32 | x16/x32/x64/x128 | Volume size |
| behavior | int | obedient | none/obedient/crosshatch/unruly/chaotic/randomMix/meandering | Behavior |
| density | float | 20 | 1-100 | Density |
| stride | float | 1 | 0.1-10 | Stride |
| strideDeviation | float | 0.05 | 0-0.5 | Stride Deviation |
| kink | float | 1 | 0-10 | Kink |
| intensity | float | 90 | 0-100 | Trail Persistence |
| inputIntensity | float | 50 | 0-100 | Input Intensity |
| lifetime | float | 30 | 0-60 | Lifetime |

## Usage

\`\`\`
search synth3d, filter3d, render

noise3d(volumeSize: x32)
  .flow3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(a))t.shaders[i]={...e}}t&&o&&(t.help=o);var d="filter3d/flow3d",f="filter3d",c="flow3d",p=t;export{p as default,d as effectId,c as effectName,o as help,f as namespace};
