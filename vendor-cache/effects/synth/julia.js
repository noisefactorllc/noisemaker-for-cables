/* synth/julia */
var e=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var t=new e({name:"Julia",namespace:"synth",func:"julia",tags:["fractal"],description:"Julia set explorer with deep zoom",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},cReal:{slot:1,components:"x"},cImag:{slot:1,components:"y"},poi:{slot:1,components:"z"},outputMode:{slot:1,components:"w"},centerX:{slot:2,components:"x"},centerY:{slot:2,components:"y"},rotation:{slot:2,components:"z"},iterations:{slot:3,components:"x"},stripeFreq:{slot:3,components:"y"},trapShape:{slot:3,components:"z"},lightAngle:{slot:3,components:"w"},cPath:{slot:4,components:"x"},cSpeed:{slot:4,components:"y"},cRadius:{slot:4,components:"z"},invert:{slot:4,components:"w"},zoomSpeed:{slot:5,components:"x"},zoomDepth:{slot:5,components:"y"},tileOffset:{slot:6,components:"xy"},fullResolution:{slot:6,components:"zw"}},globals:{poi:{type:"int",default:10,uniform:"poi",choices:{manual:0,basilica:4,dendrite:3,douadyRabbit:1,doubleSpiral:10,dragonCurve:7,galaxy:5,lightning:6,sanMarco:8,siegel:2,starfish:9},ui:{label:"preset",control:"dropdown",category:"fractal"}},outputMode:{type:"int",default:3,uniform:"outputMode",choices:{distance:1,normalMap:4,orbitTrap:3,smoothIteration:0,stripeAverage:2},ui:{label:"output mode",control:"dropdown",category:"fractal"}},iterations:{type:"int",default:300,uniform:"iterations",min:50,max:1e3,ui:{label:"iterations",control:"slider",category:"fractal",enabledBy:{param:"outputMode",neq:1}}},cReal:{type:"float",default:-.123,uniform:"cReal",min:-2,max:2,ui:{label:"c real",control:"slider",category:"fractal",enabledBy:{and:[{param:"poi",eq:0},{param:"cPath",eq:0}]}}},cImag:{type:"float",default:.745,uniform:"cImag",min:-2,max:2,ui:{label:"c imaginary",control:"slider",category:"fractal",enabledBy:{and:[{param:"poi",eq:0},{param:"cPath",eq:0}]}}},centerX:{type:"float",default:0,uniform:"centerX",min:-3,max:3,step:.001,randChance:0,ui:{label:"center x",control:"slider",category:"navigation"}},centerY:{type:"float",default:0,uniform:"centerY",min:-3,max:3,step:.001,randChance:0,ui:{label:"center y",control:"slider",category:"navigation"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider",category:"navigation"}},cPath:{type:"int",default:0,uniform:"cPath",choices:{none:0,bulb:3,cardioid:1,circle:2},ui:{label:"c path",control:"dropdown",category:"animation",enabledBy:{param:"poi",eq:0}}},cSpeed:{type:"float",default:.3,uniform:"cSpeed",min:0,max:2,zero:0,randMax:.5,ui:{label:"c speed",control:"slider",category:"animation",enabledBy:{and:[{param:"poi",eq:0},{param:"cPath",neq:0}]}}},cRadius:{type:"float",default:.7885,uniform:"cRadius",min:.01,max:1.5,ui:{label:"c radius",control:"slider",category:"animation",enabledBy:{and:[{param:"poi",eq:0},{param:"cPath",eq:2}]}}},zoomSpeed:{type:"float",default:0,uniform:"zoomSpeed",min:0,max:5,step:.01,zero:0,randChance:0,ui:{label:"zoom speed",control:"slider",category:"animation"}},zoomDepth:{type:"float",default:0,uniform:"zoomDepth",min:0,max:14,step:.001,randChance:0,ui:{label:"zoom depth",control:"slider",category:"animation"}},stripeFreq:{type:"float",default:5,uniform:"stripeFreq",min:.5,max:20,ui:{label:"stripe frequency",control:"slider",category:"output",enabledBy:{param:"outputMode",eq:2}}},trapShape:{type:"int",default:0,uniform:"trapShape",choices:{circle:2,cross:1,point:0},ui:{label:"trap shape",control:"dropdown",category:"output",enabledBy:{param:"outputMode",eq:3}}},lightAngle:{type:"float",default:45,uniform:"lightAngle",min:0,max:360,ui:{label:"light angle",control:"slider",category:"output",enabledBy:{param:"outputMode",eq:4}}},invert:{type:"boolean",default:!1,uniform:"invert",ui:{label:"invert",control:"checkbox",category:"output"}}},openCategories:["fractal","animation"],passes:[{name:"render",program:"julia",inputs:{},outputs:{fragColor:"outputTex"}}]});var o={julia:{glsl:`/*
 * Julia set explorer \u2014 state-of-the-art
 *
 * Grayscale value output [0,1]. Alpha = 1.0 (synth effect).
 * Iteration: z = z\xB2 + c, z\u2080 = pixel, c = Julia constant.
 * Derivative: dz/dz\u2080 for distance estimation (no +1 term \u2014 c is constant).
 *
 * All coordinate and iteration math uses df64 (double-float emulation).
 * Single iteration loop computes all output values simultaneously.
 * Output mode selects which value to emit.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;

uniform float cReal;
uniform float cImag;
uniform int poi;
uniform int outputMode;

uniform float centerX;
uniform float centerY;
uniform float rotation;

uniform int iterations;
uniform float stripeFreq;
uniform int trapShape;
uniform float lightAngle;

uniform int cPath;
uniform float cSpeed;
uniform float cRadius;
uniform bool invert;

uniform float zoomSpeed;
uniform float zoomDepth;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float BAILOUT = 256.0;
const float LOG2 = 0.6931471805599453;

// ============================================================================
// POI c-values (famous Julia sets)
// ============================================================================

vec2 getPOI(int idx) {
    if (idx == 1) return vec2(-0.123, 0.745);       // Douady's rabbit
    if (idx == 2) return vec2(-0.3905, 0.5868);      // Siegel disk
    if (idx == 3) return vec2(0.0, 1.0);             // Dendrite
    if (idx == 4) return vec2(-1.0, 0.0);            // Basilica
    if (idx == 5) return vec2(-0.7455, 0.1130);      // Spiral galaxy
    if (idx == 6) return vec2(-0.0986, 0.6534);      // Lightning
    if (idx == 7) return vec2(-0.8, 0.156);          // Dragon curve
    if (idx == 8) return vec2(-0.75, 0.0);           // San Marco
    if (idx == 9) return vec2(-0.5792, 0.5385);      // Starfish
    if (idx == 10) return vec2(0.28, 0.008);         // Double spiral
    return vec2(-0.123, 0.745);                       // fallback
}

// ============================================================================
// Animated c-paths
// ============================================================================

vec2 getAnimatedC(int pathType, float t, float radius) {
    float theta = t * TAU;
    if (pathType == 1) {
        return vec2(cos(theta) * 0.5 - cos(2.0 * theta) * 0.25,
                    sin(theta) * 0.5 - sin(2.0 * theta) * 0.25);
    }
    if (pathType == 2) {
        return vec2(cos(theta), sin(theta)) * radius;
    }
    if (pathType == 3) {
        return vec2(-1.0 + cos(theta) * 0.25, sin(theta) * 0.25);
    }
    return vec2(0.0);
}

// ============================================================================
// Complex multiply
// ============================================================================

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// ============================================================================
// Double-float emulation (df64) \u2014 two float32s = ~15 decimal digits
// ============================================================================

vec2 df64_from(float a) {
    return vec2(a, 0.0);
}

vec2 df64_add(vec2 a, vec2 b) {
    float s = a.x + b.x;
    float v = s - a.x;
    float e = (a.x - (s - v)) + (b.x - v);
    return vec2(s, e + a.y + b.y);
}

vec2 df64_sub(vec2 a, vec2 b) {
    return df64_add(a, vec2(-b.x, -b.y));
}

// Dekker's split: exact split of float into hi/lo parts
const float df64_split_const = 4097.0; // 2^12 + 1
void df64_split(float a, out float hi, out float lo) {
    float t = df64_split_const * a;
    hi = t - (t - a);
    lo = a - hi;
}

vec2 df64_mul(vec2 a, vec2 b) {
    float p = a.x * b.x;
    float ahi, alo, bhi, blo;
    df64_split(a.x, ahi, alo);
    df64_split(b.x, bhi, blo);
    float e = ((ahi * bhi - p) + ahi * blo + alo * bhi) + alo * blo;
    e += a.x * b.y + a.y * b.x;
    return vec2(p, e);
}

vec2 df64_mul_f(vec2 a, float b) {
    float p = a.x * b;
    float ahi, alo, bhi, blo;
    df64_split(a.x, ahi, alo);
    df64_split(b, bhi, blo);
    float e = ((ahi * bhi - p) + ahi * blo + alo * bhi) + alo * blo;
    e += a.y * b;
    return vec2(p, e);
}

// ============================================================================
// Resolve c-value from POI/path/manual
// ============================================================================

vec2 resolveC() {
    if (poi > 0) return getPOI(poi);
    if (cPath > 0) return getAnimatedC(cPath, time * cSpeed, cRadius);
    return vec2(cReal, cImag);
}

// ============================================================================
// df64 coordinate transform
// ============================================================================

void transformCoords(vec2 fragCoord, float zm,
                     out vec2 reDF, out vec2 imDF) {
    vec2 uv = (fragCoord - 0.5 * fullResolution) / min(fullResolution.x, fullResolution.y);
    float angle = -rotation * TAU / 360.0;
    float cs = cos(angle);
    float sn = sin(angle);
    uv = mat2(cs, -sn, sn, cs) * uv;

    float scale = 2.5 / zm;
    reDF = df64_add(df64_mul_f(df64_from(uv.x), scale), df64_from(centerX));
    imDF = df64_add(df64_mul_f(df64_from(uv.y), scale), df64_from(centerY));
}

// ============================================================================
// Unified Julia iteration \u2014 df64 z-iteration, all output values in one loop
// ============================================================================

struct JuliaResult {
    float iter;
    float zMag2;
    float dzMag2;
    float stripeSum;
    float stripeCount;
    float stripeLast;
    float trapMin;
};

JuliaResult juliaIterate(vec2 z0Re, vec2 z0Im, vec2 c, int maxIter,
                         float freq, int trap) {
    JuliaResult r;
    vec2 zRe = z0Re;
    vec2 zIm = z0Im;
    vec2 dz = vec2(1.0, 0.0);
    float i = 0.0;
    float stripeSum = 0.0;
    float stripeLast = 0.0;
    float stripeCount = 0.0;
    float trapMin = 1e10;
    float bail2 = BAILOUT * BAILOUT;

    vec2 zSlow = vec2(z0Re.x, z0Im.x);
    int period = 0;

    for (int n = 0; n < 1000; n++) {
        if (n >= maxIter) break;

        // Derivative: dz = 2*z*dz (float32 using hi parts)
        vec2 zF = vec2(zRe.x, zIm.x);
        dz = 2.0 * cmul(zF, dz);

        // Iteration: z = z\xB2 + c in df64
        vec2 zRe2 = df64_mul(zRe, zRe);
        vec2 zIm2 = df64_mul(zIm, zIm);
        vec2 zReIm = df64_mul(zRe, zIm);

        zRe = df64_add(df64_sub(zRe2, zIm2), df64_from(c.x));
        zIm = df64_add(df64_mul_f(zReIm, 2.0), df64_from(c.y));

        // Bailout check (float32 hi parts)
        float zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
        if (zMag2 > bail2) break;

        i += 1.0;

        // Stripe average accumulation (float32 from hi parts)
        vec2 zHi = vec2(zRe.x, zIm.x);
        if (freq > 0.0) {
            stripeLast = 0.5 * sin(freq * atan(zHi.y, zHi.x)) + 0.5;
            stripeSum += stripeLast;
            stripeCount += 1.0;
        }

        // Orbit trap accumulation
        float td;
        if (trap == 0) {
            td = length(zHi);
        } else if (trap == 1) {
            td = min(abs(zHi.x), abs(zHi.y));
        } else {
            td = abs(length(zHi) - 1.0);
        }
        trapMin = min(trapMin, td);

        // Period detection
        period++;
        if (period == 20) {
            period = 0;
            zSlow = zHi;
        } else if (distance(zHi, zSlow) < 1e-10) {
            i = float(maxIter);
            break;
        }
    }

    r.iter = i;
    r.zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
    r.dzMag2 = dot(dz, dz);
    r.stripeSum = stripeSum;
    r.stripeCount = stripeCount;
    r.stripeLast = stripeLast;
    r.trapMin = trapMin;
    return r;
}

// ============================================================================
// Output extraction from unified result
// ============================================================================

float outputSmoothIteration(JuliaResult r, float maxIter) {
    if (r.iter >= maxIter) return 0.0;
    float log_zn = log(r.zMag2) * 0.5;
    float nu = log(log_zn / LOG2) / LOG2;
    return clamp((r.iter + 1.0 - nu) / maxIter, 0.0, 1.0);
}

float outputDistanceEstimation(JuliaResult r, float maxIter) {
    if (r.iter >= maxIter) return 0.0;
    float zMag = sqrt(r.zMag2);
    float dzMag = sqrt(r.dzMag2);
    if (dzMag < 1e-10) return 0.0;
    float dist = 2.0 * zMag * log(zMag) / dzMag;
    return clamp(log(dist + 1.0) * 2.0, 0.0, 1.0);
}

float outputStripeAverage(JuliaResult r, float maxIter) {
    if (r.iter >= maxIter) return 0.0;
    if (r.stripeCount < 1.0) return 0.0;
    float avg = r.stripeSum / r.stripeCount;
    float prevAvg = (r.stripeCount > 1.0) ? (r.stripeSum - r.stripeLast) / (r.stripeCount - 1.0) : avg;
    float log_zn = log(r.zMag2) * 0.5;
    float nu = log(log_zn / LOG2) / LOG2;
    float frac = clamp(1.0 - nu + floor(nu), 0.0, 1.0);
    return clamp(mix(prevAvg, avg, frac), 0.0, 1.0);
}

float outputOrbitTrap(JuliaResult r, float maxIter) {
    if (r.iter >= maxIter) return 0.0;
    return clamp(1.0 - r.trapMin, 0.0, 1.0);
}

// ============================================================================
// Normal map \u2014 runs iteration 3 times for finite differences
// ============================================================================

float iterateSmooth(vec2 fragCoord, vec2 c, int maxIter, float zm) {
    vec2 reDF, imDF;
    transformCoords(fragCoord, zm, reDF, imDF);

    vec2 zRe = reDF;
    vec2 zIm = imDF;
    float i = 0.0;
    float bail2 = BAILOUT * BAILOUT;

    for (int n = 0; n < 1000; n++) {
        if (n >= maxIter) break;

        vec2 zRe2 = df64_mul(zRe, zRe);
        vec2 zIm2 = df64_mul(zIm, zIm);
        vec2 zReIm = df64_mul(zRe, zIm);

        zRe = df64_add(df64_sub(zRe2, zIm2), df64_from(c.x));
        zIm = df64_add(df64_mul_f(zReIm, 2.0), df64_from(c.y));

        float zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
        if (zMag2 > bail2) break;
        i += 1.0;
    }

    if (i >= float(maxIter)) return 0.0;
    float zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
    float log_zn = log(zMag2) * 0.5;
    float nu = log(log_zn / LOG2) / LOG2;
    return clamp((i + 1.0 - nu) / float(maxIter), 0.0, 1.0);
}

float outputNormalMap(vec2 fragCoord, vec2 c, int maxIter, float angle, float zm) {
    float d0 = iterateSmooth(fragCoord, c, maxIter, zm);
    float d1 = iterateSmooth(fragCoord + vec2(1.0, 0.0), c, maxIter, zm);
    float d2 = iterateSmooth(fragCoord + vec2(0.0, 1.0), c, maxIter, zm);

    vec3 normal = normalize(vec3(d1 - d0, d2 - d0, 0.05));
    float rad = angle * TAU / 360.0;
    vec3 lightDir = normalize(vec3(cos(rad), sin(rad), 0.7));
    return clamp(max(dot(normal, lightDir), 0.0), 0.0, 1.0);
}

// ============================================================================
// Main
// ============================================================================

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 c = resolveC();

    // Zoom: sinusoidal when animated, static pow(10, depth) when not
    float effectiveZoom;
    if (zoomSpeed > 0.0) {
        float phase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        effectiveZoom = pow(10.0, zoomDepth * phase);
    } else {
        effectiveZoom = pow(10.0, zoomDepth);
    }

    float value;

    if (outputMode == 4) {
        value = outputNormalMap(globalCoord, c, iterations, lightAngle, effectiveZoom);
    } else {
        vec2 reDF, imDF;
        transformCoords(globalCoord, effectiveZoom, reDF, imDF);
        JuliaResult r = juliaIterate(reDF, imDF, c, iterations, stripeFreq, trapShape);

        if (outputMode == 0) {
            value = outputSmoothIteration(r, float(iterations));
        } else if (outputMode == 1) {
            value = outputDistanceEstimation(r, float(iterations));
        } else if (outputMode == 2) {
            value = outputStripeAverage(r, float(iterations));
        } else if (outputMode == 3) {
            value = outputOrbitTrap(r, float(iterations));
        } else {
            value = outputSmoothIteration(r, float(iterations));
        }
    }

    if (invert) {
        value = 1.0 - value;
    }

    fragColor = vec4(vec3(value), 1.0);
}
`,wgsl:`/*
 * Julia set explorer \u2014 state-of-the-art (WGSL backend)
 *
 * Grayscale value output [0,1]. Alpha = 1.0 (synth effect).
 * Iteration: z = z\xB2 + c, z\u2080 = pixel, c = Julia constant.
 * Derivative: dz/dz\u2080 for distance estimation (no +1 term \u2014 c is constant).
 *
 * All coordinate and iteration math uses df64 (double-float emulation).
 * Single iteration loop computes all output values simultaneously.
 * Output mode selects which value to emit.
 */

struct Uniforms {
    // Slot 0: resolution.xy, time, (unused)
    // Slot 1: cReal, cImag, poi, outputMode
    // Slot 2: centerX, centerY, rotation, (unused)
    // Slot 3: iterations, stripeFreq, trapShape, lightAngle
    // Slot 4: cPath, cSpeed, cRadius, invert
    // Slot 5: zoomSpeed, zoomDepth, (unused), (unused)
    data: array<vec4<f32>, 7>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const BAILOUT: f32 = 256.0;
const LOG2: f32 = 0.6931471805599453;

// ============================================================================
// POI c-values (famous Julia sets)
// ============================================================================

fn getPOI(idx: i32) -> vec2<f32> {
    if (idx == 1) { return vec2<f32>(-0.123, 0.745); }         // Douady's rabbit
    if (idx == 2) { return vec2<f32>(-0.3905, 0.5868); }       // Siegel disk
    if (idx == 3) { return vec2<f32>(0.0, 1.0); }              // Dendrite
    if (idx == 4) { return vec2<f32>(-1.0, 0.0); }             // Basilica
    if (idx == 5) { return vec2<f32>(-0.7455, 0.1130); }       // Spiral galaxy
    if (idx == 6) { return vec2<f32>(-0.0986, 0.6534); }       // Lightning
    if (idx == 7) { return vec2<f32>(-0.8, 0.156); }           // Dragon curve
    if (idx == 8) { return vec2<f32>(-0.75, 0.0); }            // San Marco
    if (idx == 9) { return vec2<f32>(-0.5792, 0.5385); }       // Starfish
    if (idx == 10) { return vec2<f32>(0.28, 0.008); }          // Double spiral
    return vec2<f32>(-0.123, 0.745);
}

// ============================================================================
// Animated c-paths
// ============================================================================

fn getAnimatedC(pathType: i32, t: f32, radius: f32) -> vec2<f32> {
    let theta = t * TAU;
    if (pathType == 1) {
        return vec2<f32>(
            cos(theta) * 0.5 - cos(2.0 * theta) * 0.25,
            sin(theta) * 0.5 - sin(2.0 * theta) * 0.25
        );
    }
    if (pathType == 2) {
        return vec2<f32>(cos(theta), sin(theta)) * radius;
    }
    if (pathType == 3) {
        return vec2<f32>(-1.0 + cos(theta) * 0.25, sin(theta) * 0.25);
    }
    return vec2<f32>(0.0, 0.0);
}

// ============================================================================
// Complex multiply
// ============================================================================

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// ============================================================================
// Double-float emulation (df64) \u2014 two f32s = ~15 decimal digits
// ============================================================================

fn df64_from(a: f32) -> vec2<f32> {
    return vec2<f32>(a, 0.0);
}

fn df64_add(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    let s = a.x + b.x;
    let v = s - a.x;
    let e = (a.x - (s - v)) + (b.x - v);
    return vec2<f32>(s, e + a.y + b.y);
}

fn df64_sub(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return df64_add(a, vec2<f32>(-b.x, -b.y));
}

fn df64_split(a: f32) -> vec2<f32> {
    let t = 4097.0 * a; // 2^12 + 1
    let hi = t - (t - a);
    return vec2<f32>(hi, a - hi);
}

fn df64_mul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    let p = a.x * b.x;
    let as_ = df64_split(a.x);
    let bs = df64_split(b.x);
    var e = ((as_.x * bs.x - p) + as_.x * bs.y + as_.y * bs.x) + as_.y * bs.y;
    e = e + a.x * b.y + a.y * b.x;
    return vec2<f32>(p, e);
}

fn df64_mul_f(a: vec2<f32>, b: f32) -> vec2<f32> {
    let p = a.x * b;
    let as_ = df64_split(a.x);
    let bs = df64_split(b);
    var e = ((as_.x * bs.x - p) + as_.x * bs.y + as_.y * bs.x) + as_.y * bs.y;
    e = e + a.y * b;
    return vec2<f32>(p, e);
}

// ============================================================================
// Resolve c-value from POI/path/manual
// ============================================================================

fn resolveC(poi: i32, cPath: i32, time: f32, cSpeed: f32, cRadius: f32, cReal: f32, cImag: f32) -> vec2<f32> {
    if (poi > 0) { return getPOI(poi); }
    if (cPath > 0) { return getAnimatedC(cPath, time * cSpeed, cRadius); }
    return vec2<f32>(cReal, cImag);
}

// ============================================================================
// df64 coordinate transform
// ============================================================================

fn transformCoords(fragCoord: vec2<f32>, resolution: vec2<f32>,
                   cx: f32, cy: f32, zm: f32, rot: f32)
                   -> array<vec2<f32>, 2> {
    var uv = (fragCoord - 0.5 * resolution) / min(resolution.x, resolution.y);
    let angle = -rot * TAU / 360.0;
    let cs = cos(angle);
    let sn = sin(angle);
    uv = vec2<f32>(cs * uv.x - sn * uv.y, sn * uv.x + cs * uv.y);

    let scale = 2.5 / zm;
    let reDF = df64_add(df64_mul_f(df64_from(uv.x), scale), df64_from(cx));
    let imDF = df64_add(df64_mul_f(df64_from(uv.y), scale), df64_from(cy));
    return array<vec2<f32>, 2>(reDF, imDF);
}

// ============================================================================
// Unified Julia iteration \u2014 df64 z-iteration, all output values in one loop
// ============================================================================

struct JuliaResult {
    iter: f32,
    zMag2: f32,
    dzMag2: f32,
    stripeSum: f32,
    stripeCount: f32,
    stripeLast: f32,
    trapMin: f32,
};

fn juliaIterate(z0Re: vec2<f32>, z0Im: vec2<f32>, c: vec2<f32>,
                maxIter: i32, freq: f32, trap: i32) -> JuliaResult {
    var zRe = z0Re;
    var zIm = z0Im;
    var dz = vec2<f32>(1.0, 0.0);
    var i: f32 = 0.0;
    var stripeSum: f32 = 0.0;
    var stripeLast: f32 = 0.0;
    var stripeCount: f32 = 0.0;
    var trapMin: f32 = 1e10;
    let bail2 = BAILOUT * BAILOUT;

    var zSlow = vec2<f32>(z0Re.x, z0Im.x);
    var period: i32 = 0;

    for (var n: i32 = 0; n < 1000; n = n + 1) {
        if (n >= maxIter) { break; }

        // Derivative: dz = 2*z*dz (float32 using hi parts)
        let zF = vec2<f32>(zRe.x, zIm.x);
        dz = 2.0 * cmul(zF, dz);

        // Iteration: z = z\xB2 + c in df64
        let zRe2 = df64_mul(zRe, zRe);
        let zIm2 = df64_mul(zIm, zIm);
        let zReIm = df64_mul(zRe, zIm);

        zRe = df64_add(df64_sub(zRe2, zIm2), df64_from(c.x));
        zIm = df64_add(df64_mul_f(zReIm, 2.0), df64_from(c.y));

        // Bailout check (float32 hi parts)
        let zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
        if (zMag2 > bail2) { break; }

        i = i + 1.0;

        // Stripe average accumulation (float32 from hi parts)
        let zHi = vec2<f32>(zRe.x, zIm.x);
        if (freq > 0.0) {
            stripeLast = 0.5 * sin(freq * atan2(zHi.y, zHi.x)) + 0.5;
            stripeSum = stripeSum + stripeLast;
            stripeCount = stripeCount + 1.0;
        }

        // Orbit trap accumulation
        var td: f32;
        if (trap == 0) {
            td = length(zHi);
        } else if (trap == 1) {
            td = min(abs(zHi.x), abs(zHi.y));
        } else {
            td = abs(length(zHi) - 1.0);
        }
        trapMin = min(trapMin, td);

        // Period detection
        period = period + 1;
        if (period == 20) {
            period = 0;
            zSlow = zHi;
        } else if (distance(zHi, zSlow) < 1e-10) {
            i = f32(maxIter);
            break;
        }
    }

    var r: JuliaResult;
    r.iter = i;
    r.zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
    r.dzMag2 = dot(dz, dz);
    r.stripeSum = stripeSum;
    r.stripeCount = stripeCount;
    r.stripeLast = stripeLast;
    r.trapMin = trapMin;
    return r;
}

// ============================================================================
// Output extraction from unified result
// ============================================================================

fn outputSmoothIteration(r: JuliaResult, maxIter: f32) -> f32 {
    if (r.iter >= maxIter) { return 0.0; }
    let log_zn = log(r.zMag2) * 0.5;
    let nu = log(log_zn / LOG2) / LOG2;
    return clamp((r.iter + 1.0 - nu) / maxIter, 0.0, 1.0);
}

fn outputDistanceEstimation(r: JuliaResult, maxIter: f32) -> f32 {
    if (r.iter >= maxIter) { return 0.0; }
    let zMag = sqrt(r.zMag2);
    let dzMag = sqrt(r.dzMag2);
    if (dzMag < 1e-10) { return 0.0; }
    let dist = 2.0 * zMag * log(zMag) / dzMag;
    return clamp(log(dist + 1.0) * 2.0, 0.0, 1.0);
}

fn outputStripeAverage(r: JuliaResult, maxIter: f32) -> f32 {
    if (r.iter >= maxIter) { return 0.0; }
    if (r.stripeCount < 1.0) { return 0.0; }
    let avg = r.stripeSum / r.stripeCount;
    var prevAvg = avg;
    if (r.stripeCount > 1.0) { prevAvg = (r.stripeSum - r.stripeLast) / (r.stripeCount - 1.0); }
    let log_zn = log(r.zMag2) * 0.5;
    let nu = log(log_zn / LOG2) / LOG2;
    let frac = clamp(1.0 - nu + floor(nu), 0.0, 1.0);
    return clamp(mix(prevAvg, avg, frac), 0.0, 1.0);
}

fn outputOrbitTrap(r: JuliaResult, maxIter: f32) -> f32 {
    if (r.iter >= maxIter) { return 0.0; }
    return clamp(1.0 - r.trapMin, 0.0, 1.0);
}

// ============================================================================
// Normal map \u2014 runs iteration 3 times for finite differences
// ============================================================================

fn iterateSmooth(fragCoord: vec2<f32>, c: vec2<f32>, maxIter: i32,
                 resolution: vec2<f32>, cx: f32, cy: f32, zm: f32, rot: f32) -> f32 {
    let coords = transformCoords(fragCoord, resolution, cx, cy, zm, rot);
    var zRe = coords[0];
    var zIm = coords[1];
    var i: f32 = 0.0;
    let bail2 = BAILOUT * BAILOUT;

    for (var n: i32 = 0; n < 1000; n = n + 1) {
        if (n >= maxIter) { break; }

        let zRe2 = df64_mul(zRe, zRe);
        let zIm2 = df64_mul(zIm, zIm);
        let zReIm = df64_mul(zRe, zIm);

        zRe = df64_add(df64_sub(zRe2, zIm2), df64_from(c.x));
        zIm = df64_add(df64_mul_f(zReIm, 2.0), df64_from(c.y));

        let zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
        if (zMag2 > bail2) { break; }
        i = i + 1.0;
    }

    if (i >= f32(maxIter)) { return 0.0; }
    let zMag2 = zRe.x * zRe.x + zIm.x * zIm.x;
    let log_zn = log(zMag2) * 0.5;
    let nu = log(log_zn / LOG2) / LOG2;
    return clamp((i + 1.0 - nu) / f32(maxIter), 0.0, 1.0);
}

fn outputNormalMap(fragCoord: vec2<f32>, c: vec2<f32>, maxIter: i32, angle: f32,
                   resolution: vec2<f32>, cx: f32, cy: f32, zm: f32, rot: f32) -> f32 {
    let d0 = iterateSmooth(fragCoord, c, maxIter, resolution, cx, cy, zm, rot);
    let d1 = iterateSmooth(fragCoord + vec2<f32>(1.0, 0.0), c, maxIter, resolution, cx, cy, zm, rot);
    let d2 = iterateSmooth(fragCoord + vec2<f32>(0.0, 1.0), c, maxIter, resolution, cx, cy, zm, rot);

    let normal = normalize(vec3<f32>(d1 - d0, d2 - d0, 0.05));
    let rad = angle * TAU / 360.0;
    let lightDir = normalize(vec3<f32>(cos(rad), sin(rad), 0.7));
    return clamp(max(dot(normal, lightDir), 0.0), 0.0, 1.0);
}

// ============================================================================
// Main
// ============================================================================

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    // Unpack uniforms
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;

    let cReal = uniforms.data[1].x;
    let cImag = uniforms.data[1].y;
    let poi = i32(uniforms.data[1].z);
    let outputMode = i32(uniforms.data[1].w);

    let centerX = uniforms.data[2].x;
    let centerY = uniforms.data[2].y;
    let rotation = uniforms.data[2].z;

    let iterations = i32(uniforms.data[3].x);
    let stripeFreq = uniforms.data[3].y;
    let trapShape = i32(uniforms.data[3].z);
    let lightAngle = uniforms.data[3].w;

    let cPath = i32(uniforms.data[4].x);
    let cSpeed = uniforms.data[4].y;
    let cRadius = uniforms.data[4].z;
    let invertFlag = uniforms.data[4].w;

    let zoomSpeed = uniforms.data[5].x;
    let zoomDepth = uniforms.data[5].y;

    let tileOffset = uniforms.data[6].xy;
    let fullResolution = uniforms.data[6].zw;

    // Resolve c-value
    let c = resolveC(poi, cPath, time, cSpeed, cRadius, cReal, cImag);

    // Zoom: sinusoidal when animated, static pow(10, depth) when not
    var effectiveZoom: f32;
    if (zoomSpeed > 0.0) {
        let phase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        effectiveZoom = pow(10.0, zoomDepth * phase);
    } else {
        effectiveZoom = pow(10.0, zoomDepth);
    }

    // Compute output
    var value: f32;

    if (outputMode == 4) {
        value = outputNormalMap(pos.xy + tileOffset, c, iterations, lightAngle, fullResolution, centerX, centerY, effectiveZoom, rotation);
    } else {
        let coords = transformCoords(pos.xy + tileOffset, fullResolution, centerX, centerY, effectiveZoom, rotation);
        let r = juliaIterate(coords[0], coords[1], c, iterations, stripeFreq, trapShape);

        if (outputMode == 0) {
            value = outputSmoothIteration(r, f32(iterations));
        } else if (outputMode == 1) {
            value = outputDistanceEstimation(r, f32(iterations));
        } else if (outputMode == 2) {
            value = outputStripeAverage(r, f32(iterations));
        } else if (outputMode == 3) {
            value = outputOrbitTrap(r, f32(iterations));
        } else {
            value = outputSmoothIteration(r, f32(iterations));
        }
    }

    // Invert
    if (invertFlag > 0.5) {
        value = 1.0 - value;
    }

    return vec4<f32>(vec3<f32>(value), 1.0);
}
`}},r=`# julia

Julia set explorer with deep zoom, distance estimation, and curated c-value gallery

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| poi | int | doubleSpiral | manual/basilica/dendrite/douadyRabbit/doubleSpiral/dragonCurve/galaxy/lightning/sanMarco/siegel/starfish | Preset c-value |
| cReal | float | -0.123 | -2\u20132 | c real (manual mode) |
| cImag | float | 0.745 | -2\u20132 | c imaginary (manual mode) |
| cPath | int | none | none/bulb/cardioid/circle | Animated c-path |
| cSpeed | float | 0.3 | 0\u20132 | c animation speed |
| cRadius | float | 0.7885 | 0.01\u20131.5 | Circle path radius |
| centerX | float | 0 | -3\u20133 | Center x |
| centerY | float | 0 | -3\u20133 | Center y |
| rotation | float | 0 | -180\u2013180 | Rotation (degrees) |
| outputMode | int | orbitTrap | distance/normalMap/orbitTrap/smoothIteration/stripeAverage | Output algorithm |
| iterations | int | 300 | 50\u20131000 | Max iterations |
| stripeFreq | float | 5 | 0.5\u201320 | Stripe frequency |
| trapShape | int | point | circle/cross/point | Orbit trap shape |
| lightAngle | float | 45 | 0\u2013360 | Normal map light angle |
| invert | boolean | false | - | Invert output |
| zoomSpeed | float | 0 | 0\u20135 | Auto-zoom speed |
| zoomDepth | float | 0 | 0\u201314 | Zoom depth (powers of 10) |

## Usage

\`\`\`
search synth

julia()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[a,n]of Object.entries(o))t.shaders[a]={...n}}t&&r&&(t.help=r);var u="synth/julia",c="synth",m="julia",d=t;export{d as default,u as effectId,m as effectName,r as help,c as namespace};
