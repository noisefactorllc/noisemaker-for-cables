/* synth/scope */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Scope",namespace:"synth",func:"scope",tags:["audio"],description:"Audio waveform oscilloscope",globals:{color:{type:"color",default:[0,1,0],uniform:"lineColor",ui:{label:"color",control:"color"}},thickness:{type:"float",default:2,min:.5,max:10,step:.5,uniform:"lineThickness",ui:{label:"thickness",control:"slider"}},gain:{type:"float",default:1,min:.1,max:5,step:.1,uniform:"gain",ui:{label:"gain",control:"slider"}}},passes:[{name:"main",program:"scope",inputs:{},outputs:{fragColor:"outputTex"}}]});var o={scope:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float audioWaveform[128];
uniform vec3 lineColor;
uniform float lineThickness;
uniform float gain;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Sample the waveform at this x position
    // Map uv.x [0,1] to array index [0,127]
    float fIndex = uv.x * 127.0;
    int i0 = int(floor(fIndex));
    int i1 = min(i0 + 1, 127);
    float fract_i = fract(fIndex);

    // Linearly interpolate between adjacent samples
    float s0 = audioWaveform[i0];
    float s1 = audioWaveform[i1];
    float wval = mix(s0, s1, fract_i);

    // Apply gain around center (0.5 = silence)
    wval = 0.5 + (wval - 0.5) * gain;

    // Distance from fragment to waveform line, in pixels
    float dist = abs(uv.y - wval) * fullResolution.y;

    // Anti-aliased line
    float line = smoothstep(lineThickness + 1.0, lineThickness, dist);

    // Premultiplied alpha output
    fragColor = vec4(lineColor * line, line);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> audioWaveform: array<vec4<f32>, 32>;
@group(0) @binding(2) var<uniform> lineColor: vec3<f32>;
@group(0) @binding(3) var<uniform> lineThickness: f32;
@group(0) @binding(4) var<uniform> gain: f32;

fn sampleWaveform(index: u32) -> f32 {
    return audioWaveform[index / 4u][index % 4u];
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = vec2<f32>(position.x, resolution.y - position.y) / resolution;

    // Sample the waveform at this x position
    // Map uv.x [0,1] to array index [0,127]
    let fIndex = uv.x * 127.0;
    let i0 = u32(floor(fIndex));
    let i1 = min(i0 + 1u, 127u);
    let fract_i = fract(fIndex);

    // Linearly interpolate between adjacent samples
    let s0 = sampleWaveform(i0);
    let s1 = sampleWaveform(i1);
    let wval = mix(s0, s1, fract_i);

    // Apply gain around center (0.5 = silence)
    let gained = 0.5 + (wval - 0.5) * gain;

    // Distance from fragment to waveform line, in pixels
    let dist = abs(uv.y - gained) * resolution.y;

    // Anti-aliased line
    let line = smoothstep(lineThickness + 1.0, lineThickness, dist);

    // Premultiplied alpha output
    return vec4<f32>(lineColor * line, line);
}
`}},s=`# scope

Audio waveform oscilloscope

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | [0, 1, 0] | - | Waveform color |
| thickness | float | 2 | 0.5\u201310 | Line thickness |
| gain | float | 1 | 0.1\u20135 | Amplitude gain |

## Usage

\`\`\`
search synth

scope()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(o))n.shaders[i]={...e}}n&&s&&(n.help=s);var f="synth/scope",p="synth",c="scope",m=n;export{m as default,f as effectId,c as effectName,s as help,p as namespace};
