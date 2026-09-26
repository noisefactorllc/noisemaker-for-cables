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
    if (details.diagnostics !== undefined) this.diagnostics = details.diagnostics
  }
}

const DIAGNOSTIC_DETAIL_LIMIT = 1200

// Compiler surfaces: plain `{ code: 'ERR_COMPILATION_FAILED', diagnostics: [...] }`
// throws, `ERR_EXPANSION_FAILED` `{ errors: [...] }` throws, and lexer/parser
// `SyntaxError`s carrying a single `error.diagnostic`. None of them set
// `error.message`, so the detail must be rendered from the structured records.
function structuredDiagnosticsFrom(error) {
  if (Array.isArray(error?.diagnostics) && error.diagnostics.length > 0) return error.diagnostics
  if (Array.isArray(error?.errors) && error.errors.length > 0) return error.errors
  if (error?.diagnostic) return [error.diagnostic]
  return null
}

function formatDiagnosticLocation(diagnostic) {
  const line = diagnostic?.location?.line
  if (typeof line !== 'number') return ''
  const column = diagnostic?.location?.column
  return typeof column === 'number' ? ` (line ${line}, column ${column})` : ` (line ${line})`
}

function formatDiagnostic(diagnostic) {
  if (typeof diagnostic === 'string') return diagnostic
  if (typeof diagnostic?.message !== 'string' || diagnostic.message.length === 0) {
    return typeof diagnostic?.code === 'string' ? `[${diagnostic.code}]` : ''
  }
  const code = typeof diagnostic.code === 'string' ? `[${diagnostic.code}] ` : ''
  return `${code}${diagnostic.message}${formatDiagnosticLocation(diagnostic)}`
}

function diagnosticDetail(diagnostics) {
  const rendered = diagnostics.map(formatDiagnostic).filter((text) => text.length > 0).join('; ')
  if (rendered.length === 0) return ''
  if (rendered.length > DIAGNOSTIC_DETAIL_LIMIT) return `: ${rendered.slice(0, DIAGNOSTIC_DETAIL_LIMIT)}…`
  return `: ${rendered}`
}

export function toControllerError(phase, error, details = {}) {
  if (error instanceof ControllerError) return error
  const code = PHASE_CODES[phase] ?? 'ERR_CONTROLLER'
  const diagnostics = structuredDiagnosticsFrom(error)
  let detail = diagnostics ? diagnosticDetail(diagnostics) : ''
  if (!detail && error?.message) detail = `: ${error.message}`
  return new ControllerError(
    code,
    phase,
    `Noisemaker controller ${phase} failed${detail}`,
    {
      ...details,
      ...(diagnostics ? { diagnostics } : {}),
      cause: error,
    },
  )
}
