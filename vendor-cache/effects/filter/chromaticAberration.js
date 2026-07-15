/* filter/chromaticAberration */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"ChromaticAberration",namespace:"filter",func:"chromaticAberration",tags:["distort","lens"],description:"Color fringing effect simulating lens aberration",globals:{aberration:{type:"float",default:50,uniform:"aberrationAmt",min:0,max:100,ui:{label:"aberration",control:"slider"}},passthru:{type:"float",default:50,uniform:"passthru",min:0,max:100,ui:{label:"passthru",control:"slider"}}},defaultProgram:`search synth, filter
noise(colorMode: mono, ridges: true)
.chromaticAberration()
.write(o0)`,paramAliases:{aberrationAmt:"aberration"},passes:[{name:"render",program:"chromaticAberration",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={chromaticAberration:{glsl:`#version 300 es

/*
 * Chromatic aberration effect.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aberrationAmt;
uniform float passthru;
out vec4 fragColor;

#define PI 3.14159265359
#define aspectRatio fullResolution.x / fullResolution.y

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    float globalAspect = fullRes.x / fullRes.y;

    vec2 diff = vec2(0.5 * globalAspect, 0.5) - vec2(globalUV.x * globalAspect, globalUV.y);
    float centerDist = length(diff);

    float aberrationOffset = map(aberrationAmt, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    float redOffset = mix(clamp(uv.x + aberrationOffset, 0.0, 1.0), uv.x, uv.x);
    vec4 red = texture(inputTex, ((vec2(redOffset, uv.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0)));

    vec4 green = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    float blueOffset = mix(uv.x, clamp(uv.x - aberrationOffset, 0.0, 1.0), uv.x);
    vec4 blue = texture(inputTex, ((vec2(blueOffset, uv.y)) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0)));

    // chromatic aberration - extract color fringing edges only
    vec3 aberrated = vec3(red.r, green.g, blue.b);
    vec3 edges = aberrated - green.rgb;

    // scale original by passthru and add to edges
    vec3 original = green.rgb * map(passthru, 0.0, 100.0, 0.0, 2.0);

    fragColor = vec4(min(edges + original, 1.0), green.a);
}
`,wgsl:`/*
 * Chromatic aberration effect.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    aberrationAmt: f32,
    passthru: f32,
    tileOffset: vec2f,
    fullResolution: vec2f,
}

@group(0) @binding(2) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;

fn mapVal(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let aspectRatio = u.fullResolution.x / u.fullResolution.y;
    let uv = (fragCoord.xy + u.tileOffset) / u.fullResolution;
    let texSize = vec2f(textureDimensions(inputTex, 0));

    let diff = vec2f(0.5 * aspectRatio, 0.5) - vec2f(uv.x * aspectRatio, uv.y);
    let centerDist = length(diff);

    let aberrationOffset = mapVal(u.aberrationAmt, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    let redOffset = mix(clamp(uv.x + aberrationOffset, 0.0, 1.0), uv.x, uv.x);
    let red = textureSample(inputTex, samp, (vec2f(redOffset, uv.y) * u.fullResolution - u.tileOffset) / texSize);

    let green = textureSample(inputTex, samp, fragCoord.xy / texSize);

    let blueOffset = mix(uv.x, clamp(uv.x - aberrationOffset, 0.0, 1.0), uv.x);
    let blue = textureSample(inputTex, samp, (vec2f(blueOffset, uv.y) * u.fullResolution - u.tileOffset) / texSize);

    // chromatic aberration - extract color fringing edges only
    let aberrated = vec3f(red.r, green.g, blue.b);
    let edges = aberrated - green.rgb;

    // scale original by passthru and add to edges
    let original = green.rgb * mapVal(u.passthru, 0.0, 100.0, 0.0, 2.0);

    return vec4f(min(edges + original, vec3f(1.0)), green.a);
}
`}},a=`# chromaticAberration

Color fringing effect simulating lens aberration

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| aberration | float | 50 | 0-100 | Aberration |
| passthru | float | 50 | 0-100 | Passthru |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .chromaticAberration()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(i))t.shaders[r]={...e}}t&&a&&(t.help=a);var f="filter/chromaticAberration",c="filter",p="chromaticAberration",m=t;export{m as default,f as effectId,p as effectName,a as help,c as namespace};
