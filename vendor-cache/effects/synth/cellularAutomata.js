/* synth/cellularAutomata */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Cellular Automata",func:"cellularAutomata",tags:["sim"],description:"2D cellular automata with rule presets",uniformLayouts:{ca:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},smoothing:{slot:1,components:"y"}},caFb:{deltaTime:{slot:0,components:"y"},seed:{slot:0,components:"z"},resetState:{slot:0,components:"w"},ruleIndex:{slot:1,components:"x"},speed:{slot:1,components:"y"},weight:{slot:1,components:"z"},bornMask0:{slot:2,components:"xyzw"},bornMask1:{slot:3,components:"xyzw"},bornMask2:{slot:4,components:"x"},surviveMask0:{slot:4,components:"yzw"},surviveMask1:{slot:5,components:"xyzw"},surviveMask2:{slot:6,components:"xy"},source:{slot:6,components:"z"}}},textures:{global_ca_state:{width:{screenDivide:"zoom",default:32},height:{screenDivide:"zoom",default:32}}},globals:{tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},zoom:{type:"int",default:32,choices:{x1:1,x2:2,x4:4,x8:8,x16:16,x32:32,x64:64},randChoices:[4,8,16,32,64],ui:{label:"zoom",control:"dropdown"}},ruleIndex:{type:"int",default:0,choices:{classicLife:0,highlife:1,seeds:2,coral:3,dayNight:4,lifeWithoutDeath:5,replicator:6,amoeba:7,maze:8,gliderWalk:9,diamoeba:10,size2x2:11,morley:12,anneal:13,size34Life:14,simpleReplicator:15,waffles:16,pondLife:17},ui:{label:"rules",control:"dropdown"},uniform:"ruleIndex"},smoothing:{type:"int",default:0,choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6},ui:{label:"smoothing",control:"dropdown"},uniform:"smoothing"},seed:{type:"int",default:1,min:1,max:100,ui:{label:"seed",control:!1},uniform:"seed"},speed:{type:"float",default:10,min:1,max:100,ui:{label:"speed",control:"slider"},uniform:"speed"},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"state"}},weight:{type:"float",default:0,min:0,max:100,randChance:0,ui:{label:"input weight",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}},uniform:"weight"},source:{type:"int",default:0,min:0,max:7,ui:{control:!1},uniform:"source"}},passes:[{name:"update",program:"caFb",inputs:{bufTex:"global_ca_state",tex:"tex"},outputs:{fragColor:"global_ca_state"}},{name:"render",program:"ca",inputs:{fbTex:"global_ca_state",prevFrameTex:"global_ca_state",bufTex:"global_ca_state",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var l={ca:{glsl:`#version 300 es

/*
 * Cellular automata display pass.
 *
 * Renders the automata feedback buffer back to the canvas using selectable
 * reconstruction filters.  The shader keeps the low-res simulation crisp by
 * default, but offers bicubic smoothing for demo presets that upscale the
 * automata to screen resolution.
 *
 * Mono-only version (no palette support).
 */

precision highp float;
precision highp int;

uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D fbTex;
uniform int smoothing;
uniform sampler2D prevFrameTex;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y


// Quadratic B-spline interpolation for 3 samples (degree 2 polynomial)
vec4 quadratic3(vec4 p0, vec4 p1, vec4 p2, float t) {
    // Quadratic B-spline interpolation (degree 2)
    // Smooth C\xB9 continuous blending between 3 control points
    // B-spline basis functions for uniform knots with t \u2208 [0, 1]
    float t2 = t * t;
    
    // B-spline basis: B0 = (1-t)\xB2/2, B1 = (-2t\xB2 + 2t + 1)/2, B2 = t\xB2/2
    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

// 3x3 quadratic texture interpolation (9 taps)
vec4 quadratic(sampler2D tex, vec2 uv, vec2 texelSize) {
    uv += texelSize; // offset by one texel to accommodate texel centering
    vec2 texCoord = uv / texelSize;
    vec2 baseCoord = floor(texCoord - 0.5);
    vec2 f = fract(texCoord - 0.5);
    
    // Sample 3x3 grid centered on the interpolation point
    vec4 v00 = texture(tex, (baseCoord + vec2(-0.5, -0.5)) * texelSize);
    vec4 v10 = texture(tex, (baseCoord + vec2( 0.5, -0.5)) * texelSize);
    vec4 v20 = texture(tex, (baseCoord + vec2( 1.5, -0.5)) * texelSize);
    
    vec4 v01 = texture(tex, (baseCoord + vec2(-0.5,  0.5)) * texelSize);
    vec4 v11 = texture(tex, (baseCoord + vec2( 0.5,  0.5)) * texelSize);
    vec4 v21 = texture(tex, (baseCoord + vec2( 1.5,  0.5)) * texelSize);
    
    vec4 v02 = texture(tex, (baseCoord + vec2(-0.5,  1.5)) * texelSize);
    vec4 v12 = texture(tex, (baseCoord + vec2( 0.5,  1.5)) * texelSize);
    vec4 v22 = texture(tex, (baseCoord + vec2( 1.5,  1.5)) * texelSize);
    
    // Interpolate rows
    vec4 y0 = quadratic3(v00, v10, v20, f.x);
    vec4 y1 = quadratic3(v01, v11, v21, f.x);
    vec4 y2 = quadratic3(v02, v12, v22, f.x);
    
    // Interpolate columns
    return quadratic3(y0, y1, y2, f.y);
}

// Cubic B-spline 4-point interpolation (degree 3)
vec4 bicubic4(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t) {
    // Cubic B-spline basis functions for uniform knots
    // Provides C\xB2 continuous smoothing
    float t2 = t * t;
    float t3 = t2 * t;
    
    float b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    float b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    float b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    float b3 = t3 / 6.0;
    
    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

// 4\xD74 bicubic B-spline texture interpolation (16 taps)
vec4 bicubic(sampler2D tex, vec2 uv, vec2 texelSize) {
    uv += texelSize;
    vec2 texCoord = uv / texelSize;
    vec2 baseCoord = floor(texCoord - 1.0);
    vec2 f = fract(texCoord - 1.0);
    
    // Sample 4\xD74 grid
    vec4 row0 = bicubic4(
        texture(tex, (baseCoord + vec2(-0.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5, -0.5)) * texelSize),
        f.x
    );
    
    vec4 row1 = bicubic4(
        texture(tex, (baseCoord + vec2(-0.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  0.5)) * texelSize),
        f.x
    );
    
    vec4 row2 = bicubic4(
        texture(tex, (baseCoord + vec2(-0.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  1.5)) * texelSize),
        f.x
    );
    
    vec4 row3 = bicubic4(
        texture(tex, (baseCoord + vec2(-0.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  2.5)) * texelSize),
        f.x
    );
    
    // Interpolate columns
    return bicubic4(row0, row1, row2, row3, f.y);
}

// Catmull-Rom 3-point cubic interpolation (degree 3)
vec4 catmullRom3(vec4 p0, vec4 p1, vec4 p2, float t) {
    // Catmull-Rom-esque cubic through 3 points
    // Interpolating (passes through control points)
    float t2 = t * t;
    float t3 = t2 * t;
    
    return p1 + 0.5 * t * (p2 - p0) + 
           0.5 * t2 * (2.0*p0 - 5.0*p1 + 4.0*p2 - p0) +
           0.5 * t3 * (-p0 + 3.0*p1 - 3.0*p2 + p0);
}

// Catmull-Rom 4-point cubic interpolation (degree 3)
vec4 catmullRom4(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t) {
    // Standard Catmull-Rom spline with tension = 0.5
    // Interpolating (passes through p1 and p2)
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

// 3\xD73 Catmull-Rom texture interpolation (9 taps)
vec4 catmullRom3x3(sampler2D tex, vec2 uv, vec2 texelSize) {
    uv += texelSize;
    vec2 texCoord = uv / texelSize;
    vec2 baseCoord = floor(texCoord - 1.0);
    vec2 f = fract(texCoord - 1.0);
    
    // Sample 3\xD73 grid
    vec4 v00 = texture(tex, (baseCoord + vec2(-0.5, -0.5)) * texelSize);
    vec4 v10 = texture(tex, (baseCoord + vec2( 0.5, -0.5)) * texelSize);
    vec4 v20 = texture(tex, (baseCoord + vec2( 1.5, -0.5)) * texelSize);
    
    vec4 v01 = texture(tex, (baseCoord + vec2(-0.5,  0.5)) * texelSize);
    vec4 v11 = texture(tex, (baseCoord + vec2( 0.5,  0.5)) * texelSize);
    vec4 v21 = texture(tex, (baseCoord + vec2( 1.5,  0.5)) * texelSize);
    
    vec4 v02 = texture(tex, (baseCoord + vec2(-0.5,  1.5)) * texelSize);
    vec4 v12 = texture(tex, (baseCoord + vec2( 0.5,  1.5)) * texelSize);
    vec4 v22 = texture(tex, (baseCoord + vec2( 1.5,  1.5)) * texelSize);
    
    // Interpolate rows using Catmull-Rom
    vec4 y0 = catmullRom3(v00, v10, v20, f.x);
    vec4 y1 = catmullRom3(v01, v11, v21, f.x);
    vec4 y2 = catmullRom3(v02, v12, v22, f.x);
    
    // Interpolate columns
    return catmullRom3(y0, y1, y2, f.y);
}

// 4\xD74 Catmull-Rom texture interpolation (16 taps)
vec4 catmullRom4x4(sampler2D tex, vec2 uv, vec2 texelSize) {
    uv += texelSize;
    vec2 texCoord = uv / texelSize;
    vec2 baseCoord = floor(texCoord - 1.0);
    vec2 f = fract(texCoord - 1.0);
    
    // Sample 4\xD74 grid and interpolate rows directly
    vec4 row0 = catmullRom4(
        texture(tex, (baseCoord + vec2(-0.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5, -0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5, -0.5)) * texelSize),
        f.x
    );
    
    vec4 row1 = catmullRom4(
        texture(tex, (baseCoord + vec2(-0.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  0.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  0.5)) * texelSize),
        f.x
    );
    
    vec4 row2 = catmullRom4(
        texture(tex, (baseCoord + vec2(-0.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  1.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  1.5)) * texelSize),
        f.x
    );
    
    vec4 row3 = catmullRom4(
        texture(tex, (baseCoord + vec2(-0.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 0.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 1.5,  2.5)) * texelSize),
        texture(tex, (baseCoord + vec2( 2.5,  2.5)) * texelSize),
        f.x
    );
    
    // Interpolate columns
    return catmullRom4(row0, row1, row2, row3, f.y);
}

float cosineMix(float a, float b, float t) {
    float amount = (1.0 - cos(t * PI)) * 0.5;
    return mix(a, b, amount);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    float state = 0.0;

    // Smoothing modes mirror the UI enum ordering; avoid renumbering without
    // updating module metadata and defaults.
    if (smoothing == 0) {
        // constant
        state = texture(fbTex, globalCoord / fullResolution).g;
    } else if (smoothing == 3) {
        // catmull-rom 3x3 (9 taps)
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelSize = 1.0 / texSize;
        vec2 scaling = fullResolution / texSize;
        vec2 uv = (globalCoord - scaling * 0.5) / fullResolution;

        state = catmullRom3x3(fbTex, uv, texelSize).g;
    } else if (smoothing == 4) {
        // catmull-rom 4x4 (16 taps)
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelSize = 1.0 / texSize;
        vec2 scaling = fullResolution / texSize;
        vec2 uv = (globalCoord - scaling * 0.5) / fullResolution;

        state = catmullRom4x4(fbTex, uv, texelSize).g;
    } else if (smoothing == 5) {
        // b-spline 3x3 (9 taps)
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelSize = 1.0 / texSize;
        vec2 scaling = fullResolution / texSize;
        vec2 uv = (globalCoord - scaling * 0.5) / fullResolution;

        state = quadratic(fbTex, uv, texelSize).g;
    } else if (smoothing == 6) {
        // b-spline 4x4 (16 taps)
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelSize = 1.0 / texSize;
        vec2 scaling = fullResolution / texSize;
        vec2 uv = (globalCoord - scaling * 0.5) / fullResolution;

        state = bicubic(fbTex, uv, texelSize).g;
    } else {
        // linear-style smoothing that samples a texel quad.
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 nd2 = fullResolution / texSize; // scaled neighbor pixel distance
        // To avoid directional bias, center sampled points equidistantly around origin.
        vec2 xy = globalCoord - nd2 * 0.5;

        float v00 = texture(fbTex, xy / fullResolution).g;
        float v10 = texture(fbTex, (xy + vec2(nd2.x, 0.0)) / fullResolution).g;
        float v01 = texture(fbTex, (xy + vec2(0.0, nd2.y)) / fullResolution).g;
        float v11 = texture(fbTex, (xy + vec2(nd2.x, nd2.y)) / fullResolution).g;

        float xAmount = fract(xy.x / nd2.x);
        float yAmount = fract(xy.y / nd2.y);

        if (smoothing == 1) {
            float v0 = mix(v00, v10, xAmount);
            float v1 = mix(v01, v11, xAmount);
            state = mix(v0, v1, yAmount);
        } else {
            float v0 = cosineMix(v00, v10, xAmount);
            float v1 = cosineMix(v01, v11, xAmount);
            state = cosineMix(v0, v1, yAmount);
        }
    }

    // Mono output only
    float intensity = clamp(state, 0.0, 1.0);
    fragColor = vec4(vec3(intensity), 1.0);
}
`,wgsl:`// Cellular automata display pass (WGSL).
// Mono-only version (no palette support).

struct Uniforms {
    data : array<vec4<f32>, 2>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var fbTex: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

fn quadratic3(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;

    return p0 * 0.5 * (1.0 - t) * (1.0 - t) +
           p1 * 0.5 * (-2.0 * t2 + 2.0 * t + 1.0) +
           p2 * 0.5 * t2;
}

fn bicubic4(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, p3: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;
    let t3 = t2 * t;

    let b0 = (1.0 - t) * (1.0 - t) * (1.0 - t) / 6.0;
    let b1 = (3.0 * t3 - 6.0 * t2 + 4.0) / 6.0;
    let b2 = (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0) / 6.0;
    let b3 = t3 / 6.0;

    return p0 * b0 + p1 * b1 + p2 * b2 + p3 * b3;
}

fn catmullRom3(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, t: f32) -> vec4<f32> {
    let t2 = t * t;
    let t3 = t2 * t;

    let m = 0.5 * (p2 - p0);

    return (2.0*t3 - 3.0*t2 + 1.0) * p1 +
           (t3 - 2.0*t2 + t) * m +
           (-2.0*t3 + 3.0*t2) * p2 +
           (t3 - t2) * m;
}

fn catmullRom4(p0: vec4<f32>, p1: vec4<f32>, p2: vec4<f32>, p3: vec4<f32>, t: f32) -> vec4<f32> {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

fn quadraticSample(tex: texture_2d<f32>, samp: sampler, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
    // Match GLSL: offset uv by one texel to accommodate texel centering
    let uv2 = uv + texelSize;
    let texCoord = uv2 / texelSize;
    let baseCoord = floor(texCoord - 0.5);
    let f = fract(texCoord - 0.5);
    
    // Sample 3x3 grid centered on the interpolation point
    let v00 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5, -0.5)) * texelSize, 0.0);
    let v10 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5, -0.5)) * texelSize, 0.0);
    let v20 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5, -0.5)) * texelSize, 0.0);
    
    let v01 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  0.5)) * texelSize, 0.0);
    let v11 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  0.5)) * texelSize, 0.0);
    let v21 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  0.5)) * texelSize, 0.0);
    
    let v02 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  1.5)) * texelSize, 0.0);
    let v12 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  1.5)) * texelSize, 0.0);
    let v22 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  1.5)) * texelSize, 0.0);
    
    // Interpolate rows using quadratic B-spline
    let y0 = quadratic3(v00, v10, v20, f.x);
    let y1 = quadratic3(v01, v11, v21, f.x);
    let y2 = quadratic3(v02, v12, v22, f.x);
    
    // Interpolate columns
    return quadratic3(y0, y1, y2, f.y);
}

fn catmullRom3x3Sample(tex: texture_2d<f32>, samp: sampler, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
    // Match GLSL: offset uv by one texel to accommodate texel centering
    let uv2 = uv + texelSize;
    let texCoord = uv2 / texelSize;
    let baseCoord = floor(texCoord - 1.0);
    let f = fract(texCoord - 1.0);
    
    // Sample 3x3 grid
    let v00 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5, -0.5)) * texelSize, 0.0);
    let v10 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5, -0.5)) * texelSize, 0.0);
    let v20 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5, -0.5)) * texelSize, 0.0);
    
    let v01 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  0.5)) * texelSize, 0.0);
    let v11 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  0.5)) * texelSize, 0.0);
    let v21 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  0.5)) * texelSize, 0.0);
    
    let v02 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  1.5)) * texelSize, 0.0);
    let v12 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  1.5)) * texelSize, 0.0);
    let v22 = textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  1.5)) * texelSize, 0.0);
    
    // Interpolate rows using Catmull-Rom
    let y0 = catmullRom3(v00, v10, v20, f.x);
    let y1 = catmullRom3(v01, v11, v21, f.x);
    let y2 = catmullRom3(v02, v12, v22, f.x);
    
    // Interpolate columns
    return catmullRom3(y0, y1, y2, f.y);
}

fn bicubicSample(tex: texture_2d<f32>, samp: sampler, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
    let uv2 = uv + texelSize;
    let texCoord = uv2 / texelSize;
    let baseCoord = floor(texCoord - 1.0);
    let f = fract(texCoord - 1.0);

    let row0 = bicubic4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5, -0.5)) * texelSize, 0.0),
        f.x
    );

    let row1 = bicubic4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  0.5)) * texelSize, 0.0),
        f.x
    );

    let row2 = bicubic4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  1.5)) * texelSize, 0.0),
        f.x
    );

    let row3 = bicubic4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  2.5)) * texelSize, 0.0),
        f.x
    );

    return bicubic4(row0, row1, row2, row3, f.y);
}

fn catmullRom4x4Sample(tex: texture_2d<f32>, samp: sampler, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
    let uv2 = uv + texelSize;
    let texCoord = uv2 / texelSize;
    let baseCoord = floor(texCoord - 1.0);
    let f = fract(texCoord - 1.0);

    let row0 = catmullRom4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5, -0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5, -0.5)) * texelSize, 0.0),
        f.x
    );

    let row1 = catmullRom4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  0.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  0.5)) * texelSize, 0.0),
        f.x
    );

    let row2 = catmullRom4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  1.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  1.5)) * texelSize, 0.0),
        f.x
    );

    let row3 = catmullRom4(
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>(-0.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 0.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 1.5,  2.5)) * texelSize, 0.0),
        textureSampleLevel(tex, samp, (baseCoord + vec2<f32>( 2.5,  2.5)) * texelSize, 0.0),
        f.x
    );

    return catmullRom4(row0, row1, row2, row3, f.y);
}

fn cosineMix(a: f32, b: f32, t: f32) -> f32 {
    let amount = (1.0 - cos(t * 3.141592653589793)) * 0.5;
    return mix(a, b, amount);
}

@fragment fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let smoothing = i32(uniforms.data[1].y);

    var state: f32 = 0.0;
    if (smoothing == 0) {
        // constant - use textureLoad for exact nearest-neighbor sampling
        let texSizeI = vec2<i32>(textureDimensions(fbTex, 0));
        let texSizeF = vec2<f32>(f32(texSizeI.x), f32(texSizeI.y));
        let pixelCoord = vec2<i32>(floor(fragCoord.xy * texSizeF / resolution));
        state = textureLoad(fbTex, clamp(pixelCoord, vec2<i32>(0), texSizeI - vec2<i32>(1)), 0).g;
    } else if (smoothing == 3) {
        // catmull-rom 3x3 (9 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (fragCoord.xy - scaling * 0.5) / resolution;
        state = catmullRom3x3Sample(fbTex, mySampler, uv, texelSize).g;
    } else if (smoothing == 4) {
        // catmull-rom 4x4 (16 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (fragCoord.xy - scaling * 0.5) / resolution;
        state = catmullRom4x4Sample(fbTex, mySampler, uv, texelSize).g;
    } else if (smoothing == 5) {
        // b-spline 3x3 (9 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (fragCoord.xy - scaling * 0.5) / resolution;
        state = quadraticSample(fbTex, mySampler, uv, texelSize).g;
    } else if (smoothing == 6) {
        // b-spline 4x4 (16 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (fragCoord.xy - scaling * 0.5) / resolution;
        state = bicubicSample(fbTex, mySampler, uv, texelSize).g;
    } else {
        // linear-style smoothing \u2014 sample texel centres explicitly to avoid seams.
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelPos = (fragCoord.xy * texSize / resolution) - vec2<f32>(0.5, 0.5);
        let base = floor(texelPos);
        let weights = fract(texelPos);
        let next = base + vec2<f32>(1.0, 1.0);

        let texSizeI = vec2<i32>(textureDimensions(fbTex, 0));
        let minIdx = vec2<i32>(0, 0);
        let maxIdx = texSizeI - vec2<i32>(1, 1);
        let baseI = clamp(vec2<i32>(base), minIdx, maxIdx);
        let nextI = clamp(vec2<i32>(next), minIdx, maxIdx);

        let v00 = textureLoad(fbTex, baseI, 0).g;
        let v10 = textureLoad(fbTex, vec2<i32>(nextI.x, baseI.y), 0).g;
        let v01 = textureLoad(fbTex, vec2<i32>(baseI.x, nextI.y), 0).g;
        let v11 = textureLoad(fbTex, nextI, 0).g;

        if (smoothing == 1) {
            let v0 = mix(v00, v10, weights.x);
            let v1 = mix(v01, v11, weights.x);
            state = mix(v0, v1, weights.y);
        } else {
            let v0 = cosineMix(v00, v10, weights.x);
            let v1 = cosineMix(v01, v11, weights.x);
            state = cosineMix(v0, v1, weights.y);
        }
    }

    // Mono output only
    let intensity = clamp(state, 0.0, 1.0);
    return vec4<f32>(intensity, intensity, intensity, 1.0);
}
`},caFb:{glsl:`#version 300 es

/*
 * Cellular automata feedback pass.
 *
 * This shader advances the ping-pong buffer by evaluating a neighbourhood
 * count against a curated ruleset or custom birth/survival tables provided
 * by the UI.  When \`source\` is set, the previous compositing stage is sampled
 * and luminance blended into the automata to support audio/video driven
 * perturbations without breaking the automata's binary storage format.
 */

precision highp float;
precision highp int;

uniform float time;
uniform float deltaTime;
uniform int frame;
uniform sampler2D bufTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform int ruleIndex;
uniform float speed;
uniform float weight;
uniform int seed;
uniform bool resetState;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

uniform bool useCustom;

uniform int source;

out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float lum(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/*
Rulesets

Name                    Born                Survive
-----------------------------------------------------
Classic Life            3                   23
Highlife                36                  23
Seeds                   2                   -
Coral                   38                  23
Day & Night             3678                34678
Life Without Death      3                   012345678
Replicator              1357                1357
Amoeba                  357                 1358
Maze                    3                   12345
Glider Walk             25                  4
Diamoeba                35678               5678
2x2                     36                  125
Morley                  368                 245
Anneal                  4678                35678
34 Life                 34                  34

Simple Replicator       368                 12578       
Waffles                 36                  245
Pond Life               37                  23
*/


// Determine if cell should be born based on state of neighbors (n)
bool shouldBeBorn(int n) {
    bool should = false;

    if (ruleIndex == 0 || ruleIndex == 5 || ruleIndex == 8) {
        should = n == 3;                                        // Classic Life, Life w/o Death, Maze: B3
    } else if (ruleIndex == 1 || ruleIndex == 11 || ruleIndex == 16) {
        should = n == 3 || n == 6;                              // Highlife, 2x2, Waffles: B36
    } else if (ruleIndex == 2) {
        should = n == 2;                                        // Seeds: B2
    } else if (ruleIndex == 3) {
        should = n == 3 || n == 8;                              // Coral: B38 
    } else if (ruleIndex == 4) {
        should = n == 3 || n == 6 || n == 7 || n == 8;          // Day & Night: B3678  
    } else if (ruleIndex == 6) {
        should = n == 1 || n == 3 || n == 5 || n == 7;          // Replicator: B1357
    } else if (ruleIndex == 7) {
        should = n == 3 || n == 5 || n == 7;                    // Amoeba: B357
    } else if (ruleIndex == 9) {
        should = n == 2 || n == 5;                              // Glider Walk: B25 
    } else if (ruleIndex == 10) {
        should = n == 3 || n >= 5;                              // Diamoeba: B35678
    } else if (ruleIndex == 12) {
        should = n == 3 || n == 6 || n == 8;                    // Morley: B368 
    } else if (ruleIndex == 13) {
        should = n == 4 || n == 6 || n == 7 || n == 8;          // Anneal: B4678 
    } else if (ruleIndex == 14) {
        should = n == 3 || n == 4;                              // 34 Life: B34
    } else if (ruleIndex == 15) {
        should = n == 3 || n == 6 || n == 8;                    // Simple Replicator: B368
    } else if (ruleIndex == 17) {
        should = n == 3 || n == 7;                              // Pond Life: B37
    }

    //should = n == 2 || n == 8;

    return should;
}

// Determine if cell should survive based on state of neighbors (n)
bool shouldSurvive(int n, float current) {
    bool should = false;

    if (ruleIndex == 0 || ruleIndex == 1 || ruleIndex == 3 || ruleIndex == 17) {
        should = n == 2 || n == 3;                              // Classic Life, Highlife, Coral, Pond Life: S23
    } else if (ruleIndex == 2) {
        should = false;                                         // Seeds: no survival
    } else if (ruleIndex == 4) {
        should = n == 3 || n == 4 || n == 6 || n == 7 || n == 8;  // Day & Night: S34678
    } else if (ruleIndex == 5) {
        should = true;                                          // Life w/o Death: S012345678
    } else if (ruleIndex == 6) {
        should = n == 1 || n == 3 || n == 5 || n == 7;          // Replicator: S1357
    } else if (ruleIndex == 7) {
        should = n == 1 || n == 3 || n == 5 || n == 8;          // Amoeba: S1358
    } else if (ruleIndex == 8) {
        should = n >= 1 && n <= 5;                              // Maze: S12345
    } else if (ruleIndex == 9) {
        should = n == 4;                                        // Glider Walk: S4
    } else if (ruleIndex == 10) {
        should = n >= 5;                                        // Diamoeba: S5678
    } else if (ruleIndex == 11) {
        should = n == 1 || n == 2 || n == 5;                    // 2x2: S125
    } else if (ruleIndex == 12 || ruleIndex == 16) {
        should = n == 2 || n == 4 || n == 5;                    // Morley, Waffles: S245
    } else if (ruleIndex == 13) {
        should = n == 3 || n >= 5;                              // Anneal: S35678
    } else if (ruleIndex == 14) {
        should = n == 3 || n == 4;                              // 34 Life: S34
    } else if (ruleIndex == 15) {
        should = n == 1 || n == 2 || n == 5 || n >= 7;          // Simple Replicator: S12578
    }

    //should = true;

    if (current < 0.5) should = false;

    return should;
}


int countNeighbors(vec2 uv, vec2 texelSize) {
    int count = 0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            if (x == 0 && y == 0) continue;
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            float n = texture(bufTex, uv + offset).r;
            count += int(n > 0.5);
        }
    }
    return count;
}

void main() {
    vec2 texSize = vec2(textureSize(bufTex, 0));
    vec2 uv = gl_FragCoord.xy / texSize;
    vec2 texelSize = 1.0 / texSize;

    float state = texture(bufTex, uv).r;
    
    // Sample all 4 channels to check if buffer is truly empty
    vec4 bufState = texture(bufTex, uv);
    bool bufferIsEmpty = (bufState.r == 0.0 && bufState.g == 0.0 && bufState.b == 0.0 && bufState.a == 0.0);

    // Initialize when reset button pressed or when buffer is completely empty (first load)
    if (resetState || bufferIsEmpty) {
        float r = random(uv + vec2(float(seed)));
        float alive = step(0.5, r);
        fragColor = vec4(alive, alive, alive, 1.0);
        return;
    }

    vec3 prevFrame = texture(tex, uv).rgb;
    float prevLum = lum(prevFrame);

    int neighbors = countNeighbors(uv, texelSize);

    float newState = state;

    if (shouldBeBorn(neighbors)) {
        newState = 1.0;
    } else if (shouldSurvive(neighbors, state)) {
        newState = 1.0;
    } else {
        newState = 0.0;
    }

    if (weight > 0.0) {
        newState = mix(newState, prevLum, weight * 0.01);
    }

    // The speed knob expresses human-friendly BPM-style values; remapping keeps
    // the integration step numerically stable across refresh rates.
    float animSpeed = map(speed, 1.0, 100.0, 0.1, 100.0);
    vec4 currentState = vec4(state, state, state, 1.0);
    vec4 nextState = vec4(newState, newState, newState, 1.0);
    fragColor = mix(currentState, nextState, min(1.0, deltaTime * animSpeed));
}
`,wgsl:`/*
 * Cellular automata feedback pass.
 *
 * This shader advances the ping-pong buffer by evaluating a neighbourhood
 * count against a curated ruleset or custom birth/survival tables provided
 * by the UI.  When \`source\` is set, the previous compositing stage is sampled
 * and luminance blended into the automata to support audio/video driven
 * perturbations without breaking the automata's binary storage format.
 */

struct Uniforms {
    data : array<vec4<f32>, 7>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var bufTex: texture_2d<f32>;
@group(0) @binding(3) var tex: texture_2d<f32>;

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn lum(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn random(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

/*
Rulesets

Name                    Born                Survive
-----------------------------------------------------
Classic Life            3                   23
Highlife                36                  23
Seeds                   2                   -
Coral                   38                  23
Day & Night             3678                34678
Life Without Death      3                   012345678
Replicator              1357                1357
Amoeba                  357                 1358
Maze                    3                   12345
Glider Walk             25                  4
Diamoeba                35678               5678
2x2                     36                  125
Morley                  368                 245
Anneal                  4678                35678
34 Life                 34                  34

Simple Replicator       368                 12578       
Waffles                 36                  245
Pond Life               37                  23
*/

// Determine if cell should be born based on state of neighbors (n)
fn shouldBeBorn(n: i32, ruleIndex: i32) -> bool {
    var should: bool = false;

    if (ruleIndex == 0 || ruleIndex == 5 || ruleIndex == 8) {
        should = n == 3;                                        // Classic Life, Life w/o Death, Maze: B3
    } else if (ruleIndex == 1 || ruleIndex == 11 || ruleIndex == 16) {
        should = n == 3 || n == 6;                              // Highlife, 2x2, Waffles: B36
    } else if (ruleIndex == 2) {
        should = n == 2;                                        // Seeds: B2
    } else if (ruleIndex == 3) {
        should = n == 3 || n == 8;                              // Coral: B38 
    } else if (ruleIndex == 4) {
        should = n == 3 || n == 6 || n == 7 || n == 8;          // Day & Night: B3678  
    } else if (ruleIndex == 6) {
        should = n == 1 || n == 3 || n == 5 || n == 7;          // Replicator: B1357
    } else if (ruleIndex == 7) {
        should = n == 3 || n == 5 || n == 7;                    // Amoeba: B357
    } else if (ruleIndex == 9) {
        should = n == 2 || n == 5;                              // Glider Walk: B25 
    } else if (ruleIndex == 10) {
        should = n == 3 || n >= 5;                              // Diamoeba: B35678
    } else if (ruleIndex == 12) {
        should = n == 3 || n == 6 || n == 8;                    // Morley: B368 
    } else if (ruleIndex == 13) {
        should = n == 4 || n == 6 || n == 7 || n == 8;          // Anneal: B4678 
    } else if (ruleIndex == 14) {
        should = n == 3 || n == 4;                              // 34 Life: B34
    } else if (ruleIndex == 15) {
        should = n == 3 || n == 6 || n == 8;                    // Simple Replicator: B368
    } else if (ruleIndex == 17) {
        should = n == 3 || n == 7;                              // Pond Life: B37
    }

    return should;
}

// Determine if cell should survive based on state of neighbors (n)
fn shouldSurvive(n: i32, current: f32, ruleIndex: i32) -> bool {
    var should: bool = false;

    if (ruleIndex == 0 || ruleIndex == 1 || ruleIndex == 3 || ruleIndex == 17) {
        should = n == 2 || n == 3;                              // Classic Life, Highlife, Coral, Pond Life: S23
    } else if (ruleIndex == 2) {
        should = false;                                         // Seeds: no survival
    } else if (ruleIndex == 4) {
        should = n == 3 || n == 4 || n == 6 || n == 7 || n == 8;  // Day & Night: S34678
    } else if (ruleIndex == 5) {
        should = true;                                          // Life w/o Death: S012345678
    } else if (ruleIndex == 6) {
        should = n == 1 || n == 3 || n == 5 || n == 7;          // Replicator: S1357
    } else if (ruleIndex == 7) {
        should = n == 1 || n == 3 || n == 5 || n == 8;          // Amoeba: S1358
    } else if (ruleIndex == 8) {
        should = n >= 1 && n <= 5;                              // Maze: S12345
    } else if (ruleIndex == 9) {
        should = n == 4;                                        // Glider Walk: S4
    } else if (ruleIndex == 10) {
        should = n >= 5;                                        // Diamoeba: S5678
    } else if (ruleIndex == 11) {
        should = n == 1 || n == 2 || n == 5;                    // 2x2: S125
    } else if (ruleIndex == 12 || ruleIndex == 16) {
        should = n == 2 || n == 4 || n == 5;                    // Morley, Waffles: S245
    } else if (ruleIndex == 13) {
        should = n == 3 || n >= 5;                              // Anneal: S35678
    } else if (ruleIndex == 14) {
        should = n == 3 || n == 4;                              // 34 Life: S34
    } else if (ruleIndex == 15) {
        should = n == 1 || n == 2 || n == 5 || n >= 7;          // Simple Replicator: S12578
    }

    if (current < 0.5) { should = false; }

    return should;
}

fn shouldBeBornCustom(n: i32, bornMask0: vec4<f32>, bornMask1: vec4<f32>, bornMask2: f32) -> bool {
    if (n == 0) { return bornMask0.x > 0.5; }
    else if (n == 1) { return bornMask0.y > 0.5; }
    else if (n == 2) { return bornMask0.z > 0.5; }
    else if (n == 3) { return bornMask0.w > 0.5; }
    else if (n == 4) { return bornMask1.x > 0.5; }
    else if (n == 5) { return bornMask1.y > 0.5; }
    else if (n == 6) { return bornMask1.z > 0.5; }
    else if (n == 7) { return bornMask1.w > 0.5; }
    else if (n == 8) { return bornMask2 > 0.5; }
    return false;
}

fn shouldSurviveCustom(n: i32, current: f32, surviveMask0: vec3<f32>, surviveMask1: vec4<f32>, surviveMask2: vec2<f32>) -> bool {
    var should: bool = false;
    if (n == 0) { should = surviveMask0.x > 0.5; }
    else if (n == 1) { should = surviveMask0.y > 0.5; }
    else if (n == 2) { should = surviveMask0.z > 0.5; }
    else if (n == 3) { should = surviveMask1.x > 0.5; }
    else if (n == 4) { should = surviveMask1.y > 0.5; }
    else if (n == 5) { should = surviveMask1.z > 0.5; }
    else if (n == 6) { should = surviveMask1.w > 0.5; }
    else if (n == 7) { should = surviveMask2.x > 0.5; }
    else if (n == 8) { should = surviveMask2.y > 0.5; }

    if (current < 0.5) { should = false; }
    return should;
}

// Clamp a texel coordinate to the valid texture bounds
fn clampCoord(p: vec2<i32>, size: vec2<i32>) -> vec2<i32> {
    let cx = clamp(p.x, 0, size.x - 1);
    let cy = clamp(p.y, 0, size.y - 1);
    return vec2<i32>(cx, cy);
}

// Fetch a single cell value using integer coordinates to avoid filtering
fn cellAt(p: vec2<i32>, size: vec2<i32>) -> f32 {
    let pc = clampCoord(p, size);
    return textureLoad(bufTex, pc, 0).r;
}

// Count Moore-neighbourhood alive cells around base pixel
fn countNeighbors(base: vec2<i32>, size: vec2<i32>) -> i32 {
    var count: i32 = 0;
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) { continue; }
            let n: f32 = cellAt(base + vec2<i32>(dx, dy), size);
            count += i32(n > 0.5);
        }
    }
    return count;
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize: vec2<f32> = vec2<f32>(textureDimensions(bufTex, 0));
    let texSizeI: vec2<i32> = vec2<i32>(textureDimensions(bufTex, 0));
    let uv: vec2<f32> = fragCoord.xy / texSize;

    // Extract parameters from uniforms - precise mapping from hooks.js and
    // the framebuffer layout in uniforms.json. Slots 0-2 mirror the runtime's
    // timing metadata, slot 1 stores the primary CA controls, and slots 2-6
    // pack the custom rule masks alongside the input source selector.
    let deltaTime: f32 = uniforms.data[0].y;
    let seed: i32 = i32(uniforms.data[0].z);
    let resetState: bool = uniforms.data[0].w > 0.5;
    let ruleIndex: i32 = i32(uniforms.data[1].x);
    let speed: f32 = uniforms.data[1].y;
    let weight: f32 = uniforms.data[1].z;
    let useCustom: bool = uniforms.data[1].w > 0.5;

    let bornMask0: vec4<f32> = uniforms.data[2];
    let bornMask1: vec4<f32> = uniforms.data[3];
    let bornMask2: f32 = uniforms.data[4].x;
    let surviveMask0: vec3<f32> = uniforms.data[4].yzw;
    let surviveMask1: vec4<f32> = uniforms.data[5];
    let surviveMask2: vec2<f32> = uniforms.data[6].xy;
    let source: i32 = i32(uniforms.data[6].z);

    // Sample all 4 channels to check if buffer is truly empty
    let base: vec2<i32> = vec2<i32>(i32(fragCoord.x), i32(fragCoord.y));
    let bufState: vec4<f32> = textureLoad(bufTex, clampCoord(base, texSizeI), 0);
    let state: f32 = bufState.r;
    let bufferIsEmpty: bool = (bufState.r == 0.0 && bufState.g == 0.0 && bufState.b == 0.0 && bufState.a == 0.0);

    // Sample previous frame for luminance-based perturbation (must be before early return for uniform control flow)
    let prevFrame: vec3<f32> = textureSample(tex, samp, uv).rgb;
    let prevLum: f32 = lum(prevFrame);

    // Initialize when reset button pressed or when buffer is completely empty (first load)
    if (resetState || bufferIsEmpty) {
        let r: f32 = random(uv + vec2<f32>(f32(seed), f32(seed)));
        let alive: f32 = step(0.5, r);
        return vec4<f32>(alive, alive, alive, 1.0);
    }

    let prevFrameCoord: vec2<f32> = vec2<f32>(fragCoord.x / texSize.x, 1.0 - fragCoord.y / texSize.y);

    let neighbors: i32 = countNeighbors(base, texSizeI);

    var newState: f32 = state;

    if (useCustom) {
        if (shouldBeBornCustom(neighbors, bornMask0, bornMask1, bornMask2)) {
            newState = 1.0;
        } else if (shouldSurviveCustom(neighbors, state, surviveMask0, surviveMask1, surviveMask2)) {
            newState = 1.0;
        } else {
            newState = 0.0;
        }
    } else {
        if (shouldBeBorn(neighbors, ruleIndex)) {
            newState = 1.0;
        } else if (shouldSurvive(neighbors, state, ruleIndex)) {
            newState = 1.0;
        } else {
            newState = 0.0;
        }
    }

    if (weight > 0.0) {
        newState = mix(newState, prevLum, weight * 0.01);
    }

    // The speed knob expresses human-friendly BPM-style values; remapping keeps
    // the integration step numerically stable across refresh rates.
    let animSpeed: f32 = map(speed, 1.0, 100.0, 0.1, 100.0);
    let currentState: vec4<f32> = vec4<f32>(state, state, state, 1.0);
    let nextState: vec4<f32> = vec4<f32>(newState, newState, newState, 1.0);
    return mix(currentState, nextState, min(1.0, deltaTime * animSpeed));
}
`}},a=`# cellularAutomata

2D cellular automata with rule presets

## Description

Classic 2D cellular automata simulation supporting various rule sets including Conway's Game of Life and many others. Features zoom levels, smoothing interpolation, and optional texture input for seeding.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Texture |
| zoom | int | x32 | x1/x2/x4/x8/x16/x32/x64 | Zoom |
| smoothing | int | constant | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4 | Smoothing |
| seed | float | 1 | 1-100 | Seed |
| speed | float | 10 | 1-100 | Speed |
| resetState | boolean | false | - | State |
| ruleIndex | int | classicLife | classicLife/highlife/seeds/coral/dayNight/lifeWithoutDeath/replicator/amoeba/maze/gliderWalk/diamoeba/size2x2/morley/anneal/size34Life/simpleReplicator/waffles/pondLife | Rules |
| weight | float | 0 | 0-100 | Input weight |
| source | int | 0 | 0-7 | - |

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .write(o0)

cellularAutomata(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(l).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(l))n.shaders[o]={...e}}n&&a&&(n.help=a);var x="synth/cellularAutomata",f="synth",c="cellularAutomata",v=n;export{v as default,x as effectId,c as effectName,a as help,f as namespace};
