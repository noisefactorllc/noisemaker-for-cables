/* filter/text */
var l=Object.defineProperty;var p=(r,e,a)=>e in r?l(r,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):r[e]=a;var t=(r,e,a)=>p(r,typeof e!="symbol"?e+"":e,a);var o=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=class extends o{constructor(){super(...arguments);t(this,"id","text");t(this,"name","Text");t(this,"namespace","filter");t(this,"func","text");t(this,"description","Overlay text onto the image");t(this,"tags",["text"]);t(this,"externalTexture","textTex");t(this,"globals",{text:{type:"string",default:"Hello World",ui:{label:"text",multiline:!0,category:"general"}},font:{type:"string",default:"Nunito",choices:{nunito:"Nunito",sansSerif:"sans-serif",serif:"serif",monospace:"monospace",cursive:"cursive",fantasy:"fantasy"},ui:{label:"font",control:"dropdown",category:"general"}},size:{type:"float",default:.1,min:.01,max:1,step:.01,ui:{label:"size",control:"slider",category:"transform"}},posX:{type:"float",default:.5,min:0,max:1,step:.01,ui:{label:"pos x",control:"slider",category:"transform"}},posY:{type:"float",default:.5,min:0,max:1,step:.01,ui:{label:"pos y",control:"slider",category:"transform"}},rotation:{type:"float",default:0,min:-180,max:180,step:1,ui:{label:"rotation",control:"slider",category:"transform"}},color:{type:"color",default:"#ffffff",ui:{label:"color",control:"color",category:"general"}},matteColor:{type:"color",default:"#000000",uniform:"matteColor",ui:{label:"matte color",control:"color",category:"background"}},matteOpacity:{type:"float",default:0,min:0,max:1,step:.01,uniform:"matteOpacity",ui:{label:"matte opacity",control:"slider",category:"background"}},justify:{type:"string",default:"center",choices:{left:"left",center:"center",right:"right"},ui:{label:"justify",control:"dropdown",category:"general"}},style:{type:"string",default:"",ui:{label:"style",hidden:!0,category:"general"}}});t(this,"defaultProgram",`search filter, synth

perlin(scale: 100)
  .text()
  .write(o0)`);t(this,"paramAliases",{bgOpacity:"matteOpacity",bgAlpha:"matteOpacity",bgColor:"matteColor"});t(this,"passes",[{name:"overlay",program:"text",inputs:{inputTex:"inputTex",textTex:"textTex"},uniforms:{matteColor:"matteColor",matteOpacity:"matteOpacity"},outputs:{fragColor:"outputTex"}}])}};var i={text:{glsl:`/*
 * Text overlay shader
 * Blends pre-rendered text texture over input with matte background
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform sampler2D textTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform vec3 matteColor;
uniform float matteOpacity;

out vec4 fragColor;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    vec4 inputColor = texture(inputTex, gl_FragCoord.xy / vec2(textureSize(inputTex, 0)));

    // The text canvas is authored to cover the whole output, so sample it in
    // normalized output space (\`st\`) rather than in textTex's own texel space.
    // Dividing by textureSize(textTex) pinned the overlay to a 1:1 texel patch
    // in the corner whenever the canvas size lagged the render size, and made
    // every tile of a large-format export repeat the text.
    //
    // Untiled, \`st\` is gl_FragCoord.xy / resolution, which is what the WGSL
    // variant computes from textureDimensions(inputTex) \u2014 so the two agree.
    // Tiled, this places the text once across the whole image rather than once
    // per tile; the host still rasterizes the canvas at tile size, so its scale
    // is approximate there. WGSL has no tile uniforms and still repeats.
    vec4 text = texture(textTex, st);

    // Text presence from canvas alpha
    float textPresence = text.a;
    float matteAlpha = matteOpacity;

    // Premultiplied blend (matches pointsRender):
    // - Text contribution (not affected by matte)
    // - Input passes through where no text AND no matte
    // - Matte replaces input where matteOpacity > 0
    vec3 rgb = text.rgb * textPresence
             + inputColor.rgb * (1.0 - textPresence) * (1.0 - matteAlpha)
             + matteColor * matteAlpha * (1.0 - textPresence);

    // Alpha: text=opaque, elsewhere blend input alpha toward opaque by matte
    float alpha = max(textPresence, mix(inputColor.a, 1.0, matteAlpha));

    fragColor = vec4(rgb, alpha);
}
`,wgsl:`/*
 * Text overlay shader
 * Blends pre-rendered text texture over input with matte background
 */

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var textTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> matteColor: vec3<f32>;
@group(0) @binding(4) var<uniform> matteOpacity: f32;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let size = max(textureDimensions(inputTex, 0), vec2<u32>(1, 1));
    let uv = position.xy / vec2<f32>(size);

    let inputColor = textureSample(inputTex, texSampler, uv);
    let text = textureSample(textTex, texSampler, uv);

    // Text presence from canvas alpha (1.0 where text exists, 0.0 elsewhere)
    let textPresence = text.a;
    let matteAlpha = matteOpacity;

    // Premultiplied blend (matches pointsRender):
    // - Text contribution (not affected by matte)
    // - Input passes through where no text AND no matte
    // - Matte replaces input where matteOpacity > 0
    let rgb = text.rgb * textPresence
            + inputColor.rgb * (1.0 - textPresence) * (1.0 - matteAlpha)
            + matteColor * matteAlpha * (1.0 - textPresence);

    // Alpha: text=opaque, elsewhere blend input alpha toward opaque by matte
    let alpha = max(textPresence, mix(inputColor.a, 1.0, matteAlpha));

    return vec4<f32>(rgb, alpha);
}
`}},s=`# text

Overlay text onto the image

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| text | string | Hello World | - | - |
| font | string | nunito | nunito/sansSerif/serif/monospace/cursive/fantasy | - |
| size | float | 0.1 | 0.01-1 | - |
| posX | float | 0.5 | 0-1 | - |
| posY | float | 0.5 | 0-1 | - |
| rotation | float | 0 | -180-180 | - |
| color | color | #ffffff | - | - |
| matteColor | color | #000000 | - | - |
| matteOpacity | float | 0 | 0-1 | - |
| justify | string | center | left/center/right | - |

## Notes

Text is rendered on the CPU side and passed to the shader as a texture overlay.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .text()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&s&&(n.help=s);var d="filter/text",y="filter",g="text",b=n;export{b as default,d as effectId,g as effectName,s as help,y as namespace};
