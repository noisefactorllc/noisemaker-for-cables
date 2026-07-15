/* render/loopEnd */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"LoopEnd",func:"loopEnd",namespace:"render",tags:["util","sim"],description:"End accumulator loop, write back to feedback buffer",globals:{},passes:[{name:"feedback",program:"copy",inputs:{inputTex:"inputTex"},outputs:{fragColor:"global_accum"}},{name:"output",program:"copy",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={copy:{glsl:`/*
 * Simple copy/blit shader - copies input to output unchanged.
 * Used for feedback texture updates.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    fragColor = texture(inputTex, uv);
}
`,wgsl:`/*
 * Simple copy/blit shader - copies input to output unchanged.
 * Used for feedback texture updates.
 */

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = pos.xy / dims;
    return textureSample(inputTex, inputSampler, uv);
}
`}},o=`# loopEnd

End accumulator loop, write back to feedback buffer

## Description

Writes the chain result back to the shared accumulator buffer, completing the feedback loop. The processed result is written back to the same accumulator texture that \`loopBegin()\` reads from, creating a temporal feedback loop.

## Parameters

No configurable parameters.

## Usage

\`\`\`
search synth, filter, render

noise(seed: 1, ridges: true)
  .loopEnd()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(s))t.shaders[r]={...e}}t&&o&&(t.help=o);var d="render/loopEnd",c="render",l="loopEnd",f=t;export{f as default,d as effectId,l as effectName,o as help,c as namespace};
