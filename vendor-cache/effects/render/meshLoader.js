/* render/meshLoader */
var l=Object.defineProperty;var u=(n,e,o)=>e in n?l(n,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):n[e]=o;var s=(n,e,o)=>u(n,typeof e!="symbol"?e+"":e,o);var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex&&(this.outputTex=e.outputTex),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.outputXyz&&(this.outputXyz=e.outputXyz),e.outputVel&&(this.outputVel=e.outputVel),e.outputRgba&&(this.outputRgba=e.outputRgba),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=class extends r{constructor(){super(...arguments);s(this,"name","Mesh Loader");s(this,"namespace","render");s(this,"func","meshLoader");s(this,"tags",["mesh","geometry","3d"]);s(this,"description","Load mesh data from OBJ files into GPU textures.");s(this,"externalMesh","mesh0");s(this,"builtinMeshes",{sphere:"share/meshes/sphere.obj",cube:"share/meshes/cube.obj",torus:"share/meshes/torus.obj",cylinder:"share/meshes/cylinder.obj",cone:"share/meshes/cone.obj",capsule:"share/meshes/capsule.obj",icosphere:"share/meshes/icosphere.obj"});s(this,"textures",{});s(this,"globals",{});s(this,"defaultProgram",`search render

meshLoader()
.meshRender()
.write(o0)`);s(this,"passes",[{name:"preview",program:"preview",inputs:{positionsTex:"global_mesh0_positions",normalsTex:"global_mesh0_normals"},outputs:{fragColor:"outputTex"}}])}};var a={preview:{glsl:`#version 300 es
precision highp float;

// Preview mesh data as a visualization
// Renders positions/normals as colors for debugging

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D positionsTex;
uniform sampler2D normalsTex;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    // Global UV for image-space layout decisions (left/right half split)
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    // Tile-local UV for sampling the mesh textures
    vec2 uv = globalCoord / fullResolution;

    // Sample mesh data using texture() for proper UV sampling
    // The mesh textures are smaller than output, so use UV coordinates
    vec4 pos = texture(positionsTex, gl_FragCoord.xy / vec2(textureSize(positionsTex, 0)));
    vec4 normal = texture(normalsTex, gl_FragCoord.xy / vec2(textureSize(normalsTex, 0)));

    // Visualize: left half shows positions, right half shows normals
    vec3 color;
    if (globalUV.x < 0.5) {
        // Position visualization: map -1..1 to 0..1
        color = pos.xyz * 0.5 + 0.5;
    } else {
        // Normal visualization: map -1..1 to 0..1
        color = normal.xyz * 0.5 + 0.5;
    }
    
    // Check if this is a valid vertex (w > 0 in position means valid vertex ID)
    float alpha = 1.0;
    
    fragColor = vec4(color, alpha);
}
`,wgsl:`// Preview mesh data as visualization

struct Uniforms {
    resolution: vec2<f32>,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var positionsTex: texture_2d<f32>;
@group(0) @binding(2) var positionsSampler: sampler;
@group(0) @binding(3) var normalsTex: texture_2d<f32>;
@group(0) @binding(4) var normalsSampler: sampler;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let fullRes = select(u.resolution, u.fullResolution, u.fullResolution.x > 0.0);
    let globalUV = (position.xy + u.tileOffset) / fullRes;
    let positionsUV = position.xy / vec2<f32>(textureDimensions(positionsTex));
    let normalsUV = position.xy / vec2<f32>(textureDimensions(normalsTex));
    
    // Match WebGL2's preview sampling: address the packed mesh textures by
    // their own dimensions rather than scaling them across the output frame.
    let pos = textureSample(positionsTex, positionsSampler, positionsUV);
    let normal = textureSample(normalsTex, normalsSampler, normalsUV);
    
    var color: vec3<f32>;
    if (globalUV.x < 0.5) {
        // Position visualization
        color = pos.xyz * 0.5 + 0.5;
    } else {
        // Normal visualization
        color = normal.xyz * 0.5 + 0.5;
    }
    
    return vec4<f32>(color, 1.0);
}
`}},i=`# Mesh Loader

An optional marker and preview stage for mesh rendering. It marks the pipeline as one that uses the \`mesh0\` mesh, and it shows a preview of that mesh data. The mesh data itself comes from the host, which uploads it into the mesh surface textures. Includes built-in procedural shapes and supports custom OBJ file upload in the demo UI.

## Usage

\`\`\`
meshLoader().meshRender().write(o0)
\`\`\`

The demo UI shows a shape dropdown and file picker when meshLoader is in the pipeline, and it uploads the selected mesh to \`mesh0\`.

## Role in the Pipeline

\`meshRender()\` draws the mesh from the mesh surface textures. It does not read the output of meshLoader. So meshLoader is optional when the host uploads the mesh with the JavaScript API below, and a chain without it renders the same mesh.

## Preview Output

The output of meshLoader shows the loaded mesh data as colors: vertex positions in the left half and normals in the right half. This output is a preview, and it is visible only when meshLoader is the last stage, for example \`meshLoader().write(o0)\`.

## Built-in Shapes

| Shape | Description |
|-------|-------------|
| cube | 8 vertices, 12 triangles |
| sphere | UV sphere (32x16 segments) |
| torus | Ring torus (32x16 segments) |
| cylinder | Capped cylinder (32 segments) |
| cone | Capped cone (32 segments) |
| capsule | Cylinder with hemisphere caps (32x8 segments) |
| icosphere | Subdivided icosahedron (2 levels) |

## Parameters

Mesh transforms (scale, offset) are applied in \`meshRender()\`, not here.

## OBJ Format Support

The OBJ parser supports:
- Vertices (\`v x y z\`)
- Texture coordinates (\`vt u v\`)
- Normals (\`vn x y z\`)
- Faces (\`f v/vt/vn ...\`) with vertex/uv/normal indices
- Triangulation of quads and n-gons

## JavaScript API

\`\`\`javascript
// Load from URL
await canvas.loadOBJFromURL('/models/teapot.obj', 'mesh0');

// Load from string
await canvas.loadOBJFromString(objContent, 'mesh0');
\`\`\`

## Usage

\`\`\`
search synth, filter, render

meshLoader()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(a))t.shaders[n]={...e}}t&&i&&(t.help=i);var x="render/meshLoader",v="render",y="meshLoader",b=t;export{b as default,x as effectId,y as effectName,i as help,v as namespace};
