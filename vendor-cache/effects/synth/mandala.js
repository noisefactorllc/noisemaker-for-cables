/* synth/mandala */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Mandala",namespace:"synth",func:"mandala",tags:["geometric","pattern"],openCategories:["general","layers"],description:"N-fold symmetric mandala generator",globals:{scale:{type:"float",default:10,min:1,max:20,uniform:"scale",ui:{label:"scale",control:"slider"}},rotation:{type:"float",default:0,min:-180,max:180,uniform:"rotation",ui:{label:"rotation",control:"slider"}},thickness:{type:"float",default:.2,min:0,max:1,uniform:"thickness",ui:{label:"thickness",control:"slider"}},smoothness:{type:"float",default:.02,min:0,max:1,uniform:"smoothness",ui:{label:"smoothness",control:"slider"}},symmetry:{type:"int",default:12,min:3,max:24,uniform:"symmetry",ui:{label:"symmetry",control:"slider"}},bindu:{type:"boolean",default:!1,uniform:"bindu",ui:{label:"center dot",control:"checkbox"}},shape:{type:"int",default:0,uniform:"shape",choices:{dot:2,petal:0,triangle:1},ui:{label:"shape",control:"dropdown",category:"layers"}},layers:{type:"int",default:6,min:1,max:12,uniform:"layers",ui:{label:"layers",control:"slider",category:"layers"}},layerSpacing:{type:"float",default:1.5,min:.5,max:3,uniform:"layerSpacing",ui:{label:"spacing",control:"slider",category:"layers"}},twist:{type:"float",default:0,min:-45,max:45,uniform:"twist",ui:{label:"twist",control:"slider",category:"layers"}},shapeGrowth:{type:"float",default:0,min:-1,max:1,uniform:"shapeGrowth",ui:{label:"growth",control:"slider",category:"layers"}},fgColor:{type:"color",default:[1,1,1],uniform:"fgColor",ui:{label:"fg color",control:"color",category:"color"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"color"}},animation:{type:"int",default:0,uniform:"animation",choices:{none:0,counterRotate:4,differential:3,pulse:2,ripple:6,rotate:1,spiralWave:5},ui:{label:"animation",control:"dropdown",category:"animation"}},speed:{type:"int",default:1,uniform:"speed",min:-5,max:5,zero:0,ui:{label:"speed",control:"slider",category:"animation",enabledBy:{param:"animation",neq:0}}},pulseDepth:{type:"float",default:.15,min:0,max:1,uniform:"pulseDepth",ui:{label:"depth",control:"slider",category:"animation",enabledBy:{param:"animation",in:[2,6]}}}},passes:[{name:"main",program:"mandala",inputs:{},outputs:{color:"outputTex"}}]});var i={mandala:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float scale;
uniform float rotation;
uniform float thickness;
uniform float smoothness;
uniform int symmetry;
uniform int layers;
uniform int shape;
uniform float layerSpacing;
uniform float twist;
uniform float shapeGrowth;
uniform bool bindu;
uniform int animation;
uniform float speed;
uniform float pulseDepth;
uniform float time;
uniform vec3 fgColor;
uniform vec3 bgColor;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define SQRT3 1.7320508075688772

#define SHAPE_PETAL 0
#define SHAPE_TRIANGLE 1
#define SHAPE_DOT 2

#define ANIM_ROTATE 1
#define ANIM_PULSE 2
#define ANIM_DIFFERENTIAL 3
#define ANIM_COUNTERROTATE 4
#define ANIM_SPIRALWAVE 5
#define ANIM_RIPPLE 6

vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Equilateral triangle SDF, tip pointing up (+y), centered at origin
float sdEquilateralTriangle(vec2 p, float r) {
    const float k = SQRT3;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) {
        p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

float fillEdge(float d) {
    return smoothstep(smoothness, -smoothness, d);
}

float mandalaMask(vec2 p) {
    float r = length(p);
    // Offset by -PI/2 so the first petal sits on the +y axis (screen up) at rotation=0.
    float theta = atan(p.y, p.x) - PI * 0.5;
    float wedge = TAU / float(symmetry);
    float twistRad = twist * PI / 180.0;
    float baseSize = 0.25 + thickness * 0.65;

    // spiralWave: twist amplitude oscillates over the cycle, so the spiral
    // tightens, unwinds, reverses, and returns. Uses \`twist\` as amplitude.
    float dynTwistRad = twistRad;
    if (animation == ANIM_SPIRALWAVE) {
        dynTwistRad = twistRad * sin(time * TAU * floor(speed));
    }

    float m = 0.0;

    // Bindu (center dot)
    if (bindu) {
        float dBindu = length(p) - (0.15 + thickness * 0.15);
        m = max(m, fillEdge(dBindu));
    }

    for (int i = 0; i < 12; i++) {
        if (i >= layers) break;
        float Rlayer = float(i + 1) * layerSpacing;

        // Per-layer animation rotation (in addition to static twist).
        // differential: layer i rotates at (speed + i) turns/cycle.
        // counterRotate: even layers forward, odd layers reverse.
        float layerAnimRot = 0.0;
        if (animation == ANIM_DIFFERENTIAL) {
            layerAnimRot = time * TAU * (floor(speed) + float(i));
        } else if (animation == ANIM_COUNTERROTATE) {
            float dir = (mod(float(i), 2.0) < 0.5) ? 1.0 : -1.0;
            layerAnimRot = time * TAU * floor(speed) * dir;
        }

        float layerTheta = theta - float(i) * dynTwistRad - layerAnimRot;
        float folded = abs(mod(layerTheta + wedge * 0.5, wedge) - wedge * 0.5);
        float radial = r - Rlayer;
        float tangent = folded * Rlayer;

        // Per-layer shape size: linear ramp across layers from -growth/2 to +growth/2.
        float lt = 0.0;
        if (layers > 1) {
            lt = float(i) / float(layers - 1) - 0.5;
        }
        float shapeSize = baseSize * (1.0 + shapeGrowth * lt);

        // ripple: per-layer pulse with phase offset \u2192 wave traveling outward.
        if (animation == ANIM_RIPPLE) {
            shapeSize *= 1.0 + pulseDepth * sin(time * TAU * floor(speed) - float(i) * 0.6);
        }

        if (shape == SHAPE_PETAL) {
            // Elongated radially: squeeze the radial axis
            float d = length(vec2(radial * 0.55, tangent)) - shapeSize;
            m = max(m, fillEdge(d));
        } else if (shape == SHAPE_TRIANGLE) {
            // Triangle pointing outward radially. Local frame: y=radial outward, x=tangent
            vec2 q = vec2(tangent, -radial);
            float d = sdEquilateralTriangle(q, shapeSize);
            m = max(m, fillEdge(d));
        } else {
            // Dot
            float d = length(vec2(radial, tangent)) - shapeSize * 0.7;
            m = max(m, fillEdge(d));
        }
    }
    return m;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;
    st = (st - 0.5) * 2.0;
    st.x *= aspect;

    // Static rotation
    float rad = rotation * PI / 180.0;
    st = rotate2D(st, rad);

    // Animation: rotate applies a time-dependent rotation. Integer turns at time=1 \u2192 seamless.
    if (animation == ANIM_ROTATE) {
        st = rotate2D(st, time * TAU * floor(speed));
    }

    // Animation: pulse modulates the effective scale via sin. Seamless on [0,1] for integer speed.
    float scaleFactor = 21.0 - scale;
    if (animation == ANIM_PULSE) {
        scaleFactor *= 1.0 + pulseDepth * sin(time * TAU * floor(speed));
    }

    vec2 p = st * scaleFactor;

    float m = clamp(mandalaMask(p), 0.0, 1.0);
    vec3 color = mix(bgColor, fgColor, m);
    fragColor = vec4(color, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
struct Uniforms {
    resolution: vec2<f32>,
    aspect: f32,
    time: f32,
    scale: f32,
    rotation: f32,
    thickness: f32,
    smoothness: f32,
    speed: f32,
    pulseDepth: f32,
    layerSpacing: f32,
    twist: f32,
    shapeGrowth: f32,
    symmetry: i32,
    layers: i32,
    shape: i32,
    bindu: i32,
    animation: i32,
    fgColor: vec3<f32>,
    bgColor: vec3<f32>,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const SQRT3: f32 = 1.7320508075688772;

const SHAPE_PETAL: i32 = 0;
const SHAPE_TRIANGLE: i32 = 1;
const SHAPE_DOT: i32 = 2;

const ANIM_ROTATE: i32 = 1;
const ANIM_PULSE: i32 = 2;
const ANIM_DIFFERENTIAL: i32 = 3;
const ANIM_COUNTERROTATE: i32 = 4;
const ANIM_SPIRALWAVE: i32 = 5;
const ANIM_RIPPLE: i32 = 6;

// GLSL-style mod() \u2014 always non-negative when b > 0.
fn floorMod(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn rotate2D(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

fn sdEquilateralTriangle(p_in: vec2<f32>, r: f32) -> f32 {
    let k = SQRT3;
    var p = vec2<f32>(abs(p_in.x) - r, p_in.y + r / k);
    if (p.x + k * p.y > 0.0) {
        p = vec2<f32>(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x = p.x - clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

fn fillEdge(d: f32) -> f32 {
    return smoothstep(u.smoothness, -u.smoothness, d);
}

fn mandalaMask(p: vec2<f32>) -> f32 {
    let r = length(p);
    let theta = atan2(p.y, p.x) - PI * 0.5;
    let wedge = TAU / f32(u.symmetry);
    let twistRad = u.twist * PI / 180.0;
    let baseSize = 0.25 + u.thickness * 0.65;

    // spiralWave: twist oscillates over the cycle using \`twist\` as amplitude.
    var dynTwistRad = twistRad;
    if (u.animation == ANIM_SPIRALWAVE) {
        dynTwistRad = twistRad * sin(u.time * TAU * floor(u.speed));
    }

    var m: f32 = 0.0;

    if (u.bindu != 0) {
        let dBindu = length(p) - (0.15 + u.thickness * 0.15);
        m = max(m, fillEdge(dBindu));
    }

    for (var i: i32 = 0; i < 12; i = i + 1) {
        if (i >= u.layers) { break; }
        let Rlayer = f32(i + 1) * u.layerSpacing;

        // Per-layer animation rotation.
        var layerAnimRot: f32 = 0.0;
        if (u.animation == ANIM_DIFFERENTIAL) {
            layerAnimRot = u.time * TAU * (floor(u.speed) + f32(i));
        } else if (u.animation == ANIM_COUNTERROTATE) {
            var dir: f32 = 1.0;
            if (floorMod(f32(i), 2.0) >= 0.5) {
                dir = -1.0;
            }
            layerAnimRot = u.time * TAU * floor(u.speed) * dir;
        }

        let layerTheta = theta - f32(i) * dynTwistRad - layerAnimRot;
        let folded = abs(floorMod(layerTheta + wedge * 0.5, wedge) - wedge * 0.5);
        let radial = r - Rlayer;
        let tangent = folded * Rlayer;

        var lt: f32 = 0.0;
        if (u.layers > 1) {
            lt = f32(i) / f32(u.layers - 1) - 0.5;
        }
        var shapeSize = baseSize * (1.0 + u.shapeGrowth * lt);

        // ripple: per-layer pulse with phase offset.
        if (u.animation == ANIM_RIPPLE) {
            shapeSize = shapeSize * (1.0 + u.pulseDepth * sin(u.time * TAU * floor(u.speed) - f32(i) * 0.6));
        }

        if (u.shape == SHAPE_PETAL) {
            let d = length(vec2<f32>(radial * 0.55, tangent)) - shapeSize;
            m = max(m, fillEdge(d));
        } else if (u.shape == SHAPE_TRIANGLE) {
            let q = vec2<f32>(tangent, -radial);
            let d = sdEquilateralTriangle(q, shapeSize);
            m = max(m, fillEdge(d));
        } else {
            let d = length(vec2<f32>(radial, tangent)) - shapeSize * 0.7;
            m = max(m, fillEdge(d));
        }
    }
    return m;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let globalCoord = position.xy + u.tileOffset;
    var st = globalCoord / u.fullResolution;
    st = (st - vec2<f32>(0.5, 0.5)) * 2.0;
    st.x = st.x * u.aspect;

    let rad = u.rotation * PI / 180.0;
    st = rotate2D(st, rad);

    if (u.animation == ANIM_ROTATE) {
        st = rotate2D(st, u.time * TAU * floor(u.speed));
    }

    var scaleFactor = 21.0 - u.scale;
    if (u.animation == ANIM_PULSE) {
        scaleFactor = scaleFactor * (1.0 + u.pulseDepth * sin(u.time * TAU * floor(u.speed)));
    }

    let p = st * scaleFactor;

    let m = clamp(mandalaMask(p), 0.0, 1.0);
    let color = mix(u.bgColor, u.fgColor, m);
    return vec4<f32>(color, 1.0);
}
`}},o=`# mandala

N-fold symmetric mandala generator

## Description

Generates centered radial mandalas built from \`layers\` concentric rings of \`shape\` glyphs (petal, triangle, or dot), folded around an N-fold symmetry axis. Supports several animation modes, all of which loop seamlessly.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | float | 10 | 1-20 | Inverse-scale (lower = larger figure) |
| rotation | float | 0 | -180-180 | Static rotation in degrees |
| thickness | float | 0.2 | 0-1 | Shape size |
| smoothness | float | 0.02 | 0-1 | Edge softness |
| symmetry | int | 12 | 3-24 | N-fold radial symmetry |
| layers | int | 6 | 1-12 | Concentric shape rings |
| shape | int | petal | dot/petal/triangle | Per-layer glyph shape |
| layerSpacing | float | 1.5 | 0.5-3.0 | Radial gap between layers |
| twist | float | 0 | -45-45 | Degrees of rotation added per layer; non-zero produces a spiral |
| shapeGrowth | float | 0 | -1-1 | Shape size ramp across layers; positive = grow outward, negative = shrink outward |
| bindu | bool | false | - | Small filled dot at the center |
| animation | int | none | none/rotate/pulse/differential/counterRotate/spiralWave/ripple | Animation mode |
| speed | int | 1 | -5-5 | Animation speed and direction |
| pulseDepth | float | 0.15 | 0-1 | Amplitude for pulse and ripple animations |
| fgColor | color | 1,1,1 | - | Foreground color |
| bgColor | color | 0,0,0 | - | Background color |

## Animation

All modes loop seamlessly. Speed is integer-snapped so the loop is exact at any value.

- **rotate**: whole figure rotates uniformly.
- **pulse**: effective scale modulated by \`sin(time)\`. \`pulseDepth\` controls amplitude.
- **differential**: each layer rotates at a different speed (inner = base speed, layer i = speed + i turns/cycle). Galactic whirlpool.
- **counterRotate**: even layers forward, odd layers reverse. Shearing effect between adjacent rings.
- **spiralWave**: the \`twist\` value oscillates over the cycle. Spiral tightens, unwinds, reverses, and returns. Requires \`twist\` \u2260 0 to be visible (the param sets the amplitude).
- **ripple**: per-layer pulse with phase offset, so the size oscillation appears to travel outward through the layers. \`pulseDepth\` controls amplitude.

## Usage

\`\`\`
search synth

mandala()
  .write(o0)

render(o0)
\`\`\`

### Examples

\`\`\`
// 12-fold petal mandala with 4 layers
mandala({ symmetry: 12, layers: 4, shape: 0 })
  .write(o0)

// 6-fold triangle mandala, slow rotation
mandala({ symmetry: 6, shape: 1, animation: 1, speed: 1 })
  .write(o0)

// 16-fold dot mandala, pulsing
mandala({ symmetry: 16, shape: 2, animation: 2, speed: 1, pulseDepth: 0.25 })
  .write(o0)

// Spiral with twist + bindu
mandala({ symmetry: 12, layers: 5, twist: 12, bindu: true })
  .write(o0)

// Blooming outward growth
mandala({ symmetry: 8, layers: 4, shapeGrowth: 0.7, layerSpacing: 2.0 })
  .write(o0)

// Whirlpool: each layer at its own speed
mandala({ symmetry: 8, layers: 6, animation: 3, speed: 1 })
  .write(o0)

// Counter-rotating rings
mandala({ symmetry: 12, layers: 4, animation: 4, speed: 1 })
  .write(o0)

// Spiral that tightens and unwinds
mandala({ symmetry: 8, layers: 5, twist: 20, animation: 5, speed: 1 })
  .write(o0)

// Ripple wave traveling outward
mandala({ symmetry: 8, layers: 6, animation: 6, speed: 1, pulseDepth: 0.4 })
  .write(o0)
\`\`\`

## Usage

\`\`\`
search synth

mandala()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(i))n.shaders[a]={...e}}n&&o&&(n.help=o);var d="synth/mandala",p="synth",m="mandala",u=n;export{u as default,d as effectId,m as effectName,o as help,p as namespace};
