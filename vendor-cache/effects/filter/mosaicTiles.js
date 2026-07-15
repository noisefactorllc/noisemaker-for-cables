/* filter/mosaicTiles */
var i=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new i({name:"Mosaic Tiles",namespace:"filter",func:"mosaicTiles",tags:["pixel","noise","artist"],description:"Wavy grouted ceramic tiles with beveled relief, or pixelized squares sampled from randomly offset sources with gap fill (Mosaic Tiles, Tiles)",globals:{mode:{type:"int",default:0,define:"MODE",choices:{mosaic:0,shifted:1},ui:{label:"mode",control:"dropdown"}},tileSize:{type:"float",default:32,uniform:"tileSize",min:4,max:128,ui:{label:"tile size",control:"slider"}},groutWidth:{type:"float",default:12,uniform:"groutWidth",min:0,max:100,ui:{label:"grout width",control:"slider",enabledBy:{param:"mode",eq:0}}},relief:{type:"float",default:40,uniform:"relief",min:0,max:100,ui:{label:"relief",control:"slider",enabledBy:{param:"mode",eq:0}}},maxOffset:{type:"float",default:25,uniform:"maxOffset",min:0,max:100,ui:{label:"max offset",control:"slider",enabledBy:{param:"mode",eq:1}}},gapFill:{type:"int",default:0,uniform:"gapFill",choices:{background:0,inverse:1,unaltered:2},ui:{label:"gap fill",control:"dropdown",enabledBy:{param:"mode",eq:1}}},backgroundColor:{type:"color",default:[.1,.1,.1],uniform:"backgroundColor",ui:{label:"background color",control:"color",enabledBy:{and:[{param:"mode",eq:1},{param:"gapFill",eq:0}]}}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},passes:[{name:"render",program:"mosaicTiles",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={mosaicTiles:{glsl:`/*
 * Mosaic Tiles - covers two filters via \`mode\`:
 *
 *   mosaic (0)  - A square grid warped by value noise into wavy ceramic
 *                 tiles. Each tile pixelizes its image region to one
 *                 representative source sample (see the mosaic branch
 *                 below), and tiles
 *                 are separated by grout that is darkened and beveled
 *                 with relief shading directional relief shading (fixed 135-degree
 *                 light, matching filter/craquelure's convention).
 *   shifted (1) - A REGULAR (unwarped) square grid;
 *                 each tile is pixelized to one representative color from
 *                 a randomly shifted source position (a per-cell hash
 *                 offset, up to maxOffset% of a tile width), leaving a small
 *                 fixed gap between tiles that is filled per \`gapFill\`
 *                 (backgroundColor / the inverse of the tile's own home
 *                 pixel / the unaltered home pixel).
 *
 * Both modes assign pixels to cells with the same floor/fract grid math
 * on tileSize-sized cells, in GLOBAL (tile-aware) pixel coordinates so
 * the grid and its warp are continuous across CLI render tiles. \`mode\`
 * is a compile-time \`define\` (MODE, see definition.js's
 * \`globals.mode.define\`): the two branches are fully distinct algorithms,
 * so baking MODE lets the compiler drop the dead arm instead of branching
 * at runtime on a value that is constant for the whole draw.
 *
 * groutWidth is a single shared uniform reused by BOTH modes for visual
 * consistency, rather than adding a second "gap width" param: in mosaic
 * it sets the grout band's HALF-width (groutWidth% of tileSize/2,
 * measured from the warped cell border - see mosaicGroutMask below); in
 * shifted it sets the FULL fixed inter-tile gap width (groutWidth% of
 * tileSize - no /2, since it is a gap between two tile faces rather than
 * a border-hugging band, and using the full tileSize keeps the default
 * (12%) gap appropriately small and subtle; referencing tileSize/2 would make
 * the default gap barely a pixel wide). Its UI control (definition.js)
 * is gated to mosaic-only: shifted's gap is meant to read as a small
 * fixed structural constant rather than a per-mode headline control, but
 * the shader still consumes whatever value the uniform currently holds
 * in BOTH branches, so a user who wants a different shifted gap width
 * can dial it in from mosaic mode's grout slider before switching modes.
 *
 * seed is mixed into the mosaic warp's vnoise lookup position (via the
 * same \`seedVal * 101.7\` large-offset-translation idiom filter/stipple
 * and filter/craquelure use for their hash lookups). This keeps \`seed\`
 * responsive in mosaic mode as well as shifted mode and matches the
 * equivalent seeded procedural fields in filter/stipple.
 */

#ifdef GL_ES
precision highp float;
#endif

// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`). Wrapping the 2-way variant dispatch in #if blocks
// instead of a runtime int dispatch lets the compiler drop the unreachable
// mode arm instead of keeping both fully distinct algorithms live.
#ifndef MODE
#define MODE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float tileSize;
uniform float groutWidth;
uniform float relief;
uniform float maxOffset;
uniform int gapFill;
uniform vec3 backgroundColor;
uniform int seed;

out vec4 fragColor;

// hash - hash / jitter.
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// value noise - value noise (fBm not needed here).
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Directional relief shading from height.
float reliefShade(float hC, float hR, float hT, float strength, float lightAngleDeg) {
    vec2 grad = vec2(hR - hC, hT - hC) * strength;
    vec3 n = normalize(vec3(-grad, 1.0));
    float a = radians(lightAngleDeg);
    vec3 L = normalize(vec3(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

// Mosaic mode's wavy-grid warp scalar (px) at global pixel position gc,
// broadcast equally to both axes when added to gc (see main()'s mosaic
// branch) - a single continuous scalar field is enough to wave every
// cell border, because two neighboring pixels straddling a nominal
// border pick up slightly different offsets as the noise varies, which
// bends the actual floor()-quantized cell boundary between them (the
// same domain-warp-before-quantize mechanism filter/craquelure uses for
// its crack path, there applied identically to both axes for the same
// reason - see craquelure.glsl's header).
float mosaicWarp(vec2 gc, float tileSizePx, float seedVal) {
    return vnoise(gc / tileSizePx + seedVal * 101.7) * 0.25 * tileSizePx;
}

// Mosaic mode's grout mask (1 = on grout, 0 = tile interior) at global
// pixel position gc: warps gc, finds the fractional position within its
// tileSizePx cell, and turns the distance to the nearest cell edge into
// an antialiased band of half-width \`groutWidthPct% of tileSizePx/2\`.
float mosaicGroutMask(vec2 gc, float tileSizePx, float groutWidthPct, float seedVal) {
    float warp = mosaicWarp(gc, tileSizePx, seedVal);
    vec2 cellFrac = fract((gc + vec2(warp)) / tileSizePx);
    float edgeDistPx = min(min(cellFrac.x, 1.0 - cellFrac.x), min(cellFrac.y, 1.0 - cellFrac.y)) * tileSizePx;
    float groutHalfWidthPx = groutWidthPct / 100.0 * (tileSizePx * 0.5);
    float groutAA = 1.25;
    return 1.0 - smoothstep(groutHalfWidthPx - groutAA, groutHalfWidthPx + groutAA, edgeDistPx);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 srcHome = texture(inputTex, uv);
    float seedF = float(seed);

    vec3 result;

#if MODE==0
    // Mosaic: wavy tiles with beveled grout.
    float warp = mosaicWarp(globalCoord, tileSize, seedF);
    vec2 warpedCoord = globalCoord + vec2(warp);
    vec2 cellSpace = warpedCoord / tileSize;
    vec2 cellId = floor(cellSpace);
    // Pixelize the source: every fragment assigned to this warped tile
    // samples one representative coordinate. Evaluate the inverse-warp
    // approximation at the cell center (not at the current fragment), so
    // the sample stays constant across the entire tile interior.
    vec2 warpedCenter = (cellId + vec2(0.5)) * tileSize;
    float centerWarp = mosaicWarp(warpedCenter, tileSize, seedF);
    vec2 sampleGc = warpedCenter - vec2(centerWarp);
    vec2 sampleUV = clamp((sampleGc - tileOffset) / resolution, 0.0, 1.0);
    vec3 tileColor = texture(inputTex, sampleUV).rgb;

    // True central-difference gradient of the grout mask (5 bounded
    // evaluations total), fed into filter/relief's reliefShade exactly like
    // filter/craquelure's crack wall shading.
    float kC = mosaicGroutMask(globalCoord, tileSize, groutWidth, seedF);
    float kR = mosaicGroutMask(globalCoord + vec2(1.0, 0.0), tileSize, groutWidth, seedF);
    float kL = mosaicGroutMask(globalCoord - vec2(1.0, 0.0), tileSize, groutWidth, seedF);
    float kT = mosaicGroutMask(globalCoord + vec2(0.0, 1.0), tileSize, groutWidth, seedF);
    float kB = mosaicGroutMask(globalCoord - vec2(0.0, 1.0), tileSize, groutWidth, seedF);

    // Central-difference gradient of the grout mask k; feeds
    // reliefShade's synthetic height samples below.
    vec2 gradK = vec2((kR - kL) * 0.5, (kT - kB) * 0.5);

    // Height fed to reliefShade is -k, NOT +k: grout is a carved
    // groove (a dip), not a raised ridge, so height must FALL toward
    // the grout center. Negating hC/hR/hT flips the sign of the
    // gradient/normal reliefShade sees, which puts the lit wall on
    // the correct (concave-groove) side of the grout - mirrors
    // filter/craquelure's crack-wall fix, see its 83a0731c commit
    // for the full derivation.
    float hC = -kC;
    float hR = hC - gradK.x;
    float hT = hC - gradK.y;
    float shadeStrength = 6.0;
    float shade = reliefShade(hC, hR, hT, shadeStrength, 135.0);

    // reliefShade's flat-ground (zero-gradient) value is exactly 0.6
    // for ANY lightAngleDeg (L's z-component is a fixed 0.75 before
    // normalizing by a length that always works out to 1.25
    // regardless of angle, since cos^2+sin^2=1), so centering the
    // bevel multiplier there - rather than filter/craquelure's
    // literal 0.5 - makes relief contribute EXACTLY zero shading
    // away from any grout, not just at relief=0 (a small correctness
    // improvement; craquelure's 0.5 centering leaves a faint uniform
    // tint across its whole image that this avoids). Unlike
    // craquelure's wallMask, no additional gradient gate is needed
    // here: the grout mask k already saturates to an exact flat
    // plateau (0) away from any grout band by construction
    // (mosaicGroutMask's smoothstep has a clamped range), so gradK -
    // and therefore shade's departure from flatShade - is already
    // exactly zero there.
    float flatShade = 0.6;
    vec3 darkened = tileColor * mix(1.0, 0.35, kC);
    float shadeMul = 1.0 + (shade - flatShade) * 2.0 * (relief / 100.0);
    result = clamp(darkened * shadeMul, 0.0, 1.0);
#elif MODE==1
    // Shifted: regular pixelized tiles, each assigned one representative
    // color from a randomly shifted source position, with a small fixed
    // gap between tiles filled per gapFill.
    vec2 cellSpace = globalCoord / tileSize;
    vec2 cellId = floor(cellSpace);
    vec2 cellFrac = fract(cellSpace);
    float edgeDistPx = min(min(cellFrac.x, 1.0 - cellFrac.x), min(cellFrac.y, 1.0 - cellFrac.y)) * tileSize;

    float gapWidthPx = groutWidth / 100.0 * tileSize;
    float gapAA = 1.25;
    float gapMask = 1.0 - smoothstep(gapWidthPx * 0.5 - gapAA, gapWidthPx * 0.5 + gapAA, edgeDistPx);

    // x2.0 expands the hash's +/-0.5 span to +/-1.0 so offsetPx spans
    // the full +/-maxOffset% of tileSize.
    vec2 offsetPx = (hash22(cellId + seedF * 101.7) - 0.5) * 2.0 * (maxOffset / 100.0) * tileSize;
    vec2 cellCenterGc = (cellId + vec2(0.5)) * tileSize;
    vec2 shiftedGc = cellCenterGc + offsetPx;
    vec2 shiftedUV = clamp((shiftedGc - tileOffset) / resolution, 0.0, 1.0);
    vec3 tileColor = texture(inputTex, shiftedUV).rgb;

    vec3 gapColor;
    if (gapFill == 0) {
        // background
        gapColor = backgroundColor;
    } else if (gapFill == 1) {
        // inverse of the tile's own home pixel
        gapColor = 1.0 - srcHome.rgb;
    } else {
        // unaltered home pixel
        gapColor = srcHome.rgb;
    }

    result = mix(tileColor, gapColor, gapMask);
#endif

    // Alpha always comes from the pixel's own unmodified home position,
    // matching filter/stipple's precedent - true in the gapFill/unaltered
    // path too, since it already samples srcHome for its color.
    fragColor = vec4(result, srcHome.a);
}
`,wgsl:`/*
 * Mosaic Tiles - covers two filters via \`mode\`. See
 * mosaicTiles.glsl for the full algorithm derivation (wavy-grid warp,
 * grout/gap mask construction, groutWidth's dual reuse, seed's warp
 * mixing, the constant per-tile representative sample, relief shading bevel
 * shading with the flat-shade-0.6 centering correction); this is a 1:1
 * port.
 *
 * tileOffset converts the tile-local fragment position to global procedural
 * coordinates, and converts representative global source positions back to
 * the local input texture. It is zero for ordinary full-frame renders.
 *
 * No rotation/handedness question anywhere in this effect (no angle
 * param, no swirl) - every vector here is axis-aligned grid math
 * (floor/fract/min/mix) or a scalar broadcast, and reliefShade's light
 * vector L is a plain function of the fixed 135-degree angle constant,
 * not fragment-coordinate-derived, so it is textually identical to the
 * GLSL. The 4 neighbor taps used for the grout-mask central
 * difference (gc +/- 1px on each axis) use the SAME textual +1/-1 offsets
 * on WGSL's own native pos.xy, uncompensated - the WebGPU present-time
 * flip cancels the raw Y-convention difference for position-derived
 * offsets like these;
 * filter/spinBlur, filter/pondRipples precedent).
 *
 * MODE is a compile-time const injected by the runtime via injectDefines
 * (see definition.js \`globals.mode.define\`). Same fix as the GLSL
 * backend - collapses the 2-way mode dispatch so it constant-folds
 * instead of branching on a runtime uniform. The old \`mode\` field is
 * removed from Uniforms; the packer maps the remaining fields by name to
 * recomputed byte offsets, so removal is safe.
 */

struct Uniforms {
    tileSize: f32,
    groutWidth: f32,
    relief: f32,
    maxOffset: f32,
    gapFill: i32,
    backgroundColor: vec3<f32>,
    seed: i32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// hash - hash / jitter.
fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.xyx) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.xx + p3.yz) * p3.zy);
}

// value noise - value noise (fBm not needed here).
fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

// Directional relief shading from height.
fn reliefShade(hC: f32, hR: f32, hT: f32, strength: f32, lightAngleDeg: f32) -> f32 {
    let grad = vec2<f32>(hR - hC, hT - hC) * strength;
    let n = normalize(vec3<f32>(-grad, 1.0));
    let a = radians(lightAngleDeg);
    let L = normalize(vec3<f32>(cos(a), sin(a), 0.75));
    return clamp(dot(n, L), 0.0, 1.0);
}

// See mosaicTiles.glsl's mosaicWarp for the full derivation.
fn mosaicWarp(gc: vec2<f32>, tileSizePx: f32, seedVal: f32) -> f32 {
    return vnoise(gc / tileSizePx + seedVal * 101.7) * 0.25 * tileSizePx;
}

// See mosaicTiles.glsl's mosaicGroutMask for the full derivation.
fn mosaicGroutMask(gc: vec2<f32>, tileSizePx: f32, groutWidthPct: f32, seedVal: f32) -> f32 {
    let warp = mosaicWarp(gc, tileSizePx, seedVal);
    let cellFrac = fract((gc + vec2<f32>(warp)) / tileSizePx);
    let edgeDistPx = min(min(cellFrac.x, 1.0 - cellFrac.x), min(cellFrac.y, 1.0 - cellFrac.y)) * tileSizePx;
    let groutHalfWidthPx = groutWidthPct / 100.0 * (tileSizePx * 0.5);
    let groutAA = 1.25;
    return 1.0 - smoothstep(groutHalfWidthPx - groutAA, groutHalfWidthPx + groutAA, edgeDistPx);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = pos.xy / texSize;
    let srcHome = textureSample(inputTex, inputSampler, uv);
    let seedF = f32(uniforms.seed);

    var result: vec3<f32>;

    if (MODE == 0) {
        // Mosaic: wavy tiles with beveled grout.
        let warp = mosaicWarp(globalCoord, uniforms.tileSize, seedF);
        let warpedCoord = globalCoord + vec2<f32>(warp);
        let cellSpace = warpedCoord / uniforms.tileSize;
        let cellId = floor(cellSpace);
        let warpedCenter = (cellId + vec2<f32>(0.5)) * uniforms.tileSize;
        let centerWarp = mosaicWarp(warpedCenter, uniforms.tileSize, seedF);
        let sampleGc = warpedCenter - vec2<f32>(centerWarp);
        let sampleUV = clamp((sampleGc - uniforms.tileOffset) / texSize,
            vec2<f32>(0.0), vec2<f32>(1.0));
        let tileColor = textureSample(inputTex, inputSampler, sampleUV).rgb;

        // True central-difference gradient of the grout mask (5 bounded
        // evaluations total), fed into filter/relief's reliefShade exactly like
        // filter/craquelure's crack wall shading.
        let kC = mosaicGroutMask(globalCoord, uniforms.tileSize, uniforms.groutWidth, seedF);
        let kR = mosaicGroutMask(globalCoord + vec2<f32>(1.0, 0.0), uniforms.tileSize, uniforms.groutWidth, seedF);
        let kL = mosaicGroutMask(globalCoord - vec2<f32>(1.0, 0.0), uniforms.tileSize, uniforms.groutWidth, seedF);
        let kT = mosaicGroutMask(globalCoord + vec2<f32>(0.0, 1.0), uniforms.tileSize, uniforms.groutWidth, seedF);
        let kB = mosaicGroutMask(globalCoord - vec2<f32>(0.0, 1.0), uniforms.tileSize, uniforms.groutWidth, seedF);

        // Central-difference gradient of the grout mask k; feeds
        // reliefShade's synthetic height samples below.
        let gradK = vec2<f32>((kR - kL) * 0.5, (kT - kB) * 0.5);

        // Height fed to reliefShade is -k, NOT +k: grout is a carved
        // groove (a dip), not a raised ridge - see mosaicTiles.glsl for
        // the full derivation (mirrors filter/craquelure's 83a0731c fix).
        let hC = -kC;
        let hR = hC - gradK.x;
        let hT = hC - gradK.y;
        let shadeStrength = 6.0;
        let shade = reliefShade(hC, hR, hT, shadeStrength, 135.0);

        // See mosaicTiles.glsl: 0.6 is reliefShade's angle-independent
        // flat-ground value, so centering the bevel multiplier there
        // makes relief contribute exactly zero shading away from grout.
        // Unlike craquelure's wallMask, no additional gradient gate is
        // needed: k already saturates to an exact flat plateau away from
        // any grout band, so gradK is already exactly zero there.
        let flatShade = 0.6;
        let darkened = tileColor * mix(1.0, 0.35, kC);
        let shadeMul = 1.0 + (shade - flatShade) * 2.0 * (uniforms.relief / 100.0);
        result = clamp(darkened * shadeMul, vec3<f32>(0.0), vec3<f32>(1.0));
    } else {
        // Shifted: regular pixelized tiles, each assigned one representative
        // color from a randomly shifted source position, with a small fixed
        // gap between tiles filled per gapFill.
        let cellSpace = globalCoord / uniforms.tileSize;
        let cellId = floor(cellSpace);
        let cellFrac = fract(cellSpace);
        let edgeDistPx = min(min(cellFrac.x, 1.0 - cellFrac.x), min(cellFrac.y, 1.0 - cellFrac.y)) * uniforms.tileSize;

        let gapWidthPx = uniforms.groutWidth / 100.0 * uniforms.tileSize;
        let gapAA = 1.25;
        let gapMask = 1.0 - smoothstep(gapWidthPx * 0.5 - gapAA, gapWidthPx * 0.5 + gapAA, edgeDistPx);

        // x2.0 expands the hash's +/-0.5 span to +/-1.0 so offsetPx spans
        // the full +/-maxOffset% of tileSize.
        let offsetPx = (hash22(cellId + seedF * 101.7) - 0.5) * 2.0 * (uniforms.maxOffset / 100.0) * uniforms.tileSize;
        let cellCenterGc = (cellId + vec2<f32>(0.5)) * uniforms.tileSize;
        let shiftedGc = cellCenterGc + offsetPx;
        let shiftedUV = clamp((shiftedGc - uniforms.tileOffset) / texSize,
            vec2<f32>(0.0), vec2<f32>(1.0));
        let tileColor = textureSample(inputTex, inputSampler, shiftedUV).rgb;

        var gapColor: vec3<f32>;
        if (uniforms.gapFill == 0) {
            // background
            gapColor = uniforms.backgroundColor;
        } else if (uniforms.gapFill == 1) {
            // inverse of the tile's own home pixel
            gapColor = 1.0 - srcHome.rgb;
        } else {
            // unaltered home pixel
            gapColor = srcHome.rgb;
        }

        result = mix(tileColor, gapColor, gapMask);
    }

    // Alpha always comes from the pixel's own unmodified home position,
    // matching filter/stipple's precedent - true in the gapFill/unaltered
    // path too, since it already samples srcHome for its color.
    return vec4<f32>(result, srcHome.a);
}
`}},o=`# mosaicTiles

Wavy grouted ceramic tiles with beveled relief, or pixelized squares sampled from randomly offset sources with gap fill (Mosaic Tiles, Tiles)

## Description

Covers two filters via \`mode\`. **mosaic** warps a square
tileSize grid with value noise into wavy ceramic tiles: each tile is
pixelized to one representative sample from its own image region, separated by
grout that is darkened and beveled with directional relief shading
(fixed 135-degree light) on the grout walls. **shifted** keeps a
regular, unwarped square grid; each tile is pixelized to one representative
color sampled from a randomly shifted source position (a per-cell random
offset up to maxOffset% of a tile width), leaving a
small fixed gap between tiles that is filled with backgroundColor, the
inverse of the tile's own home pixel, or the unaltered home pixel, per
\`gapFill\`.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | 0 | mosaic:0, shifted:1 | mosaic: wavy warped-grid ceramic tiles with beveled grout. shifted: regular pixelized tiles sampled from shifted source positions with gaps between them |
| tileSize | float | 32 | 4-128 | Tile/cell size in pixels |
| groutWidth | float | 12 | 0-100 | mosaic-only control; grout band half-width as a percent of tileSize/2. The same uniform also sets shifted mode's fixed inter-tile gap width (percent of tileSize) for visual consistency between the two modes, but its control is only shown in mosaic mode - see Notes |
| relief | float | 40 | 0-100 | mosaic-only; strength of the beveled 3D relief shading on the grout walls - 0 leaves the grout flat and darkened only, higher values increase the light/dark bevel band |
| maxOffset | float | 25 | 0-100 | shifted-only; maximum random source-position offset per tile, as a percent of tile width |
| gapFill | int | 0 | background:0, inverse:1, unaltered:2 | shifted-only; how the gap between shifted tiles is filled - a solid backgroundColor, the color inverse of the tile's own home pixel, or the unaltered home pixel |
| backgroundColor | color | [0.1, 0.1, 0.1] | - | shifted-only, gapFill=background only; the gap fill color |
| seed | int | 1 | 1-100 | Randomizes the mosaic warp pattern and the shifted per-tile offsets without changing their statistics |

## Notes

- Single pass, evaluated on global (tile-aware) pixel coordinates so the grid, warp, and per-cell hashes are continuous across CLI render tiles.
- mosaic's wavy borders come from perturbing the grid-space coordinate with value noise before the floor/fract cell assignment, so neighboring pixels straddling a nominal border pick up slightly different offsets and bend the actual quantized boundary between them.
- mosaic assigns one representative source sample to every pixel in a warped tile, producing a genuinely pixelized tile face while keeping the source lookup inside that tile's image region.
- groutWidth is a single value reused by both modes rather than adding a second gap-width param: mosaic reads it as the grout band's half-width, shifted reads it as the fixed inter-tile gap width. Only mosaic exposes a control for it, since shifted's gap is meant to read as a small fixed structural constant - switch to mosaic mode to change it, then switch back.
- shifted derives one source sample from the tile center plus a per-cell offset, so every tile face is genuinely pixelized rather than showing the continuous input beneath a grid.
- Alpha always comes from the pixel's own unmodified home position.
- Covers wavy ceramic mosaic tiles and pixelized shifted square tiles in one effect.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .mosaicTiles()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(a))t.shaders[n]={...e}}t&&o&&(t.help=o);var f="filter/mosaicTiles",c="filter",h="mosaicTiles",u=t;export{u as default,f as effectId,h as effectName,o as help,c as namespace};
