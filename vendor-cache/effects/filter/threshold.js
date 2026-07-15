/* filter/threshold */
var s=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new s({name:"Threshold",namespace:"filter",func:"threshold",tags:["color","edges"],description:"Threshold/step function",globals:{level:{type:"float",default:.5,min:0,max:1,randMin:.5,randMax:.75,uniform:"level",ui:{label:"level"}},sharpness:{type:"float",default:.5,min:0,max:1,uniform:"sharpness",ui:{label:"sharpness"}}},passes:[{name:"main",program:"thresh",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var r={thresh:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float level;
uniform float sharpness;

out vec4 fragColor;

/* Binary threshold with adjustable edge softness. */
void main(){
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = gl_FragCoord.xy / vec2(textureSize(inputTex,0));
  vec4 c = texture(inputTex, st);
  float l = dot(c.rgb, vec3(0.299,0.587,0.114));
  float e = smoothstep(level - sharpness, level + sharpness, l);
  fragColor = vec4(vec3(e),1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> level: f32;
@group(0) @binding(3) var<uniform> sharpness: f32;

/* Binary threshold with adjustable edge softness. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let st = position.xy / vec2<f32>(textureDimensions(inputTex, 0));
  let c = textureSample(inputTex, samp, st);
  let l = dot(c.rgb, vec3<f32>(0.299, 0.587, 0.114));
  let e = smoothstep(level - sharpness, level + sharpness, l);
  return vec4<f32>(vec3<f32>(e), 1.0);
}
`}},i=`# threshold

Threshold/step function

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| level | float | 0.5 | 0-1 | - |
| sharpness | float | 0.5 | 0-1 | - |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .threshold()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(r))t.shaders[n]={...e}}t&&i&&(t.help=i);var p="filter/threshold",f="filter",h="threshold",d=t;export{d as default,p as effectId,h as effectName,i as help,f as namespace};
