/* filter/chrome */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Chrome",namespace:"filter",func:"chrome",tags:["blur","edges","artist"],description:"Liquid-metal chrome: self-distorting oscillating tone curve over a blurred-luminance height field",globals:{detail:{type:"float",default:40,uniform:"detail",min:0,max:100,ui:{label:"detail",control:"slider"}},smoothness:{type:"float",default:40,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},distortion:{type:"float",default:30,uniform:"distortion",min:0,max:100,ui:{label:"distortion",control:"slider"}}},textures:{_chBlurH:{width:"input",height:"input",format:"rgba8unorm"},_chBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"chBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_chBlurH"}},{name:"blurV",program:"chBlurV",inputs:{inputTex:"_chBlurH"},outputs:{fragColor:"_chBlur"}},{name:"map",program:"chMap",inputs:{inputTex:"inputTex",blurTex:"_chBlur"},outputs:{fragColor:"outputTex"}}]});var r={chBlurH:{glsl:`/*
 * Chrome - horizontal Gaussian pass.
 *
 * Separable Gaussian blur of the source image. The blurred result
 * feeds chBlurV, and chMap reads its luminance as the height field driving
 * the self-distortion and oscillating tone curve.
 *
 * radius = mix(1.0, 16.0, smoothness/100): higher smoothness -> larger
 * blur radius -> coarser, larger chrome bands (Chrome's
 * "Smoothness" slider maps to feature scale).
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
    float radius = mix(1.0, 16.0, smoothness / 100.0);
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
 * Chrome - horizontal Gaussian pass (see chBlurH.glsl).
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
    let radius = mix(1.0, 16.0, uniforms.smoothness / 100.0);
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
`},chBlurV:{glsl:`/*
 * Chrome - vertical Gaussian pass.
 *
 * Second half of the separable blur (reads chBlurH's output). See
 * chBlurH.glsl for why this blurs rgb rather than luminance directly, and
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
    float radius = mix(1.0, 16.0, smoothness / 100.0);
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
 * Chrome - vertical Gaussian pass (see chBlurV.glsl).
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
    let radius = mix(1.0, 16.0, uniforms.smoothness / 100.0);
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
`},chMap:{glsl:`/*
 * Chrome - map pass.
 *
 * Reads the blurred image (_chBlur, written by chBlurH/chBlurV) as a
 * luminance height field h (luminance lum), self-distorts its OWN sample point by
 * h's central-difference gradient (a cheap liquid-metal "refraction"), then
 * runs the re-sampled height through an oscillating sine tone curve with a
 * rim-specular boost and a cool/blue-gray tint. This pass reads ONLY the
 * blurred texture for height/gradient math; inputTex is read solely for its
 * alpha channel.
 *
 * Gradient: a true central difference in UV space with 1px taps -
 *   grad = vec2(h(uv + (texel.x,0)) - h(uv - (texel.x,0)),
 *               h(uv + (0,texel.y)) - h(uv - (0,texel.y)))
 * (NOT the forward-difference relief shading relief-shade form, and NOT the 3x3 Sobel
 * Sobel gradient form).
 *
 * uv2 = uv + grad * (distortion/100) * 0.5: distortion scales the
 * self-warp strength; distortion = 0 collapses uv2 to uv exactly (grad's
 * contribution is multiplied to zero, not merely diminished).
 *
 * h2 = lum(blur at uv2): the height field re-read at the distorted sample
 * point - this second read (not the original h) is what feeds the tone
 * curve, so the "liquid" warp visibly displaces the metal bands relative to
 * the underlying image shape.
 *
 * cycles = mix(1.0, 7.0, detail/100): how many light/dark sine bands appear
 * per unit of height - Chrome's "Detail" slider.
 *
 * v = 0.5 + 0.5*sin(h2*cycles*2*PI + h2*3.0): an oscillating tone curve.
 * The extra \`+ h2*3.0\` phase term (on top of the \`cycles\` multiple-angle
 * term) breaks perfect periodicity slightly, so band spacing isn't a pure
 * repeating ramp - reads less mechanical, more liquid.
 *
 * v += pow(v, 8.0) * 0.5, then clamp to [0,1]: a narrow rim-specular boost
 * that only brightens the curve's own peaks (pow(v,8) is negligible except
 * where v is already close to 1), like a highlight catching a metal ridge.
 * v is always in [0,1] before this line (sin's range), so pow(v,8.0) never
 * sees a negative base.
 *
 * outColor = clamp(vec3(v) * vec3(0.96, 0.98, 1.02), 0, 1): grayscale only
 * (no source color anywhere in this pass) with a faint cool/blue tint
 * (channel gain rises R -> G -> B) for a steel/chrome cast instead of
 * neutral gray. Alpha comes from inputTex's src, not the blur.
 *
 * Y-orientation: h/h2 sample _chBlur (a same-effect prior-pass FBO) through
 * the standard per-backend native uv convention (gl_FragCoord.xy/resolution
 * in GLSL, pos.xy/texSize in WGSL) with NO manual Y compensation. This
 * same-effect intermediate read is orientation-transparent on both backends -
 * it matches on-screen presentation and matches inputTex, with no
 * mirroring. The sine tone curve is a pure function of height only - no
 * directional light, no rotation, nothing else fragment-coordinate-derived
 * - so it carries no Y-sensitivity of its own either. GLSL and WGSL are
 * therefore textually identical throughout, no compensation anywhere.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform float detail;
uniform float distortion;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;

    float hL = lum(texture(blurTex, uv - vec2(texel.x, 0.0)).rgb);
    float hR = lum(texture(blurTex, uv + vec2(texel.x, 0.0)).rgb);
    float hB = lum(texture(blurTex, uv - vec2(0.0, texel.y)).rgb);
    float hT = lum(texture(blurTex, uv + vec2(0.0, texel.y)).rgb);
    vec2 grad = vec2(hR - hL, hT - hB);

    vec2 uv2 = uv + grad * (distortion / 100.0) * 0.5;
    float h2 = lum(texture(blurTex, uv2).rgb);

    float cycles = mix(1.0, 7.0, detail / 100.0);
    float v = 0.5 + 0.5 * sin(h2 * cycles * 6.28318530718 + h2 * 3.0);
    v += pow(v, 8.0) * 0.5;
    v = clamp(v, 0.0, 1.0);

    vec3 outColor = clamp(vec3(v) * vec3(0.96, 0.98, 1.02), 0.0, 1.0);

    vec4 src = texture(inputTex, uv);
    fragColor = vec4(outColor, src.a);
}
`,wgsl:`/*
 * Chrome - map pass. See chMap.glsl for the full algorithm derivation.
 * This is a 1:1 port with NO manual Y compensation anywhere: blurTex reads
 * are orientation-transparent on both backends, and
 * the oscillating tone curve is a pure function of height only - nothing
 * fragment-coordinate-derived beyond the sample UV itself - so GLSL and
 * WGSL are textually identical.
 */

struct Uniforms {
    detail: f32,
    distortion: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var blurTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = 1.0 / texSize;

    let hL = lum(textureSample(blurTex, inputSampler, uv - vec2<f32>(texel.x, 0.0)).rgb);
    let hR = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(texel.x, 0.0)).rgb);
    let hB = lum(textureSample(blurTex, inputSampler, uv - vec2<f32>(0.0, texel.y)).rgb);
    let hT = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(0.0, texel.y)).rgb);
    let grad = vec2<f32>(hR - hL, hT - hB);

    let uv2 = uv + grad * (uniforms.distortion / 100.0) * 0.5;
    let h2 = lum(textureSample(blurTex, inputSampler, uv2).rgb);

    let cycles = mix(1.0, 7.0, uniforms.detail / 100.0);
    var v = 0.5 + 0.5 * sin(h2 * cycles * 6.28318530718 + h2 * 3.0);
    v += pow(v, 8.0) * 0.5;
    v = clamp(v, 0.0, 1.0);

    let outColor = clamp(vec3<f32>(v) * vec3<f32>(0.96, 0.98, 1.02), vec3<f32>(0.0), vec3<f32>(1.0));

    let src = textureSample(inputTex, inputSampler, uv);
    return vec4<f32>(outColor, src.a);
}
`}},a=`# chrome

Liquid-metal chrome: self-distorting oscillating tone curve over a blurred-luminance height field

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| detail | float | 40 | 0-100 | Sine tone-curve band count (\`cycles = mix(1, 7, detail/100)\`); higher detail packs more light/dark metal bands into the same height range |
| smoothness | float | 40 | 0-100 | Pre-blur radius (1-16px) applied to the source before the height field is derived; higher smoothness produces coarser, larger chrome bands |
| distortion | float | 30 | 0-100 | Self-warp strength: how far each sample point is displaced by the height field's own gradient before the tone curve is evaluated, producing the liquid "swirl" |

## Notes

- Implements Chrome filter: the source's blurred luminance becomes a height field, which is passed through an oscillating sine tone curve to produce swirling metallic bands, with no source color retained.
- Two internal textures (\`_chBlurH\`, \`_chBlur\`) implement a separable Gaussian blur (\`chBlurH\` -> \`chBlurV\`) of the source image; \`chMap\` reads that blur's luminance as the height field.
- Self-distortion: a central-difference gradient of the height field (1px UV-space taps) displaces the sample point (\`uv' = uv + gradient * distortion/100 * 0.5\`) before the height is re-read, so the metal bands visibly ripple rather than tracking the raw luminance contours directly. At \`distortion = 0\` the displacement is exactly zero.
- A rim-specular boost (\`v += pow(v, 8) * 0.5\`, clamped) brightens the tone curve's own peaks, reading as a highlight catching a metal ridge.
- Output is always grayscale with a faint cool/blue tint (\`vec3(v) * vec3(0.96, 0.98, 1.02)\`) - no source color passes through anywhere in this effect. A flat source produces a flat, single-color output (the tone curve is a pure function of the constant height).
- Output alpha is taken from the original source image, not the blurred intermediate.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .chrome()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&a&&(n.help=a);var h="filter/chrome",m="filter",c="chrome",p=n;export{p as default,h as effectId,c as effectName,a as help,m as namespace};
