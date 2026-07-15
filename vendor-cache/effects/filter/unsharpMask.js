/* filter/unsharpMask */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Unsharp Mask",namespace:"filter",func:"unsharpMask",tags:["edges","artist"],description:"Classic unsharp mask sharpening with radius and threshold",globals:{amount:{type:"float",default:220,uniform:"amount",min:0,max:500,zero:0,ui:{label:"amount",control:"slider"}},radius:{type:"float",default:4,uniform:"radius",min:.5,max:50,step:.5,ui:{label:"radius",control:"slider"}},threshold:{type:"float",default:0,uniform:"threshold",min:0,max:100,ui:{label:"threshold",control:"slider"}}},textures:{_usmBlurH:{width:"input",height:"input",format:"rgba8unorm"},_usmBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"usmBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_usmBlurH"}},{name:"blurV",program:"usmBlurV",inputs:{inputTex:"_usmBlurH"},outputs:{fragColor:"_usmBlur"}},{name:"combine",program:"usmCombine",inputs:{inputTex:"inputTex",blurTex:"_usmBlur"},outputs:{fragColor:"outputTex"}}]});var r={usmBlurH:{glsl:`/*
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
`}},s=`# unsharpMask

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
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(r))e.shaders[i]={...n}}e&&s&&(e.help=s);var m="filter/unsharpMask",p="filter",f="unsharpMask",d=e;export{d as default,m as effectId,f as effectName,s as help,p as namespace};
