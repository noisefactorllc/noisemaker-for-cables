/* filter/pondRipples */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Pond Ripples",namespace:"filter",func:"pondRipples",tags:["distort","artist"],description:"Concentric ripple distortion around the image center",globals:{amount:{type:"float",default:30,uniform:"amount",min:0,max:100,zero:0,ui:{label:"amount",control:"slider"}},ridges:{type:"int",default:8,uniform:"ridges",min:1,max:20,ui:{label:"ridges",control:"slider"}},style:{type:"int",default:2,define:"STYLE",choices:{aroundCenter:0,outFromCenter:1,pondRipples:2},ui:{label:"style",control:"dropdown"}},wrap:{type:"int",default:0,define:"WRAP",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"pondRipples",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={pondRipples:{glsl:`/*
 * Pond Ripples - concentric ring distortion around the fixed image center.
 *
 * r = distance from center (aspect-corrected, tile-aware global UV);
 * phase = r * ridges * 2*PI; w = sin(phase) * amountGain * 0.05 *
 * (1 - r) is the per-ring wave displacement, damped toward the image
 * edge - and exactly 0 at r=0 (the center pixel) regardless of the
 * damping term, since sin(0)=0, which keeps the polar reconstruction
 * singularity-free.
 *
 * aroundCenter (style 0) rotates the sample's angular position by
 * w*2*PI*0.25 with the radius unchanged (tangential swirl).
 * outFromCenter (style 1) adds w to the radius with the angle unchanged
 * (radial compression/expansion). pondRipples (style 2) does both at
 * half strength for a combined diagonal ripple.
 *
 * The rotation is expressed as GLSL's mat2(co,-s,s,co) * dir, which is
 * the R(-angle) rotation matrix (GLSL mat2 constructors are
 * column-major: mat2(co,-s,s,co) has column0=(co,-s), column1=(s,co),
 * i.e. the matrix [[co,s],[-s,co]]). See pondRipples.wgsl for why the
 * WGSL port must use the manual expansion
 * (co*p.x + s*p.y, -s*p.x + co*p.y), not the naive-looking
 * (co*p.x - s*p.y, s*p.x + co*p.y), to match this numerically.
 *
 * Wrap mode and antialiasing match filter/pinch.
 */

#ifdef GL_ES
precision highp float;
#endif

// STYLE and WRAP are compile-time defines injected by the runtime (see
// definition.js \`globals.style.define\` / \`globals.wrap.define\`). The
// #ifndef guards below are only a standalone-compile fallback.
#ifndef STYLE
#define STYLE 2
#endif

#ifndef WRAP
#define WRAP 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float amount;
uniform int ridges;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359

void main() {
    float aspectRatio = fullResolution.x / fullResolution.y;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    uv -= 0.5;
    uv.x *= aspectRatio;

    float r = length(uv);
    float phase = r * float(ridges) * 2.0 * PI;
    // Clamp the damping term at 0 so corners beyond r=1 (aspect ratios
    // wider/taller than ~1.73:1) don't invert phase and amplify instead
    // of damping.
    float damping = max(0.0, 1.0 - r);
    float w;
    if (amount <= 30.0) {
        // Preserve the original 0..30 response, including the exact shipped
        // default expression at amount=30.
        w = sin(phase) * (amount / 100.0) * 0.05 * damping;
    } else {
        // Continue smoothly from the original default slope, then accelerate
        // toward a 2.0 gain at amount=100 (twice the previous maximum).
        float x = (amount - 30.0) / 70.0;
        float amountGain = 0.3 + 0.7 * x + x * x;
        w = sin(phase) * amountGain * 0.05 * damping;
    }

    // Per-style effective displacement: rotDelta feeds the angular
    // rotation, rDelta feeds the radial extension. aroundCenter uses
    // only rotation, outFromCenter uses only radius, pondRipples splits
    // w evenly across both for a diagonal ripple.
    float rotDelta = 0.0;
    float rDelta = 0.0;
#if STYLE==0
    // aroundCenter
    rotDelta = w;
#elif STYLE==1
    // outFromCenter
    rDelta = w;
#else
    // pondRipples: both at half strength
    rotDelta = w * 0.5;
    rDelta = w * 0.5;
#endif

    // r>0.0 guard avoids a 0/0 direction at the exact center pixel; w is
    // always exactly 0 there (see header), so any direction would do,
    // but this keeps the math NaN-free rather than relying on that.
    vec2 dir = (r > 0.0) ? uv / r : vec2(0.0);

    float rot = rotDelta * 2.0 * PI * 0.25;
    float s = sin(rot);
    float co = cos(rot);
    vec2 rotatedDir = mat2(co, -s, s, co) * dir;

    uv = rotatedDir * (r + rDelta);

    uv.x /= aspectRatio;
    uv += 0.5;

    // Apply wrap mode
#if WRAP==0
    // mirror
    uv = abs(mod(uv + 1.0, 2.0) - 1.0);
#elif WRAP==1
    // repeat
    uv = mod(uv, 1.0);
#else
    // clamp
    uv = clamp(uv, 0.0, 1.0);
#endif

    // Convert distorted global UV back to tile-local for texture sampling.
    // Clamp to tile bounds so wrap modes don't sample past tile coverage.
    vec2 sampleUV = clamp((uv * fullResolution - tileOffset) / resolution, 0.0, 1.0);

    if (antialias) {
        vec2 dx = dFdx(sampleUV);
        vec2 dy = dFdy(sampleUV);
        vec4 col = vec4(0.0);
        col += texture(inputTex, sampleUV + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, sampleUV + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, sampleUV + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, sampleUV + dx * -0.125 + dy *  0.375);
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, sampleUV);
    }
}
`,wgsl:`/*
 * Pond Ripples - concentric ring distortion around the fixed image center.
 * See pondRipples.glsl for the full algorithm derivation; this is a 1:1 port.
 *
 * Tile-aware, mirroring pondRipples.glsl: tileOffset/fullResolution
 * uniforms anchor the ripple center and phase to the full image via
 * globalCoord = pos.xy + tileOffset and a global-frame uv = globalCoord /
 * fullDims (fullDims falls back to texSize, from
 * textureDimensions(inputTex), when fullResolution is unset - guard
 * matches filter/texture's MODE>=5 globalDims pattern). The ripple and
 * rotation math runs entirely in that global frame, then the distorted
 * UV is converted back to tile-local space for the inputTex sample,
 * mirroring GLSL's sampleUV = (uv * fullResolution - tileOffset) /
 * resolution.
 *
 * That final tile-local conversion is additionally gated on
 * isTile = length(tileOffset) > 0.0, which GLSL doesn't need (GLSL has
 * separate resolution/fullResolution uniforms). The runtime sets
 * fullResolution to the canvas size even when not tiling (see
 * pipeline.js updateGlobalUniforms), so fullDims is bit-identical to
 * texSize in the non-tiling case - but an unconditional
 * (uv * fullDims) / texSize round-trip is not guaranteed bit-exact for
 * non-power-of-two sizes (e.g. the 96x96 pinned-hash fixture) under
 * IEEE-754 rounding. Gating on isTile keeps the non-tiling sampleUV
 * identically \`uv\`, guaranteeing a byte-identical non-tiling path,
 * matching filter/pixels and filter/lensWarp's WGSL precedent.
 *
 * Rotation matches GLSL's column-major mat2(co,-s,s,co)
 * multiplication numerically: (co*x+s*y,-s*x+co*y). This preserves
 * ripple chirality across the presented WebGL2 and WebGPU images.
 *
 * Wrap mode and antialiasing match filter/pinch's
 * WGSL port (already floored-mod safe for mirror/repeat).
 *
 * STYLE and WRAP are compile-time consts injected by the runtime (see
 * definition.js \`globals.style.define\` / \`globals.wrap.define\`,
 * injectDefines in webgpu.js). They are intentionally not declared here
 * (injection-only, matching filter/texture's MODE) and are no longer
 * fields of Uniforms below.
 */

struct Uniforms {
    amount: f32,
    ridges: i32,
    antialias: i32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }
    let isTile = length(uniforms.tileOffset) > 0.0;
    let aspectRatio = fullDims.x / fullDims.y;
    let globalCoord = pos.xy + uniforms.tileOffset;
    var uv = globalCoord / fullDims;

    uv = uv - 0.5;
    uv.x = uv.x * aspectRatio;

    let r = length(uv);
    let phase = r * f32(uniforms.ridges) * 2.0 * PI;
    // Clamp the damping term at 0 so corners beyond r=1 (aspect ratios
    // wider/taller than ~1.73:1) don't invert phase and amplify instead
    // of damping.
    let damping = max(0.0, 1.0 - r);
    var w: f32;
    if (uniforms.amount <= 30.0) {
        // Preserve the original 0..30 response, including the exact shipped
        // default expression at amount=30.
        w = sin(phase) * (uniforms.amount / 100.0) * 0.05 * damping;
    } else {
        // Continue smoothly from the original default slope, then accelerate
        // toward a 2.0 gain at amount=100 (twice the previous maximum).
        let x = (uniforms.amount - 30.0) / 70.0;
        let amountGain = 0.3 + 0.7 * x + x * x;
        w = sin(phase) * amountGain * 0.05 * damping;
    }

    var rotDelta: f32 = 0.0;
    var rDelta: f32 = 0.0;
    if (STYLE == 0) {
        // aroundCenter
        rotDelta = w;
    } else if (STYLE == 1) {
        // outFromCenter
        rDelta = w;
    } else {
        // pondRipples: both at half strength
        rotDelta = w * 0.5;
        rDelta = w * 0.5;
    }

    var dir = vec2<f32>(0.0);
    if (r > 0.0) {
        dir = uv / r;
    }

    let rot = rotDelta * 2.0 * PI * 0.25;
    let s = sin(rot);
    let co = cos(rot);
    let rotatedDir = vec2<f32>(co * dir.x + s * dir.y, -s * dir.x + co * dir.y);

    uv = rotatedDir * (r + rDelta);

    uv.x = uv.x / aspectRatio;
    uv = uv + 0.5;

    // Apply wrap mode (floored-mod so negative inputs wrap correctly)
    if (WRAP == 0) {
        // mirror
        uv = abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (WRAP == 1) {
        // repeat
        uv = (uv % 1.0 + 1.0) % 1.0;
    } else {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    // Convert distorted global UV back to tile-local for texture sampling,
    // mirroring GLSL's sampleUV = (uv * fullResolution - tileOffset) / resolution.
    // Clamp to tile bounds so wrap modes don't sample past tile coverage.
    // Gated on isTile so the non-tiling path stays exactly \`uv\` (see header
    // comment for why the round-trip isn't safe to run unconditionally).
    var sampleUV = uv;
    if (isTile) {
        sampleUV = clamp((uv * fullDims - uniforms.tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    if (uniforms.antialias != 0) {
        let dx = dpdx(sampleUV);
        let dy = dpdy(sampleUV);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, sampleUV + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, sampleUV + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, sampleUV + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, sampleUV + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return textureSample(inputTex, inputSampler, sampleUV);
    }
}
`}},o=`# pondRipples

Concentric ripple distortion around the image center

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 30 | 0-100 | Ripple strength; 0 is a no-op and 100 reaches twice the former maximum displacement |
| ridges | int | 8 | 1-20 | Number of concentric ripple rings from center to edge |
| style | int | pondRipples | aroundCenter/outFromCenter/pondRipples | Displacement style |
| wrap | int | mirror | mirror/repeat/clamp | Edge behavior for samples displaced past the image bounds |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Notes

Aspect-corrected polar distortion about the fixed image center (0.5, 0.5). For each pixel, \`r\` is its aspect-corrected distance from center and \`phase = r * ridges * 2*PI\` drives a damped sine wave \`w = sin(phase) * amountGain * 0.05 * (1 - r)\` (the \`(1 - r)\` term fades the ripple out toward the frame edge; \`w\` is exactly 0 at the center regardless of damping, since \`sin(0) = 0\`). The gain follows the original linear response through the default amount of 30, then rises smoothly to 2.0 at amount 100.

- **aroundCenter** rotates each sample's angular position by \`w * 2*PI*0.25\`, leaving its radius unchanged - a tangential swirl that traces concentric rings.
- **outFromCenter** adds \`w\` to each sample's radius, leaving its angle unchanged - a radial compression/expansion ripple.
- **pondRipples** applies both at half strength simultaneously, combining tangential and radial displacement into a diagonal ripple - the closest match to water rings from a dropped stone.

Wrap mode and antialiasing follow \`filter/pinch\`'s conventions exactly.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .pondRipples()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(a))n.shaders[i]={...e}}n&&o&&(n.help=o);var u="filter/pondRipples",d="filter",m="pondRipples",f=n;export{f as default,u as effectId,m as effectName,o as help,d as namespace};
