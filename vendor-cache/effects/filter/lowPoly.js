/* filter/lowPoly */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Low Poly",namespace:"filter",func:"lowPoly",tags:["geometric","noise"],description:"Low-polygon style render using Voronoi cells",globals:{scale:{type:"int",default:50,uniform:"scale",min:2,max:100,ui:{label:"scale",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,ui:{label:"seed",control:"slider"}},mode:{type:"int",default:1,uniform:"mode",choices:{flat:0,edges:1,distance2:2,distance3:3},ui:{label:"mode",control:"dropdown"}},edgeStrength:{type:"float",default:.15,uniform:"edgeStrength",min:0,max:1,ui:{label:"strength",control:"slider",enabledBy:{param:"mode",neq:0}}},edgeColor:{type:"color",default:[0,0,0],uniform:"edgeColor",ui:{label:"edge color",control:"color",enabledBy:{or:[{param:"borderWidth",gt:0},{param:"mode",eq:1}]}}},borderWidth:{type:"int",default:0,uniform:"borderWidth",define:"LP_BORDER",min:0,max:100,zero:0,ui:{label:"border width",control:"slider"}},lightIntensity:{type:"int",default:0,uniform:"lightIntensity",define:"LP_LIGHT",min:0,max:100,zero:0,ui:{label:"light intensity",control:"slider"}},alpha:{type:"float",default:1,uniform:"alpha",min:0,max:1,randChance:0,ui:{label:"alpha",control:"slider"}},speed:{type:"int",default:0,uniform:"speed",min:0,max:5,zero:0,ui:{label:"speed",control:"slider"}}},paramAliases:{freq:"scale",nth:"mode"},passes:[{name:"render",program:"lowPoly",inputs:{inputTex:"inputTex"},outputs:{fragColor:"outputTex"}}]});var o={lowPoly:{glsl:`/*
 * Low Poly - Voronoi-based low-polygon art style
 * Generates deterministic seed points, finds nearest Voronoi cell,
 * fills with input color at seed position. Supports flat and distance modes.
 */

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform sampler2D inputTex;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float scale;
uniform float seed;
uniform int mode;
uniform float edgeStrength;
uniform vec3 edgeColor;
uniform float speed;
uniform float time;
uniform float alpha;

// LP_BORDER / LP_LIGHT are compile-time defines injected by the runtime
// (definition.js \`define:\` fields bake borderWidth / lightIntensity). Keeping
// them compile-time lets the border and lighting blocks be preprocessed out of
// the default variant, so a plain render is byte-identical to the mode result.
#ifndef LP_BORDER
#define LP_BORDER 0
#endif
#ifndef LP_LIGHT
#define LP_LIGHT 0
#endif

out vec4 fragColor;

const float TAU = 6.28318530718;

// PCG PRNG - MIT License
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

vec2 hash2(vec2 p, float s) {
    uvec3 v = pcg(uvec3(
        uint(p.x >= 0.0 ? p.x * 2.0 : -p.x * 2.0 + 1.0),
        uint(p.y >= 0.0 ? p.y * 2.0 : -p.y * 2.0 + 1.0),
        uint(s >= 0.0 ? s * 2.0 : -s * 2.0 + 1.0)
    ));
    return vec2(v.xy) / float(0xffffffffu);
}

#if LP_BORDER > 0
vec2 lowPolySite(ivec2 siteCell, float n, float s, float spd) {
    vec2 siteCellF = vec2(siteCell);
    vec2 offset = hash2(siteCellF, s);

    if (spd > 0.0) {
        vec2 animRand = hash2(siteCellF, s + 100.0);
        float angle = time * TAU + animRand.x * TAU;
        float radius = animRand.y * spd;
        offset = clamp(offset + vec2(cos(angle), sin(angle)) * radius, 0.0, 1.0);
    }

    return (siteCellF + offset) / n;
}
#endif

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    ivec2 texSize = textureSize(inputTex, 0);
    vec2 tileDims = vec2(texSize);
    vec2 resolution = fullResolution.x > 0.0 ? fullResolution : tileDims;
    vec2 uv = gl_FragCoord.xy / tileDims;
    vec2 globalUV = (gl_FragCoord.xy + tileOffset) / resolution;

    float n = max(102.0 - scale, 2.0);
    float s = seed;
    float spd = speed * 0.3;

    // Aspect-corrected coordinates for square Voronoi cells
    float aspect = fullResolution.x / fullResolution.y;
    vec2 auv = vec2(globalUV.x * aspect, globalUV.y);

    // Scale to grid in corrected space
    vec2 scaled = auv * n;
    ivec2 cell = ivec2(floor(scaled));

    float minDist = 1e10;
    float secondDist = 1e10;
    float thirdDist = 1e10;
    vec2 nearestPoint = vec2(0.0);
#if LP_BORDER > 0
    ivec2 nearestCell = ivec2(0);
#endif

    // Search 3x3 neighborhood of cells
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            ivec2 neighbor = cell + ivec2(dx, dy);
            // Inlined seed computation (identical math to lowPolySite) so the
            // primary nearest-site search retains its original per-pixel FP
            // result; lowPolySite() is reused by the border pass below.
            vec2 neighborF = vec2(neighbor);
            vec2 offset = hash2(neighborF, s);
            if (spd > 0.0) {
                vec2 animRand = hash2(neighborF, s + 100.0);
                float angle = time * TAU + animRand.x * TAU;
                float radius = animRand.y * spd;
                offset = clamp(offset + vec2(cos(angle), sin(angle)) * radius, 0.0, 1.0);
            }
            vec2 point = (neighborF + offset) / n;
            float d = distance(auv, point);

            if (d < minDist) {
                thirdDist = secondDist;
                secondDist = minDist;
                minDist = d;
                nearestPoint = point;
#if LP_BORDER > 0
                nearestCell = neighbor;
#endif
            } else if (d < secondDist) {
                thirdDist = secondDist;
                secondDist = d;
            } else if (d < thirdDist) {
                thirdDist = d;
            }
        }
    }

    // Convert nearest point from aspect-corrected global UV to tile-local UV for sampling
    vec2 globalUV_sample = vec2(nearestPoint.x / aspect, nearestPoint.y);
    vec2 localUV_sample = (globalUV_sample * resolution - tileOffset) / tileDims;
    vec4 cellColor = texture(inputTex, localUV_sample);

    vec3 result;
    if (mode == 0) {
        // Flat: pure solid cell color
        result = cellColor.rgb;
    } else if (mode == 1) {
        // Edges: solid cell color with F2-F1 edge darkening
        float edgeDist = clamp((secondDist - minDist) * n * 2.0, 0.0, 1.0);
        float edgeFactor = mix(edgeStrength, 0.0, edgeDist);
        result = mix(cellColor.rgb, edgeColor, edgeFactor);
    } else {
        // Distance: multiply distance field with cell color
        float selectedDist = (mode == 2) ? secondDist : thirdDist;
        float raw = clamp(selectedDist * n, 0.0, 1.0);
        float distField = pow(raw, mix(0.5, 3.0, edgeStrength));
        result = cellColor.rgb * distField;
    }

    // Optional borders and lighting layer over the selected Low Poly mode.
    // Both controls are compile-time defines (LP_BORDER / LP_LIGHT): when zero
    // these blocks are preprocessed out entirely, so the established mode result
    // reaches the blend byte-identical to a plain render.
#if (LP_BORDER > 0) || (LP_LIGHT > 0)
    vec3 modeResult = result;
    float borderMask = 0.0;
#endif

#if LP_BORDER > 0
    // Draw a controllable band along cell boundaries. A bounded 5x5 site search
    // measures perpendicular distance to nearby Voronoi bisectors; width is a
    // percentage of the nominal cell radius.
    {
        // The established mode path above intentionally retains its original
        // 3x3 search. Borders opt into a wider exact-nearest search because a
        // fully jittered site two cells away can own the current pixel.
        vec2 borderNearestPoint = nearestPoint;
        ivec2 borderNearestCell = nearestCell;
        float borderNearestDist = minDist;
        for (int dy = -2; dy <= 2; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
                ivec2 candidateCell = cell + ivec2(dx, dy);
                vec2 candidatePoint = lowPolySite(candidateCell, n, s, spd);
                float candidateDist = distance(auv, candidatePoint);
                if (candidateDist < borderNearestDist) {
                    borderNearestDist = candidateDist;
                    borderNearestPoint = candidatePoint;
                    borderNearestCell = candidateCell;
                }
            }
        }
        float distToEdge = 1e10;
        for (int dy = -2; dy <= 2; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
                ivec2 candidateCell = cell + ivec2(dx, dy);
                if (any(notEqual(candidateCell, borderNearestCell))) {
                    vec2 candidatePoint = lowPolySite(candidateCell, n, s, spd);
                    vec2 siteVector = candidatePoint - borderNearestPoint;
                    float siteDistance = max(length(siteVector), 1e-8);
                    float bisectorDistance = dot(
                        (borderNearestPoint + candidatePoint) * 0.5 - auv,
                        siteVector / siteDistance
                    );
                    distToEdge = min(distToEdge, bisectorDistance);
                }
            }
        }
        float cellRadius = 0.5 / n;
        float borderHalfWidth = (float(LP_BORDER) / 100.0) * cellRadius;
        float borderFeather = max(fwidth(distToEdge), 1e-6);
        borderMask = 1.0 - smoothstep(
            borderHalfWidth - borderFeather,
            borderHalfWidth + borderFeather,
            distToEdge
        );
        result = mix(modeResult, edgeColor, borderMask);
    }
#endif

#if LP_LIGHT > 0
    // Raise the selected mode's value with a bounded exposure curve while
    // scaling RGB together. Composite the border afterward so it never brightens.
    {
        float intensity = clamp(float(LP_LIGHT) / 100.0, 0.0, 1.0);
        float paneValue = max(max(modeResult.r, modeResult.g), modeResult.b);
        float exposure = mix(1.0, 2.25, intensity);
        float litValue = 1.0 - pow(max(1.0 - paneValue, 0.0), exposure);
        vec3 litMode = paneValue > 1e-6 ? modeResult * (litValue / paneValue) : modeResult;
        result = mix(litMode, edgeColor, borderMask);
    }
#endif

    // Alpha blend with original
    vec4 original = texture(inputTex, uv);
    fragColor = vec4(mix(original.rgb, result, alpha), original.a);
}
`,wgsl:`/*
 * Low Poly - Voronoi-based low-polygon art style
 * Generates deterministic seed points, finds nearest Voronoi cell,
 * fills with input color at seed position. Supports flat and distance modes.
 */

struct Uniforms {
    scale: f32,
    seed: f32,
    mode: i32,
    edgeStrength: f32,
    edgeColor: vec3<f32>,
    speed: f32,
    time: f32,
    alpha: f32,
    borderWidth: i32,
    lightIntensity: i32,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
}

// LP_BORDER / LP_LIGHT are compile-time consts injected by the runtime
// (definition.js \`define:\` fields bake borderWidth / lightIntensity). Keeping
// them compile-time lets naga dead-code-eliminate the border and lighting
// blocks from the default variant, so a plain render is byte-identical to the
// mode result.

@group(0) @binding(0) var inputSampler: sampler;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const TAU: f32 = 6.28318530718;

// PCG PRNG - MIT License
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

fn hash2(p: vec2<f32>, s: f32) -> vec2<f32> {
    let v = pcg(vec3<u32>(
        u32(select(-p.x * 2.0 + 1.0, p.x * 2.0, p.x >= 0.0)),
        u32(select(-p.y * 2.0 + 1.0, p.y * 2.0, p.y >= 0.0)),
        u32(select(-s * 2.0 + 1.0, s * 2.0, s >= 0.0)),
    ));
    return vec2<f32>(v.xy) / f32(0xffffffffu);
}

fn lowPolySite(siteCell: vec2<i32>, n: f32, s: f32, spd: f32) -> vec2<f32> {
    let siteCellF = vec2<f32>(siteCell);
    var offset = hash2(siteCellF, s);

    if (spd > 0.0) {
        let animRand = hash2(siteCellF, s + 100.0);
        let angle = uniforms.time * TAU + animRand.x * TAU;
        let radius = animRand.y * spd;
        offset = clamp(offset + vec2<f32>(cos(angle), sin(angle)) * radius, vec2<f32>(0.0), vec2<f32>(1.0));
    }

    return (siteCellF + offset) / n;
}

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texSize = vec2<f32>(textureDimensions(inputTex));
    let uv = pos.xy / texSize;
    let globalUV = (pos.xy + uniforms.tileOffset) / uniforms.fullResolution;

    let n = max(102.0 - uniforms.scale, 2.0);
    let s = uniforms.seed;
    let spd = f32(uniforms.speed) * 0.3;

    // Aspect-corrected coordinates for square Voronoi cells
    let aspect = uniforms.fullResolution.x / uniforms.fullResolution.y;
    let auv = vec2<f32>(globalUV.x * aspect, globalUV.y);

    // Scale to grid in corrected space
    let scaled = auv * n;
    let cell = vec2<i32>(floor(scaled));

    var minDist: f32 = 1e10;
    var secondDist: f32 = 1e10;
    var thirdDist: f32 = 1e10;
    var nearestPoint = vec2<f32>(0.0);
    var nearestCell = vec2<i32>(0);

    // Search 3x3 neighborhood of cells
    for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
            let neighbor = cell + vec2<i32>(dx, dy);
            // Inlined seed computation (identical math to lowPolySite) so the
            // primary nearest-site search retains its original per-pixel FP
            // result; lowPolySite() is reused by the border pass below.
            let neighborF = vec2<f32>(neighbor);
            var offset = hash2(neighborF, s);
            if (spd > 0.0) {
                let animRand = hash2(neighborF, s + 100.0);
                let angle = uniforms.time * TAU + animRand.x * TAU;
                let radius = animRand.y * spd;
                offset = clamp(offset + vec2<f32>(cos(angle), sin(angle)) * radius, vec2<f32>(0.0), vec2<f32>(1.0));
            }
            let point = (neighborF + offset) / n;
            let d = distance(auv, point);

            if (d < minDist) {
                thirdDist = secondDist;
                secondDist = minDist;
                minDist = d;
                nearestPoint = point;
                nearestCell = neighbor;
            } else if (d < secondDist) {
                thirdDist = secondDist;
                secondDist = d;
            } else if (d < thirdDist) {
                thirdDist = d;
            }
        }
    }

    // Convert nearest point back to UV space for texture sampling
    let cellColor = textureSample(inputTex, inputSampler, (vec2<f32>(nearestPoint.x / aspect, nearestPoint.y) * uniforms.fullResolution - uniforms.tileOffset) / texSize);

    var result: vec3<f32>;
    if (uniforms.mode == 0) {
        // Flat: pure solid cell color
        result = cellColor.rgb;
    } else if (uniforms.mode == 1) {
        // Edges: solid cell color with F2-F1 edge darkening
        let edgeDist = clamp((secondDist - minDist) * n * 2.0, 0.0, 1.0);
        let edgeFactor = mix(uniforms.edgeStrength, 0.0, edgeDist);
        result = mix(cellColor.rgb, uniforms.edgeColor, edgeFactor);
    } else {
        // Distance: multiply distance field with cell color
        var selectedDist: f32;
        if (uniforms.mode == 2) { selectedDist = secondDist; }
        else { selectedDist = thirdDist; }
        let raw = clamp(selectedDist * n, 0.0, 1.0);
        let distField = pow(raw, mix(0.5, 3.0, uniforms.edgeStrength));
        result = cellColor.rgb * distField;
    }

    // Optional borders and lighting layer over the selected Low Poly mode.
    // With both controls at zero, the established mode result is untouched.
    let modeResult = result;
    var borderMask: f32 = 0.0;

    // Draw a controllable band along cell boundaries. A bounded 5x5 site search
    // measures perpendicular distance to nearby Voronoi bisectors; width is a
    // percentage of the nominal cell radius. Zero skips this block entirely.
    if (LP_BORDER != 0) {
        // Keep the established mode path's original 3x3 result, but find the
        // exact nearest site for optional border geometry. Full-cell jitter can
        // make a radius-two site own the current pixel.
        var borderNearestPoint = nearestPoint;
        var borderNearestCell = nearestCell;
        var borderNearestDist = minDist;
        for (var dy: i32 = -2; dy <= 2; dy = dy + 1) {
            for (var dx: i32 = -2; dx <= 2; dx = dx + 1) {
                let candidateCell = cell + vec2<i32>(dx, dy);
                let candidatePoint = lowPolySite(candidateCell, n, s, spd);
                let candidateDist = distance(auv, candidatePoint);
                if (candidateDist < borderNearestDist) {
                    borderNearestDist = candidateDist;
                    borderNearestPoint = candidatePoint;
                    borderNearestCell = candidateCell;
                }
            }
        }
        var distToEdge: f32 = 1e10;
        for (var dy: i32 = -2; dy <= 2; dy = dy + 1) {
            for (var dx: i32 = -2; dx <= 2; dx = dx + 1) {
                let candidateCell = cell + vec2<i32>(dx, dy);
                if (any(candidateCell != borderNearestCell)) {
                    let candidatePoint = lowPolySite(candidateCell, n, s, spd);
                    let siteVector = candidatePoint - borderNearestPoint;
                    let siteDistance = max(length(siteVector), 1e-8);
                    let bisectorDistance = dot(
                        (borderNearestPoint + candidatePoint) * 0.5 - auv,
                        siteVector / siteDistance
                    );
                    distToEdge = min(distToEdge, bisectorDistance);
                }
            }
        }
        let cellRadius = 0.5 / n;
        let borderHalfWidth = (f32(LP_BORDER) / 100.0) * cellRadius;
        let borderFeather = max(fwidth(distToEdge), 1e-6);
        borderMask = 1.0 - smoothstep(
            borderHalfWidth - borderFeather,
            borderHalfWidth + borderFeather,
            distToEdge
        );
        result = mix(modeResult, uniforms.edgeColor, borderMask);
    }

    // Raise the selected mode's value with a bounded exposure curve while
    // scaling RGB together. Composite the border afterward so it never brightens.
    // lightIntensity == 0 remains an exact no-op.
    if (LP_LIGHT != 0) {
        let intensity = clamp(f32(LP_LIGHT) / 100.0, 0.0, 1.0);
        let paneValue = max(max(modeResult.r, modeResult.g), modeResult.b);
        let exposure = mix(1.0, 2.25, intensity);
        let litValue = 1.0 - pow(max(1.0 - paneValue, 0.0), exposure);
        var litMode = modeResult;
        if (paneValue > 1e-6) {
            litMode = modeResult * (litValue / paneValue);
        }
        result = mix(litMode, uniforms.edgeColor, borderMask);
    }

    // Alpha blend with original
    let original = textureSample(inputTex, inputSampler, uv);
    return vec4<f32>(mix(original.rgb, result, uniforms.alpha), original.a);
}
`}},s=`# lowPoly

Low-polygon style render using Voronoi cells

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | int | 50 | 2-100 | Cell size |
| seed | int | 1 | 1-100 | Random seed for cell layout |
| mode | int | edges | flat/edges/distance2/distance3 | Low Poly rendering mode |
| edgeStrength | float | 0.15 | 0-1 | Strength of edge or distance shading; inactive in flat mode |
| edgeColor | color | 0,0,0 | - | Color used by edges mode and explicit cell borders |
| borderWidth | float | 0 | 0-100 | Width of the Voronoi cell boundary drawn in edgeColor |
| lightIntensity | float | 0 | 0-100 | Brightens the selected mode's cell shading while preserving hue and border color; 0 = off |
| alpha | float | 1.0 | 0-1 | Blend with original input |
| speed | int | 0 | 0-5 | Animation speed (0=static) |

## Modes

- **flat**: Pure solid cell color, no edges
- **edges**: Solid cell color with darkened edges toward edge color
- **distance2**: 2nd-nearest Voronoi distance multiplied with cell color \u2014 shows cell edge structure
- **distance3**: 3rd-nearest Voronoi distance multiplied with cell color \u2014 shows ridge/intersection patterns

## Animation

Seed points drift in per-cell circular paths that loop seamlessly. Each cell has a unique phase and radius so the motion looks organic rather than uniform.

## Borders and lighting

\`borderWidth\` and \`lightIntensity\` are optional modifiers on the selected Low Poly
mode. They do not replace the mode or disable its controls.

\`borderWidth\` is scaled as a percentage of the nominal cell radius (\`0.5 / n\`). A
bounded 5x5 site search measures perpendicular distance to the true nearest Voronoi
bisector, producing consistent geometric border thickness across differently shaped
cells. Only a derivative-sized screen-space fringe is antialiased; the band has a
solid \`edgeColor\` core.

\`lightIntensity\` raises the selected mode's value with a bounded exposure curve and
scales RGB channels together to retain hue without clipping. The opaque \`edgeColor\`
border is composited after the light so it does not brighten.

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .lowPoly()
  .write(o0)

render(o0)
\`\`\`
`;if(n&&Object.keys(o).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(o))n.shaders[i]={...e}}n&&s&&(n.help=s);var c="filter/lowPoly",f="filter",u="lowPoly",p=n;export{p as default,c as effectId,u as effectName,s as help,f as namespace};
