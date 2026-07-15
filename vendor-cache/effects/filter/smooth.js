/* filter/smooth */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Smooth",namespace:"filter",func:"smooth",tags:["antialiasing"],description:"Anti-aliasing with MSAA, SMAA, or edge-selective blur modes",globals:{type:{type:"int",default:0,uniform:"smoothType",choices:{msaa:0,smaa:1,blur:2},ui:{label:"type",control:"dropdown"}},strength:{type:"float",default:1,uniform:"strength",min:0,max:1,zero:0,ui:{label:"strength",control:"slider"}},threshold:{type:"float",default:.1,uniform:"threshold",min:0,max:1,ui:{label:"threshold",control:"slider"}},radius:{type:"float",default:2,uniform:"radius",min:.5,max:4,step:.1,ui:{label:"radius",control:"slider"}},samples:{type:"int",default:4,uniform:"samples",choices:{x2:2,x4:4,x8:8},ui:{label:"samples",control:"dropdown",enabledBy:{param:"type",eq:0}}},searchSteps:{type:"int",default:8,uniform:"searchSteps",min:1,max:32,step:1,ui:{label:"search steps",control:"slider",enabledBy:{param:"type",eq:1}}}},defaultProgram:`search filter, synth

modPattern()
.smooth(type: blur, radius: 4)
.write(o0)`,textures:{_smoothEdges:{width:"input",height:"input",format:"rgba8unorm"}},passes:[{name:"smoothEdge",program:"smoothEdge",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_smoothEdges"}},{name:"smoothBlend",program:"smoothBlend",inputs:{inputTex:"inputTex",edgeTex:"_smoothEdges"},outputs:{fragColor:"outputTex"}}]});var r={smoothBlend:{glsl:`/*
 * Smooth - Blending Pass
 * MSAA mode: multi-sample supersampling with scalable radius
 * SMAA mode: morphological blending with improved edge-aware weights
 * Blur mode: edge-selective Gaussian blur
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform sampler2D edgeTex;
uniform int smoothType;
uniform float strength;
uniform float threshold;
uniform float radius;
uniform int samples;
uniform int searchSteps;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.299, 0.587, 0.114);

float luminance(vec3 rgb) {
    return dot(rgb, LUMA_WEIGHTS);
}

// Manual bilinear interpolation (WebGL2 textures use NEAREST filtering)
vec4 sampleBilinear(vec2 uv, ivec2 texSize) {
    vec2 texCoord = uv * vec2(texSize) - 0.5;
    ivec2 base = ivec2(floor(texCoord));
    vec2 f = texCoord - vec2(base);
    ivec2 maxC = texSize - 1;

    vec4 tl = texelFetch(inputTex, clamp(base, ivec2(0), maxC), 0);
    vec4 tr = texelFetch(inputTex, clamp(base + ivec2(1, 0), ivec2(0), maxC), 0);
    vec4 bl = texelFetch(inputTex, clamp(base + ivec2(0, 1), ivec2(0), maxC), 0);
    vec4 br = texelFetch(inputTex, clamp(base + ivec2(1, 1), ivec2(0), maxC), 0);

    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

// --- MSAA: rotated grid sample offsets ---

vec2 sampleOffset2x(int i) {
    if (i == 0) return vec2(-0.25, 0.25);
    return vec2(0.25, -0.25);
}

vec2 sampleOffset4x(int i) {
    if (i == 0) return vec2(-0.125, -0.375);
    if (i == 1) return vec2( 0.375, -0.125);
    if (i == 2) return vec2(-0.375,  0.125);
    return vec2( 0.125,  0.375);
}

vec2 sampleOffset8x(int i) {
    if (i == 0) return vec2(-0.375, -0.375);
    if (i == 1) return vec2( 0.125, -0.375);
    if (i == 2) return vec2(-0.125, -0.125);
    if (i == 3) return vec2( 0.375, -0.125);
    if (i == 4) return vec2(-0.375,  0.125);
    if (i == 5) return vec2( 0.125,  0.125);
    if (i == 6) return vec2(-0.125,  0.375);
    return vec2( 0.375,  0.375);
}

vec2 getSampleOffset(int i, int count) {
    if (count <= 2) return sampleOffset2x(i);
    if (count <= 4) return sampleOffset4x(i);
    return sampleOffset8x(i);
}

vec4 msaaBlend(vec2 uv, vec2 texelSize, ivec2 texSize) {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 maxC = texSize - 1;
    vec4 center = texelFetch(inputTex, coord, 0);

    // Threshold check: skip AA for low-contrast pixels
    float L = luminance(center.rgb);
    float Ln = luminance(texelFetch(inputTex, clamp(coord + ivec2(0, -1), ivec2(0), maxC), 0).rgb);
    float Ls = luminance(texelFetch(inputTex, clamp(coord + ivec2(0,  1), ivec2(0), maxC), 0).rgb);
    float Lw = luminance(texelFetch(inputTex, clamp(coord + ivec2(-1, 0), ivec2(0), maxC), 0).rgb);
    float Le = luminance(texelFetch(inputTex, clamp(coord + ivec2( 1, 0), ivec2(0), maxC), 0).rgb);

    float maxDiff = max(max(abs(L - Ln), abs(L - Ls)),
                        max(abs(L - Lw), abs(L - Le)));

    if (maxDiff < threshold) {
        return center;
    }

    // Supersample at radius-scaled offsets with manual bilinear interpolation
    vec4 sum = vec4(0.0);
    int count = samples;
    for (int i = 0; i < 8; i++) {
        if (i >= count) break;
        vec2 offset = getSampleOffset(i, count) * radius;
        sum += sampleBilinear(uv + offset * texelSize, texSize);
    }
    return sum / float(count);
}

// --- SMAA: morphological edge search and blending ---

float searchEdge(ivec2 coord, ivec2 dir, ivec2 maxC, int component) {
    for (int i = 1; i <= 32; i++) {
        if (i > searchSteps) break;
        ivec2 sampleCoord = clamp(coord + dir * i, ivec2(0), maxC);
        float edge = (component == 0) ? texelFetch(edgeTex, sampleCoord, 0).r
                                      : texelFetch(edgeTex, sampleCoord, 0).g;
        if (edge < 0.5) {
            return float(i - 1);
        }
    }
    return float(searchSteps);
}

vec4 smaaBlend(ivec2 texSize) {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 maxC = texSize - 1;
    vec4 edges = texelFetch(edgeTex, coord, 0);
    float edgeH = edges.r;
    float edgeV = edges.g;

    vec4 center = texelFetch(inputTex, coord, 0);
    if (edgeH < 0.5 && edgeV < 0.5) {
        return center;
    }

    vec4 blended = center;

    // Horizontal edge: search left/right, blend with vertical neighbor
    if (edgeH > 0.5) {
        float distLeft  = searchEdge(coord, ivec2(-1, 0), maxC, 0);
        float distRight = searchEdge(coord, ivec2( 1, 0), maxC, 0);
        float edgeLength = distLeft + distRight + 1.0;

        // Stronger blend for shorter edges (more jaggy), scaled by radius
        float weight = clamp(radius * 0.5 / sqrt(edgeLength), 0.0, 0.5);

        vec4 neighbor = texelFetch(inputTex, clamp(coord + ivec2(0, 1), ivec2(0), maxC), 0);
        blended = mix(blended, neighbor, weight);
    }

    // Vertical edge: search up/down, blend with horizontal neighbor
    if (edgeV > 0.5) {
        float distUp   = searchEdge(coord, ivec2(0, -1), maxC, 1);
        float distDown = searchEdge(coord, ivec2(0,  1), maxC, 1);
        float edgeLength = distUp + distDown + 1.0;

        float weight = clamp(radius * 0.5 / sqrt(edgeLength), 0.0, 0.5);

        vec4 neighbor = texelFetch(inputTex, clamp(coord + ivec2(1, 0), ivec2(0), maxC), 0);
        blended = mix(blended, neighbor, weight);
    }

    return blended;
}

// --- Blur: edge-selective Gaussian ---

vec4 edgeBlur(ivec2 texSize) {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 maxC = texSize - 1;
    vec4 edges = texelFetch(edgeTex, coord, 0);

    vec4 center = texelFetch(inputTex, coord, 0);
    if (edges.r < 0.5 && edges.g < 0.5) {
        return center;
    }

    int r = int(ceil(radius));
    float sigma = radius * 0.5;
    float sigma2 = 2.0 * sigma * sigma;

    vec4 sum = center;
    float totalWeight = 1.0;

    for (int dy = -4; dy <= 4; dy++) {
        for (int dx = -4; dx <= 4; dx++) {
            if (dx == 0 && dy == 0) continue;
            if (abs(dx) > r || abs(dy) > r) continue;

            float d = float(dx * dx + dy * dy);
            float w = exp(-d / sigma2);

            sum += texelFetch(inputTex, clamp(coord + ivec2(dx, dy), ivec2(0), maxC), 0) * w;
            totalWeight += w;
        }
    }

    return sum / totalWeight;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    vec2 texelSize = 1.0 / vec2(texSize);

    vec4 original = texelFetch(inputTex, ivec2(gl_FragCoord.xy), 0);
    vec4 result;

    if (smoothType == 0) {
        result = msaaBlend(uv, texelSize, texSize);
    } else if (smoothType == 1) {
        result = smaaBlend(texSize);
    } else {
        result = edgeBlur(texSize);
    }

    fragColor = mix(original, result, strength);
}
`,wgsl:`/*
 * Smooth - Blending Pass
 * MSAA mode: multi-sample supersampling with scalable radius
 * SMAA mode: morphological blending with improved edge-aware weights
 * Blur mode: edge-selective Gaussian blur
 */

struct Uniforms {
    data: array<vec4<f32>, 2>,
    // data[0].x = smoothType, data[0].y = strength, data[0].z = threshold, data[0].w = samples
    // data[1].x = searchSteps, data[1].y = radius
};

const LUMA_WEIGHTS: vec3<f32> = vec3<f32>(0.299, 0.587, 0.114);

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var edgeTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, LUMA_WEIGHTS);
}

// --- MSAA: rotated grid sample offsets ---

fn sampleOffset2x(i: i32) -> vec2<f32> {
    if (i == 0) { return vec2<f32>(-0.25, 0.25); }
    return vec2<f32>(0.25, -0.25);
}

fn sampleOffset4x(i: i32) -> vec2<f32> {
    if (i == 0) { return vec2<f32>(-0.125, -0.375); }
    if (i == 1) { return vec2<f32>( 0.375, -0.125); }
    if (i == 2) { return vec2<f32>(-0.375,  0.125); }
    return vec2<f32>( 0.125,  0.375);
}

fn sampleOffset8x(i: i32) -> vec2<f32> {
    if (i == 0) { return vec2<f32>(-0.375, -0.375); }
    if (i == 1) { return vec2<f32>( 0.125, -0.375); }
    if (i == 2) { return vec2<f32>(-0.125, -0.125); }
    if (i == 3) { return vec2<f32>( 0.375, -0.125); }
    if (i == 4) { return vec2<f32>(-0.375,  0.125); }
    if (i == 5) { return vec2<f32>( 0.125,  0.125); }
    if (i == 6) { return vec2<f32>(-0.125,  0.375); }
    return vec2<f32>( 0.375,  0.375);
}

fn getSampleOffset(i: i32, count: i32) -> vec2<f32> {
    if (count <= 2) { return sampleOffset2x(i); }
    if (count <= 4) { return sampleOffset4x(i); }
    return sampleOffset8x(i);
}

fn msaaBlend(uv: vec2<f32>, texelSize: vec2<f32>, threshold: f32, sampleCount: i32, radius: f32) -> vec4<f32> {
    // Use textureSampleLevel throughout \u2014 the supersample loop below depends
    // on per-pixel maxDiff (non-uniform control flow), so plain textureSample
    // would be illegal in WGSL. textureSampleLevel takes an explicit mip level
    // and has no derivative requirement. These shaders don't use mipmaps.
    let center = textureSampleLevel(inputTex, inputSampler, uv, 0.0);

    // Threshold check: skip AA for low-contrast pixels
    let L = luminance(center.rgb);
    let Ln = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(0.0, -texelSize.y), 0.0).rgb);
    let Ls = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(0.0,  texelSize.y), 0.0).rgb);
    let Lw = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>(-texelSize.x, 0.0), 0.0).rgb);
    let Le = luminance(textureSampleLevel(inputTex, inputSampler, uv + vec2<f32>( texelSize.x, 0.0), 0.0).rgb);

    let maxDiff = max(max(abs(L - Ln), abs(L - Ls)),
                      max(abs(L - Lw), abs(L - Le)));

    if (maxDiff < threshold) {
        return center;
    }

    // Supersample at radius-scaled offsets (WebGPU sampler provides bilinear filtering)
    var sum = vec4<f32>(0.0);
    for (var i = 0; i < 8; i = i + 1) {
        if (i >= sampleCount) { break; }
        let offset = getSampleOffset(i, sampleCount) * radius;
        sum = sum + textureSampleLevel(inputTex, inputSampler, uv + offset * texelSize, 0.0);
    }
    return sum / f32(sampleCount);
}

// --- SMAA: morphological edge search and blending ---

fn searchEdge(coord: vec2<i32>, dir: vec2<i32>, maxCoord: vec2<i32>, component: i32, maxSteps: i32) -> f32 {
    for (var i = 1; i <= 32; i = i + 1) {
        if (i > maxSteps) { break; }
        let sampleCoord = clamp(coord + dir * i, vec2<i32>(0), maxCoord);
        var edge: f32;
        if (component == 0) {
            edge = textureLoad(edgeTex, sampleCoord, 0).r;
        } else {
            edge = textureLoad(edgeTex, sampleCoord, 0).g;
        }
        if (edge < 0.5) {
            return f32(i - 1);
        }
    }
    return f32(maxSteps);
}

fn smaaBlend(fragPos: vec2<f32>, searchSteps: i32, radius: f32) -> vec4<f32> {
    let size = vec2<i32>(textureDimensions(inputTex, 0));
    let coord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));
    let maxCoord = size - vec2<i32>(1);

    let edges = textureLoad(edgeTex, coord, 0);
    let edgeH = edges.r;
    let edgeV = edges.g;

    let center = textureLoad(inputTex, coord, 0);
    if (edgeH < 0.5 && edgeV < 0.5) {
        return center;
    }

    var blended = center;

    // Horizontal edge: search left/right, blend with vertical neighbor
    if (edgeH > 0.5) {
        let distLeft  = searchEdge(coord, vec2<i32>(-1, 0), maxCoord, 0, searchSteps);
        let distRight = searchEdge(coord, vec2<i32>( 1, 0), maxCoord, 0, searchSteps);
        let edgeLength = distLeft + distRight + 1.0;

        // Stronger blend for shorter edges (more jaggy), scaled by radius
        let weight = clamp(radius * 0.5 / sqrt(edgeLength), 0.0, 0.5);

        let neighbor = textureLoad(inputTex, clamp(coord + vec2<i32>(0, 1), vec2<i32>(0), maxCoord), 0);
        blended = mix(blended, neighbor, weight);
    }

    // Vertical edge: search up/down, blend with horizontal neighbor
    if (edgeV > 0.5) {
        let distUp   = searchEdge(coord, vec2<i32>(0, -1), maxCoord, 1, searchSteps);
        let distDown = searchEdge(coord, vec2<i32>(0,  1), maxCoord, 1, searchSteps);
        let edgeLength = distUp + distDown + 1.0;

        let weight = clamp(radius * 0.5 / sqrt(edgeLength), 0.0, 0.5);

        let neighbor = textureLoad(inputTex, clamp(coord + vec2<i32>(1, 0), vec2<i32>(0), maxCoord), 0);
        blended = mix(blended, neighbor, weight);
    }

    return blended;
}

// --- Blur: edge-selective Gaussian ---

fn edgeBlur(fragPos: vec2<f32>, radius: f32) -> vec4<f32> {
    let size = vec2<i32>(textureDimensions(inputTex, 0));
    let coord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));
    let maxCoord = size - vec2<i32>(1);

    let edges = textureLoad(edgeTex, coord, 0);
    let center = textureLoad(inputTex, coord, 0);

    if (edges.r < 0.5 && edges.g < 0.5) {
        return center;
    }

    let r = i32(ceil(radius));
    let sigma = radius * 0.5;
    let sigma2 = 2.0 * sigma * sigma;

    var sum = center;
    var totalWeight = 1.0;

    for (var dy = -4; dy <= 4; dy = dy + 1) {
        for (var dx = -4; dx <= 4; dx = dx + 1) {
            if (dx == 0 && dy == 0) { continue; }
            if (abs(dx) > r || abs(dy) > r) { continue; }

            let d = f32(dx * dx + dy * dy);
            let w = exp(-d / sigma2);

            sum = sum + textureLoad(inputTex, clamp(coord + vec2<i32>(dx, dy), vec2<i32>(0), maxCoord), 0) * w;
            totalWeight = totalWeight + w;
        }
    }

    return sum / totalWeight;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let smoothType = i32(uniforms.data[0].x);
    let strength = uniforms.data[0].y;
    let threshold = uniforms.data[0].z;
    let samples = i32(uniforms.data[0].w);
    let searchSteps = i32(uniforms.data[1].x);
    let radius = uniforms.data[1].y;

    let texSize = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;

    let original = textureSampleLevel(inputTex, inputSampler, uv, 0.0);
    var result: vec4<f32>;

    if (smoothType == 0) {
        result = msaaBlend(uv, texelSize, threshold, samples, radius);
    } else if (smoothType == 1) {
        result = smaaBlend(pos.xy, searchSteps, radius);
    } else {
        result = edgeBlur(pos.xy, radius);
    }

    return mix(original, result, strength);
}
`},smoothEdge:{glsl:`/*
 * Smooth - Edge Detection Pass
 * SMAA/Blur modes: compute luma edge map (horizontal/vertical edges)
 * MSAA mode: pass through input unchanged
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int smoothType;
uniform float threshold;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.299, 0.587, 0.114);

float luminance(vec3 rgb) {
    return dot(rgb, LUMA_WEIGHTS);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);

    // MSAA mode: pass through input (blend pass does its own edge detection)
    if (smoothType == 0) {
        fragColor = texelFetch(inputTex, coord, 0);
        return;
    }

    // SMAA and Blur modes: luma-based edge detection
    ivec2 maxCoord = texSize - 1;
    float L  = luminance(texelFetch(inputTex, coord, 0).rgb);
    float Ln = luminance(texelFetch(inputTex, clamp(coord + ivec2(0, -1), ivec2(0), maxCoord), 0).rgb);
    float Ls = luminance(texelFetch(inputTex, clamp(coord + ivec2(0,  1), ivec2(0), maxCoord), 0).rgb);
    float Lw = luminance(texelFetch(inputTex, clamp(coord + ivec2(-1, 0), ivec2(0), maxCoord), 0).rgb);
    float Le = luminance(texelFetch(inputTex, clamp(coord + ivec2( 1, 0), ivec2(0), maxCoord), 0).rgb);

    float edgeH = step(threshold, max(abs(L - Ln), abs(L - Ls)));
    float edgeV = step(threshold, max(abs(L - Lw), abs(L - Le)));

    fragColor = vec4(edgeH, edgeV, 0.0, 1.0);
}
`,wgsl:`/*
 * Smooth - Edge Detection Pass
 * SMAA/Blur modes: compute luma edge map (horizontal/vertical edges)
 * MSAA mode: pass through input unchanged
 */

struct Uniforms {
    data: array<vec4<f32>, 2>,
    // data[0].x = smoothType, data[0].y = strength, data[0].z = threshold, data[0].w = samples
    // data[1].x = searchSteps, data[1].y = radius
};

const LUMA_WEIGHTS: vec3<f32> = vec3<f32>(0.299, 0.587, 0.114);

// binding(0) deliberately unused \u2014 sampler declared previously was dead
// (only textureLoad is used below, which doesn't need a sampler).
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

fn luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, LUMA_WEIGHTS);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let smoothType = i32(uniforms.data[0].x);
    let threshold = uniforms.data[0].z;

    let size = vec2<i32>(textureDimensions(inputTex, 0));
    let coord = vec2<i32>(i32(pos.x), i32(pos.y));

    // MSAA mode: pass through input (blend pass does its own edge detection)
    if (smoothType == 0) {
        return textureLoad(inputTex, coord, 0);
    }

    // SMAA and Blur modes: luma-based edge detection
    let maxCoord = size - vec2<i32>(1);
    let L  = luminance(textureLoad(inputTex, coord, 0).rgb);
    let Ln = luminance(textureLoad(inputTex, clamp(coord + vec2<i32>(0, -1), vec2<i32>(0), maxCoord), 0).rgb);
    let Ls = luminance(textureLoad(inputTex, clamp(coord + vec2<i32>(0,  1), vec2<i32>(0), maxCoord), 0).rgb);
    let Lw = luminance(textureLoad(inputTex, clamp(coord + vec2<i32>(-1, 0), vec2<i32>(0), maxCoord), 0).rgb);
    let Le = luminance(textureLoad(inputTex, clamp(coord + vec2<i32>( 1, 0), vec2<i32>(0), maxCoord), 0).rgb);

    let edgeH = step(threshold, max(abs(L - Ln), abs(L - Ls)));
    let edgeV = step(threshold, max(abs(L - Lw), abs(L - Le)));

    return vec4<f32>(edgeH, edgeV, 0.0, 1.0);
}
`}},o=`# smooth

Anti-aliasing and edge smoothing with three modes

Three algorithms for reducing jagged edges, from subtle anti-aliasing to visible edge softening:

**MSAA** (Multi-Sample Anti-Aliasing): Supersamples each edge pixel at subpixel offsets using a rotated grid pattern, then averages the results. The radius parameter scales the sample offsets from subtle AA (low radius) to visible smoothing (high radius).

**SMAA** (Subpixel Morphological Anti-Aliasing): Detects edges via luma contrast, then searches along edges to determine their length and orientation. Blends neighboring pixels with weights that favor shorter, jaggier edges. The radius parameter controls blend intensity.

**Blur** (Edge-Selective Gaussian): Applies a Gaussian blur kernel only on edge pixels, leaving smooth areas untouched. Produces the most visible smoothing effect. The radius parameter controls the kernel size.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | 0 (msaa) | msaa=0, smaa=1, blur=2 | Smoothing algorithm |
| strength | float | 1.0 | 0-1 | Mix between original and smoothed output (0 = bypass, 1 = full effect) |
| threshold | float | 0.1 | 0-1 | Minimum luma contrast to detect edges. Higher values affect fewer pixels |
| radius | float | 2.0 | 0.5-4 | Spatial reach of the effect. Controls sample offset scale (MSAA), blend strength (SMAA), or kernel size (Blur) |
| samples | int | 4 (x4) | x2/x4/x8 | Number of subpixel samples per pixel (MSAA mode only) |
| searchSteps | int | 8 | 1-32 | Maximum distance to search along edges (SMAA mode only). Higher values handle longer edges but cost more |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .smooth()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&o&&(n.help=o);var c="filter/smooth",u="filter",m="smooth",f=n;export{f as default,c as effectId,m as effectName,o as help,u as namespace};
