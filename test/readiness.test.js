import assert from 'node:assert/strict'
import { setImmediate as waitForImmediate } from 'node:timers/promises'
import { test } from 'node:test'

import { createLazyReadiness } from '../src/runtime/readiness.js'

test('concurrent compile and load paths share one lazy bootstrap', async () => {
  let bootstrapCalls = 0
  let releaseBootstrap
  const bootstrapGate = new Promise((resolve) => {
    releaseBootstrap = resolve
  })
  const ensureRegistered = createLazyReadiness(async () => {
    bootstrapCalls += 1
    await bootstrapGate
  })
  const compileProgram = async () => {
    await ensureRegistered()
    return 'compiled'
  }
  const loadEngine = async () => {
    await ensureRegistered()
    return 'loaded'
  }

  const firstReadiness = ensureRegistered()
  const secondReadiness = ensureRegistered()
  const compile = compileProgram()
  const load = loadEngine()

  assert.equal(firstReadiness, secondReadiness)
  await Promise.resolve()
  assert.equal(bootstrapCalls, 1)
  releaseBootstrap()
  assert.deepEqual(await Promise.all([compile, load]), ['compiled', 'loaded'])
  assert.equal(ensureRegistered(), firstReadiness)
})

test('failed lazy bootstrap is handled immediately and a later call retries', async () => {
  let bootstrapCalls = 0
  const ensureRegistered = createLazyReadiness(async () => {
    bootstrapCalls += 1
    if (bootstrapCalls === 1) throw new Error('registration failed')
    return 'registered'
  })

  const failed = ensureRegistered()
  await waitForImmediate()
  await assert.rejects(failed, /registration failed/)

  const retry = ensureRegistered()
  assert.notEqual(retry, failed)
  assert.equal(await retry, 'registered')
  assert.equal(bootstrapCalls, 2)
  assert.equal(ensureRegistered(), retry)
})
