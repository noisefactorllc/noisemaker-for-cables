/* filter/scatter */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Scatter",namespace:"filter",func:"scatter",tags:["noise","artist"],description:"Random per-pixel scatter with darken/lighten/anisotropic/clumped modes (Diffuse, Spatter)",globals:{radius:{type:"float",default:12,uniform:"radius",min:1,max:25,ui:{label:"radius",control:"slider"}},mode:{type:"int",default:0,define:"MODE",choices:{normal:0,darkenOnly:1,lightenOnly:2,anisotropic:3,clumped:4},ui:{label:"mode",control:"dropdown"}},smoothness:{type:"float",default:0,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},textures:{_scatterTmp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"scatterJitter",program:"scatterJitter",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_scatterTmp"}},{name:"scatterSmooth",program:"scatterSmooth",inputs:{inputTex:"_scatterTmp"},outputs:{fragColor:"outputTex"}}]});var r={scatterJitter:{glsl:`/*
 * Scatter - jitter pass (Diffuse / Spatter / frosted glass).
 * Each pixel samples the input at a random offset within [-radius, radius]
 * px on each axis, drawn from an integer hash (PCG3D) of the pixel's global
 * (tile-aware) coordinate and \`seed\`, and reads the input texel nearest that
 * offset position. \`mode\` selects how the offset is derived and how
 * the sampled pixel combines with the source pixel:
 *   normal (0)      - raw random offset; sampled value used directly.
 *   darkenOnly (1)  - raw random offset; min(src, sampled) per channel
 *                     (Diffuse Darken Only).
 *   lightenOnly (2) - raw random offset; max(src, sampled) per channel
 *                     (Diffuse Lighten Only).
 *   anisotropic (3) - the offset is projected onto the direction
 *                     perpendicular to the local luminance gradient, so the
 *                     scatter smears along edges/contours instead of
 *                     scattering isotropically (Diffuse
 *                     Anisotropic). Falls back to the raw offset where the
 *                     local gradient is ~zero (flat regions have no edge
 *                     direction to follow).
 *   clumped (4)     - the hash coordinate is quantized to 3px blocks before
 *                     hashing, so every pixel in a block shares the same
 *                     random offset, producing blocky clumps of shared
 *                     displacement instead of per-pixel grain.
 * scatterSmooth (the second pass) re-blends this pass's output with a 3x3
 * tent blur by \`smoothness\`.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

// MODE is a compile-time define injected by the runtime (see definition.js
// \`globals.mode.define\`), so the compiler drops the dead mode arms below.
#ifndef MODE
#define MODE 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float radius;
uniform int seed;

out vec4 fragColor;

// PCG3D integer hash (Jarzynski & Olano 2020). Unsigned arithmetic wraps the
// same way on every compiler, so WebGL2 and WebGPU draw identical offsets; a
// float hash rounds and fuses differently per compiler and drifts apart.
uvec3 pcg3d(uvec3 v_in) {
    uvec3 v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> uvec3(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Sobel gradient of luminance; used by anisotropic mode to find the local
// edge direction (perpendicular to the gradient = along the edge).
vec2 lumGradient(vec2 uv) {
    vec2 px = 1.0 / resolution;
    float tl = lum(texture(inputTex, uv + px * vec2(-1.0,  1.0)).rgb);
    float  l = lum(texture(inputTex, uv + px * vec2(-1.0,  0.0)).rgb);
    float bl = lum(texture(inputTex, uv + px * vec2(-1.0, -1.0)).rgb);
    float tr = lum(texture(inputTex, uv + px * vec2( 1.0,  1.0)).rgb);
    float  r = lum(texture(inputTex, uv + px * vec2( 1.0,  0.0)).rgb);
    float br = lum(texture(inputTex, uv + px * vec2( 1.0, -1.0)).rgb);
    float  t = lum(texture(inputTex, uv + px * vec2( 0.0,  1.0)).rgb);
    float  b = lum(texture(inputTex, uv + px * vec2( 0.0, -1.0)).rgb);
    return vec2(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    ivec2 texel = ivec2(gl_FragCoord.xy);
    ivec2 texSize = textureSize(inputTex, 0);

    // Seed with the global (tile-aware) coordinate, not gl_FragCoord.xy
    // alone, so the scatter field is continuous across CLI render tiles
    // instead of restarting at each tile's local origin.
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;

    // Clumped mode: quantize the hash coordinate to 3px blocks BEFORE
    // hashing so every pixel in a block shares the same random offset.
    vec2 hashCoord = globalCoord;
    #if MODE == 4
        hashCoord = floor(globalCoord / 3.0) * 3.0;
    #endif

    uvec3 h = pcg3d(uvec3(uvec2(ivec2(floor(hashCoord))), uint(seed)));

    // Offset in 1/256 px steps, in [-radius, radius) on each axis: the top 16
    // hash bits scale the span 2 * radius * 256 in integers. radius * 256 is
    // exact; the 128 px cap (far above the 25 px slider maximum) keeps the
    // product within 32 bits.
    uint r256 = uint(min(abs(radius), 128.0) * 256.0);
    uvec2 steps = ((h.xy >> uvec2(16u)) * (2u * r256)) >> uvec2(16u);
    vec2 offset = vec2(ivec2(steps) - int(r256)) / 256.0;

    #if MODE == 3
        // Anisotropic: project the offset onto the direction perpendicular
        // to the local luminance gradient (edge-following smear).
        vec2 grad = lumGradient(uv);
        float gradLen = length(grad);
        if (gradLen > 1e-5) {
            vec2 perp = vec2(-grad.y, grad.x) / gradLen;
            offset = dot(offset, perp) * perp;
        }
        // else: gradient ~zero (flat region) -- fall back to raw offset.
    #endif

    // Read the texel nearest the offset sample position, clamped to the edge.
    // Outside anisotropic mode the offset is a multiple of 1/256, so
    // offset + 0.5 and its floor are exact on both backends.
    ivec2 sampleTexel = clamp(texel + ivec2(floor(offset + 0.5)), ivec2(0), texSize - 1);

    vec4 src = texelFetch(inputTex, texel, 0);
    vec4 samp = texelFetch(inputTex, sampleTexel, 0);

    vec4 result = samp;
    #if MODE == 1
        result = min(src, samp);
    #elif MODE == 2
        result = max(src, samp);
    #endif

    fragColor = result;
}
`,wgsl:`/*
 * Scatter - jitter pass (Diffuse / Spatter / frosted glass).
 * See scatterJitter.glsl for the full mode-dispatch description. The jitter
 * hash (PCG3D, integer, so it matches WebGL2 exactly) is seeded by the
 * global (tile-aware) coordinate pos.xy + tileOffset so the scatter field
 * stays continuous across CLI render tiles instead of restarting at each
 * tile's local origin. tileOffset is runtime-provided.
 */

// MODE is a runtime-injected module-scope const (injectDefines); Dawn/naga
// constant-fold the mode dispatch so only the active arm survives compilation.
struct Uniforms {
    radius: f32,
    seed: i32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// PCG3D integer hash (Jarzynski & Olano 2020); see scatterJitter.glsl.
fn pcg3d(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// Sobel gradient of luminance; used by anisotropic mode to find the local
// edge direction (perpendicular to the gradient = along the edge).
fn lumGradient(uv: vec2<f32>) -> vec2<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let px = 1.0 / texSize;
    let tl = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  1.0)).rgb);
    let l  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0,  0.0)).rgb);
    let bl = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>(-1.0, -1.0)).rgb);
    let tr = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  1.0)).rgb);
    let r  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0,  0.0)).rgb);
    let br = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 1.0, -1.0)).rgb);
    let t  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 0.0,  1.0)).rgb);
    let b  = lum(textureSample(inputTex, inputSampler, uv + px * vec2<f32>( 0.0, -1.0)).rgb);
    return vec2<f32>(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                      tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = vec2<i32>(pos.xy);
    let texSizeI = vec2<i32>(textureDimensions(inputTex));

    // Seed with the global (tile-aware) coordinate, not pos.xy alone, so the
    // scatter field is continuous across CLI render tiles.
    let globalCoord = pos.xy + uniforms.tileOffset;

    // Clumped mode: quantize the hash coordinate to 3px blocks BEFORE
    // hashing so every pixel in a block shares the same random offset.
    var hashCoord = globalCoord;
    if (MODE == 4) {
        hashCoord = floor(globalCoord / 3.0) * 3.0;
    }

    let h = pcg3d(vec3<u32>(vec2<u32>(vec2<i32>(floor(hashCoord))), u32(uniforms.seed)));

    // Offset in 1/256 px steps, in [-radius, radius) on each axis; see
    // scatterJitter.glsl.
    let r256 = u32(min(abs(uniforms.radius), 128.0) * 256.0);
    let steps = ((h.xy >> vec2<u32>(16u)) * (2u * r256)) >> vec2<u32>(16u);
    var offset = vec2<f32>(vec2<i32>(steps) - i32(r256)) / 256.0;

    if (MODE == 3) {
        // Anisotropic: project the offset onto the direction perpendicular
        // to the local luminance gradient (edge-following smear).
        let grad = lumGradient(uv);
        let gradLen = length(grad);
        if (gradLen > 1e-5) {
            let perp = vec2<f32>(-grad.y, grad.x) / gradLen;
            offset = dot(offset, perp) * perp;
        }
        // else: gradient ~zero (flat region) -- fall back to raw offset.
    }

    // Read the texel nearest the offset sample position, clamped to the edge.
    let sampleTexel = clamp(texel + vec2<i32>(floor(offset + 0.5)), vec2<i32>(0), texSizeI - 1);

    let src = textureLoad(inputTex, texel, 0);
    let samp = textureLoad(inputTex, sampleTexel, 0);

    var result = samp;
    if (MODE == 1) {
        result = min(src, samp);
    } else if (MODE == 2) {
        result = max(src, samp);
    }

    return result;
}
`},scatterSmooth:{glsl:`/*
 * Scatter - smooth pass: re-blends the jittered result from scatterJitter
 * with a 3x3 tent blur, mixed in by smoothness/100 (Spatter's
 * Smoothness parameter). smoothness = 0 leaves the pure per-pixel jitter
 * untouched; higher values soften the granular scatter into smoother
 * frosted streaks.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float smoothness;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texel = 1.0 / resolution;

    vec4 src = texture(inputTex, uv);

    // 3x3 tent kernel: weight (2 - |x|) * (2 - |y|) for x, y in {-1, 0, 1},
    // giving weights 1/2/1 / 2/4/2 / 1/2/1 (sum 16).
    vec4 sum = vec4(0.0);
    float wsum = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            float w = (2.0 - abs(float(x))) * (2.0 - abs(float(y)));
            sum += texture(inputTex, uv + vec2(float(x), float(y)) * texel) * w;
            wsum += w;
        }
    }
    vec4 blurred = sum / wsum;

    fragColor = mix(src, blurred, clamp(smoothness / 100.0, 0.0, 1.0));
}
`,wgsl:`/*
 * Scatter - smooth pass: re-blends the jittered result from scatterJitter
 * with a 3x3 tent blur, mixed in by smoothness/100 (Spatter's
 * Smoothness parameter). smoothness = 0 leaves the pure per-pixel jitter
 * untouched; higher values soften the granular scatter into smoother
 * frosted streaks.
 */

struct Uniforms {
    smoothness: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texel = 1.0 / texSize;

    let src = textureSample(inputTex, inputSampler, uv);

    // 3x3 tent kernel: weight (2 - |x|) * (2 - |y|) for x, y in {-1, 0, 1},
    // giving weights 1/2/1 / 2/4/2 / 1/2/1 (sum 16).
    var sum = vec4<f32>(0.0);
    var wsum = 0.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let w = (2.0 - abs(f32(x))) * (2.0 - abs(f32(y)));
            sum += textureSample(inputTex, inputSampler, uv + vec2<f32>(f32(x), f32(y)) * texel) * w;
            wsum += w;
        }
    }
    let blurred = sum / wsum;

    return mix(src, blurred, clamp(uniforms.smoothness / 100.0, 0.0, 1.0));
}
`}},i=`# scatter

Random per-pixel scatter with darken/lighten/anisotropic/clumped modes (Diffuse, Spatter)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| radius | float | 12 | 1-25 | The radius sets the maximum scatter distance in pixels. Each pixel samples the nearest input texel at a random offset within [-radius, radius] on each axis |
| mode | int | 0 | normal:0, darkenOnly:1, lightenOnly:2, anisotropic:3, clumped:4 | normal samples at the raw random offset; darkenOnly/lightenOnly take the per-channel min/max of the source and sampled pixel (Diffuse Darken Only / Lighten Only); anisotropic projects the offset onto the direction perpendicular to the local luminance gradient so the scatter smears along edges instead of scattering isotropically (Diffuse Anisotropic), falling back to the raw offset in flat areas; clumped shares one random offset across each 3x3 pixel block, producing blocky clumps of displacement instead of per-pixel grain (Spatter) |
| smoothness | float | 0 | 0-100 | Re-blends the jittered result with a 3x3 tent blur by this fraction; 0 leaves the raw scatter untouched, higher values soften it into smoother frosted streaks (Spatter's Smoothness) |
| seed | int | 1 | 1-100 | Selects a different random scatter pattern; same statistics for any seed value, different per-pixel offsets |

## Notes

- Two passes: \`scatterJitter\` computes the random per-pixel offset and mode dispatch (min/max/projection/quantization), \`scatterSmooth\` re-blends with the tent blur.
- The jitter hash uses each pixel's global (tile-aware) coordinate and the seed, so the scatter field stays continuous across CLI render tiles. It uses PCG3D integer hashes, so WebGL2 and WebGPU produce identical offsets.
- Covers Diffuse (all four modes) and Spatter (Brush Strokes), plus general frosted-glass looks. Distinct from \`filter/spatter\`, which is an unrelated paint-splat overlay effect.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scatter()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[s,e]of Object.entries(r))t.shaders[s]={...e}}t&&i&&(t.help=i);var p="filter/scatter",d="filter",f="scatter",c=t;export{c as default,p as effectId,f as effectName,i as help,d as namespace};
