import { expect, test } from '@playwright/test'

// Ported from upstream noisemaker's shaders/tests/test_rejected_shader_recompile.mjs
// ("FIX: keep the running program when a recompiled shader is rejected",
// vendored at Build b631fc2c), WebGL2 backend: a hot recompile whose shader
// the backend rejects keeps the accepted program running. The renderer
// compiles a candidate graph's programs before the graph becomes current, so
// a rejected compile leaves the accepted graph, its programs and its surfaces
// in place: the graph and currentDsl still describe the accepted program,
// later frames keep rendering it with no error, and a later valid compile
// succeeds.
//
// The upstream test also runs the WebGPU backend; this port's browser harness
// covers WebGL2 rendering, matching its other specs.

const SIZE = 64
const ACCEPTED = 'search synth\nsolid(color: #ff0000).write(o0)\nrender(o0)'
const REJECTED = 'search synth, filter\nsolid(color: #0000ff).tint().write(o0)\nrender(o0)'
const LATER = 'search synth\nsolid(color: #0000ff).write(o0)\nrender(o0)'
// Step 1 is the tint step; its colorize program does not compile.
const INVALID_TINT = { 1: { colorize: { glsl: '#version 300 es\nthis is invalid', wgsl: 'this is invalid' } } }

const isRed = ([r, g, b]) => r > 200 && g < 40 && b < 40
const isBlue = ([r, g, b]) => r < 40 && g < 40 && b > 200

async function installRenderer(page) {
  await page.goto('/test/browser/fixture.html')
  await page.evaluate(async () => {
    const { CanvasRenderer } = await import('/vendor-cache/noisemaker-shaders-core.esm.js')
    const canvas = document.createElement('canvas')
    canvas.id = 'canvas'
    canvas.width = 64
    canvas.height = 64
    canvas.style.cssText = 'display:block;width:64px;height:64px;background:black;'
    document.body.appendChild(canvas)

    window.renderErrors = []
    const renderer = new CanvasRenderer({
      canvas,
      width: 64,
      height: 64,
      basePath: '/vendor-cache',
      bundlePath: '/vendor-cache/effects',
      useBundles: true,
      preferWebGPU: false,
      onError: (error) => window.renderErrors.push(error?.code ?? String(error)),
    })
    await renderer.loadManifest()
    await renderer.loadEffects(['synth/solid', 'filter/tint'])
    renderer.stop()

    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    window.backendName = () => renderer.pipeline?.backend?.getName?.() || 'unknown'
    window.state = () => ({
      effectKeys: renderer.pipeline?.graph?.passes?.map((pass) => pass.effectKey ?? null) ?? null,
      currentDsl: renderer.currentDsl,
      frameCount: renderer.frameCount,
      errors: [...window.renderErrors],
    })
    window.compileDsl = async (dsl, shaderOverrides) => {
      try {
        await renderer.compile(dsl, shaderOverrides ? { shaderOverrides } : {})
        return { ok: true, backend: window.backendName() }
      } catch (error) {
        return { ok: false, code: error?.code ?? String(error) }
      }
    }
    // The drawing buffer survives until the next composite, so reading the
    // centre pixel through a 2D canvas right after a synchronous render()
    // captures the frame the renderer just presented.
    window.renderFrames = async (count) => {
      for (let i = 0; i < count; i++) {
        renderer.render(i / 60)
        await frame()
      }
    }
    window.renderAndReadCentre = () => {
      renderer.render(0)
      const scratch = document.createElement('canvas')
      scratch.width = 64
      scratch.height = 64
      const ctx = scratch.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(canvas, 0, 0)
      const pixel = ctx.getImageData(31, 31, 1, 1).data
      return [pixel[0], pixel[1], pixel[2]]
    }
  })
  await page.waitForFunction(() => typeof window.compileDsl === 'function')
}

async function centreAfterFrames(page, count) {
  await page.evaluate((frames) => window.renderFrames(frames), count)
  return page.evaluate(() => window.renderAndReadCentre())
}

test('a rejected shader keeps the accepted program rendering (WebGL2)', async ({ page }) => {
  test.setTimeout(120_000)
  await installRenderer(page)

  const accepted = await page.evaluate((dsl) => window.compileDsl(dsl), ACCEPTED)
  expect(accepted, 'program A compiles on WebGL2').toEqual({ ok: true, backend: 'WebGL2' })
  await page.evaluate(() => window.renderFrames(3))
  const before = await page.evaluate(() => window.state())
  expect(isRed(await centreAfterFrames(page, 0)), 'program A renders red').toBe(true)

  const rejected = await page.evaluate(
    ([dsl, overrides]) => window.compileDsl(dsl, overrides),
    [REJECTED, INVALID_TINT],
  )
  expect(rejected, 'the invalid tint shader is rejected').toEqual({ ok: false, code: 'ERR_SHADER_COMPILE' })

  const afterRejection = await page.evaluate(() => window.state())
  expect(afterRejection.effectKeys, 'the graph still describes program A').toEqual(before.effectKeys)
  expect(afterRejection.currentDsl, 'currentDsl still names program A').toBe(ACCEPTED)

  await page.evaluate(() => window.renderFrames(5))
  const rendered = await page.evaluate(() => window.state())
  const stillRed = await centreAfterFrames(page, 0)
  expect(rendered.frameCount, 'later frames advance the frame counter').toBe(afterRejection.frameCount + 5)
  expect(rendered.errors, 'later frames report no error').toEqual([])
  expect(isRed(stillRed), 'the canvas still shows program A').toBe(true)

  const later = await page.evaluate((dsl) => window.compileDsl(dsl), LATER)
  expect(later, 'a later valid compile succeeds').toEqual({ ok: true, backend: 'WebGL2' })
  await page.evaluate(() => window.renderFrames(3))
  const final = await page.evaluate(() => window.state())
  expect(final.currentDsl).toBe(LATER)
  expect(final.errors, 'the later program renders with no error').toEqual([])
  expect(isBlue(await centreAfterFrames(page, 0)), 'the later program renders blue').toBe(true)
})
