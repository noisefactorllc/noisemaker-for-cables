/* classicNoisedeck/splat */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Splat",namespace:"classicNoisedeck",func:"splat",tags:["noise"],description:"Splatter paint effect",globals:{enabled:{type:"boolean",default:!0,uniform:"enabled",ui:{label:"splats",control:"checkbox"}},mode:{type:"int",default:2,uniform:"mode",choices:{color:0,displace:1,invert:2,negative:3},ui:{label:"splat mode",control:"dropdown",enabledBy:{param:"enabled",eq:!0}}},scale:{type:"float",default:3,uniform:"scale",min:1,max:5,ui:{label:"splat scale",control:"slider",enabledBy:{param:"enabled",eq:!0}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"splat seed",control:"slider",enabledBy:{param:"enabled",eq:!0}}},color:{type:"color",default:[1,1,1],uniform:"color",ui:{label:"splat color",control:"color",enabledBy:{and:[{param:"enabled",eq:!0},{param:"mode",eq:0}]}}},cutoff:{type:"float",default:25,uniform:"cutoff",min:0,max:100,ui:{label:"splat cutoff",control:"slider",enabledBy:{param:"enabled",eq:!0}}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,ui:{label:"splat speed",control:"slider",enabledBy:{param:"enabled",eq:!0}}},useSpecks:{type:"boolean",default:!0,uniform:"useSpecks",ui:{label:"specks",control:"checkbox",category:"specks"}},speckMode:{type:"int",default:0,uniform:"speckMode",choices:{color:0,displace:1,invert:2,negative:3},ui:{label:"speck mode",control:"dropdown",category:"specks",enabledBy:{param:"useSpecks",eq:!0}}},speckScale:{type:"float",default:5,uniform:"speckScale",min:1,max:5,ui:{label:"speck scale",control:"slider",category:"specks",enabledBy:{param:"useSpecks",eq:!0}}},speckSeed:{type:"int",default:1,uniform:"speckSeed",min:1,max:100,ui:{label:"speck seed",control:"slider",category:"specks",enabledBy:{param:"useSpecks",eq:!0}}},speckColor:{type:"color",default:[.8,.8,.8],uniform:"speckColor",ui:{label:"speck color",control:"color",category:"specks",enabledBy:{and:[{param:"useSpecks",eq:!0},{param:"speckMode",eq:0}]}}},speckCutoff:{type:"float",default:70,uniform:"speckCutoff",min:0,max:100,ui:{label:"speck cutoff",control:"slider",category:"specks",enabledBy:{param:"useSpecks",eq:!0}}},speckSpeed:{type:"int",default:1,uniform:"speckSpeed",min:0,max:5,ui:{label:"speck speed",control:"slider",category:"specks",enabledBy:{param:"useSpecks",eq:!0}}}},paramAliases:{splatColor:"color",splatCutoff:"cutoff",splatMode:"mode",splatScale:"scale",splatSeed:"seed",splatSpeed:"speed",useSplats:"enabled"},passes:[{name:"render",program:"splat",inputs:{inputTex:"inputTex"},uniforms:{splatColor:"color"},outputs:{fragColor:"outputTex"}}]});var o={splat:{glsl:`#version 300 es

/*
 * Splat compositor overlay shader.
 * Builds deterministic multi-octave splat and speck masks from PCG-backed Perlin noise so live tweaking remains reproducible.
 * Cutoff controls are remapped from UI ranges into thresholds to avoid abrupt transitions when layering over the input feed.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform bool enabled;
uniform bool useSpecks;
uniform int splatSource;
uniform float scale;
uniform float cutoff;
uniform float speed;
uniform float seed;
uniform vec3 splatColor;
uniform int mode;
uniform float speckScale;
uniform float speckCutoff;
uniform float speckSpeed;
uniform float speckSeed;
uniform vec3 speckColor;
uniform int speckMode;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// PCG PRNG - MIT License
// https://github.com/riccardoscalco/glsl-pcg-prng
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

vec3 prng (vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}
// end PCG PRNG

float smootherstep(float x) {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float smoothlerp(float x, float a, float b) {
    return a + smootherstep(x) * (b - a);
}

float grid(vec2 st, vec2 cell, float speed) {
    float angle = prng(vec3(cell, 1.0)).r * TAU;
    angle += time * TAU * speed;
    vec2 gradient = vec2(cos(angle), sin(angle));
    vec2 dist = st - cell;
    return dot(gradient, dist);
}

float perlin(vec2 st, vec2 scale, float speed) {
    st -= 0.5;
    st *= scale;
    st += 0.5;
    vec2 cell = floor(st);    
    float tl = grid(st, cell, speed);
    float tr = grid(st, vec2(cell.x + 1.0, cell.y), speed);
    float bl = grid(st, vec2(cell.x, cell.y + 1.0), speed);
    float br = grid(st, cell + 1.0, speed);    
    float upper = smoothlerp(st.x - cell.x, tl, tr);
    float lower = smoothlerp(st.x - cell.x, bl, br);
    float val = smoothlerp(st.y - cell.y, upper, lower);    
    return val * 0.5 + 0.5;
}

float splat(vec2 st, vec2 scale) {
    st.x += perlin(st + seed + 50.0, vec2(2.0, 3.0), 0.0) * 0.5 - 0.5;
    st.y += perlin(st + seed + 60.0, vec2(2.0, 3.0), 0.0) * 0.5 - 0.5;
    float d = perlin(st, vec2(4.0) * scale, speed) + (perlin(st + 10.0, vec2(8.0) * scale, speed) * 0.5) + (perlin(st + 20.0, vec2(16.0) * scale, speed) * 0.25);
    return step(map(cutoff, 0.0, 100.0, 0.85, 0.99), d);
}

float speckle(vec2 st, vec2 scale) {
    float d = perlin(st, scale, speckSpeed) + (perlin(st + 10.0, scale * 2.0, speckSpeed) * 0.5);
    d /= 1.5;
    return step(map(speckCutoff, 0.0, 100.0, 0.6, 0.7), d);
}

float shape(vec2 st, int sides, float blend) {
    st = st * 2.0 - vec2(aspectRatio, 1.0);
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st) * blend;
}


void main() {
	vec2 globalCoord = gl_FragCoord.xy + tileOffset;
	vec2 uv = globalCoord / fullResolution;

	vec4 color = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    vec2 noiseCoord = uv * vec2(aspectRatio, 1.0);

    if (useSpecks) {
        float speckMask = speckle(noiseCoord + speckSeed, vec2(32.0) * map(speckScale, 1.0, 5.0, 2.0, 0.5));

        if (speckMode == 0) {
            color.rgb = mix(color.rgb, speckColor, speckMask); // color
        } else if (speckMode == 1) {
            color = texture(inputTex, ((uv + speckMask * 0.1) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))); // displace
        } else if (speckMode == 2) {
            color.rgb = mix(color.rgb, 1.0 - color.rgb, speckMask); // invert
        } else if (speckMode == 3) {
            color.rgb *= speckMask; // negative
        }
    }

    if (enabled) {
        float splatMask = splat(noiseCoord + seed, vec2(map(scale, 1.0, 5.0, 2.0, 0.5)));

        if (mode == 0) {
            color.rgb = mix(color.rgb, splatColor, splatMask); // color
        } else if (mode == 1) {
            vec4 texColor = texture(inputTex, ((uv + splatMask * 0.1) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))); // displace
            color = mix(color, texColor, splatMask);
        } else if (mode == 2) {
            color.rgb = mix(color.rgb, 1.0 - color.rgb, splatMask); // invert
        } else if (mode == 3) {
            color.rgb *= map(splatMask * 0.5 - 0.5, -0.25, 0.0, 0.0, 1.0); // negative
        }
    }

	fragColor = color;
}
`,wgsl:`// Splat compositor overlay shader.
// Builds deterministic multi-octave splat and speck masks from PCG-backed Perlin noise.
// Ported from GLSL to WGSL

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;

struct Uniforms {
    time: f32,
    enabled: i32,
    useSpecks: i32,
    scale: f32,
    cutoff: f32,
    speed: f32,
    seed: f32,
    color: vec3<f32>,
    mode: i32,
    speckScale: f32,
    speckCutoff: f32,
    speckSpeed: f32,
    speckSeed: f32,
    speckColor: vec3<f32>,
    speckMode: i32,
}

@group(0) @binding(2) var<uniform> u : Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn getAspectRatio() -> f32 {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    return dims.x / dims.y;
}

fn mapRange(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// PCG PRNG
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
    if (p.x >= 0.0) { p.x = p.x * 2.0; } else { p.x = -p.x * 2.0 + 1.0; }
    if (p.y >= 0.0) { p.y = p.y * 2.0; } else { p.y = -p.y * 2.0 + 1.0; }
    if (p.z >= 0.0) { p.z = p.z * 2.0; } else { p.z = -p.z * 2.0 + 1.0; }
    return vec3<f32>(pcg(vec3<u32>(u32(p.x), u32(p.y), u32(p.z)))) / f32(0xffffffffu);
}

fn smootherstep(x: f32) -> f32 {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

fn smoothlerp(x: f32, a: f32, b: f32) -> f32 {
    return a + smootherstep(x) * (b - a);
}

fn grid(st: vec2<f32>, cell: vec2<f32>, speed: f32) -> f32 {
    var angle = prng(vec3<f32>(cell, 1.0)).r * TAU;
    angle = angle + u.time * TAU * speed;
    let gradient = vec2<f32>(cos(angle), sin(angle));
    let dist = st - cell;
    return dot(gradient, dist);
}

fn perlin(st_in: vec2<f32>, scale: vec2<f32>, speed: f32) -> f32 {
    var st = st_in - 0.5;
    st = st * scale;
    st = st + 0.5;
    let cell = floor(st);
    let tl = grid(st, cell, speed);
    let tr = grid(st, vec2<f32>(cell.x + 1.0, cell.y), speed);
    let bl = grid(st, vec2<f32>(cell.x, cell.y + 1.0), speed);
    let br = grid(st, cell + 1.0, speed);
    let upper = smoothlerp(st.x - cell.x, tl, tr);
    let lower = smoothlerp(st.x - cell.x, bl, br);
    let val = smoothlerp(st.y - cell.y, upper, lower);
    return val * 0.5 + 0.5;
}

fn splat(st_in: vec2<f32>, scale: vec2<f32>) -> f32 {
    var st = st_in;
    st.x = st.x + perlin(st + u.seed + 50.0, vec2<f32>(2.0, 3.0), 0.0) * 0.5 - 0.5;
    st.y = st.y + perlin(st + u.seed + 60.0, vec2<f32>(2.0, 3.0), 0.0) * 0.5 - 0.5;
    let d = perlin(st, vec2<f32>(4.0) * scale, u.speed) + 
            (perlin(st + 10.0, vec2<f32>(8.0) * scale, u.speed) * 0.5) + 
            (perlin(st + 20.0, vec2<f32>(16.0) * scale, u.speed) * 0.25);
    return step(mapRange(u.cutoff, 0.0, 100.0, 0.85, 0.99), d);
}

fn speckle(st: vec2<f32>, scale: vec2<f32>) -> f32 {
    var d = perlin(st, scale, u.speckSpeed) + (perlin(st + 10.0, scale * 2.0, u.speckSpeed) * 0.5);
    d = d / 1.5;
    return step(mapRange(u.speckCutoff, 0.0, 100.0, 0.6, 0.7), d);
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let aspectRatio = dims.x / dims.y;
    var uv = fragCoord.xy / dims;

    var color = textureSample(inputTex, samp, uv);
    
    let noiseCoord = uv * vec2<f32>(aspectRatio, 1.0);
    
    if (u.useSpecks != 0) {
        let speckMask = speckle(noiseCoord + u.speckSeed, vec2<f32>(32.0) * mapRange(u.speckScale, 1.0, 5.0, 2.0, 0.5));
        
        if (u.speckMode == 0) {
            color = vec4<f32>(mix(color.rgb, u.speckColor, speckMask), color.a); // color
        } else if (u.speckMode == 1) {
            color = textureSample(inputTex, samp, uv + speckMask * 0.1); // displace
        } else if (u.speckMode == 2) {
            color = vec4<f32>(mix(color.rgb, 1.0 - color.rgb, speckMask), color.a); // invert
        } else if (u.speckMode == 3) {
            color = vec4<f32>(color.rgb * speckMask, color.a); // negative
        }
    }
    
    if (u.enabled != 0) {
        let splatMask = splat(noiseCoord + u.seed, vec2<f32>(mapRange(u.scale, 1.0, 5.0, 2.0, 0.5)));
        
        if (u.mode == 0) {
            color = vec4<f32>(mix(color.rgb, u.color, splatMask), color.a); // color
        } else if (u.mode == 1) {
            let texColor = textureSample(inputTex, samp, uv + splatMask * 0.1); // displace
            color = mix(color, texColor, splatMask);
        } else if (u.mode == 2) {
            color = vec4<f32>(mix(color.rgb, 1.0 - color.rgb, splatMask), color.a); // invert
        } else if (u.mode == 3) {
            color = vec4<f32>(color.rgb * mapRange(splatMask * 0.5 - 0.5, -0.25, 0.0, 0.0, 1.0), color.a); // negative
        }
    }
    
    return color;
}
`}},l=`# splat

Splatter paint effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| enabled | boolean | true | - | Splats |
| mode | int | invert | color/displace/invert/negative | Splat mode |
| scale | float | 3 | 1-5 | Splat scale |
| seed | int | 1 | 1-100 | Splat seed |
| color | color | 1,1,1 | - | Splat color |
| cutoff | float | 25 | 0-100 | Splat cutoff |
| speed | int | 1 | 0-5 | Splat speed |
| useSpecks | boolean | true | - | Specks |
| speckScale | float | 5 | 1-5 | Speck scale |
| speckCutoff | float | 70 | 0-100 | Speck cutoff |
| speckSpeed | int | 1 | 0-5 | Speck speed |
| speckSeed | int | 1 | 1-100 | Speck seed |
| speckMode | int | color | color/displace/invert/negative | Speck mode |
| speckColor | color | 0.8,0.8,0.8 | - | Speck color |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .splat()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(o))n.shaders[s]={...e}}n&&l&&(n.help=l);var p="classicNoisedeck/splat",f="classicNoisedeck",u="splat",d=n;export{d as default,p as effectId,u as effectName,l as help,f as namespace};
