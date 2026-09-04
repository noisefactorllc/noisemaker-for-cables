/* classicNoisedeck/shapes3d */
var d=Object.defineProperty;var h=(n,e,o)=>e in n?d(n,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):n[e]=o;var a=(n,e,o)=>h(n,typeof e!="symbol"?e+"":e,o);var s=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var r={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var D=Math.PI*2,g=r,l=g;var i={};Object.keys(l).forEach((n,e)=>{i[n]={type:"Number",value:e}});var v={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},b={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},y={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3},raw:{type:"Number",value:4}},p={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:v,midiMode:b,audioBand:y,palette:i};var f={};for(let[n,e]of Object.entries(p.palette))f[n]=e.value;var t=class extends s{constructor(){super(...arguments);a(this,"name","Shapes3d");a(this,"namespace","classicNoisedeck");a(this,"func","shapes3d");a(this,"tags",["geometric"]);a(this,"description","3D geometric shapes");a(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},shapeAScale:{slot:1,components:"z"},shapeBScale:{slot:1,components:"w"},shapeAThickness:{slot:2,components:"x"},shapeBThickness:{slot:2,components:"y"},smoothness:{slot:2,components:"w"},spin:{slot:3,components:"x"},flip:{slot:3,components:"y"},spinSpeed:{slot:3,components:"z"},flipSpeed:{slot:3,components:"w"},repetition:{slot:4,components:"x"},animation:{slot:4,components:"y"},flythroughSpeed:{slot:4,components:"z"},spacing:{slot:4,components:"w"},cameraDist:{slot:5,components:"x"},bgAlpha:{slot:5,components:"y"},colorMode:{slot:5,components:"z"},weight:{slot:5,components:"w"},bgColor:{slot:6,components:"xyz"},paletteMode:{slot:6,components:"w"},paletteOffset:{slot:7,components:"xyz"},cyclePalette:{slot:7,components:"w"},paletteAmp:{slot:8,components:"xyz"},rotatePalette:{slot:8,components:"w"},paletteFreq:{slot:9,components:"xyz"},repeatPalette:{slot:9,components:"w"},palettePhase:{slot:10,components:"xyz"},tileOffset:{slot:11,components:"xy"},fullResolution:{slot:11,components:"zw"}});a(this,"globals",{shapeA:{type:"int",default:30,define:"SHAPE_A",choices:{capsuleHoriz:70,capsuleVert:60,cube:10,cylinderHoriz:50,cylinderVert:40,octahedron:80,sphere:20,torusHoriz:31,torusVert:30},ui:{label:"shape a",control:"dropdown"}},shapeB:{type:"int",default:10,define:"SHAPE_B",choices:{capsuleHoriz:70,capsuleVert:60,cube:10,cylinderHoriz:50,cylinderVert:40,octahedron:80,sphere:20,torusHoriz:31,torusVert:30},ui:{label:"shape b",control:"dropdown"}},shapeAScale:{type:"float",default:64,uniform:"shapeAScale",min:1,max:100,ui:{label:"scale a",control:"slider"}},shapeBScale:{type:"float",default:27,uniform:"shapeBScale",min:1,max:100,ui:{label:"scale b",control:"slider"}},shapeAThickness:{type:"float",default:5,uniform:"shapeAThickness",min:1,max:50,ui:{label:"thickness a",control:"slider"}},shapeBThickness:{type:"float",default:5,uniform:"shapeBThickness",min:1,max:50,ui:{label:"thickness b",control:"slider"}},blendMode:{type:"int",default:10,define:"BLEND_MODE",choices:{intersect:40,union:30,smoothIntersect:20,smoothUnion:10,aMinusB:51,bMinusA:50,smoothAMinusB:26,smoothBMinusA:25},ui:{label:"blend mode",control:"dropdown"}},smoothness:{type:"float",default:1,uniform:"smoothness",min:1,max:100,ui:{label:"smoothness",control:"slider",enabledBy:{or:[{param:"blendMode",in:[10,20,25,26]}]}}},repetition:{type:"boolean",default:!1,uniform:"repetition",ui:{label:"repeat",control:"checkbox",category:"repetition"}},animation:{type:"int",default:1,uniform:"animation",choices:{rotateScene:0,rotateShape:1},ui:{label:"rotation",control:"dropdown",category:"repetition",enabledBy:{param:"repetition",eq:!0}}},spacing:{type:"int",default:10,uniform:"spacing",min:5,max:20,ui:{label:"spacing",control:"slider",category:"repetition",enabledBy:{param:"repetition",eq:!0}}},flythroughSpeed:{type:"float",default:0,uniform:"flythroughSpeed",min:-10,max:10,ui:{label:"flythrough",control:"slider",category:"repetition",enabledBy:{and:[{param:"repetition",eq:!0},{param:"animation",eq:1}]}}},spin:{type:"float",default:0,uniform:"spin",min:-180,max:180,ui:{label:"spin",control:"slider",category:"rotation"}},spinSpeed:{type:"float",default:2,uniform:"spinSpeed",min:-10,max:10,ui:{label:"spin speed",control:"slider",category:"rotation"}},flip:{type:"int",default:0,uniform:"flip",min:-180,max:180,ui:{label:"flip",control:"slider",category:"rotation"}},flipSpeed:{type:"float",default:2,uniform:"flipSpeed",min:-10,max:10,ui:{label:"flip speed",control:"slider",category:"rotation"}},cameraDist:{type:"float",default:8,uniform:"cameraDist",min:5,max:20,ui:{label:"cam distance",control:"slider"}},bgColor:{type:"color",default:[1,1,1],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"color"}},bgAlpha:{type:"float",default:0,uniform:"bgAlpha",min:0,max:100,ui:{label:"bg opacity",control:"slider",category:"color"}},tex:{type:"surface",default:"none",ui:{label:"texture",category:"color"}},weight:{type:"float",default:0,uniform:"weight",min:0,max:100,randChance:0,ui:{label:"input weight",control:"slider",category:"color"}},colorMode:{type:"int",default:10,uniform:"colorMode",choices:{depth:0,diffuse:1,palette:10},ui:{label:"color mode",control:"dropdown",category:"color"}},palette:{type:"palette",default:40,uniform:"palette",choices:f,ui:{label:"palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:10}}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:10}}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:10}}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:10}}},paletteMode:{type:"int",default:0,uniform:"paletteMode",ui:{control:!1}},paletteOffset:{type:"vec3",default:[.83,.6,.63],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[.3,.1,0],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}}});a(this,"paramAliases",{backgroundColor:"bgColor",backgroundOpacity:"bgAlpha"});a(this,"passes",[{name:"render",program:"shapes3d",inputs:{inputTex:"tex"},outputs:{fragColor:"outputTex"}}])}};var c={shapes3d:{glsl:`#version 300 es

/*
 * GLSL 3D shapes shader.
 * Performs signed distance ray marching with configurable lighting to mirror the WGSL implementation.
 * Camera orbit controls are normalized so interactive adjustments cannot push the raymarch outside the scene bounds.
 */

precision highp float;
precision highp int;

// SHAPE_A, SHAPE_B and BLEND_MODE are compile-time defines injected by the
// runtime (see definition.js \`globals.{shapeA,shapeB,blendMode}.define\`).
// Same Knob 2 rationale as classicNoisedeck/noise: the per-raymarch-step
// dispatch on shape index/blend mode (~100 steps \xD7 2 shapes per pixel)
// inflates HLSL bytecode badly when left as runtime; baking the choice lets
// the compiler keep only the active branch.
#ifndef SHAPE_A
#define SHAPE_A 30
#endif
#ifndef SHAPE_B
#define SHAPE_B 10
#endif
#ifndef BLEND_MODE
#define BLEND_MODE 10
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float shapeAScale;
uniform float shapeBScale;
uniform float shapeAThickness;
uniform float shapeBThickness;
uniform float smoothness;
uniform float spin;
uniform float flip;
uniform float spinSpeed;
uniform float flipSpeed;
uniform bool repetition;
uniform int animation;
uniform float flythroughSpeed;
uniform float spacing;
uniform float cameraDist;
uniform vec3 bgColor;
uniform float bgAlpha;
uniform int colorMode;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;

uniform float weight;
uniform sampler2D inputTex;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

const float MIN_DIST = 0.01;
const float MAX_DIST = 200.0;
const int MAX_STEPS = 100;

struct TransformData {
    vec2 staticSpin;
    vec2 staticFlip;
    vec2 dynamicSpin;
    vec2 dynamicFlip;
    float repeatSpacing;
    float flythroughOffset;
    bool repeatBefore;
    bool repeatAfter;
    bool useFlythrough;
};

struct ShapeParams {
    float scaleA;
    float scaleB;
    float thicknessA;
    float thicknessB;
};

TransformData computeTransformData() {
    TransformData data;
    float staticSpinAngle = radians(spin);
    float staticFlipAngle = radians(flip);
    data.staticSpin = vec2(cos(staticSpinAngle), sin(staticSpinAngle));
    data.staticFlip = vec2(cos(staticFlipAngle), sin(staticFlipAngle));

    float dynamicSpinAngle = time * (spinSpeed * 0.1) * PI;
    float dynamicFlipAngle = time * (flipSpeed * 0.1) * PI;
    data.dynamicSpin = vec2(cos(dynamicSpinAngle), sin(dynamicSpinAngle));
    data.dynamicFlip = vec2(cos(dynamicFlipAngle), sin(dynamicFlipAngle));

    data.repeatSpacing = spacing;
    bool hasRepetition = repetition;
    data.repeatBefore = hasRepetition && animation == 1;
    data.repeatAfter = hasRepetition && animation == 0;

    bool enableFlythrough = hasRepetition && animation != 0 && flythroughSpeed != 0.0;
    data.flythroughOffset = enableFlythrough ? time * flythroughSpeed : 0.0;
    data.useFlythrough = enableFlythrough;

    return data;
}

ShapeParams computeShapeParams() {
    ShapeParams params;
    params.scaleA = 1.0 + shapeAScale * 0.1;
    params.scaleB = 1.0 + shapeBScale * 0.1;
    params.thicknessA = shapeAThickness;
    params.thicknessB = shapeBThickness;
    return params;
}

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

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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

float luminance(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

vec3 pal(float t) {
    vec3 a = paletteOffset;
    vec3 b = paletteAmp;
    vec3 c = paletteFreq;
    vec3 d = palettePhase;

    t = abs(t);
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
/*
// smoothmin from https://iquilezles.org/articles/smin/ - MIT License
float smin(float a, float b, float k) {
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*k*(1.0/4.0);
}

float smax(float a, float b, float k) {
    float h = exp(k * a) + exp(k * b);
    return log(h) / k;
}
*/

// from https://iquilezles.org/articles/distfunctions/ - MIT License
float smin(float d1, float d2, float k) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float ssub(float d1, float d2, float k) {
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h);
}

float smax(float d1, float d2, float k) {
    float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h);
}

// 3D distance functions - MIT License
// https://iquilezles.org/articles/distfunctions/
//
// shape3d() is split into per-define helpers shape3dA() and shape3dB(): each
// variant only emits the body of the active shape branch. The two helpers
// have the same body keyed off SHAPE_A vs SHAPE_B; they're textually
// duplicated rather than macroized because the duplication is short and the
// macro form would obscure the per-variant compile-time selection.
float shape3dA(vec3 p, vec3 origin, float scale, float thickness) {
    float d = 0.0;
    float s = scale * 0.25;
#if SHAPE_A == 20
    // sphere
    d = length(p - origin) - s;
#elif SHAPE_A == 30
    // torus - vert
    vec2 q = vec2(length(p.xy) - s, p.z);
    d = length(q) - 0.2;
#elif SHAPE_A == 31
    // torus - horiz
    vec2 q = vec2(length(p.xz) - s, p.y);
    d = length(q) - 0.2;
#elif SHAPE_A == 10
    // cube
    s *= 0.75;
    p -= clamp(p, -s, s);
    d = length(p) - 0.01;
#elif SHAPE_A == 40
    // cylinder vertical
    s *= 0.75;
    d = length(p.xz) - s;
#elif SHAPE_A == 50
    // cylinder horizontal
    s *= 0.75;
    d = max(length(p - clamp(p, -s, s)), (length(p.xy) - s));
#elif SHAPE_A == 60
    // capsule vertical
    p.y -= clamp(p.y, -scale * 0.5, scale * 0.5);
    d = length(p) - s * 0.5;
#elif SHAPE_A == 70
    // capsule horizontal
    p.x -= clamp(p.x, -scale * 0.5, scale * 0.5);
    d = length(p) - s * 0.5;
#elif SHAPE_A == 80
    // octahedron
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
#endif
    d = abs(d) - (thickness * 0.01);
    return d;
}

float shape3dB(vec3 p, vec3 origin, float scale, float thickness) {
    float d = 0.0;
    float s = scale * 0.25;
#if SHAPE_B == 20
    d = length(p - origin) - s;
#elif SHAPE_B == 30
    vec2 q = vec2(length(p.xy) - s, p.z);
    d = length(q) - 0.2;
#elif SHAPE_B == 31
    vec2 q = vec2(length(p.xz) - s, p.y);
    d = length(q) - 0.2;
#elif SHAPE_B == 10
    s *= 0.75;
    p -= clamp(p, -s, s);
    d = length(p) - 0.01;
#elif SHAPE_B == 40
    s *= 0.75;
    d = length(p.xz) - s;
#elif SHAPE_B == 50
    s *= 0.75;
    d = max(length(p - clamp(p, -s, s)), (length(p.xy) - s));
#elif SHAPE_B == 60
    p.y -= clamp(p.y, -scale * 0.5, scale * 0.5);
    d = length(p) - s * 0.5;
#elif SHAPE_B == 70
    p.x -= clamp(p.x, -scale * 0.5, scale * 0.5);
    d = length(p) - s * 0.5;
#elif SHAPE_B == 80
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
#endif
    d = abs(d) - (thickness * 0.01);
    return d;
}

float blend(float shape1, float shape2) {
#if BLEND_MODE == 10
    // smooth min (union)
    return smin(shape1, shape2, smoothness * 0.02);
#elif BLEND_MODE == 20
    // smooth max (intersect)
    return smax(shape1, shape2, smoothness * 0.01);
#elif BLEND_MODE == 25
    // smooth subtract
    return ssub(shape1, shape2, smoothness * 0.02);
#elif BLEND_MODE == 26
    // smooth subtract (flipped)
    return ssub(-shape1, shape2, smoothness * 0.02);
#elif BLEND_MODE == 30
    // min (union)
    return min(shape1, shape2);
#elif BLEND_MODE == 40
    // max (intersect)
    return max(shape1, shape2);
#elif BLEND_MODE == 50
    // subtract
    return max(-shape1, shape2);
#elif BLEND_MODE == 51
    // subtract (flipped)
    return max(shape1, -shape2);
#else
    return 0.0;
#endif
}


// raymarching

vec2 rotate2D(vec2 st, vec2 cs) {
    return vec2(st.x * cs.x - st.y * cs.y, st.x * cs.y + st.y * cs.x);
}

vec3 applyTransform(vec3 p, TransformData data) {
    if (data.useFlythrough) {
        p.z += data.flythroughOffset;
    }

    p.xz = rotate2D(p.xz, data.staticSpin);
    p.yz = rotate2D(p.yz, data.staticFlip);

    if (data.repeatBefore) {
        p -= data.repeatSpacing * round(p / data.repeatSpacing);
    }

    p.xz = rotate2D(p.xz, data.dynamicSpin);
    p.yz = rotate2D(p.yz, data.dynamicFlip);

    if (data.repeatAfter) {
        p -= data.repeatSpacing * round(p / data.repeatSpacing);
    }
    return p;
}

// get the nearest distance to the SDFs
float getDist(vec3 p, TransformData data, ShapeParams params) {
    p = applyTransform(p, data);

    float shape1 = shape3dA(p, vec3(0.0), params.scaleA, params.thicknessA);
    float shape2 = shape3dB(p, vec3(0.0), params.scaleB, params.thicknessB);

    return blend(shape1, shape2);
}

// surface normal at the given point
vec3 getNormal(vec3 p, TransformData data, ShapeParams params) {
    float epsilon = 0.01;

    // sample the distance field at nearby points
    float d = getDist(p, data, params);
    float dx = getDist(p + vec3(epsilon, 0.0, 0.0), data, params) - d;
    float dy = getDist(p + vec3(0.0, epsilon, 0.0), data, params) - d;
    float dz = getDist(p + vec3(0.0, 0.0, epsilon), data, params) - d;

    // calculate the normal using the gradient of the distance field
    return normalize(vec3(dx, dy, dz));
}

float rayMarch(vec3 rayOrigin, vec3 rayDirection, TransformData data, ShapeParams params) {
    float distAccum = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = rayOrigin + rayDirection * distAccum;
        float dist = getDist(p, data, params);
        distAccum += dist;
        // break if we are too far from the origin or too close to an SDF
        if (distAccum > MAX_DIST || dist < MIN_DIST) {
            break;
        }
    }
    return distAccum;
}
// end raymarching

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(1.0);
    vec2 st = (globalCoord - 0.5 * fullResolution.xy) / fullResolution.y;

    // ray marching - calculate distance to scene objects
    vec3 rayOrigin = vec3(0.0, 0.0, -cameraDist);
    vec3 rayDirection = normalize(vec3(st, 1.0));
    TransformData transformData = computeTransformData();
    ShapeParams shapeParams = computeShapeParams();
    float d = rayMarch(rayOrigin, rayDirection, transformData, shapeParams);

    // calculate the lighting
    vec3 p = rayOrigin + rayDirection * d;
    vec3 lightPosition = vec3(-5.0, 5.0, -5.0);
    vec3 lightVector = normalize(lightPosition - p);
    vec3 normal = getNormal(p, transformData, shapeParams);
    float diffuse = clamp(dot(normal, lightVector), 0.0, 1.0);
    

    // calculate shadows - move a small distance from SDFs and march back towards the origin
    // if dist is shorter than distance to the light, the point is in shadows
    /*
    float minDist = 0.01;
    float dist = rayMarch(p + normal * minDist * 2.0, lightVector);
    if (dist < length(lightPosition - p)) {
        diffuse *= 0.1;
    }
    */

    if (weight > 0.0) {
        // triplanar texture mapping
        vec3 localP = applyTransform(p, transformData);
        localP = localP * 0.5 + 0.5;

        vec3 colorXY = texture(inputTex, localP.xy).rgb;
        vec3 colorXZ = texture(inputTex, localP.xz).rgb;
        vec3 colorYZ = texture(inputTex, localP.yz).rgb;

        normal = abs(normal);
        color.rgb = colorXY * normal.z + colorXZ * normal.y + colorYZ * normal.x;
    }

    if (colorMode == 0) {
        // depth
        color.rgb *= vec3(1.0 - clamp(d * 0.035, 0.0, 1.0));
    } else if (colorMode == 1) {
        // diffuse
        color.rgb *= vec3(diffuse * 1.5) + 0.5;
    } else if (colorMode == 10) {
        // palette
        color.rgb *= vec3(diffuse * 1.5) + 0.5; // add 0.25 - 0.5 for ambient?
        // apply palette
        float lum = luminance(color.rgb);
        if (cyclePalette == -1) {
            lum += time;
        } else if (cyclePalette == 1) {
            lum -= time;
        }
        color.rgb *= pal(lum);
    }


    // add background color. if repeating, a bit of distance fog
    float fogDist = clamp(d / 200.0, 0.0, 1.0);
    if (repetition) {
        color = mix(color, vec4(bgColor, bgAlpha * 0.01), fogDist);
    } else {
        color = mix(color, vec4(bgColor, bgAlpha * 0.01), floor(fogDist));
    }

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL 3D shapes shader.
 * Implements raymarched primitives with lighting and orbit controls matching the GLSL reference.
 * Depth and shading calculations are normalized to the camera orbit parameters to avoid clipping when animated.
 */

struct Uniforms {
    // Contiguous vec4 packing:
    // 0: resolution.xy, time, (unused)
    // 1: (was shapeA \u2014 now SHAPE_A), (was shapeB \u2014 now SHAPE_B), shapeAScale, shapeBScale
    // 2: shapeAThickness, shapeBThickness, (was blendMode \u2014 now BLEND_MODE), smoothness
    // 3: spin, flip, spinSpeed, flipSpeed
    // 4: repetition, animation, flythroughSpeed, spacing
    // 5: cameraDist, backgroundOpacity, colorMode, weight
    // 6: backgroundColor.xyz, paletteMode
    // 7: paletteOffset.xyz, cyclePalette
    // 8: paletteAmp.xyz, rotatePalette
    // 9: paletteFreq.xyz, repeatPalette
    // 10: palettePhase.xyz, (unused)
    data : array<vec4<f32>, 12>,
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(5) var inputTex : texture_2d<f32>;

// SHAPE_A, SHAPE_B and BLEND_MODE are compile-time consts injected by the
// runtime via injectDefines (see definition.js \`globals.{shapeA,shapeB,
// blendMode}.define\`). Same fix as the GLSL backend \u2014 collapses the per-
// raymarch-step dispatch so Dawn constant-folds it.

var<private> resolution : vec2<f32>;
var<private> time : f32;
var<private> shapeAScale : f32;
var<private> shapeBScale : f32;
var<private> shapeAThickness : f32;
var<private> shapeBThickness : f32;
var<private> smoothness : f32;
var<private> spin : f32;
var<private> flip : f32;
var<private> spinSpeed : f32;
var<private> flipSpeed : f32;
var<private> repetition : bool;
var<private> animation : i32;
var<private> flythroughSpeed : f32;
var<private> spacing : f32;
var<private> cameraDist : f32;
var<private> backgroundColor : vec3<f32>;
var<private> backgroundOpacity : f32;
var<private> colorMode : i32;
var<private> paletteMode : i32;
var<private> paletteOffset : vec3<f32>;
var<private> paletteAmp : vec3<f32>;
var<private> paletteFreq : vec3<f32>;
var<private> palettePhase : vec3<f32>;
var<private> cyclePalette : i32;
var<private> rotatePalette : f32;
var<private> repeatPalette : f32;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(modulo(h * 6.0, 2.0) - 1.0));
    let m = v - c;
    var rgb = vec3<f32>(0.0);
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
    var srgb = vec3<f32>(0.0);
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

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

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn luminance(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn pal(t0: f32, paletteOffset: vec3<f32>, paletteAmp: vec3<f32>, paletteFreq: vec3<f32>, palettePhase: vec3<f32>, paletteMode: i32, repeatPalette: f32, rotatePalette: f32) -> vec3<f32> {
    var t = abs(t0);
    t = t * repeatPalette + rotatePalette * 0.01;
    var color = paletteOffset + paletteAmp * cos(TAU * (paletteFreq * t + palettePhase));
    if (paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (paletteMode == 2) {
        color.g = color.g * -0.509 + 0.276;
        color.b = color.b * -0.509 + 0.198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    }
    return color;
}

fn rotate2D(st: vec2<f32>, rot: f32) -> vec2<f32> {
    let angle = rot * PI;
    let s = sin(angle);
    let c = cos(angle);
    return mat2x2<f32>(c, -s, s, c) * st;
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0 - h);
}

fn ssub(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 - 0.5*(b + a)/k, 0.0, 1.0);
    return mix(b, -a, h) + k*h*(1.0 - h);
}

fn smax(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 - 0.5*(b - a)/k, 0.0, 1.0);
    return mix(b, a, h) + k*h*(1.0 - h);
}

fn shape3dA(p: vec3<f32>, origin: vec3<f32>, scale: f32, thickness: f32) -> f32 {
    var d: f32 = 0.0;
    var s = scale * 0.25;
    var q = p;
    if (SHAPE_A == 20) {
        d = length(p - origin) - s;
    } else if (SHAPE_A == 30) {
        q = vec3<f32>(length(p.xy) - s, p.z, 0.0);
        d = length(q.xy) - 0.2;
    } else if (SHAPE_A == 31) {
        q = vec3<f32>(length(p.xz) - s, p.y, 0.0);
        d = length(q.xy) - 0.2;
    } else if (SHAPE_A == 10) {
        s = s * 0.75;
        q = p - clamp(p, vec3<f32>(-s), vec3<f32>(s));
        d = length(q) - 0.01;
    } else if (SHAPE_A == 40) {
        s = s * 0.75;
        d = length(p.xz) - s;
    } else if (SHAPE_A == 50) {
        s = s * 0.75;
        d = max(length(p - clamp(p, vec3<f32>(-s), vec3<f32>(s))), length(p.xy) - s);
    } else if (SHAPE_A == 60) {
        q = p;
        q.y = q.y - clamp(q.y, -scale * 0.5, scale * 0.5);
        d = length(q) - s * 0.5;
    } else if (SHAPE_A == 70) {
        q = p;
        q.x = q.x - clamp(q.x, -scale * 0.5, scale * 0.5);
        d = length(q) - s * 0.5;
    } else if (SHAPE_A == 80) {
        q = abs(p);
        return (q.x + q.y + q.z - s) * 0.57735027;
    }
    d = abs(d) - (thickness * 0.01);
    return d;
}

fn shape3dB(p: vec3<f32>, origin: vec3<f32>, scale: f32, thickness: f32) -> f32 {
    var d: f32 = 0.0;
    var s = scale * 0.25;
    var q = p;
    if (SHAPE_B == 20) {
        d = length(p - origin) - s;
    } else if (SHAPE_B == 30) {
        q = vec3<f32>(length(p.xy) - s, p.z, 0.0);
        d = length(q.xy) - 0.2;
    } else if (SHAPE_B == 31) {
        q = vec3<f32>(length(p.xz) - s, p.y, 0.0);
        d = length(q.xy) - 0.2;
    } else if (SHAPE_B == 10) {
        s = s * 0.75;
        q = p - clamp(p, vec3<f32>(-s), vec3<f32>(s));
        d = length(q) - 0.01;
    } else if (SHAPE_B == 40) {
        s = s * 0.75;
        d = length(p.xz) - s;
    } else if (SHAPE_B == 50) {
        s = s * 0.75;
        d = max(length(p - clamp(p, vec3<f32>(-s), vec3<f32>(s))), length(p.xy) - s);
    } else if (SHAPE_B == 60) {
        q = p;
        q.y = q.y - clamp(q.y, -scale * 0.5, scale * 0.5);
        d = length(q) - s * 0.5;
    } else if (SHAPE_B == 70) {
        q = p;
        q.x = q.x - clamp(q.x, -scale * 0.5, scale * 0.5);
        d = length(q) - s * 0.5;
    } else if (SHAPE_B == 80) {
        q = abs(p);
        return (q.x + q.y + q.z - s) * 0.57735027;
    }
    d = abs(d) - (thickness * 0.01);
    return d;
}

fn blend(shape1: f32, shape2: f32, smoothness: f32) -> f32 {
    var d: f32 = 0.0;
    if (BLEND_MODE == 10) {
        d = smin(shape1, shape2, smoothness * 0.02);
    } else if (BLEND_MODE == 20) {
        d = smax(shape1, shape2, smoothness * 0.01);
    } else if (BLEND_MODE == 25) {
        d = ssub(shape1, shape2, smoothness * 0.02);
    } else if (BLEND_MODE == 26) {
        d = ssub(-shape1, shape2, smoothness * 0.02);
    } else if (BLEND_MODE == 30) {
        d = min(shape1, shape2);
    } else if (BLEND_MODE == 40) {
        d = max(shape1, shape2);
    } else if (BLEND_MODE == 50) {
        d = max(-shape1, shape2);
    } else if (BLEND_MODE == 51) {
        d = max(shape1, -shape2);
    } else {
        d = shape1;
    }
    return d;
}

fn applyTransform(p0: vec3<f32>) -> vec3<f32> {
    var p = p0;
    if (repetition && animation != 0 && flythroughSpeed != 0.0) {
        p.z = p.z + time * flythroughSpeed;
    }
    var rotXZ = rotate2D(p.xz, spin / 180.0);
    p.x = rotXZ.x;
    p.z = rotXZ.y;
    var rotYZ = rotate2D(p.yz, flip / 180.0);
    p.y = rotYZ.x;
    p.z = rotYZ.y;
    if (repetition && animation == 1) {
        p = p - spacing * round(p / spacing);
    }
    rotXZ = rotate2D(p.xz, time * (spinSpeed * 0.1));
    p.x = rotXZ.x;
    p.z = rotXZ.y;
    rotYZ = rotate2D(p.yz, time * (flipSpeed * 0.1));
    p.y = rotYZ.x;
    p.z = rotYZ.y;
    if (repetition && animation == 0) {
        p = p - spacing * round(p / spacing);
    }
    return p;
}

fn getDist(p0: vec3<f32>) -> f32 {
    let p = applyTransform(p0);
    let shape1 = shape3dA(p, vec3<f32>(0.0, 0.0, 0.0), 1.0 + shapeAScale * 0.1, shapeAThickness);
    let shape2 = shape3dB(p, vec3<f32>(0.0, 0.0, 0.0), 1.0 + shapeBScale * 0.1, shapeBThickness);
    return blend(shape1, shape2, smoothness);
}

fn getNormal(p: vec3<f32>) -> vec3<f32> {
    let epsilon = 0.01;
    let d = getDist(p);
    let dx = getDist(p + vec3<f32>(epsilon, 0.0, 0.0)) - d;
    let dy = getDist(p + vec3<f32>(0.0, epsilon, 0.0)) - d;
    let dz = getDist(p + vec3<f32>(0.0, 0.0, epsilon)) - d;
    return normalize(vec3<f32>(dx, dy, dz));
}

fn rayMarch(rayOrigin: vec3<f32>, rayDirection: vec3<f32>) -> f32 {
    var d = 0.0;
    let maxSteps = 100;
    let maxDist = 200.0;
    let minDist = 0.01;
    for (var i: i32 = 0; i < maxSteps; i = i + 1) {
        let p = rayOrigin + rayDirection * d;
        let dist = getDist(p);
        d = d + dist;
        if (d > maxDist || dist < minDist) {
            break;
        }
    }
    return d;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;

    // uniforms.data[1].x was shapeA \u2014 now compile-time SHAPE_A
    // uniforms.data[1].y was shapeB \u2014 now compile-time SHAPE_B
    shapeAScale = uniforms.data[1].z;
    shapeBScale = uniforms.data[1].w;

    shapeAThickness = uniforms.data[2].x;
    shapeBThickness = uniforms.data[2].y;
    // uniforms.data[2].z was blendMode \u2014 now compile-time BLEND_MODE
    smoothness = uniforms.data[2].w;

    spin = uniforms.data[3].x;
    flip = uniforms.data[3].y;
    spinSpeed = uniforms.data[3].z;
    flipSpeed = uniforms.data[3].w;

    repetition = uniforms.data[4].x > 0.5;
    animation = i32(uniforms.data[4].y);
    flythroughSpeed = uniforms.data[4].z;
    spacing = uniforms.data[4].w;

    cameraDist = uniforms.data[5].x;
    backgroundOpacity = uniforms.data[5].y;
    colorMode = i32(uniforms.data[5].z);
    let weight = uniforms.data[5].w;

    backgroundColor = uniforms.data[6].xyz;
    paletteMode = i32(uniforms.data[6].w);
    paletteOffset = uniforms.data[7].xyz;
    cyclePalette = i32(uniforms.data[7].w);
    paletteAmp = uniforms.data[8].xyz;
    rotatePalette = uniforms.data[8].w;
    paletteFreq = uniforms.data[9].xyz;
    repeatPalette = uniforms.data[9].w;
    palettePhase = uniforms.data[10].xyz;

    var color = vec4<f32>(1.0, 1.0, 1.0, 1.0);
    let tileOffset = uniforms.data[11].xy;
    let fullResolution = uniforms.data[11].zw;
    var st = ((pos.xy + tileOffset) - 0.5 * fullResolution) / fullResolution.y;

    let rayOrigin = vec3<f32>(0.0, 0.0, -cameraDist);
    let rayDirection = normalize(vec3<f32>(st, 1.0));
    let d = rayMarch(rayOrigin, rayDirection);

    var p = rayOrigin + rayDirection * d;
    let lightPosition = vec3<f32>(-5.0, 5.0, -5.0);
    let lightVector = normalize(lightPosition - p);
    var normal = getNormal(p);
    var diffuse = clamp(dot(normal, lightVector), 0.0, 1.0);

    if (weight > 0.0) {
        var tp = applyTransform(p);
        tp = tp * 0.5 + vec3<f32>(0.5);
        var colorXY = vec3<f32>(0.0);
        var colorXZ = vec3<f32>(0.0);
        var colorYZ = vec3<f32>(0.0);
        colorXY = textureSample(inputTex, samp, tp.xy).rgb;
        colorXZ = textureSample(inputTex, samp, tp.xz).rgb;
        colorYZ = textureSample(inputTex, samp, tp.yz).rgb;
        normal = abs(normal);
        color = vec4<f32>(colorXY * normal.z + colorXZ * normal.y + colorYZ * normal.x, color.a);
    }

    if (colorMode == 0) {
        color = vec4<f32>(color.rgb * vec3<f32>(1.0 - clamp(d * 0.035, 0.0, 1.0)), color.a);
    } else if (colorMode == 1) {
        color = vec4<f32>(color.rgb * (vec3<f32>(diffuse * 1.5) + vec3<f32>(0.5)), color.a);
    } else if (colorMode == 10) {
        color = vec4<f32>(color.rgb * (vec3<f32>(diffuse * 1.5) + vec3<f32>(0.5)), color.a);
        var lum = luminance(color.rgb);
        if (cyclePalette == -1) {
            lum = lum + time;
        } else if (cyclePalette == 1) {
            lum = lum - time;
        }
        color = vec4<f32>(color.rgb * pal(lum, paletteOffset, paletteAmp, paletteFreq, palettePhase, paletteMode, repeatPalette, rotatePalette), color.a);
    }

    let fogDist = clamp(d / 200.0, 0.0, 1.0);
    let bkg = vec4<f32>(backgroundColor, backgroundOpacity * 0.01);
    if (repetition) {
        color = mix(color, bkg, fogDist);
    } else {
        color = mix(color, bkg, floor(fogDist));
    }

    let st2 = pos.xy / resolution;

    return color;
}
`}},m=`# shapes3d

3D geometric shapes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shapeA | int | torusVert | capsuleHoriz/capsuleVert/cube/cylinderHoriz/cylinderVert/octahedron/sphere/torusHoriz/torusVert | Shape a |
| shapeB | int | cube | capsuleHoriz/capsuleVert/cube/cylinderHoriz/cylinderVert/octahedron/sphere/torusHoriz/torusVert | Shape b |
| shapeAScale | float | 64 | 1-100 | A scale |
| shapeBScale | float | 27 | 1-100 | B scale |
| shapeAThickness | float | 5 | 1-50 | A thickness |
| shapeBThickness | float | 5 | 1-50 | B thickness |
| blendMode | int | smoothUnion | intersect/union/smoothIntersect/smoothUnion/aMinusB/bMinusA/smoothAMinusB/smoothBMinusA | Blend |
| smoothness | float | 1 | 1-100 | Smoothness |
| spin | float | 0 | -180-180 | Spin |
| flip | int | 0 | -180-180 | Flip |
| spinSpeed | float | 2 | -10-10 | Spin speed |
| flipSpeed | float | 2 | -10-10 | Flip speed |
| cameraDist | float | 8 | 5-20 | Cam distance |
| bgColor | color | 1,1,1 | - | Bkg color |
| bgAlpha | float | 0 | 0-100 | Bkg opacity |
| colorMode | int | palette | depth/diffuse/palette | Color mode |
| palette | palette | silvermane | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |
| paletteMode | int | 0 | - | - |
| paletteOffset | vec3 | 0.83,0.6,0.63 | - | Palette offset |
| paletteAmp | vec3 | 0.5,0.5,0.5 | - | Palette amplitude |
| paletteFreq | vec3 | 1,1,1 | - | Palette frequency |
| palettePhase | vec3 | 0.3,0.1,0 | - | Palette phase |
| repetition | boolean | false | - | Repeat |
| animation | int | rotateShape | rotateScene/rotateShape | Rotation |
| flythroughSpeed | float | 0 | -10-10 | Flythrough |
| spacing | int | 10 | 5-20 | Spacing |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .write(o0)

shapes3d(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(c).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(c))t.shaders[n]={...e}}t&&m&&(t.help=m);var O="classicNoisedeck/shapes3d",T="classicNoisedeck",N="shapes3d",H=t;export{H as default,O as effectId,N as effectName,m as help,T as namespace};
