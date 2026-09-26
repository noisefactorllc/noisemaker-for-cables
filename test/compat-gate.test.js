import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import { loadQualifiedScope, validateDeclaration } from '../tools/compat-gate.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const committed = () => {
  const config = JSON.parse(
    readFileSync(join(root, 'export-kit/kit.config.json'), 'utf8'))
  return config.compat
}

test('qualified scope covers the full catalog with only the compile-only exclusion', () => {
  const scope = loadQualifiedScope()
  assert.equal(scope.catalog.length, 210)
  assert.equal(scope.qualified.length, 209)
  assert.deepEqual(Object.keys(scope.unqualified), ['filter/octaveWarp'])
  assert.ok(scope.qualified.includes('filter/fibers'))
  assert.ok(!scope.qualified.includes('filter/octaveWarp'))
})

test('the committed kit declaration matches the qualified scope exactly', () => {
  const scope = loadQualifiedScope()
  const problems = validateDeclaration(committed(), scope)
  assert.deepEqual(problems, [])
  assert.equal(committed().mode, 'list')
  assert.deepEqual([...committed().effects].sort(), scope.qualified)
})

test('pre-delivery rejection: mode "all" is rejected', () => {
  const scope = loadQualifiedScope()
  assert.ok(validateDeclaration({ mode: 'all' }, scope).length > 0)
})

test('pre-delivery rejection: an unqualified id in the declaration is rejected', () => {
  const scope = loadQualifiedScope()
  const extra = { mode: 'list', effects: [...scope.qualified, 'filter/octaveWarp'] }
  assert.ok(validateDeclaration(extra, scope).some((p) => p.includes('unqualified')))
})

test('pre-delivery rejection: an omitted qualified id is rejected', () => {
  const scope = loadQualifiedScope()
  const missing = { mode: 'list', effects: scope.qualified.slice(1) }
  assert.ok(validateDeclaration(missing, scope).some((p) => p.includes('omits')))
})

test('pre-delivery rejection: a renamed qualified id fails (identity control)', () => {
  const scope = loadQualifiedScope()
  const renamed = scope.qualified.map((id) => id === 'filter/fibers' ? 'filter/fiberz' : id)
  const problems = validateDeclaration({ mode: 'list', effects: renamed }, scope)
  assert.ok(problems.some((p) => p.includes('unqualified')))
})

test('pre-delivery rejection: duplicate ids are rejected', () => {
  const scope = loadQualifiedScope()
  const duped = { mode: 'list', effects: [scope.qualified[0], scope.qualified[0]] }
  assert.ok(validateDeclaration(duped, scope).some((p) => p.includes('duplicate')))
})

test('the gate CLI accepts the committed declaration', () => {
  execFileSync(process.execPath, [join(root, 'tools/compat-gate.mjs')], { cwd: root })
})
