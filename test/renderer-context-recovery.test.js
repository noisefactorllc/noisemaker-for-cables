import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

// The vendored core bundles the upstream CanvasRenderer. These tests exercise
// its WebGL context-loss recovery orchestration in Node with the leaf compile
// step replaced, so the recovery paths stay covered without a WebGL device.

const CONTEXT_RESTORE_WAIT_MS = 3000
const settlePastRecoveryWindow = () =>
  new Promise((resolve) => setTimeout(resolve, CONTEXT_RESTORE_WAIT_MS + 300))

function installRendererDomShim() {
  globalThis.HTMLElement ||= class {}
  globalThis.HTMLCanvasElement ||= class {
    addEventListener() {}
    removeEventListener() {}
  }
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
function createRecoveryCanvas() {
  const listeners = new Map()
  return {
    width: 64,
    height: 48,
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
      return null
    },
  }
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
