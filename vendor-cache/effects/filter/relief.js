/* filter/relief */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Relief",namespace:"filter",func:"relief",tags:["blur","edges","artist"],description:"Two-tone ink/paper relief carving: Bas Relief, Plaster, and Note Paper sketch renderings",globals:{mode:{type:"int",default:0,define:"MODE",choices:{basRelief:0,plaster:1,notePaper:2},ui:{label:"mode",control:"dropdown"}},smoothness:{type:"float",default:30,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},detail:{type:"float",default:50,uniform:"detail",min:0,max:100,ui:{label:"detail",control:"slider"}},lightAngle:{type:"float",default:135,uniform:"lightAngle",min:-180,max:180,ui:{label:"light angle",control:"slider"}},balance:{type:"float",default:50,uniform:"balance",min:0,max:100,ui:{label:"balance",control:"slider",enabledBy:{param:"mode",eq:2}}},graininess:{type:"float",default:30,uniform:"graininess",min:0,max:100,ui:{label:"graininess",control:"slider",enabledBy:{param:"mode",eq:2}}},inkColor:{type:"color",default:[.1,.1,.1],uniform:"inkColor",ui:{label:"ink color",control:"color"}},paperColor:{type:"color",default:[.96,.94,.88],uniform:"paperColor",ui:{label:"paper color",control:"color"}}},textures:{_rlBlurH:{width:"input",height:"input",format:"rgba8unorm"},_rlBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"rlBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_rlBlurH"}},{name:"blurV",program:"rlBlurV",inputs:{inputTex:"_rlBlurH"},outputs:{fragColor:"_rlBlur"}},{name:"shade",program:"rlShade",inputs:{inputTex:"inputTex",blurTex:"_rlBlur"},outputs:{fragColor:"outputTex"}}]});var a={rlBlurH:{glsl:`/*
 * Relief - horizontal Gaussian pass.
 *
 * Separable Gaussian blur of the source image. The blurred result
 * feeds rlBlurV, and the luminance of that final blur becomes the height
 * field h consumed by rlShade. Blurring rgb here (rather than luminance
 * directly) keeps this pass generic/reusable, matching filter/plasticWrap's
 * pwBlurH/pwBlurV precedent; the lum() reduction happens once, downstream,
 * where h is actually used.
 *
 * radius = mix(0.5, 15.0, smoothness/100): higher smoothness -> larger
 * blur radius -> finer height-field detail is smoothed away -> coarser
 * relief (Bas Relief/Plaster/Note Paper "smoothness" slider).
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float smoothness;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(1.0, 0.0);
    float radius = mix(0.5, 15.0, smoothness / 100.0);
    float sigma = max(radius * 0.5, 0.001);
    float fTaps = min(radius, 32.0);
    vec4 sum = texture(inputTex, uv);
    float wsum = 1.0;
    for (int i = 1; i <= 32; i++) {
        if (float(i) > fTaps) { break; }
        float w = exp(-float(i * i) / (2.0 * sigma * sigma));
        vec2 o = dirPx * float(i) / resolution;
        sum += (texture(inputTex, uv + o) + texture(inputTex, uv - o)) * w;
        wsum += 2.0 * w;
    }
    fragColor = sum / wsum;
}
`,wgsl:`/*
 * Relief - horizontal Gaussian pass (see rlBlurH.glsl).
 */

struct Uniforms {
    smoothness: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(1.0, 0.0);
    let radius = mix(0.5, 15.0, uniforms.smoothness / 100.0);
    let sigma = max(radius * 0.5, 0.001);
    let fTaps = min(radius, 32.0);
    var sum = textureSample(inputTex, inputSampler, uv);
    var wsum = 1.0;
    for (var i = 1; i <= 32; i++) {
        if (f32(i) > fTaps) { break; }
        let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
        let o = dirPx * f32(i) / texSize;
        sum += (textureSample(inputTex, inputSampler, uv + o)
              + textureSample(inputTex, inputSampler, uv - o)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}
`},rlBlurV:{glsl:`/*
 * Relief - vertical Gaussian pass.
 *
 * Second half of the separable blur (reads rlBlurH's output). See
 * rlBlurH.glsl for why this blurs rgb rather than luminance directly, and
 * for the smoothness->radius mapping.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float smoothness;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(0.0, 1.0);
    float radius = mix(0.5, 15.0, smoothness / 100.0);
    float sigma = max(radius * 0.5, 0.001);
    float fTaps = min(radius, 32.0);
    vec4 sum = texture(inputTex, uv);
    float wsum = 1.0;
    for (int i = 1; i <= 32; i++) {
        if (float(i) > fTaps) { break; }
        float w = exp(-float(i * i) / (2.0 * sigma * sigma));
        vec2 o = dirPx * float(i) / resolution;
        sum += (texture(inputTex, uv + o) + texture(inputTex, uv - o)) * w;
        wsum += 2.0 * w;
    }
    fragColor = sum / wsum;
}
`,wgsl:`/*
 * Relief - vertical Gaussian pass (see rlBlurV.glsl).
 */

struct Uniforms {
    smoothness: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(0.0, 1.0);
    let radius = mix(0.5, 15.0, uniforms.smoothness / 100.0);
    let sigma = max(radius * 0.5, 0.001);
    let fTaps = min(radius, 32.0);
    var sum = textureSample(inputTex, inputSampler, uv);
    var wsum = 1.0;
    for (var i = 1; i <= 32; i++) {
        if (f32(i) > fTaps) { break; }
        let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
        let o = dirPx * f32(i) / texSize;
        sum += (textureSample(inputTex, inputSampler, uv + o)
              + textureSample(inputTex, inputSampler, uv - o)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}
`},rlShade:{glsl:`/*
 * Relief - shading pass.
 *
 * Reads the blurred image (_rlBlur, written by rlBlurH/rlBlurV) as a height
 * field via luminance (luminance lum), computes a per-pixel directional-light
 * shade from a 1px forward-difference gradient (relief shading reliefShade), and
 * tonemaps (ink/paper tonemapping) between inkColor/paperColor per \`mode\`:
 *
 *   basRelief (0): classic two-tone carved relief - shade blended 75/25
 *     with the raw height, mapped straight to ink/paper.
 *   plaster (1): height pushed through a hard smoothstep (blobby, mostly-
 *     flat plateaus) and inverted (dark source areas read as raised), lit
 *     with a squared (glossier, narrower) shade term, same 75/25 blend and
 *     tonemap as basRelief - reusing that structural recipe with a
 *     different height/shade shaping is what gives plaster its smooth
 *     molded look without inventing a second blend constant.
 *   notePaper (2): height hard-thresholded at \`balance\` into two flat
 *     paper sheets (inkColor*0.9+0.1 / paperColor, no gradient blend); a
 *     directional bevel shade is applied only in a ~2px band around the
 *     threshold contour (band width in height-space approximated from the
 *     local height gradient magnitude, so it stays ~2px wide on screen
 *     regardless of local contrast), and a per-pixel hash grain scaled by
 *     \`graininess\` is added to the result.
 *
 * Y-orientation: hC/hR/hT sample _rlBlur (a same-effect prior-pass FBO)
 * through the standard per-backend native uv convention
 * (gl_FragCoord.xy/resolution in GLSL, pos.xy/texSize in WGSL) with NO
 * manual Y compensation. This same-effect intermediate read is orientation-transparent
 * on both backends - it matches on-screen presentation and matches
 * inputTex, with no mirroring - so GLSL and WGSL use textually identical
 * sampling and gradient math here.
 *
 * The light vector L = normalize(vec3(cos(a), sin(a), 0.75)) is a plain
 * function of the lightAngle uniform - not fragment-coordinate-derived at
 * all - so it is likewise textually identical in both shaders. Standard
 * convention: a = radians(lightAngle); at lightAngle=135, cos(a) < 0 and
 * sin(a) > 0, so L points left+up in this always-Y-up-on-screen frame
 * (screen presentation is Y-up on both backends), landing the lit side
 * upper-left; at lightAngle=-45 (135-180, the opposite direction), the
 * lit side flips to lower-right.
 *
 * The grain hash coordinate is the integer, tile-aware global pixel
 * position (gl_FragCoord + tileOffset, floored) rather than local
 * gl_FragCoord, so the grain pattern is seamless across CLI render tiles
 * instead of restarting at each tile's local origin (filter/wind's
 * per-scanline-hash precedent).
 */

#ifdef GL_ES
precision highp float;
#endif

// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`). Each mode is a distinct shade+tonemap path; baking
// MODE lets the compiler drop the two dead arms instead of branching at
// runtime on a value that is constant for the whole draw.
#ifndef MODE
#define MODE 0
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float detail;
uniform float lightAngle;
uniform float balance;
uniform float graininess;
uniform vec3 inkColor;
uniform vec3 paperColor;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float reliefShade(float hC, float hR, float hT, float strength, float lightAngleDeg) {
    vec2 grad = vec2(hR - hC, hT - hC) * strength;
    vec3 n = normalize(vec3(-grad, 1.0));
    float a = radians(lightAngleDeg);
    vec3 L = normalize(vec3(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;
    vec4 src = texture(inputTex, uv);

    float hC = lum(texture(blurTex, uv).rgb);
    float hR = lum(texture(blurTex, uv + vec2(texel.x, 0.0)).rgb);
    float hT = lum(texture(blurTex, uv + vec2(0.0, texel.y)).rgb);

    float strength = detail * 0.2;
    vec3 outColor;

#if MODE==0
    // Bas Relief (mode 0, default): shade blended with raw height,
    // linear tonemap.
    float shade = reliefShade(hC, hR, hT, strength, lightAngle);
    outColor = tonemap2(mix(hC, shade, 0.75), inkColor, paperColor);
#elif MODE==1
    // Plaster: hard blobby height plateau, inverted (dark source =
    // raised), glossy (squared) shade.
    float hhC = 1.0 - smoothstep(0.35, 0.65, hC);
    float hhR = 1.0 - smoothstep(0.35, 0.65, hR);
    float hhT = 1.0 - smoothstep(0.35, 0.65, hT);
    float shade = reliefShade(hhC, hhR, hhT, strength, lightAngle);
    float glossy = pow(shade, 2.0);
    outColor = tonemap2(mix(hhC, glossy, 0.75), inkColor, paperColor);
#elif MODE==2
    // Note Paper: binary threshold cutout with a beveled contour band
    // and grain.
    float threshold = balance / 100.0;
    float m = step(threshold, hC);
    vec3 sheet = mix(inkColor * 0.9 + 0.1, paperColor, m);

    float shade = reliefShade(hC, hR, hT, strength, lightAngle);
    float gradMag = length(vec2(hR - hC, hT - hC));
    float bandHeight = max(gradMag * 2.0, 1e-5);
    float edge = 1.0 - smoothstep(0.0, bandHeight, abs(hC - threshold));
    vec3 beveled = clamp(sheet * mix(0.6, 1.4, shade), 0.0, 1.0);
    vec3 sheetOut = mix(sheet, beveled, edge);

    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    float grain = (hash12(floor(globalCoord)) - 0.5) * (graininess / 100.0) * 0.15;

    outColor = clamp(sheetOut + vec3(grain), 0.0, 1.0);
#endif

    fragColor = vec4(outColor, src.a);
}
`,wgsl:`/*
 * Relief - shading pass. See rlShade.glsl for the full algorithm
 * derivation and the Y-orientation / light-angle derivation notes; this is
 * a 1:1 port with NO manual Y compensation anywhere (per orientation-
 * Intermediate render targets use backend-native texture orientation, so _rlBlur
 * reads are orientation-transparent on both backends, and the light
 * vector is a plain function of the lightAngle uniform, not fragment-
 * coordinate-derived).
 *
 * The MODE==2 grain hash is seeded from the tile-aware global pixel
 * coordinate (pos.xy + uniforms.tileOffset, floored), matching GLSL's
 * gl_FragCoord.xy + tileOffset exactly - same tileOffset uniform and
 * usage as filter/wind's WGSL (runtime-provided, defaulting to (0,0) for
 * normal non-tiled rendering), so the grain pattern stays seamless across
 * CLI render tiles instead of restarting at each tile's local origin.
 *
 * MODE is a compile-time const injected by the runtime via injectDefines
 * (see definition.js \`globals.mode.define\`); it is not declared here.
 */

struct Uniforms {
    detail: f32,
    lightAngle: f32,
    balance: f32,
    graininess: f32,
    inkColor: vec3<f32>,
    paperColor: vec3<f32>,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var blurTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn reliefShade(hC: f32, hR: f32, hT: f32, strength: f32, lightAngleDeg: f32) -> f32 {
    let grad = vec2<f32>(hR - hC, hT - hC) * strength;
    let n = normalize(vec3<f32>(-grad, 1.0));
    let a = radians(lightAngleDeg);
    let L = normalize(vec3<f32>(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = 1.0 / texSize;
    let src = textureSample(inputTex, inputSampler, uv);

    let hC = lum(textureSample(blurTex, inputSampler, uv).rgb);
    let hR = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(texel.x, 0.0)).rgb);
    let hT = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(0.0, texel.y)).rgb);

    let strength = uniforms.detail * 0.2;
    var outColor = vec3<f32>(0.0);

    if (MODE == 1) {
        // Plaster: hard blobby height plateau, inverted (dark source =
        // raised), glossy (squared) shade.
        let hhC = 1.0 - smoothstep(0.35, 0.65, hC);
        let hhR = 1.0 - smoothstep(0.35, 0.65, hR);
        let hhT = 1.0 - smoothstep(0.35, 0.65, hT);
        let shade = reliefShade(hhC, hhR, hhT, strength, uniforms.lightAngle);
        let glossy = pow(shade, 2.0);
        outColor = tonemap2(mix(hhC, glossy, 0.75), uniforms.inkColor, uniforms.paperColor);
    } else if (MODE == 2) {
        // Note Paper: binary threshold cutout with a beveled contour band
        // and grain.
        let threshold = uniforms.balance / 100.0;
        let m = step(threshold, hC);
        let sheet = mix(uniforms.inkColor * 0.9 + 0.1, uniforms.paperColor, m);

        let shade = reliefShade(hC, hR, hT, strength, uniforms.lightAngle);
        let gradMag = length(vec2<f32>(hR - hC, hT - hC));
        let bandHeight = max(gradMag * 2.0, 1e-5);
        let edge = 1.0 - smoothstep(0.0, bandHeight, abs(hC - threshold));
        let beveled = clamp(sheet * mix(0.6, 1.4, shade), vec3<f32>(0.0), vec3<f32>(1.0));
        let sheetOut = mix(sheet, beveled, edge);

        let globalCoord = pos.xy + uniforms.tileOffset;
        let grain = (hash12(floor(globalCoord)) - 0.5) * (uniforms.graininess / 100.0) * 0.15;

        outColor = clamp(sheetOut + vec3<f32>(grain), vec3<f32>(0.0), vec3<f32>(1.0));
    } else {
        // Bas Relief (mode 0, default): shade blended with raw height,
        // linear tonemap.
        let shade = reliefShade(hC, hR, hT, strength, uniforms.lightAngle);
        outColor = tonemap2(mix(hC, shade, 0.75), uniforms.inkColor, uniforms.paperColor);
    }

    return vec4<f32>(outColor, src.a);
}
`}},i=`# relief

Two-tone ink/paper relief carving: Bas Relief, Plaster, and Note Paper sketch renderings

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | 0 (basRelief) | basRelief, plaster, notePaper | Selects the relief recipe |
| smoothness | float | 30 | 0-100 | Pre-blur radius (0.5-15px) applied to the source before the height field is derived; higher = coarser relief |
| detail | float | 50 | 0-100 | Relief gain: scales the height-field gradient before lighting, controlling how strongly contours read as raised/carved |
| lightAngle | float | 135 | -180-180 | Direction the relief is lit from, in degrees; 135 = upper-left, -45 = lower-right |
| balance | float | 50 | 0-100 | Note Paper ink/paper threshold; enabled only in notePaper mode |
| graininess | float | 30 | 0-100 | Note Paper grain strength; enabled only in notePaper mode |
| inkColor | color | (0.1, 0.1, 0.1) | - | Dark tone, used across all three modes |
| paperColor | color | (0.96, 0.94, 0.88) | - | Light tone, used across all three modes |

## Modes

- **basRelief (0)** - Classic Bas Relief. The blurred image's luminance is treated as a height field; a 1px forward-difference gradient is lit from \`lightAngle\` and blended 75/25 with the raw height, then tonemapped between \`inkColor\` and \`paperColor\`.
- **plaster (1)** - The height field is pushed through a hard \`smoothstep(0.35, 0.65, h)\` curve and inverted; the squared shade produces a narrow molded highlight before the same 75/25 blend and tonemap as basRelief.
- **notePaper (2)** - The raw height field is thresholded at \`balance\` into two flat sheets; a directional bevel is applied only near the threshold contour and \`graininess\` adds surface variation.

## Notes

- Two internal textures (\`_rlBlurH\`, \`_rlBlur\`) implement a separable Gaussian blur (\`rlBlurH\` -> \`rlBlurV\`) of the source image; \`rlShade\` reads that blurred result's luminance as the height field. Blurring rgb (rather than luminance directly) keeps the blur passes generic, matching \`filter/plasticWrap\`'s precedent.
- The light vector is derived analytically from \`lightAngle\` (no empirical calibration): \`L = normalize(vec3(cos(a), sin(a), 0.75))\`, \`a = radians(lightAngle)\`. Blur-chain intermediate texture reads are orientation-transparent on both backends, so this needs no backend-specific compensation.
- Output alpha is taken from the original source image, not the blurred intermediate.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .relief()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(a))n.shaders[r]={...e}}n&&i&&(n.help=i);var u="filter/relief",d="filter",f="relief",p=n;export{p as default,u as effectId,f as effectName,i as help,d as namespace};
