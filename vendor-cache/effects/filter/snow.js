/* filter/snow */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Snow",namespace:"filter",func:"snow",tags:["noise"],description:"TV snow/static noise",globals:{alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,zero:0,ui:{label:"alpha",control:"slider"}},pause:{type:"boolean",default:!1,uniform:"pause",ui:{label:"pause",control:"checkbox"}},density:{type:"float",default:75,uniform:"density",min:0,max:100,ui:{label:"density",control:"slider"}}},passes:[{name:"main",program:"snow",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha",pause:"pause",density:"density"},outputs:{fragColor:"outputTex"}}]});var s={snow:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Snow effect: blends animated static noise into the source image.

const uint CHANNEL_COUNT = 4u;
const float TAU = 6.283185307179586;
const vec3 TIME_SEED_OFFSETS = vec3(97.0, 57.0, 131.0);
const vec3 STATIC_SEED = vec3(37.0, 17.0, 53.0);
const vec3 LIMITER_SEED = vec3(113.0, 71.0, 193.0);


uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float alpha;
uniform float time;
uniform float pause;
uniform float density;

out vec4 fragColor;

uint as_u32(float value) {
    return uint(max(round(value), 0.0));
}

float clamp_01(float value) {
    return clamp(value, 0.0, 1.0);
}

float normalized_sine(float value) {
    return (sin(value) + 1.0) * 0.5;
}

float periodic_value(float time, float value) {
    return normalized_sine((time - value) * TAU);
}

vec3 snow_fract_vec3(vec3 value) {
    return value - floor(value);
}

float snow_hash(vec3 input_sample) {
    vec3 scaled = snow_fract_vec3(input_sample * 0.1031);
    float dot_val = dot(scaled, scaled.yzx + vec3(33.33));
    vec3 shifted = scaled + dot_val;
    float combined = (shifted.x + shifted.y) * shifted.z;
    float fractional = combined - floor(combined);
    return clamp(fractional, 0.0, 1.0);
}

float snow_noise(vec2 coord, float time, float speed, vec3 seed) {
    float angle = time * TAU;
    float z_base = cos(angle) * speed;
    vec3 base_sample = vec3(coord.x + seed.x, coord.y + seed.y, z_base + seed.z);
    float base_value = snow_hash(base_sample);

    if (speed == 0.0 || time == 0.0) {
        return base_value;
    }

    vec3 time_seed = seed + TIME_SEED_OFFSETS;
    vec3 time_sample = vec3(
        coord.x + time_seed.x,
        coord.y + time_seed.y,
        1.0 + time_seed.z
    );
    float time_value = snow_hash(time_sample);
    float scaled_time = periodic_value(time, time_value) * speed;
    float periodic = periodic_value(scaled_time, base_value);
    return clamp(periodic, 0.0, 1.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coords = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));
    vec4 texel = texelFetch(inputTex, coords, 0);

    float alphaVal = clamp(alpha, 0.0, 1.0);
    if (alphaVal == 0.0) {
        fragColor = texel;
        return;
    }

    vec2 pixelCoord = vec2(gl_FragCoord.x + tileOffset.x, gl_FragCoord.y + tileOffset.y);
    float timeVal = pause > 0.5 ? 0.0 : time;
    float speedVal = 100.0;

    float static_value = snow_noise(pixelCoord, timeVal, speedVal, STATIC_SEED);
    float limiter_value = snow_noise(pixelCoord, timeVal, speedVal, LIMITER_SEED);
    float d = max(density * 0.01, 0.0001);
    float exponent = (1.0 - d) / d;
    float limiter_mask = pow(min(limiter_value, 0.99), exponent) * alphaVal;

    vec3 static_color = vec3(static_value);
    vec3 mixed_rgb = mix(texel.xyz, static_color, vec3(limiter_mask));

    fragColor = vec4(mixed_rgb, texel.w);
}`,wgsl:`// Snow effect: blends animated static noise into the source image.

const CHANNEL_COUNT : u32 = 4u;
const TAU : f32 = 6.283185307179586;
const TIME_SEED_OFFSETS : vec3<f32> = vec3<f32>(97.0, 57.0, 131.0);
const STATIC_SEED : vec3<f32> = vec3<f32>(37.0, 17.0, 53.0);
const LIMITER_SEED : vec3<f32> = vec3<f32>(113.0, 71.0, 193.0);

struct SnowParams {
    width : f32,
    height : f32,
    channels : f32,
    alpha : f32,
    time : f32,
    pause : f32,
    density : f32,
    _pad0 : f32,
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> params : SnowParams;

fn as_u32(value : f32) -> u32 {
    return u32(max(round(value), 0.0));
}

fn clamp_01(value : f32) -> f32 {
    return clamp(value, 0.0, 1.0);
}

fn write_pixel(base_index : u32, rgb : vec3<f32>, alpha : f32) {
    output_buffer[base_index + 0u] = clamp_01(rgb.x);
    output_buffer[base_index + 1u] = clamp_01(rgb.y);
    output_buffer[base_index + 2u] = clamp_01(rgb.z);
    output_buffer[base_index + 3u] = clamp_01(alpha);
}

fn normalized_sine(value : f32) -> f32 {
    return (sin(value) + 1.0) * 0.5;
}

fn periodic_value(time : f32, value : f32) -> f32 {
    return normalized_sine((time - value) * TAU);
}

fn snow_fract_vec3(value : vec3<f32>) -> vec3<f32> {
    return value - floor(value);
}

fn snow_hash(sample : vec3<f32>) -> f32 {
    let scaled : vec3<f32> = snow_fract_vec3(sample * 0.1031);
    let dot_val : f32 = dot(scaled, scaled.yzx + vec3<f32>(33.33));
    let shifted : vec3<f32> = scaled + dot_val;
    let combined : f32 = (shifted.x + shifted.y) * shifted.z;
    let fractional : f32 = combined - floor(combined);
    return clamp(fractional, 0.0, 1.0);
}

fn snow_noise(coord : vec2<f32>, time : f32, speed : f32, seed : vec3<f32>) -> f32 {
    let angle : f32 = time * TAU;
    let z_base : f32 = cos(angle) * speed;
    let base_sample : vec3<f32> = vec3<f32>(coord.x + seed.x, coord.y + seed.y, z_base + seed.z);
    let base_value : f32 = snow_hash(base_sample);

    if (speed == 0.0 || time == 0.0) {
        return base_value;
    }

    let time_seed : vec3<f32> = seed + TIME_SEED_OFFSETS;
    let time_sample : vec3<f32> = vec3<f32>(
        coord.x + time_seed.x,
        coord.y + time_seed.y,
        1.0 + time_seed.z
    );
    let time_value : f32 = snow_hash(time_sample);
    let scaled_time : f32 = periodic_value(time, time_value) * speed;
    let periodic : f32 = periodic_value(scaled_time, base_value);
    return clamp(periodic, 0.0, 1.0);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let width : u32 = max(as_u32(params.width), 1u);
    let height : u32 = max(as_u32(params.height), 1u);
    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let alpha : f32 = clamp(params.alpha, 0.0, 1.0);
    let base_index : u32 = (gid.y * width + gid.x) * CHANNEL_COUNT;
    let coords : vec2<i32> = vec2<i32>(i32(gid.x), i32(gid.y));
    let texel : vec4<f32> = textureLoad(inputTex, coords, 0);

    if (alpha == 0.0) {
        write_pixel(base_index, texel.xyz, texel.w);
        return;
    }

    let coord : vec2<f32> = vec2<f32>(f32(gid.x), f32(gid.y));
    let time : f32 = select(params.time, 0.0, params.pause > 0.5);
    let speed : f32 = 100.0;

    let static_value : f32 = snow_noise(coord, time, speed, STATIC_SEED);
    let limiter_value : f32 = snow_noise(coord, time, speed, LIMITER_SEED);
    let d : f32 = max(params.density * 0.01, 0.0001);
    let exponent : f32 = (1.0 - d) / d;
    let limiter_mask : f32 = pow(min(limiter_value, 0.99), exponent) * alpha;

    let static_color : vec3<f32> = vec3<f32>(static_value);
    let mixed_rgb : vec3<f32> = mix(texel.xyz, static_color, vec3<f32>(limiter_mask));

    write_pixel(base_index, mixed_rgb, texel.w);
}
`}},i=`# snow

TV snow/static noise

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 0.5 | 0-1 | Alpha |
| pause | boolean | false | - | Pause |
| density | float | 75 | 0-100 | Density |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .snow()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(s))n.shaders[a]={...e}}n&&i&&(n.help=i);var u="filter/snow",c="filter",d="snow",p=n;export{p as default,u as effectId,d as effectName,i as help,c as namespace};
