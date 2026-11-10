import { expect, test } from '@playwright/test'

import { loadHarness } from './spec-helpers.js'

// Particle state must advance from frame to frame through the Cables backend,
// as it does through the reference backend. The program renders the particles
// alone, so a change between frames is particle motion, not a downstream effect.
test('flow particles move between frames through the Cables backend', async ({ page }) => {
  test.setTimeout(120_000)
  expect(await loadHarness(page)).toBe('object')
  const report = await page.evaluate(() => window.task9Harness.runParticleMotion())

  for (const side of ['adapter', 'reference']) {
    const { laterFrame, nextFrame } = report[side]
    expect(nextFrame.lit, `${side}: particles are drawn`).toBeGreaterThan(0)
    expect(nextFrame.left, `${side}: some particles move in one frame`).toBeGreaterThan(0)
    expect(laterFrame.fraction, `${side}: many particles move in thirty frames`).toBeGreaterThan(0.2)
  }
  expect(report.matchesReference, 'each frame matches the reference backend').toEqual([true, true, true])
})
