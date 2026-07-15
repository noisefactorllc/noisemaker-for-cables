/* filter/warp */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Warp",namespace:"filter",func:"warp",tags:["distort"],description:"Perlin noise-based warp distortion",globals:{strength:{type:"float",default:75,uniform:"strength",min:0,max:100,zero:0,ui:{label:"strength",control:"slider"}},scale:{type:"float",default:1,uniform:"scale",min:0,max:5,ui:{label:"scale",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:0,max:5,ui:{label:"speed",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"warp",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={warp:{glsl:`/*
 * Perlin noise-based warp distortion
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float strength;
uniform float scale;
uniform int seed;
uniform int speed;
uniform int wrap;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// PCG PRNG
uvec3 pcg(uvec3 v) {
    v = v * uint(1664525) + uint(1013904223);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> uint(16);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec3 prng(vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}

float smootherstep(float x) {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float smoothlerp(float x, float a, float b) {
    return a + smootherstep(x) * (b - a);
}

float grid(vec2 st, vec2 cell) {
    float angle = prng(vec3(cell, 1.0)).r * TAU;
    angle += time * TAU * float(speed);
    vec2 gradient = vec2(cos(angle), sin(angle));
    vec2 dist = st - cell;
    return dot(gradient, dist);
}

float perlinNoise(vec2 st, vec2 noiseScale) {
    st *= noiseScale;
    vec2 cell = floor(st);
    float tl = grid(st, cell);
    float tr = grid(st, vec2(cell.x + 1.0, cell.y));
    float bl = grid(st, vec2(cell.x, cell.y + 1.0));
    float br = grid(st, cell + 1.0);
    float upper = smoothlerp(st.x - cell.x, tl, tr);
    float lower = smoothlerp(st.x - cell.x, bl, br);
    float val = smoothlerp(st.y - cell.y, upper, lower);
    return val * 0.5 + 0.5;
}

void main() {
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float aspectRatio = fullRes.x / fullRes.y;
    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;

    // Perlin warp \u2014 sample both axes before applying either
    vec2 noiseCoord = uv * vec2(aspectRatio, 1.0);
    vec2 noiseScale = vec2(abs(scale * 3.0));
    float dx = (perlinNoise(noiseCoord + float(seed), noiseScale) - 0.5) * strength * 0.01;
    float dy = (perlinNoise(noiseCoord + float(seed) + 10.0, noiseScale) - 0.5) * strength * 0.01;
    uv.x += dx;
    uv.y += dy;

    // Apply wrap mode
    if (wrap == 0) {
        // mirror
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = mod(uv, 1.0);
    } else {
        // clamp
        uv = clamp(uv, 0.0, 1.0);
    }

    if (antialias) {
        vec2 dx = dFdx(uv);
        vec2 dy = dFdy(uv);
        vec4 col = vec4(0.0);
        col += texture(inputTex, uv + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, uv + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, uv + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, uv + dx * -0.125 + dy *  0.375);
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, uv);
    }
}
`,wgsl:`/*
 * Perlin noise-based warp distortion
 */

struct Uniforms {
    strength: f32,
    scale: f32,
    seed: i32,
    speed: i32,
    wrap: i32,
    antialias: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<uniform> time: f32;

const TAU: f32 = 6.28318530718;

fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn prng(p_in: vec3<f32>) -> vec3<f32> {
    var p = p_in;
    p.x = select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0);
    p.y = select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0);
    p.z = select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0);
    return vec3<f32>(pcg(vec3<u32>(p))) / f32(0xffffffff);
}

fn smootherstep(x: f32) -> f32 {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

fn smoothlerp(x: f32, a: f32, b: f32) -> f32 {
    return a + smootherstep(x) * (b - a);
}

fn grid(st: vec2<f32>, cell: vec2<f32>, t: f32) -> f32 {
    var angle = prng(vec3<f32>(cell, 1.0)).r * TAU;
    angle = angle + t * TAU * f32(uniforms.speed);
    let gradient = vec2<f32>(cos(angle), sin(angle));
    let dist = st - cell;
    return dot(gradient, dist);
}

fn perlinNoise(st_in: vec2<f32>, noiseScale: vec2<f32>, t: f32) -> f32 {
    let st = st_in * noiseScale;
    let cell = floor(st);
    let tl = grid(st, cell, t);
    let tr = grid(st, vec2<f32>(cell.x + 1.0, cell.y), t);
    let bl = grid(st, vec2<f32>(cell.x, cell.y + 1.0), t);
    let br = grid(st, cell + 1.0, t);
    let upper = smoothlerp(st.x - cell.x, tl, tr);
    let lower = smoothlerp(st.x - cell.x, bl, br);
    let val = smoothlerp(st.y - cell.y, upper, lower);
    return val * 0.5 + 0.5;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let aspectRatio = texSize.x / texSize.y;
    var uv = pos.xy / texSize;

    let strength = uniforms.strength;
    let scale = uniforms.scale;
    let seed = uniforms.seed;
    let t = time;

    // Perlin warp \u2014 sample both axes before applying either
    let noiseCoord = uv * vec2<f32>(aspectRatio, 1.0);
    let noiseScale = vec2<f32>(abs(scale * 3.0));
    let dx = (perlinNoise(noiseCoord + f32(seed), noiseScale, t) - 0.5) * strength * 0.01;
    let dy = (perlinNoise(noiseCoord + f32(seed) + 10.0, noiseScale, t) - 0.5) * strength * 0.01;
    uv.x = uv.x + dx;
    uv.y = uv.y + dy;

    // Apply wrap mode
    if (uniforms.wrap == 0) {
        // mirror
        uv = abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (uniforms.wrap == 1) {
        // repeat
        uv = (uv % 1.0 + 1.0) % 1.0;
    } else {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    if (uniforms.antialias != 0) {
        let dx = dpdx(uv);
        let dy = dpdy(uv);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return textureSample(inputTex, inputSampler, uv);
    }
}
`}},s=`# warp

Perlin noise-based warp distortion

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | 75 | 0-100 | Strength |
| scale | float | 1 | 0-5 | Scale |
| seed | int | 1 | 1-100 | Seed |
| speed | int | 0 | 0-5 | Speed |
| wrap | int | mirror | mirror/repeat/clamp | Wrap |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .warp()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&s&&(n.help=s);var u="filter/warp",f="filter",c="warp",d=n;export{d as default,u as effectId,c as effectName,s as help,f as namespace};
