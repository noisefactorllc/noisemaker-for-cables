import { expect, test } from '@playwright/test'

import { loadHarness } from './spec-helpers.js'

for (const mode of ['storage-direct', 'storage-named', 'zero-blend']) {
  test(`stable ${mode} output reaches the Cables texture`, async ({ page }) => {
    await loadHarness(page)
    const result = await page.evaluate(async (mode) => {
      const core = await import('/vendor-cache/noisemaker-shaders-core.esm.js')
      const { loadEngine } = await import('/src/runtime/engine.js')
      const { runAdapterCase } = await import('/test/browser/harness/pipeline.js')
      const { createHarnessContext, destroyHarnessContext } = await import('/test/browser/harness/webgl.js')
      await loadEngine()
      const name = 'stableOutputProbe'
      const named = mode === 'storage-named'
      const blend = mode === 'zero-blend'
      core.registerOp(`user.${name}`, { name, args: [] })
      core.registerStarterOps([`user.${name}`])
      core.registerEffect(`user.${name}`, new core.Effect({
        name, func: name,
        ...(named ? {
          textures: { work: { width: 8, height: 8, format: 'rgba8unorm' } },
          outputTex: 'work',
        } : {}),
        shaders: { fill: { glsl: `#version 300 es
          precision highp float;
          out vec4 fragColor;
          void main() { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }
        ` } },
        passes: [{
          name: 'fill', program: 'fill',
          ...(blend ? {
            outputs: { color: 'outputTex' }, blend: ['ZERO', 'ZERO'],
          } : {
            type: 'compute', storageTextures: { outputBuffer: named ? 'work' : 'outputTex' },
          }),
        }],
      }))
      const context = createHarnessContext(8, 8)
      try {
        const { captures, copies } = await runAdapterCase({
          id: mode, width: 8, height: 8,
          dsl: `search user, filter; ${name}()${blend ? '' : '.invert()'}.write(o0); render(o0)`,
        }, context)
        const capture = captures.get(`${mode}@0`)
        const copy = copies.get(`${mode}@0`)
        return {
          size: [capture.width, capture.height],
          pixels: [...capture.data],
          copiedPixels: [...copy.data],
          glError: context.gl.getError(),
          resources: context.resourceCounts(),
        }
      } finally {
        destroyHarnessContext(context, { loseContext: true })
      }
    }, mode)
    expect(result.size).toEqual([8, 8])
    const pixel = mode === 'zero-blend' ? [0, 0, 0, 0] : [0, 1, 1, 1]
    expect(result.pixels).toEqual(Array.from({ length: 64 }, () => pixel).flat())
    expect(result.copiedPixels).toEqual(result.pixels)
    expect(result.glError).toBe(0)
    expect(Object.values(result.resources).every(count => count === 0)).toBe(true)
  })
}
