/* filter/sharpen */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Sharpen",namespace:"filter",func:"sharpen",tags:["edges"],description:"Sharpen using convolution",globals:{amount:{type:"float",default:1,uniform:"amount",min:.1,max:5,zero:0,ui:{label:"amount",control:"slider"}}},defaultProgram:`search filter, synth

pattern(type: dots, smoothness: 0.04)
  .sharpen(amount: 5)
  .write(o0)`,passes:[{name:"render",program:"sharpen",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={sharpen:{glsl:`/*
 * Sharpen convolution effect
 * Enhances image detail and edges
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float amount;
uniform float renderScale;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    vec2 uv = globalCoord / fullResolution;
    vec2 texelSize = 1.0 / resolution;
    
    vec4 origColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    
    // Sharpen kernel
    // -1  0 -1
    //  0  5  0
    // -1  0 -1
    float kernel[9];
    kernel[0] = -1.0; kernel[1] = 0.0; kernel[2] = -1.0;
    kernel[3] = 0.0;  kernel[4] = 5.0; kernel[5] = 0.0;
    kernel[6] = -1.0; kernel[7] = 0.0; kernel[8] = -1.0;
    
    vec2 offsets[9];
    offsets[0] = vec2(-texelSize.x, -texelSize.y);
    offsets[1] = vec2(0.0, -texelSize.y);
    offsets[2] = vec2(texelSize.x, -texelSize.y);
    offsets[3] = vec2(-texelSize.x, 0.0);
    offsets[4] = vec2(0.0, 0.0);
    offsets[5] = vec2(texelSize.x, 0.0);
    offsets[6] = vec2(-texelSize.x, texelSize.y);
    offsets[7] = vec2(0.0, texelSize.y);
    offsets[8] = vec2(texelSize.x, texelSize.y);
    
    vec3 conv = vec3(0.0);
    
    for (int i = 0; i < 9; i++) {
        vec3 texSample = texture(inputTex, ((uv + offsets[i] * amount * renderScale) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb;
        conv += texSample * kernel[i];
    }
    
    fragColor = vec4(clamp(conv, 0.0, 1.0), origColor.a);
}
`,wgsl:`/*
 * Sharpen convolution effect
 * Enhances image detail and edges
 */

struct Uniforms {
    amount: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    let origColor = textureSampleLevel(inputTex, inputSampler, uv, 0.0);
    
    // Sharpen kernel
    let kernel = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 5.0, 0.0, -1.0, 0.0, -1.0);
    
    let offsets = array<vec2<f32>, 9>(
        vec2<f32>(-texelSize.x, -texelSize.y),
        vec2<f32>(0.0, -texelSize.y),
        vec2<f32>(texelSize.x, -texelSize.y),
        vec2<f32>(-texelSize.x, 0.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(texelSize.x, 0.0),
        vec2<f32>(-texelSize.x, texelSize.y),
        vec2<f32>(0.0, texelSize.y),
        vec2<f32>(texelSize.x, texelSize.y)
    );
    
    var conv = vec3<f32>(0.0);
    
    for (var i = 0; i < 9; i = i + 1) {
        let sample = textureSampleLevel(inputTex, inputSampler, uv + offsets[i] * uniforms.amount, 0.0).rgb;
        conv = conv + sample * kernel[i];
    }
    
    return vec4<f32>(clamp(conv, vec3<f32>(0.0), vec3<f32>(1.0)), origColor.a);
}
`}},s=`# sharpen

Sharpen using convolution

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 1 | 0.1-5 | Amount |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .sharpen()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&s&&(n.help=s);var u="filter/sharpen",p="filter",c="sharpen",x=n;export{x as default,u as effectId,c as effectName,s as help,p as namespace};
