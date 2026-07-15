import { expect, test } from '@playwright/test'

import { attachArtifacts, expectCleanDiagnostics, loadHarness } from './spec-helpers.js'

test.describe.serial('Task 9 full catalog sorted sweep', () => {
  test('all 210 effects compile and link; executable effects render finite pixels and copy exactly', async ({ page }, testInfo) => {
    test.setTimeout(900_000)
    const report = {
      compiledCount: 0,
      effectCount: 0,
      effectNames: [],
      failures: [],
      preflight: { failures: [] },
      renderedCount: 0,
      results: [],
    }
    const batchSize = 40
    for (let start = 0; start < 210; start += batchSize) {
      expect(await loadHarness(page)).toBe('object')
      const batch = await page.evaluate(
        ({ end, start }) => window.task9Harness.runFullCatalog({ end, start }),
        { end: Math.min(210, start + batchSize), start },
      )
      report.effectCount = batch.effectCount
      report.effectNames = batch.effectNames
      report.failures.push(...batch.failures)
      report.preflight.failures.push(
        ...batch.preflight.failures.map((failure) => `batch ${start}-${batch.end}: ${failure}`),
      )
      report.compiledCount += batch.compiledCount
      report.renderedCount += batch.renderedCount
      report.results.push(...batch.results)
      await page.waitForTimeout(100)
    }
    await attachArtifacts(testInfo, report.results)
    expectCleanDiagnostics(report)

    expect(report.effectCount).toBe(210)
    expect(report.compiledCount).toBe(210)
    expect(report.renderedCount).toBe(209)
    expect(report.effectNames).toEqual([...report.effectNames].sort())
    expect(new Set(report.effectNames).size).toBe(210)
    for (const result of report.results) {
      expect(result.compiled, `${result.id}: compiled`).toBe(true)
      expect(result.linked, `${result.id}: linked`).toBe(true)
      if (!result.rendered) {
        expect(result).toMatchObject({
          classification: 'headless-swiftshader-execution-pathology',
          id: 'filter/octaveWarp',
          rendered: false,
        })
        continue
      }
      expect(result.finite, `${result.id}: finite float readback`).toBe(true)
      expect(result.copyExact, `${result.id}: adapter internal -> CGL output copy`).toBe(true)
    }
    expect(report.results.filter(({ rendered }) => !rendered)).toHaveLength(1)
  })
})
