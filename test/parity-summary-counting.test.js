import assert from 'node:assert/strict'
import { test } from 'node:test'

import { countCases, failureEffectId } from '../scripts/parity-summary-counting.mjs'

const RENDERED_PASS = {
  comparedChannels: 12288,
  compiled: true,
  copyExact: true,
  finite: true,
  id: 'effect/a',
  linked: true,
  maxChannelError: 0,
  mismatchedChannels: 0,
  rendered: true,
}

test('counts rendered passes as exact and leaves other counts at zero', () => {
  const { counts, records } = countCases(
    ['effect/a', 'effect/b'],
    new Map([
      ['effect/a', RENDERED_PASS],
      ['effect/b', { ...RENDERED_PASS, id: 'effect/b' }],
    ]),
    [],
  )
  assert.deepEqual(counts, {
    defer: 0, exact: 2, expected: 2, executed: 2,
    fail: 0, missing: 0, near: 0, skip: 0, strict: 0,
  })
  assert.deepEqual(records.map((r) => r.status), ['exact', 'exact'])
})

test('keeps the compile-only skip visible', () => {
  const { counts } = countCases(
    ['effect/a'],
    new Map([['effect/a', { compiled: true, id: 'effect/a', linked: true, rendered: false }]]),
    [],
  )
  assert.equal(counts.skip, 1)
  assert.equal(counts.executed, 1)
})

test('reports requested ids absent from the catalog as missing', () => {
  const { counts } = countCases(['effect/absent'], new Map(), [])
  assert.equal(counts.missing, 1)
  assert.equal(counts.executed, 0)
})

test('a sweep failure on the last selected case counts as fail, not as a pass', () => {
  // Reproduces the historical false pass: the harness records a rendered
  // result for the case, then detects a GL resource leak on it and records a
  // `<id>:resource-leak` failure. The summary must count the case as fail.
  const leaked = {
    'adapter.texture': { after: 11, before: 10 },
  }
  const results = new Map([
    ['effect/last', { ...RENDERED_PASS, id: 'effect/last', resourceLeak: leaked }],
  ])
  const { counts, records } = countCases(
    ['effect/last'],
    results,
    [{ effectId: 'effect/last', id: 'effect/last:resource-leak', leakedResources: leaked }],
  )
  assert.equal(counts.exact, 0)
  assert.equal(counts.fail, 1)
  assert.equal(counts.executed, 1)
  assert.equal(records[0].status, 'fail')
})

test('a thrown diagnostic for a selected case counts as fail without inflating executed', () => {
  const { counts } = countCases(
    ['effect/first', 'effect/threw'],
    new Map([['effect/first', RENDERED_PASS]]),
    [{ effectId: 'effect/threw', id: 'effect/threw' }],
  )
  assert.equal(counts.exact, 1)
  assert.equal(counts.fail, 1)
  assert.equal(counts.executed, 2)
})

test('sweep failures for unrequested ids do not inflate the requested counts', () => {
  const { counts } = countCases(
    ['effect/a'],
    new Map([['effect/a', RENDERED_PASS]]),
    [{ effectId: 'effect/unrelated', id: 'effect/unrelated:resource-leak' }],
  )
  assert.equal(counts.fail, 0)
  assert.equal(counts.exact, 1)
})

test('a resource leak attached to a compile-only case overrides its skip with fail', () => {
  const { counts } = countCases(
    ['filter/octaveWarp'],
    new Map([['filter/octaveWarp', {
      compiled: true, id: 'filter/octaveWarp', linked: true, rendered: false,
    }]]),
    [{ effectId: 'filter/octaveWarp', id: 'filter/octaveWarp:resource-leak' }],
  )
  assert.equal(counts.skip, 0)
  assert.equal(counts.fail, 1)
})

test('copy, finite, ceiling, and resource gates each force a fail on a rendered case', () => {
  const cases = [
    { ...RENDERED_PASS, copyExact: false },
    { ...RENDERED_PASS, finite: false },
    { ...RENDERED_PASS, mismatchedChannels: 5 },
    { ...RENDERED_PASS, resourceLeak: { 'adapter.texture': { after: 1, before: 0 } } },
  ]
  for (const result of cases) {
    const { counts } = countCases(
      ['effect/a'],
      new Map([['effect/a', result]]),
      [],
    )
    assert.equal(counts.fail, 1, JSON.stringify(result))
    assert.equal(counts.exact + counts.strict, 0)
  }
})

test('failureEffectId strips the resource-leak suffix and falls back to the id', () => {
  assert.equal(failureEffectId({ effectId: 'effect/a' }), 'effect/a')
  assert.equal(failureEffectId({ id: 'effect/a:resource-leak' }), 'effect/a')
  assert.equal(failureEffectId({}), '')
})