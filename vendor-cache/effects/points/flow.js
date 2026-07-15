/* points/flow */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Flow",namespace:"points",func:"flow",tags:["sim"],description:"Agent-based luminosity flow field with behaviors",textures:{},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{stateSize:{type:"int",default:256,uniform:"stateSize",ui:{control:!1}},behavior:{type:"int",default:1,uniform:"behavior",choices:{none:0,obedient:1,crosshatch:2,unruly:3,chaotic:4,randomMix:5,meandering:10},ui:{label:"behavior",control:"dropdown",category:"agents"}},stride:{type:"float",default:10,uniform:"stride",min:1,max:1e3,step:1,ui:{label:"stride",control:"slider",category:"agents"}},strideDeviation:{type:"float",default:.05,uniform:"strideDeviation",min:0,max:.5,step:.01,ui:{label:"deviation",control:"slider",category:"agents"}},kink:{type:"float",default:1,uniform:"kink",min:0,max:10,step:.1,ui:{label:"kink",control:"slider",category:"agents"}},quantize:{type:"boolean",default:!1,uniform:"quantize",ui:{label:"quantize",control:"checkbox",category:"agents"}},inputWeight:{type:"float",default:100,uniform:"inputWeight",min:0,max:100,step:1,ui:{label:"input weight",control:"slider",category:"agents"}}},passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba",inputTex:"inputTex"},uniforms:{behavior:"behavior",stride:"stride",strideDeviation:"strideDeviation",kink:"kink",quantize:"quantize",inputWeight:"inputWeight"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform vec2 resolution;
uniform float time;

// Flow parameters
uniform float stride;
uniform float strideDeviation;
uniform float kink;
uniform float quantize;
uniform float inputWeight;
uniform float behavior;

// Input state from pipeline (from pointsEmit)
uniform sampler2D inputTex;  // Source texture for luminance-based flow
uniform sampler2D xyzTex;    // [x, y, z, alive]
uniform sampler2D velTex;    // [vx, vy, rotRand, strideRand]
uniform sampler2D rgbaTex;   // [r, g, b, a]

// Output state (MRT)
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

const float TAU = 6.283185307179586;
const float RIGHT_ANGLE = 1.5707963267948966;

uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

float srgb_to_linear(float value) {
    if (value <= 0.04045) return value / 12.92;
    return pow((value + 0.055) / 1.055, 2.4);
}

float cube_root(float value) {
    if (value == 0.0) return 0.0;
    float sign_value = value >= 0.0 ? 1.0 : -1.0;
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

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

// Compute rotation bias based on behavior mode
float computeRotationBias(int behaviorMode, float baseHeading, float rotRand, float time, int agentIndex, int totalAgents) {
    if (behaviorMode <= 0) {
        return 0.0;
    } else if (behaviorMode == 1) {
        return baseHeading;
    } else if (behaviorMode == 2) {
        return baseHeading + floor(rotRand * 4.0) * RIGHT_ANGLE;
    } else if (behaviorMode == 3) {
        return baseHeading + (rotRand - 0.5) * 0.25;
    } else if (behaviorMode == 4) {
        return rotRand * TAU;
    } else if (behaviorMode == 5) {
        int quarterSize = max(1, totalAgents / 4);
        int band = agentIndex / quarterSize;
        if (band <= 0) {
            return baseHeading;
        } else if (band == 1) {
            return baseHeading + floor(rotRand * 4.0) * RIGHT_ANGLE;
        } else if (band == 2) {
            return baseHeading + (rotRand - 0.5) * 0.25;
        } else {
            return rotRand * TAU;
        }
    } else if (behaviorMode == 10) {
        return normalized_sine((time - rotRand) * TAU);
    } else {
        return rotRand * TAU;
    }
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 stateSize = textureSize(xyzTex, 0);
    
    // Read input state from pipeline
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    // Extract components (positions in normalized coords [0,1])
    float px = xyz.x;
    float py = xyz.y;
    float pz = xyz.z;
    float alive = xyz.w;
    
    // Flow-specific state stored in vel
    // vel.x, vel.y unused for flow (no velocity accumulation)
    float rotRand = vel.z;     // Per-agent rotation random [0,1] from pointsEmit
    float strideRand = vel.w;  // Per-agent stride random [-0.5, 0.5] from pointsEmit
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        outXYZ = xyz;
        outVel = vel;
        outRGBA = rgba;
        return;
    }
    
    // Sample input texture at current position for flow direction
    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 texCoord = ivec2(px * float(texSize.x), py * float(texSize.y));
    texCoord = clamp(texCoord, ivec2(0), texSize - 1);
    vec4 texel = texelFetch(inputTex, texCoord, 0);
    float inputLuma = oklab_l(texel.rgb);
    
    // inputWeight controls how much the input texture influences flow direction
    float weightBlend = clamp(inputWeight * 0.01, 0.0, 1.0);
    float indexValue = mix(0.5, inputLuma, weightBlend);
    
    // Compute rotation bias based on behavior uniform
    float baseHeading = hash(0u) * TAU;
    int behaviorMode = int(behavior);
    int totalAgents = stateSize.x * stateSize.y;
    int agentIndex = coord.x + coord.y * stateSize.x;
    float rotationBias = computeRotationBias(behaviorMode, baseHeading, rotRand, time, agentIndex, totalAgents);
    
    // Final angle based on input texture and kink
    float finalAngle = indexValue * TAU * kink + rotationBias;
    
    if (quantize > 0.5) {
        finalAngle = round(finalAngle);
    }
    
    // Compute actual stride in normalized coords
    // stride uniform is in 1/10th of pixels at 1024 resolution
    float scale = max(max(resolution.x, resolution.y) / 1024.0, 1.0);
    float devFactor = 1.0 + strideRand * 2.0 * strideDeviation;
    float actualStride = max(0.0001, (stride * 0.1) * scale * devFactor / max(resolution.x, resolution.y));
    
    // Move agent
    float newX = px + sin(finalAngle) * actualStride;
    float newY = py + cos(finalAngle) * actualStride;
    
    // Wrap position to [0,1]
    newX = fract(newX);
    newY = fract(newY);
    
    // Output updated state - attrition is handled by pointsEmit
    outXYZ = vec4(newX, newY, pz, 1.0);
    outVel = vec4(0.0, 0.0, rotRand, strideRand);
    outRGBA = rgba;
}
`,wgsl:`// Flow agent pass - Common Agent Architecture middleware
// Reads from global_xyz/vel/rgba, applies flow-field movement, writes back
// State format: xyz=[x, y, z, alive] vel=[vx, vy, rotRand, strideRand] rgba=[r, g, b, a]
// Positions in normalized coords [0,1]

struct Uniforms {
    resolution: vec2f,
    time: f32,
    stride: f32,
    strideDeviation: f32,
    kink: f32,
    quantize: f32,
    inputWeight: f32,
    behavior: f32,
}

struct Outputs {
    @location(0) xyz: vec4f,
    @location(1) vel: vec4f,
    @location(2) rgba: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(3) var xyzTex: texture_2d<f32>;
@group(0) @binding(4) var velTex: texture_2d<f32>;
@group(0) @binding(5) var rgbaTex: texture_2d<f32>;

const TAU: f32 = 6.283185307179586;
const RIGHT_ANGLE: f32 = 1.5707963267948966;

fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
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

fn oklab_l(rgb: vec3f) -> f32 {
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

fn computeRotationBias(behaviorMode: i32, baseHeading: f32, rotRand: f32, time: f32, agentIndex: i32, totalAgents: i32) -> f32 {
    if (behaviorMode <= 0) {
        return 0.0;
    } else if (behaviorMode == 1) {
        return baseHeading;
    } else if (behaviorMode == 2) {
        return baseHeading + floor(rotRand * 4.0) * RIGHT_ANGLE;
    } else if (behaviorMode == 3) {
        return baseHeading + (rotRand - 0.5) * 0.25;
    } else if (behaviorMode == 4) {
        return rotRand * TAU;
    } else if (behaviorMode == 5) {
        let quarterSize = max(1, totalAgents / 4);
        let band = agentIndex / quarterSize;
        if (band <= 0) {
            return baseHeading;
        } else if (band == 1) {
            return baseHeading + floor(rotRand * 4.0) * RIGHT_ANGLE;
        } else if (band == 2) {
            return baseHeading + (rotRand - 0.5) * 0.25;
        } else {
            return rotRand * TAU;
        }
    } else if (behaviorMode == 10) {
        return normalized_sine((time - rotRand) * TAU);
    } else {
        return rotRand * TAU;
    }
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> Outputs {
    let coord = vec2i(fragCoord.xy);
    let stateSize = textureDimensions(xyzTex, 0);
    
    // Read input state from pipeline
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    // Extract components (positions in normalized coords [0,1])
    var px = xyz.x;
    var py = xyz.y;
    let pz = xyz.z;
    let alive = xyz.w;
    
    // Flow-specific state stored in vel
    let rotRand = vel.z;     // Per-agent rotation random [0,1] from pointsEmit
    let strideRand = vel.w;  // Per-agent stride random [-0.5, 0.5] from pointsEmit
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        return Outputs(xyz, vel, rgba);
    }
    
    // Sample input texture at current position for flow direction
    let texSize = textureDimensions(inputTex, 0);
    var texCoord = vec2i(i32(px * f32(texSize.x)), i32((1.0 - py) * f32(texSize.y)));
    texCoord = clamp(texCoord, vec2i(0), vec2i(texSize) - vec2i(1));
    let texel = textureLoad(inputTex, texCoord, 0);
    let inputLuma = oklab_l(texel.rgb);
    
    // inputWeight controls how much the input texture influences flow direction
    let weightBlend = clamp(u.inputWeight * 0.01, 0.0, 1.0);
    let indexValue = mix(0.5, inputLuma, weightBlend);
    
    // Compute rotation bias based on behavior uniform
    let baseHeading = hash(0u) * TAU;
    let behaviorMode = i32(u.behavior);
    let totalAgents = i32(stateSize.x * stateSize.y);
    let agentIndex = coord.x + coord.y * i32(stateSize.x);
    let rotationBias = computeRotationBias(behaviorMode, baseHeading, rotRand, u.time, agentIndex, totalAgents);
    
    // Final angle based on input texture and kink
    var finalAngle = indexValue * TAU * u.kink + rotationBias;
    
    if (u.quantize > 0.5) {
        finalAngle = round(finalAngle);
    }
    
    // Compute actual stride in normalized coords
    let scale = max(max(u.resolution.x, u.resolution.y) / 1024.0, 1.0);
    let devFactor = 1.0 + strideRand * 2.0 * u.strideDeviation;
    let actualStride = max(0.0001, (u.stride * 0.1) * scale * devFactor / max(u.resolution.x, u.resolution.y));
    
    // Move agent
    var newX = px + sin(finalAngle) * actualStride;
    var newY = py + cos(finalAngle) * actualStride;
    
    // Wrap position to [0,1]
    newX = fract(newX);
    newY = fract(newY);
    
    // Output updated state - attrition is handled by pointsEmit
    return Outputs(
        vec4f(newX, newY, pz, 1.0),
        vec4f(0.0, 0.0, rotRand, strideRand),
        rgba
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
`,wgsl:`struct Uniforms {
    resolution: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputTexSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    return textureSample(inputTex, inputTexSampler, vec2f(uv.x, 1.0 - uv.y));
}
`}},a=`# flow

Agent-based luminosity flow field with behaviors

## Description

Agents move according to the brightness of the input texture, creating painterly strokes and flow patterns.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| stateSize | int | 256 | - | - |
| behavior | int | obedient | none/obedient/crosshatch/unruly/chaotic/randomMix/meandering | Behavior |
| stride | float | 10 | 1-1000 | Stride |
| strideDeviation | float | 0.05 | 0-0.5 | Stride deviation |
| kink | float | 1 | 0-10 | Kink |
| quantize | boolean | false | - | Quantize |
| inputWeight | float | 100 | 0-100 | Input weight |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .flow()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(o))e.shaders[i]={...n}}e&&a&&(e.help=a);var d="points/flow",f="points",p="flow",c=e;export{c as default,d as effectId,p as effectName,a as help,f as namespace};
