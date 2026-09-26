import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { attachArtifacts, expectCleanDiagnostics, loadHarness } from './spec-helpers.js'

const coverageMatrix = JSON.parse(readFileSync(
  fileURLToPath(new URL('../../parity/coverage-matrix.json', import.meta.url)),
  'utf8',
))

test.describe.serial('Task 9 full catalog sorted sweep', () => {
  test('all 210 effects compile and link; executable effects render finite pixels that match the independent reference and copy exactly', async ({ page }, testInfo) => {
    test.setTimeout(1_800_000)
    const report = {
      comparedCount: 0,
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
      report.comparedCount += batch.comparedCount
      report.results.push(...batch.results)
      await page.waitForTimeout(100)
    }
    await attachArtifacts(testInfo, report.results)
    expectCleanDiagnostics(report)

    expect(report.effectCount).toBe(coverageMatrix.denominator.catalogEffects)
    expect(report.compiledCount).toBe(coverageMatrix.denominator.catalogEffects)
    expect(report.renderedCount).toBe(coverageMatrix.denominator.renderedAndCompared)
    expect(report.comparedCount).toBe(coverageMatrix.denominator.renderedAndCompared)
    expect(report.effectNames).toEqual([...report.effectNames].sort())
    expect(new Set(report.effectNames).size).toBe(coverageMatrix.denominator.catalogEffects)
    for (const result of report.results) {
      expect(result.compiled, `${result.id}: compiled`).toBe(true)
      expect(result.linked, `${result.id}: linked`).toBe(true)
      if (!result.rendered) {
        const { reason, ...expected } = coverageMatrix.denominator.compileOnly.find(
          ({ id }) => id === result.id,
        )
        expect(result).toMatchObject(expected)
        continue
      }
      expect(result.comparisonMethod).toBe(coverageMatrix.checkpoint.comparisonMethod)
      expect(result.channelCeiling).toBe(coverageMatrix.checkpoint.channelCeiling)
      expect(result.comparedChannels).toBe(
        coverageMatrix.checkpoint.frameSize.width *
        coverageMatrix.checkpoint.frameSize.height * 4,
      )
      expect(result.finite, `${result.id}: finite float readback`).toBe(true)
      expect(result.copyExact, `${result.id}: adapter internal -> CGL output copy`).toBe(true)
      if (result.classification !== undefined) {
        expect(
          coverageMatrix.denominator.nondeterministicOverlay.map(({ id }) => id),
          `${result.id}: unexpected classification`,
        ).toContain(result.id)
        expect(result.classification).toBe('nondeterministic-canvas-overlay-generation')
      } else {
        expect(
          result.mismatchedChannels,
          `${result.id}: reference vs adapter float channel mismatch ceiling`,
        ).toBe(result.channelCeiling)
      }
    }
    const mismatching = report.results.filter(
      ({ rendered, mismatchedChannels }) => rendered && mismatchedChannels > 0,
    )
    const classifiedIds = coverageMatrix.denominator.nondeterministicOverlay.map(({ id }) => id)
    for (const { id } of mismatching) {
      expect(classifiedIds, `${id}: mismatch without nondeterministic classification`).toContain(id)
    }
    const unrendered = report.results.filter(({ rendered }) => !rendered)
    expect(unrendered.map(({ id }) => id)).toEqual(
      coverageMatrix.denominator.compileOnly.map(({ id }) => id),
    )
  })
})
