/* points/dla */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Dla",namespace:"points",func:"dla",tags:["sim"],description:"Diffusion-limited aggregation",textures:{global_dla_grid:{width:"100%",height:"100%",format:"rgba16f"}},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{stateSize:{type:"int",default:256,uniform:"stateSize",ui:{control:!1}},anchorDensity:{type:"float",default:.5,uniform:"anchorDensity",min:.01,max:5,step:.01,ui:{label:"anchors",control:"slider",category:"chemistry"}},stride:{type:"float",default:15,uniform:"stride",min:1,max:50,step:1,ui:{label:"stride",control:"slider",category:"agents"}},inputWeight:{type:"float",default:15,uniform:"inputWeight",min:0,max:100,step:1,ui:{label:"input weight",control:"slider",category:"agents"}},decay:{type:"float",default:.25,uniform:"decay",min:0,max:.5,step:.01,ui:{label:"decay",control:"slider",category:"chemistry"}},deposit:{type:"float",default:17.5,uniform:"deposit",min:.5,max:20,step:.5,ui:{label:"deposit",control:"slider",category:"chemistry"}},attrition:{type:"float",default:7.5,uniform:"attrition",min:0,max:10,step:.1,ui:{label:"attrition",control:"slider",category:"agents"}},matteOpacity:{type:"float",default:1,uniform:"matteOpacity",min:0,max:1,ui:{label:"bg opacity",control:"slider",category:"output"}}},passes:[{name:"initGrid",program:"initGrid",inputs:{gridTex:"global_dla_grid"},uniforms:{decay:"decay",anchorDensity:"anchorDensity"},outputs:{fragColor:"global_dla_grid"}},{name:"copyGrid",program:"copyGrid",inputs:{gridTex:"global_dla_grid"},outputs:{fragColor:"global_dla_grid"}},{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba",gridTex:"global_dla_grid",inputTex:"inputTex"},uniforms:{stride:"stride",inputWeight:"inputWeight",attrition:"attrition",stateSize:"stateSize"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"depositGrid",program:"depositGrid",drawMode:"points",count:"input",blend:["one","one"],inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba"},uniforms:{deposit:"deposit"},outputs:{fragColor:"global_dla_grid"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex",gridTex:"global_dla_grid"},uniforms:{matteOpacity:"matteOpacity"},outputs:{fragColor:"outputTex"}}]});var r={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform vec2 resolution;
uniform float time;
uniform int frame;

// DLA parameters
uniform float stride;
uniform float inputWeight;
uniform float attrition;
uniform int stateSize;
uniform bool resetState;

// Input state from pipeline (from pointsEmit)
uniform sampler2D xyzTex;    // [x, y, z, alive]
uniform sampler2D velTex;    // [seed, justStuck, 0, agentRand]
uniform sampler2D rgbaTex;   // [r, g, b, a]

// DLA internal textures
uniform sampler2D gridTex;   // Anchor grid (internal, not rendered)
uniform sampler2D inputTex;  // For input-weighted movement

// Output state (MRT)
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

// Integer-based hash for deterministic randomness
uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

// PCG-style random using float seed (stored as bits)
float rand(inout float seed) {
    uint bits = floatBitsToUint(seed);
    bits = hash_uint(bits);
    seed = uintBitsToFloat(bits | 0x3F800000u) - 1.0; // Map to [0,1)
    // Ensure we get a different value next time
    bits = hash_uint(bits + 1u);
    seed = uintBitsToFloat((bits & 0x007FFFFFu) | 0x3F800000u) - 1.0;
    return seed;
}

vec2 randomDirection(inout float seed) {
    float theta = rand(seed) * 6.28318530718;
    return vec2(cos(theta), sin(theta));
}

vec2 wrap01(vec2 v) {
    return fract(max(v, 0.0));
}

float sampleGrid(vec2 uv) {
    ivec2 dims = textureSize(gridTex, 0);
    ivec2 coord = ivec2(wrap01(uv) * vec2(dims));
    return texelFetch(gridTex, coord, 0).a;
}

float neighborhood(vec2 uv, float radius) {
    vec2 gridDims = vec2(textureSize(gridTex, 0));
    vec2 texel = radius / gridDims;
    float accum = 0.0;
    accum += sampleGrid(uv);
    accum += sampleGrid(uv + vec2(texel.x, 0.0));
    accum += sampleGrid(uv - vec2(texel.x, 0.0));
    accum += sampleGrid(uv + vec2(0.0, texel.y));
    accum += sampleGrid(uv - vec2(0.0, texel.y));
    return accum * 0.2;
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 stateDims = textureSize(xyzTex, 0);
    
    // Read input state from pipeline (from pointsEmit)
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    // Extract state
    vec2 pos = xyz.xy;
    float alive = xyz.w;
    
    // vel.x = seed for randomness (initialized from agentRand if needed)
    // vel.y = justStuck flag (1.0 if this agent just stuck, used by depositGrid)
    // vel.w = agentRand from pointsEmit
    float seed = vel.x;
    float agentRand = vel.w;
    
    // Initialize or evolve seed using per-particle deterministic chain
    uint agentId = uint(coord.x + coord.y * stateDims.x);
    if (seed <= 0.0) {
        seed = hash(agentId) + 0.001;
    }
    uint frameSeed = hash_uint(agentId * 31u + floatBitsToUint(seed));
    seed = uintBitsToFloat((frameSeed & 0x007FFFFFu) | 0x3F800000u) - 1.0;
    
    // If not alive, pass through (waiting for respawn from pointsEmit)
    if (alive < 0.5) {
        outXYZ = xyz;
        outVel = vec4(seed, 0.0, 0.0, agentRand);
        outRGBA = rgba;
        return;
    }
    
    // Grid dimensions for step size
    vec2 gridDims = vec2(textureSize(gridTex, 0));
    float texel = 1.0 / max(gridDims.x, gridDims.y);
    
    // Check proximity to existing structure
    float local = neighborhood(pos, 2.0);
    float proximity = smoothstep(0.015, 0.12, local);
    
    // Random direction for walk
    vec2 randomDir = randomDirection(seed);
    
    // Input-weighted direction
    float inputW = inputWeight / 100.0;
    vec2 stepDir = randomDir;
    if (inputW > 0.0) {
        ivec2 inputDims = textureSize(inputTex, 0);
        ivec2 inputCoord = ivec2(wrap01(pos) * vec2(inputDims));
        vec4 inputVal = texelFetch(inputTex, inputCoord, 0);
        vec2 inputDir = inputVal.xy * 2.0 - 1.0;
        if (length(inputDir) > 0.01) {
            inputDir = normalize(inputDir);
            stepDir = normalize(mix(randomDir, inputDir, inputW));
        }
    }
    
    // Step size: slow down near structure for finer aggregation
    float stepSize = (stride / 10.0) * texel * mix(3.0, 0.5, proximity);
    
    // Add wander jitter
    stepDir += randomDirection(seed) * 0.3;
    stepDir = normalize(stepDir);
    
    // Move agent
    vec2 candidate = wrap01(pos + stepDir * stepSize);
    
    // Check for sticking - require direct adjacency (radius 1.0)
    float here = sampleGrid(candidate);
    float nearby = neighborhood(candidate, 1.0);
    
    // Stick if adjacent to structure but local spot is empty
    bool stuck = (nearby > 0.3 && here < 0.5);
    
    // Attrition: random respawn (0-10 scale \u2192 0-0.1)
    bool needsRespawn = false;
    if (attrition > 0.0) {
        float attritionRate = attrition * 0.01;
        if (rand(seed) < attritionRate) {
            needsRespawn = true;
        }
    }
    
    if (stuck) {
        // Agent stuck: mark as dead for respawn, flag justStuck for deposit
        outXYZ = vec4(candidate, 0.0, 0.0);  // w=0 signals death to pointsEmit
        outVel = vec4(seed, 1.0, 0.0, agentRand);  // y=1 signals "just stuck" for depositGrid
        outRGBA = rgba;
    } else if (needsRespawn) {
        // Attrition death: mark for respawn
        outXYZ = vec4(candidate, 0.0, 0.0);  // w=0 signals death
        outVel = vec4(seed, 0.0, 0.0, agentRand);  // y=0, not stuck
        outRGBA = rgba;
    } else {
        // Continue walking
        outXYZ = vec4(candidate, 0.0, 1.0);  // w=1 alive
        outVel = vec4(seed, 0.0, 0.0, agentRand);
        outRGBA = rgba;
    }
}
`,wgsl:`// DLA - Agent Walk Pass (Common Agent Architecture)
// Reads agent state from pointsEmit, performs random walk, detects sticking

struct Uniforms {
    stride: f32,
    inputWeight: f32,
    attrition: f32,
    stateSize: i32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

struct FragmentOutputs {
    @location(0) outXYZ: vec4<f32>,
    @location(1) outVel: vec4<f32>,
    @location(2) outRGBA: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var velTex: texture_2d<f32>;
@group(0) @binding(3) var rgbaTex: texture_2d<f32>;
@group(0) @binding(4) var gridTex: texture_2d<f32>;
@group(0) @binding(5) var inputTex: texture_2d<f32>;

// Integer-based hash for deterministic randomness
fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

// PCG-style random using float seed (stored as bits)
fn rand(seed: ptr<function, f32>) -> f32 {
    var bits = bitcast<u32>(*seed);
    bits = hash_uint(bits);
    *seed = bitcast<f32>((bits & 0x007FFFFFu) | 0x3F800000u) - 1.0;
    bits = hash_uint(bits + 1u);
    *seed = bitcast<f32>((bits & 0x007FFFFFu) | 0x3F800000u) - 1.0;
    return *seed;
}

fn randomDirection(seed: ptr<function, f32>) -> vec2<f32> {
    let theta = rand(seed) * 6.28318530718;
    return vec2<f32>(cos(theta), sin(theta));
}

fn wrap01(v: vec2<f32>) -> vec2<f32> {
    return fract(max(v, vec2<f32>(0.0)));
}

fn sampleGrid(uv: vec2<f32>) -> f32 {
    let dims = vec2<f32>(textureDimensions(gridTex));
    let w = wrap01(uv);
    // WebGPU: gridTex y=0=top, worldPos y=0=visual-bottom. Read at 1-y.
    let coord = vec2<i32>(vec2f(w.x, 1.0 - w.y) * dims);
    return textureLoad(gridTex, coord, 0).a;
}

fn neighborhood(uv: vec2<f32>, radius: f32) -> f32 {
    let dims = vec2<f32>(textureDimensions(gridTex));
    let texel = radius / dims;
    var accum = 0.0;
    accum += sampleGrid(uv);
    accum += sampleGrid(uv + vec2<f32>(texel.x, 0.0));
    accum += sampleGrid(uv - vec2<f32>(texel.x, 0.0));
    accum += sampleGrid(uv + vec2<f32>(0.0, texel.y));
    accum += sampleGrid(uv - vec2<f32>(0.0, texel.y));
    return accum * 0.2;
}

@fragment
fn main(in: VertexOutput) -> FragmentOutputs {
    let coord = vec2<i32>(in.position.xy);
    let stateDims = textureDimensions(xyzTex);
    
    // Read input state from pipeline (from pointsEmit)
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    // Extract state
    var pos = xyz.xy;
    let alive = xyz.w;
    
    // vel.x = seed, vel.y = justStuck flag, vel.w = agentRand from emitter
    var seed = vel.x;
    let agentRand = vel.w;
    
    // Initialize or evolve seed using per-particle deterministic chain (matches GLSL)
    let agentId = u32(coord.x + coord.y * i32(stateDims.x));
    if (seed <= 0.0) {
        seed = hash(agentId) + 0.001;
    }
    let frameSeed = hash_uint(agentId * 31u + bitcast<u32>(seed));
    seed = bitcast<f32>((frameSeed & 0x007FFFFFu) | 0x3F800000u) - 1.0;
    
    // If not alive, pass through (waiting for respawn from pointsEmit)
    if (alive < 0.5) {
        return FragmentOutputs(
            xyz,
            vec4<f32>(seed, 0.0, 0.0, agentRand),
            rgba
        );
    }
    
    // Grid dimensions for step size
    let gridDims = vec2<f32>(textureDimensions(gridTex));
    let texel = 1.0 / max(gridDims.x, gridDims.y);
    
    // Check proximity to existing structure
    let local = neighborhood(pos, 2.0);
    let proximity = smoothstep(0.015, 0.12, local);
    
    // Random direction for walk
    let randomDir = randomDirection(&seed);
    
    // Input-weighted direction
    let inputW = u.inputWeight / 100.0;
    var stepDir = randomDir;
    if (inputW > 0.0) {
        let inputDims = textureDimensions(inputTex);
        let wpos = wrap01(pos);
        // WebGPU: inputTex y=0=top, worldPos y=0=visual-bottom. Read at 1-y.
        let inputCoord = vec2<i32>(vec2f(wpos.x, 1.0 - wpos.y) * vec2<f32>(inputDims));
        let inputVal = textureLoad(inputTex, inputCoord, 0);
        var inputDir = inputVal.xy * 2.0 - 1.0;
        if (length(inputDir) > 0.01) {
            inputDir = normalize(inputDir);
            stepDir = normalize(mix(randomDir, inputDir, inputW));
        }
    }
    
    // Step size: slow down near structure for finer aggregation
    let stepSize = (u.stride / 10.0) * texel * mix(3.0, 0.5, proximity);
    
    // Add wander jitter
    stepDir += randomDirection(&seed) * 0.3;
    stepDir = normalize(stepDir);
    
    // Move agent
    let candidate = wrap01(pos + stepDir * stepSize);
    
    // Check for sticking - require direct adjacency (radius 1.0)
    let here = sampleGrid(candidate);
    let nearby = neighborhood(candidate, 1.0);
    
    // Stick if adjacent to structure but local spot is empty
    let stuck = (nearby > 0.3 && here < 0.5);
    
    // Attrition: random respawn (0-10 scale \u2192 0-0.1)
    var needsRespawn = false;
    if (u.attrition > 0.0) {
        let attritionRate = u.attrition * 0.01;
        if (rand(&seed) < attritionRate) {
            needsRespawn = true;
        }
    }
    
    if (stuck) {
        // Agent stuck: mark as dead for respawn, flag justStuck for deposit
        return FragmentOutputs(
            vec4<f32>(candidate, 0.0, 0.0),  // w=0 signals death to pointsEmit
            vec4<f32>(seed, 1.0, 0.0, agentRand),  // y=1 signals "just stuck" for depositGrid
            rgba
        );
    } else if (needsRespawn) {
        // Attrition death: mark for respawn
        return FragmentOutputs(
            vec4<f32>(candidate, 0.0, 0.0),  // w=0 signals death
            vec4<f32>(seed, 0.0, 0.0, agentRand),  // y=0, not stuck
            rgba
        );
    } else {
        // Continue walking
        return FragmentOutputs(
            vec4<f32>(candidate, 0.0, 1.0),  // w=1 alive
            vec4<f32>(seed, 0.0, 0.0, agentRand),
            rgba
        );
    }
}
`},copyGrid:{glsl:`#version 300 es
precision highp float;

// Copy Pass - Blit grid to write buffer for proper blending

uniform sampler2D gridTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(gridTex, uv);
}
`,wgsl:`// Copy Pass - Blit grid to write buffer for proper blending

@group(0) @binding(0) var uSampler: sampler;
@group(0) @binding(1) var gridTex: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0),
    );
    var uvs = array<vec2f, 6>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(1.0, 0.0),
    );
    var out: VertexOutput;
    out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    out.uv = uvs[vertexIndex];
    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    return textureSample(gridTex, uSampler, in.uv);
}
`},depositGrid:{vertex:`#version 300 es
precision highp float;

// DLA - Deposit stuck agents to anchor grid (vertex shader)
// Only deposits agents that just stuck (vel.y == 1.0)

uniform sampler2D xyzTex;
uniform sampler2D velTex;
uniform sampler2D rgbaTex;

out float v_weight;
out vec3 v_color;

ivec2 decodeIndex(int index, ivec2 dims) {
    int x = index % dims.x;
    int y = index / dims.x;
    return ivec2(x, y);
}

void main() {
    ivec2 dims = textureSize(xyzTex, 0);
    int totalAgents = dims.x * dims.y;
    
    // Skip if vertex index exceeds agent count
    if (gl_VertexID >= totalAgents) {
        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
        gl_PointSize = 1.0;
        v_weight = 0.0;
        v_color = vec3(0.0);
        return;
    }
    
    ivec2 coord = decodeIndex(gl_VertexID, dims);
    
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    // vel.y == 1.0 means this agent just stuck
    float justStuck = vel.y;
    
    v_weight = justStuck;
    v_color = rgba.rgb;
    
    // Only render if just stuck
    if (justStuck < 0.5) {
        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
        gl_PointSize = 1.0;
        return;
    }
    
    // Position from xyz (normalized [0,1])
    vec2 clip = xyz.xy * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = 1.0;
}
`,fragment:`#version 300 es
precision highp float;

// DLA - Deposit stuck agents to anchor grid (fragment shader)

uniform float deposit;

in float v_weight;
in vec3 v_color;

out vec4 fragColor;

void main() {
    // Discard if not a stuck agent
    if (v_weight < 0.5) {
        discard;
    }
    
    // Deposit energy with agent color
    // deposit range [0.5, 20] maps to energy [0.05, 2.0]
    float energy = deposit * 0.1;
    fragColor = vec4(v_color * energy, energy);
}
`,wgsl:`// DLA - Deposit stuck agents to anchor grid (WGSL)
// Only deposits agents that just stuck (vel.y == 1.0)

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) weight: f32,
    @location(1) color: vec3<f32>,
}

@group(0) @binding(0) var xyzTex: texture_2d<f32>;
@group(0) @binding(1) var velTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> deposit: f32;

fn decodeIndex(index: i32, dims: vec2<i32>) -> vec2<i32> {
    let x = index % dims.x;
    let y = index / dims.x;
    return vec2<i32>(x, y);
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    
    let dims = vec2<i32>(textureDimensions(xyzTex));
    let totalAgents = dims.x * dims.y;
    
    // Skip if vertex index exceeds agent count
    if (i32(vertexIndex) >= totalAgents) {
        output.position = vec4<f32>(-2.0, -2.0, 0.0, 1.0);
        output.weight = 0.0;
        output.color = vec3<f32>(0.0);
        return output;
    }
    
    let coord = decodeIndex(i32(vertexIndex), dims);
    
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    // vel.y == 1.0 means this agent just stuck
    let justStuck = vel.y;
    
    output.weight = justStuck;
    output.color = rgba.rgb;
    
    // Only render if just stuck
    if (justStuck < 0.5) {
        output.position = vec4<f32>(-2.0, -2.0, 0.0, 1.0);
        return output;
    }
    
    // Position from xyz (normalized [0,1])
    let clip = xyz.xy * 2.0 - 1.0;
    output.position = vec4<f32>(clip, 0.0, 1.0);
    
    return output;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Discard if not a stuck agent
    if (in.weight < 0.5) {
        discard;
    }
    
    // Deposit energy with agent color
    // deposit range [0.5, 20] maps to energy [0.05, 2.0]
    let energy = deposit * 0.1;
    return vec4<f32>(in.color * energy, energy);
}
`},initGrid:{glsl:`#version 300 es
precision highp float;

// DLA - Initialize and decay anchor grid

uniform sampler2D gridTex;
uniform vec2 resolution;
uniform int frame;
uniform float decay;
uniform float anchorDensity;
uniform bool resetState;

out vec4 fragColor;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // If resetState is true, clear the grid
    if (resetState) {
        fragColor = vec4(0.0);
        return;
    }
    
    // Sample previous grid value
    vec4 prevGrid = texture(gridTex, uv);
    float prev = prevGrid.a;
    vec3 prevColor = prevGrid.rgb;
    
    // Apply decay (0 = full persistence, higher = faster fade)
    // decay range [0, 0.5] maps to persistence [1.0, 0.5]
    float persistence = 1.0 - decay;
    float energy = prev * persistence;
    vec3 color = prevColor * persistence;
    
    // Cap energy to prevent runaway accumulation
    energy = min(energy, 3.0);
    
    // Seed initial structure - always try, but only where grid is empty
    float rng = hash21(gl_FragCoord.xy);
    
    // Radial falloff from center - larger area for seeding
    float radial = smoothstep(0.25, 0.0, length(uv - 0.5));
    
    // Seed density controls threshold (higher = more seeds)
    // anchorDensity=1.0 \u2192 threshold=0.9 \u2192 10% of radial pixels
    float seedThreshold = 1.0 - anchorDensity * 0.1;
    float seedWeight = step(seedThreshold, rng) * radial;
    
    // Only seed where there's no existing structure
    if (seedWeight > 0.0 && prev < 0.1) {
        float strength = mix(0.5, 1.0, rng);
        energy = max(energy, strength);
        color = vec3(strength);
    }
    
    fragColor = vec4(color, energy);
}
`,wgsl:`// DLA - Initialize and decay anchor grid

struct Uniforms {
    resolution: vec2<f32>,
    decay: f32,
    anchorDensity: f32,
    resetState: i32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var gridTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> u: Uniforms;

fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3<f32>(p3.z, p3.y, p3.x) + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    // If resetState is true, clear the grid
    if (u.resetState != 0) {
        return vec4<f32>(0.0);
    }
    
    let coord = vec2<i32>(in.position.xy);
    let uv = in.position.xy / u.resolution;
    
    // Sample previous grid value
    let prevSample = textureLoad(gridTex, coord, 0);
    let prev = prevSample.a;
    let prevColor = prevSample.rgb;
    
    // Apply decay (0 = full persistence, higher = faster fade)
    // decay range [0, 0.5] maps to persistence [1.0, 0.5]
    let persistence = 1.0 - u.decay;
    var energy = prev * persistence;
    var color = prevColor * persistence;
    
    // Cap energy to prevent runaway accumulation
    energy = min(energy, 3.0);
    
    // Seed initial structure - always try, but only where grid is empty
    let rng = hash21(in.position.xy);
    
    // Radial falloff from center - larger area for seeding
    let radial = smoothstep(0.25, 0.0, length(uv - 0.5));
    
    // Seed density controls threshold (higher = more seeds)
    // anchorDensity=1.0 \u2192 threshold=0.9 \u2192 10% of radial pixels
    let seedThreshold = 1.0 - u.anchorDensity * 0.1;
    let seedWeight = step(seedThreshold, rng) * radial;
    
    // Only seed where there's no existing structure
    if (seedWeight > 0.0 && prev < 0.1) {
        let strength = mix(0.5, 1.0, rng);
        energy = max(energy, strength);
        color = vec3<f32>(strength);
    }
    
    return vec4<f32>(color, energy);
}
`},passthrough:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D gridTex;
uniform vec2 resolution;
uniform float matteOpacity;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 inputCol = texture(inputTex, uv);
    vec4 grid = texture(gridTex, uv);
    
    // Blend grid structure over input
    // Grid alpha indicates structure presence
    float gridStrength = clamp(grid.a, 0.0, 1.0);
    vec3 gridColor = grid.rgb;
    float matteAlpha = matteOpacity;
    
    // Mix: where grid exists, show grid color; otherwise show input (premultiplied by matte)
    vec3 color = mix(inputCol.rgb * matteAlpha, gridColor, gridStrength);
    
    // Alpha: where grid exists, full opacity; elsewhere, matte opacity
    float alpha = max(gridStrength, matteAlpha);
    
    fragColor = vec4(color, alpha);
}
`,wgsl:`struct Uniforms {
    resolution: vec2f,
    matteOpacity: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputTexSampler: sampler;
@group(0) @binding(3) var gridTex: texture_2d<f32>;
@group(0) @binding(4) var gridTexSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    let displayUv = vec2f(uv.x, 1.0 - uv.y);
    let input = textureSample(inputTex, inputTexSampler, displayUv);
    let grid = textureSample(gridTex, gridTexSampler, displayUv);
    
    // Blend grid structure over input
    // Grid alpha indicates structure presence
    let gridStrength = clamp(grid.a, 0.0, 1.0);
    let gridColor = grid.rgb;
    let matteAlpha = u.matteOpacity;
    
    // Mix: where grid exists, show grid color; otherwise show input (premultiplied by matte)
    let color = mix(input.rgb * matteAlpha, gridColor, gridStrength);
    
    // Alpha: where grid exists, full opacity; elsewhere, matte opacity
    let alpha = max(gridStrength, matteAlpha);
    
    return vec4f(color, alpha);
}
`}},o=`# dla

Diffusion-limited aggregation

## Description

Agents perform random walks until they contact existing structure, then stick and deposit. Creates fractal, crystalline growth patterns from a central seed.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| stateSize | int | 256 | - | - |
| anchorDensity | float | 0.5 | 0.01-5 | Anchor density |
| stride | float | 15 | 1-50 | Stride |
| inputWeight | float | 15 | 0-100 | Input weight |
| decay | float | 0.25 | 0-0.5 | Decay |
| deposit | float | 17.5 | 0.5-20 | Deposit |
| attrition | float | 7.5 | 0-10 | Attrition |
| matteOpacity | float | 1 | 0-1 | Background opacity |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .dla()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&o&&(n.help=o);var d="points/dla",c="points",p="dla",f=n;export{f as default,d as effectId,p as effectName,o as help,c as namespace};
