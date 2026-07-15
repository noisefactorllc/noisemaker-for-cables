import { createProgramController } from './controller/program-controller.js'
import { installProgramOp as installProgramOpSource } from './op/install-program-op.js'
import { inspectCapabilities } from './runtime/capabilities.js'
import { catalogInfo, loadEngine } from './runtime/engine.js'

export const packageVersion = '0.1.0'
export const effectMetadata = catalogInfo

export * from './runtime/engine.js'

function installProgramOp(op, env = {}) {
  return installProgramOpSource(op, {
    ...env,
    capabilityInspector: env.capabilityInspector ??
      env.facade?.inspectCapabilities ??
      inspectCapabilities,
    createProgramController: env.createProgramController ??
      env.facade?.createProgramController ??
      createProgramController,
    engineLoader: env.engineLoader ?? env.facade?.loadEngine ?? loadEngine,
  })
}

export { createProgramController, inspectCapabilities, installProgramOp }
