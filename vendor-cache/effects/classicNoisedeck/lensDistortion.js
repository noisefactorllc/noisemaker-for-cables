/* classicNoisedeck/lensDistortion */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"LensDistortion",namespace:"classicNoisedeck",func:"lensDistortion",tags:["distort"],description:"Lens distortion simulation",globals:{shape:{type:"int",default:0,uniform:"shape",choices:{circle:0,cosine:10,diamond:1,hexagon:2,octagon:3,square:4,triangle:6},ui:{label:"shape",control:"dropdown"}},distortion:{type:"float",default:0,uniform:"distortion",min:-100,max:100,ui:{label:"distortion",control:"slider"}},aspectLens:{type:"boolean",default:!1,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},loopScale:{type:"float",default:100,uniform:"loopScale",min:1,max:100,ui:{label:"loop scale",control:"slider",category:"animation"}},speed:{type:"float",default:0,uniform:"speed",min:-100,max:100,ui:{label:"speed",control:"slider",category:"animation"}},mode:{type:"int",default:0,uniform:"mode",choices:{chromaticRgb:0,prismaticHsv:1},ui:{label:"mode",control:"dropdown",category:"aberration"}},aberration:{type:"float",default:50,uniform:"aberration",min:0,max:100,ui:{label:"aberration",control:"slider",category:"aberration"}},blendMode:{type:"int",default:0,uniform:"blendMode",choices:{add:0,alpha:1},ui:{label:"blend mode",control:"dropdown",category:"aberration"}},modulate:{type:"boolean",default:!1,uniform:"modulate",ui:{label:"modulate",control:"checkbox",category:"aberration"}},tint:{type:"color",default:[0,0,0],uniform:"tint",ui:{label:"tint",control:"color",category:"effect"}},alpha:{type:"float",default:0,uniform:"alpha",min:0,max:100,ui:{label:"tint opacity",control:"slider",category:"effect"}},hueRotation:{type:"float",default:0,uniform:"hueRotation",min:0,max:360,ui:{label:"hue rotate",control:"slider",category:"aberration"}},hueRange:{type:"float",default:0,uniform:"hueRange",min:0,max:100,ui:{label:"hue range",control:"slider",category:"aberration"}},saturation:{type:"float",default:0,uniform:"saturation",min:-100,max:100,ui:{label:"saturation",control:"slider",category:"aberration"}},passthru:{type:"float",default:50,uniform:"passthru",min:0,max:100,ui:{label:"passthru",control:"slider",category:"aberration"}},vignetteAmt:{type:"float",default:0,uniform:"vignetteAmt",min:-100,max:100,ui:{label:"vignette",control:"slider",category:"effect"}}},paramAliases:{aberrationAmt:"aberration",opacity:"alpha",loopAmp:"speed"},passes:[{name:"render",program:"lensDistortion",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={lensDistortion:{glsl:`#version 300 es

/*
 * Lens distortion shader.
 * Applies barrel, pincushion, and chromatic aberration warps using calibrated coefficients.
 * Strength controls are normalized so the warp stays invertible even under automation.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform bool aspectLens;
uniform int shape;
uniform vec3 tint;
uniform float alpha;
uniform float vignetteAmt;
uniform float distortion;
uniform float speed;
uniform float loopScale;
uniform float aberration;
uniform float hueRotation;
uniform float hueRange;
uniform int mode;
uniform bool modulate;
uniform int blendMode;
uniform float saturation;
uniform float passthru;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    
    float c = v * s; // Chroma
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;

    vec3 rgb;

    if (0.0 <= h && h < 1.0/6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (1.0/6.0 <= h && h < 2.0/6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (2.0/6.0 <= h && h < 3.0/6.0) {
        rgb = vec3(0.0, c, x);
    } else if (3.0/6.0 <= h && h < 4.0/6.0) {
        rgb = vec3(0.0, x, c);
    } else if (4.0/6.0 <= h && h < 5.0/6.0) {
        rgb = vec3(x, 0.0, c);
    } else if (5.0/6.0 <= h && h < 1.0) {
        rgb = vec3(c, 0.0, x);
    } else {
        rgb = vec3(0.0, 0.0, 0.0);
    }

    return rgb + vec3(m, m, m);
}

vec3 rgb2hsv(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    
    float max = max(r, max(g, b));
    float min = min(r, min(g, b));
    float delta = max - min;

    float h = 0.0;
    if (delta != 0.0) {
        if (max == r) {
            h = mod((g - b) / delta, 6.0) / 6.0;
        } else if (max == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (max == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    
    float s = (max == 0.0) ? 0.0 : delta / max;
    float v = max;

    return vec3(h, s, v);
}

vec3 hsv2rgb2(vec3 hsv) {
    vec3 rgb = vec3(0.0);

    float c = hsv.z * hsv.y;
    float x = c * (1.0 - abs((mod(hsv.x * 6.0, 2.0) - 1.0)));
    float m = hsv.z - c;

    if (hsv.x < 1.0 / 6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (hsv.x < 2.0 / 6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (hsv.x < 3.0 / 6.0) {
        rgb = vec3(0.0, c, x);
    } else if (hsv.x < 4.0 / 6.0) {
        rgb = vec3(0.0, x, c);
    } else if (hsv.x < 5.0 / 6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }

    rgb += m;
    return rgb;
}


vec3 rgb2hsv2(vec3 rgb) {
    vec3 hsv = vec3(0.0);

    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float diff = maxC - minC;

    if (rgb.r == maxC) {
        hsv.x = (rgb.g - rgb.b) / diff;
    } else if (rgb.g == maxC) {
        hsv.x = (rgb.b - rgb.r) / diff + 2.0;
    } else {
        hsv.x = (rgb.r - rgb.g) / diff + 4.0;
    }

    hsv.x = mod(hsv.x, 6.0) / 6.0;
    hsv.y = max(0.0, diff / maxC);
    hsv.z = maxC;

    return hsv;
}

vec3 saturate(vec3 color) {
    float sat = map(saturation, -100.0, 100.0, -1.0, 1.0);
    float avg = (color.r + color.g + color.b) / 3.0;
    color -= (avg - color) * sat;
    return color;
}

float _distance(vec2 diff, vec2 uv) {
    uv.x *= aspectRatio;
    float dist = 1.0;

    if (shape == 0) {
        // Euclidean
        dist = length(diff);
    } else if (shape == 1) {
        // Manhattan
        dist = abs(uv.x - 0.5 * aspectRatio) + abs(uv.y - 0.5);
    } else if (shape == 2) {
        // hexagon
        dist = max(max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y), max(abs(diff.x) - diff.y * 0.5, 1.0 * diff.y));
    } else if (shape == 3) {
        // octagon
        dist = max((abs(uv.x - 0.5 * aspectRatio) + abs(uv.y - 0.5)) / sqrt(2.0), max(abs(uv.x - 0.5 * aspectRatio), abs(uv.y - 0.5)));
    } else if (shape == 4) {
        // Chebychev
        dist = max(abs(uv.x - 0.5 * aspectRatio), abs(uv.y - 0.5));
    } else if (shape == 6) {
        // Triangle
        dist = max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y);
    } else if (shape == 10) {
        // Cosine
        dist = 1.0 - length(vec2((cos(diff.x * TAU) + 1.0) * 0.5, (cos(diff.y * TAU) + 1.0) * 0.5));
    }

    float lf = map(loopScale, 1.0, 100.0, 6.0, 1.0);

    float t = 1.0;
    if (speed < 0.0) {
        t = dist * lf + time;
    } else {
        t = dist * lf - time;
    }
    return mix(dist,
               (sin(t * TAU) + 1.0 * 0.5) * abs(speed) * 0.005,
               abs(speed) * 0.01);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

    vec2 diff = 0.5 - uv;
    if (aspectLens) {
        diff = vec2(0.5 * aspectRatio, 0.5) - vec2(uv.x * aspectRatio, uv.y);
    }
    float centerDist = _distance(diff, uv);

    float distort = 0.0;
    float zoom = 1.0;
    if (distortion < 0.0) {
        distort = map(distortion, -100.0, 0.0, -2.0, 0.0);
        zoom = map(distortion, -100.0, 0.0, 0.04, 0.0);
    } else {
        distort = map(distortion, 0.0, 100.0, 0.0, 2.0);
        zoom = map(distortion, 0.0, 100.0, 0.0, -1.0);
    }


    // aberration and lensing
    vec2 lensedCoords = fract((uv - diff * zoom) - diff * centerDist * centerDist * distort);

    float aberrationOffset = map(aberration, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    float redOffset = mix(clamp(lensedCoords.x + aberrationOffset, 0.0, 1.0), lensedCoords.x, lensedCoords.x);
    vec4 red = texture(inputTex, vec2(redOffset, lensedCoords.y));

    vec4 green = texture(inputTex, lensedCoords);

    float blueOffset = mix(lensedCoords.x, clamp(lensedCoords.x - aberrationOffset, 0.0, 1.0), lensedCoords.x);
    vec4 blue = texture(inputTex, vec2(blueOffset, lensedCoords.y));

    //color = vec4(red.r, green.g, blue.b, color.a);

    // from aberration
    vec3 hsv = vec3(1.0);

    float t = modulate ? time : 0.0;

    if (mode == 0) {
        // chromatic
        color = vec4(red.r, green.g, blue.b, color.a) - green;
        color.a = green.a;

        // tweak hue of edges
        hsv = rgb2hsv(color.rgb);
        hsv[0] = fract(hsv[0] + (1.0 - (hueRotation / 360.0)) + hsv[0] * hueRange * 0.01 + t);
        hsv[1] = 1.0;

    } else {
        // prismatic
        // get edges
        color = vec4(length(vec4(red.r, green.g, blue.b, color.a) - green)) * green;
        color.a = green.a;

        // boost hue range of edges
        hsv = rgb2hsv(color.rgb);
        hsv[0] = fract(((hsv[0] + 0.125 + (1.0 - (hueRotation / 360.0))) * (2.0 + hueRange * 0.05)) + t);
        hsv[1] = 1.0;
    }

    // desaturate original
    green.rgb = saturate(green.rgb) * map(passthru, 0.0, 100.0, 0.0, 2.0);

    // recombine
    if (blendMode == 0) {
        // add
        color.rgb = min(green.rgb + hsv2rgb(hsv), 1.0);
    } else if (blendMode == 1) {
        // alpha
        color.rgb = min(max(green.rgb - vec3(hsv[2]), 0.0) + hsv2rgb(hsv), 1.0);
    }
    // end aberration

    // apply tint (this was the "reflect" mode from blendo)
    color.rgb = mix(color.rgb, (color.rgb == vec3(1.0)) ? color.rgb : min(tint * tint / (1.0 - color.rgb), vec3(1.0)), alpha * 0.01);
    color.a = max(color.a, alpha * 0.01);

	// vignette
	if (vignetteAmt < 0.0) {
		color.rgb = mix(color.rgb * 1.0 - pow(length(0.5 - uv) * 1.125, 2.0), color.rgb, map(vignetteAmt, -100.0, 0.0, 0.0, 1.0));
        color.a = max(color.a, length(0.5 - uv) * map(vignetteAmt, -100.0, 0.0, 1.0, 0.0));
	} else {
		color.rgb = mix(color.rgb, 1.0 - (1.0 - color.rgb * 1.0 - pow(length(0.5 - uv) * 1.125, 2.0)), map(vignetteAmt, 0.0, 100.0, 0.0, 1.0));
        color.a = max(color.a, length(0.5 - uv) * map(vignetteAmt, -100.0, 0.0, 1.0, 0.0));
	}

    fragColor = color;//vec4(color.rgb, 1.0); 
}
`,wgsl:`/*
 * Lens distortion shader.
 * Applies barrel, pincushion, and chromatic aberration warps using calibrated coefficients.
 * Strength controls are normalized so the warp stays invertible even under automation.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

// Uniform struct ordered to match runtime uniform packing:
// 1. globalUniforms: time, deltaTime, frame, resolution, aspect
// 2. pass.uniforms in definition globals order
struct Uniforms {
    time: f32,           // global
    deltaTime: f32,      // global
    frame: i32,          // global
    _pad0: f32,          // padding for alignment before vec2
    resolution: vec2f,   // global (8-byte aligned)
    aspect: f32,         // global
    // effect params from definition order:
    shape: i32,
    distortion: f32,
    loopScale: f32,
    speed: f32,
    aspectLens: i32,
    mode: i32,
    aberration: f32,
    blendMode: i32,
    modulate: i32,
    _pad1: f32,          // padding before vec4
    _pad2: f32,
    _pad3: f32,
    tint: vec4f,         // 16-byte aligned
    alpha: f32,
    hueRotation: f32,
    hueRange: f32,
    saturation: f32,
    passthru: f32,
    vignetteAmt: f32,
}

@group(0) @binding(2) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn mapVal(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn hsv2rgb(hsv: vec3f) -> vec3f {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
    let m = v - c;

    var rgb: vec3f;

    if (h < 1.0/6.0) {
        rgb = vec3f(c, x, 0.0);
    } else if (h < 2.0/6.0) {
        rgb = vec3f(x, c, 0.0);
    } else if (h < 3.0/6.0) {
        rgb = vec3f(0.0, c, x);
    } else if (h < 4.0/6.0) {
        rgb = vec3f(0.0, x, c);
    } else if (h < 5.0/6.0) {
        rgb = vec3f(x, 0.0, c);
    } else {
        rgb = vec3f(c, 0.0, x);
    }

    return rgb + vec3f(m, m, m);
}

fn rgb2hsv(rgb: vec3f) -> vec3f {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;
    
    let maxC = max(r, max(g, b));
    let minC = min(r, min(g, b));
    let delta = maxC - minC;

    var h: f32 = 0.0;
    if (delta != 0.0) {
        if (maxC == r) {
            h = ((g - b) / delta) % 6.0 / 6.0;
        } else if (maxC == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    if (h < 0.0) { h = h + 1.0; }
    
    var s: f32 = 0.0;
    if (maxC != 0.0) {
        s = delta / maxC;
    }
    let v = maxC;

    return vec3f(h, s, v);
}

fn saturateColor(color: vec3f) -> vec3f {
    let sat = mapVal(u.saturation, -100.0, 100.0, -1.0, 1.0);
    let avg = (color.r + color.g + color.b) / 3.0;
    return color - (avg - color) * sat;
}

fn _distance(diff: vec2f, uv: vec2f) -> f32 {
    let aspectRatio = u.resolution.x / u.resolution.y;
    let uvx = uv.x * aspectRatio;
    var dist: f32 = 1.0;

    if (u.shape == 0) {
        // Euclidean
        dist = length(diff);
    } else if (u.shape == 1) {
        // Manhattan
        dist = abs(uvx - 0.5 * aspectRatio) + abs(uv.y - 0.5);
    } else if (u.shape == 2) {
        // hexagon
        dist = max(max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y), max(abs(diff.x) - diff.y * 0.5, 1.0 * diff.y));
    } else if (u.shape == 3) {
        // octagon
        dist = max((abs(uvx - 0.5 * aspectRatio) + abs(uv.y - 0.5)) / sqrt(2.0), max(abs(uvx - 0.5 * aspectRatio), abs(uv.y - 0.5)));
    } else if (u.shape == 4) {
        // Chebychev
        dist = max(abs(uvx - 0.5 * aspectRatio), abs(uv.y - 0.5));
    } else if (u.shape == 6) {
        // Triangle
        dist = max(abs(diff.x) - diff.y * -0.5, -1.0 * diff.y);
    } else if (u.shape == 10) {
        // Cosine
        dist = 1.0 - length(vec2f((cos(diff.x * TAU) + 1.0) * 0.5, (cos(diff.y * TAU) + 1.0) * 0.5));
    }

    let lf = mapVal(u.loopScale, 1.0, 100.0, 6.0, 1.0);

    var t: f32 = 1.0;
    if (u.speed < 0.0) {
        t = dist * lf + u.time;
    } else {
        t = dist * lf - u.time;
    }
    return mix(dist,
               (sin(t * TAU) + 1.0 * 0.5) * abs(u.speed) * 0.005,
               abs(u.speed) * 0.01);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let aspectRatio = u.resolution.x / u.resolution.y;
    var uv = fragCoord.xy / u.resolution;

    var color = vec4f(0.0, 0.0, 0.0, 1.0);

    var diff = vec2f(0.5) - uv;
    if (u.aspectLens != 0) {
        diff = vec2f(0.5 * aspectRatio, 0.5) - vec2f(uv.x * aspectRatio, uv.y);
    }
    let centerDist = _distance(diff, uv);

    var distort: f32 = 0.0;
    var zoom: f32 = 1.0;
    if (u.distortion < 0.0) {
        distort = mapVal(u.distortion, -100.0, 0.0, -2.0, 0.0);
        zoom = mapVal(u.distortion, -100.0, 0.0, 0.04, 0.0);
    } else {
        distort = mapVal(u.distortion, 0.0, 100.0, 0.0, 2.0);
        zoom = mapVal(u.distortion, 0.0, 100.0, 0.0, -1.0);
    }

    // aberration and lensing
    let lensedCoords = fract((uv - diff * zoom) - diff * centerDist * centerDist * distort);

    let aberrationOffset = mapVal(u.aberration, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    let redOffset = mix(clamp(lensedCoords.x + aberrationOffset, 0.0, 1.0), lensedCoords.x, lensedCoords.x);
    let red = textureSample(inputTex, samp, vec2f(redOffset, lensedCoords.y));

    let green = textureSample(inputTex, samp, lensedCoords);

    let blueOffset = mix(lensedCoords.x, clamp(lensedCoords.x - aberrationOffset, 0.0, 1.0), lensedCoords.x);
    let blue = textureSample(inputTex, samp, vec2f(blueOffset, lensedCoords.y));

    // from aberration
    var hsv = vec3f(1.0);

    var t: f32 = 0.0;
    if (u.modulate != 0) {
        t = u.time;
    }

    if (u.mode == 0) {
        // chromatic
        color = vec4f(red.r, green.g, blue.b, color.a) - green;
        color = vec4f(color.rgb, green.a);

        // tweak hue of edges
        hsv = rgb2hsv(color.rgb);
        hsv = vec3f(fract(hsv.x + (1.0 - (u.hueRotation / 360.0)) + hsv.x * u.hueRange * 0.01 + t), 1.0, hsv.z);
    } else {
        // prismatic
        // get edges
        color = vec4f(vec3f(length(vec4f(red.r, green.g, blue.b, color.a) - green)) * green.rgb, green.a);

        // boost hue range of edges
        hsv = rgb2hsv(color.rgb);
        hsv = vec3f(fract(((hsv.x + 0.125 + (1.0 - (u.hueRotation / 360.0))) * (2.0 + u.hueRange * 0.05)) + t), 1.0, hsv.z);
    }

    // desaturate original
    var greenMod = saturateColor(green.rgb) * mapVal(u.passthru, 0.0, 100.0, 0.0, 2.0);

    // recombine
    if (u.blendMode == 0) {
        // add
        color = vec4f(min(greenMod + hsv2rgb(hsv), vec3f(1.0)), color.a);
    } else if (u.blendMode == 1) {
        // alpha
        color = vec4f(min(max(greenMod - vec3f(hsv.z), vec3f(0.0)) + hsv2rgb(hsv), vec3f(1.0)), color.a);
    }
    // end aberration

    // apply tint (this was the "reflect" mode from blendo)
    var tintResult: vec3f;
    if (all(color.rgb == vec3f(1.0))) {
        tintResult = color.rgb;
    } else {
        tintResult = min(u.tint.rgb * u.tint.rgb / (vec3f(1.0) - color.rgb), vec3f(1.0));
    }
    color = vec4f(mix(color.rgb, tintResult, u.alpha * 0.01), max(color.a, u.alpha * 0.01));

    // vignette
    if (u.vignetteAmt < 0.0) {
        let vigFactor = 1.0 - pow(length(vec2f(0.5) - uv) * 1.125, 2.0);
        color = vec4f(
            mix(color.rgb * vigFactor, color.rgb, mapVal(u.vignetteAmt, -100.0, 0.0, 0.0, 1.0)),
            max(color.a, length(vec2f(0.5) - uv) * mapVal(u.vignetteAmt, -100.0, 0.0, 1.0, 0.0))
        );
    } else {
        let vigFactor = 1.0 - pow(length(vec2f(0.5) - uv) * 1.125, 2.0);
        color = vec4f(
            mix(color.rgb, vec3f(1.0) - (vec3f(1.0) - color.rgb * vigFactor), mapVal(u.vignetteAmt, 0.0, 100.0, 0.0, 1.0)),
            max(color.a, length(vec2f(0.5) - uv) * mapVal(u.vignetteAmt, -100.0, 0.0, 1.0, 0.0))
        );
    }

    return color;
}
`}},r=`# lensDistortion

Lens distortion simulation

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/cosine/diamond/hexagon/octagon/square/triangle | Shape |
| distortion | float | 0 | -100-100 | Distortion |
| aspectLens | boolean | false | - | 1:1 aspect |
| loopScale | float | 100 | 1-100 | Loop scale |
| speed | float | 0 | -100-100 | Speed |
| mode | int | chromaticRgb | chromaticRgb/prismaticHsv | Mode |
| aberration | float | 50 | 0-100 | Aberration |
| blendMode | int | add | add/alpha | Blend |
| modulate | boolean | false | - | Modulate |
| tint | color | 0,0,0 | - | Tint |
| alpha | float | 0 | 0-100 | Tint opacity |
| hueRotation | float | 0 | 0-360 | Hue rotate |
| hueRange | float | 0 | 0-100 | Hue range |
| saturation | float | 0 | -100-100 | Saturation |
| passthru | float | 50 | 0-100 | Passthru |
| vignetteAmt | float | 0 | -100-100 | Vignette |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .lensDistortion()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[o,n]of Object.entries(a))e.shaders[o]={...n}}e&&r&&(e.help=r);var c="classicNoisedeck/lensDistortion",u="classicNoisedeck",d="lensDistortion",m=e;export{m as default,c as effectId,d as effectName,r as help,u as namespace};
