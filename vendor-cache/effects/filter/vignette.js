/* filter/vignette */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Vignette",namespace:"filter",func:"vignette",tags:["lens"],description:"Radial vignette darkening edges",globals:{brightness:{type:"float",default:0,uniform:"vignetteBrightness",min:0,max:1,step:.01,ui:{label:"brightness",control:"slider"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},passes:[{name:"render",program:"vignette",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={vignette:{glsl:`/*
 * Radial vignette with brightness blend
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float vignetteBrightness;
uniform float alpha;

out vec4 fragColor;

float computeVignetteMask(vec2 uv, vec2 dims) {
    if (dims.x <= 0.0 || dims.y <= 0.0) {
        return 0.0;
    }
    
    vec2 delta = abs(uv - vec2(0.5));
    float aspect = dims.x / max(dims.y, 1.0);
    vec2 scaled = vec2(delta.x * aspect, delta.y);
    float maxRadius = length(vec2(aspect * 0.5, 0.5));
    
    if (maxRadius <= 0.0) {
        return 0.0;
    }
    
    float normalizedDist = clamp(length(scaled) / maxRadius, 0.0, 1.0);
    return normalizedDist * normalizedDist;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 dims = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = gl_FragCoord.xy / tileDims;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / dims;

    vec4 texel = texture(inputTex, uv);

    float mask = computeVignetteMask(globalUV, dims);
    
    // Apply brightness to RGB only, preserve alpha
    vec3 brightnessRgb = vec3(vignetteBrightness);
    vec3 edgeBlend = mix(texel.rgb, brightnessRgb, mask);
    vec3 finalRgb = mix(texel.rgb, edgeBlend, alpha);
    
    fragColor = vec4(finalRgb, texel.a);
}
`,wgsl:`/*
 * Radial vignette with brightness blend
 */

struct Uniforms {
    vignetteBrightness: f32,
    alpha: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn computeVignetteMask(uv: vec2<f32>, dims: vec2<f32>) -> f32 {
    if (dims.x <= 0.0 || dims.y <= 0.0) {
        return 0.0;
    }
    
    let delta = abs(uv - vec2<f32>(0.5));
    let aspect = dims.x / max(dims.y, 1.0);
    let scaled = vec2<f32>(delta.x * aspect, delta.y);
    let maxRadius = length(vec2<f32>(aspect * 0.5, 0.5));
    
    if (maxRadius <= 0.0) {
        return 0.0;
    }
    
    let normalizedDist = clamp(length(scaled) / maxRadius, 0.0, 1.0);
    return normalizedDist * normalizedDist;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    
    let texel = textureSample(inputTex, inputSampler, uv);
    
    let mask = computeVignetteMask(uv, texSize);
    
    // Apply brightness to RGB only, preserve alpha
    let brightnessRgb = vec3<f32>(uniforms.vignetteBrightness);
    let edgeBlend = mix(texel.rgb, brightnessRgb, mask);
    let finalRgb = mix(texel.rgb, edgeBlend, uniforms.alpha);
    
    return vec4<f32>(finalRgb, texel.a);
}
`}},a=`# vignette

Radial vignette darkening edges

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| brightness | float | 0 | 0-1 | Brightness |
| alpha | float | 1 | 0-1 | Alpha |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .vignette()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(s))t.shaders[i]={...e}}t&&a&&(t.help=a);var p="filter/vignette",f="filter",d="vignette",m=t;export{m as default,p as effectId,d as effectName,a as help,f as namespace};
