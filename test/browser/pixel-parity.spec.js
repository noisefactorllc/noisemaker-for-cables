import { expect, test } from '@playwright/test'

import { attachArtifacts, expectCleanDiagnostics, loadHarness } from './spec-helpers.js'

const channelCeilings = Object.freeze({
  'starter@0': 0,
  'named-subchain-and-outputs@0': 0,
  'feedback@0': 0,
  'feedback@1': 0,
  'feedback@12': 0,
  'media@0': 0,
  'points-agents@0': 0,
  'points-agents@1': 0,
  'points-agents@12': 0,
  'navier-stokes@0': 0,
  'navier-stokes@1': 0,
  'navier-stokes@12': 0,
  'reaction-diffusion@0': 0,
  'reaction-diffusion@1': 0,
  'reaction-diffusion@12': 0,
  'volume-cubemap@0': 0,
  'remap-ubo@0': 0,
  'mesh@0': 0,
  'artistic-chain@0': 0,
  'text-bitmap@0': 0,
  'audio-waveform@0': 0,
  'audio-spectrum@0': 0,
  'midi-grid@0': 0,
  'six-cubemap-faces@0': 0,
})

test.describe.serial('Task 9 deterministic pixel parity', () => {
  test('reference backend and Cables adapter agree after common float readback', async ({ page }, testInfo) => {
    test.setTimeout(600_000)
    expect(await loadHarness(page)).toBe('object')

    const report = await page.evaluate(async (allowedChannelCeilings) => (
      window.task9Harness.runRepresentativeParity({
        channelCeilings: allowedChannelCeilings,
      })
    ), channelCeilings)

    await attachArtifacts(testInfo, report.results)
    expectCleanDiagnostics(report)
    expect(report.results.map(({ id }) => id).sort()).toEqual(Object.keys(channelCeilings).sort())
    for (const result of report.results) {
      expect(result.finite, `${result.id}: finite float readback`).toBe(true)
      expect(result.copyExact, `${result.id}: adapter internal -> CGL output copy`).toBe(true)
      expect(
        result.mismatchedChannels,
        `${result.id}: native float channel mismatch ceiling`,
      ).toBeLessThanOrEqual(
        result.channelCeiling,
      )
    }
  })
})
