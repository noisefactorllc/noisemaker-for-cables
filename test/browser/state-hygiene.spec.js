import { expect, test } from '@playwright/test'

import { attachArtifacts, expectCleanDiagnostics, loadHarness } from './spec-helpers.js'

const REQUIRED_PHASES = Object.freeze([
  'initialize',
  'compile',
  'thrown-compile',
  'reset',
  'render',
  'thrown-render',
  'second-reset',
  'guest-active-transform-feedback',
  'host-active-transform-feedback',
  'disposal',
])

test.describe.serial('Task 9 hostile host state hygiene', () => {
  test('compile, render, rejection, reset, and disposal restore exact WebGL2 state', async ({ page }, testInfo) => {
    test.setTimeout(300_000)
    expect(await loadHarness(page)).toBe('object')

    const report = await page.evaluate(() => window.task9Harness.runStateHygiene())
    await attachArtifacts(testInfo, report.results)
    expectCleanDiagnostics(report)

    expect(report.activeGuestTransformFeedback).toBe('preserved')
    expect(report.activeHostTransformFeedback).toBe('failed-closed')
    expect(report.neutralHostileOutputExact).toBe(true)
    expect(report.cglCacheConsumer).toEqual({
      cacheKeys: ['cgl.currentProgram', 'CGL.MESH.lastMesh'],
      exact: true,
      meshBindCount: 2,
      programBindCount: 2,
    })
    expect(report.hostileCoverage).toEqual({
      distinctReadDrawFramebuffers: true,
      drawFramebufferComplete: true,
      readFramebufferComplete: true,
      transformFeedbackIndexedSlots: [0, 2],
      uniformIndexedSlots: [0, 3],
    })
    expect(report.thrownCompileObserved).toBe(true)
    expect(report.phases.map(({ name }) => name)).toEqual(REQUIRED_PHASES)
    for (const phase of report.phases) {
      expect(phase.exact, `${phase.name}: exact state restoration`).toBe(true)
      expect(phase.differences, `${phase.name}: normalized state differences`).toEqual([])
    }
  })
})
