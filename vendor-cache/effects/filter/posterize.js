/* filter/posterize */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Posterize",namespace:"filter",func:"posterize",tags:["color"],description:"Posterization/color reduction with gamma control",globals:{levels:{type:"int",default:5,uniform:"levels",min:2,max:32,step:1,ui:{label:"levels",control:"slider"}},gamma:{type:"float",default:1,uniform:"gamma",min:.1,max:3,step:.05,ui:{label:"gamma",control:"slider"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"main",program:"posterize",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={posterize:{glsl:`/*
 * Posterize: sRGB-aware color quantization with adjustable gamma
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float levels;
uniform float gamma;
uniform bool antialias;

out vec4 fragColor;

const float MIN_LEVELS = 1.0;
const float MIN_GAMMA = 1e-3;

float clamp_01(float value) {
    return clamp(value, 0.0, 1.0);
}

float srgb_to_linear_component(float value) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

float linear_to_srgb_component(float value) {
    if (value <= 0.0031308) {
        return value * 12.92;
    }
    return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

vec3 srgb_to_linear_rgb(vec3 rgb) {
    return vec3(
        srgb_to_linear_component(rgb.x),
        srgb_to_linear_component(rgb.y),
        srgb_to_linear_component(rgb.z)
    );
}

vec3 linear_to_srgb_rgb(vec3 rgb) {
    return vec3(
        linear_to_srgb_component(rgb.x),
        linear_to_srgb_component(rgb.y),
        linear_to_srgb_component(rgb.z)
    );
}

vec3 pow_vec3(vec3 value, float exponent) {
    return pow(value, vec3(exponent));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / vec2(textureSize(inputTex, 0));
    vec4 texel = texture(inputTex, uv);

    float levels_raw = max(levels, 0.0);
    float levels_quantized = max(round(levels_raw), MIN_LEVELS);
    if (levels_quantized <= 1.0) {
        fragColor = texel;
        return;
    }

    float level_factor = levels_quantized;
    float inv_factor = 1.0 / level_factor;
    float half_step = inv_factor * 0.5;
    float gamma_value = max(gamma, MIN_GAMMA);
    float inv_gamma = 1.0 / gamma_value;

    vec3 working_rgb = srgb_to_linear_rgb(texel.xyz);
    working_rgb = pow_vec3(clamp(working_rgb, vec3(0.0), vec3(1.0)), gamma_value);

    // Posterize with optional edge smoothing
    vec3 scaled = working_rgb * level_factor + vec3(half_step);
    vec3 quantized_rgb;
    if (antialias) {
        vec3 f = fract(scaled);
        vec3 fw = fwidth(scaled);
        vec3 blend = smoothstep(0.5 - fw * 0.5, 0.5 + fw * 0.5, f);
        quantized_rgb = (floor(scaled) + blend) * inv_factor;
    } else {
        quantized_rgb = floor(scaled) * inv_factor;
    }
    quantized_rgb = pow_vec3(clamp(quantized_rgb, vec3(0.0), vec3(1.0)), inv_gamma);

    quantized_rgb = linear_to_srgb_rgb(quantized_rgb);

    fragColor = vec4(
        clamp_01(quantized_rgb.x),
        clamp_01(quantized_rgb.y),
        clamp_01(quantized_rgb.z),
        texel.w
    );
}
`,wgsl:`/*
 * Posterize: sRGB-aware color quantization with adjustable gamma
 */

struct Uniforms {
    levels: f32,
    gamma: f32,
    antialias: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const MIN_LEVELS: f32 = 1.0;
const MIN_GAMMA: f32 = 1e-3;

fn clamp_01(value: f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn srgb_to_linear_component(value: f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn linear_to_srgb_component(value: f32) -> f32 {
    if (value <= 0.0031308) {
        return value * 12.92;
    }
    return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

fn srgb_to_linear_rgb(rgb: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(
        srgb_to_linear_component(rgb.x),
        srgb_to_linear_component(rgb.y),
        srgb_to_linear_component(rgb.z),
    );
}

fn linear_to_srgb_rgb(rgb: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(
        linear_to_srgb_component(rgb.x),
        linear_to_srgb_component(rgb.y),
        linear_to_srgb_component(rgb.z),
    );
}

fn pow_vec3(value: vec3<f32>, exponent: f32) -> vec3<f32> {
    return pow(value, vec3<f32>(exponent));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = pos.xy / texSize;
    let texel = textureSample(inputTex, inputSampler, uv);

    let levels_raw = max(uniforms.levels, 0.0);
    let levels_quantized = max(round(levels_raw), MIN_LEVELS);
    if (levels_quantized <= 1.0) {
        return texel;
    }

    let level_factor = levels_quantized;
    let inv_factor = 1.0 / level_factor;
    let half_step = inv_factor * 0.5;
    let gamma_value = max(uniforms.gamma, MIN_GAMMA);
    let inv_gamma = 1.0 / gamma_value;

    var working_rgb = srgb_to_linear_rgb(texel.xyz);
    working_rgb = pow_vec3(clamp(working_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), gamma_value);

    // Posterize with optional edge smoothing
    let scaled = working_rgb * level_factor + vec3<f32>(half_step);
    var quantized_rgb: vec3<f32>;
    if (uniforms.antialias != 0) {
        let f = fract(scaled);
        let fw = fwidth(scaled);
        let blend = smoothstep(0.5 - fw * 0.5, 0.5 + fw * 0.5, f);
        quantized_rgb = (floor(scaled) + blend) * inv_factor;
    } else {
        quantized_rgb = floor(scaled) * inv_factor;
    }
    quantized_rgb = pow_vec3(clamp(quantized_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), inv_gamma);

    quantized_rgb = linear_to_srgb_rgb(quantized_rgb);

    return vec4<f32>(
        clamp_01(quantized_rgb.x),
        clamp_01(quantized_rgb.y),
        clamp_01(quantized_rgb.z),
        texel.w,
    );
}
`}},o=`# posterize

sRGB-aware color quantization with adjustable gamma

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| levels | int | 5 | 2-32 | Number of color levels |
| gamma | float | 1 | 0.1-3 | Gamma curve before quantization |
| antialias | boolean | true | on/off | Smooth edges between color bands |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .posterize()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(r))n.shaders[a]={...e}}n&&o&&(n.help=o);var f="filter/posterize",_="filter",c="posterize",m=n;export{m as default,f as effectId,c as effectName,o as help,_ as namespace};
