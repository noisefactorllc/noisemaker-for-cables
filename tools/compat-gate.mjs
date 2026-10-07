// Pre-delivery compatibility gate.
//
// Derives the qualified export scope from parity/coverage-matrix.json and
// rejects any kit compatibility declaration that claims more than that scope
// before the kit is delivered. The narrowed `compat.mode: list` declaration in
// `export-kit/kit.config.json` is what the consuming host uses to reject
// unsupported exports.
//
// The matrix is the qualification record for the shipped core bytes: its
// authority pin must equal the vendored core digest (every core sync rebinds
// it), and the full-catalog browser sweep (test:browser) fails unless every
// effect outside its compileOnly list renders and matches the independent
// reference at the zero-channel ceiling. CI runs that sweep before this gate.
//
// Usage:
//   node tools/compat-gate.mjs            # validate the committed declaration
//   node tools/compat-gate.mjs --print    # print the qualified declaration
//
// Exit 0: declaration matches the qualified scope exactly. Exit 1: rejection.

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function loadQualifiedScope({ root = ROOT } = {}) {
  const manifest = JSON.parse(
    readFileSync(join(root, 'vendor-cache/effects/manifest.json'), 'utf8'))
  const catalog = Object.keys(manifest).sort()
  const matrix = JSON.parse(
    readFileSync(join(root, 'parity/coverage-matrix.json'), 'utf8'))
  const coreDigest = createHash('sha256')
    .update(readFileSync(join(root, 'vendor-cache/noisemaker-shaders-core.esm.js')))
    .digest('hex')
  const authority = matrix.checkpoint?.authority
  if (authority?.coreFile !== 'vendor-cache/noisemaker-shaders-core.esm.js' ||
      authority?.coreSha256 !== coreDigest) {
    throw new Error('vendored core digest does not match the coverage matrix authority pin')
  }

  const denominator = matrix.denominator ?? {}
  const compileOnly = denominator.compileOnly
  if (!Array.isArray(compileOnly)) {
    throw new Error('coverage matrix denominator.compileOnly must be a list')
  }
  if (denominator.catalogEffects !== catalog.length) {
    throw new Error(
      `matrix catalogEffects ${denominator.catalogEffects} != catalog size ${catalog.length}`)
  }

  const unqualified = new Map()
  for (const entry of compileOnly) {
    if (!catalog.includes(entry?.id)) {
      throw new Error(`compileOnly id is not in the catalog: ${entry?.id}`)
    }
    if (unqualified.has(entry.id)) throw new Error(`duplicate compileOnly id: ${entry.id}`)
    unqualified.set(entry.id, entry.reason || 'compile-only')
  }
  if (denominator.renderedAndCompared !== catalog.length - unqualified.size) {
    throw new Error(
      `matrix renderedAndCompared ${denominator.renderedAndCompared} != ` +
      `${catalog.length} catalog ids minus ${unqualified.size} compile-only`)
  }

  const qualified = catalog.filter((id) => !unqualified.has(id))
  return { catalog, qualified, unqualified: Object.fromEntries(unqualified) }
}

export function validateDeclaration(declaration, scope) {
  const problems = []
  const { mode, effects } = declaration || {}
  if (mode === 'all') {
    problems.push('compat.mode "all" claims every catalog export; the tested scope is narrower')
    return problems
  }
  if (mode !== 'list') problems.push(`unsupported compat.mode: ${JSON.stringify(mode)}`)
  if (!Array.isArray(effects)) {
    problems.push('compat.effects must be the explicit qualified id list')
    return problems
  }
  const declared = [...effects].sort()
  const extra = declared.filter((id) => !scope.qualified.includes(id))
  const missing = scope.qualified.filter((id) => !declared.includes(id))
  if (extra.length) problems.push(`declaration lists unqualified ids: ${extra}`)
  if (missing.length) problems.push(`declaration omits qualified ids: ${missing}`)
  if (new Set(effects).size !== effects.length) problems.push('declaration has duplicate ids')
  return problems
}

export function loadDeclaration({ root = ROOT } = {}) {
  const { compat } = JSON.parse(readFileSync(join(root, 'export-kit/kit.config.json'), 'utf8'))
  if (compat?.mode !== 'list' || compat.fromJsonList !== 'export-kit/compat-effects.json' ||
      Object.keys(compat).some((key) => !['mode', 'fromJsonList'].includes(key))) {
    throw new Error('kit compatibility must use the builder-supported export-kit/compat-effects.json list')
  }
  return { mode: compat.mode, effects: JSON.parse(readFileSync(join(root, compat.fromJsonList), 'utf8')) }
}

function main() {
  const scope = loadQualifiedScope()
  if (process.argv.includes('--print')) {
    process.stdout.write(
      JSON.stringify({ mode: 'list', effects: scope.qualified }, null, 2) + '\n')
    return 0
  }
  const declaration = loadDeclaration()
  const problems = validateDeclaration(declaration, scope)
  if (problems.length) {
    process.stderr.write(
      `compat-gate: kit declaration rejected before delivery:\n` +
      problems.map((p) => `  - ${p}`).join('\n') + '\n' +
      `unqualified ids: ${JSON.stringify(scope.unqualified)}\n`)
    return 1
  }
  process.stdout.write(
    `compat-gate: declaration matches the qualified scope ` +
    `(${scope.qualified.length}/${scope.catalog.length} catalog ids); ` +
    `unqualified: ${JSON.stringify(scope.unqualified)}\n`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main())
}
