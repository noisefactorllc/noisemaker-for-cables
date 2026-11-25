import assert from 'node:assert/strict'
import { test } from 'node:test'

globalThis.HTMLElement ||= class {}
globalThis.customElements ||= { define() {}, get() {}, whenDefined: async () => {} }
globalThis.window ||= globalThis
globalThis.document ||= { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }) }

const core = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
const { loadEngine } = await import('../src/runtime/engine.js')
await loadEngine()

test('let-bound MIDI and audio selectors reach stable effect uniforms', () => {
  for (const [source, expected] of [
    ['let ch = 5; solid(alpha: midi(channel: ch)).write(o0)', { channel: 5 }],
    ['let band = 3; solid(alpha: audio(band: band)).write(o0)', { band: 3 }],
  ]) {
    const result = core.compile(`search synth; ${source}`)
    assert.deepEqual(result.diagnostics.filter(d => d.severity === 'error'), [])
    const value = result.plans[0].chain[0].args.alpha
    for (const [key, expectedValue] of Object.entries(expected)) assert.equal(value[key], expectedValue)
  }
})

test('extra positionals warn while preserving a valid program', () => {
  const result = core.compile('search synth; solid(#ff0000, 1, 99).write(o0)')
  assert.deepEqual(result.diagnostics.filter(d => d.severity === 'error'), [])
  assert.equal(result.diagnostics.filter(d => d.code === 'S009' && d.severity === 'warning').length, 1)
})

test('ordinary calls and arrays accept internal comments and trailing commas', () => {
  for (const source of [
    'solid(// color\n#ffffff).write(o0)',
    'solid(color: [1, // green\n0, 0,]).write(o0)',
  ]) {
    const result = core.compile(`search synth; ${source}`)
    assert.deepEqual(result.diagnostics.filter(d => d.severity === 'error'), [])
  }
})

test('array-valued bindings unparse to valid stable DSL', () => {
  for (const [input, expected] of [
    ['[1, 2, 3]', '[1, 2, 3]'],
    ['[0.0000001, #33669980, false, "uv", [1, 2]]', '[0.0000001, #33669980, false, "uv", [1, 2]]'],
    ['[osc(type: oscKind.sine), audio(band: audioBand.low), midi(channel: 1), solid(), o0]',
      '[osc(type: oscKind.sine, min: 0, max: 1, speed: 1, offset: 0, seed: 1), audio(band: audioBand.low, min: 0, max: 1), midi(channel: 1, mode: midiMode.velocity, min: 0, max: 1, sensitivity: 1), solid(), o0]'],
  ]) {
    const compiled = core.compile(`search synth; let p = ${input}; solid().write(o0)`)
    assert.deepEqual(compiled.diagnostics.filter(d => d.severity === 'error'), [])
    const source = core.unparse(compiled)
    assert.ok(source.includes(`let p = ${expected}`), source)
    const reparsed = core.compile(source)
    assert.deepEqual(reparsed.diagnostics.filter(d => d.severity === 'error'), [])
    assert.equal(core.unparse(reparsed), source)
  }
})

test('structural writes stay visible and cannot be replaced as effects', () => {
  const compiled = core.compile('search synth; solid().write(o0)')
  const write = core.listSteps(compiled).find(step => step.effectName === '_write')
  assert.equal(write.kind, 'builtin')
  assert.equal(write.canReplaceWithStarter, false)
  assert.equal(write.canReplaceWithNonStarter, false)
  assert.equal(core.replaceEffect(compiled, write.stepIndex, 'solid').success, false)
  assert.equal(core.getCompatibleReplacements(compiled, write.stepIndex).success, false)
})

test('pipeline input aliases keep upstream textures alive until their last read', () => {
  const passes = [
    { nodeId: 'node_0', outputs: { color: 'node_0_out' } },
    { nodeId: 'node_1', inputs: { color: 'node_1_inputColor' }, outputs: { color: 'node_1_out' } },
    { nodeId: 'node_2', inputs: { color: 'node_2_inputColor' }, outputs: { color: 'node_2_out' } },
  ]
  assert.deepEqual(core.analyzeLiveness(passes).get('node_0_out'), { start: 0, end: 1 })
  const allocated = core.allocateResources(passes)
  assert.notEqual(allocated.get('node_0_out'), allocated.get('node_1_out'))
  assert.equal(allocated.get('node_0_out'), allocated.get('node_2_out'))
})

function cubemapHarness(backendName, fail = false) {
  return {
    width: 8, height: 4,
    resize(width, height) { this.width = width; this.height = height },
    setUniform() {}, render() {},
    surfaces: new Map([['o0', { read: 'frame' }]]),
    backend: {
      getName: () => backendName,
      async readPixels() {
        if (fail) throw Error('readback failed')
        return { width: 1, height: 2, data: Uint8Array.of(1, 2, 3, 255, 4, 5, 6, 255) }
      },
    },
  }
}

test('cubemap readback uses top-row-first pixels on each backend', async () => {
  for (const backend of ['WebGL2', 'WebGPU']) {
    const pipeline = cubemapHarness(backend)
    const faces = await core.Pipeline.prototype.renderCubemap.call(pipeline, { size: 2 })
    assert.equal(faces.length, 6)
    assert.deepEqual([...faces[0].data], backend === 'WebGPU'
      ? [4, 5, 6, 255, 1, 2, 3, 255] : [1, 2, 3, 255, 4, 5, 6, 255])
    assert.deepEqual([pipeline.width, pipeline.height], [8, 4])
  }
})

test('a failed cubemap readback restores the render dimensions', async () => {
  const pipeline = cubemapHarness('WebGL2', true)
  await assert.rejects(core.Pipeline.prototype.renderCubemap.call(pipeline, { size: 2 }), /readback failed/)
  assert.deepEqual([pipeline.width, pipeline.height], [8, 4])
})

test('OBJ loading preserves packed vertex and UV data through shared geometry', async () => {
  let uploaded
  const renderer = Object.create(core.CanvasRenderer.prototype)
  renderer._meshCache = new Map()
  renderer._pipeline = { backend: { uploadMeshData(...args) {
    uploaded = args
    return { vertexCount: args[6] }
  } } }
  const result = await renderer.loadOBJFromString([
    'v 0 0 0', 'v 1 0 0', 'v 0 1 0',
    'vt 0 0', 'vt 1 0', 'vt 0 1', 'f 1/1 2/2 3/3',
  ].join('\n'))
  assert.deepEqual(result, { success: true, vertexCount: 3 })
  assert.deepEqual([...uploaded[1].slice(0, 12)], [0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1])
  assert.deepEqual([...uploaded[3].slice(0, 12)], [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0])
  assert.ok(uploaded[1].slice(12).every(x => x === 0))
  assert.equal(renderer._meshCache.get('mesh0').vertexCount, 3)
})

test('WebGPU depth targets survive pending work and retire after completion', async () => {
  globalThis.GPUTextureUsage ||= { RENDER_ATTACHMENT: 16 }
  const complete = []
  const textures = []
  const backend = Object.create(core.WebGPUBackend.prototype)
  backend.device = {
    createTexture() {
      const texture = { destroyed: false, destroy() { this.destroyed = true } }
      textures.push(texture)
      return texture
    },
    queue: { onSubmittedWorkDone: () => new Promise(resolve => complete.push(resolve)) },
  }
  const first = backend.getDepthTexture(4, 4)
  assert.equal(backend.getDepthTexture(4, 4), first)
  for (let size = 5; size <= 8; size++) backend.getDepthTexture(size, size)
  assert.equal(first.destroyed, false)
  assert.equal(backend.depthTextures.size, 4)
  assert.equal(complete.length, 1)
  complete[0]()
  await Promise.resolve()
  assert.equal(first.destroyed, true)
  assert.ok(textures.slice(1).every(texture => !texture.destroyed))
})

test('WebGPU uniform sizing ignores braces inside WGSL comments', () => {
  const backend = Object.create(core.WebGPUBackend.prototype)
  const size = backend.parseDeclaredUniformBufferSize([
    'struct Params {',
    ' // } is not the end of this struct',
    ' color: vec4<f32>,',
    ' extra: vec4<f32>,',
    '}',
    '@group(0) @binding(0) var<uniform> params: Params;',
  ].join('\n'))
  assert.equal(size, 32)
})

test('WebGL2 depth setup restores the caller framebuffer and releases storage', () => {
  let bound = { id: 'caller' }
  const original = bound
  const deleted = []
  const gl = {
    FRAMEBUFFER: 1, FRAMEBUFFER_BINDING: 2, RENDERBUFFER: 3,
    FRAMEBUFFER_COMPLETE: 4, DEPTH_COMPONENT24: 5, DEPTH_ATTACHMENT: 6,
    getParameter: () => bound,
    createRenderbuffer: () => ({ id: 'depth' }),
    bindFramebuffer(target, fbo) { bound = fbo },
    bindRenderbuffer() {}, renderbufferStorage() {}, framebufferRenderbuffer() {},
    checkFramebufferStatus: () => 4,
    deleteRenderbuffer(buffer) { deleted.push(buffer) },
  }
  const backend = Object.create(core.WebGL2Backend.prototype)
  backend.gl = gl
  backend.depthBuffers = new Map()
  const fbo = { id: 'target' }
  backend.ensureDepthBuffer(fbo, 4, 4)
  assert.equal(bound, original)
  const depth = backend.depthBuffers.get(fbo).buffer
  backend.releaseDepthBuffer(fbo)
  backend.releaseDepthBuffer(fbo)
  assert.deepEqual(deleted, [depth])
  assert.equal(backend.depthBuffers.has(fbo), false)
})

test('experimental syntax and renderer interfaces remain absent', () => {
  for (const source of ['scene().write(o0)', 'solid(#ffffff, alpha: 0).write(o0)', 'solid(alpha: { x: 1 }).write(o0)']) {
    let rejected = false
    try { rejected = core.compile(`search synth; ${source}`).diagnostics.some(d => d.severity === 'error') }
    catch { rejected = true }
    assert.equal(rejected, true, source)
  }
  for (const member of ['sceneTree', 'sceneRenderer', 'clock', 'isScene', 'loadGLTFFromURL', 'loadGLTFFromString']) {
    assert.equal(member in core.CanvasRenderer.prototype, false, member)
  }
})
