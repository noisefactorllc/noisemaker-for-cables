import assert from 'node:assert/strict'
import { test } from 'node:test'

function installTestDomShim(target = globalThis) {
  target.HTMLElement ||= class {}
  target.HTMLVideoElement ||= class {}
  target.HTMLImageElement ||= class {}
  target.HTMLCanvasElement ||= class {}
  target.ImageBitmap ||= class {}
  target.customElements ||= {
    define() {},
    get() {},
    whenDefined() {
      return Promise.resolve()
    },
  }
  target.window ||= target
  target.document ||= {
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
    createElementNS() {
      return { style: {} }
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
  }
}

installTestDomShim()

const {
  BackendTextureError,
  CablesWebGL2Backend,
  createCablesWebGL2BackendClass,
} = await import('../src/backend/cables-webgl2-backend.js')
const {
  OutputCopyError,
  TEXEL_FETCH_FRAGMENT_SHADER,
  createOutputCopier,
} = await import('../src/backend/output-copy.js')
const { WebGL2Backend } = await import('../vendor-cache/noisemaker-shaders-core.esm.js')

function createTrackingGL({
  blitError = 0,
  blitFailure = null,
  createFramebufferResults = [],
  framebufferStatuses = [],
} = {}) {
  let nextFramebuffer = 0
  let nextBuffer = 0
  let nextTexture = 0
  const calls = []
  const deletedBuffers = []
  const deletedFramebuffers = []
  const deletedTextures = []
  const boundTextures = new Map()

  const gl = {
    ARRAY_BUFFER: 0x8892,
    COLOR_ATTACHMENT0: 0x8ce0,
    COLOR_BUFFER_BIT: 0x4000,
    DRAW_FRAMEBUFFER: 0x8ca9,
    FLOAT: 0x1406,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8cd6,
    HALF_FLOAT: 0x140b,
    INVALID_OPERATION: 0x0502,
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    NO_ERROR: 0,
    READ_FRAMEBUFFER: 0x8ca8,
    RGBA: 0x1908,
    RGBA8: 0x8058,
    RGBA16F: 0x881a,
    RGBA32F: 0x8814,
    STATIC_DRAW: 0x88e4,
    TEXTURE_2D: 0x0de1,
    TEXTURE_CUBE_MAP: 0x8513,
    TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    UNSIGNED_BYTE: 0x1401,
    bindBuffer(...args) {
      calls.push(['bindBuffer', ...args])
    },
    bindFramebuffer(...args) {
      calls.push(['bindFramebuffer', ...args])
    },
    bindTexture(target, texture) {
      calls.push(['bindTexture', target, texture])
      boundTextures.set(target, texture)
    },
    bindVertexArray(...args) {
      calls.push(['bindVertexArray', ...args])
    },
    blitFramebuffer(...args) {
      calls.push(['blitFramebuffer', ...args])
      if (blitFailure) throw blitFailure
    },
    bufferData(...args) {
      calls.push(['bufferData', ...args])
    },
    checkFramebufferStatus(target) {
      const status = framebufferStatuses.length > 0
        ? framebufferStatuses.shift()
        : gl.FRAMEBUFFER_COMPLETE
      calls.push(['checkFramebufferStatus', target, status])
      return status
    },
    createBuffer() {
      const buffer = `buffer-${nextBuffer += 1}`
      calls.push(['createBuffer', buffer])
      return buffer
    },
    createFramebuffer() {
      const framebuffer = createFramebufferResults.length > 0
        ? createFramebufferResults.shift()
        : `fbo-${nextFramebuffer += 1}`
      calls.push(['createFramebuffer', framebuffer])
      return framebuffer
    },
    createTexture() {
      const texture = `owned-texture-${nextTexture += 1}`
      calls.push(['createTexture', texture])
      return texture
    },
    createVertexArray() {
      const vao = 'fullscreen-vao'
      calls.push(['createVertexArray', vao])
      return vao
    },
    deleteBuffer(buffer) {
      calls.push(['deleteBuffer', buffer])
      deletedBuffers.push(buffer)
    },
    deleteFramebuffer(framebuffer) {
      calls.push(['deleteFramebuffer', framebuffer])
      deletedFramebuffers.push(framebuffer)
    },
    deleteTexture(texture) {
      calls.push(['deleteTexture', texture])
      deletedTextures.push(texture)
    },
    framebufferTexture2D(...args) {
      calls.push(['framebufferTexture2D', ...args])
    },
    getError() {
      calls.push(['getError', blitError])
      const error = blitError
      blitError = 0
      return error
    },
    pixelStorei(...args) {
      calls.push(['pixelStorei', ...args])
    },
    texImage2D(...args) {
      const target = args[0]
      const bindingTarget = target >= gl.TEXTURE_CUBE_MAP_POSITIVE_X &&
        target < gl.TEXTURE_CUBE_MAP_POSITIVE_X + 6
        ? gl.TEXTURE_CUBE_MAP
        : target
      calls.push(['texImage2D', boundTextures.get(bindingTarget) ?? null, ...args])
    },
    texParameteri(...args) {
      calls.push(['texParameteri', boundTextures.get(args[0]) ?? null, ...args])
    },
    texSubImage2D(...args) {
      calls.push(['texSubImage2D', boundTextures.get(args[0]) ?? null, ...args])
    },
    enableVertexAttribArray(...args) {
      calls.push(['enableVertexAttribArray', ...args])
    },
    vertexAttribPointer(...args) {
      calls.push(['vertexAttribPointer', ...args])
    },
  }

  return { calls, deletedBuffers, deletedFramebuffers, deletedTextures, gl }
}

function createFallbackGL({ deleteProgramFailures = 0, fragmentCompiles = true } = {}) {
  const tracked = createTrackingGL()
  const { calls, gl } = tracked
  let nextShader = 0

  Object.assign(gl, {
    COMPILE_STATUS: 0x8b81,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    TEXTURE0: 0x84c0,
    TRIANGLES: 0x0004,
    VERTEX_SHADER: 0x8b31,
    activeTexture(...args) { calls.push(['activeTexture', ...args]) },
    attachShader(...args) { calls.push(['attachShader', ...args]) },
    bindTexture(...args) { calls.push(['bindTexture', ...args]) },
    bindVertexArray(...args) { calls.push(['bindVertexArray', ...args]) },
    compileShader(...args) { calls.push(['compileShader', ...args]) },
    createProgram() {
      calls.push(['createProgram', 'copy-program'])
      return 'copy-program'
    },
    createShader(type) {
      const shader = { id: nextShader += 1, type }
      calls.push(['createShader', type, shader])
      return shader
    },
    createVertexArray() {
      calls.push(['createVertexArray', 'copy-vao'])
      return 'copy-vao'
    },
    deleteProgram(...args) {
      calls.push(['deleteProgram', ...args])
      if (deleteProgramFailures > 0) {
        deleteProgramFailures -= 1
        throw new Error('deleteProgram failed')
      }
    },
    deleteShader(...args) { calls.push(['deleteShader', ...args]) },
    deleteVertexArray(...args) { calls.push(['deleteVertexArray', ...args]) },
    drawArrays(...args) { calls.push(['drawArrays', ...args]) },
    getProgramInfoLog() { return '' },
    getProgramParameter() { return true },
    getShaderInfoLog() { return '' },
    getShaderParameter(shader) {
      return shader.type !== gl.FRAGMENT_SHADER || fragmentCompiles
    },
    getUniformLocation(...args) {
      calls.push(['getUniformLocation', ...args])
      return 'source-location'
    },
    linkProgram(...args) { calls.push(['linkProgram', ...args]) },
    shaderSource(...args) { calls.push(['shaderSource', ...args]) },
    uniform1i(...args) { calls.push(['uniform1i', ...args]) },
    useProgram(...args) { calls.push(['useProgram', ...args]) },
    viewport(...args) { calls.push(['viewport', ...args]) },
  })

  return tracked
}

class FakeWebGL2Backend {
  constructor(context, canvas) {
    this.constructorArguments = [context, canvas]
    this.context = context
    this.gl = context
    this.canvas = canvas
    this.textures = new Map()
    this.fbos = new Map()
    this.defaultTexture = null
    this.baseDestroyedTextureIds = []
  }

  async init() {
    this.defaultTexture = 'reference-default'
  }

  createFullscreenVAO() {
    const buffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW)
    const vao = this.gl.createVertexArray()
    this.gl.bindVertexArray(vao)
    this.gl.enableVertexAttribArray(0)
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0)
    this.gl.bindVertexArray(null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    return vao
  }

  createTexture(id, spec) {
    const handle = `owned-${id}`
    this.textures.set(id, {
      format: spec.format,
      glFormat: spec.glFormat,
      handle,
      height: spec.height,
      width: spec.width,
    })
    this.fbos.set(id, `fbo-${id}`)
    return handle
  }

  createTexture3D(id, spec) {
    return this.createTexture(id, spec)
  }

  createCubeTexture(id, spec) {
    return this.createTexture(id, {
      format: 'rgba16f',
      height: spec.size,
      width: spec.size,
    })
  }

  destroyTexture(id) {
    this.baseDestroyedTextureIds.push(id)
    const texture = this.textures.get(id)
    if (texture) this.gl.deleteTexture(texture.handle)
    this.textures.delete(id)

    const fbo = this.fbos.get(id)
    if (fbo) this.gl.deleteFramebuffer(fbo)
    this.fbos.delete(id)
  }

  destroy() {
    if (!this.gl) return
    for (const id of [...this.textures.keys()]) this.destroyTexture(id)
    this.gl = null
    this.context = null
  }
}

class FailOnceDestroyBackend extends FakeWebGL2Backend {
  destroy(...args) {
    this.baseDestroyCalls = (this.baseDestroyCalls ?? 0) + 1
    if (this.baseDestroyCalls === 1) throw new Error('base destroy failed')
    return super.destroy(...args)
  }
}

function createCompilerGL({
  attributeFailure = null,
  fragmentCompiles = true,
  linkSucceeds = true,
  uniformBlockBindingFailure = null,
  uniformBlockBindingFailureAt = -1,
  uniformBlockCount = 0,
} = {}) {
  const tracked = createTrackingGL()
  const { calls, gl } = tracked
  let nextShader = 0

  Object.assign(gl, {
    ACTIVE_UNIFORM_BLOCKS: 0x8a36,
    ACTIVE_UNIFORMS: 0x8b86,
    COMPILE_STATUS: 0x8b81,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    DYNAMIC_DRAW: 0x88e8,
    MAX_UNIFORM_BLOCK_SIZE: 0x8a30,
    UNIFORM_BLOCK_DATA_SIZE: 0x8a40,
    UNIFORM_BUFFER: 0x8a11,
    VERTEX_SHADER: 0x8b31,
    attachShader(...args) { calls.push(['attachShader', ...args]) },
    bindAttribLocation(...args) { calls.push(['bindAttribLocation', ...args]) },
    compileShader(...args) { calls.push(['compileShader', ...args]) },
    createProgram() {
      calls.push(['createProgram', 'compiled-program'])
      return 'compiled-program'
    },
    createShader(type) {
      const shader = { id: nextShader += 1, type }
      calls.push(['createShader', type, shader])
      return shader
    },
    deleteProgram(...args) { calls.push(['deleteProgram', ...args]) },
    deleteShader(...args) { calls.push(['deleteShader', ...args]) },
    getActiveUniformBlockName(_program, index) { return `Block${index}` },
    getActiveUniformBlockParameter() { return 16 },
    getAttribLocation(_program, name) {
      if (attributeFailure) throw attributeFailure
      return `attribute-${name}`
    },
    getParameter(parameter) {
      if (parameter === gl.MAX_UNIFORM_BLOCK_SIZE) return 65_536
      throw new Error(`unexpected parameter ${parameter}`)
    },
    getProgramInfoLog() { return 'link failed' },
    getProgramParameter(_program, parameter) {
      if (parameter === gl.LINK_STATUS) return linkSucceeds
      if (parameter === gl.ACTIVE_UNIFORMS) return 0
      if (parameter === gl.ACTIVE_UNIFORM_BLOCKS) return uniformBlockCount
      throw new Error(`unexpected program parameter ${parameter}`)
    },
    getShaderInfoLog() { return 'fragment failed' },
    getShaderParameter(shader) {
      return shader.type !== gl.FRAGMENT_SHADER || fragmentCompiles
    },
    linkProgram(...args) { calls.push(['linkProgram', ...args]) },
    shaderSource(...args) { calls.push(['shaderSource', ...args]) },
    uniformBlockBinding(...args) {
      calls.push(['uniformBlockBinding', ...args])
      if (args[1] === uniformBlockBindingFailureAt) {
        throw uniformBlockBindingFailure ?? new Error(`uniform block ${args[1]} binding failed`)
      }
    },
  })

  return tracked
}

function createBitmap(width, height) {
  const source = new ImageBitmap()
  source.width = width
  source.height = height
  return source
}

function registerHostTexture(backend, id, ownership, width = 4, height = 3) {
  backend.registerExternalTexture(id, {
    format: ownership === 'default' ? 'rgba8' : 'external',
    glFormat: null,
    handle: `cgl-${ownership}-${id}`,
    height,
    width,
  }, { kind: 'media', ownership })
  return `cgl-${ownership}-${id}`
}

test('real backend is a pinned WebGL2Backend subclass and present only records the ID', () => {
  const calls = []
  const gl = {
    bindFramebuffer(...args) { calls.push(['bindFramebuffer', ...args]) },
    clear(...args) { calls.push(['clear', ...args]) },
    drawArrays(...args) { calls.push(['drawArrays', ...args]) },
  }
  const cgl = { gl }
  const canvas = { id: 'shared-canvas' }

  const backend = new CablesWebGL2Backend(cgl, canvas)

  assert.ok(backend instanceof WebGL2Backend)
  assert.equal(backend.gl, gl)
  assert.equal(backend.context, gl)
  assert.equal(backend.canvas, canvas)
  backend.present('final-step')
  assert.equal(backend.presentedTextureId, 'final-step')
  assert.deepEqual(calls, [])
})

test('presented texture info includes the reference texture and FBO without mutating it', () => {
  const { gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FakeWebGL2Backend)
  const backend = new Backend({ gl }, { id: 'canvas' })
  const record = {
    format: 'rgba16f',
    glFormat: { internalFormat: gl.RGBA16F },
    handle: 'final-handle',
    height: 45,
    width: 80,
  }
  backend.textures.set('final-step', record)
  backend.fbos.set('final-step', 'final-fbo')
  backend.present('final-step')

  const info = backend.getPresentedTextureInfo()

  assert.notEqual(info, record)
  assert.deepEqual(info, {
    ...record,
    fbo: 'final-fbo',
    id: 'final-step',
    ownership: 'owned',
  })
  assert.deepEqual(record, {
    format: 'rgba16f',
    glFormat: { internalFormat: gl.RGBA16F },
    handle: 'final-handle',
    height: 45,
    width: 80,
  })
})

test('missing presentation and missing presented textures are categorized separately', () => {
  const { gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FakeWebGL2Backend)
  const backend = new Backend({ gl })

  assert.throws(
    () => backend.getPresentedTextureInfo(),
    (error) => error instanceof BackendTextureError &&
      error.code === 'ERR_MISSING_PRESENTED_TEXTURE_ID',
  )

  backend.present('gone')
  assert.throws(
    () => backend.getPresentedTextureInfo(),
    (error) => error instanceof BackendTextureError &&
      error.code === 'ERR_MISSING_PRESENTED_TEXTURE',
  )
})

test('ownership is explicit and replacing owned records uses the superclass destroy path', async () => {
  const { deletedTextures, gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FakeWebGL2Backend)
  const backend = new Backend({ gl })
  await backend.init()

  backend.createTexture('media_step_0', {
    format: 'rgba16f',
    height: 24,
    width: 32,
  })
  assert.equal(backend.getTextureOwnership('media_step_0'), 'owned')
  assert.equal(backend.getDefaultTextureInfo().ownership, 'default')

  backend.registerExternalTexture('media_step_0', {
    format: 'rgba8',
    glFormat: { internalFormat: 0x8058 },
    handle: 'cgl-media',
    height: 48,
    width: 64,
  }, { kind: 'media' })
  backend.registerExternalTexture('stable-output', {
    format: 'rgba16f',
    glFormat: { internalFormat: gl.RGBA16F },
    handle: 'cgl-output',
    height: 48,
    width: 64,
  }, { kind: 'output' })

  assert.deepEqual(backend.baseDestroyedTextureIds, ['media_step_0'])
  assert.deepEqual(deletedTextures, ['owned-media_step_0'])
  assert.equal(backend.getTextureOwnership('media_step_0'), 'external')
  assert.equal(backend.getTextureOwnership('stable-output'), 'external')
  assert.equal(backend.getTextureKind('media_step_0'), 'media')
  assert.equal(backend.getTextureKind('stable-output'), 'output')
})

test('destroy is idempotent, releases owned/default textures once, and preserves CGL handles', async () => {
  const { deletedTextures, gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FakeWebGL2Backend)
  const backend = new Backend({ gl })
  await backend.init()
  backend.createTexture('owned', { format: 'rgba16f', height: 8, width: 8 })
  backend.registerExternalTexture('media_step_0', {
    format: 'rgba8',
    handle: 'cgl-media',
    height: 8,
    width: 8,
  }, { kind: 'media' })
  backend.registerExternalTexture('stable-output', {
    format: 'rgba16f',
    handle: 'cgl-output',
    height: 8,
    width: 8,
  }, { kind: 'output' })

  backend.destroy()
  backend.destroy()

  assert.deepEqual(deletedTextures.sort(), ['owned-owned', 'reference-default'].sort())
  assert.ok(!deletedTextures.includes('cgl-media'))
  assert.ok(!deletedTextures.includes('cgl-output'))
  assert.equal(backend.gl, null)
})

function assertDirectUploadDetaches(method) {
  const scenarios = [
    { height: 3, ownership: 'external', width: 4 },
    { height: 6, ownership: 'default', width: 8 },
  ]

  for (const [index, scenario] of scenarios.entries()) {
    const { calls, deletedTextures, gl } = createTrackingGL()
    const backend = new CablesWebGL2Backend({ gl })
    const id = `direct-upload-${index}`
    const hostHandle = registerHostTexture(backend, id, scenario.ownership, 4, 3)

    method({ backend, gl, id, ...scenario })

    assert.ok(!deletedTextures.includes(hostHandle), `${method.name} deleted ${scenario.ownership}`)
    assert.equal(backend.getTextureOwnership(id), 'owned')
    assert.notEqual(backend.textures.get(id).handle, hostHandle)
    const uploads = calls.filter((call) =>
      call[0] === 'texImage2D' || call[0] === 'texSubImage2D')
    assert.ok(uploads.length > 0)
    assert.ok(uploads.every((call) => call[1] !== hostHandle),
      `${method.name} uploaded CPU data into ${scenario.ownership}`)
  }
}

test('updateTextureFromSource detaches external/default records before any CPU upload', () => {
  assertDirectUploadDetaches(function updateFromSource({ backend, height, id, width }) {
    backend.updateTextureFromSource(id, createBitmap(width, height))
  })
})

test('_uploadMeshTexture detaches external/default records before any CPU upload', () => {
  assertDirectUploadDetaches(function uploadMeshTexture({ backend, gl, height, id, width }) {
    backend._uploadMeshTexture(
      id,
      new Float32Array(width * height * 4),
      width,
      height,
      gl.RGBA32F,
      'rgba32f',
    )
  })
})

test('uploadDataTexture detaches external/default records before any CPU upload', () => {
  assertDirectUploadDetaches(function uploadDataTexture({ backend, height, id, width }) {
    backend.uploadDataTexture(id, new Float32Array(width * height * 4), width, height)
  })
})

test('uploadCubeFace detaches external/default records before uploading into an owned cubemap', () => {
  for (const ownership of ['external', 'default']) {
    const { calls, deletedTextures, gl } = createTrackingGL()
    const backend = new CablesWebGL2Backend({ gl })
    const id = `cube-${ownership}`
    const hostHandle = registerHostTexture(backend, id, ownership, 4, 4)

    backend.uploadCubeFace(id, 2, {
      data: new Uint8Array(4 * 4 * 4),
      height: 4,
      width: 4,
    })

    const record = backend.textures.get(id)
    assert.ok(!deletedTextures.includes(hostHandle))
    assert.equal(backend.getTextureOwnership(id), 'owned')
    assert.notEqual(record.handle, hostHandle)
    assert.equal(record.cube, true)
    const faceUploads = calls.filter((call) =>
      call[0] === 'texImage2D' && call[4] === gl.RGBA8)
    assert.ok(faceUploads.length >= 7)
    assert.ok(faceUploads.every((call) => call[1] !== hostHandle))
    assert.ok(calls.filter((call) => call[0] === 'bindTexture')
      .every((call) => call[2] !== hostHandle))

    const faceTarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + 2
    const faceUploadIndex = calls.findIndex((call) =>
      call[0] === 'texImage2D' && call[1] === record.handle && call[2] === faceTarget)
    assert.ok(faceUploadIndex >= 0)
    const precedingOwnedBindIndex = calls.findLastIndex((call, index) =>
      index < faceUploadIndex && call[0] === 'bindTexture' &&
      call[1] === gl.TEXTURE_CUBE_MAP && call[2] === record.handle)
    assert.ok(precedingOwnedBindIndex >= 0)
  }
})

test('all reference allocation paths detach non-owning records and their adapter FBOs first', () => {
  const { deletedFramebuffers, deletedTextures, gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FakeWebGL2Backend)
  const backend = new Backend({ gl })
  const cases = [
    ['texture-2d', 'external', () => backend.createTexture('texture-2d', {
      format: 'rgba16f', height: 4, width: 5,
    })],
    ['texture-3d', 'default', () => backend.createTexture3D('texture-3d', {
      depth: 2, format: 'rgba16f', height: 4, width: 5,
    })],
    ['texture-cube', 'external', () => backend.createCubeTexture('texture-cube', { size: 5 })],
  ]

  for (const [id, ownership, allocate] of cases) {
    const hostHandle = registerHostTexture(backend, id, ownership)
    backend.fbos.set(id, `adapter-fbo-${id}`)
    allocate()
    assert.ok(!deletedTextures.includes(hostHandle))
    assert.ok(deletedFramebuffers.includes(`adapter-fbo-${id}`))
    assert.equal(backend.getTextureOwnership(id), 'owned')
  }
})

test('backend destruction retries superclass failure without repeating successful adapter cleanup', async () => {
  const { deletedBuffers, deletedTextures, gl } = createTrackingGL()
  const Backend = createCablesWebGL2BackendClass(FailOnceDestroyBackend)
  const backend = new Backend({ gl })
  await backend.init()
  backend.createFullscreenVAO()
  registerHostTexture(backend, 'media_step_0', 'external')

  assert.throws(() => backend.destroy(), /base destroy failed/)
  assert.equal(backend.getTextureOwnership('media_step_0'), 'external')

  backend.destroy()
  backend.destroy()

  assert.equal(backend.baseDestroyCalls, 2)
  assert.deepEqual(deletedBuffers, ['buffer-1'])
  assert.equal(deletedTextures.filter((handle) => handle === 'reference-default').length, 1)
  assert.ok(!deletedTextures.includes('cgl-external-media_step_0'))
  assert.equal(backend.gl, null)
})

test('compileProgram preserves fragment compile errors and releases the compiled vertex shader', async () => {
  const { calls, gl } = createCompilerGL({ fragmentCompiles: false })
  const backend = new CablesWebGL2Backend({ gl })
  const originalConsoleError = console.error
  console.error = () => {}
  let failure
  try {
    await backend.compileProgram('broken-fragment', { source: 'void main() {}' })
  } catch (error) {
    failure = error
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(failure.code, 'ERR_SHADER_COMPILE')
  assert.equal(failure.detail, 'fragment failed')
  assert.equal(calls.filter((call) => call[0] === 'deleteShader').length, 2)
  assert.equal(calls.filter((call) => call[0] === 'createProgram').length, 0)
})

test('compileProgram preserves link errors and releases both shaders and the failed program', async () => {
  const { calls, gl } = createCompilerGL({ linkSucceeds: false })
  const backend = new CablesWebGL2Backend({ gl })
  let failure
  try {
    await backend.compileProgram('broken-link', { source: 'void main() {}' })
  } catch (error) {
    failure = error
  }

  assert.deepEqual(failure, {
    code: 'ERR_SHADER_LINK',
    detail: 'link failed',
    program: 'broken-link',
  })
  assert.equal(calls.filter((call) => call[0] === 'deleteShader').length, 2)
  assert.deepEqual(
    calls.filter((call) => call[0] === 'deleteProgram'),
    [['deleteProgram', 'compiled-program']],
  )
})

test('compileProgram keeps a successful reference-shaped program and releases only its shaders', async () => {
  const { calls, gl } = createCompilerGL()
  const backend = new CablesWebGL2Backend({ gl })

  const compiled = await backend.compileProgram('working', { source: 'void main() {}' })

  assert.equal(compiled.handle, 'compiled-program')
  assert.deepEqual(compiled.uniforms, {})
  assert.deepEqual(compiled.uniformBlocks, [])
  assert.deepEqual(compiled.attributes, {
    aPosition: 'attribute-aPosition',
    a_position: 'attribute-a_position',
  })
  assert.equal(backend.programs.get('working'), compiled)
  assert.equal(calls.filter((call) => call[0] === 'deleteShader').length, 2)
  assert.equal(calls.filter((call) => call[0] === 'deleteProgram').length, 0)
})

test('compileProgram releases every partial uniform-block buffer when later compilation fails', async () => {
  for (const options of [
    { attributeFailure: new Error('attribute lookup failed'), uniformBlockCount: 2 },
    { uniformBlockBindingFailureAt: 1, uniformBlockCount: 2 },
  ]) {
    const { calls, gl } = createCompilerGL(options)
    const backend = new CablesWebGL2Backend({ gl })

    await assert.rejects(
      backend.compileProgram('broken-ubo', {
        source: 'void main() {}',
        uniformLayout: { time: { components: 'x', slot: 0 } },
      }),
    )

    const created = calls.filter((call) => call[0] === 'createBuffer').map((call) => call[1])
    const deleted = calls.filter((call) => call[0] === 'deleteBuffer').map((call) => call[1])
    assert.deepEqual(deleted.sort(), created.sort())
  }
})

test('compileProgram still releases uniform-block buffers when failed-program deletion also throws', async () => {
  const primary = new Error('attribute lookup failed')
  const { calls, gl } = createCompilerGL({
    attributeFailure: primary,
    uniformBlockCount: 2,
  })
  const originalDeleteProgram = gl.deleteProgram
  gl.deleteProgram = (program) => {
    originalDeleteProgram(program)
    throw new Error('program deletion failed')
  }
  const backend = new CablesWebGL2Backend({ gl })

  await assert.rejects(
    backend.compileProgram('broken-cleanup', {
      source: 'void main() {}',
      uniformLayout: { time: { components: 'x', slot: 0 } },
    }),
    (error) => error === primary &&
      error.cleanupErrors?.some((failure) => failure.message === 'program deletion failed'),
  )

  const created = calls.filter((call) => call[0] === 'createBuffer').map((call) => call[1])
  const deleted = calls.filter((call) => call[0] === 'deleteBuffer').map((call) => call[1])
  assert.deepEqual(deleted.sort(), created.sort())
})

test('compileProgram merges inner uniform-buffer and outer program cleanup failures in order', async () => {
  const primary = new Error('uniform block binding failed')
  const innerCleanup = new Error('uniform buffer deletion failed')
  const outerCleanup = new Error('program deletion failed')
  const { calls, gl } = createCompilerGL({
    uniformBlockBindingFailure: primary,
    uniformBlockBindingFailureAt: 1,
    uniformBlockCount: 2,
  })
  const originalDeleteBuffer = gl.deleteBuffer
  gl.deleteBuffer = (buffer) => {
    if (buffer === 'buffer-1') {
      calls.push(['deleteBuffer', buffer])
      throw innerCleanup
    }
    originalDeleteBuffer(buffer)
  }
  const originalDeleteProgram = gl.deleteProgram
  gl.deleteProgram = (program) => {
    originalDeleteProgram(program)
    throw outerCleanup
  }
  const backend = new CablesWebGL2Backend({ gl })

  await assert.rejects(
    backend.compileProgram('broken-nested-cleanup', {
      source: 'void main() {}',
      uniformLayout: { time: { components: 'x', slot: 0 } },
    }),
    (error) => error === primary &&
      error.cleanupErrors?.length === 2 &&
      error.cleanupErrors[0] === innerCleanup &&
      error.cleanupErrors[1] === outerCleanup,
  )
})

test('backend destroy releases successful uniform-block buffers exactly once', async () => {
  const { calls, gl } = createCompilerGL({ uniformBlockCount: 2 })
  const backend = new CablesWebGL2Backend({ gl })
  await backend.compileProgram('working-ubo', {
    source: 'void main() {}',
    uniformLayout: { time: { components: 'x', slot: 0 } },
  })

  backend.destroy()
  backend.destroy()

  const created = calls.filter((call) => call[0] === 'createBuffer').map((call) => call[1])
  const deleted = calls.filter((call) => call[0] === 'deleteBuffer').map((call) => call[1])
  assert.deepEqual(deleted.sort(), created.sort())
})

test('backend destroy retries only uniform-block buffers whose deletion failed', async () => {
  const { calls, gl } = createCompilerGL({ uniformBlockCount: 2 })
  const originalDeleteBuffer = gl.deleteBuffer
  let failures = 1
  gl.deleteBuffer = (buffer) => {
    if (buffer === 'buffer-1' && failures > 0) {
      failures -= 1
      calls.push(['deleteBuffer', buffer])
      throw new Error('uniform buffer delete failed')
    }
    originalDeleteBuffer(buffer)
  }
  const backend = new CablesWebGL2Backend({ gl })
  await backend.compileProgram('retry-ubo', {
    source: 'void main() {}',
    uniformLayout: { time: { components: 'x', slot: 0 } },
  })

  assert.throws(
    () => backend.destroy(),
    (error) => error instanceof AggregateError && error.errors.length === 1,
  )
  backend.destroy()
  backend.destroy()

  const deletes = calls.filter((call) => call[0] === 'deleteBuffer')
  assert.equal(deletes.filter((call) => call[1] === 'buffer-1').length, 2)
  assert.equal(deletes.filter((call) => call[1] === 'buffer-2').length, 1)
})

test('output copier keeps one RGBA16F nearest/clamp CGL texture per size', () => {
  const { gl } = createTrackingGL()
  const allocations = []
  const destroyed = []
  const createTexture = (spec) => {
    allocations.push(spec)
    return { tex: `output-${allocations.length}` }
  }
  const copier = createOutputCopier({
    createTexture,
    destroyTexture: (texture) => destroyed.push(texture),
    gl,
  })

  const first = copier.resize(160, 90)
  const same = copier.resize(160, 90)
  const second = copier.resize(320, 180)

  assert.equal(first, same)
  assert.notEqual(first, second)
  assert.deepEqual(allocations, [
    {
      height: 90,
      magFilter: 'nearest',
      minFilter: 'nearest',
      pixelFormat: 'PFORMATSTR_RGBA16F',
      width: 160,
      wrapS: 'clamp-to-edge',
      wrapT: 'clamp-to-edge',
    },
    {
      height: 180,
      magFilter: 'nearest',
      minFilter: 'nearest',
      pixelFormat: 'PFORMATSTR_RGBA16F',
      width: 320,
      wrapS: 'clamp-to-edge',
      wrapT: 'clamp-to-edge',
    },
  ])
  assert.deepEqual(destroyed, [first])

  copier.dispose()
  copier.dispose()
  assert.deepEqual(destroyed, [first, second])
})

test('output resize preserves the last-good texture and retries failed retirement without leaks', () => {
  const { gl } = createTrackingGL()
  const allocations = []
  const destroyCalls = []
  let firstDestroyFailures = 1
  const copier = createOutputCopier({
    createTexture(spec) {
      const texture = { spec, tex: `output-${allocations.length + 1}` }
      allocations.push(texture)
      return texture
    },
    destroyTexture(texture) {
      destroyCalls.push(texture)
      if (texture === allocations[0] && firstDestroyFailures > 0) {
        firstDestroyFailures -= 1
        throw new Error('prior output destroy failed')
      }
    },
    gl,
  })

  const first = copier.resize(16, 9)
  assert.throws(() => copier.resize(32, 18), /prior output destroy failed/)
  assert.equal(copier.getTexture(), first)
  assert.deepEqual(destroyCalls, [first, allocations[1]])

  const replacement = copier.resize(32, 18)
  assert.equal(copier.getTexture(), replacement)
  assert.notEqual(replacement, allocations[1])
  assert.deepEqual(destroyCalls, [first, allocations[1], first])

  copier.dispose()
  assert.deepEqual(destroyCalls, [first, allocations[1], first, replacement])
})

test('output resize retains a failed replacement cleanup for a later successful resize retry', () => {
  const { gl } = createTrackingGL()
  const allocations = []
  const attempts = new Map()
  const copier = createOutputCopier({
    createTexture() {
      const texture = { tex: `output-${allocations.length + 1}` }
      allocations.push(texture)
      return texture
    },
    destroyTexture(texture) {
      const count = (attempts.get(texture) ?? 0) + 1
      attempts.set(texture, count)
      if ((texture === allocations[0] || texture === allocations[1]) && count === 1) {
        throw new Error(`delete ${texture.tex} failed`)
      }
    },
    gl,
  })

  const first = copier.resize(16, 9)
  assert.throws(
    () => copier.resize(32, 18),
    (error) => error instanceof AggregateError && error.errors.length === 2,
  )
  assert.equal(copier.getTexture(), first)

  const replacement = copier.resize(32, 18)
  assert.equal(copier.getTexture(), replacement)
  copier.dispose()
  assert.equal(attempts.get(first), 2)
  assert.equal(attempts.get(allocations[1]), 2)
  assert.equal(attempts.get(replacement), 1)
})

test('output copier blits exact matching RGBA16F texels between private FBOs', () => {
  const { calls, gl } = createTrackingGL()
  const output = { tex: 'cgl-output' }
  const copier = createOutputCopier({
    createTexture: () => output,
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.equal(copier.copy({
    format: 'rgba16f',
    glFormat: { internalFormat: gl.RGBA16F },
    handle: 'noisemaker-source',
    height: 9,
    width: 17,
  }), output)

  assert.ok(calls.some((call) => call[0] === 'framebufferTexture2D' &&
    call[1] === gl.READ_FRAMEBUFFER && call[4] === 'noisemaker-source'))
  assert.ok(calls.some((call) => call[0] === 'framebufferTexture2D' &&
    call[1] === gl.DRAW_FRAMEBUFFER && call[4] === 'cgl-output'))
  assert.deepEqual(calls.find((call) => call[0] === 'blitFramebuffer'), [
    'blitFramebuffer',
    0, 0, 17, 9,
    0, 0, 17, 9,
    gl.COLOR_BUFFER_BIT,
    gl.NEAREST,
  ])
})

test('output copier categorizes a null destination FBO without binding the default framebuffer', () => {
  const { calls, gl } = createTrackingGL({ createFramebufferResults: [null] })
  const copier = createOutputCopier({
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.throws(
    () => copier.copy({ format: 'rgba16f', handle: 'source', height: 9, width: 17 }),
    (error) => error instanceof OutputCopyError &&
      error.code === 'ERR_OUTPUT_FRAMEBUFFER_CREATE' &&
      error.role === 'destination',
  )
  assert.ok(!calls.some((call) => call[0] === 'bindFramebuffer' && call[2] === null))
  assert.equal(calls.filter((call) => call[0] === 'blitFramebuffer').length, 0)
})

test('output copier rejects an incomplete destination before blit or fallback drawing', () => {
  const fallbackCalls = []
  const { calls, gl } = createTrackingGL({ framebufferStatuses: [0x8cd6] })
  const copier = createOutputCopier({
    createFallback: () => ({
      copy(...args) { fallbackCalls.push(args) },
      dispose() {},
    }),
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.throws(
    () => copier.copy({ format: 'rgba16f', handle: 'source', height: 9, width: 17 }),
    (error) => error instanceof OutputCopyError &&
      error.code === 'ERR_OUTPUT_DESTINATION_FRAMEBUFFER_INCOMPLETE' &&
      error.status === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT,
  )
  assert.equal(calls.filter((call) => call[0] === 'blitFramebuffer').length, 0)
  assert.deepEqual(fallbackCalls, [])
  assert.ok(!calls.some((call) => call[0] === 'bindFramebuffer' && call[2] === null))
})

test('output copier uses texelFetch fallback when the exact-copy read FBO is incomplete', () => {
  const fallbackCalls = []
  const { calls, gl } = createTrackingGL({
    framebufferStatuses: [0x8cd5, 0x8cd6],
  })
  const output = { tex: 'cgl-output' }
  const source = { format: 'rgba16f', handle: 'source', height: 9, width: 17 }
  const copier = createOutputCopier({
    createFallback: () => ({
      copy(...args) { fallbackCalls.push(args) },
      dispose() {},
    }),
    createTexture: () => output,
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.equal(copier.copy(source), output)
  assert.equal(calls.filter((call) => call[0] === 'blitFramebuffer').length, 0)
  assert.deepEqual(fallbackCalls, [[source, output, 17, 9]])
})

test('output copier falls back when native blit throws or reports a GL error', () => {
  for (const options of [
    { blitFailure: new Error('native blit failed') },
    { blitError: 0x0502 },
  ]) {
    const fallbackCalls = []
    const { gl } = createTrackingGL(options)
    const output = { tex: 'cgl-output' }
    const source = { format: 'rgba16f', handle: 'source', height: 9, width: 17 }
    const copier = createOutputCopier({
      createFallback: () => ({
        copy(...args) { fallbackCalls.push(args) },
        dispose() {},
      }),
      createTexture: () => output,
      destroyTexture() {},
      gl,
    })
    copier.resize(17, 9)

    assert.equal(copier.copy(source), output)
    assert.deepEqual(fallbackCalls, [[source, output, 17, 9]])
  }
})

test('output copier propagates fallback failure instead of reporting stale success', () => {
  const fallbackFailure = new Error('fallback failed')
  const { gl } = createTrackingGL({ blitFailure: new Error('native blit failed') })
  const copier = createOutputCopier({
    createFallback: () => ({
      copy() { throw fallbackFailure },
      dispose() {},
    }),
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.throws(
    () => copier.copy({ format: 'rgba16f', handle: 'source', height: 9, width: 17 }),
    (error) => error === fallbackFailure,
  )
})

test('output copier categorizes a native GL error after fallback drawing', () => {
  const { gl } = createTrackingGL({ blitError: 0x0502 })
  const copier = createOutputCopier({
    createFallback: () => ({ copy() {}, dispose() {} }),
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(17, 9)

  assert.throws(
    () => copier.copy({ format: 'rgba8', handle: 'source', height: 9, width: 17 }),
    (error) => error instanceof OutputCopyError &&
      error.code === 'ERR_OUTPUT_FALLBACK_GL_ERROR' &&
      error.glError === gl.INVALID_OPERATION,
  )
})

test('output copier rejects scaling and falls back to integer texelFetch', () => {
  const { gl } = createTrackingGL()
  const fallbackCalls = []
  const fallback = {
    copy(source, destination, width, height) {
      fallbackCalls.push([source, destination, width, height])
    },
    dispose() {},
  }
  const output = { tex: 'cgl-output' }
  const copier = createOutputCopier({
    createFallback: () => fallback,
    createTexture: () => output,
    destroyTexture() {},
    gl,
  })
  copier.resize(12, 7)

  assert.throws(
    () => copier.copy({ format: 'rgba16f', handle: 'wrong-size', height: 6, width: 12 }),
    (error) => error instanceof OutputCopyError && error.code === 'ERR_OUTPUT_SIZE_MISMATCH',
  )

  const source = { format: 'rgba8', handle: 'rgba8-source', height: 7, width: 12 }
  assert.equal(copier.copy(source), output)
  assert.deepEqual(fallbackCalls, [[source, output, 12, 7]])
  assert.match(TEXEL_FETCH_FRAGMENT_SHADER, /texelFetch\s*\(/)
  assert.match(TEXEL_FETCH_FRAGMENT_SHADER, /ivec2\s*\(\s*gl_FragCoord\.xy\s*\)/)
  assert.doesNotMatch(TEXEL_FETCH_FRAGMENT_SHADER, /\btexture\s*\(/)
})

test('default output fallback compiles the dedicated texelFetch program and disposes it once', () => {
  const { calls, gl } = createFallbackGL()
  const copier = createOutputCopier({
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(12, 7)

  copier.copy({ format: 'rgba8', handle: 'rgba8-source', height: 7, width: 12 })

  const fragmentSource = calls.find((call) =>
    call[0] === 'shaderSource' && call[1].type === gl.FRAGMENT_SHADER)
  assert.equal(fragmentSource[2], TEXEL_FETCH_FRAGMENT_SHADER)
  assert.deepEqual(calls.find((call) => call[0] === 'drawArrays'), [
    'drawArrays', gl.TRIANGLES, 0, 3,
  ])

  copier.dispose()
  copier.dispose()
  assert.equal(calls.filter((call) => call[0] === 'deleteProgram').length, 1)
  assert.equal(calls.filter((call) => call[0] === 'deleteVertexArray').length, 1)
})

test('default output fallback cleans a compiled vertex shader when fragment compilation fails', () => {
  const { calls, gl } = createFallbackGL({ fragmentCompiles: false })
  const copier = createOutputCopier({
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture() {},
    gl,
  })
  copier.resize(12, 7)

  assert.throws(
    () => copier.copy({ format: 'rgba8', handle: 'rgba8-source', height: 7, width: 12 }),
    (error) => error instanceof OutputCopyError &&
      error.code === 'ERR_OUTPUT_COPY_SHADER_COMPILE',
  )
  assert.equal(calls.filter((call) => call[0] === 'deleteShader').length, 2)
})

test('output copier disposal retries only failed resources and rejects work after disposal starts', () => {
  const { calls, gl } = createTrackingGL({ blitFailure: new Error('native blit failed') })
  const originalDeleteFramebuffer = gl.deleteFramebuffer
  let drawFramebufferFailures = 1
  gl.deleteFramebuffer = (framebuffer) => {
    if (framebuffer === 'fbo-1' && drawFramebufferFailures > 0) {
      drawFramebufferFailures -= 1
      calls.push(['deleteFramebuffer', framebuffer])
      throw new Error('draw framebuffer delete failed')
    }
    originalDeleteFramebuffer(framebuffer)
  }
  const fallbackDisposeCalls = []
  const outputDestroyCalls = []
  let outputDestroyFailures = 1
  const copier = createOutputCopier({
    createFallback: () => ({
      copy() {},
      dispose() { fallbackDisposeCalls.push('dispose') },
    }),
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture(texture) {
      outputDestroyCalls.push(texture)
      if (outputDestroyFailures > 0) {
        outputDestroyFailures -= 1
        throw new Error('output texture delete failed')
      }
    },
    gl,
  })
  copier.resize(17, 9)
  copier.copy({ format: 'rgba16f', handle: 'source', height: 9, width: 17 })

  assert.throws(
    () => copier.dispose(),
    (error) => error instanceof AggregateError && error.errors.length === 2,
  )
  assert.throws(
    () => copier.copy({ format: 'rgba16f', handle: 'source', height: 9, width: 17 }),
    (error) => error instanceof OutputCopyError && error.code === 'ERR_OUTPUT_COPY_DISPOSED',
  )
  assert.throws(
    () => copier.resize(18, 10),
    (error) => error instanceof OutputCopyError && error.code === 'ERR_OUTPUT_COPY_DISPOSED',
  )

  copier.dispose()
  copier.dispose()

  assert.equal(fallbackDisposeCalls.length, 1)
  assert.deepEqual(
    calls.filter((call) => call[0] === 'deleteFramebuffer'),
    [
      ['deleteFramebuffer', 'fbo-2'],
      ['deleteFramebuffer', 'fbo-1'],
      ['deleteFramebuffer', 'fbo-1'],
    ],
  )
  assert.equal(outputDestroyCalls.length, 2)
})

test('production fallback disposal retries a failed program delete without repeating successes', () => {
  const { calls, gl } = createFallbackGL({ deleteProgramFailures: 1 })
  const outputDestroyCalls = []
  const copier = createOutputCopier({
    createTexture: () => ({ tex: 'cgl-output' }),
    destroyTexture: (texture) => outputDestroyCalls.push(texture),
    gl,
  })
  copier.resize(12, 7)
  copier.copy({ format: 'rgba8', handle: 'rgba8-source', height: 7, width: 12 })

  assert.throws(
    () => copier.dispose(),
    (error) => error instanceof AggregateError && error.errors.length === 1,
  )
  copier.dispose()
  copier.dispose()

  assert.equal(calls.filter((call) => call[0] === 'deleteVertexArray').length, 1)
  assert.equal(calls.filter((call) => call[0] === 'deleteProgram').length, 2)
  assert.equal(outputDestroyCalls.length, 1)
})
