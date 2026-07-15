/* filter/edge */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Edge",namespace:"filter",func:"edge",tags:["edges"],description:"Edge detection filter",globals:{kernel:{type:"int",default:1,uniform:"kernel",choices:{fine:0,bold:1,contour:2},ui:{label:"kernel",control:"dropdown"}},level:{type:"float",default:50,uniform:"level",min:0,max:100,ui:{label:"level",control:"slider",enabledBy:{param:"kernel",eq:2}}},contourSide:{type:"int",default:0,uniform:"contourSide",choices:{lower:0,upper:1},ui:{label:"contour side",control:"dropdown",enabledBy:{param:"kernel",eq:2}}},size:{type:"int",uniform:"size",default:1,choices:{kernel5x5:1,kernel7x7:2},ui:{label:"size",control:"dropdown",enabledBy:{param:"kernel",notIn:[2]}}},channel:{type:"int",default:0,uniform:"channel",choices:{color:0,luminance:1},ui:{label:"channel",control:"dropdown"}},amount:{type:"float",default:100,uniform:"amount",min:0,max:500,randMin:100,ui:{label:"amount",control:"slider"}},invert:{type:"int",default:0,uniform:"invert",choices:{off:0,on:1},ui:{label:"invert",control:"dropdown"}},threshold:{type:"float",default:0,uniform:"threshold",min:0,max:100,ui:{label:"threshold",control:"slider"}},blend:{type:"int",default:6,uniform:"blend",choices:{add:0,darken:1,difference:2,dodge:3,lighten:4,multiply:5,normal:6,overlay:7,screen:8},ui:{label:"blend",control:"dropdown"}},mix:{type:"float",default:100,uniform:"mixAmt",min:0,max:100,ui:{label:"mix",control:"slider"}}},passes:[{name:"render",program:"edge",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={edge:{glsl:`/*
 * Edge detection with multiple kernels, sizes, and blend modes
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform float kernel;
uniform float size;
uniform float renderScale;
uniform float blend;
uniform float invert;
uniform float channel;
uniform float threshold;
uniform float amount;
uniform float mixAmt;
uniform float level;
uniform float contourSide;

out vec4 fragColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float getWeight(int dx, int dy, int kernelType) {
    if (dx == 0 && dy == 0) return 0.0;

    if (kernelType == 0) {
        // fine: cardinal neighbors only (cross Laplacian)
        if (dx == 0 || dy == 0) return -1.0;
        return 0.0;
    } else {
        // bold: all neighbors equally
        return -1.0;
    }
}

vec4 applyBlend(vec4 edge, vec4 orig, int mode) {
    if (mode == 0) return min(orig + edge, vec4(1.0));                        // add
    if (mode == 1) return min(orig, edge);                                     // darken
    if (mode == 2) return abs(orig - edge);                                    // difference
    if (mode == 3) return min(orig / max(1.0 - edge, vec4(0.001)), vec4(1.0)); // dodge
    if (mode == 4) return max(orig, edge);                                     // lighten
    if (mode == 5) return orig * edge;                                         // multiply
    if (mode == 7) {                                                           // overlay
        vec4 result;
        result.r = orig.r < 0.5 ? 2.0 * orig.r * edge.r : 1.0 - 2.0 * (1.0 - orig.r) * (1.0 - edge.r);
        result.g = orig.g < 0.5 ? 2.0 * orig.g * edge.g : 1.0 - 2.0 * (1.0 - orig.g) * (1.0 - edge.g);
        result.b = orig.b < 0.5 ? 2.0 * orig.b * edge.b : 1.0 - 2.0 * (1.0 - orig.b) * (1.0 - edge.b);
        result.a = orig.a;
        return result;
    }
    if (mode == 8) return 1.0 - (1.0 - orig) * (1.0 - edge);                 // screen
    return edge;                                                                // normal (6)
}

// Contour: mark only the selected side of a level crossing against the 4
// cardinal neighbors (Trace Contour). Returns a binary vec3:
// 1.0 = background (white), 0.0 = contour line (dark).
vec3 contourConv(vec2 fragCoord, vec2 texelSize, vec3 centerRGB, float lvl, bool useLuma, bool upperSide) {
    vec3 northRGB = texture(inputTex, (fragCoord + vec2(0.0,  1.0)) * texelSize).rgb;
    vec3 southRGB = texture(inputTex, (fragCoord + vec2(0.0, -1.0)) * texelSize).rgb;
    vec3 eastRGB  = texture(inputTex, (fragCoord + vec2( 1.0, 0.0)) * texelSize).rgb;
    vec3 westRGB  = texture(inputTex, (fragCoord + vec2(-1.0, 0.0)) * texelSize).rgb;

    if (useLuma) {
        float centerL = dot(centerRGB, LUMA);
        bool centerOnSide = upperSide ? centerL >= lvl : centerL < lvl;
        bool crossing = centerOnSide && (upperSide
            ? dot(northRGB, LUMA) < lvl || dot(southRGB, LUMA) < lvl ||
              dot(eastRGB, LUMA) < lvl  || dot(westRGB, LUMA) < lvl
            : dot(northRGB, LUMA) >= lvl || dot(southRGB, LUMA) >= lvl ||
              dot(eastRGB, LUMA) >= lvl  || dot(westRGB, LUMA) >= lvl);
        return vec3(crossing ? 0.0 : 1.0);
    }

    bvec3 centerOnSide = upperSide ? greaterThanEqual(centerRGB, vec3(lvl))
                                    : lessThan(centerRGB, vec3(lvl));
    bvec3 crossing = bvec3(
        centerOnSide.r && (upperSide
            ? northRGB.r < lvl || southRGB.r < lvl || eastRGB.r < lvl || westRGB.r < lvl
            : northRGB.r >= lvl || southRGB.r >= lvl || eastRGB.r >= lvl || westRGB.r >= lvl),
        centerOnSide.g && (upperSide
            ? northRGB.g < lvl || southRGB.g < lvl || eastRGB.g < lvl || westRGB.g < lvl
            : northRGB.g >= lvl || southRGB.g >= lvl || eastRGB.g >= lvl || westRGB.g >= lvl),
        centerOnSide.b && (upperSide
            ? northRGB.b < lvl || southRGB.b < lvl || eastRGB.b < lvl || westRGB.b < lvl
            : northRGB.b >= lvl || southRGB.b >= lvl || eastRGB.b >= lvl || westRGB.b >= lvl)
    );
    return vec3(crossing.r ? 0.0 : 1.0, crossing.g ? 0.0 : 1.0, crossing.b ? 0.0 : 1.0);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    vec2 texelSize = 1.0 / resolution;

    vec4 origColor = texture(inputTex, gl_FragCoord.xy * texelSize);

    int kernelType = int(kernel);
    int radius = min(int((size + 1.0) * renderScale), 256);
    int blendMode = int(blend);
    bool doInvert = invert > 0.5;
    bool useLuma = channel > 0.5;

    // Convolution
    vec3 conv = vec3(0.0);
    float centerWeight = 0.0;

    if (kernelType == 2) {
        // Contour: level-crossing trace, not a weighted convolution.
        conv = contourConv(gl_FragCoord.xy, texelSize, origColor.rgb, level / 100.0, useLuma, contourSide > 0.5);
    } else {
        for (int dy = -3; dy <= 3; dy++) {
            for (int dx = -3; dx <= 3; dx++) {
                if (abs(dx) > radius || abs(dy) > radius) continue;
                if (dx == 0 && dy == 0) continue;

                float w = getWeight(dx, dy, kernelType);
                if (w == 0.0) continue;

                vec2 sampleCoord = gl_FragCoord.xy + vec2(float(dx), float(dy));
                vec2 localUV = sampleCoord * texelSize;
                vec3 s = texture(inputTex, localUV).rgb;

                if (useLuma) {
                    conv += vec3(dot(s, LUMA)) * w;
                } else {
                    conv += s * w;
                }

                centerWeight -= w;
            }
        }

        // Center sample
        vec3 centerSample = origColor.rgb;
        if (useLuma) {
            centerSample = vec3(dot(centerSample, LUMA));
        }
        conv += centerSample * centerWeight;
    }

    // Amount
    conv *= amount / 50.0;
    conv = clamp(conv, 0.0, 1.0);

    // Threshold (before invert so it measures actual edge strength)
    if (threshold > 0.0) {
        float thresh = threshold / 100.0;
        float edge;
        if (useLuma) {
            edge = conv.r;
        } else {
            edge = dot(conv, LUMA);
        }
        float mask = smoothstep(thresh - 0.01, thresh + 0.01, edge);
        conv *= mask;
    }

    // Invert
    if (doInvert) {
        conv = 1.0 - conv;
    }

    // Blend
    vec4 edgeColor = vec4(conv, origColor.a);
    vec4 blended = applyBlend(edgeColor, origColor, blendMode);

    // Mix
    float m = mixAmt / 100.0;
    fragColor = vec4(mix(origColor.rgb, blended.rgb, m), origColor.a);
}
`,wgsl:`/*
 * Edge detection with multiple kernels, sizes, and blend modes
 */

struct Uniforms {
    kernel: f32,
    size: f32,
    blend: f32,
    invert: f32,
    channel: f32,
    threshold: f32,
    amount: f32,
    mixAmt: f32,
    level: f32,
    contourSide: f32,
    renderScale: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

const LUMA = vec3<f32>(0.2126, 0.7152, 0.0722);

fn getWeight(dx: i32, dy: i32, kernelType: i32) -> f32 {
    if (dx == 0 && dy == 0) { return 0.0; }

    if (kernelType == 0) {
        // fine: cardinal neighbors only (cross Laplacian)
        if (dx == 0 || dy == 0) { return -1.0; }
        return 0.0;
    } else {
        // bold: all neighbors equally
        return -1.0;
    }
}

fn applyBlend(edge: vec4<f32>, orig: vec4<f32>, mode: i32) -> vec4<f32> {
    if (mode == 0) { return min(orig + edge, vec4<f32>(1.0)); }                        // add
    if (mode == 1) { return min(orig, edge); }                                          // darken
    if (mode == 2) { return abs(orig - edge); }                                         // difference
    if (mode == 3) { return min(orig / max(1.0 - edge, vec4<f32>(0.001)), vec4<f32>(1.0)); } // dodge
    if (mode == 4) { return max(orig, edge); }                                          // lighten
    if (mode == 5) { return orig * edge; }                                              // multiply
    if (mode == 7) {                                                                     // overlay
        let r = select(1.0 - 2.0 * (1.0 - orig.r) * (1.0 - edge.r), 2.0 * orig.r * edge.r, orig.r < 0.5);
        let g = select(1.0 - 2.0 * (1.0 - orig.g) * (1.0 - edge.g), 2.0 * orig.g * edge.g, orig.g < 0.5);
        let b = select(1.0 - 2.0 * (1.0 - orig.b) * (1.0 - edge.b), 2.0 * orig.b * edge.b, orig.b < 0.5);
        return vec4<f32>(r, g, b, orig.a);
    }
    if (mode == 8) { return 1.0 - (1.0 - orig) * (1.0 - edge); }                      // screen
    return edge;                                                                         // normal (6)
}

// Contour: mark only the selected side of a level crossing against the 4
// cardinal neighbors (Trace Contour). Returns a binary vec3:
// 1.0 = background (white), 0.0 = contour line (dark).
fn contourConv(uv: vec2<f32>, texelSize: vec2<f32>, centerRGB: vec3<f32>, lvl: f32, useLuma: bool, upperSide: bool) -> vec3<f32> {
    let northRGB = textureSample(inputTex, inputSampler, uv + vec2<f32>(0.0,  1.0) * texelSize).rgb;
    let southRGB = textureSample(inputTex, inputSampler, uv + vec2<f32>(0.0, -1.0) * texelSize).rgb;
    let eastRGB  = textureSample(inputTex, inputSampler, uv + vec2<f32>( 1.0, 0.0) * texelSize).rgb;
    let westRGB  = textureSample(inputTex, inputSampler, uv + vec2<f32>(-1.0, 0.0) * texelSize).rgb;

    if (useLuma) {
        let centerL = dot(centerRGB, LUMA);
        var centerOnSide = centerL < lvl;
        if (upperSide) {
            centerOnSide = centerL >= lvl;
        }
        let crossing = centerOnSide && select(
            dot(northRGB, LUMA) >= lvl || dot(southRGB, LUMA) >= lvl ||
            dot(eastRGB, LUMA) >= lvl  || dot(westRGB, LUMA) >= lvl,
            dot(northRGB, LUMA) < lvl || dot(southRGB, LUMA) < lvl ||
            dot(eastRGB, LUMA) < lvl  || dot(westRGB, LUMA) < lvl,
            upperSide
        );
        return vec3<f32>(select(1.0, 0.0, crossing));
    }

    var centerOnSide = centerRGB < vec3<f32>(lvl);
    if (upperSide) {
        centerOnSide = centerRGB >= vec3<f32>(lvl);
    }

    let crossR = centerOnSide.r && select(
        northRGB.r >= lvl || southRGB.r >= lvl || eastRGB.r >= lvl || westRGB.r >= lvl,
        northRGB.r < lvl || southRGB.r < lvl || eastRGB.r < lvl || westRGB.r < lvl,
        upperSide);
    let crossG = centerOnSide.g && select(
        northRGB.g >= lvl || southRGB.g >= lvl || eastRGB.g >= lvl || westRGB.g >= lvl,
        northRGB.g < lvl || southRGB.g < lvl || eastRGB.g < lvl || westRGB.g < lvl,
        upperSide);
    let crossB = centerOnSide.b && select(
        northRGB.b >= lvl || southRGB.b >= lvl || eastRGB.b >= lvl || westRGB.b >= lvl,
        northRGB.b < lvl || southRGB.b < lvl || eastRGB.b < lvl || westRGB.b < lvl,
        upperSide);

    return vec3<f32>(
        select(1.0, 0.0, crossR),
        select(1.0, 0.0, crossG),
        select(1.0, 0.0, crossB)
    );
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;

    let origColor = textureSample(inputTex, inputSampler, uv);

    let kernelType = i32(u.kernel);
    // Match edge.glsl: scale the kernel radius by renderScale so edge width
    // stays consistent under tiled / large-format (non-unit-scale) export.
    let radius = min(i32((u.size + 1.0) * u.renderScale), 256);
    let blendMode = i32(u.blend);
    let doInvert = u.invert > 0.5;
    let useLuma = u.channel > 0.5;

    // Convolution
    var conv = vec3<f32>(0.0);
    var centerWeight: f32 = 0.0;

    if (kernelType == 2) {
        // Contour: level-crossing trace, not a weighted convolution.
        conv = contourConv(uv, texelSize, origColor.rgb, u.level / 100.0, useLuma, u.contourSide > 0.5);
    } else {
        for (var dy = -3; dy <= 3; dy = dy + 1) {
            for (var dx = -3; dx <= 3; dx = dx + 1) {
                if (abs(dx) > radius || abs(dy) > radius) { continue; }
                if (dx == 0 && dy == 0) { continue; }

                let w = getWeight(dx, dy, kernelType);
                if (w == 0.0) { continue; }

                let offset = vec2<f32>(f32(dx), f32(dy)) * texelSize;
                let s = textureSample(inputTex, inputSampler, uv + offset).rgb;

                if (useLuma) {
                    conv = conv + vec3<f32>(dot(s, LUMA)) * w;
                } else {
                    conv = conv + s * w;
                }

                centerWeight = centerWeight - w;
            }
        }

        // Center sample
        var centerSample = origColor.rgb;
        if (useLuma) {
            centerSample = vec3<f32>(dot(centerSample, LUMA));
        }
        conv = conv + centerSample * centerWeight;
    }

    // Amount
    conv = conv * (u.amount / 50.0);
    conv = clamp(conv, vec3<f32>(0.0), vec3<f32>(1.0));

    // Threshold (before invert so it measures actual edge strength)
    if (u.threshold > 0.0) {
        let thresh = u.threshold / 100.0;
        var edge: f32;
        if (useLuma) {
            edge = conv.r;
        } else {
            edge = dot(conv, LUMA);
        }
        let mask = smoothstep(thresh - 0.01, thresh + 0.01, edge);
        conv = conv * mask;
    }

    // Invert
    if (doInvert) {
        conv = 1.0 - conv;
    }

    // Blend
    let edgeColor = vec4<f32>(conv, origColor.a);
    let blended = applyBlend(edgeColor, origColor, blendMode);

    // Mix
    let m = u.mixAmt / 100.0;
    return vec4<f32>(mix(origColor.rgb, blended.rgb, m), origColor.a);
}
`}},l=`# edge

Edge detection with multiple kernels, sizes, and blend modes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| kernel | int | bold | fine/bold/contour | Edge detection kernel type |
| level | float | 50 | 0-100 | Contour trace level (percent); used by the contour kernel only |
| contourSide | int | lower | lower/upper | Side of the level crossing marked by the contour kernel |
| size | int | kernel5x5 | kernel5x5/kernel7x7 | Convolution kernel size; used by fine and bold only |
| channel | int | color | color/luminance | Edge detection mode |
| amount | float | 100 | 0-500 | Edge intensity |
| invert | int | off | off/on | Invert edge result |
| threshold | float | 0 | 0-100 | Edge cutoff for line-art look |
| blend | int | normal | add/darken/difference/dodge/lighten/multiply/normal/overlay/screen | How edges combine with original |
| mix | float | 100 | 0-100 | Wet/dry blend with original |

## Notes

- The \`contour\` kernel traces classic Trace Contour iso-lines against
  the 4 cardinal neighbors. \`lower\` marks only the below-level pixel at a
  crossing; \`upper\` marks only the above-level pixel. Marked pixels are dark
  (0.0), unmarked pixels are white (1.0), matching the fine/bold kernels'
  convention of feeding a raw signal into the shared amount/threshold/invert/
  blend/mix stages. \`level\` and \`contourSide\` are exposed only for contour;
  \`size\` is exposed only for fine and bold.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .edge()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&l&&(n.help=l);var u="filter/edge",c="filter",f="edge",v=n;export{v as default,u as effectId,f as effectName,l as help,c as namespace};
