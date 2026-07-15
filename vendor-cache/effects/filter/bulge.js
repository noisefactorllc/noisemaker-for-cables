/* filter/bulge */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Bulge",namespace:"filter",func:"bulge",tags:["distort"],description:"Bulge distortion from center",globals:{strength:{type:"float",default:25,uniform:"strength",min:0,max:100,zero:0,ui:{label:"strength",control:"slider"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},defaultProgram:`search synth, filter
testPattern(gridSize: 8)
.bulge()
.write(o0)`,passes:[{name:"render",program:"bulge",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={bulge:{glsl:`/*
 * Bulge distortion
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float strength;
uniform bool aspectLens;
uniform int wrap;
uniform float rotation;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359

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

    float intensity = strength * -0.01;

    uv -= 0.5;

    if (aspectLens) {
        uv.x *= aspectRatio;
    }

    float r = length(uv);
    float effect = pow(r, 1.0 - intensity);
    uv = normalize(uv) * effect;

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
    // Use fract() to seamlessly wrap samples at tile boundaries.
    vec2 sampleUV = fract((uv * fullResolution - tileOffset) / resolution);

    if (antialias) {
        // 4x supersample using distortion derivatives for adaptive spread
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
 * Bulge distortion
 */

struct Uniforms {
    strength: f32,
    aspectLens: i32,
    wrap: i32,
    rotation: f32,
    antialias: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;

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

    // Apply rotation before distortion
    uv = rotate2D(uv, uniforms.rotation / 180.0, aspectRatio);

    let intensity = uniforms.strength * -0.01;

    uv = uv - 0.5;

    if (uniforms.aspectLens != 0) {
        uv.x = uv.x * aspectRatio;
    }

    let r = length(uv);
    let effect = pow(r, 1.0 - intensity);
    uv = normalize(uv) * effect;

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
        // 4x supersample using distortion derivatives for adaptive spread
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
`}},s=`# bulge

Bulge distortion from center

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| strength | float | 25 | 0-100 | Strength |
| aspectLens | boolean | true | - | 1:1 Aspect |
| wrap | int | mirror | mirror/repeat/clamp | Wrap |
| rotation | float | 0 | -180-180 | Rotation |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .bulge()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[o,t]of Object.entries(r))e.shaders[o]={...t}}e&&s&&(e.help=s);var p="filter/bulge",f="filter",c="bulge",d=e;export{d as default,p as effectId,c as effectName,s as help,f as namespace};
