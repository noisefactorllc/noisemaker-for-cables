/* filter/wobble */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Wobble",namespace:"filter",func:"wobble",tags:["transform"],description:"Wobble animation effect",globals:{speed:{type:"float",default:5,uniform:"speed",min:0,max:5,step:.1,zero:0,ui:{label:"speed",control:"slider"}},range:{type:"float",default:.5,uniform:"range",min:0,max:5,step:.05,ui:{label:"range",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},passes:[{name:"main",program:"wobble",inputs:{inputTex:"inputTex"},uniforms:{speed:"speed",range:"range",time:"time",wrap:"wrap"},outputs:{fragColor:"outputTex"}}]});var o={wobble:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Wobble effect - offsets the entire frame using noise-driven jitter

uniform sampler2D inputTex;
uniform float time;
uniform float speed;
uniform float range;
uniform float wrap;

in vec2 v_texCoord;
out vec4 fragColor;

const float TAU = 6.28318530717959;
const vec3 X_NOISE_SEED = vec3(17.0, 29.0, 11.0);
const vec3 Y_NOISE_SEED = vec3(41.0, 23.0, 7.0);

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
    uvec3 seed = uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        uint(p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0)
    );
    return float(pcg(seed).x) / float(0xffffffffu);
}

float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

    float x0 = mix(n000, n100, f.x);
    float x1 = mix(n010, n110, f.x);
    float x2 = mix(n001, n101, f.x);
    float x3 = mix(n011, n111, f.x);

    float y0 = mix(x0, x1, f.y);
    float y1 = mix(x2, x3, f.y);

    return mix(y0, y1, f.z);
}

float simplexRandom(float t, float spd, vec3 seed) {
    float angle = t * TAU;
    // Include speed in the noise coordinates so output varies with speed even at time=0
    float z = cos(angle) * spd + seed.x + spd * 0.317;
    float w = sin(angle) * spd + seed.y + spd * 0.519;
    float n = noise3d(vec3(z, w, seed.z + spd * 0.1));
    return clamp(n, 0.0, 1.0);
}

vec2 applyWrap(vec2 uv) {
    int mode = int(wrap);
    if (mode == 0) {
        return abs(mod(uv + 1.0, 2.0) - 1.0);  // mirror
    } else if (mode == 1) {
        return fract(uv);  // repeat
    }
    return clamp(uv, 0.0, 1.0);  // clamp
}

void main() {
    // Speed directly affects the noise sampling position
    // This ensures changing speed produces different noise values
    float spd = max(speed, 0.001);
    float r = max(range, 0.0);

    // Compute jitter offsets - speed affects both the noise input and output scale
    float xRandom = simplexRandom(time + speed * 0.1, spd, X_NOISE_SEED);
    float yRandom = simplexRandom(time + speed * 0.1, spd, Y_NOISE_SEED);

    // Scale offset by range - controls displacement amount
    float offsetScale = r * (0.01 + speed * 0.02);
    vec2 offset = (vec2(xRandom, yRandom) - 0.5) * offsetScale;

    // Apply offset to texture coordinate
    vec2 sampleCoord = v_texCoord + offset;
    sampleCoord = applyWrap(sampleCoord);

    vec4 sampled = texture(inputTex, sampleCoord);

    fragColor = sampled;
}
`,wgsl:`// Wobble effect - offsets the entire frame using noise-driven jitter

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var u_sampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> speed: f32;
@group(0) @binding(3) var<uniform> range: f32;
@group(0) @binding(4) var<uniform> time: f32;
@group(0) @binding(5) var<uniform> wrap: i32;

const TAU: f32 = 6.28318530717959;
const X_NOISE_SEED: vec3<f32> = vec3<f32>(17.0, 29.0, 11.0);
const Y_NOISE_SEED: vec3<f32> = vec3<f32>(41.0, 23.0, 7.0);

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

fn hash31(p: vec3<f32>) -> f32 {
    let seed = vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        u32(select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0))
    );
    return f32(pcg(seed).x) / f32(0xffffffffu);
}

fn noise3d(p: vec3<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let n000 = hash31(i);
    let n100 = hash31(i + vec3<f32>(1.0, 0.0, 0.0));
    let n010 = hash31(i + vec3<f32>(0.0, 1.0, 0.0));
    let n110 = hash31(i + vec3<f32>(1.0, 1.0, 0.0));
    let n001 = hash31(i + vec3<f32>(0.0, 0.0, 1.0));
    let n101 = hash31(i + vec3<f32>(1.0, 0.0, 1.0));
    let n011 = hash31(i + vec3<f32>(0.0, 1.0, 1.0));
    let n111 = hash31(i + vec3<f32>(1.0, 1.0, 1.0));

    let x0 = mix(n000, n100, f.x);
    let x1 = mix(n010, n110, f.x);
    let x2 = mix(n001, n101, f.x);
    let x3 = mix(n011, n111, f.x);

    let y0 = mix(x0, x1, f.y);
    let y1 = mix(x2, x3, f.y);

    return mix(y0, y1, f.z);
}

fn simplexRandom(t: f32, spd: f32, seed: vec3<f32>) -> f32 {
    let angle = t * TAU;
    // Include speed in the noise coordinates so output varies with speed even at time=0
    let z = cos(angle) * spd + seed.x + spd * 0.317;
    let w = sin(angle) * spd + seed.y + spd * 0.519;
    let n = noise3d(vec3<f32>(z, w, seed.z + spd * 0.1));
    return clamp(n, 0.0, 1.0);
}

fn applyWrap(uv: vec2<f32>) -> vec2<f32> {
    if (wrap == 0) {
        // Mirror: abs(mod(uv + 1, 2) - 1)
        let mx = abs((uv.x + 1.0) - floor((uv.x + 1.0) * 0.5) * 2.0 - 1.0);
        let my = abs((uv.y + 1.0) - floor((uv.y + 1.0) * 0.5) * 2.0 - 1.0);
        return vec2<f32>(mx, my);
    } else if (wrap == 1) {
        return fract(uv);  // repeat
    }
    return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));  // clamp
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Speed directly affects the noise sampling position
    // This ensures changing speed produces different noise values
    let spd = max(speed, 0.001);
    let r = max(range, 0.0);

    // Compute jitter offsets - speed affects both the noise input and output scale
    let xRandom = simplexRandom(time + speed * 0.1, spd, X_NOISE_SEED);
    let yRandom = simplexRandom(time + speed * 0.1, spd, Y_NOISE_SEED);

    // Scale offset by range - controls displacement amount
    let offsetScale = r * (0.01 + speed * 0.02);
    let offset = (vec2<f32>(xRandom, yRandom) - 0.5) * offsetScale;

    // Apply offset to texture coordinate
    var sampleCoord = in.uv + offset;
    sampleCoord = applyWrap(sampleCoord);

    let sampled = textureSample(inputTex, u_sampler, sampleCoord);

    return sampled;
}
`}},a=`# wobble

Wobble animation effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| speed | float | 5.0 | 0-5 | Animation speed |
| range | float | 0.5 | 0-5 | Wobble amplitude |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .wobble()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(o))n.shaders[s]={...e}}n&&a&&(n.help=a);var l="filter/wobble",u="filter",d="wobble",c=n;export{c as default,l as effectId,d as effectName,a as help,u as namespace};
