/* filter/repeat */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex&&(this.outputTex=t.outputTex),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.outputXyz&&(this.outputXyz=t.outputXyz),t.outputVel&&(this.outputVel=t.outputVel),t.outputRgba&&(this.outputRgba=t.outputRgba),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Repeat",namespace:"filter",func:"repeat",tags:["tiling","transform"],description:"Tiling repeat",globals:{x:{type:"float",default:3,min:1,max:20,zero:1,uniform:"x",ui:{label:"repeat x"}},y:{type:"float",default:3,min:1,max:20,zero:1,uniform:"y",ui:{label:"repeat y"}},offsetX:{type:"float",default:0,min:-1,max:1,uniform:"offsetX",ui:{label:"offset x"}},offsetY:{type:"float",default:0,min:-1,max:1,uniform:"offsetY",ui:{label:"offset y"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},passes:[{name:"main",program:"repeat",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var s={repeat:{glsl:`#version 300 es
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
      st = abs((st + 1.0) - 2.0 * floor((st + 1.0) / 2.0) - 1.0);
  } else if (wrap == 1) {
      // repeat
      st = fract(st);
  } else {
      // clamp
      st = clamp(st, vec2<f32>(0.0), vec2<f32>(1.0));
  }
  
  return vec4<f32>(textureSample(inputTex, samp, st).rgb, 1.0);
}
`}},a=`# repeat

Tiling repeat

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| x | float | 3 | 1-20 | Horizontal tiles |
| y | float | 3 | 1-20 | Vertical tiles |
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
`;if(e&&Object.keys(s).length>0){e.shaders||(e.shaders={});for(let[r,t]of Object.entries(s))e.shaders[r]={...t}}e&&a&&(e.help=a);var p="filter/repeat",f="filter",m="repeat",c=e;export{c as default,p as effectId,m as effectName,a as help,f as namespace};
