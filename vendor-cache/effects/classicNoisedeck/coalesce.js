/* classicNoisedeck/coalesce */
var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new r({name:"Coalesce",namespace:"classicNoisedeck",func:"coalesce",tags:["blend","distort"],description:"Coalescing blend effect",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},blendMode:{type:"int",default:10,uniform:"blendMode",choices:{add:0,alpha:1,brightnessAB:1004,brightnessBA:1005,cloak:100,colorBurn:2,colorDodge:3,darken:4,difference:5,exclusion:6,glow:7,hardLight:8,hueAB:1e3,hueBA:1001,lighten:9,mix:10,multiply:11,negation:12,overlay:13,phoenix:14,reflect:15,saturationAB:1002,saturationBA:1003,screen:16,softLight:17,subtract:18},ui:{label:"blend mode",control:"dropdown"}},mix:{type:"float",default:0,uniform:"mixAmt",min:-100,max:100,ui:{label:"mix",control:"slider"}},refractAAmt:{type:"float",default:0,uniform:"refractAAmt",min:0,max:100,ui:{label:"refract a \u2192 b",control:"slider",category:"refract"}},refractBAmt:{type:"float",default:0,uniform:"refractBAmt",min:0,max:100,ui:{label:"refract b \u2192 a",control:"slider",category:"refract"}},refractADir:{type:"float",default:0,uniform:"refractADir",min:-180,max:180,ui:{label:"refract dir a",control:"slider",category:"refract"}},refractBDir:{type:"float",default:0,uniform:"refractBDir",min:-180,max:180,ui:{label:"refract dir b",control:"slider",category:"refract"}}},paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"coalesce",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{mixAmt:"mix"},outputs:{fragColor:"outputTex"}}]});var t={coalesce:{glsl:`#version 300 es

/*
 * Coalesce compositing shader.
 * Provides blend modes plus a refractive cloaking mix that cross-samples both synth inputs.
 * Mix parameters are remapped from UI ranges so the refractive offsets stay within texture bounds during layering.
 */


precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int blendMode;
uniform float mixAmt;
uniform float refractAAmt;
uniform float refractBAmt;
uniform float refractADir;
uniform float refractBDir;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718


float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float blendOverlay(float a, float b) {
    return a < 0.5 ? (2.0 * a * b) : (1.0 - 2.0 * (1.0 - a) * (1.0 - b));
}

float blendSoftLight(float base, float blend) {
    return (blend<0.5)?(2.0*base*blend+base*base*(1.0-2.0*blend)):(sqrt(base)*(2.0*blend-1.0)+2.0*base*(1.0-blend));
}

vec4 cloak(vec2 st) {
    float m = map(mixAmt, -100.0, 100.0, 0.0, 1.0);
    float ra = map(refractAAmt, 0.0, 100.0, 0.0, 0.125);
    float rb = map(refractBAmt, 0.0, 100.0, 0.0, 0.125);

    vec4 leftColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 rightColor = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    // When the mixer is all the way to the left, we see left refracted by right
    vec2 leftUV = vec2(st);
    float rightLen = length(rightColor.rgb);
    leftUV.x += cos(rightLen * TAU) * ra;
    leftUV.y += sin(rightLen * TAU) * ra;

    vec2 leftLocalUV = (leftUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    vec4 leftRefracted = texture(inputTex, fract(leftLocalUV));

    // When the mixer is all the way to the right, we see right refracted by left
    vec2 rightUV = vec2(st);
    float leftLen = length(leftColor.rgb);
    rightUV.x += cos(leftLen * TAU) * rb;
    rightUV.y += sin(leftLen * TAU) * rb;

    vec2 rightLocalUV = (rightUV * fullResolution - tileOffset) / vec2(textureSize(tex, 0));
    vec4 rightRefracted = texture(tex, fract(rightLocalUV));

    // As the mixer approaches midpoint, mix the two refracted outputs using the same
    // logic as the "reflect" mode in coalesce.
    vec4 leftReflected = min(rightRefracted * rightColor / (1.0 - leftRefracted * leftColor), vec4(1.0));
    vec4 rightReflected = min(leftRefracted * leftColor / (1.0 - rightRefracted * rightColor), vec4(1.0));

    vec4 left = vec4(1.0);
    vec4 right = vec4(1.0);
    if (mixAmt < 0.0) {
        left = mix(leftRefracted, leftReflected, map(mixAmt, -100.0, 0.0, 0.0, 1.0));
        right = rightReflected;
    } else {
        left = leftReflected;
        right = mix(rightRefracted, rightRefracted, map(mixAmt, 0.0, 100.0, 0.0, 1.0));
    }

    return mix(left, right, m);
}

vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    
    float c = v * s; // Chroma
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;

    vec3 rgb;

    if (0.0 <= h && h < 1.0/6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (1.0/6.0 <= h && h < 2.0/6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (2.0/6.0 <= h && h < 3.0/6.0) {
        rgb = vec3(0.0, c, x);
    } else if (3.0/6.0 <= h && h < 4.0/6.0) {
        rgb = vec3(0.0, x, c);
    } else if (4.0/6.0 <= h && h < 5.0/6.0) {
        rgb = vec3(x, 0.0, c);
    } else if (5.0/6.0 <= h && h < 1.0) {
        rgb = vec3(c, 0.0, x);
    } else {
        rgb = vec3(0.0, 0.0, 0.0);
    }

    return rgb + vec3(m, m, m);
}

vec3 rgb2hsv(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    
    float max = max(r, max(g, b));
    float min = min(r, min(g, b));
    float delta = max - min;

    float h = 0.0;
    if (delta != 0.0) {
        if (max == r) {
            h = mod((g - b) / delta, 6.0) / 6.0;
        } else if (max == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (max == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    
    float s = (max == 0.0) ? 0.0 : delta / max;
    float v = max;

    return vec3(h, s, v);
}

vec3 blend(vec4 color1, vec4 color2, int mode, float factor) {
    // if only one noise is enabled, return that noise

    vec4 color;
    vec4 middle;

    float amt = map(mixAmt, -100.0, 100.0, 0.0, 1.0);

    vec4 a = vec4(1.0);
    vec4 b = vec4(1.0);
    if (mode >= 1000) {  // HSV blend modes
        a.rgb = rgb2hsv(color1.rgb);
        b.rgb = rgb2hsv(color2.rgb);
    }

    if (mode == 0) {
        // add
        middle = min(color1 + color2, 1.0);
    } else if (mode == 1) {
        // alpha
        if (mixAmt < 0.0) {
            return mix(color1,
                       color2 * vec4(1.0 - color1.a) + color1 * vec4(color1.a),
                       map(mixAmt, -100.0, 0.0, 0.0, 1.0)).rgb;
        } else {
            return mix(color1 * vec4(1.0 - color2.a) + color2 * vec4(color2.a),
                       color2,
                       map(mixAmt, 0.0, 100.0, 0.0, 1.0)).rgb;
        }
    } else if (mode == 2) {
        // color burn
        middle = (color2 == vec4(0.0)) ? color2 : max((1.0 - ((1.0 - color1) / color2)),  vec4(0.0));
    } else if (mode == 3) {
        // color dodge
        middle = (color2 == vec4(1.0)) ? color2 : min(color1 / (1.0 - color2), vec4(1.0));
    } else if (mode == 4) {
        // darken
        middle = min(color1, color2);
    } else if (mode == 5) {
        // difference
        middle = abs(color1 - color2);
    } else if (mode == 6) {
        // exclusion
        middle = color1 + color2 - 2.0 * color1 * color2;  
    } else if (mode == 7) {
        // glow
        middle = (color2 == vec4(1.0)) ? color2 : min(color1 * color1 / (1.0 - color2), vec4(1.0));
    } else if (mode == 8) {
        // hard light
        middle = vec4(blendOverlay(color2.r, color1.r), blendOverlay(color2.g, color1.g), blendOverlay(color2.b, color1.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 9) {
        // lighten
        middle = max(color1, color2);
    } else if (mode == 10) {
        // mix
        middle = mix(color1, color2, 0.5);
    } else if (mode == 11) {
        // multiply
        middle = color1 * color2;
    } else if (mode == 12) {
        // negation
        middle = vec4(1.0) - abs(vec4(1.0) - color1 - color2);
    } else if (mode == 13) {
        // overlay
        middle = vec4(blendOverlay(color1.r, color2.r), blendOverlay(color1.g, color2.g), blendOverlay(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 14) {
        // phoenix
        middle = min(color1, color2) - max(color1, color2) + vec4(1.0);
    } else if (mode == 15) {
        // reflect
        middle = (color1 == vec4(1.0)) ? color1 : min(color2 * color2 / (1.0 - color1), vec4(1.0));
    } else if (mode == 16) {
        // screen
        middle = 1.0 - ((1.0 - color1) * (1.0 - color2));
    } else if (mode == 17) {
        // soft light
        middle = vec4(blendSoftLight(color1.r, color2.r), blendSoftLight(color1.g, color2.g), blendSoftLight(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 18) {
        // subtract
        middle = max(color1 + color2 - 1.0, 0.0);
    } else if (mode == 1000) {
        // hue a->b
        middle.rgb = hsv2rgb(vec3(b.r, a.g, a.b));
    } else if (mode == 1001) {
        // hue b->a
        middle.rgb = hsv2rgb(vec3(a.r, b.g, b.b));
    } else if (mode == 1002) {
        // saturation a->b
        middle.rgb = hsv2rgb(vec3(a.r, b.g, a.b));
    } else if (mode == 1003) {
        // saturation b->a
        middle.rgb = hsv2rgb(vec3(b.r, a.g, b.b));
    } else if (mode == 1004) {
        // brightness a->b
        middle.rgb = hsv2rgb(vec3(a.r, a.g, b.b));
    } else if (mode == 1005) {
        // brightness b->a
        middle.rgb = hsv2rgb(vec3(b.r, b.g, a.b));
    }

    if (mode >= 1000) {  // Make sure HSV blend modes have alpha set
        middle.a = mix(color1.a, color2.a, 0.5);
    }

    if (factor == 0.5) {
        color = middle;
    } else if (factor < 0.5) {
        factor = map(amt, 0.0, 0.5, 0.0, 1.0);
        color = mix(color1, middle, factor);
    } else if (factor > 0.5) {
        factor = map(amt, 0.5, 1.0, 0.0, 1.0);
        color = mix(middle, color2, factor);
    }

    return color.rgb;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution;

    if (blendMode == 100) {
        color = cloak(st);
    } else {
        float ra = map(refractAAmt, 0.0, 100.0, 0.0, 0.125);
        float rb = map(refractBAmt, 0.0, 100.0, 0.0, 0.125);

        vec4 leftColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
        vec4 rightColor = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

        // refract a->b
        vec2 leftUV = vec2(st);
        float rightLen = length(rightColor.rgb) + refractADir / 360.0;
        leftUV.x += cos(rightLen * TAU) * ra;
        leftUV.y += sin(rightLen * TAU) * ra;
        
        vec2 leftLocalUV = (leftUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
        vec4 color1 = texture(inputTex, fract(leftLocalUV));

        // refract b->a
        vec2 rightUV = vec2(st);
        float leftLen = length(leftColor.rgb) + refractBDir / 360.0;
        rightUV.x += cos(leftLen * TAU) * rb;
        rightUV.y += sin(leftLen * TAU) * rb;

        vec2 rightLocalUV = (rightUV * fullResolution - tileOffset) / vec2(textureSize(tex, 0));
        vec4 color2 = texture(tex, fract(rightLocalUV));

        color.rgb = blend(color1, color2, blendMode, mixAmt);
        color.a = max(color1.a, color2.a);
    }

    fragColor = color;
}
`,wgsl:`/*
 * Coalesce compositing shader (WGSL fragment version).
 * Provides blend modes plus a refractive cloaking mix that cross-samples both synth inputs.
 * Mix parameters are remapped from UI ranges so the refractive offsets stay within texture bounds during layering.
 */

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> blendMode : i32;
@group(0) @binding(4) var<uniform> mixAmt : f32;
@group(0) @binding(5) var<uniform> refractAAmt : f32;
@group(0) @binding(6) var<uniform> refractBAmt : f32;
@group(0) @binding(7) var<uniform> refractADir : f32;
@group(0) @binding(8) var<uniform> refractBDir : f32;

fn map_range(value : f32, inMin : f32, inMax : f32, outMin : f32, outMax : f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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

fn cloak(st : vec2<f32>) -> vec4<f32> {
    let m = map_range(mixAmt, -100.0, 100.0, 0.0, 1.0);
    let ra = map_range(refractAAmt, 0.0, 100.0, 0.0, 0.125);
    let rb = map_range(refractBAmt, 0.0, 100.0, 0.0, 0.125);

    let leftColor = textureSample(inputTex, samp, st);
    let rightColor = textureSample(tex, samp, st);

    // When the mixer is all the way to the left, we see left refracted by right
    var leftUV = st;
    let rightLen = length(rightColor.rgb);
    leftUV.x = leftUV.x + cos(rightLen * TAU) * ra;
    leftUV.y = leftUV.y + sin(rightLen * TAU) * ra;

    let leftRefracted = textureSample(inputTex, samp, fract(leftUV));

    // When the mixer is all the way to the right, we see right refracted by left
    var rightUV = st;
    let leftLen = length(leftColor.rgb);
    rightUV.x = rightUV.x + cos(leftLen * TAU) * rb;
    rightUV.y = rightUV.y + sin(leftLen * TAU) * rb;

    let rightRefracted = textureSample(tex, samp, fract(rightUV));

    // As the mixer approaches midpoint, mix the two refracted outputs using the same
    // logic as the "reflect" mode in coalesce.
    let leftReflected = min(rightRefracted * rightColor / (1.0 - leftRefracted * leftColor), vec4<f32>(1.0));
    let rightReflected = min(leftRefracted * leftColor / (1.0 - rightRefracted * rightColor), vec4<f32>(1.0));

    var left = vec4<f32>(1.0);
    var right = vec4<f32>(1.0);
    if (mixAmt < 0.0) {
        left = mix(leftRefracted, leftReflected, map_range(mixAmt, -100.0, 0.0, 0.0, 1.0));
        right = rightReflected;
    } else {
        left = leftReflected;
        right = mix(rightReflected, rightRefracted, map_range(mixAmt, 0.0, 100.0, 0.0, 1.0));
    }

    return mix(left, right, m);
}

fn hsv2rgb(hsv : vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs(((h * 6.0) % 2.0) - 1.0));
    let m = v - c;

    var rgb : vec3<f32>;

    if (h < 1.0/6.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (h < 2.0/6.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (h < 3.0/6.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (h < 4.0/6.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (h < 5.0/6.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }

    return rgb + vec3<f32>(m, m, m);
}

fn rgb2hsv(rgb : vec3<f32>) -> vec3<f32> {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;
    
    let max_val = max(r, max(g, b));
    let min_val = min(r, min(g, b));
    let delta = max_val - min_val;

    var h : f32 = 0.0;
    if (delta != 0.0) {
        if (max_val == r) {
            h = (((g - b) / delta) % 6.0) / 6.0;
        } else if (max_val == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (max_val == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    
    var s : f32 = 0.0;
    if (max_val != 0.0) {
        s = delta / max_val;
    }
    let v = max_val;

    return vec3<f32>(h, s, v);
}

fn vec4_eq(a : vec4<f32>, b : vec4<f32>) -> bool {
    return all(a == b);
}

fn blend_colors(color1 : vec4<f32>, color2 : vec4<f32>, mode : i32, factor_in : f32) -> vec3<f32> {
    var color : vec4<f32>;
    var middle : vec4<f32>;

    let amt = map_range(mixAmt, -100.0, 100.0, 0.0, 1.0);
    var factor = factor_in;

    var a = vec4<f32>(1.0);
    var b = vec4<f32>(1.0);
    if (mode >= 1000) {
        a = vec4<f32>(rgb2hsv(color1.rgb), color1.a);
        b = vec4<f32>(rgb2hsv(color2.rgb), color2.a);
    }

    if (mode == 0) {
        // add
        middle = min(color1 + color2, vec4<f32>(1.0));
    } else if (mode == 1) {
        // alpha
        if (mixAmt < 0.0) {
            return mix(color1,
                       color2 * vec4<f32>(1.0 - color1.a) + color1 * vec4<f32>(color1.a),
                       map_range(mixAmt, -100.0, 0.0, 0.0, 1.0)).rgb;
        } else {
            return mix(color1 * vec4<f32>(1.0 - color2.a) + color2 * vec4<f32>(color2.a),
                       color2,
                       map_range(mixAmt, 0.0, 100.0, 0.0, 1.0)).rgb;
        }
    } else if (mode == 2) {
        // color burn
        if (vec4_eq(color2, vec4<f32>(0.0))) {
            middle = color2;
        } else {
            middle = max((1.0 - ((1.0 - color1) / color2)), vec4<f32>(0.0));
        }
    } else if (mode == 3) {
        // color dodge
        if (vec4_eq(color2, vec4<f32>(1.0))) {
            middle = color2;
        } else {
            middle = min(color1 / (1.0 - color2), vec4<f32>(1.0));
        }
    } else if (mode == 4) {
        // darken
        middle = min(color1, color2);
    } else if (mode == 5) {
        // difference
        middle = abs(color1 - color2);
    } else if (mode == 6) {
        // exclusion
        middle = color1 + color2 - 2.0 * color1 * color2;
    } else if (mode == 7) {
        // glow
        if (vec4_eq(color2, vec4<f32>(1.0))) {
            middle = color2;
        } else {
            middle = min(color1 * color1 / (1.0 - color2), vec4<f32>(1.0));
        }
    } else if (mode == 8) {
        // hard light
        middle = vec4<f32>(blendOverlay(color2.r, color1.r), blendOverlay(color2.g, color1.g), blendOverlay(color2.b, color1.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 9) {
        // lighten
        middle = max(color1, color2);
    } else if (mode == 10) {
        // mix
        middle = mix(color1, color2, 0.5);
    } else if (mode == 11) {
        // multiply
        middle = color1 * color2;
    } else if (mode == 12) {
        // negation
        middle = vec4<f32>(1.0) - abs(vec4<f32>(1.0) - color1 - color2);
    } else if (mode == 13) {
        // overlay
        middle = vec4<f32>(blendOverlay(color1.r, color2.r), blendOverlay(color1.g, color2.g), blendOverlay(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 14) {
        // phoenix
        middle = min(color1, color2) - max(color1, color2) + vec4<f32>(1.0);
    } else if (mode == 15) {
        // reflect
        if (vec4_eq(color1, vec4<f32>(1.0))) {
            middle = color1;
        } else {
            middle = min(color2 * color2 / (1.0 - color1), vec4<f32>(1.0));
        }
    } else if (mode == 16) {
        // screen
        middle = 1.0 - ((1.0 - color1) * (1.0 - color2));
    } else if (mode == 17) {
        // soft light
        middle = vec4<f32>(blendSoftLight(color1.r, color2.r), blendSoftLight(color1.g, color2.g), blendSoftLight(color1.b, color2.b), mix(color1.a, color2.a, 0.5));
    } else if (mode == 18) {
        // subtract
        middle = max(color1 + color2 - 1.0, vec4<f32>(0.0));
    } else if (mode == 1000) {
        // hue a->b
        middle = vec4<f32>(hsv2rgb(vec3<f32>(b.r, a.g, a.b)), 1.0);
    } else if (mode == 1001) {
        // hue b->a
        middle = vec4<f32>(hsv2rgb(vec3<f32>(a.r, b.g, b.b)), 1.0);
    } else if (mode == 1002) {
        // saturation a->b
        middle = vec4<f32>(hsv2rgb(vec3<f32>(a.r, b.g, a.b)), 1.0);
    } else if (mode == 1003) {
        // saturation b->a
        middle = vec4<f32>(hsv2rgb(vec3<f32>(b.r, a.g, b.b)), 1.0);
    } else if (mode == 1004) {
        // brightness a->b
        middle = vec4<f32>(hsv2rgb(vec3<f32>(a.r, a.g, b.b)), 1.0);
    } else {
        // brightness b->a (mode == 1005)
        middle = vec4<f32>(hsv2rgb(vec3<f32>(b.r, b.g, a.b)), 1.0);
    }

    if (mode >= 1000) {
        middle.a = mix(color1.a, color2.a, 0.5);
    }

    if (factor == 0.5) {
        color = middle;
    } else if (factor < 0.5) {
        factor = map_range(amt, 0.0, 0.5, 0.0, 1.0);
        color = mix(color1, middle, factor);
    } else {
        factor = map_range(amt, 0.5, 1.0, 0.0, 1.0);
        color = mix(middle, color2, factor);
    }

    return color.rgb;
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    var st = position.xy / dims;

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);

    if (blendMode == 100) {
        color = cloak(st);
    } else {
        let ra = map_range(refractAAmt, 0.0, 100.0, 0.0, 0.125);
        let rb = map_range(refractBAmt, 0.0, 100.0, 0.0, 0.125);

        let leftColor = textureSample(inputTex, samp, st);
        let rightColor = textureSample(tex, samp, st);

        // refract a->b
        var leftUV = st;
        let rightLen = length(rightColor.rgb) + refractADir / 360.0;
        leftUV.x = leftUV.x + cos(rightLen * TAU) * ra;
        leftUV.y = leftUV.y + sin(rightLen * TAU) * ra;

        // refract b->a
        var rightUV = st;
        let leftLen = length(leftColor.rgb) + refractBDir / 360.0;
        rightUV.x = rightUV.x + cos(leftLen * TAU) * rb;
        rightUV.y = rightUV.y + sin(leftLen * TAU) * rb;

        let color1 = textureSample(inputTex, samp, leftUV);
        let color2 = textureSample(tex, samp, rightUV);

        color = vec4<f32>(blend_colors(color1, color2, blendMode, mixAmt), max(color1.a, color2.a));
    }

    return color;
}
`}},l=`# coalesce

Coalescing blend effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source surface B |
| blendMode | int | mix | add/alpha/brightnessAB/brightnessBA/cloak/colorBurn/colorDodge/darken/difference/exclusion/glow/hardLight/hueAB/hueBA/lighten/mix/multiply/negation/overlay/phoenix/reflect/saturationAB/saturationBA/screen/softLight/subtract | Mode |
| mix | float | 0 | -100-100 | Mix |
| refractAAmt | float | 0 | 0-100 | Refract a\u2192b |
| refractBAmt | float | 0 | 0-100 | Refract b\u2192a |
| refractADir | float | 0 | -180-180 | Refract dir a |
| refractBDir | float | 0 | -180-180 | Refract dir b |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .coalesce(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(t).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(t))n.shaders[o]={...e}}n&&l&&(n.help=l);var s="classicNoisedeck/coalesce",m="classicNoisedeck",d="coalesce",g=n;export{g as default,s as effectId,d as effectName,l as help,m as namespace};
