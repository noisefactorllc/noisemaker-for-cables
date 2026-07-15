/* filter/outline */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Outline",namespace:"filter",tags:["edges"],func:"outline",description:"Outline/edge stroke",globals:{shape:{type:"int",default:1,uniform:"sobelMetric",choices:{circle:1,diamond:2,square:3,octagon:4},ui:{label:"shape",control:"dropdown"}},thickness:{type:"float",default:1,uniform:"thickness",min:1,max:10,step:.1,ui:{label:"thickness",control:"slider"}},invert:{type:"boolean",default:!1,uniform:"invert",ui:{label:"invert",control:"checkbox"}}},textures:{outlineValueMap:{width:"100%",height:"100%",format:"rgba16f"},outlineEdges:{width:"100%",height:"100%",format:"rgba16f"}},passes:[{name:"valueMap",program:"outlineValueMap",inputs:{inputTex:"inputTex"},outputs:{color:"outlineValueMap"}},{name:"sobel",program:"outlineSobel",inputs:{valueTexture:"outlineValueMap"},outputs:{color:"outlineEdges"}},{name:"blend",program:"outlineBlend",inputs:{inputTex:"inputTex",edgesTexture:"outlineEdges"},outputs:{color:"outputTex"}}]});var a={outlineBlend:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Outline blend pass - darken base where edges are detected

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform sampler2D edgesTexture;
uniform float invert;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 dimensions = textureSize(inputTex, 0);
    if (dimensions.x == 0 || dimensions.y == 0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 uv = gl_FragCoord.xy / vec2(dimensions);
    
    vec4 base = texture(inputTex, uv);
    vec4 edges = texture(edgesTexture, uv);

    // Edge strength from luminance
    float strength = clamp(edges.r, 0.0, 1.0);
    
    // Outline color: black by default, white if inverted
    vec3 outlineColor = invert > 0.5 ? vec3(1.0) : vec3(0.0);
    
    // Apply outline where edges are present
    vec3 out_rgb = mix(base.rgb, outlineColor, strength);
    
    fragColor = vec4(out_rgb, base.a);
}
`,wgsl:`// Outline blend pass - darken base where edges are detected

struct Params {
    invert : f32,
    _pad0 : f32,
    _pad1 : f32,
    _pad2 : f32,
}

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var inputSampler : sampler;
@group(0) @binding(2) var edgesTexture : texture_2d<f32>;
@group(0) @binding(3) var edgesSampler : sampler;
@group(0) @binding(4) var<uniform> params : Params;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoord : vec2<f32>,
}

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let base = textureSample(inputTex, inputSampler, input.texCoord);
    let edges = textureSample(edgesTexture, edgesSampler, input.texCoord);

    // Edge strength from luminance
    let strength = clamp(edges.r, 0.0, 1.0);
    
    // Outline color: black by default, white if inverted
    let outlineColor = select(vec3<f32>(0.0), vec3<f32>(1.0), params.invert > 0.5);
    
    // Apply outline where edges are present
    let out_rgb = mix(base.rgb, outlineColor, strength);
    
    return vec4<f32>(out_rgb, base.a);
}
`},outlineSobel:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Outline Sobel pass - edge detection with configurable metric

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D valueTexture;
uniform float sobelMetric;
uniform float thickness;
uniform float renderScale;

out vec4 fragColor;

int wrapCoord(int value, int size) {
    if (size <= 0) {
        return 0;
    }
    int wrapped = value % size;
    if (wrapped < 0) {
        wrapped += size;
    }
    return wrapped;
}

float distanceMetric(float gx, float gy, int metric) {
    float abs_gx = abs(gx);
    float abs_gy = abs(gy);
    
    if (metric == 2) {
        // Manhattan
        return abs_gx + abs_gy;
    } else if (metric == 3) {
        // Chebyshev
        return max(abs_gx, abs_gy);
    } else if (metric == 4) {
        // Octagram
        float cross = (abs_gx + abs_gy) / 1.414;
        return max(cross, max(abs_gx, abs_gy));
    } else {
        // Euclidean (default)
        return sqrt(gx * gx + gy * gy);
    }
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 dimensions = textureSize(valueTexture, 0);
    if (dimensions.x == 0 || dimensions.y == 0) {
        fragColor = vec4(0.0);
        return;
    }

    ivec2 coord = ivec2(gl_FragCoord.xy);
    int metric = int(sobelMetric);

    // Sample 3x3 neighborhood with thickness scaling
    int offset = max(1, int(thickness * renderScale));
    float samples[9];
    int idx = 0;
    for (int ky = -1; ky <= 1; ++ky) {
        for (int kx = -1; kx <= 1; ++kx) {
            int sampleX = wrapCoord(coord.x + kx * offset, dimensions.x);
            int sampleY = wrapCoord(coord.y + ky * offset, dimensions.y);
            samples[idx] = texelFetch(valueTexture, ivec2(sampleX, sampleY), 0).r;
            idx++;
        }
    }

    // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
    float gx = -samples[0] + samples[2] - 2.0*samples[3] + 2.0*samples[5] - samples[6] + samples[8];
    
    // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
    float gy = -samples[0] - 2.0*samples[1] - samples[2] + samples[6] + 2.0*samples[7] + samples[8];

    float magnitude = distanceMetric(gx, gy, metric);
    // Boost edge visibility - multiply by 4 to make edges more visible
    float normalized = clamp(magnitude * 4.0, 0.0, 1.0);
    
    fragColor = vec4(normalized, normalized, normalized, 1.0);
}
`,wgsl:`// Outline Sobel pass - edge detection with configurable metric

struct Params {
    sobelMetric : f32,
    thickness : f32,
    _pad1 : f32,
    _pad2 : f32,
}

@group(0) @binding(0) var valueTexture : texture_2d<f32>;
@group(0) @binding(1) var<uniform> params : Params;

fn wrapCoord(value : i32, size : i32) -> i32 {
    if (size <= 0) {
        return 0;
    }
    var wrapped = value % size;
    if (wrapped < 0) {
        wrapped = wrapped + size;
    }
    return wrapped;
}

fn distanceMetric(gx : f32, gy : f32, metric : i32) -> f32 {
    let abs_gx = abs(gx);
    let abs_gy = abs(gy);
    
    if (metric == 2) {
        // Manhattan
        return abs_gx + abs_gy;
    } else if (metric == 3) {
        // Chebyshev
        return max(abs_gx, abs_gy);
    } else if (metric == 4) {
        // Octagram
        let cross = (abs_gx + abs_gy) / 1.414;
        return max(cross, max(abs_gx, abs_gy));
    } else {
        // Euclidean (default)
        return sqrt(gx * gx + gy * gy);
    }
}

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoord : vec2<f32>,
}

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let dimensions = vec2<i32>(textureDimensions(valueTexture));
    if (dimensions.x == 0 || dimensions.y == 0) {
        return vec4<f32>(0.0);
    }

    let coord = vec2<i32>(input.position.xy);
    let metric = i32(params.sobelMetric);

    // Sample 3x3 neighborhood with thickness scaling
    let offset = max(1, i32(params.thickness));
    var samples : array<f32, 9>;
    var idx = 0;
    for (var ky = -1; ky <= 1; ky = ky + 1) {
        for (var kx = -1; kx <= 1; kx = kx + 1) {
            let sampleX = wrapCoord(coord.x + kx * offset, dimensions.x);
            let sampleY = wrapCoord(coord.y + ky * offset, dimensions.y);
            samples[idx] = textureLoad(valueTexture, vec2<i32>(sampleX, sampleY), 0).r;
            idx = idx + 1;
        }
    }

    // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
    let gx = -samples[0] + samples[2] - 2.0*samples[3] + 2.0*samples[5] - samples[6] + samples[8];
    
    // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
    let gy = -samples[0] - 2.0*samples[1] - samples[2] + samples[6] + 2.0*samples[7] + samples[8];

    let magnitude = distanceMetric(gx, gy, metric);
    // Boost edge visibility - multiply by 4 to make edges more visible
    let normalized = clamp(magnitude * 4.0, 0.0, 1.0);
    
    return vec4<f32>(normalized, normalized, normalized, 1.0);
}
`},outlineValueMap:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Outline value map pass - convert input to luminance for edge detection

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;

out vec4 fragColor;

float srgbToLinear(float value) {
    return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4);
}

vec3 srgbToLinear(vec3 value) {
    return vec3(srgbToLinear(value.r), srgbToLinear(value.g), srgbToLinear(value.b));
}

float cubeRoot(float value) {
    return value < 0.0 ? -pow(-value, 1.0 / 3.0) : pow(value, 1.0 / 3.0);
}

float oklabLComponent(vec3 rgb) {
    vec3 linear = srgbToLinear(clamp(rgb, vec3(0.0), vec3(1.0)));
    float l = 0.4121656120 * linear.r + 0.5362752080 * linear.g + 0.0514575653 * linear.b;
    float m = 0.2118591070 * linear.r + 0.6807189584 * linear.g + 0.1074065790 * linear.b;
    float s = 0.0883097947 * linear.r + 0.2818474174 * linear.g + 0.6302613616 * linear.b;
    float lC = cubeRoot(max(l, 1e-9));
    float mC = cubeRoot(max(m, 1e-9));
    float sC = cubeRoot(max(s, 1e-9));
    return clamp(0.2104542553 * lC + 0.7936177850 * mC - 0.0040720468 * sC, 0.0, 1.0);
}

float valueMapComponent(vec4 texel) {
    float spread = max(abs(texel.r - texel.g), max(abs(texel.r - texel.b), abs(texel.g - texel.b)));
    if (spread < 1e-5) {
        return clamp(texel.r, 0.0, 1.0);
    }
    return oklabLComponent(texel.rgb);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 dimensions = textureSize(inputTex, 0);
    vec2 uv = (gl_FragCoord.xy - vec2(0.5)) / vec2(max(dimensions.x, 1), max(dimensions.y, 1));
    vec4 texel = texture(inputTex, uv);
    float value = valueMapComponent(texel);
    fragColor = vec4(value, value, value, texel.a);
}
`,wgsl:`// Outline value map pass - convert input to luminance for edge detection

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var inputSampler : sampler;

fn srgbToLinear(value : f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn srgbToLinear3(value : vec3<f32>) -> vec3<f32> {
    return vec3<f32>(srgbToLinear(value.r), srgbToLinear(value.g), srgbToLinear(value.b));
}

fn cubeRoot(value : f32) -> f32 {
    if (value < 0.0) {
        return -pow(-value, 1.0 / 3.0);
    }
    return pow(value, 1.0 / 3.0);
}

fn oklabLComponent(rgb : vec3<f32>) -> f32 {
    let linear = srgbToLinear3(clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0)));
    let l = 0.4121656120 * linear.r + 0.5362752080 * linear.g + 0.0514575653 * linear.b;
    let m = 0.2118591070 * linear.r + 0.6807189584 * linear.g + 0.1074065790 * linear.b;
    let s = 0.0883097947 * linear.r + 0.2818474174 * linear.g + 0.6302613616 * linear.b;
    let lC = cubeRoot(max(l, 1e-9));
    let mC = cubeRoot(max(m, 1e-9));
    let sC = cubeRoot(max(s, 1e-9));
    return clamp(0.2104542553 * lC + 0.7936177850 * mC - 0.0040720468 * sC, 0.0, 1.0);
}

fn valueMapComponent(texel : vec4<f32>) -> f32 {
    let spread = max(abs(texel.r - texel.g), max(abs(texel.r - texel.b), abs(texel.g - texel.b)));
    if (spread < 1e-5) {
        return clamp(texel.r, 0.0, 1.0);
    }
    return oklabLComponent(texel.rgb);
}

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoord : vec2<f32>,
}

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let texel = textureSample(inputTex, inputSampler, input.texCoord);
    let value = valueMapComponent(texel);
    return vec4<f32>(value, value, value, texel.a);
}
`}},i=`# outline

Outline/edge stroke

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/diamond/square/octagon | Shape |
| thickness | float | 1 | 1-10 | Thickness |
| invert | boolean | false | - | Invert |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .outline()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(a))n.shaders[r]={...e}}n&&i&&(n.help=i);var p="filter/outline",m="filter",f="outline",c=n;export{c as default,p as effectId,f as effectName,i as help,m as namespace};
