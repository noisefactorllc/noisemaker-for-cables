/* points/heightGrid */
var i=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new i({name:"Height Grid",namespace:"points",func:"heightGrid",tags:["agents"],description:"Arrange every particle in a landscape grid with separate height and diffuse surfaces",openCategories:["source","terrain"],textures:{},globals:{heightTex:{type:"surface",default:"inputTex",ui:{label:"height map",category:"source"}},diffuseTex:{type:"surface",default:"inputTex",ui:{label:"diffuse map",category:"source"}},gridScale:{type:"float",default:80,min:1,max:400,step:1,uniform:"gridScale",ui:{label:"grid width",control:"slider",category:"terrain"}},heightScale:{type:"float",default:20,min:-100,max:100,step:.1,uniform:"heightScale",ui:{label:"height",control:"slider",category:"terrain"}},heightOffset:{type:"float",default:0,min:-100,max:100,step:.1,uniform:"heightOffset",ui:{label:"height offset",control:"slider",category:"terrain"}}},defaultProgram:`search synth, points, render

perlin(scale: 35, colorMode: rgb)
  .write(o1)

perlin(scale: 22, octaves: 4, colorMode: mono)
  .write(o2)

solid()
  .pointsEmit(stateSize: x256)
  .heightGrid(heightTex: read(o2), diffuseTex: read(o1), heightScale: 25)
  .pointsBillboardRender(viewMode: perspective, rotateX: 0.55, posY: -12, posZ: 22, pointSize: 2, density: 100, intensity: 0, inputIntensity: 0, depositOpacity: 65, sizeDistance: 150, brightnessDistance: 180, aperture: 1.5, focalDistance: 65)
  .write(o0)

render(o0)`,passes:[{name:"agent",type:"compute",program:"agent",drawBuffers:3,inputs:{xyzTex:"global_xyz",velTex:"global_vel",heightTex:"heightTex",diffuseTex:"diffuseTex"},uniforms:{gridScale:"gridScale",heightScale:"heightScale",heightOffset:"heightOffset"},outputs:{outXYZ:"global_xyz",outVel:"global_vel",outRGBA:"global_rgba"}},{name:"passthrough",program:"passthrough",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={agent:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D xyzTex;
uniform sampler2D velTex;
uniform sampler2D heightTex;
uniform sampler2D diffuseTex;
uniform float gridScale;
uniform float heightScale;
uniform float heightOffset;

layout(location = 0) out vec4 outXYZ;
layout(location = 1) out vec4 outVel;
layout(location = 2) out vec4 outRGBA;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 stateSize = textureSize(xyzTex, 0);
    // pointsEmit allocates a square state texture: one grid vertex per slot.
    vec2 uv = (vec2(coord) + 0.5) / vec2(stateSize);
    vec3 heightColor = texture(heightTex, uv).rgb;
    float elevation = dot(heightColor, vec3(0.2126, 0.7152, 0.0722));
    // XZ ground plane, Y elevation. These are world coordinates, not UVs.
    outXYZ = vec4((uv.x - 0.5) * gridScale,
        elevation * heightScale + heightOffset,
        (uv.y - 0.5) * gridScale, 1.0);
    outVel = vec4(0.0, 0.0, 0.0, texelFetch(velTex, coord, 0).w);
    outRGBA = texture(diffuseTex, uv);
}
`,wgsl:`struct Uniforms {
    gridScale: f32,
    heightScale: f32,
    heightOffset: f32,
}
struct Outputs {
    @location(0) outXYZ: vec4f,
    @location(1) outVel: vec4f,
    @location(2) outRGBA: vec4f,
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var velTex: texture_2d<f32>;
@group(0) @binding(3) var heightTex: texture_2d<f32>;
@group(0) @binding(4) var heightSampler: sampler;
@group(0) @binding(5) var diffuseTex: texture_2d<f32>;
@group(0) @binding(6) var diffuseSampler: sampler;

// MRT state update, with the same slot identity as pointsEmit on each backend.
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> Outputs {
    let coord = vec2i(fragCoord.xy);
    let stateSize = textureDimensions(xyzTex, 0);
    let uv = (vec2f(coord) + 0.5) / vec2f(stateSize);
    // Match the surface texel coordinates to the particle slot coordinates.
    let imageUV = uv;
    let heightColor = textureSampleLevel(heightTex, heightSampler, imageUV, 0.0).rgb;
    let elevation = dot(heightColor, vec3f(0.2126, 0.7152, 0.0722));
    return Outputs(
        vec4f((uv.x - 0.5) * u.gridScale,
            elevation * u.heightScale + u.heightOffset,
            (uv.y - 0.5) * u.gridScale, 1.0),
        vec4f(0.0, 0.0, 0.0, textureLoad(velTex, coord, 0).w),
        textureSampleLevel(diffuseTex, diffuseSampler, imageUV, 0.0)
    );
}
`},passthrough:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(inputTex, uv);
}
`,wgsl:`struct Uniforms {
    resolution: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputTexSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.resolution;
    return textureSample(inputTex, inputTexSampler, uv);
}
`}},o=`# heightGrid

Arrange every slot allocated by \`pointsEmit()\` in a square XZ grid and set its Y elevation from height-map luminance. Sample the diffuse surface at the same grid coordinates for each particle's RGBA color. Both surfaces update every frame, independent of the emitter's layout and attrition. Velocities are reset to zero; per-particle seeds are retained.

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| heightTex | surface | inputTex | - | Height source; defaults to the incoming 2D surface |
| diffuseTex | surface | inputTex | - | Particle color and alpha source; defaults to the incoming 2D surface |
| gridScale | float | 80 | 1-400 | Width and depth of the square grid in world units |
| heightScale | float | 20 | -100-100 | Elevation for white; negative values invert the relief |
| heightOffset | float | 0 | -100-100 | Elevation for black in world units |

Use \`pointsBillboardRender(viewMode: perspective)\` for landscape viewing. \`pointsEmit(stateSize: x256)\` supplies a 256 by 256 grid. Surface dimensions can differ: each is sampled across its full extent. Height uses Rec. 709 luminance weights (0.2126 red, 0.7152 green, 0.0722 blue) applied to the sampled RGB channels. Diffuse RGBA is copied without conversion.

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .heightGrid()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(r))t.shaders[n]={...e}}t&&o&&(t.help=o);var f="points/heightGrid",h="points",p="heightGrid",c=t;export{c as default,f as effectId,p as effectName,o as help,h as namespace};
