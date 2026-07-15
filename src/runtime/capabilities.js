import { createCGLCacheInvalidator } from './cgl-cache.js'

const MINIMUMS = Object.freeze({
  maxDrawBuffers: 4,
  maxTextureSize: 4096,
  maxTextureUnits: 9,
  maxUniformBlockSize: 16_384,
  maxUniformBufferBindings: 8,
})

const CAPABILITY_CODES = Object.freeze({
  cglCacheCompatible: 'ERR_CAPABILITY_CGL_CACHE',
  colorBufferFloat: 'ERR_CAPABILITY_COLOR_BUFFER_FLOAT',
  floatBlend: 'ERR_CAPABILITY_FLOAT_BLEND',
  floatLinear: 'ERR_CAPABILITY_FLOAT_LINEAR',
  maxDrawBuffers: 'ERR_CAPABILITY_MAX_DRAW_BUFFERS',
  maxTextureSize: 'ERR_CAPABILITY_MAX_TEXTURE_SIZE',
  maxTextureUnits: 'ERR_CAPABILITY_MAX_TEXTURE_UNITS',
  maxUniformBlockSize: 'ERR_CAPABILITY_MAX_UNIFORM_BLOCK_SIZE',
  maxUniformBufferBindings: 'ERR_CAPABILITY_MAX_UNIFORM_BUFFER_BINDINGS',
  webgl2: 'ERR_CAPABILITY_WEBGL2',
})

export function capabilityCodeFor(capability) {
  return CAPABILITY_CODES[capability]
}

function capabilityFailure(capability, actual, required, message, capabilityCode) {
  return Object.freeze({
    actual,
    capability,
    capabilityCode: capabilityCode ?? capabilityCodeFor(capability),
    message,
    required,
  })
}

function queryLimit(gl, name) {
  const token = gl?.[name]
  if (typeof token !== 'number' || typeof gl?.getParameter !== 'function') return undefined
  try {
    const value = gl.getParameter(token)
    return Number.isFinite(value) ? Number(value) : undefined
  } catch {
    return undefined
  }
}

function queryExtension(gl, name) {
  if (typeof gl?.getExtension !== 'function') return false
  try {
    return Boolean(gl.getExtension(name))
  } catch {
    return false
  }
}

export function inspectCapabilities(cgl, options = {}) {
  const gl = cgl?.gl
  const failures = []
  const issues = []
  const fail = (capability, actual, required, message, capabilityCode) => {
    failures.push(capabilityFailure(
      capability,
      actual,
      required,
      message,
      capabilityCode,
    ))
    issues.push(message)
  }
  const webgl2 = Boolean(
    gl && typeof gl.createVertexArray === 'function' && typeof gl.texImage3D === 'function'
  )
  const extensions = Object.freeze({
    colorBufferFloat: queryExtension(gl, 'EXT_color_buffer_float'),
    floatBlend: queryExtension(gl, 'EXT_float_blend'),
    floatTextureLinear: queryExtension(gl, 'OES_texture_float_linear'),
  })
  const limits = Object.freeze({
    maxDrawBuffers: queryLimit(gl, 'MAX_DRAW_BUFFERS'),
    maxTextureSize: queryLimit(gl, 'MAX_TEXTURE_SIZE'),
    maxTextureUnits: queryLimit(gl, 'MAX_TEXTURE_IMAGE_UNITS'),
    maxUniformBlockSize: queryLimit(gl, 'MAX_UNIFORM_BLOCK_SIZE'),
    maxUniformBufferBindings: queryLimit(gl, 'MAX_UNIFORM_BUFFER_BINDINGS'),
  })

  if (!webgl2) fail('webgl2', webgl2, true, 'WebGL2 is required')
  if (!extensions.colorBufferFloat) {
    fail(
      'colorBufferFloat',
      extensions.colorBufferFloat,
      true,
      'EXT_color_buffer_float is required',
    )
  }
  if (!extensions.floatTextureLinear) {
    fail(
      'floatLinear',
      extensions.floatTextureLinear,
      true,
      'OES_texture_float_linear is required',
    )
  }
  if (!extensions.floatBlend) {
    fail(
      'floatBlend',
      extensions.floatBlend,
      true,
      'EXT_float_blend is required for the complete catalog',
    )
  }
  for (const [name, required] of Object.entries(MINIMUMS)) {
    const actual = limits[name]
    if (!Number.isFinite(actual) || actual < required) {
      fail(
        name,
        actual,
        required,
        `${name} must be at least ${required} (reported ${actual ?? 'unknown'})`,
      )
    }
  }

  let cglCacheCompatible = false
  try {
    createCGLCacheInvalidator(cgl, { CGL: options.CGL })
    cglCacheCompatible = true
  } catch (error) {
    fail(
      'cglCacheCompatible',
      false,
      true,
      error?.message || 'CGL cache compatibility check failed',
      error?.code,
    )
  }

  return Object.freeze({
    cglCacheCompatible,
    extensions,
    failures: Object.freeze(failures),
    issues: Object.freeze(issues),
    limits,
    supported: issues.length === 0,
    webgl2,
  })
}
