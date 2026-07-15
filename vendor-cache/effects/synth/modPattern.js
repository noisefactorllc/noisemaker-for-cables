/* synth/modPattern */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Mod Pattern",namespace:"synth",func:"modPattern",description:"Interference patterns from modulo operations",tags:["geometric","pattern"],openCategories:["general","layer 1"],uniformLayout:{resolution:{slot:0,components:"xy"},time:{slot:0,components:"z"},shape1:{slot:1,components:"x"},scale1:{slot:1,components:"y"},repeat1:{slot:1,components:"z"},shape2:{slot:1,components:"w"},scale2:{slot:2,components:"x"},repeat2:{slot:2,components:"y"},shape3:{slot:2,components:"z"},scale3:{slot:2,components:"w"},repeat3:{slot:3,components:"x"},blend:{slot:3,components:"y"},speed:{slot:3,components:"z"},smoothing:{slot:3,components:"w"},animMode:{slot:4,components:"x"}},globals:{shape1:{type:"int",default:0,min:0,max:2,choices:{plus:0,square:1,diamond:2},uniform:"shape1",ui:{label:"shape1",category:"layer 1"}},scale1:{type:"float",default:18,min:.1,max:20,randMin:10,randMax:18,uniform:"scale1",ui:{label:"scale1",category:"layer 1"}},repeat1:{type:"float",default:5,min:0,max:20,randMin:3,uniform:"repeat1",ui:{label:"repeat1",category:"layer 1"}},shape2:{type:"int",default:1,min:0,max:2,choices:{plus:0,square:1,diamond:2},uniform:"shape2",ui:{label:"shape2",category:"layer 2"}},scale2:{type:"float",default:8,min:.1,max:10,randMin:5,uniform:"scale2",ui:{label:"scale2",category:"layer 2"}},repeat2:{type:"float",default:8,min:0,max:10,randMax:8,uniform:"repeat2",ui:{label:"repeat2",category:"layer 2"}},shape3:{type:"int",default:2,min:0,max:2,choices:{plus:0,square:1,diamond:2},uniform:"shape3",ui:{label:"shape3",category:"layer 3"}},scale3:{type:"float",default:1.5,min:.1,max:20,randMax:6,uniform:"scale3",ui:{label:"scale3",category:"layer 3"}},repeat3:{type:"float",default:1.5,min:0,max:5,randMax:3,uniform:"repeat3",ui:{label:"repeat3",category:"layer 3"}},blend:{type:"int",default:0,min:0,max:3,choices:{add:0,max:1,mix:2,rgb:3},uniform:"blend",ui:{label:"blend mode"}},smoothing:{type:"float",default:0,min:0,max:3,randMax:2,uniform:"smoothing",randChance:0,ui:{label:"smoothing"}},animMode:{type:"int",default:0,uniform:"animMode",choices:{shift:0,pan:1,phase:2},ui:{label:"animation",category:"animation"}},speed:{type:"int",default:1,min:0,max:5,randMax:1,zero:0,uniform:"speed",ui:{label:"speed",category:"animation"}}},passes:[{name:"main",program:"modPattern",inputs:{},outputs:{fragColor:"outputTex"}}]});var o={modPattern:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int shape1;
uniform float scale1;
uniform float repeat1;
uniform int shape2;
uniform float scale2;
uniform float repeat2;
uniform int shape3;
uniform float scale3;
uniform float repeat3;
uniform int blend;
uniform float smoothing;
uniform float speed;
uniform int animMode;

out vec4 fragColor;

#define TAU 6.28318530718

// Generate a geometric shape from the given coordinates 
float shape(int shapeIndex, vec2 p) {
	float v;
	if (shapeIndex < 1) {
		// plus
		v = max(p.x, p.y);
	} else if (shapeIndex < 2) {
		// square
		v = min(p.x, p.y);
	} else {
		// diamond
		v = abs(p.x - p.y);
	}
	return v;
}

float smoothFract(float x) {
	float f = fract(x);
	float edgeWidth = smoothing * 0.01;
	if (f > 1.0 - edgeWidth) {
		return smoothstep(0.0, edgeWidth, 1.0 - f);
	}
	return f;
}

vec2 smoothFract(vec2 v) {
	return vec2(smoothFract(v.x), smoothFract(v.y));
}

vec3 smoothFract(vec3 v) {
	return vec3(smoothFract(v.x), smoothFract(v.y), smoothFract(v.z));
}

void main() {
	vec2 globalCoord = gl_FragCoord.xy + tileOffset;
	vec2 uv = (globalCoord - fullResolution * 0.5) / min(fullResolution.x, fullResolution.y);

	float spd = floor(speed);
	float anim = time * spd;

	// Create repeating cells with hard edges
	// mod(uv * scale, 2.0) creates repeating cells from 0 to 2
	// Subtracting 1.0 centers them from -1 to 1
	// abs() folds them, so you get a pattern that goes 0->1->0->1 with sharp peaks
	float s1 = 20.1 - scale1; // Map scale so larger number = lower frequency
	vec2 p = abs(mod(uv * s1, 2.0) - 1.0);

	// Pan mode: per-layer directional oscillation, scaled to layer frequency
	if (animMode == 1) {
		float osc1 = sin(time * TAU * spd) * 0.03;
		p += vec2(osc1, 0.0);
	}

	// Generate a shape/pattern for the repeated coordinates
	float n1 = shape(shape1, p);

	// Phase mode: offset each layer independently
	float phase1 = (animMode == 2) ? anim : 0.0;
	float phase2 = (animMode == 2) ? anim : 0.0;
	float phase3 = (animMode == 2) ? anim : 0.0;

	// Repeat the same fold operation but at a different frequency, and generate another shape
	float s2 = 10.1 - scale2; // Map scale so larger number = lower frequency
	p = abs(mod(p * s2, 2.0) - 1.0);

	// Pan mode: layer 2 pans up
	if (animMode == 1) {
		float osc2 = sin(time * TAU * spd) * 0.07;
		p += vec2(0.0, osc2);
	}

	float n2 = shape(shape2, p);

	// Multiply each pattern by different amounts (like 3 and 5) and add them together.
	// The fract() wraps values back to 0-1, creating interference patterns
	float val = 0.0;
	if (blend < 1) {
		val = fract(n1 * repeat1 + phase1 + n2 * repeat2 + phase2);
	} else {
		val = smoothFract(n1 * repeat1 + phase1 + n2 * repeat2 + phase2);
	}

	// Repeat again with scale3 frequency, modifying the coordinates and creating another
	// shape/pattern
	float s3 = 6.1 - scale3; // Map scale so larger number = lower frequency
	p = abs(mod(p * s3, 2.0) - 1.0);

	// Pan mode: layer 3 pans left
	if (animMode == 1) {
		float osc3 = sin(time * TAU * spd) * 0.15;
		p += vec2(-osc3, 0.0);
	}

	float n3 = shape(shape3, p);

	// Shift mode: add time offset at the final blend stage
	float shift = (animMode == 0) ? anim : 0.0;

	// Combine layers with selected blend mode
	vec3 color;
	if (blend < 1) {
		// add
		color = smoothFract(vec3(fract(val + n3 * repeat3 + phase3 + shift)));
	} else if (blend < 2) {
		// max
		color = vec3(max(val, smoothFract(n3 * repeat3 + phase3 + shift)));
	} else if (blend < 3) {
		// mix
		color = vec3(mix(val, smoothFract(n3 * repeat3 + phase3 + shift), 0.5));
	} else {
		// rgb
		color = smoothFract(vec3(n1 * repeat1 + phase1, n2 * repeat2 + phase2, n3 * repeat3 + phase3 + shift));
	}

	fragColor = vec4(color, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
// Pack uniforms into a struct to stay within WebGPU's 12 uniform buffer limit
struct Uniforms {
    // Slot 0: resolution.xy, time, aspect
    // Slot 1: shape1, scale1, repeat1, shape2
    // Slot 2: scale2, repeat2, shape3, scale3
    // Slot 3: repeat3, blend, speed, smoothing
    // Slot 4: animMode
    data: array<vec4<f32>, 5>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// GLSL-compatible mod function: mod(x, y) = x - y * floor(x/y)
// WGSL % operator behaves like C's fmod, which gives different results for negative numbers
fn glsl_mod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn glsl_mod2(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
    return x - y * floor(x / y);
}

// Generate a geometric shape from the given coordinates
fn shape(shapeIndex: i32, p: vec2<f32>) -> f32 {
	var v: f32;
	if (shapeIndex < 1) {
		// plus
		v = max(p.x, p.y);
	} else if (shapeIndex < 2) {
		// square
		v = min(p.x, p.y);
	} else {
		// diamond
		v = abs(p.x - p.y);
	}
	return v;
}

fn smoothFract(x: f32) -> f32 {
	let smoothing = i32(uniforms.data[3].w);
	let f = fract(x);
	let edgeWidth = f32(smoothing) * 0.01;
	if (f > 1.0 - edgeWidth) {
		return smoothstep(0.0, edgeWidth, 1.0 - f);
	}
	return f;
}

fn smoothFract2(v: vec2<f32>) -> vec2<f32>  {
	return vec2<f32>(smoothFract(v.x), smoothFract(v.y));
}

fn smoothFract3(v: vec3<f32>) -> vec3<f32> {
	return vec3<f32>(smoothFract(v.x), smoothFract(v.y), smoothFract(v.z));
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
	// Unpack uniforms
	let resolution = uniforms.data[0].xy;
	let time = uniforms.data[0].z;
	
	let shape1 = i32(uniforms.data[1].x);
	let scale1 = uniforms.data[1].y;
	let repeat1 = uniforms.data[1].z;
	let shape2 = i32(uniforms.data[1].w);
	
	let scale2 = uniforms.data[2].x;
	let repeat2 = uniforms.data[2].y;
	let shape3 = i32(uniforms.data[2].z);
	let scale3 = uniforms.data[2].w;
	
	let repeat3 = uniforms.data[3].x;
	let blend = i32(uniforms.data[3].y);
	let speed = i32(uniforms.data[3].z);
	let smoothing = i32(uniforms.data[3].w);
	let animMode = i32(uniforms.data[4].x);

	var res = resolution;
	if (res.x < 1.0) { res = vec2<f32>(1024.0, 1024.0); }

	// Normalized coordinates
	var uv = (position.xy - res * 0.5) / min(res.x, res.y);

	let spd = floor(f32(speed));
	let anim = time * spd;
	let TAU = 6.28318530718;

	// Create repeating cells with hard edges
	// mod(uv * scale, 2.0) creates repeating cells from 0 to 2
	// Subtracting 1.0 centers them from -1 to 1
	// abs() folds them, so you get a pattern that goes 0->1->0->1 with sharp peaks
	let s1 = 20.1 - scale1; // Map scale so larger number = lower frequency
	var p = abs(glsl_mod2(uv * s1, vec2<f32>(2.0)) - vec2<f32>(1.0));
	
	// Pan mode: per-layer directional oscillation, scaled to layer frequency
	if (animMode == 1) {
		let osc1 = sin(time * TAU * spd) * 0.03;
		p += vec2<f32>(osc1, 0.0);
	}

	// Generate a shape/pattern for the repeated coordinates
	let n1 = shape(shape1, p);

	// Phase mode: offset each layer independently
	let phase1 = select(0.0, anim, animMode == 2);
	let phase2 = select(0.0, anim, animMode == 2);
	let phase3 = select(0.0, anim, animMode == 2);

	// Repeat the same fold operation but at a different frequency, and generate another shape
	let s2 = 10.1 - scale2; // Map scale so larger number = lower frequency
	p = abs(glsl_mod2(p * s2, vec2<f32>(2.0)) - vec2<f32>(1.0));

	// Pan mode: layer 2 pans up
	if (animMode == 1) {
		let osc2 = sin(time * TAU * spd) * 0.07;
		p += vec2<f32>(0.0, osc2);
	}

	let n2 = shape(shape2, p);

	// Multiply each pattern by different amounts (like 3 and 5) and add them together.
	// The fract() wraps values back to 0-1, creating interference patterns
	var val = 0.0;
	if (blend < 1) {
		val = fract(n1 * repeat1 + phase1 + n2 * repeat2 + phase2);
	} else {
		val = smoothFract(n1 * repeat1 + phase1 + n2 * repeat2 + phase2);
	}

	// Repeat again with scale3 frequency, modifying the coordinates and creating another
	// shape/pattern
	let s3 = 6.1 - scale3; // Map scale so larger number = lower frequency
	p = abs(glsl_mod2(p * s3, vec2<f32>(2.0)) - vec2<f32>(1.0));

	// Pan mode: layer 3 pans left
	if (animMode == 1) {
		let osc3 = sin(time * TAU * spd) * 0.15;
		p += vec2<f32>(-osc3, 0.0);
	}

	let n3 = shape(shape3, p);

	// Shift mode: add time offset at the final blend stage
	let shift = select(0.0, anim, animMode == 0);

	// Combine layers with selected blend mode
	var color: vec3<f32>;
	if (blend < 1) {
		// add
		color = smoothFract3(vec3<f32>(fract(val + n3 * repeat3 + phase3 + shift)));
	} else if (blend < 2) {
		// max
		color = vec3<f32>(max(val, smoothFract(n3 * repeat3 + phase3 + shift)));
	} else if (blend < 3) {
		// mix
		color = vec3<f32>(mix(val, smoothFract(n3 * repeat3 + phase3 + shift), 0.5));
	} else {
		// rgb
		color = smoothFract3(vec3<f32>(n1 * repeat1 + phase1, n2 * repeat2 + phase2, n3 * repeat3 + phase3 + shift));
	}

	return vec4<f32>(color, 1.0);
}
`}},s=`# modPattern

This effect creates layered geometric patterns using modulo folding operations.
Three layers of shapes (plus, square, diamond) are combined with configurable
scales and blend modes to produce complex moir\xE9 and interference patterns.

## Parameters

### General
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| blend | int | add | add/max/mix/rgb | Blend mode |
| smoothing | float | 0 | 0-3 | Edge smoothing amount |

### Animation
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| animMode | int | shift | shift/pan/phase | Animation mode |
| speed | int | 1 | 0-5 | Animation speed |

### Layer 1
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape1 | int | plus | plus/square/diamond | Shape type |
| scale1 | float | 18.0 | 0.1-20 | Scale/frequency of the first layer |
| repeat1 | float | 5.0 | 0-20 | Repetition multiplier for interference patterns |

### Layer 2
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape2 | int | square | plus/square/diamond | Shape type |
| scale2 | float | 8.0 | 0.1-10 | Scale/frequency of the second layer |
| repeat2 | float | 8.0 | 0-10 | Repetition multiplier for interference patterns |

### Layer 3
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape3 | int | diamond | plus/square/diamond | Shape type |
| scale3 | float | 1.5 | 0.1-20 | Scale/frequency of the third layer |
| repeat3 | float | 1.5 | 0-5 | Repetition multiplier for interference patterns |

## Animation Modes

- **Shift**: Slides the combined pattern through fract space. Continuous forward motion, loops seamlessly at integer speed.
- **Pan**: Each layer oscillates in a different direction (right, up, left) via sine, with amplitude scaled to match visual weight across layers. Loops seamlessly.
- **Phase**: Each layer's value is offset independently over time, creating evolving moir\xE9 interference. Loops seamlessly at integer speed.

## Usage

\`\`\`
modPattern()
  .write(o0)

render(o0)
\`\`\`

### Custom parameters

\`\`\`
modPattern(shape1: 2, scale1: 8.0, shape2: 0, scale2: 5.0, blend: 1)
  .write(o0)

render(o0)
\`\`\`

### With color palette

\`\`\`
modPattern(scale1: 6.0, repeat1: 10.0)
  .palette(preset: "rainbow")
  .write(o0)

render(o0)
\`\`\`

## Usage

\`\`\`
search synth

modPattern()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(o).length>0){t.shaders||(t.shaders={});for(let[a,e]of Object.entries(o))t.shaders[a]={...e}}t&&s&&(t.help=s);var f="synth/modPattern",m="synth",c="modPattern",d=t;export{d as default,f as effectId,c as effectName,s as help,m as namespace};
