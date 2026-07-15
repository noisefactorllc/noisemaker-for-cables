/* filter/spinBlur */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Spin Blur",namespace:"filter",func:"spinBlur",tags:["blur","artist"],description:"Rotational blur around a center point (Radial Blur, Spin mode)",globals:{amount:{type:"float",default:15,uniform:"amount",min:1,max:90,ui:{label:"amount",control:"slider"}},centerX:{type:"float",default:.5,uniform:"centerX",min:0,max:1,ui:{label:"center x",control:"slider"}},centerY:{type:"float",default:.5,uniform:"centerY",min:0,max:1,ui:{label:"center y",control:"slider"}}},passes:[{name:"render",program:"spinBlur",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={spinBlur:{glsl:`/*
 * Spin Blur - rotational blur around a center point (Radial
 * Blur, Spin mode). Averages a fixed N-tap comb; each tap resamples the
 * input after rotating the pixel's offset-from-center by
 * theta_i = (i/(N-1) - 0.5) * radians(amount) around (centerX, centerY),
 * aspect-corrected exactly the way filter/pinch's rotate2D corrects its
 * own distortion (multiply x by aspect before rotating, divide after).
 * A per-pixel hash shifts the whole tap comb by up to half an angular
 * step to hide banding from the fixed tap count.
 *
 * Y-convention note: the tap arc is symmetric about theta=0, so the
 * zero-jitter effect is Y-mirror invariant (negating every tap angle
 * maps the tap set onto itself). Per-pixel jitter shifts the whole arc
 * by a bounded sub-step offset, which does not preserve that symmetry
 * exactly - it bounds the residual cross-backend difference by the
 * jitter magnitude rather than eliminating it outright, so this is
 * weaker than "structurally immune." GLSL gl_FragCoord and WGSL
 * @builtin(position) are both used unflipped; presented-pixel parity is
 * covered with a non-centered, non-default regression fixture.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float amount;
uniform float centerX;
uniform float centerY;

out vec4 fragColor;

const int N = 32;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Rotate uv around center by angle, aspect-corrected exactly as
// filter/pinch's rotate2D corrects its own distortion.
vec2 rotateAround(vec2 uv, vec2 center, float angle, float aspectRatio) {
    vec2 p = uv;
    p.x *= aspectRatio;
    vec2 c = center;
    c.x *= aspectRatio;
    p -= c;
    float s = sin(angle);
    float co = cos(angle);
    p = mat2(co, -s, s, co) * p;
    p += c;
    p.x /= aspectRatio;
    return p;
}

void main() {
    float aspectRatio = fullResolution.x / fullResolution.y;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 center = vec2(centerX, centerY);

    float arc = radians(amount);
    float angularStep = arc / float(N - 1);
    // Mirror-invariant global coordinates keep corresponding WebGL2/WebGPU
    // pixels on the same dither value while remaining continuous across
    // tiled renders. The reflected WebGPU tap set applies the opposite sign.
    vec2 jitterCoord = vec2(globalCoord.x,
        abs(globalCoord.y - fullResolution.y * 0.5));
    float jitter = (hash12(jitterCoord) - 0.5) * angularStep;

    vec4 sum = vec4(0.0);
    for (int i = 0; i < N; i++) {
        float theta = (float(i) / float(N - 1) - 0.5) * arc + jitter;
        vec2 distorted = clamp(rotateAround(uv, center, theta, aspectRatio), 0.0, 1.0);
        vec2 sampleUV = clamp((distorted * fullResolution - tileOffset) / resolution, 0.0, 1.0);
        sum += texture(inputTex, sampleUV);
    }
    fragColor = sum / float(N);
}
`,wgsl:`/*
 * Spin Blur - rotational blur around a center point (Radial
 * Blur, Spin mode). Averages a fixed N-tap comb; each tap resamples the
 * input after rotating the pixel's offset-from-center by
 * theta_i = (i/(N-1) - 0.5) * radians(amount) around (centerX, centerY),
 * aspect-corrected exactly the way filter/pinch's WGSL port corrects its
 * own distortion. A per-pixel hash shifts the whole tap comb by up to
 * half an angular step to hide banding from the fixed tap count.
 */

struct Uniforms {
    amount: f32,
    centerX: f32,
    centerY: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const N: i32 = 32;

fn hash12(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

// The symmetric tap arc is invariant to the backend coordinate
// handedness. Its per-pixel jitter is normalized separately below so
// corresponding presented pixels use the same angular offset.
fn rotateAround(uv: vec2<f32>, center: vec2<f32>, angle: f32, aspectRatio: f32) -> vec2<f32> {
    var p = uv;
    p.x = p.x * aspectRatio;
    var c = center;
    c.x = c.x * aspectRatio;
    p = p - c;
    let s = sin(angle);
    let co = cos(angle);
    p = vec2<f32>(co * p.x - s * p.y, s * p.x + co * p.y);
    p = p + c;
    p.x = p.x / aspectRatio;
    return p;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var fullDims = texSize;
    if (uniforms.fullResolution.x > 0.0) { fullDims = uniforms.fullResolution; }
    let aspectRatio = fullDims.x / fullDims.y;
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = globalCoord / fullDims;
    // Center coordinates are expressed in the effect's normalized
    // sampling frame and therefore stay unchanged between backends.
    let center = vec2<f32>(uniforms.centerX, uniforms.centerY);

    let arc = radians(uniforms.amount);
    let angularStep = arc / f32(N - 1);
    // Mirror-invariant global coordinates match glsl/spinBlur.glsl and
    // remain continuous across tiles. The sign is reversed because
    // reflecting the symmetric tap arc maps theta to -theta, including
    // the sub-step offset.
    let jitterCoord = vec2<f32>(globalCoord.x,
        abs(globalCoord.y - fullDims.y * 0.5));
    let jitter = -(hash12(jitterCoord) - 0.5) * angularStep;

    var sum = vec4<f32>(0.0);
    for (var i: i32 = 0; i < N; i++) {
        let theta = (f32(i) / f32(N - 1) - 0.5) * arc + jitter;
        let distorted = clamp(rotateAround(uv, center, theta, aspectRatio), vec2<f32>(0.0), vec2<f32>(1.0));
        let sampleUV = clamp((distorted * fullDims - uniforms.tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
        sum = sum + textureSample(inputTex, inputSampler, sampleUV);
    }
    return sum / f32(N);
}
`}},o=`# spinBlur

Rotational blur around a center point (Radial Blur, Spin mode)

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 15 | 1-90 | Total arc span in degrees; taps are spread evenly across [-amount/2, +amount/2] around the center |
| centerX | float | 0.5 | 0-1 | Horizontal center of rotation, in normalized image coordinates |
| centerY | float | 0.5 | 0-1 | Vertical center of rotation, in normalized image coordinates |

## Notes

- Averages a fixed 32-tap comb; each tap resamples the input after rotating the pixel's offset from (centerX, centerY) by an angle evenly spaced across the \`amount\`-degree arc.
- Blur strength grows with distance from the center (arc length = radius x angle), so the image stays sharp near the center and smears into curved streaks farther out - the signature look of Radial Blur in Spin mode.
- Each pixel's tap comb is shifted by a random per-pixel offset (up to half an angular step) to hide banding from the fixed tap count.
- Sampling clamps at the image edges (no wrap/mirror/repeat option).
- Distinct from \`filter/zoomBlur\`, which covers Radial Blur Zoom mode (blur radiating outward from center) rather than Spin mode (blur curving around center).

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .spinBlur()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&o&&(t.help=o);var c="filter/spinBlur",p="filter",f="spinBlur",d=t;export{d as default,c as effectId,f as effectName,o as help,p as namespace};
