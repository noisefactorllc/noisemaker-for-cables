import { runSide } from './pipeline.js'
import { createHarnessContext, destroyHarnessContext, exactReadbacks } from './webgl.js'

// The flow particles of the published demo, alone: no trail (intensity 0) and
// no input image, so each frame shows only where the particles are now and
// nothing downstream (blur, fluid, color) can change it.
const PARTICLES = `search synth, render, points

perlin(scale: 100, octaves: 2, dimensions: 3, seed: 48)
  .pointsEmit(stateSize: x64)
  .flow(behavior: chaotic, stride: 51, strideDeviation: 0.5, kink: 5.4)
  .pointsRender(density: 100, intensity: 0, inputIntensity: 0)
  .write(o0)

render(o0)`

const FRAMES = Object.freeze([30, 31, 60])

function litMask({ data, height, width }) {
  const mask = new Uint8Array(width * height)
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4
    mask[pixel] = data[offset] + data[offset + 1] + data[offset + 2] > 0.1 ? 1 : 0
  }
  return mask
}

function movement(before, after) {
  const first = litMask(before)
  const second = litMask(after)
  let lit = 0
  let left = 0
  for (let pixel = 0; pixel < first.length; pixel += 1) {
    if (!first[pixel]) continue
    lit += 1
    if (!second[pixel]) left += 1
  }
  return { lit, left, fraction: lit ? left / lit : 0 }
}

function motionReport(captures) {
  const frame = (index) => captures.get(`particle-motion@${index}`)
  return {
    nextFrame: movement(frame(30), frame(31)),
    laterFrame: movement(frame(30), frame(60)),
    sameFrameTwice: exactReadbacks(frame(30), frame(30)),
  }
}

export async function runParticleMotion() {
  const context = createHarnessContext()
  try {
    const caseDefinition = { id: 'particle-motion', dsl: PARTICLES, captureFrames: [...FRAMES] }
    const adapter = await runSide(caseDefinition, 'adapter', context)
    const reference = await runSide(caseDefinition, 'reference', context)
    return {
      adapter: motionReport(adapter.captures),
      reference: motionReport(reference.captures),
      matchesReference: FRAMES.map((index) => exactReadbacks(
        adapter.captures.get(`particle-motion@${index}`),
        reference.captures.get(`particle-motion@${index}`),
      )),
    }
  } finally {
    destroyHarnessContext(context)
  }
}
