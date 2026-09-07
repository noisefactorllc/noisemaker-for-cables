/* classicNoisedeck/colorLab */
var m=Object.defineProperty;var b=(n,e,t)=>e in n?m(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var r=(n,e,t)=>b(n,typeof e!="symbol"?e+"":e,t);var a=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var l={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var P=Math.PI*2,d=l,s=d;var f={};Object.keys(s).forEach((n,e)=>{f[n]={type:"Number",value:e}});var g={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},h={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4},cc:{type:"Number",value:5},cc14:{type:"Number",value:6},nrpn:{type:"Number",value:7},pitchBend:{type:"Number",value:8},pressure:{type:"Number",value:9},polyPressure:{type:"Number",value:10}},y={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3},raw:{type:"Number",value:4}},i={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:g,midiMode:h,midiZone:{lower:{type:"Number",value:0},upper:{type:"Number",value:1}},audioBand:y,palette:f};var c={};for(let[n,e]of Object.entries(i.palette))c[n]=e.value;var o=class extends a{constructor(){super(...arguments);r(this,"name","ColorLab");r(this,"namespace","classicNoisedeck");r(this,"func","colorLab");r(this,"tags",["color"]);r(this,"openCategories",["general","color"]);r(this,"description","Color manipulation lab");r(this,"globals",{colorMode:{type:"int",default:2,uniform:"colorMode",choices:{mono:0,linearRgb:1,srgbDefault:2,oklab:3,palette:4},ui:{label:"color mode",control:"dropdown"}},palette:{type:"palette",default:46,uniform:"palette",choices:c,ui:{label:"palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},paletteMode:{type:"int",default:0,uniform:"paletteMode",ui:{control:!1}},paletteOffset:{type:"vec3",default:[.83,.6,.63],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[.3,.1,0],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"cycle palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"rotate palette",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat palette",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},hueRotation:{type:"float",default:0,uniform:"hueRotation",min:0,max:360,ui:{label:"hue rotate",control:"slider",category:"color"}},hueRange:{type:"float",default:100,uniform:"hueRange",min:0,max:200,ui:{label:"hue range",control:"slider",category:"color"}},saturation:{type:"float",default:0,uniform:"saturation",min:-100,max:100,ui:{label:"saturation",control:"slider",category:"color"}},invert:{type:"boolean",default:!1,uniform:"invert",ui:{label:"invert",control:"checkbox",category:"color"}},brightness:{type:"float",default:0,uniform:"brightness",min:-100,max:100,ui:{label:"brightness",control:"slider",category:"color"}},contrast:{type:"float",default:50,uniform:"contrast",min:0,max:100,ui:{label:"contrast",control:"slider",category:"color"}},levels:{type:"int",default:0,uniform:"levels",min:0,max:32,ui:{label:"posterize",control:"slider",category:"effects"}},dither:{type:"int",default:0,uniform:"dither",choices:{none:0,threshold:1,random:2,randomTime:3,bayer:4},ui:{label:"dither",control:"dropdown",category:"effects"}}});r(this,"passes",[{name:"render",program:"colorLab",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}])}};var p={colorLab:{glsl:`#version 300 es

/*
 * Color lab shader.
 * Offers HSL, RGB, and curve adjustments in a single pass for rapid color grading.
 * Curves are remapped to normalized control points to ensure predictable broadcast-safe output.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float time;
uniform float levels;
uniform int dither;
uniform float hueRotation;
uniform float hueRange;
uniform bool invert;
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform int colorMode;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

// PCG PRNG from https://github.com/riccardoscalco/glsl-pcg-prng, MIT license
uvec3 pcg(uvec3 v) {
	v = v * uint(1664525) + uint(1013904223);

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	v ^= v >> uint(16);

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	return v;
}

vec3 prng (vec3 p) {
	return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}
// end PCG PRNG

float random(vec2 st) {
    return prng(vec3(st, 1.0)).x;
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 posterize(vec3 color, float lev) {
    if (lev == 0.0) {
        return color;
    } else if (lev == 1.0) {
        lev = 2.0;
    }

    float gamma = 0.65;
    color = pow(color, vec3(gamma));
    color = floor(color * lev) / lev;
    color = pow(color, vec3(1.0 / gamma));

    return color;
}

vec3 brightnessContrast(vec3 color) {
    float bright = map(brightness, -100.0, 100.0, -1.0, 1.0);
    float cont = map(contrast, 0.0, 100.0, 0.0, 2.0);

    color = (color - 0.5) * cont + 0.5 + bright;
    return color;
}

vec3 saturate(vec3 color) {
    float sat = map(saturation, -100.0, 100.0, -1.0, 1.0);
    float avg = (color.r + color.g + color.b) / 3.0;
    color -= (avg - color) * sat;
    return color;
}

vec3 desaturate(vec3 color) {
    float avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    return vec3(avg);
}

float periodicFunction(float p) {
    float x = TAU * p;
    float func = sin(x);
    return map(func, -1.0, 1.0, 0.0, 1.0);
}

float offsets(vec2 st) {
    return distance(st, vec2(0.5));
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

vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; ++i) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// oklab transform and inverse - Public Domain/MIT License
// https://bottosson.github.io/posts/oklab/

const mat3 fwdA = mat3(1.0, 1.0, 1.0,
                       0.3963377774, -0.1055613458, -0.0894841775,
                       0.2158037573, -0.0638541728, -1.2914855480);

const mat3 fwdB = mat3(4.0767245293, -1.2681437731, -0.0041119885,
                       -3.3072168827, 2.6093323231, -0.7034763098,
                       0.2307590544, -0.3411344290,  1.7068625689);

const mat3 invB = mat3(0.4121656120, 0.2118591070, 0.0883097947,
                       0.5362752080, 0.6807189584, 0.2818474174,
                       0.0514575653, 0.1074065790, 0.6302613616);

const mat3 invA = mat3(0.2104542553, 1.9779984951, 0.0259040371,
                       0.7936177850, -2.4285922050, 0.7827717662,
                       -0.0040720468, 0.4505937099, -0.8086757660);

vec3 oklab_from_linear_srgb(vec3 c) {
    vec3 lms = invB * c;

    return invA * (sign(lms)*pow(abs(lms), vec3(0.3333333333333)));
}

vec3 linear_srgb_from_oklab(vec3 c) {
    vec3 lms = fwdA * c;

    return fwdB * (lms * lms * lms);
}
// end oklab

vec3 pal(float t) {
    vec3 a = paletteOffset;
    vec3 b = paletteAmp;
    vec3 c = paletteFreq;
    vec3 d = palettePhase;

    t = t * repeatPalette + rotatePalette * 0.01;

    vec3 color = a + b * cos(6.28318 * (c * t + d));

    // convert to rgb if palette is in hsv or oklab mode
    // 1 = hsv, 2 = oklab, 3 = rgb
    if (paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (paletteMode == 2) {
        color.g = color.g * -.509 + .276;
        color.b = color.b * -.509 + .198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color.rgb);
    } 

    return color;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 color = vec4(0.0);

    float blendy = periodicFunction(time - offsets(uv));

    color = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    if (levels != 0.0) {
        color.rgb = posterize(color.rgb, levels);
    }

    float bright = rgb2hsv(color.rgb)[2];

    if (dither == 1) {
        // threshold
        color.rgb *= vec3(step(0.5, bright));

    } else if (dither == 2) {
        // random
        color.rgb *= vec3(step(random(globalCoord), bright));

    } else if (dither == 3) {
        // random + time
        color.rgb *= vec3(step(periodicFunction(random(globalCoord) + time), bright));

    } else if (dither == 4) {
        // bayer
        vec2 coord = mod(globalCoord / renderScale, 4.0).xy - 0.5;

        if (bright < 0.12) {
            color.rgb = vec3(0.0);
        } else if (bright < 0.24) {
            color.rgb *= (coord.xy == vec2(1.0)) ? vec3(1.0) : vec3(0.0);
        } else if (bright < 0.36) {
            color.rgb *= (coord.xy == vec2(1.0) || coord.xy == vec2(3.0)) ? vec3(1.0) : vec3(0.0);
        } else if (bright < 0.48) {
            color.rgb *= ((coord.x == 1.0 || coord.x == 3.0) && (coord.y == 1.0 || coord.y == 3.0)) ? vec3(1.0) : vec3(0.0);
        } else if (bright < 0.60) {
            color.rgb *= ((coord.x == 1.0 || coord.x == 3.0) && (coord.y == 1.0 || coord.y == 3.0)) ? vec3(0.0) : vec3(1.0);
        } else if (bright < 0.72) {
            color.rgb *= (coord.xy == vec2(1.0) || coord.xy == vec2(3.0)) ? vec3(0.0) : vec3(1.0);
        } else if (bright < 0.84) {
            color.rgb *= (coord.xy == vec2(1.0)) ? vec3(0.0) : vec3(1.0);
        }
    }

    // color fun
    if (colorMode == 0) {
        // grayscale
        color.rgb = vec3(rgb2hsv(color.rgb).b);
    } else if (colorMode == 1) {
        // linear rgb
        color.rgb = srgbToLinear(color.rgb);
    } else if (colorMode == 3) {
        // oklab
        // magic values from py-noisemaker - MIT License
        // https://github.com/noisefactorllc/noisemaker/blob/main/noisemaker/generators.py
        color.g = color.g * -.509 + .276;
        color.b = color.b * -.509 + .198;

        color.rgb = linear_srgb_from_oklab(color.rgb);
        color.rgb = linearToSrgb(color.rgb);
    } else if (colorMode == 4) {
        // palette
        float d = rgb2hsv(color.rgb).b;
        if (cyclePalette == -1) {
            d += time;
        } else if (cyclePalette == 1) {
            d -= time;
        }
        color.rgb = pal(d);
    }

    vec3 hsv = rgb2hsv(color.rgb);
    hsv[0] = mod(hsv[0] * map(hueRange, 0.0, 200.0, 0.0, 2.0)
                 + (hueRotation / 360.0), 1.0);
    color.rgb = hsv2rgb(hsv);

    if (invert) {
        color.rgb = 1.0 - color.rgb;
    }

    // brightness/contrast/saturation
    color.rgb = brightnessContrast(color.rgb);
    color.rgb = saturate(color.rgb);

    fragColor = color;
}
`,wgsl:`/*
 * Color lab shader.
 * Offers HSL, RGB, and curve adjustments in a single pass for rapid color grading.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

// Uniform struct matching runtime packing exactly
// Global uniforms first, then effect params in definition order
struct Uniforms {
    time: f32,           // offset 0
    deltaTime: f32,      // offset 4
    frame: i32,          // offset 8
    _pad0: f32,          // offset 12 (padding for vec2 alignment to 16)
    resolution: vec2f,   // offset 16 (8-byte aligned)
    aspect: f32,         // offset 24
    // effect params:
    colorMode: i32,      // offset 28
    palette: i32,        // offset 32
    paletteMode: i32,    // offset 36
    _pad1: f32,          // offset 40
    _pad2: f32,          // offset 44 (padding for vec3f alignment to 48)
    paletteOffset: vec3f, // offset 48 (16-byte aligned, 12 bytes used + 4 pad)
    _padOff: f32,        // padding to 16 bytes
    paletteAmp: vec3f,   // offset 64
    _padAmp: f32,
    paletteFreq: vec3f,  // offset 80
    _padFreq: f32,
    palettePhase: vec3f, // offset 96
    _padPhase: f32,
    cyclePalette: i32,   // offset 112
    rotatePalette: f32,  // offset 116
    repeatPalette: i32,  // offset 120
    hueRotation: f32,    // offset 124
    hueRange: f32,       // offset 128
    saturation: f32,     // offset 132
    invert: i32,         // offset 136
    brightness: i32,     // offset 140
    contrast: i32,       // offset 144
    levels: i32,         // offset 148
    dither: i32,         // offset 152
}

@group(0) @binding(2) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

// PCG PRNG
fn pcg3(v_in: vec3u) -> vec3u {
    var v = v_in * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> vec3u(16u);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

fn prng(p: vec3f) -> vec3f {
    return vec3f(pcg3(vec3u(p))) / f32(0xffffffffu);
}

fn random(st: vec2f) -> f32 {
    return prng(vec3f(st, 1.0)).x;
}

fn mapVal(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn posterize(color: vec3f, lev: f32) -> vec3f {
    if (lev == 0.0) {
        return color;
    }
    var lvl = lev;
    if (lvl == 1.0) {
        lvl = 2.0;
    }
    let gamma = 0.65;
    var c = pow(color, vec3f(gamma));
    c = floor(c * lvl) / lvl;
    c = pow(c, vec3f(1.0 / gamma));
    return c;
}

fn brightnessContrast(color: vec3f) -> vec3f {
    let bright = mapVal(f32(u.brightness), -100.0, 100.0, -1.0, 1.0);
    let cont = mapVal(f32(u.contrast), 0.0, 100.0, 0.0, 2.0);
    return (color - 0.5) * cont + 0.5 + bright;
}

fn saturateColor(color: vec3f) -> vec3f {
    let sat = mapVal(u.saturation, -100.0, 100.0, -1.0, 1.0);
    let avg = (color.r + color.g + color.b) / 3.0;
    return color - (avg - color) * sat;
}

fn periodicFunction(p: f32) -> f32 {
    let x = TAU * p;
    return mapVal(sin(x), -1.0, 1.0, 0.0, 1.0);
}

fn hsv2rgb(hsv: vec3f) -> vec3f {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
    let m = v - c;

    var rgb: vec3f;
    if (h < 1.0/6.0) {
        rgb = vec3f(c, x, 0.0);
    } else if (h < 2.0/6.0) {
        rgb = vec3f(x, c, 0.0);
    } else if (h < 3.0/6.0) {
        rgb = vec3f(0.0, c, x);
    } else if (h < 4.0/6.0) {
        rgb = vec3f(0.0, x, c);
    } else if (h < 5.0/6.0) {
        rgb = vec3f(x, 0.0, c);
    } else {
        rgb = vec3f(c, 0.0, x);
    }

    return rgb + vec3f(m, m, m);
}

fn rgb2hsv(rgb: vec3f) -> vec3f {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;
    
    let maxC = max(r, max(g, b));
    let minC = min(r, min(g, b));
    let delta = maxC - minC;

    var h: f32 = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = ((g - b) / delta) % 6.0 / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    if (h < 0.0) { h = h + 1.0; }

    var s: f32 = 0.0;
    if (maxC != 0.0) {
        s = delta / maxC;
    }
    let v = maxC;

    return vec3f(h, s, v);
}

fn linearToSrgb(linear: vec3f) -> vec3f {
    var srgb: vec3f;
    if (linear.r <= 0.0031308) { srgb.r = linear.r * 12.92; } 
    else { srgb.r = 1.055 * pow(linear.r, 1.0 / 2.4) - 0.055; }
    if (linear.g <= 0.0031308) { srgb.g = linear.g * 12.92; }
    else { srgb.g = 1.055 * pow(linear.g, 1.0 / 2.4) - 0.055; }
    if (linear.b <= 0.0031308) { srgb.b = linear.b * 12.92; }
    else { srgb.b = 1.055 * pow(linear.b, 1.0 / 2.4) - 0.055; }
    return srgb;
}

fn srgbToLinear(srgb: vec3f) -> vec3f {
    var linear: vec3f;
    if (srgb.r <= 0.04045) { linear.r = srgb.r / 12.92; }
    else { linear.r = pow((srgb.r + 0.055) / 1.055, 2.4); }
    if (srgb.g <= 0.04045) { linear.g = srgb.g / 12.92; }
    else { linear.g = pow((srgb.g + 0.055) / 1.055, 2.4); }
    if (srgb.b <= 0.04045) { linear.b = srgb.b / 12.92; }
    else { linear.b = pow((srgb.b + 0.055) / 1.055, 2.4); }
    return linear;
}

// oklab transform
fn linear_srgb_from_oklab(c: vec3f) -> vec3f {
    let fwdA = mat3x3f(
        1.0, 1.0, 1.0,
        0.3963377774, -0.1055613458, -0.0894841775,
        0.2158037573, -0.0638541728, -1.2914855480
    );
    let fwdB = mat3x3f(
        4.0767245293, -1.2681437731, -0.0041119885,
        -3.3072168827, 2.6093323231, -0.7034763098,
        0.2307590544, -0.3411344290, 1.7068625689
    );
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn pal(t_in: f32) -> vec3f {
    let a = u.paletteOffset;
    let b = u.paletteAmp;
    let c = u.paletteFreq;
    let d = u.palettePhase;

    let t = t_in * f32(u.repeatPalette) + u.rotatePalette * 0.01;
    var color = a + b * cos(6.28318 * (c * t + d));

    if (u.paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (u.paletteMode == 2) {
        color.y = color.y * -0.509 + 0.276;
        color.z = color.z * -0.509 + 0.198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    }

    return color;
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / u.resolution;

    var color = textureSample(inputTex, samp, uv);

    if (f32(u.levels) != 0.0) {
        color = vec4f(posterize(color.rgb, f32(u.levels)), color.a);
    }

    let bright = rgb2hsv(color.rgb).b;

    if (u.dither == 1) {
        color = vec4f(color.rgb * vec3f(step(0.5, bright)), color.a);
    } else if (u.dither == 2) {
        color = vec4f(color.rgb * vec3f(step(random(fragCoord.xy), bright)), color.a);
    } else if (u.dither == 3) {
        color = vec4f(color.rgb * vec3f(step(periodicFunction(random(fragCoord.xy) + u.time), bright)), color.a);
    } else if (u.dither == 4) {
        let coord = (fragCoord.xy % 4.0) - 0.5;
        if (bright < 0.12) {
            color = vec4f(vec3f(0.0), color.a);
        } else if (bright < 0.24) {
            if (coord.x == 1.0 && coord.y == 1.0) { } else { color = vec4f(vec3f(0.0), color.a); }
        } else if (bright < 0.36) {
            if ((coord.x == 1.0 && coord.y == 1.0) || (coord.x == 3.0 && coord.y == 3.0)) { } else { color = vec4f(vec3f(0.0), color.a); }
        } else if (bright < 0.48) {
            if ((coord.x == 1.0 || coord.x == 3.0) && (coord.y == 1.0 || coord.y == 3.0)) { } else { color = vec4f(vec3f(0.0), color.a); }
        } else if (bright < 0.60) {
            if ((coord.x == 1.0 || coord.x == 3.0) && (coord.y == 1.0 || coord.y == 3.0)) { color = vec4f(vec3f(0.0), color.a); }
        } else if (bright < 0.72) {
            if ((coord.x == 1.0 && coord.y == 1.0) || (coord.x == 3.0 && coord.y == 3.0)) { color = vec4f(vec3f(0.0), color.a); }
        } else if (bright < 0.84) {
            if (coord.x == 1.0 && coord.y == 1.0) { color = vec4f(vec3f(0.0), color.a); }
        }
    }

    // color mode
    if (u.colorMode == 0) {
        color = vec4f(vec3f(rgb2hsv(color.rgb).b), color.a);
    } else if (u.colorMode == 1) {
        color = vec4f(srgbToLinear(color.rgb), color.a);
    } else if (u.colorMode == 3) {
        var c = color.rgb;
        c.g = c.g * -0.509 + 0.276;
        c.b = c.b * -0.509 + 0.198;
        c = linear_srgb_from_oklab(c);
        c = linearToSrgb(c);
        color = vec4f(c, color.a);
    } else if (u.colorMode == 4) {
        var d = rgb2hsv(color.rgb).b;
        if (u.cyclePalette == -1) {
            d += u.time;
        } else if (u.cyclePalette == 1) {
            d -= u.time;
        }
        color = vec4f(pal(d), color.a);
    }

    var hsv = rgb2hsv(color.rgb);
    hsv.x = (hsv.x * mapVal(u.hueRange, 0.0, 200.0, 0.0, 2.0) + (u.hueRotation / 360.0)) % 1.0;
    color = vec4f(hsv2rgb(hsv), color.a);

    if (u.invert != 0) {
        color = vec4f(vec3f(1.0) - color.rgb, color.a);
    }

    color = vec4f(brightnessContrast(color.rgb), color.a);
    color = vec4f(saturateColor(color.rgb), color.a);

    return color;
}
`}},u=`# colorLab

Color manipulation lab

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| colorMode | int | srgbDefault | mono/linearRgb/srgbDefault/oklab/palette | Color space |
| palette | palette | sulphur | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| paletteMode | int | 0 | - | - |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |
| hueRotation | float | 0 | 0-360 | Hue rotate |
| hueRange | float | 100 | 0-200 | Hue range |
| saturation | float | 0 | -100-100 | Saturation |
| invert | boolean | false | - | Invert |
| brightness | float | 0 | -100-100 | Brightness |
| contrast | float | 50 | 0-100 | Contrast |
| levels | int | 0 | 0-32 | Posterize |
| dither | int | none | none/threshold/random/randomTime/bayer | Dither |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .colorLab()
  .write(o0)

render(o0)
\`\`\`
`;if(o&&Object.keys(p).length>0){o.shaders||(o.shaders={});for(let[n,e]of Object.entries(p))o.shaders[n]={...e}}o&&u&&(o.help=u);var A="classicNoisedeck/colorLab",S="classicNoisedeck",j="colorLab",L=o;export{L as default,A as effectId,j as effectName,u as help,S as namespace};
