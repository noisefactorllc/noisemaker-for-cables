/* filter/osd */
var i=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new i({name:"OSD",namespace:"filter",func:"osd",tags:["text"],description:"On-screen display overlay",globals:{alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,randMin:.5,ui:{label:"alpha",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},speed:{type:"float",default:0,uniform:"speed",min:0,max:50,step:.1,ui:{label:"speed",control:"slider"}},corner:{type:"int",default:3,uniform:"corner",choices:{topLeft:0,topRight:1,bottomLeft:2,bottomRight:3},ui:{label:"position",control:"dropdown"}}},passes:[{name:"main",program:"osd",inputs:{inputTex:"inputTex"},uniforms:{alpha:"alpha",seed:"seed",speed:"speed",corner:"corner"},outputs:{fragColor:"outputTex"}}]});var a={osd:{glsl:`#version 300 es

precision highp float;
precision highp int;

// OSD: On-screen display overlay with bank_ocr digit bitmaps.
// Renders a small readout of 3-6 digits at the bottom-right corner,
// with time-cycling digit values and green/white OSD tint.

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float alpha;
uniform float seed;
uniform float speed;
uniform float time;
uniform int corner;

layout(location = 0) out vec4 fragColor;

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
const int BASE_PADDING = 25;

uint pcg(uint v_in) {
    uint state = v_in * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

uint hash2(uint a, uint b) {
    return pcg(a ^ (b * 0x9e3779b9u + 0x632be59bu));
}

uint hash3(uint a, uint b, uint c) {
    return pcg(hash2(a, b) ^ (c * 0x94d049bbu + 0x5bf03635u));
}

// Sample the bitmap for a given digit at pixel-local coords
float sample_glyph(int digit, int localX, int localY, int iScale) {
    int gx = localX / iScale;
    int gy = localY / iScale;
    if (gx < 0 || gx >= GLYPH_W || gy < 0 || gy >= GLYPH_H) return 0.0;
    int row = GLYPHS[digit * 8 + gy];
    return float((row >> (6 - gx)) & 1);
}

void main() {
    // Scale all pixel-space sizes by renderScale for high-res export
    int iScale = max(int(float(BASE_SCALE) * renderScale), 1);
    int CELL_W = GLYPH_W * iScale;
    int CELL_H = GLYPH_H * iScale;
    int GAP = iScale;
    int PADDING = int(float(BASE_PADDING) * renderScale);

    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 texDims = textureSize(inputTex, 0);
    // Use full image dimensions for corner positioning so OSD appears in the correct corner
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : vec2(texDims);
    int width = max(int(fullRes.x), 1);
    int height = max(int(fullRes.y), 1);
    // Adjust coord by tileOffset for global pixel position
    ivec2 globalCoord = coord + ivec2(tileOffset);

    vec4 texel = texelFetch(inputTex, coord, 0);

    float blend_alpha = clamp(alpha, 0.0, 1.0);

    // Subtle scanline tint across entire image (OSD monitor feel)
    int scanlineStep = max(iScale / BASE_SCALE, 1);
    float scanline = 1.0 - 0.03 * blend_alpha * float((globalCoord.y / scanlineStep) & 1);
    vec3 base_rgb = texel.rgb * scanline;

    if (blend_alpha <= 0.0) {
        fragColor = vec4(base_rgb, texel.a);
        return;
    }

    uint base_seed = uint(max(seed, 1.0));

    // Glyph count: 3-6 from seed
    int glyph_count = 3 + int(hash2(base_seed, 42u) % 4u);

    // Overlay dimensions
    int overlay_w = glyph_count * CELL_W + (glyph_count - 1) * GAP;
    int overlay_h = CELL_H;

    // Position based on corner (GL coords: y=0 is bottom)
    // 0=TL, 1=TR, 2=BL, 3=BR
    int origin_x;
    int origin_y;
    if (corner == 0) { // top-left
        origin_x = PADDING;
        origin_y = height - overlay_h - PADDING;
    } else if (corner == 1) { // top-right
        origin_x = width - overlay_w - PADDING;
        origin_y = height - overlay_h - PADDING;
    } else if (corner == 2) { // bottom-left
        origin_x = PADDING;
        origin_y = PADDING;
    } else { // bottom-right (default)
        origin_x = width - overlay_w - PADDING;
        origin_y = PADDING;
    }
    if (origin_x < 0) origin_x = 0;
    if (origin_y < 0) origin_y = 0;

    // Expand OSD region with padding for background panel
    int panel_pad = GAP * 2;
    int panel_x0 = origin_x - panel_pad;
    int panel_y0 = origin_y - panel_pad;
    int panel_x1 = origin_x + overlay_w + panel_pad;
    int panel_y1 = origin_y + overlay_h + panel_pad;

    // Outside panel region: just scanline
    if (globalCoord.x < panel_x0 || globalCoord.x >= panel_x1 || globalCoord.y < panel_y0 || globalCoord.y >= panel_y1) {
        fragColor = vec4(base_rgb, texel.a);
        return;
    }

    // Check if pixel is in OSD glyph region
    int lx = globalCoord.x - origin_x;
    int ly = globalCoord.y - origin_y;

    float mask = 0.0;
    if (lx >= 0 && lx < overlay_w && ly >= 0 && ly < overlay_h) {
        // Determine which glyph
        int cell_stride = CELL_W + GAP;
        int glyph_idx = lx / cell_stride;
        int within_glyph_x = lx - glyph_idx * cell_stride;

        if (within_glyph_x < CELL_W && glyph_idx < glyph_count) {
            // Local Y within glyph (flip so row 0 is top of glyph)
            int local_y = (CELL_H - 1) - ly;

            // Time-cycling digit selection
            int time_cell = int(floor(time * max(speed, 0.001)));
            uint digit_hash = hash3(base_seed, uint(glyph_idx), uint(time_cell));
            int digit = int(digit_hash % 10u);

            mask = sample_glyph(digit, within_glyph_x, local_y, iScale);
        }
    }

    // Dark background panel behind digits
    vec3 panel_bg = base_rgb * (1.0 - 0.5 * blend_alpha);

    if (mask < 0.5) {
        fragColor = vec4(clamp(panel_bg, 0.0, 1.0), texel.a);
        return;
    }

    // Green/white OSD tint
    vec3 osd_color = vec3(0.7, 1.0, 0.75);
    vec3 highlight = max(panel_bg, osd_color * mask);
    vec3 blended = mix(panel_bg, highlight, blend_alpha);
    fragColor = vec4(clamp(blended, 0.0, 1.0), texel.a);
}
`,wgsl:`// OSD: On-screen display overlay with bank_ocr digit bitmaps.
// Renders a small readout of 3-6 digits at the bottom-right corner,
// with time-cycling digit values and green/white OSD tint.

const GLYPH_W : i32 = 7;
const GLYPH_H : i32 = 8;
const SCALE : i32 = 3;
const CELL_W : i32 = 21;  // GLYPH_W * SCALE
const CELL_H : i32 = 24;  // GLYPH_H * SCALE
const GAP : i32 = 3;      // SCALE
const PADDING : i32 = 25;

// Bank OCR bitmaps: 10 digits, 7 wide x 8 tall each
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

struct OsdParams {
    width : f32,
    height : f32,
    channels : f32,
    alpha : f32,
    seed : f32,
    speed : f32,
    time : f32,
    corner : f32,
}

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> output_buffer : array<f32>;
@group(0) @binding(2) var<uniform> params : OsdParams;

fn pcg(v_in : u32) -> u32 {
    let state : u32 = v_in * 747796405u + 2891336453u;
    let word : u32 = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn hash2(a : u32, b : u32) -> u32 {
    return pcg(a ^ (b * 0x9e3779b9u + 0x632be59bu));
}

fn hash3(a : u32, b : u32, c : u32) -> u32 {
    return pcg(hash2(a, b) ^ (c * 0x94d049bbu + 0x5bf03635u));
}

fn sample_glyph(digit : i32, localX : i32, localY : i32) -> f32 {
    let gx : i32 = localX / SCALE;
    let gy : i32 = localY / SCALE;
    if (gx < 0 || gx >= GLYPH_W || gy < 0 || gy >= GLYPH_H) {
        return 0.0;
    }
    let row : i32 = GLYPHS[digit * 8 + gy];
    // WGSL requires the right-hand side of \`>>\` to be a u32 (or vecN<u32>)
    return f32((row >> u32(6 - gx)) & 1);
}

fn write_pixel(base_index : u32, rgba : vec4<f32>) {
    output_buffer[base_index + 0u] = rgba.x;
    output_buffer[base_index + 1u] = rgba.y;
    output_buffer[base_index + 2u] = rgba.z;
    output_buffer[base_index + 3u] = rgba.w;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let w : u32 = max(u32(max(round(params.width), 0.0)), 1u);
    let h : u32 = max(u32(max(round(params.height), 0.0)), 1u);
    if (gid.x >= w || gid.y >= h) {
        return;
    }

    let coord : vec2<i32> = vec2<i32>(i32(gid.x), i32(gid.y));
    let texel : vec4<f32> = textureLoad(inputTex, coord, 0);
    let pixel_index : u32 = gid.y * w + gid.x;
    let base_index : u32 = pixel_index * 4u;

    let blend_alpha : f32 = clamp(params.alpha, 0.0, 1.0);

    // Subtle scanline tint across entire image (OSD monitor feel)
    let scanline : f32 = 1.0 - 0.03 * blend_alpha * f32(coord.y & 1);
    let base_rgb : vec3<f32> = texel.rgb * scanline;

    if (blend_alpha <= 0.0) {
        write_pixel(base_index, vec4<f32>(base_rgb.x, base_rgb.y, base_rgb.z, texel.a));
        return;
    }

    let base_seed : u32 = u32(max(params.seed, 1.0));
    let width : i32 = i32(w);
    let height : i32 = i32(h);

    // Glyph count: 3-6 from seed
    let glyph_count : i32 = 3 + i32(hash2(base_seed, 42u) % 4u);

    // Overlay dimensions
    let overlay_w : i32 = glyph_count * CELL_W + (glyph_count - 1) * GAP;
    let overlay_h : i32 = CELL_H;

    // Position based on corner (WebGPU coords: y=0 is top)
    // 0=TL, 1=TR, 2=BL, 3=BR
    let corner_val : i32 = i32(params.corner);
    var origin_x : i32;
    var origin_y : i32;
    if (corner_val == 0) { // top-left
        origin_x = PADDING;
        origin_y = PADDING;
    } else if (corner_val == 1) { // top-right
        origin_x = width - overlay_w - PADDING;
        origin_y = PADDING;
    } else if (corner_val == 2) { // bottom-left
        origin_x = PADDING;
        origin_y = height - overlay_h - PADDING;
    } else { // bottom-right (default)
        origin_x = width - overlay_w - PADDING;
        origin_y = height - overlay_h - PADDING;
    }
    if (origin_x < 0) {
        origin_x = 0;
    }
    if (origin_y < 0) {
        origin_y = 0;
    }

    // Expand OSD region with padding for background panel
    let panel_pad : i32 = GAP * 2;
    let panel_x0 : i32 = origin_x - panel_pad;
    let panel_y0 : i32 = origin_y - panel_pad;
    let panel_x1 : i32 = origin_x + overlay_w + panel_pad;
    let panel_y1 : i32 = origin_y + overlay_h + panel_pad;

    // Outside panel region: just scanline
    if (coord.x < panel_x0 || coord.x >= panel_x1 || coord.y < panel_y0 || coord.y >= panel_y1) {
        write_pixel(base_index, vec4<f32>(base_rgb.x, base_rgb.y, base_rgb.z, texel.a));
        return;
    }

    // Check if pixel is in OSD glyph region
    let lx : i32 = coord.x - origin_x;
    let ly : i32 = coord.y - origin_y;

    var mask : f32 = 0.0;
    if (lx >= 0 && lx < overlay_w && ly >= 0 && ly < overlay_h) {
        // Determine which glyph
        let cell_stride : i32 = CELL_W + GAP;
        let glyph_idx : i32 = lx / cell_stride;
        let within_glyph_x : i32 = lx - glyph_idx * cell_stride;

        if (within_glyph_x < CELL_W && glyph_idx < glyph_count) {
            // Local Y within glyph (y=0 is top in WebGPU, glyph row 0 is top)
            let local_y : i32 = ly;

            // Time-cycling digit selection
            let time_cell : i32 = i32(floor(params.time * max(params.speed, 0.001)));
            let digit_hash : u32 = hash3(base_seed, u32(glyph_idx), u32(time_cell));
            let digit : i32 = i32(digit_hash % 10u);

            mask = sample_glyph(digit, within_glyph_x, local_y);
        }
    }

    // Dark background panel behind digits
    let panel_bg : vec3<f32> = base_rgb * (1.0 - 0.5 * blend_alpha);

    if (mask < 0.5) {
        write_pixel(base_index, vec4<f32>(
            clamp(panel_bg.x, 0.0, 1.0),
            clamp(panel_bg.y, 0.0, 1.0),
            clamp(panel_bg.z, 0.0, 1.0),
            texel.a,
        ));
        return;
    }

    // Green/white OSD tint
    let osd_color : vec3<f32> = vec3<f32>(0.7, 1.0, 0.75);
    let highlight : vec3<f32> = max(panel_bg, osd_color * mask);
    let blended : vec3<f32> = mix(panel_bg, highlight, blend_alpha);
    write_pixel(base_index, vec4<f32>(
        clamp(blended.x, 0.0, 1.0),
        clamp(blended.y, 0.0, 1.0),
        clamp(blended.z, 0.0, 1.0),
        texel.a,
    ));
}
`}},l=`# osd

On-screen display overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| alpha | float | 0.75 | 0-1 | Opacity |
| seed | int | 1 | 1-100 | Random seed |
| speed | float | 0 | 0-50 | Animation speed |
| position | int | bottomRight | topLeft/topRight/bottomLeft/bottomRight | Display corner |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .osd()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(a).length>0){e.shaders||(e.shaders={});for(let[t,n]of Object.entries(a))e.shaders[t]={...n}}e&&l&&(e.help=l);var p="filter/osd",d="filter",g="osd",u=e;export{u as default,p as effectId,g as effectName,l as help,d as namespace};
