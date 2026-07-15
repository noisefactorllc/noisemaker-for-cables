/* filter/median */
var r=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new r({name:"Median",namespace:"filter",func:"median",tags:["blur","artist"],description:"Exact dense 3x3, 5x5, or 7x7 brightness-ranked median with Dust & Scratches threshold gate",globals:{radius:{type:"int",default:3,define:"RADIUS",min:1,max:3,step:1,ui:{label:"radius",control:"slider"}},threshold:{type:"float",default:0,uniform:"threshold",min:0,max:100,ui:{label:"threshold",control:"slider"}}},passes:[{name:"median",program:"median",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var a={median:{glsl:`/*
 * Exact dense whole-color Median / Dust & Scratches.
 *
 * RADIUS is a compile-time definition. The 3x3, 5x5, and 7x7 variants make
 * exactly 9, 25, and 49 clamped integer texture reads. A bounded in-place
 * selection partitions packed RGB/luminance records around the middle rank,
 * avoiding the work and register pressure of fully sorting the neighborhood.
 */

#ifdef GL_ES
precision highp float;
#endif

#if RADIUS == 1
#define REAL_COUNT 9
#elif RADIUS == 2
#define REAL_COUNT 25
#else
#define REAL_COUNT 49
#endif

uniform sampler2D inputTex;
uniform float threshold;

out vec4 fragColor;

bool lessRecord(uvec2 a, uint blueA, uvec2 b, uint blueB) {
    if (a.x != b.x) return a.x < b.x;
    if (a.y != b.y) return a.y < b.y;
    return blueA < blueB;
}

uvec2 packRecordMajor(vec4 sampleColor) {
    float brightness = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    uint packedRg = packHalf2x16(sampleColor.rg);
    uint orderedRg = ((packedRg & 0xffffu) << 16) | (packedRg >> 16);
    return uvec2(floatBitsToUint(brightness), orderedRg);
}

uint packRecordBlue(vec4 sampleColor) {
    return packHalf2x16(vec2(sampleColor.b, 0.0)) & 0xffffu;
}

vec3 unpackRecordRgb(uvec2 major, uint blue) {
    uint packedRg = (major.y << 16) | (major.y >> 16);
    vec2 rg = unpackHalf2x16(packedRg);
    float b = unpackHalf2x16(blue).x;
    return vec3(rg, b);
}

vec4 readRecord(ivec2 center, ivec2 dimensions, int x, int y) {
    ivec2 coord = clamp(center + ivec2(x, y), ivec2(0), dimensions - ivec2(1));
    return texelFetch(inputTex, coord, 0);
}

void main() {
    uvec2 majorRecords[REAL_COUNT];
    uint blueRecords[REAL_COUNT];
    ivec2 dimensions = textureSize(inputTex, 0);
    ivec2 center = ivec2(gl_FragCoord.xy);
    vec3 originalRgb = vec3(0.0);
    float centerAlpha = 1.0;
    int index = 0;
    for (int y = -RADIUS; y <= RADIUS; y++) {
        for (int x = -RADIUS; x <= RADIUS; x++) {
            vec4 sampleColor = readRecord(center, dimensions, x, y);
            majorRecords[index] = packRecordMajor(sampleColor);
            blueRecords[index] = packRecordBlue(sampleColor);
            if (x == 0 && y == 0) {
                originalRgb = sampleColor.rgb;
                centerAlpha = sampleColor.a;
            }
            index++;
        }
    }

    int medianIndex = REAL_COUNT / 2;
    int left = 0;
    int right = REAL_COUNT - 1;
    while (left < right) {
        uvec2 pivotMajor = majorRecords[medianIndex];
        uint pivotBlue = blueRecords[medianIndex];
        int scanLeft = left;
        int scanRight = right;
        while (scanLeft <= scanRight) {
            while (lessRecord(majorRecords[scanLeft], blueRecords[scanLeft], pivotMajor, pivotBlue)) { scanLeft++; }
            while (lessRecord(pivotMajor, pivotBlue, majorRecords[scanRight], blueRecords[scanRight])) { scanRight--; }
            if (scanLeft <= scanRight) {
                uvec2 temporaryMajor = majorRecords[scanLeft];
                majorRecords[scanLeft] = majorRecords[scanRight];
                majorRecords[scanRight] = temporaryMajor;
                uint temporaryBlue = blueRecords[scanLeft];
                blueRecords[scanLeft] = blueRecords[scanRight];
                blueRecords[scanRight] = temporaryBlue;
                scanLeft++;
                scanRight--;
            }
        }
        if (scanRight < medianIndex) { left = scanLeft; }
        if (medianIndex < scanLeft) { right = scanRight; }
    }

    vec3 medianRgb = unpackRecordRgb(majorRecords[medianIndex], blueRecords[medianIndex]);
    vec3 difference = abs(originalRgb - medianRgb);
    float maxDifference = max(max(difference.r, difference.g), difference.b);
    bool replaceCenter = threshold <= 0.0 || maxDifference >= threshold / 100.0;
    fragColor = vec4(replaceCenter ? medianRgb : originalRgb, centerAlpha);
}
`,wgsl:`// Exact dense whole-color Median / Dust & Scratches.
// RADIUS == 1 -> REAL_COUNT 9
// RADIUS == 2 -> REAL_COUNT 25
// RADIUS == 3 -> REAL_COUNT 49
// RADIUS is injected as an i32 compile-time constant by the runtime.

const REAL_COUNT: u32 = u32((2 * RADIUS + 1) * (2 * RADIUS + 1));

struct Uniforms {
    threshold: f32,
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

fn less_record(a: vec2<u32>, blue_a: u32, b: vec2<u32>, blue_b: u32) -> bool {
    if (a.x != b.x) { return a.x < b.x; }
    if (a.y != b.y) { return a.y < b.y; }
    return blue_a < blue_b;
}

fn pack_record_major(color: vec4<f32>) -> vec2<u32> {
    let brightness = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    let packed_rg = pack2x16float(color.rg);
    let ordered_rg = ((packed_rg & 0xffffu) << 16u) | (packed_rg >> 16u);
    return vec2<u32>(bitcast<u32>(brightness), ordered_rg);
}

fn pack_record_blue(color: vec4<f32>) -> u32 {
    return pack2x16float(vec2<f32>(color.b, 0.0)) & 0xffffu;
}

fn unpack_record_rgb(major: vec2<u32>, blue: u32) -> vec3<f32> {
    let packed_rg = (major.y << 16u) | (major.y >> 16u);
    let rg = unpack2x16float(packed_rg);
    let b = unpack2x16float(blue).x;
    return vec3<f32>(rg, b);
}

fn read_record(center: vec2<i32>, dimensions: vec2<i32>, x: i32, y: i32) -> vec4<f32> {
    let coord = clamp(center + vec2<i32>(x, y), vec2<i32>(0), dimensions - vec2<i32>(1));
    return textureLoad(inputTex, coord, 0);
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    var major_records: array<vec2<u32>, REAL_COUNT>;
    var blue_records: array<u32, REAL_COUNT>;
    let dimensions = vec2<i32>(textureDimensions(inputTex));
    let center = vec2<i32>(position.xy);
    var original_rgb = vec3<f32>(0.0);
    var center_alpha = 1.0;
    var index = 0;
    for (var y = -RADIUS; y <= RADIUS; y++) {
        for (var x = -RADIUS; x <= RADIUS; x++) {
            let sample = read_record(center, dimensions, x, y);
            major_records[index] = pack_record_major(sample);
            blue_records[index] = pack_record_blue(sample);
            if (x == 0 && y == 0) {
                original_rgb = sample.rgb;
                center_alpha = sample.a;
            }
            index++;
        }
    }

    let median_index = i32(REAL_COUNT) / 2;
    var left = 0;
    var right = i32(REAL_COUNT) - 1;
    while (left < right) {
        let pivot_major = major_records[median_index];
        let pivot_blue = blue_records[median_index];
        var scan_left = left;
        var scan_right = right;
        while (scan_left <= scan_right) {
            while (less_record(major_records[scan_left], blue_records[scan_left], pivot_major, pivot_blue)) { scan_left++; }
            while (less_record(pivot_major, pivot_blue, major_records[scan_right], blue_records[scan_right])) { scan_right--; }
            if (scan_left <= scan_right) {
                let temporary_major = major_records[scan_left];
                major_records[scan_left] = major_records[scan_right];
                major_records[scan_right] = temporary_major;
                let temporary_blue = blue_records[scan_left];
                blue_records[scan_left] = blue_records[scan_right];
                blue_records[scan_right] = temporary_blue;
                scan_left++;
                scan_right--;
            }
        }
        if (scan_right < median_index) { left = scan_left; }
        if (median_index < scan_left) { right = scan_right; }
    }

    let median_rgb = unpack_record_rgb(major_records[median_index], blue_records[median_index]);
    let difference = abs(original_rgb - median_rgb);
    let max_difference = max(max(difference.r, difference.g), difference.b);
    let replace_center = uniforms.threshold <= 0.0 || max_difference >= uniforms.threshold / 100.0;
    return vec4<f32>(select(original_rgb, median_rgb, replace_center), center_alpha);
}
`}},i=`# median

Exact dense brightness-ranked median with a Dust & Scratches threshold gate.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| radius | int | 3 | 1-3 | Dense integer radius: 1, 2, and 3 select exact 3x3, 5x5, and 7x7 neighborhoods |
| threshold | float | 0 | 0-100 | Dust & Scratches gate: 0 always uses the median; above 0, the center is replaced only when its maximum RGB difference from the median is at least \`threshold / 100\` |

## Notes

- Every pixel in the selected square neighborhood is sampled at a clamped integer coordinate. There is no sparse or repeated approximation tier.
- Samples are ranked by Rec.709 brightness. The selected sample's complete RGB triplet is preserved, avoiding colors that were not present in the neighborhood.
- Alpha always comes from the original center pixel.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .median()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(a))n.shaders[t]={...e}}n&&i&&(n.help=i);var l="filter/median",u="filter",f="median",p=n;export{p as default,l as effectId,f as effectName,i as help,u as namespace};
