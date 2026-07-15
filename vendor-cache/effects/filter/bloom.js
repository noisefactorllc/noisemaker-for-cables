/* filter/bloom */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Bloom",namespace:"filter",func:"bloom",tags:["lens"],description:"Multi-pass bloom with bright-pass extraction and configurable glow",globals:{threshold:{type:"float",default:.8,uniform:"threshold",min:0,max:2,step:.05,ui:{label:"threshold",control:"slider"}},softKnee:{type:"float",default:.2,uniform:"softKnee",min:0,max:.5,step:.01,ui:{label:"soft knee",control:"slider"}},intensity:{type:"float",default:1,uniform:"intensity",min:0,max:3,step:.05,zero:0,ui:{label:"intensity",control:"slider"}},radius:{type:"float",default:32,uniform:"radius",min:1,max:128,step:1,ui:{label:"radius",control:"slider"}},taps:{type:"int",default:8,uniform:"taps",min:8,max:64,step:1,ui:{label:"taps",control:"slider"}},tint:{type:"color",default:[1,1,1],uniform:"tint",ui:{label:"tint",control:"color"}}},textures:{_brightTex:{width:"input",height:"input",format:"rgba16float"},_bloomTex:{width:"input",height:"input",format:"rgba16float"}},passes:[{name:"brightPass",program:"brightPass",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_brightTex"}},{name:"ntapGather",program:"ntapGather",inputs:{inputTex:"_brightTex"},outputs:{fragColor:"_bloomTex"}},{name:"composite",program:"composite",inputs:{inputTex:"inputTex",bloomTex:"_bloomTex"},outputs:{fragColor:"outputTex"}}]});var i={brightPass:{glsl:`/*
 * Bloom bright-pass extraction
 * Isolates highlight energy using threshold + soft knee
 * All math in linear color space
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float threshold;
uniform float softKnee;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Compute luminance (Rec. 709)
    float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // Soft knee thresholding
    // Below (threshold - knee) -> 0
    // Between (threshold - knee) and (threshold + knee) -> smooth ramp
    // Above (threshold + knee) -> 1
    float knee = softKnee;
    float threshLow = threshold - knee;
    float threshHigh = threshold + knee;
    
    float bloomFactor;
    if (luma <= threshLow) {
        bloomFactor = 0.0;
    } else if (luma >= threshHigh) {
        bloomFactor = 1.0;
    } else {
        // Smoothstep for the soft knee region
        float t = (luma - threshLow) / (threshHigh - threshLow);
        bloomFactor = t * t * (3.0 - 2.0 * t);
    }
    
    // Multiply original HDR color by bloom factor
    vec3 brightColor = color.rgb * bloomFactor;
    
    fragColor = vec4(brightColor, color.a);
}
`,wgsl:`/*
 * Bloom bright-pass extraction
 * Isolates highlight energy using threshold + soft knee
 * All math in linear color space
 */

struct Uniforms {
    threshold: f32,
    softKnee: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    // Compute luminance (Rec. 709)
    let luma = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    
    // Soft knee thresholding
    let knee = uniforms.softKnee;
    let threshLow = uniforms.threshold - knee;
    let threshHigh = uniforms.threshold + knee;
    
    var bloomFactor: f32;
    if (luma <= threshLow) {
        bloomFactor = 0.0;
    } else if (luma >= threshHigh) {
        bloomFactor = 1.0;
    } else {
        // Smoothstep for the soft knee region
        let t = (luma - threshLow) / (threshHigh - threshLow);
        bloomFactor = t * t * (3.0 - 2.0 * t);
    }
    
    // Multiply original HDR color by bloom factor
    let brightColor = color.rgb * bloomFactor;
    
    return vec4<f32>(brightColor, color.a);
}
`},composite:{glsl:`/*
 * Bloom composite pass
 * Adds tinted bloom to the original HDR scene
 * All operations in linear color space
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform sampler2D bloomTex;
uniform float intensity;
uniform vec3 tint;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    
    // Get original scene color (HDR)
    vec4 sceneColor = texelFetch(inputTex, coord, 0);
    
    // Get bloom color
    vec3 bloom = texelFetch(bloomTex, coord, 0).rgb;
    
    // Apply tint
    bloom *= tint;

    // Additive blend: finalHDR = sceneColor + intensity * bloom
    vec3 finalRgb = sceneColor.rgb + intensity * bloom;
    
    fragColor = vec4(finalRgb, sceneColor.a);
}
`,wgsl:`/*
 * Bloom composite pass
 * Adds tinted bloom to the original HDR scene
 * All operations in linear color space
 */

struct Uniforms {
    intensity: f32,
    tint: vec3<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var bloomTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    
    // Get original scene color (HDR)
    let sceneColor = textureSample(inputTex, inputSampler, uv);
    
    // Get bloom color
    var bloom = textureSample(bloomTex, inputSampler, uv).rgb;
    
    // Apply tint
    bloom *= uniforms.tint;

    // Additive blend: finalHDR = sceneColor + intensity * bloom
    let finalRgb = sceneColor.rgb + uniforms.intensity * bloom;
    
    return vec4<f32>(finalRgb, sceneColor.a);
}
`},ntapGather:{glsl:`/*
 * Bloom N-tap gather pass
 * Samples bright texture with configurable radially symmetric kernel
 * Kernel uses concentric rings with Gaussian-ish falloff
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float radius;
uniform float renderScale;
uniform int taps;

out vec4 fragColor;

// Maximum number of taps supported
const int MAX_TAPS = 64;

// Golden angle for Poisson-like disk distribution
const float GOLDEN_ANGLE = 2.39996323;
const float PI = 3.14159265359;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 uv = gl_FragCoord.xy / texSize;
    vec2 texelSize = 1.0 / texSize;
    
    // Bloom radius in UV space, scaled for export resolution
    vec2 radiusUV = radius * renderScale * texelSize;

    // Clamp taps to valid range
    int tapCount = clamp(taps, 1, MAX_TAPS);
    
    vec3 bloomAccum = vec3(0.0);
    float weightSum = 0.0;
    
    // Generate N-tap kernel using golden angle spiral (Poisson-ish distribution)
    // with Gaussian-like radial falloff for weights
    for (int i = 0; i < MAX_TAPS; i++) {
        if (i >= tapCount) break;

        // Compute tap offset using golden angle spiral
        // r goes from 0 to 1 as sqrt(i/N) for uniform area distribution
        float t = float(i) / float(tapCount);
        float r = sqrt(t);
        float theta = float(i) * GOLDEN_ANGLE;
        
        vec2 offset = vec2(cos(theta), sin(theta)) * r;
        
        // Gaussian-ish weight based on distance from center
        // sigma = 0.4 gives good falloff
        float sigma = 0.4;
        float weight = exp(-0.5 * (r * r) / (sigma * sigma));
        
        // Sample with clamped UV (edge handling)
        vec2 sampleUV = clamp(uv + offset * radiusUV, vec2(0.0), vec2(1.0));
        vec3 sampleColor = texture(inputTex, sampleUV).rgb;
        
        bloomAccum += sampleColor * weight;
        weightSum += weight;
    }
    
    // Normalize for energy conservation
    if (weightSum > 0.0) {
        bloomAccum /= weightSum;
    }
    
    fragColor = vec4(bloomAccum, 1.0);
}
`,wgsl:`/*
 * Bloom N-tap gather pass
 * Samples bright texture with configurable radially symmetric kernel
 * Kernel uses concentric rings with Gaussian-ish falloff
 */

struct Uniforms {
    radius: f32,
    taps: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// Golden angle for Poisson-like disk distribution
const GOLDEN_ANGLE: f32 = 2.39996323;
const MAX_TAPS: i32 = 64;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    // Bloom radius in UV space
    let radiusUV = uniforms.radius * texelSize;

    // Clamp taps to valid range
    let tapCount = clamp(i32(uniforms.taps), 1, MAX_TAPS);
    
    var bloomAccum = vec3<f32>(0.0);
    var weightSum: f32 = 0.0;
    
    // Generate N-tap kernel using golden angle spiral (Poisson-ish distribution)
    // with Gaussian-like radial falloff for weights
    for (var i: i32 = 0; i < MAX_TAPS; i++) {
        if (i >= tapCount) { break; }

        // Compute tap offset using golden angle spiral
        // r goes from 0 to 1 as sqrt(i/N) for uniform area distribution
        let t = f32(i) / f32(tapCount);
        let r = sqrt(t);
        let theta = f32(i) * GOLDEN_ANGLE;
        
        let offset = vec2<f32>(cos(theta), sin(theta)) * r;
        
        // Gaussian-ish weight based on distance from center
        let sigma: f32 = 0.4;
        let weight = exp(-0.5 * (r * r) / (sigma * sigma));
        
        // Sample with clamped UV (edge handling)
        let sampleUV = clamp(uv + offset * radiusUV, vec2<f32>(0.0), vec2<f32>(1.0));
        let sampleColor = textureSample(inputTex, inputSampler, sampleUV).rgb;
        
        bloomAccum += sampleColor * weight;
        weightSum += weight;
    }
    
    // Normalize for energy conservation
    if (weightSum > 0.0) {
        bloomAccum /= weightSum;
    }
    
    return vec4<f32>(bloomAccum, 1.0);
}
`}},r=`# bloom

Multi-pass bloom with bright-pass extraction and configurable glow

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| threshold | float | 0.8 | 0-2 | Threshold |
| softKnee | float | 0.2 | 0-0.5 | Soft Knee |
| intensity | float | 1 | 0-3 | Intensity |
| radius | float | 32 | 1-128 | Radius |
| taps | int | 8 | 8-64 | Taps |
| tint | color | 1,1,1 | - | Tint |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .bloom()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(i))e.shaders[o]={...n}}e&&r&&(e.help=r);var u="filter/bloom",m="filter",p="bloom",c=e;export{c as default,u as effectId,p as effectName,r as help,m as namespace};
