/* filter/text */
var l=Object.defineProperty;var u=(r,t,a)=>t in r?l(r,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):r[t]=a;var e=(r,t,a)=>u(r,typeof t!="symbol"?t+"":t,a);var o=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var n=class extends o{constructor(){super(...arguments);e(this,"id","text");e(this,"name","Text");e(this,"namespace","filter");e(this,"func","text");e(this,"description","Overlay text onto the image");e(this,"tags",["text"]);e(this,"externalTexture","textTex");e(this,"globals",{text:{type:"string",default:"Hello World",ui:{label:"text",multiline:!0,category:"general"}},font:{type:"string",default:"Nunito",choices:{nunito:"Nunito",sansSerif:"sans-serif",serif:"serif",monospace:"monospace",cursive:"cursive",fantasy:"fantasy"},ui:{label:"font",control:"dropdown",category:"general"}},size:{type:"float",default:.1,min:.01,max:1,step:.01,ui:{label:"size",control:"slider",category:"transform"}},posX:{type:"float",default:.5,min:0,max:1,step:.01,ui:{label:"pos x",control:"slider",category:"transform"}},posY:{type:"float",default:.5,min:0,max:1,step:.01,ui:{label:"pos y",control:"slider",category:"transform"}},rotation:{type:"float",default:0,min:-180,max:180,step:1,ui:{label:"rotation",control:"slider",category:"transform"}},color:{type:"color",default:"#ffffff",ui:{label:"color",control:"color",category:"general"}},matteColor:{type:"color",default:"#000000",uniform:"matteColor",ui:{label:"matte color",control:"color",category:"background"}},matteOpacity:{type:"float",default:0,min:0,max:1,step:.01,uniform:"matteOpacity",ui:{label:"matte opacity",control:"slider",category:"background"}},justify:{type:"string",default:"center",choices:{left:"left",center:"center",right:"right"},ui:{label:"justify",control:"dropdown",category:"general"}}});e(this,"defaultProgram",`search filter, synth

perlin(scale: 100)
  .text()
  .write(o0)`);e(this,"paramAliases",{bgOpacity:"matteOpacity",bgAlpha:"matteOpacity",bgColor:"matteColor"});e(this,"passes",[{name:"overlay",program:"text",inputs:{inputTex:"inputTex",textTex:"textTex"},uniforms:{matteColor:"matteColor",matteOpacity:"matteOpacity"},outputs:{fragColor:"outputTex"}}])}};var i={text:{glsl:`/*
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
    vec4 text = texture(textTex, gl_FragCoord.xy / vec2(textureSize(textTex, 0)));

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
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,t]of Object.entries(i))n.shaders[r]={...t}}n&&s&&(n.help=s);var h="filter/text",y="filter",g="text",b=n;export{b as default,h as effectId,g as effectName,s as help,y as namespace};
