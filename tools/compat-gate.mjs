// GAP-006 pre-delivery compatibility gate.
//
// Derives the qualified export scope from the committed parity evidence and
// rejects any kit compatibility declaration that claims more than that scope
// before the kit is delivered (the repository-side gate; the narrowed
// `compat.mode: list` declaration in `export-kit/kit.config.json` is what the
// consuming host uses to reject unsupported exports).
//
// Usage:
//   node tools/compat-gate.mjs            # validate the committed declaration
//   node tools/compat-gate.mjs --print    # print the qualified declaration
//
// Exit 0: declaration matches the qualified scope exactly. Exit 1: rejection.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function loadQualifiedScope({ root = ROOT } = {}) {
  const manifest = JSON.parse(
    readFileSync(join(root, 'vendor-cache/effects/manifest.json'), 'utf8'))
  const catalog = Object.keys(manifest)
  const sweep = JSON.parse(
    readFileSync(join(root, 'evidence/gap-002-20260926/catalog-parity.json'), 'utf8'))
  const overlay = JSON.parse(
    readFileSync(join(root, 'evidence/gap-007-20260926/overlay-settle.json'), 'utf8'))

  if (sweep.failures?.length) {
    throw new Error(`catalog sweep records ${sweep.failures.length} failure(s)`)
  }
  if (sweep.effectCount !== catalog.length) {
    throw new Error(
      `sweep effectCount ${sweep.effectCount} != catalog size ${catalog.length}`)
  }

  const byId = new Map()
  for (const result of sweep.results) {
    if (byId.has(result.id)) throw new Error(`duplicate sweep result: ${result.id}`)
    byId.set(result.id, result)
  }
  const missing = catalog.filter((id) => !byId.has(id))
  if (missing.length) throw new Error(`catalog ids missing from sweep: ${missing}`)

  const settled = new Map()
  for (const c of overlay.cases) {
    settled.set(c.id, c.comparisons.every((x) => x.mismatchedChannels === 0))
  }

  const qualified = new Set()
  const unqualified = new Map()
  for (const id of catalog) {
    const r = byId.get(id)
    if (!r.rendered || !r.compared) {
      unqualified.set(id, r.classification || 'not-rendered')
    } else if (r.mismatchedChannels !== 0) {
      if (r.classification === 'nondeterministic-canvas-overlay-generation' &&
          settled.get(id) === true) {
        qualified.add(id)
      } else {
        unqualified.set(id, r.classification || 'mismatched-channels')
      }
    } else {
      qualified.add(id)
    }
  }
  return { catalog, qualified: [...qualified].sort(), unqualified: Object.fromEntries(unqualified) }
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

function main() {
  const scope = loadQualifiedScope()
  if (process.argv.includes('--print')) {
    process.stdout.write(
      JSON.stringify({ mode: 'list', effects: scope.qualified }, null, 2) + '\n')
    return 0
  }
  const declaration = JSON.parse(
    readFileSync(join(ROOT, 'export-kit/kit.config.json'), 'utf8')).compat
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
