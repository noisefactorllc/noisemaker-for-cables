/* filter/deriv */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Deriv",namespace:"filter",func:"deriv",tags:["edges"],description:"Derivative-based edge detection",globals:{amount:{type:"float",default:2,uniform:"amount",min:.1,max:5,randMin:1,ui:{label:"amount",control:"slider"}}},passes:[{name:"render",program:"deriv",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={deriv:{glsl:`/*
 * Derivative-based edge detection
 * Computes image derivatives to highlight edges
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

vec3 desaturate(vec3 color) {
    float avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    return vec3(avg);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 texelSize = 1.0 / vec2(texSize);
    vec2 localUV = gl_FragCoord.xy * texelSize;
    
    float radiusPixels = amount * renderScale;
    radiusPixels = min(radiusPixels, 256.0);
    
    vec4 color = texture(inputTex, localUV);
    vec3 center = desaturate(color.rgb);
    vec3 right = desaturate(texture(inputTex, localUV + vec2(radiusPixels, 0.0) * texelSize).rgb);
    vec3 bottom = desaturate(texture(inputTex, localUV + vec2(0.0, radiusPixels) * texelSize).rgb);
    
    vec3 dx = center - right;
    vec3 dy = center - bottom;
    
    float dist = distance(dx, dy) * 2.5;
    
    fragColor = vec4(clamp(color.rgb * dist, 0.0, 1.0), color.a);
}`,wgsl:`/*
 * Derivative-based edge detection
 * Computes image derivatives to highlight edges
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

fn desaturate(color: vec3<f32>) -> vec3<f32> {
    let avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    return vec3<f32>(avg);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    let color = textureSample(inputTex, inputSampler, uv);
    
    // Sample neighbors for derivative calculation
    let center = desaturate(color.rgb);
    let right = desaturate(textureSample(inputTex, inputSampler, uv + vec2<f32>(texelSize.x * uniforms.amount, 0.0)).rgb);
    let bottom = desaturate(textureSample(inputTex, inputSampler, uv + vec2<f32>(0.0, texelSize.y * uniforms.amount)).rgb);
    
    // Compute derivatives
    let dx = center - right;
    let dy = center - bottom;
    
    let dist = distance(dx, dy) * 2.5;
    
    return vec4<f32>(clamp(color.rgb * dist, vec3<f32>(0.0), vec3<f32>(1.0)), color.a);
}
`}},o=`# deriv

Derivative-based edge detection

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 2 | 0.1-5 | Amount |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .deriv()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(i))t.shaders[r]={...e}}t&&o&&(t.help=o);var d="filter/deriv",c="filter",p="deriv",f=t;export{f as default,d as effectId,p as effectName,o as help,c as namespace};
