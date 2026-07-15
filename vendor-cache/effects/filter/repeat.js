/* filter/repeat */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Repeat",namespace:"filter",func:"repeat",tags:["tiling","transform"],description:"Tiling repeat",globals:{x:{type:"float",default:3,min:1,max:20,zero:1,uniform:"x",ui:{label:"repeat x"}},y:{type:"float",default:3,min:1,max:20,zero:1,uniform:"y",ui:{label:"repeat y"}},offsetX:{type:"float",default:0,min:-1,max:1,uniform:"offsetX",ui:{label:"offset x"}},offsetY:{type:"float",default:0,min:-1,max:1,uniform:"offsetY",ui:{label:"offset y"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},passes:[{name:"main",program:"repeat",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var o={repeat:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float aspect;
uniform float x;
uniform float y;
uniform float offsetX;
uniform float offsetY;
uniform int wrap;
uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;

out vec4 fragColor;

void main(){
  // Compute global coordinate
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  
  // Compute global UV
  vec2 globalUV = globalCoord / fullResolution;
  
  // Apply repeat transformation in global space
  vec2 st = globalUV;
  st.x *= aspect;
  st = st * vec2(x, y) + vec2(offsetX * aspect, offsetY);
  st.x /= aspect;
  
  // Apply wrap mode
  if (wrap == 0) {
      // mirror
      st = abs(mod(st + 1.0, 2.0) - 1.0);
  } else if (wrap == 1) {
      // repeat
      st = fract(st);
  } else {
      // clamp
      st = clamp(st, 0.0, 1.0);
  }
  
  // Convert warped global UV to local UV for sampling
  vec2 localUV = (st * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
  
  // For seamless tiling across tile boundaries, apply wrap to local UV
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
@group(0) @binding(6) var<uniform> offsetX: f32;
@group(0) @binding(7) var<uniform> offsetY: f32;
@group(0) @binding(8) var<uniform> wrap: i32;

/* Tiles the input texture across the screen. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var st = position.xy / resolution;
  st.x = st.x * aspect;
  st = st * vec2<f32>(x, y) + vec2<f32>(offsetX * aspect, offsetY);
  st.x = st.x / aspect;
  
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
  
  return vec4<f32>(textureSample(inputTex, samp, st).rgb, 1.0);
}
`}},s=`# repeat

Tiling repeat

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| repeat x | float | 3 | 1-20 | Horizontal tiles |
| repeat y | float | 3 | 1-20 | Vertical tiles |
| offsetX | float | 0 | -1-1 | Horizontal offset |
| offsetY | float | 0 | -1-1 | Vertical offset |
| wrap | int | repeat | mirror/repeat/clamp | Wrap |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .repeat()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&s&&(t.help=s);var p="filter/repeat",u="filter",c="repeat",m=t;export{m as default,p as effectId,c as effectName,s as help,u as namespace};
