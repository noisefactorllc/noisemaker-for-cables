/* synth/navierStokes */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Navier-Stokes",func:"navierStokes",tags:["sim"],description:"Stable-fluids Navier-Stokes solver",defaultProgram:`search synth

noise(
  type: hermite,
  ridges: true,
  speed: 30,
  colorMode: mono
)
  .write(o0)

navierStokes(
  tex: read(o0),
  dyeDecay: 98,
  inputForce: 0.5,
  inputIntensity: 10
)
  .write(o1)

render(o1)`,uniformLayouts:{nsSplat:{resolution:{slot:0,components:"xy"},seed:{slot:0,components:"w"},speed:{slot:1,components:"x"},inputForce:{slot:1,components:"y"},inputDye:{slot:1,components:"z"},resetState:{slot:1,components:"w"}},nsAdvect:{resolution:{slot:0,components:"xy"},speed:{slot:0,components:"w"},dyeDecay:{slot:1,components:"x"},velocityDecay:{slot:1,components:"y"}},nsSmooth:{resolution:{slot:0,components:"xy"},smoothing:{slot:0,components:"z"}},nsDivergence:{resolution:{slot:0,components:"xy"}},nsPressure:{resolution:{slot:0,components:"xy"}},nsGradient:{resolution:{slot:0,components:"xy"}},ns:{resolution:{slot:0,components:"xy"},inputIntensity:{slot:1,components:"x"}}},textures:{global_ns_velocity:{width:{screenDivide:"zoom",default:4},height:{screenDivide:"zoom",default:4},format:"rgba16f"},global_ns_pressure:{width:{screenDivide:"zoom",default:4},height:{screenDivide:"zoom",default:4},format:"rgba16f"},global_ns_smoothed:{width:"100%",height:"100%"}},globals:{tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},zoom:{type:"int",default:1,choices:{x1:1,x2:2,x4:4,x8:8,x16:16,x32:32},randChoices:[2,4,8],ui:{label:"zoom",control:"dropdown"}},iterations:{type:"int",default:30,uniform:"iterations",min:4,max:40,ui:{label:"pressure iter",control:"slider",category:"solver"}},smoothing:{type:"int",default:1,uniform:"smoothing",choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6},ui:{label:"smoothing",control:"dropdown"}},speed:{type:"float",default:100,uniform:"speed",min:5,max:145,ui:{label:"speed",control:"slider"}},dyeDecay:{type:"float",default:98,uniform:"dyeDecay",min:80,max:100,ui:{label:"dye decay",control:"slider",category:"decay"}},velocityDecay:{type:"float",default:99,uniform:"velocityDecay",min:80,max:100,ui:{label:"vel decay",control:"slider",category:"decay"}},inputForce:{type:"float",default:.5,uniform:"inputForce",min:0,max:1,step:.01,randChance:0,ui:{label:"input force",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}},inputDye:{type:"float",default:.9,uniform:"inputDye",min:0,max:1,step:.01,randChance:0,ui:{label:"input dye",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}},inputIntensity:{type:"float",default:10,uniform:"inputIntensity",min:0,max:100,randChance:0,ui:{label:"input mix",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"stir",label:"state"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:!1}}},passes:[{name:"splat",program:"nsSplat",inputs:{bufTex:"global_ns_velocity",inputTex:"tex"},outputs:{fragColor:"global_ns_velocity"}},{name:"advect",program:"nsAdvect",inputs:{bufTex:"global_ns_velocity"},outputs:{fragColor:"global_ns_velocity"}},{name:"divergence",program:"nsDivergence",inputs:{velTex:"global_ns_velocity"},outputs:{fragColor:"global_ns_pressure"}},{name:"pressure",program:"nsPressure",repeat:"iterations",inputs:{bufTex:"global_ns_pressure"},outputs:{fragColor:"global_ns_pressure"}},{name:"gradient",program:"nsGradient",inputs:{velTex:"global_ns_velocity",pressureTex:"global_ns_pressure"},outputs:{fragColor:"global_ns_velocity"}},{name:"smooth",program:"nsSmooth",inputs:{canvasTex:"global_ns_velocity"},outputs:{fragColor:"global_ns_smoothed"}},{name:"render",program:"ns",inputs:{fbTex:"global_ns_smoothed",inputTex:"tex"},outputs:{fragColor:"outputTex"}}]});var r={ns:{glsl:`#version 300 es

/*
 * Navier-Stokes display pass.
 * Plain bilinear blit of the intermediate smoothed canvas into the output. The smoothing kernel
 * lives in nsSmooth (between sim and display), not here \u2014 so this pass does no kernel work and
 * never operates at the compute canvas's native resolution.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float inputIntensity;

uniform sampler2D fbTex;
uniform sampler2D inputTex;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(fbTex, 0);
    ivec2 minIdx = ivec2(0);
    ivec2 maxIdx = texSize - ivec2(1);

    vec2 texelPos = (globalCoord * vec2(texSize) / fullResolution) - vec2(0.5);
    ivec2 baseI = ivec2(floor(texelPos));
    vec2 f = fract(texelPos);

    float v00 = texelFetch(fbTex, clamp(baseI,                       minIdx, maxIdx), 0).b;
    float v10 = texelFetch(fbTex, clamp(baseI + ivec2(1, 0),         minIdx, maxIdx), 0).b;
    float v01 = texelFetch(fbTex, clamp(baseI + ivec2(0, 1),         minIdx, maxIdx), 0).b;
    float v11 = texelFetch(fbTex, clamp(baseI + ivec2(1, 1),         minIdx, maxIdx), 0).b;

    float v0 = mix(v00, v10, f.x);
    float v1 = mix(v01, v11, f.x);
    float state = mix(v0, v1, f.y);

    float intensity = clamp(state, 0.0, 1.0);
    vec3 outCol = vec3(intensity);

    float blend = clamp(inputIntensity, 0.0, 100.0) * 0.01;
    if (blend > 0.0) {
        vec2 inputUv = globalCoord / fullResolution;
        vec3 inputColor = texture(inputTex, inputUv).rgb;
        outCol = mix(outCol, inputColor, blend);
    }

    fragColor = vec4(outCol, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes display pass.
 * Plain bilinear blit of the intermediate smoothed canvas. No smoothing math here.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, _)
    // data[1] = (inputIntensity, _, _, _)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var fbTex : texture_2d<f32>;
@group(0) @binding(3) var inputTex : texture_2d<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let inputIntensity = uniforms.data[1].x;

    let texSize = vec2<i32>(textureDimensions(fbTex, 0));
    let texSizeF = vec2<f32>(texSize);
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);

    let texelPos = (pos.xy * texSizeF / resolution) - vec2<f32>(0.5);
    let baseI = vec2<i32>(floor(texelPos));
    let f = fract(texelPos);

    let v00 = textureLoad(fbTex, clamp(baseI,                           minIdx, maxIdx), 0).b;
    let v10 = textureLoad(fbTex, clamp(baseI + vec2<i32>(1, 0),         minIdx, maxIdx), 0).b;
    let v01 = textureLoad(fbTex, clamp(baseI + vec2<i32>(0, 1),         minIdx, maxIdx), 0).b;
    let v11 = textureLoad(fbTex, clamp(baseI + vec2<i32>(1, 1),         minIdx, maxIdx), 0).b;

    let v0 = mix(v00, v10, f.x);
    let v1 = mix(v01, v11, f.x);
    let state = mix(v0, v1, f.y);

    let intensity = clamp(state, 0.0, 1.0);
    var outCol = vec3<f32>(intensity);

    let blend = clamp(inputIntensity, 0.0, 100.0) * 0.01;
    if (blend > 0.0) {
        let inputColor = textureSampleLevel(inputTex, samp, pos.xy / resolution, 0.0).rgb;
        outCol = mix(outCol, inputColor, vec3<f32>(blend));
    }

    return vec4<f32>(outCol, 1.0);
}
`},nsAdvect:{glsl:`#version 300 es

/*
 * Navier-Stokes advection pass (semi-Lagrangian).
 * Canonical bilinear backtrace sample \u2014 fixed kernel so each frame's advection doesn't compound
 * extra blur into the compute texture. The smoothing dropdown is a display-side read of the
 * canvas, not a sim-side filter.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;
uniform float speed;
uniform float dyeDecay;
uniform float velocityDecay;

uniform sampler2D bufTex;

out vec4 fragColor;

vec4 fetchTex(ivec2 idx, ivec2 minIdx, ivec2 maxIdx) {
    return texelFetch(bufTex, clamp(idx, minIdx, maxIdx), 0);
}

vec4 sampleBilinear(vec2 uv, ivec2 texSize) {
    ivec2 minIdx = ivec2(0);
    ivec2 maxIdx = texSize - ivec2(1);
    vec2 texelPos = uv * vec2(texSize) - vec2(0.5);
    ivec2 baseI = ivec2(floor(texelPos));
    vec2 f = fract(texelPos);

    vec4 v00 = fetchTex(baseI,                       minIdx, maxIdx);
    vec4 v10 = fetchTex(baseI + ivec2(1, 0),         minIdx, maxIdx);
    vec4 v01 = fetchTex(baseI + ivec2(0, 1),         minIdx, maxIdx);
    vec4 v11 = fetchTex(baseI + ivec2(1, 1),         minIdx, maxIdx);
    vec4 v0 = mix(v00, v10, f.x);
    vec4 v1 = mix(v01, v11, f.x);
    return mix(v0, v1, f.y);
}

void main() {
    ivec2 texSize = textureSize(bufTex, 0);
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / vec2(texSize);

    vec4 here = texelFetch(bufTex, clamp(ivec2(fragCoord), ivec2(0), texSize - ivec2(1)), 0);
    vec2 u = here.rg;

    float dt = clamp(speed, 0.0, 200.0) * 0.0001;
    vec2 backUv = clamp(uv - u * dt, vec2(0.0), vec2(1.0));

    vec4 advected = sampleBilinear(backUv, texSize);
    vec2 newVel = advected.rg;
    float newDye = advected.b;

    float vDecay = pow(clamp(velocityDecay, 0.0, 100.0) * 0.01, dt * 60.0);
    float dDecay = pow(clamp(dyeDecay, 0.0, 100.0) * 0.01, dt * 60.0);

    newVel *= vDecay;
    newDye *= dDecay;

    fragColor = vec4(newVel, newDye, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes advection pass (semi-Lagrangian).
 * Mirrors glsl/nsAdvect.glsl: canonical bilinear backtrace sample, decay applied. No kernel
 * choice here \u2014 smoothing lives in the dedicated nsSmooth pass between sim and display so the
 * compute canvas never receives blended pixels.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, speed)
    // data[1] = (dyeDecay, velocityDecay, _, _)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var bufTex : texture_2d<f32>;

fn fetchTex(idx: vec2<i32>, minIdx: vec2<i32>, maxIdx: vec2<i32>) -> vec4<f32> {
    return textureLoad(bufTex, clamp(idx, minIdx, maxIdx), 0);
}

fn sampleBilinear(uv: vec2<f32>, texSize: vec2<i32>) -> vec4<f32> {
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);
    let texSizeF = vec2<f32>(texSize);
    let texelPos = uv * texSizeF - vec2<f32>(0.5);
    let baseI = vec2<i32>(floor(texelPos));
    let f = fract(texelPos);

    let v00 = fetchTex(baseI,                            minIdx, maxIdx);
    let v10 = fetchTex(baseI + vec2<i32>(1, 0),          minIdx, maxIdx);
    let v01 = fetchTex(baseI + vec2<i32>(0, 1),          minIdx, maxIdx);
    let v11 = fetchTex(baseI + vec2<i32>(1, 1),          minIdx, maxIdx);
    let v0 = mix(v00, v10, vec4<f32>(f.x));
    let v1 = mix(v01, v11, vec4<f32>(f.x));
    return mix(v0, v1, vec4<f32>(f.y));
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let speed = uniforms.data[0].w;
    let dyeDecay = uniforms.data[1].x;
    let velocityDecay = uniforms.data[1].y;

    let texSize = vec2<i32>(textureDimensions(bufTex, 0));
    let texSizeF = vec2<f32>(texSize);
    let fragCoord = pos.xy;
    let uv = fragCoord / texSizeF;

    let here = textureLoad(bufTex, clamp(vec2<i32>(fragCoord), vec2<i32>(0), texSize - vec2<i32>(1)), 0);
    let u = here.rg;

    let dt = clamp(speed, 0.0, 200.0) * 0.0001;
    let backUv = clamp(uv - u * dt, vec2<f32>(0.0), vec2<f32>(1.0));

    let advected = sampleBilinear(backUv, texSize);
    var newVel = advected.rg;
    var newDye = advected.b;

    let vDecay = pow(clamp(velocityDecay, 0.0, 100.0) * 0.01, dt * 60.0);
    let dDecay = pow(clamp(dyeDecay, 0.0, 100.0) * 0.01, dt * 60.0);

    newVel = newVel * vDecay;
    newDye = newDye * dDecay;

    return vec4<f32>(newVel, newDye, 1.0);
}
`},nsDivergence:{glsl:`#version 300 es

/*
 * Navier-Stokes divergence pass.
 * Centered finite difference of velocity into the G channel of pressure state, zeroing R so the
 * subsequent Jacobi iterations start from p = 0 each frame.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;

uniform sampler2D velTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(velTex, 0);
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 texel = 1.0 / vec2(texSize);
    vec2 uv = fragCoord / vec2(texSize);

    vec2 uR = texture(velTex, uv + vec2(texel.x, 0.0)).rg;
    vec2 uL = texture(velTex, uv - vec2(texel.x, 0.0)).rg;
    vec2 uT = texture(velTex, uv + vec2(0.0, texel.y)).rg;
    vec2 uB = texture(velTex, uv - vec2(0.0, texel.y)).rg;

    // Free-slip at boundaries: mirror normal component so velocity can't drive flow through walls.
    if (fragCoord.x < 1.0) { uL.x = -uR.x; }
    if (fragCoord.x > float(texSize.x) - 1.0) { uR.x = -uL.x; }
    if (fragCoord.y < 1.0) { uB.y = -uT.y; }
    if (fragCoord.y > float(texSize.y) - 1.0) { uT.y = -uB.y; }

    float div = 0.5 * ((uR.x - uL.x) + (uT.y - uB.y));

    fragColor = vec4(0.0, div, 0.0, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes divergence pass.
 * Mirrors glsl/nsDivergence.glsl. Uses textureLoad on integer texel coords \u2014 the velocity
 * texture is rgba16f which is not guaranteed to be sampler-filterable in WebGPU.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, _)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var velTex : texture_2d<f32>;

fn fetchVel(idx: vec2<i32>, minIdx: vec2<i32>, maxIdx: vec2<i32>) -> vec2<f32> {
    return textureLoad(velTex, clamp(idx, minIdx, maxIdx), 0).rg;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(velTex, 0));
    let texSizeF = vec2<f32>(texSize);
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);
    let fragCoord = pos.xy;
    let centerI = vec2<i32>(floor(fragCoord));

    var uR = fetchVel(centerI + vec2<i32>(1, 0),  minIdx, maxIdx);
    var uL = fetchVel(centerI + vec2<i32>(-1, 0), minIdx, maxIdx);
    var uT = fetchVel(centerI + vec2<i32>(0, 1),  minIdx, maxIdx);
    var uB = fetchVel(centerI + vec2<i32>(0, -1), minIdx, maxIdx);

    if (fragCoord.x < 1.0) { uL.x = -uR.x; }
    if (fragCoord.x > texSizeF.x - 1.0) { uR.x = -uL.x; }
    if (fragCoord.y < 1.0) { uB.y = -uT.y; }
    if (fragCoord.y > texSizeF.y - 1.0) { uT.y = -uB.y; }

    let div = 0.5 * ((uR.x - uL.x) + (uT.y - uB.y));

    return vec4<f32>(0.0, div, 0.0, 1.0);
}
`},nsGradient:{glsl:`#version 300 es

/*
 * Navier-Stokes gradient subtraction (projection) pass.
 * Subtracts \u2207p from the velocity field so the result is divergence-free (Helmholtz-Hodge).
 * Velocity is stored unencoded in R,G; dye in B is passed through untouched.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;

uniform sampler2D velTex;
uniform sampler2D pressureTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(velTex, 0);
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 texel = 1.0 / vec2(texSize);
    vec2 uv = fragCoord / vec2(texSize);

    float pR = texture(pressureTex, uv + vec2(texel.x, 0.0)).r;
    float pL = texture(pressureTex, uv - vec2(texel.x, 0.0)).r;
    float pT = texture(pressureTex, uv + vec2(0.0, texel.y)).r;
    float pB = texture(pressureTex, uv - vec2(0.0, texel.y)).r;

    vec2 grad = 0.5 * vec2(pR - pL, pT - pB);

    vec4 here = texture(velTex, uv);
    vec2 u = here.rg - grad;

    fragColor = vec4(u, here.b, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes gradient subtraction (projection) pass.
 * Mirrors glsl/nsGradient.glsl. textureLoad on integer texel coords (rgba16f, no sampler).
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, _)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var velTex : texture_2d<f32>;
@group(0) @binding(3) var pressureTex : texture_2d<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(velTex, 0));
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);
    let centerI = vec2<i32>(floor(pos.xy));

    let pR = textureLoad(pressureTex, clamp(centerI + vec2<i32>(1, 0),  minIdx, maxIdx), 0).r;
    let pL = textureLoad(pressureTex, clamp(centerI + vec2<i32>(-1, 0), minIdx, maxIdx), 0).r;
    let pT = textureLoad(pressureTex, clamp(centerI + vec2<i32>(0, 1),  minIdx, maxIdx), 0).r;
    let pB = textureLoad(pressureTex, clamp(centerI + vec2<i32>(0, -1), minIdx, maxIdx), 0).r;

    let grad = 0.5 * vec2<f32>(pR - pL, pT - pB);

    let here = textureLoad(velTex, clamp(centerI, minIdx, maxIdx), 0);
    let u = here.rg - grad;

    return vec4<f32>(u, here.b, 1.0);
}
`},nsPressure:{glsl:`#version 300 es

/*
 * Navier-Stokes pressure pass (Jacobi iteration).
 * One step of the Jacobi solver for \u2207\xB2p = \u2207\xB7u. Pressure is in R, divergence in G (preserved
 * across iterations). The runtime ping-pongs the state texture for each repeated invocation.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;

uniform sampler2D bufTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(bufTex, 0);
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 texel = 1.0 / vec2(texSize);
    vec2 uv = fragCoord / vec2(texSize);

    float pR = texture(bufTex, uv + vec2(texel.x, 0.0)).r;
    float pL = texture(bufTex, uv - vec2(texel.x, 0.0)).r;
    float pT = texture(bufTex, uv + vec2(0.0, texel.y)).r;
    float pB = texture(bufTex, uv - vec2(0.0, texel.y)).r;

    float div = texture(bufTex, uv).g;

    float p = (pR + pL + pT + pB - div) * 0.25;

    fragColor = vec4(p, div, 0.0, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes pressure pass (Jacobi iteration).
 * Mirrors glsl/nsPressure.glsl. textureLoad on integer texel coords (rgba16f, no sampler).
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, _)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var bufTex : texture_2d<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<i32>(textureDimensions(bufTex, 0));
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);
    let centerI = vec2<i32>(floor(pos.xy));

    let pR = textureLoad(bufTex, clamp(centerI + vec2<i32>(1, 0),  minIdx, maxIdx), 0).r;
    let pL = textureLoad(bufTex, clamp(centerI + vec2<i32>(-1, 0), minIdx, maxIdx), 0).r;
    let pT = textureLoad(bufTex, clamp(centerI + vec2<i32>(0, 1),  minIdx, maxIdx), 0).r;
    let pB = textureLoad(bufTex, clamp(centerI + vec2<i32>(0, -1), minIdx, maxIdx), 0).r;

    let div = textureLoad(bufTex, clamp(centerI, minIdx, maxIdx), 0).g;

    let p = (pR + pL + pT + pB - div) * 0.25;

    return vec4<f32>(p, div, 0.0, 1.0);
}
`},nsSmooth:{glsl:`#version 300 es

/*
 * Navier-Stokes smoothing pass.
 * Reads the compute canvas at low (zoom-divided) resolution, applies the selected smoothing
 * kernel during upsample to the intermediate smoothed canvas. Writes to a SEPARATE texture
 * (global_ns_smoothed) so the compute canvas is never polluted by blended pixels. The kernel
 * does the upsample work \u2014 final display is just a bilinear copy.
 *
 * All 7 sim-tag smoothing modes are present:
 *   0 constant, 1 linear, 2 hermite, 3 catmullRom3x3, 4 catmullRom4x4, 5 bSpline3x3, 6 bSpline4x4
 */

precision highp float;
precision highp int;

uniform vec2 resolution;
uniform int smoothing;

uniform sampler2D canvasTex;

out vec4 fragColor;

vec4 fetchTex(ivec2 idx, ivec2 minIdx, ivec2 maxIdx) {
    return texelFetch(canvasTex, clamp(idx, minIdx, maxIdx), 0);
}

vec4 quad3v(vec4 p0, vec4 p1, vec4 p2, float t) {
    float t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

vec4 bicubic4v(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    float b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float b3 = t3 / 6.0;
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

vec4 catmull3v(vec4 p0, vec4 p1, vec4 p2, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    vec4 m = 0.5 * (p2 - p0);
    return (2.0*t3 - 3.0*t2 + 1.0) * p1 +
           (t3 - 2.0*t2 + t) * m +
           (-2.0*t3 + 3.0*t2) * p2 +
           (t3 - t2) * m;
}

vec4 catmull4v(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t) {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

void main() {
    ivec2 texSize = textureSize(canvasTex, 0);
    ivec2 minIdx = ivec2(0);
    ivec2 maxIdx = texSize - ivec2(1);

    // Map our (intermediate-res) pixel into the compute canvas's fractional texel grid.
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texelPos = uv * vec2(texSize) - vec2(0.5);
    ivec2 baseI = ivec2(floor(texelPos));
    vec2 f = fract(texelPos);

    vec4 sampled;
    if (smoothing == 0) {
        ivec2 idx = clamp(ivec2(floor(texelPos + 0.5)), minIdx, maxIdx);
        sampled = texelFetch(canvasTex, idx, 0);
    } else if (smoothing == 2) {
        vec4 v00 = fetchTex(baseI,                       minIdx, maxIdx);
        vec4 v10 = fetchTex(baseI + ivec2(1, 0),         minIdx, maxIdx);
        vec4 v01 = fetchTex(baseI + ivec2(0, 1),         minIdx, maxIdx);
        vec4 v11 = fetchTex(baseI + ivec2(1, 1),         minIdx, maxIdx);
        vec2 w = smoothstep(vec2(0.0), vec2(1.0), f);
        vec4 v0 = mix(v00, v10, w.x);
        vec4 v1 = mix(v01, v11, w.x);
        sampled = mix(v0, v1, w.y);
    } else if (smoothing == 3) {
        vec4 p[9];
        for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 3; i++) {
                p[j * 3 + i] = fetchTex(baseI + ivec2(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        vec4 r0 = catmull3v(p[0], p[1], p[2], f.x);
        vec4 r1 = catmull3v(p[3], p[4], p[5], f.x);
        vec4 r2 = catmull3v(p[6], p[7], p[8], f.x);
        sampled = catmull3v(r0, r1, r2, f.y);
    } else if (smoothing == 4) {
        vec4 p[16];
        for (int j = 0; j < 4; j++) {
            for (int i = 0; i < 4; i++) {
                p[j * 4 + i] = fetchTex(baseI + ivec2(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        vec4 r0 = catmull4v(p[0], p[1], p[2], p[3], f.x);
        vec4 r1 = catmull4v(p[4], p[5], p[6], p[7], f.x);
        vec4 r2 = catmull4v(p[8], p[9], p[10], p[11], f.x);
        vec4 r3 = catmull4v(p[12], p[13], p[14], p[15], f.x);
        sampled = catmull4v(r0, r1, r2, r3, f.y);
    } else if (smoothing == 5) {
        vec4 p[9];
        for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 3; i++) {
                p[j * 3 + i] = fetchTex(baseI + ivec2(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        vec4 r0 = quad3v(p[0], p[1], p[2], f.x);
        vec4 r1 = quad3v(p[3], p[4], p[5], f.x);
        vec4 r2 = quad3v(p[6], p[7], p[8], f.x);
        sampled = quad3v(r0, r1, r2, f.y);
    } else if (smoothing == 6) {
        vec4 p[16];
        for (int j = 0; j < 4; j++) {
            for (int i = 0; i < 4; i++) {
                p[j * 4 + i] = fetchTex(baseI + ivec2(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        vec4 r0 = bicubic4v(p[0], p[1], p[2], p[3], f.x);
        vec4 r1 = bicubic4v(p[4], p[5], p[6], p[7], f.x);
        vec4 r2 = bicubic4v(p[8], p[9], p[10], p[11], f.x);
        vec4 r3 = bicubic4v(p[12], p[13], p[14], p[15], f.x);
        sampled = bicubic4v(r0, r1, r2, r3, f.y);
    } else {
        // linear (smoothing == 1)
        vec4 v00 = fetchTex(baseI,                       minIdx, maxIdx);
        vec4 v10 = fetchTex(baseI + ivec2(1, 0),         minIdx, maxIdx);
        vec4 v01 = fetchTex(baseI + ivec2(0, 1),         minIdx, maxIdx);
        vec4 v11 = fetchTex(baseI + ivec2(1, 1),         minIdx, maxIdx);
        vec4 v0 = mix(v00, v10, f.x);
        vec4 v1 = mix(v01, v11, f.x);
        sampled = mix(v0, v1, f.y);
    }

    fragColor = sampled;
}
`,wgsl:`/*
 * WGSL Navier-Stokes smoothing pass.
 * Mirrors glsl/nsSmooth.glsl: applies the selected kernel during upsample from compute canvas
 * to intermediate smoothed canvas. All 7 sim-tag modes (constant, linear, hermite,
 * catmullRom3x3, catmullRom4x4, bSpline3x3, bSpline4x4).
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, smoothing, _)
    // data[1] reserved for layout padding
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var canvasTex : texture_2d<f32>;

fn fetchTex(idx: vec2<i32>, minIdx: vec2<i32>, maxIdx: vec2<i32>) -> vec4<f32> {
    return textureLoad(canvasTex, clamp(idx, minIdx, maxIdx), 0);
}

fn quad3v(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

fn bicubic4v(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, p3: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;
    let t3 = t2 * t;
    let b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    let b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    let b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    let b3 = t3 / 6.0;
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

fn catmull3v(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;
    let t3 = t2 * t;
    let m = 0.5 * (p2 - p0);
    return (2.0*t3 - 3.0*t2 + 1.0) * p1 +
           (t3 - 2.0*t2 + t) * m +
           (-2.0*t3 + 3.0*t2) * p2 +
           (t3 - t2) * m;
}

fn catmull4v(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, p3: vec4<f32>, t: f32) -> vec4<f32> {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let smoothing = i32(uniforms.data[0].z);

    let texSize = vec2<i32>(textureDimensions(canvasTex, 0));
    let texSizeF = vec2<f32>(texSize);
    let minIdx = vec2<i32>(0);
    let maxIdx = texSize - vec2<i32>(1);

    let uv = pos.xy / resolution;
    let texelPos = uv * texSizeF - vec2<f32>(0.5);
    let baseI = vec2<i32>(floor(texelPos));
    let f = fract(texelPos);

    var sampled : vec4<f32>;

    if (smoothing == 0) {
        let idx = clamp(vec2<i32>(floor(texelPos + 0.5)), minIdx, maxIdx);
        sampled = textureLoad(canvasTex, idx, 0);
    } else if (smoothing == 2) {
        let v00 = fetchTex(baseI,                            minIdx, maxIdx);
        let v10 = fetchTex(baseI + vec2<i32>(1, 0),          minIdx, maxIdx);
        let v01 = fetchTex(baseI + vec2<i32>(0, 1),          minIdx, maxIdx);
        let v11 = fetchTex(baseI + vec2<i32>(1, 1),          minIdx, maxIdx);
        let w = smoothstep(vec2<f32>(0.0), vec2<f32>(1.0), f);
        let v0 = mix(v00, v10, vec4<f32>(w.x));
        let v1 = mix(v01, v11, vec4<f32>(w.x));
        sampled = mix(v0, v1, vec4<f32>(w.y));
    } else if (smoothing == 3) {
        var p : array<vec4<f32>, 9>;
        for (var j: i32 = 0; j < 3; j = j + 1) {
            for (var i: i32 = 0; i < 3; i = i + 1) {
                p[j * 3 + i] = fetchTex(baseI + vec2<i32>(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        let r0 = catmull3v(p[0], p[1], p[2], f.x);
        let r1 = catmull3v(p[3], p[4], p[5], f.x);
        let r2 = catmull3v(p[6], p[7], p[8], f.x);
        sampled = catmull3v(r0, r1, r2, f.y);
    } else if (smoothing == 4) {
        var p : array<vec4<f32>, 16>;
        for (var j: i32 = 0; j < 4; j = j + 1) {
            for (var i: i32 = 0; i < 4; i = i + 1) {
                p[j * 4 + i] = fetchTex(baseI + vec2<i32>(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        let r0 = catmull4v(p[0], p[1], p[2], p[3], f.x);
        let r1 = catmull4v(p[4], p[5], p[6], p[7], f.x);
        let r2 = catmull4v(p[8], p[9], p[10], p[11], f.x);
        let r3 = catmull4v(p[12], p[13], p[14], p[15], f.x);
        sampled = catmull4v(r0, r1, r2, r3, f.y);
    } else if (smoothing == 5) {
        var p : array<vec4<f32>, 9>;
        for (var j: i32 = 0; j < 3; j = j + 1) {
            for (var i: i32 = 0; i < 3; i = i + 1) {
                p[j * 3 + i] = fetchTex(baseI + vec2<i32>(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        let r0 = quad3v(p[0], p[1], p[2], f.x);
        let r1 = quad3v(p[3], p[4], p[5], f.x);
        let r2 = quad3v(p[6], p[7], p[8], f.x);
        sampled = quad3v(r0, r1, r2, f.y);
    } else if (smoothing == 6) {
        var p : array<vec4<f32>, 16>;
        for (var j: i32 = 0; j < 4; j = j + 1) {
            for (var i: i32 = 0; i < 4; i = i + 1) {
                p[j * 4 + i] = fetchTex(baseI + vec2<i32>(i - 1, j - 1), minIdx, maxIdx);
            }
        }
        let r0 = bicubic4v(p[0], p[1], p[2], p[3], f.x);
        let r1 = bicubic4v(p[4], p[5], p[6], p[7], f.x);
        let r2 = bicubic4v(p[8], p[9], p[10], p[11], f.x);
        let r3 = bicubic4v(p[12], p[13], p[14], p[15], f.x);
        sampled = bicubic4v(r0, r1, r2, r3, f.y);
    } else {
        let v00 = fetchTex(baseI,                            minIdx, maxIdx);
        let v10 = fetchTex(baseI + vec2<i32>(1, 0),          minIdx, maxIdx);
        let v01 = fetchTex(baseI + vec2<i32>(0, 1),          minIdx, maxIdx);
        let v11 = fetchTex(baseI + vec2<i32>(1, 1),          minIdx, maxIdx);
        let v0 = mix(v00, v10, vec4<f32>(f.x));
        let v1 = mix(v01, v11, vec4<f32>(f.x));
        sampled = mix(v0, v1, vec4<f32>(f.y));
    }

    return sampled;
}
`},nsSplat:{glsl:`#version 300 es

/*
 * Navier-Stokes external-force / source pass.
 * On first frame or reset: seeds the velocity field with several coherent vortex blobs (curl
 * potential) and matching dye spots. With an input texture, the luminance gradient drives a
 * continuous force and brightness contributes dye. State is stored in rgba16f, so velocity in
 * R,G is float \u2014 no encoding roundtrip \u2014 which avoids the precision-loss noise that bites at 8-bit.
 */

precision highp float;
precision highp int;

uniform vec2 resolution;
uniform int seed;
uniform float speed;
uniform float inputForce;
uniform float inputDye;
uniform bool resetState;

uniform sampler2D bufTex;
uniform sampler2D inputTex;

out vec4 fragColor;

#define NUM_INIT_VORTICES 9

float hash11(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float lum(vec3 c) {
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

void main() {
    ivec2 texSize = textureSize(bufTex, 0);
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / vec2(texSize);

    vec4 prev = texture(bufTex, uv);

    // First-frame buffer is all zeros (including A, which is initialized to 0 by the runtime).
    // We detect this and seed initial conditions on the first frame OR when the user hits reset.
    bool bufferEmpty = (prev.a == 0.0);
    if (resetState || bufferEmpty) {
        vec2 vel = vec2(0.0);
        float dye = 0.0;
        float seedF = float(seed);
        for (int i = 0; i < NUM_INIT_VORTICES; i++) {
            float idf = float(i);
            vec2 c = hash22(vec2(idf * 7.31 + 1.0, seedF * 13.7 + idf));
            float sign = hash11(idf * 4.17 + seedF * 5.9) > 0.5 ? 1.0 : -1.0;
            float radius = 0.10 + 0.06 * hash11(idf * 2.11 + seedF);

            vec2 d = uv - c;
            float r2 = dot(d, d);
            float falloff = exp(-r2 / (2.0 * radius * radius));
            // Tangential velocity: rotate radial vector 90 degrees, scale by Gaussian envelope.
            // The 12.0 sets the angular speed \u2014 enough that vortices visibly rotate at default dt.
            vec2 tangent = vec2(-d.y, d.x);
            vel += tangent * sign * falloff * 12.0;
            dye += falloff;
        }
        // A=1.0 marks "buffer has been initialized" \u2014 distinguishes initialized-but-quiet from empty.
        fragColor = vec4(vel, clamp(dye, 0.0, 1.0), 1.0);
        return;
    }

    vec2 vel = prev.rg;
    float dye = prev.b;

    float dt = clamp(speed, 0.0, 200.0) * 0.0001;

    // Input-texture-driven additions.
    float iForce = clamp(inputForce, 0.0, 100.0) * 0.01;
    float iDye = clamp(inputDye, 0.0, 100.0) * 0.01;
    if (iForce > 0.0 || iDye > 0.0) {
        vec2 texel = 1.0 / vec2(texSize);
        float lc = lum(texture(inputTex, uv).rgb);
        float lr = lum(texture(inputTex, uv + vec2(texel.x, 0.0)).rgb);
        float lu = lum(texture(inputTex, uv + vec2(0.0, texel.y)).rgb);
        vec2 grad = vec2(lr - lc, lu - lc);
        vel += grad * iForce * 50.0;
        dye += lc * iDye * dt * 60.0;
    }

    dye = clamp(dye, 0.0, 2.0);

    fragColor = vec4(vel, dye, 1.0);
}
`,wgsl:`/*
 * WGSL Navier-Stokes external-force / source pass.
 * Mirrors glsl/nsSplat.glsl: seeds initial vortices on reset/first frame, applies input-driven
 * force and dye on subsequent frames. State is rgba16f so velocity is stored unencoded.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, _, seed)
    // data[1] = (speed, inputForce, inputDye, resetState)
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var bufTex : texture_2d<f32>;
@group(0) @binding(3) var inputTex : texture_2d<f32>;

const NUM_INIT_VORTICES : i32 = 9;

fn hash11(x: f32) -> f32 {
    return fract(sin(x * 12.9898) * 43758.5453);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
    let q = vec2<f32>(dot(p, vec2<f32>(127.1, 311.7)), dot(p, vec2<f32>(269.5, 183.3)));
    return fract(sin(q) * 43758.5453);
}

fn lum(c: vec3<f32>) -> f32 {
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let seedF = uniforms.data[0].w;
    let speed = uniforms.data[1].x;
    let inputForce = uniforms.data[1].y;
    let inputDye = uniforms.data[1].z;
    let resetState = uniforms.data[1].w > 0.5;

    let texSizeI = vec2<i32>(textureDimensions(bufTex, 0));
    let texSize = vec2<f32>(texSizeI);
    let fragCoord = pos.xy;
    let uv = fragCoord / texSize;

    // State is rgba16f \u2014 read with textureLoad on integer texel coords (sampler-filterable
    // float textures aren't guaranteed in WebGPU).
    let prev = textureLoad(bufTex, clamp(vec2<i32>(fragCoord), vec2<i32>(0), texSizeI - vec2<i32>(1)), 0);

    let bufferEmpty = (prev.a == 0.0);
    if (resetState || bufferEmpty) {
        var vel = vec2<f32>(0.0);
        var dye = 0.0;
        for (var i: i32 = 0; i < NUM_INIT_VORTICES; i = i + 1) {
            let idf = f32(i);
            let c = hash22(vec2<f32>(idf * 7.31 + 1.0, seedF * 13.7 + idf));
            var sign = -1.0;
            if (hash11(idf * 4.17 + seedF * 5.9) > 0.5) { sign = 1.0; }
            let radius = 0.10 + 0.06 * hash11(idf * 2.11 + seedF);

            let d = uv - c;
            let r2 = dot(d, d);
            let falloff = exp(-r2 / (2.0 * radius * radius));
            let tangent = vec2<f32>(-d.y, d.x);
            vel = vel + tangent * sign * falloff * 12.0;
            dye = dye + falloff;
        }
        return vec4<f32>(vel, clamp(dye, 0.0, 1.0), 1.0);
    }

    var vel = prev.rg;
    var dye = prev.b;

    let dt = clamp(speed, 0.0, 200.0) * 0.0001;

    let iForce = clamp(inputForce, 0.0, 100.0) * 0.01;
    let iDye = clamp(inputDye, 0.0, 100.0) * 0.01;
    if (iForce > 0.0 || iDye > 0.0) {
        let texel = vec2<f32>(1.0, 1.0) / texSize;
        let lc = lum(textureSampleLevel(inputTex, samp, uv, 0.0).rgb);
        let lr = lum(textureSampleLevel(inputTex, samp, uv + vec2<f32>(texel.x, 0.0), 0.0).rgb);
        let lu = lum(textureSampleLevel(inputTex, samp, uv + vec2<f32>(0.0, texel.y), 0.0).rgb);
        let grad = vec2<f32>(lr - lc, lu - lc);
        vel = vel + grad * iForce * 50.0;
        dye = dye + lc * iDye * dt * 60.0;
    }

    dye = clamp(dye, 0.0, 2.0);

    return vec4<f32>(vel, dye, 1.0);
}
`}},o=`# navierStokes

Stable-fluids Navier-Stokes solver

## Description

2D incompressible fluid simulation using Stam's stable-fluids method. On reset (or first frame),
the velocity field is seeded with several coherent vortex blobs and matching dye spots; the rest
of the solver evolves them. Each subsequent frame: semi-Lagrangian advect velocity and dye,
compute divergence, solve a pressure Poisson equation with Jacobi iterations, and subtract the
pressure gradient so the velocity is divergence-free. Renders the dye channel in monochrome
(apply a palette downstream for color). Press the stir button to re-seed.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Optional input surface |
| zoom | int | x4 | x1/x2/x4/x8/x16/x32 | Sim resolution divider |
| iterations | int | 20 | 4-40 | Jacobi pressure iterations |
| smoothing | int | linear | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4 | Display interpolation |
| speed | float | 60 | 5-145 | Timestep multiplier |
| dyeDecay | float | 99 | 80-100 | Dye persistence per frame (\xD70.01) |
| velocityDecay | float | 99 | 80-100 | Velocity drag per frame (\xD70.01) |
| inputForce | float | 0 | 0-100 | Mix input luminance gradient into velocity |
| inputDye | float | 0 | 0-100 | Mix input brightness into dye |
| seed | int | 1 | 1-100 | Random seed |
| inputIntensity | float | 0 | 0-100 | Output blend with input texture |
| resetState | boolean | false | - | Re-stir the fluid |

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .write(o0)

navierStokes(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(r))n.shaders[i]={...e}}n&&o&&(n.help=o);var v="synth/navierStokes",x="synth",p="navierStokes",u=n;export{u as default,v as effectId,p as effectName,o as help,x as namespace};
