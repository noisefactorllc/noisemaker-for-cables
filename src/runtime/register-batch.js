export function createEffectBatchRegistrar(
  effects,
  { bootCore, finalizeEnums, registerEffectInstance },
) {
  if (!Array.isArray(effects)) throw new TypeError('effects must be an array')
  if (
    typeof bootCore !== 'function' ||
    typeof finalizeEnums !== 'function' ||
    typeof registerEffectInstance !== 'function'
  ) {
    throw new TypeError('effect batch registration dependencies must be functions')
  }

  const stateByCore = new WeakMap()

  return function registerEffectBatch(core) {
    let state = stateByCore.get(core)
    if (!state) {
      state = { allChoices: {}, promise: null }
      stateByCore.set(core, state)
    }
    if (state.promise) return state.promise

    const attempt = (async () => {
      await bootCore(core)

      for (const [effectId, exported] of effects) {
        const separator = effectId.indexOf('/')
        if (separator <= 0 || separator === effectId.length - 1) {
          throw new Error(`Invalid generated effect ID: ${effectId}`)
        }
        const namespace = effectId.slice(0, separator)
        const effectName = effectId.slice(separator + 1)
        await registerEffectInstance(
          core,
          namespace,
          effectName,
          exported,
          state.allChoices,
        )
      }

      await finalizeEnums(core, state.allChoices)
      return effects.length
    })()
    const guarded = attempt.catch((error) => {
      if (state.promise === guarded) state.promise = null
      throw error
    })

    guarded.catch(() => {})
    state.promise = guarded
    return guarded
  }
}
