/* synth3d/cell3d */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new o({name:"Cell3D",namespace:"synth3d",func:"cell3d",tags:["3d","noise"],description:"3D cellular/Voronoi noise volume",textures:{volumeCache:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},metric:{type:"int",default:0,uniform:"metric",choices:{sphere:0,octahedron:1,cube:2},ui:{label:"cell shape",control:"dropdown"}},scale:{type:"float",default:10,min:1,max:15,uniform:"scale",ui:{label:"cell scale"}},variation:{type:"float",default:100,min:0,max:100,uniform:"cellVariation",ui:{label:"cell variation"}},seed:{type:"int",default:1,min:0,max:100,uniform:"seed",ui:{label:"seed"}},colorMode:{type:"int",default:1,uniform:"colorMode",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}}},paramAliases:{cellVariation:"variation"},passes:[{name:"precompute",program:"precompute",drawBuffers:2,viewport:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096}},inputs:{},outputs:{color:"volumeCache",geoOut:"geoBuffer"}}],outputTex3d:"volumeCache",outputGeo:"geoBuffer"});var i={precompute:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float scale;
uniform int seed;
uniform int metric;
uniform float cellVariation;
uniform int volumeSize;
uniform int colorMode;

// MRT outputs: volume cache and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

// Volume dimensions - stored as 2D atlas
// Atlas layout: volumeSize x (volumeSize * volumeSize)
// Pixel (x, y) maps to 3D coordinate (x, y % volumeSize, y / volumeSize)

// PCG-based 3D hash for reproducible randomness
uvec3 pcg3d(uvec3 v) {
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

vec3 hash3(vec3 p) {
    p = p + float(seed) * 0.1;
    uvec3 q = uvec3(ivec3(p * 1000.0) + 65536);
    q = pcg3d(q);
    return vec3(q) / 4294967295.0;
}

// 3D Worley/Cell noise - returns distance to nearest cell and cell ID
vec2 cellNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    float minDist = 10.0;
    float cellId = 0.0;
    
    // Search 3x3x3 neighborhood
    for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellPos = i + neighbor;
                
                vec3 randomOffset = hash3(cellPos);
                float jitter = cellVariation * 0.01;
                vec3 cellPoint = neighbor + mix(vec3(0.5), randomOffset, jitter);
                
                vec3 diff = cellPoint - f;
                
                float dist;
                if (metric == 0) {
                    dist = length(diff);
                } else if (metric == 1) {
                    dist = abs(diff.x) + abs(diff.y) + abs(diff.z);
                } else {
                    dist = max(max(abs(diff.x), abs(diff.y)), abs(diff.z));
                }
                
                if (dist < minDist) {
                    minDist = dist;
                    // Encode cell ID for coloring
                    cellId = cellPos.x * 73.0 + cellPos.y * 157.0 + cellPos.z * 311.0;
                }
            }
        }
    }
    
    return vec2(minDist, cellId);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    // Use uniform for volume size
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Atlas is volSize x (volSize * volSize)
    // Pixel (x, y) maps to 3D coordinate (x, y % volSize, y / volSize)
    
    ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
    
    int x = pixelCoord.x;
    int y = pixelCoord.y % volSize;
    int z = pixelCoord.y / volSize;
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        fragColor = vec4(0.0);
        geoOut = vec4(0.5, 0.5, 0.5, 0.0);  // neutral normal, zero density
        return;
    }
    
    // Convert to normalized 3D coordinates in [-1, 1] world space (bounding box)
    // Use (volSizeF - 1.0) so texel 0 \u2192 -1.0 and texel N-1 \u2192 1.0 exactly
    // This matches the sampling in the main shader which uses the same denominator
    vec3 p = vec3(float(x), float(y), float(z)) / (volSizeF - 1.0) * 2.0 - 1.0;
    
    // Scale for cell noise density (more cells = smaller p range * larger scale)
    vec3 scaledP = p * (16.0 - scale);
    
    // Compute cell noise at this point
    vec2 result = cellNoise3D(scaledP);
    float dist = result.x;
    float cellId = result.y;
    
    // Compute analytical gradient using finite differences
    float eps = 0.01 / scale;
    float dxp = cellNoise3D(scaledP + vec3(eps, 0.0, 0.0)).x;
    float dyp = cellNoise3D(scaledP + vec3(0.0, eps, 0.0)).x;
    float dzp = cellNoise3D(scaledP + vec3(0.0, 0.0, eps)).x;
    
    // Gradient points from low to high distance (toward cell center)
    vec3 gradient = vec3(dxp - dist, dyp - dist, dzp - dist) / eps;
    
    // Normal points outward (away from cell center)
    vec3 normal = normalize(-gradient + vec3(1e-6));
    
    // Normalize distance based on metric
    float normalizer;
    if (metric == 0) {
        normalizer = 0.866;  // Euclidean
    } else if (metric == 1) {
        normalizer = 1.5;    // Manhattan
    } else {
        normalizer = 0.6;    // Chebyshev
    }
    float normalizedDist = 1.0 - clamp(dist / normalizer, 0.0, 1.0);
    
    // Generate color from cell ID (for RGB mode)
    float h1 = fract(cellId * 0.0127);
    float h2 = fract(cellId * 0.0231);
    float h3 = fract(cellId * 0.0347);
    
    // Pack output based on colorMode
    // colorMode 0 = mono (grayscale), 1 = rgb (cell colors)
    if (colorMode == 0) {
        fragColor = vec4(normalizedDist, normalizedDist, normalizedDist, 1.0);
    } else {
        fragColor = vec4(normalizedDist, h1, h2, h3);
    }
    
    // Output analytical geometry: normal.xyz encoded [0,1], density in w
    geoOut = vec4(normal * 0.5 + 0.5, normalizedDist);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> scale: f32;
@group(0) @binding(1) var<uniform> seed: i32;
@group(0) @binding(2) var<uniform> metric: i32;
@group(0) @binding(3) var<uniform> cellVariation: f32;
@group(0) @binding(4) var<uniform> volumeSize: i32;
@group(0) @binding(5) var<uniform> colorMode: i32;

// Volume dimensions - stored as 2D atlas
// Atlas layout: volumeSize x (volumeSize * volumeSize)

// PCG-based 3D hash for reproducible randomness
fn pcg3d(v_in: vec3<u32>) -> vec3<u32> {
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

fn hash3(p: vec3<f32>) -> vec3<f32> {
    let ps = p + f32(seed) * 0.1;
    let q = pcg3d(vec3<u32>(vec3<i32>(ps * 1000.0) + 65536));
    return vec3<f32>(q) / 4294967295.0;
}

// 3D Worley/Cell noise - returns distance to nearest cell and cell ID
fn cellNoise3D(p: vec3<f32>) -> vec2<f32> {
    let i = floor(p);
    let f = fract(p);
    
    var minDist: f32 = 10.0;
    var cellId: f32 = 0.0;
    
    // Search 3x3x3 neighborhood
    for (var z: i32 = -1; z <= 1; z = z + 1) {
        for (var y: i32 = -1; y <= 1; y = y + 1) {
            for (var x: i32 = -1; x <= 1; x = x + 1) {
                let neighbor = vec3<f32>(f32(x), f32(y), f32(z));
                let cellPos = i + neighbor;
                
                let randomOffset = hash3(cellPos);
                let jitter = cellVariation * 0.01;
                let cellPoint = neighbor + mix(vec3<f32>(0.5), randomOffset, jitter);
                
                let diff = cellPoint - f;
                
                var dist: f32;
                if (metric == 0) {
                    dist = length(diff);
                } else if (metric == 1) {
                    dist = abs(diff.x) + abs(diff.y) + abs(diff.z);
                } else {
                    dist = max(max(abs(diff.x), abs(diff.y)), abs(diff.z));
                }
                
                if (dist < minDist) {
                    minDist = dist;
                    cellId = cellPos.x * 73.0 + cellPos.y * 157.0 + cellPos.z * 311.0;
                }
            }
        }
    }
    
    return vec2<f32>(minDist, cellId);
}

// MRT output structure for volume cache and geometry buffer
struct FragOutput {
    @location(0) color: vec4<f32>,
    @location(1) geoOut: vec4<f32>,
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> FragOutput {
    // Use uniform for volume size
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    // Atlas is volSize x (volSize * volSize)
    // Pixel (x, y) maps to 3D coordinate (x, y % volSize, y / volSize)
    
    let pixelCoord = vec2<i32>(position.xy);
    
    let x = pixelCoord.x;
    let y = pixelCoord.y % volSize;
    let z = pixelCoord.y / volSize;
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        return FragOutput(vec4<f32>(0.0), vec4<f32>(0.5, 0.5, 0.5, 0.0));
    }
    
    // Convert to normalized 3D coordinates in [-1, 1] world space (bounding box)
    // Use (volSizeF - 1.0) so texel 0 \u2192 -1.0 and texel N-1 \u2192 1.0 exactly
    // This matches the sampling in the main shader which uses the same denominator
    var p = vec3<f32>(f32(x), f32(y), f32(z)) / (volSizeF - 1.0) * 2.0 - 1.0;
    
    // Scale for cell noise density
    let scaledP = p * (16.0 - scale);
    
    // Compute cell noise at this point
    let result = cellNoise3D(scaledP);
    let dist = result.x;
    let cellId = result.y;
    
    // Normalize distance based on metric
    var normalizer: f32;
    if (metric == 0) {
        normalizer = 0.866;  // Euclidean
    } else if (metric == 1) {
        normalizer = 1.5;    // Manhattan
    } else {
        normalizer = 0.6;    // Chebyshev
    }
    let normalizedDist = 1.0 - clamp(dist / normalizer, 0.0, 1.0);
    
    // Generate color from cell ID (for RGB mode)
    let h1 = fract(cellId * 0.0127);
    let h2 = fract(cellId * 0.0231);
    let h3 = fract(cellId * 0.0347);
    
    // Compute analytical gradient using finite differences
    let eps = 1.0 / volSizeF;
    let dx = cellNoise3D(scaledP + vec3<f32>(eps, 0.0, 0.0)).x;
    let dy = cellNoise3D(scaledP + vec3<f32>(0.0, eps, 0.0)).x;
    let dz = cellNoise3D(scaledP + vec3<f32>(0.0, 0.0, eps)).x;
    
    let gradient = vec3<f32>(dx - dist, dy - dist, dz - dist) / eps;
    let normal = normalize(-gradient + vec3<f32>(0.000001));
    
    // Pack output based on colorMode
    // colorMode 0 = mono (grayscale), 1 = rgb (cell colors)
    var color: vec4<f32>;
    if (colorMode == 0) {
        color = vec4<f32>(normalizedDist, normalizedDist, normalizedDist, 1.0);
    } else {
        color = vec4<f32>(normalizedDist, h1, h2, h3);
    }
    let geoOut = vec4<f32>(normal * 0.5 + 0.5, normalizedDist);
    
    return FragOutput(color, geoOut);
}
`}},l=`# cell3d

3D cellular/Voronoi noise volume

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x64 | x16/x32/x64/x128 | Volume size |
| metric | int | sphere | sphere/octahedron/cube | Cell shape |
| scale | float | 10 | 1-15 | Cell scale |
| variation | float | 100 | 0-100 | Cell variation |
| seed | int | 1 | 0-100 | - |
| colorMode | int | rgb | mono/rgb | Color mode |

## Usage

\`\`\`
search synth3d, filter3d, render

cell3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(i))n.shaders[t]={...e}}n&&l&&(n.help=l);var d="synth3d/cell3d",f="synth3d",u="cell3d",v=n;export{v as default,d as effectId,u as effectName,l as help,f as namespace};
