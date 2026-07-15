/* filter/plasticWrap */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Plastic Wrap",namespace:"filter",func:"plasticWrap",tags:["blur","edges","artist"],description:"Glossy specular plastic film hugging image contours",globals:{highlight:{type:"float",default:60,uniform:"highlight",min:0,max:100,zero:0,ui:{label:"highlight",control:"slider"}},detail:{type:"float",default:40,uniform:"detail",min:0,max:100,ui:{label:"detail",control:"slider"}},smoothness:{type:"float",default:30,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},lightDirection:{type:"vec3",default:[-.4,.6,.7],uniform:"lightDirection",ui:{label:"direction",control:"vector3"}}},textures:{_pwBlurH:{width:"input",height:"input",format:"rgba8unorm"},_pwBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"pwBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_pwBlurH"}},{name:"blurV",program:"pwBlurV",inputs:{inputTex:"_pwBlurH"},outputs:{fragColor:"_pwBlur"}},{name:"spec",program:"pwSpec",inputs:{inputTex:"inputTex",blurTex:"_pwBlur"},outputs:{fragColor:"outputTex"}}]});var r={pwBlurH:{glsl:`/*
 * Plastic Wrap - horizontal Gaussian pass.
 *
 * Blurs the source image; the result feeds pwBlurV, and the luminance of
 * that final blur serves as the height field h for the specular pass
 * (pwSpec). Blurring rgb here (rather than luminance directly) keeps this
 * pass generic/reusable and defers the lum() reduction to where h is
 * actually consumed.
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
    // Higher detail -> smaller blur radius -> higher-frequency contours in
    // the height field -> finer, more numerous sheen streaks.
    float radius = mix(12.0, 2.0, detail / 100.0);
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
 * Plastic Wrap - horizontal Gaussian pass (see pwBlurH.glsl).
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
    let radius = mix(12.0, 2.0, uniforms.detail / 100.0);
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
`},pwBlurV:{glsl:`/*
 * Plastic Wrap - vertical Gaussian pass.
 *
 * Second half of the separable blur (reads pwBlurH's output). See
 * pwBlurH.glsl for why this blurs rgb rather than luminance directly.
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
    float radius = mix(12.0, 2.0, detail / 100.0);
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
 * Plastic Wrap - vertical Gaussian pass (see pwBlurV.glsl).
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
    let radius = mix(12.0, 2.0, uniforms.detail / 100.0);
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
`},pwSpec:{glsl:`/*
 * Plastic Wrap - specular pass.
 *
 * The blurred image (_pwBlur, written by pwBlurH/pwBlurV) supplies a height
 * field h via its luminance. A 1px central-difference gradient of h gives a
 * per-pixel surface normal. A configurable key light and fixed view vector
 * form a Blinn half-vector for the directional highlight. A five-point Laplacian adds
 * energy at two-dimensional ridge crests, so the sheen hugs raised contours
 * rather than washing evenly over plain slopes. The result is screened onto
 * the original image.
 *
 * Y-orientation note: the gradient taps (uv +/- 1px in x and y) and the
 * user-supplied key-light vector are interpreted identically by both
 * backends -- unlike e.g.
 * spinBlur's rotation of a fragment-position-derived offset, nothing here is
 * built from the fragment's own coordinate relative to a center parameter.
 * The WGSL port therefore matches this file exactly, with no manual Y
 * compensation, rather than following spinBlur/pondRipples' position-rotation
 * pattern.
 *
 * The vector control uses the user-facing light heading shared by the
 * Lighting effect. This height-field gradient uses the opposite XY direction,
 * so its azimuth is rotated 180 degrees below while Z remains toward the
 * viewer. Keeping that conversion inside the shader also preserves the
 * established default Plastic Wrap pixels.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform float highlight;
uniform float smoothness;
uniform vec3 lightDirection;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;
    vec4 src = texture(inputTex, uv);

    float hC = lum(texture(blurTex, uv).rgb);
    float hL = lum(texture(blurTex, uv - vec2(texel.x, 0.0)).rgb);
    float hR = lum(texture(blurTex, uv + vec2(texel.x, 0.0)).rgb);
    float hB = lum(texture(blurTex, uv - vec2(0.0, texel.y)).rgb);
    float hT = lum(texture(blurTex, uv + vec2(0.0, texel.y)).rgb);

    vec2 grad = vec2(hR - hL, hT - hB);

    // Gradient-to-slope scale: 10.0 turns a full 0..1
    // luminance swing over a ~2px span into a strongly tilted facet
    // (grad ~0.5 * 10 = 5, well past the point where the normal is mostly
    // sideways) while leaving gentle/smoothed contours near-flat.
    float strength = 10.0;
    vec3 n = normalize(vec3(-grad * strength, 1.0));
    float lightLengthSq = dot(lightDirection, lightDirection);
    vec3 operatorLight = lightLengthSq > 0.000001
        ? lightDirection
        : vec3(-0.4, 0.6, 0.7);
    vec3 controlledLight = vec3(-operatorLight.xy, operatorLight.z);
    vec3 L = normalize(controlledLight);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 halfVector = L + V;
    float halfLengthSq = dot(halfVector, halfVector);
    vec3 defaultL = normalize(vec3(0.4, -0.6, 0.7));
    vec3 defaultHalf = normalize(defaultL + V);
    vec3 H = halfLengthSq > 0.000001
        ? normalize(halfVector)
        : defaultHalf;

    float gloss = mix(24.0, 6.0, smoothness / 100.0);
    float flatSpec = pow(H.z, gloss);
    float rawSpec = pow(clamp(dot(n, H), 0.0, 1.0), gloss);
    // Remove the flat-plane response and normalize the remaining directional
    // highlight so unmodulated image regions do not receive a milky wash.
    float spec = clamp((rawSpec - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0);

    // The negative five-point Laplacian is positive at a two-dimensional
    // height-field crest. Unlike the prior x-only second derivative, it
    // responds equally to horizontal, vertical, and curved contours.
    float curv = 4.0 * hC - hL - hR - hB - hT;
    float ridge = clamp(curv * strength * 2.0, 0.0, 1.0);
    spec = clamp(spec * 1.35 + ridge * 0.75, 0.0, 1.0);

    vec3 specColor = clamp(vec3(spec) * (highlight / 100.0), 0.0, 1.0);
    // Screen blend: 1 - (1-a)(1-b). highlight=0 -> specColor=0 -> out=src exactly.
    vec3 outc = vec3(1.0) - (vec3(1.0) - src.rgb) * (vec3(1.0) - specColor);

    fragColor = vec4(outc, src.a);
}
`,wgsl:`/*
 * Plastic Wrap - specular pass.
 *
 * Deliberately textually mirrors pwSpec.glsl, with no manual Y compensation:
 * the gradient taps and the user-supplied key-light vector are interpreted
 * identically by both backends (not derived from the fragment's own position
 * relative to a center parameter), following emboss's fixed
 * kernel-tap precedent instead. The user-facing light heading is rotated
 * 180 degrees in XY below to match the height-field gradient convention while
 * leaving Z unchanged; see pwSpec.glsl.
 */

struct Uniforms {
    highlight: f32,
    smoothness: f32,
    lightDirection: vec3<f32>,
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
    let src = textureSample(inputTex, inputSampler, uv);

    let hC = lum(textureSample(blurTex, inputSampler, uv).rgb);
    let hL = lum(textureSample(blurTex, inputSampler, uv - vec2<f32>(texel.x, 0.0)).rgb);
    let hR = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(texel.x, 0.0)).rgb);
    let hB = lum(textureSample(blurTex, inputSampler, uv - vec2<f32>(0.0, texel.y)).rgb);
    let hT = lum(textureSample(blurTex, inputSampler, uv + vec2<f32>(0.0, texel.y)).rgb);

    let grad = vec2<f32>(hR - hL, hT - hB);

    let strength = 10.0;
    let n = normalize(vec3<f32>(-grad * strength, 1.0));
    let lightLengthSq = dot(uniforms.lightDirection, uniforms.lightDirection);
    let operatorLight = select(vec3<f32>(-0.4, 0.6, 0.7),
        uniforms.lightDirection, lightLengthSq > 0.000001);
    let controlledLight = vec3<f32>(-operatorLight.xy, operatorLight.z);
    let L = normalize(controlledLight);
    let V = vec3<f32>(0.0, 0.0, 1.0);
    let halfVector = L + V;
    let halfLengthSq = dot(halfVector, halfVector);
    let defaultL = normalize(vec3<f32>(0.4, -0.6, 0.7));
    let defaultHalf = normalize(defaultL + V);
    var H = defaultHalf;
    if (halfLengthSq > 0.000001) {
        H = normalize(halfVector);
    }

    let gloss = mix(24.0, 6.0, uniforms.smoothness / 100.0);
    let flatSpec = pow(H.z, gloss);
    let rawSpec = pow(clamp(dot(n, H), 0.0, 1.0), gloss);
    var spec = clamp((rawSpec - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0);

    let curv = 4.0 * hC - hL - hR - hB - hT;
    let ridge = clamp(curv * strength * 2.0, 0.0, 1.0);
    spec = clamp(spec * 1.35 + ridge * 0.75, 0.0, 1.0);

    let specColor = clamp(vec3<f32>(spec) * (uniforms.highlight / 100.0), vec3<f32>(0.0), vec3<f32>(1.0));
    let outc = vec3<f32>(1.0) - (vec3<f32>(1.0) - src.rgb) * (vec3<f32>(1.0) - specColor);

    return vec4<f32>(outc, src.a);
}
`}},a=`# plasticWrap

Glossy specular plastic film hugging image contours

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| highlight | float | 60 | 0-100 | Specular highlight strength; 0 disables the effect |
| detail | float | 40 | 0-100 | Contour frequency of the sheen (higher = finer, higher-frequency height-field blur; lower = broader, softer contours) |
| smoothness | float | 30 | 0-100 | Specular falloff width: low values give tight, sharp glints; high values give a broad, soft sheen |
| lightDirection | vec3 | [-0.4, 0.6, 0.7] | - | Three-dimensional heading of the key light |

## Notes

- A separable Gaussian blur of the source (radius \`mix(12, 2, detail/100)\`, two passes: \`pwBlurH\` then \`pwBlurV\`) builds a height field from the blurred image's luminance. A central-difference gradient produces a per-pixel surface normal, and the configurable \`lightDirection\` plus a fixed view vector form a Blinn half-vector for a directional highlight. The flat-plane response is removed so unmodulated regions do not receive a milky wash.
- A two-dimensional five-point Laplacian (\`4*h_c - h_l - h_r - h_b - h_t\`, positive on local ridges) adds specular energy on contour crests equally in both axes, giving the shrink-wrapped look of glossy film hugging the image rather than a flat sheen.
- The specular term is screened onto the source image (\`1 - (1-src)(1-spec)\`); \`highlight\` scales the specular term before the screen blend, so \`highlight: 0\` reproduces the source exactly.
- Blurring rgb (rather than luminance directly) in the two blur passes keeps them generic; the luminance reduction happens once, in the specular pass, where the height field is actually consumed.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .plasticWrap()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(r))t.shaders[i]={...e}}t&&a&&(t.help=a);var p="filter/plasticWrap",h="filter",c="plasticWrap",f=t;export{f as default,p as effectId,c as effectName,a as help,h as namespace};
