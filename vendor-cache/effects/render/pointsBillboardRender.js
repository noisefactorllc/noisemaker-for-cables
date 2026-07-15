/* render/pointsBillboardRender */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Points Billboard Render",namespace:"render",func:"pointsBillboardRender",tags:["agents"],openCategories:["source","visual"],description:"Render particles as billboard sprites",textures:{global_billboard_trail:{width:"100%",height:"100%",format:"rgba16f"}},globals:{shapeMode:{type:"int",default:1,uniform:"shapeMode",choices:{texture:0,circle:1,ring:2,square:3,diamond:4,triangle:5,star:6,soft:7},randMin:1,ui:{label:"shape",control:"dropdown",category:"source"}},tex:{type:"surface",default:"none",ui:{label:"sprite",category:"source",enabledBy:{param:"shapeMode",eq:0}}},blendMode:{type:"int",default:0,uniform:"blendMode",choices:{additive:0,alpha:1},ui:{label:"blend",control:"dropdown",category:"visual"}},depositOpacity:{type:"float",default:20,min:1,max:100,uniform:"depositOpacity",ui:{label:"opacity",control:"slider",category:"visual"}},pointSize:{type:"float",default:8,min:1,max:64,uniform:"pointSize",ui:{label:"point size",control:"slider",category:"visual"}},sizeVariation:{type:"float",default:0,min:0,max:100,uniform:"sizeVariation",ui:{label:"size variation",control:"slider",category:"visual"}},rotationVar:{type:"float",default:0,min:0,max:100,uniform:"rotationVar",ui:{label:"rot variation",control:"slider",category:"visual"}},seed:{type:"int",default:42,min:0,max:1e3,uniform:"seed",ui:{label:"seed",control:"slider",category:"visual"}},density:{type:"float",default:50,min:0,max:100,uniform:"density",ui:{label:"density",control:"slider",category:"visual"}},intensity:{type:"float",default:75,min:0,max:100,uniform:"intensity",ui:{label:"trail intensity",control:"slider",category:"visual"}},inputIntensity:{type:"float",default:10.15,min:0,max:100,randMin:50,uniform:"inputIntensity",ui:{label:"input mix",control:"slider",category:"visual"}},viewMode:{type:"int",default:0,uniform:"viewMode",choices:{flat:0,ortho:1},ui:{label:"view",control:"dropdown",category:"view"}},rotateX:{type:"float",default:.3,uniform:"rotateX",min:0,max:6.283185,step:.01,ui:{label:"rotate x",control:"slider",category:"view",enabledBy:"viewMode"}},rotateY:{type:"float",default:0,uniform:"rotateY",min:0,max:6.283185,step:.01,ui:{label:"rotate y",control:"slider",category:"view",enabledBy:"viewMode"}},rotateZ:{type:"float",default:0,uniform:"rotateZ",min:0,max:6.283185,step:.01,ui:{label:"rotate z",control:"slider",category:"view",enabledBy:"viewMode"}},viewScale:{type:"float",default:.8,uniform:"viewScale",min:.1,max:10,step:.01,ui:{label:"zoom",control:"slider",category:"view",enabledBy:"viewMode"}},posX:{type:"float",default:0,uniform:"posX",min:-50,max:50,step:.1,ui:{label:"pos x",control:"slider",category:"view",enabledBy:"viewMode"}},posY:{type:"float",default:0,uniform:"posY",min:-50,max:50,step:.1,ui:{label:"pos y",control:"slider",category:"view",enabledBy:"viewMode"}}},paramAliases:{rotationVariation:"rotationVar"},passes:[{name:"diffuse",program:"diffuse",inputs:{trailTex:"global_billboard_trail"},uniforms:{intensity:"intensity"},outputs:{fragColor:"global_billboard_trail"}},{name:"copy",program:"copy",inputs:{sourceTex:"global_billboard_trail"},outputs:{fragColor:"global_billboard_trail"}},{name:"deposit",program:"deposit",drawMode:"billboards",count:"input",blend:!0,conditions:{runIf:[{uniform:"blendMode",equals:0}]},inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba",spriteTex:"tex"},uniforms:{shapeMode:"shapeMode",depositOpacity:"depositOpacity",density:"density",pointSize:"pointSize",sizeVariation:"sizeVariation",rotationVar:"rotationVar",seed:"seed",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY"},outputs:{fragColor:"global_billboard_trail"}},{name:"deposit_alpha",program:"deposit",drawMode:"billboards",count:"input",blend:["ONE","ONE_MINUS_SRC_ALPHA"],conditions:{runIf:[{uniform:"blendMode",equals:1}]},inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba",spriteTex:"tex"},uniforms:{shapeMode:"shapeMode",depositOpacity:"depositOpacity",density:"density",pointSize:"pointSize",sizeVariation:"sizeVariation",rotationVar:"rotationVar",seed:"seed",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY"},outputs:{fragColor:"global_billboard_trail"}},{name:"blend",program:"blend",inputs:{inputTex:"inputTex",trailTex:"global_billboard_trail"},uniforms:{inputIntensity:"inputIntensity",blendMode:"blendMode"},outputs:{fragColor:"outputTex"}}]});var i={blend:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D trailTex;
uniform vec2 resolution;
uniform float inputIntensity;
uniform int blendMode;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    vec4 inputColor = texture(inputTex, uv);
    vec4 trailColor = texture(trailTex, uv);

    float t = inputIntensity / 100.0;
    vec4 scaledInput = inputColor * t;

    vec3 outRGB;
    float outAlpha;

    if (blendMode == 1) {
        // Alpha mode: trail stores premultiplied values (rgb = actual_color * alpha).
        // Use premultiplied OVER operator then convert to straight for output.
        outAlpha = trailColor.a + scaledInput.a * (1.0 - trailColor.a);
        vec3 outRGB_pre = trailColor.rgb + scaledInput.rgb * scaledInput.a * (1.0 - trailColor.a);
        outRGB = outAlpha > 0.0 ? outRGB_pre / outAlpha : vec3(0.0);
    } else {
        // Additive mode: clamp trail to [0,1] then screen-blend with input (avoids overflow).
        vec3 trail = clamp(trailColor.rgb, 0.0, 1.0);
        float trailPresence = max(max(trail.r, trail.g), trail.b);
        outRGB = trail + scaledInput.rgb * (1.0 - trail);
        outAlpha = max(trailPresence, scaledInput.a);
    }

    fragColor = clamp(vec4(outRGB, outAlpha), 0.0, 1.0);
}
`,wgsl:`// Blend pass - combines input with accumulated trails

@group(0) @binding(0) var u_sampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var trailTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> resolution: vec2<f32>;
@group(0) @binding(4) var<uniform> inputIntensity: f32;
@group(0) @binding(5) var<uniform> blendMode: i32;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let size = max(resolution, vec2<f32>(1.0));
    var uv = position.xy / size;

    let inputColor = textureSample(inputTex, u_sampler, uv);
    let trailColor = textureSample(trailTex, u_sampler, uv);

    let t = inputIntensity / 100.0;
    let scaledInput = inputColor * t;

    var outRGB: vec3<f32>;
    var outAlpha: f32;

    if (blendMode == 1) {
        // Alpha mode: trail stores premultiplied values (rgb = actual_color * alpha).
        // Use premultiplied OVER operator then convert to straight for output.
        outAlpha = trailColor.a + scaledInput.a * (1.0 - trailColor.a);
        let outRGB_pre = trailColor.rgb + scaledInput.rgb * scaledInput.a * (1.0 - trailColor.a);
        outRGB = select(vec3<f32>(0.0), outRGB_pre / outAlpha, outAlpha > 0.0);
    } else {
        // Additive mode: clamp trail to [0,1] then screen-blend with input (avoids overflow).
        let trail = clamp(trailColor.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
        let trailPresence = max(max(trail.r, trail.g), trail.b);
        outRGB = trail + scaledInput.rgb * (1.0 - trail);
        outAlpha = max(trailPresence, scaledInput.a);
    }

    return clamp(vec4<f32>(outRGB, outAlpha), vec4<f32>(0.0), vec4<f32>(1.0));
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

@group(0) @binding(0) var u_sampler: sampler;
@group(0) @binding(1) var sourceTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> resolution: vec2<f32>;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = position.xy / resolution;
    return textureSample(sourceTex, u_sampler, uv);
}
`},deposit:{vertex:`#version 300 es
precision highp float;

// Billboard Deposit Vertex Shader - Scatter agents as billboard quads

uniform sampler2D xyzTex;
uniform sampler2D rgbaTex;
uniform vec2 resolution;
uniform float density;
uniform float pointSize;
uniform float sizeVariation;
uniform float rotationVar;
uniform float seed;

// 3D viewport uniforms
uniform int viewMode;
uniform float rotateX;
uniform float rotateY;
uniform float rotateZ;
uniform float viewScale;
uniform float posX;
uniform float posY;

out vec4 vColor;
out vec2 vSpriteUV;

uint hash_uint(uint s) {
    uint state = s * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(float n) {
    return float(hash_uint(floatBitsToUint(n + seed))) / 4294967295.0;
}

void main() {
    // Each quad uses 6 vertices (2 triangles)
    int particleID = gl_VertexID / 6;
    int vertexInQuad = gl_VertexID % 6;
    
    // Get state size from xyz texture dimensions
    ivec2 texSize = textureSize(xyzTex, 0);
    int stateSize = texSize.x;
    int totalAgents = stateSize * stateSize;
    
    // Cull particles beyond texture size
    if (particleID >= totalAgents) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vColor = vec4(0.0);
        vSpriteUV = vec2(0.0);
        return;
    }
    
    // Density-based culling
    float cullThreshold = density / 100.0;
    float particleRandom = fract(float(particleID) * 0.618033988749895);
    if (particleRandom > cullThreshold) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vColor = vec4(0.0);
        vSpriteUV = vec2(0.0);
        return;
    }
    
    // Calculate UV for this particle
    int x = particleID % stateSize;
    int y = particleID / stateSize;
    
    // Read particle position and color
    vec4 pos = texelFetch(xyzTex, ivec2(x, y), 0);
    vec4 col = texelFetch(rgbaTex, ivec2(x, y), 0);
    
    // Check if particle is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vColor = vec4(0.0);
        vSpriteUV = vec2(0.0);
        return;
    }
    
    // Calculate clip-space center position (same as pointsRender)
    vec2 clipPos;
    
    if (viewMode == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = pos.xy * 2.0 - 1.0;
    } else {
        // 3D mode: apply rotation and orthographic projection
        vec3 p = pos.xyz;
        
        // Detect if this is a 2D system (coords in 0-1) or 3D attractor (coords \xB140)
        bool is2DSystem = abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
        if (is2DSystem) {
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
        
        // Apply X/Y offset after rotation
        p.x += posX;
        p.y += posY;
        
        // Orthographic projection with scale
        if (is2DSystem) {
            clipPos = p.xy * 3.5 * viewScale;
        } else {
            clipPos = p.xy / 40.0 * viewScale;
        }
    }
    
    // Per-particle size variation (seeded deterministic)
    float sizeNoise = hash(float(particleID));
    float sizeMultiplier = 1.0 - (sizeVariation / 100.0) * (sizeNoise - 0.5);
    float finalSize = pointSize * sizeMultiplier;
    
    // Per-particle rotation (seeded deterministic)
    float rotationNoise = hash(float(particleID) + 1234.5);
    float rotation = (rotationVar / 100.0) * rotationNoise * 6.283185; // 0 to 2\u03C0
    
    // Convert pixel size to clip-space units
    vec2 pixelToClip = 2.0 / resolution;
    float halfSize = finalSize * 0.5;
    vec2 sizeClip = halfSize * pixelToClip;
    
    // Quad vertex offsets (two triangles: 0-1-2, 2-1-3)
    // Winding order for proper face culling
    vec2 offsets[6];
    offsets[0] = vec2(-1.0, -1.0); // bottom-left
    offsets[1] = vec2( 1.0, -1.0); // bottom-right
    offsets[2] = vec2(-1.0,  1.0); // top-left
    offsets[3] = vec2(-1.0,  1.0); // top-left
    offsets[4] = vec2( 1.0, -1.0); // bottom-right
    offsets[5] = vec2( 1.0,  1.0); // top-right
    
    vec2 offset = offsets[vertexInQuad];
    
    // Apply rotation to offset
    float cosR = cos(rotation);
    float sinR = sin(rotation);
    vec2 rotatedOffset = vec2(
        offset.x * cosR - offset.y * sinR,
        offset.x * sinR + offset.y * cosR
    );
    
    // Scale offset and add to center position
    vec2 finalPos = clipPos + rotatedOffset * sizeClip;
    
    gl_Position = vec4(finalPos, 0.0, 1.0);
    vColor = vec4(col.rgb, col.a);
    
    // Sprite UV coordinates (0-1 range)
    vSpriteUV = offset * 0.5 + 0.5;
}
`,fragment:`#version 300 es
precision highp float;

// Billboard Deposit Fragment Shader - SDF shapes or sprite texture

uniform sampler2D spriteTex;
uniform int shapeMode;
uniform float depositOpacity;

in vec4 vColor;
in vec2 vSpriteUV;

out vec4 fragColor;

void main() {
    float opacity = depositOpacity / 100.0;

    if (shapeMode == 0) {
        // Texture mode: sample sprite texture
        vec4 spriteColor = texture(spriteTex, vSpriteUV);
        fragColor = vec4(spriteColor.rgb * vColor.rgb, spriteColor.a * vColor.a) * opacity;
    } else {
        // Procedural SDF shapes
        vec2 p = vSpriteUV - 0.5;
        float sdf;
        float alpha;

        if (shapeMode == 1) {
            // Circle
            sdf = length(p) - 0.45;
        } else if (shapeMode == 2) {
            // Ring
            sdf = abs(length(p) - 0.35) - 0.08;
        } else if (shapeMode == 3) {
            // Square
            sdf = max(abs(p.x), abs(p.y)) - 0.4;
        } else if (shapeMode == 4) {
            // Diamond
            sdf = abs(p.x) + abs(p.y) - 0.45;
        } else if (shapeMode == 5) {
            // Equilateral triangle (Inigo Quilez SDF)
            float r = 0.25;
            float k = 1.732050808; // sqrt(3)
            vec2 t = vec2(abs(p.x) - r, p.y - 0.04 + r / k);
            if (t.x + k * t.y > 0.0) t = vec2(t.x - k * t.y, -k * t.x - t.y) / 2.0;
            t.x -= clamp(t.x, -2.0 * r, 0.0);
            sdf = -length(t) * sign(t.y);
        } else if (shapeMode == 6) {
            // 5-point star (Inigo Quilez SDF \u2014 straight edges)
            float r = 0.35;
            float rf = 0.4;
            vec2 k1 = vec2(0.809016994375, -0.587785252292);
            vec2 k2 = vec2(-k1.x, k1.y);
            vec2 s = vec2(abs(p.x), p.y);
            s -= 2.0 * max(dot(k1, s), 0.0) * k1;
            s -= 2.0 * max(dot(k2, s), 0.0) * k2;
            s.x = abs(s.x);
            s.y -= r;
            vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
            float h = clamp(dot(s, ba) / dot(ba, ba), 0.0, r);
            sdf = length(s - ba * h) * sign(s.y * ba.x - s.x * ba.y);
        } else {
            // Soft (7) \u2014 gaussian falloff
            alpha = exp(-dot(p, p) * 8.0);
            fragColor = vec4(vColor.rgb * alpha, alpha * vColor.a) * opacity;
            return;
        }

        alpha = 1.0 - smoothstep(-0.02, 0.02, sdf);
        fragColor = vec4(vColor.rgb * alpha, alpha * vColor.a) * opacity;
    }
}
`,wgsl:`// Billboard Deposit Shader - Scatter agents as billboard quads

struct Uniforms {
    resolution: vec2<f32>,
    shapeMode: i32,
    depositOpacity: f32,
    density: f32,
    pointSize: f32,
    sizeVariation: f32,
    rotationVar: f32,
    seed: i32,
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
    @location(1) spriteUV: vec2<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;

fn hash_uint_bb(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash(n: f32) -> f32 {
    return f32(hash_uint_bb(bitcast<u32>(n + f32(u.seed)))) / 4294967295.0;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var out: VertexOutput;

    // Each quad uses 6 vertices (2 triangles)
    let particleID = i32(vertexIndex) / 6;
    let vertexInQuad = i32(vertexIndex) % 6;
    
    // Get state size from xyz texture dimensions
    let texSize = textureDimensions(xyzTex, 0);
    let stateSize = i32(texSize.x);
    let totalAgents = stateSize * stateSize;
    
    // Cull particles beyond texture size
    if (particleID >= totalAgents) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        out.spriteUV = vec2<f32>(0.0);
        return out;
    }
    
    // Density-based culling
    let cullThreshold = u.density / 100.0;
    let particleRandom = fract(f32(particleID) * 0.618033988749895);
    if (particleRandom > cullThreshold) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        out.spriteUV = vec2<f32>(0.0);
        return out;
    }
    
    // Calculate UV for this particle
    let x = particleID % stateSize;
    let y = particleID / stateSize;
    
    // Read particle position and color
    let pos = textureLoad(xyzTex, vec2<i32>(x, y), 0);
    let col = textureLoad(rgbaTex, vec2<i32>(x, y), 0);
    
    // Check if particle is alive (pos.w >= 0.5 means alive)
    if (pos.w < 0.5) {
        out.position = vec4<f32>(2.0, 2.0, 0.0, 1.0);
        out.color = vec4<f32>(0.0);
        out.spriteUV = vec2<f32>(0.0);
        return out;
    }
    
    var clipPos: vec2<f32>;
    
    if (u.viewMode == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = vec2<f32>(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0);
    } else {
        // 3D mode: apply rotation and orthographic projection
        var p = pos.xyz;
        
        // Detect if this is a 2D system or 3D attractor
        let is2DSystem = abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
        if (is2DSystem) {
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
        
        // Apply X/Y offset after rotation
        p.x = p.x + u.posX;
        p.y = p.y + u.posY;
        
        // Orthographic projection with scale
        if (is2DSystem) {
            clipPos = p.xy * 3.5 * u.viewScale;
        } else {
            clipPos = p.xy / 40.0 * u.viewScale;
        }
        clipPos.y = -clipPos.y;
    }
    
    // Per-particle size variation (seeded deterministic)
    let sizeNoise = hash(f32(particleID));
    let sizeMultiplier = 1.0 - (u.sizeVariation / 100.0) * (sizeNoise - 0.5);
    let finalSize = u.pointSize * sizeMultiplier;
    
    // Per-particle rotation (seeded deterministic)
    let rotationNoise = hash(f32(particleID) + 1234.5);
    let rotation = (u.rotationVar / 100.0) * rotationNoise * 6.283185; // 0 to 2\u03C0
    
    // Convert pixel size to clip-space units
    let pixelToClip = 2.0 / u.resolution;
    let halfSize = finalSize * 0.5;
    let sizeClip = halfSize * pixelToClip;
    
    // Quad vertex offsets (two triangles: 0-1-2, 2-1-3)
    var offsets: array<vec2<f32>, 6>;
    offsets[0] = vec2<f32>(-1.0, -1.0); // bottom-left
    offsets[1] = vec2<f32>( 1.0, -1.0); // bottom-right
    offsets[2] = vec2<f32>(-1.0,  1.0); // top-left
    offsets[3] = vec2<f32>(-1.0,  1.0); // top-left
    offsets[4] = vec2<f32>( 1.0, -1.0); // bottom-right
    offsets[5] = vec2<f32>( 1.0,  1.0); // top-right
    
    let offset = offsets[vertexInQuad];
    
    // Apply rotation to offset
    let cosR = cos(rotation);
    let sinR = sin(rotation);
    let rotatedOffset = vec2<f32>(
        offset.x * cosR - offset.y * sinR,
        offset.x * sinR + offset.y * cosR
    );
    
    // Scale offset and add to center position
    let finalPos = clipPos + rotatedOffset * sizeClip;
    
    out.position = vec4<f32>(finalPos, 0.0, 1.0);
    out.color = vec4<f32>(col.rgb, col.a);
    
    // Sprite UV coordinates (0-1 range)
    out.spriteUV = offset * 0.5 + 0.5;
    
    return out;
}

@group(0) @binding(3) var spriteTex: texture_2d<f32>;
@group(0) @binding(4) var spriteSampler: sampler;

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
    let opacity = u.depositOpacity / 100.0;

    if (u.shapeMode == 0) {
        // Texture mode: sample sprite texture
        let spriteColor = textureSample(spriteTex, spriteSampler, in.spriteUV);
        return vec4<f32>(spriteColor.rgb * in.color.rgb, spriteColor.a * in.color.a) * opacity;
    }

    // Procedural SDF shapes
    let p = in.spriteUV - 0.5;
    var sdf: f32;
    var alpha: f32;

    if (u.shapeMode == 1) {
        // Circle
        sdf = length(p) - 0.45;
    } else if (u.shapeMode == 2) {
        // Ring
        sdf = abs(length(p) - 0.35) - 0.08;
    } else if (u.shapeMode == 3) {
        // Square
        sdf = max(abs(p.x), abs(p.y)) - 0.4;
    } else if (u.shapeMode == 4) {
        // Diamond
        sdf = abs(p.x) + abs(p.y) - 0.45;
    } else if (u.shapeMode == 5) {
        // Equilateral triangle (Inigo Quilez SDF)
        let r = 0.25;
        let k = 1.732050808; // sqrt(3)
        var t = vec2<f32>(abs(p.x) - r, p.y - 0.04 + r / k);
        if (t.x + k * t.y > 0.0) { t = vec2<f32>(t.x - k * t.y, -k * t.x - t.y) / 2.0; }
        t.x -= clamp(t.x, -2.0 * r, 0.0);
        sdf = -length(t) * sign(t.y);
    } else if (u.shapeMode == 6) {
        // 5-point star (Inigo Quilez SDF \u2014 straight edges)
        let r = 0.35;
        let rf = 0.4;
        let k1 = vec2<f32>(0.809016994375, -0.587785252292);
        let k2 = vec2<f32>(-k1.x, k1.y);
        var s = vec2<f32>(abs(p.x), p.y);
        s -= 2.0 * max(dot(k1, s), 0.0) * k1;
        s -= 2.0 * max(dot(k2, s), 0.0) * k2;
        s.x = abs(s.x);
        s.y -= r;
        let ba = rf * vec2<f32>(-k1.y, k1.x) - vec2<f32>(0.0, 1.0);
        let h = clamp(dot(s, ba) / dot(ba, ba), 0.0, r);
        sdf = length(s - ba * h) * sign(s.y * ba.x - s.x * ba.y);
    } else {
        // Soft (7) \u2014 gaussian falloff
        alpha = exp(-dot(p, p) * 8.0);
        return vec4<f32>(in.color.rgb * alpha, alpha * in.color.a) * opacity;
    }

    alpha = 1.0 - smoothstep(-0.02, 0.02, sdf);
    return vec4<f32>(in.color.rgb * alpha, alpha * in.color.a) * opacity;
}
`},diffuse:{glsl:`#version 300 es
precision highp float;

// Diffuse Pass - Decay existing trail

uniform sampler2D trailTex;
uniform vec2 resolution;
uniform float intensity;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // Sample the trail texture directly (no blur)
    vec4 trailColor = texture(trailTex, uv);
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    float decay = clamp(intensity / 100.0, 0.0, 1.0);
    fragColor = clamp(trailColor * decay, 0.0, 1.0);
}
`,wgsl:`// Diffuse Pass - Decay existing trail

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
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    let decay = clamp(u.intensity / 100.0, 0.0, 1.0);
    return clamp(trailColor * decay, vec4<f32>(0.0), vec4<f32>(1.0));
}
`}},a=`# pointsBillboardRender

Render agent particles as billboard sprites with built-in shapes or texture sampling

## Description

Each particle is rendered as a quad with a procedural SDF shape or external texture. Shapes include circle, ring, square, diamond, triangle, star, and a soft gaussian glow. Particles can be sized, rotated, and varied per-particle using deterministic noise.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shapeMode | int | circle | texture/circle/ring/square/diamond/triangle/star/soft | Particle shape |
| tex | surface | none | - | Sprite texture (only used when shape is "texture") |
| depositOpacity | float | 20 | 1-100 | Deposit opacity \u2014 scales particle contribution to reduce additive blowout |
| pointSize | float | 8 | 1-64 | Point size |
| sizeVariation | float | 0 | 0-100 | Size variation |
| rotationVar | float | 0 | 0-100 | Rotation variation |
| seed | int | 42 | 0-1000 | Seed |
| density | float | 50 | 0-100 | Density |
| intensity | float | 75 | 0-100 | Trail intensity |
| inputIntensity | float | 10.15 | 0-100 | Input mix |
| viewMode | int | flat | flat/ortho | View |
| rotateX | float | 0.3 | 0-6.283185 | Rotate X |
| rotateY | float | 0 | 0-6.283185 | Rotate Y |
| rotateZ | float | 0 | 0-6.283185 | Rotate Z |
| viewScale | float | 0.8 | 0.1-10 | Zoom |
| posX | float | 0 | -50-50 | Pos X |
| posY | float | 0 | -50-50 | Pos Y |

## Usage

\`\`\`
search synth, filter, render

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .pointsBillboardRender(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(t&&Object.keys(i).length>0){t.shaders||(t.shaders={});for(let[o,e]of Object.entries(i))t.shaders[o]={...e}}t&&a&&(t.help=a);var u="render/pointsBillboardRender",f="render",c="pointsBillboardRender",d=t;export{d as default,u as effectId,c as effectName,a as help,f as namespace};
