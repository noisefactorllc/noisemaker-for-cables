/* points/lenia */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Lenia",namespace:"points",func:"lenia",tags:["sim"],description:"Particle Lenia artificial life simulation",textures:{global_lenia_density:{width:"50%",height:"50%",format:"rgba16f"},global_lenia_field:{width:"50%",height:"50%",format:"rgba16f"}},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{muK:{type:"float",default:25,uniform:"muK",min:1,max:30,step:.5,ui:{label:"kernel \u03BC",control:"slider",category:"kernel"}},sigmaK:{type:"float",default:5,uniform:"sigmaK",min:.1,max:10,step:.1,ui:{label:"kernel \u03C3",control:"slider",category:"kernel"}},muG:{type:"float",default:.25,uniform:"muG",min:.1,max:2,step:.01,ui:{label:"growth \u03BC",control:"slider",category:"growth"}},sigmaG:{type:"float",default:.15,uniform:"sigmaG",min:.01,max:.5,step:.01,ui:{label:"growth \u03C3",control:"slider",category:"growth"}},repulsion:{type:"float",default:.5,uniform:"repulsion",min:0,max:5,step:.1,ui:{label:"repulsion",control:"slider",category:"motion"}},dt:{type:"float",default:.25,uniform:"dt",min:.01,max:.5,step:.01,ui:{label:"time step",control:"slider",category:"motion"}},searchRadius:{type:"float",default:25,uniform:"searchRadius",min:5,max:40,step:1,ui:{label:"search radius",control:"slider",category:"kernel"}},depositAmount:{type:"float",default:3.6,uniform:"depositAmount",min:.1,max:5,step:.1,ui:{label:"deposit",control:"slider",category:"kernel"}}},passes:[{name:"clear",program:"clear",inputs:{},outputs:{fragColor:"global_lenia_density"}},{name:"deposit",program:"deposit",drawMode:"points",count:"input",blend:!0,inputs:{xyzTex:"global_xyz"},uniforms:{depositAmount:"depositAmount"},outputs:{fragColor:"global_lenia_density"}},{name:"convolve",program:"convolve",inputs:{densityTex:"global_lenia_density"},uniforms:{muK:"muK",sigmaK:"sigmaK",searchRadius:"searchRadius"},outputs:{fragColor:"global_lenia_field"}},{name:"agent",program:"agentField",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba",fieldTex:"global_lenia_field"},uniforms:{muG:"muG",sigmaG:"sigmaG",repulsion:"repulsion",dt:"dt"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={agentField:{glsl:`#version 300 es
precision highp float;

// Agent update pass - samples pre-convolved U field
// Much faster than O(n\xB2) as field is already computed

uniform sampler2D xyzTex;     // Particle positions
uniform sampler2D velTex;     // Particle velocities
uniform sampler2D rgbaTex;    // Particle colors
uniform sampler2D fieldTex;   // Pre-convolved U field (from convolve pass)

uniform vec2 resolution;

// Growth parameters
uniform float muG;       // Target density (growth peak)
uniform float sigmaG;    // Growth width

// Repulsion parameters
uniform float repulsion; // Repulsion strength

// Motion parameters
uniform float dt;        // Time step

// MRT outputs
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

const float EPSILON = 0.0001;

// Growth function G(u) = exp(-((u - \u03BC) / \u03C3)\xB2)
float growth(float u, float mu, float sigma) {
    float x = (u - mu) / sigma;
    return exp(-x * x);
}

// Derivative of growth: dG/du = G(u) * (-2(u-\u03BC)/\u03C3\xB2)
float growthDerivative(float u, float mu, float sigma) {
    float G = growth(u, mu, sigma);
    return G * (-2.0 * (u - mu)) / (sigma * sigma);
}

void main() {
    ivec2 stateSize = textureSize(xyzTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);

    // Read current particle state
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);

    float alive = xyz.w;

    // Pass through dead particles
    if (alive < 0.5) {
        outXYZ = xyz;
        outVel = vel;
        outRGBA = rgba;
        return;
    }

    // Sample U field at particle position
    vec2 uv = xyz.xy;
    float U = texture(fieldTex, uv).r;

    // Compute gradient of U via finite differences
    // Use the field texture's actual size for correct texel stepping
    vec2 fieldSize = vec2(textureSize(fieldTex, 0));
    vec2 texelSize = 1.0 / fieldSize;
    float Ux_plus = texture(fieldTex, fract(uv + vec2(texelSize.x, 0.0))).r;
    float Ux_minus = texture(fieldTex, fract(uv - vec2(texelSize.x, 0.0))).r;
    float Uy_plus = texture(fieldTex, fract(uv + vec2(0.0, texelSize.y))).r;
    float Uy_minus = texture(fieldTex, fract(uv - vec2(0.0, texelSize.y))).r;

    vec2 gradU = vec2(
        (Ux_plus - Ux_minus) / (2.0 * texelSize.x),
        (Uy_plus - Uy_minus) / (2.0 * texelSize.y)
    );

    // Scale gradient to world space
    float worldScale = min(resolution.x, resolution.y) * 0.05;
    gradU /= worldScale;

    // Compute growth gradient: \u2207G = dG/dU * \u2207U
    float dGdU = growthDerivative(U, muG, sigmaG);
    vec2 gradG = dGdU * gradU;

    // Repulsion gradient (from U field - areas of high density repel)
    // We approximate \u2207R \u2248 repulsion * \u2207U for simplicity
    vec2 gradR = repulsion * gradU;

    // Total force: dp/dt = \u2207G - \u2207R
    vec2 force = gradG - gradR;

    // Limit force magnitude for stability
    float forceMag = length(force);
    if (forceMag > 10.0) {
        force = force / forceMag * 10.0;
    }

    // Update position (Euler integration)
    vec2 newPos = uv + force * dt * 0.01;

    // Wrap to [0,1] bounds (toroidal topology)
    newPos = fract(newPos + 1.0);

    // Store velocity for visualization
    vec2 velocity = force * dt * 0.01;

    // Update age
    float age = vel.z + 0.016;

    // Output
    outXYZ = vec4(newPos, xyz.z, 1.0);  // Keep z, stay alive
    outVel = vec4(velocity, age, vel.w);  // Store velocity, age, seed
    outRGBA = rgba;  // Color unchanged
}
`,wgsl:`// Agent update pass - samples pre-convolved U field
// Much faster than O(n\xB2) as field is already computed
// Binding order: loaded textures (0-2), sampled texture pair (3-4), uniforms (5)

struct Uniforms {
    resolution: vec2f,
    muG: f32,
    sigmaG: f32,
    repulsion: f32,
    dt: f32,
}

@group(0) @binding(0) var xyzTex: texture_2d<f32>;
@group(0) @binding(1) var velTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;
@group(0) @binding(3) var fieldSampler: sampler;
@group(0) @binding(4) var fieldTex: texture_2d<f32>;
@group(0) @binding(5) var<uniform> uniforms: Uniforms;

const EPSILON: f32 = 0.0001;

// Growth function G(u) = exp(-((u - \u03BC) / \u03C3)\xB2)
fn growth(u: f32, mu: f32, sigma: f32) -> f32 {
    let x = (u - mu) / sigma;
    return exp(-x * x);
}

// Derivative of growth: dG/du = G(u) * (-2(u-\u03BC)/\u03C3\xB2)
fn growthDerivative(u: f32, mu: f32, sigma: f32) -> f32 {
    let G = growth(u, mu, sigma);
    return G * (-2.0 * (u - mu)) / (sigma * sigma);
}

struct FragmentOutput {
    @location(0) outXYZ: vec4f,
    @location(1) outVel: vec4f,
    @location(2) outRGBA: vec4f,
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> FragmentOutput {
    var output: FragmentOutput;

    let coord = vec2i(fragCoord.xy);

    // Read current particle state
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);

    // Sample U field at particle position - MUST be in uniform control flow
    // Do all texture samples before any early returns
    let uv = xyz.xy;
    // Use the field texture's actual size for correct texel stepping
    let fieldDims = textureDimensions(fieldTex, 0);
    let texelSize = 1.0 / vec2f(f32(fieldDims.x), f32(fieldDims.y));
    let U = textureSampleLevel(fieldTex, fieldSampler, uv, 0.0).r;
    let Ux_plus = textureSample(fieldTex, fieldSampler, fract(uv + vec2f(texelSize.x, 0.0))).r;
    let Ux_minus = textureSample(fieldTex, fieldSampler, fract(uv - vec2f(texelSize.x, 0.0))).r;
    let Uy_plus = textureSample(fieldTex, fieldSampler, fract(uv + vec2f(0.0, texelSize.y))).r;
    let Uy_minus = textureSample(fieldTex, fieldSampler, fract(uv - vec2f(0.0, texelSize.y))).r;

    let alive = xyz.w;

    // Pass through dead particles
    if (alive < 0.5) {
        output.outXYZ = xyz;
        output.outVel = vel;
        output.outRGBA = rgba;
        return output;
    }

    // Compute gradient of U via finite differences
    var gradU = vec2f(
        (Ux_plus - Ux_minus) / (2.0 * texelSize.x),
        (Uy_plus - Uy_minus) / (2.0 * texelSize.y)
    );

    // Scale gradient to world space
    let worldScale = min(uniforms.resolution.x, uniforms.resolution.y) * 0.05;
    gradU /= worldScale;

    // Compute growth gradient: \u2207G = dG/dU * \u2207U
    let dGdU = growthDerivative(U, uniforms.muG, uniforms.sigmaG);
    let gradG = dGdU * gradU;

    // Repulsion gradient (approximated from U field)
    let gradR = uniforms.repulsion * gradU;

    // Total force: dp/dt = \u2207G - \u2207R
    var force = gradG - gradR;

    // Limit force magnitude for stability
    let forceMag = length(force);
    if (forceMag > 10.0) {
        force = force / forceMag * 10.0;
    }

    // Update position (Euler integration)
    var newPos = uv + force * uniforms.dt * 0.01;

    // Wrap to [0,1] bounds (toroidal topology)
    newPos = fract(newPos + 1.0);

    // Store velocity for visualization
    let velocity = force * uniforms.dt * 0.01;

    // Update age
    let age = vel.z + 0.016;

    // Output
    output.outXYZ = vec4f(newPos, xyz.z, 1.0);
    output.outVel = vec4f(velocity, age, vel.w);
    output.outRGBA = rgba;

    return output;
}
`},clear:{glsl:`#version 300 es
precision highp float;

// Clear the density texture to zero before deposit

out vec4 fragColor;

void main() {
    fragColor = vec4(0.0);
}
`,wgsl:`// Clear shader - clears texture to zero
// Runtime auto-injects resolution uniform

struct Uniforms {
    resolution: vec2<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0);
}
`},convolve:{glsl:`#version 300 es
precision highp float;

// Kernel convolution pass
// Applies K(r) gaussian shell kernel to the density field

uniform sampler2D densityTex;  // Raw particle deposits
uniform vec2 resolution;

// Kernel parameters
uniform float muK;      // Kernel peak radius
uniform float sigmaK;   // Kernel width
uniform float searchRadius;  // Max radius to sample

out vec4 fragColor;

const float EPSILON = 0.0001;
const float PI = 3.14159265359;

// Gaussian shell kernel K(r) = exp(-((r - \u03BC) / \u03C3)\xB2)
float kernel(float r, float mu, float sigma) {
    float x = (r - mu) / sigma;
    return exp(-x * x);
}

void main() {
    // Use the actual density texture size, not output resolution
    vec2 densitySize = vec2(textureSize(densityTex, 0));
    vec2 uv = gl_FragCoord.xy / densitySize;
    vec2 texelSize = 1.0 / densitySize;

    // Compute kernel weight for normalization
    // Integrate K(r) * r over [0, searchRadius]
    float wK = 0.0;
    int numSamples = 64;
    float dr = searchRadius / float(numSamples);
    for (int i = 0; i < numSamples; i++) {
        float r = (float(i) + 0.5) * dr;
        wK += kernel(r, muK, sigmaK) * r * dr;
    }
    wK = 1.0 / max(wK * 2.0 * PI, EPSILON);

    // Accumulate kernel-weighted density from neighbors
    float U = 0.0;
    int iRadius = int(ceil(searchRadius));

    for (int dy = -iRadius; dy <= iRadius; dy++) {
        for (int dx = -iRadius; dx <= iRadius; dx++) {
            float r = length(vec2(float(dx), float(dy)));

            // Skip if outside search radius
            if (r > searchRadius) continue;

            // Sample density at neighbor (wrap around edges)
            vec2 sampleUV = fract(uv + vec2(float(dx), float(dy)) * texelSize);
            float density = texture(densityTex, sampleUV).r;

            // Apply kernel weight
            float kVal = kernel(r, muK, sigmaK) * wK;
            U += density * kVal;
        }
    }

    // Output: r = U field, g = 0, b = 0, a = 1
    fragColor = vec4(U, 0.0, 0.0, 1.0);
}
`,wgsl:`// Kernel convolution pass - applies K(r) gaussian shell kernel to density field
// Standard binding order: sampler(0), texture(1), uniforms(2)

struct Uniforms {
    resolution: vec2f,
    muK: f32,
    sigmaK: f32,
    searchRadius: f32,
}

@group(0) @binding(0) var densitySampler: sampler;
@group(0) @binding(1) var densityTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const EPSILON: f32 = 0.0001;
const PI: f32 = 3.14159265359;

// Gaussian shell kernel K(r) = exp(-((r - \u03BC) / \u03C3)\xB2)
fn kernel(r: f32, mu: f32, sigma: f32) -> f32 {
    let x = (r - mu) / sigma;
    return exp(-x * x);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Use the actual density texture size, not output resolution
    let densityDims = textureDimensions(densityTex, 0);
    let densitySize = vec2f(f32(densityDims.x), f32(densityDims.y));
    let uv = fragCoord.xy / densitySize;
    let texelSize = 1.0 / densitySize;

    // Compute kernel weight for normalization
    var wK: f32 = 0.0;
    let numSamples: i32 = 64;
    let dr = uniforms.searchRadius / f32(numSamples);
    for (var i: i32 = 0; i < numSamples; i++) {
        let r = (f32(i) + 0.5) * dr;
        wK += kernel(r, uniforms.muK, uniforms.sigmaK) * r * dr;
    }
    wK = 1.0 / max(wK * 2.0 * PI, EPSILON);

    // Accumulate kernel-weighted density from neighbors
    var U: f32 = 0.0;
    let iRadius = i32(ceil(uniforms.searchRadius));

    for (var dy: i32 = -iRadius; dy <= iRadius; dy++) {
        for (var dx: i32 = -iRadius; dx <= iRadius; dx++) {
            let r = length(vec2f(f32(dx), f32(dy)));

            // Skip if outside search radius
            if (r > uniforms.searchRadius) {
                continue;
            }

            // Sample density at neighbor (wrap around edges)
            let sampleUV = fract(uv + vec2f(f32(dx), f32(dy)) * texelSize);
            let density = textureSampleLevel(densityTex, densitySampler, sampleUV, 0.0).r;

            // Apply kernel weight
            let kVal = kernel(r, uniforms.muK, uniforms.sigmaK) * wK;
            U += density * kVal;
        }
    }

    return vec4f(U, 0.0, 0.0, 1.0);
}
`},deposit:{vertex:`#version 300 es
precision highp float;

// State texture containing particle positions
uniform sampler2D xyzTex;
uniform vec2 resolution;

void main() {
    // Get particle index from vertex ID
    ivec2 stateSize = textureSize(xyzTex, 0);
    int x = gl_VertexID % stateSize.x;
    int y = gl_VertexID / stateSize.x;

    // Read particle state
    vec4 xyz = texelFetch(xyzTex, ivec2(x, y), 0);
    float alive = xyz.w;

    // Dead particles go offscreen
    if (alive < 0.5) {
        gl_Position = vec4(-999.0, -999.0, 0.0, 1.0);
        gl_PointSize = 1.0;
        return;
    }

    // Convert normalized [0,1] position to clip space [-1,1]
    vec2 pos = xyz.xy * 2.0 - 1.0;

    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = 1.0;
}
`,fragment:`#version 300 es
precision highp float;

uniform float depositAmount;

out vec4 fragColor;

void main() {
    // Each particle deposits a constant value
    // The kernel convolution will spread this according to K(r)
    fragColor = vec4(depositAmount, 0.0, 0.0, 1.0);
}
`,wgsl:`// Deposit Shader - Scatter particle deposits to density texture

struct Uniforms {
    resolution: vec2<f32>,
    depositAmount: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) amount: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;

    // Get state size from xyz texture dimensions
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);
    let totalAgents = stateSize * stateSize;

    // Cull vertices beyond texture size
    if (i32(vertexIndex) >= totalAgents) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.amount = 0.0;
        return out;
    }

    // Calculate UV for this agent
    let x = i32(vertexIndex) % stateSize;
    let y = i32(vertexIndex) / stateSize;

    // Read agent position
    let pos = textureLoad(xyzTex, vec2<i32>(x, y), 0);

    // Check if agent is alive
    if (pos.w < 0.5) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.amount = 0.0;
        return out;
    }

    // Convert position (0..1) to clip space (-1..1), matching WebGL point projection.
    let clipPos = vec2<f32>(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0);

    out.position = vec4<f32>(clipPos, 0.0, 1.0);
    out.amount = u.depositAmount;
    return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    // Each particle deposits a constant value
    return vec4<f32>(in.amount, 0.0, 0.0, 1.0);
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
// Standard binding order: sampler(0), texture(1) - no uniforms needed

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let dims = textureDimensions(inputTex, 0);
    let uv = position.xy / vec2f(f32(dims.x), f32(dims.y));
    return textureSampleLevel(inputTex, inputSampler, vec2f(uv.x, 1.0 - uv.y), 0.0);
}
`}},o=`# lenia

Particle Lenia artificial life simulation

## Description

Particle Lenia is an artificial life system inspired by Lenia and continuous cellular automata. Unlike grid-based Lenia, this implementation uses particles that interact through potential fields, creating emergent self-organizing structures.

Based on [Particle Lenia](https://google-research.github.io/self-organising-systems/particle-lenia/) by Alexander Mordvintsev et al.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| muK | float | 25 | 1-30 | Kernel \u03BC |
| sigmaK | float | 5 | 0.1-10 | Kernel \u03C3 |
| muG | float | 0.25 | 0.1-2 | Growth \u03BC |
| sigmaG | float | 0.15 | 0.01-0.5 | Growth \u03C3 |
| repulsion | float | 0.5 | 0-5 | Repulsion |
| dt | float | 0.25 | 0.01-0.5 | Time step |
| searchRadius | float | 25 | 5-40 | Search radius |
| depositAmount | float | 3.6 | 0.1-5 | Deposit |

## Notes

Typical behaviors:
- **Rotators**: Spinning formations that maintain stable structure
- **Gliders**: Self-propelling compact structures
- **Phase transitions**: Complex reorganization as particles find equilibrium
- **Crystallization**: Stable lattice-like arrangements at low energy

Tips:
- Start with default parameters and adjust gradually
- More particles (higher count in pointsEmit) create richer dynamics
- Lower time step for more stable simulations
- Adjust kernel \u03BC to match your particle density

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .lenia()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&o&&(n.help=o);var f="points/lenia",d="points",p="lenia",c=n;export{c as default,f as effectId,p as effectName,o as help,d as namespace};
