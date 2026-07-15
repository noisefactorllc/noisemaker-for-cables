/* filter/lensFlare */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Lens Flare",namespace:"filter",func:"lensFlare",tags:["lens","artist"],description:"Additive lens flare with ghost chain, halo, and four lens types (Lens Flare)",globals:{brightness:{type:"float",default:100,uniform:"brightness",min:10,max:300,ui:{label:"brightness",control:"slider"}},centerX:{type:"float",default:.35,uniform:"centerX",min:0,max:1,ui:{label:"center x",control:"slider"}},centerY:{type:"float",default:.35,uniform:"centerY",min:0,max:1,ui:{label:"center y",control:"slider"}},lensType:{type:"int",default:0,define:"LENS_TYPE",choices:{zoom50_300:0,prime35:1,prime105:2,moviePrime:3},ui:{label:"lens type",control:"dropdown"}},tint:{type:"color",default:[1,.95,.85],uniform:"tint",ui:{label:"tint",control:"color"}}},passes:[{name:"render",program:"lensFlare",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={lensFlare:{glsl:`/*
 * Lens Flare - classic additive lens flare (Filter > Render >
 * Lens Flare). Every element is positioned along the flare axis
 * A(t) = mix(flarePos, mirrorPos, t), where flarePos = (centerX,
 * centerY) is the user-placed flare position and mirrorPos = 1 -
 * flarePos is flarePos reflected across the fixed image center (0.5,
 * 0.5). t=0 sits on the flare itself; t=1 sits on the mirrored point on
 * the far side of the image center - the classic "ghosts marching
 * toward the opposite corner" chain. All distances are measured in
 * aspect-corrected UV space (x scaled by fullResolution.x/y, exactly
 * like filter/pinch and filter/spinBlur's own distortion math) so
 * circular/hexagonal elements stay round/regular instead of stretching
 * with the image aspect ratio.
 *
 * This effect never resamples inputTex at a displaced position - it
 * only ADDS energy on top of each pixel's own color - so there is no
 * wrap mode and no antialiasing pass; the source is sampled once at the
 * fragment's own (tile-local) UV. The flare geometry itself is driven
 * by the tile-aware GLOBAL UV (globalCoord/fullResolution) so the
 * flare reads as one continuous pattern across CLI render tiles, per
 * the tile-aware pattern used by pondRipples/extrude/mosaicTiles.
 *
 * centerX/centerY are used directly, with no 1.0-centerY flip:
 * position-derived vectors (flarePos here) flip along with the
 * framebuffer, and the WebGPU present-path flip cancels the raw
 * convention difference, so both backends land the flare in the same
 * screen position when both write centerY unflipped.
 *
 * Every shape primitive used below (core glow, streak, star, hex mask,
 * circle/ring ghosts, halo band) is built from squared distances,
 * cos(6*phi), or a 3-axis abs(dot(...)) max - all even/mirror-symmetric
 * under a Y flip - so the only orientation-sensitive quantity in this
 * whole effect is flarePos itself.
 */

#ifdef GL_ES
precision highp float;
#endif

// LENS_TYPE is a compile-time define injected by the runtime (see
// definition.js \`globals.lensType.define\`). Each lens type selects a fully
// distinct ghost-chain table (6/4/3 elements); baking LENS_TYPE lets the
// compiler strip the other tables' dead branches instead of evaluating
// every ghost for every pixel.
#ifndef LENS_TYPE
#define LENS_TYPE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float brightness;
uniform float centerX;
uniform float centerY;
uniform vec3 tint;

out vec4 fragColor;

#define TAU 6.28318530717958647692

// Aspect-corrected point at parameter t along the flare axis.
vec2 flareAxis(vec2 flarePos, vec2 mirrorPos, float t, float aspectRatio) {
    vec2 a = mix(flarePos, mirrorPos, t);
    a.x *= aspectRatio;
    return a;
}

// Bright core: a tight Gaussian spike plus a wider soft glow skirt.
float coreGlow(float d) {
    return exp(-d * d * 900.0) * 1.2 + exp(-d * 8.0) * 0.4;
}

// Anamorphic streak: very tight vertically (dy weighted 4000x), long
// horizontally (dx weighted 18x) - the thin horizontal line real
// anamorphic lenses throw through a bright source.
float anamorphicStreak(vec2 delta) {
    return exp(-(delta.y * delta.y * 4000.0 + delta.x * delta.x * 18.0));
}

// 6-point star: cos(6*phi) is maximized every 60 degrees around the
// flare, raised to a high power to spike into narrow points, faded
// radially so it only reads near the core.
float sixPointStar(vec2 delta, float d) {
    float phi = atan(delta.y, delta.x);
    return pow(max(0.0, cos(6.0 * phi)), 40.0) * exp(-d * 5.0) * 0.5;
}

// Simple 3-phase cosine palette for the halo's rainbow tint: each RGB
// channel is a cosine of the halo radius dc with phases spaced 1/3 turn
// apart (0, 1/3, 2/3), producing a smooth hue sweep driven by radius
// alone (a compact stand-in for the chromatic fringing real halo rings
// show) without a full HSV round-trip.
vec3 haloRainbow(float dc) {
    return 0.5 + 0.5 * cos(TAU * (dc * 10.0 + vec3(0.0, 0.3333333, 0.6666667)));
}

// Halo ring: a narrow band centered at radius 0.28 around the mirrored
// point (t=1.0), matching the ring that hugs the image-center
// region opposite the flare.
float haloBand(float dc) {
    return exp(-abs(dc - 0.28) * 60.0) * 0.25;
}

// Filled-disc ghost with a soft edge. The edge order is deliberately
// reversed (edge0=size is farther out than edge1=size*0.6): dist=0 then
// reads past edge1 so smoothstep clamps to 1 (full intensity at the
// ghost center), dist=size reads at edge0 so it clamps to 0 (faded out
// by the ghost's nominal radius), with a soft ramp between. GLSL and
// WGSL both implement smoothstep via the same clamp+Hermite polynomial
// regardless of which edge is larger, so this matches bit-for-bit
// across backends.
float circleGhost(float dist, float size) {
    return (1.0 - smoothstep(size * 0.6, size, dist));
}

// Same idiom as circleGhost but with a wider falloff band, used for
// prime105's large "soft circle" ghosts.
float softCircleGhost(float dist, float size) {
    return (1.0 - smoothstep(size * 0.3, size, dist));
}

// Hollow ring ghost: an outer soft disc minus a smaller inner soft
// disc, both built from the same reversed-smoothstep idiom - leaves a
// bright band around radius ~0.6*size and nothing at the center.
float ringGhost(float dist, float size) {
    float outer = (1.0 - smoothstep(size * 0.6, size, dist));
    float inner = (1.0 - smoothstep(size * 0.3, size * 0.6, dist));
    return outer - inner;
}

// Regular-hexagon "distance": max of abs(dot(p, axis)) over 3 axes 60
// degrees apart. Thresholding this with the same reversed-smoothstep
// idiom as circleGhost gives a soft-edged hexagon instead of a disc.
// (This norm is symmetric under a Y flip: reflecting p about the
// horizontal axis permutes the 3-axis set {0, 60, 120} degrees onto
// itself, and max() over a permuted set is unchanged.)
float hexDist(vec2 p) {
    vec2 a0 = vec2(1.0, 0.0);
    vec2 a1 = vec2(0.5, 0.8660254038);
    vec2 a2 = vec2(-0.5, 0.8660254038);
    float d0 = abs(dot(p, a0));
    float d1 = abs(dot(p, a1));
    float d2 = abs(dot(p, a2));
    return max(d0, max(d1, d2));
}

float hexGhost(vec2 delta, float size) {
    return (1.0 - smoothstep(size * 0.6, size, hexDist(delta)));
}

void main() {
    float aspectRatio = fullResolution.x / fullResolution.y;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 localUV = gl_FragCoord.xy / resolution;

    vec4 src = texture(inputTex, localUV);

    vec2 flarePos = vec2(centerX, centerY);
    vec2 mirrorPos = vec2(1.0) - flarePos;

    vec2 p = uv;
    p.x *= aspectRatio;

    vec2 aFlare = flareAxis(flarePos, mirrorPos, 0.0, aspectRatio);
    vec2 delta0 = p - aFlare;
    float d0 = length(delta0);

    vec3 flare = vec3(0.0);

    // Core glow (all lens types).
    flare += vec3(coreGlow(d0));

    // Anamorphic streak (all lens types; doubled for moviePrime).
    float streakVal = anamorphicStreak(delta0);
    #if LENS_TYPE==3
    streakVal *= 2.0;
    #endif
    flare += vec3(streakVal);

    // 6-point star: zoom50_300 and moviePrime only.
    #if LENS_TYPE==0 || LENS_TYPE==3
    flare += vec3(sixPointStar(delta0, d0));
    #endif

    // Rainbow halo ring at t=1.0 (all lens types).
    vec2 aMirror = flareAxis(flarePos, mirrorPos, 1.0, aspectRatio);
    float dc = length(p - aMirror);
    flare += haloRainbow(dc) * haloBand(dc);

    // Ghost chain: table selected by lensType.
    vec2 g = vec2(0.0);
    #if LENS_TYPE==0 || LENS_TYPE==3
        // zoom50_300 (also the base table for moviePrime): 6 ghosts,
        // the largest (t=1.55) rendered hollow for classic-look variety.
        g = flareAxis(flarePos, mirrorPos, 0.25, aspectRatio);
        flare += vec3(1.00, 0.85, 0.60) * circleGhost(length(p - g), 0.06) * 0.35;

        g = flareAxis(flarePos, mirrorPos, 0.4, aspectRatio);
        flare += vec3(0.40, 0.90, 0.85) * circleGhost(length(p - g), 0.10) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 0.6, aspectRatio);
        flare += vec3(0.65, 0.40, 0.95) * circleGhost(length(p - g), 0.045) * 0.45;

        g = flareAxis(flarePos, mirrorPos, 0.85, aspectRatio);
        flare += vec3(0.45, 0.90, 0.50) * circleGhost(length(p - g), 0.14) * 0.18;

        g = flareAxis(flarePos, mirrorPos, 1.2, aspectRatio);
        flare += vec3(1.00, 0.55, 0.20) * circleGhost(length(p - g), 0.08) * 0.30;

        g = flareAxis(flarePos, mirrorPos, 1.55, aspectRatio);
        flare += vec3(0.40, 0.55, 1.00) * ringGhost(length(p - g), 0.20) * 0.12;
    #elif LENS_TYPE==1
        // prime35: 4 tight hexagon ghosts.
        g = flareAxis(flarePos, mirrorPos, 0.3, aspectRatio);
        flare += vec3(1.00, 0.80, 0.55) * hexGhost(p - g, 0.04) * 0.35;

        g = flareAxis(flarePos, mirrorPos, 0.55, aspectRatio);
        flare += vec3(0.85, 0.85, 0.92) * hexGhost(p - g, 0.055) * 0.30;

        g = flareAxis(flarePos, mirrorPos, 0.8, aspectRatio);
        flare += vec3(0.95, 0.70, 0.50) * hexGhost(p - g, 0.065) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 1.3, aspectRatio);
        flare += vec3(0.80, 0.85, 0.95) * hexGhost(p - g, 0.08) * 0.20;
    #else
        // prime105: 3 large soft circles.
        g = flareAxis(flarePos, mirrorPos, 0.45, aspectRatio);
        flare += vec3(0.92, 0.85, 0.78) * softCircleGhost(length(p - g), 0.12) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 0.9, aspectRatio);
        flare += vec3(0.85, 0.88, 0.95) * softCircleGhost(length(p - g), 0.16) * 0.20;

        g = flareAxis(flarePos, mirrorPos, 1.5, aspectRatio);
        flare += vec3(0.95, 0.88, 0.80) * softCircleGhost(length(p - g), 0.20) * 0.15;
    #endif

    vec3 outFlare = flare * tint * (brightness / 100.0);
    #if LENS_TYPE==3
    // moviePrime: cooler overall tint multiplier on top of the
    // user's tint.
    outFlare *= vec3(0.9, 0.95, 1.1);
    #endif

    fragColor = vec4(clamp(src.rgb + outFlare, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Lens Flare - classic additive lens flare. See lensFlare.glsl
 * for the full algorithm derivation - this is a 1:1 port, including its
 * tile-aware GLOBAL flare-geometry UV: uniforms.tileOffset converts the
 * tile-local fragment position to the global pixel coordinate, and
 * uniforms.fullResolution - falling back to textureDimensions(inputTex)
 * when unset, matching filter/texture's WGSL guard - normalizes it to
 * the global UV the flare/ghost-chain geometry is anchored to, so the
 * flare reads as one continuous pattern across CLI render tiles instead
 * of re-centering per tile. This effect never resamples inputTex at a
 * displaced position - it only ADDS energy on top of each pixel's own
 * color - so the source is still sampled once at the fragment's own
 * (tile-local) UV (pos.xy / textureDimensions(inputTex)), independent
 * of the global UV above.
 *
 * uniforms.centerX/centerY are used directly, with no 1.0-centerY flip:
 * flarePos is a position-derived vector (built from the fragment
 * position's own coordinate space, like spinBlur's rotation center),
 * and the WebGPU present-path flip cancels the raw convention
 * difference against GLSL's gl_FragCoord-based UV, so writing centerY
 * unflipped here lands the flare on the same screen position as the
 * GLSL backend. Every shape primitive below (core glow, streak, star,
 * hex mask, circle/ring ghosts, halo band) is even/mirror-symmetric
 * under a Y flip by construction (squared distances, cos(6*phi), or a
 * 3-axis abs(dot(...)) max over an axis set closed under reflection),
 * so flarePos's raw placement is the only orientation-sensitive
 * quantity in this port.
 *
 * Struct field order matters for WGSL's default (std140-compatible)
 * uniform layout: the three f32 scalars before tint sum to 12 bytes:
 * the packer (parseWgslStructByteLayout) rounds that up to tint's
 * 16-byte alignment automatically, the same padding a native WGSL
 * compiler would insert, so no manual padding field is needed.
 *
 * LENS_TYPE is a compile-time const injected by the runtime
 * (injectDefines, see definition.js \`globals.lensType.define\`), not a
 * uniforms struct field. Each lens type selects a fully distinct
 * ghost-chain table (6/4/3 elements); baking LENS_TYPE lets Dawn
 * constant-fold the dispatch and drop the other tables' dead branches
 * instead of evaluating every ghost for every pixel.
 */

struct Uniforms {
    brightness: f32,
    centerX: f32,
    centerY: f32,
    tint: vec3<f32>,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.28318530717958647692;

// Aspect-corrected point at parameter t along the flare axis.
fn flareAxis(flarePos: vec2<f32>, mirrorPos: vec2<f32>, t: f32, aspectRatio: f32) -> vec2<f32> {
    var a = mix(flarePos, mirrorPos, t);
    a.x = a.x * aspectRatio;
    return a;
}

// Bright core: a tight Gaussian spike plus a wider soft glow skirt.
fn coreGlow(d: f32) -> f32 {
    return exp(-d * d * 900.0) * 1.2 + exp(-d * 8.0) * 0.4;
}

// Anamorphic streak: very tight vertically (dy weighted 4000x), long
// horizontally (dx weighted 18x).
fn anamorphicStreak(delta: vec2<f32>) -> f32 {
    return exp(-(delta.y * delta.y * 4000.0 + delta.x * delta.x * 18.0));
}

// 6-point star: cos(6*phi) spikes every 60 degrees around the flare.
fn sixPointStar(delta: vec2<f32>, d: f32) -> f32 {
    let phi = atan2(delta.y, delta.x);
    return pow(max(0.0, cos(6.0 * phi)), 40.0) * exp(-d * 5.0) * 0.5;
}

// Simple 3-phase cosine palette for the halo's rainbow tint - see
// lensFlare.glsl's header comment for the rationale.
fn haloRainbow(dc: f32) -> vec3<f32> {
    let phase = vec3<f32>(dc * 10.0) + vec3<f32>(0.0, 0.3333333, 0.6666667);
    return vec3<f32>(0.5) + vec3<f32>(0.5) * cos(TAU * phase);
}

// Halo ring: a narrow band centered at radius 0.28 around the mirrored
// point (t=1.0).
fn haloBand(dc: f32) -> f32 {
    return exp(-abs(dc - 0.28) * 60.0) * 0.25;
}

// Filled-disc ghost with a soft edge. The edge order is deliberately
// reversed (edge0=size is farther out than edge1=size*0.6) - see
// lensFlare.glsl's header comment; WGSL's smoothstep uses the same
// clamp+Hermite polynomial as GLSL's regardless of edge order, so this
// matches bit-for-bit across backends.
fn circleGhost(dist: f32, size: f32) -> f32 {
    return (1.0 - smoothstep(size * 0.6, size, dist));
}

// Same idiom as circleGhost but with a wider falloff band, used for
// prime105's large "soft circle" ghosts.
fn softCircleGhost(dist: f32, size: f32) -> f32 {
    return (1.0 - smoothstep(size * 0.3, size, dist));
}

// Hollow ring ghost: an outer soft disc minus a smaller inner soft disc.
fn ringGhost(dist: f32, size: f32) -> f32 {
    let outer = (1.0 - smoothstep(size * 0.6, size, dist));
    let inner = (1.0 - smoothstep(size * 0.3, size * 0.6, dist));
    return outer - inner;
}

// Regular-hexagon "distance": max of abs(dot(p, axis)) over 3 axes 60
// degrees apart.
fn hexDist(p: vec2<f32>) -> f32 {
    let a0 = vec2<f32>(1.0, 0.0);
    let a1 = vec2<f32>(0.5, 0.8660254038);
    let a2 = vec2<f32>(-0.5, 0.8660254038);
    let d0 = abs(dot(p, a0));
    let d1 = abs(dot(p, a1));
    let d2 = abs(dot(p, a2));
    return max(d0, max(d1, d2));
}

fn hexGhost(delta: vec2<f32>, size: f32) -> f32 {
    return (1.0 - smoothstep(size * 0.6, size, hexDist(delta)));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }
    let aspectRatio = fullDims.x / fullDims.y;
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = globalCoord / fullDims;
    let localUV = pos.xy / texSize;

    let src = textureSample(inputTex, inputSampler, localUV);

    let flarePos = vec2<f32>(uniforms.centerX, uniforms.centerY);
    let mirrorPos = vec2<f32>(1.0) - flarePos;

    var p = uv;
    p.x = p.x * aspectRatio;

    let aFlare = flareAxis(flarePos, mirrorPos, 0.0, aspectRatio);
    let delta0 = p - aFlare;
    let d0 = length(delta0);

    var flare = vec3<f32>(0.0);

    // Core glow (all lens types).
    flare = flare + vec3<f32>(coreGlow(d0));

    // Anamorphic streak (all lens types; doubled for moviePrime).
    var streakVal = anamorphicStreak(delta0);
    if (LENS_TYPE == 3) {
        streakVal = streakVal * 2.0;
    }
    flare = flare + vec3<f32>(streakVal);

    // 6-point star: zoom50_300 and moviePrime only.
    if (LENS_TYPE == 0 || LENS_TYPE == 3) {
        flare = flare + vec3<f32>(sixPointStar(delta0, d0));
    }

    // Rainbow halo ring at t=1.0 (all lens types).
    let aMirror = flareAxis(flarePos, mirrorPos, 1.0, aspectRatio);
    let dc = length(p - aMirror);
    flare = flare + haloRainbow(dc) * haloBand(dc);

    // Ghost chain: table selected by lensType.
    var g = vec2<f32>(0.0);
    if (LENS_TYPE == 0 || LENS_TYPE == 3) {
        // zoom50_300 (also the base table for moviePrime): 6 ghosts,
        // the largest (t=1.55) rendered hollow for classic-look variety.
        g = flareAxis(flarePos, mirrorPos, 0.25, aspectRatio);
        flare = flare + vec3<f32>(1.00, 0.85, 0.60) * circleGhost(length(p - g), 0.06) * 0.35;

        g = flareAxis(flarePos, mirrorPos, 0.4, aspectRatio);
        flare = flare + vec3<f32>(0.40, 0.90, 0.85) * circleGhost(length(p - g), 0.10) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 0.6, aspectRatio);
        flare = flare + vec3<f32>(0.65, 0.40, 0.95) * circleGhost(length(p - g), 0.045) * 0.45;

        g = flareAxis(flarePos, mirrorPos, 0.85, aspectRatio);
        flare = flare + vec3<f32>(0.45, 0.90, 0.50) * circleGhost(length(p - g), 0.14) * 0.18;

        g = flareAxis(flarePos, mirrorPos, 1.2, aspectRatio);
        flare = flare + vec3<f32>(1.00, 0.55, 0.20) * circleGhost(length(p - g), 0.08) * 0.30;

        g = flareAxis(flarePos, mirrorPos, 1.55, aspectRatio);
        flare = flare + vec3<f32>(0.40, 0.55, 1.00) * ringGhost(length(p - g), 0.20) * 0.12;
    } else if (LENS_TYPE == 1) {
        // prime35: 4 tight hexagon ghosts.
        g = flareAxis(flarePos, mirrorPos, 0.3, aspectRatio);
        flare = flare + vec3<f32>(1.00, 0.80, 0.55) * hexGhost(p - g, 0.04) * 0.35;

        g = flareAxis(flarePos, mirrorPos, 0.55, aspectRatio);
        flare = flare + vec3<f32>(0.85, 0.85, 0.92) * hexGhost(p - g, 0.055) * 0.30;

        g = flareAxis(flarePos, mirrorPos, 0.8, aspectRatio);
        flare = flare + vec3<f32>(0.95, 0.70, 0.50) * hexGhost(p - g, 0.065) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 1.3, aspectRatio);
        flare = flare + vec3<f32>(0.80, 0.85, 0.95) * hexGhost(p - g, 0.08) * 0.20;
    } else {
        // prime105: 3 large soft circles.
        g = flareAxis(flarePos, mirrorPos, 0.45, aspectRatio);
        flare = flare + vec3<f32>(0.92, 0.85, 0.78) * softCircleGhost(length(p - g), 0.12) * 0.25;

        g = flareAxis(flarePos, mirrorPos, 0.9, aspectRatio);
        flare = flare + vec3<f32>(0.85, 0.88, 0.95) * softCircleGhost(length(p - g), 0.16) * 0.20;

        g = flareAxis(flarePos, mirrorPos, 1.5, aspectRatio);
        flare = flare + vec3<f32>(0.95, 0.88, 0.80) * softCircleGhost(length(p - g), 0.20) * 0.15;
    }

    var outFlare = flare * uniforms.tint * (uniforms.brightness / 100.0);
    if (LENS_TYPE == 3) {
        // moviePrime: cooler overall tint multiplier on top of the
        // user's tint.
        outFlare = outFlare * vec3<f32>(0.9, 0.95, 1.1);
    }

    return vec4<f32>(clamp(src.rgb + outFlare, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},s="# lensFlare\n\nAdditive lens flare with ghost chain, halo, and four lens types (Lens Flare)\n\n## Parameters\n\n| Parameter | Type | Default | Range | Description |\n|-----------|------|---------|-------|-------------|\n| brightness | float | 100 | 10-300 | Overall flare intensity as a percent; Lens Flare has no true \"off\" - even the minimum (10) still adds a faint flare |\n| centerX | float | 0.35 | 0-1 | Horizontal position of the flare source, in normalized image coordinates |\n| centerY | float | 0.35 | 0-1 | Vertical position of the flare source, in normalized image coordinates |\n| lensType | int | zoom50_300 | zoom50_300:0, prime35:1, prime105:2, moviePrime:3 | Selects the ghost-chain table and which extra elements (star, doubled streak, cooler tint) are active |\n| tint | color | [1.0, 0.95, 0.85] | - | Multiplies every flare element (core, streak, star, halo, ghosts) uniformly |\n\n## Notes\n\n- Single pass, additive over the source image: `out = clamp(src + flare, 0, 1)`, alpha copied from the source. The effect never resamples the input at a displaced position, so there is no wrap mode or antialiasing control.\n- All elements sit along the flare axis `A(t) = mix(flarePos, 1 - flarePos, t)`, where `flarePos = (centerX, centerY)` and `1 - flarePos` is `flarePos` reflected across the fixed image center - `t=0` is the flare itself, `t=1` is the mirrored point on the opposite side of center, and ghosts beyond `t=1` continue past it. Distances are measured in aspect-corrected UV space so circular and hexagonal elements stay round/regular regardless of image aspect ratio.\n- Universal elements (present for every `lensType`): a bright core glow at `t=0`, a horizontal anamorphic streak through the core, and a rainbow-tinted halo ring at `t=1.0` (radius 0.28 around the mirrored point; hue cycles with radius via a 3-phase cosine palette).\n- The 6-point star is only drawn for **zoom50_300** and **moviePrime**.\n- Ghost chain by `lensType`:\n  - **zoom50_300** - 6 circular ghosts marching from the flare toward and past the mirror point (warm, teal, violet, green, and orange filled discs, plus a larger hollow ring ghost for variety).\n  - **prime35** - 4 small, tight hexagonal ghosts (warm/neutral tints), true to a 35mm prime's faceted iris.\n  - **prime105** - 3 large ghosts with a wider, softer edge falloff than the other lens types.\n  - **moviePrime** - reuses the zoom50_300 ghost table, doubles the anamorphic streak's intensity, and multiplies the whole flare by an additional cool tint (`x vec3(0.9, 0.95, 1.1)`) on top of the `tint` parameter - the wide cyan-blue streak look of anamorphic movie lenses.\n- All shape math (core, streak, star, hexagon mask, circle/ring ghosts, halo band) is built from squared distances, `cos(6*phi)`, or a 3-axis `abs(dot(...))` max, all mirror-symmetric top-to-bottom by construction - only `flarePos` itself is orientation-sensitive.\n\n## Usage\n\n```\nsearch filter, synth\n\nnoise(seed: 1, ridges: true)\n  .lensFlare()\n  .write(o0)\n\nrender(o0)\n```\n";if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&s&&(t.help=s);var c="filter/lensFlare",h="filter",d="lensFlare",p=t;export{p as default,c as effectId,d as effectName,s as help,h as namespace};
