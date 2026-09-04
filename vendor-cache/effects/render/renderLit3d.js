/* render/renderLit3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"RenderLit3D",namespace:"render",tags:["3d"],func:"renderLit3d",description:"Universal 3D volume raymarcher with advanced lighting",textures:{screenGeoBuffer:{width:"resolution",height:"resolution",format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{v16:16,v32:32,v64:64,v128:128},ui:{control:!1}},shape:{type:"int",default:0,uniform:"shape",choices:{cube:0,sphere:1},ui:{label:"shape bounds",control:"dropdown"}},threshold:{type:"float",default:.5,min:0,max:1,randMax:.5,uniform:"threshold",ui:{label:"threshold"}},invert:{type:"boolean",default:!1,randChance:0,uniform:"invert",ui:{label:"invert thresh"}},orbitSpeed:{type:"int",default:1,min:-5,max:5,randMin:-1,randMax:1,zero:0,uniform:"orbitSpeed",ui:{label:"orbit speed"}},cameraPosition:{type:"vec3",default:[0,.1425,1],min:[-1,-1,-1],max:[1,1,1],step:.01,randChance:0,uniform:"cameraPosition",ui:{label:"camera pos",control:"vec3"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"background"}},bgAlpha:{type:"float",default:1,min:0,max:1,randChance:0,uniform:"bgAlpha",ui:{label:"bg opacity",category:"background"}},lightDirection:{type:"vec3",default:[.5,.5,1],uniform:"lightDirection",ui:{label:"light dir",control:"vector3",category:"lighting"}},diffuseColor:{type:"color",default:[1,1,1],uniform:"diffuseColor",ui:{label:"color",control:"color",category:"diffuse"}},diffuseIntensity:{type:"float",default:.7,min:0,max:2,step:.01,uniform:"diffuseIntensity",ui:{label:"intensity",control:"slider",category:"diffuse"}},specularColor:{type:"color",default:[1,1,1],uniform:"specularColor",ui:{label:"color",control:"color",category:"specular"}},specularIntensity:{type:"float",default:.3,min:0,max:2,step:.01,uniform:"specularIntensity",ui:{label:"intensity",control:"slider",category:"specular"}},shininess:{type:"float",default:32,min:1,max:256,step:1,uniform:"shininess",ui:{label:"shininess",control:"slider",category:"specular"}},rimIntensity:{type:"float",default:.15,min:0,max:1,step:.01,uniform:"rimIntensity",ui:{label:"intensity",control:"slider",category:"rim"}},rimPower:{type:"float",default:3,min:.5,max:8,step:.1,uniform:"rimPower",ui:{label:"power",control:"slider",category:"rim"}},ambientColor:{type:"color",default:[.1,.1,.1],uniform:"ambientColor",ui:{label:"ambient color",control:"color",category:"lighting"}}},defaultProgram:`search synth3d, filter3d, render

noise3d()
.renderLit3d(specularIntensity: 2, shininess: 256)
.write(o0)`,passes:[{name:"render",program:"renderLit3d",drawBuffers:2,inputs:{volumeCache:"inputTex3d",analyticalGeo:"inputGeo"},outputs:{color:"outputTex",geoOut:"screenGeoBuffer"}}],outputGeo:"screenGeoBuffer",outputTex3d:"inputTex3d"});var r={renderLit3d:{glsl:`/*
 * Universal 3D volume renderer with advanced lighting (GLSL)
 * 
 * Raymarches through a 3D volume texture to find isosurfaces,
 * with configurable bounding shapes and Blinn-Phong lighting.
 * 
 * Bounding shapes: cube, sphere
 * Lighting: diffuse, specular, ambient, rim
 */

#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float threshold;
uniform int invert;
uniform int volumeSize;
uniform int shape;
uniform int orbitSpeed;
uniform vec3 cameraPosition;
uniform vec3 bgColor;
uniform float bgAlpha;
uniform sampler2D volumeCache;

// Lighting uniforms
uniform vec3 lightDirection;
uniform vec3 diffuseColor;
uniform float diffuseIntensity;
uniform vec3 specularColor;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 ambientColor;
uniform float rimIntensity;
uniform float rimPower;

// MRT outputs: color and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

const float TAU = 6.283185307179586;
const float PI = 3.141592653589793;
const int MAX_STEPS = 256;
const float MAX_DIST = 10.0;
const float NEAR_CLIP = 0.01;

// Helper to convert 3D texel coords to 2D atlas texel coords
ivec2 atlasTexel(ivec3 p, int volSize) {
    return ivec2(p.x, p.y + p.z * volSize);
}

// Sample the cached 3D volume with trilinear interpolation
// World position p is in [-1, 1]^3 (bounding box coordinates)
vec4 sampleVolume(vec3 worldPos) {
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Convert world position [-1, 1] to normalized volume coords [0, 1]
    vec3 uvw = worldPos * 0.5 + 0.5;
    uvw = clamp(uvw, 0.0, 1.0);
    
    // Convert to texel coordinates
    vec3 texelPos = uvw * (volSizeF - 1.0);
    vec3 texelFloor = floor(texelPos);
    vec3 frac = texelPos - texelFloor;
    
    ivec3 i0 = ivec3(texelFloor);
    ivec3 i1 = min(i0 + 1, volSize - 1);
    
    // Trilinear filtering - sample all 8 corners
    vec4 c000 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i0.y, i0.z), volSize), 0);
    vec4 c100 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i0.y, i0.z), volSize), 0);
    vec4 c010 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i1.y, i0.z), volSize), 0);
    vec4 c110 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i1.y, i0.z), volSize), 0);
    vec4 c001 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i0.y, i1.z), volSize), 0);
    vec4 c101 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i0.y, i1.z), volSize), 0);
    vec4 c011 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i1.y, i1.z), volSize), 0);
    vec4 c111 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i1.y, i1.z), volSize), 0);
    
    // Trilinear interpolation
    vec4 c00 = mix(c000, c100, frac.x);
    vec4 c10 = mix(c010, c110, frac.x);
    vec4 c01 = mix(c001, c101, frac.x);
    vec4 c11 = mix(c011, c111, frac.x);
    
    vec4 c0 = mix(c00, c10, frac.y);
    vec4 c1 = mix(c01, c11, frac.y);
    
    return mix(c0, c1, frac.z);
}

// Get the scalar field value at a point
// HIGH values = SOLID, field < 0 = inside solid
float getField(vec3 p) {
    float val = sampleVolume(p).r;
    if (invert == 1) {
        val = 1.0 - val;
    }
    return threshold - val;
}

// Compute smooth normal using central differences
vec3 calcNormal(vec3 p) {
    float eps = 2.0 / float(volumeSize);
    
    float dx = getField(p + vec3(eps, 0.0, 0.0)) - getField(p - vec3(eps, 0.0, 0.0));
    float dy = getField(p + vec3(0.0, eps, 0.0)) - getField(p - vec3(0.0, eps, 0.0));
    float dz = getField(p + vec3(0.0, 0.0, eps)) - getField(p - vec3(0.0, 0.0, eps));
    
    vec3 n = vec3(dx, dy, dz);
    float len = length(n);
    if (len < 0.0001) return vec3(0.0, 1.0, 0.0);
    
    return n / len;
}

// Compute outward normal for bounding shape at position p
vec3 calcBoundaryNormal(vec3 p) {
    if (shape == 0) {
        // Cube: normal points outward from nearest face
        vec3 absP = abs(p);
        if (absP.x > absP.y && absP.x > absP.z) {
            return vec3(sign(p.x), 0.0, 0.0);
        } else if (absP.y > absP.z) {
            return vec3(0.0, sign(p.y), 0.0);
        } else {
            return vec3(0.0, 0.0, sign(p.z));
        }
    } else {
        // Sphere: normal is just the normalized position
        return normalize(p);
    }
}

// Ray-box intersection (cube shape)
// Returns (tEnter, tExit) or (-1, -1) if no hit
vec2 intersectBox(vec3 ro, vec3 rd) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (-1.0 - ro) * invRd;
    vec3 t1 = (1.0 - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tEnter = max(max(tmin.x, tmin.y), tmin.z);
    float tExit = min(min(tmax.x, tmax.y), tmax.z);
    
    if (tEnter > tExit || tExit < 0.0) {
        return vec2(-1.0);
    }
    return vec2(tEnter, tExit);
}

// Ray-sphere intersection (radius 1 centered at origin)
// Returns (tEnter, tExit) or (-1, -1) if no hit
vec2 intersectSphere(vec3 ro, vec3 rd) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float disc = b * b - c;
    
    if (disc < 0.0) {
        return vec2(-1.0);
    }
    
    float sqrtDisc = sqrt(disc);
    float tEnter = -b - sqrtDisc;
    float tExit = -b + sqrtDisc;
    
    if (tExit < 0.0) {
        return vec2(-1.0);
    }
    return vec2(tEnter, tExit);
}

// Get ray bounds based on selected shape
// Returns (tStart, tEnd) accounting for near clip
vec2 getRayBounds(vec3 ro, vec3 rd) {
    vec2 t;
    
    if (shape == 0) {
        // Cube
        t = intersectBox(ro, rd);
    } else {
        // Sphere
        t = intersectSphere(ro, rd);
    }
    
    if (t.x < 0.0 && t.y < 0.0) {
        return vec2(-1.0);
    }
    
    // Apply near clip (handles camera inside volume)
    t.x = max(t.x, NEAR_CLIP);
    
    return t;
}

// Isosurface hit result
struct IsoHit {
    float dist;
    vec3 pos;
    bool hit;
    bool atBoundary;  // true if hit at bounding shape edge, not isosurface
};

// Raymarching with bisection refinement
IsoHit raymarch(vec3 ro, vec3 rd) {
    IsoHit result;
    result.hit = false;
    result.dist = -1.0;
    result.pos = vec3(0.0);
    result.atBoundary = false;
    
    vec2 bounds = getRayBounds(ro, rd);
    if (bounds.x < 0.0) return result;
    
    float tStart = bounds.x;
    float tEnd = bounds.y;
    
    // Step size based on volume resolution
    float stepSize = 1.5 / float(volumeSize);
    
    // March through volume
    float t = tStart;
    float prevField = getField(ro + rd * t);
    
    // If we start inside solid, hit immediately at boundary
    if (prevField < 0.0) {
        result.hit = true;
        result.dist = tStart;
        result.pos = ro + rd * tStart;
        result.atBoundary = true;
        return result;
    }
    
    for (int i = 0; i < MAX_STEPS; i++) {
        t += stepSize;
        if (t > tEnd) break;
        
        vec3 p = ro + rd * t;
        
        // For bounded shapes, check if still in bounds
        if (shape == 0) {
            // Cube bounds check
            if (any(lessThan(p, vec3(-1.0))) || any(greaterThan(p, vec3(1.0)))) {
                break;
            }
        } else if (shape == 1) {
            // Sphere bounds check
            if (dot(p, p) > 1.0) {
                break;
            }
        }
        // Plane and none don't need bounds checks (already handled by tEnd)
        
        float field = getField(p);
        
        // Check for sign change (threshold crossing)
        if (prevField * field < 0.0) {
            // Found crossing - refine with bisection
            float tLo = t - stepSize;
            float tHi = t;
            
            for (int j = 0; j < 8; j++) {
                float tMid = (tLo + tHi) * 0.5;
                float fMid = getField(ro + rd * tMid);
                
                if (prevField * fMid < 0.0) {
                    tHi = tMid;
                } else {
                    tLo = tMid;
                    prevField = fMid;
                }
            }
            
            result.hit = true;
            result.dist = (tLo + tHi) * 0.5;
            result.pos = ro + rd * result.dist;
            return result;
        }
        
        prevField = field;
    }
    
    return result;
}

// Advanced lighting calculation
vec3 applyLighting(vec3 baseColor, vec3 n, vec3 rd, vec3 worldLightDir) {
    vec3 lightDir = normalize(worldLightDir);
    vec3 viewDir = -rd;
    
    // Ensure normal faces the camera
    if (dot(n, viewDir) < 0.0) {
        n = -n;
    }
    
    // Ambient lighting
    vec3 ambient = ambientColor * baseColor;
    
    // Diffuse lighting (Lambertian)
    float diffuseFactor = max(dot(n, lightDir), 0.0);
    vec3 diffuse = diffuseColor * diffuseFactor * baseColor * diffuseIntensity;
    
    // Specular lighting (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(halfDir, n), 0.0);
    float specularFactor = pow(specAngle, shininess);
    vec3 specular = specularColor * specularFactor * specularIntensity;
    
    // Fresnel rim lighting
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), rimPower);
    vec3 rimLight = vec3(rim) * rimIntensity;
    
    return ambient + diffuse + specular + rimLight;
}

// Shading - uses RGB from volume for coloring
vec3 shade(vec3 p, vec3 n, vec3 rd, vec3 worldLightDir) {
    vec4 volColor = sampleVolume(p);
    vec3 baseColor = volColor.rgb;
    
    // If volume appears grayscale, use neutral gray
    float colorVariance = length(volColor.rgb - vec3(volColor.r));
    if (colorVariance < 0.01) {
        baseColor = vec3(0.75);
    }
    
    return applyLighting(baseColor, n, rd, worldLightDir);
}

void main() {
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    if (fullRes.x < 1.0) fullRes = vec2(1024.0, 1024.0);

    // Use global pixel coord so each tile casts the correct view ray
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = (globalCoord - 0.5 * fullRes) / fullRes.y;
    
    // Camera setup - fixed position, volume rotates
    // Scale camera position from 0-1 UI range to world coords
    vec3 ro = cameraPosition * vec3(-1.0, 1.0, 1.0) * 3.5;
    
    // Camera looks at origin; handle case when at origin
    vec3 forward;
    if (length(ro) < 0.001) {
        forward = vec3(0.0, 0.0, -1.0);  // Default: look into volume
    } else {
        forward = normalize(-ro);  // Look toward origin
    }
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    // Handle looking straight up/down
    if (abs(dot(forward, worldUp)) > 0.999) {
        worldUp = vec3(0.0, 0.0, 1.0);
    }
    vec3 right = normalize(cross(worldUp, forward));
    vec3 up = cross(forward, right);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);
    
    // Light direction is fixed in world space (not view space)
    vec3 worldLightDir = normalize(lightDirection * vec3(-1.0, 1.0, 1.0));
    
    // Rotate ray into volume space
    float angle = time * TAU * float(orbitSpeed);
    float c = cos(angle);
    float s = sin(angle);
    // Rotation around Y axis
    vec3 roVol = vec3(ro.x * c + ro.z * s, ro.y, -ro.x * s + ro.z * c);
    vec3 rdVol = vec3(rd.x * c + rd.z * s, rd.y, -rd.x * s + rd.z * c);
    
    vec3 color;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    float depth = 1.0;
    float alpha = 1.0;
    
    IsoHit hit = raymarch(roVol, rdVol);
    if (hit.hit) {
        if (hit.atBoundary) {
            normal = calcBoundaryNormal(hit.pos);
        } else {
            normal = calcNormal(hit.pos);
        }
        // Rotate normal back to world space
        normal = vec3(normal.x * c - normal.z * s, normal.y, normal.x * s + normal.z * c);
        // Use world-space rd for consistent lighting (normal is in world space)
        color = shade(hit.pos, normal, rd, worldLightDir);
        depth = hit.dist / MAX_DIST;
    } else {
        color = bgColor;
        alpha = bgAlpha;
    }
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    fragColor = vec4(color, alpha);
    geoOut = vec4(normal * 0.5 + 0.5, depth);
}
`,wgsl:`/*
 * Universal 3D volume renderer with advanced lighting (WGSL)
 * 
 * Raymarches through a 3D volume texture to find isosurfaces,
 * with configurable bounding shapes and Blinn-Phong lighting.
 * 
 * Bounding shapes: cube, sphere
 * Lighting: diffuse, specular, ambient, rim
 */

// Uniforms struct with explicit padding to match std140 layout
// Field names MUST match definition.js uniform names exactly
struct Uniforms {
    // Built-in globals - vec2f has 8-byte align
    resolution: vec2f,    // offset 0, size 8
    time: f32,            // offset 8, size 4
    threshold: f32,       // offset 12, size 4
    // i32 scalars can be packed sequentially (4-byte align each)
    volumeSize: i32,      // offset 16, size 4
    invert: i32,          // offset 20, size 4  
    shape: i32,           // offset 24, size 4
    orbitSpeed: i32,      // offset 28, size 4
    // vec3f has 16-byte align, so cameraPosition starts at offset 32
    cameraPosition: vec3f,   // offset 32, size 12
    // bgAlpha can fit after cameraPosition
    bgAlpha: f32,         // offset 44, size 4
    // Next vec3f must align to 16 bytes -> offset 48
    bgColor: vec3f,       // offset 48, size 12
    diffuseIntensity: f32,   // offset 60, size 4
    // Next vec3f must align to 16 bytes -> offset 64
    lightDirection: vec3f,   // offset 64, size 12
    specularIntensity: f32,  // offset 76, size 4
    // Next vec3f must align to 16 bytes -> offset 80
    diffuseColor: vec3f,     // offset 80, size 12
    shininess: f32,          // offset 92, size 4
    // Next vec3f must align to 16 bytes -> offset 96
    specularColor: vec3f,    // offset 96, size 12
    rimIntensity: f32,       // offset 108, size 4
    // Next vec3f must align to 16 bytes -> offset 112
    ambientColor: vec3f,     // offset 112, size 12
    rimPower: f32,           // offset 124, size 4
    // Next vec2f aligns to 8 bytes -> offset 128
    tileOffset: vec2f,       // offset 128, size 8
    fullResolution: vec2f,   // offset 136, size 8
    // Struct size: 144 bytes (16-byte aligned)
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var volumeCache: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    // Fullscreen triangle - 3 vertices that cover the entire screen when clipped
    let positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0)
    );
    let pos = positions[vertexIndex];
    var output: VertexOutput;
    output.position = vec4f(pos, 0.0, 1.0);
    output.uv = pos * 0.5 + 0.5;
    return output;
}

struct FragmentOutput {
    @location(0) color: vec4f,
    @location(1) geo: vec4f,
}

const TAU: f32 = 6.283185307179586;
const PI: f32 = 3.141592653589793;
const MAX_STEPS: i32 = 256;
const MAX_DIST: f32 = 10.0;
const NEAR_CLIP: f32 = 0.01;

// Helper to convert 3D texel coords to 2D atlas texel coords
fn atlasTexel(p: vec3i, volSize: i32) -> vec2i {
    return vec2i(p.x, p.y + p.z * volSize);
}

// Sample the cached 3D volume with trilinear interpolation
fn sampleVolume(worldPos: vec3f) -> vec4f {
    let volSize = u.volumeSize;
    let volSizeF = f32(volSize);
    
    // Convert world position [-1, 1] to normalized volume coords [0, 1]
    var uvw = worldPos * 0.5 + 0.5;
    uvw = clamp(uvw, vec3f(0.0), vec3f(1.0));
    
    // Convert to texel coordinates
    let texelPos = uvw * (volSizeF - 1.0);
    let texelFloor = floor(texelPos);
    let frac = texelPos - texelFloor;
    
    let i0 = vec3i(texelFloor);
    let i1 = min(i0 + 1, vec3i(volSize - 1));
    
    // Trilinear filtering - sample all 8 corners
    let c000 = textureLoad(volumeCache, atlasTexel(vec3i(i0.x, i0.y, i0.z), volSize), 0);
    let c100 = textureLoad(volumeCache, atlasTexel(vec3i(i1.x, i0.y, i0.z), volSize), 0);
    let c010 = textureLoad(volumeCache, atlasTexel(vec3i(i0.x, i1.y, i0.z), volSize), 0);
    let c110 = textureLoad(volumeCache, atlasTexel(vec3i(i1.x, i1.y, i0.z), volSize), 0);
    let c001 = textureLoad(volumeCache, atlasTexel(vec3i(i0.x, i0.y, i1.z), volSize), 0);
    let c101 = textureLoad(volumeCache, atlasTexel(vec3i(i1.x, i0.y, i1.z), volSize), 0);
    let c011 = textureLoad(volumeCache, atlasTexel(vec3i(i0.x, i1.y, i1.z), volSize), 0);
    let c111 = textureLoad(volumeCache, atlasTexel(vec3i(i1.x, i1.y, i1.z), volSize), 0);
    
    // Trilinear interpolation
    let c00 = mix(c000, c100, frac.x);
    let c10 = mix(c010, c110, frac.x);
    let c01 = mix(c001, c101, frac.x);
    let c11 = mix(c011, c111, frac.x);
    
    let c0 = mix(c00, c10, frac.y);
    let c1 = mix(c01, c11, frac.y);
    
    return mix(c0, c1, frac.z);
}

// Get the scalar field value at a point
fn getField(p: vec3f) -> f32 {
    var val = sampleVolume(p).r;
    if (u.invert == 1) {
        val = 1.0 - val;
    }
    return u.threshold - val;
}

// Compute smooth normal using central differences
fn calcNormal(p: vec3f) -> vec3f {
    let eps = 2.0 / f32(u.volumeSize);
    
    let dx = getField(p + vec3f(eps, 0.0, 0.0)) - getField(p - vec3f(eps, 0.0, 0.0));
    let dy = getField(p + vec3f(0.0, eps, 0.0)) - getField(p - vec3f(0.0, eps, 0.0));
    let dz = getField(p + vec3f(0.0, 0.0, eps)) - getField(p - vec3f(0.0, 0.0, eps));
    
    let n = vec3f(dx, dy, dz);
    let len = length(n);
    if (len < 0.0001) {
        return vec3f(0.0, 1.0, 0.0);
    }
    
    return n / len;
}

// Compute outward normal for bounding shape at position p
fn calcBoundaryNormal(p: vec3f) -> vec3f {
    if (u.shape == 0) {
        // Cube: normal points outward from nearest face
        let absP = abs(p);
        if (absP.x > absP.y && absP.x > absP.z) {
            return vec3f(sign(p.x), 0.0, 0.0);
        } else if (absP.y > absP.z) {
            return vec3f(0.0, sign(p.y), 0.0);
        } else {
            return vec3f(0.0, 0.0, sign(p.z));
        }
    } else {
        // Sphere: normal is just the normalized position
        return normalize(p);
    }
}

// Ray-box intersection (cube shape)
fn intersectBox(ro: vec3f, rd: vec3f) -> vec2f {
    let invRd = 1.0 / rd;
    let t0 = (-1.0 - ro) * invRd;
    let t1 = (1.0 - ro) * invRd;
    let tmin = min(t0, t1);
    let tmax = max(t0, t1);
    let tEnter = max(max(tmin.x, tmin.y), tmin.z);
    let tExit = min(min(tmax.x, tmax.y), tmax.z);
    
    if (tEnter > tExit || tExit < 0.0) {
        return vec2f(-1.0);
    }
    return vec2f(tEnter, tExit);
}

// Ray-sphere intersection (radius 1 centered at origin)
fn intersectSphere(ro: vec3f, rd: vec3f) -> vec2f {
    let b = dot(ro, rd);
    let c = dot(ro, ro) - 1.0;
    let disc = b * b - c;
    
    if (disc < 0.0) {
        return vec2f(-1.0);
    }
    
    let sqrtDisc = sqrt(disc);
    let tEnter = -b - sqrtDisc;
    let tExit = -b + sqrtDisc;
    
    if (tExit < 0.0) {
        return vec2f(-1.0);
    }
    return vec2f(tEnter, tExit);
}

// Get ray bounds based on selected shape
fn getRayBounds(ro: vec3f, rd: vec3f) -> vec2f {
    var t: vec2f;
    
    if (u.shape == 0) {
        t = intersectBox(ro, rd);
    } else {
        t = intersectSphere(ro, rd);
    }
    
    if (t.x < 0.0 && t.y < 0.0) {
        return vec2f(-1.0);
    }
    
    // Apply near clip (handles camera inside volume)
    t.x = max(t.x, NEAR_CLIP);
    
    return t;
}

// Isosurface hit result
struct IsoHit {
    dist: f32,
    pos: vec3f,
    hit: bool,
    atBoundary: bool,  // true if hit at bounding shape edge, not isosurface
}

// Raymarching with bisection refinement
fn raymarch(ro: vec3f, rd: vec3f) -> IsoHit {
    var result: IsoHit;
    result.hit = false;
    result.dist = -1.0;
    result.pos = vec3f(0.0);
    result.atBoundary = false;
    
    let bounds = getRayBounds(ro, rd);
    if (bounds.x < 0.0) {
        return result;
    }
    
    let tStart = bounds.x;
    let tEnd = bounds.y;
    
    // Step size based on volume resolution
    let stepSize = 1.5 / f32(u.volumeSize);
    
    // March through volume
    var t = tStart;
    var prevField = getField(ro + rd * t);
    
    // If we start inside solid, hit immediately at boundary
    if (prevField < 0.0) {
        result.hit = true;
        result.dist = tStart;
        result.pos = ro + rd * tStart;
        result.atBoundary = true;
        return result;
    }
    
    for (var i = 0; i < MAX_STEPS; i++) {
        t += stepSize;
        if (t > tEnd) {
            break;
        }
        
        let p = ro + rd * t;
        
        // For bounded shapes, check if still in bounds
        if (u.shape == 0) {
            // Cube bounds check
            if (any(p < vec3f(-1.0)) || any(p > vec3f(1.0))) {
                break;
            }
        } else if (u.shape == 1) {
            // Sphere bounds check
            if (dot(p, p) > 1.0) {
                break;
            }
        }
        
        let field = getField(p);
        
        // Check for sign change (threshold crossing)
        if (prevField * field < 0.0) {
            // Found crossing - refine with bisection
            var tLo = t - stepSize;
            var tHi = t;
            var bisectPrevField = prevField;
            
            for (var j = 0; j < 8; j++) {
                let tMid = (tLo + tHi) * 0.5;
                let fMid = getField(ro + rd * tMid);
                
                if (bisectPrevField * fMid < 0.0) {
                    tHi = tMid;
                } else {
                    tLo = tMid;
                    bisectPrevField = fMid;
                }
            }
            
            result.hit = true;
            result.dist = (tLo + tHi) * 0.5;
            result.pos = ro + rd * result.dist;
            return result;
        }
        
        prevField = field;
    }
    
    return result;
}

// Advanced lighting calculation
fn applyLighting(baseColor: vec3f, n_in: vec3f, rd: vec3f, worldLightDir: vec3f) -> vec3f {
    let lightDir = normalize(worldLightDir);
    let viewDir = -rd;
    
    // Ensure normal faces the camera
    var n = n_in;
    if (dot(n, viewDir) < 0.0) {
        n = -n;
    }
    
    // Ambient lighting
    let ambient = u.ambientColor * baseColor;
    
    // Diffuse lighting (Lambertian)
    let diffuseFactor = max(dot(n, lightDir), 0.0);
    let diffuse = u.diffuseColor * diffuseFactor * baseColor * u.diffuseIntensity;
    
    // Specular lighting (Blinn-Phong)
    let halfDir = normalize(lightDir + viewDir);
    let specAngle = max(dot(halfDir, n), 0.0);
    let specularFactor = pow(specAngle, u.shininess);
    let specular = u.specularColor * specularFactor * u.specularIntensity;
    
    // Fresnel rim lighting
    let rim = pow(1.0 - max(dot(n, viewDir), 0.0), u.rimPower);
    let rimLight = vec3f(rim) * u.rimIntensity;
    
    return ambient + diffuse + specular + rimLight;
}

// Shading - uses RGB from volume for coloring
fn shade(p: vec3f, n: vec3f, rd: vec3f, worldLightDir: vec3f) -> vec3f {
    let volColor = sampleVolume(p);
    var baseColor = volColor.rgb;
    
    // If volume appears grayscale, use neutral gray
    let colorVariance = length(volColor.rgb - vec3f(volColor.r));
    if (colorVariance < 0.01) {
        baseColor = vec3f(0.75);
    }
    
    return applyLighting(baseColor, n, rd, worldLightDir);
}

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var fullRes = select(u.resolution, u.fullResolution, u.fullResolution.x > 0.0);
    if (fullRes.x < 1.0) {
        fullRes = vec2f(1024.0, 1024.0);
    }

    let fragCoord = input.position.xy;
    let uv = ((fragCoord + u.tileOffset) - 0.5 * fullRes) / fullRes.y;
    
    // Camera setup - fixed position, volume rotates
    // Scale camera position from 0-1 UI range to world coords
    let ro = u.cameraPosition * vec3f(-1.0, 1.0, 1.0) * 3.5;
    
    // Camera looks at origin; handle case when at origin
    var forward: vec3f;
    if (length(ro) < 0.001) {
        forward = vec3f(0.0, 0.0, -1.0);  // Default: look into volume
    } else {
        forward = normalize(-ro);  // Look toward origin
    }
    var worldUp = vec3f(0.0, 1.0, 0.0);
    // Handle looking straight up/down
    if (abs(dot(forward, worldUp)) > 0.999) {
        worldUp = vec3f(0.0, 0.0, 1.0);
    }
    let right = normalize(cross(worldUp, forward));
    let up = cross(forward, right);
    
    let rd = normalize(forward + uv.x * right + uv.y * up);
    
    // Light direction is fixed in world space (not view space)
    let worldLightDir = normalize(u.lightDirection * vec3f(-1.0, 1.0, 1.0));
    
    // Rotate ray into volume space
    let angle = u.time * TAU * f32(u.orbitSpeed);
    let c = cos(angle);
    let s = sin(angle);
    // Rotation around Y axis
    let roVol = vec3f(ro.x * c + ro.z * s, ro.y, -ro.x * s + ro.z * c);
    let rdVol = vec3f(rd.x * c + rd.z * s, rd.y, -rd.x * s + rd.z * c);
    
    var color: vec3f;
    var normal = vec3f(0.0, 0.0, 1.0);
    var depth = 1.0;
    var alpha = 1.0;
    
    let hit = raymarch(roVol, rdVol);
    if (hit.hit) {
        if (hit.atBoundary) {
            normal = calcBoundaryNormal(hit.pos);
        } else {
            normal = calcNormal(hit.pos);
        }
        // Rotate normal back to world space
        normal = vec3f(normal.x * c - normal.z * s, normal.y, normal.x * s + normal.z * c);
        // Use world-space rd for consistent lighting (normal is in world space)
        color = shade(hit.pos, normal, rd, worldLightDir);
        depth = hit.dist / MAX_DIST;
    } else {
        color = u.bgColor;
        alpha = u.bgAlpha;
    }
    
    // Gamma correction
    color = pow(color, vec3f(1.0 / 2.2));
    
    var output: FragmentOutput;
    output.color = vec4f(color, alpha);
    output.geo = vec4f(normal * 0.5 + 0.5, depth);
    return output;
}
`}},i=`# renderLit3d

Universal 3D volume raymarcher with advanced lighting controls

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | v64 | v16/v32/v64/v128 | Volume resolution (inherited from upstream) |
| shape | int | cube | cube/sphere | Bounding shape for the volume |
| threshold | float | 0.5 | 0-1 | Surface threshold |
| invert | boolean | false | - | Invert threshold |
| orbitSpeed | int | 1 | -5 to 5 | Volume rotation speed |
| cameraPosition | vec3 | 0,0.1425,1.0 | -1 to 1 | Camera position (scaled 5x, 0,0,0 = center) |
| bgColor | color | 0,0,0 | - | Background color |
| bgAlpha | float | 1 | 0-1 | Background alpha |

### Lighting Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| lightDirection | vec3 | 0.5,0.5,1.0 | - | Direction of the light source |
| diffuseColor | color | 1.0,1.0,1.0 | - | Color of diffuse lighting |
| diffuseIntensity | float | 0.7 | 0-2 | Intensity of diffuse lighting |
| specularColor | color | 1.0,1.0,1.0 | - | Color of specular highlights |
| specularIntensity | float | 0.3 | 0-2 | Intensity of specular highlights |
| shininess | float | 32 | 1-256 | Specular shininess (higher = tighter highlights) |
| ambientColor | color | 0.1,0.1,0.1 | - | Ambient light color |
| rimIntensity | float | 0.15 | 0-1 | Intensity of rim/fresnel lighting |
| rimPower | float | 3.0 | 0.5-8 | Rim lighting falloff power |

## Notes

This effect extends \`render3d\` with full lighting controls, allowing you to fine-tune:

- **Diffuse lighting**: Lambertian shading based on surface normal and light direction
- **Specular lighting**: Blinn-Phong highlights for shiny surfaces
- **Ambient lighting**: Base illumination for shadowed areas
- **Rim lighting**: Fresnel-based edge glow effect

### Bounding Shapes

- **cube**: Classic box-bounded volume (default)
- **sphere**: Spherical boundary for organic shapes
- **plane**: Horizontal slab for terrain/landscape effects
- **none**: Unbounded - marches until max distance (use with care)

### Usage Examples

\`\`\`
// Basic lit 3D noise
noise3d().renderLit3d().write(o0)

// Spherical bounding for organic look
cell3d().renderLit3d(shape: sphere, shininess: 128).write(o0)

// Terrain-style plane rendering
fractal3d().renderLit3d(shape: plane, threshold: 0.3).write(o0)

// Dramatic rim lighting
fractal3d().renderLit3d(rimIntensity: 0.5, rimPower: 2.0, ambientColor: [0.05, 0.05, 0.1]).write(o0)

// Colored lighting
shape3d().renderLit3d(diffuseColor: [1.0, 0.8, 0.6], specularColor: [1.0, 0.9, 0.8]).write(o0)
\`\`\`

The volumeSize parameter is automatically inherited from the upstream 3D effect.

## Usage

\`\`\`
search synth, filter, render

renderLit3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&i&&(n.help=i);var f="render/renderLit3d",u="render",d="renderLit3d",v=n;export{v as default,f as effectId,d as effectName,i as help,u as namespace};
