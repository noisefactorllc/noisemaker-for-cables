function cloneValue(value) {
  return Array.isArray(value) ? [...value] : value
}

export function createFakeWebGL2(options = {}) {
  const gl = {
    calls: [],
  }

  let nextEnum = 0x1000
  const define = (name, value = nextEnum++) => {
    gl[name] = value
    return value
  }

  define('TEXTURE0', 0x84c0)
  define('DRAW_BUFFER0', 0x8825)
  define('BROWSER_DEFAULT_WEBGL', 0x9244)

  for (const name of [
    'CURRENT_PROGRAM',
    'DRAW_FRAMEBUFFER_BINDING',
    'READ_FRAMEBUFFER_BINDING',
    'RENDERBUFFER_BINDING',
    'VERTEX_ARRAY_BINDING',
    'ARRAY_BUFFER_BINDING',
    'ELEMENT_ARRAY_BUFFER_BINDING',
    'UNIFORM_BUFFER_BINDING',
    'COPY_READ_BUFFER_BINDING',
    'COPY_WRITE_BUFFER_BINDING',
    'PIXEL_PACK_BUFFER_BINDING',
    'PIXEL_UNPACK_BUFFER_BINDING',
    'TRANSFORM_FEEDBACK_BINDING',
    'TRANSFORM_FEEDBACK_BUFFER_BINDING',
    'TRANSFORM_FEEDBACK_BUFFER_START',
    'TRANSFORM_FEEDBACK_BUFFER_SIZE',
    'TRANSFORM_FEEDBACK_ACTIVE',
    'TRANSFORM_FEEDBACK_PAUSED',
    'UNIFORM_BUFFER_START',
    'UNIFORM_BUFFER_SIZE',
    'VIEWPORT',
    'SCISSOR_BOX',
    'ACTIVE_TEXTURE',
    'TEXTURE_BINDING_2D',
    'TEXTURE_BINDING_CUBE_MAP',
    'SAMPLER_BINDING',
    'BLEND_EQUATION_RGB',
    'BLEND_EQUATION_ALPHA',
    'BLEND_SRC_RGB',
    'BLEND_SRC_ALPHA',
    'BLEND_DST_RGB',
    'BLEND_DST_ALPHA',
    'BLEND_COLOR',
    'DEPTH_FUNC',
    'DEPTH_RANGE',
    'DEPTH_WRITEMASK',
    'DEPTH_CLEAR_VALUE',
    'CULL_FACE_MODE',
    'FRONT_FACE',
    'STENCIL_FUNC',
    'STENCIL_REF',
    'STENCIL_VALUE_MASK',
    'STENCIL_FAIL',
    'STENCIL_PASS_DEPTH_FAIL',
    'STENCIL_PASS_DEPTH_PASS',
    'STENCIL_WRITEMASK',
    'STENCIL_BACK_FUNC',
    'STENCIL_BACK_REF',
    'STENCIL_BACK_VALUE_MASK',
    'STENCIL_BACK_FAIL',
    'STENCIL_BACK_PASS_DEPTH_FAIL',
    'STENCIL_BACK_PASS_DEPTH_PASS',
    'STENCIL_BACK_WRITEMASK',
    'STENCIL_CLEAR_VALUE',
    'COLOR_WRITEMASK',
    'COLOR_CLEAR_VALUE',
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
    'POLYGON_OFFSET_FACTOR',
    'POLYGON_OFFSET_UNITS',
    'SAMPLE_COVERAGE_VALUE',
    'SAMPLE_COVERAGE_INVERT',
    'LINE_WIDTH',
    'READ_BUFFER',
    'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
    'MAX_DRAW_BUFFERS',
    'MAX_UNIFORM_BUFFER_BINDINGS',
    'MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS',
  ]) define(name)

  if (options.optionalTextureTargets !== false) {
    define('TEXTURE_BINDING_3D')
    define('TEXTURE_BINDING_2D_ARRAY')
  }

  for (const name of [
    'DRAW_FRAMEBUFFER',
    'READ_FRAMEBUFFER',
    'FRAMEBUFFER',
    'RENDERBUFFER',
    'ARRAY_BUFFER',
    'ELEMENT_ARRAY_BUFFER',
    'UNIFORM_BUFFER',
    'COPY_READ_BUFFER',
    'COPY_WRITE_BUFFER',
    'PIXEL_PACK_BUFFER',
    'PIXEL_UNPACK_BUFFER',
    'TRANSFORM_FEEDBACK',
    'TRANSFORM_FEEDBACK_BUFFER',
    'POINTS',
    'TEXTURE_2D',
    'TEXTURE_CUBE_MAP',
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
    'FRONT',
    'BACK',
    'FRONT_AND_BACK',
    'FUNC_ADD',
    'FUNC_SUBTRACT',
    'ONE',
    'ZERO',
    'SRC_ALPHA',
    'ONE_MINUS_SRC_ALPHA',
    'LESS',
    'GREATER',
    'CW',
    'CCW',
    'ALWAYS',
    'NEVER',
    'KEEP',
    'REPLACE',
    'INCR',
    'DECR',
    'BACK_LEFT',
    'COLOR_ATTACHMENT0',
    'COLOR_ATTACHMENT1',
  ]) define(name)

  if (options.optionalTextureTargets !== false) {
    define('TEXTURE_3D')
    define('TEXTURE_2D_ARRAY')
  }

  const maxTextureUnits = options.maxTextureUnits ?? 4
  const maxDrawBuffers = options.maxDrawBuffers ?? 2
  const maxUniformBindings = options.maxUniformBindings ?? 2
  const maxTransformFeedbackBindings = options.maxTransformFeedbackBindings ?? 2
  const state = new Map()
  const enabled = new Set([gl.DITHER])
  const textureUnits = Array.from({ length: maxTextureUnits }, () => new Map())
  const samplers = Array.from({ length: maxTextureUnits }, () => null)
  const uniformBindings = Array.from({ length: maxUniformBindings }, () => ({
    buffer: null,
    offset: 0,
    size: 0,
  }))
  const transformFeedbackBindings = Array.from(
    { length: maxTransformFeedbackBindings },
    () => ({ buffer: null, offset: 0, size: 0 }),
  )
  let activeTexture = gl.TEXTURE0
  let drawBuffers = [gl.BACK_LEFT]

  const bindingEnumByTarget = new Map([
    [gl.ARRAY_BUFFER, gl.ARRAY_BUFFER_BINDING],
    [gl.ELEMENT_ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER_BINDING],
    [gl.UNIFORM_BUFFER, gl.UNIFORM_BUFFER_BINDING],
    [gl.COPY_READ_BUFFER, gl.COPY_READ_BUFFER_BINDING],
    [gl.COPY_WRITE_BUFFER, gl.COPY_WRITE_BUFFER_BINDING],
    [gl.PIXEL_PACK_BUFFER, gl.PIXEL_PACK_BUFFER_BINDING],
    [gl.PIXEL_UNPACK_BUFFER, gl.PIXEL_UNPACK_BUFFER_BINDING],
    [gl.TRANSFORM_FEEDBACK_BUFFER, gl.TRANSFORM_FEEDBACK_BUFFER_BINDING],
  ])
  const textureBindingEnumByTarget = new Map([
    [gl.TEXTURE_2D, gl.TEXTURE_BINDING_2D],
    [gl.TEXTURE_CUBE_MAP, gl.TEXTURE_BINDING_CUBE_MAP],
  ])
  if (gl.TEXTURE_3D !== undefined) {
    textureBindingEnumByTarget.set(gl.TEXTURE_3D, gl.TEXTURE_BINDING_3D)
    textureBindingEnumByTarget.set(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_BINDING_2D_ARRAY)
  }
  const textureTargetByBindingEnum = new Map(
    [...textureBindingEnumByTarget].map(([target, binding]) => [binding, target]),
  )

  for (const [name, value] of [
    ['CURRENT_PROGRAM', null],
    ['DRAW_FRAMEBUFFER_BINDING', null],
    ['READ_FRAMEBUFFER_BINDING', null],
    ['RENDERBUFFER_BINDING', null],
    ['VERTEX_ARRAY_BINDING', null],
    ['ARRAY_BUFFER_BINDING', null],
    ['ELEMENT_ARRAY_BUFFER_BINDING', null],
    ['UNIFORM_BUFFER_BINDING', null],
    ['COPY_READ_BUFFER_BINDING', null],
    ['COPY_WRITE_BUFFER_BINDING', null],
    ['PIXEL_PACK_BUFFER_BINDING', null],
    ['PIXEL_UNPACK_BUFFER_BINDING', null],
    ['TRANSFORM_FEEDBACK_BINDING', null],
    ['TRANSFORM_FEEDBACK_BUFFER_BINDING', null],
    ['TRANSFORM_FEEDBACK_ACTIVE', false],
    ['TRANSFORM_FEEDBACK_PAUSED', false],
    ['VIEWPORT', [0, 0, 640, 480]],
    ['SCISSOR_BOX', [0, 0, 640, 480]],
    ['BLEND_EQUATION_RGB', gl.FUNC_ADD],
    ['BLEND_EQUATION_ALPHA', gl.FUNC_ADD],
    ['BLEND_SRC_RGB', gl.ONE],
    ['BLEND_SRC_ALPHA', gl.ONE],
    ['BLEND_DST_RGB', gl.ZERO],
    ['BLEND_DST_ALPHA', gl.ZERO],
    ['BLEND_COLOR', [0, 0, 0, 0]],
    ['DEPTH_FUNC', gl.LESS],
    ['DEPTH_RANGE', [0, 1]],
    ['DEPTH_WRITEMASK', true],
    ['DEPTH_CLEAR_VALUE', 1],
    ['CULL_FACE_MODE', gl.BACK],
    ['FRONT_FACE', gl.CCW],
    ['STENCIL_FUNC', gl.ALWAYS],
    ['STENCIL_REF', 0],
    ['STENCIL_VALUE_MASK', 0xffffffff],
    ['STENCIL_FAIL', gl.KEEP],
    ['STENCIL_PASS_DEPTH_FAIL', gl.KEEP],
    ['STENCIL_PASS_DEPTH_PASS', gl.KEEP],
    ['STENCIL_WRITEMASK', 0xffffffff],
    ['STENCIL_BACK_FUNC', gl.ALWAYS],
    ['STENCIL_BACK_REF', 0],
    ['STENCIL_BACK_VALUE_MASK', 0xffffffff],
    ['STENCIL_BACK_FAIL', gl.KEEP],
    ['STENCIL_BACK_PASS_DEPTH_FAIL', gl.KEEP],
    ['STENCIL_BACK_PASS_DEPTH_PASS', gl.KEEP],
    ['STENCIL_BACK_WRITEMASK', 0xffffffff],
    ['STENCIL_CLEAR_VALUE', 0],
    ['COLOR_WRITEMASK', [true, true, true, true]],
    ['COLOR_CLEAR_VALUE', [0, 0, 0, 0]],
    ['PACK_ALIGNMENT', 4],
    ['PACK_ROW_LENGTH', 0],
    ['PACK_SKIP_PIXELS', 0],
    ['PACK_SKIP_ROWS', 0],
    ['UNPACK_ALIGNMENT', 4],
    ['UNPACK_ROW_LENGTH', 0],
    ['UNPACK_IMAGE_HEIGHT', 0],
    ['UNPACK_SKIP_PIXELS', 0],
    ['UNPACK_SKIP_ROWS', 0],
    ['UNPACK_SKIP_IMAGES', 0],
    ['UNPACK_FLIP_Y_WEBGL', false],
    ['UNPACK_PREMULTIPLY_ALPHA_WEBGL', false],
    ['UNPACK_COLORSPACE_CONVERSION_WEBGL', gl.BROWSER_DEFAULT_WEBGL],
    ['POLYGON_OFFSET_FACTOR', 0],
    ['POLYGON_OFFSET_UNITS', 0],
    ['SAMPLE_COVERAGE_VALUE', 1],
    ['SAMPLE_COVERAGE_INVERT', false],
    ['LINE_WIDTH', 1],
    ['READ_BUFFER', gl.BACK_LEFT],
  ]) state.set(gl[name], value)

  const failures = new Map()

  function record(name, ...args) {
    gl.calls.push([name, ...args])
    const queued = failures.get(name)
    if (queued?.length) {
      const failure = queued.shift()
      if (queued.length === 0) failures.delete(name)
      throw failure
    }
  }

  gl.failNext = (name, error) => {
    const queued = failures.get(name) ?? []
    queued.push(error)
    failures.set(name, queued)
  }

  gl.getParameter = (parameter) => {
    if (parameter === gl.ACTIVE_TEXTURE) return activeTexture
    if (parameter === gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) return maxTextureUnits
    if (parameter === gl.MAX_DRAW_BUFFERS) return maxDrawBuffers
    if (parameter === gl.MAX_UNIFORM_BUFFER_BINDINGS) return maxUniformBindings
    if (parameter === gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS) {
      return maxTransformFeedbackBindings
    }
    if (textureTargetByBindingEnum.has(parameter)) {
      return textureUnits[activeTexture - gl.TEXTURE0].get(
        textureTargetByBindingEnum.get(parameter),
      ) ?? null
    }
    if (parameter === gl.SAMPLER_BINDING) {
      return samplers[activeTexture - gl.TEXTURE0]
    }
    if (parameter >= gl.DRAW_BUFFER0 && parameter < gl.DRAW_BUFFER0 + maxDrawBuffers) {
      return drawBuffers[parameter - gl.DRAW_BUFFER0] ?? gl.ZERO
    }
    if (!state.has(parameter)) throw new Error(`Unknown parameter ${parameter}`)
    return cloneValue(state.get(parameter))
  }

  gl.getIndexedParameter = (parameter, index) => {
    let binding
    if (
      parameter === gl.UNIFORM_BUFFER_BINDING ||
      parameter === gl.UNIFORM_BUFFER_START ||
      parameter === gl.UNIFORM_BUFFER_SIZE
    ) binding = uniformBindings[index]
    else if (
      parameter === gl.TRANSFORM_FEEDBACK_BUFFER_BINDING ||
      parameter === gl.TRANSFORM_FEEDBACK_BUFFER_START ||
      parameter === gl.TRANSFORM_FEEDBACK_BUFFER_SIZE
    ) binding = transformFeedbackBindings[index]
    else throw new Error(`Unknown indexed parameter ${parameter}`)

    if (parameter === gl.UNIFORM_BUFFER_BINDING || parameter === gl.TRANSFORM_FEEDBACK_BUFFER_BINDING) {
      return binding.buffer
    }
    if (parameter === gl.UNIFORM_BUFFER_START || parameter === gl.TRANSFORM_FEEDBACK_BUFFER_START) {
      return binding.offset
    }
    return binding.size
  }

  gl.isEnabled = (capability) => enabled.has(capability)
  gl.useProgram = (program) => {
    record('useProgram', program)
    state.set(gl.CURRENT_PROGRAM, program)
  }
  gl.bindFramebuffer = (target, framebuffer) => {
    record('bindFramebuffer', target, framebuffer)
    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) {
      state.set(gl.DRAW_FRAMEBUFFER_BINDING, framebuffer)
    }
    if (target === gl.FRAMEBUFFER || target === gl.READ_FRAMEBUFFER) {
      state.set(gl.READ_FRAMEBUFFER_BINDING, framebuffer)
    }
  }
  gl.bindRenderbuffer = (_target, renderbuffer) => {
    record('bindRenderbuffer', renderbuffer)
    state.set(gl.RENDERBUFFER_BINDING, renderbuffer)
  }
  gl.bindVertexArray = (vertexArray) => {
    record('bindVertexArray', vertexArray)
    state.set(gl.VERTEX_ARRAY_BINDING, vertexArray)
  }
  gl.bindBuffer = (target, buffer) => {
    record('bindBuffer', target, buffer)
    state.set(bindingEnumByTarget.get(target), buffer)
  }
  gl.bindBufferBase = (target, index, buffer) => {
    record('bindBufferBase', target, index, buffer)
    if (target === gl.TRANSFORM_FEEDBACK_BUFFER && state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is active')
    }
    const bindings = target === gl.UNIFORM_BUFFER ? uniformBindings : transformFeedbackBindings
    bindings[index] = { buffer, offset: 0, size: 0 }
    state.set(bindingEnumByTarget.get(target), buffer)
  }
  gl.bindBufferRange = (target, index, buffer, offset, size) => {
    record('bindBufferRange', target, index, buffer, offset, size)
    if (target === gl.TRANSFORM_FEEDBACK_BUFFER && state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is active')
    }
    const bindings = target === gl.UNIFORM_BUFFER ? uniformBindings : transformFeedbackBindings
    bindings[index] = { buffer, offset, size }
    state.set(bindingEnumByTarget.get(target), buffer)
  }
  gl.bindTransformFeedback = (_target, transformFeedback) => {
    record('bindTransformFeedback', transformFeedback)
    if (state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is active')
    }
    state.set(gl.TRANSFORM_FEEDBACK_BINDING, transformFeedback)
  }
  gl.beginTransformFeedback = (primitiveMode) => {
    record('beginTransformFeedback', primitiveMode)
    if (state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is already active')
    }
    state.set(gl.TRANSFORM_FEEDBACK_ACTIVE, true)
    state.set(gl.TRANSFORM_FEEDBACK_PAUSED, false)
  }
  gl.endTransformFeedback = () => {
    record('endTransformFeedback')
    if (!state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is inactive')
    }
    state.set(gl.TRANSFORM_FEEDBACK_ACTIVE, false)
    state.set(gl.TRANSFORM_FEEDBACK_PAUSED, false)
  }
  gl.pauseTransformFeedback = () => {
    record('pauseTransformFeedback')
    if (!state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is inactive')
    }
    state.set(gl.TRANSFORM_FEEDBACK_PAUSED, true)
  }
  gl.resumeTransformFeedback = () => {
    record('resumeTransformFeedback')
    if (!state.get(gl.TRANSFORM_FEEDBACK_ACTIVE)) {
      throw new Error('INVALID_OPERATION: transform feedback is inactive')
    }
    state.set(gl.TRANSFORM_FEEDBACK_PAUSED, false)
  }
  gl.viewport = (...value) => state.set(gl.VIEWPORT, value)
  gl.scissor = (...value) => state.set(gl.SCISSOR_BOX, value)
  gl.activeTexture = (texture) => {
    record('activeTexture', texture)
    activeTexture = texture
  }
  gl.bindTexture = (target, texture) => {
    record('bindTexture', target, texture)
    textureUnits[activeTexture - gl.TEXTURE0].set(target, texture)
  }
  gl.bindSampler = (unit, sampler) => {
    record('bindSampler', unit, sampler)
    samplers[unit] = sampler
  }
  gl.enable = (capability) => enabled.add(capability)
  gl.disable = (capability) => enabled.delete(capability)
  gl.blendEquationSeparate = (rgb, alpha) => {
    state.set(gl.BLEND_EQUATION_RGB, rgb)
    state.set(gl.BLEND_EQUATION_ALPHA, alpha)
  }
  gl.blendFuncSeparate = (srcRgb, dstRgb, srcAlpha, dstAlpha) => {
    state.set(gl.BLEND_SRC_RGB, srcRgb)
    state.set(gl.BLEND_DST_RGB, dstRgb)
    state.set(gl.BLEND_SRC_ALPHA, srcAlpha)
    state.set(gl.BLEND_DST_ALPHA, dstAlpha)
  }
  gl.blendColor = (...value) => state.set(gl.BLEND_COLOR, value)
  gl.depthFunc = (value) => state.set(gl.DEPTH_FUNC, value)
  gl.depthRange = (...value) => state.set(gl.DEPTH_RANGE, value)
  gl.depthMask = (value) => state.set(gl.DEPTH_WRITEMASK, value)
  gl.clearDepth = (value) => state.set(gl.DEPTH_CLEAR_VALUE, value)
  gl.cullFace = (value) => state.set(gl.CULL_FACE_MODE, value)
  gl.frontFace = (value) => state.set(gl.FRONT_FACE, value)
  gl.stencilFuncSeparate = (face, func, ref, mask) => {
    const prefix = face === gl.BACK ? 'STENCIL_BACK_' : 'STENCIL_'
    state.set(gl[`${prefix}FUNC`], func)
    state.set(gl[`${prefix}REF`], ref)
    state.set(gl[`${prefix}VALUE_MASK`], mask)
  }
  gl.stencilOpSeparate = (face, fail, depthFail, depthPass) => {
    const prefix = face === gl.BACK ? 'STENCIL_BACK_' : 'STENCIL_'
    state.set(gl[`${prefix}FAIL`], fail)
    state.set(gl[`${prefix}PASS_DEPTH_FAIL`], depthFail)
    state.set(gl[`${prefix}PASS_DEPTH_PASS`], depthPass)
  }
  gl.stencilMaskSeparate = (face, mask) => {
    state.set(gl[face === gl.BACK ? 'STENCIL_BACK_WRITEMASK' : 'STENCIL_WRITEMASK'], mask)
  }
  gl.clearStencil = (value) => state.set(gl.STENCIL_CLEAR_VALUE, value)
  gl.colorMask = (...value) => state.set(gl.COLOR_WRITEMASK, value)
  gl.clearColor = (...value) => state.set(gl.COLOR_CLEAR_VALUE, value)
  gl.pixelStorei = (parameter, value) => state.set(parameter, value)
  gl.polygonOffset = (factor, units) => {
    state.set(gl.POLYGON_OFFSET_FACTOR, factor)
    state.set(gl.POLYGON_OFFSET_UNITS, units)
  }
  gl.sampleCoverage = (value, invert) => {
    state.set(gl.SAMPLE_COVERAGE_VALUE, value)
    state.set(gl.SAMPLE_COVERAGE_INVERT, invert)
  }
  gl.lineWidth = (value) => state.set(gl.LINE_WIDTH, value)
  gl.readBuffer = (value) => state.set(gl.READ_BUFFER, value)
  gl.drawBuffers = (values) => {
    drawBuffers = [...values]
  }

  gl.inspect = () => ({
    activeTexture,
    drawBuffers: [...drawBuffers],
    enabled: [...enabled].sort((a, b) => a - b),
    samplers: [...samplers],
    state: [...state].map(([key, value]) => [key, cloneValue(value)]),
    textureUnits: textureUnits.map((unit) => [...unit]),
    transformFeedbackBindings: transformFeedbackBindings.map((binding) => ({ ...binding })),
    uniformBindings: uniformBindings.map((binding) => ({ ...binding })),
  })

  return gl
}
