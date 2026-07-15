/* synth/pattern */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Pattern",namespace:"synth",func:"pattern",tags:["geometric","pattern"],description:"Geometric pattern generator",globals:{type:{type:"int",default:7,uniform:"patternType",choices:{checkerboard:0,concentricRings:1,dots:2,grid:3,hearts:9,hexagons:4,radialLines:5,spiral:6,stripes:7,triangularGrid:8,waves:10,zigzag:11},ui:{label:"pattern type",control:"dropdown"}},scale:{type:"float",default:15,min:1,max:20,uniform:"scale",ui:{label:"scale",control:"slider"}},thickness:{type:"float",default:.5,min:0,max:1,uniform:"thickness",ui:{label:"thickness",control:"slider"}},smoothness:{type:"float",default:.02,min:0,max:1,uniform:"smoothness",ui:{label:"smoothness",control:"slider"}},rotation:{type:"float",default:0,min:-180,max:180,uniform:"rotation",ui:{label:"rotation",control:"slider"}},skew:{type:"float",default:0,min:-2,max:2,uniform:"skew",ui:{label:"skew",control:"slider"}},animation:{type:"int",default:0,uniform:"animation",choices:{none:0,pan:1,rotate:2},ui:{label:"animation",control:"dropdown",category:"animation",enabledBy:{param:"type",notIn:[1,5,6]}}},speed:{type:"int",default:1,uniform:"speed",min:-5,max:5,zero:0,ui:{label:"speed",control:"slider",category:"animation",enabledBy:{or:[{param:"type",in:[1,5,6]},{and:[{param:"animation",neq:0},{param:"type",notIn:[1,5,6]}]}]}}},fgColor:{type:"color",default:[1,1,1],uniform:"fgColor",ui:{label:"fg color",control:"color",category:"color"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"color"}}},paramAliases:{patternType:"type"},passes:[{name:"main",program:"pattern",inputs:{},outputs:{color:"outputTex"}}]});var o={pattern:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform int patternType;
uniform float scale;
uniform float thickness;
uniform float smoothness;
uniform float rotation;
uniform float skew;
uniform int animation;
uniform float speed;
uniform float time;
uniform vec3 fgColor;
uniform vec3 bgColor;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define SQRT3 1.7320508075688772

// Pattern type constants
#define CHECKERBOARD 0
#define CONCENTRIC_RINGS 1
#define DOTS 2
#define GRID 3
#define HEXAGONS 4
#define RADIAL_LINES 5
#define SPIRAL 6
#define STRIPES 7
#define TRIANGULAR_GRID 8
#define HEARTS 9
#define WAVES 10
#define ZIGZAG 11

// Rotate a 2D point
vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Stripes pattern
float stripes(vec2 p, float t) {
    float stripe = fract(p.x);
    // Apply smoothness to both edges of the stripe
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, stripe);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, stripe);
    return edge1 - edge2;
}

// Checkerboard pattern
float checkerboard(vec2 p, float sm) {
    vec2 f = fract(p);
    // Distance to nearest cell edge
    float d = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    // Determine which cell we're in
    vec2 cell = floor(p);
    float check = mod(cell.x + cell.y, 2.0);
    // Apply smoothness at edges
    float edge = smoothstep(0.0, sm * 0.5, d);
    return mix(1.0 - check, check, edge);
}

// Grid pattern (lines forming a grid)
float grid(vec2 p, float t) {
    vec2 f = fract(p);
    float lineX = smoothstep(t * 0.5 - smoothness, t * 0.5 + smoothness, abs(f.x - 0.5));
    float lineY = smoothstep(t * 0.5 - smoothness, t * 0.5 + smoothness, abs(f.y - 0.5));
    return 1.0 - min(lineX, lineY);
}

// Dots pattern (circles on a grid)
float dots(vec2 p, float t) {
    vec2 f = fract(p) - 0.5;
    float d = length(f);
    float radius = t * 0.5;
    return 1.0 - smoothstep(radius - smoothness, radius + smoothness, d);
}

// Hexagon distance function
float hexDist(vec2 p) {
    p = abs(p);
    return max(p.x * 0.5 + p.y * (SQRT3 / 2.0), p.x);
}

// Hexagons pattern
float hexagons(vec2 p, float t) {
    // Scale for hexagonal grid
    vec2 s = vec2(1.0, SQRT3);
    vec2 h = s * 0.5;
    
    // Two offset grids
    vec2 a = mod(p, s) - h;
    vec2 b = mod(p + h, s) - h;
    
    // Choose closest hexagon center
    vec2 g = length(a) < length(b) ? a : b;
    
    float d = hexDist(g);
    float edge = 0.5 * t;
    return smoothstep(edge + smoothness, edge - smoothness, d);
}

// Concentric rings pattern (timeOffset expands/contracts from center)
float concentricRings(vec2 p, float t, float timeOffset) {
    float d = fract(length(p) + timeOffset);
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, d);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, d);
    return edge1 - edge2;
}

// Radial lines pattern (timeOffset rotates around center)
float radialLines(vec2 p, float t, float timeOffset) {
    float lineCount = floor(scale);
    float angle = atan(p.y, p.x) + timeOffset * TAU;
    float d = fract(angle / TAU * lineCount);
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, d);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, d);
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

// Spiral pattern (timeOffset rotates arms)
float spiralPattern(vec2 p, float t, float timeOffset) {
    float dist = length(p);
    float angle = atan(p.y, p.x) + timeOffset * TAU;
    float d = fract(angle / TAU + dist);
    float edge1 = smoothstep(0.5 - t * 0.5 - smoothness, 0.5 - t * 0.5 + smoothness, d);
    float edge2 = smoothstep(0.5 + t * 0.5 - smoothness, 0.5 + t * 0.5 + smoothness, d);
    return edge1 - edge2;
}

// Heart SDF (based on Inigo Quilez)
float heartSDF(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0)
        return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(
        dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
        dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
    )) * sign(p.x - p.y);
}

// Hearts pattern (tiled heart shapes)
float hearts(vec2 p, float t) {
    vec2 cell = fract(p) - 0.5;
    cell.y += 0.25;
    float d = heartSDF(cell * 2.4);
    float radius = 0.15 - (t * 0.15);
    float sm = min(smoothness, radius + 0.15);
    return 1.0 - smoothstep(-radius - sm, -radius + sm, d);
}

// Waves pattern (sine-displaced horizontal lines)
float waves(vec2 p, float t) {
    float y = fract(p.y) - 0.5;
    y -= cos(p.x * TAU) * 0.15;
    float dist = abs(y);
    float halfW = t * 0.2;
    float sm = min(smoothness, halfW + 0.01);
    return 1.0 - smoothstep(halfW - sm, halfW + sm, dist);
}

// Zigzag pattern (V-shaped line per cell)
float zigzag(vec2 p, float t) {
    vec2 f = fract(p);
    // Zigzag line: y = 1 - 2*abs(x - 0.5), scaled to 0.25\u20130.75 range
    float lineY = 1.0 - 2.0 * abs(f.x - 0.5);
    float dist = abs(f.y - lineY * 0.5 - 0.25);
    // Max vertical distance to cell edge is 0.25; cap halfW + sm to stay within
    float halfW = t * 0.12;
    float sm = min(smoothness, max(0.24 - halfW, 0.005));
    return 1.0 - smoothstep(halfW - sm, halfW + sm, dist);
}

void main() {
    // Normalize coordinates
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;
    st = (st - 0.5) * 2.0;
    st.x *= aspect;
    
    // Apply rotation
    float rad = rotation * PI / 180.0;
    st = rotate2D(st, rad);
    
    // Apply animation rotation/pan (only for non-centered patterns)
    bool centered = patternType == CONCENTRIC_RINGS || patternType == RADIAL_LINES || patternType == SPIRAL;
    if (!centered && animation == 2) {
        st = rotate2D(st, time * TAU * floor(speed));
    }

    // Horizontal shear (screen-vertical axis), applied as the final transform
    st.x += st.y * skew;

    // Apply scale, mapping so lower scale = higher frequency
    vec2 p = st * (21.0 - scale);

    if (!centered && animation == 1) {
        // Checkerboard's spatial period along p.x is 2 (cell parity flips every unit),
        // so double the shift to keep the time=1 wrap landing on an even cell boundary.
        float panPeriod = (patternType == CHECKERBOARD) ? 2.0 : 1.0;
        p.x += time * -floor(speed) * panPeriod;
    }

    // Compute pattern value
    float m = 0.0;
    
    if (patternType == CHECKERBOARD) {
        m = checkerboard(p, smoothness);
    } else if (patternType == CONCENTRIC_RINGS) {
        m = concentricRings(p, thickness, -time * floor(speed));
    } else if (patternType == DOTS) {
        m = dots(p, thickness);
    } else if (patternType == GRID) {
        m = grid(p, thickness);
    } else if (patternType == HEXAGONS) {
        m = hexagons(p, thickness);
    } else if (patternType == RADIAL_LINES) {
        m = radialLines(p, thickness, time * floor(speed));
    } else if (patternType == SPIRAL) {
        m = spiralPattern(p, thickness, -time * floor(speed));
    } else if (patternType == STRIPES) {
        m = stripes(p, thickness);
    } else if (patternType == TRIANGULAR_GRID) {
        m = triangularGrid(p, thickness);
    } else if (patternType == HEARTS) {
        m = hearts(p, thickness);
    } else if (patternType == WAVES) {
        m = waves(p, thickness);
    } else if (patternType == ZIGZAG) {
        m = zigzag(p, thickness);
    }
    
    // Mix colors
    vec3 color = mix(bgColor, fgColor, m);
    
    fragColor = vec4(color, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
// Consolidated into a single Uniforms struct so the fragment stage holds
// 1 uniform buffer instead of 13 (the WebGPU per-stage limit is 12).
struct Uniforms {
    resolution: vec2<f32>,
    aspect: f32,
    patternType: i32,
    scale: f32,
    thickness: f32,
    smoothness: f32,
    rotation: f32,
    animation: i32,
    speed: f32,
    time: f32,
    skew: f32,
    fgColor: vec3<f32>,
    bgColor: vec3<f32>,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const SQRT3: f32 = 1.7320508075688772;

// Pattern type constants
const CHECKERBOARD: i32 = 0;
const CONCENTRIC_RINGS: i32 = 1;
const DOTS: i32 = 2;
const GRID: i32 = 3;
const HEXAGONS: i32 = 4;
const RADIAL_LINES: i32 = 5;
const SPIRAL_PATTERN: i32 = 6;
const STRIPES: i32 = 7;
const TRIANGULAR_GRID: i32 = 8;
const HEARTS: i32 = 9;
const WAVES: i32 = 10;
const ZIGZAG: i32 = 11;
const TAU: f32 = 6.28318530718;

// Rotate a 2D point
fn rotate2D(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Stripes pattern
fn stripes(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let stripe = fract(p.x);
    // Apply smoothness to both edges of the stripe
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, stripe);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, stripe);
    return edge1 - edge2;
}

// Checkerboard pattern
fn checkerboard(p: vec2<f32>, sm: f32) -> f32 {
    let f = fract(p);
    // Distance to nearest cell edge
    let d = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    // Determine which cell we're in
    let cell = floor(p);
    let check = ((cell.x + cell.y) % 2.0 + 2.0) % 2.0;
    // Apply smoothness at edges
    let edge = smoothstep(0.0, sm * 0.5, d);
    return mix(1.0 - check, check, edge);
}

// Grid pattern (lines forming a grid)
fn grid(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let f = fract(p);
    let lineX = smoothstep(t * 0.5 - sm, t * 0.5 + sm, abs(f.x - 0.5));
    let lineY = smoothstep(t * 0.5 - sm, t * 0.5 + sm, abs(f.y - 0.5));
    return 1.0 - min(lineX, lineY);
}

// Dots pattern (circles on a grid)
fn dots(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let f = fract(p) - vec2<f32>(0.5, 0.5);
    let d = length(f);
    let radius = t * 0.5;
    return 1.0 - smoothstep(radius - sm, radius + sm, d);
}

// Hexagon distance function
fn hexDist(p: vec2<f32>) -> f32 {
    let ap = abs(p);
    return max(ap.x * 0.5 + ap.y * (SQRT3 / 2.0), ap.x);
}

// Hexagons pattern
fn hexagons(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    // Scale for hexagonal grid
    let s = vec2<f32>(1.0, SQRT3);
    let h = s * 0.5;
    
    // Two offset grids
    let a = ((p % s) + s) % s - h;
    let b = (((p + h) % s) + s) % s - h;
    
    // Choose closest hexagon center
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

// Concentric rings pattern (timeOffset expands/contracts from center)
fn concentricRings(p: vec2<f32>, t: f32, sm: f32, timeOffset: f32) -> f32 {
    let d = fract(length(p) + timeOffset);
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, d);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, d);
    return edge1 - edge2;
}

// Radial lines pattern (timeOffset rotates around center)
fn radialLines(p: vec2<f32>, t: f32, sm: f32, timeOffset: f32) -> f32 {
    let lineCount = floor(u.scale);
    let angle = atan2(p.y, p.x) + timeOffset * TAU;
    let d = fract(angle / TAU * lineCount);
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, d);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, d);
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

// Spiral pattern (timeOffset rotates arms)
fn spiralPattern(p: vec2<f32>, t: f32, sm: f32, timeOffset: f32) -> f32 {
    let dist = length(p);
    let angle = atan2(p.y, p.x) + timeOffset * TAU;
    let d = fract(angle / TAU + dist);
    let edge1 = smoothstep(0.5 - t * 0.5 - sm, 0.5 - t * 0.5 + sm, d);
    let edge2 = smoothstep(0.5 + t * 0.5 - sm, 0.5 + t * 0.5 + sm, d);
    return edge1 - edge2;
}

// Heart SDF (based on Inigo Quilez)
fn heartSDF(p_in: vec2<f32>) -> f32 {
    var p = vec2<f32>(abs(p_in.x), p_in.y);
    if (p.y + p.x > 1.0) {
        let d = p - vec2<f32>(0.25, 0.75);
        return sqrt(dot(d, d)) - sqrt(2.0) / 4.0;
    }
    let d1 = p - vec2<f32>(0.0, 1.0);
    let proj = 0.5 * max(p.x + p.y, 0.0);
    let d2 = p - proj;
    return sqrt(min(dot(d1, d1), dot(d2, d2))) * sign(p.x - p.y);
}

// Hearts pattern (tiled heart shapes)
fn hearts(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    var cell = fract(p) - 0.5;
    cell.y += 0.25;
    let d = heartSDF(cell * 2.4);
    let radius = 0.15 - (t * 0.15);
    let s = min(sm, radius + 0.15);
    return 1.0 - smoothstep(-radius - s, -radius + s, d);
}

// Waves pattern (sine-displaced horizontal lines)
fn waves(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    var y = fract(p.y) - 0.5;
    y -= cos(p.x * TAU) * 0.15;
    let dist = abs(y);
    let halfW = t * 0.2;
    let s = min(sm, halfW + 0.01);
    return 1.0 - smoothstep(halfW - s, halfW + s, dist);
}

// Zigzag pattern (V-shaped line per cell)
fn zigzag(p: vec2<f32>, t: f32, sm: f32) -> f32 {
    let f = fract(p);
    // Zigzag line: y = 1 - 2*abs(x - 0.5), scaled to 0.25\u20130.75 range
    let lineY = 1.0 - 2.0 * abs(f.x - 0.5);
    let dist = abs(f.y - lineY * 0.5 - 0.25);
    // Max vertical distance to cell edge is 0.25; cap halfW + sm to stay within
    let halfW = t * 0.12;
    let s = min(sm, max(0.24 - halfW, 0.005));
    return 1.0 - smoothstep(halfW - s, halfW + s, dist);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    // Normalize coordinates
    var st = position.xy / u.resolution;
    st = (st - vec2<f32>(0.5, 0.5)) * 2.0;
    st.x = st.x * u.aspect;

    // Apply rotation
    let rad = u.rotation * PI / 180.0;
    st = rotate2D(st, rad);

    // Apply animation rotation/pan (only for non-centered patterns)
    let centered = u.patternType == CONCENTRIC_RINGS || u.patternType == RADIAL_LINES || u.patternType == SPIRAL_PATTERN;
    if (!centered && u.animation == 2) {
        st = rotate2D(st, u.time * TAU * floor(u.speed));
    }

    // Horizontal shear (screen-vertical axis), applied as the final transform
    st.x = st.x + st.y * u.skew;

    // Apply scale, mapping so lower scale = higher frequency
    var p = st * (21.0 - u.scale);

    if (!centered && u.animation == 1) {
        // Checkerboard's spatial period along p.x is 2 (cell parity flips every unit),
        // so double the shift to keep the time=1 wrap landing on an even cell boundary.
        let panPeriod = select(1.0, 2.0, u.patternType == CHECKERBOARD);
        p.x += u.time * -floor(u.speed) * panPeriod;
    }

    // Compute pattern value
    var m: f32 = 0.0;

    if (u.patternType == CHECKERBOARD) {
        m = checkerboard(p, u.smoothness);
    } else if (u.patternType == CONCENTRIC_RINGS) {
        m = concentricRings(p, u.thickness, u.smoothness, -u.time * floor(u.speed));
    } else if (u.patternType == DOTS) {
        m = dots(p, u.thickness, u.smoothness);
    } else if (u.patternType == GRID) {
        m = grid(p, u.thickness, u.smoothness);
    } else if (u.patternType == HEXAGONS) {
        m = hexagons(p, u.thickness, u.smoothness);
    } else if (u.patternType == RADIAL_LINES) {
        m = radialLines(p, u.thickness, u.smoothness, u.time * floor(u.speed));
    } else if (u.patternType == SPIRAL_PATTERN) {
        m = spiralPattern(p, u.thickness, u.smoothness, -u.time * floor(u.speed));
    } else if (u.patternType == STRIPES) {
        m = stripes(p, u.thickness, u.smoothness);
    } else if (u.patternType == TRIANGULAR_GRID) {
        m = triangularGrid(p, u.thickness, u.smoothness);
    } else if (u.patternType == HEARTS) {
        m = hearts(p, u.thickness, u.smoothness);
    } else if (u.patternType == WAVES) {
        m = waves(p, u.thickness, u.smoothness);
    } else if (u.patternType == ZIGZAG) {
        m = zigzag(p, u.thickness, u.smoothness);
    }

    // Mix colors
    let color = mix(u.bgColor, u.fgColor, m);

    return vec4<f32>(color, 1.0);
}
`}},a=`# pattern

Geometric pattern generator

## Description

Generates various geometric patterns including stripes, checkerboard, grid, dots, hexagons, triangles, concentric rings, radial lines, spirals, hearts, waves, and zigzags. Useful for creating backgrounds, textures, and masks with clean geometric shapes. The skew parameter applies a horizontal shear to all pattern types, slanting the result. Supports animation with seamless looping.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | stripes | checkerboard/concentricRings/dots/grid/hearts/hexagons/radialLines/spiral/stripes/triangularGrid/waves/zigzag | Pattern type |
| scale | float | 15 | 1-20 | Scale/size of pattern elements |
| thickness | float | 0.5 | 0-1 | Line/shape thickness |
| smoothness | float | 0.02 | 0-1 | Edge softness (0=sharp, 1=soft) |
| rotation | float | 0 | -180-180 | Rotation angle in degrees |
| skew | float | 0 | -2-2 | Horizontal shear factor (slope); 1 ~= 45 degree lean |
| animation | int | none | none/pan/rotate | Animation mode |
| speed | int | 1 | -5-5 | Animation speed and direction |
| fgColor | color | 1,1,1 | - | Foreground color |
| bgColor | color | 0,0,0 | - | Background color |

## Pattern Types

- **Checkerboard (0)**: Classic alternating square pattern
- **Concentric Rings (1)**: Rings emanating from center, thickness controls ring width
- **Dots (2)**: Regular grid of circles
- **Grid (3)**: Intersecting lines forming a grid
- **Hexagons (4)**: Honeycomb hexagonal tiling
- **Radial Lines (5)**: Lines radiating outward from center, thickness controls line count
- **Spiral (6)**: Archimedean spiral, thickness controls arm width
- **Stripes (7)**: Vertical stripes, use rotation for other orientations
- **Triangular Grid (8)**: Equilateral triangle tiling, thickness controls fill
- **Hearts (9)**: Tiled heart shapes
- **Waves (10)**: Sine-displaced horizontal lines
- **Zigzag (11)**: V-shaped zigzag lines

## Animation

All animation modes loop seamlessly. Speed controls both rate and direction (negative = reverse). Pan moves along the pattern's own X axis; use the rotation parameter to pan in any other direction while still looping cleanly.

## Usage

\`\`\`
search synth

pattern()
  .write(o0)

render(o0)
\`\`\`

### Examples

\`\`\`
// Diagonal stripes
pattern({ patternType: 0, rotation: 45, scale: 10 })
  .write(o0)

// Polka dots
pattern({ patternType: 2, scale: 8, thickness: 0.6 })
  .write(o0)

// Honeycomb
pattern({ patternType: 4, scale: 6, fgColor: [1, 0.8, 0], bgColor: [0.2, 0.1, 0] })
  .write(o0)

// Animated hearts
pattern({ patternType: 9, scale: 12, animation: 1, speed: 2, fgColor: [1, 0.2, 0.3] })
  .write(o0)
\`\`\`

## Usage

\`\`\`
search synth

pattern()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[s,e]of Object.entries(o))n.shaders[s]={...e}}n&&a&&(n.help=a);var f="synth/pattern",c="synth",d="pattern",m=n;export{m as default,f as effectId,d as effectName,a as help,c as namespace};
