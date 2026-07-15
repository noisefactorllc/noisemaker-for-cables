/* mixer/mashup */
var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var a=8,l=(()=>{let n={layers:{slot:0,components:"x"},smoothness:{slot:0,components:"y"},resolution:{slot:0,components:"zw"}};for(let e=0;e<a;e++){let o=1+Math.floor(e/4),u="xyzw"[e%4];n[`layer${e}_active`]={slot:o,components:u}}return n})(),c=(()=>{let n={source:"source"};for(let e=0;e<a;e++)n[`layer${e}_tex`]=`layer${e}_tex`;return n})(),t=new r({name:"Mashup",namespace:"mixer",func:"mashup",tags:["blend"],description:"Posterize a control input by luminance and route each band to a different surface",uniformLayout:l,globals:{source:{type:"surface",default:"none",ui:{label:"input"}},layers:{type:"int",default:4,uniform:"layers",min:2,max:a,step:1,ui:{label:"layers",control:"slider"}},smoothness:{type:"float",default:.1,uniform:"smoothness",min:0,max:.5,zero:0,ui:{label:"smoothness",control:"slider"}},...d()},defaultProgram:`search mixer, synth

noise(
  type: constant,
  octaves: 4,
  ridges: true,
  loopScale: 100,
  speed: 100
)
  .write(o0)

solid(color: #006d4c)
  .write(o1)

perlin(ridges: true)
  .write(o2)

gradient(
  type: noiseGradient,
  color1: #ffffffff,
  color2: #a9a9a9ff,
  color3: #515151ff,
  color4: #000000ff,
  colorCount: 3
)
  .write(o3)

mashup(
  source: read(o3),
  layers: 3,
  smoothness: 0.22,
  layer0_tex: read(o0),
  layer1_tex: read(o1),
  layer2_tex: read(o2)
)
  .write(o4)`,passes:[{name:"render",program:"mashup",inputs:c,outputs:{fragColor:"outputTex"}}]});function d(){let n={};for(let e=0;e<a;e++){let o={enabledBy:{param:"layers",gt:e}};n[`layer${e}_tex`]={type:"surface",default:"none",colorModeUniform:`layer${e}_active`,ui:{label:`layer ${e+1} source`,category:`layer ${e+1}`,...o}}}return n}var s={mashup:{glsl:`/*
 * Mashup \u2014 GLSL fragment shader
 *
 * Posterize the control input (source) by luminance into \`layers\` equal
 * bands and route each band to its layerN_tex source. Darkest band ->
 * layer0, brightest -> layer(layers-1). \`smoothness\` feathers each band
 * boundary (0 = hard posterized edges). Bands whose layer source is unwired
 * (layerN_active == 0) fall back to the control input.
 */

#ifdef GL_ES
precision highp float;
#endif

#define MAX_LAYERS 8

// Auto-filled by the runtime \u2014 output framebuffer dimensions. Needed because
// this is a starter effect with no chain input to size from.
uniform vec2 resolution;

// Control input: its luminance selects the band. Wire with \`source: read(oN)\`.
uniform sampler2D source;

uniform sampler2D layer0_tex;
uniform sampler2D layer1_tex;
uniform sampler2D layer2_tex;
uniform sampler2D layer3_tex;
uniform sampler2D layer4_tex;
uniform sampler2D layer5_tex;
uniform sampler2D layer6_tex;
uniform sampler2D layer7_tex;

uniform int layers;
uniform float smoothness;

uniform int layer0_active; uniform int layer1_active; uniform int layer2_active; uniform int layer3_active;
uniform int layer4_active; uniform int layer5_active; uniform int layer6_active; uniform int layer7_active;

out vec4 fragColor;

// RGB -> luminosity (shared codebase weights).
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec4 sampleLayer(int i, vec2 uv) {
    if (i == 0) return texture(layer0_tex, uv);
    if (i == 1) return texture(layer1_tex, uv);
    if (i == 2) return texture(layer2_tex, uv);
    if (i == 3) return texture(layer3_tex, uv);
    if (i == 4) return texture(layer4_tex, uv);
    if (i == 5) return texture(layer5_tex, uv);
    if (i == 6) return texture(layer6_tex, uv);
    return texture(layer7_tex, uv);
}

int layerActive(int i) {
    if (i == 0) return layer0_active;
    if (i == 1) return layer1_active;
    if (i == 2) return layer2_active;
    if (i == 3) return layer3_active;
    if (i == 4) return layer4_active;
    if (i == 5) return layer5_active;
    if (i == 6) return layer6_active;
    return layer7_active;
}

// Band-boundary weight: 0 below the boundary, 1 above, with a symmetric
// smoothstep feather of half-width \`smoothness\`. smoothness <= 0 is a hard step.
float bandWeight(float lum, float boundary) {
    if (smoothness <= 0.0) return step(boundary, lum);
    return smoothstep(boundary - smoothness, boundary + smoothness, lum);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 controlColor = texture(source, uv);
    float lum = getLuminosity(controlColor.rgb);

    int n = clamp(layers, 2, MAX_LAYERS);

    // Base = darkest band's source (or the control input when unwired).
    vec4 result = (layerActive(0) == 1) ? sampleLayer(0, uv) : controlColor;

    // Each subsequent boundary at k/n cross-fades toward that band's source.
    for (int k = 1; k < MAX_LAYERS; k++) {
        if (k >= n) break;
        vec4 src = (layerActive(k) == 1) ? sampleLayer(k, uv) : controlColor;
        float boundary = float(k) / float(n);
        float w = bandWeight(lum, boundary);
        result = mix(result, src, w);
    }

    fragColor = result;
}
`,wgsl:`/*
 * Mashup \u2014 WGSL fragment shader
 *
 * Posterize the control input (source) by luminance into \`layers\` equal
 * bands and route each band to its layerN_tex source. Mirrors mashup.glsl.
 * Starter effect: output size comes from the packed \`resolution\` uniform.
 * Uniforms are packed into a single vec4 array to match the JS uniformLayout:
 *   slot 0: layers, smoothness, resolution.x, resolution.y
 *   slot 1: layer0_active..layer3_active (xyzw)
 *   slot 2: layer4_active..layer7_active (xyzw)
 */

struct Uniforms {
    data: array<vec4<f32>, 3>,
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var source: texture_2d<f32>;
@group(0) @binding(3) var layer0_tex: texture_2d<f32>;
@group(0) @binding(4) var layer1_tex: texture_2d<f32>;
@group(0) @binding(5) var layer2_tex: texture_2d<f32>;
@group(0) @binding(6) var layer3_tex: texture_2d<f32>;
@group(0) @binding(7) var layer4_tex: texture_2d<f32>;
@group(0) @binding(8) var layer5_tex: texture_2d<f32>;
@group(0) @binding(9) var layer6_tex: texture_2d<f32>;
@group(0) @binding(10) var layer7_tex: texture_2d<f32>;

const MAX_LAYERS: i32 = 8;

// RGB -> luminosity (shared codebase weights).
fn getLuminosity(color: vec3<f32>) -> f32 {
    return dot(color, vec3<f32>(0.299, 0.587, 0.114));
}

fn sampleLayer(i: i32, uv: vec2<f32>) -> vec4<f32> {
    // textureSampleLevel (explicit LOD 0): sampleLayer is called from the
    // per-pixel, data-dependent band loop (non-uniform control flow), which
    // disqualifies plain textureSample. Layer surfaces are non-mipmapped
    // render targets, so LOD 0 matches GLSL texture(). Mirrors synth/remap.
    if (i == 0) { return textureSampleLevel(layer0_tex, samp, uv, 0.0); }
    if (i == 1) { return textureSampleLevel(layer1_tex, samp, uv, 0.0); }
    if (i == 2) { return textureSampleLevel(layer2_tex, samp, uv, 0.0); }
    if (i == 3) { return textureSampleLevel(layer3_tex, samp, uv, 0.0); }
    if (i == 4) { return textureSampleLevel(layer4_tex, samp, uv, 0.0); }
    if (i == 5) { return textureSampleLevel(layer5_tex, samp, uv, 0.0); }
    if (i == 6) { return textureSampleLevel(layer6_tex, samp, uv, 0.0); }
    return textureSampleLevel(layer7_tex, samp, uv, 0.0);
}

// Active flags are packed as f32 (0.0 / 1.0); threshold at 0.5 like remap.
fn layerActive(i: i32) -> f32 {
    if (i == 0) { return uniforms.data[1].x; }
    if (i == 1) { return uniforms.data[1].y; }
    if (i == 2) { return uniforms.data[1].z; }
    if (i == 3) { return uniforms.data[1].w; }
    if (i == 4) { return uniforms.data[2].x; }
    if (i == 5) { return uniforms.data[2].y; }
    if (i == 6) { return uniforms.data[2].z; }
    return uniforms.data[2].w;
}

// Band-boundary weight: 0 below the boundary, 1 above, with a symmetric
// smoothstep feather of half-width \`smoothness\`. smoothness <= 0 is a hard step.
fn bandWeight(lum: f32, boundary: f32, smoothness: f32) -> f32 {
    if (smoothness <= 0.0) { return step(boundary, lum); }
    return smoothstep(boundary - smoothness, boundary + smoothness, lum);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].zw;
    let uv = position.xy / resolution;
    let controlColor = textureSample(source, samp, uv);
    let lum = getLuminosity(controlColor.rgb);

    let layers = i32(uniforms.data[0].x);
    let smoothness = uniforms.data[0].y;
    let n = clamp(layers, 2, MAX_LAYERS);

    // Base = darkest band's source (or the control input when unwired).
    var result = select(controlColor, sampleLayer(0, uv), layerActive(0) >= 0.5);

    // Each subsequent boundary at k/n cross-fades toward that band's source.
    for (var k: i32 = 1; k < MAX_LAYERS; k = k + 1) {
        if (k >= n) { break; }
        let src = select(controlColor, sampleLayer(k, uv), layerActive(k) >= 0.5);
        let boundary = f32(k) / f32(n);
        let w = bandWeight(lum, boundary, smoothness);
        result = mix(result, src, w);
    }

    return result;
}
`}},i=`# mixer/mashup

Posterize one control input by luminance and route each gray-level band to a different engine surface \u2014 a "mega mixer" that mashes up to eight sources together, driven by a single grayscale control.

## Overview

Mashup reads the luminance of its **input** (the \`source\` slot) and divides the \`0\u20261\` range into \`layers\` equal bands. Each band shows a different surface: the darkest band shows \`layer 1\`, the brightest shows the last layer. The \`smoothness\` control feathers each band boundary so adjacent sources cross-fade instead of meeting at a hard edge.

It is the luminance-driven cousin of [\`synth/remap\`](../../synth/remap): where Remap routes engine surfaces to *polygon zones*, Mashup routes them to *gray-level bands*. Like Remap, every source \u2014 including the control input \u2014 is an explicit slot wired in DSL with \`read(oN)\`. A band whose layer source is left unwired falls back to showing the control input.

## Usage

Mashup is a starter: wire the control into \`source\` and each band into its \`layerN_tex\` slot.

\`\`\`
noise(ridges: true).write(o0)
solid(color: #ee3322).write(o1)
solid(color: #2266cc).write(o2)
gradient().write(o3)

mashup(layers: 3, source: read(o3), layer0_tex: read(o0), layer1_tex: read(o1), layer2_tex: read(o2))
  .write(o4)
\`\`\`

The \`source\` input is only sampled for its luminance \u2014 its color never shows directly unless a band's layer source is unwired.

## Parameters

### General
- **Input** (\`source\`): the control surface whose luminance is posterized into bands. Wire with \`source: read(oN)\`.
- **Layers**: how many luminance bands to posterize the control into (2\u20138). With N layers the boundaries fall at \`1/N, 2/N, \u2026\`. Layer slots above the current count are greyed out.
- **Smoothness**: half-width of the cross-fade applied at every band boundary, in luminance units (\`0\u20130.5\`). \`0\` gives hard posterized edges; larger values blend neighbouring sources together.

### Layers (1\u20138)
For each layer:
- **Layer N source** (\`layerN_tex\`): the engine surface shown in band N. Wire with \`layerN_tex: read(oN)\`. When unwired (default \`"none"\`), that band shows the control input instead.

## Notes

- Bands are sampled darkest \u2192 brightest, so reordering the wired sources reorders which luminance range each one occupies.
- The control input's luminance uses the standard \`0.299 / 0.587 / 0.114\` RGB weights.
- All sources are sampled at the output pixel position; wire surfaces at the same resolution as the composition.

## Usage

\`\`\`
search mixer, synth

mashup()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(s))t.shaders[n]={...e}}t&&i&&(t.help=i);var p="mixer/mashup",x="mixer",v="mashup",b=t;export{b as default,p as effectId,v as effectName,i as help,x as namespace};
