/* filter/reverb */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Reverb",namespace:"filter",func:"reverb",tags:["distort"],description:"Visual reverb/echo effect",globals:{iterations:{type:"int",default:3,uniform:"iterations",min:1,max:8,step:1,ui:{label:"iterations",control:"slider"}},ridges:{type:"boolean",default:!1,uniform:"ridges",ui:{label:"ridges",control:"checkbox"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}}},passes:[{name:"main",program:"reverb",inputs:{inputTex:"inputTex"},uniforms:{iterations:"iterations",ridges:"ridges",alpha:"alpha",wrap:"wrap"},outputs:{fragColor:"outputTex"}}]});var i={reverb:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Reverb effect: blend input with multiple scaled-down versions of itself.
// Iterations control how many octaves of scaling are blended.

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int iterations;
uniform bool ridges;
uniform float alpha;
uniform float wrap;

out vec4 fragColor;

vec2 applyWrap(vec2 uv) {
    int mode = int(wrap);
    if (mode == 0) {
        return abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (mode == 1) {
        return fract(uv);
    }
    return clamp(uv, 0.0, 1.0);
}

vec4 ridge_transform(vec4 color) {
    return vec4(1.0) - abs(color * 2.0 - vec4(1.0));
}

void main() {
    ivec2 dims = textureSize(inputTex, 0);
    
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 globalUV = globalCoord / fullResolution;
    vec2 localUV = gl_FragCoord.xy / vec2(dims);

    vec4 original = texture(inputTex, localUV);
    vec4 current = original;

    if (ridges) {
        current = ridge_transform(current);
    }

    vec4 accum = current;
    float totalWeight = 1.0;
    float weight = 0.5;
    float scale = 2.0;

    int iters = clamp(iterations, 1, 8);
    for (int i = 0; i < iters; i++) {
        vec2 warpedGlobalUV = globalUV * scale;
        vec2 wrappedGlobalUV = applyWrap(warpedGlobalUV);
        vec2 sampledLocalUV = fract((wrappedGlobalUV * fullResolution - tileOffset) / vec2(dims));
        
        vec4 scaled = texture(inputTex, sampledLocalUV);

        if (ridges) {
            scaled = ridge_transform(scaled);
        }

        accum += scaled * weight;
        totalWeight += weight;

        scale *= 2.0;
        weight *= 0.5;
    }

    vec4 result = accum / totalWeight;

    fragColor = vec4(mix(original.rgb, result.rgb, alpha), 1.0);
}`,wgsl:`// Simple reverb effect: blend input with scaled-down version of itself.
// Each pass samples the previous result at 50% scale and blends.

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var<uniform> iterations: i32;
@group(0) @binding(3) var<uniform> ridges: i32;
@group(0) @binding(4) var<uniform> alpha: f32;
@group(0) @binding(5) var<uniform> wrap: i32;

fn applyWrap(uv: vec2<f32>) -> vec2<f32> {
    if (wrap == 0) {
        // Mirror: abs(mod(uv + 1, 2) - 1)
        let mx = abs((uv.x + 1.0) - floor((uv.x + 1.0) * 0.5) * 2.0 - 1.0);
        let my = abs((uv.y + 1.0) - floor((uv.y + 1.0) * 0.5) * 2.0 - 1.0);
        return vec2<f32>(mx, my);
    } else if (wrap == 1) {
        return fract(uv);  // repeat
    }
    return clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));  // clamp
}

fn ridge_transform(color: vec4<f32>) -> vec4<f32> {
    return vec4<f32>(1.0) - abs(color * 2.0 - vec4<f32>(1.0));
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dimsU: vec2<u32> = textureDimensions(inputTex, 0);
    let dims: vec2<f32> = vec2<f32>(f32(dimsU.x), f32(dimsU.y));
    let uv: vec2<f32> = pos.xy / dims;

    // Save original input for alpha blending
    let original: vec4<f32> = textureSample(inputTex, inputSampler, uv);

    // Sample at current position
    var current: vec4<f32> = original;

    // Apply ridge transform if enabled
    let useRidges: bool = ridges != 0;
    if (useRidges) {
        current = ridge_transform(current);
    }

    // Accumulate multiple scaled samples based on iterations
    var accum: vec4<f32> = current;
    var totalWeight: f32 = 1.0;
    var weight: f32 = 0.5;
    var scale: f32 = 2.0;

    let iters: i32 = clamp(iterations, 1, 8);
    for (var i: i32 = 0; i < iters; i = i + 1) {
        let scaledUV: vec2<f32> = applyWrap(uv * scale);
        var scaled: vec4<f32> = textureSample(inputTex, inputSampler, scaledUV);

        if (useRidges) {
            scaled = ridge_transform(scaled);
        }

        accum = accum + scaled * weight;
        totalWeight = totalWeight + weight;

        scale = scale * 2.0;
        weight = weight * 0.5;
    }

    let result: vec4<f32> = accum / totalWeight;

    return vec4<f32>(mix(original.rgb, result.rgb, alpha), 1.0);
}
`}},a=`# reverb

Visual reverb/echo effect

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| iterations | int | 3 | 1-8 | Iterations |
| ridges | boolean | false | - | Ridges |
| alpha | float | 1.0 | 0-1 | Blend amount |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .reverb()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&a&&(n.help=a);var c="filter/reverb",p="filter",f="reverb",d=n;export{d as default,c as effectId,f as effectName,a as help,p as namespace};
