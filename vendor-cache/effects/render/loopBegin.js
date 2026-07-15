/* render/loopBegin */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"LoopBegin",func:"loopBegin",namespace:"render",tags:["util","sim"],description:"Start accumulator loop, read from feedback buffer",globals:{alpha:{type:"float",default:50,min:0,max:100,uniform:"alpha",ui:{label:"alpha",control:"slider"}},intensity:{type:"float",default:100,min:0,max:100,uniform:"intensity",ui:{label:"intensity",control:"slider"}}},passes:[{name:"accumBlend",program:"loopBegin",inputs:{inputTex:"inputTex",accumTex:"global_accum"},outputs:{fragColor:"outputTex"}}]});var i={loopBegin:{glsl:`/**
 * begin - Blend input with accumulator buffer using lighten mode
 *
 * Reads from the shared accumulator texture (feedback from previous frame)
 * and blends with the current input using max (lighten) blend mode.
 * The result passes through to the next effect in the chain.
 */
#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D accumTex;
uniform vec2 resolution;
uniform float alpha;
uniform float intensity;

out vec4 fragColor;

void main() {
    vec2 st = gl_FragCoord.xy / resolution;

    vec4 inputColor = texture(inputTex, st);
    vec4 accum = texture(accumTex, st);

    // Normalize alpha from 0-100 to 0-1
    float a = alpha / 100.0;

    // Normalize intensity from 0-100 to 0-1
    float i = intensity / 100.0;

    // Lighten blend: max of input and accumulated
    vec4 blended = max(inputColor, accum * i);

    // Mix between pure input and blended based on alpha
    vec4 result = mix(inputColor, blended, a);

    // Preserve alpha
    result.a = max(inputColor.a, accum.a);

    fragColor = result;
}
`,wgsl:`/**
 * begin - Blend input with accumulator buffer using lighten mode
 *
 * Reads from the shared accumulator texture (feedback from previous frame)
 * and blends with the current input using max (lighten) blend mode.
 * The result passes through to the next effect in the chain.
 */

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var accumTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> alpha : f32;
@group(0) @binding(4) var<uniform> intensity : f32;

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = position.xy / dims;

    let inputColor = textureSample(inputTex, samp, st);
    let accum = textureSample(accumTex, samp, st);

    // Normalize alpha from 0-100 to 0-1
    let a = alpha / 100.0;

    // Normalize intensity from 0-100 to 0-1
    let i = intensity / 100.0;

    // Lighten blend: max of input and accumulated
    let blended = max(inputColor, accum * i);

    // Mix between pure input and blended based on alpha
    var result = mix(inputColor, blended, a);

    // Preserve alpha
    result.a = max(inputColor.a, accum.a);

    return result;
}
`}},r=`# loopBegin

Start accumulator loop, read from feedback buffer

## Description

Reads from a shared accumulator buffer and blends with the incoming texture using lighten (max) mode. Use \`loopEnd()\` to complete the feedback loop.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 50 | 0-100 | Alpha |
| intensity | float | 100 | 0-100 | Intensity |

## Usage

\`\`\`
search synth, filter, render

noise(seed: 1, ridges: true)
  .loopBegin()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[a,e]of Object.entries(i))t.shaders[a]={...e}}t&&r&&(t.help=r);var p="render/loopBegin",m="render",d="loopBegin",f=t;export{f as default,p as effectId,d as effectName,r as help,m as namespace};
