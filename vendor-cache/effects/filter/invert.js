/* filter/invert */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Invert",namespace:"filter",func:"invert",tags:["color"],description:"Invert image luminance",globals:{mode:{type:"int",default:0,uniform:"mode",choices:{full:0,solarize:1},ui:{label:"mode",control:"dropdown"}}},passes:[{name:"render",program:"inv",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={inv:{glsl:`/*
 * Invert brightness effect
 * mode 0 (full, default): simple RGB inversion, 1.0 - value
 * mode 1 (solarize): Solarize parity, min(v, 1.0 - v) per channel
 *   (PS: output = v <= 128 ? v : 255 - v, equivalent to min(v, 1-v) in 0..1)
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform int mode;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    if (mode == 1) {
        color.rgb = min(color.rgb, 1.0 - color.rgb);
    } else {
        color.rgb = 1.0 - color.rgb;
    }

    fragColor = color;
}
`,wgsl:`/*
 * Invert brightness effect
 * mode 0 (full, default): simple RGB inversion, 1.0 - value
 * mode 1 (solarize): Solarize parity, min(v, 1.0 - v) per channel
 *   (PS: output = v <= 128 ? v : 255 - v, equivalent to min(v, 1-v) in 0..1)
 */

struct Uniforms {
    mode: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    if (uniforms.mode == 1) {
        color = vec4<f32>(min(color.rgb, 1.0 - color.rgb), color.a);
    } else {
        color = vec4<f32>(1.0 - color.rgb, color.a);
    }

    return color;
}
`}},o=`# invert

Invert image luminance

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | full | full/solarize | full inverts every channel (1-v); solarize folds bright values down (min(v, 1-v)) |

## Notes

- \`mode=full\` (default) is byte-identical to this effect's pre-\`mode\` behavior.
- \`mode=solarize\` is Solarize parity: per RGB channel, \`v <= 128 ? v : 255 - v\`
  (equivalently \`min(v, 1-v)\` in the shader's 0..1 range). Output never exceeds 0.5 per
  channel - dark input stays unchanged, bright input inverts and folds down into darkness
  (classic Sabattier effect).
- Alpha is always preserved unchanged, in both modes.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .invert()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&o&&(n.help=o);var p="filter/invert",f="filter",c="invert",d=n;export{d as default,p as effectId,c as effectName,o as help,f as namespace};
