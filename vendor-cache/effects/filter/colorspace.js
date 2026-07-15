/* filter/colorspace */
var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new r({name:"Colorspace",namespace:"filter",func:"colorspace",tags:["color","util"],hidden:!0,deprecatedBy:"adjust",description:"Deprecated: use 'adjust' instead. Interpret RGB as HSV, OKLab, or OKLCH and convert",globals:{mode:{type:"int",default:0,uniform:"mode",choices:{hsv:0,oklab:1,oklch:2},ui:{label:"mode",control:"dropdown"}}},defaultProgram:`search filter, synth

noise(ridges: true)
.colorspace(mode: oklab)
.write(o0)`,passes:[{name:"render",program:"colorspace",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var t={colorspace:{glsl:`/*
 * Colorspace reinterpretation effect
 * Treats input RGB channels as HSV, OKLab, or OKLCH values and converts to RGB
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int mode; // 0: HSV, 1: OKLab, 2: OKLCH

out vec4 fragColor;

const float TAU = 6.28318530718;

// HSV to RGB
vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    float c = v * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

// OKLab to linear sRGB matrices
const mat3 fwdA = mat3(1.0, 1.0, 1.0,
                       0.3963377774, -0.1055613458, -0.0894841775,
                       0.2158037573, -0.0638541728, -1.2914855480);

const mat3 fwdB = mat3(4.0767245293, -1.2681437731, -0.0041119885,
                       -3.3072168827, 2.6093323231, -0.7034763098,
                       0.2307590544, -0.3411344290, 1.7068625689);

vec3 linear_srgb_from_oklab(vec3 c) {
    vec3 lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; ++i) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    if (mode == 0) {
        // HSV
        color.rgb = hsv2rgb(color.rgb);
    } else if (mode == 1) {
        // OKLab
        // Remap RGB to OKLab range and convert
        // magic values from py-noisemaker
        color.g = color.g * -0.509 + 0.276;
        color.b = color.b * -0.509 + 0.198;

        color.rgb = linear_srgb_from_oklab(color.rgb);
        color.rgb = linearToSrgb(color.rgb);
    } else {
        // OKLCH - interpret RGB as L, C, H
        float L = color.r;
        float C = color.g * 0.4; // Scale chroma to reasonable range
        float H = color.b * TAU; // Hue as angle
        
        // Convert LCH to Lab
        float a = C * cos(H);
        float b = C * sin(H);
        
        color.rgb = linear_srgb_from_oklab(vec3(L, a, b));
        color.rgb = linearToSrgb(color.rgb);
    }

    fragColor = color;
}
`,wgsl:`/*
 * Colorspace reinterpretation effect
 * Treats input RGB channels as HSV, OKLab, or OKLCH values and converts to RGB
 */

struct Uniforms {
    mode: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.28318530718;

// Floored modulo (matches GLSL mod behavior for negative values)
fn floorMod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

// HSV to RGB
fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(floorMod(h * 6.0, 2.0) - 1.0));
    let m = v - c;
    var rgb: vec3<f32>;
    if (h < 1.0/6.0) { rgb = vec3<f32>(c, x, 0.0); }
    else if (h < 2.0/6.0) { rgb = vec3<f32>(x, c, 0.0); }
    else if (h < 3.0/6.0) { rgb = vec3<f32>(0.0, c, x); }
    else if (h < 4.0/6.0) { rgb = vec3<f32>(0.0, x, c); }
    else if (h < 5.0/6.0) { rgb = vec3<f32>(x, 0.0, c); }
    else { rgb = vec3<f32>(c, 0.0, x); }
    return rgb + m;
}

// OKLab to linear sRGB matrices
const fwdA = mat3x3<f32>(
    vec3<f32>(1.0, 1.0, 1.0),
    vec3<f32>(0.3963377774, -0.1055613458, -0.0894841775),
    vec3<f32>(0.2158037573, -0.0638541728, -1.2914855480)
);

const fwdB = mat3x3<f32>(
    vec3<f32>(4.0767245293, -1.2681437731, -0.0041119885),
    vec3<f32>(-3.3072168827, 2.6093323231, -0.7034763098),
    vec3<f32>(0.2307590544, -0.3411344290, 1.7068625689)
);

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    if (uniforms.mode == 0) {
        // HSV
        color = vec4<f32>(hsv2rgb(color.rgb), color.a);
    } else if (uniforms.mode == 1) {
        // OKLab
        // Remap RGB to OKLab range and convert
        // magic values from py-noisemaker
        var lab = color.rgb;
        lab.g = lab.g * -0.509 + 0.276;
        lab.b = lab.b * -0.509 + 0.198;

        var rgb = linear_srgb_from_oklab(lab);
        rgb = linearToSrgb(rgb);
        color = vec4<f32>(rgb, color.a);
    } else {
        // OKLCH - interpret RGB as L, C, H
        let L = color.r;
        let C = color.g * 0.4; // Scale chroma to reasonable range
        let H = color.b * TAU; // Hue as angle
        
        // Convert LCH to Lab
        let a = C * cos(H);
        let b = C * sin(H);
        
        var rgb = linear_srgb_from_oklab(vec3<f32>(L, a, b));
        rgb = linearToSrgb(rgb);
        color = vec4<f32>(rgb, color.a);
    }

    return color;
}
`}},s=`# colorspace

Interpret RGB as HSV, OKLab, or OKLCH and convert

## Description

Treats the R, G, B channels as components of HSV, OKLab, or OKLCH and performs the conversion.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | hsv | hsv/oklab/oklch | Mode |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .colorspace()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(t).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(t))n.shaders[o]={...e}}n&&s&&(n.help=s);var f="filter/colorspace",u="filter",b="colorspace",p=n;export{p as default,f as effectId,b as effectName,s as help,u as namespace};
