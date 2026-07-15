/* synth/spectrum */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Spectrum",namespace:"synth",func:"spectrum",tags:["audio"],description:"Audio spectrum analyzer",globals:{color:{type:"color",default:[0,1,0],uniform:"lineColor",ui:{label:"color",control:"color"}},thickness:{type:"float",default:2,min:.5,max:10,step:.5,uniform:"lineThickness",ui:{label:"thickness",control:"slider"}},gain:{type:"float",default:1,min:.1,max:5,step:.1,uniform:"gain",ui:{label:"gain",control:"slider"}}},passes:[{name:"main",program:"spectrum",inputs:{},outputs:{fragColor:"outputTex"}}]});var s={spectrum:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float audioSpectrum[128];
uniform vec3 lineColor;
uniform float lineThickness;
uniform float gain;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Sample the spectrum at this x position
    float fIndex = uv.x * 127.0;
    int i0 = int(floor(fIndex));
    int i1 = min(i0 + 1, 127);
    float fract_i = fract(fIndex);

    // Linearly interpolate between adjacent bins
    float s0 = audioSpectrum[i0];
    float s1 = audioSpectrum[i1];
    float mag = mix(s0, s1, fract_i) * gain;

    // Distance from fragment to spectrum curve, in pixels
    float dist = abs(uv.y - mag) * fullResolution.y;

    // Anti-aliased line
    float line = smoothstep(lineThickness + 1.0, lineThickness, dist);

    // Fill below the curve
    float fill = smoothstep(mag + 1.0 / fullResolution.y, mag, uv.y) * 0.15;

    float alpha = max(line, fill);
    fragColor = vec4(lineColor * alpha, alpha);
}
`,wgsl:`// WGSL version \u2013 WebGPU
@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> audioSpectrum: array<vec4<f32>, 32>;
@group(0) @binding(2) var<uniform> lineColor: vec3<f32>;
@group(0) @binding(3) var<uniform> lineThickness: f32;
@group(0) @binding(4) var<uniform> gain: f32;

fn sampleSpectrum(index: u32) -> f32 {
    return audioSpectrum[index / 4u][index % 4u];
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = vec2<f32>(position.x, resolution.y - position.y) / resolution;

    // Sample the spectrum at this x position
    let fIndex = uv.x * 127.0;
    let i0 = u32(floor(fIndex));
    let i1 = min(i0 + 1u, 127u);
    let fract_i = fract(fIndex);

    // Linearly interpolate between adjacent bins
    let s0 = sampleSpectrum(i0);
    let s1 = sampleSpectrum(i1);
    let mag = mix(s0, s1, fract_i) * gain;

    // Distance from fragment to spectrum curve, in pixels
    let dist = abs(uv.y - mag) * resolution.y;

    // Anti-aliased line
    let line = smoothstep(lineThickness + 1.0, lineThickness, dist);

    // Fill below the curve
    let fill = smoothstep(mag + 1.0 / resolution.y, mag, uv.y) * 0.15;

    let alpha = max(line, fill);
    return vec4<f32>(lineColor * alpha, alpha);
}
`}},o=`# spectrum

Audio spectrum analyzer

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | [0, 1, 0] | - | Spectrum color |
| thickness | float | 2 | 0.5\u201310 | Line thickness |
| gain | float | 1 | 0.1\u20135 | Amplitude gain |

## Usage

\`\`\`
search synth

spectrum()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(s))t.shaders[i]={...e}}t&&o&&(t.help=o);var f="synth/spectrum",p="synth",c="spectrum",m=t;export{m as default,f as effectId,c as effectName,o as help,p as namespace};
