/* classicNoisedeck/shapes */
var u=Object.defineProperty;var v=(n,e,o)=>e in n?u(n,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):n[e]=o;var a=(n,e,o)=>v(n,typeof e!="symbol"?e+"":e,o);var s=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var r={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var B=Math.PI*2,x=r,f=x;var l={};Object.keys(f).forEach((n,e)=>{l[n]={type:"Number",value:e}});var y={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},b={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},h={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3},raw:{type:"Number",value:4}},i={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:y,midiMode:b,audioBand:h,palette:l};var c={};for(let[n,e]of Object.entries(i.palette))c[n]=e.value;var t=class extends s{constructor(){super(...arguments);a(this,"name","Shapes");a(this,"namespace","classicNoisedeck");a(this,"func","shapes");a(this,"tags",["geometric"]);a(this,"description","Interference patterns from geometric shapes");a(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},wrap:{slot:1,components:"x"},loopAScale:{slot:1,components:"w"},loopBScale:{slot:2,components:"x"},speedA:{slot:2,components:"y"},speedB:{slot:2,components:"z"},paletteMode:{slot:2,components:"w"},paletteOffset:{slot:3,components:"xyz"},cyclePalette:{slot:3,components:"w"},paletteAmp:{slot:4,components:"xyz"},rotatePalette:{slot:4,components:"w"},paletteFreq:{slot:5,components:"xyz"},repeatPalette:{slot:5,components:"w"},palettePhase:{slot:6,components:"xyz"}});a(this,"globals",{loopAOffset:{type:"int",default:40,define:"LOOP_A_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseCatmullRom3x3:330,noiseCatmullRom4x4:340,noiseBSpline3x3:350,noiseBSpline4x4:360,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"shape a",control:"dropdown"}},loopBOffset:{type:"int",default:30,define:"LOOP_B_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseCatmullRom3x3:330,noiseCatmullRom4x4:340,noiseBSpline3x3:350,noiseBSpline4x4:360,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"shape b",control:"dropdown"}},loopAScale:{type:"float",default:1,uniform:"loopAScale",min:1,max:100,ui:{label:"scale a",control:"slider"}},loopBScale:{type:"float",default:1,uniform:"loopBScale",min:1,max:100,ui:{label:"scale b",control:"slider"}},speedA:{type:"float",default:50,uniform:"speedA",min:-100,max:100,zero:0,ui:{label:"speed a",control:"slider"}},speedB:{type:"float",default:50,uniform:"speedB",min:-100,max:100,zero:0,ui:{label:"speed b",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"noise seed",control:"slider",enabledBy:{or:[{param:"loopAOffset",in:[300,310,320,330,340,350,360,370,380]},{param:"loopBOffset",in:[300,310,320,330,340,350,360,370,380]}]}}},wrap:{type:"boolean",default:!0,uniform:"wrap",ui:{label:"wrap",control:"checkbox",enabledBy:{or:[{param:"loopAOffset",in:[300,310,320,330,340,350,360]},{param:"loopBOffset",in:[300,310,320,330,340,350,360]}]}}},palette:{type:"palette",default:46,uniform:"palette",choices:c,ui:{label:"palette",control:"dropdown",category:"palette"}},paletteMode:{type:"int",default:0,uniform:"paletteMode",ui:{control:!1}},paletteOffset:{type:"vec3",default:[.83,.6,.63],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},paletteFreq:{type:"vec3",default:[1,1,1],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},palettePhase:{type:"vec3",default:[.3,.1,0],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette"}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette"}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette"}}});a(this,"paramAliases",{loopAAmp:"speedA",loopBAmp:"speedB"});a(this,"passes",[{name:"render",program:"shapes",inputs:{},outputs:{fragColor:"outputTex"}}])}};var p={shapes:{glsl:`#version 300 es

/*
 * Shapes generator shader.
 * Builds layered primitives, gradients, and repeats using deterministic hashes so random shape jitter remains reproducible.
 * UI-driven booleans toggle stroke, fill, and transform operations that are normalized to the current aspect ratio.
 */

precision highp float;
precision highp int;

// LOOP_A_OFFSET and LOOP_B_OFFSET are compile-time defines injected by the
// runtime (see definition.js \`globals.loopAOffset.define\` and
// \`globals.loopBOffset.define\`). Each unique (loopA, loopB) combination
// produces its own compiled program. The default (40 = square, 30 = diamond)
// doesn't reach the noise variants, so the entire 9-way value() dispatch and
// the variant function bodies get dead-code-eliminated by the GLSL\u2192HLSL
// translator before ANGLE drives the D3D backend. This avoids the ~35s
// compile hang on Windows Chrome \u2014 see HANDOFF-shader-compile.md.
#ifndef LOOP_A_OFFSET
#define LOOP_A_OFFSET 40
#endif
#ifndef LOOP_B_OFFSET
#define LOOP_B_OFFSET 30
#endif

uniform float time;
uniform int seed;
uniform bool wrap;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float loopAScale;
uniform float loopBScale;
uniform float speedA;
uniform float speedB;
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

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 rotate2D(vec2 st, float rot) {
    float angle = rot *= PI;
    st -= vec2(0.5 - aspectRatio, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 - aspectRatio, 0.5);
    return st;
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

float random(vec2 st) {
    return prng(vec3(st, 0.0)).x;
}

// periodic function for looping
float periodicFunction(float p) {
    float x = TAU * p;
    float func = sin(x);
    return map(func, -1.0, 1.0, 0.0, 1.0);
}

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

float constant(vec2 st, float freq, float speed) {
    vec3 randTime = randomFromLatticeWithOffset(st, freq, ivec2(40, 0));
    float scaledTime = periodicFunction(randTime.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.33);

    vec3 rand = randomFromLatticeWithOffset(st, freq, ivec2(0, 0));
    return periodicFunction(rand.y - scaledTime);
}

// ---- 3\xD73 quadratic interpolation ----
// Replaces legacy bicubic 4\xD74 (16 taps) with 3\xD73 kernel (9 taps)
// Performance: ~1.8\xD7 faster
// Quality: Quadratic B-spline (degree 2) smoothing, minimum 3\xD73 kernel to avoid lattice artifacts

// Quadratic B-spline basis functions for 3 samples
float quadratic3(float p0, float p1, float p2, float t) {
    float t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

// Catmull-Rom 3-point interpolation (degree 3, C\u2070 continuous)
float catmullRom3(float p0, float p1, float p2, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

float quadratic3x3Value(vec2 st, float freq, float speed) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    
    float nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    // Row -1 (y-1)
    float v00 = constant(st + vec2(-nd, -nd), freq, speed);
    float v10 = constant(st + vec2(0.0, -nd), freq, speed);
    float v20 = constant(st + vec2(nd, -nd), freq, speed);
    
    // Row 0 (y)
    float v01 = constant(st + vec2(-nd, 0.0), freq, speed);
    float v11 = constant(st, freq, speed);
    float v21 = constant(st + vec2(nd, 0.0), freq, speed);
    
    // Row 1 (y+1)
    float v02 = constant(st + vec2(-nd, nd), freq, speed);
    float v12 = constant(st + vec2(0.0, nd), freq, speed);
    float v22 = constant(st + vec2(nd, nd), freq, speed);
    
    // Quadratic interpolation along x for each row
    float y0 = quadratic3(v00, v10, v20, f.x);
    float y1 = quadratic3(v01, v11, v21, f.x);
    float y2 = quadratic3(v02, v12, v22, f.x);
    
    // Quadratic interpolation along y
    return quadratic3(y0, y1, y2, f.y);
}

float catmullRom3x3Value(vec2 st, float freq, float speed) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    
    float nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    float v00 = constant(st + vec2(-nd, -nd), freq, speed);
    float v10 = constant(st + vec2(0.0, -nd), freq, speed);
    float v20 = constant(st + vec2(nd, -nd), freq, speed);
    
    float v01 = constant(st + vec2(-nd, 0.0), freq, speed);
    float v11 = constant(st, freq, speed);
    float v21 = constant(st + vec2(nd, 0.0), freq, speed);
    
    float v02 = constant(st + vec2(-nd, nd), freq, speed);
    float v12 = constant(st + vec2(0.0, nd), freq, speed);
    float v22 = constant(st + vec2(nd, nd), freq, speed);
    
    // Catmull-Rom interpolation along x for each row
    float y0 = catmullRom3(v00, v10, v20, f.x);
    float y1 = catmullRom3(v01, v11, v21, f.x);
    float y2 = catmullRom3(v02, v12, v22, f.x);
    
    return catmullRom3(y0, y1, y2, f.y);
}

// ---- End 3\xD73 interpolation ----

// cubic B-spline interpolation (degree 3, C\xB2 continuous)
float blendBicubic(float p0, float p1, float p2, float p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    
    float b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

// Catmull-Rom 4-point interpolation (standard, tension=0.5)
float catmullRom4(float p0, float p1, float p2, float p3, float t) {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + 
           t * (3.0 * (p1 - p2) + p3 - p0)));
}

float blendLinearOrCosine(float a, float b, float amount, int interp) {
    if (interp == 1) {
        return mix(a, b, amount);
    }

    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

// Simplex 2D - MIT License
// https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl
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
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);

    vec2 uv = st * freq;
    uv.x += s;

    vec2 i  = floor(uv + dot(uv, C.yy));
    vec2 x0 = uv - i + dot(i, C.xx);

    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    float v = 130.0 * dot(m, g);

    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

float sineNoise(vec2 st, float freq, float s, float blend) {
    st *= freq;
    st.x += s;

    float a = blend;
    float b = blend;
    float c = 1.0 - blend;

    vec3 r1 = prng(vec3(s)) * 0.75 + 0.125;
    vec3 r2 = prng(vec3(s + 10.0)) * 0.75 + 0.125;
    float x = sin(r1.x * st.y + sin(r1.y * st.x + a) + sin(r1.z * st.x + b) + c);
    float y = sin(r2.x * st.x + sin(r2.y * st.y + b) + sin(r2.z * st.y + c) + a);

    return (x + y) * 0.5 + 0.5;
}

float bicubicValue(vec2 st, float freq, float speed) {
    // Neighbor Distance
    float ndX = 1.0 / freq;
    float ndY = 1.0 / freq;

    float u0 = st.x - ndX;
    float u1 = st.x;
    float u2 = st.x + ndX;
    float u3 = st.x + ndX + ndX;

    float v0 = st.y - ndY;
    float v1 = st.y;
    float v2 = st.y + ndY;
    float v3 = st.y + ndY + ndY;

    float x0y0 = constant(vec2(u0, v0), freq, speed);
    float x0y1 = constant(vec2(u0, v1), freq, speed);
    float x0y2 = constant(vec2(u0, v2), freq, speed);
    float x0y3 = constant(vec2(u0, v3), freq, speed);

    float x1y0 = constant(vec2(u1, v0), freq, speed);
    float x1y1 = constant(st, freq, speed);
    float x1y2 = constant(vec2(u1, v2), freq, speed);
    float x1y3 = constant(vec2(u1, v3), freq, speed);

    float x2y0 = constant(vec2(u2, v0), freq, speed);
    float x2y1 = constant(vec2(u2, v1), freq, speed);
    float x2y2 = constant(vec2(u2, v2), freq, speed);
    float x2y3 = constant(vec2(u2, v3), freq, speed);

    float x3y0 = constant(vec2(u3, v0), freq, speed);
    float x3y1 = constant(vec2(u3, v1), freq, speed);
    float x3y2 = constant(vec2(u3, v2), freq, speed);
    float x3y3 = constant(vec2(u3, v3), freq, speed);

    vec2 uv = st * freq;

    float y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    float y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    float y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    float y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return blendBicubic(y0, y1, y2, y3, fract(uv.y));
}

float catmullRom4x4Value(vec2 st, float freq, float speed) {
    // Neighbor Distance
    float ndX = 1.0 / freq;
    float ndY = 1.0 / freq;

    float u0 = st.x - ndX;
    float u1 = st.x;
    float u2 = st.x + ndX;
    float u3 = st.x + ndX + ndX;

    float v0 = st.y - ndY;
    float v1 = st.y;
    float v2 = st.y + ndY;
    float v3 = st.y + ndY + ndY;

    float x0y0 = constant(vec2(u0, v0), freq, speed);
    float x0y1 = constant(vec2(u0, v1), freq, speed);
    float x0y2 = constant(vec2(u0, v2), freq, speed);
    float x0y3 = constant(vec2(u0, v3), freq, speed);

    float x1y0 = constant(vec2(u1, v0), freq, speed);
    float x1y1 = constant(st, freq, speed);
    float x1y2 = constant(vec2(u1, v2), freq, speed);
    float x1y3 = constant(vec2(u1, v3), freq, speed);

    float x2y0 = constant(vec2(u2, v0), freq, speed);
    float x2y1 = constant(vec2(u2, v1), freq, speed);
    float x2y2 = constant(vec2(u2, v2), freq, speed);
    float x2y3 = constant(vec2(u2, v3), freq, speed);

    float x3y0 = constant(vec2(u3, v0), freq, speed);
    float x3y1 = constant(vec2(u3, v1), freq, speed);
    float x3y2 = constant(vec2(u3, v2), freq, speed);
    float x3y3 = constant(vec2(u3, v3), freq, speed);

    vec2 uv = st * freq;

    float y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    float y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    float y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    float y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return catmullRom4(y0, y1, y2, y3, fract(uv.y));
}

float value(vec2 st, float freq, int interp, float speed) {
    if (interp == 3) {
        // 3\xD73 Catmull-Rom (9 taps)
        return catmullRom3x3Value(st, freq, speed);
    } else if (interp == 4) {
        // 4\xD74 Catmull-Rom (16 taps)
        return catmullRom4x4Value(st, freq, speed);
    } else if (interp == 5) {
        // 3\xD73 quadratic B-spline (9 taps)
        return quadratic3x3Value(st, freq, speed);
    } else if (interp == 6) {
        // 4\xD74 cubic B-spline (16 taps)
        return bicubicValue(st, freq, speed);
    } else if (interp == 10) {
        // simplex
        float scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return simplexValue(st, freq, float(seed), scaledTime);
    } else if (interp == 11) {
        // sine
        float scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return sineNoise(st, freq, float(seed), scaledTime);
    }

    float x1y1 = constant(st, freq, speed);

    if (interp == 0) {
        return x1y1;
    }

    // Neighbor Distance
    float ndX = 1.0 / freq;
    float ndY = 1.0 / freq;

    float x1y2 = constant(vec2(st.x, st.y + ndY), freq, speed);
    float x2y1 = constant(vec2(st.x + ndX, st.y), freq, speed);
    float x2y2 = constant(vec2(st.x + ndX, st.y + ndY), freq, speed);

    vec2 uv = st * freq;

    float a = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), interp);
    float b = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), interp);

    return blendLinearOrCosine(a, b, fract(uv.y), interp);
}
// end value noise

float circles(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

float rings(vec2 st, float freq) {
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

float offset(vec2 st, float freq, int loopOffset, float speed, float seed) {
    if (loopOffset == 10) {
        // circle
        return circles(st, freq);
    } else if (loopOffset == 20) {
        return shape(st, 3, freq * 0.5);
    } else if (loopOffset == 30) {
        return (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq * 0.5;
    } else if (loopOffset >= 40 && loopOffset <= 120) {
        int sides = loopOffset / 10;
        return shape(st, sides, freq * 0.5);
    } else if (loopOffset == 200) {
        return st.x * freq * 0.5;
    } else if (loopOffset == 210) {
        return st.y * freq * 0.5;
    } else if (loopOffset >= 300 && loopOffset <= 380) {
        int idx = (loopOffset - 300) / 10;
        int interp = idx <= 6 ? idx : idx + 3;
        float f = loopOffset == 300 ? map(freq, 1.0, 6.0, 1.0, 20.0) : freq;
        return 1.0 - value(st + seed, f, interp, speed);
    } else if (loopOffset == 400) {
        // rings
        return 1.0 - rings(st, freq);
    } else if (loopOffset == 410) {
        // sine
        return 1.0 - diamonds(st, freq);
    }
    return 0.0;
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

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution.y;

    float lf1 = map(loopAScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf1 = floor(lf1);  // for seamless noise
#if LOOP_A_OFFSET >= 200 && LOOP_A_OFFSET < 300
        lf1 *= 2.0;
#endif
    }
    float amp1 = map(abs(speedA), 0.0, 100.0, 0.0, 1.0);
	float t1 = 1.0;
	if (speedA < 0.0) {
	    t1 = time + offset(st, lf1, LOOP_A_OFFSET, amp1, float(seed));
	} else if (speedA > 0.0) {
		t1 = time - offset(st, lf1, LOOP_A_OFFSET, amp1, float(seed));
	}
    float lf2 = map(loopBScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf2 = floor(lf2);  // for seamless noise
#if LOOP_B_OFFSET >= 200 && LOOP_B_OFFSET < 300
        lf2 *= 2.0;
#endif
    }
    float amp2 = map(abs(speedB), 0.0, 100.0, 0.0, 1.0);
	float t2 = 1.0;
	if (speedB < 0.0) {
	    t2 = time + offset(st, lf2, LOOP_B_OFFSET, amp2, float(seed) + 10.0);
	} else if (speedB > 0.0) {
		t2 = time - offset(st, lf2, LOOP_B_OFFSET, amp2, float(seed) + 10.0);
	}

    float a = periodicFunction(t1) * amp1;
    float b = periodicFunction(t2) * amp2;

    float d = (abs((a + b) - 1.0));
    if (cyclePalette == -1) {
        d += time;
    } else if (cyclePalette == 1) {
        d -= time;
    }
    color.rgb = pal(d);

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL shapes generator shader.
 * Matches the GLSL logic for procedural primitives with deterministic hashing so cross-backend renders stay identical.
 * All coordinate transforms are aspect-aware to prevent stretching when the module feeds either WebGL or WebGPU pipelines.
 */

struct Uniforms {
    data : array<vec4<f32>, 7>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

// LOOP_A_OFFSET and LOOP_B_OFFSET are compile-time consts injected by the
// runtime via injectDefines(). See classicNoisedeck/shapes/definition.js
// \`globals.LOOP_A_OFFSET.define\` / \`globals.LOOP_B_OFFSET.define\`.

var<private> resolution : vec2<f32>;
var<private> time : f32;
var<private> seed : f32;
var<private> wrap : bool;
var<private> loopAScale : f32;
var<private> loopBScale : f32;
var<private> speedA : f32;
var<private> speedB : f32;
var<private> paletteMode : i32;
var<private> paletteOffset : vec3<f32>;
var<private> paletteAmp : vec3<f32>;
var<private> paletteFreq : vec3<f32>;
var<private> palettePhase : vec3<f32>;
var<private> cyclePalette : i32;
var<private> rotatePalette : f32;
var<private> repeatPalette : f32;
var<private> aspectRatio : f32;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn rotate2D(st_in: vec2<f32>, rot: f32) -> vec2<f32> {
    var st = st_in;
    var angle = rot * PI;
    st = st - vec2<f32>(0.5 - aspectRatio, 0.5);
    let s = sin(angle);
    let c = cos(angle);
    st = mat2x2<f32>(c, -s, s, c) * st;
    st = st + vec2<f32>(0.5 - aspectRatio, 0.5);
    return st;
}

fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn prng(p0: vec3<f32>) -> vec3<f32> {
    var p = p0;
    if (p.x >= 0.0) { p.x = p.x * 2.0; } else { p.x = -p.x * 2.0 + 1.0; }
    if (p.y >= 0.0) { p.y = p.y * 2.0; } else { p.y = -p.y * 2.0 + 1.0; }
    if (p.z >= 0.0) { p.z = p.z * 2.0; } else { p.z = -p.z * 2.0 + 1.0; }
    let u = pcg(vec3<u32>(p));
    return vec3<f32>(u) / f32(0xffffffffu);
}

fn random(st: vec2<f32>) -> f32 {
    return prng(vec3<f32>(st, 0.0)).x;
}

fn periodicFunction(p: f32) -> f32 {
    let x = TAU * p;
    return map(sin(x), -1.0, 1.0, 0.0, 1.0);
}

fn constant(st_in: vec2<f32>, freq: f32, speed: f32) -> f32 {
    var x = st_in.x * freq;
    var y = st_in.y * freq;
    if (wrap) {
        x = modulo(x, freq);
        y = modulo(y, freq);
    }
    x = x + seed;
    let rand = prng(vec3<f32>(floor(vec2<f32>(x, y)), seed));
    let scaledTime = periodicFunction(rand.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.33);
    return periodicFunction(rand.y - scaledTime);
}

// ---- 3\xD73 quadratic interpolation ----
// Replaces legacy bicubic 4\xD74 (16 taps) with 3\xD73 kernel (9 taps)
// Performance: ~1.8\xD7 faster
// Quality: Quadratic B-spline (degree 2) smoothing, C\xB9 continuous

// Quadratic B-spline basis functions for 3 samples
fn quadratic3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

// Catmull-Rom 3-point interpolation (degree 3, C\u2070 continuous)
fn catmullRom3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

fn quadratic3x3Value(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    let lattice = st * freq;
    let f = fract(lattice);
    
    let nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    // Row -1 (y-1)
    let v00 = constant(st + vec2<f32>(-nd, -nd), freq, speed);
    let v10 = constant(st + vec2<f32>(0.0, -nd), freq, speed);
    let v20 = constant(st + vec2<f32>(nd, -nd), freq, speed);
    
    // Row 0 (y)
    let v01 = constant(st + vec2<f32>(-nd, 0.0), freq, speed);
    let v11 = constant(st, freq, speed);
    let v21 = constant(st + vec2<f32>(nd, 0.0), freq, speed);
    
    // Row 1 (y+1)
    let v02 = constant(st + vec2<f32>(-nd, nd), freq, speed);
    let v12 = constant(st + vec2<f32>(0.0, nd), freq, speed);
    let v22 = constant(st + vec2<f32>(nd, nd), freq, speed);
    
    // Quadratic interpolation along x for each row
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    
    // Quadratic interpolation along y
    return quadratic3(y0, y1, y2, f.y);
}

fn catmullRom3x3Value(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    let lattice = st * freq;
    let f = fract(lattice);
    
    let nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    let v00 = constant(st + vec2<f32>(-nd, -nd), freq, speed);
    let v10 = constant(st + vec2<f32>(0.0, -nd), freq, speed);
    let v20 = constant(st + vec2<f32>(nd, -nd), freq, speed);
    
    let v01 = constant(st + vec2<f32>(-nd, 0.0), freq, speed);
    let v11 = constant(st, freq, speed);
    let v21 = constant(st + vec2<f32>(nd, 0.0), freq, speed);
    
    let v02 = constant(st + vec2<f32>(-nd, nd), freq, speed);
    let v12 = constant(st + vec2<f32>(0.0, nd), freq, speed);
    let v22 = constant(st + vec2<f32>(nd, nd), freq, speed);
    
    let y0 = catmullRom3(v00, v10, v20, f.x);
    let y1 = catmullRom3(v01, v11, v21, f.x);
    let y2 = catmullRom3(v02, v12, v22, f.x);
    
    return catmullRom3(y0, y1, y2, f.y);
}

// ---- End 3\xD73 interpolation ----

fn blendBicubic(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    
    let b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    let b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    let b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    let b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

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

fn bicubicValue(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    let ndX = 1.0 / freq;
    let ndY = 1.0 / freq;

    let u0 = st.x - ndX;
    let u1 = st.x;
    let u2 = st.x + ndX;
    let u3 = st.x + ndX + ndX;

    let v0 = st.y - ndY;
    let v1 = st.y;
    let v2 = st.y + ndY;
    let v3 = st.y + ndY + ndY;

    let x0y0 = constant(vec2<f32>(u0, v0), freq, speed);
    let x0y1 = constant(vec2<f32>(u0, v1), freq, speed);
    let x0y2 = constant(vec2<f32>(u0, v2), freq, speed);
    let x0y3 = constant(vec2<f32>(u0, v3), freq, speed);

    let x1y0 = constant(vec2<f32>(u1, v0), freq, speed);
    let x1y1 = constant(st, freq, speed);
    let x1y2 = constant(vec2<f32>(u1, v2), freq, speed);
    let x1y3 = constant(vec2<f32>(u1, v3), freq, speed);

    let x2y0 = constant(vec2<f32>(u2, v0), freq, speed);
    let x2y1 = constant(vec2<f32>(u2, v1), freq, speed);
    let x2y2 = constant(vec2<f32>(u2, v2), freq, speed);
    let x2y3 = constant(vec2<f32>(u2, v3), freq, speed);

    let x3y0 = constant(vec2<f32>(u3, v0), freq, speed);
    let x3y1 = constant(vec2<f32>(u3, v1), freq, speed);
    let x3y2 = constant(vec2<f32>(u3, v2), freq, speed);
    let x3y3 = constant(vec2<f32>(u3, v3), freq, speed);

    let uv = st * freq;

    let y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    let y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    let y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    let y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return blendBicubic(y0, y1, y2, y3, fract(uv.y));
}

fn catmullRom4x4Value(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    // Neighbor Distance
    let ndX = 1.0 / freq;
    let ndY = 1.0 / freq;

    let u0 = st.x - ndX;
    let u1 = st.x;
    let u2 = st.x + ndX;
    let u3 = st.x + ndX + ndX;

    let v0 = st.y - ndY;
    let v1 = st.y;
    let v2 = st.y + ndY;
    let v3 = st.y + ndY + ndY;

    let x0y0 = constant(vec2<f32>(u0, v0), freq, speed);
    let x0y1 = constant(vec2<f32>(u0, v1), freq, speed);
    let x0y2 = constant(vec2<f32>(u0, v2), freq, speed);
    let x0y3 = constant(vec2<f32>(u0, v3), freq, speed);

    let x1y0 = constant(vec2<f32>(u1, v0), freq, speed);
    let x1y1 = constant(st, freq, speed);
    let x1y2 = constant(vec2<f32>(u1, v2), freq, speed);
    let x1y3 = constant(vec2<f32>(u1, v3), freq, speed);

    let x2y0 = constant(vec2<f32>(u2, v0), freq, speed);
    let x2y1 = constant(vec2<f32>(u2, v1), freq, speed);
    let x2y2 = constant(vec2<f32>(u2, v2), freq, speed);
    let x2y3 = constant(vec2<f32>(u2, v3), freq, speed);

    let x3y0 = constant(vec2<f32>(u3, v0), freq, speed);
    let x3y1 = constant(vec2<f32>(u3, v1), freq, speed);
    let x3y2 = constant(vec2<f32>(u3, v2), freq, speed);
    let x3y3 = constant(vec2<f32>(u3, v3), freq, speed);

    let uv = st * freq;

    let y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    let y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    let y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    let y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return catmullRom4(y0, y1, y2, y3, fract(uv.y));
}

// Simplex 2D - MIT License
fn mod289_3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_2(x: vec2<f32>) -> vec2<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute3(x: vec3<f32>) -> vec3<f32> {
    return mod289_3(((x * 34.0) + 1.0) * x);
}

fn simplexValue(st_in: vec2<f32>, freq: f32, s: f32, blend: f32) -> f32 {
    const C = vec4<f32>(
        0.211324865405187,
        0.366025403784439,
        -0.577350269189626,
        0.024390243902439
    );

    var uv = vec2<f32>(st_in.x * freq, st_in.y * freq);
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

fn sineNoise(st_in: vec2<f32>, freq: f32, s: f32, blend: f32) -> f32 {
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

fn value(st: vec2<f32>, freq: f32, interp: i32, speed: f32) -> f32 {
    if (interp == 3) {
        // 3\xD73 Catmull-Rom (9 taps)
        return catmullRom3x3Value(st, freq, speed);
    } else if (interp == 4) {
        // 4\xD74 Catmull-Rom (16 taps)
        return catmullRom4x4Value(st, freq, speed);
    } else if (interp == 5) {
        // 3\xD73 quadratic B-spline (9 taps)
        return quadratic3x3Value(st, freq, speed);
    } else if (interp == 6) {
        // 4\xD74 cubic B-spline (16 taps)
        return bicubicValue(st, freq, speed);
    } else if (interp == 10) {
        // simplex
        let scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return simplexValue(st, freq, seed, scaledTime);
    } else if (interp == 11) {
        // sine
        let scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return sineNoise(st, freq, seed, scaledTime);
    }
    let x1y1 = constant(st, freq, speed);
    if (interp == 0) {
        return x1y1;
    }
    let ndX = 1.0 / freq;
    let ndY = 1.0 / freq;
    let x1y2 = constant(vec2<f32>(st.x, st.y + ndY), freq, speed);
    let x2y1 = constant(vec2<f32>(st.x + ndX, st.y), freq, speed);
    let x2y2 = constant(vec2<f32>(st.x + ndX, st.y + ndY), freq, speed);
    let uv = st * freq;
    let a = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), interp);
    let b = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), interp);
    return blendLinearOrCosine(a, b, fract(uv.y), interp);
}

fn circles(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

fn rings(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

fn diamonds(st: vec2<f32>, freq: f32) -> f32 {
    var st2 = st;
    st2 = st2 - vec2<f32>(0.5 * aspectRatio, 0.5);
    st2 = st2 * freq;
    return cos(st2.x * PI) + cos(st2.y * PI);
}

fn shape(st: vec2<f32>, sides: i32, blend: f32) -> f32 {
    var st2 = st * 2.0 - vec2<f32>(aspectRatio, 1.0);
    let a = atan2(st2.x, st2.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st2) * blend;
}

fn offset(st: vec2<f32>, freq: f32, loopOffset: i32, speed: f32, seedIn: f32) -> f32 {
    if (loopOffset == 10) {
        return circles(st, freq);
    } else if (loopOffset == 20) {
        return shape(st, 3, freq * 0.5);
    } else if (loopOffset == 30) {
        return (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq * 0.5;
    } else if (loopOffset >= 40 && loopOffset <= 120) {
        let sides = loopOffset / 10;
        return shape(st, sides, freq * 0.5);
    } else if (loopOffset == 200) {
        return st.x * freq * 0.5;
    } else if (loopOffset == 210) {
        return st.y * freq * 0.5;
    } else if (loopOffset >= 300 && loopOffset <= 380) {
        let idx = (loopOffset - 300) / 10;
        let interp = select(idx + 3, idx, idx <= 6);
        let f = select(freq, map(freq, 1.0, 6.0, 1.0, 20.0), loopOffset == 300);
        return 1.0 - value(st + vec2<f32>(seedIn, seedIn), f, interp, speed);
    } else if (loopOffset == 400) {
        return 1.0 - rings(st, freq);
    } else if (loopOffset == 410) {
        return 1.0 - diamonds(st, freq);
    }
    return 0.0;
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

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;

    let maxc = max(r, max(g, b));
    let minc = min(r, min(g, b));
    let delta = maxc - minc;

    var h = 0.0;
    if (delta != 0.0) {
        if (maxc == r) {
            h = modulo((g - b) / delta, 6.0) / 6.0;
        } else if (maxc == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (maxc == b) {
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

// oklab transform and inverse
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

fn pal(t: f32) -> vec3<f32> {
    var tt = t * repeatPalette + rotatePalette * 0.01;
    var color = paletteOffset + paletteAmp * cos(6.28318 * (paletteFreq * tt + palettePhase));

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

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    seed = uniforms.data[0].w;

    wrap = uniforms.data[1].x > 0.5;
    loopAScale = uniforms.data[1].w;

    loopBScale = uniforms.data[2].x;
    speedA = uniforms.data[2].y;
    speedB = uniforms.data[2].z;
    paletteMode = i32(uniforms.data[2].w);

    paletteOffset = uniforms.data[3].xyz;
    cyclePalette = i32(uniforms.data[3].w);

    paletteAmp = uniforms.data[4].xyz;
    rotatePalette = uniforms.data[4].w;

    paletteFreq = uniforms.data[5].xyz;
    repeatPalette = uniforms.data[5].w;

    palettePhase = uniforms.data[6].xyz;

    aspectRatio = resolution.x / resolution.y;

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    var st = pos.xy / resolution.y;

    var lf1 = map(loopAScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf1 = floor(lf1);
        if (LOOP_A_OFFSET >= 200 && LOOP_A_OFFSET < 300) {
            lf1 = lf1 * 2.0;
        }
    }
    let amp1 = map(abs(speedA), 0.0, 100.0, 0.0, 1.0);
    var t1 = 1.0;
    if (speedA < 0.0) {
        t1 = time + offset(st, lf1, LOOP_A_OFFSET, amp1, seed);
    } else if (speedA > 0.0) {
        t1 = time - offset(st, lf1, LOOP_A_OFFSET, amp1, seed);
    }

    var lf2 = map(loopBScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf2 = floor(lf2);
        if (LOOP_B_OFFSET >= 200 && LOOP_B_OFFSET < 300) {
            lf2 = lf2 * 2.0;
        }
    }
    let amp2 = map(abs(speedB), 0.0, 100.0, 0.0, 1.0);
    var t2 = 1.0;
    if (speedB < 0.0) {
        t2 = time + offset(st, lf2, LOOP_B_OFFSET, amp2, seed + 10.0);
    } else if (speedB > 0.0) {
        t2 = time - offset(st, lf2, LOOP_B_OFFSET, amp2, seed + 10.0);
    }

    let a = periodicFunction(t1) * amp1;
    let b = periodicFunction(t2) * amp2;

    var d = abs((a + b) - 1.0);
    if (cyclePalette == -1) {
        d = d + time;
    } else if (cyclePalette == 1) {
        d = d - time;
    }
    color = vec4<f32>(pal(d), color.a);

    var st2 = pos.xy / resolution;

    return color;
}
`}},d=`# shapes

Interference patterns from geometric shapes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| loopAOffset | int | square | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseCatmullRom3x3/noiseCatmullRom4x4/noiseBSpline3x3/noiseBSpline4x4/noiseSimplex/noiseSine/Misc:/rings/sine | Loop a |
| loopBOffset | int | diamond | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseCatmullRom3x3/noiseCatmullRom4x4/noiseBSpline3x3/noiseBSpline4x4/noiseSimplex/noiseSine/Misc:/rings/sine | Loop b |
| loopAScale | float | 1 | 1-100 | A scale |
| loopBScale | float | 1 | 1-100 | B scale |
| speedA | float | 50 | -100-100 | Speed a |
| speedB | float | 50 | -100-100 | Speed b |
| seed | int | 1 | 1-100 | Noise seed |
| wrap | boolean | true | - | Wrap |
| palette | palette | sulphur | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| paletteMode | int | 0 | - | - |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| repeatPalette | int | 1 | 1-10 | Repeat palette |

## Usage

\`\`\`
search classicNoisedeck, synth

shapes()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(p).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(p))t.shaders[n]={...e}}t&&d&&(t.help=d);var L="classicNoisedeck/shapes",z="classicNoisedeck",N="shapes",M=t;export{M as default,L as effectId,N as effectName,d as help,z as namespace};
