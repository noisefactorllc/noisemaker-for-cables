/* filter/sine */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new o({name:"Sine",namespace:"filter",func:"sine",tags:["color"],description:"Sine wave color transform",globals:{amount:{type:"float",default:7,uniform:"amount",min:0,max:20,step:.1,zero:0,ui:{label:"amount",control:"slider"}},colorMode:{type:"int",default:1,uniform:"colorMode",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}}},passes:[{name:"render",program:"sine",inputs:{inputTex:"inputTex"},uniforms:{amount:"amount",colorMode:"colorMode"},outputs:{fragColor:"outputTex"}}]});var r={sine:{glsl:`/*
 * Sine wave distortion
 * RGB mode: apply sine to R, G, B independently
 * Non-RGB mode: convert to luminance, apply sine, output grayscale
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float amount;
uniform float colorMode;

out vec4 fragColor;

float normalized_sine(float value) {
    return (sin(value) + 1.0) * 0.5;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    bool use_rgb = colorMode > 0.5;

    if (use_rgb) {
        color.r = normalized_sine(color.r * amount);
        color.g = normalized_sine(color.g * amount);
        color.b = normalized_sine(color.b * amount);
    } else {
        float lum = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        float result = normalized_sine(lum * amount);
        color.rgb = vec3(result);
    }

    fragColor = color;
}
`,wgsl:`/*
 * Sine wave distortion
 * RGB mode: apply sine to R, G, B independently
 * Non-RGB mode: convert to luminance, apply sine, output grayscale
 */

struct Uniforms {
    amount: f32,
    colorMode: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn normalized_sine(value: f32) -> f32 {
    return (sin(value) + 1.0) * 0.5;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let amount = uniforms.amount;
    let use_rgb = uniforms.colorMode > 0.5;

    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    if (use_rgb) {
        color.r = normalized_sine(color.r * amount);
        color.g = normalized_sine(color.g * amount);
        color.b = normalized_sine(color.b * amount);
    } else {
        let lum = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        let result = normalized_sine(lum * amount);
        color = vec4<f32>(result, result, result, color.a);
    }

    return color;
}
`}},i=`# sine

Sine wave color transform

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 7 | 0-20 | Transform intensity |
| colorMode | int | 1 (rgb) | mono, rgb | Mono or per-channel RGB |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .sine()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(r))n.shaders[t]={...e}}n&&i&&(n.help=i);var f="filter/sine",c="filter",m="sine",p=n;export{p as default,f as effectId,m as effectName,i as help,c as namespace};
