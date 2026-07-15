export const OUTPUT_TEXTURE_SPEC = Object.freeze({
  magFilter: 'nearest',
  minFilter: 'nearest',
  pixelFormat: 'PFORMATSTR_RGBA16F',
  wrapS: 'clamp-to-edge',
  wrapT: 'clamp-to-edge',
})

const TEXEL_FETCH_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`

export const TEXEL_FETCH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_source;
out vec4 fragColor;

void main() {
  fragColor = texelFetch(u_source, ivec2(gl_FragCoord.xy), 0);
}
`

export class OutputCopyError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'OutputCopyError'
    this.code = code
    Object.assign(this, details)
  }
}

function assertFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} must be a function`)
}

function assertSize(width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError('output dimensions must be positive integers')
  }
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown shader compiler error'
    gl.deleteShader(shader)
    throw new OutputCopyError(
      'ERR_OUTPUT_COPY_SHADER_COMPILE',
      `Output copy shader compilation failed: ${log}`,
    )
  }
  return shader
}

function createTexelFetchFallback(gl) {
  let program = null
  let vao = null
  let sourceLocation = null
  let disposalStarted = false

  const initialize = () => {
    if (program) return
    let vertex = null
    let fragment = null
    try {
      vertex = compileShader(gl, gl.VERTEX_SHADER, TEXEL_FETCH_VERTEX_SHADER)
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, TEXEL_FETCH_FRAGMENT_SHADER)
      program = gl.createProgram()
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program) || 'unknown program linker error'
        gl.deleteProgram(program)
        program = null
        throw new OutputCopyError(
          'ERR_OUTPUT_COPY_PROGRAM_LINK',
          `Output copy program link failed: ${log}`,
        )
      }
      sourceLocation = gl.getUniformLocation(program, 'u_source')
      vao = gl.createVertexArray()
    } finally {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
    }
  }

  return {
    copy(source, _destination, width, height) {
      if (disposalStarted) {
        throw new OutputCopyError('ERR_OUTPUT_COPY_DISPOSED', 'Output copy fallback is disposed')
      }
      initialize()
      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, source.handle)
      gl.uniform1i(sourceLocation, 0)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      disposalStarted = true
      const failures = []
      if (vao) {
        try {
          gl.deleteVertexArray(vao)
          vao = null
        } catch (error) {
          failures.push(error)
        }
      }
      if (program) {
        try {
          gl.deleteProgram(program)
          program = null
        } catch (error) {
          failures.push(error)
        }
      }
      if (!vao && !program) sourceLocation = null
      if (failures.length > 0) {
        throw new AggregateError(failures, 'Output copy fallback disposal failed')
      }
    },
  }
}

function defaultCanBlit(gl, source) {
  return source.format === 'rgba16f' || source.glFormat?.internalFormat === gl.RGBA16F
}

export function createOutputCopier({
  canBlit,
  createFallback = createTexelFetchFallback,
  createTexture,
  destroyTexture,
  gl,
}) {
  if (!gl) throw new TypeError('gl is required')
  assertFunction(createTexture, 'createTexture')
  assertFunction(destroyTexture, 'destroyTexture')
  assertFunction(createFallback, 'createFallback')
  if (canBlit !== undefined) assertFunction(canBlit, 'canBlit')

  let outputTexture = null
  let outputWidth = 0
  let outputHeight = 0
  let readFramebuffer = null
  let drawFramebuffer = null
  let fallback = null
  const retiredTextures = new Set()
  let disposalStarted = false

  const ensureActive = () => {
    if (disposalStarted) {
      throw new OutputCopyError('ERR_OUTPUT_COPY_DISPOSED', 'Output copier is disposed')
    }
  }

  const retryRetiredTextures = () => {
    const failures = []
    for (const texture of [...retiredTextures]) {
      try {
        destroyTexture(texture)
        retiredTextures.delete(texture)
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Retired output texture cleanup failed')
    }
  }

  const ensureDrawFramebuffer = () => {
    if (drawFramebuffer) return drawFramebuffer
    const created = gl.createFramebuffer()
    if (!created) {
      throw new OutputCopyError(
        'ERR_OUTPUT_FRAMEBUFFER_CREATE',
        'Unable to create the output destination framebuffer',
        { role: 'destination' },
      )
    }
    drawFramebuffer = created
    return drawFramebuffer
  }

  const attachDestination = () => {
    const fbo = ensureDrawFramebuffer()
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(
      gl.DRAW_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      outputTexture.tex,
      0,
    )
    const status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new OutputCopyError(
        'ERR_OUTPUT_DESTINATION_FRAMEBUFFER_INCOMPLETE',
        `Output destination framebuffer is incomplete: ${status}`,
        { role: 'destination', status },
      )
    }
  }

  const prepareReadFramebuffer = (source) => {
    if (!readFramebuffer) {
      const created = gl.createFramebuffer()
      if (!created) return false
      readFramebuffer = created
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFramebuffer)
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      source.handle,
      0,
    )
    return gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  }

  const tryBlit = (source) => {
    if (!prepareReadFramebuffer(source)) return false
    try {
      gl.blitFramebuffer(
        0,
        0,
        outputWidth,
        outputHeight,
        0,
        0,
        outputWidth,
        outputHeight,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      )
    } catch {
      return false
    }
    if (typeof gl.getError !== 'function') return false
    return gl.getError() === gl.NO_ERROR
  }

  return {
    resize(width, height) {
      ensureActive()
      assertSize(width, height)
      retryRetiredTextures()
      if (outputTexture && outputWidth === width && outputHeight === height) {
        return outputTexture
      }

      const replacement = createTexture({
        ...OUTPUT_TEXTURE_SPEC,
        height,
        width,
      })
      if (!replacement || replacement.tex === undefined || replacement.tex === null) {
        const handleError = new OutputCopyError(
          'ERR_OUTPUT_TEXTURE_HANDLE',
          'CGL output texture factory must return an object with a .tex handle',
        )
        if (!replacement) throw handleError
        try {
          destroyTexture(replacement)
        } catch (cleanupError) {
          retiredTextures.add(replacement)
          throw new AggregateError(
            [handleError, cleanupError],
            'Invalid output texture cleanup failed',
          )
        }
        throw handleError
      }

      const previous = outputTexture
      if (previous) {
        try {
          destroyTexture(previous)
        } catch (retirementError) {
          try {
            destroyTexture(replacement)
          } catch (replacementError) {
            retiredTextures.add(replacement)
            throw new AggregateError(
              [retirementError, replacementError],
              'Output texture replacement failed',
            )
          }
          throw retirementError
        }
      }
      outputTexture = replacement
      outputWidth = width
      outputHeight = height
      return outputTexture
    },

    getTexture() {
      return outputTexture
    },

    copy(source) {
      ensureActive()
      if (!outputTexture) {
        throw new OutputCopyError(
          'ERR_OUTPUT_TEXTURE_UNALLOCATED',
          'Output texture must be allocated before copying',
        )
      }
      if (!source || source.handle === undefined || source.handle === null) {
        throw new OutputCopyError(
          'ERR_OUTPUT_SOURCE_TEXTURE',
          'Presented source texture handle is unavailable',
        )
      }
      if (source.width !== outputWidth || source.height !== outputHeight) {
        throw new OutputCopyError(
          'ERR_OUTPUT_SIZE_MISMATCH',
          `Exact output copy requires ${outputWidth}x${outputHeight}, got ` +
            `${source.width}x${source.height}`,
          {
            destinationHeight: outputHeight,
            destinationWidth: outputWidth,
            sourceHeight: source.height,
            sourceWidth: source.width,
          },
        )
      }

      const useBlit = typeof gl.blitFramebuffer === 'function' &&
        (canBlit ? canBlit(source, outputTexture) : defaultCanBlit(gl, source))
      attachDestination()

      if (!useBlit || !tryBlit(source)) {
        fallback ||= createFallback(gl)
        fallback.copy(source, outputTexture, outputWidth, outputHeight)
        if (typeof gl.getError === 'function') {
          const glError = gl.getError()
          if (glError !== gl.NO_ERROR) {
            throw new OutputCopyError(
              'ERR_OUTPUT_FALLBACK_GL_ERROR',
              `Output fallback reported WebGL error ${glError}`,
              { glError },
            )
          }
        }
      }

      return outputTexture
    },

    dispose() {
      disposalStarted = true
      const failures = []
      const attempt = (operation, release) => {
        try {
          operation()
          release()
        } catch (error) {
          failures.push(error)
        }
      }

      if (fallback) {
        attempt(() => fallback.dispose(), () => { fallback = null })
      }
      if (readFramebuffer) {
        const resource = readFramebuffer
        attempt(() => gl.deleteFramebuffer(resource), () => { readFramebuffer = null })
      }
      if (drawFramebuffer) {
        const resource = drawFramebuffer
        attempt(() => gl.deleteFramebuffer(resource), () => { drawFramebuffer = null })
      }
      for (const resource of [...retiredTextures]) {
        attempt(() => destroyTexture(resource), () => { retiredTextures.delete(resource) })
      }
      if (outputTexture) {
        const resource = outputTexture
        attempt(() => destroyTexture(resource), () => {
          outputTexture = null
          outputWidth = 0
          outputHeight = 0
        })
      }

      if (failures.length > 0) {
        throw new AggregateError(failures, 'Output copier disposal failed')
      }
    },
  }
}
