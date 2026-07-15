/* filter/bc */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"BC",namespace:"filter",func:"bc",tags:["color"],hidden:!0,deprecatedBy:"adjust",description:"Deprecated: use 'adjust' instead. Adjust brightness and/or contrast",globals:{brightness:{type:"float",default:1,uniform:"brightness",min:0,max:10,ui:{label:"brightness",control:"slider"}},contrast:{type:"float",default:.5,uniform:"contrast",min:0,max:1,ui:{label:"contrast",control:"slider"}}},passes:[{name:"render",program:"bc",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={bc:{glsl:`/*
 * Brightness and contrast adjustment effect
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float brightness;
uniform float contrast;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    // Apply brightness (multiply)
    color.rgb *= brightness;

    // Apply contrast (0..1 -> 0..2)
    float contrastFactor = contrast * 2.0;
    color.rgb = (color.rgb - 0.5) * contrastFactor + 0.5;

    fragColor = color;
}
`,wgsl:`/*
 * Brightness and contrast adjustment effect
 */

struct Uniforms {
    data: array<vec4<f32>, 1>,
};

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let brightness = uniforms.data[0].x;
    let contrast = uniforms.data[0].y;
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    // Apply brightness (multiply)
    color = vec4<f32>(color.rgb * brightness, color.a);

    // Apply contrast (0..1 -> 0..2)
    let contrastFactor = contrast * 2.0;
    color = vec4<f32>((color.rgb - 0.5) * contrastFactor + 0.5, color.a);

    return color;
}
`}},o=`# bc

Adjust brightness and/or contrast

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| brightness | float | 1 | 0-10 | Brightness |
| contrast | float | 0.5 | 0-1 | Contrast |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .bc()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(s).length>0){e.shaders||(e.shaders={});for(let[r,t]of Object.entries(s))e.shaders[r]={...t}}e&&o&&(e.help=o);var c="filter/bc",p="filter",f="bc",d=e;export{d as default,c as effectId,f as effectName,o as help,p as namespace};
