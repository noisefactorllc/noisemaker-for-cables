/* synth/osc2d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Osc2D",namespace:"synth",func:"osc2d",tags:["geometric"],description:"2D oscillator pattern",globals:{oscType:{type:"member",default:"oscType.sine",enum:"oscType",uniform:"oscType",ui:{label:"osc type"}},freq:{type:"int",default:5,min:1,max:32,step:1,zero:1,uniform:"frequency",ui:{label:"freq"}},speed:{type:"int",default:4,min:0,max:10,zero:0,uniform:"speed",ui:{label:"speed"}},rotation:{type:"float",default:0,min:-180,max:180,step:1,uniform:"rotation",ui:{label:"rotation"}},seed:{type:"int",default:0,min:0,max:1e3,uniform:"seed",ui:{label:"seed",control:"slider",enabledBy:{param:"oscType",in:["oscType.noise1d","oscType.noise2d"]}}}},paramAliases:{frequency:"freq"},passes:[{name:"main",program:"osc2d",inputs:{},outputs:{color:"outputTex"}}]});var s={osc2d:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float time;
uniform int oscType;
uniform int frequency;
uniform float speed;
uniform float rotation;
uniform int seed;

out vec4 fragColor;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

// Simple 1D hash for noise
float hash11(float p, float s) {
    p = fract(p * 234.34 + s * 0.7183);
    p += p * (p + 34.23);
    return fract(p * p);
}

// Value noise 1D - tiles at integer frequency boundaries
float tilingNoise1D(float x, float freq, float s) {
    // x is in [0, 1] range, scale by frequency
    float p = x * freq;
    float i = floor(p);
    float f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep
    
    // Wrap indices for seamless tiling
    float i0 = mod(i, freq);
    float i1 = mod(i + 1.0, freq);
    
    float a = hash11(i0, s);
    float b = hash11(i1, s);
    
    return mix(a, b, f);
}

// Periodic value function: h/t Etienne Jacob
// https://bleuje.github.io/tutorial2/
// Python: periodic_value(time, value) = normalized_sine((time - value) * tau)
float periodicValue(float t, float v) {
    return (sin((t - v) * TAU) + 1.0) * 0.5;
}

// Rotate 2D coordinates
vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// All oscillator functions return 0->1->0 over t=0..1
float oscSine(float t) {
    // Use half-cycle sine: 0->1->0 over t=0..1
    return sin(fract(t) * PI);
}

float oscLinear(float t) {
    // Triangle wave: 0->1->0 over t=0..1
    t = fract(t);
    return 1.0 - abs(t * 2.0 - 1.0);
}

float oscSawtooth(float t) {
    // Sawtooth: 0->1 over t=0..1
    return fract(t);
}

float oscSawtoothInv(float t) {
    // Inverted sawtooth: 1->0 over t=0..1
    return 1.0 - fract(t);
}

float oscSquare(float t) {
    // Square wave: 0 or 1
    return step(0.5, fract(t));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 res = fullResolution;
    if (res.x < 1.0) res = vec2(1024.0, 1024.0);

    // Normalized coordinates
    vec2 st = (gl_FragCoord.xy + tileOffset) / res;
    
    // Center for rotation
    st -= 0.5;
    st.x *= aspect;
    
    // Apply rotation
    float rotRad = rotation * PI / 180.0;
    st = rotate2D(st, rotRad);
    
    // Spatial position in [0, 1] for noise sampling
    float spatialPos = st.y + 0.5;
    float freq = float(frequency);
    
    // The oscillator value is based on position along y-axis
    // frequency controls how many bands appear across the image
    // speed controls how fast the animation runs
    float spatialPhase = st.y * freq;
    float timePhase = time * speed;
    float t = spatialPhase + timePhase;
    
    float val;
    if (oscType == 0) {
        // Sine
        val = oscSine(t);
    } else if (oscType == 1) {
        // Linear (triangle)
        val = oscLinear(t);
    } else if (oscType == 2) {
        // Sawtooth
        val = oscSawtooth(t);
    } else if (oscType == 3) {
        // Sawtooth inverted
        val = oscSawtoothInv(t);
    } else if (oscType == 4) {
        // Square
        val = oscSquare(t);
    } else if (oscType == 5) {
        // noise1d - scrolling version of noise2d
        // At t=0, must match noise2d exactly
        // Then scrolls the pattern over time
        float scrollOffset = fract(time * speed);
        float scrolledPos = fract(spatialPos + scrollOffset);
        
        // Same computation as noise2d at t=0
        float timeNoise = tilingNoise1D(scrolledPos, freq, float(seed) + 12345.0);
        float valueNoise = tilingNoise1D(scrolledPos, freq, float(seed));
        float scaledTime = periodicValue(0.0, timeNoise) * speed;
        val = periodicValue(scaledTime, valueNoise);
    } else {
        // noise2d (oscType == 6) - two-stage periodic
        // Python: scaled_time = periodic_value(time, time_noise) * speed
        //         result = periodic_value(scaled_time, value_noise)
        
        // Get noise values at this spatial position (same sampling as noise1d)
        float timeNoise = tilingNoise1D(spatialPos, freq, float(seed) + 12345.0);
        float valueNoise = tilingNoise1D(spatialPos, freq, float(seed));
        
        // Two-stage periodic: time -> periodic -> scale -> periodic
        float scaledTime = periodicValue(time, timeNoise) * speed;
        val = periodicValue(scaledTime, valueNoise);
    }
    
    fragColor = vec4(vec3(val), 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> aspect: f32;
@group(0) @binding(2) var<uniform> time: f32;
@group(0) @binding(3) var<uniform> oscType: i32;
@group(0) @binding(4) var<uniform> frequency: i32;
@group(0) @binding(5) var<uniform> speed: f32;
@group(0) @binding(6) var<uniform> rotation: f32;
@group(0) @binding(7) var<uniform> seed: i32;

const PI: f32 = 3.141592653589793;
const TAU: f32 = 6.283185307179586;

// Simple 1D hash for noise
fn hash11(p: f32, s: f32) -> f32 {
    var pv = fract(p * 234.34 + s * 0.7183);
    pv = pv + pv * (pv + 34.23);
    return fract(pv * pv);
}

// Value noise 1D - tiles at integer frequency boundaries
fn tilingNoise1D(x: f32, freq: f32, s: f32) -> f32 {
    // x is in [0, 1] range, scale by frequency
    let p = x * freq;
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);  // smoothstep
    
    // Wrap indices for seamless tiling
    let i0 = (i % freq + freq) % freq;
    let i1 = ((i + 1.0) % freq + freq) % freq;
    
    let a = hash11(i0, s);
    let b = hash11(i1, s);
    
    return mix(a, b, f);
}

// Periodic value function: h/t Etienne Jacob
// https://bleuje.github.io/tutorial2/
// Python: periodic_value(time, value) = normalized_sine((time - value) * tau)
fn periodicValue(t: f32, v: f32) -> f32 {
    return (sin((t - v) * TAU) + 1.0) * 0.5;
}

// Rotate 2D coordinates
fn rotate2D(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let s = sin(angle);
    let c = cos(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

// All oscillator functions return 0->1->0 over t=0..1
fn oscSine(t: f32) -> f32 {
    // Use half-cycle sine: 0->1->0 over t=0..1
    return sin(fract(t) * PI);
}

fn oscLinear(t: f32) -> f32 {
    // Triangle wave: 0->1->0 over t=0..1
    let tf = fract(t);
    return 1.0 - abs(tf * 2.0 - 1.0);
}

fn oscSawtooth(t: f32) -> f32 {
    // Sawtooth: 0->1 over t=0..1
    return fract(t);
}

fn oscSawtoothInv(t: f32) -> f32 {
    // Inverted sawtooth: 1->0 over t=0..1
    return 1.0 - fract(t);
}

fn oscSquare(t: f32) -> f32 {
    // Square wave: 0 or 1
    return step(0.5, fract(t));
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    var res = resolution;
    if (res.x < 1.0) { res = vec2<f32>(1024.0, 1024.0); }
    
    // Normalized coordinates (flip y for WebGPU coordinate system)
    var st = vec2<f32>(position.x, res.y - position.y) / res;
    
    // Center for rotation
    st = st - 0.5;
    st.x = st.x * aspect;
    
    // Apply rotation
    let rotRad = rotation * PI / 180.0;
    st = rotate2D(st, rotRad);
    
    // Spatial position in [0, 1] for noise sampling
    let spatialPos = st.y + 0.5;
    let freq = f32(frequency);
    
    // The oscillator value is based on position along y-axis
    // frequency controls how many bands appear across the image
    // speed controls how fast the animation runs
    let spatialPhase = st.y * freq;
    let timePhase = time * speed;
    let t = spatialPhase + timePhase;
    
    var val: f32;
    if (oscType == 0) {
        // Sine
        val = oscSine(t);
    } else if (oscType == 1) {
        // Linear (triangle)
        val = oscLinear(t);
    } else if (oscType == 2) {
        // Sawtooth
        val = oscSawtooth(t);
    } else if (oscType == 3) {
        // Sawtooth inverted
        val = oscSawtoothInv(t);
    } else if (oscType == 4) {
        // Square
        val = oscSquare(t);
    } else if (oscType == 5) {
        // noise1d - scrolling version of noise2d
        // At t=0, must match noise2d exactly
        // Then scrolls the pattern over time
        let scrollOffset = fract(time * speed);
        let scrolledPos = fract(spatialPos + scrollOffset);
        
        // Same computation as noise2d at t=0
        let timeNoise = tilingNoise1D(scrolledPos, freq, f32(seed) + 12345.0);
        let valueNoise = tilingNoise1D(scrolledPos, freq, f32(seed));
        let scaledTime = periodicValue(0.0, timeNoise) * speed;
        val = periodicValue(scaledTime, valueNoise);
    } else {
        // noise2d (oscType == 6) - two-stage periodic
        // Python: scaled_time = periodic_value(time, time_noise) * speed
        //         result = periodic_value(scaled_time, value_noise)
        
        // Get noise values at this spatial position (same sampling as noise1d)
        let timeNoise = tilingNoise1D(spatialPos, freq, f32(seed) + 12345.0);
        let valueNoise = tilingNoise1D(spatialPos, freq, f32(seed));
        
        // Two-stage periodic: time -> periodic -> scale -> periodic
        let scaledTime = periodicValue(time, timeNoise) * speed;
        val = periodicValue(scaledTime, valueNoise);
    }
    
    return vec4<f32>(vec3<f32>(val), 1.0);
}
`}},i=`# osc2d

2D oscillator pattern

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| oscType | member | oscType.sine | - | - |
| freq | int | 5 | 1-32 | - |
| speed | int | 4 | 0-10 | - |
| rotation | float | 0 | -180-180 | - |
| seed | int | 0 | 0-1000 | Seed |

## Usage

\`\`\`
search synth

osc2d()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(s))n.shaders[o]={...e}}n&&i&&(n.help=i);var c="synth/osc2d",p="synth",u="osc2d",d=n;export{d as default,c as effectId,u as effectName,i as help,p as namespace};
