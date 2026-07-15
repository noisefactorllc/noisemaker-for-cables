/* synth3d/fractal3d */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Fractal3D",namespace:"synth3d",func:"fractal3d",tags:["3d"],description:"3D Mandelbulb/Mandelcube fractals",textures:{volumeCache:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},type:{type:"int",default:0,uniform:"noiseType",choices:{mandelbulb:0,mandelcube:1,juliaBulb:2,juliaCube:3},ui:{label:"type",control:"dropdown"}},power:{type:"float",default:8,min:2,max:16,randMax:8,uniform:"power",ui:{label:"power",control:"slider"}},iterations:{type:"int",default:10,min:1,max:20,uniform:"iterations",ui:{label:"iterations",control:"slider"}},bailout:{type:"float",default:2,min:1,max:8,uniform:"bailout",ui:{label:"bailout",control:"slider"}},juliaX:{type:"float",default:0,min:-100,max:100,uniform:"juliaX",ui:{label:"julia x",control:"slider",category:"julia",enabledBy:{param:"type",in:[2,3]}}},juliaY:{type:"float",default:0,min:-100,max:100,uniform:"juliaY",ui:{label:"julia y",control:"slider",category:"julia",enabledBy:{param:"type",in:[2,3]}}},juliaZ:{type:"float",default:0,min:-100,max:100,uniform:"juliaZ",ui:{label:"julia z",control:"slider",category:"julia",enabledBy:{param:"type",in:[2,3]}}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,orbitTrap:1,iteration:2},ui:{label:"color mode",control:"dropdown"}}},paramAliases:{fractalType:"type"},passes:[{name:"precompute",program:"precompute",drawBuffers:2,viewport:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096}},inputs:{},outputs:{color:"volumeCache",geoOut:"geoBuffer"}}],outputTex3d:"volumeCache",outputGeo:"geoBuffer"});var a={precompute:{glsl:`#version 300 es
precision highp float;

uniform int volumeSize;
uniform int noiseType;
uniform float power;
uniform int iterations;
uniform float bailout;
uniform float juliaX;
uniform float juliaY;
uniform float juliaZ;
uniform int colorMode;
uniform vec2 tileOffset;
uniform float renderScale;

// MRT outputs: volume cache and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

const float PI = 3.141592653589793;

// Mandelbulb distance estimator
// Returns (distance estimate, orbit trap distance, iteration ratio)
vec3 mandelbulb(vec3 pos, float n, int maxIter, float bail) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float trap = 1e10;
    float iter = 0.0;
    
    for (int i = 0; i < maxIter; i++) {
        r = length(z);
        if (r > bail) break;
        
        trap = min(trap, r);
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        
        dr = pow(r, n - 1.0) * n * dr + 1.0;
        
        float zr = pow(r, n);
        float newTheta = theta * n;
        float newPhi = phi * n;
        
        z = zr * vec3(
            sin(newTheta) * cos(newPhi),
            sin(newTheta) * sin(newPhi),
            cos(newTheta)
        );
        z += pos;
        
        iter += 1.0;
    }
    
    float dist = 0.5 * log(r) * r / dr;
    
    return vec3(dist, trap, iter / float(maxIter));
}

// Julia Mandelbulb
vec3 juliaBulb(vec3 pos, vec3 c, float n, int maxIter, float bail) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float trap = 1e10;
    float iter = 0.0;
    
    for (int i = 0; i < maxIter; i++) {
        r = length(z);
        if (r > bail) break;
        
        trap = min(trap, r);
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        
        dr = pow(r, n - 1.0) * n * dr + 1.0;
        
        float zr = pow(r, n);
        float newTheta = theta * n;
        float newPhi = phi * n;
        
        z = zr * vec3(
            sin(newTheta) * cos(newPhi),
            sin(newTheta) * sin(newPhi),
            cos(newTheta)
        );
        z += c;
        
        iter += 1.0;
    }
    
    float dist = 0.5 * log(r) * r / dr;
    return vec3(dist, trap, iter / float(maxIter));
}

// Box fold operation
vec3 boxFold(vec3 z, float foldingLimit) {
    return clamp(z, -foldingLimit, foldingLimit) * 2.0 - z;
}

// Mandelcube distance estimator
vec3 mandelcube(vec3 pos, float scale, int maxIter, float bail) {
    vec3 z = pos;
    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;
    
    float foldingLimit = 1.0;
    float minRadius = 0.5;
    float fixedRadius = 1.0;
    
    for (int i = 0; i < maxIter; i++) {
        z = boxFold(z, foldingLimit);
        
        float r2 = dot(z, z);
        float minR2 = minRadius * minRadius;
        float fixedR2 = fixedRadius * fixedRadius;
        
        if (r2 < minR2) {
            float factor = fixedR2 / minR2;
            z *= factor;
            dr *= factor;
        } else if (r2 < fixedR2) {
            float factor = fixedR2 / r2;
            z *= factor;
            dr *= factor;
        }
        
        z = z * scale + pos;
        dr = dr * abs(scale) + 1.0;
        
        trap = min(trap, length(z));
        iter += 1.0;
        
        if (length(z) > bail) break;
    }
    
    float r = length(z);
    float dist = r / abs(dr);
    
    return vec3(dist, trap, iter / float(maxIter));
}

// Julia Mandelcube
vec3 juliaCube(vec3 pos, vec3 c, float scale, int maxIter, float bail) {
    vec3 z = pos;
    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;
    
    float foldingLimit = 1.0;
    float minRadius = 0.5;
    float fixedRadius = 1.0;
    
    for (int i = 0; i < maxIter; i++) {
        z = boxFold(z, foldingLimit);
        
        float r2 = dot(z, z);
        float minR2 = minRadius * minRadius;
        float fixedR2 = fixedRadius * fixedRadius;
        
        if (r2 < minR2) {
            float factor = fixedR2 / minR2;
            z *= factor;
            dr *= factor;
        } else if (r2 < fixedR2) {
            float factor = fixedR2 / r2;
            z *= factor;
            dr *= factor;
        }
        
        z = z * scale + c;
        dr = dr * abs(scale) + 1.0;
        
        trap = min(trap, length(z));
        iter += 1.0;
        
        if (length(z) > bail) break;
    }
    
    float r = length(z);
    float dist = r / abs(dr);
    
    return vec3(dist, trap, iter / float(maxIter));
}

// Helper to get SDF result for a position
vec3 computeFractal(vec3 p, vec3 juliaC) {
    if (noiseType == 0) {
        return mandelbulb(p, power, iterations, bailout);
    } else if (noiseType == 1) {
        float scale = clamp(power * 0.25, -3.0, 3.0);
        return mandelcube(p, scale, iterations, bailout);
    } else if (noiseType == 2) {
        return juliaBulb(p, juliaC, power, iterations, bailout);
    } else {
        float scale = clamp(power * 0.25, -3.0, 3.0);
        return juliaCube(p, juliaC, scale, iterations, bailout);
    }
}

void main() {
    int volSize = volumeSize;
    int scaledVolSize = int(float(volSize) * renderScale);
    float scaledVolSizeF = float(scaledVolSize);
    
    vec2 globalPixelCoord = gl_FragCoord.xy + tileOffset;
    ivec2 pixelCoord = ivec2(globalPixelCoord);
    
    int x = int(mod(float(pixelCoord.x), scaledVolSizeF));
    int y = pixelCoord.y % scaledVolSize;
    int z = pixelCoord.y / scaledVolSize;
    
    if (x >= scaledVolSize || y >= scaledVolSize || z >= scaledVolSize) {
        fragColor = vec4(0.0);
        geoOut = vec4(0.5, 0.5, 0.5, 0.0);
        return;
    }
    
    vec3 p = (vec3(float(x), float(y), float(z)) / (scaledVolSizeF - 1.0) * 2.0 - 1.0) * 1.5;
    
    vec3 juliaC = vec3(juliaX, juliaY, juliaZ) * 0.01;
    
    vec3 result = computeFractal(p, juliaC);
    
    float dist = result.x;
    float normalizedDist = 1.0 - clamp(dist * 2.0 + 0.5, 0.0, 1.0);
    
    float trap = clamp(result.y * 0.5, 0.0, 1.0);
    float iterRatio = result.z;
    
    // Compute analytical gradient using finite differences on the SDF
    float eps = 0.01;
    float dxp = computeFractal(p + vec3(eps, 0.0, 0.0), juliaC).x;
    float dyp = computeFractal(p + vec3(0.0, eps, 0.0), juliaC).x;
    float dzp = computeFractal(p + vec3(0.0, 0.0, eps), juliaC).x;
    
    vec3 gradient = vec3(dxp - dist, dyp - dist, dzp - dist) / eps;
    vec3 normal = normalize(gradient + vec3(1e-6));  // SDF gradient points outward
    
    // Output volume data based on colorMode
    // colorMode 0 = mono (grayscale), 1 = rgb (distance, trap, iteration)
    if (colorMode == 0) {
        fragColor = vec4(normalizedDist, normalizedDist, normalizedDist, 1.0);
    } else {
        fragColor = vec4(normalizedDist, trap, iterRatio, 1.0);
    }
    geoOut = vec4(normal * 0.5 + 0.5, normalizedDist);
}`,wgsl:`// WGSL version \u2013 WebGPU
// Precompute pass: generate 3D fractal volume as 2D atlas
@group(0) @binding(0) var<uniform> volumeSize: i32;
@group(0) @binding(1) var<uniform> noiseType: i32;
@group(0) @binding(2) var<uniform> power: f32;
@group(0) @binding(3) var<uniform> iterations: i32;
@group(0) @binding(4) var<uniform> bailout: f32;
@group(0) @binding(5) var<uniform> juliaX: f32;
@group(0) @binding(6) var<uniform> juliaY: f32;
@group(0) @binding(7) var<uniform> juliaZ: f32;

const PI: f32 = 3.141592653589793;

// Mandelbulb distance estimator
// Returns (distance estimate, orbit trap distance, iteration ratio)
fn mandelbulb(pos: vec3<f32>, n: f32, maxIter: i32, bail: f32) -> vec3<f32> {
    var z = pos;
    var dr: f32 = 1.0;
    var r: f32 = 0.0;
    var trap: f32 = 1e10;
    var iter: f32 = 0.0;
    
    for (var i: i32 = 0; i < maxIter; i = i + 1) {
        r = length(z);
        if (r > bail) { break; }
        
        // Orbit trap - distance to origin
        trap = min(trap, r);
        
        // Convert to spherical coordinates
        let theta = acos(z.z / r);
        let phi = atan2(z.y, z.x);
        
        // Scale the running derivative
        dr = pow(r, n - 1.0) * n * dr + 1.0;
        
        // Scale and rotate the point
        let zr = pow(r, n);
        let newTheta = theta * n;
        let newPhi = phi * n;
        
        // Convert back to Cartesian coordinates
        z = zr * vec3<f32>(
            sin(newTheta) * cos(newPhi),
            sin(newTheta) * sin(newPhi),
            cos(newTheta)
        );
        z = z + pos;
        
        iter = iter + 1.0;
    }
    
    // Distance estimator
    let dist = 0.5 * log(r) * r / dr;
    
    return vec3<f32>(dist, trap, iter / f32(maxIter));
}

// Julia Mandelbulb - fixed c point
fn juliaBulb(pos: vec3<f32>, c: vec3<f32>, n: f32, maxIter: i32, bail: f32) -> vec3<f32> {
    var z = pos;
    var dr: f32 = 1.0;
    var r: f32 = 0.0;
    var trap: f32 = 1e10;
    var iter: f32 = 0.0;
    
    for (var i: i32 = 0; i < maxIter; i = i + 1) {
        r = length(z);
        if (r > bail) { break; }
        
        trap = min(trap, r);
        
        let theta = acos(z.z / r);
        let phi = atan2(z.y, z.x);
        
        dr = pow(r, n - 1.0) * n * dr + 1.0;
        
        let zr = pow(r, n);
        let newTheta = theta * n;
        let newPhi = phi * n;
        
        z = zr * vec3<f32>(
            sin(newTheta) * cos(newPhi),
            sin(newTheta) * sin(newPhi),
            cos(newTheta)
        );
        z = z + c;  // Add constant c instead of pos
        
        iter = iter + 1.0;
    }
    
    let dist = 0.5 * log(r) * r / dr;
    return vec3<f32>(dist, trap, iter / f32(maxIter));
}

// Box fold operation for Mandelbox/Mandelcube
fn boxFold(z: vec3<f32>, foldingLimit: f32) -> vec3<f32> {
    return clamp(z, vec3<f32>(-foldingLimit), vec3<f32>(foldingLimit)) * 2.0 - z;
}

// Sphere fold operation for Mandelbox
fn sphereFold(z: vec3<f32>, minRadius: f32, fixedRadius: f32) -> vec3<f32> {
    let r2 = dot(z, z);
    let minR2 = minRadius * minRadius;
    let fixedR2 = fixedRadius * fixedRadius;
    
    if (r2 < minR2) {
        return z * (fixedR2 / minR2);
    } else if (r2 < fixedR2) {
        return z * (fixedR2 / r2);
    }
    return z;
}

// Mandelcube (simplified Mandelbox-like) distance estimator
fn mandelcube(pos: vec3<f32>, scale: f32, maxIter: i32, bail: f32) -> vec3<f32> {
    var z = pos;
    var dr: f32 = 1.0;
    var trap: f32 = 1e10;
    var iter: f32 = 0.0;
    
    let foldingLimit: f32 = 1.0;
    let minRadius: f32 = 0.5;
    let fixedRadius: f32 = 1.0;
    
    for (var i: i32 = 0; i < maxIter; i = i + 1) {
        // Box fold
        z = boxFold(z, foldingLimit);
        
        // Sphere fold
        let r2 = dot(z, z);
        let minR2 = minRadius * minRadius;
        let fixedR2 = fixedRadius * fixedRadius;
        
        if (r2 < minR2) {
            let factor = fixedR2 / minR2;
            z = z * factor;
            dr = dr * factor;
        } else if (r2 < fixedR2) {
            let factor = fixedR2 / r2;
            z = z * factor;
            dr = dr * factor;
        }
        
        // Scale and translate
        z = z * scale + pos;
        dr = dr * abs(scale) + 1.0;
        
        trap = min(trap, length(z));
        iter = iter + 1.0;
        
        if (length(z) > bail) { break; }
    }
    
    let r = length(z);
    let dist = r / abs(dr);
    
    return vec3<f32>(dist, trap, iter / f32(maxIter));
}

// Julia Mandelcube - fixed c point
fn juliaCube(pos: vec3<f32>, c: vec3<f32>, scale: f32, maxIter: i32, bail: f32) -> vec3<f32> {
    var z = pos;
    var dr: f32 = 1.0;
    var trap: f32 = 1e10;
    var iter: f32 = 0.0;
    
    let foldingLimit: f32 = 1.0;
    let minRadius: f32 = 0.5;
    let fixedRadius: f32 = 1.0;
    
    for (var i: i32 = 0; i < maxIter; i = i + 1) {
        z = boxFold(z, foldingLimit);
        
        let r2 = dot(z, z);
        let minR2 = minRadius * minRadius;
        let fixedR2 = fixedRadius * fixedRadius;
        
        if (r2 < minR2) {
            let factor = fixedR2 / minR2;
            z = z * factor;
            dr = dr * factor;
        } else if (r2 < fixedR2) {
            let factor = fixedR2 / r2;
            z = z * factor;
            dr = dr * factor;
        }
        
        z = z * scale + c;  // Add constant c instead of pos
        dr = dr * abs(scale) + 1.0;
        
        trap = min(trap, length(z));
        iter = iter + 1.0;
        
        if (length(z) > bail) { break; }
    }
    
    let r = length(z);
    let dist = r / abs(dr);
    
    return vec3<f32>(dist, trap, iter / f32(maxIter));
}

// MRT output structure for volume cache and geometry buffer
struct FragOutput {
    @location(0) color: vec4<f32>,
    @location(1) geoOut: vec4<f32>,
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> FragOutput {
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
    
    // Convert to normalized 3D coordinates in [-1.5, 1.5] world space
    // Slightly larger than [-1,1] to capture the full fractal
    let p = (vec3<f32>(f32(x), f32(y), f32(z)) / (volSizeF - 1.0) * 2.0 - 1.0) * 1.5;
    
    // Julia constant from uniforms (normalized from -100..100 to -1..1)
    let juliaC = vec3<f32>(juliaX, juliaY, juliaZ) * 0.01;
    
    var result: vec3<f32>;
    
    // Select fractal noiseType
    if (noiseType == 0) {
        // Mandelbulb
        result = mandelbulb(p, power, iterations, bailout);
    } else if (noiseType == 1) {
        // Mandelcube (use power as scale, clamped to reasonable range)
        let scale = clamp(power * 0.25, -3.0, 3.0);
        result = mandelcube(p, scale, iterations, bailout);
    } else if (noiseType == 2) {
        // Julia Bulb
        result = juliaBulb(p, juliaC, power, iterations, bailout);
    } else {
        // Julia Cube
        let scale = clamp(power * 0.25, -3.0, 3.0);
        result = juliaCube(p, juliaC, scale, iterations, bailout);
    }
    
    // result.x = distance estimate (used for threshold)
    // result.y = orbit trap (for coloring)
    // result.z = iteration ratio (for coloring)
    
    // Normalize distance to 0-1 range for storage
    // Small distances = inside/near surface, large = outside
    let dist = result.x;
    let normalizedDist = 1.0 - clamp(dist * 2.0 + 0.5, 0.0, 1.0);
    
    // Normalize trap value
    let trap = clamp(result.y * 0.5, 0.0, 1.0);
    
    // Iteration ratio is already 0-1
    let iterRatio = result.z;
    
    // Compute analytical gradient using finite differences
    let eps = 0.01;
    var dx: vec3<f32>;
    var dy: vec3<f32>;
    var dz: vec3<f32>;
    
    if (noiseType == 0) {
        dx = mandelbulb(p + vec3<f32>(eps, 0.0, 0.0), power, iterations, bailout);
        dy = mandelbulb(p + vec3<f32>(0.0, eps, 0.0), power, iterations, bailout);
        dz = mandelbulb(p + vec3<f32>(0.0, 0.0, eps), power, iterations, bailout);
    } else if (noiseType == 1) {
        let scale = clamp(power * 0.25, -3.0, 3.0);
        dx = mandelcube(p + vec3<f32>(eps, 0.0, 0.0), scale, iterations, bailout);
        dy = mandelcube(p + vec3<f32>(0.0, eps, 0.0), scale, iterations, bailout);
        dz = mandelcube(p + vec3<f32>(0.0, 0.0, eps), scale, iterations, bailout);
    } else if (noiseType == 2) {
        dx = juliaBulb(p + vec3<f32>(eps, 0.0, 0.0), juliaC, power, iterations, bailout);
        dy = juliaBulb(p + vec3<f32>(0.0, eps, 0.0), juliaC, power, iterations, bailout);
        dz = juliaBulb(p + vec3<f32>(0.0, 0.0, eps), juliaC, power, iterations, bailout);
    } else {
        let scale = clamp(power * 0.25, -3.0, 3.0);
        dx = juliaCube(p + vec3<f32>(eps, 0.0, 0.0), juliaC, scale, iterations, bailout);
        dy = juliaCube(p + vec3<f32>(0.0, eps, 0.0), juliaC, scale, iterations, bailout);
        dz = juliaCube(p + vec3<f32>(0.0, 0.0, eps), juliaC, scale, iterations, bailout);
    }
    
    let gradient = vec3<f32>(dx.x - dist, dy.x - dist, dz.x - dist) / eps;
    let normal = normalize(-gradient + vec3<f32>(0.000001));
    
    let color = vec4<f32>(normalizedDist, trap, iterRatio, 1.0);
    let geoOut = vec4<f32>(normal * 0.5 + 0.5, normalizedDist);
    
    return FragOutput(color, geoOut);
}
`}},r=`# fractal3d

3D Mandelbulb/Mandelcube fractals

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x64 | x16/x32/x64/x128 | Volume size |
| type | int | mandelbulb | mandelbulb/mandelcube/juliaBulb/juliaCube | Type |
| power | float | 8 | 2-16 | Power |
| iterations | int | 10 | 1-20 | Iterations |
| bailout | float | 2 | 1-8 | Bailout |
| juliaX | float | 0 | -100-100 | Julia X |
| juliaY | float | 0 | -100-100 | Julia Y |
| juliaZ | float | 0 | -100-100 | Julia Z |
| colorMode | int | mono | mono/orbitTrap/iteration | Color mode |

## Usage

\`\`\`
search synth3d, filter3d, render

fractal3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(a))e.shaders[i]={...n}}e&&r&&(e.help=r);var u="synth3d/fractal3d",d="synth3d",c="fractal3d",p=e;export{p as default,u as effectId,c as effectName,r as help,d as namespace};
