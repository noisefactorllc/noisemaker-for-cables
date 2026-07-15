/* filter/fxaa */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Fxaa",namespace:"filter",func:"fxaa",tags:["antialiasing"],description:"Fast approximate anti-aliasing",globals:{strength:{type:"float",default:1,uniform:"strength",min:0,max:1,ui:{label:"strength",control:"slider"}},sharpness:{type:"float",default:1,uniform:"sharpness",min:.1,max:10,step:.1,ui:{label:"sharpness",control:"slider"}},threshold:{type:"float",default:0,uniform:"threshold",min:0,max:1,ui:{label:"threshold",control:"slider"}}},passes:[{name:"main",program:"fxaa",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={fxaa:{glsl:`#version 300 es

precision highp float;
precision highp int;

// FXAA antialiasing pass translated from noisemaker/value.py:fxaa.
// Applies an edge-aware blur weighted by luminance differences while preserving alpha.


const uint CHANNEL_COUNT = 4u;
const float EPSILON = 1e-10;
const vec3 LUMA_WEIGHTS = vec3(0.299, 0.587, 0.114);

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float strength;
uniform float sharpness;
uniform float threshold;

uint as_u32(float value) {
    return uint(max(round(value), 0.0));
}

uint sanitized_channelCount(float channel_value) {
    int rounded = int(round(channel_value));
    if (rounded <= 1) {
        return 1u;
    }
    if (rounded >= 4) {
        return 4u;
    }
    return uint(rounded);
}

int reflect_coord(int coord, int limit) {
    if (limit <= 1) {
        return 0;
    }

    int period = 2 * limit - 2;
    int wrapped = coord % period;
    if (wrapped < 0) {
        wrapped = wrapped + period;
    }

    if (wrapped < limit) {
        return wrapped;
    }

    return period - wrapped;
}

vec4 load_texel(ivec2 coord, ivec2 size) {
    int reflected_x = reflect_coord(coord.x, size.x);
    int reflected_y = reflect_coord(coord.y, size.y);
    return texelFetch(inputTex, ivec2(reflected_x, reflected_y), 0);
}

float luminance_from_rgb(vec3 rgb) {
    return dot(rgb, LUMA_WEIGHTS);
}

float weight_from_luma(float center_luma, float neighbor_luma) {
    return exp(-sharpness * abs(center_luma - neighbor_luma));
}


out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    uvec3 global_id = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), 0u);

    uint width_u = max(as_u32(resolution.x), 1u);
    uint height_u = max(as_u32(resolution.y), 1u);
    if (global_id.x >= width_u || global_id.y >= height_u) {
        return;
    }

    uint channelCount = 4u;  // Always RGBA

    ivec2 image_size = ivec2(int(width_u), int(height_u));
    ivec2 pixel_coord = ivec2(int(global_id.x), int(global_id.y));

    vec4 center_texel = load_texel(pixel_coord, image_size);
    vec4 north_texel = load_texel(pixel_coord + ivec2(0, -1), image_size);
    vec4 south_texel = load_texel(pixel_coord + ivec2(0, 1), image_size);
    vec4 west_texel = load_texel(pixel_coord + ivec2(-1, 0), image_size);
    vec4 east_texel = load_texel(pixel_coord + ivec2(1, 0), image_size);

    vec3 center_rgb = center_texel.xyz;
    vec3 north_rgb = north_texel.xyz;
    vec3 south_rgb = south_texel.xyz;
    vec3 west_rgb = west_texel.xyz;
    vec3 east_rgb = east_texel.xyz;

    float center_luma;
    float north_luma;
    float south_luma;
    float west_luma;
    float east_luma;

    if (channelCount >= 3u) {
        center_luma = luminance_from_rgb(center_rgb);
        north_luma = luminance_from_rgb(north_rgb);
        south_luma = luminance_from_rgb(south_rgb);
        west_luma = luminance_from_rgb(west_rgb);
        east_luma = luminance_from_rgb(east_rgb);
    } else {
        center_luma = center_texel.x;
        north_luma = north_texel.x;
        south_luma = south_texel.x;
        west_luma = west_texel.x;
        east_luma = east_texel.x;
    }

    // Threshold: skip AA when max luma contrast is below threshold
    float maxDiff = max(
        max(abs(center_luma - north_luma), abs(center_luma - south_luma)),
        max(abs(center_luma - west_luma), abs(center_luma - east_luma))
    );
    if (maxDiff < threshold) {
        fragColor = center_texel;
        return;
    }

    float weight_center = 1.0;
    float weight_north = weight_from_luma(center_luma, north_luma);
    float weight_south = weight_from_luma(center_luma, south_luma);
    float weight_west = weight_from_luma(center_luma, west_luma);
    float weight_east = weight_from_luma(center_luma, east_luma);
    float weight_sum = weight_center + weight_north + weight_south + weight_west + weight_east + EPSILON;

    vec4 result_texel = center_texel;
    if (channelCount <= 2u) {
        float blended_luma = (
            center_texel.x * weight_center
            + north_texel.x * weight_north
            + south_texel.x * weight_south
            + west_texel.x * weight_west
            + east_texel.x * weight_east
        ) / weight_sum;

        result_texel.x = blended_luma;
        if (channelCount == 1u) {
            result_texel.y = center_texel.y;
            result_texel.z = center_texel.z;
        }
    } else {
        vec3 blended_rgb = (
            center_rgb * weight_center
            + north_rgb * weight_north
            + south_rgb * weight_south
            + west_rgb * weight_west
            + east_rgb * weight_east
        ) / weight_sum;

    result_texel = vec4(blended_rgb, result_texel.w);
    }

    result_texel.w = center_texel.w;

    // Strength: blend between original and AA result
    fragColor = mix(center_texel, result_texel, strength);
}
`,wgsl:`// FXAA antialiasing pass
// Applies an edge-aware blur weighted by luminance differences while preserving alpha.

struct Uniforms {
    data: array<vec4<f32>, 1>,
    // data[0].x = strength (fxaa)
    // data[0].y = sharpness (fxaa)
    // data[0].z = threshold (fxaa)
};

const EPSILON: f32 = 1e-10;
const LUMA_WEIGHTS: vec3<f32> = vec3<f32>(0.299, 0.587, 0.114);

// binding(0) deliberately unused \u2014 sampler declared previously was dead
// (only textureLoad is used below, which doesn't need a sampler).
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn luminance_from_rgb(rgb: vec3<f32>) -> f32 {
    return dot(rgb, LUMA_WEIGHTS);
}

fn weight_from_luma(center_luma: f32, neighbor_luma: f32, sharpness: f32) -> f32 {
    return exp(-sharpness * abs(center_luma - neighbor_luma));
}

fn reflect_coord(coord: i32, limit: i32) -> i32 {
    if (limit <= 1) {
        return 0;
    }

    let period: i32 = 2 * limit - 2;
    var wrapped: i32 = coord % period;
    if (wrapped < 0) {
        wrapped = wrapped + period;
    }

    if (wrapped < limit) {
        return wrapped;
    }

    return period - wrapped;
}

fn load_texel(coord: vec2<i32>, size: vec2<i32>) -> vec4<f32> {
    let rx = reflect_coord(coord.x, size.x);
    let ry = reflect_coord(coord.y, size.y);
    return textureLoad(inputTex, vec2<i32>(rx, ry), 0);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let strength = uniforms.data[0].x;
    let sharpness = uniforms.data[0].y;
    let threshold = uniforms.data[0].z;

    let size = vec2<i32>(textureDimensions(inputTex, 0));
    let pixel_coord = vec2<i32>(i32(position.x), i32(position.y));

    let center_texel = load_texel(pixel_coord, size);
    let north_texel = load_texel(pixel_coord + vec2<i32>(0, -1), size);
    let south_texel = load_texel(pixel_coord + vec2<i32>(0, 1), size);
    let west_texel = load_texel(pixel_coord + vec2<i32>(-1, 0), size);
    let east_texel = load_texel(pixel_coord + vec2<i32>(1, 0), size);

    let center_rgb = center_texel.xyz;
    let north_rgb = north_texel.xyz;
    let south_rgb = south_texel.xyz;
    let west_rgb = west_texel.xyz;
    let east_rgb = east_texel.xyz;

    let center_luma = luminance_from_rgb(center_rgb);
    let north_luma = luminance_from_rgb(north_rgb);
    let south_luma = luminance_from_rgb(south_rgb);
    let west_luma = luminance_from_rgb(west_rgb);
    let east_luma = luminance_from_rgb(east_rgb);

    // Threshold: skip AA when max luma contrast is below threshold
    let maxDiff = max(
        max(abs(center_luma - north_luma), abs(center_luma - south_luma)),
        max(abs(center_luma - west_luma), abs(center_luma - east_luma))
    );
    if (maxDiff < threshold) {
        return center_texel;
    }

    let weight_center: f32 = 1.0;
    let weight_north = weight_from_luma(center_luma, north_luma, sharpness);
    let weight_south = weight_from_luma(center_luma, south_luma, sharpness);
    let weight_west = weight_from_luma(center_luma, west_luma, sharpness);
    let weight_east = weight_from_luma(center_luma, east_luma, sharpness);
    let weight_sum = weight_center + weight_north + weight_south + weight_west + weight_east + EPSILON;

    let blended_rgb = (
        center_rgb * weight_center
        + north_rgb * weight_north
        + south_rgb * weight_south
        + west_rgb * weight_west
        + east_rgb * weight_east
    ) / weight_sum;

    let result_texel = vec4<f32>(blended_rgb, center_texel.w);

    // Strength: blend between original and AA result
    return mix(center_texel, result_texel, strength);
}
`}},i=`# fxaa

Fast approximate anti-aliasing

Applies an edge-aware blur weighted by luminance differences. Neighboring pixels with similar luminance are blended together while edges (large luminance jumps) are preserved. Alpha is passed through unchanged.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | 1.0 | 0-1 | Mix between original and anti-aliased output (0 = bypass, 1 = full effect) |
| sharpness | float | 1.0 | 0.1-10 | Edge sensitivity of the weight falloff. Higher values preserve edges more; lower values blur more aggressively |
| threshold | float | 0.0 | 0-1 | Minimum luminance contrast to trigger AA. Pixels with all neighbors below this contrast are left untouched |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .fxaa()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&i&&(t.help=i);var _="filter/fxaa",h="filter",c="fxaa",m=t;export{m as default,_ as effectId,c as effectName,i as help,h as namespace};
