import { runFullCatalog, runRepresentativeParity } from './harness/pipeline.js'
import { runStateHygiene } from './harness/state-hygiene.js'
import {
  createHarnessContext,
  destroyHarnessContext,
  preflightWebGL2,
} from './harness/webgl.js'

function preflight() {
  const context = createHarnessContext()
  try {
    return preflightWebGL2(context)
  } finally {
    destroyHarnessContext(context)
  }
}

window.task9Harness = Object.freeze({
  preflight,
  ready: Promise.resolve(),
  runFullCatalog,
  runRepresentativeParity,
  runStateHygiene,
})
