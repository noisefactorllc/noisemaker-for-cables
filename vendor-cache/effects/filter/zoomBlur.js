/* filter/zoomBlur */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"ZoomBlur",namespace:"filter",func:"zoomBlur",tags:["blur"],description:"Radial blur emanating from center",globals:{strength:{type:"float",default:.5,uniform:"strength",min:0,max:1,zero:0,ui:{label:"strength",control:"slider"}}},passes:[{name:"render",program:"zoomBlur",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={zoomBlur:{glsl:`/*
 * Zoom/radial blur effect
 * Creates a radial blur emanating from the center
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float strength;

out vec4 fragColor;

// PCG PRNG
uvec3 pcg(uvec3 v) {
    v = v * uint(1664525) + uint(1013904223);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> uint(16);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec3 prng(vec3 p) {
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = gl_FragCoord.xy / tileDims;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;

    vec3 color = vec3(0.0);
    float total = 0.0;
    vec2 toCenter = globalUV - 0.5;
    
    // Randomize the lookup values to hide the fixed number of samples
    float offset = prng(vec3(12.9898, 78.233, 151.7182)).x;
    
    for (float t = 0.0; t <= 40.0; t++) {
        float percent = (t + offset) / 40.0;
        float weight = 4.0 * (percent - percent * percent);
        vec4 tex = texture(inputTex, uv + toCenter * percent * strength);
        color += tex.rgb * weight;
        total += weight;
    }
    
    color /= total;
    
    fragColor = vec4(color, 1.0);
}
`,wgsl:`/*
 * Zoom/radial blur effect
 * Creates a radial blur emanating from the center
 */

struct Uniforms {
    strength: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// PCG PRNG
fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

fn prng(p: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(pcg(vec3<u32>(p))) / f32(0xffffffffu);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    
    var color = vec3<f32>(0.0);
    var total = 0.0;
    let toCenter = uv - 0.5;
    
    // Randomize the lookup values to hide the fixed number of samples
    let offset = prng(vec3<f32>(12.9898, 78.233, 151.7182)).x;
    
    for (var t = 0.0; t <= 40.0; t = t + 1.0) {
        let percent = (t + offset) / 40.0;
        let weight = 4.0 * (percent - percent * percent);
        let tex = textureSampleLevel(inputTex, inputSampler, uv + toCenter * percent * uniforms.strength, 0.0);
        color = color + tex.rgb * weight;
        total = total + weight;
    }
    
    color = color / total;
    
    return vec4<f32>(color, 1.0);
}
`}},i=`# zoomBlur

Radial blur emanating from center

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | 0.5 | 0-1 | Strength |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .zoomBlur()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&i&&(t.help=i);var f="filter/zoomBlur",p="filter",c="zoomBlur",v=t;export{v as default,f as effectId,c as effectName,i as help,p as namespace};
