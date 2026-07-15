/* filter/octaveWarp */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Octave Warp",namespace:"filter",func:"octaveWarp",tags:["distort"],description:"Per-octave noise warp distortion",globals:{freq:{type:"float",default:2,uniform:"frequency",min:1,max:10,step:.1,randMax:5,ui:{label:"scale",control:"slider"}},octaves:{type:"int",default:3,uniform:"octaves",min:1,max:5,step:1,ui:{label:"octaves",control:"slider"}},displacement:{type:"float",default:.2,uniform:"displacement",min:0,max:1,step:.01,randMax:.5,ui:{label:"displacement",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},paramAliases:{frequency:"freq"},passes:[{name:"render",program:"octaveWarp",inputs:{inputTex:"inputTex"},uniforms:{frequency:"frequency",octaves:"octaves",displacement:"displacement",speed:"speed",seed:"seed",wrap:"wrap"},outputs:{fragColor:"outputTex"}}]});var i={octaveWarp:{glsl:`/*
 * Octave Warp - per-octave noise warp distortion
 * For each octave i, generates noise at frequency\xD72^i, uses it to
 * displace UV coordinates, samples input at displaced position.
 * Displacement decreases with each octave (displacement / 2^i).
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
uniform float frequency;
uniform float octaves;
uniform float displacement;
uniform float speed;
uniform float wrap;
uniform float seed;
uniform bool antialias;

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

float hash21(vec2 p) {
    uvec3 v = uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        uint(seed)
    );
    return float(pcg(v).x) / float(0xffffffffu);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

const float TAU = 6.28318530717959;

// Multi-octave noise for smoother results
// Uses circular path through noise space so t=0 and t=1 are seamless
// phase offsets the angle per octave, radius scales the circular path
float simplexNoise(vec2 p, float t, float phase, float radius) {
    float angle = t * TAU + phase;
    float cx = cos(angle) * radius;
    float cy = sin(angle) * radius;
    float n = noise(p + vec2(cx, cy));
    n += noise(p * 2.0 + vec2(-cy, cx) * 0.75) * 0.5;
    n += noise(p * 4.0 + vec2(cx, -cy) * 0.5) * 0.25;
    return n / 1.75;
}

float wrapFloat(float value, float limit, int mode) {
    if (limit <= 0.0) return 0.0;
    float norm = value / limit;
    if (mode == 0) {
        // Mirror
        norm = abs(mod(norm + 1.0, 2.0) - 1.0);
    } else if (mode == 1) {
        // Repeat
        norm = mod(norm, 1.0);
        if (norm < 0.0) norm += 1.0;
    } else {
        // Clamp
        norm = clamp(norm, 0.0, 1.0);
    }
    return norm * limit;
}

void main() {
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 dims = fullRes;
    float width = dims.x;
    float height = dims.y;

    // Adjust frequency for aspect ratio
    float baseFreq = 11.0 - frequency;
    float aspect = width / height;
    vec2 freq = vec2(baseFreq);
    if (aspect > 1.0) {
        freq.y *= aspect;
    } else {
        freq.x /= aspect;
    }

    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec2 sampleCoord = uv * dims;

    int numOctaves = max(int(octaves), 1);
    float displaceBase = displacement;

    // Per-octave warping
    for (int octave = 1; octave <= 10; octave++) {
        if (octave > numOctaves) break;

        float multiplier = pow(2.0, float(octave));
        vec2 freqScaled = freq * 0.5 * multiplier;

        if (freqScaled.x >= width || freqScaled.y >= height) break;

        // Per-octave phase and radius break up uniform circular motion
        float phase = float(octave) * 2.399;  // golden angle
        float radius = 0.5 / sqrt(multiplier);

        // Compute reference angles from noise
        vec2 noiseCoord = (sampleCoord / dims) * freqScaled;
        float refX = simplexNoise(noiseCoord + vec2(17.0, 29.0), time * speed, phase, radius);
        float refY = simplexNoise(noiseCoord + vec2(23.0, 31.0), time * speed, phase, radius);

        // Convert to signed range
        refX = refX * 2.0 - 1.0;
        refY = refY * 2.0 - 1.0;

        // Calculate displacement (decreases with each octave)
        float displaceScale = displaceBase / multiplier;
        vec2 offset = vec2(refX * displaceScale * width, refY * displaceScale * height);

        sampleCoord += offset;
        sampleCoord = vec2(
            wrapFloat(sampleCoord.x, width, int(wrap)),
            wrapFloat(sampleCoord.y, height, int(wrap))
        );
    }

    vec2 finalUV = vec2(
        wrapFloat(sampleCoord.x, width, int(wrap)),
        wrapFloat(sampleCoord.y, height, int(wrap))
    ) / dims;
    if (antialias) {
        vec2 dx = dFdx(finalUV);
        vec2 dy = dFdy(finalUV);
        vec4 col = vec4(0.0);
        col += texture(inputTex, finalUV + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, finalUV + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, finalUV + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, finalUV + dx * -0.125 + dy *  0.375);
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, finalUV);
    }
}
`,wgsl:`/*
 * Octave Warp - per-octave noise warp distortion
 * For each octave i, generates noise at frequency\xD72^i, uses it to
 * displace UV coordinates, samples input at displaced position.
 * Displacement decreases with each octave (displacement / 2^i).
 */

struct Uniforms {
    frequency: f32,
    octaves: f32,
    displacement: f32,
    speed: f32,
    wrap: f32,
    seed: f32,
    antialias: i32,
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

fn hash21(p: vec2<f32>) -> f32 {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        u32(uniforms.seed),
    ));
    return f32(v.x) / f32(0xffffffffu);
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let ff = f * f * (3.0 - 2.0 * f);

    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));

    return mix(mix(a, b, ff.x), mix(c, d, ff.x), ff.y);
}

const TAU: f32 = 6.28318530717959;

// Multi-octave noise - circular path through noise space so t=0 and t=1 are seamless
// phase offsets the angle per octave, radius scales the circular path
fn simplexNoise(p: vec2<f32>, t: f32, phase: f32, radius: f32) -> f32 {
    let angle = t * TAU + phase;
    let cx = cos(angle) * radius;
    let cy = sin(angle) * radius;
    var n = noise(p + vec2<f32>(cx, cy));
    n = n + noise(p * 2.0 + vec2<f32>(-cy, cx) * 0.75) * 0.5;
    n = n + noise(p * 4.0 + vec2<f32>(cx, -cy) * 0.5) * 0.25;
    return n / 1.75;
}

fn wrapFloat(value: f32, limit: f32, mode: i32) -> f32 {
    if (limit <= 0.0) {
        return 0.0;
    }
    let norm = value / limit;
    if (mode == 0) {
        // Mirror: abs(mod(norm + 1, 2) - 1)
        let m = (norm + 1.0) - floor((norm + 1.0) * 0.5) * 2.0;
        return abs(m - 1.0) * limit;
    } else if (mode == 1) {
        // Repeat
        return (norm - floor(norm)) * limit;
    }
    // Clamp
    return clamp(value, 0.0, limit);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let width = texSize.x;
    let height = texSize.y;

    // Adjust frequency for aspect ratio
    let baseFreq = 11.0 - uniforms.frequency;
    let aspect = width / height;
    var freq = vec2<f32>(baseFreq);
    if (aspect > 1.0) {
        freq.y = freq.y * aspect;
    } else {
        freq.x = freq.x / aspect;
    }

    let uv = pos.xy / texSize;
    var sampleCoord = uv * texSize;

    let numOctaves = max(i32(uniforms.octaves), 1);
    let displaceBase = uniforms.displacement;

    // Per-octave warping
    for (var octave: i32 = 1; octave <= 10; octave = octave + 1) {
        if (octave > numOctaves) {
            break;
        }

        let multiplier = pow(2.0, f32(octave));
        let freqScaled = freq * 0.5 * multiplier;

        if (freqScaled.x >= width || freqScaled.y >= height) {
            break;
        }

        // Per-octave phase and radius break up uniform circular motion
        let phase = f32(octave) * 2.399;  // golden angle
        let radius = 0.5 / sqrt(multiplier);

        // Compute reference angles from noise
        let noiseCoord = (sampleCoord / texSize) * freqScaled;
        let refX = simplexNoise(noiseCoord + vec2<f32>(17.0, 29.0), time * uniforms.speed, phase, radius) * 2.0 - 1.0;
        let refY = simplexNoise(noiseCoord + vec2<f32>(23.0, 31.0), time * uniforms.speed, phase, radius) * 2.0 - 1.0;

        // Calculate displacement (decreases with each octave)
        let displaceScale = displaceBase / multiplier;
        let offset = vec2<f32>(refX * displaceScale * width, refY * displaceScale * height);

        sampleCoord = sampleCoord + offset;
        sampleCoord = vec2<f32>(
            wrapFloat(sampleCoord.x, width, i32(uniforms.wrap)),
            wrapFloat(sampleCoord.y, height, i32(uniforms.wrap)),
        );
    }

    let finalUV = vec2<f32>(
        wrapFloat(sampleCoord.x, width, i32(uniforms.wrap)),
        wrapFloat(sampleCoord.y, height, i32(uniforms.wrap)),
    ) / texSize;
    if (uniforms.antialias != 0) {
        let dx = dpdx(finalUV);
        let dy = dpdy(finalUV);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, finalUV + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, finalUV + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, finalUV + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, finalUV + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return textureSample(inputTex, inputSampler, finalUV);
    }
}
`}},r=`# octaveWarp

Per-octave noise warp distortion

## Description

For each octave, generates noise at increasing frequencies and uses it to displace UV coordinates. Displacement decreases with each octave, building up layered organic warping. Each octave animates with a unique phase and radius to avoid uniform circular motion.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| freq | float | 2 | 1-10 | Noise frequency |
| octaves | int | 3 | 1-5 | Number of octaves |
| displacement | float | 0.2 | 0-1 | Displacement amount |
| speed | int | 1 | 0-5 | Animation speed |
| seed | int | 1 | 1-100 | Random seed for noise pattern |
| wrap | int | mirror | mirror/repeat/clamp | Edge wrapping |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .octaveWarp()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(i))n.shaders[a]={...e}}n&&r&&(n.help=r);var p="filter/octaveWarp",c="filter",u="octaveWarp",d=n;export{d as default,p as effectId,u as effectName,r as help,c as namespace};
