import {
  AudioState,
  CanvasRenderer,
  MidiState,
  Pipeline,
  WebGL2Backend,
  compileGraph,
  getEffect,
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

// The vendored core keeps its parameter-alias registry internal; its only public
// writer is CanvasRenderer.registerEffectWithRuntime. Seeding that registry with
// an alias stub makes the compiler's deprecated-parameter diagnostics match the
// reference runtime. The stub registration overwrites the real effect instances
// and the op spec, so both are snapshotted and restored immediately after.
let aliasRegistrar = null

function registerParamAliases(opName, aliases, opSpec, effectNames) {
  if (!aliasRegistrar) aliasRegistrar = new CanvasRenderer()
  const separator = opName.indexOf('.')
  const namespace = opName.slice(0, separator)
  const func = opName.slice(separator + 1)
  const names = effectNames || [func, opName, `${namespace}/${func}`, opName]
  const saved = names.map((name) => [name, getEffect(name)])
  aliasRegistrar.registerEffectWithRuntime({
    instance: { func, paramAliases: aliases },
    name: func,
    namespace,
  })
  for (const [name, instance] of saved) {
    if (instance) registerEffect(name, instance)
  }
  if (opSpec) registerOp(opName, opSpec)
}

const core = {
  mergeIntoEnums,
  registerEffect,
  registerOp,
  registerParamAliases,
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
  AudioState,
  MidiState,
  Pipeline,
  WebGL2Backend,
  catalogInfo,
  compileProgram,
})

export async function loadEngine() {
  await ensureRegistered()
  return loadedEngine
}

export { AudioState, MidiState, Pipeline, WebGL2Backend }
