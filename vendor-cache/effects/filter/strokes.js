/* filter/strokes */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Strokes",namespace:"filter",func:"strokes",tags:["blur","edges","artist"],description:"Directional brush-mark engine with angled, sprayed, dark, sumi-e, and smudge modes",globals:{mode:{type:"int",default:0,define:"MODE",choices:{angled:0,sprayed:1,dark:2,sumiE:3,smudge:4},ui:{label:"mode",control:"dropdown"}},length:{type:"float",default:40,uniform:"strokeLength",min:0,max:100,ui:{label:"length",control:"slider"}},balance:{type:"float",default:50,uniform:"balance",min:0,max:100,ui:{label:"balance",control:"slider",enabledBy:{param:"mode",in:[0,2]}}},intensity:{type:"float",default:50,uniform:"intensity",min:0,max:100,ui:{label:"intensity",control:"slider",enabledBy:{param:"mode",in:[1,2,3]}}},sharpness:{type:"float",default:30,uniform:"sharpness",min:0,max:100,ui:{label:"sharpness",control:"slider"}}},textures:{_stkTmp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"smear",program:"stkSmear",inputs:{inputTex:"inputTex"},uniforms:{strokeLength:"strokeLength",balance:"balance",intensity:"intensity"},outputs:{fragColor:"_stkTmp"}},{name:"post",program:"stkPost",inputs:{inputTex:"inputTex",smearTex:"_stkTmp"},uniforms:{sharpness:"sharpness"},outputs:{fragColor:"outputTex"}}]});var a={stkPost:{glsl:`/*
 * Strokes - stkPost pass: unsharp-sharpens the smeared result from
 * stkSmear (see glsl/stkSmear.glsl) by \`sharpness\`, using a 3x3 tent blur
 * as the unsharp mask's low-pass reference (same shape as
 * filter/oilPaint's tent3x3 helper, shared by its daubs/knife modes).
 * Alpha passes through from the original source (inputTex), matching
 * every other multi-pass filter in this plan.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D smearTex;
uniform vec2 resolution;
uniform float sharpness;

out vec4 fragColor;

// 3x3 tent blur of the smeared texture - same shape as filter/oilPaint's
// tent3x3 (daubs unsharp / knife soften).
vec3 tent3x3(vec2 uv) {
    vec2 px = 1.0 / resolution;
    vec3 sum = vec3(0.0);
    float wsum = 0.0;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            float w = (dx == 0 ? 2.0 : 1.0) * (dy == 0 ? 2.0 : 1.0);
            sum += texture(smearTex, uv + vec2(float(dx), float(dy)) * px).rgb * w;
            wsum += w;
        }
    }
    return sum / wsum;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec3 c = texture(smearTex, uv).rgb;

    vec3 tent = tent3x3(uv);
    vec3 sharpened = c + (c - tent) * (sharpness / 33.0);

    fragColor = vec4(clamp(sharpened, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Strokes - stkPost pass. See glsl/stkPost.glsl for the full algorithm
 * description; this is a 1:1 port. The tent3x3 kernel uses literal,
 * backend-agnostic integer offsets (same category as filter/oilPaint's
 * tent3x3 / filter/emboss's kernel), so this textually matches the GLSL
 * form with no flip.
 */

struct Uniforms {
    sharpness: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var smearTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn tent3x3(uv: vec2<f32>) -> vec3<f32> {
    let texSize = vec2<f32>(textureDimensions(smearTex));
    let px = 1.0 / texSize;
    var sum = vec3<f32>(0.0);
    var wsum = 0.0;
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            let w = select(1.0, 2.0, dx == 0) * select(1.0, 2.0, dy == 0);
            sum += textureSample(smearTex, inputSampler, uv + vec2<f32>(f32(dx), f32(dy)) * px).rgb * w;
            wsum += w;
        }
    }
    return sum / wsum;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let c = textureSample(smearTex, inputSampler, uv).rgb;

    let tent = tent3x3(uv);
    let sharpened = c + (c - tent) * (uniforms.sharpness / 33.0);

    return vec4<f32>(clamp(sharpened, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`},stkSmear:{glsl:`/*
 * Strokes - stkSmear pass: bounded directional accumulation for angled,
 * sprayed, dark, sumi-e, and smudge brush marks. Every mode samples up
 * to MAX_TAPS taps on each side of uv along a direction dirUnit. Elongated
 * overlapping bristled capsule marks blend their center-sampled pigments
 * continuously, while run-length variation and spray jitter come from
 * coherent fields rather than per-pixel hashes. Exponential decay weights exp(-2i/L) form the directional
 * accumulation. MODE is a compile-time define injected
 * by the runtime (definition.js globals.mode.define), same mechanism as
 * filter/oilPaint and filter/hatch.
 *
 *   angled (0)  - two smear fields (45deg, 135deg) blended by which side
 *                 of \`balance\` the source luminance falls on: light
 *                 tones read the 45deg field, dark tones the 135deg
 *                 field.
 *   sprayed (1) - single 45deg field; each tap gets an extra symmetric 2D
 *                 jitter (smooth value noise) scaled by \`intensity\`, so dabs
 *                 scatter off the stroke line instead of following it
 *                 exactly. Jitter is recentered around zero so the scatter is unbiased in every
 *                 direction, not just skewed toward +x/+y. An uncentered
 *                 hash would bias
 *                 every dab toward one quadrant).
 *   dark (2)    - single 45deg field, then a per-pixel tone crush/lift on
 *                 the SMEARED color: shadows (lum(c) < balance/100)
 *                 darken further via pow(c, 1+intensity/50); highlights
 *                 lift slightly via pow(c, 1/(1+intensity/100)).
 *   sumiE (3)   - evaluates one local 3x3 minimum per output pixel and
 *                 combines it with a 135deg directional smear. The erosion
 *                 dilates dark regions into a wide, soft, wet-ink field without
 *                 multiplying the 3x3 work by every directional tap. A final
 *                 contrast-only pow curve (1+intensity/50, matching
 *                 dark's crush exponent) darkens the result further.
 *   smudge (4)  - direction follows the LOCAL image structure instead of
 *                 a fixed angle: perpendicular to the Sobel gradient luminance
 *                 gradient (falls back to 45deg where the gradient is
 *                 ~0), applied only in shadows (source lum < 0.6, soft
 *                 gate over +-0.05 to avoid a hard seam) so highlights
 *                 stay untouched.
 *
 * Direction vectors are built by rotating the canonical (1,0) axis with
 * rotate2D, exactly like filter/hatch's strokeField/edgeAngle pattern:
 * fixed angles (45/135) and smudge's gradient-derived edgeAngle are both
 * fed through the SAME rotate2D helper. rotate2D's output feeds
 * fragment-coordinate sampling offsets (dirUnit is scaled and added to
 * the sampling position in smear()). Both backends use the same numeric
 * mat2(c,-s,s,c) transform. Each individual field's own tap loop is
 * symmetric (+dir and -dir sampled together). lumGradient's Sobel kernel
 * offsets are backend-agnostic constants (Sobel gradient), so - like filter/hatch's
 * coloredPencil edgeAngle - they textually match between GLSL/WGSL with
 * no flip.
 */

#ifndef MODE
#define MODE 0
#endif

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float strokeLength;
uniform float balance;
uniform float intensity;

out vec4 fragColor;

const int MAX_TAPS = 24;

// hash - hash / jitter.
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float valueNoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0)), u.x), u.y);
}
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// luminance - luminance.
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Sobel gradient - gradient (Sobel on luminance); smudge (MODE 4) only. Backend-
// agnostic constant kernel offsets - textually identical in WGSL, no
// flip (see file header).
vec2 lumGradient(vec2 uv) {
    vec2 px = 1.0 / resolution;
    float tl = lum(texture(inputTex, uv + px * vec2(-1.0,  1.0)).rgb);
    float  l = lum(texture(inputTex, uv + px * vec2(-1.0,  0.0)).rgb);
    float bl = lum(texture(inputTex, uv + px * vec2(-1.0, -1.0)).rgb);
    float tr = lum(texture(inputTex, uv + px * vec2( 1.0,  1.0)).rgb);
    float  r = lum(texture(inputTex, uv + px * vec2( 1.0,  0.0)).rgb);
    float br = lum(texture(inputTex, uv + px * vec2( 1.0, -1.0)).rgb);
    float  t = lum(texture(inputTex, uv + px * vec2( 0.0,  1.0)).rgb);
    float  b = lum(texture(inputTex, uv + px * vec2( 0.0, -1.0)).rgb);
    return vec2(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

// GLSL mat2(c,-s,s,c) rotation for fragment sampling offsets.
vec2 rotate2D(vec2 v, float angleDeg) {
    float a = radians(angleDeg);
    float co = cos(a);
    float si = sin(a);
    return mat2(co, -si, si, co) * v;
}

float strokeVariation(vec2 gc, vec2 dirUnit, float runBase) {
    vec2 across = vec2(-dirUnit.y, dirUnit.x);
    vec2 strokeSpace = vec2(
        dot(gc, dirUnit) / max(runBase, 3.0),
        dot(gc, across) / 3.5
    );
    return 0.72 + 0.56 * valueNoise2(strokeSpace * 0.65);
}

vec4 srcSample(vec2 sampleUV);

vec4 brushStrokeField(vec2 uv, vec2 gc, vec2 dirUnit, float runBase) {
    vec2 across = vec2(-dirUnit.y, dirUnit.x);
    vec2 oriented = vec2(dot(gc, dirUnit), dot(gc, across));
    vec2 spacing = vec2(max(runBase * 0.70, 4.0), 4.5);
    vec2 baseCell = floor(oriented / spacing);
    float field = 0.0;
    vec3 pigmentSum = vec3(0.0);
    float pigmentWeight = 0.0;

    // Evaluate neighboring spawn cells so a mark continues through lattice
    // boundaries. Each candidate is a softly antialiased, slightly rotated
    // capsule with its own coherent length, width, center, and bristle phase.
    for (int cy = -1; cy <= 1; cy++) {
        for (int cx = -1; cx <= 1; cx++) {
            vec2 cell = baseCell + vec2(float(cx), float(cy));
            vec2 jitter = hash22(cell + 17.3) - 0.5;
            vec2 center = (cell + 0.5 + jitter * vec2(0.56, 0.40)) * spacing;
            vec2 delta = oriented - center;
            float angle = (hash12(cell + 29.1) - 0.5) * 0.34;
            float co = cos(angle);
            float si = sin(angle);
            vec2 local = vec2(co * delta.x + si * delta.y,
                              -si * delta.x + co * delta.y);
            float halfLength = runBase * (0.35 + 0.18 * hash12(cell + 43.7));
            float halfWidth = 1.4 + 1.2 * hash12(cell + 71.9);
            float capsule = length(vec2(max(abs(local.x) - halfLength, 0.0), local.y)) - halfWidth;
            // Capsule distance is measured in output pixels. A fixed pixel-space
            // transition avoids derivative spikes when the 3x3 candidate
            // neighborhood advances to the next spawn cell.
            float aa = 1.35;
            float body = 1.0 - smoothstep(-aa, aa, capsule);
            float bristle = 0.78 + 0.22 * (0.5 + 0.5 *
                sin(local.y * 5.2 + hash12(cell + 97.3) * 6.2831853));
            float mark = body * bristle;
            vec2 centerGlobal = dirUnit * center.x + across * center.y;
            vec2 centerUV = uv + (centerGlobal - gc) / resolution;
            pigmentSum += srcSample(centerUV).rgb * mark;
            pigmentWeight += mark;
            field = max(field, mark);
        }
    }
    vec3 pigment = pigmentWeight > 0.0001
        ? pigmentSum / pigmentWeight
        : srcSample(uv).rgb;
    return vec4(pigment, clamp(field, 0.0, 1.0));
}

vec2 sprayJitter(vec2 gc, float tap) {
    vec2 p = gc / 7.0;
    return vec2(
        valueNoise2(p + vec2(tap * 0.73, 7.0)),
        valueNoise2(p + vec2(11.0, tap * 0.79) + 37.1)
    ) - 0.5;
}

vec4 srcSample(vec2 sampleUV) {
#if MODE == 3
    // Sumi-e reads a locally ERODED source, so the directional smear spreads
    // expanded dark ink exactly like the two-pass original (which smeared a
    // precomputed 3x3 min). A 4-neighbour cross min approximates that erosion
    // inline. MODE-gated: every other variant compiles the plain fetch and pays
    // nothing.
    vec2 px = 1.0 / resolution;
    vec4 s = texture(inputTex, sampleUV);
    vec3 e = s.rgb;
    e = min(e, texture(inputTex, sampleUV + vec2(px.x, 0.0)).rgb);
    e = min(e, texture(inputTex, sampleUV - vec2(px.x, 0.0)).rgb);
    e = min(e, texture(inputTex, sampleUV + vec2(0.0, px.y)).rgb);
    e = min(e, texture(inputTex, sampleUV - vec2(0.0, px.y)).rgb);
    return vec4(e, s.a);
#else
    return texture(inputTex, sampleUV);
#endif
}

// Bounded directional accumulation, up to MAX_TAPS taps on each side of
// uv along dirUnit, weights exp(-2i/L). jitterPx > 0 (sprayed, MODE 1
// only) adds symmetric, smoothly varying 2D jitter to the sample position so
// dabs scatter off the stroke line; jitterPx == 0 keeps every other
// mode's tap path a clean, un-jittered comb.
//
// L varies across a coherent stroke field, so \`if (fi > L) break\` makes every
// srcSample() call after the break non-uniform
// control flow across invocations -- harmless in GLSL (no uniformity
// requirement on texture()), so the early exit stays as a plain break
// here. The WGSL port can't do the same with plain textureSample (hard
// validation error, "must only be called from uniform control flow",
// caught by the real-browser harness, not MCP's compile check); it keeps
// this identical break/loop-bound structure but routes every fetch
// through textureSampleLevel (explicit LOD, no uniformity requirement)
// instead, rather than removing the break -- see wgsl/stkSmear.wgsl's
// srcSample/smear comments. Both forms are the same algorithm; only the
// texture-sampling call WGSL needs differs.
vec4 smear(vec2 uv, vec2 gc, vec2 dirUnit, float L, float jitterPx) {
    vec2 px = 1.0 / resolution;
    vec4 sum = srcSample(uv);
    float wsum = 1.0;
    for (int i = 1; i <= MAX_TAPS; i++) {
        float fi = float(i);
        if (fi > L) { break; }
        float w = exp(-2.0 * fi / L);
        vec2 jp = vec2(0.0);
        vec2 jn = vec2(0.0);
        if (jitterPx > 0.0) {
            jp = sprayJitter(gc, fi) * jitterPx;
            jn = sprayJitter(gc + 31.7, -fi) * jitterPx;
        }
        vec2 sampP = uv + (dirUnit * fi) * px + jp * px;
        vec2 sampN = uv - (dirUnit * fi) * px + jn * px;
        sum += (srcSample(sampP) + srcSample(sampN)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec2 gc = gl_FragCoord.xy + tileOffset;

    float runBase = mix(3.0, 50.0, strokeLength / 100.0);

    vec4 outc;

#if MODE == 0
    // Angled Strokes: two diagonal fields, blended by tone side of
    // \`balance\`.
    vec2 dir45 = rotate2D(vec2(1.0, 0.0), 45.0);
    vec2 dir135 = rotate2D(vec2(1.0, 0.0), 135.0);
    float l45 = runBase * strokeVariation(gc, dir45, runBase);
    float l135 = runBase * strokeVariation(gc, dir135, runBase);
    vec4 layer45 = brushStrokeField(uv, gc, dir45, runBase);
    vec4 layer135 = brushStrokeField(uv, gc, dir135, runBase);
    vec4 pigment45 = mix(smear(uv, gc, dir45, l45, 0.0), vec4(layer45.rgb, src.a), 0.72);
    vec4 pigment135 = mix(smear(uv, gc, dir135, l135, 0.0), vec4(layer135.rgb, src.a), 0.72);
    vec4 field45 = mix(src, pigment45, layer45.a);
    vec4 field135 = mix(src, pigment135, layer135.a);
    float b = balance / 100.0;
    float side = smoothstep(b - 0.1, b + 0.1, lum(src.rgb));
    outc = mix(field135, field45, side);
#elif MODE == 1
    // Sprayed Strokes: single 45deg field, per-tap jitter scaled by
    // intensity (see file header for the recentering rationale).
    vec2 dir45 = rotate2D(vec2(1.0, 0.0), 45.0);
    float L = runBase * strokeVariation(gc, dir45, runBase);
    float jitterPx = intensity / 100.0 * 6.0;
    vec4 layer = brushStrokeField(uv, gc, dir45, runBase);
    vec4 pigment = mix(smear(uv, gc, dir45, L, jitterPx), vec4(layer.rgb, src.a), 0.68);
    outc = mix(src, pigment, layer.a);
#elif MODE == 2
    // Dark Strokes: single 45deg field, then tone-dependent crush/lift.
    vec2 dir45 = rotate2D(vec2(1.0, 0.0), 45.0);
    float L = runBase * strokeVariation(gc, dir45, runBase);
    vec4 layer = brushStrokeField(uv, gc, dir45, runBase);
    vec4 pigment = mix(smear(uv, gc, dir45, L, 0.0), vec4(layer.rgb, src.a), 0.72);
    vec4 c = mix(src, pigment, layer.a);
    float t = lum(c.rgb);
    float bAmt = balance / 100.0;
    float exponent = (t < bAmt) ? (1.0 + intensity / 50.0) : (1.0 / (1.0 + intensity / 100.0));
    c.rgb = pow(max(c.rgb, vec3(0.0)), vec3(exponent));
    outc = c;
#elif MODE == 3
    // Sumi-e: a 135deg directional smear whose dark ink bleeds ALONG the stroke.
    // The ink is a directional erosion -- the darkest source sampled down the
    // same 135deg brush line -- so the darkening follows the stroke and reads as
    // wet ink. (The earlier sharp per-pixel 3x3 min re-imposed the un-smeared
    // source and read as blocky scratches.) A contrast-only curve finishes it.
    vec2 dir135 = rotate2D(vec2(1.0, 0.0), 135.0);
    float L = runBase * strokeVariation(gc, dir135, runBase);
    vec4 layer = brushStrokeField(uv, gc, dir135, runBase);
    vec4 pigment = mix(smear(uv, gc, dir135, L, 0.0), vec4(layer.rgb, src.a), 0.74);
    vec4 c = mix(src, pigment, layer.a);
    c.rgb = pow(max(c.rgb, vec3(0.0)), vec3(1.0 + intensity / 50.0));
    outc = c;
#else
    // Smudge Stick (4) - fallback arm of the #if chain (MODE always
    // 0-4, injected by the runtime, so the last value needs no explicit
    // check). Direction follows local structure instead of a fixed
    // angle; only applied in shadows.
    vec2 grad = lumGradient(uv);
    float gradMag = length(grad);
    float edgeAngle = (gradMag > 1e-5) ? (degrees(atan(grad.y, grad.x)) + 90.0) : 45.0;
    vec2 dir = rotate2D(vec2(1.0, 0.0), edgeAngle);
    float L = runBase * strokeVariation(gc, dir, runBase);
    vec4 layer = brushStrokeField(uv, gc, dir, runBase);
    vec4 pigment = mix(smear(uv, gc, dir, L, 0.0), vec4(layer.rgb, src.a), 0.64);
    vec4 smeared = mix(src, pigment, layer.a);
    float shadowMask = 1.0 - smoothstep(0.55, 0.65, lum(src.rgb));
    outc = mix(src, smeared, shadowMask);
#endif

    fragColor = vec4(clamp(outc.rgb, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Strokes - stkSmear pass. See glsl/stkSmear.glsl for the full per-mode
 * algorithm derivation; this is a 1:1 port.
 * MODE is a compile-time const injected by the runtime via injectDefines
 * (see definition.js globals.mode.define), same mechanism as
 * filter/oilPaint and filter/hatch.
 *
 * Procedural brush coordinates include tileOffset so tiled renders retain
 * the same marks as the corresponding full-frame crop.
 *
 * rotate2D matches GLSL's column-major mat2(c,-s,s,c) multiplication
 * numerically so fixed brush directions keep the same presented slope
 * on both backends. lumGradient's
 * Sobel kernel offsets are backend-agnostic constants (Sobel gradient) - textually
 * identical to the GLSL version, no flip, matching filter/hatch's
 * coloredPencil lumGradient/edgeAngle precedent. See the GLSL file's
 * header for the on-screen-governs note on the two fixed diagonal fields.
 */

struct Uniforms {
    strokeLength: f32,
    balance: f32,
    intensity: f32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const MAX_TAPS: i32 = 24;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise2(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (vec2<f32>(3.0) - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0)), u.x), u.y);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.xyx) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.xx + p3.yz) * p3.zy);
}

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// Sobel gradient - gradient (Sobel on luminance); smudge (MODE 4) only. Backend-
// agnostic constant kernel offsets - textually identical to GLSL, no
// flip (see file header, filter/hatch's lumGradient). Called once per
// pixel outside smear()'s loop (uniform control flow either way), so
// textureSampleLevel isn't required here the way it is below - switched
// anyway for file-wide consistency with the loop-adjacent helpers (same
// non-mipmapped render-target texture, so LOD 0 is numerically identical
// to textureSample's implicit LOD).
fn lumGradient(uv: vec2<f32>) -> vec2<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let px = 1.0 / texSize;
    let tl = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  1.0), 0.0).rgb);
    let l  = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  0.0), 0.0).rgb);
    let bl = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>(-1.0, -1.0), 0.0).rgb);
    let tr = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  1.0), 0.0).rgb);
    let r  = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  0.0), 0.0).rgb);
    let br = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>( 1.0, -1.0), 0.0).rgb);
    let t  = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>( 0.0,  1.0), 0.0).rgb);
    let b  = lum(textureSampleLevel(inputTex, inputSampler, uv + px * vec2<f32>( 0.0, -1.0), 0.0).rgb);
    return vec2<f32>(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                      tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

// Numeric expansion of GLSL mat2(co,-si,si,co) * v.
fn rotate2D(v: vec2<f32>, angleDeg: f32) -> vec2<f32> {
    let a = radians(angleDeg);
    let co = cos(a);
    let si = sin(a);
    return vec2<f32>(co * v.x + si * v.y, -si * v.x + co * v.y);
}

fn strokeVariation(gc: vec2<f32>, dirUnit: vec2<f32>, runBase: f32) -> f32 {
    let across = vec2<f32>(-dirUnit.y, dirUnit.x);
    let strokeSpace = vec2<f32>(
        dot(gc, dirUnit) / max(runBase, 3.0),
        dot(gc, across) / 3.5,
    );
    return 0.72 + 0.56 * valueNoise2(strokeSpace * 0.65);
}

fn brushStrokeField(uv: vec2<f32>, gc: vec2<f32>, dirUnit: vec2<f32>, runBase: f32) -> vec4<f32> {
    let across = vec2<f32>(-dirUnit.y, dirUnit.x);
    let oriented = vec2<f32>(dot(gc, dirUnit), dot(gc, across));
    let spacing = vec2<f32>(max(runBase * 0.70, 4.0), 4.5);
    let baseCell = floor(oriented / spacing);
    var field = 0.0;
    var pigmentSum = vec3<f32>(0.0);
    var pigmentWeight = 0.0;
    for (var cy: i32 = -1; cy <= 1; cy++) {
        for (var cx: i32 = -1; cx <= 1; cx++) {
            let cell = baseCell + vec2<f32>(f32(cx), f32(cy));
            let jitter = hash22(cell + vec2<f32>(17.3)) - vec2<f32>(0.5);
            let center = (cell + vec2<f32>(0.5) + jitter * vec2<f32>(0.56, 0.40)) * spacing;
            let delta = oriented - center;
            let angle = (hash12(cell + vec2<f32>(29.1)) - 0.5) * 0.34;
            let co = cos(angle);
            let si = sin(angle);
            let local = vec2<f32>(co * delta.x + si * delta.y,
                                  -si * delta.x + co * delta.y);
            let halfLength = runBase * (0.35 + 0.18 * hash12(cell + vec2<f32>(43.7)));
            let halfWidth = 1.4 + 1.2 * hash12(cell + vec2<f32>(71.9));
            let capsule = length(vec2<f32>(max(abs(local.x) - halfLength, 0.0), local.y)) - halfWidth;
            // Pixel-space analytic AA remains stable when baseCell changes.
            let aa = 1.35;
            let body = 1.0 - smoothstep(-aa, aa, capsule);
            let bristle = 0.78 + 0.22 * (0.5 + 0.5 *
                sin(local.y * 5.2 + hash12(cell + vec2<f32>(97.3)) * 6.2831853));
            let mark = body * bristle;
            let centerGlobal = dirUnit * center.x + across * center.y;
            let centerUV = uv + (centerGlobal - gc) / vec2<f32>(textureDimensions(inputTex));
            pigmentSum += srcSample(centerUV).rgb * mark;
            pigmentWeight += mark;
            field = max(field, mark);
        }
    }
    var pigment = srcSample(uv).rgb;
    if (pigmentWeight > 0.0001) {
        pigment = pigmentSum / pigmentWeight;
    }
    return vec4<f32>(pigment, clamp(field, 0.0, 1.0));
}

fn sprayJitter(gc: vec2<f32>, tap: f32) -> vec2<f32> {
    let p = gc / 7.0;
    return vec2<f32>(
        valueNoise2(p + vec2<f32>(tap * 0.73, 7.0)),
        valueNoise2(p + vec2<f32>(11.0, tap * 0.79) + vec2<f32>(37.1)),
    ) - vec2<f32>(0.5);
}

fn srcSample(sampleUV: vec2<f32>) -> vec4<f32> {
    if (MODE == 3) {
        // Sumi-e reads a locally ERODED source, so the directional smear spreads
        // expanded dark ink exactly like the two-pass original (which smeared a
        // precomputed 3x3 min). A 4-neighbour cross min approximates that erosion
        // inline. Matches glsl/stkSmear.glsl; MODE-gated so other variants pay
        // nothing.
        let px = 1.0 / vec2<f32>(textureDimensions(inputTex));
        let s = textureSampleLevel(inputTex, inputSampler, sampleUV, 0.0);
        var e = s.rgb;
        e = min(e, textureSampleLevel(inputTex, inputSampler, sampleUV + vec2<f32>(px.x, 0.0), 0.0).rgb);
        e = min(e, textureSampleLevel(inputTex, inputSampler, sampleUV - vec2<f32>(px.x, 0.0), 0.0).rgb);
        e = min(e, textureSampleLevel(inputTex, inputSampler, sampleUV + vec2<f32>(0.0, px.y), 0.0).rgb);
        e = min(e, textureSampleLevel(inputTex, inputSampler, sampleUV - vec2<f32>(0.0, px.y), 0.0).rgb);
        return vec4<f32>(e, s.a);
    }
    return textureSampleLevel(inputTex, inputSampler, sampleUV, 0.0);
}

// Bounded directional accumulation - see glsl/stkSmear.glsl's smear() for
// the full algorithm description.
//
// L varies across a coherent stroke field, so a data-dependent \`if (fi > L) {
// break; }\` makes every srcSample() call reached after the
// break non-uniform control flow. That's fine for textureSampleLevel
// (explicit LOD, no derivatives/uniformity requirement) but a hard
// rejection for plain textureSample ("must only be called from uniform
// control flow" -- caught by the real-browser harness; MCP's compile
// check does not enforce this). Fix: every srcSample()-routed fetch below
// uses textureSampleLevel, so the break is legal and taps past L are never
// sampled --
// restores the original early-exit cost profile instead of paying for
// MAX_TAPS iterations on every pixel regardless of L. Numerically a
// no-op vs. always running the full loop and multiplicatively zeroing
// out-of-range taps (w == 0 either contributes nothing or isn't computed
// at all -- same sum, same wsum, bit-for-bit), so this is a pure
// performance fix, not a behavior change. Applied identically in the
// GLSL file (which never needed the mask -- GLSL has no uniform-control-
// flow requirement on texture()).
fn smear(uv: vec2<f32>, gc: vec2<f32>, dirUnit: vec2<f32>, L: f32, jitterPx: f32) -> vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let px = 1.0 / texSize;
    var sum = srcSample(uv);
    var wsum = 1.0;
    for (var i: i32 = 1; i <= MAX_TAPS; i++) {
        let fi = f32(i);
        if (fi > L) { break; }
        let w = exp(-2.0 * fi / L);
        var jp = vec2<f32>(0.0);
        var jn = vec2<f32>(0.0);
        if (jitterPx > 0.0) {
            jp = sprayJitter(gc, fi) * jitterPx;
            jn = sprayJitter(gc + vec2<f32>(31.7), -fi) * jitterPx;
        }
        let sampP = uv + (dirUnit * fi) * px + jp * px;
        let sampN = uv - (dirUnit * fi) * px + jn * px;
        sum += (srcSample(sampP) + srcSample(sampN)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}

// Per-mode dispatch - mirrors filter/hatch's hatchColor / filter/oilPaint's
// modeColor structure (sequential if (MODE == N) checks, last mode as the
// unconditional fallback).
fn smearColor(uv: vec2<f32>, gc: vec2<f32>, src: vec4<f32>, runBase: f32) -> vec4<f32> {
    if (MODE == 0) {
        // Angled Strokes.
        let dir45 = rotate2D(vec2<f32>(1.0, 0.0), 45.0);
        let dir135 = rotate2D(vec2<f32>(1.0, 0.0), 135.0);
        let l45 = runBase * strokeVariation(gc, dir45, runBase);
        let l135 = runBase * strokeVariation(gc, dir135, runBase);
        let layer45 = brushStrokeField(uv, gc, dir45, runBase);
        let layer135 = brushStrokeField(uv, gc, dir135, runBase);
        let pigment45 = mix(smear(uv, gc, dir45, l45, 0.0), vec4<f32>(layer45.rgb, src.a), 0.72);
        let pigment135 = mix(smear(uv, gc, dir135, l135, 0.0), vec4<f32>(layer135.rgb, src.a), 0.72);
        let field45 = mix(src, pigment45, layer45.a);
        let field135 = mix(src, pigment135, layer135.a);
        let b = uniforms.balance / 100.0;
        let side = smoothstep(b - 0.1, b + 0.1, lum(src.rgb));
        return mix(field135, field45, side);
    }
    if (MODE == 1) {
        // Sprayed Strokes.
        let dir45 = rotate2D(vec2<f32>(1.0, 0.0), 45.0);
        let L = runBase * strokeVariation(gc, dir45, runBase);
        let jitterPx = uniforms.intensity / 100.0 * 6.0;
        let layer = brushStrokeField(uv, gc, dir45, runBase);
        let pigment = mix(smear(uv, gc, dir45, L, jitterPx), vec4<f32>(layer.rgb, src.a), 0.68);
        return mix(src, pigment, layer.a);
    }
    if (MODE == 2) {
        // Dark Strokes.
        let dir45 = rotate2D(vec2<f32>(1.0, 0.0), 45.0);
        let L = runBase * strokeVariation(gc, dir45, runBase);
        let layer = brushStrokeField(uv, gc, dir45, runBase);
        let pigment = mix(smear(uv, gc, dir45, L, 0.0), vec4<f32>(layer.rgb, src.a), 0.72);
        let c = mix(src, pigment, layer.a);
        let t = lum(c.rgb);
        let bAmt = uniforms.balance / 100.0;
        let exponent = select(1.0 / (1.0 + uniforms.intensity / 100.0), 1.0 + uniforms.intensity / 50.0, t < bAmt);
        return vec4<f32>(pow(max(c.rgb, vec3<f32>(0.0)), vec3<f32>(exponent)), c.a);
    }
    if (MODE == 3) {
        // Sumi-e: srcSample() returns a locally eroded source (see above), so
        // this 135deg directional smear spreads expanded dark ink along the
        // brush -- the wet-ink look of the two-pass original, in one pass.
        // Matches glsl/stkSmear.glsl. A contrast-only curve finishes it.
        let dir135 = rotate2D(vec2<f32>(1.0, 0.0), 135.0);
        let L = runBase * strokeVariation(gc, dir135, runBase);
        let layer = brushStrokeField(uv, gc, dir135, runBase);
        let pigment = mix(smear(uv, gc, dir135, L, 0.0), vec4<f32>(layer.rgb, src.a), 0.74);
        let c = mix(src, pigment, layer.a);
        return vec4<f32>(pow(max(c.rgb, vec3<f32>(0.0)), vec3<f32>(1.0 + uniforms.intensity / 50.0)), c.a);
    }
    // Smudge Stick (4) - fallback arm (MODE always 0-4, injected by the
    // runtime, so the last value needs no explicit check).
    let grad = lumGradient(uv);
    let gradMag = length(grad);
    let edgeAngle = select(45.0, degrees(atan2(grad.y, grad.x)) + 90.0, gradMag > 1e-5);
    let dir = rotate2D(vec2<f32>(1.0, 0.0), edgeAngle);
    let L = runBase * strokeVariation(gc, dir, runBase);
    let layer = brushStrokeField(uv, gc, dir, runBase);
    let pigment = mix(smear(uv, gc, dir, L, 0.0), vec4<f32>(layer.rgb, src.a), 0.64);
    let smeared = mix(src, pigment, layer.a);
    let shadowMask = 1.0 - smoothstep(0.55, 0.65, lum(src.rgb));
    return mix(src, smeared, shadowMask);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let gc = pos.xy + uniforms.tileOffset;

    let runBase = mix(3.0, 50.0, uniforms.strokeLength / 100.0);
    let outc = smearColor(uv, gc, src, runBase);

    return vec4<f32>(clamp(outc.rgb, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},i=`# strokes

Directional brush-mark engine with angled, sprayed, dark, sumi-e, and smudge modes.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | angled | angled/sprayed/dark/sumiE/smudge | Stroke style |
| length | float | 40 | 0-100 | Coherent brush-mark length (3-50px base) |
| balance | float | 50 | 0-100 | Angled tone split or Dark shadow split; inactive in other modes |
| intensity | float | 50 | 0-100 | Spray radius, Dark crush, or Sumi-e pressure; inactive in Angled and Smudge |
| sharpness | float | 30 | 0-100 | Post-smear unsharp strength |

## Modes

- **angled** (default) -- two fields of coherent diagonal pigment stamps (45deg and 135deg); light tones read one direction and dark tones the other, split at \`balance\`.
- **sprayed** -- single 45deg smear field with each tap scattered by a random 2D jitter scaled by \`intensity\`, so strokes read as a spray of dabs instead of a clean line.
- **dark** -- single 45deg smear field, then a tone-dependent contrast curve: shadows below \`balance\` crush further (darken), highlights above lift slightly, both scaled by \`intensity\`.
- **sumiE** -- a conditional preparation pass applies one 3x3 minimum filter per pixel; the directional pass then accumulates that prepared ink surface at 135deg and darkens it with an \`intensity\`-scaled contrast curve.
- **smudge** -- direction follows the local image structure (perpendicular to the luminance gradient, falling back to 45deg where the gradient is flat) instead of a fixed angle, and only smudges shadows (source luminance below 0.6); highlights stay untouched.

## Notes

- Marks are overlapping, softly antialiased bristled capsules. Each mark carries pigment sampled at its center and blends continuously with neighboring marks, so no rectangular cell owns an output pixel. Run length and spray jitter vary coherently across the stroke field rather than independently per pixel.
- Two-pass effect: \`stkSmear\` computes the directional marks (up to 24 taps per side, per field) into \`_stkTmp\`; \`stkPost\` sharpens that result and restores source alpha.
- \`mode\` is a compile-time selector (like \`filter/oilPaint\`'s \`mode\` and \`filter/hatch\`'s \`mode\`): each value compiles as its own shader variant.
- The widest path is Angled mode: two directional fields of up to 49 accumulation reads plus nine neighboring capsule candidates per field. Sumi-e adds one 3x3 preparation pass, then one directional field; it does not repeat the erosion kernel for every directional tap.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .strokes()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(a))n.shaders[r]={...e}}n&&i&&(n.help=i);var u="filter/strokes",d="filter",p="strokes",m=n;export{m as default,u as effectId,p as effectName,i as help,d as namespace};
