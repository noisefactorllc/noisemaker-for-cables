/* filter/glowingEdge */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Glowing Edge",namespace:"filter",func:"glowingEdge",tags:["edges"],description:"Glowing edge detection",globals:{shape:{type:"int",default:0,uniform:"sobelMetric",choices:{circle:0,diamond:1,square:2,star:3},ui:{label:"shape",control:"dropdown"}},width:{type:"int",default:1,uniform:"width",min:0,max:10,zero:0,randMin:1,randMax:3,ui:{label:"width",control:"slider"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.05,ui:{label:"alpha",control:"slider"}}},passes:[{name:"main",program:"glowingEdge",inputs:{inputTex:"inputTex"},uniforms:{shape:"sobelMetric",alpha:"alpha",width:"width"},outputs:{fragColor:"outputTex"}}]});var l={glowingEdge:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Glowing Edge - single-pass effect that computes Sobel edges and applies glow

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float alpha;
uniform float sobelMetric;
uniform float width;

out vec4 fragColor;

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

float distance_metric(float gx, float gy, int metric) {
    float abs_gx = abs(gx);
    float abs_gy = abs(gy);

    if (metric == 1) {
        return abs_gx + abs_gy;  // Manhattan
    } else if (metric == 2) {
        return max(abs_gx, abs_gy);  // Chebyshev
    } else if (metric == 3) {
        float cross = (abs_gx + abs_gy) / 1.414;
        return max(cross, max(abs_gx, abs_gy));  // Minkowski
    }
    return sqrt(gx * gx + gy * gy);  // Euclidean (0)
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 texel = width / resolution;

    // Sample base color
    vec4 base = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    // Sample 3x3 neighborhood for Sobel
    float tl = luminance(texture(inputTex, ((uv + vec2(-texel.x, -texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float tc = luminance(texture(inputTex, ((uv + vec2(0.0, -texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float tr = luminance(texture(inputTex, ((uv + vec2(texel.x, -texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float ml = luminance(texture(inputTex, ((uv + vec2(-texel.x, 0.0)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float mr = luminance(texture(inputTex, ((uv + vec2(texel.x, 0.0)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float bl = luminance(texture(inputTex, ((uv + vec2(-texel.x, texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float bc = luminance(texture(inputTex, ((uv + vec2(0.0, texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);
    float br = luminance(texture(inputTex, ((uv + vec2(texel.x, texel.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb);

    // Sobel kernels
    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;

    // Edge magnitude
    int metric = int(sobelMetric);
    float edge = clamp(distance_metric(gx, gy, metric) * 3.0, 0.0, 1.0);

    // Glow: edges emit the base color as additive light
    vec3 glow = edge * base.rgb * 2.0;

    // Screen blend glow onto original: brighter where edges are
    vec3 result = vec3(1.0) - (vec3(1.0) - base.rgb) * (vec3(1.0) - glow);

    // Mix based on alpha
    vec3 mixed = mix(base.rgb, result, alpha);

    fragColor = vec4(clamp(mixed, 0.0, 1.0), base.a);
}
`,wgsl:`/*
 * Glowing Edge - single-pass Sobel edge detection with glow
 */

struct Uniforms {
    sobelMetric: f32,
    alpha: f32,
    width: f32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
}

fn distance_metric(gx: f32, gy: f32, metric: i32) -> f32 {
    let abs_gx = abs(gx);
    let abs_gy = abs(gy);

    if (metric == 1) {
        return abs_gx + abs_gy;  // Manhattan
    } else if (metric == 2) {
        return max(abs_gx, abs_gy);  // Chebyshev
    } else if (metric == 3) {
        let cross_val = (abs_gx + abs_gy) / 1.414;
        return max(cross_val, max(abs_gx, abs_gy));  // Minkowski
    }
    return sqrt(gx * gx + gy * gy);  // Euclidean (0)
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = uniforms.width / texSize;

    // Use textureSampleLevel because noisemaker textures are rgba16float \u2014
    // unfilterable on WebGPU without the float32-filterable feature, which
    // makes plain textureSample reject the auto-generated bind-group layout.
    // textureSampleLevel takes an explicit mip level so no derivatives or
    // filtering are needed.

    // Sample base color
    let base = textureSampleLevel(inputTex, inputSampler, uv, 0.0);

    // Sample 3x3 neighborhood for Sobel
    let tl = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(-texel.x, -texel.y), 0.0).rgb);
    let tc = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(0.0, -texel.y), 0.0).rgb);
    let tr = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(texel.x, -texel.y), 0.0).rgb);
    let ml = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(-texel.x, 0.0), 0.0).rgb);
    let mr = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(texel.x, 0.0), 0.0).rgb);
    let bl = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(-texel.x, texel.y), 0.0).rgb);
    let bc = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(0.0, texel.y), 0.0).rgb);
    let br = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(texel.x, texel.y), 0.0).rgb);

    // Sobel kernels
    let gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;

    // Edge magnitude
    let metric = i32(uniforms.sobelMetric);
    let edge = clamp(distance_metric(gx, gy, metric) * 3.0, 0.0, 1.0);

    // Glow: edges emit the base color as additive light
    let glow = edge * base.rgb * 2.0;

    // Screen blend glow onto original
    let result = vec3<f32>(1.0) - (vec3<f32>(1.0) - base.rgb) * (vec3<f32>(1.0) - glow);

    // Mix based on alpha
    let mixed = mix(base.rgb, result, uniforms.alpha);

    return vec4<f32>(clamp(mixed, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
`}},r=`# glowingEdge

Glowing edge detection

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/diamond/square/star | Edge shape |
| width | int | 1 | 0-10 | Edge width in texels |
| alpha | float | 1 | 0-1 | Opacity |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .glowingEdge()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(l).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(l))t.shaders[i]={...e}}t&&r&&(t.help=r);var c="filter/glowingEdge",p="filter",f="glowingEdge",x=t;export{x as default,c as effectId,f as effectName,r as help,p as namespace};
