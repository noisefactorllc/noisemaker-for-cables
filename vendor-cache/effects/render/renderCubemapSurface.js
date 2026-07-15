/* render/renderCubemapSurface */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"RenderCubemapSurface",namespace:"render",tags:["3d"],func:"renderCubemapSurface",description:"Sample a 3D volume into cubemap faces (raw true color, no lighting)",textures:{screenGeoBuffer:{width:"resolution",height:"resolution",format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{v16:16,v32:32,v64:64,v128:128},ui:{control:!1}},density:{type:"float",default:4,min:0,max:20,uniform:"density",ui:{label:"density"}},absorption:{type:"float",default:1,min:0,max:4,uniform:"absorption",ui:{label:"absorption"}},emission:{type:"float",default:1,min:0,max:4,uniform:"emission",ui:{label:"emission"}},cubeBasis:{type:"mat3",default:[1,0,0,0,1,0,0,0,1],uniform:"cubeBasis",ui:{control:!1}},bgColor:{type:"color",default:[.02,.02,.02],uniform:"bgColor",ui:{label:"bg color",control:"color"}},bgAlpha:{type:"float",default:1,min:0,max:1,uniform:"bgAlpha",ui:{label:"bg opacity"}}},passes:[{name:"render",program:"renderCubemapSurface",drawBuffers:2,inputs:{volumeCache:"inputTex3d",analyticalGeo:"inputGeo"},outputs:{color:"outputTex",geoOut:"screenGeoBuffer"}}],outputGeo:"screenGeoBuffer",outputTex3d:"inputTex3d"});var i={renderCubemapSurface:{glsl:`/*
 * Cubemap surface sampler (GLSL) \u2014 renderCubemapSurface
 *
 * Samples a 3D volume (inputTex3d) along the per-face cube camera rays and shows
 * the RAW, TRUE color of the field exactly as sampled \u2014 front-to-back
 * emission/absorption, with NO lighting and NO gamma. (The lit isosurface/voxel
 * "blob in space" view lives in the sibling renderCubemap3d.)
 *
 * The volume's red channel drives per-step opacity; RGB is the emitted color.
 */

#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int volumeSize;
uniform mat3 cubeBasis;
uniform vec3 bgColor;
uniform float bgAlpha;
uniform sampler2D volumeCache;
uniform float density;
uniform float absorption;
uniform float emission;

// MRT outputs: color and geometry buffer
layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

const int MAX_STEPS = 256;

// Helper to convert 3D texel coords to 2D atlas texel coords
ivec2 atlasTexel(ivec3 p, int volSize) {
    return ivec2(p.x, p.y + p.z * volSize);
}

// Sample the cached 3D volume with trilinear interpolation
// World position p is in [-1, 1]^3 (bounding box coordinates)
vec4 sampleVolume(vec3 worldPos) {
    int volSize = volumeSize;
    float volSizeF = float(volSize);

    // Convert world position [-1, 1] to normalized volume coords [0, 1]
    vec3 uvw = worldPos * 0.5 + 0.5;
    uvw = clamp(uvw, 0.0, 1.0);

    // Convert to texel coordinates
    vec3 texelPos = uvw * (volSizeF - 1.0);
    vec3 texelFloor = floor(texelPos);
    vec3 frac = texelPos - texelFloor;

    ivec3 i0 = ivec3(texelFloor);
    ivec3 i1 = min(i0 + 1, volSize - 1);

    // Trilinear filtering - sample all 8 corners
    vec4 c000 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i0.y, i0.z), volSize), 0);
    vec4 c100 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i0.y, i0.z), volSize), 0);
    vec4 c010 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i1.y, i0.z), volSize), 0);
    vec4 c110 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i1.y, i0.z), volSize), 0);
    vec4 c001 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i0.y, i1.z), volSize), 0);
    vec4 c101 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i0.y, i1.z), volSize), 0);
    vec4 c011 = texelFetch(volumeCache, atlasTexel(ivec3(i0.x, i1.y, i1.z), volSize), 0);
    vec4 c111 = texelFetch(volumeCache, atlasTexel(ivec3(i1.x, i1.y, i1.z), volSize), 0);

    // Trilinear interpolation
    vec4 c00 = mix(c000, c100, frac.x);
    vec4 c10 = mix(c010, c110, frac.x);
    vec4 c01 = mix(c001, c101, frac.x);
    vec4 c11 = mix(c011, c111, frac.x);

    vec4 c0 = mix(c00, c10, frac.y);
    vec4 c1 = mix(c01, c11, frac.y);

    return mix(c0, c1, frac.z);
}

// Ray-box intersection against [-1,1]^3. Returns vec2(tEnter, tExit).
// result.y < 0 or result.x > result.y means no intersection.
vec2 intersectBox(vec3 ro, vec3 rd) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (-1.0 - ro) * invRd;
    vec3 t1 = (1.0 - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tEnter = max(max(tmin.x, tmin.y), tmin.z);
    float tExit = min(min(tmax.x, tmax.y), tmax.z);
    if (tEnter > tExit || tExit < 0.0) {
        return vec2(-1.0);
    }
    return vec2(tEnter, tExit);
}

void main() {
    // Square face: uv in [-1,1], 90-degree frustum. Camera at the volume center.
    vec2 res = (fullResolution.x > 0.0) ? fullResolution : resolution;
    vec2 uv = ((gl_FragCoord.xy + tileOffset) - 0.5 * res) / (0.5 * res.y);
    vec3 ro = vec3(0.0);
    vec3 rd = normalize(cubeBasis * vec3(uv.x, -uv.y, 1.0));

    // Front-to-back emission/absorption. NO gamma, NO lighting: the raw field
    // color shows through exactly as sampled.
    vec3 col = vec3(0.0);
    float trans = 1.0;
    vec2 tb = intersectBox(ro, rd);
    if (tb.y > 0.0) {
        float t0 = max(tb.x, 0.0);
        float dt = (tb.y - t0) / float(MAX_STEPS);
        float t = t0;
        for (int i = 0; i < MAX_STEPS; i++) {
            vec4 s = sampleVolume(ro + rd * t);
            float a = 1.0 - exp(-s.r * density * absorption * dt);
            col += trans * a * s.rgb * emission;
            trans *= (1.0 - a);
            if (trans < 0.01) break;
            t += dt;
        }
    }
    vec3 outc = col + bgColor * trans;
    fragColor = vec4(outc, 1.0 - trans + bgAlpha * trans);
    geoOut = vec4(0.5, 0.5, 0.5, 1.0);
}
`,wgsl:`/*
 * Cubemap surface sampler (WGSL) \u2014 renderCubemapSurface
 *
 * Samples a 3D volume (inputTex3d) along the per-face cube camera rays and shows
 * the RAW, TRUE color of the field exactly as sampled \u2014 front-to-back
 * emission/absorption, with NO lighting and NO gamma. (The lit isosurface/voxel
 * "blob in space" view lives in the sibling renderCubemap3d.)
 *
 * The volume's red channel drives per-step opacity; RGB is the emitted color.
 */

@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> volumeSize: i32;
@group(0) @binding(2) var<uniform> cubeBasis: mat3x3<f32>;
@group(0) @binding(3) var<uniform> bgColor: vec3<f32>;
@group(0) @binding(4) var<uniform> bgAlpha: f32;
@group(0) @binding(5) var volumeCache: texture_2d<f32>;
@group(0) @binding(6) var<uniform> tileOffset: vec2<f32>;
@group(0) @binding(7) var<uniform> fullResolution: vec2<f32>;
@group(0) @binding(8) var<uniform> density: f32;
@group(0) @binding(9) var<uniform> absorption: f32;
@group(0) @binding(10) var<uniform> emission: f32;

const MAX_STEPS: i32 = 256;

// MRT output structure for color and geometry buffer
struct FragmentOutput {
    @location(0) color: vec4<f32>,
    @location(1) geoOut: vec4<f32>,
}

// Convert 3D volume coordinates to 2D atlas texel coordinates
fn volumeToAtlas(x: i32, y: i32, z: i32, volSize: i32) -> vec2<i32> {
    return vec2<i32>(x, y + z * volSize);
}

// Sample the cached 3D volume with trilinear interpolation
// World position p is in [-1, 1]^3 (bounding box coordinates)
fn sampleVolume(worldPos: vec3<f32>) -> vec4<f32> {
    let volSize = volumeSize;
    let volSizeF = f32(volSize);

    // Convert world position [-1, 1] to normalized volume coords [0, 1]
    var uvw = worldPos * 0.5 + 0.5;
    uvw = clamp(uvw, vec3<f32>(0.0), vec3<f32>(1.0));

    // Convert to texel coordinates
    let texelPos = uvw * (volSizeF - 1.0);
    let texelFloor = floor(texelPos);
    let frac = texelPos - texelFloor;

    let i0 = vec3<i32>(texelFloor);
    let i1 = min(i0 + 1, vec3<i32>(volSize - 1));

    // Trilinear filtering - load 8 corners
    let c000 = textureLoad(volumeCache, volumeToAtlas(i0.x, i0.y, i0.z, volSize), 0);
    let c100 = textureLoad(volumeCache, volumeToAtlas(i1.x, i0.y, i0.z, volSize), 0);
    let c010 = textureLoad(volumeCache, volumeToAtlas(i0.x, i1.y, i0.z, volSize), 0);
    let c110 = textureLoad(volumeCache, volumeToAtlas(i1.x, i1.y, i0.z, volSize), 0);
    let c001 = textureLoad(volumeCache, volumeToAtlas(i0.x, i0.y, i1.z, volSize), 0);
    let c101 = textureLoad(volumeCache, volumeToAtlas(i1.x, i0.y, i1.z, volSize), 0);
    let c011 = textureLoad(volumeCache, volumeToAtlas(i0.x, i1.y, i1.z, volSize), 0);
    let c111 = textureLoad(volumeCache, volumeToAtlas(i1.x, i1.y, i1.z, volSize), 0);

    // Trilinear interpolation
    let c00 = mix(c000, c100, frac.x);
    let c10 = mix(c010, c110, frac.x);
    let c01 = mix(c001, c101, frac.x);
    let c11 = mix(c011, c111, frac.x);

    let c0 = mix(c00, c10, frac.y);
    let c1 = mix(c01, c11, frac.y);

    return mix(c0, c1, frac.z);
}

// Ray-box intersection against [-1,1]^3. Returns vec2(tEnter, tExit).
// tb.y < 0 or tb.x > tb.y means no intersection.
fn intersectBox(ro: vec3<f32>, rd: vec3<f32>) -> vec2<f32> {
    let invRd = 1.0 / rd;
    let t0 = (-1.0 - ro) * invRd;
    let t1 = (1.0 - ro) * invRd;
    let tmin = min(t0, t1);
    let tmax = max(t0, t1);
    let tEnter = max(max(tmin.x, tmin.y), tmin.z);
    let tExit = min(min(tmax.x, tmax.y), tmax.z);
    if (tEnter > tExit || tExit < 0.0) {
        return vec2<f32>(-1.0);
    }
    return vec2<f32>(tEnter, tExit);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> FragmentOutput {
    // Square face: uv in [-1, 1], 90-degree frustum. Camera at the volume center.
    let res = select(resolution, fullResolution, fullResolution.x > 0.0);
    let uv = ((position.xy + tileOffset) - 0.5 * res) / (0.5 * res.y);
    let ro = vec3<f32>(0.0, 0.0, 0.0);
    let rd = normalize(cubeBasis * vec3<f32>(uv.x, -uv.y, 1.0));

    // Front-to-back emission/absorption. NO gamma, NO lighting: the raw field
    // color shows through exactly as sampled.
    var col = vec3<f32>(0.0);
    var trans = 1.0;
    let tb = intersectBox(ro, rd);
    if (tb.y > 0.0) {
        let t0 = max(tb.x, 0.0);
        let dt = (tb.y - t0) / f32(MAX_STEPS);
        var t = t0;
        for (var i = 0; i < MAX_STEPS; i = i + 1) {
            let s = sampleVolume(ro + rd * t);
            let a = 1.0 - exp(-s.r * density * absorption * dt);
            col = col + trans * a * s.rgb * emission;
            trans = trans * (1.0 - a);
            if (trans < 0.01) { break; }
            t = t + dt;
        }
    }
    let outc = col + bgColor * trans;
    var output: FragmentOutput;
    output.color = vec4<f32>(outc, 1.0 - trans + bgAlpha * trans);
    output.geoOut = vec4<f32>(0.5, 0.5, 0.5, 1.0);
    return output;
}
`}},r=`# RenderCubemapSurface

Samples a 3D volume into seamless cubemap faces, showing the **raw, true color**
of the field exactly as sampled \u2014 front-to-back emission/absorption with no
lighting and no gamma. The camera sits at the volume center and looks out through
a 90-degree frustum per face (\`cubeBasis\`), so adjacent faces share edge
directions and tile without seams. The volume's red channel drives per-step
opacity; RGB is the emitted color.

For a lit isosurface/voxel "blob in space," use \`renderCubemap3d\`.

- **density** \u2014 scales the field's contribution to per-step opacity (\`1 - exp(-field\xB7density\xB7absorption\xB7dt)\`). Higher is thicker.
- **absorption** \u2014 further scales how strongly the medium attenuates along the ray.
- **emission** \u2014 scales how much each sample contributes as emitted color.
- **bg color / bg opacity** \u2014 background behind the volume.

## Usage

\`\`\`
search synth, filter, render

renderCubemapSurface()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(i))t.shaders[o]={...e}}t&&r&&(t.help=r);var u="render/renderCubemapSurface",m="render",f="renderCubemapSurface",v=t;export{v as default,u as effectId,f as effectName,r as help,m as namespace};
