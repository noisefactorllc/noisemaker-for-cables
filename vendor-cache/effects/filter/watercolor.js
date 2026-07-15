/* filter/watercolor */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Watercolor",namespace:"filter",func:"watercolor",tags:["blur","edges","artist"],description:"Simplified color washes with pigment pooling at edges and paper granulation",globals:{detail:{type:"float",default:50,uniform:"detail",min:0,max:100,ui:{label:"detail",control:"slider"}},shadowIntensity:{type:"float",default:40,uniform:"shadowIntensity",min:0,max:100,ui:{label:"shadow intensity",control:"slider"}},paperTexture:{type:"float",default:30,uniform:"paperTexture",min:0,max:100,ui:{label:"paper texture",control:"slider"}}},textures:{global_wc_state:{width:"input",height:"input",format:"rgba16f"}},passes:[{name:"seed",program:"wcSeed",inputs:{inputTex:"inputTex"},outputs:{fragColor:"global_wc_state"}},{name:"wcSimplify",program:"wcSimplify",repeat:2,inputs:{inputTex:"global_wc_state"},outputs:{fragColor:"global_wc_state"}},{name:"wcComposite",program:"wcComposite",inputs:{inputTex:"inputTex",simplifiedTex:"global_wc_state"},outputs:{fragColor:"outputTex"}}]});var r={wcComposite:{glsl:`/*
 * Watercolor - composite pass: pigment pooling, paper granulation, warm
 * paper tint, and a flat-wash lift applied on top of the median-simplified
 * color washes (global_wc_state, produced by the seed + wcSimplify passes).
 *
 * edge = Sobel gradient luminance-gradient magnitude computed ON THE SIMPLIFIED texture
 * (not the original input), so pigment darkens along the boundaries of the
 * SIMPLIFIED regions -- the same region edges a real wash would pool
 * against -- rather than every high-frequency detail in the source.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D simplifiedTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform float shadowIntensity;
uniform float paperTexture;

out vec4 fragColor;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Sobel gradient gradient, applied to the SIMPLIFIED texture (pigment pooling edges).
vec2 lumGradientSimplified(vec2 uv) {
    vec2 px = 1.0 / resolution;
    float tl = lum(texture(simplifiedTex, uv + px * vec2(-1.0,  1.0)).rgb);
    float  l = lum(texture(simplifiedTex, uv + px * vec2(-1.0,  0.0)).rgb);
    float bl = lum(texture(simplifiedTex, uv + px * vec2(-1.0, -1.0)).rgb);
    float tr = lum(texture(simplifiedTex, uv + px * vec2( 1.0,  1.0)).rgb);
    float  r = lum(texture(simplifiedTex, uv + px * vec2( 1.0,  0.0)).rgb);
    float br = lum(texture(simplifiedTex, uv + px * vec2( 1.0, -1.0)).rgb);
    float  t = lum(texture(simplifiedTex, uv + px * vec2( 0.0,  1.0)).rgb);
    float  b = lum(texture(simplifiedTex, uv + px * vec2( 0.0, -1.0)).rgb);
    return vec2(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 src = texture(inputTex, uv);
    vec3 simplified = texture(simplifiedTex, uv).rgb;

    float edge = length(lumGradientSimplified(uv));

    // Pigment pooling: darken along simplified-region boundaries, the way
    // watercolor pigment collects and dries darker at the edge of a wet wash.
    float pool = shadowIntensity / 100.0 * 0.7 * smoothstep(0.05, 0.4, edge);
    vec3 c = simplified * (1.0 - pool);

    // Paper granulation: hash/noise coordinate is the integer, tile-aware
    // global pixel index so the grain
    // aligns across GL/WGPU and across render tiles. Both the grain
    // strength and the warm paper tint are gated by paperTexture, so
    // paperTexture=0 yields a smooth, untinted wash and paperTexture=100
    // is full grain plus full tint.
    vec2 gc = floor(gl_FragCoord.xy) + tileOffset;
    c *= mix(1.0, 0.92 + 0.08 * vnoise(gc / 3.5), clamp(paperTexture, 0.0, 100.0) / 100.0);
    c = mix(c, c * vec3(1.02, 1.0, 0.95), paperTexture / 100.0);

    // Wash lift: on flat washes (edge near 0, i.e. far from any
    // pigment-pooled boundary) lift the color very slightly toward its own
    // luminance (desaturate) and brighten a touch, as if the pigment thinned
    // out there and let the white paper glow through -- the complement of
    // the pooling darkening above, strongest exactly where pooling is
    // weakest (same \`edge\` field, inverted falloff).
    float flatness = 1.0 - smoothstep(0.0, 0.15, edge);
    c = mix(c, vec3(lum(c)), flatness * 0.12);
    c *= 1.0 + flatness * 0.05;

    fragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`,wgsl:`/*
 * Watercolor - composite pass: pigment pooling, paper granulation, warm
 * paper tint, and a flat-wash lift. See glsl/wcComposite.glsl for the full
 * algorithm description. The paper-granulation hash is seeded from the
 * tile-aware global pixel coordinate (floor(pos.xy) + uniforms.tileOffset),
 * matching GLSL's floor(gl_FragCoord.xy) + tileOffset exactly, so the grain
 * pattern stays seamless across CLI render tiles instead of restarting at
 * each tile's local origin.
 */

struct Uniforms {
    shadowIntensity: f32,
    paperTexture: f32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var simplifiedTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2<f32>(1.0, 0.0)), u.x),
               mix(hash12(i + vec2<f32>(0.0, 1.0)), hash12(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// Sobel gradient gradient, applied to the SIMPLIFIED texture (pigment pooling edges).
fn lumGradientSimplified(uv: vec2<f32>) -> vec2<f32> {
    let texSize = vec2<f32>(textureDimensions(simplifiedTex));
    let px = 1.0 / texSize;
    let tl = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>(-1.0,  1.0)).rgb);
    let l  = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>(-1.0,  0.0)).rgb);
    let bl = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>(-1.0, -1.0)).rgb);
    let tr = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>( 1.0,  1.0)).rgb);
    let r  = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>( 1.0,  0.0)).rgb);
    let br = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>( 1.0, -1.0)).rgb);
    let t  = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>( 0.0,  1.0)).rgb);
    let b  = lum(textureSample(simplifiedTex, inputSampler, uv + px * vec2<f32>( 0.0, -1.0)).rgb);
    return vec2<f32>(tr + 2.0 * r + br - tl - 2.0 * l - bl,
                      tl + 2.0 * t + tr - bl - 2.0 * b - br);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let src = textureSample(inputTex, inputSampler, uv);
    let simplified = textureSample(simplifiedTex, inputSampler, uv).rgb;

    let edge = length(lumGradientSimplified(uv));

    // Pigment pooling: darken along simplified-region boundaries, the way
    // watercolor pigment collects and dries darker at the edge of a wet wash.
    let pool = uniforms.shadowIntensity / 100.0 * 0.7 * smoothstep(0.05, 0.4, edge);
    var c = simplified * (1.0 - pool);

    // Paper granulation: hash/noise coordinate is the integer, tile-aware
    // global pixel index so the grain
    // aligns across GL/WGPU and across render tiles. Both the grain
    // strength and the warm paper tint are gated by paperTexture, so
    // paperTexture=0 yields a smooth, untinted wash and paperTexture=100
    // is full grain plus full tint.
    let gc = floor(pos.xy) + uniforms.tileOffset;
    c *= mix(1.0, 0.92 + 0.08 * vnoise(gc / 3.5), clamp(uniforms.paperTexture, 0.0, 100.0) / 100.0);
    c = mix(c, c * vec3<f32>(1.02, 1.0, 0.95), uniforms.paperTexture / 100.0);

    // Wash lift: on flat washes (edge near 0) lift the color very slightly
    // toward its own luminance (desaturate) and brighten a touch, as if the
    // pigment thinned out there and let the white paper glow through --
    // complement of the pooling darkening above, same \`edge\` field with an
    // inverted falloff.
    let flatness = 1.0 - smoothstep(0.0, 0.15, edge);
    c = mix(c, vec3<f32>(lum(c)), flatness * 0.12);
    c *= 1.0 + flatness * 0.05;

    return vec4<f32>(clamp(c, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`},wcSeed:{glsl:`/*
 * Watercolor - seed pass: copies the source image into the ping-pong state
 * texture before the iterated stride-median simplify passes run.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(inputTex, uv);
}
`,wgsl:`/*
 * Watercolor - seed pass: copies the source image into the ping-pong state
 * texture before the iterated stride-median simplify passes run.
 */

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    return textureSample(inputTex, inputSampler, uv);
}
`},wcSimplify:{glsl:`/*
 * Watercolor - simplify pass: 3x3 median network (Devillard opt_med9, the
 * same 19-op compare-exchange sequence as filter/median's medianPass.glsl)
 * sampled at a pixel stride that widens as \`detail\` decreases -- a wider
 * stride pulls the 9 taps from farther apart, producing a coarser
 * simplification (bigger flattened washes); detail=100 samples the tight
 * 1px neighborhood (finest simplification). Executed twice per frame
 * (fixed \`repeat: 2\` in definition.js), ping-ponging the global_wc_state
 * surface exactly like filter/median's medianPass ping-pongs
 * global_median_state -- the second pass composes on top of the first
 * pass's already-simplified result.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float detail;

out vec4 fragColor;

void sort2(inout vec3 a, inout vec3 b) {
    vec3 lo = min(a, b);
    vec3 hi = max(a, b);
    a = lo;
    b = hi;
}

void main() {
    // detail=0 -> stride 3px (coarse); detail=100 -> stride 1px (fine).
    float stride = mix(3.0, 1.0, clamp(detail, 0.0, 100.0) / 100.0);
    vec2 texel = stride / resolution;
    vec2 uv = gl_FragCoord.xy / resolution;

    vec4 s0 = texture(inputTex, uv + vec2(-texel.x, -texel.y));
    vec4 s1 = texture(inputTex, uv + vec2(0.0, -texel.y));
    vec4 s2 = texture(inputTex, uv + vec2(texel.x, -texel.y));
    vec4 s3 = texture(inputTex, uv + vec2(-texel.x, 0.0));
    vec4 s4 = texture(inputTex, uv);
    vec4 s5 = texture(inputTex, uv + vec2(texel.x, 0.0));
    vec4 s6 = texture(inputTex, uv + vec2(-texel.x, texel.y));
    vec4 s7 = texture(inputTex, uv + vec2(0.0, texel.y));
    vec4 s8 = texture(inputTex, uv + vec2(texel.x, texel.y));

    vec3 p0 = s0.rgb; vec3 p1 = s1.rgb; vec3 p2 = s2.rgb;
    vec3 p3 = s3.rgb; vec3 p4 = s4.rgb; vec3 p5 = s5.rgb;
    vec3 p6 = s6.rgb; vec3 p7 = s7.rgb; vec3 p8 = s8.rgb;

    sort2(p1, p2); sort2(p4, p5); sort2(p7, p8);
    sort2(p0, p1); sort2(p3, p4); sort2(p6, p7);
    sort2(p1, p2); sort2(p4, p5); sort2(p7, p8);
    sort2(p0, p3); sort2(p5, p8); sort2(p4, p7);
    sort2(p3, p6); sort2(p1, p4); sort2(p2, p5);
    sort2(p4, p7); sort2(p4, p2); sort2(p6, p4);
    sort2(p4, p2);

    fragColor = vec4(p4, s4.a);
}
`,wgsl:`/*
 * Watercolor - simplify pass: 3x3 median network (Devillard opt_med9, the
 * same 19-op compare-exchange sequence as filter/median's medianPass.wgsl)
 * sampled at a pixel stride that widens as \`detail\` decreases. See
 * glsl/wcSimplify.glsl for the full description. Executed twice per frame
 * (fixed \`repeat: 2\` in definition.js), ping-ponging global_wc_state.
 */

struct Uniforms {
    detail: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn sort2(a: ptr<function, vec3<f32>>, b: ptr<function, vec3<f32>>) {
    let lo = min(*a, *b);
    let hi = max(*a, *b);
    *a = lo;
    *b = hi;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    // detail=0 -> stride 3px (coarse); detail=100 -> stride 1px (fine).
    let stride = mix(3.0, 1.0, clamp(uniforms.detail, 0.0, 100.0) / 100.0);
    let texel = stride / texSize;
    let uv = pos.xy / texSize;

    let s0 = textureSample(inputTex, inputSampler, uv + vec2<f32>(-texel.x, -texel.y));
    let s1 = textureSample(inputTex, inputSampler, uv + vec2<f32>(0.0, -texel.y));
    let s2 = textureSample(inputTex, inputSampler, uv + vec2<f32>(texel.x, -texel.y));
    let s3 = textureSample(inputTex, inputSampler, uv + vec2<f32>(-texel.x, 0.0));
    let s4 = textureSample(inputTex, inputSampler, uv);
    let s5 = textureSample(inputTex, inputSampler, uv + vec2<f32>(texel.x, 0.0));
    let s6 = textureSample(inputTex, inputSampler, uv + vec2<f32>(-texel.x, texel.y));
    let s7 = textureSample(inputTex, inputSampler, uv + vec2<f32>(0.0, texel.y));
    let s8 = textureSample(inputTex, inputSampler, uv + vec2<f32>(texel.x, texel.y));

    var p0 = s0.rgb; var p1 = s1.rgb; var p2 = s2.rgb;
    var p3 = s3.rgb; var p4 = s4.rgb; var p5 = s5.rgb;
    var p6 = s6.rgb; var p7 = s7.rgb; var p8 = s8.rgb;

    sort2(&p1, &p2); sort2(&p4, &p5); sort2(&p7, &p8);
    sort2(&p0, &p1); sort2(&p3, &p4); sort2(&p6, &p7);
    sort2(&p1, &p2); sort2(&p4, &p5); sort2(&p7, &p8);
    sort2(&p0, &p3); sort2(&p5, &p8); sort2(&p4, &p7);
    sort2(&p3, &p6); sort2(&p1, &p4); sort2(&p2, &p5);
    sort2(&p4, &p7); sort2(&p4, &p2); sort2(&p6, &p4);
    sort2(&p4, &p2);

    return vec4<f32>(p4, s4.a);
}
`}},a="# watercolor\n\nSimplified color washes with pigment pooling at edges and paper granulation.\n\n## Parameters\n\n| Parameter | Type | Default | Range | Description |\n|-----------|------|---------|-------|-------------|\n| detail | float | 50 | 0-100 | Inverse simplify radius: lower values sample the median network at a wider pixel stride, producing coarser, larger washes; higher values stay closer to a tight 1px median |\n| shadowIntensity | float | 40 | 0-100 | Strength of the dark pigment pooling applied along simplified-region boundaries |\n| paperTexture | float | 30 | 0-100 | Strength of the paper grain warm tint mixed into the result |\n\n## Notes\n\n- Implements a simplified take on Watercolor filter: a windowed-median wash simplification (same 3x3 sort network as `filter/median`, sampled at a `detail`-scaled stride) followed by edge-seeking pigment pooling, paper granulation, and a warm paper tint.\n- Three-pass topology: `wcSeed` copies the source into a `global_wc_state` ping-pong surface; `wcSimplify` runs twice (fixed `repeat: 2`), each iteration re-applying the stride median network to the previous iteration's result; `wcComposite` reads the simplified washes plus the original source and builds the final look.\n- Pigment pooling darkens color by up to `shadowIntensity / 100 * 0.7` where the simplified-texture gradient magnitude is high (region boundaries), using a `smoothstep(0.05, 0.4, edge)` falloff.\n- Paper granulation mixes between flat (no grain) and a `0.92-1.0` value-noise field (tile-aware integer pixel coordinates) by `paperTexture / 100`, then mixes the result toward a warm tint (`vec3(1.02, 1.0, 0.95)`) by the same `paperTexture / 100` -- so `paperTexture = 0` is a smooth, untinted wash and `paperTexture = 100` is full grain plus full tint.\n- A subtle \"wash lift\" brightens and slightly desaturates flat regions (low gradient magnitude) using the same `edge` value with an inverted falloff, over its own `smoothstep(0.0, 0.15, edge)` band -- narrower than pigment pooling's `smoothstep(0.05, 0.4, edge)` band, so the two ramps overlap but are not identical -- the complement of the pigment pooling darkening, so flats and pooled edges read as opposite ends of one continuum.\n- Alpha is passed through from the source image unchanged.\n\n## Usage\n\n```\nsearch filter, synth\n\nnoise(seed: 1, ridges: true)\n  .watercolor()\n  .write(o0)\n\nrender(o0)\n```\n";if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(r))t.shaders[i]={...e}}t&&a&&(t.help=a);var u="filter/watercolor",f="filter",d="watercolor",m=t;export{m as default,u as effectId,d as effectName,a as help,f as namespace};
