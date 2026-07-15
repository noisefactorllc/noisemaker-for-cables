/* points/physarum */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Physarum",namespace:"points",func:"physarum",tags:["sim"],description:"Physarum slime mold simulation",textures:{global_physarum_pheromone:{width:"100%",height:"100%",format:"rgba16f"}},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{moveSpeed:{type:"float",default:1.78,uniform:"moveSpeed",min:.05,max:3,step:.01,ui:{label:"move speed",control:"slider",category:"agents"}},turnSpeed:{type:"float",default:1,uniform:"turnSpeed",min:0,max:3.14159,step:.01,ui:{label:"turn speed",control:"slider",category:"agents"}},sensorAngle:{type:"float",default:1.26,uniform:"sensorAngle",min:.1,max:1.5,step:.01,ui:{label:"sensor angle",control:"slider",category:"agents"}},sensorDistance:{type:"float",default:.03,uniform:"sensorDistance",min:.002,max:.1,step:.001,ui:{label:"sensor dist",control:"slider",category:"agents"}},inputWeight:{type:"float",default:0,uniform:"inputWeight",min:0,max:100,step:1,ui:{label:"input weight",control:"slider",category:"agents"}},deposit:{type:"float",default:.5,uniform:"deposit",min:0,max:1,step:.01,ui:{label:"deposit",control:"slider",category:"chemistry"}},decay:{type:"float",default:.1,uniform:"decay",min:0,max:1,step:.01,ui:{label:"decay",control:"slider",category:"chemistry"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"reset"}}},passes:[{name:"decayTrail",program:"diffuse",inputs:{trailTex:"global_physarum_pheromone"},uniforms:{decay:"decay",resetState:"resetState"},outputs:{fragColor:"global_physarum_pheromone"}},{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba",trailTex:"global_physarum_pheromone",inputTex:"inputTex"},uniforms:{moveSpeed:"moveSpeed",turnSpeed:"turnSpeed",sensorAngle:"sensorAngle",sensorDistance:"sensorDistance",inputWeight:"inputWeight"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"copy",program:"passthrough",inputs:{inputTex:"global_physarum_pheromone"},outputs:{fragColor:"global_physarum_pheromone"}},{name:"deposit",program:"deposit",drawMode:"points",count:"input",blend:!0,inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba"},uniforms:{deposit:"deposit"},outputs:{fragColor:"global_physarum_pheromone"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Common Agent Architecture inputs
uniform sampler2D xyzTex;      // [x, y, heading, alive] in normalized [0,1]
uniform sampler2D velTex;      // [0, 0, age, seed]
uniform sampler2D rgbaTex;     // [r, g, b, a]
uniform sampler2D trailTex;    // Trail texture for sensor feedback
uniform sampler2D inputTex;    // Input texture for field attraction

uniform vec2 resolution;
uniform float time;
uniform float moveSpeed;
uniform float turnSpeed;
uniform float sensorAngle;
uniform float sensorDistance;  // Now in normalized [0,1] coords
uniform float inputWeight;

// MRT outputs
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

const float TAU = 6.28318530718;

// Hash functions
uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

float hash_f(float n) {
    return float(hash_uint(floatBitsToUint(n))) / 4294967295.0;
}

// Wrap position to [0,1]
vec2 wrapPosition(vec2 pos) {
    return fract(pos + 1.0);  // fract handles negative values correctly with +1
}

float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Sample trail at normalized UV
float sampleTrail(vec2 uv) {
    return luminance(texture(trailTex, uv).rgb);
}

// Sample input texture for external field attraction
float sampleExternalField(vec2 uv, float weight) {
    if (weight <= 0.0) return 0.0;
    float blend = clamp(weight * 0.01, 0.0, 1.0);
    return luminance(texture(inputTex, uv).rgb) * blend * 0.05;
}

void main() {
    ivec2 stateSize = textureSize(xyzTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);
    
    // Read current state
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    vec2 pos = xyz.xy;           // Normalized [0,1]
    float heading = xyz.z;       // Radians
    float alive = xyz.w;
    float age = vel.z;
    float seed = vel.w;
    
    // Check if agent is dead (needs respawn by pointsEmit)
    if (alive < 0.5) {
        // Pass through - pointsEmit will handle respawn
        // Initialize heading from seed
        outXYZ = vec4(pos, hash(uint(seed * 1000.0)) * TAU, 0.0);
        outVel = vel;
        outRGBA = rgba;
        return;
    }
    
    // Attrition is now handled by pointsEmit
    
    // Compute sensor positions in normalized coords
    vec2 forwardDir = vec2(cos(heading), sin(heading));
    vec2 leftDir = vec2(cos(heading - sensorAngle), sin(heading - sensorAngle));
    vec2 rightDir = vec2(cos(heading + sensorAngle), sin(heading + sensorAngle));
    
    vec2 sensorPosF = wrapPosition(pos + forwardDir * sensorDistance);
    vec2 sensorPosL = wrapPosition(pos + leftDir * sensorDistance);
    vec2 sensorPosR = wrapPosition(pos + rightDir * sensorDistance);
    
    // Sample trail + external field at sensor positions
    float valF = sampleTrail(sensorPosF) + sampleExternalField(sensorPosF, inputWeight);
    float valL = sampleTrail(sensorPosL) + sampleExternalField(sensorPosL, inputWeight);
    float valR = sampleTrail(sensorPosR) + sampleExternalField(sensorPosR, inputWeight);
    
    // Steering logic
    float newHeading = heading;
    if (valF > valL && valF > valR) {
        // Forward is best, keep going
    } else if (valF < valL && valF < valR) {
        // Forward is worst, turn randomly
        newHeading += (hash_f(time + pos.x) - 0.5) * 2.0 * turnSpeed * moveSpeed;
    } else if (valL > valR) {
        // Turn left
        newHeading -= turnSpeed * moveSpeed;
    } else if (valR > valL) {
        // Turn right
        newHeading += turnSpeed * moveSpeed;
    }
    
    // Move forward
    vec2 moveDir = vec2(cos(newHeading), sin(newHeading));
    
    // Speed modulation from input texture
    float speedScale = 1.0;
    float blend = clamp(inputWeight * 0.01, 0.0, 1.0);
    if (blend > 0.0) {
        float localInput = luminance(texture(inputTex, pos).rgb);
        // Invert: slow in bright, fast in dark
        speedScale = mix(1.0, mix(1.8, 0.35, localInput), blend);
    }
    
    // Scale moveSpeed to normalized coords (divide by resolution)
    // Original was in pixels, now convert: 1.78 pixels \u2248 0.00174 at 1024 res
    float normalizedSpeed = moveSpeed * 0.001 * speedScale;
    vec2 newPos = wrapPosition(pos + moveDir * normalizedSpeed);
    
    // Update age
    float newAge = age + 0.016;
    
    // Output
    outXYZ = vec4(newPos, newHeading, 1.0);  // alive = 1
    outVel = vec4(0.0, 0.0, newAge, seed);
    outRGBA = rgba;  // Color unchanged
}
`,wgsl:`// Physarum agent update shader - Common Agent Architecture
// Reads xyz/vel/rgba from pipeline, applies sensor-based steering

struct Uniforms {
    resolution: vec2f,
    time: f32,
    moveSpeed: f32,
    turnSpeed: f32,
    sensorAngle: f32,
    sensorDistance: f32,
    inputWeight: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(3) var velTex: texture_2d<f32>;
@group(0) @binding(5) var rgbaTex: texture_2d<f32>;
@group(0) @binding(7) var trailTex: texture_2d<f32>;
@group(0) @binding(8) var trailSampler: sampler;
@group(0) @binding(9) var inputTex: texture_2d<f32>;
@group(0) @binding(10) var inputSampler: sampler;

struct Outputs {
    @location(0) outXYZ: vec4f,
    @location(1) outVel: vec4f,
    @location(2) outRGBA: vec4f,
}

const TAU: f32 = 6.28318530718;

// Hash functions
fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

fn hash_f(n: f32) -> f32 {
    return hash(bitcast<u32>(n));
}

// Wrap position to [0,1]
fn wrapPosition(pos: vec2f) -> vec2f {
    return fract(pos + vec2f(1.0));
}

fn luminance(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// Sample trail at normalized UV
fn sampleTrail(uv: vec2f) -> f32 {
    return luminance(textureSampleLevel(trailTex, trailSampler, uv, 0.0).rgb);
}

// Sample input texture for external field attraction
fn sampleExternalField(uv: vec2f, weight: f32) -> f32 {
    if (weight <= 0.0) { return 0.0; }
    let blend = clamp(weight * 0.01, 0.0, 1.0);
    return luminance(textureSampleLevel(inputTex, inputSampler, uv, 0.0).rgb) * blend * 0.05;
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> Outputs {
    let stateSize = vec2i(textureDimensions(xyzTex, 0));
    let coord = vec2i(i32(fragCoord.x), i32(fragCoord.y));
    
    // Read current state
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    var pos = xyz.xy;           // Normalized [0,1]
    var heading = xyz.z;        // Radians
    let alive = xyz.w;
    let age = vel.z;
    let seed = vel.w;
    
    // Check if agent is dead (needs respawn by pointsEmit)
    if (alive < 0.5) {
        // Pass through - pointsEmit will handle respawn
        // Initialize heading from seed
        return Outputs(
            vec4f(pos, hash(u32(seed * 1000.0)) * TAU, 0.0),
            vel,
            rgba
        );
    }
    
    // Attrition is now handled by pointsEmit
    
    // Compute sensor positions in normalized coords
    let forwardDir = vec2f(cos(heading), sin(heading));
    let leftDir = vec2f(cos(heading - u.sensorAngle), sin(heading - u.sensorAngle));
    let rightDir = vec2f(cos(heading + u.sensorAngle), sin(heading + u.sensorAngle));
    
    let sensorPosF = wrapPosition(pos + forwardDir * u.sensorDistance);
    let sensorPosL = wrapPosition(pos + leftDir * u.sensorDistance);
    let sensorPosR = wrapPosition(pos + rightDir * u.sensorDistance);
    
    // Sample trail + external field at sensor positions
    let valF = sampleTrail(sensorPosF) + sampleExternalField(sensorPosF, u.inputWeight);
    let valL = sampleTrail(sensorPosL) + sampleExternalField(sensorPosL, u.inputWeight);
    let valR = sampleTrail(sensorPosR) + sampleExternalField(sensorPosR, u.inputWeight);
    
    // Steering logic
    var newHeading = heading;
    if (valF > valL && valF > valR) {
        // Forward is best, keep going
    } else if (valF < valL && valF < valR) {
        // Forward is worst, turn randomly
        newHeading += (hash_f(u.time + pos.x) - 0.5) * 2.0 * u.turnSpeed * u.moveSpeed;
    } else if (valL > valR) {
        // Turn left
        newHeading -= u.turnSpeed * u.moveSpeed;
    } else if (valR > valL) {
        // Turn right
        newHeading += u.turnSpeed * u.moveSpeed;
    }
    
    // Move forward
    let moveDir = vec2f(cos(newHeading), sin(newHeading));
    
    // Speed modulation from input texture
    var speedScale = 1.0;
    let blend = clamp(u.inputWeight * 0.01, 0.0, 1.0);
    if (blend > 0.0) {
        let localInput = luminance(textureSampleLevel(inputTex, inputSampler, pos, 0.0).rgb);
        // Invert: slow in bright, fast in dark
        speedScale = mix(1.0, mix(1.8, 0.35, localInput), blend);
    }
    
    // Scale moveSpeed to normalized coords
    let normalizedSpeed = u.moveSpeed * 0.001 * speedScale;
    let newPos = wrapPosition(pos + moveDir * normalizedSpeed);
    
    // Update age
    let newAge = age + 0.016;
    
    // Output
    return Outputs(
        vec4f(newPos, newHeading, 1.0),  // alive = 1
        vec4f(0.0, 0.0, newAge, seed),
        rgba  // Color unchanged
    );
}
`},deposit:{vertex:`#version 300 es
precision highp float;

// Deposit Vertex Shader - Scatter agents to trail texture

uniform sampler2D xyzTex;
uniform sampler2D rgbaTex;
uniform vec2 resolution;
uniform float deposit;

out vec4 vColor;

void main() {
    // Get state size from xyz texture dimensions (inherited from pointsEmit)
    ivec2 texSize = textureSize(xyzTex, 0);
    int stateSize = texSize.x;
    int totalAgents = stateSize * stateSize;
    
    // Cull vertices beyond texture size
    if (gl_VertexID >= totalAgents) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Calculate UV for this agent
    int x = gl_VertexID % stateSize;
    int y = gl_VertexID / stateSize;
    
    // Read agent position and color
    vec4 pos = texelFetch(xyzTex, ivec2(x, y), 0);
    vec4 col = texelFetch(rgbaTex, ivec2(x, y), 0);
    
    // Check if agent is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Convert position (0..1) to clip space (-1..1)
    vec2 clipPos = pos.xy * 2.0 - 1.0;
    
    gl_Position = vec4(clipPos, 0.0, 1.0);
    gl_PointSize = 1.0;
    
    // Apply deposit amount
    vColor = vec4(col.rgb * deposit, col.a * deposit);
}
`,fragment:`#version 300 es
precision highp float;

// Deposit Fragment Shader - Output agent color to trail

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,wgsl:`// Deposit Shader - Scatter agents to trail texture

struct Uniforms {
    resolution: vec2<f32>,
    deposit: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;
    
    // Get state size from xyz texture dimensions (inherited from pointsEmit)
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);
    let totalAgents = stateSize * stateSize;
    
    // Cull vertices beyond texture size
    if (i32(vertexIndex) >= totalAgents) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }
    
    // Calculate UV for this agent
    let x = i32(vertexIndex) % stateSize;
    let y = i32(vertexIndex) / stateSize;
    
    // Read agent position and color
    let pos = textureLoad(xyzTex, vec2<i32>(x, y), 0);
    let col = textureLoad(rgbaTex, vec2<i32>(x, y), 0);
    
    // Check if agent is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }
    
    // Convert display-space position (0..1, top-left Y) to WebGPU clip space.
    let clipPos = vec2<f32>(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0);
    
    out.position = vec4<f32>(clipPos, 0.0, 1.0);
    
    // Apply deposit amount
    out.color = vec4<f32>(col.rgb * u.deposit, col.a * u.deposit);
    return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
`},diffuse:{glsl:`#version 300 es
precision highp float;

// Diffuse Pass - Decay existing trail

uniform sampler2D trailTex;
uniform vec2 resolution;
uniform float decay;
uniform bool resetState;

out vec4 fragColor;

void main() {
    // If resetState is true, clear the trail
    if (resetState) {
        fragColor = vec4(0.0);
        return;
    }
    
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // Sample the trail texture directly (no blur)
    vec4 trailColor = texture(trailTex, uv);
    
    // Apply decay
    // decay=0 means no decay (persistence 1.0)
    // decay=1 means instant fade (persistence 0.0)
    float persistence = clamp(1.0 - decay, 0.0, 1.0);
    fragColor = trailColor * persistence;
}
`,wgsl:`// Diffuse Pass - Decay existing trail

struct Uniforms {
    resolution: vec2<f32>,
    decay: f32,
    resetState: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var trailTex: texture_2d<f32>;
@group(0) @binding(2) var trailSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    // If resetState is true, clear the trail
    if (u.resetState != 0u) {
        return vec4<f32>(0.0);
    }
    
    let uv = fragCoord.xy / u.resolution;
    
    // Sample the trail texture directly (no blur)
    let trailColor = textureSample(trailTex, trailSampler, uv);
    
    // Apply decay
    // decay=0 means no decay (persistence 1.0)
    // decay=1 means instant fade (persistence 0.0)
    let persistence = clamp(1.0 - u.decay, 0.0, 1.0);
    return trailColor * persistence;
}
`},passthrough:{glsl:`#version 300 es
precision highp float;

// Passthrough shader - copy input to output for 2D chain continuity

uniform sampler2D inputTex;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    fragColor = texelFetch(inputTex, coord, 0);
}
`,wgsl:`// Passthrough shader - copy input to output for 2D chain continuity

struct Uniforms {
    resolution: vec2f,
    time: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputSampler: sampler;

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let uv = position.xy / u.resolution;
    return textureSample(inputTex, inputSampler, vec2f(uv.x, 1.0 - uv.y));
}
`}},i=`# physarum

Physarum slime mold simulation

## Description

Agents sense pheromone trails using forward sensors and steer towards higher concentrations, depositing their own pheromone as they move. Creates organic network patterns. Lower \`sensorAngle\` creates tighter networks; higher values create more branching.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| moveSpeed | float | 1.78 | 0.05-3 | Move speed |
| turnSpeed | float | 1 | 0-3.14159 | Turn speed |
| sensorAngle | float | 1.26 | 0.1-1.5 | Sensor angle |
| sensorDistance | float | 0.03 | 0.002-0.1 | Sensor distance |
| inputWeight | float | 0 | 0-100 | Input weight |
| deposit | float | 0.5 | 0-1 | Deposit |
| decay | float | 0.1 | 0-1 | Decay |
| resetState | boolean | false | - | State |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .physarum()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&i&&(n.help=i);var p="points/physarum",d="points",c="physarum",f=n;export{f as default,p as effectId,c as effectName,i as help,d as namespace};
