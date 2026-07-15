/* filter/channel */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Channel",namespace:"filter",func:"channel",tags:["color","util"],description:"Channel isolation (r, g, b, or a)",globals:{channel:{type:"member",default:"channel.r",enum:"channel",uniform:"channel",ui:{label:"channel"}},scale:{type:"float",default:1,min:-10,max:10,uniform:"scale",ui:{label:"scale"}},offset:{type:"float",default:0,min:-10,max:10,uniform:"offset",ui:{label:"offset"}}},passes:[{name:"main",program:"channel",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={channel:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int channel;
uniform float scale;
uniform float offset;

out vec4 fragColor;

/* Extracts a single channel (r=0, g=1, b=2, a=3) as grayscale. */
void main(){
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = (gl_FragCoord.xy - 0.5) / vec2(textureSize(inputTex, 0));
  vec4 c = texture(inputTex, st);
  
  float v;
  if (channel == 0) {
    v = c.r;
  } else if (channel == 1) {
    v = c.g;
  } else if (channel == 2) {
    v = c.b;
  } else {
    v = c.a;
  }
  
  v = fract(v * scale + offset);
  fragColor = vec4(vec3(v), 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> channel: i32;
@group(0) @binding(3) var<uniform> scale: f32;
@group(0) @binding(4) var<uniform> offset: f32;

/* Extracts a single channel (r=0, g=1, b=2, a=3) as grayscale. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let st = position.xy / vec2<f32>(textureDimensions(inputTex, 0));
  let c = textureSample(inputTex, samp, st);
  
  var v: f32;
  if (channel == 0) {
    v = c.r;
  } else if (channel == 1) {
    v = c.g;
  } else if (channel == 2) {
    v = c.b;
  } else {
    v = c.a;
  }
  
  v = fract(v * scale + offset);
  return vec4<f32>(vec3<f32>(v), 1.0);
}
`}},r=`# channel

Channel isolation (r, g, b, or a)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| channel | member | channel.r | - | - |
| scale | float | 1 | -10-10 | - |
| offset | float | 0 | -10-10 | - |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .channel()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(a))n.shaders[s]={...e}}n&&r&&(n.help=r);var u="filter/channel",c="filter",p="channel",h=n;export{h as default,u as effectId,p as effectName,r as help,c as namespace};
