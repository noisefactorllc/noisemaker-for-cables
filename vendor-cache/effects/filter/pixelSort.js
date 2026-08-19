/* filter/pixelSort */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"PixelSort",namespace:"filter",func:"pixelSort",tags:["glitch","pixel"],description:"Pixel sorting glitch effect",globals:{angled:{type:"float",default:0,uniform:"angled",min:-180,max:180,step:1,ui:{label:"angle",control:"slider"}},darkest:{type:"boolean",default:!1,uniform:"darkest",ui:{label:"darkest first",control:"checkbox"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"input mix",control:"slider"}}},textures:{prepared:{width:"100%",height:"100%",format:"rgba16f"},luminance:{width:"100%",height:"100%",format:"rgba16f"},brightest:{width:"100%",height:"100%",format:"rgba16f"},rank:{width:"100%",height:"100%",format:"rgba16f"},sorted:{width:"100%",height:"100%",format:"rgba16f"}},passes:[{name:"prepare",program:"prepare",inputs:{inputTex:"inputTex"},uniforms:{resolution:"resolution",angled:"angled",darkest:"darkest",wrap:"wrap"},outputs:{fragColor:"prepared"}},{name:"luminance",program:"luminance",inputs:{inputTex:"prepared"},outputs:{fragColor:"luminance"}},{name:"findBrightest",program:"findBrightest",inputs:{lumTex:"luminance"},outputs:{fragColor:"brightest"}},{name:"computeRank",program:"computeRank",inputs:{lumTex:"luminance"},outputs:{fragColor:"rank"}},{name:"gatherSorted",program:"gatherSorted",inputs:{preparedTex:"prepared",rankTex:"rank",brightestTex:"brightest"},outputs:{fragColor:"sorted"}},{name:"finalize",program:"finalize",inputs:{inputTex:"sorted",originalTex:"inputTex"},uniforms:{resolution:"resolution",angled:"angled",darkest:"darkest",wrap:"wrap",alpha:"alpha"},outputs:{fragColor:"outputTex"}}]});var i={computeRank:{glsl:`#version 300 es
precision highp float;
precision highp int;

// GPGPU Pass 3: Compute rank for each pixel (optimized)
// Input: luminance texture (R = luminance)
// Output: R = rank (normalized), G = luminance, B = original x, A = 1
// Uses sparse sampling for O(1) approximate rank instead of O(n) exact rank

uniform sampler2D lumTex;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(lumTex, 0);
    int x = coord.x;
    int y = coord.y;
    int width = size.x;
    
    float myLum = texelFetch(lumTex, coord, 0).r;
    
    // Use sparse sampling - sample a fixed number of points across the row
    // This gives O(1) approximate rank instead of O(n) exact rank
    const int NUM_SAMPLES = 32;
    int brighterCount = 0;
    
    for (int s = 0; s < NUM_SAMPLES; s++) {
        // Sample evenly across the row
        int sampleX = (s * width) / NUM_SAMPLES;
        if (sampleX == x) continue;
        
        float otherLum = texelFetch(lumTex, ivec2(sampleX, y), 0).r;
        if (otherLum > myLum || (otherLum == myLum && sampleX < x)) {
            brighterCount++;
        }
    }
    
    // Estimate rank based on samples
    float estimatedRank = float(brighterCount) / float(NUM_SAMPLES);
    
    // Output: rank (normalized), luminance, original x (normalized)
    fragColor = vec4(estimatedRank, myLum, float(x) / float(width - 1), 1.0);
}
`,wgsl:`// GPGPU Pass 3: Compute rank for each pixel (optimized)
// Input: luminance texture (R = luminance)
// Output: R = rank (normalized), G = luminance, B = original x, A = 1
// Uses sparse sampling for O(1) approximate rank instead of O(n) exact rank

@group(0) @binding(0) var lumTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let coord : vec2<i32> = vec2<i32>(input.position.xy);
    let size : vec2<i32> = vec2<i32>(textureDimensions(lumTex));
    let x : i32 = coord.x;
    let y : i32 = coord.y;
    let width : i32 = size.x;
    
    let myLum : f32 = textureLoad(lumTex, coord, 0).r;
    
    // Use sparse sampling - sample a fixed number of points across the row
    // This gives O(1) approximate rank instead of O(n) exact rank
    const NUM_SAMPLES : i32 = 32;
    var brighterCount : i32 = 0;
    
    for (var s : i32 = 0; s < NUM_SAMPLES; s = s + 1) {
        // Sample evenly across the row
        let sampleX : i32 = (s * width) / NUM_SAMPLES;
        if (sampleX == x) {
            continue;
        }
        
        let otherLum : f32 = textureLoad(lumTex, vec2<i32>(sampleX, y), 0).r;
        if (otherLum > myLum || (otherLum == myLum && sampleX < x)) {
            brighterCount = brighterCount + 1;
        }
    }
    
    // Estimate rank based on samples
    let estimatedRank : f32 = f32(brighterCount) / f32(NUM_SAMPLES);
    
    // Output: rank (normalized), luminance, original x (normalized)
    return vec4<f32>(estimatedRank, myLum, f32(x) / f32(width - 1), 1.0);
}
`},finalize:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex; // sorted
uniform sampler2D originalTex; // original
uniform vec2 resolution;
uniform float angled;
uniform bool darkest;
uniform float wrap;
uniform float alpha;

out vec4 fragColor;

const float PI = 3.141592653589793;

vec2 applyWrap(vec2 coord, vec2 size) {
    vec2 uv = coord / size;
    int mode = int(wrap);
    if (mode == 0) {
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);  // mirror
    } else if (mode == 1) {
        uv = fract(uv);  // repeat
    } else {
        uv = clamp(uv, 0.0, 1.0);  // clamp
    }
    return uv;
}

void main() {
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 center = texSize * 0.5;
    vec2 pixelCoord = gl_FragCoord.xy - center;
    
    float angle = angled;
    float rad = angle * PI / 180.0;
    float c = cos(rad);
    float s = sin(rad);
    
    // Inverse Rotate
    vec2 srcCoord;
    srcCoord.x = c * pixelCoord.x - s * pixelCoord.y;
    srcCoord.y = s * pixelCoord.x + c * pixelCoord.y;
    
    srcCoord += center;
    
    vec4 originalColor = texture(originalTex, gl_FragCoord.xy / resolution);
    vec2 wrappedUV = applyWrap(srcCoord, texSize);
    vec4 sortedColor = texture(inputTex, wrappedUV);
    
    vec4 working_source = originalColor;
    vec4 working_sorted = sortedColor;
    
    if (darkest) {
        working_source = vec4(vec3(1.0) - working_source.rgb, working_source.a);
        working_sorted = vec4(vec3(1.0) - working_sorted.rgb, working_sorted.a);
    }
    
    vec4 blended = max(working_source * alpha, working_sorted);
    blended = clamp(blended, 0.0, 1.0);
    blended.a = working_source.a;

    if (darkest) {
        blended = vec4(vec3(1.0) - blended.rgb, originalColor.a);
    } else {
        blended.a = originalColor.a;
    }

    fragColor = blended;
}
`,wgsl:`// Pixel Sort Pass 3: Rotate back and blend with original
// Fragment shader version for WebGPU render pipeline

const PI : f32 = 3.141592653589793;

@group(0) @binding(0) var inputTex : texture_2d<f32>;  // sorted
@group(0) @binding(1) var input_sampler : sampler;
@group(0) @binding(2) var originalTex : texture_2d<f32>;  // original
@group(0) @binding(3) var original_sampler : sampler;
@group(0) @binding(4) var<uniform> resolution : vec2<f32>;
@group(0) @binding(5) var<uniform> angled : f32;
@group(0) @binding(6) var<uniform> darkest : f32;
@group(0) @binding(7) var<uniform> wrap : f32;
@group(0) @binding(8) var<uniform> alpha : f32;

fn applyWrap(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32> {
    var uv = coord / size;
    let mode = i32(wrap);
    if (mode == 0) {
        // Mirror
        let mx = abs((uv.x + 1.0) - floor((uv.x + 1.0) * 0.5) * 2.0 - 1.0);
        let my = abs((uv.y + 1.0) - floor((uv.y + 1.0) * 0.5) * 2.0 - 1.0);
        return vec2<f32>(mx, my);
    } else if (mode == 1) {
        return fract(uv);  // repeat
    }
    return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));  // clamp
}

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let texSize : vec2<f32> = vec2<f32>(textureDimensions(inputTex));
    let center : vec2<f32> = texSize * 0.5;
    let pixelCoord : vec2<f32> = input.position.xy - center;
    
    let angle : f32 = angled;
    let rad : f32 = angle * PI / 180.0;
    let c : f32 = cos(rad);
    let s : f32 = sin(rad);
    
    // Inverse Rotate
    var srcCoord : vec2<f32>;
    srcCoord.x = c * pixelCoord.x - s * pixelCoord.y;
    srcCoord.y = s * pixelCoord.x + c * pixelCoord.y;
    
    srcCoord = srcCoord + center;
    
    let originalColor : vec4<f32> = textureSample(originalTex, original_sampler, input.position.xy / resolution);
    
    let wrappedUV : vec2<f32> = applyWrap(srcCoord, texSize);
    let sortedColor : vec4<f32> = textureSample(inputTex, input_sampler, wrappedUV);
    
    var working_source : vec4<f32> = originalColor;
    var working_sorted : vec4<f32> = sortedColor;
    
    if (darkest != 0.0) {
        working_source = vec4<f32>(vec3<f32>(1.0) - working_source.rgb, working_source.a);
        working_sorted = vec4<f32>(vec3<f32>(1.0) - working_sorted.rgb, working_sorted.a);
    }
    
    var blended : vec4<f32> = max(working_source * alpha, working_sorted);
    blended = clamp(blended, vec4<f32>(0.0), vec4<f32>(1.0));
    blended.a = working_source.a;

    if (darkest != 0.0) {
        blended = vec4<f32>(vec3<f32>(1.0) - blended.rgb, originalColor.a);
    } else {
        blended.a = originalColor.a;
    }

    return blended;
}
`},findBrightest:{glsl:`#version 300 es
precision highp float;
precision highp int;

// GPGPU Pass 2: Find brightest pixel x-coordinate per row (optimized)
// Input: luminance texture (R = luminance)
// Output: R = brightest x (normalized), G = max luminance, B = 0, A = 1
// Uses sparse sampling for O(1) approximate result

uniform sampler2D lumTex;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(lumTex, 0);
    int y = coord.y;
    int width = size.x;
    
    // Use sparse sampling to find approximate brightest pixel
    const int NUM_SAMPLES = 32;
    float maxLum = -1.0;
    int brightestX = 0;
    
    for (int s = 0; s < NUM_SAMPLES; s++) {
        int sampleX = (s * width) / NUM_SAMPLES;
        float lum = texelFetch(lumTex, ivec2(sampleX, y), 0).r;
        if (lum > maxLum) {
            maxLum = lum;
            brightestX = sampleX;
        }
    }
    
    // Output: normalized brightest x, max luminance
    fragColor = vec4(float(brightestX) / float(width - 1), maxLum, 0.0, 1.0);
}
`,wgsl:`// GPGPU Pass 2: Find brightest pixel x-coordinate per row (optimized)
// Input: luminance texture (R = luminance)
// Output: R = brightest x (normalized), G = max luminance, B = 0, A = 1
// Uses sparse sampling for O(1) approximate result

@group(0) @binding(0) var lumTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let coord : vec2<i32> = vec2<i32>(input.position.xy);
    let size : vec2<i32> = vec2<i32>(textureDimensions(lumTex));
    let y : i32 = coord.y;
    let width : i32 = size.x;
    
    // Use sparse sampling to find approximate brightest pixel
    const NUM_SAMPLES : i32 = 32;
    var maxLum : f32 = -1.0;
    var brightestX : i32 = 0;
    
    for (var s : i32 = 0; s < NUM_SAMPLES; s = s + 1) {
        let sampleX : i32 = (s * width) / NUM_SAMPLES;
        let lum : f32 = textureLoad(lumTex, vec2<i32>(sampleX, y), 0).r;
        if (lum > maxLum) {
            maxLum = lum;
            brightestX = sampleX;
        }
    }
    
    // Output: normalized brightest x, max luminance
    return vec4<f32>(f32(brightestX) / f32(width - 1), maxLum, 0.0, 1.0);
}
`},gatherSorted:{glsl:`#version 300 es
precision highp float;
precision highp int;

// GPGPU Pass 4: Gather sorted pixels with alignment
// Input: prepared texture (original colors), rank texture, brightest texture
// Output: Sorted row with brightest pixel aligned to its original position
// Uses approximate rank matching for efficiency

uniform sampler2D preparedTex;  // Original rotated/prepared image
uniform sampler2D rankTex;      // R = rank (approx), G = luminance, B = original x
uniform sampler2D brightestTex; // R = brightest x per row

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(preparedTex, 0);
    int x = coord.x;
    int y = coord.y;
    int width = size.x;
    
    // Get brightest x for this row
    float brightestXNorm = texelFetch(brightestTex, ivec2(0, y), 0).r;
    int brightestX = int(round(brightestXNorm * float(width - 1)));
    
    // Python algorithm:
    // sortedIndex = (x - brightestX + width) % width
    // Output position x gets the pixel whose rank == sortedIndex
    int sortedIndex = (x - brightestX + width) % width;
    float targetRank = float(sortedIndex) / float(width - 1);
    
    // Use sparse sampling to find a pixel with approximately matching rank
    // Instead of exact match, find the closest match
    const int NUM_SAMPLES = 64;
    float bestDiff = 2.0;
    int bestX = x;
    
    for (int s = 0; s < NUM_SAMPLES; s++) {
        int sampleX = (s * width) / NUM_SAMPLES;
        vec4 rankData = texelFetch(rankTex, ivec2(sampleX, y), 0);
        float pixelRank = rankData.r;
        
        float diff = abs(pixelRank - targetRank);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestX = sampleX;
        }
    }
    
    // Fetch the color from the best matching pixel
    vec4 result = texelFetch(preparedTex, ivec2(bestX, y), 0);
    
    fragColor = result;
}
`,wgsl:`// GPGPU Pass 4: Gather sorted pixels with alignment
// Input: prepared texture (original colors), rank texture, brightest texture
// Output: Sorted row with brightest pixel aligned to its original position
// Uses approximate rank matching for efficiency

@group(0) @binding(0) var preparedTex : texture_2d<f32>;
@group(0) @binding(1) var rankTex : texture_2d<f32>;
@group(0) @binding(2) var brightestTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let coord : vec2<i32> = vec2<i32>(input.position.xy);
    let size : vec2<i32> = vec2<i32>(textureDimensions(preparedTex));
    let x : i32 = coord.x;
    let y : i32 = coord.y;
    let width : i32 = size.x;
    
    // Get brightest x for this row
    let brightestXNorm : f32 = textureLoad(brightestTex, vec2<i32>(0, y), 0).r;
    let brightestX : i32 = i32(round(brightestXNorm * f32(width - 1)));
    
    // Python algorithm:
    // sortedIndex = (x - brightestX + width) % width
    // Output position x gets the pixel whose rank == sortedIndex
    let sortedIndex : i32 = (x - brightestX + width) % width;
    let targetRank : f32 = f32(sortedIndex) / f32(width - 1);
    
    // Use sparse sampling to find a pixel with approximately matching rank
    // Instead of exact match, find the closest match
    const NUM_SAMPLES : i32 = 64;
    var bestDiff : f32 = 2.0;
    var bestX : i32 = x;
    
    for (var s : i32 = 0; s < NUM_SAMPLES; s = s + 1) {
        let sampleX : i32 = (s * width) / NUM_SAMPLES;
        let rankData : vec4<f32> = textureLoad(rankTex, vec2<i32>(sampleX, y), 0);
        let pixelRank : f32 = rankData.r;
        
        let diff : f32 = abs(pixelRank - targetRank);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestX = sampleX;
        }
    }
    
    // Fetch the color from the best matching pixel
    let result : vec4<f32> = textureLoad(preparedTex, vec2<i32>(bestX, y), 0);
    
    return result;
}
`},luminance:{glsl:`#version 300 es
precision highp float;
precision highp int;

// GPGPU Pass 1: Compute luminance for each pixel
// Output: R = luminance, G = original x coordinate (normalized), B = 0, A = 1

uniform sampler2D inputTex;

out vec4 fragColor;

float srgb_to_lin(float value) {
    return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4);
}

float oklab_l(vec3 rgb) {
    float r = srgb_to_lin(clamp(rgb.r, 0.0, 1.0));
    float g = srgb_to_lin(clamp(rgb.g, 0.0, 1.0));
    float b = srgb_to_lin(clamp(rgb.b, 0.0, 1.0));
    
    float l = 0.4121656120 * r + 0.5362752080 * g + 0.0514575653 * b;
    float m = 0.2118591070 * r + 0.6807189584 * g + 0.1074065790 * b;
    float s = 0.0883097947 * r + 0.2818474174 * g + 0.6302613616 * b;
    
    float l_c = pow(abs(l), 1.0 / 3.0);
    float m_c = pow(abs(m), 1.0 / 3.0);
    float s_c = pow(abs(s), 1.0 / 3.0);
    
    return 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
}

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(inputTex, 0);
    
    vec4 texel = texelFetch(inputTex, coord, 0);
    float lum = oklab_l(texel.rgb);
    
    // Store: luminance, normalized x position, 0, 1
    fragColor = vec4(lum, float(coord.x) / float(size.x - 1), 0.0, 1.0);
}
`,wgsl:`// GPGPU Pass 1: Compute luminance for each pixel
// Output: R = luminance, G = original x coordinate (normalized), B = 0, A = 1

@group(0) @binding(0) var inputTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

fn srgb_to_lin(value : f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn oklab_l(rgb : vec3<f32>) -> f32 {
    let r : f32 = srgb_to_lin(clamp(rgb.r, 0.0, 1.0));
    let g : f32 = srgb_to_lin(clamp(rgb.g, 0.0, 1.0));
    let b : f32 = srgb_to_lin(clamp(rgb.b, 0.0, 1.0));
    
    let l : f32 = 0.4121656120 * r + 0.5362752080 * g + 0.0514575653 * b;
    let m : f32 = 0.2118591070 * r + 0.6807189584 * g + 0.1074065790 * b;
    let s : f32 = 0.0883097947 * r + 0.2818474174 * g + 0.6302613616 * b;
    
    let l_c : f32 = pow(abs(l), 1.0 / 3.0);
    let m_c : f32 = pow(abs(m), 1.0 / 3.0);
    let s_c : f32 = pow(abs(s), 1.0 / 3.0);
    
    return 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
}

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let coord : vec2<i32> = vec2<i32>(input.position.xy);
    let size : vec2<i32> = vec2<i32>(textureDimensions(inputTex));
    
    let texel : vec4<f32> = textureLoad(inputTex, coord, 0);
    let lum : f32 = oklab_l(texel.rgb);
    
    // Store: luminance, normalized x position, 0, 1
    return vec4<f32>(lum, f32(coord.x) / f32(size.x - 1), 0.0, 1.0);
}
`},prepare:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float angled;
uniform float time;
uniform bool darkest;
uniform float wrap;

out vec4 fragColor;

const float PI = 3.141592653589793;

vec2 applyWrap(vec2 coord, vec2 size) {
    vec2 uv = coord / size;
    int mode = int(wrap);
    if (mode == 0) {
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);  // mirror
    } else if (mode == 1) {
        uv = fract(uv);  // repeat
    } else {
        uv = clamp(uv, 0.0, 1.0);  // clamp
    }
    return uv;
}

void main() {
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 center = texSize * 0.5;
    vec2 pixelCoord = gl_FragCoord.xy - center;
    
    float angle = angled;
    // Animation logic if needed
    
    float rad = angle * PI / 180.0;
    float c = cos(rad);
    float s = sin(rad);
    
    // Rotate
    vec2 srcCoord;
    srcCoord.x = c * pixelCoord.x + s * pixelCoord.y;
    srcCoord.y = -s * pixelCoord.x + c * pixelCoord.y;
    
    srcCoord += center;
    
    vec2 wrappedUV = applyWrap(srcCoord, texSize);
    vec4 color = texture(inputTex, wrappedUV);
    
    if (darkest) {
        color = vec4(vec3(1.0) - color.rgb, color.a);
    }
    
    fragColor = color;
}
`,wgsl:`// Pixel Sort Pass 1: Rotate input texture based on angle
// Fragment shader version for WebGPU render pipeline

const PI : f32 = 3.141592653589793;

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var input_sampler : sampler;
@group(0) @binding(2) var<uniform> resolution : vec2<f32>;
@group(0) @binding(3) var<uniform> angled : f32;
@group(0) @binding(4) var<uniform> darkest : f32;
@group(0) @binding(5) var<uniform> wrap : f32;

fn applyWrap(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32> {
    var uv = coord / size;
    let mode = i32(wrap);
    if (mode == 0) {
        // Mirror
        let mx = abs((uv.x + 1.0) - floor((uv.x + 1.0) * 0.5) * 2.0 - 1.0);
        let my = abs((uv.y + 1.0) - floor((uv.y + 1.0) * 0.5) * 2.0 - 1.0);
        return vec2<f32>(mx, my);
    } else if (mode == 1) {
        return fract(uv);  // repeat
    }
    return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));  // clamp
}

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let texSize : vec2<f32> = vec2<f32>(textureDimensions(inputTex));
    let center : vec2<f32> = texSize * 0.5;
    let pixelCoord : vec2<f32> = input.position.xy - center;
    
    var angle : f32 = angled;
    // Handle animation if needed
    
    let rad : f32 = angle * PI / 180.0;
    let c : f32 = cos(rad);
    let s : f32 = sin(rad);
    
    // Rotate
    var srcCoord : vec2<f32>;
    srcCoord.x = c * pixelCoord.x + s * pixelCoord.y;
    srcCoord.y = -s * pixelCoord.x + c * pixelCoord.y;
    
    srcCoord = srcCoord + center;
    
    let wrappedUV : vec2<f32> = applyWrap(srcCoord, texSize);
    var color : vec4<f32> = textureSample(inputTex, input_sampler, wrappedUV);
    
    if (darkest != 0.0) {
        color = vec4<f32>(1.0) - color;
        color.a = 1.0;
    }
    
    return color;
}
`}},o=`# pixelSort

Pixel sorting glitch effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| angled | float | 0 | -180-180 | Angle |
| darkest | boolean | false | - | Darkest First |
| wrap | int | 0 (mirror) | mirror, repeat, clamp | Edge wrapping mode |
| input mix | float | 1.0 | 0-1 | Input opacity |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .pixelSort()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[r,n]of Object.entries(i))e.shaders[r]={...n}}e&&o&&(e.help=o);var u="filter/pixelSort",c="filter",d="pixelSort",f=e;export{f as default,u as effectId,d as effectName,o as help,c as namespace};
