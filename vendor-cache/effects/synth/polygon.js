/* synth/polygon */
var n=class{constructor(o={}){this.state={},this.uniforms={},o.name&&(this.name=o.name),o.namespace&&(this.namespace=o.namespace),o.func&&(this.func=o.func),o.description&&(this.description=o.description),o.tags&&(this.tags=o.tags),o.globals&&(this.globals=o.globals),o.passes&&(this.passes=o.passes),o.textures&&(this.textures=o.textures),o.outputTex3d&&(this.outputTex3d=o.outputTex3d),o.outputGeo&&(this.outputGeo=o.outputGeo),o.uniformLayout&&(this.uniformLayout=o.uniformLayout),o.uniformLayouts&&(this.uniformLayouts=o.uniformLayouts),o.paramAliases&&(this.paramAliases=o.paramAliases),o.openCategories&&(this.openCategories=o.openCategories),o.defaultProgram&&(this.defaultProgram=o.defaultProgram),o.hidden&&(this.hidden=!0),o.deprecatedBy&&(this.deprecatedBy=o.deprecatedBy),o.onInit&&(this._configOnInit=o.onInit),o.onUpdate&&(this._configOnUpdate=o.onUpdate),o.onDestroy&&(this._configOnDestroy=o.onDestroy),o.asyncInit&&(this._configAsyncInit=o.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(o){return this._configOnUpdate?this._configOnUpdate.call(this,o):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(o){return this._configAsyncInit?this._configAsyncInit.call(this,o):Promise.resolve()}};var t=new n({name:"Polygon",namespace:"synth",func:"polygon",tags:["geometric"],description:"Geometric shape generator",globals:{sides:{type:"int",default:3,min:3,max:64,step:1,uniform:"sides",ui:{label:"sides",control:"slider"}},radius:{type:"float",default:.5,min:0,max:1,randMin:.5,uniform:"radius",ui:{label:"radius"}},smooth:{type:"float",default:.01,min:0,max:1,zero:0,randMax:.5,uniform:"smoothing",ui:{label:"smooth"}},rotation:{type:"float",default:0,min:-180,max:180,uniform:"rotation",ui:{label:"rotation",control:"slider"}},fgColor:{type:"color",default:[1,1,1],uniform:"fgColor",ui:{label:"fg color",control:"color",category:"color"}},fgAlpha:{type:"float",default:1,randMin:.85,min:0,max:1,uniform:"fgAlpha",ui:{label:"fg opacity",control:"slider",category:"color"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"color"}},bgAlpha:{type:"float",default:1,min:0,max:1,randMin:.85,uniform:"bgAlpha",ui:{label:"bg opacity",control:"slider",category:"color"}}},passes:[{name:"main",program:"shape",inputs:{},outputs:{color:"outputTex"}}]});var s={shape:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform int sides;
uniform float radius;
uniform float smoothing;
uniform float rotation;
uniform vec3 fgColor;
uniform float fgAlpha;
uniform vec3 bgColor;
uniform float bgAlpha;

out vec4 fragColor;

#define PI 3.14159265359

/* Regular polygon distance field built from polar math; draws a soft-edged shape. */
float polygon(vec2 st, float sides){
  float a = atan(st.y, st.x) + 3.14159265;
  float r = 6.2831853 / sides;
  return cos(floor(0.5 + a/r)*r - a) * length(st);
}

void main(){
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = globalCoord / fullResolution;
  st = (st - 0.5) * 2.0;
  st.x *= aspect;
  // Apply rotation
  float c = cos(rotation * PI / 180.0);
  float s = sin(rotation * PI / 180.0);
  st = vec2(st.x * c - st.y * s, st.x * s + st.y * c);
  float sidesF = float(max(sides, 3));
  // Rotate triangle so vertex points up
  if (sides == 3) {
      st = vec2(st.y, -st.x);
  }
  // Normalize by inradius so all shapes have consistent size
  float d = polygon(st, sidesF) / cos(PI / sidesF);
  float m = smoothstep(radius, radius - smoothing, d);
  
  // fgAlpha scales foreground visibility, bgAlpha scales background visibility
  float fgMask = m * fgAlpha;
  float bgMask = (1.0 - m) * bgAlpha;
  float totalAlpha = fgMask + bgMask;
  
  // Compute color as weighted blend (for non-zero alpha)
  vec3 outColor = totalAlpha > 0.0 
      ? (fgColor * fgMask + bgColor * bgMask) / totalAlpha
      : vec3(0.0);
  
  // Output premultiplied alpha for correct compositing
  fragColor = vec4(outColor * totalAlpha, totalAlpha);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> aspect: f32;
@group(0) @binding(2) var<uniform> sides: i32;
@group(0) @binding(3) var<uniform> radius: f32;
@group(0) @binding(4) var<uniform> smoothing: f32;
@group(0) @binding(5) var<uniform> rotation: f32;
@group(0) @binding(6) var<uniform> fgColor: vec3<f32>;
@group(0) @binding(7) var<uniform> fgAlpha: f32;
@group(0) @binding(8) var<uniform> bgColor: vec3<f32>;
@group(0) @binding(9) var<uniform> bgAlpha: f32;

const PI: f32 = 3.14159265359;

/* Regular polygon distance field built from polar math; draws a soft-edged shape. */
fn polygon(st: vec2<f32>, sides: f32) -> f32 {
  let a = atan2(st.y, st.x) + 3.14159265;
  let r = 6.2831853 / sides;
  return cos(floor(0.5 + a / r) * r - a) * length(st);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  var st = position.xy / resolution;
  st = (st - vec2<f32>(0.5, 0.5)) * 2.0;
  st.x *= aspect;
  // Apply rotation
  let c = cos(rotation * PI / 180.0);
  let s = sin(rotation * PI / 180.0);
  st = vec2<f32>(st.x * c - st.y * s, st.x * s + st.y * c);
  let sidesF = f32(max(sides, 3));
  // Rotate triangle so vertex points up
  if (sides == 3) {
      st = vec2<f32>(st.y, -st.x);
  }
  // Normalize by inradius so all shapes have consistent size
  let d = polygon(st, sidesF) / cos(PI / sidesF);
  let m = smoothstep(radius, radius - smoothing, d);
  
  // fgAlpha scales foreground visibility, bgAlpha scales background visibility
  let fgMask = m * fgAlpha;
  let bgMask = (1.0 - m) * bgAlpha;
  let totalAlpha = fgMask + bgMask;
  
  // Compute color as weighted blend (for non-zero alpha)
  var outColor: vec3<f32>;
  if (totalAlpha > 0.0) {
      outColor = (fgColor * fgMask + bgColor * bgMask) / totalAlpha;
  } else {
      outColor = vec3<f32>(0.0);
  }
  
  // Output premultiplied alpha for correct compositing
  return vec4<f32>(outColor * totalAlpha, totalAlpha);
}
`}},a=`# polygon

Geometric shape generator

## Description

Generates regular polygons with configurable sides, radius, rotation, and colors. Useful for creating basic geometric shapes as masks or base textures.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| sides | int | 3 | 3-64 | Sides |
| radius | float | 0.5 | 0-1 | Size |
| smooth | float | 0.01 | 0-1 | Edge smoothness |
| rotation | float | 0 | -180-180 | Rotation |
| fgColor | vec3 | 1,1,1 | - | Foreground Color |
| fgAlpha | float | 1 | 0-1 | Foreground Opacity |
| bgColor | vec3 | 0,0,0 | - | Background Color |
| bgAlpha | float | 1 | 0-1 | Background Opacity |

## Usage

\`\`\`
search synth

polygon()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[e,o]of Object.entries(s))t.shaders[e]={...o}}t&&a&&(t.help=a);var u="synth/polygon",p="synth",c="polygon",d=t;export{d as default,u as effectId,c as effectName,a as help,p as namespace};
