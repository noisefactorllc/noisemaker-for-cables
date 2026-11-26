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

test('stable element ids survive compile and unparse without becoming uniforms', () => {
  const source = 'search synth; solid(_id: "base").write(o1, _id: "stored"); read(surface: o1, _id: "input").write(o0, _id: "out")'
  const compiled = core.compile(source)
  assert.deepEqual(compiled.diagnostics, [])
  const ids = result => result.plans.flatMap(plan => plan.chain || []).map(step => step.args?._id)
  assert.deepEqual(ids(compiled), ['base', 'stored', 'input', 'out'])
  const text = core.unparse(compiled)
  assert.deepEqual(ids(core.compile(text)), ids(compiled))
  const graph = core.compileGraph(source)
  for (const pass of graph.passes) assert.equal(Object.hasOwn(pass.uniforms || {}, '_id'), false)
})

test('let bindings preserve nested effect arguments and sibling values', () => {
  const source = 'search synth, mixer; let layer = blendMode(tex: solid(color: #336699), mix: 0.25); noise().layer().write(o0)'
  const compiled = core.compile(source)
  assert.deepEqual(compiled.diagnostics.filter(d => d.severity === 'error'), [])
  const text = core.unparse(compiled)
  assert.ok(text.includes('solid('), text)
  assert.ok(text.includes('0.25'), text)
  const again = core.compile(text)
  assert.deepEqual(again.diagnostics.filter(d => d.severity === 'error'), [])
  assert.equal(core.unparse(again), text)
})

test('let-bound RGB colors retain their components under keyword overrides', () => {
  core.registerOp('filter.rgbprobe', { name: 'rgbprobe', args: ['r', 'g', 'b'].map(name => ({ name, type: 'float', default: 0 })) })
  const color = [0x80 / 255, 0x40 / 255, 0x20 / 255]
  for (const [call, expected] of [
    ['t()', color], ['t(_skip: false)', color], ['t(_id: "color")', color],
    ['t(g: 0.25)', [color[0], 0.25, color[2]]],
  ]) {
    const compiled = core.compile(`search synth, filter; let t = rgbprobe(#804020); solid().${call}.write(o0)`)
    assert.deepEqual(compiled.diagnostics, [])
    const args = compiled.plans[0].chain.find(step => step.op === 'filter.rgbprobe').args
    assert.deepEqual([args.r, args.g, args.b], expected, call)
  }
})

test('a read chain supplied as an effect argument reports a diagnostic', () => {
  const compiled = core.compile('search synth, mixer, filter; solid().blendMode(tex: read(o1).invert()).write(o0)')
  const errors = compiled.diagnostics.filter(d => d.severity === 'error')
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /Chain for argument 'tex'.*only effect calls/)
})

test('configuration effects retain their handed-on texture names', () => {
  for (const field of ['outputTex', 'outputXyz', 'outputVel', 'outputRgba']) {
    const effect = new core.Effect({ name: 'handoff', func: 'handoff', [field]: 'stateTex' })
    assert.equal(effect[field], 'stateTex', field)
  }
})

test('storage-only passes scope and allocate their targets for following effects', () => {
  for (const target of ['outputTex', 'work']) {
    const name = target === 'work' ? 'storedNamed' : 'storedDirect'
    core.registerOp(`user.${name}`, { name, args: [] })
    core.registerStarterOps([`user.${name}`])
    core.registerEffect(`user.${name}`, new core.Effect({
      name, func: name,
      ...(target === 'work' ? { textures: { work: { width: 8, height: 8, format: 'rgba8unorm' } }, outputTex: 'work' } : {}),
      passes: [{ name: 'fill', program: 'fill', type: 'compute', storageTextures: { outputBuffer: target } }],
    }))
    const graph = core.compileGraph(`search user, filter; ${name}().invert().write(o0)`)
    const expected = target === 'work' ? 'node_0_work' : 'node_0_out'
    assert.equal(graph.passes[0].storageTextures.outputBuffer, expected)
    assert.equal(Object.hasOwn(graph.passes[0], 'outputs'), false)
    assert.ok(graph.textures.get(expected)?.usage.includes('storage'), expected)
  }
})

test('a reused WebGPU texture must cover every required usage', () => {
  const pipeline = Object.create(core.Pipeline.prototype)
  pipeline.backend = { resolveUsage: names => names.reduce((bits, name) => bits | ({ sample: 1, storage: 2 }[name]), 0) }
  assert.equal(pipeline.textureUsageCovers({ usage: 1 }, ['sample', 'storage']), false)
  assert.equal(pipeline.textureUsageCovers({ usage: 3 }, ['sample', 'storage']), true)
  assert.equal(pipeline.textureUsageCovers({}, ['sample', 'storage']), true)
})

test('blend factors preserve zero and normalize color factors for WebGPU', () => {
  const gl = Object.create(core.WebGL2Backend.prototype)
  gl.gl = { ZERO: 0, ONE: 1 }
  assert.equal(gl.resolveBlendFactor('zero'), 0)
  const gpu = Object.create(core.WebGPUBackend.prototype)
  for (const [input, expected] of [['SRC_COLOR', 'src'], ['DST_COLOR', 'dst'], ['ONE_MINUS_SRC_COLOR', 'one-minus-src'], ['ONE_MINUS_DST_COLOR', 'one-minus-dst']]) {
    const blend = gpu.resolveBlendState([input, 'ZERO'])
    assert.equal(blend.color.srcFactor, expected)
    assert.equal(blend.color.dstFactor, 'zero')
  }
})

test('screen triangle counts resolve from input dimensions or a positive override', () => {
  const gpu = Object.create(core.WebGPUBackend.prototype)
  gpu.textures = new Map([['mesh0_positions', { width: 8, height: 4 }]])
  const pass = { count: 'screen', inputs: { meshPositions: 'mesh0_positions' } }
  assert.equal(gpu.resolveMeshVertexCount(pass, {}), 32)
  assert.equal(gpu.resolveMeshVertexCount({ ...pass, countUniform: 'vertices', uniforms: { vertices: 0 } }, {}), 32)
  assert.equal(gpu.resolveMeshVertexCount({ ...pass, countUniform: 'vertices', uniforms: { vertices: 6 } }, {}), 6)
  assert.equal(gpu.resolveMeshVertexCount({ count: 'screen' }, {}), 3)
})

test('pipeline frame deltas stay regular at zero and across loop boundaries', async () => {
  class MockBackend extends core.Backend {
    async init() {}
    createTexture(id, spec) { this.textures.set(id, { id, ...spec }); return this.textures.get(id) }
    destroyTexture(id) { this.textures.delete(id) }
    async compileProgram(id) { this.programs.set(id, {}); return this.programs.get(id) }
    executePass() {}
    beginFrame() {}
    endFrame() {}
    resize() {}
    getName() { return 'Mock' }
  }
  const pipeline = new core.Pipeline({ passes: [], textures: new Map() }, new MockBackend(null))
  await pipeline.init(8, 8)
  try {
    for (let frame = 0; frame <= 12; frame++) {
      pipeline.render((frame % 6) / 6)
      const expected = frame === 0 ? 0 : 1 / 6
      assert.ok(Math.abs(pipeline.globalUniforms.deltaTime - expected) < 1e-12,
        `frame ${frame}: ${pipeline.globalUniforms.deltaTime}`)
    }
  } finally {
    pipeline.dispose()
  }
})
