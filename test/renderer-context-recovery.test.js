import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

// The vendored core bundles the upstream CanvasRenderer (upstream 7153bec4
// adds the WebGPU device-loss watch on top of the WebGL context-loss
// orchestration). These tests exercise its WebGL context-loss recovery and
// WebGPU device-loss recovery in Node with the leaf runtime build step
// replaced, so the recovery paths stay covered without a GPU device.

const CONTEXT_RESTORE_WAIT_MS = 3000
const settlePastRecoveryWindow = () =>
  new Promise((resolve) => setTimeout(resolve, CONTEXT_RESTORE_WAIT_MS + 300))

function installRendererDomShim() {
  globalThis.HTMLElement ||= class {}
  globalThis.HTMLCanvasElement ||= class {
    addEventListener() {}
    removeEventListener() {}
  }
  // The renderer's canvas observer intercepts the prototype's width/height
  // accessors, so the shim must provide them.
  for (const dimension of ['width', 'height']) {
    const prototype = globalThis.HTMLCanvasElement.prototype
    if (!Object.getOwnPropertyDescriptor(prototype, dimension)) {
      const storage = new WeakMap()
      Object.defineProperty(prototype, dimension, {
        get() {
          return storage.get(this) || 0
        },
        set(value) {
          storage.set(this, value)
        },
        configurable: true,
      })
    }
  }
  globalThis.requestAnimationFrame ||= () => 0
  globalThis.cancelAnimationFrame ||= () => {}
  globalThis.customElements ||= {
    define() {},
    get() {},
    whenDefined() {
      return Promise.resolve()
    },
  }
  globalThis.window ||= globalThis
  globalThis.document ||= {
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
    head: { appendChild() {} },
    body: { appendChild() {} },
  }
}

/** A canvas that records context-loss listeners instead of needing a device. */
function createRecoveryCanvas(options = {}) {
  const listeners = new Map()
  const canvas = {
    id: '',
    width: 64,
    height: 48,
    parentNode: options.parentNode || null,
    addEventListener(name, handler) {
      const list = listeners.get(name) || []
      list.push(handler)
      listeners.set(name, list)
    },
    removeEventListener() {},
    dispatch(name, event = {}) {
      for (const handler of listeners.get(name) || []) handler(event)
    },
    getContext() {
      return options.webgl2 ? {} : null
    },
    cloneNode() {
      return createRecoveryCanvas(options)
    },
  }
  return canvas
}

test('an unrestored context loss recompiles the current DSL after the recovery window', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  canvas.dispatch('webglcontextlost', { preventDefault() {} })
  assert.equal(renderer._isContextLost, true)
  assert.notEqual(renderer._contextRecoveryTimer, null)

  await settlePastRecoveryWindow()

  // No webglcontextrestored event arrived, yet the scheduled recovery
  // recompiled the program that was rendering.
  assert.deepEqual(compiled, ['solid()'])
  assert.equal(renderer._contextRecoveryTimer, null)
})

test('a context lost while the program drew its first frame does not rebuild', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 0

  let compileCalls = 0
  renderer._compile = async () => {
    compileCalls += 1
    return { fakePipeline: true }
  }

  canvas.dispatch('webglcontextlost', { preventDefault() {} })
  // The loss happened before the second frame, so the renderer treats the
  // program as a possible GPU-stall cause and leaves the rebuild to the next
  // explicit compile instead of the recovery window.
  assert.equal(renderer._contextLostBeforeSecondFrame, true)

  await settlePastRecoveryWindow()

  assert.equal(compileCalls, 0)
  assert.equal(renderer._contextRecoveryTimer, null)
})

test('a loss event after disposal does not schedule another build', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  await renderer.dispose()
  const generationAfterDispose = renderer._lifecycleGeneration

  canvas.dispatch('webglcontextlost', { preventDefault() {} })
  assert.equal(renderer._isContextLost, true)
  assert.equal(renderer._contextRecoveryTimer, null, 'disposal must not schedule another build')
  assert.equal(renderer._lifecycleGeneration, generationAfterDispose)

  await settlePastRecoveryWindow()

  assert.deepEqual(compiled, [])
})

test('a restore event after disposal does not advance the lifecycle', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  await renderer.dispose()
  const generationAfterDispose = renderer._lifecycleGeneration

  canvas.dispatch('webglcontextrestored')
  assert.equal(renderer._lifecycleGeneration, generationAfterDispose, 'disposal must block the restore rebuild')
  assert.equal(renderer._pipeline, null)

  await settlePastRecoveryWindow()

  assert.deepEqual(compiled, [])
})

test('an explicit compile after disposal re-enables context-loss recovery', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  await renderer.dispose()
  assert.equal(renderer._isDisposed, true)

  await renderer.compile('solid()')

  assert.equal(renderer._isDisposed, false)
  assert.deepEqual(compiled, ['solid()'])
})

test('a rejected compile after disposal stays disposed without scheduled recovery', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  let compileCalls = 0
  renderer._compile = async () => {
    compileCalls += 1
    const error = new Error('compile failed')
    error.code = 'ERR_COMPILATION_FAILED'
    throw error
  }

  await renderer.dispose()
  await assert.rejects(
    renderer.compile('broken()'),
    (err) => err.code === 'ERR_COMPILATION_FAILED',
  )

  assert.equal(compileCalls, 1)
  assert.equal(renderer._isDisposed, true, 'a rejected compile must not leave the renderer revived')
  assert.equal(renderer._contextRecoveryTimer, null, 'a rejected compile must not leave automatic recovery scheduled')
})

test('disposal invalidates a recovery already queued behind another compile', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  let recoveryAttempts = 0
  renderer._replaceLostContext = async () => {
    recoveryAttempts += 1
    return false
  }
  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  let releasePending
  const pendingCompile = new Promise((resolve) => {
    releasePending = resolve
  })
  renderer._compileQueue = pendingCompile
  renderer._contextRecoveryTimer = null

  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    canvas.dispatch('webglcontextlost', { preventDefault() {} })
    assert.notEqual(renderer._contextRecoveryTimer, null)
    mock.timers.tick(3000)
    // The recovery window elapsed, so the rebuild is queued behind the
    // compile that was already in flight when the context was lost.
    const queuedRecovery = renderer._compileQueue
    assert.notEqual(queuedRecovery, pendingCompile)

    await renderer.dispose()
    releasePending({ fakePipeline: true })
    assert.equal(await queuedRecovery, null)

    assert.equal(recoveryAttempts, 0, 'queued recovery must not enter context replacement after disposal')
    assert.deepEqual(compiled, [])
    assert.equal(renderer._pipeline, null)
    assert.equal(renderer.canvas, canvas)
  } finally {
    mock.timers.reset()
  }
})

test('a rejected compile after disposal stays disposed when the context is lost during compilation', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const renderer = new CanvasRenderer({ canvas })
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  let compileCalls = 0
  renderer._compile = async () => {
    compileCalls += 1
    canvas.dispatch('webglcontextlost', { preventDefault() {} })
    const error = new Error('compile failed')
    error.code = 'ERR_COMPILATION_FAILED'
    throw error
  }

  await renderer.dispose()
  await assert.rejects(
    renderer.compile('broken()'),
    (err) => err.code === 'ERR_COMPILATION_FAILED',
  )
  canvas.dispatch('webglcontextrestored')

  await settlePastRecoveryWindow()

  assert.equal(compileCalls, 1)
  assert.equal(renderer._isDisposed, true, 'a rejected compile must not leave the renderer revived')
  assert.equal(renderer._contextRecoveryTimer, null, 'a rejected compile must not leave automatic recovery scheduled')
  assert.equal(renderer._pipeline, null)
  assert.equal(renderer.canvas, canvas)
})

test('a lost WebGPU device on the current pipeline stops the loop and schedules recovery', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const contextLostCalls = []
  const renderer = new CanvasRenderer({
    canvas,
    onContextLost: () => contextLostCalls.push(1),
  })
  let lostResolve
  const lost = new Promise((resolve) => {
    lostResolve = resolve
  })
  const pipeline = { backend: { device: { lost } } }
  renderer._pipeline = pipeline
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  // The device loss reaches the watcher with no canvas event, as a GPU
  // process exit or device.destroy() loses the device for good.
  renderer._watchDeviceLoss(pipeline)
  lostResolve({ reason: 'destroyed' })
  await lost
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(renderer._isContextLost, true)
  assert.equal(pipeline.backend.isContextLost, true)
  assert.equal(renderer._wasRunningBeforeContextLoss, true)
  assert.equal(renderer._isRunning, false, 'the loop must stop on a lost device')
  assert.equal(contextLostCalls.length, 1)
  assert.notEqual(renderer._contextRecoveryTimer, null)

  await settlePastRecoveryWindow()

  assert.deepEqual(compiled, ['solid()'])
  assert.equal(renderer._contextRecoveryTimer, null)
})

test('a WebGPU device lost after the renderer moved to another pipeline changes nothing', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const contextLostCalls = []
  const renderer = new CanvasRenderer({
    canvas,
    onContextLost: () => contextLostCalls.push(1),
  })
  let lostResolve
  const lost = new Promise((resolve) => {
    lostResolve = resolve
  })
  const retiredPipeline = { backend: { device: { lost } } }
  renderer._pipeline = retiredPipeline
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  renderer._watchDeviceLoss(retiredPipeline)
  // A recompile made another pipeline current before the old device lost.
  const currentPipeline = { backend: {} }
  renderer._pipeline = currentPipeline

  lostResolve({ reason: 'destroyed' })
  await lost
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(renderer._isContextLost, false)
  assert.equal(renderer._pipeline, currentPipeline)
  assert.equal(renderer._isRunning, true)
  assert.equal(contextLostCalls.length, 0)
  assert.equal(renderer._contextRecoveryTimer, null)
})

test('a lost WebGPU device rebuilds the program on a fresh canvas and resumes', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const disposed = []
  const parent = {
    replaceChild(newChild, oldChild) {
      this.child = newChild
      assert.equal(oldChild, canvas, 'the fresh canvas must replace the lost one in place')
    },
  }
  // The fresh canvas holds a working backend, so the replacement path
  // proceeds without the WebGL2 retry loop.
  const canvas = createRecoveryCanvas({ parentNode: parent, webgl2: true })
  const contextLostCalls = []
  const contextRestoredCalls = []
  const renderer = new CanvasRenderer({
    canvas,
    onContextLost: () => contextLostCalls.push(1),
    onContextRestored: () => contextRestoredCalls.push(1),
  })
  let lostResolve
  const lost = new Promise((resolve) => {
    lostResolve = resolve
  })
  const deadPipeline = {
    backend: { device: { lost } },
    dispose: (options) => disposed.push(options),
  }
  renderer._pipeline = deadPipeline
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const createdWith = []
  const freshPipeline = { backend: {} }
  renderer._createRuntime = async (dsl, options) => {
    createdWith.push({ dsl, canvas: options.canvas })
    return freshPipeline
  }

  renderer._watchDeviceLoss(deadPipeline)
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    lostResolve({ reason: 'destroyed' })
    await lost
    await Promise.resolve()
    await Promise.resolve()

    assert.notEqual(renderer._contextRecoveryTimer, null)

    mock.timers.tick(3000)
    const rebuilt = await renderer._compileQueue

    assert.equal(rebuilt, freshPipeline)
    assert.deepEqual(disposed, [{ backendLost: true }])
    assert.notEqual(renderer.canvas, canvas, 'the renderer must present a fresh canvas')
    assert.equal(parent.child, renderer.canvas)
    assert.equal(createdWith.length, 1)
    assert.equal(createdWith[0].dsl, 'solid()')
    assert.equal(createdWith[0].canvas, renderer.canvas)
    assert.equal(renderer._pipeline, freshPipeline)
    assert.equal(renderer._isContextLost, false)
    assert.equal(renderer._wasRunningBeforeContextLoss, false)
    assert.equal(renderer._isRunning, true, 'the loop must resume on the fresh canvas')
    assert.equal(contextLostCalls.length, 1)
    assert.equal(contextRestoredCalls.length, 1)
    assert.equal(renderer._contextRecoveryTimer, null)
  } finally {
    mock.timers.reset()
  }
})

test('a WebGPU device lost after disposal schedules no recovery', async () => {
  installRendererDomShim()
  const { CanvasRenderer } = await import(
    '../vendor-cache/noisemaker-shaders-core.esm.js'
  )
  const canvas = createRecoveryCanvas()
  const contextLostCalls = []
  const renderer = new CanvasRenderer({
    canvas,
    onContextLost: () => contextLostCalls.push(1),
  })
  let lostResolve
  const lost = new Promise((resolve) => {
    lostResolve = resolve
  })
  const pipeline = { backend: { device: { lost } } }
  renderer._pipeline = pipeline
  renderer._currentDsl = 'solid()'
  renderer._isRunning = true
  renderer._frameCount = 2

  const compiled = []
  renderer._compile = async (dsl) => {
    compiled.push(dsl)
    return { fakePipeline: true }
  }

  await renderer.dispose()
  renderer._watchDeviceLoss(pipeline)
  lostResolve({ reason: 'destroyed' })
  await lost
  await Promise.resolve()
  await Promise.resolve()

  // The watcher guards on the current pipeline: a disposed renderer has no
  // current pipeline, so the device loss is ignored entirely.
  assert.equal(renderer._isContextLost, false)
  assert.equal(renderer._contextRecoveryTimer, null, 'disposal must not schedule another build')
  assert.equal(contextLostCalls.length, 0, 'a disposed renderer must not notify the host')

  await settlePastRecoveryWindow()

  assert.deepEqual(compiled, [])
})
