/* filter/photocopy */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Photocopy",namespace:"filter",func:"photocopy",tags:["blur","edges","artist"],description:"Ink-on-paper via edge and tonal difference-of-Gaussians, like a bad photocopy",globals:{detail:{type:"float",default:30,uniform:"detail",min:1,max:100,ui:{label:"detail",control:"slider"}},darkness:{type:"float",default:75,uniform:"darkness",min:0,max:100,ui:{label:"darkness",control:"slider"}},inkColor:{type:"color",default:[.1,.1,.1],uniform:"inkColor",ui:{label:"ink color",control:"color"}},paperColor:{type:"color",default:[.96,.94,.88],uniform:"paperColor",ui:{label:"paper color",control:"color"}}},textures:{_pcBlurH:{width:"input",height:"input",format:"rgba8unorm"},_pcBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"pcBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_pcBlurH"}},{name:"blurV",program:"pcBlurV",inputs:{inputTex:"_pcBlurH"},outputs:{fragColor:"_pcBlur"}},{name:"combine",program:"pcCombine",inputs:{inputTex:"inputTex",blurTex:"_pcBlur"},outputs:{fragColor:"outputTex"}}]});var i={pcBlurH:{glsl:`/*
 * Photocopy - horizontal Gaussian pass.
 *
 * Separable Gaussian blur of the source image. The blurred result
 * feeds pcBlurV, and pcCombine reads its luminance as the low-passed half
 * of the difference-of-Gaussians edge band.
 *
 * radius = mix(1.0, 24.0, (detail-1)/99): higher detail -> larger blur
 * radius -> the DoG band captures coarser edges (Photocopy's
 * "Detail" slider).
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float detail;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(1.0, 0.0);
    float radius = mix(1.0, 24.0, (detail - 1.0) / 99.0);
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
 * Photocopy - horizontal Gaussian pass (see pcBlurH.glsl).
 */

struct Uniforms {
    detail: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(1.0, 0.0);
    let radius = mix(1.0, 24.0, (uniforms.detail - 1.0) / 99.0);
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
`},pcBlurV:{glsl:`/*
 * Photocopy - vertical Gaussian pass.
 *
 * Second half of the separable blur (reads pcBlurH's output). See
 * pcBlurH.glsl for the detail->radius mapping.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float detail;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(0.0, 1.0);
    float radius = mix(1.0, 24.0, (detail - 1.0) / 99.0);
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
 * Photocopy - vertical Gaussian pass (see pcBlurV.glsl).
 */

struct Uniforms {
    detail: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(0.0, 1.0);
    let radius = mix(1.0, 24.0, (uniforms.detail - 1.0) / 99.0);
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
`},pcCombine:{glsl:`/*
 * Photocopy - combine pass.
 *
 * Two independent ink contributions, combined with max() so neither term
 * has to carry the whole image alone:
 *
 * 1. Edge ink: band = lum(src) - lum(blur) is the difference-of-Gaussians
 *    signal. abs(band) inks BOTH sides of an edge (a thin double-line
 *    contour, the characteristic photocopier edge artifact), gained by
 *    \`darkness\` via edgeGain = mix(4, 18, darkness/100).
 *
 * 2. Tonal ink: toneInk = 1 - smoothstep(toneLo, toneHi, lumSrc) fills
 *    the source's own mid-dark regions with solid ink directly, independent
 *    of edge content - this is what keeps the image's actual shapes legible
 *    as ink instead of relying on sparse hairline edges (a soft/low-contrast
 *    source has a tiny DoG band almost everywhere, which starved the old
 *    edge-only formula down to near-blank paper). toneHi = mix(0.35, 0.68,
 *    darkness/100) tracks \`darkness\` so raising it both thickens edges and
 *    inks a larger share of the tonal range; toneLo = toneHi - 0.26 is a
 *    fixed-width falling ramp below it (complement-smoothstep idiom:
 *    ascending edge0<edge1, negated - see ink/paper tonemapping callers elsewhere).
 *
 * ink = clamp(max(edgeInk, toneInk), 0, 1). Flat source: band=0 identically
 * (blur of a flat field equals the field), so edgeInk=0 and ink=toneInk
 * alone - a fully bright flat source (lumSrc=1 > toneHi) renders pure
 * paper, a fully dark flat source (lumSrc=0 < toneLo) renders solid ink,
 * matching Photocopy's expected flat-case response exactly as before.
 *
 * tonemap2 (ink/paper tonemapping): t=1 -> paper, so 1-ink means full ink -> ink color, zero
 * ink -> paper color. Alpha is taken from the source, not the blur.
 *
 * No directional light, no rotation, no fragment-coordinate-derived
 * vectors anywhere in this pass (DoG is isotropic) - GLSL and WGSL are
 * textually identical, no Y-orientation compensation needed.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform float darkness;
uniform vec3 inkColor;
uniform vec3 paperColor;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec4 blur = texture(blurTex, uv);

    float lumSrc = lum(src.rgb);
    float lumBlur = lum(blur.rgb);
    float band = lumSrc - lumBlur;

    float edgeGain = mix(4.0, 18.0, darkness / 100.0);
    float edgeInk = clamp(abs(band) * edgeGain, 0.0, 1.0);

    float toneHi = mix(0.35, 0.68, darkness / 100.0);
    float toneLo = toneHi - 0.26;
    float toneInk = 1.0 - smoothstep(toneLo, toneHi, lumSrc);

    float ink = clamp(max(edgeInk, toneInk), 0.0, 1.0);

    vec3 outColor = tonemap2(1.0 - ink, inkColor, paperColor);
    fragColor = vec4(outColor, src.a);
}
`,wgsl:`/*
 * Photocopy - combine pass (see pcCombine.glsl).
 */

struct Uniforms {
    darkness: f32,
    inkColor: vec3<f32>,
    paperColor: vec3<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var blurTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let blur = textureSample(blurTex, inputSampler, uv);

    let lumSrc = lum(src.rgb);
    let lumBlur = lum(blur.rgb);
    let band = lumSrc - lumBlur;

    let edgeGain = mix(4.0, 18.0, uniforms.darkness / 100.0);
    let edgeInk = clamp(abs(band) * edgeGain, 0.0, 1.0);

    let toneHi = mix(0.35, 0.68, uniforms.darkness / 100.0);
    let toneLo = toneHi - 0.26;
    let toneInk = 1.0 - smoothstep(toneLo, toneHi, lumSrc);

    let ink = clamp(max(edgeInk, toneInk), 0.0, 1.0);

    let outColor = tonemap2(1.0 - ink, uniforms.inkColor, uniforms.paperColor);
    return vec4<f32>(outColor, src.a);
}
`}},r="# photocopy\n\nInk-on-paper via edge and tonal difference-of-Gaussians, like a bad photocopy\n\n## Parameters\n\n| Parameter | Type | Default | Range | Description |\n|-----------|------|---------|-------|-------------|\n| detail | float | 30 | 1-100 | DoG blur radius (1-24px); higher detail widens the blur so the edge band captures coarser contours |\n| darkness | float | 75 | 0-100 | Overall ink strength: edge gain (mix(4, 18, darkness/100)) and tonal ink threshold (mix(0.35, 0.68, darkness/100)) both scale with this value; higher darkness thickens edge ink and inks a larger share of the tonal range |\n| inkColor | color | (0.1, 0.1, 0.1) | - | Dark tone used where ink coverage is highest |\n| paperColor | color | (0.96, 0.94, 0.88) | - | Light tone used where there is no ink |\n\n## Notes\n\n- Implements Photocopy filter with two combined ink contributions, so the image's own shapes/tones stay clearly legible as ink rather than relying on sparse hairline edges:\n  - **Edge ink**: a symmetric difference-of-Gaussians band (`band = lum(src) - lum(blur)`) inks both sides of an edge as a thin double-line contour (`edgeInk = clamp(abs(band) * edgeGain, 0, 1)`).\n  - **Tonal ink**: the source's own mid-dark regions fill with solid ink directly, independent of edge content (`toneInk = 1 - smoothstep(toneHi - 0.26, toneHi, lum(src))`).\n  - The two combine as `ink = clamp(max(edgeInk, toneInk), 0, 1)`.\n- Two internal textures (`_pcBlurH`, `_pcBlur`) implement a separable Gaussian blur (`pcBlurH` -> `pcBlurV`) of the source image; `pcCombine` reads that blur's luminance as the low-passed half of the DoG band.\n- Flat source regions produce zero edge signal (`band = 0` identically), so ink there is driven by the tonal term alone: a flat source at or above the tonal threshold (`lum >= toneHi`) renders as pure `paperColor`, a flat source at or below `toneHi - 0.26` renders as solid `inkColor`, with a smooth ramp between.\n- Output alpha is taken from the original source image, not the blurred intermediate.\n\n## Usage\n\n```\nsearch filter, synth\n\nnoise(seed: 1, ridges: true)\n  .photocopy()\n  .write(o0)\n\nrender(o0)\n```\n";if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(i))n.shaders[o]={...e}}n&&r&&(n.help=r);var p="filter/photocopy",m="filter",d="photocopy",f=n;export{f as default,p as effectId,d as effectName,r as help,m as namespace};
