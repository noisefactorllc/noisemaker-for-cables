import { bindExternalTexture } from '../backend/external-texture.js'
import { createOutputCopier } from '../backend/output-copy.js'
import { capabilityCodeFor, inspectCapabilities } from '../runtime/capabilities.js'
import { prepareNoisemakerGLState, withGLState } from '../runtime/gl-state.js'
import { ControllerError, toControllerError } from './errors.js'

const SKIPPED = Object.freeze({ executed: false })
const CAPABILITY_CAUSE_CODES = new Set([
  'ERR_ACTIVE_HOST_TRANSFORM_FEEDBACK',
  'ERR_UNIFORM_BLOCK_TOO_LARGE',
  'ERR_UNSUPPORTED_CGL_CACHE_SHAPE',
])

function isPromiseLike(value) {
  return value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof value.then === 'function'
}

function destroyCGLTexture(texture) {
  if (!texture) return
  if (typeof texture.delete === 'function') texture.delete()
  else if (typeof texture.dispose === 'function') texture.dispose()
  else if (typeof texture.destroy === 'function') texture.destroy()
}

function copySize(size) {
  return size ? { ...size } : null
}

function clampDimension(value, maximum) {
  const numeric = Number(value)
  const integer = Number.isFinite(numeric) ? Math.floor(numeric) : 1
  return Math.min(maximum, Math.max(1, integer))
}

function normalizeRequestedSize(size, fallback) {
  if (size === undefined) return copySize(fallback)
  if (!size || typeof size !== 'object') throw new TypeError('size must be an object')
  const mode = size.mode ?? 'canvas'
  if (mode !== 'canvas' && mode !== 'manual') {
    throw new TypeError("size.mode must be 'canvas' or 'manual'")
  }
  return {
    height: size.height,
    mode,
    width: size.width,
  }
}

function assertDsl(dsl) {
  if (typeof dsl !== 'string') throw new TypeError('dsl must be a string')
}

function capabilityError(capability, message, details = {}) {
  const cause = new Error(message)
  cause.code = details.capabilityCode ??
    capabilityCodeFor(capability) ??
    `ERR_CAPABILITY_${capability.toUpperCase()}`
  cause.capability = capability
  return new ControllerError('ERR_CAPABILITY', 'capability', message, {
    ...details,
    capability,
    capabilityCode: cause.code,
    cause,
  })
}

function controllerError(phase, error, details = {}) {
  if (error instanceof ControllerError) return error
  const code = error?.code
  if (CAPABILITY_CAUSE_CODES.has(code) || String(code).startsWith('ERR_CAPABILITY_')) {
    return toControllerError('capability', error, {
      ...details,
      capability: error?.capability,
      capabilityCode: code,
    })
  }
  return toControllerError(phase, error, details)
}

function packedUniformLayoutSize(layout) {
  const entries = Array.isArray(layout) ? layout : Object.values(layout ?? {})
  if (entries.length === 0) return 0
  let maximumSlot = -1
  for (const entry of entries) {
    const slot = Number(entry?.slot)
    if (Number.isFinite(slot)) maximumSlot = Math.max(maximumSlot, Math.floor(slot))
  }
  return maximumSlot < 0 ? 0 : (maximumSlot + 1) * 16
}

function graphCapabilityRequirements(graph) {
  let maxDrawBuffers = 1
  let maxTextureUnits = 1
  let maxUniformBlockBytes = 0
  let needsFloatBlend = false
  for (const pass of graph?.passes ?? []) {
    const outputCount = Object.keys(pass?.outputs ?? {}).length
    const declaredDrawBuffers = Number(pass?.drawBuffers)
    maxDrawBuffers = Math.max(
      maxDrawBuffers,
      outputCount,
      Number.isFinite(declaredDrawBuffers) ? declaredDrawBuffers : 0,
    )
    maxTextureUnits = Math.max(maxTextureUnits, Object.keys(pass?.inputs ?? {}).length)
    needsFloatBlend ||= Boolean(pass?.blend)
  }

  const programs = graph?.programs instanceof Map
    ? graph.programs.values()
    : Object.values(graph?.programs ?? {})
  for (const spec of programs) {
    maxUniformBlockBytes = Math.max(
      maxUniformBlockBytes,
      packedUniformLayoutSize(spec?.uniformLayout),
    )
  }
  return { maxDrawBuffers, maxTextureUnits, maxUniformBlockBytes, needsFloatBlend }
}

function finiteMinimum(...values) {
  const finite = values.filter((value) => Number.isFinite(value))
  return finite.length > 0 ? Math.min(...finite) : undefined
}

function assertCandidateCapabilities(candidate) {
  const backendCapabilities = candidate.backend.capabilities ?? {}
  const publicCapabilities = candidate.capabilityReport
  const extensions = publicCapabilities.extensions ?? {}
  const limits = publicCapabilities.limits ?? {}
  const required = graphCapabilityRequirements(candidate.graph)
  const fail = (capability, actual, needed, message) => {
    throw capabilityError(capability, message, {
      actual,
      generation: candidate.generation,
      required: needed,
    })
  }

  const maxDrawBuffers = finiteMinimum(
    limits.maxDrawBuffers,
    backendCapabilities.maxDrawBuffers,
  )
  if (
    !Number.isFinite(maxDrawBuffers) ||
    maxDrawBuffers < required.maxDrawBuffers
  ) {
    fail(
      'maxDrawBuffers',
      maxDrawBuffers,
      required.maxDrawBuffers,
      `Program requires ${required.maxDrawBuffers} simultaneous draw buffers`,
    )
  }
  const maxTextureUnits = finiteMinimum(
    limits.maxTextureUnits,
    candidate.backend.maxTextureUnits,
  )
  if (
    !Number.isFinite(maxTextureUnits) ||
    maxTextureUnits < required.maxTextureUnits
  ) {
    fail(
      'maxTextureUnits',
      maxTextureUnits,
      required.maxTextureUnits,
      `Program requires ${required.maxTextureUnits} texture units`,
    )
  }
  const floatBlend = extensions.floatBlend === true && backendCapabilities.floatBlend === true
  if (required.needsFloatBlend && !floatBlend) {
    fail('floatBlend', floatBlend, true, 'Program requires float render-target blending')
  }
  if (
    required.maxUniformBlockBytes > 0 &&
    (!Number.isFinite(limits.maxUniformBlockSize) ||
      limits.maxUniformBlockSize < required.maxUniformBlockBytes)
  ) {
    fail(
      'maxUniformBlockSize',
      limits.maxUniformBlockSize,
      required.maxUniformBlockBytes,
      `Program requires a ${required.maxUniformBlockBytes}-byte uniform block`,
    )
  }
  if (
    required.maxUniformBlockBytes > 0 &&
    (!Number.isFinite(limits.maxUniformBufferBindings) ||
      limits.maxUniformBufferBindings < 1)
  ) {
    fail(
      'maxUniformBufferBindings',
      limits.maxUniformBufferBindings,
      1,
      'Program requires at least one uniform-buffer binding',
    )
  }
}

function assertCompleteCatalogCapabilities(report) {
  if (!report || typeof report !== 'object') {
    throw new TypeError('capabilityInspector must return a capability report')
  }
  if (report.supported === true) return report

  const failure = report.failures?.[0]
  if (failure) {
    throw capabilityError(failure.capability, failure.message, {
      actual: failure.actual,
      capabilityCode: failure.capabilityCode,
      required: failure.required,
    })
  }

  throw capabilityError(
    'unknown',
    report.issues?.[0] ?? 'Complete-catalog capabilities are unavailable',
    { actual: report.supported, required: true },
  )
}

function cancelPipelineAsyncWork(pipeline) {
  const timers = pipeline?._asyncDebounceTimers
  if (!timers || typeof timers.values !== 'function') return
  for (const timer of timers.values()) clearTimeout(timer)
  if (typeof timers.clear === 'function') timers.clear()
}

async function defaultEngineLoader() {
  const engine = await import('../runtime/engine.js')
  return engine.loadEngine()
}

async function defaultBackendFactory(options) {
  const backend = await import('../backend/cables-webgl2-backend.js')
  return new backend.CablesWebGL2Backend(options.cgl, options.canvas)
}

export function createProgramController({
  CGL = globalThis.CGL,
  backendFactory,
  bindInputTexture = bindExternalTexture,
  capabilityInspector = inspectCapabilities,
  canvas,
  cgl,
  createOutputTexture,
  destroyOutputTexture = destroyCGLTexture,
  engineLoader = defaultEngineLoader,
  onStateChange,
  outputCopierFactory = createOutputCopier,
  prepareGLState = prepareNoisemakerGLState,
  stateGuard = withGLState,
} = {}) {
  if (!cgl?.gl) throw new TypeError('cgl.gl is required')
  if (typeof createOutputTexture !== 'function') {
    throw new TypeError('createOutputTexture must be a function')
  }
  if (typeof destroyOutputTexture !== 'function') {
    throw new TypeError('destroyOutputTexture must be a function')
  }
  if (typeof engineLoader !== 'function') throw new TypeError('engineLoader must be a function')
  if (typeof bindInputTexture !== 'function') {
    throw new TypeError('bindInputTexture must be a function')
  }
  if (typeof capabilityInspector !== 'function') {
    throw new TypeError('capabilityInspector must be a function')
  }
  if (typeof outputCopierFactory !== 'function') {
    throw new TypeError('outputCopierFactory must be a function')
  }
  if (typeof prepareGLState !== 'function') {
    throw new TypeError('prepareGLState must be a function')
  }
  if (typeof stateGuard !== 'function') throw new TypeError('stateGuard must be a function')

  const gl = cgl.gl
  const targetCanvas = canvas ?? cgl.canvas ?? gl.canvas
  const createBackend = backendFactory ?? defaultBackendFactory
  const initialSize = {
    height: cgl.canvasHeight ?? targetCanvas?.height,
    mode: 'canvas',
    width: cgl.canvasWidth ?? targetCanvas?.width,
  }
  const state = {
    activeDsl: null,
    activeGeneration: null,
    activeSize: null,
    build: 'idle',
    contextEpoch: 0,
    desiredDsl: null,
    error: null,
    generation: 0,
    lifecycle: 'active',
    ready: false,
    requestedSize: initialSize,
    texture: null,
  }

  let activeCandidate = null
  let currentInputTexture = null
  let desiredChangedWhileContextLost = false
  let disposalPromise = null
  let gpuTail = Promise.resolve()
  let lastGoodDsl = null
  let lastNormalizedTime = 0
  let outputCopier = null
  let recoveryRequired = false
  let renderTail = Promise.resolve()
  const inFlightCandidates = new Set()
  const pendingCleanupCandidates = new Set()
  let pendingCleanupCopier = null
  let pendingCleanupCopierBackend = null

  function snapshot() {
    return {
      ...state,
      activeSize: copySize(state.activeSize),
      requestedSize: copySize(state.requestedSize),
    }
  }

  function notifyObserver(value) {
    if (typeof onStateChange !== 'function') return
    try {
      const result = onStateChange(value)
      if (isPromiseLike(result)) result.catch(() => {})
    } catch {
      // Observer failures do not affect the controller transaction.
    }
  }

  function publish(patch = {}) {
    Object.assign(state, patch)
    const value = snapshot()
    notifyObserver(value)
    return value
  }

  function enqueue(operation) {
    const job = gpuTail.then(operation, operation)
    gpuTail = job.catch(() => {})
    return job
  }

  function guardedNow(backend, operation) {
    const maxTextureUnits = backend?.maxTextureUnits
    const options = { CGL, maxTextureUnits }
    return stateGuard(gl, cgl, () => {
      prepareGLState(gl, { maxTextureUnits })
      const result = operation()
      if (isPromiseLike(result)) {
        throw new TypeError('GL guard callbacks must be synchronous')
      }
      return result
    }, options)
  }

  function enqueueGuarded(epoch, backend, operation, isValid = () => (
    state.lifecycle === 'active' && state.contextEpoch === epoch
  )) {
    return enqueue(() => {
      if (!isValid()) return SKIPPED
      return { executed: true, value: guardedNow(backend, operation) }
    })
  }

  function isCurrent(generation, epoch) {
    return state.lifecycle === 'active' &&
      state.generation === generation &&
      state.contextEpoch === epoch
  }

  function isCurrentCandidate(candidate) {
    return !candidate.disposed &&
      isCurrent(candidate.generation, candidate.epoch)
  }

  function ensureOutputCopier() {
    outputCopier ||= outputCopierFactory({
      createTexture: createOutputTexture,
      destroyTexture: destroyOutputTexture,
      gl,
    })
    return outputCopier
  }

  function resolveSize(requested, backend, capabilityReport) {
    const canvasWidth = cgl.canvasWidth ?? targetCanvas?.width ?? gl.drawingBufferWidth
    const canvasHeight = cgl.canvasHeight ?? targetCanvas?.height ?? gl.drawingBufferHeight
    const rawWidth = requested?.width ?? canvasWidth
    const rawHeight = requested?.height ?? canvasHeight
    const capabilityMaximum = finiteMinimum(
      capabilityReport?.limits?.maxTextureSize,
      backend?.capabilities?.maxTextureSize,
    )
    const maximum = Number.isFinite(capabilityMaximum) && capabilityMaximum > 0
      ? Math.floor(capabilityMaximum)
      : Number.MAX_SAFE_INTEGER
    return {
      height: clampDimension(rawHeight, maximum),
      width: clampDimension(rawWidth, maximum),
    }
  }

  async function disposeCandidate(candidate) {
    if (!candidate || candidate.cleanupComplete) return null
    candidate.disposed = true
    inFlightCandidates.delete(candidate)
    cancelPipelineAsyncWork(candidate.pipeline)
    if (state.contextEpoch !== candidate.epoch || state.lifecycle === 'context-lost') {
      candidate.cleanupComplete = true
      pendingCleanupCandidates.delete(candidate)
      return null
    }
    if (state.lifecycle !== 'active') {
      pendingCleanupCandidates.add(candidate)
      return null
    }
    try {
      const result = await enqueueGuarded(
        candidate.epoch,
        candidate.backend,
        () => candidate.pipeline.dispose(),
      )
      if (result.executed) {
        candidate.cleanupComplete = true
        pendingCleanupCandidates.delete(candidate)
      }
      return null
    } catch (error) {
      pendingCleanupCandidates.add(candidate)
      return toControllerError('dispose', error, { generation: candidate.generation })
    }
  }

  function publishCandidateCleanupFailure(candidate, error) {
    if (
      !error ||
      state.lifecycle !== 'active' ||
      state.contextEpoch !== candidate.epoch
    ) return
    publish({ error, ready: Boolean(activeCandidate) && !recoveryRequired })
  }

  function handleDelayedMutationFailure(candidate, error) {
    if (activeCandidate !== candidate || candidate.disposed) return
    recoveryRequired = true
    publish({
      error: toControllerError('initialize', error, { generation: candidate.generation }),
      ready: false,
    })
  }

  function routeDelayedTextureUploads(candidate) {
    const backend = candidate.backend
    if (typeof backend.updateTextureFromSource !== 'function') return
    const updateTextureFromSource = backend.updateTextureFromSource.bind(backend)
    const canMutate = () => state.lifecycle === 'active' &&
      state.contextEpoch === candidate.epoch &&
      !candidate.disposed &&
      (
        state.generation === candidate.generation ||
        (activeCandidate === candidate && !recoveryRequired)
      )
    backend.updateTextureFromSource = (...args) => {
      if (!canMutate()) return Promise.resolve(undefined)
      const job = enqueueGuarded(
        candidate.epoch,
        backend,
        () => updateTextureFromSource(...args),
        canMutate,
      )
      return job.then((result) => result.value).catch((error) => {
        handleDelayedMutationFailure(candidate, error)
        return undefined
      })
    }
  }

  async function captureGpuPromise(candidate, operation) {
    let pending
    const guarded = await enqueueGuarded(
      candidate.epoch,
      candidate.backend,
      () => { pending = operation() },
      () => isCurrentCandidate(candidate),
    )
    if (!guarded.executed) return false
    await Promise.resolve(pending)
    return isCurrentCandidate(candidate)
  }

  async function initializeCandidate(candidate, requestedSize) {
    routeDelayedTextureUploads(candidate)

    if (!await captureGpuPromise(candidate, () => candidate.backend.init())) return false

    assertCandidateCapabilities(candidate)

    candidate.pipeline.isCompiling = true
    try {
      const compiled = new Set()
      for (const pass of candidate.graph.passes ?? []) {
        if (compiled.has(pass.program)) continue
        const spec = candidate.pipeline.resolveProgramSpec(pass)
        if (!spec) {
          const error = new Error(`Program spec '${pass.program}' is unavailable`)
          error.code = 'ERR_PROGRAM_SPEC_MISSING'
          throw error
        }
        const current = await captureGpuPromise(
          candidate,
          () => candidate.backend.compileProgram(pass.program, spec),
        )
        if (!current) return false
        compiled.add(pass.program)
      }
    } finally {
      candidate.pipeline.isCompiling = false
    }

    if (!isCurrentCandidate(candidate)) return false
    candidate.size = resolveSize(
      requestedSize,
      candidate.backend,
      candidate.capabilityReport,
    )
    const prepared = await enqueueGuarded(
      candidate.epoch,
      candidate.backend,
      () => {
        candidate.pipeline.resize(candidate.size.width, candidate.size.height)
        bindInputTexture({
          backend: candidate.backend,
          graph: candidate.graph,
          pipeline: candidate.pipeline,
          texture: currentInputTexture,
        })
        candidate.pipeline.syncTime(lastNormalizedTime)
      },
      () => isCurrentCandidate(candidate),
    )
    return prepared.executed && isCurrentCandidate(candidate)
  }

  async function promoteCandidate(candidate) {
    let promoted = false
    let cleanupError = null
    const result = await enqueueGuarded(
      candidate.epoch,
      candidate.backend,
      () => {
        bindInputTexture({
          backend: candidate.backend,
          graph: candidate.graph,
          pipeline: candidate.pipeline,
          texture: currentInputTexture,
        })
        const copier = ensureOutputCopier()
        const texture = copier.resize(candidate.size.width, candidate.size.height)
        const previous = activeCandidate

        activeCandidate = candidate
        candidate.promoted = true
        inFlightCandidates.delete(candidate)
        recoveryRequired = false
        Object.assign(state, {
          activeDsl: candidate.dsl,
          activeGeneration: candidate.generation,
          activeSize: candidate.size,
          build: 'idle',
          error: null,
          ready: true,
          texture,
        })
        lastGoodDsl = candidate.dsl
        promoted = true

        if (previous) {
          previous.disposed = true
          cancelPipelineAsyncWork(previous.pipeline)
          try {
            previous.pipeline.dispose()
            previous.cleanupComplete = true
            pendingCleanupCandidates.delete(previous)
          } catch (error) {
            pendingCleanupCandidates.add(previous)
            cleanupError = toControllerError('dispose', error, {
              generation: previous.generation,
            })
          }
        }
      },
      () => isCurrentCandidate(candidate),
    )

    if (!result.executed || !promoted) return false
    publish({ error: cleanupError })
    return true
  }

  async function buildGeneration(dsl, requestedSize, generation, epoch) {
    let candidate = null
    let phase = 'load'
    try {
      const engine = await engineLoader()
      if (!isCurrent(generation, epoch)) return snapshot()

      phase = 'compile'
      publish({ build: 'compiling' })
      const graph = await engine.compileProgram(dsl)
      if (!isCurrent(generation, epoch)) return snapshot()

      phase = 'capability'
      const capabilityReport = assertCompleteCatalogCapabilities(
        capabilityInspector(cgl, { CGL }),
      )
      if (!isCurrent(generation, epoch)) return snapshot()

      phase = 'initialize'
      publish({ build: 'initializing' })
      const backend = await createBackend({ canvas: targetCanvas, cgl, engine, gl })
      if (!isCurrent(generation, epoch)) return snapshot()
      const pipeline = new engine.Pipeline(graph, backend)
      candidate = {
        backend,
        capabilityReport,
        cleanupComplete: false,
        disposed: false,
        dsl,
        epoch,
        generation,
        graph,
        pipeline,
        promoted: false,
        size: null,
      }
      inFlightCandidates.add(candidate)

      if (!await initializeCandidate(candidate, requestedSize)) {
        publishCandidateCleanupFailure(candidate, await disposeCandidate(candidate))
        return snapshot()
      }
      if (!isCurrentCandidate(candidate)) {
        publishCandidateCleanupFailure(candidate, await disposeCandidate(candidate))
        return snapshot()
      }

      phase = 'allocation'
      if (!await promoteCandidate(candidate)) {
        publishCandidateCleanupFailure(candidate, await disposeCandidate(candidate))
      }
      return snapshot()
    } catch (error) {
      const cleanupError = candidate && !candidate.promoted
        ? await disposeCandidate(candidate)
        : null
      if (!isCurrent(generation, epoch)) {
        publishCandidateCleanupFailure(candidate, cleanupError)
        return snapshot()
      }
      const categorized = controllerError(phase, error, { generation })
      if (cleanupError) categorized.cleanupError = cleanupError
      return publish({
        build: 'idle',
        error: categorized,
        ready: Boolean(activeCandidate) && !recoveryRequired,
        texture: outputCopier?.getTexture?.() ?? state.texture,
      })
    }
  }

  function startBuild(dsl, requestedSize, generation = state.generation) {
    const epoch = state.contextEpoch
    publish({ build: 'loading' })
    return buildGeneration(dsl, copySize(requestedSize), generation, epoch)
  }

  function configure({ dsl, size } = {}) {
    if (state.lifecycle === 'disposed') return Promise.resolve(snapshot())
    if (dsl !== undefined) assertDsl(dsl)
    const requestedSize = normalizeRequestedSize(size, state.requestedSize)
    state.generation += 1
    if (dsl !== undefined) {
      state.desiredDsl = dsl
      if (state.lifecycle === 'context-lost') desiredChangedWhileContextLost = true
    }
    state.requestedSize = requestedSize

    if (state.lifecycle !== 'active') return Promise.resolve(publish())
    const targetDsl = dsl ?? state.activeDsl ?? state.desiredDsl
    if (targetDsl === null) return Promise.resolve(publish({ build: 'idle' }))
    return startBuild(targetDsl, requestedSize)
  }

  function rebuildActiveProgram() {
    if (state.lifecycle !== 'active') return Promise.resolve(snapshot())
    const dsl = state.activeDsl ?? lastGoodDsl
    if (dsl === null) return Promise.resolve(snapshot())
    state.generation += 1
    return startBuild(dsl, state.requestedSize)
  }

  async function performRender(normalizedTime) {
    if (state.lifecycle === 'disposed') {
      return { reason: 'disposed', rendered: false, state: snapshot(), texture: null }
    }
    if (state.lifecycle !== 'active') {
      return { reason: 'context-lost', rendered: false, state: snapshot(), texture: null }
    }
    if (
      recoveryRequired &&
      state.build !== 'idle' &&
      state.generation !== activeCandidate?.generation
    ) {
      return {
        error: state.error,
        reason: 'not-ready',
        rendered: false,
        state: snapshot(),
        texture: state.texture,
      }
    }
    if (recoveryRequired) await rebuildActiveProgram()
    const candidate = activeCandidate
    const copier = outputCopier
    if (!candidate || !copier || !state.ready) {
      return {
        error: state.error,
        reason: 'not-ready',
        rendered: false,
        state: snapshot(),
        texture: state.texture,
      }
    }

    try {
      const rendered = await enqueueGuarded(
        candidate.epoch,
        candidate.backend,
        () => {
          candidate.backend.presentedTextureId = undefined
          candidate.pipeline.render(normalizedTime)
          const source = candidate.backend.getPresentedTextureInfo()
          return copier.copy(source)
        },
        () => state.lifecycle === 'active' &&
          state.contextEpoch === candidate.epoch &&
          activeCandidate === candidate &&
          !candidate.disposed &&
          !recoveryRequired,
      )
      if (!rendered.executed) {
        return {
          error: state.error,
          reason: state.lifecycle === 'disposed' ? 'disposed' : 'not-ready',
          rendered: false,
          state: snapshot(),
          texture: state.texture,
        }
      }
      lastNormalizedTime = normalizedTime
      const error = state.error?.phase === 'render' ? null : state.error
      const nextState = publish({ error, texture: rendered.value })
      return { error, rendered: true, state: nextState, texture: rendered.value }
    } catch (error) {
      const categorized = toControllerError('render', error, {
        generation: candidate.generation,
      })
      if (activeCandidate === candidate && state.lifecycle === 'active') {
        recoveryRequired = true
        publish({ error: categorized, ready: false })
      }
      return {
        error: categorized,
        reason: 'render-error',
        rendered: false,
        state: snapshot(),
        texture: state.texture,
      }
    }
  }

  function render(time) {
    const numericTime = Number(time)
    const normalizedTime = Number.isFinite(numericTime) ? numericTime : 0
    const job = renderTail.then(
      () => performRender(normalizedTime),
      () => performRender(normalizedTime),
    )
    renderTail = job.catch(() => {})
    return job
  }

  function setInputTexture(texture) {
    if (state.lifecycle === 'disposed') return Promise.resolve(snapshot())
    currentInputTexture = texture ?? null
    const candidate = activeCandidate
    if (state.lifecycle !== 'active' || !candidate || candidate.disposed) {
      return Promise.resolve(snapshot())
    }
    return enqueueGuarded(
      candidate.epoch,
      candidate.backend,
      () => bindInputTexture({
        backend: candidate.backend,
        graph: candidate.graph,
        pipeline: candidate.pipeline,
        texture: currentInputTexture,
      }),
      () => state.lifecycle === 'active' &&
        activeCandidate === candidate &&
        !candidate.disposed &&
        state.contextEpoch === candidate.epoch,
    ).then(() => snapshot())
  }

  function handleContextLost() {
    if (state.lifecycle !== 'active') return snapshot()
    state.generation += 1
    state.contextEpoch += 1
    state.lifecycle = 'context-lost'
    desiredChangedWhileContextLost = false
    recoveryRequired = false
    const abandonedCandidates = new Set(pendingCleanupCandidates)
    if (activeCandidate) abandonedCandidates.add(activeCandidate)
    for (const candidate of inFlightCandidates) abandonedCandidates.add(candidate)
    for (const candidate of abandonedCandidates) {
      cancelPipelineAsyncWork(candidate.pipeline)
      candidate.disposed = true
      candidate.cleanupComplete = true
    }
    inFlightCandidates.clear()
    pendingCleanupCandidates.clear()
    pendingCleanupCopier = null
    pendingCleanupCopierBackend = null
    activeCandidate = null
    outputCopier = null
    return publish({
      build: 'idle',
      error: new ControllerError(
        'ERR_CONTEXT_LOST',
        'context',
        'WebGL context was lost',
        { generation: state.generation },
      ),
      ready: false,
      texture: null,
    })
  }

  function handleContextRestored() {
    if (state.lifecycle === 'disposed' || state.lifecycle === 'active') {
      return Promise.resolve(snapshot())
    }
    state.lifecycle = 'active'
    state.generation += 1
    state.error = null
    const restoreGeneration = state.generation
    const restoreEpoch = state.contextEpoch
    const replayDsl = desiredChangedWhileContextLost ? state.desiredDsl : null
    desiredChangedWhileContextLost = false
    const restoreDsl = lastGoodDsl ?? state.desiredDsl
    if (restoreDsl === null) return Promise.resolve(publish({ build: 'idle' }))
    const restored = startBuild(restoreDsl, state.requestedSize)
    if (replayDsl === null || replayDsl === restoreDsl) return restored
    return restored.then((restoredState) => {
      if (
        state.lifecycle !== 'active' ||
        state.contextEpoch !== restoreEpoch ||
        state.generation !== restoreGeneration
      ) return restoredState
      state.generation += 1
      return startBuild(replayDsl, state.requestedSize)
    })
  }

  function dispose() {
    if (disposalPromise) return disposalPromise
    if (state.lifecycle !== 'disposed') {
      const canDeleteResources = state.lifecycle === 'active'
      const candidates = new Set(pendingCleanupCandidates)
      if (activeCandidate) candidates.add(activeCandidate)
      for (const candidate of inFlightCandidates) candidates.add(candidate)

      state.generation += 1
      state.lifecycle = 'disposed'
      recoveryRequired = false
      for (const candidate of candidates) {
        cancelPipelineAsyncWork(candidate.pipeline)
        candidate.disposed = true
        if (canDeleteResources && !candidate.cleanupComplete) {
          pendingCleanupCandidates.add(candidate)
        } else if (!canDeleteResources) {
          candidate.cleanupComplete = true
        }
      }
      if (canDeleteResources && outputCopier) {
        pendingCleanupCopier = outputCopier
        pendingCleanupCopierBackend = activeCandidate?.backend ?? candidates.values().next().value?.backend
      }
      if (!canDeleteResources) {
        pendingCleanupCandidates.clear()
        pendingCleanupCopier = null
        pendingCleanupCopierBackend = null
      }
      inFlightCandidates.clear()
      activeCandidate = null
      outputCopier = null
      publish({
        activeDsl: null,
        activeGeneration: null,
        activeSize: null,
        build: 'idle',
        ready: false,
        texture: null,
      })
    }

    if (pendingCleanupCandidates.size === 0 && !pendingCleanupCopier) {
      return Promise.resolve(snapshot())
    }

    const attempt = enqueue(() => {
      const failures = []
      for (const candidate of [...pendingCleanupCandidates]) {
        try {
          guardedNow(candidate.backend, () => {
            cancelPipelineAsyncWork(candidate.pipeline)
            candidate.pipeline.dispose()
          })
          candidate.cleanupComplete = true
          pendingCleanupCandidates.delete(candidate)
        } catch (error) {
          failures.push(error)
        }
      }
      if (pendingCleanupCopier) {
        try {
          guardedNow(pendingCleanupCopierBackend, () => {
            pendingCleanupCopier.dispose()
          })
          pendingCleanupCopier = null
          pendingCleanupCopierBackend = null
        } catch (error) {
          failures.push(error)
        }
      }
      if (failures.length > 0) {
        publish({
          error: toControllerError(
            'dispose',
            new AggregateError(failures, 'Controller resource disposal failed'),
            { generation: state.generation },
          ),
        })
      } else if (state.error?.phase === 'dispose') {
        publish({ error: null })
      }
      return snapshot()
    }).catch((error) => publish({
      error: toControllerError('dispose', error, { generation: state.generation }),
    }))
    disposalPromise = attempt.then((value) => {
      disposalPromise = null
      return value
    })
    return disposalPromise
  }

  return {
    configure,
    dispose,
    getState: snapshot,
    handleContextLost,
    handleContextRestored,
    render,
    reset: rebuildActiveProgram,
    setInputTexture,
    setProgram: (dsl) => configure({ dsl }),
    setSize: (size) => configure({ size }),
  }
}

export { ControllerError } from './errors.js'
