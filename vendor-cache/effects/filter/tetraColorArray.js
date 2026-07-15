/* filter/tetraColorArray */
var e=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var l={colorMode:{slot:0,components:"x"},colorCount:{slot:0,components:"y"},positionMode:{slot:0,components:"z"},repeat:{slot:0,components:"w"},offset:{slot:1,components:"x"},alpha:{slot:1,components:"y"},smoothness:{slot:1,components:"z"},rotation:{slot:1,components:"w"},time:{slot:2,components:"w"},color0:{slot:2,components:"xyz"},color1:{slot:3,components:"xyz"},color2:{slot:4,components:"xyz"},color3:{slot:5,components:"xyz"},color4:{slot:6,components:"xyz"},color5:{slot:7,components:"xyz"},color6:{slot:8,components:"xyz"},color7:{slot:9,components:"xyz"},pos0:{slot:10,components:"x"},pos1:{slot:10,components:"y"},pos2:{slot:10,components:"z"},pos3:{slot:10,components:"w"},pos4:{slot:11,components:"x"},pos5:{slot:11,components:"y"},pos6:{slot:11,components:"z"},pos7:{slot:11,components:"w"}},o=new e({name:"TetraColorArray",namespace:"filter",func:"tetraColorArray",tags:["color","palette"],openCategories:["general","mapping"],description:"Apply Tetra color array palettes based on luminance",uniformLayout:l,globals:{colorMode:{type:"int",default:0,uniform:"colorMode",choices:{rgb:0,hsv:1,oklab:2,oklch:3},ui:{label:"blend space",control:"dropdown"}},colorCount:{type:"int",default:6,uniform:"colorCount",min:2,max:8,step:1,ui:{label:"color count",control:"slider"}},positionMode:{type:"int",default:0,uniform:"positionMode",choices:{auto:0,manual:1},randChance:0,ui:{label:"positioning",control:"dropdown"}},color0:{type:"color",default:[1,0,0],uniform:"color0",ui:{label:"color 1",control:"color",category:"colors"}},color1:{type:"color",default:[1,.5,0],uniform:"color1",ui:{label:"color 2",control:"color",category:"colors"}},color2:{type:"color",default:[1,1,0],uniform:"color2",ui:{label:"color 3",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:2}}},color3:{type:"color",default:[0,1,0],uniform:"color3",ui:{label:"color 4",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:3}}},color4:{type:"color",default:[0,0,1],uniform:"color4",ui:{label:"color 5",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:4}}},color5:{type:"color",default:[.58,0,.83],uniform:"color5",ui:{label:"color 6",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:5}}},color6:{type:"color",default:[1,1,1],uniform:"color6",ui:{label:"color 7",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:6}}},color7:{type:"color",default:[0,0,0],uniform:"color7",ui:{label:"color 8",control:"color",category:"colors",enabledBy:{param:"colorCount",gt:7}}},pos0:{type:"float",default:0,uniform:"pos0",min:0,max:1,step:.01,randChance:0,ui:{label:"position 1",control:"slider",category:"positions",enabledBy:{param:"positionMode",eq:1}}},pos1:{type:"float",default:.14,uniform:"pos1",min:0,max:1,step:.01,randChance:0,ui:{label:"position 2",control:"slider",category:"positions",enabledBy:{param:"positionMode",eq:1}}},pos2:{type:"float",default:.29,uniform:"pos2",min:0,max:1,step:.01,randChance:0,ui:{label:"position 3",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:2}]}}},pos3:{type:"float",default:.43,uniform:"pos3",min:0,max:1,step:.01,randChance:0,ui:{label:"position 4",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:3}]}}},pos4:{type:"float",default:.57,uniform:"pos4",min:0,max:1,step:.01,randChance:0,ui:{label:"position 5",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:4}]}}},pos5:{type:"float",default:.71,uniform:"pos5",min:0,max:1,step:.01,randChance:0,ui:{label:"position 6",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:5}]}}},pos6:{type:"float",default:.86,uniform:"pos6",min:0,max:1,step:.01,randChance:0,ui:{label:"position 7",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:6}]}}},pos7:{type:"float",default:1,uniform:"pos7",min:0,max:1,step:.01,randChance:0,ui:{label:"position 8",control:"slider",category:"positions",enabledBy:{and:[{param:"positionMode",eq:1},{param:"colorCount",gt:7}]}}},rotation:{type:"float",default:0,uniform:"rotation",choices:{none:0,fwd:1,back:-1},ui:{label:"rotation",control:"dropdown"}},repeat:{type:"float",default:1,uniform:"repeat",min:0,max:10,randChoices:[1,2,3,4,5],step:.01,ui:{label:"repeat",control:"slider",category:"mapping"}},offset:{type:"float",default:0,uniform:"offset",min:0,max:1,step:.01,ui:{label:"offset",control:"slider",category:"mapping"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,randMin:.5,step:.01,ui:{label:"alpha",control:"slider"}},smoothness:{type:"float",default:1,uniform:"smoothness",min:0,max:1,ui:{label:"smoothness",control:"slider"}}},defaultProgram:`search filter, synth

noise()
  .tetraColorArray(smoothness: 0)
  .write(o0)`,passes:[{name:"render",program:"tetraColorArray",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={tetraColorArray:{glsl:`/**
 * Tetra Color Array Gradient - GLSL Fragment Shader
 *
 * Applies a discrete color gradient to the input image based on luminance.
 * Interpolates between 2-8 colors with optional custom positions.
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

// Color count (2-8)
uniform int colorCount;

// Position mode: 0=auto, 1=manual
uniform int positionMode;

// Colors (up to 8)
uniform vec3 color0;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform vec3 color6;
uniform vec3 color7;

// Positions (for manual mode)
uniform float pos0;
uniform float pos1;
uniform float pos2;
uniform float pos3;
uniform float pos4;
uniform float pos5;
uniform float pos6;
uniform float pos7;

// Mapping controls
uniform float repeat;
uniform float offset;
uniform float smoothness;
uniform float alpha;
uniform int rotation;   // -1 = backward, 0 = none, 1 = forward
uniform float time;

out vec4 fragColor;

const float TAU = 6.283185307179586;

// ============================================================================
// Color Space Conversions
// ============================================================================

// --- RGB <-> HSV ---

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

vec3 rgb2hsv(vec3 c) {
    float cmax = max(c.r, max(c.g, c.b));
    float cmin = min(c.r, min(c.g, c.b));
    float delta = cmax - cmin;

    float h = 0.0;
    if (delta > 0.0) {
        if (cmax == c.r) h = mod((c.g - c.b) / delta, 6.0) / 6.0;
        else if (cmax == c.g) h = ((c.b - c.r) / delta + 2.0) / 6.0;
        else h = ((c.r - c.g) / delta + 4.0) / 6.0;
    }
    float s = (cmax > 0.0) ? delta / cmax : 0.0;
    return vec3(h, s, cmax);
}

// --- Gamma transfer ---

vec3 linear2srgb(vec3 lin) {
    vec3 low = lin * 12.92;
    vec3 high = 1.055 * pow(max(lin, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(high, low, step(lin, vec3(0.0031308)));
}

vec3 srgb2linear(vec3 c) {
    vec3 low = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(high, low, step(c, vec3(0.04045)));
}

// --- OkLab core ---

vec3 oklab2linear(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;

    return vec3(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec3 linear2oklab(vec3 lin) {
    float l = 0.4122214708 * lin.r + 0.5363325363 * lin.g + 0.0514459929 * lin.b;
    float m = 0.2119034982 * lin.r + 0.6806995451 * lin.g + 0.1073969566 * lin.b;
    float s = 0.0883024619 * lin.r + 0.2817188376 * lin.g + 0.6299787005 * lin.b;

    float l_ = pow(max(l, 0.0), 1.0 / 3.0);
    float m_ = pow(max(m, 0.0), 1.0 / 3.0);
    float s_ = pow(max(s, 0.0), 1.0 / 3.0);

    return vec3(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

// --- RGB <-> OkLab ---

vec3 oklab2rgb(vec3 lab) {
    return clamp(linear2srgb(oklab2linear(lab)), 0.0, 1.0);
}

vec3 rgb2oklab(vec3 rgb) {
    return linear2oklab(srgb2linear(rgb));
}

// --- RGB <-> OKLCH (L, C, H where H is 0-1 fractional turns) ---

vec3 oklch2rgb(vec3 lch) {
    float a = lch.y * cos(lch.z * TAU);
    float b = lch.y * sin(lch.z * TAU);
    return clamp(linear2srgb(oklab2linear(vec3(lch.x, a, b))), 0.0, 1.0);
}

vec3 rgb2oklch(vec3 rgb) {
    vec3 lab = rgb2oklab(rgb);
    float C = length(lab.yz);
    float h = atan(lab.z, lab.y);
    return vec3(lab.x, C, fract(h / TAU));
}

// --- Dispatch by mode ---

vec3 rgbToColorSpace(vec3 rgb, int mode) {
    if (mode == 1) return rgb2hsv(rgb);
    if (mode == 2) return rgb2oklab(rgb);
    if (mode == 3) return rgb2oklch(rgb);
    return rgb;
}

vec3 colorSpaceToRgb(vec3 color, int mode) {
    if (mode == 1) return hsv2rgb(color);
    if (mode == 2) return oklab2rgb(color);
    if (mode == 3) return oklch2rgb(color);
    return color;
}

// ============================================================================
// Color Array Interpolation
// ============================================================================

vec3 getColor(int index) {
    if (index == 0) return color0;
    if (index == 1) return color1;
    if (index == 2) return color2;
    if (index == 3) return color3;
    if (index == 4) return color4;
    if (index == 5) return color5;
    if (index == 6) return color6;
    return color7;
}

float getPosition(int index, int count) {
    if (positionMode == 0) {
        // Auto mode: even spacing
        return float(index) / float(count - 1);
    }
    // Manual mode: use position uniforms
    if (index == 0) return pos0;
    if (index == 1) return pos1;
    if (index == 2) return pos2;
    if (index == 3) return pos3;
    if (index == 4) return pos4;
    if (index == 5) return pos5;
    if (index == 6) return pos6;
    return pos7;
}

// Interpolate in color space with shortest-path hue for HSV/OKLCH
vec3 mixInColorSpace(vec3 a, vec3 b, float f, int mode) {
    if (mode == 1) {
        // HSV: hue is .x
        float dh = b.x - a.x;
        if (dh > 0.5) dh -= 1.0;
        if (dh < -0.5) dh += 1.0;
        return vec3(fract(a.x + dh * f), mix(a.y, b.y, f), mix(a.z, b.z, f));
    } else if (mode == 3) {
        // OKLCH: hue is .z
        float dh = b.z - a.z;
        if (dh > 0.5) dh -= 1.0;
        if (dh < -0.5) dh += 1.0;
        return vec3(mix(a.x, b.x, f), mix(a.y, b.y, f), fract(a.z + dh * f));
    }
    return mix(a, b, f);
}

vec3 sampleColorArray(float t, int count, float smoothAmount) {
    t = clamp(t, 0.0, 1.0);
    int mode = colorMode;

    // Cascade blend: smoothstep at each transition boundary
    vec3 result = rgbToColorSpace(getColor(0), mode);

    for (int i = 1; i < count; i++) {
        float boundary, bw;

        if (positionMode == 0) {
            // Auto: equal-width bands, transitions at i/count
            boundary = float(i) / float(count);
            bw = smoothAmount * 0.5 / float(count);
        } else {
            // Manual: transition at midpoint between adjacent positions
            float pPrev = getPosition(i - 1, count);
            float pCurr = getPosition(i, count);
            boundary = (pPrev + pCurr) * 0.5;
            bw = smoothAmount * (pCurr - pPrev) * 0.25;
        }

        float blend = smoothstep(boundary - bw, boundary + bw, t);
        vec3 nextColor = rgbToColorSpace(getColor(i), mode);
        result = mixInColorSpace(result, nextColor, blend, mode);
    }

    // Wrap-around blend: smooth the seam between last and first color
    // when the palette repeats (fract causes a hard edge at t=0/1)
    if (smoothAmount > 0.0) {
        float bw;
        if (positionMode == 0) {
            bw = smoothAmount * 0.5 / float(count);
        } else {
            float pLast = getPosition(count - 1, count);
            float pFirst = getPosition(0, count);
            float gap = 1.0 - pLast + pFirst;
            bw = smoothAmount * gap * 0.25;
        }

        if (bw > 0.0) {
            // Signed cyclic distance from the wrap boundary (t=0 \u2261 t=1)
            float d = (t > 0.5) ? (t - 1.0) : t;
            // Interpolation factor: 0 = last color, 1 = first color
            float wrapFactor = smoothstep(-bw, bw, d);
            vec3 lastColor = rgbToColorSpace(getColor(count - 1), mode);
            vec3 firstColor = rgbToColorSpace(getColor(0), mode);
            vec3 wrapColor = mixInColorSpace(lastColor, firstColor, wrapFactor, mode);

            // Mask: 1.0 at wrap point, fading to 0.0 at edge of zone
            float wrapMask = 1.0 - smoothstep(0.0, bw, abs(d));
            result = mixInColorSpace(result, wrapColor, wrapMask, mode);
        }
    }

    return colorSpaceToRgb(result, mode);
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
    float t = lum * (1.0 - 1e-4) * repeat + offset;

    if (rotation == -1) {
        t += time;
    } else if (rotation == 1) {
        t -= time;
    }

    t = fract(t);

    // Sample the color array gradient
    vec3 gradientColor = sampleColorArray(t, colorCount, smoothness);

    // Blend with original based on alpha
    vec3 blendedColor = mix(inputColor.rgb, gradientColor, alpha);

    fragColor = vec4(blendedColor, inputColor.a);
}
`,wgsl:`/**
 * Tetra Color Array Gradient - WGSL Fragment Shader
 *
 * Applies a discrete color array gradient to the input image based on luminance.
 * Supports up to 8 colors with manual or auto-positioned stops.
 * Supports RGB, HSV, OkLab, and OKLCH color modes.
 */

struct Uniforms {
    data: array<vec4<f32>, 12>,
    // data[0].x = colorMode, data[0].y = colorCount, data[0].z = positionMode, data[0].w = repeat
    // data[1].x = offset (mapping), data[1].y = alpha, data[1].z = smoothness, data[1].w = rotation
    // data[2].w = time (global, auto-provided)
    // data[2].xyz = color0 (rgb)
    // data[3].xyz = color1 (rgb)
    // data[4].xyz = color2 (rgb)
    // data[5].xyz = color3 (rgb)
    // data[6].xyz = color4 (rgb)
    // data[7].xyz = color5 (rgb)
    // data[8].xyz = color6 (rgb)
    // data[9].xyz = color7 (rgb)
    // data[10].xyzw = positions 0-3
    // data[11].xyzw = positions 4-7
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.283185307179586;

// ============================================================================
// Color Space Conversions
// ============================================================================

// --- RGB <-> HSV ---

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = hsv.x;
    let s = hsv.y;
    let v = hsv.z;

    let c = v * s;
    let hp = h * 6.0;
    let x = c * (1.0 - abs(hp % 2.0 - 1.0));
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

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
    let cmax = max(c.r, max(c.g, c.b));
    let cmin = min(c.r, min(c.g, c.b));
    let delta = cmax - cmin;

    var h: f32 = 0.0;
    if (delta > 0.0) {
        if (cmax == c.r) {
            h = ((c.g - c.b) / delta % 6.0) / 6.0;
        } else if (cmax == c.g) {
            h = ((c.b - c.r) / delta + 2.0) / 6.0;
        } else {
            h = ((c.r - c.g) / delta + 4.0) / 6.0;
        }
        h = fract(h);
    }
    let s = select(0.0, delta / cmax, cmax > 0.0);
    return vec3<f32>(h, s, cmax);
}

// --- Gamma transfer ---

fn linear2srgb(lin: vec3<f32>) -> vec3<f32> {
    let low = lin * 12.92;
    let high = 1.055 * pow(max(lin, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
    return select(high, low, lin < vec3<f32>(0.0031308));
}

fn srgb2linear(c: vec3<f32>) -> vec3<f32> {
    let low = c / 12.92;
    let high = pow((c + 0.055) / 1.055, vec3<f32>(2.4));
    return select(high, low, c < vec3<f32>(0.04045));
}

// --- OkLab core ---

fn oklab2linear(lab: vec3<f32>) -> vec3<f32> {
    let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    return vec3<f32>(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

fn linear2oklab(lin: vec3<f32>) -> vec3<f32> {
    let l = 0.4122214708 * lin.r + 0.5363325363 * lin.g + 0.0514459929 * lin.b;
    let m = 0.2119034982 * lin.r + 0.6806995451 * lin.g + 0.1073969566 * lin.b;
    let s = 0.0883024619 * lin.r + 0.2817188376 * lin.g + 0.6299787005 * lin.b;

    let l_ = pow(max(l, 0.0), 1.0 / 3.0);
    let m_ = pow(max(m, 0.0), 1.0 / 3.0);
    let s_ = pow(max(s, 0.0), 1.0 / 3.0);

    return vec3<f32>(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    );
}

// --- RGB <-> OkLab ---

fn oklab2rgb(lab: vec3<f32>) -> vec3<f32> {
    return clamp(linear2srgb(oklab2linear(lab)), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn rgb2oklab(rgb: vec3<f32>) -> vec3<f32> {
    return linear2oklab(srgb2linear(rgb));
}

// --- RGB <-> OKLCH (L, C, H where H is 0-1 fractional turns) ---

fn oklch2rgb(lch: vec3<f32>) -> vec3<f32> {
    let a = lch.y * cos(lch.z * TAU);
    let b = lch.y * sin(lch.z * TAU);
    return clamp(linear2srgb(oklab2linear(vec3<f32>(lch.x, a, b))), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn rgb2oklch(rgb: vec3<f32>) -> vec3<f32> {
    let lab = rgb2oklab(rgb);
    let C = length(lab.yz);
    let h = atan2(lab.z, lab.y);
    return vec3<f32>(lab.x, C, fract(h / TAU));
}

// --- Dispatch by mode ---

fn rgbToColorSpace(rgb: vec3<f32>, mode: i32) -> vec3<f32> {
    if (mode == 1) { return rgb2hsv(rgb); }
    if (mode == 2) { return rgb2oklab(rgb); }
    if (mode == 3) { return rgb2oklch(rgb); }
    return rgb;
}

fn colorSpaceToRgb(color: vec3<f32>, mode: i32) -> vec3<f32> {
    if (mode == 1) { return hsv2rgb(color); }
    if (mode == 2) { return oklab2rgb(color); }
    if (mode == 3) { return oklch2rgb(color); }
    return color;
}

// ============================================================================
// Color Array Helpers
// ============================================================================

fn getColor(index: i32) -> vec4<f32> {
    switch (index) {
        case 0: { return uniforms.data[2]; }
        case 1: { return uniforms.data[3]; }
        case 2: { return uniforms.data[4]; }
        case 3: { return uniforms.data[5]; }
        case 4: { return uniforms.data[6]; }
        case 5: { return uniforms.data[7]; }
        case 6: { return uniforms.data[8]; }
        case 7: { return uniforms.data[9]; }
        default: { return uniforms.data[2]; }
    }
}

fn getPosition(index: i32, colorCount: i32, positionMode: i32) -> f32 {
    // Auto mode: evenly distribute
    if (positionMode == 0) {
        if (colorCount <= 1) {
            return 0.0;
        }
        return f32(index) / f32(colorCount - 1);
    }

    // Manual mode: use stored positions
    switch (index) {
        case 0: { return uniforms.data[10].x; }
        case 1: { return uniforms.data[10].y; }
        case 2: { return uniforms.data[10].z; }
        case 3: { return uniforms.data[10].w; }
        case 4: { return uniforms.data[11].x; }
        case 5: { return uniforms.data[11].y; }
        case 6: { return uniforms.data[11].z; }
        case 7: { return uniforms.data[11].w; }
        default: { return 0.0; }
    }
}

// Interpolate in color space with shortest-path hue for HSV/OKLCH
fn mixInColorSpace(a: vec3<f32>, b: vec3<f32>, f: f32, mode: i32) -> vec3<f32> {
    if (mode == 1) {
        // HSV: hue is .x
        var dh = b.x - a.x;
        if (dh > 0.5) { dh -= 1.0; }
        if (dh < -0.5) { dh += 1.0; }
        return vec3<f32>(fract(a.x + dh * f), mix(a.y, b.y, f), mix(a.z, b.z, f));
    } else if (mode == 3) {
        // OKLCH: hue is .z
        var dh = b.z - a.z;
        if (dh > 0.5) { dh -= 1.0; }
        if (dh < -0.5) { dh += 1.0; }
        return vec3<f32>(mix(a.x, b.x, f), mix(a.y, b.y, f), fract(a.z + dh * f));
    }
    return mix(a, b, f);
}

fn sampleColorArray(t_in: f32, colorCount: i32, positionMode: i32, colorMode: i32, smoothAmount: f32) -> vec3<f32> {
    let t = clamp(t_in, 0.0, 1.0);

    // Handle edge cases
    if (colorCount <= 0) {
        return vec3<f32>(0.0);
    }
    if (colorCount == 1) {
        return getColor(0).rgb;
    }

    // Cascade blend: smoothstep at each transition boundary
    var result = rgbToColorSpace(getColor(0).rgb, colorMode);

    for (var i: i32 = 1; i < colorCount; i = i + 1) {
        var boundary: f32;
        var bw: f32;

        if (positionMode == 0) {
            // Auto: equal-width bands, transitions at i/count
            boundary = f32(i) / f32(colorCount);
            bw = smoothAmount * 0.5 / f32(colorCount);
        } else {
            // Manual: transition at midpoint between adjacent positions
            let pPrev = getPosition(i - 1, colorCount, positionMode);
            let pCurr = getPosition(i, colorCount, positionMode);
            boundary = (pPrev + pCurr) * 0.5;
            bw = smoothAmount * (pCurr - pPrev) * 0.25;
        }

        let blend = smoothstep(boundary - bw, boundary + bw, t);
        let nextColor = rgbToColorSpace(getColor(i).rgb, colorMode);
        result = mixInColorSpace(result, nextColor, blend, colorMode);
    }

    // Wrap-around blend: smooth the seam between last and first color
    // when the palette repeats (fract causes a hard edge at t=0/1)
    if (smoothAmount > 0.0) {
        var bw: f32;
        if (positionMode == 0) {
            bw = smoothAmount * 0.5 / f32(colorCount);
        } else {
            let pLast = getPosition(colorCount - 1, colorCount, positionMode);
            let pFirst = getPosition(0, colorCount, positionMode);
            let gap = 1.0 - pLast + pFirst;
            bw = smoothAmount * gap * 0.25;
        }

        if (bw > 0.0) {
            // Signed cyclic distance from the wrap boundary (t=0 \u2261 t=1)
            let d = select(t, t - 1.0, t > 0.5);
            // Interpolation factor: 0 = last color, 1 = first color
            let wrapFactor = smoothstep(-bw, bw, d);
            let lastColor = rgbToColorSpace(getColor(colorCount - 1).rgb, colorMode);
            let firstColor = rgbToColorSpace(getColor(0).rgb, colorMode);
            let wrapColor = mixInColorSpace(lastColor, firstColor, wrapFactor, colorMode);

            // Mask: 1.0 at wrap point, fading to 0.0 at edge of zone
            let wrapMask = 1.0 - smoothstep(0.0, bw, abs(d));
            result = mixInColorSpace(result, wrapColor, wrapMask, colorMode);
        }
    }

    return colorSpaceToRgb(result, colorMode);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    // Extract uniforms
    let colorMode = i32(uniforms.data[0].x);
    let colorCount = i32(uniforms.data[0].y);
    let positionMode = i32(uniforms.data[0].z);
    let repeatVal = uniforms.data[0].w;
    let offsetVal = uniforms.data[1].x;
    let alpha = uniforms.data[1].y;
    let smoothness = uniforms.data[1].z;
    let rotation = i32(uniforms.data[1].w);
    let time = uniforms.data[2].w;

    // Calculate UV from position
    let size = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = position.xy / size;

    // Get input color
    let inputColor = textureSampleLevel(inputTex, samp, uv, 0.0);

    // Calculate luminance as the t value
    let lum = dot(inputColor.rgb, vec3<f32>(0.299, 0.587, 0.114));

    // Apply mapping: repeat, offset, and rotation (animation)
    var t = lum * (1.0 - 1e-4) * repeatVal + offsetVal;

    if (rotation == -1) {
        t = t + time;
    } else if (rotation == 1) {
        t = t - time;
    }

    t = fract(t);

    // Sample the color array gradient
    let gradientColor = sampleColorArray(t, colorCount, positionMode, colorMode, smoothness);

    // Blend with original based on alpha
    let blendedColor = mix(inputColor.rgb, gradientColor, alpha);

    return vec4<f32>(blendedColor, inputColor.a);
}
`}},a=`# tetraColorArray

Apply Tetra color array gradients to images based on luminance.

## Overview

The \`tetraColorArray\` effect maps input pixel luminance to a gradient created from 2-8 discrete colors. Colors are interpolated smoothly between stops, with optional custom positioning.

This effect is fully compatible with Tetra's color array palette format and can load saved Tetra palettes.

## Parameters

### Mode Settings
- **Blend Space**: Choose the color space for interpolation
  - RGB (default): Standard RGB color space
  - HSV: Hue-Saturation-Value for smooth hue interpolation
  - OkLab: Perceptually uniform color space
  - OKLCH: Cylindrical perceptual space

- **Color Count**: Number of colors in the gradient (2-8)

- **Position Mode**: How colors are distributed
  - Auto: Colors evenly distributed across the gradient
  - Manual: Use custom positions for each color

### Colors
- **Color 1-8**: Color pickers for each gradient stop
  - Color 6 visible when Color Count is 6+
  - Color 7 visible when Color Count is 7+
  - Color 8 visible when Color Count is 8

### Positions (Manual Mode)
- **Position 1-8**: Position (0-1) for each color in the gradient
  - Only visible when Position Mode is set to Manual
  - Positions should generally be in ascending order

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
- **Smoothness**: Blend width between palette colors (0-1)
  - 0 = no blending, 1 = widest blend

## Example Gradients

### Grayscale (Default)
5 colors from black to white, evenly spaced.

### Ocean Blues
\`\`\`
colors: [
  [0.05, 0.10, 0.30],  // Deep sea
  [0.10, 0.25, 0.50],
  [0.20, 0.45, 0.70],
  [0.50, 0.75, 0.90],
  [0.80, 0.92, 0.98]   // Shallow water
]
\`\`\`

### Fire
\`\`\`
colors: [
  [0.1, 0.0, 0.0],     // Dark red
  [0.8, 0.2, 0.0],     // Red-orange
  [1.0, 0.5, 0.0],     // Orange
  [1.0, 0.9, 0.3],     // Yellow
  [1.0, 1.0, 0.9]      // White-hot
]
\`\`\`

## Custom Positions

Manual positioning allows you to control exactly where each color appears in the gradient:

\`\`\`
colors: [[0,0,0], [1,0,0], [1,1,0], [1,1,1]]
positions: [0.0, 0.2, 0.5, 1.0]
\`\`\`

This creates:
- Black at 0% luminance
- Red at 20% luminance
- Yellow at 50% luminance
- White at 100% luminance

## Tetra Config Compatibility

This effect uses the same parameter format as Tetra's color array palettes. To use a Tetra palette:

1. Export a palette from Tetra as JSON
2. The \`params\` object contains \`colors\`, \`positions\`, and \`positionMode\`
3. Set each color picker and position slider to match

Example Tetra palette JSON:
\`\`\`json
{
  "name": "My Gradient",
  "type": "colors",
  "colorMode": "rgb",
  "params": {
    "colors": [
      [0.05, 0.10, 0.30],
      [0.10, 0.25, 0.50],
      [0.20, 0.45, 0.70],
      [0.50, 0.75, 0.90],
      [0.80, 0.92, 0.98]
    ],
    "positions": [0.0, 0.25, 0.5, 0.75, 1.0],
    "positionMode": "manual"
  }
}
\`\`\`

## DSL Usage

\`\`\`javascript
// Basic 5-color grayscale
noise().tetraColorArray()

// Custom fire gradient
noise().tetraColorArray({
  colorCount: 5,
  color0: "#1a0000",
  color1: "#cc3300",
  color2: "#ff8000",
  color3: "#ffe64d",
  color4: "#ffffe6"
})

// Two-color with custom positions
noise().tetraColorArray({
  colorCount: 2,
  color0: "#000066",
  color1: "#ffff00",
  positionMode: 1,  // manual
  pos0: 0.0,
  pos1: 0.7  // Yellow starts at 70% luminance
})

// HSV mode for smooth hue transitions
noise().tetraColorArray({
  colorMode: 1,  // HSV
  colorCount: 3,
  color0: "#ff0000",  // Red
  color1: "#00ff00",  // Green
  color2: "#0000ff"   // Blue
})
\`\`\`

## References

- [Tetra Palette Editor](https://tetra.noisedeck.app)

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .tetraColorArray()
  .write(o0)

render(o0)
\`\`\`
`;if(o&&Object.keys(r).length>0){o.shaders||(o.shaders={});for(let[t,n]of Object.entries(r))o.shaders[t]={...n}}o&&a&&(o.help=a);var p="filter/tetraColorArray",u="filter",d="tetraColorArray",m=o;export{m as default,p as effectId,d as effectName,a as help,u as namespace};
