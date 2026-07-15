/* points/flock */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Flock",namespace:"points",func:"flock",tags:["sim"],description:'2D "Boids" flocking agent simulation',textures:{},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{separation:{type:"float",default:2,uniform:"separation",min:0,max:5,step:.1,ui:{label:"separation",control:"slider",category:"boids"}},alignment:{type:"float",default:1,uniform:"alignment",min:0,max:5,step:.1,ui:{label:"alignment",control:"slider",category:"boids"}},cohesion:{type:"float",default:1,uniform:"cohesion",min:0,max:5,step:.1,ui:{label:"cohesion",control:"slider",category:"boids"}},perceptionRadius:{type:"float",default:50,uniform:"perceptionRadius",min:10,max:200,step:1,ui:{label:"perception",control:"slider",category:"boids"}},separationRadius:{type:"float",default:25,uniform:"separationRadius",min:5,max:100,step:1,ui:{label:"sep radius",control:"slider",category:"boids"}},maxSpeed:{type:"float",default:4,uniform:"maxSpeed",min:.5,max:10,step:.1,ui:{label:"max speed",control:"slider",category:"motion"}},maxForce:{type:"float",default:.3,uniform:"maxForce",min:.01,max:1,step:.01,ui:{label:"max force",control:"slider",category:"motion"}},boundaryMode:{type:"int",default:0,uniform:"boundaryMode",choices:{wrap:0,softWall:1},ui:{label:"boundary",control:"dropdown",category:"motion"}},wallMargin:{type:"float",default:50,uniform:"wallMargin",min:10,max:200,step:1,ui:{label:"wall margin",control:"slider",category:"motion"}},noiseWeight:{type:"float",default:.1,uniform:"noiseWeight",min:0,max:1,step:.01,ui:{label:"noise",control:"slider",category:"motion"}}},passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba"},uniforms:{separation:"separation",alignment:"alignment",cohesion:"cohesion",perceptionRadius:"perceptionRadius",separationRadius:"separationRadius",maxSpeed:"maxSpeed",maxForce:"maxForce",boundaryMode:"boundaryMode",wallMargin:"wallMargin",noiseWeight:"noiseWeight"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform vec2 resolution;
uniform float time;

// Boids parameters
uniform float separation;
uniform float alignment;
uniform float cohesion;
uniform float perceptionRadius;
uniform float separationRadius;
uniform float maxSpeed;
uniform float maxForce;
uniform int boundaryMode;
uniform float wallMargin;
uniform float noiseWeight;

// Input state from pipeline (from pointsEmit)
uniform sampler2D xyzTex;    // [x, y, z, alive]
uniform sampler2D velTex;    // [vx, vy, age, seed]
uniform sampler2D rgbaTex;   // [r, g, b, a]

// Output state (MRT)
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

// === ORIGINAL BOIDS HELPER FUNCTIONS (PRESERVED EXACTLY) ===

uint hash_uint(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint seed) {
    return float(hash_uint(seed)) / 4294967295.0;
}

vec2 hash2(uint seed) {
    return vec2(hash(seed), hash(seed + 1u));
}

float hashFloat(float n) {
    return float(hash_uint(floatBitsToUint(n))) / 4294967295.0;
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0;
    return mix(
        mix(hashFloat(n), hashFloat(n + 1.0), f.x),
        mix(hashFloat(n + 57.0), hashFloat(n + 58.0), f.x),
        f.y
    ) * 2.0 - 1.0;
}

vec2 wrapPosition(vec2 position, vec2 bounds) {
    return mod(position + bounds, bounds);
}

vec2 limitVec(vec2 v, float maxLen) {
    float len = length(v);
    if (len > maxLen && len > 0.0) {
        return v * (maxLen / len);
    }
    return v;
}

vec2 setMag(vec2 v, float mag) {
    float len = length(v);
    if (len > 0.0) {
        return v * (mag / len);
    }
    return v;
}

// Spatial grid parameters - 16x16 grid cells
const int GRID_SIZE = 16;

ivec2 getGridCell(vec2 pos, vec2 res) {
    vec2 cellSize = res / float(GRID_SIZE);
    return ivec2(clamp(pos / cellSize, vec2(0.0), vec2(float(GRID_SIZE - 1))));
}

// === END ORIGINAL HELPER FUNCTIONS ===

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 stateSize = textureSize(xyzTex, 0);
    
    // Read input state from pipeline
    vec4 xyz = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 rgba = texelFetch(rgbaTex, coord, 0);
    
    // Extract components
    // xyz stores normalized coords [0,1], convert to pixel coords for algorithm
    float px = xyz.x;  // normalized x
    float py = xyz.y;  // normalized y
    float alive = xyz.w;
    
    // vel stores: [vx, vy, age, seed] - velocity in pixel space
    float vx = vel.x;
    float vy = vel.y;
    float age = vel.z;
    float seed = vel.w;
    
    uint boidId = uint(coord.x + coord.y * stateSize.x);
    
    // Convert normalized to pixel coords for the algorithm
    vec2 pos = vec2(px, py) * resolution;
    vec2 velocity = vec2(vx, vy);
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        outXYZ = xyz;
        outVel = vel;
        outRGBA = rgba;
        return;
    }
    
    // Initialize velocity on first use (if zero from pointsEmit)
    if (length(velocity) == 0.0 && seed == 0.0) {
        seed = hash(boidId + 99999u);
        float angle = hash(boidId + 12345u) * 6.28318530718;
        float speed = hash(boidId + 23456u) * maxSpeed * 0.5 + maxSpeed * 0.25;
        velocity = vec2(cos(angle), sin(angle)) * speed;
    }
    
    // Attrition is now handled by pointsEmit

    // === ORIGINAL BOIDS ALGORITHM (PRESERVED EXACTLY) ===
    
    vec2 separationForce = vec2(0.0);
    vec2 alignmentSum = vec2(0.0);
    vec2 cohesionSum = vec2(0.0);
    int separationCount = 0;
    int alignmentCount = 0;
    int cohesionCount = 0;
    
    ivec2 myCell = getGridCell(pos, resolution);
    float perceptionSq = perceptionRadius * perceptionRadius;
    float separationSq = separationRadius * separationRadius;
    
    int totalBoids = stateSize.x * stateSize.y;
    
    // Sample neighbors - iterate through nearby agents
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            ivec2 checkCell = myCell + ivec2(dx, dy);
            
            if (boundaryMode == 0) {  // Wrap mode
                checkCell = (checkCell + GRID_SIZE) % GRID_SIZE;
            } else {
                checkCell = clamp(checkCell, ivec2(0), ivec2(GRID_SIZE - 1));
            }
            
            uint cellSeed = uint(checkCell.y * GRID_SIZE + checkCell.x);
            
            for (int s = 0; s < 8; s++) {  // 8 samples per cell
                uint sampleSeed = cellSeed * 31u + uint(s) + uint(time * 10.0);
                int sampleIdx = int(hash_uint(sampleSeed) % uint(totalBoids));
                
                int sx = sampleIdx % stateSize.x;
                int sy = sampleIdx / stateSize.x;
                
                // Skip self
                if (sx == coord.x && sy == coord.y) continue;
                
                vec4 otherXyz = texelFetch(xyzTex, ivec2(sx, sy), 0);
                vec4 otherVel = texelFetch(velTex, ivec2(sx, sy), 0);
                
                // Skip dead agents
                if (otherXyz.w < 0.5) continue;
                
                vec2 otherPos = otherXyz.xy * resolution;
                vec2 otherVelocity = otherVel.xy;
                
                // Calculate distance (with wrapping if needed)
                vec2 diff = otherPos - pos;
                if (boundaryMode == 0) {  // Wrap
                    if (diff.x > resolution.x * 0.5) diff.x -= resolution.x;
                    if (diff.x < -resolution.x * 0.5) diff.x += resolution.x;
                    if (diff.y > resolution.y * 0.5) diff.y -= resolution.y;
                    if (diff.y < -resolution.y * 0.5) diff.y += resolution.y;
                }
                
                float distSq = dot(diff, diff);
                
                // Separation (close neighbors)
                if (distSq < separationSq && distSq > 0.0) {
                    vec2 away = -diff;
                    float dist = sqrt(distSq);
                    separationForce += away / dist;
                    separationCount++;
                }
                
                // Alignment and Cohesion (perception radius)
                if (distSq < perceptionSq && distSq > 0.0) {
                    alignmentSum += otherVelocity;
                    alignmentCount++;
                    
                    cohesionSum += otherPos;
                    cohesionCount++;
                }
            }
        }
    }
    
    // Calculate steering forces
    vec2 steer = vec2(0.0);
    
    // Separation
    if (separationCount > 0) {
        separationForce /= float(separationCount);
        if (length(separationForce) > 0.0) {
            separationForce = setMag(separationForce, maxSpeed);
            separationForce -= velocity;
            separationForce = limitVec(separationForce, maxForce);
            steer += separationForce * separation;
        }
    }
    
    // Alignment
    if (alignmentCount > 0) {
        vec2 avgVel = alignmentSum / float(alignmentCount);
        if (length(avgVel) > 0.0) {
            avgVel = setMag(avgVel, maxSpeed);
            vec2 alignSteer = avgVel - velocity;
            alignSteer = limitVec(alignSteer, maxForce);
            steer += alignSteer * alignment;
        }
    }
    
    // Cohesion
    if (cohesionCount > 0) {
        vec2 avgPos = cohesionSum / float(cohesionCount);
        vec2 desired = avgPos - pos;
        if (length(desired) > 0.0) {
            desired = setMag(desired, maxSpeed);
            vec2 cohesionSteer = desired - velocity;
            cohesionSteer = limitVec(cohesionSteer, maxForce);
            steer += cohesionSteer * cohesion;
        }
    }
    
    // Noise/turbulence
    if (noiseWeight > 0.0) {
        float noiseScale = 0.01;
        float nx = noise2D(pos * noiseScale + time * 0.5);
        float ny = noise2D(pos * noiseScale + vec2(100.0, 100.0) + time * 0.5);
        vec2 noiseForce = vec2(nx, ny) * maxForce * noiseWeight;
        steer += noiseForce;
    }
    
    // Boundary handling
    if (boundaryMode == 1) {  // Soft wall
        vec2 wallForce = vec2(0.0);
        float turnStrength = maxForce * 2.0;
        
        if (pos.x < wallMargin) {
            wallForce.x = turnStrength * (1.0 - pos.x / wallMargin);
        } else if (pos.x > resolution.x - wallMargin) {
            wallForce.x = -turnStrength * (1.0 - (resolution.x - pos.x) / wallMargin);
        }
        
        if (pos.y < wallMargin) {
            wallForce.y = turnStrength * (1.0 - pos.y / wallMargin);
        } else if (pos.y > resolution.y - wallMargin) {
            wallForce.y = -turnStrength * (1.0 - (resolution.y - pos.y) / wallMargin);
        }
        
        steer += wallForce;
    }
    
    // Apply steering and update velocity
    velocity += steer;
    velocity = limitVec(velocity, maxSpeed);
    
    // Update position
    pos += velocity;
    
    // Boundary wrap
    if (boundaryMode == 0) {
        pos = wrapPosition(pos, resolution);
    } else {
        pos = clamp(pos, vec2(1.0), resolution - vec2(1.0));
    }
    
    // Update age
    age += 0.016;
    
    // === END ORIGINAL ALGORITHM ===
    
    // Convert back to normalized coords
    float newPx = pos.x / resolution.x;
    float newPy = pos.y / resolution.y;
    
    outXYZ = vec4(newPx, newPy, xyz.z, 1.0);
    outVel = vec4(velocity, age, seed);
    outRGBA = rgba;
}
`,wgsl:`// Flock agent pass - Common Agent Architecture middleware
// Reads from global_xyz/vel/rgba, applies boids flocking, writes back
// State format: xyz=[x, y, z, alive] vel=[vx, vy, age, seed] rgba=[r, g, b, a]
// Positions in normalized coords [0,1]

struct Uniforms {
    resolution: vec2f,
    time: f32,
    separation: f32,
    alignment: f32,
    cohesion: f32,
    perceptionRadius: f32,
    separationRadius: f32,
    maxSpeed: f32,
    maxForce: f32,
    boundaryMode: i32,
    wallMargin: f32,
    noiseWeight: f32,
}

struct Outputs {
    @location(0) xyz: vec4f,
    @location(1) vel: vec4f,
    @location(2) rgba: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(3) var xyzTex: texture_2d<f32>;
@group(0) @binding(4) var velTex: texture_2d<f32>;
@group(0) @binding(5) var rgbaTex: texture_2d<f32>;

// === ORIGINAL BOIDS HELPER FUNCTIONS (PRESERVED EXACTLY) ===

fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

fn hash2(seed: u32) -> vec2f {
    return vec2f(hash(seed), hash(seed + 1u));
}

fn hashFloat(n: f32) -> f32 {
    return hash(bitcast<u32>(n));
}

fn noise2D(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let ff = f * f * (3.0 - 2.0 * f);
    let n = i.x + i.y * 57.0;
    return mix(
        mix(hashFloat(n), hashFloat(n + 1.0), ff.x),
        mix(hashFloat(n + 57.0), hashFloat(n + 58.0), ff.x),
        ff.y
    ) * 2.0 - 1.0;
}

fn wrapPosition(position: vec2f, bounds: vec2f) -> vec2f {
    return (position % bounds + bounds) % bounds;
}

fn limitVec(v: vec2f, maxLen: f32) -> vec2f {
    let len = length(v);
    if (len > maxLen && len > 0.0) {
        return v * (maxLen / len);
    }
    return v;
}

fn setMag(v: vec2f, mag: f32) -> vec2f {
    let len = length(v);
    if (len > 0.0) {
        return v * (mag / len);
    }
    return v;
}

const GRID_SIZE: i32 = 16;

fn getGridCell(pos: vec2f, res: vec2f) -> vec2i {
    let cellSize = res / f32(GRID_SIZE);
    return vec2i(clamp(pos / cellSize, vec2f(0.0), vec2f(f32(GRID_SIZE - 1))));
}

// === END ORIGINAL HELPER FUNCTIONS ===

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> Outputs {
    let coord = vec2i(fragCoord.xy);
    let stateSize = textureDimensions(xyzTex, 0);
    
    // Read input state from pipeline
    let xyz = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let rgba = textureLoad(rgbaTex, coord, 0);
    
    // Extract components
    let px = xyz.x;  // normalized x
    let py = xyz.y;  // normalized y
    let alive = xyz.w;
    
    // vel stores: [vx, vy, age, seed]
    var vx = vel.x;
    var vy = vel.y;
    var age = vel.z;
    var seed = vel.w;
    
    let boidId = u32(coord.x) + u32(coord.y) * u32(stateSize.x);
    
    // Convert normalized to pixel coords for the algorithm
    var pos = vec2f(px, py) * u.resolution;
    var velocity = vec2f(vx, vy);
    
    // If not alive, pass through unchanged
    if (alive < 0.5) {
        return Outputs(xyz, vel, rgba);
    }
    
    // Initialize velocity on first use (if zero from pointsEmit)
    if (length(velocity) == 0.0 && seed == 0.0) {
        seed = hash(boidId + 99999u);
        let angle = hash(boidId + 12345u) * 6.28318530718;
        let speed = hash(boidId + 23456u) * u.maxSpeed * 0.5 + u.maxSpeed * 0.25;
        velocity = vec2f(cos(angle), sin(angle)) * speed;
    }
    
    // Attrition is now handled by pointsEmit

    // === ORIGINAL BOIDS ALGORITHM (PRESERVED EXACTLY) ===
    
    var separationForce = vec2f(0.0);
    var alignmentSum = vec2f(0.0);
    var cohesionSum = vec2f(0.0);
    var separationCount = 0;
    var alignmentCount = 0;
    var cohesionCount = 0;
    
    let myCell = getGridCell(pos, u.resolution);
    let perceptionSq = u.perceptionRadius * u.perceptionRadius;
    let separationSq = u.separationRadius * u.separationRadius;
    
    let totalBoids = i32(stateSize.x * stateSize.y);
    
    // Sample neighbors
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            var checkCell = myCell + vec2i(dx, dy);
            
            if (u.boundaryMode == 0) {
                checkCell = (checkCell + GRID_SIZE) % GRID_SIZE;
            } else {
                checkCell = clamp(checkCell, vec2i(0), vec2i(GRID_SIZE - 1));
            }
            
            let cellSeed = u32(checkCell.y * GRID_SIZE + checkCell.x);
            
            for (var s = 0; s < 8; s++) {
                let sampleSeed = cellSeed * 31u + u32(s) + u32(u.time * 10.0);
                let sampleIdx = i32(hash_uint(sampleSeed) % u32(totalBoids));
                
                let sx = sampleIdx % i32(stateSize.x);
                let sy = sampleIdx / i32(stateSize.x);
                
                // Skip self
                if (sx == coord.x && sy == coord.y) {
                    continue;
                }
                
                let otherXyz = textureLoad(xyzTex, vec2i(sx, sy), 0);
                let otherVel = textureLoad(velTex, vec2i(sx, sy), 0);
                
                // Skip dead agents
                if (otherXyz.w < 0.5) {
                    continue;
                }
                
                let otherPos = otherXyz.xy * u.resolution;
                let otherVelocity = otherVel.xy;
                
                // Calculate distance (with wrapping if needed)
                var diff = otherPos - pos;
                if (u.boundaryMode == 0) {
                    if (diff.x > u.resolution.x * 0.5) { diff.x -= u.resolution.x; }
                    if (diff.x < -u.resolution.x * 0.5) { diff.x += u.resolution.x; }
                    if (diff.y > u.resolution.y * 0.5) { diff.y -= u.resolution.y; }
                    if (diff.y < -u.resolution.y * 0.5) { diff.y += u.resolution.y; }
                }
                
                let distSq = dot(diff, diff);
                
                // Separation (close neighbors)
                if (distSq < separationSq && distSq > 0.0) {
                    let away = -diff;
                    let dist = sqrt(distSq);
                    separationForce += away / dist;
                    separationCount++;
                }
                
                // Alignment and Cohesion (perception radius)
                if (distSq < perceptionSq && distSq > 0.0) {
                    alignmentSum += otherVelocity;
                    alignmentCount++;
                    cohesionSum += otherPos;
                    cohesionCount++;
                }
            }
        }
    }
    
    // Calculate steering forces
    var steer = vec2f(0.0);
    
    // Separation
    if (separationCount > 0) {
        var sepForce = separationForce / f32(separationCount);
        if (length(sepForce) > 0.0) {
            sepForce = setMag(sepForce, u.maxSpeed);
            sepForce = sepForce - velocity;
            sepForce = limitVec(sepForce, u.maxForce);
            steer += sepForce * u.separation;
        }
    }
    
    // Alignment
    if (alignmentCount > 0) {
        var avgVel = alignmentSum / f32(alignmentCount);
        if (length(avgVel) > 0.0) {
            avgVel = setMag(avgVel, u.maxSpeed);
            var alignSteer = avgVel - velocity;
            alignSteer = limitVec(alignSteer, u.maxForce);
            steer += alignSteer * u.alignment;
        }
    }
    
    // Cohesion
    if (cohesionCount > 0) {
        let avgPos = cohesionSum / f32(cohesionCount);
        var desired = avgPos - pos;
        if (length(desired) > 0.0) {
            desired = setMag(desired, u.maxSpeed);
            var cohesionSteer = desired - velocity;
            cohesionSteer = limitVec(cohesionSteer, u.maxForce);
            steer += cohesionSteer * u.cohesion;
        }
    }
    
    // Noise/turbulence
    if (u.noiseWeight > 0.0) {
        let noiseScale = 0.01;
        let nx = noise2D(pos * noiseScale + u.time * 0.5);
        let ny = noise2D(pos * noiseScale + vec2f(100.0, 100.0) + u.time * 0.5);
        let noiseForce = vec2f(nx, ny) * u.maxForce * u.noiseWeight;
        steer += noiseForce;
    }
    
    // Boundary handling
    if (u.boundaryMode == 1) {
        var wallForce = vec2f(0.0);
        let turnStrength = u.maxForce * 2.0;
        
        if (pos.x < u.wallMargin) {
            wallForce.x = turnStrength * (1.0 - pos.x / u.wallMargin);
        } else if (pos.x > u.resolution.x - u.wallMargin) {
            wallForce.x = -turnStrength * (1.0 - (u.resolution.x - pos.x) / u.wallMargin);
        }
        
        if (pos.y < u.wallMargin) {
            wallForce.y = turnStrength * (1.0 - pos.y / u.wallMargin);
        } else if (pos.y > u.resolution.y - u.wallMargin) {
            wallForce.y = -turnStrength * (1.0 - (u.resolution.y - pos.y) / u.wallMargin);
        }
        
        steer += wallForce;
    }
    
    // Apply steering and update velocity
    velocity += steer;
    velocity = limitVec(velocity, u.maxSpeed);
    
    // Update position
    pos += velocity;
    
    // Boundary wrap
    if (u.boundaryMode == 0) {
        pos = wrapPosition(pos, u.resolution);
    } else {
        pos = clamp(pos, vec2f(1.0), u.resolution - vec2f(1.0));
    }
    
    // Update age
    age += 0.016;
    
    // === END ORIGINAL ALGORITHM ===
    
    // Convert back to normalized coords
    let newPx = pos.x / u.resolution.x;
    let newPy = pos.y / u.resolution.y;
    
    return Outputs(
        vec4f(newPx, newPy, xyz.z, 1.0),
        vec4f(velocity, age, seed),
        rgba
    );
}
`},passthrough:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(inputTex, uv);
}
`,wgsl:`struct Uniforms {
    resolution: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputTexSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    return textureSample(inputTex, inputTexSampler, vec2f(uv.x, 1.0 - uv.y));
}
`}},a=`# flock

2D "Boids" flocking agent simulation

## Description

Agents follow classic flocking rules:
- **Separation**: Steer to avoid crowding neighbors
- **Alignment**: Steer towards average heading of neighbors
- **Cohesion**: Steer towards average position of neighbors

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| separation | float | 2 | 0-5 | Separation |
| alignment | float | 1 | 0-5 | Alignment |
| cohesion | float | 1 | 0-5 | Cohesion |
| perceptionRadius | float | 50 | 10-200 | Perception |
| separationRadius | float | 25 | 5-100 | Separation radius |
| maxSpeed | float | 4 | 0.5-10 | Max speed |
| maxForce | float | 0.3 | 0.01-1 | Max force |
| boundaryMode | int | wrap | wrap/softWall | Boundary |
| wallMargin | float | 50 | 10-200 | Wall margin |
| noiseWeight | float | 0.1 | 0-1 | Noise |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .flock()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(i))n.shaders[o]={...e}}n&&a&&(n.help=a);var c="points/flock",d="points",f="flock",p=n;export{p as default,c as effectId,f as effectName,a as help,d as namespace};
