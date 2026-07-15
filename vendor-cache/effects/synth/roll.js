/* synth/roll */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Roll",namespace:"synth",func:"roll",tags:["midi"],description:"MIDI piano roll visualizer",globals:{color:{type:"color",default:[0,1,0],uniform:"lineColor",ui:{label:"color",control:"color"}},gain:{type:"float",default:1,min:.1,max:5,step:.1,uniform:"gain",ui:{label:"gain",control:"slider"}},speed:{type:"float",default:1,min:.5,max:5,step:.1,uniform:"speed",ui:{label:"speed",control:"slider"}}},textures:{_rollFb:{width:"100%",height:"100%",format:"rgba16f"}},passes:[{name:"scroll",program:"roll",inputs:{feedbackTex:"_rollFb",noteGridTex:"midiNoteGrid"},outputs:{fragColor:"outputTex"}},{name:"feedback",program:"copy",inputs:{inputTex:"outputTex"},outputs:{fragColor:"_rollFb"}}]});var a={copy:{glsl:`/*
 * Simple copy/blit shader - copies input to output unchanged.
 * Used for feedback texture updates.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;

out vec4 fragColor;

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);
    fragColor = texture(inputTex, uv);
}
`,wgsl:`/*
 * Simple copy/blit shader - copies input to output unchanged.
 * Used for feedback texture updates.
 */

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = pos.xy / dims;
    return textureSample(inputTex, inputSampler, uv);
}
`},roll:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float time;
uniform float deltaTime;
uniform vec3 lineColor;
uniform float gain;
uniform float speed;
uniform float midiClockCount;

uniform sampler2D feedbackTex;
uniform sampler2D noteGridTex;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    // Scroll: sample feedback shifted right (notes enter at left, scroll right)
    float scrollAmount = speed * deltaTime * 0.5;
    vec2 scrollUv = vec2(uv.x - scrollAmount, uv.y);
    vec4 prev = vec4(0.0);
    if (scrollUv.x >= 0.0) {
        prev = texture(feedbackTex, scrollUv);
        prev *= 0.997;
    }

    // 16 MIDI channels as horizontal swim lanes
    float laneF = uv.y * 16.0;
    int channel = int(floor(laneF));
    float laneLocal = fract(laneF);

    // Each lane maps to MIDI keys 36-84 (C2-C6, 4 octaves)
    int keyLow = 36;
    int keyRange = 48;
    float keyExact = float(keyLow) + laneLocal * float(keyRange);
    int key = int(floor(keyExact));
    float keyFrac = fract(keyExact);

    // Sample note grid for this key and its neighbor
    float maxVel = 0.0;
    float lanePixels = fullResolution.y / 16.0;
    float keysPerPixel = float(keyRange) / lanePixels;
    int spread = max(1, int(ceil(keysPerPixel)));

    for (int dk = -spread; dk <= spread; dk++) {
        int k = clamp(key + dk, 0, 127);
        vec2 gridUv = vec2((float(k) + 0.5) / 128.0, (float(channel) + 0.5) / 16.0);
        vec4 noteData = texture(noteGridTex, gridUv);
        if (noteData.g > 0.5) {
            maxVel = max(maxVel, noteData.r);
        }
    }

    // Write new note data at the left edge
    float edgeWidth = 4.0 / fullResolution.x;
    float noteVal = 0.0;
    if (uv.x < edgeWidth && maxVel > 0.0) {
        noteVal = maxVel * gain;
    }

    // Lane separator lines
    float laneSep = 0.0;
    float laneEdge = fract(uv.y * 16.0);
    if (laneEdge < 0.02 || laneEdge > 0.98) {
        laneSep = 0.2;
    }

    // Combine
    float prevBright = max(prev.r, max(prev.g, prev.b));
    float brightness = max(prevBright, max(noteVal, laneSep));
    vec3 col = lineColor * brightness;

    fragColor = vec4(col, 1.0);
}
`,wgsl:`@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(0) @binding(1) var<uniform> deltaTime: f32;
@group(0) @binding(2) var<uniform> lineColor: vec3<f32>;
@group(0) @binding(3) var<uniform> gain: f32;
@group(0) @binding(4) var<uniform> speed: f32;
@group(0) @binding(5) var feedbackSampler: sampler;
@group(0) @binding(6) var feedbackTex: texture_2d<f32>;
@group(0) @binding(7) var noteGridSampler: sampler;
@group(0) @binding(8) var noteGridTex: texture_2d<f32>;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = pos.xy / resolution;

    // Scroll feedback right (notes enter at left)
    let scrollAmount = speed * deltaTime * 0.5;
    let scrollUv = vec2<f32>(max(uv.x - scrollAmount, 0.0), uv.y);
    var prev = textureSample(feedbackTex, feedbackSampler, scrollUv) * 0.997;
    prev *= step(0.0, uv.x - scrollAmount);

    // 16 MIDI channels as horizontal swim lanes
    let laneF = uv.y * 16.0;
    let channel = i32(floor(laneF));
    let laneLocal = fract(laneF);

    // Each lane maps to MIDI keys 36-84 (C2-C6, 4 octaves)
    let keyLow = 36;
    let keyRange = 48;
    let keyExact = f32(keyLow) + laneLocal * f32(keyRange);
    let key = i32(floor(keyExact));

    // Sample note grid with fixed spread for visibility
    var maxVel = 0.0;
    for (var dk = -2; dk <= 2; dk++) {
        let k = clamp(key + dk, 0, 127);
        let gridUv = vec2<f32>((f32(k) + 0.5) / 128.0, (f32(channel) + 0.5) / 16.0);
        let noteData = textureSample(noteGridTex, noteGridSampler, gridUv);
        if (noteData.g > 0.5) {
            maxVel = max(maxVel, noteData.r);
        }
    }

    // Write new note data at the left edge
    let edgeWidth = 4.0 / resolution.x;
    var noteVal = 0.0;
    if (uv.x < edgeWidth && maxVel > 0.0) {
        noteVal = maxVel * gain;
    }

    // Lane separator lines
    var laneSep = 0.0;
    let laneEdge = fract(uv.y * 16.0);
    if (laneEdge < 0.02 || laneEdge > 0.98) {
        laneSep = 0.2;
    }

    let prevBright = max(prev.r, max(prev.g, prev.b));
    let brightness = max(prevBright, max(noteVal, laneSep));
    let col = lineColor * brightness;

    return vec4<f32>(col, 1.0);
}
`}},r=`# roll

MIDI piano roll visualizer

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| color | color | [0, 1, 0] | - | Note color |
| gain | float | 1 | 0.1\u20135 | Brightness gain |
| speed | float | 1 | 0.5\u20135 | Scroll speed |

## Usage

\`\`\`
search synth

roll()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[o,e]of Object.entries(a))n.shaders[o]={...e}}n&&r&&(n.help=r);var f="synth/roll",p="synth",d="roll",c=n;export{c as default,f as effectId,d as effectName,r as help,p as namespace};
