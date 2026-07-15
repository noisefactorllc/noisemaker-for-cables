/* classicNoisedeck/bitEffects */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"BitEffects",namespace:"classicNoisedeck",func:"bitEffects",tags:["geometric","pattern"],openCategories:["general","bit mask"],description:"Bit field and bit mask effects",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},n:{slot:1,components:"z"},scale:{slot:2,components:"x"},rotation:{slot:2,components:"y"},speed:{slot:2,components:"z"},tiles:{slot:3,components:"y"},complexity:{slot:3,components:"z"},hueRange:{slot:4,components:"x"},hueRotation:{slot:4,components:"y"},baseHueRange:{slot:4,components:"z"},tileOffset:{slot:5,components:"xy"},fullResolution:{slot:5,components:"zw"}},globals:{mode:{type:"int",default:1,define:"MODE",choices:{bitField:0,bitMask:1},ui:{label:"mode",control:"dropdown"}},speed:{type:"float",default:50,uniform:"speed",min:0,max:100,zero:0,ui:{label:"speed",control:"slider"}},formula:{type:"int",default:0,define:"FORMULA",choices:{alien:0,sierpinski:1},ui:{label:"formula",control:"dropdown",category:"bit field",enabledBy:{param:"mode",eq:0}}},n:{type:"int",default:1,uniform:"n",min:1,max:200,ui:{label:"mod",control:"slider",category:"bit field",enabledBy:{param:"mode",eq:0}}},scale:{type:"float",default:75,uniform:"scale",min:1,max:100,ui:{label:"scale",control:"slider",category:"bit field",enabledBy:{param:"mode",eq:0}}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotate",control:"slider",category:"bit field",enabledBy:{param:"mode",eq:0}}},colorScheme:{type:"int",default:20,define:"COLOR_SCHEME",choices:{blue:0,cyan:1,green:2,magenta:3,red:4,white:5,yellow:6,blueAndGreen:10,blueAndRed:11,blueAndYellow:12,greenAndMagenta:13,greenAndRed:14,redAndCyan:15,redGreenAndBlue:20},ui:{label:"colors",control:"dropdown",category:"bit field",enabledBy:{param:"mode",eq:0}}},interp:{type:"int",default:0,define:"INTERP",choices:{constant:0,linear:1},ui:{label:"blend",control:"dropdown",category:"bit field",enabledBy:{param:"mode",eq:0}}},maskFormula:{type:"int",default:10,define:"MASK_FORMULA",choices:{invaders:10,wideInvaders:11,glyphs:20,areciboNumber:30},ui:{label:"formula",control:"dropdown",category:"bit mask",enabledBy:{param:"mode",eq:1}}},tiles:{type:"int",default:5,uniform:"tiles",min:1,max:40,ui:{label:"tiles",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}},complexity:{type:"float",default:57,uniform:"complexity",min:1,max:100,ui:{label:"complexity",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}},maskColorScheme:{type:"int",default:1,define:"MASK_COLOR_SCHEME",choices:{blackWhite:0,justHue:3,hueSaturation:2,hsv:1},ui:{label:"color space",control:"dropdown",category:"bit mask",enabledBy:{param:"mode",eq:1}}},baseHueRange:{type:"float",default:50,uniform:"baseHueRange",min:0,max:100,ui:{label:"hue variants",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}},hueRotation:{type:"float",default:180,uniform:"hueRotation",min:0,max:360,ui:{label:"hue rotate",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}},hueRange:{type:"float",default:25,uniform:"hueRange",min:0,max:100,ui:{label:"hue range",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}},seed:{type:"int",default:63,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider",category:"bit mask",enabledBy:{param:"mode",eq:1}}}},paramAliases:{loopAmp:"speed"},passes:[{name:"render",program:"bitEffects",inputs:{},outputs:{fragColor:"outputTex"}}]});var r={bitEffects:{glsl:`#version 300 es

/*
 * Bit-effects post processor.
 * Simulates 8-bit logic chains against the input feed by masking integer operations to reproduce hardware-limited artifacts.
 * PCG jitter and temporal remapping maintain deterministic scanline motion across render targets.
 */

precision highp float;
precision highp int;

uniform float time;
// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`). Picks bitField vs bitMask at compile time so the
// unused half of the shader is dead-code-eliminated. Each mode has its own
// independent set of helpers, ~1.4s of compile each on Windows Chrome via
// ANGLE\u2192D3D, so splitting them halves the worst-case compile time.
#ifndef MODE
#define MODE 1
#endif

// FORMULA, COLOR_SCHEME, INTERP are compile-time defines used only when
// MODE == 0 (bitField). MASK_FORMULA, MASK_COLOR_SCHEME are only used when
// MODE == 1 (bitMask). Same Knob 2 rationale as the rest of the series \u2014
// baking these lets ANGLE DCE the unreachable branches in the now-dispatched
// functions.
#ifndef FORMULA
#define FORMULA 0
#endif
#ifndef COLOR_SCHEME
#define COLOR_SCHEME 20
#endif
#ifndef INTERP
#define INTERP 0
#endif
#ifndef MASK_FORMULA
#define MASK_FORMULA 10
#endif
#ifndef MASK_COLOR_SCHEME
#define MASK_COLOR_SCHEME 1
#endif

uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float n;
uniform float scale;
uniform float rotation;
uniform float speed;
// \`mode\` is no longer a runtime uniform \u2014 see MODE define at top of file.
uniform float tiles;
uniform float complexity;
uniform float hueRange;
uniform float hueRotation;
uniform float baseHueRange;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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

vec2 rotate2D(vec2 st, float rot) {
    rot = map(rot, 0.0, 360.0, 0.0, 1.0);
    float angle = rot * TAU;
    st -= fullResolution * 0.5;
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += fullResolution * 0.5;
    return st;
}

// periodic function for looping
float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

// Noisemaker value noise - MIT License
// https://github.com/noisedeck/noisemaker/blob/master/noisemaker/value.py
vec3 randomFromLatticeWithOffset(vec2 st, float xFreq, float yFreq, float s, ivec2 offset) {
    vec2 lattice = vec2(st.x * xFreq, st.y * yFreq);
    vec2 baseFloor = floor(lattice);
    ivec2 base = ivec2(baseFloor) + offset;
    vec2 frac = lattice - baseFloor;

    int seedInt = int(floor(s));
    float seedFrac = fract(s);

    float xCombined = frac.x + seedFrac;
    int xi = base.x + seedInt + int(floor(xCombined));
    int yi = base.y;

    uint xBits = uint(xi);
    uint yBits = uint(yi);
    uint seedBits = floatBitsToUint(s);
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

float constant(vec2 st, float xFreq, float yFreq, float s) {
    vec3 randTime = randomFromLatticeWithOffset(st, xFreq, yFreq, s, ivec2(40, 0));
    float scaledTime = periodicFunction(randTime.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);

    vec3 rand = randomFromLatticeWithOffset(st, xFreq, yFreq, s, ivec2(0, 0));
    return periodicFunction(rand.x - scaledTime);
}

float value(vec2 st, float xFreq, float yFreq, float s) {
    float x1y1 = constant(st, xFreq, yFreq, s);

#if INTERP == 0
    return x1y1;
#else
    // Neighbor Distance
    float ndX = 1.0 / xFreq;
    float ndY = 1.0 / yFreq;

    float x1y2 = constant(vec2(st.x, st.y + ndY), xFreq, yFreq, s);
    float x2y1 = constant(vec2(st.x + ndX, st.y), xFreq, yFreq, s);
    float x2y2 = constant(vec2(st.x + ndX, st.y + ndY), xFreq, yFreq, s);

    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);

    float a = mix(x1y1, x2y1, fract(uv.x));
    float b = mix(x1y2, x2y2, fract(uv.x));

    return mix(a, b, fract(uv.y));
#endif
}

// bitwise operations
const int BIT_COUNT = 8;
const int mask = (1 << BIT_COUNT) - 1;

int modi(int x, int y) {
    return (x % y) & mask;
}

int or(int a, int b) {
    return (a & mask) | (b & mask);
}

int and(int a, int b) {
    return (a & mask) & (b & mask);
}

int not2(int a) {
    return (a ^ 0xFFFFFFFF) & mask;
}

int xor(int a, int b) {
    return (a & mask) ^ (b & mask);
}

float or(float a, float b) {
    return float(or(int(a), int(b)));
}

float and(float a, float b) {
    return float(and(int(a), int(b)));
}

float not3(float a) {
    return float(not2(int(a)));
}

float xor(float a, float b) {
    return float(xor(int(a), int(b)));
}
// end bitwise operations

// bit fields, inspired by https://twitter.com/aemkei/status/1378106731386040322
float bitValue(vec2 st, float freq, float nForColor) {
    float blendy = nForColor + periodicFunction(value(st, freq * 0.01, freq * 0.01, nForColor) * 0.1) * 100.0;

    float v = 1.0;

#if FORMULA == 0
    // alien
    v = mod(xor(st.x * freq, st.y * freq), blendy);
#elif FORMULA == 1
    // sierpinski
    v = mod(or(st.x * freq, st.y * freq), blendy);
#elif FORMULA == 2
    // circular
    v = mod((st.x * freq) * (st.y * freq), blendy);
#elif FORMULA == 3
    // steps
    v = float(xor(st.x * freq, st.y * freq) < blendy);
#elif FORMULA == 4
    // beams
    v = mod(st.x * freq * blendy, st.y * freq);
#elif FORMULA == 5
    // perspective
    v = mod(((st.x * freq - 0.5) * 0.25), st.y * freq - 0.5);
#endif

    return v > 1.0 ? 0.0 : 1.0;
}

vec3 bitField(vec2 st) {
    st /= scale;
    st = rotate2D(st, rotation); 
    
    float freq = map(scale, 1.0, 100.0, scale, 8.0);

    vec3 color = vec3(0.0);

#if COLOR_SCHEME == 0
    // blue
    color.b = bitValue(st, freq, n);
#elif COLOR_SCHEME == 1
    // cyan
    color.gb = vec2(bitValue(st, freq, n));
#elif COLOR_SCHEME == 2
    // green
    color.g = bitValue(st, freq, n);
#elif COLOR_SCHEME == 3
    // magenta
    color.br = vec2(bitValue(st, freq, n));
#elif COLOR_SCHEME == 4
    // red
    color.r = bitValue(st, freq, n);
#elif COLOR_SCHEME == 5
    // white
    color.rgb = vec3(bitValue(st, freq, n));
#elif COLOR_SCHEME == 6
    // yellow
    color.rg = vec2(bitValue(st, freq, n));
#elif COLOR_SCHEME == 10
    // blue green
    color.b = bitValue(st, freq, n);
    color.g = bitValue(st, freq, n + 1.0);
#elif COLOR_SCHEME == 11
    // blue red
    color.b = bitValue(st, freq, n);
    color.r = bitValue(st, freq, n + 1.0);
#elif COLOR_SCHEME == 12
    // blue yellow
    color.b = bitValue(st, freq, n);
    color.rg = vec2(bitValue(st, freq, n + 1.0));
#elif COLOR_SCHEME == 13
    // green magenta
    color.g = bitValue(st, freq, n);
    color.rb = vec2(bitValue(st, freq, n + 1.0));
#elif COLOR_SCHEME == 14
    // green red
    color.g = bitValue(st, freq, n);
    color.r = bitValue(st, freq, n + 1.0);
#elif COLOR_SCHEME == 15
    // red cyan
    color.r = bitValue(st, freq, n);
    color.bg = vec2(bitValue(st, freq, n + 1.0));
#elif COLOR_SCHEME == 20
    // rgb
    color.r = bitValue(st, freq, n);
    color.g = bitValue(st, freq, n + 1.0);
    color.b = bitValue(st, freq, n + 2.0);
#endif

    return color;
}

// from bit-mask
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

float maskValue(vec2 st, float xFreq, float yFreq, float s) {
    return constant(st, xFreq, yFreq, s);
}

float maskValue(vec2 st, float freq, float s) {
    return maskValue(st, freq, freq, s);
}

float arecibo(vec2 st, float xFreq, float yFreq, float _seed) {
    float xMod = mod(floor(st.x * xFreq), xFreq);
    float yMod = mod(floor(st.y * yFreq), yFreq);

    float v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (xFreq - 1.0) || yMod == (yFreq - 1.0)) {
        v = 0.0;
    } else if (yMod == 1.0) {
        v = xMod == 1.0 ? 1.0 : 0.0;
    } else {
        v = maskValue(st, xFreq, yFreq, _seed);
    }

    return v;
}

float areciboNum(vec2 st, float freq, float _seed) {
    return arecibo(st, floor(freq * 0.5) + 1.0, floor(freq), _seed);
}

float glyphs(vec2 st, float freq, float _seed) {
    float xFreq = floor(freq * 0.75);

    float xMod = mod(floor(st.x * xFreq), xFreq);
    float yMod = mod(floor(st.y * freq), freq);

    float v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (xFreq - 1.0) || yMod == (freq - 1.0)) {
        v = 0.0;
    } else {
        v = maskValue(st, xFreq, freq, _seed);
    }

    return v;
}

float invaders(vec2 st, float freq, float _seed) {
    float xMod = mod(floor(st.x * freq), freq);
    float yMod = mod(floor(st.y * freq), freq);

    float v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (freq - 1.0) || yMod == (freq - 1.0)) {
        v = 0.0;
    } else if (xMod >= freq * 0.5) {
        v = maskValue(vec2(floor(st.x) + (1.0 - fract(st.x)), st.y), freq, _seed);
    } else {
        v = maskValue(st, freq, _seed);
    }

    return v;
}

float bitMaskValue(vec2 st, float freq, float _seed) {
    float v = 1.0;

#if MASK_FORMULA == 10 || MASK_FORMULA == 11
    v = invaders(st, freq, _seed);
#elif MASK_FORMULA == 20
    v = glyphs(st, freq, _seed);
#elif MASK_FORMULA == 30
    v = areciboNum(st, freq, _seed);
#endif

    return v;
}

vec3 bitMask(vec2 st) {
    vec3 color = vec3(0.0);

    st -= vec2(0.5 * aspectRatio, 0.5);
    st *= tiles;
    st += vec2(0.5 * aspectRatio, 0.5);

    st.x -= 0.5 * aspectRatio;

#if MASK_FORMULA == 11
    st.y *= 2.0;
#endif

    float freq = floor(map(complexity, 1.0, 100.0, 5.0, 12.0));

    float mask = bitMaskValue(st, freq, -100.0) > 0.5 ? 1.0 : 0.0;

#if MASK_COLOR_SCHEME == 0
    color.r = mask;
    color.g = mask;
    color.b = mask;
#else
    {
        float baseHue = 0.01 + maskValue(st, 1.0, -100.0) * baseHueRange * 0.01;

        color.r = fract(baseHue + bitMaskValue(st, freq, 0.0) * hueRange * 0.01 + (1.0 - (hueRotation / 360.0))) * mask;

#if MASK_COLOR_SCHEME == 3
        color.g = mask;
#else
        color.g = bitMaskValue(st, freq, 25.0) * mask;
#endif

#if MASK_COLOR_SCHEME == 2 || MASK_COLOR_SCHEME == 3
        color.b = mask;
#else
        color.b = bitMaskValue(st, freq, 50.0) * mask;
#endif

        color = hsv2rgb(color);
    }
#endif
    return color;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 st = globalCoord;

#if MODE == 0
    // bit field
    color.rgb = bitField(st);
#else
    st = globalCoord / fullResolution.y;
    st += float(seed) + 1000.0;
    color.rgb = bitMask(st);
#endif

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL variant of the bit-effects post processor.
 * Implements 8-bit arithmetic and logical operators through masked integer math so the visuals match the GLSL reference exactly.
 * PCG-driven jitter and rotation mapping keep scanline permutations deterministic when speed modulates the timeline.
 */

struct Uniforms {
    data : array<vec4<f32>, 6>
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

var<private> time : f32;
var<private> seed : f32;
var<private> resolution : vec2<f32>;
var<private> n : f32;
var<private> scale : f32;
var<private> rotation : f32;
var<private> speed : f32;
// MODE, FORMULA, COLOR_SCHEME, INTERP, MASK_FORMULA, MASK_COLOR_SCHEME are
// compile-time consts injected by the runtime via injectDefines. See
// classicNoisedeck/bitEffects/definition.js \`globals.{mode,formula,
// colorScheme,interp,maskFormula,maskColorScheme}.define\`. Same fix as the
// GLSL backend \u2014 collapses the runtime dispatches so Dawn constant-folds.
var<private> tiles : f32;
var<private> complexity : f32;
var<private> hueRange : f32;
var<private> hueRotation : f32;
var<private> baseHueRange : f32;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;

    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;

    v.x = v.x ^ (v.x >> 16u);
    v.y = v.y ^ (v.y >> 16u);
    v.z = v.z ^ (v.z >> 16u);

    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;

    return v;
}

fn prng(p: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(pcg(vec3<u32>(p))) / f32(0xffffffffu);
}

fn rotate2D(st: vec2<f32>, rot: f32) -> vec2<f32> {
    var st2 = st;
    let angle = map(rot, 0.0, 360.0, 0.0, 1.0) * TAU;
    st2 = st2 - resolution * 0.5;
    let c = cos(angle);
    let s = sin(angle);
    let m = mat2x2<f32>(c, -s, s, c);
    st2 = m * st2;
    st2 = st2 + resolution * 0.5;
    return st2;
}

fn periodicFunction(p: f32) -> f32 {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

fn constant(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    var x = st.x * xFreq;
    var y = st.y * yFreq;

    x = x + s;

    let scaledTime = periodicFunction(
            prng(vec3<f32>(floor(vec2<f32>(x + 40.0, y)), 0.0)).x - time
        ) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);

    return periodicFunction(prng(vec3<f32>(floor(vec2<f32>(x, y)), 0.0)).x - scaledTime);
}

fn value(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    let x1y1 = constant(st, xFreq, yFreq, s);

    if (INTERP == 0) {
        return x1y1;
    }

    let ndX = 1.0 / xFreq;
    let ndY = 1.0 / yFreq;

    let x1y2 = constant(vec2<f32>(st.x, st.y + ndY), xFreq, yFreq, s);
    let x2y1 = constant(vec2<f32>(st.x + ndX, st.y), xFreq, yFreq, s);
    let x2y2 = constant(vec2<f32>(st.x + ndX, st.y + ndY), xFreq, yFreq, s);

    let uv = vec2<f32>(st.x * xFreq, st.y * yFreq);

    let a = mix(x1y1, x2y1, fract(uv.x));
    let b = mix(x1y2, x2y2, fract(uv.x));

    return mix(a, b, fract(uv.y));
}

const BIT_COUNT : u32 = 8u;
const mask : i32 = i32((1u << BIT_COUNT) - 1u);

fn modi(x: i32, y: i32) -> i32 {
    return (x % y) & mask;
}

fn or_i(a: i32, b: i32) -> i32 {
    return (a & mask) | (b & mask);
}

fn and_i(a: i32, b: i32) -> i32 {
    return (a & mask) & (b & mask);
}

fn not_i(a: i32) -> i32 {
    return (~a) & mask;
}

fn xor_i(a: i32, b: i32) -> i32 {
    return (a & mask) ^ (b & mask);
}

fn or_f(a: f32, b: f32) -> f32 {
    return f32(or_i(i32(a), i32(b)));
}

fn and_f(a: f32, b: f32) -> f32 {
    return f32(and_i(i32(a), i32(b)));
}

fn not_f(a: f32) -> f32 {
    return f32(not_i(i32(a)));
}

fn xor_f(a: f32, b: f32) -> f32 {
    return f32(xor_i(i32(a), i32(b)));
}

fn mod_f(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn bitValue(st: vec2<f32>, freq: f32, nForColor: f32) -> f32 {
    let blendy = nForColor + periodicFunction(value(st, freq * 0.01, freq * 0.01, nForColor) * 0.1) * 100.0;

    var v = 1.0;

    if (FORMULA == 0) {
        v = mod_f(xor_f(st.x * freq, st.y * freq), blendy);
    } else if (FORMULA == 1) {
        v = mod_f(or_f(st.x * freq, st.y * freq), blendy);
    } else if (FORMULA == 2) {
        v = mod_f((st.x * freq) * (st.y * freq), blendy);
    } else if (FORMULA == 3) {
        v = f32(xor_f(st.x * freq, st.y * freq) < blendy);
    } else if (FORMULA == 4) {
        v = mod_f(st.x * freq * blendy, st.y * freq);
    } else if (FORMULA == 5) {
        v = mod_f(((st.x * freq - 0.5) * 0.25), st.y * freq - 0.5);
    }

    return select(1.0, 0.0, v > 1.0);
}

fn bitField(st: vec2<f32>) -> vec3<f32> {
    var st2 = st / scale;
    st2 = rotate2D(st2, rotation);

    let freq = map(scale, 1.0, 100.0, scale, 8.0);

    var color = vec3<f32>(0.0);

    if (COLOR_SCHEME == 0) {
        color.z = bitValue(st2, freq, n);
    } else if (COLOR_SCHEME == 1) {
        let v1 = bitValue(st2, freq, n);
        color.y = v1;
        color.z = v1;
    } else if (COLOR_SCHEME == 2) {
        color.y = bitValue(st2, freq, n);
    } else if (COLOR_SCHEME == 3) {
        let v2 = bitValue(st2, freq, n);
        color.x = v2;
        color.z = v2;
    } else if (COLOR_SCHEME == 4) {
        color.x = bitValue(st2, freq, n);
    } else if (COLOR_SCHEME == 5) {
        color = vec3<f32>(bitValue(st2, freq, n));
    } else if (COLOR_SCHEME == 6) {
        let v3 = bitValue(st2, freq, n);
        color.x = v3;
        color.y = v3;
    } else if (COLOR_SCHEME == 10) {
        color.z = bitValue(st2, freq, n);
        color.y = bitValue(st2, freq, n + 1.0);
    } else if (COLOR_SCHEME == 11) {
        color.z = bitValue(st2, freq, n);
        color.x = bitValue(st2, freq, n + 1.0);
    } else if (COLOR_SCHEME == 12) {
        color.z = bitValue(st2, freq, n);
        let v4 = bitValue(st2, freq, n + 1.0);
        color.x = v4;
        color.y = v4;
    } else if (COLOR_SCHEME == 13) {
        color.y = bitValue(st2, freq, n);
        let v5 = bitValue(st2, freq, n + 1.0);
        color.x = v5;
        color.z = v5;
    } else if (COLOR_SCHEME == 14) {
        color.y = bitValue(st2, freq, n);
        color.x = bitValue(st2, freq, n + 1.0);
    } else if (COLOR_SCHEME == 15) {
        color.x = bitValue(st2, freq, n);
        let v6 = bitValue(st2, freq, n + 1.0);
        color.z = v6;
        color.y = v6;
    } else if (COLOR_SCHEME == 20) {
        color.x = bitValue(st2, freq, n);
        color.y = bitValue(st2, freq, n + 1.0);
        color.z = bitValue(st2, freq, n + 2.0);
    }

    return color;
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;

    let c = v * s;
    let x = c * (1.0 - abs(mod_f(h * 6.0, 2.0) - 1.0));
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
    } else {
        rgb = vec3<f32>(0.0);
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
            h = mod_f((g - b) / delta, 6.0) / 6.0;
        } else if (maxc == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (maxc == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }

    let s = select(0.0, delta / maxc, maxc != 0.0);
    let v = maxc;

    return vec3<f32>(h, s, v);
}

fn maskValueXY(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    return constant(st, xFreq, yFreq, s);
}

fn maskValue(st: vec2<f32>, freq: f32, s: f32) -> f32 {
    return maskValueXY(st, freq, freq, s);
}

fn arecibo(st: vec2<f32>, xFreq: f32, yFreq: f32, _seed: i32) -> f32 {
    let xMod = mod_f(floor(st.x * xFreq), xFreq);
    let yMod = mod_f(floor(st.y * yFreq), yFreq);

    var v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (xFreq - 1.0) || yMod == (yFreq - 1.0)) {
        v = 0.0;
    } else if (yMod == 1.0) {
        v = select(0.0, 1.0, xMod == 1.0);
    } else {
        v = maskValueXY(st, xFreq, yFreq, f32(_seed));
    }

    return v;
}

fn areciboNum(st: vec2<f32>, freq: f32, _seed: i32) -> f32 {
    return arecibo(st, floor(freq * 0.5) + 1.0, floor(freq), _seed);
}

fn glyphs(st: vec2<f32>, freq: f32, _seed: i32) -> f32 {
    let xFreq = floor(freq * 0.75);

    let xMod = mod_f(floor(st.x * xFreq), xFreq);
    let yMod = mod_f(floor(st.y * freq), freq);

    var v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (xFreq - 1.0) || yMod == (freq - 1.0)) {
        v = 0.0;
    } else {
        v = maskValueXY(st, xFreq, freq, f32(_seed));
    }

    return v;
}

fn invaders(st: vec2<f32>, freq: f32, _seed: i32) -> f32 {
    let xMod = mod_f(floor(st.x * freq), freq);
    let yMod = mod_f(floor(st.y * freq), freq);

    var v = 1.0;

    if (xMod == 0.0 || yMod == 0.0 || xMod == (freq - 1.0) || yMod == (freq - 1.0)) {
        v = 0.0;
    } else if (xMod >= freq * 0.5) {
        v = maskValue(vec2<f32>(floor(st.x) + (1.0 - fract(st.x)), st.y), freq, f32(_seed));
    } else {
        v = maskValue(st, freq, f32(_seed));
    }

    return v;
}

fn bitMaskValue(st: vec2<f32>, freq: f32, _seed: i32) -> f32 {
    var v = 1.0;

    if (MASK_FORMULA == 10 || MASK_FORMULA == 11) {
        v = invaders(st, freq, _seed);
    } else if (MASK_FORMULA == 20) {
        v = glyphs(st, freq, _seed);
    } else if (MASK_FORMULA == 30) {
        v = areciboNum(st, freq, _seed);
    }

    return v;
}

fn bitMask(st: vec2<f32>) -> vec3<f32> {
    var color = vec3<f32>(0.0);

    var st2 = st;
    let aspectRatio = resolution.x / resolution.y;
    st2 = st2 - vec2<f32>(0.5 * aspectRatio, 0.5);
    st2 = st2 * tiles;
    st2 = st2 + vec2<f32>(0.5 * aspectRatio, 0.5);

    st2.x = st2.x - 0.5 * aspectRatio;

    if (MASK_FORMULA == 11) {
        st2.y = st2.y * 2.0;
    }

    let freq = floor(map(complexity, 1.0, 100.0, 5.0, 12.0));

    let mask = select(0.0, 1.0, bitMaskValue(st2, freq, -100) > 0.5);

    if (MASK_COLOR_SCHEME == 0) {
        color = vec3<f32>(mask);
    } else {
        let baseHue = 0.01 + maskValue(st2, 1.0, -100.0) * baseHueRange * 0.01;

        color.x = fract(baseHue + bitMaskValue(st2, freq, 0) * hueRange * 0.01 + (1.0 - (hueRotation / 360.0))) * mask;

        if (MASK_COLOR_SCHEME == 3) {
            color.y = mask;
        } else {
            color.y = bitMaskValue(st2, freq, 25) * mask;
        }

        if (MASK_COLOR_SCHEME == 2 || MASK_COLOR_SCHEME == 3) {
            color.z = mask;
        } else {
            color.z = bitMaskValue(st2, freq, 50) * mask;
        }

        color = hsv2rgb(color);
    }
    return color;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    seed = uniforms.data[0].w;

    // uniforms.data[1].x was formula \u2014 now compile-time FORMULA
    // uniforms.data[1].y was colorScheme \u2014 now compile-time COLOR_SCHEME
    n = uniforms.data[1].z;
    // uniforms.data[1].w was interp \u2014 now compile-time INTERP

    scale = uniforms.data[2].x;
    rotation = uniforms.data[2].y;
    speed = uniforms.data[2].z;
    // slot 2 component w is unused \u2014 \`mode\` is a compile-time define

    // uniforms.data[3].x was maskFormula \u2014 now compile-time MASK_FORMULA
    tiles = uniforms.data[3].y;
    complexity = uniforms.data[3].z;
    // uniforms.data[3].w was maskColorScheme \u2014 now compile-time MASK_COLOR_SCHEME

    hueRange = uniforms.data[4].x;
    hueRotation = uniforms.data[4].y;
    baseHueRange = uniforms.data[4].z;

    var color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    let tileOffset = uniforms.data[5].xy;
    let fullResolution = uniforms.data[5].zw;
    var st = pos.xy + tileOffset;

    if (MODE == 0) {
        color = vec4<f32>(bitField(st), color.a);
    } else {
        st = (pos.xy + tileOffset) / fullResolution.y;
        st = st + f32(seed) + 1000.0;
        color = vec4<f32>(bitMask(st), color.a);
    }

    var st2 = pos.xy / resolution;

    return color;
}

`}},a=`# bitEffects

Bit field and bit mask effects

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | bitMask | bitField/bitMask | Mode |
| speed | float | 50 | 0-100 | Speed |
| formula | int | alien | alien/sierpinski | Formula |
| n | int | 1 | 1-200 | Mod |
| colorScheme | int | redGreenAndBlue | blue/cyan/green/magenta/red/white/yellow/blueAndGreen/blueAndRed/blueAndYellow/greenAndMagenta/greenAndRed/redAndCyan/redGreenAndBlue | Colors |
| interp | int | constant | constant/linear | Blend |
| scale | float | 75 | 1-100 | Scale |
| rotation | float | 0 | -180-180 | Rotate |
| maskFormula | int | invaders | invaders/wideInvaders/glyphs/areciboNumber | Formula |
| tiles | int | 5 | 1-40 | Tiles |
| complexity | float | 57 | 1-100 | Complexity |
| maskColorScheme | int | hsv | blackWhite/justHue/hueSaturation/hsv | Color space |
| baseHueRange | float | 50 | 0-100 | Hue variants |
| hueRotation | float | 180 | 0-360 | Hue rotate |
| hueRange | float | 25 | 0-100 | Hue range |
| seed | int | 63 | 1-100 | Seed |

## Usage

\`\`\`
search classicNoisedeck, synth

bitEffects()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(r))e.shaders[o]={...n}}e&&a&&(e.help=a);var c="classicNoisedeck/bitEffects",d="classicNoisedeck",u="bitEffects",m=e;export{m as default,c as effectId,u as effectName,a as help,d as namespace};
