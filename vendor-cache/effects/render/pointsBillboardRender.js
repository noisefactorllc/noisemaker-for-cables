/* render/pointsBillboardRender */
var i=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new i({name:"Points Billboard Render",namespace:"render",func:"pointsBillboardRender",tags:["agents"],openCategories:["source","visual"],description:"Render particles as billboard sprites",textures:{depthOrderA:{width:{param:"stateSize",default:256},height:{param:"stateSize",default:256},format:"rgba32f"},depthOrderB:{width:{param:"stateSize",default:256},height:{param:"stateSize",default:256},format:"rgba32f"},spriteMeanTiles:{width:160,height:160,format:"rgba32f"},spriteMean:{width:5,height:5,format:"rgba32f"},defocus:{width:"25%",height:"25%",format:"rgba16f"},global_billboard_trail:{width:"100%",height:"100%",format:"rgba16f"}},globals:{shapeMode:{type:"int",default:1,min:0,max:7,uniform:"shapeMode",choices:{texture:0,circle:1,ring:2,square:3,diamond:4,triangle:5,star:6,soft:7},randMin:1,ui:{label:"shape",control:"dropdown",category:"source"}},tex:{type:"surface",default:"none",ui:{label:"sprite",category:"source",enabledBy:{param:"shapeMode",eq:0}}},blendMode:{type:"int",default:0,uniform:"blendMode",choices:{additive:0,alpha:1},ui:{label:"blend",control:"dropdown",category:"visual"}},depositOpacity:{type:"float",default:20,min:1,max:100,uniform:"depositOpacity",ui:{label:"opacity",control:"slider",category:"visual"}},pointSize:{type:"float",default:8,min:1,max:64,uniform:"pointSize",ui:{label:"point size",control:"slider",category:"visual"}},sizeVariation:{type:"float",default:0,min:0,max:100,uniform:"sizeVariation",ui:{label:"size variation",control:"slider",category:"visual"}},rotationVar:{type:"float",default:0,min:0,max:100,uniform:"rotationVar",ui:{label:"rot variation",control:"slider",category:"visual"}},seed:{type:"int",default:42,min:0,max:1e3,uniform:"seed",ui:{label:"seed",control:"slider",category:"visual"}},density:{type:"float",default:50,min:0,max:100,uniform:"density",ui:{label:"density",control:"slider",category:"visual"}},intensity:{type:"float",default:75,min:0,max:100,uniform:"intensity",ui:{label:"trail intensity",control:"slider",category:"visual"}},inputIntensity:{type:"float",default:10.15,min:0,max:100,randMin:50,uniform:"inputIntensity",ui:{label:"input mix",control:"slider",category:"visual"}},viewMode:{type:"int",default:0,min:0,max:2,uniform:"viewMode",choices:{flat:0,ortho:1,perspective:2},ui:{label:"view",control:"dropdown",category:"view"}},rotateX:{type:"float",default:.3,uniform:"rotateX",min:0,max:6.283185,step:.01,ui:{label:"rotate x",control:"slider",category:"view",enabledBy:"viewMode"}},rotateY:{type:"float",default:0,uniform:"rotateY",min:0,max:6.283185,step:.01,ui:{label:"rotate y",control:"slider",category:"view",enabledBy:"viewMode"}},rotateZ:{type:"float",default:0,uniform:"rotateZ",min:0,max:6.283185,step:.01,ui:{label:"rotate z",control:"slider",category:"view",enabledBy:"viewMode"}},viewScale:{type:"float",default:.8,uniform:"viewScale",min:.1,max:10,step:.01,ui:{label:"zoom",control:"slider",category:"view",enabledBy:"viewMode"}},posX:{type:"float",default:0,uniform:"posX",min:-50,max:50,step:.1,ui:{label:"pos x",control:"slider",category:"view",enabledBy:"viewMode"}},posY:{type:"float",default:0,uniform:"posY",min:-50,max:50,step:.1,ui:{label:"pos y",control:"slider",category:"view",enabledBy:"viewMode"}},posZ:{type:"float",default:0,uniform:"posZ",min:-200,max:200,step:.1,ui:{label:"pos z",control:"slider",category:"view",enabledBy:"viewMode"}},fieldOfView:{type:"float",default:60,uniform:"fieldOfView",min:10,max:150,step:1,ui:{label:"field of view",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},sizeDistance:{type:"float",default:0,uniform:"sizeDistance",min:0,max:500,step:1,ui:{label:"size fade distance",control:"slider",category:"distance",enabledBy:"viewMode"}},brightnessDistance:{type:"float",default:0,uniform:"brightnessDistance",min:0,max:500,step:1,ui:{label:"brightness fade distance",control:"slider",category:"distance",enabledBy:"viewMode"}},aperture:{type:"float",default:0,uniform:"aperture",min:0,max:20,step:.1,ui:{label:"aperture",control:"slider",category:"focus",enabledBy:"viewMode"}},focalDistance:{type:"float",default:80,uniform:"focalDistance",min:1,max:500,step:1,ui:{label:"focal dist",control:"slider",category:"focus",enabledBy:"viewMode"}}},paramAliases:{rotationVariation:"rotationVar"},passes:[{name:"depthKeys",type:"compute",program:"depthKeys",conditions:{runIf:[{uniform:"blendMode",equals:1}],skipIf:[{uniform:"viewMode",equals:0}]},inputs:{xyzTex:"global_xyz"},uniforms:{viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",posZ:"posZ"},outputs:{fragColor:"depthOrderA"}},...Array.from({length:22},(n,e)=>({name:`depthMerge${e}`,type:"compute",program:"depthMerge",conditions:{runIf:[{uniform:"blendMode",equals:1}],skipIf:[{uniform:"viewMode",equals:0}]},inputs:{orderTex:e%2===0?"depthOrderA":"depthOrderB"},uniforms:{runLength:2**e},outputs:{fragColor:e%2===0?"depthOrderB":"depthOrderA"}})),{name:"spriteMeanTiles",type:"compute",program:"spriteMeanTiles",conditions:{runIf:[{uniform:"shapeMode",equals:0}],skipIf:[{uniform:"aperture",equals:0},{uniform:"viewMode",equals:0}]},inputs:{spriteTex:"tex"},uniforms:{shapeMode:"shapeMode",aperture:"aperture",viewMode:"viewMode"},outputs:{fragColor:"spriteMeanTiles"}},{name:"spriteMean",type:"compute",program:"spriteMean",conditions:{skipIf:[{uniform:"aperture",equals:0},{uniform:"viewMode",equals:0}]},inputs:{tilesTex:"spriteMeanTiles"},uniforms:{shapeMode:"shapeMode",aperture:"aperture",viewMode:"viewMode"},outputs:{fragColor:"spriteMean"}},{name:"clearDefocus",program:"clearDefocus",conditions:{runIf:[{uniform:"blendMode",equals:0}],skipIf:[{uniform:"aperture",equals:0},{uniform:"viewMode",equals:0}]},uniforms:{clearValue:0},outputs:{fragColor:"defocus"}},{name:"depositDefocus",program:"deposit",conditions:{runIf:[{uniform:"blendMode",equals:0}],skipIf:[{uniform:"aperture",equals:0},{uniform:"viewMode",equals:0}]},drawMode:"billboards",count:"input",blend:!0,inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba",orderTex:"depthOrderA",spriteTex:"tex",spriteMeanTex:"spriteMean"},uniforms:{shapeMode:"shapeMode",blendMode:"blendMode",blurLayer:1,depositOpacity:"depositOpacity",density:"density",pointSize:"pointSize",sizeVariation:"sizeVariation",rotationVar:"rotationVar",seed:"seed",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY",posZ:"posZ",fieldOfView:"fieldOfView",sizeDistance:"sizeDistance",brightnessDistance:"brightnessDistance",aperture:"aperture",focalDistance:"focalDistance"},outputs:{fragColor:"defocus"}},{name:"diffuse",program:"diffuse",inputs:{trailTex:"global_billboard_trail",defocusTex:"defocus"},uniforms:{intensity:"intensity",aperture:"aperture",viewMode:"viewMode",blendMode:"blendMode"},outputs:{fragColor:"global_billboard_trail"}},{name:"copy",program:"copy",inputs:{sourceTex:"global_billboard_trail"},outputs:{fragColor:"global_billboard_trail"}},{name:"deposit",program:"deposit",drawMode:"billboards",count:"input",blend:!0,conditions:{runIf:[{uniform:"blendMode",equals:0}]},inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba",orderTex:"depthOrderA",spriteTex:"tex",spriteMeanTex:"spriteMean"},uniforms:{shapeMode:"shapeMode",blendMode:"blendMode",blurLayer:0,depositOpacity:"depositOpacity",density:"density",pointSize:"pointSize",sizeVariation:"sizeVariation",rotationVar:"rotationVar",seed:"seed",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY",posZ:"posZ",fieldOfView:"fieldOfView",sizeDistance:"sizeDistance",brightnessDistance:"brightnessDistance",aperture:"aperture",focalDistance:"focalDistance"},outputs:{fragColor:"global_billboard_trail"}},{name:"deposit_alpha",program:"deposit",drawMode:"billboards",count:"input",blend:["ONE","ONE_MINUS_SRC_ALPHA"],conditions:{runIf:[{uniform:"blendMode",equals:1}]},inputs:{xyzTex:"global_xyz",rgbaTex:"global_rgba",orderTex:"depthOrderA",spriteTex:"tex",spriteMeanTex:"spriteMean"},uniforms:{shapeMode:"shapeMode",blendMode:"blendMode",blurLayer:0,depositOpacity:"depositOpacity",density:"density",pointSize:"pointSize",sizeVariation:"sizeVariation",rotationVar:"rotationVar",seed:"seed",viewMode:"viewMode",rotateX:"rotateX",rotateY:"rotateY",rotateZ:"rotateZ",viewScale:"viewScale",posX:"posX",posY:"posY",posZ:"posZ",fieldOfView:"fieldOfView",sizeDistance:"sizeDistance",brightnessDistance:"brightnessDistance",aperture:"aperture",focalDistance:"focalDistance"},outputs:{fragColor:"global_billboard_trail"}},{name:"blend",program:"blend",inputs:{inputTex:"inputTex",trailTex:"global_billboard_trail"},uniforms:{inputIntensity:"inputIntensity",blendMode:"blendMode"},outputs:{fragColor:"outputTex"}}].flatMap(n=>n.program!=="deposit"&&n.program!=="depthKeys"?[n]:(n.name==="depositDefocus"||n.program==="depthKeys"?[1,2]:[0,1,2]).map(o=>({...n,name:`${n.name}_${o}`,defines:{VIEW_MODE:o,...n.program==="deposit"?{BLEND_MODE:n.name==="deposit_alpha"?1:0,BLUR_LAYER:n.name==="depositDefocus"?1:0}:{}},conditions:{...n.conditions,runIf:[...n.conditions?.runIf||[],{uniform:"viewMode",equals:o}]}})))});var r={blend:{glsl:`#version 300 es
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
`},clearDefocus:{glsl:`#version 300 es
precision highp float;
uniform float clearValue;
out vec4 fragColor;
void main() {
    fragColor = vec4(clearValue);
}
`,wgsl:`@group(0) @binding(0) var<uniform> clearValue: f32;
@fragment
fn main() -> @location(0) vec4f {
    return vec4f(clearValue);
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
uniform sampler2D orderTex;
uniform vec2 resolution;
uniform float density;
uniform float pointSize;
uniform float sizeVariation;
uniform float rotationVar;
uniform float seed;
uniform int shapeMode;
const int blendMode = BLEND_MODE;
const int blurLayer = BLUR_LAYER;

// 3D viewport uniforms
const int viewMode = VIEW_MODE;
uniform float rotateX;
uniform float rotateY;
uniform float rotateZ;
uniform float viewScale;
uniform float posX;
uniform float posY;
uniform float posZ;
uniform float fieldOfView;
uniform float sizeDistance;
uniform float brightnessDistance;
uniform float aperture;
uniform float focalDistance;

out vec4 vColor;
out vec2 vSpriteUV;
out float vBlurRadius;

uint hash_uint(uint s) {
    uint state = s * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float hash(float n) {
    return float(hash_uint(floatBitsToUint(n + seed))) / 4294967295.0;
}

void main() {
    vBlurRadius = 0.0;
#if BLUR_LAYER == 1
    if (aperture <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vColor = vec4(0.0);
        vSpriteUV = vec2(0.0);
        return;
    }
#endif
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
    
    if (blendMode == 1 && viewMode != 0) {
        particleID = int(texelFetch(orderTex, ivec2(particleID % stateSize, particleID / stateSize), 0).g);
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
    float cameraDepth = 80.0;
    float cameraDistance = 0.0;
    float projectedScale = 1.0;
    
    if (viewMode == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = pos.xy * 2.0 - 1.0;
    } else {
        // 3D mode: apply rotation and orthographic projection
        vec3 p = pos.xyz;
        
        // Detect if this is a 2D system (coords in 0-1) or 3D attractor (coords \xB140)
        bool is2DSystem = viewMode == 1 && abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
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
        p.z += posZ;
        cameraDepth = 80.0 - p.z;
        cameraDistance = length(vec3(p.xy, cameraDepth));
        
        // Orthographic projection with scale
        if (viewMode == 2) {
            // Camera looks down -Z from z=80. Reject the near plane before division.
            if (cameraDepth <= 0.1) {
                gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
                vColor = vec4(0.0);
                vSpriteUV = vec2(0.0);
                return;
            }
            float focalLength = 1.0 / tan(clamp(fieldOfView, 10.0, 150.0) * 0.00872664626);
            clipPos = p.xy * focalLength * viewScale / cameraDepth;
            clipPos.x *= resolution.y / resolution.x;
            projectedScale = 80.0 * focalLength * viewScale / (1.732050808 * cameraDepth);
        } else if (is2DSystem) {
            clipPos = p.xy * 3.5 * viewScale;
        } else {
            clipPos = p.xy / 40.0 * viewScale;
        }
    }
    
    // Per-particle size variation (seeded deterministic)
    float sizeNoise = hash(float(particleID));
    float sizeMultiplier = 1.0 - (sizeVariation / 100.0) * (sizeNoise - 0.5);
    float sizeFade = 1.0;
    float brightnessFade = 1.0;
    float blurPixels = 0.0;
    if (viewMode != 0) {
        if (sizeDistance > 0.0) sizeFade = 1.0 - smoothstep(0.0, sizeDistance, cameraDistance);
        if (brightnessDistance > 0.0) brightnessFade = 1.0 - smoothstep(0.0, brightnessDistance, cameraDistance);
        blurPixels = min(32.0, aperture * abs(cameraDepth - focalDistance) / max(abs(cameraDepth), 0.1));
    }
    float baseSize = pointSize * sizeMultiplier * projectedScale;
    // Textured blur integrates nodes across the whole source square. A
    // procedural footprint needs only its center's displacement as padding.
    float blurRadius = blurPixels / max(baseSize, 0.001);
    // Match the normalized fragment kernel's minimum support. Keep the
    // requested radius for interpolation and resolution-layer selection.
    float supportRadius = blurPixels > 0.0 ? max(blurRadius, 0.62582015) : 0.0;
    float supportPixels = blurPixels > 0.0 ? max(blurPixels, baseSize * 0.62582015) : 0.0;
    // Only broad, fully softened additive footprints can use the smaller
    // target. Complementary weights prevent a focus transition from popping.
    float lowWeight = blendMode == 0 ? smoothstep(4.0, 8.0, blurPixels * sizeFade) * smoothstep(0.5, 1.0, blurRadius) : 0.0;
    float layerWeight = blurLayer == 1 ? lowWeight : 1.0 - lowWeight;
    float blurPadding = blurPixels > 0.0 ? (shapeMode == 0 ? 0.5 : (shapeMode == 5 ? 0.04 : 0.0)) : 0.0;
    float finalSize = (baseSize * (1.0 + 2.0 * blurPadding) + 2.0 * supportPixels) * sizeFade;
    if (finalSize <= 0.0 || brightnessFade <= 0.0 || layerWeight <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        vColor = vec4(0.0);
        vSpriteUV = vec2(0.0);
        return;
    }
    vBlurRadius = blurRadius;
    
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
    vColor = col * brightnessFade * layerWeight;
    
    // Sprite UV coordinates (0-1 range)
    vSpriteUV = offset * (0.5 + blurPadding + supportRadius) + 0.5;
}
`,fragment:`#version 300 es
precision highp float;

// Billboard Deposit Fragment Shader - SDF shapes or sprite texture

uniform sampler2D spriteTex;
uniform sampler2D spriteMeanTex;
uniform int shapeMode;
uniform float depositOpacity;

in vec4 vColor;
in vec2 vSpriteUV;
in float vBlurRadius;

out vec4 fragColor;

vec4 shadeSprite(vec2 uv) {
    float opacity = depositOpacity / 100.0;

    if (shapeMode == 0) {
        // Texture mode: sample sprite texture
        vec4 spriteColor = texture(spriteTex, uv);
        return vec4(spriteColor.rgb * vColor.rgb, spriteColor.a * vColor.a) * opacity;
    } else {
        // Procedural SDF shapes
        vec2 p = uv - 0.5;
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
            return vec4(vColor.rgb * alpha, alpha * vColor.a) * opacity;
        }

        alpha = 1.0 - smoothstep(-0.02, 0.02, sdf);
        return vec4(vColor.rgb * alpha, alpha * vColor.a) * opacity;
    }
}

vec4 blurSample(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
    return shadeSprite(uv);
}

// Each source-grid contribution has continuous, symmetric support. Keeping
// their locations preserves both color and coverage centers during defocus.
float blurWeight(vec2 uv, vec2 center, float expansion) {
    vec2 p = (uv - center) / expansion;
    float gaussian = exp(-dot(p, p) / 0.0648) * (1.0 - smoothstep(0.45, 0.5, length(p)));
    // Integral of the tapered radial kernel is 0.19724318. Its minimum
    // expansion keeps the normalized peak <= 1 without discarding mass.
    float normalization = 1.0 / (0.19724318 * expansion * expansion);
    return gaussian * normalization;
}

vec4 shadeParticle() {
#if VIEW_MODE == 0
    return shadeSprite(vSpriteUV);
#else
    if (vBlurRadius <= 0.0) return shadeSprite(vSpriteUV);
    float expansion = max(1.0 + 2.0 * vBlurRadius, 2.2516403);
    vec4 blurred = vec4(0.0);
    if (shapeMode == 0) {
        for (int y = 0; y < 5; y++) {
            for (int x = 0; x < 5; x++) {
                vec4 source = texelFetch(spriteMeanTex, ivec2(x, y), 0);
                blurred += source * blurWeight(vSpriteUV, vec2(x, y) / 4.0, expansion);
            }
        }
        blurred *= vColor * (depositOpacity / 100.0);
    } else {
        vec4 meanColor = texelFetch(spriteMeanTex, ivec2(0), 0) * vColor * (depositOpacity / 100.0);
        vec2 center = shapeMode == 5 ? vec2(0.5, 0.54) : vec2(0.5);
        blurred = meanColor * blurWeight(vSpriteUV, center, expansion);
    }
    if (vBlurRadius >= 0.5) return blurred;
    return mix(blurSample(vSpriteUV), blurred, smoothstep(0.0, 0.5, vBlurRadius));
#endif
}

void main() {
    vec4 color = shadeParticle();
    fragColor = color;
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
    rotateX: f32,
    rotateY: f32,
    rotateZ: f32,
    viewScale: f32,
    posX: f32,
    posY: f32,
    posZ: f32,
    fieldOfView: f32,
    sizeDistance: f32,
    brightnessDistance: f32,
    aperture: f32,
    focalDistance: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) spriteUV: vec2<f32>,
    @location(2) blurRadius: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;
@group(0) @binding(2) var rgbaTex: texture_2d<f32>;
@group(0) @binding(6) var orderTex: texture_2d<f32>;

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

    if (BLUR_LAYER == 1 && (VIEW_MODE == 0 || u.aperture <= 0.0 || BLEND_MODE != 0)) {
        out.position = vec4f(2.0, 2.0, 0.0, 1.0);
        return out;
    }
    // Each quad uses 6 vertices (2 triangles)
    var particleID = i32(vertexIndex) / 6;
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
    
    if (BLEND_MODE == 1 && VIEW_MODE != 0) {
        particleID = i32(textureLoad(orderTex, vec2i(particleID % stateSize, particleID / stateSize), 0).g);
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
    var cameraDepth = 80.0;
    var cameraDistance = 0.0;
    var projectedScale = 1.0;
    
    if (VIEW_MODE == 0) {
        // 2D mode: positions are normalized 0..1
        clipPos = vec2<f32>(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0);
    } else {
        // 3D mode: apply rotation and orthographic projection
        var p = pos.xyz;
        
        // Detect if this is a 2D system or 3D attractor
        let is2DSystem = VIEW_MODE == 1 && abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0;
        
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
        p.z += u.posZ;
        cameraDepth = 80.0 - p.z;
        cameraDistance = length(vec3f(p.xy, cameraDepth));
        
        // Orthographic projection with scale
        if (VIEW_MODE == 2) {
            if (cameraDepth <= 0.1) {
                out.position = vec4f(2.0, 2.0, 0.0, 1.0);
                out.color = vec4f(0.0);
                out.spriteUV = vec2f(0.0);
                return out;
            }
            let focalLength = 1.0 / tan(clamp(u.fieldOfView, 10.0, 150.0) * 0.00872664626);
            clipPos = p.xy * focalLength * u.viewScale / cameraDepth;
            clipPos.x *= u.resolution.y / u.resolution.x;
            projectedScale = 80.0 * focalLength * u.viewScale / (1.732050808 * cameraDepth);
        } else if (is2DSystem) {
            clipPos = p.xy * 3.5 * u.viewScale;
        } else {
            clipPos = p.xy / 40.0 * u.viewScale;
        }
        clipPos.y = -clipPos.y;
    }
    
    // Per-particle size variation (seeded deterministic)
    let sizeNoise = hash(f32(particleID));
    let sizeMultiplier = 1.0 - (u.sizeVariation / 100.0) * (sizeNoise - 0.5);
    var sizeFade = 1.0;
    var brightnessFade = 1.0;
    var blurPixels = 0.0;
    if (VIEW_MODE != 0) {
        if (u.sizeDistance > 0.0) { sizeFade = 1.0 - smoothstep(0.0, u.sizeDistance, cameraDistance); }
        if (u.brightnessDistance > 0.0) { brightnessFade = 1.0 - smoothstep(0.0, u.brightnessDistance, cameraDistance); }
        blurPixels = min(32.0, u.aperture * abs(cameraDepth - u.focalDistance) / max(abs(cameraDepth), 0.1));
    }
    let baseSize = u.pointSize * sizeMultiplier * projectedScale;
    // Keep the source square padding only for textured spatial nodes.
    let blurRadius = blurPixels / max(baseSize, 0.001);
    // Match the normalized kernel's minimum support without changing the
    // requested radius used by interpolation and resolution-layer selection.
    let supportRadius = select(0.0, max(blurRadius, 0.62582015), blurPixels > 0.0);
    let supportPixels = select(0.0, max(blurPixels, baseSize * 0.62582015), blurPixels > 0.0);
    let lowWeight = select(0.0, smoothstep(4.0, 8.0, blurPixels * sizeFade) * smoothstep(0.5, 1.0, blurRadius), BLEND_MODE == 0);
    let layerWeight = select(1.0 - lowWeight, lowWeight, BLUR_LAYER == 1);
    let proceduralPadding = select(0.0, 0.04, u.shapeMode == 5);
    let blurPadding = select(0.0, select(proceduralPadding, 0.5, u.shapeMode == 0), blurPixels > 0.0);
    let finalSize = (baseSize * (1.0 + 2.0 * blurPadding) + 2.0 * supportPixels) * sizeFade;
    if (finalSize <= 0.0 || brightnessFade <= 0.0 || layerWeight <= 0.0) {
        out.position = vec4f(2.0, 2.0, 0.0, 1.0);
        out.color = vec4f(0.0);
        out.spriteUV = vec2f(0.0);
        return out;
    }
    out.blurRadius = blurRadius;
    
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
    var finalPos = clipPos + rotatedOffset * sizeClip;
    // Perspective world positions and local sprite geometry share the same
    // presentation Y convention. Preserve the legacy flat/ortho convention.
    if (VIEW_MODE == 2) { finalPos.y = clipPos.y - rotatedOffset.y * sizeClip.y; }
    
    out.position = vec4<f32>(finalPos, 0.0, 1.0);
    out.color = col * brightnessFade * layerWeight;
    
    // Sprite UV coordinates (0-1 range)
    out.spriteUV = offset * (0.5 + blurPadding + supportRadius) + 0.5;

    return out;
}

@group(0) @binding(3) var spriteTex: texture_2d<f32>;
@group(0) @binding(4) var spriteSampler: sampler;
@group(0) @binding(5) var spriteMeanTex: texture_2d<f32>;

fn shadeSprite(uv: vec2f, color: vec4f) -> vec4f {
    let opacity = u.depositOpacity / 100.0;

    if (u.shapeMode == 0) {
        // Texture mode: sample sprite texture
        let spriteColor = textureSampleLevel(spriteTex, spriteSampler, uv, 0.0);
        return vec4<f32>(spriteColor.rgb * color.rgb, spriteColor.a * color.a) * opacity;
    }

    // Procedural SDF shapes
    let p = uv - 0.5;
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
        return vec4<f32>(color.rgb * alpha, alpha * color.a) * opacity;
    }

    alpha = 1.0 - smoothstep(-0.02, 0.02, sdf);
    return vec4<f32>(color.rgb * alpha, alpha * color.a) * opacity;
}

fn blurSample(uv: vec2f, color: vec4f) -> vec4f {
    if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) { return vec4f(0.0); }
    return shadeSprite(uv, color);
}

// Continuous source-grid footprints retain RGBA mass and spatial centers.
fn blurWeight(uv: vec2f, center: vec2f, expansion: f32) -> f32 {
    let p = (uv - center) / expansion;
    let gaussian = exp(-dot(p, p) / 0.0648) * (1.0 - smoothstep(0.45, 0.5, length(p)));
    // The tapered radial kernel has integral 0.19724318. Minimum expansion
    // bounds its normalized peak without discarding source contribution.
    let normalization = 1.0 / (0.19724318 * expansion * expansion);
    return gaussian * normalization;
}

fn shadeParticle(in: VertexOutput) -> vec4f {
    if (VIEW_MODE == 0) { return shadeSprite(in.spriteUV, in.color); }
    if (in.blurRadius <= 0.0) { return shadeSprite(in.spriteUV, in.color); }
    let expansion = max(1.0 + 2.0 * in.blurRadius, 2.2516403);
    var blurred = vec4f(0.0);
    if (u.shapeMode == 0) {
        for (var y = 0; y < 5; y++) {
            for (var x = 0; x < 5; x++) {
                let source = textureLoad(spriteMeanTex, vec2i(x, y), 0);
                blurred += source * blurWeight(in.spriteUV, vec2f(f32(x), f32(y)) / 4.0, expansion);
            }
        }
        blurred *= in.color * (u.depositOpacity / 100.0);
    } else {
        let meanColor = textureLoad(spriteMeanTex, vec2i(0), 0) * in.color * (u.depositOpacity / 100.0);
        let center = select(vec2f(0.5), vec2f(0.5, 0.54), u.shapeMode == 5);
        blurred = meanColor * blurWeight(in.spriteUV, center, expansion);
    }
    if (in.blurRadius >= 0.5) { return blurred; }
    return mix(blurSample(in.spriteUV, in.color), blurred, smoothstep(0.0, 0.5, in.blurRadius));
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let color = shadeParticle(in);
    return color;
}
`},depthKeys:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D xyzTex;
const int viewMode = VIEW_MODE;
uniform float rotateX;
uniform float rotateY;
uniform float posZ;
out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 dims = textureSize(xyzTex, 0);
    vec4 pos = texelFetch(xyzTex, coord, 0);
    vec3 p = pos.xyz;
    if (viewMode == 1 && abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0) {
        p.xy -= 0.5;
        p.z = 0.0;
    }
    p = vec3(p.x, p.y * cos(rotateX) - p.z * sin(rotateX), p.y * sin(rotateX) + p.z * cos(rotateX));
    p = vec3(p.x * cos(rotateY) + p.z * sin(rotateY), p.y, -p.x * sin(rotateY) + p.z * cos(rotateY));
    // Ascending negative camera depth gives back-to-front draw order.
    // Original slot breaks ties and retains per-particle identity.
    float depth = p.z + posZ - 80.0;
    // A non-finite key breaks the merge ordering and can duplicate valid IDs.
    float key = pos.w >= 0.5 && abs(depth) <= 3.402823466e38 ? depth : 3.402823466e38;
    fragColor = vec4(key, float(coord.y * dims.x + coord.x), 0.0, 1.0);
}
`,wgsl:`struct Uniforms {
    rotateX: f32,
    rotateY: f32,
    posZ: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var xyzTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let coord = vec2i(fragCoord.xy);
    let dims = vec2i(textureDimensions(xyzTex, 0));
    let pos = textureLoad(xyzTex, coord, 0);
    var p = pos.xyz;
    if (VIEW_MODE == 1 && abs(p.z) < 1.0 && p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0) {
        p = vec3f(p.xy - 0.5, 0.0);
    }
    p = vec3f(p.x, p.y * cos(u.rotateX) - p.z * sin(u.rotateX), p.y * sin(u.rotateX) + p.z * cos(u.rotateX));
    p = vec3f(p.x * cos(u.rotateY) + p.z * sin(u.rotateY), p.y, -p.x * sin(u.rotateY) + p.z * cos(u.rotateY));
    let depth = p.z + u.posZ - 80.0;
    let key = select(3.402823466e38, depth, pos.w >= 0.5 && abs(depth) <= 3.402823466e38);
    return vec4f(key, f32(coord.y * dims.x + coord.x), 0.0, 1.0);
}
`},depthMerge:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D orderTex;
uniform int runLength;
out vec4 fragColor;

vec2 keyAt(int index, int width) {
    return texelFetch(orderTex, ivec2(index % width, index / width), 0).rg;
}
bool before(vec2 a, vec2 b) {
    return a.x < b.x || (a.x == b.x && a.y <= b.y);
}

void main() {
    ivec2 dims = textureSize(orderTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);
    int index = coord.y * dims.x + coord.x;
    int count = dims.x * dims.y;
    if (runLength >= count) {
        fragColor = texelFetch(orderTex, coord, 0);
        return;
    }
    int start = (index / (2 * runLength)) * (2 * runLength);
    int lengthA = min(runLength, count - start);
    int lengthB = min(runLength, count - start - lengthA);
    int diagonal = index - start;
    int low = max(0, diagonal - lengthB);
    int high = min(diagonal, lengthA);
    // Find the partition for this output position in the two sorted runs.
    for (int step = 0; step < 22 && low < high; step++) {
        int mid = (low + high) / 2;
        int other = diagonal - mid;
        if (mid < lengthA && other > 0 && before(keyAt(start + mid, dims.x), keyAt(start + lengthA + other - 1, dims.x))) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    int other = diagonal - low;
    vec2 a = low < lengthA ? keyAt(start + low, dims.x) : vec2(3.402823466e38);
    vec2 b = other < lengthB ? keyAt(start + lengthA + other, dims.x) : vec2(3.402823466e38);
    fragColor = vec4(before(a, b) ? a : b, 0.0, 1.0);
}
`,wgsl:`@group(0) @binding(0) var orderTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> runLength: i32;

fn keyAt(index: i32, width: i32) -> vec2f {
    return textureLoad(orderTex, vec2i(index % width, index / width), 0).rg;
}
fn before(a: vec2f, b: vec2f) -> bool {
    return a.x < b.x || (a.x == b.x && a.y <= b.y);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let dims = vec2i(textureDimensions(orderTex, 0));
    let coord = vec2i(fragCoord.xy);
    let index = coord.y * dims.x + coord.x;
    let count = dims.x * dims.y;
    if (runLength >= count) { return textureLoad(orderTex, coord, 0); }
    let start = (index / (2 * runLength)) * (2 * runLength);
    let lengthA = min(runLength, count - start);
    let lengthB = min(runLength, count - start - lengthA);
    let diagonal = index - start;
    var low = max(0, diagonal - lengthB);
    var high = min(diagonal, lengthA);
    for (var step = 0; step < 22 && low < high; step++) {
        let mid = (low + high) / 2;
        let other = diagonal - mid;
        if (mid < lengthA && other > 0 && before(keyAt(start + mid, dims.x), keyAt(start + lengthA + other - 1, dims.x))) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    let other = diagonal - low;
    var a = vec2f(3.402823466e38);
    var b = vec2f(3.402823466e38);
    if (low < lengthA) { a = keyAt(start + low, dims.x); }
    if (other < lengthB) { b = keyAt(start + lengthA + other, dims.x); }
    return vec4f(select(b, a, before(a, b)), 0.0, 1.0);
}
`},diffuse:{glsl:`#version 300 es
precision highp float;

// Diffuse Pass - Decay existing trail

uniform sampler2D trailTex;
uniform sampler2D defocusTex;
uniform vec2 resolution;
uniform float intensity;
uniform float aperture;
uniform int viewMode;
uniform int blendMode;

out vec4 fragColor;

vec4 sampleDefocus(vec2 uv) {
    // Internal targets use nearest sampling. Interpolate all four channels
    // explicitly so the lower-resolution footprint remains smooth.
    ivec2 dims = textureSize(defocusTex, 0);
    vec2 p = uv * vec2(dims) - 0.5;
    ivec2 lo = ivec2(floor(p));
    vec2 f = fract(p);
    ivec2 a = clamp(lo, ivec2(0), dims - 1);
    ivec2 b = clamp(lo + 1, ivec2(0), dims - 1);
    return mix(mix(texelFetch(defocusTex, a, 0), texelFetch(defocusTex, ivec2(b.x, a.y), 0), f.x),
        mix(texelFetch(defocusTex, ivec2(a.x, b.y), 0), texelFetch(defocusTex, b, 0), f.x), f.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    
    // Sample the trail texture directly (no blur)
    vec4 trailColor = texture(trailTex, uv);
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    float decay = clamp(intensity / 100.0, 0.0, 1.0);
    fragColor = clamp(trailColor * decay, 0.0, 1.0);
    if (blendMode == 0 && aperture > 0.0 && viewMode != 0) fragColor += sampleDefocus(uv);
}
`,wgsl:`// Diffuse Pass - Decay existing trail

struct Uniforms {
    resolution: vec2<f32>,
    intensity: f32,
    aperture: f32,
    viewMode: i32,
    blendMode: i32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var trailTex: texture_2d<f32>;
@group(0) @binding(2) var trailSampler: sampler;
@group(0) @binding(3) var defocusTex: texture_2d<f32>;

fn sampleDefocus(uv: vec2f) -> vec4f {
    let dims = vec2i(textureDimensions(defocusTex));
    let p = uv * vec2f(dims) - 0.5;
    let lo = vec2i(floor(p));
    let f = fract(p);
    let a = clamp(lo, vec2i(0), dims - 1);
    let b = clamp(lo + 1, vec2i(0), dims - 1);
    return mix(mix(textureLoad(defocusTex, a, 0), textureLoad(defocusTex, vec2i(b.x, a.y), 0), f.x),
        mix(textureLoad(defocusTex, vec2i(a.x, b.y), 0), textureLoad(defocusTex, b, 0), f.x), f.y);
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / u.resolution;
    
    // Sample the trail texture directly (no blur)
    let trailColor = textureSample(trailTex, trailSampler, uv);
    
    // Apply intensity decay (persistence)
    // intensity=100 means no decay, intensity=0 means instant fade
    let decay = clamp(u.intensity / 100.0, 0.0, 1.0);
    let decayed = clamp(trailColor * decay, vec4<f32>(0.0), vec4<f32>(1.0));
    if (u.blendMode != 0 || u.aperture <= 0.0 || u.viewMode == 0) { return decayed; }
    return decayed + sampleDefocus(uv);
}
`},spriteMean:{glsl:`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tilesTex;
uniform int shapeMode;
uniform float aperture;
uniform int viewMode;
out vec4 fragColor;

float proceduralCoverage() {
    // Means of the same 5x5 centered SDF samples, evaluated in double
    // precision and rounded once to f32. Recompute if a shape changes.
    // Fixed values avoid driver-dependent coverage drift during defocus.
    if (shapeMode == 1) return 0.713220537;
    if (shapeMode == 2) return 0.310907274;
    if (shapeMode == 3) return 0.680000007;
    if (shapeMode == 4) return 0.519999981;
    if (shapeMode == 5) return 0.0951406509;
    if (shapeMode == 6) return 0.103062622;
    return 0.362012237; // Soft shape and the existing fallback.
}

void main() {
    if (aperture <= 0.0 || viewMode == 0) { fragColor = vec4(0.0); return; }
    if (shapeMode != 0) {
        fragColor = vec4(proceduralCoverage());
        return;
    }
    ivec2 origin = ivec2(gl_FragCoord.xy) * 32;
    vec4 total = vec4(0.0);
    for (int y = 0; y < 32; y++) {
        for (int x = 0; x < 32; x++) {
            total += texelFetch(tilesTex, origin + ivec2(x, y), 0);
        }
    }
    fragColor = total;
}
`,wgsl:`struct Uniforms {
    shapeMode: i32,
    aperture: f32,
    viewMode: i32,
}
@group(0) @binding(0) var tilesTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> u: Uniforms;

fn proceduralCoverage() -> f32 {
    // Means of the same 5x5 centered SDF samples, evaluated in double
    // precision and rounded once to f32. Recompute if a shape changes.
    // Fixed values avoid driver-dependent coverage drift during defocus.
    if (u.shapeMode == 1) { return 0.713220537; }
    if (u.shapeMode == 2) { return 0.310907274; }
    if (u.shapeMode == 3) { return 0.680000007; }
    if (u.shapeMode == 4) { return 0.519999981; }
    if (u.shapeMode == 5) { return 0.0951406509; }
    if (u.shapeMode == 6) { return 0.103062622; }
    return 0.362012237; // Soft shape and the existing fallback.
}

@fragment
fn main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    if (u.aperture <= 0.0 || u.viewMode == 0) { return vec4f(0.0); }
    if (u.shapeMode != 0) {
        return vec4f(proceduralCoverage());
    }
    let origin = vec2i(coord.xy) * 32;
    var total = vec4f(0.0);
    for (var y = 0; y < 32; y++) {
        for (var x = 0; x < 32; x++) {
            total += textureLoad(tilesTex, origin + vec2i(x, y), 0);
        }
    }
    return total;
}
`},spriteMeanTiles:{glsl:`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D spriteTex;
uniform int shapeMode;
uniform float aperture;
uniform int viewMode;
out vec4 fragColor;

// Each of 5x5 spatial nodes has 32x32 reduction tiles. Bilinear weights
// preserve source mass and first moments independently for all RGBA channels.
void main() {
    if (shapeMode != 0 || aperture <= 0.0 || viewMode == 0) { fragColor = vec4(0.0); return; }
    ivec2 dims = textureSize(spriteTex, 0);
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 node = coord / 32;
    ivec2 tile = coord % 32;
    ivec2 start = max(tile * dims / 32, (node - 1) * dims / 4 - 1);
    ivec2 end = min((tile + 1) * dims / 32, (node + 1) * dims / 4 + 1);
    vec4 total = vec4(0.0);
    for (int y = start.y; y < end.y; y++) {
        for (int x = start.x; x < end.x; x++) {
            vec2 uv = (vec2(x, y) + 0.5) / vec2(dims);
            vec2 weight = max(vec2(0.0), 1.0 - abs(uv * 4.0 - vec2(node)));
            total += texelFetch(spriteTex, ivec2(x, y), 0) * (weight.x * weight.y);
        }
    }
    fragColor = total / float(dims.x * dims.y);
}
`,wgsl:`struct Uniforms {
    shapeMode: i32,
    aperture: f32,
    viewMode: i32,
}
@group(0) @binding(0) var spriteTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> u: Uniforms;

// Bilinear spatial weights preserve RGBA mass and first moments.
@fragment
fn main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    if (u.shapeMode != 0 || u.aperture <= 0.0 || u.viewMode == 0) { return vec4f(0.0); }
    let dims = vec2i(textureDimensions(spriteTex, 0));
    let node = vec2i(coord.xy) / 32;
    let tile = vec2i(coord.xy) % 32;
    let start = max(tile * dims / 32, (node - vec2i(1)) * dims / 4 - vec2i(1));
    let end = min((tile + vec2i(1)) * dims / 32, (node + vec2i(1)) * dims / 4 + vec2i(1));
    var total = vec4f(0.0);
    for (var y = start.y; y < end.y; y++) {
        for (var x = start.x; x < end.x; x++) {
            let uv = (vec2f(f32(x), f32(y)) + 0.5) / vec2f(dims);
            let weight = max(vec2f(0.0), 1.0 - abs(uv * 4.0 - vec2f(node)));
            total += textureLoad(spriteTex, vec2i(x, y), 0) * (weight.x * weight.y);
        }
    }
    return total / f32(dims.x * dims.y);
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
| blendMode | int | additive | additive/alpha | Blend mode |
| depositOpacity | float | 20 | 1-100 | Deposit opacity \u2014 scales particle contribution to reduce additive blowout |
| pointSize | float | 8 | 1-64 | Point size |
| sizeVariation | float | 0 | 0-100 | Size variation |
| rotationVar | float | 0 | 0-100 | Rotation variation |
| seed | int | 42 | 0-1000 | Seed |
| density | float | 50 | 0-100 | Density |
| intensity | float | 75 | 0-100 | Trail intensity |
| inputIntensity | float | 10.15 | 0-100 | Input mix |
| viewMode | int | flat | flat/ortho/perspective | View |
| rotateX | float | 0.3 | 0-6.283185 | Rotate X |
| rotateY | float | 0 | 0-6.283185 | Rotate Y |
| rotateZ | float | 0 | 0-6.283185 | Rotate Z |
| viewScale | float | 0.8 | 0.1-10 | Zoom |
| posX | float | 0 | -50-50 | Pos X |
| posY | float | 0 | -50-50 | Pos Y |
| posZ | float | 0 | -200-200 | Move the landscape toward or away from the camera; positive values move it closer |
| fieldOfView | float | 60 | 10-150 | Vertical perspective field of view in degrees |
| sizeDistance | float | 0 | 0-500 | Distance at which particle size reaches zero; 0 disables the fade |
| brightnessDistance | float | 0 | 0-500 | Distance at which brightness and alpha reach zero; 0 disables the fade |
| aperture | float | 0 | 0-20 | Defocus strength in pixels; 0 keeps particles sharp |
| focalDistance | float | 80 | 1-500 | Distance along the camera axis where particles stay sharp |

Perspective mode uses world coordinates, with the camera at Z=80 looking down the negative Z axis. Rotations apply first; X, Y, and Z offsets then move the scene in camera space. Use \`heightGrid()\` after \`pointsEmit()\` to create an XZ landscape with Y elevation. The distance fades use distance from the camera; focus uses depth along its viewing axis. Set trail intensity to 0 for clean camera movement. Flat mode ignores distance controls. Orthographic mode keeps its existing coordinate interpretation.

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
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[n,e]of Object.entries(r))t.shaders[n]={...e}}t&&a&&(t.help=a);var c="render/pointsBillboardRender",d="render",f="pointsBillboardRender",v=t;export{v as default,c as effectId,f as effectName,a as help,d as namespace};
