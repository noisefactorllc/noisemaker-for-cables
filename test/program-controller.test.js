import assert from 'node:assert/strict'
import {
  setImmediate as waitImmediate,
  setTimeout as waitTimeout,
} from 'node:timers/promises'
import { test } from 'node:test'

import { createProgramController } from '../src/controller/program-controller.js'
import { ControllerError } from '../src/controller/errors.js'
import { inspectCapabilities } from '../src/runtime/capabilities.js'

const REQUIRED_EXTENSIONS = new Set([
  'EXT_color_buffer_float',
  'EXT_float_blend',
  'OES_texture_float_linear',
])

function installTestDomShim(target = globalThis) {
  target.HTMLElement ||= class {}
  target.customElements ||= {
    define() {},
    get() {},
    whenDefined: () => Promise.resolve(),
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function graphFor(dsl, options = {}) {
  const program = `program:${dsl}`
  return {
    delayedUpload: options.delayedUpload === true,
    dsl,
    passes: [{ id: `pass:${dsl}`, program, ...options.pass }],
    programs: new Map([[program, { source: dsl, ...options.programSpec }]]),
    renderSurface: 'o0',
  }
}

function completeCapabilityReport({ extensions = {}, limits = {} } = {}) {
  return Object.freeze({
    cglCacheCompatible: true,
    extensions: Object.freeze({
      colorBufferFloat: true,
      floatBlend: true,
      floatTextureLinear: true,
      ...extensions,
    }),
    failures: Object.freeze([]),
    issues: Object.freeze([]),
    limits: Object.freeze({
      maxDrawBuffers: 4,
      maxTextureSize: 4096,
      maxTextureUnits: 9,
      maxUniformBlockSize: 16_384,
      maxUniformBufferBindings: 8,
      ...limits,
    }),
    supported: true,
    webgl2: true,
  })
}

function createHarness(options = {}) {
  const events = []
  const compileCalls = []
  const createdTextures = []
  const destroyedTextures = []
  const pipelines = []
  const publications = []
  const canvas = {
    height: options.canvasHeight ?? 180,
    width: options.canvasWidth ?? 320,
  }
  const gl = {
    MAX_DRAW_BUFFERS: 0x8824,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_UNIFORM_BLOCK_SIZE: 0x8a30,
    MAX_UNIFORM_BUFFER_BINDINGS: 0x8a2f,
    canvas,
    createVertexArray: options.webgl2 === false ? undefined : () => ({}),
    getExtension(name) {
      return REQUIRED_EXTENSIONS.has(name) && name !== options.missingExtension ? {} : null
    },
    getParameter(parameter) {
      if (parameter === this.MAX_TEXTURE_SIZE) return options.deviceMaxSize ?? 4096
      if (parameter === this.MAX_DRAW_BUFFERS) return options.deviceMaxDrawBuffers ?? 4
      if (parameter === this.MAX_TEXTURE_IMAGE_UNITS) {
        return options.deviceMaxTextureUnits ?? 9
      }
      if (parameter === this.MAX_UNIFORM_BLOCK_SIZE) {
        return options.deviceMaxUniformBlockSize ?? 16_384
      }
      if (parameter === this.MAX_UNIFORM_BUFFER_BINDINGS) {
        return options.deviceMaxUniformBufferBindings ?? 8
      }
      throw new Error(`unexpected GL query ${parameter}`)
    },
    texImage3D: options.webgl2 === false ? undefined : () => {},
  }
  const CGL = options.missingCglCache
    ? {}
    : { MESH: { lastMesh: { id: 'host-mesh' } } }
  const cgl = {
    CGL,
    canvas,
    canvasHeight: canvas.height,
    canvasWidth: canvas.width,
    gl,
  }
  if (!options.missingCglCache) cgl.currentProgram = { id: 'host-program' }

  let guardDepth = 0
  let textureSerial = 0
  let backendSerial = 0
  let pipelineSerial = 0
  let outputCopierSerial = 0
  let renderFailureCount = options.renderFailureCount ?? 0
  let outputDisposeFailureCount = options.outputDisposeFailureCount ?? 0
  const disposeFailureCountByDsl = new Map(options.disposeFailureCountByDsl ?? [])
  let controller

  const cpu = (name) => {
    assert.equal(guardDepth, 0, `${name} must stay outside the GL guard`)
    events.push(`cpu:${name}`)
  }
  const gpu = (name) => {
    assert.ok(guardDepth > 0, `${name} must run inside the GL guard`)
    events.push(`gpu:${name}`)
  }

  class FakeBackend {
    constructor() {
      this.id = ++backendSerial
      this.capabilities = {
        colorBufferFloat: true,
        floatBlend: true,
        floatLinear: true,
        maxDrawBuffers: 8,
        maxTextureSize: options.backendMaxSize ?? 192,
        ...options.backendCapabilities,
      }
      this.maxTextureUnits = options.maxTextureUnits ?? 3
      this.presentedTextureId = undefined
      this.destroyed = false
    }

    init() {
      gpu(`backend-init:${this.dsl}`)
      const pending = options.initDeferred?.get(this.dsl)
      if (options.postReturnGpuDsl === this.dsl) {
        return Promise.resolve().then(() => gpu(`late-backend-init:${this.dsl}`))
      }
      return pending?.promise ?? Promise.resolve()
    }

    compileProgram(program) {
      gpu(`shader-compile:${this.dsl}:${program}`)
      return Promise.resolve()
    }

    getPresentedTextureInfo() {
      gpu(`presented-info:${this.dsl}`)
      if (this.presentedTextureId === undefined) {
        const error = new Error('no texture was presented')
        error.code = 'ERR_MISSING_PRESENTED_TEXTURE_ID'
        throw error
      }
      return {
        format: 'rgba16f',
        handle: `handle:${this.presentedTextureId}`,
        height: this.height,
        id: this.presentedTextureId,
        width: this.width,
      }
    }

    updateTextureFromSource(id) {
      gpu(`async-upload:${this.dsl}:${id}`)
      return { height: 4, width: 4 }
    }

    destroy() {
      gpu(`backend-destroy:${this.dsl}`)
      this.destroyed = true
    }
  }

  class FakePipeline {
    constructor(graph, backend) {
      this.backend = backend
      this.graph = graph
      this.id = ++pipelineSerial
      this.isCompiling = false
      this.renderTimes = []
      this._asyncDebounceTimers = new Map()
      backend.dsl = graph.dsl
      pipelines.push(this)
      if (options.debounceTimerDsl?.has(graph.dsl)) {
        const timer = setTimeout(() => {
          this._asyncDebounceTimers.delete(graph.dsl)
          events.push(`debounce-fired:${graph.dsl}`)
        }, 50)
        this._asyncDebounceTimers.set(graph.dsl, timer)
      }
    }

    resolveProgramSpec(pass) {
      return this.graph.programs.get(pass.program)
    }

    setMidiState(midiState) {
      cpu(`midi-state:${this.graph.dsl}`)
      this.midiState = midiState
    }

    setAudioState(audioState) {
      cpu(`audio-state:${this.graph.dsl}`)
      this.audioState = audioState
    }

    resize(width, height) {
      gpu(`resize:${this.graph.dsl}:${width}x${height}`)
      this.backend.width = width
      this.backend.height = height
      this.width = width
      this.height = height
      if (this.graph.delayedUpload) {
        queueMicrotask(() => this.backend.updateTextureFromSource('overlay-step-0', {}))
      }
    }

    setUniform(name, value) {
      gpu(`uniform:${this.graph.dsl}:${name}:${JSON.stringify(value)}`)
    }

    syncTime(time) {
      gpu(`sync-time:${this.graph.dsl}:${time}`)
      this.syncedTime = time
    }

    render(time) {
      gpu(`render:${this.graph.dsl}:${time}`)
      this.renderTimes.push(time)
      if (renderFailureCount > 0) {
        renderFailureCount -= 1
        throw new Error(`render failed for ${this.graph.dsl}`)
      }
      if (!options.noPresentDsl?.has(this.graph.dsl)) {
        this.backend.presentedTextureId = `surface:${this.graph.dsl}:${time}`
      }
    }

      dispose() {
        gpu(`pipeline-dispose:${this.graph.dsl}`)
      if (controller) {
        events.push(`dispose-sees-active:${controller.getState().activeDsl}`)
      }
      this.backend.destroy()
      const remainingFailures = disposeFailureCountByDsl.get(this.graph.dsl) ?? 0
      if (remainingFailures > 0) {
        disposeFailureCountByDsl.set(this.graph.dsl, remainingFailures - 1)
        throw new Error(`dispose failed for ${this.graph.dsl}`)
      }
      if (options.disposeFailureDsl === this.graph.dsl) {
        throw new Error(`dispose failed for ${this.graph.dsl}`)
      }
    }
  }

  const engine = {
    Pipeline: options.PipelineClass ?? FakePipeline,
    async compileProgram(dsl) {
      cpu(`compile:${dsl}`)
      compileCalls.push(dsl)
      if (options.compileFailureDsl === dsl) throw new Error(`compile failed for ${dsl}`)
      const pending = options.compileDeferred?.get(dsl)
      if (pending) await pending.promise
      return graphFor(dsl, {
        delayedUpload: options.delayedUploadDsl === dsl,
        ...options.graphOptionsByDsl?.get(dsl),
      })
    },
  }

  const engineLoader = async () => {
    cpu('engine-load')
    if (options.engineFailure) throw options.engineFailure
    return engine
  }

  const backendFactory = () => {
    cpu('backend-create')
    return options.backendFactory?.({ canvas, cgl, gl }) ?? new FakeBackend()
  }
  const createOutputTexture = (spec) => {
    gpu(`output-create:${spec.width}x${spec.height}`)
    const texture = {
      height: spec.height,
      id: `output-${++textureSerial}`,
      spec,
      tex: { id: `raw-output-${textureSerial}` },
      width: spec.width,
    }
    createdTextures.push(texture)
    return texture
  }
  const destroyOutputTexture = (texture) => {
    gpu(`output-destroy:${texture.id}`)
    destroyedTextures.push(texture)
  }
  const outputCopierFactory = ({ createTexture, destroyTexture }) => {
    const id = ++outputCopierSerial
    let texture = null
    let disposed = false
    return {
      copy(source) {
        gpu(`output-copy:${id}:${source.id}`)
        if (options.copyFailure) throw options.copyFailure
        return texture
      },
      dispose() {
        gpu(`output-copier-dispose:${id}`)
        if (outputDisposeFailureCount > 0) {
          outputDisposeFailureCount -= 1
          throw new Error(`output copier ${id} dispose failed`)
        }
        if (disposed) return
        disposed = true
        if (texture) destroyTexture(texture)
        texture = null
      },
      getTexture: () => texture,
      resize(width, height) {
        gpu(`output-resize:${id}:${width}x${height}`)
        if (texture?.width === width && texture?.height === height) return texture
        if (texture && options.outputResizeFailureSize === `${width}x${height}`) {
          throw new Error(`output resize failed for ${width}x${height}`)
        }
        const previous = texture
        texture = createTexture({ height, width })
        if (previous) destroyTexture(previous)
        return texture
      },
    }
  }

  const bindInputTexture = ({ backend, graph, pipeline, texture }) => {
    gpu(`input-bind:${graph.dsl}:${texture?.id ?? 'null'}`)
    backend.boundInput = texture ?? null
    pipeline.boundInput = texture ?? null
    return { ids: ['imageTex_step_0'], texture: texture ?? null }
  }

  const stateGuard = (_gl, _cgl, callback, guardOptions) => {
    events.push(`guard-enter:${guardOptions.maxTextureUnits ?? 'all'}`)
    if (options.guardFailureCode) {
      const error = new Error(`guard failed with ${options.guardFailureCode}`)
      error.code = options.guardFailureCode
      throw error
    }
    guardDepth += 1
    try {
      const value = callback()
      assert.equal(typeof value?.then, 'undefined', 'guard callbacks must be synchronous')
      return value
    } finally {
      guardDepth -= 1
      events.push('guard-exit')
    }
  }
  const prepareGLState = (_gl, prepareOptions) => {
    assert.ok(guardDepth > 0, 'canonical guest state must be established inside the guard')
    events.push(`baseline:${prepareOptions.maxTextureUnits ?? 'all'}`)
  }
  const onStateChange = (state) => {
    assert.equal(guardDepth, 0, 'state publication must stay outside the GL guard')
    publications.push(state)
    return options.onStateChange?.(state)
  }

  controller = createProgramController({
    CGL,
    audioState: options.audioState,
    backendFactory,
    bindInputTexture,
    capabilityInspector: options.capabilityInspector,
    canvas,
    cgl,
    createOutputTexture,
    destroyOutputTexture,
    engineLoader,
    midiState: options.midiState,
    onStateChange,
    outputCopierFactory,
    prepareGLState,
    stateGuard,
  })

  return {
    CGL,
    cgl,
    compileCalls,
    controller,
    createdTextures,
    destroyedTextures,
    events,
    gl,
    guardDepth: () => guardDepth,
    publications,
    pipelines,
  }
}

test('initial configure preserves DSL bytes and separates CPU compilation from short guarded GPU phases', async () => {
  const harness = createHarness()
  const dsl = 'search synth\n\nsolid(color: #336699).write(o0)\nrender(o0)\n'

  const state = await harness.controller.configure({
    dsl,
    size: { height: 45, mode: 'manual', width: 80 },
  })

  assert.deepEqual(harness.compileCalls, [dsl])
  assert.equal(state.lifecycle, 'active')
  assert.equal(state.build, 'idle')
  assert.equal(state.desiredDsl, dsl)
  assert.equal(state.activeDsl, dsl)
  assert.deepEqual(state.activeSize, { height: 45, width: 80 })
  assert.equal(state.ready, true)
  assert.equal(state.error, null)
  assert.equal(state.texture.id, 'output-1')
  assert.ok(harness.events.indexOf(`cpu:compile:${dsl}`) < harness.events.indexOf(`gpu:backend-init:${dsl}`))
  assert.equal(
    harness.events.filter((event) => event.startsWith('guard-enter')).length,
    harness.events.filter((event) => event.startsWith('baseline:')).length,
  )
  assert.ok(harness.publications.length >= 2)
})

test('only the newest asynchronous generation promotes and stale initialized candidates dispose guarded', async () => {
  const oldInit = deferred()
  const initDeferred = new Map([['old dsl', oldInit]])
  const harness = createHarness({ initDeferred })

  const oldBuild = harness.controller.setProgram('old dsl')
  await waitImmediate()
  const newBuild = harness.controller.setProgram('new dsl')
  await newBuild
  oldInit.resolve()
  await oldBuild

  assert.equal(harness.controller.getState().activeDsl, 'new dsl')
  assert.ok(
    harness.events.includes('gpu:pipeline-dispose:old dsl'),
    harness.events.join('\n'),
  )
  assert.ok(harness.events.includes('gpu:backend-destroy:old dsl'))
  assert.equal(harness.events.includes('gpu:output-copy:1:surface:old dsl:0'), false)
})

test('a failed edit retains the last-good pipeline and stable output texture', async () => {
  const harness = createHarness({ compileFailureDsl: 'invalid dsl' })
  await harness.controller.setProgram('valid dsl')
  const before = harness.controller.getState()

  const after = await harness.controller.setProgram('invalid dsl')

  assert.equal(after.ready, true)
  assert.equal(after.activeDsl, 'valid dsl')
  assert.equal(after.desiredDsl, 'invalid dsl')
  assert.equal(after.texture, before.texture)
  assert.ok(after.error instanceof ControllerError)
  assert.equal(after.error.code, 'ERR_DSL_COMPILE')
  assert.equal(after.error.phase, 'compile')
  assert.equal(harness.events.includes('pipeline-dispose:valid dsl'), false)
})

test('promotion assigns the new candidate before old disposal and keeps same-size output identity', async () => {
  const harness = createHarness()
  await harness.controller.configure({
    dsl: 'first dsl',
    size: { height: 64, mode: 'manual', width: 64 },
  })
  const output = harness.controller.getState().texture

  await harness.controller.setProgram('second dsl')

  assert.equal(harness.controller.getState().texture, output)
  assert.ok(harness.events.includes('dispose-sees-active:second dsl'))
})

test('configure coalesces DSL and size into one generation and clamps manual/canvas dimensions', async () => {
  const harness = createHarness({ backendMaxSize: 192, deviceMaxSize: 4096 })
  const initialGeneration = harness.controller.getState().generation

  const manual = await harness.controller.configure({
    dsl: 'sized dsl',
    size: { height: 0, mode: 'manual', width: 999 },
  })

  assert.equal(manual.generation, initialGeneration + 1)
  assert.deepEqual(manual.requestedSize, { height: 0, mode: 'manual', width: 999 })
  assert.deepEqual(manual.activeSize, { height: 1, width: 192 })

  const canvas = await harness.controller.setSize({
    height: 222,
    mode: 'canvas',
    width: 333,
  })
  assert.deepEqual(canvas.activeSize, { height: 192, width: 192 })
})

test('render jobs serialize normalized times, clear stale presentation, and publish after copying', async () => {
  const harness = createHarness()
  await harness.controller.setProgram('render dsl')
  const output = harness.controller.getState().texture

  const first = harness.controller.render(0.125)
  const second = harness.controller.render(0.5)
  const [firstResult, secondResult] = await Promise.all([first, second])

  assert.equal(firstResult.rendered, true)
  assert.equal(secondResult.rendered, true)
  assert.equal(firstResult.texture, output)
  assert.equal(secondResult.texture, output)
  assert.ok(
    harness.events.indexOf('gpu:render:render dsl:0.125') <
      harness.events.indexOf('gpu:render:render dsl:0.5'),
  )
  assert.ok(
    harness.events.indexOf('gpu:presented-info:render dsl') <
      harness.events.findLastIndex((event) => event.startsWith('gpu:output-copy:')),
  )
})

test('media replacement and disconnect rebind without deleting any host texture', async () => {
  const harness = createHarness()
  const first = { height: 4, id: 'input-a', tex: {}, width: 4 }
  const second = { height: 8, id: 'input-b', tex: {}, width: 8 }
  await harness.controller.setProgram('media dsl')

  await harness.controller.setInputTexture(first)
  await harness.controller.setInputTexture(second)
  await harness.controller.setInputTexture(null)

  assert.ok(harness.events.includes('gpu:input-bind:media dsl:input-a'))
  assert.ok(harness.events.includes('gpu:input-bind:media dsl:input-b'))
  assert.ok(harness.events.includes('gpu:input-bind:media dsl:null'))
  assert.deepEqual(harness.destroyedTextures.filter((texture) => texture === first || texture === second), [])
})

test('reset rebuilds stateful resources without replacing a same-size output object', async () => {
  const harness = createHarness()
  await harness.controller.setProgram('feedback dsl')
  const before = harness.controller.getState()
  const pipelineDisposals = harness.events.filter(
    (event) => event === 'gpu:pipeline-dispose:feedback dsl',
  ).length

  const after = await harness.controller.reset()

  assert.equal(after.activeDsl, 'feedback dsl')
  assert.equal(after.texture, before.texture)
  assert.ok(after.activeGeneration > before.activeGeneration)
  assert.equal(
    harness.events.filter((event) => event === 'gpu:pipeline-dispose:feedback dsl').length,
    pipelineDisposals + 1,
    harness.events.join('\n'),
  )
})

test('context loss performs no GL work and restoration rebuilds last-good DSL before an invalid desired edit', async () => {
  const harness = createHarness({ compileFailureDsl: 'invalid desired dsl' })
  await harness.controller.setProgram('last good dsl')
  await harness.controller.setProgram('invalid desired dsl')
  const eventsBeforeLoss = harness.events.length

  const lost = harness.controller.handleContextLost()

  assert.equal(lost.lifecycle, 'context-lost')
  assert.equal(lost.ready, false)
  assert.equal(lost.texture, null)
  assert.equal(harness.events.length, eventsBeforeLoss, 'context loss must issue no guard or GL call')

  await harness.controller.setSize({ height: 96, mode: 'manual', width: 96 })

  const restored = await harness.controller.handleContextRestored()
  assert.equal(restored.lifecycle, 'active')
  assert.equal(restored.activeDsl, 'last good dsl')
  assert.equal(restored.desiredDsl, 'invalid desired dsl')
  assert.equal(restored.ready, true)
  assert.notEqual(restored.texture, null)
  assert.deepEqual(restored.activeSize, { height: 96, width: 96 })
  assert.equal(harness.compileCalls.at(-1), 'last good dsl')
})

test('external input states persist across active, in-flight, and restored pipelines', async () => {
  const initialMidiState = { id: 'midi-initial' }
  const initialAudioState = { id: 'audio-initial' }
  const nextMidiState = { id: 'midi-next' }
  const nextAudioState = { id: 'audio-next' }
  const initDeferred = new Map([['second dsl', deferred()]])
  const harness = createHarness({
    audioState: initialAudioState,
    initDeferred,
    midiState: initialMidiState,
  })

  await harness.controller.setProgram('first dsl')
  assert.equal(harness.pipelines[0].midiState, initialMidiState)
  assert.equal(harness.pipelines[0].audioState, initialAudioState)

  const building = harness.controller.setProgram('second dsl')
  await waitImmediate()
  assert.equal(harness.pipelines.length, 2)

  harness.controller.setMidiState(nextMidiState)
  harness.controller.setAudioState(nextAudioState)
  assert.equal(harness.pipelines[0].midiState, nextMidiState)
  assert.equal(harness.pipelines[0].audioState, nextAudioState)
  assert.equal(harness.pipelines[1].midiState, nextMidiState)
  assert.equal(harness.pipelines[1].audioState, nextAudioState)

  initDeferred.get('second dsl').resolve()
  await building
  harness.controller.handleContextLost()
  await harness.controller.handleContextRestored()

  const restored = harness.pipelines.at(-1)
  assert.equal(restored.midiState, nextMidiState)
  assert.equal(restored.audioState, nextAudioState)

  harness.controller.setMidiState(null)
  harness.controller.setAudioState(null)
  assert.equal(restored.midiState, null)
  assert.equal(restored.audioState, null)
})

test('restoration rebuilds last-good state and then replays the newest DSL edited while context-lost', async () => {
  const harness = createHarness()
  await harness.controller.setProgram('last good before loss')

  harness.controller.handleContextLost()
  await harness.controller.setProgram('superseded lost-context edit')
  await harness.controller.setProgram('newest lost-context edit')
  const compileCountBeforeRestore = harness.compileCalls.length

  const restored = await harness.controller.handleContextRestored()

  assert.equal(restored.lifecycle, 'active')
  assert.equal(restored.activeDsl, 'newest lost-context edit')
  assert.equal(restored.desiredDsl, 'newest lost-context edit')
  assert.equal(restored.ready, true)
  assert.deepEqual(
    harness.compileCalls.slice(compileCountBeforeRestore),
    ['last good before loss', 'newest lost-context edit'],
  )
  assert.equal(harness.compileCalls.includes('superseded lost-context edit'), false)
})

test('render failure preserves the last successful output and rebuilds before accepting another frame', async () => {
  const harness = createHarness({ renderFailureCount: 1 })
  await harness.controller.setProgram('recoverable dsl')
  const output = harness.controller.getState().texture

  const failed = await harness.controller.render(0.25)
  assert.equal(failed.rendered, false)
  assert.equal(failed.reason, 'render-error')
  assert.equal(failed.texture, output)
  assert.ok(failed.error instanceof ControllerError)
  assert.equal(failed.error.code, 'ERR_RENDER')

  const recovered = await harness.controller.render(0.5)
  assert.equal(recovered.rendered, true)
  assert.equal(recovered.texture, output)
  assert.ok(
    harness.events.includes('gpu:pipeline-dispose:recoverable dsl'),
    harness.events.join('\n'),
  )
  assert.equal(harness.compileCalls.filter((dsl) => dsl === 'recoverable dsl').length, 2)
})

test('render recovery waits for a newer pending desired edit instead of staling it', async () => {
  const pendingEdit = deferred()
  const harness = createHarness({
    compileDeferred: new Map([['new desired dsl', pendingEdit]]),
    renderFailureCount: 1,
  })
  await harness.controller.setProgram('old recoverable dsl')
  const failed = await harness.controller.render(0.25)
  assert.equal(failed.rendered, false)

  const editBuild = harness.controller.setProgram('new desired dsl')
  await waitImmediate()
  const whilePending = await harness.controller.render(0.5)

  assert.equal(whilePending.rendered, false)
  assert.equal(whilePending.reason, 'not-ready')
  assert.equal(
    harness.compileCalls.filter((dsl) => dsl === 'old recoverable dsl').length,
    1,
  )

  pendingEdit.resolve()
  await editBuild
  assert.equal(harness.controller.getState().activeDsl, 'new desired dsl')
  assert.equal((await harness.controller.render(0.75)).rendered, true)
})

test('delayed async effect texture uploads re-enter the FIFO guard for the current context epoch', async () => {
  const harness = createHarness({ delayedUploadDsl: 'async effect dsl' })

  await harness.controller.setProgram('async effect dsl')
  await waitImmediate()

  assert.ok(harness.events.includes('gpu:async-upload:async effect dsl:overlay-step-0'))
  const uploadIndex = harness.events.indexOf('gpu:async-upload:async effect dsl:overlay-step-0')
  assert.ok(harness.events.slice(0, uploadIndex).lastIndexOf('guard-enter:3') >= 0)
})

test('a backend that performs GPU work after returning its promise is detected as an initialization error', async () => {
  const harness = createHarness({ postReturnGpuDsl: 'bad async backend' })

  const state = await harness.controller.setProgram('bad async backend')

  assert.equal(state.ready, false)
  assert.ok(state.error instanceof ControllerError)
  assert.equal(state.error.code, 'ERR_PIPELINE_INITIALIZE')
  assert.match(state.error.cause.message, /must run inside the GL guard/)
})

test('every shared complete-catalog failure stops before backend creation, init, or shader compile', async (t) => {
  const cases = [
    ['webgl2', { webgl2: false }],
    ['colorBufferFloat', { missingExtension: 'EXT_color_buffer_float' }],
    ['floatLinear', { missingExtension: 'OES_texture_float_linear' }],
    ['floatBlend', { missingExtension: 'EXT_float_blend' }],
    ['maxTextureSize', { deviceMaxSize: 4095 }],
    ['maxDrawBuffers', { deviceMaxDrawBuffers: 3 }],
    ['maxTextureUnits', { deviceMaxTextureUnits: 8 }],
    ['maxUniformBlockSize', { deviceMaxUniformBlockSize: 16_383 }],
    ['maxUniformBufferBindings', { deviceMaxUniformBufferBindings: 7 }],
    ['cglCacheCompatible', { missingCglCache: true }],
  ]

  for (const [capability, options] of cases) {
    await t.test(capability, async () => {
      const harness = createHarness(options)
      const expected = inspectCapabilities(harness.cgl, { CGL: harness.CGL }).failures[0]
      const state = await harness.controller.setProgram(`unsupported ${capability}`)

      assert.equal(state.ready, false)
      assert.ok(state.error instanceof ControllerError)
      assert.equal(state.error.code, 'ERR_CAPABILITY')
      assert.equal(state.error.phase, 'capability')
      assert.equal(state.error.capability, expected.capability)
      assert.equal(state.error.capabilityCode, expected.capabilityCode)
      assert.equal(state.error.actual, expected.actual)
      assert.equal(state.error.required, expected.required)
      assert.equal(state.error.message, expected.message)
      assert.equal(harness.events.includes('cpu:backend-create'), false)
      assert.equal(
        harness.events.some((event) => event.startsWith('gpu:backend-init:')),
        false,
      )
      assert.equal(
        harness.events.some((event) => event.startsWith('gpu:shader-compile:')),
        false,
      )
    })
  }
})

test('shared capability preflight reruns after context restoration before touching a new backend', async () => {
  let inspections = 0
  let floatLinearAvailable = true
  const capabilityInspector = (cgl, inspectorOptions) => {
    inspections += 1
    return inspectCapabilities(cgl, inspectorOptions)
  }
  const harness = createHarness({ capabilityInspector, deviceMaxSize: 4096 })
  const getExtension = harness.gl.getExtension.bind(harness.gl)
  harness.gl.getExtension = (name) => (
    name === 'OES_texture_float_linear' && !floatLinearAvailable
      ? null
      : getExtension(name)
  )
  const initial = await harness.controller.setProgram('restorable capability dsl')
  assert.equal(initial.ready, true)
  assert.equal(inspections, 1)
  assert.equal(harness.events.filter((event) => event === 'cpu:backend-create').length, 1)

  harness.controller.handleContextLost()
  floatLinearAvailable = false
  const expected = inspectCapabilities(harness.cgl, { CGL: harness.CGL }).failures[0]
  const restored = await harness.controller.handleContextRestored()

  assert.equal(inspections, 2)
  assert.equal(restored.ready, false)
  assert.equal(restored.error.capability, expected.capability)
  assert.equal(restored.error.capabilityCode, expected.capabilityCode)
  assert.equal(restored.error.actual, expected.actual)
  assert.equal(restored.error.required, expected.required)
  assert.equal(harness.events.filter((event) => event === 'cpu:backend-create').length, 1)
})

test('graph uniform-block overflow uses the shared public capability identity before shader execution', async () => {
  const dsl = 'oversized graph uniform block'
  const capabilityReport = completeCapabilityReport({
    limits: { maxUniformBlockSize: 16 },
  })
  const harness = createHarness({
    capabilityInspector: () => capabilityReport,
    deviceMaxUniformBlockSize: 16_383,
    graphOptionsByDsl: new Map([[dsl, {
      programSpec: { uniformLayout: [{ slot: 1 }] },
    }]]),
  })
  const publicFailure = inspectCapabilities(harness.cgl, { CGL: harness.CGL })
    .failures.find((failure) => failure.capability === 'maxUniformBlockSize')
  assert.ok(publicFailure)

  const state = await harness.controller.setProgram(dsl)

  assert.equal(state.ready, false)
  assert.equal(state.error.code, 'ERR_CAPABILITY')
  assert.equal(state.error.phase, 'capability')
  assert.equal(state.error.capability, publicFailure.capability)
  assert.equal(state.error.capabilityCode, publicFailure.capabilityCode)
  assert.equal(state.error.actual, 16)
  assert.equal(state.error.required, 32)
  assert.equal(
    harness.events.some((event) => event.startsWith('gpu:shader-compile:')),
    false,
  )
  assert.equal(
    harness.events.some((event) => event.startsWith('gpu:output-resize:')),
    false,
  )
})

test('all graph-specific defenses retain shared public capability identities', async (t) => {
  const cases = [
    {
      actual: 2,
      capability: 'maxDrawBuffers',
      harnessOptions: {
        backendCapabilities: { maxDrawBuffers: 2 },
        deviceMaxDrawBuffers: 3,
      },
      pass: { outputs: { a: {}, b: {}, c: {} } },
      required: 3,
    },
    {
      actual: 2,
      capability: 'maxTextureUnits',
      harnessOptions: {
        deviceMaxTextureUnits: 8,
        maxTextureUnits: 2,
      },
      pass: { inputs: { a: {}, b: {}, c: {} } },
      required: 3,
    },
    {
      actual: false,
      capability: 'floatBlend',
      harnessOptions: {
        backendCapabilities: { floatBlend: false },
        missingExtension: 'EXT_float_blend',
      },
      pass: { blend: true },
      required: true,
    },
    {
      actual: 0,
      capability: 'maxUniformBufferBindings',
      harnessOptions: { deviceMaxUniformBufferBindings: 7 },
      programSpec: { uniformLayout: [{ slot: 0 }] },
      reportOptions: { limits: { maxUniformBufferBindings: 0 } },
      required: 1,
    },
  ]

  for (const graphCase of cases) {
    await t.test(graphCase.capability, async () => {
      const dsl = `graph defense ${graphCase.capability}`
      const capabilityReport = completeCapabilityReport(graphCase.reportOptions)
      const harness = createHarness({
        ...graphCase.harnessOptions,
        capabilityInspector: () => capabilityReport,
        graphOptionsByDsl: new Map([[dsl, {
          pass: graphCase.pass,
          programSpec: graphCase.programSpec,
        }]]),
      })
      const publicFailure = inspectCapabilities(harness.cgl, { CGL: harness.CGL })
        .failures.find((failure) => failure.capability === graphCase.capability)
      assert.ok(publicFailure)

      const state = await harness.controller.setProgram(dsl)

      assert.equal(state.ready, false)
      assert.equal(state.error.code, 'ERR_CAPABILITY')
      assert.equal(state.error.phase, 'capability')
      assert.equal(state.error.capability, publicFailure.capability)
      assert.equal(state.error.capabilityCode, publicFailure.capabilityCode)
      assert.equal(state.error.actual, graphCase.actual)
      assert.equal(state.error.required, graphCase.required)
      assert.equal(
        harness.events.some((event) => event.startsWith('gpu:shader-compile:')),
        false,
      )
      assert.equal(
        harness.events.some((event) => event.startsWith('gpu:output-resize:')),
        false,
      )
    })
  }
})

test('dispose is idempotent and all later controller methods become no-op stable results', async () => {
  const harness = createHarness()
  await harness.controller.setProgram('dispose dsl')
  await harness.controller.dispose()
  const eventCount = harness.events.length

  await harness.controller.dispose()
  await harness.controller.setProgram('ignored dsl')
  await harness.controller.setSize({ height: 20, mode: 'manual', width: 20 })
  await harness.controller.setInputTexture({ height: 1, id: 'ignored', tex: {}, width: 1 })
  await harness.controller.reset()
  await harness.controller.handleContextRestored()
  const render = await harness.controller.render(1)

  assert.equal(harness.events.length, eventCount)
  assert.equal(harness.controller.getState().lifecycle, 'disposed')
  assert.equal(harness.controller.getState().ready, false)
  assert.equal(harness.controller.getState().texture, null)
  assert.equal(render.rendered, false)
  assert.equal(render.reason, 'disposed')
})

test('dispose releases an initialized candidate even while its init promise is pending', async () => {
  const pendingInit = deferred()
  const harness = createHarness({
    initDeferred: new Map([['pending dispose dsl', pendingInit]]),
  })
  const build = harness.controller.setProgram('pending dispose dsl')
  await waitImmediate()

  await harness.controller.dispose()
  pendingInit.resolve()
  await build

  assert.ok(harness.events.includes('gpu:pipeline-dispose:pending dispose dsl'))
  assert.ok(harness.events.includes('gpu:backend-destroy:pending dispose dsl'))
})

test('stale candidate cleanup failures are surfaced, retained, and retried on final disposal', async () => {
  const staleInit = deferred()
  const harness = createHarness({
    disposeFailureCountByDsl: new Map([['stale cleanup dsl', 1]]),
    initDeferred: new Map([['stale cleanup dsl', staleInit]]),
  })
  const staleBuild = harness.controller.setProgram('stale cleanup dsl')
  await waitImmediate()
  await harness.controller.setProgram('winning cleanup dsl')
  staleInit.resolve()
  await staleBuild

  assert.equal(harness.controller.getState().activeDsl, 'winning cleanup dsl')
  assert.equal(harness.controller.getState().error?.code, 'ERR_DISPOSAL')
  assert.equal(
    harness.events.filter(
      (event) => event === 'gpu:pipeline-dispose:stale cleanup dsl',
    ).length,
    1,
  )

  await harness.controller.dispose()
  assert.equal(
    harness.events.filter(
      (event) => event === 'gpu:pipeline-dispose:stale cleanup dsl',
    ).length,
    1,
  )
  assert.equal(
    harness.events.filter(
      (event) => event === 'gpu:backend-destroy:stale cleanup dsl',
    ).length,
    2,
  )
})

test('failed replaced-candidate cleanup remains retryable after the new candidate is active', async () => {
  const harness = createHarness({
    disposeFailureCountByDsl: new Map([['replaced cleanup dsl', 1]]),
  })
  await harness.controller.setProgram('replaced cleanup dsl')
  const promoted = await harness.controller.setProgram('replacement winner dsl')

  assert.equal(promoted.activeDsl, 'replacement winner dsl')
  assert.equal(promoted.ready, true)
  assert.equal(promoted.error?.code, 'ERR_DISPOSAL')

  await harness.controller.dispose()
  assert.equal(
    harness.events.filter(
      (event) => event === 'gpu:pipeline-dispose:replaced cleanup dsl',
    ).length,
    1,
  )
  assert.equal(
    harness.events.filter(
      (event) => event === 'gpu:backend-destroy:replaced cleanup dsl',
    ).length,
    2,
  )
})

test('final dispose retries only candidate and output resources whose cleanup failed', async () => {
  const harness = createHarness({
    disposeFailureCountByDsl: new Map([['final retry dsl', 1]]),
    outputDisposeFailureCount: 1,
  })
  await harness.controller.setProgram('final retry dsl')

  const first = await harness.controller.dispose()
  assert.equal(first.lifecycle, 'disposed')
  assert.equal(first.error?.code, 'ERR_DISPOSAL')

  const second = await harness.controller.dispose()
  assert.equal(second.lifecycle, 'disposed')
  assert.equal(second.error, null)
  assert.equal(
    harness.events.filter((event) => event === 'gpu:pipeline-dispose:final retry dsl').length,
    1,
  )
  assert.equal(
    harness.events.filter((event) => event === 'gpu:backend-destroy:final retry dsl').length,
    2,
  )
  assert.equal(
    harness.events.filter((event) => event === 'gpu:output-copier-dispose:1').length,
    2,
  )

  const eventCount = harness.events.length
  await harness.controller.dispose()
  assert.equal(harness.events.length, eventCount)
})

test('final dispose retries a retained backend after terminal core Pipeline disposal fails', async () => {
  installTestDomShim()
  const { Pipeline } = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
  const { CablesWebGL2Backend } = await import(
    '../src/backend/cables-webgl2-backend.js'
  )
  let deleteBufferCount = 0
  let deleteTextureCount = 0
  let productionBackend
  class TerminalCorePipeline extends Pipeline {
    resize(width, height) {
      this.backend.textures.set('owned-retry', {
        format: 'rgba16f',
        handle: 'owned-retry-handle',
        height,
        width,
      })
      this.backend.textureOwnership.set('owned-retry', 'owned')
      this.backend.height = height
      this.backend.width = width
      this.height = height
      this.width = width
    }
  }
  const harness = createHarness({
    backendFactory({ canvas, cgl, gl }) {
      gl.deleteBuffer = () => {
        deleteBufferCount += 1
        if (deleteBufferCount === 1) throw new Error('transient deleteBuffer failure')
      }
      gl.deleteTexture = () => {
        deleteTextureCount += 1
        if (deleteTextureCount <= 2) throw new Error('transient deleteTexture failure')
      }
      const backend = new CablesWebGL2Backend(cgl, canvas)
      backend.init = async () => {}
      backend.compileProgram = async () => {}
      backend._fullscreenBuffer = { id: 'fullscreen-buffer' }
      productionBackend = backend
      return backend
    },
    PipelineClass: TerminalCorePipeline,
  })
  const configured = await harness.controller.setProgram('terminal cleanup dsl')
  assert.equal(configured.error, null)
  assert.equal(configured.ready, true)

  const first = await harness.controller.dispose()
  assert.equal(first.error?.code, 'ERR_DISPOSAL')

  const second = await harness.controller.dispose()
  assert.equal(second.error, null)
  assert.equal(deleteBufferCount, 2)
  assert.equal(deleteTextureCount, 3)
  assert.equal(productionBackend._destroyed, true)
  assert.equal(productionBackend.gl, null)
  assert.equal(productionBackend.textures.has('owned-retry'), false)
})

test('state callbacks run outside guards and rejected callback promises never poison controller work', async () => {
  const callbackFailure = new Error('observer rejected')
  const harness = createHarness({ onStateChange: () => Promise.reject(callbackFailure) })

  await harness.controller.setProgram('observable dsl')
  const rendered = await harness.controller.render(0.75)

  assert.equal(rendered.rendered, true)
  assert.equal(harness.guardDepth(), 0)
  assert.ok(harness.publications.length > 0)
})

test('every pipeline disposal clears pending async debounce timers before they can fire', async () => {
  const harness = createHarness({
    debounceTimerDsl: new Set(['timed first dsl', 'timed second dsl']),
  })
  await harness.controller.setProgram('timed first dsl')
  const first = harness.pipelines.at(-1)

  await harness.controller.setProgram('timed second dsl')
  const second = harness.pipelines.at(-1)
  assert.equal(first._asyncDebounceTimers.size, 0)

  await harness.controller.dispose()
  assert.equal(second._asyncDebounceTimers.size, 0)
  await waitTimeout(70)
  assert.equal(
    harness.events.some((event) => event.startsWith('debounce-fired:')),
    false,
  )
})

test('the active last-good candidate may finish delayed uploads during a pending edit', async () => {
  const pendingCompile = deferred()
  const harness = createHarness({
    compileDeferred: new Map([['pending edit dsl', pendingCompile]]),
  })
  await harness.controller.setProgram('last good upload dsl')
  const lastGood = harness.pipelines.at(-1)

  const pendingBuild = harness.controller.setProgram('pending edit dsl')
  await waitImmediate()
  await lastGood.backend.updateTextureFromSource('progressive-last-good', {})

  assert.equal(
    harness.events.includes(
      'gpu:async-upload:last good upload dsl:progressive-last-good',
    ),
    true,
  )
  pendingCompile.resolve()
  await pendingBuild
})

test('delayed uploads from a stale unpromoted generation never enter the GL guard', async () => {
  const staleInit = deferred()
  const harness = createHarness({
    initDeferred: new Map([['stale unpromoted dsl', staleInit]]),
  })
  const staleBuild = harness.controller.setProgram('stale unpromoted dsl')
  await waitImmediate()
  const stale = harness.pipelines.at(-1)

  await harness.controller.setProgram('winning dsl')
  await stale.backend.updateTextureFromSource('late-stale-candidate', {})

  assert.equal(
    harness.events.includes(
      'gpu:async-upload:stale unpromoted dsl:late-stale-candidate',
    ),
    false,
  )
  staleInit.resolve()
  await staleBuild
})

test('an output resize failure retains the complete last-good transaction', async () => {
  const harness = createHarness({ outputResizeFailureSize: '96x96' })
  await harness.controller.configure({
    dsl: 'stable output dsl',
    size: { height: 64, mode: 'manual', width: 64 },
  })
  const before = harness.controller.getState()

  const failed = await harness.controller.configure({
    dsl: 'replacement output dsl',
    size: { height: 96, mode: 'manual', width: 96 },
  })

  assert.equal(failed.activeDsl, 'stable output dsl')
  assert.deepEqual(failed.activeSize, { height: 64, width: 64 })
  assert.equal(failed.texture, before.texture)
  assert.equal(failed.ready, true)
  assert.ok(failed.error instanceof ControllerError)
  assert.equal(failed.error.code, 'ERR_ALLOCATION')
  assert.equal(
    harness.events.includes('gpu:pipeline-dispose:stable output dsl'),
    false,
  )
  assert.ok(harness.events.includes('gpu:pipeline-dispose:replacement output dsl'))
})
