/* classicNoisedeck/composite */
var n=class{constructor(o={}){this.state={},this.uniforms={},o.name&&(this.name=o.name),o.namespace&&(this.namespace=o.namespace),o.func&&(this.func=o.func),o.description&&(this.description=o.description),o.tags&&(this.tags=o.tags),o.globals&&(this.globals=o.globals),o.passes&&(this.passes=o.passes),o.textures&&(this.textures=o.textures),o.outputTex3d&&(this.outputTex3d=o.outputTex3d),o.outputGeo&&(this.outputGeo=o.outputGeo),o.uniformLayout&&(this.uniformLayout=o.uniformLayout),o.uniformLayouts&&(this.uniformLayouts=o.uniformLayouts),o.paramAliases&&(this.paramAliases=o.paramAliases),o.openCategories&&(this.openCategories=o.openCategories),o.defaultProgram&&(this.defaultProgram=o.defaultProgram),o.hidden&&(this.hidden=!0),o.deprecatedBy&&(this.deprecatedBy=o.deprecatedBy),o.onInit&&(this._configOnInit=o.onInit),o.onUpdate&&(this._configOnUpdate=o.onUpdate),o.onDestroy&&(this._configOnDestroy=o.onDestroy),o.asyncInit&&(this._configAsyncInit=o.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(o){return this._configOnUpdate?this._configOnUpdate.call(this,o):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(o){return this._configAsyncInit?this._configAsyncInit.call(this,o):Promise.resolve()}};var e=new n({name:"Composite",namespace:"classicNoisedeck",func:"composite",tags:["color"],description:"Multi-layer compositing",globals:{tex:{type:"surface",default:"none",uniform:"tex",ui:{label:"source b"}},blendMode:{type:"int",default:1,uniform:"blendMode",choices:{colorSplash:0,greenscreenAB:1,greenscreenBA:2,aBBlack:3,aBColorBlack:4,aBHue:5,aBSaturation:6,aBValue:7,bABlack:8,bAColorBlack:9,bAHue:10,bASaturation:11,bAValue:12,mix:13,psychedelic:14,psychedelic2:15},ui:{label:"blend mode",control:"dropdown"}},inputColor:{type:"color",default:[0,0,0],uniform:"inputColor",ui:{label:"target color",control:"color"}},range:{type:"float",default:20,uniform:"range",min:0,max:100,ui:{label:"range",control:"slider"}},mix:{type:"float",default:50,uniform:"mixAmt",min:0,max:100,ui:{label:"mix",control:"slider"}}},paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"composite",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{mixAmt:"mix"},outputs:{fragColor:"outputTex"}}]});var l={composite:{glsl:`#version 300 es

/*
 * Composite blend shader.
 * Implements keyed, splash, and channel-driven blends so two synth feeds can be merged under precise color controls.
 * HSV conversions and distance checks are tuned for normalized inputs to keep greenscreen thresholds consistent between GPUs.
 */

precision highp float;
precision highp int;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform vec3 inputColor;
uniform int blendMode;
uniform float range;
uniform float mixAmt;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718


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

vec3 desaturate(vec3 color) {
    vec3 c = rgb2hsv(color);
    c.g = 0.0;
    return hsv2rgb(c);
}

vec3 blend(vec3 color1, vec3 color2) {
    vec3 color = vec3(0.0);
    float cut = range * 0.01;

    if (blendMode == 0) {
        // color splash. isolate input color and desaturate others
        if (distance(inputColor, color1) > range * 0.01) {
            color1 = desaturate(color1);
        }

        if (distance(inputColor, color2) > range * 0.01) {
            color2 = desaturate(color2);
        }

        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 1) {
        // greenscreen a -> b. make color transparent
        if (distance(inputColor, color1) <= range * 0.01) {
            color = color2;
        } else {
            color = mix(color1, color2, mixAmt * 0.01);
        }

    } else if (blendMode == 2) {
        // greenscreen b-> a. make color transparent
        if (distance(inputColor, color2) <= range * 0.01) {
            color = color1;
        } else {
            color = mix(color2, color1, mixAmt * 0.01);
        }
    } else if (blendMode == 3) {
        // a -> b black
        float c = 1.0 - step(cut, desaturate(color2).r);
        color2 = mix(color1, vec3(0.0), c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 4) {
        // a -> b color black
        vec3 c = 1.0 - step(cut, color2);
        color2 = mix(color1, vec3(0.0), c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 5) {
        // a -> b hue
        float c = rgb2hsv(color2).r;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 6) {
        // a -> b saturation
        float c = rgb2hsv(color2).g;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 7) {
        // a -> b value
        float c = rgb2hsv(color2).b;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 8) {
        // b -> a black
        float c = 1.0 - step(cut, desaturate(color1).r);
        color1 = mix(color2, vec3(0.0), c);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 9) {
        // b -> a color black
        vec3 c = 1.0 - step(cut, color1);
        color1 = mix(color2, vec3(0.0), c);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 10) {
        // b -> a hue
        float c = rgb2hsv(color1).r;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 11) {
        // b -> a saturation
        float c = rgb2hsv(color1).g;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 12) {
        // b -> a value
        float c = rgb2hsv(color1).b;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 13) {
        // mix
        color2 = mix(color1, color2, cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 14) {
        // psychedelic
        vec3 c = step(cut, mix(color1, color2, 0.5));
        color2 = mix(color1, color2, c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 15) {
        // psychedelic 2
        vec3 c1 = smoothstep(color1, vec3(cut), color2);
        vec3 c2 = smoothstep(color2, vec3(cut), color1);
        color = mix(c1.brg, c2.gbr, mixAmt * 0.01);
    }

    return color;
}


void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution;

    vec4 color1 = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 color2 = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    color.rgb = blend(color1.rgb, color2.rgb);
    color.a = mix(color1.a, color2.a, mixAmt * 0.01);

    fragColor = color;
}
`,wgsl:`/*
 * Composite blend shader (WGSL fragment version).
 * Implements keyed, splash, and channel-driven blends so two synth feeds can be merged under precise color controls.
 * HSV conversions and distance checks are tuned for normalized inputs to keep greenscreen thresholds consistent between GPUs.
 */

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> inputColor : vec3<f32>;
@group(0) @binding(4) var<uniform> blendMode : i32;
@group(0) @binding(5) var<uniform> range : f32;
@group(0) @binding(6) var<uniform> mixAmt : f32;

fn hsv2rgb(hsv : vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs(((h * 6.0) % 2.0) - 1.0));
    let m = v - c;

    var rgb : vec3<f32>;

    if (h < 1.0/6.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (h < 2.0/6.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (h < 3.0/6.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (h < 4.0/6.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (h < 5.0/6.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }

    return rgb + vec3<f32>(m, m, m);
}

fn rgb2hsv(rgb : vec3<f32>) -> vec3<f32> {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;
    
    let max_val = max(r, max(g, b));
    let min_val = min(r, min(g, b));
    let delta = max_val - min_val;

    var h : f32 = 0.0;
    if (delta != 0.0) {
        if (max_val == r) {
            h = ((((g - b) / delta) % 6.0 + 6.0) % 6.0) / 6.0;
        } else if (max_val == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (max_val == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    
    var s : f32 = 0.0;
    if (max_val != 0.0) {
        s = delta / max_val;
    }
    let v = max_val;

    return vec3<f32>(h, s, v);
}

fn desaturate(color : vec3<f32>) -> vec3<f32> {
    var c = rgb2hsv(color);
    c.y = 0.0;
    return hsv2rgb(c);
}

fn blend_colors(color1_in : vec3<f32>, color2_in : vec3<f32>) -> vec3<f32> {
    var color = vec3<f32>(0.0);
    var color1 = color1_in;
    var color2 = color2_in;
    let cut = range * 0.01;

    if (blendMode == 0) {
        // color splash. isolate input color and desaturate others
        if (distance(inputColor, color1) > range * 0.01) {
            color1 = desaturate(color1);
        }

        if (distance(inputColor, color2) > range * 0.01) {
            color2 = desaturate(color2);
        }

        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 1) {
        // greenscreen a -> b. make color transparent
        if (distance(inputColor, color1) <= range * 0.01) {
            color = color2;
        } else {
            color = mix(color1, color2, mixAmt * 0.01);
        }
    } else if (blendMode == 2) {
        // greenscreen b-> a. make color transparent
        if (distance(inputColor, color2) <= range * 0.01) {
            color = color1;
        } else {
            color = mix(color2, color1, mixAmt * 0.01);
        }
    } else if (blendMode == 3) {
        // a -> b black
        let c = 1.0 - step(cut, desaturate(color2).r);
        color2 = mix(color1, vec3<f32>(0.0), c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 4) {
        // a -> b color black
        let c = 1.0 - step(vec3<f32>(cut), color2);
        color2 = mix(color1, vec3<f32>(0.0), c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 5) {
        // a -> b hue
        let c = rgb2hsv(color2).r;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 6) {
        // a -> b saturation
        let c = rgb2hsv(color2).g;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 7) {
        // a -> b value
        let c = rgb2hsv(color2).b;
        color2 = mix(color1, color2, c * cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 8) {
        // b -> a black
        let c = 1.0 - step(cut, desaturate(color1).r);
        color1 = mix(color2, vec3<f32>(0.0), c);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 9) {
        // b -> a color black
        let c = 1.0 - step(vec3<f32>(cut), color1);
        color1 = mix(color2, vec3<f32>(0.0), c);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 10) {
        // b -> a hue
        let c = rgb2hsv(color1).r;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 11) {
        // b -> a saturation
        let c = rgb2hsv(color1).g;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 12) {
        // b -> a value
        let c = rgb2hsv(color1).b;
        color1 = mix(color1, color2, c * cut);
        color = mix(color2, color1, mixAmt * 0.01);
    } else if (blendMode == 13) {
        // mix
        color2 = mix(color1, color2, cut);
        color = mix(color1, color2, mixAmt * 0.01);
    } else if (blendMode == 14) {
        // psychedelic
        let c = step(vec3<f32>(cut), mix(color1, color2, 0.5));
        color2 = mix(color1, color2, c);
        color = mix(color1, color2, mixAmt * 0.01);
    } else {
        // psychedelic 2 (blendMode == 15)
        let c1 = smoothstep(color1, vec3<f32>(cut), color2);
        let c2 = smoothstep(color2, vec3<f32>(cut), color1);
        color = mix(c1.brg, c2.gbr, mixAmt * 0.01);
    }

    return color;
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    var st = position.xy / dims;

    let color1 = textureSample(inputTex, samp, st);
    let color2 = textureSample(tex, samp, st);

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    color = vec4<f32>(blend_colors(color1.rgb, color2.rgb), mix(color1.a, color2.a, mixAmt * 0.01));

    return color;
}
`}},c=`# composite

Multi-layer compositing

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source surface B |
| blendMode | int | greenscreenAB | colorSplash/greenscreenAB/greenscreenBA/aBBlack/aBColorBlack/aBHue/aBSaturation/aBValue/bABlack/bAColorBlack/bAHue/bASaturation/bAValue/mix/psychedelic/psychedelic2 | Mode |
| inputColor | color | 0,0,0 | - | Color |
| range | float | 20 | 0-100 | Range |
| mix | float | 50 | 0-100 | Mix |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .composite(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(e&&Object.keys(l).length>0){e.shaders||(e.shaders={});for(let[r,o]of Object.entries(l))e.shaders[r]={...o}}e&&c&&(e.help=c);var m="classicNoisedeck/composite",u="classicNoisedeck",d="composite",f=e;export{f as default,m as effectId,d as effectName,c as help,u as namespace};
