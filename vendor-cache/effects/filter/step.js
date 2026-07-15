/* filter/step */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Step",namespace:"filter",func:"step",tags:["edges","util"],description:"Hard threshold at specified value",globals:{threshold:{type:"float",default:.5,uniform:"threshold",min:0,max:1,randMin:.25,randMax:.75,step:.01,ui:{label:"threshold",control:"slider"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"step",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={step:{glsl:`/*
 * Step threshold effect
 * Creates hard edge at threshold value
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float threshold;
uniform bool antialias;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec4 color = texture(inputTex, uv);

    if (antialias) {
        vec3 fw = fwidth(color.rgb);
        color.rgb = smoothstep(threshold - fw * 0.5, threshold + fw * 0.5, color.rgb);
    } else {
        color.rgb = step(threshold, color.rgb);
    }

    fragColor = color;
}
`,wgsl:`/*
 * Step threshold effect
 * Creates hard edge at threshold value
 */

struct Uniforms {
    threshold: f32,
    antialias: i32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let threshold = uniforms.threshold;

    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var color = textureSample(inputTex, inputSampler, uv);

    if (uniforms.antialias != 0) {
        let fw = fwidth(color.rgb);
        color = vec4<f32>(
            smoothstep(threshold - fw * 0.5, threshold + fw * 0.5, color.rgb),
            color.a
        );
    } else {
        color = vec4<f32>(step(vec3<f32>(threshold), color.rgb), color.a);
    }

    return color;
}
`}},o=`# step

Hard threshold at specified value

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| threshold | float | 0.5 | 0-1 | Threshold |
| antialias | boolean | true | on/off | Smooth edges between threshold bands |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .step()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(s))t.shaders[r]={...e}}t&&o&&(t.help=o);var f="filter/step",p="filter",h="step",d=t;export{d as default,f as effectId,h as effectName,o as help,p as namespace};
