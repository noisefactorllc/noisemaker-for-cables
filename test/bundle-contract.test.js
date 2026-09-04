import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { test } from 'node:test'

import {
  createFakeCablesOp,
  createFakeCGLNamespace,
} from './support/fake-cables-op.js'

const projectFile = (path) => new URL(`../${path}`, import.meta.url)
const readProjectFile = (path) => readFile(projectFile(path), 'utf8')

function installTestDomShim(target = globalThis) {
  target.HTMLElement ||= class {}
  target.customElements ||= {
    define() {},
    get() {},
    whenDefined() {
      return Promise.resolve()
    },
  }
  target.window ||= target
  target.document ||= {
    createElement() {
      return {
        appendChild() {},
        getContext() {
          return null
        },
        setAttribute() {},
        style: {},
      }
    },
    createElementNS() {
      return { style: {} }
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
  }
}

function executableSource(source) {
  let output = ''
  let index = 0

  while (index < source.length) {
    const character = source[index]
    const next = source[index + 1]

    if (character === '/' && next === '/') {
      index += 2
      while (index < source.length && source[index] !== '\n') index += 1
      output += '\n'
      continue
    }

    if (character === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1
      }
      index += 2
      output += ' '
      continue
    }

    if (character === '"' || character === "'" || character === '`') {
      const quote = character
      index += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }
        if (source[index] === quote) {
          index += 1
          break
        }
        index += 1
      }
      output += `${quote}${quote}`
      continue
    }

    output += character
    index += 1
  }

  return output
}

test('generated effect entry statically imports every locked effect exactly once in ID order', async () => {
  const lock = JSON.parse(await readProjectFile('vendor.lock.json'))
  const source = await readProjectFile('src/generated/register-all-effects.js')
  const lockedPaths = lock.artifacts
    .map((artifact) => artifact.path)
    .filter((path) => path.startsWith('effects/') && path.endsWith('.js'))
  const lockedIds = lockedPaths.map((path) => path.slice('effects/'.length, -'.js'.length))
  const imports = [...source.matchAll(/^import effect\d+ from '\.\.\/\.\.\/vendor-cache\/(effects\/[^']+\.js)'$/gm)]
    .map((match) => match[1])
  const registeredIds = [...source.matchAll(/^\s+\['([^']+)', effect\d+\],$/gm)]
    .map((match) => match[1])

  assert.equal(lock.effectCount, 210)
  assert.equal(imports.length, lock.effectCount)
  assert.deepEqual(imports, lockedPaths)
  assert.deepEqual(registeredIds, lockedIds)
  assert.match(source, new RegExp(`export const effectCount = ${lock.effectCount}\\b`))
  assert.deepEqual(
    [...source.matchAll(/^  '([^']+)',$/gm)].map((match) => match[1]),
    lockedIds,
  )
  assert.match(source, /export const effectIds = Object\.freeze\(\[/)
  assert.doesNotMatch(source, /\bimport\s*\(/)
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /shaders\.noisedeck\.app/)
})

test('engine facade loads the pinned catalog and compiles with the reference Polymorphic compiler', async () => {
  installTestDomShim()
  const engine = await import('../src/runtime/engine.js')

  const immediateGraph = await engine.compileProgram(
    'search synth\nnoise(seed: 1, scaleX: 50, scaleY: 50).write(o0)\nrender(o0)',
  )
  assert.ok(Array.isArray(immediateGraph.passes) && immediateGraph.passes.length >= 1)

  const loaded = await engine.loadEngine()

  assert.equal(engine.catalogInfo.effectCount, 210)
  assert.equal(engine.catalogInfo.effectIds.length, 210)
  assert.equal(engine.catalogInfo.effectIds[0], 'classicNoisedeck/bitEffects')
  assert.equal(Object.isFrozen(engine.catalogInfo.effectIds), true)
  assert.equal(loaded.catalogInfo, engine.catalogInfo)
  assert.equal(loaded.Pipeline, engine.Pipeline)
  assert.equal(loaded.WebGL2Backend, engine.WebGL2Backend)

  const graph = await engine.compileProgram(
    'search synth, filter\nnoise(seed: 1, scaleX: 50, scaleY: 50)\n.blur(radiusX: 8, radiusY: 8)\n.write(o0)\nrender(o0)',
  )
  assert.ok(Array.isArray(graph.passes) && graph.passes.length >= 2)
  assert.ok(graph.renderSurface)
  const program = Object.values(graph.programs).find(
    (candidate) => typeof (candidate.glsl || candidate.fragment) === 'string',
  )
  assert.ok(program)
  assert.match(program.glsl || program.fragment, /void\s+main/)
})

test('pinned core exposes renderer sinks and bounded WebGL2 frame export', async () => {
  installTestDomShim()
  const core = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
  const { CablesWebGL2Backend } = await import('../src/backend/cables-webgl2-backend.js')

  for (const exportName of ['CanvasSink', 'SinkManager', 'FrameExportQueue']) {
    assert.equal(typeof core[exportName], 'function', `missing ${exportName} export`)
  }

  const presented = []
  const canvasSink = new core.CanvasSink({
    present(textureId) {
      presented.push(textureId)
    },
  })
  assert.equal(canvasSink.submit('global_o0', 125), true)
  assert.deepEqual(presented, ['global_o0'])

  const backend = Object.create(CablesWebGL2Backend.prototype)
  backend.gl = {}
  backend.textures = new Map()
  const queue = backend.createFrameExportQueue({ slots: 2 })
  assert.equal(queue instanceof core.FrameExportQueue, true)
  assert.equal(queue.available, false)
  queue.close({ backendLost: true })
  assert.equal(queue.adapter, null)
})

test('pinned core supports device-qualified MIDI and audio automation', async () => {
  installTestDomShim()
  const core = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
  const { compileProgram } = await import('../src/runtime/engine.js')

  const midi = new core.MidiState()
  midi.handleMessage(
    new Uint8Array([0x90, 60, 96]),
    { id: 'controller-a', name: 'Launch Control XL' },
  )
  midi.handleMessage(
    new Uint8Array([0x90, 72, 112]),
    { id: 'controller-b', name: 'Launch Control XL' },
  )
  assert.equal(midi.getChannel(1).key, 72)
  assert.equal(midi.getPortState({ id: 'controller-a' }).getChannel(1).key, 60)
  assert.equal(midi.getPortState({ name: 'Launch Control XL' }), null)

  const audio = new core.AudioState()
  audio.registerDevice({ id: 'interface-b', name: 'Interface', channelCount: 2 })
  audio.setChannelValues('interface-b', 2, { low: 0.25, raw: -0.5 })
  const channel = audio.getDeviceChannelState({
    id: 'interface-b',
    name: 'Interface',
    channel: 2,
  })
  assert.equal(channel.low, 0.25)
  assert.equal(channel.raw, -0.5)
  assert.equal(channel.rawReady, true)

  const graph = await compileProgram(`search synth
noise(
  scaleX: audio(band: audioBand.raw, channel: 2, name: "Interface", id: "interface-b"),
  scaleY: midi(channel: 1, name: "Launch Control XL", id: "controller-a")
).write(o0)
render(o0)`)
  const requirements = new core.Pipeline(graph, null).getAudioInputRequirements()
  assert.deepEqual(requirements, {
    needsLegacy: false,
    needsLegacyRaw: false,
    selected: [{
      id: 'interface-b',
      name: 'Interface',
      channel: 2,
      needsRaw: true,
    }],
  })
})

test('browser bundle is self-contained while preserving caller-requested native fetch', async () => {
  const lock = JSON.parse(await readProjectFile('vendor.lock.json'))
  const bundle = await readProjectFile(
    'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/lib_noisemaker-cablesgl.js',
  )
  const executable = executableSource(bundle)

  assert.doesNotMatch(bundle, /shaders\.noisedeck\.app/)
  assert.doesNotMatch(bundle, /\/Users\//)
  assert.doesNotMatch(bundle, /sourceMappingURL/)
  assert.match(executable, /\bfetch\s*\(/)
  assert.doesNotMatch(executable, /\bimport\s*\(/)

  const context = {
    Blob,
    TextDecoder,
    TextEncoder,
    URL,
    console,
    performance,
    setTimeout,
    structuredClone,
  }
  installTestDomShim(context)
  vm.runInNewContext(bundle, context, {
    filename: 'lib_noisemaker-cablesgl.js',
    timeout: 20_000,
  })

  assert.equal(typeof context.NoisemakerCablesGL, 'object')
  assert.equal(context.NoisemakerCablesGL.packageVersion, '0.1.0')
  assert.equal(context.NoisemakerCablesGL.catalogInfo.effectCount, lock.effectCount)
  assert.equal(context.NoisemakerCablesGL.effectMetadata, context.NoisemakerCablesGL.catalogInfo)
  assert.equal(context.NoisemakerCablesGL.effectMetadata.effectIds.length, lock.effectCount)
  const loaded = await context.NoisemakerCablesGL.loadEngine()
  assert.equal(loaded.catalogInfo.effectCount, lock.effectCount)
  assert.equal(typeof loaded.Pipeline.prototype.addSink, 'function')
  assert.equal(typeof loaded.Pipeline.prototype.getAudioInputRequirements, 'function')
  assert.equal(typeof loaded.WebGL2Backend.prototype.createFrameExportQueue, 'function')
  assert.equal(typeof context.NoisemakerCablesGL.compileProgram, 'function')
  assert.equal(typeof context.NoisemakerCablesGL.createProgramController, 'function')
  assert.equal(typeof context.NoisemakerCablesGL.inspectCapabilities, 'function')
  assert.equal(typeof context.NoisemakerCablesGL.installProgramOp, 'function')

  const extensionNames = new Set([
    'EXT_color_buffer_float',
    'EXT_float_blend',
    'OES_texture_float_linear',
  ])
  const limits = new Map([
    [1, 4096],
    [2, 4],
    [3, 9],
    [4, 16384],
    [5, 8],
  ])
  const cgl = {
    currentProgram: null,
    gl: {
      MAX_TEXTURE_SIZE: 1,
      MAX_DRAW_BUFFERS: 2,
      MAX_TEXTURE_IMAGE_UNITS: 3,
      MAX_UNIFORM_BLOCK_SIZE: 4,
      MAX_UNIFORM_BUFFER_BINDINGS: 5,
      createVertexArray() {},
      texImage3D() {},
      getExtension(name) { return extensionNames.has(name) ? {} : null },
      getParameter(name) { return limits.get(name) },
    },
  }
  const capabilities = context.NoisemakerCablesGL.inspectCapabilities(cgl, {
    CGL: { MESH: { lastMesh: null } },
  })
  assert.equal(capabilities.supported, true)
  assert.deepEqual(Array.from(capabilities.issues), [])

  const fakeOp = createFakeCablesOp()
  const fakeCGL = createFakeCGLNamespace()
  let controllerOptions
  const controller = {
    dispose: () => Promise.resolve({}),
    getState: () => ({ error: null, ready: false, texture: null }),
  }
  context.NoisemakerCablesGL.installProgramOp(fakeOp.op, {
    CGL: fakeCGL,
    cgl: fakeOp.cgl,
    createProgramController(options) {
      controllerOptions = options
      return controller
    },
    scheduleMicrotask() {},
  })
  assert.equal(
    controllerOptions.capabilityInspector,
    context.NoisemakerCablesGL.inspectCapabilities,
  )
})

test('browser bundle compiles legacy noiseType with the pinned native warning', async () => {
  const bundle = await readProjectFile(
    'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/lib_noisemaker-cablesgl.js',
  )
  const warnings = []
  const bundleConsole = Object.assign(Object.create(console), {
    warn: (...args) => warnings.push(args.join(' ')),
  })
  const context = {
    Blob,
    TextDecoder,
    TextEncoder,
    URL,
    console: bundleConsole,
    performance,
    setTimeout,
    structuredClone,
  }
  installTestDomShim(context)
  vm.runInNewContext(bundle, context, {
    filename: 'lib_noisemaker-cablesgl.js',
    timeout: 20_000,
  })

  const graph = await context.NoisemakerCablesGL.compileProgram(
    'search synth\n\nnoise(noiseType: 10)\n  .write(o0)\n\nrender(o0)',
  )

  assert.ok(Array.isArray(graph.passes) && graph.passes.length >= 1)
  assert.deepEqual(warnings, [
    "[noisemaker] S007: param 'noiseType' is deprecated, use 'type' instead. Aliases will be removed on 2026-09-01.",
  ])
})
