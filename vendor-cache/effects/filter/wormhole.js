/* filter/wormhole */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Wormhole",namespace:"filter",func:"wormhole",tags:["distort"],description:"Luminance-driven scatter displacement field",textures:{wormhole_accum:{width:"100%",height:"100%",format:"rgba16f"}},globals:{kink:{type:"float",default:1,uniform:"kink",min:0,max:5,step:.1,ui:{label:"kink",control:"slider"}},stride:{type:"float",default:1,uniform:"stride",min:0,max:2,step:.01,ui:{label:"stride",control:"slider"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,step:1,ui:{label:"rotation",control:"slider"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},passes:[{name:"clear",program:"clear",inputs:{},outputs:{fragColor:"wormhole_accum"}},{name:"deposit",program:"deposit",drawMode:"points",count:"input",blend:!0,inputs:{inputTex:"inputTex"},uniforms:{kink:"kink",stride:"stride",rotation:"rotation",wrap:"wrap"},outputs:{fragColor:"wormhole_accum"}},{name:"blend",program:"blend",inputs:{inputTex:"inputTex",accumTex:"wormhole_accum"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]});var o={blend:{glsl:`#version 300 es
precision highp float;

// Wormhole Blend
// Normalize accumulated scatter buffer, sqrt, blend with original.
// Uses mean-based normalization (robust to sparse sampling) instead of
// min/max (which flickered due to missing outlier hotspots in the grid).

uniform sampler2D inputTex;
uniform sampler2D accumTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float alpha;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 src = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 accum = texture(accumTex, gl_FragCoord.xy / vec2(textureSize(accumTex, 0)));

    // Estimate mean of accum buffer from 32x32 grid (1024 samples).
    // Mean is robust to sparse sampling unlike min/max.
    float sum = 0.0;
    float count = 0.0;
    for (int gy = 0; gy < 32; gy++) {
        for (int gx = 0; gx < 32; gx++) {
            vec2 sampleUV = (vec2(float(gx), float(gy)) + 0.5) / 32.0;
            vec4 s = texture(accumTex, sampleUV);
            float v = (s.r + s.g + s.b) / 3.0;
            sum += v;
            count += 1.0;
        }
    }
    float mean = sum / count;

    // Normalize: scale so that mean maps to ~0.25 (after sqrt -> ~0.5)
    // This gives a stable, well-distributed output range
    vec3 normalized;
    if (mean > 0.0) {
        normalized = clamp(accum.rgb / (mean * 4.0), 0.0, 1.0);
    } else {
        normalized = accum.rgb;
    }

    vec3 sqrtVal = sqrt(normalized);

    fragColor = vec4(mix(src.rgb, sqrtVal, alpha), src.a);
}
`,wgsl:`// Wormhole Blend
// Normalize accumulated scatter buffer, sqrt, blend with original.
// Uses mean-based normalization (robust to sparse sampling) instead of
// min/max (which flickered due to missing outlier hotspots in the grid).

@group(0) @binding(0) var u_sampler : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var accumTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> resolution : vec2<f32>;
@group(0) @binding(4) var<uniform> alpha : f32;

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let uv = position.xy / resolution;

    let src = textureSampleLevel(inputTex, u_sampler, uv, 0.0);
    let accum = textureSampleLevel(accumTex, u_sampler, uv, 0.0);

    // Estimate mean of accum buffer from 32x32 grid (1024 samples).
    // Mean is robust to sparse sampling unlike min/max.
    var sum : f32 = 0.0;
    var count : f32 = 0.0;
    for (var gy : i32 = 0; gy < 32; gy = gy + 1) {
        for (var gx : i32 = 0; gx < 32; gx = gx + 1) {
            let sampleUV = (vec2<f32>(f32(gx), f32(gy)) + 0.5) / 32.0;
            let s = textureSampleLevel(accumTex, u_sampler, sampleUV, 0.0);
            let v = (s.r + s.g + s.b) / 3.0;
            sum = sum + v;
            count = count + 1.0;
        }
    }
    let mean = sum / count;

    // Normalize: scale so that mean maps to ~0.25 (after sqrt -> ~0.5)
    var normalized : vec3<f32>;
    if (mean > 0.0) {
        normalized = clamp(accum.rgb / (mean * 4.0), vec3<f32>(0.0), vec3<f32>(1.0));
    } else {
        normalized = accum.rgb;
    }

    let sqrtVal = sqrt(normalized);

    return vec4<f32>(mix(src.rgb, sqrtVal, alpha), src.a);
}
`},clear:{glsl:`#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(0.0);
}
`,wgsl:`struct Uniforms {
    resolution: vec2<f32>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0);
}
`},deposit:{vertex:`#version 300 es
precision highp float;

// Wormhole Deposit Vertex Shader
// Each pixel scatters to a destination based on OKLab L channel

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform float kink;
uniform float stride;
uniform float rotation;
uniform int wrap;

out vec4 vColor;

const float TAU = 6.28318530717959;

// OKLab L channel extraction (matches JS rgbToOklab -> L)
float oklabL(vec3 rgb) {
    vec3 c = clamp(rgb, 0.0, 1.0);
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    float l_ = pow(max(l, 0.0), 1.0 / 3.0);
    float m_ = pow(max(m, 0.0), 1.0 / 3.0);
    float s_ = pow(max(s, 0.0), 1.0 / 3.0);
    return 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    int w = texSize.x;
    int h = texSize.y;

    if (gl_VertexID >= w * h) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }

    int srcX = gl_VertexID % w;
    int srcY = gl_VertexID / w;

    vec4 src = texelFetch(inputTex, ivec2(srcX, srcY), 0);
    float lum = oklabL(src.rgb);

    // JS: deg = valuesArr[idx] * TAU * kink
    float angle = lum * TAU * kink + radians(rotation);

    // JS: stride = 1024 * inputStride
    float pixelStride = 1024.0 * stride;

    // JS: xo = (cos(deg) + 1) * stride, yo = (sin(deg) + 1) * stride
    float ox = (cos(angle) + 1.0) * pixelStride;
    float oy = (sin(angle) + 1.0) * pixelStride;

    int destX = int(floor(float(srcX) + ox));
    int destY = int(floor(float(srcY) + oy));

    // Branchless wrap modes (critical for vertex shader performance)
    if (wrap == 0) {
        // Mirror
        int mx = ((destX % (w * 2)) + w * 2) % (w * 2);
        int my = ((destY % (h * 2)) + h * 2) % (h * 2);
        destX = w - 1 - abs(mx - w + 1);
        destY = h - 1 - abs(my - h + 1);
    } else if (wrap == 2) {
        // Clamp
        destX = clamp(destX, 0, w - 1);
        destY = clamp(destY, 0, h - 1);
    } else {
        // Repeat (default)
        destX = ((destX % w) + w) % w;
        destY = ((destY % h) + h) % h;
    }

    // Convert to clip space
    float clipX = (float(destX) + 0.5) / float(w) * 2.0 - 1.0;
    float clipY = (float(destY) + 0.5) / float(h) * 2.0 - 1.0;

    gl_Position = vec4(clipX, clipY, 0.0, 1.0);
    gl_PointSize = 1.0;

    // JS: out[dest + k] += src[base + k] * lum * lum (RGB only)
    vColor = vec4(src.rgb * lum * lum, 0.0);
}
`,fragment:`#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,wgsl:`// Wormhole Deposit - Scatter pixels to destination based on OKLab L channel

struct Uniforms {
    resolution: vec2<f32>,
    kink: f32,
    stride: f32,
    rotation: f32,
    wrap: i32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

const TAU: f32 = 6.28318530717959;

// OKLab L channel extraction (matches JS rgbToOklab -> L)
fn oklabL(rgb: vec3<f32>) -> f32 {
    let c = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));
    let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    let s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    let l_ = pow(max(l, 0.0), 1.0 / 3.0);
    let m_ = pow(max(m, 0.0), 1.0 / 3.0);
    let s_ = pow(max(s, 0.0), 1.0 / 3.0);
    return 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;

    let texSize = textureDimensions(inputTex, 0);
    let w = i32(texSize.x);
    let h = i32(texSize.y);

    if (i32(vertexIndex) >= w * h) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }

    let srcX = i32(vertexIndex) % w;
    let srcY = i32(vertexIndex) / w;

    let src = textureLoad(inputTex, vec2<i32>(srcX, srcY), 0);
    let lum = oklabL(src.rgb);

    let angle = lum * TAU * u.kink + radians(u.rotation);
    let pixelStride = 1024.0 * u.stride;

    let ox = (cos(angle) + 1.0) * pixelStride;
    let oy = (sin(angle) + 1.0) * pixelStride;

    var destX = i32(floor(f32(srcX) + ox));
    var destY = i32(floor(f32(srcY) + oy));

    // Branchless wrap modes (critical for vertex shader performance)
    if (u.wrap == 0) {
        // Mirror
        let mx = ((destX % (w * 2)) + w * 2) % (w * 2);
        let my = ((destY % (h * 2)) + h * 2) % (h * 2);
        destX = w - 1 - abs(mx - w + 1);
        destY = h - 1 - abs(my - h + 1);
    } else if (u.wrap == 2) {
        // Clamp
        destX = clamp(destX, 0, w - 1);
        destY = clamp(destY, 0, h - 1);
    } else {
        // Repeat (default)
        destX = ((destX % w) + w) % w;
        destY = ((destY % h) + h) % h;
    }

    let clipX = (f32(destX) + 0.5) / f32(w) * 2.0 - 1.0;
    // WebGPU Y is flipped vs WebGL2
    let clipY = 1.0 - (f32(destY) + 0.5) / f32(h) * 2.0;

    out.position = vec4<f32>(clipX, clipY, 0.0, 1.0);
    out.color = vec4<f32>(src.rgb * lum * lum, 0.0);
    return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
`}},i=`# wormhole

Luminance-driven scatter displacement field

## Description

Each pixel is scattered to a new position based on its OKLab luminance. The displacement angle is determined by luminance \xD7 kink, and the distance by stride. The result is accumulated and normalized to produce a luminance-driven warp effect.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| kink | float | 1 | 0-5 | Displacement curve intensity |
| stride | float | 1 | 0-2 | Scatter distance |
| rotation | float | 0 | -180-180 | Displacement angle offset |
| wrap | int | repeat | mirror/repeat/clamp | Out-of-bounds handling |
| alpha | float | 1 | 0-1 | Blend with original |

## Wrap Modes

- **mirror**: Pixels that scatter beyond the edge reflect back
- **repeat**: Pixels wrap around to the opposite side (default)
- **clamp**: Pixels that scatter beyond the edge pile up at the border

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .wormhole()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&i&&(n.help=i);var u="filter/wormhole",m="filter",p="wormhole",f=n;export{f as default,u as effectId,p as effectName,i as help,m as namespace};
