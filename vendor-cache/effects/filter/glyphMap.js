/* filter/glyphMap */
var r=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new r({name:"Glyph Map",namespace:"filter",func:"glyphMap",tags:["color","pixel"],description:"ASCII/glyph art conversion using procedural glyphs",globals:{cellSize:{type:"int",default:16,uniform:"cellSize",min:4,max:32,ui:{label:"cell size",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},colorMode:{type:"int",default:1,uniform:"colorMode",choices:{mono:0,rgb:1},ui:{label:"color mode",control:"dropdown"}}},passes:[{name:"render",program:"glyphMap",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={glyphMap:{glsl:`/*
 * Glyph Map effect
 * Converts image to ASCII/glyph art using hardcoded 5x7 glyph bitmaps
 * ordered by density. Each cell maps input brightness to a glyph.
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform int cellSize;
uniform int seed;
uniform int colorMode;

out vec4 fragColor;

// PCG PRNG
uvec3 pcg(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

// Hash for glyph variant selection per cell
float hash(vec2 p) {
    uvec3 v = pcg(uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        0u
    ));
    return float(v.x) / float(0xffffffffu);
}

// 16 glyphs encoded as 5x7 bitmaps (35 bits packed into int array)
// Ordered from empty (lowest density) to full (highest density)
// Each glyph: 7 rows of 5 bits, row 0 is top. Bit 4 is leftmost.
// Encoding: row[i] = 5-bit value, glyph = row0..row6

// Glyph 0: space (density ~0.00)
//  .....
//  .....
//  .....
//  .....
//  .....
//  .....
//  .....

// Glyph 1: period (density ~0.06)
//  .....
//  .....
//  .....
//  .....
//  .....
//  ..#..
//  .....

// Glyph 2: colon (density ~0.11)
//  .....
//  ..#..
//  .....
//  .....
//  .....
//  ..#..
//  .....

// Glyph 3: dash - (density ~0.14)
//  .....
//  .....
//  .....
//  .###.
//  .....
//  .....
//  .....

// Glyph 4: + (density ~0.20)
//  .....
//  ..#..
//  ..#..
//  .###.
//  ..#..
//  ..#..
//  .....

// Glyph 5: = (density ~0.17)
//  .....
//  .....
//  .###.
//  .....
//  .###.
//  .....
//  .....

// Glyph 6: * (density ~0.26)
//  .....
//  .#.#.
//  ..#..
//  .###.
//  ..#..
//  .#.#.
//  .....

// Glyph 7: o (density ~0.34)
//  .....
//  .....
//  .###.
//  .#.#.
//  .#.#.
//  .###.
//  .....

// Glyph 8: X (density ~0.34)
//  .....
//  .#.#.
//  .#.#.
//  ..#..
//  .#.#.
//  .#.#.
//  .....

// Glyph 9: # (density ~0.46)
//  .....
//  .#.#.
//  #####
//  .#.#.
//  #####
//  .#.#.
//  .....

// Glyph 10: % (density ~0.37)
//  ##..#
//  ##.#.
//  ..#..
//  .#..#
//  .#.##
//  #..##
//  .....

// Glyph 11: A (density ~0.40)
//  ..#..
//  .#.#.
//  #...#
//  #####
//  #...#
//  #...#
//  .....

// Glyph 12: W (density ~0.46)
//  #...#
//  #...#
//  #.#.#
//  #.#.#
//  ##.##
//  .#.#.
//  .....

// Glyph 13: M (density ~0.46)
//  #...#
//  ##.##
//  #.#.#
//  #.#.#
//  #...#
//  #...#
//  .....

// Glyph 14: @ (density ~0.63)
//  .###.
//  #...#
//  #.###
//  #.#.#
//  #.##.
//  #....
//  .###.

// Glyph 15: full block (density 1.00)
//  #####
//  #####
//  #####
//  #####
//  #####
//  #####
//  #####

const int GLYPH_COUNT = 16;

// Return 1.0 if pixel (x, y) is set in glyph g, else 0.0
// x: 0-4 (left to right), y: 0-6 (top to bottom)
float glyphPixel(int g, int x, int y) {
    // Encode each glyph as 7 row values (5 bits each)
    // Bit layout per row: bit4=col0(left), bit0=col4(right)

    int row = 0;

    if (g == 0) {
        // space - all zero
        return 0.0;
    } else if (g == 1) {
        // period
        if (y == 5) row = 4; // ..#..
        else return 0.0;
    } else if (g == 2) {
        // colon
        if (y == 1 || y == 5) row = 4; // ..#..
        else return 0.0;
    } else if (g == 3) {
        // dash
        if (y == 3) row = 14; // .###.
        else return 0.0;
    } else if (g == 4) {
        // plus
        if (y == 1 || y == 2 || y == 4 || y == 5) row = 4; // ..#..
        else if (y == 3) row = 14; // .###.
        else return 0.0;
    } else if (g == 5) {
        // equals
        if (y == 2 || y == 4) row = 14; // .###.
        else return 0.0;
    } else if (g == 6) {
        // asterisk
        if (y == 1 || y == 5) row = 10; // .#.#.
        else if (y == 2 || y == 4) row = 4; // ..#..
        else if (y == 3) row = 14; // .###.
        else return 0.0;
    } else if (g == 7) {
        // o
        if (y == 2 || y == 5) row = 14; // .###.
        else if (y == 3 || y == 4) row = 10; // .#.#.
        else return 0.0;
    } else if (g == 8) {
        // X
        if (y == 1 || y == 2 || y == 4 || y == 5) row = 10; // .#.#.
        else if (y == 3) row = 4; // ..#..
        else return 0.0;
    } else if (g == 9) {
        // hash #
        if (y == 1 || y == 3 || y == 5) row = 10; // .#.#.
        else if (y == 2 || y == 4) row = 31; // #####
        else return 0.0;
    } else if (g == 10) {
        // percent %
        if (y == 0) row = 25; // ##..#
        else if (y == 1) row = 26; // ##.#.
        else if (y == 2) row = 4;  // ..#..
        else if (y == 3) row = 9;  // .#..#
        else if (y == 4) row = 11; // .#.##
        else if (y == 5) row = 19; // #..##
        else return 0.0;
    } else if (g == 11) {
        // A
        if (y == 0) row = 4;  // ..#..
        else if (y == 1) row = 10; // .#.#.
        else if (y == 2) row = 17; // #...#
        else if (y == 3) row = 31; // #####
        else if (y == 4 || y == 5) row = 17; // #...#
        else return 0.0;
    } else if (g == 12) {
        // W
        if (y == 0 || y == 1) row = 17; // #...#
        else if (y == 2 || y == 3) row = 21; // #.#.#
        else if (y == 4) row = 27; // ##.##
        else if (y == 5) row = 10; // .#.#.
        else return 0.0;
    } else if (g == 13) {
        // M
        if (y == 0) row = 17; // #...#
        else if (y == 1) row = 27; // ##.##
        else if (y == 2 || y == 3) row = 21; // #.#.#
        else if (y == 4 || y == 5) row = 17; // #...#
        else return 0.0;
    } else if (g == 14) {
        // @
        if (y == 0 || y == 6) row = 14; // .###.
        else if (y == 1) row = 17; // #...#
        else if (y == 2) row = 23; // #.###
        else if (y == 3) row = 21; // #.#.#
        else if (y == 4) row = 22; // #.##.
        else if (y == 5) row = 16; // #....
        else return 0.0;
    } else {
        // full block
        return 1.0;
    }

    // Extract bit: bit (4 - x) from row
    int bit = (row >> (4 - x)) & 1;
    return float(bit);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 resolution = vec2(texSize);
    vec2 pixelCoord = gl_FragCoord.xy + tileOffset;

    int cs = max(int(float(cellSize) * renderScale), 1);
    // Cell-size cap and the edge clamp below apply only when tiling, so
    // normal-size output is byte-identical to the pre-tile-aware shader
    // (zero baseline regression for all parameters).
    bool isTileRendering = length(tileOffset) > 0.0;
    if (isTileRendering) { cs = min(cs, 512); }
    float csf = float(cs);

    vec2 cellIndex = floor(pixelCoord / csf);

    vec2 localPos = fract(pixelCoord / csf);
    int gx = int(floor(localPos.x * 5.0));
    int gy = int(floor(localPos.y * 7.0));
    gx = clamp(gx, 0, 4);
    gy = clamp(gy, 0, 6);

    vec2 cellCenter = (cellIndex + 0.5) * csf;
    vec2 sampleUV = (cellCenter - tileOffset) / resolution;
    if (isTileRendering) { sampleUV = clamp(sampleUV, 0.0, 1.0); }
    vec4 srcColor = texture(inputTex, sampleUV);

    float luma = dot(srcColor.rgb, vec3(0.299, 0.587, 0.114));

    int glyphIdx = int(floor(luma * float(GLYPH_COUNT)));
    glyphIdx = clamp(glyphIdx, 0, GLYPH_COUNT - 1);

    float cellHash = hash(cellIndex + float(seed) * 0.37);
    int variant = int(floor(cellHash * 3.0));

    if (variant == 1 && glyphIdx > 0 && glyphIdx < GLYPH_COUNT - 1) {
        glyphIdx = glyphIdx;
    } else if (variant == 2 && glyphIdx > 1) {
        glyphIdx = glyphIdx - 1;
    }

    float glyphVal = glyphPixel(glyphIdx, gx, gy);

    if (colorMode > 0) {
        fragColor = vec4(srcColor.rgb * glyphVal, 1.0);
    } else {
        fragColor = vec4(vec3(glyphVal), 1.0);
    }
}
`,wgsl:`/*
 * Glyph Map effect
 * Converts image to ASCII/glyph art using hardcoded 5x7 glyph bitmaps
 * ordered by density. Each cell maps input brightness to a glyph.
 */

struct Uniforms {
    cellSize: i32,
    seed: i32,
    colorMode: i32,
    _pad: i32,
    renderScale: f32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const GLYPH_COUNT: i32 = 16;

// PCG PRNG
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

// Hash for glyph variant selection per cell
fn hash(p: vec2<f32>) -> f32 {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        0u
    ));
    return f32(v.x) / f32(0xffffffffu);
}

// Get one row (5 bits) of a glyph bitmap
// g: glyph index (0-15), y: row (0-6)
// Returns the 5-bit row value
fn glyphRow(g: i32, y: i32) -> i32 {
    // Glyph 0: space
    if (g == 0) { return 0; }
    // Glyph 1: period
    if (g == 1) {
        if (y == 5) { return 4; }
        return 0;
    }
    // Glyph 2: colon
    if (g == 2) {
        if (y == 1 || y == 5) { return 4; }
        return 0;
    }
    // Glyph 3: dash
    if (g == 3) {
        if (y == 3) { return 14; }
        return 0;
    }
    // Glyph 4: plus
    if (g == 4) {
        if (y == 1 || y == 2 || y == 4 || y == 5) { return 4; }
        if (y == 3) { return 14; }
        return 0;
    }
    // Glyph 5: equals
    if (g == 5) {
        if (y == 2 || y == 4) { return 14; }
        return 0;
    }
    // Glyph 6: asterisk
    if (g == 6) {
        if (y == 1 || y == 5) { return 10; }
        if (y == 2 || y == 4) { return 4; }
        if (y == 3) { return 14; }
        return 0;
    }
    // Glyph 7: o
    if (g == 7) {
        if (y == 2 || y == 5) { return 14; }
        if (y == 3 || y == 4) { return 10; }
        return 0;
    }
    // Glyph 8: X
    if (g == 8) {
        if (y == 1 || y == 2 || y == 4 || y == 5) { return 10; }
        if (y == 3) { return 4; }
        return 0;
    }
    // Glyph 9: hash #
    if (g == 9) {
        if (y == 1 || y == 3 || y == 5) { return 10; }
        if (y == 2 || y == 4) { return 31; }
        return 0;
    }
    // Glyph 10: percent %
    if (g == 10) {
        if (y == 0) { return 25; }
        if (y == 1) { return 26; }
        if (y == 2) { return 4; }
        if (y == 3) { return 9; }
        if (y == 4) { return 11; }
        if (y == 5) { return 19; }
        return 0;
    }
    // Glyph 11: A
    if (g == 11) {
        if (y == 0) { return 4; }
        if (y == 1) { return 10; }
        if (y == 2) { return 17; }
        if (y == 3) { return 31; }
        if (y == 4 || y == 5) { return 17; }
        return 0;
    }
    // Glyph 12: W
    if (g == 12) {
        if (y == 0 || y == 1) { return 17; }
        if (y == 2 || y == 3) { return 21; }
        if (y == 4) { return 27; }
        if (y == 5) { return 10; }
        return 0;
    }
    // Glyph 13: M
    if (g == 13) {
        if (y == 0) { return 17; }
        if (y == 1) { return 27; }
        if (y == 2 || y == 3) { return 21; }
        if (y == 4 || y == 5) { return 17; }
        return 0;
    }
    // Glyph 14: @
    if (g == 14) {
        if (y == 0 || y == 6) { return 14; }
        if (y == 1) { return 17; }
        if (y == 2) { return 23; }
        if (y == 3) { return 21; }
        if (y == 4) { return 22; }
        if (y == 5) { return 16; }
        return 0;
    }
    // Glyph 15: full block
    return 31;
}

// Return 1.0 if pixel (x, y) is set in glyph g, else 0.0
fn glyphPixel(g: i32, x: i32, y: i32) -> f32 {
    let row = glyphRow(g, y);
    // WGSL requires the right-hand side of \`>>\` to be a u32 (or vecN<u32>)
    let bit = (row >> u32(4 - x)) & 1;
    return f32(bit);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let tileOffset = uniforms.tileOffset;
    let isTile = length(tileOffset) > 0.0;
    // Non-tiling path is byte-identical to the previous shader. When tiling,
    // mirror glsl/glyphMap.glsl: global pixel grid + renderScale-scaled cell
    // (clamped to 512) so cells align across tiles.
    var pixelCoord = pos.xy;
    var cs = max(uniforms.cellSize, 1);
    if (isTile) {
        pixelCoord = pos.xy + tileOffset;
        cs = clamp(i32(f32(uniforms.cellSize) * uniforms.renderScale), 1, 512);
    }
    let csf = f32(cs);

    // Which cell are we in?
    let cellIndex = floor(pixelCoord / csf);

    // Local position within the cell, mapped to 5x7 glyph grid
    let localPos = fract(pixelCoord / csf);
    var gx = i32(floor(localPos.x * 5.0));
    var gy = i32(floor(localPos.y * 7.0));
    gx = clamp(gx, 0, 4);
    gy = clamp(gy, 0, 6);

    // Sample the center of the cell for brightness
    let cellCenter = (cellIndex + 0.5) * csf;
    var sampleUV = cellCenter / texSize;
    if (isTile) {
        sampleUV = clamp((cellCenter - tileOffset) / texSize, vec2<f32>(0.0), vec2<f32>(1.0));
    }
    let srcColor = textureSample(inputTex, inputSampler, sampleUV);

    // Compute luminance
    let luma = dot(srcColor.rgb, vec3<f32>(0.299, 0.587, 0.114));

    // Map luminance to glyph index (0 to GLYPH_COUNT-1)
    var glyphIdx = i32(floor(luma * f32(GLYPH_COUNT)));
    glyphIdx = clamp(glyphIdx, 0, GLYPH_COUNT - 1);

    // Use seed to rotate/shift glyph selection for variety
    let cellHash = hash(cellIndex + f32(uniforms.seed) * 0.37);
    let variant = i32(floor(cellHash * 3.0));

    if (variant == 2 && glyphIdx > 1) {
        glyphIdx = glyphIdx - 1;
    }

    // Get the glyph pixel value
    let glyphVal = glyphPixel(glyphIdx, gx, gy);

    if (uniforms.colorMode > 0) {
        return vec4<f32>(srcColor.rgb * glyphVal, 1.0);
    } else {
        return vec4<f32>(vec3<f32>(glyphVal), 1.0);
    }
}
`}},l=`# glyphMap

ASCII/glyph art conversion using procedural glyphs

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| cellSize | int | 16 | 4-32 | Glyph cell size in pixels |
| seed | int | 1 | 1-100 | Random seed |
| colorMode | int | 1 (rgb) | mono, rgb | Mono or per-channel RGB |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .glyphMap()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(i).length>0){e.shaders||(e.shaders={});for(let[t,n]of Object.entries(i))e.shaders[t]={...n}}e&&l&&(e.help=l);var a="filter/glyphMap",p="filter",u="glyphMap",c=e;export{c as default,a as effectId,u as effectName,l as help,p as namespace};
