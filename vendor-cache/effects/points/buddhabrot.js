/* points/buddhabrot */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Buddhabrot",namespace:"points",func:"buddhabrot",tags:["fractal","sim"],description:"Buddhabrot fractal via progressive orbit accumulation",textures:{global_zState:{width:{param:"stateSize",paramDefault:512},height:{param:"stateSize",paramDefault:512},format:"rgba32float"}},outputXyz:"global_xyz",outputVel:"global_vel",outputRgba:"global_rgba",globals:{stateSize:{type:"int",default:512,uniform:"stateSize",ui:{control:!1}},mode:{type:"int",default:0,uniform:"mode",choices:{anti:1,standard:0},ui:{label:"mode",control:"dropdown",category:"fractal"}},maxIter:{type:"int",default:200,uniform:"maxIter",min:20,max:2e3,step:10,ui:{label:"max iterations",control:"slider",category:"fractal"}},minIter:{type:"int",default:1,uniform:"minIter",min:1,max:1e3,step:1,ui:{label:"min iterations",control:"slider",category:"fractal"}},centerX:{type:"float",default:-.5,uniform:"centerX",min:-3,max:3,randChance:0,step:.01,ui:{label:"center x",control:"slider",category:"navigation"}},centerY:{type:"float",default:0,uniform:"centerY",min:-3,max:3,randChance:0,step:.01,ui:{label:"center y",control:"slider",category:"navigation"}},zoom:{type:"float",default:1,uniform:"zoom",min:.1,max:5,step:.1,randMin:.5,randMax:2,ui:{label:"zoom",control:"slider",category:"navigation"}}},defaultProgram:`search points, synth, render

perlin()
  .pointsEmit(stateSize: 512)
  .buddhabrot()
  .pointsRender(intensity: 99)
  .write(o0)

render(o0)`,openCategories:["fractal"],passes:[{name:"agent",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",rgbaTex:"global_rgba"},uniforms:{maxIter:"maxIter",minIter:"minIter",mode:"mode",centerX:"centerX",centerY:"centerY",zoom:"zoom"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"zWrite",program:"zWrite",inputs:{xyzTex:"global_xyz",velTex:"global_vel"},outputs:{fragColor:"global_zState"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform float time;
uniform vec2 resolution;

// Effect parameters
uniform int maxIter;
uniform int minIter;
uniform int mode;
uniform float centerX;
uniform float centerY;
uniform float zoom;

// Input textures
uniform sampler2D xyzTex;
uniform sampler2D velTex;
uniform sampler2D rgbaTex;

// MRT outputs (3 \u2014 matches pointsEmit layout)
layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

uint hash_uint(uint s) {
    uint state = s * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(uint s) {
    return float(hash_uint(s)) / 4294967295.0;
}

// Map complex z to screen [0,1] \u2014 rotated CW 90\xB0 for traditional Buddhabrot orientation
vec2 complexToScreen(vec2 z) {
    return vec2(
        (z.y - centerY) * zoom * zoom * 0.2 + 0.5,
        (centerX - z.x) * zoom * zoom * 0.2 + 0.5
    );
}

// Cardioid + period-2 bulb test
bool inMandelbrotInterior(float cRe, float cIm) {
    float y2 = cIm * cIm;
    float q = (cRe - 0.25) * (cRe - 0.25) + y2;
    if (q * (q + (cRe - 0.25)) <= 0.25 * y2) return true;
    float xp1 = cRe + 1.0;
    return xp1 * xp1 + y2 <= 0.0625;
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 texSize = textureSize(xyzTex, 0);
    int stateSize = texSize.x;

    vec4 pos = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);
    vec4 col = texelFetch(rgbaTex, coord, 0);

    if (pos.w < 0.5) {
        outXYZ = pos;
        outVel = vel;
        outRGBA = col;
        return;
    }

    // Seed varies per agent and per respawn cycle via time
    uint agentSeed = hash_uint(uint(coord.x + coord.y * stateSize))
                   ^ uint(time * 65536.0)
                   ^ uint(vel.z * 137.0);

    bool needsInit = pos.z < 0.25;

    if (needsInit) {
        float cRe = hash(agentSeed) * 3.5 - 2.5;
        float cIm = hash(agentSeed + 1u) * 3.0 - 1.5;

        // Cardioid + bulb rejection for standard mode
        if (mode == 0 && inMandelbrotInterior(cRe, cIm)) {
            outXYZ = vec4(pos.xy, 0.0, 0.0);
            outVel = vel;
            outRGBA = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        // Test orbit to classify
        vec2 z = vec2(0.0);
        int escapeAt = 0;
        int iterCap = min(maxIter, 2048);

        for (int i = 0; i < 2048; i++) {
            if (i >= iterCap) break;
            float zr = z.x * z.x - z.y * z.y + cRe;
            float zi = 2.0 * z.x * z.y + cIm;
            z = vec2(zr, zi);
            if (dot(z, z) > 4.0) {
                escapeAt = i + 1;
                break;
            }
        }

        bool escaped = escapeAt > 0;
        float escapeStep = 0.0;
        float brightness = 0.0;

        if (mode == 0) {
            if (escaped && escapeAt >= minIter) {
                escapeStep = float(escapeAt);
                brightness = 0.03;
            }
        } else {
            if (!escaped) {
                escapeStep = float(iterCap);
                brightness = 0.03;
            }
        }

        // Non-qualifying orbit \u2014 signal death for pointsEmit respawn
        if (brightness == 0.0) {
            outXYZ = vec4(pos.xy, 0.0, 0.0);
            outVel = vel;
            outRGBA = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        // Start deposit at z\u2081 = c
        vec2 screen = complexToScreen(vec2(cRe, cIm));

        outXYZ = vec4(screen, 0.5, 1.0);
        outVel = vec4(cRe, cIm, 1.0, escapeStep);
        outRGBA = vec4(brightness, brightness, brightness, 1.0);
        return;
    }

    // ---- Active deposit phase ----
    // Recompute z from scratch using c and step count (no texture dependency)

    float cRe = vel.x;
    float cIm = vel.y;
    float step = vel.z;
    float escapeStep = vel.w;

    // Recompute z to current step from z\u2080 = 0
    vec2 z = vec2(0.0);
    int currentStep = int(step);
    for (int i = 0; i < 2048; i++) {
        if (i >= currentStep) break;
        float zr = z.x * z.x - z.y * z.y + cRe;
        float zi = 2.0 * z.x * z.y + cIm;
        z = vec2(zr, zi);
    }

    // Advance 8 more steps
    for (int s = 0; s < 8; s++) {
        step += 1.0;

        if (step >= escapeStep) {
            outXYZ = vec4(pos.xy, 0.0, 0.0);
            outVel = vec4(0.0, 0.0, step, 0.0);
            outRGBA = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        float zr = z.x * z.x - z.y * z.y + cRe;
        float zi = 2.0 * z.x * z.y + cIm;
        z = vec2(zr, zi);
    }

    vec2 screen = complexToScreen(z);

    outXYZ = vec4(screen, 0.5, 1.0);
    outVel = vec4(cRe, cIm, step, escapeStep);
    outRGBA = col;
}
`,wgsl:`// Buddhabrot Agent Shader
// 3 MRT outputs \u2014 matches pointsEmit layout

struct Uniforms {
    time: f32,
    resolution: vec2<f32>,
    seed: i32,
    maxIter: i32,
    minIter: i32,
    mode: i32,
    zoom: f32,
    centerX: f32,
    centerY: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(3) var velTex: texture_2d<f32>;
@group(0) @binding(5) var rgbaTex: texture_2d<f32>;

struct Outputs {
    @location(0) outXYZ: vec4<f32>,
    @location(1) outVel: vec4<f32>,
    @location(2) outRGBA: vec4<f32>,
};

fn hash_uint(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(seed: u32) -> f32 {
    return f32(hash_uint(seed)) / 4294967295.0;
}

fn complexToScreen(z: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        (z.y - u.centerY) * u.zoom * u.zoom * 0.2 + 0.5,
        (u.centerX - z.x) * u.zoom * u.zoom * 0.2 + 0.5,
    );
}

fn inMandelbrotInterior(cRe: f32, cIm: f32) -> bool {
    let y2 = cIm * cIm;
    let q = (cRe - 0.25) * (cRe - 0.25) + y2;
    if (q * (q + (cRe - 0.25)) <= 0.25 * y2) { return true; }
    let xp1 = cRe + 1.0;
    return xp1 * xp1 + y2 <= 0.0625;
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> Outputs {
    let coord = vec2<i32>(fragCoord.xy);
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);

    let pos = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);
    let col = textureLoad(rgbaTex, coord, 0);

    if (pos.w < 0.5) {
        return Outputs(pos, vel, col);
    }

    let agentSeed = hash_uint(u32(coord.x + coord.y * stateSize))
                  ^ u32(u.time * 65536.0)
                  ^ u32(vel.z * 137.0);

    let needsInit = pos.z < 0.25;

    if (needsInit) {
        let cRe = hash(agentSeed) * 3.5 - 2.5;
        let cIm = hash(agentSeed + 1u) * 3.0 - 1.5;

        if (u.mode == 0 && inMandelbrotInterior(cRe, cIm)) {
            return Outputs(
                vec4<f32>(pos.xy, 0.0, 0.0),
                vel,
                vec4<f32>(0.0, 0.0, 0.0, 0.0),
            );
        }

        var z = vec2<f32>(0.0, 0.0);
        var escapeAt: i32 = 0;
        let iterCap = min(u.maxIter, 2048);

        for (var i: i32 = 0; i < 2048; i = i + 1) {
            if (i >= iterCap) { break; }
            let zr = z.x * z.x - z.y * z.y + cRe;
            let zi = 2.0 * z.x * z.y + cIm;
            z = vec2<f32>(zr, zi);
            if (dot(z, z) > 4.0) {
                escapeAt = i + 1;
                break;
            }
        }

        let escaped = escapeAt > 0;
        var escapeStep: f32 = 0.0;
        var brightness: f32 = 0.0;

        if (u.mode == 0) {
            if (escaped && escapeAt >= u.minIter) {
                escapeStep = f32(escapeAt);
                brightness = 0.03;
            }
        } else {
            if (!escaped) {
                escapeStep = f32(iterCap);
                brightness = 0.03;
            }
        }

        if (brightness == 0.0) {
            return Outputs(
                vec4<f32>(pos.xy, 0.0, 0.0),
                vel,
                vec4<f32>(0.0, 0.0, 0.0, 0.0),
            );
        }

        // Start deposit at z\u2081 = c
        let screen = complexToScreen(vec2<f32>(cRe, cIm));

        return Outputs(
            vec4<f32>(screen, 0.5, 1.0),
            vec4<f32>(cRe, cIm, 1.0, escapeStep),
            vec4<f32>(brightness, brightness, brightness, 1.0),
        );
    }

    // ---- Active deposit phase ----
    // Recompute z from scratch using c and step count (no texture dependency)

    let cRe = vel.x;
    let cIm = vel.y;
    var step = vel.z;
    let escapeStep = vel.w;

    // Recompute z to current step from z\u2080 = 0
    var z = vec2<f32>(0.0, 0.0);
    let currentStep = i32(step);
    for (var i: i32 = 0; i < 2048; i = i + 1) {
        if (i >= currentStep) { break; }
        let zr = z.x * z.x - z.y * z.y + cRe;
        let zi = 2.0 * z.x * z.y + cIm;
        z = vec2<f32>(zr, zi);
    }

    // Advance 8 more steps
    for (var s: i32 = 0; s < 8; s = s + 1) {
        step = step + 1.0;

        if (step >= escapeStep) {
            return Outputs(
                vec4<f32>(pos.xy, 0.0, 0.0),
                vec4<f32>(0.0, 0.0, step, 0.0),
                vec4<f32>(0.0, 0.0, 0.0, 0.0),
            );
        }

        let zr = z.x * z.x - z.y * z.y + cRe;
        let zi = 2.0 * z.x * z.y + cIm;
        z = vec2<f32>(zr, zi);
    }

    let screen = complexToScreen(z);

    return Outputs(
        vec4<f32>(screen, 0.5, 1.0),
        vec4<f32>(cRe, cIm, step, escapeStep),
        col,
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
`,wgsl:`@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4f {
    return textureSample(inputTex, texSampler, in.uv);
}
`},zWrite:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Standard uniforms
uniform float time;
uniform vec2 resolution;

// Input textures (post-agent state)
uniform sampler2D xyzTex;
uniform sampler2D velTex;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 pos = texelFetch(xyzTex, coord, 0);
    vec4 vel = texelFetch(velTex, coord, 0);

    // Dead agent \u2014 zero z
    if (pos.w < 0.5) {
        fragColor = vec4(0.0);
        return;
    }

    float cRe = vel.x;
    float cIm = vel.y;
    int stepI = int(vel.z);

    // Recompute z from scratch to current step
    vec2 z = vec2(0.0);
    for (int i = 0; i < 2048; i++) {
        if (i >= stepI) break;
        float zr = z.x * z.x - z.y * z.y + cRe;
        float zi = 2.0 * z.x * z.y + cIm;
        z = vec2(zr, zi);
    }

    fragColor = vec4(z.x, z.y, 0.0, 0.0);
}
`,wgsl:`// Buddhabrot z-state writer
// Recomputes z from scratch to current step for storage

@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(3) var velTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(fragCoord.xy);
    let pos = textureLoad(xyzTex, coord, 0);
    let vel = textureLoad(velTex, coord, 0);

    // Dead agent
    if (pos.w < 0.5) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }

    let cRe = vel.x;
    let cIm = vel.y;
    let stepI = i32(vel.z);

    // Recompute z from scratch to current step
    var z = vec2<f32>(0.0, 0.0);

    for (var i: i32 = 0; i < 2048; i = i + 1) {
        if (i >= stepI) { break; }
        let zr = z.x * z.x - z.y * z.y + cRe;
        let zi = 2.0 * z.x * z.y + cIm;
        z = vec2<f32>(zr, zi);
    }

    return vec4<f32>(z.x, z.y, 0.0, 0.0);
}
`}},i=`# buddhabrot

Buddhabrot fractal via progressive orbit accumulation \u2014 agents test random c values and deposit escaped orbit traces

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | standard | anti/standard | Standard or anti-buddhabrot |
| maxIter | int | 200 | 20\u20132000 | Max orbit iterations |
| minIter | int | 1 | 1\u20131000 | Min orbit iterations |
| centerX | float | -0.5 | -3\u20133 | Center x |
| centerY | float | 0 | -3\u20133 | Center y |
| zoom | float | 1 | 0.1\u20135 | Zoom level |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .buddhabrot()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&i&&(n.help=i);var l="points/buddhabrot",p="points",f="buddhabrot",d=n;export{d as default,l as effectId,f as effectName,i as help,p as namespace};
