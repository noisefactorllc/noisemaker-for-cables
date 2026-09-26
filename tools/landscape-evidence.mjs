// Renders the GAP-001 landscape filtering fixtures through both the reference
// WebGL2 backend and the public Cables adapter backend, compares the frames,
// and writes raw frame evidence (PNG + JSON) into evidence/gap-001-20260926/.
//
// Usage: node tools/landscape-evidence.mjs
// Starts the dev server from test/browser/server.mjs on 127.0.0.1:4173.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const OUT_DIR = new URL('../evidence/gap-001-20260926/', import.meta.url)
const BASE_URL = 'http://127.0.0.1:4173/test/browser/fixture.html'
const WIDTH = 64
const HEIGHT = 48

const CASES = [
  {
    id: 'landscape-voxel',
    dsl: `search synth, synth3d, render

noise(seed: 4, ridges: true)
  .write(o1)

solid(color: #2a9d8f, alpha: 1)
  .write(o2)

heightmap3d(heightTex: read(o1), tex: read(o2))
  .renderLandscape3d(filtering: voxel)
  .write(o0)

render(o0)`,
  },
  {
    id: 'landscape-isosurface',
    dsl: `search synth, synth3d, render

noise(seed: 4, ridges: true)
  .write(o1)

solid(color: #2a9d8f, alpha: 1)
  .write(o2)

heightmap3d(heightTex: read(o1), tex: read(o2))
  .renderLandscape3d(filtering: isosurface)
  .write(o0)

render(o0)`,
  },
]

function toPngBase64(readback) {
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

const pageEvaluate = async (cases) => {
  const webgl = await import('/test/browser/harness/webgl.js')
  const { runSide } = await import('/test/browser/harness/pipeline.js')

  const toPngBase64 = (readback) => {
    const canvas = document.createElement('canvas')
    canvas.width = readback.width
    canvas.height = readback.height
    const context = canvas.getContext('2d')
    const rgba = new Uint8ClampedArray(readback.data.length)
    for (let index = 0; index < readback.data.length; index += 1) {
      rgba[index] = Math.max(0, Math.min(255, Math.round(readback.data[index] * 255)))
    }
    context.putImageData(new ImageData(rgba, readback.width, readback.height), 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }

  const results = []
  for (const caseDefinition of cases) {
    const referenceContext = webgl.createHarnessContext(64, 48)
    const adapterContext = webgl.createHarnessContext(64, 48)
    try {
      const preflight = webgl.preflightWebGL2(adapterContext)
      const referencePreflight = webgl.preflightWebGL2(referenceContext)
      preflight.failures.push(...referencePreflight.failures.map((f) => `reference: ${f}`))
      if (preflight.failures.length > 0) throw new Error(`preflight: ${preflight.failures.join('; ')}`)

      const reference = await runSide(caseDefinition, 'reference', referenceContext)
      const adapter = await runSide(caseDefinition, 'adapter', adapterContext)

      const id = `${caseDefinition.id}@0`
      const referenceReadback = reference.captures.get(id)
      const adapterReadback = adapter.captures.get(id)
      const copiedReadback = adapter.copies.get(id)
      const comparison = webgl.compareReadbacks(id, referenceReadback, adapterReadback, 0)
      comparison.copyExact = webgl.exactReadbacks(adapterReadback, copiedReadback)
      comparison.finite = adapterReadback.finite
      comparison.referencePng = toPngBase64(referenceReadback)
      comparison.adapterPng = toPngBase64(adapterReadback)
      results.push(comparison)
    } finally {
      webgl.destroyHarnessContext(referenceContext)
      webgl.destroyHarnessContext(adapterContext)
    }
  }
  return results
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

  const results = await page.evaluate(pageEvaluate, CASES)
  await mkdir(OUT_DIR, { recursive: true })
  for (const result of results) {
    const summary = {
      copyExact: result.copyExact,
      finite: result.finite,
      firstDivergences: result.firstDivergences,
      height: result.height,
      id: result.id,
      maxChannelError: result.maxChannelError,
      meanChannelError: result.meanChannelError,
      mismatchedChannels: result.mismatchedChannels,
      width: result.width,
    }
    await writeFile(new URL(`${result.id}.json`, OUT_DIR), `${JSON.stringify(summary, null, 2)}\n`)
    await writeFile(new URL(`${result.id}-reference.png`, OUT_DIR), Buffer.from(result.referencePng, 'base64'))
    await writeFile(new URL(`${result.id}-adapter.png`, OUT_DIR), Buffer.from(result.adapterPng, 'base64'))
    console.log(JSON.stringify(summary))
  }
  await browser.close()
  const failures = results.filter((r) => r.mismatchedChannels !== 0 || !r.copyExact || !r.finite)
  if (failures.length > 0) {
    console.error('landscape evidence failures:', failures.map((r) => r.id))
    process.exitCode = 1
  }
} finally {
  server.kill()
}
