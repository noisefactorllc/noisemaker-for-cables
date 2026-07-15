import { captureGLState, prepareNoisemakerGLState, restoreGLState, withGLState } from '../../../src/runtime/gl-state.js'

export const CONTEXT_ATTRIBUTES = Object.freeze({
  alpha: true,
  antialias: false,
  depth: true,
  desynchronized: false,
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: true,
  premultipliedAlpha: false,
  stencil: true,
})

export function createHarnessContext(width = 64, height = 48) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.dataset.task9 = 'webgl2-harness'
  document.querySelector('#harness-root')?.append(canvas)
  const gl = canvas.getContext('webgl2', CONTEXT_ATTRIBUTES)
  if (!gl) throw new Error('WebGL2 context creation failed')
  const trackedResources = new Map()
  for (const [createName, deleteName] of [
    ['createBuffer', 'deleteBuffer'],
    ['createFramebuffer', 'deleteFramebuffer'],
    ['createProgram', 'deleteProgram'],
    ['createQuery', 'deleteQuery'],
    ['createRenderbuffer', 'deleteRenderbuffer'],
    ['createSampler', 'deleteSampler'],
    ['createShader', 'deleteShader'],
    ['createTexture', 'deleteTexture'],
    ['createTransformFeedback', 'deleteTransformFeedback'],
    ['createVertexArray', 'deleteVertexArray'],
  ]) {
    if (typeof gl[createName] !== 'function' || typeof gl[deleteName] !== 'function') continue
    const resources = new Set()
    trackedResources.set(createName, resources)
    const create = gl[createName].bind(gl)
    const destroy = gl[deleteName].bind(gl)
    gl[createName] = (...args) => {
      const resource = create(...args)
      if (resource) resources.add(resource)
      return resource
    }
    gl[deleteName] = (resource) => {
      resources.delete(resource)
      return destroy(resource)
    }
  }
  const CGL = { MESH: { lastMesh: null } }
  const cgl = {
    CGL,
    canvas,
    canvasHeight: height,
    canvasWidth: width,
    currentProgram: null,
    gl,
  }
  return {
    CGL,
    canvas,
    cgl,
    gl,
    resourceCounts() {
      return Object.fromEntries(
        [...trackedResources].map(([name, resources]) => [name, resources.size]),
      )
    },
  }
}

export function destroyHarnessContext(context, { loseContext = false } = {}) {
  if (loseContext && context?.gl && !context.gl.isContextLost()) {
    context.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  context?.canvas?.remove()
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown shader compiler error'
    gl.deleteShader(shader)
    throw new Error(log)
  }
  return shader
}

export function createProgram(gl, fragmentSource, {
  transformFeedbackVaryings,
  vertexSource = `#version 300 es
    precision highp float;
    const vec2 p[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
    void main() { gl_Position = vec4(p[gl_VertexID], 0., 1.); }
  `,
} = {}) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  try {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    if (transformFeedbackVaryings) {
      gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.INTERLEAVED_ATTRIBS)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'unknown program linker error')
    }
    return program
  } catch (error) {
    gl.deleteProgram(program)
    throw error
  } finally {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
  }
}

function allocateRgba16fTexture(gl, width, height) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}

function drainErrors(gl) {
  const errors = []
  for (let index = 0; index < 32; index += 1) {
    const error = gl.getError()
    if (error === gl.NO_ERROR) break
    errors.push(error)
  }
  return errors
}

function empiricalFloatProbe(gl) {
  const resources = []
  const attemptDelete = (method, resource) => {
    if (resource) gl[method](resource)
  }
  try {
    drainErrors(gl)
    const source = allocateRgba16fTexture(gl, 2, 2)
    const destination = allocateRgba16fTexture(gl, 2, 2)
    resources.push(['deleteTexture', source], ['deleteTexture', destination])
    const readFbo = gl.createFramebuffer()
    const drawFbo = gl.createFramebuffer()
    resources.push(['deleteFramebuffer', readFbo], ['deleteFramebuffer', drawFbo])
    const vao = gl.createVertexArray()
    resources.push(['deleteVertexArray', vao])
    const program = createProgram(gl, `#version 300 es
      precision highp float;
      out vec4 color;
      void main() { color = vec4(0.25, 0.5, 0.75, 1.0); }
    `)
    resources.push(['deleteProgram', program])

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo)
    gl.framebufferTexture2D(
      gl.DRAW_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      source,
      0,
    )
    if (gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('RGBA16F source framebuffer is incomplete')
    }
    gl.viewport(0, 0, 2, 2)
    gl.disable(gl.SCISSOR_TEST)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFunc(gl.ONE, gl.ZERO)
    gl.colorMask(true, true, true, true)
    gl.useProgram(program)
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo)
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      source,
      0,
    )
    if (gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('RGBA16F read framebuffer is incomplete')
    }
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo)
    gl.framebufferTexture2D(
      gl.DRAW_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      destination,
      0,
    )
    if (gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('RGBA16F destination framebuffer is incomplete')
    }
    gl.blitFramebuffer(0, 0, 2, 2, 0, 0, 2, 2, gl.COLOR_BUFFER_BIT, gl.NEAREST)

    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo)
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      destination,
      0,
    )
    const pixels = new Float32Array(16)
    gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.FLOAT, pixels)
    const errors = drainErrors(gl)
    if (errors.length > 0) throw new Error(`RGBA16F probe GL errors: ${errors.join(', ')}`)
    for (let index = 0; index < pixels.length; index += 4) {
      const expected = [0.25, 0.5, 0.75, 1]
      for (let channel = 0; channel < 4; channel += 1) {
        if (!Number.isFinite(pixels[index + channel])) {
          throw new Error(`RGBA16F probe produced non-finite channel ${index + channel}`)
        }
        if (Math.abs(pixels[index + channel] - expected[channel]) > 0.002) {
          throw new Error(
            `RGBA16F render/read/blit mismatch at ${index + channel}: ` +
            `${pixels[index + channel]} != ${expected[channel]}`,
          )
        }
      }
    }
  } finally {
    gl.disable(gl.BLEND)
    gl.bindVertexArray(null)
    gl.useProgram(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
    for (const [method, resource] of resources.reverse()) attemptDelete(method, resource)
  }
}

export function preflightWebGL2(context) {
  const { gl } = context
  const failures = []
  const extensions = {
    colorBufferFloat: Boolean(gl.getExtension('EXT_color_buffer_float')),
    floatBlend: Boolean(gl.getExtension('EXT_float_blend')),
    floatLinear: Boolean(gl.getExtension('OES_texture_float_linear')),
  }
  const capabilities = {
    maxColorAttachments: gl.getParameter(gl.MAX_COLOR_ATTACHMENTS),
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
    maxFragmentTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxUniformBlockSize: gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE),
    maxUniformBufferBindings: gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS),
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
  }

  if (!(gl instanceof WebGL2RenderingContext)) failures.push('context is not WebGL2')
  for (const [name, supported] of Object.entries(extensions)) {
    if (!supported) failures.push(`required extension unavailable: ${name}`)
  }
  if (capabilities.maxTextureSize < 4096) failures.push('MAX_TEXTURE_SIZE < 4096')
  if (capabilities.maxDrawBuffers < 4) failures.push('MAX_DRAW_BUFFERS < 4')
  if (capabilities.maxColorAttachments < 4) failures.push('MAX_COLOR_ATTACHMENTS < 4')
  if (capabilities.maxFragmentTextureUnits < 9) {
    failures.push('MAX_TEXTURE_IMAGE_UNITS < 9')
  }
  if (capabilities.maxUniformBlockSize < 16_384) failures.push('MAX_UNIFORM_BLOCK_SIZE < 16384')
  if (capabilities.maxUniformBufferBindings < 8) {
    failures.push('MAX_UNIFORM_BUFFER_BINDINGS < 8')
  }
  if (gl.isContextLost()) failures.push('WebGL2 context was already lost')
  if (failures.length === 0) {
    try {
      empiricalFloatProbe(gl)
    } catch (error) {
      failures.push(`empirical RGBA16F render/read/blit failed: ${error.message}`)
    }
  }
  if (gl.isContextLost()) failures.push('WebGL2 context lost during preflight')
  return { capabilities, extensions, failures }
}

export function guarded(context, backend, callback) {
  return withGLState(context.gl, context.cgl, () => {
    prepareNoisemakerGLState(context.gl, { maxTextureUnits: backend?.maxTextureUnits })
    return callback()
  }, {
    CGL: context.CGL,
    maxTextureUnits: backend?.maxTextureUnits,
  })
}

export async function guardedPromiseCapture(context, backend, operation) {
  let pending
  guarded(context, backend, () => { pending = operation() })
  return Promise.resolve(pending)
}

export function createRawOutputTexture(gl, width, height) {
  const tex = allocateRgba16fTexture(gl, width, height)
  return {
    height,
    tex,
    width,
    delete() { gl.deleteTexture(tex) },
    getHeight() { return height },
    getWidth() { return width },
  }
}

export function readFloatTexture(gl, texture) {
  if (gl.isContextLost()) throw new Error('WebGL2 context lost before readback')
  const { handle, height, width } = texture
  if (!handle || !Number.isInteger(width) || !Number.isInteger(height)) {
    throw new TypeError('readback requires a raw texture handle and integer dimensions')
  }
  const fbo = gl.createFramebuffer()
  try {
    drainErrors(gl)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      handle,
      0,
    )
    const status = gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`readback framebuffer incomplete: ${status}`)
    }
    gl.readBuffer(gl.COLOR_ATTACHMENT0)
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
    gl.pixelStorei(gl.PACK_ROW_LENGTH, 0)
    gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0)
    gl.pixelStorei(gl.PACK_SKIP_ROWS, 0)
    const floats = new Float32Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, floats)
    const errors = drainErrors(gl)
    if (errors.length > 0) throw new Error(`float readback GL errors: ${errors.join(', ')}`)

    for (let index = 0; index < floats.length; index += 1) {
      if (!Number.isFinite(floats[index])) {
        throw new Error(`non-finite float readback at channel ${index}`)
      }
    }

    const data = new Float32Array(floats.length)
    const rowChannels = width * 4
    for (let y = 0; y < height; y += 1) {
      data.set(
        floats.subarray(
          (height - 1 - y) * rowChannels,
          (height - y) * rowChannels,
        ),
        y * rowChannels,
      )
    }
    if (gl.isContextLost()) throw new Error('WebGL2 context lost during readback')
    return { data, finite: true, height, width }
  } finally {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.deleteFramebuffer(fbo)
  }
}

function validateNativeReadback(readback, label) {
  if (!(readback?.data instanceof Float32Array)) {
    throw new TypeError(`${label} readback data must be a Float32Array`)
  }
  if (!Number.isInteger(readback.width) || !Number.isInteger(readback.height)) {
    throw new TypeError(`${label} readback dimensions must be integers`)
  }
  const expectedChannels = readback.width * readback.height * 4
  if (readback.data.length !== expectedChannels) {
    throw new Error(
      `${label} readback channel count ${readback.data.length} != ${expectedChannels}`,
    )
  }
}

function artifactRgba8Readback(readback) {
  validateNativeReadback(readback, 'artifact')
  const data = new Uint8ClampedArray(readback.data.length)
  for (let index = 0; index < readback.data.length; index += 1) {
    data[index] = Math.round(Math.max(0, Math.min(1, readback.data[index])) * 255)
  }
  return { ...readback, data }
}

function artifactDifferenceReadback(reference, adapter) {
  const data = new Uint8ClampedArray(reference.data.length)
  for (let offset = 0; offset < reference.data.length; offset += 4) {
    for (let channel = 0; channel < 4; channel += 1) {
      const index = offset + channel
      data[index] = channel === 3
        ? 255
        : Math.round(Math.min(1, Math.abs(reference.data[index] - adapter.data[index]) * 8) * 255)
    }
  }
  return { ...reference, data }
}

function pixelsToDataUrl(readback) {
  const canvas = document.createElement('canvas')
  canvas.width = readback.width
  canvas.height = readback.height
  const context = canvas.getContext('2d')
  context.putImageData(
    new ImageData(readback.data, readback.width, readback.height),
    0,
    0,
  )
  return canvas.toDataURL('image/png')
}

export function createComparisonArtifacts(reference, adapter, comparison) {
  if (comparison.mismatchedChannels === 0 && comparison.channelCeiling === 0) return {}
  return {
    adapter: pixelsToDataUrl(artifactRgba8Readback(adapter)),
    diff: pixelsToDataUrl(artifactDifferenceReadback(reference, adapter)),
    reference: pixelsToDataUrl(artifactRgba8Readback(reference)),
  }
}

export function compareReadbacks(id, reference, adapter, channelCeiling = 0) {
  validateNativeReadback(reference, 'reference')
  validateNativeReadback(adapter, 'adapter')
  if (reference.width !== adapter.width || reference.height !== adapter.height) {
    throw new Error(
      `${id}: readback dimensions differ ` +
      `${reference.width}x${reference.height} != ${adapter.width}x${adapter.height}`,
    )
  }
  let mismatchedChannels = 0
  let errorSum = 0
  let maxChannelError = 0
  const firstDivergences = []
  for (let offset = 0; offset < reference.data.length; offset += 4) {
    let pixelDiffers = false
    const channelErrors = []
    for (let channel = 0; channel < 4; channel += 1) {
      const index = offset + channel
      const error = Math.abs(reference.data[index] - adapter.data[index])
      channelErrors.push(error)
      errorSum += error
      maxChannelError = Math.max(maxChannelError, error)
      if (error > 0) {
        mismatchedChannels += 1
        pixelDiffers = true
      }
    }
    if (pixelDiffers && firstDivergences.length < 16) {
      const pixel = offset / 4
      firstDivergences.push({
        adapter: Array.from(adapter.data.subarray(offset, offset + 4)),
        channelErrors,
        reference: Array.from(reference.data.subarray(offset, offset + 4)),
        x: pixel % reference.width,
        y: Math.floor(pixel / reference.width),
      })
    }
  }
  return {
    accepted: mismatchedChannels <= channelCeiling,
    channelCeiling,
    comparedChannels: reference.data.length,
    finite: reference.finite && adapter.finite,
    firstDivergences,
    id,
    maxChannelError,
    meanChannelError: errorSum / reference.data.length,
    mismatchPercentage: mismatchedChannels / reference.data.length * 100,
    mismatchedChannels,
  }
}

export function concatenateReadbacks(readbacks) {
  if (readbacks.length === 0) throw new Error('cannot concatenate zero readbacks')
  const width = readbacks[0].width
  const height = readbacks.reduce((sum, readback) => {
    if (readback.width !== width) throw new Error('concatenated readback widths differ')
    return sum + readback.height
  }, 0)
  const data = new Float32Array(width * height * 4)
  let offset = 0
  for (const readback of readbacks) {
    validateNativeReadback(readback, 'concatenated')
    data.set(readback.data, offset)
    offset += readback.data.length
  }
  return {
    data,
    finite: readbacks.every(({ finite }) => finite),
    height,
    width,
  }
}

export function exactReadbacks(left, right) {
  if (left.width !== right.width || left.height !== right.height) return false
  if (!(left.data instanceof Float32Array) || !(right.data instanceof Float32Array)) return false
  if (left.data.length !== right.data.length) return false
  const leftBits = new Uint32Array(left.data.buffer, left.data.byteOffset, left.data.length)
  const rightBits = new Uint32Array(right.data.buffer, right.data.byteOffset, right.data.length)
  for (let index = 0; index < leftBits.length; index += 1) {
    if (leftBits[index] !== rightBits[index]) return false
  }
  return true
}

export function diffSnapshots(before, after) {
  const differences = []
  const visit = (left, right, path) => {
    if (Object.is(left, right)) return
    if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
      visit(Array.from(left || []), Array.from(right || []), path)
      return
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        differences.push(`${path}: array shape differs`)
        return
      }
      for (let index = 0; index < left.length; index += 1) {
        visit(left[index], right[index], `${path}[${index}]`)
      }
      return
    }
    if (left && right && left.constructor === Object && right.constructor === Object) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
      for (const key of keys) visit(left[key], right[key], path ? `${path}.${key}` : key)
      return
    }
    differences.push(`${path}: value differs`)
  }
  visit(before, after, 'state')
  return differences
}

export function captureComparableState(context, maxTextureUnits) {
  return captureGLState(context.gl, { maxTextureUnits })
}

export function createHostileState(context, maxTextureUnits = 16) {
  const { gl } = context
  const resources = {
    buffers: [],
    framebuffers: [],
    programs: [],
    renderbuffers: [],
    samplers: [],
    textures: [],
    transformFeedbacks: [],
    vertexArrays: [],
  }
  const createHostileFramebuffer = (target, role) => {
    const texture = gl.createTexture()
    resources.textures.push(texture)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 64, 48, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    const framebuffer = gl.createFramebuffer()
    resources.framebuffers.push(framebuffer)
    gl.bindFramebuffer(target, framebuffer)
    gl.framebufferTexture2D(target, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    if (gl.checkFramebufferStatus(target) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`hostile ${role} framebuffer is incomplete`)
    }
    return framebuffer
  }
  const drawFramebuffer = createHostileFramebuffer(gl.DRAW_FRAMEBUFFER, 'draw')
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])
  const readFramebuffer = createHostileFramebuffer(gl.READ_FRAMEBUFFER, 'read')
  gl.readBuffer(gl.COLOR_ATTACHMENT0)

  const renderbuffer = gl.createRenderbuffer()
  resources.renderbuffers.push(renderbuffer)
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, 64, 48)

  const program = createProgram(gl, `#version 300 es
    precision highp float;
    out vec4 color;
    void main() { color = vec4(0.91, 0.13, 0.47, 1.0); }
  `)
  resources.programs.push(program)
  gl.useProgram(program)

  const vao = gl.createVertexArray()
  resources.vertexArrays.push(vao)
  gl.bindVertexArray(vao)
  const array = gl.createBuffer()
  const element = gl.createBuffer()
  resources.buffers.push(array, element)
  gl.bindBuffer(gl.ARRAY_BUFFER, array)
  gl.bufferData(gl.ARRAY_BUFFER, 256, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, element)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 64, gl.STATIC_DRAW)

  const uniform0 = gl.createBuffer()
  const uniform3 = gl.createBuffer()
  const transform0 = gl.createBuffer()
  const transform2 = gl.createBuffer()
  const copyRead = gl.createBuffer()
  const copyWrite = gl.createBuffer()
  const pack = gl.createBuffer()
  const unpack = gl.createBuffer()
  resources.buffers.push(
    uniform0,
    uniform3,
    transform0,
    transform2,
    copyRead,
    copyWrite,
    pack,
    unpack,
  )
  for (const [target, buffer, size] of [
    [gl.UNIFORM_BUFFER, uniform0, 256],
    [gl.UNIFORM_BUFFER, uniform3, 256],
    [gl.TRANSFORM_FEEDBACK_BUFFER, transform0, 256],
    [gl.TRANSFORM_FEEDBACK_BUFFER, transform2, 256],
    [gl.COPY_READ_BUFFER, copyRead, 128],
    [gl.COPY_WRITE_BUFFER, copyWrite, 128],
    [gl.PIXEL_PACK_BUFFER, pack, 64],
    [gl.PIXEL_UNPACK_BUFFER, unpack, 64],
  ]) {
    gl.bindBuffer(target, buffer)
    gl.bufferData(target, size, gl.DYNAMIC_DRAW)
  }

  const transformFeedback = gl.createTransformFeedback()
  resources.transformFeedbacks.push(transformFeedback)
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback)
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniform0)
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 3, uniform3)
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, transform0)
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, transform2)

  const units = Math.min(maxTextureUnits, gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS))
  for (let unit = 0; unit < units; unit += 1) {
    gl.activeTexture(gl.TEXTURE0 + unit)
    for (const [target, allocator] of [
      [gl.TEXTURE_2D, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)],
      [gl.TEXTURE_3D, () => gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)],
      [gl.TEXTURE_2D_ARRAY, () => gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)],
      [gl.TEXTURE_CUBE_MAP, () => {
        for (let face = 0; face < 6; face += 1) {
          gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        }
      }],
    ]) {
      const bound = gl.createTexture()
      resources.textures.push(bound)
      gl.bindTexture(target, bound)
      allocator()
    }
    const sampler = gl.createSampler()
    resources.samplers.push(sampler)
    gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.bindSampler(unit, sampler)
  }
  gl.activeTexture(gl.TEXTURE0 + Math.min(3, Math.max(0, units - 1)))

  gl.viewport(3, 5, 41, 29)
  gl.scissor(7, 9, 23, 17)
  for (const capability of [
    gl.BLEND,
    gl.DEPTH_TEST,
    gl.CULL_FACE,
    gl.STENCIL_TEST,
    gl.SCISSOR_TEST,
    gl.RASTERIZER_DISCARD,
    gl.POLYGON_OFFSET_FILL,
    gl.SAMPLE_ALPHA_TO_COVERAGE,
    gl.SAMPLE_COVERAGE,
  ]) gl.enable(capability)
  gl.disable(gl.DITHER)
  gl.blendEquationSeparate(gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_SUBTRACT)
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA)
  gl.blendColor(0.17, 0.31, 0.53, 0.79)
  gl.depthFunc(gl.GREATER)
  gl.depthRange(0.2, 0.8)
  gl.depthMask(false)
  gl.clearDepth(0.37)
  gl.cullFace(gl.FRONT)
  gl.frontFace(gl.CW)
  gl.stencilFuncSeparate(gl.FRONT, gl.NOTEQUAL, 3, 0x0f0f0f0f)
  gl.stencilFuncSeparate(gl.BACK, gl.LEQUAL, 5, 0xf0f0f0f0)
  gl.stencilOpSeparate(gl.FRONT, gl.INCR_WRAP, gl.DECR_WRAP, gl.INVERT)
  gl.stencilOpSeparate(gl.BACK, gl.DECR, gl.INCR, gl.REPLACE)
  gl.stencilMaskSeparate(gl.FRONT, 0x00ff00ff)
  gl.stencilMaskSeparate(gl.BACK, 0xff00ff00)
  gl.clearStencil(6)
  gl.colorMask(false, true, false, true)
  gl.clearColor(0.19, 0.23, 0.29, 0.31)
  gl.polygonOffset(1.25, -2.5)
  gl.sampleCoverage(0.625, true)
  gl.lineWidth(1)
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.PACK_ROW_LENGTH, 7)
  gl.pixelStorei(gl.PACK_SKIP_PIXELS, 1)
  gl.pixelStorei(gl.PACK_SKIP_ROWS, 1)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 5)
  gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 3)
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)
  gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)

  const coverage = {
    distinctReadDrawFramebuffers:
      drawFramebuffer !== readFramebuffer &&
      gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === drawFramebuffer &&
      gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) === readFramebuffer,
    drawFramebufferComplete:
      gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE,
    readFramebufferComplete:
      gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE,
    transformFeedbackIndexedSlots: [0, 2].filter((index) => (
      gl.getIndexedParameter(gl.TRANSFORM_FEEDBACK_BUFFER_BINDING, index) !== null
    )),
    uniformIndexedSlots: [0, 3].filter((index) => (
      gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, index) !== null
    )),
  }

  return {
    coverage,
    dispose() {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null)
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
      gl.bindVertexArray(null)
      gl.useProgram(null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.bindRenderbuffer(gl.RENDERBUFFER, null)
      for (let unit = 0; unit < units; unit += 1) gl.bindSampler(unit, null)
      for (const resource of resources.transformFeedbacks) gl.deleteTransformFeedback(resource)
      for (const resource of resources.vertexArrays) gl.deleteVertexArray(resource)
      for (const resource of resources.samplers) gl.deleteSampler(resource)
      for (const resource of resources.programs) gl.deleteProgram(resource)
      for (const resource of resources.framebuffers) gl.deleteFramebuffer(resource)
      for (const resource of resources.renderbuffers) gl.deleteRenderbuffer(resource)
      for (const resource of resources.buffers) gl.deleteBuffer(resource)
      for (const resource of resources.textures) gl.deleteTexture(resource)
    },
    maxTextureUnits: units,
    resources,
  }
}

export function phaseStateResult(name, before, after) {
  const differences = diffSnapshots(before, after)
  return { differences, exact: differences.length === 0, name }
}

export function restoreComparableState(context, snapshot) {
  restoreGLState(context.gl, snapshot)
}

export function errorDiagnostic(error, extra = {}) {
  return {
    ...extra,
    cleanupErrors: error?.cleanupErrors?.map((entry) => entry?.message || String(entry)) || [],
    code: error?.code,
    detail: error?.detail,
    message: error?.message || String(error),
    name: error?.name,
    stack: error?.stack,
  }
}
