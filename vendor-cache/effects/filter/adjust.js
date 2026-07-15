/* filter/adjust */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Adjust",namespace:"filter",func:"adjust",tags:["color"],description:"Colorspace, hue/saturation, brightness/contrast",defaultProgram:`search filter, synth

perlin(scale: 75, octaves: 2)
.adjust(mode: hsv, rotation: 120, hueRange: 40)
.write(o0)`,openCategories:["colorspace","hue / saturation","brightness / contrast"],globals:{mode:{type:"int",default:0,uniform:"mode",choices:{rgb:0,hsv:1,oklab:2,oklch:3},ui:{label:"mode",control:"dropdown",category:"colorspace"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"hue rotation",control:"slider",category:"hue / saturation"}},hueRange:{type:"float",default:100,uniform:"hueRange",min:0,max:200,ui:{label:"hue range",control:"slider",category:"hue / saturation"}},saturation:{type:"float",default:1,uniform:"saturation",min:0,max:4,ui:{label:"saturation",control:"slider",category:"hue / saturation"}},brightness:{type:"float",default:1,uniform:"brightness",min:0,max:10,randChance:0,ui:{label:"brightness",control:"slider",category:"brightness / contrast"}},contrast:{type:"float",default:.5,uniform:"contrast",min:0,max:1,randChance:0,ui:{label:"contrast",control:"slider",category:"brightness / contrast"}}},passes:[{name:"render",program:"adjust",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={adjust:{glsl:`/*
 * Combined color adjustment effect
 * Colorspace reinterpretation + hue/saturation + brightness/contrast
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int mode;        // 0: off, 1: HSV, 2: OKLab, 3: OKLCH
uniform float rotation;
uniform float hueRange;
uniform float saturation;
uniform float brightness;
uniform float contrast;

out vec4 fragColor;

const float TAU = 6.28318530718;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// --- Colorspace functions ---

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

vec3 rgb2hsv(vec3 rgb) {
    float r = rgb.r, g = rgb.g, b = rgb.b;
    float maxC = max(r, max(g, b));
    float minC = min(r, min(g, b));
    float delta = maxC - minC;

    float h = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = mod((g - b) / delta, 6.0) / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    float s = (maxC == 0.0) ? 0.0 : delta / maxC;
    return vec3(h, s, maxC);
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

    // --- Colorspace reinterpretation ---
    if (mode == 1) {
        // HSV
        color.rgb = hsv2rgb(color.rgb);
    } else if (mode == 2) {
        // OKLab
        color.g = color.g * -0.509 + 0.276;
        color.b = color.b * -0.509 + 0.198;
        color.rgb = linear_srgb_from_oklab(color.rgb);
        color.rgb = linearToSrgb(color.rgb);
    } else if (mode == 3) {
        // OKLCH - interpret RGB as L, C, H
        float L = color.r;
        float C = color.g * 0.4;
        float H = color.b * TAU;
        float a = C * cos(H);
        float b = C * sin(H);
        color.rgb = linear_srgb_from_oklab(vec3(L, a, b));
        color.rgb = linearToSrgb(color.rgb);
    }

    // --- Hue / Saturation ---
    vec3 hsv = rgb2hsv(color.rgb);
    hsv.x = fract(hsv.x * map(hueRange, 0.0, 200.0, 0.0, 2.0) + (rotation / 360.0));
    hsv.y *= saturation;
    color.rgb = hsv2rgb(hsv);

    // --- Brightness / Contrast ---
    color.rgb *= brightness;
    float contrastFactor = contrast * 2.0;
    color.rgb = (color.rgb - 0.5) * contrastFactor + 0.5;

    fragColor = color;
}
`,wgsl:`/*
 * Combined color adjustment effect
 * Colorspace reinterpretation + hue/saturation + brightness/contrast
 */

struct Uniforms {
    mode: i32,
    rotation: f32,
    hueRange: f32,
    saturation: f32,
    brightness: f32,
    contrast: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.28318530718;

fn mapVal(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn floorMod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

// --- Colorspace functions ---

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

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.r; let g = rgb.g; let b = rgb.b;
    let maxC = max(r, max(g, b));
    let minC = min(r, min(g, b));
    let delta = maxC - minC;

    var h = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = floorMod((g - b) / delta, 6.0) / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    var s = 0.0;
    if (maxC != 0.0) { s = delta / maxC; }
    return vec3<f32>(h, s, maxC);
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

    // --- Colorspace reinterpretation ---
    if (uniforms.mode == 1) {
        // HSV
        color = vec4<f32>(hsv2rgb(color.rgb), color.a);
    } else if (uniforms.mode == 2) {
        // OKLab
        var lab = color.rgb;
        lab.g = lab.g * -0.509 + 0.276;
        lab.b = lab.b * -0.509 + 0.198;
        var rgb = linear_srgb_from_oklab(lab);
        rgb = linearToSrgb(rgb);
        color = vec4<f32>(rgb, color.a);
    } else if (uniforms.mode == 3) {
        // OKLCH - interpret RGB as L, C, H
        let L = color.r;
        let C = color.g * 0.4;
        let H = color.b * TAU;
        let a = C * cos(H);
        let b = C * sin(H);
        var rgb = linear_srgb_from_oklab(vec3<f32>(L, a, b));
        rgb = linearToSrgb(rgb);
        color = vec4<f32>(rgb, color.a);
    }

    // --- Hue / Saturation ---
    var hsv = rgb2hsv(color.rgb);
    hsv.x = fract(hsv.x * mapVal(uniforms.hueRange, 0.0, 200.0, 0.0, 2.0) + (uniforms.rotation / 360.0));
    hsv.y = hsv.y * uniforms.saturation;
    color = vec4<f32>(hsv2rgb(hsv), color.a);

    // --- Brightness / Contrast ---
    color = vec4<f32>(color.rgb * uniforms.brightness, color.a);
    let contrastFactor = uniforms.contrast * 2.0;
    color = vec4<f32>((color.rgb - 0.5) * contrastFactor + 0.5, color.a);

    return color;
}
`}},a=`# adjust

Combined color adjustment \u2014 colorspace reinterpretation, hue/saturation, and brightness/contrast in one pass

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | rgb | hsv/oklab/oklch/rgb | Colorspace mode |
| rotation | float | 0 | -180\u2013180 | Hue rotation (degrees) |
| hueRange | float | 100 | 0\u2013200 | Hue range |
| saturation | float | 1 | 0\u20134 | Saturation multiplier |
| brightness | float | 1 | 0\u201310 | Brightness multiplier |
| contrast | float | 0.5 | 0\u20131 | Contrast |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .adjust()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[r,n]of Object.entries(o))e.shaders[r]={...n}}e&&a&&(e.help=a);var c="filter/adjust",u="filter",b="adjust",g=e;export{g as default,c as effectId,b as effectName,a as help,u as namespace};
