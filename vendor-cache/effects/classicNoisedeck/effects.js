/* classicNoisedeck/effects */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Effects",namespace:"classicNoisedeck",func:"effects",tags:["color","edges","transform"],openCategories:["general","adjustments"],description:"Multi-effect processor",globals:{effect:{type:"int",default:0,define:"EFFECT",choices:{none:0,bloom:220,blur:1,blurSharpen:300,cga:200,derivatives:120,derivDivide:2,edge:3,emboss:4,litEdge:9,outline:5,pixels:100,posterize:110,shadow:6,sharpen:7,smoothEdge:301,sobel:8,subpixel:210,zoomBlur:230},ui:{label:"effect",control:"dropdown"}},effectAmt:{type:"int",default:1,uniform:"effectAmt",min:0,max:20,ui:{label:"effect amt",control:"slider"}},scaleAmt:{type:"float",default:100,uniform:"scaleAmt",min:25,max:400,ui:{label:"scale %",control:"slider",category:"transform"}},rotation:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotate",control:"slider",category:"transform"}},offsetX:{type:"float",default:0,uniform:"offsetX",min:-100,max:100,ui:{label:"offset x",control:"slider",category:"transform"}},offsetY:{type:"float",default:0,uniform:"offsetY",min:-100,max:100,ui:{label:"offset y",control:"slider",category:"transform"}},flip:{type:"int",default:0,define:"FLIP",choices:{none:0,"Flip:":null,all:1,horizontal:2,vertical:3,"Mirror:":null,leftToRight:11,rightToLeft:12,upToDown:13,downToUp:14,lrUd:15,lrDu:16,rlUd:17,rlDu:18},ui:{label:"flip/mirror",control:"dropdown",category:"transform"}},intensity:{type:"float",default:0,uniform:"intensity",min:-100,max:100,ui:{label:"intensity",control:"slider",category:"adjustments"}},saturation:{type:"float",default:0,uniform:"saturation",min:-100,max:100,ui:{label:"saturation",control:"slider",category:"adjustments"}}},passes:[{name:"render",program:"effects",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={effects:{glsl:`#version 300 es

/*
 * General effects shader.
 * Provides color inversion, emboss, edge, and blur effects as a serial pipeline tuned for realtime toggling.
 * Maps intensity sliders into safe ranges to prevent clipping while stacking multiple filters.
 */

precision highp float;
precision highp int;

// EFFECT and FLIP are compile-time defines injected by the runtime (see
// definition.js \`globals.effect.define\` / \`globals.flip.define\`). Same Knob 2
// rationale as classicNoisedeck/noise: a runtime ~20-way \`effect\` dispatch
// pulls every leaf effect function (bloom, sobel, derivatives, convolution
// kernels, etc.) into HLSL inlining at the same call site, even though only
// one is reachable at a time. Wrapping the cascade in #if blocks lets ANGLE
// DCE the unreachable branches.
#ifndef EFFECT
#define EFFECT 0
#endif
#ifndef FLIP
#define FLIP 0
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float time;
uniform float effectAmt;
uniform float scaleAmt;
uniform float rotation;
uniform float offsetX;
uniform float offsetY;
uniform float intensity;
uniform float saturation;
out vec4 fragColor;

// convolution kernels
float emboss[9];
float sharpen[9];
float blur[9];
float edge[9];
float edge2[9];
float edge3[9];
float sharpenBlur[9];

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y


void loadKernels() {
    // kernels can be declared outside of function but values must be set inside function
    // emboss kernel
    emboss[0] = -2.0; emboss[1] = -1.0; emboss[2] = 0.0;
    emboss[3] = -1.0; emboss[4] = 1.0; emboss[5] = 1.0;
    emboss[6] = 0.0; emboss[7] = 1.0; emboss[8] = 2.0;

    // sharpen kernel
    sharpen[0] = -1.0; sharpen[1] = 0.0; sharpen[2] = -1.0;
    sharpen[3] = 0.0; sharpen[4] = 5.0; sharpen[5] = 0.0;
    sharpen[6] = -1.0; sharpen[7] = 0.0; sharpen[8] = -1.0;

    // gaussian blur kernel
    blur[0] = 1.0; blur[1] = 2.0; blur[2] = 1.0;
    blur[3] = 2.0; blur[4] = 4.0; blur[5] = 2.0;
    blur[6] = 1.0; blur[7] = 2.0; blur[8] = 1.0;

    // edge detect kernel
    edge[0] = -1.0; edge[1] = -1.0; edge[2] = -1.0;
    edge[3] = -1.0; edge[4] = 8.0; edge[5] = -1.0;
    edge[6] = -1.0; edge[7] = -1.0; edge[8] = -1.0;

    // edge detect kernel 2
    edge2[0] = -1.0; edge2[1] = 0.0; edge2[2] = -1.0;
    edge2[3] = 0.0; edge2[4] = 4.0; edge2[5] = 0.0;
    edge2[6] = -1.0; edge2[7] = 0.0; edge2[8] = -1.0;

    // edge detect kernel 3 - with gaussian smoothing
    edge3[0] = -0.875; edge3[1] = -0.75; edge3[2] = -0.875;
    edge3[3] = -0.75; edge3[4] = 5.0; edge3[5] = -0.75;
    edge3[6] = -0.875; edge3[7] = -0.75; edge3[8] = -0.875;

    // sharpen-blur kernel
    sharpenBlur[0] = -2.0; sharpenBlur[1] = 2.0; sharpenBlur[2] = -2.0;
    sharpenBlur[3] = 2.0; sharpenBlur[4] = 1.0; sharpenBlur[5] = 2.0;
    sharpenBlur[6] = -2.0; sharpenBlur[7] = 2.0; sharpenBlur[8] = -2.0;
}

// PCG PRNG - MIT License
// https://github.com/riccardoscalco/glsl-pcg-prng
uvec3 pcg(uvec3 v) {
	v = v * uint(1664525) + uint(1013904223);

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	v ^= v >> uint(16);

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	return v;
}

vec3 prng (vec3 p) {
	return vec3(pcg(uvec3(p))) / float(uint(0xffffffff));
}
// end PCG PRNG

float random(vec2 p) {
    vec3 p2 = vec3(p, 0.0);
    return float(pcg(uvec3(p2)).x) / float(uint(0xffffffff));
}


float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 rotate2D(vec2 st, float rot) {
    st.x *= aspectRatio;
    rot = map(rot, 0.0, 360.0, 0.0, 2.0);
    float angle = rot * PI;
    st -= vec2(0.5 * aspectRatio, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspectRatio, 0.5);
    st.x /= aspectRatio;
    return st;
}

vec3 brightnessContrast(vec3 color) {
    float bright = map(intensity, -100.0, 100.0, -0.4, 0.4);
    float cont = 1.0;
    if ( intensity < 0.0) {
        cont = map(intensity, -100.0, 0.0, 0.5, 1.0);
    } else {
        cont = map(intensity, 0.0, 100.0, 1.0, 1.5);
    }

    color = (color - 0.5) * cont + 0.5 + bright;
    return color;
}

vec3 saturate(vec3 color) {
    float sat = map(saturation, -100.0, 100.0, -1.0, 1.0);
    float avg = (color.r + color.g + color.b) / 3.0;
    color -= (avg - color) * sat;
    return color;
}

vec3 hsv2rgb(vec3 hsv) {
    float h = fract(hsv.x);
    float s = hsv.y;
    float v = hsv.z;
    
    float c = v * s; // Chroma
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;

    vec3 rgb;

    if (0.0 <= h && h < 1.0/6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (1.0/6.0 <= h && h < 2.0/6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (2.0/6.0 <= h && h < 3.0/6.0) {
        rgb = vec3(0.0, c, x);
    } else if (3.0/6.0 <= h && h < 4.0/6.0) {
        rgb = vec3(0.0, x, c);
    } else if (4.0/6.0 <= h && h < 5.0/6.0) {
        rgb = vec3(x, 0.0, c);
    } else if (5.0/6.0 <= h && h < 1.0) {
        rgb = vec3(c, 0.0, x);
    } else {
        rgb = vec3(0.0, 0.0, 0.0);
    }

    return rgb + vec3(m, m, m);
}

vec3 rgb2hsv(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    
    float max = max(r, max(g, b));
    float min = min(r, min(g, b));
    float delta = max - min;

    float h = 0.0;
    if (delta != 0.0) {
        if (max == r) {
            h = mod((g - b) / delta, 6.0) / 6.0;
        } else if (max == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (max == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }
    
    float s = (max == 0.0) ? 0.0 : delta / max;
    float v = max;

    return vec3(h, s, v);
}

vec3 posterize(vec3 color, float lev) {
    if (lev == 0.0) {
        return color;
    } else if (lev == 1.0) {
        return step(0.5, color);
    }

    float gamma = 0.65;
    color = pow(color, vec3(gamma));
    color = floor(color * lev) / lev;
    color = pow(color, vec3(1.0 / gamma));

    return color;
}

vec3 pixellate(vec2 uv, float size) {
    if (size < 1.0) {
        return texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0))).rgb;
    }

    size *= 4.0;

    float dx = size * (1.0 / resolution.x);
    float dy = size * (1.0 / resolution.y);
    uv -= 0.5;
    vec2 coord = vec2(dx * floor(uv.x / dx), dy * floor(uv.y / dy));
    coord += 0.5;
    return texture(inputTex, coord).rgb;
}

vec3 desaturate(vec3 color) {
    float avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    return vec3(avg);
}

vec3 convolve(vec2 uv, float kernel[9], bool divide) {
    vec2 steps = 1.0 / resolution; // 1.0 / width = 1 texel
    vec2 offset[9];
    offset[0] = vec2(-steps.x, -steps.y);     // top left
    offset[1] = vec2(0.0, -steps.y);         // top middle
    offset[2] = vec2(steps.x, -steps.y);     // top right
    offset[3] = vec2(-steps.x, 0.0);         // middle left
    offset[4] = vec2(0.0, 0.0);             //middle
    offset[5] = vec2(steps.x, 0.0);            //middle right
    offset[6] = vec2(-steps.x, steps.y);     //bottom left
    offset[7] = vec2(0.0, steps.y);         //bottom middle
    offset[8] = vec2(steps.x, steps.y);     //bottom right

    float kernelWeight = 0.0;
    vec3 conv = vec3(0.0);

    for(int i = 0; i < 9; i++){
        //sample a 3x3 grid of pixels
        vec3 color = texture(inputTex, ((uv + offset[i] * effectAmt) * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0))).rgb;

        // multiply the color by the kernel value and add it to our conv total
        conv += color * kernel[i];

        // keep a running tally of the kernel weights
        kernelWeight += kernel[i];
    }

    // normalize the convolution by dividing by the kernel weight
    if (divide) {
        conv.rgb /= kernelWeight;
    }

    return clamp(conv.rgb, 0.0, 1.0);
}

vec3 derivatives(vec3 color, vec2 uv, bool divide) {
    // use: desaturate, get deriv_x and deriv_y and calculate dist between, then multiply by color
    vec3 dcolor = desaturate(color);

    float deriv_x[9];
    deriv_x[0] = 0.0; deriv_x[1] = 0.0; deriv_x[2] = 0.0;
    deriv_x[3] = 0.0; deriv_x[4] = 1.0; deriv_x[5] = -1.0;
    deriv_x[6] = 0.0; deriv_x[7] = 0.0; deriv_x[8] = 0.0;

    float deriv_y[9];
    deriv_y[0] = 0.0; deriv_y[1] = 0.0; deriv_y[2] = 0.0;
    deriv_y[3] = 0.0; deriv_y[4] = 1.0; deriv_y[5] = 0.0;
    deriv_y[6] = 0.0; deriv_y[7] = -1.0; deriv_y[8] = 0.0;

    vec3 s1 = convolve(uv, deriv_x, divide);
    vec3 s2 = convolve(uv, deriv_y, divide);
    float dist = distance(s1, s2);
    return color *= dist;
}

vec3 sobel(vec3 color, vec2 uv) {
    // use: desaturate, get sobel_x and sobel_y and calculate dist between, then multiply by color
    vec3 dcolor = desaturate(color);

    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

    float sobel_y[9];
    sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
    sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

    vec3 s1 = convolve(uv, sobel_x, false);
    vec3 s2 = convolve(uv, sobel_y, false);
    float dist = distance(s1, s2);
    return color *= dist;
}

vec3 outline(vec3 color, vec2 uv) {
    // use: desaturate, get sobel_x and sobel_y and calculate dist between, then multiply by color
    vec3 dcolor = desaturate(color);

    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

    float sobel_y[9];
    sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
    sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

    vec3 s1 = convolve(uv, sobel_x, false);
    vec3 s2 = convolve(uv, sobel_y, false);
    float dist = distance(s1, s2);

    vec3 outcolor = color - dist;
    return max(outcolor, 0.0);
}

vec3 shadow(vec3 color, vec2 uv) {
    float sobel_x[9];
    sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
    sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
    sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

    float sobel_y[9];
    sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
    sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
    sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

    color = rgb2hsv(color);

    vec3 x = convolve(uv, sobel_x, false);
    vec3 y = convolve(uv, sobel_y, false);

    float shade = distance(x, y);
    float highlight = shade * shade;
    shade = (1.0 - ((1.0 - color.z) * (1.0 - highlight))) * shade;

    // should be effectAmt
    float alpha = 0.75;
    color = vec3(color.x, color.y, mix(color.z, shade, alpha));
    return hsv2rgb(color);
}

// Convolution kernel branch \u2014 only the active kernel for the current EFFECT
// gets compiled in. Called from main() inside the EFFECT == kernel #elif
// branch, so this function only needs to emit one kernel body.
vec3 convolutionEffect(vec3 color, vec2 uv) {
#if EFFECT == 1
    return convolve(uv, blur, true);
#elif EFFECT == 2
    // deriv divide
    return derivatives(color, uv, true);
#elif EFFECT == 120
    // deriv
    return clamp(derivatives(color, uv, false) * 2.5, 0.0, 1.0);
#elif EFFECT == 3
    return color * convolve(uv, edge2, true);
#elif EFFECT == 4
    return convolve(uv, emboss, false);
#elif EFFECT == 5
    return outline(color, uv);
#elif EFFECT == 6
    return shadow(color, uv);
#elif EFFECT == 7
    return convolve(uv, sharpen, false);
#elif EFFECT == 8
    return sobel(color, uv);
#elif EFFECT == 9
    // lit edge
    return max(color, convolve(uv, edge2, true));
#elif EFFECT == 300
    // blur-sharpen
    return convolve(uv, sharpenBlur, true);
#elif EFFECT == 301
    // smooth edge
    return convolve(uv, edge3, true);
#else
    return color;
#endif
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

float f(vec2 st) {
    return random(floor(st));
}

float bicubic(vec2 p) {
    float x = p.x;
    float y = p.y;
    float x1 = floor(x);
    float y1 = floor(y);
    float x2 = x1 + 1.;
    float y2 = y1 + 1.;
    float f11 = f(vec2(x1, y1));
    float f12 = f(vec2(x1, y2));
    float f21 = f(vec2(x2, y1));
    float f22 = f(vec2(x2, y2));
    float f11x = (f(vec2(x1 + 1., y1)) - f(vec2(x1 - 1., y1))) / 2.;
    float f12x = (f(vec2(x1 + 1., y2)) - f(vec2(x1 - 1., y2))) / 2.;
    float f21x = (f(vec2(x2 + 1., y1)) - f(vec2(x2 - 1., y1))) / 2.;
    float f22x = (f(vec2(x2 + 1., y2)) - f(vec2(x2 - 1., y2))) / 2.;
    float f11y = (f(vec2(x1, y1 + 1.)) - f(vec2(x1, y1 - 1.))) / 2.;
    float f12y = (f(vec2(x1, y2 + 1.)) - f(vec2(x1, y2 - 1.))) / 2.;
    float f21y = (f(vec2(x2, y1 + 1.)) - f(vec2(x2, y1 - 1.))) / 2.;
    float f22y = (f(vec2(x2, y2 + 1.)) - f(vec2(x2, y2 - 1.))) / 2.;
    float f11xy = (f(vec2(x1 + 1., y1 + 1.)) - f(vec2(x1 + 1., y1 - 1.)) - f(vec2(x1 - 1., y1 + 1.)) + f(vec2(x1 - 1., y1 - 1.))) / 4.;
    float f12xy = (f(vec2(x1 + 1., y2 + 1.)) - f(vec2(x1 + 1., y2 - 1.)) - f(vec2(x1 - 1., y2 + 1.)) + f(vec2(x1 - 1., y2 - 1.))) / 4.;
    float f21xy = (f(vec2(x2 + 1., y1 + 1.)) - f(vec2(x2 + 1., y1 - 1.)) - f(vec2(x2 - 1., y1 + 1.)) + f(vec2(x2 - 1., y1 - 1.))) / 4.;
    float f22xy = (f(vec2(x2 + 1., y2 + 1.)) - f(vec2(x2 + 1., y2 - 1.)) - f(vec2(x2 - 1., y2 + 1.)) + f(vec2(x2 - 1., y2 - 1.))) / 4.;
    mat4 Q = mat4(f11, f21, f11x, f21x, f12, f22, f12x, f22x, f11y, f21y, f11xy, f21xy, f12y, f22y, f12xy, f22xy);
    mat4 S = mat4(1., 0., 0., 0., 0., 0., 1., 0., -3., 3., -2., -1., 2., -2., 1., 1.);
    mat4 T = mat4(1., 0., -3., 2., 0., 0., 3., -2., 0., 1., -2., 1., 0., 0., -1., 1.);
    mat4 A = T * Q * S;
    float t = fract(p.x);
    float u = fract(p.y);
    vec4 tv = vec4(1., t, t * t, t * t * t);
    vec4 uv = vec4(1., u, u * u, u * u * u);
    return dot(tv * A, uv);
}

// CGA - MIT License
// https://github.com/spite/Wagner/blob/master/fragment-shaders/cga-fs.glsl
vec3 cga(vec4 color, vec2 st) {
	float amt = map(effectAmt, 0.0, 20.0, 0.0, 5.0);
    if (amt < 0.01) {
        return color.rgb;
    }
    float pixelDensity = amt * renderScale;
	float size = 2. * pixelDensity;
	float dSize = 2. * size;

	float amount = resolution.x / size;
	float d = 1.0 / amount;
	float ar = fullResolution.x / fullResolution.y;
	float sx = floor( st.x / d ) * d;
	d = ar / amount;
	float sy = floor( st.y / d ) * d;

	vec4 base = texture( inputTex, vec2( sx, sy ) );

	float lum = .2126 * base.r + .7152 * base.g + .0722 * base.b;
	float o = floor( 6. * lum );

	vec3 c1;
	vec3 c2;
	
	vec3 black = vec3( 0. );
	vec3 light = vec3( 85., 255., 255. ) / 255.;
	vec3 dark = vec3( 254., 84., 255. ) / 255.;
	vec3 white = vec3( 1. );

	/*dark = vec3( 89., 255., 17. ) / 255.;
	light = vec3( 255., 87., 80. ) / 255.;
	white = vec3( 255., 255., 0. ) / 255.;*/

	/*light = vec3( 85., 255., 255. ) / 255.;
	dark = vec3( 255., 86., 80. ) / 255.;*/

	if( o == 0. ) { c1 = black; c2 = c1; }
	if( o == 1. ) { c1 = black; c2 = dark; }
	if( o == 2. ) { c1 = dark;  c2 = c1; }
	if( o == 3. ) { c1 = dark;  c2 = light; }
	if( o == 4. ) { c1 = light; c2 = c1; }
	if( o == 5. ) { c1 = light; c2 = white; }
	if( o == 6. ) { c1 = white; c2 = c1; }

	if( mod( gl_FragCoord.x, dSize ) > size ) {
		if( mod( gl_FragCoord.y, dSize ) > size ) {
			base.rgb = c1;
		} else {
			base.rgb = c2;	
		}
	} else {
		if( mod( gl_FragCoord.y, dSize ) > size ) {
			base.rgb = c2;
		} else {
			base.rgb = c1;		
		}
	}

	return base.rgb;

}
// end cga

vec3 subpixel(vec2 st, float scale) {
	scale = map(scale, 0.0, 100.0, 0.0, 10.0) * renderScale;

	vec3 orig = pixellate(st, 4.0 * scale);
    vec3 color = orig;

    st *= resolution;
    st = floor(st);

    float m = mod(st.x, 4.0 * scale);

    if (mod(st.y, 4.0 * scale) <= 1.0 * scale) {
        color *= vec3(0.0);
    } else if (m <= 1.0 * scale) {
        color *= vec3(1.0, 0.0, 0.0);
    } else if (m <= 2.0 * scale) {
        color *= vec3(0.0, 1.0, 0.0);
    } else if (m <= 3.0 * scale) {
        color *= vec3(0.0, 0.0, 1.0);
    } else {
        color *= vec3(0.0);
    }

    float factor = clamp(scale * 0.25, 0.0, 1.0); 
    return mix(orig, color, factor);
}

// Bloom - MIT License
// Modified from https://github.com/spite/Wagner/blob/master/fragment-shaders/bloom-fs.glsl
vec3 bloom(vec2 st) {
    vec3 sum = vec3(0.0);
    vec3 color = vec3(0.0);
    vec3 orig = texture(inputTex, st).rgb;
    float strength = map(effectAmt, 0.0, 20.0, 0.0, 0.25);

    for (int i = -4; i < 4; i++) {
        for (int j = -3; j < 3; j++) {
            sum += texture(inputTex, st + vec2(j, i) * 0.004).rgb * strength;
        }
    }

    if (orig.r < 0.3) {
        color = sum * sum * 0.012 + orig;
    } else if (orig.r < 0.5) {
        color = sum * sum * 0.009 + orig;
    } else {
        color = sum * sum * 0.0075 + orig;
    }

    color = clamp(color, 0.0, 1.0);
    return color;
}

// Zoom blur - MIT License
// Modified from https://github.com/evanw/glfx.js/blob/master/src/filters/blur/zoomblur.js
vec3 zoomBlur(vec2 st) {
    vec3 color = vec3(0.0);
    float total = 0.0;
    vec2 toCenter = vec2(st - 0.5);

    /* randomize the lookup values to hide the fixed number of samples */
    float offset = prng(vec3(12.9898, 78.233, 151.7182)).x;
    
    for (float t = 0.0; t <= 40.0; t++) {
        float percent = (t + offset) / 40.0;
        float weight = 4.0 * (percent - percent * percent);
        float strength = map(effectAmt, 0.0, 20.0, 0.0, 1.0);
        vec4 tex = texture(inputTex, st + toCenter * percent * strength);
        color += tex.rgb * weight;
        total += weight;
    }
    
    color /= total;
    return color;
}



float offsets(vec2 st) {
    return distance(st, vec2(0.5));
}


void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    vec4 color = vec4(0.0);

    float scale = 100.0 / scaleAmt; // 25 - 400 maps to 100 / 25 (4) to 100 / 400 (0.25)

    if (scale == 0.0) {
        scale = 1.0;
    }

    // zoom
    uv = rotate2D(uv, rotation);
    uv -= 0.5;
    uv *= scale;
    uv += 0.5;

    // no
    vec2 imageSize = resolution;

    // need to subtract 50% of image width and height
    // mid center
    uv.x -= ceil((resolution.x / imageSize.x * scale * 0.5) - (0.5 - (1.0 / imageSize.x * scale)));
    uv.y += ceil((resolution.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - (scale));

    uv.x -= map(offsetX, -100.0, 100.0, -resolution.x / imageSize.x * scale, resolution.x / imageSize.x * scale) * 1.5;
    uv.y -= map(offsetY, -100.0, 100.0, -resolution.y / imageSize.y * scale, resolution.y / imageSize.y * scale) * 1.5;

    uv = fract(uv);

#if FLIP == 1
    // flip both
    uv.x = 1.0 - uv.x;
    uv.y = 1.0 - uv.y;
#elif FLIP == 2
    // flip h
    uv.x = 1.0 - uv.x;
#elif FLIP == 3
    // flip v
    uv.y = 1.0 - uv.y;
#elif FLIP == 11
    // mirror lr
    if (uv.x > 0.5) {
        uv.x = 1.0 - uv.x;
    }
#elif FLIP == 12
    // mirror rl
    if (uv.x < 0.5) {
        uv.x = 1.0 - uv.x;
    }
#elif FLIP == 13
    // mirror ud
    if (uv.y > 0.5) {
        uv.y = 1.0 - uv.y;
    }
#elif FLIP == 14
    // mirror du
    if (uv.y < 0.5) {
        uv.y = 1.0 - uv.y;
    }
#elif FLIP == 15
    // mirror lr ud
    if (uv.x > 0.5) {
        uv.x = 1.0 - uv.x;
    }
    if (uv.y > 0.5) {
        uv.y = 1.0 - uv.y;
    }
#elif FLIP == 16
    // mirror lr du
    if (uv.x > 0.5) {
        uv.x = 1.0 - uv.x;
    }
    if (uv.y < 0.5) {
        uv.y = 1.0 - uv.y;
    }
#elif FLIP == 17
    // mirror rl ud
    if (uv.x < 0.5) {
        uv.x = 1.0 - uv.x;
    }
    if (uv.y > 0.5) {
        uv.y = 1.0 - uv.y;
    }
#elif FLIP == 18
    // mirror rl du
    if (uv.x < 0.5) {
        uv.x = 1.0 - uv.x;
    }
    if (uv.y < 0.5) {
        uv.y = 1.0 - uv.y;
    }
#endif

    loadKernels();

    float blendy = periodicFunction(time - offsets(uv));

    vec2 origUV = uv;
    vec4 origcolor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));
    color = origcolor;

#if EFFECT != 0
    if (effectAmt != 0.0) {
#if EFFECT == 100
        color.rgb = pixellate(uv, effectAmt);
#elif EFFECT == 110
        color.rgb = posterize(color.rgb, effectAmt);
#elif EFFECT == 200
        color.rgb = cga(color, uv);
#elif EFFECT == 210
        color.rgb = subpixel(uv, effectAmt);
#elif EFFECT == 220
        color.rgb = bloom(uv);
#elif EFFECT == 230
        color.rgb = zoomBlur(uv);
#else
        // convolution kernel branches handled inside convolutionEffect()
        color.rgb = convolutionEffect(color.rgb, uv);
#endif
    }
#endif

    // brightness/contrast/saturation
    color.rgb = brightnessContrast(color.rgb);
    color.rgb = saturate(color.rgb);

    fragColor = color;
}
`,wgsl:`/*
 * General effects shader (WGSL port).
 * Provides color inversion, emboss, edge, blur, and other effects.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

// EFFECT and FLIP are compile-time consts injected by the runtime via
// injectDefines (see classicNoisedeck/effects/definition.js
// \`globals.effect.define\` / \`globals.flip.define\`). Same fix as the GLSL
// backend \u2014 collapses the runtime cascade so Dawn constant-folds the variant
// branches.
struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    // Effect params in definition.js globals order:
    // (effect was here \u2014 now compile-time EFFECT)
    effectAmt: f32,
    // (flip was here \u2014 now compile-time FLIP)
    scaleAmt: f32,
    rotation: f32,
    offsetX: f32,
    offsetY: f32,
    intensity: f32,
    saturation: f32,
}

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn aspectRatio() -> f32 {
    return u.resolution.x / u.resolution.y;
}

fn mapRange(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// PCG PRNG
fn pcg(v_in: vec3u) -> vec3u {
    var v = v_in * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> vec3u(16u);
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

fn prng(p: vec3f) -> vec3f {
    return vec3f(pcg(vec3u(p))) / f32(0xffffffffu);
}

fn random(p: vec2f) -> f32 {
    let p2 = vec3f(p, 0.0);
    return f32(pcg(vec3u(p2)).x) / f32(0xffffffffu);
}

fn rotate2D(st_in: vec2f, rot: f32) -> vec2f {
    var st = st_in;
    st.x *= aspectRatio();
    let r = mapRange(rot, 0.0, 360.0, 0.0, 2.0);
    let angle = r * PI;
    st -= vec2f(0.5 * aspectRatio(), 0.5);
    let c = cos(angle);
    let s = sin(angle);
    st = vec2f(c * st.x - s * st.y, s * st.x + c * st.y);
    st += vec2f(0.5 * aspectRatio(), 0.5);
    st.x /= aspectRatio();
    return st;
}

fn brightnessContrast(color: vec3f) -> vec3f {
    let bright = mapRange(u.intensity, -100.0, 100.0, -0.4, 0.4);
    var cont = 1.0;
    if (u.intensity < 0.0) {
        cont = mapRange(u.intensity, -100.0, 0.0, 0.5, 1.0);
    } else {
        cont = mapRange(u.intensity, 0.0, 100.0, 1.0, 1.5);
    }
    return (color - 0.5) * cont + 0.5 + bright;
}

fn saturateFn(color: vec3f) -> vec3f {
    let sat = mapRange(u.saturation, -100.0, 100.0, -1.0, 1.0);
    let avg = (color.r + color.g + color.b) / 3.0;
    return color - (avg - color) * sat;
}

fn hsv2rgb(hsv: vec3f) -> vec3f {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;
    let c = v * s;
    let x = c * (1.0 - abs(fract(h * 6.0) * 2.0 - 1.0));
    let m = v - c;
    var rgb: vec3f;
    if (h < 1.0/6.0) { rgb = vec3f(c, x, 0.0); }
    else if (h < 2.0/6.0) { rgb = vec3f(x, c, 0.0); }
    else if (h < 3.0/6.0) { rgb = vec3f(0.0, c, x); }
    else if (h < 4.0/6.0) { rgb = vec3f(0.0, x, c); }
    else if (h < 5.0/6.0) { rgb = vec3f(x, 0.0, c); }
    else { rgb = vec3f(c, 0.0, x); }
    return rgb + vec3f(m);
}

fn rgb2hsv(rgb: vec3f) -> vec3f {
    let maxC = max(rgb.r, max(rgb.g, rgb.b));
    let minC = min(rgb.r, min(rgb.g, rgb.b));
    let delta = maxC - minC;
    var h = 0.0;
    if (delta != 0.0) {
        if (maxC == rgb.r) { h = ((rgb.g - rgb.b) / delta) % 6.0 / 6.0; }
        else if (maxC == rgb.g) { h = ((rgb.b - rgb.r) / delta + 2.0) / 6.0; }
        else { h = ((rgb.r - rgb.g) / delta + 4.0) / 6.0; }
    }
    let s = select(0.0, delta / maxC, maxC != 0.0);
    return vec3f(h, s, maxC);
}

fn posterize(color: vec3f, levIn: f32) -> vec3f {
    var lev = levIn;
    if (lev == 0.0) { return color; }
    else if (lev == 1.0) { return step(vec3f(0.5), color); }
    let gamma = 0.65;
    var c = pow(color, vec3f(gamma));
    c = floor(c * lev) / lev;
    return pow(c, vec3f(1.0 / gamma));
}

fn pixellate(uv_in: vec2f, sizeIn: f32) -> vec3f {
    var size = sizeIn;
    if (size < 1.0) { return textureSample(inputTex, samp, uv_in).rgb; }
    size *= 4.0;
    let dx = size / u.resolution.x;
    let dy = size / u.resolution.y;
    var uv = uv_in - 0.5;
    let coord = vec2f(dx * floor(uv.x / dx), dy * floor(uv.y / dy)) + 0.5;
    return textureSample(inputTex, samp, coord).rgb;
}

fn desaturate(color: vec3f) -> vec3f {
    let avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    return vec3f(avg);
}

fn convolve(uv: vec2f, kernel: array<f32, 9>, divide: bool) -> vec3f {
    let steps = 1.0 / u.resolution;
    let offsets = array<vec2f, 9>(
        vec2f(-steps.x, -steps.y), vec2f(0.0, -steps.y), vec2f(steps.x, -steps.y),
        vec2f(-steps.x, 0.0), vec2f(0.0, 0.0), vec2f(steps.x, 0.0),
        vec2f(-steps.x, steps.y), vec2f(0.0, steps.y), vec2f(steps.x, steps.y)
    );
    var kernelWeight = 0.0;
    var conv = vec3f(0.0);
    for (var i = 0; i < 9; i++) {
        let color = textureSample(inputTex, samp, uv + offsets[i] * u.effectAmt).rgb;
        conv += color * kernel[i];
        kernelWeight += kernel[i];
    }
    if (divide && kernelWeight != 0.0) { conv /= kernelWeight; }
    return clamp(conv, vec3f(0.0), vec3f(1.0));
}

fn derivatives(color: vec3f, uv: vec2f, divide: bool) -> vec3f {
    let deriv_x = array<f32, 9>(0.0, 0.0, 0.0, 0.0, 1.0, -1.0, 0.0, 0.0, 0.0);
    let deriv_y = array<f32, 9>(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0);
    let s1 = convolve(uv, deriv_x, divide);
    let s2 = convolve(uv, deriv_y, divide);
    return color * distance(s1, s2);
}

fn sobel(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    let s1 = convolve(uv, sobel_x, false);
    let s2 = convolve(uv, sobel_y, false);
    return color * distance(s1, s2);
}

fn outline(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    let s1 = convolve(uv, sobel_x, false);
    let s2 = convolve(uv, sobel_y, false);
    return max(color - distance(s1, s2), vec3f(0.0));
}

fn shadow(color_in: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    var color = rgb2hsv(color_in);
    let x = convolve(uv, sobel_x, false);
    let y = convolve(uv, sobel_y, false);
    let shade_dist = distance(x, y);
    let highlight = shade_dist * shade_dist;
    let shade = (1.0 - ((1.0 - color.z) * (1.0 - highlight))) * shade_dist;
    color = vec3f(color.x, color.y, mix(color.z, shade, 0.75));
    return hsv2rgb(color);
}

fn convolutionEffect(color: vec3f, uv: vec2f) -> vec3f {
    let emboss = array<f32, 9>(-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);
    let sharpen = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 5.0, 0.0, -1.0, 0.0, -1.0);
    let blur = array<f32, 9>(1.0, 2.0, 1.0, 2.0, 4.0, 2.0, 1.0, 2.0, 1.0);
    let edge2 = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 4.0, 0.0, -1.0, 0.0, -1.0);
    let edge3 = array<f32, 9>(-0.875, -0.75, -0.875, -0.75, 5.0, -0.75, -0.875, -0.75, -0.875);
    let sharpenBlur = array<f32, 9>(-2.0, 2.0, -2.0, 2.0, 1.0, 2.0, -2.0, 2.0, -2.0);

    if (EFFECT == 1) { return convolve(uv, blur, true); }
    else if (EFFECT == 2) { return derivatives(color, uv, true); }
    else if (EFFECT == 120) { return clamp(derivatives(color, uv, false) * 2.5, vec3f(0.0), vec3f(1.0)); }
    else if (EFFECT == 3) { return color * convolve(uv, edge2, true); }
    else if (EFFECT == 4) { return convolve(uv, emboss, false); }
    else if (EFFECT == 5) { return outline(color, uv); }
    else if (EFFECT == 6) { return shadow(color, uv); }
    else if (EFFECT == 7) { return convolve(uv, sharpen, false); }
    else if (EFFECT == 8) { return sobel(color, uv); }
    else if (EFFECT == 9) { return max(color, convolve(uv, edge2, true)); }
    else if (EFFECT == 300) { return convolve(uv, sharpenBlur, true); }
    else if (EFFECT == 301) { return convolve(uv, edge3, true); }
    return color;
}

fn cga(color: vec4f, st: vec2f) -> vec3f {
    let amt = mapRange(u.effectAmt, 0.0, 20.0, 0.0, 5.0);
    if (amt < 0.01) { return color.rgb; }
    let pixelDensity = amt;
    let size = 2.0 * pixelDensity;
    let dSize = 2.0 * size;
    let amount = u.resolution.x / size;
    var d = 1.0 / amount;
    let ar = u.resolution.x / u.resolution.y;
    let sx = floor(st.x / d) * d;
    d = ar / amount;
    let sy = floor(st.y / d) * d;
    let base = textureSample(inputTex, samp, vec2f(sx, sy));
    let lum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;
    let o = floor(6.0 * lum);
    let black = vec3f(0.0);
    let light = vec3f(85.0, 255.0, 255.0) / 255.0;
    let dark = vec3f(254.0, 84.0, 255.0) / 255.0;
    let white = vec3f(1.0);
    var c1 = black;
    var c2 = black;
    if (o == 0.0) { c1 = black; c2 = black; }
    else if (o == 1.0) { c1 = black; c2 = dark; }
    else if (o == 2.0) { c1 = dark; c2 = dark; }
    else if (o == 3.0) { c1 = dark; c2 = light; }
    else if (o == 4.0) { c1 = light; c2 = light; }
    else if (o == 5.0) { c1 = light; c2 = white; }
    else { c1 = white; c2 = white; }
    let fx = st.x * u.resolution.x;
    let fy = st.y * u.resolution.y;
    var result = c1;
    if ((fx % dSize) > size) {
        if ((fy % dSize) > size) { result = c1; } else { result = c2; }
    } else {
        if ((fy % dSize) > size) { result = c2; } else { result = c1; }
    }
    return result;
}

fn subpixel(st: vec2f, scaleIn: f32) -> vec3f {
    let scale = mapRange(scaleIn, 0.0, 100.0, 0.0, 10.0);
    let orig = pixellate(st, scale);
    var color = orig;
    let coord = floor(st * u.resolution);
    let m = coord.x % (4.0 * scale);
    if ((coord.y % (4.0 * scale)) <= scale) {
        color *= vec3f(0.0);
    } else if (m <= scale) {
        color *= vec3f(1.0, 0.0, 0.0);
    } else if (m <= 2.0 * scale) {
        color *= vec3f(0.0, 1.0, 0.0);
    } else if (m <= 3.0 * scale) {
        color *= vec3f(0.0, 0.0, 1.0);
    } else {
        color *= vec3f(0.0);
    }
    let factor = clamp(scale * 0.25, 0.0, 1.0);
    return mix(orig, color, factor);
}

fn bloom(st: vec2f) -> vec3f {
    var sum = vec3f(0.0);
    let orig = textureSample(inputTex, samp, st).rgb;
    let strength = mapRange(u.effectAmt, 0.0, 20.0, 0.0, 0.25);
    for (var i = -4; i < 4; i++) {
        for (var j = -3; j < 3; j++) {
            sum += textureSample(inputTex, samp, st + vec2f(f32(j), f32(i)) * 0.004).rgb * strength;
        }
    }
    var color: vec3f;
    if (orig.r < 0.3) { color = sum * sum * 0.012 + orig; }
    else if (orig.r < 0.5) { color = sum * sum * 0.009 + orig; }
    else { color = sum * sum * 0.0075 + orig; }
    return clamp(color, vec3f(0.0), vec3f(1.0));
}

fn zoomBlur(st: vec2f) -> vec3f {
    var color = vec3f(0.0);
    var total = 0.0;
    let toCenter = st - 0.5;
    let offset = prng(vec3f(12.9898, 78.233, 151.7182)).x;
    for (var t = 0.0; t <= 40.0; t += 1.0) {
        let percent = (t + offset) / 40.0;
        let weight = 4.0 * (percent - percent * percent);
        let strength = mapRange(u.effectAmt, 0.0, 20.0, 0.0, 1.0);
        let tex = textureSample(inputTex, samp, st + toCenter * percent * strength);
        color += tex.rgb * weight;
        total += weight;
    }
    return color / total;
}

fn periodicFunction(p: f32) -> f32 {
    return mapRange(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

fn offsets(st: vec2f) -> f32 {
    return distance(st, vec2f(0.5));
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / u.resolution;

    var scale = 100.0 / u.scaleAmt;
    if (scale == 0.0) { scale = 1.0; }

    uv = rotate2D(uv, u.rotation);
    uv -= 0.5;
    uv *= scale;
    uv += 0.5;

    let imageSize = u.resolution;
    uv.x -= ceil((u.resolution.x / imageSize.x * scale * 0.5) - (0.5 - (1.0 / imageSize.x * scale)));
    uv.y += ceil((u.resolution.y / imageSize.y * scale * 0.5) + (0.5 - (1.0 / imageSize.y * scale)) - scale);
    uv.x -= mapRange(u.offsetX, -100.0, 100.0, -u.resolution.x / imageSize.x * scale, u.resolution.x / imageSize.x * scale) * 1.5;
    uv.y -= mapRange(u.offsetY, -100.0, 100.0, -u.resolution.y / imageSize.y * scale, u.resolution.y / imageSize.y * scale) * 1.5;
    uv = fract(uv);

    // flip/mirror
    if (FLIP == 1) { uv = 1.0 - uv; }
    else if (FLIP == 2) { uv.x = 1.0 - uv.x; }
    else if (FLIP == 3) { uv.y = 1.0 - uv.y; }
    else if (FLIP == 11) { if (uv.x > 0.5) { uv.x = 1.0 - uv.x; } }
    else if (FLIP == 12) { if (uv.x < 0.5) { uv.x = 1.0 - uv.x; } }
    else if (FLIP == 13) { if (uv.y > 0.5) { uv.y = 1.0 - uv.y; } }
    else if (FLIP == 14) { if (uv.y < 0.5) { uv.y = 1.0 - uv.y; } }
    else if (FLIP == 15) { if (uv.x > 0.5) { uv.x = 1.0 - uv.x; } if (uv.y > 0.5) { uv.y = 1.0 - uv.y; } }
    else if (FLIP == 16) { if (uv.x > 0.5) { uv.x = 1.0 - uv.x; } if (uv.y < 0.5) { uv.y = 1.0 - uv.y; } }
    else if (FLIP == 17) { if (uv.x < 0.5) { uv.x = 1.0 - uv.x; } if (uv.y > 0.5) { uv.y = 1.0 - uv.y; } }
    else if (FLIP == 18) { if (uv.x < 0.5) { uv.x = 1.0 - uv.x; } if (uv.y < 0.5) { uv.y = 1.0 - uv.y; } }

    var color = textureSample(inputTex, samp, uv);

    if (u.effectAmt != 0.0 && EFFECT != 0) {
        if (EFFECT == 100) { color = vec4f(pixellate(uv, u.effectAmt), color.a); }
        else if (EFFECT == 110) { color = vec4f(posterize(color.rgb, u.effectAmt), color.a); }
        else if (EFFECT == 200) { color = vec4f(cga(color, uv), color.a); }
        else if (EFFECT == 210) { color = vec4f(subpixel(uv, u.effectAmt), color.a); }
        else if (EFFECT == 220) { color = vec4f(bloom(uv), color.a); }
        else if (EFFECT == 230) { color = vec4f(zoomBlur(uv), color.a); }
        else { color = vec4f(convolutionEffect(color.rgb, uv), color.a); }
    }

    var c = brightnessContrast(color.rgb);
    c = saturateFn(c);

    return vec4f(c, color.a);
}
`}},l=`# effects

Multi-effect processor

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| effect | int | none | none/bloom/blur/blurSharpen/cga/derivatives/derivDivide/edge/emboss/litEdge/outline/pixels/posterize/shadow/sharpen/smoothEdge/sobel/subpixel/zoomBlur | Effect |
| effectAmt | int | 1 | 0-20 | Effect amt |
| flip | int | none | none/Flip:/all/horizontal/vertical/Mirror:/leftToRight/rightToLeft/upToDown/downToUp/lrUd/lrDu/rlUd/rlDu | Flip/mirror |
| scaleAmt | float | 100 | 25-400 | Scale % |
| rotation | float | 0 | -180-180 | Rotate |
| offsetX | float | 0 | -100-100 | Offset x |
| offsetY | float | 0 | -100-100 | Offset y |
| intensity | float | 0 | -100-100 | Intensity |
| saturation | float | 0 | -100-100 | Saturation |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .effects()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&l&&(n.help=l);var c="classicNoisedeck/effects",v="classicNoisedeck",u="effects",d=n;export{d as default,c as effectId,u as effectName,l as help,v as namespace};
