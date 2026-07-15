/* synth/testPattern */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"Test Pattern",namespace:"synth",func:"testPattern",tags:["util"],description:"Test patterns for debugging and calibration",globals:{pattern:{type:"int",default:0,uniform:"pattern",choices:{checkerboard:0,colorBars:1,gradient:2,uvMap:3,gridLines:4,colorGrid:5,dotGrid:6},ui:{label:"pattern",control:"dropdown"}},gridSize:{type:"int",default:4,min:1,max:16,uniform:"gridSize",ui:{label:"grid size",control:"slider",enabledBy:{param:"pattern",in:[0,4,5,6]}}}},passes:[{name:"main",program:"testPattern",inputs:{},outputs:{color:"outputTex"}}]});var r={testPattern:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int gridSize;
uniform int pattern;

out vec4 fragColor;

// 3x5 pixel font for digits 0-9
// Each digit is encoded as 15 bits (3 columns x 5 rows, row-major)
const int GLYPH[10] = int[10](
    0x7B6F,  // 0: 111 101 101 101 111
    0x2492,  // 1: 010 010 010 010 010
    0x73E7,  // 2: 111 001 111 100 111
    0x72CF,  // 3: 111 001 011 001 111
    0x5BC9,  // 4: 101 101 111 001 001
    0x79CF,  // 5: 111 100 111 001 111
    0x79EF,  // 6: 111 100 111 101 111
    0x7249,  // 7: 111 001 001 001 001
    0x7BEF,  // 8: 111 101 111 101 111
    0x7BCF   // 9: 111 101 111 001 111
);

// Sample a glyph at local coordinates (0-2, 0-4)
bool sampleGlyph(int digit, int x, int y) {
    if (digit < 0 || digit > 9 || x < 0 || x > 2 || y < 0 || y > 4) return false;
    int bitIndex = y * 3 + (2 - x);  // row-major, top-left origin
    return ((GLYPH[digit] >> bitIndex) & 1) == 1;
}

// Render a number at a position within a cell
bool renderNumber(int number, vec2 cellUV) {
    // Determine how many digits we need
    int numDigits = 1;
    if (number >= 10) numDigits = 2;
    if (number >= 100) numDigits = 3;

    // Glyph dimensions in UV space (centered, cell-local)
    float glyphWidth = 0.15;
    float glyphHeight = 0.35;
    float spacing = 0.05;

    float totalWidth = float(numDigits) * glyphWidth + float(numDigits - 1) * spacing;
    float startX = 0.5 - totalWidth * 0.5;
    float startY = 0.5 - glyphHeight * 0.5;

    // Check if we're in the vertical range for glyphs
    if (cellUV.y < startY || cellUV.y >= startY + glyphHeight) return false;

    // Extract digits (right to left)
    int digits[3];
    int temp = number;
    for (int i = 0; i < 3; i++) {
        digits[i] = temp % 10;
        temp /= 10;
    }

    // Check each digit position (left to right)
    for (int d = 0; d < numDigits; d++) {
        float digitX = startX + float(d) * (glyphWidth + spacing);

        if (cellUV.x >= digitX && cellUV.x < digitX + glyphWidth) {
            // We're in this digit's horizontal range
            float localX = (cellUV.x - digitX) / glyphWidth;
            float localY = (cellUV.y - startY) / glyphHeight;

            // Map to 3x5 grid
            int gx = int(localX * 3.0);
            int gy = int(localY * 5.0);

            // Get the correct digit (numDigits-1-d because digits[] is reversed)
            int digit = digits[numDigits - 1 - d];

            return sampleGlyph(digit, gx, gy);
        }
    }

    return false;
}

// Pattern 0: Numbered checkerboard
vec4 checkerboard(vec2 uv) {
    int n = max(gridSize, 1);
    int cellX = int(uv.x * float(n)) % n;
    int cellY = int(uv.y * float(n)) % n;

    int cellNum = (n - 1 - cellY) * n + cellX;

    bool isWhiteCell = ((cellX + cellY) % 2) == 0;

    vec2 cellUV = fract(uv * float(n));

    bool isGlyph = renderNumber(cellNum, cellUV);

    float cellColor = isWhiteCell ? 1.0 : 0.0;
    float glyphColor = isWhiteCell ? 0.0 : 1.0;
    float finalColor = isGlyph ? glyphColor : cellColor;

    return vec4(vec3(finalColor), 1.0);
}

// Pattern 1: 8 vertical SMPTE-style color bars
vec4 colorBars(vec2 uv) {
    int bar = int(uv.x * 8.0);
    bar = clamp(bar, 0, 7);

    // white, yellow, cyan, green, magenta, red, blue, black
    vec3 colors[8] = vec3[8](
        vec3(1.0, 1.0, 1.0),
        vec3(1.0, 1.0, 0.0),
        vec3(0.0, 1.0, 1.0),
        vec3(0.0, 1.0, 0.0),
        vec3(1.0, 0.0, 1.0),
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 0.0, 1.0),
        vec3(0.0, 0.0, 0.0)
    );

    return vec4(colors[bar], 1.0);
}

// Pattern 2: Horizontal black-to-white gradient ramp
vec4 gradient(vec2 uv) {
    return vec4(vec3(uv.x), 1.0);
}

// Pattern 3: UV map (R=u, G=v, B=0)
vec4 uvMap(vec2 uv) {
    return vec4(uv.x, uv.y, 0.0, 1.0);
}

// Pattern 4: Thin white grid lines on black
vec4 gridLines(vec2 uv) {
    int n = max(gridSize, 1);
    vec2 cellUV = fract(uv * float(n));
    vec2 edge = min(cellUV, 1.0 - cellUV);
    
    // Use direct calculation instead of fwidth() for tile-aware rendering.
    // This maintains the same line thickness in normal rendering while ensuring
    // continuity across tile boundaries during large-format print export.
    vec2 fw = vec2(1.0) / fullResolution * float(n);
    
    float line = 1.0 - smoothstep(0.0, 2.0 * fw.x, edge.x) * smoothstep(0.0, 2.0 * fw.y, edge.y);
    return vec4(vec3(line), 1.0);
}

// HSV to RGB (hue only, full saturation & value)
vec3 hue2rgb(float h) {
    float r = abs(h * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(h * 6.0 - 2.0);
    float b = 2.0 - abs(h * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

// Pattern 5: Each cell gets a unique hue
vec4 colorGrid(vec2 uv) {
    int n = max(gridSize, 1);
    int cellX = int(uv.x * float(n)) % n;
    int cellY = int(uv.y * float(n)) % n;
    int cellIndex = cellY * n + cellX;
    float hue = fract(float(cellIndex) * 0.618033988749895);
    return vec4(hue2rgb(hue), 1.0);
}

// Pattern 6: Filled circle at each grid intersection
vec4 dotGrid(vec2 uv) {
    int n = max(gridSize, 1);
    vec2 scaled = uv * float(n);
    vec2 nearest = round(scaled);
    float dist = length(scaled - nearest);
    float dot = 1.0 - smoothstep(0.12, 0.15, dist);
    return vec4(vec3(dot), 1.0);
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 uv = globalCoord / fullResolution;

    if (pattern == 1) {
        fragColor = colorBars(uv);
    } else if (pattern == 2) {
        fragColor = gradient(uv);
    } else if (pattern == 3) {
        fragColor = uvMap(uv);
    } else if (pattern == 4) {
        fragColor = gridLines(uv);
    } else if (pattern == 5) {
        fragColor = colorGrid(uv);
    } else if (pattern == 6) {
        fragColor = dotGrid(uv);
    } else {
        fragColor = checkerboard(uv);
    }
}`,wgsl:`// WGSL version \u2013 WebGPU

struct Uniforms {
    resolution: vec2f,
    gridSize: i32,
    pattern: i32,
    tileOffset: vec2f,
    fullResolution: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// 3x5 pixel font for digits 0-9
// Each digit is encoded as 15 bits (3 columns x 5 rows, row-major)
const GLYPH = array<i32, 10>(
    0x7B6F,  // 0: 111 101 101 101 111
    0x2492,  // 1: 010 010 010 010 010
    0x73E7,  // 2: 111 001 111 100 111
    0x72CF,  // 3: 111 001 011 001 111
    0x5BC9,  // 4: 101 101 111 001 001
    0x79CF,  // 5: 111 100 111 001 111
    0x79EF,  // 6: 111 100 111 101 111
    0x7249,  // 7: 111 001 001 001 001
    0x7BEF,  // 8: 111 101 111 101 111
    0x7BCF   // 9: 111 101 111 001 111
);

// Sample a glyph at local coordinates (0-2, 0-4)
fn sampleGlyph(digit: i32, x: i32, y: i32) -> bool {
    if (digit < 0 || digit > 9 || x < 0 || x > 2 || y < 0 || y > 4) {
        return false;
    }
    let bitIndex = y * 3 + (2 - x);  // row-major, top-left origin
    return ((GLYPH[digit] >> u32(bitIndex)) & 1) == 1;
}

// Render a number at a position within a cell
fn renderNumber(number: i32, cellUV: vec2f) -> bool {
    // Determine how many digits we need
    var numDigits = 1;
    if (number >= 10) { numDigits = 2; }
    if (number >= 100) { numDigits = 3; }

    // Glyph dimensions in UV space (centered, scaled to fit nicely)
    let glyphWidth = 0.15;
    let glyphHeight = 0.35;
    let spacing = 0.05;

    let totalWidth = f32(numDigits) * glyphWidth + f32(numDigits - 1) * spacing;
    let startX = 0.5 - totalWidth * 0.5;
    let startY = 0.5 - glyphHeight * 0.5;

    // Check if we're in the vertical range for glyphs
    if (cellUV.y < startY || cellUV.y >= startY + glyphHeight) {
        return false;
    }

    // Extract digits (right to left)
    var digits = array<i32, 3>(0, 0, 0);
    var temp = number;
    for (var i = 0; i < 3; i++) {
        digits[i] = temp % 10;
        temp = temp / 10;
    }

    // Check each digit position (left to right)
    for (var d = 0; d < numDigits; d++) {
        let digitX = startX + f32(d) * (glyphWidth + spacing);

        if (cellUV.x >= digitX && cellUV.x < digitX + glyphWidth) {
            // We're in this digit's horizontal range
            let localX = (cellUV.x - digitX) / glyphWidth;
            let localY = (cellUV.y - startY) / glyphHeight;

            // Map to 3x5 grid
            let gx = i32(localX * 3.0);
            let gy = i32(localY * 5.0);

            // Get the correct digit (numDigits-1-d because digits[] is reversed)
            let digit = digits[numDigits - 1 - d];

            return sampleGlyph(digit, gx, gy);
        }
    }

    return false;
}

// Pattern 0: Numbered checkerboard
fn checkerboard(uv: vec2f) -> vec4f {
    let n = max(uniforms.gridSize, 1);
    let cellX = i32(uv.x * f32(n)) % n;
    let cellY = i32(uv.y * f32(n)) % n;

    let cellNum = (n - 1 - cellY) * n + cellX;

    let isWhiteCell = ((cellX + cellY) % 2) == 0;

    let cellUV = fract(uv * f32(n));

    let isGlyph = renderNumber(cellNum, cellUV);

    let cellColor = select(0.0, 1.0, isWhiteCell);
    let glyphColor = select(1.0, 0.0, isWhiteCell);
    let finalColor = select(cellColor, glyphColor, isGlyph);

    return vec4f(vec3f(finalColor), 1.0);
}

// Pattern 1: 8 vertical SMPTE-style color bars
fn colorBars(uv: vec2f) -> vec4f {
    var bar = i32(uv.x * 8.0);
    bar = clamp(bar, 0, 7);

    // white, yellow, cyan, green, magenta, red, blue, black
    let colors = array<vec3f, 8>(
        vec3f(1.0, 1.0, 1.0),
        vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 1.0, 1.0),
        vec3f(0.0, 1.0, 0.0),
        vec3f(1.0, 0.0, 1.0),
        vec3f(1.0, 0.0, 0.0),
        vec3f(0.0, 0.0, 1.0),
        vec3f(0.0, 0.0, 0.0)
    );

    return vec4f(colors[bar], 1.0);
}

// Pattern 2: Horizontal black-to-white gradient ramp
fn gradientRamp(uv: vec2f) -> vec4f {
    return vec4f(vec3f(uv.x), 1.0);
}

// Pattern 3: UV map (R=u, G=v, B=0)
fn uvMapPattern(uv: vec2f) -> vec4f {
    return vec4f(uv.x, uv.y, 0.0, 1.0);
}

// Pattern 4: Thin white grid lines on black
fn gridLines(uv: vec2f) -> vec4f {
    let n = max(uniforms.gridSize, 1);
    let cellUV = fract(uv * f32(n));
    let edge = min(cellUV, 1.0 - cellUV);
    // Non-tiling: original fwidth-based AA (byte-identical baseline).
    // Tiling: analytic AA width mirroring glsl/testPattern.glsl, which is
    // seam-stable across tiles where screen-space derivatives are not.
    let isTile = length(uniforms.tileOffset) > 0.0;
    // fwidthFine must be evaluated in uniform control flow (function scope),
    // so compute it unconditionally, then override only when tiling. The
    // analytic-width divide is skipped entirely on the non-tile path.
    var fw = fwidthFine(uv * f32(n));
    var edgeMul = 1.5;
    if (isTile) {
        let fr = select(uniforms.resolution, uniforms.fullResolution, uniforms.fullResolution.x > 0.0);
        fw = vec2f(1.0) / fr * f32(n);
        edgeMul = 2.0;
    }
    let line = 1.0 - smoothstep(0.0, edgeMul * fw.x, edge.x) * smoothstep(0.0, edgeMul * fw.y, edge.y);
    return vec4f(vec3f(line), 1.0);
}

// HSV to RGB (hue only, full saturation & value)
fn hue2rgb(h: f32) -> vec3f {
    let r = abs(h * 6.0 - 3.0) - 1.0;
    let g = 2.0 - abs(h * 6.0 - 2.0);
    let b = 2.0 - abs(h * 6.0 - 4.0);
    return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

// Pattern 5: Each cell gets a unique hue
fn colorGrid(uv: vec2f) -> vec4f {
    let n = max(uniforms.gridSize, 1);
    let cellX = i32(uv.x * f32(n)) % n;
    let cellY = i32(uv.y * f32(n)) % n;
    let cellIndex = cellY * n + cellX;
    let hue = fract(f32(cellIndex) * 0.618033988749895);
    return vec4f(hue2rgb(hue), 1.0);
}

// Pattern 6: Filled circle at each grid intersection
fn dotGrid(uv: vec2f) -> vec4f {
    let n = max(uniforms.gridSize, 1);
    let scaled = uv * f32(n);
    let nearest = round(scaled);
    let dist = length(scaled - nearest);
    let d = 1.0 - smoothstep(0.12, 0.15, dist);
    return vec4f(vec3f(d), 1.0);
}

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
    // Tile-aware global UV (mirror glsl/testPattern.glsl). Non-tiling
    // (tileOffset=(0,0), fullResolution=resolution) is byte-identical.
    let fr = select(uniforms.resolution, uniforms.fullResolution, uniforms.fullResolution.x > 0.0);
    let uv = (position.xy + uniforms.tileOffset) / fr;

    if (uniforms.pattern == 1) {
        return colorBars(uv);
    } else if (uniforms.pattern == 2) {
        return gradientRamp(uv);
    } else if (uniforms.pattern == 3) {
        return uvMapPattern(uv);
    } else if (uniforms.pattern == 4) {
        return gridLines(uv);
    } else if (uniforms.pattern == 5) {
        return colorGrid(uv);
    } else if (uniforms.pattern == 6) {
        return dotGrid(uv);
    } else {
        return checkerboard(uv);
    }
}
`}},l=`# testPattern

Configurable test patterns for debugging and calibration

## Description

Generates various test patterns useful for debugging coordinate systems, verifying color output, and calibrating displays.

## Patterns

| Pattern | Description |
|---------|-------------|
| checkerboard | NxN numbered checkerboard for identifying axis flips |
| colorBars | 8 vertical SMPTE-style color bars |
| gradient | Horizontal black-to-white gradient ramp |
| uvMap | UV coordinate visualization (R=u, G=v, B=0) |
| gridLines | Thin anti-aliased white lines at grid cell boundaries |
| colorGrid | Each cell colored with a unique hue (golden-ratio distributed) |
| dotGrid | White filled circles at grid intersection points |

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| pattern | int | 0 | 0-6 | Pattern selection (see table above) |
| gridSize | int | 4 | 1-16 | Grid size (used by checkerboard, gridLines, colorGrid, dotGrid) |

## Usage

\`\`\`
search synth

testPattern()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(r))e.shaders[i]={...n}}e&&l&&(e.help=l);var u="synth/testPattern",f="synth",d="testPattern",g=e;export{g as default,u as effectId,d as effectName,l as help,f as namespace};
