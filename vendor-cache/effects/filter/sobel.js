/* filter/sobel */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Sobel",namespace:"filter",func:"sobel",tags:["edges"],description:"Classic Sobel edge detection",globals:{amount:{type:"float",default:1,uniform:"amount",min:.1,max:5,zero:0,randMin:.5,ui:{label:"amount",control:"slider"}},alpha:{type:"float",default:1,min:0,max:1,step:.01,uniform:"alpha",ui:{label:"alpha",control:"slider"}}},passes:[{name:"render",program:"sobel",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={sobel:{glsl:`/*
 * Sobel edge detection effect
 * Classic Sobel operator for edge detection
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float amount;
uniform float renderScale;
uniform float alpha;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    vec2 uv = globalCoord / fullResolution;
    vec2 texelSize = 1.0 / resolution;
    
    vec4 origColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    
    // Sobel X kernel
    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;
    
    // Sobel Y kernel
    float sobel_y[9];
    sobel_y[0] = 1.0;  sobel_y[1] = 2.0;  sobel_y[2] = 1.0;
    sobel_y[3] = 0.0;  sobel_y[4] = 0.0;  sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;
    
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
    
    vec3 convX = vec3(0.0);
    vec3 convY = vec3(0.0);
    
    for (int i = 0; i < 9; i++) {
        vec3 texSample = texture(inputTex, ((uv + offsets[i] * amount * renderScale) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb;
        convX += texSample * sobel_x[i];
        convY += texSample * sobel_y[i];
    }
    
    float dist = distance(convX, convY);
    
    // Multiply with original color
    vec3 result = origColor.rgb * dist;

    // Blend between original input and sobel result
    vec3 blended = mix(origColor.rgb, result, alpha);

    fragColor = vec4(blended, origColor.a);
}
`,wgsl:`/*
 * Sobel edge detection effect
 * Classic Sobel operator for edge detection
 */

struct Uniforms {
    amount: f32,
    alpha: f32,
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
    
    let origColor = textureSample(inputTex, inputSampler, uv);
    
    // Sobel X and Y kernels
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    
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
    
    var convX = vec3<f32>(0.0);
    var convY = vec3<f32>(0.0);
    
    for (var i = 0; i < 9; i = i + 1) {
        let sample = textureSample(inputTex, inputSampler, uv + offsets[i] * uniforms.amount).rgb;
        convX = convX + sample * sobel_x[i];
        convY = convY + sample * sobel_y[i];
    }
    
    let dist = distance(convX, convY);
    
    // Multiply with original color
    let result = origColor.rgb * dist;

    // Blend between original input and sobel result
    let blended = mix(origColor.rgb, result, uniforms.alpha);

    return vec4<f32>(blended, origColor.a);
}
`}},s=`# sobel

Classic Sobel edge detection

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 1 | 0.1-5 | Amount |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .sobel()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(i))t.shaders[o]={...e}}t&&s&&(t.help=s);var u="filter/sobel",c="filter",p="sobel",x=t;export{x as default,u as effectId,p as effectName,s as help,c as namespace};
