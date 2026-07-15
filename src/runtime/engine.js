import {
  Pipeline,
  WebGL2Backend,
  compileGraph,
  mergeIntoEnums,
  registerEffect,
  registerOp,
  registerStarterOps,
  registerValidatorHook,
  sanitizeEnumName,
  stdEnums,
} from '../../vendor-cache/noisemaker-shaders-core.esm.js'

import { effectCount, effectIds, registerAllEffects } from '../generated/register-all-effects.js'
import { createLazyReadiness } from './readiness.js'

const core = {
  mergeIntoEnums,
  registerEffect,
  registerOp,
  registerStarterOps,
  registerValidatorHook,
  sanitizeEnumName,
  stdEnums,
}

export const catalogInfo = Object.freeze({ effectCount, effectIds })

const ensureRegistered = createLazyReadiness(() => registerAllEffects(core))

export async function compileProgram(dsl, options) {
  await ensureRegistered()
  return compileGraph(dsl, options)
}

const loadedEngine = Object.freeze({
  Pipeline,
  WebGL2Backend,
  catalogInfo,
  compileProgram,
})

export async function loadEngine() {
  await ensureRegistered()
  return loadedEngine
}

export { Pipeline, WebGL2Backend }
