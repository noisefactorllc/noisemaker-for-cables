/* filter/scatter */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Scatter",namespace:"filter",func:"scatter",tags:["noise","artist"],description:"Random per-pixel scatter with darken/lighten/anisotropic/clumped modes (Diffuse, Spatter)",globals:{radius:{type:"float",default:12,uniform:"radius",min:1,max:25,ui:{label:"radius",control:"slider"}},mode:{type:"int",default:0,define:"MODE",choices:{normal:0,darkenOnly:1,lightenOnly:2,anisotropic:3,clumped:4},ui:{label:"mode",control:"dropdown"}},smoothness:{type:"float",default:0,uniform:"smoothness",min:0,max:100,ui:{label:"smoothness",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},textures:{_scatterTmp:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"scatterJitter",program:"scatterJitter",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_scatterTmp"}},{name:"scatterSmooth",program:"scatterSmooth",inputs:{inputTex:"_scatterTmp"},outputs:{fragColor:"outputTex"}}]});var s={scatterJitter:{glsl:`/*
 * Scatter - jitter pass (Diffuse / Spatter / frosted glass).
 * Each pixel samples the input at a random offset within [-radius, radius]
 * px on each axis, drawn from a 2D hash seeded by the pixel's global
 * (tile-aware) coordinate. \`mode\` selects how the offset is derived and how
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

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
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

    vec2 rnd = hash22(hashCoord + float(seed) * 101.7) - 0.5;
    vec2 offset = rnd * 2.0 * radius;

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

    vec2 sampleUV = clamp((gl_FragCoord.xy + offset) / resolution, 0.0, 1.0);

    vec4 src = texture(inputTex, uv);
    vec4 samp = texture(inputTex, sampleUV);

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
 * hash is seeded by the global (tile-aware) coordinate pos.xy + tileOffset so
 * the scatter field stays continuous across CLI render tiles instead of
 * restarting at each tile's local origin. tileOffset is runtime-provided.
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

fn hash22(p: vec2<f32>) -> vec2<f32> {
    var p3 = fract(vec3<f32>(p.xyx) * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.xx + p3.yz) * p3.zy);
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

    // Seed with the global (tile-aware) coordinate, not pos.xy alone, so the
    // scatter field is continuous across CLI render tiles.
    let globalCoord = pos.xy + uniforms.tileOffset;

    // Clumped mode: quantize the hash coordinate to 3px blocks BEFORE
    // hashing so every pixel in a block shares the same random offset.
    var hashCoord = globalCoord;
    if (MODE == 4) {
        hashCoord = floor(globalCoord / 3.0) * 3.0;
    }

    let rnd = hash22(hashCoord + f32(uniforms.seed) * 101.7) - 0.5;
    var offset = rnd * 2.0 * uniforms.radius;

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

    let sampleUV = clamp((pos.xy + offset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));

    let src = textureSample(inputTex, inputSampler, uv);
    let samp = textureSample(inputTex, inputSampler, sampleUV);

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
`}},o=`# scatter

Random per-pixel scatter with darken/lighten/anisotropic/clumped modes (Diffuse, Spatter)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| radius | float | 5 | 1-25 | Maximum scatter distance in pixels; each pixel samples the input at a random offset within [-radius, radius] on each axis |
| mode | int | 0 | normal:0, darkenOnly:1, lightenOnly:2, anisotropic:3, clumped:4 | normal samples at the raw random offset; darkenOnly/lightenOnly take the per-channel min/max of the source and sampled pixel (Diffuse Darken Only / Lighten Only); anisotropic projects the offset onto the direction perpendicular to the local luminance gradient so the scatter smears along edges instead of scattering isotropically (Diffuse Anisotropic), falling back to the raw offset in flat areas; clumped shares one random offset across each 3x3 pixel block, producing blocky clumps of displacement instead of per-pixel grain (Spatter) |
| smoothness | float | 0 | 0-100 | Re-blends the jittered result with a 3x3 tent blur by this fraction; 0 leaves the raw scatter untouched, higher values soften it into smoother frosted streaks (Spatter's Smoothness) |
| seed | int | 1 | 1-100 | Selects a different random scatter pattern; same statistics for any seed value, different per-pixel offsets |

## Notes

- Two passes: \`scatterJitter\` computes the random per-pixel offset and mode dispatch (min/max/projection/quantization), \`scatterSmooth\` re-blends with the tent blur.
- The jitter hash is seeded from the pixel's global (tile-aware) coordinate so the scatter field is continuous across CLI render tiles.
- Covers Diffuse (all four modes) and Spatter (Brush Strokes), plus general frosted-glass looks. Distinct from \`filter/spatter\`, which is an unrelated paint-splat overlay effect.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scatter()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(s))t.shaders[r]={...e}}t&&o&&(t.help=o);var p="filter/scatter",f="filter",c="scatter",d=t;export{d as default,p as effectId,c as effectName,o as help,f as namespace};
