/* filter/waves */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Waves",namespace:"filter",func:"waves",tags:["distort"],description:"Sine wave distortion",globals:{strength:{type:"float",default:25,uniform:"strength",min:0,max:100,zero:0,ui:{label:"strength",control:"slider"}},scale:{type:"float",default:1,uniform:"scale",min:1,max:5,ui:{label:"scale",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:-5,max:5,ui:{label:"speed",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"waves",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={waves:{glsl:`/*
 * Sine wave distortion
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float strength;
uniform float scale;
uniform int speed;
uniform int wrap;
uniform float rotation;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

vec2 rotate2D(vec2 st, float rot, float aspectRatio) {
    st.x *= aspectRatio;
    float angle = rot * PI;
    st -= vec2(0.5 * aspectRatio, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspectRatio, 0.5);
    st.x /= aspectRatio;
    return st;
}

void main() {
    float aspectRatio = fullResolution.x / fullResolution.y;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Apply rotation before distortion
    uv = rotate2D(uv, rotation / 180.0, aspectRatio);

    // Sine wave distortion
    float displacement = sin(uv.x * scale * 10.0 + time * TAU * float(speed)) * (strength * 0.01);
    
    // Bound displacement to overlap in tile mode to prevent seams
    if (any(notEqual(tileOffset, vec2(0.0)))) {
        float maxDisplacementUV = 256.0 / fullResolution.y;
        displacement = clamp(displacement, -maxDisplacementUV, maxDisplacementUV);
    }
    
    uv.y += displacement;

    // Apply wrap mode
    if (wrap == 0) {
        // mirror
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = mod(uv, 1.0);
    } else {
        // clamp
        uv = clamp(uv, 0.0, 1.0);
    }

    // Reverse rotation after distortion
    uv = rotate2D(uv, -rotation / 180.0, aspectRatio);

    // Convert distorted global UV to tile-local UV.
    vec2 localCoord = (uv * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    
    // In tile mode, wrap to enable seamless tiling. In normal mode, clamp to preserve original behavior.
    vec2 sampleUV = any(notEqual(tileOffset, vec2(0.0))) ? fract(localCoord) : clamp(localCoord, 0.0, 1.0);

    if (antialias) {
        vec2 dx = dFdx(sampleUV);
        vec2 dy = dFdy(sampleUV);
        vec4 col = vec4(0.0);
        col += texture(inputTex, sampleUV + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, sampleUV + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, sampleUV + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, sampleUV + dx * -0.125 + dy *  0.375);
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, sampleUV);
    }
}`,wgsl:`/*
 * Sine wave distortion
 */

struct Uniforms {
    strength: f32,
    scale: f32,
    speed: i32,
    wrap: i32,
    rotation: f32,
    antialias: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<uniform> time: f32;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn rotate2D(st_in: vec2<f32>, rot: f32, aspectRatio: f32) -> vec2<f32> {
    var st = st_in;
    st.x = st.x * aspectRatio;
    let angle = rot * PI;
    st = st - vec2<f32>(0.5 * aspectRatio, 0.5);
    let c = cos(angle);
    let s = sin(angle);
    st = vec2<f32>(c * st.x - s * st.y, s * st.x + c * st.y);
    st = st + vec2<f32>(0.5 * aspectRatio, 0.5);
    st.x = st.x / aspectRatio;
    return st;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let aspectRatio = texSize.x / texSize.y;
    var uv = pos.xy / texSize;

    let strength = uniforms.strength;
    let scale = uniforms.scale;
    let speed = uniforms.speed;
    let t = time;

    // Apply rotation before distortion
    uv = rotate2D(uv, uniforms.rotation / 180.0, aspectRatio);

    // Sine wave distortion
    uv.y = uv.y + sin(uv.x * scale * 10.0 + t * TAU * f32(speed)) * (strength * 0.01);

    // Apply wrap mode
    if (uniforms.wrap == 0) {
        // mirror
        uv = abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (uniforms.wrap == 1) {
        // repeat
        uv = (uv % 1.0 + 1.0) % 1.0;
    } else {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    // Reverse rotation after distortion
    uv = rotate2D(uv, -uniforms.rotation / 180.0, aspectRatio);

    if (uniforms.antialias != 0) {
        let dx = dpdx(uv);
        let dy = dpdy(uv);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return textureSample(inputTex, inputSampler, uv);
    }
}
`}},i=`# waves

Sine wave distortion

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | 25 | 0-100 | Strength |
| scale | float | 1 | 1-5 | Scale |
| speed | int | 0 | -5-5 | Speed |
| wrap | int | mirror | mirror/repeat/clamp | Wrap |
| rotation | float | 0 | -180-180 | Rotation |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .waves()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[a,e]of Object.entries(o))t.shaders[a]={...e}}t&&i&&(t.help=i);var p="filter/waves",f="filter",c="waves",d=t;export{d as default,p as effectId,c as effectName,i as help,f as namespace};
