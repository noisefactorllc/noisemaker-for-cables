/* filter/flipMirror */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var r=new n({name:"FlipMirror",namespace:"filter",func:"flipMirror",tags:["transform"],description:"Flip and mirror image transformations",globals:{mode:{type:"int",default:15,uniform:"flipMode",choices:{none:0,all:1,horizontal:2,vertical:3,mirrorLtoR:11,mirrorRtoL:12,mirrorUtoD:13,mirrorDtoU:14,mirrorLtoRUtoD:15,mirrorLtoRDtoU:16,mirrorRtoLUtoD:17,mirrorRtoLDtoU:18},ui:{label:"mode",control:"dropdown"}}},passes:[{name:"render",program:"flipMirror",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var t={flipMirror:{glsl:`/*
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
`;if(r&&Object.keys(t).length>0){r.shaders||(r.shaders={});for(let[i,e]of Object.entries(t))r.shaders[i]={...e}}r&&o&&(r.help=o);var l="filter/flipMirror",u="filter",d="flipMirror",m=r;export{m as default,l as effectId,d as effectName,o as help,u as namespace};
