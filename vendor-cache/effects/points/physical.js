/* points/physical */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Physical",namespace:"points",func:"physical",tags:["sim"],description:"Physics-based particle simulation with wind and gravity forces",textures:{},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{stateSize:{type:"int",default:256,uniform:"stateSize",ui:{control:!1}},gravity:{type:"float",default:.05,uniform:"gravity",min:-2,max:2,step:.01,ui:{label:"gravity",control:"slider",category:"physics"}},wind:{type:"float",default:0,uniform:"wind",min:-2,max:2,step:.01,ui:{label:"wind",control:"slider",category:"physics"}},energy:{type:"float",default:.5,uniform:"energy",min:0,max:2,step:.01,ui:{label:"energy",control:"slider",category:"physics"}},drag:{type:"float",default:.15,uniform:"drag",min:0,max:.2,step:.005,ui:{label:"drag",control:"slider",category:"physics"}},deviation:{type:"float",default:.75,uniform:"deviation",min:0,max:1,step:.01,ui:{label:"deviation",control:"slider",category:"physics"}},wander:{type:"float",default:.25,uniform:"wander",min:0,max:1,step:.01,ui:{label:"wander",control:"slider",category:"physics"}}},passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba"},uniforms:{gravity:"gravity",wind:"wind",energy:"energy",drag:"drag",deviation:"deviation",wander:"wander"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform vec2 resolution;
uniform float time;

// Physics parameters
uniform float gravity;
uniform float wind;
uniform float energy;
uniform float drag;
uniform float deviation;
uniform float wander;

// Input state from pipeline (from pointsEmit)
uniform sampler2D inputTex; // Pipeline passthrough (for chainability)
uniform sampler2D xyzTex;   // [x, y, z, alive]
uniform sampler2D velTex;   // [vx, vy, vz, seed]
uniform sampler2D rgbaTex;  // [r, g, b, a]

// Output state (MRT)
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

// Integer-based hash for cross-platform determinism
uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

// Smooth noise for wander perturbation
float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // Smoothstep
    
    uint n = uint(i.x) + uint(i.y) * 57u;
    float a = hash(n);
    float b = hash(n + 1u);
    float c = hash(n + 57u);
    float d = hash(n + 58u);
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise for smoother motion
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
        v += a * noise2D(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 stateSize = textureSize(xyzTex, 0);
    
    // Read input state from pipeline
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    // Extract components
    float px = xyz.x;  // Position in normalized coords [0,1]
    float py = xyz.y;
    float pz = xyz.z;
    float alive = xyz.w;
    
    float vx = vel.x;
    float vy = vel.y;
    float vz = vel.z;
    float seed_f = vel.w;
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        outXYZ = xyz;
        outVel = vel;
        outRGBA = rgba;
        return;
    }
    
    // Per-particle deviation (0 = all same speed, 1 = highly varied)
    float deviationMultiplier = 1.0 + (seed_f - 0.5) * deviation * 2.0;
    
    // Smooth wander perturbation using noise field
    float noiseScale = 2.0;  // Adjust for normalized coords
    float wanderAngle = fbm(vec2(px, py) * noiseScale + time * 0.5) * 6.283185 * 2.0;
    float wanderStrength = wander * 0.002;  // Scaled for normalized coords
    float wanderX = cos(wanderAngle) * wanderStrength;
    float wanderY = sin(wanderAngle) * wanderStrength;
    
    // Physics forces (scaled for normalized coords)
    // Use energy as a global multiplier for visible movement
    float ax = (wind * 0.01 + wanderX) * energy;
    float ay = (-gravity * 0.01 + wanderY) * energy;  // Negate: positive gravity pulls down
    
    // Update velocity with deviation
    vx += ax * deviationMultiplier;
    vy += ay * deviationMultiplier;
    
    // Apply drag coefficient (0 = no drag, 0.2 = heavy drag)
    float dragFactor = 1.0 - drag;
    vx *= dragFactor;
    vy *= dragFactor;
    
    // Update position (deviation already factored into velocity)
    px += vx;
    py += vy;
    
    // Check for respawn conditions - set alive=0 to signal respawn
    bool needsRespawn = false;
    
    // Respawn if out of bounds (normalized coords)
    if (px < 0.0 || px > 1.0 || py < 0.0 || py > 1.0) {
        needsRespawn = true;
    }
    
    // Attrition is now handled by pointsEmit
    
    if (needsRespawn) {
        // Signal respawn by setting alive flag to 0
        // pointsEmit will handle actual respawn on next frame
        outXYZ = vec4(px, py, pz, 0.0);
        outVel = vec4(vx, vy, vz, seed_f);
        outRGBA = rgba;
    } else {
        outXYZ = vec4(px, py, pz, 1.0);
        outVel = vec4(vx, vy, vz, seed_f);
        outRGBA = rgba;
    }
}
`,wgsl:`struct Uniforms {
    resolution: vec2f,
    time: f32,
    gravity: f32,
    wind: f32,
    energy: f32,
    drag: f32,
    deviation: f32,
    wander: f32,
}

struct Outputs {
    @location(0) xyz: vec4f,
    @location(1) vel: vec4f,
    @location(2) rgba: vec4f,
}

// Bindings: uniforms at 0, then state textures consecutively (textureLoad, no samplers)
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var velTex: texture_2d<f32>;
@group(0) @binding(3) var rgbaTex: texture_2d<f32>;

fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

// Smooth noise for wander perturbation
fn noise2D(p: vec2f) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // Smoothstep
    
    let n = u32(i.x) + u32(i.y) * 57u;
    let a = hash(n);
    let b = hash(n + 1u);
    let c = hash(n + 57u);
    let d = hash(n + 58u);
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise for smoother motion
fn fbm(p_in: vec2f) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var p = p_in;
    for (var i = 0; i < 3; i++) {
        v += a * noise2D(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> Outputs {
    let coord = vec2i(fragCoord.xy);
    let stateSize = textureDimensions(xyzTex, 0);
    
    // Read input state from pipeline
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    // Extract components
    var px = xyz.x;  // Position in normalized coords [0,1]
    var py = xyz.y;
    let pz = xyz.z;
    let alive = xyz.w;
    
    var vx = vel.x;
    var vy = vel.y;
    let vz = vel.z;
    let seed_f = vel.w;
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        return Outputs(xyz, vel, rgba);
    }
    
    // Per-particle deviation (0 = all same speed, 1 = highly varied)
    let deviationMultiplier = 1.0 + (seed_f - 0.5) * u.deviation * 2.0;
    
    // Smooth wander perturbation using noise field
    let noiseScale = 2.0;  // Adjust for normalized coords
    let wanderAngle = fbm(vec2f(px, py) * noiseScale + u.time * 0.5) * 6.283185 * 2.0;
    let wanderStrength = u.wander * 0.002;  // Scaled for normalized coords
    let wanderX = cos(wanderAngle) * wanderStrength;
    let wanderY = sin(wanderAngle) * wanderStrength;
    
    // Physics forces (scaled for normalized coords)
    // Use energy as a global multiplier for visible movement
    let ax = (u.wind * 0.01 + wanderX) * u.energy;
    let ay = (-u.gravity * 0.01 + wanderY) * u.energy;  // Negate: positive gravity pulls down
    
    // Update velocity with deviation
    vx += ax * deviationMultiplier;
    vy += ay * deviationMultiplier;
    
    // Apply drag coefficient (0 = no drag, 0.2 = heavy drag)
    let dragFactor = 1.0 - u.drag;
    vx *= dragFactor;
    vy *= dragFactor;
    
    // Update position (deviation already factored into velocity)
    px += vx;
    py += vy;
    
    // Check for respawn conditions
    var needsRespawn = false;
    
    // Respawn if out of bounds (normalized coords)
    if (px < 0.0 || px > 1.0 || py < 0.0 || py > 1.0) {
        needsRespawn = true;
    }
    
    // Attrition is now handled by pointsEmit
    
    if (needsRespawn) {
        // Signal respawn by setting alive flag to 0
        // pointsEmit will handle actual respawn on next frame
        return Outputs(
            vec4f(px, py, pz, 0.0),
            vec4f(vx, vy, vz, seed_f),
            rgba
        );
    } else {
        return Outputs(
            vec4f(px, py, pz, 1.0),
            vec4f(vx, vy, vz, seed_f),
            rgba
        );
    }
}
`},passthrough:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(inputTex, uv);
}
`,wgsl:`@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4f {
    return textureSample(inputTex, texSampler, in.uv);
}
`}},r=`# physical

Physics-based particle simulation with wind and gravity forces

## Description

Particles fall under gravity, get pushed by wind, and experience drag and random wandering. Use negative gravity for rising particles (like smoke or bubbles).

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| stateSize | int | 256 | - | - |
| gravity | float | 0.05 | -2-2 | Gravity |
| wind | float | 0 | -2-2 | Wind |
| energy | float | 0.5 | 0-2 | Energy |
| drag | float | 0.15 | 0-0.2 | Drag |
| deviation | float | 0.75 | 0-1 | Deviation |
| wander | float | 0.25 | 0-1 | Wander |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .physical()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[a,n]of Object.entries(i))e.shaders[a]={...n}}e&&r&&(e.help=r);var d="points/physical",p="points",f="physical",c=e;export{c as default,d as effectId,f as effectName,r as help,p as namespace};
