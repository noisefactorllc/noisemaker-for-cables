// Effect-orientation regression harness (page context).
//
// Mirrors upstream noisemaker's shaders/tests/test_effect_orientation.mjs
// against this repository's vendored core: effects show their input as
// authored — never mirrored or flipped — on either backend. Each case renders
// through the vendored CanvasRenderer on the presented canvas with the backend
// asserted in the page, and the spec compares the captured frame with the
// authored image. The same browser process serves both backends, so WebGL2 and
// WebGPU execute the exact published GLSL and WGSL of the vendored core.
//
// testPattern(pattern: uvMap) carries u in red and v in green, so red rises to
// the right and green rises to the top of the presented frame.

const BASE_PATH = '/vendor-cache'
const BUNDLE_PATH = '/vendor-cache/effects'
const FIXTURE_URL = '/test/browser/fixture.html'

async function createCanvasBackedRenderer(backend, size) {
  const { CanvasRenderer } = await import('/vendor-cache/noisemaker-shaders-core.esm.js')
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.id = 'orientation-canvas'
  const style = document.createElement('style')
  style.textContent = 'body{margin:0}canvas{display:block}'
  document.head.appendChild(style)
  document.body.appendChild(canvas)
  const renderer = new CanvasRenderer({
    canvas,
    width: size,
    height: size,
    basePath: BASE_PATH,
    bundlePath: BUNDLE_PATH,
    useBundles: true,
    preferWebGPU: backend === 'webgpu',
  })
  await renderer.loadManifest()
  await renderer.loadEffects(['synth/testPattern'])
  // Images for synth/media, uploaded as hosts upload media: top row first,
  // without flipping. 'uv' is a canvas copy of the uvMap; 'cube' is red
  // everywhere, green on its right half and blue on its top half.
  const canvasOf = (pixel) => {
    const mediaCanvas = document.createElement('canvas')
    mediaCanvas.width = size
    mediaCanvas.height = size
    const image = new ImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        image.data.set(pixel(x, y), (y * size + x) * 4)
      }
    }
    mediaCanvas.getContext('2d').putImageData(image, 0, 0)
    return mediaCanvas
  }
  const mediaCanvases = {
    cube: canvasOf((x, y) => [255, x < size / 2 ? 0 : 255, y < size / 2 ? 255 : 0, 255]),
    uv: canvasOf((x, y) => [
      Math.round(255 * (x + 0.5) / size),
      Math.round(255 * (1 - (y + 0.5) / size)),
      0,
      255,
    ]),
  }
  return { canvas, mediaCanvases, renderer }
}

export function createOrientationHarness() {
  let session = null

  return Object.freeze({
    async start(backend, size = 128) {
      if (session) throw new Error('orientation harness already started')
      session = await createCanvasBackedRenderer(backend, size)
    },

    // Compile the case's DSL, render it, upload media as hosts upload media,
    // and return the backend name that actually executed. The caller captures
    // the presented canvas and asserts the name matches the requested backend.
    async frame({ dsl, effects = [], frames = 2, media = 'uv' }) {
      if (!session) throw new Error('orientation harness not started')
      const { mediaCanvases, renderer } = session
      await renderer.loadEffects(effects)
      await renderer.dispose()
      await renderer.compile(dsl)
      renderer.stop()
      renderer.render(0)
      for (const pass of renderer.pipeline.graph.passes.filter((p) => p.effectFunc === 'media')) {
        renderer.updateTextureFromSource('imageTex_step_' + pass.stepIndex, mediaCanvases[media], { flipY: false })
      }
      for (let i = 0; i < frames; i++) renderer.render(0)
      await renderer.pipeline.backend.device?.queue.onSubmittedWorkDone()
      return renderer.pipeline.backend.getName().toLowerCase()
    },

    // Decode a PNG screenshot in the page (no Node PNG dependency) into a
    // top-down RGBA byte view of the presented frame.
    async decodePng(bytes) {
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')
      context.drawImage(bitmap, 0, 0)
      return context.getImageData(0, 0, bitmap.width, bitmap.height).data
    },

    async stop() {
      if (!session) return
      const { renderer } = session
      session = null
      await renderer.dispose().catch(() => {})
      document.getElementById('orientation-canvas')?.remove()
    },
  })
}
