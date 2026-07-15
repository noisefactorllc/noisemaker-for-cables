/* filter/hs */
var e=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var t=new e({name:"HS",namespace:"filter",func:"hs",tags:["color"],hidden:!0,deprecatedBy:"adjust",description:"Deprecated: use 'adjust' instead. Adjust hue and/or saturation",globals:{rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"hue rotation",control:"slider"}},hueRange:{type:"float",default:100,uniform:"hueRange",min:0,max:200,ui:{label:"hue range",control:"slider"}},saturation:{type:"float",default:1,uniform:"saturation",min:0,max:4,ui:{label:"saturation",control:"slider"}}},passes:[{name:"render",program:"hs",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={hs:{glsl:`/*
 * Hue and saturation adjustment effect
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float rotation;
uniform float hueRange;
uniform float saturation;

out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 rgb2hsv(vec3 rgb) {
    float r = rgb.r, g = rgb.g, b = rgb.b;
    float maxC = max(r, max(g, b));
    float minC = min(r, min(g, b));
    float delta = maxC - minC;

    float h = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = mod((g - b) / delta, 6.0) / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    float s = (maxC == 0.0) ? 0.0 : delta / maxC;
    return vec3(h, s, maxC);
}

vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    float c = v * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    // Convert to HSV
    vec3 hsv = rgb2hsv(color.rgb);

    // Apply hue rotation and range scaling
    hsv.x = fract(hsv.x * map(hueRange, 0.0, 200.0, 0.0, 2.0) + (rotation / 360.0));

    // Apply saturation
    hsv.y *= saturation;

    // Convert back to RGB
    color.rgb = hsv2rgb(hsv);

    fragColor = color;
}
`,wgsl:`/*
 * Hue and saturation adjustment effect
 */

struct Uniforms {
    data: array<vec4<f32>, 1>,
};

fn mapVal(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn floorMod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.r; let g = rgb.g; let b = rgb.b;
    let maxC = max(r, max(g, b));
    let minC = min(r, min(g, b));
    let delta = maxC - minC;

    var h = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = floorMod((g - b) / delta, 6.0) / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    var s = 0.0;
    if (maxC != 0.0) { s = delta / maxC; }
    return vec3<f32>(h, s, maxC);
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(floorMod(h * 6.0, 2.0) - 1.0));
    let m = v - c;
    var rgb: vec3<f32>;
    if (h < 1.0/6.0) { rgb = vec3<f32>(c, x, 0.0); }
    else if (h < 2.0/6.0) { rgb = vec3<f32>(x, c, 0.0); }
    else if (h < 3.0/6.0) { rgb = vec3<f32>(0.0, c, x); }
    else if (h < 4.0/6.0) { rgb = vec3<f32>(0.0, x, c); }
    else if (h < 5.0/6.0) { rgb = vec3<f32>(x, 0.0, c); }
    else { rgb = vec3<f32>(c, 0.0, x); }
    return rgb + m;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let rotation = uniforms.data[0].x;
    let hueRange = uniforms.data[0].y;
    let saturation = uniforms.data[0].z;
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    // Convert to HSV
    var hsv = rgb2hsv(color.rgb);

    // Apply hue rotation and range scaling
    hsv.x = fract(hsv.x * mapVal(hueRange, 0.0, 200.0, 0.0, 2.0) + (rotation / 360.0));

    // Apply saturation
    hsv.y = hsv.y * saturation;

    // Convert back to RGB
    color = vec4<f32>(hsv2rgb(hsv), color.a);

    return color;
}
`}},o=`# hs

Adjust hue and/or saturation

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| rotation | float | 0 | -180-180 | Hue Rotation |
| hueRange | float | 100 | 0-200 | Hue Range |
| saturation | float | 1 | 0-4 | Saturation |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .hs()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,n]of Object.entries(a))t.shaders[r]={...n}}t&&o&&(t.help=o);var f="filter/hs",h="filter",c="hs",m=t;export{m as default,f as effectId,c as effectName,o as help,h as namespace};
