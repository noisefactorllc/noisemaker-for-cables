/* mixer/cellSplit */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"CellSplit",namespace:"mixer",func:"cellSplit",tags:["blend","noise"],description:"Split between inputs using Voronoi cell regions",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},invert:{type:"int",default:0,uniform:"invert",choices:{sourceA:0,sourceB:1},ui:{label:"edge source",control:"dropdown"}},mode:{type:"int",default:0,uniform:"mode",choices:{edges:0,split:1},ui:{label:"mode",control:"dropdown"}},scale:{type:"float",default:15,uniform:"scale",min:1,max:30,ui:{label:"scale",control:"slider"}},edgeWidth:{type:"float",default:.08,uniform:"edgeWidth",min:0,max:.2,ui:{label:"edge width",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}}},defaultProgram:`search mixer, synth

solid(color: #000000)
.write(o0)

noise()
.cellSplit(invert: sourceB)
.write(o1)
`,passes:[{name:"render",program:"cellSplit",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var s={cellSplit:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mode;
uniform float scale;
uniform float edgeWidth;
uniform int seed;
uniform int invert;
uniform float time;
uniform float speed;

out vec4 fragColor;

const float TAU = 6.28318530718;

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

vec3 prng(vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 colorA = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 colorB = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    // Aspect-correct, scaled coordinates using full image dimensions
    // so Voronoi cells are consistent across tiles
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float aspect = fullRes.x / fullRes.y;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec2 p = globalUV * (31.0 - scale);
    p.x *= aspect;

    float spd = floor(speed);
    vec2 cellCoord = floor(p);
    vec2 cellFract = fract(p);

    // Pass 1: find nearest cell center
    float d1 = 1e10;
    vec2 nearestPoint = vec2(0.0);
    vec2 nearestCell = vec2(0.0);
    float nearestHash = 0.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cellId = cellCoord + neighbor;
            vec3 rnd = prng(vec3(cellId, float(seed)));
            vec2 wobble = sin(TAU * time * spd + rnd.xy * TAU) * 0.15 * min(spd, 1.0);
            vec2 point = neighbor + rnd.xy + wobble - cellFract;
            float dist = dot(point, point);

            if (dist < d1) {
                d1 = dist;
                nearestPoint = point;
                nearestCell = cellId;
                nearestHash = rnd.z;
            }
        }
    }

    // Pass 2: find minimum perpendicular distance to any Voronoi edge
    // (bisector between nearest center and each neighbor center)
    float edgeDist = 1e10;
    for (int y = -2; y <= 2; y++) {
        for (int x = -2; x <= 2; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cellId = cellCoord + neighbor;
            if (cellId == nearestCell) continue;
            vec3 rnd = prng(vec3(cellId, float(seed)));
            vec2 wobble = sin(TAU * time * spd + rnd.xy * TAU) * 0.15 * min(spd, 1.0);
            vec2 point = neighbor + rnd.xy + wobble - cellFract;
            // Perpendicular distance to bisector between nearest and this neighbor
            vec2 mid = (nearestPoint + point) * 0.5;
            vec2 edge = normalize(point - nearestPoint);
            float d = abs(dot(mid, edge));
            edgeDist = min(edgeDist, d);
        }
    }

    float onEdge = edgeWidth > 0.0 ? step(edgeDist, edgeWidth) : 0.0;

    float mask;
    if (mode == 0) {
        // Edges mode: cells show A, edges show B
        mask = onEdge;
    } else {
        // Split mode: cells randomly assigned to A or B, edges show 50/50
        float cellChoice = step(0.5, nearestHash);
        if (invert == 1) {
            cellChoice = 1.0 - cellChoice;
        }
        mask = mix(cellChoice, 0.5, onEdge);
    }

    // Apply invert (in edges mode, swaps cells/edges assignment)
    if (mode == 0 && invert == 1) {
        mask = 1.0 - mask;
    }

    vec4 color = mix(colorA, colorB, mask);
    color.a = max(colorA.a, colorB.a);

    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> mode : i32;
@group(0) @binding(4) var<uniform> scale : f32;
@group(0) @binding(5) var<uniform> edgeWidth : f32;
@group(0) @binding(6) var<uniform> seed : i32;
@group(0) @binding(7) var<uniform> invert : i32;
@group(0) @binding(8) var<uniform> time : f32;
@group(0) @binding(9) var<uniform> speed : f32;
@group(0) @binding(10) var<uniform> tileOffset : vec2<f32>;
@group(0) @binding(11) var<uniform> fullResolution : vec2<f32>;

const TAU: f32 = 6.28318530718;

// PCG PRNG - MIT License
// https://github.com/riccardoscalco/glsl-pcg-prng
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

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = position.xy / dims;

    let colorA = textureSample(inputTex, samp, st);
    let colorB = textureSample(tex, samp, st);

    // Aspect-correct, scaled coordinates using full image dimensions
    // so Voronoi cells are consistent across tiles
    let aspect = fullResolution.x / fullResolution.y;
    let globalUV = (position.xy + tileOffset) / fullResolution;
    var p = globalUV * (31.0 - scale);
    p.x = p.x * aspect;

    let spd = floor(speed);
    let cellCoord = floor(p);
    let cellFract = fract(p);

    // Pass 1: find nearest cell center
    var d1: f32 = 1e10;
    var nearestPoint: vec2<f32> = vec2<f32>(0.0);
    var nearestCell: vec2<f32> = vec2<f32>(0.0);
    var nearestHash: f32 = 0.0;

    for (var y: i32 = -1; y <= 1; y = y + 1) {
        for (var x: i32 = -1; x <= 1; x = x + 1) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let cellId = cellCoord + neighbor;
            let rnd = prng(vec3<f32>(cellId, f32(seed)));
            let wobble = sin(TAU * time * spd + rnd.xy * TAU) * 0.15 * min(spd, 1.0);
            let point = neighbor + rnd.xy + wobble - cellFract;
            let dist = dot(point, point);

            if (dist < d1) {
                d1 = dist;
                nearestPoint = point;
                nearestCell = cellId;
                nearestHash = rnd.z;
            }
        }
    }

    // Pass 2: find minimum perpendicular distance to any Voronoi edge
    // (bisector between nearest center and each neighbor center)
    var edgeDistVal: f32 = 1e10;
    for (var y: i32 = -2; y <= 2; y = y + 1) {
        for (var x: i32 = -2; x <= 2; x = x + 1) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let cellId = cellCoord + neighbor;
            if (all(cellId == nearestCell)) { continue; }
            let rnd = prng(vec3<f32>(cellId, f32(seed)));
            let wobble = sin(TAU * time * spd + rnd.xy * TAU) * 0.15 * min(spd, 1.0);
            let point = neighbor + rnd.xy + wobble - cellFract;
            // Perpendicular distance to bisector between nearest and this neighbor
            let mid = (nearestPoint + point) * 0.5;
            let edge = normalize(point - nearestPoint);
            let d = abs(dot(mid, edge));
            edgeDistVal = min(edgeDistVal, d);
        }
    }

    var onEdge: f32;
    if (edgeWidth > 0.0) {
        onEdge = step(edgeDistVal, edgeWidth);
    } else {
        onEdge = 0.0;
    }

    var mask: f32;
    if (mode == 0) {
        // Edges mode: cells show A, edges show B
        mask = onEdge;
    } else {
        // Split mode: cells randomly assigned to A or B, edges show 50/50
        var cellChoice = step(0.5, nearestHash);
        if (invert == 1) {
            cellChoice = 1.0 - cellChoice;
        }
        mask = mix(cellChoice, 0.5, onEdge);
    }

    // Apply invert (in edges mode, swaps cells/edges assignment)
    if (mode == 0 && invert == 1) {
        mask = 1.0 - mask;
    }

    var color = mix(colorA, colorB, mask);
    color.a = max(colorA.a, colorB.a);

    return color;
}
`}},i=`# cellSplit

Split between inputs using Voronoi cell regions

## Description

Generates a Voronoi diagram and randomly assigns each cell to show either source A or source B. Creates an organic, stained-glass-like split between two inputs. Uses PCG hashing for deterministic, cross-platform results.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mode | int | edges | edges/split | Edges uses cells for A and edges for B. Split assigns cells randomly to A/B  |
| scale | float | 15 | 1-30 | Number of cells (higher = more, smaller cells) |
| edgeWidth | float | 0.08 | 0-0.2 | Width of visible edge lines at cell boundaries |
| seed | int | 1 | 1-100 | Random seed for cell layout and assignment |
| speed | int | 1 | 0-5 | Animation speed |
| invert | int | sourceA | sourceA/sourceB | Swap source assignment |

## Notes

- **split mode**: Each cell is randomly assigned to show source A or source B, creating an organic mosaic. Edge pixels show a 50/50 mix of both sources.
- **edges mode**: All cell interiors show source A, cell boundaries show source B. Creates a Voronoi wireframe overlay.
- **scale**: Controls cell density; low values create many small cells, high values create a few large regions
- **edge width at 0**: No visible boundaries, cells tile seamlessly
- **edge width increased**: Sharp lines appear between cells
- **seed**: Each seed produces a completely different cell layout and A/B assignment
- **invert**: In split mode, swaps which cells show A vs B. In edges mode, swaps cells and edges.

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .cellSplit(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(s))n.shaders[o]={...e}}n&&i&&(n.help=i);var d="mixer/cellSplit",p="mixer",u="cellSplit",f=n;export{f as default,d as effectId,u as effectName,i as help,p as namespace};
