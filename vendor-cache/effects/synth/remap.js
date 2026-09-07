/* synth/remap */
var l=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var s=8,a=64,d=(()=>{let n={bgColor:{slot:0,components:"xyz"},bgAlpha:{slot:0,components:"w"},zoneCount:{slot:1,components:"x"},smoothEdge:{slot:1,components:"y"},time:{slot:1,components:"w"},resolution:{slot:10+s*(a/2),components:"xy"}};for(let e=0;e<s;e++){let i=2+e;n[`zone${e}_count`]={slot:i,components:"x"},n[`zone${e}_active`]={slot:i,components:"y"},n[`zone${e}_alpha`]={slot:i,components:"w"};for(let t=0;t<a/2;t++){let o=10+e*(a/2)+t;n[`zone${e}_v${t}`]={slot:o,components:"xyzw"}}}return n})(),p=(()=>{let n={};for(let e=0;e<s;e++)n[`zone${e}_tex`]=`zone${e}_tex`;return n})(),r=new l({name:"Remap",namespace:"synth",func:"remap",tags:["geometric","blend"],description:"Polygon zones routed to engine surfaces (companion to the Remap zone-editor app)",openCategories:["general"],uniformLayout:d,globals:{zoneCount:{type:"int",default:0,uniform:"zoneCount",min:0,max:s,step:1,ui:{label:"zone count",control:"slider"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"background",control:"color"}},bgAlpha:{type:"float",default:1,uniform:"bgAlpha",min:0,max:1,ui:{label:"background alpha",control:"slider"}},smoothEdge:{type:"float",default:.04,uniform:"smoothEdge",min:0,max:1,step:.01,ui:{label:"edge smoothing",control:"slider"}},...f()},defaultProgram:`search synth

remap(bgColor: #336699, bgAlpha: 1)
  .write(o0)`,passes:[{name:"render",program:"remap",inputs:p,outputs:{fragColor:"outputTex"}}]});function f(){let n={};for(let e=0;e<s;e++){let i={enabledBy:{param:"zoneCount",gt:e}},t=`zone ${e+1}`;n[`zone${e}_tex`]={type:"surface",default:"none",colorModeUniform:`zone${e}_active`,ui:{label:`zone ${e+1} source`,category:t,...i}},n[`zone${e}_count`]={type:"int",default:0,uniform:`zone${e}_count`,min:0,max:a,ui:{label:"vertices",control:"slider",hidden:!0,category:t,...i}},n[`zone${e}_alpha`]={type:"float",default:1,uniform:`zone${e}_alpha`,min:0,max:1,ui:{label:"alpha",control:"slider",category:t,...i}};for(let o=0;o<a/2;o++)n[`zone${e}_v${o}`]={type:"vec4",default:[0,0,0,0],uniform:`zone${e}_v${o}`,ui:{label:`verts ${o*2}\u2013${o*2+1}`,control:"slider",hidden:!0,format:"vector",category:t}}}return n}var u={remap:{glsl:`/**
 * Remap - GLSL fragment shader
 *
 * For each pixel, walks active zones (vertexCount >= 3 and source wired)
 * and tests whether the UV is inside the polygon. The first matching
 * zone wins; the pixel samples from that zone's wired source surface.
 * Pixels outside every active zone show the background color.
 *
 * Edge smoothing is applied as a soft alpha falloff at polygon boundaries
 * so adjacent zones blend instead of producing aliased edges.
 */

#ifdef GL_ES
precision highp float;
#endif

#define MAX_ZONES 8
#define MAX_VERTS_PER_ZONE 64
#define MAX_PAIRS 32  // MAX_VERTS_PER_ZONE / 2
#define HEADER_SLOT 0
#define CONTROLS_SLOT 1
#define ZONE_META_SLOT 2
#define ZONE_VERTS_SLOT 10

layout(std140) uniform RemapUniforms {
    vec4 data[267];
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

vec4 getZoneMeta(int z) {
    return data[ZONE_META_SLOT + z];
}

vec4 getZonePack(int zoneIdx, int pairIdx) {
    return data[ZONE_VERTS_SLOT + zoneIdx * MAX_PAIRS + pairIdx];
}

vec2 getVert(int zoneIdx, int vertIdx) {
    vec4 packed = getZonePack(zoneIdx, vertIdx / 2);
    return (vertIdx % 2 == 0) ? packed.xy : packed.zw;
}

int getZoneCount(int z) {
    return int(getZoneMeta(z).x);
}

int getZoneActive(int z) {
    return int(getZoneMeta(z).y + 0.5);
}

float getZoneAlpha(int z) {
    return getZoneMeta(z).w;
}

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

bool pointInZone(vec2 p, int zoneIdx) {
    int n = getZoneCount(zoneIdx);
    if (n < 3) return false;
    bool inside = false;
    vec2 prev = getVert(zoneIdx, n - 1);
    for (int i = 0; i < MAX_VERTS_PER_ZONE; i++) {
        if (i >= n) break;
        vec2 cur = getVert(zoneIdx, i);
        bool crosses = (cur.y > p.y) != (prev.y > p.y);
        if (crosses) {
            float xCross = (prev.x - cur.x) * (p.y - cur.y) / (prev.y - cur.y + 1e-9) + cur.x;
            if (p.x < xCross) inside = !inside;
        }
        prev = cur;
    }
    return inside;
}

float distToZoneEdge(vec2 p, int zoneIdx) {
    int n = getZoneCount(zoneIdx);
    if (n < 3) return 1e9;
    float d = 1e9;
    vec2 prev = getVert(zoneIdx, n - 1);
    for (int i = 0; i < MAX_VERTS_PER_ZONE; i++) {
        if (i >= n) break;
        vec2 cur = getVert(zoneIdx, i);
        vec2 ab = cur - prev;
        float len2 = max(dot(ab, ab), 1e-9);
        float t = clamp(dot(p - prev, ab) / len2, 0.0, 1.0);
        vec2 closest = prev + t * ab;
        d = min(d, length(p - closest));
        prev = cur;
    }
    return d;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    // Polygon tests use GLOBAL UV so zones land in the same image position
    // regardless of which tile is rendering. gl_FragCoord is bottom-left
    // origin (Y-up); remap JSON is top-left (Y-down) - flip y after the
    // global-coord conversion to match the JSON convention.
    vec2 globalScreen = (gl_FragCoord.xy + tileOffset) / fullResolution;
    vec2 p = vec2(globalScreen.x, 1.0 - globalScreen.y);
    // Texture sampling stays TILE-LOCAL: each zoneN_tex is the current
    // tile's slice of its source surface, so we sample at the tile-local
    // pixel position, not the global one. Bottom-left origin to match
    // the codebase texture convention.
    vec2 sampleUv = globalCoord / fullResolution;

    vec4 header = data[HEADER_SLOT];
    vec4 controls = data[CONTROLS_SLOT];
    vec3 bgColor = header.xyz;
    float bgAlpha = header.w;
    int activeCount = min(int(controls.x), MAX_ZONES);
    float smoothEdge = controls.y;

    vec4 result = vec4(bgColor, bgAlpha);
    for (int z = 0; z < MAX_ZONES; z++) {
        if (z >= activeCount) break;
        if (getZoneActive(z) == 0) continue;  // source surface not wired
        if (!pointInZone(p, z)) continue;
        vec4 src = sampleZone(z, sampleUv);
        float zAlpha = getZoneAlpha(z);
        // smoothEdge is user-facing 0..1; scale to the actual source-UV
        // distance (0..0.05), beyond which the fade looks like washout.
        float edgeWidth = smoothEdge * 0.05;
        float edge = edgeWidth > 0.0
            ? smoothstep(0.0, edgeWidth, distToZoneEdge(p, z))
            : 1.0;
        float a = zAlpha * edge;
        result = vec4(mix(result.rgb, src.rgb, a), max(result.a, src.a * a));
    }

    fragColor = result;
}
`,wgsl:`/**
 * Remap \u2014 WGSL fragment shader
 *
 * Per-pixel: walk active zones, find the first matching polygon, sample
 * from that zone's wired source surface. Uniforms are packed into a
 * single vec4 array to match the JS uniformLayout.
 */

struct Uniforms {
    data: array<vec4<f32>, 267>,
    // slot 0:      bgR, bgG, bgB, bgAlpha
    // slot 1:      zoneCount, smoothEdge, _, time
    // slot 2..9:   per-zone meta (vertexCount, active, _, alpha)
    //              \`active\` is 1 when zoneN_tex is wired, 0 when "none".
    // slot 10..265: per-zone polygons; 32 vec4s per zone (64 verts packed two
    //              per vec4 as v_2k.xy + v_2k+1.xy)
    // slot 266.xy: resolution (auto-filled by the runtime)
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

const MAX_ZONES: u32 = 8u;
const MAX_VERTS_PER_ZONE: u32 = 64u;
const PAIRS_PER_ZONE: u32 = 32u;  // MAX_VERTS_PER_ZONE / 2

fn getZoneMeta(z: u32) -> vec4<f32> {
    return uniforms.data[2u + z];
}

fn getVert(zoneIdx: u32, vertIdx: u32) -> vec2<f32> {
    let pairIdx: u32 = vertIdx >> 1u;
    let slot: u32 = 10u + zoneIdx * PAIRS_PER_ZONE + pairIdx;
    let packed: vec4<f32> = uniforms.data[slot];
    if ((vertIdx & 1u) == 0u) {
        return packed.xy;
    }
    return packed.zw;
}

fn sampleZone(z: u32, uv: vec2<f32>) -> vec4<f32> {
    // textureSampleLevel (explicit LOD 0) \u2014 sampleZone is called from the
    // per-pixel, data-dependent zone loop (non-uniform control flow), which
    // disqualifies plain textureSample (it needs implicit derivatives /
    // uniform control flow). Zone surfaces are non-mipmapped render targets,
    // so LOD 0 is exactly GLSL's texture() here. Mirrors the mixer/shadow port.
    if (z == 0u) { return textureSampleLevel(zone0_tex, samp, uv, 0.0); }
    if (z == 1u) { return textureSampleLevel(zone1_tex, samp, uv, 0.0); }
    if (z == 2u) { return textureSampleLevel(zone2_tex, samp, uv, 0.0); }
    if (z == 3u) { return textureSampleLevel(zone3_tex, samp, uv, 0.0); }
    if (z == 4u) { return textureSampleLevel(zone4_tex, samp, uv, 0.0); }
    if (z == 5u) { return textureSampleLevel(zone5_tex, samp, uv, 0.0); }
    if (z == 6u) { return textureSampleLevel(zone6_tex, samp, uv, 0.0); }
    return textureSampleLevel(zone7_tex, samp, uv, 0.0);
}

fn pointInZone(p: vec2<f32>, zoneIdx: u32) -> bool {
    let zoneMeta = getZoneMeta(zoneIdx);
    let n = i32(zoneMeta.x);
    if (n < 3) { return false; }
    var inside: bool = false;
    var prev = getVert(zoneIdx, u32(n) - 1u);
    for (var i: u32 = 0u; i < MAX_VERTS_PER_ZONE; i = i + 1u) {
        if (i32(i) >= n) { break; }
        let cur = getVert(zoneIdx, i);
        let crosses: bool = (cur.y > p.y) != (prev.y > p.y);
        if (crosses) {
            let dy = prev.y - cur.y;
            let denom = select(dy, 1e-9, abs(dy) < 1e-9);
            let xCross = (prev.x - cur.x) * (p.y - cur.y) / denom + cur.x;
            if (p.x < xCross) { inside = !inside; }
        }
        prev = cur;
    }
    return inside;
}

fn distToZoneEdge(p: vec2<f32>, zoneIdx: u32) -> f32 {
    let zoneMeta = getZoneMeta(zoneIdx);
    let n = i32(zoneMeta.x);
    if (n < 3) { return 1e9; }
    var d: f32 = 1e9;
    var prev = getVert(zoneIdx, u32(n) - 1u);
    for (var i: u32 = 0u; i < MAX_VERTS_PER_ZONE; i = i + 1u) {
        if (i32(i) >= n) { break; }
        let cur = getVert(zoneIdx, i);
        let ab = cur - prev;
        let len2 = max(dot(ab, ab), 1e-9);
        let t = clamp(dot(p - prev, ab) / len2, 0.0, 1.0);
        let closest = prev + t * ab;
        d = min(d, length(p - closest));
        prev = cur;
    }
    return d;
}

@fragment
fn fragmentMain(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[266].xy;
    // Polygon tests use GLOBAL UV so zones land in the same image position
    // regardless of which tile is rendering. WGSL @builtin(position) is
    // top-left (Y-down); tileOffset is sent in GLSL (Y-from-bottom)
    // convention, so convert: posFromBottom.y = resolution.y - pos.y,
    // global = posFromBottom + tileOffset, then flip Y-down for the JSON.
    let posFromBottom = vec2<f32>(fragCoord.x, fragCoord.y);
    let globalYup = (posFromBottom + tileOffset) / fullResolution;
    let p = vec2<f32>(globalYup.x, 1.0 - globalYup.y);
    // Texture sampling stays TILE-LOCAL: each zoneN_tex is the current
    // tile's slice of its source surface, so sample at the tile-local
    // pixel position (Y-down to match WGSL textureSampleLevel convention).
    let sampleUv = fragCoord.xy / resolution;

    let header = uniforms.data[0];
    let header2 = uniforms.data[1];
    let bgColor = vec3<f32>(header.x, header.y, header.z);
    let bgAlpha = header.w;
    let zoneCount: i32 = i32(header2.x);
    let smoothEdge: f32 = header2.y;

    var result = vec4<f32>(bgColor, bgAlpha);
    let activeCount: i32 = min(zoneCount, i32(MAX_ZONES));
    for (var z: u32 = 0u; z < MAX_ZONES; z = z + 1u) {
        if (i32(z) >= activeCount) { break; }
        let zoneMeta = getZoneMeta(z);
        if (zoneMeta.y < 0.5) { continue; }  // zoneN_tex not wired
        if (!pointInZone(p, z)) { continue; }
        let src = sampleZone(z, sampleUv);
        let zAlpha = zoneMeta.w;
        // smoothEdge is user-facing 0..1; scale to the actual source-UV
        // distance (0..0.05), beyond which the fade looks like washout.
        let edgeWidth = smoothEdge * 0.05;
        var edge: f32 = 1.0;
        if (edgeWidth > 0.0) {
            edge = smoothstep(0.0, edgeWidth, distToZoneEdge(p, z));
        }
        let a = zAlpha * edge;
        result = vec4<f32>(mix(result.rgb, src.rgb, a), max(result.a, src.a * a));
    }

    return result;
}
`}},c=`# synth/remap

Polygon-zone router with live canvas editing in Noisedeck.

## Overview

Each pixel is tested against up to eight polygon zones. The first zone that contains the pixel decides which engine surface is sampled. Pixels outside every active zone \u2014 and pixels in zones whose source isn't wired \u2014 show the background color. Each zone has its own alpha and an edge smoothing factor blends adjacent zones smoothly.

In Noisedeck, edit zones directly over the live canvas from the Remap effect. Existing \`.remap.json\` maps can be imported, and the effect exports the same portable version 1 format.

## Workflow

1. Add Remap to your Noisedeck composition and choose **edit zones**.
2. Choose **add zone**, then click points on the live canvas. Click the first point or press Enter to finish; Escape cancels an unfinished shape.
3. Assign each zone a source using its source control. The mapped image updates as you drag vertices. Click an edge midpoint to insert a vertex; right-click a vertex to remove it.
4. Set zone names, outline colors, and opacity in the effect controls.
5. Choose **export remap config** to save the portable map, or **import remap config** to load an existing map.

The canvas editor manages the hidden shape parameters (\`zoneN_count\`, \`zoneN_vP\`). Runtime integrations can still apply these parameters through \`applyStepParameterValues({ step_N: params })\` and wire source surfaces in DSL with \`zoneN_tex: read(oN)\`. Existing maps and hexadecimal vertex literals remain valid.

## Parameters

### General
- **Zone count**: how many of the eight slots are active (0\u20138). Slots with \`vertices < 3\` or with \`zoneN_tex\` unwired are skipped automatically.
- **Background**: color for pixels outside every active zone.
- **Background alpha**: alpha channel for the background.
- **Edge smoothing**: soft falloff at polygon boundaries to hide aliased seams between adjacent zones.

### Zones (1\u20138)
For each zone:
- **Zone N source** (\`zoneN_tex\`): the engine surface to sample. Wire in DSL with \`zoneN_tex: read(oN)\`. When unwired (default \`"none"\`), the zone is skipped.
- **Alpha**: per-zone opacity.
- **Vertices** (hidden): vertex count, managed by canvas editing or map import.
- **verts P\u2013P+1** (hidden): packed \`vec4\` holding two vertices, managed by canvas editing or map import.

## Coordinate space

Vertices are normalized: \`(0, 0)\` is top-left and \`(1, 1)\` is bottom-right. The GLSL backend flips the y axis internally so polygons match the canvas editor's orientation on either backend.

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
`;if(r&&Object.keys(u).length>0){r.shaders||(r.shaders={});for(let[n,e]of Object.entries(u))r.shaders[n]={...e}}r&&c&&(r.help=c);var x="synth/remap",z="synth",y="remap",_=r;export{_ as default,x as effectId,y as effectName,c as help,z as namespace};
