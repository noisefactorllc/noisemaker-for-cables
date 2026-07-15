/* filter/vaseline */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Vaseline",namespace:"filter",func:"vaseline",tags:["blur"],description:"Vaseline lens blur effect",globals:{alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},passes:[{name:"main",program:"upsample",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]});var r={upsample:{glsl:`#version 300 es
precision highp float;

// Vaseline - N-tap blur with edge-weighted blending
// Uses golden angle spiral kernel for smooth, non-blocky blur

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float alpha;

out vec4 fragColor;

const int TAP_COUNT = 32;
const float RADIUS = 48.0;
const float GOLDEN_ANGLE = 2.39996323;
const float BRIGHTNESS_ADJUST = 0.15;

vec3 clamp01(vec3 v) {
    return clamp(v, vec3(0.0), vec3(1.0));
}

float chebyshev_mask(vec2 uv) {
    vec2 centered = abs(uv - vec2(0.5)) * 2.0;
    return max(centered.x, centered.y);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec4 original = texelFetch(inputTex, ivec2(gl_FragCoord.xy), 0);
    float a = clamp(alpha, 0.0, 1.0);

    if (a <= 0.0) {
        fragColor = vec4(clamp01(original.rgb), original.a);
        return;
    }

    vec2 texelSize = 1.0 / fullResolution;
    vec2 radiusUV = RADIUS * renderScale * texelSize;

    // N-tap gather using golden angle spiral (Poisson-like distribution)
    vec3 blurAccum = vec3(0.0);
    float weightSum = 0.0;

    for (int i = 0; i < TAP_COUNT; i++) {
        float t = float(i) / float(TAP_COUNT);
        float r = sqrt(t);
        float theta = float(i) * GOLDEN_ANGLE;
        vec2 offset = vec2(cos(theta), sin(theta)) * r;

        float sigma = 0.4;
        float weight = exp(-0.5 * (r * r) / (sigma * sigma));

        vec2 sampleGlobalUV = clamp(uv + offset * radiusUV, vec2(0.0), vec2(1.0));
        vec2 sampleLocalUV = (sampleGlobalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
        blurAccum += texture(inputTex, sampleLocalUV).rgb * weight;
        weightSum += weight;
    }

    vec3 blurred = blurAccum / weightSum;
    vec3 boosted = clamp01(blurred + vec3(BRIGHTNESS_ADJUST));

    // Edge mask - more effect at edges, using global UV so center is full-image center
    float edgeMask = chebyshev_mask(globalUV);
    edgeMask = smoothstep(0.0, 0.8, edgeMask);

    vec3 sourceClamped = clamp01(original.rgb);
    vec3 bloomed = clamp01((sourceClamped + boosted) * 0.5);
    vec3 edgeBlended = mix(sourceClamped, bloomed, edgeMask);
    vec3 finalRgb = clamp01(mix(sourceClamped, edgeBlended, a));

    fragColor = vec4(finalRgb, original.a);
}`,wgsl:`// Vaseline - N-tap blur with edge-weighted blending
// Uses golden angle spiral kernel for smooth, non-blocky blur

struct Params {
    resolution: vec2f,
    alpha: f32,
    _pad0: f32,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const TAP_COUNT: i32 = 32;
const RADIUS: f32 = 48.0;
const GOLDEN_ANGLE: f32 = 2.39996323;
const BRIGHTNESS_ADJUST: f32 = 0.15;

fn clamp01v(v: vec3f) -> vec3f {
    return clamp(v, vec3f(0.0), vec3f(1.0));
}

fn chebyshev_mask(uv: vec2f) -> f32 {
    let centered = abs(uv - vec2f(0.5)) * 2.0;
    return max(centered.x, centered.y);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let coord = vec2i(fragCoord.xy);
    let fullSize = params.resolution;
    let uv = (vec2f(coord) + 0.5) / fullSize;

    let original = textureLoad(inputTex, coord, 0);
    let a = clamp(params.alpha, 0.0, 1.0);

    if (a <= 0.0) {
        return vec4f(clamp01v(original.rgb), original.a);
    }

    let texelSize = 1.0 / fullSize;
    let radiusUV = RADIUS * texelSize;

    // N-tap gather using golden angle spiral
    var blurAccum = vec3f(0.0);
    var weightSum: f32 = 0.0;

    for (var i: i32 = 0; i < TAP_COUNT; i = i + 1) {
        let t = f32(i) / f32(TAP_COUNT);
        let r = sqrt(t);
        let theta = f32(i) * GOLDEN_ANGLE;
        let offset = vec2f(cos(theta), sin(theta)) * r;

        let sigma: f32 = 0.4;
        let weight = exp(-0.5 * (r * r) / (sigma * sigma));

        let sampleUV = clamp(uv + offset * radiusUV, vec2f(0.0), vec2f(1.0));
        blurAccum = blurAccum + textureSample(inputTex, inputSampler, sampleUV).rgb * weight;
        weightSum = weightSum + weight;
    }

    let blurred = blurAccum / weightSum;
    let boosted = clamp01v(blurred + vec3f(BRIGHTNESS_ADJUST));

    // Edge mask - more effect at edges
    var edgeMask = chebyshev_mask(uv);
    edgeMask = smoothstep(0.0, 0.8, edgeMask);

    let sourceClamped = clamp01v(original.rgb);
    let bloomed = clamp01v((sourceClamped + boosted) * 0.5);
    let edgeBlended = mix(sourceClamped, bloomed, edgeMask);
    let finalRgb = clamp01v(mix(sourceClamped, edgeBlended, a));

    return vec4f(finalRgb, original.a);
}
`}},s=`# vaseline

Vaseline lens blur effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 0.5 | 0-1 | Effect opacity |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .vaseline()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(r))n.shaders[a]={...e}}n&&s&&(n.help=s);var c="filter/vaseline",f="filter",p="vaseline",m=n;export{m as default,c as effectId,p as effectName,s as help,f as namespace};
