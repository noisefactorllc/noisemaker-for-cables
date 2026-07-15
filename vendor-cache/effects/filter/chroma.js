/* filter/chroma */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Chroma",namespace:"filter",func:"chroma",tags:["color","util"],description:"Isolate specific hue range with feathering",globals:{targetHue:{type:"float",default:.33,uniform:"targetHue",min:0,max:1,step:.01,ui:{label:"target hue",control:"slider"}},range:{type:"float",default:.25,uniform:"range",min:0,max:.5,step:.01,ui:{label:"range",control:"slider"}},feather:{type:"float",default:.05,uniform:"feather",min:0,max:.25,step:.01,ui:{label:"feather",control:"slider"}}},passes:[{name:"render",program:"chroma",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={chroma:{glsl:`/*
 * Chroma isolation effect
 * Isolate specific color with range and feathering
 * Outputs mono mask based on hue distance from target
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float targetHue;
uniform float range;
uniform float feather;

out vec4 fragColor;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float hueDistance(float h1, float h2) {
    float d = abs(h1 - h2);
    return min(d, 1.0 - d);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    vec3 hsv = rgb2hsv(color.rgb);
    float hue = hsv.x;
    float sat = hsv.y;

    float dist = hueDistance(hue, targetHue);
    
    // Apply range and feather to create smooth mask
    float inner = range;
    float outer = range + feather;
    float mask = 1.0 - smoothstep(inner, outer, dist);
    
    // Scale by saturation - desaturated colors don't have meaningful hue
    mask *= sat;

    fragColor = vec4(vec3(mask), color.a);
}
`,wgsl:`/*
 * Chroma isolation effect
 * Isolate specific color with range and feathering
 * Outputs mono mask based on hue distance from target
 */

struct Uniforms {
    targetHue: f32,
    range: f32,
    feather: f32,
    _pad: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));
    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));

    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hueDistance(h1: f32, h2: f32) -> f32 {
    let d = abs(h1 - h2);
    return min(d, 1.0 - d);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let targetHue = uniforms.targetHue;
    let range = uniforms.range;
    let feather = uniforms.feather;

    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);

    let hsv = rgb2hsv(color.rgb);
    let hue = hsv.x;
    let sat = hsv.y;

    let dist = hueDistance(hue, targetHue);
    
    // Apply range and feather to create smooth mask
    let inner = range;
    let outer = range + feather;
    var mask = 1.0 - smoothstep(inner, outer, dist);
    
    // Scale by saturation - desaturated colors don't have meaningful hue
    mask *= sat;

    return vec4<f32>(vec3<f32>(mask), color.a);
}
`}},s=`# chroma

Isolate specific hue range with feathering

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| targetHue | float | 0.33 | 0-1 | Target Hue |
| range | float | 0.25 | 0-0.5 | Range |
| feather | float | 0.05 | 0-0.25 | Feather |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .chroma()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&s&&(t.help=s);var l="filter/chroma",c="filter",h="chroma",p=t;export{p as default,l as effectId,h as effectName,s as help,c as namespace};
