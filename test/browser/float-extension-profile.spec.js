import { expect, test } from '@playwright/test'

import { expectCleanDiagnostics, loadHarness } from './spec-helpers.js'

// iOS Safari's WebGL2 offers neither OES_texture_float_linear nor EXT_float_blend.
// With both hidden, Chromium enforces the same limits: a 32-bit float texture is
// not filterable through LINEAR and a 32-bit float target cannot blend. Every
// effect must still render and match its independent reference exactly.
const HIDDEN = ['OES_texture_float_linear', 'EXT_float_blend']

test('every effect renders and matches its reference without OES_texture_float_linear and EXT_float_blend', async ({ page }) => {
  test.setTimeout(1_800_000)
  await page.addInitScript((hidden) => {
    const prototype = WebGL2RenderingContext.prototype
    const getExtension = prototype.getExtension
    const getSupportedExtensions = prototype.getSupportedExtensions
    prototype.getExtension = function (name) {
      return hidden.includes(name) ? null : getExtension.call(this, name)
    }
    prototype.getSupportedExtensions = function () {
      return (getSupportedExtensions.call(this) ?? []).filter((name) => !hidden.includes(name))
    }
  }, HIDDEN)

  const report = { failures: [], preflight: { failures: [] }, results: [] }
  for (let start = 0; start < 210; start += 40) {
    expect(await loadHarness(page)).toBe('object')
    const batch = await page.evaluate(
      ({ end, start }) => window.task9Harness.runFullCatalog({ end, start }),
      { end: Math.min(210, start + 40), start },
    )
    report.failures.push(...batch.failures)
    report.preflight.failures.push(...batch.preflight.failures)
    for (const { artifacts: _artifacts, ...result } of batch.results) report.results.push(result)
  }

  const offered = await page.evaluate(() =>
    document.createElement('canvas').getContext('webgl2').getSupportedExtensions())
  for (const name of HIDDEN) expect(offered).not.toContain(name)
  expectCleanDiagnostics(report)
  expect(report.results).toHaveLength(210)
  const unmatched = report.results
    .filter((result) => !(
      result.rendered && result.compared && result.finite &&
      result.copyExact && result.mismatchedChannels === 0
    ))
    .map((result) => result.id)
  expect(unmatched).toEqual([])
})
