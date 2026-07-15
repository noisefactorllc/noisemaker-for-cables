/* filter/smoothstep */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Smoothstep",namespace:"filter",func:"smoothstep",tags:["edges","util"],description:"Smooth Hermite interpolation between edges",globals:{edge0:{type:"float",default:0,uniform:"edge0",min:0,max:1,step:.01,randMax:.25,ui:{label:"edge 0",control:"slider"}},edge1:{type:"float",default:1,uniform:"edge1",min:0,max:1,step:.01,randMin:.75,ui:{label:"edge 1",control:"slider"}}},defaultProgram:`search synth, filter

cell()
  .smoothstep(edge1: 0.51)
  .write(o0)`,passes:[{name:"render",program:"smoothstep",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={smoothstep:{glsl:`/*
 * Smoothstep threshold effect
 * Creates smooth transition between edge0 and edge1
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float edge0;
uniform float edge1;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    color.rgb = smoothstep(edge0, edge1, color.rgb);

    fragColor = color;
}
`,wgsl:`/*
 * Smoothstep threshold effect
 * Creates smooth transition between edge0 and edge1
 */

struct Uniforms {
    edge0: f32,
    edge1: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let edge0 = uniforms.edge0;
    let edge1 = uniforms.edge1;

    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSampleLevel(inputTex, inputSampler, uv, 0.0);

    color = vec4<f32>(smoothstep(vec3<f32>(edge0), vec3<f32>(edge1), color.rgb), color.a);

    return color;
}
`}},r=`# smoothstep

Smooth Hermite interpolation between edges

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| edge0 | float | 0 | 0-1 | Edge 0 |
| edge1 | float | 1 | 0-1 | Edge 1 |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .smoothstep()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(s))t.shaders[o]={...e}}t&&r&&(t.help=r);var l="filter/smoothstep",f="filter",d="smoothstep",m=t;export{m as default,l as effectId,d as effectName,r as help,f as namespace};
