/* classicNoisedeck/moodscape */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Moodscape",namespace:"classicNoisedeck",func:"moodscape",tags:["noise"],description:"Refracted value noise with multiple color modes",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},noiseScale:{slot:1,components:"y"},speed:{slot:1,components:"z"},refractAmt:{slot:1,components:"w"},ridges:{slot:2,components:"x"},wrap:{slot:2,components:"y"},hueRotation:{slot:2,components:"w"},hueRange:{slot:3,components:"x"},intensity:{slot:3,components:"y"},tileOffset:{slot:4,components:"xy"},fullResolution:{slot:4,components:"zw"}},globals:{interp:{type:"int",default:10,choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6,simplex:10,sine:11},ui:{label:"noise type",control:"dropdown"},define:"NOISE_TYPE"},noiseScale:{type:"float",default:85,min:1,max:200,ui:{label:"scale",control:"slider"},uniform:"noiseScale"},speed:{type:"float",default:25,min:0,max:100,zero:0,ui:{label:"speed",control:"slider"},uniform:"speed"},refractAmt:{type:"float",default:5,min:0,max:100,ui:{label:"refract",control:"slider"},uniform:"refractAmt"},ridges:{type:"boolean",default:!0,ui:{label:"ridges",control:"checkbox"},uniform:"ridges"},wrap:{type:"boolean",default:!0,ui:{label:"wrap",control:"checkbox",enabledBy:{param:"interp",lt:10}},uniform:"wrap"},seed:{type:"int",default:44,min:0,max:100,ui:{label:"seed",control:"slider"},uniform:"seed"},colorMode:{type:"int",default:2,choices:{mono:0,rgb:1,hsv:2,oklab:3},ui:{label:"color mode",control:"dropdown",category:"color"},define:"COLOR_MODE"},hueRotation:{type:"float",default:180,min:0,max:360,ui:{label:"hue rotation",control:"slider",category:"color",enabledBy:{param:"colorMode",neq:0}},uniform:"hueRotation"},hueRange:{type:"float",default:25,min:0,max:100,ui:{label:"hue range",control:"slider",category:"color",enabledBy:{param:"colorMode",eq:2}},uniform:"hueRange"},intensity:{type:"float",default:0,min:-100,max:100,ui:{label:"intensity",control:"slider",category:"color"},uniform:"intensity"}},paramAliases:{loopAmp:"speed"},passes:[{name:"render",program:"moodscape",inputs:{},outputs:{fragColor:"outputTex"}}]});var o={moodscape:{glsl:`#version 300 es

/*
 * Moodscape shader.
 * Refracted value noise with multiple color modes.
 */

precision highp float;
precision highp int;

// NOISE_TYPE is a compile-time define injected by the runtime (see
// definition.js \`globals.NOISE_TYPE.define\`). Wrapping the variant dispatch in
// #if blocks instead of a runtime if-cascade avoids ANGLE\u2192D3D inlining the
// entire 9-way decision tree at every call site, which produced ~35 second
// compiles on Windows Chrome \u2014 see HANDOFF-shader-compile.md.
#ifndef NOISE_TYPE
#define NOISE_TYPE 10
#endif

// COLOR_MODE is a compile-time define injected by the runtime (see
// definition.js \`globals.colorMode.define\`). Same Knob 2 fix as
// classicNoisedeck/noise: the 4-way color cascade in main() pulls hsv2rgb,
// rgb2hsv, oklab and srgb conversions into HLSL inlining at the same call
// site even though only one is reachable.
#ifndef COLOR_MODE
#define COLOR_MODE 2
#endif

uniform float time;
uniform int seed;
uniform bool wrap;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float noiseScale;
uniform float refractAmt;
uniform float speed;
uniform float hueRotation;
uniform float hueRange;
uniform float intensity;
uniform bool ridges;
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
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}
// end PCG PRNG

vec3 brightnessContrast(vec3 color) {
    float bright = map(intensity, -100.0, 100.0, -0.4, 0.4);
    float cont = 1.0;
    if ( intensity < 0.0) {
        cont = map(intensity, -100.0, 0.0, 0.5, 1.0);
    } else {
        cont = map(intensity, 0.0, 100.0, 1.0, 1.5);
    }

    color = (color - 0.5) * cont + 0.5 + bright;
    return color;
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

// periodic function for looping
float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
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

#if NOISE_TYPE == 10
float simplexValue(vec2 st, float xFreq, float yFreq, float s, float blend) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);
    uv.x += s;

    // First corner
    vec2 i  = floor(uv + dot(uv, C.yy) );
    vec2 x0 = uv -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		  + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    float v = 130.0 * dot(m, g);

    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}
// end simplex

#endif

#if NOISE_TYPE == 11
float sineNoise(vec2 st, float xFreq, float yFreq, float s, float blend) {
    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);
    uv.x += s;

    float a = blend;
    float b = blend;
    float c = 1.0 - blend;

    vec3 r1 = prng(vec3(s, 0.0, 0.0)) * 0.75 + 0.125;
    vec3 r2 = prng(vec3(s + 10.0, 0.0, 0.0)) * 0.75 + 0.125;
    float x = sin(r1.x * uv.y + sin(r1.y * uv.x + a) + sin(r1.z * uv.x + b) + c);
    float y = sin(r2.x * uv.x + sin(r2.y * uv.y + b) + sin(r2.z * uv.y + c) + a);

    return (x + y) * 0.5 + 0.5;
}
#endif

// Noisemaker value noise - MIT License
int positiveModulo(int value, int modulus) {
    if (modulus == 0) {
        return 0;
    }

    int r = value % modulus;
    return (r < 0) ? r + modulus : r;
}

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

    if (wrap) {
        int freqXInt = int(xFreq + 0.5);
        int freqYInt = int(yFreq + 0.5);

        if (freqXInt > 0) {
            xi = positiveModulo(xi, freqXInt);
        }
        if (freqYInt > 0) {
            yi = positiveModulo(yi, freqYInt);
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

float constant(vec2 st, float xFreq, float yFreq, float s) {
    vec3 rand = randomFromLatticeWithOffset(st, xFreq, yFreq, s, ivec2(0, 0));
    float scaledTime = periodicFunction(rand.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.25);
    return periodicFunction(rand.y - scaledTime);
}

float constantOffset(vec2 st, float xFreq, float yFreq, float s, ivec2 offset) {
    vec3 rand = randomFromLatticeWithOffset(st, xFreq, yFreq, s, offset);
    float scaledTime = periodicFunction(rand.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.25);
    return periodicFunction(rand.y - scaledTime);
}

// 3x3 quadratic interpolation
float quadratic3(float p0, float p1, float p2, float t) {
    float t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

float catmullRom3(float p0, float p1, float p2, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) +
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

#if NOISE_TYPE == 5
float quadratic3x3Value(vec2 st, float xFreq, float yFreq, float s) {
    vec2 lattice = vec2(st.x * xFreq, st.y * yFreq);
    vec2 f = fract(lattice);
    
    float v00 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, -1));
    float v10 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, -1));
    float v20 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, -1));
    
    float v01 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, 0));
    float v11 = constant(st, xFreq, yFreq, s);
    float v21 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, 0));
    
    float v02 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, 1));
    float v12 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, 1));
    float v22 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, 1));
    
    float y0 = quadratic3(v00, v10, v20, f.x);
    float y1 = quadratic3(v01, v11, v21, f.x);
    float y2 = quadratic3(v02, v12, v22, f.x);
    
    return quadratic3(y0, y1, y2, f.y);
}

#endif

#if NOISE_TYPE == 3
float catmullRom3x3Value(vec2 st, float xFreq, float yFreq, float s) {
    vec2 lattice = vec2(st.x * xFreq, st.y * yFreq);
    vec2 f = fract(lattice);
    
    float v00 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, -1));
    float v10 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, -1));
    float v20 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, -1));
    
    float v01 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, 0));
    float v11 = constant(st, xFreq, yFreq, s);
    float v21 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, 0));
    
    float v02 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, 1));
    float v12 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, 1));
    float v22 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, 1));
    
    float y0 = catmullRom3(v00, v10, v20, f.x);
    float y1 = catmullRom3(v01, v11, v21, f.x);
    float y2 = catmullRom3(v02, v12, v22, f.x);
    
    return catmullRom3(y0, y1, y2, f.y);
}
#endif

// cubic B-spline interpolation
float blendBicubic(float p0, float p1, float p2, float p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    
    float b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

float catmullRom4(float p0, float p1, float p2, float p3, float t) {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + 
           t * (3.0 * (p1 - p2) + p3 - p0)));
}

float blendLinearOrCosine(float a, float b, float amount, int nType) {
    if (nType == 1) {
        return mix(a, b, amount);
    }

    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

#if NOISE_TYPE == 6
float bicubicValue(vec2 st, float xFreq, float yFreq, float s) {
    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);
    vec2 f = fract(uv);

    float x0y0 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, -1));
    float x0y1 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  0));
    float x0y2 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  1));
    float x0y3 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  2));

    float x1y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, -1));
    float x1y1 = constant(st, xFreq, yFreq, s);
    float x1y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 0,  1));
    float x1y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 0,  2));

    float x2y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, -1));
    float x2y1 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  0));
    float x2y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  1));
    float x2y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  2));

    float x3y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 2, -1));
    float x3y1 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  0));
    float x3y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  1));
    float x3y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  2));

    float y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, f.x);
    float y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, f.x);
    float y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, f.x);
    float y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, f.x);

    return clamp(blendBicubic(y0, y1, y2, y3, f.y), 0.0, 1.0);
}

#endif

#if NOISE_TYPE == 4
float catmullRom4x4Value(vec2 st, float xFreq, float yFreq, float s) {
    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);
    vec2 f = fract(uv);

    float x0y0 = constantOffset(st, xFreq, yFreq, s, ivec2(-1, -1));
    float x0y1 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  0));
    float x0y2 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  1));
    float x0y3 = constantOffset(st, xFreq, yFreq, s, ivec2(-1,  2));

    float x1y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 0, -1));
    float x1y1 = constant(st, xFreq, yFreq, s);
    float x1y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 0,  1));
    float x1y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 0,  2));

    float x2y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 1, -1));
    float x2y1 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  0));
    float x2y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  1));
    float x2y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 1,  2));

    float x3y0 = constantOffset(st, xFreq, yFreq, s, ivec2( 2, -1));
    float x3y1 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  0));
    float x3y2 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  1));
    float x3y3 = constantOffset(st, xFreq, yFreq, s, ivec2( 2,  2));

    float y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, f.x);
    float y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, f.x);
    float y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, f.x);
    float y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, f.x);

    return clamp(catmullRom4(y0, y1, y2, y3, f.y), 0.0, 1.0);
}
#endif

float value(vec2 st, float xFreq, float yFreq, float s) {
#if NOISE_TYPE == 0
    return constant(st, xFreq, yFreq, s);
#elif NOISE_TYPE == 3
    return catmullRom3x3Value(st, xFreq, yFreq, s);
#elif NOISE_TYPE == 4
    return catmullRom4x4Value(st, xFreq, yFreq, s);
#elif NOISE_TYPE == 5
    return quadratic3x3Value(st, xFreq, yFreq, s);
#elif NOISE_TYPE == 6
    return bicubicValue(st, xFreq, yFreq, s);
#elif NOISE_TYPE == 10
    float scaledTime10 = simplexValue(st, xFreq, yFreq, s + 50.0, time) * speed * 0.0025;
    return simplexValue(st, xFreq, yFreq, s, scaledTime10);
#elif NOISE_TYPE == 11
    float scaledTime11 = sineNoise(st, xFreq, yFreq, s + 50.0, time) * speed * 0.0025;
    return sineNoise(st, xFreq, yFreq, s, scaledTime11);
#else
    // NOISE_TYPE == 1 (linear) or NOISE_TYPE == 2 (hermite/cosine)
    vec2 uv = vec2(st.x * xFreq, st.y * yFreq);
    vec2 f = fract(uv);

    float x0y0 = constant(st, xFreq, yFreq, s);
    float x1y0 = constantOffset(st, xFreq, yFreq, s, ivec2(1, 0));
    float x0y1 = constantOffset(st, xFreq, yFreq, s, ivec2(0, 1));
    float x1y1 = constantOffset(st, xFreq, yFreq, s, ivec2(1, 1));

    float a = blendLinearOrCosine(x0y0, x1y0, f.x, NOISE_TYPE);
    float b = blendLinearOrCosine(x0y1, x1y1, f.x, NOISE_TYPE);

    return clamp(blendLinearOrCosine(a, b, f.y, NOISE_TYPE), 0.0, 1.0);
#endif
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution.y;
    st -= vec2(aspectRatio * 0.5, 0.5);

    float xFreq = 1.0;
    float yFreq = 1.0;
#if NOISE_TYPE == 10
    xFreq = map(noiseScale, 1.0, 100.0, 1.0, 0.25);
    yFreq = xFreq * 1.5;
#elif NOISE_TYPE == 4
    xFreq = map(noiseScale, 1.0, 100.0, 1.5, 1.0);
    yFreq = xFreq * 1.5;
#else
    if (wrap) {
        xFreq = floor(map(noiseScale, 1.0, 100.0, 3.0, 2.0));
        yFreq = xFreq;
    } else {
        xFreq = map(noiseScale, 1.0, 100.0, 1.5, 1.0);
        yFreq = xFreq * 1.5;
    }
#endif

    float s = float(seed);

    // Refract values
    float xRef = value(st, xFreq, yFreq, +20.0 + s);
    float yRef = value(st, xFreq, yFreq, +10.0 + s);

    float ref = map(refractAmt, 0.0, 100.0, 0.0, 2.5);
    vec2 uv = vec2(st.x + xRef * ref, st.y + yRef * ref);

#if COLOR_MODE == 0
    color.rgb = vec3(value(uv, xFreq, yFreq, s));
#else
    color = vec4(
        value(uv, xFreq, yFreq, s),
        value(uv, xFreq, yFreq, 10.0 + s),
        value(uv, xFreq, yFreq, 20.0 + s),
        1.0);
#endif

#if COLOR_MODE == 0
    // grayscale
    if (ridges) {
        color = 1.0 - abs(color * 2.0 - 1.0);
    }
#elif COLOR_MODE == 1
    // rgb
    if (ridges) {
        color = 1.0 - abs(color * 2.0 - 1.0);
    }
    color.rgb = rgb2hsv(color.rgb);
    color.r += 1.0 - (hueRotation / 360.0);
    color.r = fract(color.r);
    color.rgb = hsv2rgb(color.rgb);
#elif COLOR_MODE == 2
    // hsv
    color.r = color.r * hueRange * 0.01;
    color.r += 1.0 - (hueRotation / 360.0);
    if (ridges) {
        color.b = 1.0 - abs(color.b * 2.0 - 1.0);
    }
    color.rgb = hsv2rgb(color.rgb);
#else
    // oklab (COLOR_MODE == 3)
    color.g = color.g * -.509 + .276;
    color.b = color.b * -.509 + .198;

    color.rgb = linear_srgb_from_oklab(color.rgb);
    color.rgb = linearToSrgb(color.rgb);
    color.rgb = rgb2hsv(color.rgb);
    color.r += 1.0 - (hueRotation / 360.0);
    color.r = fract(color.r);
    if (ridges) {
        color.b = 1.0 - abs(color.b * 2.0 - 1.0);
    }
    color.rgb = hsv2rgb(color.rgb);
#endif

    color.rgb = brightnessContrast(color.rgb);
    color.a = 1.0;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL Moodscape shader.
 * Refracted value noise with multiple color modes.
 */

// NOISE_TYPE and COLOR_MODE are compile-time consts injected by the runtime
// via injectDefines. See classicNoisedeck/moodscape/definition.js
// \`globals.{interp,colorMode}.define\`. Same fix as the GLSL backend \u2014
// collapses the runtime color cascade so Dawn constant-folds the variant
// branches.

// Packed uniforms layout:
//   data[0]: resolution.xy, time, seed
//   data[1]: (slot freed \u2014 interp is a compile-time define), noiseScale, speed, refractAmt
//   data[2]: ridges, wrap, (slot freed \u2014 colorMode is now compile-time COLOR_MODE), hueRotation
//   data[3]: hueRange, intensity, _pad, _pad
struct Uniforms {
    data: array<vec4<f32>, 5>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

var<private> resolution: vec2<f32>;
var<private> time: f32;
var<private> seed: i32;
var<private> noiseScale: f32;
var<private> speed: f32;
var<private> refractAmt: f32;
var<private> ridges: i32;
var<private> wrap: i32;
var<private> hueRotation: f32;
var<private> hueRange: f32;
var<private> intensity: f32;

fn unpackUniforms() {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    seed = i32(uniforms.data[0].w);
    noiseScale = uniforms.data[1].y;
    speed = uniforms.data[1].z;
    refractAmt = uniforms.data[1].w;
    ridges = i32(uniforms.data[2].x);
    wrap = i32(uniforms.data[2].y);
    // uniforms.data[2].z was colorMode \u2014 now compile-time COLOR_MODE
    hueRotation = uniforms.data[2].w;
    hueRange = uniforms.data[3].x;
    intensity = uniforms.data[3].y;
}

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// PCG PRNG
fn pcg(v: vec3<u32>) -> vec3<u32> {
    var r = v;
    r = r * u32(1664525) + u32(1013904223);

    r.x += r.y * r.z;
    r.y += r.z * r.x;
    r.z += r.x * r.y;

    r = r ^ (r >> vec3<u32>(16u));

    r.x += r.y * r.z;
    r.y += r.z * r.x;
    r.z += r.x * r.y;

    return r;
}

fn prng(p: vec3<f32>) -> vec3<f32> {
    var q = p;
    q.x = select(-q.x * 2.0 + 1.0, q.x * 2.0, q.x >= 0.0);
    q.y = select(-q.y * 2.0 + 1.0, q.y * 2.0, q.y >= 0.0);
    q.z = select(-q.z * 2.0 + 1.0, q.z * 2.0, q.z >= 0.0);
    return vec3<f32>(pcg(vec3<u32>(q))) / f32(0xffffffffu);
}

fn brightnessContrast(color: vec3<f32>) -> vec3<f32> {
    let bright: f32 = map(intensity, -100.0, 100.0, -0.4, 0.4);
    var cont: f32 = 1.0;
    if (intensity < 0.0) {
        cont = map(intensity, -100.0, 0.0, 0.5, 1.0);
    } else {
        cont = map(intensity, 0.0, 100.0, 1.0, 1.5);
    }

    return (color - 0.5) * cont + 0.5 + bright;
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    var h: f32 = fract(hsv.x);
    var s: f32 = hsv.y;
    var v: f32 = hsv.z;
    
    var c: f32 = v * s;
    var x: f32 = c * (1.0 - abs(modulo(h * 6.0, 2.0) - 1.0));
    var m: f32 = v - c;

    var rgb: vec3<f32>;

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
        rgb = vec3<f32>(0.0, 0.0, 0.0);
    }

    return rgb + vec3<f32>(m, m, m);
}

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    var r: f32 = rgb.r;
    var g: f32 = rgb.g;
    var b: f32 = rgb.b;
    
    var maxc: f32 = max(r, max(g, b));
    var minc: f32 = min(r, min(g, b));
    var delta: f32 = maxc - minc;

    var h: f32 = 0.0;
    if (delta != 0.0) {
        if (maxc == r) {
            h = modulo((g - b) / delta, 6.0) / 6.0;
        } else if (maxc == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (maxc == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }

    var s: f32 = select(delta / maxc, 0.0, maxc == 0.0);
    var v: f32 = maxc;

    return vec3<f32>(h, s, v);
}

fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// oklab
const fwdA: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(1.0, 1.0, 1.0),
    vec3<f32>(0.3963377774, -0.1055613458, -0.0894841775),
    vec3<f32>(0.2158037573, -0.0638541728, -1.2914855480)
);

const fwdB: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(4.0767245293, -1.2681437731, -0.0041119885),
    vec3<f32>(-3.3072168827, 2.6093323231, -0.7034763098),
    vec3<f32>(0.2307590544, -0.3411344290,  1.7068625689)
);

const invB: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(0.4121656120, 0.2118591070, 0.0883097947),
    vec3<f32>(0.5362752080, 0.6807189584, 0.2818474174),
    vec3<f32>(0.0514575653, 0.1074065790, 0.6302613616)
);

const invA: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(0.2104542553, 1.9779984951, 0.0259040371),
    vec3<f32>(0.7936177850, -2.4285922050, 0.7827717662),
    vec3<f32>(-0.0040720468, 0.4505937099, -0.8086757660)
);

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    var lms: vec3<f32> = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn periodicFunction(p: f32) -> f32 {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

// Simplex 2D
fn mod289_3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_2(x: vec2<f32>) -> vec2<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec3<f32>) -> vec3<f32> {
    return mod289_3(((x*34.0)+1.0)*x);
}

fn simplexValue(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32, blend: f32) -> f32 {
    const C: vec4<f32> = vec4<f32>(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

    var uv: vec2<f32> = vec2<f32>(st.x * xFreq, st.y * yFreq);
    uv.x += s;

    var i: vec2<f32> = floor(uv + dot(uv, C.yy) );
    var x0: vec2<f32> = uv -   i + dot(i, C.xx);

    var i1: vec2<f32>;
    i1 = select(vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 0.0), x0.x > x0.y);
    let x1: vec2<f32> = x0 - i1 + vec2<f32>(C.x, C.x);
    let x2: vec2<f32> = x0 - vec2<f32>(1.0, 1.0) + vec2<f32>(2.0 * C.x, 2.0 * C.x);
    let x12xz = vec2<f32>(x1.x, x2.x);
    let x12yw = vec2<f32>(x1.y, x2.y);

    i = mod289_2(i);
    var p: vec3<f32> = permute( permute( i.y + vec3<f32>(0.0, i1.y, 1.0 ))
		  + i.x + vec3<f32>(0.0, i1.x, 1.0 ));

    var m: vec3<f32> = max(vec3<f32>(0.5) - vec3<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2)), vec3<f32>(0.0));
    m = m*m;
    m = m*m;

    var x: vec3<f32> = 2.0 * fract(p * C.www) - 1.0;
    var h: vec3<f32> = abs(x) - 0.5;
    var ox: vec3<f32> = floor(x + 0.5);
    var a0: vec3<f32> = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    var g: vec3<f32>;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    let gyz = a0.yz * x12xz + h.yz * x12yw;
    g.y = gyz.x;
    g.z = gyz.y;

    var v: f32 = 130.0 * dot(m, g);

    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

fn sineNoise(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32, blend: f32) -> f32 {
    var uv: vec2<f32> = vec2<f32>(st.x * xFreq, st.y * yFreq);
    uv.x += s;

    let a: f32 = blend;
    let b: f32 = blend;
    let c: f32 = 1.0 - blend;

    let r1: vec3<f32> = prng(vec3<f32>(s, 0.0, 0.0)) * 0.75 + 0.125;
    let r2: vec3<f32> = prng(vec3<f32>(s + 10.0, 0.0, 0.0)) * 0.75 + 0.125;
    let x: f32 = sin(r1.x * uv.y + sin(r1.y * uv.x + a) + sin(r1.z * uv.x + b) + c);
    let y: f32 = sin(r2.x * uv.x + sin(r2.y * uv.y + b) + sin(r2.z * uv.y + c) + a);

    return (x + y) * 0.5 + 0.5;
}

// Value noise
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

fn randomFromLatticeWithOffset(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32, offset: vec2<i32>) -> vec3<f32> {
    let lattice = vec2<f32>(st.x * xFreq, st.y * yFreq);
    let baseFloor = floor(lattice);
    var base = vec2<i32>(i32(baseFloor.x), i32(baseFloor.y)) + offset;
    let frac = lattice - baseFloor;

    let seedInt = i32(floor(s));
    let seedFrac = fract(s);

    var xi = base.x + seedInt + i32(floor(frac.x + seedFrac));
    var yi = base.y;

    if (wrap > 0) {
        let freqXInt = i32(xFreq + 0.5);
        let freqYInt = i32(yFreq + 0.5);

        if (freqXInt > 0) {
            xi = positiveModulo(xi, freqXInt);
        }
        if (freqYInt > 0) {
            yi = positiveModulo(yi, freqYInt);
        }
    }

    let xBits = bitcast<u32>(xi);
    let yBits = bitcast<u32>(yi);
    let seedBits = bitcast<u32>(seed);
    let fracBits = bitcast<u32>(seedFrac);

    let jitter = vec3<u32>(
        (fracBits * 374761393u) ^ 0x9E3779B9u,
        (fracBits * 668265263u) ^ 0x7F4A7C15u,
        (fracBits * 2246822519u) ^ 0x94D049B4u
    );

    let state = vec3<u32>(xBits, yBits, seedBits) ^ jitter;
    let prngState = pcg(state);
    let denom = f32(0xffffffffu);
    return vec3<f32>(
        f32(prngState.x) / denom,
        f32(prngState.y) / denom,
        f32(prngState.z) / denom
    );
}

fn constant(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    let rand: vec3<f32> = randomFromLatticeWithOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    var scaledTime: f32 = periodicFunction(rand.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.25);
    return periodicFunction(rand.y - scaledTime);
}

fn constantOffset(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32, offset: vec2<i32>) -> f32 {
    let rand: vec3<f32> = randomFromLatticeWithOffset(st, xFreq, yFreq, s, offset);
    var scaledTime: f32 = periodicFunction(rand.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.25);
    return periodicFunction(rand.y - scaledTime);
}

fn quadratic3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

fn catmullRom3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

fn quadratic3x3Value(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    let lattice = vec2<f32>(st.x * xFreq, st.y * yFreq);
    let f = fract(lattice);
    
    let v00 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, -1));
    let v10 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, -1));
    let v20 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, -1));
    
    let v01 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 0));
    let v11 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    let v21 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 0));
    
    let v02 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 1));
    let v12 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 1));
    let v22 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 1));
    
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    
    return quadratic3(y0, y1, y2, f.y);
}

fn catmullRom3x3Value(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    let lattice = vec2<f32>(st.x * xFreq, st.y * yFreq);
    let f = fract(lattice);
    
    let v00 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, -1));
    let v10 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, -1));
    let v20 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, -1));
    
    let v01 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 0));
    let v11 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    let v21 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 0));
    
    let v02 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 1));
    let v12 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 1));
    let v22 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 1));
    
    let y0 = catmullRom3(v00, v10, v20, f.x);
    let y1 = catmullRom3(v01, v11, v21, f.x);
    let y2 = catmullRom3(v02, v12, v22, f.x);
    
    return catmullRom3(y0, y1, y2, f.y);
}

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

fn blendLinearOrCosine(a: f32, b: f32, amount: f32, nType: i32) -> f32 {
    if (nType == 1) {
        return mix(a, b, amount);
    }
    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

fn bicubicValue(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    var x0y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, -1));
    var x0y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 0));
    var x0y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 1));
    var x0y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 2));

    var x1y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, -1));
    var x1y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    var x1y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 1));
    var x1y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 2));

    var x2y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, -1));
    var x2y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 0));
    var x2y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 1));
    var x2y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 2));

    var x3y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, -1));
    var x3y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 0));
    var x3y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 1));
    var x3y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 2));

    var uv: vec2<f32> = vec2<f32>(st.x * xFreq, st.y * yFreq);

    var y0: f32 = blendBicubic(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    var y1: f32 = blendBicubic(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    var y2: f32 = blendBicubic(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    var y3: f32 = blendBicubic(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return clamp(blendBicubic(y0, y1, y2, y3, fract(uv.y)), 0.0, 1.0);
}

fn catmullRom4x4Value(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    var x0y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, -1));
    var x0y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 0));
    var x0y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 1));
    var x0y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(-1, 2));

    var x1y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, -1));
    var x1y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    var x1y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 1));
    var x1y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 2));

    var x2y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, -1));
    var x2y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 0));
    var x2y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 1));
    var x2y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 2));

    var x3y0: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, -1));
    var x3y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 0));
    var x3y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 1));
    var x3y3: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(2, 2));

    var uv: vec2<f32> = vec2<f32>(st.x * xFreq, st.y * yFreq);

    var y0: f32 = catmullRom4(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    var y1: f32 = catmullRom4(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    var y2: f32 = catmullRom4(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    var y3: f32 = catmullRom4(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return clamp(catmullRom4(y0, y1, y2, y3, fract(uv.y)), 0.0, 1.0);
}

fn value(st: vec2<f32>, xFreq: f32, yFreq: f32, s: f32) -> f32 {
    if (NOISE_TYPE == 0) {
        return constant(st, xFreq, yFreq, s);
    }

    if (NOISE_TYPE == 3) {
        return catmullRom3x3Value(st, xFreq, yFreq, s);
    }

    if (NOISE_TYPE == 4) {
        return catmullRom4x4Value(st, xFreq, yFreq, s);
    }

    if (NOISE_TYPE == 5) {
        return quadratic3x3Value(st, xFreq, yFreq, s);
    }

    if (NOISE_TYPE == 6) {
        return bicubicValue(st, xFreq, yFreq, s);
    }

    if (NOISE_TYPE == 10) {
        let simplexLoopSample: f32 = simplexValue(st, xFreq, yFreq, s + 50.0, time) * speed * 0.0025;
        return simplexValue(st, xFreq, yFreq, s, simplexLoopSample);
    }

    if (NOISE_TYPE == 11) {
        let sineLoopSample: f32 = sineNoise(st, xFreq, yFreq, s + 50.0, time) * speed * 0.0025;
        return sineNoise(st, xFreq, yFreq, s, sineLoopSample);
    }

    // 1 = linear, 2 = hermite
    var x1y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 0));
    var x1y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(0, 1));
    var x2y1: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 0));
    var x2y2: f32 = constantOffset(st, xFreq, yFreq, s, vec2<i32>(1, 1));

    var uv: vec2<f32> = vec2<f32>(st.x * xFreq, st.y * yFreq);

    var a: f32 = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), NOISE_TYPE);
    var b: f32 = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), NOISE_TYPE);

    return clamp(blendLinearOrCosine(a, b, fract(uv.y), NOISE_TYPE), 0.0, 1.0);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    unpackUniforms();

    var color: vec4<f32> = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    let tileOffset = uniforms.data[4].xy;
    let fullResolution = uniforms.data[4].zw;
    var st: vec2<f32> = (pos.xy + tileOffset) / fullResolution.y;
    st -= vec2<f32>(fullResolution.x / fullResolution.y * 0.5, 0.5);

    var xFreq: f32 = 1.0;
    var yFreq: f32 = 1.0;
    if (NOISE_TYPE != 4 && NOISE_TYPE != 10 && wrap > 0) {
        xFreq = floor(map(noiseScale, 1.0, 100.0, 3.0, 2.0));
        yFreq = xFreq;
    } else {
        if (NOISE_TYPE == 10) {
            xFreq = map(noiseScale, 1.0, 100.0, 1.0, 0.25);
            yFreq = xFreq * 1.5;
        } else {
            xFreq = map(noiseScale, 1.0, 100.0, 1.5, 1.0);
            yFreq = xFreq * 1.5;
        }
    }

    var s: f32 = floor(f32(seed));

    // Refract values
    var xRef: f32 = value(st, xFreq, yFreq, 20.0 + s);
    var yRef: f32 = value(st, xFreq, yFreq, 10.0 + s);

    var refAmt: f32 = map(refractAmt, 0.0, 100.0, 0.0, 2.5);
    var uv: vec2<f32> = vec2<f32>(st.x + xRef * refAmt, st.y + yRef * refAmt);

    let valueR: f32 = value(uv, xFreq, yFreq, s);
    let valueG: f32 = value(uv, xFreq, yFreq, 10.0 + s);
    let valueB: f32 = value(uv, xFreq, yFreq, 20.0 + s);

    let grayscaleColor: vec4<f32> = vec4<f32>(vec3<f32>(valueR), 1.0);
    let rgbColor: vec4<f32> = vec4<f32>(valueR, valueG, valueB, 1.0);

    color = select(rgbColor, grayscaleColor, COLOR_MODE == 0);

    if (COLOR_MODE == 0) {
        // grayscale
        if (ridges > 0) {
            color = 1.0 - abs(color * 2.0 - 1.0);
        }
    } else if (COLOR_MODE == 1) {
        // rgb
        if (ridges > 0) {
            color = 1.0 - abs(color * 2.0 - 1.0);
        }
        color = vec4<f32>(rgb2hsv(color.rgb), color.a);
        color.r += 1.0 - (hueRotation / 360.0);
        color.r = fract(color.r);
        color = vec4<f32>(hsv2rgb(color.rgb), color.a);
    } else if (COLOR_MODE == 2) {
        // hsv
        color.r = color.r * hueRange * 0.01;
        color.r += 1.0 - (hueRotation / 360.0);
        if (ridges > 0) {
            color.b = 1.0 - abs(color.b * 2.0 - 1.0);
        }
        color = vec4<f32>(hsv2rgb(color.rgb), color.a);
    } else {
        // oklab (COLOR_MODE == 3)
        color.g = color.g * -.509 + .276;
        color.b = color.b * -.509 + .198;

        color = vec4<f32>(linear_srgb_from_oklab(color.rgb), color.a);
        color = vec4<f32>(linearToSrgb(color.rgb), color.a);
        color = vec4<f32>(rgb2hsv(color.rgb), color.a);
        color.r += 1.0 - (hueRotation / 360.0);
        color.r = fract(color.r);
        if (ridges > 0) {
            color.b = 1.0 - abs(color.b * 2.0 - 1.0);
        }
        color = vec4<f32>(hsv2rgb(color.rgb), color.a);
    }

    color = vec4<f32>(brightnessContrast(color.rgb), color.a);
    color.a = 1.0;

    return color;
}
`}},s=`# moodscape

Refracted value noise with multiple color modes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| interp | int | simplex | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4/simplex/sine | Interpolation |
| noiseScale | float | 85 | 1-200 | Scale |
| speed | float | 25 | 0-100 | Speed |
| refractAmt | float | 5 | 0-100 | Refract |
| ridges | boolean | true | - | Ridges |
| wrap | boolean | true | - | Wrap |
| seed | int | 44 | 0-100 | Seed |
| colorMode | int | hsv | mono/rgb/hsv/oklab | Color Mode |
| hueRotation | float | 180 | 0-360 | Hue Rotation |
| hueRange | float | 25 | 0-100 | Hue Range |
| intensity | float | 0 | -100-100 | Intensity |

## Usage

\`\`\`
search classicNoisedeck, synth

moodscape()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[r,n]of Object.entries(o))e.shaders[r]={...n}}e&&s&&(e.help=s);var l="classicNoisedeck/moodscape",v="classicNoisedeck",x="moodscape",y=e;export{y as default,l as effectId,x as effectName,s as help,v as namespace};
