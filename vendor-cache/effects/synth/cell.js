/* synth/cell */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Cell",namespace:"synth",func:"cell",tags:["noise","geometric"],description:"Cellular/Voronoi noise with selectable cell shapes",uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},seed:{slot:0,components:"w"},metric:{slot:1,components:"x"},scale:{slot:1,components:"y"},cellScale:{slot:1,components:"z"},cellSmooth:{slot:1,components:"w"},variation:{slot:2,components:"x"},speed:{slot:2,components:"y"},tileOffset:{slot:3,components:"xy"},fullResolution:{slot:3,components:"zw"}},globals:{shape:{type:"int",default:0,uniform:"metric",choices:{circle:0,diamond:1,hexagon:2,octagon:3,square:4,triangle:6},ui:{label:"shape",control:"dropdown"}},scale:{type:"float",default:75,uniform:"scale",min:1,max:100,ui:{label:"noise scale",control:"slider"}},cellScale:{type:"float",default:87,uniform:"cellScale",min:1,max:100,ui:{label:"cell scale",control:"slider"}},cellSmooth:{type:"float",default:0,uniform:"cellSmooth",min:0,max:100,ui:{label:"cell smooth",control:"slider"}},variation:{type:"float",default:50,uniform:"variation",min:0,max:100,ui:{label:"cell variation",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}}},paramAliases:{cellVariation:"variation",loopAmp:"speed"},passes:[{name:"render",program:"cell",uniforms:{cellSmooth:"cellSmooth",speed:"speed"},outputs:{fragColor:"outputTex"}}]});var o={cell:{glsl:`#version 300 es

/*
 * Cell noise shader (simplified - mono only).
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
uniform int metric;
uniform float scale;
uniform float cellScale;
uniform float cellSmooth;
uniform float variation;
uniform float speed;

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

float polarShape(vec2 st, int sides) {
    float a = atan(st.x, st.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(st);
}

float shape(vec2 st, vec2 offset, int type, float scale) {
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

// cellSmoothmin from https://iquilezles.org/articles/smin/ - MIT License
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
			vec2 point = prng(vec3(wrap, float(seed))).xy;

            vec3 r1 = prng(vec3(float(seed), wrap)) * 0.5 - 0.25; 
			vec3 r2 = prng(vec3(wrap, float(seed))) * 2.0 - 1.0;
            float spd = floor(speed);
            point += vec2(sin(time * TAU * spd + r2.x) * r1.x, cos(time * TAU * spd + r2.y) * r1.y);

            vec2 diff = n + point - f;
			float dist = shape(vec2(diff.x, -diff.y), vec2(0.0), sides, cellSize);
            if (metric == 1) {
                dist = abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y);
                dist *= cellSize;
            }

            dist += r1.z * (variation * 0.01); // size variation
            d = smin(d, dist, cellSmooth * 0.01);
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

    float d = cells(st, freq, cellSize, metric);

    // Mono output only
    color.rgb = vec3(d);

    fragColor = color;
}
`,wgsl:`/*
 * WGSL cell noise shader (simplified - mono only).
 * Implements Worley distance evaluation with deterministic jitter identical to the GLSL path.
 * Metric selection maps to safe ranges so seeds produce seamless tiles.
 */

struct Uniforms {
    data : array<vec4<f32>, 4>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

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

fn smin(a: f32, b: f32, k: f32) -> f32 {
    if (k == 0.0) { return min(a, b); }
    let h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

fn cells(st0: vec2<f32>, freq: f32, cellSize: f32, metric: i32, seed: i32, speed: f32, variation: f32, cellSmooth: f32, time: f32, aspect: f32) -> f32 {
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
            var point = prng(vec3<f32>(wrap, f32(seed))).xy;

            let r1 = prng(vec3<f32>(f32(seed), wrap)) * 0.5 - vec3<f32>(0.25);
            let r2 = prng(vec3<f32>(wrap, f32(seed))) * 2.0 - vec3<f32>(1.0);
            let spd = floor(speed);
            point = point + vec2<f32>(
                sin(time * TAU * spd + r2.x) * r1.x,
                cos(time * TAU * spd + r2.y) * r1.y
            );

            let diff = n + point - f;
            var dist = shape(vec2<f32>(diff.x, -diff.y), vec2<f32>(0.0), metric, cellSize);
            if (metric == 1) {
                dist = abs(n.x + point.x - f.x) + abs(n.y + point.y - f.y);
                dist = dist * cellSize;
            }

            dist = dist + r1.z * (variation * 0.01);
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

    let variation = uniforms.data[2].x;
    let speed = uniforms.data[2].y;

    let tileOffset = uniforms.data[3].xy;
    let fullResolution = uniforms.data[3].zw;
    let aspect = fullResolution.x / fullResolution.y;

    var color = vec4<f32>(0.0, 0.0, 1.0, 1.0);
    var st = (pos.xy + tileOffset) / fullResolution.y;

    let freq = map(scale, 1.0, 100.0, 20.0, 1.0);
    let cellSize = map(cellScale, 1.0, 100.0, 3.0, 0.75);

    let d = cells(st, freq, cellSize, metric, seed, speed, variation, cellSmooth, time, aspect);

    // Mono output only
    color = vec4<f32>(vec3<f32>(d, d, d), color.a);

    return color;
}
`}},i=`# cell

Cellular/Voronoi noise with distance metrics

## Description

Generates cellular noise patterns based on Voronoi distance calculations. Supports multiple distance metrics for different cell shapes.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/diamond/hexagon/octagon/square/triangle | Shape |
| scale | float | 75 | 1-100 | Noise scale |
| cellScale | float | 87 | 1-100 | Cell scale |
| cellSmooth | float | 0 | 0-100 | Cell smooth |
| variation | float | 50 | 0-100 | Cell variation |
| speed | int | 1 | 0-5 | Speed |
| seed | int | 1 | 1-100 | Seed |

## Usage

\`\`\`
search synth

cell()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[s,n]of Object.entries(o))e.shaders[s]={...n}}e&&i&&(e.help=i);var c="synth/cell",p="synth",u="cell",d=e;export{d as default,c as effectId,u as effectName,i as help,p as namespace};
