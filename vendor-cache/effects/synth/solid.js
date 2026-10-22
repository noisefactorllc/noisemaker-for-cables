/* synth/solid */
var s=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new s({name:"Solid",namespace:"synth",func:"solid",tags:["color"],description:"Solid color fill",globals:{color:{type:"color",default:[.5,.5,.5],uniform:"color",ui:{label:"color",control:"color"}},alpha:{type:"float",default:1,min:0,max:1,randMin:.5,uniform:"alpha",ui:{label:"opacity",control:"slider"}}},passes:[{name:"main",program:"solid",inputs:{},outputs:{color:"outputTex"}}]});var o={solid:{glsl:`#version 300 es
precision highp float;

uniform vec3 color;
uniform float alpha;

out vec4 fragColor;

/* Produces a constant color with premultiplied alpha. */
void main() {
  // Premultiply RGB by alpha for correct compositing
  fragColor = vec4(color * alpha, alpha);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> color: vec3<f32>;
@group(0) @binding(1) var<uniform> alpha: f32;

/* Produces a constant color with premultiplied alpha. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  // Premultiply RGB by alpha for correct compositing
  return vec4<f32>(color * alpha, alpha);
}
`}},n=`# solid

Solid color fill

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | [0.5, 0.5, 0.5] | - | Color |
| alpha | float | 1.0 | 0-1 | Opacity (0 = transparent, 1 = opaque) |

## Usage

\`\`\`
search synth

solid()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[r,t]of Object.entries(o))e.shaders[r]={...t}}e&&n&&(e.help=n);var p="synth/solid",h="synth",d="solid",c=e;export{c as default,p as effectId,d as effectName,n as help,h as namespace};
