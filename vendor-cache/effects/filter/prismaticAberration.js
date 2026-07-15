/* filter/prismaticAberration */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"PrismaticAberration",namespace:"filter",func:"prismaticAberration",tags:["color","lens"],description:"Prismatic aberration with hue controls",globals:{aberration:{type:"float",default:50,uniform:"aberrationAmt",min:0,max:100,ui:{label:"aberration",control:"slider"}},modulate:{type:"boolean",default:!1,uniform:"modulate",ui:{label:"modulate",control:"checkbox"}},hueRotation:{type:"float",default:0,uniform:"hueRotation",min:-180,max:180,ui:{label:"hue rotate",control:"slider"}},hueRange:{type:"float",default:0,uniform:"hueRange",min:0,max:100,ui:{label:"hue range",control:"slider"}},saturation:{type:"float",default:0,uniform:"saturation",min:-100,max:100,ui:{label:"saturation",control:"slider"}},passthru:{type:"float",default:50,uniform:"passthru",min:0,max:100,ui:{label:"passthru",control:"slider"}}},defaultProgram:`search filter, synth

noise(ridges: true, colorMode: mono)
.prismaticAberration(modulate: true)
.write(o0)`,paramAliases:{aberrationAmt:"aberration"},passes:[{name:"render",program:"prismaticAberration",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={prismaticAberration:{glsl:`#version 300 es

/*
 * Prismatic aberration effect.
 * Ported from classicNoisedeck/lensDistortion.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float aberrationAmt;
uniform float hueRotation;
uniform float hueRange;
uniform bool modulate;
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

vec3 saturate(vec3 color) {
    float sat = map(saturation, -100.0, 100.0, -1.0, 1.0);
    float avg = (color.r + color.g + color.b) / 3.0;
    color -= (avg - color) * sat;
    return color;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    float globalAspect = fullRes.x / fullRes.y;

    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

    vec2 diff = vec2(0.5 * globalAspect, 0.5) - vec2(globalUV.x * globalAspect, globalUV.y);
    float centerDist = length(diff);

    // No distortion/zoom
    vec2 lensedCoords = uv;

    float aberrationOffset = map(aberrationAmt, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    vec2 texelSize = 1.0 / vec2(textureSize(inputTex, 0));

    float redOffset = mix(clamp(lensedCoords.x + aberrationOffset, 0.0, 1.0), lensedCoords.x, lensedCoords.x);
    vec2 redUV = vec2(redOffset, lensedCoords.y);
    vec2 redLocalUV = (redUV * fullResolution - tileOffset) * texelSize;
    vec4 red = texture(inputTex, redLocalUV);

    vec2 greenLocalUV = (lensedCoords * fullResolution - tileOffset) * texelSize;
    vec4 green = texture(inputTex, greenLocalUV);

    float blueOffset = mix(lensedCoords.x, clamp(lensedCoords.x - aberrationOffset, 0.0, 1.0), lensedCoords.x);
    vec2 blueUV = vec2(blueOffset, lensedCoords.y);
    vec2 blueLocalUV = (blueUV * fullResolution - tileOffset) * texelSize;
    vec4 blue = texture(inputTex, blueLocalUV);

    // from aberration
    vec3 hsv = vec3(1.0);

    float t = modulate ? time : 0.0;

    // prismatic - get edges
    color = vec4(length(vec4(red.r, green.g, blue.b, color.a) - green)) * green;
    color.a = green.a;

    // boost hue range of edges
    hsv = rgb2hsv(color.rgb);
    hsv[0] = fract(((hsv[0] + 0.125 + (1.0 - (hueRotation / 360.0))) * (2.0 + hueRange * 0.05)) + t);
    hsv[1] = 1.0;

    // desaturate original
    green.rgb = saturate(green.rgb) * map(passthru, 0.0, 100.0, 0.0, 2.0);

    // recombine (add)
    color.rgb = min(green.rgb + hsv2rgb(hsv), 1.0);

    fragColor = color;
}`,wgsl:`/*
 * Prismatic aberration effect.
 * Ported from classicNoisedeck/lensDistortion.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    aberrationAmt: f32,
    modulate: i32,
    hueRotation: f32,
    hueRange: f32,
    saturation: f32,
    passthru: f32,
    tileOffset: vec2f,
    fullResolution: vec2f,
}

@group(0) @binding(2) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

// Floored modulo (matches GLSL mod behavior for negative values)
fn floorMod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

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
            h = floorMod((g - b) / delta, 6.0) / 6.0;
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

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let aspectRatio = u.fullResolution.x / u.fullResolution.y;
    var uv = (fragCoord.xy + u.tileOffset) / u.fullResolution;
    let texSize = vec2f(textureDimensions(inputTex, 0));

    var color = vec4f(0.0, 0.0, 0.0, 1.0);

    let diff = vec2f(0.5 * aspectRatio, 0.5) - vec2f(uv.x * aspectRatio, uv.y);
    let centerDist = length(diff);

    // No distortion/zoom
    let lensedCoords = uv;

    let aberrationOffset = mapVal(u.aberrationAmt, 0.0, 100.0, 0.0, 0.05) * centerDist * PI * 0.5;

    let redOffset = mix(clamp(lensedCoords.x + aberrationOffset, 0.0, 1.0), lensedCoords.x, lensedCoords.x);
    let red = textureSample(inputTex, samp, (vec2f(redOffset, lensedCoords.y) * u.fullResolution - u.tileOffset) / texSize);

    let green = textureSample(inputTex, samp, (lensedCoords * u.fullResolution - u.tileOffset) / texSize);

    let blueOffset = mix(lensedCoords.x, clamp(lensedCoords.x - aberrationOffset, 0.0, 1.0), lensedCoords.x);
    let blue = textureSample(inputTex, samp, (vec2f(blueOffset, lensedCoords.y) * u.fullResolution - u.tileOffset) / texSize);

    // from aberration
    var hsv = vec3f(1.0);

    var t: f32 = 0.0;
    if (u.modulate != 0) {
        t = u.time;
    }

    // prismatic - get edges
    color = vec4f(vec3f(length(vec4f(red.r, green.g, blue.b, color.a) - green)) * green.rgb, green.a);

    // boost hue range of edges
    hsv = rgb2hsv(color.rgb);
    hsv = vec3f(fract(((hsv.x + 0.125 + (1.0 - (u.hueRotation / 360.0))) * (2.0 + u.hueRange * 0.05)) + t), 1.0, hsv.z);

    // desaturate original
    var greenMod = saturateColor(green.rgb) * mapVal(u.passthru, 0.0, 100.0, 0.0, 2.0);

    // recombine (add)
    color = vec4f(min(greenMod + hsv2rgb(hsv), vec3f(1.0)), color.a);

    return color;
}
`}},a=`# prismaticAberration

Prismatic aberration with hue controls

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| aberration | float | 50 | 0-100 | Aberration |
| modulate | boolean | false | - | Modulate |
| hueRotation | float | 0 | -180-180 | Hue rotate |
| hueRange | float | 0 | 0-100 | Hue range |
| saturation | float | 0 | -100-100 | Saturation |
| passthru | float | 50 | 0-100 | Passthru |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .prismaticAberration()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&a&&(n.help=a);var u="filter/prismaticAberration",c="filter",m="prismaticAberration",d=n;export{d as default,u as effectId,m as effectName,a as help,c as namespace};
