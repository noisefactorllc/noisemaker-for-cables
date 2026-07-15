/* synth3d/shape3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Shape3D",namespace:"synth3d",func:"shape3d",tags:["3d","geometric"],description:"3D polyhedral shape generator",textures:{volumeCache:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}},loopAOffset:{type:"int",default:40,uniform:"loopAOffset",choices:{"Platonic Solids:":null,tetrahedron:10,cube:20,octahedron:30,dodecahedron:40,icosahedron:50,"Other Primitives:":null,sphere:100,torus:110,cylinder:120,cone:130,capsule:140},ui:{label:"loop a",control:"dropdown"}},loopBOffset:{type:"int",default:30,uniform:"loopBOffset",choices:{"Platonic Solids:":null,tetrahedron:10,cube:20,octahedron:30,dodecahedron:40,icosahedron:50,"Other Primitives:":null,sphere:100,torus:110,cylinder:120,cone:130,capsule:140},ui:{label:"loop b",control:"dropdown"}},loopAScale:{type:"float",default:1,uniform:"loopAScale",min:1,max:100,ui:{label:"a scale",control:"slider"}},loopBScale:{type:"float",default:1,uniform:"loopBScale",min:1,max:100,ui:{label:"b scale",control:"slider"}},speedA:{type:"int",default:1,uniform:"speedA",min:-5,max:5,zero:0,ui:{label:"speed a",control:"slider"}},speedB:{type:"int",default:1,uniform:"speedB",min:-5,max:5,zero:0,ui:{label:"speed b",control:"slider"}}},defaultProgram:`search synth3d, filter3d, render

shape3d(speedA: -2, speedB: 2)
.render3d(threshold: 0.75)
.write(o0)`,passes:[{name:"precompute",program:"precompute",drawBuffers:2,viewport:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096}},inputs:{},outputs:{color:"volumeCache",geoOut:"geoBuffer"}}],outputTex3d:"volumeCache",outputGeo:"geoBuffer"});var a={precompute:{glsl:`/*
 * Precompute shader for nu/shape3d
 * Fills a 64x4096 2D atlas representing a 64^3 3D volume
 * Each texel stores the shape offset value for that 3D position
 * Atlas layout: pixel (x, y) maps to 3D coord (x, y % 64, floor(y / 64))
 */

#version 300 es
precision highp float;

uniform int loopAOffset;
uniform int loopBOffset;
uniform float loopAScale;
uniform float loopBScale;
uniform float speedA;
uniform float speedB;
uniform float time;
uniform int volumeSize;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;

// MRT outputs: volume cache and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float periodicFunction(float p) {
    float x = TAU * p;
    return map(sin(x), -1.0, 1.0, 0.0, 1.0);
}

// ============================================
// 3D Polyhedral SDF Functions
// Based on Inigo Quilez's SDF library
// ============================================

// Tetrahedron (4 faces, 4 vertices)
float tetrahedronSDF(vec3 p) {
    float s = 0.5;
    return (max(abs(p.x + p.y) - p.z, abs(p.x - p.y) + p.z) - s) / sqrt(3.0);
}

// Cube / Hexahedron (6 faces, 8 vertices)
float cubeSDF(vec3 p) {
    vec3 d = abs(p) - vec3(0.45);
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Octahedron (8 faces, 6 vertices)
float octahedronSDF(vec3 p) {
    p = abs(p);
    float s = 0.5;
    return (p.x + p.y + p.z - s) * 0.57735027;
}

// Dodecahedron (12 pentagonal faces, 20 vertices)
// Uses the golden ratio for face normals
float dodecahedronSDF(vec3 p) {
    p = abs(p);
    float phi = (1.0 + sqrt(5.0)) * 0.5;  // Golden ratio
    
    // Face normals use golden ratio
    vec3 n1 = normalize(vec3(1.0, phi, 0.0));
    vec3 n2 = normalize(vec3(0.0, 1.0, phi));
    vec3 n3 = normalize(vec3(phi, 0.0, 1.0));
    
    float d = 0.0;
    d = max(d, dot(p, n1));
    d = max(d, dot(p, n2));
    d = max(d, dot(p, n3));
    d = max(d, p.x);
    d = max(d, p.y);
    d = max(d, p.z);
    
    return d - 0.45;
}

// Icosahedron (20 triangular faces, 12 vertices)
// Dual of dodecahedron, also uses golden ratio
float icosahedronSDF(vec3 p) {
    p = abs(p);
    float phi = (1.0 + sqrt(5.0)) * 0.5;
    
    // Vertex directions use golden ratio
    vec3 n1 = normalize(vec3(phi, 1.0, 0.0));
    vec3 n2 = normalize(vec3(1.0, 0.0, phi));
    vec3 n3 = normalize(vec3(0.0, phi, 1.0));
    
    // All 10 face normal directions (20 faces = 10 pairs)
    float d = 0.0;
    d = max(d, dot(p, n1));
    d = max(d, dot(p, n2));
    d = max(d, dot(p, n3));
    d = max(d, dot(p, normalize(vec3(1.0, 1.0, 1.0))));
    
    return d - 0.42;
}

// ============================================
// Other 3D Primitive SDFs
// ============================================

// Sphere
float sphereSDF(vec3 p) {
    return length(p) - 0.5;
}

// Torus
float torusSDF(vec3 p) {
    vec2 t = vec2(0.35, 0.12);
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Cylinder
float cylinderSDF(vec3 p) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(0.35, 0.45);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Cone
float coneSDF(vec3 p) {
    float h = 0.6;
    float r = 0.4;
    vec2 c = normalize(vec2(h, r));
    float q = length(p.xz);
    return max(dot(c.xy, vec2(q, p.y)), -p.y - h * 0.5);
}

// Capsule (vertical)
float capsuleSDF(vec3 p) {
    float h = 0.3;
    float r = 0.25;
    p.y -= clamp(p.y, -h, h);
    return length(p) - r;
}

// Get SDF value for shape type
// Returns distance from surface (negative = inside)
float shapeSDF(vec3 p, int shapeType) {
    // Platonic Solids
    if (shapeType == 10) return tetrahedronSDF(p);
    if (shapeType == 20) return cubeSDF(p);
    if (shapeType == 30) return octahedronSDF(p);
    if (shapeType == 40) return dodecahedronSDF(p);
    if (shapeType == 50) return icosahedronSDF(p);
    
    // Other Primitives
    if (shapeType == 100) return sphereSDF(p);
    if (shapeType == 110) return torusSDF(p);
    if (shapeType == 120) return cylinderSDF(p);
    if (shapeType == 130) return coneSDF(p);
    if (shapeType == 140) return capsuleSDF(p);
    
    // Default to sphere
    return sphereSDF(p);
}

// Get SDF-based offset for a position
// p is in [0, 1]^3 normalized volume coordinates
float offset3D(vec3 p, float freq, int loopOffset) {
    // Center at origin: [0,1] -> [-0.5, 0.5]
    vec3 cp = p - 0.5;

    // SDF is negative inside, positive outside
    // Convert to offset: invert and scale by freq for periodic shells
    float sdf = shapeSDF(cp, loopOffset);
    return (0.5 - sdf) * freq;
}

// Compute full output value for a position (for gradient computation)
float computeValue(vec3 p, float lf1, float lf2) {
    float offset1 = offset3D(p, lf1, loopAOffset);
    float offset2 = offset3D(p, lf2, loopBOffset);

    // Drive periodic function from SDF offset + time * speed
    // Speed is integer so time (0-1 loop) stays seamless
    float t1 = offset1 + time * floor(speedA);
    float t2 = offset2 + time * floor(speedB);

    float a = periodicFunction(t1);
    float b = periodicFunction(t2);

    return (a + b) * 0.5;
}

void main() {
    // Convert 2D fragment position to 3D volume coordinates using tile-local coordinates
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    int x = int(gl_FragCoord.x);
    int yAtlas = int(gl_FragCoord.y);
    int y = yAtlas % volSize;
    int z = yAtlas / volSize;
    
    // Normalize to [0, 1]
    vec3 p = vec3(float(x), float(y), float(z)) / (volSizeF - 1.0);
    
    // Calculate frequencies from scale parameters
    float lf1 = map(loopAScale, 1.0, 100.0, 6.0, 1.0);
    float lf2 = map(loopBScale, 1.0, 100.0, 6.0, 1.0);

    // Compute value at this position
    float d = computeValue(p, lf1, lf2);

    // Compute analytical gradient using finite differences
    float eps = 1.0 / volSizeF;
    float dx = computeValue(p + vec3(eps, 0.0, 0.0), lf1, lf2);
    float dy = computeValue(p + vec3(0.0, eps, 0.0), lf1, lf2);
    float dz = computeValue(p + vec3(0.0, 0.0, eps), lf1, lf2);
    
    vec3 gradient = vec3(dx - d, dy - d, dz - d) / eps;
    vec3 normal = normalize(-gradient + vec3(1e-6));
    
    fragColor = vec4(d, d, d, 1.0);
    geoOut = vec4(normal * 0.5 + 0.5, d);
}`,wgsl:`/*
 * Precompute shader for nu/shape3d (WGSL)
 * Fills a 64x4096 2D atlas representing a 64^3 3D volume
 * Each texel stores the shape offset value for that 3D position
 * Atlas layout: pixel (x, y) maps to 3D coord (x, y % 64, floor(y / 64))
 */

@group(0) @binding(0) var<uniform> loopAOffset: i32;
@group(0) @binding(1) var<uniform> loopBOffset: i32;
@group(0) @binding(2) var<uniform> loopAScale: f32;
@group(0) @binding(3) var<uniform> loopBScale: f32;
@group(0) @binding(4) var<uniform> speedA: f32;
@group(0) @binding(5) var<uniform> speedB: f32;
@group(0) @binding(6) var<uniform> time: f32;
@group(0) @binding(7) var<uniform> volumeSize: i32;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn map_range(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn periodicFunction(p: f32) -> f32 {
    let x = TAU * p;
    return map_range(sin(x), -1.0, 1.0, 0.0, 1.0);
}

// ============================================
// 3D Polyhedral SDF Functions
// ============================================

// Tetrahedron (4 faces, 4 vertices)
fn tetrahedronSDF(p: vec3<f32>) -> f32 {
    let s = 0.5;
    return (max(abs(p.x + p.y) - p.z, abs(p.x - p.y) + p.z) - s) / sqrt(3.0);
}

// Cube / Hexahedron (6 faces, 8 vertices)
fn cubeSDF(p: vec3<f32>) -> f32 {
    let d = abs(p) - vec3<f32>(0.45);
    return length(max(d, vec3<f32>(0.0))) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Octahedron (8 faces, 6 vertices)
fn octahedronSDF(p: vec3<f32>) -> f32 {
    let ap = abs(p);
    let s = 0.5;
    return (ap.x + ap.y + ap.z - s) * 0.57735027;
}

// Dodecahedron (12 pentagonal faces, 20 vertices)
fn dodecahedronSDF(p: vec3<f32>) -> f32 {
    let ap = abs(p);
    let phi = (1.0 + sqrt(5.0)) * 0.5;  // Golden ratio
    
    let n1 = normalize(vec3<f32>(1.0, phi, 0.0));
    let n2 = normalize(vec3<f32>(0.0, 1.0, phi));
    let n3 = normalize(vec3<f32>(phi, 0.0, 1.0));
    
    var d = 0.0;
    d = max(d, dot(ap, n1));
    d = max(d, dot(ap, n2));
    d = max(d, dot(ap, n3));
    d = max(d, ap.x);
    d = max(d, ap.y);
    d = max(d, ap.z);
    
    return d - 0.45;
}

// Icosahedron (20 triangular faces, 12 vertices)
fn icosahedronSDF(p: vec3<f32>) -> f32 {
    let ap = abs(p);
    let phi = (1.0 + sqrt(5.0)) * 0.5;
    
    let n1 = normalize(vec3<f32>(phi, 1.0, 0.0));
    let n2 = normalize(vec3<f32>(1.0, 0.0, phi));
    let n3 = normalize(vec3<f32>(0.0, phi, 1.0));
    
    var d = 0.0;
    d = max(d, dot(ap, n1));
    d = max(d, dot(ap, n2));
    d = max(d, dot(ap, n3));
    d = max(d, dot(ap, normalize(vec3<f32>(1.0, 1.0, 1.0))));
    
    return d - 0.42;
}

// ============================================
// Other 3D Primitive SDFs
// ============================================

fn sphereSDF(p: vec3<f32>) -> f32 {
    return length(p) - 0.5;
}

fn torusSDF(p: vec3<f32>) -> f32 {
    let t = vec2<f32>(0.35, 0.12);
    let q = vec2<f32>(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

fn cylinderSDF(p: vec3<f32>) -> f32 {
    let d = abs(vec2<f32>(length(p.xz), p.y)) - vec2<f32>(0.35, 0.45);
    return min(max(d.x, d.y), 0.0) + length(max(d, vec2<f32>(0.0)));
}

fn coneSDF(p: vec3<f32>) -> f32 {
    let h = 0.6;
    let r = 0.4;
    let c = normalize(vec2<f32>(h, r));
    let q = length(p.xz);
    return max(dot(c.xy, vec2<f32>(q, p.y)), -p.y - h * 0.5);
}

fn capsuleSDF(p: vec3<f32>) -> f32 {
    let h = 0.3;
    let r = 0.25;
    var pp = p;
    pp.y = pp.y - clamp(pp.y, -h, h);
    return length(pp) - r;
}

// Get SDF value for shape type
fn shapeSDF(p: vec3<f32>, shapeType: i32) -> f32 {
    // Platonic Solids
    if (shapeType == 10) { return tetrahedronSDF(p); }
    if (shapeType == 20) { return cubeSDF(p); }
    if (shapeType == 30) { return octahedronSDF(p); }
    if (shapeType == 40) { return dodecahedronSDF(p); }
    if (shapeType == 50) { return icosahedronSDF(p); }
    
    // Other Primitives
    if (shapeType == 100) { return sphereSDF(p); }
    if (shapeType == 110) { return torusSDF(p); }
    if (shapeType == 120) { return cylinderSDF(p); }
    if (shapeType == 130) { return coneSDF(p); }
    if (shapeType == 140) { return capsuleSDF(p); }
    
    return sphereSDF(p);
}

// Get SDF-based offset for a position
fn offset3D(p: vec3<f32>, freq: f32, loopOffset: i32) -> f32 {
    // Center at origin: [0,1] -> [-0.5, 0.5]
    let cp = p - vec3<f32>(0.5);

    // SDF is negative inside, positive outside
    // Convert to offset: invert and scale by freq for periodic shells
    let sdf = shapeSDF(cp, loopOffset);
    return (0.5 - sdf) * freq;
}

// Compute full output value for a position (for gradient computation)
fn computeValue(p: vec3<f32>, lf1: f32, lf2: f32) -> f32 {
    let offset1 = offset3D(p, lf1, loopAOffset);
    let offset2 = offset3D(p, lf2, loopBOffset);

    // Drive periodic function from SDF offset + time * speed
    // Speed is integer so time (0-1 loop) stays seamless
    let t1 = offset1 + time * floor(speedA);
    let t2 = offset2 + time * floor(speedB);

    let a = periodicFunction(t1);
    let b = periodicFunction(t2);

    return (a + b) * 0.5;
}

// MRT output structure for volume cache and geometry buffer
struct FragOutput {
    @location(0) color: vec4<f32>,
    @location(1) geoOut: vec4<f32>,
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> FragOutput {
    // Convert 2D fragment position to 3D volume coordinates
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    let x = i32(position.x);
    let yAtlas = i32(position.y);
    let y = yAtlas % volSize;
    let z = yAtlas / volSize;
    
    // Normalize to [0, 1]
    let p = vec3<f32>(f32(x), f32(y), f32(z)) / (volSizeF - 1.0);
    
    // Calculate frequencies from scale parameters
    let lf1 = map_range(loopAScale, 1.0, 100.0, 6.0, 1.0);
    let lf2 = map_range(loopBScale, 1.0, 100.0, 6.0, 1.0);

    // Compute value at this position
    let d = computeValue(p, lf1, lf2);

    // Compute analytical gradient using finite differences
    let eps = 1.0 / volSizeF;
    let dx = computeValue(p + vec3<f32>(eps, 0.0, 0.0), lf1, lf2);
    let dy = computeValue(p + vec3<f32>(0.0, eps, 0.0), lf1, lf2);
    let dz = computeValue(p + vec3<f32>(0.0, 0.0, eps), lf1, lf2);
    
    let gradient = vec3<f32>(dx - d, dy - d, dz - d) / eps;
    let normal = normalize(-gradient + vec3<f32>(0.000001));
    
    let color = vec4<f32>(d, d, d, 1.0);
    let geoOut = vec4<f32>(normal * 0.5 + 0.5, d);
    
    return FragOutput(color, geoOut);
}
`}},r=`# shape3d

3D polyhedral shape generator

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x64 | x16/x32/x64/x128 | Volume size |
| colorMode | int | mono | mono/rgb | Color mode |
| loopAOffset | int | dodecahedron | Platonic Solids:/tetrahedron/cube/octahedron/dodecahedron/icosahedron/Other Primitives:/sphere/torus/cylinder/cone/capsule | Loop a |
| loopBOffset | int | octahedron | Platonic Solids:/tetrahedron/cube/octahedron/dodecahedron/icosahedron/Other Primitives:/sphere/torus/cylinder/cone/capsule | Loop b |
| loopAScale | float | 1 | 1-100 | A scale |
| loopBScale | float | 1 | 1-100 | B scale |
| speedA | int | 1 | -5-5 | Animation speed a |
| speedB | int | 1 | -5-5 | Animation speed b |

## Usage

\`\`\`
search synth3d, filter3d, render

shape3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(a))n.shaders[o]={...e}}n&&r&&(n.help=r);var f="synth3d/shape3d",d="synth3d",c="shape3d",u=n;export{u as default,f as effectId,c as effectName,r as help,d as namespace};
