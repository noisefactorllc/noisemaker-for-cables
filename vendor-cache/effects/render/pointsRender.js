/* render/pointsRender */
var n=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var e=new n({name:"Points Render",namespace:"render",func:"pointsRender",tags:["agents"],description:"Blend agent trails with input for particle systems",textures:{global_points_trail:{width:"100%",height:"100%",format:"rgba16f"}},globals:{density:{type:"float",default:50,min:0,max:100,uniform:"density",ui:{label:"density",control:"slider",category:"visual"}},intensity:{type:"float",default:75,min:0,max:100,uniform:"intensity",ui:{label:"trail intensity",control:"slider",category:"visual"}},inputIntensity:{type:"float",default:10.15,min:0,max:100,uniform:"inputIntensity",ui:{label:"input mix",control:"slider",category:"visual"}},viewMode:{type:"int",default:0,uniform:"viewMode",choices:{flat:0,ortho:1},ui:{label:"view",control:"dropdown",category:"view"}},rotateX:{type:"float",default:.3,uniform:"rotateX",min:0,max:6.283185,step:.01,ui:{label:"rotate x",control:"slider",category:"view",enabledBy:"viewMode"}},rotateY:{type:"float",default:0,uniform:"rotateY",min:0,max:6.283185,step:.01,ui:{label:"rotate y",control:"slider",category:"view",enabledBy:"viewMode"}},rotateZ:{type:"float",default:0,uniform:"rotateZ",min:0,max:6.283185,step:.01,ui:{label:"rotate z",control:"slider",category:"view",enabledBy:"viewMode"}},viewScale:{type:"float",default:.8,uniform:"viewScale",min:.1,max:10,step:.01,ui:{label:"zoom",control:"slider",category:"view",enabledBy:"viewMode"}},posX:{type:"float",default:0,uniform:"posX",min:-50,max:50,step:.1,ui:{label:"pos x",control:"slider",category:"view",enabledBy:"viewMode"}},posY:{type:"float",default:0,uniform:"posY",min:-50,max:50,step:.1,ui:{label:"pos y",control:"slider",category:"view",enabledBy:"viewMode"}},matteOpacity:{type:"float",default:1,min:0,max:1,randMin:.75,uniform:"matteOpacity",ui:{label:"bg opacity",control:"slider",category:"visual"}}},passes:[{name:"diffuse",program:"diffuse",inputs:{trailTex:"global_points_trail"},uniforms:{intensity:"intensity"},outputs:{fragColor:"global_points_trail"}},{name:"copy",program:"copy",inputs:{sourceTex:"global_points_trail"},outputs:{fragColor:"global_points_trail"}},{name:"deposit",program:"deposit",drawMode:"points",count:"input",blend:!0,inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba"},uniforms:{density:"density",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY"},outputs:{fragColor:"global_points_trail"}},{name:"blend",program:"blend",inputs:{inputTex:"inputTex",trailTex:"global_points_trail"},uniforms:{inputIntensity:"inputIntensity",matteOpacity:"matteOpacity"},outputs:{fragColor:"outputTex"}}]});var i={blend:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D trailTex;
uniform vec2 resolution;
uniform float inputIntensity;
uniform float matteOpacity;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    vec4 inputColor = texture(inputTex, uv);
    vec4 trailColor = texture(trailTex, uv);
    
    // Additive blend: trail + scaled input
    // inputIntensity 0 = black, 100 = trail + full input
    float t = inputIntensity / 100.0;
    float matteAlpha = matteOpacity;
    
    // Trail presence based on max RGB channel
    float trailPresence = max(max(trailColor.r, trailColor.g), trailColor.b);
    
    // Background contribution is scaled by matte opacity (premultiplied)
    // Trail contribution is NOT affected by matte opacity
    vec3 rgb = trailColor.rgb + inputColor.rgb * t * matteAlpha;
    
    // Alpha: where trail exists, full opacity; elsewhere, matte opacity
    float alpha = max(trailPresence, matteAlpha);
    
    fragColor = clamp(vec4(rgb, alpha), 0.0, 1.0);
}
`,wgsl:`// Blend pass - combines input with accumulated trails

@group(0) @binding(0) var u_sampler : sampler;
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var trailTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> resolution : vec2<f32>;
@group(0) @binding(4) var<uniform> inputIntensity : f32;
@group(0) @binding(5) var<uniform> matteOpacity : f32;

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let size = max(resolution, vec2<f32>(1.0));
    var uv = position.xy / size;

    let inputColor = textureSample(inputTex, u_sampler, uv);
    let trailColor = textureSample(trailTex, u_sampler, uv);
    
    // Additive blend: trail + scaled input
    // inputIntensity 0 = black, 100 = trail + full input
    let t = inputIntensity / 100.0;
    let matteAlpha = matteOpacity;
    
    // Trail presence based on max RGB channel
    let trailPresence = max(max(trailColor.r, trailColor.g), trailColor.b);
    
    // Background contribution is scaled by matte opacity (premultiplied)
    // Trail contribution is NOT affected by matte opacity
    let rgb = trailColor.rgb + inputColor.rgb * t * matteAlpha;
    
    // Alpha: where trail exists, full opacity; elsewhere, matte opacity
    let alpha = max(trailPresence, matteAlpha);
    
    return clamp(vec4<f32>(rgb, alpha), vec4<f32>(0.0), vec4<f32>(1.0));
}
`},copy:{glsl:`#version 300 es
precision highp float;

// Copy Pass - Blit source to destination (for ping-pong correction)

uniform sampler2D sourceTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    fragColor = texture(sourceTex, uv);
}
`,wgsl:`// Copy Pass - Blit source to destination (for ping-pong correction)
// Pass provides: sourceTex (binding 0), sampler (binding 1)
// No uniforms - use texture dimensions for resolution

@group(0) @binding(0) var sourceTex: texture_2d<f32>;
@group(0) @binding(1) var u_sampler: sampler;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = textureDimensions(sourceTex, 0);
    let uv = position.xy / vec2<f32>(f32(dims.x), f32(dims.y));
    return textureSample(sourceTex, u_sampler, uv);
}
`},deposit:{vertex:`#version 300 es
precision highp float;

// Deposit Vertex Shader - Scatter agents to trail texture

uniform sampler2D xyzTex;
uniform sampler2D rgbaTex;
uniform vec2 resolution;
uniform float density;

// 3D viewport uniforms
uniform int viewMode;     // 0=2D normalized, 1=3D orthographic
uniform float rotateX;
uniform float rotateY;
uniform float rotateZ;
uniform float viewScale;
uniform float posX;
uniform float posY;

out vec4 vColor;

void main() {
    // Get state size from xyz texture dimensions (inherited from pointsEmit)
    ivec2 texSize = textureSize(xyzTex, 0);
    int stateSize = texSize.x;
    int totalAgents = stateSize * stateSize;
    
    // Cull vertices beyond texture size
    if (gl_VertexID >= totalAgents) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Density-based culling
    float cullThreshold = density / 100.0;
    float particleRandom = fract(float(gl_VertexID) * 0.618033988749895);
    if (particleRandom > cullThreshold) {
        // Cull this particle by placing it off-screen
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    // Calculate UV for this agent
    int x = gl_VertexID % stateSize;
    int y = gl_VertexID / stateSize;
    
    // Read agent position and color
    vec4 pos = texelFetch(xyzTex, ivec2(x, y), 0);
    vec4 col = texelFetch(rgbaTex, ivec2(x, y), 0);
    
    // Check if agent is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
    }
    
    vec2 clipPos;
    
    if (viewMode == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = pos.xy * 2.0 - 1.0;
    } else {
        // 3D mode: apply rotation and orthographic projection
        vec3 p = pos.xyz;
        
        // Detect if this is a 2D system (coords in 0-1) or 3D attractor (coords \xB140)
        // 2D systems have Z near 0 and XY in 0-1 range
        bool is2DSystem = abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
        if (is2DSystem) {
            // Center 2D coords around origin: 0-1 -> -0.5 to 0.5
            p.xy = p.xy - 0.5;
            p.z = 0.0;
        }
        
        // Apply rotation around X axis
        float cosX = cos(rotateX);
        float sinX = sin(rotateX);
        p = vec3(p.x, p.y * cosX - p.z * sinX, p.y * sinX + p.z * cosX);
        
        // Apply rotation around Y axis
        float cosY = cos(rotateY);
        float sinY = sin(rotateY);
        p = vec3(p.x * cosY + p.z * sinY, p.y, -p.x * sinY + p.z * cosY);
        
        // Apply rotation around Z axis
        float cosZ = cos(rotateZ);
        float sinZ = sin(rotateZ);
        p = vec3(p.x * cosZ - p.y * sinZ, p.x * sinZ + p.y * cosZ, p.z);
        
        // Apply X/Y offset after rotation (pan in screen space)
        p.x += posX;
        p.y += posY;
        
        // Orthographic projection with scale
        if (is2DSystem) {
            // 2D systems: coords are now \xB10.5, scale to fill viewport
            // Use 3.5x multiplier for close-up view that's nice to pan around
            clipPos = p.xy * 3.5 * viewScale;
        } else {
            // 3D attractors: coords range roughly \xB140, normalize then scale
            clipPos = p.xy / 40.0 * viewScale;
        }
    }
    
    gl_Position = vec4(clipPos, 0.0, 1.0);
    gl_PointSize = 1.0;
    vColor = vec4(col.rgb, col.a);
}
`,fragment:`#version 300 es
precision highp float;

// Deposit Fragment Shader - Output agent color to trail

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,wgsl:`// Deposit Shader - Scatter agents to trail texture

struct Uniforms {
    resolution: vec2<f32>,
    density: f32,
    viewMode: i32,
    rotateX: f32,
    rotateY: f32,
    rotateZ: f32,
    viewScale: f32,
    posX: f32,
    posY: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;
    
    // Get state size from xyz texture dimensions (inherited from pointsEmit)
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);
    let totalAgents = stateSize * stateSize;
    
    // Cull vertices beyond texture size
    if (i32(vertexIndex) >= totalAgents) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }
    
    // Density-based culling
    let cullThreshold = u.density / 100.0;
    let particleRandom = fract(f32(vertexIndex) * 0.618033988749895);
    if (particleRandom > cullThreshold) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }
    
    // Calculate UV for this agent
    let x = i32(vertexIndex) % stateSize;
    let y = i32(vertexIndex) / stateSize;
    
    // Read agent position and color
    let pos = textureLoad(xyzTex, vec2<i32>(x, y), 0);
    let col = textureLoad(rgbaTex, vec2<i32>(x, y), 0);
    
    // Check if agent is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        return out;
    }
    
    var clipPos: vec2<f32>;
    
    if (u.viewMode == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = vec2<f32>(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0);
    } else {
        // 3D mode: apply rotation and orthographic projection
        var p = pos.xyz;
        
        // Detect if this is a 2D system (coords in 0-1) or 3D attractor (coords \xB140)
        // 2D systems have Z near 0 and XY in 0-1 range
        let is2DSystem = abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
        if (is2DSystem) {
            // Center 2D coords around origin: 0-1 -> -0.5 to 0.5
            p = vec3<f32>(p.x - 0.5, p.y - 0.5, 0.0);
        }
        
        // Apply rotation around X axis
        let cosX = cos(u.rotateX);
        let sinX = sin(u.rotateX);
        p = vec3<f32>(p.x, p.y * cosX - p.z * sinX, p.y * sinX + p.z * cosX);
        
        // Apply rotation around Y axis
        let cosY = cos(u.rotateY);
        let sinY = sin(u.rotateY);
        p = vec3<f32>(p.x * cosY + p.z * sinY, p.y, -p.x * sinY + p.z * cosY);
        
        // Apply rotation around Z axis
        let cosZ = cos(u.rotateZ);
        let sinZ = sin(u.rotateZ);
        p = vec3<f32>(p.x * cosZ - p.y * sinZ, p.x * sinZ + p.y * cosZ, p.z);
        
        // Apply X/Y offset after rotation (pan in screen space)
        p.x = p.x + u.posX;
        p.y = p.y + u.posY;
        
        // Orthographic projection with scale
        if (is2DSystem) {
            // 2D systems: coords are now \xB10.5, scale to fill viewport
            // Use 3.5x multiplier for close-up view that's nice to pan around
            clipPos = p.xy * 3.5 * u.viewScale;
        } else {
            // 3D attractors: coords range roughly \xB140, normalize then scale
            clipPos = p.xy / 40.0 * u.viewScale;
        }
        clipPos.y = -clipPos.y;
    }
    
    out.position = vec4<f32>(clipPos, 0.0, 1.0);
    out.color = vec4<f32>(col.rgb, col.a);
    return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
`},diffuse:{glsl:`#version 300 es
precision highp float;

// Diffuse Pass - Decay existing trail (matches flow)

uniform sampler2D trailTex;
uniform vec2 resolution;
uniform float intensity;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // Sample the trail texture directly (no blur)
    vec4 trailColor = texture(trailTex, uv);
    
    // Apply intensity decay (persistence) - faithfully matches flow implementation
    // intensity=100 means no decay, intensity=0 means instant fade
    float decay = clamp(intensity / 100.0, 0.0, 1.0);
    fragColor = clamp(trailColor * decay, 0.0, 1.0);
}
`,wgsl:`// Diffuse Pass - Decay existing trail (matches flow)

struct Uniforms {
    resolution: vec2<f32>,
    intensity: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var trailTex: texture_2d<f32>;
@group(0) @binding(2) var trailSampler: sampler;

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / u.resolution;
    
    // Sample the trail texture directly (no blur)
    let trailColor = textureSample(trailTex, trailSampler, uv);
    
    // Apply intensity decay (persistence) - faithfully matches flow implementation
    // intensity=100 means no decay, intensity=0 means instant fade
    let decay = clamp(u.intensity / 100.0, 0.0, 1.0);
    return clamp(trailColor * decay, vec4<f32>(0.0), vec4<f32>(1.0));
}
`}},r=`# pointsRender

Accumulate agent trails and blend with input for particle systems

## Description

Renders each agent as a single point with trail accumulation over time.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| density | float | 50 | 0-100 | Density |
| intensity | float | 75 | 0-100 | Trail intensity |
| inputIntensity | float | 10.15 | 0-100 | Input intensity |
| viewMode | int | flat | flat/ortho | View |
| rotateX | float | 0.3 | 0-6.283185 | Rotate X |
| rotateY | float | 0 | 0-6.283185 | Rotate Y |
| rotateZ | float | 0 | 0-6.283185 | Rotate Z |
| viewScale | float | 0.8 | 0.1-10 | Zoom |
| posX | float | 0 | -50-50 | Pos X |
| posY | float | 0 | -50-50 | Pos Y |
| matteOpacity | float | 1 | 0-1 | Background opacity |

## Usage

\`\`\`
search points, synth, render

noise()
  .pointsEmit()
  .physical()
  .pointsRender()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[o,t]of Object.entries(i))e.shaders[o]={...t}}e&&r&&(e.help=r);var u="render/pointsRender",c="render",f="pointsRender",d=e;export{d as default,u as effectId,f as effectName,r as help,c as namespace};
