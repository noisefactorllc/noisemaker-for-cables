/* filter/parallax */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Parallax",namespace:"filter",func:"parallax",tags:["distort"],description:"Pseudo-3D perspective shift from a height map",globals:{heightMap:{type:"surface",default:"inputTex",ui:{label:"height map",category:"general"}},direction:{type:"vec3",default:[.5,.5,1],uniform:"direction",ui:{label:"direction",control:"vector3",category:"general"}},pivot:{type:"float",default:0,uniform:"pivot",min:0,max:1,step:.01,ui:{label:"pivot",control:"slider",category:"general"}}},defaultProgram:`search filter, synth

noise(ridges: true)
.parallax()
.write(o0)`,passes:[{name:"render",program:"parallax",inputs:{inputTex:"inputTex",heightMap:"heightMap"},outputs:{fragColor:"outputTex"}}]});var r={parallax:{glsl:`/*
 * Pseudo-3D perspective shift driven by a height map
 * Ray-marched parallax occlusion mapping with a configurable pivot height
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D heightMap;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform vec3 direction;
uniform float pivot;

out vec4 fragColor;

const int MARCH_STEPS = 32;
const float SHIFT_SCALE = 0.15;

// Convert RGB to luminosity
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

float getHeight(vec2 uv) {
    vec2 mapSize = vec2(textureSize(heightMap, 0));
    vec2 localUV = (uv * fullResolution - tileOffset) / mapSize;
    return getLuminosity(textureLod(heightMap, localUV, 0.0).rgb);
}

vec4 getInput(vec2 uv) {
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 localUV = (uv * fullResolution - tileOffset) / texSize;
    return textureLod(inputTex, localUV, 0.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec3 v = length(direction) > 0.0 ? normalize(direction) : vec3(0.0, 0.0, 1.0);
    vec2 shift = v.xy * SHIFT_SCALE;

    // Tile rendering: clamp the ray-march shift to the tile overlap budget
    // (absolute pixels in fullResolution space) so displaced samples never
    // leave the tile's rendered region. No-op when tileOffset is zero.
    bool isTileRendering = length(tileOffset) > 0.0;
    if (isTileRendering) {
        float maxDispPixels = 256.0;
        float dispPixels = length(shift * fullResolution);
        if (dispPixels > maxDispPixels) {
            shift *= maxDispPixels / dispPixels;
        }
    }

    // View ray crosses this fragment's UV at height == pivot
    float t = 1.0;
    vec2 rayUV = uv + shift * (1.0 - pivot);
    float f = t - getHeight(rayUV);

    if (f > 0.0) {
        float stepSize = 1.0 / float(MARCH_STEPS);
        for (int i = 1; i <= MARCH_STEPS; i++) {
            float prevF = f;
            vec2 prevUV = rayUV;
            t = 1.0 - float(i) * stepSize;
            rayUV = uv + shift * (t - pivot);
            f = t - getHeight(rayUV);
            if (f <= 0.0) {
                // Refine: interpolate between the straddling samples
                float w = f / (f - prevF);
                rayUV = mix(rayUV, prevUV, w);
                break;
            }
        }
    }

    fragColor = getInput(rayUV);
}
`,wgsl:`/*
 * Pseudo-3D perspective shift driven by a height map
 * Ray-marched parallax occlusion mapping with a configurable pivot height
 */

struct Uniforms {
    direction: vec3f,
    pivot: f32,
    // No renderScale: the GLSL sibling declares none (parallax has no
    // pixel-fixed-size elements), and the tails must stay matched.
    tileOffset: vec2f,
    fullResolution: vec2f,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var heightMap: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

const MARCH_STEPS: i32 = 32;
const SHIFT_SCALE: f32 = 0.15;

// Convert RGB to luminosity
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

fn getHeight(uv: vec2f) -> f32 {
    let mapSize = vec2<f32>(textureDimensions(heightMap));
    let localUV = (uv * uniforms.fullResolution - uniforms.tileOffset) / mapSize;
    return getLuminosity(textureSampleLevel(heightMap, inputSampler, localUV, 0.0).rgb);
}

fn getInput(uv: vec2f) -> vec4f {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let localUV = (uv * uniforms.fullResolution - uniforms.tileOffset) / texSize;
    return textureSampleLevel(inputTex, inputSampler, localUV, 0.0);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let globalCoord = pos.xy + uniforms.tileOffset;
    let uv = globalCoord / uniforms.fullResolution;

    var v = vec3f(0.0, 0.0, 1.0);
    if (length(uniforms.direction) > 0.0) {
        v = normalize(uniforms.direction);
    }
    var shift = v.xy * SHIFT_SCALE;

    // Tile rendering: clamp the ray-march shift to the tile overlap budget
    // (absolute pixels in fullResolution space) so displaced samples never
    // leave the tile's rendered region. No-op when tileOffset is zero.
    let isTileRendering = length(uniforms.tileOffset) > 0.0;
    if (isTileRendering) {
        let maxDispPixels: f32 = 256.0;
        let dispPixels = length(shift * uniforms.fullResolution);
        if (dispPixels > maxDispPixels) {
            shift = shift * (maxDispPixels / dispPixels);
        }
    }

    // View ray crosses this fragment's UV at height == pivot
    var t: f32 = 1.0;
    var rayUV = uv + shift * (1.0 - uniforms.pivot);
    var f = t - getHeight(rayUV);

    if (f > 0.0) {
        let stepSize = 1.0 / f32(MARCH_STEPS);
        for (var i: i32 = 1; i <= MARCH_STEPS; i = i + 1) {
            let prevF = f;
            let prevUV = rayUV;
            t = 1.0 - f32(i) * stepSize;
            rayUV = uv + shift * (t - uniforms.pivot);
            f = t - getHeight(rayUV);
            if (f <= 0.0) {
                // Refine: interpolate between the straddling samples
                let w = f / (f - prevF);
                rayUV = mix(rayUV, prevUV, vec2f(w));
                break;
            }
        }
    }

    return getInput(rayUV);
}
`}},a=`# parallax

Pseudo-3D perspective shift from a height map

## Description

Re-projects the input as if the height map extruded it into relief viewed from an angle:
1. **Height**: The height map's luminosity gives each pixel a height from 0 to 1
2. **Ray march**: For every output pixel, a view ray angled by **direction** is marched through the height field until it hits the surface (parallax occlusion mapping)
3. **Output**: The input texture sampled where the ray landed - tall features lean away from the viewer and cover what is behind them

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| heightMap | surface | inputTex | - | Height map |
| direction | vec3 | 0.5,0.5,1 | - | Direction |
| pivot | float | 0 | 0-1 | Pivot |

## Notes

- **direction** is the viewer angle: straight down (0,0,1) means no shift, glancing angles maximize it
- **pivot** picks the height plane that stays anchored: 0 locks the ground and features rise out of it, 1 locks the peaks and valleys sink inward
- With the default **heightMap** the input acts as its own height map (bright = tall)

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .parallax()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(r))t.shaders[i]={...e}}t&&a&&(t.help=a);var p="filter/parallax",u="filter",h="parallax",c=t;export{c as default,p as effectId,h as effectName,a as help,u as namespace};
