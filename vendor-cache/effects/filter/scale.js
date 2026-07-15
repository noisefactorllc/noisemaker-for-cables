/* filter/scale */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Scale",namespace:"filter",func:"scale",tags:["transform"],description:"Scale transform",globals:{x:{type:"float",default:.5,min:0,max:10,zero:1,uniform:"scaleX",ui:{label:"scale x"}},y:{type:"float",default:.5,min:0,max:10,zero:1,uniform:"scaleY",ui:{label:"scale y"}},centerX:{type:"float",default:.5,min:0,max:1,uniform:"centerX",ui:{label:"center x"}},centerY:{type:"float",default:.5,min:0,max:1,uniform:"centerY",ui:{label:"center y"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},passes:[{name:"main",program:"scale",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var a={scale:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float scaleX;
uniform float scaleY;
uniform float centerX;
uniform float centerY;
uniform int wrap;
uniform sampler2D inputTex;

out vec4 fragColor;

void main(){
  // Compute global UV from tile-local coordinates
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = globalCoord / fullResolution;
  
  // Apply scale transform in global UV space (centered and aspect-corrected)
  vec2 c = vec2(-centerX, centerY);
  st -= c;
  st.x *= aspect;
  st = st / vec2(scaleX, scaleY);
  st.x /= aspect;
  st += c;
  
  // Convert global UV to local UV for sampling inputTex
  vec2 localUV = (st * fullResolution - tileOffset) / resolution;
  
  // Apply wrap mode to local UV
  if (wrap == 0) {
      // mirror
      localUV = abs(mod(localUV + 1.0, 2.0) - 1.0);
  } else if (wrap == 1) {
      // repeat
      localUV = fract(localUV);
  } else {
      // clamp
      localUV = clamp(localUV, 0.0, 1.0);
  }
  
  fragColor = vec4(texture(inputTex, localUV).rgb, 1.0);
}`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> resolution: vec2<f32>;
@group(0) @binding(3) var<uniform> aspect: f32;
@group(0) @binding(4) var<uniform> scaleX: f32;
@group(0) @binding(5) var<uniform> scaleY: f32;
@group(0) @binding(6) var<uniform> centerX: f32;
@group(0) @binding(7) var<uniform> centerY: f32;
@group(0) @binding(8) var<uniform> wrap: i32;

/* Scales UVs around an arbitrary center point. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var st = position.xy / resolution;
  let center = vec2<f32>(-centerX, centerY);
  st -= center;
  st.x *= aspect;
  st /= vec2<f32>(scaleX, scaleY);
  st.x /= aspect;
  st += center;
  
  // Apply wrap mode
  if (wrap == 0) {
      // mirror
      st = abs(((st + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
  } else if (wrap == 1) {
      // repeat
      st = (st % 1.0 + 1.0) % 1.0;
  } else {
      // clamp
      st = clamp(st, vec2<f32>(0.0), vec2<f32>(1.0));
  }
  
  let color = textureSample(inputTex, samp, st).rgb;
  return vec4<f32>(color, 1.0);
}
`}},s=`# scale

Scale transform

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale x | float | 0.5 | 0-10 | Horizontal scale |
| scale y | float | 0.5 | 0-10 | Vertical scale |
| centerX | float | 0.5 | 0-1 | Horizontal center |
| centerY | float | 0.5 | 0-1 | Vertical center |
| wrap | int | repeat | mirror/repeat/clamp | Wrap |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scale()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&s&&(t.help=s);var u="filter/scale",p="filter",f="scale",m=t;export{m as default,u as effectId,f as effectName,s as help,p as namespace};
