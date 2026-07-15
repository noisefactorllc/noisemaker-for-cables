/* filter/motionBlur */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Motion Blur",func:"motionBlur",tags:["lens","blur"],description:"Simple motion blur via frame blending",globals:{amount:{type:"float",default:50,min:0,max:100,uniform:"amount",ui:{label:"amount",control:"slider"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"state"}}},textures:{_selfTex:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"main",program:"motionBlur",inputs:{inputTex:"inputTex",selfTex:"_selfTex"},outputs:{fragColor:"outputTex"}},{name:"feedback",program:"copy",inputs:{inputTex:"outputTex"},outputs:{fragColor:"_selfTex"}}]});var i={copy:{glsl:`/*
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
`},motionBlur:{glsl:`/*
 * Motion Blur - Simple frame blending shader.
 * Mixes current input with previous frame for a motion blur effect.
 * Amount 0-100 maps to mix factor (stronger at higher values).
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;   // Live input from previous effect
uniform sampler2D selfTex;    // Feedback buffer (previous frame output)
uniform vec2 resolution;
uniform float amount;
uniform bool resetState;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // If resetState is true, bypass feedback and return input directly
    if (resetState) {
        fragColor = texture(inputTex, uv);
        return;
    }

    vec4 current = texture(inputTex, uv);
    vec4 previous = texture(selfTex, uv);
    
    // Map amount 0-100 to 0-0.8 (clamped)
    float mixFactor = clamp(amount * 0.008, 0.0, 0.98);
    
    fragColor = mix(current, previous, mixFactor);
}
`,wgsl:`/*
 * Motion Blur - Simple frame blending shader (WGSL).
 * Mixes current input with previous frame for a motion blur effect.
 * Amount 0-100 maps to mix factor (stronger at higher values).
 */

struct Uniforms {
    resolution: vec2<f32>,
    time: f32,
    seed: i32,
    amount: f32,
    resetState: i32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;
@group(0) @binding(3) var selfTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = pos.xy / uniforms.resolution;
    
    // If resetState is true, bypass feedback and return input directly
    if (uniforms.resetState != 0) {
        return textureSample(inputTex, texSampler, uv);
    }

    let current = textureSample(inputTex, texSampler, uv);
    let previous = textureSample(selfTex, texSampler, uv);
    
    // Map amount 0-100 to 0-0.8 (clamped)
    let mixFactor = clamp(uniforms.amount * 0.008, 0.0, 0.98);
    
    return mix(current, previous, mixFactor);
}
`}},o=`# motionBlur

Simple motion blur via frame blending

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 50 | 0-100 | Amount |
| resetState | boolean | false | - | State |

## Notes

The effect maintains an internal feedback buffer that stores the previous frame output. Each frame blends the current input with this buffer based on the amount parameter. Higher values create longer motion trails.

The amount is internally clamped at 98% to prevent complete freeze.

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .motionBlur()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(i))t.shaders[r]={...e}}t&&o&&(t.help=o);var l="filter/motionBlur",f="filter",m="motionBlur",c=t;export{c as default,l as effectId,m as effectName,o as help,f as namespace};
