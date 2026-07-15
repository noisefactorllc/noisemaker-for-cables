/* filter/directionalBlur */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Directional Blur",namespace:"filter",func:"directionalBlur",tags:["blur","artist"],description:"Linear motion blur along a single direction (Motion Blur)",globals:{angle:{type:"float",default:0,uniform:"angle",min:-180,max:180,ui:{label:"angle",control:"slider"}},distance:{type:"float",default:60,uniform:"blurDistance",min:1,max:200,ui:{label:"distance",control:"slider"}}},passes:[{name:"render",program:"directionalBlur",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={directionalBlur:{glsl:`/*
 * Directional Blur - linear motion blur along a fixed angle. Averages a
 * fixed N-tap comb stepped along
 * dir = (cos(angle), sin(angle)), spanning blurDistance px total
 * (t ranges over [-blurDistance/2, blurDistance/2]). A per-pixel hash
 * shifts the whole tap comb by up to half a tap-step to hide banding
 * from the fixed tap count.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float angle;
uniform float blurDistance;

out vec4 fragColor;

const int N = 32;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));

    float tapStep = blurDistance / float(N - 1);
    float jitter = (hash12(gl_FragCoord.xy) - 0.5) * tapStep;

    vec4 sum = vec4(0.0);
    for (int i = 0; i < N; i++) {
        float t = (float(i) / float(N - 1) - 0.5) * blurDistance + jitter;
        vec2 offset = dir * t;
        sum += texture(inputTex, (gl_FragCoord.xy + offset) / resolution);
    }
    fragColor = sum / float(N);
}
`,wgsl:`/*
 * Directional Blur - linear motion blur along a fixed angle. Averages a
 * fixed N-tap comb stepped along
 * dir = (cos(angle), sin(angle)), spanning blurDistance px total
 * (t ranges over [-blurDistance/2, blurDistance/2]). A per-pixel hash
 * shifts the whole tap comb by up to half a tap-step to hide banding
 * from the fixed tap count.
 */

struct Uniforms {
    angle: f32,
    blurDistance: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const N: i32 = 32;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let a = radians(uniforms.angle);
    let dir = vec2<f32>(cos(a), sin(a));

    let tapStep = uniforms.blurDistance / f32(N - 1);
    let jitter = (hash12(pos.xy) - 0.5) * tapStep;

    var sum = vec4<f32>(0.0);
    for (var i: i32 = 0; i < N; i++) {
        let t = (f32(i) / f32(N - 1) - 0.5) * uniforms.blurDistance + jitter;
        let offset = dir * t;
        sum = sum + textureSample(inputTex, inputSampler, (pos.xy + offset) / texSize);
    }
    return sum / f32(N);
}
`}},r=`# directionalBlur

Linear motion blur along a single direction (Motion Blur)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| angle | float | 0 | -180-180 | Direction of the blur streak, in degrees (0 = horizontal) |
| distance | float | 20 | 1-200 | Total streak span, in pixels |

## Notes

- Averages a fixed 32-tap comb evenly spaced along the blur axis, from \`-distance/2\` to \`+distance/2\` px.
- Each pixel's tap comb is shifted by a random per-pixel offset (up to half a tap step) to hide banding from the fixed tap count.
- Distinct from \`filter/motionBlur\`, which is a temporal frame-blending effect, not a spatial directional blur.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .directionalBlur()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[i,t]of Object.entries(a))e.shaders[i]={...t}}e&&r&&(e.help=r);var p="filter/directionalBlur",f="filter",c="directionalBlur",d=e;export{d as default,p as effectId,c as effectName,r as help,f as namespace};
