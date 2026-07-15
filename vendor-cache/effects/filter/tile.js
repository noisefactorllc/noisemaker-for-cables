/* filter/tile */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Tile",namespace:"filter",func:"tile",tags:["tiling","transform"],description:"Symmetry-based kaleidoscope tiler",globals:{symmetry:{type:"int",default:0,uniform:"symmetry",choices:{mirrorXY:0,rotate2:1,rotate4:2,rotate6:3},ui:{label:"symmetry",control:"dropdown"}},scale:{type:"float",default:1,min:.1,max:4,step:.05,uniform:"scale",randChance:0,ui:{label:"scale",control:"slider"}},offsetX:{type:"float",default:0,min:-1,max:1,step:.01,randChance:0,uniform:"offsetX",ui:{label:"offset x",control:"slider"}},offsetY:{type:"float",default:0,min:-1,max:1,step:.01,randChance:0,uniform:"offsetY",ui:{label:"offset y",control:"slider"}},angle:{type:"float",default:0,min:0,max:360,step:1,randChance:0,uniform:"angle",ui:{label:"angle",control:"slider"}},repeat:{type:"float",default:2,min:1,max:10,step:1,randMax:5,uniform:"repeat",ui:{label:"repeat",control:"slider"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",randChance:0,ui:{label:"1:1 aspect",control:"checkbox"}}},passes:[{name:"main",program:"tile",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={tile:{glsl:`#version 300 es
precision highp float;

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int symmetry;
uniform float scale;
uniform float offsetX;
uniform float offsetY;
uniform float angle;
uniform float repeat;
uniform bool aspectLens;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

/*
 * Rotate a 2D point around origin by radians.
 */
vec2 rot(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

/*
 * Mirror fold: maps [0,1] so that 0 and 1 have the same value.
 */
float mirrorFold(float t) {
    return 1.0 - abs(2.0 * fract(t * 0.5) - 1.0);
}

/*
 * Hex grid: returns local coordinates relative to the nearest hex center.
 * Two overlapping rectangular grids create alternating-row hex tiling.
 */
vec2 hexCoord(vec2 uv) {
    vec2 s = vec2(1.0, 1.7320508);  // (1, sqrt(3))
    vec2 h = s * 0.5;

    vec2 a = mod(uv, s) - h;
    vec2 b = mod(uv + h, s) - h;

    return (dot(a, a) < dot(b, b)) ? a : b;
}

/*
 * Fold UV into a sector of angle 2*PI/n using polar coordinates.
 * The folded UV always lands in the first sector [0, PI/n].
 */
vec2 rotationalFold(vec2 uv, int n) {
    float fn = float(n);
    float sectorAngle = TAU / fn;

    // Center on origin
    vec2 p = uv - 0.5;

    // Convert to polar
    float a = atan(p.y, p.x);
    float r = length(p);

    // Normalize to [0, TAU] then fold into first sector
    a = mod(mod(a + TAU, TAU), sectorAngle);

    // Mirror within sector for seamless edges
    if (a > sectorAngle * 0.5) {
        a = sectorAngle - a;
    }

    // Back to cartesian, re-center
    return vec2(r * cos(a), r * sin(a)) + 0.5;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 globalUV = globalCoord / fullResolution;
    float aspect = fullResolution.x / fullResolution.y;

    // Rotate in aspect-corrected space to avoid shearing on non-square canvases
    vec2 st = globalUV - 0.5;
    if (aspectLens) { st.x *= aspect; }
    st = rot(st, angle * PI / 180.0);
    if (aspectLens) { st.x /= aspect; }
    st += 0.5;

    // Aspect-corrected repeat count: more tiles along the longer axis
    vec2 rep = aspectLens ? vec2(repeat * aspect, repeat) : vec2(repeat);

    if (symmetry == 3) {
        // Hex tiling with 6-fold rotational symmetry
        // Offset pans the entire texture (applied before hex grid computation)
        vec2 local = hexCoord((st + vec2(offsetX, offsetY)) * rep);
        local = local / scale;
        st = rotationalFold(local + 0.5, 6);
    } else {
        // Square tiling
        st = st * rep;
        st = fract(st);

        // Apply source region transforms (before fold \u2014 fold handles any input range)
        // mirrorXY needs half the range so edges match at default scale
        float effectiveScale = symmetry == 0 ? scale * 0.5 : scale;
        st = (st - 0.5) / effectiveScale;
        st += 0.5 + vec2(offsetX, offsetY);

        // Apply symmetry fold
        if (symmetry == 0) {
            // mirrorXY
            st.x = mirrorFold(st.x);
            st.y = mirrorFold(st.y);
        } else if (symmetry == 1) {
            // rotate2
            st = rotationalFold(fract(st), 2);
        } else {
            // rotate4
            st = rotationalFold(fract(st), 4);
        }
    }

    // Wrap for seamless tiling across tile boundaries
    vec2 localUV = fract(st);

    fragColor = vec4(texture(inputTex, localUV).rgb, 1.0);
}`,wgsl:`@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> resolution: vec2<f32>;
@group(0) @binding(3) var<uniform> aspect: f32;
@group(0) @binding(4) var<uniform> symmetry: i32;
@group(0) @binding(5) var<uniform> scale: f32;
@group(0) @binding(6) var<uniform> offsetX: f32;
@group(0) @binding(7) var<uniform> offsetY: f32;
@group(0) @binding(8) var<uniform> angle: f32;
@group(0) @binding(9) var<uniform> repeat: f32;
@group(0) @binding(10) var<uniform> aspectLens: i32;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn rot(p: vec2<f32>, a: f32) -> vec2<f32> {
    let c = cos(a);
    let s = sin(a);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

fn mirrorFold(t: f32) -> f32 {
    return 1.0 - abs(2.0 * fract(t * 0.5) - 1.0);
}

fn fract2(v: vec2<f32>) -> vec2<f32> {
    return v - floor(v);
}

fn mod2(v: vec2<f32>, m: vec2<f32>) -> vec2<f32> {
    return v - m * floor(v / m);
}

fn hexCoord(uv: vec2<f32>) -> vec2<f32> {
    let s = vec2<f32>(1.0, 1.7320508);
    let h = s * 0.5;

    let a = mod2(uv, s) - h;
    let b = mod2(uv + h, s) - h;

    if (dot(a, a) < dot(b, b)) {
        return a;
    } else {
        return b;
    }
}

fn rotationalFold(uv: vec2<f32>, n: i32) -> vec2<f32> {
    let fn_val = f32(n);
    let sectorAngle = TAU / fn_val;

    let p = uv - 0.5;
    var a = atan2(p.y, p.x);
    let r = length(p);

    a = ((a + TAU) % TAU) % sectorAngle;
    if (a > sectorAngle * 0.5) {
        a = sectorAngle - a;
    }

    return vec2<f32>(r * cos(a), r * sin(a)) + 0.5;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = position.xy / texSize;
    let asp = texSize.x / texSize.y;
    let doAspect = aspectLens != 0;

    // Rotate in aspect-corrected space to avoid shearing on non-square canvases
    var st = uv - 0.5;
    if (doAspect) { st.x *= asp; }
    st = rot(st, angle * PI / 180.0);
    if (doAspect) { st.x /= asp; }
    st += 0.5;

    // Aspect-corrected repeat count: more tiles along the longer axis
    let rep = select(vec2<f32>(repeat), vec2<f32>(repeat * asp, repeat), doAspect);

    if (symmetry == 3) {
        // Hex tiling with 6-fold rotational symmetry
        // Offset pans the entire texture (applied before hex grid computation)
        let local_hex = hexCoord((st + vec2<f32>(offsetX, offsetY)) * rep);
        let local_scaled = local_hex / scale;
        st = rotationalFold(local_scaled + 0.5, 6);
    } else {
        // Square tiling
        st = fract2(st * rep);

        // Apply source region transforms (before fold \u2014 fold handles any input range)
        // mirrorXY needs half the range so edges match at default scale
        var effectiveScale = scale;
        if (symmetry == 0) { effectiveScale = scale * 0.5; }
        st = (st - 0.5) / effectiveScale;
        st = st + 0.5 + vec2<f32>(offsetX, offsetY);

        // Apply symmetry fold
        if (symmetry == 0) {
            // mirrorXY
            st.x = mirrorFold(st.x);
            st.y = mirrorFold(st.y);
        } else if (symmetry == 1) {
            // rotate2
            st = rotationalFold(fract2(st), 2);
        } else {
            // rotate4
            st = rotationalFold(fract2(st), 4);
        }
    }

    // Clamp to valid texture range
    st = clamp(st, vec2<f32>(0.0), vec2<f32>(1.0));

    return vec4<f32>(textureSampleLevel(inputTex, samp, st, 0.0).rgb, 1.0);
}
`}},a=`# tile

Symmetry-based kaleidoscope tiler. Applies wallpaper-group symmetry operations to produce seamlessly tileable patterns from any input.

## Description

Selects a region of the input and folds it using mirror or rotational symmetry. The output tiles seamlessly when repeated. Inspired by Terrazzo-style pattern generation.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| symmetry | int | mirrorXY | mirrorXY/rotate2/rotate4/rotate6 | Symmetry group |
| scale | float | 1.0 | 0.1-4.0 | Scale of source sampling region |
| offset x | float | 0 | -1 to 1 | Pan source region horizontally |
| offset y | float | 0 | -1 to 1 | Pan source region vertically |
| angle | float | 0 | 0-360 | Rotate the entire tiled output |
| repeat | float | 2 | 1-10 | Number of tile repetitions to display |
| 1:1 aspect | boolean | true | on/off | Correct tiles to square aspect ratio |

## Notes

- mirrorXY reflects both axes for a four-quadrant pattern
- rotate2 applies 180\xB0 rotational symmetry
- rotate4 produces square kaleidoscope patterns
- rotate6 produces hexagonal kaleidoscope patterns
- Adjust offset and scale to explore different regions of the input
- Angle rotates the entire output grid, preserving seamlessness
- Set repeat to 1 to output just the tile unit
- When 1:1 aspect is enabled, tiles are square on non-square canvases (more tiles along the longer axis). Disable if you need the output image itself to tile seamlessly at the canvas aspect ratio.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .tile()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(o))t.shaders[r]={...e}}t&&a&&(t.help=a);var c="filter/tile",p="filter",u="tile",d=t;export{d as default,c as effectId,u as effectName,a as help,p as namespace};
