/* mixer/split */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Split",namespace:"mixer",func:"split",tags:["blend"],description:"Split/wipe between two inputs",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},invert:{type:"int",default:0,uniform:"invert",choices:{off:0,on:1},ui:{label:"swap a/b",control:"dropdown"}},position:{type:"float",default:0,uniform:"position",min:-1,max:1,ui:{label:"position",control:"slider",enabledBy:{param:"speed",eq:0}}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotation",control:"slider"}},softness:{type:"float",default:0,uniform:"softness",min:0,max:1,zero:0,ui:{label:"softness",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:0,max:4,zero:0,randMax:2,ui:{label:"speed",control:"slider"}}},defaultProgram:`search mixer, synth

noise(ridges: true, colorMode: mono)
.write(o0)

noise(seed: 2, ridges: true)
.split(tex: read(o0), softness: 1)
.write(o1)`,passes:[{name:"render",program:"split",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var s={split:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float position;
uniform float rotation;
uniform float softness;
uniform int invert;
uniform float speed;
uniform float time;

out vec4 fragColor;

#define PI 3.14159265359

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 colorA = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    vec4 colorB = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0)));

    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    float aspect = fullRes.x / fullRes.y;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec2 centered = (globalUV - 0.5) * 2.0;
    centered.x *= aspect;

    // Rotate the split line
    float rad = rotation * PI / 180.0;
    float c = cos(rad);
    float s = sin(rad);
    vec2 rotated = vec2(centered.x * c - centered.y * s,
                        centered.x * s + centered.y * c);

    // Compute visible extent of rotated.y for seamless scrolling
    // The projected range depends on aspect ratio and rotation angle
    float extent = aspect * abs(s) + abs(c) + softness;

    // Animate: continuous scroll across full visible range
    // Alternates sweep direction each cycle so the wrap point is seamless
    float animPos = position;
    bool flipCycle = false;
    if (speed > 0.0) {
        float cycle = time * speed * 2.0;
        float t = fract(cycle);
        flipCycle = mod(floor(cycle), 2.0) == 1.0;
        animPos = t * extent * 2.0 - extent;
    }

    // Signed distance from the split line
    float d = rotated.y - animPos;

    // Apply softness
    float halfSoft = max(softness * 0.5, 0.001);
    float mask = smoothstep(-halfSoft, halfSoft, d);

    if ((invert == 1) != flipCycle) {
        mask = 1.0 - mask;
    }

    vec4 color = mix(colorA, colorB, mask);
    color.a = max(colorA.a, colorB.a);

    fragColor = color;
}
`,wgsl:`@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var tex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> position : f32;
@group(0) @binding(4) var<uniform> rotation : f32;
@group(0) @binding(5) var<uniform> softness : f32;
@group(0) @binding(6) var<uniform> invert : i32;
@group(0) @binding(7) var<uniform> speed : f32;
@group(0) @binding(8) var<uniform> time : f32;
@group(0) @binding(9) var<uniform> tileOffset : vec2<f32>;
@group(0) @binding(10) var<uniform> fullResolution : vec2<f32>;

const PI: f32 = 3.14159265359;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let st = pos.xy / dims;

    let colorA = textureSample(inputTex, samp, st);
    let colorB = textureSample(tex, samp, st);

    let globalUV = (pos.xy + tileOffset) / fullResolution;
    let aspect = fullResolution.x / fullResolution.y;
    var centered = (globalUV - vec2<f32>(0.5, 0.5)) * 2.0;
    centered.x = centered.x * aspect;

    // Rotate the split line
    let rad = rotation * PI / 180.0;
    let c = cos(rad);
    let s = sin(rad);
    let rotated = vec2<f32>(centered.x * c - centered.y * s,
                            centered.x * s + centered.y * c);

    // Compute visible extent of rotated.y for seamless scrolling
    // The projected range depends on aspect ratio and rotation angle
    let extent = aspect * abs(s) + abs(c) + softness;

    // Animate: continuous scroll across full visible range
    // Alternates sweep direction each cycle so the wrap point is seamless
    var animPos = position;
    var flipCycle = false;
    if (speed > 0.0) {
        let cycle = time * speed * 2.0;
        let t = fract(cycle);
        flipCycle = i32(floor(cycle)) % 2 == 1;
        animPos = t * extent * 2.0 - extent;
    }

    // Signed distance from the split line
    let d = rotated.y - animPos;

    // Apply softness
    let halfSoft = max(softness * 0.5, 0.001);
    var mask = smoothstep(-halfSoft, halfSoft, d);

    if ((invert == 1) != flipCycle) {
        mask = 1.0 - mask;
    }

    var color = mix(colorA, colorB, mask);
    color.a = max(colorA.a, colorB.a);

    return color;
}
`}},i=`# split

Split/wipe between two inputs

## Description

Divides the frame along a straight line, showing source A on one side and source B on the other. The line can be rotated to any angle and offset to any position. Use softness to feather the edge.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| position | float | 0 | -1-1 | Offset of the split line from center |
| rotation | float | 0 | -180-180 | Angle of the split line in degrees |
| softness | float | 0 | 0-1 | Edge feathering (0 = hard edge) |
| invert | int | off | off/on | Swap which side shows which source |
| speed | int | 0 | 0-4 | Animation speed

## Notes

- **rotation at 0**: Horizontal split (top/bottom)
- **rotation at 90**: Vertical split (left/right)
- **rotation at 45**: Diagonal split
- **position**: Slides the split line along its perpendicular axis
- **softness at 0**: Pixel-perfect hard edge between sources
- **softness increased**: Smooth gradient transition at the boundary
- Animate for wipe transitions between sources

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .split(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(s))t.shaders[o]={...e}}t&&i&&(t.help=i);var p="mixer/split",u="mixer",c="split",d=t;export{d as default,p as effectId,c as effectName,i as help,u as namespace};
