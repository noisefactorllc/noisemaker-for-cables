/* synth/gabor */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Gabor",namespace:"synth",func:"gabor",tags:["noise"],description:"Anisotropic bandlimited noise via sparse Gabor convolution",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},scale:{slot:1,components:"x"},orientation:{slot:1,components:"y"},bandwidth:{slot:1,components:"z"},isotropy:{slot:1,components:"w"},density:{slot:2,components:"x"},octaves:{slot:2,components:"y"},speed:{slot:2,components:"z"},tileOffset:{slot:3,components:"xy"},fullResolution:{slot:3,components:"zw"}},globals:{scale:{type:"float",default:75,uniform:"scale",min:1,max:100,ui:{label:"scale",control:"slider"}},orientation:{type:"float",default:0,uniform:"orientation",min:-180,max:180,ui:{label:"orientation",control:"slider"}},bandwidth:{type:"float",default:75,uniform:"bandwidth",min:1,max:100,ui:{label:"bandwidth",control:"slider"}},isotropy:{type:"float",default:0,uniform:"isotropy",min:0,max:100,ui:{label:"isotropy",control:"slider"}},density:{type:"int",default:3,uniform:"density",min:1,max:8,randMax:5,ui:{label:"density",control:"slider"}},octaves:{type:"int",default:1,uniform:"octaves",min:1,max:5,ui:{label:"octaves",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},passes:[{name:"render",program:"gabor",outputs:{fragColor:"outputTex"}}]});var i={gabor:{glsl:`/*
 * Gabor noise \u2014 sparse convolution of anisotropic Gabor kernels.
 * Each grid cell scatters random impulse points; the final value is the sum
 * of Gabor kernel contributions from the 3\xD73 cell neighborhood.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float seed;
uniform float scale;
uniform float orientation;
uniform float bandwidth;
uniform float isotropy;
uniform float density;
uniform float octaves;
uniform float speed;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// PCG PRNG - MIT License
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

vec3 prng(vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(0xffffffffu);
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Sum Gabor kernels from 3\xD73 cell neighborhood
float gaborNoise(vec2 st, float freq, float sigma, float baseAngle, float iso, int impulses, float t, float sd) {
    vec2 cell = floor(st);
    vec2 frac = fract(st);
    float sum = 0.0;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 neighbor = vec2(float(dx), float(dy));
            vec2 cellId = cell + neighbor;

            for (int k = 0; k < 8; k++) {
                if (k >= impulses) break;

                // Random impulse position and properties
                vec3 r1 = prng(vec3(cellId, sd + float(k) * 7.0));
                vec3 r2 = prng(vec3(sd + float(k) * 13.0, cellId));

                vec2 impulsePos = r1.xy;
                // Animate with time*TAU for clean 0-1 looping
                impulsePos += vec2(sin(t + r2.x * TAU), cos(t + r2.y * TAU)) * 0.15;

                vec2 delta = neighbor + impulsePos - frac;

                // Per-impulse orientation: blend between fixed angle and random
                float angle = mix(baseAngle, r2.z * TAU, iso);
                vec2 dir = vec2(cos(angle), sin(angle));

                // Random weight \xB11
                float weight = r1.z < 0.5 ? -1.0 : 1.0;

                float envelope = exp(-dot(delta, delta) / (2.0 * sigma * sigma));
                float phase = TAU * freq * dot(dir, delta);
                sum += weight * envelope * cos(phase);
            }
        }
    }
    return sum;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution.y;

    float freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    float sigma = map(bandwidth, 1.0, 100.0, 0.05, 0.35);
    float baseAngle = orientation * PI / 180.0;
    float iso = isotropy / 100.0;
    int impulses = int(density);
    int oct = int(octaves);
    float spd = floor(speed);
    float t = time * TAU * spd;

    vec2 p = st * freq;

    // Fractal octave summation
    float value = 0.0;
    float amplitude = 1.0;
    float totalAmp = 0.0;
    vec2 pOct = p;

    for (int i = 0; i < 5; i++) {
        if (i >= oct) break;
        float octFreq = 1.0 + float(i) * 0.5;
        float octSigma = sigma / (1.0 + float(i) * 0.5);
        float fi = float(i);
        value += amplitude * gaborNoise(pOct, octFreq, octSigma, baseAngle, iso, impulses, t + fi * 3.7, seed + fi * 17.0);
        totalAmp += amplitude;
        amplitude *= 0.5;
        pOct *= 2.0;
    }
    value /= totalAmp;

    float n = 1.0 / (1.0 + exp(-value * 3.0));
    fragColor = vec4(vec3(n), 1.0);
}
`,wgsl:`/*
 * Gabor noise \u2014 sparse convolution of anisotropic Gabor kernels.
 * Each grid cell scatters random impulse points; the final value is the sum
 * of Gabor kernel contributions from the 3\xD73 cell neighborhood.
 */

struct Uniforms {
    data: array<vec4<f32>, 4>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

// PCG PRNG - MIT License
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

fn prng(p0: vec3<f32>) -> vec3<f32> {
    var p = p0;
    if (p.x >= 0.0) { p.x = p.x * 2.0; } else { p.x = -p.x * 2.0 + 1.0; }
    if (p.y >= 0.0) { p.y = p.y * 2.0; } else { p.y = -p.y * 2.0 + 1.0; }
    if (p.z >= 0.0) { p.z = p.z * 2.0; } else { p.z = -p.z * 2.0 + 1.0; }
    let u = pcg(vec3<u32>(p));
    return vec3<f32>(u) / f32(0xffffffffu);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn gaborNoise(st: vec2<f32>, freq: f32, sigma: f32, baseAngle: f32, iso: f32, impulses: i32, t: f32, sd: f32) -> f32 {
    let cell = floor(st);
    let fr = fract(st);
    var sum = 0.0;

    for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
            let neighbor = vec2<f32>(f32(dx), f32(dy));
            let cellId = cell + neighbor;

            for (var k: i32 = 0; k < 8; k = k + 1) {
                if (k >= impulses) { break; }

                let r1 = prng(vec3<f32>(cellId, sd + f32(k) * 7.0));
                let r2 = prng(vec3<f32>(sd + f32(k) * 13.0, cellId));

                var impulsePos = r1.xy;
                impulsePos = impulsePos + vec2<f32>(sin(t + r2.x * TAU), cos(t + r2.y * TAU)) * 0.15;

                let delta = neighbor + impulsePos - fr;

                let angle = mix(baseAngle, r2.z * TAU, iso);
                let dir = vec2<f32>(cos(angle), sin(angle));

                var weight = 1.0;
                if (r1.z < 0.5) { weight = -1.0; }

                let envelope = exp(-dot(delta, delta) / (2.0 * sigma * sigma));
                let phase = TAU * freq * dot(dir, delta);
                sum = sum + weight * envelope * cos(phase);
            }
        }
    }
    return sum;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let seed = uniforms.data[0].w;

    let scale = uniforms.data[1].x;
    let orientation = uniforms.data[1].y;
    let bandwidth = uniforms.data[1].z;
    let isotropy = uniforms.data[1].w;

    let density = uniforms.data[2].x;
    let octaves = uniforms.data[2].y;
    let speed = uniforms.data[2].z;
    let tileOffset = uniforms.data[3].xy;
    let fullResolution = uniforms.data[3].zw;
    var st = (pos.xy + tileOffset) / fullResolution.y;

    let freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    let sigma = map(bandwidth, 1.0, 100.0, 0.05, 0.35);
    let baseAngle = orientation * PI / 180.0;
    let iso = isotropy / 100.0;
    let impulses = i32(density);
    let oct = i32(octaves);
    let spd = floor(speed);
    let t = time * TAU * spd;

    var p = st * freq;

    // Fractal octave summation
    var value = 0.0;
    var amplitude = 1.0;
    var totalAmp = 0.0;
    var pOct = p;

    for (var i: i32 = 0; i < 5; i = i + 1) {
        if (i >= oct) { break; }
        let octFreq = 1.0 + f32(i) * 0.5;
        let octSigma = sigma / (1.0 + f32(i) * 0.5);
        let fi = f32(i);
        value = value + amplitude * gaborNoise(pOct, octFreq, octSigma, baseAngle, iso, impulses, t + fi * 3.7, seed + fi * 17.0);
        totalAmp = totalAmp + amplitude;
        amplitude = amplitude * 0.5;
        pOct = pOct * 2.0;
    }
    value = value / totalAmp;

    let n = 1.0 / (1.0 + exp(-value * 3.0));
    return vec4<f32>(vec3<f32>(n), 1.0);
}
`}},a=`# gabor

Anisotropic bandlimited noise via sparse Gabor convolution

## Description

Generates procedural noise by scattering Gabor kernels (windowed cosines) across a grid. Unlike isotropic noise generators, Gabor noise supports directional control, making it suitable for wood grain, fabric, flowing water, brushed metal, and other oriented textures.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | float | 75 | 1-100 | Spatial frequency of the noise |
| orientation | float | 0 | -180-180 | Dominant grain direction in degrees |
| bandwidth | float | 75 | 1-100 | Kernel width \u2014 lower values give sharper, more defined patterns |
| isotropy | float | 0 | 0-100 | 0 = fully directional, 100 = random orientations per kernel |
| density | int | 3 | 1-8 | Number of impulse points per grid cell |
| octaves | int | 1 | 1-5 | Fractal layering \u2014 each octave adds finer detail |
| speed | int | 1 | 0-5 | Animation rate (0 = frozen) |
| seed | int | 1 | 1-100 | Randomization seed |

## Notes

- **Orientation** is the key differentiator from other noise types \u2014 it controls the dominant direction of the pattern
- **Isotropy** at 0 gives strongly directional patterns; at 100 each kernel picks a random angle, producing noise closer to standard isotropic noise
- **Density** increases the number of kernels per cell \u2014 higher values give smoother, more filled results but cost more to compute
- **Octaves** layer noise at increasing frequencies, adding fine detail on top of coarser structure

## Usage

\`\`\`
search synth

gabor()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(i))e.shaders[o]={...n}}e&&a&&(e.help=a);var p="synth/gabor",u="synth",d="gabor",c=e;export{c as default,p as effectId,d as effectName,a as help,u as namespace};
