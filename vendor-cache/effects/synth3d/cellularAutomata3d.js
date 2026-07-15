/* synth3d/cellularAutomata3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Cellular Automata 3D",namespace:"synth3d",func:"cellularAutomata3d",tags:["3d","sim"],description:"3D cellular automata simulation",textures:{volumeCache:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"},global_ca_state:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024},format:"rgba16f"}},globals:{volumeSize:{type:"int",default:32,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},seed:{type:"int",default:1,min:1,max:100,uniform:"seed",ui:{control:!1}},ruleIndex:{type:"int",default:0,uniform:"ruleIndex",choices:{rule445M:0,rule678:1,amoeba:2,builder1:3,builder2:4,clouds:5,crystalGrowth:6,diamoeba:7,pyroclastic:8,slowDecay:9,spikeyGrowth:10},ui:{label:"rules",control:"dropdown",category:"rules"}},neighborMode:{type:"int",default:0,uniform:"neighborMode",choices:{moore:0,vonNeumann:1},ui:{label:"neighborhood",control:"dropdown",category:"rules"}},speed:{type:"int",default:1,min:0,max:10,zero:0,randMin:1,uniform:"speed",ui:{label:"sim speed",control:"slider"}},density:{type:"float",default:50,min:1,max:100,uniform:"density",ui:{label:"density",control:"slider"}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,age:1},ui:{label:"color mode",control:"dropdown"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{label:"reset",control:"button",buttonLabel:"reset"}},source:{type:"volume",default:"vol0",ui:{label:"source vol",category:"input"}},geoSource:{type:"geometry",default:"geo0",ui:{label:"source geo",category:"input"}},weight:{type:"float",default:0,min:0,max:100,uniform:"weight",ui:{label:"input weight",control:"slider",category:"input"}}},defaultProgram:`search synth3d, filter3d, render

cellularAutomata3d(ruleIndex: diamoeba)
.render3d()
.write(o0)`,passes:[{name:"simulate",program:"simulate",viewport:{width:{param:"volumeSize",default:32},height:{param:"volumeSize",power:2,default:1024}},inputs:{stateTex:"global_ca_state",seedTex:"source"},outputs:{color:"global_ca_state"}}],outputTex3d:"global_ca_state",outputGeo:"geoBuffer"});var o={simulate:{glsl:`/*
 * 3D Cellular Automata simulation shader (GLSL)
 * Implements various 3D CA rules with Moore (26) or Von Neumann (6) neighborhoods
 * Self-initializing: detects empty buffer and seeds on first frame
 */

#version 300 es
precision highp float;

uniform float time;
uniform int seed;
uniform int volumeSize;
uniform int ruleIndex;
uniform int neighborMode;
uniform float speed;
uniform float density;
uniform float weight;
uniform bool resetState;
uniform sampler2D stateTex;
uniform sampler2D seedTex;  // 3D input volume atlas (inputTex3d)

out vec4 fragColor;

// Hash for initialization
float hash3(vec3 p) {
    p = p + float(seed) * 0.1;
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}

// Helper to convert 3D voxel coords to 2D atlas texel coords
ivec2 atlasTexel(ivec3 p, int volSize) {
    // Wrap coordinates for periodic boundary
    ivec3 wrapped = ivec3(
        (p.x + volSize) % volSize,
        (p.y + volSize) % volSize,
        (p.z + volSize) % volSize
    );
    return ivec2(wrapped.x, wrapped.y + wrapped.z * volSize);
}

// Sample state at voxel coordinate with wrapping
vec4 sampleState(ivec3 voxel, int volSize) {
    return texelFetch(stateTex, atlasTexel(voxel, volSize), 0);
}

// Sample seed texture at voxel coordinate (for inputTex3d seeding)
vec4 sampleSeed(ivec3 voxel, int volSize) {
    return texelFetch(seedTex, atlasTexel(voxel, volSize), 0);
}

// Count alive neighbors using Moore neighborhood (26 neighbors)
int countMooreNeighbors(ivec3 voxel, int volSize) {
    int count = 0;
    for (int dz = -1; dz <= 1; dz++) {
        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                if (dx == 0 && dy == 0 && dz == 0) continue;
                vec4 neighbor = sampleState(voxel + ivec3(dx, dy, dz), volSize);
                if (neighbor.r > 0.5) count++;
            }
        }
    }
    return count;
}

// Count alive neighbors using Von Neumann neighborhood (6 neighbors)
int countVonNeumannNeighbors(ivec3 voxel, int volSize) {
    int count = 0;
    vec4 xp = sampleState(voxel + ivec3(1, 0, 0), volSize);
    vec4 xn = sampleState(voxel + ivec3(-1, 0, 0), volSize);
    vec4 yp = sampleState(voxel + ivec3(0, 1, 0), volSize);
    vec4 yn = sampleState(voxel + ivec3(0, -1, 0), volSize);
    vec4 zp = sampleState(voxel + ivec3(0, 0, 1), volSize);
    vec4 zn = sampleState(voxel + ivec3(0, 0, -1), volSize);
    
    if (xp.r > 0.5) count++;
    if (xn.r > 0.5) count++;
    if (yp.r > 0.5) count++;
    if (yn.r > 0.5) count++;
    if (zp.r > 0.5) count++;
    if (zn.r > 0.5) count++;
    
    return count;
}

/*
 * 3D CA Rulesets (Born/Survive notation with Moore 26-neighborhood)
 * 
 * 0: 445M       - B4/S4 (stable crystalline structures)
 * 1: 678 678    - B6,7,8/S6,7,8 (cloud-like growth)
 * 2: Amoeba     - B9-26/S5-7,12-13,15 (organic amoeba shapes)
 * 3: Builder1   - B4,6,8-9/S3-6,9 (structured builders)
 * 4: Builder2   - B3/S2-3 (classic 3D life variant)
 * 5: Clouds     - B13-26/S13-26 (dense cloud formations)
 * 6: Crystal    - B1,3/S1-2,4 (crystal growth patterns)
 * 7: Diamoeba   - B5-7,12/S5-8 (diamond-like amoeba)
 * 8: Pyroclastic- B4,5,6,7/S6,7,8 (volcanic-like expansion)
 * 9: Slow Decay - B4/S3,4 (slowly decaying structures)
 * 10: Spikey    - B5-8/S5-6,9 (spikey growth patterns)
 */

// Check if cell should be born
bool shouldBeBorn(int n, int rule) {
    if (rule == 0) return n == 4;                                       // 445M
    if (rule == 1) return n >= 6 && n <= 8;                             // 678 678
    if (rule == 2) return n >= 9;                                        // Amoeba
    if (rule == 3) return n == 4 || n == 6 || n == 8 || n == 9;         // Builder1
    if (rule == 4) return n == 3;                                        // Builder2 (3D Life)
    if (rule == 5) return n >= 13;                                       // Clouds
    if (rule == 6) return n == 1 || n == 3;                              // Crystal
    if (rule == 7) return n >= 5 && n <= 7 || n == 12;                  // Diamoeba
    if (rule == 8) return n >= 4 && n <= 7;                              // Pyroclastic
    if (rule == 9) return n == 4;                                        // Slow Decay
    if (rule == 10) return n >= 5 && n <= 8;                             // Spikey
    return false;
}

// Check if cell should survive
bool shouldSurvive(int n, int rule) {
    if (rule == 0) return n == 4;                                        // 445M
    if (rule == 1) return n >= 6 && n <= 8;                              // 678 678
    if (rule == 2) return (n >= 5 && n <= 7) || n == 12 || n == 13 || n == 15;  // Amoeba
    if (rule == 3) return (n >= 3 && n <= 6) || n == 9;                  // Builder1
    if (rule == 4) return n == 2 || n == 3;                              // Builder2 (3D Life)
    if (rule == 5) return n >= 13;                                       // Clouds
    if (rule == 6) return n == 1 || n == 2 || n == 4;                    // Crystal
    if (rule == 7) return n >= 5 && n <= 8;                              // Diamoeba
    if (rule == 8) return n >= 6 && n <= 8;                              // Pyroclastic
    if (rule == 9) return n == 3 || n == 4;                              // Slow Decay
    if (rule == 10) return n == 5 || n == 6 || n == 9;                   // Spikey
    return false;
}

void main() {
    int volSize = volumeSize;
    float volSizeF = float(volSize);
    
    // Decode voxel position from atlas
    ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
    int x = pixelCoord.x;
    int y = pixelCoord.y % volSize;
    int z = pixelCoord.y / volSize;
    ivec3 voxel = ivec3(x, y, z);
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        fragColor = vec4(0.0);
        return;
    }
    
    // Current state
    vec4 state = sampleState(voxel, volSize);
    float alive = state.r;
    float age = state.g;
    
    // Self-initialization or reset: detect empty buffer (first frame) or reset button
    bool bufferIsEmpty = (state.r == 0.0 && state.g == 0.0 && state.b == 0.0 && state.a == 0.0);
    
    if (bufferIsEmpty || resetState) {
        // Check if we have input from seedTex (inputTex3d)
        vec4 seedVal = sampleSeed(voxel, volSize);
        bool hasSeedInput = (seedVal.r > 0.0 || seedVal.g > 0.0 || seedVal.b > 0.0);
        
        if (hasSeedInput) {
            // Use seed texture luminance to determine initial alive state
            float lum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
            alive = lum > 0.5 ? 1.0 : 0.0;
            age = 0.0;
        } else {
            // Initialize with random sparse distribution
            vec3 p = vec3(float(x), float(y), float(z));
            float h = hash3(p);
            float threshold = density * 0.01;
            
            // Seed a sphere in the center plus random cells
            vec3 center = vec3(volSizeF * 0.5);
            float dist = length(p - center);
            float radius = volSizeF * 0.15;
            
            if (h < threshold || dist < radius) {
                alive = 1.0;
                age = 0.0;
            } else {
                alive = 0.0;
                age = 0.0;
            }
        }
        
        fragColor = vec4(alive, alive, alive, 1.0);
        return;
    }
    
    // Count neighbors based on neighborhood mode
    int neighbors;
    if (neighborMode == 0) {
        neighbors = countMooreNeighbors(voxel, volSize);
    } else {
        neighbors = countVonNeumannNeighbors(voxel, volSize);
    }
    
    // Apply CA rules
    float newAlive = 0.0;
    float newAge = age;
    
    if (alive > 0.5) {
        // Cell is alive - check survival
        if (shouldSurvive(neighbors, ruleIndex)) {
            newAlive = 1.0;
            newAge = min(age + 0.01, 1.0);  // Age increases while alive
        } else {
            newAlive = 0.0;
            newAge = 0.0;
        }
    } else {
        // Cell is dead - check birth
        if (shouldBeBorn(neighbors, ruleIndex)) {
            newAlive = 1.0;
            newAge = 0.0;
        } else {
            newAlive = 0.0;
            newAge = 0.0;
        }
    }
    
    // Speed control - interpolate between states
    float animSpeed = speed * 0.01;
    float finalAlive = mix(alive, newAlive, animSpeed);
    float finalAge = mix(age, newAge, animSpeed);
    
    // Apply input weight blending from seedTex (inputTex3d)
    if (weight > 0.0) {
        vec4 seedVal = sampleSeed(voxel, volSize);
        float seedLum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
        finalAlive = mix(finalAlive, seedLum, weight * 0.01);
    }
    
    fragColor = vec4(finalAlive, finalAlive, finalAlive, 1.0);
}
`,wgsl:`/*
 * 3D Cellular Automata simulation shader (WGSL)
 * Implements various 3D CA rules with Moore (26) or Von Neumann (6) neighborhoods
 * Self-initializing: detects empty buffer and seeds on first frame
 */

@group(0) @binding(0) var<uniform> volumeSize: i32;
@group(0) @binding(1) var<uniform> seed: i32;
@group(0) @binding(2) var<uniform> ruleIndex: i32;
@group(0) @binding(3) var<uniform> neighborMode: i32;
@group(0) @binding(4) var<uniform> speed: f32;
@group(0) @binding(5) var<uniform> density: f32;
@group(0) @binding(6) var<uniform> weight: f32;
@group(0) @binding(7) var<uniform> resetState: i32;
@group(0) @binding(8) var stateTex: texture_2d<f32>;
@group(0) @binding(9) var seedTex: texture_2d<f32>;  // 3D input volume atlas (inputTex3d)

// Hash for initialization
fn hash3(p: vec3<f32>, s: f32) -> f32 {
    var pp = p + s * 0.1;
    pp = fract(pp * vec3<f32>(0.1031, 0.1030, 0.0973));
    pp = pp + dot(pp, pp.yxz + 33.33);
    return fract((pp.x + pp.y) * pp.z);
}

// Helper to convert 3D voxel coords to 2D atlas texel coords with wrapping
fn atlasTexel(p: vec3<i32>, volSize: i32) -> vec2<i32> {
    // Wrap coordinates for periodic boundary
    let wrapped = vec3<i32>(
        (p.x + volSize) % volSize,
        (p.y + volSize) % volSize,
        (p.z + volSize) % volSize
    );
    return vec2<i32>(wrapped.x, wrapped.y + wrapped.z * volSize);
}

// Sample state at voxel coordinate with wrapping
fn sampleState(voxel: vec3<i32>, volSize: i32) -> vec4<f32> {
    return textureLoad(stateTex, atlasTexel(voxel, volSize), 0);
}

// Sample seed texture at voxel coordinate (for inputTex3d seeding)
fn sampleSeed(voxel: vec3<i32>, volSize: i32) -> vec4<f32> {
    return textureLoad(seedTex, atlasTexel(voxel, volSize), 0);
}

// Count alive neighbors using Moore neighborhood (26 neighbors)
fn countMooreNeighbors(voxel: vec3<i32>, volSize: i32) -> i32 {
    var count: i32 = 0;
    for (var dz: i32 = -1; dz <= 1; dz = dz + 1) {
        for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
            for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
                if (dx == 0 && dy == 0 && dz == 0) { continue; }
                let neighbor = sampleState(voxel + vec3<i32>(dx, dy, dz), volSize);
                if (neighbor.r > 0.5) { count = count + 1; }
            }
        }
    }
    return count;
}

// Count alive neighbors using Von Neumann neighborhood (6 neighbors)
fn countVonNeumannNeighbors(voxel: vec3<i32>, volSize: i32) -> i32 {
    var count: i32 = 0;
    let xp = sampleState(voxel + vec3<i32>(1, 0, 0), volSize);
    let xn = sampleState(voxel + vec3<i32>(-1, 0, 0), volSize);
    let yp = sampleState(voxel + vec3<i32>(0, 1, 0), volSize);
    let yn = sampleState(voxel + vec3<i32>(0, -1, 0), volSize);
    let zp = sampleState(voxel + vec3<i32>(0, 0, 1), volSize);
    let zn = sampleState(voxel + vec3<i32>(0, 0, -1), volSize);
    
    if (xp.r > 0.5) { count = count + 1; }
    if (xn.r > 0.5) { count = count + 1; }
    if (yp.r > 0.5) { count = count + 1; }
    if (yn.r > 0.5) { count = count + 1; }
    if (zp.r > 0.5) { count = count + 1; }
    if (zn.r > 0.5) { count = count + 1; }
    
    return count;
}

// Check if cell should be born
fn shouldBeBorn(n: i32, rule: i32) -> bool {
    if (rule == 0) { return n == 4; }                                   // 445M
    if (rule == 1) { return n >= 6 && n <= 8; }                         // 678 678
    if (rule == 2) { return n >= 9; }                                   // Amoeba
    if (rule == 3) { return n == 4 || n == 6 || n == 8 || n == 9; }     // Builder1
    if (rule == 4) { return n == 3; }                                   // Builder2 (3D Life)
    if (rule == 5) { return n >= 13; }                                  // Clouds
    if (rule == 6) { return n == 1 || n == 3; }                         // Crystal
    if (rule == 7) { return (n >= 5 && n <= 7) || n == 12; }            // Diamoeba
    if (rule == 8) { return n >= 4 && n <= 7; }                         // Pyroclastic
    if (rule == 9) { return n == 4; }                                   // Slow Decay
    if (rule == 10) { return n >= 5 && n <= 8; }                        // Spikey
    return false;
}

// Check if cell should survive
fn shouldSurvive(n: i32, rule: i32) -> bool {
    if (rule == 0) { return n == 4; }                                    // 445M
    if (rule == 1) { return n >= 6 && n <= 8; }                          // 678 678
    if (rule == 2) { return (n >= 5 && n <= 7) || n == 12 || n == 13 || n == 15; }  // Amoeba
    if (rule == 3) { return (n >= 3 && n <= 6) || n == 9; }              // Builder1
    if (rule == 4) { return n == 2 || n == 3; }                          // Builder2 (3D Life)
    if (rule == 5) { return n >= 13; }                                   // Clouds
    if (rule == 6) { return n == 1 || n == 2 || n == 4; }                // Crystal
    if (rule == 7) { return n >= 5 && n <= 8; }                          // Diamoeba
    if (rule == 8) { return n >= 6 && n <= 8; }                          // Pyroclastic
    if (rule == 9) { return n == 3 || n == 4; }                          // Slow Decay
    if (rule == 10) { return n == 5 || n == 6 || n == 9; }               // Spikey
    return false;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let volSize = volumeSize;
    let volSizeF = f32(volSize);
    
    // Decode voxel position from atlas
    let pixelCoord = vec2<i32>(position.xy);
    let x = pixelCoord.x;
    let y = pixelCoord.y % volSize;
    let z = pixelCoord.y / volSize;
    let voxel = vec3<i32>(x, y, z);
    
    // Bounds check
    if (x >= volSize || y >= volSize || z >= volSize) {
        return vec4<f32>(0.0);
    }
    
    // Current state
    let state = sampleState(voxel, volSize);
    var alive = state.r;
    var age = state.g;
    
    // Self-initialization or reset: detect empty buffer (first frame) or reset button
    let bufferIsEmpty = (state.r == 0.0 && state.g == 0.0 && state.b == 0.0 && state.a == 0.0);
    
    if (bufferIsEmpty || resetState != 0) {
        // Check if we have input from seedTex (inputTex3d)
        let seedVal = sampleSeed(voxel, volSize);
        let hasSeedInput = (seedVal.r > 0.0 || seedVal.g > 0.0 || seedVal.b > 0.0);
        
        if (hasSeedInput) {
            // Use seed texture luminance to determine initial alive state
            let lum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
            if (lum > 0.5) {
                alive = 1.0;
            } else {
                alive = 0.0;
            }
            age = 0.0;
        } else {
            // Initialize with random sparse distribution
            let p = vec3<f32>(f32(x), f32(y), f32(z));
            let h = hash3(p, f32(seed));
            let thresh = density * 0.01;
            
            // Seed a sphere in the center plus random cells
            let center = vec3<f32>(volSizeF * 0.5);
            let dist = length(p - center);
            let radius = volSizeF * 0.15;
            
            if (h < thresh || dist < radius) {
                alive = 1.0;
                age = 0.0;
            } else {
                alive = 0.0;
                age = 0.0;
            }
        }
        
        return vec4<f32>(alive, alive, alive, 1.0);
    }
    
    // Count neighbors based on neighborhood mode
    var neighbors: i32;
    if (neighborMode == 0) {
        neighbors = countMooreNeighbors(voxel, volSize);
    } else {
        neighbors = countVonNeumannNeighbors(voxel, volSize);
    }
    
    // Apply CA rules
    var newAlive: f32 = 0.0;
    var newAge: f32 = age;
    
    if (alive > 0.5) {
        // Cell is alive - check survival
        if (shouldSurvive(neighbors, ruleIndex)) {
            newAlive = 1.0;
            newAge = min(age + 0.01, 1.0);  // Age increases while alive
        } else {
            newAlive = 0.0;
            newAge = 0.0;
        }
    } else {
        // Cell is dead - check birth
        if (shouldBeBorn(neighbors, ruleIndex)) {
            newAlive = 1.0;
            newAge = 0.0;
        } else {
            newAlive = 0.0;
            newAge = 0.0;
        }
    }
    
    // Speed control - interpolate between states
    let animSpeed = speed * 0.01;
    var finalAlive = mix(alive, newAlive, animSpeed);
    let finalAge = mix(age, newAge, animSpeed);
    
    // Apply input weight blending from seedTex (inputTex3d)
    if (weight > 0.0) {
        let seedVal = sampleSeed(voxel, volSize);
        let seedLum = 0.299 * seedVal.r + 0.587 * seedVal.g + 0.114 * seedVal.b;
        finalAlive = mix(finalAlive, seedLum, weight * 0.01);
    }
    
    return vec4<f32>(finalAlive, finalAlive, finalAlive, 1.0);
}
`}},r=`# cellularAutomata3d

3D cellular automata simulation

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| volumeSize | int | x32 | x16/x32/x64/x128 | Volume size |
| seed | int | 1 | 1-100 | - |
| ruleIndex | int | rule445M | rule445M/rule678/amoeba/builder1/builder2/clouds/crystalGrowth/diamoeba/pyroclastic/slowDecay/spikeyGrowth | Rules |
| neighborMode | int | moore | moore/vonNeumann | Neighborhood |
| speed | int | 1 | 0-10 | Sim speed |
| density | float | 50 | 1-100 | Initial density % |
| colorMode | int | mono | mono/age | Color mode |
| resetState | boolean | false | - | State |
| source | volume | vol0 | - | Source volume |
| geoSource | geometry | geo0 | - | Source geometry |
| weight | float | 0 | 0-100 | Input weight |

## Usage

\`\`\`
search synth3d, filter3d, render

noise3d(volumeSize: x32)
  .write3d(vol0, geo0)

cellularAutomata3d(source: read3d(vol0, geo0), geoSource: read3d(vol0, geo0))
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(o))n.shaders[i]={...e}}n&&r&&(n.help=r);var d="synth3d/cellularAutomata3d",f="synth3d",v="cellularAutomata3d",p=n;export{p as default,d as effectId,v as effectName,r as help,f as namespace};
