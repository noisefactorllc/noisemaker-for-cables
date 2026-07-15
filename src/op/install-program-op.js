export const DEFAULT_PROGRAM_DSL = [
  'search synth',
  'noise(seed: 1, scaleX: 50, scaleY: 50).write(o0)',
  'render(o0)',
].join('\n')

const DEFAULT_MANUAL_WIDTH = 1280
const DEFAULT_MANUAL_HEIGHT = 720

function errorMessage(error) {
  if (error === undefined || error === null || error === '') return ''
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message.length > 0) return error.message
  if (typeof error.detail === 'string' && error.detail.length > 0) return error.detail
  if (typeof error.code === 'string' && error.code.length > 0) return error.code
  return String(error)
}

function createCGLTextureFactory(CGL, cgl) {
  return ({ height, pixelFormat, width }) => {
    if (!CGL?.Texture) throw new TypeError('CGL.Texture is required')
    const resolvedPixelFormat = pixelFormat === 'PFORMATSTR_RGBA16F'
      ? CGL.Texture.PFORMATSTR_RGBA16F
      : (pixelFormat ?? CGL.Texture.PFORMATSTR_RGBA16F)
    return new CGL.Texture(cgl, {
      filter: CGL.Texture.FILTER_NEAREST,
      height,
      name: 'Noisemaker Program Output',
      pixelFormat: resolvedPixelFormat,
      width,
      wrap: CGL.Texture.WRAP_CLAMP_TO_EDGE,
    })
  }
}

function stateFromResult(result, controller) {
  if (result?.state) return result.state
  if (result && typeof result === 'object' && (
    'error' in result || 'ready' in result || 'texture' in result
  )) return result
  return controller?.getState?.() ?? {}
}

export function installProgramOp(op, env = {}) {
  if (!op || typeof op !== 'object') throw new TypeError('op is required')

  const cgl = env.cgl ?? op.patch?.cgl
  const CGL = env.CGL ?? globalThis.CGL
  const facade = env.facade ?? globalThis.NoisemakerCablesGL ?? {}
  const capabilityInspector = env.capabilityInspector ?? facade.inspectCapabilities
  const createProgramController = env.createProgramController ?? facade.createProgramController
  const engineLoader = env.engineLoader ?? facade.loadEngine
  const scheduleMicrotask = env.scheduleMicrotask ?? queueMicrotask

  const renderIn = op.inTrigger('Render', { display: 'button' })
  const dslIn = op.inStringEditor('DSL', DEFAULT_PROGRAM_DSL, 'javascript')
  const inputTextureIn = op.inTexture('Input Texture', null)
  const sizeIn = op.inSwitch('Size', ['Canvas', 'Manual'], 'Canvas', true)
  const widthIn = op.inValueInt('Width', DEFAULT_MANUAL_WIDTH)
  const heightIn = op.inValueInt('Height', DEFAULT_MANUAL_HEIGHT)
  const timeIn = op.inFloat('Time', 0)
  const resetIn = op.inTrigger('Reset', { display: 'button' })

  const textureOut = op.outTexture('Texture')
  const nextOut = op.outTrigger('Next')
  const readyOut = op.outBool('Ready', false)
  const errorOut = op.outString('Error', '')

  dslIn.setUiAttribs({ editorSyntax: 'javascript' })
  op.toWorkPortsNeedToBeLinked?.(renderIn)

  let controller = null
  let canvasResize = null
  let canvasResizeRenderId = 0
  let configurationScheduled = false
  let disposed = false

  const publishState = (state = {}) => {
    if (disposed) return state
    textureOut.setRef(state.texture ?? null)
    if (disposed) return state
    readyOut.set(Boolean(state.ready))
    if (disposed) return state
    const message = errorMessage(state.error)
    errorOut.set(message)
    if (disposed) return state
    op.setUiError?.('noisemaker', message || null)
    return state
  }

  const reportError = (error) => {
    if (disposed) return
    const current = controller?.getState?.() ?? {}
    try {
      publishState({ ...current, error })
    } catch {
      // Cables callbacks must not leak renderer or UI failures.
    }
  }

  const handlePromise = (operation, onFulfilled = (result) => {
    publishState(stateFromResult(result, controller))
  }) => {
    let result
    try {
      result = operation()
    } catch (error) {
      reportError(error)
      return
    }
    Promise.resolve(result).then((resolved) => {
      if (disposed) return undefined
      return onFulfilled(resolved)
    }).catch(reportError)
  }

  const canvasSize = () => ({
    height: cgl?.canvasHeight ?? cgl?.canvas?.height ?? cgl?.gl?.drawingBufferHeight,
    mode: 'canvas',
    width: cgl?.canvasWidth ?? cgl?.canvas?.width ?? cgl?.gl?.drawingBufferWidth,
  })

  const sameDimensions = (left, right) =>
    Number(left?.width) === Number(right?.width) &&
    Number(left?.height) === Number(right?.height)

  const canvasStateMatches = (state, size) =>
    state?.requestedSize?.mode === 'canvas' &&
    sameDimensions(state.requestedSize, size) &&
    sameDimensions(state.activeSize, size)

  const ensureCanvasSize = () => {
    if (disposed || !controller || sizeIn.get() === 'Manual') return null

    const size = canvasSize()
    const state = controller?.getState?.() ?? {}
    if (
      state.requestedSize?.mode !== 'canvas' ||
      !state.activeSize ||
      canvasStateMatches(state, size)
    ) return null

    if (canvasResize && sameDimensions(canvasResize.size, size)) {
      return canvasResize
    }

    const request = controller.setSize(size)
    const pending = {
      promise: null,
      size,
    }
    pending.promise = Promise.resolve(request).then(
      (result) => {
        if (canvasResize === pending) canvasResize = null
        return result
      },
      (error) => {
        if (canvasResize === pending) canvasResize = null
        throw error
      },
    )
    canvasResize = pending
    return pending
  }

  const skippedRender = (reason) => {
    const state = controller?.getState?.() ?? {}
    return {
      reason,
      rendered: false,
      state,
      texture: state.texture ?? null,
    }
  }

  const renderAfterCanvasResize = async (time, initialResize, renderId) => {
    let resize = initialResize

    while (resize) {
      try {
        await resize.promise
      } catch (error) {
        if (disposed || !controller) return skippedRender('disposed')

        const supersedingResize = canvasResize && canvasResize !== resize
          ? canvasResize
          : null
        if (supersedingResize) {
          resize = supersedingResize
          continue
        }

        if (sizeIn.get() !== 'Manual') {
          const size = canvasSize()
          if (!sameDimensions(size, resize.size)) {
            const newerResize = ensureCanvasSize()
            if (newerResize && newerResize !== resize) {
              resize = newerResize
              continue
            }
          }
        }
        throw error
      }

      if (disposed || !controller) return skippedRender('disposed')

      const supersedingResize = canvasResize && canvasResize !== resize
        ? canvasResize
        : null
      if (supersedingResize) {
        resize = supersedingResize
        continue
      }

      if (sizeIn.get() === 'Manual') {
        if (renderId !== canvasResizeRenderId) return skippedRender('superseded')
        return controller.render(time)
      }

      const size = canvasSize()
      if (!sameDimensions(size, resize.size)) {
        const newerResize = ensureCanvasSize()
        if (newerResize && newerResize !== resize) {
          resize = newerResize
          continue
        }
        return skippedRender('not-ready')
      }

      if (!canvasStateMatches(controller.getState?.() ?? {}, size)) {
        return skippedRender('resize-not-promoted')
      }
      if (renderId !== canvasResizeRenderId) return skippedRender('superseded')
      return controller.render(time)
    }

    return skippedRender('not-ready')
  }

  const requestedSize = () => sizeIn.get() === 'Manual'
    ? { height: heightIn.get(), mode: 'manual', width: widthIn.get() }
    : canvasSize()

  const updateManualPortUi = () => {
    const greyout = sizeIn.get() !== 'Manual'
    widthIn.setUiAttribs({ greyout })
    heightIn.setUiAttribs({ greyout })
  }

  const scheduleConfiguration = () => {
    if (disposed || configurationScheduled) return
    configurationScheduled = true
    scheduleMicrotask(() => {
      configurationScheduled = false
      if (disposed || !controller) return
      handlePromise(() => {
        const inputUpdate = controller.setInputTexture(inputTextureIn.get() ?? null)
        return Promise.resolve(inputUpdate).then(() => {
          if (disposed || !controller) return controller?.getState?.() ?? {}
          return controller.configure({
            dsl: dslIn.get(),
            size: requestedSize(),
          })
        })
      })
    })
  }

  dslIn.onChange = scheduleConfiguration
  sizeIn.onChange = () => {
    updateManualPortUi()
    scheduleConfiguration()
  }
  widthIn.onChange = scheduleConfiguration
  heightIn.onChange = scheduleConfiguration
  inputTextureIn.onChange = () => {
    if (disposed || !controller) return
    handlePromise(() => controller.setInputTexture(inputTextureIn.get() ?? null))
  }

  renderIn.onTriggered = () => {
    if (disposed || !controller) return
    handlePromise(
      () => {
        const time = timeIn.get()
        const resize = ensureCanvasSize()
        if (!resize) return controller.render(time)
        canvasResizeRenderId += 1
        return renderAfterCanvasResize(time, resize, canvasResizeRenderId)
      },
      (result) => {
        publishState(stateFromResult(result, controller))
        if (!disposed && result?.rendered === true) nextOut.trigger()
      },
    )
  }

  resetIn.onTriggered = () => {
    if (disposed || !controller) return
    handlePromise(() => controller.reset())
  }

  const onContextLost = (event) => {
    event?.preventDefault?.()
    if (disposed || !controller) return
    try {
      publishState(controller.handleContextLost())
    } catch (error) {
      reportError(error)
    }
  }

  const onContextRestored = () => {
    if (disposed || !controller) return
    handlePromise(() => controller.handleContextRestored())
  }

  const canvas = cgl?.canvas ?? cgl?.gl?.canvas
  canvas?.addEventListener?.('webglcontextlost', onContextLost)
  canvas?.addEventListener?.('webglcontextrestored', onContextRestored)

  updateManualPortUi()

  try {
    if (typeof createProgramController !== 'function') {
      throw new TypeError('createProgramController is required')
    }
    controller = createProgramController({
      CGL,
      capabilityInspector,
      cgl,
      createOutputTexture: env.createOutputTexture ?? createCGLTextureFactory(CGL, cgl),
      engineLoader,
      onStateChange: publishState,
    })
    publishState(controller.getState?.() ?? {})
    scheduleConfiguration()
  } catch (error) {
    reportError(error)
  }

  op.onDelete = () => {
    if (disposed) return
    disposed = true
    canvas?.removeEventListener?.('webglcontextlost', onContextLost)
    canvas?.removeEventListener?.('webglcontextrestored', onContextRestored)
    if (controller) handlePromise(() => controller.dispose(), () => {})
  }

  return {
    controller,
    ports: {
      dslIn,
      errorOut,
      heightIn,
      inputTextureIn,
      nextOut,
      readyOut,
      renderIn,
      resetIn,
      sizeIn,
      textureOut,
      timeIn,
      widthIn,
    },
  }
}
