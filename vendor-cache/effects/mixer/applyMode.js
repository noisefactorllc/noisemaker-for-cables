/* mixer/applyMode */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Apply Mode",namespace:"mixer",func:"applyMode",tags:["color"],description:"Apply brightness, hue, or saturation from source B to source A",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mode:{type:"int",default:0,uniform:"mode",choices:{brightness:0,hue:1,saturation:2},ui:{label:"mode",control:"dropdown"}},mix:{type:"float",default:0,uniform:"mixAmt",min:-100,max:100,ui:{label:"mix",control:"slider"}}},defaultProgram:`search mixer, synth

noise(seed: 1, ridges: true)
.write(o0)

perlin()
.applyMode(tex: read(o0))
.write(o1)`,paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"applyMode",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{mixAmt:"mix"},outputs:{fragColor:"outputTex"}}]});var o={applyMode:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mode;
uniform float mixAmt;
out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 color1 = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 color2 = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    vec3 a = rgb2hsv(color1.rgb);
    vec3 b = rgb2hsv(color2.rgb);
    vec3 resultHSV;

    if (mode == 0) {
        // brightness: hue/sat from A, value from B
        resultHSV = vec3(a.x, a.y, b.z);
    } else if (mode == 1) {
        // hue: hue from B, sat/value from A
        resultHSV = vec3(b.x, a.y, a.z);
    } else {
        // saturation: hue/value from A, saturation from B
        resultHSV = vec3(a.x, b.y, a.z);
    }

    vec4 middle = vec4(hsv2rgb(resultHSV), 1.0);

    float amt = map(mixAmt, -100.0, 100.0, 0.0, 1.0);
    vec4 color;
    if (amt < 0.5) {
        float factor = amt * 2.0;
        color = mix(color1, middle, factor);
    } else {
        float factor = (amt - 0.5) * 2.0;
        color = mix(middle, color2, factor);
    }

    color.a = max(color1.a, color2.a);
    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> mode : i32;
@group(0) @binding(4) var<uniform> mixAmt : f32;

fn map_range(value : f32, inMin : f32, inMax : f32, outMin : f32, outMax : f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn rgb2hsv(c : vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    var p : vec4<f32>;
    if (c.b > c.g) {
        p = vec4<f32>(c.bg, K.wz);
    } else {
        p = vec4<f32>(c.gb, K.xy);
    }
    var q : vec4<f32>;
    if (p.x > c.r) {
        q = vec4<f32>(p.xyw, c.r);
    } else {
        q = vec4<f32>(c.r, p.yzx);
    }
    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c : vec3<f32>) -> vec3<f32> {
    let K = vec4<f32>(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    var st = position.xy / dims;

    let color1 = textureSample(inputTex, samp, st);
    let color2 = textureSample(tex, samp, st);

    let a = rgb2hsv(color1.rgb);
    let b = rgb2hsv(color2.rgb);
    var resultHSV : vec3<f32>;

    if (mode == 0) {
        // brightness: hue/sat from A, value from B
        resultHSV = vec3<f32>(a.x, a.y, b.z);
    } else if (mode == 1) {
        // hue: hue from B, sat/value from A
        resultHSV = vec3<f32>(b.x, a.y, a.z);
    } else {
        // saturation: hue/value from A, saturation from B
        resultHSV = vec3<f32>(a.x, b.y, a.z);
    }

    let middle = vec4<f32>(hsv2rgb(resultHSV), 1.0);

    let amt = map_range(mixAmt, -100.0, 100.0, 0.0, 1.0);
    var color : vec4<f32>;
    if (amt < 0.5) {
        let factor = amt * 2.0;
        color = mix(color1, middle, factor);
    } else {
        let factor = (amt - 0.5) * 2.0;
        color = mix(middle, color2, factor);
    }

    color.a = max(color1.a, color2.a);
    return color;
}
`}},a=`# applyMode

Apply brightness, hue, or saturation from source B to source A

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mode | int | brightness | brightness/hue/saturation | Mode |
| mix | float | 0 | -100-100 | Mix |

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .applyMode(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&a&&(n.help=a);var c="mixer/applyMode",f="mixer",m="applyMode",p=n;export{p as default,c as effectId,m as effectName,a as help,f as namespace};
