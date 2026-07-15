/* synth/newton */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Newton",namespace:"synth",func:"newton",tags:["fractal"],description:"Newton fractal explorer with deep zoom",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},degree:{slot:0,components:"w"},relaxation:{slot:1,components:"x"},iterations:{slot:1,components:"y"},tolerance:{slot:1,components:"z"},poi:{slot:1,components:"w"},centerHiX:{slot:2,components:"x"},centerHiY:{slot:2,components:"y"},centerLoX:{slot:2,components:"z"},centerLoY:{slot:2,components:"w"},zoomSpeed:{slot:3,components:"x"},zoomDepth:{slot:3,components:"y"},degreeSpeed:{slot:3,components:"z"},degreeRange:{slot:3,components:"w"},relaxSpeed:{slot:4,components:"x"},relaxRange:{slot:4,components:"y"},rotation:{slot:4,components:"z"},outputMode:{slot:5,components:"x"},invert:{slot:5,components:"y"},tileOffset:{slot:6,components:"xy"},fullResolution:{slot:6,components:"zw"}},globals:{poi:{type:"int",default:5,uniform:"poi",choices:{manual:0,hexWeb6:5,octoFlower8:6,pentaSpiral5:4,spiralJunction3:2,starCenter5:3,triplePoint3:1},ui:{label:"preset",control:"dropdown",category:"fractal"}},outputMode:{type:"int",default:2,uniform:"outputMode",choices:{blended:2,iteration:0,rootIndex:1},ui:{label:"output mode",control:"dropdown",category:"fractal"}},iterations:{type:"int",default:100,min:10,max:500,randMax:200,uniform:"iterations",ui:{label:"iterations",control:"slider",category:"fractal"}},degree:{type:"int",default:3,min:3,max:8,uniform:"degree",ui:{label:"degree",control:"slider",category:"fractal"}},relaxation:{type:"float",default:1,min:.5,max:2,step:.01,uniform:"relaxation",ui:{label:"relaxation",control:"slider",category:"fractal"}},tolerance:{type:"float",default:.001,min:1e-4,max:.01,step:1e-4,uniform:"tolerance",ui:{label:"tolerance",control:"slider",category:"fractal"}},centerX:{type:"float",default:0,min:-3,max:3,step:.001,randChance:0,uniform:"centerHiX",ui:{label:"center x",control:"slider",category:"navigation"}},centerY:{type:"float",default:0,min:-3,max:3,step:.001,randChance:0,uniform:"centerHiY",ui:{label:"center y",control:"slider",category:"navigation"}},rotation:{type:"float",default:0,min:-180,max:180,step:.1,randChance:0,uniform:"rotation",ui:{label:"rotation",control:"slider",category:"navigation"}},zoomSpeed:{type:"float",default:0,min:0,max:5,step:.01,zero:0,randChance:0,uniform:"zoomSpeed",ui:{label:"zoom speed",control:"slider",category:"animation"}},zoomDepth:{type:"float",default:0,min:0,max:14,step:.001,randChance:0,uniform:"zoomDepth",ui:{label:"zoom depth",control:"slider",category:"animation"}},degreeSpeed:{type:"float",default:0,min:0,max:1,step:.01,randChance:0,uniform:"degreeSpeed",ui:{label:"degree speed",control:"slider",category:"animation"}},degreeRange:{type:"float",default:0,min:0,max:3,step:.01,randChance:0,uniform:"degreeRange",ui:{label:"degree range",control:"slider",category:"animation"}},relaxSpeed:{type:"float",default:0,min:0,max:1,step:.01,randChance:0,uniform:"relaxSpeed",ui:{label:"relax speed",control:"slider",category:"animation"}},relaxRange:{type:"float",default:0,min:0,max:.5,step:.01,randChance:0,uniform:"relaxRange",ui:{label:"relax range",control:"slider",category:"animation"}},invert:{type:"boolean",default:!1,uniform:"invert",ui:{label:"invert",control:"checkbox",category:"output"}}},openCategories:["fractal","animation"],passes:[{name:"render",program:"newton",inputs:{},outputs:{fragColor:"outputTex"}}]});var r={newton:{glsl:`/*
 * Newton fractal explorer
 *
 * Newton-Raphson root finding for z^n - 1 with:
 * - Continuous fractional degree (3.0-8.0)
 * - Real-valued relaxation (Nova generalization)
 * - df64 emulated double-precision for deep zoom (~10^14)
 * - Time-driven animation with golden ratio phase decoherence
 * - Pre-baked points of interest
 * - Three grayscale output modes
 *
 * All iteration runs in df64 complex arithmetic.
 * z^n computed via repeated df64 complex multiplication.
 * Fractional degrees are floored to nearest integer for root finding.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float degree;
uniform float relaxation;
uniform float iterations;
uniform float tolerance;
uniform float poi;
uniform float centerHiX;
uniform float centerHiY;
uniform float centerLoX;
uniform float centerLoY;
uniform float zoomSpeed;
uniform float zoomDepth;
uniform float degreeSpeed;
uniform float degreeRange;
uniform float relaxSpeed;
uniform float relaxRange;
uniform float rotation;
uniform float outputMode;
uniform float invert;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float PHI = 1.6180339887;

// ============================================================================
// df64 emulated double-precision
// Based on Dekker/Knuth error-free transformations.
// Two float32s (hi, lo) represent hi + lo with ~15 digits of precision.
// ============================================================================

vec2 df64_quick_two_sum(float a, float b) {
    float s = a + b;
    float e = b - (s - a);
    return vec2(s, e);
}

vec2 df64_two_sum(float a, float b) {
    float s = a + b;
    float v = s - a;
    float e = (a - (s - v)) + (b - v);
    return vec2(s, e);
}

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

vec2 df64_add(vec2 a, vec2 b) {
    vec2 s = df64_two_sum(a.x, b.x);
    s.y += a.y + b.y;
    return df64_quick_two_sum(s.x, s.y);
}

vec2 df64_sub(vec2 a, vec2 b) {
    return df64_add(a, vec2(-b.x, -b.y));
}

vec2 df64_mul(vec2 a, vec2 b) {
    vec2 p = df64_two_prod(a.x, b.x);
    p.y += a.x * b.y + a.y * b.x;
    return df64_quick_two_sum(p.x, p.y);
}

vec2 df64_mul_f(vec2 a, float b) {
    vec2 p = df64_two_prod(a.x, b);
    p.y += a.y * b;
    return df64_quick_two_sum(p.x, p.y);
}

vec2 df64_from(float a) {
    return vec2(a, 0.0);
}

float df64_to_float(vec2 a) {
    return a.x + a.y;
}

// ============================================================================
// df64 complex multiply: (ar+ai*i) * (br+bi*i)
// ============================================================================

void df64_cmul(vec2 ar, vec2 ai, vec2 br, vec2 bi, out vec2 rr, out vec2 ri) {
    rr = df64_sub(df64_mul(ar, br), df64_mul(ai, bi));
    ri = df64_add(df64_mul(ar, bi), df64_mul(ai, br));
}

// ============================================================================
// df64 coordinate transform
// ============================================================================

void transformCoords_df64(vec2 fragCoord, vec2 cX_df, vec2 cY_df, float z_zoom,
                          float rot, out vec2 re_df, out vec2 im_df) {
    vec2 uv = (fragCoord - 0.5 * fullResolution) / min(fullResolution.x, fullResolution.y);
    float angle = -rot * TAU / 360.0;
    float c = cos(angle);
    float s = sin(angle);
    uv = mat2(c, -s, s, c) * uv;
    float scale = 2.5 / z_zoom;
    vec2 uv_re_df = df64_mul_f(df64_from(uv.x), scale);
    vec2 uv_im_df = df64_mul_f(df64_from(uv.y), scale);
    re_df = df64_add(uv_re_df, cX_df);
    im_df = df64_add(uv_im_df, cY_df);
}

// ============================================================================
// Points of interest
// ============================================================================

struct POIData {
    vec4 center;
    float deg;
    float maxZoom;
};

POIData getPOI(int idx) {
    // center = vec4(hiX, hiY, loX, loY), deg, maxZoom
    // Origin POIs: df64 center is exact (0,0), maxZoom=7 (pixel coord precision limit)
    // Non-origin POIs: df64 split provides ~14 digits
    if (idx == 1) return POIData(vec4(0.0, 0.0, 0.0, 0.0), 3.0, 7.0);           // triplePoint3
    if (idx == 2) return POIData(vec4(0.25, 0.4330126941204071, 0.0, 7.7718e-9), 3.0, 14.0); // spiralJunction3 = (0.25, sqrt(3)/4)
    if (idx == 3) return POIData(vec4(0.0, 0.0, 0.0, 0.0), 5.0, 7.0);           // starCenter5
    if (idx == 4) return POIData(vec4(0.6545084714889526, 0.4755282700061798, 2.5699e-8, -1.1859e-8), 5.0, 14.0); // pentaSpiral5
    if (idx == 5) return POIData(vec4(0.0, 0.0, 0.0, 0.0), 6.0, 7.0);           // hexWeb6
    if (idx == 6) return POIData(vec4(0.0, 0.0, 0.0, 0.0), 8.0, 7.0);           // octoFlower8
    return POIData(vec4(0.0), 3.0, 7.0);
}

// ============================================================================
// Main
// ============================================================================

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    int maxIter = int(iterations);
    int poiIdx = int(poi);
    int outMode = int(outputMode);
    bool doInvert = invert > 0.5;

    // --- Effective parameters with animation ---

    float effDegree = degree;
    if (degreeSpeed > 0.0 && degreeRange > 0.0) {
        effDegree += degreeRange * sin(time * degreeSpeed * TAU);
        effDegree = clamp(effDegree, 3.0, 8.0);
    }

    float effRelax = relaxation;
    if (relaxSpeed > 0.0 && relaxRange > 0.0) {
        effRelax += relaxRange * sin(time * relaxSpeed * TAU * PHI);
        effRelax = clamp(effRelax, 0.5, 2.0);
    }

    // --- Center and zoom ---

    vec2 cHi, cLo;
    float effZoomDepth = zoomDepth;

    if (poiIdx > 0) {
        POIData p = getPOI(poiIdx);
        cHi = p.center.xy + vec2(centerHiX, centerHiY);
        cLo = p.center.zw + vec2(centerLoX, centerLoY);
        effDegree = p.deg;
        effZoomDepth = min(zoomDepth, p.maxZoom);
    } else {
        cHi = vec2(centerHiX, centerHiY);
        cLo = vec2(centerLoX, centerLoY);
    }

    // Sinusoidal zoom: time 0 = zoomed out, time 0.5/speed = max depth, time 1/speed = zoomed out
    float zoom;
    if (zoomSpeed > 0.0) {
        float zoomPhase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        zoom = pow(10.0, effZoomDepth * zoomPhase);
    } else {
        zoom = pow(10.0, effZoomDepth);
    }

    // --- df64 coordinate transform ---

    vec2 re_df, im_df;
    transformCoords_df64(globalCoord, vec2(cHi.x, cLo.x), vec2(cHi.y, cLo.y),
                         zoom, rotation, re_df, im_df);

    // --- Compute roots of z^n - 1 ---

    int intDeg = int(floor(effDegree));
    int numRoots = intDeg;
    vec2 roots[8];
    for (int k = 0; k < 8; k++) {
        if (k >= numRoots) break;
        float angle = TAU * float(k) / float(intDeg);
        roots[k] = vec2(cos(angle), sin(angle));
    }

    // --- df64 Newton iteration ---

    float iter = 0.0;
    int convergedRoot = -1;
    float convergeDist = 1.0;
    float bailout = 1e10 * effRelax;

    vec2 zr_df = re_df;
    vec2 zi_df = im_df;

    for (int n = 0; n < 500; n++) {
        if (n >= maxIter) break;

        // Compute z^(intDeg-1) via repeated df64 complex multiplication
        vec2 pwr = df64_from(1.0);
        vec2 pwi = df64_from(0.0);
        for (int j = 0; j < 7; j++) {
            if (j >= intDeg - 1) break;
            vec2 tr, ti;
            df64_cmul(pwr, pwi, zr_df, zi_df, tr, ti);
            pwr = tr;
            pwi = ti;
        }

        // z^intDeg = z^(intDeg-1) * z
        vec2 znr, zni;
        df64_cmul(pwr, pwi, zr_df, zi_df, znr, zni);

        // f(z) = z^n - 1
        vec2 fzr = df64_sub(znr, df64_from(1.0));
        vec2 fzi = zni;

        // f'(z) = n * z^(n-1)
        vec2 fpzr = df64_mul_f(pwr, float(intDeg));
        vec2 fpzi = df64_mul_f(pwi, float(intDeg));

        // Degenerate derivative guard
        float fpzr_f = df64_to_float(fpzr);
        float fpzi_f = df64_to_float(fpzi);
        if (fpzr_f * fpzr_f + fpzi_f * fpzi_f < 1e-20) break;

        // delta = f(z) / f'(z) via df64 complex division
        float denom = fpzr_f * fpzr_f + fpzi_f * fpzi_f;
        float inv_denom = 1.0 / denom;
        vec2 nr = df64_add(df64_mul(fzr, fpzr), df64_mul(fzi, fpzi));
        vec2 ni = df64_sub(df64_mul(fzi, fpzr), df64_mul(fzr, fpzi));
        vec2 dr = df64_mul_f(nr, inv_denom);
        vec2 di = df64_mul_f(ni, inv_denom);

        // z = z - relaxation * delta
        zr_df = df64_sub(zr_df, df64_mul_f(dr, effRelax));
        zi_df = df64_sub(zi_df, df64_mul_f(di, effRelax));

        // Divergence check
        float zx = df64_to_float(zr_df);
        float zy = df64_to_float(zi_df);
        if (zx * zx + zy * zy > bailout) break;

        // Convergence check against roots
        for (int k = 0; k < 8; k++) {
            if (k >= numRoots) break;
            float dx = zx - roots[k].x;
            float dy = zy - roots[k].y;
            float d = sqrt(dx * dx + dy * dy);
            if (d < tolerance) {
                convergedRoot = k;
                convergeDist = d;
                break;
            }
        }
        if (convergedRoot >= 0) break;

        iter += 1.0;
    }

    // --- Smooth iteration count ---

    float smoothIter = iter;
    if (convergedRoot >= 0 && convergeDist > 0.0 && convergeDist < tolerance) {
        smoothIter = iter - log2(log(convergeDist) / log(tolerance));
    }

    // --- Output mapping ---

    float value = 0.0;
    float maxIterF = float(maxIter);
    float numRootsF = float(numRoots);

    if (outMode == 0) {
        value = smoothIter / maxIterF;
    } else if (outMode == 1) {
        if (convergedRoot >= 0) {
            value = float(convergedRoot) / numRootsF;
        }
    } else {
        if (convergedRoot >= 0) {
            value = (float(convergedRoot) + smoothIter / maxIterF) / numRootsF;
        }
    }

    if (doInvert) value = 1.0 - value;

    fragColor = vec4(vec3(value), 1.0);
}
`,wgsl:`/*
 * Newton fractal explorer (WGSL)
 *
 * Newton-Raphson root finding for z^n - 1 with:
 * - Continuous fractional degree (3.0-8.0)
 * - Real-valued relaxation (Nova generalization)
 * - df64 emulated double-precision for deep zoom (~10^14)
 * - Time-driven animation with golden ratio phase decoherence
 * - Pre-baked points of interest
 * - Three grayscale output modes
 *
 * All iteration runs in df64 complex arithmetic.
 * z^n computed via repeated df64 complex multiplication.
 * Fractional degrees are floored to nearest integer for root finding.
 */

struct Uniforms {
    data: array<vec4<f32>, 7>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const PHI: f32 = 1.6180339887;

// ============================================================================
// df64 emulated double-precision
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
// df64 complex multiply
// ============================================================================

struct Df64Complex {
    re: vec2<f32>,
    im: vec2<f32>,
}

fn df64_cmul(a: Df64Complex, b: Df64Complex) -> Df64Complex {
    let rr = df64_sub(df64_mul(a.re, b.re), df64_mul(a.im, b.im));
    let ri = df64_add(df64_mul(a.re, b.im), df64_mul(a.im, b.re));
    return Df64Complex(rr, ri);
}

// ============================================================================
// df64 coordinate transform
// ============================================================================

struct CoordResult {
    re: vec2<f32>,
    im: vec2<f32>,
}

fn transformCoords_df64(fragCoord: vec2<f32>, cX_df: vec2<f32>, cY_df: vec2<f32>,
                        res: vec2<f32>, z_zoom: f32, rot: f32) -> CoordResult {
    var uv = (fragCoord - 0.5 * res) / min(res.x, res.y);
    let angle = -rot * TAU / 360.0;
    let c = cos(angle);
    let s = sin(angle);
    uv = vec2<f32>(c * uv.x + s * uv.y, -s * uv.x + c * uv.y);
    let scale = 2.5 / z_zoom;
    let uv_re_df = df64_mul_f(df64_from(uv.x), scale);
    let uv_im_df = df64_mul_f(df64_from(uv.y), scale);
    let re = df64_add(uv_re_df, cX_df);
    let im = df64_add(uv_im_df, cY_df);
    return CoordResult(re, im);
}

// ============================================================================
// Points of interest
// ============================================================================

struct POIData {
    center: vec4<f32>,
    deg: f32,
    maxZoom: f32,
}

fn getPOI(idx: i32) -> POIData {
    // center = vec4(hiX, hiY, loX, loY), deg, maxZoom
    // Origin POIs: maxZoom=7 (pixel coord precision limit)
    // Non-origin POIs: df64 split provides ~14 digits
    if (idx == 1) { return POIData(vec4<f32>(0.0, 0.0, 0.0, 0.0), 3.0, 7.0); }           // triplePoint3
    if (idx == 2) { return POIData(vec4<f32>(0.25, 0.4330126941204071, 0.0, 7.7718e-9), 3.0, 14.0); } // spiralJunction3
    if (idx == 3) { return POIData(vec4<f32>(0.0, 0.0, 0.0, 0.0), 5.0, 7.0); }           // starCenter5
    if (idx == 4) { return POIData(vec4<f32>(0.6545084714889526, 0.4755282700061798, 2.5699e-8, -1.1859e-8), 5.0, 14.0); } // pentaSpiral5
    if (idx == 5) { return POIData(vec4<f32>(0.0, 0.0, 0.0, 0.0), 6.0, 7.0); }           // hexWeb6
    if (idx == 6) { return POIData(vec4<f32>(0.0, 0.0, 0.0, 0.0), 8.0, 7.0); }           // octoFlower8
    return POIData(vec4<f32>(0.0, 0.0, 0.0, 0.0), 3.0, 7.0);
}

// ============================================================================
// Main
// ============================================================================

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    // Unpack uniforms
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let degree = uniforms.data[0].w;

    let relaxation = uniforms.data[1].x;
    let iterations = uniforms.data[1].y;
    let toleranceU = uniforms.data[1].z;
    let poiU = uniforms.data[1].w;

    let centerHiX = uniforms.data[2].x;
    let centerHiY = uniforms.data[2].y;
    let centerLoX = uniforms.data[2].z;
    let centerLoY = uniforms.data[2].w;

    let zoomSpeed = uniforms.data[3].x;
    let zoomDepthU = uniforms.data[3].y;
    let degreeSpeed = uniforms.data[3].z;
    let degreeRangeU = uniforms.data[3].w;

    let relaxSpeed = uniforms.data[4].x;
    let relaxRangeU = uniforms.data[4].y;
    let rotationU = uniforms.data[4].z;
    let outputMode = uniforms.data[5].x;
    let invertU = uniforms.data[5].y;

    // Tile-aware global coords (mirror glsl/newton.glsl). When not tiling the
    // engine supplies tileOffset=(0,0) and fullResolution=resolution, so the
    // transform below is byte-identical to the previous shader.
    let tileOffset = uniforms.data[6].xy;
    let fullResolution = uniforms.data[6].zw;
    let frRes = select(resolution, fullResolution, fullResolution.x > 0.0);

    let maxIter = i32(iterations);
    let poiIdx = i32(poiU);
    let outMode = i32(outputMode);
    let doInvert = invertU > 0.5;

    // --- Effective parameters with animation ---

    var effDegree = degree;
    if (degreeSpeed > 0.0 && degreeRangeU > 0.0) {
        effDegree = effDegree + degreeRangeU * sin(time * degreeSpeed * TAU);
        effDegree = clamp(effDegree, 3.0, 8.0);
    }

    var effRelax = relaxation;
    if (relaxSpeed > 0.0 && relaxRangeU > 0.0) {
        effRelax = effRelax + relaxRangeU * sin(time * relaxSpeed * TAU * PHI);
        effRelax = clamp(effRelax, 0.5, 2.0);
    }

    // --- Center and zoom ---

    var cHi = vec2<f32>(centerHiX, centerHiY);
    var cLo = vec2<f32>(centerLoX, centerLoY);
    var effZoomDepth = zoomDepthU;

    if (poiIdx > 0) {
        let p = getPOI(poiIdx);
        cHi = p.center.xy + cHi;
        cLo = p.center.zw + cLo;
        effDegree = p.deg;
        effZoomDepth = min(zoomDepthU, p.maxZoom);
    }

    // Sinusoidal zoom: time 0 = zoomed out, time 0.5/speed = max depth, time 1/speed = zoomed out
    var zoom: f32;
    if (zoomSpeed > 0.0) {
        let zoomPhase = 0.5 * (1.0 - cos(time * zoomSpeed * TAU));
        zoom = pow(10.0, effZoomDepth * zoomPhase);
    } else {
        zoom = pow(10.0, effZoomDepth);
    }

    // --- df64 coordinate transform ---

    let coords = transformCoords_df64(pos.xy + tileOffset,
        vec2<f32>(cHi.x, cLo.x), vec2<f32>(cHi.y, cLo.y),
        frRes, zoom, rotationU);

    // --- Compute roots of z^n - 1 ---

    let intDeg = i32(floor(effDegree));
    let numRoots = intDeg;
    var roots: array<vec2<f32>, 8>;
    for (var k: i32 = 0; k < 8; k = k + 1) {
        if (k >= numRoots) { break; }
        let angle = TAU * f32(k) / f32(intDeg);
        roots[k] = vec2<f32>(cos(angle), sin(angle));
    }

    // --- df64 Newton iteration ---

    var iter: f32 = 0.0;
    var convergedRoot: i32 = -1;
    var convergeDist: f32 = 1.0;
    let bailout = 1e10 * effRelax;

    var zr_df = coords.re;
    var zi_df = coords.im;

    for (var n: i32 = 0; n < 500; n = n + 1) {
        if (n >= maxIter) { break; }

        // Compute z^(intDeg-1) via repeated df64 complex multiplication
        var pw = Df64Complex(df64_from(1.0), df64_from(0.0));
        for (var j: i32 = 0; j < 7; j = j + 1) {
            if (j >= intDeg - 1) { break; }
            pw = df64_cmul(pw, Df64Complex(zr_df, zi_df));
        }

        // z^intDeg = z^(intDeg-1) * z
        let zn = df64_cmul(pw, Df64Complex(zr_df, zi_df));

        // f(z) = z^n - 1
        let fzr = df64_sub(zn.re, df64_from(1.0));
        let fzi = zn.im;

        // f'(z) = n * z^(n-1)
        let fpzr = df64_mul_f(pw.re, f32(intDeg));
        let fpzi = df64_mul_f(pw.im, f32(intDeg));

        // Degenerate derivative guard
        let fpzr_f = df64_to_float(fpzr);
        let fpzi_f = df64_to_float(fpzi);
        if (fpzr_f * fpzr_f + fpzi_f * fpzi_f < 1e-20) { break; }

        // delta = f(z) / f'(z) via df64 complex division
        let denom = fpzr_f * fpzr_f + fpzi_f * fpzi_f;
        let inv_denom = 1.0 / denom;
        let nr = df64_add(df64_mul(fzr, fpzr), df64_mul(fzi, fpzi));
        let ni = df64_sub(df64_mul(fzi, fpzr), df64_mul(fzr, fpzi));
        let dr = df64_mul_f(nr, inv_denom);
        let di = df64_mul_f(ni, inv_denom);

        // z = z - relaxation * delta
        zr_df = df64_sub(zr_df, df64_mul_f(dr, effRelax));
        zi_df = df64_sub(zi_df, df64_mul_f(di, effRelax));

        // Divergence check
        let zx = df64_to_float(zr_df);
        let zy = df64_to_float(zi_df);
        if (zx * zx + zy * zy > bailout) { break; }

        // Convergence check
        for (var ck: i32 = 0; ck < 8; ck = ck + 1) {
            if (ck >= numRoots) { break; }
            let dx = zx - roots[ck].x;
            let dy = zy - roots[ck].y;
            let d = sqrt(dx * dx + dy * dy);
            if (d < toleranceU) {
                convergedRoot = ck;
                convergeDist = d;
                break;
            }
        }
        if (convergedRoot >= 0) { break; }

        iter = iter + 1.0;
    }

    // --- Smooth iteration count ---

    var smoothIter = iter;
    if (convergedRoot >= 0 && convergeDist > 0.0 && convergeDist < toleranceU) {
        smoothIter = iter - log2(log(convergeDist) / log(toleranceU));
    }

    // --- Output mapping ---

    var value: f32 = 0.0;
    let maxIterF = f32(maxIter);
    let numRootsF = f32(numRoots);

    if (outMode == 0) {
        value = smoothIter / maxIterF;
    } else if (outMode == 1) {
        if (convergedRoot >= 0) {
            value = f32(convergedRoot) / numRootsF;
        }
    } else {
        if (convergedRoot >= 0) {
            value = (f32(convergedRoot) + smoothIter / maxIterF) / numRootsF;
        }
    }

    if (doInvert) { value = 1.0 - value; }

    return vec4<f32>(vec3<f32>(value), 1.0);
}
`}},a=`# newton

Newton fractal explorer with deep zoom, variable polynomial degree, relaxation control, and curated points of interest

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| poi | int | hexWeb6 | manual/hexWeb6/octoFlower8/pentaSpiral5/spiralJunction3/starCenter5/triplePoint3 | Preset location |
| outputMode | int | blended | blended/iteration/rootIndex | Output algorithm |
| iterations | int | 100 | 10\u2013500 | Max iterations |
| degree | int | 3 | 3\u20138 | Polynomial degree (manual mode) |
| relaxation | float | 1 | 0.5\u20132 | Newton relaxation factor |
| tolerance | float | 0.001 | 0.0001\u20130.01 | Convergence tolerance |
| centerX | float | 0 | -3\u20133 | Center x (manual mode) |
| centerY | float | 0 | -3\u20133 | Center y (manual mode) |
| zoomSpeed | float | 0 | 0\u20135 | Auto-zoom speed |
| zoomDepth | float | 0 | 0\u201314 | Zoom depth (powers of 10) |
| degreeSpeed | float | 0 | 0\u20131 | Degree animation speed (manual mode) |
| degreeRange | float | 0 | 0\u20133 | Degree animation range (manual mode) |
| relaxSpeed | float | 0 | 0\u20131 | Relaxation animation speed |
| relaxRange | float | 0 | 0\u20130.5 | Relaxation animation range |
| invert | boolean | false | - | Invert output |

## Usage

\`\`\`
search synth

newton()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&a&&(n.help=a);var s="synth/newton",c="synth",m="newton",u=n;export{u as default,s as effectId,m as effectName,a as help,c as namespace};
