/* render/renderLandscape3d */
var t=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var n=new t({name:"Render Landscape 3D",namespace:"render",func:"renderLandscape3d",tags:["3d"],description:"Isometric and perspective voxel renderer with face lighting",textures:{screenGeoBuffer:{width:"screen",height:"screen",format:"rgba16f"}},globals:{volumeSize:{type:"int",default:64,uniform:"volumeSize",ui:{label:"volume size",control:!1}},threshold:{type:"float",default:.5,min:0,max:1,uniform:"threshold",ui:{label:"density threshold",control:!1}},densitySource:{type:"int",default:0,choices:{geometry:0},ui:{label:"density source",control:!1}},zoom:{type:"float",default:1,min:.25,max:4,uniform:"zoom",ui:{label:"zoom",control:"slider"}},panX:{type:"float",default:0,min:-1,max:1,uniform:"panX",ui:{label:"pan x",control:"slider"}},panY:{type:"float",default:0,min:-1,max:1,uniform:"panY",ui:{label:"pan y",control:"slider"}},lightDirection:{type:"vec3",default:[-.4,.85,.6],uniform:"lightDirection",min:-1,max:1,ui:{label:"light direction",control:"vector3"}},ambient:{type:"float",default:.35,min:0,max:1,uniform:"ambient",ui:{label:"ambient light",control:"slider"}},diffuseIntensity:{type:"float",default:.85,min:0,max:2,uniform:"diffuseIntensity",ui:{label:"diffuse light",control:"slider"}},specularIntensity:{type:"float",default:.12,min:0,max:1,uniform:"specularIntensity",ui:{label:"specular light",control:"slider"}},bgColor:{type:"color",default:[.025,.045,.075],uniform:"bgColor",ui:{label:"background color",control:"color"}},bgAlpha:{type:"float",default:1,min:0,max:1,uniform:"bgAlpha",ui:{label:"background opacity",control:"slider"}},viewMode:{type:"int",default:1,define:"VIEW_MODE",choices:{ortho:1,perspective:2},ui:{label:"view",control:"dropdown",category:"view"}},rotateX:{type:"float",default:.3,min:0,max:6.283185,step:.01,uniform:"rotateX",ui:{label:"rotate x",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},rotateY:{type:"float",default:0,min:0,max:6.283185,step:.01,uniform:"rotateY",ui:{label:"rotate y",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},rotateZ:{type:"float",default:0,min:0,max:6.283185,step:.01,uniform:"rotateZ",ui:{label:"rotate z",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},viewScale:{type:"float",default:.8,min:.1,max:10,step:.01,uniform:"viewScale",ui:{label:"zoom",control:!1}},posX:{type:"float",default:0,min:-50,max:50,step:.1,uniform:"posX",ui:{label:"pos x",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},posY:{type:"float",default:0,min:-50,max:50,step:.1,uniform:"posY",ui:{label:"pos y",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},posZ:{type:"float",default:0,min:-200,max:200,step:.1,uniform:"posZ",ui:{label:"pos z",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}},fieldOfView:{type:"float",default:60,min:10,max:150,step:1,uniform:"fieldOfView",ui:{label:"field of view",control:"slider",category:"view",enabledBy:{param:"viewMode",eq:2}}}},passes:[{name:"render",program:"landscape",type:"compute",drawBuffers:2,inputs:{volumeCache:"inputTex3d",analyticalGeo:"inputGeo"},outputs:{color:"outputTex",geoOut:"screenGeoBuffer"}}],outputTex3d:"inputTex3d",outputGeo:"screenGeoBuffer",defaultProgram:`search synth, synth3d, render

heightmap3d(heightTex: noise(scaleX: 90, scaleY: 90, colorMode: mono, speed: 0), tex: gradient(type: fourCorners, color1: #006e94, color2: #24e4ff, color3: #bcff46, color4: #efffff)).renderLandscape3d(panY: -0.18).write(o0)
render(o0)`});var a={landscape:{glsl:`#version 300 es
precision highp float;
precision highp int;

uniform sampler2D volumeCache;
uniform sampler2D analyticalGeo;
uniform vec2 resolution;
uniform vec2 tileOffset;
uniform vec2 fullResolution;
uniform int volumeSize;
uniform float threshold;
uniform float zoom;
uniform float panX;
uniform float panY;
uniform vec3 lightDirection;
uniform float ambient;
uniform float diffuseIntensity;
uniform float specularIntensity;
uniform vec3 bgColor;
uniform float bgAlpha;
#ifndef VIEW_MODE
#define VIEW_MODE 1
#endif
uniform float rotateX;
uniform float rotateY;
uniform float rotateZ;
uniform float viewScale;
uniform float posX;
uniform float posY;
uniform float posZ;
uniform float fieldOfView;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 geoOut;

vec3 lighting(vec3 color, vec3 normal, vec3 viewDirection) {
    vec3 light = vec3(0.0, 1.0, 0.0);
    if (dot(lightDirection, lightDirection) > 0.000001) light = normalize(lightDirection);
    vec3 halfVector = light + viewDirection;
    float specular = 0.0;
    if (dot(halfVector, halfVector) > 0.000001) {
        specular = pow(max(dot(normal, normalize(halfVector)), 0.0), 32.0) * specularIntensity;
    }
    return color * (ambient + max(dot(normal, light), 0.0) * diffuseIntensity) + specular;
}

#if VIEW_MODE == 2
// Inverse of the billboard renderer's X -> Y -> Z rotation.
vec3 inverseRotation(vec3 p) {
    vec3 c = cos(vec3(rotateX, rotateY, rotateZ));
    vec3 s = sin(vec3(rotateX, rotateY, rotateZ));
    p = vec3(p.x * c.z + p.y * s.z, -p.x * s.z + p.y * c.z, p.z);
    p = vec3(p.x * c.y - p.z * s.y, p.y, p.x * s.y + p.z * c.y);
    return vec3(p.x, p.y * c.x + p.z * s.x, -p.y * s.x + p.z * c.x);
}

vec3 forwardRotation(vec3 p) {
    vec3 c = cos(vec3(rotateX, rotateY, rotateZ));
    vec3 s = sin(vec3(rotateX, rotateY, rotateZ));
    p = vec3(p.x, p.y * c.x - p.z * s.x, p.y * s.x + p.z * c.x);
    p = vec3(p.x * c.y + p.z * s.y, p.y, -p.x * s.y + p.z * c.y);
    return vec3(p.x * c.z - p.y * s.z, p.x * s.z + p.y * c.z, p.z);
}

void renderPerspective(vec2 uv) {
    float size = float(volumeSize);
    float focalLength = 1.0 / tan(clamp(fieldOfView, 10.0, 150.0) * 0.00872664626);
    // The native volume spans [-40,40] in billboard world units. Position
    // follows rotation; the camera looks down -Z from (0,0,80).
    vec3 origin = (inverseRotation(vec3(-posX, -posY, 80.0 - posZ)) / 80.0 + 0.5) * size;
    vec2 framedUv = (uv + vec2(panX, panY)) / max(zoom, 0.001);
    vec3 cameraRay = vec3(framedUv * 2.0 / (focalLength * max(viewScale, 0.001)), -1.0);
    vec3 direction = inverseRotation(cameraRay) * (size / 80.0);
    vec3 nearT = vec3(-1e30);
    vec3 farT = vec3(1e30);
    vec3 delta = vec3(1e30);
    ivec3 stepDir = ivec3(0);
    for (int axis = 0; axis < 3; axis++) {
        if (abs(direction[axis]) < 1e-8) {
            if (origin[axis] < 0.0 || origin[axis] >= size) return;
        } else {
            float a = -origin[axis] / direction[axis];
            float b = (size - origin[axis]) / direction[axis];
            nearT[axis] = min(a, b);
            farT[axis] = max(a, b);
            delta[axis] = 1.0 / abs(direction[axis]);
            stepDir[axis] = direction[axis] > 0.0 ? 1 : -1;
        }
    }
    float enter = max(max(nearT.x, nearT.y), nearT.z);
    float leave = min(min(farT.x, farT.y), farT.z);
    // The ray parameter is camera depth in world units, matching billboard clipping.
    float distance = max(enter, 0.1);
    if (distance >= leave) return;
    ivec3 cell = clamp(ivec3(floor(origin + direction * distance + vec3(stepDir) * 0.0001)), ivec3(0), ivec3(volumeSize - 1));
    vec3 nextT = vec3(1e30);
    for (int axis = 0; axis < 3; axis++) {
        if (stepDir[axis] != 0) {
            float boundary = float(cell[axis]) + (stepDir[axis] > 0 ? 1.0 : 0.0);
            nextT[axis] = (boundary - origin[axis]) / direction[axis];
        }
    }
    vec3 viewDirection = normalize(-cameraRay);
    vec3 normal = normalize(-direction);
    if (enter >= 0.1) {
        normal = vec3(0.0);
        if (nearT.y >= nearT.x && nearT.y >= nearT.z) normal.y = -float(stepDir.y);
        else if (nearT.x >= nearT.z) normal.x = -float(stepDir.x);
        else normal.z = -float(stepDir.z);
    }
    for (int step = 0; step < volumeSize * 3; step++) {
        if (any(lessThan(cell, ivec3(0))) || any(greaterThanEqual(cell, ivec3(volumeSize))) || distance >= leave) break;
        ivec2 atlas = ivec2(cell.x, cell.y + cell.z * volumeSize);
        float density = texelFetch(analyticalGeo, atlas, 0).a;
        if (density > 0.0 && density >= threshold) {
            vec3 worldNormal = forwardRotation(normal);
            fragColor = vec4(lighting(texelFetch(volumeCache, atlas, 0).rgb, worldNormal, viewDirection), 1.0);
            geoOut = vec4(worldNormal * 0.5 + 0.5, clamp(distance / 320.0, 0.0, 1.0));
            return;
        }
        distance = min(min(nextT.x, nextT.y), nextT.z);
        bvec3 crossed = lessThanEqual(nextT, vec3(distance));
        normal = vec3(0.0);
        if (crossed.y) normal.y = -float(stepDir.y);
        else if (crossed.x) normal.x = -float(stepDir.x);
        else normal.z = -float(stepDir.z);
        cell += ivec3(crossed) * stepDir;
        nextT += vec3(crossed) * delta;
    }
}

#endif

void main() {
    fragColor = vec4(bgColor * bgAlpha, bgAlpha);
    geoOut = vec4(0.5, 0.5, 1.0, 1.0);
    vec2 fullRes = fullResolution.x > 0.0 ? fullResolution : resolution;
    vec2 uv = (gl_FragCoord.xy + tileOffset - fullRes * 0.5) / fullRes.y;
#if VIEW_MODE == 2
    renderPerspective(uv);
#else
    float size = float(volumeSize);
    float aspect = fullRes.x / fullRes.y;
    // Fit the projected cube in either viewport orientation, with a small margin.
    float span = max(1.6329931619, 1.4142135624 / aspect) * size * 1.08 / max(zoom, 0.001);
    vec3 right = vec3(0.7071067812, 0.0, -0.7071067812);
    vec3 up = vec3(-0.4082482905, 0.8164965809, -0.4082482905);
    vec3 origin = vec3(size * 2.5) + right * (uv.x + panX) * span + up * (uv.y + panY) * span;

    // The fixed isometric ray is (-1,-1,-1). Keeping it unnormalized gives unit DDA steps.
    vec3 nearT = origin - size;
    float enter = max(max(nearT.x, nearT.y), nearT.z);
    float leave = min(min(origin.x, origin.y), origin.z);
    if (enter >= leave) return;
    float distance = max(enter, 0.0);
    ivec3 cell = clamp(ivec3(floor(origin - (distance + 0.0001))), ivec3(0), ivec3(volumeSize - 1));
    vec3 nextT = origin - vec3(cell);
    vec3 normal = vec3(0.0, 0.0, 1.0);
    if (nearT.y >= nearT.x && nearT.y >= nearT.z) normal = vec3(0.0, 1.0, 0.0);
    else if (nearT.x >= nearT.z) normal = vec3(1.0, 0.0, 0.0);

    // A ray crosses at most 3*N cells, including tied boundaries.
    for (int step = 0; step < volumeSize * 3; step++) {
        if (any(lessThan(cell, ivec3(0))) || distance >= leave) break;
        ivec2 atlas = ivec2(cell.x, cell.y + cell.z * volumeSize);
        float density = texelFetch(analyticalGeo, atlas, 0).a;
        if (density > 0.0 && density >= threshold) {
            vec3 color = texelFetch(volumeCache, atlas, 0).rgb;
            fragColor = vec4(lighting(color, normal, vec3(0.5773502692)), 1.0);
            geoOut = vec4(normal * 0.5 + 0.5, clamp(distance / (size * 4.0), 0.0, 1.0));
            return;
        }
        distance = min(min(nextT.x, nextT.y), nextT.z);
        // Advance every tied axis so edge-only contacts cannot create stray voxels.
        bvec3 crossed = lessThanEqual(nextT, vec3(distance));
        if (crossed.y) normal = vec3(0.0, 1.0, 0.0);
        else if (crossed.x) normal = vec3(1.0, 0.0, 0.0);
        else normal = vec3(0.0, 0.0, 1.0);
        cell -= ivec3(crossed);
        nextT += vec3(crossed);
    }
#endif
}
`,wgsl:`struct Uniforms {
    resolution: vec2f,
    tileOffset: vec2f,
    fullResolution: vec2f,
    volumeSize: i32,
    threshold: f32,
    zoom: f32,
    panX: f32,
    panY: f32,
    ambient: f32,
    lightDirection: vec3f,
    diffuseIntensity: f32,
    bgColor: vec3f,
    specularIntensity: f32,
    bgAlpha: f32,
    rotateX: f32,
    rotateY: f32,
    rotateZ: f32,
    viewScale: f32,
    posX: f32,
    posY: f32,
    posZ: f32,
    fieldOfView: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var volumeCache: texture_2d<f32>;
@group(0) @binding(2) var analyticalGeo: texture_2d<f32>;

struct FragmentOutput {
    @location(0) fragColor: vec4f,
    @location(1) geoOut: vec4f,
}

fn lighting(color: vec3f, normal: vec3f, viewDirection: vec3f) -> vec3f {
    var light = vec3f(0.0, 1.0, 0.0);
    if (dot(u.lightDirection, u.lightDirection) > 0.000001) { light = normalize(u.lightDirection); }
    let halfVector = light + viewDirection;
    var specular = 0.0;
    if (dot(halfVector, halfVector) > 0.000001) {
        specular = pow(max(dot(normal, normalize(halfVector)), 0.0), 32.0) * u.specularIntensity;
    }
    return color * (u.ambient + max(dot(normal, light), 0.0) * u.diffuseIntensity) + specular;
}

// Inverse of the billboard renderer's X -> Y -> Z rotation.
fn inverseRotation(input: vec3f) -> vec3f {
    let c = cos(vec3f(u.rotateX, u.rotateY, u.rotateZ));
    let s = sin(vec3f(u.rotateX, u.rotateY, u.rotateZ));
    var p = vec3f(input.x * c.z + input.y * s.z, -input.x * s.z + input.y * c.z, input.z);
    p = vec3f(p.x * c.y - p.z * s.y, p.y, p.x * s.y + p.z * c.y);
    return vec3f(p.x, p.y * c.x + p.z * s.x, -p.y * s.x + p.z * c.x);
}

fn forwardRotation(input: vec3f) -> vec3f {
    let c = cos(vec3f(u.rotateX, u.rotateY, u.rotateZ));
    let s = sin(vec3f(u.rotateX, u.rotateY, u.rotateZ));
    var p = vec3f(input.x, input.y * c.x - input.z * s.x, input.y * s.x + input.z * c.x);
    p = vec3f(p.x * c.y + p.z * s.y, p.y, -p.x * s.y + p.z * c.y);
    return vec3f(p.x * c.z - p.y * s.z, p.x * s.z + p.y * c.z, p.z);
}

fn renderPerspective(uv: vec2f) -> FragmentOutput {
    var out: FragmentOutput;
    out.fragColor = vec4f(u.bgColor * u.bgAlpha, u.bgAlpha);
    out.geoOut = vec4f(0.5, 0.5, 1.0, 1.0);
    let size = f32(u.volumeSize);
    let focalLength = 1.0 / tan(clamp(u.fieldOfView, 10.0, 150.0) * 0.00872664626);
    // The volume spans [-40,40]. Position follows rotation; camera Z is 80.
    let origin = (inverseRotation(vec3f(-u.posX, -u.posY, 80.0 - u.posZ)) / 80.0 + 0.5) * size;
    let framedUv = (uv + vec2f(u.panX, u.panY)) / max(u.zoom, 0.001);
    let cameraRay = vec3f(framedUv * 2.0 / (focalLength * max(u.viewScale, 0.001)), -1.0);
    let direction = inverseRotation(cameraRay) * (size / 80.0);
    var nearT = vec3f(-1e30);
    var farT = vec3f(1e30);
    var delta = vec3f(1e30);
    var stepDir = vec3i(0);
    for (var axis = 0; axis < 3; axis++) {
        if (abs(direction[axis]) < 1e-8) {
            if (origin[axis] < 0.0 || origin[axis] >= size) { return out; }
        } else {
            let a = -origin[axis] / direction[axis];
            let b = (size - origin[axis]) / direction[axis];
            nearT[axis] = min(a, b);
            farT[axis] = max(a, b);
            delta[axis] = 1.0 / abs(direction[axis]);
            stepDir[axis] = select(-1, 1, direction[axis] > 0.0);
        }
    }
    let enter = max(max(nearT.x, nearT.y), nearT.z);
    let leave = min(min(farT.x, farT.y), farT.z);
    var distance = max(enter, 0.1);
    if (distance >= leave) { return out; }
    var cell = clamp(vec3i(floor(origin + direction * distance + vec3f(stepDir) * 0.0001)), vec3i(0), vec3i(u.volumeSize - 1));
    var nextT = vec3f(1e30);
    for (var axis = 0; axis < 3; axis++) {
        if (stepDir[axis] != 0) {
            let boundary = f32(cell[axis]) + select(0.0, 1.0, stepDir[axis] > 0);
            nextT[axis] = (boundary - origin[axis]) / direction[axis];
        }
    }
    let viewDirection = normalize(-cameraRay);
    var normal = normalize(-direction);
    if (enter >= 0.1) {
        normal = vec3f(0.0);
        if (nearT.y >= nearT.x && nearT.y >= nearT.z) { normal.y = -f32(stepDir.y); }
        else if (nearT.x >= nearT.z) { normal.x = -f32(stepDir.x); }
        else { normal.z = -f32(stepDir.z); }
    }
    for (var step = 0; step < u.volumeSize * 3; step++) {
        if (any(cell < vec3i(0)) || any(cell >= vec3i(u.volumeSize)) || distance >= leave) { break; }
        let atlas = vec2i(cell.x, cell.y + cell.z * u.volumeSize);
        let density = textureLoad(analyticalGeo, atlas, 0).a;
        if (density > 0.0 && density >= u.threshold) {
            let worldNormal = forwardRotation(normal);
            out.fragColor = vec4f(lighting(textureLoad(volumeCache, atlas, 0).rgb, worldNormal, viewDirection), 1.0);
            out.geoOut = vec4f(worldNormal * 0.5 + 0.5, clamp(distance / 320.0, 0.0, 1.0));
            return out;
        }
        distance = min(min(nextT.x, nextT.y), nextT.z);
        let crossed = nextT <= vec3f(distance);
        normal = vec3f(0.0);
        if (crossed.y) { normal.y = -f32(stepDir.y); }
        else if (crossed.x) { normal.x = -f32(stepDir.x); }
        else { normal.z = -f32(stepDir.z); }
        cell += select(vec3i(0), vec3i(1), crossed) * stepDir;
        nextT += select(vec3f(0.0), vec3f(1.0), crossed) * delta;
    }
    return out;
}

@fragment
fn main(@builtin(position) position: vec4f) -> FragmentOutput {
    var out: FragmentOutput;
    out.fragColor = vec4f(u.bgColor * u.bgAlpha, u.bgAlpha);
    out.geoOut = vec4f(0.5, 0.5, 1.0, 1.0);
    let fullRes = select(u.resolution, u.fullResolution, u.fullResolution.x > 0.0);
    let uv = (position.xy + u.tileOffset - fullRes * 0.5) / fullRes.y;
    // VIEW_MODE is a module constant; the compiler removes the inactive path.
    if (VIEW_MODE == 2) { return renderPerspective(uv); }
    let size = f32(u.volumeSize);
    let aspect = fullRes.x / fullRes.y;
    let span = max(1.6329931619, 1.4142135624 / aspect) * size * 1.08 / max(u.zoom, 0.001);
    let right = vec3f(0.7071067812, 0.0, -0.7071067812);
    let up = vec3f(-0.4082482905, 0.8164965809, -0.4082482905);
    let origin = vec3f(size * 2.5) + right * (uv.x + u.panX) * span + up * (uv.y + u.panY) * span;

    let nearT = origin - size;
    let enter = max(max(nearT.x, nearT.y), nearT.z);
    let leave = min(min(origin.x, origin.y), origin.z);
    if (enter >= leave) { return out; }
    var distance = max(enter, 0.0);
    var cell = clamp(vec3i(floor(origin - (distance + 0.0001))), vec3i(0), vec3i(u.volumeSize - 1));
    var nextT = origin - vec3f(cell);
    var normal = vec3f(0.0, 0.0, 1.0);
    if (nearT.y >= nearT.x && nearT.y >= nearT.z) { normal = vec3f(0.0, 1.0, 0.0); }
    else if (nearT.x >= nearT.z) { normal = vec3f(1.0, 0.0, 0.0); }

    for (var step = 0; step < u.volumeSize * 3; step++) {
        if (any(cell < vec3i(0)) || distance >= leave) { break; }
        let atlas = vec2i(cell.x, cell.y + cell.z * u.volumeSize);
        let density = textureLoad(analyticalGeo, atlas, 0).a;
        if (density > 0.0 && density >= u.threshold) {
            let color = textureLoad(volumeCache, atlas, 0).rgb;
            out.fragColor = vec4f(lighting(color, normal, vec3f(0.5773502692)), 1.0);
            out.geoOut = vec4f(normal * 0.5 + 0.5, clamp(distance / (size * 4.0), 0.0, 1.0));
            return out;
        }
        distance = min(min(nextT.x, nextT.y), nextT.z);
        let crossed = nextT <= vec3f(distance);
        if (crossed.y) { normal = vec3f(0.0, 1.0, 0.0); }
        else if (crossed.x) { normal = vec3f(1.0, 0.0, 0.0); }
        else { normal = vec3f(0.0, 0.0, 1.0); }
        cell -= select(vec3i(0), vec3i(1), crossed);
        nextT += select(vec3f(0.0), vec3f(1.0), crossed);
    }
    return out;
}
`}},o=null;if(n&&Object.keys(a).length>0){n.shaders||(n.shaders={});for(let[i,e]of Object.entries(a))n.shaders[i]={...e}}n&&o&&(n.help=o);var f="render/renderLandscape3d",u="render",p="renderLandscape3d",v=n;export{v as default,f as effectId,p as effectName,o as help,u as namespace};
