/* classicNoisedeck/noise */
var m=Object.defineProperty;var u=(n,e,o)=>e in n?m(n,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):n[e]=o;var t=(n,e,o)=>u(n,typeof e!="symbol"?e+"":e,o);var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var s={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var R=Math.PI*2,b=s,l=b;var i={};Object.keys(l).forEach((n,e)=>{i[n]={type:"Number",value:e}});var x={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},y={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},h={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3}},f={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:x,midiMode:y,audioBand:h,palette:i};var c={};for(let[n,e]of Object.entries(f.palette))c[n]=e.value;var a=class extends r{constructor(){super(...arguments);t(this,"name","Noise");t(this,"namespace","classicNoisedeck");t(this,"func","noise");t(this,"tags",["noise"]);t(this,"openCategories",["general","transform","color"]);t(this,"description","Noise pattern generator");t(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},aspectRatio:{slot:0,components:"w"},xScale:{slot:1,components:"x"},yScale:{slot:1,components:"y"},seed:{slot:1,components:"z"},loopScale:{slot:1,components:"w"},speed:{slot:2,components:"x"},octaves:{slot:2,components:"w"},ridges:{slot:3,components:"x"},wrap:{slot:3,components:"y"},refractAmt:{slot:3,components:"w"},kaleido:{slot:4,components:"x"},paletteMode:{slot:4,components:"w"},cyclePalette:{slot:5,components:"x"},rotatePalette:{slot:5,components:"y"},repeatPalette:{slot:5,components:"z"},hueRange:{slot:5,components:"w"},hueRotation:{slot:6,components:"x"},paletteOffset:{slot:7,components:"xyz"},paletteAmp:{slot:8,components:"xyz"},paletteFreq:{slot:9,components:"xyz"},palettePhase:{slot:10,components:"xyz"},tileOffset:{slot:11,components:"xy"},fullResolution:{slot:11,components:"zw"}});t(this,"globals",{type:{type:"int",default:10,define:"NOISE_TYPE",choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6,simplex:10,sine:11},ui:{label:"noise type",control:"dropdown"}},octaves:{type:"int",default:2,uniform:"octaves",min:1,max:8,ui:{label:"octaves",control:"slider"}},xScale:{type:"float",default:75,uniform:"xScale",min:1,max:100,ui:{label:"horiz scale",control:"slider",category:"transform"}},yScale:{type:"float",default:75,uniform:"yScale",min:1,max:100,ui:{label:"vert scale",control:"slider",category:"transform"}},ridges:{type:"boolean",default:!1,uniform:"ridges",ui:{label:"ridges",control:"checkbox"}},wrap:{type:"boolean",default:!0,uniform:"wrap",ui:{label:"wrap",control:"checkbox",enabledBy:{param:"type",notIn:[10,11]}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},refractMode:{type:"int",default:2,define:"REFRACT_MODE",choices:{color:0,topology:1,colorTopology:2},ui:{label:"refract mode",control:"dropdown",category:"refract"}},refractAmt:{type:"float",default:0,uniform:"refractAmt",min:0,max:100,ui:{label:"refract",control:"slider",category:"refract"}},loopOffset:{type:"int",default:300,define:"LOOP_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Misc:":null,noise:300,rings:400,sine:410},ui:{label:"loop offset",control:"dropdown",category:"animation"}},loopScale:{type:"float",default:75,uniform:"loopScale",min:1,max:100,ui:{label:"loop scale",control:"slider",category:"animation"}},speed:{type:"float",default:25,uniform:"speed",min:-100,max:100,zero:0,ui:{label:"speed",control:"slider",category:"animation"}},kaleido:{type:"int",default:1,uniform:"kaleido",min:1,max:32,randChance:0,ui:{label:"kaleido sides",control:"slider",category:"kaleido"}},metric:{type:"int",default:0,define:"METRIC",choices:{circle:0,diamond:1,hexagon:2,octagon:3,square:4,triangle:5},ui:{label:"kaleido shape",control:"dropdown",category:"kaleido",enabledBy:{param:"kaleido",gt:1}}},paletteMode:{type:"int",default:3,uniform:"paletteMode",ui:{control:!1}},hueRotation:{type:"float",default:179,uniform:"hueRotation",min:0,max:360,ui:{label:"hue rotate",control:"slider",category:"color",enabledBy:{param:"colorMode",eq:6}}},hueRange:{type:"float",default:25,uniform:"hueRange",min:0,max:100,ui:{label:"hue range",control:"slider",category:"color",enabledBy:{param:"colorMode",eq:6}}},colorMode:{type:"int",default:6,define:"COLOR_MODE",choices:{mono:0,linearRgb:1,srgb:2,oklab:3,palette:4,hsv:6},ui:{label:"color mode",control:"dropdown",category:"color"}},palette:{type:"palette",default:2,uniform:"palette",choices:c,ui:{label:"palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:4}}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:4}}},paletteOffset:{type:"vec3",default:[.5,.5,.5],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[.3,.2,.2],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}}});t(this,"paramAliases",{noiseType:"type",loopAmp:"speed"});t(this,"passes",[{name:"render",program:"noise",inputs:{},outputs:{fragColor:"outputTex"}}])}};var p={noise:{glsl:`#version 300 es

/*
 * Noise synthesizer shader.
 */

precision highp float;
precision highp int;

// NOISE_TYPE is a compile-time define injected by the runtime (see
// definition.js \`globals.type.define\`). Wrapping the variant dispatch in #if
// blocks instead of a runtime if-else avoids ANGLE\u2192D3D inlining the entire
// 9-way decision tree at every call site, which produced ~85 second compiles
// (and ANGLE link timeouts) on Windows Chrome \u2014 see HANDOFF-shader-compile.md.
#ifndef NOISE_TYPE
#define NOISE_TYPE 10
#endif

// COLOR_MODE, REFRACT_MODE, LOOP_OFFSET, and METRIC are also compile-time
// defines. Same rationale as NOISE_TYPE: each is a multi-way dispatch on a
// uniform that ANGLE inlines into large function bodies, and wrapping the
// variants in #if blocks lets dead-code elimination drop the unreachable paths
// before HLSL emission.
#ifndef COLOR_MODE
#define COLOR_MODE 6
#endif
#ifndef REFRACT_MODE
#define REFRACT_MODE 2
#endif
#ifndef LOOP_OFFSET
#define LOOP_OFFSET 300
#endif
#ifndef METRIC
#define METRIC 0
#endif
uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float xScale;
uniform float yScale;
uniform int octaves;
uniform bool ridges;
uniform float refractAmt;
uniform float kaleido;
uniform float loopScale;
uniform float speed;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;
uniform float hueRange;
uniform float hueRotation;
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
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}
// end PCG PRNG

float random(vec2 st) {
    return prng(vec3(st, 0.0)).x;
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float periodicFunction(float p) {
    return map(cos(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

// Noisemaker value noise - MIT License
// https://github.com/noisedeck/noisemaker/blob/master/noisemaker/value.py
int positiveModulo(int value, int modulus) {
    if (modulus == 0) {
        return 0;
    }

    int r = value % modulus;
    return (r < 0) ? r + modulus : r;
}

float constantFromLatticeWithOffset(vec2 lattice, vec2 freq, float s, float blend, ivec2 offset) {
    vec2 baseFloor = floor(lattice);
    ivec2 base = ivec2(baseFloor) + offset;
    vec2 frac = lattice - baseFloor;

    int seedInt = int(floor(s));
    float sFrac = fract(s);

    float xCombined = frac.x + sFrac;
    int xi = base.x + int(floor(xCombined));
    int yi = base.y;

    if (wrap) {
        int freqX = int(freq.x + 0.5);
        int freqY = int(freq.y + 0.5);

        if (freqX > 0) {
            xi = positiveModulo(xi, freqX);
        }
        if (freqY > 0) {
            yi = positiveModulo(yi, freqY);
        }
    }

    uint xBits = uint(xi);
    uint yBits = uint(yi);
    uint seedBits = uint(seedInt);
    uint fracBits = floatBitsToUint(sFrac);

    uvec3 jitter = uvec3(
        (fracBits * 374761393u) ^ 0x9E3779B9u,
        (fracBits * 668265263u) ^ 0x7F4A7C15u,
        (fracBits * 2246822519u) ^ 0x94D049B4u
    );

    uvec3 state = uvec3(xBits, yBits, seedBits) ^ jitter;
    uvec3 prngState = pcg(state);
    float noiseValue = float(prngState.x) / float(0xffffffffu);

    return periodicFunction(noiseValue - blend);
}

float constantFromLattice(vec2 lattice, vec2 freq, float s, float blend) {
    return constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(0, 0));
}

float constant(vec2 st, vec2 freq, float s, float blend) {
    vec2 lattice = st * freq;
    return constantFromLattice(lattice, freq, s, blend);
}

// ---- 3\xD73 quadratic interpolation ----
// Replaces legacy bicubic 4\xD74 (16 taps) with 3\xD73 kernel (9 taps)
// Performance: ~1.8\xD7 faster in fBm chains
// Quality: Quadratic (degree 2) interpolation, minimum 3\xD73 kernel to avoid lattice artifacts

// Cubic Hermite interpolation (same as smoothstep but explicit)
float cubic(float t) {
    // 3t^2 - 2t^3 (C\xB9 continuous, standard smoothstep curve)
    return t * t * (3.0 - 2.0 * t);
}

// Quadratic interpolation for 3 samples (degree 2 polynomial)
float quadratic3(float p0, float p1, float p2, float t) {
    // Quadratic B-spline interpolation (degree 2)
    // Smooth C\xB9 continuous blending between 3 control points
    // B-spline basis functions for uniform knots with t \u2208 [0, 1]
    float t2 = t * t;
    
    // B-spline basis: B0 = (1-t)\xB2/2, B1 = (-2t\xB2 + 2t + 1)/2, B2 = t\xB2/2
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

// Get random value at lattice point (value noise source for interpolated noise)
float latticeValue(vec2 lattice, vec2 freq, float s, float blend) {
    return constantFromLattice(lattice, freq, s, blend);
}

#if NOISE_TYPE == 5
float cubic3x3ValueNoise(vec2 st, vec2 freq, float s, float blend) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);

    // Sample 3\xD73 grid (9 taps)
    float v00 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1, -1));
    float v10 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 0, -1));
    float v20 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1, -1));
    float v01 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1,  0));
    float v11 = constantFromLattice(lattice, freq, s, blend);
    float v21 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1,  0));
    float v02 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1,  1));
    float v12 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 0,  1));
    float v22 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1,  1));

    float y0 = quadratic3(v00, v10, v20, f.x);
    float y1 = quadratic3(v01, v11, v21, f.x);
    float y2 = quadratic3(v02, v12, v22, f.x);

    return quadratic3(y0, y1, y2, f.y);
}
#endif

// ---- End 3\xD73 quadratic ----

// Cubic B-spline interpolation (degree 3)
float blendBicubic(float p0, float p1, float p2, float p3, float t) {
    // Cubic B-spline basis functions for uniform knots
    // Provides C\xB2 continuous smoothing
    float t2 = t * t;
    float t3 = t2 * t;
    
    float b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

// Catmull-Rom 3-point cubic interpolation (degree 3)
float catmullRom3(float p0, float p1, float p2, float t) {
    // Catmull-Rom-esque cubic through 3 points
    // Interpolating (passes through control points)
    float t2 = t * t;
    float t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

// Catmull-Rom 4-point cubic interpolation (degree 3)
float catmullRom4(float p0, float p1, float p2, float p3, float t) {
    // Standard Catmull-Rom spline with tension = 0.5
    // Interpolating (passes through p1 and p2)
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

float blendLinearOrCosine(float a, float b, float amount, int nType) {
    if (nType == 1) {
        return mix(a, b, amount);
    }

    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

float constantOffset(vec2 lattice, vec2 freq, float s, float blend, ivec2 offset) {
    return constantFromLatticeWithOffset(lattice, freq, s, blend, offset);
}

#if NOISE_TYPE == 6
float bicubicValue(vec2 st, vec2 freq, float s, float blend) {
    vec2 lattice = st * freq;

    float x0y0 = constantOffset(lattice, freq, s, blend, ivec2(-1, -1));
    float x0y1 = constantOffset(lattice, freq, s, blend, ivec2(-1, 0));
    float x0y2 = constantOffset(lattice, freq, s, blend, ivec2(-1, 1));
    float x0y3 = constantOffset(lattice, freq, s, blend, ivec2(-1, 2));

    float x1y0 = constantOffset(lattice, freq, s, blend, ivec2(0, -1));
    float x1y1 = constantFromLattice(lattice, freq, s, blend);
    float x1y2 = constantOffset(lattice, freq, s, blend, ivec2(0, 1));
    float x1y3 = constantOffset(lattice, freq, s, blend, ivec2(0, 2));

    float x2y0 = constantOffset(lattice, freq, s, blend, ivec2(1, -1));
    float x2y1 = constantOffset(lattice, freq, s, blend, ivec2(1, 0));
    float x2y2 = constantOffset(lattice, freq, s, blend, ivec2(1, 1));
    float x2y3 = constantOffset(lattice, freq, s, blend, ivec2(1, 2));

    float x3y0 = constantOffset(lattice, freq, s, blend, ivec2(2, -1));
    float x3y1 = constantOffset(lattice, freq, s, blend, ivec2(2, 0));
    float x3y2 = constantOffset(lattice, freq, s, blend, ivec2(2, 1));
    float x3y3 = constantOffset(lattice, freq, s, blend, ivec2(2, 2));

    vec2 frac = fract(lattice);

    float y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, frac.x);
    float y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, frac.x);
    float y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, frac.x);
    float y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, frac.x);

    return blendBicubic(y0, y1, y2, y3, frac.y);
}
#endif

#if NOISE_TYPE == 3
// 3\xD73 Catmull-Rom value noise (9 taps)
float catmullRom3x3ValueNoise(vec2 st, vec2 freq, float s, float blend) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);

    float v00 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1, -1));
    float v10 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 0, -1));
    float v20 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1, -1));
    float v01 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1,  0));
    float v11 = constantFromLattice(lattice, freq, s, blend);
    float v21 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1,  0));
    float v02 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2(-1,  1));
    float v12 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 0,  1));
    float v22 = constantFromLatticeWithOffset(lattice, freq, s, blend, ivec2( 1,  1));

    float y0 = catmullRom3(v00, v10, v20, f.x);
    float y1 = catmullRom3(v01, v11, v21, f.x);
    float y2 = catmullRom3(v02, v12, v22, f.x);
    return catmullRom3(y0, y1, y2, f.y);
}
#endif

#if NOISE_TYPE == 4
// 4\xD74 Catmull-Rom value noise (16 taps)
float catmullRom4x4ValueNoise(vec2 st, vec2 freq, float s, float blend) {
    vec2 lattice = st * freq;

    float x0y0 = constantOffset(lattice, freq, s, blend, ivec2(-1, -1));
    float x0y1 = constantOffset(lattice, freq, s, blend, ivec2(-1, 0));
    float x0y2 = constantOffset(lattice, freq, s, blend, ivec2(-1, 1));
    float x0y3 = constantOffset(lattice, freq, s, blend, ivec2(-1, 2));

    float x1y0 = constantOffset(lattice, freq, s, blend, ivec2(0, -1));
    float x1y1 = constantFromLattice(lattice, freq, s, blend);
    float x1y2 = constantOffset(lattice, freq, s, blend, ivec2(0, 1));
    float x1y3 = constantOffset(lattice, freq, s, blend, ivec2(0, 2));

    float x2y0 = constantOffset(lattice, freq, s, blend, ivec2(1, -1));
    float x2y1 = constantOffset(lattice, freq, s, blend, ivec2(1, 0));
    float x2y2 = constantOffset(lattice, freq, s, blend, ivec2(1, 1));
    float x2y3 = constantOffset(lattice, freq, s, blend, ivec2(1, 2));

    float x3y0 = constantOffset(lattice, freq, s, blend, ivec2(2, -1));
    float x3y1 = constantOffset(lattice, freq, s, blend, ivec2(2, 0));
    float x3y2 = constantOffset(lattice, freq, s, blend, ivec2(2, 1));
    float x3y3 = constantOffset(lattice, freq, s, blend, ivec2(2, 2));

    vec2 frac = fract(lattice);

    float y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, frac.x);
    float y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, frac.x);
    float y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, frac.x);
    float y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, frac.x);

    return catmullRom4(y0, y1, y2, y3, frac.y);
}
#endif

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
// THE SOFTWARE.
#if NOISE_TYPE == 10
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
}

float simplexValue(vec2 st, vec2 freq, float s, float blend) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    vec2 uv = st * freq;
    uv.x += s;

    // First corner
    vec2 i  = floor(uv + dot(uv, C.yy) );
    vec2 x0 = uv -   i + dot(i, C.xx);

    // Other corners
    vec2 i1 = vec2(0.0);
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
#endif
// end simplex

#if NOISE_TYPE == 11
float sineNoise(vec2 st, vec2 freq, float s, float blend) {
    st *= freq;
    st.x += s; 

    float a = blend;
    float b = blend;
    float c = 1.0 - blend;

    vec3 r1 = prng(vec3(s)) * 0.75 + 0.125;
    vec3 r2 = prng(vec3(s+ 10.0)) * 0.75 + 0.125;
    float x = sin(r1.x * st.y + sin(r1.y * st.x + a) + sin(r1.z * st.x + b) + c);
    float y = sin(r2.x * st.x + sin(r2.y * st.y + b) + sin(r2.z * st.y + c) + a);

    return (x + y) * 0.5 + 0.5;
}
#endif

float value(vec2 st, vec2 freq, float s, float blend) {
#if NOISE_TYPE == 3
    return catmullRom3x3ValueNoise(st, freq, s, blend);
#elif NOISE_TYPE == 4
    return catmullRom4x4ValueNoise(st, freq, s, blend);
#elif NOISE_TYPE == 5
    return cubic3x3ValueNoise(st, freq, s, blend);
#elif NOISE_TYPE == 6
    return bicubicValue(st, freq, s, blend);
#elif NOISE_TYPE == 10
    return simplexValue(st, freq, s, blend);
#elif NOISE_TYPE == 11
    return sineNoise(st, freq, s, blend);
#elif NOISE_TYPE == 0
    return constantFromLattice(st * freq, freq, s, blend);
#else
    // NOISE_TYPE == 1 (linear) or NOISE_TYPE == 2 (hermite/cosine)
    vec2 lattice = st * freq;
    float x1y1 = constantFromLattice(lattice, freq, s, blend);
    float x2y1 = constantOffset(lattice, freq, s, blend, ivec2(1, 0));
    float x1y2 = constantOffset(lattice, freq, s, blend, ivec2(0, 1));
    float x2y2 = constantOffset(lattice, freq, s, blend, ivec2(1, 1));
    vec2 frac = fract(lattice);
    float a = blendLinearOrCosine(x1y1, x2y1, frac.x, NOISE_TYPE);
    float b = blendLinearOrCosine(x1y2, x2y2, frac.x, NOISE_TYPE);
    return blendLinearOrCosine(a, b, frac.y, NOISE_TYPE);
#endif
}

//////////////////////////////////////////////////////////////////////

float circles(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

float rings(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

float concentric(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
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

float getMetric(vec2 st) {
    vec2 diff = vec2(0.5 * aspectRatio, 0.5) - st;

#if METRIC == 0
    // euclidean
    return length(st - vec2(0.5 * aspectRatio, 0.5));
#elif METRIC == 1
    // manhattan
    return abs(diff.x) + abs(diff.y);
#elif METRIC == 2
    // hexagon
    return max(max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y), max(abs(diff.x) - diff.y * 0.5, 1.0 * diff.y));
#elif METRIC == 3
    // octagon
    return max((abs(diff.x) + abs(diff.y)) / sqrt(2.0), max(abs(diff.x), abs(diff.y)));
#elif METRIC == 4
    // chebychev
    return max(abs(diff.x), abs(diff.y));
#elif METRIC == 5
    // triangle
    return max(abs(diff.x) - (diff.y) * -0.5, -1.0 * (diff.y));
#else
    return 1.0;
#endif
}

vec2 rotate2D(vec2 st, float rot) {
    float angle = rot * PI;
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    return st;
}

vec2 kaleidoscope(vec2 st, float sides, float blendy) {
    if (sides == 1.0) { return st; }
	// distance metric
	float r = getMetric(st) + blendy;

    // cartesian to polar coordinates
    st = st - vec2(0.5 * aspectRatio, 0.5);
    st = rotate2D(st, 0.5);
	float a = atan(st.y, st.x);

	// Repeat side according to angle
	float ma = mod(a - radians(360.0 / sides), TAU/sides);
	//float ma = mod(a + radians(90.0) - radians(360.0 / sides), TAU/sides);
	ma = abs(ma - PI/sides);

	// polar to cartesian coordinates
	st = r * vec2(cos(ma), sin(ma));
	return st;
}

float offset(vec2 st, vec2 freq) {
#if LOOP_OFFSET == 10
    return circles(st, freq.x);
#elif LOOP_OFFSET == 20
    return shape(st, 3, freq.x * 0.5);
#elif LOOP_OFFSET == 30
    return (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq.x * 0.5;
#elif LOOP_OFFSET == 40
    return shape(st, 4, freq.x * 0.5);
#elif LOOP_OFFSET == 50
    return shape(st, 5, freq.x * 0.5);
#elif LOOP_OFFSET == 60
    return shape(st, 6, freq.x * 0.5);
#elif LOOP_OFFSET == 70
    return shape(st, 7, freq.x * 0.5);
#elif LOOP_OFFSET == 80
    return shape(st, 8, freq.x * 0.5);
#elif LOOP_OFFSET == 90
    return shape(st, 9, freq.x * 0.5);
#elif LOOP_OFFSET == 100
    return shape(st, 10, freq.x * 0.5);
#elif LOOP_OFFSET == 110
    return shape(st, 11, freq.x * 0.5);
#elif LOOP_OFFSET == 120
    return shape(st, 12, freq.x * 0.5);
#elif LOOP_OFFSET == 200
    return st.x * freq.x * 0.5;
#elif LOOP_OFFSET == 210
    return st.y * freq.x * 0.5;
#elif LOOP_OFFSET == 300
    // noise
    st -= vec2(aspectRatio * 0.5, 0.5);
    return value(st, freq, float(seed) + 50.0, 0.0);
#elif LOOP_OFFSET == 400
    return 1.0 - rings(st, freq.x);
#elif LOOP_OFFSET == 410
    return 1.0 - diamonds(st, freq.x);
#else
    return 0.0;
#endif
}

vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    
    float c = v * s; // Chroma
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;

    vec3 rgb = vec3(0.0);

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
    vec3 srgb = vec3(0.0);
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
    vec3 linear = vec3(0.0);
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

#if COLOR_MODE == 4
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
        color = linearToSrgb(color);
    }

    return color;
}
#endif

vec3 generate_octave(vec2 st, vec2 freq, float s, float blend, float octave) {
    vec3 layer = vec3(
        value(st, freq, float(seed) + 10.0 * octave, blend),
        value(st, freq, float(seed) + 20.0 * octave, blend),
        value(st, freq, float(seed) + 30.0 * octave, blend));

#if COLOR_MODE == 6
    if (ridges) {
        layer.b = 1.0 - abs(layer.b * 2.0 - 1.0);
    }
#endif
    return layer;
}

vec3 multires(vec2 st, vec2 freq, int octaves, float s, float blend) {
    vec3 color = vec3(0.0);
    float multiplicand = 0.0;
#if NOISE_TYPE == 11
    // Sine noise UI maps into [40, 1]; reuse midpoint to keep axis adjustments balanced.
    float nominalBase11 = map(75.0, 1.0, 100.0, 40.0, 1.0);
    vec2 nominalFreq = vec2(nominalBase11);
#elif NOISE_TYPE == 10
    // Simplex lives in [6, 0.5]; lock distortion defaults to that midpoint.
    float nominalBase10 = map(75.0, 1.0, 100.0, 6.0, 0.5);
    vec2 nominalFreq = vec2(nominalBase10);
#else
    // Value-noise families share [20, 3]; use midpoint for consistent refract scaling.
    float nominalBaseV = map(75.0, 1.0, 100.0, 20.0, 3.0);
    vec2 nominalFreq = vec2(nominalBaseV);
#endif

    for (int i = 1; i <= octaves; i++) {
        float multiplier = pow(2.0, float(i));
        vec2 baseFreq = freq * 0.5 * multiplier;
        float nominalBase = nominalFreq.x * 0.5 * multiplier;
        multiplicand += 1.0 / multiplier;

#if REFRACT_MODE == 1 || REFRACT_MODE == 2
        {
            vec2 xRefractFreq = vec2(baseFreq.x, nominalBase);
            vec2 yRefractFreq = vec2(nominalBase, baseFreq.y);
            float xRef = value(st, xRefractFreq, s + 10.0 * float(i), blend) - 0.5;
            float yRef = value(st, yRefractFreq, s + 20.0 * float(i), blend) - 0.5;
            float ref = map(refractAmt, 0.0, 100.0, 0.0, 1.0) / multiplier;
            st = vec2(st.x + xRef * ref, st.y + yRef * ref);
        }
#endif

        vec3 layer = generate_octave(st, baseFreq, s + 10.0 * float(i), blend, float(i));

#if REFRACT_MODE == 0 || REFRACT_MODE == 2
        {
            float xOff = cos(layer.b) * 0.5 + 0.5;
            float yOff = sin(layer.b) * 0.5 + 0.5;
            vec3 ref = generate_octave(vec2(st.x + xOff, st.y + yOff), baseFreq, s + 15.0 * float(i), blend, float(i));
            layer = mix(layer, ref, map(refractAmt, 0.0, 100.0, 0.0, 1.0));
        }
#endif

        color.rgb += layer / multiplier;
    }

    color.rgb /= multiplicand;

#if COLOR_MODE == 0
    // grayscale
    if (ridges) color.b = 1.0 - abs(color.b * 2.0 - 1.0);
    return vec3(color.b);
#elif COLOR_MODE == 1
    // linear rgb
    color = srgbToLinear(color);
#elif COLOR_MODE == 2
    // srgb (no-op)
#elif COLOR_MODE == 3
    // oklab
    color.g = color.g * -.509 + .276;
    color.b = color.b * -.509 + .198;
    color = linear_srgb_from_oklab(color);
    color = linearToSrgb(color);
#elif COLOR_MODE == 4
    // palette
    if (ridges) color.b = 1.0 - abs(color.b * 2.0 - 1.0);
    {
        float d = color.b;
        if (cyclePalette == -1) {
            d += time;
        } else if (cyclePalette == 1) {
            d -= time;
        }
        color = pal(d);
    }
#else
    // hsv (default, COLOR_MODE == 6)
    color.r = color.r * hueRange * 0.01;
    color.r += 1.0 - (hueRotation / 360.0);
    color = hsv2rgb(color);
#endif

#if COLOR_MODE != 4 && COLOR_MODE != 6 && COLOR_MODE != 0
    color = rgb2hsv(color);

    color.r += 1.0 - (hueRotation / 360.0);
    color.r = fract(color.r);

#if COLOR_MODE == 1 || COLOR_MODE == 2 || COLOR_MODE == 3
    if (ridges) {
        color.b = 1.0 - abs(color.b * 2.0 - 1.0);
    }
#endif

    color = hsv2rgb(color);
#endif

    return color;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 st = globalCoord / fullResolution.y;
    st = kaleidoscope(st, kaleido, 0.5);
    vec2 centered = st - vec2(aspectRatio * 0.5, 0.5);

    vec2 freq = vec2(1.0);
    vec2 lf = vec2(1.0);

#if NOISE_TYPE == 11
    // sine noise
    freq.x = map(xScale, 1.0, 100.0, 40.0, 1.0);
    freq.y = map(yScale, 1.0, 100.0, 40.0, 1.0);
    lf = vec2(map(loopScale, 1.0, 100.0, 10.0, 1.0));
#elif NOISE_TYPE == 10
    // simplex
    freq.x = map(xScale, 1.0, 100.0, 6.0, 0.5);
    freq.y = map(yScale, 1.0, 100.0, 6.0, 0.5);
    lf = vec2(map(loopScale, 1.0, 100.0, 6.0, 0.5));
#else
    // everything else
    freq.x = map(xScale, 1.0, 100.0, 20.0, 3.0);
    freq.y = map(yScale, 1.0, 100.0, 20.0, 3.0);
    lf = vec2(map(loopScale, 1.0, 100.0, 12.0, 3.0));
#endif

#if LOOP_OFFSET == 300
#if NOISE_TYPE == 11
    // Sine noise maps the UI slider into [40, 1]; reuse its midpoint so loop freq matches the visible field.
    float baseLoop = map(75.0, 1.0, 100.0, 40.0, 1.0);
#elif NOISE_TYPE == 10
    // Simplex noise shrinks to ~[6, 0.5]; base on its midpoint to keep loop axes in sync with main noise.
    float baseLoop = map(75.0, 1.0, 100.0, 6.0, 0.5);
#else
    // Legacy value noise families share [20, 3]; anchor to that midpoint for consistent ratios.
    float baseLoop = map(75.0, 1.0, 100.0, 20.0, 3.0);
#endif
    {
        vec2 nominalFreq = vec2(baseLoop);
        // Lock loop noise axes to the same per-axis scaling as the main field
        // so vertical tweaks do not squash the horizontal domain (and vice versa).
        lf *= freq / nominalFreq;
    }
#endif

#if NOISE_TYPE != 4 && NOISE_TYPE != 10
    if (wrap) {
        freq = floor(freq);
#if LOOP_OFFSET == 300
        lf = floor(lf);
#endif
    }
#endif

    float t = 1.0;
    if (speed < 0.0) {
        t = time + offset(st, lf);
    } else {
        t = time - offset(st, lf);
    }
    float blend = periodicFunction(t) * abs(speed) * 0.01;

    color.rgb = multires(centered, freq, octaves, float(seed), blend);

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL port of the animated noise synthesizer.
 */

struct Uniforms {
    data : array<vec4<f32>, 12>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

// NOISE_TYPE, COLOR_MODE, REFRACT_MODE, LOOP_OFFSET and METRIC are compile-time
// consts injected by the runtime via injectDefines (see
// classicNoisedeck/noise/definition.js \`globals.*.define\`). Replacing the
// runtime dispatches with compile-time constants lets Dawn constant-fold the
// variant selection \u2014 same fix as the GLSL backend (see
// classicNoisedeck/noise/glsl/noise.glsl header).

var<private> resolution : vec2<f32>;
var<private> time : f32;
var<private> aspectRatio : f32;
var<private> xScale : f32;
var<private> yScale : f32;
var<private> seed : f32;
var<private> loopScale : f32;
var<private> speed : f32;
var<private> octaves : i32;
var<private> ridges : bool;
var<private> wrap : bool;
var<private> paletteMode : i32;
var<private> refractAmt : f32;
var<private> kaleido : f32;
var<private> cyclePalette : i32;
var<private> rotatePalette : f32;
var<private> repeatPalette : f32;
var<private> hueRange : f32;
var<private> hueRotation : f32;
var<private> paletteOffset : vec3<f32>;
var<private> paletteAmp : vec3<f32>;
var<private> paletteFreq : vec3<f32>;
var<private> palettePhase : vec3<f32>;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

fn prng(p0: vec3<f32>) -> vec3<f32> {
    var p = p0;
    p.x = select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0);
    p.y = select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0);
    p.z = select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0);
    let u = pcg(vec3<u32>(p));
    return vec3<f32>(u) / f32(0xffffffffu);
}

fn random(st: vec2<f32>) -> f32 {
    return prng(vec3<f32>(st, 0.0)).x;
}

fn periodicFunction(p: f32) -> f32 {
    return map(cos(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

fn blendBicubic(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
    // Cubic B-spline basis functions for uniform knots
    // Provides C\xB2 continuous smoothing
    let t2 = t * t;
    let t3 = t2 * t;
    
    let b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    let b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    let b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    let b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

// Catmull-Rom 3-point interpolation (degree 3, C\u2070 continuous)
// Interpolates through all 3 points
fn catmullRom3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

// Catmull-Rom 4-point interpolation (standard, tension=0.5)
// Interpolates through middle 2 points (p1, p2)
fn catmullRom4(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + 
           t * (3.0 * (p1 - p2) + p3 - p0)));
}

fn blendLinearOrCosine(a: f32, b: f32, amount: f32, interp: i32) -> f32 {
    if (interp == 1) {
        return mix(a, b, amount);
    }
    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

fn positiveModulo(value: i32, modulus: i32) -> i32 {
    if (modulus == 0) {
        return 0;
    }

    var r = value % modulus;
    if (r < 0) {
        r += modulus;
    }
    return r;
}

fn constantFromLatticeWithOffset(lattice_in: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32, offset: vec2<i32>) -> f32 {
    let baseFloor = floor(lattice_in);
    var cell = vec2<i32>(i32(baseFloor.x), i32(baseFloor.y)) + offset;
    let frac = lattice_in - baseFloor;

    let seedInt = i32(floor(s));
    let sFrac = fract(s);

    let xCombined = frac.x + sFrac;
    var xi = cell.x + i32(floor(xCombined));
    var yi = cell.y;

    if (wrap) {
        let freqX = i32(freq.x + 0.5);
        let freqY = i32(freq.y + 0.5);

        if (freqX > 0) {
            xi = positiveModulo(xi, freqX);
        }
        if (freqY > 0) {
            yi = positiveModulo(yi, freqY);
        }
    }

    let xBits = bitcast<u32>(xi);
    let yBits = bitcast<u32>(yi);
    let seedBits = bitcast<u32>(seedInt);
    let fracBits = bitcast<u32>(sFrac);

    let jitter = vec3<u32>(
        (fracBits * 374761393u) ^ 0x9E3779B9u,
        (fracBits * 668265263u) ^ 0x7F4A7C15u,
        (fracBits * 2246822519u) ^ 0x94D049B4u
    );

    let prngState = pcg(vec3<u32>(xBits, yBits, seedBits) ^ jitter);
    let noiseValue = f32(prngState.x) / f32(0xffffffffu);

    return periodicFunction(noiseValue - blend);
}

fn constant(st_in: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    let lattice = st_in * freq;
    return constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(0, 0));
}

fn constantOffset(lattice: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32, offset: vec2<i32>) -> f32 {
    return constantFromLatticeWithOffset(lattice, freq, s, blend, offset);
}

fn mod289_3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_2(x: vec2<f32>) -> vec2<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute3(x: vec3<f32>) -> vec3<f32> {
    return mod289_3(((x * 34.0) + 1.0) * x);
}

// ---- 3\xD73 quadratic interpolation ----
// Replaces legacy bicubic 4\xD74 (16 taps) with 3\xD73 kernel (9 taps)
// Performance: ~1.8\xD7 faster in fBm chains
// Quality: Quadratic (degree 2) interpolation, minimum 3\xD73 kernel to avoid lattice artifacts

// Quadratic interpolation for 3 samples (degree 2 polynomial)
fn quadratic3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    // Quadratic B-spline interpolation (degree 2)
    // Smooth C\xB9 continuous blending between 3 control points
    // B-spline basis functions for uniform knots with t \u2208 [0, 1]
    let t2 = t * t;
    
    // B-spline basis: B0 = (1-t)\xB2/2, B1 = (-2t\xB2 + 2t + 1)/2, B2 = t\xB2/2
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

fn cubic3x3ValueNoise(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    let lattice = st * freq;
    let f = fract(lattice);
    
    // Sample 3\xD73 grid (9 taps)
    // Using constantFromLatticeWithOffset directly
    
    // Row -1 (y-1)
    let v00 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(-1, -1));
    let v10 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 0, -1));
    let v20 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 1, -1));
    
    // Row 0 (y)
    let v01 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(-1,  0));
    let v11 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 0,  0));
    let v21 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 1,  0));
    
    // Row 1 (y+1)
    let v02 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(-1,  1));
    let v12 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 0,  1));
    let v22 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>( 1,  1));
    
    // Quadratic interpolation along x for each row
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    
    // Quadratic interpolation along y
    return quadratic3(y0, y1, y2, f.y);
}

// ---- End 3\xD73 quadratic ----


fn bicubicValue(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    let lattice = st * freq;

    let x0y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, -1));
    let x0y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 0));
    let x0y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 1));
    let x0y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 2));

    let x1y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, -1));
    let x1y1 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(0, 0));
    let x1y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 1));
    let x1y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 2));

    let x2y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, -1));
    let x2y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 0));
    let x2y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 1));
    let x2y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 2));

    let x3y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, -1));
    let x3y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 0));
    let x3y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 1));
    let x3y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 2));

    let frac = fract(lattice);

    let y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, frac.x);
    let y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, frac.x);
    let y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, frac.x);
    let y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, frac.x);

    return blendBicubic(y0, y1, y2, y3, frac.y);
}

// 3\xD73 Catmull-Rom value noise (9 texture lookups)
fn catmullRom3x3ValueNoise(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    let lattice = vec2<f32>(st.x * freq.x + s, st.y * freq.y);
    
    // Sample 3\xD73 grid centered on current position
    let x0y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, -1));
    let x0y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 0));
    let x0y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 1));
    
    let x1y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, -1));
    let x1y1 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(0, 0));
    let x1y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 1));
    
    let x2y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, -1));
    let x2y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 0));
    let x2y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 1));
    
    let frac = fract(lattice);
    
    // Interpolate using 3-point Catmull-Rom
    let y0 = catmullRom3(x0y0, x1y0, x2y0, frac.x);
    let y1 = catmullRom3(x0y1, x1y1, x2y1, frac.x);
    let y2 = catmullRom3(x0y2, x1y2, x2y2, frac.x);
    
    return catmullRom3(y0, y1, y2, frac.y);
}

// 4\xD74 Catmull-Rom value noise (16 texture lookups)
fn catmullRom4x4ValueNoise(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    let lattice = vec2<f32>(st.x * freq.x + s, st.y * freq.y);
    
    // Sample 4\xD74 grid
    let x0y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, -1));
    let x0y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 0));
    let x0y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 1));
    let x0y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(-1, 2));

    let x1y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, -1));
    let x1y1 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(0, 0));
    let x1y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 1));
    let x1y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 2));

    let x2y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, -1));
    let x2y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 0));
    let x2y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 1));
    let x2y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 2));

    let x3y0 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, -1));
    let x3y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 0));
    let x3y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 1));
    let x3y3 = constantOffset(lattice, freq, s, blend, vec2<i32>(2, 2));

    let frac = fract(lattice);

    // Interpolate using 4-point Catmull-Rom
    let y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, frac.x);
    let y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, frac.x);
    let y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, frac.x);
    let y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, frac.x);

    return catmullRom4(y0, y1, y2, y3, frac.y);
}

fn simplexValue(st_in: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    const C = vec4<f32>(
        0.211324865405187,
        0.366025403784439,
        -0.577350269189626,
        0.024390243902439
    );

    var uv = vec2<f32>(st_in.x * freq.x, st_in.y * freq.y);
    uv.x = uv.x + s;

    var i = floor(uv + dot(uv, C.yy));
    var x0 = uv - i + dot(i, C.xx);

    let i1 = select(vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 0.0), x0.x > x0.y);
    let x1 = x0 - i1 + vec2<f32>(C.x, C.x);
    let x2 = x0 - vec2<f32>(1.0, 1.0) + vec2<f32>(2.0 * C.x, 2.0 * C.x);

    i = mod289_2(i);
    var p = permute3(permute3(i.y + vec3<f32>(0.0, i1.y, 1.0)) + i.x + vec3<f32>(0.0, i1.x, 1.0));

    var m = max(vec3<f32>(0.5) - vec3<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2)), vec3<f32>(0.0));
    m = m * m;
    m = m * m;

    var x = 2.0 * fract(p * C.www) - 1.0;
    var h = abs(x) - 0.5;
    var ox = floor(x + 0.5);
    var a0 = x - ox;

    m = m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));

    var g = vec3<f32>(0.0);
    g.x = a0.x * x0.x + h.x * x0.y;
    let gyz = a0.yz * vec2<f32>(x1.x, x2.x) + h.yz * vec2<f32>(x1.y, x2.y);
    g.y = gyz.x;
    g.z = gyz.y;

    let v = 130.0 * dot(m, g);
    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

fn sineNoise(st_in: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    var st = st_in * freq;
    st.x = st.x + s;

    let a = blend;
    let b = blend;
    let c = 1.0 - blend;

    let r1 = prng(vec3<f32>(s, s, s)) * 0.75 + vec3<f32>(0.125, 0.125, 0.125);
    let r2 = prng(vec3<f32>(s + 10.0, s + 10.0, s + 10.0)) * 0.75 + vec3<f32>(0.125, 0.125, 0.125);
    let x = sin(r1.x * st.y + sin(r1.y * st.x + a) + sin(r1.z * st.x + b) + c);
    let y = sin(r2.x * st.x + sin(r2.y * st.y + b) + sin(r2.z * st.y + c) + a);
    return (x + y) * 0.5 + 0.5;
}

fn value(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32) -> f32 {
    if (NOISE_TYPE == 3) {
        // 3\xD73 Catmull-Rom (9 taps)
        return catmullRom3x3ValueNoise(st, freq, s, blend);
    } else if (NOISE_TYPE == 4) {
        // 4\xD74 Catmull-Rom (16 taps)
        return catmullRom4x4ValueNoise(st, freq, s, blend);
    } else if (NOISE_TYPE == 5) {
        // 3\xD73 quadratic B-spline (9 taps)
        return cubic3x3ValueNoise(st, freq, s, blend);
    } else if (NOISE_TYPE == 6) {
        // 4\xD74 cubic B-spline (16 taps)
        return bicubicValue(st, freq, s, blend);
    } else if (NOISE_TYPE == 10) {
        return simplexValue(st, freq, s, blend);
    } else if (NOISE_TYPE == 11) {
        return sineNoise(st, freq, s, blend);
    }

    let lattice = st * freq;
    let x1y1 = constantFromLatticeWithOffset(lattice, freq, s, blend, vec2<i32>(0, 0));
    if (NOISE_TYPE == 0) {
        return x1y1;
    }

    let x2y1 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 0));
    let x1y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(0, 1));
    let x2y2 = constantOffset(lattice, freq, s, blend, vec2<i32>(1, 1));

    let frac = fract(lattice);
    let a = blendLinearOrCosine(x1y1, x2y1, frac.x, NOISE_TYPE);
    let b = blendLinearOrCosine(x1y2, x2y2, frac.x, NOISE_TYPE);
    return blendLinearOrCosine(a, b, frac.y, NOISE_TYPE);
}

fn circles(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

fn rings(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

fn diamonds(st_in: vec2<f32>, freq: f32) -> f32 {
    var st = st_in - vec2<f32>(0.5 * aspectRatio, 0.5);
    st = st * freq;
    return cos(st.x * PI) + cos(st.y * PI);
}

fn shape(st_in: vec2<f32>, sides: i32, blend: f32) -> f32 {
    let st = st_in * 2.0 - vec2<f32>(aspectRatio, 1.0);
    let a = atan2(st.x, st.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

fn getMetric(st_in: vec2<f32>) -> f32 {
    var st = st_in;
    let diff = vec2<f32>(0.5 * aspectRatio, 0.5) - st;
    var r = 1.0;
    if (METRIC == 0) {
        r = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    } else if (METRIC == 1) {
        r = abs(diff.x) + abs(diff.y);
    } else if (METRIC == 2) {
        r = max(max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y), max(abs(diff.x) - diff.y * 0.5, diff.y));
    } else if (METRIC == 3) {
        r = max((abs(diff.x) + abs(diff.y)) / sqrt(2.0), max(abs(diff.x), abs(diff.y)));
    } else if (METRIC == 4) {
        r = max(abs(diff.x), abs(diff.y));
    } else if (METRIC == 5) {
        r = max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y);
    }
    return r;
}

fn rotate2D(st: vec2<f32>, rot: f32) -> vec2<f32> {
    let angle = rot * PI;
    let c = cos(angle);
    let s = sin(angle);
    return mat2x2<f32>(c, -s, s, c) * st;
}

fn kaleidoscope(st_in: vec2<f32>, sides: f32, blendy: f32) -> vec2<f32> {
    if (sides == 1.0) {
        return st_in;
    }
    let r = getMetric(st_in) + blendy;
    var st = st_in - vec2<f32>(0.5 * aspectRatio, 0.5);
    st = rotate2D(st, 0.5);
    var a = atan2(st.y, st.x);
    let ma = abs(modulo(a - radians(360.0 / sides), TAU / sides) - PI / sides);
    return r * vec2<f32>(cos(ma), sin(ma));
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;

    let c = v * s;
    let h6 = h * 6.0;
    let k = h6 - 2.0 * floor(h6 / 2.0);
    let x = c * (1.0 - abs(k - 1.0));
    let m = v - c;

    var rgb = vec3<f32>(0.0);
    if (h6 < 1.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (h6 < 2.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (h6 < 3.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (h6 < 4.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (h6 < 5.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }
    return rgb + vec3<f32>(m, m, m);
}

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.x;
    let g = rgb.y;
    let b = rgb.z;
    let maxc = max(r, max(g, b));
    let minc = min(r, min(g, b));
    let delta = maxc - minc;

    var h = 0.0;
    if (delta != 0.0) {
        if (maxc == r) {
            h = modulo((g - b) / delta, 6.0) / 6.0;
        } else if (maxc == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }

    let s = select(delta / maxc, 0.0, maxc == 0.0);
    let v = maxc;
    return vec3<f32>(h, s, v);
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

fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear = vec3<f32>(0.0);
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
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

fn oklab_from_linear_srgb(c: vec3<f32>) -> vec3<f32> {
    let lms = invB * c;
    return invA * (sign(lms) * pow(abs(lms), vec3<f32>(0.3333333333333)));
}

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn pal(t_in: f32) -> vec3<f32> {
    var t = t_in * repeatPalette + rotatePalette * 0.01;
    var color = paletteOffset + paletteAmp * cos(6.28318 * (paletteFreq * t + palettePhase));

    if (paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (paletteMode == 2) {
        color.y = color.y * -0.509 + 0.276;
        color.z = color.z * -0.509 + 0.198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    }

    return color;
}

fn generate_octave(st: vec2<f32>, freq: vec2<f32>, s: f32, blend: f32, octave: f32) -> vec3<f32> {
    var layer = vec3<f32>(
        value(st, freq, seed + 10.0 * octave, blend),
        value(st, freq, seed + 20.0 * octave, blend),
        value(st, freq, seed + 30.0 * octave, blend)
    );
    if (ridges && COLOR_MODE == 6) {
        layer.z = 1.0 - abs(layer.z * 2.0 - 1.0);
    }
    return layer;
}

fn multires(st_in: vec2<f32>, freq: vec2<f32>, oct: i32, s: f32, blend: f32) -> vec3<f32> {
    var st = st_in;
    var color = vec3<f32>(0.0);
    var multiplicand = 0.0;
    var nominalFreq = vec2<f32>(0.0, 0.0);
    if (NOISE_TYPE == 11) {
        // Sine noise uses [40, 1]; pin refract defaults to its midpoint.
        let base = map(75.0, 1.0, 100.0, 40.0, 1.0);
        nominalFreq = vec2<f32>(base, base);
    } else if (NOISE_TYPE == 10) {
        // Simplex spans [6, 0.5]; keep axis ratios anchored to that midpoint.
        let base = map(75.0, 1.0, 100.0, 6.0, 0.5);
        nominalFreq = vec2<f32>(base, base);
    } else {
        // Value-noise flavours share [20, 3]; reuse midpoint for balanced distortion.
        let base = map(75.0, 1.0, 100.0, 20.0, 3.0);
        nominalFreq = vec2<f32>(base, base);
    }

    let total = max(oct, 1);
    for (var i: i32 = 1; i <= total; i = i + 1) {
        let multiplier = pow(2.0, f32(i));
        let baseFreq = freq * 0.5 * multiplier;
        let nominalBase = nominalFreq.x * 0.5 * multiplier;
        multiplicand = multiplicand + 1.0 / multiplier;

        if (REFRACT_MODE == 1 || REFRACT_MODE == 2) {
            let xRefractFreq = vec2<f32>(baseFreq.x, nominalBase);
            let yRefractFreq = vec2<f32>(nominalBase, baseFreq.y);
            let xRef = value(st, xRefractFreq, s + 10.0 * f32(i), blend) - 0.5;
            let yRef = value(st, yRefractFreq, s + 20.0 * f32(i), blend) - 0.5;
            let refraction = map(refractAmt, 0.0, 100.0, 0.0, 1.0) / multiplier;
            st = vec2<f32>(st.x + xRef * refraction, st.y + yRef * refraction);
        }

        var layer = generate_octave(st, baseFreq, s + 10.0 * f32(i), blend, f32(i));

        if (REFRACT_MODE == 0 || REFRACT_MODE == 2) {
            let xOff = cos(layer.z) * 0.5 + 0.5;
            let yOff = sin(layer.z) * 0.5 + 0.5;
            let refLayer = generate_octave(vec2<f32>(st.x + xOff, st.y + yOff), baseFreq, s + 15.0 * f32(i), blend, f32(i));
            let amt = map(refractAmt, 0.0, 100.0, 0.0, 1.0);
            layer = mix(layer, refLayer, vec3<f32>(amt));
        }

        color = color + layer / multiplier;
    }

    color = color / multiplicand;

    var result = color;
    if (COLOR_MODE == 0) {
        if (ridges) {
            result.z = 1.0 - abs(result.z * 2.0 - 1.0);
        }
        result = vec3<f32>(result.z);
    } else if (COLOR_MODE == 1) {
        result = srgbToLinear(result);
    } else if (COLOR_MODE == 2) {
        // srgb, no change
    } else if (COLOR_MODE == 3) {
        result.y = result.y * -0.509 + 0.276;
        result.z = result.z * -0.509 + 0.198;
        result = linear_srgb_from_oklab(result);
        result = linearToSrgb(result);
    } else if (COLOR_MODE == 4) {
        if (ridges) {
            result.z = 1.0 - abs(result.z * 2.0 - 1.0);
        }
        var d = result.z;
        if (cyclePalette == -1) {
            d = d + time;
        } else if (cyclePalette == 1) {
            d = d - time;
        }
        result = pal(d);
    } else {
        var hsv = result;
        hsv.x = hsv.x * hueRange * 0.01;
        hsv.x = hsv.x + 1.0 - (hueRotation / 360.0);
        result = hsv2rgb(hsv);
    }

    if (COLOR_MODE != 4 && COLOR_MODE != 6) {
        var hsv = rgb2hsv(result);
        hsv.x = hsv.x + 1.0 - (hueRotation / 360.0);
        hsv.x = fract(hsv.x);
        if (ridges && (COLOR_MODE == 1 || COLOR_MODE == 2 || COLOR_MODE == 3)) {
            hsv.z = 1.0 - abs(hsv.z * 2.0 - 1.0);
        }
        result = hsv2rgb(hsv);
    }

    return result;
}

fn offset(st_in: vec2<f32>, freq: vec2<f32>) -> f32 {
    if (LOOP_OFFSET == 10) {
        return circles(st_in, freq.x);
    } else if (LOOP_OFFSET == 20) {
        return shape(st_in, 3, freq.x * 0.5);
    } else if (LOOP_OFFSET == 30) {
        return (abs(st_in.x - 0.5 * aspectRatio) + abs(st_in.y - 0.5)) * freq.x * 0.5;
    } else if (LOOP_OFFSET == 40) {
        return shape(st_in, 4, freq.x * 0.5);
    } else if (LOOP_OFFSET == 50) {
        return shape(st_in, 5, freq.x * 0.5);
    } else if (LOOP_OFFSET == 60) {
        return shape(st_in, 6, freq.x * 0.5);
    } else if (LOOP_OFFSET == 70) {
        return shape(st_in, 7, freq.x * 0.5);
    } else if (LOOP_OFFSET == 80) {
        return shape(st_in, 8, freq.x * 0.5);
    } else if (LOOP_OFFSET == 90) {
        return shape(st_in, 9, freq.x * 0.5);
    } else if (LOOP_OFFSET == 100) {
        return shape(st_in, 10, freq.x * 0.5);
    } else if (LOOP_OFFSET == 110) {
        return shape(st_in, 11, freq.x * 0.5);
    } else if (LOOP_OFFSET == 120) {
        return shape(st_in, 12, freq.x * 0.5);
    } else if (LOOP_OFFSET == 200) {
        return st_in.x * freq.x * 0.5;
    } else if (LOOP_OFFSET == 210) {
        return st_in.y * freq.x * 0.5;
    } else if (LOOP_OFFSET == 300) {
        let st = st_in - vec2<f32>(aspectRatio * 0.5, 0.5);
        return value(st, freq, seed + 50.0, 0.0);
    } else if (LOOP_OFFSET == 400) {
        return 1.0 - rings(st_in, freq.x);
    } else if (LOOP_OFFSET == 410) {
        return 1.0 - diamonds(st_in, freq.x);
    }
    return 0.0;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    aspectRatio = uniforms.data[0].w;
    xScale = uniforms.data[1].x;
    yScale = uniforms.data[1].y;
    seed = uniforms.data[1].z;
    loopScale = uniforms.data[1].w;
    speed = uniforms.data[2].x;
    // uniforms.data[2].y was loopOffset (now compile-time LOOP_OFFSET)
    octaves = max(1, i32(uniforms.data[2].w));
    ridges = uniforms.data[3].x > 0.5;
    wrap = uniforms.data[3].y > 0.5;
    // uniforms.data[3].z was refractMode (now compile-time REFRACT_MODE)
    refractAmt = uniforms.data[3].w;
    kaleido = uniforms.data[4].x;
    // uniforms.data[4].y was metric (now compile-time METRIC)
    // uniforms.data[4].z was colorMode (now compile-time COLOR_MODE)
    paletteMode = i32(uniforms.data[4].w);
    cyclePalette = i32(uniforms.data[5].x);
    rotatePalette = uniforms.data[5].y;
    repeatPalette = uniforms.data[5].z;
    hueRange = uniforms.data[5].w;
    hueRotation = uniforms.data[6].x;
    paletteOffset = uniforms.data[7].xyz;
    paletteAmp = uniforms.data[8].xyz;
    paletteFreq = uniforms.data[9].xyz;
    palettePhase = uniforms.data[10].xyz;

    let tileOffset = uniforms.data[11].xy;
    let fullResolution = uniforms.data[11].zw;
    var st = (pos.xy + tileOffset) / fullResolution.y;
    st = kaleidoscope(st, kaleido, 0.5);
    let centered = st - vec2<f32>(aspectRatio * 0.5, 0.5);

    var freq = vec2<f32>(1.0, 1.0);
    var lf = vec2<f32>(1.0, 1.0);

    if (NOISE_TYPE == 11) {
        freq.x = map(xScale, 1.0, 100.0, 40.0, 1.0);
        freq.y = map(yScale, 1.0, 100.0, 40.0, 1.0);
        let val = map(loopScale, 1.0, 100.0, 10.0, 1.0);
        lf = vec2<f32>(val, val);
    } else if (NOISE_TYPE == 10) {
        freq.x = map(xScale, 1.0, 100.0, 6.0, 0.5);
        freq.y = map(yScale, 1.0, 100.0, 6.0, 0.5);
        let val = map(loopScale, 1.0, 100.0, 6.0, 0.5);
        lf = vec2<f32>(val, val);
    } else {
        freq.x = map(xScale, 1.0, 100.0, 20.0, 3.0);
        freq.y = map(yScale, 1.0, 100.0, 20.0, 3.0);
        let val = map(loopScale, 1.0, 100.0, 12.0, 3.0);
        lf = vec2<f32>(val, val);
    }

    if (LOOP_OFFSET == 300) {
        var nominalFreq = vec2<f32>(1.0, 1.0);
        if (NOISE_TYPE == 11) {
            // Sine noise maps into a wide [40, 1] range, so reuse its midpoint to match the field frequency.
            let base = map(75.0, 1.0, 100.0, 40.0, 1.0);
            nominalFreq = vec2<f32>(base, base);
        } else if (NOISE_TYPE == 10) {
            // Simplex maps into [6, 0.5]; anchoring to its midpoint keeps loop stretch aligned with the main noise.
            let base = map(75.0, 1.0, 100.0, 6.0, 0.5);
            nominalFreq = vec2<f32>(base, base);
        } else {
            // All other value-noise flavours share the [20, 3] range, so lock to that midpoint.
            let base = map(75.0, 1.0, 100.0, 20.0, 3.0);
            nominalFreq = vec2<f32>(base, base);
        }
        // Mirror the main noise's per-axis stretch without cross-coupling sliders.
        lf = lf * (freq / nominalFreq);
    }

    if (NOISE_TYPE != 4 && NOISE_TYPE != 10 && wrap) {
        freq = floor(freq);
        if (LOOP_OFFSET == 300) {
            lf = floor(lf);
        }
    }

    var t = 1.0;
    if (speed < 0.0) {
        t = time + offset(st, lf);
    } else {
        t = time - offset(st, lf);
    }
    let blend = periodicFunction(t) * abs(speed) * 0.01;

    let colorRgb = multires(centered, freq, octaves, seed, blend);
    var color = vec4<f32>(colorRgb, 1.0);

    return color;
}
`}},d=`# noise

Noise pattern generator

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | simplex | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4/simplex/sine | Noise type |
| octaves | int | 2 | 1-8 | Octaves |
| xScale | float | 75 | 1-100 | Horiz scale |
| yScale | float | 75 | 1-100 | Vert scale |
| ridges | boolean | false | - | Ridges |
| wrap | boolean | true | - | Wrap |
| seed | int | 1 | 1-100 | Seed |
| refractMode | int | colorTopology | color/topology/colorTopology | Refract mode |
| refractAmt | float | 0 | 0-100 | Refract |
| loopOffset | int | noise | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Misc:/noise/rings/sine | Loop offset |
| loopScale | float | 75 | 1-100 | Loop scale |
| speed | float | 25 | -100-100 | Speed |
| kaleido | int | 1 | 1-32 | Kaleido sides |
| metric | int | circle | circle/diamond/hexagon/octagon/square/triangle | Kaleido shape |
| colorMode | int | hsv | mono/linearRgb/srgb/oklab/palette/hsv | Color space |
| paletteMode | int | 3 | - | - |
| hueRotation | float | 179 | 0-360 | Hue rotate |
| hueRange | float | 25 | 0-100 | Hue range |
| palette | palette | fiveG | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |

## Usage

\`\`\`
search classicNoisedeck, synth

noise()
  .write(o0)

render(o0)
\`\`\`
`;if(a&&Object.keys(p).length>0){a.shaders||(a.shaders={});for(let[n,e]of Object.entries(p))a.shaders[n]={...e}}a&&d&&(a.help=d);var N="classicNoisedeck/noise",M="classicNoisedeck",w="noise",A=a;export{A as default,N as effectId,w as effectName,d as help,M as namespace};
