import assert from 'node:assert/strict'
import { test } from 'node:test'

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
