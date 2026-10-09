import assert from 'node:assert/strict'
import { test } from 'node:test'

// Regression coverage for the vendored core's WebGPU binding analysis
// (vendored at Noisemaker 735e1fdc): helper-call reachability, scoped
// names, and per-entry-point storage-texture selection.

// The core evaluates UI classes that reference HTMLElement and registers
// custom elements at module load.
globalThis.HTMLElement ||= class {}
globalThis.customElements ||= { define() {}, get() {}, whenDefined() { return Promise.resolve() } }

const { WebGPUBackend } = await import('../vendor-cache/noisemaker-shaders-core.esm.js')

function parseBindings(source) {
  const backend = Object.create(WebGPUBackend.prototype)
  return backend.parseShaderBindings(source)
}

test('WebGPU binding parser ignores dead bindings mentioned only in block comments', () => {
  const source = `
@group(0) @binding(0) var liveTex: texture_2d<f32>;
@group(0) @binding(1) var deadTex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

/*
 * deadTex used to be sampled here, but this pass no longer needs it.
 */
@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / vec2<f32>(64.0, 64.0);
    return textureSample(liveTex, samp, uv);
}
`

  const names = parseBindings(source).map((binding) => binding.name)

  assert.ok(!names.includes('deadTex'), `dead block-comment-only binding was retained: ${names.join(', ')}`)
  assert.ok(names.includes('liveTex') && names.includes('samp'), `live bindings were not preserved: ${names.join(', ')}`)
})

test('WebGPU binding parser handles nested block comments', () => {
  const source = `
@group(0) @binding(0) var liveTex: texture_2d<f32>;
@group(0) @binding(1) var deadTex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

/*
 * Outer comment start.
 * /*
 *  Nested comment mentions deadTex.
 * */
 * Outer comment also mentions deadTex.
 */
@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / vec2<f32>(64.0, 64.0);
    return textureSample(liveTex, samp, uv);
}
`

  const names = parseBindings(source).map((binding) => binding.name)

  assert.ok(!names.includes('deadTex'), `nested block-comment-only binding was retained: ${names.join(', ')}`)
  assert.ok(names.includes('liveTex') && names.includes('samp'), `live bindings were not preserved: ${names.join(', ')}`)
})

test('WebGPU binding parser ignores block delimiters inside line comments', () => {
  const source = `
@group(0) @binding(0) var liveTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

// /* This is only a line comment and must not start a block comment.
@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / vec2<f32>(64.0, 64.0);
    return textureSample(liveTex, samp, uv);
}
// */ This is also only a line comment.
`

  const names = parseBindings(source).map((binding) => binding.name)

  assert.ok(
    names.includes('liveTex') && names.includes('samp'),
    `line-comment block delimiters stripped live bindings: ${names.join(', ')}`,
  )
})

test('WebGPU binding parser ignores storage bindings declared only in comments', () => {
  const source = `
@group(0) @binding(0) var<uniform> volumeSize: i32;
/*
@group(0) @binding(1) var deadStorageTex: texture_storage_2d<rgba16float, write>;
*/
@group(0) @binding(2) var stateTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x >= u32(volumeSize) || id.y >= u32(volumeSize)) {
        return;
    }
    textureStore(stateTex, vec2<i32>(id.xy), vec4<f32>(1.0));
}
`

  const names = parseBindings(source).map((binding) => binding.name)

  assert.ok(!names.includes('deadStorageTex'), `commented-out storage texture binding was retained: ${names.join(', ')}`)
  assert.ok(
    names.includes('volumeSize') && names.includes('stateTex'),
    `live compute bindings were not preserved: ${names.join(', ')}`,
  )
})

test('WebGPU binding parser classifies writable 3D storage textures', () => {
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    textureStore(volumeOut, vec3<i32>(gid), vec4<f32>(1.0));
}
`
  const [binding] = parseBindings(source)
  assert.equal(binding?.type, 'storage_texture')
  assert.equal(binding?.name, 'volumeOut')
})

test('explicit compute entry point binds only its mapped 3D storage texture', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@group(0) @binding(1) var otherOut: texture_storage_3d<rgba8unorm, write>;
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    textureStore(volumeOut, vec3<i32>(gid), vec4<f32>(1.0));
}
@compute @workgroup_size(4, 4, 4)
fn other(@builtin(global_invocation_id) gid: vec3<u32>) {
    textureStore(otherOut, vec3<i32>(gid), vec4<f32>(0.5));
}
`
  const volumeView = { label: 'volume' }
  backend.textures = new Map([['node_0_volume', { view: volumeView }]])
  backend.parseGlobalName = () => null
  backend.device = { createBindGroup: ({ entries }) => ({ entries }) }
  const bindings = backend.parseShaderBindings(source)
  const program = {
    module: {},
    _sourceHasBindings: true,
    isCompute: true,
    pipeline: { getBindGroupLayout: () => ({}) },
    bindings,
    entryPointBindings: backend.parseEntryPointBindings(source, bindings),
  }
  const pass = {
    entryPoint: 'main',
    storageTextures: { volumeOut: 'node_0_volume', otherOut: 'node_0_volume' },
  }
  const entries = backend.createBindGroup(pass, program, { globalUniforms: {} }).entries
  assert.equal(entries.length, 1)
  assert.equal(entries[0].binding, 0)
  assert.equal(entries[0].resource, volumeView)
})

test('selected entry point includes storage textures reached through helper calls', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@group(0) @binding(1) var otherOut: texture_storage_3d<rgba8unorm, write>;
fn writeVolume() { textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0)); }
fn nested() { writeVolume(); }
@compute @workgroup_size(1) fn main() { nested(); /* otherOut belongs to another entry */ }
@compute @workgroup_size(1) fn other() { textureStore(otherOut, vec3<i32>(0), vec4<f32>(0.5)); }
`
  const selected = backend.parseEntryPointBindings(source, backend.parseShaderBindings(source))
  assert.deepEqual([...selected.get('main')].sort(), [0])
  assert.deepEqual([...selected.get('other')], [1])
})

test('helper struct members named like another entry resource do not bind that resource', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@group(0) @binding(1) var otherOut: texture_storage_3d<rgba8unorm, write>;
struct Marker { otherOut: u32, }
fn writeVolume() {
    let marker = Marker(1u);
    if (marker.otherOut == 1u) {
        textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0));
    }
}
@compute @workgroup_size(1) fn main() { writeVolume(); }
@compute @workgroup_size(1) fn other() {
    textureStore(otherOut, vec3<i32>(0), vec4<f32>(0.5));
}
`
  const selected = backend.parseEntryPointBindings(source, backend.parseShaderBindings(source))
  assert.deepEqual([...selected.get('main')], [0])
  assert.deepEqual([...selected.get('other')], [1])
})

test('helper parameters and local variables shadow unrelated storage resources', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@group(0) @binding(1) var otherOut: texture_storage_3d<rgba8unorm, write>;
fn writeVolume(otherOut: u32) {
    if (otherOut == 1u) {
        textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0));
    }
}
fn nested() { let otherOut = 1u; writeVolume(otherOut); }
@compute @workgroup_size(1) fn main() { nested(); }
@compute @workgroup_size(1) fn other() {
    textureStore(otherOut, vec3<i32>(0), vec4<f32>(0.5));
}
`
  const selected = backend.parseEntryPointBindings(source, backend.parseShaderBindings(source))
  assert.deepEqual([...selected.get('main')], [0])
  assert.deepEqual([...selected.get('other')], [1])
})

test('a for-loop local stops shadowing the global storage resource after the loop', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
fn writeVolume() {
    for (var volumeOut = 0u; volumeOut < 1u; volumeOut = volumeOut + 1u) {}
    textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0));
}
@compute @workgroup_size(1) fn main() { writeVolume(); }
`
  const selected = backend.parseEntryPointBindings(source, backend.parseShaderBindings(source))
  assert.deepEqual([...selected.get('main')], [0])
})

test('a local declaration sees the global storage resource in its initializer', () => {
  const backend = Object.create(WebGPUBackend.prototype)
  for (const statement of [
    'let otherOut = textureDimensions(otherOut); if (otherOut.x == 8u) { textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0)); }',
    'var otherOut = textureDimensions(otherOut); if (otherOut.x == 8u) { textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0)); }',
    'for (var otherOut = textureDimensions(otherOut).x; otherOut > 0u; otherOut = otherOut - 1u) {} textureStore(volumeOut, vec3<i32>(0), vec4<f32>(1.0));',
  ]) {
    const source = `
@group(0) @binding(0) var volumeOut: texture_storage_3d<rgba8unorm, write>;
@group(0) @binding(1) var otherOut: texture_storage_3d<rgba8unorm, write>;
fn writeVolume() { ${statement} }
@compute @workgroup_size(1) fn main() { writeVolume(); }
@compute @workgroup_size(1) fn other() {
    textureStore(otherOut, vec3<i32>(0), vec4<f32>(0.5));
}
`
    const selected = backend.parseEntryPointBindings(source, backend.parseShaderBindings(source))
    assert.deepEqual(
      [...selected.get('main')].sort((a, b) => a - b),
      [0, 1],
      `initializer lost the global resource: ${statement}`,
    )
  }
})
