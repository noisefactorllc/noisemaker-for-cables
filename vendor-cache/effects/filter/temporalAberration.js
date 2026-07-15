/* filter/temporalAberration */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Temporal Chromatic Aberration",namespace:"filter",func:"temporalAberration",tags:["color","lens"],description:"Chromatic aberration via per-channel temporal frame delay",globals:{redDelay:{type:"float",default:0,uniform:"redDelay",min:0,max:8,step:.1,ui:{label:"red delay",control:"slider"}},greenDelay:{type:"float",default:4,uniform:"greenDelay",min:0,max:8,step:.1,ui:{label:"green delay",control:"slider"}},blueDelay:{type:"float",default:8,uniform:"blueDelay",min:0,max:8,step:.1,ui:{label:"blue delay",control:"slider"}}},defaultProgram:`search filter, synth

noise(
  speed: 40,
  colorMode: mono,
  ridges: true
)
  .temporalAberration()
  .write(o0)`,uniformLayouts:{temporalAberration:{redDelay:{slot:0,components:"x"},greenDelay:{slot:0,components:"y"},blueDelay:{slot:0,components:"z"}}},textures:{_h1:{width:"input",height:"input",format:"rgba8unorm"},_h2:{width:"input",height:"input",format:"rgba8unorm"},_h3:{width:"input",height:"input",format:"rgba8unorm"},_h4:{width:"input",height:"input",format:"rgba8unorm"},_h5:{width:"input",height:"input",format:"rgba8unorm"},_h6:{width:"input",height:"input",format:"rgba8unorm"},_h7:{width:"input",height:"input",format:"rgba8unorm"},_h8:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"main",program:"temporalAberration",inputs:{inputTex:"inputTex",h1:"_h1",h2:"_h2",h3:"_h3",h4:"_h4",h5:"_h5",h6:"_h6",h7:"_h7",h8:"_h8"},outputs:{fragColor:"outputTex"}},{name:"shift8",program:"delayShift",inputs:{srcTex:"_h7"},outputs:{fragColor:"_h8"}},{name:"shift7",program:"delayShift",inputs:{srcTex:"_h6"},outputs:{fragColor:"_h7"}},{name:"shift6",program:"delayShift",inputs:{srcTex:"_h5"},outputs:{fragColor:"_h6"}},{name:"shift5",program:"delayShift",inputs:{srcTex:"_h4"},outputs:{fragColor:"_h5"}},{name:"shift4",program:"delayShift",inputs:{srcTex:"_h3"},outputs:{fragColor:"_h4"}},{name:"shift3",program:"delayShift",inputs:{srcTex:"_h2"},outputs:{fragColor:"_h3"}},{name:"shift2",program:"delayShift",inputs:{srcTex:"_h1"},outputs:{fragColor:"_h2"}},{name:"shift1",program:"delayShift",inputs:{srcTex:"inputTex"},outputs:{fragColor:"_h1"}}]});var a={delayShift:{glsl:`#version 300 es

/*
 * Temporal Chromatic Aberration - shift pass (one stage of the delay line).
 *
 * Copies the source stage into the destination stage, advancing the bucket-brigade shift
 * register by one frame. Alpha is preserved unchanged so the "filled" frontier (alpha 1
 * from the live input vs. alpha 0 from never-written stages) propagates exactly one stage
 * per frame, which the read pass uses for its ramp-in fallback.
 */

precision highp float;
precision highp int;

uniform sampler2D srcTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(srcTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    fragColor = texture(srcTex, uv);
}
`,wgsl:`/*
 * Temporal Chromatic Aberration - shift pass (WGSL).
 * Mirrors glsl/delayShift.glsl: copies one stage of the bucket-brigade delay line into the
 * next, preserving alpha so the "filled" frontier advances one stage per frame.
 */

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var srcTex : texture_2d<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(srcTex, 0));
    let uv = pos.xy / texSize;
    return textureSampleLevel(srcTex, samp, uv, 0.0);
}
`},temporalAberration:{glsl:`#version 300 es

/*
 * Temporal Chromatic Aberration - read pass.
 *
 * Samples the live frame (delay 0) and the eight history stages _h1.._h8 (delay 1..8),
 * then builds each output channel from a different, independently delayed frame so colour
 * separates in time. Delays are fractional: adjacent stored frames are interpolated.
 *
 * Runs before the shift passes, so the history textures still hold last frame's values.
 * A history slot that has never been written has alpha 0 (textures init to zero); such a
 * slot falls back to the live frame, giving a clean ramp-in over the first frames instead
 * of black.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform sampler2D h1;
uniform sampler2D h2;
uniform sampler2D h3;
uniform sampler2D h4;
uniform sampler2D h5;
uniform sampler2D h6;
uniform sampler2D h7;
uniform sampler2D h8;

uniform float redDelay;
uniform float greenDelay;
uniform float blueDelay;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);

    vec4 cur = texture(inputTex, uv);

    // slots[0] = live (delay 0); slots[1..8] = history (delay 1..8) with empty -> live.
    vec4 slots[9];
    slots[0] = cur;
    vec4 s;
    s = texture(h1, uv); slots[1] = (s.a < 0.5) ? cur : s;
    s = texture(h2, uv); slots[2] = (s.a < 0.5) ? cur : s;
    s = texture(h3, uv); slots[3] = (s.a < 0.5) ? cur : s;
    s = texture(h4, uv); slots[4] = (s.a < 0.5) ? cur : s;
    s = texture(h5, uv); slots[5] = (s.a < 0.5) ? cur : s;
    s = texture(h6, uv); slots[6] = (s.a < 0.5) ? cur : s;
    s = texture(h7, uv); slots[7] = (s.a < 0.5) ? cur : s;
    s = texture(h8, uv); slots[8] = (s.a < 0.5) ? cur : s;

    float dr = clamp(redDelay, 0.0, 8.0);
    int ir0 = int(floor(dr));
    int ir1 = min(ir0 + 1, 8);
    float rOut = mix(slots[ir0], slots[ir1], dr - float(ir0)).r;

    float dg = clamp(greenDelay, 0.0, 8.0);
    int ig0 = int(floor(dg));
    int ig1 = min(ig0 + 1, 8);
    float gOut = mix(slots[ig0], slots[ig1], dg - float(ig0)).g;

    float db = clamp(blueDelay, 0.0, 8.0);
    int ib0 = int(floor(db));
    int ib1 = min(ib0 + 1, 8);
    float bOut = mix(slots[ib0], slots[ib1], db - float(ib0)).b;

    fragColor = vec4(rOut, gOut, bOut, cur.a);
}
`,wgsl:`/*
 * Temporal Chromatic Aberration - read pass (WGSL).
 * Mirrors glsl/temporalAberration.glsl: samples the live frame (delay 0) and the eight
 * history stages _h1.._h8 (delay 1..8), then builds each output channel from an
 * independently, fractionally delayed frame. Empty history slots (alpha 0) fall back to
 * the live frame for a clean ramp-in.
 */

struct Uniforms {
    // data[0] = (redDelay, greenDelay, blueDelay, unused)
    data : array<vec4<f32>, 1>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var inputTex : texture_2d<f32>;
@group(0) @binding(3) var h1 : texture_2d<f32>;
@group(0) @binding(4) var h2 : texture_2d<f32>;
@group(0) @binding(5) var h3 : texture_2d<f32>;
@group(0) @binding(6) var h4 : texture_2d<f32>;
@group(0) @binding(7) var h5 : texture_2d<f32>;
@group(0) @binding(8) var h6 : texture_2d<f32>;
@group(0) @binding(9) var h7 : texture_2d<f32>;
@group(0) @binding(10) var h8 : texture_2d<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let redDelay = uniforms.data[0].x;
    let greenDelay = uniforms.data[0].y;
    let blueDelay = uniforms.data[0].z;

    let texSize = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = pos.xy / texSize;

    let cur = textureSampleLevel(inputTex, samp, uv, 0.0);

    // slots[0] = live (delay 0); slots[1..8] = history (delay 1..8) with empty -> live.
    var slots : array<vec4<f32>, 9>;
    slots[0] = cur;
    var s : vec4<f32>;
    s = textureSampleLevel(h1, samp, uv, 0.0); slots[1] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h2, samp, uv, 0.0); slots[2] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h3, samp, uv, 0.0); slots[3] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h4, samp, uv, 0.0); slots[4] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h5, samp, uv, 0.0); slots[5] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h6, samp, uv, 0.0); slots[6] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h7, samp, uv, 0.0); slots[7] = select(s, cur, s.a < 0.5);
    s = textureSampleLevel(h8, samp, uv, 0.0); slots[8] = select(s, cur, s.a < 0.5);

    let dr = clamp(redDelay, 0.0, 8.0);
    let ir0 = i32(floor(dr));
    let ir1 = min(ir0 + 1, 8);
    let rOut = mix(slots[ir0], slots[ir1], dr - f32(ir0)).r;

    let dg = clamp(greenDelay, 0.0, 8.0);
    let ig0 = i32(floor(dg));
    let ig1 = min(ig0 + 1, 8);
    let gOut = mix(slots[ig0], slots[ig1], dg - f32(ig0)).g;

    let db = clamp(blueDelay, 0.0, 8.0);
    let ib0 = i32(floor(db));
    let ib1 = min(ib0 + 1, 8);
    let bOut = mix(slots[ib0], slots[ib1], db - f32(ib0)).b;

    return vec4<f32>(rOut, gOut, bOut, cur.a);
}
`}},s=`# temporalAberration

Chromatic aberration via per-channel temporal frame delay

## Description

Separates red, green, and blue in *time* instead of space: each output
channel is sampled from a different past frame, so moving content leaves
color trails that lag behind or lead ahead. This is the temporal counterpart
to the spatial aberration filters (simpleAberration, chromaticAberration).

Internally the filter keeps an eight-frame history of its input. Each delay
control picks a frame age from 0 (live) to 8; fractional values interpolate
between the two adjacent stored frames.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| redDelay | float | 0 | 0-8 | Red channel delay, in frames |
| greenDelay | float | 4 | 0-8 | Green channel delay, in frames |
| blueDelay | float | 8 | 0-8 | Blue channel delay, in frames |

## Notes

- Static content is unaffected \u2014 with no motion, every past frame matches the live one
- History slots that have not been written yet fall back to the live frame, so the effect ramps in cleanly over the first frames instead of flashing black
- Output alpha comes from the live frame

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .temporalAberration()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&s&&(t.help=s);var h="filter/temporalAberration",p="filter",f="temporalAberration",m=t;export{m as default,h as effectId,f as effectName,s as help,p as namespace};
