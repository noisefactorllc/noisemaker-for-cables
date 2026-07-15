/* synth/subdivide */
var l=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new l({name:"Subdivide",namespace:"synth",func:"subdivide",tags:["geometric","pattern"],description:"Recursive grid subdivision with shapes",uniformLayout:{resolution:{slot:0,components:"xy"},mode:{slot:0,components:"z"},depth:{slot:0,components:"w"},density:{slot:1,components:"x"},seed:{slot:1,components:"y"},fill:{slot:1,components:"z"},outline:{slot:1,components:"w"},inputMix:{slot:2,components:"x"},wrap:{slot:2,components:"y"},time:{slot:2,components:"z"},speed:{slot:2,components:"w"}},globals:{tex:{type:"surface",default:"none",ui:{label:"texture",category:"input"}},mode:{type:"int",default:1,uniform:"mode",choices:{binary:0,quad:1},ui:{label:"mode",control:"dropdown"}},depth:{type:"int",default:5,uniform:"depth",min:1,max:6,randMin:3,ui:{label:"depth",control:"slider"}},density:{type:"float",default:75,uniform:"density",min:30,max:100,randMin:50,ui:{label:"density",control:"slider"}},seed:{type:"int",default:69,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},fill:{type:"int",default:0,uniform:"fill",choices:{solid:0,circle:1,diamond:2,square:3,arc:4,mixed:5},ui:{label:"fill",control:"dropdown",enabledBy:{param:"mode",neq:0}}},outline:{type:"float",default:3,uniform:"outline",min:0,max:10,zero:0,ui:{label:"outline",control:"slider"}},inputMix:{type:"float",default:0,uniform:"inputMix",min:0,max:100,randChance:0,ui:{label:"input mix",control:"slider",category:"input",enabledBy:{param:"tex",neq:"none"}}},speed:{type:"int",default:1,uniform:"speed",min:0,max:20,zero:0,randMax:5,ui:{label:"speed",control:"slider"}},wrap:{type:"int",default:0,uniform:"wrap",choices:{mirror:0,repeat:1,clamp:2},randChance:0,ui:{label:"wrap",control:"dropdown",category:"input",enabledBy:{param:"tex",neq:"none"}}}},passes:[{name:"render",program:"subdivide",inputs:{inputTex:"tex"},outputs:{fragColor:"outputTex"}}]});var i={subdivide:{glsl:`/*
 * Recursive grid subdivision with shapes
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float renderScale;
uniform float mode;
uniform float depth;
uniform float density;
uniform float seed;
uniform float fill;
uniform float outline;
uniform float inputMix;
uniform float wrap;
uniform float time;
uniform float speed;

out vec4 fragColor;

// PCG PRNG - deterministic across platforms
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

vec3 prng(vec3 p) {
    return vec3(pcg(uvec3(uint(p.x), uint(p.y), uint(p.z)))) / float(0xffffffffu);
}

// Golden ratio for staggering level transitions
const float PHI = 1.618033988749895;

float cellRand(vec2 cellMin, float level, float channel, float animSeed) {
    float cx = floor(cellMin.x * 1000.0);
    float cy = floor(cellMin.y * 1000.0);
    return prng(vec3(cx + level * 7.0, cy + level * 13.0, seed + channel + animSeed * 100.0)).x;
}

// Shape functions (1.0 inside, 0.0 outside)
// All work in 1:1 aspect-corrected centered coords
float circleShape(vec2 centered) {
    return step(length(centered), 0.32);
}

float diamondShape(vec2 centered) {
    return step(abs(centered.x) + abs(centered.y), 0.32);
}

float squareShape(vec2 centered) {
    return step(max(abs(centered.x), abs(centered.y)), 0.28);
}

float arcShape(vec2 centered, float halfW, float halfH, float h) {
    int corner = int(h * 4.0);
    vec2 origin;
    if (corner == 0) origin = vec2(-halfW, -halfH);
    else if (corner == 1) origin = vec2(halfW, -halfH);
    else if (corner == 2) origin = vec2(-halfW, halfH);
    else origin = vec2(halfW, halfH);
    float dist = length(centered - origin);
    return step(dist, 0.7) * (1.0 - step(dist, 0.5));
}

float drawShape(int shapeType, vec2 centered, float halfW, float halfH, float h) {
    if (shapeType == 0) return 1.0;  // solid
    if (shapeType == 1) return circleShape(centered);
    if (shapeType == 2) return diamondShape(centered);
    if (shapeType == 3) return squareShape(centered);
    if (shapeType == 4) return arcShape(centered, halfW, halfH, h);
    return 1.0;
}

float shadeFromHash(float h) {
    int idx = int(h * 5.0);
    if (idx == 0) return 0.15;
    if (idx == 1) return 0.35;
    if (idx == 2) return 0.55;
    if (idx == 3) return 0.75;
    return 1.0;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;

    int maxDepth = int(depth);
    float dens = density / 100.0;
    int fillType = int(fill);
    int modeType = int(mode);
    float spd = floor(speed) * 2.0;
    float outlineWidthX = outline * renderScale / fullResolution.x;
    float outlineWidthY = outline * renderScale / fullResolution.y;

    // Subdivision loop
    vec2 cellMin = vec2(0.0);
    vec2 cellMax = vec2(1.0);
    bool isOutline = false;

    for (int level = 0; level < 6; level++) {
        if (level >= maxDepth) break;

        // Stagger each level's transition using golden ratio
        float levelTime = floor(time * spd + float(level) * PHI);
        float h = cellRand(cellMin, float(level), 0.0, levelTime);

        if (h < dens) {
            // Skip splits that would create too-narrow cells (max 5:1 aspect)
            float cellW = (cellMax.x - cellMin.x) * fullResolution.x;
            float cellH = (cellMax.y - cellMin.y) * fullResolution.y;
            bool canSplitH = min(cellW, cellH * 0.5) / max(cellW, cellH * 0.5) >= 0.2;
            bool canSplitV = min(cellW * 0.5, cellH) / max(cellW * 0.5, cellH) >= 0.2;

            if (modeType == 0) {
                float dir = cellRand(cellMin, float(level), 1.0, levelTime);
                int splitDir = -1;
                if (dir < 0.5) {
                    if (canSplitH) splitDir = 0;
                    else if (canSplitV) splitDir = 1;
                } else {
                    if (canSplitV) splitDir = 1;
                    else if (canSplitH) splitDir = 0;
                }
                if (splitDir == 0) {
                    float mid = (cellMin.y + cellMax.y) * 0.5;
                    if (abs(st.y - mid) < outlineWidthY) isOutline = true;
                    if (st.y < mid) cellMax.y = mid;
                    else cellMin.y = mid;
                } else if (splitDir == 1) {
                    float mid = (cellMin.x + cellMax.x) * 0.5;
                    if (abs(st.x - mid) < outlineWidthX) isOutline = true;
                    if (st.x < mid) cellMax.x = mid;
                    else cellMin.x = mid;
                }
            } else {
                if (canSplitH && canSplitV) {
                    vec2 mid = (cellMin + cellMax) * 0.5;
                    if (abs(st.x - mid.x) < outlineWidthX || abs(st.y - mid.y) < outlineWidthY) {
                        isOutline = true;
                    }
                    if (st.x < mid.x) cellMax.x = mid.x;
                    else cellMin.x = mid.x;
                    if (st.y < mid.y) cellMax.y = mid.y;
                    else cellMin.y = mid.y;
                }
            }
        }
    }

    // Cell properties
    vec2 cellSize = cellMax - cellMin;
    vec2 cellUv = (st - cellMin) / cellSize;

    // 1:1 aspect-corrected coords, scaled to fit shorter side
    float cellPixelW = cellSize.x * fullResolution.x;
    float cellPixelH = cellSize.y * fullResolution.y;
    float minDim = min(cellPixelW, cellPixelH);
    vec2 centered = cellUv - 0.5;
    centered.x *= cellPixelW / minDim;
    centered.y *= cellPixelH / minDim;
    float halfW = cellPixelW / minDim * 0.5;
    float halfH = cellPixelH / minDim * 0.5;

    // Visual properties crossfade between current and next state
    float visualT = time * spd + PHI * 7.0;
    float curVisualTime = floor(visualT);
    float nextVisualTime = curVisualTime + 1.0;
    float visualBlend = smoothstep(0.0, 1.0, fract(visualT));

    // Crossfade shades
    float shade = mix(
        shadeFromHash(cellRand(cellMin, 0.0, 2.0, curVisualTime)),
        shadeFromHash(cellRand(cellMin, 0.0, 2.0, nextVisualTime)),
        visualBlend);
    float bgShade = mix(
        shadeFromHash(cellRand(cellMin, 0.0, 8.0, curVisualTime)),
        shadeFromHash(cellRand(cellMin, 0.0, 8.0, nextVisualTime)),
        visualBlend);

    // Crossfade shapes (dissolve between current and next)
    int curShapeType = fillType;
    int nextShapeType = fillType;
    if (modeType == 0) {
        curShapeType = 0;
        nextShapeType = 0;
    } else if (fillType == 5) {
        curShapeType = int(cellRand(cellMin, 0.0, 3.0, curVisualTime) * 5.0);
        nextShapeType = int(cellRand(cellMin, 0.0, 3.0, nextVisualTime) * 5.0);
    }
    float curCorner = cellRand(cellMin, 0.0, 4.0, curVisualTime);
    float nextCorner = cellRand(cellMin, 0.0, 4.0, nextVisualTime);
    float curMask = drawShape(curShapeType, centered, halfW, halfH, curCorner);
    float nextMask = drawShape(nextShapeType, centered, halfW, halfH, nextCorner);
    float shapeMask = mix(curMask, nextMask, visualBlend);

    float color = mix(bgShade, shade, shapeMask);
    vec3 result = vec3(color);

    // Input texture blend (scaled to wider side, aspect-preserving)
    float blend = inputMix / 100.0;
    if (blend > 0.0) {
        float curTexScale = 0.3 + cellRand(cellMin, 0.0, 5.0, curVisualTime) * 0.7;
        float nextTexScale = 0.3 + cellRand(cellMin, 0.0, 5.0, nextVisualTime) * 0.7;
        float texScale = mix(curTexScale, nextTexScale, visualBlend);

        vec2 texUv = cellUv;
        // Correct for aspect ratio difference between cell and texture
        float cellAspect = (cellSize.x * fullResolution.x) / (cellSize.y * fullResolution.y);
        float texAspect = fullResolution.x / fullResolution.y;
        float ratio = cellAspect / texAspect;
        if (ratio > 1.0) {
            texUv.x = 0.5 + (texUv.x - 0.5) * ratio;
        } else {
            texUv.y = 0.5 + (texUv.y - 0.5) / ratio;
        }
        texUv = texUv * texScale;
        texUv.x += mix(
            cellRand(cellMin, 0.0, 6.0, curVisualTime),
            cellRand(cellMin, 0.0, 6.0, nextVisualTime),
            visualBlend) * (1.0 - texScale);
        texUv.y += mix(
            cellRand(cellMin, 0.0, 7.0, curVisualTime),
            cellRand(cellMin, 0.0, 7.0, nextVisualTime),
            visualBlend) * (1.0 - texScale);
        // Apply wrap mode
        int wrapMode = int(wrap);
        if (wrapMode == 0) {
            texUv = abs(mod(texUv + 1.0, 2.0) - 1.0);
        } else if (wrapMode == 1) {
            texUv = mod(texUv, 1.0);
        } else {
            texUv = clamp(texUv, 0.0, 1.0);
        }
        vec3 inputColor = texture(inputTex, texUv).rgb;
        result = mix(result, inputColor, blend);
    }

    // Outline (black, drawn after texture so it stays visible)
    if (isOutline && outline > 0.0) {
        result = vec3(0.0);
    }

    fragColor = vec4(result, 1.0);
}
`,wgsl:`/*
 * Recursive grid subdivision with shapes
 */

struct Uniforms {
    // data[0] = (resolution.x, resolution.y, mode, depth)
    // data[1] = (density, seed, fill, outline)
    // data[2] = (inputMix, wrap, time, speed)
    data: array<vec4<f32>, 3>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;

// PCG PRNG - deterministic across platforms
fn pcg(v_in: vec3<u32>) -> vec3<u32> {
    var v = v_in * 1664525u + 1013904223u;
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    v = v ^ (v >> vec3<u32>(16u));
    v.x = v.x + v.y * v.z;
    v.y = v.y + v.z * v.x;
    v.z = v.z + v.x * v.y;
    return v;
}

fn prng(p: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(pcg(vec3<u32>(u32(p.x), u32(p.y), u32(p.z)))) / f32(0xffffffffu);
}

// Get a random float for a cell at a given level and channel
// Golden ratio for staggering level transitions
const PHI: f32 = 1.618033988749895;

fn cellRand(cellMin: vec2<f32>, level: f32, channel: f32, animSeed: f32) -> f32 {
    let cx = floor(cellMin.x * 1000.0);
    let cy = floor(cellMin.y * 1000.0);
    let seed = u.data[1].y;
    return prng(vec3<f32>(cx + level * 7.0, cy + level * 13.0, seed + channel + animSeed * 100.0)).x;
}

// Shape functions (1.0 inside, 0.0 outside)
// All work in 1:1 aspect-corrected centered coords
fn circleShape(centered: vec2<f32>) -> f32 {
    return step(length(centered), 0.32);
}

fn diamondShape(centered: vec2<f32>) -> f32 {
    return step(abs(centered.x) + abs(centered.y), 0.32);
}

fn squareShape(centered: vec2<f32>) -> f32 {
    return step(max(abs(centered.x), abs(centered.y)), 0.28);
}

fn arcShape(centered: vec2<f32>, halfW: f32, halfH: f32, h: f32) -> f32 {
    let corner = i32(h * 4.0);
    var origin: vec2<f32>;
    if (corner == 0) { origin = vec2<f32>(-halfW, -halfH); }
    else if (corner == 1) { origin = vec2<f32>(halfW, -halfH); }
    else if (corner == 2) { origin = vec2<f32>(-halfW, halfH); }
    else { origin = vec2<f32>(halfW, halfH); }
    let dist = length(centered - origin);
    return step(dist, 0.7) * (1.0 - step(dist, 0.5));
}

fn drawShape(shapeType: i32, centered: vec2<f32>, halfW: f32, halfH: f32, h: f32) -> f32 {
    if (shapeType == 0) { return 1.0; }  // solid
    if (shapeType == 1) { return circleShape(centered); }
    if (shapeType == 2) { return diamondShape(centered); }
    if (shapeType == 3) { return squareShape(centered); }
    if (shapeType == 4) { return arcShape(centered, halfW, halfH, h); }
    return 1.0;
}

fn shadeFromHash(h: f32) -> f32 {
    let idx = i32(h * 5.0);
    if (idx == 0) { return 0.15; }
    if (idx == 1) { return 0.35; }
    if (idx == 2) { return 0.55; }
    if (idx == 3) { return 0.75; }
    return 1.0;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let resolution = u.data[0].xy;
    let modeType = i32(u.data[0].z);
    let maxDepth = i32(u.data[0].w);
    let dens = u.data[1].x / 100.0;
    let fillType = i32(u.data[1].z);
    let outlineWidthX = u.data[1].w / resolution.x;
    let outlineWidthY = u.data[1].w / resolution.y;

    let time = u.data[2].z;
    let spd = floor(u.data[2].w) * 2.0;

    let st = pos.xy / resolution;

    // Subdivision loop
    var cellMin = vec2<f32>(0.0);
    var cellMax = vec2<f32>(1.0);
    var isOutline = false;

    for (var level = 0; level < 6; level = level + 1) {
        if (level >= maxDepth) { break; }

        // Stagger each level's transition using golden ratio
        let levelTime = floor(time * spd + f32(level) * PHI);
        let h = cellRand(cellMin, f32(level), 0.0, levelTime);

        if (h < dens) {
            // Skip splits that would create too-narrow cells (max 5:1 aspect)
            let cellW = (cellMax.x - cellMin.x) * resolution.x;
            let cellH = (cellMax.y - cellMin.y) * resolution.y;
            let canSplitH = min(cellW, cellH * 0.5) / max(cellW, cellH * 0.5) >= 0.2;
            let canSplitV = min(cellW * 0.5, cellH) / max(cellW * 0.5, cellH) >= 0.2;

            if (modeType == 0) {
                let dir = cellRand(cellMin, f32(level), 1.0, levelTime);
                var splitDir = -1;
                if (dir < 0.5) {
                    if (canSplitH) { splitDir = 0; }
                    else if (canSplitV) { splitDir = 1; }
                } else {
                    if (canSplitV) { splitDir = 1; }
                    else if (canSplitH) { splitDir = 0; }
                }
                if (splitDir == 0) {
                    let mid = (cellMin.y + cellMax.y) * 0.5;
                    if (abs(st.y - mid) < outlineWidthY) { isOutline = true; }
                    if (st.y < mid) { cellMax.y = mid; }
                    else { cellMin.y = mid; }
                } else if (splitDir == 1) {
                    let mid = (cellMin.x + cellMax.x) * 0.5;
                    if (abs(st.x - mid) < outlineWidthX) { isOutline = true; }
                    if (st.x < mid) { cellMax.x = mid; }
                    else { cellMin.x = mid; }
                }
            } else {
                if (canSplitH && canSplitV) {
                    let mid = (cellMin + cellMax) * 0.5;
                    if (abs(st.x - mid.x) < outlineWidthX || abs(st.y - mid.y) < outlineWidthY) {
                        isOutline = true;
                    }
                    if (st.x < mid.x) { cellMax.x = mid.x; }
                    else { cellMin.x = mid.x; }
                    if (st.y < mid.y) { cellMax.y = mid.y; }
                    else { cellMin.y = mid.y; }
                }
            }
        }
    }

    // Cell properties
    let cellSize = cellMax - cellMin;
    let cellUv = (st - cellMin) / cellSize;

    // 1:1 aspect-corrected coords, scaled to fit shorter side
    let cellPixelW = cellSize.x * resolution.x;
    let cellPixelH = cellSize.y * resolution.y;
    let minDim = min(cellPixelW, cellPixelH);
    var centered = cellUv - 0.5;
    centered.x = centered.x * (cellPixelW / minDim);
    centered.y = centered.y * (cellPixelH / minDim);
    let halfW = cellPixelW / minDim * 0.5;
    let halfH = cellPixelH / minDim * 0.5;

    // Visual properties crossfade between current and next state
    let visualT = time * spd + PHI * 7.0;
    let curVisualTime = floor(visualT);
    let nextVisualTime = curVisualTime + 1.0;
    let visualBlend = smoothstep(0.0, 1.0, fract(visualT));

    // Crossfade shades
    let shade = mix(
        shadeFromHash(cellRand(cellMin, 0.0, 2.0, curVisualTime)),
        shadeFromHash(cellRand(cellMin, 0.0, 2.0, nextVisualTime)),
        visualBlend);
    let bgShade = mix(
        shadeFromHash(cellRand(cellMin, 0.0, 8.0, curVisualTime)),
        shadeFromHash(cellRand(cellMin, 0.0, 8.0, nextVisualTime)),
        visualBlend);

    // Crossfade shapes (dissolve between current and next)
    var curShapeType = fillType;
    var nextShapeType = fillType;
    if (modeType == 0) {
        curShapeType = 0;
        nextShapeType = 0;
    } else if (fillType == 5) {
        curShapeType = i32(cellRand(cellMin, 0.0, 3.0, curVisualTime) * 5.0);
        nextShapeType = i32(cellRand(cellMin, 0.0, 3.0, nextVisualTime) * 5.0);
    }
    let curCorner = cellRand(cellMin, 0.0, 4.0, curVisualTime);
    let nextCorner = cellRand(cellMin, 0.0, 4.0, nextVisualTime);
    let curMask = drawShape(curShapeType, centered, halfW, halfH, curCorner);
    let nextMask = drawShape(nextShapeType, centered, halfW, halfH, nextCorner);
    let shapeMask = mix(curMask, nextMask, visualBlend);

    let color = mix(bgShade, shade, shapeMask);
    var result = vec3<f32>(color);

    // Input texture blend (random scale, offset, aspect-preserving)
    let blend = u.data[2].x / 100.0;
    if (blend > 0.0) {
        let curTexScale = 0.3 + cellRand(cellMin, 0.0, 5.0, curVisualTime) * 0.7;
        let nextTexScale = 0.3 + cellRand(cellMin, 0.0, 5.0, nextVisualTime) * 0.7;
        let texScale = mix(curTexScale, nextTexScale, visualBlend);

        var texUv = cellUv;
        // Correct for aspect ratio difference between cell and texture
        let cellAspect = (cellSize.x * resolution.x) / (cellSize.y * resolution.y);
        let texAspect = resolution.x / resolution.y;
        let ratio = cellAspect / texAspect;
        if (ratio > 1.0) {
            texUv.x = 0.5 + (texUv.x - 0.5) * ratio;
        } else {
            texUv.y = 0.5 + (texUv.y - 0.5) / ratio;
        }
        texUv = texUv * texScale;
        texUv.x = texUv.x + mix(
            cellRand(cellMin, 0.0, 6.0, curVisualTime),
            cellRand(cellMin, 0.0, 6.0, nextVisualTime),
            visualBlend) * (1.0 - texScale);
        texUv.y = texUv.y + mix(
            cellRand(cellMin, 0.0, 7.0, curVisualTime),
            cellRand(cellMin, 0.0, 7.0, nextVisualTime),
            visualBlend) * (1.0 - texScale);
        // Apply wrap mode
        let wrapMode = i32(u.data[2].y);
        if (wrapMode == 0) {
            texUv = abs(((texUv + 1.0) % 2.0 + 2.0) % 2.0 - 1.0);
        } else if (wrapMode == 1) {
            texUv = (texUv % 1.0 + 1.0) % 1.0;
        } else {
            texUv = clamp(texUv, vec2<f32>(0.0), vec2<f32>(1.0));
        }
        let inputColor = textureSample(inputTex, samp, texUv).rgb;
        result = mix(result, inputColor, blend);
    }

    // Outline (black, drawn after texture so it stays visible)
    if (isOutline && u.data[1].w > 0.0) {
        result = vec3<f32>(0.0);
    }

    return vec4<f32>(result, 1.0);
}
`}},a=`# subdivide

Recursive grid subdivision with shapes

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mode | int | quad | binary/quad | Subdivision type |
| depth | int | 5 | 1-6 | Max subdivision levels |
| density | float | 75 | 30-100 | Subdivision probability |
| seed | int | 69 | 1-100 | Random seed |
| fill | int | solid | solid/circle/diamond/square/arc/mixed | Cell fill shape |
| outline | float | 3 | 0-10 | Grid line width in pixels |
| speed | int | 1 | 0-20 | Animation speed |
| tex | surface | none | - | Optional texture input |
| inputMix | float | 0 | 0-100 | Blend with input texture |
| wrap | int | mirror | mirror/repeat/clamp | Input texture coordinate wrap |

## Usage

\`\`\`
search synth

noise(seed: 1, ridges: true)
  .write(o0)

subdivide(tex: read(o0))
  .write(o1)

render(o1)
\`\`\`
`;if(n&&Object.keys(i).length>0){n.shaders||(n.shaders={});for(let[t,e]of Object.entries(i))n.shaders[t]={...e}}n&&a&&(n.help=a);var d="synth/subdivide",u="synth",f="subdivide",p=n;export{p as default,d as effectId,f as effectName,a as help,u as namespace};
