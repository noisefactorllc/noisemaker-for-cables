/* mixer/alphaMask */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var o=new t({name:"Alpha Mask",namespace:"mixer",func:"alphaMask",tags:["blend"],description:"Alpha transparency blend",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mix:{type:"float",default:0,uniform:"mixAmt",min:-100,max:100,ui:{label:"mix",control:"slider",enabledBy:{param:"maskMode",eq:!1}}},maskMode:{type:"boolean",default:!1,uniform:"maskMode",ui:{label:"grayscale mask",control:"checkbox"}}},defaultProgram:`search mixer, synth

polygon(smooth: 0, bgAlpha: 0)
  .write(o0)

 noise(scaleX: 100, scaleY: 100)
  .alphaMask(tex: read(o0))
  .write(o1)
`,paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"alphaMask",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{mixAmt:"mix",maskMode:"maskMode"},outputs:{fragColor:"outputTex"}}]});var r={alphaMask:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float mixAmt;
uniform bool maskMode;
out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 color1 = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 color2 = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    // luminance mask mode
    if (maskMode) {
        float maskVal = dot(color2.rgb, vec3(0.299, 0.587, 0.114));
        fragColor = vec4(color1.rgb, color1.a * maskVal);
        return;
    }

    // alpha blend. slider direction selects which input is on top, so either slot
    // can serve as the alpha source \u2014 slide negative for A-on-top, positive for
    // B-on-top. each half reaches a full Porter-Duff source-over at the midpoint.
    vec4 color;
    if (mixAmt < 0.0) {
        vec4 AoverB = color2 * (1.0 - color1.a) + color1 * color1.a;
        color = mix(color1, AoverB, map(mixAmt, -100.0, 0.0, 0.0, 1.0));
    } else {
        vec4 BoverA = color1 * (1.0 - color2.a) + color2 * color2.a;
        color = mix(BoverA, color2, map(mixAmt, 0.0, 100.0, 0.0, 1.0));
    }

    color.a = max(color1.a, color2.a);
    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> mixAmt : f32;
@group(0) @binding(4) var<uniform> maskMode : i32;

fn map_range(value : f32, inMin : f32, inMax : f32, outMin : f32, outMax : f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    var st = position.xy / dims;

    let color1 = textureSample(inputTex, samp, st);
    let color2 = textureSample(tex, samp, st);

    // luminance mask mode
    if (maskMode != 0) {
        let maskVal = dot(color2.rgb, vec3<f32>(0.299, 0.587, 0.114));
        return vec4<f32>(color1.rgb, color1.a * maskVal);
    }

    // alpha blend. slider direction selects which input is on top, so either slot
    // can serve as the alpha source \u2014 slide negative for A-on-top, positive for
    // B-on-top. each half reaches a full Porter-Duff source-over at the midpoint.
    var color : vec4<f32>;
    if (mixAmt < 0.0) {
        let AoverB = color2 * (1.0 - color1.a) + color1 * color1.a;
        color = mix(color1, AoverB, map_range(mixAmt, -100.0, 0.0, 0.0, 1.0));
    } else {
        let BoverA = color1 * (1.0 - color2.a) + color2 * color2.a;
        color = mix(BoverA, color2, map_range(mixAmt, 0.0, 100.0, 0.0, 1.0));
    }

    color.a = max(color1.a, color2.a);
    return color;
}
`}},a=`# alphaMask

Alpha transparency blend

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mix | float | 0 | -100-100 | Mix |
| maskMode | boolean | false | - | Use the mask's grayscale luminance instead of its alpha |

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .alphaMask(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(o&&Object.keys(r).length>0){o.shaders||(o.shaders={});for(let[n,e]of Object.entries(r))o.shaders[n]={...e}}o&&a&&(o.help=a);var c="mixer/alphaMask",m="mixer",p="alphaMask",f=o;export{f as default,c as effectId,p as effectName,a as help,m as namespace};
