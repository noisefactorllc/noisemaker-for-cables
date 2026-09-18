/* synth3d/heightmap3d */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Heightmap 3D",namespace:"synth3d",func:"heightmap3d",tags:["3d"],description:"Voxel heightfield from separate 2D height and color surfaces",textures:{volumeCache:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"},geoBuffer:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096},format:"rgba16f"}},globals:{heightTex:{type:"surface",default:"none",ui:{label:"height image"}},tex:{type:"surface",default:"none",ui:{label:"color image"}},volumeSize:{type:"int",default:64,uniform:"volumeSize",choices:{x16:16,x32:32,x64:64,x128:128},randChoices:[16,32,64],ui:{label:"volume size",control:"dropdown"}},heightScale:{type:"float",default:.35,min:0,max:1,uniform:"heightScale",ui:{label:"height scale",control:"slider"}},baseHeight:{type:"float",default:0,min:0,max:1,uniform:"baseHeight",ui:{label:"base height",control:"slider"}}},passes:[{name:"precompute",program:"precompute",type:"compute",drawBuffers:2,viewport:{width:{param:"volumeSize",default:64},height:{param:"volumeSize",power:2,default:4096}},inputs:{heightTex:"heightTex",tex:"tex"},outputs:{color:"volumeCache",geoOut:"geoBuffer"}}],outputTex3d:"volumeCache",outputGeo:"geoBuffer",defaultProgram:`search synth, synth3d, render

noise(scaleX: 90, scaleY: 90, colorMode: mono, speed: 0).write(o1)
gradient(type: fourCorners, color1: #006e94, color2: #24e4ff, color3: #bcff46, color4: #efffff).write(o2)
heightmap3d(heightTex: read(o1), tex: read(o2)).renderLandscape3d(panY: -0.18).write(o0)
render(o0)`});var o={precompute:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D heightTex;
uniform sampler2D tex;
uniform int volumeSize;
uniform float heightScale;
uniform float baseHeight;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

// Sample each image independently at the center of the XZ voxel column.
ivec2 imageTexel(ivec2 column, ivec2 size) {
    return clamp(((column * 2 + 1) * size) / (volumeSize * 2), ivec2(0), size - 1);
}

float columnHeight(ivec2 column) {
    vec3 rgb = texelFetch(heightTex, imageTexel(column, textureSize(heightTex, 0)), 0).rgb;
    float luminance = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    return floor(clamp(luminance * heightScale + baseHeight, 0.0, 1.0) * float(volumeSize) + 0.5);
}

float density(ivec3 p) {
    if (any(lessThan(p, ivec3(0))) || any(greaterThanEqual(p, ivec3(volumeSize)))) return 0.0;
    return float(float(p.y) < columnHeight(p.xz));
}

void main() {
    ivec2 atlas = ivec2(gl_FragCoord.xy);
    ivec3 p = ivec3(atlas.x, atlas.y % volumeSize, atlas.y / volumeSize);
    float occupied = density(p);
    fragColor = vec4(0.0);
    geoOut = vec4(0.5, 1.0, 0.5, 0.0);
    if (occupied == 0.0) return;

    vec3 color = texelFetch(tex, imageTexel(p.xz, textureSize(tex, 0)), 0).rgb;
    // Occupancy goes in both alpha channels; diffuse brightness never changes the shape.
    fragColor = vec4(color, occupied);
    vec3 normal = vec3(
        density(p - ivec3(1, 0, 0)) - density(p + ivec3(1, 0, 0)),
        density(p - ivec3(0, 1, 0)) - density(p + ivec3(0, 1, 0)),
        density(p - ivec3(0, 0, 1)) - density(p + ivec3(0, 0, 1))
    );
    normal = dot(normal, normal) > 0.0 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
    geoOut = vec4(normal * 0.5 + 0.5, occupied);
}
`,wgsl:`struct Uniforms {
    volumeSize: i32,
    heightScale: f32,
    baseHeight: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var heightTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct FragmentOutput {
    @location(0) fragColor: vec4f,
    @location(1) geoOut: vec4f,
}

// Native atlases and 2D surfaces use the same logical texel coordinates on both backends.
fn imageTexel(column: vec2i, size: vec2i) -> vec2i {
    return clamp(((column * 2 + 1) * size) / (u.volumeSize * 2), vec2i(0), size - 1);
}

fn columnHeight(column: vec2i) -> f32 {
    let rgb = textureLoad(heightTex, imageTexel(column, vec2i(textureDimensions(heightTex))), 0).rgb;
    let luminance = dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
    return floor(clamp(luminance * u.heightScale + u.baseHeight, 0.0, 1.0) * f32(u.volumeSize) + 0.5);
}

fn density(p: vec3i) -> f32 {
    if (any(p < vec3i(0)) || any(p >= vec3i(u.volumeSize))) { return 0.0; }
    return select(0.0, 1.0, f32(p.y) < columnHeight(p.xz));
}

@fragment
fn main(@builtin(position) position: vec4f) -> FragmentOutput {
    let atlas = vec2i(position.xy);
    let p = vec3i(atlas.x, atlas.y % u.volumeSize, atlas.y / u.volumeSize);
    let occupied = density(p);
    var out: FragmentOutput;
    out.fragColor = vec4f(0.0);
    out.geoOut = vec4f(0.5, 1.0, 0.5, 0.0);
    if (occupied == 0.0) { return out; }

    let color = textureLoad(tex, imageTexel(p.xz, vec2i(textureDimensions(tex))), 0).rgb;
    out.fragColor = vec4f(color, occupied);
    var normal = vec3f(
        density(p - vec3i(1, 0, 0)) - density(p + vec3i(1, 0, 0)),
        density(p - vec3i(0, 1, 0)) - density(p + vec3i(0, 1, 0)),
        density(p - vec3i(0, 0, 1)) - density(p + vec3i(0, 0, 1))
    );
    if (dot(normal, normal) > 0.0) { normal = normalize(normal); }
    else { normal = vec3f(0.0, 1.0, 0.0); }
    out.geoOut = vec4f(normal * 0.5 + 0.5, occupied);
    return out;
}
`}},a=`# heightmap3d

Bake a height map and a diffuse color image into a voxel volume: for each \`(x, z)\` column, luminance from \`heightTex\` sets how tall the column is filled, and \`tex\` supplies the RGB stored at every occupied voxel in that column. Companion generator for \`renderLandscape3d\`, which raymarches the resulting volume.

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| heightTex | surface | none | - | Height source; luminance sets column height |
| tex | surface | none | - | Color source; sampled per column and stored at every occupied voxel |
| volumeSize | int | x64 | x16/x32/x64/x128 | Voxel grid resolution along each axis |
| heightScale | float | 0.35 | 0-1 | Height-map luminance multiplier before it is quantized into voxel columns |
| baseHeight | float | 0 | 0-1 | Minimum column height added before scaling, so black pixels still fill some voxels |

Height uses Rec. 709 luminance weights (0.2126 red, 0.7152 green, 0.0722 blue) applied to \`heightTex\`'s sampled RGB. \`heightScale\` and \`baseHeight\` combine as \`clamp(luminance * heightScale + baseHeight, 0, 1) * volumeSize\` voxels tall. Chain into \`renderLandscape3d()\` to view the result; see that effect's help for camera controls.

## Usage

\`\`\`
search synth3d, filter3d, render

heightmap3d()
  .render3d()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(o))t.shaders[i]={...e}}t&&a&&(t.help=a);var c="synth3d/heightmap3d",h="synth3d",m="heightmap3d",p=t;export{p as default,c as effectId,m as effectName,a as help,h as namespace};
