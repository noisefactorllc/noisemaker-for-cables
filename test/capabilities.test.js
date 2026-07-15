import assert from 'node:assert/strict'
import { test } from 'node:test'

import { inspectCapabilities } from '../src/runtime/capabilities.js'

const EXTENSIONS = Object.freeze([
  'EXT_color_buffer_float',
  'EXT_float_blend',
  'OES_texture_float_linear',
])

const LIMITS = Object.freeze({
  MAX_DRAW_BUFFERS: 4,
  MAX_TEXTURE_IMAGE_UNITS: 9,
  MAX_TEXTURE_SIZE: 4096,
  MAX_UNIFORM_BLOCK_SIZE: 16_384,
  MAX_UNIFORM_BUFFER_BINDINGS: 8,
})

function createCapabilityFixture({
  limits = {},
  missingCglCache = false,
  missingExtension,
  webgl2 = true,
} = {}) {
  const values = { ...LIMITS, ...limits }
  let token = 1
  const gl = {}
  for (const name of Object.keys(LIMITS)) gl[name] = token++
  const valueByToken = new Map(
    Object.entries(LIMITS).map(([name]) => [gl[name], values[name]]),
  )
  if (webgl2) {
    gl.createVertexArray = () => ({})
    gl.texImage3D = () => {}
  }
  gl.getExtension = (name) => (
    EXTENSIONS.includes(name) && name !== missingExtension ? {} : null
  )
  gl.getParameter = (parameter) => valueByToken.get(parameter)

  const CGL = missingCglCache ? {} : { MESH: { lastMesh: null } }
  const cgl = { CGL, gl }
  if (!missingCglCache) cgl.currentProgram = null
  return { CGL, cgl }
}

const FAILURE_CASES = Object.freeze([
  Object.freeze({
    capability: 'webgl2',
    capabilityCode: 'ERR_CAPABILITY_WEBGL2',
    expectedActual: false,
    expectedRequired: true,
    issue: 'WebGL2 is required',
    options: { webgl2: false },
  }),
  Object.freeze({
    capability: 'colorBufferFloat',
    capabilityCode: 'ERR_CAPABILITY_COLOR_BUFFER_FLOAT',
    expectedActual: false,
    expectedRequired: true,
    issue: 'EXT_color_buffer_float is required',
    options: { missingExtension: 'EXT_color_buffer_float' },
  }),
  Object.freeze({
    capability: 'floatLinear',
    capabilityCode: 'ERR_CAPABILITY_FLOAT_LINEAR',
    expectedActual: false,
    expectedRequired: true,
    issue: 'OES_texture_float_linear is required',
    options: { missingExtension: 'OES_texture_float_linear' },
  }),
  Object.freeze({
    capability: 'floatBlend',
    capabilityCode: 'ERR_CAPABILITY_FLOAT_BLEND',
    expectedActual: false,
    expectedRequired: true,
    issue: 'EXT_float_blend is required for the complete catalog',
    options: { missingExtension: 'EXT_float_blend' },
  }),
  ...[
    ['MAX_TEXTURE_SIZE', 'maxTextureSize', 'ERR_CAPABILITY_MAX_TEXTURE_SIZE', 4096],
    ['MAX_DRAW_BUFFERS', 'maxDrawBuffers', 'ERR_CAPABILITY_MAX_DRAW_BUFFERS', 4],
    [
      'MAX_TEXTURE_IMAGE_UNITS',
      'maxTextureUnits',
      'ERR_CAPABILITY_MAX_TEXTURE_UNITS',
      9,
    ],
    [
      'MAX_UNIFORM_BLOCK_SIZE',
      'maxUniformBlockSize',
      'ERR_CAPABILITY_MAX_UNIFORM_BLOCK_SIZE',
      16_384,
    ],
    [
      'MAX_UNIFORM_BUFFER_BINDINGS',
      'maxUniformBufferBindings',
      'ERR_CAPABILITY_MAX_UNIFORM_BUFFER_BINDINGS',
      8,
    ],
  ].map(([glName, capability, capabilityCode, required]) => Object.freeze({
    capability,
    capabilityCode,
    expectedActual: required - 1,
    expectedRequired: required,
    issue: `${capability} must be at least ${required} (reported ${required - 1})`,
    options: { limits: { [glName]: required - 1 } },
  })),
  Object.freeze({
    capability: 'cglCacheCompatible',
    capabilityCode: 'ERR_UNSUPPORTED_CGL_CACHE_SHAPE',
    expectedActual: false,
    expectedRequired: true,
    issuePattern: /^Unsupported Cables CGL cache shape;/,
    options: { missingCglCache: true },
  }),
])

test('complete-catalog capability failures are structured, frozen, and preserve issue messages', async (t) => {
  for (const failureCase of FAILURE_CASES) {
    await t.test(failureCase.capability, () => {
      const { CGL, cgl } = createCapabilityFixture(failureCase.options)
      const report = inspectCapabilities(cgl, { CGL })

      assert.equal(report.supported, false)
      assert.equal(Object.isFrozen(report), true)
      assert.equal(Object.isFrozen(report.failures), true)
      assert.equal(report.failures.length, 1)
      assert.equal(Object.isFrozen(report.failures[0]), true)
      assert.deepEqual(
        {
          actual: report.failures[0].actual,
          capability: report.failures[0].capability,
          capabilityCode: report.failures[0].capabilityCode,
          required: report.failures[0].required,
        },
        {
          actual: failureCase.expectedActual,
          capability: failureCase.capability,
          capabilityCode: failureCase.capabilityCode,
          required: failureCase.expectedRequired,
        },
      )
      assert.equal(report.failures[0].message, report.issues[0])
      if (failureCase.issue) assert.equal(report.issues[0], failureCase.issue)
      if (failureCase.issuePattern) assert.match(report.issues[0], failureCase.issuePattern)
    })
  }
})

test('the exact documented complete-catalog boundary is supported with the public shape intact', () => {
  const { CGL, cgl } = createCapabilityFixture()
  const report = inspectCapabilities(cgl, { CGL })

  assert.equal(report.supported, true)
  assert.equal(report.webgl2, true)
  assert.equal(report.cglCacheCompatible, true)
  assert.deepEqual(report.extensions, {
    colorBufferFloat: true,
    floatBlend: true,
    floatTextureLinear: true,
  })
  assert.deepEqual(report.limits, {
    maxDrawBuffers: 4,
    maxTextureSize: 4096,
    maxTextureUnits: 9,
    maxUniformBlockSize: 16_384,
    maxUniformBufferBindings: 8,
  })
  assert.deepEqual(report.issues, [])
  assert.deepEqual(report.failures, [])
  assert.equal(Object.isFrozen(report.extensions), true)
  assert.equal(Object.isFrozen(report.limits), true)
  assert.equal(Object.isFrozen(report.issues), true)
  assert.equal(Object.isFrozen(report.failures), true)
})
