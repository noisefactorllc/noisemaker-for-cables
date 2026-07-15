/* filter/lightLeak */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Light Leak",namespace:"filter",func:"lightLeak",tags:["color"],description:"Film light leak overlay with colorful Voronoi regions",globals:{alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},color:{type:"color",default:[1,.8,.3],uniform:"color",ui:{label:"color",control:"color"}},speed:{type:"float",default:.5,uniform:"speed",min:0,max:5,step:.01,ui:{label:"speed",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}}},passes:[{name:"main",program:"lightLeak",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha",color:"color",speed:"speed",seed:"seed"},outputs:{fragColor:"outputTex"}}]});var s={lightLeak:{glsl:`/*
 * Light Leak: Voronoi-based colored light leak with wormhole distortion,
 * bloom approximation, screen blend, center mask, and vaseline blur.
 */

#ifdef GL_ES
precision highp float;
#endif

const float TAU = 6.28318530717958647692;
const int POINT_COUNT = 6;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float alpha;
uniform vec3 color;
uniform float speed;
uniform int seed;
uniform float time;

out vec4 fragColor;

// PCG PRNG
uvec3 pcg(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

float hash31(vec3 p) {
    uvec3 v = uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        uint(p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0)
    );
    return float(pcg(v).x) / float(0xffffffffu);
}

vec3 hash33(vec3 p) {
    uvec3 v = uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        uint(p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0)
    );
    uvec3 h = pcg(v);
    return vec3(
        float(h.x) / float(0xffffffffu),
        float(h.y) / float(0xffffffffu),
        float(h.z) / float(0xffffffffu)
    );
}

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// Voronoi: find nearest of 6 seed-based points, return cell color + distance
void voronoiCell(vec2 uv, float seed_f, float t, out vec3 cell_color, out float cell_dist) {
    float best_dist = 1e9;
    int best_index = 0;
    float drift = 0.05;

    for (int i = 0; i < POINT_COUNT; i++) {
        vec3 s = vec3(seed_f, float(i) * 7.31, 0.0);
        vec2 base = hash33(s).xy;
        vec2 osc = vec2(
            sin(t * 0.7 + float(i) * 1.618),
            cos(t * 0.5 + float(i) * 2.236)
        ) * drift;
        vec2 pt = fract(base + osc);
        vec2 delta = abs(uv - pt);
        vec2 wd = min(delta, 1.0 - delta);
        float dist = dot(wd, wd);
        if (dist < best_dist) {
            best_dist = dist;
            best_index = i;
        }
    }

    vec3 s = vec3(seed_f + 100.0, float(best_index) * 13.37, 5.0);
    cell_color = mix(hash33(s), color, 0.6);
    cell_dist = best_dist;
}

// Chebyshev center mask: 0 at center, 1 at edges
float centerMask(vec2 uv) {
    vec2 centered = abs(uv - 0.5);
    float dist = max(centered.x, centered.y);
    return clamp(dist * 2.0, 0.0, 1.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coords = ivec2(gl_FragCoord.xy);
    ivec2 tileDims = textureSize(inputTex, 0);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : vec2(tileDims);
    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;

    vec4 base = texelFetch(inputTex, coords, 0);
    float blend_alpha = clamp(alpha, 0.0, 1.0);
    if (blend_alpha <= 0.0) {
        fragColor = base;
        return;
    }

    float seed_f = float(seed);
    float t = time * speed;

    // Voronoi at current position (for wormhole direction)
    vec3 base_cell;
    float base_dist;
    voronoiCell(uv, seed_f, t, base_cell, base_dist);

    // Wormhole distortion
    float luma = luminance(base_cell);
    float angle = luma * TAU + t * speed * 0.5;
    vec2 warp = vec2(cos(angle), sin(angle)) * 0.25;
    vec2 warped_uv = fract(uv + warp);

    // Voronoi at warped position
    vec3 warp_cell;
    float warp_dist;
    voronoiCell(warped_uv, seed_f, t, warp_cell, warp_dist);

    // Approximate bloom using distance falloff
    float glow = exp(-warp_dist * 12.0);
    vec3 bloom_color = mix(warp_cell, warp_cell * 1.3, glow);

    // Mix wormhole result with bloom
    vec3 leak = clamp(mix(sqrt(clamp(warp_cell, vec3(0.0), vec3(1.0))), bloom_color, 0.55), vec3(0.0), vec3(1.0));

    // Screen blend: 1 - (1 - base) * (1 - leak)
    vec3 screened = vec3(1.0) - (vec3(1.0) - base.rgb) * (vec3(1.0) - leak);

    // Center mask: leak is stronger away from center
    float mask = pow(centerMask(uv), 4.0);
    vec3 masked = mix(base.rgb, screened, mask);

    // Vaseline-style soft blur via neighbor texel fetches
    vec3 soft_accum = masked * 4.0;
    float soft_w = 4.0;
    ivec2 nb0 = clamp(coords + ivec2(2, 0), ivec2(0), tileDims - 1);
    ivec2 nb1 = clamp(coords + ivec2(-2, 0), ivec2(0), tileDims - 1);
    ivec2 nb2 = clamp(coords + ivec2(0, 2), ivec2(0), tileDims - 1);
    ivec2 nb3 = clamp(coords + ivec2(0, -2), ivec2(0), tileDims - 1);
    soft_accum += texelFetch(inputTex, nb0, 0).rgb;
    soft_accum += texelFetch(inputTex, nb1, 0).rgb;
    soft_accum += texelFetch(inputTex, nb2, 0).rgb;
    soft_accum += texelFetch(inputTex, nb3, 0).rgb;
    soft_w += 4.0;
    vec3 vaseline = soft_accum / soft_w;

    // Final blend with alpha
    vec3 final_color = mix(base.rgb, mix(masked, vaseline, blend_alpha), blend_alpha);
    fragColor = vec4(clamp(final_color, vec3(0.0), vec3(1.0)), base.a);
}
`,wgsl:`/*
 * Light Leak: Voronoi-based colored light leak with wormhole distortion,
 * bloom approximation, screen blend, center mask, and vaseline blur.
 */

const TAU : f32 = 6.28318530717958647692;
const POINT_COUNT : u32 = 6u;

struct Uniforms {
    alpha: f32,
    speed: f32,
    seed: i32,
    _pad0: f32,
    color: vec3<f32>,
    _pad1: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<uniform> time: f32;

fn pcg(seed: vec3<u32>) -> vec3<u32> {
    var v = seed * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn hash31(p : vec3<f32>) -> f32 {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        u32(select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0)),
    ));
    return f32(v.x) / f32(0xffffffffu);
}

fn hash33(p : vec3<f32>) -> vec3<f32> {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        u32(select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0)),
    ));
    return vec3<f32>(
        f32(v.x) / f32(0xffffffffu),
        f32(v.y) / f32(0xffffffffu),
        f32(v.z) / f32(0xffffffffu),
    );
}

fn luminance(c : vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.299, 0.587, 0.114));
}

// Voronoi: find nearest of 6 seed-based points
// Returns cell color in rgb and squared distance in w
fn voronoiCell(uv : vec2<f32>, seed_f : f32, t : f32, user_color : vec3<f32>) -> vec4<f32> {
    var best_dist : f32 = 1e9;
    var best_index : u32 = 0u;
    let drift : f32 = 0.05;

    var i : u32 = 0u;
    loop {
        if (i >= POINT_COUNT) {
            break;
        }
        let s : vec3<f32> = vec3<f32>(seed_f, f32(i) * 7.31, 0.0);
        let base : vec2<f32> = hash33(s).xy;
        let osc : vec2<f32> = vec2<f32>(
            sin(t * 0.7 + f32(i) * 1.618),
            cos(t * 0.5 + f32(i) * 2.236),
        ) * drift;
        let pt : vec2<f32> = fract(base + osc);
        let delta : vec2<f32> = abs(uv - pt);
        let wd : vec2<f32> = min(delta, 1.0 - delta);
        let dist : f32 = dot(wd, wd);
        if (dist < best_dist) {
            best_dist = dist;
            best_index = i;
        }
        i = i + 1u;
    }

    let cs : vec3<f32> = vec3<f32>(seed_f + 100.0, f32(best_index) * 13.37, 5.0);
    let cell_color : vec3<f32> = mix(hash33(cs), user_color, 0.6);
    return vec4<f32>(cell_color, best_dist);
}

fn centerMask(uv : vec2<f32>) -> f32 {
    let centered : vec2<f32> = abs(uv - 0.5);
    let dist : f32 = max(centered.x, centered.y);
    return clamp(dist * 2.0, 0.0, 1.0);
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let texSize : vec2<f32> = vec2<f32>(textureDimensions(inputTex));
    // Global UV for the leak pattern (Voronoi / center mask) so it is
    // continuous across tiles; texel fetches below stay tile-local.
    let uv : vec2<f32> = (pos.xy + uniforms.tileOffset) / uniforms.fullResolution;
    let coords : vec2<i32> = vec2<i32>(i32(pos.x), i32(pos.y));
    let dims : vec2<i32> = vec2<i32>(textureDimensions(inputTex));

    let base : vec4<f32> = textureSample(inputTex, inputSampler, pos.xy / texSize);
    let blend_alpha : f32 = clamp(uniforms.alpha, 0.0, 1.0);
    if (blend_alpha <= 0.0) {
        return base;
    }

    let seed_f : f32 = f32(uniforms.seed);
    let t : f32 = time * uniforms.speed;
    let user_color : vec3<f32> = uniforms.color;

    // Voronoi at current position (for wormhole direction)
    let base_vor : vec4<f32> = voronoiCell(uv, seed_f, t, user_color);

    // Wormhole distortion
    let luma : f32 = luminance(base_vor.rgb);
    let angle : f32 = luma * TAU + t * uniforms.speed * 0.5;
    let warp : vec2<f32> = vec2<f32>(cos(angle), sin(angle)) * 0.25;
    let warped_uv : vec2<f32> = fract(uv + warp);

    // Voronoi at warped position
    let warp_vor : vec4<f32> = voronoiCell(warped_uv, seed_f, t, user_color);

    // Approximate bloom using distance falloff
    let glow : f32 = exp(-warp_vor.w * 12.0);
    let bloom_color : vec3<f32> = mix(warp_vor.rgb, warp_vor.rgb * 1.3, glow);

    // Mix wormhole result with bloom
    let leak : vec3<f32> = clamp(
        mix(sqrt(clamp(warp_vor.rgb, vec3<f32>(0.0), vec3<f32>(1.0))), bloom_color, 0.55),
        vec3<f32>(0.0), vec3<f32>(1.0),
    );

    // Screen blend: 1 - (1 - base) * (1 - leak)
    let screened : vec3<f32> = vec3<f32>(1.0) - (vec3<f32>(1.0) - base.rgb) * (vec3<f32>(1.0) - leak);

    // Center mask: leak is stronger away from center
    let mask : f32 = pow(centerMask(uv), 4.0);
    let masked : vec3<f32> = mix(base.rgb, screened, mask);

    // Vaseline-style soft blur via neighbor texel loads
    var soft_accum : vec3<f32> = masked * 4.0;
    var soft_w : f32 = 4.0;
    let max_coord : vec2<i32> = dims - vec2<i32>(1);
    let nb0 : vec2<i32> = clamp(coords + vec2<i32>(2, 0), vec2<i32>(0), max_coord);
    let nb1 : vec2<i32> = clamp(coords + vec2<i32>(-2, 0), vec2<i32>(0), max_coord);
    let nb2 : vec2<i32> = clamp(coords + vec2<i32>(0, 2), vec2<i32>(0), max_coord);
    let nb3 : vec2<i32> = clamp(coords + vec2<i32>(0, -2), vec2<i32>(0), max_coord);
    soft_accum = soft_accum + textureLoad(inputTex, nb0, 0).rgb;
    soft_accum = soft_accum + textureLoad(inputTex, nb1, 0).rgb;
    soft_accum = soft_accum + textureLoad(inputTex, nb2, 0).rgb;
    soft_accum = soft_accum + textureLoad(inputTex, nb3, 0).rgb;
    soft_w = soft_w + 4.0;
    let vaseline : vec3<f32> = soft_accum / soft_w;

    // Final blend with alpha
    let final_color : vec3<f32> = mix(base.rgb, mix(masked, vaseline, blend_alpha), blend_alpha);
    let clamped : vec3<f32> = clamp(final_color, vec3<f32>(0.0), vec3<f32>(1.0));
    return vec4<f32>(clamped, base.a);
}
`}},a=`# lightLeak

Film light leak overlay with colorful Voronoi regions

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 1 | 0-1 | Opacity |
| color | color | [1.0, 0.8, 0.3] | - | Leak color |
| speed | float | 0.5 | 0-5 | Animation speed |
| seed | int | 1 | 1-100 | Random seed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .lightLeak()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(s))n.shaders[o]={...e}}n&&a&&(n.help=a);var f="filter/lightLeak",u="filter",v="lightLeak",p=n;export{p as default,f as effectId,v as effectName,a as help,u as namespace};
