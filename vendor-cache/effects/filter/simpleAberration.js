/* filter/simpleAberration */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Simple Aberration",namespace:"filter",func:"simpleAberration",tags:["color"],description:"Chromatic aberration",globals:{displacement:{type:"float",default:.02,uniform:"displacement",min:0,max:.1,step:.001,ui:{label:"displacement",control:"slider"}}},defaultProgram:`search filter, synth

noise(ridges: true, colorMode: mono)
.simpleAberration()
.write(o0)`,passes:[{name:"render",program:"chromaticAberration",inputs:{inputTex:"inputTex"},uniforms:{displacement:"displacement"},outputs:{fragColor:"outputTex"}}]});var i={chromaticAberration:{glsl:`#version 300 es

/*
 * Chromatic aberration effect.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float displacement;
out vec4 fragColor;

void main() {
    vec2 globalPixel = gl_FragCoord.xy + tileOffset;
    vec2 globalUV = globalPixel / fullResolution;
    
    float maxDisplacementUV = 256.0 / fullResolution.x;
    float boundedDisplacement = clamp(displacement, -maxDisplacementUV, maxDisplacementUV);
    
    vec2 redGlobalUV = globalUV + vec2(boundedDisplacement, 0.0);
    vec2 redLocalUV = (redGlobalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    vec4 red = texture(inputTex, redLocalUV);

    vec2 greenLocalUV = (globalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    vec4 green = texture(inputTex, greenLocalUV);

    vec2 blueGlobalUV = globalUV - vec2(boundedDisplacement, 0.0);
    vec2 blueLocalUV = (blueGlobalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    vec4 blue = texture(inputTex, blueLocalUV);

    fragColor = vec4(red.r, green.g, blue.b, green.a);
}
`,wgsl:`/*
 * Chromatic aberration effect.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    displacement: f32,
}

@group(0) @binding(2) var<uniform> u: Uniforms;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / u.resolution;

    let redOffset = clamp(uv.x + u.displacement, 0.0, 1.0);
    let red = textureSample(inputTex, samp, vec2f(redOffset, uv.y));

    let green = textureSample(inputTex, samp, uv);

    let blueOffset = clamp(uv.x - u.displacement, 0.0, 1.0);
    let blue = textureSample(inputTex, samp, vec2f(blueOffset, uv.y));

    // chromatic aberration
    return vec4f(red.r, green.g, blue.b, green.a);
}
`}},s=`# simpleAberration

Chromatic aberration

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| displacement | float | 0.02 | 0-0.1 | Channel displacement amount |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .simpleAberration()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(i))t.shaders[r]={...e}}t&&s&&(t.help=s);var p="filter/simpleAberration",f="filter",c="simpleAberration",m=t;export{m as default,p as effectId,c as effectName,s as help,f as namespace};
