/* filter/morphology */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Morphology",namespace:"filter",func:"morphology",tags:["blur","artist"],description:"Grayscale morphology dilate/erode (Maximum/Minimum)",globals:{mode:{type:"int",default:0,uniform:"mode",choices:{dilate:0,erode:1},ui:{label:"mode",control:"dropdown"}},radius:{type:"float",default:4,uniform:"radius",min:1,max:32,ui:{label:"radius",control:"slider"}},shape:{type:"int",default:0,define:"SHAPE",choices:{square:0,round:1},ui:{label:"shape",control:"dropdown"}}},textures:{_morphTmp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"morphA",program:"morphA",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_morphTmp"}},{name:"morphB",program:"morphB",inputs:{inputTex:"_morphTmp"},outputs:{fragColor:"outputTex"}}]});var s={morphA:{glsl:`/*
 * Morphology - pass A: square shape uses a horizontal-line structuring
 * element (finished by morphB's vertical pass -- min/max over a box is
 * separable into two 1D passes); round shape computes the full disc
 * structuring element here in one pass (min/max over a disc is NOT
 * separable), so morphB is a passthrough copy for that shape.
 * mode selects the op: dilate (0) = max, erode (1) = min.
 */

#ifdef GL_ES
precision highp float;
#endif

// SHAPE is a compile-time definition (see definition.js \`globals.shape.define\`).
// Disc (625 taps) and line (64 taps) are fully distinct neighborhood loops;
// baking the choice lets the compiler drop the unused loop entirely instead
// of carrying both bounds behind a runtime branch.
#ifndef SHAPE
#define SHAPE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform int mode;
uniform float radius;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;
    vec4 acc = texture(inputTex, uv);

#if SHAPE==1
    // Round: full disc structuring element, capped at radius 12 so the
    // worst case (625 taps) stays bounded regardless of the radius max.
    float r = min(radius, 12.0);
    float r2 = r * r;
    for (int y = -12; y <= 12; y++) {
        for (int x = -12; x <= 12; x++) {
            if (x == 0 && y == 0) { continue; }
            vec2 d = vec2(float(x), float(y));
            if (dot(d, d) > r2) { continue; }
            vec4 s = texture(inputTex, uv + d * texel);
            vec4 hi = max(acc, s);
            vec4 lo = min(acc, s);
            acc = mix(hi, lo, float(mode));
        }
    }
#else
    // Square: horizontal-line structuring element over |i| <= radius.
    float r = min(radius, 32.0);
    for (int i = 1; i <= 32; i++) {
        if (float(i) > r) { break; }
        vec2 o = vec2(float(i), 0.0) * texel;
        vec4 sL = texture(inputTex, uv - o);
        vec4 sR = texture(inputTex, uv + o);
        vec4 hi = max(acc, max(sL, sR));
        vec4 lo = min(acc, min(sL, sR));
        acc = mix(hi, lo, float(mode));
    }
#endif

    fragColor = acc;
}
`,wgsl:`/*
 * Morphology - pass A: square shape uses a horizontal-line structuring
 * element (finished by morphB's vertical pass -- min/max over a box is
 * separable into two 1D passes); round shape computes the full disc
 * structuring element here in one pass (min/max over a disc is NOT
 * separable), so morphB is a passthrough copy for that shape.
 * mode selects the op: dilate (0) = max, erode (1) = min.
 *
 * SHAPE is a compile-time const injected by the runtime (see definition.js
 * \`globals.shape.define\`). Disc (625 taps) and line (64 taps) are fully
 * distinct neighborhood loops; baking the choice lets Dawn constant-fold
 * away the unused loop instead of carrying both bounds behind a branch.
 */

struct Uniforms {
    mode: i32,
    radius: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = 1.0 / texSize;
    var acc = textureSample(inputTex, inputSampler, uv);

    if (SHAPE == 1) {
        // Round: full disc structuring element, capped at radius 12 so the
        // worst case (625 taps) stays bounded regardless of the radius max.
        let r = min(uniforms.radius, 12.0);
        let r2 = r * r;
        for (var y = -12; y <= 12; y++) {
            for (var x = -12; x <= 12; x++) {
                if (x == 0 && y == 0) { continue; }
                let d = vec2<f32>(f32(x), f32(y));
                if (dot(d, d) > r2) { continue; }
                let s = textureSample(inputTex, inputSampler, uv + d * texel);
                let hi = max(acc, s);
                let lo = min(acc, s);
                acc = select(hi, lo, uniforms.mode != 0);
            }
        }
    } else {
        // Square: horizontal-line structuring element over |i| <= radius.
        let r = min(uniforms.radius, 32.0);
        for (var i = 1; i <= 32; i++) {
            if (f32(i) > r) { break; }
            let o = vec2<f32>(f32(i), 0.0) * texel;
            let sL = textureSample(inputTex, inputSampler, uv - o);
            let sR = textureSample(inputTex, inputSampler, uv + o);
            let hi = max(acc, max(sL, sR));
            let lo = min(acc, min(sL, sR));
            acc = select(hi, lo, uniforms.mode != 0);
        }
    }

    return acc;
}
`},morphB:{glsl:`/*
 * Morphology - pass B: square shape finishes the separable box structuring
 * element with a vertical-line pass over morphA's horizontal result; round
 * shape is a passthrough copy since morphA already computed the full disc
 * structuring element (min/max over a disc is not separable).
 * mode selects the op: dilate (0) = max, erode (1) = min.
 */

#ifdef GL_ES
precision highp float;
#endif

// SHAPE is a compile-time definition (see definition.js \`globals.shape.define\`).
#ifndef SHAPE
#define SHAPE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform int mode;
uniform float radius;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 acc = texture(inputTex, uv);

#if SHAPE==0
    vec2 texel = 1.0 / resolution;
    float r = min(radius, 32.0);
    for (int i = 1; i <= 32; i++) {
        if (float(i) > r) { break; }
        vec2 o = vec2(0.0, float(i)) * texel;
        vec4 sD = texture(inputTex, uv - o);
        vec4 sU = texture(inputTex, uv + o);
        vec4 hi = max(acc, max(sD, sU));
        vec4 lo = min(acc, min(sD, sU));
        acc = mix(hi, lo, float(mode));
    }
#endif
    // Round shape: acc is already morphA's disc-SE result; passthrough.

    fragColor = acc;
}
`,wgsl:`/*
 * Morphology - pass B: square shape finishes the separable box structuring
 * element with a vertical-line pass over morphA's horizontal result; round
 * shape is a passthrough copy since morphA already computed the full disc
 * structuring element (min/max over a disc is not separable).
 * mode selects the op: dilate (0) = max, erode (1) = min.
 *
 * SHAPE is a compile-time const injected by the runtime (see definition.js
 * \`globals.shape.define\`).
 */

struct Uniforms {
    mode: i32,
    radius: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    var acc = textureSample(inputTex, inputSampler, uv);

    if (SHAPE == 0) {
        let texel = 1.0 / texSize;
        let r = min(uniforms.radius, 32.0);
        for (var i = 1; i <= 32; i++) {
            if (f32(i) > r) { break; }
            let o = vec2<f32>(0.0, f32(i)) * texel;
            let sD = textureSample(inputTex, inputSampler, uv - o);
            let sU = textureSample(inputTex, inputSampler, uv + o);
            let hi = max(acc, max(sD, sU));
            let lo = min(acc, min(sD, sU));
            acc = select(hi, lo, uniforms.mode != 0);
        }
    }
    // Round shape: acc is already morphA's disc-SE result; passthrough.

    return acc;
}
`}},r=`# morphology

Grayscale morphology dilate/erode (Maximum/Minimum)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | 0 | dilate:0, erode:1 | dilate takes the per-channel max over the structuring element (Maximum: bright regions expand, dark details erode away); erode takes the per-channel min (Minimum: dark regions expand) |
| radius | float | 4 | 1-32 | Structuring element size in pixels |
| shape | int | 0 | square:0, round:1 | square uses a separable box structuring element (sharp corners); round uses a disc structuring element capped at radius 12 (rounded corners) |

## Notes

- square shape is computed as two separable 1D passes (horizontal then vertical) since min/max over a box region is separable; round shape is computed as a single full 2D disc pass since min/max over a disc is not separable.
- The round shape's structuring element radius is capped at 12px regardless of the \`radius\` value, to bound the per-pixel tap count; the square shape uses the full \`radius\` (up to 32px).
- Maximum and Minimum filters are the same per-channel dilate/erode operator; \`mode\` switches between them.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .morphology()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(s))n.shaders[i]={...e}}n&&r&&(n.help=r);var p="filter/morphology",m="filter",c="morphology",d=n;export{d as default,p as effectId,c as effectName,r as help,m as namespace};
