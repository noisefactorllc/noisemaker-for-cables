/* classicNoisedeck/refract */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new o({name:"Refract",namespace:"classicNoisedeck",func:"refract",tags:["distort"],description:"Refraction distortion",globals:{blendMode:{type:"int",default:10,uniform:"blendMode",choices:{add:0,colorBurn:2,colorDodge:3,darken:4,difference:5,exclusion:6,glow:7,hardLight:8,lighten:9,mix:10,multiply:11,negation:12,overlay:13,phoenix:14,reflect:15,screen:16,softLight:17,subtract:18},ui:{label:"blend mode",control:"dropdown"}},mix:{type:"float",default:50,uniform:"mixAmt",min:0,max:100,ui:{label:"mix",control:"slider"}},mode:{type:"int",default:0,uniform:"mode",choices:{refract:0,reflect:1},ui:{label:"mode",control:"dropdown"}},amount:{type:"float",default:50,uniform:"amount",min:0,max:100,ui:{label:"amount",control:"slider"}},direction:{type:"float",default:0,uniform:"direction",min:0,max:360,ui:{label:"refract dir",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{clamp:2,mirror:0,repeat:1},ui:{label:"wrap",control:"dropdown"}}},paramAliases:{refractDir:"direction",mixAmt:"mix"},passes:[{name:"render",program:"refract",inputs:{inputTex:"inputTex"},uniforms:{mixAmt:"mix"},outputs:{fragColor:"outputTex"}}]});var l={refract:{glsl:`#version 300 es

/*
 * Refract shader.
 * Applies noise-based UV perturbations to refract the input feed.
 * Scale and strength controls are normalized relative to resolution to prevent tearing.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int mode;
uniform float amount;
uniform float direction;
uniform int blendMode;
uniform float mixAmt;
uniform int wrap;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718


float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 convolve(vec2 uv, float kernel[9], bool divide) {
    // Convert global UV to local UV for sampling inputTex
    vec2 localUV = (uv * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    
    vec2 steps = 1.0 / vec2(textureSize(inputTex, 0)); // 1.0 / width = 1 texel
    vec2 offset[9];
    offset[0] = vec2(-steps.x, -steps.y);     // top left
    offset[1] = vec2(0.0, -steps.y);         // top middle
    offset[2] = vec2(steps.x, -steps.y);     // top right
    offset[3] = vec2(-steps.x, 0.0);         // middle left
    offset[4] = vec2(0.0, 0.0);             //middle
    offset[5] = vec2(steps.x, 0.0);            //middle right
    offset[6] = vec2(-steps.x, steps.y);     //bottom left
    offset[7] = vec2(0.0, steps.y);         //bottom middle
    offset[8] = vec2(steps.x, steps.y);     //bottom right

    float kernelWeight = 0.0;
    vec3 conv = vec3(0.0);

    for(int i = 0; i < 9; i++){
        //sample a 3x3 grid of pixels
        vec3 color = texture(inputTex, localUV + offset[i] * floor(map(amount, 0.0, 100.0, 0.0, 20.0))).rgb;

        // multiply the color by the kernel value and add it to our conv total
        conv += color * kernel[i];

        // keep a running tally of the kernel weights
        kernelWeight += kernel[i];
    }

    // normalize the convolution by dividing by the kernel weight
    if (divide) {
        conv.rgb /= kernelWeight;
    }

    return clamp(conv.rgb, 0.0, 1.0);
}

float desaturate(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

vec3 derivX(vec3 color, vec2 uv, bool divide) {
    // use: desaturate, get deriv_x and deriv_y and calculate dist between, then multiply by color
    vec3 dcolor = vec3(desaturate(color));

    float deriv_x[9];
    deriv_x[0] = 0.0; deriv_x[1] = 0.0; deriv_x[2] = 0.0;
    deriv_x[3] = 0.0; deriv_x[4] = 1.0; deriv_x[5] = -1.0;
    deriv_x[6] = 0.0; deriv_x[7] = 0.0; deriv_x[8] = 0.0;

    vec3 s1 = convolve(uv, deriv_x, divide);

    return s1;
}

vec3 derivY(vec3 color, vec2 uv, bool divide) {
    // use: desaturate, get deriv_x and deriv_y and calculate dist between, then multiply by color
    vec3 dcolor = vec3(desaturate(color));

    float deriv_y[9];
    deriv_y[0] = 0.0; deriv_y[1] = 0.0; deriv_y[2] = 0.0;
    deriv_y[3] = 0.0; deriv_y[4] = 1.0; deriv_y[5] = 0.0;
    deriv_y[6] = 0.0; deriv_y[7] = -1.0; deriv_y[8] = 0.0;

    vec3 s2 = convolve(uv, deriv_y, divide);
    return s2;
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

float blendOverlay(float a, float b) {
    return a < 0.5 ? (2.0 * a * b) : (1.0 - 2.0 * (1.0 - a) * (1.0 - b));
}

float blendSoftLight(float base, float blend) {
    return (blend<0.5)?(2.0*base*blend+base*base*(1.0-2.0*blend)):(sqrt(base)*(2.0*blend-1.0)+2.0*base*(1.0-blend));
}

vec3 blend(vec4 color1, vec4 color2) {
    // if only one noise is enabled, return that noise

    vec4 color;
    vec4 middle;

    float amt = map(mixAmt, 0.0, 100.0, 0.0, 1.0);

    if (blendMode == 0) {
        // add
        middle = min(color1 + color2, 1.0);
    } else if (blendMode == 2) {
        // color burn
        middle = (color2 == vec4(0.0)) ? color2 : max((1.0 - ((1.0 - color1) / color2)),  vec4(0.0));
    } else if (blendMode == 3) {
        // color dodge
        middle = (color2 == vec4(1.0)) ? color2 : min(color1 / (1.0 - color2), vec4(1.0));
    } else if (blendMode == 4) {
        // darken
        middle = min(color1, color2);
    } else if (blendMode == 5) {
        // difference
        middle = abs(color1 - color2);
    } else if (blendMode == 6) {
        // exclusion
        middle = color1 + color2 - 2.0 * color1 * color2;
    } else if (blendMode == 7) {
        // glow
        middle = (color2 == vec4(1.0)) ? color2 : min(color1 * color1 / (1.0 - color2), vec4(1.0));
    } else if (blendMode == 8) {
        // hard light
        middle = vec4(blendOverlay(color2.r, color1.r), blendOverlay(color2.g, color1.g), blendOverlay(color2.b, color1.b), mix(color1.a, color2.a, 0.5));
    } else if (blendMode == 9) {
        // lighten
        middle = max(color1, color2);
    } else if (blendMode == 10) {
        // mix
        middle = mix(color1, color2, 0.5);
    } else if (blendMode == 11) {
        // multiply
        middle = color1 * color2;
    } else if (blendMode == 12) {
        // negation
        middle = vec4(1.0) - abs(vec4(1.0) - color1 - color2);
    } else if (blendMode == 13) {
        // overlay
        middle = vec4(blendOverlay(color1.r, color2.r), blendOverlay(color1.g, color2.g), blendOverlay(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (blendMode == 14) {
        // phoenix
        middle = min(color1, color2) - max(color1, color2) + vec4(1.0);
    } else if (blendMode == 15) {
        // reflect
        middle = (color1 == vec4(1.0)) ? color1 : min(color2 * color2 / (1.0 - color1), vec4(1.0));
    } else if (blendMode == 16) {
        // screen
        middle = 1.0 - ((1.0 - color1) * (1.0 - color2));
    } else if (blendMode == 17) {
        // soft light
        middle = vec4(blendSoftLight(color1.r, color2.r), blendSoftLight(color1.g, color2.g), blendSoftLight(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (blendMode == 18) {
        // subtract
        middle = max(color1 + color2 - 1.0, 0.0);
    }

    if (amt == 0.5) {
        color = middle;
    } else if (amt < 0.5) {
        amt = map(amt, 0.0, 0.5, 0.0, 1.0);
        color = mix(color1, middle, amt);
    } else if (amt > 0.5) {
        amt = map(amt, 0.5, 1.0, 0.0, 1.0);
        color = mix(middle, color2, amt);
    }

    return color.rgb;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 color = vec4(0.0);

    // Convert global UV to local UV for sampling inputTex
    vec2 localUV = (uv * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    vec4 inputColor = texture(inputTex, localUV);
    float brightness = desaturate(inputColor.rgb) + direction / 360.0;

    // In tiling mode, clamp displacement to overlap budget
    float displacement = amount * 0.01;
    if (fullResolution.x > resolution.x || fullResolution.y > resolution.y) {
        float maxDisplacement = 256.0 / max(fullResolution.x, fullResolution.y);
        displacement = min(displacement, maxDisplacement);
    }

    if (mode == 0) {
        uv.x += cos(brightness * TAU) * displacement;
        uv.y += sin(brightness * TAU) * displacement;
    } else if (mode == 1) {
        uv.y += desaturate(derivX(inputColor.rgb, uv, false)) * displacement;
        uv.x += desaturate(derivY(inputColor.rgb, uv, false)) * displacement;
    }

    if (wrap == 0) {
        // mirror (default)
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = mod(uv, 1.0);
    } else if (wrap == 2) {
        // clamp
        uv = clamp(uv, 0.0, 1.0);
    }

    // Convert warped global UV to local UV for sampling
    vec2 warpedLocalUV = (uv * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    color = texture(inputTex, warpedLocalUV);

    color.rgb = blend(inputColor, color);

    fragColor = color;
}`,wgsl:`/*
 * Refract shader (WGSL fragment version).
 * Applies noise-based UV perturbations to refract the input feed.
 * Scale and strength controls are normalized relative to resolution to prevent tearing.
 */

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var<uniform> mode : i32;
@group(0) @binding(3) var<uniform> amount : f32;
@group(0) @binding(4) var<uniform> direction : f32;
@group(0) @binding(5) var<uniform> blendMode : i32;
@group(0) @binding(6) var<uniform> mixAmt : f32;
@group(0) @binding(7) var<uniform> wrap : i32;

fn map_range(value : f32, inMin : f32, inMax : f32, outMin : f32, outMax : f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn desaturate(color : vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn convolve_kernel(uv : vec2<f32>, kernel : array<f32, 9>, divide : bool) -> vec3<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let steps = 1.0 / dims;
    var offsets : array<vec2<f32>, 9>;
    offsets[0] = vec2<f32>(-steps.x, -steps.y);
    offsets[1] = vec2<f32>(0.0, -steps.y);
    offsets[2] = vec2<f32>(steps.x, -steps.y);
    offsets[3] = vec2<f32>(-steps.x, 0.0);
    offsets[4] = vec2<f32>(0.0, 0.0);
    offsets[5] = vec2<f32>(steps.x, 0.0);
    offsets[6] = vec2<f32>(-steps.x, steps.y);
    offsets[7] = vec2<f32>(0.0, steps.y);
    offsets[8] = vec2<f32>(steps.x, steps.y);

    var kernelWeight : f32 = 0.0;
    var conv : vec3<f32> = vec3<f32>(0.0);
    let scale = floor(map_range(amount, 0.0, 100.0, 0.0, 20.0));

    for (var i : i32 = 0; i < 9; i = i + 1) {
        let color = textureSample(inputTex, samp, uv + offsets[i] * scale).rgb;
        conv = conv + color * kernel[i];
        kernelWeight = kernelWeight + kernel[i];
    }

    if (divide && kernelWeight != 0.0) {
        conv = conv / kernelWeight;
    }

    return clamp(conv, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn derivX(uv : vec2<f32>, divide : bool) -> vec3<f32> {
    var kernel : array<f32, 9>;
    kernel[0] = 0.0; kernel[1] = 0.0; kernel[2] = 0.0;
    kernel[3] = 0.0; kernel[4] = 1.0; kernel[5] = -1.0;
    kernel[6] = 0.0; kernel[7] = 0.0; kernel[8] = 0.0;
    return convolve_kernel(uv, kernel, divide);
}

fn derivY(uv : vec2<f32>, divide : bool) -> vec3<f32> {
    var kernel : array<f32, 9>;
    kernel[0] = 0.0; kernel[1] = 0.0; kernel[2] = 0.0;
    kernel[3] = 0.0; kernel[4] = 1.0; kernel[5] = 0.0;
    kernel[6] = 0.0; kernel[7] = -1.0; kernel[8] = 0.0;
    return convolve_kernel(uv, kernel, divide);
}

fn blendOverlay(a : f32, b : f32) -> f32 {
    if (a < 0.5) {
        return 2.0 * a * b;
    }
    return 1.0 - 2.0 * (1.0 - a) * (1.0 - b);
}

fn blendSoftLight(base : f32, blend : f32) -> f32 {
    if (blend < 0.5) {
        return 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    }
    return sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
}

fn vec4_eq(a : vec4<f32>, b : vec4<f32>) -> bool {
    return all(a == b);
}

fn blend_colors(color1 : vec4<f32>, color2 : vec4<f32>) -> vec3<f32> {
    var color : vec4<f32>;
    var middle : vec4<f32>;
    var amt = map_range(mixAmt, 0.0, 100.0, 0.0, 1.0);

    if (blendMode == 0) {
        // add
        middle = min(color1 + color2, vec4<f32>(1.0));
    } else if (blendMode == 2) {
        // color burn
        if (vec4_eq(color2, vec4<f32>(0.0))) {
            middle = color2;
        } else {
            middle = max((1.0 - ((1.0 - color1) / color2)), vec4<f32>(0.0));
        }
    } else if (blendMode == 3) {
        // color dodge
        if (vec4_eq(color2, vec4<f32>(1.0))) {
            middle = color2;
        } else {
            middle = min(color1 / (1.0 - color2), vec4<f32>(1.0));
        }
    } else if (blendMode == 4) {
        // darken
        middle = min(color1, color2);
    } else if (blendMode == 5) {
        // difference
        middle = abs(color1 - color2);
    } else if (blendMode == 6) {
        // exclusion
        middle = color1 + color2 - 2.0 * color1 * color2;
    } else if (blendMode == 7) {
        // glow
        if (vec4_eq(color2, vec4<f32>(1.0))) {
            middle = color2;
        } else {
            middle = min(color1 * color1 / (1.0 - color2), vec4<f32>(1.0));
        }
    } else if (blendMode == 8) {
        // hard light
        middle = vec4<f32>(
            blendOverlay(color2.r, color1.r),
            blendOverlay(color2.g, color1.g),
            blendOverlay(color2.b, color1.b),
            mix(color1.a, color2.a, 0.5)
        );
    } else if (blendMode == 9) {
        // lighten
        middle = max(color1, color2);
    } else if (blendMode == 10) {
        // mix
        middle = mix(color1, color2, 0.5);
    } else if (blendMode == 11) {
        // multiply
        middle = color1 * color2;
    } else if (blendMode == 12) {
        // negation
        middle = vec4<f32>(1.0) - abs(vec4<f32>(1.0) - color1 - color2);
    } else if (blendMode == 13) {
        // overlay
        middle = vec4<f32>(
            blendOverlay(color1.r, color2.r),
            blendOverlay(color1.g, color2.g),
            blendOverlay(color1.b, color2.b),
            mix(color1.a, color2.a, 0.5)
        );
    } else if (blendMode == 14) {
        // phoenix
        middle = min(color1, color2) - max(color1, color2) + vec4<f32>(1.0);
    } else if (blendMode == 15) {
        // reflect
        if (vec4_eq(color1, vec4<f32>(1.0))) {
            middle = color1;
        } else {
            middle = min(color2 * color2 / (1.0 - color1), vec4<f32>(1.0));
        }
    } else if (blendMode == 16) {
        // screen
        middle = 1.0 - ((1.0 - color1) * (1.0 - color2));
    } else if (blendMode == 17) {
        // soft light
        middle = vec4<f32>(
            blendSoftLight(color1.r, color2.r),
            blendSoftLight(color1.g, color2.g),
            blendSoftLight(color1.b, color2.b),
            mix(color1.a, color2.a, 0.5)
        );
    } else {
        // subtract (blendMode == 18)
        middle = max(color1 + color2 - 1.0, vec4<f32>(0.0));
    }

    if (amt == 0.5) {
        color = middle;
    } else if (amt < 0.5) {
        amt = map_range(amt, 0.0, 0.5, 0.0, 1.0);
        color = mix(color1, middle, amt);
    } else {
        amt = map_range(amt, 0.5, 1.0, 0.0, 1.0);
        color = mix(middle, color2, amt);
    }

    return color.rgb;
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    var uv = position.xy / dims;

    var color = vec4<f32>(0.0);
    let inputColor = textureSample(inputTex, samp, uv);
    let brightness = desaturate(inputColor.rgb) + direction / 360.0;

    if (mode == 0) {
        uv.x = uv.x + cos(brightness * TAU) * amount * 0.01;
        uv.y = uv.y + sin(brightness * TAU) * amount * 0.01;
    } else if (mode == 1) {
        uv.y = uv.y + desaturate(derivX(uv, false)) * amount * 0.01;
        uv.x = uv.x + desaturate(derivY(uv, false)) * amount * 0.01;
    }

    if (wrap == 0) {
        // mirror (default)
        uv = abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = fract(uv);
    } else if (wrap == 2) {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    color = textureSample(inputTex, samp, uv);
    color = vec4<f32>(blend_colors(inputColor, color), color.a);

    return color;
}
`}},t=`# refract

Refraction distortion

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| blendMode | int | mix | add/colorBurn/colorDodge/darken/difference/exclusion/glow/hardLight/lighten/mix/multiply/negation/overlay/phoenix/reflect/screen/softLight/subtract | Blend |
| mix | float | 50 | 0-100 | Mix |
| mode | int | refract | refract/reflect | Mode |
| amount | float | 50 | 0-100 | Amount |
| direction | float | 0 | 0-360 | Refract dir |
| wrap | int | mirror | clamp/mirror/repeat | Wrap |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .refract()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(l).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(l))n.shaders[r]={...e}}n&&t&&(n.help=t);var s="classicNoisedeck/refract",f="classicNoisedeck",u="refract",m=n;export{m as default,s as effectId,u as effectName,t as help,f as namespace};
