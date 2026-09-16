/* synth/remap */
var l=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var r=8,i=64,c=10+r*(i/2)+1,p=(()=>{let n={bgColor:{slot:0,components:"xyz"},bgAlpha:{slot:0,components:"w"},zoneCount:{slot:1,components:"x"},smoothEdge:{slot:1,components:"y"},time:{slot:1,components:"w"},resolution:{slot:10+r*(i/2),components:"xy"}};for(let e=0;e<r;e++){let s=2+e;n[`zone${e}_count`]={slot:s,components:"x"},n[`zone${e}_active`]={slot:s,components:"y"},n[`zone${e}_alpha`]={slot:s,components:"w"},n[`zone${e}_bounds`]={slot:c+e,components:"xyzw"};for(let t=0;t<i/2;t++){let o=10+e*(i/2)+t;n[`zone${e}_v${t}`]={slot:o,components:"xyzw"}}}return n})(),h=(()=>{let n={};for(let e=0;e<r;e++)n[`zone${e}_tex`]=`zone${e}_tex`;return n})(),a=new l({name:"Remap",namespace:"synth",func:"remap",tags:["geometric","blend"],description:"Polygon zones routed to engine surfaces (companion to the Remap zone-editor app)",openCategories:["general"],uniformLayout:p,globals:{zoneCount:{type:"int",default:0,uniform:"zoneCount",min:0,max:r,step:1,ui:{label:"zone count",control:"slider"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"background",control:"color"}},bgAlpha:{type:"float",default:1,uniform:"bgAlpha",min:0,max:1,ui:{label:"background alpha",control:"slider"}},smoothEdge:{type:"float",default:.04,uniform:"smoothEdge",min:0,max:1,step:.01,ui:{label:"edge smoothing",control:"slider"}},...f()},defaultProgram:`search synth

remap(bgColor: #336699, bgAlpha: 1)
  .write(o0)`,passes:[{name:"render",program:"remap",inputs:h,outputs:{fragColor:"outputTex"}}]});function f(){let n={};for(let e=0;e<r;e++){let s={enabledBy:{param:"zoneCount",gt:e}},t=`zone ${e+1}`;n[`zone${e}_tex`]={type:"surface",default:"none",colorModeUniform:`zone${e}_active`,ui:{label:`zone ${e+1} source`,category:t,...s}},n[`zone${e}_count`]={type:"int",default:0,uniform:`zone${e}_count`,min:0,max:i,ui:{label:"vertices",control:"slider",hidden:!0,category:t,...s}},n[`zone${e}_alpha`]={type:"float",default:1,uniform:`zone${e}_alpha`,min:0,max:1,ui:{label:"alpha",control:"slider",category:t,...s}},n[`zone${e}_bounds`]={type:"vec4",default:[0,0,1,1],uniform:`zone${e}_bounds`,ui:{label:"bounds",control:"slider",hidden:!0,format:"vector",category:t}};for(let o=0;o<i/2;o++)n[`zone${e}_v${o}`]={type:"vec4",default:[0,0,0,0],uniform:`zone${e}_v${o}`,ui:{label:`verts ${o*2}\u2013${o*2+1}`,control:"slider",hidden:!0,format:"vector",category:t}}}return n}var d={remap:{glsl:`/**
 * Remap - GLSL fragment shader
 *
 * Polygon-zone router. Zones are composited TOP-DOWN: the last active zone
 * (highest index) that contains a pixel is on top. A zone's coverage is 1
 * everywhere inside its polygon and feathers OUTWARD over
 * \`smoothEdge * 0.05 * min(fullResolution)\` pixels, so the interior is
 * never eroded: adjacent zones meet without a seam and canvas borders
 * stay clean. Sources are premultiplied and stacked with the premultiplied
 * "under" operator, so a transparent source shows the zone below it, or
 * the background.
 *
 * Per zone, ONE pass over the packed vertex pairs (one uniform fetch per
 * two vertices) evaluates the even-odd inside test and the squared pixel
 * distance to the boundary together. With smoothEdge 0 the walk carries no
 * distance math at all, a host-supplied bounding box (zoneN_bounds) skips
 * zones the pixel cannot touch, and the zone loop stops as soon as the
 * pixel is opaque.
 */

#ifdef GL_ES
precision highp float;
#endif

#define MAX_ZONES 8
#define MAX_PAIRS 32  // MAX_VERTS_PER_ZONE / 2
#define HEADER_SLOT 0
#define CONTROLS_SLOT 1
#define ZONE_META_SLOT 2
#define ZONE_VERTS_SLOT 10
#define RESOLUTION_SLOT 266
#define ZONE_BOUNDS_SLOT 267

layout(std140) uniform RemapUniforms {
    vec4 data[275];
};

// Auto-filled when noisedeck is doing a tiled large-resolution export.
// When not tiling: tileOffset = (0, 0), fullResolution = resolution.
uniform vec2 tileOffset;
uniform vec2 fullResolution;

// Per-zone source surfaces. Wired in DSL via \`zoneN_tex: read(oN)\`.
uniform sampler2D zone0_tex;
uniform sampler2D zone1_tex;
uniform sampler2D zone2_tex;
uniform sampler2D zone3_tex;
uniform sampler2D zone4_tex;
uniform sampler2D zone5_tex;
uniform sampler2D zone6_tex;
uniform sampler2D zone7_tex;

out vec4 fragColor;

vec4 sampleZone(int z, vec2 uv) {
    if (z == 0) return texture(zone0_tex, uv);
    if (z == 1) return texture(zone1_tex, uv);
    if (z == 2) return texture(zone2_tex, uv);
    if (z == 3) return texture(zone3_tex, uv);
    if (z == 4) return texture(zone4_tex, uv);
    if (z == 5) return texture(zone5_tex, uv);
    if (z == 6) return texture(zone6_tex, uv);
    return texture(zone7_tex, uv);
}

// Polygon state accumulated over one zone's edges for the current pixel.
struct ZoneTest {
    bool inside;   // even-odd crossing parity
    float d2;      // squared pixel distance to the nearest boundary point
};

// Folds the edge between vertex \`a\` and its predecessor \`b\` into \`t\`.
// All positions are global pixel coordinates (top-left origin).
ZoneTest testEdge(ZoneTest t, vec2 a, vec2 b, vec2 q, bool needDist) {
    vec2 e = b - a;
    vec2 w = q - a;
    // Even-odd crossing count along the +x ray from q, branch-free. The
    // half-open scanline rule keeps an edge shared by two zones unambiguous.
    bvec3 c = bvec3((q.y >= a.y), (q.y < b.y), (e.x * w.y > e.y * w.x));
    if (all(c) || !any(c)) t.inside = !t.inside;
    if (needDist) {
        float s = clamp(dot(w, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
        vec2 r = w - e * s;
        t.d2 = min(t.d2, dot(r, r));
    }
    return t;
}

// Walks one zone's packed vertex pairs (one uniform fetch per two vertices)
// and returns the inside parity plus the squared pixel distance to the
// boundary. \`needDist\` is a constant at each call site in main(), so the
// smoothEdge-0 walk is compiled without any distance math.
ZoneTest walkZone(int base, int n, vec2 q, bool needDist) {
    ZoneTest t = ZoneTest(false, 1e30);
    int last = n - 1;
    vec4 lastPack = data[base + last / 2];
    vec2 prev = (last % 2 == 0 ? lastPack.xy : lastPack.zw) * fullResolution;
    int pairs = (n + 1) / 2;
    for (int pair = 0; pair < MAX_PAIRS; pair++) {
        if (pair >= pairs) break;
        vec4 pack = data[base + pair];
        vec2 v0 = pack.xy * fullResolution;
        t = testEdge(t, v0, prev, q, needDist);
        prev = v0;
        if (pair * 2 + 1 < n) {
            vec2 v1 = pack.zw * fullResolution;
            t = testEdge(t, v1, prev, q, needDist);
            prev = v1;
        }
    }
    return t;
}

void main() {
    // Polygon tests use the GLOBAL pixel position so zones land in the same
    // image position regardless of which tile is rendering. gl_FragCoord is
    // bottom-left origin (Y-up); remap JSON is top-left (Y-down), so flip y
    // after the global-coord conversion to match the JSON convention.
    vec2 globalPx = gl_FragCoord.xy + tileOffset;
    vec2 q = vec2(globalPx.x, fullResolution.y - globalPx.y);
    vec2 p = q / fullResolution;   // normalized, for the zone bounds test
    // Texture sampling stays TILE-LOCAL: each zoneN_tex is the current
    // tile's slice of its source surface, so we sample at the tile-local
    // pixel position, not the global one. Bottom-left origin to match
    // the codebase texture convention.
    vec2 sampleUv = gl_FragCoord.xy / data[RESOLUTION_SLOT].xy;

    vec4 header = data[HEADER_SLOT];
    vec4 controls = data[CONTROLS_SLOT];
    int activeCount = min(int(controls.x), MAX_ZONES);
    // Feather width in pixels, proportional to the shorter canvas side, so
    // it is the same width on both axes whatever the aspect ratio. smoothEdge
    // is clamped at 0: an automated negative value would otherwise make the
    // bounds dilation negative and SHRINK every zone's reject box.
    float featherPx = max(controls.y, 0.0) * 0.05 * min(fullResolution.x, fullResolution.y);
    bool needDist = featherPx > 0.0;
    vec2 dilate = vec2(featherPx) / fullResolution;   // feather in normalized units per axis

    vec4 result = vec4(0.0);
    for (int k = 0; k < MAX_ZONES; k++) {
        int z = activeCount - 1 - k;   // top-down: highest index first
        if (z < 0) break;
        vec4 zoneMeta = data[ZONE_META_SLOT + z];
        // Clamped: a host-supplied count above the per-zone capacity would
        // otherwise walk past this zone's slots into the next zone's.
        int n = min(int(zoneMeta.x), MAX_PAIRS * 2);
        if (n < 3 || zoneMeta.y < 0.5) continue;   // degenerate, or source not wired
        // Host-supplied bounding box [minX, minY, maxX, maxY], dilated by the
        // feather. The default [0, 0, 1, 1] never rejects a canvas pixel.
        vec4 bounds = data[ZONE_BOUNDS_SLOT + z];
        if (any(lessThan(p, bounds.xy - dilate)) || any(greaterThan(p, bounds.zw + dilate))) continue;
        int base = ZONE_VERTS_SLOT + z * MAX_PAIRS;

        ZoneTest t;
        if (needDist) {
            t = walkZone(base, n, q, true);
        } else {
            t = walkZone(base, n, q, false);
        }

        float coverage = 1.0;
        if (!t.inside) {
            if (!needDist) continue;
            coverage = 1.0 - smoothstep(0.0, featherPx, sqrt(t.d2));
            if (coverage <= 0.0) continue;
        }
        // Premultiplied "under": this zone is above everything still to come.
        vec4 src = sampleZone(z, sampleUv) * (coverage * zoneMeta.w);
        result += src * (1.0 - result.a);
        if (result.a >= 0.999) break;
    }
    // Background goes under whatever the zones left uncovered.
    result += vec4(header.xyz * header.w, header.w) * (1.0 - result.a);

    fragColor = result;
}
`,wgsl:`/**
 * Remap \u2014 WGSL fragment shader
 *
 * Polygon-zone router. Zones are composited TOP-DOWN: the last active zone
 * (highest index) that contains a pixel is on top. A zone's coverage is 1
 * everywhere inside its polygon and feathers OUTWARD over
 * \`smoothEdge * 0.05 * min(fullResolution)\` pixels, so the interior is
 * never eroded: adjacent zones meet without a seam and canvas borders
 * stay clean. Sources are premultiplied and stacked with the premultiplied
 * "under" operator, so a transparent source shows the zone below it, or
 * the background.
 *
 * Per zone, ONE pass over the packed vertex pairs (one uniform fetch per
 * two vertices) evaluates the even-odd inside test and the squared pixel
 * distance to the boundary together. With smoothEdge 0 the walk carries no
 * distance math at all, a host-supplied bounding box (zoneN_bounds) skips
 * zones the pixel cannot touch, and the zone loop stops as soon as the
 * pixel is opaque. Uniforms are packed into a single vec4 array to match
 * the JS uniformLayout.
 */

struct Uniforms {
    data: array<vec4<f32>, 275>,
    // slot 0:      bgR, bgG, bgB, bgAlpha
    // slot 1:      zoneCount, smoothEdge, _, time
    // slot 2..9:   per-zone meta (vertexCount, active, _, alpha)
    //              \`active\` is 1 when zoneN_tex is wired, 0 when "none".
    // slot 10..265: per-zone polygons; 32 vec4s per zone (64 verts packed two
    //              per vec4 as v_2k.xy + v_2k+1.xy)
    // slot 266.xy: resolution (auto-filled by the runtime)
    // slot 267..274: per-zone bounds [minX, minY, maxX, maxY], normalized;
    //              default [0, 0, 1, 1] never rejects a pixel
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var zone0_tex: texture_2d<f32>;
@group(0) @binding(3) var zone1_tex: texture_2d<f32>;
@group(0) @binding(4) var zone2_tex: texture_2d<f32>;
@group(0) @binding(5) var zone3_tex: texture_2d<f32>;
@group(0) @binding(6) var zone4_tex: texture_2d<f32>;
@group(0) @binding(7) var zone5_tex: texture_2d<f32>;
@group(0) @binding(8) var zone6_tex: texture_2d<f32>;
@group(0) @binding(9) var zone7_tex: texture_2d<f32>;
// Auto-filled when noisedeck is doing a tiled large-resolution export.
// When not tiling: tileOffset = (0, 0), fullResolution = resolution.
@group(0) @binding(10) var<uniform> tileOffset: vec2<f32>;
@group(0) @binding(11) var<uniform> fullResolution: vec2<f32>;

const MAX_ZONES: i32 = 8;
const MAX_PAIRS: i32 = 32;  // MAX_VERTS_PER_ZONE / 2
const HEADER_SLOT: i32 = 0;
const CONTROLS_SLOT: i32 = 1;
const ZONE_META_SLOT: i32 = 2;
const ZONE_VERTS_SLOT: i32 = 10;
const RESOLUTION_SLOT: i32 = 266;
const ZONE_BOUNDS_SLOT: i32 = 267;

fn sampleZone(z: i32, uv: vec2<f32>) -> vec4<f32> {
    // textureSampleLevel (explicit LOD 0) \u2014 sampleZone is called from the
    // per-pixel, data-dependent zone loop (non-uniform control flow), which
    // disqualifies plain textureSample (it needs implicit derivatives /
    // uniform control flow). Zone surfaces are non-mipmapped render targets,
    // so LOD 0 is exactly GLSL's texture() here. Mirrors the mixer/shadow port.
    if (z == 0) { return textureSampleLevel(zone0_tex, samp, uv, 0.0); }
    if (z == 1) { return textureSampleLevel(zone1_tex, samp, uv, 0.0); }
    if (z == 2) { return textureSampleLevel(zone2_tex, samp, uv, 0.0); }
    if (z == 3) { return textureSampleLevel(zone3_tex, samp, uv, 0.0); }
    if (z == 4) { return textureSampleLevel(zone4_tex, samp, uv, 0.0); }
    if (z == 5) { return textureSampleLevel(zone5_tex, samp, uv, 0.0); }
    if (z == 6) { return textureSampleLevel(zone6_tex, samp, uv, 0.0); }
    return textureSampleLevel(zone7_tex, samp, uv, 0.0);
}

// Polygon state accumulated over one zone's edges for the current pixel.
struct ZoneTest {
    inside: bool,   // even-odd crossing parity
    d2: f32,        // squared pixel distance to the nearest boundary point
}

// Folds the edge between vertex \`a\` and its predecessor \`b\` into \`t0\`.
// All positions are global pixel coordinates (top-left origin).
fn testEdge(t0: ZoneTest, a: vec2<f32>, b: vec2<f32>, q: vec2<f32>, needDist: bool) -> ZoneTest {
    var t = t0;
    let e = b - a;
    let w = q - a;
    // Even-odd crossing count along the +x ray from q, branch-free. The
    // half-open scanline rule keeps an edge shared by two zones unambiguous.
    let c = vec3<bool>((q.y >= a.y), (q.y < b.y), (e.x * w.y > e.y * w.x));
    if (all(c) || !any(c)) { t.inside = !t.inside; }
    if (needDist) {
        let s = clamp(dot(w, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
        let r = w - e * s;
        t.d2 = min(t.d2, dot(r, r));
    }
    return t;
}

// Walks one zone's packed vertex pairs (one uniform fetch per two vertices)
// and returns the inside parity plus the squared pixel distance to the
// boundary. \`needDist\` is a constant at each call site in fragmentMain(),
// so the smoothEdge-0 walk is compiled without any distance math.
fn walkZone(base: i32, n: i32, q: vec2<f32>, needDist: bool) -> ZoneTest {
    var t = ZoneTest(false, 1e30);
    let last: i32 = n - 1;
    let lastPack = uniforms.data[base + last / 2];
    var prev = select(lastPack.zw, lastPack.xy, last % 2 == 0) * fullResolution;
    let pairs: i32 = (n + 1) / 2;
    for (var pair: i32 = 0; pair < MAX_PAIRS; pair = pair + 1) {
        if (pair >= pairs) { break; }
        let pack = uniforms.data[base + pair];
        let v0 = pack.xy * fullResolution;
        t = testEdge(t, v0, prev, q, needDist);
        prev = v0;
        if (pair * 2 + 1 < n) {
            let v1 = pack.zw * fullResolution;
            t = testEdge(t, v1, prev, q, needDist);
            prev = v1;
        }
    }
    return t;
}

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    // Polygon tests use the GLOBAL pixel position so zones land in the same
    // image position regardless of which tile is rendering. The y flip below
    // is not a claim about the origin @builtin(position) uses \u2014 the WGSL spec
    // does not settle that here. It is the flip that makes this backend agree
    // with the GLSL one, which the orientation case in
    // shaders/tests/test_remap_render.mjs and byte parity with GLSL
    // (parity-attestation.json, maxDiff 0) both hold to.
    let globalPx = fragCoord.xy + tileOffset;
    let q = vec2<f32>(globalPx.x, fullResolution.y - globalPx.y);
    let p = q / fullResolution;   // normalized, for the zone bounds test
    // Texture sampling stays TILE-LOCAL: each zoneN_tex is the current
    // tile's slice of its source surface, so sample at the tile-local
    // pixel position, not the global one.
    let sampleUv = fragCoord.xy / uniforms.data[RESOLUTION_SLOT].xy;

    let header = uniforms.data[HEADER_SLOT];
    let controls = uniforms.data[CONTROLS_SLOT];
    let activeCount: i32 = min(i32(controls.x), MAX_ZONES);
    // Feather width in pixels, proportional to the shorter canvas side, so
    // it is the same width on both axes whatever the aspect ratio. smoothEdge
    // is clamped at 0: an automated negative value would otherwise make the
    // bounds dilation negative and SHRINK every zone's reject box.
    let featherPx: f32 = max(controls.y, 0.0) * 0.05 * min(fullResolution.x, fullResolution.y);
    let needDist: bool = featherPx > 0.0;
    let dilate = vec2<f32>(featherPx) / fullResolution;   // feather in normalized units per axis

    var result = vec4<f32>(0.0);
    for (var k: i32 = 0; k < MAX_ZONES; k = k + 1) {
        let z: i32 = activeCount - 1 - k;   // top-down: highest index first
        if (z < 0) { break; }
        let zoneMeta = uniforms.data[ZONE_META_SLOT + z];
        // Clamped: a host-supplied count above the per-zone capacity would
        // otherwise walk past this zone's slots into the next zone's.
        let n: i32 = min(i32(zoneMeta.x), MAX_PAIRS * 2);
        if (n < 3 || zoneMeta.y < 0.5) { continue; }   // degenerate, or source not wired
        // Host-supplied bounding box [minX, minY, maxX, maxY], dilated by the
        // feather. The default [0, 0, 1, 1] never rejects a canvas pixel.
        let bounds = uniforms.data[ZONE_BOUNDS_SLOT + z];
        if (any(p < bounds.xy - dilate) || any(p > bounds.zw + dilate)) { continue; }
        let base: i32 = ZONE_VERTS_SLOT + z * MAX_PAIRS;

        var t: ZoneTest;
        if (needDist) {
            t = walkZone(base, n, q, true);
        } else {
            t = walkZone(base, n, q, false);
        }

        var coverage: f32 = 1.0;
        if (!t.inside) {
            if (!needDist) { continue; }
            coverage = 1.0 - smoothstep(0.0, featherPx, sqrt(t.d2));
            if (coverage <= 0.0) { continue; }
        }
        // Premultiplied "under": this zone is above everything still to come.
        let src = sampleZone(z, sampleUv) * (coverage * zoneMeta.w);
        result = result + src * (1.0 - result.a);
        if (result.a >= 0.999) { break; }
    }
    // Background goes under whatever the zones left uncovered.
    result = result + vec4<f32>(header.xyz * header.w, header.w) * (1.0 - result.a);

    return result;
}
`}},u=`# synth/remap

Polygon-zone router with live canvas editing in Noisedeck.

## Overview

Each pixel is tested against up to eight polygon zones. Zones stack in index order: the last (highest-numbered) zone that contains a pixel is on top, and lower zones show through wherever the zones above them are transparent. Pixels outside every active zone \u2014 and pixels in zones whose source isn't wired \u2014 show the background color.

Edge smoothing feathers each zone outward by a pixel width proportional to the shorter canvas side, so adjacent zones blend without a seam and canvas borders stay clean; a zone's interior is never eroded. Sources are composited with their alpha, so a transparent source shows the background or the zone below, and each zone has its own alpha on top of that.

In Noisedeck, edit zones directly over the live canvas from the Remap effect. Existing \`.remap.json\` maps can be imported, and the effect exports the same portable version 1 format.

## Workflow

1. Add Remap to your Noisedeck composition and choose **edit zones**.
2. Choose **add zone**, then click points on the live canvas. Click the first point or press Enter to finish; Escape cancels an unfinished shape.
3. In Noisedeck a newly finished zone takes the first written surface not used by another zone; change it with the zone's source control. The mapped image updates as you drag vertices. Click an edge midpoint to insert a vertex; right-click a vertex to remove it.
4. Set zone names, outline colors, and opacity in the effect controls.
5. Choose **export remap config** to save the portable map, or **import remap config** to load an existing map.

The canvas editor manages the hidden shape parameters (\`zoneN_count\`, \`zoneN_vP\`). Runtime integrations can still apply these parameters through \`applyStepParameterValues({ step_N: params })\` and wire source surfaces in DSL with \`zoneN_tex: read(oN)\`. Existing maps and hexadecimal vertex literals remain valid.

## Parameters

### General
- **Zone count**: how many of the eight slots are active (0\u20138). Slots with \`vertices < 3\` or with \`zoneN_tex\` unwired are skipped automatically.
- **Background**: color for pixels outside every active zone. It also shows through transparent sources and partially transparent zones.
- **Background alpha**: alpha channel for the background. The output is premultiplied, so a background alpha below 1 leaves the surface partially transparent.
- **Edge smoothing**: outward feather at polygon boundaries. At 1 the feather is 5% of the shorter canvas side wide (54 px on a 1920\xD71080 canvas); at the default 0.04 it is about 2 px on that same canvas. The feather only extends outward, so a zone never shrinks, shared edges never show the background, and the same value gives the same pixel width on both axes whatever the aspect ratio. Set it to 0 for hard edges.

### Zones (1\u20138)
For each zone:
- **Zone N source** (\`zoneN_tex\`): the engine surface to sample. Wire in DSL with \`zoneN_tex: read(oN)\`. When unwired (default \`"none"\`), the zone is skipped.
- **Alpha**: per-zone opacity, multiplied with the source's own alpha. Zones with a higher number are composited on top of lower ones.
- **Vertices** (hidden): vertex count, managed by canvas editing or map import.
- **verts P\u2013P+1** (hidden): packed \`vec4\` holding two vertices, managed by canvas editing or map import.
- **bounds** (hidden, \`zoneN_bounds\`): the polygon's bounding box as \`[minX, minY, maxX, maxY]\` in normalized coordinates, written by the canvas editor. The shader skips the zone for pixels outside this box (dilated by the feather), which is what keeps many-vertex maps fast. The default \`[0, 0, 1, 1]\` never skips anything, so maps and hosts that do not supply bounds render identically, only slower; a box tighter than the polygon clips it.

## Coordinate space

Vertices are normalized: \`(0, 0)\` is top-left and \`(1, 1)\` is bottom-right. Both backends flip the y axis internally, so polygons match the canvas editor's orientation whichever one is running.

Regenerated DSL stores each packed vertex pair as four exact numbers, such as \`[0.8000000780001997, 0.45, 0.1, 0.45]\`. The effect's \`ui.format: 'vector'\` metadata preserves these coordinates through editing and saving. Legacy hexadecimal vertex literals still load, with their original 8-bit color precision.

## Limits

- 8 zones (matches the eight engine user surfaces \`o0\`\u2026\`o7\`)
- 64 vertices per zone

If you need more than 64 vertices per zone, decompose the polygon into multiple zones and wire them all to the same source surface.

## Geometry correction (deferred)

This effect intentionally does not include software geometry correction (warping the rectangular projector output onto a non-rectangular physical surface). For now, use your projector's keystone or 4-corner correction.

A future revision may bring back an 8-handle Coons-patch warp, suitable for the cases hardware can't handle:

- curved surfaces (cylinders, columns, fabric drops)
- non-contiguous targets (one projector hitting multiple separate surfaces)
- multi-projector setups with edge feathering

When that happens, the warp will be additive: the existing zone-routing semantics will not change, and the new uniforms will be opt-in.

## Usage

\`\`\`
search synth

remap()
  .write(o0)

render(o0)
\`\`\`
`;if(a&&Object.keys(d).length>0){a.shaders||(a.shaders={});for(let[n,e]of Object.entries(d))a.shaders[n]={...e}}a&&u&&(a.help=u);var z="synth/remap",b="synth",y="remap",w=a;export{w as default,z as effectId,y as effectName,u as help,b as namespace};
