/* filter/emboss */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Emboss",namespace:"filter",func:"emboss",tags:["edges"],description:"Emboss relief with color convolution or opt-in gray directional edge tracing",globals:{style:{type:"int",default:0,define:"STYLE",choices:{color:0,gray:1},ui:{label:"style",control:"dropdown"}},amount:{type:"float",default:1,uniform:"amount",min:.1,max:5,ui:{label:"amount",control:"slider",enabledBy:{param:"style",eq:0}}},angle:{type:"float",default:135,uniform:"angle",min:-360,max:360,ui:{label:"angle",control:"slider"}},height:{type:"float",default:1,uniform:"height",min:1,max:10,ui:{label:"height",control:"slider"}},colorAmount:{type:"float",default:100,uniform:"colorAmount",min:0,max:100,ui:{label:"color amount",control:"slider",enabledBy:{param:"style",eq:1}}}},passes:[{name:"render",program:"emboss",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var l={emboss:{glsl:`/*
 * Emboss relief with two explicit visual contracts:
 *   0 color       - the shipped color convolution, preserved exactly
 *   1 gray  - neutral-gray directional relief with edge-local chroma
 */

#ifdef GL_ES
precision highp float;
#endif

// STYLE is a compile-time define injected by the runtime (definition.js
// globals.style.define). Baking it lets the compiler drop the unused color or
// gray path entirely instead of carrying both through a runtime branch.
#ifndef STYLE
#define STYLE 0
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float amount;
uniform float angle;
uniform float height;
uniform float colorAmount;
uniform float renderScale;

out vec4 fragColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 sampleGlobal(vec2 globalUV) {
    vec2 localUV = (globalUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    return texture(inputTex, localUV).rgb;
}

vec3 colorDefaultEmboss(vec2 uv, vec2 texelSize) {
    float kernel[9];
    kernel[0] = -2.0; kernel[1] = -1.0; kernel[2] = 0.0;
    kernel[3] = -1.0; kernel[4] = 1.0;  kernel[5] = 1.0;
    kernel[6] = 0.0;  kernel[7] = 1.0;  kernel[8] = 2.0;

    // COLOR_DEFAULT_EXACT_BEGIN
    // Copied from the pre-angle/height shader: literal offsets and arithmetic
    // order intentionally stay intact so defaults never depend on trig folding.
    vec2 offsets[9];
    offsets[0] = vec2(-texelSize.x, -texelSize.y);
    offsets[1] = vec2(0.0, -texelSize.y);
    offsets[2] = vec2(texelSize.x, -texelSize.y);
    offsets[3] = vec2(-texelSize.x, 0.0);
    offsets[4] = vec2(0.0, 0.0);
    offsets[5] = vec2(texelSize.x, 0.0);
    offsets[6] = vec2(-texelSize.x, texelSize.y);
    offsets[7] = vec2(0.0, texelSize.y);
    offsets[8] = vec2(texelSize.x, texelSize.y);

    vec3 conv = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        vec3 texSample = texture(inputTex, ((uv + offsets[i] * amount * renderScale) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb;
        conv += texSample * kernel[i];
    }
    // COLOR_DEFAULT_EXACT_END
    return conv;
}

vec3 colorGeneralEmboss(vec2 uv, vec2 texelSize) {
    float kernel[9];
    kernel[0] = -2.0; kernel[1] = -1.0; kernel[2] = 0.0;
    kernel[3] = -1.0; kernel[4] = 1.0;  kernel[5] = 1.0;
    kernel[6] = 0.0;  kernel[7] = 1.0;  kernel[8] = 2.0;

    vec2 baseOffsetsPx[9];
    baseOffsetsPx[0] = vec2(-1.0, -1.0);
    baseOffsetsPx[1] = vec2( 0.0, -1.0);
    baseOffsetsPx[2] = vec2( 1.0, -1.0);
    baseOffsetsPx[3] = vec2(-1.0,  0.0);
    baseOffsetsPx[4] = vec2( 0.0,  0.0);
    baseOffsetsPx[5] = vec2( 1.0,  0.0);
    baseOffsetsPx[6] = vec2(-1.0,  1.0);
    baseOffsetsPx[7] = vec2( 0.0,  1.0);
    baseOffsetsPx[8] = vec2( 1.0,  1.0);

    float theta = radians(angle - 135.0);
    float ct = cos(theta);
    float st = sin(theta);
    vec3 conv = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        vec2 basePx = baseOffsetsPx[i];
        vec2 rotatedPx = vec2(ct * basePx.x + st * basePx.y, -st * basePx.x + ct * basePx.y) * height;
        vec2 offsetUV = rotatedPx * texelSize * amount * renderScale;
        vec3 texSample = texture(inputTex, ((uv + offsetUV) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb;
        conv += texSample * kernel[i];
    }
    return conv;
}

vec3 grayEmboss(vec2 uv, vec3 centerRGB) {
    float theta = radians(angle);
    // This direction is a backend-independent sample delta, so GLSL and WGSL
    // use the same constant-vector expansion.
    vec2 direction = vec2(cos(theta), sin(theta));
    vec2 offsetUV = direction * (height * renderScale) / fullResolution;
    float positiveLuma = dot(sampleGlobal(uv + offsetUV), LUMA);
    float negativeLuma = dot(sampleGlobal(uv - offsetUV), LUMA);
    float signedEdge = positiveLuma - negativeLuma;
    float edgeMagnitude = abs(signedEdge);
    float relief = 0.5 + 0.5 * signedEdge;

    float centerLuma = dot(centerRGB, LUMA);
    vec3 sourceChroma = centerRGB - vec3(centerLuma);
    vec3 tracedColor = sourceChroma * edgeMagnitude * clamp(colorAmount / 100.0, 0.0, 1.0);
    return vec3(relief) + tracedColor;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 resolution = vec2(textureSize(inputTex, 0));
    vec2 uv = globalCoord / fullResolution;
    vec2 texelSize = 1.0 / resolution;
    vec4 origColor = texture(inputTex, gl_FragCoord.xy / resolution);
    bool fullFrame = all(equal(tileOffset, vec2(0.0))) && all(equal(fullResolution, resolution));
    // Preserve the shipped full-frame sample delta exactly. A tiled input's
    // local texture is smaller than the print canvas, so only that path uses
    // the full-resolution pixel delta before mapping back to local UVs.
    vec2 colorTexelSize = fullFrame ? texelSize : 1.0 / fullResolution;

    vec3 result;
#if STYLE == 0
    if (angle == 135.0 && height == 1.0) {
        result = colorDefaultEmboss(uv, colorTexelSize);
    } else {
        result = colorGeneralEmboss(uv, colorTexelSize);
    }
#else
    result = grayEmboss(uv, origColor.rgb);
#endif

    fragColor = vec4(clamp(result, 0.0, 1.0), origColor.a);
}
`,wgsl:`/*
 * Emboss relief with two explicit visual contracts. This is the mathematical
 * match of emboss.glsl; see that file and help.md for the derivation.
 */

// STYLE is a runtime-injected module-scope const (injectDefines); Dawn/naga
// constant-fold the style dispatch so only the active path survives compilation.
struct Uniforms {
    amount: f32,
    angle: f32,
    height: f32,
    colorAmount: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA = vec3<f32>(0.2126, 0.7152, 0.0722);

// Tile-space sample: globalUV is a UV against the full (possibly tiled)
// output canvas; map it back into this pass's local input texture using
// fullResolution/tileOffset, matching emboss.glsl's sampleGlobal().
fn sampleGlobal(globalUV: vec2<f32>) -> vec3<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims: vec2<f32> = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }
    let localUV = (globalUV * fullDims - uniforms.tileOffset) / texSize;
    return textureSample(inputTex, inputSampler, localUV).rgb;
}

fn colorDefaultEmboss(uv: vec2<f32>, texelSize: vec2<f32>) -> vec3<f32> {
    let kernel = array<f32, 9>(-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);

    // COLOR_DEFAULT_EXACT_BEGIN
    // Copied from the pre-angle/height shader: literal offsets and arithmetic
    // order intentionally stay intact so defaults never depend on trig folding.
    let offsets = array<vec2<f32>, 9>(
        vec2<f32>(-texelSize.x, -texelSize.y),
        vec2<f32>(0.0, -texelSize.y),
        vec2<f32>(texelSize.x, -texelSize.y),
        vec2<f32>(-texelSize.x, 0.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(texelSize.x, 0.0),
        vec2<f32>(-texelSize.x, texelSize.y),
        vec2<f32>(0.0, texelSize.y),
        vec2<f32>(texelSize.x, texelSize.y)
    );
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims: vec2<f32> = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }

    var conv = vec3<f32>(0.0);
    for (var i = 0; i < 9; i = i + 1) {
        let g = uv + offsets[i] * uniforms.amount * uniforms.renderScale;
        let sample = textureSample(inputTex, inputSampler, (g * fullDims - uniforms.tileOffset) / texSize).rgb;
        conv = conv + sample * kernel[i];
    }
    // COLOR_DEFAULT_EXACT_END
    return conv;
}

fn colorGeneralEmboss(uv: vec2<f32>, texelSize: vec2<f32>) -> vec3<f32> {
    let kernel = array<f32, 9>(-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);
    let baseOffsetsPx = array<vec2<f32>, 9>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(0.0, -1.0), vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0,  0.0), vec2<f32>(0.0,  0.0), vec2<f32>(1.0,  0.0),
        vec2<f32>(-1.0,  1.0), vec2<f32>(0.0,  1.0), vec2<f32>(1.0,  1.0)
    );
    let theta = radians(uniforms.angle - 135.0);
    let ct = cos(theta);
    let st = sin(theta);

    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims: vec2<f32> = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }

    var conv = vec3<f32>(0.0);
    for (var i = 0; i < 9; i = i + 1) {
        let basePx = baseOffsetsPx[i];
        let rotatedPx = vec2<f32>(ct * basePx.x + st * basePx.y, -st * basePx.x + ct * basePx.y) * uniforms.height;
        let offsetUV = rotatedPx * texelSize * uniforms.amount * uniforms.renderScale;
        let g = uv + offsetUV;
        let sample = textureSample(inputTex, inputSampler, (g * fullDims - uniforms.tileOffset) / texSize).rgb;
        conv = conv + sample * kernel[i];
    }
    return conv;
}

fn grayEmboss(uv: vec2<f32>, centerRGB: vec3<f32>) -> vec3<f32> {
    let theta = radians(uniforms.angle);
    // This fixed sample delta matches GLSL because it is not position-derived.
    let direction = vec2<f32>(cos(theta), sin(theta));
    let offsetUV = direction * (uniforms.height * uniforms.renderScale) / uniforms.fullResolution;
    let positiveLuma = dot(sampleGlobal(uv + offsetUV), LUMA);
    let negativeLuma = dot(sampleGlobal(uv - offsetUV), LUMA);
    let signedEdge = positiveLuma - negativeLuma;
    let edgeMagnitude = abs(signedEdge);
    let relief = 0.5 + 0.5 * signedEdge;
    let centerLuma = dot(centerRGB, LUMA);
    let sourceChroma = centerRGB - vec3<f32>(centerLuma);
    let tracedColor = sourceChroma * edgeMagnitude * clamp(uniforms.colorAmount / 100.0, 0.0, 1.0);
    return vec3<f32>(relief) + tracedColor;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let globalCoord = pos.xy + uniforms.tileOffset;
    let globalUV = globalCoord / uniforms.fullResolution;
    let texelSize = 1.0 / texSize;
    let uv = pos.xy / texSize;
    let origColor = textureSample(inputTex, inputSampler, uv);
    let fullFrame = all(uniforms.tileOffset == vec2<f32>(0.0)) && all(uniforms.fullResolution == texSize);
    var colorTexelSize = 1.0 / uniforms.fullResolution;
    if (fullFrame) { colorTexelSize = texelSize; }

    var result: vec3<f32>;
    if (STYLE == 0) {
        if (uniforms.angle == 135.0 && uniforms.height == 1.0) {
            result = colorDefaultEmboss(globalUV, colorTexelSize);
        } else {
            result = colorGeneralEmboss(globalUV, colorTexelSize);
        }
    } else {
        result = grayEmboss(globalUV, origColor.rgb);
    }
    return vec4<f32>(clamp(result, vec3<f32>(0.0), vec3<f32>(1.0)), origColor.a);
}
`}},i=`# emboss

Emboss relief with color convolution or an opt-in gray
directional-edge rendition.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| style | choice | color | color, gray | Select the color convolution or gray relief |
| amount | float | 1 | 0.1-5 | Color-style 3x3 convolution sample radius |
| angle | float | 135 | -360-360 | Direction from which the relief is sampled |
| height | float | 1 | 1-10 | Directional sample distance in pixels |
| colorAmount | float | 100 | Gray-style amount of source chroma retained on traced edges |

## Styles

- \`color\` is the default color convolution. At \`angle=135, height=1\` it uses
  the established 3x3 offsets and arithmetic exactly. Other angle and height
  values rotate and scale that same kernel. \`amount\` retains its sample-
  radius meaning in this style.
- \`gray\` is a bounded directional-difference rendition: uniform fill becomes neutral gray,
  while edges receive light and dark relief. \`height\` alone controls the
  directional sample distance. \`colorAmount\` retains source chroma in
  proportion to edge strength, so flat interiors stay neutral at every value.

The gray style uses a symmetric pair of luminance samples and centers their
signed difference at 50% gray. It does not claim undocumented reference-exact
coefficients.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .emboss()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(l).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(l))n.shaders[o]={...e}}n&&i&&(n.help=i);var u="filter/emboss",c="filter",m="emboss",d=n;export{d as default,u as effectId,m as effectName,i as help,c as namespace};
