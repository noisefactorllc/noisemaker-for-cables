/* filter/reindex */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Reindex",namespace:"filter",func:"reindex",tags:["color"],description:"Palette reindexing",globals:{displacement:{type:"float",default:.5,min:0,max:2,step:.01,uniform:"uDisplacement",ui:{label:"displacement",control:"slider"}}},textures:{statsTiles:{format:"rgba16f"},global_stats:{width:1,height:1,format:"rgba16f"}},passes:[{name:"stats",program:"nmReindexStats",inputs:{inputTex:"inputTex"},outputs:{fragColor:"statsTiles"}},{name:"reduce",program:"nmReindexReduce",inputs:{statsTex:"statsTiles"},outputs:{fragColor:"global_stats"}},{name:"apply",program:"nmReindexApply",inputs:{inputTex:"inputTex",statsTex:"global_stats"},uniforms:{uDisplacement:"displacement"},outputs:{fragColor:"outputTex"}}]});var l={nmReindexApply:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Reindex Pass 3 (Apply): remap pixels using previously computed global min/max.

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform vec2 resolution;
uniform sampler2D inputTex;
uniform sampler2D statsTex;
uniform float uDisplacement;

out vec4 fragColor;

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

float srgb_to_linear(float value) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

float cube_root(float value) {
    if (value == 0.0) {
        return 0.0;
    }
    float sign_value = value >= 0.0 ? 1.0 : -1.0;
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

float oklab_l_component(vec3 rgb) {
    float r_lin = srgb_to_linear(clamp01(rgb.x));
    float g_lin = srgb_to_linear(clamp01(rgb.y));
    float b_lin = srgb_to_linear(clamp01(rgb.z));

    float l = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    float m = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    float s = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;

    float l_c = cube_root(l);
    float m_c = cube_root(m);
    float s_c = cube_root(s);

    float lightness = 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
    return clamp01(lightness);
}

float value_map_component(vec4 texel) {
    return oklab_l_component(texel.xyz);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 pixel = ivec2(gl_FragCoord.xy);

    if (pixel.x >= texSize.x || pixel.y >= texSize.y) {
        fragColor = vec4(0.0);
        return;
    }

    vec4 texel = texelFetch(inputTex, pixel, 0);
    float referenceValue = value_map_component(texel);

    vec2 minMax = texelFetch(statsTex, ivec2(0, 0), 0).xy;
    float range = minMax.y - minMax.x;

    float normalized = referenceValue;
    if (range > 0.0001) {
        normalized = clamp01((referenceValue - minMax.x) / range);
    }

    float modRange = float(min(texSize.x, texSize.y));
    float offsetValue = normalized * uDisplacement * modRange + normalized;
    
    // Use fract() for smooth wrapping to avoid seams at tile boundaries
    int sampleX = int(fract(offsetValue / float(texSize.x)) * float(texSize.x));
    int sampleY = int(fract(offsetValue / float(texSize.y)) * float(texSize.y));
    
    // Clamp to valid texture coordinates
    sampleX = min(sampleX, texSize.x - 1);
    sampleY = min(sampleY, texSize.y - 1);

    vec4 sampled = texelFetch(inputTex, ivec2(sampleX, sampleY), 0);
    fragColor = sampled;
}`,wgsl:`// Reindex Pass 3 (Apply): remap pixels using computed global statistics.
const F32_EPSILON : f32 = 0.0001;

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var stats_texture : texture_2d<f32>;
@group(0) @binding(2) var<uniform> uDisplacement : f32;

fn clamp01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn srgb_to_linear(value : f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn cube_root(value : f32) -> f32 {
    if (value == 0.0) {
        return 0.0;
    }
    let sign_value : f32 = select(-1.0, 1.0, value >= 0.0);
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

fn oklab_l_component(rgb : vec3<f32>) -> f32 {
    let r_lin : f32 = srgb_to_linear(clamp01(rgb.x));
    let g_lin : f32 = srgb_to_linear(clamp01(rgb.y));
    let b_lin : f32 = srgb_to_linear(clamp01(rgb.z));

    let l : f32 = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    let m : f32 = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    let s : f32 = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;

    let l_c : f32 = cube_root(l);
    let m_c : f32 = cube_root(m);
    let s_c : f32 = cube_root(s);

    let lightness : f32 = 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
    return clamp01(lightness);
}

fn value_map_component(texel : vec4<f32>) -> f32 {
    return oklab_l_component(texel.xyz);
}

fn wrap_float(value : f32, range : f32) -> f32 {
    if (range <= 0.0) {
        return 0.0;
    }
    return value - range * floor(value / range);
}

fn wrap_index(value : f32, dimension : i32) -> i32 {
    if (dimension <= 0) {
        return 0;
    }
    let dimension_f : f32 = f32(dimension);
    let wrapped : f32 = wrap_float(value, dimension_f);
    let max_index : f32 = f32(dimension - 1);
    return i32(clamp(floor(wrapped), 0.0, max_index));
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims : vec2<u32> = textureDimensions(inputTex, 0);
    if (dims.x == 0u || dims.y == 0u) {
        return vec4<f32>(0.0);
    }

    let coord : vec2<i32> = vec2<i32>(i32(position.x), i32(position.y));
    if (coord.x < 0 || coord.y < 0 || coord.x >= i32(dims.x) || coord.y >= i32(dims.y)) {
        return vec4<f32>(0.0);
    }

    let texel : vec4<f32> = textureLoad(inputTex, coord, 0);
    let reference_value : f32 = value_map_component(texel);

    let min_max : vec2<f32> = textureLoad(stats_texture, vec2<i32>(0, 0), 0).xy;
    let range : f32 = min_max.y - min_max.x;

    var normalized : f32 = reference_value;
    if (range > F32_EPSILON) {
        normalized = clamp01((reference_value - min_max.x) / range);
    }

    let mod_range : f32 = f32(min(dims.x, dims.y));
    let offset_value : f32 = normalized * uDisplacement * mod_range + normalized;
    let sample_x : i32 = wrap_index(offset_value, i32(dims.x));
    let sample_y : i32 = wrap_index(offset_value, i32(dims.y));

    return textureLoad(inputTex, vec2<i32>(sample_x, sample_y), 0);
}
`},nmReindexReduce:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Reindex Pass 2 (Reduce): collapse tile statistics to a global min/max pair.

const float F32_MAX = 3.402823466e38;
const float F32_MIN = -3.402823466e38;
const int TILE_SIZE = 8;
const int MAX_TILE_DIM = 512; // Supports resolutions up to 4096px.

uniform sampler2D statsTex;

out vec4 fragColor;

void main() {
    // Single pixel output; ensure only the first fragment runs the reduction.
    if (int(gl_FragCoord.x) != 0 || int(gl_FragCoord.y) != 0) {
        fragColor = vec4(0.0);
        return;
    }

    ivec2 statsTexSize = textureSize(statsTex, 0);
    ivec2 tileCount = ivec2(
        (statsTexSize.x + TILE_SIZE - 1) / TILE_SIZE,
        (statsTexSize.y + TILE_SIZE - 1) / TILE_SIZE
    );

    float globalMin = F32_MAX;
    float globalMax = F32_MIN;

    for (int ty = 0; ty < MAX_TILE_DIM; ++ty) {
        if (ty >= tileCount.y) break;
        for (int tx = 0; tx < MAX_TILE_DIM; ++tx) {
            if (tx >= tileCount.x) break;
            ivec2 sampleCoord = ivec2(tx * TILE_SIZE, ty * TILE_SIZE);
            vec2 tileStats = texelFetch(statsTex, sampleCoord, 0).xy;
            globalMin = min(globalMin, tileStats.x);
            globalMax = max(globalMax, tileStats.y);
        }
    }

    fragColor = vec4(globalMin, globalMax, 0.0, 1.0);
}`,wgsl:`// Reindex Pass 2 (Reduce): collapse tile statistics to a global min/max pair.
const TILE_SIZE : i32 = 8;
const MAX_TILE_DIM : i32 = 512;
const F32_MAX : f32 = 3.402823466e38;
const F32_MIN : f32 = -3.402823466e38;

@group(0) @binding(0) var stats_texture : texture_2d<f32>;
@group(0) @binding(1) var<uniform> resolution : vec2<f32>;

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    if (i32(position.x) != 0 || i32(position.y) != 0) {
        return vec4<f32>(0.0);
    }

    let dims : vec2<u32> = textureDimensions(stats_texture, 0);
    if (dims.x == 0u || dims.y == 0u) {
        return vec4<f32>(0.0);
    }

    let width_px : i32 = max(i32(round(resolution.x)), 0);
    let height_px : i32 = max(i32(round(resolution.y)), 0);
    let tile_count : vec2<i32> = vec2<i32>(
        (width_px + TILE_SIZE - 1) / TILE_SIZE,
        (height_px + TILE_SIZE - 1) / TILE_SIZE
    );

    var global_min : f32 = F32_MAX;
    var global_max : f32 = F32_MIN;
    let tex_width : i32 = i32(dims.x);
    let tex_height : i32 = i32(dims.y);

    for (var ty : i32 = 0; ty < MAX_TILE_DIM; ty = ty + 1) {
        if (ty >= tile_count.y) {
            break;
        }
        for (var tx : i32 = 0; tx < MAX_TILE_DIM; tx = tx + 1) {
            if (tx >= tile_count.x) {
                break;
            }
            let sample_coord : vec2<i32> = vec2<i32>(tx * TILE_SIZE, ty * TILE_SIZE);
            if (sample_coord.x >= tex_width || sample_coord.y >= tex_height) {
                continue;
            }
            let tile_stats : vec2<f32> = textureLoad(stats_texture, sample_coord, 0).xy;
            global_min = min(global_min, tile_stats.x);
            global_max = max(global_max, tile_stats.y);
        }
    }

    return vec4<f32>(global_min, global_max, 0.0, 1.0);
}
`},nmReindexStats:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Reindex Pass 1 (Stats): compute lightness range per 8x8 tile.

const float F32_MAX = 3.402823466e38;
const float F32_MIN = -3.402823466e38;
const int TILE_SIZE = 8;

uniform sampler2D inputTex;

out vec4 fragColor;

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

float srgb_to_linear(float value) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

float cube_root(float value) {
    if (value == 0.0) {
        return 0.0;
    }
    float sign_value = value >= 0.0 ? 1.0 : -1.0;
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

float oklab_l_component(vec3 rgb) {
    float r_lin = srgb_to_linear(clamp01(rgb.x));
    float g_lin = srgb_to_linear(clamp01(rgb.y));
    float b_lin = srgb_to_linear(clamp01(rgb.z));

    float l = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    float m = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    float s = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;

    float l_c = cube_root(l);
    float m_c = cube_root(m);
    float s_c = cube_root(s);

    float lightness = 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
    return clamp01(lightness);
}

float value_map_component(vec4 texel) {
    return oklab_l_component(texel.xyz);
}

void main() {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    int localX = fragCoord.x % TILE_SIZE;
    int localY = fragCoord.y % TILE_SIZE;

    // Only the tile anchor (top-left pixel of the tile) performs the reduction.
    if (localX != 0 || localY != 0) {
        fragColor = vec4(0.0);
        return;
    }

    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 tileOrigin = fragCoord;

    float minValue = F32_MAX;
    float maxValue = F32_MIN;

    for (int oy = 0; oy < TILE_SIZE; ++oy) {
        int py = tileOrigin.y + oy;
        if (py >= texSize.y) break;
        for (int ox = 0; ox < TILE_SIZE; ++ox) {
            int px = tileOrigin.x + ox;
            if (px >= texSize.x) break;
            vec4 texel = texelFetch(inputTex, ivec2(px, py), 0);
            float value = value_map_component(texel);
            minValue = min(minValue, value);
            maxValue = max(maxValue, value);
        }
    }

    fragColor = vec4(minValue, maxValue, 0.0, 1.0);
}`,wgsl:`// Reindex Pass 1 (Stats): compute lightness range per TILE_SIZE tile.
const TILE_SIZE : i32 = 8;
const F32_MAX : f32 = 3.402823466e38;
const F32_MIN : f32 = -3.402823466e38;

@group(0) @binding(0) var inputTex : texture_2d<f32>;

fn clamp01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn srgb_to_linear(value : f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn cube_root(value : f32) -> f32 {
    if (value == 0.0) {
        return 0.0;
    }
    let sign_value : f32 = select(-1.0, 1.0, value >= 0.0);
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

fn oklab_l_component(rgb : vec3<f32>) -> f32 {
    let r_lin : f32 = srgb_to_linear(clamp01(rgb.x));
    let g_lin : f32 = srgb_to_linear(clamp01(rgb.y));
    let b_lin : f32 = srgb_to_linear(clamp01(rgb.z));

    let l : f32 = 0.4121656120 * r_lin + 0.5362752080 * g_lin + 0.0514575653 * b_lin;
    let m : f32 = 0.2118591070 * r_lin + 0.6807189584 * g_lin + 0.1074065790 * b_lin;
    let s : f32 = 0.0883097947 * r_lin + 0.2818474174 * g_lin + 0.6302613616 * b_lin;

    let l_c : f32 = cube_root(l);
    let m_c : f32 = cube_root(m);
    let s_c : f32 = cube_root(s);

    let lightness : f32 = 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
    return clamp01(lightness);
}

fn value_map_component(texel : vec4<f32>) -> f32 {
    return oklab_l_component(texel.xyz);
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims : vec2<u32> = textureDimensions(inputTex, 0);
    if (dims.x == 0u || dims.y == 0u) {
        return vec4<f32>(0.0);
    }

    let coord : vec2<i32> = vec2<i32>(i32(position.x), i32(position.y));
    if (coord.x < 0 || coord.y < 0) {
        return vec4<f32>(0.0);
    }

    let local_x : i32 = coord.x % TILE_SIZE;
    let local_y : i32 = coord.y % TILE_SIZE;
    if (local_x != 0 || local_y != 0) {
        return vec4<f32>(0.0);
    }

    var min_value : f32 = F32_MAX;
    var max_value : f32 = F32_MIN;
    let tile_origin : vec2<i32> = coord;
    let width : i32 = i32(dims.x);
    let height : i32 = i32(dims.y);

    for (var oy : i32 = 0; oy < TILE_SIZE; oy = oy + 1) {
        let py : i32 = tile_origin.y + oy;
        if (py >= height) {
            break;
        }
        for (var ox : i32 = 0; ox < TILE_SIZE; ox = ox + 1) {
            let px : i32 = tile_origin.x + ox;
            if (px >= width) {
                break;
            }
            let sample : vec4<f32> = textureLoad(inputTex, vec2<i32>(px, py), 0);
            let value : f32 = value_map_component(sample);
            min_value = min(min_value, value);
            max_value = max(max_value, value);
        }
    }

    return vec4<f32>(min_value, max_value, 0.0, 1.0);
}
`}},a=`# reindex

Palette reindexing

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| displacement | float | 0.5 | 0-2 | Displacement |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .reindex()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(l).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(l))e.shaders[i]={...n}}e&&a&&(e.help=a);var f="filter/reindex",_="filter",c="reindex",m=e;export{m as default,f as effectId,c as effectName,a as help,_ as namespace};
