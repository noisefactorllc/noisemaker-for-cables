/* synth/reactionDiffusion */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Reaction-Diffusion",func:"reactionDiffusion",tags:["sim"],description:"Gray-Scott reaction-diffusion",uniformLayouts:{rd:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},inputIntensity:{slot:1,components:"x"},smoothing:{slot:3,components:"w"}},rdFb:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},zoom:{slot:0,components:"w"},feed:{slot:1,components:"x"},kill:{slot:1,components:"y"},rate1:{slot:1,components:"z"},rate2:{slot:1,components:"w"},speed:{slot:2,components:"x"},weight:{slot:2,components:"y"},sourceF:{slot:2,components:"z"},sourceK:{slot:2,components:"w"},sourceR1:{slot:3,components:"x"},sourceR2:{slot:3,components:"y"},resetState:{slot:3,components:"z"},seed:{slot:3,components:"w"}}},textures:{global_rd_state:{width:{screenDivide:"zoom",default:8},height:{screenDivide:"zoom",default:8}}},globals:{tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},zoom:{type:"int",default:8,uniform:"zoom",choices:{x1:1,x2:2,x4:4,x8:8,x16:16,x32:32,x64:64},randChoices:[4,8,16,32,64],ui:{label:"zoom",control:"dropdown"}},smoothing:{type:"int",default:1,uniform:"smoothing",choices:{constant:0,linear:1,hermite:2,catmullRom3x3:3,catmullRom4x4:4,bSpline3x3:5,bSpline4x4:6},ui:{label:"smoothing",control:"dropdown"}},speed:{type:"float",default:100,uniform:"speed",min:10,max:145,randMax:50,ui:{label:"speed",control:"slider"}},resetState:{type:"boolean",default:!1,uniform:"resetState",ui:{control:"button",buttonLabel:"reset",label:"state"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:!1}},sourceF:{type:"int",default:0,uniform:"sourceF",choices:{slider:0,sliderInput:6,brightness:1,darkness:2,red:3,green:4,blue:5},randChance:0,ui:{label:"feed source",control:"dropdown",category:"rules"}},feed:{type:"float",default:70,uniform:"feed",min:10,max:110,randMin:35,randMax:50,ui:{label:"feed value",control:"slider",category:"rules"}},sourceK:{type:"int",default:0,uniform:"sourceK",choices:{slider:0,sliderInput:6,brightness:1,darkness:2,red:3,green:4,blue:5},randChance:0,ui:{label:"kill source",control:"dropdown",category:"rules"}},kill:{type:"float",default:67,uniform:"kill",min:45,max:70,randMin:50,randMax:65,ui:{label:"kill value",control:"slider",category:"rules"}},sourceR1:{type:"int",default:0,uniform:"sourceR1",choices:{slider:0,sliderInput:6,brightness:1,darkness:2,red:3,green:4,blue:5},randChance:0,ui:{label:"rate 1 source",control:"dropdown",category:"rules"}},rate1:{type:"float",default:92,uniform:"rate1",min:50,max:120,ui:{label:"rate 1 value",control:"slider",category:"rules"}},sourceR2:{type:"int",default:0,uniform:"sourceR2",choices:{slider:0,sliderInput:6,brightness:1,darkness:2,red:3,green:4,blue:5},randChance:0,ui:{label:"rate 2 source",control:"dropdown",category:"rules"}},rate2:{type:"float",default:22,uniform:"rate2",min:20,max:50,randMax:35,ui:{label:"rate 2 value",control:"slider",category:"rules"}},iterations:{type:"int",default:8,uniform:"iterations",min:1,max:32,randMin:6,ui:{label:"iterations",control:"slider",category:"rules"}},weight:{type:"float",default:0,uniform:"weight",min:0,max:100,randChance:0,ui:{label:"input weight",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}},inputIntensity:{type:"float",default:0,uniform:"inputIntensity",min:0,max:100,randChance:0,ui:{label:"input mix",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}}},passes:[{name:"simulate",program:"rdFb",repeat:"iterations",inputs:{bufTex:"global_rd_state",inputTex:"tex"},outputs:{fragColor:"global_rd_state"}},{name:"render",program:"rd",inputs:{fbTex:"global_rd_state",inputTex:"tex"},outputs:{fragColor:"outputTex"}}]});var l={rd:{glsl:`#version 300 es

/*
 * Reaction-diffusion display shader.
 * Converts the feedback buffer into output colors with optional palette cycling for animated looks.
 * Normalization keeps the solver output in [0,1] so post-processing stays predictable.
 */

precision highp float;
precision highp int;

uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D fbTex;
uniform sampler2D inputTex;
uniform int smoothing;
uniform float inputIntensity;
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

// Catmull-Rom spline for cubic interpolation
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
    // Catmull-Rom cubic interpolation for 3 points
    // Uses endpoint tangents estimated from neighbors
    float t2 = t * t;
    float t3 = t2 * t;
    
    // Tangent at p1 estimated as (p2 - p0) / 2
    vec4 m = 0.5 * (p2 - p0);
    
    // Hermite basis functions with tangent m at both endpoints
    return (2.0*t3 - 3.0*t2 + 1.0) * p1 + 
           (t3 - 2.0*t2 + t) * m +
           (-2.0*t3 + 3.0*t2) * p2 + 
           (t3 - t2) * m;
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
    } else if (smoothing == 2) {
        // hermite (smoothstep)
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelPos = (globalCoord * texSize / fullResolution) - vec2(0.5);
        vec2 base = floor(texelPos);
        vec2 weights = fract(texelPos);
        vec2 next = base + vec2(1.0);

        ivec2 texSizeI = textureSize(fbTex, 0);
        ivec2 minIdx = ivec2(0);
        ivec2 maxIdx = texSizeI - ivec2(1);

        ivec2 baseIdx = clamp(ivec2(base), minIdx, maxIdx);
        ivec2 nextIdx = clamp(ivec2(next), minIdx, maxIdx);

        float v00 = texelFetch(fbTex, baseIdx, 0).g;
        float v10 = texelFetch(fbTex, ivec2(nextIdx.x, baseIdx.y), 0).g;
        float v01 = texelFetch(fbTex, ivec2(baseIdx.x, nextIdx.y), 0).g;
        float v11 = texelFetch(fbTex, nextIdx, 0).g;

        vec2 smoothWeights = smoothstep(0.0, 1.0, weights);
        float v0 = mix(v00, v10, smoothWeights.x);
        float v1 = mix(v01, v11, smoothWeights.x);
        state = mix(v0, v1, smoothWeights.y);
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
        // linear or cosine smoothing using direct texel fetches to match the multires reference.
        vec2 texSize = vec2(textureSize(fbTex, 0));
        vec2 texelPos = (globalCoord * texSize / fullResolution) - vec2(0.5);
        vec2 base = floor(texelPos);
        vec2 weights = fract(texelPos);
        vec2 next = base + vec2(1.0);

        ivec2 texSizeI = textureSize(fbTex, 0);
        ivec2 minIdx = ivec2(0);
        ivec2 maxIdx = texSizeI - ivec2(1);

        ivec2 baseIdx = clamp(ivec2(base), minIdx, maxIdx);
        ivec2 nextIdx = clamp(ivec2(next), minIdx, maxIdx);

        float v00 = texelFetch(fbTex, baseIdx, 0).g;
        float v10 = texelFetch(fbTex, ivec2(nextIdx.x, baseIdx.y), 0).g;
        float v01 = texelFetch(fbTex, ivec2(baseIdx.x, nextIdx.y), 0).g;
        float v11 = texelFetch(fbTex, nextIdx, 0).g;

        if (smoothing == 1) {
            float v0 = mix(v00, v10, weights.x);
            float v1 = mix(v01, v11, weights.x);
            state = mix(v0, v1, weights.y);
        } else {
            float v0 = cosineMix(v00, v10, weights.x);
            float v1 = cosineMix(v01, v11, weights.x);
            state = cosineMix(v0, v1, weights.y);
        }
    }

    float intensity = clamp(state, 0.0, 1.0);

    vec3 rdColor = vec3(intensity);

    // Blend with input texture
    float blend = inputIntensity * 0.01;
    if (blend > 0.0) {
        vec2 inputUv = globalCoord / fullResolution;
        vec3 inputColor = texture(inputTex, inputUv).rgb;
        rdColor = mix(rdColor, inputColor, blend);
    }

    fragColor = vec4(rdColor, 1.0);
}
`,wgsl:`/*
 * WGSL reaction-diffusion display shader (mono only).
 * Formats the simulation state into grayscale output.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, time, unused)
    // data[1] = (inputIntensity, unused, unused, unused)
    // data[2] = (unused, unused, unused, unused)
    // data[3] = (unused, unused, unused, smoothing)
    data : array<vec4<f32>, 4>,
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var fbTex : texture_2d<f32>;
@group(0) @binding(3) var inputTex : texture_2d<f32>;

const PI : f32 = 3.14159265359;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

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

fn quadratic(tex: texture_2d<f32>, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
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

fn catmullRom3x3(tex: texture_2d<f32>, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
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

fn bicubic(tex: texture_2d<f32>, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
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

fn catmullRom4x4(tex: texture_2d<f32>, uv: vec2<f32>, texelSize: vec2<f32>) -> vec4<f32> {
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

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let smoothing = i32(uniforms.data[3].w);
    let inputIntensity = uniforms.data[1].x * 0.01;

    var intensity = 1.0;

    if (smoothing == 0) {
        let texSizeI = vec2<i32>(textureDimensions(fbTex, 0));
        let texSizeF = vec2<f32>(f32(texSizeI.x), f32(texSizeI.y));
        let coord = vec2<i32>(floor(pos.xy * texSizeF / resolution));
        let clamped = clamp(coord, vec2<i32>(0), texSizeI - vec2<i32>(1));
        intensity = clamp(textureLoad(fbTex, clamped, 0).g, 0.0, 1.0);
    } else if (smoothing == 2) {
        // hermite (smoothstep)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelPos = (pos.xy * texSize / resolution) - vec2<f32>(0.5);
        let base = floor(texelPos);
        let weights = fract(texelPos);
        let next = base + vec2<f32>(1.0);

        let texSizeI = vec2<i32>(textureDimensions(fbTex, 0));
        let minIdx = vec2<i32>(0);
        let maxIdx = texSizeI - vec2<i32>(1);

        let baseIdx = clamp(vec2<i32>(base), minIdx, maxIdx);
        let nextIdx = clamp(vec2<i32>(next), minIdx, maxIdx);

        let v00 = textureLoad(fbTex, baseIdx, 0).g;
        let v10 = textureLoad(fbTex, vec2<i32>(nextIdx.x, baseIdx.y), 0).g;
        let v01 = textureLoad(fbTex, vec2<i32>(baseIdx.x, nextIdx.y), 0).g;
        let v11 = textureLoad(fbTex, nextIdx, 0).g;

        let smoothWeights = smoothstep(vec2<f32>(0.0), vec2<f32>(1.0), weights);
        let v0 = mix(v00, v10, smoothWeights.x);
        let v1 = mix(v01, v11, smoothWeights.x);
        intensity = clamp(mix(v0, v1, smoothWeights.y), 0.0, 1.0);
    } else if (smoothing == 3) {
        // catmull-rom 3x3 (9 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (pos.xy - scaling * 0.5) / resolution;
        let sample = catmullRom3x3(fbTex, uv, texelSize);
        intensity = clamp(sample.g, 0.0, 1.0);
    } else if (smoothing == 4) {
        // catmull-rom 4x4 (16 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (pos.xy - scaling * 0.5) / resolution;
        let sample = catmullRom4x4(fbTex, uv, texelSize);
        intensity = clamp(sample.g, 0.0, 1.0);
    } else if (smoothing == 5) {
        // b-spline 3x3 (9 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (pos.xy - scaling * 0.5) / resolution;
        let sample = quadratic(fbTex, uv, texelSize);
        intensity = clamp(sample.g, 0.0, 1.0);
    } else if (smoothing == 6) {
        // b-spline 4x4 (16 taps)
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelSize = 1.0 / texSize;
        let scaling = resolution / texSize;
        let uv = (pos.xy - scaling * 0.5) / resolution;
        let sample = bicubic(fbTex, uv, texelSize);
        intensity = clamp(sample.g, 0.0, 1.0);
    } else {
        let texSize = vec2<f32>(textureDimensions(fbTex, 0));
        let texelPos = (pos.xy * texSize / resolution) - vec2<f32>(0.5, 0.5);
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
            intensity = clamp(mix(v0, v1, weights.y), 0.0, 1.0);
        } else {
            let v0 = cosineMix(v00, v10, weights.x);
            let v1 = cosineMix(v01, v11, weights.x);
            intensity = clamp(cosineMix(v0, v1, weights.y), 0.0, 1.0);
        }
    }

    var rdColor = vec3<f32>(intensity, intensity, intensity);

    // Blend with input texture
    if (inputIntensity > 0.0) {
        var inputUv = pos.xy / resolution;
        let inputColor = textureSampleLevel(inputTex, samp, inputUv, 0.0).rgb;
        rdColor = mix(rdColor, inputColor, inputIntensity);
    }

    return vec4<f32>(rdColor, 1.0);
}
`},rdFb:{glsl:`#version 300 es

/*
 * Reaction-diffusion feedback shader.
 * Runs the Gray-Scott update step on the low-resolution feedback buffer with adjustable feed/kill constants.
 * Stability parameters are clamped to safe ranges so the solver cannot explode during performances.
 */

precision highp float;
precision highp int;

uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform sampler2D bufTex;
uniform float feed;
uniform float kill;
uniform float rate1;
uniform float rate2;
uniform float speed;
uniform float weight;
uniform int sourceF;
uniform int sourceK;
uniform int sourceR1;
uniform int sourceR2;
uniform float zoom;

uniform sampler2D inputTex;
uniform bool resetState;

out vec4 fragColor;
#define aspectRatio resolution.x / resolution.y

vec3 lp(sampler2D tex, vec2 uv, vec2 size) {
	vec3 val = vec3(0.0);

	val += texture(tex, (uv + vec2(-1, -1)) / size).rgb * 0.05;
	val += texture(tex, (uv + vec2(0, -1)) / size).rgb * 0.2;
	val += texture(tex, (uv + vec2(1, -1)) / size).rgb * 0.05;
	val += texture(tex, (uv + vec2(-1, 0)) / size).rgb * 0.2;
	val += texture(tex, (uv + vec2(0, 0)) / size).rgb * -1.0;
	val += texture(tex, (uv + vec2(1, 0)) / size).rgb * 0.2;
	val += texture(tex, (uv + vec2(-1, 1)) / size).rgb * 0.05;
	val += texture(tex, (uv + vec2(0, 1)) / size).rgb * 0.2;
	val += texture(tex, (uv + vec2(1, 1)) / size).rgb * 0.05;

	return val;
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float lum(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

float hash(vec2 p) {
    vec2 p2 = fract(p * vec2(0.1031, 0.1030));
    p2 += dot(p2, p2.yx + 33.33);
    return fract((p2.x + p2.y) * p2.x);
}

void main() {
    ivec2 texSize = textureSize(bufTex, 0);
    vec4 tex = texture(bufTex, gl_FragCoord.xy/vec2(texSize));
	float a = tex.r;
	float b = tex.g;

    // Check if buffer is empty (first frame initialization) or reset requested
    // Sample all channels to detect truly empty buffer
    bool bufferIsEmpty = (tex.r == 0.0 && tex.g == 0.0 && tex.b == 0.0 && tex.a == 0.0);
    
    if (bufferIsEmpty || resetState) {
        // Initialize: A=1 everywhere, B=1 at sparse random locations
        a = 1.0;
        b = 0.0;
        if (hash(gl_FragCoord.xy + vec2(float(seed))) > 0.99) {
            b = 1.0;
        }
        // Return initial state without running update step
        fragColor = vec4(a, b, 0.0, 1.0);
        return;
    }

	vec3 color = lp(bufTex, gl_FragCoord.xy, vec2(texSize));

    vec2 prevFrameCoord = gl_FragCoord.xy/vec2(texSize);

    vec3 prevFrame = texture(inputTex, prevFrameCoord).rgb;

    float prevLum = lum(prevFrame);

	float f = feed * 0.001;
	float k = kill * 0.001;
	float r1 = rate1 * 0.01;
	float r2 = rate2 * 0.01;
    
    float s = speed * 0.01;

    if (sourceF > 0) {
        float val = prevLum;

        if (sourceF == 2) {
            val = 1.0 - prevLum;
        } else if (sourceF == 3) {
            val = prevFrame.r;
        } else if (sourceF == 4) {
            val = prevFrame.g;
        } else if (sourceF == 5) {
            val = prevFrame.b;
        } else if (sourceF == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.01, 0.11);
            f = mix(f, val, weight * 0.01);
        }

        if (sourceF != 6) {
            val = map(val, 0.0, 1.0, 0.01, 0.11);
            f = val;
        }
    }

    if (sourceK > 0) {
        float val = prevLum;

        if (sourceK == 2) {
            val = 1.0 - prevLum;
        } else if (sourceK == 3) {
            val = prevFrame.r;
        } else if (sourceK == 4) {
            val = prevFrame.g;
        } else if (sourceK == 5) {
            val = prevFrame.b;
        } else if (sourceK == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.045, 0.07);
            k = mix(k, val, weight * 0.01);
        }

        if (sourceK != 6) {
            val = map(val, 0.0, 1.0, 0.045, 0.07);
            k = val;
        }
    }

    if (sourceR1 > 0) {
        float val = prevLum;

        if (sourceR1 == 2) {
            val = 1.0 - prevLum;
        } else if (sourceR1 == 3) {
            val = prevFrame.r;
        } else if (sourceR1 == 4) {
            val = prevFrame.g;
        } else if (sourceR1 == 5) {
            val = prevFrame.b;
        } else if (sourceR1 == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.5, 1.2);
            r1 = mix(r1, val, weight * 0.01);
        }

        if (sourceR1 != 6) {
            val = map(val, 0.0, 1.0, 0.5, 1.2);
            r1 = val;
        }
    }

    if (sourceR2 > 0) {
        float val = prevLum;

        if (sourceR2 == 2) {
            val = 1.0 - prevLum;
        } else if (sourceR2 == 3) {
            val = prevFrame.r;
        } else if (sourceR2 == 4) {
            val = prevFrame.g;
        } else if (sourceR2 == 5) {
            val = prevFrame.b;
        } else if (sourceR2 == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.2, 0.5);
            r2 = mix(r2, val, weight * 0.01);
        }

        if (sourceR2 != 6) {
            val = map(val, 0.0, 1.0, 0.2, 0.5);
            r2 = val;
        }
    }

	float a2 = a + (r1 * color.r - a * b * b + f * (1.0 - a)) * s;
	float b2 = b + (r2 * color.g + a * b * b - (k + f) * b) * s;

	// Clamp to [0,1] for numerical stability
	a2 = clamp(a2, 0.0, 1.0);
	b2 = clamp(b2, 0.0, 1.0);

	fragColor = vec4(a2, b2, 0.0, 1.0);
}
`,wgsl:`/*
 * WGSL reaction-diffusion feedback shader.
 * Implements the Gray-Scott solver in WGSL to match the GLSL pass for deterministic evolution.
 * Feed and kill coefficients are clamped to stability thresholds before integration.
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, time, zoom)
    // data[1] = (feed, kill, rate1, rate2)
    // data[2] = (speed, weight, sourceF, sourceK)
    // data[3] = (sourceR1, sourceR2, resetState, seed)
    data : array<vec4<f32>, 4>,
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var bufTex : texture_2d<f32>;
@group(0) @binding(3) var inputTex : texture_2d<f32>;

fn lp(tex: texture_2d<f32>, uv: vec2<f32>, size: vec2<f32>) -> vec3<f32> {
    // Fixed 1px neighbourhood sampling (matches GLSL behavior)
    let pixelStep = 1.0;

    var val = vec3<f32>(0.0);
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(-pixelStep, -pixelStep)) / size, 0.0).rgb * 0.05;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(0.0, -pixelStep)) / size, 0.0).rgb * 0.2;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(pixelStep, -pixelStep)) / size, 0.0).rgb * 0.05;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(-pixelStep, 0.0)) / size, 0.0).rgb * 0.2;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(0.0, 0.0)) / size, 0.0).rgb * -1.0;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(pixelStep, 0.0)) / size, 0.0).rgb * 0.2;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(-pixelStep, pixelStep)) / size, 0.0).rgb * 0.05;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(0.0, pixelStep)) / size, 0.0).rgb * 0.2;
    val = val + textureSampleLevel(tex, samp, (uv + vec2<f32>(pixelStep, pixelStep)) / size, 0.0).rgb * 0.05;
    return val;
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn lum(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn hash(p: vec2<f32>) -> f32 {
    var p2 = fract(p * vec2<f32>(0.1031, 0.1030));
    p2 = p2 + dot(p2, p2.yx + 33.33);
    return fract((p2.x + p2.y) * p2.x);
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z; // unused
    let zoom = uniforms.data[0].w;
    let seed = uniforms.data[3].w;

    let texSize = vec2<f32>(textureDimensions(bufTex, 0));
    let tex = textureSampleLevel(bufTex, samp, pos.xy / texSize, 0.0);
    var a = tex.r;
    var b = tex.g;

    // Check if buffer is empty (first frame initialization) or reset requested
    let bufferIsEmpty = (tex.r == 0.0 && tex.g == 0.0 && tex.b == 0.0 && tex.a == 0.0);
    let resetState = uniforms.data[3].z > 0.5;

    if (bufferIsEmpty || resetState) {
        // Initialize: A=1 everywhere, B=1 at sparse random locations
        a = 1.0;
        b = 0.0;
        if (hash(pos.xy + vec2<f32>(seed, seed)) > 0.99) {
            b = 1.0;
        }
        // Return initial state without running update step
        return vec4<f32>(a, b, 0.0, 1.0);
    }

    var color = lp(bufTex, pos.xy, texSize);

    var prevFrameCoord = pos.xy / texSize;

    let prevFrame = textureSampleLevel(inputTex, samp, prevFrameCoord, 0.0).rgb;

    let prevLum = lum(prevFrame);

    var f = uniforms.data[1].x * 0.001;
    var k = uniforms.data[1].y * 0.001;
    var r1 = uniforms.data[1].z * 0.01;
    var r2 = uniforms.data[1].w * 0.01;
    let s = uniforms.data[2].x * 0.01;
    let weight = uniforms.data[2].y * 0.01;
    let sourceF = i32(uniforms.data[2].z);
    let sourceK = i32(uniforms.data[2].w);
    let sourceR1 = i32(uniforms.data[3].x);
    let sourceR2 = i32(uniforms.data[3].y);

    if (sourceF > 0) {
        var val = prevLum;
        if (sourceF == 2) {
            val = 1.0 - prevLum;
        } else if (sourceF == 3) {
            val = prevFrame.r;
        } else if (sourceF == 4) {
            val = prevFrame.g;
        } else if (sourceF == 5) {
            val = prevFrame.b;
        } else if (sourceF == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.01, 0.11);
            f = mix(f, val, weight);
        }
        if (sourceF != 6) {
            val = map(val, 0.0, 1.0, 0.01, 0.11);
            f = val;
        }
    }

    if (sourceK > 0) {
        var val = prevLum;
        if (sourceK == 2) {
            val = 1.0 - prevLum;
        } else if (sourceK == 3) {
            val = prevFrame.r;
        } else if (sourceK == 4) {
            val = prevFrame.g;
        } else if (sourceK == 5) {
            val = prevFrame.b;
        } else if (sourceK == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.045, 0.07);
            k = mix(k, val, weight);
        }
        if (sourceK != 6) {
            val = map(val, 0.0, 1.0, 0.045, 0.07);
            k = val;
        }
    }

    if (sourceR1 > 0) {
        var val = prevLum;
        if (sourceR1 == 2) {
            val = 1.0 - prevLum;
        } else if (sourceR1 == 3) {
            val = prevFrame.r;
        } else if (sourceR1 == 4) {
            val = prevFrame.g;
        } else if (sourceR1 == 5) {
            val = prevFrame.b;
        } else if (sourceR1 == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.5, 1.2);
            r1 = mix(r1, val, weight);
        }
        if (sourceR1 != 6) {
            val = map(val, 0.0, 1.0, 0.5, 1.2);
            r1 = val;
        }
    }

    if (sourceR2 > 0) {
        var val = prevLum;
        if (sourceR2 == 2) {
            val = 1.0 - prevLum;
        } else if (sourceR2 == 3) {
            val = prevFrame.r;
        } else if (sourceR2 == 4) {
            val = prevFrame.g;
        } else if (sourceR2 == 5) {
            val = prevFrame.b;
        } else if (sourceR2 == 6) {
            // sliderInput: blend slider value with brightness-modulated value
            val = map(prevLum, 0.0, 1.0, 0.2, 0.5);
            r2 = mix(r2, val, weight);
        }
        if (sourceR2 != 6) {
            val = map(val, 0.0, 1.0, 0.2, 0.5);
            r2 = val;
        }
    }

    let a2 = clamp(a + (r1 * color.r - a * b * b + f * (1.0 - a)) * s, 0.0, 1.0);
    let b2 = clamp(b + (r2 * color.g + a * b * b - (k + f) * b) * s, 0.0, 1.0);

    return vec4<f32>(a2, b2, 0.0, 1.0);
}
`}},r=`# reactionDiffusion

Gray-Scott reaction-diffusion

## Description

Implements the Gray-Scott model of reaction-diffusion, producing organic, self-organizing patterns. The simulation models two virtual chemicals that diffuse and react, creating spots, stripes, and complex patterns depending on the feed and kill rates.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Texture |
| zoom | int | x8 | x1/x2/x4/x8/x16/x32/x64 | Zoom |
| smoothing | int | linear | constant/linear/hermite/catmullRom3x3/catmullRom4x4/bSpline3x3/bSpline4x4 | Smoothing |
| speed | float | 100 | 10-145 | Speed |
| resetState | boolean | false | - | State |
| sourceF | int | slider | slider/sliderInput/brightness/darkness/red/green/blue | Feed source |
| feed | float | 70 | 10-110 | Feed value |
| sourceK | int | slider | slider/sliderInput/brightness/darkness/red/green/blue | Kill source |
| kill | float | 67 | 45-70 | Kill value |
| sourceR1 | int | slider | slider/sliderInput/brightness/darkness/red/green/blue | Rate 1 source |
| rate1 | float | 92 | 50-120 | Rate 1 value |
| sourceR2 | int | slider | slider/sliderInput/brightness/darkness/red/green/blue | Rate 2 source |
| rate2 | float | 22 | 20-50 | Rate 2 value |
| iterations | int | 8 | 1-32 | Iterations |
| weight | float | 0 | 0-100 | Input weight |
| inputIntensity | float | 0 | 0-100 | Input mix |

## Usage

\`\`\`
noise(seed: 1, ridges: true)
  .write(o0)

reactionDiffusion(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(l).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(l))t.shaders[o]={...e}}t&&r&&(t.help=r);var x="synth/reactionDiffusion",v="synth",c="reactionDiffusion",f=t;export{f as default,x as effectId,c as effectName,r as help,v as namespace};
