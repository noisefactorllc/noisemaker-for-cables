/* filter/halftone */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Halftone",namespace:"filter",func:"halftone",tags:["color","pixel","artist"],description:"Rotated-screen halftone reproduction with subtractive color rosettes or monochrome dot, line, and circle screens",globals:{mode:{type:"int",default:0,define:"MODE",choices:{color:0,mono:1},ui:{label:"mode",control:"dropdown"}},pattern:{type:"int",default:0,define:"PATTERN",choices:{dot:0,line:1,circle:2},ui:{label:"pattern",control:"dropdown",enabledBy:{param:"mode",eq:1}}},frequency:{type:"float",default:24,uniform:"frequency",min:4,max:128,ui:{label:"frequency",control:"slider"}},cyanAngle:{type:"float",default:108,uniform:"cyanAngle",min:-180,max:180,ui:{label:"cyan angle",control:"slider",enabledBy:{param:"mode",eq:0}}},magentaAngle:{type:"float",default:162,uniform:"magentaAngle",min:-180,max:180,ui:{label:"magenta angle",control:"slider",enabledBy:{param:"mode",eq:0}}},yellowAngle:{type:"float",default:90,uniform:"yellowAngle",min:-180,max:180,ui:{label:"yellow angle",control:"slider",enabledBy:{param:"mode",eq:0}}},blackAngle:{type:"float",default:45,uniform:"blackAngle",min:-180,max:180,ui:{label:"black angle",control:"slider",enabledBy:{param:"mode",eq:0}}},monoAngle:{type:"float",default:45,uniform:"monoAngle",min:-180,max:180,ui:{label:"mono angle",control:"slider",enabledBy:{and:[{param:"mode",eq:1},{param:"pattern",in:[0,1]}]}}},sharpness:{type:"float",default:80,uniform:"sharpness",min:0,max:100,ui:{label:"sharpness",control:"slider"}},inkColor:{type:"color",default:[.05,.05,.05],uniform:"inkColor",ui:{label:"ink color",control:"color",enabledBy:{param:"mode",eq:1}}},paperColor:{type:"color",default:[.98,.96,.9],uniform:"paperColor",ui:{label:"paper color",control:"color",enabledBy:{param:"mode",eq:1}}}},passes:[{name:"render",program:"halftone",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={halftone:{glsl:`/*
 * Halftone - rotated subtractive color screens and monochrome patterns.
 *
 * Screen geometry: global (tile-aware) pixel coordinates are rotated by
 * the screen's angle and tiled into \`frequency\`-px cells; a fragment's
 * distance to the cell's ink feature (dot center / line midline / ring
 * band) drives an antialiased coverage value via smoothstep against
 * fwidth(), so the screen stays crisp at any resolution.
 *
 * mode == 0 (color): separates RGB into CMYK with under-color removal,
 * then drives four independent screens at the user-facing channel
 * angles. Each screen's dot SIZE comes from that ink's amount, sampled
 * with a light 3x3 box blur at the CENTER of the current fragment's
 * screen cell (not the fragment itself) so a cell's dot has one flat
 * size - the posterized "true halftone" look - rather than wobbling with
 * in-cell image detail. The screened inks composite subtractively back
 * to RGB. Neutral RGB separates to K only and therefore stays neutral.
 *
 * mode == 1 (mono): drives a single screen from image luminance. The
 * \`pattern\` dropdown selects the spot function: dot (radial distance
 * within the rotated cell), line (distance to the cell's rotated
 * midline - parallel engraving-style lines along the screen angle), or
 * circle (concentric rings measured from the image center, unrotated).
 * dot/line reuse the same cell-center sampling as color mode; circle has
 * no natural grid cell to center on, so it uses a mild local blur at the
 * fragment itself. Output is tonemapped between \`paperColor\` (no ink)
 * and \`inkColor\` (full ink).
 *
 * All cell math uses GLSL's \`fract\`, which is already floor-based
 * (\`fract(x) = x - floor(x)\`) and therefore safe for the negative
 * coordinates a rotated screen produces off-origin - no manual
 * floored-mod needed.
 */

#ifdef GL_ES
precision highp float;
#endif

// MODE and PATTERN are compile-time defines injected by the runtime (see
// definition.js \`globals.mode.define\` / \`globals.pattern.define\`). Baking
// them lets the compiler drop the unselected mode/pattern arms instead of
// carrying a runtime int dispatch through every fragment.
#ifndef MODE
#define MODE 0
#endif

#ifndef PATTERN
#define PATTERN 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float frequency;
uniform float cyanAngle;
uniform float magentaAngle;
uniform float yellowAngle;
uniform float blackAngle;
uniform float monoAngle;
uniform float sharpness;
uniform vec3 inkColor;
uniform vec3 paperColor;

out vec4 fragColor;

float lum(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Standard CMYK separation with full under-color removal. The shared
// neutral component becomes K, leaving C/M/Y at zero for neutral RGB.
vec4 rgbToCmyk(vec3 rgb) {
    float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
    float scale = max(1.0 - k, 0.00001);
    vec3 cmy = clamp((1.0 - rgb - vec3(k)) / scale, 0.0, 1.0);
    return vec4(cmy, k);
}

// Rotates a position-derived (global pixel space) vector by angleDeg.
// GLSL uses this mat2(c,-s,s,c) form for position-derived geometry with
// no manual Y compensation. Because this matrix is
// orthonormal, calling it with -angleDeg gives the exact inverse
// rotation (its transpose), which cellSampleFromRuv relies on below.
vec2 rotate2D(vec2 v, float angleDeg) {
    float a = radians(angleDeg);
    float co = cos(a);
    float si = sin(a);
    return mat2(co, -si, si, co) * v;
}

vec3 boxBlur3(vec2 uv, vec2 texel) {
    vec3 sum = vec3(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(float(x), float(y)) * texel;
            sum += texture(inputTex, clamp(uv + o, 0.0, 1.0)).rgb;
        }
    }
    return sum / 9.0;
}

// Blurred RGB sampled at the center of the rotated screen cell whose
// already-rotated-and-scaled coordinate is \`ruv\` (= rotate2D(gc,
// angleDeg) / frequency). Sampling the cell CENTER instead of the
// current fragment gives every dot in the cell one flat size - see file
// header.
vec3 cellSampleFromRuv(vec2 ruv, float angleDeg, vec2 texel) {
    vec2 cellId = floor(ruv) + 0.5;
    vec2 cellCenterGc = rotate2D(cellId * frequency, -angleDeg);
    vec2 cellUV = clamp((cellCenterGc - tileOffset) / resolution, 0.0, 1.0);
    return boxBlur3(cellUV, texel);
}

// Antialiased ink coverage (1 = full ink, 0 = bare paper) for a spot
// whose size is set by \`value\` (0..1, larger = more ink) at normalized
// distance \`d\` from the spot's feature. \`sharpnessPct\` is the user-facing
// 0-100 uniform; higher values narrow the antialiased transition for
// crisper edges (internally this is "1 - sharpness" worth of softness,
// mixing a wide constant fallback with the fwidth-derived crisp width).
float halftoneCoverage(float d, float value, float sharpnessPct) {
    float spot = sqrt(clamp(value, 0.0, 1.0)) * 0.7071;
    float softness = 1.0 - clamp(sharpnessPct / 100.0, 0.0, 1.0);
    float aa = max(mix(fwidth(d) * 1.5, 0.35, softness), 0.00001);
    return 1.0 - smoothstep(spot - aa, spot + aa, d);
}

// Clustered dots remain center-origin circles over the full tone range.
// Up through 50% ink, the area-derived radius is unchanged. Darker tones
// continue growing that same circle toward a sub-cell cap, avoiding both the
// hard grid seams and circles clipped into squares.
const float DOT_AREA_CAP = 0.50;
const float PI = 3.141592653589793;
const float MID_DOT_RADIUS = 0.39894228; // sqrt(0.5 / PI)
const float MAX_DOT_RADIUS = 0.48;

float roundDotCoverage(vec2 offset, float value, float sharpnessPct) {
    float inkAmount = clamp(value, 0.0, 1.0);
    float centerDistance = length(offset);
    float inkRadius = sqrt(min(inkAmount, DOT_AREA_CAP) / PI);
    if (inkAmount > DOT_AREA_CAP) {
        inkRadius = mix(MID_DOT_RADIUS, MAX_DOT_RADIUS,
            (inkAmount - DOT_AREA_CAP) / (1.0 - DOT_AREA_CAP));
    }
    float softness = 1.0 - clamp(sharpnessPct / 100.0, 0.0, 1.0);
    float centerAA = max(mix(fwidth(centerDistance) * 1.5, 0.35, softness), 0.00001);
    float resolvedInk = smoothstep(0.0, 1.0 / 255.0, value);
    return (1.0 - smoothstep(-centerAA, centerAA,
        centerDistance - inkRadius)) * resolvedInk;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;
    float alpha = texture(inputTex, uv).a;

#if MODE == 0
    // Subtractive color halftone.
    vec2 ruvC = rotate2D(globalCoord, cyanAngle) / frequency;
    vec2 ruvM = rotate2D(globalCoord, magentaAngle) / frequency;
    vec2 ruvY = rotate2D(globalCoord, yellowAngle) / frequency;
    vec2 ruvK = rotate2D(globalCoord, blackAngle) / frequency;
    float valC = rgbToCmyk(cellSampleFromRuv(ruvC, cyanAngle, texel)).r;
    float valM = rgbToCmyk(cellSampleFromRuv(ruvM, magentaAngle, texel)).g;
    float valY = rgbToCmyk(cellSampleFromRuv(ruvY, yellowAngle, texel)).b;
    float valK = rgbToCmyk(cellSampleFromRuv(ruvK, blackAngle, texel)).a;
    float inkC = roundDotCoverage(fract(ruvC) - 0.5, valC, sharpness);
    float inkM = roundDotCoverage(fract(ruvM) - 0.5, valM, sharpness);
    float inkY = roundDotCoverage(fract(ruvY) - 0.5, valY, sharpness);
    float inkK = roundDotCoverage(fract(ruvK) - 0.5, valK, sharpness);
    vec3 screened = (vec3(1.0) - vec3(inkC, inkM, inkY)) * (1.0 - inkK);
    fragColor = vec4(screened, alpha);
    return;
#else
    // Monochrome screen pattern.
    float value;
    float d;
    vec2 dotOffset = vec2(0.0);
#if PATTERN == 2
    // circle: concentric rings from the fixed image center, unrotated.
    vec2 center = fullResolution * 0.5;
    value = 1.0 - lum(boxBlur3(uv, texel));
    float rd = length(globalCoord - center) / frequency;
    d = abs(fract(rd) - 0.5);
#else
    vec2 ruv = rotate2D(globalCoord, monoAngle) / frequency;
    value = 1.0 - lum(cellSampleFromRuv(ruv, monoAngle, texel));
    vec2 off = fract(ruv) - 0.5;
    dotOffset = off;
    // 1 = line, else dot
#if PATTERN == 1
    d = abs(off.y);
#else
    d = length(off);
#endif
#endif
#if PATTERN == 0
    float ink = roundDotCoverage(dotOffset, value, sharpness);
#else
    float ink = halftoneCoverage(d, value, sharpness);
#endif
    fragColor = vec4(tonemap2(1.0 - ink, inkColor, paperColor), alpha);
#endif
}
`,wgsl:`/*
 * Halftone - rotated-screen halftone reproduction. See halftone.glsl for
 * the full algorithm derivation; this is a 1:1 port.
 *
 * The explicit rotation expansion below matches GLSL's column-major
 * mat2(co, -si, si, co) multiplication exactly.
 *
 * MODE and PATTERN are compile-time consts injected by the runtime via
 * injectDefines (see definition.js \`globals.mode.define\` /
 * \`globals.pattern.define\`). Baking them lets Dawn constant-fold the
 * mode/pattern dispatch instead of carrying a runtime int dispatch through
 * every fragment. They are read bare (not through \`uniforms\`) and are no
 * longer struct fields.
 */

struct Uniforms {
    frequency: f32,
    cyanAngle: f32,
    magentaAngle: f32,
    yellowAngle: f32,
    blackAngle: f32,
    monoAngle: f32,
    sharpness: f32,
    inkColor: vec3<f32>,
    paperColor: vec3<f32>,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

// Standard CMYK separation with full under-color removal. The shared
// neutral component becomes K, leaving C/M/Y at zero for neutral RGB.
fn rgbToCmyk(rgb: vec3<f32>) -> vec4<f32> {
    let k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
    let scale = max(1.0 - k, 0.00001);
    let cmy = clamp((1.0 - rgb - vec3<f32>(k)) / scale, vec3<f32>(0.0), vec3<f32>(1.0));
    return vec4<f32>(cmy, k);
}

// See file header: raw-convention rotation for position-derived vectors.
// Calling this with -angleDeg gives the exact inverse rotation, which
// cellSampleFromRuv relies on below.
fn rotate2D(v: vec2<f32>, angleDeg: f32) -> vec2<f32> {
    let a = radians(angleDeg);
    let co = cos(a);
    let si = sin(a);
    return vec2<f32>(co * v.x + si * v.y, -si * v.x + co * v.y);
}

fn boxBlur3(uv: vec2<f32>, texel: vec2<f32>) -> vec3<f32> {
    var sum = vec3<f32>(0.0);
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let o = vec2<f32>(f32(x), f32(y)) * texel;
            sum += textureSample(inputTex, inputSampler, clamp(uv + o, vec2<f32>(0.0), vec2<f32>(1.0))).rgb;
        }
    }
    return sum / 9.0;
}

// Blurred RGB sampled at the center of the rotated screen cell whose
// already-rotated-and-scaled coordinate is \`ruv\` (= rotate2D(gc,
// angleDeg) / frequency).
fn cellSampleFromRuv(ruv: vec2<f32>, angleDeg: f32, texel: vec2<f32>) -> vec3<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let cellId = floor(ruv) + 0.5;
    let cellCenterGc = rotate2D(cellId * uniforms.frequency, -angleDeg);
    let cellUV = clamp((cellCenterGc - uniforms.tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
    return boxBlur3(cellUV, texel);
}

fn halftoneCoverage(d: f32, value: f32, sharpnessPct: f32) -> f32 {
    let spot = sqrt(clamp(value, 0.0, 1.0)) * 0.7071;
    let softness = 1.0 - clamp(sharpnessPct / 100.0, 0.0, 1.0);
    let aa = max(mix(fwidth(d) * 1.5, 0.35, softness), 0.00001);
    return 1.0 - smoothstep(spot - aa, spot + aa, d);
}

const DOT_AREA_CAP: f32 = 0.50;
const PI: f32 = 3.141592653589793;
const MID_DOT_RADIUS: f32 = 0.39894228;
const MAX_DOT_RADIUS: f32 = 0.48;

fn roundDotCoverage(offset: vec2<f32>, value: f32, sharpnessPct: f32) -> f32 {
    let inkAmount = clamp(value, 0.0, 1.0);
    let centerDistance = length(offset);
    // Branchless form of the low/high dot-radius split. select(f, t, cond) is
    // a true select in WGSL (not an arithmetic blend), so this reproduces
    // both original arms bit-for-bit, including exactly at
    // inkAmount == DOT_AREA_CAP, where the low branch (sqrt formula) is
    // selected - matching the original strict \`>\` comparison.
    let inkRadius = select(
        sqrt(min(inkAmount, DOT_AREA_CAP) / PI),
        mix(MID_DOT_RADIUS, MAX_DOT_RADIUS,
            (inkAmount - DOT_AREA_CAP) / (1.0 - DOT_AREA_CAP)),
        inkAmount > DOT_AREA_CAP);
    let softness = 1.0 - clamp(sharpnessPct / 100.0, 0.0, 1.0);
    let centerAA = max(mix(fwidth(centerDistance) * 1.5, 0.35, softness), 0.00001);
    let resolvedInk = smoothstep(0.0, 1.0 / 255.0, value);
    return (1.0 - smoothstep(-centerAA, centerAA,
        centerDistance - inkRadius)) * resolvedInk;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let fullSize = select(texSize, uniforms.fullResolution, uniforms.fullResolution.x > 0.0);
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = pos.xy / texSize;
    let texel = 1.0 / texSize;
    let alpha = textureSample(inputTex, inputSampler, uv).a;

    if (MODE == 0) {
        // Subtractive color halftone.
        let ruvC = rotate2D(globalCoord, uniforms.cyanAngle) / uniforms.frequency;
        let ruvM = rotate2D(globalCoord, uniforms.magentaAngle) / uniforms.frequency;
        let ruvY = rotate2D(globalCoord, uniforms.yellowAngle) / uniforms.frequency;
        let ruvK = rotate2D(globalCoord, uniforms.blackAngle) / uniforms.frequency;
        let valC = rgbToCmyk(cellSampleFromRuv(ruvC, uniforms.cyanAngle, texel)).r;
        let valM = rgbToCmyk(cellSampleFromRuv(ruvM, uniforms.magentaAngle, texel)).g;
        let valY = rgbToCmyk(cellSampleFromRuv(ruvY, uniforms.yellowAngle, texel)).b;
        let valK = rgbToCmyk(cellSampleFromRuv(ruvK, uniforms.blackAngle, texel)).a;
        let inkC = roundDotCoverage(fract(ruvC) - 0.5, valC, uniforms.sharpness);
        let inkM = roundDotCoverage(fract(ruvM) - 0.5, valM, uniforms.sharpness);
        let inkY = roundDotCoverage(fract(ruvY) - 0.5, valY, uniforms.sharpness);
        let inkK = roundDotCoverage(fract(ruvK) - 0.5, valK, uniforms.sharpness);
        let screened = (vec3<f32>(1.0) - vec3<f32>(inkC, inkM, inkY)) * (1.0 - inkK);
        return vec4<f32>(screened, alpha);
    }

    // Monochrome screen pattern.
    var value: f32 = 0.0;
    var d: f32 = 0.0;
    var dotOffset = vec2<f32>(0.0);
    if (PATTERN == 2) {
        // circle: concentric rings from the fixed image center, unrotated.
        let center = fullSize * 0.5;
        value = 1.0 - lum(boxBlur3(uv, texel));
        let rd = length(globalCoord - center) / uniforms.frequency;
        d = abs(fract(rd) - 0.5);
    } else {
        let ruv = rotate2D(globalCoord, uniforms.monoAngle) / uniforms.frequency;
        value = 1.0 - lum(cellSampleFromRuv(ruv, uniforms.monoAngle, texel));
        let off = fract(ruv) - 0.5;
        dotOffset = off;
        d = select(length(off), abs(off.y), PATTERN == 1); // 1 = line, else dot
    }
    let ink = select(
        halftoneCoverage(d, value, uniforms.sharpness),
        roundDotCoverage(dotOffset, value, uniforms.sharpness),
        PATTERN == 0);
    return vec4<f32>(tonemap2(1.0 - ink, uniforms.inkColor, uniforms.paperColor), alpha);
}
`}},a=`# halftone

Rotated-screen reproduction with subtractive color rosettes or monochrome dot, line, and circle patterns.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | 0 | color:0, mono:1 | color separates the source into subtractive inks; mono screens luminance between the chosen paper and ink colors |
| pattern | int | 0 | dot:0, line:1, circle:2 | Mono-only shape: round dots, parallel lines, or concentric rings |
| frequency | float | 24 | 4-128 | Screen cell size in pixels; smaller values produce a finer screen |
| cyanAngle | float | 108 | -180-180 | Color-only cyan screen rotation in degrees |
| magentaAngle | float | 162 | -180-180 | Color-only magenta screen rotation in degrees |
| yellowAngle | float | 90 | -180-180 | Color-only yellow screen rotation in degrees |
| blackAngle | float | 45 | -180-180 | Color-only black screen rotation in degrees |
| monoAngle | float | 45 | -180-180 | Mono dot/line rotation in degrees; circle is unrotated |
| sharpness | float | 80 | 0-100 | Edge transition width; higher values give crisper marks |
| inkColor | color | [0.05, 0.05, 0.05] | - | Mono-only ink color |
| paperColor | color | [0.98, 0.96, 0.9] | - | Mono-only paper color |

## Notes

- Color mode uses under-color removal, so neutral RGB is carried by the black screen instead of colored fringes.
- Light tones grow round ink dots from cell centers. Darker tones continue growing those same circles to a radius capped inside the screen cell, preserving round edges without clipping dots into squares.
- Per-cell tone is sampled from a light local blur at the rotated cell center, giving each printed mark one stable size.
- Global pixel coordinates keep screen geometry aligned across export tiles.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .halftone()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&a&&(n.help=a);var f="filter/halftone",u="filter",m="halftone",d=n;export{d as default,f as effectId,m as effectName,a as help,u as namespace};
