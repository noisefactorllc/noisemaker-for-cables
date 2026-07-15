/* filter/colorReplace */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new o({name:"Color Replace",namespace:"filter",func:"colorReplace",tags:["color","util"],description:"Color replacement with alpha output. Matches pixels near targetColor and remaps their RGB and/or alpha.",globals:{targetColor:{type:"color",default:[0,0,0],uniform:"targetColor",ui:{label:"target color",control:"color"}},replaceColor:{type:"color",default:[1,1,1],uniform:"replaceColor",ui:{label:"replace color",control:"color"}},sensitivity:{type:"float",default:.3,min:0,max:1,step:.01,uniform:"sensitivity",ui:{label:"sensitivity",control:"slider"}},smoothing:{type:"float",default:.1,min:0,max:1,step:.01,uniform:"smoothing",ui:{label:"smoothing",control:"slider"}},colorMix:{type:"float",default:1,min:0,max:1,step:.01,uniform:"colorMix",ui:{label:"color mix",control:"slider"}},replaceAlpha:{type:"float",default:1,min:0,max:1,step:.01,uniform:"replaceAlpha",ui:{label:"matched \u03B1",control:"slider"}},keepAlpha:{type:"float",default:1,min:0,max:1,step:.01,uniform:"keepAlpha",ui:{label:"unmatched \u03B1",control:"slider"}}},defaultProgram:`search filter, synth

noise(ridges: true, colorMode: mono)
.colorReplace(targetColor: #000000, replaceColor: #ff0000, sensitivity: 0.4, smoothing: 0.2)
.write(o0)`,passes:[{name:"main",program:"colorReplace",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var r={colorReplace:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform vec3 targetColor;
uniform vec3 replaceColor;
uniform float sensitivity;
uniform float smoothing;
uniform float colorMix;
uniform float replaceAlpha;
uniform float keepAlpha;

out vec4 fragColor;

/* Color replacement.
   Matches input pixels by euclidean RGB distance to targetColor, then
   independently remaps RGB toward replaceColor and rescales alpha. */
void main() {
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = gl_FragCoord.xy / vec2(max(textureSize(inputTex, 0), ivec2(1)));
  vec4 src = texture(inputTex, st);

  // Normalized euclidean RGB distance (0 = exact match, 1 = max distance).
  float dist = length(src.rgb - targetColor) / 1.7320508;

  // Match strength: 1 at exact match, 0 beyond (sensitivity + smoothing/2).
  float halfBand = smoothing * 0.5;
  float edge0 = max(sensitivity - halfBand, 0.0);
  float edge1 = sensitivity + halfBand;
  float match = 1.0 - smoothstep(edge0, edge1, dist);

  vec3 outRgb = mix(src.rgb, replaceColor, match * colorMix);
  float outA = src.a * mix(keepAlpha, replaceAlpha, match);

  fragColor = vec4(outRgb, outA);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> targetColor: vec3<f32>;
@group(0) @binding(3) var<uniform> replaceColor: vec3<f32>;
@group(0) @binding(4) var<uniform> sensitivity: f32;
@group(0) @binding(5) var<uniform> smoothing: f32;
@group(0) @binding(6) var<uniform> colorMix: f32;
@group(0) @binding(7) var<uniform> replaceAlpha: f32;
@group(0) @binding(8) var<uniform> keepAlpha: f32;

/* Color replacement.
   Matches input pixels by euclidean RGB distance to targetColor, then
   independently remaps RGB toward replaceColor and rescales alpha. */
@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let size = max(textureDimensions(inputTex, 0), vec2<u32>(1u, 1u));
  let st = position.xy / vec2<f32>(size);
  let src = textureSampleLevel(inputTex, samp, st, 0.0);

  let dist = length(src.rgb - targetColor) / 1.7320508;

  let halfBand = smoothing * 0.5;
  let edge0 = max(sensitivity - halfBand, 0.0);
  let edge1 = sensitivity + halfBand;
  let match_ = 1.0 - smoothstep(edge0, edge1, dist);

  let outRgb = mix(src.rgb, replaceColor, vec3<f32>(match_ * colorMix));
  let outA = src.a * mix(keepAlpha, replaceAlpha, match_);

  return vec4<f32>(outRgb, outA);
}
`}},a=`# colorReplace

Color replacement with alpha output. Matches pixels near \`targetColor\` by RGB distance, then independently remaps RGB and alpha based on match strength.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| targetColor | color | 0,0,0 | - | Color to find in the input |
| replaceColor | color | 1,1,1 | - | Color matched pixels are blended toward |
| sensitivity | float | 0.3 | 0-1 | Match tolerance (higher = broader match) |
| smoothing | float | 0.1 | 0-1 | Width of the soft falloff edge |
| colorMix | float | 1.0 | 0-1 | How much of replaceColor to blend in at matched pixels |
| replaceAlpha | float | 1.0 | 0-1 | Alpha multiplier for matched pixels |
| keepAlpha | float | 1.0 | 0-1 | Alpha multiplier for unmatched pixels |

## Notes

- Match strength is \`1 - smoothstep(sensitivity - smoothing/2, sensitivity + smoothing/2, dist)\` where \`dist\` is normalized euclidean RGB distance.
- Output alpha is the input alpha multiplied by the per-pixel blend between \`keepAlpha\` and \`replaceAlpha\`. Existing transparency is preserved.

## Common recipes

- **Replace black with red** \u2014 \`targetColor: #000000, replaceColor: #ff0000, colorMix: 1, replaceAlpha: 1, keepAlpha: 1\`
- **Key out black (cut it out)** \u2014 \`targetColor: #000000, colorMix: 0, replaceAlpha: 0, keepAlpha: 1\`
- **Isolate green (keep only matches)** \u2014 \`targetColor: #00ff00, colorMix: 0, replaceAlpha: 1, keepAlpha: 0\`
- **Luminance to alpha** (black = transparent, white = opaque, RGB unchanged) \u2014 \`targetColor: #000000, sensitivity: 0.5, smoothing: 1, colorMix: 0, replaceAlpha: 0, keepAlpha: 1\`

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .colorReplace()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(r))t.shaders[n]={...e}}t&&a&&(t.help=a);var c="filter/colorReplace",u="filter",h="colorReplace",f=t;export{f as default,c as effectId,h as effectName,a as help,u as namespace};
