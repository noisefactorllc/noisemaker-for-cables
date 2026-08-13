import { WebGL2Backend } from '../../vendor-cache/noisemaker-shaders-core.esm.js'

const FULLSCREEN_TRIANGLE_POSITIONS = new Float32Array([
  -1, -1,
  3, -1,
  -1, 3,
])

const DEFAULT_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`

export const TEXTURE_OWNERSHIP = Object.freeze({
  DEFAULT: 'default',
  EXTERNAL: 'external',
  OWNED: 'owned',
})

export class BackendTextureError extends Error {
  constructor(code, message, textureId) {
    super(message)
    this.name = 'BackendTextureError'
    this.code = code
    if (textureId !== undefined) this.textureId = textureId
  }
}

function assertBackendBase(BaseBackend) {
  if (typeof BaseBackend !== 'function') {
    throw new TypeError('BaseBackend must be a WebGL2 backend constructor')
  }
}

function assertCGL(cgl) {
  if (!cgl || !cgl.gl) throw new TypeError('cgl.gl is required')
}

function assertExternalRecord(record) {
  if (!record || record.handle === undefined || record.handle === null) {
    throw new TypeError('external texture record.handle is required')
  }
  if (!Number.isFinite(record.width) || record.width <= 0 ||
      !Number.isFinite(record.height) || record.height <= 0) {
    throw new RangeError('external texture dimensions must be positive finite numbers')
  }
}

function normalizeExternalOwnership(ownership) {
  if (ownership === TEXTURE_OWNERSHIP.EXTERNAL || ownership === TEXTURE_OWNERSHIP.DEFAULT) {
    return ownership
  }
  throw new TypeError('external texture ownership must be external or default')
}

function throwWithCleanupFailures(primaryError, cleanupErrors, message) {
  if (cleanupErrors.length === 0) throw primaryError
  if (
    (typeof primaryError === 'object' && primaryError !== null) ||
    typeof primaryError === 'function'
  ) {
    try {
      const existingCleanupErrors = Array.isArray(primaryError.cleanupErrors)
        ? primaryError.cleanupErrors
        : []
      Object.defineProperty(primaryError, 'cleanupErrors', {
        configurable: true,
        value: Object.freeze([...existingCleanupErrors, ...cleanupErrors]),
      })
      throw primaryError
    } catch (error) {
      if (error === primaryError) throw error
    }
  }
  throw new AggregateError(cleanupErrors, message, { cause: primaryError })
}

export function createCablesWebGL2BackendClass(BaseBackend) {
  assertBackendBase(BaseBackend)

  return class CablesWebGL2BackendAdapter extends BaseBackend {
    constructor(cgl, canvas) {
      assertCGL(cgl)
      super(cgl.gl, canvas)
      this.cgl = cgl
      this.presentedTextureId = undefined
      this.textureOwnership = new Map()
      this.textureKinds = new Map()
      this._fullscreenBuffer = null
      this._uniformBlockBuffers = new Set()
      this._pendingTextureCleanup = new Set()
      this._defaultTextureReleased = false
      this._destroyed = false
    }

    async init(...args) {
      await super.init(...args)
      if (this.defaultTexture !== undefined && this.defaultTexture !== null) {
        this.defaultTextureOwnership = TEXTURE_OWNERSHIP.DEFAULT
      }
    }

    createTexture(id, spec) {
      this._detachNonOwningForMutation(id)
      const handle = super.createTexture(id, spec)
      this._markTextureOwned(id)
      return handle
    }

    createTexture3D(id, spec) {
      this._detachNonOwningForMutation(id)
      const handle = super.createTexture3D(id, spec)
      this._markTextureOwned(id)
      return handle
    }

    createCubeTexture(id, spec) {
      this._detachNonOwningForMutation(id)
      const handle = super.createCubeTexture(id, spec)
      this._markTextureOwned(id)
      return handle
    }

    uploadCubeFace(id, face, faceData) {
      const { height, width } = faceData || {}
      if (!Number.isInteger(width) || width <= 0 || width !== height) {
        throw new RangeError('cubemap face dimensions must be matching positive integers')
      }

      const existing = this.textures.get(id)
      const ownership = this.getTextureOwnership(id)
      const requiresOwnedCube = ownership === TEXTURE_OWNERSHIP.EXTERNAL ||
        ownership === TEXTURE_OWNERSHIP.DEFAULT ||
        !existing?.cube ||
        existing.width !== width ||
        existing.height !== height
      if (requiresOwnedCube) {
        if (existing) this.destroyTexture(id)
        this.createCubeTexture(id, { size: width })
      }

      const result = super.uploadCubeFace(id, face, faceData)
      this._markTextureOwned(id)
      return result
    }

    createFullscreenVAO() {
      const gl = this.gl
      const buffer = gl.createBuffer()
      this._fullscreenBuffer = buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE_POSITIONS, gl.STATIC_DRAW)
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      return vao
    }

    updateTextureFromSource(id, source, options = {}) {
      this._detachNonOwningForMutation(id)
      const dimensions = super.updateTextureFromSource(id, source, options)
      if (this.textures.has(id)) this._markTextureOwned(id)
      return dimensions
    }

    _uploadMeshTexture(id, ...args) {
      this._detachNonOwningForMutation(id)
      const result = super._uploadMeshTexture(id, ...args)
      if (this.textures.has(id)) this._markTextureOwned(id)
      return result
    }

    uploadDataTexture(id, ...args) {
      this._detachNonOwningForMutation(id)
      const result = super.uploadDataTexture(id, ...args)
      if (this.textures.has(id)) this._markTextureOwned(id)
      return result
    }

    _releaseUniformBlockBuffers(buffers) {
      const failures = []
      for (const buffer of new Set(buffers)) {
        if (!this._uniformBlockBuffers.has(buffer)) continue
        try {
          this.gl.deleteBuffer(buffer)
          this._uniformBlockBuffers.delete(buffer)
        } catch (error) {
          failures.push(error)
        }
      }
      return failures
    }

    extractUniformBlocks(program, spec) {
      const gl = this.gl
      const blocks = []
      const created = []
      try {
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS)
        if (!count || !spec.uniformLayout) return blocks
        const maxBlockSize = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)
        for (let index = 0; index < count; index += 1) {
          const name = gl.getActiveUniformBlockName(program, index)
          if (!name) continue
          const declaredSize = gl.getActiveUniformBlockParameter(
            program,
            index,
            gl.UNIFORM_BLOCK_DATA_SIZE,
          )
          const layoutSize = this.getPackedUniformLayoutSize(spec.uniformLayout)
          const size = Math.max(declaredSize, layoutSize)
          if (size > maxBlockSize) {
            throw {
              code: 'ERR_UNIFORM_BLOCK_TOO_LARGE',
              detail: `Uniform block ${name} requires ${size} bytes; device limit is ${maxBlockSize}`,
              program,
            }
          }
          const bindingPoint = blocks.length
          const buffer = gl.createBuffer()
          if (!buffer) throw new Error(`Unable to allocate uniform block ${name}`)
          created.push(buffer)
          this._uniformBlockBuffers.add(buffer)
          gl.bindBuffer(gl.UNIFORM_BUFFER, buffer)
          gl.bufferData(gl.UNIFORM_BUFFER, size, gl.DYNAMIC_DRAW)
          gl.bindBuffer(gl.UNIFORM_BUFFER, null)
          gl.uniformBlockBinding(program, index, bindingPoint)
          blocks.push({
            bindingPoint,
            buffer,
            index,
            layout: spec.uniformLayout,
            name,
            size,
          })
        }
        return blocks
      } catch (error) {
        throwWithCleanupFailures(
          error,
          this._releaseUniformBlockBuffers(created),
          'Uniform block cleanup failed after extraction failure',
        )
      }
    }

    async compileProgram(id, spec) {
      const gl = this.gl
      const rawSource = spec.source || spec.glsl || spec.fragment
      if (!rawSource) {
        throw new Error(
          `Shader source missing for program '${id}'. You may need to regenerate the shader manifest.`,
        )
      }
      const source = this.injectDefines(rawSource, spec.defines || {})
      const vertexSource = spec.vertex || DEFAULT_VERTEX_SHADER
      const usingDefaultVertex = !spec.vertex
      let vertexShader = null
      let fragmentShader = null
      let program = null
      let uniformBlocks = []
      let keepProgram = false

      try {
        vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource)
        fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, source)
        program = gl.createProgram()
        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        if (usingDefaultVertex) gl.bindAttribLocation(program, 0, 'a_position')
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw {
            code: 'ERR_SHADER_LINK',
            detail: gl.getProgramInfoLog(program),
            program: id,
          }
        }

        uniformBlocks = this.extractUniformBlocks(program, spec)
        const compiledProgram = {
          handle: program,
          uniforms: this.extractUniforms(program),
          uniformBlocks,
          attributes: {
            a_position: gl.getAttribLocation(program, 'a_position'),
            aPosition: gl.getAttribLocation(program, 'aPosition'),
          },
        }
        this.programs.set(id, compiledProgram)
        keepProgram = true
        return compiledProgram
      } catch (error) {
        const cleanupErrors = []
        if (program && !keepProgram) {
          try {
            gl.deleteProgram(program)
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError)
          }
        }
        cleanupErrors.push(...this._releaseUniformBlockBuffers(
          uniformBlocks.map((block) => block.buffer),
        ))
        throwWithCleanupFailures(
          error,
          cleanupErrors,
          'Uniform block cleanup failed after program compilation failure',
        )
      } finally {
        if (vertexShader) gl.deleteShader(vertexShader)
        if (fragmentShader) gl.deleteShader(fragmentShader)
      }
    }

    present(textureId) {
      this.presentedTextureId = textureId
    }

    getPresentedTextureInfo() {
      const id = this.presentedTextureId
      if (id === undefined || id === null) {
        throw new BackendTextureError(
          'ERR_MISSING_PRESENTED_TEXTURE_ID',
          'No texture has been presented',
        )
      }

      const record = this.textures.get(id)
      if (!record) {
        throw new BackendTextureError(
          'ERR_MISSING_PRESENTED_TEXTURE',
          `Presented texture ${id} is missing from the backend registry`,
          id,
        )
      }

      return {
        ...record,
        fbo: this.fbos.get(id),
        id,
        ownership: this.getTextureOwnership(id),
      }
    }

    getDefaultTextureInfo() {
      if (this.defaultTexture === undefined || this.defaultTexture === null) {
        throw new BackendTextureError(
          'ERR_MISSING_DEFAULT_TEXTURE',
          'The backend transparent default texture is unavailable',
        )
      }

      return {
        format: 'rgba8',
        glFormat: null,
        handle: this.defaultTexture,
        height: 1,
        ownership: TEXTURE_OWNERSHIP.DEFAULT,
        width: 1,
      }
    }

    getTextureOwnership(id) {
      if (this.textureOwnership.has(id)) return this.textureOwnership.get(id)
      if (this.textures.has(id)) return TEXTURE_OWNERSHIP.OWNED
      return undefined
    }

    getTextureKind(id) {
      return this.textureKinds.get(id)
    }

    _markTextureOwned(id) {
      this.textureOwnership.set(id, TEXTURE_OWNERSHIP.OWNED)
      this.textureKinds.delete(id)
    }

    _detachNonOwningForMutation(id) {
      const ownership = this.getTextureOwnership(id)
      if (ownership !== TEXTURE_OWNERSHIP.EXTERNAL &&
          ownership !== TEXTURE_OWNERSHIP.DEFAULT) return
      this._removeNonOwningRecord(id)
      this.textureOwnership.delete(id)
      this.textureKinds.delete(id)
    }

    registerExternalTexture(id, record, options = {}) {
      if (typeof id !== 'string' || id.length === 0) {
        throw new TypeError('external texture id must be a non-empty string')
      }
      assertExternalRecord(record)
      const ownership = normalizeExternalOwnership(
        options.ownership ?? TEXTURE_OWNERSHIP.EXTERNAL,
      )

      if (this.textures.has(id) || this.fbos.has(id)) {
        if (this.getTextureOwnership(id) === TEXTURE_OWNERSHIP.OWNED) {
          super.destroyTexture(id)
        } else {
          this._removeNonOwningRecord(id)
        }
      }

      this.textures.set(id, {
        format: record.format,
        glFormat: record.glFormat ?? null,
        handle: record.handle,
        height: record.height,
        width: record.width,
      })
      this.textureOwnership.set(id, ownership)
      if (options.kind === undefined) this.textureKinds.delete(id)
      else this.textureKinds.set(id, options.kind)
      return record.handle
    }

    destroyTexture(id) {
      try {
        const ownership = this.getTextureOwnership(id)
        if (ownership === TEXTURE_OWNERSHIP.EXTERNAL || ownership === TEXTURE_OWNERSHIP.DEFAULT) {
          this._removeNonOwningRecord(id)
        } else {
          super.destroyTexture(id)
        }
      } catch (error) {
        this._pendingTextureCleanup.add(id)
        throw error
      }
      this._pendingTextureCleanup.delete(id)
      this.textureOwnership.delete(id)
      this.textureKinds.delete(id)
    }

    _removeNonOwningRecord(id) {
      this.textures.delete(id)
      const directFbo = this.fbos.get(id)
      if (directFbo && this.gl) this.gl.deleteFramebuffer(directFbo)
      this.fbos.delete(id)

      for (const fboId of [...this.fbos.keys()]) {
        if (typeof fboId !== 'string' || !fboId.startsWith('mrt_') || !fboId.includes(id)) {
          continue
        }
        const fbo = this.fbos.get(fboId)
        if (fbo && this.gl) this.gl.deleteFramebuffer(fbo)
        this.fbos.delete(fboId)
      }
    }

    destroy(options = {}) {
      if (this._destroyed || !this.gl) return
      const gl = this.gl

      const adapterCleanupFailures = []

      for (const id of [...this._pendingTextureCleanup]) {
        try {
          this.destroyTexture(id)
        } catch (error) {
          adapterCleanupFailures.push(error)
        }
      }

      if (this._fullscreenBuffer) {
        try {
          gl.deleteBuffer(this._fullscreenBuffer)
          this._fullscreenBuffer = null
        } catch (error) {
          adapterCleanupFailures.push(error)
        }
      }

      if (!this._defaultTextureReleased && this.defaultTexture) {
        try {
          gl.deleteTexture(this.defaultTexture)
          this._defaultTextureReleased = true
          this.defaultTexture = null
        } catch (error) {
          adapterCleanupFailures.push(error)
        }
      }

      adapterCleanupFailures.push(...this._releaseUniformBlockBuffers(this._uniformBlockBuffers))
      if (adapterCleanupFailures.length > 0) {
        throw new AggregateError(adapterCleanupFailures, 'Cables backend cleanup failed')
      }

      super.destroy(options)
      this._pendingTextureCleanup.clear()
      this.textureOwnership.clear()
      this.textureKinds.clear()
      this.presentedTextureId = undefined
      this._destroyed = true
    }
  }
}

export const CablesWebGL2Backend = createCablesWebGL2BackendClass(WebGL2Backend)
