/* filter/lensWarp */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Lens Warp",namespace:"filter",func:"lensWarp",tags:["distort"],description:"Noise-driven radial lens distortion",globals:{displacement:{type:"float",default:.0625,uniform:"displacement",min:0,max:.25,step:.005,zero:0,ui:{label:"displacement",control:"slider"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"main",program:"lensWarp",inputs:{inputTex:"inputTex"},uniforms:{displacement:"displacement"},outputs:{fragColor:"outputTex"}}]});var s={lensWarp:{glsl:`/*
 * Lens Warp - Noise-driven radial lens distortion
 * Follows filter/warp pattern: Perlin noise displacement with singularity mask
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float displacement;
uniform float speed;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// PCG PRNG (from filter/warp)
uvec3 pcg(uvec3 v) {
    v = v * uint(1664525) + uint(1013904223);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> uint(16);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec3 prng(vec3 p) {
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
    return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}

float smootherstep(float x) {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float smoothlerp(float x, float a, float b) {
    return a + smootherstep(x) * (b - a);
}

float grid(vec2 st, vec2 cell) {
    float angle = prng(vec3(cell, 1.0)).r * TAU;
    angle += time * TAU * speed;
    vec2 gradient = vec2(cos(angle), sin(angle));
    vec2 dist = st - cell;
    return dot(gradient, dist);
}

float perlinNoise(vec2 st, vec2 noiseScale) {
    st *= noiseScale;
    vec2 cell = floor(st);
    float tl = grid(st, cell);
    float tr = grid(st, vec2(cell.x + 1.0, cell.y));
    float bl = grid(st, vec2(cell.x, cell.y + 1.0));
    float br = grid(st, cell + 1.0);
    float upper = smoothlerp(st.x - cell.x, tl, tr);
    float lower = smoothlerp(st.x - cell.x, bl, br);
    float val = smoothlerp(st.y - cell.y, upper, lower);
    return val * 0.5 + 0.5;
}

void main() {
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float aspectRatio = fullRes.x / fullRes.y;
    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;

    // Clamp displacement to stay within overlap and avoid seams
    float maxDisplacementUV = 256.0 / fullRes.x;
    float clampedDisplacement = clamp(displacement, -maxDisplacementUV, maxDisplacementUV);

    // Singularity mask: distance from center, pow(5)
    // Concentrates warp at edges, center stays stable
    vec2 delta = abs(uv - vec2(0.5));
    vec2 scaled = vec2(delta.x * aspectRatio, delta.y);
    float maxRadius = length(vec2(aspectRatio * 0.5, 0.5));
    float mask = pow(clamp(length(scaled) / maxRadius, 0.0, 1.0), 5.0);

    // Two independent Perlin noise fields for X and Y displacement
    vec2 noiseCoord = uv * vec2(aspectRatio, 1.0);
    float noiseX = perlinNoise(noiseCoord + 42.0, vec2(2.0));
    float noiseY = perlinNoise(noiseCoord + 97.0, vec2(2.0));

    // Apply displacement, masked to edges
    uv.x += (noiseX - 0.5) * clampedDisplacement * mask;
    uv.y += (noiseY - 0.5) * clampedDisplacement * mask;

    // Wrap (mirror)
    uv = abs(mod(uv + 1.0, 2.0) - 1.0);

    // Convert to local UV for tile-aware sampling
    vec2 localUV = (uv * fullRes - tileOffset) / resolution;
    localUV = clamp(localUV, 0.0, 1.0);

    if (antialias) {
        vec2 dx = dFdx(uv);
        vec2 dy = dFdy(uv);
        vec4 col = vec4(0.0);
        
        vec2 sUV = ((uv + dx * -0.375 + dy * -0.125) * fullRes - tileOffset) / resolution;
        col += texture(inputTex, clamp(sUV, 0.0, 1.0));
        
        sUV = ((uv + dx *  0.125 + dy * -0.375) * fullRes - tileOffset) / resolution;
        col += texture(inputTex, clamp(sUV, 0.0, 1.0));
        
        sUV = ((uv + dx *  0.375 + dy *  0.125) * fullRes - tileOffset) / resolution;
        col += texture(inputTex, clamp(sUV, 0.0, 1.0));
        
        sUV = ((uv + dx * -0.125 + dy *  0.375) * fullRes - tileOffset) / resolution;
        col += texture(inputTex, clamp(sUV, 0.0, 1.0));
        
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, localUV);
    }
}`,wgsl:`/*
 * Lens Warp - Noise-driven radial lens distortion
 * Follows filter/warp pattern: Perlin noise displacement with singularity mask
 *
 * Tile-aware, mirroring glsl/lensWarp.glsl. The non-tiling path
 * (tileOffset=(0,0)) is byte-identical to the previous shader, so
 * normal-size output is unchanged (zero baseline regression by
 * construction). When tiling, distortion is computed in GLOBAL frame
 * coordinates and the displacement is clamped to <=256px.
 */

struct Uniforms {
    displacement: f32,
    antialias: i32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<uniform> time: f32;
@group(0) @binding(4) var<uniform> speed: f32;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn pcg(v_in: vec3<u32>) -> vec3<u32> {
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

fn prng(p_in: vec3<f32>) -> vec3<f32> {
    var p = p_in;
    p.x = select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0);
    p.y = select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0);
    p.z = select(-p.z * 2.0 + 1.0, p.z * 2.0, p.z >= 0.0);
    return vec3<f32>(pcg(vec3<u32>(p))) / f32(0xffffffff);
}

fn smootherstep(x: f32) -> f32 {
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

fn smoothlerp(x: f32, a: f32, b: f32) -> f32 {
    return a + smootherstep(x) * (b - a);
}

fn grid(st: vec2<f32>, cell: vec2<f32>, t: f32, spd: f32) -> f32 {
    var angle = prng(vec3<f32>(cell, 1.0)).r * TAU;
    angle = angle + t * TAU * spd;
    let gradient = vec2<f32>(cos(angle), sin(angle));
    let dist = st - cell;
    return dot(gradient, dist);
}

fn perlinNoise(st_in: vec2<f32>, noiseScale: vec2<f32>, t: f32, spd: f32) -> f32 {
    let st = st_in * noiseScale;
    let cell = floor(st);
    let tl = grid(st, cell, t, spd);
    let tr = grid(st, vec2<f32>(cell.x + 1.0, cell.y), t, spd);
    let bl = grid(st, vec2<f32>(cell.x, cell.y + 1.0), t, spd);
    let br = grid(st, cell + 1.0, t, spd);
    let upper = smoothlerp(st.x - cell.x, tl, tr);
    let lower = smoothlerp(st.x - cell.x, bl, br);
    let val = smoothlerp(st.y - cell.y, upper, lower);
    return val * 0.5 + 0.5;
}

fn warpedUV(pos: vec2<f32>, frame: vec2<f32>, originOffset: vec2<f32>, disp: f32, t: f32, spd: f32) -> vec2<f32> {
    let aspectRatio = frame.x / frame.y;
    var uv = (pos + originOffset) / frame;
    let delta = abs(uv - vec2<f32>(0.5));
    let scaled = vec2<f32>(delta.x * aspectRatio, delta.y);
    let maxRadius = length(vec2<f32>(aspectRatio * 0.5, 0.5));
    let mask = pow(clamp(length(scaled) / maxRadius, 0.0, 1.0), 5.0);
    let noiseCoord = uv * vec2<f32>(aspectRatio, 1.0);
    let noiseX = perlinNoise(noiseCoord + 42.0, vec2<f32>(2.0), t, spd);
    let noiseY = perlinNoise(noiseCoord + 97.0, vec2<f32>(2.0), t, spd);
    uv.x = uv.x + (noiseX - 0.5) * disp * mask;
    uv.y = uv.y + (noiseY - 0.5) * disp * mask;
    return abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let tileOffset = uniforms.tileOffset;
    let isTile = length(tileOffset) > 0.0;
    let t = time;
    let spd = speed;

    if (isTile) {
        // Mirror glsl/lensWarp.glsl: global frame, displacement clamped to
        // an absolute 256px so the sample stays within the tile overlap.
        let fullRes = select(texSize, uniforms.fullResolution, uniforms.fullResolution.x > 0.0);
        let maxDisplacementUV = 256.0 / fullRes.x;
        let clampedDisp = clamp(uniforms.displacement, -maxDisplacementUV, maxDisplacementUV);
        let uv = warpedUV(pos.xy, fullRes, tileOffset, clampedDisp, t, spd);
        let localUV = clamp((uv * fullRes - tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
        if (uniforms.antialias != 0) {
            let dx = dpdx(localUV);
            let dy = dpdy(localUV);
            var col = vec4<f32>(0.0);
            col += textureSample(inputTex, inputSampler, localUV + dx * -0.375 + dy * -0.125);
            col += textureSample(inputTex, inputSampler, localUV + dx *  0.125 + dy * -0.375);
            col += textureSample(inputTex, inputSampler, localUV + dx *  0.375 + dy *  0.125);
            col += textureSample(inputTex, inputSampler, localUV + dx * -0.125 + dy *  0.375);
            return col * 0.25;
        }
        return textureSample(inputTex, inputSampler, localUV);
    }

    // Non-tiling path: byte-identical to the previous shader.
    let uv = warpedUV(pos.xy, texSize, vec2<f32>(0.0), uniforms.displacement, t, spd);
    if (uniforms.antialias != 0) {
        let dx = dpdx(uv);
        let dy = dpdy(uv);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, uv + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, uv + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    }
    return textureSample(inputTex, inputSampler, uv);
}
`}},i=`# lensWarp

Noise-driven radial lens distortion

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| displacement | float | 0.0625 | 0-0.25 | Displacement amount |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .lensWarp()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(s).length>0){n.shaders||(n.shaders={});for(let[l,e]of Object.entries(s))n.shaders[l]={...e}}n&&i&&(n.help=i);var u="filter/lensWarp",f="filter",c="lensWarp",d=n;export{d as default,u as effectId,c as effectName,i as help,f as namespace};
