import { createCGLCacheInvalidator } from './cgl-cache.js'

const BINDINGS = [
  ['CURRENT_PROGRAM', 'useProgram'],
  ['DRAW_FRAMEBUFFER_BINDING', 'drawFramebuffer'],
  ['READ_FRAMEBUFFER_BINDING', 'readFramebuffer'],
  ['RENDERBUFFER_BINDING', 'renderbuffer'],
  ['VERTEX_ARRAY_BINDING', 'vertexArray'],
  ['ARRAY_BUFFER_BINDING', 'arrayBuffer'],
  ['ELEMENT_ARRAY_BUFFER_BINDING', 'elementArrayBuffer'],
  ['UNIFORM_BUFFER_BINDING', 'uniformBuffer'],
  ['COPY_READ_BUFFER_BINDING', 'copyReadBuffer'],
  ['COPY_WRITE_BUFFER_BINDING', 'copyWriteBuffer'],
  ['PIXEL_PACK_BUFFER_BINDING', 'pixelPackBuffer'],
  ['PIXEL_UNPACK_BUFFER_BINDING', 'pixelUnpackBuffer'],
  ['TRANSFORM_FEEDBACK_BINDING', 'transformFeedback'],
  ['TRANSFORM_FEEDBACK_BUFFER_BINDING', 'transformFeedbackBuffer'],
]

const PARAMETERS = [
  ['VIEWPORT', 'viewport'],
  ['SCISSOR_BOX', 'scissorBox'],
  ['BLEND_EQUATION_RGB', 'blendEquationRgb'],
  ['BLEND_EQUATION_ALPHA', 'blendEquationAlpha'],
  ['BLEND_SRC_RGB', 'blendSrcRgb'],
  ['BLEND_SRC_ALPHA', 'blendSrcAlpha'],
  ['BLEND_DST_RGB', 'blendDstRgb'],
  ['BLEND_DST_ALPHA', 'blendDstAlpha'],
  ['BLEND_COLOR', 'blendColor'],
  ['DEPTH_FUNC', 'depthFunc'],
  ['DEPTH_RANGE', 'depthRange'],
  ['DEPTH_WRITEMASK', 'depthWriteMask'],
  ['DEPTH_CLEAR_VALUE', 'depthClearValue'],
  ['CULL_FACE_MODE', 'cullFaceMode'],
  ['FRONT_FACE', 'frontFace'],
  ['STENCIL_FUNC', 'stencilFunc'],
  ['STENCIL_REF', 'stencilRef'],
  ['STENCIL_VALUE_MASK', 'stencilValueMask'],
  ['STENCIL_FAIL', 'stencilFail'],
  ['STENCIL_PASS_DEPTH_FAIL', 'stencilPassDepthFail'],
  ['STENCIL_PASS_DEPTH_PASS', 'stencilPassDepthPass'],
  ['STENCIL_WRITEMASK', 'stencilWriteMask'],
  ['STENCIL_BACK_FUNC', 'stencilBackFunc'],
  ['STENCIL_BACK_REF', 'stencilBackRef'],
  ['STENCIL_BACK_VALUE_MASK', 'stencilBackValueMask'],
  ['STENCIL_BACK_FAIL', 'stencilBackFail'],
  ['STENCIL_BACK_PASS_DEPTH_FAIL', 'stencilBackPassDepthFail'],
  ['STENCIL_BACK_PASS_DEPTH_PASS', 'stencilBackPassDepthPass'],
  ['STENCIL_BACK_WRITEMASK', 'stencilBackWriteMask'],
  ['STENCIL_CLEAR_VALUE', 'stencilClearValue'],
  ['COLOR_WRITEMASK', 'colorWriteMask'],
  ['COLOR_CLEAR_VALUE', 'colorClearValue'],
  ['POLYGON_OFFSET_FACTOR', 'polygonOffsetFactor'],
  ['POLYGON_OFFSET_UNITS', 'polygonOffsetUnits'],
  ['SAMPLE_COVERAGE_VALUE', 'sampleCoverageValue'],
  ['SAMPLE_COVERAGE_INVERT', 'sampleCoverageInvert'],
  ['LINE_WIDTH', 'lineWidth'],
  ['READ_BUFFER', 'readBuffer'],
]

const PIXEL_STORE_PARAMETERS = [
  'PACK_ALIGNMENT',
  'PACK_ROW_LENGTH',
  'PACK_SKIP_PIXELS',
  'PACK_SKIP_ROWS',
  'UNPACK_ALIGNMENT',
  'UNPACK_ROW_LENGTH',
  'UNPACK_IMAGE_HEIGHT',
  'UNPACK_SKIP_PIXELS',
  'UNPACK_SKIP_ROWS',
  'UNPACK_SKIP_IMAGES',
  'UNPACK_FLIP_Y_WEBGL',
  'UNPACK_PREMULTIPLY_ALPHA_WEBGL',
  'UNPACK_COLORSPACE_CONVERSION_WEBGL',
]

const ENABLES = [
  'BLEND',
  'DEPTH_TEST',
  'CULL_FACE',
  'STENCIL_TEST',
  'SCISSOR_TEST',
  'RASTERIZER_DISCARD',
  'POLYGON_OFFSET_FILL',
  'SAMPLE_ALPHA_TO_COVERAGE',
  'SAMPLE_COVERAGE',
  'DITHER',
]

const TEXTURE_BINDINGS = [
  ['TEXTURE_2D', 'TEXTURE_BINDING_2D'],
  ['TEXTURE_3D', 'TEXTURE_BINDING_3D'],
  ['TEXTURE_2D_ARRAY', 'TEXTURE_BINDING_2D_ARRAY'],
  ['TEXTURE_CUBE_MAP', 'TEXTURE_BINDING_CUBE_MAP'],
]

function hasEnum(gl, name) {
  return typeof gl[name] === 'number'
}

function cloneParameter(value) {
  if (Array.isArray(value)) return [...value]
  if (ArrayBuffer.isView(value)) return Array.from(value)
  return value
}

function queryOptional(gl, name) {
  if (!hasEnum(gl, name)) return { supported: false }
  try {
    return { supported: true, value: cloneParameter(gl.getParameter(gl[name])) }
  } catch {
    return { supported: false }
  }
}

function captureNamedParameters(gl, definitions) {
  const captured = {}
  for (const [enumName, key] of definitions) {
    const result = queryOptional(gl, enumName)
    if (result.supported) captured[key] = result.value
  }
  return captured
}

function textureUnitCount(gl, requested) {
  const maximumResult = queryOptional(gl, 'MAX_COMBINED_TEXTURE_IMAGE_UNITS')
  if (!maximumResult.supported || !Number.isFinite(maximumResult.value)) {
    throw new TypeError('WebGL2 MAX_COMBINED_TEXTURE_IMAGE_UNITS is unavailable')
  }
  const maximum = Math.max(0, Math.floor(maximumResult.value))
  if (requested === undefined) return maximum
  if (!Number.isFinite(requested) || requested < 0) {
    throw new RangeError('maxTextureUnits must be a non-negative finite number')
  }
  return Math.min(maximum, Math.floor(requested))
}

function callIfSupported(gl, method, ...args) {
  if (typeof gl[method] !== 'function') return
  if (args.some((argument) => argument === undefined)) return
  gl[method](...args)
}

/**
 * Establish the deterministic WebGL defaults expected by Noisemaker while the
 * caller's exact host state is protected by withGLState().
 */
export function prepareNoisemakerGLState(gl, options = {}) {
  const disabled = [
    'BLEND',
    'DEPTH_TEST',
    'CULL_FACE',
    'STENCIL_TEST',
    'SCISSOR_TEST',
    'RASTERIZER_DISCARD',
    'POLYGON_OFFSET_FILL',
    'SAMPLE_ALPHA_TO_COVERAGE',
    'SAMPLE_COVERAGE',
  ]
  for (const name of disabled) {
    if (hasEnum(gl, name)) callIfSupported(gl, 'disable', gl[name])
  }
  if (hasEnum(gl, 'DITHER')) callIfSupported(gl, 'enable', gl.DITHER)

  callIfSupported(gl, 'blendEquationSeparate', gl.FUNC_ADD, gl.FUNC_ADD)
  callIfSupported(gl, 'blendFuncSeparate', gl.ONE, gl.ZERO, gl.ONE, gl.ZERO)
  callIfSupported(gl, 'blendColor', 0, 0, 0, 0)
  callIfSupported(gl, 'depthFunc', gl.LESS)
  callIfSupported(gl, 'depthRange', 0, 1)
  callIfSupported(gl, 'depthMask', true)
  callIfSupported(gl, 'clearDepth', 1)
  callIfSupported(gl, 'cullFace', gl.BACK)
  callIfSupported(gl, 'frontFace', gl.CCW)

  for (const face of [gl.FRONT, gl.BACK]) {
    callIfSupported(gl, 'stencilFuncSeparate', face, gl.ALWAYS, 0, 0xffffffff)
    callIfSupported(gl, 'stencilOpSeparate', face, gl.KEEP, gl.KEEP, gl.KEEP)
    callIfSupported(gl, 'stencilMaskSeparate', face, 0xffffffff)
  }
  callIfSupported(gl, 'clearStencil', 0)
  callIfSupported(gl, 'colorMask', true, true, true, true)
  callIfSupported(gl, 'clearColor', 0, 0, 0, 0)

  callIfSupported(gl, 'bindBuffer', gl.PIXEL_PACK_BUFFER, null)
  callIfSupported(gl, 'bindBuffer', gl.PIXEL_UNPACK_BUFFER, null)
  const transformFeedbackActive = queryOptional(gl, 'TRANSFORM_FEEDBACK_ACTIVE')
  if (!transformFeedbackActive.supported || !transformFeedbackActive.value) {
    callIfSupported(gl, 'bindTransformFeedback', gl.TRANSFORM_FEEDBACK, null)
    callIfSupported(gl, 'bindBuffer', gl.TRANSFORM_FEEDBACK_BUFFER, null)
  }

  const pixelStoreDefaults = {
    PACK_ALIGNMENT: 4,
    PACK_ROW_LENGTH: 0,
    PACK_SKIP_PIXELS: 0,
    PACK_SKIP_ROWS: 0,
    UNPACK_ALIGNMENT: 4,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: gl.BROWSER_DEFAULT_WEBGL,
    UNPACK_FLIP_Y_WEBGL: false,
    UNPACK_IMAGE_HEIGHT: 0,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: false,
    UNPACK_ROW_LENGTH: 0,
    UNPACK_SKIP_IMAGES: 0,
    UNPACK_SKIP_PIXELS: 0,
    UNPACK_SKIP_ROWS: 0,
  }
  for (const [name, value] of Object.entries(pixelStoreDefaults)) {
    if (hasEnum(gl, name) && value !== undefined) callIfSupported(gl, 'pixelStorei', gl[name], value)
  }

  callIfSupported(gl, 'polygonOffset', 0, 0)
  callIfSupported(gl, 'sampleCoverage', 1, false)
  callIfSupported(gl, 'lineWidth', 1)

  const count = textureUnitCount(gl, options.maxTextureUnits)
  if (hasEnum(gl, 'TEXTURE0')) {
    for (let unit = 0; unit < count; unit += 1) {
      callIfSupported(gl, 'bindSampler', unit, null)
    }
    callIfSupported(gl, 'activeTexture', gl.TEXTURE0)
  }
}

function captureTextureUnits(gl, count, originalActiveTexture) {
  const textureUnits = []
  try {
    for (let unit = 0; unit < count; unit += 1) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      const bindings = []
      for (const [targetName, bindingName] of TEXTURE_BINDINGS) {
        if (!hasEnum(gl, targetName)) continue
        const result = queryOptional(gl, bindingName)
        if (result.supported) bindings.push({ targetName, value: result.value })
      }
      const sampler = queryOptional(gl, 'SAMPLER_BINDING')
      textureUnits.push({
        bindings,
        sampler: sampler.supported ? sampler.value : undefined,
        samplerSupported: sampler.supported,
        unit,
      })
    }
  } finally {
    gl.activeTexture(originalActiveTexture)
  }
  return textureUnits
}

function captureIndexedBindings(gl, {
  bindingName,
  maximumName,
  sizeName,
  startName,
}) {
  if (
    typeof gl.getIndexedParameter !== 'function' ||
    !hasEnum(gl, bindingName) ||
    !hasEnum(gl, maximumName)
  ) return []

  const maximum = queryOptional(gl, maximumName)
  if (!maximum.supported || !Number.isFinite(maximum.value)) return []
  const bindings = []
  for (let index = 0; index < Math.max(0, Math.floor(maximum.value)); index += 1) {
    try {
      bindings.push({
        buffer: gl.getIndexedParameter(gl[bindingName], index),
        index,
        offset: hasEnum(gl, startName) ? gl.getIndexedParameter(gl[startName], index) : 0,
        size: hasEnum(gl, sizeName) ? gl.getIndexedParameter(gl[sizeName], index) : 0,
      })
    } catch {
      break
    }
  }
  return bindings
}

function captureDrawBuffers(gl) {
  if (
    typeof gl.drawBuffers !== 'function' ||
    !hasEnum(gl, 'DRAW_BUFFER0') ||
    !hasEnum(gl, 'MAX_DRAW_BUFFERS')
  ) return undefined
  const maximum = queryOptional(gl, 'MAX_DRAW_BUFFERS')
  if (!maximum.supported || !Number.isFinite(maximum.value)) return undefined
  const values = []
  for (let index = 0; index < Math.max(0, Math.floor(maximum.value)); index += 1) {
    try {
      values.push(gl.getParameter(gl.DRAW_BUFFER0 + index))
    } catch {
      break
    }
  }
  while (values.length > 1 && hasEnum(gl, 'NONE') && values.at(-1) === gl.NONE) values.pop()
  return values
}

export function captureGLState(gl, options = {}) {
  const activeTexture = queryOptional(gl, 'ACTIVE_TEXTURE')
  if (!activeTexture.supported || !hasEnum(gl, 'TEXTURE0')) {
    throw new TypeError('WebGL2 active texture state is unavailable')
  }

  const transformFeedbackActive = queryOptional(gl, 'TRANSFORM_FEEDBACK_ACTIVE')
  const transformFeedbackPaused = queryOptional(gl, 'TRANSFORM_FEEDBACK_PAUSED')
  const transformFeedback = {
    active: transformFeedbackActive.supported ? transformFeedbackActive.value : false,
    paused: transformFeedbackPaused.supported ? transformFeedbackPaused.value : false,
    supported: transformFeedbackActive.supported,
  }
  if (transformFeedback.active) {
    const error = new Error(
      'Cannot guard active host transform feedback because WebGL2 cannot query its primitive mode',
    )
    error.code = 'ERR_ACTIVE_HOST_TRANSFORM_FEEDBACK'
    throw error
  }

  const count = textureUnitCount(gl, options.maxTextureUnits)
  const bindings = captureNamedParameters(gl, BINDINGS)
  const parameters = captureNamedParameters(gl, PARAMETERS)
  const pixelStore = {}
  for (const name of PIXEL_STORE_PARAMETERS) {
    const result = queryOptional(gl, name)
    if (result.supported) pixelStore[name] = result.value
  }
  const enables = {}
  for (const name of ENABLES) {
    if (hasEnum(gl, name)) enables[name] = gl.isEnabled(gl[name])
  }

  return {
    activeTexture: activeTexture.value,
    bindings,
    drawBuffers: captureDrawBuffers(gl),
    enables,
    parameters,
    pixelStore,
    textureUnits: captureTextureUnits(gl, count, activeTexture.value),
    transformFeedback,
    transformFeedbackIndexedBindings: captureIndexedBindings(gl, {
      bindingName: 'TRANSFORM_FEEDBACK_BUFFER_BINDING',
      maximumName: 'MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS',
      sizeName: 'TRANSFORM_FEEDBACK_BUFFER_SIZE',
      startName: 'TRANSFORM_FEEDBACK_BUFFER_START',
    }),
    uniformIndexedBindings: captureIndexedBindings(gl, {
      bindingName: 'UNIFORM_BUFFER_BINDING',
      maximumName: 'MAX_UNIFORM_BUFFER_BINDINGS',
      sizeName: 'UNIFORM_BUFFER_SIZE',
      startName: 'UNIFORM_BUFFER_START',
    }),
  }
}

function restoreIndexedBindings(gl, targetName, bindings, attempt) {
  if (!hasEnum(gl, targetName) || typeof gl.bindBufferBase !== 'function') return
  for (const binding of bindings) {
    if (
      binding.buffer !== null &&
      binding.size > 0 &&
      typeof gl.bindBufferRange === 'function'
    ) {
      attempt(() => gl.bindBufferRange(
        gl[targetName],
        binding.index,
        binding.buffer,
        binding.offset,
        binding.size,
      ))
    } else {
      attempt(() => gl.bindBufferBase(gl[targetName], binding.index, binding.buffer))
    }
  }
}

function restoreBuffer(gl, targetName, value, attempt) {
  if (value !== undefined && hasEnum(gl, targetName) && typeof gl.bindBuffer === 'function') {
    attempt(() => gl.bindBuffer(gl[targetName], value))
  }
}

function restoreTextureUnits(gl, snapshot, attempt) {
  for (const unit of snapshot.textureUnits) {
    const unitIsActive = attempt(() => gl.activeTexture(gl.TEXTURE0 + unit.unit))
    if (!unitIsActive) continue
    for (const binding of unit.bindings) {
      if (hasEnum(gl, binding.targetName)) {
        attempt(() => gl.bindTexture(gl[binding.targetName], binding.value))
      }
    }
    if (unit.samplerSupported && typeof gl.bindSampler === 'function') {
      attempt(() => gl.bindSampler(unit.unit, unit.sampler))
    }
  }
  attempt(() => gl.activeTexture(snapshot.activeTexture))
}

function restoreEnableState(gl, enables, attempt) {
  for (const [name, enabled] of Object.entries(enables)) {
    if (!hasEnum(gl, name)) continue
    if (enabled) attempt(() => gl.enable(gl[name]))
    else attempt(() => gl.disable(gl[name]))
  }
}

export function restoreGLState(gl, snapshot) {
  const { bindings, parameters } = snapshot
  const failures = []
  const attempt = (operation) => {
    try {
      operation()
      return true
    } catch (error) {
      failures.push(error)
      return false
    }
  }

  let canRestoreTransformFeedback = true
  const guestTransformFeedbackActive = queryOptional(gl, 'TRANSFORM_FEEDBACK_ACTIVE')
  if (guestTransformFeedbackActive.supported && guestTransformFeedbackActive.value) {
    if (typeof gl.endTransformFeedback === 'function') {
      canRestoreTransformFeedback = attempt(() => gl.endTransformFeedback())
    } else {
      failures.push(new Error('Cannot end active guest transform feedback'))
      canRestoreTransformFeedback = false
    }
  }

  if ('useProgram' in bindings) attempt(() => gl.useProgram(bindings.useProgram))
  if ('drawFramebuffer' in bindings && hasEnum(gl, 'DRAW_FRAMEBUFFER')) {
    attempt(() => gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, bindings.drawFramebuffer))
  }
  if ('readFramebuffer' in bindings && hasEnum(gl, 'READ_FRAMEBUFFER')) {
    attempt(() => gl.bindFramebuffer(gl.READ_FRAMEBUFFER, bindings.readFramebuffer))
  }
  if ('renderbuffer' in bindings && hasEnum(gl, 'RENDERBUFFER')) {
    attempt(() => gl.bindRenderbuffer(gl.RENDERBUFFER, bindings.renderbuffer))
  }
  if ('vertexArray' in bindings && typeof gl.bindVertexArray === 'function') {
    attempt(() => gl.bindVertexArray(bindings.vertexArray))
  }
  restoreBuffer(gl, 'ARRAY_BUFFER', bindings.arrayBuffer, attempt)
  restoreBuffer(gl, 'ELEMENT_ARRAY_BUFFER', bindings.elementArrayBuffer, attempt)
  restoreBuffer(gl, 'COPY_READ_BUFFER', bindings.copyReadBuffer, attempt)
  restoreBuffer(gl, 'COPY_WRITE_BUFFER', bindings.copyWriteBuffer, attempt)
  restoreBuffer(gl, 'PIXEL_PACK_BUFFER', bindings.pixelPackBuffer, attempt)
  restoreBuffer(gl, 'PIXEL_UNPACK_BUFFER', bindings.pixelUnpackBuffer, attempt)

  if (
    canRestoreTransformFeedback &&
    'transformFeedback' in bindings &&
    hasEnum(gl, 'TRANSFORM_FEEDBACK') &&
    typeof gl.bindTransformFeedback === 'function'
  ) attempt(() => gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, bindings.transformFeedback))

  restoreIndexedBindings(gl, 'UNIFORM_BUFFER', snapshot.uniformIndexedBindings, attempt)
  if (canRestoreTransformFeedback) {
    restoreIndexedBindings(
      gl,
      'TRANSFORM_FEEDBACK_BUFFER',
      snapshot.transformFeedbackIndexedBindings,
      attempt,
    )
  }
  restoreBuffer(gl, 'UNIFORM_BUFFER', bindings.uniformBuffer, attempt)
  if (canRestoreTransformFeedback) {
    restoreBuffer(
      gl,
      'TRANSFORM_FEEDBACK_BUFFER',
      bindings.transformFeedbackBuffer,
      attempt,
    )
  }

  if (parameters.viewport) attempt(() => gl.viewport(...parameters.viewport))
  if (parameters.scissorBox) attempt(() => gl.scissor(...parameters.scissorBox))
  restoreTextureUnits(gl, snapshot, attempt)

  if (
    parameters.blendEquationRgb !== undefined &&
    parameters.blendEquationAlpha !== undefined
  ) {
    attempt(() => gl.blendEquationSeparate(
      parameters.blendEquationRgb,
      parameters.blendEquationAlpha,
    ))
  }
  if (
    parameters.blendSrcRgb !== undefined &&
    parameters.blendDstRgb !== undefined &&
    parameters.blendSrcAlpha !== undefined &&
    parameters.blendDstAlpha !== undefined
  ) {
    attempt(() => gl.blendFuncSeparate(
      parameters.blendSrcRgb,
      parameters.blendDstRgb,
      parameters.blendSrcAlpha,
      parameters.blendDstAlpha,
    ))
  }
  if (parameters.blendColor) attempt(() => gl.blendColor(...parameters.blendColor))
  if (parameters.depthFunc !== undefined) attempt(() => gl.depthFunc(parameters.depthFunc))
  if (parameters.depthRange) attempt(() => gl.depthRange(...parameters.depthRange))
  if (parameters.depthWriteMask !== undefined) {
    attempt(() => gl.depthMask(parameters.depthWriteMask))
  }
  if (parameters.depthClearValue !== undefined && typeof gl.clearDepth === 'function') {
    attempt(() => gl.clearDepth(parameters.depthClearValue))
  }
  if (parameters.cullFaceMode !== undefined) attempt(() => gl.cullFace(parameters.cullFaceMode))
  if (parameters.frontFace !== undefined) attempt(() => gl.frontFace(parameters.frontFace))

  if (parameters.stencilFunc !== undefined) {
    attempt(() => gl.stencilFuncSeparate(
      gl.FRONT,
      parameters.stencilFunc,
      parameters.stencilRef,
      parameters.stencilValueMask,
    ))
    attempt(() => gl.stencilOpSeparate(
      gl.FRONT,
      parameters.stencilFail,
      parameters.stencilPassDepthFail,
      parameters.stencilPassDepthPass,
    ))
    attempt(() => gl.stencilMaskSeparate(gl.FRONT, parameters.stencilWriteMask))
  }
  if (parameters.stencilBackFunc !== undefined) {
    attempt(() => gl.stencilFuncSeparate(
      gl.BACK,
      parameters.stencilBackFunc,
      parameters.stencilBackRef,
      parameters.stencilBackValueMask,
    ))
    attempt(() => gl.stencilOpSeparate(
      gl.BACK,
      parameters.stencilBackFail,
      parameters.stencilBackPassDepthFail,
      parameters.stencilBackPassDepthPass,
    ))
    attempt(() => gl.stencilMaskSeparate(gl.BACK, parameters.stencilBackWriteMask))
  }
  if (parameters.stencilClearValue !== undefined && typeof gl.clearStencil === 'function') {
    attempt(() => gl.clearStencil(parameters.stencilClearValue))
  }
  if (parameters.colorWriteMask) attempt(() => gl.colorMask(...parameters.colorWriteMask))
  if (parameters.colorClearValue) attempt(() => gl.clearColor(...parameters.colorClearValue))

  for (const [name, value] of Object.entries(snapshot.pixelStore)) {
    if (hasEnum(gl, name)) attempt(() => gl.pixelStorei(gl[name], value))
  }
  if (
    parameters.polygonOffsetFactor !== undefined &&
    parameters.polygonOffsetUnits !== undefined &&
    typeof gl.polygonOffset === 'function'
  ) {
    attempt(() => gl.polygonOffset(
      parameters.polygonOffsetFactor,
      parameters.polygonOffsetUnits,
    ))
  }
  if (
    parameters.sampleCoverageValue !== undefined &&
    parameters.sampleCoverageInvert !== undefined &&
    typeof gl.sampleCoverage === 'function'
  ) {
    attempt(() => gl.sampleCoverage(
      parameters.sampleCoverageValue,
      parameters.sampleCoverageInvert,
    ))
  }
  if (parameters.lineWidth !== undefined && typeof gl.lineWidth === 'function') {
    attempt(() => gl.lineWidth(parameters.lineWidth))
  }
  if (parameters.readBuffer !== undefined && typeof gl.readBuffer === 'function') {
    attempt(() => gl.readBuffer(parameters.readBuffer))
  }
  if (snapshot.drawBuffers && typeof gl.drawBuffers === 'function') {
    attempt(() => gl.drawBuffers(snapshot.drawBuffers))
  }
  restoreEnableState(gl, snapshot.enables, attempt)

  if (failures.length > 0) {
    throw new AggregateError(failures, 'WebGL state restoration failed')
  }
}

function appendCleanupFailure(failures, error) {
  if (error instanceof AggregateError) failures.push(...error.errors)
  else failures.push(error)
}

function collectCleanupFailures(gl, snapshot, invalidateCaches) {
  const failures = []
  try {
    restoreGLState(gl, snapshot)
  } catch (error) {
    appendCleanupFailure(failures, error)
  }
  try {
    invalidateCaches()
  } catch (error) {
    appendCleanupFailure(failures, error)
  }
  return failures
}

function cleanupAfterSuccess(gl, snapshot, invalidateCaches) {
  const failures = collectCleanupFailures(gl, snapshot, invalidateCaches)
  if (failures.length > 0) {
    throw new AggregateError(failures, 'WebGL/CGL state cleanup failed')
  }
}

function cleanupAfterFailure(primaryError, gl, snapshot, invalidateCaches) {
  const failures = collectCleanupFailures(gl, snapshot, invalidateCaches)
  if (failures.length === 0) throw primaryError

  if (
    (typeof primaryError === 'object' && primaryError !== null) ||
    typeof primaryError === 'function'
  ) {
    try {
      Object.defineProperty(primaryError, 'cleanupErrors', {
        configurable: true,
        value: Object.freeze([...failures]),
      })
      throw primaryError
    } catch (error) {
      if (error === primaryError) throw error
    }
  }

  throw new AggregateError(
    failures,
    'WebGL/CGL state cleanup failed after callback failure',
    { cause: primaryError },
  )
}

export function withGLState(gl, cgl, callback, options = {}) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function')
  const invalidateCaches = createCGLCacheInvalidator(cgl, options)
  const snapshot = captureGLState(gl, options)
  let result
  try {
    result = callback()
  } catch (error) {
    cleanupAfterFailure(error, gl, snapshot, invalidateCaches)
  }

  let isPromiseLike
  try {
    isPromiseLike = result !== null &&
      (typeof result === 'object' || typeof result === 'function') &&
      typeof result.then === 'function'
  } catch (error) {
    cleanupAfterFailure(error, gl, snapshot, invalidateCaches)
  }

  if (!isPromiseLike) {
    cleanupAfterSuccess(gl, snapshot, invalidateCaches)
    return result
  }

  return Promise.resolve(result).then(
    (value) => {
      cleanupAfterSuccess(gl, snapshot, invalidateCaches)
      return value
    },
    (error) => {
      cleanupAfterFailure(error, gl, snapshot, invalidateCaches)
    },
  )
}
