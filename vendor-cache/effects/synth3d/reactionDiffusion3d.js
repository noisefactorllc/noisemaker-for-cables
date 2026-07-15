/* synth3d/reactionDiffusion3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Reaction-Diffusion 3D",namespace:"synth3d",func:"reactionDiffusion3d",tags:["3d","sim"],description:"3D reaction-diffusion simulation",textures:{volumeCache:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},global_rd_state:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:32,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},seed:{type:"int",default:1,min:0,max:100,uniform:"seed",ui:{control:!1}},iterations:{type:"int",default:8,uniform:"iterations",min:1,max:32,ui:{label:"iterations",control:"slider"}},feed:{type:"float",default:110,uniform:"feed",min:10,max:110,ui:{label:"feed rate",control:"slider",category:"rules"}},kill:{type:"float",default:62,uniform:"kill",min:45,max:70,ui:{label:"kill rate",control:"slider",category:"rules"}},rate1:{type:"float",default:120,uniform:"rate1",min:50,max:120,ui:{label:"diffuse rate a",control:"slider",category:"rules"}},rate2:{type:"float",default:30,uniform:"rate2",min:20,max:80,ui:{label:"diffuse rate b",control:"slider",category:"rules"}},speed:{type:"int",default:100,uniform:"speed",min:10,max:200,ui:{label:"sim speed",control:"slider"}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,gradient:1},ui:{label:"color mode",control:"dropdown"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{label:"reset",control:"button",buttonLabel:"reset"}},source:{type:"volume",default:"vol0",ui:{label:"source vol",category:"input"}},geoSource:{type:"geometry",default:"geo0",ui:{label:"source geo",category:"input"}},weight:{type:"float",default:0,min:0,max:100,uniform:"weight",ui:{label:"input weight",control:"slider",category:"input"}}},passes:[{name:"simulate",program:"simulate",repeat:"iterations",viewport:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024}},inputs:{stateTex:"global_rd_state",seedTex:"source"},outputs:{color:"global_rd_state"}}],outputTex3d:"global_rd_state",outputGeo:"geoBuffer"});var a={simulate:{glsl:`/*
 * 3D Reaction-Diffusion simulation shader (GLSL)
 * Implements Gray-Scott model in 3D with 6-neighbor Laplacian
 * Self-initializing: detects empty buffer and seeds on first frame
 */

#version 300 es
precision highp float;

uniform float time;
uniform int seed;
uniform int volumeSize;
uniform float feed;
uniform float kill;
uniform float rate1;
uniform float rate2;
uniform float speed;
uniform int iterations;
uniform int colorMode;
uniform float weight;
uniform bool resetState;
uniform sampler2D stateTex;
uniform sampler2D seedTex;  // 3D input volume atlas (inputTex3d)

out vec4 fragColor;

// Hash for initialization
float hash3(vec3 p) {
    p = p + float(seed) * 0.1;
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}

// Helper to convert 3D voxel coords to 2D atlas texel coords
ivec2 atlasTexel(ivec3 p, int volSize) {
    // Wrap coordinates for periodic boundary
    ivec3 wrapped = ivec3(
        (p.x + volSize) % volSize,
        (p.y + volSize) % volSize,
        (p.z + volSize) % volSize
    );
    return ivec2(wrapped.x, wrapped.y + wrapped.z * volSize);
}

// Sample state at voxel coordinate with wrapping
vec4 sampleState(ivec3 voxel, int volSize) {
    return texelFetch(stateTex, atlasTexel(voxel, volSize), 0);
}

// Sample seed texture at voxel coordinate (for inputTex3d seeding)
vec4 sampleSeed(ivec3 voxel, int volSize) {
    return texelFetch(seedTex, atlasTexel(voxel, volSize), 0);
}

// 3D Laplacian using 6-neighbor stencil (face neighbors only)
// Standard discrete Laplacian for uniform 3D grid
vec2 laplacian3D(ivec3 voxel, int volSize) {
    vec4 center = sampleState(voxel, volSize);
    
    // 6-neighbor stencil (face-adjacent neighbors)
    vec4 xp = sampleState(voxel + ivec3(1, 0, 0), volSize);
    vec4 xn = sampleState(voxel + ivec3(-1, 0, 0), volSize);
    vec4 yp = sampleState(voxel + ivec3(0, 1, 0), volSize);
    vec4 yn = sampleState(voxel + ivec3(0, -1, 0), volSize);
    vec4 zp = sampleState(voxel + ivec3(0, 0, 1), volSize);
    vec4 zn = sampleState(voxel + ivec3(0, 0, -1), volSize);
    
    // Standard discrete 3D Laplacian: sum of neighbors - 6 * center
    // State layout: .r = B (density), .a = A (chemical)
    vec2 neighborSum = xp.ra + xn.ra + yp.ra + yn.ra + zp.ra + zn.ra;
    vec2 lap = neighborSum - 6.0 * center.ra;
    
    return lap;
}

void main() {
    int volSize = volumeSize;
    
    // Decode voxel position from atlas
    ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
    int x = pixelCoord.x;
    int y = pixelCoord.y % volSize;
    int z = pixelCoord.y / volSize;
    ivec3 voxel = ivec3(x, y, z);
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        fragColor = vec4(0.0);
        return;
    }
    
    // Current state
    vec4 state = sampleState(voxel, volSize);
    float b = state.r;  // Chemical B (density, used by render3d)
    float a = state.a;  // Chemical A (simulation state)
    
    // Self-initialization: detect empty buffer (first frame) or reset requested
    bool bufferIsEmpty = (state.r == 0.0 && state.g == 0.0 && state.b == 0.0 && state.a == 0.0);
    
    if (bufferIsEmpty || resetState) {
        a = 1.0;
        b = 0.0;

        if (resetState) {
            // Reset behavior: reseed a 4x4x4 cube at the center of the volume.
            // For even sizes, this is indices [N/2-2 .. N/2+1] (inclusive).
            int start = max(0, (volSize / 2) - 2);
            int end = min(volSize - 1, start + 3);
            bool inCenterCube = (x >= start && x <= end && y >= start && y <= end && z >= start && z <= end);
            b = inCenterCube ? 1.0 : 0.0;
        } else {
            // First-frame init: if we have input from seedTex (inputTex3d), use it.
            vec4 seedVal = sampleSeed(voxel, volSize);
            bool hasSeedInput = (seedVal.r > 0.0 || seedVal.g > 0.0 || seedVal.b > 0.0);

            if (hasSeedInput) {
                float lum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
                b = lum > 0.5 ? 1.0 : 0.0;
            } else {
                // Fallback: sparse random seeding of B
                vec3 p = vec3(float(x), float(y), float(z));
                if (hash3(p) > 0.97) {
                    b = 1.0;
                }
            }
        }

        fragColor = vec4(b, b, b, a);
        return;
    }
    
    // Compute Laplacian for diffusion
    vec2 lap = laplacian3D(voxel, volSize);
    
    // Gray-Scott parameters (scaled from UI values)
    // Note: Laplacian in 3D is 6x larger than normalized form,
    // so we scale diffusion rates down by 6 to maintain stability
    float f = feed * 0.001;       // Feed rate
    float k = kill * 0.001;       // Kill rate
    float r1 = rate1 * 0.01 / 6.0;  // Diffusion rate A (scaled for 3D)
    float r2 = rate2 * 0.01 / 6.0;  // Diffusion rate B (scaled for 3D)
    // This pass is executed \`iterations\` times per frame (pipeline repeat).
    // To keep the solver stable and make "speed" behave like a per-frame control,
    // we scale the per-iteration timestep down by the iteration count.
    float iterF = max(1.0, float(iterations));
    float s = (speed * 0.01) / iterF;
    
    // Gray-Scott reaction-diffusion equations
    // lap.x = Lap(B) from .r, lap.y = Lap(A) from .a
    float newA = a + (r1 * lap.y - a * b * b + f * (1.0 - a)) * s;
    float newB = b + (r2 * lap.x + a * b * b - (k + f) * b) * s;
    
    // Apply input weight blending from seedTex (inputTex3d)
    if (weight > 0.0) {
        vec4 seedVal = sampleSeed(voxel, volSize);
        float seedLum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
        // Seed influences chemical B (the visible one)
        newB = mix(newB, seedLum, weight * 0.01);
    }
    
    // Clamp for numerical stability
    newA = clamp(newA, 0.0, 1.0);
    newB = clamp(newB, 0.0, 1.0);
    
    // .r = B (density for render3d), .a = A (simulation state)
    // .rgb = visualization colors, .a = chemical A
    float density = newB;
    vec3 outRgb;
    if (colorMode == 0) {
        outRgb = vec3(density);
    } else {
        outRgb = vec3(density, newA, 1.0 - density);
    }

    fragColor = vec4(outRgb, newA);
}
`,wgsl:`/*
 * 3D Reaction-Diffusion simulation shader (WGSL)
 * Implements Gray-Scott model in 3D with 6-neighbor Laplacian
 * Self-initializing: detects empty buffer and seeds on first frame
 */

@group(0) @binding(0) var<uniform> volumeSize: i32;
@group(0) @binding(1) var<uniform> seed: i32;
@group(0) @binding(2) var<uniform> feed: f32;
@group(0) @binding(3) var<uniform> kill: f32;
@group(0) @binding(4) var<uniform> rate1: f32;
@group(0) @binding(5) var<uniform> rate2: f32;
@group(0) @binding(6) var<uniform> speed: f32;
@group(0) @binding(7) var<uniform> weight: f32;
@group(0) @binding(8) var stateTex: texture_2d<f32>;
@group(0) @binding(9) var seedTex: texture_2d<f32>;  // 3D input volume atlas (inputTex3d)
@group(0) @binding(10) var<uniform> iterations: i32;
@group(0) @binding(11) var<uniform> colorMode: i32;
@group(0) @binding(12) var<uniform> resetState: i32;

// Hash for initialization
fn hash3(p: vec3<f32>, s: f32) -> f32 {
    var pp = p + s * 0.1;
    pp = fract(pp * vec3<f32>(0.1031, 0.1030, 0.0973));
    pp = pp + dot(pp, pp.yxz + 33.33);
    return fract((pp.x + pp.y) * pp.z);
}

// Helper to convert 3D voxel coords to 2D atlas texel coords with wrapping
fn atlasTexel(p: vec3<i32>, volSize: i32) -> vec2<i32> {
    // Wrap coordinates for periodic boundary
    let wrapped = vec3<i32>(
        (p.x + volSize) % volSize,
        (p.y + volSize) % volSize,
        (p.z + volSize) % volSize
    );
    return vec2<i32>(wrapped.x, wrapped.y + wrapped.z * volSize);
}

// Sample state at voxel coordinate with wrapping
fn sampleState(voxel: vec3<i32>, volSize: i32) -> vec4<f32> {
    return textureLoad(stateTex, atlasTexel(voxel, volSize), 0);
}

// Sample seed texture at voxel coordinate (for inputTex3d seeding)
fn sampleSeed(voxel: vec3<i32>, volSize: i32) -> vec4<f32> {
    return textureLoad(seedTex, atlasTexel(voxel, volSize), 0);
}

// 3D Laplacian using 6-neighbor stencil
// Standard discrete Laplacian for uniform 3D grid
fn laplacian3D(voxel: vec3<i32>, volSize: i32) -> vec2<f32> {
    let center = sampleState(voxel, volSize);
    
    // 6-neighbor stencil (face-adjacent neighbors)
    let xp = sampleState(voxel + vec3<i32>(1, 0, 0), volSize);
    let xn = sampleState(voxel + vec3<i32>(-1, 0, 0), volSize);
    let yp = sampleState(voxel + vec3<i32>(0, 1, 0), volSize);
    let yn = sampleState(voxel + vec3<i32>(0, -1, 0), volSize);
    let zp = sampleState(voxel + vec3<i32>(0, 0, 1), volSize);
    let zn = sampleState(voxel + vec3<i32>(0, 0, -1), volSize);
    
    // Standard discrete 3D Laplacian: sum of neighbors - 6 * center
    // State layout: .r = B (density), .a = A (chemical)
    let neighborSum = xp.ra + xn.ra + yp.ra + yn.ra + zp.ra + zn.ra;
    let lap = neighborSum - 6.0 * center.ra;
    
    return lap;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    // Decode voxel position from atlas
    let pixelCoord = vec2<i32>(position.xy);
    let x = pixelCoord.x;
    let y = pixelCoord.y % volSize;
    let z = pixelCoord.y / volSize;
    let voxel = vec3<i32>(x, y, z);
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        return vec4<f32>(0.0);
    }
    
    // Current state
    let state = sampleState(voxel, volSize);
    var b = state.r;  // Chemical B (density, used by render3d)
    var a = state.a;  // Chemical A (simulation state)
    
    // Self-initialization: detect empty buffer (first frame) or reset requested
    let bufferIsEmpty = (state.r == 0.0 && state.g == 0.0 && state.b == 0.0 && state.a == 0.0);
    
    if (bufferIsEmpty || resetState != 0) {
        a = 1.0;
        b = 0.0;

        if (resetState != 0) {
            // Reset behavior: reseed a 4x4x4 cube at the center of the volume.
            // For even sizes, this is indices [N/2-2 .. N/2+1] (inclusive).
            let start: i32 = max(0, (volSize / 2) - 2);
            let end: i32 = min(volSize - 1, start + 3);
            let inCenterCube = (x >= start && x <= end && y >= start && y <= end && z >= start && z <= end);
            if (inCenterCube) { b = 1.0; }
        } else {
            // First-frame init: if we have input from seedTex (inputTex3d), use it.
            let seedVal = sampleSeed(voxel, volSize);
            let hasSeedInput = (seedVal.r > 0.0 || seedVal.g > 0.0 || seedVal.b > 0.0);

            if (hasSeedInput) {
                let lum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
                if (lum > 0.5) {
                    b = 1.0;
                }
            } else {
                // Fallback: sparse random seeding of B
                let p = vec3<f32>(f32(x), f32(y), f32(z));
                if (hash3(p, f32(seed)) > 0.97) {
                    b = 1.0;
                }
            }
        }

        return vec4<f32>(b, b, b, a);
    }
    
    // Compute Laplacian for diffusion
    let lap = laplacian3D(voxel, volSize);
    
    // Gray-Scott parameters (scaled from UI values)
    // Note: Laplacian in 3D is 6x larger than normalized form,
    // so we scale diffusion rates down by 6 to maintain stability
    let f = feed * 0.001;        // Feed rate
    let k = kill * 0.001;        // Kill rate
    let r1 = rate1 * 0.01 / 6.0;   // Diffusion rate A (scaled for 3D)
    let r2 = rate2 * 0.01 / 6.0;   // Diffusion rate B (scaled for 3D)
    // This pass is executed \`iterations\` times per frame (pipeline repeat).
    // Scale timestep per-iteration so "speed" behaves like a per-frame control.
    let iterF = max(1.0, f32(iterations));
    let s = (speed * 0.01) / iterF;
    
    // Gray-Scott reaction-diffusion equations
    // lap.x = Lap(B) from .r, lap.y = Lap(A) from .a
    var newA = clamp(a + (r1 * lap.y - a * b * b + f * (1.0 - a)) * s, 0.0, 1.0);
    var newB = clamp(b + (r2 * lap.x + a * b * b - (k + f) * b) * s, 0.0, 1.0);
    
    // Apply input weight blending from seedTex (inputTex3d)
    if (weight > 0.0) {
        let seedVal = sampleSeed(voxel, volSize);
        let seedLum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
        // Seed influences chemical B (the visible one)
        newB = mix(newB, seedLum, weight * 0.01);
    }
    
    // .r = B (density for render3d), .a = A (simulation state)
    // .rgb = visualization colors, .a = chemical A
    let density = newB;
    var outRgb: vec3<f32>;
    if (colorMode == 0) {
        outRgb = vec3<f32>(density);
    } else {
        outRgb = vec3<f32>(density, newA, 1.0 - density);
    }

    return vec4<f32>(outRgb, newA);
}
`}},o=`# reactionDiffusion3d

3D reaction-diffusion simulation

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x32 | x16/x32/x64/x128 | Volume size |
| seed | int | 1 | 0-100 | - |
| iterations | int | 8 | 1-32 | Iterations |
| feed | float | 110 | 10-110 | Feed rate |
| kill | float | 62 | 45-70 | Kill rate |
| rate1 | float | 120 | 50-120 | Diffuse rate A |
| rate2 | float | 30 | 20-80 | Diffuse rate B |
| speed | int | 100 | 10-200 | Sim speed |
| colorMode | int | mono | mono/gradient | Color mode |
| resetState | boolean | false | - | State |
| source | volume | vol0 | - | Source volume |
| geoSource | geometry | geo0 | - | Source geometry |
| weight | float | 0 | 0-100 | Input weight |

## Notes

Adjust feed and kill rates to achieve different pattern types. Common ranges:
- Spots: feed ~55, kill ~62
- Stripes: feed ~42, kill ~63
- Coral: feed ~62, kill ~61

## Usage

\`\`\`
search synth3d, filter3d, render

noise3d(volumeSize: x32)
  .write3d(vol0, geo0)

reactionDiffusion3d(source: read3d(vol0, geo0), geoSource: read3d(vol0, geo0))
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(a))n.shaders[i]={...e}}n&&o&&(n.help=o);var d="synth3d/reactionDiffusion3d",u="synth3d",p="reactionDiffusion3d",c=n;export{c as default,d as effectId,p as effectName,o as help,u as namespace};
