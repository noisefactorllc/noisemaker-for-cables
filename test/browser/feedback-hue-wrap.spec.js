import { expect, test } from '@playwright/test'

// Regression render for filter/feedback's hue wrap, ported from upstream
// noisemaker's 8395d1da fix: hsv2rgb's last sector must take every hue from
// 5/6 up, 1.0 included. fract() returns 1.0 for a hue just below a whole
// number, so a small negative hueRotation on saturated red lands there; the
// pre-fix GLSL left that sector out and rendered black. The frame must stay
// red on every frame at each probed shift.
//
// The renders below run in Chromium, whose ANGLE and Dawn keep hsv2rgb's
// fract() calls apart, so they cannot show the old defect directly. They pin
// the fixed behaviour on this exact vendored source: the colour of hue 1.0 is
// the colour of hue 0.0.

const SIZE = 16
const RED = [255, 0, 0]

const CASES = [
  { hueRotation: -0.0001, frames: 1 },
  { hueRotation: -0.0001, frames: 4 },
  { hueRotation: -0.0001, frames: 12 },
  { hueRotation: -0.00005, frames: 2 },
  { hueRotation: -0.00005, frames: 12 },
]

const DSL = (hueRotation) =>
  `search synth, filter\nsolid(color: #ff0000).feedback(mix: 50, hueRotation: ${hueRotation}).write(o0)\nrender(o0)`

test.describe.serial('feedback hue-wrap regression', () => {
  for (const { hueRotation, frames } of CASES) {
    test(`saturated red at hueRotation ${hueRotation}, frame ${frames}, renders red`, async ({ page }) => {
      test.setTimeout(60_000)
      await page.setViewportSize({ width: SIZE, height: SIZE })
      await page.goto('/test/browser/fixture.html')
      await page.evaluate(([size, dsl, frame]) =>
        window.orientationHarness.start('webgl2', size).then(() =>
          window.orientationHarness.frame({
            dsl,
            effects: ['synth/solid', 'filter/feedback'],
            frames: frame,
          }),
        ), [SIZE, DSL(hueRotation), frames])

      const png = await page.locator('#orientation-canvas').screenshot()
      const view = await page.evaluate((bytes) => window.orientationHarness.decodePng(bytes), new Uint8Array(png))

      expect(view.length, '16x16 RGBA readback').toBe(SIZE * SIZE * 4)
      let offRed = 0
      for (let i = 0; i < view.length; i += 4) {
        const [r, g, b] = [view[i], view[i + 1], view[i + 2]]
        // Red-dominant with the red at least half the saturated channel: a
        // wrapped-away hue collapses this to black.
        if (r < RED[0] / 2 || g > 40 || b > 40) offRed++
      }
      expect(offRed, `every pixel must stay red at hueRotation ${hueRotation}, frame ${frames}`).toBe(0)
    })
  }
})
