/* synth/bitwise */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Bitwise",namespace:"synth",func:"bitwise",tags:["geometric","pattern"],openCategories:["general","color"],description:"Bitwise operation patterns (XOR squares, AND, OR, etc.)",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},operation:{slot:0,components:"w"},scale:{slot:1,components:"x"},offsetX:{slot:1,components:"y"},offsetY:{slot:1,components:"z"},mask:{slot:1,components:"w"},seed:{slot:2,components:"x"},colorMode:{slot:2,components:"y"},speed:{slot:2,components:"z"},rotation:{slot:2,components:"w"},colorOffset:{slot:3,components:"x"},tileOffset:{slot:4,components:"xy"},fullResolution:{slot:4,components:"zw"},renderScale:{slot:5,components:"x"}},globals:{operation:{type:"int",default:0,uniform:"operation",choices:{xor:0,and:1,or:2,nand:3,xnor:4,mul:5,add:6,sub:7},ui:{label:"operation",control:"dropdown"}},mask:{type:"int",default:255,uniform:"mask",choices:{bit8:255,bit7:127,bit6:63,bit5:31,bit4:15,bit3:7,bit2:3,bit1:1},randChoices:[255,127,63,31,15],ui:{label:"bit depth",control:"dropdown"}},scale:{type:"float",default:50,uniform:"scale",min:1,max:100,randMin:25,ui:{label:"scale",control:"slider"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,zero:0,ui:{label:"rotation",control:"slider"}},offsetX:{type:"int",default:0,uniform:"offsetX",min:-256,max:256,zero:0,randChance:0,ui:{label:"offset X",control:"slider"}},offsetY:{type:"int",default:0,uniform:"offsetY",min:-256,max:256,zero:0,randChance:0,ui:{label:"offset Y",control:"slider"}},seed:{type:"int",default:0,uniform:"seed",min:0,max:255,zero:0,ui:{label:"seed",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:-5,max:5,zero:0,randChance:0,ui:{label:"speed",control:"slider"}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,rgb:1,hsv:2},ui:{label:"color mode",control:"dropdown",category:"color"}},colorOffset:{type:"int",default:7,uniform:"colorOffset",min:0,max:64,ui:{label:"color offset",control:"slider",category:"color",enabledBy:{param:"colorMode",eq:1}}}},passes:[{name:"main",program:"bitwise",inputs:{},outputs:{color:"outputTex"}}]});var i={bitwise:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float time;
uniform int operation;
uniform float scale;
uniform int offsetX;
uniform int offsetY;
uniform int mask;
uniform int seed;
uniform int colorMode;
uniform float speed;
uniform float rotation;
uniform int colorOffset;

out vec4 fragColor;

const float PI = 3.14159265358979;

// Branchless HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

// Perform the selected bitwise/arithmetic operation on two integers,
// mask the result, then normalize to 0..1
float bitOp(int a, int b, int op, int m) {
    int r = 0;
    if (op == 0)      r = a ^ b;           // xor
    else if (op == 1) r = a & b;           // and
    else if (op == 2) r = a | b;           // or
    else if (op == 3) r = ~(a & b);        // nand
    else if (op == 4) r = ~(a ^ b);        // xnor
    else if (op == 5) r = a * b;           // mul
    else if (op == 6) r = a + b;           // add
    else              r = a - b;           // sub
    r = r & m;
    return float(r) / float(m);
}

void main() {
    // Map scale so higher value = bigger cells (lower frequency).
    // Multiply by renderScale so pixel-sized cells scale with export resolution.
    float pixelScale = scale * 0.1 * renderScale;

    // Apply rotation around screen center
    float angle = rotation * PI / 180.0;
    float c = cos(angle);
    float s = sin(angle);
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 centered = globalCoord - fullResolution * 0.5;
    vec2 rotated = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
    vec2 coord = rotated + fullResolution * 0.5;

    // Time offset \u2014 uses 256 (pattern period) so it loops seamlessly at any speed
    int animOffset = int(floor(time * float(int(-speed)) * 256.0));

    // Compute integer coordinates
    int x = int(floor(coord.x / pixelScale)) + offsetX + animOffset;
    int y = int(floor(coord.y / pixelScale)) + offsetY;

    // Seed XORs into coordinates (dramatic pattern shifts)
    x = x ^ seed;
    y = y ^ (seed * 3);

    float v;
    if (colorMode == 0) {
        // Mono: same operation across all channels
        v = bitOp(x, y, operation, mask);
        fragColor = vec4(v, v, v, 1.0);
    } else if (colorMode == 1) {
        // RGB: channel-shifted patterns (chromatic aberration)
        float r = bitOp(x, y, operation, mask);
        float g = bitOp(x + colorOffset, y, operation, mask);
        float b = bitOp(x, y + colorOffset, operation, mask);
        fragColor = vec4(r, g, b, 1.0);
    } else {
        // HSV: bitwise value drives hue, full saturation and value
        // Scale hue to avoid wrapping both ends to red
        v = bitOp(x, y, operation, mask);
        float hueScale = float(mask) / float(mask + 1);
        fragColor = vec4(hsv2rgb(vec3(v * hueScale, 1.0, 1.0)), 1.0);
    }
}
`,wgsl:`// WGSL version \u2013 WebGPU
// Pack uniforms into a struct to stay within WebGPU's 12 uniform buffer limit
struct Uniforms {
    // Slot 0: resolution.xy, time, operation
    // Slot 1: scale, offsetX, offsetY, mask
    // Slot 2: seed, colorMode, speed, rotation
    // Slot 3: colorOffset
    data: array<vec4<f32>, 6>,
};

const PI: f32 = 3.14159265358979;

// Branchless HSV to RGB conversion
fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
    let p = abs(fract(c.xxx + vec3<f32>(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3<f32>(1.0), clamp(p - 1.0, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(c.y));
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Perform the selected bitwise/arithmetic operation on two integers,
// mask the result, then normalize to 0..1
fn bitOp(a: i32, b: i32, op: i32, m: i32) -> f32 {
    var r: i32 = 0;
    if (op == 0)      { r = a ^ b; }        // xor
    else if (op == 1) { r = a & b; }        // and
    else if (op == 2) { r = a | b; }        // or
    else if (op == 3) { r = ~(a & b); }     // nand
    else if (op == 4) { r = ~(a ^ b); }     // xnor
    else if (op == 5) { r = a * b; }        // mul
    else if (op == 6) { r = a + b; }        // add
    else              { r = a - b; }        // sub
    r = r & m;
    return f32(r) / f32(m);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    // Unpack uniforms
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let operation = i32(uniforms.data[0].w);
    let scale = uniforms.data[1].x;
    let offsetX = i32(uniforms.data[1].y);
    let offsetY = i32(uniforms.data[1].z);
    let mask = i32(uniforms.data[1].w);
    let seed = i32(uniforms.data[2].x);
    let colorMode = i32(uniforms.data[2].y);
    let speed = i32(uniforms.data[2].z);
    let rotation = uniforms.data[2].w;
    let colorOffset = i32(uniforms.data[3].x);
    let tileOffset = uniforms.data[4].xy;
    let fullResolution = uniforms.data[4].zw;
    let renderScale = uniforms.data[5].x;

    // Map scale so higher value = bigger cells (lower frequency)
    let pixelScale = scale * 0.1 * renderScale;

    // Apply rotation around screen center
    let angle = rotation * PI / 180.0;
    let c = cos(angle);
    let s = sin(angle);
    let centered = (position.xy + tileOffset) - fullResolution * 0.5;
    let rotated = vec2<f32>(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
    let coord = rotated + fullResolution * 0.5;

    // Time offset \u2014 uses 256 (pattern period) so it loops seamlessly at any speed
    let animOffset = i32(floor(time * f32(-speed) * 256.0));

    // Compute integer coordinates
    var x = i32(floor(coord.x / pixelScale)) + offsetX + animOffset;
    var y = i32(floor(coord.y / pixelScale)) + offsetY;

    // Seed XORs into coordinates (dramatic pattern shifts)
    x = x ^ seed;
    y = y ^ (seed * 3);

    if (colorMode == 0) {
        // Mono: same operation across all channels
        let v = bitOp(x, y, operation, mask);
        return vec4<f32>(v, v, v, 1.0);
    } else if (colorMode == 1) {
        // RGB: channel-shifted patterns (chromatic aberration)
        let r = bitOp(x, y, operation, mask);
        let g = bitOp(x + colorOffset, y, operation, mask);
        let b = bitOp(x, y + colorOffset, operation, mask);
        return vec4<f32>(r, g, b, 1.0);
    } else {
        // HSV: bitwise value drives hue, full saturation and value
        // Scale hue to avoid wrapping both ends to red
        let v = bitOp(x, y, operation, mask);
        let hueScale = f32(mask) / f32(mask + 1);
        return vec4<f32>(hsv2rgb(vec3<f32>(v * hueScale, 1.0, 1.0)), 1.0);
    }
}
`}},r=`# bitwise

Bitwise operation patterns (XOR squares, AND, OR, etc.)

## Description

Generates patterns by applying bitwise and arithmetic operations to pixel coordinates. The classic "XOR squares" pattern emerges from \`x XOR y & 0xFF\` \u2014 other operations produce dramatically different results with the same inputs.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| operation | int | xor | xor/and/or/nand/xnor/mul/add/sub | Bitwise operation |
| scale | float | 50 | 1-100 | Cell size (higher = bigger cells) |
| rotation | float | 0 | -180-180 | Rotation (degrees) |
| offsetX | int | 0 | -256-256 | Horizontal coordinate offset |
| offsetY | int | 0 | -256-256 | Vertical coordinate offset |
| mask | int | bit8 | bit8/bit7/bit6/bit5/bit4/bit3/bit2/bit1 | Bit depth mask |
| seed | int | 0 | 0-255 | XORs into coordinates for pattern variation |
| colorMode | int | mono | mono/rgb/hsv | Color mode |
| colorOffset | int | 7 | 0-64 | Color offset |
| speed | int | 0 | -5-5 | Animation speed (panning) |

## Operations

- **XOR (0)**: Classic recursive Sierpinski-like squares
- **AND (1)**: Chaotic diagonal emphasis
- **OR (2)**: Dense coverage with triangular gaps
- **NAND (3)**: Inverted AND
- **XNOR (4)**: Inverted XOR
- **MUL (5)**: Multiplication table (hyperbolic curves)
- **ADD (6)**: Diagonal stripes
- **SUB (7)**: Directional stripes

## Bit Depth

Lower bit depth (smaller mask) quantizes the output into fewer steps, producing chunkier, more graphic results. 1-bit mask gives pure black/white patterns.

## Usage

\`\`\`
search synth

bitwise()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(i))t.shaders[o]={...e}}t&&r&&(t.help=r);var c="synth/bitwise",p="synth",u="bitwise",d=t;export{d as default,c as effectId,u as effectName,r as help,p as namespace};
