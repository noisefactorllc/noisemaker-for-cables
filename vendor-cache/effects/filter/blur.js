/* filter/blur */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Blur",namespace:"filter",func:"blur",tags:["blur"],description:"Gaussian blur with separate X and Y radius controls",globals:{radiusX:{type:"float",default:5,uniform:"radiusX",min:0,max:50,step:1,zero:0,ui:{label:"radius x",control:"slider"}},radiusY:{type:"float",default:5,uniform:"radiusY",min:0,max:50,step:1,zero:0,ui:{label:"radius y",control:"slider"}}},textures:{_blurTemp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"blurH",program:"blurH",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_blurTemp"}},{name:"blurV",program:"blurV",inputs:{inputTex:"_blurTemp"},outputs:{fragColor:"outputTex"}}]});var r={blurH:{glsl:`/*
 * Horizontal Gaussian blur pass
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float radiusX;
uniform float renderScale;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec2 texelSize = 1.0 / vec2(texSize);

    int radius = int(radiusX * renderScale);
    if (radius <= 0) {
        fragColor = texture(inputTex, uv);
        return;
    }
    
    // Compute sigma for Gaussian (radius ~= 3*sigma)
    float sigma = float(radius) / 3.0;
    float sigma2 = sigma * sigma;
    
    vec4 sum = vec4(0.0);
    float weightSum = 0.0;
    
    for (int i = -radius; i <= radius; i++) {
        float x = float(i);
        float weight = exp(-(x * x) / (2.0 * sigma2));
        vec2 offset = vec2(float(i) * texelSize.x, 0.0);
        sum += texture(inputTex, uv + offset) * weight;
        weightSum += weight;
    }
    
    fragColor = sum / weightSum;
}
`,wgsl:`/*
 * Horizontal Gaussian blur pass
 */

struct Uniforms {
    radiusX: f32,
    radiusY: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    let radius = i32(uniforms.radiusX);
    if (radius <= 0) {
        return textureSample(inputTex, inputSampler, uv);
    }
    
    // Compute sigma for Gaussian (radius ~= 3*sigma)
    let sigma = f32(radius) / 3.0;
    let sigma2 = sigma * sigma;
    
    var sum = vec4<f32>(0.0);
    var weightSum = 0.0;
    
    for (var i = -radius; i <= radius; i = i + 1) {
        let x = f32(i);
        let weight = exp(-(x * x) / (2.0 * sigma2));
        let offset = vec2<f32>(f32(i) * texelSize.x, 0.0);
        sum = sum + textureSample(inputTex, inputSampler, uv + offset) * weight;
        weightSum = weightSum + weight;
    }
    
    return sum / weightSum;
}
`},blurV:{glsl:`/*
 * Vertical Gaussian blur pass
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float radiusY;
uniform float renderScale;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec2 texelSize = 1.0 / vec2(texSize);

    int radius = int(radiusY * renderScale);
    if (radius <= 0) {
        fragColor = texture(inputTex, uv);
        return;
    }
    
    // Compute sigma for Gaussian (radius ~= 3*sigma)
    float sigma = float(radius) / 3.0;
    float sigma2 = sigma * sigma;
    
    vec4 sum = vec4(0.0);
    float weightSum = 0.0;
    
    for (int i = -radius; i <= radius; i++) {
        float x = float(i);
        float weight = exp(-(x * x) / (2.0 * sigma2));
        vec2 offset = vec2(0.0, float(i) * texelSize.y);
        sum += texture(inputTex, uv + offset) * weight;
        weightSum += weight;
    }
    
    fragColor = sum / weightSum;
}
`,wgsl:`/*
 * Vertical Gaussian blur pass
 */

struct Uniforms {
    radiusX: f32,
    radiusY: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    let radius = i32(uniforms.radiusY);
    if (radius <= 0) {
        return textureSample(inputTex, inputSampler, uv);
    }
    
    // Compute sigma for Gaussian (radius ~= 3*sigma)
    let sigma = f32(radius) / 3.0;
    let sigma2 = sigma * sigma;
    
    var sum = vec4<f32>(0.0);
    var weightSum = 0.0;
    
    for (var i = -radius; i <= radius; i = i + 1) {
        let x = f32(i);
        let weight = exp(-(x * x) / (2.0 * sigma2));
        let offset = vec2<f32>(0.0, f32(i) * texelSize.y);
        sum = sum + textureSample(inputTex, inputSampler, uv + offset) * weight;
        weightSum = weightSum + weight;
    }
    
    return sum / weightSum;
}
`}},s=`# blur

Gaussian blur with separate X and Y radius controls

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| radiusX | float | 5 | 0-50 | Radius X |
| radiusY | float | 5 | 0-50 | Radius Y |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .blur()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&s&&(n.help=s);var f="filter/blur",m="filter",p="blur",d=n;export{d as default,f as effectId,p as effectName,s as help,m as namespace};
