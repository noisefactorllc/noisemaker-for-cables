/* filter/patchwork */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Patchwork",namespace:"filter",func:"patchwork",tags:["pixel","edges","artist"],description:"Needlepoint grid of solid-color squares raised by luminance with lit bevel edges (Patchwork)",globals:{squareSize:{type:"float",default:16,uniform:"squareSize",min:4,max:64,ui:{label:"square size",control:"slider"}},relief:{type:"float",default:50,uniform:"relief",min:0,max:100,ui:{label:"relief",control:"slider"}},lightAngle:{type:"float",default:135,uniform:"lightAngle",min:-180,max:180,ui:{label:"light angle",control:"slider"}}},passes:[{name:"render",program:"patchwork",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={patchwork:{glsl:`/*
 * Patchwork - needlepoint grid of solid-color squares raised by luminance
 * with lit bevel edges.
 *
 * GRID: cells are squareSize-px squares in GLOBAL (tile-aware) pixel
 * coordinates, anchored at the IMAGE CENTER
 * (cellIdxF = floor((globalCoord - imgCenter) / squareSize)), NOT at the
 * coordinate origin. This is filter/extrude's proven fix for a real
 * cross-backend bug: an origin-anchored grid lands its cell boundaries
 * (fullResolution mod squareSize) pixels apart between GLSL and WGSL
 * whenever the image dimension is not an exact multiple of squareSize
 * (see extrude.glsl's header for the empirical proof - an 11.4%
 * cross-backend pixel mismatch was measured before that fix). A
 * center-anchored grid is mirror-symmetric about the image center, so
 * both backends land on the identical grid regardless of resolution.
 *
 * CELL COLOR / HEIGHT: each cell is SOLID - one color per cell, sampled
 * with a 3x3 mini-blur at the cell's own center (filter/extrude's
 * cellAvgColor3x3 precedent: 9 taps spaced at squareSize*0.25 px, so the
 * full sample footprint stays inside the cell's own bounds, never
 * leaking into a neighbor). Height h = lum(cellColor) (luminance).
 *
 * TOP FACE: every pixel (interior AND rim) is shaded by its OWN cell's
 * height alone: topFaceShade = 0.9 + 0.2*(h-0.5), i.e. brighter cells
 * read very slightly brighter (range [0.8, 1.0] for h in [0,1]) - the
 * flat "fabric" shading of the square's face. The rim never blends in
 * the neighbor's actual color, only modulates brightness (see BEVEL RIM).
 *
 * BEVEL RIM: the outer 15% of each cell (rimPx = 0.15*squareSize, on
 * EVERY side) is additionally beveled. A rim pixel's nearest edge (min of
 * the 4 distances-to-edge, in cell-local px) picks ONE neighbor cell
 * (left/right/top/bottom - exact ties, a measure-zero case only possible
 * exactly on a corner diagonal, resolve to a fixed priority order via the
 * if/else-if chain below, which both backends evaluate identically) and
 * a matching axis-aligned unit edgeNormal: left=(-1,0), right=(1,0),
 * bottom=(0,-1), top=(0,1).
 *
 * This is a deliberately different construction from filter/relief's reliefShade
 * (used by filter/craquelure and filter/mosaicTiles): relief shading differentiates a
 * CONTINUOUS height field to get a local gradient/normal, but patchwork's
 * height field is a piecewise-CONSTANT step function - every within-cell
 * neighbor sample (e.g. gc+-1px, the usual central-difference taps)
 * returns the SAME cell's height until you cross clear into the next
 * cell, so a 1-2px finite-difference gradient is either exactly zero (not
 * at a cell boundary) or an undersized step (right at one) - it cannot
 * represent "this whole 15%-wide rim band bevels toward cell X's TRUE
 * total height difference". Instead the bevel is built directly and
 * analytically from the CELL-TO-CELL height difference and the light
 * angle:
 *
 *   dh = h(this) - h(neighbor)
 *   a = radians(lightAngle); lightDir = vec2(cos(a), sin(a))  (already
 *       unit length: cos^2+sin^2=1, so no normalize() needed)
 *   signTerm = dot(edgeNormal, lightDir)                       in [-1,1]
 *   bevelMul = 1 + 0.35*(relief/100) * sign(dh) * signTerm
 *
 * POLARITY DERIVATION (raised cells - opposite of craquelure's carved
 * groove): treat h as an actual
 * height field and use the standard height-field normal convention
 * normal = normalize(-dh/dx, -dh/dy, 1) (relief shading uses this same convention).
 * A rim band physically ramps from the NEIGHBOR's height at the cell
 * border to THIS cell's own height at the rim's inner edge (where it
 * meets the flat top face). Take the left rim (edgeNormal=(-1,0),
 * border at local x=0, inner rim boundary at local x=rimPx) with
 * dh = h(this)-h(neighbor) > 0 (this cell raised relative to its left
 * neighbor): height rises from h(neighbor) at x=0 to h(this) at
 * x=rimPx, i.e. dh/dx > 0 over the band, so normal.x = -dh/dx < 0 - the
 * bevel face leans toward -x, i.e. it aligns with edgeNormal=(-1,0)
 * itself. Redo with dh < 0 (this cell LOWER than its left neighbor): the
 * band now falls from x=0 to x=rimPx, dh/dx < 0, normal.x > 0 - the face
 * leans toward +x, i.e. it aligns with -edgeNormal. Both cases combine to
 * "bevel-face direction = edgeNormal * sign(dh)", so
 * dot(edgeNormal, lightDir) * sign(dh) is exactly the Lambertian-style
 * facing term for that leaning face - the formula above.
 *
 * Raised-face polarity check: a square lit from upper-left has its
 * top/left bevel faces bright and
 * bottom/right faces dark"): at lightAngle=135, lightDir =
 * (cos135,sin135) = (-0.707,+0.707) (screen-up convention - see
 * ORIENTATION below). For a cell raised relative to ALL 4 neighbors
 * (dh>0 on every side, e.g. a locally-brightest cell): left
 * signTerm = dot((-1,0),lightDir) = +0.707 -> LIT; top
 * signTerm = dot((0,1),lightDir) = +0.707 -> LIT; right
 * signTerm = dot((1,0),lightDir) = -0.707 -> DARK; bottom
 * signTerm = dot((0,-1),lightDir) = -0.707 -> DARK. Top/left bright,
 * bottom/right dark. This is the OPPOSITE sign
 * convention from filter/craquelure's carved groove, which negates its
 * height (hC=-kC) before its own relief shading-routed shading specifically because
 * a groove is a dip, not a bump; patchwork's h is fed in DIRECTLY (never
 * negated) because cells are raised, not carved - the one sign flip
 * between the two effects is entirely that h-vs-(-h) choice, not any
 * difference in the light/normal machinery itself.
 *
 * INVARIANCES (true by construction, not just by testing):
 *   - relief=0: bevelMul = 1 + 0.35*0*(...) = 1.0 EXACTLY on every rim
 *     pixel, so the rim is indistinguishable from the interior (flat
 *     patchwork, no bevel).
 *   - Uniform source (flat ground): every cell's 3x3-blurred color is the
 *     same texel value, so h and hNeighbor are bit-identical floats and
 *     dh = h - hNeighbor = 0.0 exactly; GLSL's sign(0.0) = 0.0 by spec
 *     (not +-1), so bevelMul = 1.0 EXACTLY regardless of relief or
 *     lightAngle. No extra gating mask is needed here (contrast
 *     filter/craquelure's fix, which needed a wallMask gate because ITS
 *     relief shading-routed flat baseline is 0.6, not 0 - patchwork's bespoke formula
 *     is zero-centered by construction).
 *
 * ORIENTATION: edgeNormal/localPx/cellIdxF/imgCenter are all
 * POSITION-DERIVED (built from gl_FragCoord.xy/pos.xy). These use NO
 * manual Y compensation; the WebGPU present-time flip cancels the raw
 * Y-convention difference automatically, exactly like filter/extrude's
 * imgCenter anchoring and filter/spinBlur/pondRipples' offsets. lightDir
 * is a pure function of the lightAngle UNIFORM (not position-derived at
 * all), so it is textually IDENTICAL between GLSL and WGSL, matching
 * filter/relief's rlShade.glsl precedent (independently verified on
 * screen on both backends: lightAngle=135 reads upper-left,
 * lightAngle=-45 flips it to lower-right) - the same cos/sin(lightAngle)
 * construction is reused here without extra orientation compensation.
 *
 * ALPHA: sampled from the pixel's own (non-cell-averaged) position,
 * matching filter/mosaicTiles' srcHome / filter/craquelure's src
 * precedent.
 *
 * Single pass, no hash/noise anywhere - a deterministic integer grid, per
 * the algorithm (no hash, value noise, or Voronoi field needed).
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float squareSize;
uniform float relief;
uniform float lightAngle;

out vec4 fragColor;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// globalPixelPos is in GLOBAL pixel space; converts to a tile-local
// sample UV, clamped so the 3x3 mini-blur and neighbor-cell samples never
// read past this tile's own coverage.
vec2 toSampleUV(vec2 globalPixelPos) {
    return clamp((globalPixelPos - tileOffset) / resolution, 0.0, 1.0);
}

// 3x3 mini-blur centered on a cell (filter/extrude's cellAvgColor3x3
// precedent): spaced at squareSize*0.25 so the full sample footprint
// (squareSize*0.5 wide) stays inside the cell's own bounds.
vec4 cellAvgColor3x3(vec2 centerPx) {
    float sp = squareSize * 0.25;
    vec4 sum = vec4(0.0);
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 p = centerPx + vec2(float(i), float(j)) * sp;
            sum += texture(inputTex, toSampleUV(p));
        }
    }
    return sum * (1.0 / 9.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 srcOwn = texture(inputTex, uv);

    // Center-anchored grid - see header for why.
    vec2 imgCenter = fullResolution * 0.5;
    vec2 relPx = globalCoord - imgCenter;
    vec2 cellIdxF = floor(relPx / squareSize);
    vec2 localPx = relPx - cellIdxF * squareSize;
    vec2 cellCenter = imgCenter + (cellIdxF + 0.5) * squareSize;

    vec3 cellColor = cellAvgColor3x3(cellCenter).rgb;
    float h = lum(cellColor);
    float topFaceShade = 0.9 + 0.2 * (h - 0.5);

    // Distance (px) from this rim pixel to each of the cell's 4 edges.
    float rimPx = 0.15 * squareSize;
    float dLeft = localPx.x;
    float dRight = squareSize - localPx.x;
    float dBottom = localPx.y;
    float dTop = squareSize - localPx.y;
    float dMin = min(min(dLeft, dRight), min(dBottom, dTop));

    float bevelMul = 1.0;
    if (dMin < rimPx) {
        vec2 neighborIdx = cellIdxF;
        vec2 edgeNormal;
        if (dMin == dLeft) {
            neighborIdx.x -= 1.0;
            edgeNormal = vec2(-1.0, 0.0);
        } else if (dMin == dRight) {
            neighborIdx.x += 1.0;
            edgeNormal = vec2(1.0, 0.0);
        } else if (dMin == dBottom) {
            neighborIdx.y -= 1.0;
            edgeNormal = vec2(0.0, -1.0);
        } else {
            neighborIdx.y += 1.0;
            edgeNormal = vec2(0.0, 1.0);
        }

        vec2 neighborCenter = imgCenter + (neighborIdx + 0.5) * squareSize;
        float hNeighbor = lum(cellAvgColor3x3(neighborCenter).rgb);
        float dh = h - hNeighbor;

        float a = radians(lightAngle);
        vec2 lightDir = vec2(cos(a), sin(a));
        float signTerm = dot(edgeNormal, lightDir);

        // See POLARITY DERIVATION above.
        bevelMul = 1.0 + 0.35 * (relief / 100.0) * sign(dh) * signTerm;
    }

    vec3 result = clamp(cellColor * topFaceShade * bevelMul, 0.0, 1.0);
    fragColor = vec4(result, srcOwn.a);
}
`,wgsl:`/*
 * Patchwork - needlepoint grid of solid-color squares raised by luminance
 * with lit bevel edges. See patchwork.glsl for the full algorithm
 * derivation (center-anchored grid, 3x3 mini-blur cell color, top-face
 * shading, the analytic per-side bevel construction, and the raised-vs-
 * carved polarity check against filter/craquelure); this is a 1:1 port.
 *
 * tileOffset converts the tile-local fragment position to global
 * procedural coordinates, matching GLSL's \`gl_FragCoord.xy + tileOffset\`:
 * globalCoord anchors the center-anchored grid (relPx/cellIdxF/
 * cellCenter) in full-image space, and toSampleUV subtracts tileOffset
 * back off before dividing by the tile-local texSize, so the 3x3
 * mini-blur and neighbor-cell samples land on the correct texel
 * regardless of which tile is being rendered - matching
 * filter/mosaicTiles' and filter/halftone's WGSL precedent. fullResolution
 * (guarded the same way as filter/texture's globalDims: falls back to
 * texSize when unset) gives imgCenter the TRUE full-image center rather
 * than this tile's own center, so the grid stays continuous across CLI
 * tiles. Both uniforms are zero/unset for ordinary full-frame renders,
 * where tileOffset=(0,0) and fullResolution=texSize reduce every
 * expression below to the previous non-tiling form exactly.
 *
 * cellIdxF/localPx/edgeNormal/imgCenter are all POSITION-DERIVED (built
 * from globalCoord = pos.xy + tileOffset) and ported with NO manual Y
 * compensation, exactly like filter/extrude's center-anchored imgCenter
 * (see extrude.wgsl's header:
 * "No centerY-style flip is needed for the image center itself... same
 * reasoning as pondRipples' fixed center") - the WebGPU present-time flip
 * cancels the raw Y-convention difference for position-derived geometry
 * automatically. lightDir is a plain function of the lightAngle uniform,
 * not fragment-coordinate-derived at all, so it is textually identical to
 * the GLSL, matching filter/relief's rlShade.wgsl
 * and filter/craquelure's WGSL light-vector precedent.
 *
 * cellAvgColor3x3 uses textureSampleLevel (explicit LOD 0), not
 * textureSample: it is called from inside main()'s \`dMin < rimPx\`
 * branch, whose condition is genuinely per-fragment data (non-uniform
 * control flow) - the same reasoning as filter/extrude's
 * cellAvgColor3x3.wgsl comment. inputTex is a non-mipmapped
 * render-target-style texture, so LOD 0 is exactly GLSL's texture() here.
 */

struct Uniforms {
    squareSize: f32,
    relief: f32,
    lightAngle: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn toSampleUV(globalPixelPos: vec2<f32>, texSize: vec2<f32>) -> vec2<f32> {
    return clamp((globalPixelPos - uniforms.tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
}

// 3x3 mini-blur centered on a cell - see patchwork.glsl's cellAvgColor3x3.
fn cellAvgColor3x3(centerPx: vec2<f32>, texSize: vec2<f32>) -> vec4<f32> {
    let sp = uniforms.squareSize * 0.25;
    var sum = vec4<f32>(0.0);
    for (var j = -1; j <= 1; j++) {
        for (var i = -1; i <= 1; i++) {
            let p = centerPx + vec2<f32>(f32(i), f32(j)) * sp;
            sum = sum + textureSampleLevel(inputTex, inputSampler, toSampleUV(p, texSize), 0.0);
        }
    }
    return sum * (1.0 / 9.0);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = pos.xy / texSize;
    let srcOwn = textureSample(inputTex, inputSampler, uv);

    // Center-anchored grid - see patchwork.glsl's header for why.
    let imgCenter = fullDims * 0.5;
    let relPx = globalCoord - imgCenter;
    let cellIdxF = floor(relPx / uniforms.squareSize);
    let localPx = relPx - cellIdxF * uniforms.squareSize;
    let cellCenter = imgCenter + (cellIdxF + 0.5) * uniforms.squareSize;

    let cellColor = cellAvgColor3x3(cellCenter, texSize).rgb;
    let h = lum(cellColor);
    let topFaceShade = 0.9 + 0.2 * (h - 0.5);

    // Distance (px) from this rim pixel to each of the cell's 4 edges.
    let rimPx = 0.15 * uniforms.squareSize;
    let dLeft = localPx.x;
    let dRight = uniforms.squareSize - localPx.x;
    let dBottom = localPx.y;
    let dTop = uniforms.squareSize - localPx.y;
    let dMin = min(min(dLeft, dRight), min(dBottom, dTop));

    var bevelMul = 1.0;
    if (dMin < rimPx) {
        var neighborIdx = cellIdxF;
        var edgeNormal: vec2<f32>;
        if (dMin == dLeft) {
            neighborIdx.x = neighborIdx.x - 1.0;
            edgeNormal = vec2<f32>(-1.0, 0.0);
        } else if (dMin == dRight) {
            neighborIdx.x = neighborIdx.x + 1.0;
            edgeNormal = vec2<f32>(1.0, 0.0);
        } else if (dMin == dBottom) {
            neighborIdx.y = neighborIdx.y - 1.0;
            edgeNormal = vec2<f32>(0.0, -1.0);
        } else {
            neighborIdx.y = neighborIdx.y + 1.0;
            edgeNormal = vec2<f32>(0.0, 1.0);
        }

        let neighborCenter = imgCenter + (neighborIdx + 0.5) * uniforms.squareSize;
        let hNeighbor = lum(cellAvgColor3x3(neighborCenter, texSize).rgb);
        let dh = h - hNeighbor;

        let a = radians(uniforms.lightAngle);
        let lightDir = vec2<f32>(cos(a), sin(a));
        let signTerm = dot(edgeNormal, lightDir);

        // See patchwork.glsl's POLARITY DERIVATION.
        bevelMul = 1.0 + 0.35 * (uniforms.relief / 100.0) * sign(dh) * signTerm;
    }

    let result = clamp(cellColor * topFaceShade * bevelMul, vec3<f32>(0.0), vec3<f32>(1.0));
    return vec4<f32>(result, srcOwn.a);
}
`}},l=`# patchwork

Needlepoint grid of solid-color squares raised by luminance with lit bevel edges (Patchwork)

## Description

The image is broken into a grid of solid-color squares - each cell samples
a single color (a small 3x3 blur at the cell's own center) and derives a
height from that color's luminance. Every cell's face is shaded slightly
by its own height, and the outer rim of each cell is beveled: edges next
to a shorter neighbor catch light and edges next to a taller neighbor sit
in shadow, following a fixed directional light. The result reads as a
needlepoint or patchwork-quilt grid of raised, lit tiles.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| squareSize | float | 16 | 4-64 | Grid cell size in pixels - larger values produce fewer, larger patches |
| relief | float | 50 | 0-100 | Bevel contrast on cell edges - 0 is a flat grid with no bevel, 100 is maximum 3D relief |
| lightAngle | float | 135 | -180-180 | Simulated light direction in degrees (135 = upper-left) - controls which cell edges read as lit vs. shadowed |

## Notes

- Single pass, evaluated on global (tile-aware), center-anchored pixel coordinates so the grid is continuous across CLI render tiles and identical between backends regardless of image resolution.
- Cells are perfectly solid colors; only the outer 15% rim of each cell is beveled, using the height difference against whichever neighbor cell that rim edge borders.
- At \`relief\` = 0 the bevel has no effect (flat, evenly-shaded squares); at \`relief\` = 100 raised cells show strong lit/shadowed edges.
- Produces a needlepoint or patchwork-quilt grid of raised, lit tiles.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .patchwork()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&l&&(n.help=l);var d="filter/patchwork",h="filter",f="patchwork",u=n;export{u as default,d as effectId,f as effectName,l as help,h as namespace};
