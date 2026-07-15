/* synth/gradient */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Gradient",namespace:"synth",func:"gradient",tags:["color"],openCategories:["general","color"],description:"Multi-color gradient generator with various styles",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},speed:{slot:0,components:"w"},rotation:{slot:1,components:"x"},gradientType:{slot:1,components:"y"},repeat:{slot:1,components:"z"},colorCount:{slot:1,components:"w"},seed:{slot:2,components:"x"},color1:{slot:3,components:"xyz"},color2:{slot:4,components:"xyz"},color3:{slot:5,components:"xyz"},color4:{slot:6,components:"xyz"},tileOffset:{slot:7,components:"xy"},fullResolution:{slot:7,components:"zw"}},globals:{type:{type:"int",default:0,uniform:"gradientType",choices:{conic:0,diamond:1,fourCorners:2,linear:3,noiseGradient:4,radial:5,spiral:6},ui:{label:"type",control:"dropdown",category:"general"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider",category:"general",enabledBy:{param:"type",neq:2}}},repeat:{type:"int",default:1,uniform:"repeat",min:1,max:4,ui:{label:"repeat",control:"slider",category:"general",enabledBy:{param:"type",neq:2}}},speed:{type:"int",default:0,uniform:"speed",min:-5,max:5,zero:0,randMin:-2,randMax:2,ui:{label:"speed",control:"slider",category:"general",enabledBy:{param:"type",neq:2}}},seed:{type:"int",default:1,uniform:"seed",min:0,max:100,ui:{label:"seed",control:"slider",category:"general",enabledBy:{param:"type",eq:4}}},color1:{type:"color",default:[1,0,0],uniform:"color1",ui:{label:"color 1",control:"color",category:"color"}},color2:{type:"color",default:[1,1,0],uniform:"color2",ui:{label:"color 2",control:"color",category:"color"}},color3:{type:"color",default:[0,1,0],uniform:"color3",ui:{label:"color 3",control:"color",category:"color",enabledBy:{param:"colorCount",gt:2}}},color4:{type:"color",default:[0,0,1],uniform:"color4",ui:{label:"color 4",control:"color",category:"color",enabledBy:{param:"colorCount",gt:3}}},colorCount:{type:"int",default:4,uniform:"colorCount",min:2,max:4,step:1,ui:{label:"color count",control:"slider",category:"color"}}},passes:[{name:"main",program:"gradient",inputs:{},outputs:{color:"outputTex"}}]});var r={gradient:{glsl:`#version 300 es
precision highp float;

/*
 * Gradient generator shader.
 * Renders linear, radial, conic, and four corners gradients with rotation and repeat.
 */

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int gradientType;
uniform float rotation;
uniform int repeat;
uniform int colorCount;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform int seed;
uniform float time;
uniform float speed;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

vec2 rotate2D(vec2 st, float angle) {
    float aspectRatio = fullResolution.x / fullResolution.y;
    st.x *= aspectRatio;
    st -= vec2(aspectRatio * 0.5, 0.5);
    float c = cos(angle);
    float s = sin(angle);
    st = mat2(c, -s, s, c) * st;
    st += vec2(aspectRatio * 0.5, 0.5);
    st.x /= aspectRatio;
    return st;
}

vec3 getColor(int idx) {
    if (idx == 0) return color1;
    if (idx == 1) return color2;
    if (idx == 2) return color3;
    return color4;
}

// Blend colors based on a 0-1 parameter t, cycling through colorCount colors
vec3 blendColors(float t) {
    t = fract(t);
    float segment = t * float(colorCount);
    int idx = int(floor(segment));
    float localT = fract(segment);
    int next = idx + 1;
    if (next >= colorCount) next = 0;
    return mix(getColor(idx), getColor(next), localT);
}

// PCG PRNG for noise gradient
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

// Value noise using PCG
float hash2D(vec2 p) {
    return prng(vec3(p, float(seed))).x;
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash2D(i);
    float b = hash2D(i + vec2(1.0, 0.0));
    float c = hash2D(i + vec2(0.0, 1.0));
    float d = hash2D(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbmNoise(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    float maxVal = 0.0;
    for (int i = 0; i < 4; i++) {
        sum += valueNoise(p * freq) * amp;
        maxVal += amp;
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum / maxVal;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;
    float aspectRatio = fullResolution.x / fullResolution.y;
    
    // Convert rotation from degrees to radians
    float angle = -rotation * PI / 180.0;
    
    // Apply rotation for linear and conic gradients
    vec2 rotatedSt = rotate2D(st, angle);
    
    // Centered coordinates for radial and conic
    vec2 centered = st - 0.5;
    centered.x *= aspectRatio;
    
    // Rotated centered for conic
    vec2 rotatedCentered = centered;
    float c = cos(angle);
    float s = sin(angle);
    rotatedCentered = mat2(c, -s, s, c) * centered;
    
    vec3 color;
    float t;
    float timeOffset = time * speed;

    if (gradientType == 0) {
        // Conic/angular gradient
        float a = atan(rotatedCentered.y, rotatedCentered.x);
        t = (a + PI) / TAU;
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    } else if (gradientType == 1) {
        // Diamond gradient - L1 distance with rotation
        t = abs(rotatedCentered.x) + abs(rotatedCentered.y);
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    } else if (gradientType == 2) {
        // Four corners - bilinear interpolation
        // 4: TL=c1 TR=c2 BL=c3 BR=c4
        // 3: TL=c1 TR=c2 BL=c3 BR=c3
        // 2: TL=c1 TR=c1 BL=c2 BR=c2
        vec2 cornerSt = rotate2D(st, angle);
        vec3 cTL = color1;
        vec3 cTR = colorCount >= 3 ? color2 : color1;
        vec3 cBL = colorCount >= 3 ? color3 : color2;
        vec3 cBR = colorCount >= 4 ? color4 : cBL;
        vec3 top = mix(cTL, cTR, cornerSt.x);
        vec3 bottom = mix(cBL, cBR, cornerSt.x);
        color = mix(bottom, top, cornerSt.y);
    } else if (gradientType == 3) {
        // Linear gradient along rotated y-axis
        t = rotatedSt.y;
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    } else if (gradientType == 4) {
        // Noise gradient with rotation
        vec2 noiseSt = rotatedCentered * 4.0;
        t = fbmNoise(noiseSt);
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    } else if (gradientType == 5) {
        // Radial gradient from center
        vec2 rotatedPoint = mat2(c, -s, s, c) * centered;
        float dist = length(rotatedPoint) * 2.0;
        t = dist;
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    } else if (gradientType == 6) {
        // Spiral gradient - angle + distance
        float a = atan(rotatedCentered.y, rotatedCentered.x);
        float dist = length(centered);
        t = fract(a / TAU + dist * 2.0);
        t = fract(t * float(repeat) + timeOffset);
        color = blendColors(t);
    }

    fragColor = vec4(color, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU

/*
 * Gradient generator shader.
 * Renders linear, radial, conic, and four corners gradients with rotation and repeat.
 *
 * Uniforms are packed into a single struct (one uniform buffer) rather than
 * 12+ individual @binding uniforms: gradient otherwise hits the WebGPU
 * maxUniformBuffersPerShaderStage limit (12) once the universal tile globals
 * (tileOffset, fullResolution) are added, producing an invalid pipeline.
 * Packing layout is declared in this effect's own definition.js uniformLayout.
 */

struct Uniforms {
    data : array<vec4<f32>, 8>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

// Values referenced by helper functions (set from \`uniforms\` in main).
var<private> resolution : vec2<f32>;
var<private> fullResolution : vec2<f32>;
var<private> seed : i32;
var<private> colorCount : i32;
var<private> color1 : vec3<f32>;
var<private> color2 : vec3<f32>;
var<private> color3 : vec3<f32>;
var<private> color4 : vec3<f32>;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn rotate2D(st: vec2<f32>, angle: f32) -> vec2<f32> {
    let fullRes = select(resolution, fullResolution, fullResolution.x > 0.0);
    let aspectRatio = fullRes.x / fullRes.y;
    var coord = st;
    coord.x = coord.x * aspectRatio;
    coord = coord - vec2<f32>(aspectRatio * 0.5, 0.5);
    let c = cos(angle);
    let s = sin(angle);
    coord = mat2x2<f32>(c, -s, s, c) * coord;
    coord = coord + vec2<f32>(aspectRatio * 0.5, 0.5);
    coord.x = coord.x / aspectRatio;
    return coord;
}

fn getColor(idx: i32) -> vec3<f32> {
    switch idx {
        case 0: { return color1; }
        case 1: { return color2; }
        case 2: { return color3; }
        default: { return color4; }
    }
}

// Blend colors based on a 0-1 parameter t, cycling through colorCount colors
fn blendColors(t_in: f32) -> vec3<f32> {
    let t = fract(t_in);
    let segment = t * f32(colorCount);
    let idx = i32(floor(segment));
    let localT = fract(segment);
    var next = idx + 1;
    if (next >= colorCount) { next = 0; }
    return mix(getColor(idx), getColor(next), localT);
}

// PCG PRNG for noise gradient
fn pcg(seed_in: vec3<u32>) -> vec3<u32> {
    var v = seed_in * 1664525u + 1013904223u;
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

fn hash2D(p: vec2<f32>) -> f32 {
    return prng(vec3<f32>(p, f32(seed))).x;
}

fn valueNoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);

    let a = hash2D(i);
    let b = hash2D(i + vec2<f32>(1.0, 0.0));
    let c = hash2D(i + vec2<f32>(0.0, 1.0));
    let d = hash2D(i + vec2<f32>(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbmNoise(p: vec2<f32>) -> f32 {
    var sum: f32 = 0.0;
    var amp: f32 = 0.5;
    var freq: f32 = 1.0;
    var maxVal: f32 = 0.0;
    for (var i: i32 = 0; i < 4; i = i + 1) {
        sum = sum + valueNoise(p * freq) * amp;
        maxVal = maxVal + amp;
        freq = freq * 2.0;
        amp = amp * 0.5;
    }
    return sum / maxVal;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let speed = uniforms.data[0].w;
    let rotation = uniforms.data[1].x;
    let gradientType = i32(uniforms.data[1].y);
    let repeat = i32(uniforms.data[1].z);
    colorCount = i32(uniforms.data[1].w);
    seed = i32(uniforms.data[2].x);
    color1 = uniforms.data[3].xyz;
    color2 = uniforms.data[4].xyz;
    color3 = uniforms.data[5].xyz;
    color4 = uniforms.data[6].xyz;
    let tileOffset = uniforms.data[7].xy;
    fullResolution = uniforms.data[7].zw;

    let fullRes = select(resolution, fullResolution, fullResolution.x > 0.0);
    let st = (pos.xy + tileOffset) / fullRes;
    let aspectRatio = fullRes.x / fullRes.y;

    // Convert rotation from degrees to radians
    let angle = -rotation * PI / 180.0;

    // Apply rotation for linear and conic gradients
    let rotatedSt = rotate2D(st, angle);

    // Centered coordinates for radial and conic
    var centered = st - 0.5;
    centered.x = centered.x * aspectRatio;

    // Rotated centered for conic
    let c = cos(angle);
    let s = sin(angle);
    let rotatedCentered = mat2x2<f32>(c, -s, s, c) * centered;

    var color: vec3<f32>;
    var t: f32;
    let timeOffset = time * speed;

    switch gradientType {
        case 0: {
            // Conic/angular gradient
            let a = atan2(rotatedCentered.y, rotatedCentered.x);
            t = (a + PI) / TAU;
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        case 1: {
            // Diamond gradient - L1 distance with rotation
            t = abs(rotatedCentered.x) + abs(rotatedCentered.y);
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        case 2: {
            // Four corners - bilinear interpolation
            // 4: TL=c1 TR=c2 BL=c3 BR=c4
            // 3: TL=c1 TR=c2 BL=c3 BR=c3
            // 2: TL=c1 TR=c1 BL=c2 BR=c2
            let cornerSt = rotate2D(st, angle);
            var cTL = color1;
            var cTR = color1;
            var cBL = color2;
            var cBR = color2;
            if (colorCount >= 3) {
                cTR = color2;
                cBL = color3;
                cBR = color3;
            }
            if (colorCount >= 4) {
                cBR = color4;
            }
            let top = mix(cTL, cTR, cornerSt.x);
            let bottom = mix(cBL, cBR, cornerSt.x);
            color = mix(bottom, top, cornerSt.y);
        }
        case 3: {
            // Linear gradient along rotated y-axis
            t = rotatedSt.y;
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        case 4: {
            // Noise gradient with rotation
            let noiseSt = rotatedCentered * 4.0;
            t = fbmNoise(noiseSt);
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        case 5: {
            // Radial gradient from center
            let rotatedPoint = mat2x2<f32>(c, -s, s, c) * centered;
            let dist = length(rotatedPoint) * 2.0;
            t = dist;
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        case 6: {
            // Spiral gradient - angle + distance
            let a = atan2(rotatedCentered.y, rotatedCentered.x);
            let dist = length(centered);
            t = fract(a / TAU + dist * 2.0);
            t = fract(t * f32(repeat) + timeOffset);
            color = blendColors(t);
        }
        default: {
            color = color1;
        }
    }

    return vec4<f32>(color, 1.0);
}
`}},a=`# gradient

Multi-color gradient generator with various styles

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | conic | conic/diamond/fourCorners/linear/noiseGradient/radial/spiral | Type |
| rotation | float | 0 | -180-180 | Rotation |
| repeat | int | 1 | 1-4 | Repeat |
| speed | int | 0 | -5-5 | Animation speed |
| seed | int | 1 | 0-100 | Random seed (noise gradient only) |
| color1 | color | 1,0,0 | - | Color 1 |
| color2 | color | 1,1,0 | - | Color 2 |
| color3 | color | 0,1,0 | - | Color 3 |
| color4 | color | 0,0,1 | - | Color 4 |
| colorCount | int | 4 | 2-4 | Number of colors |

## Notes

Gradient types:
- **conic**: Angular/sweep gradient rotating around the center
- **diamond**: Diamond-shaped (L1/Manhattan distance) gradient from center
- **fourCorners**: Bilinear interpolation with each color at a corner
- **linear**: Smooth gradient transitioning through all 4 colors vertically
- **noiseGradient**: Value noise using PCG PRNG, driven by seed. Rotation rotates the noise field
- **radial**: Circular gradient emanating from the center
- **spiral**: Spiral gradient combining angle and distance

## Usage

\`\`\`
search synth

gradient()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(r))e.shaders[o]={...n}}e&&a&&(e.help=a);var f="synth/gradient",d="synth",u="gradient",p=e;export{p as default,f as effectId,u as effectName,a as help,d as namespace};
