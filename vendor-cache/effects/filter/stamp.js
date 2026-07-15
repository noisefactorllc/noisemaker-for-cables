/* filter/stamp */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Stamp",namespace:"filter",func:"stamp",tags:["blur","edges","artist"],description:"Two-tone ink/paper stamp impression from a blurred-luminance threshold, with a torn-edge roughness knob",globals:{smoothness:{type:"float",default:30,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},balance:{type:"float",default:50,uniform:"balance",min:0,max:100,ui:{label:"balance",control:"slider"}},roughness:{type:"float",default:0,uniform:"roughness",min:0,max:100,ui:{label:"roughness",control:"slider"}},inkColor:{type:"color",default:[.1,.1,.1],uniform:"inkColor",ui:{label:"ink color",control:"color"}},paperColor:{type:"color",default:[.96,.94,.88],uniform:"paperColor",ui:{label:"paper color",control:"color"}}},textures:{_stBlurH:{width:"input",height:"input",format:"rgba8unorm"},_stBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"stBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_stBlurH"}},{name:"blurV",program:"stBlurV",inputs:{inputTex:"_stBlurH"},outputs:{fragColor:"_stBlur"}},{name:"threshold",program:"stThreshold",inputs:{inputTex:"inputTex",blurTex:"_stBlur"},outputs:{fragColor:"outputTex"}}]});var o={stBlurH:{glsl:`/*
 * Stamp - horizontal Gaussian pass.
 *
 * Separable Gaussian blur of the source image. The blurred result
 * feeds stBlurV, and stThreshold reads its luminance as the height field
 * that gets thresholded into ink/paper.
 *
 * radius = mix(0.5, 20.0, smoothness/100): higher smoothness -> larger
 * blur radius -> the threshold contour follows coarser shapes, matching
 * the Stamp/Torn Edges \`smoothness\` control.
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
    float radius = mix(0.5, 20.0, smoothness / 100.0);
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
 * Stamp - horizontal Gaussian pass (see stBlurH.glsl).
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
    let radius = mix(0.5, 20.0, uniforms.smoothness / 100.0);
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
`},stBlurV:{glsl:`/*
 * Stamp - vertical Gaussian pass.
 *
 * Second half of the separable blur (reads stBlurH's output). See
 * stBlurH.glsl for the smoothness->radius mapping.
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
    float radius = mix(0.5, 20.0, smoothness / 100.0);
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
 * Stamp - vertical Gaussian pass (see stBlurV.glsl).
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
    let radius = mix(0.5, 20.0, uniforms.smoothness / 100.0);
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
`},stThreshold:{glsl:`/*
 * Stamp - threshold pass.
 *
 * Reads the blurred image (_stBlur, written by stBlurH/stBlurV) as a
 * luminance height field (luminance lum) and thresholds it into two flat ink/
 * paper tones (ink/paper tonemapping tonemap2), the way a rubber stamp impression flattens an
 * image to two colors.
 *
 * t = lum(blur) + (fbm(globalCoord/3.0) - 0.5) * roughness/100 * 0.35: the
 * blurred luminance is the base height field; roughness > 0 perturbs it
 * with tile-aware value noise (value noise fbm over hash hash, integer global pixel
 * coordinate) so the threshold contour gets ragged (Torn
 * Edges) instead of staying a clean iso-line (roughness = 0, Stamp).
 *
 * b = balance/100 is the threshold. aa = max(fwidth(t), 0.01) +
 * roughness/100 * 0.05 is the smoothstep half-width: fwidth(t) keeps the
 * contour's AA screen-resolution-independent at roughness = 0, and the
 * roughness term widens it further so torn edges read as slightly soft/
 * grainy rather than crisply aliased. aa is always > 0 (the 0.01 floor),
 * so b - aa < b + aa always holds and smoothstep's arguments are always in
 * forward order.
 *
 * m = smoothstep(b - aa, b + aa, t), then tonemap2(m, inkColor,
 * paperColor): m = 1 (bright source) -> paper, m = 0 (dark source) -> ink -
 * classic rubber-stamp polarity (bright regions leave blank paper, dark
 * regions stamp ink). Alpha is taken from the source, not the blur.
 *
 * fbm/hash noise here is isotropic per-pixel value noise - no directional
 * light, no rotation, nothing fragment-coordinate-derived beyond the noise
 * coordinate itself - so this pass needs no backend-specific Y compensation;
 * GLSL and WGSL are textually identical
 * throughout (matches photocopy's DoG precedent).
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float balance;
uniform float roughness;
uniform vec3 inkColor;
uniform vec3 paperColor;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

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

vec3 tonemap2(float t, vec3 ink, vec3 paper) {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec4 blur = texture(blurTex, uv);

    // Tile-aware integer global pixel coordinate for the noise input, per
    // the grain lesson (oilPaint's oilPost precedent).
    vec2 globalCoord = floor(gl_FragCoord.xy) + tileOffset;

    float lumBlur = lum(blur.rgb);
    float grain = (fbm(globalCoord / 3.0) - 0.5) * (roughness / 100.0) * 0.35;
    float t = lumBlur + grain;

    float b = balance / 100.0;
    float aa = max(fwidth(t), 0.01) + (roughness / 100.0) * 0.05;
    float m = smoothstep(b - aa, b + aa, t);

    vec3 outColor = tonemap2(m, inkColor, paperColor);
    fragColor = vec4(outColor, src.a);
}
`,wgsl:`/*
 * Stamp - threshold pass. See stThreshold.glsl for the full algorithm
 * derivation. This is a 1:1 port with NO manual Y compensation anywhere:
 * the fbm/hash noise is isotropic per-pixel value noise with nothing
 * fragment-coordinate-derived beyond the noise coordinate itself, so GLSL
 * and WGSL are textually identical.
 *
 * tileOffset converts tile-local positions into global procedural
 * coordinates, matching GLSL's \`floor(gl_FragCoord.xy) + tileOffset\`:
 * globalCoord seeds the fbm/hash grain noise (the grain lesson - oilPaint's
 * oilPost sponge-mode precedent) so the threshold contour's roughness grain
 * is continuous across CLI render tiles. It is zero for ordinary full-frame
 * renders (see filter/stipple's WGSL port for the same pattern).
 */

struct Uniforms {
    balance: f32,
    roughness: f32,
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

fn tonemap2(t: f32, ink: vec3<f32>, paper: vec3<f32>) -> vec3<f32> {
    return mix(ink, paper, clamp(t, 0.0, 1.0));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let blur = textureSample(blurTex, inputSampler, uv);

    // Tile-aware integer global pixel coordinate for the noise input, per
    // the grain lesson (oilPaint's oilPost sponge-mode precedent).
    let globalCoord = floor(pos.xy) + uniforms.tileOffset;

    let lumBlur = lum(blur.rgb);
    let grain = (fbm(globalCoord / 3.0) - 0.5) * (uniforms.roughness / 100.0) * 0.35;
    let t = lumBlur + grain;

    let b = uniforms.balance / 100.0;
    let aa = max(fwidth(t), 0.01) + (uniforms.roughness / 100.0) * 0.05;
    let m = smoothstep(b - aa, b + aa, t);

    let outColor = tonemap2(m, uniforms.inkColor, uniforms.paperColor);
    return vec4<f32>(outColor, src.a);
}
`}},s="# stamp\n\nTwo-tone ink/paper stamp impression from a blurred-luminance threshold, with a torn-edge roughness knob\n\n## Parameters\n\n| Parameter | Type | Default | Range | Description |\n|-----------|------|---------|-------|-------------|\n| smoothness | float | 30 | 0-100 | Pre-threshold blur radius (0.5-20px); higher smoothness makes the threshold contour follow coarser shapes |\n| balance | float | 50 | 0-100 | Ink/paper threshold on the blurred luminance; higher balance shifts coverage toward more ink |\n| roughness | float | 0 | 0-100 | Contour ragging: 0 is a clean iso-line (Stamp), higher values perturb the threshold with tile-aware noise for a torn-paper edge (Torn Edges) |\n| inkColor | color | (0.1, 0.1, 0.1) | - | Dark tone used where the blurred source reads below the threshold |\n| paperColor | color | (0.96, 0.94, 0.88) | - | Light tone used where the blurred source reads above the threshold |\n\n## Notes\n\n- Implements Stamp and Torn Edges Sketch filters as one continuous effect: `roughness = 0` is Stamp's clean two-tone impression; `roughness > 0` progressively tears the contour into Torn Edges' ragged boundary.\n- Two internal textures (`_stBlurH`, `_stBlur`) implement a separable Gaussian blur (`stBlurH` -> `stBlurV`) of the source image; `stThreshold` reads that blur's luminance as the height field that gets thresholded.\n- The threshold contour is perturbed by tile-aware fractal value noise (`fbm(globalCoord/3.0)`, integer global pixel coordinates so the pattern is seamless across render tiles), scaled by `roughness`; the anti-aliasing half-width also widens slightly with `roughness` so torn edges read as soft/grainy rather than crisply aliased.\n- A flat mid-gray source at default `balance` (50) renders only approximately at the midpoint blend of `inkColor`/`paperColor`, not the exact midpoint: 8-bit quantization of the nominal 0.5 source (128/255 = 0.501961) is amplified by the narrow default `aa` (0.01) smoothstep window, landing the blend measurably off-center (~0.655 vs. the idealized ~0.53). A flat source clearly brighter than the threshold still renders as pure `paperColor`, clearly darker as pure `inkColor`.\n- Output alpha is taken from the original source image, not the blurred intermediate.\n\n## Usage\n\n```\nsearch filter, synth\n\nnoise(seed: 1, ridges: true)\n  .stamp()\n  .write(o0)\n\nrender(o0)\n```\n";if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&s&&(n.help=s);var p="filter/stamp",f="filter",m="stamp",h=n;export{h as default,p as effectId,m as effectName,s as help,f as namespace};
