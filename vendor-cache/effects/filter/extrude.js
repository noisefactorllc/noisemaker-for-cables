/* filter/extrude */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Extrude",namespace:"filter",func:"extrude",tags:["distort","geometric","artist"],description:"Break the image into 3D blocks or pyramids projecting toward the viewer (Extrude)",globals:{type:{type:"int",default:0,define:"EXTRUDE_TYPE",choices:{blocks:0,pyramids:1},ui:{label:"type",control:"dropdown"}},size:{type:"float",default:24,uniform:"size",min:4,max:128,ui:{label:"size",control:"slider"}},depth:{type:"float",default:30,uniform:"depth",min:0,max:100,zero:0,ui:{label:"depth",control:"slider"}},depthSource:{type:"int",default:0,define:"DEPTH_SOURCE",choices:{luminance:0,random:1},ui:{label:"depth source",control:"dropdown"}},solidFront:{type:"boolean",default:!0,uniform:"solidFront",ui:{label:"solid front faces",control:"checkbox"}}},passes:[{name:"render",program:"extrude",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={extrude:{glsl:`/*
 * Extrude - classic block/pyramid extrusion toward the viewer.
 *
 * The image is divided into a \`size\`x\`size\`-pixel grid using tile-aware
 * GLOBAL pixel coordinates (gl_FragCoord + tileOffset), so the grid is
 * stable across CLI tile boundaries. The grid is ANCHORED AT THE IMAGE
 * CENTER (cell index = floor((pos - imgCenter)/size)), not at the
 * framebuffer origin: GLSL's origin is the bottom-left corner while
 * WGSL's is the top-left, so an origin-anchored grid lands its
 * horizontal boundaries (fullResolution.y mod size) pixels apart between
 * the two backends whenever the height is not an exact multiple of size
 * (proven empirically: an 11.4% cross-backend pixel mismatch at
 * 1024px/size=24, with mismatched pixels differing by exactly the ratio
 * of two SHADE_* constants - the same pixel classifying onto
 * differently-shaded faces). A center-anchored grid is mirror-symmetric
 * about the image center, so both backends see the identical visual
 * grid - and it is also the natural anchor for an effect whose entire
 * geometry radiates from the image center. Each cell has a height h in
 * [0,1]: depthSource luminance uses a small 3x3 average sample at the
 * cell center (luminance luminance of that average); depthSource
 * random uses hash12(cellId), where cellId is the GLOBAL center-relative
 * cell index, so the hash is identical for a given cell regardless of
 * which tile is rendering it - tile-aware by construction. (The WGSL
 * port hashes the same index unchanged: in this runtime both backends'
 * fragment positions are content-Y-up, so the center-anchored cell
 * indices already coincide cross-backend - see extrude.wgsl's header.)
 *
 * Each cell's height maps to a scale factor s = 1 + h*(depth/100)*0.4
 * (s in [1, 1.4] at depth=100).
 *
 * blocks: the cell's square footprint, scaled by s ABOUT THE IMAGE
 * CENTER, is its projected top face - both the offset from center and
 * the face's own half-size grow by s, so taller cells both shift outward
 * AND enlarge: the classic "leaning toward the viewer, more so near the
 * frame edges" perspective-from-center look.
 *
 * pyramids: only the apex point (cell center scaled by s about the image
 * center) projects; the 4 side faces are triangles fanned from the
 * ORIGINAL (unscaled) footprint's 4 corners to that single projected
 * apex point.
 *
 * OCCLUSION ORDERING (why we walk toward the center, and why "top beats
 * side, else highest s wins"):
 *
 * Scaling a footprint about the image center by s>=1 only ever moves it
 * AWAY from the center. So the only cells whose PROJECTED face can ever
 * reach a given pixel P are: P's own cell, and cells strictly closer to
 * the image center than P (their scaled face can stretch out far enough
 * to cover P; cells farther out than P geometrically cannot reach back
 * in - their faces only move further away from P). We walk from P's own
 * cell toward the center, one cell-width at a time, for up to 6 steps
 * (bounded), and test each candidate.
 *
 * A cell's UN-scaled footprint can only ever contain pixels literally
 * inside that one cell (cells tile the plane without overlap), so a
 * "side-band" hit (pixel inside a cell's original footprint but outside
 * that SAME cell's scaled top face) can only ever occur for the walk's
 * distance-0 candidate (P's own cell) - every other candidate can only
 * ever contribute a top-face hit. Physically, any point on any block's
 * flat top face sits nearer the viewer (full extrusion height) than any
 * point on any side wall (which ramps from the footprint back up to the
 * top), so ties are broken: any top-face hit beats any side-band hit;
 * among top-face hits, the highest s (tallest / nearest the viewer)
 * wins, matching "nearer blocks occlude farther ones". Implemented as
 * one scalar priority = s + (isTop ? 1000.0 : 0.0), kept as a running
 * max while walking candidates - this naturally implements "test in
 * order of decreasing effective s, nearest-to-viewer wins" without an
 * explicit sort, since every candidate's priority is compared against
 * the running best so far.
 *
 * pyramids have no flat top tier (the apex is a single point), so every
 * hit is a "side" (slant-face) hit and priority is s alone.
 *
 * FACE COLOR / SHADING:
 * - blocks top face: solidFront ? cell-mean color : image resampled at
 *   the un-projected position (inverse of the "scale about center by s"
 *   map: localPos = imgCenter + (P-imgCenter)/s) - a "window" onto the
 *   original picture, unshaded (it is the flat, viewer-facing cap).
 * - blocks side band: ALWAYS the cell-mean color (never maps
 *   image content onto a block's side walls, solidFront or not), times a
 *   per-side facing shade from a fixed simulated light (see SHADE_*
 *   below), chosen by whichever of left/right/top/bottom the pixel sits
 *   nearest to (simple |dx| vs |dy| quadrant split around the cell
 *   center).
 * - pyramids: every visible pixel is on one of the 4 slant faces, so
 *   solidFront toggles the same base (mean color vs. the barycentric
 *   un-projection of the winning triangle back onto the original
 *   corner+corner+cell-center triangle - apex unprojects to the cell
 *   center, since apex = cellCenter*s), and the facing shade is ALWAYS
 *   applied on top: mix(1.0, sideShadeConstant, apexBarycentricWeight) -
 *   full brightness at the (undisplaced) base edge, fading to the face's
 *   characteristic shade at the tip. This is barycentric-like side
 *   shading. solidFront applies the same way, so it
 *   is the identical mean-vs-image toggle as blocks, just applied to a
 *   surface that is always shaded (pyramids have no unshaded flat cap).
 *
 * SHADE_* constants: simulated light from angle 150 degrees (standard
 * math convention: 0=+X/right, 90=+Y/up - i.e. mostly from the left,
 * slightly above), facing = dot(sideNormal, lightDir)*0.5+0.5, shade =
 * 0.55 + 0.45*facing. Precomputed here (GLSL
 * has no constant-expression sin/cos): left=0.969856 (brightest),
 * top=0.8875, bottom=0.6625, right=0.580144 (darkest) - four clearly
 * distinct facets, chosen over a symmetric 45/135-degree light so all
 * four sides read as visually different (the acceptance bar).
 *
 * Y ORIENTATION: GLSL and WGSL share a single TOP_SIGN constant,
 * verified only as mutually consistent between the two backends -
 * bit-exact cross-backend parity, nothing more. This algorithm is
 * flip-symmetric (center-anchored grid; a global Y-mirror is a
 * self-consistent relabeling), so that parity CANNOT determine the
 * absolute orientation: which way is visually "up" for the side
 * shading was never independently verified, and it is cosmetically
 * irrelevant here - left/right facets are unaffected, and a global
 * flip would swap top/bottom facet shading only. Effects with
 * genuinely Y-asymmetric semantics must NOT inherit an orientation
 * claim from this file; they need their own discriminating test (see
 * spinBlur's centerY fix for the pattern).
 *
 * ZERO-GUARD NOTE (depth=0): s=1 for every cell regardless of height, so
 * blocks' top face exactly reproduces the original footprint - every
 * pixel is a topHit on its own cell. With solidFront=false this is a
 * bit-exact passthrough (localPos = P exactly, s=1). With the SHIPPED
 * DEFAULT solidFront=true, depth=0 is NOT a passthrough - it settles
 * into flat per-cell mean-color posterization (Mosaic-alike), which is
 * the documented, intended resting state of this effect at its defaults,
 * not a bug. pyramids at depth=0 similarly degenerate to apex =
 * cellCenter, which splits every cell into 4 exact quarter-triangles
 * (the classic "connect center to all 4 corners" square decomposition) -
 * so even at depth=0, solidFront=true pyramids show a faceted radial-
 * gradient pattern per cell (never flat), because pyramids have no
 * flat-top tier at any depth. Both are intentional, documented per-mode
 * zero states, not passthroughs.
 */

#ifdef GL_ES
precision highp float;
#endif

// EXTRUDE_TYPE is a compile-time define injected by the runtime (see
// definition.js \`globals.type.define\`). blocks and pyramids use fully
// distinct hit-test and shading code, so baking the selector lets the
// compiler drop the unused variant entirely instead of branching on it
// per pixel.
#ifndef EXTRUDE_TYPE
#define EXTRUDE_TYPE 0
#endif

// DEPTH_SOURCE is a compile-time define injected by the runtime (see
// definition.js \`globals.depthSource.define\`). luminance samples a 3x3
// texture average per candidate cell inside the occlusion-walk loop;
// random only hashes the cell index. Baking the selector lets the
// random variant skip all texture sampling in that loop.
#ifndef DEPTH_SOURCE
#define DEPTH_SOURCE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float size;
uniform float depth;
uniform bool solidFront;

out vec4 fragColor;

// See "Y ORIENTATION" above.
const float TOP_SIGN = 1.0;

// See "SHADE_* constants" above.
const float SHADE_TOP = 0.8875;
const float SHADE_BOTTOM = 0.6625;
const float SHADE_LEFT = 0.969856;
const float SHADE_RIGHT = 0.580144;

const float EPS = 1e-4;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// globalPixelPos is in GLOBAL pixel space; converts to a tile-local
// sample UV, clamped so wrap/edge cases never sample past this tile.
vec2 toSampleUV(vec2 globalPixelPos) {
    return clamp((globalPixelPos - tileOffset) / resolution, 0.0, 1.0);
}

// Small 3x3 average centered on a cell, spaced at size*0.25 so the full
// sample footprint (size*0.5 wide) stays inside the cell's own bounds.
vec4 cellAvgColor3x3(vec2 centerPx) {
    float sp = size * 0.25;
    vec4 sum = vec4(0.0);
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 p = centerPx + vec2(float(i), float(j)) * sp;
            sum += texture(inputTex, toSampleUV(p));
        }
    }
    return sum * (1.0 / 9.0);
}

float cellHeight(vec2 cellC, vec2 cellIdxF) {
#if DEPTH_SOURCE==1
    return hash12(cellIdxF);
#else
    return lum(cellAvgColor3x3(cellC).rgb);
#endif
}

// Barycentric coords of p in triangle (a,b,c); w (.z) corresponds to c.
// Returns a component < -1.0 (impossible for a real barycentric coord)
// when the triangle is degenerate, so callers can treat it as a miss
// with the same ">= -EPS" containment test used for real triangles.
vec3 baryWeights(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 v0 = b - a;
    vec2 v1 = c - a;
    vec2 v2 = p - a;
    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    float d21 = dot(v2, v1);
    float denom = d00 * d11 - d01 * d01;
    if (abs(denom) < 1e-8) {
        return vec3(-2.0);
    }
    float v = (d11 * d20 - d01 * d21) / denom;
    float w = (d00 * d21 - d01 * d20) / denom;
    float u = 1.0 - v - w;
    return vec3(u, v, w);
}

// -1 if P misses all 4 faces; else 0=bottom,1=right,2=top,3=left (fixed
// per-triangle identity, independent of where apex actually projects to
// - see header's FACE COLOR / SHADING note).
int pyramidTriHit(vec2 P, vec2 cellC, vec2 apex, vec2 halfCell) {
    vec2 topC = cellC + TOP_SIGN * vec2(0.0, halfCell.y);
    vec2 botC = cellC - TOP_SIGN * vec2(0.0, halfCell.y);
    float leftX = cellC.x - halfCell.x;
    float rightX = cellC.x + halfCell.x;
    vec2 Cbl = vec2(leftX, botC.y);
    vec2 Cbr = vec2(rightX, botC.y);
    vec2 Ctr = vec2(rightX, topC.y);
    vec2 Ctl = vec2(leftX, topC.y);

    vec3 bc = baryWeights(P, Cbl, Cbr, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 0; }
    bc = baryWeights(P, Cbr, Ctr, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 1; }
    bc = baryWeights(P, Ctr, Ctl, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 2; }
    bc = baryWeights(P, Ctl, Cbl, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 3; }
    return -1;
}

// Which side of the cell (relative to its center) a footprint pixel is
// nearest to - a simple X-pattern quadrant split.
float sideShade(vec2 P, vec2 cellC) {
    vec2 d = P - cellC;
    float dyUp = d.y * TOP_SIGN;
    if (abs(d.x) > abs(dyUp)) {
        return (d.x > 0.0) ? SHADE_RIGHT : SHADE_LEFT;
    }
    return (dyUp > 0.0) ? SHADE_TOP : SHADE_BOTTOM;
}

void main() {
    vec2 P = gl_FragCoord.xy + tileOffset;
    vec2 imgCenter = fullResolution * 0.5;
    vec2 halfCell = vec2(size * 0.5);

    vec2 toCenter = imgCenter - P;
    float distToCenter = length(toCenter);
    vec2 stepDir = (distToCenter > 0.0) ? toCenter / distToCenter : vec2(0.0);

    float bestPriority = -1.0e9;
    vec2 bestCenterPx = vec2(0.0);
    float bestS = 1.0;
    bool bestIsTop = false;
    int bestTri = -1;
    bool found = false;

    for (int i = 0; i < 6; i++) {
        float t = min(float(i) * size, distToCenter);
        vec2 samplePos = P + stepDir * t;
        // Center-anchored grid - see header for why (cross-backend
        // origin-anchoring mismatch).
        vec2 cellIdxF = floor((samplePos - imgCenter) / size);
        vec2 cellC = imgCenter + (cellIdxF + 0.5) * size;

        float h = cellHeight(cellC, cellIdxF);
        float s = 1.0 + h * (depth / 100.0) * 0.4;

#if EXTRUDE_TYPE==1
        // pyramids: priority is s alone (no flat-top tier).
        vec2 apex = imgCenter + (cellC - imgCenter) * s;
        int tri = pyramidTriHit(P, cellC, apex, halfCell);
        if (tri >= 0 && s > bestPriority) {
            bestPriority = s;
            bestCenterPx = cellC;
            bestS = s;
            bestTri = tri;
            found = true;
        }
#else
        // blocks: top face is the footprint scaled by s about the
        // image center; side band is the rest of the un-scaled
        // footprint (only ever true for i==0 - see header).
        vec2 faceCenter = imgCenter + (cellC - imgCenter) * s;
        vec2 faceHalf = halfCell * s;
        bool topHit = all(lessThanEqual(abs(P - faceCenter), faceHalf));
        bool sideHit = (!topHit) && all(lessThanEqual(abs(P - cellC), halfCell));
        if (topHit || sideHit) {
            float priority = s + (topHit ? 1000.0 : 0.0);
            if (priority > bestPriority) {
                bestPriority = priority;
                bestCenterPx = cellC;
                bestS = s;
                bestIsTop = topHit;
                found = true;
            }
        }
#endif

        if (t >= distToCenter) { break; }
    }

    vec4 outColor;
    if (!found) {
        // Safety net: P's own cell should always produce a hit by
        // construction (see header); this only guards float-precision
        // edge cases exactly on a cell boundary, so it never shows up as
        // a visible crack.
        vec2 cellC = imgCenter + (floor((P - imgCenter) / size) + 0.5) * size;
        outColor = cellAvgColor3x3(cellC);
    } else {
#if EXTRUDE_TYPE==1
        vec2 apex = imgCenter + (bestCenterPx - imgCenter) * bestS;
        vec2 topC = bestCenterPx + TOP_SIGN * vec2(0.0, halfCell.y);
        vec2 botC = bestCenterPx - TOP_SIGN * vec2(0.0, halfCell.y);
        float leftX = bestCenterPx.x - halfCell.x;
        float rightX = bestCenterPx.x + halfCell.x;
        vec2 Cbl = vec2(leftX, botC.y);
        vec2 Cbr = vec2(rightX, botC.y);
        vec2 Ctr = vec2(rightX, topC.y);
        vec2 Ctl = vec2(leftX, topC.y);

        vec2 Ci, Ci1;
        float shadeConst;
        if (bestTri == 0) { Ci = Cbl; Ci1 = Cbr; shadeConst = SHADE_BOTTOM; }
        else if (bestTri == 1) { Ci = Cbr; Ci1 = Ctr; shadeConst = SHADE_RIGHT; }
        else if (bestTri == 2) { Ci = Ctr; Ci1 = Ctl; shadeConst = SHADE_TOP; }
        else { Ci = Ctl; Ci1 = Cbl; shadeConst = SHADE_LEFT; }

        vec3 bc = baryWeights(P, Ci, Ci1, apex);
        float apexW = clamp(bc.z, 0.0, 1.0);

        vec4 baseColor;
        if (solidFront) {
            baseColor = cellAvgColor3x3(bestCenterPx);
        } else {
            vec2 localPos = bc.x * Ci + bc.y * Ci1 + bc.z * bestCenterPx;
            baseColor = texture(inputTex, toSampleUV(localPos));
        }
        float shade = mix(1.0, shadeConst, apexW);
        outColor = vec4(baseColor.rgb * shade, baseColor.a);
#else
        if (bestIsTop) {
            if (solidFront) {
                outColor = cellAvgColor3x3(bestCenterPx);
            } else {
                vec2 localPos = imgCenter + (P - imgCenter) / bestS;
                outColor = texture(inputTex, toSampleUV(localPos));
            }
        } else {
            float shade = sideShade(P, bestCenterPx);
            vec4 meanColor = cellAvgColor3x3(bestCenterPx);
            outColor = vec4(meanColor.rgb * shade, meanColor.a);
        }
#endif
    }

    fragColor = outColor;
}
`,wgsl:`/*
 * Extrude - classic block/pyramid extrusion toward the viewer.
 * See extrude.glsl for the full algorithm, occlusion-ordering, and
 * shading derivation - this is a 1:1 port.
 *
 * Tile-aware, mirroring extrude.glsl: P = pos.xy + uniforms.tileOffset is
 * the GLOBAL fragment position (GLSL's gl_FragCoord.xy + tileOffset), and
 * imgCenter = fullResolution*0.5 is the GLOBAL image center (falling back
 * to the local textureDimensions(inputTex) size when fullResolution is
 * unset, i.e. uniforms.fullResolution.x <= 0.0 - matching filter/texture's
 * guard). Every downstream position in this file (cellC, faceCenter,
 * apex, the pyramid corners, localPos, ...) is derived from P and
 * imgCenter, so fixing just those two root values keeps the whole
 * grid/occlusion/apex geometry globally consistent across tile
 * boundaries. toSampleUV converts a GLOBAL position back to a tile-LOCAL
 * sample UV (subtract uniforms.tileOffset, divide by the local
 * textureDimensions(inputTex)) before ever touching inputTex, matching
 * GLSL's toSampleUV(globalPixelPos) = (globalPixelPos - tileOffset) /
 * resolution - inputTex only ever holds this tile's own crop, so every
 * texture read must land back in tile-local space even though the
 * geometry that produced it is computed globally. Default (non-tiled)
 * rendering has uniforms.tileOffset = (0,0) and uniforms.fullResolution
 * == textureDimensions(inputTex), so P and imgCenter reduce to their
 * pre-tiling values exactly (pos.xy and texSize*0.5) - byte-identical
 * output, zero regression by construction. No centerY-style flip is
 * needed for imgCenter itself (fullResolution*0.5 is symmetric
 * regardless of Y convention).
 *
 * TOP_SIGN = 1.0 here, SAME as GLSL: the two backends were verified
 * only as mutually consistent with each other - bit-exact
 * cross-backend parity, nothing more. This algorithm is
 * flip-symmetric (center-anchored grid; a global Y-mirror is a
 * self-consistent relabeling), so that parity CANNOT determine the
 * absolute orientation: which way is visually "up" for the side
 * shading was never independently verified, and it is cosmetically
 * irrelevant here - left/right facets are unaffected, and a global
 * flip would swap top/bottom facet shading only. Effects with
 * genuinely Y-asymmetric semantics must NOT inherit an orientation
 * claim from this file; they need their own discriminating test (see
 * spinBlur's centerY fix for the pattern).
 */

struct Uniforms {
    size: f32,
    depth: f32,
    solidFront: i32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TOP_SIGN: f32 = 1.0;

const SHADE_TOP: f32 = 0.8875;
const SHADE_BOTTOM: f32 = 0.6625;
const SHADE_LEFT: f32 = 0.969856;
const SHADE_RIGHT: f32 = 0.580144;

const EPS: f32 = 1e-4;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn toSampleUV(globalPixelPos: vec2<f32>, texSize: vec2<f32>) -> vec2<f32> {
    return clamp((globalPixelPos - uniforms.tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
}

// Small 3x3 average centered on a cell, spaced at size*0.25 so the full
// sample footprint (size*0.5 wide) stays inside the cell's own bounds.
//
// textureSampleLevel (explicit LOD 0), not textureSample: this function
// is called from the occlusion-walk loop in main(), whose iteration
// count is genuinely per-fragment data-dependent (it breaks at
// \`t >= distToCenter\`, and distToCenter varies with each fragment's own
// position) - non-uniform control flow, which disqualifies plain
// textureSample (it needs implicit derivatives / uniform control flow).
// inputTex is a non-mipmapped render-target-style texture, so LOD 0 is
// exactly GLSL's texture() here. Mirrors synth/remap's WGSL port.
fn cellAvgColor3x3(centerPx: vec2<f32>, texSize: vec2<f32>) -> vec4<f32> {
    let sp = uniforms.size * 0.25;
    var sum = vec4<f32>(0.0);
    for (var j = -1; j <= 1; j++) {
        for (var i = -1; i <= 1; i++) {
            let p = centerPx + vec2<f32>(f32(i), f32(j)) * sp;
            sum = sum + textureSampleLevel(inputTex, inputSampler, toSampleUV(p, texSize), 0.0);
        }
    }
    return sum * (1.0 / 9.0);
}

fn cellHeight(cellC: vec2<f32>, cellIdxF: vec2<f32>, texSize: vec2<f32>) -> f32 {
    if (DEPTH_SOURCE == 1) {
        // Hash the cell index directly - both backends' fragment
        // positions are content-Y-up in this runtime (see header), so
        // the center-anchored cell indices are already identical
        // cross-backend for the same visual cell.
        return hash12(cellIdxF);
    }
    return lum(cellAvgColor3x3(cellC, texSize).rgb);
}

// Barycentric coords of p in triangle (a,b,c); w (.z) corresponds to c.
// Returns a component < -1.0 (impossible for a real barycentric coord)
// when the triangle is degenerate, so callers can treat it as a miss
// with the same ">= -EPS" containment test used for real triangles.
fn baryWeights(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> vec3<f32> {
    let v0 = b - a;
    let v1 = c - a;
    let v2 = p - a;
    let d00 = dot(v0, v0);
    let d01 = dot(v0, v1);
    let d11 = dot(v1, v1);
    let d20 = dot(v2, v0);
    let d21 = dot(v2, v1);
    let denom = d00 * d11 - d01 * d01;
    if (abs(denom) < 1e-8) {
        return vec3<f32>(-2.0);
    }
    let v = (d11 * d20 - d01 * d21) / denom;
    let w = (d00 * d21 - d01 * d20) / denom;
    let u = 1.0 - v - w;
    return vec3<f32>(u, v, w);
}

// -1 if P misses all 4 faces; else 0=bottom,1=right,2=top,3=left (fixed
// per-triangle identity, independent of where apex actually projects to
// - see extrude.glsl's FACE COLOR / SHADING note).
fn pyramidTriHit(P: vec2<f32>, cellC: vec2<f32>, apex: vec2<f32>, halfCell: vec2<f32>) -> i32 {
    let topC = cellC + TOP_SIGN * vec2<f32>(0.0, halfCell.y);
    let botC = cellC - TOP_SIGN * vec2<f32>(0.0, halfCell.y);
    let leftX = cellC.x - halfCell.x;
    let rightX = cellC.x + halfCell.x;
    let Cbl = vec2<f32>(leftX, botC.y);
    let Cbr = vec2<f32>(rightX, botC.y);
    let Ctr = vec2<f32>(rightX, topC.y);
    let Ctl = vec2<f32>(leftX, topC.y);

    var bc = baryWeights(P, Cbl, Cbr, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 0; }
    bc = baryWeights(P, Cbr, Ctr, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 1; }
    bc = baryWeights(P, Ctr, Ctl, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 2; }
    bc = baryWeights(P, Ctl, Cbl, apex);
    if (bc.x >= -EPS && bc.y >= -EPS && bc.z >= -EPS) { return 3; }
    return -1;
}

// Which side of the cell (relative to its center) a footprint pixel is
// nearest to - a simple X-pattern quadrant split.
fn sideShade(P: vec2<f32>, cellC: vec2<f32>) -> f32 {
    let d = P - cellC;
    let dyUp = d.y * TOP_SIGN;
    if (abs(d.x) > abs(dyUp)) {
        return select(SHADE_LEFT, SHADE_RIGHT, d.x > 0.0);
    }
    return select(SHADE_BOTTOM, SHADE_TOP, dyUp > 0.0);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var globalRes: vec2<f32> = texSize;
    if (uniforms.fullResolution.x > 0.0) { globalRes = uniforms.fullResolution; }
    let P = pos.xy + uniforms.tileOffset;
    let imgCenter = globalRes * 0.5;
    let halfCell = vec2<f32>(uniforms.size * 0.5);

    let toCenter = imgCenter - P;
    let distToCenter = length(toCenter);
    var stepDir = vec2<f32>(0.0);
    if (distToCenter > 0.0) {
        stepDir = toCenter / distToCenter;
    }

    var bestPriority: f32 = -1.0e9;
    var bestCenterPx = vec2<f32>(0.0);
    var bestS: f32 = 1.0;
    var bestIsTop = false;
    var bestTri: i32 = -1;
    var found = false;

    for (var i = 0; i < 6; i++) {
        let t = min(f32(i) * uniforms.size, distToCenter);
        let samplePos = P + stepDir * t;
        // Center-anchored grid - see extrude.glsl's header for why
        // (cross-backend origin-anchoring mismatch).
        let cellIdxF = floor((samplePos - imgCenter) / uniforms.size);
        let cellC = imgCenter + (cellIdxF + 0.5) * uniforms.size;

        let h = cellHeight(cellC, cellIdxF, texSize);
        let s = 1.0 + h * (uniforms.depth / 100.0) * 0.4;

        if (EXTRUDE_TYPE == 1) {
            // pyramids: priority is s alone (no flat-top tier).
            let apex = imgCenter + (cellC - imgCenter) * s;
            let tri = pyramidTriHit(P, cellC, apex, halfCell);
            if (tri >= 0 && s > bestPriority) {
                bestPriority = s;
                bestCenterPx = cellC;
                bestS = s;
                bestTri = tri;
                found = true;
            }
        } else {
            // blocks: top face is the footprint scaled by s about the
            // image center; side band is the rest of the un-scaled
            // footprint (only ever true for i==0 - see header).
            let faceCenter = imgCenter + (cellC - imgCenter) * s;
            let faceHalf = halfCell * s;
            let topHit = all(abs(P - faceCenter) <= faceHalf);
            let sideHit = (!topHit) && all(abs(P - cellC) <= halfCell);
            if (topHit || sideHit) {
                let priority = s + select(0.0, 1000.0, topHit);
                if (priority > bestPriority) {
                    bestPriority = priority;
                    bestCenterPx = cellC;
                    bestS = s;
                    bestIsTop = topHit;
                    found = true;
                }
            }
        }

        if (t >= distToCenter) { break; }
    }

    var outColor: vec4<f32>;
    if (!found) {
        // Safety net: P's own cell should always produce a hit by
        // construction (see extrude.glsl header); this only guards
        // float-precision edge cases exactly on a cell boundary, so it
        // never shows up as a visible crack.
        let cellC = imgCenter + (floor((P - imgCenter) / uniforms.size) + 0.5) * uniforms.size;
        outColor = cellAvgColor3x3(cellC, texSize);
    } else if (EXTRUDE_TYPE == 1) {
        let apex = imgCenter + (bestCenterPx - imgCenter) * bestS;
        let topC = bestCenterPx + TOP_SIGN * vec2<f32>(0.0, halfCell.y);
        let botC = bestCenterPx - TOP_SIGN * vec2<f32>(0.0, halfCell.y);
        let leftX = bestCenterPx.x - halfCell.x;
        let rightX = bestCenterPx.x + halfCell.x;
        let Cbl = vec2<f32>(leftX, botC.y);
        let Cbr = vec2<f32>(rightX, botC.y);
        let Ctr = vec2<f32>(rightX, topC.y);
        let Ctl = vec2<f32>(leftX, topC.y);

        var Ci: vec2<f32>;
        var Ci1: vec2<f32>;
        var shadeConst: f32;
        if (bestTri == 0) { Ci = Cbl; Ci1 = Cbr; shadeConst = SHADE_BOTTOM; }
        else if (bestTri == 1) { Ci = Cbr; Ci1 = Ctr; shadeConst = SHADE_RIGHT; }
        else if (bestTri == 2) { Ci = Ctr; Ci1 = Ctl; shadeConst = SHADE_TOP; }
        else { Ci = Ctl; Ci1 = Cbl; shadeConst = SHADE_LEFT; }

        let bc = baryWeights(P, Ci, Ci1, apex);
        let apexW = clamp(bc.z, 0.0, 1.0);

        var baseColor: vec4<f32>;
        if (uniforms.solidFront != 0) {
            baseColor = cellAvgColor3x3(bestCenterPx, texSize);
        } else {
            let localPos = bc.x * Ci + bc.y * Ci1 + bc.z * bestCenterPx;
            // Explicit LOD - see cellAvgColor3x3's comment (same non-uniform-control-flow reasoning).
            baseColor = textureSampleLevel(inputTex, inputSampler, toSampleUV(localPos, texSize), 0.0);
        }
        let shade = mix(1.0, shadeConst, apexW);
        outColor = vec4<f32>(baseColor.rgb * shade, baseColor.a);
    } else if (bestIsTop) {
        if (uniforms.solidFront != 0) {
            outColor = cellAvgColor3x3(bestCenterPx, texSize);
        } else {
            let localPos = imgCenter + (P - imgCenter) / bestS;
            // Explicit LOD - see cellAvgColor3x3's comment (same non-uniform-control-flow reasoning).
            outColor = textureSampleLevel(inputTex, inputSampler, toSampleUV(localPos, texSize), 0.0);
        }
    } else {
        let shade = sideShade(P, bestCenterPx);
        let meanColor = cellAvgColor3x3(bestCenterPx, texSize);
        outColor = vec4<f32>(meanColor.rgb * shade, meanColor.a);
    }

    return outColor;
}
`}},s="# extrude\n\nBreak the image into 3D blocks or pyramids projecting toward the viewer (Extrude)\n\n## Parameters\n\n| Parameter | Type | Default | Range | Description |\n|-----------|------|---------|-------|--------------|\n| type | int | blocks | blocks/pyramids | Block shape: flat-topped rectangular blocks or 4-sided pyramids |\n| size | float | 24 | 4-128 | Grid cell size in pixels |\n| depth | float | 30 | 0-100 | Extrusion strength; 0 collapses every cell's scale factor to 1 (see Notes) |\n| depthSource | int | luminance | luminance/random | Per-cell height: sampled image brightness, or a stable per-cell random value |\n| solidFront | boolean | true | on/off | Front (top / pyramid) faces show the cell's flat mean color instead of the source image |\n\n## Notes\n\nThe image is divided into a `size`x`size` pixel grid, anchored at the image center (the same center the extrusion perspective radiates from). Each cell gets a height `h` in `[0,1]` - either the luminance of a small 3x3 average sample at the cell center (`depthSource: luminance`), or a stable hash of the cell's grid index (`depthSource: random`, unrelated to the image content). Height maps to a scale factor `s = 1 + h*(depth/100)*0.4` (`s` ranges `1..1.4` at `depth: 100`).\n\n**blocks**: each cell's square footprint, scaled by `s` about the fixed image center, becomes its projected top face - both its offset from center and its own size grow with `s`, so taller cells shift outward *and* enlarge, producing a \"leaning toward the viewer\" perspective that is strongest near the frame edges. Between a cell's original footprint and its projected top face is the side band, always flat-shaded with the cell's mean color (never maps image content onto a block's sides).\n\n**pyramids**: only the apex (the cell center, scaled by `s` about the image center) projects; the 4 side faces are triangles fanned from the original footprint's corners to that single apex point. Every visible pixel is on a slanted face, so faces are always shaded (see `solidFront`), fading from full brightness at the (undisplaced) base edge to each face's characteristic shade at the tip.\n\nFor a given pixel, occlusion is resolved by walking from the pixel's own cell toward the image center (up to 6 candidate cells - only cells at or nearer the center can ever project far enough to reach a pixel, since scaling about the center only ever moves a face *outward*). Any top-face hit beats any side-band hit; among same-tier hits, the candidate with the highest `s` (tallest / nearest the viewer) wins.\n\n`solidFront` toggles each face's base color between the cell's flat mean color and the source image resampled at the un-projected position (a \"window\" back onto the original picture, warped by the same scale/fan math used to place the face). Side faces on **blocks** are always the flat mean color regardless of `solidFront`; only the top face changes. On **pyramids**, `solidFront` changes the base color of all 4 faces, which remain shaded either way.\n\n`depth: 0` sets every cell's scale factor to `s = 1`, so blocks' top faces exactly reproduce their own footprint. With `solidFront: false` this is a bit-exact passthrough. With the shipped default `solidFront: true`, `depth: 0` is **not** a passthrough - it settles into flat per-cell mean-color posterization (comparable to a Mosaic filter), which is the intended resting state at defaults, not a bug. Pyramids have no flat-top tier at any depth (the apex degenerates to the exact cell center at `depth: 0`, splitting each cell into 4 equal corner-to-center triangles), so `depthSource: 0` pyramids always show a faceted per-cell gradient, even at `depth: 0`.\n\n## Usage\n\n```\nsearch filter, synth\n\nnoise(seed: 1, ridges: true)\n  .extrude()\n  .write(o0)\n\nrender(o0)\n```\n";if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(o))t.shaders[i]={...e}}t&&s&&(t.help=s);var d="filter/extrude",f="filter",h="extrude",p=t;export{p as default,d as effectId,h as effectName,s as help,f as namespace};
