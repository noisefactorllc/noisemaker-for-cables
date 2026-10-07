/* filter/unsharpMask */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Unsharp Mask",namespace:"filter",func:"unsharpMask",tags:["edges","artist"],description:"Classic unsharp mask sharpening with radius and threshold",defaultProgram:`search filter, synth

noise(scaleX: 20, scaleY: 20, octaves: 4)
  .unsharpMask()
  .write(o0)`,globals:{amount:{type:"float",default:220,uniform:"amount",min:0,max:500,zero:0,ui:{label:"amount",control:"slider"}},radius:{type:"float",default:4,uniform:"radius",min:.5,max:50,step:.5,ui:{label:"radius",control:"slider"}},threshold:{type:"float",default:0,uniform:"threshold",min:0,max:100,ui:{label:"threshold",control:"slider"}}},textures:{_usmBlurH:{width:"input",height:"input",format:"rgba8unorm"},_usmBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"usmBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_usmBlurH"}},{name:"blurV",program:"usmBlurV",inputs:{inputTex:"_usmBlurH"},outputs:{fragColor:"_usmBlur"}},{name:"combine",program:"usmCombine",inputs:{inputTex:"inputTex",blurTex:"_usmBlur"},outputs:{fragColor:"outputTex"}}]});var r={usmBlurH:{glsl:`/*
 * Unsharp mask - horizontal Gaussian pass
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float radius;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(1.0, 0.0);
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
 * Unsharp mask - horizontal Gaussian pass
 */

struct Uniforms {
    radius: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(1.0, 0.0);
    let sigma = max(uniforms.radius * 0.5, 0.001);
    let fTaps = min(uniforms.radius, 32.0);
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
`},usmBlurV:{glsl:`/*
 * Unsharp mask - vertical Gaussian pass
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float radius;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 dirPx = vec2(0.0, 1.0);
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
 * Unsharp mask - vertical Gaussian pass
 */

struct Uniforms {
    radius: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let dirPx = vec2<f32>(0.0, 1.0);
    let sigma = max(uniforms.radius * 0.5, 0.001);
    let fTaps = min(uniforms.radius, 32.0);
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
`},usmCombine:{glsl:`/*
 * Unsharp mask - combine pass: out = img + amount * (img - blur), threshold-gated
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform float amount;
uniform float threshold;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec4 blur = texture(blurTex, uv);
    vec3 diff = src.rgb - blur.rgb;
    // Soft threshold gate (PS levels 0-255 mapped to 0-100 param): fade in the
    // effect over a half-level band above the threshold to avoid banding.
    float t = threshold / 100.0;
    float mag = max(max(abs(diff.r), abs(diff.g)), abs(diff.b));
    float gate = smoothstep(t, t + 0.02, mag);
    vec3 outc = src.rgb + diff * (amount / 100.0) * gate;
    fragColor = vec4(clamp(outc, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Unsharp mask - combine pass
 */

struct Uniforms {
    amount: f32,
    threshold: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var blurTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let blur = textureSample(blurTex, inputSampler, uv);
    let diff = src.rgb - blur.rgb;
    let t = uniforms.threshold / 100.0;
    let mag = max(max(abs(diff.r), abs(diff.g)), abs(diff.b));
    let gate = smoothstep(t, t + 0.02, mag);
    let outc = src.rgb + diff * (uniforms.amount / 100.0) * gate;
    return vec4<f32>(clamp(outc, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},i=`# unsharpMask

Classic unsharp mask sharpening with radius and threshold

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 60 | 0-500 | Sharpening strength as a percentage; 0 disables the effect |
| radius | float | 4 | 0.5-50 | Gaussian blur radius (px) used to build the high-pass sharpening mask |
| threshold | float | 0 | 0-100 | Minimum edge contrast required before sharpening kicks in, gating flat/noisy areas out |

## Notes

- Implements the classic unsharp mask formula: \`out = image + amount * (image - gaussianBlur(image, radius))\`, with the correction gated by \`threshold\`.
- "Sharpen Edges" filter is equivalent to Unsharp Mask with a high \`threshold\`: only strong, high-contrast edges pass the gate and get sharpened, while smooth regions are left untouched.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .unsharpMask()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(r))n.shaders[s]={...e}}n&&i&&(n.help=i);var m="filter/unsharpMask",p="filter",f="unsharpMask",d=n;export{d as default,m as effectId,f as effectName,i as help,p as namespace};
