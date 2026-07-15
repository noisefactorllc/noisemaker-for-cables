/* points/attractor */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Attractor",namespace:"points",func:"attractor",tags:["sim"],description:"Strange attractors: chaotic dynamic systems visualization",textures:{},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{stateSize:{type:"int",default:256,uniform:"stateSize",ui:{control:!1}},attractor:{type:"int",default:0,uniform:"attractor",choices:{lorenz:0,rossler:1,aizawa:2,thomas:3,halvorsen:4,chen:5,dadras:6},ui:{label:"attractor",control:"dropdown"}},speed:{type:"float",default:1,uniform:"speed",min:.01,max:2,step:.01,ui:{label:"speed",control:"slider"}},viewMode:{type:"int",default:1,uniform:"viewMode",ui:{control:!1}}},passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba"},uniforms:{attractor:"attractor",speed:"speed"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform float time;
uniform vec2 resolution;
uniform int seed;

// Effect parameters
uniform int attractor;
uniform float speed;

// Input textures
uniform sampler2D xyzTex;
uniform sampler2D velTex;
uniform sampler2D rgbaTex;

// MRT outputs
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

// Lorenz attractor (classic butterfly)
vec3 lorenz(vec3 p) {
    float sigma = 10.0;
    float rho = 28.0;
    float beta = 8.0 / 3.0;
    return vec3(
        sigma * (p.y - p.x),
        p.x * (rho - p.z) - p.y,
        p.x * p.y - beta * p.z
    );
}

// R\xF6ssler attractor (spiral)
vec3 rossler(vec3 p) {
    float a = 0.2;
    float b = 0.2;
    float c = 5.7;
    return vec3(
        -p.y - p.z,
        p.x + a * p.y,
        b + p.z * (p.x - c)
    );
}

// Aizawa attractor (torus-like)
vec3 aizawa(vec3 p) {
    float a = 0.95;
    float b = 0.7;
    float c = 0.6;
    float d = 3.5;
    float e = 0.25;
    float f = 0.1;
    return vec3(
        (p.z - b) * p.x - d * p.y,
        d * p.x + (p.z - b) * p.y,
        c + a * p.z - (p.z * p.z * p.z) / 3.0 - (p.x * p.x + p.y * p.y) * (1.0 + e * p.z) + f * p.z * p.x * p.x * p.x
    );
}

// Thomas attractor (cyclically symmetric)
vec3 thomas(vec3 p) {
    float b = 0.208186;
    return vec3(
        sin(p.y) - b * p.x,
        sin(p.z) - b * p.y,
        sin(p.x) - b * p.z
    );
}

// Halvorsen attractor (3-fold symmetric)
vec3 halvorsen(vec3 p) {
    float a = 1.89;
    return vec3(
        -a * p.x - 4.0 * p.y - 4.0 * p.z - p.y * p.y,
        -a * p.y - 4.0 * p.z - 4.0 * p.x - p.z * p.z,
        -a * p.z - 4.0 * p.x - 4.0 * p.y - p.x * p.x
    );
}

// Chen attractor (double scroll)
vec3 chen(vec3 p) {
    float a = 40.0;
    float b = 3.0;
    float c = 28.0;
    return vec3(
        a * (p.y - p.x),
        (c - a) * p.x - p.x * p.z + c * p.y,
        p.x * p.y - b * p.z
    );
}

// Dadras attractor (4-wing)
vec3 dadras(vec3 p) {
    float a = 3.0;
    float b = 2.7;
    float c = 1.7;
    float d = 2.0;
    float e = 9.0;
    return vec3(
        p.y - a * p.x + b * p.y * p.z,
        c * p.y - p.x * p.z + p.z,
        d * p.x * p.y - e * p.z
    );
}

vec3 stepAttractor(vec3 p, int type, float dt) {
    vec3 dp;
    if (type == 0) dp = lorenz(p);
    else if (type == 1) dp = rossler(p);
    else if (type == 2) dp = aizawa(p);
    else if (type == 3) dp = thomas(p);
    else if (type == 4) dp = halvorsen(p);
    else if (type == 5) dp = chen(p);
    else dp = dadras(p);
    
    return p + dp * dt;
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 texSize = textureSize(xyzTex, 0);
    int stateSize = texSize.x;
    
    // Read current state
    vec4 pos = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 col = texelFetch(rgbaTex, coord, 0);
    
    uint agentSeed = uint(coord.x + coord.y * stateSize) + uint(seed);
    
    // Check if needs 3D initialization
    // pointsEmit initializes agents in 2D normalized coords (0-1 range for x,y, z=0)
    // We detect this by checking if z is exactly 0.0 (never happens in attractor space)
    // and position is in the 0-1 range typical of pointsEmit output
    bool needs3DInit = pos.w >= 0.5 && pos.z == 0.0 && pos.x >= 0.0 && pos.x <= 1.0 && pos.y >= 0.0 && pos.y <= 1.0;
    
    if (needs3DInit) {
        // Transform from 2D normalized coords to attractor space
        // Lorenz-like attractors need roughly \xB120 x/y and 10-40 z
        uint initSeed = agentSeed + uint(time * 1000.0);
        pos.x = (hash(initSeed) - 0.5) * 20.0;
        pos.y = (hash(initSeed + 1u) - 0.5) * 20.0;
        pos.z = hash(initSeed + 2u) * 30.0 + 10.0;
        
        outXYZ = vec4(pos.xyz, 1.0);
        outVel = vel;
        outRGBA = col;
        return;
    }
    
    // Skip dead agents
    if (pos.w < 0.5) {
        outXYZ = pos;
        outVel = vel;
        outRGBA = col;
        return;
    }
    
    // Step the attractor
    float dt = speed * 0.01;
    vec3 newPos = stepAttractor(pos.xyz, attractor, dt);
    
    // Check for divergence (NaN or too far)
    if (any(isnan(newPos)) || length(newPos) > 1000.0) {
        // Reinitialize in attractor space
        uint respawnSeed = agentSeed + uint(time * 1000.0);
        newPos.x = (hash(respawnSeed) - 0.5) * 20.0;
        newPos.y = (hash(respawnSeed + 1u) - 0.5) * 20.0;
        newPos.z = hash(respawnSeed + 2u) * 30.0 + 10.0;
    }
    
    outXYZ = vec4(newPos, 1.0);
    outVel = vel;
    outRGBA = col;
}
`,wgsl:`// Strange Attractors Agent Shader
// Updates particle positions based on attractor dynamics

struct Uniforms {
    time: f32,
    resolution: vec2<f32>,
    seed: i32,
    attractor: i32,
    speed: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(3) var velTex: texture_2d<f32>;
@group(0) @binding(5) var rgbaTex: texture_2d<f32>;

struct Outputs {
    @location(0) outXYZ: vec4<f32>,
    @location(1) outVel: vec4<f32>,
    @location(2) outRGBA: vec4<f32>,
};

// Integer-based hash for cross-platform determinism
fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

// Lorenz attractor (classic butterfly)
fn lorenz(p: vec3<f32>) -> vec3<f32> {
    let sigma = 10.0;
    let rho = 28.0;
    let beta = 8.0 / 3.0;
    return vec3<f32>(
        sigma * (p.y - p.x),
        p.x * (rho - p.z) - p.y,
        p.x * p.y - beta * p.z
    );
}

// R\xF6ssler attractor (spiral)
fn rossler(p: vec3<f32>) -> vec3<f32> {
    let a = 0.2;
    let b = 0.2;
    let c = 5.7;
    return vec3<f32>(
        -p.y - p.z,
        p.x + a * p.y,
        b + p.z * (p.x - c)
    );
}

// Aizawa attractor (torus-like)
fn aizawa(p: vec3<f32>) -> vec3<f32> {
    let a = 0.95;
    let b = 0.7;
    let c = 0.6;
    let d = 3.5;
    let e = 0.25;
    let f = 0.1;
    return vec3<f32>(
        (p.z - b) * p.x - d * p.y,
        d * p.x + (p.z - b) * p.y,
        c + a * p.z - (p.z * p.z * p.z) / 3.0 - (p.x * p.x + p.y * p.y) * (1.0 + e * p.z) + f * p.z * p.x * p.x * p.x
    );
}

// Thomas attractor (cyclically symmetric)
fn thomas(p: vec3<f32>) -> vec3<f32> {
    let b = 0.208186;
    return vec3<f32>(
        sin(p.y) - b * p.x,
        sin(p.z) - b * p.y,
        sin(p.x) - b * p.z
    );
}

// Halvorsen attractor (3-fold symmetric)
fn halvorsen(p: vec3<f32>) -> vec3<f32> {
    let a = 1.89;
    return vec3<f32>(
        -a * p.x - 4.0 * p.y - 4.0 * p.z - p.y * p.y,
        -a * p.y - 4.0 * p.z - 4.0 * p.x - p.z * p.z,
        -a * p.z - 4.0 * p.x - 4.0 * p.y - p.x * p.x
    );
}

// Chen attractor (double scroll)
fn chen(p: vec3<f32>) -> vec3<f32> {
    let a = 40.0;
    let b = 3.0;
    let c = 28.0;
    return vec3<f32>(
        a * (p.y - p.x),
        (c - a) * p.x - p.x * p.z + c * p.y,
        p.x * p.y - b * p.z
    );
}

// Dadras attractor (4-wing)
fn dadras(p: vec3<f32>) -> vec3<f32> {
    let a = 3.0;
    let b = 2.7;
    let c = 1.7;
    let d = 2.0;
    let e = 9.0;
    return vec3<f32>(
        p.y - a * p.x + b * p.y * p.z,
        c * p.y - p.x * p.z + p.z,
        d * p.x * p.y - e * p.z
    );
}

fn stepAttractor(p: vec3<f32>, attractorType: i32, dt: f32) -> vec3<f32> {
    var dp: vec3<f32>;
    if (attractorType == 0) { dp = lorenz(p); }
    else if (attractorType == 1) { dp = rossler(p); }
    else if (attractorType == 2) { dp = aizawa(p); }
    else if (attractorType == 3) { dp = thomas(p); }
    else if (attractorType == 4) { dp = halvorsen(p); }
    else if (attractorType == 5) { dp = chen(p); }
    else { dp = dadras(p); }
    
    return p + dp * dt;
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> Outputs {
    let coord = vec2<i32>(fragCoord.xy);
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);
    
    // Read current state
    let pos = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let col = textureLoad(rgbaTex, coord, 0);
    
    let agentSeed = u32(coord.x + coord.y * stateSize) + u32(u.seed);
    
    // Check if needs 3D initialization
    // pointsEmit initializes agents in 2D normalized coords (0-1 range for x,y, z=0)
    // We detect this by checking if z is exactly 0.0 (never happens in attractor space)
    // and position is in the 0-1 range typical of pointsEmit output
    let needs3DInit = pos.w >= 0.5 && pos.z == 0.0 && pos.x >= 0.0 && pos.x <= 1.0 && pos.y >= 0.0 && pos.y <= 1.0;
    
    if (needs3DInit) {
        let initSeed = agentSeed + u32(u.time * 1000.0);
        let newX = (hash(initSeed) - 0.5) * 20.0;
        let newY = (hash(initSeed + 1u) - 0.5) * 20.0;
        let newZ = hash(initSeed + 2u) * 30.0 + 10.0;
        
        return Outputs(
            vec4<f32>(newX, newY, newZ, 1.0),
            vel,
            col
        );
    }
    
    // Skip dead agents
    if (pos.w < 0.5) {
        return Outputs(pos, vel, col);
    }
    
    // Step the attractor
    let dt = u.speed * 0.01;
    var newPos = stepAttractor(pos.xyz, u.attractor, dt);
    
    // Check for divergence (NaN or too far)
    // WGSL: check for NaN by comparing value to itself (NaN != NaN)
    let hasNaN = newPos.x != newPos.x || newPos.y != newPos.y || newPos.z != newPos.z;
    if (hasNaN || length(newPos) > 1000.0) {
        let respawnSeed = agentSeed + u32(u.time * 1000.0);
        newPos = vec3<f32>(
            (hash(respawnSeed) - 0.5) * 20.0,
            (hash(respawnSeed + 1u) - 0.5) * 20.0,
            hash(respawnSeed + 2u) * 30.0 + 10.0
        );
    }
    
    return Outputs(
        vec4<f32>(newPos, 1.0),
        vel,
        col
    );
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
`}},o=`# attractor

Strange attractors: chaotic dynamic systems visualization

## Description

Particles follow trajectories in 3D attractor space, creating complex orbital patterns. Best viewed with 3D orthographic projection (\`viewMode: ortho\`) in pointsRender.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| stateSize | int | 256 | - | - |
| attractor | int | lorenz | lorenz/rossler/aizawa/thomas/halvorsen/chen/dadras | Attractor |
| speed | float | 1 | 0.01-2 | Speed |
| viewMode | int | 1 | - | - |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .attractor()
  .pointsRender(viewMode: ortho)
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[a,n]of Object.entries(r))e.shaders[a]={...n}}e&&o&&(e.help=o);var l="points/attractor",u="points",d="attractor",f=e;export{f as default,l as effectId,d as effectName,o as help,u as namespace};
