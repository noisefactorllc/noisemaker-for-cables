import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'

import { loadDeclaration, loadQualifiedScope, validateDeclaration } from '../tools/compat-gate.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const committed = () => loadDeclaration()

test('the builder reads the same qualified list that the delivery gate validates', () => {
  const { compat } = JSON.parse(readFileSync(join(root, 'export-kit/kit.config.json'), 'utf8'))
  assert.deepEqual(compat, { mode: 'list', fromJsonList: 'export-kit/compat-effects.json' })
  const effects = JSON.parse(readFileSync(join(root, compat.fromJsonList), 'utf8'))
  assert.deepEqual(effects, loadQualifiedScope().qualified)
  assert.deepEqual(committed(), { mode: 'list', effects })
})

test('qualified scope covers all 210 rendered catalog effects', () => {
  const scope = loadQualifiedScope()
  assert.equal(scope.catalog.length, 210)
  assert.equal(scope.qualified.length, 210)
  assert.deepEqual(Object.keys(scope.unqualified), [])
  assert.ok(scope.qualified.includes('filter/fibers'))
  assert.ok(scope.qualified.includes('filter/octaveWarp'))
})

test('qualified sweep rejects evidence for different vendored core bytes', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'cables-compat-'))
  try {
    const paths = [
      'vendor-cache/effects/manifest.json',
      'vendor-cache/noisemaker-shaders-core.esm.js',
      'evidence/gap-002-20261004/catalog-parity.json',
      'evidence/gap-007-20260926/overlay-settle.json',
    ]
    for (const path of paths) {
      mkdirSync(dirname(join(fixture, path)), { recursive: true })
      copyFileSync(join(root, path), join(fixture, path))
    }
    const sweepPath = join(fixture, paths[2])
    const sweep = JSON.parse(readFileSync(sweepPath, 'utf8'))
    sweep.coreSha256 = '0'.repeat(64)
    writeFileSync(sweepPath, JSON.stringify(sweep))
    assert.throws(() => loadQualifiedScope({ root: fixture }), /core digest/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
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
  const extra = { mode: 'list', effects: [...scope.qualified, 'filter/unknown'] }
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
