/* filter/polar */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Polar",namespace:"filter",func:"polar",tags:["distort"],description:"Polar and vortex coordinate transforms",globals:{mode:{type:"int",default:0,uniform:"polarMode",choices:{polar:0,vortex:1},ui:{label:"mode",control:"dropdown"}},scale:{type:"float",default:0,uniform:"scale",min:-2,max:2,step:.1,ui:{label:"scale",control:"slider"}},rotation:{type:"int",default:0,uniform:"rotation",min:-2,max:2,ui:{label:"rot speed",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:-2,max:2,ui:{label:"polar speed",control:"slider"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"polar",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={polar:{glsl:`/*
 * Polar and vortex coordinate transforms
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int polarMode;
uniform float speed;
uniform float rotation;
uniform float scale;
uniform bool aspectLens;
uniform bool antialias;

out vec4 fragColor;

const float TAU = 6.28318530718;

float smod(float v, float m) {
    return m * (0.75 - abs(fract(v) - 0.5) - 0.25);
}

vec2 smod2(vec2 v, float m) {
    return m * (0.75 - abs(fract(v) - 0.5) - 0.25);
}

vec2 polarCoords(vec2 uv, float aspect) {
    uv -= 0.5;
    if (aspectLens) { uv.x *= aspect; }
    vec2 coord = vec2(atan(uv.y, uv.x) / TAU + 0.5, length(uv) - scale * 0.075);
    coord.x = smod(coord.x + time * -rotation, 1.0);
    coord.y = smod(coord.y + time * speed, 1.0);
    return coord;
}

vec2 vortexCoords(vec2 uv, float aspect) {
    uv -= 0.5;
    if (aspectLens) { uv.x *= aspect; }
    float r2 = dot(uv, uv) - scale * 0.01;
    uv = uv / r2;
    uv.x = smod(uv.x + time * -rotation, 1.0);
    uv.y = smod(uv.y + time * speed, 1.0);
    return uv;
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;
    float aspect = fullRes.x / fullRes.y;

    vec2 coord;
    if (polarMode == 0) {
        coord = polarCoords(uv, aspect);
    } else {
        coord = vortexCoords(uv, aspect);
    }

    if (antialias) {
        vec2 dx = dFdx(coord);
        vec2 dy = dFdy(coord);
        vec4 col = vec4(0.0);
        col += texture(inputTex, coord + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, coord + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, coord + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, coord + dx * -0.125 + dy *  0.375);
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, coord);
    }
}
`,wgsl:`/*
 * Polar and vortex coordinate transforms
 */

struct Uniforms {
    time: f32,
    polarMode: i32,
    speed: f32,
    rotation: f32,
    scale: f32,
    aspectLens: i32,
    antialias: i32,
    _pad3: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.28318530718;

fn smod1(v: f32, m: f32) -> f32 {
    return m * (0.75 - abs(fract(v) - 0.5) - 0.25);
}

fn polarCoords(uvIn: vec2<f32>, aspect: f32, doAspect: bool) -> vec2<f32> {
    var uv = uvIn - 0.5;
    if (doAspect) { uv.x = uv.x * aspect; }
    var coord = vec2<f32>(atan2(uv.y, uv.x) / TAU + 0.5, length(uv) - uniforms.scale * 0.075);
    coord.x = smod1(coord.x + uniforms.time * -uniforms.rotation, 1.0);
    coord.y = smod1(coord.y + uniforms.time * uniforms.speed, 1.0);
    return coord;
}

fn vortexCoords(uvIn: vec2<f32>, aspect: f32, doAspect: bool) -> vec2<f32> {
    var uv = uvIn - 0.5;
    if (doAspect) { uv.x = uv.x * aspect; }
    let r2 = dot(uv, uv) - uniforms.scale * 0.01;
    uv = uv / r2;
    uv.x = smod1(uv.x + uniforms.time * -uniforms.rotation, 1.0);
    uv.y = smod1(uv.y + uniforms.time * uniforms.speed, 1.0);
    return uv;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let aspect = texSize.x / texSize.y;
    let doAspect = uniforms.aspectLens != 0;

    var coord: vec2<f32>;
    if (uniforms.polarMode == 0) {
        coord = polarCoords(uv, aspect, doAspect);
    } else {
        coord = vortexCoords(uv, aspect, doAspect);
    }

    if (uniforms.antialias != 0) {
        let dx = dpdx(coord);
        let dy = dpdy(coord);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, coord + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, coord + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, coord + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, coord + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return textureSample(inputTex, inputSampler, coord);
    }
}
`}},s=`# polar

Polar and vortex coordinate transforms

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | polar | polar/vortex | Transform mode |
| scale | float | 0 | -2\u20132 | Scale offset |
| rotation | int | 0 | -2\u20132 | Rotation speed |
| speed | int | 0 | -2\u20132 | Radial animation speed |
| aspectLens | boolean | true | on/off | Correct for aspect ratio so transform is circular |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .polar()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(r))t.shaders[o]={...e}}t&&s&&(t.help=s);var d="filter/polar",c="filter",p="polar",f=t;export{f as default,d as effectId,p as effectName,s as help,c as namespace};
