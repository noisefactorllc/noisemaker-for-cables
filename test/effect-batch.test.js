import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createEffectBatchRegistrar } from '../src/runtime/register-batch.js'
import {
  bootCore,
  finalizeEnums,
  registerEffectInstance,
} from '../src/runtime/register-effect.js'

function createCore() {
  const calls = {
    effects: [],
    enumMerges: [],
    ops: [],
    starters: [],
  }

  return {
    calls,
    stdEnums: { standard: {} },
    async mergeIntoEnums(enums) {
      calls.enumMerges.push(enums)
    },
    registerEffect(name) {
      calls.effects.push(name)
    },
    registerOp(name) {
      calls.ops.push(name)
    },
    registerStarterOps(names) {
      calls.starters.push(names)
    },
    sanitizeEnumName(name) {
      return name
    },
  }
}

const dependencies = { bootCore, finalizeEnums, registerEffectInstance }

test('concurrent whole-catalog registration calls share one batch promise', async () => {
  const core = createCore()
  let releaseBoot
  const bootGate = new Promise((resolve) => {
    releaseBoot = resolve
  })
  core.mergeIntoEnums = async (enums) => {
    core.calls.enumMerges.push(enums)
    if (enums === core.stdEnums) await bootGate
  }
  const effects = [
    ['synth/first', { func: 'first', globals: {}, passes: [] }],
  ]
  const registerBatch = createEffectBatchRegistrar(effects, dependencies)

  const first = registerBatch(core)
  const concurrent = registerBatch(core)
  assert.equal(first, concurrent)

  releaseBoot()
  assert.equal(await first, 1)
  assert.equal(core.calls.effects.length, 4)
  assert.equal(core.calls.ops.length, 1)
  assert.equal(registerBatch(core), first)
})

test('failed mid-batch registration retries with persistent choices and no repeated successful aliases', async () => {
  const core = createCore()
  let failSecondOp = true
  core.registerOp = (name) => {
    if (name === 'synth.second' && failSecondOp) {
      failSecondOp = false
      throw new Error('second effect failed')
    }
    core.calls.ops.push(name)
  }
  const effects = [
    [
      'synth/first',
      {
        func: 'first',
        globals: { mode: { choices: { one: 1 }, default: 1, type: 'int' } },
        passes: [],
      },
    ],
    [
      'synth/second',
      {
        func: 'second',
        globals: { mode: { choices: { two: 2 }, default: 2, type: 'int' } },
        passes: [],
      },
    ],
  ]
  const registerBatch = createEffectBatchRegistrar(effects, dependencies)

  const failed = registerBatch(core)
  await assert.rejects(failed, /second effect failed/)
  assert.equal(core.calls.effects.filter((name) => name === 'first').length, 1)
  assert.equal(core.calls.effects.filter((name) => name === 'synth.first').length, 2)

  const retry = registerBatch(core)
  assert.notEqual(retry, failed)
  assert.equal(await retry, 2)

  assert.equal(core.calls.effects.filter((name) => name === 'first').length, 1)
  assert.equal(core.calls.effects.filter((name) => name === 'synth.first').length, 2)
  assert.equal(core.calls.effects.filter((name) => name === 'second').length, 2)
  assert.equal(core.calls.effects.filter((name) => name === 'synth.second').length, 4)
  assert.deepEqual(core.calls.enumMerges.at(-1), {
    synth: {
      first: { mode: { one: { type: 'Number', value: 1 } } },
      second: { mode: { two: { type: 'Number', value: 2 } } },
    },
  })

  const effectCallCount = core.calls.effects.length
  assert.equal(registerBatch(core), retry)
  assert.equal(core.calls.effects.length, effectCallCount)
})
