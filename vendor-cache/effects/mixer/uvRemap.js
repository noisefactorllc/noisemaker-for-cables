/* mixer/uvRemap */
var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new r({name:"UvRemap",namespace:"mixer",func:"uvRemap",tags:["blend","distort"],description:"Remap UVs of one input using color channels of another",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mapSource:{type:"int",default:0,uniform:"mapSource",choices:{sourceA:0,sourceB:1},ui:{label:"map source",control:"dropdown"}},channel:{type:"int",default:0,uniform:"channel",choices:{redGreen:0,redBlue:1,greenBlue:2},ui:{label:"channel",control:"dropdown"}},scale:{type:"float",default:100,uniform:"scale",min:0,max:200,randMin:2,randMax:20,ui:{label:"scale",control:"slider"}},offset:{type:"float",default:0,uniform:"offset",min:-1,max:1,ui:{label:"offset",control:"slider"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{clamp:0,mirror:1,repeat:2},ui:{label:"wrap",control:"dropdown"}}},defaultProgram:`search mixer, synth

pattern()
.write(o0)

noise(ridges: true)
.uvRemap(tex: read(o0), scale: 25)
.write(o1)`,passes:[{name:"render",program:"uvRemap",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var a={uvRemap:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mapSource;
uniform int channel;
uniform float scale;
uniform float offset;
uniform int wrap;

out vec4 fragColor;

float mirrorWrap(float t) {
    float m = mod(t, 2.0);
    return m > 1.0 ? 2.0 - m : m;
}

vec2 applyWrap(vec2 uv, int wrapMode) {
    if (wrapMode == 0) {
        return clamp(uv, 0.0, 1.0);
    } else if (wrapMode == 1) {
        return vec2(mirrorWrap(uv.x), mirrorWrap(uv.y));
    } else {
        return fract(uv);
    }
}

void main() {
    vec2 localUV = gl_FragCoord.xy / resolution;
    vec4 colorA = texture(inputTex, localUV);
    vec4 colorB = texture(tex, localUV);

    vec4 mapColor = (mapSource == 0) ? colorA : colorB;
    int sampleFromB = (mapSource == 0) ? 1 : 0;

    vec2 rawUV;
    if (channel == 0) {
        rawUV = mapColor.rg;
    } else if (channel == 1) {
        rawUV = vec2(mapColor.r, mapColor.b);
    } else {
        rawUV = vec2(mapColor.g, mapColor.b);
    }

    float s = scale / 100.0;
    vec2 remappedUV = rawUV * s + offset;
    remappedUV = applyWrap(remappedUV, wrap);

    vec2 sampleUV = (remappedUV * fullResolution - tileOffset) / resolution;
    sampleUV = fract(sampleUV);

    vec4 result;
    if (sampleFromB == 1) {
        result = texture(tex, sampleUV);
    } else {
        result = texture(inputTex, sampleUV);
    }

    fragColor = result;
}`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> mapSource : i32;
@group(0) @binding(4) var<uniform> channel : i32;
@group(0) @binding(5) var<uniform> scale : f32;
@group(0) @binding(6) var<uniform> offset : f32;
@group(0) @binding(7) var<uniform> wrap : i32;


fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn mirrorWrap(t: f32) -> f32 {
    let m = modulo(t, 2.0);
    if (m > 1.0) {
        return 2.0 - m;
    }
    return m;
}

fn applyWrap(uv: vec2<f32>, wrapMode: i32) -> vec2<f32> {
    if (wrapMode == 0) {
        // Clamp
        return clamp(uv, vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0));
    } else if (wrapMode == 1) {
        // Mirror
        return vec2<f32>(mirrorWrap(uv.x), mirrorWrap(uv.y));
    } else {
        // Repeat
        return fract(uv);
    }
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = pos.xy / dims;

    let colorA = textureSample(inputTex, samp, st);
    let colorB = textureSample(tex, samp, st);

    // Choose map and sample sources
    var mapColor: vec4<f32>;
    var sampleFromB: i32;

    if (mapSource == 0) {
        mapColor = colorB;
        sampleFromB = 0;
    } else {
        mapColor = colorA;
        sampleFromB = 1;
    }

    // Extract UV channels
    var rawUV: vec2<f32>;
    if (channel == 0) {
        rawUV = mapColor.rg;
    } else if (channel == 1) {
        rawUV = vec2<f32>(mapColor.r, mapColor.b);
    } else {
        rawUV = vec2<f32>(mapColor.g, mapColor.b);
    }

    // Apply scale (percentage: 100 = identity) and offset
    let s = scale / 100.0;
    var remappedUV = rawUV * s + offset;

    // Apply wrap mode
    remappedUV = applyWrap(remappedUV, wrap);

    // Sample the other texture at remapped UVs
    var result: vec4<f32>;
    if (sampleFromB == 1) {
        result = textureSample(tex, samp, remappedUV);
    } else {
        result = textureSample(inputTex, samp, remappedUV);
    }

    return result;
}
`}},o=`# uvRemap

Remap UVs of one input using color channels of another

## Description

Uses the color channels of one input as UV coordinates to sample the other input. This creates distortion, displacement, and feedback effects by treating pixel color values as texture lookup coordinates. The map source provides the UV data, the other source is sampled at those remapped coordinates.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mapSource | int | sourceA | sourceA/sourceB | Which input provides the UV map |
| channel | int | redGreen | redGreen/redBlue/greenBlue | Which color channels to use as U and V |
| scale | float | 100 | 0-200 | UV scale as percentage (100 = identity mapping) |
| offset | float | 0 | -1-1 | Offset applied to remapped UVs |
| wrap | int | mirror | clamp/mirror/repeat | How to handle UVs outside 0-1 range |

## Notes

- **scale at 100**: Color values map directly to UV coordinates (red=U, green=V for rg mode)
- **scale below 100**: Compresses the UV range, zooming into a portion of the sampled texture
- **scale above 100**: Expands the UV range, stretching and repeating the sampled texture
- **offset**: Shifts the entire UV mapping, useful for centering or biasing the remap
- **clamp wrap**: UVs outside 0-1 stick to the edge pixels
- **mirror wrap**: UVs ping-pong back when they exceed 0-1 boundaries
- **repeat wrap**: UVs tile seamlessly using fractional wrapping
- **channel selection**: Choose which pair of RGB channels encode the U and V coordinates. Different channels from the same source create different displacement patterns
- Feed a gradient or noise generator into one input to create controlled displacement patterns
- Chain with feedback effects for evolving, self-modifying distortions

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .uvRemap(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(a))n.shaders[t]={...e}}n&&o&&(n.help=o);var u="mixer/uvRemap",m="mixer",c="uvRemap",f=n;export{f as default,u as effectId,c as effectName,o as help,m as namespace};
