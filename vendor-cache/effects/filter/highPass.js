/* filter/highPass */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"High Pass",namespace:"filter",func:"highPass",tags:["edges","artist"],description:"High-pass filter isolating edge detail as a flat mid-gray field",globals:{radius:{type:"float",default:10,uniform:"radius",min:.5,max:100,step:.5,ui:{label:"radius",control:"slider"}},mono:{type:"boolean",default:!1,uniform:"mono",ui:{label:"mono",control:"checkbox"}}},textures:{_hpBlurH:{width:"input",height:"input",format:"rgba8unorm"},_hpBlur:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"hpBlurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_hpBlurH"}},{name:"blurV",program:"hpBlurV",inputs:{inputTex:"_hpBlurH"},outputs:{fragColor:"_hpBlur"}},{name:"combine",program:"hpCombine",inputs:{inputTex:"inputTex",blurTex:"_hpBlur"},outputs:{fragColor:"outputTex"}}]});var r={hpBlurH:{glsl:`/*
 * High pass - horizontal Gaussian pass
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
    // Beyond 32 taps we can't add more samples (bounded loop), so widen the
    // spacing between them to keep the kernel reaching the full radius.
    float stride = radius > 32.0 ? radius / 32.0 : 1.0;
    vec4 sum = texture(inputTex, uv);
    float wsum = 1.0;
    for (int i = 1; i <= 32; i++) {
        if (float(i) > fTaps) { break; }
        float w = exp(-float(i * i) / (2.0 * sigma * sigma));
        vec2 o = dirPx * float(i) * stride / resolution;
        sum += (texture(inputTex, uv + o) + texture(inputTex, uv - o)) * w;
        wsum += 2.0 * w;
    }
    fragColor = sum / wsum;
}
`,wgsl:`/*
 * High pass - horizontal Gaussian pass
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
    // Beyond 32 taps we can't add more samples (bounded loop), so widen the
    // spacing between them to keep the kernel reaching the full radius.
    let stride = select(1.0, uniforms.radius / 32.0, uniforms.radius > 32.0);
    var sum = textureSample(inputTex, inputSampler, uv);
    var wsum = 1.0;
    for (var i = 1; i <= 32; i++) {
        if (f32(i) > fTaps) { break; }
        let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
        let o = dirPx * f32(i) * stride / texSize;
        sum += (textureSample(inputTex, inputSampler, uv + o)
              + textureSample(inputTex, inputSampler, uv - o)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}
`},hpBlurV:{glsl:`/*
 * High pass - vertical Gaussian pass
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
    // Beyond 32 taps we can't add more samples (bounded loop), so widen the
    // spacing between them to keep the kernel reaching the full radius.
    float stride = radius > 32.0 ? radius / 32.0 : 1.0;
    vec4 sum = texture(inputTex, uv);
    float wsum = 1.0;
    for (int i = 1; i <= 32; i++) {
        if (float(i) > fTaps) { break; }
        float w = exp(-float(i * i) / (2.0 * sigma * sigma));
        vec2 o = dirPx * float(i) * stride / resolution;
        sum += (texture(inputTex, uv + o) + texture(inputTex, uv - o)) * w;
        wsum += 2.0 * w;
    }
    fragColor = sum / wsum;
}
`,wgsl:`/*
 * High pass - vertical Gaussian pass
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
    // Beyond 32 taps we can't add more samples (bounded loop), so widen the
    // spacing between them to keep the kernel reaching the full radius.
    let stride = select(1.0, uniforms.radius / 32.0, uniforms.radius > 32.0);
    var sum = textureSample(inputTex, inputSampler, uv);
    var wsum = 1.0;
    for (var i = 1; i <= 32; i++) {
        if (f32(i) > fTaps) { break; }
        let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
        let o = dirPx * f32(i) * stride / texSize;
        sum += (textureSample(inputTex, inputSampler, uv + o)
              + textureSample(inputTex, inputSampler, uv - o)) * w;
        wsum += 2.0 * w;
    }
    return sum / wsum;
}
`},hpCombine:{glsl:`/*
 * High pass - combine pass: hp = src - blur + 0.5 gray, optional luminance-only
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D blurTex;
uniform vec2 resolution;
uniform bool mono;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec4 blur = texture(blurTex, uv);
    vec3 diff = src.rgb - blur.rgb;
    vec3 hp = mono ? vec3(lum(diff) + 0.5) : (diff + 0.5);
    fragColor = vec4(clamp(hp, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * High pass - combine pass
 */

struct Uniforms {
    mono: i32,
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
    let src = textureSample(inputTex, inputSampler, uv);
    let blur = textureSample(blurTex, inputSampler, uv);
    let diff = src.rgb - blur.rgb;
    let hp = select(diff + 0.5, vec3<f32>(lum(diff) + 0.5), uniforms.mono != 0);
    return vec4<f32>(clamp(hp, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},s=`# highPass

High-pass filter isolating edge detail as a flat mid-gray field

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| radius | float | 10 | 0.5-100 | Gaussian blur radius (px) subtracted from the source to isolate edge/detail frequencies |
| mono | boolean | false | - | Output luminance-only high-pass detail instead of per-channel color |

## Notes

- Implements High Pass filter: \`out = image - gaussianBlur(image, radius) + 0.5 gray\`, clamped, alpha preserved.
- Low radius keeps only fine texture/noise; high radius lets broader edge contours through.
- Taps beyond 32 are strided (\`offset *= radius/32\`) so the blur kernel reaches the full requested radius using a bounded number of samples.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .highPass()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&s&&(n.help=s);var p="filter/highPass",f="filter",m="highPass",d=n;export{d as default,p as effectId,m as effectName,s as help,f as namespace};
