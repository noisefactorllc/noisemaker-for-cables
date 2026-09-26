// GAP-007 closure evidence: renders the three canvas-overlay effects (filter/fibers,
// filter/scratches, filter/strayHair) repeatedly through both the reference WebGL2Backend
// and the public CablesWebGL2Backend adapter, and records zero-mismatch repeated
// comparisons plus overlay-generation drain timings into evidence/gap-007-20260926/.
//
// Usage: PLAYWRIGHT_BROWSERS_PATH=/state/cache/ms-playwright node tools/overlay-settle-evidence.mjs
// Starts the dev server from test/browser/server.mjs on 127.0.0.1:4173.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const OUT_DIR = new URL('../evidence/gap-007-20260926/', import.meta.url)
const BASE_URL = 'http://127.0.0.1:4173/test/browser/fixture.html'
const WIDTH = 64
const HEIGHT = 48
const ADAPTER_RUNS = Number(process.env.OVERLAY_SETTLE_RUNS || 4)
const EFFECTS = ['filter/fibers', 'filter/scratches', 'filter/strayHair']

const pageEvaluate = async ({ effects, adapterRuns }) => {
  const WIDTH = 64
  const HEIGHT = 48
  const toPngBase64 = (readback) => {
    const canvas = document.createElement('canvas')
    canvas.width = readback.width
    canvas.height = readback.height
    const context = canvas.getContext('2d')
    const rgba = new Uint8ClampedArray(readback.data.length)
    for (let index = 0; index < readback.data.length; index += 1) {
      const value = readback.data[index]
      rgba[index] = Math.max(0, Math.min(255, Math.round(value * 255)))
    }
    context.putImageData(new ImageData(rgba, readback.width, readback.height), 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }
  const webgl = await import('/test/browser/harness/webgl.js')
  const { runSide } = await import('/test/browser/harness/pipeline.js')
  const { WebGL2Backend } = await import('/src/runtime/engine.js')

  // Instrument the base backend so every asyncInit overlay source upload is visible in
  // the evidence (per-run upload count and span prove the generation drained completely).
  window.__uploadLog = []
  const original = WebGL2Backend.prototype.updateTextureFromSource
  WebGL2Backend.prototype.updateTextureFromSource = function (id, source, options) {
    window.__uploadLog.push({ id, t: performance.now(), tag: window.__uploadTag })
    return original.call(this, id, source, options)
  }

  const manifest = await (await fetch('/vendor-cache/effects/manifest.json', { cache: 'no-store' })).json()
  const { createCatalogProgram } = await import('/parity/catalog-inputs.js')
  const cases = []
  for (const effectId of effects) {
    const module = await import(`/vendor-cache/effects/${effectId}.js`)
    const definition = typeof module.default === 'function'
      ? new module.default()
      : module.default
    cases.push({
      dsl: createCatalogProgram({ effectId, definition, metadata: manifest[effectId] }),
      height: HEIGHT,
      id: effectId,
      quietMs: 3000,
      width: WIDTH,
    })
  }

  const referenceContext = webgl.createHarnessContext(WIDTH, HEIGHT)
  const adapterContext = webgl.createHarnessContext(WIDTH, HEIGHT)
  const cases_ = []
  try {
    for (const caseDefinition of cases) {
      window.__uploadTag = `${caseDefinition.id}:reference:0`
      const reference = await runSide(caseDefinition, 'reference', referenceContext)
      const runs = []
      for (let run = 0; run < adapterRuns; run += 1) {
        window.__uploadTag = `${caseDefinition.id}:adapter:${run}`
        runs.push(await runSide(caseDefinition, 'adapter', adapterContext))
      }
      const referenceReadback = reference.captures.get(`${caseDefinition.id}@0`)
      const adapterReadbacks = runs.map(
        (side) => side.captures.get(`${caseDefinition.id}@0`),
      )
      const comparisons = []
      for (let run = 0; run < adapterReadbacks.length; run += 1) {
        const referenceComparison = webgl.compareReadbacks(
          `${caseDefinition.id}:reference-vs-adapter${run}`,
          referenceReadback,
          adapterReadbacks[run],
          0,
        )
        comparisons.push({
          id: `${caseDefinition.id}:reference-vs-adapter${run}`,
          effectId: caseDefinition.id,
          pair: `reference-vs-adapter${run}`,
          mismatchedChannels: referenceComparison.mismatchedChannels,
          maxChannelError: referenceComparison.maxChannelError,
          meanChannelError: referenceComparison.meanChannelError,
        })
        if (run > 0) {
          const repeatComparison = webgl.compareReadbacks(
            `${caseDefinition.id}:adapter${run - 1}-vs-adapter${run}`,
            adapterReadbacks[run - 1],
            adapterReadbacks[run],
            0,
          )
          comparisons.push({
            id: `${caseDefinition.id}:adapter${run - 1}-vs-adapter${run}`,
            effectId: caseDefinition.id,
            pair: `adapter${run - 1}-vs-adapter${run}`,
            mismatchedChannels: repeatComparison.mismatchedChannels,
            maxChannelError: repeatComparison.maxChannelError,
            meanChannelError: repeatComparison.meanChannelError,
          })
        }
      }
      cases_.push({
        adapterRuns,
        comparisons,
        id: caseDefinition.id,
        referencePng: toPngBase64(referenceReadback),
        adapterPngs: adapterReadbacks.map((readback) => toPngBase64(readback)),
        uploads: Object.fromEntries(
          Object.entries(
            window.__uploadLog.reduce((acc, { tag, t }) => {
              if (!acc[tag]) acc[tag] = []
              acc[tag].push(t)
              return acc
            }, {}),
          ).map(([tag, times]) => {
            const gaps = []
            for (let i = 1; i < times.length; i += 1) gaps.push(times[i] - times[i - 1])
            gaps.sort((a, b) => a - b)
            return [tag, {
              count: times.length,
              maxGapMs: Math.round(gaps[gaps.length - 1] || 0),
              spanMs: Math.round(times[times.length - 1] - times[0]),
            }]
          }),
        ),
      })
    }
  } finally {
    webgl.destroyHarnessContext(referenceContext)
    webgl.destroyHarnessContext(adapterContext)
  }
  return { cases: cases_ }
}

const server = spawn(process.execPath, ['test/browser/server.mjs'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'inherit',
})
try {
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 30_000
    const poll = async () => {
      try {
        const response = await fetch(BASE_URL)
        if (response.ok) return resolve()
      } catch {}
      if (Date.now() > deadline) return reject(new Error('dev server did not start'))
      setTimeout(poll, 250)
    }
    poll()
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(BASE_URL)
  await page.evaluate(() => window.task9Harness.ready)
  const { cases } = await page.evaluate(pageEvaluate, { adapterRuns: ADAPTER_RUNS, effects: EFFECTS })
  await browser.close()

  await mkdir(OUT_DIR, { recursive: true })
  const comparisons = cases.flatMap(({ comparisons }) => comparisons)
  const mismatched = comparisons.filter(({ mismatchedChannels }) => mismatchedChannels > 0)
  // Drain-sufficiency record: every adapter run must perform the same number of overlay
  // source uploads as the reference's completed generation before capture.
  const generation = cases.map(({ id, uploads }) => {
    const referenceUploadCount = uploads[`${id}:reference:0`].count
    const adapterUploadCounts = uploads && ADAPTER_RUNS
      ? Array.from({ length: ADAPTER_RUNS }, (_, run) => uploads[`${id}:adapter:${run}`].count)
      : []
    return {
      adapterUploadCounts,
      adapterUploadCountsMatchReference: adapterUploadCounts
        .every((count) => count === referenceUploadCount),
      id,
      referenceUploadCount,
    }
  })
  const report = {
    adapterRuns: ADAPTER_RUNS,
    cases: cases.map(({ adapterPngs, referencePng, ...jsonCase }) => jsonCase),
    checkpoint: { channelCeiling: 0, comparisonMethod: 'independent-reference-adapter-float-readback', height: HEIGHT, width: WIDTH },
    comparisons,
    effectCount: cases.length,
    generation,
    ok: mismatched.length === 0 && generation.every(({ adapterUploadCountsMatchReference }) => adapterUploadCountsMatchReference),
  }
  await writeFile(new URL('overlay-settle.json', OUT_DIR), `${JSON.stringify(report, null, 2)}\n`)
  for (const { adapterPngs, id, referencePng } of cases) {
    const stem = id.replaceAll('/', '-')
    await writeFile(new URL(`${stem}@0-reference.png`, OUT_DIR), Buffer.from(referencePng, 'base64'))
    for (const [run, adapterPng] of adapterPngs.entries()) {
      await writeFile(new URL(`${stem}@0-adapter-run${run}.png`, OUT_DIR), Buffer.from(adapterPng, 'base64'))
    }
  }
  console.log(JSON.stringify({ effectCount: cases.length, mismatchedComparisons: mismatched.length, ok: report.ok, totalComparisons: comparisons.length }))
  if (!report.ok) process.exitCode = 1
} finally {
  server.kill()
}
