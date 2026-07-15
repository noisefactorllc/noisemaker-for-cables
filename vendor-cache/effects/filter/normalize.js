/* filter/normalize */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Normalize",namespace:"filter",func:"normalize",tags:["color"],description:"Value normalization",globals:{},textures:{reduce1:{width:"6.25%",height:"6.25%",format:"rgba16f"},reduce2:{width:"0.4%",height:"0.4%",format:"rgba16f"},stats:{width:1,height:1,format:"rgba16f"}},passes:[{name:"reduce",program:"reduce",inputs:{inputTex:"inputTex"},outputs:{fragColor:"reduce1"}},{name:"reduceMinmax",program:"reduceMinmax",inputs:{inputTex:"reduce1"},outputs:{fragColor:"reduce2"}},{name:"statsFinal",program:"statsFinal",inputs:{inputTex:"reduce2"},outputs:{fragColor:"stats"}},{name:"apply",program:"apply",inputs:{inputTex:"inputTex",statsTex:"stats"},outputs:{fragColor:"outputTex"}}]});var o={apply:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform sampler2D statsTex;
out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Read stats from the 1x1 texture
    vec4 stats = texelFetch(statsTex, ivec2(0, 0), 0);
    float minVal = stats.r;
    float maxVal = stats.g;
    
    // Avoid divide by zero
    if (maxVal - minVal < 0.00001) {
        fragColor = color;
        return;
    }
    
    vec3 normalized = (color.rgb - minVal) / (maxVal - minVal);
    fragColor = vec4(normalized, color.a);
}
`,wgsl:`// GPGPU Pass 4: Apply normalization using computed min/max values
// Reads 1x1 stats texture at (0,0) to get global min/max
// Input: inputTex = original image, statsTex = 1x1 min/max texture

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var statsTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let coord : vec2<i32> = vec2<i32>(input.position.xy);
    
    // Read global min/max from 1x1 stats texture
    let stats : vec4<f32> = textureLoad(statsTex, vec2<i32>(0, 0), 0);
    let global_min : f32 = stats.r;
    let global_max : f32 = stats.g;
    let range : f32 = global_max - global_min;
    
    // Read input pixel
    let texel : vec4<f32> = textureLoad(inputTex, coord, 0);
    
    // Normalize RGB channels, preserve alpha
    var normalized : vec4<f32>;
    if (range > 0.0001) {
        normalized = vec4<f32>(
            (texel.r - global_min) / range,
            (texel.g - global_min) / range,
            (texel.b - global_min) / range,
            texel.a
        );
    } else {
        // Avoid division by zero
        normalized = texel;
    }
    
    return normalized;
}
`},reduce:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Initial reduce pass: sample 16x16 block from original image, compute local min/max
// Output: .r = min, .g = max
// This reduces the texture by 16x in each dimension

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 outCoord = ivec2(gl_FragCoord.xy);
    ivec2 inSize = textureSize(inputTex, 0);
    
    // Each output pixel covers a 16x16 area of input
    ivec2 baseCoord = outCoord * 16;
    
    float minVal = 100000.0;
    float maxVal = -100000.0;
    
    // Sample 16x16 block
    for (int dy = 0; dy < 16; dy++) {
        for (int dx = 0; dx < 16; dx++) {
            ivec2 sampleCoord = baseCoord + ivec2(dx, dy);
            
            // Skip if out of bounds
            if (sampleCoord.x >= inSize.x || sampleCoord.y >= inSize.y) continue;
            
            vec4 color = texelFetch(inputTex, sampleCoord, 0);
            
            // Compute RGB min/max for the original image
            float pixelMin = min(min(color.r, color.g), color.b);
            float pixelMax = max(max(color.r, color.g), color.b);
            
            minVal = min(minVal, pixelMin);
            maxVal = max(maxVal, pixelMax);
        }
    }
    
    // Store min in r, max in g
    fragColor = vec4(minVal, maxVal, 0.0, 1.0);
}`,wgsl:`// GPGPU Pass 1: 16:1 pyramid reduction from original image
// Each output pixel covers a 16x16 block of input
// Output: .r = min RGB, .g = max RGB

@group(0) @binding(0) var inputTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let outCoord : vec2<i32> = vec2<i32>(input.position.xy);
    let inSize : vec2<i32> = vec2<i32>(textureDimensions(inputTex));
    
    // Each output pixel covers a 16x16 area of input
    let baseCoord : vec2<i32> = outCoord * 16;
    
    var minVal : f32 = 100000.0;
    var maxVal : f32 = -100000.0;
    
    // Sample 16x16 block
    for (var dy : i32 = 0; dy < 16; dy = dy + 1) {
        for (var dx : i32 = 0; dx < 16; dx = dx + 1) {
            let sampleCoord : vec2<i32> = baseCoord + vec2<i32>(dx, dy);
            
            // Skip if out of bounds
            if (sampleCoord.x >= inSize.x || sampleCoord.y >= inSize.y) {
                continue;
            }
            
            let color : vec4<f32> = textureLoad(inputTex, sampleCoord, 0);
            
            // Compute RGB min/max
            let pixelMin : f32 = min(min(color.r, color.g), color.b);
            let pixelMax : f32 = max(max(color.r, color.g), color.b);
            
            minVal = min(minVal, pixelMin);
            maxVal = max(maxVal, pixelMax);
        }
    }
    
    // Store min in r, max in g
    return vec4<f32>(minVal, maxVal, 0.0, 1.0);
}
`},reduceMinmax:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Reduce pass for intermediate min/max textures
// Input has min in .r, max in .g (from previous reduce pass)
// Samples 16x16 block and outputs new min/max

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 outCoord = ivec2(gl_FragCoord.xy);
    ivec2 inSize = textureSize(inputTex, 0);
    
    // Each output pixel covers a 16x16 area of input
    ivec2 baseCoord = outCoord * 16;
    
    float minVal = 100000.0;
    float maxVal = -100000.0;
    
    // Sample 16x16 block
    for (int dy = 0; dy < 16; dy++) {
        for (int dx = 0; dx < 16; dx++) {
            ivec2 sampleCoord = baseCoord + ivec2(dx, dy);
            
            // Clamp to texture bounds
            if (sampleCoord.x >= inSize.x || sampleCoord.y >= inSize.y) continue;
            
            vec4 color = texelFetch(inputTex, sampleCoord, 0);
            
            // Input has min in .r, max in .g
            minVal = min(minVal, color.r);
            maxVal = max(maxVal, color.g);
        }
    }
    
    fragColor = vec4(minVal, maxVal, 0.0, 1.0);
}
`,wgsl:`// GPGPU Pass 2: 16:1 reduction of min/max texture
// Input has min in .r, max in .g from previous reduce pass
// Each output pixel covers a 16x16 block of input

@group(0) @binding(0) var inputTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let outCoord : vec2<i32> = vec2<i32>(input.position.xy);
    let inSize : vec2<i32> = vec2<i32>(textureDimensions(inputTex));
    
    // Each output pixel covers a 16x16 area of input
    let baseCoord : vec2<i32> = outCoord * 16;
    
    var minVal : f32 = 100000.0;
    var maxVal : f32 = -100000.0;
    
    // Sample 16x16 block
    for (var dy : i32 = 0; dy < 16; dy = dy + 1) {
        for (var dx : i32 = 0; dx < 16; dx = dx + 1) {
            let sampleCoord : vec2<i32> = baseCoord + vec2<i32>(dx, dy);
            
            // Skip if out of bounds
            if (sampleCoord.x >= inSize.x || sampleCoord.y >= inSize.y) {
                continue;
            }
            
            let color : vec4<f32> = textureLoad(inputTex, sampleCoord, 0);
            
            // Input has min in .r, max in .g
            minVal = min(minVal, color.r);
            maxVal = max(maxVal, color.g);
        }
    }
    
    return vec4<f32>(minVal, maxVal, 0.0, 1.0);
}
`},statsFinal:{glsl:`#version 300 es
precision highp float;
precision highp int;

// Final stats pass: reduce the entire reduce1 texture to a single min/max value
// Input: reduce1 texture (already contains min in .r, max in .g from pyramid reduction)
// Output: 1x1 texture with global min/max

uniform sampler2D inputTex;
out vec4 fragColor;

void main() {
    ivec2 inSize = textureSize(inputTex, 0);
    
    float minVal = 100000.0;
    float maxVal = -100000.0;
    
    // Scan entire reduced texture (should be small after 2x 4:1 reductions)
    for (int y = 0; y < inSize.y; y++) {
        for (int x = 0; x < inSize.x; x++) {
            vec4 color = texelFetch(inputTex, ivec2(x, y), 0);
            
            // Input from reduce pass has min in .r, max in .g
            minVal = min(minVal, color.r);
            maxVal = max(maxVal, color.g);
        }
    }
    
    // Output min in r, max in g for apply pass
    fragColor = vec4(minVal, maxVal, 0.0, 1.0);
}
`,wgsl:`// GPGPU Pass 3: Final reduction to 1x1 min/max
// Scans entire input texture to produce single pixel output
// Input has min in .r, max in .g from pyramid reduction

@group(0) @binding(0) var inputTex : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
    let inSize : vec2<i32> = vec2<i32>(textureDimensions(inputTex));
    
    var minVal : f32 = 100000.0;
    var maxVal : f32 = -100000.0;
    
    // Scan entire texture
    for (var y : i32 = 0; y < inSize.y; y = y + 1) {
        for (var x : i32 = 0; x < inSize.x; x = x + 1) {
            let color : vec4<f32> = textureLoad(inputTex, vec2<i32>(x, y), 0);
            
            // Input has min in .r, max in .g
            minVal = min(minVal, color.r);
            maxVal = max(maxVal, color.g);
        }
    }
    
    return vec4<f32>(minVal, maxVal, 0.0, 1.0);
}
`}},a=`# normalize

Value normalization

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .normalize()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(o))e.shaders[i]={...n}}e&&a&&(e.help=a);var m="filter/normalize",x="filter",p="normalize",c=e;export{c as default,m as effectId,p as effectName,a as help,x as namespace};
