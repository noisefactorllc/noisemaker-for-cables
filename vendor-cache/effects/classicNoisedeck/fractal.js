/* classicNoisedeck/fractal */
var u=Object.defineProperty;var d=(t,e,a)=>e in t?u(t,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[e]=a;var n=(t,e,a)=>d(t,typeof e!="symbol"?e+"":e,a);var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var s={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var A=Math.PI*2,y=s,f=y;var l={};Object.keys(f).forEach((t,e)=>{l[t]={type:"Number",value:e}});var b={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},h={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},g={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3}},i={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:b,midiMode:h,audioBand:g,palette:l};var m={};for(let[t,e]of Object.entries(i.palette))m[t]=e.value;var o=class extends r{constructor(){super(...arguments);n(this,"name","Fractal");n(this,"namespace","classicNoisedeck");n(this,"func","fractal");n(this,"tags",["geometric"]);n(this,"openCategories",["general","rendering"]);n(this,"description","Fractal pattern generator");n(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},type:{slot:1,components:"x"},symmetry:{slot:1,components:"y"},offsetX:{slot:1,components:"z"},offsetY:{slot:1,components:"w"},centerX:{slot:2,components:"x"},centerY:{slot:2,components:"y"},zoomAmt:{slot:2,components:"z"},speed:{slot:2,components:"w"},rotation:{slot:3,components:"x"},iterations:{slot:3,components:"y"},mode:{slot:3,components:"z"},colorMode:{slot:3,components:"w"},paletteMode:{slot:4,components:"x"},cyclePalette:{slot:4,components:"y"},rotatePalette:{slot:4,components:"z"},repeatPalette:{slot:4,components:"w"},paletteOffset:{slot:5,components:"xyz"},hueRange:{slot:5,components:"w"},paletteAmp:{slot:6,components:"xyz"},levels:{slot:6,components:"w"},paletteFreq:{slot:7,components:"xyz"},bgAlpha:{slot:7,components:"w"},palettePhase:{slot:8,components:"xyz"},cutoff:{slot:8,components:"w"},bgColor:{slot:9,components:"xyz"},tileOffset:{slot:10,components:"xy"},fullResolution:{slot:10,components:"zw"}});n(this,"globals",{type:{type:"int",default:0,uniform:"type",choices:{julia:0,mandelbrot:2,newton:1},ui:{label:"type",control:"dropdown"}},symmetry:{type:"int",default:0,uniform:"symmetry",ui:{label:"symmetry",control:"slider"}},zoomAmt:{type:"float",default:0,uniform:"zoomAmt",min:0,max:130,ui:{label:"zoom",control:"slider",category:"transform"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotate",control:"slider",category:"transform"}},speed:{type:"float",default:30,uniform:"speed",min:0,max:100,zero:0,ui:{label:"speed",control:"slider"}},offsetX:{type:"float",default:70,uniform:"offsetX",min:-100,max:100,ui:{label:"offset x",control:"slider",category:"transform"}},offsetY:{type:"float",default:50,uniform:"offsetY",min:-100,max:100,ui:{label:"offset y",control:"slider",category:"transform"}},centerX:{type:"float",default:0,uniform:"centerX",min:-100,max:100,ui:{label:"center x",control:"slider",category:"transform"}},centerY:{type:"float",default:0,uniform:"centerY",min:-100,max:100,ui:{label:"center y",control:"slider",category:"transform"}},mode:{type:"int",default:0,uniform:"mode",choices:{iter:0,z:1},ui:{label:"mode",control:"dropdown",category:"rendering"}},iterations:{type:"int",default:50,uniform:"iterations",min:1,max:50,ui:{label:"iterations",control:"slider",category:"rendering"}},colorMode:{type:"int",default:4,uniform:"colorMode",choices:{mono:0,palette:4,hsv:6},ui:{label:"color mode",control:"dropdown",category:"color"}},palette:{type:"palette",default:12,uniform:"palette",choices:m,ui:{label:"palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},paletteMode:{type:"int",default:0,uniform:"paletteMode",ui:{control:!1}},paletteOffset:{type:"vec3",default:[.5,.5,.5],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[0,0,0],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},hueRange:{type:"float",default:100,uniform:"hueRange",min:1,max:100,ui:{label:"hue range",control:"slider",category:"color",enabledBy:{param:"colorMode",eq:6}}},levels:{type:"int",default:0,uniform:"levels",min:0,max:32,ui:{label:"posterize",control:"slider",category:"color"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"background"}},bgAlpha:{type:"float",default:100,uniform:"bgAlpha",min:0,max:100,ui:{label:"bg opacity",control:"slider",category:"background"}},cutoff:{type:"float",default:0,uniform:"cutoff",min:0,max:100,ui:{label:"cutoff",control:"slider",category:"background"}}});n(this,"paramAliases",{fractalType:"type",backgroundColor:"bgColor",backgroundOpacity:"bgAlpha"});n(this,"passes",[{name:"render",program:"fractal",inputs:{},outputs:{fragColor:"outputTex"}}])}};var c={fractal:{glsl:`#version 300 es

/*
 * Fractal explorer shader.
 * Renders Mandelbrot and Julia sets with high precision iterations tuned for live zooming.
 * Escape radius and zoom parameters are clamped to keep iteration counts stable on stage hardware.
 */

precision highp float;
precision highp int;

uniform float time;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int type;
uniform int symmetry; // 2 3 4 5
uniform float offsetX;
uniform float offsetY;
uniform float centerX;
uniform float centerY;
uniform float zoomAmt;
uniform float speed;
uniform float rotation;
uniform int iterations;
uniform int mode;
uniform int colorMode;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;
uniform float hueRange;
uniform float levels;
uniform vec3 bgColor;
uniform float bgAlpha;
uniform float cutoff;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y


float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 rotate2D(vec2 st, float rot) {
    rot = map(rot, 0.0, 360.0, 0.0, 2.0);
    float angle = rot * PI;
    st -= vec2(0.5 * aspectRatio, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspectRatio, 0.5);
    return st;
}

float offset(vec2 st) {
    return distance(st, vec2(0.5)) * 0.25;
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
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

    //t = abs(t) + rotatePalette * 0.01;

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

// Newton - MIT License
// from https://github.com/rupak10987/Shaders/blob/main/shader_files/newton%20fractal%20p3.frag
vec2 fx(vec2 z) {
    vec2 xn = vec2(pow(z.x, 3.0) - 3.0 * z.x * pow(z.y, 2.0) - 1.0, 3.0 * pow(z.x, 2.0) * z.y - pow(z.y, 3.0));
    return xn;
}

vec2 fpx(vec2 z) {
    vec2 xn = vec2(3.0 * pow(z.x, 2.0) - 3.0 * pow(z.y, 2.0), 6.0 * z.x * z.y);
    return xn;
}

vec2 divide(vec2 z1,vec2 z2) {
    vec2 result;
    result.x = (z1.x * z2.x + z1.y * z2.y) / (pow(z2.x, 2.0) + pow(z2.y, 2.0));
    result.y = (z1.y * z2.x - z1.x * z2.y) / (pow(z2.x, 2.0) + pow(z2.y, 2.0));
    return result;
}

float newton(vec2 st) {
    st = rotate2D(st, rotation + 90.0);
    st -= vec2(0.5 * aspectRatio, 0.5);
    st *= map(zoomAmt, 0.0, 130.0, 1.0, 0.01);

    float s = map(speed, 0.0, 100.0, 0.0, 1.0);
    float offX = map(offsetX, -100.0, 100.0, -0.25, 0.25);
    float offY = map(offsetY, -100.0, 100.0, -0.25, 0.25);

    st.x += centerY * 0.01; // centerX and centerY are switched due to rotation
    st.y += centerX * 0.01;

    vec2 n = st;
    float iter = 0.0;
    vec2 tst;

    for (int i = 0; i < iterations; i++) { // was 30
        tst = divide(fx(n), fpx(n));

        // animation experiments
        tst += vec2(sin(time * TAU), cos(time * TAU)) * 0.1 * s;
        tst += vec2(offX, offY);

        if (length(tst) < 0.001)
        break;
        n = n - tst;
        iter += 1.0;
    }

    if (mode == 0) {
        return iter / float(iterations);//30.0;
    } else if (mode == 1) {
        return length(n);
    }
}
// end newton

// Julia - Public Domain
// from http://nuclear.mutantstargoat.com/articles/sdr_fract/
float julia(vec2 st) {
    
    float zoom = map(zoomAmt, 0.0, 100.0, 2.0, 0.5);
    vec2 z;
    float speedy = map(speed, 0.0, 100.0, 0.0, 1.0);
    float s = mix(speedy * 0.05, speedy * 0.125, speedy);
    float _offsetX = map(offsetX, -100.0, 100.0, -0.5, 0.5);
    float _offsetY = map(offsetY, -100.0, 100.0, -1.0, 1.0);
    vec2 c = vec2(sin(time * TAU) * s + _offsetX, cos(time * TAU) * s + _offsetY);

    st = rotate2D(st, rotation);
    st = (st - vec2(0.5 * aspectRatio, 0.5)) * zoom;

    z.x = st.x + map(centerX, -100.0, 100.0, 1.0, -1.0);
    z.y = st.y + map(centerY, -100.0, 100.0, 1.0, -1.0);

    int iter;
    int iterScaled = iterations * 2;
    for (int i=0; i<iterScaled; i++) { // was 100
        iter = i;
        float x = (z.x * z.x - z.y * z.y) + c.x;
        float y = (z.y * z.x + z.x * z.y) + c.y;

        if((x * x + y * y) > 4.0) break;
        z.x = x;
        z.y = y;
    }


    if ((iterScaled - iter) < int(cutoff)) {
        return 1.0;
    }

    if (mode == 0) {
        return float(iter) / float(iterScaled);//100.0;
    } else if (mode == 1) {

        return length(z);
    }
}
// end julia

// Mandelbrot - MIT License
// modified from https://github.com/darkeclipz/fractals
float mandelbrot(vec2 st) {
    float zoom = map(zoomAmt, 0.0, 100.0, 2.0, 0.5);
    float speedy = map(speed, 0.0, 100.0, 0.0, 1.0);
    float s = mix(speedy * 0.05, speedy * 0.125, speedy);

    st = rotate2D(st, rotation);
    st.y = st.y * 2.0 - 1.0;
    st.x = st.x * 2.0 - aspectRatio;

    vec2 z = vec2(0.0);
    vec2 c = zoom * st - vec2(centerX + 50.0, centerY) * 0.01;
    z += vec2(sin(time * TAU), cos(time * TAU)) * s; // animate
    
    float i = 0.0;
    for (i = 0.0; i < float(iterations); i++) { // was 64
        //z.x += map(offsetX, -100.0, 100.0, -1.0, 1.0);
        //z.y += map(offsetY, -100.0, 100.0, -1.0, 1.0);

        z = mat2(z, -z.y, z.x) * z + c;

        if (dot(z, z) > 4.0 * 4.0) {
            break;
        }
    }

    if (i == float(iterations)) { // was 64
        //i = 0.0;
        return 1.0;
    }

    if (mode == 0) {
        return i/float(iterations);//64.0;
    } else if (mode == 1) {
        return length(z) / float(iterations);
    }
}
// end mandelbrot

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution.y;

    float blend = periodicFunction(time - offset(st));

    float d;
    if (type == 0) {
        d = julia(st);
    } else if (type == 1) {
        d = newton(st);
    } else {
        d = mandelbrot(st);
    }

    if (d == 1.0) {
        fragColor = vec4(bgColor, bgAlpha * 0.01);
        return;
    }

    if (cyclePalette == -1) {
        d -= time;
    } else if (cyclePalette == 1) {
        d += time;
    }

    d = d * repeatPalette + rotatePalette * 0.01;
    d = fract(d);

    if (levels > 0.0) {
        float lev = levels + 1.0;
        d = floor(d * lev) / lev;
    }

    if (colorMode == 0) {
        // grayscale
        color.rgb = vec3(fract(d));
    } else if (colorMode == 4) {
        // palette
        color.rgb = pal(d);
    } else if (colorMode == 6) {
        // hsv
        d *= (hueRange * 0.01);
        color.rgb = hsv2rgb(vec3(d, 1.0, 1.0));
    }


    

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL fractal explorer shader.
 * Matches the GLSL fractal math, including smooth coloring and bailout logic, for cross-backend parity.
 * Normalization of zoom and offset inputs keeps the complex plane mapping consistent between WebGL and WebGPU.
 */

struct Uniforms {
    // Contiguous vec4 packing for easier uniform buffer mapping:
    // 0: resolution.xy, time, (unused)
    // 1: fractalType, symmetry, offsetX, offsetY
    // 2: centerX, centerY, zoomAmt, speed
    // 3: rotation, iterations, mode, colorMode
    // 4: paletteMode, cyclePalette, rotatePalette, repeatPalette
    // 5: paletteOffset.xyz, hueRange
    // 6: paletteAmp.xyz, levels
    // 7: paletteFreq.xyz, backgroundOpacity
    // 8: palettePhase.xyz, cutoff
    // 9: backgroundColor.xyz, (unused)
    data: array<vec4<f32>, 11>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn rotate2D(st0: vec2<f32>, rot: f32, aspect: f32) -> vec2<f32> {
    var st = st0;
    let r = map(rot, 0.0, 360.0, 0.0, 2.0);
    let angle = r * PI;
    st = st - vec2<f32>(0.5 * aspect, 0.5);
    let s = sin(angle);
    let c = cos(angle);
    st = mat2x2<f32>(c, s, -s, c) * st;
    st = st + vec2<f32>(0.5 * aspect, 0.5);
    return st;
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(modulo(h * 6.0, 2.0) - 1.0));
    let m = v - c;
    var rgb = vec3<f32>(0.0, 0.0, 0.0);
    if (0.0 <= h && h < 1.0/6.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (1.0/6.0 <= h && h < 2.0/6.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (2.0/6.0 <= h && h < 3.0/6.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (3.0/6.0 <= h && h < 4.0/6.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (4.0/6.0 <= h && h < 5.0/6.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else if (5.0/6.0 <= h && h < 1.0) {
        rgb = vec3<f32>(c, 0.0, x);
    }
    return rgb + vec3<f32>(m, m, m);
}

fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb = vec3<f32>(0.0, 0.0, 0.0);
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// oklab transform and inverse - Public Domain/MIT License
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

const invB = mat3x3<f32>(
    vec3<f32>(0.4121656120, 0.2118591070, 0.0883097947),
    vec3<f32>(0.5362752080, 0.6807189584, 0.2818474174),
    vec3<f32>(0.0514575653, 0.1074065790, 0.6302613616)
);

const invA = mat3x3<f32>(
    vec3<f32>(0.2104542553, 1.9779984951, 0.0259040371),
    vec3<f32>(0.7936177850, -2.4285922050, 0.7827717662),
    vec3<f32>(-0.0040720468, 0.4505937099, -0.8086757660)
);

fn oklab_from_linear_srgb(c: vec3<f32>) -> vec3<f32> {
    let lms = invB * c;
    return invA * (sign(lms) * pow(abs(lms), vec3<f32>(0.3333333333333)));
}

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}
// end oklab

fn pal(t0: f32, paletteOffset: vec3<f32>, paletteAmp: vec3<f32>, paletteFreq: vec3<f32>, palettePhase: vec3<f32>, paletteMode: i32) -> vec3<f32> {
    let color = paletteOffset + paletteAmp * cos(TAU * (paletteFreq * t0 + palettePhase));
    var col = color;
    if (paletteMode == 1) {
        col = hsv2rgb(col);
    } else if (paletteMode == 2) {
        col.g = col.g * -0.509 + 0.276;
        col.b = col.b * -0.509 + 0.198;
        col = linear_srgb_from_oklab(col);
        col = linearToSrgb(col);
    }
    return col;
}

fn fx(z: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(pow(z.x, 3.0) - 3.0 * z.x * pow(z.y, 2.0) - 1.0, 3.0 * pow(z.x, 2.0) * z.y - pow(z.y, 3.0));
}

fn fpx(z: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(3.0 * pow(z.x, 2.0) - 3.0 * pow(z.y, 2.0), 6.0 * z.x * z.y);
}

fn divide(z1: vec2<f32>, z2: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        (z1.x * z2.x + z1.y * z2.y) / (pow(z2.x, 2.0) + pow(z2.y, 2.0)),
        (z1.y * z2.x - z1.x * z2.y) / (pow(z2.x, 2.0) + pow(z2.y, 2.0))
    );
}

fn newton(st0: vec2<f32>, maxIter: i32, offsetX: f32, offsetY: f32, speed: f32, centerX: f32, centerY: f32, zoomAmt: f32, rotation: f32, time: f32, mode: i32, aspect: f32) -> f32 {
    var st = rotate2D(st0, rotation + 90.0, aspect);
    st = st - vec2<f32>(0.5 * aspect, 0.5);
    st = st * map(zoomAmt, 0.0, 130.0, 1.0, 0.01);
    let s = map(speed, 0.0, 100.0, 0.0, 1.0);
    let offX = map(offsetX, -100.0, 100.0, -0.25, 0.25);
    let offY = map(offsetY, -100.0, 100.0, -0.25, 0.25);
    st.x = st.x + centerY * 0.01;
    st.y = st.y + centerX * 0.01;
    var n = st;
    var iterCount = 0.0;
    var tst = vec2<f32>(0.0, 0.0);
    for (var i: i32 = 0; i < maxIter; i = i + 1) {
        tst = divide(fx(n), fpx(n));
        tst = tst + vec2<f32>(sin(time * TAU), cos(time * TAU)) * 0.1 * s;
        tst = tst + vec2<f32>(offX, offY);
        if (length(tst) < 0.001) {
            break;
        }
        n = n - tst;
        iterCount = iterCount + 1.0;
    }
    if (mode == 0) {
        if (maxIter == 0) {
            return 0.0;
        }
        return iterCount / f32(maxIter);
    } else {
        return length(n);
    }
}

fn julia(st0: vec2<f32>, zoomAmt: f32, speed: f32, offsetX: f32, offsetY: f32, rotation: f32, centerX: f32, centerY: f32, maxIter: i32, cutoff: f32, time: f32, mode: i32, aspect: f32) -> f32 {
    let zoom = map(zoomAmt, 0.0, 100.0, 2.0, 0.5);
    let speedy = map(speed, 0.0, 100.0, 0.0, 1.0);
    let s = mix(speedy * 0.05, speedy * 0.125, speedy);
    let _offsetX = map(offsetX, -100.0, 100.0, -0.5, 0.5);
    let _offsetY = map(offsetY, -100.0, 100.0, -1.0, 1.0);
    let c = vec2<f32>(sin(time * TAU) * s + _offsetX, cos(time * TAU) * s + _offsetY);
    var st = rotate2D(st0, rotation, aspect);
    st = (st - vec2<f32>(0.5 * aspect, 0.5)) * zoom;
    var z = vec2<f32>(
        st.x + map(centerX, -100.0, 100.0, 1.0, -1.0),
        st.y + map(centerY, -100.0, 100.0, 1.0, -1.0)
    );
    var iterCount = 0;
    let iterScaled = maxIter * 2;
    for (var i: i32 = 0; i < iterScaled; i = i + 1) {
        iterCount = i;
        let x = (z.x * z.x - z.y * z.y) + c.x;
        let y = (z.y * z.x + z.x * z.y) + c.y;
        if ((x * x + y * y) > 4.0) {
            break;
        }
        z.x = x;
        z.y = y;
    }
    if ((iterScaled - iterCount) < i32(cutoff)) {
        return 1.0;
    }
    if (mode == 0) {
        if (iterScaled == 0) {
            return 0.0;
        }
        return f32(iterCount) / f32(iterScaled);
    } else {
        return length(z);
    }
}

fn mandelbrot(st0: vec2<f32>, zoomAmt: f32, speed: f32, rotation: f32, centerX: f32, centerY: f32, iter: i32, time: f32, mode: i32, aspect: f32) -> f32 {
    let zoom = map(zoomAmt, 0.0, 100.0, 2.0, 0.5);
    let speedy = map(speed, 0.0, 100.0, 0.0, 1.0);
    let s = mix(speedy * 0.05, speedy * 0.125, speedy);
    var st = rotate2D(st0, rotation, aspect);
    st.y = st.y * 2.0 - 1.0;
    st.x = st.x * 2.0 - aspect;
    var z = vec2<f32>(0.0, 0.0);
    var c = zoom * st - vec2<f32>(centerX + 50.0, centerY) * 0.01;
    z = z + vec2<f32>(sin(time * TAU), cos(time * TAU)) * s;
    var i = 0.0;
    for (i = 0.0; i < f32(iter); i = i + 1.0) {
        let m = mat2x2<f32>(z.x, z.y, -z.y, z.x);
        z = m * z + c;
        if (dot(z, z) > 16.0) {
            break;
        }
    }
    if (i == f32(iter)) {
        return 1.0;
    }
    if (mode == 0) {
        return i / f32(iter);
    } else {
        return length(z) / f32(iter);
    }
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let fractalType = i32(uniforms.data[1].x);
    let symmetry = i32(uniforms.data[1].y); // unused
    let offsetX = uniforms.data[1].z;
    let offsetY = uniforms.data[1].w;
    let centerX = uniforms.data[2].x;
    let centerY = uniforms.data[2].y;
    let zoomAmt = uniforms.data[2].z;
    let speed = uniforms.data[2].w;
    let rotation = uniforms.data[3].x;
    let iterations = i32(uniforms.data[3].y);
    let mode = i32(uniforms.data[3].z);
    let colorMode = i32(uniforms.data[3].w);

    let paletteMode = i32(uniforms.data[4].x);
    let cyclePalette = i32(uniforms.data[4].y);
    let rotatePalette = uniforms.data[4].z;
    let repeatPalette = uniforms.data[4].w;
    var paletteOffset = uniforms.data[5].xyz;
    let hueRange = uniforms.data[5].w;
    var paletteAmp = uniforms.data[6].xyz;
    let levels = uniforms.data[6].w;
    var paletteFreq = uniforms.data[7].xyz;
    let backgroundOpacity = uniforms.data[7].w;
    var palettePhase = uniforms.data[8].xyz;
    let cutoff = uniforms.data[8].w;
    let backgroundColor = uniforms.data[9].xyz;
    let tileOffset = uniforms.data[10].xy;
    let fullResolution = uniforms.data[10].zw;
    let aspect = fullResolution.x / fullResolution.y;

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    var st = (pos.xy + tileOffset) / fullResolution.y;
    var d = 0.0;
    if (fractalType == 0) {
        d = julia(st, zoomAmt, speed, offsetX, offsetY, rotation, centerX, centerY, iterations, cutoff, time, mode, aspect);
    } else if (fractalType == 1) {
        d = newton(st, iterations, offsetX, offsetY, speed, centerX, centerY, zoomAmt, rotation, time, mode, aspect);
    } else {
        d = mandelbrot(st, zoomAmt, speed, rotation, centerX, centerY, iterations, time, mode, aspect);
    }
    if (d == 1.0) {
        color = vec4<f32>(backgroundColor, backgroundOpacity * 0.01);
    } else {
        var dd = d;
        if (cyclePalette == -1) {
            dd = dd - time;
        } else if (cyclePalette == 1) {
            dd = dd + time;
        }
        dd = dd * repeatPalette + rotatePalette * 0.01;
        dd = fract(dd);
        if (levels > 0.0) {
            let lev = levels + 1.0;
            dd = floor(dd * lev) / lev;
        }
        if (colorMode == 0) {
            color = vec4<f32>(vec3<f32>(fract(dd)), color.a);
        } else if (colorMode == 4) {
            color = vec4<f32>(pal(dd, paletteOffset, paletteAmp, paletteFreq, palettePhase, paletteMode), color.a);
        } else if (colorMode == 6) {
            let d2 = dd * (hueRange * 0.01);
            color = vec4<f32>(hsv2rgb(vec3<f32>(d2, 1.0, 1.0)), color.a);
        }
    }
    var st2 = pos.xy / resolution;

    return color;
}
`}},p=`# fractal

Fractal pattern generator

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | julia | julia/mandelbrot/newton | Type |
| symmetry | int | 0 | - | Symmetry |
| zoomAmt | float | 0 | 0-130 | Zoom |
| rotation | float | 0 | -180-180 | Rotate |
| speed | float | 30 | 0-100 | Speed |
| offsetX | float | 70 | -100-100 | Offset x |
| offsetY | float | 50 | -100-100 | Offset y |
| centerX | float | 0 | -100-100 | Center x |
| centerY | float | 0 | -100-100 | Center y |
| mode | int | iter | iter/z | Mode |
| iterations | int | 50 | 1-50 | Iterations |
| colorMode | int | palette | mono/palette/hsv | Color space |
| palette | palette | darkSatin | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| paletteMode | int | 0 | - | - |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |
| hueRange | float | 100 | 1-100 | Hue range |
| levels | int | 0 | 0-32 | Posterize |
| bgColor | color | 0,0,0 | - | Bkg color |
| bgAlpha | float | 100 | 0-100 | Bkg opacity |
| cutoff | float | 0 | 0-100 | Cutoff |

## Usage

\`\`\`
search classicNoisedeck, synth

fractal()
  .write(o0)

render(o0)
\`\`\`
`;if(o&&Object.keys(c).length>0){o.shaders||(o.shaders={});for(let[t,e]of Object.entries(c))o.shaders[t]={...e}}o&&p&&(o.help=p);var O="classicNoisedeck/fractal",T="classicNoisedeck",R="fractal",S=o;export{S as default,O as effectId,R as effectName,p as help,T as namespace};
