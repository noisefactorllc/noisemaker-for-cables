/* mixer/channelCombine */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"ChannelCombine",namespace:"mixer",func:"channelCombine",tags:["color"],description:"Combine separate surface inputs into R, G, B channels",starter:!1,globals:{rTex:{type:"surface",default:"none",ui:{label:"red source"}},gTex:{type:"surface",default:"none",ui:{label:"green source"}},bTex:{type:"surface",default:"none",ui:{label:"blue source"}},rLevel:{type:"float",default:100,uniform:"rLevel",min:0,max:100,ui:{label:"red level",control:"slider"}},gLevel:{type:"float",default:100,uniform:"gLevel",min:0,max:100,ui:{label:"green level",control:"slider"}},bLevel:{type:"float",default:100,uniform:"bLevel",min:0,max:100,ui:{label:"blue level",control:"slider"}}},defaultProgram:`search mixer, synth, filter

noise(ridges: true, colorMode: mono)
.write(o0)

perlin(colorMode: mono)
.write(o1)

gradient(type: linear)
.write(o2)

channelCombine(rTex: read(o0), gTex: read(o1), bTex: read(o2))
.write(o3)`,passes:[{name:"render",program:"channelCombine",inputs:{rTex:"rTex",gTex:"gTex",bTex:"bTex"},outputs:{fragColor:"outputTex"}}]});var o={channelCombine:{glsl:`#version 300 es
precision highp float;

uniform sampler2D rTex;
uniform sampler2D gTex;
uniform sampler2D bTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float rLevel;
uniform float gLevel;
uniform float bLevel;
out vec4 fragColor;

float luminance(vec4 c) {
    return dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    float r = luminance(texture(rTex, gl_FragCoord.xy / vec2(textureSize(rTex, 0)))) * rLevel / 100.0;
    float g = luminance(texture(gTex, gl_FragCoord.xy / vec2(textureSize(gTex, 0)))) * gLevel / 100.0;
    float b = luminance(texture(bTex, gl_FragCoord.xy / vec2(textureSize(bTex, 0)))) * bLevel / 100.0;

    fragColor = vec4(r, g, b, 1.0);
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var rTex : texture_2d<f32>;
@group(0) @binding(2) var gTex : texture_2d<f32>;
@group(0) @binding(3) var bTex : texture_2d<f32>;
@group(0) @binding(4) var<uniform> resolution : vec2<f32>;
@group(0) @binding(5) var<uniform> rLevel : f32;
@group(0) @binding(6) var<uniform> gLevel : f32;
@group(0) @binding(7) var<uniform> bLevel : f32;

fn luminance(c: vec4<f32>) -> f32 {
    return dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let st = position.xy / resolution;

    let r = luminance(textureSample(rTex, samp, st)) * rLevel / 100.0;
    let g = luminance(textureSample(gTex, samp, st)) * gLevel / 100.0;
    let b = luminance(textureSample(bTex, samp, st)) * bLevel / 100.0;

    return vec4<f32>(r, g, b, 1.0);
}
`}},s=`# channelCombine

Combine separate surface inputs into R, G, B channels

## Description

Builds an RGB image from three independent sources: the **luminance** of each
wired surface drives one output channel. Red comes from the luminance of the
**red source**, green from the **green source**, blue from the **blue
source**, each scaled by its level control. The output is fully opaque.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| rTex | surface | none | - | Red source |
| gTex | surface | none | - | Green source |
| bTex | surface | none | - | Blue source |
| rLevel | float | 100 | 0-100 | Red level |
| gLevel | float | 100 | 0-100 | Green level |
| bLevel | float | 100 | 0-100 | Blue level |

## Notes

- Each channel reads its source's Rec. 709 luminance (0.2126/0.7152/0.0722), not the source's same-named channel \u2014 a source's own color never passes through directly
- An unwired source binds a blank texture, so its channel renders black
- Wire sources with \`read(oN)\`, e.g. \`channelCombine(rTex: read(o0), gTex: read(o1), bTex: read(o2))\`

## Usage

\`\`\`
search mixer, synth

channelCombine()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&s&&(n.help=s);var c="mixer/channelCombine",f="mixer",m="channelCombine",p=n;export{p as default,c as effectId,m as effectName,s as help,f as namespace};
