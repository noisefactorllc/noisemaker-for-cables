import { expect } from '@playwright/test'

export async function loadHarness(page) {
  await page.goto('/test/browser/fixture.html')
  await page.evaluate(() => window.task9Harness.ready)
  return page.evaluate(() => typeof window.task9Harness)
}

export async function attachArtifacts(testInfo, results) {
  for (const result of results || []) {
    for (const [kind, dataUrl] of Object.entries(result.artifacts || {})) {
      const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl)
      if (!match) continue
      await testInfo.attach(`${result.id}-${kind}.png`, {
        body: Buffer.from(match[1], 'base64'),
        contentType: 'image/png',
      })
    }
  }
}

export function expectCleanDiagnostics(report) {
  expect(report.preflight.failures, 'preflight failures').toEqual([])
  expect(report.failures, 'aggregated browser failures').toEqual([])
}
