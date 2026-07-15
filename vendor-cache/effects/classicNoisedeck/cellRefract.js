/* classicNoisedeck/cellRefract */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"CellRefract",namespace:"classicNoisedeck",func:"cellRefract",tags:["distort","noise"],description:"Cell-based refraction",globals:{amount:{type:"float",default:23,uniform:"refractAmt",min:0,max:100,ui:{label:"refract",control:"slider"}},direction:{type:"float",default:0,uniform:"direction",min:0,max:360,ui:{label:"refract dir",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1},ui:{label:"wrap",control:"dropdown"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},shape:{type:"int",default:1,define:"SHAPE",choices:{circle:0,diamond:1,hexagon:2,octagon:3,square:4,triangle:6},ui:{label:"shape",control:"dropdown",category:"cells"}},scale:{type:"float",default:50,uniform:"scale",min:1,max:100,ui:{label:"scale",control:"slider",category:"cells"}},cellScale:{type:"float",default:75,uniform:"cellScale",min:1,max:100,ui:{label:"cell scale",control:"slider",category:"cells"}},smooth:{type:"float",default:0,uniform:"cellSmooth",min:0,max:100,ui:{label:"cell smooth",control:"slider",category:"cells"}},variation:{type:"float",default:0,uniform:"variation",min:0,max:100,ui:{label:"cell variation",control:"slider",category:"cells"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider",category:"cells"}},kernel:{type:"int",default:0,define:"KERNEL",choices:{none:0,blur:1,derivatives:120,derivDivide:2,edge:3,emboss:4,litEdge:9,outline:5,pixels:100,posterize:110,shadow:6,sharpen:7,sobel:8},ui:{label:"effect",control:"dropdown",category:"effect"}},effectWidth:{type:"int",default:0,uniform:"effectWidth",min:0,max:10,ui:{label:"effect width",control:"slider",category:"effect",enabledBy:{param:"kernel",neq:0}}}},paramAliases:{cellSmooth:"smooth",cellVariation:"variation",refractAmt:"amount",refractDir:"direction",loopAmp:"speed"},passes:[{name:"render",program:"cellRefract",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={cellRefract:{glsl:`#version 300 es

/*
 * Cell refract shader.
 * Uses cell-noise distance fields to refract the input feed in a controllable manner.
 * Refraction strength is normalized against resolution to avoid over-sampling artifacts.
 */

precision highp float;
precision highp int;

// SHAPE and KERNEL are compile-time defines injected by the runtime (see
// definition.js \`globals.{shape,kernel}.define\`). Same Knob 2 rationale as
// classicNoisedeck/effects: shape is dispatched 25 times per pixel inside
// the cells() inner loop, and kernel is the same multi-way convolution
// dispatch used by classicNoisedeck/effects \u2014 both balloon HLSL inlining.
#ifndef SHAPE
#define SHAPE 1
#endif
#ifndef KERNEL
#define KERNEL 0
#endif

uniform sampler2D inputTex;
uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float scale;
uniform float cellScale;
uniform float cellSmooth;
uniform float variation;
uniform float speed;
uniform float refractAmt;
uniform float direction;
uniform int wrap;
uniform float effectWidth;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

// convolution kernels
float emboss[9];
float sharpen[9];
float blur[9];
float edge[9];
float edge2[9];

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
}

vec3 convolve(vec2 localUV, float kernel[9], bool divide) {
    vec2 texelSize = 1.0 / vec2(textureSize(inputTex, 0));
    vec2 offset[9];
    offset[0] = vec2(-texelSize.x, -texelSize.y);   // top left
    offset[1] = vec2(0.0, -texelSize.y);        // top middle
    offset[2] = vec2(texelSize.x, -texelSize.y);    // top right
    offset[3] = vec2(-texelSize.x, 0.0);        // middle left
    offset[4] = vec2(0.0, 0.0);             //middle
    offset[5] = vec2(texelSize.x, 0.0);         //middle right
    offset[6] = vec2(-texelSize.x, texelSize.y);    //bottom left
    offset[7] = vec2(0.0, texelSize.y);         //bottom middle
    offset[8] = vec2(texelSize.x, texelSize.y);     //bottom right

    float kernelWeight = 0.0;
    vec3 conv = vec3(0.0);

    for(int i = 0; i < 9; i++){
        //sample a 3x3 grid of pixels
        vec3 color = texture(inputTex, localUV + offset[i] * effectWidth).rgb;

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

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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

vec3 desaturate(vec3 color) {
	float avg = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
	return vec3(avg);
}

vec3 derivatives(vec3 color, vec2 localUV, bool divide) {
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

	vec3 s1 = convolve(localUV, deriv_x, divide);
	vec3 s2 = convolve(localUV, deriv_y, divide);
	float dist = distance(s1, s2);
	return color *= dist;
}

vec3 sobel(vec3 color, vec2 localUV) {
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

	vec3 s1 = convolve(localUV, sobel_x, false);
	vec3 s2 = convolve(localUV, sobel_y, false);
	float dist = distance(s1, s2);
	return color *= dist;
}

vec3 shadow(vec3 color, vec2 localUV) {
	float sobel_x[9];
	sobel_x[0] = 1.0; sobel_x[1] = 0.0; sobel_x[2] = -1.0;
	sobel_x[3] = 2.0; sobel_x[4] = 0.0; sobel_x[5] = -2.0;
	sobel_x[6] = 1.0; sobel_x[7] = 0.0; sobel_x[8] = -1.0;

	float sobel_y[9];
	sobel_y[0] = 1.0; sobel_y[1] = 2.0; sobel_y[2] = 1.0;
	sobel_y[3] = 0.0; sobel_y[4] = 0.0; sobel_y[5] = 0.0;
	sobel_y[6] = -1.0; sobel_y[7] = -2.0; sobel_y[8] = -1.0;

	color = rgb2hsv(color);

	vec3 x = convolve(localUV, sobel_x, false);
	vec3 y = convolve(localUV, sobel_y, false);

	float shade = distance(x, y);
	float highlight = shade * shade;
	shade = (1.0 - ((1.0 - color.z) * (1.0 - highlight))) * shade;

	// should be effectWidth
	float alpha = 0.75;
	color = vec3(color.x, color.y, mix(color.z, shade, alpha));
	return hsv2rgb(color);
}

vec3 outline(vec3 color, vec2 localUV) {
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

    vec3 s1 = convolve(localUV, sobel_x, false);
    vec3 s2 = convolve(localUV, sobel_y, false);
    float dist = distance(s1, s2);

    vec3 outcolor = color - dist;
    return max(outcolor, 0.0);
}

// Per-KERNEL convolution branch \u2014 only the active kernel for the current
// program gets compiled. Called from main() inside \`KERNEL != 0/100/110\`.
vec3 convolutionKernel(vec3 color, vec2 localUV) {
#if KERNEL == 1
    return convolve(localUV, blur, true);
#elif KERNEL == 2
    // deriv divide
    return derivatives(color, localUV, true);
#elif KERNEL == 120
    // deriv
    return clamp(derivatives(color, localUV, false) * 2.5, 0.0, 1.0);
#elif KERNEL == 3
    return color * convolve(localUV, edge2, true);
#elif KERNEL == 4
    return convolve(localUV, emboss, false);
#elif KERNEL == 5
    return outline(color, localUV);
#elif KERNEL == 6
    return shadow(color, localUV);
#elif KERNEL == 7
    return convolve(localUV, sharpen, false);
#elif KERNEL == 8
    return sobel(color, localUV);
#elif KERNEL == 9
    // lit edge
    return max(color, convolve(localUV, edge2, true));
#else
    return color;
#endif
}

float periodicFunction(float p) {
    return map(sin(p * TAU), -1.0, 1.0, 0.0, 1.0);
}

float polarShape(vec2 st, int sides) {
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st);
}

float shapeDistance(vec2 st, vec2 offset, float scale) {
	st += offset;

	float d = 1.0;
#if SHAPE == 0
    // circle
    d = length(st * 1.2);
#elif SHAPE == 2
    // hexagon
    d = polarShape(st * 1.2, 6);
#elif SHAPE == 3
    // octagon
    d = polarShape(st * 1.2, 8);
#elif SHAPE == 4
    // square
    d = polarShape(st * 1.5, 4);
#elif SHAPE == 6
    // triangle
    st.y += 0.05;
    d = polarShape(st * 1.5, 3);
#endif

	return d * scale;
}

vec2 wrapEdges(vec2 st, float freq) {
    if (st.x < 0.0) st.x = freq - 1.0;
    if (st.x > freq * aspectRatio) st.x = 0.0;
    if (st.y < 0.0) st.y = freq - 1.0;
    if (st.y > freq) st.y = 0.0;
    return st;
}

// smoothmin from https://iquilezles.org/articles/smin/ - MIT License
float smin(float a, float b, float k) {
    if (k == 0.0) { return min(a, b); }
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*k*(1.0/4.0);
}

float cells(vec2 st, float freq, float cellSize) {
	st *= freq;
	st += prng(vec3(float(seed))).xy;

	vec2 i = floor(st);
	vec2 f = fract(st);

	float d = 1.0;

	for (int y = -2; y <= 2; y++) {
		for (int x = -2; x <= 2; x++) {
			vec2 n = vec2(float(x), float(y));
			vec2 wrap = i + n;
            //wrap = wrapEdges(wrap, freq);
			vec2 point = prng(vec3(wrap, float(seed))).xy;

            vec3 r1 = prng(vec3(float(seed), wrap)) * 0.5 - 0.25;
			vec3 r2 = prng(vec3(wrap, float(seed))) * 2.0 - 1.0;
            float spd = floor(speed);
            point += vec2(sin(time * TAU * spd + r2.x) * r1.x, cos(time * TAU * spd + r2.y) * r1.y);

            vec2 diff = n + point - f;
#if SHAPE == 1
            // diamond \u2014 Manhattan distance, special-cased outside shapeDistance()
            float dist = (abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y)) * cellSize;
#else
            float dist = shapeDistance(vec2(diff.x, -diff.y), vec2(0.0), cellSize);
#endif

            dist += r1.z * (variation * 0.01); // size variation
            d = smin(d, dist, cellSmooth * 0.01);
			//d = min(d, dist);
		}
	}
	return d;
}

vec3 posterize(vec3 color, float lev) {
    if (lev == 0.0) {
        return color;
    } else if (lev == 1.0) {
        lev = 2.0;
    }

    color = clamp(color, 0.0, 0.99); // avoids speckles
    color = color * lev;
    color = floor(color) + 0.5;
    color = color / lev;
    return color;
}

vec3 pixellate(vec2 localUV, float size) {
    if (size <= 1.0) {
        return texture(inputTex, localUV).rgb;
    }

    vec2 texelSize = 1.0 / vec2(textureSize(inputTex, 0));
    float dx = size * texelSize.x;
    float dy = size * texelSize.y;
    vec2 coord = vec2(dx * floor(localUV.x / dx), dy * floor(localUV.y / dy));
    return texture(inputTex, coord).rgb;
}




void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);

    vec2 st = globalCoord / fullResolution;

    loadKernels();
    float blend = 1.0;

    float freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    float cellSize = map(cellScale, 1.0, 100.0, 3.0, 0.75);
    float d = cells(st * vec2(aspectRatio, 1.0), freq, cellSize);
    float ref = map(refractAmt, 0.0, 100.0, 0.0, 0.125);

    float refLen = d + direction / 360.0;
    st.x += cos(refLen * TAU) * ref;
    st.y += sin(refLen * TAU) * ref;

    if (wrap == 0) {
        // mirror
        st = abs(mod(st + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        st = fract(st);
    }

    // Convert warped global UV to tile-local UV
    vec2 localUV = (st * fullResolution - tileOffset) / vec2(textureSize(inputTex, 0));
    color = texture(inputTex, localUV);

#if KERNEL != 0
    if (effectWidth != 0.0) {
#if KERNEL == 100
        color.rgb = pixellate(localUV, effectWidth * 4.0);
#elif KERNEL == 110
        color.rgb = posterize(color.rgb, floor(map(effectWidth, 0.0, 10.0, 0.0, 20.0)));
#else
        color.rgb = convolutionKernel(color.rgb, localUV);
#endif
    }
#endif
    
    fragColor = color;
}
`,wgsl:`/*
 * Cell refract shader (WGSL port).
 * Uses cell-noise distance fields to refract the input feed in a controllable manner.
 */

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

// SHAPE and KERNEL are compile-time consts injected by the runtime via
// injectDefines (see classicNoisedeck/cellRefract/definition.js
// \`globals.{shape,kernel}.define\`). Same fix as the GLSL backend.
//
// Side note: this struct previously had a \`metric: i32\` field used as the
// shape selector, but the JS-side uniform-writer keys by name and the global
// is named \`shape\`, so \`metric\` was always read as 0 (latent pre-existing
// bug \u2014 WGSL backend always rendered circles regardless of dropdown).
// Promoting \`shape\` to a compile-time define routes through injectDefines
// instead, which fixes the latent bug as a side effect.

struct Uniforms {
    time: f32,
    deltaTime: f32,
    frame: i32,
    _pad0: f32,
    resolution: vec2f,
    aspect: f32,
    // Effect params in definition.js globals order:
    // (metric/shape was here \u2014 now compile-time SHAPE)
    scale: f32,
    cellScale: f32,
    cellSmooth: f32,
    variation: f32,
    speed: f32,
    // (kernel was here \u2014 now compile-time KERNEL)
    effectWidth: f32,
    refractAmt: f32,
    direction: f32,
    wrap: i32,
    seed: i32,
}

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn aspectRatio() -> f32 {
    return u.resolution.x / u.resolution.y;
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

fn mapRange(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
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
    let ew = f32(u.effectWidth);
    for (var i = 0; i < 9; i++) {
        let color = textureSample(inputTex, samp, uv + offsets[i] * ew).rgb;
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
    let dist = distance(s1, s2);
    return color * dist;
}

fn sobel(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    let s1 = convolve(uv, sobel_x, false);
    let s2 = convolve(uv, sobel_y, false);
    let dist = distance(s1, s2);
    return color * dist;
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
    let alpha = 0.75;
    color = vec3f(color.x, color.y, mix(color.z, shade, alpha));
    return hsv2rgb(color);
}

fn outline(color: vec3f, uv: vec2f) -> vec3f {
    let sobel_x = array<f32, 9>(1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0);
    let sobel_y = array<f32, 9>(1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0);
    let s1 = convolve(uv, sobel_x, false);
    let s2 = convolve(uv, sobel_y, false);
    let dist = distance(s1, s2);
    return max(color - dist, vec3f(0.0));
}

fn convolutionKernel(color: vec3f, uv: vec2f) -> vec3f {
    let emboss = array<f32, 9>(-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);
    let sharpen = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 5.0, 0.0, -1.0, 0.0, -1.0);
    let blur = array<f32, 9>(1.0, 2.0, 1.0, 2.0, 4.0, 2.0, 1.0, 2.0, 1.0);
    let edge2 = array<f32, 9>(-1.0, 0.0, -1.0, 0.0, 4.0, 0.0, -1.0, 0.0, -1.0);

    if (KERNEL == 1) { return convolve(uv, blur, true); }
    else if (KERNEL == 2) { return derivatives(color, uv, true); }
    else if (KERNEL == 120) { return clamp(derivatives(color, uv, false) * 2.5, vec3f(0.0), vec3f(1.0)); }
    else if (KERNEL == 3) { return color * convolve(uv, edge2, true); }
    else if (KERNEL == 4) { return convolve(uv, emboss, false); }
    else if (KERNEL == 5) { return outline(color, uv); }
    else if (KERNEL == 6) { return shadow(color, uv); }
    else if (KERNEL == 7) { return convolve(uv, sharpen, false); }
    else if (KERNEL == 8) { return sobel(color, uv); }
    else if (KERNEL == 9) { return max(color, convolve(uv, edge2, true)); }
    return color;
}

fn polarShape(st: vec2f, sides: i32) -> f32 {
    let a = atan2(st.x, st.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st);
}

fn shapeFn(st_in: vec2f, offset: vec2f, scale: f32) -> f32 {
    let st = st_in + offset;
    var d = 1.0;
    if (SHAPE == 0) { d = length(st * 1.2); }
    else if (SHAPE == 2) { d = polarShape(st * 1.2, 6); }
    else if (SHAPE == 3) { d = polarShape(st * 1.2, 8); }
    else if (SHAPE == 4) { d = polarShape(st * 1.5, 4); }
    else if (SHAPE == 6) { d = polarShape(vec2f(st.x, st.y + 0.05) * 1.5, 3); }
    return d * scale;
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
    if (k == 0.0) { return min(a, b); }
    let h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

fn cells(st_in: vec2f, freq: f32, cellSize: f32) -> f32 {
    var st = st_in * freq;
    // GLSL uses prng(vec3(float(seed))), i.e. the seed splatted to (seed,seed,seed).
    // (seed,0,0) feeds the PRNG a different vector (pcg mixes all 3 components), so
    // the per-seed cell-grid origin offset lands elsewhere and the cells appear
    // shifted vs glsl/cellRefract.glsl. Splat the seed to match the reference.
    st += prng(vec3f(f32(u.seed))).xy;
    let i = floor(st);
    let f = fract(st);
    var d = 1.0;
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            let n = vec2f(f32(x), f32(y));
            let wrap_coord = i + n;
            var point = prng(vec3f(wrap_coord, f32(u.seed))).xy;
            let r1 = prng(vec3f(f32(u.seed), wrap_coord)) * 0.5 - 0.25;
            let r2 = prng(vec3f(wrap_coord, f32(u.seed))) * 2.0 - 1.0;
            let speed = floor(u.speed);
            point += vec2f(sin(u.time * TAU * speed + r2.x) * r1.x, cos(u.time * TAU * speed + r2.y) * r1.y);
            let diff = n + point - f;
            var dist: f32;
            if (SHAPE == 1) {
                dist = (abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y)) * cellSize;
            } else {
                dist = shapeFn(vec2f(diff.x, -diff.y), vec2f(0.0), cellSize);
            }
            dist += r1.z * (u.variation * 0.01);
            d = smin(d, dist, u.cellSmooth * 0.01);
        }
    }
    return d;
}

fn posterize(color: vec3f, levIn: f32) -> vec3f {
    var lev = levIn;
    if (lev == 0.0) { return color; }
    else if (lev == 1.0) { lev = 2.0; }
    let c = clamp(color, vec3f(0.0), vec3f(0.99));
    return (floor(c * lev) + 0.5) / lev;
}

fn pixellate(uv: vec2f, size: f32) -> vec3f {
    if (size <= 1.0) { return textureSample(inputTex, samp, uv).rgb; }
    let dx = size / u.resolution.x;
    let dy = size / u.resolution.y;
    let coord = vec2f(dx * floor(uv.x / dx), dy * floor(uv.y / dy));
    return textureSample(inputTex, samp, coord).rgb;
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var st = fragCoord.xy / u.resolution;

    let freq = mapRange(u.scale, 1.0, 100.0, 20.0, 1.0);
    let cellSize = mapRange(u.cellScale, 1.0, 100.0, 3.0, 0.75);
    let d = cells(st * vec2f(aspectRatio(), 1.0), freq, cellSize);
    let refAmt = mapRange(u.refractAmt, 0.0, 100.0, 0.0, 0.125);
    let refLen = d + u.direction / 360.0;
    st.x += cos(refLen * TAU) * refAmt;
    st.y += sin(refLen * TAU) * refAmt;

    if (u.wrap == 0) {
        // mirror
        st = abs(((st + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (u.wrap == 1) {
        // repeat
        st = fract(st);
    }

    var color = textureSample(inputTex, samp, st);
    let ew = f32(u.effectWidth);
    if (ew != 0.0 && KERNEL != 0) {
        if (KERNEL == 100) {
            color = vec4f(pixellate(st, ew * 4.0), color.a);
        } else if (KERNEL == 110) {
            color = vec4f(posterize(color.rgb, floor(mapRange(ew, 0.0, 10.0, 0.0, 20.0))), color.a);
        } else {
            color = vec4f(convolutionKernel(color.rgb, st), color.a);
        }
    }

    return color;
}
`}},r=`# cellRefract

Cell-based refraction

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| amount | float | 23 | 0-100 | Refract |
| direction | float | 0 | 0-360 | Refract dir |
| wrap | int | mirror | mirror/repeat | Wrap |
| speed | int | 1 | 0-5 | Speed |
| shape | int | diamond | circle/diamond/hexagon/octagon/square/triangle | Shape |
| scale | float | 50 | 1-100 | Scale |
| cellScale | float | 75 | 1-100 | Cell scale |
| smooth | float | 0 | 0-100 | Cell smooth |
| variation | float | 0 | 0-100 | Cell variation |
| seed | int | 1 | 1-100 | Seed |
| kernel | int | none | none/blur/derivatives/derivDivide/edge/emboss/litEdge/outline/pixels/posterize/shadow/sharpen/sobel | Effect |
| effectWidth | int | 0 | 0-10 | Effect width |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .cellRefract()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[l,e]of Object.entries(o))n.shaders[l]={...e}}n&&r&&(n.help=r);var f="classicNoisedeck/cellRefract",d="classicNoisedeck",v="cellRefract",u=n;export{u as default,f as effectId,v as effectName,r as help,d as namespace};
