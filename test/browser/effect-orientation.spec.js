import { expect, test } from '@playwright/test'

// Effect-orientation regression coverage, ported from upstream noisemaker's
// shaders/tests/test_effect_orientation.mjs at the vendored checkpoint
// (700ac32e): effects show their input as authored — never mirrored or
// flipped — on either backend. The cases added upstream with the render3d
// camera-handedness, flipMirror vertical-mirror and glyphMap upright-glyph
// fixes are covered here against the vendored core, on both of its shader
// backends, with WebGPU required to match WebGL2 on the volume case.

const SIZE = 128
const UV_MAP = 'testPattern(pattern: uvMap)'

// Flip/mirror remaps of the authored image, rows top first: a mirror mode
// keeps the named half as authored and reflects it onto the other half —
// "up to down" keeps the top half (rows 0-63), "left to right" the left half.
const keep = (n) => n
const reverse = (n) => SIZE - 1 - n
const keepLow = (n) => (n < SIZE / 2 ? n : SIZE - 1 - n)
const keepHigh = (n) => (n >= SIZE / 2 ? n : SIZE - 1 - n)

const FLIP_MODES = [
  ['none', keep, keep], ['all', reverse, reverse], ['horizontal', reverse, keep], ['vertical', keep, reverse],
  ['mirrorLtoR', keepLow, keep], ['mirrorRtoL', keepHigh, keep], ['mirrorUtoD', keep, keepLow],
  ['mirrorDtoU', keep, keepHigh], ['mirrorLtoRUtoD', keepLow, keepLow], ['mirrorLtoRDtoU', keepLow, keepHigh],
  ['mirrorRtoLUtoD', keepHigh, keepLow], ['mirrorRtoLDtoU', keepHigh, keepHigh],
]

const FLIP_CASES = FLIP_MODES.flatMap(([mode, sx, sy]) => [
  ['synth/media', `search synth\nmedia(imageSize: [${SIZE}, ${SIZE}], flip: ${mode})`],
  ['filter/flipMirror', `search filter, synth\n${UV_MAP}.flipMirror(mode: ${mode})`],
].map(([effect, chain]) => ({
  dsl: `${chain}.write(o0)\nrender(o0)`,
  effects: [effect],
  expect: mode,
  name: `${effect} ${mode} keeps the named half`,
  sx,
  sy,
})))

// glyphMap draws each glyph from its bitmap, whose row 0 is the top row.
// With 32-pixel cells on the 128-pixel frame, each cell is one glyph:
// decoding the 5x7 grid at the centre of each glyph pixel must read the
// bitmap top row first. A dim grey input selects the period, which sits on
// row 5; a light grey input selects '@' or, for some cells, 'M'.
const GLYPH_CASES = [
  ['#181818', [['.....', '.....', '.....', '.....', '.....', '..#..', '.....']]],
  ['#e6e6e6', [['.###.', '#...#', '#.###', '#.#.#', '#.##.', '#....', '.###.'],
    ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '.....']]],
].map(([color, bitmaps]) => ({
  bitmaps,
  color,
  dsl: `search filter, synth\nsolid(color: ${color}).glyphMap(cellSize: 32, colorMode: mono).write(o0)\nrender(o0)`,
  effects: ['filter/glyphMap', 'synth/solid'],
  name: `filter/glyphMap draws its glyph upright (input ${color})`,
}))

// The volume renderers show a volume as authored. heightmap3d builds a full
// cube from a media image whose red is 255 everywhere (so render3d, which
// reads density from red, sees a solid cube), whose green is 255 on the
// image's right half and whose blue is 255 on its top half. Image right is
// +X and the image's top row is the far side, -Z. Seen from the front, the
// camera's default, the cube's right side is the green half.
const RENDER3D_CASE = {
  dsl: `search synth3d, render, synth
heightmap3d(heightTex: solid(color: #ffffff), tex: media(imageSize: [${SIZE}, ${SIZE}]), volumeSize: x64, heightScale: 1)
  .render3d().write(o0)
render(o0)`,
  effects: ['render/render3d', 'synth3d/heightmap3d', 'synth/solid', 'synth/media'],
  media: 'cube',
  name: 'render/render3d shows the volume as authored from the front',
}

function at(view, x, y) {
  const offset = (y * SIZE + x) * 4
  return [view[offset], view[offset + 1], view[offset + 2]]
}

function meanAbsDiff(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[i + c])
  }
  return sum / (SIZE * SIZE * 3)
}

// The authored image with its pixels taken from (sx(x), sy(y)), rows top first.
function remapped(view, sx, sy) {
  const out = new Uint8ClampedArray(view.length)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const from = (sy(y) * SIZE + sx(x)) * 4
      out.set(view.subarray(from, from + 4), (y * SIZE + x) * 4)
    }
  }
  return out
}

// Mean of f(red, green, blue) over the lit pixels in a band of the frame.
function litMean(view, x0, y0, x1, y1, f) {
  let sum = 0
  let lit = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const [r, g, b] = at(view, x, y)
      if (r + g + b < 24) continue
      sum += f(r, g, b)
      lit++
    }
  }
  expect(lit, `band ${x0},${y0}-${x1},${y1} must contain lit pixels`).toBeGreaterThan(16)
  return sum / lit
}

// Chrome's driver reports the certification readback's GPU stall as a
// performance warning; it is not a diagnostic failure.
const READBACK_PERF_WARNING = /^\[\.WebGL-[^\]]+\]GL Driver Message \(OpenGL, Performance, [^)]+\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/

test.describe.serial('effect orientation regression', () => {
  test('flipMirror, glyphMap and render3d show their input as authored on both backends', async ({ browser }, testInfo) => {
    test.setTimeout(900_000)
    const failures = []
    const webgl2Frames = new Map()

    for (const backend of ['webgl2', 'webgpu']) {
      const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (READBACK_PERF_WARNING.test(message.text())) return
        if (['error', 'warning'].includes(message.type())) errors.push(message.text())
      })
      try {
        await page.goto('/test/browser/fixture.html')
        await page.evaluate(([backendName, size]) => window.orientationHarness.start(backendName, size), [backend, SIZE])

        const capture = async (caseDefinition, label) => {
          const executed = await page.evaluate(
            (definition) => window.orientationHarness.frame(definition),
            {
              dsl: caseDefinition.dsl,
              effects: caseDefinition.effects || [],
              frames: caseDefinition.frames || 2,
              media: caseDefinition.media || 'uv',
            },
          )
          expect(executed, `${label}: requested backend must execute`).toBe(backend)
          const png = await page.locator('#orientation-canvas').screenshot()
          return page.evaluate((bytes) => window.orientationHarness.decodePng(bytes), new Uint8Array(png))
        }

        const authored = await capture({
          dsl: `search synth\n${UV_MAP}.write(o0)\nrender(o0)`,
        }, `${backend} uvMap reference`)

        for (const caseDefinition of FLIP_CASES) {
          const label = `${backend} ${caseDefinition.name}`
          try {
            const view = await capture(caseDefinition, label)
            const diff = meanAbsDiff(view, remapped(authored, caseDefinition.sx, caseDefinition.sy))
            expect(diff, `${label}: the frame must be the authored image under the named flip`).toBeLessThanOrEqual(2)
          } catch (error) {
            failures.push(`${label}: ${error.message}`)
          }
        }

        for (const caseDefinition of GLYPH_CASES) {
          const label = `${backend} ${caseDefinition.name}`
          try {
            const view = await capture(caseDefinition, label)
            for (let cy = 0; cy < 4; cy++) {
              for (let cx = 0; cx < 4; cx++) {
                const rows = Array.from({ length: 7 }, (_, r) => Array.from({ length: 5 }, (_, c) =>
                  at(view, Math.floor(cx * 32 + (c + 0.5) * 32 / 5), Math.floor(cy * 32 + (r + 0.5) * 32 / 7))[0] > 128 ? '#' : '.').join(''))
                expect(
                  caseDefinition.bitmaps.some((bitmap) => bitmap.every((row, r) => row === rows[r])),
                  `${label}: cell ${cx},${cy} must read the bitmap top row first (read ${rows.join(' ')})`,
                ).toBe(true)
              }
            }
          } catch (error) {
            failures.push(`${label}: ${error.message}`)
          }
        }

        {
          const label = `${backend} ${RENDER3D_CASE.name}`
          try {
            const view = await capture(RENDER3D_CASE, label)
            const greener = (r, g) => g - r
            const across = litMean(view, SIZE * 5 / 8, 0, SIZE, SIZE, greener)
              - litMean(view, 0, 0, SIZE * 3 / 8, SIZE, greener)
            expect(
              across,
              `${label}: image right must be screen right (green minus red, right minus left)`,
            ).toBeGreaterThan(32)
            if (backend === 'webgl2') {
              webgl2Frames.set(RENDER3D_CASE.name, view)
            } else {
              const diff = meanAbsDiff(view, webgl2Frames.get(RENDER3D_CASE.name))
              expect(diff, `${label}: WebGPU must match WebGL2`).toBeLessThanOrEqual(1)
            }
          } catch (error) {
            failures.push(`${label}: ${error.message}`)
          }
        }

        expect(errors, `${backend} console must be clean`).toEqual([])
      } finally {
        await page.evaluate(() => window.orientationHarness.stop()).catch(() => {})
        await page.close()
      }
    }

    await testInfo.attach('orientation-failures.txt', { body: failures.join('\n') || 'none' })
    expect(failures, 'orientation case failures').toEqual([])
  })
})
