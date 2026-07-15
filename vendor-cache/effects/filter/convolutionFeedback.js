/* filter/convolutionFeedback */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Convolution Feedback",func:"convolutionFeedback",tags:["sim"],openCategories:["general","sharpen","blur"],description:"Convolution feedback with blur and sharpen",globals:{sharpenRadius:{type:"int",default:5,uniform:"sharpenRadius",min:1,max:10,step:1,randMin:4,ui:{label:"radius",control:"slider",category:"sharpen"}},sharpenAmount:{type:"float",default:2.5,uniform:"sharpenAmount",min:0,max:3,step:.1,randMin:1,ui:{label:"amount",control:"slider",category:"sharpen"}},blurRadius:{type:"int",default:4,uniform:"blurRadius",min:1,max:10,step:1,randMax:4,ui:{label:"radius",control:"slider",category:"blur"}},blurAmount:{type:"float",default:.5,uniform:"blurAmount",min:0,max:1,step:.01,randMax:.3,ui:{label:"amount",control:"slider",category:"blur"}},intensity:{type:"float",default:.75,uniform:"intensity",min:0,max:1,step:.01,zero:0,randMin:.65,ui:{label:"feedback",control:"slider"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"state"}}},textures:{_cfSharpened:{width:"input",height:"input",format:"rgba8unorm"},_cfBlurred:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"sharpen",program:"cfSharpen",inputs:{inputTex:"selfTex"},outputs:{fragColor:"_cfSharpened"}},{name:"blur",program:"cfBlur",inputs:{inputTex:"_cfSharpened"},outputs:{fragColor:"_cfBlurred"}},{name:"blend",program:"cfBlend",inputs:{inputTex:"inputTex",feedbackTex:"_cfBlurred"},outputs:{fragColor:"outputTex"}}]});var r={cfBlend:{glsl:`/*
 * Convolution Feedback - Blend Pass
 * Blends processed feedback texture with input based on intensity
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform sampler2D feedbackTex;
uniform float intensity;
uniform bool resetState;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    
    vec4 inputColor = texelFetch(inputTex, coord, 0);
    
    // If resetState is true, bypass feedback and return input directly
    if (resetState) {
        fragColor = inputColor;
        return;
    }
    
    vec4 feedback = texelFetch(feedbackTex, coord, 0);
    
    // Blend input with processed feedback based on intensity
    vec3 result = mix(inputColor.rgb, feedback.rgb, intensity);
    
    fragColor = vec4(result, inputColor.a);
}
`,wgsl:`/*
 * Convolution Feedback - Blend Pass
 * Blends processed feedback texture with input based on intensity
 */

struct Uniforms {
    sharpenRadius: i32,
    blurRadius: i32,
    sharpenAmount: f32,
    blurAmount: f32,
    intensity: f32,
    resetState: i32,
    _pad2: f32,
    _pad3: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var feedbackTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(in.position.xy);
    
    let input = textureLoad(inputTex, coord, 0);
    
    // If resetState is true, bypass feedback and return input directly
    if (uniforms.resetState != 0) {
        return input;
    }
    
    let feedback = textureLoad(feedbackTex, coord, 0);
    
    // Blend input with processed feedback based on intensity
    let result = mix(input.rgb, feedback.rgb, uniforms.intensity);
    
    return vec4<f32>(result, input.a);
}
`},cfBlur:{glsl:`/*
 * Convolution Feedback - Blur Pass
 * Applies Gaussian blur with configurable radius and amount
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform int blurRadius;
uniform float blurAmount;
uniform float renderScale;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);

    vec4 center = texelFetch(inputTex, coord, 0);

    int scaledRadius = int(float(blurRadius) * renderScale);

    if (scaledRadius <= 0 || blurAmount <= 0.0) {
        fragColor = center;
        return;
    }

    // Compute sigma for Gaussian (radius ~= 2*sigma for good coverage)
    float sigma = float(scaledRadius) / 2.0;
    float sigma2 = sigma * sigma;
    
    vec3 sum = vec3(0.0);
    float weightSum = 0.0;
    
    for (int ky = -scaledRadius; ky <= scaledRadius; ky++) {
        for (int kx = -scaledRadius; kx <= scaledRadius; kx++) {
            ivec2 samplePos = coord + ivec2(kx, ky);
            samplePos = clamp(samplePos, ivec2(0), texSize - 1);
            
            float dist2 = float(kx * kx + ky * ky);
            float weight = exp(-dist2 / (2.0 * sigma2));
            
            vec4 texSample = texelFetch(inputTex, samplePos, 0);
            sum += texSample.rgb * weight;
            weightSum += weight;
        }
    }
    
    vec3 blurred = sum / weightSum;
    
    // Mix between original and blurred based on blurAmount
    vec3 result = mix(center.rgb, blurred, blurAmount);
    
    fragColor = vec4(result, center.a);
}
`,wgsl:`/*
 * Convolution Feedback - Blur Pass
 * Applies Gaussian blur with configurable radius and amount
 */

struct Uniforms {
    sharpenRadius: i32,
    blurRadius: i32,
    sharpenAmount: f32,
    blurAmount: f32,
    intensity: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(inputTex));
    let coord = vec2<i32>(in.position.xy);
    
    let center = textureLoad(inputTex, coord, 0);
    let radius = uniforms.blurRadius;
    let amount = uniforms.blurAmount;
    
    if (radius <= 0 || amount <= 0.0) {
        return center;
    }
    
    // Compute sigma for Gaussian (radius ~= 2*sigma for good coverage)
    let sigma = f32(radius) / 2.0;
    let sigma2 = sigma * sigma;
    
    var sum = vec3<f32>(0.0);
    var weightSum = 0.0;
    
    for (var ky = -radius; ky <= radius; ky = ky + 1) {
        for (var kx = -radius; kx <= radius; kx = kx + 1) {
            var samplePos = coord + vec2<i32>(kx, ky);
            samplePos = clamp(samplePos, vec2<i32>(0), texSize - vec2<i32>(1));
            
            let dist2 = f32(kx * kx + ky * ky);
            let weight = exp(-dist2 / (2.0 * sigma2));
            
            let texSample = textureLoad(inputTex, samplePos, 0);
            sum = sum + texSample.rgb * weight;
            weightSum = weightSum + weight;
        }
    }
    
    let blurred = sum / weightSum;
    
    // Mix between original and blurred based on blurAmount
    let result = mix(center.rgb, blurred, amount);
    
    return vec4<f32>(result, center.a);
}
`},cfSharpen:{glsl:`/*
 * Convolution Feedback - Sharpen Pass
 * Applies unsharp mask with configurable radius
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform int sharpenRadius;
uniform float sharpenAmount;
uniform float renderScale;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);

    vec4 center = texelFetch(inputTex, coord, 0);

    int scaledRadius = int(float(sharpenRadius) * renderScale);

    if (scaledRadius <= 0 || sharpenAmount <= 0.0) {
        fragColor = center;
        return;
    }

    // Compute Gaussian-weighted blur for unsharp mask
    float sigma = float(scaledRadius) / 2.0;
    float sigma2 = sigma * sigma;

    vec3 blurSum = vec3(0.0);
    float weightSum = 0.0;

    for (int ky = -scaledRadius; ky <= scaledRadius; ky++) {
        for (int kx = -scaledRadius; kx <= scaledRadius; kx++) {
            ivec2 samplePos = coord + ivec2(kx, ky);
            samplePos = clamp(samplePos, ivec2(0), texSize - 1);
            
            float dist2 = float(kx * kx + ky * ky);
            float weight = exp(-dist2 / (2.0 * sigma2));
            
            vec4 texSample = texelFetch(inputTex, samplePos, 0);
            blurSum += texSample.rgb * weight;
            weightSum += weight;
        }
    }
    
    vec3 blurred = blurSum / weightSum;
    
    // Unsharp mask: sharpened = original + amount * (original - blurred)
    vec3 sharpened = center.rgb + sharpenAmount * (center.rgb - blurred);
    sharpened = clamp(sharpened, 0.0, 1.0);
    
    fragColor = vec4(sharpened, center.a);
}
`,wgsl:`/*
 * Convolution Feedback - Sharpen Pass
 * Applies unsharp mask with configurable radius
 */

struct Uniforms {
    sharpenRadius: i32,
    blurRadius: i32,
    sharpenAmount: f32,
    blurAmount: f32,
    intensity: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(inputTex));
    let coord = vec2<i32>(in.position.xy);
    
    let center = textureLoad(inputTex, coord, 0);
    
    let radius = uniforms.sharpenRadius;
    let amount = uniforms.sharpenAmount;
    
    if (radius <= 0 || amount <= 0.0) {
        return center;
    }
    
    // Compute Gaussian-weighted blur for unsharp mask
    let sigma = f32(radius) / 2.0;
    let sigma2 = sigma * sigma;
    
    var blurSum = vec3<f32>(0.0);
    var weightSum = 0.0;
    
    for (var ky = -radius; ky <= radius; ky = ky + 1) {
        for (var kx = -radius; kx <= radius; kx = kx + 1) {
            var samplePos = coord + vec2<i32>(kx, ky);
            samplePos = clamp(samplePos, vec2<i32>(0), texSize - vec2<i32>(1));
            
            let dist2 = f32(kx * kx + ky * ky);
            let weight = exp(-dist2 / (2.0 * sigma2));
            
            let texSample = textureLoad(inputTex, samplePos, 0);
            blurSum = blurSum + texSample.rgb * weight;
            weightSum = weightSum + weight;
        }
    }
    
    let blurred = blurSum / weightSum;
    
    // Unsharp mask: sharpened = original + amount * (original - blurred)
    var sharpened = center.rgb + amount * (center.rgb - blurred);
    sharpened = clamp(sharpened, vec3<f32>(0.0), vec3<f32>(1.0));
    
    return vec4<f32>(sharpened, center.a);
}
`}},a=`# convolutionFeedback

Convolution feedback with blur and sharpen

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| sharpenRadius | int | 5 | 1-10 | Sharpen Radius |
| sharpenAmount | float | 2.5 | 0-3 | Sharpen Amount |
| blurRadius | int | 4 | 1-10 | Blur Radius |
| blurAmount | float | 0.5 | 0-1 | Blur Amount |
| intensity | float | 0.75 | 0-1 | Feedback Intensity |
| resetState | boolean | false | - | State |

## Notes

Algorithm pipeline:
1. **Sharpen**: Unsharp mask on feedback texture
2. **Blur**: Gaussian blur with configurable radius and amount
3. **Blend**: Mix processed feedback with current input based on intensity

The feedback loop creates evolving, time-accumulating effects.

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .convolutionFeedback()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(r))e.shaders[i]={...n}}e&&a&&(e.help=a);var d="filter/convolutionFeedback",p="filter",c="convolutionFeedback",f=e;export{f as default,d as effectId,c as effectName,a as help,p as namespace};
