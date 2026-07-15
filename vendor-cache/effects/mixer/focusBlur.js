/* mixer/focusBlur */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Focus Blur",namespace:"mixer",func:"focusBlur",tags:["blend","blur"],description:"Focus blur using luminance depth map",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},depthSource:{type:"int",default:1,uniform:"depthSource",choices:{sourceA:0,sourceB:1},ui:{label:"depth source",control:"dropdown"}},focalDistance:{type:"float",default:50,uniform:"focalDistance",min:1,max:100,randMin:5,randMax:75,ui:{label:"focal dist",control:"slider"}},aperture:{type:"float",default:4,uniform:"aperture",min:1,max:10,randMax:3,ui:{label:"aperture",control:"slider"}},sampleBias:{type:"float",default:12,uniform:"sampleBias",min:2,max:64,ui:{label:"bias",control:"slider"}}},passes:[{name:"render",program:"focusBlur",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var o={focusBlur:{glsl:`/*
 * Focus blur (depth of field) mixer shader
 * Reconstructs a faux depth buffer from luminance to drive circle-of-confusion blurs
 * Blur radius is based on distance from focal point
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float focalDistance;
uniform float aperture;
uniform float sampleBias;
uniform int depthSource;

out vec4 fragColor;

// Convert RGB to luminosity for depth estimation
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Compute blur factor based on depth distance from focal plane
float computeBlurFactor(float depth) {
    float focalPlane = focalDistance * 0.01;
    float blur = abs(depth - focalPlane) * aperture;
    return clamp(blur, 0.0, 1.0);
}

// Apply depth of field blur using golden-angle spiral disk samples
vec4 applyFocusBlur(sampler2D sceneTex, sampler2D depthTex, vec2 uv) {
    vec4 depthSample = texture(depthTex, gl_FragCoord.xy / vec2(textureSize(depthTex, 0)));
    float depth = getLuminosity(depthSample.rgb);

    float blurRadius = computeBlurFactor(depth) * sampleBias;

    vec4 color = vec4(0.0);
    const float GOLDEN = 2.399963;

    for (int i = 0; i < 64; i++) {
        float r = sqrt(float(i) / 64.0);
        float theta = float(i) * GOLDEN;
        vec2 offset = vec2(cos(theta), sin(theta)) * r * blurRadius / resolution;
        color += texture(sceneTex, ((uv + offset) * fullResolution - tileOffset) / vec2(textureSize(sceneTex, 0)));
    }

    return color / 64.0;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 color;

    // depthSource: 0 = use inputTex (A) as depth map, blur tex (B)
    //              1 = use tex (B) as depth map, blur inputTex (A)
    if (depthSource == 0) {
        color = applyFocusBlur(tex, inputTex, uv);
    } else {
        color = applyFocusBlur(inputTex, tex, uv);
    }

    // Preserve maximum alpha from both sources
    color.a = max(texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0))).a, texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0))).a);

    fragColor = color;
}
`,wgsl:`/*
 * Focus blur (depth of field) mixer shader (WGSL)
 * Reconstructs a faux depth buffer from luminance to drive circle-of-confusion blurs
 * Blur radius is based on distance from focal point
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> focalDistance: f32;
@group(0) @binding(4) var<uniform> aperture: f32;
@group(0) @binding(5) var<uniform> sampleBias: f32;
@group(0) @binding(6) var<uniform> depthSource: i32;

// Convert RGB to luminosity for depth estimation
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// Compute blur factor based on depth distance from focal plane
fn computeBlurFactor(depth: f32) -> f32 {
    let focalPlane = focalDistance * 0.01;
    let blur = abs(depth - focalPlane) * aperture;
    return clamp(blur, 0.0, 1.0);
}

// depthSource 0: inputTex = depth, tex = scene
fn applyFocusBlurAB(uv: vec2f, resolution: vec2f) -> vec4f {
    let depthSample = textureSample(inputTex, samp, uv);
    let depth = getLuminosity(depthSample.rgb);

    let blurRadius = computeBlurFactor(depth) * sampleBias;

    var color = vec4f(0.0);
    let GOLDEN: f32 = 2.399963;

    for (var i: i32 = 0; i < 64; i = i + 1) {
        let r = sqrt(f32(i) / 64.0);
        let theta = f32(i) * GOLDEN;
        let offset = vec2f(cos(theta), sin(theta)) * r * blurRadius / resolution;
        color = color + textureSample(tex, samp, uv + offset);
    }

    return color / 64.0;
}

// depthSource 1: tex = depth, inputTex = scene
fn applyFocusBlurBA(uv: vec2f, resolution: vec2f) -> vec4f {
    let depthSample = textureSample(tex, samp, uv);
    let depth = getLuminosity(depthSample.rgb);

    let blurRadius = computeBlurFactor(depth) * sampleBias;

    var color = vec4f(0.0);
    let GOLDEN: f32 = 2.399963;

    for (var i: i32 = 0; i < 64; i = i + 1) {
        let r = sqrt(f32(i) / 64.0);
        let theta = f32(i) * GOLDEN;
        let offset = vec2f(cos(theta), sin(theta)) * r * blurRadius / resolution;
        color = color + textureSample(inputTex, samp, uv + offset);
    }

    return color / 64.0;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2f(textureDimensions(inputTex, 0));
    let uv = position.xy / dims;

    var color: vec4f;

    // depthSource: 0 = use inputTex (A) as depth map, blur tex (B)
    //              1 = use tex (B) as depth map, blur inputTex (A)
    if (depthSource == 0) {
        color = applyFocusBlurAB(uv, dims);
    } else {
        color = applyFocusBlurBA(uv, dims);
    }

    // Preserve maximum alpha from both sources
    let alpha1 = textureSample(inputTex, samp, uv).a;
    let alpha2 = textureSample(tex, samp, uv).a;
    color.a = max(alpha1, alpha2);

    return color;
}
`}},a=`# focusBlur

Focus blur using luminance depth map

## Description

Uses the luminosity of the depth source texture as a proxy for depth. Pixels with luminosity values close to the focal distance remain sharp, while pixels with luminosity far from the focal distance become blurred.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| focalDistance | float | 50 | 1-100 | Focal dist |
| aperture | float | 4 | 1-10 | Aperture |
| sampleBias | float | 10 | 2-20 | Sample spread |
| depthSource | int | sourceB | sourceA/sourceB | Depth source |

## Notes

- Use a gradient or noise texture as the depth map for interesting focus transitions
- Lower aperture values create more gradual focus falloff
- Higher bias values create softer, more diffuse blur but may impact performance
- The focal distance parameter maps luminosity (0\u20131) to a percentage, so 50 means pixels with ~0.5 luminosity will be in focus

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .focusBlur(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&a&&(t.help=a);var p="mixer/focusBlur",c="mixer",f="focusBlur",d=t;export{d as default,p as effectId,f as effectName,a as help,c as namespace};
