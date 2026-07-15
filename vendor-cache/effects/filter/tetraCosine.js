/* filter/tetraCosine */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var l={offsetR:{slot:0,components:"x"},offsetG:{slot:0,components:"y"},offsetB:{slot:0,components:"z"},colorMode:{slot:0,components:"w"},ampR:{slot:1,components:"x"},ampG:{slot:1,components:"y"},ampB:{slot:1,components:"z"},repeat:{slot:1,components:"w"},freqR:{slot:2,components:"x"},freqG:{slot:2,components:"y"},freqB:{slot:2,components:"z"},offset:{slot:2,components:"w"},phaseR:{slot:3,components:"x"},phaseG:{slot:3,components:"y"},phaseB:{slot:3,components:"z"},alpha:{slot:3,components:"w"},rotation:{slot:4,components:"x"},time:{slot:4,components:"y"}},n=new t({name:"TetraCosine",namespace:"filter",func:"tetraCosine",tags:["color","palette"],openCategories:["general","mapping"],description:"Apply Tetra cosine palettes based on luminance",uniformLayout:l,globals:{colorMode:{type:"int",default:0,uniform:"colorMode",choices:{rgb:0,hsv:1,oklab:2,oklch:3},ui:{label:"color mode",control:"dropdown"}},offsetR:{type:"float",default:.5,uniform:"offsetR",min:0,max:1,step:.01,ui:{label:"offset r",control:"slider",category:"offset"}},offsetG:{type:"float",default:.5,uniform:"offsetG",min:0,max:1,step:.01,ui:{label:"offset g",control:"slider",category:"offset"}},offsetB:{type:"float",default:.5,uniform:"offsetB",min:0,max:1,step:.01,ui:{label:"offset b",control:"slider",category:"offset"}},ampR:{type:"float",default:.5,uniform:"ampR",min:0,max:1,step:.01,ui:{label:"amp r",control:"slider",category:"amplitude"}},ampG:{type:"float",default:.5,uniform:"ampG",min:0,max:1,step:.01,ui:{label:"amp g",control:"slider",category:"amplitude"}},ampB:{type:"float",default:.5,uniform:"ampB",min:0,max:1,step:.01,ui:{label:"amp b",control:"slider",category:"amplitude"}},freqR:{type:"int",default:1,uniform:"freqR",min:0,max:4,ui:{label:"freq r",control:"slider",category:"frequency"}},freqG:{type:"int",default:1,uniform:"freqG",min:0,max:4,ui:{label:"freq g",control:"slider",category:"frequency"}},freqB:{type:"int",default:1,uniform:"freqB",min:0,max:4,ui:{label:"freq b",control:"slider",category:"frequency"}},phaseR:{type:"float",default:0,uniform:"phaseR",min:0,max:1,step:.01,ui:{label:"phase r",control:"slider",category:"phase"}},phaseG:{type:"float",default:.33,uniform:"phaseG",min:0,max:1,step:.01,ui:{label:"phase g",control:"slider",category:"phase"}},phaseB:{type:"float",default:.67,uniform:"phaseB",min:0,max:1,step:.01,ui:{label:"phase b",control:"slider",category:"phase"}},rotation:{type:"float",default:0,uniform:"rotation",choices:{none:0,fwd:1,back:-1},ui:{label:"rotation",control:"dropdown"}},repeat:{type:"float",default:1,uniform:"repeat",min:0,max:10,randChoices:[1,2,3,4,5],step:.01,ui:{label:"repeat",control:"slider",category:"mapping"}},offset:{type:"float",default:0,uniform:"offset",min:0,max:1,step:.01,ui:{label:"offset",control:"slider",category:"mapping"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,randMin:.5,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

noise()
  .tetraCosine()
  .write(o0)`,passes:[{name:"render",program:"tetraCosine",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={tetraCosine:{glsl:`/**
 * Tetra Cosine Gradient - GLSL Fragment Shader
 *
 * Applies a cosine palette to the input image based on luminance.
 * Uses the Inigo Quilez cosine palette formula:
 *   color(t) = offset + amp * cos(2\u03C0 * (freq * t + phase))
 *
 * Supports RGB, HSV, OkLab, and OKLCH color modes.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;

// Color mode: 0=RGB, 1=HSV, 2=OkLab, 3=OKLCH
uniform int colorMode;

// Cosine palette parameters
uniform float offsetR;
uniform float offsetG;
uniform float offsetB;
uniform float ampR;
uniform float ampG;
uniform float ampB;
uniform float freqR;
uniform float freqG;
uniform float freqB;
uniform float phaseR;
uniform float phaseG;
uniform float phaseB;

// Mapping controls
uniform float repeat;
uniform float offset;
uniform float alpha;
uniform int rotation;   // -1 = backward, 0 = none, 1 = forward
uniform float time;

out vec4 fragColor;

const float TAU = 6.283185307179586;

// ============================================================================
// Color Space Conversions
// ============================================================================

// HSV to RGB
vec3 hsv2rgb(vec3 hsv) {
    float h = hsv.x;
    float s = hsv.y;
    float v = hsv.z;

    float c = v * s;
    float hp = h * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    float m = v - c;

    vec3 rgb;
    if (hp < 1.0) {
        rgb = vec3(c, x, 0.0);
    } else if (hp < 2.0) {
        rgb = vec3(x, c, 0.0);
    } else if (hp < 3.0) {
        rgb = vec3(0.0, c, x);
    } else if (hp < 4.0) {
        rgb = vec3(0.0, x, c);
    } else if (hp < 5.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }

    return rgb + vec3(m);
}

// OkLab to linear RGB
vec3 oklab2linear(vec3 lab) {
    float L = lab.x;
    float a = lab.y;
    float b = lab.z;

    float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    float s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// Linear to sRGB gamma
vec3 linear2srgb(vec3 linear) {
    vec3 low = linear * 12.92;
    vec3 high = 1.055 * pow(max(linear, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(high, low, step(linear, vec3(0.0031308)));
}

// OkLab to sRGB (cosine output is 0-1, a/b need remapping from 0-1 to -0.4..0.4)
vec3 oklab2rgb(vec3 lab) {
    // Remap a, b from 0-1 storage format to actual -0.4 to 0.4 range
    float L = lab.x;
    float a = (lab.y - 0.5) * 0.8;  // 0-1 \u2192 -0.4 to 0.4
    float b = (lab.z - 0.5) * 0.8;  // 0-1 \u2192 -0.4 to 0.4

    vec3 linear_rgb = oklab2linear(vec3(L, a, b));
    return clamp(linear2srgb(linear_rgb), 0.0, 1.0);
}

// OKLCH to sRGB (cosine output is L 0-1, C 0-1 representing 0-0.4, H 0-1)
vec3 oklch2rgb(vec3 lch) {
    float L = lch.x;
    float C = lch.y * 0.4;  // 0-1 \u2192 0 to 0.4
    float H = lch.z * TAU;  // 0-1 \u2192 0 to 2\u03C0

    // Convert cylindrical to cartesian (OkLab)
    float a = C * cos(H);
    float b = C * sin(H);

    vec3 linear_rgb = oklab2linear(vec3(L, a, b));
    return clamp(linear2srgb(linear_rgb), 0.0, 1.0);
}

// ============================================================================
// Cosine Palette
// ============================================================================

vec3 cosinePalette(float t, vec3 offset, vec3 amp, vec3 freq, vec3 phase) {
    return clamp(offset + amp * cos(TAU * (freq * t + phase)), 0.0, 1.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    // Calculate UV from gl_FragCoord
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 uv = gl_FragCoord.xy / texSize;

    // Get input color
    vec4 inputColor = texture(inputTex, uv);

    // Calculate luminance as the t value
    float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Apply mapping: repeat, offset, and rotation (animation)
    float t = lum * repeat + offset;

    if (rotation == -1) {
        t += time;
    } else if (rotation == 1) {
        t -= time;
    }

    t = fract(t);

    // Build palette parameters from uniforms
    vec3 offset = vec3(offsetR, offsetG, offsetB);
    vec3 amp = vec3(ampR, ampG, ampB);
    vec3 freq = vec3(freqR, freqG, freqB);
    vec3 phase = vec3(phaseR, phaseG, phaseB);

    // Evaluate cosine palette
    vec3 paletteColor = cosinePalette(t, offset, amp, freq, phase);

    // Convert from color mode to RGB
    vec3 finalColor;
    if (colorMode == 1) {
        // HSV mode
        finalColor = hsv2rgb(paletteColor);
    } else if (colorMode == 2) {
        // OkLab mode
        finalColor = oklab2rgb(paletteColor);
    } else if (colorMode == 3) {
        // OKLCH mode
        finalColor = oklch2rgb(paletteColor);
    } else {
        // RGB mode (default)
        finalColor = paletteColor;
    }

    // Blend with original based on alpha
    vec3 blendedColor = mix(inputColor.rgb, finalColor, alpha);

    fragColor = vec4(blendedColor, inputColor.a);
}
`,wgsl:`/**
 * Tetra Cosine Gradient - WGSL Fragment Shader
 *
 * Applies a cosine palette to the input image based on luminance.
 * Uses the Inigo Quilez cosine palette formula:
 *   color(t) = offset + amp * cos(2\u03C0 * (freq * t + phase))
 *
 * Supports RGB, HSV, OkLab, and OKLCH color modes.
 */

struct Uniforms {
    data: array<vec4<f32>, 6>,
    // data[0].x = offsetR, data[0].y = offsetG, data[0].z = offsetB, data[0].w = colorMode
    // data[1].x = ampR, data[1].y = ampG, data[1].z = ampB, data[1].w = repeat
    // data[2].x = freqR, data[2].y = freqG, data[2].z = freqB, data[2].w = offset (mapping)
    // data[3].x = phaseR, data[3].y = phaseG, data[3].z = phaseB, data[3].w = alpha
    // data[4].x = rotation, data[4].y = time
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.283185307179586;

// ============================================================================
// Color Space Conversions
// ============================================================================

// HSV to RGB
fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = hsv.x;
    let s = hsv.y;
    let v = hsv.z;

    let c = v * s;
    let hp = h * 6.0;
    let x = c * (1.0 - abs((hp % 2.0 + 2.0) % 2.0 - 1.0));
    let m = v - c;

    var rgb: vec3<f32>;
    if (hp < 1.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (hp < 2.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (hp < 3.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (hp < 4.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (hp < 5.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }

    return rgb + vec3<f32>(m);
}

// OkLab to linear RGB
fn oklab2linear(lab: vec3<f32>) -> vec3<f32> {
    let L = lab.x;
    let a = lab.y;
    let b = lab.z;

    let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    return vec3<f32>(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

// Linear to sRGB gamma
fn linear2srgb(linear: vec3<f32>) -> vec3<f32> {
    let low = linear * 12.92;
    let high = 1.055 * pow(max(linear, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
    return select(high, low, linear < vec3<f32>(0.0031308));
}

// OkLab to sRGB (cosine output is 0-1, a/b need remapping from 0-1 to -0.4..0.4)
fn oklab2rgb(lab: vec3<f32>) -> vec3<f32> {
    // Remap a, b from 0-1 storage format to actual -0.4 to 0.4 range
    let L = lab.x;
    let a = (lab.y - 0.5) * 0.8;  // 0-1 \u2192 -0.4 to 0.4
    let b = (lab.z - 0.5) * 0.8;  // 0-1 \u2192 -0.4 to 0.4

    let linear_rgb = oklab2linear(vec3<f32>(L, a, b));
    return clamp(linear2srgb(linear_rgb), vec3<f32>(0.0), vec3<f32>(1.0));
}

// OKLCH to sRGB (cosine output is L 0-1, C 0-1 representing 0-0.4, H 0-1)
fn oklch2rgb(lch: vec3<f32>) -> vec3<f32> {
    let L = lch.x;
    let C = lch.y * 0.4;  // 0-1 \u2192 0 to 0.4
    let H = lch.z * TAU;  // 0-1 \u2192 0 to 2\u03C0

    // Convert cylindrical to cartesian (OkLab)
    let a = C * cos(H);
    let b = C * sin(H);

    let linear_rgb = oklab2linear(vec3<f32>(L, a, b));
    return clamp(linear2srgb(linear_rgb), vec3<f32>(0.0), vec3<f32>(1.0));
}

// ============================================================================
// Cosine Palette
// ============================================================================

fn cosinePalette(t: f32, offset: vec3<f32>, amp: vec3<f32>, freq: vec3<f32>, phase: vec3<f32>) -> vec3<f32> {
    return clamp(offset + amp * cos(TAU * (freq * t + phase)), vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    // Extract uniforms
    let offset = uniforms.data[0].xyz;
    let colorMode = i32(uniforms.data[0].w);
    let amp = uniforms.data[1].xyz;
    let repeatVal = uniforms.data[1].w;
    let freq = uniforms.data[2].xyz;
    let offsetVal = uniforms.data[2].w;
    let phase = uniforms.data[3].xyz;
    let alpha = uniforms.data[3].w;
    let rotation = i32(uniforms.data[4].x);
    let time = uniforms.data[4].y;

    // Calculate UV from position
    let size = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = position.xy / size;

    // Get input color
    let inputColor = textureSample(inputTex, samp, uv);

    // Calculate luminance as the t value
    let lum = dot(inputColor.rgb, vec3<f32>(0.299, 0.587, 0.114));

    // Apply mapping: repeat, offset, and rotation (animation)
    var t = lum * repeatVal + offsetVal;

    if (rotation == -1) {
        t = t + time;
    } else if (rotation == 1) {
        t = t - time;
    }

    t = fract(t);

    // Evaluate cosine palette
    let paletteColor = cosinePalette(t, offset, amp, freq, phase);

    // Convert from color mode to RGB
    var finalColor: vec3<f32>;
    if (colorMode == 1) {
        // HSV mode
        finalColor = hsv2rgb(paletteColor);
    } else if (colorMode == 2) {
        // OkLab mode
        finalColor = oklab2rgb(paletteColor);
    } else if (colorMode == 3) {
        // OKLCH mode
        finalColor = oklch2rgb(paletteColor);
    } else {
        // RGB mode (default)
        finalColor = paletteColor;
    }

    // Blend with original based on alpha
    let blendedColor = mix(inputColor.rgb, finalColor, alpha);

    return vec4<f32>(blendedColor, inputColor.a);
}
`}},r=`# tetraCosine

Apply Tetra cosine gradient palettes to images based on luminance.

## Overview

The \`tetraCosine\` effect uses the Inigo Quilez cosine gradient formula to map input luminance to colors:

\`\`\`
color(t) = offset + amplitude \xD7 cos(2\u03C0 \xD7 (frequency \xD7 t + phase))
\`\`\`

Where \`t\` is the input pixel's luminance (0-1).

This effect is fully compatible with Tetra's cosine palette format and can load saved Tetra palettes.

## Parameters

### Color Mode
- **Color Mode**: Choose the color space for the gradient calculation
  - RGB (default): Standard RGB color space
  - HSV: Hue-Saturation-Value for intuitive hue cycling
  - OkLab: Perceptually uniform color space
  - OKLCH: Cylindrical perceptual space with explicit hue control

### Offset (Center/Bias)
- **Offset R/G/B**: The center point for each channel (0-1)
  - Controls the "midpoint" color of the gradient
  - Default: 0.5, 0.5, 0.5 (gray center)

### Amplitude
- **Amp R/G/B**: The amplitude of color variation for each channel (0-1)
  - Controls how far the gradient swings from the offset
  - Default: 0.5, 0.5, 0.5 (full range)

### Frequency
- **Freq R/G/B**: How many cycles per gradient length (0-4)
  - Higher values create more repetitions
  - Default: 1.0, 1.0, 1.0 (one cycle)

### Phase
- **Phase R/G/B**: Phase offset for each channel (0-1)
  - Controls where in the cosine cycle each channel starts
  - Default: 0.0, 0.33, 0.67 (rainbow)

### Rotation
- **Rotation**: Animate the palette mapping over time
  - None: No animation
  - Fwd: Palette cycles forward
  - Back: Palette cycles backward

### Mapping
- **Repeat**: Multiplier for the luminance value (1-10)
  - Higher values create more repetitions across the luminance range
- **Offset**: Offset added to the luminance value (0-1)
  - Shifts the entire gradient mapping

### Output
- **Alpha**: Blend amount with original image (0-1)
  - 0 = original image, 1 = full effect

## Classic Presets

### Rainbow (Default)
\`\`\`
offset: [0.5, 0.5, 0.5]
amp: [0.5, 0.5, 0.5]
freq: [1.0, 1.0, 1.0]
phase: [0.0, 0.33, 0.67]
\`\`\`

### Fire
\`\`\`
offset: [0.5, 0.5, 0.0]
amp: [0.5, 0.5, 0.0]
freq: [1.0, 1.0, 0.0]
phase: [0.0, 0.15, 0.0]
\`\`\`

### Ocean
\`\`\`
offset: [0.5, 0.5, 0.5]
amp: [0.5, 0.5, 0.5]
freq: [1.0, 1.0, 1.0]
phase: [0.0, 0.1, 0.2]
\`\`\`

## Tetra Config Compatibility

This effect uses the same parameter format as Tetra's cosine palettes. To use a Tetra palette:

1. Export a palette from Tetra as JSON
2. The \`params\` object contains \`offset\`, \`amp\`, \`freq\`, \`phase\` arrays
3. Set each slider to match the corresponding values

Example Tetra palette JSON:
\`\`\`json
{
  "name": "My Palette",
  "type": "cosine",
  "colorMode": "rgb",
  "params": {
    "offset": [0.5, 0.5, 0.5],
    "amp": [0.5, 0.5, 0.5],
    "freq": [1.0, 1.0, 1.0],
    "phase": [0.0, 0.33, 0.67]
  }
}
\`\`\`

## DSL Usage

\`\`\`javascript
// Basic rainbow gradient
noise().tetraCosine()

// Fire gradient
noise().tetraCosine({
  offsetR: 0.5, offsetG: 0.5, offsetB: 0.0,
  ampR: 0.5, ampG: 0.5, ampB: 0.0,
  freqR: 1.0, freqG: 1.0, freqB: 0.0,
  phaseR: 0.0, phaseG: 0.15, phaseB: 0.0
})

// HSV color mode with hue cycling
noise().tetraCosine({
  colorMode: 1,  // HSV
  offsetR: 0.5, offsetG: 0.85, offsetB: 0.85,
  ampR: 0.5, ampG: 0.1, ampB: 0.1,
  freqR: 1.0, freqG: 0.5, freqB: 0.5,
  phaseR: 0.0, phaseG: 0.0, phaseB: 0.0
})
\`\`\`

## References

- [Inigo Quilez - Palettes](https://iquilezles.org/articles/palettes/)
- [Tetra Palette Editor](https://tetra.noisedeck.app)

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .tetraCosine()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(o))n.shaders[a]={...e}}n&&r&&(n.help=r);var c="filter/tetraCosine",m="filter",u="tetraCosine",h=n;export{h as default,c as effectId,u as effectName,r as help,m as namespace};
