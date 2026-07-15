/* synth/media */
var f=Object.defineProperty;var c=(i,t,s)=>t in i?f(i,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):i[t]=s;var e=(i,t,s)=>c(i,typeof t!="symbol"?t+"":t,s);var o=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var n=class extends o{constructor(){super(...arguments);e(this,"name","Media");e(this,"namespace","synth");e(this,"func","media");e(this,"tags",["image","video"]);e(this,"description","Video/camera/image input");e(this,"externalTexture","imageTex");e(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},position:{slot:1,components:"x"},rotation:{slot:1,components:"y"},scaleAmt:{slot:1,components:"z"},offsetX:{slot:1,components:"w"},offsetY:{slot:2,components:"x"},tiling:{slot:2,components:"y"},flip:{slot:2,components:"z"},bgAlpha:{slot:2,components:"w"},bgColor:{slot:3,components:"xyz"},imageSize:{slot:4,components:"xy"}});e(this,"globals",{position:{type:"int",default:4,uniform:"position",choices:{topLeft:0,topCenter:1,topRight:2,midLeft:3,midCenter:4,midRight:5,bottomLeft:6,bottomCenter:7,bottomRight:8},ui:{label:"position",control:"dropdown",category:"orientation"}},tiling:{type:"int",default:0,uniform:"tiling",choices:{none:0,horizAndVert:1,horizOnly:2,vertOnly:3},ui:{label:"tiling",control:"dropdown",category:"orientation"}},flip:{type:"int",default:0,uniform:"flip",choices:{none:0,all:1,horizontal:2,vertical:3,mirrorLtoR:11,mirrorRtoL:12,mirrorUtoD:13,mirrorDtoU:14,mirrorLtoRUtoD:15,mirrorLtoRDtoU:16,mirrorRtoLUtoD:17,mirrorRtoLDtoU:18},ui:{label:"flip/mirror",control:"dropdown",category:"orientation"}},scaleAmt:{type:"float",default:100,min:25,max:400,uniform:"scaleAmt",ui:{label:"scale %",control:"slider",category:"transform"}},rotation:{type:"float",default:0,min:-180,max:180,uniform:"rotation",ui:{label:"rotate",control:"slider",category:"transform"}},offsetX:{type:"float",default:0,min:-100,max:100,uniform:"offsetX",ui:{label:"offset x",control:"slider",category:"transform"}},offsetY:{type:"float",default:0,min:-100,max:100,uniform:"offsetY",ui:{label:"offset y",control:"slider",category:"transform"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"background"}},bgAlpha:{type:"float",default:0,min:0,max:1,uniform:"bgAlpha",ui:{label:"bg opacity",control:"slider",category:"background"}},imageSize:{type:"vec2",default:[1024,1024],uniform:"imageSize",ui:{control:!1}}});e(this,"paramAliases",{backgroundColor:"bgColor",backgroundOpacity:"bgAlpha"});e(this,"passes",[{name:"main",program:"mediaInput",inputs:{imageTex:"imageTex"},outputs:{fragColor:"outputTex"}}])}onInit(){this.state.imageWidth=1,this.state.imageHeight=1}onUpdate(){return{imageSize:[this.state.imageWidth||1,this.state.imageHeight||1]}}setMediaDimensions(s,l){this.state.imageWidth=s,this.state.imageHeight=l}};var a={mediaInput:{glsl:`/*
 * Media input shader.
 * Normalizes camera or video textures and exposes crop controls while preserving aspect ratio.
 * Offset sliders are remapped prior to sampling so live adjustments never read outside the source texture.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D imageTex;
uniform vec2 imageSize;
uniform vec2 resolution;
uniform float time;
uniform int position;
uniform float rotation;
uniform float scaleAmt;
uniform float offsetX;
uniform float offsetY;
uniform int tiling;
uniform int flip;
uniform vec3 bgColor;
uniform float bgAlpha;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 rotate2D(vec2 st, float rot) {
    rot = map(rot, -180.0, 180.0, 0.5, -0.5);
    float angle = rot * TAU * -1.0;

    // Handle aspect ratio of input media
    vec2 size = imageSize;
    float aspect = size.x / size.y;
    st -= vec2(0.5 * aspect, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspect, 0.5);
    return st;
}

vec2 tile(vec2 st) {
    if (tiling == 0) {
        // no tiling
        return st;
    } else if (tiling == 1) {
        // tile both
        return fract(st);
    } else if (tiling == 2) {
        // horiz only
        return vec2(fract(st.x), st.y);
    } else if (tiling == 3) {
        // vert only
        return vec2(st.x, fract(st.y));
    }
    return st;
}

vec4 getImage(vec2 st) {
    vec2 size = imageSize;
    st = gl_FragCoord.xy / size;
    st.y = 1.0 - st.y;

    float scale = 100.0 / scaleAmt;

    if (scale == 0.0) {
        scale = 1.0;
    }
    st *= scale;

    // Position adjustments based on anchor point
    if (position == 0) {
        // top left
        st.y += (resolution.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 1) {
        // top center
        st.x -= (resolution.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += (resolution.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 2) {
        // top right
        st.x -= (resolution.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += (resolution.y / size.y * scale) - (scale - (1.0 / size.y * scale));
    } else if (position == 3) {
        // mid left
        st.y += (resolution.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 4) {
        // mid center
        st.x -= (resolution.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += (resolution.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 5) {
        // mid right
        st.x -= (resolution.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += (resolution.y / size.y * scale * 0.5) + (0.5 - (1.0 / size.y * scale)) - (scale);
    } else if (position == 6) {
        // bottom left
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    } else if (position == 7) {
        // bottom center
        st.x -= (resolution.x / size.x * scale * 0.5) - (0.5 - (1.0 / size.x * scale));
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    } else if (position == 8) {
        // bottom right
        st.x -= (resolution.x / size.x * scale) - (1.0 - (1.0 / size.x * scale));
        st.y += 1.0 - (scale - (1.0 / size.y * scale));
    }

    st.x -= map(offsetX, -100.0, 100.0, -resolution.x / size.x * scale, resolution.x / size.x * scale) * 1.5;
    st.y -= map(offsetY, -100.0, 100.0, -resolution.y / size.y * scale, resolution.y / size.y * scale) * 1.5;

    // Correct for aspect ratio before rotation
    st.x *= size.x / size.y;
    st = rotate2D(st, rotation);
    st.x /= size.x / size.y;

    st = tile(st);

    // Nudge 1px up and left to center properly
    st += 1.0 / size;

    // Flip and mirror operations
    if (flip == 1) {
       // flip both
       st.x = 1.0 - st.x;
       st.y = 1.0 - st.y;
    } else if (flip == 2) {
       // flip h
       st.x = 1.0 - st.x;
    } else if (flip == 3) {
       // flip v
       st.y = 1.0 - st.y;
    } else if (flip == 11) {
       // mirror lr
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
    } else if (flip == 12) {
       // mirror rl
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
    } else if (flip == 13) {
       // mirror ud
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 14) {
       // mirror du
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 15) {
       // mirror lr ud
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 16) {
       // mirror lr du
       if (st.x > 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 17) {
       // mirror rl ud
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y > 0.5) {
           st.y = 1.0 - st.y;
       }
    } else if (flip == 18) {
       // mirror rl du
       if (st.x < 0.5) {
           st.x = 1.0 - st.x;
       }
       if (st.y < 0.5) {
           st.y = 1.0 - st.y;
       }
    }

    vec4 text = texture(imageTex, st);

    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
        // Don't draw texture if out of coordinate bounds
        return vec4(bgColor, bgAlpha);
    }

    // Un-premultiply to compensate for linear filtering on straight-alpha textures
    // Linear filtering averages with black (0,0,0,0) transparent pixels, darkening edges
    // Dividing by alpha restores the original RGB values
    if (text.a > 0.0) {
        text.rgb = text.rgb / text.a;
    }

    return text;
}


void main() {
    vec2 st = gl_FragCoord.xy / resolution;
    st.y = 1.0 - st.y;

    fragColor = getImage(st);
}
`,wgsl:`/*
 * WGSL media input shader.
 * Mirrors the GLSL normalization and crop logic for camera feeds.
 */

struct Uniforms {
    data : array<vec4<f32>, 5>,
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var imageTex : texture_2d<f32>;

var<private> resolution : vec2<f32>;
var<private> time : f32;
var<private> posIndex : i32;
var<private> rotation : f32;
var<private> scaleAmt : f32;
var<private> offsetX : f32;
var<private> offsetY : f32;
var<private> tiling : i32;
var<private> flip : i32;
var<private> bgColor : vec3<f32>;
var<private> bgAlpha : f32;
var<private> imageSize : vec2<f32>;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

fn rotate2D(st: vec2<f32>) -> vec2<f32> {
    var st2 = st;
    let rot = map(rotation, -180.0, 180.0, 0.5, -0.5);
    let angle = rot * TAU * -1.0;

    let aspect = imageSize.x / imageSize.y;
    st2 = st2 - vec2<f32>(0.5 * aspect, 0.5);
    let c = cos(angle);
    let s = sin(angle);
    st2 = mat2x2<f32>(c, -s, s, c) * st2;
    st2 = st2 + vec2<f32>(0.5 * aspect, 0.5);
    return st2;
}

fn tile(st: vec2<f32>) -> vec2<f32> {
    if (tiling == 0) {
        return st;
    } else if (tiling == 1) {
        return fract(st);
    } else if (tiling == 2) {
        return vec2<f32>(fract(st.x), st.y);
    } else if (tiling == 3) {
        return vec2<f32>(st.x, fract(st.y));
    }
    return st;
}

fn getImage(pos: vec2<f32>) -> vec4<f32> {
    var st = pos / imageSize;
    st.y = 1.0 - st.y;

    var scale = 100.0 / scaleAmt;
    if (scale == 0.0) { scale = 1.0; }
    st = st * scale;

    if (posIndex == 0) {
        st.y = st.y + (resolution.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 1) {
        st.x = st.x - (resolution.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + (resolution.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 2) {
        st.x = st.x - (resolution.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + (resolution.y / imageSize.y * scale) - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 3) {
        st.y = st.y + (resolution.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 4) {
        st.x = st.x - (resolution.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + (resolution.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 5) {
        st.x = st.x - (resolution.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + (resolution.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale;
    } else if (posIndex == 6) {
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 7) {
        st.x = st.x - (resolution.x / imageSize.x * scale * 0.5) + (0.5 - (1.0 / imageSize.x * scale));
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    } else if (posIndex == 8) {
        st.x = st.x - (resolution.x / imageSize.x * scale) + (1.0 - (1.0 / imageSize.x * scale));
        st.y = st.y + 1.0 - (scale - (1.0 / imageSize.y * scale));
    }

    st.x = st.x - map(offsetX, -100.0, 100.0, -resolution.x / imageSize.x * scale, resolution.x / imageSize.x * scale) * 1.5;
    st.y = st.y - map(offsetY, -100.0, 100.0, -resolution.y / imageSize.y * scale, resolution.y / imageSize.y * scale) * 1.5;

    st.x = st.x * (imageSize.x / imageSize.y);
    st = rotate2D(st);
    st.x = st.x / (imageSize.x / imageSize.y);

    st = tile(st);

    st = st + 1.0 / imageSize;

    if (flip == 1) {
        st.x = 1.0 - st.x;
        st.y = 1.0 - st.y;
    } else if (flip == 2) {
        st.x = 1.0 - st.x;
    } else if (flip == 3) {
        st.y = 1.0 - st.y;
    } else if (flip == 11) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
    } else if (flip == 12) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
    } else if (flip == 13) {
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 14) {
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 15) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 16) {
        if (st.x > 0.5) { st.x = 1.0 - st.x; }
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 17) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
        if (st.y > 0.5) { st.y = 1.0 - st.y; }
    } else if (flip == 18) {
        if (st.x < 0.5) { st.x = 1.0 - st.x; }
        if (st.y < 0.5) { st.y = 1.0 - st.y; }
    }

    // Compensate for WebGPU blit Y-flip (present shader maps UV y=0 to screen bottom)
    st.y = 1.0 - st.y;

    var text = textureSample(imageTex, samp, st);

    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
        return vec4<f32>(bgColor, bgAlpha);
    }

    if (text.a > 0.0) {
        text = vec4<f32>(text.rgb / text.a, text.a);
    }

    return text;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    resolution = uniforms.data[0].xy;
    time = uniforms.data[0].z;
    posIndex = i32(uniforms.data[1].x);
    rotation = uniforms.data[1].y;
    scaleAmt = uniforms.data[1].z;
    offsetX = uniforms.data[1].w;

    offsetY = uniforms.data[2].x;
    tiling = i32(uniforms.data[2].y);
    flip = i32(uniforms.data[2].z);
    bgAlpha = uniforms.data[2].w;

    bgColor = uniforms.data[3].xyz;

    imageSize = uniforms.data[4].xy;

    // Convert from WGSL top-down to bottom-up coordinates (matching GLSL gl_FragCoord)
    let posFromBottom = vec2<f32>(pos.x, resolution.y - pos.y);

    return getImage(posFromBottom);
}
`}},r=`# media

Video/camera/image input

## Description

Displays camera or uploaded media with positioning, tiling, flip/mirror, and transform controls.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| position | int | midCenter | topLeft/topCenter/topRight/midLeft/midCenter/midRight/bottomLeft/bottomCenter/bottomRight | Position |
| tiling | int | none | none/horizAndVert/horizOnly/vertOnly | Tiling |
| flip | int | none | none/all/horizontal/vertical/mirrorLtoR/mirrorRtoL/mirrorUtoD/mirrorDtoU/mirrorLtoRUtoD/mirrorLtoRDtoU/mirrorRtoLUtoD/mirrorRtoLDtoU | Flip/mirror |
| scaleAmt | float | 100 | 25-400 | Scale % |
| rotation | float | 0 | -180-180 | Rotate |
| offsetX | float | 0 | -100-100 | Offset x |
| offsetY | float | 0 | -100-100 | Offset y |
| backgroundColor | color | 0,0,0 | - | Background color |
| backgroundOpacity | float | 0 | 0-1 | Background opacity |
| imageSize | vec2 | 1024,1024 | - | - |

## Usage

\`\`\`
search synth

media()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[i,t]of Object.entries(a))n.shaders[i]={...t}}n&&r&&(n.help=r);var d="synth/media",h="synth",z="media",v=n;export{v as default,d as effectId,z as effectName,r as help,h as namespace};
