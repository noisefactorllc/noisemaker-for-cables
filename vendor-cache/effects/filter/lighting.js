/* filter/lighting */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Lighting",namespace:"filter",func:"lighting",tags:["color"],description:"Applies 3D lighting effects",globals:{normalStrength:{type:"float",default:1.5,uniform:"normalStrength",min:0,max:5,step:.01,ui:{label:"depth",control:"slider",category:"general"}},smoothing:{type:"float",default:1,uniform:"smoothing",min:1,max:10,step:.1,randMax:5,ui:{label:"smoothing",control:"slider",category:"general"}},diffuseColor:{type:"color",default:[1,1,1],uniform:"diffuseColor",ui:{label:"color",control:"color",category:"diffuse"}},specularColor:{type:"color",default:[1,1,1],uniform:"specularColor",ui:{label:"color",control:"color",category:"specular"}},specularIntensity:{type:"float",default:.5,uniform:"specularIntensity",min:0,max:2,step:.01,randMax:1,ui:{label:"intensity",control:"slider",category:"specular"}},shininess:{type:"float",default:64,uniform:"shininess",min:8,max:256,step:1,ui:{label:"shininess",control:"slider",category:"specular"}},ambientColor:{type:"color",default:[.2,.2,.2],uniform:"ambientColor",ui:{label:"ambient",control:"color"}},lightDirection:{type:"vec3",default:[.5,.5,1],uniform:"lightDirection",ui:{label:"direction",control:"vector3",category:"diffuse"}},reflection:{type:"float",default:0,uniform:"reflection",min:0,max:100,step:.1,randMax:25,ui:{label:"reflection",control:"slider",category:"reflection"}},refraction:{type:"float",default:0,uniform:"refraction",min:0,max:100,step:.1,randMax:25,ui:{label:"refraction",control:"slider"}},aberration:{type:"float",default:0,uniform:"aberration",min:0,max:100,step:.1,ui:{label:"aberration",control:"slider",category:"reflection",enabledBy:{param:"reflection",gt:0}}},heightMap:{type:"surface",default:"inputTex",ui:{label:"height map",category:"general"}}},defaultProgram:`search filter, synth

noise(ridges: true)
.lighting(normalStrength: 2)
.write(o0)`,passes:[{name:"render",program:"lighting",inputs:{inputTex:"inputTex",heightMap:"heightMap"},outputs:{fragColor:"outputTex"}}]});var o={lighting:{glsl:`/*
 * 3D lighting effect for 2D textures
 * Calculates surface normals from luminosity using Sobel convolution
 * and applies diffuse, specular, and ambient lighting
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D heightMap;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 ambientColor;
uniform vec3 lightDirection;
uniform float normalStrength;
uniform float smoothing;
uniform float renderScale;
uniform float reflection;
uniform float refraction;
uniform float aberration;

out vec4 fragColor;

// Convert RGB to luminosity
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

float getHeight(vec2 uv) {
    vec2 mapSize = vec2(textureSize(heightMap, 0));
    vec2 localUV = (uv * fullResolution - tileOffset) / mapSize;
    return getLuminosity(texture(heightMap, localUV).rgb);
}

// Calculate surface normal from height map using Sobel convolution
vec3 calculateNormal(vec2 uv, vec2 texelSize) {
    // Apply smoothing to texel size for smoother normals
    vec2 sampleSize = texelSize * smoothing * renderScale;
    
    // Sobel X kernel
    float sobel_x[9];
    sobel_x[0] = -1.0; sobel_x[1] = 0.0; sobel_x[2] = 1.0;
    sobel_x[3] = -2.0; sobel_x[4] = 0.0; sobel_x[5] = 2.0;
    sobel_x[6] = -1.0; sobel_x[7] = 0.0; sobel_x[8] = 1.0;
    
    // Sobel Y kernel
    float sobel_y[9];
    sobel_y[0] = -1.0; sobel_y[1] = -2.0; sobel_y[2] = -1.0;
    sobel_y[3] =  0.0; sobel_y[4] =  0.0; sobel_y[5] =  0.0;
    sobel_y[6] =  1.0; sobel_y[7] =  2.0; sobel_y[8] =  1.0;
    
    vec2 offsets[9];
    offsets[0] = vec2(-sampleSize.x, -sampleSize.y);
    offsets[1] = vec2(0.0, -sampleSize.y);
    offsets[2] = vec2(sampleSize.x, -sampleSize.y);
    offsets[3] = vec2(-sampleSize.x, 0.0);
    offsets[4] = vec2(0.0, 0.0);
    offsets[5] = vec2(sampleSize.x, 0.0);
    offsets[6] = vec2(-sampleSize.x, sampleSize.y);
    offsets[7] = vec2(0.0, sampleSize.y);
    offsets[8] = vec2(sampleSize.x, sampleSize.y);
    
    float dx = 0.0;
    float dy = 0.0;
    
    for (int i = 0; i < 9; i++) {
        float height = getHeight(uv + offsets[i]);
        dx += height * sobel_x[i];
        dy += height * sobel_y[i];
    }
    
    // Scale gradients by normal strength
    dx *= normalStrength;
    dy *= normalStrength;
    
    // Construct normal from gradients
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    
    return normal;
}

// Apply refraction effect based on surface normal
vec4 applyRefraction(vec2 uv, vec3 normal) {
    vec2 refractionOffset = normal.xy * (refraction * 0.0125);
    return texture(inputTex, ((uv + refractionOffset) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0)));
}

// Apply reflection effect with chromatic aberration
vec4 applyReflection(vec2 uv, vec2 globalUV, vec3 normal) {
    // Calculate incident vector for reflection, from center of image
    vec3 incident = vec3(normalize(globalUV - 0.5), 100.0);
    
    // Calculate reflection vector
    vec3 reflectionVec = reflect(incident, normal);
    
    // Convert to 2D texture offset
    vec2 reflectionOffset = reflectionVec.xy * (reflection * 0.00005);
    
    // Apply chromatic aberration
    vec2 redOffset = reflectionOffset * (1.0 + aberration * 0.0075);
    vec2 greenOffset = reflectionOffset;
    vec2 blueOffset = reflectionOffset * (1.0 - aberration * 0.0075);
    
    float redChannel = texture(inputTex, ((uv + redOffset) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).r;
    float greenChannel = texture(inputTex, ((uv + greenOffset) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).g;
    float blueChannel = texture(inputTex, ((uv + blueOffset) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).b;
    float alphaChannel = texture(inputTex, ((uv + reflectionOffset) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).a;
    
    return vec4(redChannel, greenChannel, blueChannel, alphaChannel);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 uv = globalCoord / fullResolution;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    vec2 texelSize = 1.0 / resolution;
    
    // Get original color
    vec4 origColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    
    // Calculate surface normal
    vec3 normal = calculateNormal(uv, texelSize);
    
    // Normalize light direction
    vec3 lightDir = normalize(lightDirection);
    
    // Calculate view direction (straight at camera)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Ambient lighting
    vec3 ambient = ambientColor * origColor.rgb;
    
    // Diffuse lighting (Lambertian)
    float diffuseFactor = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diffuseColor * diffuseFactor * origColor.rgb;
    
    // Specular lighting (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(halfDir, normal), 0.0);
    float specularFactor = pow(specAngle, shininess);
    vec3 specular = specularColor * specularFactor * specularIntensity;
    
    // Combine lighting components
    vec3 litColor = ambient + diffuse + specular;
    vec4 workingColor = vec4(litColor, origColor.a);
    
    // Apply refraction if enabled
    if (refraction > 0.0) {
        vec4 refractedColor = applyRefraction(uv, normal);
        workingColor = mix(workingColor, refractedColor, refraction / 100.0);
    }
    
    // Apply reflection (with chromatic aberration) if enabled
    if (reflection > 0.0 || aberration > 0.0) {
        vec4 reflectedColor = applyReflection(uv, globalUV, normal);
        workingColor = mix(workingColor, reflectedColor, reflection / 100.0);
    }
    
    fragColor = workingColor;
}
`,wgsl:`/*
 * 3D lighting effect for 2D textures
 * Calculates surface normals from luminosity using Sobel convolution
 * and applies diffuse, specular, and ambient lighting
 */

struct Uniforms {
    diffuseColor: vec3f,
    _pad1: f32,
    specularColor: vec3f,
    specularIntensity: f32,
    ambientColor: vec3f,
    shininess: f32,
    lightDirection: vec3f,
    normalStrength: f32,
    smoothing: f32,
    reflection: f32,
    refraction: f32,
    aberration: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var heightMap: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

// Convert RGB to luminosity
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

fn getHeight(uv: vec2f) -> f32 {
    return getLuminosity(textureSample(heightMap, inputSampler, uv).rgb);
}

// Calculate surface normal from height map using Sobel convolution
fn calculateNormal(uv: vec2f, texelSize: vec2f) -> vec3f {
    // Apply smoothing to texel size for smoother normals
    let sampleSize = texelSize * uniforms.smoothing;
    
    // Sobel X kernel
    var sobel_x = array<f32, 9>(
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
    );
    
    // Sobel Y kernel
    var sobel_y = array<f32, 9>(
        -1.0, -2.0, -1.0,
         0.0,  0.0,  0.0,
         1.0,  2.0,  1.0
    );
    
    var offsets = array<vec2f, 9>(
        vec2f(-sampleSize.x, -sampleSize.y),
        vec2f(0.0, -sampleSize.y),
        vec2f(sampleSize.x, -sampleSize.y),
        vec2f(-sampleSize.x, 0.0),
        vec2f(0.0, 0.0),
        vec2f(sampleSize.x, 0.0),
        vec2f(-sampleSize.x, sampleSize.y),
        vec2f(0.0, sampleSize.y),
        vec2f(sampleSize.x, sampleSize.y)
    );
    
    var dx: f32 = 0.0;
    var dy: f32 = 0.0;
    
    for (var i: i32 = 0; i < 9; i = i + 1) {
        let height = getHeight(uv + offsets[i]);
        dx += height * sobel_x[i];
        dy += height * sobel_y[i];
    }
    
    // Scale gradients by normal strength
    dx *= uniforms.normalStrength;
    dy *= uniforms.normalStrength;
    
    // Construct normal from gradients
    let normal = normalize(vec3f(-dx, -dy, 1.0));
    
    return normal;
}

// Apply refraction effect based on surface normal
fn applyRefraction(uv: vec2f, normal: vec3f) -> vec4f {
    let refractionOffset = normal.xy * (uniforms.refraction * 0.0125);
    return textureSample(inputTex, inputSampler, uv + refractionOffset);
}

// Apply reflection effect with chromatic aberration
fn applyReflection(uv: vec2f, normal: vec3f) -> vec4f {
    // Calculate incident vector for reflection, from center of image
    let incident = vec3f(normalize(uv - 0.5), 100.0);
    
    // Calculate reflection vector
    let reflectionVec = reflect(incident, normal);
    
    // Convert to 2D texture offset
    let reflectionOffset = reflectionVec.xy * (uniforms.reflection * 0.00005);
    
    // Apply chromatic aberration
    let redOffset = reflectionOffset * (1.0 + uniforms.aberration * 0.0075);
    let greenOffset = reflectionOffset;
    let blueOffset = reflectionOffset * (1.0 - uniforms.aberration * 0.0075);
    
    let redChannel = textureSample(inputTex, inputSampler, uv + redOffset).r;
    let greenChannel = textureSample(inputTex, inputSampler, uv + greenOffset).g;
    let blueChannel = textureSample(inputTex, inputSampler, uv + blueOffset).b;
    let alphaChannel = textureSample(inputTex, inputSampler, uv + reflectionOffset).a;
    
    return vec4f(redChannel, greenChannel, blueChannel, alphaChannel);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let texelSize = 1.0 / texSize;
    
    // Get original color
    let origColor = textureSample(inputTex, inputSampler, uv);
    
    // Calculate surface normal
    let normal = calculateNormal(uv, texelSize);
    
    // Normalize light direction
    let lightDir = normalize(uniforms.lightDirection);
    
    // Calculate view direction (straight at camera)
    let viewDir = vec3f(0.0, 0.0, 1.0);
    
    // Ambient lighting
    let ambient = uniforms.ambientColor * origColor.rgb;
    
    // Diffuse lighting (Lambertian)
    let diffuseFactor = max(dot(normal, lightDir), 0.0);
    let diffuse = uniforms.diffuseColor * diffuseFactor * origColor.rgb;
    
    // Specular lighting (Blinn-Phong)
    let halfDir = normalize(lightDir + viewDir);
    let specAngle = max(dot(halfDir, normal), 0.0);
    let specularFactor = pow(specAngle, uniforms.shininess);
    let specular = uniforms.specularColor * specularFactor * uniforms.specularIntensity;
    
    // Combine lighting components
    let litColor = ambient + diffuse + specular;
    var workingColor = vec4f(litColor, origColor.a);
    
    // Apply refraction if enabled
    if (uniforms.refraction > 0.0) {
        let refractedColor = applyRefraction(uv, normal);
        workingColor = mix(workingColor, refractedColor, uniforms.refraction / 100.0);
    }
    
    // Apply reflection (with chromatic aberration) if enabled
    if (uniforms.reflection > 0.0 || uniforms.aberration > 0.0) {
        let reflectedColor = applyReflection(uv, normal);
        workingColor = mix(workingColor, reflectedColor, uniforms.reflection / 100.0);
    }
    
    return workingColor;
}
`}},i=`# lighting

Applies 3D lighting effects

## Description

Uses a three-step process:
1. **Normal Calculation**: Uses Sobel convolution on the input texture's luminosity to extract gradients, which are converted into 3D surface normals
2. **Lighting Model**: Applies Blinn-Phong lighting with diffuse, specular, and ambient components
3. **Output**: The lit result is combined with the original texture colors

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| normalStrength | float | 1.5 | 0-5 | Depth |
| smoothing | float | 1 | 1-10 | Smoothing |
| diffuseColor | color | 1,1,1 | - | Color |
| specularColor | color | 1,1,1 | - | Color |
| specularIntensity | float | 0.5 | 0-2 | Intensity |
| shininess | float | 64 | 8-256 | Shininess |
| ambientColor | color | 0.2,0.2,0.2 | - | Ambient |
| lightDirection | vec3 | 0.5,0.5,1 | - | Direction |
| reflection | float | 0 | 0-100 | Reflection |
| refraction | float | 0 | 0-100 | Refraction |
| aberration | float | 0 | 0-100 | Aberration |

## Notes

- Increase **normalStrength** to make surface features more pronounced
- Adjust **lightDirection** to change where highlights appear
- Higher **shininess** creates tighter, shinier specular highlights
- Use **reflection** and **refraction** for glass/water-like effects
- **aberration** adds RGB channel splitting for dispersion effects

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .lighting()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(o))n.shaders[r]={...e}}n&&i&&(n.help=i);var c="filter/lighting",u="filter",m="lighting",p=n;export{p as default,c as effectId,m as effectName,i as help,u as namespace};
