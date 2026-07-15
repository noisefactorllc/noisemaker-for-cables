/* synth/sacredGeometry */
var t=class{constructor(n={}){this.state={},this.uniforms={},n.name&&(this.name=n.name),n.namespace&&(this.namespace=n.namespace),n.func&&(this.func=n.func),n.description&&(this.description=n.description),n.tags&&(this.tags=n.tags),n.globals&&(this.globals=n.globals),n.passes&&(this.passes=n.passes),n.textures&&(this.textures=n.textures),n.outputTex3d&&(this.outputTex3d=n.outputTex3d),n.outputGeo&&(this.outputGeo=n.outputGeo),n.uniformLayout&&(this.uniformLayout=n.uniformLayout),n.uniformLayouts&&(this.uniformLayouts=n.uniformLayouts),n.paramAliases&&(this.paramAliases=n.paramAliases),n.openCategories&&(this.openCategories=n.openCategories),n.defaultProgram&&(this.defaultProgram=n.defaultProgram),n.hidden&&(this.hidden=!0),n.deprecatedBy&&(this.deprecatedBy=n.deprecatedBy),n.onInit&&(this._configOnInit=n.onInit),n.onUpdate&&(this._configOnUpdate=n.onUpdate),n.onDestroy&&(this._configOnDestroy=n.onDestroy),n.asyncInit&&(this._configAsyncInit=n.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(n){return this._configOnUpdate?this._configOnUpdate.call(this,n):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(n){return this._configAsyncInit?this._configAsyncInit.call(this,n):Promise.resolve()}};var e=new t({name:"SacredGeometry",namespace:"synth",func:"sacredGeometry",tags:["geometric","pattern"],description:"Flower-of-life and related sacred-geometry lattices",globals:{geometry:{type:"int",default:0,uniform:"geometry",choices:{borromean:6,flower:0,fruit:1,metatron:3,seed:4,starPolygon:7,triquetra:8,vesica:5},ui:{label:"geometry",control:"dropdown"}},scale:{type:"float",default:10,min:1,max:20,uniform:"scale",ui:{label:"scale",control:"slider"}},rings:{type:"int",default:3,min:1,max:6,uniform:"rings",ui:{label:"rings",control:"slider",enabledBy:{param:"geometry",eq:0}}},starPoints:{type:"int",default:5,min:5,max:12,uniform:"starPoints",ui:{label:"points",control:"slider",enabledBy:{param:"geometry",eq:7}}},rotation:{type:"float",default:0,min:-180,max:180,uniform:"rotation",ui:{label:"rotation",control:"slider"}},thickness:{type:"float",default:.2,min:0,max:1,uniform:"thickness",ui:{label:"thickness",control:"slider"}},smoothness:{type:"float",default:.02,min:0,max:1,uniform:"smoothness",ui:{label:"smoothness",control:"slider"}},fgColor:{type:"color",default:[1,1,1],uniform:"fgColor",ui:{label:"fg color",control:"color",category:"color"}},bgColor:{type:"color",default:[0,0,0],uniform:"bgColor",ui:{label:"bg color",control:"color",category:"color"}},animation:{type:"int",default:0,uniform:"animation",choices:{none:0,pulse:2,ripple:4,rotate:1,unfold:5},ui:{label:"animation",control:"dropdown",category:"animation"}},speed:{type:"int",default:1,uniform:"speed",min:-5,max:5,zero:0,ui:{label:"speed",control:"slider",category:"animation",enabledBy:{param:"animation",neq:0}}},pulseDepth:{type:"float",default:.15,min:0,max:1,uniform:"pulseDepth",ui:{label:"depth",control:"slider",category:"animation",enabledBy:{param:"animation",in:[2,4]}}}},passes:[{name:"main",program:"sacredGeometry",inputs:{},outputs:{color:"outputTex"}}]});var r={sacredGeometry:{glsl:`#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform float aspect;
uniform float scale;
uniform float rotation;
uniform float thickness;
uniform float smoothness;
uniform int geometry;
uniform int rings;
uniform int starPoints;
uniform int animation;
uniform float speed;
uniform float pulseDepth;
uniform float time;
uniform vec3 fgColor;
uniform vec3 bgColor;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define SQRT3 1.7320508075688772

#define ANIM_ROTATE 1
#define ANIM_PULSE 2
#define ANIM_RIPPLE 4
#define ANIM_UNFOLD 5

#define GEOM_FLOWER 0
#define GEOM_FRUIT 1
#define GEOM_METATRON 3
#define GEOM_SEED 4
#define GEOM_VESICA 5
#define GEOM_BORROMEAN 6
#define GEOM_STARPOLYGON 7
#define GEOM_TRIQUETRA 8

vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float lineSegmentSDF(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float outlineEdge(float d, float w) {
    return smoothstep(w + smoothness, w - smoothness, abs(d));
}

// Ripple: per-circle radius modulation with phase offset. Phase shifts cycle
// outward (or inward with negative speed). Used inside circle-based geometries.
float ripplePulse(float phase) {
    return 1.0 + pulseDepth * sin(time * TAU * floor(speed) - phase);
}

// Unfold: per-element visibility with seamless half-period bump. Element with
// appearance offset \`t_e \u2208 [0, 1]\` peaks at time \`0.25 + t_e * 0.5\`. Loops cleanly.
float unfoldVis(float t_e) {
    return max(0.0, sin((time - t_e * 0.5) * TAU * floor(speed)));
}

// Flower / Seed of Life \u2014 overlapping circles on a hex grid out to \`ringsN\` shells.
float flowerMask(vec2 p, int ringsN, float figureScale) {
    float lineWidth = 0.04 + thickness * 0.12;
    float circleRadius = 1.0;
    p = p * figureScale;

    float m = 0.0;
    for (int q = -6; q <= 6; q++) {
        if (q < -ringsN || q > ringsN) continue;
        for (int r = -6; r <= 6; r++) {
            if (r < -ringsN || r > ringsN) continue;
            if (q + r < -ringsN || q + r > ringsN) continue;

            vec2 center = vec2(float(q) + float(r) * 0.5, float(r) * SQRT3 * 0.5);
            float hexDist = max(max(abs(float(q)), abs(float(r))), abs(float(q + r)));

            float circleR = circleRadius;
            if (animation == ANIM_RIPPLE) {
                circleR *= ripplePulse(hexDist * 1.4);
            }
            float d = length(p - center) - circleR;

            float vis = 1.0;
            if (animation == ANIM_UNFOLD) {
                float t_e = hexDist / max(float(ringsN), 1.0);
                vis = unfoldVis(t_e);
            }

            m = max(m, outlineEdge(d, lineWidth) * vis);
        }
    }
    return m;
}

// Fruit of Life \u2014 13 tangent circles (1 center + 6 inner + 6 outer).
// When drawLines is true, also draw all C(13,2) = 78 connecting line segments
// (Metatron's Cube).
float fruitMask(vec2 p, bool drawLines) {
    float lineWidth = 0.04 + thickness * 0.12;
    p = p * 0.5;

    vec2 centers[13];
    centers[0] = vec2(0.0, 0.0);
    for (int k = 0; k < 6; k++) {
        float angle = float(k) * PI / 3.0;
        centers[1 + k] = 2.0 * vec2(cos(angle), sin(angle));
    }
    for (int k = 0; k < 6; k++) {
        float angle = float(k) * PI / 3.0 + PI / 6.0;
        centers[7 + k] = 2.0 * SQRT3 * vec2(cos(angle), sin(angle));
    }

    float maxCircleDist = 2.0 * SQRT3;  // outer ring
    // For metatron, circles unfold in the first 60% of the cycle, lines in the rest.
    float circleUnfoldRange = drawLines ? 0.6 : 1.0;

    float m = 0.0;

    for (int i = 0; i < 13; i++) {
        float distFromOrigin = length(centers[i]);

        float circleR = 1.0;
        if (animation == ANIM_RIPPLE) {
            circleR *= ripplePulse(distFromOrigin * 0.8);
        }
        float d = length(p - centers[i]) - circleR;

        float vis = 1.0;
        if (animation == ANIM_UNFOLD) {
            float t_e = distFromOrigin / maxCircleDist * circleUnfoldRange;
            vis = unfoldVis(t_e);
        }

        m = max(m, outlineEdge(d, lineWidth) * vis);
    }

    if (drawLines) {
        // Lines come second in the unfold sequence (t_e starting at 0.6).
        float lineVis = 1.0;
        if (animation == ANIM_UNFOLD) {
            lineVis = unfoldVis(0.65);
        }
        for (int i = 0; i < 13; i++) {
            for (int j = 0; j < 13; j++) {
                if (j <= i) continue;
                float dL = lineSegmentSDF(p, centers[i], centers[j]);
                m = max(m, outlineEdge(dL, lineWidth * 0.5) * lineVis);
            }
        }
    }

    return m;
}

// Vesica Piscis \u2014 two overlapping circles with centers separated by 1 radius.
float vesicaMask(vec2 p) {
    float lineWidth = 0.04 + thickness * 0.12;
    p = p * 0.25;
    float r = 1.5;
    float sep = r * 0.5;

    float rA = r;
    float rB = r;
    if (animation == ANIM_RIPPLE) {
        rA *= ripplePulse(0.0);
        rB *= ripplePulse(PI);  // 180\xB0 out of phase
    }

    float visA = 1.0;
    float visB = 1.0;
    if (animation == ANIM_UNFOLD) {
        visA = unfoldVis(0.0);
        visB = unfoldVis(0.5);
    }

    float dA = length(p - vec2(-sep, 0.0)) - rA;
    float dB = length(p - vec2( sep, 0.0)) - rB;

    float m = 0.0;
    m = max(m, outlineEdge(dA, lineWidth) * visA);
    m = max(m, outlineEdge(dB, lineWidth) * visB);
    return m;
}

// Triquetra \u2014 three pairwise vesica intersection outlines.
float triquetraMask(vec2 p) {
    float lineWidth = 0.04 + thickness * 0.12;
    p = p * 0.30;
    float r = 2.25;
    float dist = r / SQRT3;

    vec2 C0 = dist * vec2(cos(PI * 0.5),                   sin(PI * 0.5));
    vec2 C1 = dist * vec2(cos(PI * 0.5 + TAU / 3.0),       sin(PI * 0.5 + TAU / 3.0));
    vec2 C2 = dist * vec2(cos(PI * 0.5 + 2.0 * TAU / 3.0), sin(PI * 0.5 + 2.0 * TAU / 3.0));

    float r0 = r;
    float r1 = r;
    float r2 = r;
    if (animation == ANIM_RIPPLE) {
        r0 *= ripplePulse(0.0);
        r1 *= ripplePulse(TAU / 3.0);
        r2 *= ripplePulse(2.0 * TAU / 3.0);
    }

    float d0 = length(p - C0) - r0;
    float d1 = length(p - C1) - r1;
    float d2 = length(p - C2) - r2;

    float v01 = 1.0;
    float v02 = 1.0;
    float v12 = 1.0;
    if (animation == ANIM_UNFOLD) {
        v01 = unfoldVis(0.0);
        v02 = unfoldVis(0.33);
        v12 = unfoldVis(0.66);
    }

    float m = 0.0;
    m = max(m, outlineEdge(max(d0, d1), lineWidth) * v01);
    m = max(m, outlineEdge(max(d0, d2), lineWidth) * v02);
    m = max(m, outlineEdge(max(d1, d2), lineWidth) * v12);
    return m;
}

// Borromean Rings \u2014 three full circles arranged at 120\xB0.
float borromeanMask(vec2 p) {
    float lineWidth = 0.04 + thickness * 0.12;
    p = p * 0.32;
    float r = 1.5;
    float dist = 1.4;

    float m = 0.0;
    for (int i = 0; i < 3; i++) {
        float angle = float(i) * TAU / 3.0 + PI * 0.5;
        vec2 c = dist * vec2(cos(angle), sin(angle));

        float circleR = r;
        if (animation == ANIM_RIPPLE) {
            circleR *= ripplePulse(float(i) * TAU / 3.0);
        }
        float d = length(p - c) - circleR;

        float vis = 1.0;
        if (animation == ANIM_UNFOLD) {
            vis = unfoldVis(float(i) / 3.0);
        }

        m = max(m, outlineEdge(d, lineWidth) * vis);
    }
    return m;
}

// Star Polygon {n/2} \u2014 n vertices, each connected to the vertex two positions away.
float starPolygonMask(vec2 p, int n) {
    float lineWidth = 0.04 + thickness * 0.12;
    p = p * 0.32;
    float radius = 2.8;

    if (animation == ANIM_RIPPLE) {
        radius *= ripplePulse(0.0);
    }

    float m = 0.0;
    for (int i = 0; i < 12; i++) {
        if (i >= n) break;
        int j = (i + 2) - ((i + 2) / n) * n;
        float angle1 = float(i) * TAU / float(n) + PI * 0.5;
        float angle2 = float(j) * TAU / float(n) + PI * 0.5;
        vec2 a = radius * vec2(cos(angle1), sin(angle1));
        vec2 b = radius * vec2(cos(angle2), sin(angle2));
        float dL = lineSegmentSDF(p, a, b);

        float vis = 1.0;
        if (animation == ANIM_UNFOLD) {
            vis = unfoldVis(float(i) / float(n));
        }

        m = max(m, outlineEdge(dL, lineWidth) * vis);
    }
    return m;
}

void main() {
    vec2 globalCoord = gl_FragCoord.xy + tileOffset;
    vec2 st = globalCoord / fullResolution;
    st = (st - 0.5) * 2.0;
    st.x *= aspect;

    float rad = rotation * PI / 180.0;
    st = rotate2D(st, rad);

    if (animation == ANIM_ROTATE) {
        st = rotate2D(st, time * TAU * floor(speed));
    }

    float scaleFactor = 21.0 - scale;
    if (animation == ANIM_PULSE) {
        scaleFactor *= 1.0 + pulseDepth * sin(time * TAU * floor(speed));
    }

    vec2 p = st * scaleFactor;

    float m = 0.0;
    if (geometry == GEOM_FLOWER) {
        m = flowerMask(p, rings, 0.45);
    } else if (geometry == GEOM_SEED) {
        m = flowerMask(p, 1, 0.23);
    } else if (geometry == GEOM_FRUIT) {
        m = fruitMask(p, false);
    } else if (geometry == GEOM_METATRON) {
        m = fruitMask(p, true);
    } else if (geometry == GEOM_VESICA) {
        m = vesicaMask(p);
    } else if (geometry == GEOM_BORROMEAN) {
        m = borromeanMask(p);
    } else if (geometry == GEOM_TRIQUETRA) {
        m = triquetraMask(p);
    } else if (geometry == GEOM_STARPOLYGON) {
        m = starPolygonMask(p, starPoints);
    }

    m = clamp(m, 0.0, 1.0);
    vec3 color = mix(bgColor, fgColor, m);
    fragColor = vec4(color, 1.0);
}
`,wgsl:`// WGSL version \u2013 WebGPU
struct Uniforms {
    resolution: vec2<f32>,
    aspect: f32,
    time: f32,
    scale: f32,
    rotation: f32,
    thickness: f32,
    smoothness: f32,
    speed: f32,
    pulseDepth: f32,
    geometry: i32,
    rings: i32,
    starPoints: i32,
    animation: i32,
    fgColor: vec3<f32>,
    bgColor: vec3<f32>,
    tileOffset: vec2<f32>,
    fullResolution: vec2<f32>,
    renderScale: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;
const SQRT3: f32 = 1.7320508075688772;

const ANIM_ROTATE: i32 = 1;
const ANIM_PULSE: i32 = 2;
const ANIM_RIPPLE: i32 = 4;
const ANIM_UNFOLD: i32 = 5;

const GEOM_FLOWER: i32 = 0;
const GEOM_FRUIT: i32 = 1;
const GEOM_METATRON: i32 = 3;
const GEOM_SEED: i32 = 4;
const GEOM_VESICA: i32 = 5;
const GEOM_BORROMEAN: i32 = 6;
const GEOM_STARPOLYGON: i32 = 7;
const GEOM_TRIQUETRA: i32 = 8;

fn rotate2D(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

fn lineSegmentSDF(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

fn outlineEdge(d: f32, w: f32) -> f32 {
    return smoothstep(w + u.smoothness, w - u.smoothness, abs(d));
}

fn ripplePulse(phase: f32) -> f32 {
    return 1.0 + u.pulseDepth * sin(u.time * TAU * floor(u.speed) - phase);
}

fn unfoldVis(t_e: f32) -> f32 {
    return max(0.0, sin((u.time - t_e * 0.5) * TAU * floor(u.speed)));
}

fn flowerMask(p_in: vec2<f32>, ringsN: i32, figureScale: f32) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let circleRadius = 1.0;
    let p = p_in * figureScale;

    var m: f32 = 0.0;
    for (var q: i32 = -6; q <= 6; q = q + 1) {
        if (q < -ringsN || q > ringsN) { continue; }
        for (var r: i32 = -6; r <= 6; r = r + 1) {
            if (r < -ringsN || r > ringsN) { continue; }
            if (q + r < -ringsN || q + r > ringsN) { continue; }

            let center = vec2<f32>(f32(q) + f32(r) * 0.5, f32(r) * SQRT3 * 0.5);
            let hexDist = max(max(abs(f32(q)), abs(f32(r))), abs(f32(q + r)));

            var circleR = circleRadius;
            if (u.animation == ANIM_RIPPLE) {
                circleR = circleR * ripplePulse(hexDist * 1.4);
            }
            let d = length(p - center) - circleR;

            var vis: f32 = 1.0;
            if (u.animation == ANIM_UNFOLD) {
                let t_e = hexDist / max(f32(ringsN), 1.0);
                vis = unfoldVis(t_e);
            }

            m = max(m, outlineEdge(d, lineWidth) * vis);
        }
    }
    return m;
}

fn fruitMask(p_in: vec2<f32>, drawLines: bool) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let p = p_in * 0.5;

    var centers: array<vec2<f32>, 13>;
    centers[0] = vec2<f32>(0.0, 0.0);
    for (var k: i32 = 0; k < 6; k = k + 1) {
        let angle = f32(k) * PI / 3.0;
        centers[1 + k] = 2.0 * vec2<f32>(cos(angle), sin(angle));
    }
    for (var k: i32 = 0; k < 6; k = k + 1) {
        let angle = f32(k) * PI / 3.0 + PI / 6.0;
        centers[7 + k] = 2.0 * SQRT3 * vec2<f32>(cos(angle), sin(angle));
    }

    let maxCircleDist = 2.0 * SQRT3;
    var circleUnfoldRange: f32 = 1.0;
    if (drawLines) {
        circleUnfoldRange = 0.6;
    }

    var m: f32 = 0.0;

    for (var i: i32 = 0; i < 13; i = i + 1) {
        let distFromOrigin = length(centers[i]);

        var circleR: f32 = 1.0;
        if (u.animation == ANIM_RIPPLE) {
            circleR = circleR * ripplePulse(distFromOrigin * 0.8);
        }
        let d = length(p - centers[i]) - circleR;

        var vis: f32 = 1.0;
        if (u.animation == ANIM_UNFOLD) {
            let t_e = distFromOrigin / maxCircleDist * circleUnfoldRange;
            vis = unfoldVis(t_e);
        }

        m = max(m, outlineEdge(d, lineWidth) * vis);
    }

    if (drawLines) {
        var lineVis: f32 = 1.0;
        if (u.animation == ANIM_UNFOLD) {
            lineVis = unfoldVis(0.65);
        }
        for (var i: i32 = 0; i < 13; i = i + 1) {
            for (var j: i32 = 0; j < 13; j = j + 1) {
                if (j <= i) { continue; }
                let dL = lineSegmentSDF(p, centers[i], centers[j]);
                m = max(m, outlineEdge(dL, lineWidth * 0.5) * lineVis);
            }
        }
    }

    return m;
}

fn vesicaMask(p_in: vec2<f32>) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let p = p_in * 0.25;
    let r = 1.5;
    let sep = r * 0.5;

    var rA: f32 = r;
    var rB: f32 = r;
    if (u.animation == ANIM_RIPPLE) {
        rA = rA * ripplePulse(0.0);
        rB = rB * ripplePulse(PI);
    }

    var visA: f32 = 1.0;
    var visB: f32 = 1.0;
    if (u.animation == ANIM_UNFOLD) {
        visA = unfoldVis(0.0);
        visB = unfoldVis(0.5);
    }

    let dA = length(p - vec2<f32>(-sep, 0.0)) - rA;
    let dB = length(p - vec2<f32>( sep, 0.0)) - rB;

    var m: f32 = 0.0;
    m = max(m, outlineEdge(dA, lineWidth) * visA);
    m = max(m, outlineEdge(dB, lineWidth) * visB);
    return m;
}

fn triquetraMask(p_in: vec2<f32>) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let p = p_in * 0.30;
    let r = 2.25;
    let dist = r / SQRT3;

    let C0 = dist * vec2<f32>(cos(PI * 0.5),                       sin(PI * 0.5));
    let C1 = dist * vec2<f32>(cos(PI * 0.5 + TAU / 3.0),           sin(PI * 0.5 + TAU / 3.0));
    let C2 = dist * vec2<f32>(cos(PI * 0.5 + 2.0 * TAU / 3.0),     sin(PI * 0.5 + 2.0 * TAU / 3.0));

    var r0: f32 = r;
    var r1: f32 = r;
    var r2: f32 = r;
    if (u.animation == ANIM_RIPPLE) {
        r0 = r0 * ripplePulse(0.0);
        r1 = r1 * ripplePulse(TAU / 3.0);
        r2 = r2 * ripplePulse(2.0 * TAU / 3.0);
    }

    let d0 = length(p - C0) - r0;
    let d1 = length(p - C1) - r1;
    let d2 = length(p - C2) - r2;

    var v01: f32 = 1.0;
    var v02: f32 = 1.0;
    var v12: f32 = 1.0;
    if (u.animation == ANIM_UNFOLD) {
        v01 = unfoldVis(0.0);
        v02 = unfoldVis(0.33);
        v12 = unfoldVis(0.66);
    }

    var m: f32 = 0.0;
    m = max(m, outlineEdge(max(d0, d1), lineWidth) * v01);
    m = max(m, outlineEdge(max(d0, d2), lineWidth) * v02);
    m = max(m, outlineEdge(max(d1, d2), lineWidth) * v12);
    return m;
}

fn borromeanMask(p_in: vec2<f32>) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let p = p_in * 0.32;
    let r = 1.5;
    let dist = 1.4;

    var m: f32 = 0.0;
    for (var i: i32 = 0; i < 3; i = i + 1) {
        let angle = f32(i) * TAU / 3.0 + PI * 0.5;
        let c = dist * vec2<f32>(cos(angle), sin(angle));

        var circleR = r;
        if (u.animation == ANIM_RIPPLE) {
            circleR = circleR * ripplePulse(f32(i) * TAU / 3.0);
        }
        let d = length(p - c) - circleR;

        var vis: f32 = 1.0;
        if (u.animation == ANIM_UNFOLD) {
            vis = unfoldVis(f32(i) / 3.0);
        }

        m = max(m, outlineEdge(d, lineWidth) * vis);
    }
    return m;
}

fn starPolygonMask(p_in: vec2<f32>, n: i32) -> f32 {
    let lineWidth = 0.04 + u.thickness * 0.12;
    let p = p_in * 0.32;
    var radius = 2.8;

    if (u.animation == ANIM_RIPPLE) {
        radius = radius * ripplePulse(0.0);
    }

    var m: f32 = 0.0;
    for (var i: i32 = 0; i < 12; i = i + 1) {
        if (i >= n) { break; }
        let j = (i + 2) - ((i + 2) / n) * n;
        let angle1 = f32(i) * TAU / f32(n) + PI * 0.5;
        let angle2 = f32(j) * TAU / f32(n) + PI * 0.5;
        let a = radius * vec2<f32>(cos(angle1), sin(angle1));
        let b = radius * vec2<f32>(cos(angle2), sin(angle2));
        let dL = lineSegmentSDF(p, a, b);

        var vis: f32 = 1.0;
        if (u.animation == ANIM_UNFOLD) {
            vis = unfoldVis(f32(i) / f32(n));
        }

        m = max(m, outlineEdge(dL, lineWidth) * vis);
    }
    return m;
}

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    var st = (position.xy + u.tileOffset) / u.fullResolution;
    st = (st - vec2<f32>(0.5, 0.5)) * 2.0;
    st.x = st.x * u.aspect;

    let rad = u.rotation * PI / 180.0;
    st = rotate2D(st, rad);

    if (u.animation == ANIM_ROTATE) {
        st = rotate2D(st, u.time * TAU * floor(u.speed));
    }

    var scaleFactor = 21.0 - u.scale;
    if (u.animation == ANIM_PULSE) {
        scaleFactor = scaleFactor * (1.0 + u.pulseDepth * sin(u.time * TAU * floor(u.speed)));
    }

    let p = st * scaleFactor;

    var m: f32 = 0.0;
    if (u.geometry == GEOM_FLOWER) {
        m = flowerMask(p, u.rings, 0.45);
    } else if (u.geometry == GEOM_SEED) {
        m = flowerMask(p, 1, 0.23);
    } else if (u.geometry == GEOM_FRUIT) {
        m = fruitMask(p, false);
    } else if (u.geometry == GEOM_METATRON) {
        m = fruitMask(p, true);
    } else if (u.geometry == GEOM_VESICA) {
        m = vesicaMask(p);
    } else if (u.geometry == GEOM_BORROMEAN) {
        m = borromeanMask(p);
    } else if (u.geometry == GEOM_TRIQUETRA) {
        m = triquetraMask(p);
    } else if (u.geometry == GEOM_STARPOLYGON) {
        m = starPolygonMask(p, u.starPoints);
    }

    m = clamp(m, 0.0, 1.0);
    let color = mix(u.bgColor, u.fgColor, m);
    return vec4<f32>(color, 1.0);
}
`}},o=`# sacredGeometry

Flower-of-life and related sacred-geometry figures

## Description

Generates classic sacred-geometry figures: Flower of Life, Seed of Life, Fruit of Life, Metatron's Cube, Vesica Piscis, Triquetra, Borromean Rings, and parametric star polygons. Pick the figure via the \`geometry\` dropdown. Supports rotation and pulse animation, both of which loop seamlessly.

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| scale | float | 10 | 1-20 | Inverse-scale (lower = larger figure) |
| rotation | float | 0 | -180-180 | Static rotation in degrees |
| thickness | float | 0.2 | 0-1 | Line weight |
| smoothness | float | 0.02 | 0-1 | Edge softness |
| geometry | int | flower | borromean/flower/fruit/metatron/seed/starPolygon/triquetra/vesica | Figure family |
| rings | int | 3 | 1-6 | Hex shells from center (Flower only) |
| starPoints | int | 5 | 5-12 | Number of star points (Star Polygon only) |
| animation | int | none | none/pulse/ripple/rotate/unfold | Animation mode |
| speed | int | 1 | -5-5 | Animation speed and direction |
| pulseDepth | float | 0.15 | 0-1 | Amplitude for pulse and ripple |
| fgColor | color | 1,1,1 | - | Foreground color |
| bgColor | color | 0,0,0 | - | Background color |

## Geometries

- **flower (0)**: classic Flower of Life \u2014 overlapping circles on a hex grid out to \`rings\` shells. Each circle passes through its six neighbors' centers.
- **fruit (1)**: Fruit of Life \u2014 13 tangent (non-overlapping) circles in a specific arrangement: one center + 6 inner + 6 outer.
- **metatron (3)**: Metatron's Cube \u2014 the 13 Fruit-of-Life circles plus all 78 line segments connecting every pair of centers. The five Platonic solids appear as projections within it.
- **seed (4)**: Seed of Life \u2014 7 overlapping circles (one center + 6 in a hex ring), the inner kernel of the Flower of Life.
- **vesica (5)**: Vesica Piscis \u2014 two overlapping circles whose centers are separated by one radius.
- **borromean (6)**: Borromean Rings \u2014 three interlocked circles arranged in a triangle. In a 3D depiction, removing any one releases the other two; in 2D it reads as three overlapping rings.
- **starPolygon (7)**: parametric \`{n/2}\` star polygon. \`starPoints=5\` gives a pentagram, \`7\` a heptagram, \`8\` a Star of Lakshmi, etc. Even point counts with gcd(n, 2) = 2 produce two interlocking polygons.
- **triquetra (8)**: the classic Celtic trinity knot \u2014 three interlocking vesica piscises arranged at 120\xB0. Each pair of circles contributes the boundary of their lens-shaped intersection (two arcs meeting at two cusps), giving six arcs and six cusps overall.

## Animation

All modes loop seamlessly. Speed is integer-snapped so the loop is exact at any value.

- **rotate**: whole figure spins around its center.
- **pulse**: effective scale modulated by \`sin(time)\`. \`pulseDepth\` controls amplitude.
- **ripple**: per-circle radius pulsation with phase offset based on each circle's distance from origin \u2014 pulses travel outward through the figure. For circle-based geometries (flower, seed, fruit, metatron, vesica, borromean, triquetra). On starPolygon, the polygon's radius pulsates as a whole.
- **unfold**: elements appear sequentially over the cycle, from center outward. On metatron, the 13 circles unfold in the first 60% of the cycle, then the 78 lines draw on. On starPolygon, lines fade in sequentially around the ring.

## Usage

\`\`\`
search synth

sacredGeometry()
  .write(o0)

render(o0)
\`\`\`

### Examples

\`\`\`
// Classic Flower of Life
sacredGeometry({ geometry: 0, rings: 3 })
  .write(o0)

// Metatron's Cube
sacredGeometry({ geometry: 3, fgColor: [1, 0.8, 0.4] })
  .write(o0)

// Hexagram via star polygon (n=6)
sacredGeometry({ geometry: 7, starPoints: 6, animation: 1, speed: 1 })
  .write(o0)

// Seed of Life, breathing
sacredGeometry({ geometry: 4, animation: 2, speed: 1, pulseDepth: 0.3 })
  .write(o0)

// Pentagram
sacredGeometry({ geometry: 7, starPoints: 5 })
  .write(o0)

// 9-pointed enneagram
sacredGeometry({ geometry: 7, starPoints: 9 })
  .write(o0)

// Triquetra in warm tones
sacredGeometry({ geometry: 8, fgColor: [1, 0.7, 0.3], thickness: 0.3 })
  .write(o0)

// Flower of life rippling outward
sacredGeometry({ geometry: 0, rings: 4, animation: 4, speed: 1, pulseDepth: 0.3 })
  .write(o0)

// Metatron unfolding from center
sacredGeometry({ geometry: 3, animation: 5, speed: 1 })
  .write(o0)

// Heptagram with slow rotation
sacredGeometry({ geometry: 7, starPoints: 7, animation: 1, speed: 1 })
  .write(o0)
\`\`\`

## Usage

\`\`\`
search synth

sacredGeometry()
  .write(o0)

render(o0)
\`\`\`
`;if(e&&Object.keys(r).length>0){e.shaders||(e.shaders={});for(let[i,n]of Object.entries(r))e.shaders[i]={...n}}e&&o&&(e.help=o);var c="synth/sacredGeometry",m="synth",u="sacredGeometry",d=e;export{d as default,c as effectId,u as effectName,o as help,m as namespace};
