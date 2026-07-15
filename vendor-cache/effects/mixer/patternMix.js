/* mixer/patternMix */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"PatternMix",namespace:"mixer",func:"patternMix",tags:["blend","pattern"],description:"Mix inputs using geometric patterns",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},invert:{type:"int",default:0,uniform:"invert",choices:{sourceA:1,sourceB:0},ui:{label:"fg source",control:"dropdown"}},type:{type:"int",default:7,uniform:"patternType",choices:{checkerboard:0,concentricRings:1,dots:2,grid:3,hexagons:4,radialLines:5,spiral:6,stripes:7,triangularGrid:8},ui:{label:"pattern type",control:"dropdown"}},scale:{type:"float",default:18,uniform:"scale",min:1,max:20,ui:{label:"scale",control:"slider"}},thickness:{type:"float",default:.5,uniform:"thickness",min:0,max:1,ui:{label:"thickness",control:"slider"}},smoothness:{type:"float",default:.01,uniform:"smoothness",min:0,max:.25,zero:0,ui:{label:"smoothness",control:"slider"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider"}}},defaultProgram:`search mixer, synth

noise(ridges: true, colorMode: mono)
.write(o0)

noise(ridges: true)
.patternMix(tex: read(o0))
.write(o1)`,passes:[{name:"render",program:"patternMix",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var o={patternMix:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int patternType;
uniform float scale;
uniform float thickness;
uniform float smoothness;
uniform float rotation;
uniform int invert;

out vec4 fragColor;

#define PI 3.14159265359
#define SQRT3 1.7320508075688772

#define CHECKERBOARD 0
#define CONCENTRIC_RINGS 1
#define DOTS 2
#define GRID 3
#define HEXAGONS 4
#define RADIAL_LINES 5
#define SPIRAL 6
#define STRIPES 7
#define TRIANGULAR_GRID 8

#define TAU 6.28318530718

vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float stripes(vec2 p, float t) {
    float stripe = fract(p.x);
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, stripe);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, stripe);
    return edge1 - edge2;
}

float checkerboard(vec2 p, float sm) {
    vec2 f = fract(p);
    float d = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    vec2 cell = floor(p);
    float check = mod(cell.x + cell.y, 2.0);
    float edge = smoothstep(0.0, sm * 0.5, d);
    return mix(1.0 - check, check, edge);
}

float grid(vec2 p, float t) {
    vec2 f = fract(p);
    float lineX = smoothstep(t * 0.5 - smoothness, t * 0.5 + smoothness, abs(f.x - 0.5));
    float lineY = smoothstep(t * 0.5 - smoothness, t * 0.5 + smoothness, abs(f.y - 0.5));
    return 1.0 - min(lineX, lineY);
}

float dots(vec2 p, float t) {
    vec2 f = fract(p) - 0.5;
    float d = length(f);
    float radius = t * 0.5;
    return 1.0 - smoothstep(radius - smoothness, radius + smoothness, d);
}

float hexDist(vec2 p) {
    p = abs(p);
    return max(p.x * 0.5 + p.y * (SQRT3 / 2.0), p.x);
}

float hexagons(vec2 p, float t) {
    vec2 s = vec2(1.0, SQRT3);
    vec2 h = s * 0.5;
    vec2 a = mod(p, s) - h;
    vec2 b = mod(p + h, s) - h;
    vec2 g = length(a) < length(b) ? a : b;
    float d = hexDist(g);
    float edge = 0.5 * t;
    return smoothstep(edge + smoothness, edge - smoothness, d);
}

// Concentric rings pattern
float concentricRings(vec2 p, float t) {
    float d = fract(length(p));
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, d);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, d);
    return edge1 - edge2;
}

// Radial lines pattern
float radialLines(vec2 p, float t) {
    float lineCount = max(1.0, floor(20.0 * t));
    float angle = atan(p.y, p.x);
    float d = fract(angle / TAU * lineCount);
    float edge1 = smoothstep(0.5 - 0.25 - smoothness, 0.5 - 0.25 + smoothness, d);
    float edge2 = smoothstep(0.5 + 0.25 - smoothness, 0.5 + 0.25 + smoothness, d);
    return edge1 - edge2;
}

// Triangular grid pattern
float triangularGrid(vec2 p, float t) {
    // Skew for equilateral triangles
    vec2 skewed = vec2(p.x - p.y / SQRT3, p.y * 2.0 / SQRT3);
    vec2 cell = floor(skewed);
    vec2 f = fract(skewed);

    // Distance to nearest edge of the triangle
    float d;
    if (f.x + f.y < 1.0) {
        d = min(min(f.x, f.y), 1.0 - f.x - f.y);
    } else {
        d = min(min(1.0 - f.x, 1.0 - f.y), f.x + f.y - 1.0);
    }

    float edge = (1.0 - t) * 0.4;
    return smoothstep(edge - smoothness, edge + smoothness, d);
}

// Spiral pattern
float spiralPattern(vec2 p, float t) {
    float dist = length(p);
    float angle = atan(p.y, p.x);
    float d = fract(angle / TAU + dist);
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, d);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, d);
    return edge1 - edge2;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 colorA = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 colorB = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    // Center and aspect-correct using full image coordinates
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float aspect = fullRes.x / fullRes.y;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec2 p = (globalUV - 0.5) * 2.0;
    p.x *= aspect;

    // Apply rotation
    float rad = rotation * PI / 180.0;
    p = rotate2D(p, rad);

    // Apply scale (lower scale = higher frequency, matching synth/pattern)
    p *= (21.0 - scale);

    // Compute pattern mask
    float m = 0.0;
    if (patternType == CHECKERBOARD) {
        m = checkerboard(p, smoothness);
    } else if (patternType == CONCENTRIC_RINGS) {
        m = concentricRings(p, thickness);
    } else if (patternType == DOTS) {
        m = dots(p, thickness);
    } else if (patternType == GRID) {
        m = grid(p, thickness);
    } else if (patternType == HEXAGONS) {
        m = hexagons(p, thickness);
    } else if (patternType == RADIAL_LINES) {
        m = radialLines(p, thickness);
    } else if (patternType == SPIRAL) {
        m = spiralPattern(p, thickness);
    } else if (patternType == STRIPES) {
        m = stripes(p, thickness);
    } else if (patternType == TRIANGULAR_GRID) {
        m = triangularGrid(p, thickness);
    }

    // Invert swaps which input shows in the pattern
    if (invert == 1) {
        m = 1.0 - m;
    }

    // Mix: m=0 shows A, m=1 shows B
    vec4 color = mix(colorA, colorB, m);
    color.a = max(colorA.a, colorB.a);

    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> patternType : i32;
@group(0) @binding(4) var<uniform> scale : f32;
@group(0) @binding(5) var<uniform> thickness : f32;
@group(0) @binding(6) var<uniform> smoothness : f32;
@group(0) @binding(7) var<uniform> rotation : f32;
@group(0) @binding(8) var<uniform> invert : i32;

const PI: f32 = 3.14159265359;
const SQRT3: f32 = 1.7320508075688772;

const CHECKERBOARD: i32 = 0;
const CONCENTRIC_RINGS: i32 = 1;
const DOTS: i32 = 2;
const GRID: i32 = 3;
const HEXAGONS: i32 = 4;
const RADIAL_LINES: i32 = 5;
const SPIRAL_PATTERN: i32 = 6;
const STRIPES: i32 = 7;
const TRIANGULAR_GRID: i32 = 8;
const TAU: f32 = 6.28318530718;

fn rotate2D(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

fn stripes(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let stripe = fract(p.x);
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, stripe);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, stripe);
    return edge1 - edge2;
}

fn checkerboard(p: vec2<f32>, sm: f32) -> f32 {
    let f = fract(p);
    let d = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    let cell = floor(p);
    let check = ((cell.x + cell.y) % 2.0 + 2.0) % 2.0;
    let edge = smoothstep(0.0, sm * 0.5, d);
    return mix(1.0 - check, check, edge);
}

fn grid(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let f = fract(p);
    let lineX = smoothstep(t * 0.5 - sm, t * 0.5 + sm, abs(f.x - 0.5));
    let lineY = smoothstep(t * 0.5 - sm, t * 0.5 + sm, abs(f.y - 0.5));
    return 1.0 - min(lineX, lineY);
}

fn dots(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let f = fract(p) - vec2<f32>(0.5, 0.5);
    let d = length(f);
    let r = t * 0.5;
    return 1.0 - smoothstep(r - sm, r + sm, d);
}

fn hexDist(p: vec2<f32>) -> f32 {
    let ap = abs(p);
    return max(ap.x * 0.5 + ap.y * (SQRT3 / 2.0), ap.x);
}

fn hexagons(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let s = vec2<f32>(1.0, SQRT3);
    let h = s * 0.5;
    let a = ((p % s) + s) % s - h;
    let b = (((p + h) % s) + s) % s - h;
    var g: vec2<f32>;
    if (length(a) < length(b)) {
        g = a;
    } else {
        g = b;
    }
    let d = hexDist(g);
    let edge = 0.5 * t;
    return smoothstep(edge + sm, edge - sm, d);
}

// Concentric rings pattern
fn concentricRings(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let d = fract(length(p));
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, d);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, d);
    return edge1 - edge2;
}

// Radial lines pattern
fn radialLines(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let lineCount = max(1.0, floor(20.0 * t));
    let angle = atan2(p.y, p.x);
    let d = fract(angle / TAU * lineCount);
    let edge1 = smoothstep(0.5 - 0.25 - sm, 0.5 - 0.25 + sm, d);
    let edge2 = smoothstep(0.5 + 0.25 - sm, 0.5 + 0.25 + sm, d);
    return edge1 - edge2;
}

// Triangular grid pattern
fn triangularGrid(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let skewed = vec2<f32>(p.x - p.y / SQRT3, p.y * 2.0 / SQRT3);
    let cell = floor(skewed);
    let f = fract(skewed);

    var d: f32;
    if (f.x + f.y < 1.0) {
        d = min(min(f.x, f.y), 1.0 - f.x - f.y);
    } else {
        d = min(min(1.0 - f.x, 1.0 - f.y), f.x + f.y - 1.0);
    }

    let edge = (1.0 - t) * 0.4;
    return smoothstep(edge - sm, edge + sm, d);
}

// Spiral pattern
fn spiralPattern(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let dist = length(p);
    let angle = atan2(p.y, p.x);
    let d = fract(angle / TAU + dist);
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, d);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, d);
    return edge1 - edge2;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = position.xy / dims;

    let colorA = textureSample(inputTex, samp, st);
    let colorB = textureSample(tex, samp, st);

    // Center and aspect-correct
    let aspect = dims.x / dims.y;
    var p = (st - vec2<f32>(0.5, 0.5)) * 2.0;
    p.x = p.x * aspect;

    // Apply rotation
    let rad = rotation * PI / 180.0;
    p = rotate2D(p, rad);

    // Apply scale (lower scale = higher frequency, matching synth/pattern)
    p = p * (21.0 - scale);

    // Compute pattern mask
    var m: f32 = 0.0;
    if (patternType == CHECKERBOARD) {
        m = checkerboard(p, smoothness);
    } else if (patternType == CONCENTRIC_RINGS) {
        m = concentricRings(p, thickness, smoothness);
    } else if (patternType == DOTS) {
        m = dots(p, thickness, smoothness);
    } else if (patternType == GRID) {
        m = grid(p, thickness, smoothness);
    } else if (patternType == HEXAGONS) {
        m = hexagons(p, thickness, smoothness);
    } else if (patternType == RADIAL_LINES) {
        m = radialLines(p, thickness, smoothness);
    } else if (patternType == SPIRAL_PATTERN) {
        m = spiralPattern(p, thickness, smoothness);
    } else if (patternType == STRIPES) {
        m = stripes(p, thickness, smoothness);
    } else if (patternType == TRIANGULAR_GRID) {
        m = triangularGrid(p, thickness, smoothness);
    }

    // Invert swaps which input shows in the pattern
    if (invert == 1) {
        m = 1.0 - m;
    }

    // Mix: m=0 shows A, m=1 shows B
    var color = mix(colorA, colorB, m);
    color.a = max(colorA.a, colorB.a);

    return color;
}
`}},r=`# patternMix

Mix inputs using geometric patterns

## Description

Divides the frame using one of nine geometric patterns, showing source A in one region and source B in the other. The same pattern library as the synth/pattern generator, applied here as a spatial mixer between two inputs.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| type | int | stripes | checkerboard/concentricRings/dots/grid/hexagons/radialLines/spiral/stripes/triangularGrid | Pattern type |
| scale | float | 18 | 1-20 | Pattern scale (lower = more repetitions) |
| thickness | float | 0.5 | 0-1 | Line/dot thickness |
| smoothness | float | 0.01 | 0-0.25 | Edge softness (0 = hard edge) |
| rotation | float | 0 | -180-180 | Rotation in degrees |
| invert | int | sourceB | sourceA/sourceB | Swap which input appears in each region |

## Notes

- **checkerboard**: Alternating square tiles of each source
- **concentricRings**: Concentric ring regions alternating between sources
- **dots**: Circular dots of source B on a field of source A
- **grid**: Source B appears in grid lines, source A fills the cells
- **hexagons**: Honeycomb tiling alternating between sources
- **radialLines**: Radial line segments radiating from center
- **spiral**: Spiral arm regions alternating between sources
- **stripes**: Vertical bands alternating between sources; thickness controls band width
- **triangularGrid**: Equilateral triangle tiling
- **smoothness at 0**: Hard pixel-perfect edges between pattern regions
- **smoothness increased**: Anti-aliased or soft transitions at pattern boundaries
- Rotation applies to the entire pattern coordinate space

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .patternMix(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(o))n.shaders[s]={...e}}n&&r&&(n.help=r);var f="mixer/patternMix",c="mixer",m="patternMix",d=n;export{d as default,f as effectId,m as effectName,r as help,c as namespace};
