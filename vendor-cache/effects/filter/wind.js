/* filter/wind */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Wind",namespace:"filter",func:"wind",tags:["distort","artist"],description:"Soft directional streaks drawn from bright edges, with wind, blast, and stagger methods",globals:{method:{type:"int",default:1,define:"METHOD",choices:{wind:0,blast:1,stagger:2},ui:{label:"method",control:"dropdown"}},direction:{type:"int",default:0,uniform:"direction",choices:{fromLeft:0,fromRight:1},ui:{label:"direction",control:"dropdown"}},strength:{type:"float",default:90,uniform:"strength",min:0,max:100,ui:{label:"strength",control:"slider"}},threshold:{type:"float",default:10,uniform:"threshold",min:0,max:100,ui:{label:"threshold",control:"slider"}}},passes:[{name:"wind",program:"wind",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={wind:{glsl:`/*
 * Wind \u2014 soft horizontal trails from bright image structure.
 *
 * Every fragment integrates brighter samples along its upwind scanline.
 * A smooth luminance gate prevents threshold chatter, distance weights
 * taper the run, and the weighted integration avoids the hard winner and
 * random segment boundaries that make a directional trail look like grain.
 * Wind tapers quickly, Blast carries a broad dense trail, and Stagger uses
 * a continuous row phase so adjacent scanlines separate without band edges.
 */

#ifdef GL_ES
precision highp float;
#endif

// METHOD is a compile-time define injected by the runtime (see definition.js
// \`globals.method.define\`). Wrapping the wind/blast/stagger dispatch in #if
// blocks instead of a runtime int comparison lets the compiler drop the
// unreachable decay/taper/density/gain arms for the compiled variant.
#ifndef METHOD
#define METHOD 1
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform int direction;
uniform float strength;
uniform float threshold;

out vec4 fragColor;

const int MAX_STEPS = 128;
const float STEP_PX = 1.0;
const float MAX_REACH = 128.0;

float lum(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 src = texture(inputTex, uv);

    float amount = clamp(strength / 100.0, 0.0, 1.0);
    if (amount <= 0.0) {
        fragColor = src;
        return;
    }

    float reach = MAX_REACH * amount;
    float marchDir = (direction == 0) ? -1.0 : 1.0;
    float staggerPhase = 0.0;
#if METHOD == 2
    // Slow, continuous scanline phase: recognizably staggered without
    // discontinuous four-pixel bands or a per-row random field.
    staggerPhase = (0.5 + 0.5 * sin(globalCoord.y * 0.22))
        * min(12.0, reach * 0.18);
#endif

    vec3 accumColor = vec3(0.0);
    float accumWeight = 0.0;
    float baseLum = lum(src.rgb);
    float edge = threshold / 100.0;

    for (int i = 1; i <= MAX_STEPS; i++) {
        float distancePx = float(i) * STEP_PX;
        if (distancePx > reach) { break; }

        float sampleDistance = distancePx + staggerPhase;
        vec2 sampleUV = clamp(
            (gl_FragCoord.xy + vec2(marchDir * sampleDistance, 0.0)) / resolution,
            0.0, 1.0);
        vec3 candidate = texture(inputTex, sampleUV).rgb;

        float contrast = lum(candidate) - baseLum - edge;
        float activation = smoothstep(0.0, 0.08, contrast);
        float alongRun = distancePx / max(reach, 1.0);
#if METHOD == 1
        float decayRate = 0.8;
#elif METHOD == 2
        float decayRate = 2.0;
#else
        float decayRate = 3.4;
#endif
#if METHOD == 1
        float taperStart = 0.82;
#else
        float taperStart = 0.72;
#endif
        float endTaper = 1.0 - smoothstep(taperStart, 1.0, alongRun);
        float weight = activation * exp(-decayRate * alongRun) * endTaper;
        accumColor += candidate * weight;
        accumWeight += weight;
    }

    vec3 integrated = accumColor / max(accumWeight, 0.00001);
#if METHOD == 1
    float densityRate = 0.12;
#else
    float densityRate = 0.16;
#endif
    float density = 1.0 - exp(-accumWeight * densityRate);
#if METHOD == 1
    float methodGain = 1.0;
#else
    float methodGain = 0.88;
#endif
    float blendAmount = clamp(density * amount * methodGain, 0.0, 1.0);
    vec3 streak = mix(src.rgb, integrated, blendAmount);

    fragColor = vec4(max(src.rgb, streak), src.a);
}
`,wgsl:`/* Wind \u2014 1:1 port of the coherent scanline integration in wind.glsl. */

// METHOD is a runtime-injected module-scope const (injectDefines, see
// definition.js \`globals.method.define\`). Dawn/naga constant-fold the
// wind/blast/stagger dispatch so only the active decay/taper/density/gain
// arm survives compilation.
struct Uniforms {
    direction: i32,
    strength: f32,
    threshold: f32,
    tileOffset: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const MAX_STEPS: i32 = 128;
const STEP_PX: f32 = 1.0;
const MAX_REACH: f32 = 128.0;

fn lum(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let globalCoord = pos.xy + uniforms.tileOffset;
    let src = textureSample(inputTex, inputSampler, uv);

    let amount = clamp(uniforms.strength / 100.0, 0.0, 1.0);
    if (amount <= 0.0) {
        return src;
    }

    let reach = MAX_REACH * amount;
    let marchDir = select(1.0, -1.0, uniforms.direction == 0);
    var staggerPhase = 0.0;
    if (METHOD == 2) {
        staggerPhase = (0.5 + 0.5 * sin(globalCoord.y * 0.22))
            * min(12.0, reach * 0.18);
    }

    var accumColor = vec3<f32>(0.0);
    var accumWeight = 0.0;
    let baseLum = lum(src.rgb);
    let edge = uniforms.threshold / 100.0;

    for (var i: i32 = 1; i <= MAX_STEPS; i++) {
        let distancePx = f32(i) * STEP_PX;
        if (distancePx > reach) { break; }

        let sampleDistance = distancePx + staggerPhase;
        let sampleUV = clamp(
            (pos.xy + vec2<f32>(marchDir * sampleDistance, 0.0)) / texSize,
            vec2<f32>(0.0), vec2<f32>(1.0));
        let candidate = textureSample(inputTex, inputSampler, sampleUV).rgb;

        let contrast = lum(candidate) - baseLum - edge;
        let activation = smoothstep(0.0, 0.08, contrast);
        let alongRun = distancePx / max(reach, 1.0);
        var decayRate = 3.4;
        if (METHOD == 1) {
            decayRate = 0.8;
        } else if (METHOD == 2) {
            decayRate = 2.0;
        }
        var taperStart = 0.72;
        if (METHOD == 1) {
            taperStart = 0.82;
        }
        let endTaper = 1.0 - smoothstep(taperStart, 1.0, alongRun);
        let weight = activation * exp(-decayRate * alongRun) * endTaper;
        accumColor += candidate * weight;
        accumWeight += weight;
    }

    let integrated = accumColor / max(accumWeight, 0.00001);
    var densityRate = 0.16;
    if (METHOD == 1) {
        densityRate = 0.12;
    }
    let density = 1.0 - exp(-accumWeight * densityRate);
    var methodGain = 0.88;
    if (METHOD == 1) {
        methodGain = 1.0;
    }
    let blendAmount = clamp(density * amount * methodGain, 0.0, 1.0);
    let streak = mix(src.rgb, integrated, blendAmount);

    return vec4<f32>(max(src.rgb, streak), src.a);
}
`}},r=`# wind

Soft horizontal streaks drawn from bright image structure.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| method | int | 1 | wind:0, blast:1, stagger:2 | wind tapers quickly, blast makes a broader dense trail, and stagger continuously varies the run phase between neighboring scanlines |
| direction | int | 0 | fromLeft:0, fromRight:1 | Side the wind blows from; trails extend toward the opposite side |
| strength | float | 90 | 0-100 | Trail reach and blend amount, up to 128 pixels; zero leaves the source unchanged |
| threshold | float | 10 | 0-100 | Required luminance contrast between a trail source and the current pixel |

## Notes

- A weighted scanline integration carries brighter source color downwind. It does not use random row or segment masks.
- The contrast threshold has a smooth transition, and a final distance envelope fades every trail before its reach boundary.
- Stagger uses a continuous scanline phase instead of discrete row bands, avoiding horizontal seams.
- The source alpha is preserved.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .wind()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[a,e]of Object.entries(i))n.shaders[a]={...e}}n&&r&&(n.help=r);var c="filter/wind",u="filter",f="wind",m=n;export{m as default,c as effectId,f as effectName,r as help,u as namespace};
