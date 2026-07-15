/* filter/flipMirror */
var n=class{constructor(r={}){this.state={},this.uniforms={},r.name&&(this.name=r.name),r.namespace&&(this.namespace=r.namespace),r.func&&(this.func=r.func),r.description&&(this.description=r.description),r.tags&&(this.tags=r.tags),r.globals&&(this.globals=r.globals),r.passes&&(this.passes=r.passes),r.textures&&(this.textures=r.textures),r.outputTex3d&&(this.outputTex3d=r.outputTex3d),r.outputGeo&&(this.outputGeo=r.outputGeo),r.uniformLayout&&(this.uniformLayout=r.uniformLayout),r.uniformLayouts&&(this.uniformLayouts=r.uniformLayouts),r.paramAliases&&(this.paramAliases=r.paramAliases),r.openCategories&&(this.openCategories=r.openCategories),r.defaultProgram&&(this.defaultProgram=r.defaultProgram),r.hidden&&(this.hidden=!0),r.deprecatedBy&&(this.deprecatedBy=r.deprecatedBy),r.onInit&&(this._configOnInit=r.onInit),r.onUpdate&&(this._configOnUpdate=r.onUpdate),r.onDestroy&&(this._configOnDestroy=r.onDestroy),r.asyncInit&&(this._configAsyncInit=r.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(r){return this._configOnUpdate?this._configOnUpdate.call(this,r):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(r){return this._configAsyncInit?this._configAsyncInit.call(this,r):Promise.resolve()}};var e=new n({name:"FlipMirror",namespace:"filter",func:"flipMirror",tags:["transform"],description:"Flip and mirror image transformations",globals:{mode:{type:"int",default:15,uniform:"flipMode",choices:{none:0,all:1,horizontal:2,vertical:3,mirrorLtoR:11,mirrorRtoL:12,mirrorUtoD:13,mirrorDtoU:14,mirrorLtoRUtoD:15,mirrorLtoRDtoU:16,mirrorRtoLUtoD:17,mirrorRtoLDtoU:18},ui:{label:"mode",control:"dropdown"}}},passes:[{name:"render",program:"flipMirror",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var t={flipMirror:{glsl:`/*
 * Flip/Mirror effect
 * Apply horizontal/vertical flipping and various mirroring modes
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int flipMode;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 globalUV = globalCoord / fullResolution;

    vec2 warpedUV = globalUV;

    if (flipMode == 1) {
        // flip both
        warpedUV.x = 1.0 - warpedUV.x;
        warpedUV.y = 1.0 - warpedUV.y;
    } else if (flipMode == 2) {
        // flip horizontal
        warpedUV.x = 1.0 - warpedUV.x;
    } else if (flipMode == 3) {
        // flip vertical
        warpedUV.y = 1.0 - warpedUV.y;
    } else if (flipMode == 11) {
        // mirror left to right
        if (warpedUV.x > 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
    } else if (flipMode == 12) {
        // mirror right to left
        if (warpedUV.x < 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
    } else if (flipMode == 13) {
        // mirror up to down
        if (warpedUV.y > 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    } else if (flipMode == 14) {
        // mirror down to up
        if (warpedUV.y < 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    } else if (flipMode == 15) {
        // mirror left to right, up to down
        if (warpedUV.x > 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
        if (warpedUV.y > 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    } else if (flipMode == 16) {
        // mirror left to right, down to up
        if (warpedUV.x > 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
        if (warpedUV.y < 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    } else if (flipMode == 17) {
        // mirror right to left, up to down
        if (warpedUV.x < 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
        if (warpedUV.y > 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    } else if (flipMode == 18) {
        // mirror right to left, down to up
        if (warpedUV.x < 0.5) {
            warpedUV.x = 1.0 - warpedUV.x;
        }
        if (warpedUV.y < 0.5) {
            warpedUV.y = 1.0 - warpedUV.y;
        }
    }

    vec2 localUV = fract((warpedUV * fullResolution - tileOffset) / vec2(texSize));
    fragColor = texture(inputTex, localUV);
}`,wgsl:`/*
 * Flip/Mirror effect
 * Apply horizontal/vertical flipping and various mirroring modes
 */

struct Uniforms {
    flipMode: i32,
    _pad1: i32,
    _pad2: i32,
    _pad3: i32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var uv = pos.xy / texSize;

    if (uniforms.flipMode == 1) {
        // flip both
        uv.x = 1.0 - uv.x;
        uv.y = 1.0 - uv.y;
    } else if (uniforms.flipMode == 2) {
        // flip horizontal
        uv.x = 1.0 - uv.x;
    } else if (uniforms.flipMode == 3) {
        // flip vertical
        uv.y = 1.0 - uv.y;
    } else if (uniforms.flipMode == 11) {
        // mirror left to right
        if (uv.x > 0.5) {
            uv.x = 1.0 - uv.x;
        }
    } else if (uniforms.flipMode == 12) {
        // mirror right to left
        if (uv.x < 0.5) {
            uv.x = 1.0 - uv.x;
        }
    } else if (uniforms.flipMode == 13) {
        // mirror up to down
        if (uv.y > 0.5) {
            uv.y = 1.0 - uv.y;
        }
    } else if (uniforms.flipMode == 14) {
        // mirror down to up
        if (uv.y < 0.5) {
            uv.y = 1.0 - uv.y;
        }
    } else if (uniforms.flipMode == 15) {
        // mirror left to right, up to down
        if (uv.x > 0.5) {
            uv.x = 1.0 - uv.x;
        }
        if (uv.y > 0.5) {
            uv.y = 1.0 - uv.y;
        }
    } else if (uniforms.flipMode == 16) {
        // mirror left to right, down to up
        if (uv.x > 0.5) {
            uv.x = 1.0 - uv.x;
        }
        if (uv.y < 0.5) {
            uv.y = 1.0 - uv.y;
        }
    } else if (uniforms.flipMode == 17) {
        // mirror right to left, up to down
        if (uv.x < 0.5) {
            uv.x = 1.0 - uv.x;
        }
        if (uv.y > 0.5) {
            uv.y = 1.0 - uv.y;
        }
    } else if (uniforms.flipMode == 18) {
        // mirror right to left, down to up
        if (uv.x < 0.5) {
            uv.x = 1.0 - uv.x;
        }
        if (uv.y < 0.5) {
            uv.y = 1.0 - uv.y;
        }
    }

    return textureSampleLevel(inputTex, inputSampler, uv, 0.0);
}
`}},o=`# flipMirror

Flip and mirror image transformations

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | mirrorLtoRUtoD | none/all/horizontal/vertical/mirrorLtoR/mirrorRtoL/mirrorUtoD/mirrorDtoU/mirrorLtoRUtoD/mirrorLtoRDtoU/mirrorRtoLUtoD/mirrorRtoLDtoU | Mode |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .flipMirror()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(t).length>0){e.shaders||(e.shaders={});for(let[i,r]of Object.entries(t))e.shaders[i]={...r}}e&&o&&(e.help=o);var l="filter/flipMirror",u="filter",d="flipMirror",m=e;export{m as default,l as effectId,d as effectName,o as help,u as namespace};
