/* filter/rotate */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Rotate",namespace:"filter",func:"rotate",tags:["transform"],description:"Rotate image by specified angle",globals:{rotation:{type:"float",default:45,uniform:"rotation",min:-180,max:180,step:.01,zero:0,ui:{label:"rotation",control:"slider"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},ui:{label:"wrap",control:"dropdown"}},speed:{type:"int",default:0,uniform:"speed",min:-4,max:4,zero:0,randMin:-2,randMax:2,ui:{label:"speed",control:"slider"}}},passes:[{name:"render",program:"rot",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={rot:{glsl:`/*
 * Rotate image 0..1 (0..360 degrees)
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform float rotation;
uniform int wrap;
uniform int speed;
uniform float time;

out vec4 fragColor;

const float TAU = 6.283185307179586;

mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    
    // Animate rotation: full continuous rotation
    float angle = rotation;
    if (speed != 0) {
        angle += time * 360.0 * float(speed);
    }

    // Center, correct aspect, rotate, uncorrect, uncenter
    float aspect = float(texSize.x) / float(texSize.y);
    vec2 center = vec2(0.5);
    uv -= center;
    uv.x *= aspect;
    uv = rotate2D(-angle * TAU / 360.0) * uv;
    uv.x /= aspect;
    uv += center;
    
    // Apply wrap mode
    if (wrap == 0) {
        // mirror
        uv = abs(mod(uv + 1.0, 2.0) - 1.0);
    } else if (wrap == 1) {
        // repeat
        uv = fract(uv);
    } else {
        // clamp
        uv = clamp(uv, 0.0, 1.0);
    }

    fragColor = texture(inputTex, uv);
}
`,wgsl:`/*
 * Rotate image 0..1 (0..360 degrees)
 */

struct Uniforms {
    rotation: f32,
    wrap: i32,
    speed: i32,
    time: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.283185307179586;

fn rotate2D(angle: f32) -> mat2x2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat2x2<f32>(c, -s, s, c);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var uv = pos.xy / texSize;
    
    // Animate rotation: full continuous rotation
    var angle = uniforms.rotation;
    if (uniforms.speed != 0) {
        angle = angle + uniforms.time * 360.0 * f32(uniforms.speed);
    }

    // Center, correct aspect, rotate, uncorrect, uncenter
    let aspect = texSize.x / texSize.y;
    let center = vec2<f32>(0.5);
    uv -= center;
    uv.x = uv.x * aspect;
    uv = rotate2D(-angle * TAU / 360.0) * uv;
    uv.x = uv.x / aspect;
    uv += center;
    
    // Apply wrap mode
    if (uniforms.wrap == 0) {
        // mirror
        uv = abs(((uv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else if (uniforms.wrap == 1) {
        // repeat
        uv = (uv % 1.0 + 1.0) % 1.0;
    } else {
        // clamp
        uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    return textureSample(inputTex, inputSampler, uv);
}
`}},i=`# rotate

Rotate image by specified angle

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| rotation | float | 45 | -180-180 | Rotation |
| wrap | int | repeat | mirror/repeat/clamp | Wrap |
| speed | int | 0 | -4-4 | Animation speed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .rotate()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(a).length>0){t.shaders||(t.shaders={});for(let[r,e]of Object.entries(a))t.shaders[r]={...e}}t&&i&&(t.help=i);var f="filter/rotate",l="filter",c="rotate",m=t;export{m as default,f as effectId,c as effectName,i as help,l as namespace};
