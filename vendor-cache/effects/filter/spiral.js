/* filter/spiral */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Spiral",namespace:"filter",func:"spiral",tags:["distort"],description:"Spiral distortion",globals:{strength:{type:"float",default:-100,uniform:"strength",min:-100,max:100,zero:0,ui:{label:"strength",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:-5,max:5,randMin:-1,randMax:1,ui:{label:"speed",control:"slider"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"spiral",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={spiral:{glsl:`/*
 * Spiral distortion
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
uniform int speed;
uniform bool aspectLens;
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
    // Compute distortion in global UV space so the spiral center is
    // at the full image center, not each tile's center.
    float aspectRatio = fullResolution.x / fullResolution.y;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Apply rotation before distortion
    uv = rotate2D(uv, rotation / 180.0, aspectRatio);

    uv -= 0.5;

    if (aspectLens) {
        uv.x *= aspectRatio;
    }

    // Convert to polar coordinates
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // Apply spiral distortion
    float spiralAmt = (strength * 0.05) * r;
    a += spiralAmt - (time * TAU * float(speed) * sign(strength));

    // Convert back to cartesian coordinates
    uv = vec2(cos(a), sin(a)) * r;

    if (aspectLens) {
        uv.x /= aspectRatio;
    }

    uv += 0.5;

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

    // Convert distorted global UV back to tile-local for texture sampling.
    // When not tiling, tileOffset=0 and fullResolution=resolution, so this
    // is a no-op (identity transform). Clamp to tile bounds so that wrap
    // modes referencing other parts of the image don't sample past this
    // tile's coverage (producing edge-clamped stripes).
    vec2 sampleUV = clamp((uv * fullResolution - tileOffset) / resolution, 0.0, 1.0);

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
}
`,wgsl:`/*
 * Spiral distortion
 */

struct Uniforms {
    strength: f32,
    speed: i32,
    aspectLens: i32,
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
    let speed = uniforms.speed;
    let t = time;

    // Apply rotation before distortion
    uv = rotate2D(uv, uniforms.rotation / 180.0, aspectRatio);

    uv = uv - 0.5;

    if (uniforms.aspectLens != 0) {
        uv.x = uv.x * aspectRatio;
    }

    // Convert to polar coordinates
    let r = length(uv);
    var a = atan2(uv.y, uv.x);

    // Apply spiral distortion
    let spiralAmt = (strength * 0.05) * r;
    a = a + spiralAmt - (t * TAU * f32(speed) * sign(strength));

    // Convert back to cartesian coordinates
    uv = vec2<f32>(cos(a), sin(a)) * r;

    if (uniforms.aspectLens != 0) {
        uv.x = uv.x / aspectRatio;
    }

    uv = uv + 0.5;

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
        col += textureSampleLevel(inputTex, inputSampler, uv + dx * -0.375 + dy * -0.125, 0.0);
        col += textureSampleLevel(inputTex, inputSampler, uv + dx *  0.125 + dy * -0.375, 0.0);
        col += textureSampleLevel(inputTex, inputSampler, uv + dx *  0.375 + dy *  0.125, 0.0);
        col += textureSampleLevel(inputTex, inputSampler, uv + dx * -0.125 + dy *  0.375, 0.0);
        return col * 0.25;
    } else {
        return textureSampleLevel(inputTex, inputSampler, uv, 0.0);
    }
}
`}},i=`# spiral

Spiral distortion

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | -100 | -100-100 | Strength |
| speed | int | 0 | -5-5 | Speed |
| rotation | float | 0 | -180-180 | Rotation |
| wrap | int | mirror | mirror/repeat/clamp | Wrap |
| aspectLens | boolean | true | - | 1:1 Aspect |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .spiral()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[a,t]of Object.entries(o))e.shaders[a]={...t}}e&&i&&(e.help=i);var u="filter/spiral",f="filter",c="spiral",d=e;export{d as default,u as effectId,c as effectName,i as help,f as namespace};
