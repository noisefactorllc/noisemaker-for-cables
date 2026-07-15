/* filter/tint */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Tint",namespace:"filter",func:"tint",tags:["color"],description:"Colorize input texture with a color overlay",globals:{color:{type:"color",default:[1,1,1],uniform:"color",ui:{label:"color",control:"color"}},alpha:{type:"float",default:.5,min:0,max:1,randMin:.5,uniform:"alpha",ui:{label:"amount",control:"slider"}},mode:{type:"int",default:0,uniform:"mode",choices:{overlay:0,multiply:1,recolor:2},ui:{label:"mode",control:"dropdown"}}},defaultProgram:`search filter, synth

noise(ridges: true, colorMode: mono)
.tint(color: #ff0000, alpha: 0.5, mode: overlay)
.write(o0)`,passes:[{name:"main",program:"colorize",inputs:{inputTex:"inputTex"},outputs:{color:"outputTex"}}]});var o={colorize:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform vec3 color;
uniform float alpha;
uniform float mode;
uniform sampler2D inputTex;

out vec4 fragColor;

vec3 rgb_to_hsv(vec3 rgb) {
    float r = rgb.x, g = rgb.y, b = rgb.z;
    float max_c = max(max(r, g), b);
    float min_c = min(min(r, g), b);
    float delta = max_c - min_c;
    float hue = 0.0;
    if (delta != 0.0) {
        if (max_c == r) {
            float raw = (g - b) / delta;
            raw = raw - floor(raw / 6.0) * 6.0;
            if (raw < 0.0) raw += 6.0;
            hue = raw;
        } else if (max_c == g) {
            hue = (b - r) / delta + 2.0;
        } else {
            hue = (r - g) / delta + 4.0;
        }
    }
    hue /= 6.0;
    if (hue < 0.0) hue += 1.0;
    float sat = max_c != 0.0 ? delta / max_c : 0.0;
    return vec3(hue, sat, max_c);
}

vec3 hsv_to_rgb(vec3 hsv) {
    float h = hsv.x, s = hsv.y, v = hsv.z;
    float dh = h * 6.0;
    float dr = clamp(abs(dh - 3.0) - 1.0, 0.0, 1.0);
    float dg = clamp(-abs(dh - 2.0) + 2.0, 0.0, 1.0);
    float db = clamp(-abs(dh - 4.0) + 2.0, 0.0, 1.0);
    float oms = 1.0 - s;
    return vec3((oms + s * dr) * v, (oms + s * dg) * v, (oms + s * db) * v);
}

void main() {
  vec2 globalCoord = gl_FragCoord.xy + tileOffset;
  vec2 st = gl_FragCoord.xy / vec2(max(textureSize(inputTex, 0), ivec2(1)));
  vec4 base = texture(inputTex, st);
  vec3 base_rgb = clamp(base.rgb, 0.0, 1.0);

  int m = int(mode);
  vec3 tinted;
  if (m == 1) {
      // Multiply
      tinted = base_rgb * color;
  } else if (m == 2) {
      // Recolor: replace hue with tint color's hue
      float tintHue = rgb_to_hsv(color).x;
      vec3 base_hsv = rgb_to_hsv(base_rgb);
      tinted = clamp(hsv_to_rgb(vec3(tintHue, clamp(base_rgb.y, 0.0, 1.0), clamp(base_hsv.z, 0.0, 1.0))), 0.0, 1.0);
  } else {
      // Overlay (default)
      tinted = color;
  }

  vec3 rgb = mix(base_rgb, tinted, alpha);
  fragColor = vec4(rgb, base.a);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> color: vec3<f32>;
@group(0) @binding(3) var<uniform> alpha: f32;
@group(0) @binding(4) var<uniform> mode: f32;

fn rgb_to_hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.x; let g = rgb.y; let b = rgb.z;
    let max_c = max(max(r, g), b);
    let min_c = min(min(r, g), b);
    let delta = max_c - min_c;
    var hue = 0.0;
    if (delta != 0.0) {
        if (max_c == r) {
            var raw = (g - b) / delta;
            raw = raw - floor(raw / 6.0) * 6.0;
            if (raw < 0.0) { raw = raw + 6.0; }
            hue = raw;
        } else if (max_c == g) {
            hue = (b - r) / delta + 2.0;
        } else {
            hue = (r - g) / delta + 4.0;
        }
    }
    hue = hue / 6.0;
    if (hue < 0.0) { hue = hue + 1.0; }
    var sat = 0.0;
    if (max_c != 0.0) { sat = delta / max_c; }
    return vec3<f32>(hue, sat, max_c);
}

fn hsv_to_rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = hsv.x; let s = hsv.y; let v = hsv.z;
    let dh = h * 6.0;
    let dr = clamp(abs(dh - 3.0) - 1.0, 0.0, 1.0);
    let dg = clamp(-abs(dh - 2.0) + 2.0, 0.0, 1.0);
    let db = clamp(-abs(dh - 4.0) + 2.0, 0.0, 1.0);
    let oms = 1.0 - s;
    return vec3<f32>((oms + s * dr) * v, (oms + s * dg) * v, (oms + s * db) * v);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let size = max(textureDimensions(inputTex, 0), vec2<u32>(1, 1));
  let st = position.xy / vec2<f32>(size);
  let base = textureSampleLevel(inputTex, samp, st, 0.0);
  let base_rgb = clamp(base.rgb, vec3<f32>(0.0), vec3<f32>(1.0));

  let m = i32(mode);
  var tinted: vec3<f32>;
  if (m == 1) {
      // Multiply
      tinted = base_rgb * color;
  } else if (m == 2) {
      // Recolor: replace hue with tint color's hue
      let tintHue = rgb_to_hsv(color).x;
      let base_hsv = rgb_to_hsv(base_rgb);
      tinted = clamp(hsv_to_rgb(vec3<f32>(tintHue, clamp(base_rgb.y, 0.0, 1.0), clamp(base_hsv.z, 0.0, 1.0))), vec3<f32>(0.0), vec3<f32>(1.0));
  } else {
      // Overlay (default)
      tinted = color;
  }

  let rgb = mix(base_rgb, tinted, vec3<f32>(alpha));
  return vec4<f32>(rgb, base.a);
}
`}},a=`# tint

Colorize input texture with a color overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | 1,1,1 | - | Tint color |
| amount | float | 0.5 | 0-1 | Tint amount |
| mode | int | overlay | overlay/multiply/recolor | Blend mode |

## Notes

- **overlay** mode lerps between the input and the tint color
- **multiply** mode multiplies input RGB by the tint color
- **recolor** mode replaces the input hue with the tint color's hue in HSV space, preserving brightness

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .tint()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&a&&(t.help=a);var c="filter/tint",f="filter",m="tint",h=t;export{h as default,c as effectId,m as effectName,a as help,f as namespace};
