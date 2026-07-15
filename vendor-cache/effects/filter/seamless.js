/* filter/seamless */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Seamless",namespace:"filter",func:"seamless",tags:["tiling","transform"],description:"Edge-blend cross-fade for seamless tiling",globals:{blend:{type:"float",default:.25,min:0,max:.5,step:.01,zero:0,uniform:"blend",ui:{label:"blend",control:"slider"}},repeat:{type:"float",default:2,min:1,max:10,step:1,zero:1,randMax:4,uniform:"repeat",ui:{label:"repeat",control:"slider"}},curve:{type:"int",default:1,uniform:"curve",choices:{linear:0,smooth:1,sharp:2},ui:{label:"curve",control:"dropdown"}}},passes:[{name:"main",program:"seamless",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={seamless:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform float blend;
uniform float repeat;
uniform int curve;

out vec4 fragColor;

/*
 * Blend weight function.
 * For a coordinate t in [0, 1], returns how much to blend
 * toward the wrapped sample. Weight is 1 at edges, 0 in center.
 */
float edgeWeight(float t, float width) {
    if (width <= 0.0) return 0.0;
    // Distance from nearest edge (0 at edge, 0.5 at center)
    float d = min(t, 1.0 - t);
    float w = 1.0 - clamp(d / width, 0.0, 1.0);
    // Apply curve
    if (curve == 0) {
        return w; // linear
    } else if (curve == 2) {
        return w * w; // sharp (quadratic)
    }
    return w * w * (3.0 - 2.0 * w); // smoothstep (default)
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);

    // Apply tiling repetition
    vec2 st = uv * repeat;
    st = fract(st);

    // Compute blend weights for x and y edges
    float wx = edgeWeight(st.x, blend);
    float wy = edgeWeight(st.y, blend);

    // Sample original and three wrapped positions
    vec4 c00 = texture(inputTex, st);
    vec4 c10 = texture(inputTex, fract(st + vec2(0.5, 0.0)));
    vec4 c01 = texture(inputTex, fract(st + vec2(0.0, 0.5)));
    vec4 c11 = texture(inputTex, fract(st + vec2(0.5, 0.5)));

    // Bilinear blend using edge weights
    vec4 mx0 = mix(c00, c10, wx);
    vec4 mx1 = mix(c01, c11, wx);
    vec4 result = mix(mx0, mx1, wy);

    fragColor = vec4(result.rgb, 1.0);
}
`,wgsl:`@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> resolution: vec2<f32>;
@group(0) @binding(3) var<uniform> aspect: f32;
@group(0) @binding(4) var<uniform> blend: f32;
@group(0) @binding(5) var<uniform> repeat: f32;
@group(0) @binding(6) var<uniform> curve: i32;

fn edgeWeight(t: f32, width: f32, c: i32) -> f32 {
    if (width <= 0.0) { return 0.0; }
    let d = min(t, 1.0 - t);
    let w = 1.0 - clamp(d / width, 0.0, 1.0);
    if (c == 0) {
        return w;
    } else if (c == 2) {
        return w * w;
    }
    return w * w * (3.0 - 2.0 * w);
}

fn fract2(v: vec2<f32>) -> vec2<f32> {
    return v - floor(v);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = position.xy / texSize;

    let st = fract2(uv * repeat);

    let wx = edgeWeight(st.x, blend, curve);
    let wy = edgeWeight(st.y, blend, curve);

    let c00 = textureSampleLevel(inputTex, samp, st, 0.0);
    let c10 = textureSample(inputTex, samp, fract2(st + vec2<f32>(0.5, 0.0)));
    let c01 = textureSample(inputTex, samp, fract2(st + vec2<f32>(0.0, 0.5)));
    let c11 = textureSample(inputTex, samp, fract2(st + vec2<f32>(0.5, 0.5)));

    let mx0 = mix(c00, c10, wx);
    let mx1 = mix(c01, c11, wx);
    let result = mix(mx0, mx1, wy);

    return vec4<f32>(result.rgb, 1.0);
}
`}},i=`# seamless

Edge-blend cross-fade for seamless tiling. Blends opposite edges of the input texture so the output tiles without visible seams.

## Description

Applies a toroidal cross-fade: pixels near the left edge blend toward right-edge content (and vice versa), and similarly for top/bottom. The result is a texture that tiles seamlessly in both directions.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| blend | float | 0.25 | 0-0.5 | Width of the cross-fade zone as fraction of tile |
| repeat | float | 2 | 1-10 | Number of tile repetitions to display |
| curve | int | smooth | linear/smooth/sharp | Blend falloff curve |

## Notes

- Set repeat to 1 to output just the seamless tile unit (for chaining with other effects)
- Higher blend values produce smoother seams but lose more of the original edge content
- Works best when the input has some visual variation \u2014 uniform inputs don't need blending

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .seamless()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(s))t.shaders[r]={...e}}t&&i&&(t.help=i);var p="filter/seamless",f="filter",c="seamless",d=t;export{d as default,p as effectId,c as effectName,i as help,f as namespace};
