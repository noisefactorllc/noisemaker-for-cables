/* filter/spookyTicker */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Spooky Ticker",namespace:"filter",func:"spookyTicker",tags:["text"],description:"Scrolling pseudo-text ticker overlay",globals:{rows:{type:"int",default:2,uniform:"rows",min:1,max:3,step:1,ui:{label:"rows",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},speed:{type:"float",default:1,uniform:"speed",min:0,max:5,step:.1,ui:{label:"speed",control:"slider"}}},defaultProgram:`search filter, synth

perlin()
  .spookyTicker()
  .write(o0)`,passes:[{name:"main",program:"spookyTicker",inputs:{inputTex:"inputTex"},uniforms:{speed:"speed",alpha:"alpha",rows:"rows",seed:"seed"},outputs:{fragColor:"outputTex"}}]});var o={spookyTicker:{glsl:`#version 300 es

precision highp float;
precision highp int;

// Spooky ticker - scrolling bank_ocr digit rows at the bottom of the screen

uniform sampler2D inputTex;
uniform float renderScale;
uniform float time;
uniform float speed;
uniform float alpha;
uniform int rows;
uniform int seed;

in vec2 v_texCoord;
out vec4 fragColor;

// Bank OCR bitmaps: 10 digits, 7 wide x 8 tall each
// Index as GLYPHS[digit * 8 + row], test bit (val >> (6 - col)) & 1
const int GLYPHS[80] = int[80](
    // Digit 0
    0x3C, 0x42, 0x42, 0x42, 0x42, 0x42, 0x3C, 0x00,
    // Digit 1
    0x18, 0x08, 0x08, 0x08, 0x1C, 0x1C, 0x1C, 0x00,
    // Digit 2
    0x1C, 0x04, 0x04, 0x1C, 0x10, 0x10, 0x1C, 0x00,
    // Digit 3
    0x1C, 0x04, 0x04, 0x1C, 0x06, 0x06, 0x1E, 0x00,
    // Digit 4
    0x60, 0x60, 0x60, 0x60, 0x66, 0x7E, 0x06, 0x00,
    // Digit 5
    0x3C, 0x20, 0x20, 0x3C, 0x04, 0x04, 0x3C, 0x00,
    // Digit 6
    0x78, 0x48, 0x40, 0x40, 0x7E, 0x42, 0x7E, 0x00,
    // Digit 7
    0x3C, 0x24, 0x04, 0x0C, 0x08, 0x08, 0x08, 0x00,
    // Digit 8
    0x3C, 0x24, 0x24, 0x7E, 0x66, 0x66, 0x7E, 0x00,
    // Digit 9
    0x3E, 0x22, 0x22, 0x3E, 0x06, 0x06, 0x06, 0x00
);

const int GLYPH_W = 7;
const int GLYPH_H = 8;
const int BASE_SCALE = 3;
const int BASE_ROW_GAP = 4;

uint hash_mix(uint v) {
    v = v ^ (v >> 16u);
    v = v * 0x7feb352du;
    v = v ^ (v >> 15u);
    v = v * 0x846ca68bu;
    v = v ^ (v >> 16u);
    return v;
}

// Sample the bitmap for a given digit at pixel-local coords
float sample_glyph(int digit, int localX, int localY, int iScale) {
    // Scale down to glyph coords
    int gx = localX / iScale;
    int gy = localY / iScale;
    if (gx < 0 || gx >= GLYPH_W || gy < 0 || gy >= GLYPH_H) return 0.0;
    int row = GLYPHS[digit * 8 + gy];
    return float((row >> (6 - gx)) & 1);
}

// Get the ticker mask value at a given pixel position for one row
float ticker_row_mask(int pixelX, int pixelY, int rowSeed, float t, int CELL_W, int iScale) {
    // Scroll offset in pixels
    float scrollSpeed = 0.5 + float(hash_mix(uint(rowSeed) ^ 17u) & 0xFFFFu) / 65535.0 * 1.5;
    int offset = int(floor(t * scrollSpeed * 120.0));

    int sx = pixelX + offset;
    // Handle negative modulo
    int cellX = sx >= 0 ? sx / CELL_W : (sx - CELL_W + 1) / CELL_W;
    int localX = sx - cellX * CELL_W;

    // Which digit for this cell
    uint h = hash_mix(uint(cellX) ^ uint(rowSeed) * 997u);
    int digit = int(h % 10u);

    return sample_glyph(digit, localX, pixelY, iScale);
}

void main() {
    // Scale pixel-space sizes by renderScale for high-res export
    int iScale = max(int(float(BASE_SCALE) * renderScale), 1);
    int CELL_W = GLYPH_W * iScale;
    int CELL_H = GLYPH_H * iScale;
    int ROW_GAP = max(int(float(BASE_ROW_GAP) * renderScale), 1);

    vec2 dims = vec2(textureSize(inputTex, 0));
    vec4 src = texture(inputTex, v_texCoord);

    float t = time * speed;
    uint baseSeed = hash_mix(uint(seed) * 7919u);

    // Total height of ticker region in pixels
    int totalH = rows * (CELL_H + ROW_GAP);

    // Pixel coords from bottom-left
    int px = int(floor(v_texCoord.x * dims.x));
    int pyFromBottom = int(floor((1.0 - v_texCoord.y) * dims.y));

    if (pyFromBottom >= totalH) {
        fragColor = src;
        return;
    }

    // Which row and local Y within it
    int rowStride = CELL_H + ROW_GAP;
    int rowIdx = pyFromBottom / rowStride;
    int localY = pyFromBottom - rowIdx * rowStride;

    if (rowIdx >= rows || localY >= CELL_H) {
        fragColor = src;
        return;
    }

    int rowSeed = int(hash_mix(uint(rowIdx) + baseSeed));

    // Main glyph
    float mask = ticker_row_mask(px, localY, rowSeed, t, CELL_W, iScale);

    // Shadow: sample at offset pixels \u2014 shifted right and down, scaled
    float shadow = 0.0;
    int shadowOff = max(int(2.0 * renderScale), 1);
    int shadowLocalY = localY + shadowOff;
    if (shadowLocalY < CELL_H) {
        shadow = ticker_row_mask(px + shadowOff, shadowLocalY, rowSeed, t, CELL_W, iScale);
    }

    // Composite
    vec3 result = src.rgb;
    // Shadow darkens
    result = result * (1.0 - shadow * 0.4 * alpha);
    // Glyph brightens (screen blend)
    result = max(result, vec3(mask) * alpha);

    fragColor = vec4(clamp(result, 0.0, 1.0), src.a);
}
`,wgsl:`// Spooky ticker - scrolling bank_ocr digit rows at the bottom of the screen

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<uniform> time : f32;
@group(0) @binding(2) var<uniform> speed : f32;
@group(0) @binding(3) var<uniform> alpha : f32;
@group(0) @binding(4) var<uniform> rows : i32;
@group(0) @binding(5) var<uniform> seed : i32;

// Bank OCR bitmaps: 10 digits, 7 wide x 8 tall each
// Index as GLYPHS[digit * 8 + row], test bit (val >> (6 - col)) & 1
const GLYPHS = array<i32, 80>(
    // Digit 0
    0x3C, 0x42, 0x42, 0x42, 0x42, 0x42, 0x3C, 0x00,
    // Digit 1
    0x18, 0x08, 0x08, 0x08, 0x1C, 0x1C, 0x1C, 0x00,
    // Digit 2
    0x1C, 0x04, 0x04, 0x1C, 0x10, 0x10, 0x1C, 0x00,
    // Digit 3
    0x1C, 0x04, 0x04, 0x1C, 0x06, 0x06, 0x1E, 0x00,
    // Digit 4
    0x60, 0x60, 0x60, 0x60, 0x66, 0x7E, 0x06, 0x00,
    // Digit 5
    0x3C, 0x20, 0x20, 0x3C, 0x04, 0x04, 0x3C, 0x00,
    // Digit 6
    0x78, 0x48, 0x40, 0x40, 0x7E, 0x42, 0x7E, 0x00,
    // Digit 7
    0x3C, 0x24, 0x04, 0x0C, 0x08, 0x08, 0x08, 0x00,
    // Digit 8
    0x3C, 0x24, 0x24, 0x7E, 0x66, 0x66, 0x7E, 0x00,
    // Digit 9
    0x3E, 0x22, 0x22, 0x3E, 0x06, 0x06, 0x06, 0x00
);

const GLYPH_W : i32 = 7;
const GLYPH_H : i32 = 8;
const SCALE : i32 = 3;
const CELL_W : i32 = 21;  // GLYPH_W * SCALE
const CELL_H : i32 = 24;  // GLYPH_H * SCALE
const ROW_GAP : i32 = 4;

fn hash_mix(v : u32) -> u32 {
    var r = v;
    r = r ^ (r >> 16u);
    r = r * 0x7feb352du;
    r = r ^ (r >> 15u);
    r = r * 0x846ca68bu;
    r = r ^ (r >> 16u);
    return r;
}

fn sample_glyph(digit : i32, localX : i32, localY : i32) -> f32 {
    let gx = localX / SCALE;
    let gy = localY / SCALE;
    if (gx < 0 || gx >= GLYPH_W || gy < 0 || gy >= GLYPH_H) {
        return 0.0;
    }
    let row = GLYPHS[digit * 8 + gy];
    // WGSL requires the right-hand side of \`>>\` to be a u32 (or vecN<u32>)
    return f32((row >> u32(6 - gx)) & 1);
}

fn ticker_row_mask(pixelX : i32, pixelY : i32, rowSeed : i32, t : f32) -> f32 {
    let scrollSpeed = 0.5 + f32(hash_mix(u32(rowSeed) ^ 17u) & 0xFFFFu) / 65535.0 * 1.5;
    let offset = i32(floor(t * scrollSpeed * 120.0));

    let sx = pixelX + offset;
    var cellX : i32;
    if (sx >= 0) {
        cellX = sx / CELL_W;
    } else {
        cellX = (sx - CELL_W + 1) / CELL_W;
    }
    let localX = sx - cellX * CELL_W;

    // WGSL requires explicit parens when mixing ^ and * (no implicit precedence)
    let h = hash_mix(u32(cellX) ^ (u32(rowSeed) * 997u));
    let digit = i32(h % 10u);

    return sample_glyph(digit, localX, pixelY);
}

@fragment
fn main(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
    let dims = vec2<f32>(textureDimensions(inputTex, 0));
    let uv = position.xy / dims;
    let src = textureLoad(inputTex, vec2<i32>(position.xy), 0);

    let t = time * speed;
    let baseSeed = hash_mix(u32(seed) * 7919u);

    let totalH = rows * (CELL_H + ROW_GAP);

    let px = i32(floor(uv.x * dims.x));
    let pyFromBottom = i32(floor((1.0 - uv.y) * dims.y));

    if (pyFromBottom >= totalH) {
        return src;
    }

    let rowStride = CELL_H + ROW_GAP;
    let rowIdx = pyFromBottom / rowStride;
    let localY = pyFromBottom - rowIdx * rowStride;

    if (rowIdx >= rows || localY >= CELL_H) {
        return src;
    }

    let rowSeed = i32(hash_mix(u32(rowIdx) + baseSeed));

    let mask = ticker_row_mask(px, localY, rowSeed, t);

    var shadow = 0.0;
    let shadowLocalY = localY + 2;
    if (shadowLocalY < CELL_H) {
        shadow = ticker_row_mask(px + 2, shadowLocalY, rowSeed, t);
    }

    var result = src.rgb;
    result = result * (1.0 - shadow * 0.4 * alpha);
    result = max(result, vec3<f32>(mask) * alpha);

    return vec4<f32>(clamp(result, vec3<f32>(0.0), vec3<f32>(1.0)), src.a);
}
`}},r=`# spookyTicker

Scrolling pseudo-text ticker overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 0.75 | 0-1 | Ticker opacity |
| speed | float | 1.0 | 0-5 | Scroll speed |
| rows | int | 2 | 1-3 | Number of ticker rows |
| seed | int | 1 | 1-100 | Random seed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .spookyTicker()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(o).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(o))e.shaders[i]={...n}}e&&r&&(e.help=r);var c="filter/spookyTicker",d="filter",u="spookyTicker",p=e;export{p as default,c as effectId,u as effectName,r as help,d as namespace};
