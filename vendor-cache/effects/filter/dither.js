/* filter/dither */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Dither",namespace:"filter",func:"dither",tags:["color","pixel"],description:"Ordered dithering with classic patterns and palettes",globals:{type:{type:"int",default:1,uniform:"ditherType",choices:{bayer2x2:0,bayer4x4:1,bayer8x8:2,dot:3,line:4,crosshatch:5,noise:6,errorDiffusion:7},ui:{label:"type",control:"dropdown"}},matrixScale:{type:"int",default:2,uniform:"matrixScale",min:1,max:8,randMax:4,ui:{label:"pattern scale",control:"slider"}},threshold:{type:"float",default:0,uniform:"threshold",min:-.5,max:.5,step:.01,ui:{label:"threshold",control:"slider"}},palette:{type:"int",default:0,uniform:"palette",choices:{input:0,monochrome:1,dotMatrixGreen:2,amberMonitor:3,pico8:4,commodore64:5,cgaPalette1:6,zxSpectrum:7,appleII:8,ega:9},ui:{label:"palette",control:"dropdown"}},levels:{type:"int",default:4,uniform:"levels",min:2,max:16,ui:{label:"levels",control:"slider",enabledBy:{param:"palette",eq:0}}},mix:{type:"float",default:1,uniform:"mixAmount",min:0,max:1,step:.01,randMin:.5,ui:{label:"mix",control:"slider"}}},paramAliases:{ditherType:"type",mixAmount:"mix"},passes:[{name:"render",program:"dither",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var i={dither:{glsl:`/*
 * Ordered dithering effect
 * Applies various dithering patterns and color palettes for retro aesthetics
 */

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int ditherType;
uniform float threshold;
uniform float matrixScale;
uniform float renderScale;
uniform int palette;
uniform int levels;
uniform float time;
uniform float mixAmount;

out vec4 fragColor;

// Dither type constants
const int DITHER_BAYER_2X2 = 0;
const int DITHER_BAYER_4X4 = 1;
const int DITHER_BAYER_8X8 = 2;
const int DITHER_DOT = 3;
const int DITHER_LINE = 4;
const int DITHER_CROSSHATCH = 5;
const int DITHER_NOISE = 6;
const int DITHER_ERROR_DIFFUSION = 7;

// Palette constants
const int PALETTE_INPUT = 0;
const int PALETTE_MONOCHROME = 1;
const int PALETTE_DOT_MATRIX_GREEN = 2;
const int PALETTE_AMBER = 3;
const int PALETTE_PICO8 = 4;
const int PALETTE_C64 = 5;
const int PALETTE_CGA = 6;
const int PALETTE_ZX_SPECTRUM = 7;
const int PALETTE_APPLE_II = 8;
const int PALETTE_EGA = 9;

// Bayer matrices
const mat4 bayer2x2 = mat4(
    0.0/4.0, 2.0/4.0, 0.0/4.0, 2.0/4.0,
    3.0/4.0, 1.0/4.0, 3.0/4.0, 1.0/4.0,
    0.0/4.0, 2.0/4.0, 0.0/4.0, 2.0/4.0,
    3.0/4.0, 1.0/4.0, 3.0/4.0, 1.0/4.0
);

const mat4 bayer4x4 = mat4(
     0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
     3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
);

// 8x8 Bayer matrix - using lookup for correctness
float getBayer8x8(int x, int y) {
    x = x & 7;
    y = y & 7;
    
    // Standard 8x8 ordered dither matrix (normalized will divide by 64)
    // Row 0
    if (y == 0) {
        if (x == 0) return  0.0/64.0;
        if (x == 1) return 32.0/64.0;
        if (x == 2) return  8.0/64.0;
        if (x == 3) return 40.0/64.0;
        if (x == 4) return  2.0/64.0;
        if (x == 5) return 34.0/64.0;
        if (x == 6) return 10.0/64.0;
        return 42.0/64.0;
    }
    // Row 1
    if (y == 1) {
        if (x == 0) return 48.0/64.0;
        if (x == 1) return 16.0/64.0;
        if (x == 2) return 56.0/64.0;
        if (x == 3) return 24.0/64.0;
        if (x == 4) return 50.0/64.0;
        if (x == 5) return 18.0/64.0;
        if (x == 6) return 58.0/64.0;
        return 26.0/64.0;
    }
    // Row 2
    if (y == 2) {
        if (x == 0) return 12.0/64.0;
        if (x == 1) return 44.0/64.0;
        if (x == 2) return  4.0/64.0;
        if (x == 3) return 36.0/64.0;
        if (x == 4) return 14.0/64.0;
        if (x == 5) return 46.0/64.0;
        if (x == 6) return  6.0/64.0;
        return 38.0/64.0;
    }
    // Row 3
    if (y == 3) {
        if (x == 0) return 60.0/64.0;
        if (x == 1) return 28.0/64.0;
        if (x == 2) return 52.0/64.0;
        if (x == 3) return 20.0/64.0;
        if (x == 4) return 62.0/64.0;
        if (x == 5) return 30.0/64.0;
        if (x == 6) return 54.0/64.0;
        return 22.0/64.0;
    }
    // Row 4
    if (y == 4) {
        if (x == 0) return  3.0/64.0;
        if (x == 1) return 35.0/64.0;
        if (x == 2) return 11.0/64.0;
        if (x == 3) return 43.0/64.0;
        if (x == 4) return  1.0/64.0;
        if (x == 5) return 33.0/64.0;
        if (x == 6) return  9.0/64.0;
        return 41.0/64.0;
    }
    // Row 5
    if (y == 5) {
        if (x == 0) return 51.0/64.0;
        if (x == 1) return 19.0/64.0;
        if (x == 2) return 59.0/64.0;
        if (x == 3) return 27.0/64.0;
        if (x == 4) return 49.0/64.0;
        if (x == 5) return 17.0/64.0;
        if (x == 6) return 57.0/64.0;
        return 25.0/64.0;
    }
    // Row 6
    if (y == 6) {
        if (x == 0) return 15.0/64.0;
        if (x == 1) return 47.0/64.0;
        if (x == 2) return  7.0/64.0;
        if (x == 3) return 39.0/64.0;
        if (x == 4) return 13.0/64.0;
        if (x == 5) return 45.0/64.0;
        if (x == 6) return  5.0/64.0;
        return 37.0/64.0;
    }
    // Row 7
    if (x == 0) return 63.0/64.0;
    if (x == 1) return 31.0/64.0;
    if (x == 2) return 55.0/64.0;
    if (x == 3) return 23.0/64.0;
    if (x == 4) return 61.0/64.0;
    if (x == 5) return 29.0/64.0;
    if (x == 6) return 53.0/64.0;
    return 21.0/64.0;
}

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

// Hash function for noise dithering
float hash(vec2 p) {
    uvec3 v = pcg(uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        0u
    ));
    return float(v.x) / float(0xffffffffu);
}

// Dot pattern dithering
float dotPattern(vec2 uv, float scale) {
    vec2 p = uv * scale;
    vec2 c = floor(p) + 0.5;
    float d = length(fract(p) - 0.5);
    return smoothstep(0.5, 0.0, d);
}

// Line pattern dithering
float linePattern(vec2 uv, float scale) {
    float p = uv.y * scale;
    return abs(fract(p) - 0.5) * 2.0;
}

// Crosshatch pattern
float crosshatchPattern(vec2 uv, float scale) {
    vec2 p = uv * scale;
    float line1 = abs(fract(p.x + p.y) - 0.5) * 2.0;
    float line2 = abs(fract(p.x - p.y) - 0.5) * 2.0;
    return min(line1, line2);
}

// Get dither threshold based on type and position
// matrixScale determines how many screen pixels each matrix cell covers
// e.g., scale=1 means 1:1, scale=2 means each cell is 2x2 screen pixels
float getDitherThreshold(vec2 pixelCoord, int type, float scale) {
    // Scale the pixel coordinate - larger scale = bigger pattern cells
    vec2 scaledCoord = floor(pixelCoord / scale);
    int x = int(scaledCoord.x);
    int y = int(scaledCoord.y);
    
    if (type == DITHER_BAYER_2X2) {
        return bayer2x2[y & 1][x & 1];
    } else if (type == DITHER_BAYER_4X4) {
        return bayer4x4[y & 3][x & 3];
    } else if (type == DITHER_BAYER_8X8) {
        return getBayer8x8(x, y);
    } else if (type == DITHER_DOT) {
        // Dot pattern with 8-pixel base, scaled (larger scale = bigger dots)
        return dotPattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (type == DITHER_LINE) {
        // Line pattern with 8-pixel base
        return linePattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (type == DITHER_CROSSHATCH) {
        // Crosshatch pattern with 8-pixel base
        return crosshatchPattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (type == DITHER_NOISE) {
        // Noise pattern: scale determines block size
        return hash(scaledCoord + time * 0.001);
    }
    
    return 0.5;
}

// Quantize color to specified levels with dithering
vec3 quantizeWithDither(vec3 color, float levels, float ditherValue, float thresh) {
    float adjustedDither = (ditherValue - 0.5 + thresh);
    vec3 dithered = color + adjustedDither / levels;
    return floor(dithered * levels) / (levels - 1.0);
}

// Find closest color in palette
vec3 findClosestPaletteColor(vec3 color, int paletteType);

// Palette definitions

// Dot matrix green (Game Boy-like)
const vec3 DOT_MATRIX[4] = vec3[4](
    vec3(0.06, 0.22, 0.06),   // Darkest
    vec3(0.19, 0.38, 0.19),
    vec3(0.55, 0.67, 0.06),
    vec3(0.61, 0.74, 0.06)    // Lightest
);

// Amber monitor
const vec3 AMBER[4] = vec3[4](
    vec3(0.0, 0.0, 0.0),
    vec3(0.4, 0.2, 0.0),
    vec3(0.8, 0.4, 0.0),
    vec3(1.0, 0.6, 0.0)
);

// PICO-8 palette (16 colors)
const vec3 PICO8[16] = vec3[16](
    vec3(0.0, 0.0, 0.0),
    vec3(0.114, 0.169, 0.325),
    vec3(0.494, 0.145, 0.325),
    vec3(0.0, 0.529, 0.318),
    vec3(0.671, 0.322, 0.212),
    vec3(0.373, 0.341, 0.310),
    vec3(0.761, 0.765, 0.780),
    vec3(1.0, 0.945, 0.910),
    vec3(1.0, 0.0, 0.302),
    vec3(1.0, 0.639, 0.0),
    vec3(1.0, 0.925, 0.153),
    vec3(0.0, 0.894, 0.212),
    vec3(0.161, 0.678, 1.0),
    vec3(0.514, 0.463, 0.612),
    vec3(1.0, 0.467, 0.659),
    vec3(1.0, 0.8, 0.667)
);

// Commodore 64 palette (16 colors)
const vec3 C64[16] = vec3[16](
    vec3(0.0, 0.0, 0.0),
    vec3(1.0, 1.0, 1.0),
    vec3(0.533, 0.0, 0.0),
    vec3(0.667, 1.0, 0.933),
    vec3(0.8, 0.267, 0.8),
    vec3(0.0, 0.8, 0.333),
    vec3(0.0, 0.0, 0.667),
    vec3(0.933, 0.933, 0.467),
    vec3(0.867, 0.533, 0.333),
    vec3(0.4, 0.267, 0.0),
    vec3(1.0, 0.467, 0.467),
    vec3(0.2, 0.2, 0.2),
    vec3(0.467, 0.467, 0.467),
    vec3(0.667, 1.0, 0.4),
    vec3(0.0, 0.533, 1.0),
    vec3(0.6, 0.6, 0.6)
);

// CGA Palette 1 (cyan, magenta, white + black)
const vec3 CGA[4] = vec3[4](
    vec3(0.0, 0.0, 0.0),
    vec3(0.0, 1.0, 1.0),
    vec3(1.0, 0.0, 1.0),
    vec3(1.0, 1.0, 1.0)
);

// ZX Spectrum (15 colors - 8 normal + 7 bright, black only once)
const vec3 ZX_SPECTRUM[15] = vec3[15](
    vec3(0.0, 0.0, 0.0),
    vec3(0.0, 0.0, 0.839),
    vec3(0.839, 0.0, 0.0),
    vec3(0.839, 0.0, 0.839),
    vec3(0.0, 0.839, 0.0),
    vec3(0.0, 0.839, 0.839),
    vec3(0.839, 0.839, 0.0),
    vec3(0.839, 0.839, 0.839),
    vec3(0.0, 0.0, 1.0),
    vec3(1.0, 0.0, 0.0),
    vec3(1.0, 0.0, 1.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 1.0, 1.0),
    vec3(1.0, 1.0, 0.0),
    vec3(1.0, 1.0, 1.0)
);

// Apple II (16 colors)
const vec3 APPLE_II[16] = vec3[16](
    vec3(0.0, 0.0, 0.0),
    vec3(0.882, 0.0, 0.494),
    vec3(0.247, 0.0, 0.682),
    vec3(1.0, 0.0, 1.0),
    vec3(0.0, 0.494, 0.263),
    vec3(0.502, 0.502, 0.502),
    vec3(0.0, 0.325, 1.0),
    vec3(0.667, 0.671, 1.0),
    vec3(0.502, 0.302, 0.0),
    vec3(1.0, 0.467, 0.0),
    vec3(0.502, 0.502, 0.502),
    vec3(1.0, 0.616, 0.667),
    vec3(0.0, 0.831, 0.0),
    vec3(1.0, 1.0, 0.0),
    vec3(0.333, 1.0, 0.557),
    vec3(1.0, 1.0, 1.0)
);

// EGA palette (16 colors)
const vec3 EGA[16] = vec3[16](
    vec3(0.0, 0.0, 0.0),
    vec3(0.0, 0.0, 0.667),
    vec3(0.0, 0.667, 0.0),
    vec3(0.0, 0.667, 0.667),
    vec3(0.667, 0.0, 0.0),
    vec3(0.667, 0.0, 0.667),
    vec3(0.667, 0.333, 0.0),
    vec3(0.667, 0.667, 0.667),
    vec3(0.333, 0.333, 0.333),
    vec3(0.333, 0.333, 1.0),
    vec3(0.333, 1.0, 0.333),
    vec3(0.333, 1.0, 1.0),
    vec3(1.0, 0.333, 0.333),
    vec3(1.0, 0.333, 1.0),
    vec3(1.0, 1.0, 0.333),
    vec3(1.0, 1.0, 1.0)
);

// Color distance in RGB space
float colorDistance(vec3 a, vec3 b) {
    vec3 diff = a - b;
    return dot(diff, diff);
}

// Find closest color in a 4-color palette
vec3 findClosest4(vec3 color, vec3 pal[4]) {
    vec3 closest = pal[0];
    float minDist = colorDistance(color, pal[0]);
    
    for (int i = 1; i < 4; i++) {
        float dist = colorDistance(color, pal[i]);
        if (dist < minDist) {
            minDist = dist;
            closest = pal[i];
        }
    }
    return closest;
}

// Find closest color in a 15-color palette
vec3 findClosest15(vec3 color, vec3 pal[15]) {
    vec3 closest = pal[0];
    float minDist = colorDistance(color, pal[0]);
    
    for (int i = 1; i < 15; i++) {
        float dist = colorDistance(color, pal[i]);
        if (dist < minDist) {
            minDist = dist;
            closest = pal[i];
        }
    }
    return closest;
}

// Find closest color in a 16-color palette
vec3 findClosest16(vec3 color, vec3 pal[16]) {
    vec3 closest = pal[0];
    float minDist = colorDistance(color, pal[0]);
    
    for (int i = 1; i < 16; i++) {
        float dist = colorDistance(color, pal[i]);
        if (dist < minDist) {
            minDist = dist;
            closest = pal[i];
        }
    }
    return closest;
}

vec3 findClosestPaletteColor(vec3 color, int paletteType) {
    if (paletteType == PALETTE_MONOCHROME) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        return vec3(luma > 0.5 ? 1.0 : 0.0);
    } else if (paletteType == PALETTE_DOT_MATRIX_GREEN) {
        return findClosest4(color, DOT_MATRIX);
    } else if (paletteType == PALETTE_AMBER) {
        return findClosest4(color, AMBER);
    } else if (paletteType == PALETTE_PICO8) {
        return findClosest16(color, PICO8);
    } else if (paletteType == PALETTE_C64) {
        return findClosest16(color, C64);
    } else if (paletteType == PALETTE_CGA) {
        return findClosest4(color, CGA);
    } else if (paletteType == PALETTE_ZX_SPECTRUM) {
        return findClosest15(color, ZX_SPECTRUM);
    } else if (paletteType == PALETTE_APPLE_II) {
        return findClosest16(color, APPLE_II);
    } else if (paletteType == PALETTE_EGA) {
        return findClosest16(color, EGA);
    }
    return color;
}

// Apply palette-based dithering
vec3 ditherWithPalette(vec3 color, float ditherValue, float thresh, int paletteType) {
    // Add dither offset before finding closest color
    vec3 dithered = color + (ditherValue - 0.5 + thresh) * 0.25;
    dithered = clamp(dithered, 0.0, 1.0);
    return findClosestPaletteColor(dithered, paletteType);
}

// Error diffusion (Floyd-Steinberg). Fragments cannot share sequential state,
// so each fragment re-simulates the raster scan over its containing block of
// FS_BLOCK x FS_BLOCK diffusion cells, extended by a burn-in apron on the
// left and top so the error state entering the block is driven by the
// neighboring image content; without it the severed error flow at block
// edges reads as a square grid. Three details keep the block structure
// statistically invisible: the apron length is jittered per block (flat
// regions otherwise phase-lock to the shared scan origin), apron rows are
// seeded with hash noise of typical steady-state magnitude (an all-zero
// start is atypical and phase-aligned), and rows extend FS_RPAD cells past
// the block's right edge (the right column otherwise never receives its
// down-left error taps). A cell covers matrixScale screen pixels, like the
// ordered pattern cells.
const int FS_BLOCK = 4;
const int FS_APRON_MIN = 4;
const int FS_APRON_MAX = 11;
const int FS_RPAD = 2;
// error row width: block + max apron + right pad + one left pad cell
const int FS_ERR_W = FS_BLOCK + FS_APRON_MAX + FS_RPAD + 1;

// Quantize for error diffusion: nearest palette color, or nearest of
// \`levels\` evenly spaced per-channel levels when palette == input.
vec3 fsQuantize(vec3 v) {
    if (palette == PALETTE_INPUT) {
        float maxLevel = float(levels) - 1.0;
        // floor(x + 0.5) instead of round(): GLSL leaves round-half direction
        // implementation-defined while WGSL rounds half to even, and the
        // chaotic error feedback amplifies any halfway-tie mismatch.
        return floor(v * maxLevel + 0.5) / maxLevel;
    }
    return findClosestPaletteColor(v, palette);
}

// Working-value scale shared by the threshold bias and the block seeds,
// matching the ordered paths' scaling at their neutral dither value.
float fsScale() {
    if (palette == PALETTE_INPUT) {
        return 1.0 / float(levels);
    }
    return 0.25;
}

// Per-block, per-lane noise in [-0.5, 0.5) for seeding error state.
// Lanes 0..FS_ERR_W-1 seed the incoming error row; higher lanes seed each
// scan row's right-flowing error.
vec3 fsSeedNoise(ivec2 blockOrigin, int lane) {
    uvec3 v = pcg(uvec3(uint(blockOrigin.x + 1), uint(blockOrigin.y + 1), uint(lane + 1)));
    return vec3(v) / float(0xffffffffu) - 0.5;
}

// Source color for a diffusion cell: its center pixel, clamped to the tile.
vec3 fsFetchCell(ivec2 cell, float cellSize, ivec2 texSize) {
    vec2 pGlobal = (vec2(cell) + 0.5) * cellSize;
    ivec2 pLocal = ivec2(floor(pGlobal)) - ivec2(tileOffset);
    pLocal = clamp(pLocal, ivec2(0), texSize - 1);
    return texelFetch(inputTex, pLocal, 0).rgb;
}

vec3 errorDiffusion(vec2 globalCoord, float cellSize, ivec2 texSize) {
    ivec2 cell = ivec2(floor(globalCoord / cellSize));
    ivec2 blockOrigin = (cell / FS_BLOCK) * FS_BLOCK;
    int lx = cell.x - blockOrigin.x;
    int ly = cell.y - blockOrigin.y;

    // Per-block scan-start jitter
    uvec3 jitterHash = pcg(uvec3(uint(blockOrigin.x + 1), uint(blockOrigin.y + 1), 0x517cc1b7u));
    int apronX = FS_APRON_MIN + int(jitterHash.x % uint(FS_APRON_MAX - FS_APRON_MIN + 1));
    int apronY = FS_APRON_MIN + int(jitterHash.y % uint(FS_APRON_MAX - FS_APRON_MIN + 1));

    float stepScale = fsScale();
    vec3 bias = vec3(threshold * stepScale);
    // Single in-place error row; array index = cell x + FS_APRON_MAX + 1 so
    // every index is a compile-time constant once the inner loop unrolls,
    // letting the row state live in registers instead of scratch memory.
    // Jitter is applied by masking cells left of -apronX instead of by
    // changing the loop bounds.
    vec3 errRow[FS_ERR_W];
    for (int i = 0; i < FS_ERR_W; i++) {
        errRow[i] = fsSeedNoise(blockOrigin, i) * stepScale;
    }

    vec3 carried = vec3(0.0);
    for (int r = -FS_APRON_MAX; r <= ly; r++) {
        if (r < -apronY) {
            continue;
        }
        bool lastRow = r == ly;
        vec3 rightErr = fsSeedNoise(blockOrigin, FS_ERR_W + FS_APRON_MAX + r) * stepScale;
        vec3 diag = vec3(0.0);
        for (int c = -FS_APRON_MAX; c < FS_BLOCK + FS_RPAD; c++) {
            if (c >= -apronX && !(lastRow && c >= lx)) {
                vec3 src = fsFetchCell(blockOrigin + ivec2(c, r), cellSize, texSize);
                vec3 v = clamp(src + errRow[c + FS_APRON_MAX + 1] + rightErr + bias, 0.0, 1.0);
                vec3 err = v - fsQuantize(v);
                rightErr = err * (7.0 / 16.0);
                errRow[c + FS_APRON_MAX] += err * (3.0 / 16.0);
                errRow[c + FS_APRON_MAX + 1] = diag + err * (5.0 / 16.0);
                diag = err * (1.0 / 16.0);
            }
        }
        if (lastRow) {
            // Incoming error for this fragment's own cell; keep the array
            // read on constant indices so it stays register-resident.
            vec3 incoming = errRow[FS_APRON_MAX + 1];
            if (lx == 1) incoming = errRow[FS_APRON_MAX + 2];
            if (lx == 2) incoming = errRow[FS_APRON_MAX + 3];
            if (lx == 3) incoming = errRow[FS_APRON_MAX + 4];
            carried = incoming + rightErr;
        }
    }

    // This fragment's own pixel, carrying the diffused error so per-pixel
    // detail survives when a cell spans multiple pixels
    vec3 src = texelFetch(inputTex, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 v = clamp(src + carried + bias, 0.0, 1.0);
    return fsQuantize(v);
}

void main() {
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(texSize);

    vec4 color = texture(inputTex, uv);

    // Use global pixel coordinate for dither pattern so it aligns across tiles
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;

    vec3 result;

    if (ditherType == DITHER_ERROR_DIFFUSION) {
        result = errorDiffusion(globalCoord, matrixScale * renderScale, texSize);
    } else {
        // Get dither threshold for current pixel
        float ditherValue = getDitherThreshold(globalCoord, ditherType, matrixScale * renderScale);

        if (palette == PALETTE_INPUT) {
            // Per-channel quantization to the chosen number of levels
            result = quantizeWithDither(color.rgb, float(levels), ditherValue, threshold);
        } else {
            // Use palette-based dithering
            result = ditherWithPalette(color.rgb, ditherValue, threshold, palette);
        }
    }
    
    // Blend between original input and dithered result
    result = mix(color.rgb, result, mixAmount);
    
    fragColor = vec4(result, color.a);
}
`,wgsl:`/*
 * Ordered dithering effect
 * Applies various dithering patterns and color palettes for retro aesthetics
 */

struct Uniforms {
    ditherType: i32,
    palette: i32,
    _pad0: i32,
    levels: i32,
    threshold: f32,
    matrixScale: f32,
    time: f32,
    mixAmount: f32,
}

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// Dither type constants
const DITHER_BAYER_2X2: i32 = 0;
const DITHER_BAYER_4X4: i32 = 1;
const DITHER_BAYER_8X8: i32 = 2;
const DITHER_DOT: i32 = 3;
const DITHER_LINE: i32 = 4;
const DITHER_CROSSHATCH: i32 = 5;
const DITHER_NOISE: i32 = 6;
const DITHER_ERROR_DIFFUSION: i32 = 7;

// Palette constants
const PALETTE_INPUT: i32 = 0;
const PALETTE_MONOCHROME: i32 = 1;
const PALETTE_DOT_MATRIX_GREEN: i32 = 2;
const PALETTE_AMBER: i32 = 3;
const PALETTE_PICO8: i32 = 4;
const PALETTE_C64: i32 = 5;
const PALETTE_CGA: i32 = 6;
const PALETTE_ZX_SPECTRUM: i32 = 7;
const PALETTE_APPLE_II: i32 = 8;
const PALETTE_EGA: i32 = 9;

// Bayer 2x2 matrix values
fn getBayer2x2(x: i32, y: i32) -> f32 {
    let bayer = array<f32, 4>(
        0.0/4.0, 2.0/4.0,
        3.0/4.0, 1.0/4.0
    );
    let idx = (y & 1) * 2 + (x & 1);
    return bayer[idx];
}

// Bayer 4x4 matrix values
fn getBayer4x4(x: i32, y: i32) -> f32 {
    let bayer = array<f32, 16>(
         0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
        12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
         3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
        15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
    );
    let idx = (y & 3) * 4 + (x & 3);
    return bayer[idx];
}

// 8x8 Bayer matrix - using lookup for correctness
fn getBayer8x8(x: i32, y: i32) -> f32 {
    let xm = x & 7;
    let ym = y & 7;
    
    // Standard 8x8 ordered dither matrix
    let bayer8 = array<f32, 64>(
         0.0/64.0, 32.0/64.0,  8.0/64.0, 40.0/64.0,  2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0,
        48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0,
        12.0/64.0, 44.0/64.0,  4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0,  6.0/64.0, 38.0/64.0,
        60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0,
         3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0,  1.0/64.0, 33.0/64.0,  9.0/64.0, 41.0/64.0,
        51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0,
        15.0/64.0, 47.0/64.0,  7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0,  5.0/64.0, 37.0/64.0,
        63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0
    );
    
    return bayer8[ym * 8 + xm];
}

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

// Hash function for noise dithering
fn hash(p: vec2<f32>) -> f32 {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        0u
    ));
    return f32(v.x) / f32(0xffffffffu);
}

// Dot pattern dithering
fn dotPattern(uv: vec2<f32>, scale: f32) -> f32 {
    let p = uv * scale;
    let d = length(fract(p) - 0.5);
    return smoothstep(0.5, 0.0, d);
}

// Line pattern dithering
fn linePattern(uv: vec2<f32>, scale: f32) -> f32 {
    let p = uv.y * scale;
    return abs(fract(p) - 0.5) * 2.0;
}

// Crosshatch pattern
fn crosshatchPattern(uv: vec2<f32>, scale: f32) -> f32 {
    let p = uv * scale;
    let line1 = abs(fract(p.x + p.y) - 0.5) * 2.0;
    let line2 = abs(fract(p.x - p.y) - 0.5) * 2.0;
    return min(line1, line2);
}

// Get dither threshold based on type and position
// matrixScale determines how many screen pixels each matrix cell covers
// e.g., scale=1 means 1:1, scale=2 means each cell is 2x2 screen pixels
fn getDitherThreshold(pixelCoord: vec2<f32>, ditherType: i32, scale: f32, time: f32) -> f32 {
    // Scale the pixel coordinate - larger scale = bigger pattern cells
    let scaledCoord = floor(pixelCoord / scale);
    let x = i32(scaledCoord.x);
    let y = i32(scaledCoord.y);
    
    if (ditherType == DITHER_BAYER_2X2) {
        return getBayer2x2(x, y);
    } else if (ditherType == DITHER_BAYER_4X4) {
        return getBayer4x4(x, y);
    } else if (ditherType == DITHER_BAYER_8X8) {
        return getBayer8x8(x, y);
    } else if (ditherType == DITHER_DOT) {
        // Dot pattern with 8-pixel base, scaled (larger scale = bigger dots)
        return dotPattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (ditherType == DITHER_LINE) {
        // Line pattern with 8-pixel base
        return linePattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (ditherType == DITHER_CROSSHATCH) {
        // Crosshatch pattern with 8-pixel base
        return crosshatchPattern(pixelCoord, 1.0 / (8.0 * scale));
    } else if (ditherType == DITHER_NOISE) {
        // Noise pattern: scale determines block size
        return hash(scaledCoord + time * 0.001);
    }
    
    return 0.5;
}


// Quantize color to specified levels with dithering
fn quantizeWithDither(color: vec3<f32>, levels: f32, ditherValue: f32, thresh: f32) -> vec3<f32> {
    let adjustedDither = ditherValue - 0.5 + thresh;
    let dithered = color + adjustedDither / levels;
    return floor(dithered * levels) / (levels - 1.0);
}

// Color distance in RGB space
fn colorDistance(a: vec3<f32>, b: vec3<f32>) -> f32 {
    let diff = a - b;
    return dot(diff, diff);
}

// Palette color arrays
fn getDotMatrixGreen(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.06, 0.22, 0.06); }
        case 1: { return vec3<f32>(0.19, 0.38, 0.19); }
        case 2: { return vec3<f32>(0.55, 0.67, 0.06); }
        default: { return vec3<f32>(0.61, 0.74, 0.06); }
    }
}

fn getAmber(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.4, 0.2, 0.0); }
        case 2: { return vec3<f32>(0.8, 0.4, 0.0); }
        default: { return vec3<f32>(1.0, 0.6, 0.0); }
    }
}

fn getCGA(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.0, 1.0, 1.0); }
        case 2: { return vec3<f32>(1.0, 0.0, 1.0); }
        default: { return vec3<f32>(1.0, 1.0, 1.0); }
    }
}

fn getPico8(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.114, 0.169, 0.325); }
        case 2: { return vec3<f32>(0.494, 0.145, 0.325); }
        case 3: { return vec3<f32>(0.0, 0.529, 0.318); }
        case 4: { return vec3<f32>(0.671, 0.322, 0.212); }
        case 5: { return vec3<f32>(0.373, 0.341, 0.310); }
        case 6: { return vec3<f32>(0.761, 0.765, 0.780); }
        case 7: { return vec3<f32>(1.0, 0.945, 0.910); }
        case 8: { return vec3<f32>(1.0, 0.0, 0.302); }
        case 9: { return vec3<f32>(1.0, 0.639, 0.0); }
        case 10: { return vec3<f32>(1.0, 0.925, 0.153); }
        case 11: { return vec3<f32>(0.0, 0.894, 0.212); }
        case 12: { return vec3<f32>(0.161, 0.678, 1.0); }
        case 13: { return vec3<f32>(0.514, 0.463, 0.612); }
        case 14: { return vec3<f32>(1.0, 0.467, 0.659); }
        default: { return vec3<f32>(1.0, 0.8, 0.667); }
    }
}

fn getC64(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(1.0, 1.0, 1.0); }
        case 2: { return vec3<f32>(0.533, 0.0, 0.0); }
        case 3: { return vec3<f32>(0.667, 1.0, 0.933); }
        case 4: { return vec3<f32>(0.8, 0.267, 0.8); }
        case 5: { return vec3<f32>(0.0, 0.8, 0.333); }
        case 6: { return vec3<f32>(0.0, 0.0, 0.667); }
        case 7: { return vec3<f32>(0.933, 0.933, 0.467); }
        case 8: { return vec3<f32>(0.867, 0.533, 0.333); }
        case 9: { return vec3<f32>(0.4, 0.267, 0.0); }
        case 10: { return vec3<f32>(1.0, 0.467, 0.467); }
        case 11: { return vec3<f32>(0.2, 0.2, 0.2); }
        case 12: { return vec3<f32>(0.467, 0.467, 0.467); }
        case 13: { return vec3<f32>(0.667, 1.0, 0.4); }
        case 14: { return vec3<f32>(0.0, 0.533, 1.0); }
        default: { return vec3<f32>(0.6, 0.6, 0.6); }
    }
}

fn getZXSpectrum(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.0, 0.0, 0.839); }
        case 2: { return vec3<f32>(0.839, 0.0, 0.0); }
        case 3: { return vec3<f32>(0.839, 0.0, 0.839); }
        case 4: { return vec3<f32>(0.0, 0.839, 0.0); }
        case 5: { return vec3<f32>(0.0, 0.839, 0.839); }
        case 6: { return vec3<f32>(0.839, 0.839, 0.0); }
        case 7: { return vec3<f32>(0.839, 0.839, 0.839); }
        case 8: { return vec3<f32>(0.0, 0.0, 1.0); }
        case 9: { return vec3<f32>(1.0, 0.0, 0.0); }
        case 10: { return vec3<f32>(1.0, 0.0, 1.0); }
        case 11: { return vec3<f32>(0.0, 1.0, 0.0); }
        case 12: { return vec3<f32>(0.0, 1.0, 1.0); }
        case 13: { return vec3<f32>(1.0, 1.0, 0.0); }
        default: { return vec3<f32>(1.0, 1.0, 1.0); }
    }
}

fn getAppleII(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.882, 0.0, 0.494); }
        case 2: { return vec3<f32>(0.247, 0.0, 0.682); }
        case 3: { return vec3<f32>(1.0, 0.0, 1.0); }
        case 4: { return vec3<f32>(0.0, 0.494, 0.263); }
        case 5: { return vec3<f32>(0.502, 0.502, 0.502); }
        case 6: { return vec3<f32>(0.0, 0.325, 1.0); }
        case 7: { return vec3<f32>(0.667, 0.671, 1.0); }
        case 8: { return vec3<f32>(0.502, 0.302, 0.0); }
        case 9: { return vec3<f32>(1.0, 0.467, 0.0); }
        case 10: { return vec3<f32>(0.502, 0.502, 0.502); }
        case 11: { return vec3<f32>(1.0, 0.616, 0.667); }
        case 12: { return vec3<f32>(0.0, 0.831, 0.0); }
        case 13: { return vec3<f32>(1.0, 1.0, 0.0); }
        case 14: { return vec3<f32>(0.333, 1.0, 0.557); }
        default: { return vec3<f32>(1.0, 1.0, 1.0); }
    }
}

fn getEGA(i: i32) -> vec3<f32> {
    switch(i) {
        case 0: { return vec3<f32>(0.0, 0.0, 0.0); }
        case 1: { return vec3<f32>(0.0, 0.0, 0.667); }
        case 2: { return vec3<f32>(0.0, 0.667, 0.0); }
        case 3: { return vec3<f32>(0.0, 0.667, 0.667); }
        case 4: { return vec3<f32>(0.667, 0.0, 0.0); }
        case 5: { return vec3<f32>(0.667, 0.0, 0.667); }
        case 6: { return vec3<f32>(0.667, 0.333, 0.0); }
        case 7: { return vec3<f32>(0.667, 0.667, 0.667); }
        case 8: { return vec3<f32>(0.333, 0.333, 0.333); }
        case 9: { return vec3<f32>(0.333, 0.333, 1.0); }
        case 10: { return vec3<f32>(0.333, 1.0, 0.333); }
        case 11: { return vec3<f32>(0.333, 1.0, 1.0); }
        case 12: { return vec3<f32>(1.0, 0.333, 0.333); }
        case 13: { return vec3<f32>(1.0, 0.333, 1.0); }
        case 14: { return vec3<f32>(1.0, 1.0, 0.333); }
        default: { return vec3<f32>(1.0, 1.0, 1.0); }
    }
}

// Find closest color in palette
fn findClosestPaletteColor(color: vec3<f32>, paletteType: i32) -> vec3<f32> {
    if (paletteType == PALETTE_MONOCHROME) {
        let luma = dot(color, vec3<f32>(0.299, 0.587, 0.114));
        if (luma > 0.5) {
            return vec3<f32>(1.0);
        } else {
            return vec3<f32>(0.0);
        }
    }
    
    var closest = vec3<f32>(0.0);
    var minDist = 999999.0;
    var count = 16;
    
    if (paletteType == PALETTE_DOT_MATRIX_GREEN || paletteType == PALETTE_AMBER || paletteType == PALETTE_CGA) {
        count = 4;
    } else if (paletteType == PALETTE_ZX_SPECTRUM) {
        count = 15;
    }
    
    for (var i = 0; i < count; i = i + 1) {
        var palColor = vec3<f32>(0.0);
        
        if (paletteType == PALETTE_DOT_MATRIX_GREEN) {
            palColor = getDotMatrixGreen(i);
        } else if (paletteType == PALETTE_AMBER) {
            palColor = getAmber(i);
        } else if (paletteType == PALETTE_PICO8) {
            palColor = getPico8(i);
        } else if (paletteType == PALETTE_C64) {
            palColor = getC64(i);
        } else if (paletteType == PALETTE_CGA) {
            palColor = getCGA(i);
        } else if (paletteType == PALETTE_ZX_SPECTRUM) {
            palColor = getZXSpectrum(i);
        } else if (paletteType == PALETTE_APPLE_II) {
            palColor = getAppleII(i);
        } else if (paletteType == PALETTE_EGA) {
            palColor = getEGA(i);
        }
        
        let dist = colorDistance(color, palColor);
        if (dist < minDist) {
            minDist = dist;
            closest = palColor;
        }
    }
    
    return closest;
}

// Apply palette-based dithering
fn ditherWithPalette(color: vec3<f32>, ditherValue: f32, thresh: f32, paletteType: i32) -> vec3<f32> {
    let dithered = clamp(color + (ditherValue - 0.5 + thresh) * 0.25, vec3<f32>(0.0), vec3<f32>(1.0));
    return findClosestPaletteColor(dithered, paletteType);
}

// Error diffusion (Floyd-Steinberg). Fragments cannot share sequential state,
// so each fragment re-simulates the raster scan over its containing block of
// FS_BLOCK x FS_BLOCK diffusion cells, extended by a burn-in apron on the
// left and top so the error state entering the block is driven by the
// neighboring image content; without it the severed error flow at block
// edges reads as a square grid. Three details keep the block structure
// statistically invisible: the apron length is jittered per block (flat
// regions otherwise phase-lock to the shared scan origin), apron rows are
// seeded with hash noise of typical steady-state magnitude (an all-zero
// start is atypical and phase-aligned), and rows extend FS_RPAD cells past
// the block's right edge (the right column otherwise never receives its
// down-left error taps). A cell covers matrixScale screen pixels, like the
// ordered pattern cells.
const FS_BLOCK: i32 = 4;
const FS_APRON_MIN: i32 = 4;
const FS_APRON_MAX: i32 = 11;
const FS_RPAD: i32 = 2;
// error row width: block + max apron + right pad + one left pad cell
const FS_ERR_W: i32 = FS_BLOCK + FS_APRON_MAX + FS_RPAD + 1;

// Quantize for error diffusion: nearest palette color, or nearest of
// \`levels\` evenly spaced per-channel levels when palette == input.
fn fsQuantize(v: vec3<f32>, paletteType: i32, levels: f32) -> vec3<f32> {
    if (paletteType == PALETTE_INPUT) {
        let maxLevel = levels - 1.0;
        // floor(x + 0.5) instead of round(): GLSL leaves round-half direction
        // implementation-defined while WGSL rounds half to even, and the
        // chaotic error feedback amplifies any halfway-tie mismatch.
        return floor(v * maxLevel + 0.5) / maxLevel;
    }
    return findClosestPaletteColor(v, paletteType);
}

// Working-value scale shared by the threshold bias and the block seeds,
// matching the ordered paths' scaling at their neutral dither value.
fn fsScale(paletteType: i32, levels: f32) -> f32 {
    if (paletteType == PALETTE_INPUT) {
        return 1.0 / levels;
    }
    return 0.25;
}

// Per-block, per-lane noise in [-0.5, 0.5) for seeding error state.
// Lanes 0..FS_ERR_W-1 seed the incoming error row; higher lanes seed each
// scan row's right-flowing error.
fn fsSeedNoise(blockOrigin: vec2<i32>, lane: i32) -> vec3<f32> {
    let v = pcg(vec3<u32>(u32(blockOrigin.x + 1), u32(blockOrigin.y + 1), u32(lane + 1)));
    return vec3<f32>(v) / f32(0xffffffffu) - 0.5;
}

// Source color for a diffusion cell: its center pixel, clamped to the texture.
fn fsFetchCell(cell: vec2<i32>, cellSize: f32, texSize: vec2<i32>) -> vec3<f32> {
    let pGlobal = (vec2<f32>(cell) + 0.5) * cellSize;
    let p = clamp(vec2<i32>(floor(pGlobal)), vec2<i32>(0), texSize - 1);
    return textureLoad(inputTex, p, 0).rgb;
}

fn errorDiffusion(pixelCoord: vec2<f32>, cellSize: f32, paletteType: i32, levelsInt: i32, thresh: f32) -> vec3<f32> {
    let texSize = vec2<i32>(textureDimensions(inputTex));
    let levels = f32(levelsInt);
    let cell = vec2<i32>(floor(pixelCoord / cellSize));
    let blockOrigin = (cell / FS_BLOCK) * FS_BLOCK;
    let lx = cell.x - blockOrigin.x;
    let ly = cell.y - blockOrigin.y;

    // Per-block scan-start jitter
    let jitterHash = pcg(vec3<u32>(u32(blockOrigin.x + 1), u32(blockOrigin.y + 1), 0x517cc1b7u));
    let apronX = FS_APRON_MIN + i32(jitterHash.x % u32(FS_APRON_MAX - FS_APRON_MIN + 1));
    let apronY = FS_APRON_MIN + i32(jitterHash.y % u32(FS_APRON_MAX - FS_APRON_MIN + 1));

    let stepScale = fsScale(paletteType, levels);
    let bias = vec3<f32>(thresh * stepScale);
    // Single in-place error row; array index = cell x + FS_APRON_MAX + 1 so
    // every index is a compile-time constant once the inner loop unrolls,
    // letting the row state live in registers instead of scratch memory.
    // Jitter is applied by masking cells left of -apronX instead of by
    // changing the loop bounds.
    var errRow: array<vec3<f32>, 18>;
    for (var i = 0; i < FS_ERR_W; i = i + 1) {
        errRow[i] = fsSeedNoise(blockOrigin, i) * stepScale;
    }

    var carried = vec3<f32>(0.0);
    for (var r = -FS_APRON_MAX; r <= ly; r = r + 1) {
        if (r < -apronY) {
            continue;
        }
        let lastRow = r == ly;
        var rightErr = fsSeedNoise(blockOrigin, FS_ERR_W + FS_APRON_MAX + r) * stepScale;
        var diag = vec3<f32>(0.0);
        for (var c = -FS_APRON_MAX; c < FS_BLOCK + FS_RPAD; c = c + 1) {
            if (c >= -apronX && !(lastRow && c >= lx)) {
                let src = fsFetchCell(blockOrigin + vec2<i32>(c, r), cellSize, texSize);
                let v = clamp(src + errRow[c + FS_APRON_MAX + 1] + rightErr + bias, vec3<f32>(0.0), vec3<f32>(1.0));
                let err = v - fsQuantize(v, paletteType, levels);
                rightErr = err * (7.0 / 16.0);
                errRow[c + FS_APRON_MAX] = errRow[c + FS_APRON_MAX] + err * (3.0 / 16.0);
                errRow[c + FS_APRON_MAX + 1] = diag + err * (5.0 / 16.0);
                diag = err * (1.0 / 16.0);
            }
        }
        if (lastRow) {
            // Incoming error for this fragment's own cell; keep the array
            // read on constant indices so it stays register-resident.
            var incoming = errRow[FS_APRON_MAX + 1];
            if (lx == 1) { incoming = errRow[FS_APRON_MAX + 2]; }
            if (lx == 2) { incoming = errRow[FS_APRON_MAX + 3]; }
            if (lx == 3) { incoming = errRow[FS_APRON_MAX + 4]; }
            carried = incoming + rightErr;
        }
    }

    // This fragment's own pixel, carrying the diffused error so per-pixel
    // detail survives when a cell spans multiple pixels
    let own = clamp(vec2<i32>(pixelCoord), vec2<i32>(0), texSize - 1);
    let src = textureLoad(inputTex, own, 0).rgb;
    let v = clamp(src + carried + bias, vec3<f32>(0.0), vec3<f32>(1.0));
    return fsQuantize(v, paletteType, levels);
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    
    var color = textureSample(inputTex, inputSampler, uv);
    
    var result: vec3<f32>;

    if (uniforms.ditherType == DITHER_ERROR_DIFFUSION) {
        result = errorDiffusion(pos.xy, uniforms.matrixScale, uniforms.palette, uniforms.levels, uniforms.threshold);
    } else {
        // Get dither threshold for current pixel
        let ditherValue = getDitherThreshold(pos.xy, uniforms.ditherType, uniforms.matrixScale, uniforms.time);

        if (uniforms.palette == PALETTE_INPUT) {
            // Per-channel quantization to the chosen number of levels
            result = quantizeWithDither(color.rgb, f32(uniforms.levels), ditherValue, uniforms.threshold);
        } else {
            // Use palette-based dithering
            result = ditherWithPalette(color.rgb, ditherValue, uniforms.threshold, uniforms.palette);
        }
    }
    
    // Blend between original input and dithered result
    result = mix(color.rgb, result, uniforms.mixAmount);
    
    return vec4<f32>(result, color.a);
}
`}},l=`# dither

Ordered dithering with classic patterns and retro color palettes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| type | int | bayer4x4 | bayer2x2/bayer4x4/bayer8x8/dot/line/crosshatch/noise/errorDiffusion | Dithering pattern type |
| threshold | float | 0 | -0.5 to 0.5 | Threshold bias/offset for dither pattern |
| matrixScale | int | 2 | 1-8 | Scale of the dither pattern on screen |
| palette | int | input | input/monochrome/dotMatrixGreen/amberMonitor/pico8/commodore64/cgaPalette1/zxSpectrum/appleII/ega | Color palette for quantization |
| levels | int | 4 | 2-16 | Quantization levels per channel when palette = input |
| mix | float | 1 | 0-1 | Blend between original input (0) and dithered output (1) |

## Dither Types

### Bayer Matrices
Classic ordered dithering using threshold matrices of various sizes:
- **2x2**: Coarse, visible pattern with 4 threshold levels
- **4x4**: Standard dithering with 16 threshold levels
- **8x8**: Fine dithering with 64 threshold levels (default)

### Pattern Types
- **dot**: Circular halftone-style pattern
- **line**: Horizontal line pattern
- **crosshatch**: Diagonal crosshatch pattern
- **noise**: Random noise dithering (animated)
- **error diffusion**: Floyd-Steinberg error diffusion, computed block-wise with a seeded burn-in margin

## Palettes

### Input-based Quantization
- **input**: quantizes each RGB channel independently to \`levels\` steps (2-16). levels = 2 is high-contrast 1-bit; levels = 4 matches the classic 2-bit look.

### Preset Palettes
- **monochrome**: Pure black and white
- **dot matrix green**: Game Boy-style green tones
- **amber monitor**: Classic amber CRT monitor colors
- **pico8**: PICO-8 fantasy console 16-color palette
- **commodore 64**: C64 16-color palette
- **CGA palette 1**: Cyan, magenta, white, black
- **zx spectrum**: ZX Spectrum 15-color palette
- **apple II**: Apple II 16-color palette
- **EGA**: Enhanced Graphics Adapter 16-color palette

## Tips

- Use larger pattern scales for a more pronounced retro look
- Combine with the pixels filter for authentic low-resolution aesthetics
- The threshold parameter can help balance dark and light areas
- Noise dithering animates over time for a film grain-like effect
- Lower levels values give a starker poster-like reduction

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .dither()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[r,e]of Object.entries(i))n.shaders[r]={...e}}n&&l&&(n.help=l);var f="filter/dither",u="filter",p="dither",v=n;export{v as default,f as effectId,p as effectName,l as help,u as namespace};
