import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  captureGLState,
  restoreGLState,
  withGLState,
} from '../src/runtime/gl-state.js'
import * as glStateModule from '../src/runtime/gl-state.js'
import { UnsupportedCGLCacheShapeError } from '../src/runtime/cgl-cache.js'
import { createFakeWebGL2 } from './support/fake-webgl2.js'

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
]

function establishState(gl, prefix, textureUnitCount = 3) {
  gl.useProgram(`${prefix}-program`)
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, `${prefix}-draw-fbo`)
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, `${prefix}-read-fbo`)
  gl.bindRenderbuffer(gl.RENDERBUFFER, `${prefix}-renderbuffer`)
  gl.bindVertexArray(`${prefix}-vao`)
  gl.bindBuffer(gl.ARRAY_BUFFER, `${prefix}-array-buffer`)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, `${prefix}-element-buffer`)
  gl.bindBuffer(gl.UNIFORM_BUFFER, `${prefix}-uniform-buffer`)
  gl.bindBuffer(gl.COPY_READ_BUFFER, `${prefix}-copy-read-buffer`)
  gl.bindBuffer(gl.COPY_WRITE_BUFFER, `${prefix}-copy-write-buffer`)
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, `${prefix}-pack-buffer`)
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, `${prefix}-unpack-buffer`)
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, `${prefix}-transform-feedback`)
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, `${prefix}-tf-buffer`)
  gl.bindBufferRange(gl.UNIFORM_BUFFER, 0, `${prefix}-ubo-0`, 16, 64)
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, `${prefix}-ubo-1`)
  gl.bindBufferRange(gl.TRANSFORM_FEEDBACK_BUFFER, 0, `${prefix}-tfb-0`, 32, 96)
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, `${prefix}-tfb-1`)
  gl.viewport(1, 2, 301, 202)
  gl.scissor(3, 4, 103, 104)

  const targets = [gl.TEXTURE_2D, gl.TEXTURE_CUBE_MAP]
  if (gl.TEXTURE_3D !== undefined) targets.push(gl.TEXTURE_3D, gl.TEXTURE_2D_ARRAY)
  for (let unit = 0; unit < textureUnitCount; unit += 1) {
    gl.activeTexture(gl.TEXTURE0 + unit)
    for (const target of targets) gl.bindTexture(target, `${prefix}-texture-${unit}-${target}`)
    gl.bindSampler(unit, `${prefix}-sampler-${unit}`)
  }
  gl.activeTexture(gl.TEXTURE0 + 1)

  for (const name of ENABLES) gl.enable(gl[name])
  gl.disable(gl.DITHER)
  gl.blendEquationSeparate(gl.FUNC_SUBTRACT, gl.FUNC_ADD)
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO)
  gl.blendColor(0.1, 0.2, 0.3, 0.4)
  gl.depthFunc(gl.GREATER)
  gl.depthRange(0.2, 0.8)
  gl.depthMask(false)
  gl.clearDepth(0.75)
  gl.cullFace(gl.FRONT)
  gl.frontFace(gl.CW)
  gl.stencilFuncSeparate(gl.FRONT, gl.NEVER, 3, 0x0f)
  gl.stencilFuncSeparate(gl.BACK, gl.GREATER, 4, 0xf0)
  gl.stencilOpSeparate(gl.FRONT, gl.REPLACE, gl.INCR, gl.DECR)
  gl.stencilOpSeparate(gl.BACK, gl.DECR, gl.REPLACE, gl.INCR)
  gl.stencilMaskSeparate(gl.FRONT, 0x33)
  gl.stencilMaskSeparate(gl.BACK, 0xcc)
  gl.clearStencil(5)
  gl.colorMask(true, false, true, false)
  gl.clearColor(0.4, 0.3, 0.2, 0.1)
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.PACK_ROW_LENGTH, 11)
  gl.pixelStorei(gl.PACK_SKIP_PIXELS, 12)
  gl.pixelStorei(gl.PACK_SKIP_ROWS, 13)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2)
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 21)
  gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 22)
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 23)
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 24)
  gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 25)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, 0x9243)
  gl.polygonOffset(1.5, 2.5)
  gl.sampleCoverage(0.5, true)
  gl.lineWidth(2)
  gl.readBuffer(gl.COLOR_ATTACHMENT1)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
}

function createKnownCGL(gl) {
  const cgl = {
    _currentShader: { id: 'logical-shader' },
    currentProgram: { id: 'cached-program' },
    lastMesh: { id: 'compat-mesh' },
  }
  const CGL = { MESH: { lastMesh: { id: 'cached-mesh' } } }
  let sawRestoredProgram = false
  let currentProgram = cgl.currentProgram
  Object.defineProperty(cgl, 'currentProgram', {
    configurable: true,
    get: () => currentProgram,
    set(value) {
      sawRestoredProgram = gl.getParameter(gl.CURRENT_PROGRAM) === 'host-program'
      currentProgram = value
    },
  })
  return { CGL, cgl, sawRestoredProgram: () => sawRestoredProgram }
}

test('captureGLState and restoreGLState preserve complete shared WebGL2 state', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 3 })
  establishState(gl, 'host')
  const original = gl.inspect()

  const snapshot = captureGLState(gl, { maxTextureUnits: 99 })
  assert.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE0 + 1)
  assert.equal(snapshot.textureUnits.length, 3, 'backend limit is clamped to MAX_COMBINED')

  establishState(gl, 'guest')
  for (const name of ENABLES) gl.disable(gl[name])
  gl.enable(gl.DITHER)
  restoreGLState(gl, snapshot)

  assert.deepEqual(gl.inspect(), original)
  assert.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE0 + 1)
})

test('prepareNoisemakerGLState establishes a canonical guest baseline inside an exact host guard', () => {
  assert.equal(typeof glStateModule.prepareNoisemakerGLState, 'function')

  const gl = createFakeWebGL2({ maxTextureUnits: 3 })
  establishState(gl, 'host', 3)
  const original = gl.inspect()
  const cache = createKnownCGL(gl)
  let guest

  withGLState(gl, cache.cgl, () => {
    glStateModule.prepareNoisemakerGLState(gl, { maxTextureUnits: 2 })
    guest = gl.inspect()
  }, { CGL: cache.CGL, maxTextureUnits: 3 })

  const disabled = [
    gl.BLEND,
    gl.DEPTH_TEST,
    gl.CULL_FACE,
    gl.STENCIL_TEST,
    gl.SCISSOR_TEST,
    gl.RASTERIZER_DISCARD,
    gl.POLYGON_OFFSET_FILL,
    gl.SAMPLE_ALPHA_TO_COVERAGE,
    gl.SAMPLE_COVERAGE,
  ]
  for (const capability of disabled) {
    assert.equal(guest.enabled.includes(capability), false, `capability ${capability} is disabled`)
  }
  assert.equal(guest.enabled.includes(gl.DITHER), true)

  const parameter = (name) => new Map(guest.state).get(gl[name])
  assert.equal(parameter('BLEND_EQUATION_RGB'), gl.FUNC_ADD)
  assert.equal(parameter('BLEND_EQUATION_ALPHA'), gl.FUNC_ADD)
  assert.equal(parameter('BLEND_SRC_RGB'), gl.ONE)
  assert.equal(parameter('BLEND_DST_RGB'), gl.ZERO)
  assert.equal(parameter('BLEND_SRC_ALPHA'), gl.ONE)
  assert.equal(parameter('BLEND_DST_ALPHA'), gl.ZERO)
  assert.deepEqual(parameter('BLEND_COLOR'), [0, 0, 0, 0])
  assert.equal(parameter('DEPTH_FUNC'), gl.LESS)
  assert.deepEqual(parameter('DEPTH_RANGE'), [0, 1])
  assert.equal(parameter('DEPTH_WRITEMASK'), true)
  assert.equal(parameter('DEPTH_CLEAR_VALUE'), 1)
  assert.equal(parameter('CULL_FACE_MODE'), gl.BACK)
  assert.equal(parameter('FRONT_FACE'), gl.CCW)
  assert.equal(parameter('STENCIL_FUNC'), gl.ALWAYS)
  assert.equal(parameter('STENCIL_BACK_FUNC'), gl.ALWAYS)
  assert.equal(parameter('STENCIL_WRITEMASK'), 0xffffffff)
  assert.equal(parameter('STENCIL_BACK_WRITEMASK'), 0xffffffff)
  assert.equal(parameter('STENCIL_CLEAR_VALUE'), 0)
  assert.deepEqual(parameter('COLOR_WRITEMASK'), [true, true, true, true])
  assert.deepEqual(parameter('COLOR_CLEAR_VALUE'), [0, 0, 0, 0])
  assert.equal(parameter('PACK_ALIGNMENT'), 4)
  assert.equal(parameter('PACK_ROW_LENGTH'), 0)
  assert.equal(parameter('PACK_SKIP_PIXELS'), 0)
  assert.equal(parameter('PACK_SKIP_ROWS'), 0)
  assert.equal(parameter('UNPACK_ALIGNMENT'), 4)
  assert.equal(parameter('UNPACK_ROW_LENGTH'), 0)
  assert.equal(parameter('UNPACK_IMAGE_HEIGHT'), 0)
  assert.equal(parameter('UNPACK_SKIP_PIXELS'), 0)
  assert.equal(parameter('UNPACK_SKIP_ROWS'), 0)
  assert.equal(parameter('UNPACK_SKIP_IMAGES'), 0)
  assert.equal(parameter('UNPACK_FLIP_Y_WEBGL'), false)
  assert.equal(parameter('UNPACK_PREMULTIPLY_ALPHA_WEBGL'), false)
  assert.equal(parameter('UNPACK_COLORSPACE_CONVERSION_WEBGL'), gl.BROWSER_DEFAULT_WEBGL)
  assert.equal(parameter('POLYGON_OFFSET_FACTOR'), 0)
  assert.equal(parameter('POLYGON_OFFSET_UNITS'), 0)
  assert.equal(parameter('SAMPLE_COVERAGE_VALUE'), 1)
  assert.equal(parameter('SAMPLE_COVERAGE_INVERT'), false)
  assert.equal(parameter('PIXEL_PACK_BUFFER_BINDING'), null)
  assert.equal(parameter('PIXEL_UNPACK_BUFFER_BINDING'), null)
  assert.equal(parameter('TRANSFORM_FEEDBACK_BINDING'), null)
  assert.equal(parameter('TRANSFORM_FEEDBACK_BUFFER_BINDING'), null)
  assert.equal(guest.activeTexture, gl.TEXTURE0)
  assert.equal(guest.samplers[0], null)
  assert.equal(guest.samplers[1], null)
  assert.equal(guest.samplers[2], 'host-sampler-2', 'units beyond the backend limit are untouched')

  assert.deepEqual(gl.inspect(), original, 'host state is restored exactly')
  assert.equal(cache.cgl.currentProgram, null)
  assert.equal(cache.CGL.MESH.lastMesh, null)
})

test('captureGLState feature-detects optional texture targets', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 2, optionalTextureTargets: false })
  establishState(gl, 'host', 2)
  const original = gl.inspect()

  const snapshot = captureGLState(gl, { maxTextureUnits: 1 })
  establishState(gl, 'guest', 2)
  restoreGLState(gl, snapshot)

  const restored = gl.inspect()
  assert.deepEqual(restored.textureUnits[0], original.textureUnits[0])
  assert.notDeepEqual(restored.textureUnits[1], original.textureUnits[1])
  assert.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE0 + 1)
})

test('withGLState preserves a synchronous return value and invalidates pinned CGL caches last', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(gl, 'host', 2)
  const original = gl.inspect()
  const cache = createKnownCGL(gl)
  const logicalShader = cache.cgl._currentShader
  const returnValue = { ok: true }

  const result = withGLState(gl, cache.cgl, () => {
    establishState(gl, 'guest', 2)
    return returnValue
  }, { CGL: cache.CGL, maxTextureUnits: 2 })

  assert.equal(result, returnValue)
  assert.equal(typeof result?.then, 'undefined')
  assert.deepEqual(gl.inspect(), original)
  assert.equal(cache.sawRestoredProgram(), true, 'raw GL state is restored before cache invalidation')
  assert.equal(cache.cgl.currentProgram, null)
  assert.equal(cache.CGL.MESH.lastMesh, null)
  assert.equal(cache.cgl.lastMesh, null)
  assert.equal(cache.cgl._currentShader, logicalShader)
})

test('withGLState restores after synchronous throws', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(gl, 'host', 2)
  const original = gl.inspect()
  const cache = createKnownCGL(gl)
  const failure = new Error('sync failure')

  assert.throws(
    () => withGLState(gl, cache.cgl, () => {
      establishState(gl, 'guest', 2)
      throw failure
    }, { CGL: cache.CGL, maxTextureUnits: 2 }),
    (error) => error === failure,
  )
  assert.deepEqual(gl.inspect(), original)
  assert.equal(cache.cgl.currentProgram, null)
  assert.equal(cache.CGL.MESH.lastMesh, null)
})

test('withGLState preserves a synchronous callback failure and collects every cleanup failure', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(gl, 'host', 2)
  const cache = createKnownCGL(gl)
  const callbackFailure = new Error('callback failed')
  const programFailure = new Error('program restore failed')
  const framebufferFailure = new Error('framebuffer restore failed')
  const cacheFailure = new Error('cache invalidation failed')

  assert.throws(
    () => withGLState(gl, cache.cgl, () => {
      establishState(gl, 'guest', 2)
      gl.failNext('useProgram', programFailure)
      gl.failNext('bindFramebuffer', framebufferFailure)
      throw callbackFailure
    }, {
      CGL: cache.CGL,
      cacheInvalidator: () => { throw cacheFailure },
      maxTextureUnits: 2,
    }),
    (error) => {
      assert.equal(error, callbackFailure, 'the callback failure remains primary')
      assert.deepEqual(error.cleanupErrors, [programFailure, framebufferFailure, cacheFailure])
      return true
    },
  )

  assert.equal(gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), 'host-read-fbo')
  assert.equal(gl.getParameter(gl.RENDERBUFFER_BINDING), 'host-renderbuffer')
  assert.deepEqual(gl.getParameter(gl.VIEWPORT), [1, 2, 301, 202])
  assert.equal(gl.getParameter(gl.ACTIVE_TEXTURE), gl.TEXTURE0 + 1)
  assert.equal(cache.cgl.currentProgram, null, 'known cache invalidation still ran')
  assert.equal(cache.CGL.MESH.lastMesh, null)
})

test('withGLState reports all cleanup failures after successful sync and async callbacks', async () => {
  const syncGL = createFakeWebGL2({ maxTextureUnits: 1 })
  establishState(syncGL, 'host', 1)
  const syncCache = createKnownCGL(syncGL)
  const syncRawFailure = new Error('sync raw cleanup failed')
  const syncCacheFailure = new Error('sync cache cleanup failed')

  assert.throws(
    () => withGLState(syncGL, syncCache.cgl, () => {
      establishState(syncGL, 'guest', 1)
      syncGL.failNext('useProgram', syncRawFailure)
      return 'unreachable value'
    }, {
      CGL: syncCache.CGL,
      cacheInvalidator: () => { throw syncCacheFailure },
      maxTextureUnits: 1,
    }),
    (error) => {
      assert.ok(error instanceof AggregateError)
      assert.deepEqual(error.errors, [syncRawFailure, syncCacheFailure])
      return true
    },
  )

  const asyncGL = createFakeWebGL2({ maxTextureUnits: 1 })
  establishState(asyncGL, 'host', 1)
  const asyncCache = createKnownCGL(asyncGL)
  const asyncRawFailure = new Error('async raw cleanup failed')
  const asyncCacheFailure = new Error('async cache cleanup failed')
  const result = withGLState(asyncGL, asyncCache.cgl, async () => {
    establishState(asyncGL, 'guest', 1)
    asyncGL.failNext('useProgram', asyncRawFailure)
    return 'unreachable value'
  }, {
    CGL: asyncCache.CGL,
    cacheInvalidator: () => { throw asyncCacheFailure },
    maxTextureUnits: 1,
  })

  await assert.rejects(result, (error) => {
    assert.ok(error instanceof AggregateError)
    assert.deepEqual(error.errors, [asyncRawFailure, asyncCacheFailure])
    return true
  })
})

test('withGLState preserves asynchronous values and restores on fulfillment or rejection', async () => {
  const fulfilledGL = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(fulfilledGL, 'host', 2)
  const fulfilledOriginal = fulfilledGL.inspect()
  const fulfilledCache = createKnownCGL(fulfilledGL)
  let resolveCallback

  const pending = withGLState(fulfilledGL, fulfilledCache.cgl, () => {
    establishState(fulfilledGL, 'guest', 2)
    return new Promise((resolve) => { resolveCallback = resolve })
  }, { CGL: fulfilledCache.CGL, maxTextureUnits: 2 })
  assert.notDeepEqual(fulfilledGL.inspect(), fulfilledOriginal)
  resolveCallback('async value')
  assert.equal(await pending, 'async value')
  assert.deepEqual(fulfilledGL.inspect(), fulfilledOriginal)

  const rejectedGL = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(rejectedGL, 'host', 2)
  const rejectedOriginal = rejectedGL.inspect()
  const rejectedCache = createKnownCGL(rejectedGL)
  const failure = new Error('async failure')
  const rejected = withGLState(rejectedGL, rejectedCache.cgl, async () => {
    establishState(rejectedGL, 'guest', 2)
    throw failure
  }, { CGL: rejectedCache.CGL, maxTextureUnits: 2 })

  await assert.rejects(rejected, (error) => error === failure)
  assert.deepEqual(rejectedGL.inspect(), rejectedOriginal)
  assert.equal(rejectedCache.cgl.currentProgram, null)
  assert.equal(rejectedCache.CGL.MESH.lastMesh, null)
})

test('withGLState preserves an asynchronous rejection as primary when cleanup also fails', async () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 1 })
  establishState(gl, 'host', 1)
  const cache = createKnownCGL(gl)
  const callbackFailure = new Error('async callback failed')
  const rawFailure = new Error('async rejection raw cleanup failed')
  const cacheFailure = new Error('async rejection cache cleanup failed')

  const result = withGLState(gl, cache.cgl, async () => {
    establishState(gl, 'guest', 1)
    gl.failNext('useProgram', rawFailure)
    throw callbackFailure
  }, {
    CGL: cache.CGL,
    cacheInvalidator: () => { throw cacheFailure },
    maxTextureUnits: 1,
  })

  await assert.rejects(result, (error) => {
    assert.equal(error, callbackFailure)
    assert.deepEqual(error.cleanupErrors, [rawFailure, cacheFailure])
    return true
  })
})

test('withGLState ends active guest transform feedback before restoring host state', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 2 })
  establishState(gl, 'host', 2)
  gl.disable(gl.RASTERIZER_DISCARD)
  const original = gl.inspect()
  const cache = createKnownCGL(gl)
  const callbackFailure = new Error('guest transform feedback failure')

  assert.throws(
    () => withGLState(gl, cache.cgl, () => {
      establishState(gl, 'guest', 2)
      gl.enable(gl.RASTERIZER_DISCARD)
      gl.beginTransformFeedback(gl.POINTS)
      throw callbackFailure
    }, { CGL: cache.CGL, maxTextureUnits: 2 }),
    (error) => error === callbackFailure,
  )

  assert.deepEqual(gl.inspect(), original)
  assert.ok(gl.calls.some(([name]) => name === 'endTransformFeedback'))
  assert.equal(cache.cgl.currentProgram, null)
  assert.equal(cache.CGL.MESH.lastMesh, null)
})

test('withGLState fails closed before the callback when host transform feedback is active', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 1 })
  establishState(gl, 'host', 1)
  gl.beginTransformFeedback(gl.POINTS)
  const cache = createKnownCGL(gl)
  let callbackCalled = false

  assert.throws(
    () => withGLState(gl, cache.cgl, () => { callbackCalled = true }, {
      CGL: cache.CGL,
      maxTextureUnits: 1,
    }),
    /active host transform feedback/i,
  )
  assert.equal(callbackCalled, false)
  assert.equal(gl.getParameter(gl.TRANSFORM_FEEDBACK_ACTIVE), true)
})

test('withGLState fails closed for unknown CGL cache shapes despite predicate or custom hooks', () => {
  const gl = createFakeWebGL2({ maxTextureUnits: 1 })
  const unknownCGL = {}
  let callbackCalled = false

  assert.throws(
    () => withGLState(gl, unknownCGL, () => { callbackCalled = true }, {
      CGL: { MESH: {} },
      maxTextureUnits: 1,
    }),
    UnsupportedCGLCacheShapeError,
  )
  assert.equal(callbackCalled, false)

  assert.throws(
    () => withGLState(gl, unknownCGL, () => { callbackCalled = true }, {
      CGL: { MESH: {} },
      cacheProbe: () => true,
      maxTextureUnits: 1,
    }),
    UnsupportedCGLCacheShapeError,
  )
  assert.throws(
    () => withGLState(gl, unknownCGL, () => { callbackCalled = true }, {
      CGL: { MESH: {} },
      cacheInvalidator: () => {},
      maxTextureUnits: 1,
    }),
    UnsupportedCGLCacheShapeError,
  )
  assert.equal(callbackCalled, false)
})
