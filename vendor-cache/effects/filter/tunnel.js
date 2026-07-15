/* filter/tunnel */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Tunnel",namespace:"filter",func:"tunnel",tags:["distort"],description:"Perspective tunnel effect with shape options",globals:{shape:{type:"int",default:0,uniform:"shape",choices:{circle:0,triangle:1,roundedRect:2,square:3,hexagon:4,octagon:5},ui:{label:"shape",control:"dropdown"}},scale:{type:"float",default:0,uniform:"scale",min:-1,max:1,step:.1,ui:{label:"scale",control:"slider"}},speed:{type:"int",default:1,uniform:"speed",min:-5,max:5,zero:0,ui:{label:"speed",control:"slider"}},rotation:{type:"int",default:0,uniform:"rotation",min:-2,max:2,ui:{label:"rot speed",control:"slider"}},center:{type:"float",default:100,uniform:"center",min:-100,max:100,zero:0,ui:{label:"center",control:"slider"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},passes:[{name:"render",program:"tunnel",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={tunnel:{glsl:`/*
 * Perspective tunnel effect
 * Based on Inigo Quilez's tunnel shader
 * MIT License
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform int shape;
uniform float speed;
uniform float rotation;
uniform float scale;
uniform float center;
uniform bool aspectLens;
uniform bool antialias;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float polygonShape(vec2 uv, int sides) {
    float a = atan(uv.x, uv.y) + PI;
    float r = TAU / float(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(uv);
}

vec2 smod(vec2 v, float m) {
    return m * (0.75 - abs(fract(v) - 0.5) - 0.25);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = (gl_FragCoord.xy + tileOffset) / fullRes;

    // Center the coordinates
    vec2 centered = uv - 0.5;

    // Optional aspect ratio correction
    float aspectRatio = fullRes.x / fullRes.y;
    if (aspectLens) { centered.x *= aspectRatio; }
    
    float a = atan(centered.y, centered.x);
    float r;
    
    if (shape == 0) {
        // Circle
        r = length(centered);
    } else if (shape == 1) {
        // Triangle
        r = polygonShape(centered * 2.0, 3);
    } else if (shape == 2) {
        // Rounded square (superellipse)
        vec2 p = centered * centered * centered * centered * centered * centered * centered * centered;
        r = pow(p.x + p.y, 1.0 / 8.0);
    } else if (shape == 3) {
        // Square
        r = polygonShape(centered * 2.0, 4);
    } else if (shape == 4) {
        // Hexagon
        r = polygonShape(centered * 2.0, 6);
    } else {
        // Octagon
        r = polygonShape(centered * 2.0, 8);
    }
    
    // Apply scale
    r -= scale * 0.15;
    
    // Create tunnel coordinates
    vec2 tunnelCoords = smod(vec2(
        0.3 / r + time * speed,
        a / PI + time * rotation
    ), 1.0);
    
    // Sample with optional supersampling
    vec4 color;
    if (antialias) {
        vec2 dx = dFdx(tunnelCoords);
        vec2 dy = dFdy(tunnelCoords);
        color = vec4(0.0);
        color += texture(inputTex, tunnelCoords + dx * -0.375 + dy * -0.125);
        color += texture(inputTex, tunnelCoords + dx *  0.125 + dy * -0.375);
        color += texture(inputTex, tunnelCoords + dx *  0.375 + dy *  0.125);
        color += texture(inputTex, tunnelCoords + dx * -0.125 + dy *  0.375);
        color *= 0.25;
    } else {
        color = texture(inputTex, tunnelCoords);
    }

    // Center vignette: smooth falloff to hide moir\xE9 at vanishing point
    if (center != 0.0) {
        float centerMask = smoothstep(0.0, 0.5, r);
        float amt = center / 100.0;
        if (amt < 0.0) {
            color.rgb *= mix(1.0, centerMask, -amt);
        } else {
            color.rgb = mix(color.rgb, vec3(1.0), (1.0 - centerMask) * amt);
        }
    }

    fragColor = color;
}
`,wgsl:`/*
 * Perspective tunnel effect
 * Based on Inigo Quilez's tunnel shader
 * MIT License
 */

struct Uniforms {
    time: f32,
    shape: i32,
    speed: f32,
    rotation: f32,
    scale: f32,
    center: f32,
    antialias: i32,
    _pad2: f32,
    aspectLens: i32
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

fn polygonShape(uv: vec2<f32>, sides: i32) -> f32 {
    let a = atan2(uv.x, uv.y) + PI;
    let r = TAU / f32(sides);
    return cos(floor(0.5 + a / r) * r - a) * length(uv);
}

fn smod2(v: vec2<f32>, m: f32) -> vec2<f32> {
    return m * (0.75 - abs(fract(v) - 0.5) - 0.25);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    
    // Center the coordinates
    var centered = uv - 0.5;

    // Optional aspect ratio correction
    let aspectRatio = texSize.x / texSize.y;
    if (uniforms.aspectLens != 0) { 
        centered.x = centered.x * aspectRatio; 
    }
    
    let a = atan2(centered.y, centered.x);
    var r: f32;
    
    if (uniforms.shape == 0) {
        // Circle
        r = length(centered);
    } else if (uniforms.shape == 1) {
        // Triangle
        r = polygonShape(centered * 2.0, 3);
    } else if (uniforms.shape == 2) {
        // Rounded square (superellipse)
        let p = centered * centered * centered * centered * centered * centered * centered * centered;
        r = pow(p.x + p.y, 1.0 / 8.0);
    } else if (uniforms.shape == 3) {
        // Square
        r = polygonShape(centered * 2.0, 4);
    } else if (uniforms.shape == 4) {
        // Hexagon
        r = polygonShape(centered * 2.0, 6);
    } else {
        // Octagon
        r = polygonShape(centered * 2.0, 8);
    }
    
    // Apply scale
    r -= uniforms.scale * 0.15;
    
    // Create tunnel coordinates
    let tunnelCoords = smod2(vec2<f32>(
        0.3 / r + uniforms.time * uniforms.speed,
        a / PI + uniforms.time * uniforms.rotation
    ), 1.0);

    var color: vec4<f32>;
    if (uniforms.antialias != 0) {
        let dx = dpdx(tunnelCoords);
        let dy = dpdy(tunnelCoords);
        color = vec4<f32>(0.0);
        color += textureSample(inputTex, inputSampler, tunnelCoords + dx * -0.375 + dy * -0.125);
        color += textureSample(inputTex, inputSampler, tunnelCoords + dx *  0.125 + dy * -0.375);
        color += textureSample(inputTex, inputSampler, tunnelCoords + dx *  0.375 + dy *  0.125);
        color += textureSample(inputTex, inputSampler, tunnelCoords + dx * -0.125 + dy *  0.375);
        color = color * 0.25;
    } else {
        color = textureSample(inputTex, inputSampler, tunnelCoords);
    }

    // Center vignette: smooth falloff to hide moir\xE9 at vanishing point
    if (uniforms.center != 0.0) {
        let centerMask = smoothstep(0.0, 0.5, r);
        let amt = uniforms.center / 100.0;
        if (amt < 0.0) {
            color = vec4<f32>(color.rgb * mix(1.0, centerMask, -amt), color.a);
        } else {
            color = vec4<f32>(mix(color.rgb, vec3<f32>(1.0), (1.0 - centerMask) * amt), color.a);
        }
    }

    return color;
}
`}},s=`# tunnel

Perspective tunnel effect with shape options

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| shape | int | circle | circle/triangle/roundedRect/square/hexagon/octagon | Tunnel shape |
| scale | float | 0 | -1\u20131 | Scale offset |
| speed | int | 1 | -5\u20135 | Forward speed |
| rotation | int | 0 | -2\u20132 | Rotation speed |
| center | float | 100 | -100\u2013100 | Center vignette (negative=darken, positive=brighten) |
| aspectLens | boolean | true | on/off | 1:1 aspect correction |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .tunnel()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(r).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(r))n.shaders[o]={...e}}n&&s&&(n.help=s);var c="filter/tunnel",p="filter",f="tunnel",d=n;export{d as default,c as effectId,f as effectName,s as help,p as namespace};
