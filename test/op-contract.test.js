import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  DEFAULT_PROGRAM_DSL,
  installProgramOp,
} from '../src/op/install-program-op.js'
import {
  createFakeCablesOp,
  createFakeCGLNamespace,
  createManualScheduler,
  deferred,
  flushPromises,
} from './support/fake-cables-op.js'

const OP_ID = '8ecda150-2f68-4b46-9247-47b2cd936d62'
const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function createControllerHarness(initialState = {}) {
  let state = {
    error: null,
    ready: false,
    texture: null,
    ...initialState,
  }
  const calls = []
  const controller = {
    calls,
    configure(configuration) {
      calls.push(['configure', configuration])
      return Promise.resolve(state)
    },
    dispose() {
      calls.push(['dispose'])
      return Promise.resolve(state)
    },
    getState() {
      return state
    },
    handleContextLost() {
      calls.push(['context-lost'])
      return state
    },
    handleContextRestored() {
      calls.push(['context-restored'])
      return Promise.resolve(state)
    },
    render(time) {
      calls.push(['render', time])
      return Promise.resolve({ rendered: true, state, texture: state.texture })
    },
    reset() {
      calls.push(['reset'])
      return Promise.resolve(state)
    },
    setAudioState(audioState) {
      calls.push(['audio-state', audioState])
      return state
    },
    setInputTexture(texture) {
      calls.push(['input', texture])
      return Promise.resolve(state)
    },
    setMidiState(midiState) {
      calls.push(['midi-state', midiState])
      return state
    },
    setState(nextState) {
      state = { ...state, ...nextState }
      return state
    },
  }
  return controller
}

function installHarness({
  capabilityInspector,
  controller = createControllerHarness(),
  dimensions,
  facade = {},
} = {}) {
  const { canvas, cgl, op } = createFakeCablesOp(dimensions)
  const CGL = createFakeCGLNamespace()
  const scheduler = createManualScheduler()
  let controllerOptions
  const engineLoader = facade.loadEngine ?? (() => Promise.resolve({}))
  const createProgramController = (options) => {
    controllerOptions = options
    return controller
  }
  const installation = installProgramOp(op, {
    CGL,
    capabilityInspector,
    createProgramController,
    engineLoader,
    facade,
    scheduleMicrotask: scheduler.schedule,
  })
  return {
    CGL,
    canvas,
    cgl,
    controller,
    get controllerOptions() { return controllerOptions },
    installation,
    op,
    scheduler,
  }
}

test('installer forwards the selected capability inspector by identity', () => {
  const facadeInspector = () => Object.freeze({ supported: true })
  const facadeHarness = installHarness({
    facade: { inspectCapabilities: facadeInspector },
  })
  assert.equal(facadeHarness.controllerOptions.capabilityInspector, facadeInspector)

  const overrideInspector = () => Object.freeze({ supported: true })
  const overrideHarness = installHarness({
    capabilityInspector: overrideInspector,
    facade: { inspectCapabilities: facadeInspector },
  })
  assert.equal(overrideHarness.controllerOptions.capabilityInspector, overrideInspector)
})

test('installer creates the exact native port contract and one visible initial configuration', async () => {
  const harness = installHarness({ dimensions: { canvasHeight: 405, canvasWidth: 720 } })
  const { CGL, cgl, controllerOptions, op, scheduler } = harness

  assert.deepEqual(op.inputs.map((port) => port.name), [
    'Render',
    'DSL',
    'Input Texture',
    'MIDI State',
    'Audio State',
    'Size',
    'Width',
    'Height',
    'Time',
    'Reset',
  ])
  assert.deepEqual(op.outputs.map((port) => port.name), [
    'Texture',
    'Next',
    'Ready',
    'Error',
  ])
  assert.equal(op.input('DSL').kind, 'string-editor')
  assert.equal(op.input('DSL').get(), DEFAULT_PROGRAM_DSL)
  assert.match(DEFAULT_PROGRAM_DSL, /noise\(seed:\s*1/)
  assert.match(DEFAULT_PROGRAM_DSL, /\.write\(o0\)/)
  assert.match(DEFAULT_PROGRAM_DSL, /render\(o0\)/)
  assert.equal(op.input('DSL').uiAttribs.editorSyntax, 'javascript')
  assert.equal(op.input('MIDI State').kind, 'object')
  assert.equal(op.input('MIDI State').objType, 'noisemaker-midi-state')
  assert.equal(op.input('Audio State').kind, 'object')
  assert.equal(op.input('Audio State').objType, 'noisemaker-audio-state')
  assert.deepEqual(op.input('Size').choices, ['Canvas', 'Manual'])
  assert.equal(op.input('Size').get(), 'Canvas')
  assert.equal(op.input('Width').get(), 1280)
  assert.equal(op.input('Height').get(), 720)
  assert.equal(op.input('Time').get(), 0)
  assert.deepEqual(op.workPorts, [op.input('Render')])

  assert.equal(controllerOptions.cgl, cgl)
  assert.equal(controllerOptions.CGL, CGL)
  assert.equal(typeof controllerOptions.engineLoader, 'function')
  assert.equal(typeof controllerOptions.onStateChange, 'function')
  assert.equal(typeof controllerOptions.createOutputTexture, 'function')
  assert.equal(controllerOptions.midiState, null)
  assert.equal(controllerOptions.audioState, null)

  const output = controllerOptions.createOutputTexture({
    height: 18,
    pixelFormat: 'PFORMATSTR_RGBA16F',
    width: 32,
  })
  assert.ok(output instanceof CGL.Texture)
  assert.deepEqual(output.options, {
    filter: CGL.Texture.FILTER_NEAREST,
    height: 18,
    name: 'Noisemaker Program Output',
    pixelFormat: CGL.Texture.PFORMATSTR_RGBA16F,
    width: 32,
    wrap: CGL.Texture.WRAP_CLAMP_TO_EDGE,
  })

  assert.equal(scheduler.pendingCount, 1)
  scheduler.flush()
  await flushPromises()
  assert.deepEqual(harness.controller.calls, [
    ['input', null],
    [
      'configure',
      {
        dsl: DEFAULT_PROGRAM_DSL,
        size: { height: 405, mode: 'canvas', width: 720 },
      },
    ],
  ])
})

test('synchronous compile-affecting changes coalesce and non-compile ports wire directly', async () => {
  const harness = installHarness()
  const { controller, op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  controller.calls.length = 0

  op.input('DSL').set('first program')
  op.input('DSL').set('last program')
  op.input('Size').set('Manual')
  op.input('Width').set(800)
  op.input('Height').set(450)

  assert.equal(scheduler.pendingCount, 1)
  scheduler.flush()
  await flushPromises()
  assert.deepEqual(controller.calls, [
    ['input', null],
    [
      'configure',
      {
        dsl: 'last program',
        size: { height: 450, mode: 'manual', width: 800 },
      },
    ],
  ])
  assert.equal(op.input('Width').uiAttribs.greyout, false)
  assert.equal(op.input('Height').uiAttribs.greyout, false)

  const inputTexture = { tex: 'host-texture' }
  const midiState = { id: 'midi-state' }
  const audioState = { id: 'audio-state' }
  op.input('Input Texture').set(inputTexture)
  op.input('MIDI State').set(midiState)
  op.input('Audio State').set(audioState)
  assert.equal(op.input('Reset').fire(), undefined)
  await flushPromises()

  assert.deepEqual(controller.calls.slice(2), [
    ['input', inputTexture],
    ['midi-state', midiState],
    ['audio-state', audioState],
    ['reset'],
  ])
  assert.equal(scheduler.pendingCount, 0)
})

test('each configuration snapshots the current linked texture before compiling', async () => {
  const harness = installHarness()
  const { controller, op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  controller.calls.length = 0

  const staleTexture = { width: 1 }
  op.input('Input Texture').set(staleTexture)
  controller.calls.length = 0
  const liveTexture = { height: 32, tex: 'live-host-handle', width: 64 }
  op.input('Input Texture').value = liveTexture
  op.input('DSL').set('search synth\nmedia().write(o0)\nrender(o0)')

  scheduler.flush()
  await flushPromises()
  assert.deepEqual(controller.calls, [
    ['input', liveTexture],
    [
      'configure',
      {
        dsl: 'search synth\nmedia().write(o0)\nrender(o0)',
        size: { height: 360, mode: 'canvas', width: 640 },
      },
    ],
  ])
})

test('configuration observes input rejection before invoking fallible configure', async () => {
  const controller = createControllerHarness()
  const inputUpdate = deferred()
  controller.setInputTexture = (texture) => {
    controller.calls.push(['input', texture])
    return inputUpdate.promise
  }
  controller.configure = () => {
    controller.calls.push(['configure'])
    throw new Error('synchronous configure failure')
  }
  const harness = installHarness({ controller })
  const { op, scheduler } = harness

  scheduler.flush()
  inputUpdate.reject(new Error('input update rejection'))
  await flushPromises()

  assert.deepEqual(controller.calls, [['input', null]])
  assert.equal(op.output('Error').get(), 'input update rejection')
})

test('delete prevents configure after a pending input snapshot resolves', async () => {
  const controller = createControllerHarness()
  const inputUpdate = deferred()
  controller.setInputTexture = (texture) => {
    controller.calls.push(['input', texture])
    return inputUpdate.promise
  }
  const harness = installHarness({ controller })
  const { op, scheduler } = harness

  scheduler.flush()
  op.onDelete()
  inputUpdate.resolve(controller.getState())
  await flushPromises()

  assert.deepEqual(controller.calls, [
    ['input', null],
    ['dispose'],
  ])
})

test('controller state publishes Texture, Ready, Error, and matching UI errors', () => {
  const harness = installHarness()
  const { controllerOptions, op } = harness
  const texture = { tex: 'stable-output' }

  controllerOptions.onStateChange({ error: null, ready: true, texture })
  assert.equal(op.output('Texture').get(), texture)
  assert.equal(op.output('Ready').get(), true)
  assert.equal(op.output('Error').get(), '')
  assert.equal(op.uiErrors.get('noisemaker'), null)

  controllerOptions.onStateChange({
    error: { code: 'ERR_DSL_COMPILE', message: 'Invalid Polymorphic program' },
    ready: true,
    texture,
  })
  assert.equal(op.output('Texture').get(), texture)
  assert.equal(op.output('Ready').get(), true)
  assert.equal(op.output('Error').get(), 'Invalid Polymorphic program')
  assert.equal(op.uiErrors.get('noisemaker'), 'Invalid Polymorphic program')
})

test('Render remains synchronous, handles its promise, publishes before Next, and never throws', async () => {
  const controller = createControllerHarness()
  const render = deferred()
  controller.render = (time) => {
    controller.calls.push(['render', time])
    return render.promise
  }
  const harness = installHarness({ controller })
  const { op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  op.events.length = 0
  op.input('Time').set(1.25)

  assert.equal(op.input('Render').fire(), undefined)
  assert.deepEqual(controller.calls.at(-1), ['render', 1.25])
  assert.equal(op.events.some((event) => event.type === 'trigger'), false)

  const texture = { tex: 'rendered-output' }
  const state = controller.setState({ error: null, ready: true, texture })
  render.resolve({ rendered: true, state, texture })
  await flushPromises()

  const publishEvents = op.events.filter((event) =>
    event.direction === 'output' || event.type === 'trigger')
  assert.deepEqual(publishEvents.slice(-4).map((event) => [event.type, event.name]), [
    ['setRef', 'Texture'],
    ['set', 'Ready'],
    ['set', 'Error'],
    ['trigger', 'Next'],
  ])

  const nextCount = () => op.events.filter((event) =>
    event.type === 'trigger' && event.name === 'Next').length
  const previousNextCount = nextCount()
  controller.render = () => Promise.resolve({ rendered: false, reason: 'not-ready', state })
  assert.equal(op.input('Render').fire(), undefined)
  await flushPromises()
  assert.equal(nextCount(), previousNextCount)

  controller.render = () => Promise.reject(new Error('render rejected'))
  assert.doesNotThrow(() => op.input('Render').fire())
  await flushPromises()
  assert.equal(nextCount(), previousNextCount)
  assert.equal(op.output('Error').get(), 'render rejected')

  controller.render = () => { throw new Error('render threw') }
  assert.doesNotThrow(() => op.input('Render').fire())
  assert.equal(nextCount(), previousNextCount)
  assert.equal(op.output('Error').get(), 'render threw')
})

test('Canvas Render transactionally resizes once before render and Next while Manual ignores host changes', async () => {
  const initialSize = { height: 360, mode: 'canvas', width: 640 }
  const controller = createControllerHarness({
    activeSize: initialSize,
    ready: true,
    requestedSize: initialSize,
  })
  const resize = deferred()
  controller.setSize = (size) => {
    controller.calls.push(['setSize', size])
    return resize.promise.then(() => controller.setState({
      activeSize: size,
      requestedSize: size,
    }))
  }
  const harness = installHarness({ controller })
  const { cgl, op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  controller.calls.length = 0
  op.events.length = 0

  cgl.canvasWidth = 800
  cgl.canvasHeight = 450

  assert.equal(op.input('Render').fire(), undefined)
  assert.deepEqual(controller.calls, [[
    'setSize',
    { height: 450, mode: 'canvas', width: 800 },
  ]])
  assert.equal(
    op.events.some((event) => event.type === 'trigger' && event.name === 'Next'),
    false,
  )

  resize.resolve()
  await flushPromises()
  await flushPromises()
  assert.deepEqual(controller.calls, [
    ['setSize', { height: 450, mode: 'canvas', width: 800 }],
    ['render', 0],
  ])
  assert.equal(
    op.events.filter((event) => event.type === 'trigger' && event.name === 'Next').length,
    1,
  )

  controller.calls.length = 0
  assert.equal(op.input('Render').fire(), undefined)
  await flushPromises()
  assert.deepEqual(controller.calls, [['render', 0]])

  op.input('Size').set('Manual')
  scheduler.flush()
  await flushPromises()
  controller.calls.length = 0
  cgl.canvasWidth = 1024
  cgl.canvasHeight = 576

  assert.equal(op.input('Render').fire(), undefined)
  await flushPromises()
  assert.deepEqual(controller.calls, [['render', 0]])
})

test('overlapping Canvas resize renders are latest-wins when the obsolete resize settles first', async () => {
  const initialSize = { height: 360, mode: 'canvas', width: 640 }
  const controller = createControllerHarness({
    activeSize: initialSize,
    ready: true,
    requestedSize: initialSize,
  })
  const resize800 = deferred()
  const resize1024 = deferred()
  controller.setSize = (size) => {
    controller.calls.push(['setSize', size])
    controller.setState({ requestedSize: size })
    const transaction = size.width === 800 ? resize800 : resize1024
    return transaction.promise.then(() => controller.setState({ activeSize: size }))
  }
  const harness = installHarness({ controller })
  const { cgl, op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  controller.calls.length = 0
  op.events.length = 0

  cgl.canvasWidth = 800
  cgl.canvasHeight = 450
  assert.equal(op.input('Render').fire(), undefined)
  cgl.canvasWidth = 1024
  cgl.canvasHeight = 576
  assert.equal(op.input('Render').fire(), undefined)
  assert.deepEqual(controller.calls, [
    ['setSize', { height: 450, mode: 'canvas', width: 800 }],
    ['setSize', { height: 576, mode: 'canvas', width: 1024 }],
  ])

  resize800.resolve()
  await flushPromises()
  await flushPromises()
  assert.equal(controller.calls.some((call) => call[0] === 'render'), false)
  assert.equal(
    op.events.some((event) => event.type === 'trigger' && event.name === 'Next'),
    false,
  )

  resize1024.resolve()
  await flushPromises()
  await flushPromises()
  await flushPromises()
  assert.deepEqual(controller.calls, [
    ['setSize', { height: 450, mode: 'canvas', width: 800 }],
    ['setSize', { height: 576, mode: 'canvas', width: 1024 }],
    ['render', 0],
  ])
  assert.deepEqual(controller.getState().requestedSize, {
    height: 576,
    mode: 'canvas',
    width: 1024,
  })
  assert.deepEqual(controller.getState().activeSize, {
    height: 576,
    mode: 'canvas',
    width: 1024,
  })
  assert.equal(
    op.events.filter((event) => event.type === 'trigger' && event.name === 'Next').length,
    1,
  )
})

test('a current Canvas resize rejection is terminal without retry, render, Next, or unhandled rejection', async () => {
  const initialSize = { height: 360, mode: 'canvas', width: 640 }
  const controller = createControllerHarness({
    activeSize: initialSize,
    ready: true,
    requestedSize: initialSize,
  })
  const first = deferred()
  const accidentalRetry = deferred()
  controller.setSize = (size) => {
    controller.calls.push(['setSize', size])
    controller.setState({ requestedSize: size })
    return controller.calls.filter((call) => call[0] === 'setSize').length === 1
      ? first.promise
      : accidentalRetry.promise
  }
  const harness = installHarness({ controller })
  const { cgl, op, scheduler } = harness
  const unhandled = []
  const onUnhandled = (error) => unhandled.push(error)
  process.on('unhandledRejection', onUnhandled)

  try {
    scheduler.flush()
    await flushPromises()
    controller.calls.length = 0
    op.events.length = 0
    cgl.canvasWidth = 800
    cgl.canvasHeight = 450

    assert.equal(op.input('Render').fire(), undefined)
    first.reject(new Error('resize allocation failed'))
    await flushPromises()
    await flushPromises()
    await new Promise((resolveImmediate) => setImmediate(resolveImmediate))

    assert.equal(controller.calls.filter((call) => call[0] === 'setSize').length, 1)
    assert.equal(controller.calls.some((call) => call[0] === 'render'), false)
    assert.equal(
      op.events.some((event) => event.type === 'trigger' && event.name === 'Next'),
      false,
    )
    assert.deepEqual(unhandled, [])
  } finally {
    op.onDelete()
    accidentalRetry.resolve(controller.getState())
    await flushPromises()
    process.off('unhandledRejection', onUnhandled)
  }
})

test('a handled Canvas resize nonpromotion is terminal without retry, render, or Next', async () => {
  const initialSize = { height: 360, mode: 'canvas', width: 640 }
  const controller = createControllerHarness({
    activeSize: initialSize,
    ready: true,
    requestedSize: initialSize,
  })
  const accidentalRetry = deferred()
  controller.setSize = (size) => {
    controller.calls.push(['setSize', size])
    controller.setState({ requestedSize: size })
    return controller.calls.filter((call) => call[0] === 'setSize').length === 1
      ? Promise.resolve(controller.getState())
      : accidentalRetry.promise
  }
  const harness = installHarness({ controller })
  const { cgl, op, scheduler } = harness

  try {
    scheduler.flush()
    await flushPromises()
    controller.calls.length = 0
    op.events.length = 0
    cgl.canvasWidth = 800
    cgl.canvasHeight = 450

    assert.equal(op.input('Render').fire(), undefined)
    await flushPromises()
    await flushPromises()

    assert.equal(controller.calls.filter((call) => call[0] === 'setSize').length, 1)
    assert.equal(controller.calls.some((call) => call[0] === 'render'), false)
    assert.equal(
      op.events.some((event) => event.type === 'trigger' && event.name === 'Next'),
      false,
    )
  } finally {
    op.onDelete()
    accidentalRetry.resolve(controller.getState())
    await flushPromises()
  }
})

test('disposal during a pending Canvas resize cannot request, render, Next, or leak rejection', async (context) => {
  for (const outcome of ['resolve', 'reject']) {
    await context.test(outcome, async () => {
      const initialSize = { height: 360, mode: 'canvas', width: 640 }
      const controller = createControllerHarness({
        activeSize: initialSize,
        ready: true,
        requestedSize: initialSize,
      })
      const first = deferred()
      const accidentalRetry = deferred()
      controller.setSize = (size) => {
        controller.calls.push(['setSize', size])
        controller.setState({ requestedSize: size })
        const callCount = controller.calls.filter((call) => call[0] === 'setSize').length
        if (callCount > 1) return accidentalRetry.promise
        return first.promise.then(() => controller.setState({ activeSize: size }))
      }
      const harness = installHarness({ controller })
      const { cgl, op, scheduler } = harness
      const unhandled = []
      const onUnhandled = (error) => unhandled.push(error)
      process.on('unhandledRejection', onUnhandled)

      try {
        scheduler.flush()
        await flushPromises()
        controller.calls.length = 0
        op.events.length = 0
        cgl.canvasWidth = 800
        cgl.canvasHeight = 450

        assert.equal(op.input('Render').fire(), undefined)
        op.onDelete()
        if (outcome === 'resolve') first.resolve()
        else first.reject(new Error('late resize rejection'))
        await flushPromises()
        await flushPromises()
        await new Promise((resolveImmediate) => setImmediate(resolveImmediate))

        assert.equal(controller.calls.filter((call) => call[0] === 'setSize').length, 1)
        assert.equal(controller.calls.some((call) => call[0] === 'render'), false)
        assert.equal(
          op.events.some((event) => event.type === 'trigger' && event.name === 'Next'),
          false,
        )
        assert.deepEqual(unhandled, [])
      } finally {
        accidentalRetry.resolve(controller.getState())
        await flushPromises()
        process.off('unhandledRejection', onUnhandled)
      }
    })
  }
})

test('context lifecycle listeners and onDelete forward safely and clean up exactly once', async () => {
  const harness = installHarness()
  const { canvas, controller, op, scheduler } = harness
  assert.equal(canvas.listenerCount('webglcontextlost'), 1)
  assert.equal(canvas.listenerCount('webglcontextrestored'), 1)

  let prevented = false
  canvas.dispatch('webglcontextlost', { preventDefault() { prevented = true } })
  canvas.dispatch('webglcontextrestored')
  assert.equal(prevented, true)
  await flushPromises()
  assert.ok(controller.calls.some((call) => call[0] === 'context-lost'))
  assert.ok(controller.calls.some((call) => call[0] === 'context-restored'))

  assert.equal(op.onDelete(), undefined)
  assert.equal(op.onDelete(), undefined)
  await flushPromises()
  assert.equal(controller.calls.filter((call) => call[0] === 'dispose').length, 1)
  assert.equal(canvas.listenerCount('webglcontextlost'), 0)
  assert.equal(canvas.listenerCount('webglcontextrestored'), 0)

  const configureCount = controller.calls.filter((call) => call[0] === 'configure').length
  scheduler.flush()
  assert.equal(
    controller.calls.filter((call) => call[0] === 'configure').length,
    configureCount,
  )
})

test('pending render, configure, context, and state continuations become inert after onDelete', async () => {
  const controller = createControllerHarness()
  const configure = deferred()
  const render = deferred()
  const restore = deferred()
  controller.configure = (configuration) => {
    controller.calls.push(['configure', configuration])
    return configure.promise
  }
  controller.render = (time) => {
    controller.calls.push(['render', time])
    return render.promise
  }
  controller.handleContextRestored = () => {
    controller.calls.push(['context-restored'])
    return restore.promise
  }

  const harness = installHarness({ controller })
  const { canvas, controllerOptions, op, scheduler } = harness
  scheduler.flush()
  await flushPromises()
  canvas.dispatch('webglcontextrestored')
  op.input('Render').fire()

  assert.ok(controller.calls.some((call) => call[0] === 'configure'))
  assert.ok(controller.calls.some((call) => call[0] === 'context-restored'))
  assert.ok(controller.calls.some((call) => call[0] === 'render'))

  op.onDelete()
  await flushPromises()
  assert.equal(controller.calls.filter((call) => call[0] === 'dispose').length, 1)
  op.events.length = 0

  const lateTexture = { tex: 'must-not-publish' }
  const lateState = { error: null, ready: true, texture: lateTexture }
  controllerOptions.onStateChange(lateState)
  configure.resolve(lateState)
  render.resolve({ rendered: true, state: lateState, texture: lateTexture })
  restore.reject(new Error('late context rejection'))
  await flushPromises()

  assert.deepEqual(op.events, [])
  assert.equal(op.output('Texture').get(), null)
  assert.equal(op.output('Ready').get(), false)
  assert.equal(op.output('Error').get(), '')
  assert.equal(op.uiErrors.get('noisemaker'), null)
})

test('native wrapper, namespace metadata, op metadata, and docs are distribution-complete', async () => {
  const [wrapper, namespaceSource, metadataSource, docs, buildSource, browserSource] =
    await Promise.all([
      readProjectFile(
        'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/' +
          'Ops.Extension.Noisemaker.Program.js',
      ),
      readProjectFile('Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.json'),
      readProjectFile(
        'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/' +
          'Ops.Extension.Noisemaker.Program.json',
      ),
      readProjectFile(
        'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/' +
          'Ops.Extension.Noisemaker.Program.md',
      ),
      readProjectFile('tools/build.mjs'),
      readProjectFile('src/browser.js'),
    ])
  const namespace = JSON.parse(namespaceSource)
  const metadata = JSON.parse(metadataSource)

  assert.match(
    wrapper,
    /NoisemakerCablesGL\.installProgramOp\(op,\s*\{\s*CGL\s*\}\)/,
  )
  assert.deepEqual(namespace, {
    licence: { name: 'MIT' },
    name: 'Ops.Extension.Noisemaker',
    summary: 'Run complete Noisemaker Polymorphic programs in Cables GL.',
  })
  assert.equal(metadata.id, OP_ID)
  assert.equal(metadata.authorName, 'Noise Factor LLC')
  assert.equal(metadata.license, 'MIT')
  assert.deepEqual(metadata.categories, ['Graphics', 'Noisemaker'])
  assert.deepEqual(metadata.coreLibs, ['cgl'])
  assert.equal(metadata.libs, undefined)
  assert.deepEqual(metadata.dependencies, [{
    src: './lib_noisemaker-cablesgl.js',
    type: 'commonjs',
  }])
  assert.ok(Array.isArray(metadata.changelog) && metadata.changelog.length > 0)
  assert.deepEqual(metadata.layout.portsIn.map((port) => port.name), [
    'Render', 'DSL', 'Input Texture', 'MIDI State', 'Audio State',
    'Size', 'Width', 'Height', 'Time', 'Reset',
  ])
  assert.deepEqual(metadata.layout.portsOut.map((port) => port.name), [
    'Texture', 'Next', 'Ready', 'Error',
  ])
  assert.match(docs, /Polymorphic/)
  assert.match(docs, /Canvas/)
  assert.match(docs, /Manual/)
  assert.match(docs, /media\(\)/)
  assert.match(buildSource, /src\/browser\.js/)
  assert.match(browserSource, /export \{[^}]*\binstallProgramOp\b[^}]*\}/)
  assert.match(browserSource, /export \{[^}]*\bcreateProgramController\b[^}]*\}/)
})
