// The published core keeps its deprecated-effect diagnostics internal. Generic adapters retain a copy here,
// while runtimes with validator-hook support receive equivalent effect compatibility below.
const bootedCores = new WeakSet()
const finalizedChoicesByCore = new WeakMap()
const registeredEffectsByCore = new WeakMap()
const validatorCompatibilityByCore = new WeakMap()

const PIPELINE_INPUTS = new Set([
  'inputTex',
  'inputTex3d',
  'o0',
  'o1',
  'o2',
  'o3',
  'o4',
  'o5',
  'o6',
  'o7',
])

function requireCore(core) {
  if ((typeof core !== 'object' && typeof core !== 'function') || core === null) {
    throw new TypeError('core must be an object')
  }
}

function effectSetFor(core) {
  let registered = registeredEffectsByCore.get(core)
  if (!registered) {
    registered = new Set()
    registeredEffectsByCore.set(core, registered)
  }
  return registered
}

function choiceSetFor(core) {
  let finalized = finalizedChoicesByCore.get(core)
  if (!finalized) {
    finalized = new WeakSet()
    finalizedChoicesByCore.set(core, finalized)
  }
  return finalized
}

function validatorDispatchFor(core, func) {
  let byFunction = validatorCompatibilityByCore.get(core)
  if (!byFunction) {
    byFunction = new Map()
    validatorCompatibilityByCore.set(core, byFunction)
  }

  let dispatch = byFunction.get(func)
  if (!dispatch) {
    dispatch = { installed: false, operations: new Map() }
    byFunction.set(func, dispatch)
  }
  return dispatch
}

function resolveValidatorOperation(dispatch, func, call, resolvedArgs) {
  const callNamespace = call?.namespace
  if (typeof callNamespace?.resolved === 'string') {
    return dispatch.operations.get(`${callNamespace.resolved}.${func}`) || null
  }

  if (Array.isArray(callNamespace?.searchOrder)) {
    for (const namespace of callNamespace.searchOrder) {
      const compatibility = dispatch.operations.get(`${namespace}.${func}`)
      if (compatibility) return compatibility
    }
  }

  for (const compatibility of dispatch.operations.values()) {
    if (
      compatibility.markerName &&
      Object.prototype.hasOwnProperty.call(resolvedArgs, compatibility.markerName)
    ) {
      return compatibility
    }
  }
  return null
}

function registerValidatorCompatibility(core, namespace, func, instance) {
  if (typeof core.registerValidatorHook !== 'function') return []

  const deprecatedBy = instance.hidden && instance.deprecatedBy ? instance.deprecatedBy : null
  const dispatch = validatorDispatchFor(core, func)
  const opName = `${namespace}.${func}`
  const markerName = deprecatedBy
    ? `__noisemakerCompatibility_${namespace}_${func}`.replace(/[^A-Za-z0-9_]/g, '_')
    : null
  const compatibility = {
    deprecatedBy: deprecatedBy || null,
    markerName,
    opName,
  }
  dispatch.operations.set(opName, compatibility)

  if (deprecatedBy && !dispatch.installed) {
    core.registerValidatorHook(func, ({ args: resolvedArgs, call, pushDiagnostic }) => {
      const selected = resolveValidatorOperation(dispatch, func, call, resolvedArgs)
      if (!selected) return
      if (selected.markerName) delete resolvedArgs[selected.markerName]

      if (selected.deprecatedBy) {
        pushDiagnostic(
          'S008',
          call,
          `effect '${func}' is deprecated, use '${selected.deprecatedBy}' instead.`,
        )
      }
    })
    dispatch.installed = true
  }

  if (!markerName) return []
  return [{ name: markerName, type: 'boolean', default: true, min: false, max: true }]
}

function isStarter(instance) {
  const passes = instance.passes || []
  if (passes.length === 0) return true

  return !passes.some(
    (pass) =>
      pass.inputs && Object.values(pass.inputs).some((input) => PIPELINE_INPUTS.has(input)),
  )
}

function addChoiceEnums(core, allChoices, namespace, func, parameter, choices) {
  const choiceEnums = (allChoices[namespace] ||= {})
  const effectEnums = (choiceEnums[func] ||= {})
  const parameterEnums = (effectEnums[parameter] ||= {})

  for (const [name, value] of Object.entries(choices)) {
    if (name.endsWith(':')) continue
    parameterEnums[name] = { type: 'Number', value }
    const sanitized = core.sanitizeEnumName ? core.sanitizeEnumName(name) : name
    if (sanitized && sanitized !== name) {
      parameterEnums[sanitized] = { type: 'Number', value }
    }
  }
}

export async function bootCore(core) {
  requireCore(core)
  if (bootedCores.has(core)) return false

  bootedCores.add(core)
  try {
    if (core.mergeIntoEnums && core.stdEnums) await core.mergeIntoEnums(core.stdEnums)
    if (core.registerStarterOps) core.registerStarterOps()
    return true
  } catch (error) {
    bootedCores.delete(core)
    throw error
  }
}

export async function registerEffectInstance(
  core,
  namespace,
  effectName,
  exported,
  allChoices = {},
) {
  requireCore(core)
  const effectId = `${namespace}/${effectName}`
  const registered = effectSetFor(core)
  if (registered.has(effectId)) return false
  if (!exported) return false

  registered.add(effectId)
  try {
    let instance = exported
    if (typeof exported === 'function') {
      instance = new exported()
      if (!instance.shaders && exported.shaders) instance.shaders = exported.shaders
    }

    if (!instance.namespace) instance.namespace = namespace
    const func = instance.func || effectName
    const aliases = [
      func,
      `${namespace}.${func}`,
      effectId,
      `${namespace}.${effectName}`,
    ]

    for (const alias of aliases) core.registerEffect(alias, instance)

    const args = Object.entries(instance.globals || {}).map(([name, spec]) => {
      let enumPath = spec.enum || spec.enumPath
      if (spec.choices && !enumPath) {
        enumPath = `${namespace}.${func}.${name}`
        addChoiceEnums(core, allChoices, namespace, func, name, spec.choices)
      }

      return {
        name,
        type: spec.type === 'vec4' ? 'color' : spec.type,
        default: spec.default,
        enum: enumPath,
        enumPath,
        min: spec.min,
        max: spec.max,
        uniform: spec.uniform,
        choices: spec.choices,
      }
    })

    const compatArgs = registerValidatorCompatibility(core, namespace, func, instance)
    if (core.registerOp) {
      core.registerOp(`${namespace}.${func}`, { name: func, args: [...args, ...compatArgs] })
    }
    if (
      instance.paramAliases &&
      typeof core.registerParamAliases === 'function'
    ) {
      core.registerParamAliases(
        `${namespace}.${func}`,
        { ...instance.paramAliases },
        { name: func, args: [...args, ...compatArgs] },
        [func, `${namespace}.${func}`, effectId, `${namespace}.${effectName}`],
      )
    }
    if (isStarter(instance) && core.registerStarterOps) {
      core.registerStarterOps([func, `${namespace}.${func}`])
    }
    if (instance.enums && core.mergeIntoEnums) await core.mergeIntoEnums(instance.enums)

    return true
  } catch (error) {
    registered.delete(effectId)
    throw error
  }
}

export async function finalizeEnums(core, allChoices) {
  requireCore(core)
  if (!allChoices || typeof allChoices !== 'object' || Object.keys(allChoices).length === 0) {
    return false
  }

  const finalized = choiceSetFor(core)
  if (finalized.has(allChoices)) return false
  finalized.add(allChoices)

  try {
    if (core.mergeIntoEnums) await core.mergeIntoEnums(allChoices)
    return true
  } catch (error) {
    finalized.delete(allChoices)
    throw error
  }
}

