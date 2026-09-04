/* classicNoisedeck/shapeMixer */
var m=Object.defineProperty;var p=(n,e,r)=>e in n?m(n,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):n[e]=r;var o=(n,e,r)=>p(n,typeof e!="symbol"?e+"":e,r);var a=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var l={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var F=Math.PI*2,x=l,s=x;var i={};Object.keys(s).forEach((n,e)=>{i[n]={type:"Number",value:e}});var b={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},h={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},g={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3},raw:{type:"Number",value:4}},f={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:b,midiMode:h,audioBand:g,palette:i};var c={};for(let[n,e]of Object.entries(f.palette))c[n]=e.value;var t=class extends a{constructor(){super(...arguments);o(this,"name","ShapeMixer");o(this,"namespace","classicNoisedeck");o(this,"func","shapeMixer");o(this,"tags",["blend","geometric"]);o(this,"description","Shape-based mixing");o(this,"globals",{tex:{type:"surface",default:"none",ui:{label:"source b"}},blendMode:{type:"int",default:2,uniform:"blendMode",choices:{add:0,divide:1,max:2,min:3,mix:4,mod:5,multiply:6,reflect:7,refract:8,subtract:9},ui:{label:"blend mode",control:"dropdown"}},loopOffset:{type:"int",default:10,define:"LOOP_OFFSET",choices:{none:0,"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseBSpline3x3:350,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"shape",control:"dropdown"}},loopScale:{type:"float",default:80,uniform:"loopScale",min:1,max:100,ui:{label:"shape scale",control:"slider"}},wrap:{type:"boolean",default:!0,uniform:"wrap",ui:{label:"noise wrap",control:"checkbox",enabledBy:{param:"loopOffset",in:[300,310,320,350]}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"noise seed",control:"slider",enabledBy:{param:"loopOffset",in:[300,310,320,350,370,380]}}},animate:{type:"int",default:1,uniform:"animate",choices:{off:0,forward:1,backward:-1},ui:{label:"animate",control:"dropdown"}},palette:{type:"palette",default:41,uniform:"palette",choices:c,ui:{label:"palette",control:"dropdown",category:"palette"}},paletteMode:{type:"int",default:0,uniform:"paletteMode",ui:{control:!1}},paletteOffset:{type:"vec3",default:[.83,.6,.63],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[.3,.1,0],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette"}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette"}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette"}},levels:{type:"int",default:0,uniform:"levels",min:0,max:32,ui:{label:"posterize",control:"slider",category:"palette"}}});o(this,"passes",[{name:"render",program:"shapeMixer",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}])}};var d={shapeMixer:{glsl:`#version 300 es

/*
 * Shape mixer shader.
 * Combines procedural shapes and mixes them with the input feed under configurable blend modes.
 * Thresholds and rotations are normalized against aspect ratio to avoid distortions when layering.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
// LOOP_OFFSET is a compile-time define injected by the runtime (see
// definition.js \`globals.LOOP_OFFSET.define\`). Same fix as kaleido/shapes.
#ifndef LOOP_OFFSET
#define LOOP_OFFSET 10
#endif

uniform int seed;
uniform int blendMode;
uniform float loopScale;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int animate;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;
uniform float levels;
uniform bool wrap;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

// PCG PRNG - MIT License
// https://github.com/riccardoscalco/glsl-pcg-prng
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

float posterize(float d, float lev) {
    if (lev == 0.0) {
        return d;
    } else if (lev == 1.0) {
        lev = 2.0;
    }

    d = clamp(d, 0.0, 0.99);
    d *= lev;
    d = floor(d) + 0.5;
    d = d / lev;
    return d;
}

float posterize2(float d, float lev) {
    if (lev == 0.0) {
        return d;
    } else {
        lev += 0.1;
    }

    return floor(d * lev) / lev;
}

vec3 posterize2(vec3 c, float lev) {
    c.r = posterize2(c.r, lev);
    c.g = posterize2(c.g, lev);
    c.b = posterize2(c.b, lev);
    return c;
}

bool isNan(float val) {
    return (val <= 0.0 || 0.0 <= val) ? false : true;
}

 bool isInf(float val) {
    return (val != 0.0 && val * 2.0 == val) ? true : false;
}

vec3 pal(float t) {
    if (isNan(t)) {
        //return vec3(0.0, 1.0, 0.0);
        return vec3(0.0);
        //t = 0.0;
    } else if (isInf(t)) {
        //return vec3(1.0, 0.0, 0.0);
        return vec3(0.0);
        //t = 0.0;
    }

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
        color = linearToSrgb(color);
    } 

    return color;
}

float luminance(vec3 color) {
    return rgb2hsv(color).b;
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float rings(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

float circles(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

float diamonds(vec2 st, float freq) {
    st = (gl_FragCoord.xy + tileOffset) / fullResolution.y;
    st -= vec2(0.5 * aspectRatio, 0.5);
    st *= freq;
    return (cos(st.x * PI) + cos(st.y * PI));
}

float shape(vec2 st, int sides, float blend) {
    st = st * 2.0 - vec2(aspectRatio, 1.0);
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

float random(vec2 st) {
    return prng(vec3(st, 0.0)).x;
}

float f(vec2 st) {
    return random(floor(st));
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

// Simplex 2D - MIT License
// https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 
// Copyright (C) 2011 by Ashima Arts (Simplex noise)
// Copyright (C) 2011-2016 by Stefan Gustavson (Classic noise and others)
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float simplexValue(vec2 st, float freq, float s, float blend) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    vec2 uv = st * freq;
    st.x *= aspectRatio;
    uv.x += s;

    // First corner
    vec2 i  = floor(uv + dot(uv, C.yy) );
    vec2 x0 = uv -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		  + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    float v = 130.0 * dot(m, g);

    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

// end simplex

// Noisemaker value noise - MIT License
// https://github.com/noisefactorllc/noisemaker/blob/main/noisemaker/value.py
int positiveModulo(int value, int modulus) {
    if (modulus == 0) {
        return 0;
    }

    int r = value % modulus;
    return (r < 0) ? r + modulus : r;
}

vec3 randomFromLatticeWithOffset(vec2 st, float freq, ivec2 offset) {
    vec2 lattice = st * freq;
    vec2 baseFloor = floor(lattice);
    ivec2 base = ivec2(baseFloor) + offset;
    vec2 frac = lattice - baseFloor;

    int seedInt = seed;
    float seedFrac = 0.0;

    float xCombined = frac.x + seedFrac;
    int xi = base.x + seedInt + int(floor(xCombined));
    int yi = base.y;

    if (wrap) {
        int freqInt = int(freq + 0.5);

        if (freqInt > 0) {
            xi = positiveModulo(xi, freqInt);
            yi = positiveModulo(yi, freqInt);
        }
    }

    uint xBits = uint(xi);
    uint yBits = uint(yi);
    uint seedBits = uint(seed);
    uint fracBits = floatBitsToUint(seedFrac);

    uvec3 jitter = uvec3(
        (fracBits * 374761393u) ^ 0x9E3779B9u,
        (fracBits * 668265263u) ^ 0x7F4A7C15u,
        (fracBits * 2246822519u) ^ 0x94D049B4u
    );

    uvec3 state = uvec3(xBits, yBits, seedBits) ^ jitter;
    uvec3 prngState = pcg(state);
    float denom = float(0xffffffffu);
    return vec3(
        float(prngState.x) / denom,
        float(prngState.y) / denom,
        float(prngState.z) / denom
    );
}

float constant(vec2 st, float freq) {
    vec3 randTime = randomFromLatticeWithOffset(st, freq, ivec2(40, 0));

    float scaledTime = 1.0;
    if (animate == -1) {
        scaledTime = periodicFunction(randTime.x - time);
    } else if (animate == 1) {
        scaledTime = periodicFunction(randTime.x + time);
    }

    vec3 rand = randomFromLatticeWithOffset(st, freq, ivec2(0, 0));
    return periodicFunction(rand.x - scaledTime);
}

// ---- 3\xD73 quadratic B-spline interpolation ----
// Replaces legacy bicubic 4\xD74 (16 taps) with 3\xD73 kernel (9 taps)
// Performance: ~1.8\xD7 faster
// Quality: Quadratic B-spline (degree 2), C\xB9 continuous, smoothing

// Quadratic B-spline interpolation for 3 samples (degree 2, C\xB9 continuous)
float quadratic3(float p0, float p1, float p2, float t) {
    // B-spline basis functions for quadratic (3 control points)
    // Does NOT pass through control points (smoothing, not interpolating)
    float t2 = t * t;
    
    float B0 = 0.5 * (1.0 - t) * (1.0 - t);
    float B1 = 0.5 * (-2.0 * t2 + 2.0 * t + 1.0);
    float B2 = 0.5 * t2;
    
    return p0 * B0 + p1 * B1 + p2 * B2;
}

float quadratic3x3Value(vec2 st, float freq) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    
    float nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    // Row -1 (y-1)
    float v00 = constant(st + vec2(-nd, -nd), freq);
    float v10 = constant(st + vec2(0.0, -nd), freq);
    float v20 = constant(st + vec2(nd, -nd), freq);
    
    // Row 0 (y)
    float v01 = constant(st + vec2(-nd, 0.0), freq);
    float v11 = constant(st, freq);
    float v21 = constant(st + vec2(nd, 0.0), freq);
    
    // Row 1 (y+1)
    float v02 = constant(st + vec2(-nd, nd), freq);
    float v12 = constant(st + vec2(0.0, nd), freq);
    float v22 = constant(st + vec2(nd, nd), freq);
    
    // Quadratic B-spline interpolation along x for each row
    float y0 = quadratic3(v00, v10, v20, f.x);
    float y1 = quadratic3(v01, v11, v21, f.x);
    float y2 = quadratic3(v02, v12, v22, f.x);
    
    // Quadratic B-spline interpolation along y
    return quadratic3(y0, y1, y2, f.y);
}

float blendLinearOrCosine(float a, float b, float amount, int interp) {
    if (interp == 1) {
        return mix(a, b, amount);
    }

    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

float value(vec2 st, float freq, int interp) {
    vec2 st2 = st - vec2(0.5 * aspectRatio, 0.5);
    float scaledTime = 1.0;
    float d = 0.0;

    if (interp == 5) {
        // 3\xD73 quadratic B-spline (9 taps)
        d = quadratic3x3Value(st, freq);
    } else if (interp == 10) {
        if (animate == -1) {
            scaledTime = simplexValue(st, freq, float(seed) + 40.0, time);
        } else if (animate == 1) {
            scaledTime = simplexValue(st, freq, float(seed) + 40.0, -time);
        }
        d = simplexValue(st, freq, float(seed), scaledTime);
    } else {
        float x1y1 = constant(st, freq);

        if (interp == 0) {
            d = x1y1;
        } else {

            // Neighbor Distance
            float ndX = 1.0 / freq;
            float ndY = 1.0 / freq;

            float x1y2 = constant(vec2(st.x, st.y + ndY), freq);
            float x2y1 = constant(vec2(st.x + ndX, st.y), freq);
            float x2y2 = constant(vec2(st.x + ndX, st.y + ndY), freq);

            vec2 uv = st * freq;

            float a = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), interp);
            float b = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), interp);

            d = blendLinearOrCosine(a, b, fract(uv.y), interp);
        }
    }
    return d;
}

float sineNoise(vec2 st, float freq) {
    st -= vec2(aspectRatio * 0.5, 0.5);
    st *= freq;
    st += vec2(aspectRatio * 0.5, 0.5);

    vec3 r1 = prng(vec3(float(seed)));
    vec3 r2 = prng(vec3(float(seed) + 10.0));

    float scaleA = r1.x * TAU; 
    float scaleC = r1.y * TAU;
    float scaleB = r1.z * TAU;
    float scaleD = r2.x * TAU;

    float offA = r2.y * TAU;
    float offB = r2.z * TAU;
    return sin(scaleA * st.x + sin(scaleB * st.y + offA)) + sin(scaleC * st.y + sin(scaleD * st.x + offB)) * 0.5 + 0.5;
}


float offset(vec2 st, float freq) {
    st.x *= aspectRatio;

    float d = 0.0;
    if (LOOP_OFFSET == 10) {
        // circle
        d = circles(st, freq);
    } else if (LOOP_OFFSET == 20) {
        d = shape(st, 3, freq * 0.5);
    } else if (LOOP_OFFSET == 30) {
        d = (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq * 0.5;
    } else if (LOOP_OFFSET >= 40 && LOOP_OFFSET <= 80) {
        int sides = LOOP_OFFSET / 10;
        d = shape(st, sides, freq * 0.5);
    } else if (LOOP_OFFSET == 200) {
        d = st.x * freq * 0.5;
    } else if (LOOP_OFFSET == 210) {
        d = st.y * freq * 0.5;
    } else if (LOOP_OFFSET == 380) {
        return 1.0 - sineNoise(st, freq);
    } else if (LOOP_OFFSET >= 300 && LOOP_OFFSET <= 370) {
        int idx = (LOOP_OFFSET - 300) / 10;
        int interp = idx <= 6 ? idx : idx + 3;
        d = 1.0 - value(st, freq, interp);
    } else if (LOOP_OFFSET == 400) {
        // rings
        d = 1.0 - rings(st, freq);
    } else if (LOOP_OFFSET == 410) {
        // sine
        d = 1.0 - diamonds(st, freq) * 0.5 + 0.5;
    }
    
    return d;
}


vec3 blend(vec3 color1, vec3 color2, int mode, float factor) {
    vec3 color = vec3(0.0);

    factor = 1.0 - factor;

    if (mode == 0) {
        // add
        color = color1 + color2 * factor;
    } else if (mode == 1) {
        // divide
        color = color1 / color2 * factor;
    } else if (mode == 2) {
        // max
        color =  max(color1, color2 * factor);
    } else if (mode == 3) {
        // min
        color = min(color1, color2 * factor);
    } else if (mode == 4) {
        // mix
        factor = clamp(factor, 0.0, 1.0);
        color = mix(color1, color2, factor);
    } else if (mode == 5) {
        // mod
        color = mod(color1, color2 * factor);
    } else if (mode == 6) {
        // multiply
        color = color1 * color2 * factor;
    } else if (mode == 7) {
        // reflect
        color = reflect(color1, color2 * factor);
    } else if (mode == 8) {
        // refract
        color = refract(color1, color2, factor);
    } else if (mode == 9) {
        // subtract
        color = color1 - color2 * factor;
    } else {
        factor = clamp(factor, 0.0, 1.0);
        color = mix(color1, color2, factor);
    }

    return color;
}


float blend(float color1, float color2, int mode, float factor) {
    float color = 0.0;

    factor = 1.0 - factor;

    if (mode == 0) {
        // add
        color = color1 + color2 * factor;
    } else if (mode == 1) {
        // divide
        color2 = max(0.1, color2 * factor);
        color = color1 / color2;
    } else if (mode == 2) {
        // max
        color =  max(color1, color2 * factor);
    } else if (mode == 3) {
        // min
        color = min(color1, color2 * factor);
    } else if (mode == 4) {
        // mix
        factor = clamp(factor, 0.0, 1.0);
        color = mix(color1, color2, factor);
    } else if (mode == 5) {
        // mod
        color2 = max(0.1, color2 * factor);
        color = mod(color1, color2);
    } else if (mode == 6) {
        // multiply
        color = color1 * color2 * factor;
    } else if (mode == 7) {
        // reflect
        color = reflect(color1, color2 * factor);
    } else if (mode == 8) {
        // refract
        color = refract(color1, color2, factor);
    } else if (mode == 9) {
        // subtract
        color = color1 - color2 * factor;
    } else {
        factor = clamp(factor, 0.0, 1.0);
        color = mix(color1, color2, factor);
    }

    return color;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution;

    vec4 color1 = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 color2 = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    float freq = 1.0;
    if (LOOP_OFFSET == 350) {
        freq = map(loopScale, 1.0, 100.0, 12.0, 0.5);
    } else {
        freq = map(loopScale, 1.0, 100.0, 10.0, 2.0);
    }
    if (LOOP_OFFSET >= 300 && LOOP_OFFSET < 340 && wrap) {
        freq = floor(freq);  // for seamless noise
        freq *= 2.0;
    }

    float t = 1.0;
    if (animate == -1) {
        t = time + offset(st, freq);
    } else if (animate == 1) {
        t = time - offset(st, freq);
    } else {
        t = offset(st, freq);
    }
    float blendy = periodicFunction(t);

    if (LOOP_OFFSET == 0) {
        blendy = 0.5;
    }

    // avg color of 1 and 2 and blend with float version of blend, then apply palette
    float avg1 = luminance(color1.rgb);
    float avg2 = luminance(color2.rgb);
    float avgMix = blend(avg1, avg2, blendMode, blendy);
    float d = posterize(avgMix, levels);

    if (paletteMode == 4) {
        color.rgb = blend(color1.rgb, color2.rgb, blendMode, blendy * 0.5);

        color.rgb = rgb2hsv(color.rgb);
        color.r += rotatePalette * 0.01;

        if (cyclePalette == -1) {
            color.r = mod(color.r + time, 1.0);
        } else if (cyclePalette == 1) {
            color.r = mod(color.r - time, 1.0);
        } 

        color.rgb = hsv2rgb(color.rgb);
        color.rgb = posterize2(color.rgb, levels);
    } else {
        if (cyclePalette == -1) {
            color.rgb = pal(d + time);
        } else if (cyclePalette == 1) { 
            color.rgb = pal(d - time);
        } else {
            color.rgb = pal(d);
        }
    }

    color.a = max(color1.a, color2.a);
    
    fragColor = color;
}
`,wgsl:`/*
 * Shape mixer shader (WGSL port).
 * Combines procedural shapes and mixes them with the input feed under configurable blend modes.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> u: Uniforms;

struct Uniforms {
    time: f32,            
    deltaTime: f32,       
    frame: i32,           
    _pad0: f32,           // pad before resolution (vec2 needs 8-byte align)
    resolution: vec2f,    
    aspect: f32,          
    blendMode: i32,       
    loopOffset: i32,      
    loopScale: f32,
    wrap: i32,
    seed: i32,
    animate: i32,
    palette: i32,
    paletteMode: i32,
    _pad1: f32,           // pad to 16-byte alignment for vec3f
    paletteOffset: vec3f,
    _pad2: f32,
    paletteAmp: vec3f,
    _pad3: f32,
    paletteFreq: vec3f,
    _pad4: f32,
    palettePhase: vec3f,
    cyclePalette: i32,
    rotatePalette: f32,
    repeatPalette: i32,
    levels: i32,
}

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn aspectRatio() -> f32 {
    return u.resolution.x / u.resolution.y;
}

fn mapRange(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn periodicFunction(p: f32) -> f32 {
    return mapRange(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

// PCG PRNG
fn pcg(v_in: vec3u) -> vec3u {
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
    return vec3f(pcg(vec3u(p))) / f32(0xffffffffu);
}

fn hsv2rgb(hsv: vec3f) -> vec3f {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
    let m = v - c;
    var rgb: vec3f;
    if (h < 1.0/6.0) { rgb = vec3f(c, x, 0.0); }
    else if (h < 2.0/6.0) { rgb = vec3f(x, c, 0.0); }
    else if (h < 3.0/6.0) { rgb = vec3f(0.0, c, x); }
    else if (h < 4.0/6.0) { rgb = vec3f(0.0, x, c); }
    else if (h < 5.0/6.0) { rgb = vec3f(x, 0.0, c); }
    else { rgb = vec3f(c, 0.0, x); }
    return rgb + vec3f(m);
}

fn rgb2hsv(rgb: vec3f) -> vec3f {
    let maxC = max(rgb.r, max(rgb.g, rgb.b));
    let minC = min(rgb.r, min(rgb.g, rgb.b));
    let delta = maxC - minC;
    var h = 0.0;
    if (delta != 0.0) {
        if (maxC == rgb.r) { h = ((rgb.g - rgb.b) / delta) % 6.0 / 6.0; }
        else if (maxC == rgb.g) { h = ((rgb.b - rgb.r) / delta + 2.0) / 6.0; }
        else { h = ((rgb.r - rgb.g) / delta + 4.0) / 6.0; }
    }
    let s = select(0.0, delta / maxC, maxC != 0.0);
    return vec3f(h, s, maxC);
}

fn linearToSrgb(linear: vec3f) -> vec3f {
    var srgb: vec3f;
    srgb.x = select(1.055 * pow(linear.x, 1.0/2.4) - 0.055, linear.x * 12.92, linear.x <= 0.0031308);
    srgb.y = select(1.055 * pow(linear.y, 1.0/2.4) - 0.055, linear.y * 12.92, linear.y <= 0.0031308);
    srgb.z = select(1.055 * pow(linear.z, 1.0/2.4) - 0.055, linear.z * 12.92, linear.z <= 0.0031308);
    return srgb;
}

const fwdA: mat3x3f = mat3x3f(
    vec3f(1.0, 1.0, 1.0),
    vec3f(0.3963377774, -0.1055613458, -0.0894841775),
    vec3f(0.2158037573, -0.0638541728, -1.2914855480)
);
const fwdB: mat3x3f = mat3x3f(
    vec3f(4.0767245293, -1.2681437731, -0.0041119885),
    vec3f(-3.3072168827, 2.6093323231, -0.7034763098),
    vec3f(0.2307590544, -0.3411344290, 1.7068625689)
);
const invB: mat3x3f = mat3x3f(
    vec3f(0.4121656120, 0.2118591070, 0.0883097947),
    vec3f(0.5362752080, 0.6807189584, 0.2818474174),
    vec3f(0.0514575653, 0.1074065790, 0.6302613616)
);
const invA: mat3x3f = mat3x3f(
    vec3f(0.2104542553, 1.9779984951, 0.0259040371),
    vec3f(0.7936177850, -2.4285922050, 0.7827717662),
    vec3f(-0.0040720468, 0.4505937099, -0.8086757660)
);

fn oklab_from_linear_srgb(c: vec3f) -> vec3f {
    let lms = invB * c;
    return invA * (sign(lms) * pow(abs(lms), vec3f(0.333333)));
}

fn linear_srgb_from_oklab(c: vec3f) -> vec3f {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn pal(t_in: f32) -> vec3f {
    var t = t_in * f32(u.repeatPalette) + u.rotatePalette * 0.01;
    var color = u.paletteOffset + u.paletteAmp * cos(TAU * (u.paletteFreq * t + u.palettePhase));
    if (u.paletteMode == 1) { color = hsv2rgb(color); }
    else if (u.paletteMode == 2) {
        color.g = color.g * -0.509 + 0.276;
        color.b = color.b * -0.509 + 0.198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    }
    return color;
}

fn luminance(color: vec3f) -> f32 {
    return rgb2hsv(color).b;
}

fn posterize(d_in: f32, levIn: f32) -> f32 {
    var lev = levIn;
    if (lev == 0.0) { return d_in; }
    else if (lev == 1.0) { lev = 2.0; }
    let d = clamp(d_in, 0.0, 0.99);
    return (floor(d * lev) + 0.5) / lev;
}

fn posterize2(d: f32, levIn: f32) -> f32 {
    if (levIn == 0.0) { return d; }
    let lev = levIn + 0.1;
    return floor(d * lev) / lev;
}

fn posterize2_vec3(c: vec3f, lev: f32) -> vec3f {
    return vec3f(posterize2(c.r, lev), posterize2(c.g, lev), posterize2(c.b, lev));
}

// Shapes
fn rings(st: vec2f, freq: f32) -> f32 {
    let dist = length(st - vec2f(0.5 * aspectRatio(), 0.5));
    return cos(dist * PI * freq);
}

fn circles(st: vec2f, freq: f32) -> f32 {
    let dist = length(st - vec2f(0.5 * aspectRatio(), 0.5));
    return dist * freq;
}

fn diamonds(st_in: vec2f, freq: f32) -> f32 {
    var st = st_in;
    st -= vec2f(0.5 * aspectRatio(), 0.5);
    st *= freq;
    return cos(st.x * PI) + cos(st.y * PI);
}

fn shape(st_in: vec2f, sides: i32, blend: f32) -> f32 {
    let st = st_in * 2.0 - vec2f(aspectRatio(), 1.0);
    let a = atan2(st.x, st.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

// Noise functions
fn positiveModulo(value: i32, modulus: i32) -> i32 {
    if (modulus == 0) { return 0; }
    var r = value % modulus;
    if (r < 0) { r += modulus; }
    return r;
}

fn randomFromLatticeWithOffset(st: vec2f, freq: f32, offset: vec2i) -> vec3f {
    let lattice = st * freq;
    let baseFloor = floor(lattice);
    var base = vec2i(baseFloor) + offset;
    let frac = lattice - baseFloor;
    let seedInt = i32(floor(f32(u.seed)));
    let seedFrac = fract(f32(u.seed));
    let xCombined = frac.x + seedFrac;
    var xi = base.x + seedInt + i32(floor(xCombined));
    var yi = base.y;
    if (u.wrap != 0) {
        let freqInt = i32(freq + 0.5);
        if (freqInt > 0) {
            xi = positiveModulo(xi, freqInt);
            yi = positiveModulo(yi, freqInt);
        }
    }
    let xBits = u32(xi);
    let yBits = u32(yi);
    let seedBits = bitcast<u32>(f32(u.seed));
    let fracBits = bitcast<u32>(seedFrac);
    let jitter = vec3u(
        (fracBits * 374761393u) ^ 0x9E3779B9u,
        (fracBits * 668265263u) ^ 0x7F4A7C15u,
        (fracBits * 2246822519u) ^ 0x94D049B4u
    );
    let state = vec3u(xBits, yBits, seedBits) ^ jitter;
    let prngState = pcg(state);
    let denom = f32(0xffffffffu);
    return vec3f(f32(prngState.x) / denom, f32(prngState.y) / denom, f32(prngState.z) / denom);
}

fn constant(st: vec2f, freq: f32) -> f32 {
    let randTime = randomFromLatticeWithOffset(st, freq, vec2i(40, 0));
    var scaledTime = 1.0;
    if (u.animate == -1) { scaledTime = periodicFunction(randTime.x - u.time); }
    else if (u.animate == 1) { scaledTime = periodicFunction(randTime.x + u.time); }
    let rand = randomFromLatticeWithOffset(st, freq, vec2i(0, 0));
    return periodicFunction(rand.x - scaledTime);
}

fn quadratic3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let B0 = 0.5 * (1.0 - t) * (1.0 - t);
    let B1 = 0.5 * (-2.0 * t2 + 2.0 * t + 1.0);
    let B2 = 0.5 * t2;
    return p0 * B0 + p1 * B1 + p2 * B2;
}

fn quadratic3x3Value(st: vec2f, freq: f32) -> f32 {
    let f = fract(st * freq);
    let nd = 1.0 / freq;
    let v00 = constant(st + vec2f(-nd, -nd), freq);
    let v10 = constant(st + vec2f(0.0, -nd), freq);
    let v20 = constant(st + vec2f(nd, -nd), freq);
    let v01 = constant(st + vec2f(-nd, 0.0), freq);
    let v11 = constant(st, freq);
    let v21 = constant(st + vec2f(nd, 0.0), freq);
    let v02 = constant(st + vec2f(-nd, nd), freq);
    let v12 = constant(st + vec2f(0.0, nd), freq);
    let v22 = constant(st + vec2f(nd, nd), freq);
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    return quadratic3(y0, y1, y2, f.y);
}

fn blendLinearOrCosine(a: f32, b: f32, amount: f32, interp: i32) -> f32 {
    if (interp == 1) { return mix(a, b, amount); }
    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

// Simplex noise
fn mod289_3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_2(x: vec2f) -> vec2f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute3(x: vec3f) -> vec3f { return mod289_3(((x * 34.0) + 1.0) * x); }

fn simplexValue(st_in: vec2f, freq: f32, s: f32, blend: f32) -> f32 {
    let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var uv = st_in * freq;
    uv.x += s;
    var i = floor(uv + dot(uv, C.yy));
    let x0 = uv - i + dot(i, C.xx);
    var i1 = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
    var x12 = x0.xyxy + C.xxzz;
    x12 = vec4f(x12.xy - i1, x12.zw);
    i = mod289_2(i);
    let p = permute3(permute3(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));
    var m = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
    m = m * m;
    m = m * m;
    let x = 2.0 * fract(p * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let ox = floor(x + 0.5);
    let a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    var g: vec3f;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;
    let v = 130.0 * dot(m, g);
    return periodicFunction(mapRange(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

fn sineNoise(st_in: vec2f, freq: f32) -> f32 {
    var st = st_in;
    st -= vec2f(aspectRatio() * 0.5, 0.5);
    st *= freq;
    st += vec2f(aspectRatio() * 0.5, 0.5);
    let r1 = prng(vec3f(f32(u.seed)));
    let r2 = prng(vec3f(f32(u.seed) + 10.0));
    let scaleA = r1.x * TAU;
    let scaleC = r1.y * TAU;
    let scaleB = r1.z * TAU;
    let scaleD = r2.x * TAU;
    let offA = r2.y * TAU;
    let offB = r2.z * TAU;
    return sin(scaleA * st.x + sin(scaleB * st.y + offA)) + sin(scaleC * st.y + sin(scaleD * st.x + offB)) * 0.5 + 0.5;
}

fn value(st: vec2f, freq: f32, interp: i32) -> f32 {
    if (interp == 5) { return quadratic3x3Value(st, freq); }
    else if (interp == 10) {
        var scaledTime = 1.0;
        if (u.animate == -1) { scaledTime = simplexValue(st, freq, f32(u.seed) + 40.0, u.time); }
        else if (u.animate == 1) { scaledTime = simplexValue(st, freq, f32(u.seed) + 40.0, -u.time); }
        return simplexValue(st, freq, f32(u.seed), scaledTime);
    }
    let x1y1 = constant(st, freq);
    if (interp == 0) { return x1y1; }
    let ndX = 1.0 / freq; let ndY = 1.0 / freq;
    let x1y2 = constant(vec2f(st.x, st.y + ndY), freq);
    let x2y1 = constant(vec2f(st.x + ndX, st.y), freq);
    let x2y2 = constant(vec2f(st.x + ndX, st.y + ndY), freq);
    let uv = st * freq;
    let a = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), interp);
    let b = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), interp);
    return blendLinearOrCosine(a, b, fract(uv.y), interp);
}

fn offset(st_in: vec2f, freq: f32) -> f32 {
    var st = st_in;
    st.x *= aspectRatio();
    if (LOOP_OFFSET == 10) { return circles(st, freq); }
    else if (LOOP_OFFSET == 20) { return shape(st, 3, freq * 0.5); }
    else if (LOOP_OFFSET == 30) { return (abs(st.x - 0.5 * aspectRatio()) + abs(st.y - 0.5)) * freq * 0.5; }
    else if (LOOP_OFFSET >= 40 && LOOP_OFFSET <= 80) {
        let sides = LOOP_OFFSET / 10;
        return shape(st, sides, freq * 0.5);
    }
    else if (LOOP_OFFSET == 200) { return st.x * freq * 0.5; }
    else if (LOOP_OFFSET == 210) { return st.y * freq * 0.5; }
    else if (LOOP_OFFSET == 380) { return 1.0 - sineNoise(st, freq); }
    else if (LOOP_OFFSET >= 300 && LOOP_OFFSET <= 370) {
        let idx = (LOOP_OFFSET - 300) / 10;
        let interp = select(idx + 3, idx, idx <= 6);
        return 1.0 - value(st, freq, interp);
    }
    else if (LOOP_OFFSET == 400) { return 1.0 - rings(st, freq); }
    else if (LOOP_OFFSET == 410) { return 1.0 - diamonds(st, freq) * 0.5 + 0.5; }
    return 0.0;
}

fn blendFloat(color1: f32, color2: f32, mode: i32, factorIn: f32) -> f32 {
    let factor = 1.0 - factorIn;
    if (mode == 0) { return color1 + color2 * factor; }
    else if (mode == 1) { let c2 = max(0.1, color2 * factor); return color1 / c2; }
    else if (mode == 2) { return max(color1, color2 * factor); }
    else if (mode == 3) { return min(color1, color2 * factor); }
    else if (mode == 4) { return mix(color1, color2, clamp(factor, 0.0, 1.0)); }
    else if (mode == 5) { let c2 = max(0.1, color2 * factor); return color1 % c2; }
    else if (mode == 6) { return color1 * color2 * factor; }
    else if (mode == 7) {
        // reflect for scalar: r = i - 2*dot(n,i)*n = i - 2*n*i*n = i*(1 - 2*n^2)
        let n = color2 * factor;
        return color1 - 2.0 * n * color1 * n;
    }
    else if (mode == 8) {
        // refract for scalar approximation
        let eta = factor;
        let cosi = color1;
        let k = 1.0 - eta * eta * (1.0 - cosi * cosi);
        if (k < 0.0) { return 0.0; }
        return eta * color1 + (eta * cosi - sqrt(k)) * color2;
    }
    else if (mode == 9) { return color1 - color2 * factor; }
    return mix(color1, color2, clamp(factor, 0.0, 1.0));
}

fn blendVec3(color1: vec3f, color2: vec3f, mode: i32, factorIn: f32) -> vec3f {
    let factor = 1.0 - factorIn;
    if (mode == 0) { return color1 + color2 * factor; }
    else if (mode == 1) { return color1 / (color2 * factor); }
    else if (mode == 2) { return max(color1, color2 * factor); }
    else if (mode == 3) { return min(color1, color2 * factor); }
    else if (mode == 4) { return mix(color1, color2, clamp(factor, 0.0, 1.0)); }
    else if (mode == 5) { return color1 % (color2 * factor); }
    else if (mode == 6) { return color1 * color2 * factor; }
    else if (mode == 7) { return reflect(color1, color2 * factor); }
    else if (mode == 8) { return refract(color1, color2, factor); }
    else if (mode == 9) { return color1 - color2 * factor; }
    return mix(color1, color2, clamp(factor, 0.0, 1.0));
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var st = fragCoord.xy / u.resolution;

    let color1 = textureSample(inputTex, samp, st);
    let color2 = textureSample(tex, samp, st);

    var freq = 1.0;
    if (LOOP_OFFSET == 350) {
        freq = mapRange(u.loopScale, 1.0, 100.0, 12.0, 0.5);
    } else {
        freq = mapRange(u.loopScale, 1.0, 100.0, 10.0, 2.0);
    }
    if (LOOP_OFFSET >= 300 && LOOP_OFFSET < 340 && u.wrap != 0) {
        freq = floor(freq) * 2.0;
    }

    var t = 1.0;
    if (u.animate == -1) { t = u.time + offset(st, freq); }
    else if (u.animate == 1) { t = u.time - offset(st, freq); }
    else { t = offset(st, freq); }
    var blendy = periodicFunction(t);

    if (LOOP_OFFSET == 0) { blendy = 0.5; }

    let avg1 = luminance(color1.rgb);
    let avg2 = luminance(color2.rgb);
    let avgMix = blendFloat(avg1, avg2, u.blendMode, blendy);
    let d = posterize(avgMix, f32(u.levels));

    var color: vec4f;

    if (u.paletteMode == 4) {
        var c = blendVec3(color1.rgb, color2.rgb, u.blendMode, blendy * 0.5);
        c = rgb2hsv(c);
        var hue = c.r + u.rotatePalette * 0.01;
        if (u.cyclePalette == -1) { hue = (hue + u.time) % 1.0; }
        else if (u.cyclePalette == 1) { hue = (hue - u.time) % 1.0; }
        c = hsv2rgb(vec3f(hue, c.g, c.b));
        c = posterize2_vec3(c, f32(u.levels));
        color = vec4f(c, max(color1.a, color2.a));
    } else {
        var palD = d;
        if (u.cyclePalette == -1) { palD = d + u.time; }
        else if (u.cyclePalette == 1) { palD = d - u.time; }
        color = vec4f(pal(palD), max(color1.a, color2.a));
    }

    return color;
}
`}},u=`# shapeMixer

Shape-based mixing

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| blendMode | int | max | add/divide/max/min/mix/mod/multiply/reflect/refract/subtract | Mode |
| loopOffset | int | circle | none/Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseBSpline3x3/noiseSimplex/noiseSine/Misc:/rings/sine | Shape |
| loopScale | float | 80 | 1-100 | Shape scale |
| animate | int | forward | off/forward/backward | Animate |
| palette | palette | skykissed | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| paletteMode | int | 0 | - | - |
| paletteOffset | vec3 | 0.83,0.6,0.63 | - | Palette offset |
| paletteAmp | vec3 | 0.5,0.5,0.5 | - | Palette amplitude |
| paletteFreq | vec3 | 1,1,1 | - | Palette frequency |
| palettePhase | vec3 | 0.3,0.1,0 | - | Palette phase |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |
| levels | int | 0 | 0-32 | Posterize |
| wrap | boolean | true | - | Noise wrap |
| seed | int | 1 | 1-100 | Noise seed |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .shapeMixer(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(d).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(d))t.shaders[n]={...e}}t&&u&&(t.help=u);var L="classicNoisedeck/shapeMixer",N="classicNoisedeck",M="shapeMixer",R=t;export{R as default,L as effectId,M as effectName,u as help,N as namespace};
