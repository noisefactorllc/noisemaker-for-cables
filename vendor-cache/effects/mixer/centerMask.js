/* mixer/centerMask */
var o=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new o({name:"CenterMask",namespace:"mixer",func:"centerMask",tags:["blend"],description:"Blend from edges (A) into center (B) using a distance mask",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},blendMode:{type:"int",default:8,uniform:"blendMode",choices:{add:0,burn:1,darken:2,diff:3,dodge:4,exclusion:5,hardLight:6,lighten:7,mix:8,multiply:9,negation:10,overlay:11,phoenix:12,screen:13,softLight:14,subtract:15},ui:{label:"blend mode",control:"dropdown"}},shape:{type:"int",default:2,uniform:"shape",choices:{circle:0,diamond:1,square:2},ui:{label:"shape",control:"dropdown"}},hardness:{type:"float",default:0,uniform:"hardness",min:0,max:100,ui:{label:"hard edge",control:"slider"}},mix:{type:"float",default:0,uniform:"power",min:-100,max:100,randMax:-70,ui:{label:"mix",control:"slider"}}},defaultProgram:`search mixer, synth

noise(ridges: true, colorMode: mono)
.write(o0)

noise(ridges: true)
.centerMask(tex: read(o0), mix: -75)
.write(o1)`,paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"centerMask",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{shape:"shape",power:"mix"},outputs:{fragColor:"outputTex"}}]});var t={centerMask:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int shape;
uniform float power;
uniform float hardness;
uniform int blendMode;

out vec4 fragColor;

float clamp01(float x) {
    return clamp(x, 0.0, 1.0);
}

float blendOverlay(float a, float b) {
    return a < 0.5 ? (2.0 * a * b) : (1.0 - 2.0 * (1.0 - a) * (1.0 - b));
}

float blendSoftLight(float base, float blend) {
    return (blend < 0.5)
        ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend))
        : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
}

vec4 applyBlendMode(vec4 color1, vec4 color2, int m) {
    // 0: add, 1: burn, 2: darken, 3: diff, 4: dodge, 5: exclusion,
    // 6: hardLight, 7: lighten, 8: mix, 9: multiply, 10: negation,
    // 11: overlay, 12: phoenix, 13: screen, 14: softLight, 15: subtract

    if (m == 0) {
        // add
        return min(color1 + color2, vec4(1.0));
    }
    if (m == 1) {
        // burn
        return 1.0 - min((1.0 - color1) / max(color2, vec4(0.001)), vec4(1.0));
    }
    if (m == 2) {
        // darken
        return min(color1, color2);
    }
    if (m == 3) {
        // diff
        return abs(color1 - color2);
    }
    if (m == 4) {
        // dodge
        return min(color1 / max(1.0 - color2, vec4(0.001)), vec4(1.0));
    }
    if (m == 5) {
        // exclusion
        return color1 + color2 - 2.0 * color1 * color2;
    }
    if (m == 6) {
        // hardLight (overlay with swapped args)
        return vec4(
            blendOverlay(color2.r, color1.r),
            blendOverlay(color2.g, color1.g),
            blendOverlay(color2.b, color1.b),
            1.0
        );
    }
    if (m == 7) {
        // lighten
        return max(color1, color2);
    }
    if (m == 8) {
        // mix (passthrough color2)
        return color2;
    }
    if (m == 9) {
        // multiply
        return color1 * color2;
    }
    if (m == 10) {
        // negation
        return vec4(1.0) - abs(vec4(1.0) - color1 - color2);
    }
    if (m == 11) {
        // overlay
        return vec4(
            blendOverlay(color1.r, color2.r),
            blendOverlay(color1.g, color2.g),
            blendOverlay(color1.b, color2.b),
            1.0
        );
    }
    if (m == 12) {
        // phoenix
        return min(color1, color2) - max(color1, color2) + vec4(1.0);
    }
    if (m == 13) {
        // screen
        return vec4(1.0) - (vec4(1.0) - color1) * (vec4(1.0) - color2);
    }
    if (m == 14) {
        // softLight
        return vec4(
            blendSoftLight(color1.r, color2.r),
            blendSoftLight(color1.g, color2.g),
            blendSoftLight(color1.b, color2.b),
            1.0
        );
    }
    // 15: subtract
    return max(color1 - color2, vec4(0.0));
}

float distanceMetric(vec2 p, vec2 corner, int m) {
    int mm = m % 3;
    if (mm < 0) {
        mm += 3;
    }
    vec2 ap = abs(p);

    // 0: euclidean, 1: manhattan, 2: chebyshev
    if (mm == 0) {
        float d = length(ap);
        float maxD = length(corner);
        return d / maxD;
    }

    if (mm == 1) {
        float d = ap.x + ap.y;
        float maxD = corner.x + corner.y;
        return d / maxD;
    }

    float d = max(ap.x, ap.y);
    float maxD = max(corner.x, corner.y);
    return d / maxD;
}

void main() {
    vec2 st = gl_FragCoord.xy / resolution;

    vec4 edgeColor = texture(inputTex, st);
    vec4 centerColor = texture(tex, st);

    float minRes = min(fullResolution.x, fullResolution.y);

    // Centered, aspect-correct position using full image dimensions
    // so the mask center is at the image center, not tile center.
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 p = (globalCoord - 0.5 * fullResolution) / (0.5 * minRes);
    vec2 corner = fullResolution / minRes;

    float dist01 = clamp01(distanceMetric(p, corner, shape));
    // Remap power from -100..100 to 0.1..25.05 (Old 0 maps to New 100)
    float scaledPower = mix(0.1, 25.05, (power + 100.0) / 200.0);
    float mask = pow(dist01, scaledPower);

    // Apply hardness
    float h = clamp(hardness / 100.0, 0.0, 0.995);
    float width = (1.0 - h) * 0.5;
    mask = smoothstep(0.5 - width, 0.5 + width, mask);

    // Edge fading:
    // power < -95: fade to edgeColor (mask=1)
    // power > 95: fade to centerColor (mask=0)
    float f_low = clamp((power + 100.0) / 5.0, 0.0, 1.0);
    float f_high = clamp((100.0 - power) / 5.0, 0.0, 1.0);

    mask = mix(1.0, mask, f_low);
    mask = mask * f_high;

    // Apply blend mode between center and edge colors
    vec4 blended = applyBlendMode(centerColor, edgeColor, blendMode);
    vec4 color = mix(centerColor, blended, mask);
    color.a = max(edgeColor.a, centerColor.a);

    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> power : f32;
@group(0) @binding(4) var<uniform> shape : i32;
@group(0) @binding(5) var<uniform> hardness : f32;
@group(0) @binding(6) var<uniform> blendMode : i32;

fn clamp01(x: f32) -> f32 {
    return clamp(x, 0.0, 1.0);
}

fn blendOverlay(a: f32, b: f32) -> f32 {
    if (a < 0.5) {
        return 2.0 * a * b;
    } else {
        return 1.0 - 2.0 * (1.0 - a) * (1.0 - b);
    }
}

fn blendSoftLight(base: f32, blend: f32) -> f32 {
    if (blend < 0.5) {
        return 2.0 * base * blend + base * base * (1.0 - 2.0 * blend);
    } else {
        return sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend);
    }
}

fn applyBlendMode(color1: vec4<f32>, color2: vec4<f32>, m: i32) -> vec4<f32> {
    // 0: add, 1: burn, 2: darken, 3: diff, 4: dodge, 5: exclusion,
    // 6: hardLight, 7: lighten, 8: mix, 9: multiply, 10: negation,
    // 11: overlay, 12: phoenix, 13: screen, 14: softLight, 15: subtract

    if (m == 0) {
        // add
        return min(color1 + color2, vec4<f32>(1.0));
    }
    if (m == 1) {
        // burn
        return 1.0 - min((1.0 - color1) / max(color2, vec4<f32>(0.001)), vec4<f32>(1.0));
    }
    if (m == 2) {
        // darken
        return min(color1, color2);
    }
    if (m == 3) {
        // diff
        return abs(color1 - color2);
    }
    if (m == 4) {
        // dodge
        return min(color1 / max(1.0 - color2, vec4<f32>(0.001)), vec4<f32>(1.0));
    }
    if (m == 5) {
        // exclusion
        return color1 + color2 - 2.0 * color1 * color2;
    }
    if (m == 6) {
        // hardLight (overlay with swapped args)
        return vec4<f32>(
            blendOverlay(color2.r, color1.r),
            blendOverlay(color2.g, color1.g),
            blendOverlay(color2.b, color1.b),
            1.0
        );
    }
    if (m == 7) {
        // lighten
        return max(color1, color2);
    }
    if (m == 8) {
        // mix (passthrough color2)
        return color2;
    }
    if (m == 9) {
        // multiply
        return color1 * color2;
    }
    if (m == 10) {
        // negation
        return vec4<f32>(1.0) - abs(vec4<f32>(1.0) - color1 - color2);
    }
    if (m == 11) {
        // overlay
        return vec4<f32>(
            blendOverlay(color1.r, color2.r),
            blendOverlay(color1.g, color2.g),
            blendOverlay(color1.b, color2.b),
            1.0
        );
    }
    if (m == 12) {
        // phoenix
        return min(color1, color2) - max(color1, color2) + vec4<f32>(1.0);
    }
    if (m == 13) {
        // screen
        return vec4<f32>(1.0) - (vec4<f32>(1.0) - color1) * (vec4<f32>(1.0) - color2);
    }
    if (m == 14) {
        // softLight
        return vec4<f32>(
            blendSoftLight(color1.r, color2.r),
            blendSoftLight(color1.g, color2.g),
            blendSoftLight(color1.b, color2.b),
            1.0
        );
    }
    // 15: subtract
    return max(color1 - color2, vec4<f32>(0.0));
}

fn distance_metric(p: vec2<f32>, corner: vec2<f32>, m: i32) -> f32 {
    var mm = m % 3;
    if (mm < 0) {
        mm = mm + 3;
    }
    let ap = abs(p);

    // 0: euclidean, 1: manhattan, 2: chebyshev
    if (mm == 0) {
        let d = length(ap);
        let maxD = length(corner);
        return d / maxD;
    }

    if (mm == 1) {
        let d = ap.x + ap.y;
        let maxD = corner.x + corner.y;
        return d / maxD;
    }

    let d = max(ap.x, ap.y);
    let maxD = max(corner.x, corner.y);
    return d / maxD;
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = position.xy / dims;

    let edgeColor = textureSample(inputTex, samp, st);
    let centerColor = textureSample(tex, samp, st);

    let minRes = min(dims.x, dims.y);

    // Centered, aspect-correct position (matches the GLSL path)
    let p = (position.xy - 0.5 * dims) / (0.5 * minRes);
    let corner = dims / minRes;

    let dist01 = clamp01(distance_metric(p, corner, shape));
    // Remap power from -100..100 to 0.1..25.05 (Old 0 maps to New 100)
    let scaledPower = mix(0.1, 25.05, (power + 100.0) / 200.0);
    var mask = pow(dist01, scaledPower);

    // Apply hardness
    let h = clamp(hardness / 100.0, 0.0, 0.995);
    let width = (1.0 - h) * 0.5;
    mask = smoothstep(0.5 - width, 0.5 + width, mask);

    // Edge fading:
    // power < -95: fade to edgeColor (mask=1)
    // power > 95: fade to centerColor (mask=0)
    let f_low = clamp((power + 100.0) / 5.0, 0.0, 1.0);
    let f_high = clamp((100.0 - power) / 5.0, 0.0, 1.0);

    mask = mix(1.0, mask, f_low);
    mask = mask * f_high;

    // Apply blend mode between center and edge colors
    let blended = applyBlendMode(centerColor, edgeColor, blendMode);
    var color = mix(centerColor, blended, mask);
    color.a = max(edgeColor.a, centerColor.a);

    return color;
}
`}},a=`# centerMask

Blend from edges (A) into center (B) using a distance mask

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B (center) |
| blendMode | int | mix | add/burn/darken/diff/dodge/exclusion/hardLight/lighten/mix/multiply/negation/overlay/phoenix/screen/softLight/subtract | Blend mode |
| shape | int | square | circle/diamond/square | Shape |
| hardness | float | 0 | 0-100 | Edge hardness |
| mix | float | 0 | -100-100 | Mix |

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .centerMask(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(e&&Object.keys(t).length>0){e.shaders||(e.shaders={});for(let[r,n]of Object.entries(t))e.shaders[r]={...n}}e&&a&&(e.help=a);var d="mixer/centerMask",m="mixer",f="centerMask",u=e;export{u as default,d as effectId,f as effectName,a as help,m as namespace};
