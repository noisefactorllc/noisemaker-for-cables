/* filter/celShading */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Cel Shading",namespace:"filter",func:"celShading",tags:["color","edges"],openCategories:["general","edges"],description:"Cartoon-style shading with posterization and outlines",globals:{mix:{type:"float",default:1,uniform:"mixAmount",min:0,max:1,step:.01,zero:0,ui:{label:"mix",control:"slider"}},levels:{type:"int",default:4,uniform:"levels",min:2,max:8,step:1,ui:{label:"levels",control:"slider"}},gamma:{type:"float",default:.65,uniform:"gamma",min:.1,max:3,step:.05,zero:1,ui:{label:"gamma",control:"slider"}},antialias:{type:"boolean",default:!1,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}},edgeWidth:{type:"int",default:1,uniform:"edgeWidth",min:0,max:5,randMax:3,zero:0,ui:{label:"width",control:"slider",category:"edges"}},edgeThreshold:{type:"float",default:.15,uniform:"edgeThreshold",min:.01,max:1,step:.01,zero:0,ui:{label:"threshold",control:"slider",category:"edges"}},edgeColor:{type:"color",default:[0,0,0],uniform:"edgeColor",randChance:0,ui:{label:"color",control:"color",category:"edges"}},lightDirection:{type:"vec3",default:[.5,.5,1],uniform:"lightDirection",ui:{label:"light dir",control:"vector3",category:"shading"}},strength:{type:"float",default:0,uniform:"strength",min:0,max:1,step:.01,randChance:0,ui:{label:"shading",control:"slider",category:"shading"}}},defaultProgram:`search filter, synth

noise(octaves: 4, scaleX: 100, scaleY: 100, ridges: true)
  .celShading()
  .write(o0)`,textures:{celShadingColorTex:{width:"100%",height:"100%",format:"rgba16f"},celShadingEdgeTex:{width:"100%",height:"100%",format:"rgba16f"}},paramAliases:{shadingStrength:"strength",mixAmount:"mix"},passes:[{name:"color",program:"celShadingColor",inputs:{inputTex:"inputTex"},outputs:{fragColor:"celShadingColorTex"}},{name:"edges",program:"celShadingEdges",inputs:{colorTex:"celShadingColorTex"},outputs:{fragColor:"celShadingEdgeTex"}},{name:"blend",program:"celShadingBlend",inputs:{inputTex:"inputTex",colorTex:"celShadingColorTex",edgeTex:"celShadingEdgeTex"},outputs:{fragColor:"outputTex"}}]});var r={celShadingBlend:{glsl:`/*
 * Cel Shading - Blend Pass
 * Combines cel-shaded color with edge outlines
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform sampler2D colorTex;
uniform sampler2D edgeTex;
uniform vec3 edgeColor;
uniform float mixAmount;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);

    vec4 origColor = texture(inputTex, uv);
    vec4 celColor = texture(colorTex, uv);
    float edgeStrength = texture(edgeTex, uv).r;

    // Apply edge color where edges are detected
    vec3 finalColor = mix(celColor.rgb, edgeColor, edgeStrength);

    // Mix with original based on mix amount
    finalColor = mix(origColor.rgb, finalColor, mixAmount);

    fragColor = vec4(finalColor, origColor.a);
}
`,wgsl:`/*
 * Cel Shading - Blend Pass
 * Combines cel-shaded color with edge outlines
 */

struct Uniforms {
    edgeColor: vec3f,
    mixAmount: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var colorTex: texture_2d<f32>;
@group(0) @binding(3) var edgeTex: texture_2d<f32>;
@group(0) @binding(4) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;

    let origColor = textureSample(inputTex, inputSampler, uv);
    let celColor = textureSample(colorTex, inputSampler, uv);
    let edgeStrength = textureSample(edgeTex, inputSampler, uv).r;

    // Apply edge color where edges are detected
    var finalColor = mix(celColor.rgb, uniforms.edgeColor, edgeStrength);

    // Mix with original based on mix amount
    finalColor = mix(origColor.rgb, finalColor, uniforms.mixAmount);

    return vec4f(finalColor, origColor.a);
}
`},celShadingColor:{glsl:`/*
 * Cel Shading - Color Pass
 * sRGB-aware color quantization with diffuse shading
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int levels;
uniform float gamma;
uniform bool antialias;
uniform vec3 lightDirection;
uniform float strength;

out vec4 fragColor;

const float MIN_GAMMA = 1e-3;

float srgb_to_linear_component(float value) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

float linear_to_srgb_component(float value) {
    if (value <= 0.0031308) {
        return value * 12.92;
    }
    return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

vec3 srgb_to_linear_rgb(vec3 rgb) {
    return vec3(
        srgb_to_linear_component(rgb.x),
        srgb_to_linear_component(rgb.y),
        srgb_to_linear_component(rgb.z)
    );
}

vec3 linear_to_srgb_rgb(vec3 rgb) {
    return vec3(
        linear_to_srgb_component(rgb.x),
        linear_to_srgb_component(rgb.y),
        linear_to_srgb_component(rgb.z)
    );
}

vec3 pow_vec3(vec3 value, float exponent) {
    return vec3(
        pow(value.x, exponent),
        pow(value.y, exponent),
        pow(value.z, exponent)
    );
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);

    vec4 origColor = texture(inputTex, uv);
    float lev = float(levels);

    // Apply diffuse shading based on light direction
    vec3 lightDir = normalize(lightDirection);
    float gradientShade = dot(normalize(vec3(uv - 0.5, 0.5)), lightDir);
    float diffuse = 0.5 + 0.5 * gradientShade;
    float shadeFactor = mix(1.0, 0.5 + 0.5 * diffuse, strength);
    vec3 shadedColor = origColor.rgb * shadeFactor;

    // sRGB-aware quantization
    float gamma_value = max(gamma, MIN_GAMMA);
    float inv_gamma = 1.0 / gamma_value;
    float inv_factor = 1.0 / lev;
    float half_step = inv_factor * 0.5;

    vec3 working_rgb = srgb_to_linear_rgb(shadedColor);
    working_rgb = pow_vec3(clamp(working_rgb, vec3(0.0), vec3(1.0)), gamma_value);

    // Posterize with optional edge smoothing
    vec3 scaled = working_rgb * lev + vec3(half_step);
    vec3 quantized_rgb;
    if (antialias) {
        vec3 f = fract(scaled);
        vec3 fw = fwidth(scaled);
        vec3 blend = smoothstep(0.5 - fw * 0.5, 0.5 + fw * 0.5, f);
        quantized_rgb = (floor(scaled) + blend) * inv_factor;
    } else {
        quantized_rgb = floor(scaled) * inv_factor;
    }
    quantized_rgb = pow_vec3(clamp(quantized_rgb, vec3(0.0), vec3(1.0)), inv_gamma);
    quantized_rgb = linear_to_srgb_rgb(quantized_rgb);

    fragColor = vec4(clamp(quantized_rgb, 0.0, 1.0), origColor.a);
}
`,wgsl:`/*
 * Cel Shading - Color Pass
 * sRGB-aware color quantization with diffuse shading
 */

struct Uniforms {
    lightDirection: vec3f,
    levels: i32,
    strength: f32,
    gamma: f32,
    antialias: i32,
    _pad: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const MIN_GAMMA: f32 = 1e-3;

fn srgb_to_linear_component(value: f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn linear_to_srgb_component(value: f32) -> f32 {
    if (value <= 0.0031308) {
        return value * 12.92;
    }
    return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

fn srgb_to_linear_rgb(rgb: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(
        srgb_to_linear_component(rgb.x),
        srgb_to_linear_component(rgb.y),
        srgb_to_linear_component(rgb.z),
    );
}

fn linear_to_srgb_rgb(rgb: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(
        linear_to_srgb_component(rgb.x),
        linear_to_srgb_component(rgb.y),
        linear_to_srgb_component(rgb.z),
    );
}

fn pow_vec3(value: vec3<f32>, exponent: f32) -> vec3<f32> {
    return vec3<f32>(
        pow(value.x, exponent),
        pow(value.y, exponent),
        pow(value.z, exponent),
    );
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;

    let origColor = textureSample(inputTex, inputSampler, uv);
    let lev = f32(uniforms.levels);

    // Apply diffuse shading based on light direction
    let lightDir = normalize(uniforms.lightDirection);
    let gradientShade = dot(normalize(vec3f(uv - 0.5, 0.5)), lightDir);
    let diffuse = 0.5 + 0.5 * gradientShade;
    let shadeFactor = mix(1.0, 0.5 + 0.5 * diffuse, uniforms.strength);
    let shadedColor = origColor.rgb * shadeFactor;

    // sRGB-aware quantization
    let gamma_value = max(uniforms.gamma, MIN_GAMMA);
    let inv_gamma = 1.0 / gamma_value;
    let inv_factor = 1.0 / lev;
    let half_step = inv_factor * 0.5;

    var working_rgb = srgb_to_linear_rgb(shadedColor);
    working_rgb = pow_vec3(clamp(working_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), gamma_value);

    // Posterize with optional edge smoothing
    let scaled = working_rgb * lev + vec3<f32>(half_step);
    var quantized_rgb: vec3<f32>;
    if (uniforms.antialias != 0) {
        let f = fract(scaled);
        let fw = fwidth(scaled);
        let blend = smoothstep(0.5 - fw * 0.5, 0.5 + fw * 0.5, f);
        quantized_rgb = (floor(scaled) + blend) * inv_factor;
    } else {
        quantized_rgb = floor(scaled) * inv_factor;
    }
    quantized_rgb = pow_vec3(clamp(quantized_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), inv_gamma);
    quantized_rgb = linear_to_srgb_rgb(quantized_rgb);

    return vec4f(clamp(quantized_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), origColor.a);
}
`},celShadingEdges:{glsl:`/*
 * Cel Shading - Edge Detection Pass
 * Sobel edge detection on quantized colors for outline generation
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D colorTex;
uniform float edgeWidth;
uniform float edgeThreshold;
uniform float renderScale;

out vec4 fragColor;

// Convert RGB to luminosity
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

int wrapCoord(int value, int size) {
    if (size <= 0) {
        return 0;
    }
    int wrapped = value % size;
    if (wrapped < 0) {
        wrapped += size;
    }
    return wrapped;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(colorTex, 0);
    if (texSize.x == 0 || texSize.y == 0) {
        fragColor = vec4(0.0);
        return;
    }

    ivec2 coord = ivec2(gl_FragCoord.xy);

    // Sample 3x3 neighborhood with thickness scaling
    int offset = max(1, int(edgeWidth * renderScale));
    float samples[9];
    int idx = 0;
    for (int ky = -1; ky <= 1; ++ky) {
        for (int kx = -1; kx <= 1; ++kx) {
            int sampleX = wrapCoord(coord.x + kx * offset, texSize.x);
            int sampleY = wrapCoord(coord.y + ky * offset, texSize.y);
            vec4 texel = texelFetch(colorTex, ivec2(sampleX, sampleY), 0);
            samples[idx] = getLuminosity(texel.rgb);
            idx++;
        }
    }

    // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
    float gx = -samples[0] + samples[2] - 2.0*samples[3] + 2.0*samples[5] - samples[6] + samples[8];

    // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
    float gy = -samples[0] - 2.0*samples[1] - samples[2] + samples[6] + 2.0*samples[7] + samples[8];

    // Calculate edge magnitude
    float magnitude = sqrt(gx * gx + gy * gy);

    // Apply threshold with smoothstep for anti-aliased edges
    float edge = smoothstep(edgeThreshold * 0.5, edgeThreshold * 1.5, magnitude);

    fragColor = vec4(edge, edge, edge, 1.0);
}
`,wgsl:`/*
 * Cel Shading - Edge Detection Pass
 * Sobel edge detection on quantized colors for outline generation
 */

struct Uniforms {
    edgeWidth: f32,
    edgeThreshold: f32,
    renderScale: f32,
    _pad: f32,
}

@group(0) @binding(0) var colorTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// Convert RGB to luminosity
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

fn wrapCoord(value: i32, size: i32) -> i32 {
    if (size <= 0) {
        return 0;
    }
    var wrapped = value % size;
    if (wrapped < 0) {
        wrapped = wrapped + size;
    }
    return wrapped;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(colorTex));
    if (texSize.x == 0 || texSize.y == 0) {
        return vec4f(0.0);
    }

    let coord = vec2<i32>(pos.xy);

    // Sample 3x3 neighborhood with thickness scaling. Mirrors GLSL: clamp to minimum 1 so
    // offset never collapses all 9 taps onto the same pixel (which silently turned the pass
    // into a visual passthrough whenever edgeWidth rounded to 0).
    let renderScale = select(uniforms.renderScale, 1.0, uniforms.renderScale <= 0.0);
    let offset = max(1, i32(uniforms.edgeWidth * renderScale));
    var samples: array<f32, 9>;
    var idx = 0;
    for (var ky = -1; ky <= 1; ky = ky + 1) {
        for (var kx = -1; kx <= 1; kx = kx + 1) {
            let sampleX = wrapCoord(coord.x + kx * offset, texSize.x);
            let sampleY = wrapCoord(coord.y + ky * offset, texSize.y);
            let texel = textureLoad(colorTex, vec2<i32>(sampleX, sampleY), 0);
            samples[idx] = getLuminosity(texel.rgb);
            idx = idx + 1;
        }
    }

    // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
    let gx = -samples[0] + samples[2] - 2.0*samples[3] + 2.0*samples[5] - samples[6] + samples[8];

    // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
    let gy = -samples[0] - 2.0*samples[1] - samples[2] + samples[6] + 2.0*samples[7] + samples[8];

    // Calculate edge magnitude
    let magnitude = sqrt(gx * gx + gy * gy);

    // Apply threshold with smoothstep for anti-aliased edges
    let edge = smoothstep(uniforms.edgeThreshold * 0.5, uniforms.edgeThreshold * 1.5, magnitude);

    return vec4f(edge, edge, edge, 1.0);
}
`}},i=`# celShading

Cartoon-style shading with posterization and outlines

## Description

Uses a three-pass approach:
1. **Color Pass**: Applies quantized diffuse lighting and posterizes colors into discrete bands
2. **Edge Pass**: Performs Sobel edge detection on the quantized colors for clean outlines
3. **Blend Pass**: Combines the cel-shaded colors with edge outlines and mixes with the original image

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| levels | int | 4 | 2-8 | Levels |
| gamma | float | 0.65 | 0.1-3 | Gamma curve before quantization |
| antialias | boolean | false | on/off | Smooth edges between color bands |
| edgeWidth | int | 1 | 0-5 | Width |
| edgeThreshold | float | 0.15 | 0.01-1 | Threshold |
| edgeColor | color | 0,0,0 | - | Color |
| lightDirection | vec3 | 0.5,0.5,1 | - | Light Direction |
| strength | float | 0 | 0-1 | Shading Strength |
| mix | float | 1 | 0-1 | Mix |

## Notes

- **Anime Style**: Use 3-4 levels with moderate edge width (~1.5)
- **Comic Book**: Use 2-3 levels with thick edges (3-4) and high shading strength
- **Adjust Edges**: Lower edgeThreshold to detect more edges, increase edgeWidth for bolder outlines
- **Subtle Effect**: Reduce mix to blend the cel-shaded look with the original image

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .celShading()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&i&&(n.help=i);var g="filter/celShading",f="filter",u="celShading",c=n;export{c as default,g as effectId,u as effectName,i as help,f as namespace};
