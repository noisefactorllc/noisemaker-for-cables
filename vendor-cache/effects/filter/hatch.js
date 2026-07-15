/* filter/hatch */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Hatch",namespace:"filter",func:"hatch",tags:["noise","edges","artist"],description:"Hand-drawn sketch engine covering Graphic Pen, Charcoal, Chalk & Charcoal, Conte Crayon, Crosshatch, and Colored Pencil filters",globals:{mode:{type:"int",default:0,define:"MODE",choices:{pen:0,charcoal:1,chalkCharcoal:2,conte:3,crosshatch:4,coloredPencil:5},ui:{label:"mode",control:"dropdown"}},strokeLength:{type:"float",default:50,uniform:"strokeLength",min:0,max:100,ui:{label:"stroke length",control:"slider"}},direction:{type:"int",default:0,uniform:"direction",choices:{rightDiag:0,horizontal:1,leftDiag:2,vertical:3},ui:{label:"direction",control:"dropdown"}},balance:{type:"float",default:50,uniform:"balance",min:0,max:100,ui:{label:"balance",control:"slider"}},pressure:{type:"float",default:50,uniform:"pressure",min:0,max:100,ui:{label:"pressure",control:"slider"}},inkColor:{type:"color",default:[.1,.1,.1],uniform:"inkColor",ui:{label:"ink color",control:"color",enabledBy:{param:"mode",notIn:[4,5]}}},paperColor:{type:"color",default:[.96,.94,.88],uniform:"paperColor",ui:{label:"paper color",control:"color",enabledBy:{param:"mode",notIn:[4]}}}},passes:[{name:"hatch",program:"hatch",inputs:{inputTex:"inputTex"},uniforms:{strokeLength:"strokeLength",direction:"direction",balance:"balance",pressure:"pressure",inkColor:"inkColor",paperColor:"paperColor"},outputs:{fragColor:"outputTex"}}]});var o={hatch:{glsl:`/*
 * Hatch - single-pass six-mode sketch engine. See definition.js for the
 * full per-mode description and filter mapping. MODE is a
 * compile-time define injected by the runtime (globals.mode.define), same
 * mechanism as filter/oilPaint and filter/texture.
 *
 * Every mode reads the same stroke field, strokeField(gc, angleDeg,
 * stretch) = vnoise(rotate2D(gc, angleDeg) * vec2(1/stretch, 0.9)), on the
 * tile-aware integer GLOBAL pixel coordinate gc (floor(gl_FragCoord) +
 * tileOffset) so the pattern is seamless across CLI render tiles.
 *
 * rotate2D rotates gc, a fragment-position-derived vector, with the
 * mat2(c,-s,s,c) form shared by filter/stipple - no manual Y
 * compensation. Every noise/hash helper below is floor/fract-based (not
 * truncated) for negative inputs, so the negative positions a rotation can
 * produce need no separate floored-mod wrap (same reasoning as filter/
 * stipple's mezzoStrokes and filter/halftone's rotated cell math).
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
uniform int direction;
uniform float balance;
uniform float pressure;
uniform vec3 inkColor;
uniform vec3 paperColor;

out vec4 fragColor;

// hash - hash / jitter.
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// luminance - luminance.
float lum(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// value noise - value noise + fBm.
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

// Sobel gradient - gradient (Sobel on luminance), used by coloredPencil to bend
// strokes along image contours.
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

// ink/paper tonemapping - ink/paper tonemap.
vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Rotates a position-derived (global pixel space) vector by angleDeg.
// GLSL mat2(c,-s,s,c) rotation for the global pixel coordinate.
vec2 rotate2D(vec2 v, float angleDeg) {
    float a = radians(angleDeg);
    float co = cos(a);
    float si = sin(a);
    return mat2(co, -si, si, co) * v;
}

// direction (0..3) -> stroke angle in degrees: rightDiag/horizontal/
// leftDiag/vertical.
float dirAngle(int d) {
    if (d == 1) { return 0.0; }
    if (d == 2) { return 135.0; }
    if (d == 3) { return 90.0; }
    return 45.0; // rightDiag (0, default)
}

// Shared stroke field: elongated value noise along angleDeg. \`stretchAmt\`
// pixels of near-constant value along the stroke axis (1/stretchAmt
// frequency), near-full-pixel frequency (0.9) across it, so each "fiber"
// reads as a thin, direction-aligned stroke rather than a blob.
float strokeField(vec2 gc, float angleDeg, float stretchAmt) {
    vec2 p = rotate2D(gc, angleDeg) * vec2(1.0 / stretchAmt, 0.9);
    return vnoise(p);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec2 gc = floor(gl_FragCoord.xy) + tileOffset;

    float theta = dirAngle(direction);
    float stretchAmt = mix(4.0, 40.0, strokeLength / 100.0);
    float t = lum(src.rgb) + (balance - 50.0) / 100.0;
    // pressure bias, shared by every mode's pressure role below.
    float pb = (pressure - 50.0) / 100.0;
    float s = strokeField(gc, theta, stretchAmt);

    vec3 outColor;

#if MODE == 0
    // Graphic Pen: single-direction hard threshold of the stroke field
    // against tone - the starkest, most binary mode. pressure isn't given
    // an explicit role in the core formula ("ink = step(s, 1-t)"), so it
    // gets a small coverage nudge that is exactly zero at the default
    // pressure=50 (reduces to the core formula there) and only
    // shifts coverage as pressure moves away from center - keeps
    // \`pressure\` responsive at the default mode without changing the
    // documented default look.
    float inkMask = step(s, clamp(1.0 - t + pb * 0.3, 0.0, 1.0));
    outColor = tonemap2(1.0 - inkMask, inkColor, paperColor);
#elif MODE == 1
    // Charcoal: rougher 2-octave stroke noise (blend a half-length second
    // octave into the primary field), ink only in the shadow region
    // (t < 0.55, softly gated), paper elsewhere. pressure scales both how
    // much of the shadow region fills with ink (coverage) and how dark
    // that ink reads (darkness).
    float s2 = strokeField(gc * 2.0 + 91.7, theta, stretchAmt * 0.5);
    float rough = s * 0.6 + s2 * 0.4;
    float shadow = 1.0 - smoothstep(0.15, 0.55, t);
    float coverage = clamp(shadow + pb * 0.5, 0.0, 1.0);
    float inkMask = step(1.0 - coverage, rough);
    float darkness = mix(0.55, 1.0, pressure / 100.0);
    vec3 inkC = mix(paperColor, inkColor, darkness);
    outColor = mix(paperColor, inkC, inkMask);
#elif MODE == 2
    // Chalk & Charcoal: mid-gray paper base; dark charcoal strokes at
    // theta fill the shadows (t<0.4), paper-colored chalk strokes at
    // theta+90 fill the highlights (t>0.6). pressure = stroke contrast: it
    // sharpens (narrows) the smoothstep gate on both stroke layers, so low
    // pressure reads as soft/smudgy and high pressure as crisp.
    vec3 midGray = mix(inkColor, paperColor, 0.5);
    float sBg = strokeField(gc, theta + 90.0, stretchAmt);
    float aa = mix(0.4, 0.04, pressure / 100.0);
    float fgGate = 1.0 - smoothstep(0.4 - aa, 0.4 + aa, t);
    float fgMask = step(1.0 - fgGate, s);
    float bgGate = smoothstep(0.6 - aa, 0.6 + aa, t);
    float bgMask = step(1.0 - bgGate, sBg);
    outColor = midGray;
    outColor = mix(outColor, inkColor, fgMask);
    outColor = mix(outColor, paperColor, bgMask);
#elif MODE == 3
    // Conte Crayon: two-level remap (dark->ink, light->paper); the
    // midtone band is filled with fbm-textured stroke noise instead of a
    // flat gradient, so the transition between ink and paper looks
    // hand-textured rather than a smooth gradient. pressure isn't given an
    // explicit role in the core formula either, so it gets the same small,
    // default-neutral nudge as pen (zero at pressure=50).
    float toneGate = smoothstep(0.3, 0.7, t);
    float texture2 = mix(s, fbm(gc / (stretchAmt * 0.6) + 41.0), 0.5);
    float level = mix(texture2, toneGate, abs(toneGate * 2.0 - 1.0));
    level = clamp(level + pb * 0.15, 0.0, 1.0);
    outColor = tonemap2(level, inkColor, paperColor);
#elif MODE == 4
    // Crosshatch: COLOR-PRESERVING. Keeps src.rgb and multiplies in up to
    // 3 stroke fields (theta, theta+45, theta-45), each gated to a
    // progressively narrower/darker tone band, so shadows accumulate more
    // crossing layers than midtones - real crosshatch technique. pressure
    // = darkness of hatching (the gain on every layer's multiplicative
    // darkening).
    float s45a = strokeField(gc, theta + 45.0, stretchAmt);
    float s45b = strokeField(gc, theta - 45.0, stretchAmt);
    float band1 = 1.0 - smoothstep(0.65, 0.85, t);
    float band2 = 1.0 - smoothstep(0.35, 0.55, t);
    float band3 = 1.0 - smoothstep(0.05, 0.25, t);
    float darkGain = mix(0.25, 1.0, pressure / 100.0);
    float f0 = 1.0 - band1 * darkGain * (1.0 - s);
    float f1 = 1.0 - band2 * darkGain * (1.0 - s45a);
    float f2 = 1.0 - band3 * darkGain * (1.0 - s45b);
    outColor = clamp(src.rgb * f0 * f1 * f2, 0.0, 1.0);
#else
    // coloredPencil (5) - fallback arm of the #if/#elif chain (MODE is
    // always 0-5, injected by the runtime, so the last value needs no
    // explicit check). COLOR-PRESERVING: image color shows through only
    // inside the stroke mask; paper shows between strokes. Mask density
    // follows tone (dark areas denser strokes) and bends to follow local
    // contours near strong edges (Sobel gradient gradient direction, rotated
    // perpendicular to point along the contour), like pencil hatching
    // drawn along a subject's outline. pressure = coverage.
    vec2 grad = lumGradient(uv);
    float gradMag = length(grad);
    float edgeAngle = degrees(atan(grad.y, grad.x)) + 90.0;
    float sEdge = strokeField(gc, edgeAngle, stretchAmt);
    float edgeBoost = clamp(gradMag * 3.0, 0.0, 1.0);
    float sCombined = mix(s, sEdge, edgeBoost);
    float coverage = clamp((1.0 - t) + pb * 0.4, 0.0, 1.0);
    float strokeMask = step(1.0 - coverage, sCombined);
    outColor = mix(paperColor, src.rgb, strokeMask);
#endif

    fragColor = vec4(clamp(outColor, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Hatch - single-pass six-mode sketch engine. See glsl/hatch.glsl for the
 * full per-mode algorithm derivation and mode mapping; this is a
 * 1:1 port. MODE is a compile-time const injected by the runtime (see
 * definition.js globals.mode.define), same mechanism as filter/oilPaint
 * and filter/texture.
 *
 * tileOffset converts tile-local positions into the global procedural
 * coordinate gc (floor(pos.xy) + tileOffset) so the hatch pattern is
 * seamless across CLI render tiles, matching glsl/hatch.glsl's gc and
 * filter/stipple's WGSL tileOffset handling. It is zero for ordinary
 * full-frame renders. textureDimensions(inputTex) still stands in for
 * GLSL's resolution elsewhere (uv, lumGradient's texel step).
 *
 * Every stroke-field rotation matches GLSL's column-major
 * mat2(c,-s,s,c) multiplication numerically: (c*x+s*y,-s*x+c*y).
 * Keeping the same transform is required for the selected stroke
 * direction to have the same screen-space slope on both backends.
 * Every noise/hash helper below is built from WGSL's
 * \`floor\`/\`fract\`, which - like GLSL's - are floor-based (not truncated)
 * for negative inputs, so the negative positions a rotation can produce
 * need no separate floored-mod wrap.
 */

struct Uniforms {
    strokeLength: f32,
    direction: i32,
    balance: f32,
    pressure: f32,
    inkColor: vec3<f32>,
    paperColor: vec3<f32>,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// hash - hash / jitter.
fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

// luminance - luminance.
fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// value noise - value noise + fBm.
fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

fn fbm(p_in: vec2<f32>) -> f32 {
    var p = p_in;
    var v = 0.0;
    var a = 0.5;
    for (var i: i32 = 0; i < 5; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

// Sobel gradient - gradient (Sobel on luminance), used by coloredPencil to bend
// strokes along image contours.
fn lumGradient(uv: vec2<f32>) -> vec2<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let px = 1.0 / texSize;
    let tl = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  1.0)).rgb);
    let l  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  0.0)).rgb);
    let bl = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0, -1.0)).rgb);
    let tr = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  1.0)).rgb);
    let r  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  0.0)).rgb);
    let br = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0, -1.0)).rgb);
    let t  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 0.0,  1.0)).rgb);
    let b  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 0.0, -1.0)).rgb);
    return vec2<f32>(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                      tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

// ink/paper tonemapping - ink/paper tonemap.
fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Numeric expansion of GLSL mat2(co,-si,si,co) * v.
fn rotate2D(v: vec2<f32>, angleDeg: f32) -> vec2<f32> {
    let a = radians(angleDeg);
    let co = cos(a);
    let si = sin(a);
    return vec2<f32>(co * v.x + si * v.y, -si * v.x + co * v.y);
}

// direction (0..3) -> stroke angle in degrees: rightDiag/horizontal/
// leftDiag/vertical.
fn dirAngle(d: i32) -> f32 {
    if (d == 1) { return 0.0; }
    if (d == 2) { return 135.0; }
    if (d == 3) { return 90.0; }
    return 45.0; // rightDiag (0, default)
}

// Shared stroke field: elongated value noise along angleDeg. See
// hatch.glsl's strokeField for the frequency rationale.
fn strokeField(gc: vec2<f32>, angleDeg: f32, stretchAmt: f32) -> f32 {
    let p = rotate2D(gc, angleDeg) * vec2<f32>(1.0 / stretchAmt, 0.9);
    return vnoise(p);
}

// Per-mode dispatch -- MODE is a compile-time const (Dawn constant-folds),
// mirroring filter/oilPaint's oilPost.wgsl modeColor structure: sequential
// \`if (MODE == N) { return ...; }\` checks with the last mode (coloredPencil,
// 5) as the unconditional fallback.
fn hatchColor(gc: vec2<f32>, uv: vec2<f32>, src: vec3<f32>, theta: f32, stretchAmt: f32, t: f32, pb: f32, s: f32) -> vec3<f32> {
    if (MODE == 0) {
        // Graphic Pen: see hatch.glsl MODE==0 for the pressure-nudge
        // rationale (zero at pressure=50, matching the core formula).
        let inkMask = step(s, clamp(1.0 - t + pb * 0.3, 0.0, 1.0));
        return tonemap2(1.0 - inkMask, uniforms.inkColor, uniforms.paperColor);
    }
    if (MODE == 1) {
        // Charcoal.
        let s2 = strokeField(gc * 2.0 + 91.7, theta, stretchAmt * 0.5);
        let rough = s * 0.6 + s2 * 0.4;
        let shadow = 1.0 - smoothstep(0.15, 0.55, t);
        let coverage = clamp(shadow + pb * 0.5, 0.0, 1.0);
        let inkMask = step(1.0 - coverage, rough);
        let darkness = mix(0.55, 1.0, uniforms.pressure / 100.0);
        let inkC = mix(uniforms.paperColor, uniforms.inkColor, darkness);
        return mix(uniforms.paperColor, inkC, inkMask);
    }
    if (MODE == 2) {
        // Chalk & Charcoal.
        let midGray = mix(uniforms.inkColor, uniforms.paperColor, 0.5);
        let sBg = strokeField(gc, theta + 90.0, stretchAmt);
        let aa = mix(0.4, 0.04, uniforms.pressure / 100.0);
        let fgGate = 1.0 - smoothstep(0.4 - aa, 0.4 + aa, t);
        let fgMask = step(1.0 - fgGate, s);
        let bgGate = smoothstep(0.6 - aa, 0.6 + aa, t);
        let bgMask = step(1.0 - bgGate, sBg);
        var outc = midGray;
        outc = mix(outc, uniforms.inkColor, fgMask);
        outc = mix(outc, uniforms.paperColor, bgMask);
        return outc;
    }
    if (MODE == 3) {
        // Conte Crayon.
        let toneGate = smoothstep(0.3, 0.7, t);
        let texture2 = mix(s, fbm(gc / (stretchAmt * 0.6) + 41.0), 0.5);
        var level = mix(texture2, toneGate, abs(toneGate * 2.0 - 1.0));
        level = clamp(level + pb * 0.15, 0.0, 1.0);
        return tonemap2(level, uniforms.inkColor, uniforms.paperColor);
    }
    if (MODE == 4) {
        // Crosshatch (color-preserving).
        let s45a = strokeField(gc, theta + 45.0, stretchAmt);
        let s45b = strokeField(gc, theta - 45.0, stretchAmt);
        let band1 = 1.0 - smoothstep(0.65, 0.85, t);
        let band2 = 1.0 - smoothstep(0.35, 0.55, t);
        let band3 = 1.0 - smoothstep(0.05, 0.25, t);
        let darkGain = mix(0.25, 1.0, uniforms.pressure / 100.0);
        let f0 = 1.0 - band1 * darkGain * (1.0 - s);
        let f1 = 1.0 - band2 * darkGain * (1.0 - s45a);
        let f2 = 1.0 - band3 * darkGain * (1.0 - s45b);
        return clamp(src * f0 * f1 * f2, vec3<f32>(0.0), vec3<f32>(1.0));
    }
    // coloredPencil (5) - fallback arm (MODE is always 0-5, injected by
    // the runtime, so the last value needs no explicit check).
    // Color-preserving.
    let grad = lumGradient(uv);
    let gradMag = length(grad);
    let edgeAngle = degrees(atan2(grad.y, grad.x)) + 90.0;
    let sEdge = strokeField(gc, edgeAngle, stretchAmt);
    let edgeBoost = clamp(gradMag * 3.0, 0.0, 1.0);
    let sCombined = mix(s, sEdge, edgeBoost);
    let coverage = clamp((1.0 - t) + pb * 0.4, 0.0, 1.0);
    let strokeMask = step(1.0 - coverage, sCombined);
    return mix(uniforms.paperColor, src, strokeMask);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let gc = floor(pos.xy) + uniforms.tileOffset;

    let theta = dirAngle(uniforms.direction);
    let stretchAmt = mix(4.0, 40.0, uniforms.strokeLength / 100.0);
    let t = lum(src.rgb) + (uniforms.balance - 50.0) / 100.0;
    let pb = (uniforms.pressure - 50.0) / 100.0;
    let s = strokeField(gc, theta, stretchAmt);

    let outColor = hatchColor(gc, uv, src.rgb, theta, stretchAmt, t, pb, s);

    return vec4<f32>(clamp(outColor, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},a=`# hatch

Hand-drawn sketch engine covering Graphic Pen, Charcoal, Chalk & Charcoal, Conte Crayon, Crosshatch, and Colored Pencil filters

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|--------------|
| mode | int | pen | pen/charcoal/chalkCharcoal/conte/crosshatch/coloredPencil | Sketch style (see Modes below) |
| strokeLength | float | 50 | 0-100 | Stroke fiber length; maps to a noise stretch of 4-40px (short choppy marks at 0, long strokes at 100) |
| direction | int | rightDiag | rightDiag/horizontal/leftDiag/vertical | Stroke angle: 45/0/135/90 degrees |
| balance | float | 50 | 0-100 | Shadow/highlight tone threshold shift |
| pressure | float | 50 | 0-100 | Per-mode stroke weight (coverage/darkness/contrast - see Modes) |
| inkColor | color | (0.1, 0.1, 0.1) | - | Dark stroke tone; used by pen/charcoal/chalkCharcoal/conte |
| paperColor | color | (0.96, 0.94, 0.88) | - | Light background tone; used by every mode except crosshatch |

## Modes

- **pen** (default) -- Graphic Pen: \`ink = step(s, 1-t)\` at a single stroke angle, tonemapped straight to ink/paper - the starkest, most binary mode.
- **charcoal** -- Charcoal: a rougher 2-octave stroke noise inks only the shadow region (tone below ~0.55, softly gated), paper elsewhere; \`pressure\` scales both ink coverage and how dark the ink itself reads.
- **chalkCharcoal** -- Chalk & Charcoal: a mid-gray paper base with dark charcoal strokes at the stroke angle filling the shadows and paper-colored chalk strokes at angle+90 filling the highlights; \`pressure\` sharpens (or softens) both stroke gates' edges.
- **conte** -- Conte Crayon: a two-level dark/light remap whose midtone band is filled with fbm-textured stroke noise instead of a flat gradient.
- **crosshatch** -- Crosshatch: COLOR-PRESERVING. Keeps the source image's own color and multiplies in up to 3 stroke fields (angle, angle+45, angle-45), each gated to a progressively darker tone band so shadows accumulate more crossing hatch layers than midtones; \`pressure\` is the darkness gain of each layer.
- **coloredPencil** -- Colored Pencil: COLOR-PRESERVING. Image color shows through only inside the stroke mask (paper shows between strokes); mask density follows tone (denser in shadow) and bends to follow local image contours near strong edges; \`pressure\` is the overall stroke coverage.

## Notes

- Single pass on global (tile-aware) pixel coordinates so the stroke pattern is continuous across CLI render tiles.
- Every mode shares one stroke field, \`strokeField(gc, angle, stretch) = vnoise(rotate(gc, angle) * vec2(1/stretch, 0.9))\`: the along-stroke axis varies slowly (over \`stretch\` pixels) while the cross-stroke axis stays near full-pixel frequency, so the noise reads as thin direction-aligned fibers rather than a blob.
- \`mode\` is a compile-time selector (like \`filter/oilPaint\`'s \`mode\`): each value compiles as its own shader variant.
- crosshatch and coloredPencil are the only two color-preserving modes; the other four fully replace the image with an ink/paper tonemap.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .hatch()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&a&&(t.help=a);var p="filter/hatch",h="filter",f="hatch",u=t;export{u as default,p as effectId,f as effectName,a as help,h as namespace};
