/* mixer/thresholdMix */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new o({name:"ThresholdMix",namespace:"mixer",func:"thresholdMix",tags:["blend"],description:"Blend using threshold masking",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mode:{type:"int",default:0,uniform:"mode",choices:{luminance:0,rgb:1},ui:{label:"mode",control:"dropdown"}},quantize:{type:"int",default:0,uniform:"quantize",min:0,max:8,ui:{label:"quantize",control:"slider"}},mapSource:{type:"int",default:1,uniform:"mapSource",choices:{sourceA:0,sourceB:1},ui:{label:"map source",control:"dropdown"}},threshold:{type:"float",default:.5,uniform:"threshold",min:0,max:1,ui:{label:"threshold",control:"slider",enabledBy:{param:"mode",eq:0}}},range:{type:"float",default:0,uniform:"range",min:0,max:1,ui:{label:"range",control:"slider",enabledBy:{param:"mode",eq:0}}},thresholdR:{type:"float",default:.5,uniform:"thresholdR",min:0,max:1,ui:{label:"threshold r",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}},rangeR:{type:"float",default:0,uniform:"rangeR",min:0,max:1,ui:{label:"range r",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}},thresholdG:{type:"float",default:.5,uniform:"thresholdG",min:0,max:1,ui:{label:"threshold g",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}},rangeG:{type:"float",default:0,uniform:"rangeG",min:0,max:1,ui:{label:"range g",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}},thresholdB:{type:"float",default:.5,uniform:"thresholdB",min:0,max:1,ui:{label:"threshold b",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}},rangeB:{type:"float",default:0,uniform:"rangeB",min:0,max:1,ui:{label:"range b",control:"slider",category:"rgb",enabledBy:{param:"mode",eq:1}}}},defaultProgram:`search mixer, synth

noise()
.write(o0)

solid(color: #000000)
.thresholdMix(tex: read(o0))
.write(o1)
`,passes:[{name:"render",program:"thresholdMix",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var t={thresholdMix:{glsl:`/*
 * ThresholdMix mixer shader
 * Combines two input textures using threshold masking with optional posterization
 * Supports luminance-based or per-channel RGB thresholding
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mode;
uniform int quantize;
uniform int mapSource;
uniform float threshold;
uniform float range;
uniform float thresholdR;
uniform float rangeR;
uniform float thresholdG;
uniform float rangeG;
uniform float thresholdB;
uniform float rangeB;

out vec4 fragColor;

// Convert RGB to luminosity
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// Quantize a value into discrete bands
float quantizeValue(float value, int bands) {
    if (bands <= 0) return value;
    float numBands = float(bands);
    return floor(value * numBands) / numBands;
}

// Calculate blend factor with threshold and range
// Returns 0 for values below threshold, 1 for values above threshold+range
// Smooth transition in between
float calculateBlendFactor(float mapValue, float thresh, float rng) {
    if (rng <= 0.0) {
        // Hard threshold
        return step(thresh, mapValue);
    } else {
        // Soft threshold with range
        float lower = thresh;
        float upper = thresh + rng;
        return smoothstep(lower, upper, mapValue);
    }
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    
    vec4 colorA = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 colorB = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));
    
    // Get map color based on mapSource
    vec3 mapColor;
    if (mapSource == 0) {
        mapColor = colorA.rgb;
    } else {
        mapColor = colorB.rgb;
    }
    
    // Apply quantization to map values if enabled
    if (quantize > 0) {
        mapColor.r = quantizeValue(mapColor.r, quantize);
        mapColor.g = quantizeValue(mapColor.g, quantize);
        mapColor.b = quantizeValue(mapColor.b, quantize);
    }
    
    vec4 result;
    
    if (mode == 0) {
        // Luminance mode - use single threshold for all channels
        float lum = getLuminosity(mapColor);
        float blendFactor = calculateBlendFactor(lum, threshold, range);
        result = mix(colorA, colorB, blendFactor);
    } else {
        // RGB mode - use separate threshold for each channel
        float blendR = calculateBlendFactor(mapColor.r, thresholdR, rangeR);
        float blendG = calculateBlendFactor(mapColor.g, thresholdG, rangeG);
        float blendB = calculateBlendFactor(mapColor.b, thresholdB, rangeB);
        
        result.r = mix(colorA.r, colorB.r, blendR);
        result.g = mix(colorA.g, colorB.g, blendG);
        result.b = mix(colorA.b, colorB.b, blendB);
        result.a = mix(colorA.a, colorB.a, (blendR + blendG + blendB) / 3.0);
    }
    
    fragColor = result;
}
`,wgsl:`/*
 * ThresholdMix mixer shader (WGSL)
 * Combines two input textures using threshold masking with optional posterization
 * Supports luminance-based or per-channel RGB thresholding
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> mode: i32;
@group(0) @binding(4) var<uniform> quantize: i32;
@group(0) @binding(5) var<uniform> mapSource: i32;
@group(0) @binding(6) var<uniform> threshold: f32;
@group(0) @binding(7) var<uniform> range: f32;
@group(0) @binding(8) var<uniform> thresholdR: f32;
@group(0) @binding(9) var<uniform> rangeR: f32;
@group(0) @binding(10) var<uniform> thresholdG: f32;
@group(0) @binding(11) var<uniform> rangeG: f32;
@group(0) @binding(12) var<uniform> thresholdB: f32;
@group(0) @binding(13) var<uniform> rangeB: f32;

// Convert RGB to luminosity
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

// Quantize a value into discrete bands
fn quantizeValue(value: f32, bands: i32) -> f32 {
    if (bands <= 0) {
        return value;
    }
    let numBands = f32(bands);
    return floor(value * numBands) / numBands;
}

// Calculate blend factor with threshold and range
// Returns 0 for values below threshold, 1 for values above threshold+range
// Smooth transition in between
fn calculateBlendFactor(mapValue: f32, thresh: f32, rng: f32) -> f32 {
    if (rng <= 0.0) {
        // Hard threshold
        return step(thresh, mapValue);
    } else {
        // Soft threshold with range
        let lower = thresh;
        let upper = thresh + rng;
        return smoothstep(lower, upper, mapValue);
    }
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2f(textureDimensions(inputTex, 0));
    let uv = position.xy / dims;
    
    let colorA = textureSample(inputTex, samp, uv);
    let colorB = textureSample(tex, samp, uv);
    
    // Get map color based on mapSource
    var mapColor: vec3f;
    if (mapSource == 0) {
        mapColor = colorA.rgb;
    } else {
        mapColor = colorB.rgb;
    }
    
    // Apply quantization to map values if enabled
    if (quantize > 0) {
        mapColor.x = quantizeValue(mapColor.x, quantize);
        mapColor.y = quantizeValue(mapColor.y, quantize);
        mapColor.z = quantizeValue(mapColor.z, quantize);
    }
    
    var result: vec4f;
    
    if (mode == 0) {
        // Luminance mode - use single threshold for all channels
        let lum = getLuminosity(mapColor);
        let blendFactor = calculateBlendFactor(lum, threshold, range);
        result = mix(colorA, colorB, blendFactor);
    } else {
        // RGB mode - use separate threshold for each channel
        let blendR = calculateBlendFactor(mapColor.x, thresholdR, rangeR);
        let blendG = calculateBlendFactor(mapColor.y, thresholdG, rangeG);
        let blendB = calculateBlendFactor(mapColor.z, thresholdB, rangeB);
        
        result.x = mix(colorA.x, colorB.x, blendR);
        result.y = mix(colorA.y, colorB.y, blendG);
        result.z = mix(colorA.z, colorB.z, blendB);
        result.w = mix(colorA.w, colorB.w, (blendR + blendG + blendB) / 3.0);
    }
    
    return result;
}
`}},a=`# thresholdMix

Blend using threshold masking

## Description

Mixes two input textures using a threshold-based mask derived from one of the inputs. Areas below the threshold show source A, areas above show source B, with optional smooth blending across a range. Can operate on luminance or separate RGB channels, and supports quantization for posterized banding effects.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mode | int | luminance | luminance/rgb | Threshold mode |
| quantize | int | 0 | 0-8 | Posterization bands (0 = disabled) |
| mapSource | int | sourceB | sourceA/sourceB | Which input provides threshold values |
| threshold | float | 0.5 | 0-1 | Threshold cutoff point |
| range | float | 0 | 0-1 | Soft blend range above threshold |
| thresholdR | float | 0.5 | 0-1 | Red channel threshold (RGB mode) |
| rangeR | float | 0 | 0-1 | Red channel blend range (RGB mode) |
| thresholdG | float | 0.5 | 0-1 | Green channel threshold (RGB mode) |
| rangeG | float | 0 | 0-1 | Green channel blend range (RGB mode) |
| thresholdB | float | 0.5 | 0-1 | Blue channel threshold (RGB mode) |
| rangeB | float | 0 | 0-1 | Blue channel blend range (RGB mode) |

## Notes

- **Luminance mode**: Uses overall brightness to determine mixing, creating uniform transitions
- **RGB mode**: Each color channel is thresholded independently, allowing for color separation effects
- **Quantize**: Reduces the threshold map to discrete bands before mixing, creating posterized/banded effects
- **Range**: When 0, creates hard edges; increase for smooth gradients between sources
- **mapSource**: Choose whether source A or B provides the threshold map; the other source will be mixed in based on that map
- Use a gradient or noise texture as the map source for creative masking effects
- Combine with quantize for retro/posterized looks

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .thresholdMix(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(t).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(t))n.shaders[r]={...e}}n&&a&&(n.help=a);var d="mixer/thresholdMix",h="mixer",m="thresholdMix",c=n;export{c as default,d as effectId,m as effectName,a as help,h as namespace};
