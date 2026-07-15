/* filter/clouds */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Clouds",namespace:"filter",func:"clouds",tags:["noise"],description:"Cloud texture overlay",globals:{seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},scale:{type:"float",default:.25,uniform:"scale",min:.1,max:1,step:.05,ui:{label:"scale",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:0,max:4,zero:0,randMax:2,ui:{label:"speed",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #2d78f0)
.clouds(scale: 0.55)
.write(o0)`,passes:[{name:"render",program:"clouds",inputs:{inputTex:"inputTex"},uniforms:{seed:"seed",scale:"scale",speed:"speed"},outputs:{fragColor:"outputTex"}}]});var s={clouds:{glsl:`/*
 * Clouds - Cloud texture overlay
 *
 * Ridged multi-octave 2D simplex noise shaped into clouds,
 * composited with offset shadow onto the input.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float seed;
uniform float scale;
uniform int speed;
uniform float time;

out vec4 fragColor;

const float TAU = 6.28318530718;

// Simplex 2D - MIT License (Ashima Arts)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float simplex2d(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
}

// Multi-octave FBM simplex noise, returns [0, 1]
// When animSpeed > 0, each octave gets a circular time offset for seamless morphing
float cloudNoise(vec2 uv, float baseFreq, int octaves, float animPhase, float animSpeed) {
    float accum = 0.0;
    float totalAmp = 0.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float freq = baseFreq * pow(2.0, float(i));
        float amp = 1.0 / pow(2.0, float(i));

        // Per-octave circular offset for morphing animation
        // Subtract initial position so offset is zero at time=0
        float octavePhase = float(i) * 2.13;
        float octaveRadius = (0.25 + float(i) * 0.08) * animSpeed;
        vec2 timeOffset = (vec2(cos(animPhase + octavePhase), sin(animPhase + octavePhase))
                         - vec2(cos(octavePhase), sin(octavePhase))) * octaveRadius;

        float n = simplex2d(uv * freq + vec2(float(i) * 37.0, float(i) * 53.0) + timeOffset);
        n = n * 0.5 + 0.5;

        accum += n * amp;
        totalAmp += amp;
    }

    return accum / totalAmp;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 resolution = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = gl_FragCoord.xy / tileDims;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / resolution;

    vec4 inputColor = texture(inputTex, uv);

    // Scale UV for cloud size, aspect-correct, offset by seed
    float aspect = fullResolution.x / fullResolution.y;
    vec2 seedOffset = vec2(seed * 17.31, seed * 23.71);

    // Animation phase (loops at 0-1 time boundary)
    float animPhase = time * TAU * float(speed);
    float animSpeed = float(speed);

    vec2 cloudUV = globalUV * vec2(aspect, 1.0) / scale + seedOffset;

    float cloud = cloudNoise(cloudUV, 1.0, 7, animPhase, animSpeed);

    // Shape into clouds: threshold for puffy shapes
    float cloudMask = smoothstep(0.45, 0.65, cloud);

    // Cloud shading: vary brightness within the cloud for depth
    // Thicker parts (higher noise) are brighter white, edges are slightly gray
    float cloudDepth = smoothstep(0.45, 0.85, cloud);
    float cloudBrightness = mix(0.75, 1.0, cloudDepth);

    // Shadow: sample cloud at offset (light from upper-right)
    float shadowDist = min(resolution.x, resolution.y) * 0.008;
    vec2 shadowOffset = vec2(-shadowDist, shadowDist) / resolution;
    vec2 shadowUV = (globalUV + shadowOffset) * vec2(aspect, 1.0) / scale + seedOffset;
    float shadowCloud = cloudNoise(shadowUV, 1.0, 7, animPhase, animSpeed);
    float shadowMask = smoothstep(0.45, 0.65, shadowCloud);

    // Shadow only where there's cloud nearby but not at current pixel
    float shadow = max(shadowMask - cloudMask, 0.0) * 0.5;

    // Composite: darken input by shadow, then overlay shaded clouds
    vec3 result = inputColor.rgb * (1.0 - shadow);
    result = mix(result, vec3(cloudBrightness), cloudMask);

    fragColor = vec4(result, inputColor.a);
}
`,wgsl:`/*
 * Clouds - Cloud texture overlay
 *
 * Ridged multi-octave 2D simplex noise shaped into clouds,
 * composited with offset shadow onto the input.
 */

struct Uniforms {
    seed: f32,
    scale: f32,
    speed: i32,
    time: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}

const TAU: f32 = 6.28318530718;

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// Simplex 2D - MIT License (Ashima Arts)
fn mod289v3(x: vec3<f32>) -> vec3<f32> { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289v2(x: vec2<f32>) -> vec2<f32> { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute3(x: vec3<f32>) -> vec3<f32> { return mod289v3(((x * 34.0) + 1.0) * x); }

fn simplex2d(v: vec2<f32>) -> f32 {
    let C = vec4<f32>(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

    let i = floor(v + dot(v, C.yy));
    let x0 = v - i + dot(i, C.xx);
    var i1: vec2<f32>;
    if (x0.x > x0.y) { i1 = vec2<f32>(1.0, 0.0); } else { i1 = vec2<f32>(0.0, 1.0); }
    var x12 = x0.xyxy + C.xxzz;
    x12 = vec4<f32>(x12.xy - i1, x12.zw);

    let im = mod289v2(i);
    let p = permute3(permute3(im.y + vec3<f32>(0.0, i1.y, 1.0)) + im.x + vec3<f32>(0.0, i1.x, 1.0));
    var m = max(0.5 - vec3<f32>(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3<f32>(0.0));
    m = m * m;
    m = m * m;

    let x = 2.0 * fract(p * C.www) - 1.0;
    let h = abs(x) - 0.5;
    let ox = floor(x + 0.5);
    let a0 = x - ox;
    m = m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h));

    var g: vec3<f32>;
    g.x = a0.x * x0.x + h.x * x0.y;
    g = vec3<f32>(g.x, a0.yz * x12.xz + h.yz * x12.yw);

    return 130.0 * dot(m, g);
}

fn cloudNoise(uv: vec2<f32>, baseFreq: f32, octaves: i32, animPhase: f32, animSpeed: f32) -> f32 {
    var accum: f32 = 0.0;
    var totalAmp: f32 = 0.0;

    for (var i: i32 = 0; i < 8; i = i + 1) {
        if (i >= octaves) { break; }
        let freq = baseFreq * pow(2.0, f32(i));
        let amp = 1.0 / pow(2.0, f32(i));

        // Per-octave circular offset for morphing animation
        // Subtract initial position so offset is zero at time=0
        let octavePhase = f32(i) * 2.13;
        let octaveRadius = (0.25 + f32(i) * 0.08) * animSpeed;
        let timeOffset = (vec2<f32>(cos(animPhase + octavePhase), sin(animPhase + octavePhase))
                        - vec2<f32>(cos(octavePhase), sin(octavePhase))) * octaveRadius;

        var n = simplex2d(uv * freq + vec2<f32>(f32(i) * 37.0, f32(i) * 53.0) + timeOffset);
        n = n * 0.5 + 0.5;

        accum = accum + n * amp;
        totalAmp = totalAmp + amp;
    }

    return accum / totalAmp;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = (pos.xy + uniforms.tileOffset) / uniforms.fullResolution;

    let inputColor = textureSample(inputTex, inputSampler, uv);

    let aspect = uniforms.fullResolution.x / uniforms.fullResolution.y;
    let seedOffset = vec2<f32>(uniforms.seed * 17.31, uniforms.seed * 23.71);

    // Animation phase (loops at 0-1 time boundary)
    let animPhase = uniforms.time * TAU * f32(uniforms.speed);
    let animSpeed = f32(uniforms.speed);

    let cloudUV = uv * vec2<f32>(aspect, 1.0) / uniforms.scale + seedOffset;

    let cloud = cloudNoise(cloudUV, 1.0, 7, animPhase, animSpeed);
    let cloudMask = smoothstep(0.45, 0.65, cloud);

    // Cloud shading: vary brightness within cloud for depth
    let cloudDepth = smoothstep(0.45, 0.85, cloud);
    let cloudBrightness = mix(0.75, 1.0, cloudDepth);

    // Shadow: sample cloud at offset (light from upper-right)
    let shadowDist = min(texSize.x, texSize.y) * 0.008;
    let shadowOffset = vec2<f32>(-shadowDist, shadowDist) / texSize;
    let shadowUV = (uv + shadowOffset) * vec2<f32>(aspect, 1.0) / uniforms.scale + seedOffset;
    let shadowCloud = cloudNoise(shadowUV, 1.0, 7, animPhase, animSpeed);
    let shadowMask = smoothstep(0.45, 0.65, shadowCloud);

    let shadow = max(shadowMask - cloudMask, 0.0) * 0.5;

    var result = inputColor.rgb * (1.0 - shadow);
    result = mix(result, vec3<f32>(cloudBrightness), cloudMask);

    return vec4<f32>(result, inputColor.a);
}
`}},i=`# clouds

Cloud texture overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| seed | int | 1 | 1-100 | Cloud pattern variation |
| scale | float | 0.25 | 0.1-1 | Cloud scale |
| speed | int | 0 | 0-4 | Animation speed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .clouds()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(s))t.shaders[o]={...e}}t&&i&&(t.help=i);var u="filter/clouds",c="filter",d="clouds",m=t;export{m as default,u as effectId,d as effectName,i as help,c as namespace};
