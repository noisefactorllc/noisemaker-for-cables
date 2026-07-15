/* filter/lens */
var n=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var t=new n({name:"Lens",namespace:"filter",func:"lens",tags:["distort","lens"],description:"Barrel or pincushion lens distortion",globals:{displacement:{type:"float",default:0,uniform:"lensDisplacement",min:-1,max:1,step:.01,ui:{label:"displacement",control:"slider"}},aspectLens:{type:"boolean",default:!0,uniform:"aspectLens",ui:{label:"1:1 aspect",control:"checkbox"}},antialias:{type:"boolean",default:!0,uniform:"antialias",ui:{label:"antialias",control:"checkbox"}}},defaultProgram:`search filter, synth

testPattern(gridSize: 8)
.lens(displacement: 0.5)
.write(o0)`,passes:[{name:"render",program:"lens",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var s={lens:{glsl:`/*
 * Lens distortion (barrel/pincushion)
 * Warps sample coordinates radially around the frame center
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float lensDisplacement;
uniform bool aspectLens;
uniform bool antialias;

out vec4 fragColor;

const float HALF_FRAME = 0.5;

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 dims = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = (gl_FragCoord.xy + tileOffset) / dims;

    // Zoom for negative displacement (pincushion)
    float zoom = (lensDisplacement < 0.0) ? (lensDisplacement * -0.25) : 0.0;

    // Distance from center, optionally aspect-corrected for circular distortion
    float aspect = dims.x / dims.y;
    vec2 dist = uv - HALF_FRAME;
    vec2 aDist = dist;
    if (aspectLens) { aDist.x *= aspect; }

    float maxDist = length(vec2(aspectLens ? aspect * 0.5 : 0.5, 0.5));
    float distFromCenter = length(aDist);
    float normalizedDist = clamp(distFromCenter / maxDist, 0.0, 1.0);

    // Stronger effect near edges, weaker at center
    float centerWeight = 1.0 - normalizedDist;
    float centerWeightSq = centerWeight * centerWeight;

    // Apply radial distortion in aspect-corrected space
    vec2 displacement = aDist * zoom + aDist * centerWeightSq * lensDisplacement;

    // Convert displacement back to UV space
    if (aspectLens) { displacement.x /= aspect; }

    bool isTileRendering = length(tileOffset) > 0.0;
    
    // For tile rendering, limit displacement to stay within overlap
    if (isTileRendering) {
        float maxDispPixels = 256.0;
        float dispPixels = length(displacement * dims);
        if (dispPixels > maxDispPixels) {
            displacement *= maxDispPixels / dispPixels;
        }
    }

    // Non-tiling keeps the fract() wrap so normal-size output is
    // byte-identical to the pre-tile-aware shader (zero baseline
    // regression). Tiling drops the wrap (displacement is clamped above so
    // the sample stays within the tile overlap).
    vec2 warpedGlobalUV = isTileRendering ? (uv - displacement) : fract(uv - displacement);
    vec2 offset = (warpedGlobalUV * dims - tileOffset) / tileDims;
    
    vec2 sampledUV = offset;

    if (antialias) {
        vec2 dx = dFdx(sampledUV);
        vec2 dy = dFdy(sampledUV);
        vec4 col = vec4(0.0);
        
        col += texture(inputTex, sampledUV + dx * -0.375 + dy * -0.125);
        col += texture(inputTex, sampledUV + dx *  0.125 + dy * -0.375);
        col += texture(inputTex, sampledUV + dx *  0.375 + dy *  0.125);
        col += texture(inputTex, sampledUV + dx * -0.125 + dy *  0.375);
        
        fragColor = col * 0.25;
    } else {
        fragColor = texture(inputTex, sampledUV);
    }
}`,wgsl:`/*
 * Lens distortion (barrel/pincushion)
 * Warps sample coordinates radially around the frame center.
 *
 * Tile-aware, mirroring glsl/lens.glsl. The non-tiling path
 * (tileOffset=(0,0)) is byte-identical to the previous shader, so
 * normal-size output is unchanged (zero baseline regression by
 * construction). When tiling, distortion is computed in GLOBAL frame
 * coordinates and the per-tile displacement is clamped to <=256px so the
 * sample stays within the tile overlap.
 */

struct Uniforms {
    lensDisplacement: f32,
    aspectLens: i32,
    antialias: i32,
    _pad3: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const HALF_FRAME: f32 = 0.5;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let tileOffset = uniforms.tileOffset;
    let dims = select(texSize, uniforms.fullResolution, uniforms.fullResolution.x > 0.0);
    let isTile = length(tileOffset) > 0.0;

    // Global UV when tiling; identical to pos.xy/texSize when not.
    let uv = (pos.xy + tileOffset) / dims;

    // Zoom for negative displacement (pincushion)
    var zoom: f32 = 0.0;
    if (uniforms.lensDisplacement < 0.0) {
        zoom = uniforms.lensDisplacement * -0.25;
    }

    // Distance from center, optionally aspect-corrected for circular distortion
    let aspect = dims.x / dims.y;
    let dist = uv - HALF_FRAME;
    var aDist = dist;
    if (uniforms.aspectLens != 0) { aDist.x = aDist.x * aspect; }

    let halfAspect = select(0.5, aspect * 0.5, uniforms.aspectLens != 0);
    let maxDist = length(vec2<f32>(halfAspect, 0.5));
    let distFromCenter = length(aDist);
    let normalizedDist = clamp(distFromCenter / maxDist, 0.0, 1.0);

    // Stronger effect near edges, weaker at center
    let centerWeight = 1.0 - normalizedDist;
    let centerWeightSq = centerWeight * centerWeight;

    // Apply radial distortion in aspect-corrected space
    var displacement = aDist * zoom + aDist * centerWeightSq * uniforms.lensDisplacement;

    // Convert displacement back to UV space
    if (uniforms.aspectLens != 0) { displacement.x = displacement.x / aspect; }

    if (isTile) {
        // Limit displacement so the sample stays within the tile overlap.
        let maxDispPixels = 256.0;
        let dispPixels = length(displacement * dims);
        if (dispPixels > maxDispPixels) {
            displacement = displacement * (maxDispPixels / dispPixels);
        }
        let warpedGlobalUV = uv - displacement;
        let offset = (warpedGlobalUV * dims - tileOffset) / texSize;
        if (uniforms.antialias != 0) {
            let dx = dpdx(offset);
            let dy = dpdy(offset);
            var col = vec4<f32>(0.0);
            col += textureSample(inputTex, inputSampler, offset + dx * -0.375 + dy * -0.125);
            col += textureSample(inputTex, inputSampler, offset + dx *  0.125 + dy * -0.375);
            col += textureSample(inputTex, inputSampler, offset + dx *  0.375 + dy *  0.125);
            col += textureSample(inputTex, inputSampler, offset + dx * -0.125 + dy *  0.375);
            return col * 0.25;
        }
        return textureSample(inputTex, inputSampler, offset);
    }

    // Non-tiling path: byte-identical to the previous shader.
    let offset = fract(uv - displacement);
    if (uniforms.antialias != 0) {
        let dx = dpdx(offset);
        let dy = dpdy(offset);
        var col = vec4<f32>(0.0);
        col += textureSample(inputTex, inputSampler, offset + dx * -0.375 + dy * -0.125);
        col += textureSample(inputTex, inputSampler, offset + dx *  0.125 + dy * -0.375);
        col += textureSample(inputTex, inputSampler, offset + dx *  0.375 + dy *  0.125);
        col += textureSample(inputTex, inputSampler, offset + dx * -0.125 + dy *  0.375);
        return col * 0.25;
    }
    return textureSample(inputTex, inputSampler, offset);
}
`}},a=`# lens

Barrel or pincushion lens distortion \u2014 warps the image radially around the frame center

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| displacement | float | 0 | -1\u20131 | Distortion amount: positive = barrel, negative = pincushion |
| aspectLens | boolean | true | on/off | Correct for aspect ratio so distortion is circular |
| antialias | boolean | true | on/off | 4x rotated-grid supersampling (disable before palette effects) |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .lens()
  .write(o0)

render(o0)
\`\`\`
`;if(t&&Object.keys(s).length>0){t.shaders||(t.shaders={});for(let[i,e]of Object.entries(s))t.shaders[i]={...e}}t&&a&&(t.help=a);var c="filter/lens",d="filter",f="lens",u=t;export{u as default,c as effectId,f as effectName,a as help,d as namespace};
