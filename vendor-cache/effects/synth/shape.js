/* synth/shape */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Shape",namespace:"synth",func:"shape",tags:["geometric"],description:"Interference patterns from geometric shapes",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},wrap:{slot:1,components:"x"},loopAScale:{slot:1,components:"w"},loopBScale:{slot:2,components:"x"},speedA:{slot:2,components:"y"},speedB:{slot:2,components:"z"}},globals:{loopAOffset:{type:"int",default:40,define:"LOOP_A_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseCatmullRom3x3:330,noiseCatmullRom4x4:340,noiseBSpline3x3:350,noiseBSpline4x4:360,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"loop a",control:"dropdown"}},loopBOffset:{type:"int",default:30,define:"LOOP_B_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseCatmullRom3x3:330,noiseCatmullRom4x4:340,noiseBSpline3x3:350,noiseBSpline4x4:360,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"loop b",control:"dropdown"}},loopAScale:{type:"float",default:1,uniform:"loopAScale",min:1,max:100,ui:{label:"a scale",control:"slider"}},loopBScale:{type:"float",default:1,uniform:"loopBScale",min:1,max:100,ui:{label:"b scale",control:"slider"}},speedA:{type:"int",default:50,uniform:"speedA",min:-100,max:100,zero:0,ui:{label:"speed a",control:"slider"}},speedB:{type:"int",default:50,uniform:"speedB",min:-100,max:100,zero:0,ui:{label:"speed b",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"noise seed",control:"slider",category:"noise",enabledBy:{or:[{param:"loopAOffset",gte:300,lt:400},{param:"loopBOffset",gte:300,lt:400}]}}},wrap:{type:"boolean",default:!0,uniform:"wrap",ui:{label:"wrap",control:"checkbox",category:"noise",enabledBy:{or:[{param:"loopAOffset",gte:300,lt:370},{param:"loopBOffset",gte:300,lt:370}]}}}},paramAliases:{loopAAmp:"speedA",loopBAmp:"speedB"},passes:[{name:"render",program:"shape",inputs:{},outputs:{fragColor:"outputTex"}}]});var s={shape:{glsl:`#version 300 es

/*
 * GLSL shape generator shader (mono-only variant).
 * Removed: palette colorization, hsv/oklab conversion
 * Output: grayscale intensity based on offset pattern
 */

precision highp float;
precision highp int;

// LOOP_A_OFFSET and LOOP_B_OFFSET are compile-time defines injected by the
// runtime (see definition.js \`globals.loopAOffset.define\` and
// \`globals.loopBOffset.define\`). Same fix as classicNoisedeck/shapes \u2014 each
// (loopA, loopB) combination produces its own compiled program. The runtime
// if-cascade in offset() and the 9-way value() dispatch get DCE'd by the
// GLSL\u2192HLSL translator before ANGLE drives the D3D backend, dropping a 25s
// compile to ~50ms on Windows Chrome.
#ifndef LOOP_A_OFFSET
#define LOOP_A_OFFSET 40
#endif
#ifndef LOOP_B_OFFSET
#define LOOP_B_OFFSET 30
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int seed;
uniform bool wrap;
uniform float loopAScale;
uniform float loopBScale;
uniform float speedA;
uniform float speedB;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float aspectRatio;
vec2 globalCoord;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Positive modulo for lattice wrapping
int positiveModulo(int a, int b) {
    int result = a - (a / b) * b;
    if (result < 0) { result += b; }
    return result;
}

// PCG random number generator
uvec3 pcg(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec3 prng(vec3 p) {
    if (p.x >= 0.0) { p.x *= 2.0; } else { p.x = -p.x * 2.0 + 1.0; }
    if (p.y >= 0.0) { p.y *= 2.0; } else { p.y = -p.y * 2.0 + 1.0; }
    if (p.z >= 0.0) { p.z *= 2.0; } else { p.z = -p.z * 2.0 + 1.0; }
    uvec3 u = pcg(uvec3(p));
    return vec3(u) / float(0xffffffffu);
}

float periodicFunction(float p) {
    float x = TAU * p;
    return map(sin(x), -1.0, 1.0, 0.0, 1.0);
}

vec3 randomFromLatticeWithOffset(vec2 st, float freq, ivec2 xyOffset) {
    vec2 scaled = st * freq;
    ivec2 base = ivec2(floor(scaled)) + xyOffset;
    vec2 frac = fract(scaled);

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
    uint fracBits = 0u;

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

float quadratic3x3Value(vec2 st, float freq, float speed) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    float nd = 1.0 / freq;
    
    float v00 = constant(st + vec2(-nd, -nd), freq, speed);
    float v10 = constant(st + vec2(0.0, -nd), freq, speed);
    float v20 = constant(st + vec2(nd, -nd), freq, speed);
    
    float v01 = constant(st + vec2(-nd, 0.0), freq, speed);
    float v11 = constant(st, freq, speed);
    float v21 = constant(st + vec2(nd, 0.0), freq, speed);
    
    float v02 = constant(st + vec2(-nd, nd), freq, speed);
    float v12 = constant(st + vec2(0.0, nd), freq, speed);
    float v22 = constant(st + vec2(nd, nd), freq, speed);
    
    float y0 = quadratic3(v00, v10, v20, f.x);
    float y1 = quadratic3(v01, v11, v21, f.x);
    float y2 = quadratic3(v02, v12, v22, f.x);
    
    return quadratic3(y0, y1, y2, f.y);
}

float catmullRom3x3Value(vec2 st, float freq, float speed) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    float nd = 1.0 / freq;
    
    float v00 = constant(st + vec2(-nd, -nd), freq, speed);
    float v10 = constant(st + vec2(0.0, -nd), freq, speed);
    float v20 = constant(st + vec2(nd, -nd), freq, speed);
    
    float v01 = constant(st + vec2(-nd, 0.0), freq, speed);
    float v11 = constant(st, freq, speed);
    float v21 = constant(st + vec2(nd, 0.0), freq, speed);
    
    float v02 = constant(st + vec2(-nd, nd), freq, speed);
    float v12 = constant(st + vec2(0.0, nd), freq, speed);
    float v22 = constant(st + vec2(nd, nd), freq, speed);
    
    float y0 = catmullRom3(v00, v10, v20, f.x);
    float y1 = catmullRom3(v01, v11, v21, f.x);
    float y2 = catmullRom3(v02, v12, v22, f.x);
    
    return catmullRom3(y0, y1, y2, f.y);
}

// ---- 4\xD74 interpolation ----
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

float blendLinearOrCosine(float a, float b, float amount, int interp) {
    if (interp == 1) {
        return mix(a, b, amount);
    }
    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

// Simplex 2D noise
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
        return catmullRom3x3Value(st, freq, speed);
    } else if (interp == 4) {
        return catmullRom4x4Value(st, freq, speed);
    } else if (interp == 5) {
        return quadratic3x3Value(st, freq, speed);
    } else if (interp == 6) {
        return bicubicValue(st, freq, speed);
    } else if (interp == 10) {
        float scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return simplexValue(st, freq, float(seed), scaledTime);
    } else if (interp == 11) {
        float scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return sineNoise(st, freq, float(seed), scaledTime);
    }

    float x1y1 = constant(st, freq, speed);

    if (interp == 0) {
        return x1y1;
    }

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

// Shape functions
float circles(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

float rings(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

float diamonds(vec2 st, float freq) {
    vec2 stLocal = globalCoord / fullResolution.y;
    stLocal -= vec2(0.5 * aspectRatio, 0.5);
    stLocal *= freq;
    return (cos(stLocal.x * PI) + cos(stLocal.y * PI));
}

float shape(vec2 st, int sides, float blend) {
    st = st * 2.0 - vec2(aspectRatio, 1.0);
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

float offset(vec2 st, float freq, int loopOffset, float speed, float seedVal) {
    if (loopOffset == 10) {
        return circles(st, freq);
    } else if (loopOffset == 20) {
        return shape(st, 3, freq * 0.5);
    } else if (loopOffset >= 40 && loopOffset <= 120) {
        int sides = loopOffset / 10;
        return shape(st, sides, freq * 0.5);
    } else if (loopOffset == 30) {
        return (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq * 0.5;
    } else if (loopOffset == 200) {
        return st.x * freq * 0.5;
    } else if (loopOffset == 210) {
        return st.y * freq * 0.5;
    } else if (loopOffset >= 300 && loopOffset <= 380) {
        int idx = (loopOffset - 300) / 10;
        int interp = idx <= 6 ? idx : idx + 3;
        float f = loopOffset == 300 ? map(freq, 1.0, 6.0, 1.0, 20.0) : freq;
        return 1.0 - value(st + seedVal, f, interp, speed);
    } else if (loopOffset == 400) {
        return 1.0 - rings(st, freq);
    } else if (loopOffset == 410) {
        return 1.0 - diamonds(st, freq);
    }
    return 0.0;
}

void main() {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution.y;
    aspectRatio = fullResolution.x / fullResolution.y;

    float lf1 = map(loopAScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf1 = floor(lf1);
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
        lf2 = floor(lf2);
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

    float d = abs((a + b) - 1.0);

    // Mono output: grayscale intensity
    color.rgb = vec3(d);

    fragColor = color;
}
`,wgsl:`/*
 * WGSL shape generator shader (mono-only variant).
 * Removed: palette colorization, hsv/oklab conversion
 * Output: grayscale intensity based on offset pattern
 */

struct Uniforms {
    data : array<vec4<f32>, 3>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

var<private> resolution : vec2<f32>;
// LOOP_A_OFFSET and LOOP_B_OFFSET are compile-time consts injected by the
// runtime via injectDefines(). See synth/shape/definition.js
// \`globals.LOOP_A_OFFSET.define\` / \`globals.LOOP_B_OFFSET.define\`.

var<private> time : f32;
var<private> seed : f32;
var<private> wrap : bool;
var<private> loopAScale : f32;
var<private> loopBScale : f32;
var<private> speedA : f32;
var<private> speedB : f32;
var<private> aspectRatio : f32;

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

fn quadratic3x3Value(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    let lattice = st * freq;
    let f = fract(lattice);
    let nd = 1.0 / freq;
    
    let v00 = constant(st + vec2<f32>(-nd, -nd), freq, speed);
    let v10 = constant(st + vec2<f32>(0.0, -nd), freq, speed);
    let v20 = constant(st + vec2<f32>(nd, -nd), freq, speed);
    
    let v01 = constant(st + vec2<f32>(-nd, 0.0), freq, speed);
    let v11 = constant(st, freq, speed);
    let v21 = constant(st + vec2<f32>(nd, 0.0), freq, speed);
    
    let v02 = constant(st + vec2<f32>(-nd, nd), freq, speed);
    let v12 = constant(st + vec2<f32>(0.0, nd), freq, speed);
    let v22 = constant(st + vec2<f32>(nd, nd), freq, speed);
    
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    
    return quadratic3(y0, y1, y2, f.y);
}

fn catmullRom3x3Value(st: vec2<f32>, freq: f32, speed: f32) -> f32 {
    let lattice = st * freq;
    let f = fract(lattice);
    let nd = 1.0 / freq;
    
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

// ---- 4\xD74 interpolation ----
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

// Simplex 2D noise helpers
fn mod289_v3(x: vec3<f32>) -> vec3<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_v2(x: vec2<f32>) -> vec2<f32> {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute(x: vec3<f32>) -> vec3<f32> {
    return mod289_v3(((x * 34.0) + 1.0) * x);
}

fn simplexValue(st: vec2<f32>, freq: f32, s: f32, blend: f32) -> f32 {
    let C = vec4<f32>(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);

    var uv = st * freq;
    uv.x = uv.x + s;

    let i = floor(uv + dot(uv, C.yy));
    let x0 = uv - i + dot(i, C.xx);

    var i1: vec2<f32>;
    if (x0.x > x0.y) {
        i1 = vec2<f32>(1.0, 0.0);
    } else {
        i1 = vec2<f32>(0.0, 1.0);
    }
    var x12 = x0.xyxy + C.xxzz;
    x12 = vec4<f32>(x12.xy - i1, x12.zw);

    let i_mod = mod289_v2(i);
    let p = permute(permute(i_mod.y + vec3<f32>(0.0, i1.y, 1.0))
          + i_mod.x + vec3<f32>(0.0, i1.x, 1.0));

    var m = max(0.5 - vec3<f32>(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3<f32>(0.0));
    m = m * m;
    m = m * m;

    let x = 2.0 * fract(p * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let ox = floor(x + 0.5);
    let a0 = x - ox;

    m = m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));

    var g: vec3<f32>;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.y = a0.y * x12.x + h.y * x12.y;
    g.z = a0.z * x12.z + h.z * x12.w;

    let v = 130.0 * dot(m, g);

    return periodicFunction(map(v, -1.0, 1.0, 0.0, 1.0) - blend);
}

fn sineNoise(st_in: vec2<f32>, freq: f32, s: f32, blend: f32) -> f32 {
    var st = st_in * freq;
    st.x = st.x + s;

    let a = blend;
    let b = blend;
    let c = 1.0 - blend;

    let r1 = prng(vec3<f32>(s, 0.0, 0.0)) * 0.75 + 0.125;
    let r2 = prng(vec3<f32>(s + 10.0, 0.0, 0.0)) * 0.75 + 0.125;
    let x = sin(r1.x * st.y + sin(r1.y * st.x + a) + sin(r1.z * st.x + b) + c);
    let y = sin(r2.x * st.x + sin(r2.y * st.y + b) + sin(r2.z * st.y + c) + a);

    return (x + y) * 0.5 + 0.5;
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

fn value(st: vec2<f32>, freq: f32, interp: i32, speed: f32) -> f32 {
    if (interp == 3) {
        return catmullRom3x3Value(st, freq, speed);
    } else if (interp == 4) {
        return catmullRom4x4Value(st, freq, speed);
    } else if (interp == 5) {
        return quadratic3x3Value(st, freq, speed);
    } else if (interp == 6) {
        return bicubicValue(st, freq, speed);
    } else if (interp == 10) {
        let scaledTime = periodicFunction(time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
        return simplexValue(st, freq, seed, scaledTime);
    } else if (interp == 11) {
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

// Shape functions
fn circles(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

fn rings(st: vec2<f32>, freq: f32) -> f32 {
    let dist = length(st - vec2<f32>(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

fn diamonds(pos: vec4<f32>, freq: f32) -> f32 {
    var stLocal = pos.xy / resolution.y;
    stLocal = stLocal - vec2<f32>(0.5 * aspectRatio, 0.5);
    stLocal = stLocal * freq;
    return (cos(stLocal.x * PI) + cos(stLocal.y * PI));
}

fn shape(st: vec2<f32>, sides: i32, blend: f32) -> f32 {
    let stLocal = st * 2.0 - vec2<f32>(aspectRatio, 1.0);
    let a = atan2(stLocal.x, stLocal.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(stLocal) * blend;
}

fn offset(st: vec2<f32>, freq: f32, loopOffset: i32, speed: f32, seedVal: f32, pos: vec4<f32>) -> f32 {
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
        return 1.0 - value(st + seedVal, f, interp, speed);
    } else if (loopOffset == 400) {
        return 1.0 - rings(st, freq);
    } else if (loopOffset == 410) {
        return 1.0 - diamonds(pos, freq);
    }
    return 0.0;
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
    // Slot [2].w unused (was paletteMode)

    // Slots [3] and [4] unused (were palette parameters)

    aspectRatio = resolution.x / resolution.y;

    var color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
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
        t1 = time + offset(st, lf1, LOOP_A_OFFSET, amp1, seed, pos);
    } else if (speedA > 0.0) {
        t1 = time - offset(st, lf1, LOOP_A_OFFSET, amp1, seed, pos);
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
        t2 = time + offset(st, lf2, LOOP_B_OFFSET, amp2, seed + 10.0, pos);
    } else if (speedB > 0.0) {
        t2 = time - offset(st, lf2, LOOP_B_OFFSET, amp2, seed + 10.0, pos);
    }

    let a = periodicFunction(t1) * amp1;
    let b = periodicFunction(t2) * amp2;

    let d = abs((a + b) - 1.0);

    // Mono output: grayscale intensity
    color = vec4<f32>(vec3<f32>(d), 1.0);

    return color;
}
`}},a=`# shape

Dual-loop shape pattern generator

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| loopAOffset | int | square | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseCatmullRom3x3/noiseCatmullRom4x4/noiseBSpline3x3/noiseBSpline4x4/noiseSimplex/noiseSine/Misc:/rings/sine | Loop a |
| loopBOffset | int | diamond | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseCatmullRom3x3/noiseCatmullRom4x4/noiseBSpline3x3/noiseBSpline4x4/noiseSimplex/noiseSine/Misc:/rings/sine | Loop b |
| loopAScale | float | 1 | 1-100 | A scale |
| loopBScale | float | 1 | 1-100 | B scale |
| speedA | int | 50 | -100-100 | Speed a |
| speedB | int | 50 | -100-100 | Speed b |
| seed | int | 1 | 1-100 | Noise seed |
| wrap | boolean | true | - | Wrap |

## Usage

\`\`\`
search synth

shape()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(s).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(s))e.shaders[o]={...n}}e&&a&&(e.help=a);var c="synth/shape",p="synth",d="shape",u=e;export{u as default,c as effectId,d as effectName,a as help,p as namespace};
