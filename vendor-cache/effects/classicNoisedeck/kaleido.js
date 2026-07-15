/* classicNoisedeck/kaleido */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Kaleido",namespace:"classicNoisedeck",func:"kaleido",tags:["geometric","transform"],openCategories:["general","animation"],description:"Kaleidoscope effect",globals:{sides:{type:"int",default:8,uniform:"kaleido",min:2,max:32,ui:{label:"sides",control:"slider"}},metric:{type:"int",default:0,define:"METRIC",choices:{circle:0,diamond:1,hexagon:2,octagon:3,square:4,triangle:5},ui:{label:"shape",control:"dropdown"}},loopOffset:{type:"int",default:10,define:"LOOP_OFFSET",choices:{"Shapes:":null,circle:10,triangle:20,diamond:30,square:40,pentagon:50,hexagon:60,heptagon:70,octagon:80,nonagon:90,decagon:100,hendecagon:110,dodecagon:120,"Directional:":null,horizontalScan:200,verticalScan:210,"Noise:":null,noiseConstant:300,noiseLinear:310,noiseHermite:320,noiseCatmullRom3x3:330,noiseCatmullRom4x4:340,noiseBSpline3x3:350,noiseBSpline4x4:360,noiseSimplex:370,noiseSine:380,"Misc:":null,rings:400,sine:410},ui:{label:"loop offset",control:"dropdown",category:"animation"}},loopScale:{type:"float",default:1,uniform:"loopScale",min:1,max:100,ui:{label:"loop scale",control:"slider",category:"animation"}},speed:{type:"float",default:5,uniform:"speed",min:-100,max:100,randMin:-20,randMax:20,zero:0,ui:{label:"speed",control:"slider",category:"animation"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider",category:"animation",enabledBy:{param:"loopOffset",in:[300,310,320,330,340,350,360,370,380]}}},wrap:{type:"boolean",default:!0,uniform:"wrap",ui:{label:"wrap",control:"checkbox",category:"animation",enabledBy:{param:"loopOffset",in:[300,310,320,330,340,350,360]}}},direction:{type:"int",default:2,define:"DIRECTION",choices:{clockwise:1,counterclock:0,none:2},ui:{label:"rotate",control:"dropdown",category:"animation"}},kernel:{type:"int",default:0,define:"KERNEL",choices:{none:0,blur:1,derivatives:120,derivDivide:2,edge:3,emboss:4,outline:5,pixels:10,posterize:110,shadow:6,sharpen:7,sobel:8},ui:{label:"effect",control:"dropdown",category:"effect"}},effectWidth:{type:"float",default:0,uniform:"effectWidth",min:0,max:10,ui:{label:"effect width",control:"slider",category:"effect",enabledBy:{param:"kernel",neq:0}}}},paramAliases:{kaleido:"sides",loopAmp:"speed"},passes:[{name:"render",program:"kaleido",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={kaleido:{glsl:`#version 300 es

/*
 * Kaleidoscope shader.
 * Samples the input feed with mirrored wedges to generate kaleidoscopic symmetry.
 * Angle controls are pre-normalized to avoid seam discontinuities at wedge boundaries.
 */

precision highp float;
precision highp int;

// LOOP_OFFSET is a compile-time define injected by the runtime (see
// definition.js \`globals.LOOP_OFFSET.define\`). When the default is circle
// (10), the entire noise value() function and all 9 variant functions are
// unreachable and get DCE'd, dropping the compile from 3.9s to ~200ms.
#ifndef LOOP_OFFSET
#define LOOP_OFFSET 10
#endif

// METRIC, DIRECTION, KERNEL are compile-time defines for the same reason \u2014
// the remaining runtime int dispatches in this shader. METRIC is hit once
// per pixel by getMetric() inside kaleidoscope(); KERNEL dispatches the
// shared convolution helper used by many classicNoisedeck effects; DIRECTION
// is a small 3-way rotation picker.
#ifndef METRIC
#define METRIC 0
#endif
#ifndef DIRECTION
#define DIRECTION 2
#endif
#ifndef KERNEL
#define KERNEL 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform bool wrap;
uniform int seed;
uniform float speed;
uniform float loopScale;
uniform float kaleido;
uniform float effectWidth;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

// convolution kernels
float emboss[9];
float sharpen[9];
float blur[9];
float edge[9];
float edge2[9];

void loadKernels() {
	// kernels can be declared outside of function but values must be set inside function
	// emboss kernel
	emboss[0] = -2.0; emboss[1] = -1.0; emboss[2] = 0.0;
	emboss[3] = -1.0; emboss[4] = 1.0; emboss[5] = 1.0;
	emboss[6] = 0.0; emboss[7] = 1.0; emboss[8] = 2.0;

	// sharpen kernel
	sharpen[0] = -1.0; sharpen[1] = 0.0; sharpen[2] = -1.0;
	sharpen[3] = 0.0; sharpen[4] = 5.0; sharpen[5] = 0.0;
	sharpen[6] = -1.0; sharpen[7] = 0.0; sharpen[8] = -1.0;

	// gaussian blur kernel
	blur[0] = 1.0; blur[1] = 2.0; blur[2] = 1.0;
	blur[3] = 2.0; blur[4] = 4.0; blur[5] = 2.0;
	blur[6] = 1.0; blur[7] = 2.0; blur[8] = 1.0;

	// edge detect kernel
	edge[0] = -1.0; edge[1] = -1.0; edge[2] = -1.0;
	edge[3] = -1.0; edge[4] = 8.0; edge[5] = -1.0;
	edge[6] = -1.0; edge[7] = -1.0; edge[8] = -1.0;

	// edge detect kernel 2
	edge2[0] = -1.0; edge2[1] = 0.0; edge2[2] = -1.0;
	edge2[3] = 0.0; edge2[4] = 4.0; edge2[5] = 0.0;
	edge2[6] = -1.0; edge2[7] = 0.0; edge2[8] = -1.0;
}

float circles(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return dist * freq;
}

float rings(vec2 st, float freq) {
    float dist = length(st - vec2(0.5 * aspectRatio, 0.5));
    return cos(dist * PI * freq);
}

float diamonds(vec2 st, float freq) {
    st.x -= 0.5 * aspectRatio;
    st *= freq;
    return (sin(st.x * PI) + sin(st.y * PI));
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

float prng2(vec2 p) {
    vec3 p2 = vec3(p, 0.0);
    return float(pcg(uvec3(p2)).x) / float(uint(0xffffffff));
}
// end PCG PRNG

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
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
    float scaledTime = periodicFunction(randTime.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);

    vec3 rand = randomFromLatticeWithOffset(st, freq, ivec2(0, 0));
    return periodicFunction(rand.y - scaledTime);
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

// Catmull-Rom interpolation for 3 samples (degree 3, interpolating)
float catmullRom3(float p0, float p1, float p2, float t) {
    // Degree 3 polynomial passing through p1
    // Uses p0 and p2 to compute tangents
    float t2 = t * t;
    float t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
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

// ---- 3\xD73 Catmull-Rom interpolation ----
float catmullRom3x3Value(vec2 st, float freq) {
    vec2 lattice = st * freq;
    vec2 f = fract(lattice);
    
    float nd = 1.0 / freq;
    
    // Sample 3\xD73 grid (9 taps)
    float v00 = constant(st + vec2(-nd, -nd), freq);
    float v10 = constant(st + vec2(0.0, -nd), freq);
    float v20 = constant(st + vec2(nd, -nd), freq);
    
    float v01 = constant(st + vec2(-nd, 0.0), freq);
    float v11 = constant(st, freq);
    float v21 = constant(st + vec2(nd, 0.0), freq);
    
    float v02 = constant(st + vec2(-nd, nd), freq);
    float v12 = constant(st + vec2(0.0, nd), freq);
    float v22 = constant(st + vec2(nd, nd), freq);
    
    // Catmull-Rom interpolation along x for each row
    float y0 = catmullRom3(v00, v10, v20, f.x);
    float y1 = catmullRom3(v01, v11, v21, f.x);
    float y2 = catmullRom3(v02, v12, v22, f.x);
    
    // Catmull-Rom interpolation along y
    return catmullRom3(y0, y1, y2, f.y);
}

// ---- End 3\xD73 quadratic B-spline & Catmull-Rom ----

// cubic B-spline interpolation (degree 3, C\xB2 continuous, smoothing)
float blendBicubic(float p0, float p1, float p2, float p3, float t) {
    // B-spline basis functions for cubic (4 control points)
    // Does NOT pass through control points (smoothing, not interpolating)
    float t2 = t * t;
    float t3 = t2 * t;
    
    float B0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float B1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float B2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float B3 = t3 / 6.0;
    
    return p0 * B0 + p1 * B1 + p2 * B2 + p3 * B3;
}

// Catmull-Rom interpolation for 4 samples (degree 3, interpolating)
float catmullRom4(float p0, float p1, float p2, float p3, float t) {
    // Passes through p1 and p2, uses p0 and p3 for tangents
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

float blendLinearOrCosine(float a, float b, float amount, int interp) {
    if (interp == 1) {
        return mix(a, b, amount);
    }

    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

// Simplex noise implementation - Ashima Arts (MIT License)
// https://github.com/ashima/webgl-noise
vec3 mod289_3(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289_2(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute3(vec3 x) {
    return mod289_3(((x * 34.0) + 1.0) * x);
}

float simplexValue(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289_2(i);
    vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float sineNoise(vec2 st, float freq) {
    st -= vec2(0.5 * aspectRatio, 0.5);
    vec3 rand = randomFromLatticeWithOffset(st, freq, ivec2(20, 0));
    float waveFreq = rand.x * 50.0;
    float waveAmp = rand.y;
    float wavePhase = rand.z * TAU;
    vec3 randTime = randomFromLatticeWithOffset(st, freq, ivec2(40, 0));
    float phaseOffset = periodicFunction(randTime.x - time) * map(abs(speed), 0.0, 100.0, 0.0, 0.333);
    float dist = length(st);
    float sineWave = sin(dist * waveFreq + wavePhase - phaseOffset) * waveAmp;
    return periodicFunction(sineWave);
}

float bicubicValue(vec2 st, float freq) {
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

    float x0y0 = constant(vec2(u0, v0), freq);
    float x0y1 = constant(vec2(u0, v1), freq);
    float x0y2 = constant(vec2(u0, v2), freq);
    float x0y3 = constant(vec2(u0, v3), freq);

    float x1y0 = constant(vec2(u1, v0), freq);
    float x1y1 = constant(st, freq);
    float x1y2 = constant(vec2(u1, v2), freq);
    float x1y3 = constant(vec2(u1, v3), freq);

    float x2y0 = constant(vec2(u2, v0), freq);
    float x2y1 = constant(vec2(u2, v1), freq);
    float x2y2 = constant(vec2(u2, v2), freq);
    float x2y3 = constant(vec2(u2, v3), freq);

    float x3y0 = constant(vec2(u3, v0), freq);
    float x3y1 = constant(vec2(u3, v1), freq);
    float x3y2 = constant(vec2(u3, v2), freq);
    float x3y3 = constant(vec2(u3, v3), freq);

    vec2 uv = st * freq;

    float y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    float y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    float y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    float y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return blendBicubic(y0, y1, y2, y3, fract(uv.y));
}

float catmullRom4x4Value(vec2 st, float freq) {
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

    float x0y0 = constant(vec2(u0, v0), freq);
    float x0y1 = constant(vec2(u0, v1), freq);
    float x0y2 = constant(vec2(u0, v2), freq);
    float x0y3 = constant(vec2(u0, v3), freq);

    float x1y0 = constant(vec2(u1, v0), freq);
    float x1y1 = constant(st, freq);
    float x1y2 = constant(vec2(u1, v2), freq);
    float x1y3 = constant(vec2(u1, v3), freq);

    float x2y0 = constant(vec2(u2, v0), freq);
    float x2y1 = constant(vec2(u2, v1), freq);
    float x2y2 = constant(vec2(u2, v2), freq);
    float x2y3 = constant(vec2(u2, v3), freq);

    float x3y0 = constant(vec2(u3, v0), freq);
    float x3y1 = constant(vec2(u3, v1), freq);
    float x3y2 = constant(vec2(u3, v2), freq);
    float x3y3 = constant(vec2(u3, v3), freq);

    vec2 uv = st * freq;

    float y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    float y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    float y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    float y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, fract(uv.x));

    return catmullRom4(y0, y1, y2, y3, fract(uv.y));
}

float value(vec2 st, float freq, int interp) {
    st -= vec2(0.5 * aspectRatio, 0.5);
    if (interp == 3) {
        // 3\xD73 Catmull-Rom (9 taps)
        return catmullRom3x3Value(st, freq);
    } else if (interp == 4) {
        // 4\xD74 Catmull-Rom (16 taps)
        return catmullRom4x4Value(st, freq);
    } else if (interp == 5) {
        // 3\xD73 quadratic B-spline (9 taps)
        return quadratic3x3Value(st, freq);
    } else if (interp == 6) {
        // 4\xD74 cubic B-spline (16 taps)
        return bicubicValue(st, freq);
    } else if (interp == 10) {
        // simplex
        float simplexVal = simplexValue(st * freq + vec2(float(seed)));
        return periodicFunction(simplexVal);
    } else if (interp == 11) {
        // sine
        return sineNoise(st, freq);
    }

    float x1y1 = constant(st, freq);

    if (interp == 0) {
        return x1y1;
    }

    // Neighbor Distance
    float ndX = 1.0 / freq;
    float ndY = 1.0 / freq;

    float x1y2 = constant(vec2(st.x, st.y + ndY), freq);
    float x2y1 = constant(vec2(st.x + ndX, st.y), freq);
    float x2y2 = constant(vec2(st.x + ndX, st.y + ndY), freq);

    vec2 uv = st * freq;

    float a = blendLinearOrCosine(x1y1, x2y1, fract(uv.x), interp);
    float b = blendLinearOrCosine(x1y2, x2y2, fract(uv.x), interp);

    return blendLinearOrCosine(a, b, fract(uv.y), interp);
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

vec3 convolve(vec2 uv, float kernel[9], bool divide) {
    vec2 steps = 1.0 / resolution; // 1.0 / width = 1 texel
    vec2 offset[9];
    offset[0] = vec2(-steps.x, -steps.y);   // top left
    offset[1] = vec2(0.0, -steps.y);        // top middle
    offset[2] = vec2(steps.x, -steps.y);    // top right
    offset[3] = vec2(-steps.x, 0.0);        // middle left
    offset[4] = vec2(0.0, 0.0);             //middle
    offset[5] = vec2(steps.x, 0.0);         //middle right
    offset[6] = vec2(-steps.x, steps.y);    //bottom left
    offset[7] = vec2(0.0, steps.y);         //bottom middle
    offset[8] = vec2(steps.x, steps.y);     //bottom right

    float kernelWeight = 0.0;
    vec3 conv = vec3(0.0);

    for(int i = 0; i < 9; i++){
        //sample a 3x3 grid of pixels
        vec3 color = texture(inputTex, uv + offset[i] * effectWidth).rgb;

        // multiply the color by the kernel value and add it to our conv total
        conv += color * kernel[i];

        // keep a running tally of the kernel weights
        kernelWeight += kernel[i];
    }

    // normalize the convolution by dividing by the kernel weight
    if (divide) {
        conv.rgb /= kernelWeight;
    }

    return clamp(conv.rgb, 0.0, 1.0);
}

vec3 desaturate(vec3 color) {
	float avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
	return vec3(avg);
}

vec3 derivatives(vec3 color, vec2 uv, bool divide) {
	// use: desaturate, get deriv_x and deriv_y and calculate dist between, then multiply by color
	vec3 dcolor = desaturate(color);

	float deriv_x[9];
	deriv_x[0] = 0.0; deriv_x[1] = 0.0; deriv_x[2] = 0.0;
	deriv_x[3] = 0.0; deriv_x[4] = 1.0; deriv_x[5] = -1.0;
	deriv_x[6] = 0.0; deriv_x[7] = 0.0; deriv_x[8] = 0.0;

	float deriv_y[9];
	deriv_y[0] = 0.0; deriv_y[1] = 0.0; deriv_y[2] = 0.0;
	deriv_y[3] = 0.0; deriv_y[4] = 1.0; deriv_y[5] = 0.0;
	deriv_y[6] = 0.0; deriv_y[7] = -1.0; deriv_y[8] = 0.0;

	vec3 s1 = convolve(uv, deriv_x, divide);
	vec3 s2 = convolve(uv, deriv_y, divide);
	float dist = distance(s1, s2);
	return color *= dist;
}

vec3 sobel(vec3 color, vec2 uv) {
	// use: desaturate, get sobel_x and sobel_y and calculate dist between, then multiply by color
	vec3 dcolor = desaturate(color);
	
	float sobel_x[9];
	sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
	sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
	sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

	float sobel_y[9];
	sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
	sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
	sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

	vec3 s1 = convolve(uv, sobel_x, false);
	vec3 s2 = convolve(uv, sobel_y, false);
	float dist = distance(s1, s2);
	return color *= dist;
}

vec3 outline(vec3 color, vec2 uv) {
    // use: desaturate, get sobel_x and sobel_y and calculate dist between, then multiply by color
    vec3 dcolor = desaturate(color);

    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

    float sobel_y[9];
    sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
    sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

    vec3 s1 = convolve(uv, sobel_x, false);
    vec3 s2 = convolve(uv, sobel_y, false);
    float dist = distance(s1, s2);

    vec3 outcolor = color - dist;
    return max(outcolor, 0.0);
}

vec3 shadow(vec3 color, vec2 uv) {
    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

    float sobel_y[9];
    sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
    sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

    color = rgb2hsv(color);

    vec3 x = convolve(uv, sobel_x, false);
    vec3 y = convolve(uv, sobel_y, false);

    float shade = distance(x, y);
    float highlight = shade * shade;
    shade = (1.0 - ((1.0 - color.z) * (1.0 - highlight))) * shade;

    // should be effectAmt
    float alpha = 0.75;
    color = vec3(color.x, color.y, mix(color.z, shade, alpha));
    return hsv2rgb(color);
}

// Per-KERNEL convolution branch \u2014 only the active kernel for the current
// program gets compiled. Called from main() inside \`KERNEL != 0/10/110\`.
vec3 convolutionKernel(vec3 color, vec2 uv) {
#if KERNEL == 1
    return convolve(uv, blur, true);
#elif KERNEL == 2
    // deriv divide
    return derivatives(color, uv, true);
#elif KERNEL == 120
    // deriv
    return clamp(derivatives(color, uv, false) * 2.5, 0.0, 1.0);
#elif KERNEL == 3
    return color * convolve(uv, edge2, true);
#elif KERNEL == 4
    return convolve(uv, emboss, false);
#elif KERNEL == 5
    return outline(color, uv);
#elif KERNEL == 6
    return shadow(color, uv);
#elif KERNEL == 7
    return convolve(uv, sharpen, false);
#elif KERNEL == 8
    return sobel(color, uv);
#else
    return color;
#endif
}

float shape(vec2 st, int sides, float blend) {
    if (sides < 2) {
		return distance(st, vec2(0.5));
	}
    st = vec2(st.x, 1.0 - st.y) * 2.0 - vec2(aspectRatio, 1.0);
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

vec3 posterize(vec3 color, float lev) {
    if (lev == 0.0) {
        return color;
    } else if (lev == 1.0) {
        lev = 2.0;
    }

    color = clamp(color, 0.0, 0.99); // avoids speckles
    color = color * lev;
    color = floor(color) + 0.5;
    color = color / lev;
    return color;
}

vec3 pixellate(vec2 uv, float size) {
	float dx = size * (1.0 / resolution.x);
	float dy = size * (1.0 / resolution.y);
	vec2 coord = vec2(dx * floor(uv.x / dx), dy * floor(uv.y / dy));
	return texture(inputTex, coord).rgb;
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

float offset(vec2 st, float freq) {
    if (LOOP_OFFSET == 10) {
        // circle
        return circles(st, freq);
    } else if (LOOP_OFFSET == 20) {
        // triangle
        return shape(st, 3, freq * 0.5);
    } else if (LOOP_OFFSET == 30) {
        // diamond
        return (abs(st.x - 0.5 * aspectRatio) + abs(st.y - 0.5)) * freq * 0.5;
    } else if (LOOP_OFFSET == 40) {
        // square
        return shape(st, 4, freq * 0.5);
    } else if (LOOP_OFFSET == 50) {
        // pentagon
        return shape(st, 5, freq * 0.5);
    } else if (LOOP_OFFSET == 60) {
        // hexagon
        return shape(st, 6, freq * 0.5);
    } else if (LOOP_OFFSET == 70) {
        // heptagon
        return shape(st, 7, freq * 0.5);
    } else if (LOOP_OFFSET == 80) {
        // octagon
        return shape(st, 8, freq * 0.5);
    } else if (LOOP_OFFSET == 90) {
        // nonagon
        return shape(st, 9, freq * 0.5);
    } else if (LOOP_OFFSET == 100) {
        // decagon
        return shape(st, 10, freq * 0.5);
    } else if (LOOP_OFFSET == 110) {
        // hendecagon
        return shape(st, 11, freq * 0.5);
    } else if (LOOP_OFFSET == 120) {
        // dodecagon
        return shape(st, 12, freq * 0.5);
    } else if (LOOP_OFFSET == 200) {
        // horizontal scan
        return st.x * freq * 0.5;
    } else if (LOOP_OFFSET == 210) {
        // vertical scan
        return st.y * freq * 0.5;
    } else if (LOOP_OFFSET == 300) {
        // constant
        return 1.0 - value(st, freq, 0);
    } else if (LOOP_OFFSET == 310) {
        // linear
        return 1.0 - value(st, freq, 1);
    } else if (LOOP_OFFSET == 320) {
        // hermite
        return 1.0 - value(st, freq, 2);
    } else if (LOOP_OFFSET == 330) {
        // catmull-rom 3x3
        return 1.0 - value(st, freq, 3);
    } else if (LOOP_OFFSET == 340) {
        // catmull-rom 4x4
        return 1.0 - value(st, freq, 4);
    } else if (LOOP_OFFSET == 350) {
        // b-spline 3x3
        return 1.0 - value(st, freq, 5);
    } else if (LOOP_OFFSET == 360) {
        // b-spline 4x4
        return 1.0 - value(st, freq, 6);
    } else if (LOOP_OFFSET == 370) {
        // simplex
        return 1.0 - value(st, freq, 10);
    } else if (LOOP_OFFSET == 380) {
        // sine
        return 1.0 - value(st, freq, 11);
    } else if (LOOP_OFFSET == 400) {
        // rings
        return 1.0 - rings(st, freq);
    } else if (LOOP_OFFSET == 410) {
        // sine
        return 1.0 - diamonds(st, freq);
    }
}

vec2 kaleidoscope(vec2 st, float sides, float blendy) {
	// distance metric
	float r = getMetric(st) + blendy;

    // cartesian to polar coordinates
    st = st - vec2(0.5 * aspectRatio, 0.5);
	float a = atan(st.y, st.x);

#if DIRECTION == 1
	float dir = -time;
#elif DIRECTION == 2
	float dir = 1.0;
#else
	float dir = time;
#endif
	// Repeat side according to angle
	float ma = mod(a + radians(90.0) - radians(360.0 / sides * dir), TAU/sides);
	ma = abs(ma - PI/sides);

	// polar to cartesian coordinates
	st = r * vec2(cos(ma), sin(ma));
	st = fract(st);
	return st;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution.y;

	vec4 color = vec4(0.0);
    loadKernels();

    float lf = map(loopScale, 1.0, 100.0, 6.0, 1.0);
    if (wrap) {
        lf = floor(lf);
    }

    float t = time + offset(uv, lf) * speed * 0.01;
	float blendy = periodicFunction(t) * map(abs(speed), 0.0, 100.0, 0.0, 2.0);

	uv = kaleidoscope(uv, kaleido, blendy);
	color = texture(inputTex, uv);

#if KERNEL != 0
    if (effectWidth != 0.0) {
#if KERNEL == 10
        color.rgb = pixellate(uv, effectWidth * 4.0);
#elif KERNEL == 110
        color.rgb = posterize(color.rgb, floor(map(effectWidth, 0.0, 10.0, 0.0, 20.0)));
#else
        color.rgb = convolutionKernel(color.rgb, uv);
#endif
    }
#endif

	fragColor = color;
}`,wgsl:`/*
 * Kaleidoscope shader (WGSL port).
 * Samples the input feed with mirrored wedges to generate kaleidoscopic symmetry.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

// LOOP_OFFSET, METRIC, DIRECTION and KERNEL are compile-time consts injected
// by the runtime via injectDefines (see definition.js
// \`globals.{loopOffset,metric,direction,kernel}.define\`). Same fix as the
// GLSL backend \u2014 collapses the runtime dispatches so Dawn constant-folds.
struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    // Effect params in definition.js globals order. GLSL declares
    // \`uniform float kaleido\` and uses it as the float side count in
    // kaleidoscope(); match that type so the slot reads consistently.
    kaleido: f32,
    // metric was here \u2014 now compile-time METRIC
    // direction was here \u2014 now compile-time DIRECTION
    // loopOffset was here \u2014 now compile-time LOOP_OFFSET
    loopScale: f32,
    speed: f32,
    seed: i32,
    wrap: i32,
    // kernel was here \u2014 now compile-time KERNEL
    effectWidth: f32,
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
    let scaledTime = periodicFunction(randTime.x - u.time) * mapRange(abs(u.speed), 0.0, 100.0, 0.0, 0.333);
    let rand = randomFromLatticeWithOffset(st, freq, vec2i(0, 0));
    return periodicFunction(rand.y - scaledTime);
}

fn quadratic3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let B0 = 0.5 * (1.0 - t) * (1.0 - t);
    let B1 = 0.5 * (-2.0 * t2 + 2.0 * t + 1.0);
    let B2 = 0.5 * t2;
    return p0 * B0 + p1 * B1 + p2 * B2;
}

fn catmullRom3(p0: f32, p1: f32, p2: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    return p1 + 0.5 * t * (p2 - p0) + 0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) + 0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
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

fn catmullRom3x3Value(st: vec2f, freq: f32) -> f32 {
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
    let y0 = catmullRom3(v00, v10, v20, f.x);
    let y1 = catmullRom3(v01, v11, v21, f.x);
    let y2 = catmullRom3(v02, v12, v22, f.x);
    return catmullRom3(y0, y1, y2, f.y);
}

fn blendBicubic(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
    let t2 = t * t;
    let t3 = t2 * t;
    let B0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    let B1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    let B2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    let B3 = t3 / 6.0;
    return p0 * B0 + p1 * B1 + p2 * B2 + p3 * B3;
}

fn catmullRom4(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

fn blendLinearOrCosine(a: f32, b: f32, amount: f32, interp: i32) -> f32 {
    if (interp == 1) { return mix(a, b, amount); }
    return mix(a, b, smoothstep(0.0, 1.0, amount));
}

// Simplex noise
fn mod289_3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_2(x: vec2f) -> vec2f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute3(x: vec3f) -> vec3f { return mod289_3(((x * 34.0) + 1.0) * x); }

fn simplexValue(v: vec2f) -> f32 {
    let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    var i = floor(v + dot(v, C.yy));
    let x0 = v - i + dot(i, C.xx);
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
    return 130.0 * dot(m, g);
}

fn sineNoise(st_in: vec2f, freq: f32) -> f32 {
    let st = st_in - vec2f(0.5 * aspectRatio(), 0.5);
    let rand = randomFromLatticeWithOffset(st, freq, vec2i(20, 0));
    let waveFreq = rand.x * 50.0;
    let waveAmp = rand.y;
    let wavePhase = rand.z * TAU;
    let randTime = randomFromLatticeWithOffset(st, freq, vec2i(40, 0));
    let phaseOffset = periodicFunction(randTime.x - u.time) * mapRange(abs(u.speed), 0.0, 100.0, 0.0, 0.333);
    let dist = length(st);
    let sineWave = sin(dist * waveFreq + wavePhase - phaseOffset) * waveAmp;
    return periodicFunction(sineWave);
}

fn bicubicValue(st: vec2f, freq: f32) -> f32 {
    let ndX = 1.0 / freq;
    let ndY = 1.0 / freq;
    let u0 = st.x - ndX; let u1 = st.x; let u2 = st.x + ndX; let u3 = st.x + ndX + ndX;
    let v0 = st.y - ndY; let v1 = st.y; let v2 = st.y + ndY; let v3 = st.y + ndY + ndY;
    let x0y0 = constant(vec2f(u0, v0), freq); let x0y1 = constant(vec2f(u0, v1), freq);
    let x0y2 = constant(vec2f(u0, v2), freq); let x0y3 = constant(vec2f(u0, v3), freq);
    let x1y0 = constant(vec2f(u1, v0), freq); let x1y1 = constant(st, freq);
    let x1y2 = constant(vec2f(u1, v2), freq); let x1y3 = constant(vec2f(u1, v3), freq);
    let x2y0 = constant(vec2f(u2, v0), freq); let x2y1 = constant(vec2f(u2, v1), freq);
    let x2y2 = constant(vec2f(u2, v2), freq); let x2y3 = constant(vec2f(u2, v3), freq);
    let x3y0 = constant(vec2f(u3, v0), freq); let x3y1 = constant(vec2f(u3, v1), freq);
    let x3y2 = constant(vec2f(u3, v2), freq); let x3y3 = constant(vec2f(u3, v3), freq);
    let uv = st * freq;
    let y0 = blendBicubic(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    let y1 = blendBicubic(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    let y2 = blendBicubic(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    let y3 = blendBicubic(x0y3, x1y3, x2y3, x3y3, fract(uv.x));
    return blendBicubic(y0, y1, y2, y3, fract(uv.y));
}

fn catmullRom4x4Value(st: vec2f, freq: f32) -> f32 {
    let ndX = 1.0 / freq; let ndY = 1.0 / freq;
    let u0 = st.x - ndX; let u1 = st.x; let u2 = st.x + ndX; let u3 = st.x + ndX + ndX;
    let v0 = st.y - ndY; let v1 = st.y; let v2 = st.y + ndY; let v3 = st.y + ndY + ndY;
    let x0y0 = constant(vec2f(u0, v0), freq); let x0y1 = constant(vec2f(u0, v1), freq);
    let x0y2 = constant(vec2f(u0, v2), freq); let x0y3 = constant(vec2f(u0, v3), freq);
    let x1y0 = constant(vec2f(u1, v0), freq); let x1y1 = constant(st, freq);
    let x1y2 = constant(vec2f(u1, v2), freq); let x1y3 = constant(vec2f(u1, v3), freq);
    let x2y0 = constant(vec2f(u2, v0), freq); let x2y1 = constant(vec2f(u2, v1), freq);
    let x2y2 = constant(vec2f(u2, v2), freq); let x2y3 = constant(vec2f(u2, v3), freq);
    let x3y0 = constant(vec2f(u3, v0), freq); let x3y1 = constant(vec2f(u3, v1), freq);
    let x3y2 = constant(vec2f(u3, v2), freq); let x3y3 = constant(vec2f(u3, v3), freq);
    let uv = st * freq;
    let y0 = catmullRom4(x0y0, x1y0, x2y0, x3y0, fract(uv.x));
    let y1 = catmullRom4(x0y1, x1y1, x2y1, x3y1, fract(uv.x));
    let y2 = catmullRom4(x0y2, x1y2, x2y2, x3y2, fract(uv.x));
    let y3 = catmullRom4(x0y3, x1y3, x2y3, x3y3, fract(uv.x));
    return catmullRom4(y0, y1, y2, y3, fract(uv.y));
}

fn value(st_in: vec2f, freq: f32, interp: i32) -> f32 {
    let st = st_in - vec2f(0.5 * aspectRatio(), 0.5);
    if (interp == 3) { return catmullRom3x3Value(st, freq); }
    else if (interp == 4) { return catmullRom4x4Value(st, freq); }
    else if (interp == 5) { return quadratic3x3Value(st, freq); }
    else if (interp == 6) { return bicubicValue(st, freq); }
    else if (interp == 10) { return periodicFunction(simplexValue(st * freq + vec2f(f32(u.seed)))); }
    else if (interp == 11) { return sineNoise(st, freq); }
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

fn hsv2rgb(hsv: vec3f) -> vec3f {
    let h = fract(hsv.x); let s = hsv.y; let v = hsv.z;
    let c = v * s; let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0)); let m = v - c;
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

fn convolve(uv: vec2f, kernel: array<f32, 9>, divide: bool) -> vec3f {
    let steps = 1.0 / u.resolution;
    let offsets = array<vec2f, 9>(
        vec2f(-steps.x, -steps.y), vec2f(0.0, -steps.y), vec2f(steps.x, -steps.y),
        vec2f(-steps.x, 0.0), vec2f(0.0, 0.0), vec2f(steps.x, 0.0),
        vec2f(-steps.x, steps.y), vec2f(0.0, steps.y), vec2f(steps.x, steps.y)
    );
    var kernelWeight = 0.0; var conv = vec3f(0.0);
    for (var i = 0; i < 9; i++) {
        let color = textureSample(inputTex, samp, uv + offsets[i] * u.effectWidth).rgb;
        conv += color * kernel[i]; kernelWeight += kernel[i];
    }
    if (divide && kernelWeight != 0.0) { conv /= kernelWeight; }
    return clamp(conv, vec3f(0.0), vec3f(1.0));
}

fn desaturate(color: vec3f) -> vec3f {
    return vec3f(0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b);
}

fn derivatives(color: vec3f, uv: vec2f, divide: bool) -> vec3f {
    let deriv_x = array<f32, 9>(0.0, 0.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0, 0.0);
    let deriv_y = array<f32, 9>(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0);
    return color * distance(convolve(uv, deriv_x, divide), convolve(uv, deriv_y, divide));
}

fn sobel(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    return color * distance(convolve(uv, sobel_x, false), convolve(uv, sobel_y, false));
}

fn outline(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    return max(color - distance(convolve(uv, sobel_x, false), convolve(uv, sobel_y, false)), vec3f(0.0));
}

fn shadow(color_in: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    var color = rgb2hsv(color_in);
    let shade_dist = distance(convolve(uv, sobel_x, false), convolve(uv, sobel_y, false));
    let highlight = shade_dist * shade_dist;
    let shade = (1.0 - ((1.0 - color.z) * (1.0 - highlight))) * shade_dist;
    color = vec3f(color.x, color.y, mix(color.z, shade, 0.75));
    return hsv2rgb(color);
}

fn convolutionKernel(color: vec3f, uv: vec2f) -> vec3f {
    let emboss = array<f32, 9>(-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);
    let sharpen = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 5.0, 0.0, -1.0, 0.0, -1.0);
    let blur = array<f32, 9>(1.0, 2.0, 1.0, 2.0, 4.0, 2.0, 1.0, 2.0, 1.0);
    let edge2 = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 4.0, 0.0, -1.0, 0.0, -1.0);
    if (KERNEL == 1) { return convolve(uv, blur, true); }
    else if (KERNEL == 2) { return derivatives(color, uv, true); }
    else if (KERNEL == 120) { return clamp(derivatives(color, uv, false) * 2.5, vec3f(0.0), vec3f(1.0)); }
    else if (KERNEL == 3) { return color * convolve(uv, edge2, true); }
    else if (KERNEL == 4) { return convolve(uv, emboss, false); }
    else if (KERNEL == 5) { return outline(color, uv); }
    else if (KERNEL == 6) { return shadow(color, uv); }
    else if (KERNEL == 7) { return convolve(uv, sharpen, false); }
    else if (KERNEL == 8) { return sobel(color, uv); }
    return color;
}

fn shape(st_in: vec2f, sides: i32, blend: f32) -> f32 {
    if (sides < 2) { return distance(st_in, vec2f(0.5)); }
    let st = vec2f(st_in.x, 1.0 - st_in.y) * 2.0 - vec2f(aspectRatio(), 1.0);
    let a = atan2(st.x, st.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}

fn posterize(color: vec3f, levIn: f32) -> vec3f {
    var lev = levIn;
    if (lev == 0.0) { return color; }
    else if (lev == 1.0) { lev = 2.0; }
    let c = clamp(color, vec3f(0.0), vec3f(0.99));
    return (floor(c * lev) + 0.5) / lev;
}

fn pixellate(uv: vec2f, size: f32) -> vec3f {
    let dx = size / u.resolution.x;
    let dy = size / u.resolution.y;
    return textureSample(inputTex, samp, vec2f(dx * floor(uv.x / dx), dy * floor(uv.y / dy))).rgb;
}

fn circles(st: vec2f, freq: f32) -> f32 {
    return length(st - vec2f(0.5 * aspectRatio(), 0.5)) * freq;
}

fn rings(st: vec2f, freq: f32) -> f32 {
    return cos(length(st - vec2f(0.5 * aspectRatio(), 0.5)) * PI * freq);
}

fn diamonds(st: vec2f, freq: f32) -> f32 {
    var s = st; s.x -= 0.5 * aspectRatio(); s *= freq;
    return sin(s.x * PI) + sin(s.y * PI);
}

fn getMetric(st: vec2f) -> f32 {
    let diff = vec2f(0.5 * aspectRatio(), 0.5) - st;
    if (METRIC == 0) { return length(st - vec2f(0.5 * aspectRatio(), 0.5)); }
    else if (METRIC == 1) { return abs(diff.x) + abs(diff.y); }
    else if (METRIC == 2) { return max(max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y), max(abs(diff.x) - diff.y * 0.5, 1.0 * diff.y)); }
    else if (METRIC == 3) { return max((abs(diff.x) + abs(diff.y)) / sqrt(2.0), max(abs(diff.x), abs(diff.y))); }
    else if (METRIC == 4) { return max(abs(diff.x), abs(diff.y)); }
    else if (METRIC == 5) { return max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y); }
    return 1.0;
}

fn offset(st: vec2f, freq: f32) -> f32 {
    if (LOOP_OFFSET == 10) { return circles(st, freq); }
    else if (LOOP_OFFSET == 20) { return shape(st, 3, freq * 0.5); }
    else if (LOOP_OFFSET == 30) { return (abs(st.x - 0.5 * aspectRatio()) + abs(st.y - 0.5)) * freq * 0.5; }
    else if (LOOP_OFFSET == 40) { return shape(st, 4, freq * 0.5); }
    else if (LOOP_OFFSET == 50) { return shape(st, 5, freq * 0.5); }
    else if (LOOP_OFFSET == 60) { return shape(st, 6, freq * 0.5); }
    else if (LOOP_OFFSET == 70) { return shape(st, 7, freq * 0.5); }
    else if (LOOP_OFFSET == 80) { return shape(st, 8, freq * 0.5); }
    else if (LOOP_OFFSET == 90) { return shape(st, 9, freq * 0.5); }
    else if (LOOP_OFFSET == 100) { return shape(st, 10, freq * 0.5); }
    else if (LOOP_OFFSET == 110) { return shape(st, 11, freq * 0.5); }
    else if (LOOP_OFFSET == 120) { return shape(st, 12, freq * 0.5); }
    else if (LOOP_OFFSET == 200) { return st.x * freq * 0.5; }
    else if (LOOP_OFFSET == 210) { return st.y * freq * 0.5; }
    else if (LOOP_OFFSET == 300) { return 1.0 - value(st, freq, 0); }
    else if (LOOP_OFFSET == 310) { return 1.0 - value(st, freq, 1); }
    else if (LOOP_OFFSET == 320) { return 1.0 - value(st, freq, 2); }
    else if (LOOP_OFFSET == 330) { return 1.0 - value(st, freq, 3); }
    else if (LOOP_OFFSET == 340) { return 1.0 - value(st, freq, 4); }
    else if (LOOP_OFFSET == 350) { return 1.0 - value(st, freq, 5); }
    else if (LOOP_OFFSET == 360) { return 1.0 - value(st, freq, 6); }
    else if (LOOP_OFFSET == 370) { return 1.0 - value(st, freq, 10); }
    else if (LOOP_OFFSET == 380) { return 1.0 - value(st, freq, 11); }
    else if (LOOP_OFFSET == 400) { return 1.0 - rings(st, freq); }
    else if (LOOP_OFFSET == 410) { return 1.0 - diamonds(st, freq); }
    return 0.0;
}

// GLSL mod(x,y) = x - y*floor(x/y) (sign of y). WGSL \`%\` = x - y*trunc(x/y)
// (sign of x); they diverge for negative x. kaleidoscope() folds a signed
// angle, so it must use the GLSL definition to match glsl/kaleido.glsl.
fn glslMod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn kaleidoscope(st_in: vec2f, sides: f32, blendy: f32) -> vec2f {
    let r = getMetric(st_in) + blendy;
    var st = st_in - vec2f(0.5 * aspectRatio(), 0.5);
    var a = atan2(st.y, st.x);
    var dir = u.time;
    if (DIRECTION == 1) { dir *= -1.0; }
    else if (DIRECTION == 2) { dir = 1.0; }
    var ma = glslMod(a + radians(90.0) - radians(360.0 / sides * dir), TAU / sides);
    ma = abs(ma - PI / sides);
    st = r * vec2f(cos(ma), sin(ma));
    return fract(st);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Aspect-preserving UV from resolution (uv.x in [0, aspect], uv.y in
    // [0, 1]), matching glsl/kaleido.glsl \`gl_FragCoord.xy / fullResolution.y\`
    // for the non-tiled case. Uses u.resolution like working sibling
    // classicNoisedeck WGSL effects; the runtime always populates it.
    var uv = fragCoord.xy / u.resolution.y;

    var lf = mapRange(u.loopScale, 1.0, 100.0, 6.0, 1.0);
    if (u.wrap != 0) { lf = floor(lf); }

    let t = u.time + offset(uv, lf) * u.speed * 0.01;
    let blendy = periodicFunction(t) * mapRange(abs(u.speed), 0.0, 100.0, 0.0, 2.0);

    uv = kaleidoscope(uv, u.kaleido, blendy);
    var color = textureSample(inputTex, samp, uv);

    if (u.effectWidth != 0.0 && KERNEL != 0) {
        if (KERNEL == 10) { color = vec4f(pixellate(uv, u.effectWidth * 4.0), color.a); }
        else if (KERNEL == 110) { color = vec4f(posterize(color.rgb, floor(mapRange(u.effectWidth, 0.0, 10.0, 0.0, 20.0))), color.a); }
        else { color = vec4f(convolutionKernel(color.rgb, uv), color.a); }
    }

    return color;
}
`}},s=`# kaleido

Kaleidoscope effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| sides | int | 8 | 2-32 | Sides |
| metric | int | circle | circle/diamond/hexagon/octagon/square/triangle | Shape |
| loopOffset | int | circle | Shapes:/circle/triangle/diamond/square/pentagon/hexagon/heptagon/octagon/nonagon/decagon/hendecagon/dodecagon/Directional:/horizontalScan/verticalScan/Noise:/noiseConstant/noiseLinear/noiseHermite/noiseCatmullRom3x3/noiseCatmullRom4x4/noiseBSpline3x3/noiseBSpline4x4/noiseSimplex/noiseSine/Misc:/rings/sine | Loop offset |
| loopScale | float | 1 | 1-100 | Loop scale |
| speed | float | 5 | -100-100 | Speed |
| seed | int | 1 | 1-100 | Seed |
| wrap | boolean | true | - | Wrap |
| direction | int | none | clockwise/counterclock/none | Rotate |
| kernel | int | none | none/blur/derivatives/derivDivide/edge/emboss/outline/pixels/posterize/shadow/sharpen/sobel | Effect |
| effectWidth | float | 0 | 0-10 | Effect width |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .kaleido()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&s&&(n.help=s);var c="classicNoisedeck/kaleido",v="classicNoisedeck",u="kaleido",d=n;export{d as default,c as effectId,u as effectName,s as help,v as namespace};
