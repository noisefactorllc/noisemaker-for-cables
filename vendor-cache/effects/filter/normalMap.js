/* filter/normalMap */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Normal Map",namespace:"filter",func:"normalMap",tags:["color"],description:"Normal map generation",globals:{},passes:[{name:"main",program:"normalMap",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={normalMap:{glsl:`#version 300 es
precision highp float;
precision highp int;

const uint CHANNEL_COUNT = 4u;
const uint CHANNEL_CAP = 4u;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform vec4 size;
uniform vec4 motion;

layout(location = 0) out vec4 fragColor;

const ivec2 SOBEL_OFFSETS[9] = ivec2[](
    ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1),
    ivec2(-1,  0), ivec2(0,  0), ivec2(1,  0),
    ivec2(-1,  1), ivec2(0,  1), ivec2(1,  1)
);

const float SOBEL_X_KERNEL[9] = float[](
    0.5, 0.0, -0.5,
    1.0, 0.0, -1.0,
    0.5, 0.0, -0.5
);

const float SOBEL_Y_KERNEL[9] = float[](
    0.5, 1.0, 0.5,
    0.0, 0.0, 0.0,
   -0.5, -1.0, -0.5
);

uint as_u32(float value) {
    return uint(max(round(value), 0.0));
}

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

uint sanitize_channelCount(float raw_value) {
    uint count = as_u32(raw_value);
    if (count <= 1u) {
        return 1u;
    }
    if (count >= CHANNEL_CAP) {
        return CHANNEL_CAP;
    }
    return count;
}

int wrap_coord(int value, int limit) {
    if (limit <= 0) {
        return 0;
    }
    int wrapped = value % limit;
    if (wrapped < 0) {
        wrapped = wrapped + limit;
    }
    return wrapped;
}

float srgb_to_linear(float value) {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

float cbrt_safe(float value) {
    if (value == 0.0) {
        return 0.0;
    }
    float sign_value = (value >= 0.0) ? 1.0 : -1.0;
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

float oklab_l_component(vec3 rgb) {
    float r = srgb_to_linear(clamp01(rgb.x));
    float g = srgb_to_linear(clamp01(rgb.y));
    float b = srgb_to_linear(clamp01(rgb.z));

    float l = 0.4121656120 * r + 0.5362752080 * g + 0.0514575653 * b;
    float m = 0.2118591070 * r + 0.6807189584 * g + 0.1074065790 * b;
    float s = 0.0883097947 * r + 0.2818474174 * g + 0.6302613616 * b;

    float l_c = cbrt_safe(l);
    float m_c = cbrt_safe(m);
    float s_c = cbrt_safe(s);

    return clamp01(0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c);
}

float value_map_component(vec4 texel, uint channelCount) {
    if (channelCount <= 1u) {
        return texel.x;
    }
    if (channelCount == 2u) {
        return texel.x;
    }
    if (channelCount == 3u) {
        return oklab_l_component(texel.xyz);
    }
    vec3 clamped_rgb = clamp(texel.xyz, vec3(0.0), vec3(1.0));
    return oklab_l_component(clamped_rgb);
}

float compute_reference_value(ivec2 coords, uint channelCount) {
    vec4 texel = texelFetch(inputTex, coords, 0);
    return value_map_component(texel, channelCount);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    uvec3 global_id = uvec3(uint(gl_FragCoord.x), uint(gl_FragCoord.y), 0u);

    uint width = as_u32(size.x);
    uint height = as_u32(size.y);
    ivec2 dims = textureSize(inputTex, 0);
    if (width == 0u) {
        width = uint(max(dims.x, 1));
    }
    if (height == 0u) {
        height = uint(max(dims.y, 1));
    }
    if (global_id.x >= width || global_id.y >= height) {
        return;
    }

    uint channelCount = sanitize_channelCount(size.z);
    int width_i = int(width);
    int height_i = int(height);

    float dx = 0.0;
    float dy = 0.0;

    for (int i = 0; i < 9; i++) {
        ivec2 offset = SOBEL_OFFSETS[i];
        ivec2 sample_coord = ivec2(
            wrap_coord(int(global_id.x) + offset.x, width_i),
            wrap_coord(int(global_id.y) + offset.y, height_i)
        );
        float value = compute_reference_value(sample_coord, channelCount);
        dx += value * SOBEL_X_KERNEL[i];
        dy += value * SOBEL_Y_KERNEL[i];
    }

    float x_value = clamp(dx * 0.5 + 0.5, 0.0, 1.0);
    float y_value = clamp(dy * 0.5 + 0.5, 0.0, 1.0);
    float z_value = clamp(1.0 - (abs(dx) + abs(dy)) * 0.5, 0.0, 1.0);

    vec4 texel = texelFetch(inputTex, ivec2(global_id.xy), 0);
    fragColor = vec4(x_value, y_value, z_value, texel.w);
}
`,wgsl:`// Normal map generation. Mirrors noisemaker.effects.normal_map by computing a
// grayscale reference map, Sobel derivatives, and a stylized Z component.

const CHANNEL_COUNT : u32 = 4u;
const CHANNEL_CAP : u32 = 4u;

struct NormalMapParams {
    size : vec4<f32>,    // (width, height, channels, unused)
    motion : vec4<f32>,  // (time, speed, unused, unused)
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> params : NormalMapParams;

const SOBEL_OFFSETS : array<vec2<i32>, 9> = array<vec2<i32>, 9>(
    vec2<i32>(-1, -1), vec2<i32>(0, -1), vec2<i32>(1, -1),
    vec2<i32>(-1,  0), vec2<i32>(0,  0), vec2<i32>(1,  0),
    vec2<i32>(-1,  1), vec2<i32>(0,  1), vec2<i32>(1,  1)
);

const SOBEL_X_KERNEL : array<f32, 9> = array<f32, 9>(
    0.5, 0.0, -0.5,
    1.0, 0.0, -1.0,
    0.5, 0.0, -0.5
);

const SOBEL_Y_KERNEL : array<f32, 9> = array<f32, 9>(
    0.5, 1.0, 0.5,
    0.0, 0.0, 0.0,
   -0.5, -1.0, -0.5
);

fn as_u32(value : f32) -> u32 {
    return u32(max(round(value), 0.0));
}

fn clamp01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn sanitize_channelCount(raw_value : f32) -> u32 {
    let count : u32 = as_u32(raw_value);
    if (count <= 1u) {
        return 1u;
    }
    if (count >= CHANNEL_CAP) {
        return CHANNEL_CAP;
    }
    return count;
}

fn wrap_coord(value : i32, limit : i32) -> i32 {
    if (limit <= 0) {
        return 0;
    }
    var wrapped : i32 = value % limit;
    if (wrapped < 0) {
        wrapped = wrapped + limit;
    }
    return wrapped;
}

fn srgb_to_linear(value : f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn cbrt_safe(value : f32) -> f32 {
    if (value == 0.0) {
        return 0.0;
    }
    let sign_value : f32 = select(-1.0, 1.0, value >= 0.0);
    return sign_value * pow(abs(value), 1.0 / 3.0);
}

fn oklab_l_component(rgb : vec3<f32>) -> f32 {
    let r : f32 = srgb_to_linear(clamp01(rgb.x));
    let g : f32 = srgb_to_linear(clamp01(rgb.y));
    let b : f32 = srgb_to_linear(clamp01(rgb.z));

    let l : f32 = 0.4121656120 * r + 0.5362752080 * g + 0.0514575653 * b;
    let m : f32 = 0.2118591070 * r + 0.6807189584 * g + 0.1074065790 * b;
    let s : f32 = 0.0883097947 * r + 0.2818474174 * g + 0.6302613616 * b;

    let l_c : f32 = cbrt_safe(l);
    let m_c : f32 = cbrt_safe(m);
    let s_c : f32 = cbrt_safe(s);

    return clamp01(0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c);
}

fn value_map_component(texel : vec4<f32>, channelCount : u32) -> f32 {
    if (channelCount <= 1u) {
        return texel.x;
    }
    if (channelCount == 2u) {
        return texel.x;
    }
    if (channelCount == 3u) {
        return oklab_l_component(texel.xyz);
    }
    let clamped_rgb : vec3<f32> = clamp(texel.xyz, vec3<f32>(0.0), vec3<f32>(1.0));
    return oklab_l_component(clamped_rgb);
}

fn compute_reference_value(coords : vec2<i32>, channelCount : u32) -> f32 {
    let texel : vec4<f32> = textureLoad(inputTex, coords, 0);
    return value_map_component(texel, channelCount);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let width : u32 = as_u32(params.size.x);
    let height : u32 = as_u32(params.size.y);
    
    // Parallel per-pixel computation: each thread handles one pixel
    let x : u32 = gid.x;
    let y : u32 = gid.y;
    
    if (x >= width || y >= height) {
        return;
    }

    let channelCount : u32 = sanitize_channelCount(params.size.z);
    let width_i : i32 = i32(width);
    let height_i : i32 = i32(height);
    
    // Compute Sobel X response (no normalization needed - matches Python reference)
    var sobel_x : f32 = 0.0;
    for (var i : u32 = 0u; i < 9u; i = i + 1u) {
        let offset : vec2<i32> = SOBEL_OFFSETS[i];
        let sample_x : i32 = wrap_coord(i32(x) + offset.x, width_i);
        let sample_y : i32 = wrap_coord(i32(y) + offset.y, height_i);
        let coords : vec2<i32> = vec2<i32>(sample_x, sample_y);
        let sample_value : f32 = compute_reference_value(coords, channelCount);
        sobel_x = sobel_x + sample_value * SOBEL_X_KERNEL[i];
    }
    
    // Compute Sobel Y response (no normalization needed - matches Python reference)
    var sobel_y : f32 = 0.0;
    for (var i : u32 = 0u; i < 9u; i = i + 1u) {
        let offset : vec2<i32> = SOBEL_OFFSETS[i];
        let sample_x : i32 = wrap_coord(i32(x) + offset.x, width_i);
        let sample_y : i32 = wrap_coord(i32(y) + offset.y, height_i);
        let coords : vec2<i32> = vec2<i32>(sample_x, sample_y);
        let sample_value : f32 = compute_reference_value(coords, channelCount);
        sobel_y = sobel_y + sample_value * SOBEL_Y_KERNEL[i];
    }
    
    // Normalize Sobel outputs to [0, 1] range
    // Sobel kernels can produce values roughly in [-4, 4] for typical gradients
    // We use a scaling factor to map this to a reasonable range
    let sobel_scale : f32 = 0.25;  // Approximates 1/4, mapping [-4,4] to [-1,1]
    
    // Python does: x = normalize(1 - sobel_x), y = normalize(sobel_y)
    // Map sobel responses to [0, 1] range and apply the inversion for x
    let sobel_x_scaled : f32 = sobel_x * sobel_scale + 0.5;  // Map to [0, 1]
    let sobel_y_scaled : f32 = sobel_y * sobel_scale + 0.5;  // Map to [0, 1]
    
    let x_value : f32 = clamp01(1.0 - sobel_x_scaled);
    let y_value : f32 = clamp01(sobel_y_scaled);
    
    // Compute Z component: z = 1 - abs(normalize(sqrt(x^2 + y^2)) * 2 - 1) * 0.5 + 0.5
    let magnitude : f32 = sqrt(x_value * x_value + y_value * y_value);
    let normalized_magnitude : f32 = clamp01(magnitude);
    let two_z : f32 = normalized_magnitude * 2.0 - 1.0;
    let z_value : f32 = 1.0 - abs(two_z) * 0.5 + 0.5;

    let pixel : u32 = y * width + x;
    let base_index : u32 = pixel * CHANNEL_COUNT;
    let texel : vec4<f32> = textureLoad(inputTex, vec2<i32>(i32(x), i32(y)), 0);

    output_buffer[base_index + 0u] = x_value;
    output_buffer[base_index + 1u] = y_value;
    output_buffer[base_index + 2u] = z_value;
    output_buffer[base_index + 3u] = texel.w;
}
`}},i=`# normalMap

Normal map generation

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .normalMap()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[a,n]of Object.entries(r))e.shaders[a]={...n}}e&&i&&(e.help=i);var c="filter/normalMap",_="filter",f="normalMap",p=e;export{p as default,c as effectId,f as effectName,i as help,_ as namespace};
