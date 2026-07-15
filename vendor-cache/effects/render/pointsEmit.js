/* render/pointsEmit */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Points Emit",func:"pointsEmit",namespace:"render",tags:["agents"],description:"Initialize and maintain agent state for particle systems",globals:{stateSize:{type:"int",default:256,min:64,max:2048,uniform:"stateSize",ui:{label:"state size",control:"dropdown"},choices:{x64:64,x128:128,x256:256,x512:512,x1024:1024,x2048:2048},randChoices:[64,128,256,512]},layout:{type:"int",default:0,uniform:"layout",ui:{label:"layout",control:"dropdown"},choices:{random:0,grid:1,center:2,ring:3,clusters:4,spiral:5}},seed:{type:"int",default:0,min:0,max:100,uniform:"seed",ui:{label:"seed",control:"slider"}},attrition:{type:"float",default:0,min:0,max:10,uniform:"attrition",ui:{label:"attrition",control:"slider"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"reset"}}},textures:{global_xyz:{width:{param:"stateSize",default:256},height:{param:"stateSize",default:256},format:"rgba32f"},global_vel:{width:{param:"stateSize",default:256},height:{param:"stateSize",default:256},format:"rgba32f"},global_rgba:{width:{param:"stateSize",default:256},height:{param:"stateSize",default:256},format:"rgba8"}},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",passes:[{name:"init",program:"init",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba",inputTex:"inputTex"},uniforms:{layoutMode:"layout",attrition:"attrition",resetState:"resetState"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={init:{glsl:`#version 300 es
precision highp float;

// Standard uniforms
uniform float time;
uniform vec2 resolution;
uniform int seed;

// Effect parameters
uniform int stateSize;
uniform int layoutMode; // 0=Random, 1=Grid, 2=Center, 3=Ring
uniform float attrition; // Per-frame respawn chance (0-10%)
uniform bool resetState; // Force all agents to respawn

// Inputs
uniform sampler2D xyzTex;
uniform sampler2D velTex;
uniform sampler2D rgbaTex;
uniform sampler2D inputTex;  // Chained input for coloring agents

// Outputs (MRT)
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

vec2 hash2(uint seed) {
    return vec2(hash(seed), hash(seed + 1u));
}

void main() {
    // Current coordinate in state texture
    ivec2 stateCoord = ivec2(gl_FragCoord.xy);
    vec2 uv = gl_FragCoord.xy / float(stateSize);
    
    // Agent seed for random generation - compute early for attrition check
    uint agentSeed = uint(stateCoord.x + stateCoord.y * stateSize) + uint(seed);
    
    // Read previous state using texelFetch for pixel parity with WGSL
    vec4 pPos = texelFetch(xyzTex, stateCoord, 0);
    vec4 pVel = texelFetch(velTex, stateCoord, 0);
    vec4 pCol = texelFetch(rgbaTex, stateCoord, 0);
    
    // Check if agent needs respawn
    // w component of xyz holds the "alive" flag
    // < 0.5 means dead/uninitialized
    // We also respawn on the very first frame (time == 0) or if alpha is 0
    // resetState forces all agents to respawn
    bool needsRespawn = resetState || (pPos.w < 0.5) || (time < 0.01 && pPos.w == 0.0);
    
    // Attrition: per-frame random respawn chance
    // Use continuous time mixed with agent seed to decorrelate respawns
    if (!needsRespawn && attrition > 0.0) {
        // Mix time continuously into hash to avoid burst patterns
        // floatBitsToUint gives us full precision of time value
        uint timeBits = floatBitsToUint(time);
        uint check_seed = agentSeed * 1664525u + timeBits;
        check_seed = hash_uint(check_seed); // Extra mixing
        float respawnRand = float(check_seed) / 4294967295.0;
        float attritionRate = attrition * 0.01; // 0-10% per frame
        if (respawnRand < attritionRate) {
            needsRespawn = true;
        }
    }
    
    // Compute spawn values unconditionally (no branching in texture access)
    // Use integer-based hash for cross-platform determinism
    vec2 rnd = hash2(agentSeed);
    
    // Compute position based on layout mode
    vec3 newPos = vec3(0.0);
    if (layoutMode == 0) { // Random
        newPos = vec3(rnd, 0.0);
    } else if (layoutMode == 1) { // Grid
        newPos = vec3(uv, 0.0);
    } else if (layoutMode == 2) { // Center
        newPos = vec3(0.5 + (rnd - 0.5) * 0.1, 0.0);
    } else if (layoutMode == 3) { // Ring
        float angle = rnd.x * 6.28318;
        float radius = 0.3 + rnd.y * 0.1;
        newPos = vec3(0.5 + vec2(cos(angle), sin(angle)) * radius, 0.0);
    } else if (layoutMode == 4) { // Clusters
        // 5 random cluster centers based on seed
        uint clusterSeed = uint(seed) * 12345u;
        float clusterId = floor(rnd.x * 5.0);
        uint centerSeed = clusterSeed + uint(clusterId) * 31u;
        vec2 center = vec2(hash(centerSeed), hash(centerSeed + 17u));
        // Agents spread around center with ~15% radius
        float r = hash(agentSeed + 2u) * 0.15;
        float a = hash(agentSeed + 3u) * 6.28318;
        newPos = vec3(center + vec2(cos(a), sin(a)) * r, 0.0);
        // Wrap to [0,1]
        newPos.xy = fract(newPos.xy);
    } else if (layoutMode == 5) { // Spiral
        // Archimedean spiral from center
        float t = rnd.x * 20.0;
        float r = t * 0.02;  // Spiral expands slowly
        float a = t * 6.28318;
        newPos = vec3(0.5 + vec2(cos(a), sin(a)) * r, 0.0);
        // Clamp to valid range
        newPos.xy = clamp(newPos.xy, 0.0, 1.0);
    }
    
    // Sample color from inputTex - use texelFetch to avoid uniform control flow issue
    ivec2 texDims = textureSize(inputTex, 0);
    ivec2 texCoord = ivec2(newPos.xy * vec2(texDims));
    vec4 sampledCol = texelFetch(inputTex, texCoord, 0);
    // Use sampled color if texture has content (alpha > 0), otherwise white
    vec4 newCol = (sampledCol.a > 0.0) ? sampledCol : vec4(1.0);
    
    // Select between spawned values and previous state
    if (needsRespawn) {
        // Store per-agent randoms in vel for downstream effects:
        // vel.z = rotRand [0,1] for rotation variation (flow behavior)
        // vel.w = strideRand [-0.5,0.5] for stride variation
        float rotRand = hash(agentSeed + 100u);
        float strideRand = hash(agentSeed + 101u) - 0.5;
        outXYZ = vec4(newPos, 1.0);
        outVel = vec4(0.0, 0.0, rotRand, strideRand);
        outRGBA = newCol;
    } else {
        outXYZ = pPos;
        outVel = pVel;
        outRGBA = pCol;
    }
}
`,wgsl:`struct Uniforms {
    time: f32,
    resolution: vec2<f32>,
    seed: i32,
    stateSize: i32,
    layoutMode: i32,
    attrition: f32,
    resetState: u32,
};

// Bindings: uniforms at 0, then textures consecutively (no samplers for textureLoad)
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var velTex: texture_2d<f32>;
@group(0) @binding(3) var rgbaTex: texture_2d<f32>;
@group(0) @binding(4) var inputTex: texture_2d<f32>;

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

fn hash2(seed: u32) -> vec2<f32> {
    return vec2<f32>(hash(seed), hash(seed + 1u));
}

@fragment
fn main(@builtin(position) coord: vec4<f32>) -> Outputs {
    let stateCoord = vec2<i32>(coord.xy);
    let uv = coord.xy / f32(u.stateSize);
    
    // Agent seed for random generation - compute early for attrition check
    let agentSeed = u32(stateCoord.x + stateCoord.y * u.stateSize) + u32(u.seed);
    
    // Read previous state using textureLoad (works in non-uniform control flow)
    let pPos = textureLoad(xyzTex, stateCoord, 0);
    let pVel = textureLoad(velTex, stateCoord, 0);
    let pCol = textureLoad(rgbaTex, stateCoord, 0);
    
    // Check if agent needs respawn
    // w component of xyz holds the "alive" flag, resetState forces respawn
    var needsRespawn = (u.resetState != 0u) || (pPos.w < 0.5) || (u.time < 0.01 && pPos.w == 0.0);
    
    // Attrition: per-frame random respawn chance
    // Use continuous time mixed with agent seed to decorrelate respawns
    if (!needsRespawn && u.attrition > 0.0) {
        // Mix time continuously into hash to avoid burst patterns
        // bitcast gives us full precision of time value
        let timeBits = bitcast<u32>(u.time);
        var check_seed = agentSeed * 1664525u + timeBits;
        check_seed = hash_uint(check_seed); // Extra mixing
        let respawnRand = f32(check_seed) / 4294967295.0;
        let attritionRate = u.attrition * 0.01; // 0-10% per frame
        if (respawnRand < attritionRate) {
            needsRespawn = true;
        }
    }
    
    // Compute spawn values unconditionally (no branching in texture access)
    // Use integer-based hash for cross-platform determinism
    let rnd = hash2(agentSeed);
    
    // Compute position based on layout mode
    var newPos = vec3<f32>(0.0);
    if (u.layoutMode == 0) { // Random
        newPos = vec3<f32>(rnd, 0.0);
    } else if (u.layoutMode == 1) { // Grid
        newPos = vec3<f32>(uv, 0.0);
    } else if (u.layoutMode == 2) { // Center
        newPos = vec3<f32>(0.5 + (rnd - 0.5) * 0.1, 0.0);
    } else if (u.layoutMode == 3) { // Ring
        let angle = rnd.x * 6.28318;
        let radius = 0.3 + rnd.y * 0.1;
        newPos = vec3<f32>(0.5 + vec2<f32>(cos(angle), sin(angle)) * radius, 0.0);
    } else if (u.layoutMode == 4) { // Clusters
        // 5 random cluster centers based on seed
        let clusterSeed = u32(u.seed) * 12345u;
        let clusterId = floor(rnd.x * 5.0);
        let centerSeed = clusterSeed + u32(clusterId) * 31u;
        let center = vec2<f32>(hash(centerSeed), hash(centerSeed + 17u));
        // Agents spread around center with ~15% radius
        let r = hash(agentSeed + 2u) * 0.15;
        let a = hash(agentSeed + 3u) * 6.28318;
        newPos = vec3<f32>(center + vec2<f32>(cos(a), sin(a)) * r, 0.0);
        // Wrap to [0,1]
        newPos = vec3<f32>(fract(newPos.xy), 0.0);
    } else if (u.layoutMode == 5) { // Spiral
        // Archimedean spiral from center
        let t = rnd.x * 20.0;
        let r = t * 0.02;  // Spiral expands slowly
        let a = t * 6.28318;
        newPos = vec3<f32>(0.5 + vec2<f32>(cos(a), sin(a)) * r, 0.0);
        // Clamp to valid range
        newPos = vec3<f32>(clamp(newPos.xy, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
    }
    
    // Sample color from inputTex - use textureLoad to avoid uniform control flow issue
    let texDims = textureDimensions(inputTex);
    let texCoord = vec2<i32>(newPos.xy * vec2<f32>(texDims));
    let sampledCol = textureLoad(inputTex, texCoord, 0);
    // Use sampled color if texture has content (alpha > 0), otherwise white
    let newCol = select(vec4<f32>(1.0), sampledCol, sampledCol.a > 0.0);
    
    // Select between spawned values and previous state
    if (needsRespawn) {
        // Store per-agent randoms in vel for downstream effects:
        // vel.z = rotRand [0,1] for rotation variation (flow behavior)
        // vel.w = strideRand [-0.5,0.5] for stride variation
        let rotRand = hash(agentSeed + 100u);
        let strideRand = hash(agentSeed + 101u) - 0.5;
        return Outputs(
            vec4<f32>(newPos, 1.0),
            vec4<f32>(0.0, 0.0, rotRand, strideRand),
            newCol
        );
    } else {
        return Outputs(pPos, pVel, pCol);
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
@group(0) @binding(1) var inputTexSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4f {
    return textureSample(inputTex, inputTexSampler, in.uv);
}
`}},s=`# pointsEmit

Initialize and maintain agent state for particle systems

## Description

This is the starting point for all agent-based effects. It creates and manages three state textures:
- **xyz**: Agent positions (x, y, z, alive_flag)
- **vel**: Agent velocities and per-agent data
- **rgba**: Agent colors (sampled from input texture)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| stateSize | int | x256 | x64/x128/x256/x512/x1024/x2048 | State size |
| layout | int | random | random/grid/center/ring/clusters/spiral | Layout |
| seed | int | 0 | 0-100 | Seed |
| attrition | float | 0 | 0-10 | Attrition |
| resetState | boolean | false | - | State |

## Notes

Agent count by stateSize:
- 64 \xD7 64 = 4,096 agents
- 128 \xD7 128 = 16,384 agents
- 256 \xD7 256 = 65,536 agents
- 512 \xD7 512 = 262,144 agents
- 1024 \xD7 1024 = 1,048,576 agents
- 2048 \xD7 2048 = 4,194,304 agents

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
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[a,e]of Object.entries(o))t.shaders[a]={...e}}t&&s&&(t.help=s);var d="render/pointsEmit",c="render",p="pointsEmit",f=t;export{f as default,d as effectId,p as effectName,s as help,c as namespace};
