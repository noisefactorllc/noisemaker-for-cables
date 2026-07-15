/* filter/skew */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Skew",namespace:"filter",func:"skew",tags:["transform"],description:"Skew and rotate transform",globals:{skew:{type:"float",default:.25,uniform:"skewAmt",min:-1,max:1,zero:0,ui:{label:"skew",control:"slider"}},rotate:{type:"float",default:0,uniform:"rotation",min:-180,max:180,ui:{label:"rotate",control:"slider"}},wrap:{type:"int",default:1,uniform:"wrap",choices:{clamp:0,mirror:1,repeat:2},ui:{label:"wrap",control:"dropdown"}}},defaultProgram:`search filter, synth

testPattern()
.skew(wrap: repeat)
.write(o0)`,passes:[{name:"render",program:"skew",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var r={skew:{glsl:`/*
 * Skew and rotate transform
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform float skewAmt;
uniform float rotation;
uniform float wrap;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;

out vec4 fragColor;

const float PI = 3.14159265359;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    
    // Compute global pixel coordinate and global UV
    vec2 globalPixel = gl_FragCoord.xy + tileOffset;
    vec2 globalUV = globalPixel / fullResolution;
    
    // Use full image aspect ratio for consistent transformation across tiles
    float aspect = fullResolution.x / fullResolution.y;

    // Apply transformation in global UV space
    vec2 st = globalUV;
    st -= 0.5;
    st.x *= aspect;

    float angle = rotation * PI / 180.0;
    float c = cos(angle);
    float s = sin(angle);
    st = mat2(c, -s, s, c) * st;

    // Bound skew to prevent displacement beyond overlap region
    float maxSkew = 512.0 / fullResolution.y;
    float effectiveSkewAmt = clamp(skewAmt, -maxSkew, maxSkew);
    st.x += st.y * -effectiveSkewAmt;

    st.x /= aspect;
    st += 0.5;

    // Convert from global UV to tile-local UV for sampling
    vec2 localUV = (st * fullResolution - tileOffset) / resolution;

    // Apply wrap mode in local UV space for seamless tile rendering
    int wrapMode = int(wrap);
    if (wrapMode == 0) {
        // clamp
        localUV = clamp(localUV, 0.0, 1.0);
    } else if (wrapMode == 1) {
        // mirror
        localUV = abs(mod(localUV + 1.0, 2.0) - 1.0);
    } else {
        // repeat
        localUV = fract(localUV);
    }

    fragColor = texture(inputTex, localUV);
}`,wgsl:`/*
 * Skew and rotate transform
 */

struct Uniforms {
    skewAmt: f32,
    rotation: f32,
    wrap: f32,
    _pad0: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    var st = pos.xy / texSize;
    let aspect = texSize.x / texSize.y;

    // Center, aspect-correct, rotate, skew, undo aspect, uncenter
    st = st - 0.5;
    st.x = st.x * aspect;

    let angle = u.rotation * PI / 180.0;
    let c = cos(angle);
    let s = sin(angle);
    st = vec2<f32>(c * st.x - s * st.y, s * st.x + c * st.y);

    st.x = st.x + st.y * -u.skewAmt;

    st.x = st.x / aspect;
    st = st + 0.5;

    // Wrap mode
    let wrapMode = i32(u.wrap);
    if (wrapMode == 0) {
        // clamp
        st = clamp(st, vec2<f32>(0.0), vec2<f32>(1.0));
    } else if (wrapMode == 1) {
        // mirror
        st = abs(((st + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
    } else {
        // repeat
        st = (st % 1.0 + 1.0) % 1.0;
    }

    return textureSample(inputTex, inputSampler, st);
}
`}},o=`# skew

Skew and rotate transform

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| skew | float | 0.25 | -1 to 1 | Horizontal shear |
| rotate | float | 0 | -180 to 180 | Rotation in degrees |
| wrap | int | mirror | clamp/mirror/repeat | Edge wrapping mode |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .skew()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(r).length>0){t.shaders||(t.shaders={});for(let[s,e]of Object.entries(r))t.shaders[s]={...e}}t&&o&&(t.help=o);var f="filter/skew",u="filter",c="skew",m=t;export{m as default,f as effectId,c as effectName,o as help,u as namespace};
