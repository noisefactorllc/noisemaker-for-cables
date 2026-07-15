/* filter/grade */
var r=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new r({name:"Grade",namespace:"filter",func:"grade",tags:["color"],description:"Professional multi-stage color grading pipeline",globals:{preset:{type:"int",default:0,uniform:"preset",choices:{none:0,bleachBypass:4,cinematic:6,coolShadows:3,crossProcess:5,dayForNight:7,hardLight:20,infrared:11,matrix:14,monochrome:17,neon:13,noir:9,posterize:21,psychedelic:18,sepia:10,solarize:22,sunset:16,tealOrange:1,technicolor:12,underwater:15,vintage:8,warmFilm:2},ui:{label:"preset",control:"dropdown",category:"look"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider",category:"look",enabledBy:"preset"}},temperature:{type:"float",default:0,uniform:"temperature",min:-1,max:1,step:.01,ui:{control:"slider",label:"temperature",category:"primary"}},tint:{type:"float",default:0,uniform:"tint",min:-1,max:1,step:.01,ui:{control:"slider",label:"tint",category:"primary"}},exposure:{type:"float",default:0,uniform:"exposure",min:-4,max:4,step:.05,ui:{control:"slider",label:"exposure",category:"primary"}},contrast:{type:"float",default:0,uniform:"contrast",min:-1,max:1,step:.01,ui:{control:"slider",label:"contrast",category:"primary"}},highlights:{type:"float",default:0,uniform:"highlights",min:-1,max:1,step:.01,ui:{control:"slider",label:"highlights",category:"primary"}},shadows:{type:"float",default:0,uniform:"shadows",min:-1,max:1,step:.01,ui:{control:"slider",label:"shadows",category:"primary"}},whites:{type:"float",default:0,uniform:"whites",min:-1,max:1,step:.01,ui:{control:"slider",label:"whites",category:"primary"}},blacks:{type:"float",default:0,uniform:"blacks",min:-1,max:1,step:.01,ui:{control:"slider",label:"blacks",category:"primary"}},saturation:{type:"float",default:1,uniform:"saturation",min:0,max:2,step:.01,ui:{control:"slider",label:"saturation",category:"primary"}},vibrance:{type:"float",default:0,uniform:"vibrance",min:-1,max:1,step:.01,ui:{control:"slider",label:"vibrance",category:"creative"}},fadedFilm:{type:"float",default:0,uniform:"fadedFilm",min:0,max:1,step:.01,ui:{control:"slider",label:"faded film",category:"creative"}},shadowTint:{type:"vec3",default:[.5,.5,.5],uniform:"shadowTint",ui:{control:"slider",label:"shadow tint",category:"creative"}},highlightTint:{type:"vec3",default:[.5,.5,.5],uniform:"highlightTint",ui:{control:"slider",label:"highlight tint",category:"creative"}},splitToneBalance:{type:"float",default:0,uniform:"splitToneBalance",min:-1,max:1,step:.01,ui:{control:"slider",label:"split tone",category:"creative"}},curveShadows:{type:"float",default:0,uniform:"curveShadows",min:-1,max:1,step:.01,ui:{control:"slider",label:"shadows",category:"curves"}},curveMidtones:{type:"float",default:0,uniform:"curveMidtones",min:-1,max:1,step:.01,ui:{control:"slider",label:"midtones",category:"curves"}},curveHighlights:{type:"float",default:0,uniform:"curveHighlights",min:-1,max:1,step:.01,ui:{control:"slider",label:"highlights",category:"curves"}},wheelShadows:{type:"vec3",default:[.5,.5,.5],uniform:"wheelShadows",ui:{control:"slider",label:"shadows",category:"wheels"}},wheelMidtones:{type:"vec3",default:[.5,.5,.5],uniform:"wheelMidtones",ui:{control:"slider",label:"midtones",category:"wheels"}},wheelHighlights:{type:"vec3",default:[.5,.5,.5],uniform:"wheelHighlights",ui:{control:"slider",label:"highlights",category:"wheels"}},wheelBalance:{type:"float",default:0,uniform:"wheelBalance",min:-1,max:1,step:.01,ui:{control:"slider",label:"balance",category:"wheels",hint:"Adjust a color wheel above first"}},hslEnable:{type:"int",default:0,uniform:"hslEnable",min:0,max:1,step:1,ui:{control:"slider",label:"use hsl key",category:"hslSecondary"}},hslHueCenter:{type:"float",default:0,uniform:"hslHueCenter",min:0,max:1,step:.01,ui:{control:"slider",label:"hue center",category:"hslSecondary",enabledBy:"hslEnable"}},hslHueRange:{type:"float",default:.1,uniform:"hslHueRange",min:0,max:.5,step:.01,ui:{control:"slider",label:"hue range",category:"hslSecondary",enabledBy:"hslEnable"}},hslSatMin:{type:"float",default:0,uniform:"hslSatMin",min:0,max:1,step:.01,ui:{control:"slider",label:"sat min",category:"hslSecondary",enabledBy:"hslEnable"}},hslSatMax:{type:"float",default:1,uniform:"hslSatMax",min:0,max:1,step:.01,ui:{control:"slider",label:"sat max",category:"hslSecondary",enabledBy:"hslEnable"}},hslLumMin:{type:"float",default:0,uniform:"hslLumMin",min:0,max:1,step:.01,ui:{control:"slider",label:"lum min",category:"hslSecondary",enabledBy:"hslEnable"}},hslLumMax:{type:"float",default:1,uniform:"hslLumMax",min:0,max:1,step:.01,ui:{control:"slider",label:"lum max",category:"hslSecondary",enabledBy:"hslEnable"}},hslFeather:{type:"float",default:.1,uniform:"hslFeather",min:0,max:.5,step:.01,ui:{control:"slider",label:"feather",category:"hslSecondary",enabledBy:"hslEnable"}},hslHueShift:{type:"float",default:0,uniform:"hslHueShift",min:-.5,max:.5,step:.01,ui:{control:"slider",label:"hue shift",category:"hslSecondary",enabledBy:"hslEnable"}},hslSatAdjust:{type:"float",default:0,uniform:"hslSatAdjust",min:-1,max:1,step:.01,ui:{control:"slider",label:"sat adjust",category:"hslSecondary",enabledBy:"hslEnable"}},hslLumAdjust:{type:"float",default:0,uniform:"hslLumAdjust",min:-1,max:1,step:.01,ui:{control:"slider",label:"lum adjust",category:"hslSecondary",enabledBy:"hslEnable"}},vignetteAmount:{type:"float",default:0,uniform:"vignetteAmount",min:-1,max:1,step:.01,ui:{control:"slider",label:"amount",category:"vignette"}},vignetteMidpoint:{type:"float",default:.5,uniform:"vignetteMidpoint",min:0,max:1,step:.01,ui:{control:"slider",label:"midpoint",category:"vignette",enabledBy:"vignetteAmount"}},vignetteRoundness:{type:"float",default:0,uniform:"vignetteRoundness",min:-1,max:1,step:.01,ui:{control:"slider",label:"roundness",category:"vignette",enabledBy:"vignetteAmount"}},vignetteFeather:{type:"float",default:.5,uniform:"vignetteFeather",min:0,max:1,step:.01,ui:{control:"slider",label:"feather",category:"vignette",enabledBy:"vignetteAmount"}},vigHiProtect:{type:"float",default:0,uniform:"vigHiProtect",min:0,max:1,step:.01,ui:{control:"slider",label:"highlights",category:"vignette",enabledBy:"vignetteAmount"}}},textures:{_primaryTex:{width:"input",height:"input",format:"rgba16float"},_creativeTex:{width:"input",height:"input",format:"rgba16float"},_wheelsTex:{width:"input",height:"input",format:"rgba16float"},_hslTex:{width:"input",height:"input",format:"rgba16float"},_lutTex:{width:"input",height:"input",format:"rgba16float"}},paramAliases:{vignetteHighlightProtect:"vigHiProtect"},passes:[{name:"primary",program:"primary",inputs:{inputTex:"inputTex"},outputs:{fragColor:"_primaryTex"}},{name:"creative",program:"creative",inputs:{inputTex:"_primaryTex"},outputs:{fragColor:"_creativeTex"}},{name:"wheels",program:"wheels",inputs:{inputTex:"_creativeTex"},outputs:{fragColor:"_wheelsTex"}},{name:"hslSecondary",program:"hslSecondary",inputs:{inputTex:"_wheelsTex"},outputs:{fragColor:"_hslTex"}},{name:"lut",program:"lut",inputs:{inputTex:"_hslTex"},outputs:{fragColor:"_lutTex"}},{name:"vignette",program:"vignette",inputs:{inputTex:"_lutTex"},outputs:{fragColor:"outputTex"}}]});var a={creative:{glsl:`/*
 * Grade - Creative Pass
 * Vibrance, faded film, shadow/highlight tinting (split tone)
 * All math in linear color space
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float vibrance;
uniform float fadedFilm;
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float splitToneBalance;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Vibrance: boost low-saturation colors, protect already-saturated and skin tones
vec3 applyVibrance(vec3 rgb, float vibrance) {
    if (abs(vibrance) < 0.001) return rgb;
    
    float luma = dot(rgb, LUMA_WEIGHTS);
    vec3 chroma = rgb - luma;
    
    // Current saturation approximation
    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float sat = (maxC > 0.001) ? (maxC - minC) / maxC : 0.0;
    
    // Vibrance preferentially affects low-saturation colors
    // Higher existing saturation = less boost
    float vibranceGain = 1.0 + vibrance * (1.0 - sat);
    
    // Skin tone protection: reduce effect on orange-red hues
    // Approximate skin hue detection
    float skinFactor = 1.0;
    if (rgb.r > rgb.g && rgb.g > rgb.b) {
        // Orange-ish hue range
        float hueScore = (rgb.r - rgb.b) / (maxC - minC + 0.001);
        skinFactor = smoothstep(0.3, 0.7, sat) * 0.5 + 0.5;
    }
    
    float finalGain = mix(1.0, vibranceGain, skinFactor);
    
    return luma + chroma * finalGain;
}

// Faded film: lift the blacks (toe lift)
vec3 applyFadedFilm(vec3 rgb, float amount) {
    if (amount < 0.001) return rgb;
    
    // Lift blacks by mixing toward mid-gray
    vec3 lifted = mix(rgb, vec3(0.2), amount * 0.5);
    
    // Also reduce overall contrast slightly
    float luma = dot(lifted, LUMA_WEIGHTS);
    vec3 chroma = lifted - luma;
    
    float pivot = 0.5;
    float contrastFactor = 1.0 - amount * 0.3;
    float newLuma = (luma - pivot) * contrastFactor + pivot;
    
    return newLuma + chroma * (1.0 - amount * 0.2);
}

// Split toning: apply different tints to shadows and highlights
vec3 applySplitTone(vec3 rgb, vec3 shadowTint, vec3 highlightTint, float balance) {
    // Tints are specified as 0.5 = neutral, deviation = color shift
    vec3 shadowShift = (shadowTint - 0.5) * 2.0;
    vec3 highlightShift = (highlightTint - 0.5) * 2.0;
    
    // Skip if both are neutral
    if (length(shadowShift) < 0.01 && length(highlightShift) < 0.01) {
        return rgb;
    }
    
    float luma = dot(rgb, LUMA_WEIGHTS);
    
    // Balance shifts the shadow/highlight boundary
    float balancePoint = 0.5 + balance * 0.3;
    
    // Smooth blending weights
    float shadowWeight = 1.0 - smoothstep(0.0, balancePoint, luma);
    float highlightWeight = smoothstep(balancePoint, 1.0, luma);
    
    // Apply tints additively
    vec3 tintedRgb = rgb;
    tintedRgb += shadowShift * shadowWeight * 0.3;
    tintedRgb += highlightShift * highlightWeight * 0.3;
    
    return tintedRgb;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Decode to linear
    vec3 rgb = srgbToLinear(color.rgb);
    
    // 1. Vibrance
    rgb = applyVibrance(rgb, vibrance);
    
    // 2. Faded Film
    rgb = applyFadedFilm(rgb, fadedFilm);
    
    // 3. Split Toning
    rgb = applySplitTone(rgb, shadowTint, highlightTint, splitToneBalance);
    
    // Encode back to sRGB
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - Creative Pass (WGSL)
 * Vibrance, faded film, shadow/highlight tinting (split tone)
 * All math in linear color space
 */

struct Uniforms {
    vibrance: f32,
    fadedFilm: f32,
    splitToneBalance: f32,
    _pad0: f32,
    shadowTint: vec3<f32>,
    _pad1: f32,
    highlightTint: vec3<f32>,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA_WEIGHTS = vec3<f32>(0.2126, 0.7152, 0.0722);

// sRGB to linear
fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Vibrance: boost low-saturation colors, protect already-saturated and skin tones
fn applyVibrance(rgb: vec3<f32>, vibrance: f32) -> vec3<f32> {
    if (abs(vibrance) < 0.001) { return rgb; }
    
    let luma = dot(rgb, LUMA_WEIGHTS);
    let chroma = rgb - luma;
    
    let maxC = max(max(rgb.r, rgb.g), rgb.b);
    let minC = min(min(rgb.r, rgb.g), rgb.b);
    var sat: f32;
    if (maxC > 0.001) {
        sat = (maxC - minC) / maxC;
    } else {
        sat = 0.0;
    }
    
    let vibranceGain = 1.0 + vibrance * (1.0 - sat);
    
    // Skin tone protection
    var skinFactor = 1.0;
    if (rgb.r > rgb.g && rgb.g > rgb.b) {
        skinFactor = smoothstep(0.3, 0.7, sat) * 0.5 + 0.5;
    }
    
    let finalGain = mix(1.0, vibranceGain, skinFactor);
    
    return luma + chroma * finalGain;
}

// Faded film: lift the blacks
fn applyFadedFilm(rgb: vec3<f32>, amount: f32) -> vec3<f32> {
    if (amount < 0.001) { return rgb; }
    
    let lifted = mix(rgb, vec3<f32>(0.2), amount * 0.5);
    
    let luma = dot(lifted, LUMA_WEIGHTS);
    let chroma = lifted - luma;
    
    let pivot = 0.5;
    let contrastFactor = 1.0 - amount * 0.3;
    let newLuma = (luma - pivot) * contrastFactor + pivot;
    
    return newLuma + chroma * (1.0 - amount * 0.2);
}

// Split toning
fn applySplitTone(rgb: vec3<f32>, shadowTint: vec3<f32>, highlightTint: vec3<f32>, balance: f32) -> vec3<f32> {
    let shadowShift = (shadowTint - 0.5) * 2.0;
    let highlightShift = (highlightTint - 0.5) * 2.0;
    
    if (length(shadowShift) < 0.01 && length(highlightShift) < 0.01) {
        return rgb;
    }
    
    let luma = dot(rgb, LUMA_WEIGHTS);
    let balancePoint = 0.5 + balance * 0.3;
    
    let shadowW = 1.0 - smoothstep(0.0, balancePoint, luma);
    let highlightW = smoothstep(balancePoint, 1.0, luma);
    
    var tintedRgb = rgb;
    tintedRgb += shadowShift * shadowW * 0.3;
    tintedRgb += highlightShift * highlightW * 0.3;
    
    return tintedRgb;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    var rgb = srgbToLinear(color.rgb);
    
    // 1. Vibrance
    rgb = applyVibrance(rgb, uniforms.vibrance);
    
    // 2. Faded Film
    rgb = applyFadedFilm(rgb, uniforms.fadedFilm);
    
    // 3. Split Toning
    rgb = applySplitTone(rgb, uniforms.shadowTint, uniforms.highlightTint, 
                         uniforms.splitToneBalance);
    
    rgb = linearToSrgb(max(rgb, vec3<f32>(0.0)));
    
    return vec4<f32>(rgb, color.a);
}
`},hslSecondary:{glsl:`/*
 * Grade - HSL Secondary Pass
 * Isolate color range by Hue/Sat/Luma, apply targeted correction
 * Key with soft edges, optional refinement
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int hslEnable;
uniform float hslHueCenter;
uniform float hslHueRange;
uniform float hslSatMin;
uniform float hslSatMax;
uniform float hslLumMin;
uniform float hslLumMax;
uniform float hslFeather;
uniform float hslHueShift;
uniform float hslSatAdjust;
uniform float hslLumAdjust;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
const float PI = 3.14159265359;

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// RGB to HSL
vec3 rgbToHsl(vec3 rgb) {
    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float delta = maxC - minC;
    
    float l = (maxC + minC) * 0.5;
    
    float h = 0.0;
    float s = 0.0;
    
    if (delta > 0.001) {
        s = (l > 0.5) ? delta / (2.0 - maxC - minC) : delta / (maxC + minC);
        
        if (maxC == rgb.r) {
            h = (rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6.0 : 0.0);
        } else if (maxC == rgb.g) {
            h = (rgb.b - rgb.r) / delta + 2.0;
        } else {
            h = (rgb.r - rgb.g) / delta + 4.0;
        }
        h /= 6.0;
    }
    
    return vec3(h, s, l);
}

// HSL to RGB
vec3 hslToRgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    
    if (s < 0.001) {
        return vec3(l);
    }
    
    float q = (l < 0.5) ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    
    vec3 rgb;
    for (int i = 0; i < 3; i++) {
        float t = h + (1.0 - float(i)) / 3.0;
        t = fract(t);
        
        if (t < 1.0 / 6.0) {
            rgb[i] = p + (q - p) * 6.0 * t;
        } else if (t < 0.5) {
            rgb[i] = q;
        } else if (t < 2.0 / 3.0) {
            rgb[i] = p + (q - p) * (2.0 / 3.0 - t) * 6.0;
        } else {
            rgb[i] = p;
        }
    }
    
    return rgb;
}

// Compute HSL key matte with soft edges
// Returns 0-1 where 1 = fully selected
float computeHslKey(vec3 hsl, float hueCenter, float hueRange, 
                    float satMin, float satMax, float lumMin, float lumMax, float feather) {
    // Hue key with wrap-around handling
    float hueDist = abs(hsl.x - hueCenter);
    hueDist = min(hueDist, 1.0 - hueDist);  // Handle wrap at 0/1
    
    float hueKey = 1.0 - smoothstep(hueRange - feather, hueRange + feather, hueDist);
    
    // Saturation key
    float satKey = smoothstep(satMin - feather, satMin + feather, hsl.y) *
                   (1.0 - smoothstep(satMax - feather, satMax + feather, hsl.y));
    
    // Luminance key
    float lumKey = smoothstep(lumMin - feather, lumMin + feather, hsl.z) *
                   (1.0 - smoothstep(lumMax - feather, lumMax + feather, hsl.z));
    
    // Combine keys multiplicatively
    return hueKey * satKey * lumKey;
}

// Apply correction to HSL values
vec3 applyHslCorrection(vec3 hsl, float hueShift, float satAdjust, float lumAdjust) {
    vec3 corrected = hsl;
    
    // Hue shift with wrap
    corrected.x = fract(corrected.x + hueShift);
    
    // Saturation adjustment
    corrected.y = clamp(corrected.y + satAdjust, 0.0, 1.0);
    
    // Luminance adjustment
    corrected.z = clamp(corrected.z + lumAdjust * 0.5, 0.0, 1.0);
    
    return corrected;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Early exit if disabled
    if (hslEnable == 0) {
        fragColor = color;
        return;
    }
    
    // Decode to linear then HSL
    vec3 rgb = srgbToLinear(color.rgb);
    vec3 hsl = rgbToHsl(rgb);
    
    // Compute selection matte
    float matte = computeHslKey(hsl, hslHueCenter, hslHueRange,
                                hslSatMin, hslSatMax,
                                hslLumMin, hslLumMax, hslFeather);
    
    // Apply correction
    vec3 correctedHsl = applyHslCorrection(hsl, hslHueShift, hslSatAdjust, hslLumAdjust);
    vec3 correctedRgb = hslToRgb(correctedHsl);
    
    // Blend original and corrected by matte
    rgb = mix(rgb, correctedRgb, matte);
    
    // Encode back to sRGB
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - HSL Secondary Pass (WGSL)
 * Isolate color range by Hue/Sat/Luma, apply targeted correction
 * Key with soft edges
 */

struct Uniforms {
    hslEnable: i32,
    hslHueCenter: f32,
    hslHueRange: f32,
    hslSatMin: f32,
    hslSatMax: f32,
    hslLumMin: f32,
    hslLumMax: f32,
    hslFeather: f32,
    hslHueShift: f32,
    hslSatAdjust: f32,
    hslLumAdjust: f32,
    _pad0: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA_WEIGHTS = vec3<f32>(0.2126, 0.7152, 0.0722);

// sRGB to linear
fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// RGB to HSL
fn rgbToHsl(rgb: vec3<f32>) -> vec3<f32> {
    let maxC = max(max(rgb.r, rgb.g), rgb.b);
    let minC = min(min(rgb.r, rgb.g), rgb.b);
    let delta = maxC - minC;
    
    let l = (maxC + minC) * 0.5;
    
    var h = 0.0;
    var s = 0.0;
    
    if (delta > 0.001) {
        if (l > 0.5) {
            s = delta / (2.0 - maxC - minC);
        } else {
            s = delta / (maxC + minC);
        }
        
        if (maxC == rgb.r) {
            h = (rgb.g - rgb.b) / delta;
            if (rgb.g < rgb.b) { h += 6.0; }
        } else if (maxC == rgb.g) {
            h = (rgb.b - rgb.r) / delta + 2.0;
        } else {
            h = (rgb.r - rgb.g) / delta + 4.0;
        }
        h /= 6.0;
    }
    
    return vec3<f32>(h, s, l);
}

// HSL to RGB
fn hslToRgb(hsl: vec3<f32>) -> vec3<f32> {
    let h = hsl.x;
    let s = hsl.y;
    let l = hsl.z;
    
    if (s < 0.001) {
        return vec3<f32>(l);
    }
    
    var q: f32;
    if (l < 0.5) {
        q = l * (1.0 + s);
    } else {
        q = l + s - l * s;
    }
    let p = 2.0 * l - q;
    
    var rgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        var t = h + (1.0 - f32(i)) / 3.0;
        t = fract(t);
        
        if (t < 1.0 / 6.0) {
            rgb[i] = p + (q - p) * 6.0 * t;
        } else if (t < 0.5) {
            rgb[i] = q;
        } else if (t < 2.0 / 3.0) {
            rgb[i] = p + (q - p) * (2.0 / 3.0 - t) * 6.0;
        } else {
            rgb[i] = p;
        }
    }
    
    return rgb;
}

// Compute HSL key matte
fn computeHslKey(hsl: vec3<f32>, hueCenter: f32, hueRange: f32, 
                 satMin: f32, satMax: f32, lumMin: f32, lumMax: f32, feather: f32) -> f32 {
    var hueDist = abs(hsl.x - hueCenter);
    hueDist = min(hueDist, 1.0 - hueDist);
    
    let hueKey = 1.0 - smoothstep(hueRange - feather, hueRange + feather, hueDist);
    
    let satKey = smoothstep(satMin - feather, satMin + feather, hsl.y) *
                 (1.0 - smoothstep(satMax - feather, satMax + feather, hsl.y));
    
    let lumKey = smoothstep(lumMin - feather, lumMin + feather, hsl.z) *
                 (1.0 - smoothstep(lumMax - feather, lumMax + feather, hsl.z));
    
    return hueKey * satKey * lumKey;
}

// Apply correction
fn applyHslCorrection(hsl: vec3<f32>, hueShift: f32, satAdjust: f32, lumAdjust: f32) -> vec3<f32> {
    var corrected = hsl;
    corrected.x = fract(corrected.x + hueShift);
    corrected.y = clamp(corrected.y + satAdjust, 0.0, 1.0);
    corrected.z = clamp(corrected.z + lumAdjust * 0.5, 0.0, 1.0);
    return corrected;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    if (uniforms.hslEnable == 0) {
        return color;
    }
    
    var rgb = srgbToLinear(color.rgb);
    let hsl = rgbToHsl(rgb);
    
    let matte = computeHslKey(hsl, uniforms.hslHueCenter, uniforms.hslHueRange,
                              uniforms.hslSatMin, uniforms.hslSatMax,
                              uniforms.hslLumMin, uniforms.hslLumMax, 
                              uniforms.hslFeather);
    
    let correctedHsl = applyHslCorrection(hsl, uniforms.hslHueShift, 
                                           uniforms.hslSatAdjust, uniforms.hslLumAdjust);
    let correctedRgb = hslToRgb(correctedHsl);
    
    rgb = mix(rgb, correctedRgb, matte);
    
    rgb = linearToSrgb(max(rgb, vec3<f32>(0.0)));
    
    return vec4<f32>(rgb, color.a);
}
`},lut:{glsl:`/*
 * Grade - LUT Pass
 * Apply 3D color lookup table for film looks
 * Includes procedural preset LUTs
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform int preset;      // 0=none, 1=tealOrange, 2=warmFilm, 3=coolShadows, 4=bleachBypass, 5=crossProcess
uniform float alpha; // 0-1 blend with original

out vec4 fragColor;

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// RGB to HSL
vec3 rgbToHsl(vec3 rgb) {
    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float delta = maxC - minC;
    float l = (maxC + minC) * 0.5;
    float h = 0.0, s = 0.0;
    if (delta > 0.001) {
        s = (l > 0.5) ? delta / (2.0 - maxC - minC) : delta / (maxC + minC);
        if (maxC == rgb.r) h = (rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6.0 : 0.0);
        else if (maxC == rgb.g) h = (rgb.b - rgb.r) / delta + 2.0;
        else h = (rgb.r - rgb.g) / delta + 4.0;
        h /= 6.0;
    }
    return vec3(h, s, l);
}

// HSL to RGB
float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
}

vec3 hslToRgb(vec3 hsl) {
    if (hsl.y == 0.0) return vec3(hsl.z);
    float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
    float p = 2.0 * hsl.z - q;
    return vec3(
        hue2rgb(p, q, hsl.x + 1.0/3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0/3.0)
    );
}

// Luminance
float luma(vec3 rgb) {
    return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

// --- PROCEDURAL LUT PRESETS ---

// Teal & Orange - Hollywood blockbuster look
vec3 lutTealOrange(vec3 rgb) {
    float l = luma(rgb);
    
    // Push shadows toward teal, highlights toward orange
    vec3 teal = vec3(0.0, 0.5, 0.6);
    vec3 orange = vec3(1.0, 0.6, 0.3);
    
    // Blend based on luminance
    vec3 graded = mix(teal, orange, l);
    
    // Preserve original saturation somewhat
    vec3 hsl = rgbToHsl(rgb);
    vec3 gradedHsl = rgbToHsl(graded);
    gradedHsl.y = mix(gradedHsl.y, hsl.y, 0.5);
    
    return hslToRgb(gradedHsl);
}

// Warm Film - Kodak Portra-like warmth
vec3 lutWarmFilm(vec3 rgb) {
    // Lift shadows slightly
    rgb = rgb * 0.95 + 0.05;
    
    // Warm midtones
    rgb.r = pow(rgb.r, 0.95);
    rgb.b = pow(rgb.b, 1.05);
    
    // Reduce green in shadows
    float l = luma(rgb);
    rgb.g = mix(rgb.g * 0.95, rgb.g, l);
    
    // Slight S-curve
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    
    return rgb;
}

// Cool Shadows - Moonlight/twilight look
vec3 lutCoolShadows(vec3 rgb) {
    float l = luma(rgb);
    
    // Cool shadows, neutral highlights
    vec3 coolBlue = vec3(0.4, 0.5, 0.7);
    
    // Only affect shadows
    float shadowMask = 1.0 - smoothstep(0.0, 0.5, l);
    rgb = mix(rgb, coolBlue * l * 2.0, shadowMask * 0.4);
    
    return rgb;
}

// Bleach Bypass - Desaturated high contrast
vec3 lutBleachBypass(vec3 rgb) {
    float l = luma(rgb);
    
    // Desaturate
    vec3 desat = vec3(l);
    rgb = mix(rgb, desat, 0.5);
    
    // Increase contrast
    rgb = (rgb - 0.5) * 1.3 + 0.5;
    
    // Slight warm tint
    rgb.r *= 1.02;
    rgb.b *= 0.98;
    
    return clamp(rgb, 0.0, 1.0);
}

// Cross Process - Vintage film cross-processing
vec3 lutCrossProcess(vec3 rgb) {
    // Shift color channels
    rgb.r = pow(rgb.r, 0.9);
    rgb.g = pow(rgb.g, 1.0);
    rgb.b = pow(rgb.b, 1.2);
    
    // Add cyan to shadows, yellow to highlights
    float l = luma(rgb);
    rgb.r += (1.0 - l) * -0.1 + l * 0.1;
    rgb.g += (1.0 - l) * 0.05;
    rgb.b += (1.0 - l) * 0.1 + l * -0.15;
    
    // Boost saturation
    vec3 hsl = rgbToHsl(rgb);
    hsl.y *= 1.2;
    rgb = hslToRgb(hsl);
    
    return clamp(rgb, 0.0, 1.0);
}

// Cinematic - Film emulation with lifted blacks
vec3 lutCinematic(vec3 rgb) {
    float l = luma(rgb);
    
    // Lift blacks
    rgb = rgb * 0.9 + 0.03;
    
    // Slight teal in shadows, warm highlights
    vec3 shadowTint = vec3(0.95, 1.0, 1.05);
    vec3 highlightTint = vec3(1.05, 1.0, 0.95);
    rgb *= mix(shadowTint, highlightTint, l);
    
    // Soft contrast curve
    rgb = pow(rgb, vec3(1.1));
    
    return clamp(rgb, 0.0, 1.0);
}

// Day for Night - Simulate night from day footage
vec3 lutDayForNight(vec3 rgb) {
    float l = luma(rgb);
    
    // Strong blue push
    rgb.r *= 0.5;
    rgb.g *= 0.6;
    rgb.b *= 1.0;
    
    // Darken overall
    rgb *= 0.4;
    
    // Slight desaturation
    rgb = mix(vec3(luma(rgb)), rgb, 0.7);
    
    return rgb;
}

// Vintage - Faded retro look
vec3 lutVintage(vec3 rgb) {
    // Fade blacks
    rgb = rgb * 0.85 + 0.08;
    
    // Warm overall tone
    rgb.r = pow(rgb.r, 0.95);
    rgb.b = pow(rgb.b, 1.1);
    
    // Reduce saturation
    vec3 hsl = rgbToHsl(rgb);
    hsl.y *= 0.7;
    rgb = hslToRgb(hsl);
    
    // Slight vignette-like falloff in saturation
    return clamp(rgb, 0.0, 1.0);
}

// Noir - High contrast black and white with hints of color
vec3 lutNoir(vec3 rgb) {
    float l = luma(rgb);
    
    // Strong contrast
    l = (l - 0.5) * 1.5 + 0.5;
    l = clamp(l, 0.0, 1.0);
    
    // Almost monochrome with slight blue tint in shadows
    vec3 blue = vec3(0.9, 0.95, 1.0);
    vec3 mono = vec3(l) * mix(blue, vec3(1.0), l);
    
    return clamp(mono, 0.0, 1.0);
}

// Sepia - Classic aged photograph
vec3 lutSepia(vec3 rgb) {
    float l = luma(rgb);
    
    // Sepia tone
    vec3 sepia = vec3(1.0, 0.89, 0.71);
    vec3 result = l * sepia;
    
    // Lift blacks slightly
    result = result * 0.9 + 0.05;
    
    return clamp(result, 0.0, 1.0);
}

// Infrared - False color infrared look
vec3 lutInfrared(vec3 rgb) {
    float l = luma(rgb);
    
    // Simulate infrared: reds become bright, greens become dark
    vec3 result;
    result.r = pow(l, 0.7);
    result.g = rgb.g * 0.3;
    result.b = 1.0 - l;
    
    // Boost foliage simulation (greens become bright red)
    float foliage = smoothstep(0.2, 0.6, rgb.g) * (1.0 - abs(rgb.r - rgb.b));
    result.r = mix(result.r, 1.0, foliage * 0.7);
    
    return clamp(result, 0.0, 1.0);
}

// Technicolor - Saturated three-strip film look
vec3 lutTechnicolor(vec3 rgb) {
    // Emulate three-strip Technicolor process
    rgb.r = pow(rgb.r, 0.85) * 1.1;
    rgb.g = pow(rgb.g, 1.0) * 0.95;
    rgb.b = pow(rgb.b, 0.9) * 1.05;
    
    // Boost saturation
    vec3 hsl = rgbToHsl(rgb);
    hsl.y = min(hsl.y * 1.4, 1.0);
    rgb = hslToRgb(hsl);
    
    // Increase contrast
    rgb = (rgb - 0.5) * 1.15 + 0.5;
    
    return clamp(rgb, 0.0, 1.0);
}

// Neon - Cyberpunk/synthwave colors
vec3 lutNeon(vec3 rgb) {
    // Shift hue and boost saturation
    vec3 hsl = rgbToHsl(rgb);
    hsl.x = mod(hsl.x + 0.05, 1.0);
    hsl.y = min(hsl.y * 1.8, 1.0);
    rgb = hslToRgb(hsl);
    
    // High contrast
    rgb = (rgb - 0.5) * 1.4 + 0.5;
    
    // Push toward magenta/cyan
    rgb.r = pow(max(rgb.r, 0.0), 0.9);
    rgb.b = pow(max(rgb.b, 0.0), 0.85);
    
    return clamp(rgb, 0.0, 1.0);
}

// Matrix - Green digital rain aesthetic
vec3 lutMatrix(vec3 rgb) {
    float l = luma(rgb);
    
    // Boost luminance
    float boosted = pow(l, 0.8);
    
    // Map to green primarily
    vec3 result = vec3(boosted * 0.2, boosted, boosted * 0.15);
    
    // Add slight glow
    result += vec3(0.0, 0.02, 0.0);
    
    return clamp(result, 0.0, 1.0);
}

// Underwater - Aquatic blue-green color shift
vec3 lutUnderwater(vec3 rgb) {
    // Reduce reds (absorbed by water)
    rgb.r *= 0.5;
    
    // Shift toward blue-green
    rgb.g = pow(rgb.g, 0.9) * 0.9;
    rgb.b = pow(rgb.b, 0.85) * 1.1;
    
    // Add depth haze
    float depth = 1.0 - luma(rgb) * 0.3;
    rgb = mix(rgb, rgb * vec3(0.4, 0.7, 1.0), 0.3 * depth);
    
    return clamp(rgb, 0.0, 1.0);
}

// Sunset - Warm golden hour tones
vec3 lutSunset(vec3 rgb) {
    float l = luma(rgb);
    
    // Golden warmth
    float warmth = smoothstep(0.3, 0.7, l);
    vec3 sunset = mix(vec3(1.0, 0.3, 0.5), vec3(1.0, 0.8, 0.4), warmth);
    rgb = mix(rgb * sunset, rgb, 0.4);
    
    // Boost reds
    rgb.r = pow(rgb.r, 0.9);
    
    return clamp(rgb, 0.0, 1.0);
}

// Monochrome - Pure black and white with enhanced contrast
vec3 lutMonochrome(vec3 rgb) {
    float l = luma(rgb);
    
    // Enhanced contrast
    l = (l - 0.5) * 1.2 + 0.5;
    
    return clamp(vec3(l), 0.0, 1.0);
}

// Psychedelic - Extreme color rotation and saturation
vec3 lutPsychedelic(vec3 rgb) {
    vec3 hsl = rgbToHsl(rgb);
    
    // Rotate hue based on luminance
    hsl.x = mod(hsl.x * 3.0 + hsl.z * 0.5, 1.0);
    
    // Extreme saturation
    hsl.y = min(hsl.y * 2.0, 1.0);
    
    // Boost contrast
    hsl.z = (hsl.z - 0.5) * 1.3 + 0.5;
    
    rgb = hslToRgb(hsl);
    
    return clamp(rgb, 0.0, 1.0);
}

// Hard Light - Extreme contrast for metallic/shiny appearance
vec3 lutHardLight(vec3 rgb) {
    float l = luma(rgb);
    
    // Hard light blend mode simulation
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (rgb[i] < 0.5) {
            result[i] = 2.0 * rgb[i] * l;
        } else {
            result[i] = 1.0 - 2.0 * (1.0 - rgb[i]) * (1.0 - l);
        }
    }
    
    // Boost overall contrast
    result = (result - 0.5) * 1.4 + 0.5;
    
    // Add slight cool metallic tint to highlights
    float highlightMask = smoothstep(0.5, 1.0, l);
    result.b += highlightMask * 0.05;
    
    return clamp(result, 0.0, 1.0);
}

// Posterize - Quantize luminance for banded noise effect
vec3 lutPosterize(vec3 rgb) {
    float l = luma(rgb);
    
    // Quantize to discrete levels
    float levels = 6.0;
    float quantized = floor(l * levels + 0.5) / levels;
    
    // Map to a color ramp for visual interest
    vec3 ramp;
    if (quantized < 0.2) {
        ramp = vec3(0.1, 0.05, 0.15);  // Deep purple-black
    } else if (quantized < 0.4) {
        ramp = vec3(0.3, 0.2, 0.4);    // Dark purple
    } else if (quantized < 0.6) {
        ramp = vec3(0.5, 0.4, 0.6);    // Medium purple
    } else if (quantized < 0.8) {
        ramp = vec3(0.8, 0.6, 0.5);    // Warm highlight
    } else {
        ramp = vec3(1.0, 0.9, 0.8);    // Bright cream
    }
    
    // Blend with original color for some hue preservation
    vec3 hsl = rgbToHsl(rgb);
    vec3 rampHsl = rgbToHsl(ramp);
    rampHsl.x = mix(rampHsl.x, hsl.x, 0.3);
    
    return hslToRgb(rampHsl);
}

// Solarize - Partial inversion creates wild band separation
vec3 lutSolarize(vec3 rgb) {
    float l = luma(rgb);
    
    // Invert values above threshold, creating bands
    float threshold = 0.5;
    vec3 result;
    for (int i = 0; i < 3; i++) {
        if (rgb[i] > threshold) {
            result[i] = 2.0 * (1.0 - rgb[i]);
        } else {
            result[i] = 2.0 * rgb[i];
        }
    }
    
    // Boost saturation for more dramatic effect
    vec3 hsl = rgbToHsl(result);
    hsl.y = min(hsl.y * 1.5, 1.0);
    result = hslToRgb(hsl);
    
    // Add slight contrast
    result = (result - 0.5) * 1.1 + 0.5;
    
    return clamp(result, 0.0, 1.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Early exit if no LUT selected
    if (preset == 0 || alpha <= 0.0) {
        fragColor = color;
        return;
    }
    
    vec3 rgb = srgbToLinear(color.rgb);
    vec3 graded = rgb;
    
    // Apply selected LUT preset
    if (preset == 1) {
        graded = lutTealOrange(rgb);
    } else if (preset == 2) {
        graded = lutWarmFilm(rgb);
    } else if (preset == 3) {
        graded = lutCoolShadows(rgb);
    } else if (preset == 4) {
        graded = lutBleachBypass(rgb);
    } else if (preset == 5) {
        graded = lutCrossProcess(rgb);
    } else if (preset == 6) {
        graded = lutCinematic(rgb);
    } else if (preset == 7) {
        graded = lutDayForNight(rgb);
    } else if (preset == 8) {
        graded = lutVintage(rgb);
    } else if (preset == 9) {
        graded = lutNoir(rgb);
    } else if (preset == 10) {
        graded = lutSepia(rgb);
    } else if (preset == 11) {
        graded = lutInfrared(rgb);
    } else if (preset == 12) {
        graded = lutTechnicolor(rgb);
    } else if (preset == 13) {
        graded = lutNeon(rgb);
    } else if (preset == 14) {
        graded = lutMatrix(rgb);
    } else if (preset == 15) {
        graded = lutUnderwater(rgb);
    } else if (preset == 16) {
        graded = lutSunset(rgb);
    } else if (preset == 17) {
        graded = lutMonochrome(rgb);
    } else if (preset == 18) {
        graded = lutPsychedelic(rgb);
    } else if (preset == 20) {
        graded = lutHardLight(rgb);
    } else if (preset == 21) {
        graded = lutPosterize(rgb);
    } else if (preset == 22) {
        graded = lutSolarize(rgb);
    }
    
    // Blend with original based on intensity
    rgb = mix(rgb, graded, alpha);
    
    // Encode back to sRGB
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - LUT Pass (WGSL)
 * Apply 3D color lookup table for film looks
 * Includes procedural preset LUTs
 */

struct Uniforms {
    preset: i32,
    alpha: f32,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// sRGB to linear
fn srgbToLinear(srgb: vec3f) -> vec3f {
    var linear: vec3f;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3f) -> vec3f {
    var srgb: vec3f;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// RGB to HSL
fn rgbToHsl(rgb: vec3f) -> vec3f {
    let maxC = max(max(rgb.r, rgb.g), rgb.b);
    let minC = min(min(rgb.r, rgb.g), rgb.b);
    let delta = maxC - minC;
    let l = (maxC + minC) * 0.5;
    var h = 0.0;
    var s = 0.0;
    if (delta > 0.001) {
        s = select(delta / (maxC + minC), delta / (2.0 - maxC - minC), l > 0.5);
        if (maxC == rgb.r) {
            h = (rgb.g - rgb.b) / delta + select(0.0, 6.0, rgb.g < rgb.b);
        } else if (maxC == rgb.g) {
            h = (rgb.b - rgb.r) / delta + 2.0;
        } else {
            h = (rgb.r - rgb.g) / delta + 4.0;
        }
        h /= 6.0;
    }
    return vec3f(h, s, l);
}

// HSL to RGB
fn hue2rgb(p: f32, q: f32, t_in: f32) -> f32 {
    var t = t_in;
    if (t < 0.0) { t += 1.0; }
    if (t > 1.0) { t -= 1.0; }
    if (t < 1.0/6.0) { return p + (q - p) * 6.0 * t; }
    if (t < 1.0/2.0) { return q; }
    if (t < 2.0/3.0) { return p + (q - p) * (2.0/3.0 - t) * 6.0; }
    return p;
}

fn hslToRgb(hsl: vec3f) -> vec3f {
    if (hsl.y == 0.0) { return vec3f(hsl.z); }
    let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
    let p = 2.0 * hsl.z - q;
    return vec3f(
        hue2rgb(p, q, hsl.x + 1.0/3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0/3.0)
    );
}

// Luminance
fn luma(rgb: vec3f) -> f32 {
    return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
}

// --- PROCEDURAL LUT PRESETS ---

fn lutTealOrange(rgb: vec3f) -> vec3f {
    let l = luma(rgb);
    let teal = vec3f(0.0, 0.5, 0.6);
    let orange = vec3f(1.0, 0.6, 0.3);
    let graded = mix(teal, orange, l);
    let hsl = rgbToHsl(rgb);
    var gradedHsl = rgbToHsl(graded);
    gradedHsl.y = mix(gradedHsl.y, hsl.y, 0.5);
    return hslToRgb(gradedHsl);
}

fn lutWarmFilm(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in * 0.95 + 0.05;
    rgb.r = pow(rgb.r, 0.95);
    rgb.b = pow(rgb.b, 1.05);
    let l = luma(rgb);
    rgb.g = mix(rgb.g * 0.95, rgb.g, l);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return rgb;
}

fn lutCoolShadows(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    let l = luma(rgb);
    let coolBlue = vec3f(0.4, 0.5, 0.7);
    let shadowMask = 1.0 - smoothstep(0.0, 0.5, l);
    rgb = mix(rgb, coolBlue * l * 2.0, shadowMask * 0.4);
    return rgb;
}

fn lutBleachBypass(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    let l = luma(rgb);
    let desat = vec3f(l);
    rgb = mix(rgb, desat, 0.5);
    rgb = (rgb - 0.5) * 1.3 + 0.5;
    rgb.r *= 1.02;
    rgb.b *= 0.98;
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

fn lutCrossProcess(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    rgb.r = pow(rgb.r, 0.9);
    rgb.g = pow(rgb.g, 1.0);
    rgb.b = pow(rgb.b, 1.2);
    let l = luma(rgb);
    rgb.r += (1.0 - l) * -0.1 + l * 0.1;
    rgb.g += (1.0 - l) * 0.05;
    rgb.b += (1.0 - l) * 0.1 + l * -0.15;
    var hsl = rgbToHsl(rgb);
    hsl.y *= 1.2;
    rgb = hslToRgb(hsl);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

fn lutCinematic(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    let l = luma(rgb);
    rgb = rgb * 0.9 + 0.03;
    let shadowTint = vec3f(0.95, 1.0, 1.05);
    let highlightTint = vec3f(1.05, 1.0, 0.95);
    rgb *= mix(shadowTint, highlightTint, l);
    rgb = pow(rgb, vec3f(1.1));
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

fn lutDayForNight(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    rgb.r *= 0.5;
    rgb.g *= 0.6;
    rgb.b *= 1.0;
    rgb *= 0.4;
    rgb = mix(vec3f(luma(rgb)), rgb, 0.7);
    return rgb;
}

fn lutVintage(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in * 0.85 + 0.08;
    rgb.r = pow(rgb.r, 0.95);
    rgb.b = pow(rgb.b, 1.1);
    var hsl = rgbToHsl(rgb);
    hsl.y *= 0.7;
    rgb = hslToRgb(hsl);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Noir - high contrast black and white with subtle blue shadows
fn lutNoir(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    let contrast = (l - 0.5) * 1.5 + 0.5;
    let blue = vec3f(0.9, 0.95, 1.0);
    var rgb = vec3f(contrast) * mix(blue, vec3f(1.0), contrast);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Sepia - warm brown vintage look
fn lutSepia(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    let sepia = vec3f(1.0, 0.89, 0.71);
    var rgb = l * sepia;
    rgb = rgb * 0.9 + 0.05;
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Infrared - false color heat map style
fn lutInfrared(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    var rgb = rgb_in;
    rgb.r = pow(l, 0.7);
    rgb.g = rgb_in.g * 0.3;
    rgb.b = 1.0 - l;
    let foliage = smoothstep(0.2, 0.6, rgb_in.g) * (1.0 - abs(rgb_in.r - rgb_in.b));
    rgb.r = mix(rgb.r, 1.0, foliage * 0.7);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Technicolor - saturated three-strip film look
fn lutTechnicolor(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    rgb.r = pow(rgb.r, 0.85) * 1.1;
    rgb.g = pow(rgb.g, 1.0) * 0.95;
    rgb.b = pow(rgb.b, 0.9) * 1.05;
    var hsl = rgbToHsl(rgb);
    hsl.y = min(hsl.y * 1.4, 1.0);
    rgb = hslToRgb(hsl);
    rgb = (rgb - 0.5) * 1.15 + 0.5;
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Neon - cyberpunk high saturation with color shift
fn lutNeon(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    var hsl = rgbToHsl(rgb);
    hsl.x = fract(hsl.x + 0.05);
    hsl.y = min(hsl.y * 1.8, 1.0);
    rgb = hslToRgb(hsl);
    rgb = (rgb - 0.5) * 1.4 + 0.5;
    rgb.r = pow(max(rgb.r, 0.0), 0.9);
    rgb.b = pow(max(rgb.b, 0.0), 0.85);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Matrix - green monochrome terminal look
fn lutMatrix(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    let boosted = pow(l, 0.8);
    var rgb = vec3f(boosted * 0.2, boosted, boosted * 0.15);
    rgb += vec3f(0.0, 0.02, 0.0);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Underwater - aquatic blue-green color shift
fn lutUnderwater(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    rgb.r *= 0.5;
    rgb.g = pow(rgb.g, 0.9) * 0.9;
    rgb.b = pow(rgb.b, 0.85) * 1.1;
    let depth = 1.0 - luma(rgb_in) * 0.3;
    rgb = mix(rgb, rgb * vec3f(0.4, 0.7, 1.0), 0.3 * depth);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Sunset - warm orange/magenta gradient
fn lutSunset(rgb_in: vec3f) -> vec3f {
    var rgb = rgb_in;
    let l = luma(rgb_in);
    let warmth = smoothstep(0.3, 0.7, l);
    let sunset = mix(vec3f(1.0, 0.3, 0.5), vec3f(1.0, 0.8, 0.4), warmth);
    rgb = mix(rgb * sunset, rgb, 0.4);
    rgb.r = pow(rgb.r, 0.9);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Monochrome - pure black and white with enhanced contrast
fn lutMonochrome(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    let contrast = (l - 0.5) * 1.2 + 0.5;
    return clamp(vec3f(contrast), vec3f(0.0), vec3f(1.0));
}

// Psychedelic - extreme color rotation and saturation
fn lutPsychedelic(rgb_in: vec3f) -> vec3f {
    var hsl = rgbToHsl(rgb_in);
    hsl.x = fract(hsl.x * 3.0 + hsl.z * 0.5);
    hsl.y = min(hsl.y * 2.0, 1.0);
    hsl.z = (hsl.z - 0.5) * 1.3 + 0.5;
    var rgb = hslToRgb(hsl);
    return clamp(rgb, vec3f(0.0), vec3f(1.0));
}

// Hard Light - Extreme contrast for metallic/shiny appearance
fn lutHardLight(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    
    // Hard light blend mode simulation
    var result: vec3f;
    result.r = select(1.0 - 2.0 * (1.0 - rgb_in.r) * (1.0 - l), 2.0 * rgb_in.r * l, rgb_in.r < 0.5);
    result.g = select(1.0 - 2.0 * (1.0 - rgb_in.g) * (1.0 - l), 2.0 * rgb_in.g * l, rgb_in.g < 0.5);
    result.b = select(1.0 - 2.0 * (1.0 - rgb_in.b) * (1.0 - l), 2.0 * rgb_in.b * l, rgb_in.b < 0.5);
    
    // Boost overall contrast
    result = (result - 0.5) * 1.4 + 0.5;
    
    // Add slight cool metallic tint to highlights
    let highlightMask = smoothstep(0.5, 1.0, l);
    result.b += highlightMask * 0.05;
    
    return clamp(result, vec3f(0.0), vec3f(1.0));
}

// Posterize - Quantize luminance for banded noise effect
fn lutPosterize(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    
    // Quantize to discrete levels
    let levels = 6.0;
    let quantized = floor(l * levels + 0.5) / levels;
    
    // Map to a color ramp for visual interest
    var ramp: vec3f;
    if (quantized < 0.2) {
        ramp = vec3f(0.1, 0.05, 0.15);  // Deep purple-black
    } else if (quantized < 0.4) {
        ramp = vec3f(0.3, 0.2, 0.4);    // Dark purple
    } else if (quantized < 0.6) {
        ramp = vec3f(0.5, 0.4, 0.6);    // Medium purple
    } else if (quantized < 0.8) {
        ramp = vec3f(0.8, 0.6, 0.5);    // Warm highlight
    } else {
        ramp = vec3f(1.0, 0.9, 0.8);    // Bright cream
    }
    
    // Blend with original color for some hue preservation
    let hsl = rgbToHsl(rgb_in);
    var rampHsl = rgbToHsl(ramp);
    rampHsl.x = mix(rampHsl.x, hsl.x, 0.3);
    
    return hslToRgb(rampHsl);
}

// Solarize - Partial inversion creates wild band separation
fn lutSolarize(rgb_in: vec3f) -> vec3f {
    let l = luma(rgb_in);
    
    // Invert values above threshold, creating bands
    let threshold = 0.5;
    var result: vec3f;
    result.r = select(2.0 * (1.0 - rgb_in.r), 2.0 * rgb_in.r, rgb_in.r <= threshold);
    result.g = select(2.0 * (1.0 - rgb_in.g), 2.0 * rgb_in.g, rgb_in.g <= threshold);
    result.b = select(2.0 * (1.0 - rgb_in.b), 2.0 * rgb_in.b, rgb_in.b <= threshold);
    
    // Boost saturation for more dramatic effect
    var hsl = rgbToHsl(result);
    hsl.y = min(hsl.y * 1.5, 1.0);
    result = hslToRgb(hsl);
    
    // Add slight contrast
    result = (result - 0.5) * 1.1 + 0.5;
    
    return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let coord = vec2i(fragCoord.xy);
    let color = textureLoad(inputTex, coord, 0);
    
    if (uniforms.preset == 0 || uniforms.alpha <= 0.0) {
        return color;
    }
    
    var rgb = srgbToLinear(color.rgb);
    var graded = rgb;
    
    if (uniforms.preset == 1) {
        graded = lutTealOrange(rgb);
    } else if (uniforms.preset == 2) {
        graded = lutWarmFilm(rgb);
    } else if (uniforms.preset == 3) {
        graded = lutCoolShadows(rgb);
    } else if (uniforms.preset == 4) {
        graded = lutBleachBypass(rgb);
    } else if (uniforms.preset == 5) {
        graded = lutCrossProcess(rgb);
    } else if (uniforms.preset == 6) {
        graded = lutCinematic(rgb);
    } else if (uniforms.preset == 7) {
        graded = lutDayForNight(rgb);
    } else if (uniforms.preset == 8) {
        graded = lutVintage(rgb);
    } else if (uniforms.preset == 9) {
        graded = lutNoir(rgb);
    } else if (uniforms.preset == 10) {
        graded = lutSepia(rgb);
    } else if (uniforms.preset == 11) {
        graded = lutInfrared(rgb);
    } else if (uniforms.preset == 12) {
        graded = lutTechnicolor(rgb);
    } else if (uniforms.preset == 13) {
        graded = lutNeon(rgb);
    } else if (uniforms.preset == 14) {
        graded = lutMatrix(rgb);
    } else if (uniforms.preset == 15) {
        graded = lutUnderwater(rgb);
    } else if (uniforms.preset == 16) {
        graded = lutSunset(rgb);
    } else if (uniforms.preset == 17) {
        graded = lutMonochrome(rgb);
    } else if (uniforms.preset == 18) {
        graded = lutPsychedelic(rgb);
    } else if (uniforms.preset == 20) {
        graded = lutHardLight(rgb);
    } else if (uniforms.preset == 21) {
        graded = lutPosterize(rgb);
    } else if (uniforms.preset == 22) {
        graded = lutSolarize(rgb);
    }
    
    rgb = mix(rgb, graded, uniforms.alpha);
    rgb = linearToSrgb(max(rgb, vec3f(0.0)));
    
    return vec4f(rgb, color.a);
}
`},primary:{glsl:`/*
 * Grade - Primary Correction Pass
 * White balance, exposure, contrast, tonal range operators, saturation
 * All math in linear color space
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform float temperature;
uniform float tint;
uniform float exposure;
uniform float contrast;
uniform float highlights;
uniform float shadows;
uniform float whites;
uniform float blacks;
uniform float saturation;
uniform float curveShadows;
uniform float curveMidtones;
uniform float curveHighlights;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// White balance using temperature/tint as chromatic adaptation
vec3 applyWhiteBalance(vec3 rgb, float temp, float tint) {
    // Temperature: warm (positive) shifts toward orange, cool (negative) toward blue
    // Tint: positive shifts toward magenta, negative toward green
    vec3 shift = vec3(
        1.0 + temp * 0.5,           // Red channel
        1.0 - tint * 0.5,           // Green channel
        1.0 - temp * 0.5            // Blue channel
    );
    return rgb * shift;
}

// Soft tonal weight for range-aware adjustments
// Uses smooth hermite curves for natural transitions
float shadowWeight(float luma) {
    // Shadows affect primarily dark areas with smooth rolloff
    return 1.0 - smoothstep(0.0, 0.5, luma);
}

float highlightWeight(float luma) {
    // Highlights affect primarily bright areas
    return smoothstep(0.5, 1.0, luma);
}

float midtoneWeight(float luma) {
    // Midtones peak at 0.5 with falloff at extremes
    return 1.0 - abs(luma - 0.5) * 2.0;
}

float whitesWeight(float luma) {
    // Whites: top end only
    return smoothstep(0.7, 1.0, luma);
}

float blacksWeight(float luma) {
    // Blacks: bottom end only
    return 1.0 - smoothstep(0.0, 0.3, luma);
}

// Apply tonal range adjustments without hue skew
// Operates on luminance then reconstructs color
vec3 applyTonalRanges(vec3 rgb, float highlights, float shadows, float whites, float blacks) {
    float luma = dot(rgb, LUMA_WEIGHTS);
    vec3 chroma = rgb - luma;
    
    // Compute adjustments based on luma position
    float hWeight = highlightWeight(luma);
    float sWeight = shadowWeight(luma);
    float wWeight = whitesWeight(luma);
    float bWeight = blacksWeight(luma);
    
    // Apply adjustments to luma (multiplicative for natural behavior)
    float lumaAdjust = 0.0;
    lumaAdjust += highlights * hWeight * 0.5;  // Scale factor for usable range
    lumaAdjust += shadows * sWeight * 0.5;
    lumaAdjust += whites * wWeight * 0.3;
    lumaAdjust += blacks * bWeight * 0.3;
    
    float newLuma = luma + lumaAdjust;
    newLuma = max(newLuma, 0.0);
    
    // Reconstruct with preserved chroma
    return newLuma + chroma;
}

// S-curve contrast
vec3 applyContrast(vec3 rgb, float contrast) {
    if (abs(contrast) < 0.001) return rgb;
    
    float luma = dot(rgb, LUMA_WEIGHTS);
    vec3 chroma = rgb - luma;
    
    // S-curve using adjusted sigmoid
    // Contrast > 0: steepen curve, Contrast < 0: flatten
    float pivot = 0.5;
    float factor = 1.0 + contrast;
    
    // Apply curve per-channel to preserve color but weight toward luma
    float newLuma = (luma - pivot) * factor + pivot;
    newLuma = clamp(newLuma, 0.0, 1.5); // Allow some headroom
    
    return newLuma + chroma;
}

// Apply lift/gamma/gain style curve
vec3 applyCurve(vec3 rgb, float shadowLift, float midGamma, float highGain) {
    float luma = dot(rgb, LUMA_WEIGHTS);
    vec3 chroma = rgb - luma;
    
    // Compute blended adjustment
    float sW = shadowWeight(luma);
    float mW = midtoneWeight(luma);
    float hW = highlightWeight(luma);
    
    // Lift (add to shadows), Gamma (power curve on mids), Gain (multiply highlights)
    float lift = shadowLift * sW * 0.2;
    float gamma = 1.0 - midGamma * mW * 0.3;
    float gain = 1.0 + highGain * hW * 0.5;
    
    float newLuma = luma + lift;
    newLuma = pow(max(newLuma, 0.001), gamma);
    newLuma = newLuma * gain;
    
    return max(newLuma + chroma, vec3(0.0));
}

// Saturation adjustment (uniform scaling of chroma)
vec3 applySaturation(vec3 rgb, float satAmount) {
    float luma = dot(rgb, LUMA_WEIGHTS);
    vec3 chroma = rgb - luma;
    return luma + chroma * satAmount;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Decode to linear (assume input is sRGB)
    vec3 rgb = srgbToLinear(color.rgb);
    
    // 1. White Balance
    rgb = applyWhiteBalance(rgb, temperature, tint);
    
    // 2. Exposure (in linear = multiply by 2^exposure)
    rgb = rgb * pow(2.0, exposure);
    
    // 3. Contrast (S-curve)
    rgb = applyContrast(rgb, contrast);
    
    // 4. Tonal Range Operators
    rgb = applyTonalRanges(rgb, highlights, shadows, whites, blacks);
    
    // 5. Curves (lift/gamma/gain)
    rgb = applyCurve(rgb, curveShadows, curveMidtones, curveHighlights);
    
    // 6. Saturation
    rgb = applySaturation(rgb, saturation);
    
    // Encode back to sRGB for next pass
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - Primary Correction Pass (WGSL)
 * White balance, exposure, contrast, tonal range operators, saturation
 * All math in linear color space
 */

struct Uniforms {
    temperature: f32,
    tint: f32,
    exposure: f32,
    contrast: f32,
    highlights: f32,
    shadows: f32,
    whites: f32,
    blacks: f32,
    saturation: f32,
    curveShadows: f32,
    curveMidtones: f32,
    curveHighlights: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA_WEIGHTS = vec3<f32>(0.2126, 0.7152, 0.0722);

// sRGB to linear
fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// White balance using temperature/tint as chromatic adaptation
fn applyWhiteBalance(rgb: vec3<f32>, temp: f32, tint: f32) -> vec3<f32> {
    let shift = vec3<f32>(
        1.0 + temp * 0.5,
        1.0 - tint * 0.5,
        1.0 - temp * 0.5
    );
    return rgb * shift;
}

// Tonal weight functions
fn shadowWeight(luma: f32) -> f32 {
    return 1.0 - smoothstep(0.0, 0.5, luma);
}

fn highlightWeight(luma: f32) -> f32 {
    return smoothstep(0.5, 1.0, luma);
}

fn midtoneWeight(luma: f32) -> f32 {
    return 1.0 - abs(luma - 0.5) * 2.0;
}

fn whitesWeight(luma: f32) -> f32 {
    return smoothstep(0.7, 1.0, luma);
}

fn blacksWeight(luma: f32) -> f32 {
    return 1.0 - smoothstep(0.0, 0.3, luma);
}

// Apply tonal range adjustments
fn applyTonalRanges(rgb: vec3<f32>, highlights: f32, shadows: f32, whites: f32, blacks: f32) -> vec3<f32> {
    let luma = dot(rgb, LUMA_WEIGHTS);
    let chroma = rgb - luma;
    
    let hWeight = highlightWeight(luma);
    let sWeight = shadowWeight(luma);
    let wWeight = whitesWeight(luma);
    let bWeight = blacksWeight(luma);
    
    var lumaAdjust = 0.0;
    lumaAdjust += highlights * hWeight * 0.5;
    lumaAdjust += shadows * sWeight * 0.5;
    lumaAdjust += whites * wWeight * 0.3;
    lumaAdjust += blacks * bWeight * 0.3;
    
    let newLuma = max(luma + lumaAdjust, 0.0);
    
    return newLuma + chroma;
}

// S-curve contrast
fn applyContrast(rgb: vec3<f32>, contrast: f32) -> vec3<f32> {
    if (abs(contrast) < 0.001) { return rgb; }
    
    let luma = dot(rgb, LUMA_WEIGHTS);
    let chroma = rgb - luma;
    
    let pivot = 0.5;
    let factor = 1.0 + contrast;
    
    let newLuma = clamp((luma - pivot) * factor + pivot, 0.0, 1.5);
    
    return newLuma + chroma;
}

// Apply lift/gamma/gain style curve
fn applyCurve(rgb: vec3<f32>, shadowLift: f32, midGamma: f32, highGain: f32) -> vec3<f32> {
    let luma = dot(rgb, LUMA_WEIGHTS);
    let chroma = rgb - luma;
    
    let sW = shadowWeight(luma);
    let mW = midtoneWeight(luma);
    let hW = highlightWeight(luma);
    
    let lift = shadowLift * sW * 0.2;
    let gamma = 1.0 - midGamma * mW * 0.3;
    let gain = 1.0 + highGain * hW * 0.5;
    
    var newLuma = luma + lift;
    newLuma = pow(max(newLuma, 0.001), gamma);
    newLuma = newLuma * gain;
    
    return max(newLuma + chroma, vec3<f32>(0.0));
}

// Saturation adjustment
fn applySaturation(rgb: vec3<f32>, satAmount: f32) -> vec3<f32> {
    let luma = dot(rgb, LUMA_WEIGHTS);
    let chroma = rgb - luma;
    return luma + chroma * satAmount;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    // Decode to linear
    var rgb = srgbToLinear(color.rgb);
    
    // 1. White Balance
    rgb = applyWhiteBalance(rgb, uniforms.temperature, uniforms.tint);
    
    // 2. Exposure
    rgb = rgb * pow(2.0, uniforms.exposure);
    
    // 3. Contrast
    rgb = applyContrast(rgb, uniforms.contrast);
    
    // 4. Tonal Range Operators
    rgb = applyTonalRanges(rgb, uniforms.highlights, uniforms.shadows, 
                           uniforms.whites, uniforms.blacks);
    
    // 5. Curves
    rgb = applyCurve(rgb, uniforms.curveShadows, uniforms.curveMidtones, 
                     uniforms.curveHighlights);
    
    // 6. Saturation
    rgb = applySaturation(rgb, uniforms.saturation);
    
    // Encode back to sRGB
    rgb = linearToSrgb(max(rgb, vec3<f32>(0.0)));
    
    return vec4<f32>(rgb, color.a);
}
`},vignette:{glsl:`/*
 * Grade - Vignette Pass
 * Elliptical vignette with highlight preservation
 * Applied as final spatial modifier
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float vignetteAmount;
uniform float vignetteMidpoint;
uniform float vignetteRoundness;
uniform float vignetteFeather;
uniform float vigHiProtect;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Compute vignette mask
// Returns 0-1 where 0 = full darkening, 1 = no change
float computeVignette(vec2 uv, vec2 aspectRatio, float midpoint, float roundness, float feather) {
    // Center UV at 0.5, 0.5
    vec2 centered = uv - 0.5;
    
    // Apply aspect ratio correction
    // roundness: -1 = horizontal ellipse, 0 = match aspect, +1 = circle
    vec2 scale;
    if (roundness > 0.0) {
        // Blend toward circle
        scale = mix(aspectRatio, vec2(1.0), roundness);
    } else {
        // Enhance aspect ratio difference
        scale = mix(aspectRatio, aspectRatio * vec2(1.0 + abs(roundness), 1.0 - abs(roundness) * 0.5), -roundness);
    }
    
    centered *= scale;
    
    // Distance from center
    float dist = length(centered) * 2.0;  // Normalize so corners are ~1.4
    
    // Vignette falloff
    float inner = midpoint - feather * 0.5;
    float outer = midpoint + feather * 0.5;
    
    return 1.0 - smoothstep(inner, outer, dist);
}

// Apply vignette with optional highlight protection
vec3 applyVignette(vec3 rgb, float vignetteMask, float amount, float highlightProtect) {
    if (abs(amount) < 0.001) return rgb;
    
    // Amount > 0 = darken edges, Amount < 0 = lighten edges
    float darken = 1.0 - (1.0 - vignetteMask) * abs(amount);
    
    // Highlight protection: reduce vignette effect on bright pixels
    if (highlightProtect > 0.0) {
        float luma = dot(rgb, LUMA_WEIGHTS);
        float protection = smoothstep(0.5, 1.0, luma) * highlightProtect;
        darken = mix(darken, 1.0, protection);
    }
    
    if (amount > 0.0) {
        // Darken: multiply
        return rgb * darken;
    } else {
        // Lighten: screen blend inverse
        return 1.0 - (1.0 - rgb) * darken;
    }
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 texSize = vec2(textureSize(inputTex, 0));
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : texSize;
    vec2 uv = gl_FragCoord.xy / texSize;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / fullRes;
    
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Early exit if no vignette
    if (abs(vignetteAmount) < 0.001) {
        fragColor = color;
        return;
    }
    
    // Decode to linear
    vec3 rgb = srgbToLinear(color.rgb);
    
    // Compute aspect ratio for ellipse using full image dimensions
    vec2 aspectRatio = vec2(1.0);
    if (fullRes.x > fullRes.y) {
        aspectRatio = vec2(fullRes.x / fullRes.y, 1.0);
    } else {
        aspectRatio = vec2(1.0, fullRes.y / fullRes.x);
    }

    // Compute vignette mask using global UV so center is full-image center
    float vignetteMask = computeVignette(globalUV, aspectRatio, vignetteMidpoint,
                                         vignetteRoundness, vignetteFeather);
    
    // Apply vignette
    rgb = applyVignette(rgb, vignetteMask, vignetteAmount, vigHiProtect);
    
    // Final encode to sRGB
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - Vignette Pass (WGSL)
 * Elliptical vignette with highlight preservation
 * Applied as final spatial modifier
 */

struct Uniforms {
    vignetteAmount: f32,
    vignetteMidpoint: f32,
    vignetteRoundness: f32,
    vignetteFeather: f32,
    vigHiProtect: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA_WEIGHTS = vec3<f32>(0.2126, 0.7152, 0.0722);

// sRGB to linear
fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Compute vignette mask
fn computeVignette(uv: vec2<f32>, aspectRatio: vec2<f32>, midpoint: f32, 
                   roundness: f32, feather: f32) -> f32 {
    var centered = uv - 0.5;
    
    var scale: vec2<f32>;
    if (roundness > 0.0) {
        scale = mix(aspectRatio, vec2<f32>(1.0), roundness);
    } else {
        scale = mix(aspectRatio, aspectRatio * vec2<f32>(1.0 + abs(roundness), 1.0 - abs(roundness) * 0.5), -roundness);
    }
    
    centered *= scale;
    
    let dist = length(centered) * 2.0;
    
    let inner = midpoint - feather * 0.5;
    let outer = midpoint + feather * 0.5;
    
    return 1.0 - smoothstep(inner, outer, dist);
}

// Apply vignette
fn applyVignette(rgb: vec3<f32>, vignetteMask: f32, amount: f32, highlightProtect: f32) -> vec3<f32> {
    if (abs(amount) < 0.001) { return rgb; }
    
    var darken = 1.0 - (1.0 - vignetteMask) * abs(amount);
    
    if (highlightProtect > 0.0) {
        let luma = dot(rgb, LUMA_WEIGHTS);
        let protection = smoothstep(0.5, 1.0, luma) * highlightProtect;
        darken = mix(darken, 1.0, protection);
    }
    
    if (amount > 0.0) {
        return rgb * darken;
    } else {
        return 1.0 - (1.0 - rgb) * darken;
    }
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    if (abs(uniforms.vignetteAmount) < 0.001) {
        return color;
    }
    
    var rgb = srgbToLinear(color.rgb);
    
    var aspectRatio: vec2<f32>;
    if (texSize.x > texSize.y) {
        aspectRatio = vec2<f32>(texSize.x / texSize.y, 1.0);
    } else {
        aspectRatio = vec2<f32>(1.0, texSize.y / texSize.x);
    }
    
    let vignetteMask = computeVignette(uv, aspectRatio, uniforms.vignetteMidpoint, 
                                        uniforms.vignetteRoundness, uniforms.vignetteFeather);
    
    rgb = applyVignette(rgb, vignetteMask, uniforms.vignetteAmount, 
                        uniforms.vigHiProtect);
    
    rgb = linearToSrgb(max(rgb, vec3<f32>(0.0)));
    
    return vec4<f32>(rgb, color.a);
}
`},wheels:{glsl:`/*
 * Grade - Three-Way Color Wheels Pass
 * Shadows/Midtones/Highlights color balance
 * Classic 3-way corrector with separate chroma moves per tonal range
 */

#ifdef GL_ES
precision highp float;
#endif

uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform sampler2D inputTex;
uniform vec3 wheelShadows;
uniform vec3 wheelMidtones;
uniform vec3 wheelHighlights;
uniform float wheelBalance;

out vec4 fragColor;

const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

// sRGB to linear
vec3 srgbToLinear(vec3 srgb) {
    vec3 linear;
    for (int i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Tonal range weights with adjustable balance
float shadowWeight(float luma, float balance) {
    float boundary = 0.33 - balance * 0.15;
    return 1.0 - smoothstep(0.0, boundary * 2.0, luma);
}

float midtoneWeight(float luma, float balance) {
    float center = 0.5;
    float spread = 0.4 - abs(balance) * 0.1;
    float dist = abs(luma - center) / spread;
    return max(0.0, 1.0 - dist);
}

float highlightWeight(float luma, float balance) {
    float boundary = 0.67 + balance * 0.15;
    return smoothstep(boundary - 0.33, 1.0, luma);
}

// Apply color wheel adjustment
// Wheel values are 0.5 = neutral, deviation from 0.5 = color push
vec3 applyWheels(vec3 rgb, vec3 shadowWheel, vec3 midWheel, vec3 highWheel, float balance) {
    // Convert wheel positions to color offsets
    vec3 shadowOffset = (shadowWheel - 0.5) * 2.0;
    vec3 midOffset = (midWheel - 0.5) * 2.0;
    vec3 highOffset = (highWheel - 0.5) * 2.0;
    
    // Skip if all neutral
    if (length(shadowOffset) < 0.01 && length(midOffset) < 0.01 && length(highOffset) < 0.01) {
        return rgb;
    }
    
    float luma = dot(rgb, LUMA_WEIGHTS);
    
    // Compute tonal weights
    float sW = shadowWeight(luma, balance);
    float mW = midtoneWeight(luma, balance);
    float hW = highlightWeight(luma, balance);
    
    // Normalize weights so they sum to ~1 for smooth blending
    float totalWeight = sW + mW + hW + 0.001;
    sW /= totalWeight;
    mW /= totalWeight;
    hW /= totalWeight;
    
    // Apply weighted color offsets
    vec3 colorShift = vec3(0.0);
    colorShift += shadowOffset * sW * 0.5;
    colorShift += midOffset * mW * 0.5;
    colorShift += highOffset * hW * 0.5;
    
    // Add shift while preserving luminance structure
    vec3 result = rgb + colorShift;
    
    // Gentle luma preservation (optional, reduces color wash)
    float newLuma = dot(result, LUMA_WEIGHTS);
    float lumaDiff = luma - newLuma;
    result += lumaDiff * 0.3;
    
    return result;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 color = texelFetch(inputTex, coord, 0);
    
    // Decode to linear
    vec3 rgb = srgbToLinear(color.rgb);
    
    // Apply three-way color wheels
    rgb = applyWheels(rgb, wheelShadows, wheelMidtones, wheelHighlights, wheelBalance);
    
    // Encode back to sRGB
    rgb = linearToSrgb(max(rgb, vec3(0.0)));
    
    fragColor = vec4(rgb, color.a);
}
`,wgsl:`/*
 * Grade - Three-Way Color Wheels Pass (WGSL)
 * Shadows/Midtones/Highlights color balance
 * Classic 3-way corrector with separate chroma moves per tonal range
 */

struct Uniforms {
    wheelBalance: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
    wheelShadows: vec3<f32>,
    _pad3: f32,
    wheelMidtones: vec3<f32>,
    _pad4: f32,
    wheelHighlights: vec3<f32>,
    _pad5: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const LUMA_WEIGHTS = vec3<f32>(0.2126, 0.7152, 0.0722);

// sRGB to linear
fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
    var linear: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (srgb[i] <= 0.04045) {
            linear[i] = srgb[i] / 12.92;
        } else {
            linear[i] = pow((srgb[i] + 0.055) / 1.055, 2.4);
        }
    }
    return linear;
}

// Linear to sRGB
fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb: vec3<f32>;
    for (var i = 0; i < 3; i++) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// Tonal range weights
fn shadowWeight(luma: f32, balance: f32) -> f32 {
    let boundary = 0.33 - balance * 0.15;
    return 1.0 - smoothstep(0.0, boundary * 2.0, luma);
}

fn midtoneWeight(luma: f32, balance: f32) -> f32 {
    let center = 0.5;
    let spread = 0.4 - abs(balance) * 0.1;
    let dist = abs(luma - center) / spread;
    return max(0.0, 1.0 - dist);
}

fn highlightWeight(luma: f32, balance: f32) -> f32 {
    let boundary = 0.67 + balance * 0.15;
    return smoothstep(boundary - 0.33, 1.0, luma);
}

// Apply color wheel adjustment
fn applyWheels(rgb: vec3<f32>, shadowWheel: vec3<f32>, midWheel: vec3<f32>, 
               highWheel: vec3<f32>, balance: f32) -> vec3<f32> {
    let shadowOffset = (shadowWheel - 0.5) * 2.0;
    let midOffset = (midWheel - 0.5) * 2.0;
    let highOffset = (highWheel - 0.5) * 2.0;
    
    if (length(shadowOffset) < 0.01 && length(midOffset) < 0.01 && length(highOffset) < 0.01) {
        return rgb;
    }
    
    let luma = dot(rgb, LUMA_WEIGHTS);
    
    var sW = shadowWeight(luma, balance);
    var mW = midtoneWeight(luma, balance);
    var hW = highlightWeight(luma, balance);
    
    let totalWeight = sW + mW + hW + 0.001;
    sW /= totalWeight;
    mW /= totalWeight;
    hW /= totalWeight;
    
    var colorShift = vec3<f32>(0.0);
    colorShift += shadowOffset * sW * 0.5;
    colorShift += midOffset * mW * 0.5;
    colorShift += highOffset * hW * 0.5;
    
    var result = rgb + colorShift;
    
    let newLuma = dot(result, LUMA_WEIGHTS);
    let lumaDiff = luma - newLuma;
    result += lumaDiff * 0.3;
    
    return result;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let color = textureSample(inputTex, inputSampler, uv);
    
    var rgb = srgbToLinear(color.rgb);
    
    rgb = applyWheels(rgb, uniforms.wheelShadows, uniforms.wheelMidtones, 
                      uniforms.wheelHighlights, uniforms.wheelBalance);
    
    rgb = linearToSrgb(max(rgb, vec3<f32>(0.0)));
    
    return vec4<f32>(rgb, color.a);
}
`}},l=`# grade

Professional multi-stage color grading pipeline

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| preset | int | none | none/bleachBypass/cinematic/coolShadows/crossProcess/dayForNight/hardLight/infrared/matrix/monochrome/neon/noir/posterize/psychedelic/sepia/solarize/sunset/tealOrange/technicolor/underwater/vintage/warmFilm | Preset |
| alpha | float | 1 | 0-1 | Alpha |
| temperature | float | 0 | -1-1 | Temperature |
| tint | float | 0 | -1-1 | Tint |
| exposure | float | 0 | -4-4 | Exposure |
| contrast | float | 0 | -1-1 | Contrast |
| highlights | float | 0 | -1-1 | Highlights |
| shadows | float | 0 | -1-1 | Shadows |
| whites | float | 0 | -1-1 | Whites |
| blacks | float | 0 | -1-1 | Blacks |
| saturation | float | 1 | 0-2 | Saturation |
| vibrance | float | 0 | -1-1 | Vibrance |
| fadedFilm | float | 0 | 0-1 | Faded Film |
| shadowTint | vec3 | 0.5,0.5,0.5 | - | Shadow Tint |
| highlightTint | vec3 | 0.5,0.5,0.5 | - | Highlight Tint |
| splitToneBalance | float | 0 | -1-1 | Split Tone Balance |
| curveShadows | float | 0 | -1-1 | Curve Shadows |
| curveMidtones | float | 0 | -1-1 | Curve Midtones |
| curveHighlights | float | 0 | -1-1 | Curve Highlights |
| wheelShadows | vec3 | 0.5,0.5,0.5 | - | Shadows Wheel |
| wheelMidtones | vec3 | 0.5,0.5,0.5 | - | Midtones Wheel |
| wheelHighlights | vec3 | 0.5,0.5,0.5 | - | Highlights Wheel |
| wheelBalance | float | 0 | -1-1 | Wheel Balance |
| hslEnable | int | 0 | 0-1 | Enable HSL Key |
| hslHueCenter | float | 0 | 0-1 | Hue Center |
| hslHueRange | float | 0.1 | 0-0.5 | Hue Range |
| hslSatMin | float | 0 | 0-1 | Sat Min |
| hslSatMax | float | 1 | 0-1 | Sat Max |
| hslLumMin | float | 0 | 0-1 | Lum Min |
| hslLumMax | float | 1 | 0-1 | Lum Max |
| hslFeather | float | 0.1 | 0-0.5 | Feather |
| hslHueShift | float | 0 | -0.5-0.5 | Hue Shift |
| hslSatAdjust | float | 0 | -1-1 | Sat Adjust |
| hslLumAdjust | float | 0 | -1-1 | Lum Adjust |
| vignetteAmount | float | 0 | -1-1 | Vignette Amount |
| vignetteMidpoint | float | 0.5 | 0-1 | Vignette Midpoint |
| vignetteRoundness | float | 0 | -1-1 | Vignette Roundness |
| vignetteFeather | float | 0.5 | 0-1 | Vignette Feather |
| vigHiProtect | float | 0 | 0-1 | Highlight Protect |

## Notes

Pipeline order:
1. **Primary**: White balance, exposure, contrast, tonal range
2. **Creative**: Vibrance, faded film, split toning
3. **Wheels**: Three-way color correction
4. **HSL Secondary**: Selective color isolation and adjustment
5. **LUT**: Apply preset look
6. **Vignette**: Final vignette with highlight protection

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .grade()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[t,n]of Object.entries(a))e.shaders[t]={...n}}e&&l&&(e.help=l);var f="filter/grade",u="filter",c="grade",h=e;export{h as default,f as effectId,c as effectName,l as help,u as namespace};
