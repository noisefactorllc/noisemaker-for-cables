/* filter/ridge */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Ridge",namespace:"filter",func:"ridge",tags:["edges"],description:"Ridge/crease enhancement",globals:{level:{type:"float",default:.5,uniform:"level",min:0,max:1,step:.01,ui:{label:"level",control:"slider"}}},passes:[{name:"main",program:"ridge",inputs:{inputTex:"inputTex"},uniforms:{level:"level"},outputs:{fragColor:"outputTex"}}]});var r={ridge:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Ridge effect.
// Parameterized ridge transform with configurable midpoint level.

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float level;

out vec4 fragColor;

vec4 ridge_transform(vec4 value, float lvl) {
    float denom = max(lvl, 1.0 - lvl);
    vec4 result = vec4(1.0) - abs(value - vec4(lvl)) / denom;
    return clamp(result, vec4(0.0), vec4(1.0));
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 dims = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(dims);

    vec4 texel = texture(inputTex, uv);

    // Apply ridge transform
    vec4 ridged = ridge_transform(texel, level);
    vec4 out_color = vec4(ridged.xyz, 1.0);

    fragColor = out_color;
}
`,wgsl:`// Ridge effect.
// Parameterized ridge transform with configurable midpoint level.

const CHANNEL_COUNT : u32 = 4u;

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> level : f32;

fn ridge_transform(value : vec4<f32>, lvl : f32) -> vec4<f32> {
    let denom : f32 = max(lvl, 1.0 - lvl);
    let result : vec4<f32> = vec4<f32>(1.0) - abs(value - vec4<f32>(lvl)) / denom;
    return clamp(result, vec4<f32>(0.0), vec4<f32>(1.0));
}

fn write_pixel(base_index : u32, color : vec4<f32>) {
    output_buffer[base_index + 0u] = color.x;
    output_buffer[base_index + 1u] = color.y;
    output_buffer[base_index + 2u] = color.z;
    output_buffer[base_index + 3u] = color.w;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    // Derive dimensions from the bound input texture to avoid relying on uniforms
    let dims : vec2<u32> = textureDimensions(inputTex, 0);
    let width : u32 = dims.x;
    let height : u32 = dims.y;
    if (gid.x >= width || gid.y >= height) {
        return;
    }

    let coords : vec2<i32> = vec2<i32>(i32(gid.x), i32(gid.y));
    let texel : vec4<f32> = textureLoad(inputTex, coords, 0);
    let pixel_index : u32 = gid.y * width + gid.x;
    let base_index : u32 = pixel_index * CHANNEL_COUNT;

    // Apply ridge transform
    let ridged : vec4<f32> = ridge_transform(texel, level);
    let out_color : vec4<f32> = vec4<f32>(ridged.xyz, 1.0);

    write_pixel(base_index, out_color);
}
`}},s=`# ridge

Ridge/crease enhancement

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| level | float | 0.5 | 0-1 | Ridge midpoint level |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .ridge()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(r))t.shaders[i]={...e}}t&&s&&(t.help=s);var d="filter/ridge",f="filter",p="ridge",c=t;export{c as default,d as effectId,p as effectName,s as help,f as namespace};
