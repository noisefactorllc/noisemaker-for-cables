/* mixer/distortion */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Distortion",namespace:"mixer",func:"distortion",tags:["blend","distort"],description:"Displace, reflect, and refract with two surfaces",globals:{tex:{type:"surface",default:"none",ui:{label:"source b"}},mapSource:{type:"int",default:1,uniform:"mapSource",choices:{sourceA:0,sourceB:1},ui:{label:"map source",control:"dropdown"}},mode:{type:"int",default:1,uniform:"mode",choices:{displace:0,refract:1,reflect:2},ui:{label:"mode",control:"dropdown"}},intensity:{type:"float",default:50,uniform:"intensity",min:0,max:100,ui:{label:"intensity",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{clamp:2,mirror:0,repeat:1},randChoices:[0,1],ui:{label:"wrap",control:"dropdown"}},smoothing:{type:"float",default:1,uniform:"smoothing",min:1,max:100,ui:{label:"smoothing",control:"slider",enabledBy:{param:"mode",neq:0}}},aberration:{type:"float",default:0,uniform:"aberration",min:0,max:25,ui:{label:"aberration",control:"slider",enabledBy:{param:"mode",eq:2}}},antialias:{type:"boolean",default:!1,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},defaultProgram:`search mixer, synth

cell()
.write(o0)

noise(ridges: true)
.distortion(tex: read(o0))
.write(o1)`,passes:[{name:"render",program:"distortion",inputs:{inputTex:"inputTex",tex:"tex"},outputs:{fragColor:"outputTex"}}]});var a={distortion:{glsl:`/*
 * Distortion mixer shader
 * Applies displacement, reflection, and refraction effects between two surfaces
 * Uses Sobel convolution to calculate surface normals from luminosity
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D tex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int mode;
uniform int mapSource;
uniform float intensity;
uniform int wrap;
uniform float smoothing;
uniform float aberration;
uniform bool antialias;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// Convert RGB to luminosity
float getLuminosity(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// Calculate surface normal from height map using Sobel convolution
vec3 calculateNormal(vec2 uv, vec2 texelSize, sampler2D mapTex) {
    // Apply smoothing to texel size for smoother normals
    vec2 sampleSize = texelSize * smoothing;
    
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
        vec3 texSample = texture(mapTex, uv + offsets[i]).rgb;
        float height = getLuminosity(texSample);
        dx += height * sobel_x[i];
        dy += height * sobel_y[i];
    }
    
    // Scale gradients by intensity
    float normalStrength = intensity * 0.1;
    dx *= normalStrength;
    dy *= normalStrength;
    
    // Construct normal from gradients
    vec3 normal = normalize(vec3(-dx, -dy, 1.0));
    
    return normal;
}

// Apply wrap mode to coordinates
vec2 wrapCoords(vec2 st) {
    if (wrap == 0) {
        // mirror
        st = abs(mod(st, 2.0) - 1.0);
        st = 1.0 - st;
    } else if (wrap == 1) {
        // repeat
        st = fract(st);
    } else if (wrap == 2) {
        // clamp
        st = clamp(st, 0.0, 1.0);
    }
    return st;
}

// Displacement effect based on color luminosity
vec4 applyDisplacement(vec2 uv, sampler2D mapTex, sampler2D targetTex) {
    vec4 mapColor = texture(mapTex, uv);
    float len = length(mapColor.rgb);
    
    vec2 offset;
    offset.x = cos(len * TAU) * (intensity * 0.001);
    offset.y = sin(len * TAU) * (intensity * 0.001);
    
    vec2 displacedUV = wrapCoords(uv + offset);

    if (antialias) {
        vec2 dx = dFdx(displacedUV);
        vec2 dy = dFdy(displacedUV);
        vec4 col = vec4(0.0);
        col += texture(targetTex, displacedUV + dx * -0.375 + dy * -0.125);
        col += texture(targetTex, displacedUV + dx *  0.125 + dy * -0.375);
        col += texture(targetTex, displacedUV + dx *  0.375 + dy *  0.125);
        col += texture(targetTex, displacedUV + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return texture(targetTex, displacedUV);
    }
}

// Refraction effect based on surface normal
vec4 applyRefraction(vec2 uv, vec2 texelSize, sampler2D mapTex, sampler2D targetTex) {
    vec3 normal = calculateNormal(uv, texelSize, mapTex);
    vec2 refractionOffset = normal.xy * (intensity * 0.0125);
    vec2 refractedUV = wrapCoords(uv + refractionOffset);

    if (antialias) {
        vec2 dx = dFdx(refractedUV);
        vec2 dy = dFdy(refractedUV);
        vec4 col = vec4(0.0);
        col += texture(targetTex, refractedUV + dx * -0.375 + dy * -0.125);
        col += texture(targetTex, refractedUV + dx *  0.125 + dy * -0.375);
        col += texture(targetTex, refractedUV + dx *  0.375 + dy *  0.125);
        col += texture(targetTex, refractedUV + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    } else {
        return texture(targetTex, refractedUV);
    }
}

// Reflection effect with chromatic aberration
vec4 applyReflection(vec2 uv, vec2 globalUV, vec2 texelSize, sampler2D mapTex, sampler2D targetTex) {
    vec3 normal = calculateNormal(uv, texelSize, mapTex);

    // Calculate incident vector for reflection, from center of full image
    vec3 incident = vec3(normalize(globalUV - 0.5), 100.0);
    
    // Calculate reflection vector
    vec3 reflectionVec = reflect(incident, normal);
    
    // Convert to 2D texture offset
    vec2 reflectionOffset = reflectionVec.xy * (intensity * 0.00005);
    
    // Apply chromatic aberration
    vec2 redOffset = reflectionOffset * (1.0 + aberration * 0.0075);
    vec2 greenOffset = reflectionOffset;
    vec2 blueOffset = reflectionOffset * (1.0 - aberration * 0.0075);

    vec2 redUV = wrapCoords(uv + redOffset);
    vec2 greenUV = wrapCoords(uv + greenOffset);
    vec2 blueUV = wrapCoords(uv + blueOffset);
    vec2 alphaUV = wrapCoords(uv + reflectionOffset);

    if (antialias) {
        vec2 dx = dFdx(greenUV);
        vec2 dy = dFdy(greenUV);

        float r = 0.0, g = 0.0, b = 0.0, a = 0.0;
        vec2 o1 = dx * -0.375 + dy * -0.125;
        vec2 o2 = dx *  0.125 + dy * -0.375;
        vec2 o3 = dx *  0.375 + dy *  0.125;
        vec2 o4 = dx * -0.125 + dy *  0.375;

        r += texture(targetTex, redUV + o1).r;
        r += texture(targetTex, redUV + o2).r;
        r += texture(targetTex, redUV + o3).r;
        r += texture(targetTex, redUV + o4).r;

        g += texture(targetTex, greenUV + o1).g;
        g += texture(targetTex, greenUV + o2).g;
        g += texture(targetTex, greenUV + o3).g;
        g += texture(targetTex, greenUV + o4).g;

        b += texture(targetTex, blueUV + o1).b;
        b += texture(targetTex, blueUV + o2).b;
        b += texture(targetTex, blueUV + o3).b;
        b += texture(targetTex, blueUV + o4).b;

        a += texture(targetTex, alphaUV + o1).a;
        a += texture(targetTex, alphaUV + o2).a;
        a += texture(targetTex, alphaUV + o3).a;
        a += texture(targetTex, alphaUV + o4).a;

        return vec4(r, g, b, a) * 0.25;
    } else {
        float redChannel = texture(targetTex, redUV).r;
        float greenChannel = texture(targetTex, greenUV).g;
        float blueChannel = texture(targetTex, blueUV).b;
        float alphaChannel = texture(targetTex, alphaUV).a;

        return vec4(redChannel, greenChannel, blueChannel, alphaChannel);
    }
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 texelSize = 1.0 / resolution;

    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;

    vec4 color;

    // Determine which texture is the map source and which is the target
    // mapSource: 0 = inputTex (A), 1 = tex (B)
    // When A is map, we sample from B with A's normals
    // When B is map, we sample from A with B's normals

    if (mode == 0) {
        // Displacement
        if (mapSource == 0) {
            color = applyDisplacement(uv, inputTex, tex);
        } else {
            color = applyDisplacement(uv, tex, inputTex);
        }
    } else if (mode == 1) {
        // Refraction
        if (mapSource == 0) {
            color = applyRefraction(uv, texelSize, inputTex, tex);
        } else {
            color = applyRefraction(uv, texelSize, tex, inputTex);
        }
    } else if (mode == 2) {
        // Reflection
        if (mapSource == 0) {
            color = applyReflection(uv, globalUV, texelSize, inputTex, tex);
        } else {
            color = applyReflection(uv, globalUV, texelSize, tex, inputTex);
        }
    }

    fragColor = color;
}
`,wgsl:`/*
 * Distortion mixer shader (WGSL)
 * Applies displacement, reflection, and refraction effects between two surfaces
 * Uses Sobel convolution to calculate surface normals from luminosity
 */

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> mode: i32;
@group(0) @binding(4) var<uniform> mapSource: i32;
@group(0) @binding(5) var<uniform> intensity: f32;
@group(0) @binding(6) var<uniform> wrap: i32;
@group(0) @binding(7) var<uniform> smoothing: f32;
@group(0) @binding(8) var<uniform> aberration: f32;
@group(0) @binding(9) var<uniform> antialias: i32;

// Convert RGB to luminosity
fn getLuminosity(color: vec3f) -> f32 {
    return dot(color, vec3f(0.299, 0.587, 0.114));
}

// Calculate surface normal from height map using Sobel convolution
fn calculateNormal(uv: vec2f, texelSize: vec2f, useInputTex: bool) -> vec3f {
    // Apply smoothing to texel size for smoother normals
    let sampleSize = texelSize * smoothing;
    
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
        var texSample: vec3f;
        if (useInputTex) {
            texSample = textureSample(inputTex, samp, uv + offsets[i]).rgb;
        } else {
            texSample = textureSample(tex, samp, uv + offsets[i]).rgb;
        }
        let height = getLuminosity(texSample);
        dx += height * sobel_x[i];
        dy += height * sobel_y[i];
    }
    
    // Scale gradients by intensity
    let normalStrength = intensity * 0.1;
    dx *= normalStrength;
    dy *= normalStrength;
    
    // Construct normal from gradients
    let normal = normalize(vec3f(-dx, -dy, 1.0));
    
    return normal;
}

// Apply wrap mode to coordinates
fn wrapCoords(st_in: vec2f) -> vec2f {
    var st = st_in;
    if (wrap == 0) {
        // mirror
        st = abs((st % vec2f(2.0) + vec2f(2.0)) % vec2f(2.0) - vec2f(1.0));
        st = vec2f(1.0) - st;
    } else if (wrap == 1) {
        // repeat
        st = fract(st);
    } else if (wrap == 2) {
        // clamp
        st = clamp(st, vec2f(0.0), vec2f(1.0));
    }
    return st;
}

// Displacement effect based on color luminosity
fn applyDisplacement(uv: vec2f, useInputTexAsMap: bool) -> vec4f {
    var mapColor: vec4f;
    if (useInputTexAsMap) {
        mapColor = textureSample(inputTex, samp, uv);
    } else {
        mapColor = textureSample(tex, samp, uv);
    }
    
    let len = length(mapColor.rgb);
    
    var offset: vec2f;
    offset.x = cos(len * TAU) * (intensity * 0.001);
    offset.y = sin(len * TAU) * (intensity * 0.001);
    
    let displacedUV = wrapCoords(uv + offset);

    if (antialias != 0) {
        let dx = dpdx(displacedUV);
        let dy = dpdy(displacedUV);
        var col = vec4f(0.0);
        if (useInputTexAsMap) {
            col += textureSample(tex, samp, displacedUV + dx * -0.375 + dy * -0.125);
            col += textureSample(tex, samp, displacedUV + dx *  0.125 + dy * -0.375);
            col += textureSample(tex, samp, displacedUV + dx *  0.375 + dy *  0.125);
            col += textureSample(tex, samp, displacedUV + dx * -0.125 + dy *  0.375);
        } else {
            col += textureSample(inputTex, samp, displacedUV + dx * -0.375 + dy * -0.125);
            col += textureSample(inputTex, samp, displacedUV + dx *  0.125 + dy * -0.375);
            col += textureSample(inputTex, samp, displacedUV + dx *  0.375 + dy *  0.125);
            col += textureSample(inputTex, samp, displacedUV + dx * -0.125 + dy *  0.375);
        }
        return col * 0.25;
    } else if (useInputTexAsMap) {
        return textureSample(tex, samp, displacedUV);
    } else {
        return textureSample(inputTex, samp, displacedUV);
    }
}

// Refraction effect based on surface normal
fn applyRefraction(uv: vec2f, texelSize: vec2f, useInputTexAsMap: bool) -> vec4f {
    let normal = calculateNormal(uv, texelSize, useInputTexAsMap);
    let refractionOffset = normal.xy * (intensity * 0.0125);
    let refractedUV = wrapCoords(uv + refractionOffset);

    if (antialias != 0) {
        let dx = dpdx(refractedUV);
        let dy = dpdy(refractedUV);
        var col = vec4f(0.0);
        if (useInputTexAsMap) {
            col += textureSample(tex, samp, refractedUV + dx * -0.375 + dy * -0.125);
            col += textureSample(tex, samp, refractedUV + dx *  0.125 + dy * -0.375);
            col += textureSample(tex, samp, refractedUV + dx *  0.375 + dy *  0.125);
            col += textureSample(tex, samp, refractedUV + dx * -0.125 + dy *  0.375);
        } else {
            col += textureSample(inputTex, samp, refractedUV + dx * -0.375 + dy * -0.125);
            col += textureSample(inputTex, samp, refractedUV + dx *  0.125 + dy * -0.375);
            col += textureSample(inputTex, samp, refractedUV + dx *  0.375 + dy *  0.125);
            col += textureSample(inputTex, samp, refractedUV + dx * -0.125 + dy *  0.375);
        }
        return col * 0.25;
    } else if (useInputTexAsMap) {
        return textureSample(tex, samp, refractedUV);
    } else {
        return textureSample(inputTex, samp, refractedUV);
    }
}

// Reflection effect with chromatic aberration
fn applyReflection(uv: vec2f, texelSize: vec2f, useInputTexAsMap: bool) -> vec4f {
    let normal = calculateNormal(uv, texelSize, useInputTexAsMap);
    
    // Calculate incident vector for reflection, from center of image
    let incident = vec3f(normalize(uv - vec2f(0.5)), 100.0);
    
    // Calculate reflection vector
    let reflectionVec = reflect(incident, normal);
    
    // Convert to 2D texture offset
    let reflectionOffset = reflectionVec.xy * (intensity * 0.00005);
    
    // Apply chromatic aberration
    let redOffset = reflectionOffset * (1.0 + aberration * 0.0075);
    let greenOffset = reflectionOffset;
    let blueOffset = reflectionOffset * (1.0 - aberration * 0.0075);

    let redUV = wrapCoords(uv + redOffset);
    let greenUV = wrapCoords(uv + greenOffset);
    let blueUV = wrapCoords(uv + blueOffset);
    let alphaUV = wrapCoords(uv + reflectionOffset);

    if (antialias != 0) {
        let dx = dpdx(greenUV);
        let dy = dpdy(greenUV);
        let o1 = dx * -0.375 + dy * -0.125;
        let o2 = dx *  0.125 + dy * -0.375;
        let o3 = dx *  0.375 + dy *  0.125;
        let o4 = dx * -0.125 + dy *  0.375;

        var r: f32 = 0.0;
        var g: f32 = 0.0;
        var b: f32 = 0.0;
        var a: f32 = 0.0;

        if (useInputTexAsMap) {
            r += textureSample(tex, samp, redUV + o1).r;
            r += textureSample(tex, samp, redUV + o2).r;
            r += textureSample(tex, samp, redUV + o3).r;
            r += textureSample(tex, samp, redUV + o4).r;
            g += textureSample(tex, samp, greenUV + o1).g;
            g += textureSample(tex, samp, greenUV + o2).g;
            g += textureSample(tex, samp, greenUV + o3).g;
            g += textureSample(tex, samp, greenUV + o4).g;
            b += textureSample(tex, samp, blueUV + o1).b;
            b += textureSample(tex, samp, blueUV + o2).b;
            b += textureSample(tex, samp, blueUV + o3).b;
            b += textureSample(tex, samp, blueUV + o4).b;
            a += textureSample(tex, samp, alphaUV + o1).a;
            a += textureSample(tex, samp, alphaUV + o2).a;
            a += textureSample(tex, samp, alphaUV + o3).a;
            a += textureSample(tex, samp, alphaUV + o4).a;
        } else {
            r += textureSample(inputTex, samp, redUV + o1).r;
            r += textureSample(inputTex, samp, redUV + o2).r;
            r += textureSample(inputTex, samp, redUV + o3).r;
            r += textureSample(inputTex, samp, redUV + o4).r;
            g += textureSample(inputTex, samp, greenUV + o1).g;
            g += textureSample(inputTex, samp, greenUV + o2).g;
            g += textureSample(inputTex, samp, greenUV + o3).g;
            g += textureSample(inputTex, samp, greenUV + o4).g;
            b += textureSample(inputTex, samp, blueUV + o1).b;
            b += textureSample(inputTex, samp, blueUV + o2).b;
            b += textureSample(inputTex, samp, blueUV + o3).b;
            b += textureSample(inputTex, samp, blueUV + o4).b;
            a += textureSample(inputTex, samp, alphaUV + o1).a;
            a += textureSample(inputTex, samp, alphaUV + o2).a;
            a += textureSample(inputTex, samp, alphaUV + o3).a;
            a += textureSample(inputTex, samp, alphaUV + o4).a;
        }

        return vec4f(r, g, b, a) * 0.25;
    }

    var redChannel: f32;
    var greenChannel: f32;
    var blueChannel: f32;
    var alphaChannel: f32;

    if (useInputTexAsMap) {
        redChannel = textureSample(tex, samp, redUV).r;
        greenChannel = textureSample(tex, samp, greenUV).g;
        blueChannel = textureSample(tex, samp, blueUV).b;
        alphaChannel = textureSample(tex, samp, alphaUV).a;
    } else {
        redChannel = textureSample(inputTex, samp, redUV).r;
        greenChannel = textureSample(inputTex, samp, greenUV).g;
        blueChannel = textureSample(inputTex, samp, blueUV).b;
        alphaChannel = textureSample(inputTex, samp, alphaUV).a;
    }

    return vec4f(redChannel, greenChannel, blueChannel, alphaChannel);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2f(textureDimensions(inputTex, 0));
    let uv = position.xy / dims;
    let texelSize = 1.0 / dims;
    
    var color: vec4f;
    
    // Determine which texture is the map source and which is the target
    // mapSource: 0 = inputTex (A), 1 = tex (B)
    // When A is map, we sample from B with A's normals
    // When B is map, we sample from A with B's normals
    let useInputTexAsMap = mapSource == 0;
    
    if (mode == 0) {
        // Displacement
        color = applyDisplacement(uv, useInputTexAsMap);
    } else if (mode == 1) {
        // Refraction
        color = applyRefraction(uv, texelSize, useInputTexAsMap);
    } else if (mode == 2) {
        // Reflection
        color = applyReflection(uv, texelSize, useInputTexAsMap);
    }
    
    return color;
}
`}},o=`# distortion

Displace, reflect, and refract with two surfaces

## Description

Applies displacement, reflection, and refraction effects between two surfaces using one surface as a height/normal map to distort the other.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| tex | surface | none | - | Source B |
| mode | int | refract | displace/refract/reflect | Mode |
| mapSource | int | sourceB | sourceA/sourceB | Map source |
| intensity | float | 50 | 0-100 | Intensity |
| wrap | int | mirror | clamp/mirror/repeat | Wrap |
| smoothing | float | 1 | 1-100 | Smoothing |
| aberration | float | 0 | 0-25 | Aberration |
| antialias | boolean | false | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Notes

- Use a noise or gradient texture as source B with "sourceB" map source to create organic distortion effects
- Reflection mode with high aberration creates prismatic rainbow effects
- Refraction mode simulates looking through glass or water
- Displacement mode creates warping effects based on color intensity

## Usage

\`\`\`
search mixer, synth

noise(seed: 1, ridges: true)
  .write(o0)

noise(seed: 2, ridges: true)
  .distortion(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(a))n.shaders[r]={...e}}n&&o&&(n.help=o);var u="mixer/distortion",c="mixer",f="distortion",m=n;export{m as default,u as effectId,f as effectName,o as help,c as namespace};
