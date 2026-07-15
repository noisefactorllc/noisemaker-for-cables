/* mixer/shadow */
var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new o({name:"Shadow",namespace:"mixer",func:"shadow",tags:["color"],openCategories:["general","shadow"],description:"Cast a shadow or glow from one input onto another",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},maskSource:{type:"int",default:0,uniform:"maskSource",choices:{sourceA:0,sourceB:1},ui:{label:"mask source",control:"dropdown"}},sourceChannel:{type:"int",default:0,uniform:"sourceChannel",choices:{red:0,green:1,blue:2,alpha:3},ui:{label:"channel",control:"dropdown"}},threshold:{type:"float",default:.5,uniform:"threshold",min:0,max:1,randMin:.25,randMax:.75,ui:{label:"threshold",control:"slider"}},color:{type:"color",default:[0,0,0],uniform:"color",ui:{label:"color",control:"color",category:"shadow"}},blur:{type:"float",default:1,uniform:"blur",min:0,max:3,zero:0,ui:{label:"blur",control:"slider",category:"shadow"}},spread:{type:"float",default:0,uniform:"spread",min:0,max:1,randMax:.5,ui:{label:"spread",control:"slider",category:"shadow"}},offsetX:{type:"float",default:.1,uniform:"offsetX",min:-1,max:1,randMin:-.2,randMax:.2,zero:0,ui:{label:"offset x",control:"slider",category:"offset"}},offsetY:{type:"float",default:-.1,uniform:"offsetY",min:-1,max:1,randMin:-.2,randMax:.2,zero:0,ui:{label:"offset y",control:"slider",category:"offset"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{hide:0,mirror:1,repeat:2,clamp:3},ui:{label:"wrap",control:"dropdown",category:"offset"}}},defaultProgram:`search mixer, synth

noise(scaleX: 100, scaleY: 100)
.write(o0)

noise(ridges: true, colorMode: mono)
.shadow(tex: read(o0))
.write(o1)`,passes:[{name:"render",program:"shadow",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var a={shadow:{glsl:`/*
 * Shadow / Glow mixer shader
 *
 * Uses one input as a mask to cast an offset, blurred shadow or glow
 * onto the other input. The mask channel is thresholded, then the
 * resulting silhouette is offset, blurred, and spread to form the shadow.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform int maskSource;
uniform int sourceChannel;
uniform float threshold;
uniform vec3 color;
uniform float offsetX;
uniform float offsetY;
uniform float blur;
uniform float spread;
uniform int wrap;

out vec4 fragColor;

// Extract a single channel from a color
float getChannel(vec4 color, int channel) {
    if (channel == 0) return color.r;
    if (channel == 1) return color.g;
    if (channel == 2) return color.b;
    return color.a;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Base image is the non-mask source
    vec4 baseColor = (maskSource == 0) ? texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0))) : texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    // Mask UV shifted by shadow offset, scaled for print resolution
    vec2 maskUV = uv - vec2(offsetX, offsetY) * 0.1 * renderScale;

    // Gaussian blur of thresholded mask
    float shadowMask = 0.0;
    float totalWeight = 0.0;

    // Scale blur by renderScale and cap at overlap
    float blurPixels = min(blur * renderScale, 256.0);
    float sigma = max(blurPixels, 0.001);
    float sigma2 = 2.0 * sigma * sigma;

    for (int x = -5; x <= 5; x++) {
        for (int y = -5; y <= 5; y++) {
            vec2 offset = vec2(float(x), float(y)) * blurPixels / resolution;
            vec2 sampleUV = maskUV + offset;

            // Convert global UV to local UV for tile-local texture sampling
            vec2 localUV = (sampleUV * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));

            // Apply wrap mode to sample UVs
            float thresholded = 0.0;
            if (wrap == 0) {
                // hide: treat out-of-bounds as empty
                if (localUV.x >= 0.0 && localUV.x <= 1.0 && localUV.y >= 0.0 && localUV.y <= 1.0) {
                    vec4 maskSample = (maskSource == 0)
                        ? texture(inputTex, localUV)
                        : texture(tex, localUV);
                    thresholded = step(threshold, getChannel(maskSample, sourceChannel));
                }
            } else {
                vec2 wrappedUV = localUV;
                if (wrap == 1) {
                    // mirror
                    wrappedUV = abs(mod(localUV + 1.0, 2.0) - 1.0);
                } else if (wrap == 2) {
                    // repeat
                    wrappedUV = fract(localUV);
                } else {
                    // clamp
                    wrappedUV = clamp(localUV, 0.0, 1.0);
                }
                vec4 maskSample = (maskSource == 0)
                    ? texture(inputTex, wrappedUV)
                    : texture(tex, wrappedUV);
                thresholded = step(threshold, getChannel(maskSample, sourceChannel));
            }

            float dist2 = float(x * x + y * y);
            float weight = exp(-dist2 / sigma2);

            shadowMask += thresholded * weight;
            totalWeight += weight;
        }
    }
    shadowMask /= totalWeight;

    // Spread amplifies the mask to expand the shadow
    shadowMask = clamp(shadowMask * (1.0 + spread), 0.0, 1.0);

    // Composite shadow onto base
    vec3 withShadow = mix(baseColor.rgb, color, shadowMask);

    // Composite mask source (foreground) on top of the shadow
    vec4 fgSample = (maskSource == 0)
        ? texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)))
        : texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));
    float fgMask = step(threshold, getChannel(fgSample, sourceChannel));
    vec3 result = mix(withShadow, fgSample.rgb, fgMask);

    fragColor = vec4(result, baseColor.a);
}
`,wgsl:`/*
 * Shadow / Glow mixer shader (WGSL)
 *
 * Uses one input as a mask to cast an offset, blurred shadow or glow
 * onto the other input. The mask channel is thresholded, then the
 * resulting silhouette is offset, blurred, and spread to form the shadow.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> maskSource: i32;
@group(0) @binding(4) var<uniform> sourceChannel: i32;
@group(0) @binding(5) var<uniform> threshold: f32;
@group(0) @binding(6) var<uniform> color: vec3<f32>;
@group(0) @binding(7) var<uniform> offsetX: f32;
@group(0) @binding(8) var<uniform> offsetY: f32;
@group(0) @binding(9) var<uniform> blur: f32;
@group(0) @binding(10) var<uniform> spread: f32;
@group(0) @binding(11) var<uniform> wrap: i32;

// Extract a single channel from a color
fn getChannel(color: vec4<f32>, channel: i32) -> f32 {
    if (channel == 0) { return color.r; }
    if (channel == 1) { return color.g; }
    if (channel == 2) { return color.b; }
    return color.a;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = position.xy / dims;

    // Base image is the non-mask source. Use textureSampleLevel throughout
    // because the blur loop below depends on per-pixel out-of-bounds checks
    // (non-uniform control flow), which disqualifies plain textureSample
    // (it would require uniform control flow for implicit derivatives).
    var baseColor: vec4<f32>;
    if (maskSource == 0) {
        baseColor = textureSampleLevel(tex, samp, uv, 0.0);
    } else {
        baseColor = textureSampleLevel(inputTex, samp, uv, 0.0);
    }

    // Mask UV shifted by shadow offset
    let maskUV = uv - vec2<f32>(offsetX, offsetY) * 0.1;

    // Gaussian blur of thresholded mask
    var shadowMask: f32 = 0.0;
    var totalWeight: f32 = 0.0;

    let sigma = max(blur, 0.001);
    let sigma2 = 2.0 * sigma * sigma;

    for (var x: i32 = -5; x <= 5; x = x + 1) {
        for (var y: i32 = -5; y <= 5; y = y + 1) {
            let offset = vec2<f32>(f32(x), f32(y)) * blur / dims;
            let sampleUV = maskUV + offset;

            // Apply wrap mode to sample UVs
            var thresholded: f32 = 0.0;
            if (wrap == 0) {
                // hide: treat out-of-bounds as empty
                if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
                    var maskSample: vec4<f32>;
                    if (maskSource == 0) {
                        maskSample = textureSampleLevel(inputTex, samp, sampleUV, 0.0);
                    } else {
                        maskSample = textureSampleLevel(tex, samp, sampleUV, 0.0);
                    }
                    thresholded = step(threshold, getChannel(maskSample, sourceChannel));
                }
            } else {
                var wrappedUV = sampleUV;
                if (wrap == 1) {
                    // mirror
                    wrappedUV = abs(((sampleUV + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
                } else if (wrap == 2) {
                    // repeat
                    wrappedUV = (sampleUV % 1.0 + 1.0) % 1.0;
                } else {
                    // clamp
                    wrappedUV = clamp(sampleUV, vec2<f32>(0.0), vec2<f32>(1.0));
                }
                var maskSample: vec4<f32>;
                if (maskSource == 0) {
                    maskSample = textureSampleLevel(inputTex, samp, wrappedUV, 0.0);
                } else {
                    maskSample = textureSampleLevel(tex, samp, wrappedUV, 0.0);
                }
                thresholded = step(threshold, getChannel(maskSample, sourceChannel));
            }

            let dist2 = f32(x * x + y * y);
            let weight = exp(-dist2 / sigma2);

            shadowMask = shadowMask + thresholded * weight;
            totalWeight = totalWeight + weight;
        }
    }
    shadowMask = shadowMask / totalWeight;

    // Spread amplifies the mask to expand the shadow
    shadowMask = clamp(shadowMask * (1.0 + spread), 0.0, 1.0);

    // Composite shadow onto base
    let withShadow = mix(baseColor.rgb, color, shadowMask);

    // Composite mask source (foreground) on top of the shadow
    var fgSample: vec4<f32>;
    if (maskSource == 0) {
        fgSample = textureSampleLevel(inputTex, samp, uv, 0.0);
    } else {
        fgSample = textureSampleLevel(tex, samp, uv, 0.0);
    }
    let fgMask = step(threshold, getChannel(fgSample, sourceChannel));
    let result = mix(withShadow, fgSample.rgb, fgMask);

    return vec4<f32>(result, baseColor.a);
}
`}},r=`# shadow

Cast a shadow or glow from one input onto another

Uses one input as a mask to generate an offset, blurred shadow that composites onto the other input. Select which input provides the mask shape and which channel to read. The threshold creates a hard silhouette, which is then offset, blurred, and spread to form the shadow. Use a dark color for shadows or a bright color for glows.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | \u2014 | Source B input surface |
| maskSource | int | sourceA | dropdown | Which input provides the mask shape (sourceA or sourceB) |
| sourceChannel | int | red | dropdown | Channel to read from mask (red, green, blue, alpha) |
| threshold | float | 0.5 | 0-1 | Cutoff for the mask \u2014 values above become shadow, below are ignored |
| color | color | black | \u2014 | Shadow or glow color |
| offsetX | float | 0.1 | -1-1 | Horizontal shadow offset as fraction of width |
| offsetY | float | -0.1 | -1-1 | Vertical shadow offset as fraction of height |
| wrap | int | mirror | dropdown | How offset mask samples outside the texture are handled (hide, mirror, repeat, clamp) | 
| blur | float | 1.0 | 0-3 | Gaussian blur radius for shadow softness |
| spread | float | 0.0 | 0-1 | Expand the shadow edge \u2014 higher values make the shadow cover more area |

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .shadow(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(a))n.shaders[t]={...e}}n&&r&&(n.help=r);var f="mixer/shadow",d="mixer",h="shadow",p=n;export{p as default,f as effectId,h as effectName,r as help,d as namespace};
