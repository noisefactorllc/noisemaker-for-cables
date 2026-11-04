import assert from 'node:assert/strict'
import { test } from 'node:test'

// Ported from upstream Noisemaker's
// shaders/tests/test_texture_upload_source_context.mjs (2cf5bad0, follow-up
// 71771987): uploading a canvas must not give that canvas a rendering
// context. The vendored core's WebGPU updateTextureFromSource now uploads
// willReadFrequently canvases only from a caller-passed 2D context, and a
// canvas without any context uploads as transparent black instead of being
// copied (which throws OperationError on a context-less canvas). Because the
// core is vendored, these tests exercise WebGPUBackend.updateTextureFromSource
// directly against mocked device and source classes instead of the upstream
// browser chain.

// The core evaluates UI classes that reference HTMLElement and registers
// custom elements at module load.
globalThis.HTMLElement ||= class {}
globalThis.customElements ||= { define() {}, get() {}, whenDefined() { return Promise.resolve() } }
globalThis.HTMLCanvasElement ||= class HTMLCanvasElement {}
globalThis.HTMLVideoElement ||= class HTMLVideoElement {}
globalThis.HTMLImageElement ||= class HTMLImageElement {}
globalThis.ImageBitmap ||= class ImageBitmap {}
globalThis.GPUTextureUsage ||= {
  TEXTURE_BINDING: 1,
  COPY_SRC: 2,
  COPY_DST: 4,
  RENDER_ATTACHMENT: 8,
}

const { WebGPUBackend } = await import('../vendor-cache/noisemaker-shaders-core.esm.js')

function makeBackend({ copyError = null } = {}) {
  const backend = Object.create(WebGPUBackend.prototype)
  backend.textures = new Map()
  const copyCalls = []
  const writeCalls = []
  backend.device = {
    queue: {
      copyExternalImageToTexture(spec) {
        copyCalls.push(spec)
        if (copyError) throw copyError
      },
      writeTexture(dest, data, layout, size) {
        writeCalls.push({ dest, data, layout, size })
      },
    },
    createTexture(spec) {
      return { spec, createView() { return {} }, destroy() {} }
    },
  }
  return { backend, copyCalls, writeCalls }
}

function makeCanvas(width, height) {
  const canvas = new HTMLCanvasElement()
  canvas.width = width
  canvas.height = height
  return canvas
}

function operationError(message) {
  const err = new Error(message)
  err.name = 'OperationError'
  return err
}

test('a canvas without a rendering context uploads as transparent black', () => {
  const canvas = makeCanvas(4, 4)
  let askedForContext = false
  canvas.getContext = () => {
    askedForContext = true
    return null
  }
  const { backend, copyCalls, writeCalls } = makeBackend({
    copyError: operationError('source canvas has no rendering context'),
  })

  const dimensions = backend.updateTextureFromSource('uploadProbe', canvas, { flipY: false })

  assert.deepEqual(dimensions, { width: 4, height: 4 })
  assert.equal(copyCalls.length, 1, 'the copy was attempted exactly once')
  assert.equal(writeCalls.length, 1, 'the failed copy fell back to a queue write')
  const write = writeCalls[0]
  assert.equal(write.data.length, 4 * 4 * 4, 'the fallback writes one byte per channel')
  assert.ok(
    Array.prototype.every.call(write.data, (v) => v === 0),
    'the fallback upload is transparent black',
  )
  assert.deepEqual(write.size, { width: 4, height: 4 })
  assert.equal(askedForContext, false, 'uploading never asked the canvas for a context')
})

test('a caller-passed willReadFrequently 2D context uploads its getImageData bytes', () => {
  const canvas = makeCanvas(2, 2)
  const pixels = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
  const context2d = {
    canvas,
    getContextAttributes() {
      return { willReadFrequently: true }
    },
    getImageData(x, y, w, h) {
      assert.deepEqual([x, y, w, h], [0, 0, 2, 2])
      return { data: pixels }
    },
  }
  const { backend, copyCalls, writeCalls } = makeBackend()

  backend.updateTextureFromSource('ctxProbe', canvas, { flipY: false, context2d })

  assert.equal(copyCalls.length, 0, 'the getImageData path skips copyExternalImageToTexture')
  assert.equal(writeCalls.length, 1)
  assert.deepEqual(Array.from(writeCalls[0].data), Array.from(pixels))
})

test('a caller-passed 2D context from another canvas is ignored', () => {
  const canvas = makeCanvas(2, 2)
  const other = makeCanvas(2, 2)
  const context2d = {
    canvas: other,
    getContextAttributes() {
      return { willReadFrequently: true }
    },
    getImageData() {
      throw new Error('getImageData must not run for a foreign context')
    },
  }
  const { backend, copyCalls, writeCalls } = makeBackend()

  backend.updateTextureFromSource('ctxProbe', canvas, { flipY: false, context2d })

  assert.equal(copyCalls.length, 1, 'the upload took the copyExternalImageToTexture path')
  assert.equal(writeCalls.length, 0)
})

test('a copy failure that is not an OperationError propagates', () => {
  const canvas = makeCanvas(2, 2)
  const { backend, writeCalls } = makeBackend({ copyError: new Error('device lost') })

  assert.throws(() => backend.updateTextureFromSource('errProbe', canvas, { flipY: false }), /device lost/)
  assert.equal(writeCalls.length, 0, 'the transparent-black fallback never ran')
})

test('an OperationError for a non-canvas source propagates', () => {
  const bitmap = new ImageBitmap()
  bitmap.width = 2
  bitmap.height = 2
  const { backend, writeCalls } = makeBackend({
    copyError: operationError('copy failed'),
  })

  assert.throws(() => backend.updateTextureFromSource('errProbe', bitmap, { flipY: false }))
  assert.equal(writeCalls.length, 0, 'the transparent-black fallback never ran')
})
