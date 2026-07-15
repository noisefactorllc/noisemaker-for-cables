/* classicNoisedeck/cellNoise */
var d=Object.defineProperty;var u=(t,e,a)=>e in t?d(t,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[e]=a;var o=(t,e,a)=>u(t,typeof e!="symbol"?e+"":e,a);var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var s={none:{mode:"none",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},seventiesShirt:{mode:"rgb",amp:[.76,.88,.37],freq:[1,1,1],offset:[.93,.97,.52],phase:[.21,.41,.56]},fiveG:{mode:"rgb",amp:[.56851584,.7740668,.23485267],freq:[1,1,1],offset:[.5,.5,.5],phase:[.727029,.08039695,.10427457]},afterimage:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.3,.2,.2]},barstow:{mode:"rgb",amp:[.45,.2,.1],freq:[1,1,1],offset:[.7,.2,.2],phase:[.5,.4,0]},bloob:{mode:"rgb",amp:[.09,.59,.48],freq:[1,1,1],offset:[.2,.31,.98],phase:[.88,.4,.33]},blueSkies:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.1,.4,.7],phase:[.1,.1,.1]},brushedMetal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.1,.2]},burningSky:{mode:"rgb",amp:[.7259015,.7004237,.9494409],freq:[1,1,1],offset:[.63290054,.37883538,.29405284],phase:[0,.1,.2]},california:{mode:"rgb",amp:[.94,.33,.27],freq:[1,1,1],offset:[.74,.37,.73],phase:[.44,.17,.88]},columbia:{mode:"rgb",amp:[1,.7,1],freq:[1,1,1],offset:[1,.4,.9],phase:[.4,.5,.6]},cottonCandy:{mode:"rgb",amp:[.51,.39,.41],freq:[1,1,1],offset:[.59,.53,.94],phase:[.15,.41,.46]},darkSatin:{mode:"hsv",amp:[0,0,.51],freq:[1,1,1],offset:[0,0,.43],phase:[0,0,.36]},dealerHat:{mode:"rgb",amp:[.83,.45,.19],freq:[1,1,1],offset:[.79,.45,.35],phase:[.28,.91,.61]},dreamy:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[0,.2,.25]},eventHorizon:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.22,.48,.62],phase:[.1,.3,.2]},ghostly:{mode:"hsv",amp:[.02,.92,.76],freq:[1,1,1],offset:[.51,.49,.51],phase:[.71,.23,.66]},grayscale:{mode:"rgb",amp:[.5,.5,.5],freq:[2,2,2],offset:[.5,.5,.5],phase:[1,1,1]},hazySunset:{mode:"rgb",amp:[.79,.56,.22],freq:[1,1,1],offset:[.96,.5,.49],phase:[.15,.98,.87]},heatmap:{mode:"rgb",amp:[.75804377,.62868536,.2227562],freq:[1,1,1],offset:[.35536355,.12935615,.17060602],phase:[0,.25,.5]},hypercolor:{mode:"rgb",amp:[.79,.5,.23],freq:[1,1,1],offset:[.75,.47,.45],phase:[.08,.84,.16]},jester:{mode:"rgb",amp:[.7,.81,.73],freq:[1,1,1],offset:[.1,.22,.27],phase:[.99,.12,.94]},justBlue:{mode:"rgb",amp:[.5,.5,.5],freq:[0,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justCyan:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justGreen:{mode:"rgb",amp:[.5,.5,.5],freq:[0,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justPurple:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,1],offset:[.5,.5,.5],phase:[.5,.5,.5]},justRed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,0,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},justYellow:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,0],offset:[.5,.5,.5],phase:[.5,.5,.5]},mars:{mode:"rgb",amp:[.74,.33,.09],freq:[1,1,1],offset:[.62,.2,.2],phase:[.2,.1,0]},modesto:{mode:"rgb",amp:[.56,.68,.39],freq:[1,1,1],offset:[.72,.07,.62],phase:[.25,.4,.41]},moss:{mode:"rgb",amp:[.78,.39,.07],freq:[1,1,1],offset:[0,.53,.33],phase:[.94,.92,.9]},neptune:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.2,.64,.62],phase:[.15,.2,.3]},netOfGems:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.64,.12,.84],phase:[.1,.25,.15]},organic:{mode:"rgb",amp:[.42,.42,.04],freq:[1,1,1],offset:[.47,.27,.27],phase:[.41,.14,.11]},papaya:{mode:"rgb",amp:[.65,.4,.11],freq:[1,1,1],offset:[.72,.45,.08],phase:[.71,.8,.84]},radioactive:{mode:"rgb",amp:[.62,.79,.11],freq:[1,1,1],offset:[.22,.56,.17],phase:[.15,.1,.25]},royal:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.41,.22,.67],phase:[.2,.25,.2]},santaCruz:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.5,.5,.5],phase:[.25,.5,.75]},sherbet:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[1,1,1],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},sherbetDouble:{mode:"rgb",amp:[.6059281,.17591387,.17166573],freq:[2,2,2],offset:[.5224456,.3864609,.36020845],phase:[0,.25,.5]},silvermane:{mode:"oklab",amp:[.42,0,0],freq:[2,2,2],offset:[.45,.5,.42],phase:[.63,1,1]},skykissed:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.83,.6,.63],phase:[.3,.1,0]},solaris:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.6,.4,.1],phase:[.3,.2,.1]},spooky:{mode:"oklab",amp:[.46,.73,.19],freq:[1,1,1],offset:[.27,.79,.78],phase:[.27,.16,.04]},springtime:{mode:"rgb",amp:[.67,.25,.27],freq:[1,1,1],offset:[.74,.48,.46],phase:[.07,.79,.39]},sproingtime:{mode:"rgb",amp:[.9,.43,.34],freq:[1,1,1],offset:[.56,.69,.32],phase:[.03,.8,.4]},sulphur:{mode:"rgb",amp:[.73,.36,.52],freq:[1,1,1],offset:[.78,.68,.15],phase:[.74,.93,.28]},summoning:{mode:"rgb",amp:[1,0,.8],freq:[1,1,1],offset:[0,0,0],phase:[0,.5,.1]},superhero:{mode:"rgb",amp:[1,.25,.5],freq:[.5,.5,.5],offset:[0,0,.25],phase:[.5,0,0]},toxic:{mode:"rgb",amp:[.5,.5,.5],freq:[1,1,1],offset:[.26,.57,.03],phase:[0,.1,.3]},tropicalia:{mode:"oklab",amp:[.28,.08,.65],freq:[1,1,1],offset:[.48,.6,.03],phase:[.1,.15,.3]},tungsten:{mode:"rgb",amp:[.65,.93,.73],freq:[1,1,1],offset:[.31,.21,.27],phase:[.43,.45,.48]},vaporwave:{mode:"rgb",amp:[.9,.76,.63],freq:[1,1,1],offset:[0,.19,.68],phase:[.43,.23,.32]},vibrant:{mode:"rgb",amp:[.78,.63,.68],freq:[1,1,1],offset:[.41,.03,.16],phase:[.81,.61,.06]},vintage:{mode:"rgb",amp:[.97,.74,.23],freq:[1,1,1],offset:[.97,.38,.35],phase:[.34,.41,.44]},vintagePhoto:{mode:"rgb",amp:[.68,.79,.57],freq:[1,1,1],offset:[.56,.35,.14],phase:[.73,.9,.99]}};var z=Math.PI*2,x=s,l=x;var i={};Object.keys(l).forEach((t,e)=>{i[t]={type:"Number",value:e}});var h={sine:{type:"Number",value:0},tri:{type:"Number",value:1},saw:{type:"Number",value:2},sawInv:{type:"Number",value:3},square:{type:"Number",value:4},noise:{type:"Number",value:5},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},y={noteChange:{type:"Number",value:0},gateNote:{type:"Number",value:1},gateVelocity:{type:"Number",value:2},triggerNote:{type:"Number",value:3},velocity:{type:"Number",value:4}},b={low:{type:"Number",value:0},mid:{type:"Number",value:1},high:{type:"Number",value:2},vol:{type:"Number",value:3}},f={channel:{r:{type:"Number",value:0},g:{type:"Number",value:1},b:{type:"Number",value:2},a:{type:"Number",value:3}},color:{mono:{type:"Number",value:0},rgb:{type:"Number",value:1},hsv:{type:"Number",value:2}},oscType:{sine:{type:"Number",value:0},linear:{type:"Number",value:1},sawtooth:{type:"Number",value:2},sawtoothInv:{type:"Number",value:3},square:{type:"Number",value:4},noise1d:{type:"Number",value:5},noise2d:{type:"Number",value:6}},oscKind:h,midiMode:y,audioBand:b,palette:i};var c={};for(let[t,e]of Object.entries(f.palette))c[t]=e.value;var n=class extends r{constructor(){super(...arguments);o(this,"name","CellNoise");o(this,"namespace","classicNoisedeck");o(this,"func","cellNoise");o(this,"tags",["noise","geometric"]);o(this,"description","Cellular noise patterns");o(this,"uniformLayout",{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},shape:{slot:1,components:"x"},scale:{slot:1,components:"y"},cellScale:{slot:1,components:"z"},cellSmooth:{slot:1,components:"w"},variation:{slot:2,components:"x"},speed:{slot:2,components:"y"},paletteMode:{slot:2,components:"z"},colorMode:{slot:2,components:"w"},paletteOffset:{slot:3,components:"xyz"},cyclePalette:{slot:3,components:"w"},paletteAmp:{slot:4,components:"xyz"},rotatePalette:{slot:4,components:"w"},paletteFreq:{slot:5,components:"xyz"},repeatPalette:{slot:5,components:"w"},palettePhase:{slot:6,components:"xyz"},texInfluence:{slot:7,components:"x"},texIntensity:{slot:7,components:"y"},tileOffset:{slot:8,components:"xy"},fullResolution:{slot:8,components:"zw"}});o(this,"globals",{shape:{type:"int",default:0,uniform:"shape",choices:{circle:0,diamond:1,hexagon:2,octagon:3,square:4,triangle:6},ui:{label:"shape",control:"dropdown"}},scale:{type:"float",default:75,uniform:"scale",min:1,max:100,ui:{label:"noise scale",control:"slider"}},cellScale:{type:"float",default:87,uniform:"cellScale",min:1,max:100,ui:{label:"cell scale",control:"slider"}},smooth:{type:"float",default:11,uniform:"cellSmooth",min:0,max:100,ui:{label:"cell smooth",control:"slider"}},variation:{type:"float",default:50,uniform:"variation",min:0,max:100,ui:{label:"cell variation",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},paletteMode:{type:"int",default:4,uniform:"paletteMode",ui:{control:!1}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},colorMode:{type:"int",default:0,uniform:"colorMode",choices:{mono:0,monoInverse:1,palette:2},ui:{label:"color mode",control:"dropdown"}},palette:{type:"palette",default:32,uniform:"palette",choices:c,ui:{label:"palette",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:2}}},paletteOffset:{type:"vec3",default:[.5,.5,.5],uniform:"paletteOffset",ui:{label:"palette offset",control:"slider",hidden:!0}},cyclePalette:{type:"int",default:1,uniform:"cyclePalette",choices:{off:0,forward:1,backward:-1},ui:{label:"rotation",control:"dropdown",category:"palette",enabledBy:{param:"colorMode",eq:2}}},paletteAmp:{type:"vec3",default:[.5,.5,.5],uniform:"paletteAmp",ui:{label:"palette amplitude",control:"slider",hidden:!0}},rotatePalette:{type:"float",default:0,uniform:"rotatePalette",min:0,max:100,ui:{label:"offset",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:2}}},paletteFreq:{type:"vec3",default:[2,2,2],uniform:"paletteFreq",ui:{label:"palette frequency",control:"slider",hidden:!0}},repeatPalette:{type:"int",default:1,uniform:"repeatPalette",min:1,max:10,randMax:5,ui:{label:"repeat",control:"slider",category:"palette",enabledBy:{param:"colorMode",eq:2}}},palettePhase:{type:"vec3",default:[1,1,1],uniform:"palettePhase",ui:{label:"palette phase",control:"slider",hidden:!0}},tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},texInfluence:{type:"int",default:2,uniform:"texInfluence",choices:{add:10,divide:11,min:12,max:13,mod:14,multiply:15,subtract:16,warp:2},ui:{label:"influence",control:"dropdown",category:"input",enabledBy:{param:"tex",neq:"none"}}},texIntensity:{type:"float",default:0,uniform:"texIntensity",min:0,max:100,ui:{label:"input weight",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}}});o(this,"paramAliases",{cellSmooth:"smooth",cellVariation:"variation",loopAmp:"speed"});o(this,"passes",[{name:"render",program:"cellNoise",inputs:{tex:"tex"},outputs:{fragColor:"outputTex"}}])}};var p={cellNoise:{glsl:`#version 300 es

/*
 * Cell noise shader.
 * Generates Worley-style distance fields for use as displacement or masks.
 * Distance metrics and jitter are normalized so tiling remains seamless across seeds.
 */

precision highp float;
precision highp int;

uniform float time;
uniform int seed;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform int shape;
uniform float scale;
uniform float cellScale;
uniform float cellSmooth;
uniform float variation;
uniform float speed;
uniform int paletteMode;
uniform vec3 paletteOffset;
uniform vec3 paletteAmp;
uniform vec3 paletteFreq;
uniform vec3 palettePhase;
uniform int colorMode;
uniform int cyclePalette;
uniform float rotatePalette;
uniform float repeatPalette;

uniform int texInfluence;
uniform float texIntensity;
uniform sampler2D tex;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define aspectRatio fullResolution.x / fullResolution.y

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
    p.x = p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0;
    p.y = p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0;
    p.z = p.z >= 0.0 ? p.z * 2.0 : -p.z * 2.0 + 1.0;
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

vec3 linearToSrgb(vec3 linear) {
    vec3 srgb;
    for (int i = 0; i < 3; ++i) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// oklab transform and inverse - Public Domain/MIT License
// https://bottosson.github.io/posts/oklab/

const mat3 fwdA = mat3(1.0, 1.0, 1.0,
                       0.3963377774, -0.1055613458, -0.0894841775,
                       0.2158037573, -0.0638541728, -1.2914855480);

const mat3 fwdB = mat3(4.0767245293, -1.2681437731, -0.0041119885,
                       -3.3072168827, 2.6093323231, -0.7034763098,
                       0.2307590544, -0.3411344290,  1.7068625689);

const mat3 invB = mat3(0.4121656120, 0.2118591070, 0.0883097947,
                       0.5362752080, 0.6807189584, 0.2818474174,
                       0.0514575653, 0.1074065790, 0.6302613616);

const mat3 invA = mat3(0.2104542553, 1.9779984951, 0.0259040371,
                       0.7936177850, -2.4285922050, 0.7827717662,
                       -0.0040720468, 0.4505937099, -0.8086757660);

vec3 oklab_from_linear_srgb(vec3 c) {
    vec3 lms = invB * c;

    return invA * (sign(lms)*pow(abs(lms), vec3(0.3333333333333)));
}

vec3 linear_srgb_from_oklab(vec3 c) {
    vec3 lms = fwdA * c;

    return fwdB * (lms * lms * lms);
}
// end oklab

vec3 pal(float t) {
    vec3 a = paletteOffset;
    vec3 b = paletteAmp;
    vec3 c = paletteFreq;
    vec3 d = palettePhase;

    t = t * repeatPalette + rotatePalette * 0.01;

    vec3 color = a + b * cos(6.28318 * (c * t + d));

    // convert to rgb if palette is in hsv or oklab mode
    // 1 = hsv, 2 = oklab, 3 = rgb
    if (paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (paletteMode == 2) {
        color.g = color.g * -.509 + .276;
        color.b = color.b * -.509 + .198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    } 

    return color;
}

float luminance(vec3 color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

vec2 rotate2D(vec2 st, float rot) {
    rot = map(rot, 0.0, 360.0, 0.0, 2.0);
    float angle = rot * PI;
    st -= vec2(0.5 * aspectRatio, 0.5);
    st = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * st;
    st += vec2(0.5 * aspectRatio, 0.5);
    return st;
}

float polarShape(vec2 st, int sides) {
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st);
}

float shapeDistance(vec2 st, vec2 offset, int type, float scale) {
	st += offset;

	float d = 1.0;
	if (type == 0) {
        // circle
		d = length(st * 1.2);
	} else if (type == 2) {
        // hexagon
		d = polarShape(st * 1.2, 6);
	} else if (type == 3) {
        // octagon
		d = polarShape(st * 1.2, 8);
    } else if (type == 4) {
        // square
        d = polarShape(st * 1.5, 4);
	} else if (type == 6) {
        // triangle
        st.y += 0.05;
		d = polarShape(st * 1.5, 3);
    }

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

float cells(vec2 st, float freq, float cellSize, int sides) {
    st -= vec2(0.5 * aspectRatio, 0.5);
	st *= freq;
    st += vec2(0.5 * aspectRatio, 0.5);
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
			float dist = shapeDistance(vec2(diff.x, -diff.y), vec2(0.0), sides, cellSize);
            if (shape == 1) {
                dist = abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y);
                dist *= cellSize;
            }

            dist += r1.z * (variation * 0.01); // size variation
            d = smin(d, dist, cellSmooth * 0.01);
			//d = min(d, dist);
		}
	}
	return d;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);
    vec2 st = globalCoord / fullResolution.y;

    float freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    float cellSize = map(cellScale, 1.0, 100.0, 3.0, 0.75);

    float texLuminosity = 0.0;
    float texFactor = texIntensity * 0.01;
    vec2 texCoord = globalCoord / fullResolution;

    if (texInfluence > 0) {
        vec3 texRGB = texture(tex, gl_FragCoord.xy / vec2(textureSize(tex, 0))).rgb;

        texLuminosity = luminance(texRGB);

        if (texInfluence == 1) {
            cellSize -= texLuminosity * texFactor;
        } else if (texInfluence == 2) {
            freq -= texLuminosity * (texFactor * 5.0);
        }
    }

    float d = cells(st, freq, cellSize, shape);

    if (texInfluence >= 10) {
        if (texInfluence == 10) {
            d += texLuminosity * texFactor;
        } else if (texInfluence == 11) {
            d = mix(d, d / max(0.1, texLuminosity), texFactor);
        } else if (texInfluence == 12) {
            d = mix(d, min(d, texLuminosity), texFactor);
        } else if (texInfluence == 13) {
            d = mix(d, max(d, texLuminosity), texFactor);
        } else if (texInfluence == 14) {
            d = mix(d, mod(d, max(0.1, texLuminosity)), texFactor);
        } else if (texInfluence == 15) {
            d = mix(d, d * texLuminosity, texFactor);
        } else if (texInfluence == 16) {
            d -= texLuminosity * texFactor;
        }
    }

    if (colorMode == 0) {
        color.rgb = vec3(d);
    } else if (colorMode == 1) {
        color.rgb = vec3(1.0 - d);
    } else if (colorMode == 2) {
        if (cyclePalette == -1) {
            d += time;
        } else if (cyclePalette == 1) {
            d -= time;
        }
        color.rgb = pal(d);
    }

    st = globalCoord / fullResolution;

    fragColor = color;
}
`,wgsl:`/*
 * WGSL cell noise shader.
 * Implements Worley distance evaluation with deterministic jitter identical to the GLSL path.
 * Metric selection maps to safe ranges so seeds produce seamless tiles.
 */

struct Uniforms {
    data : array<vec4<f32>, 9>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var tex : texture_2d<f32>;

const PI : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn modulo(a: f32, b: f32) -> f32 {
    return a - b * floor(a / b);
}

fn map(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// PCG PRNG - MIT License
fn pcg(seed: vec3<u32>) -> vec3<u32> {
    var v = seed * 1664525u + 1013904223u;

    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;

    v = v ^ (v >> vec3<u32>(16u));

    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;

    return v;
}

fn prng(p0: vec3<f32>) -> vec3<f32> {
    var p = p0;
    if (p.x >= 0.0) { p.x = p.x * 2.0; } else { p.x = -p.x * 2.0 + 1.0; }
    if (p.y >= 0.0) { p.y = p.y * 2.0; } else { p.y = -p.y * 2.0 + 1.0; }
    if (p.z >= 0.0) { p.z = p.z * 2.0; } else { p.z = -p.z * 2.0 + 1.0; }
    let u = pcg(vec3<u32>(p));
    return vec3<f32>(u) / f32(0xffffffffu);
}

fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = fract(hsv.x);
    let s = hsv.y;
    let v = hsv.z;

    let c = v * s;
    let x = c * (1.0 - abs(modulo(h * 6.0, 2.0) - 1.0));
    let m = v - c;

    var rgb = vec3<f32>(0.0);
    if (0.0 <= h && h < 1.0/6.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (1.0/6.0 <= h && h < 2.0/6.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (2.0/6.0 <= h && h < 3.0/6.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (3.0/6.0 <= h && h < 4.0/6.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (4.0/6.0 <= h && h < 5.0/6.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else if (5.0/6.0 <= h && h < 1.0) {
        rgb = vec3<f32>(c, 0.0, x);
    }

    return rgb + vec3<f32>(m, m, m);
}

fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
    let r = rgb.r;
    let g = rgb.g;
    let b = rgb.b;

    let maxc = max(r, max(g, b));
    let minc = min(r, min(g, b));
    let delta = maxc - minc;

    var h = 0.0;
    if (delta != 0.0) {
        if (maxc == r) {
            h = modulo((g - b) / delta, 6.0) / 6.0;
        } else if (maxc == g) {
            h = ((b - r) / delta + 2.0) / 6.0;
        } else if (maxc == b) {
            h = ((r - g) / delta + 4.0) / 6.0;
        }
    }

    let s = select(delta / maxc, 0.0, maxc == 0.0);
    let v = maxc;

    return vec3<f32>(h, s, v);
}

fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
    var srgb = vec3<f32>(0.0);
    for (var i: i32 = 0; i < 3; i = i + 1) {
        if (linear[i] <= 0.0031308) {
            srgb[i] = linear[i] * 12.92;
        } else {
            srgb[i] = 1.055 * pow(linear[i], 1.0 / 2.4) - 0.055;
        }
    }
    return srgb;
}

// oklab transform and inverse - Public Domain/MIT License
const fwdA = mat3x3<f32>(
    vec3<f32>(1.0, 1.0, 1.0),
    vec3<f32>(0.3963377774, -0.1055613458, -0.0894841775),
    vec3<f32>(0.2158037573, -0.0638541728, -1.2914855480)
);

const fwdB = mat3x3<f32>(
    vec3<f32>(4.0767245293, -1.2681437731, -0.0041119885),
    vec3<f32>(-3.3072168827, 2.6093323231, -0.7034763098),
    vec3<f32>(0.2307590544, -0.3411344290, 1.7068625689)
);

const invB = mat3x3<f32>(
    vec3<f32>(0.4121656120, 0.2118591070, 0.0883097947),
    vec3<f32>(0.5362752080, 0.6807189584, 0.2818474174),
    vec3<f32>(0.0514575653, 0.1074065790, 0.6302613616)
);

const invA = mat3x3<f32>(
    vec3<f32>(0.2104542553, 1.9779984951, 0.0259040371),
    vec3<f32>(0.7936177850, -2.4285922050, 0.7827717662),
    vec3<f32>(-0.0040720468, 0.4505937099, -0.8086757660)
);

fn oklab_from_linear_srgb(c: vec3<f32>) -> vec3<f32> {
    let lms = invB * c;
    return invA * (sign(lms) * pow(abs(lms), vec3<f32>(0.3333333333333)));
}

fn linear_srgb_from_oklab(c: vec3<f32>) -> vec3<f32> {
    let lms = fwdA * c;
    return fwdB * (lms * lms * lms);
}

fn pal(t0: f32, paletteOffset: vec3<f32>, paletteAmp: vec3<f32>, paletteFreq: vec3<f32>, palettePhase: vec3<f32>, paletteMode: i32, rotatePalette: f32, repeatPalette: f32) -> vec3<f32> {
    var t = t0 * repeatPalette + rotatePalette * 0.01;
    var color = paletteOffset + paletteAmp * cos(TAU * (paletteFreq * t + palettePhase));

    if (paletteMode == 1) {
        color = hsv2rgb(color);
    } else if (paletteMode == 2) {
        color.g = color.g * -0.509 + 0.276;
        color.b = color.b * -0.509 + 0.198;
        color = linear_srgb_from_oklab(color);
        color = linearToSrgb(color);
    }
    return color;
}

fn luminance(color: vec3<f32>) -> f32 {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

fn polarShape(st: vec2<f32>, sides: i32) -> f32 {
    let a = atan2(st.x, st.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st);
}

fn shape(st0: vec2<f32>, offset: vec2<f32>, kind: i32, scale: f32) -> f32 {
    var st = st0 + offset;
    var d = 1.0;
    if (kind == 0) {
        d = length(st * 1.2);
    } else if (kind == 2) {
        d = polarShape(st * 1.2, 6);
    } else if (kind == 3) {
        d = polarShape(st * 1.2, 8);
    } else if (kind == 4) {
        d = polarShape(st * 1.5, 4);
    } else if (kind == 6) {
        var st2 = st;
        st2.y = st2.y + 0.05;
        d = polarShape(st2 * 1.5, 3);
    }
    return d * scale;
}

fn wrapEdges(st0: vec2<f32>, freq: f32, aspect: f32) -> vec2<f32> {
    var st = st0;
    if (st.x < 0.0) { st.x = freq - 1.0; }
    if (st.x > freq * aspect) { st.x = 0.0; }
    if (st.y < 0.0) { st.y = freq - 1.0; }
    if (st.y > freq) { st.y = 0.0; }
    return st;
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
    if (k == 0.0) { return min(a, b); }
    let h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

fn cells(st0: vec2<f32>, freq: f32, cellSize: f32, metric: i32, seed: i32, speed: f32, cellVariation: f32, cellSmooth: f32, time: f32, aspect: f32) -> f32 {
    var st = st0;
    st = st - vec2<f32>(0.5 * aspect, 0.5);
    st = st * freq;
    st = st + vec2<f32>(0.5 * aspect, 0.5);
    st = st + prng(vec3<f32>(f32(seed))).xy;

    var i = floor(st);
    var f = fract(st);

    var d = 1.0;
    for (var y: i32 = -2; y <= 2; y = y + 1) {
        for (var x: i32 = -2; x <= 2; x = x + 1) {
            let n = vec2<f32>(f32(x), f32(y));
            var wrap = i + n;
            //wrap = wrapEdges(wrap, freq, aspect);
            var point = prng(vec3<f32>(wrap, f32(seed))).xy;

            let r1 = prng(vec3<f32>(f32(seed), wrap)) * 0.5 - vec3<f32>(0.25);
            let r2 = prng(vec3<f32>(wrap, f32(seed))) * 2.0 - vec3<f32>(1.0);
            let speed = floor(speed);
            point = point + vec2<f32>(
                sin(time * TAU * speed + r2.x) * r1.x,
                cos(time * TAU * speed + r2.y) * r1.y
            );

            let diff = n + point - f;
            var dist = shape(vec2<f32>(diff.x, -diff.y), vec2<f32>(0.0), metric, cellSize);
            if (metric == 1) {
                dist = abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y);
                dist = dist * cellSize;
            }

            dist = dist + r1.z * (cellVariation * 0.01);
            d = smin(d, dist, cellSmooth * 0.01);
        }
    }
    return d;
}

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = uniforms.data[0].xy;
    let time = uniforms.data[0].z;
    let seed = i32(uniforms.data[0].w);

    let metric = i32(uniforms.data[1].x);
    var scale = uniforms.data[1].y;
    var cellScale = uniforms.data[1].z;
    let cellSmooth = uniforms.data[1].w;

    let cellVariation = uniforms.data[2].x;
    let speed = uniforms.data[2].y;
    let paletteMode = i32(uniforms.data[2].z);
    let colorMode = i32(uniforms.data[2].w);

    let paletteOffset = uniforms.data[3].xyz;
    let cyclePalette = i32(uniforms.data[3].w);

    let paletteAmp = uniforms.data[4].xyz;
    let rotatePalette = uniforms.data[4].w;

    let paletteFreq = uniforms.data[5].xyz;
    let repeatPalette = uniforms.data[5].w;

    let palettePhase = uniforms.data[6].xyz;

    let texInfluence = i32(uniforms.data[7].x);
    let texIntensity = uniforms.data[7].y;

    let aspect = resolution.x / resolution.y;

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    let tileOffset = uniforms.data[8].xy;
    let fullResolution = uniforms.data[8].zw;
    var st = (pos.xy + tileOffset) / fullResolution.y;

    var freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    var cellSize = map(cellScale, 1.0, 100.0, 3.0, 0.75);

    var texLuminosity = 0.0;
    let texFactor = texIntensity * 0.01;
    var texCoord = (pos.xy + tileOffset) / fullResolution;

    if (texInfluence > 0) {
        let texRGB = textureSample(tex, samp, texCoord).rgb;

        texLuminosity = luminance(texRGB);

        if (texInfluence == 1) {
            cellSize = cellSize - texLuminosity * texFactor;
        } else if (texInfluence == 2) {
            freq = freq - texLuminosity * (texFactor * 5.0);
        }
    }

    var d = cells(st, freq, cellSize, metric, seed, speed, cellVariation, cellSmooth, time, aspect);

    if (texInfluence >= 10) {
        if (texInfluence == 10) {
            d = d + texLuminosity * texFactor;
        } else if (texInfluence == 11) {
            d = mix(d, d / max(0.1, texLuminosity), texFactor);
        } else if (texInfluence == 12) {
            d = mix(d, min(d, texLuminosity), texFactor);
        } else if (texInfluence == 13) {
            d = mix(d, max(d, texLuminosity), texFactor);
        } else if (texInfluence == 14) {
            d = mix(d, modulo(d, max(0.1, texLuminosity)), texFactor);
        } else if (texInfluence == 15) {
            d = mix(d, d * texLuminosity, texFactor);
        } else if (texInfluence == 16) {
            d = d - texLuminosity * texFactor;
        }
    }

    if (colorMode == 0) {
        color = vec4<f32>(vec3<f32>(d, d, d), color.a);
    } else if (colorMode == 1) {
        color = vec4<f32>(vec3<f32>(1.0 - d), color.a);
    } else if (colorMode == 2) {
        var dd = d;
        if (cyclePalette == -1) {
            dd = dd + time;
        } else if (cyclePalette == 1) {
            dd = dd - time;
        }
        color = vec4<f32>(pal(dd, paletteOffset, paletteAmp, paletteFreq, palettePhase, paletteMode, rotatePalette, repeatPalette), color.a);
    }

    var st2 = pos.xy / resolution;

    return color;
}

`}},m=`# cellNoise

Cellular noise patterns

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/diamond/hexagon/octagon/square/triangle | Shape |
| scale | float | 75 | 1-100 | Noise scale |
| cellScale | float | 87 | 1-100 | Cell scale |
| smooth | float | 11 | 0-100 | Cell smooth |
| variation | float | 50 | 0-100 | Cell variation |
| speed | int | 1 | 0-5 | Speed |
| paletteMode | int | 4 | - | - |
| seed | int | 1 | 1-100 | Seed |
| colorMode | int | mono | mono/monoInverse/palette | Color space |
| palette | palette | netOfGems | none/seventiesShirt/fiveG/afterimage/barstow/bloob/blueSkies/brushedMetal/burningSky/california/columbia/cottonCandy/darkSatin/dealerHat/dreamy/eventHorizon/ghostly/grayscale/hazySunset/heatmap/hypercolor/jester/justBlue/justCyan/justGreen/justPurple/justRed/justYellow/mars/modesto/moss/neptune/netOfGems/organic/papaya/radioactive/royal/santaCruz/sherbet/sherbetDouble/silvermane/skykissed/solaris/spooky/springtime/sproingtime/sulphur/summoning/superhero/toxic/tropicalia/tungsten/vaporwave/vibrant/vintage/vintagePhoto | Palette |
| paletteOffset | vec3 | 0.5,0.5,0.5 | - | Palette offset |
| cyclePalette | int | forward | off/forward/backward | Cycle palette |
| paletteAmp | vec3 | 0.5,0.5,0.5 | - | Palette amplitude |
| rotatePalette | float | 0 | 0-100 | Rotate palette |
| paletteFreq | vec3 | 2,2,2 | - | Palette frequency |
| repeatPalette | int | 1 | 1-10 | Repeat palette |
| palettePhase | vec3 | 1,1,1 | - | Palette phase |
| tex | surface | none | - | Texture |
| texInfluence | int | warp | add/divide/min/max/mod/multiply/subtract/warp | Texture influence |
| texIntensity | float | 0 | 0-100 | Texture weight |

## Usage

\`\`\`
search classicNoisedeck, synth

noise(seed: 1, ridges: true)
  .write(o0)

cellNoise(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(p).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(p))n.shaders[t]={...e}}n&&m&&(n.help=m);var O="classicNoisedeck/cellNoise",_="classicNoisedeck",F="cellNoise",T=n;export{T as default,O as effectId,F as effectName,m as help,_ as namespace};
