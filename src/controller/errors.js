const PHASE_CODES = Object.freeze({
  allocation: 'ERR_ALLOCATION',
  capability: 'ERR_CAPABILITY',
  compile: 'ERR_DSL_COMPILE',
  context: 'ERR_CONTEXT_LOST',
  dispose: 'ERR_DISPOSAL',
  initialize: 'ERR_PIPELINE_INITIALIZE',
  load: 'ERR_ENGINE_LOAD',
  render: 'ERR_RENDER',
})

export class ControllerError extends Error {
  constructor(code, phase, message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause })
    this.name = 'ControllerError'
    this.code = code
    this.phase = phase
    if (details.cause !== undefined) this.cause = details.cause
    if (details.generation !== undefined) this.generation = details.generation
    if (details.capability !== undefined) this.capability = details.capability
    if (details.capabilityCode !== undefined) this.capabilityCode = details.capabilityCode
    if (details.required !== undefined) this.required = details.required
    if (details.actual !== undefined) this.actual = details.actual
  }
}

export function toControllerError(phase, error, details = {}) {
  if (error instanceof ControllerError) return error
  const code = PHASE_CODES[phase] ?? 'ERR_CONTROLLER'
  const detail = error?.message ? `: ${error.message}` : ''
  return new ControllerError(
    code,
    phase,
    `Noisemaker controller ${phase} failed${detail}`,
    { ...details, cause: error },
  )
}
