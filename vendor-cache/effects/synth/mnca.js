/* synth/mnca */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Mnca",func:"mnca",tags:["sim"],description:"Multi-neighborhood cellular automata",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},deltaTime:{slot:0,components:"w"},speed:{slot:1,components:"x"},smoothing:{slot:1,components:"y"},weight:{slot:1,components:"z"},seed:{slot:1,components:"w"},resetState:{slot:2,components:"x"},n1v1:{slot:2,components:"y"},n1r1:{slot:2,components:"z"},n1v2:{slot:2,components:"w"},n1r2:{slot:3,components:"x"},n1v3:{slot:3,components:"y"},n1r3:{slot:3,components:"z"},n1v4:{slot:3,components:"w"},n1r4:{slot:4,components:"x"},n2v1:{slot:4,components:"y"},n2r1:{slot:4,components:"z"},n2v2:{slot:4,components:"w"},n2r2:{slot:5,components:"x"}},textures:{global_mnca_state:{width:{screenDivide:"zoom",default:8},height:{screenDivide:"zoom",default:8}}},globals:{tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},zoom:{type:"int",default:8,choices:{x1:1,x2:2,x4:4,x8:8,x16:16,x32:32,x64:64},randChoices:[4,8,16,32,64],ui:{label:"zoom",control:"dropdown"}},seed:{type:"int",default:1,min:1,max:100,ui:{label:"seed",control:!1},uniform:"seed"},smoothing:{type:"int",default:0,choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6},ui:{label:"smoothing",control:"dropdown"},uniform:"smoothing"},speed:{type:"float",default:10,min:1,max:100,ui:{label:"speed",control:"slider"},uniform:"speed"},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"state"}},weight:{type:"float",default:0,min:0,max:100,randChance:0,ui:{label:"input weight",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}},uniform:"weight"},n1v1:{type:"float",default:21,min:0,max:100,randMin:20,ui:{label:"n1 thresh 1",control:"slider",category:"rules"},uniform:"n1v1"},n1r1:{type:"float",default:1,min:0,max:100,ui:{label:"n1 range 1",control:"slider",category:"rules"},uniform:"n1r1"},n1v2:{type:"float",default:35,min:0,max:100,randMin:20,ui:{label:"n1 thresh 2",control:"slider",category:"rules"},uniform:"n1v2"},n1r2:{type:"float",default:15,min:0,max:100,ui:{label:"n1 range 2",control:"slider",category:"rules"},uniform:"n1r2"},n1v3:{type:"float",default:75,min:0,max:100,randMin:20,ui:{label:"n1 thresh 3",control:"slider",category:"rules"},uniform:"n1v3"},n1r3:{type:"float",default:10,min:0,max:100,ui:{label:"n1 range 3",control:"slider",category:"rules"},uniform:"n1r3"},n1v4:{type:"float",default:12,min:0,max:100,randMin:20,ui:{label:"n1 thresh 4",control:"slider",category:"rules"},uniform:"n1v4"},n1r4:{type:"float",default:3,min:0,max:100,ui:{label:"n1 range 4",control:"slider",category:"rules"},uniform:"n1r4"},n2v1:{type:"float",default:10,min:0,max:100,randMin:20,ui:{label:"n2 thresh 1",control:"slider",category:"rules"},uniform:"n2v1"},n2r1:{type:"float",default:18,min:0,max:100,ui:{label:"n2 range 1",control:"slider",category:"rules"},uniform:"n2r1"},n2v2:{type:"float",default:43,min:0,max:100,randMin:20,ui:{label:"n2 thresh 2",control:"slider",category:"rules"},uniform:"n2v2"},n2r2:{type:"float",default:12,min:0,max:100,ui:{label:"n2 range 2",control:"slider",category:"rules"},uniform:"n2r2"},source:{type:"int",default:0,min:0,max:7,ui:{control:!1,category:"misc"},uniform:"source"}},passes:[{name:"update",program:"mncaFb",inputs:{bufTex:"global_mnca_state",seedTex:"tex"},outputs:{fragColor:"global_mnca_state"}},{name:"render",program:"mnca",inputs:{fbTex:"global_mnca_state",prevFrameTex:"global_mnca_state",bufTex:"global_mnca_state",seedTex:"tex"},outputs:{fragColor:"outputTex"}}]});var a={mnca:{glsl:`#version 300 es

/*
 * Cellular automata display pass.
 *
 * Renders the automata feedback buffer back to the canvas using selectable
 * reconstruction filters.  The shader keeps the low-res simulation crisp by
 * default, but offers bicubic smoothing for demo presets that upscale the
 * automata to screen resolution.
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

    fragColor = vec4(state, state, state, 1.0);
}
`,wgsl:`// Cellular automata display pass (WGSL).

struct Uniforms {
    data : array<vec4<f32>, 6>,
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

    return vec4<f32>(state, state, state, 1.0);
}
`},mncaFb:{glsl:`#version 300 es

/*
 * Multi-neighbourhood cellular automata feedback pass.
 *
 * Evolves the automaton by sampling two concentric neighbourhoods and mapping
 * their averages through UI-configurable threshold windows. The luminance
 * blend mirrors the single-neighbourhood shader so modulation rules stay
 * consistent across module variants.
 */

precision highp float;
precision highp int;

uniform float time;
uniform float deltaTime;
uniform sampler2D bufTex;
uniform sampler2D seedTex;
uniform vec2 resolution;
uniform float speed;
uniform float weight;
uniform int seed;
uniform bool resetState;

uniform float n1v1;
uniform float n1v2;
uniform float n1v3;
uniform float n1v4;
uniform float n2v1;
uniform float n2v2;

uniform float n1r1;
uniform float n1r2;
uniform float n1r3;
uniform float n1r4;
uniform float n2r1;
uniform float n2r2;

out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float lum(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Neighbourhood 1 = circle with r = 3.
float neighborsAvgCircle(vec2 uv, vec2 texelSize) {
    float avg, total = 0.0;
    for (int y = -3; y <= 3; y++) {
        for (int x = -3; x <= 3; x++) {
            if (x == 0 && y == 0) continue;
            if (abs(x) == 3 && abs(y) > 1) continue;
            if (abs(y) == 3 && abs(x) > 1) continue;
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            float n = texture(bufTex, uv + offset).r;
            total += n;
        }
    }

    avg = total / 36.0;

    return avg;
}

// Neighbourhood 2 = ring with inner r = 4 and outer r = 7.
float neighborsAvgRing(vec2 uv, vec2 texelSize) {
    float avg, total = 0.0;
    for (int y = -7; y <= 7; y++) {
        for (int x = -7; x <= 7; x++) {
            // ignore inner area
            if (abs(x) <= 3 && abs(y) <= 3) continue;
            if (abs(x) == 4 && abs(y) <= 2) continue;
            if (abs(y) == 4 && abs(x) <= 2) continue;
            // ignore outer corners 
            if (abs(x) == 7 && abs(y) > 2) continue;
            if (abs(x) == 6 && abs(y) > 4) continue;
            if (abs(x) == 5 && abs(y) > 5) continue;
            if (abs(x) > 2  && abs(y) > 6) continue;
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            float n = texture(bufTex, uv + offset).r;
            total += n;
        }
    }

    avg = total / 108.0;

    return avg;
}

float getState(float avg1, float avg2, float state) {
    /*
    // from https://slackermanz.com/understanding-multiple-neighborhood-cellular-automata/
    if (avg1 >= 0.210 && avg1 <= 0.220) state = 1.0;
    if (avg1 >= 0.350 && avg1 <= 0.500) state = 0.0;
    if (avg1 >= 0.750 && avg1 <= 0.850) state = 0.0;
    if (avg2 >= 0.100 && avg2 <= 0.280) state = 0.0;
    if (avg2 >= 0.430 && avg2 <= 0.550) state = 1.0;
    if (avg1 >= 0.120 && avg1 <= 0.150) state = 0.0;
    */
    if (avg1 >= n1v1 * 0.01 && avg1 <= n1v1 * 0.01 + n1r1 * 0.01) state = 1.0;
    if (avg1 >= n1v2 * 0.01 && avg1 <= n1v2 * 0.01 + n1r2 * 0.01) state = 0.0;
    if (avg1 >= n1v3 * 0.01 && avg1 <= n1v3 * 0.01 + n1r3 * 0.01) state = 0.0;
    if (avg2 >= n2v1 * 0.01 && avg2 <= n2v1 * 0.01 + n2r1 * 0.01) state = 0.0;
    if (avg2 >= n2v2 * 0.01 && avg2 <= n2v2 * 0.01 + n2r2 * 0.01) state = 1.0;
    if (avg1 >= n1v4 * 0.01 && avg1 <= n1v4 * 0.01 + n1r4 * 0.01) state = 0.0;

    return state;
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

    vec3 prevFrame = texture(seedTex, uv).rgb;
    float prevLum = lum(prevFrame);

    float newState = state;
    float n1 = neighborsAvgCircle(uv, texelSize);
    float n2 = neighborsAvgRing(uv, texelSize);
    newState = getState(n1, n2, state);

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
 * Multi-neighbourhood cellular automata feedback pass.
 *
 * Evolves the automaton by sampling two concentric neighbourhoods and mapping
 * their averages through UI-configurable threshold windows. The luminance
 * blend mirrors the single-neighbourhood shader so modulation rules stay
 * consistent across module variants.
 */

struct Uniforms {
    data : array<vec4<f32>, 6>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var bufTex: texture_2d<f32>;
@group(0) @binding(3) var seedTex: texture_2d<f32>;

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn lum(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn random(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

// Clamp a texel coordinate to the valid texture bounds
fn clampCoord(p: vec2<i32>, size: vec2<i32>) -> vec2<i32> {
    let cx = clamp(p.x, 0, size.x - 1);
    let cy = clamp(p.y, 0, size.y - 1);
    return vec2<i32>(cx, cy);
}

// Fetch a single cell value using integer coordinates to avoid filtering
fn cellAt(base: vec2<i32>, offset: vec2<i32>, size: vec2<i32>) -> f32 {
    let pc = clampCoord(base + offset, size);
    return textureLoad(bufTex, pc, 0).r;
}

// Neighbourhood 1 = circle with r = 3.
fn neighborsAvgCircle(base: vec2<i32>, size: vec2<i32>) -> f32 {
    var total: f32 = 0.0;
    for (var y: i32 = -3; y <= 3; y++) {
        for (var x: i32 = -3; x <= 3; x++) {
            if (x == 0 && y == 0) { continue; }
            if (abs(x) == 3 && abs(y) > 1) { continue; }
            if (abs(y) == 3 && abs(x) > 1) { continue; }
            total += cellAt(base, vec2<i32>(x, y), size);
        }
    }
    return total / 36.0;
}

// Neighbourhood 2 = ring with inner r = 4 and outer r = 7.
fn neighborsAvgRing(base: vec2<i32>, size: vec2<i32>) -> f32 {
    var total: f32 = 0.0;
    for (var y: i32 = -7; y <= 7; y++) {
        for (var x: i32 = -7; x <= 7; x++) {
            // ignore inner area
            if (abs(x) <= 3 && abs(y) <= 3) { continue; }
            if (abs(x) == 4 && abs(y) <= 2) { continue; }
            if (abs(y) == 4 && abs(x) <= 2) { continue; }
            // ignore outer corners 
            if (abs(x) == 7 && abs(y) > 2) { continue; }
            if (abs(x) == 6 && abs(y) > 4) { continue; }
            if (abs(x) == 5 && abs(y) > 5) { continue; }
            if (abs(x) > 2 && abs(y) > 6) { continue; }
            total += cellAt(base, vec2<i32>(x, y), size);
        }
    }
    return total / 108.0;
}

fn getState(avg1: f32, avg2: f32, state: f32,
            n1v1: f32, n1r1: f32, n1v2: f32, n1r2: f32,
            n1v3: f32, n1r3: f32, n1v4: f32, n1r4: f32,
            n2v1: f32, n2r1: f32, n2v2: f32, n2r2: f32) -> f32 {
    var newState: f32 = state;
    if (avg1 >= n1v1 * 0.01 && avg1 <= n1v1 * 0.01 + n1r1 * 0.01) { newState = 1.0; }
    if (avg1 >= n1v2 * 0.01 && avg1 <= n1v2 * 0.01 + n1r2 * 0.01) { newState = 0.0; }
    if (avg1 >= n1v3 * 0.01 && avg1 <= n1v3 * 0.01 + n1r3 * 0.01) { newState = 0.0; }
    if (avg2 >= n2v1 * 0.01 && avg2 <= n2v1 * 0.01 + n2r1 * 0.01) { newState = 0.0; }
    if (avg2 >= n2v2 * 0.01 && avg2 <= n2v2 * 0.01 + n2r2 * 0.01) { newState = 1.0; }
    if (avg1 >= n1v4 * 0.01 && avg1 <= n1v4 * 0.01 + n1r4 * 0.01) { newState = 0.0; }
    return newState;
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let texSizeI: vec2<i32> = vec2<i32>(textureDimensions(bufTex, 0));
    let texSize: vec2<f32> = vec2<f32>(f32(texSizeI.x), f32(texSizeI.y));
    let uv: vec2<f32> = fragCoord.xy / texSize;

    // Extract parameters from uniforms
    // Slot 0: resolution, time, deltaTime
    let deltaTime: f32 = uniforms.data[0].w;

    // Slot 1: speed, smoothing, weight, seed
    let speed: f32 = uniforms.data[1].x;
    let weight: f32 = uniforms.data[1].z;
    let seed: i32 = i32(uniforms.data[1].w);

    // Slot 2: resetState, n1v1, n1r1, n1v2
    let resetState: bool = uniforms.data[2].x > 0.5;
    let n1v1: f32 = uniforms.data[2].y;
    let n1r1: f32 = uniforms.data[2].z;
    let n1v2: f32 = uniforms.data[2].w;

    // Slot 3: n1r2, n1v3, n1r3, n1v4
    let n1r2: f32 = uniforms.data[3].x;
    let n1v3: f32 = uniforms.data[3].y;
    let n1r3: f32 = uniforms.data[3].z;
    let n1v4: f32 = uniforms.data[3].w;

    // Slot 4: n1r4, n2v1, n2r1, n2v2
    let n1r4: f32 = uniforms.data[4].x;
    let n2v1: f32 = uniforms.data[4].y;
    let n2r1: f32 = uniforms.data[4].z;
    let n2v2: f32 = uniforms.data[4].w;

    // Slot 5: n2r2
    let n2r2: f32 = uniforms.data[5].x;

    // Sample textures unconditionally to satisfy uniform control flow requirement
    let prevFrame: vec3<f32> = textureSample(seedTex, samp, uv).rgb;
    let prevLum: f32 = lum(prevFrame);

    // Use UV-derived coordinates (not fragCoord) to handle resolution mismatch between output and feedback texture
    let base: vec2<i32> = vec2<i32>(i32(uv.x * texSize.x), i32(uv.y * texSize.y));
    let bufState: vec4<f32> = textureLoad(bufTex, clampCoord(base, texSizeI), 0);
    let state: f32 = bufState.r;
    let bufferIsEmpty: bool = (bufState.r == 0.0 && bufState.g == 0.0 && bufState.b == 0.0 && bufState.a == 0.0);

    // Initialize when reset button pressed or when buffer is completely empty (first load)
    if (resetState || bufferIsEmpty) {
        let r: f32 = random(uv + vec2<f32>(f32(seed), f32(seed)));
        let alive: f32 = step(0.5, r);
        return vec4<f32>(alive, alive, alive, 1.0);
    }

    let n1: f32 = neighborsAvgCircle(base, texSizeI);
    let n2: f32 = neighborsAvgRing(base, texSizeI);
    var newState: f32 = getState(n1, n2, state, n1v1, n1r1, n1v2, n1r2, n1v3, n1r3, n1v4, n1r4, n2v1, n2r1, n2v2, n2r2);

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
`}},r=`# mnca

Multi-neighborhood cellular automata

## Description

MNCA extends classic cellular automata by using multiple neighborhood configurations with configurable thresholds and ranges. This creates more complex emergent patterns than traditional single-neighborhood rules.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Texture |
| zoom | int | x8 | x1/x2/x4/x8/x16/x32/x64 | Zoom |
| seed | float | 1 | 1-100 | Seed |
| smoothing | int | constant | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4 | Smoothing |
| speed | float | 10 | 1-100 | Speed |
| resetState | boolean | false | - | State |
| weight | float | 0 | 0-100 | Input weight |
| n1v1 | float | 21 | 0-100 | N1 thresh 1 |
| n1r1 | float | 1 | 0-100 | N1 range 1 |
| n1v2 | float | 35 | 0-100 | N1 thresh 2 |
| n1r2 | float | 15 | 0-100 | N1 range 2 |
| n1v3 | float | 75 | 0-100 | N1 thresh 3 |
| n1r3 | float | 10 | 0-100 | N1 range 3 |
| n1v4 | float | 12 | 0-100 | N1 thresh 4 |
| n1r4 | float | 3 | 0-100 | N1 range 4 |
| n2v1 | float | 10 | 0-100 | N2 thresh 1 |
| n2r1 | float | 18 | 0-100 | N2 range 1 |
| n2v2 | float | 43 | 0-100 | N2 thresh 2 |
| n2r2 | float | 12 | 0-100 | N2 range 2 |
| source | int | 0 | 0-7 | - |

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .write(o0)

mnca(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(a))t.shaders[o]={...e}}t&&r&&(t.help=r);var x="synth/mnca",f="synth",c="mnca",v=t;export{v as default,x as effectId,c as effectName,r as help,f as namespace};
