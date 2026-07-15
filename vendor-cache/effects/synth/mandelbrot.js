/* synth/mandelbrot */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Mandelbrot",namespace:"synth",func:"mandelbrot",tags:["fractal"],description:"Mandelbrot explorer with deep zoom",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},poi:{slot:1,components:"x"},outputMode:{slot:1,components:"y"},iterations:{slot:1,components:"z"},centerHiX:{slot:2,components:"x"},centerHiY:{slot:2,components:"y"},centerLoX:{slot:2,components:"z"},centerLoY:{slot:2,components:"w"},zoomSpeed:{slot:3,components:"x"},zoomDepth:{slot:3,components:"y"},invert:{slot:3,components:"z"},stripeFreq:{slot:3,components:"w"},trapShape:{slot:4,components:"x"},lightAngle:{slot:4,components:"y"},rotation:{slot:4,components:"z"}},globals:{poi:{type:"int",default:0,uniform:"poi",choices:{manual:0,birdOfParadise:6,doubleSpiral:8,elephantValley:2,feigenbaum:5,miniBrot:4,scepterValley:3,seahorseValley:1,spiralGalaxy:7},ui:{label:"preset",control:"dropdown",category:"fractal"}},outputMode:{type:"int",default:0,uniform:"outputMode",choices:{distance:1,normalMap:4,orbitTrap:3,smoothIteration:0,stripeAverage:2},ui:{label:"output mode",control:"dropdown",category:"fractal"}},iterations:{type:"int",default:500,uniform:"iterations",min:50,max:2e3,ui:{label:"iterations",control:"slider",category:"fractal"}},centerX:{type:"float",default:-.5,uniform:"centerHiX",min:-3,max:3,step:.001,randChance:0,ui:{label:"center x",control:"slider",category:"navigation",enabledBy:{param:"poi",eq:0}}},centerY:{type:"float",default:0,uniform:"centerHiY",min:-3,max:3,step:.001,randChance:0,ui:{label:"center y",control:"slider",category:"navigation",enabledBy:{param:"poi",eq:0}}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider",category:"navigation",enabledBy:{param:"poi",eq:0}}},zoomSpeed:{type:"float",default:0,uniform:"zoomSpeed",min:0,max:5,step:.01,zero:0,randChance:0,ui:{label:"zoom speed",control:"slider",category:"animation"}},zoomDepth:{type:"float",default:0,uniform:"zoomDepth",min:0,max:14,step:.001,randChance:0,ui:{label:"zoom depth",control:"slider",category:"animation"}},stripeFreq:{type:"float",default:5,uniform:"stripeFreq",min:.5,max:20,ui:{label:"stripe frequency",control:"slider",category:"output",enabledBy:{param:"outputMode",eq:2}}},trapShape:{type:"int",default:0,uniform:"trapShape",choices:{circle:2,cross:1,point:0},ui:{label:"trap shape",control:"dropdown",category:"output",enabledBy:{param:"outputMode",eq:3}}},lightAngle:{type:"float",default:45,uniform:"lightAngle",min:0,max:360,ui:{label:"light angle",control:"slider",category:"output",enabledBy:{param:"outputMode",eq:4}}},invert:{type:"boolean",default:!1,uniform:"invert",ui:{label:"invert",control:"checkbox",category:"output"}}},openCategories:["fractal","animation"],paramAliases:{poiMode:"poi"},passes:[{name:"render",program:"mandelbrot",inputs:{},outputs:{fragColor:"outputTex"}}]});var r={mandelbrot:{glsl:`/*
 * synth/mandelbrot \u2014 State-of-the-art Mandelbrot explorer
 *
 * Features:
 * - Double-float (df64) emulation for deep zoom (~10^14)
 * - Five output algorithms: smooth iteration, distance estimation,
 *   stripe average, orbit trap, normal map
 * - Curated POI zoom paths driven by engine time
 * - Cardioid + period-2 bulb early-out optimization
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;

uniform int poi;
uniform int outputMode;
uniform int iterations;
uniform float centerHiX;
uniform float centerHiY;
uniform float centerLoX;
uniform float centerLoY;

uniform float zoomSpeed;
uniform float zoomDepth;
uniform float invert;
uniform float stripeFreq;
uniform int trapShape;
uniform float lightAngle;
uniform float rotation;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float BAILOUT = 256.0;  // Large bailout for smooth coloring
const float LOG2 = 0.6931471805599453;
const int MAX_ITER = 500;

// ============================================================================
// Double-float (df64) arithmetic
// Two float32s (hi, lo) represent hi + lo with ~15 digits of precision.
// Based on Dekker/Knuth error-free transformations.
// ============================================================================

// Quick two-sum: a + b = s + e, assumes |a| >= |b|
vec2 df64_quick_two_sum(float a, float b) {
    float s = a + b;
    float e = b - (s - a);
    return vec2(s, e);
}

// Two-sum: a + b = s + e (no magnitude assumption)
vec2 df64_two_sum(float a, float b) {
    float s = a + b;
    float v = s - a;
    float e = (a - (s - v)) + (b - v);
    return vec2(s, e);
}

// Two-product: a * b = p + e using Dekker's split
// Splits each operand into high/low 12-bit halves for error-free product.
vec2 df64_two_prod(float a, float b) {
    float p = a * b;
    float ca = 4097.0 * a;
    float ah = ca - (ca - a);
    float al = a - ah;
    float cb = 4097.0 * b;
    float bh = cb - (cb - b);
    float bl = b - bh;
    float e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
    return vec2(p, e);
}

// df64 + df64
vec2 df64_add(vec2 a, vec2 b) {
    vec2 s = df64_two_sum(a.x, b.x);
    s.y += a.y + b.y;
    return df64_quick_two_sum(s.x, s.y);
}

// df64 - df64
vec2 df64_sub(vec2 a, vec2 b) {
    return df64_add(a, vec2(-b.x, -b.y));
}

// df64 * df64
vec2 df64_mul(vec2 a, vec2 b) {
    vec2 p = df64_two_prod(a.x, b.x);
    p.y += a.x * b.y + a.y * b.x;
    return df64_quick_two_sum(p.x, p.y);
}

// df64 * float
vec2 df64_mul_f(vec2 a, float b) {
    vec2 p = df64_two_prod(a.x, b);
    p.y += a.y * b;
    return df64_quick_two_sum(p.x, p.y);
}

// float -> df64
vec2 df64_from(float a) {
    return vec2(a, 0.0);
}

// df64 -> float (lossy)
float df64_to_float(vec2 a) {
    return a.x + a.y;
}

// ============================================================================
// Points of Interest \u2014 encoded as shader constants
// Each POI: vec4(centerX_hi, centerX_lo, centerY_hi, centerY_lo)
// ============================================================================

// POI max zoom depths (log10 scale, based on coordinate precision)
float getPoiMaxZoom(int index) {
    if (index == 2 || index == 7) return 7.0;  // 5-8 digit coords
    if (index == 8) return 10.0;                // 10 digit coords
    return 14.0;                                // full df64 precision
}

void getPOI(int index, out vec2 cX_df, out vec2 cY_df) {
    // POI coordinates as df64 pairs (hi, lo) \u2014 verified from authoritative sources
    if (index == 1) {      // seahorseValley \u2014 MROB embedded Julia nucleus (18 digits)
        cX_df = vec2(-0.7445398569107056, -3.4452027897e-9);
        cY_df = vec2( 0.12172377109527588, 2.7991489404e-9);
    } else if (index == 2) { // elephantValley \u2014 MROB (5 digits)
        cX_df = vec2( 0.29833000898361206, -8.9836120765e-9);
        cY_df = vec2( 0.0011099999537691474, 4.6230852696e-11);
    } else if (index == 3) { // scepterValley \u2014 period-3 nucleus (exact)
        cX_df = vec2(-1.7548776865005493, 2.0253856592e-8);
        cY_df = vec2( 0.0, 0.0);
    } else if (index == 4) { // miniBrot \u2014 fractaljourney verified (16 digits)
        cX_df = vec2(-1.7400623559951782, -2.6584161761e-8);
        cY_df = vec2( 0.028175339102745056, 6.7646594229e-10);
    } else if (index == 5) { // feigenbaum \u2014 Myrberg-Feigenbaum constant
        cX_df = vec2(-1.4011552333831787, 4.4291128098e-8);
        cY_df = vec2( 0.0, 0.0);
    } else if (index == 6) { // birdOfParadise \u2014 superliminal verified (16 digits)
        cX_df = vec2( 0.37500011920928955, 8.5257595428e-10);
        cY_df = vec2(-0.21663938462734222, -3.8103704636e-9);
    } else if (index == 7) { // spiralGalaxy \u2014 MROB seahorse double hook (8 digits)
        cX_df = vec2(-0.7445389032363892, -1.6763610833e-8);
        cY_df = vec2( 0.12172418087720871, -8.7720870845e-10);
    } else if (index == 8) { // doubleSpiral \u2014 MROB seahorse medallion (10 digits)
        cX_df = vec2(-1.2553445100784302, -1.4721569741e-8);
        cY_df = vec2(-0.3822004497051239, -1.3294876089e-8);
    } else {                 // manual \u2014 use uniform values
        cX_df = vec2(centerHiX, centerLoX);  cY_df = vec2(centerHiY, centerLoY);
    }
}

// ============================================================================
// Coordinate transform
// ============================================================================

// df64 transform: returns (re_hi, re_lo, im_hi, im_lo)
void transformCoords_df64(vec2 fragCoord, vec2 cX_df, vec2 cY_df, float z, float rot,
                          out vec2 re_df, out vec2 im_df) {
    vec2 uv = (fragCoord - 0.5 * fullResolution) / min(fullResolution.x, fullResolution.y);

    float angle = -rot * TAU / 360.0;
    float c = cos(angle);
    float s = sin(angle);
    uv = mat2(c, -s, s, c) * uv;

    float scale = 2.5 / z;
    re_df = df64_add(df64_from(uv.x * scale), cX_df);
    im_df = df64_add(df64_from(uv.y * scale), cY_df);
}

// ============================================================================
// Cardioid and period-2 bulb tests
// ============================================================================

bool inCardioid(float x, float y) {
    float y2 = y * y;
    float q = (x - 0.25) * (x - 0.25) + y2;
    return q * (q + (x - 0.25)) <= 0.25 * y2;
}

bool inPeriod2Bulb(float x, float y) {
    float xp1 = x + 1.0;
    return xp1 * xp1 + y * y <= 0.0625;
}

// ============================================================================
// Orbit trap distance functions
// ============================================================================

float trapDistance(vec2 z, int shape) {
    if (shape == 0) {
        // Point trap (origin)
        return length(z);
    } else if (shape == 1) {
        // Cross trap (axes)
        return min(abs(z.x), abs(z.y));
    } else {
        // Circle trap (unit circle)
        return abs(length(z) - 1.0);
    }
}

// ============================================================================
// Core Mandelbrot iteration \u2014 df64 deep precision
// ============================================================================

void mandelbrot_df64(vec2 c_re, vec2 c_im, int maxIter,
                     out float smoothIter, out float rawIter,
                     out vec2 z_final, out vec2 dz_final,
                     out float stripeAcc, out float trapMin) {
    // Cardioid test using float32 approximation (good enough for early-out)
    float cx = df64_to_float(c_re);
    float cy = df64_to_float(c_im);
    if (inCardioid(cx, cy) || inPeriod2Bulb(cx, cy)) {
        smoothIter = float(maxIter);
        rawIter = float(maxIter);
        z_final = vec2(0.0);
        dz_final = vec2(0.0);
        stripeAcc = 0.0;
        trapMin = 1e20;
        return;
    }

    vec2 zr = vec2(0.0);  // z.real as df64
    vec2 zi = vec2(0.0);  // z.imag as df64
    vec2 dz = vec2(1.0, 0.0);  // derivative (float32 is fine for dz)
    float stripe = 0.0;
    float trap = 1e20;
    float i = 0.0;

    for (int n = 0; n < MAX_ITER; n++) {
        if (n >= maxIter) break;

        // Get float32 approximations for derivative and aux computations
        float zx = df64_to_float(zr);
        float zy = df64_to_float(zi);

        // Derivative (float32): dz = 2*z*dz + 1
        dz = vec2(
            2.0 * (zx * dz.x - zy * dz.y) + 1.0,
            2.0 * (zx * dz.y + zy * dz.x)
        );

        // z = z^2 + c in df64
        vec2 zr2 = df64_mul(zr, zr);       // zr * zr
        vec2 zi2 = df64_mul(zi, zi);       // zi * zi
        vec2 zri = df64_mul(zr, zi);       // zr * zi
        vec2 new_zr = df64_add(df64_sub(zr2, zi2), c_re);  // zr^2 - zi^2 + c_re
        vec2 new_zi = df64_add(df64_mul_f(zri, 2.0), c_im); // 2*zr*zi + c_im
        zr = new_zr;
        zi = new_zi;

        // Bailout using float32 approximation
        float post_zx = df64_to_float(zr);
        float post_zy = df64_to_float(zi);
        float post_mag2 = post_zx * post_zx + post_zy * post_zy;

        // Stripe + trap (float32 aux)
        if (stripeFreq > 0.0) {
            stripe += sin(stripeFreq * atan(post_zy, post_zx));
        }
        trap = min(trap, trapDistance(vec2(post_zx, post_zy), trapShape));

        if (post_mag2 > BAILOUT * BAILOUT) break;
        i += 1.0;
    }

    rawIter = i;
    float fx = df64_to_float(zr);
    float fy = df64_to_float(zi);
    z_final = vec2(fx, fy);
    dz_final = dz;
    stripeAcc = stripe;
    trapMin = trap;

    float mag2 = dot(z_final, z_final);
    if (i < float(maxIter) && mag2 > 1.0) {
        float log_zn = log(mag2) * 0.5;
        float nu = log(log_zn / LOG2) / LOG2;
        smoothIter = i + 1.0 - nu;
    } else {
        smoothIter = i;
    }
}

// ============================================================================
// Output algorithms
// ============================================================================

float outputSmoothIteration(float smoothIter, float rawIter, int maxIter) {
    if (rawIter >= float(maxIter)) return 0.0;
    return smoothIter / float(maxIter);
}

float outputDistance(vec2 z, vec2 dz, float rawIter, int maxIter) {
    if (rawIter >= float(maxIter)) return 0.0;
    float mag = length(z);
    float dmag = length(dz);
    if (dmag == 0.0) return 0.0;
    float dist = 2.0 * mag * log(mag) / dmag;
    // Log-normalize for visual range
    return clamp(sqrt(dist * float(maxIter)) * 0.5, 0.0, 1.0);
}

float outputStripeAverage(float smoothIter, float rawIter, float stripeAcc, int maxIter) {
    if (rawIter >= float(maxIter)) return 0.0;
    float count = max(rawIter, 1.0);
    float avg = stripeAcc / count;
    // Blend with smooth iteration for continuity
    float frac = smoothIter - floor(smoothIter);
    return clamp(0.5 + 0.5 * avg * (1.0 - frac), 0.0, 1.0);
}

float outputOrbitTrap(float trapMin, float rawIter, int maxIter) {
    if (rawIter >= float(maxIter)) return 0.0;
    return clamp(1.0 - trapMin * 0.5, 0.0, 1.0);
}

// ============================================================================
// Normal map (3-sample finite difference)
// ============================================================================

float computeValueAt_df64(vec2 fragCoord, vec2 cX_df, vec2 cY_df, float z_zoom, float rot, int maxIter) {
    vec2 re_df, im_df;
    transformCoords_df64(fragCoord, cX_df, cY_df, z_zoom, rot, re_df, im_df);
    float sI, rI;
    vec2 zf, dzf;
    float sa, tm;
    mandelbrot_df64(re_df, im_df, maxIter, sI, rI, zf, dzf, sa, tm);
    return outputDistance(zf, dzf, rI, maxIter);
}

float outputNormalMap(vec2 fragCoord, vec2 cX_df, vec2 cY_df,
                      float z_zoom, float rot, int maxIter, float angle) {
    float eps = 1.0 / min(fullResolution.x, fullResolution.y);
    float h0 = computeValueAt_df64(fragCoord, cX_df, cY_df, z_zoom, rot, maxIter);
    float hx = computeValueAt_df64(fragCoord + vec2(1.0, 0.0), cX_df, cY_df, z_zoom, rot, maxIter);
    float hy = computeValueAt_df64(fragCoord + vec2(0.0, 1.0), cX_df, cY_df, z_zoom, rot, maxIter);

    // Surface normal from height differences
    vec3 normal = normalize(vec3(h0 - hx, h0 - hy, eps));

    // Light direction from angle
    float rad = angle * TAU / 360.0;
    vec3 lightDir = normalize(vec3(cos(rad), sin(rad), 0.7));

    float diffuse = max(dot(normal, lightDir), 0.0);
    return clamp(diffuse, 0.0, 1.0);
}

// ============================================================================
// Effective zoom (handles POI animation)
// ============================================================================

float getEffectiveZoom(int poiIndex) {
    // Clamp zoom depth to POI coordinate precision
    float maxDepth = (poiIndex > 0) ? getPoiMaxZoom(poiIndex) : 14.0;
    float effDepth = min(zoomDepth, maxDepth);
    if (zoomSpeed > 0.0) {
        // Sinusoidal zoom: t=0 zoomed out, t=0.5/speed max depth, t=1/speed zoomed out
        float zoomPhase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        return pow(10.0, effDepth * zoomPhase);
    }
    return pow(10.0, effDepth);
}

// ============================================================================
// Main
// ============================================================================

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    int maxIter = min(iterations, MAX_ITER);
    float effZoom = getEffectiveZoom(poi);
    float rot = (poi > 0) ? 0.0 : rotation;

    // Resolve center coordinates (POI or manual)
    vec2 cX_df, cY_df;
    getPOI(poi, cX_df, cY_df);

    float value;

    if (outputMode == 4) {
        // Normal map: special case, needs 3 evaluations
        value = outputNormalMap(globalCoord, cX_df, cY_df,
                               effZoom, rot, maxIter, lightAngle);
    } else {
        float smoothI, rawI;
        vec2 z_final, dz_final;
        float stripeAcc, trapMin;

        vec2 re_df, im_df;
        transformCoords_df64(globalCoord, cX_df, cY_df, effZoom, rot, re_df, im_df);
        mandelbrot_df64(re_df, im_df, maxIter, smoothI, rawI, z_final, dz_final, stripeAcc, trapMin);

        if (outputMode == 0) {
            value = outputSmoothIteration(smoothI, rawI, maxIter);
        } else if (outputMode == 1) {
            value = outputDistance(z_final, dz_final, rawI, maxIter);
        } else if (outputMode == 2) {
            value = outputStripeAverage(smoothI, rawI, stripeAcc, maxIter);
        } else if (outputMode == 3) {
            value = outputOrbitTrap(trapMin, rawI, maxIter);
        } else {
            value = outputSmoothIteration(smoothI, rawI, maxIter);
        }
    }

    // Invert
    if (invert > 0.5) {
        value = 1.0 - value;
    }

    fragColor = vec4(vec3(value), 1.0);
}
`,wgsl:`/*
 * synth/mandelbrot \u2014 State-of-the-art Mandelbrot explorer (WGSL)
 *
 * WGSL port of the GLSL implementation. Same algorithms:
 * df64 deep zoom, 5 output modes, POI animated zoom.
 */

struct Uniforms {
    // Slot 0: resolution.xy, time, (unused)
    // Slot 1: poi, outputMode, iterations, (unused)
    // Slot 2: centerHiX, centerHiY, centerLoX, centerLoY
    // Slot 3: zoom, zoomSpeed, zoomDepth, invert
    // Slot 4: stripeFreq, trapShape, lightAngle, rotation
    data: array<vec4<f32>, 5>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const BAILOUT: f32 = 256.0;
const LOG2: f32 = 0.6931471805599453;
const MAX_ITER: i32 = 2048;

// ============================================================================
// df64 arithmetic
// ============================================================================

fn df64_quick_two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let e = b - (s - a);
    return vec2<f32>(s, e);
}

fn df64_two_sum(a: f32, b: f32) -> vec2<f32> {
    let s = a + b;
    let v = s - a;
    let e = (a - (s - v)) + (b - v);
    return vec2<f32>(s, e);
}

// Dekker's split method for error-free product
fn df64_two_prod(a: f32, b: f32) -> vec2<f32> {
    let p = a * b;
    let ca = 4097.0 * a;
    let ah = ca - (ca - a);
    let al = a - ah;
    let cb = 4097.0 * b;
    let bh = cb - (cb - b);
    let bl = b - bh;
    let e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
    return vec2<f32>(p, e);
}

fn df64_add(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    var s = df64_two_sum(a.x, b.x);
    s.y = s.y + a.y + b.y;
    return df64_quick_two_sum(s.x, s.y);
}

fn df64_sub(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return df64_add(a, vec2<f32>(-b.x, -b.y));
}

fn df64_mul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    var p = df64_two_prod(a.x, b.x);
    p.y = p.y + a.x * b.y + a.y * b.x;
    return df64_quick_two_sum(p.x, p.y);
}

fn df64_mul_f(a: vec2<f32>, b: f32) -> vec2<f32> {
    var p = df64_two_prod(a.x, b);
    p.y = p.y + a.y * b;
    return df64_quick_two_sum(p.x, p.y);
}

fn df64_from(a: f32) -> vec2<f32> {
    return vec2<f32>(a, 0.0);
}

fn df64_to_float(a: vec2<f32>) -> f32 {
    return a.x + a.y;
}

// ============================================================================
// Points of Interest
// ============================================================================

struct PoiCoords {
    cX: vec2<f32>,
    cY: vec2<f32>,
}

fn getPoiMaxZoom(index: i32) -> f32 {
    if (index == 2 || index == 7) { return 7.0; }   // 5-8 digit coords
    if (index == 8) { return 10.0; }                  // 10 digit coords
    return 14.0;                                       // full df64 precision
}

fn getPOI(index: i32, centerHiX: f32, centerLoX: f32, centerHiY: f32, centerLoY: f32) -> PoiCoords {
    // Verified from authoritative sources (MROB, superliminal, fractaljourney)
    if (index == 1) { // seahorseValley \u2014 MROB embedded Julia nucleus
        return PoiCoords(vec2<f32>(-0.7445398569107056, -3.4452027897e-9),
                         vec2<f32>( 0.12172377109527588, 2.7991489404e-9));
    } else if (index == 2) { // elephantValley \u2014 MROB
        return PoiCoords(vec2<f32>( 0.29833000898361206, -8.9836120765e-9),
                         vec2<f32>( 0.0011099999537691474, 4.6230852696e-11));
    } else if (index == 3) { // scepterValley \u2014 period-3 nucleus
        return PoiCoords(vec2<f32>(-1.7548776865005493, 2.0253856592e-8),
                         vec2<f32>( 0.0, 0.0));
    } else if (index == 4) { // miniBrot \u2014 fractaljourney verified
        return PoiCoords(vec2<f32>(-1.7400623559951782, -2.6584161761e-8),
                         vec2<f32>( 0.028175339102745056, 6.7646594229e-10));
    } else if (index == 5) { // feigenbaum \u2014 Myrberg-Feigenbaum constant
        return PoiCoords(vec2<f32>(-1.4011552333831787, 4.4291128098e-8),
                         vec2<f32>( 0.0, 0.0));
    } else if (index == 6) { // birdOfParadise \u2014 superliminal verified
        return PoiCoords(vec2<f32>( 0.37500011920928955, 8.5257595428e-10),
                         vec2<f32>(-0.21663938462734222, -3.8103704636e-9));
    } else if (index == 7) { // spiralGalaxy \u2014 MROB seahorse double hook
        return PoiCoords(vec2<f32>(-0.7445389032363892, -1.6763610833e-8),
                         vec2<f32>( 0.12172418087720871, -8.7720870845e-10));
    } else if (index == 8) { // doubleSpiral \u2014 MROB seahorse medallion
        return PoiCoords(vec2<f32>(-1.2553445100784302, -1.4721569741e-8),
                         vec2<f32>(-0.3822004497051239, -1.3294876089e-8));
    }
    return PoiCoords(vec2<f32>(centerHiX, centerLoX), vec2<f32>(centerHiY, centerLoY));
}

// ============================================================================
// Coordinate transform
// ============================================================================

struct Df64Pair {
    re: vec2<f32>,
    im: vec2<f32>,
}

fn transformCoords_df64(fragCoord: vec2<f32>, resolution: vec2<f32>,
                        cX_df: vec2<f32>, cY_df: vec2<f32>,
                        z: f32, rot: f32) -> Df64Pair {
    var uv = (fragCoord - 0.5 * resolution) / min(resolution.x, resolution.y);
    let angle = -rot * TAU / 360.0;
    let c = cos(angle);
    let s = sin(angle);
    // Match GLSL mat2(c, -s, s, c) column-major rotation
    uv = vec2<f32>(c * uv.x + s * uv.y, -s * uv.x + c * uv.y);

    let scale = 2.5 / z;
    let re = df64_add(df64_from(uv.x * scale), cX_df);
    let im = df64_add(df64_from(uv.y * scale), cY_df);
    return Df64Pair(re, im);
}

// ============================================================================
// Early-out tests
// ============================================================================

fn inCardioid(x: f32, y: f32) -> bool {
    let y2 = y * y;
    let q = (x - 0.25) * (x - 0.25) + y2;
    return q * (q + (x - 0.25)) <= 0.25 * y2;
}

fn inPeriod2Bulb(x: f32, y: f32) -> bool {
    let xp1 = x + 1.0;
    return xp1 * xp1 + y * y <= 0.0625;
}

// ============================================================================
// Orbit trap
// ============================================================================

fn trapDistance(z: vec2<f32>, shape: i32) -> f32 {
    if (shape == 0) {
        return length(z);
    } else if (shape == 1) {
        return min(abs(z.x), abs(z.y));
    } else {
        return abs(length(z) - 1.0);
    }
}

// ============================================================================
// Iteration result
// ============================================================================

struct IterResult {
    smoothIter: f32,
    rawIter: f32,
    z_final: vec2<f32>,
    dz_final: vec2<f32>,
    stripeAcc: f32,
    trapMin: f32,
}

// ============================================================================
// df64 iteration \u2014 deep precision
// ============================================================================

fn mandelbrot_df64(c_re: vec2<f32>, c_im: vec2<f32>, maxIter: i32,
                   sFreq: f32, tShape: i32) -> IterResult {
    let cx = df64_to_float(c_re);
    let cy = df64_to_float(c_im);
    if (inCardioid(cx, cy) || inPeriod2Bulb(cx, cy)) {
        return IterResult(f32(maxIter), f32(maxIter), vec2<f32>(0.0), vec2<f32>(0.0), 0.0, 1e20);
    }

    var zr = vec2<f32>(0.0, 0.0);
    var zi = vec2<f32>(0.0, 0.0);
    var dz = vec2<f32>(1.0, 0.0);
    var stripe: f32 = 0.0;
    var trap: f32 = 1e20;
    var i: f32 = 0.0;

    for (var n: i32 = 0; n < MAX_ITER; n = n + 1) {
        if (n >= maxIter) { break; }

        let zx = df64_to_float(zr);
        let zy = df64_to_float(zi);

        dz = vec2<f32>(
            2.0 * (zx * dz.x - zy * dz.y) + 1.0,
            2.0 * (zx * dz.y + zy * dz.x)
        );

        let zr2 = df64_mul(zr, zr);
        let zi2 = df64_mul(zi, zi);
        let zri = df64_mul(zr, zi);
        let new_zr = df64_add(df64_sub(zr2, zi2), c_re);
        let new_zi = df64_add(df64_mul_f(zri, 2.0), c_im);
        zr = new_zr;
        zi = new_zi;

        let post_zx = df64_to_float(zr);
        let post_zy = df64_to_float(zi);
        let post_mag2 = post_zx * post_zx + post_zy * post_zy;

        if (sFreq > 0.0) {
            stripe = stripe + sin(sFreq * atan2(post_zy, post_zx));
        }
        trap = min(trap, trapDistance(vec2<f32>(post_zx, post_zy), tShape));

        if (post_mag2 > BAILOUT * BAILOUT) { break; }
        i = i + 1.0;
    }

    let fx = df64_to_float(zr);
    let fy = df64_to_float(zi);
    let z_final = vec2<f32>(fx, fy);

    var smoothI = i;
    let mag2 = dot(z_final, z_final);
    if (i < f32(maxIter) && mag2 > 1.0) {
        let log_zn = log(mag2) * 0.5;
        let nu = log(log_zn / LOG2) / LOG2;
        smoothI = i + 1.0 - nu;
    }

    return IterResult(smoothI, i, z_final, dz, stripe, trap);
}

// ============================================================================
// Output algorithms
// ============================================================================

fn outputSmoothIteration(smoothI: f32, rawI: f32, maxIter: i32) -> f32 {
    if (rawI >= f32(maxIter)) { return 0.0; }
    return smoothI / f32(maxIter);
}

fn outputDistance(z: vec2<f32>, dz: vec2<f32>, rawI: f32, maxIter: i32) -> f32 {
    if (rawI >= f32(maxIter)) { return 0.0; }
    let mag = length(z);
    let dmag = length(dz);
    if (dmag == 0.0) { return 0.0; }
    let dist = 2.0 * mag * log(mag) / dmag;
    return clamp(sqrt(dist * f32(maxIter)) * 0.5, 0.0, 1.0);
}

fn outputStripeAverage(smoothI: f32, rawI: f32, stripeAcc: f32, maxIter: i32) -> f32 {
    if (rawI >= f32(maxIter)) { return 0.0; }
    let count = max(rawI, 1.0);
    let avg = stripeAcc / count;
    let frac = smoothI - floor(smoothI);
    return clamp(0.5 + 0.5 * avg * (1.0 - frac), 0.0, 1.0);
}

fn outputOrbitTrap(trapMin: f32, rawI: f32, maxIter: i32) -> f32 {
    if (rawI >= f32(maxIter)) { return 0.0; }
    return clamp(1.0 - trapMin * 0.5, 0.0, 1.0);
}

// ============================================================================
// Normal map helpers
// ============================================================================

fn computeDistAt_df64(fragCoord: vec2<f32>, resolution: vec2<f32>,
                      cX_df: vec2<f32>, cY_df: vec2<f32>, z_zoom: f32, rot: f32,
                      maxIter: i32, sFreq: f32, tShape: i32) -> f32 {
    let coords = transformCoords_df64(fragCoord, resolution, cX_df, cY_df, z_zoom, rot);
    let r = mandelbrot_df64(coords.re, coords.im, maxIter, sFreq, tShape);
    return outputDistance(r.z_final, r.dz_final, r.rawIter, maxIter);
}

fn outputNormalMap(fragCoord: vec2<f32>, resolution: vec2<f32>,
                   cX_df: vec2<f32>, cY_df: vec2<f32>,
                   z_zoom: f32, rot: f32, maxIter: i32, angle: f32,
                   sFreq: f32, tShape: i32) -> f32 {
    let eps = 1.0 / min(resolution.x, resolution.y);
    let h0 = computeDistAt_df64(fragCoord, resolution, cX_df, cY_df, z_zoom, rot, maxIter, sFreq, tShape);
    let hx = computeDistAt_df64(fragCoord + vec2<f32>(1.0, 0.0), resolution, cX_df, cY_df, z_zoom, rot, maxIter, sFreq, tShape);
    let hy = computeDistAt_df64(fragCoord + vec2<f32>(0.0, 1.0), resolution, cX_df, cY_df, z_zoom, rot, maxIter, sFreq, tShape);

    let normal = normalize(vec3<f32>(h0 - hx, h0 - hy, eps));
    let rad = angle * TAU / 360.0;
    let lightDir = normalize(vec3<f32>(cos(rad), sin(rad), 0.7));
    return clamp(dot(normal, lightDir), 0.0, 1.0);
}

// ============================================================================
// Main
// ============================================================================

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;

    let poi = i32(uniforms.data[1].x);
    let outputMode = i32(uniforms.data[1].y);
    let iterations = i32(uniforms.data[1].z);

    let centerHiX = uniforms.data[2].x;
    let centerHiY = uniforms.data[2].y;
    let centerLoX = uniforms.data[2].z;
    let centerLoY = uniforms.data[2].w;

    let zoomSpeed = uniforms.data[3].x;
    let zoomDepth = uniforms.data[3].y;
    let invertVal = uniforms.data[3].z;
    let stripeFreq = uniforms.data[3].w;

    let trapShape = i32(uniforms.data[4].x);
    let lightAngle = uniforms.data[4].y;
    let rotation = uniforms.data[4].z;

    let maxIter = min(iterations, MAX_ITER);

    // Clamp zoom depth to POI coordinate precision
    let maxDepth = select(14.0, getPoiMaxZoom(poi), poi > 0);
    let effDepth = min(zoomDepth, maxDepth);
    var effZoom: f32;
    if (zoomSpeed > 0.0) {
        // Sinusoidal zoom: t=0 zoomed out, t=0.5/speed max depth, t=1/speed zoomed out
        let zoomPhase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        effZoom = pow(10.0, effDepth * zoomPhase);
    } else {
        effZoom = pow(10.0, effDepth);
    }

    let rot = select(rotation, 0.0, poi > 0);

    // Resolve POI coordinates
    let poiCoords = getPOI(poi, centerHiX, centerLoX, centerHiY, centerLoY);
    let cX_df = poiCoords.cX;
    let cY_df = poiCoords.cY;

    var value: f32;

    if (outputMode == 4) {
        value = outputNormalMap(pos.xy, resolution, cX_df, cY_df,
                               effZoom, rot, maxIter, lightAngle,
                               stripeFreq, trapShape);
    } else {
        let coords = transformCoords_df64(pos.xy, resolution, cX_df, cY_df, effZoom, rot);
        let r = mandelbrot_df64(coords.re, coords.im, maxIter, stripeFreq, trapShape);

        if (outputMode == 0) {
            value = outputSmoothIteration(r.smoothIter, r.rawIter, maxIter);
        } else if (outputMode == 1) {
            value = outputDistance(r.z_final, r.dz_final, r.rawIter, maxIter);
        } else if (outputMode == 2) {
            value = outputStripeAverage(r.smoothIter, r.rawIter, r.stripeAcc, maxIter);
        } else if (outputMode == 3) {
            value = outputOrbitTrap(r.trapMin, r.rawIter, maxIter);
        } else {
            value = outputSmoothIteration(r.smoothIter, r.rawIter, maxIter);
        }
    }

    if (invertVal > 0.5) {
        value = 1.0 - value;
    }

    return vec4<f32>(vec3<f32>(value), 1.0);
}
`}},a=`# mandelbrot

Mandelbrot set explorer with deep zoom via double-single emulation, distance estimation, and curated points of interest

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| poi | int | manual | manual/birdOfParadise/doubleSpiral/elephantValley/feigenbaum/miniBrot/scepterValley/seahorseValley/spiralGalaxy | Preset location |
| outputMode | int | smoothIteration | distance/normalMap/orbitTrap/smoothIteration/stripeAverage | Output algorithm |
| iterations | int | 500 | 50\u20132000 | Max iterations |
| centerX | float | -0.5 | -3\u20133 | Center x (manual mode) |
| centerY | float | 0 | -3\u20133 | Center y (manual mode) |
| rotation | float | 0 | -180\u2013180 | Rotation (manual mode) |
| zoomSpeed | float | 0 | 0\u20135 | Auto-zoom speed |
| zoomDepth | float | 0 | 0\u201314 | Zoom depth (powers of 10) |
| stripeFreq | float | 5 | 0.5\u201320 | Stripe frequency |
| trapShape | int | point | circle/cross/point | Orbit trap shape |
| lightAngle | float | 45 | 0\u2013360 | Normal map light angle |
| invert | boolean | false | - | Invert output |

## Usage

\`\`\`
search synth

mandelbrot()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(r))e.shaders[o]={...n}}e&&a&&(e.help=a);var d="synth/mandelbrot",c="synth",u="mandelbrot",m=e;export{m as default,d as effectId,u as effectName,a as help,c as namespace};
