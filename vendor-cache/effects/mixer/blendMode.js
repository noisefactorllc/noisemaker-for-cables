/* mixer/blendMode */
var o=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new o({name:"BlendMode",namespace:"mixer",func:"blendMode",tags:["color"],description:"Blend two inputs using selectable blend mode",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mode:{type:"int",default:0,uniform:"mode",choices:{add:0,burn:1,darken:2,diff:3,dodge:4,exclusion:5,hardLight:6,lighten:7,mix:8,multiply:9,negation:10,overlay:11,phoenix:12,screen:13,softLight:14,subtract:15},ui:{label:"mode",control:"dropdown"}},mix:{type:"float",default:0,uniform:"mixAmt",min:-100,max:100,ui:{label:"mix",control:"slider"}}},defaultProgram:`search mixer, synth

noise(ridges: true, colorMode: mono)
.write(o0)

perlin()
.blendMode(tex: read(o0), mode: phoenix)
.write(o1)`,paramAliases:{mixAmt:"mix"},passes:[{name:"render",program:"blendMode",inputs:{inputTex:"inputTex",tex:"tex"},uniforms:{mixAmt:"mix"},outputs:{fragColor:"outputTex"}}]});var t={blendMode:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mode;
uniform float mixAmt;
out vec4 fragColor;

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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
        // mix (average)
        return (color1 + color2) * 0.5;
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

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 color1 = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 color2 = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    vec4 middle = applyBlendMode(color1, color2, mode);

    float amt = map(mixAmt, -100.0, 100.0, 0.0, 1.0);
    vec4 color;
    if (amt < 0.5) {
        float factor = amt * 2.0;
        color = mix(color1, middle, factor);
    } else {
        float factor = (amt - 0.5) * 2.0;
        color = mix(middle, color2, factor);
    }

    // Porter-Duff "over" alpha compositing:
    // blend at full strength where top is opaque, preserve base where top is transparent.
    // amt is already applied above in the mixer branch that selected \`color\` on the
    // color1 <-> middle <-> color2 axis, so it must NOT be folded into the PD factor
    // here \u2014 doing so applies amt a second time and halves the blend at the midpoint.
    color.rgb = mix(color1.rgb, color.rgb, color2.a);
    // Output alpha: top + base * (1 - top), scaled by mix amount
    color.a = color2.a * amt + color1.a * (1.0 - color2.a * amt);

    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> mode : i32;
@group(0) @binding(4) var<uniform> mixAmt : f32;

fn map_range(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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
        // mix (average)
        return (color1 + color2) * 0.5;
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

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = position.xy / dims;

    let color1 = textureSample(inputTex, samp, st);
    let color2 = textureSample(tex, samp, st);

    let middle = applyBlendMode(color1, color2, mode);

    let amt = map_range(mixAmt, -100.0, 100.0, 0.0, 1.0);
    var color: vec4<f32>;
    if (amt < 0.5) {
        let factor = amt * 2.0;
        color = mix(color1, middle, factor);
    } else {
        let factor = (amt - 0.5) * 2.0;
        color = mix(middle, color2, factor);
    }

    // Porter-Duff "over" alpha compositing:
    // blend at full strength where top is opaque, preserve base where top is transparent.
    // amt is already applied above in the mixer branch that selected \`color\` on the
    // color1 <-> middle <-> color2 axis, so it must NOT be folded into the PD factor
    // for RGB here \u2014 doing so applies amt a second time and halves the blend at the
    // midpoint. The alpha output still scales with amt so fading out the layer
    // fades out the composite alpha.
    let alphaFactor = color2.a * amt;
    color = vec4<f32>(
        mix(color1.rgb, color.rgb, color2.a),
        alphaFactor + color1.a * (1.0 - alphaFactor)
    );
    return color;
}
`}},l=`# blendMode

Blend two inputs using selectable blend mode

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mode | int | add | add/burn/darken/diff/dodge/exclusion/hardLight/lighten/mix/multiply/negation/overlay/phoenix/screen/softLight/subtract | Mode |
| mix | float | 0 | -100-100 | Mix |

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .blendMode(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(e&&Object.keys(t).length>0){e.shaders||(e.shaders={});for(let[r,n]of Object.entries(t))e.shaders[r]={...n}}e&&l&&(e.help=l);var d="mixer/blendMode",u="mixer",f="blendMode",m=e;export{m as default,d as effectId,f as effectName,l as help,u as namespace};
