/* filter/translate */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex&&(this.outputTex=t.outputTex),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.outputXyz&&(this.outputXyz=t.outputXyz),t.outputVel&&(this.outputVel=t.outputVel),t.outputRgba&&(this.outputRgba=t.outputRgba),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Translate",namespace:"filter",func:"translate",tags:["transform"],description:"Translate image in X and Y",globals:{x:{type:"float",default:0,uniform:"x",min:-1,max:1,step:.01,ui:{label:"x",control:"slider"}},y:{type:"float",default:0,uniform:"y",min:-1,max:1,step:.01,ui:{label:"y",control:"slider"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},defaultProgram:`search filter, synth

testPattern()
  .translate(x: 0.05, y: -0.05)
  .write(o0)`,passes:[{name:"render",program:"translate",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={translate:{glsl:`/*
 * Translate image X and Y
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float x;
uniform float y;
uniform int wrap;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    
    // Apply translation
    uv.x = uv.x - x;
    uv.y = uv.y - y;
    
    // Apply wrap mode
    if (wrap == 0) {
        // mirror
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = fract(uv);
    } else {
        // clamp
        uv = clamp(uv, 0.0, 1.0);
    }

    fragColor = texture(inputTex, uv);
}
`,wgsl:`/*
 * Translate image X and Y
 */

struct Uniforms {
    x: f32,
    y: f32,
    wrap: i32,
    _pad1: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var uv = pos.xy / texSize;
    
    // Apply translation
    uv.x = uv.x - uniforms.x;
    uv.y = uv.y - uniforms.y;
    
    // Apply wrap mode
    if (uniforms.wrap == 0) {
        // mirror
        uv = abs((uv + 1.0) - 2.0 * floor((uv + 1.0) / 2.0) - 1.0);
    } else if (uniforms.wrap == 1) {
        // repeat
        uv = fract(uv);
    } else {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    return textureSample(inputTex, inputSampler, uv);
}
`}},a=`# translate

Translate image in X and Y

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| x | float | 0 | -1-1 | X |
| y | float | 0 | -1-1 | Y |
| wrap | int | repeat | mirror/repeat/clamp | Wrap |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .translate()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(s).length>0){e.shaders||(e.shaders={});for(let[r,t]of Object.entries(s))e.shaders[r]={...t}}e&&a&&(e.help=a);var l="filter/translate",f="filter",m="translate",d=e;export{d as default,l as effectId,m as effectName,a as help,f as namespace};
