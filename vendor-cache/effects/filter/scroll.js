/* filter/scroll */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Scroll",namespace:"filter",func:"scroll",tags:["transform"],description:"Scrolling offset animation",globals:{x:{type:"float",default:0,min:-10,max:10,uniform:"x",ui:{label:"offset x"}},y:{type:"float",default:0,min:-10,max:10,uniform:"y",ui:{label:"offset y"}},speedX:{type:"float",default:1,min:-10,max:10,zero:0,uniform:"speedX",ui:{label:"speed x"}},speedY:{type:"float",default:1,min:-10,max:10,zero:0,uniform:"speedY",ui:{label:"speed y"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},defaultProgram:`search filter, synth

testPattern()
.scroll(speedX: 1, speedY: 1)
.write(o0)`,passes:[{name:"main",program:"scroll",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var o={scroll:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float x;
uniform float y;
uniform float speedX;
uniform float speedY;
uniform float time;
uniform int wrap;
uniform sampler2D inputTex;

out vec4 fragColor;

/* Scrolls texture coordinates with wraparound. */
void main(){
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 globalUV = globalCoord / fullResolution;
  
  globalUV.x *= aspect;
  vec2 offset = vec2(-x + time * -speedX, y + time * speedY);
  offset.x *= aspect;
  globalUV += offset;
  globalUV.x /= aspect;
  
  // Convert to local UV for sampling
  vec2 localUV = (globalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
  
  // Apply wrap mode in local UV space to constrain to tile bounds
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
@group(0) @binding(4) var<uniform> x: f32;
@group(0) @binding(5) var<uniform> y: f32;
@group(0) @binding(6) var<uniform> speedX: f32;
@group(0) @binding(7) var<uniform> speedY: f32;
@group(0) @binding(8) var<uniform> time: f32;
@group(0) @binding(9) var<uniform> wrap: i32;

/* Scrolls texture coordinates with wraparound. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var st = position.xy / resolution;
  st.x *= aspect;
  var offset = vec2<f32>(-x + time * -speedX, y + time * speedY);
  offset.x *= aspect;
  st += offset;
  st.x /= aspect;
  
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
  
  let color = textureSampleLevel(inputTex, samp, st, 0.0).rgb;
  return vec4<f32>(color, 1.0);
}
`}},s=`# scroll

Scrolling offset animation

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| offsetX | float | 0 | -10-10 | - |
| offsetY | float | 0 | -10-10 | - |
| speedX | float | 1 | -10-10 | - |
| speedY | float | 1 | -10-10 | - |
| wrap | int | repeat | mirror/repeat/clamp | Wrap |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scroll()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&s&&(t.help=s);var p="filter/scroll",u="filter",c="scroll",m=t;export{m as default,p as effectId,c as effectName,s as help,u as namespace};
