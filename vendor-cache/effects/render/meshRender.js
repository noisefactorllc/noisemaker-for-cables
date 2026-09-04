/* render/meshRender */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Mesh Render",namespace:"render",func:"meshRender",tags:["mesh","geometry"],description:"Render meshes with Blinn-Phong lighting",textures:{},globals:{scale:{type:"float",default:1,min:.01,max:10,randMin:.1,randMax:1,uniform:"meshScale",ui:{label:"mesh scale",control:"slider",category:"mesh"}},offsetX:{type:"float",default:0,min:-5,max:5,randChance:0,uniform:"offsetX",ui:{label:"mesh offset x",control:"slider",category:"mesh"}},offsetY:{type:"float",default:0,min:-5,max:5,randChance:0,uniform:"offsetY",ui:{label:"mesh offset y",control:"slider",category:"mesh"}},offsetZ:{type:"float",default:0,min:-5,max:5,randChance:0,uniform:"offsetZ",ui:{label:"mesh offset z",control:"slider",category:"mesh"}},rotateX:{type:"float",default:0,min:-180,max:180,step:1,uniform:"rotateX",ui:{label:"rotate x",control:"slider",category:"view"}},rotateY:{type:"float",default:0,min:-180,max:180,step:1,uniform:"rotateY",ui:{label:"rotate y",control:"slider",category:"view"}},rotateZ:{type:"float",default:0,min:-180,max:180,step:1,uniform:"rotateZ",ui:{label:"rotate z",control:"slider",category:"view"}},viewScale:{type:"float",default:1,min:.1,max:10,uniform:"viewScale",ui:{label:"zoom",control:"slider",category:"view"}},posX:{type:"float",default:0,min:-10,max:10,randChance:0,uniform:"posX",ui:{label:"position x",control:"slider",category:"view"}},posY:{type:"float",default:0,min:-10,max:10,randChance:0,uniform:"posY",ui:{label:"position y",control:"slider",category:"view"}},lightDirection:{type:"vec3",default:[.5,.7,.5],uniform:"lightDirection",ui:{label:"direction",control:"vector3",category:"lighting"}},diffuseColor:{type:"color",default:[1,1,1],uniform:"diffuseColor",ui:{label:"color",control:"color",category:"diffuse"}},diffuseIntensity:{type:"float",default:.7,min:0,max:2,step:.01,uniform:"diffuseIntensity",ui:{label:"intensity",control:"slider",category:"diffuse"}},specularColor:{type:"color",default:[1,1,1],uniform:"specularColor",ui:{label:"color",control:"color",category:"specular"}},specularIntensity:{type:"float",default:.3,min:0,max:2,step:.01,uniform:"specularIntensity",ui:{label:"intensity",control:"slider",category:"specular"}},shininess:{type:"float",default:32,min:1,max:256,step:1,uniform:"shininess",ui:{label:"shininess",control:"slider",category:"specular"}},ambientColor:{type:"color",default:[.1,.1,.1],uniform:"ambientColor",ui:{label:"ambient color",control:"color",category:"ambient"}},rimIntensity:{type:"float",default:.15,min:0,max:1,step:.01,uniform:"rimIntensity",ui:{label:"rim intensity",control:"slider",category:"rim"}},rimPower:{type:"float",default:3,min:.5,max:8,step:.1,uniform:"rimPower",ui:{label:"rim power",control:"slider",category:"rim"}},meshColor:{type:"color",default:[.8,.8,.8],uniform:"meshColor",ui:{label:"base color",control:"color",category:"material"}},bgColor:{type:"color",default:[.1,.1,.15],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"material"}},bgAlpha:{type:"float",default:1,min:0,max:1,step:.01,uniform:"bgAlpha",ui:{label:"bg opacity",control:"slider",category:"material"}},wireframe:{type:"int",default:0,uniform:"wireframe",choices:{solid:0,wireframe:1},ui:{label:"render mode",control:"dropdown",category:"material"}}},passes:[{name:"clear",program:"clear",inputs:{},uniforms:{bgColor:"bgColor",bgAlpha:"bgAlpha"},outputs:{fragColor:"outputTex"}},{name:"render",program:"render",drawMode:"triangles",count:"input",blend:!1,inputs:{inputTex:"inputTex",meshPositions:"global_mesh0_positions",meshNormals:"global_mesh0_normals"},uniforms:{meshScale:"meshScale",meshOffsetX:"offsetX",meshOffsetY:"offsetY",meshOffsetZ:"offsetZ",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY",lightDirection:"lightDirection",diffuseColor:"diffuseColor",diffuseIntensity:"diffuseIntensity",specularColor:"specularColor",specularIntensity:"specularIntensity",shininess:"shininess",ambientColor:"ambientColor",rimIntensity:"rimIntensity",rimPower:"rimPower",meshColor:"meshColor",wireframe:"wireframe"},outputs:{fragColor:"outputTex"}}]});var r={clear:{glsl:`#version 300 es
precision highp float;

// Clear pass - fill with background color (premultiplied alpha)

uniform vec3 bgColor;
uniform float bgAlpha;

out vec4 fragColor;

void main() {
    fragColor = vec4(bgColor * bgAlpha, bgAlpha);
}
`,wgsl:`// Clear pass - fill with background color (premultiplied alpha)

struct Uniforms {
    bgColor: vec3<f32>,
    bgAlpha: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(u.bgColor * u.bgAlpha, u.bgAlpha);
}
`},render:{vertex:`#version 300 es
precision highp float;

// Mesh Render Vertex Shader
// Reads vertex data from mesh textures and transforms to clip space

uniform sampler2D meshPositions;
uniform sampler2D meshNormals;
uniform vec2 resolution;
uniform float aspect;

// Mesh model transform uniforms
uniform float meshScale;
uniform float meshOffsetX;
uniform float meshOffsetY;
uniform float meshOffsetZ;

// View/camera uniforms
uniform float rotateX;
uniform float rotateY;
uniform float rotateZ;
uniform float viewScale;
uniform float posX;
uniform float posY;

// Output to fragment shader
out vec3 vNormal;
out vec2 vUV;
out vec3 vPosition;

// Rotation matrices
mat3 rotationX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

mat3 rotationY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

mat3 rotationZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
        0.0, 0.0, 1.0
    );
}

void main() {
    // Get texture dimensions to compute texel coordinates
    ivec2 texSize = textureSize(meshPositions, 0);
    int texWidth = texSize.x;
    
    // Compute texel coordinate from vertex ID
    int x = gl_VertexID % texWidth;
    int y = gl_VertexID / texWidth;
    
    // Read vertex data from textures
    vec4 posData = texelFetch(meshPositions, ivec2(x, y), 0);
    vec4 normalData = texelFetch(meshNormals, ivec2(x, y), 0);
    
    vec3 position = posData.xyz;
    vec3 normal = normalData.xyz;
    
    // Apply mesh model transforms (scale then offset)
    position = position * meshScale;
    position.x += meshOffsetX;
    position.y += meshOffsetY;
    position.z += meshOffsetZ;
    
    // Build rotation matrix (uniforms are in degrees)
    float deg2rad = 3.14159265 / 180.0;
    mat3 rotation = rotationZ(rotateZ * deg2rad) * rotationY(rotateY * deg2rad) * rotationX(rotateX * deg2rad);
    
    // Transform position and normal
    vec3 rotatedPos = rotation * position;
    vec3 rotatedNormal = rotation * normal;
    
    // Apply camera translation
    rotatedPos.x += posX;
    rotatedPos.y += posY;
    
    // Simple orthographic projection with scale
    vec2 clipPos = rotatedPos.xy * viewScale;
    
    // Adjust for aspect ratio
    clipPos.x /= aspect;
    
    // Orthographic depth: map Z to NDC range [0, 1] for depth buffer
    // Assuming mesh is roughly centered, use a reasonable depth range
    // nearZ = -10, farZ = 10 gives good precision for typical meshes
    float nearZ = -10.0;
    float farZ = 10.0;
    float ndcZ = (rotatedPos.z - nearZ) / (farZ - nearZ);  // Maps to [0, 1]
    
    // Output
    gl_Position = vec4(clipPos, ndcZ, 1.0);
    vNormal = rotatedNormal;
    vUV = vec2(float(x) / float(texWidth), float(y) / float(texSize.y));
    vPosition = rotatedPos;
}
`,fragment:`#version 300 es
precision highp float;

// Mesh Render Fragment Shader
// Blinn-Phong lighting with diffuse, specular, ambient, and rim

// Lighting uniforms
uniform vec3 lightDirection;
uniform vec3 diffuseColor;
uniform float diffuseIntensity;
uniform vec3 specularColor;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 ambientColor;
uniform float rimIntensity;
uniform float rimPower;
uniform vec3 meshColor;
uniform int wireframe;

in vec3 vNormal;
in vec2 vUV;
in vec3 vPosition;

out vec4 fragColor;

void main() {
    // Normalize inputs
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightDirection);
    
    // View direction (camera looking down -Z in orthographic)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Ambient lighting
    vec3 ambient = ambientColor * meshColor;
    
    // Diffuse lighting (Lambertian)
    float diffuseFactor = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diffuseColor * diffuseFactor * meshColor * diffuseIntensity;
    
    // Specular lighting (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(halfDir, normal), 0.0);
    float specularFactor = pow(specAngle, shininess);
    vec3 specular = specularColor * specularFactor * specularIntensity;
    
    // Fresnel rim lighting
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), rimPower);
    vec3 rimLight = vec3(rim) * rimIntensity;
    
    // Combine lighting
    vec3 color = ambient + diffuse + specular + rimLight;
    
    // Wireframe mode: draw edges only
    if (wireframe == 1) {
        // Use screen-space derivatives to detect edges
        vec3 ndx = dFdx(vNormal);
        vec3 ndy = dFdy(vNormal);
        float normalEdge = length(ndx) + length(ndy);
        
        if (normalEdge < 0.1) {
            discard;  // Discard interior pixels
        }
        color = meshColor;  // Wireframe is flat colored
    }
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    fragColor = vec4(color, 1.0);
}
`,wgsl:`// Mesh Render Shader - Combined vertex and fragment
// Blinn-Phong lighting with diffuse, specular, ambient, and rim

struct Uniforms {
    resolution: vec2<f32>,
    aspect: f32,
    meshScale: f32,
    offsetX: f32,
    offsetY: f32,
    offsetZ: f32,
    rotateX: f32,
    rotateY: f32,
    rotateZ: f32,
    viewScale: f32,
    posX: f32,
    posY: f32,
    lightDirection: vec3<f32>,
    diffuseColor: vec3<f32>,
    diffuseIntensity: f32,
    specularColor: vec3<f32>,
    specularIntensity: f32,
    shininess: f32,
    ambientColor: vec3<f32>,
    rimIntensity: f32,
    rimPower: f32,
    meshColor: vec3<f32>,
    wireframe: i32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(perspective, center) normal: vec3<f32>,
    @location(1) @interpolate(perspective, center) uv: vec2<f32>,
    @location(2) @interpolate(perspective, center) worldPos: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var meshPositions: texture_2d<f32>;
@group(0) @binding(2) var meshNormals: texture_2d<f32>;

// Rotation matrices
fn rotationX(angle: f32) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat3x3<f32>(
        vec3<f32>(1.0, 0.0, 0.0),
        vec3<f32>(0.0, c, -s),
        vec3<f32>(0.0, s, c)
    );
}

fn rotationY(angle: f32) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat3x3<f32>(
        vec3<f32>(c, 0.0, s),
        vec3<f32>(0.0, 1.0, 0.0),
        vec3<f32>(-s, 0.0, c)
    );
}

fn rotationZ(angle: f32) -> mat3x3<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat3x3<f32>(
        vec3<f32>(c, -s, 0.0),
        vec3<f32>(s, c, 0.0),
        vec3<f32>(0.0, 0.0, 1.0)
    );
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;
    
    // Get texture dimensions
    let texSize = textureDimensions(meshPositions, 0);
    let texWidth = i32(texSize.x);
    
    // Compute texel coordinate from vertex ID
    let vertexID = i32(vertexIndex);
    let x = vertexID % texWidth;
    let y = vertexID / texWidth;
    
    // Read vertex data
    let posData = textureLoad(meshPositions, vec2<i32>(x, y), 0);
    let normalData = textureLoad(meshNormals, vec2<i32>(x, y), 0);
    
    var position = posData.xyz;
    let normal = normalData.xyz;
    
    // Apply mesh model transforms (scale then offset)
    position = position * u.meshScale;
    position.x = position.x + u.offsetX;
    position.y = position.y + u.offsetY;
    position.z = position.z + u.offsetZ;
    
    // Build rotation matrix (uniforms are in degrees)
    let deg2rad = 3.14159265 / 180.0;
    let rotation = rotationZ(u.rotateZ * deg2rad) * rotationY(u.rotateY * deg2rad) * rotationX(u.rotateX * deg2rad);
    
    // Transform
    var rotatedPos = rotation * position;
    let rotatedNormal = rotation * normal;
    
    // Apply camera translation
    rotatedPos.x = rotatedPos.x + u.posX;
    rotatedPos.y = rotatedPos.y + u.posY;
    
    // Orthographic projection with scale
    var clipPos = rotatedPos.xy * u.viewScale;
    clipPos.x = clipPos.x / u.aspect;
    
    // Flip Y for WebGPU
    clipPos.y = -clipPos.y;
    
    // Orthographic depth: map Z to NDC range [0, 1] for depth buffer
    // Assuming mesh is roughly centered, use a reasonable depth range
    let nearZ = -10.0;
    let farZ = 10.0;
    let ndcZ = (rotatedPos.z - nearZ) / (farZ - nearZ);  // Maps to [0, 1]
    
    out.position = vec4<f32>(clipPos, ndcZ, 1.0);
    out.normal = rotatedNormal;
    out.uv = vec2<f32>(f32(x) / f32(texWidth), f32(y) / f32(i32(texSize.y)));
    out.worldPos = rotatedPos;
    
    return out;
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Normalize inputs
    let normal = normalize(in.normal);
    let lightDir = normalize(u.lightDirection);
    
    // View direction (camera looking down -Z in orthographic)
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    
    // Ambient lighting
    let ambient = u.ambientColor * u.meshColor;
    
    // Diffuse lighting (Lambertian)
    let diffuseFactor = max(dot(normal, lightDir), 0.0);
    let diffuse = u.diffuseColor * diffuseFactor * u.meshColor * u.diffuseIntensity;
    
    // Specular lighting (Blinn-Phong)
    let halfDir = normalize(lightDir + viewDir);
    let specAngle = max(dot(halfDir, normal), 0.0);
    let specularFactor = pow(specAngle, u.shininess);
    let specular = u.specularColor * specularFactor * u.specularIntensity;
    
    // Fresnel rim lighting
    let rim = pow(1.0 - max(dot(normal, viewDir), 0.0), u.rimPower);
    let rimLight = vec3<f32>(rim) * u.rimIntensity;
    
    // Combine lighting
    var color = ambient + diffuse + specular + rimLight;
    
    // Wireframe mode (simplified - just flat color)
    if (u.wireframe == 1) {
        color = u.meshColor;
    }
    
    // Gamma correction
    color = pow(color, vec3<f32>(1.0 / 2.2));
    
    return vec4<f32>(color, 1.0);
}
`}},i=`# Mesh Render

**Note:** Mesh rendering is a proof of concept. The mesh loader currently only supports OBJ format.

Renders triangle meshes from mesh surface textures using the triangles draw mode.

## Usage

\`\`\`
meshLoader().meshRender(scale: 1.5, offsetY: -0.5).write(o0)
\`\`\`

## Parameters

### Mesh Transform
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| scale | float | 1.0 | Mesh scale factor |
| offsetX | float | 0.0 | Mesh X translation |
| offsetY | float | 0.0 | Mesh Y translation |
| offsetZ | float | 0.0 | Mesh Z translation |

### View
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| rotateX | float | 0.0 | Rotation around X axis (radians) |
| rotateY | float | 0.0 | Rotation around Y axis (radians) |
| rotateZ | float | 0.0 | Rotation around Z axis (radians) |
| viewScale | float | 1.0 | Zoom/scale factor |
| posX | float | 0.0 | Camera X position |
| posY | float | 0.0 | Camera Y position |

### Lighting
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| lightDirection | vec3 | 0.5,0.7,0.5 | Light direction |
| diffuseColor | color | [1.0, 1.0, 1.0] | Diffuse color |
| diffuseIntensity | float | 0.7 | Diffuse intensity (0.0-2.0) |
| specularColor | color | [1.0, 1.0, 1.0] | Specular color |
| specularIntensity | float | 0.3 | Specular intensity (0.0-2.0) |
| shininess | float | 32.0 | Specular exponent (1.0-256.0) |
| ambientColor | color | [0.1, 0.1, 0.1] | Ambient color |
| rimIntensity | float | 0.15 | Rim light intensity (0.0-1.0) |
| rimPower | float | 3.0 | Rim light falloff exponent (0.5-8.0) |

### Appearance
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| meshColor | color | [0.8, 0.8, 0.8] | Mesh surface color |
| bgColor | color | [0.1, 0.1, 0.15] | Background color |
| bgAlpha | float | 1.0 | Background opacity (0.0-1.0) |
| wireframe | int | solid | Render mode: solid or wireframe |

## Draw Mode

Uses \`drawMode: "triangles"\` - vertices are read from mesh textures via \`texelFetch\` 
in the vertex shader, similar to how \`drawMode: "points"\` works for particle systems.

## Pipeline Integration

Typically used after \`meshLoader()\`:

\`\`\`
// Load and render with transform
meshLoader().meshRender(scale: 0.5, rotateY: time * 0.5).write(o0)
\`\`\`

Can also be chained with filters:

\`\`\`
meshLoader().meshRender().bloom(radius: 0.02).write(o0)
\`\`\`

## Usage

\`\`\`
search synth, filter, render

noise(seed: 1, ridges: true)
  .meshRender()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&i&&(n.help=i);var m="render/meshRender",c="render",u="meshRender",d=n;export{d as default,m as effectId,u as effectName,i as help,c as namespace};
