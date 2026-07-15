import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  bootCore,
  finalizeEnums,
  getParamAliasCompatibility,
  registerEffectInstance,
} from '../src/runtime/register-effect.js'

function createFakeCore() {
  const calls = {
    effects: [],
    enumMerges: [],
    ops: [],
    starters: [],
  }

  return {
    calls,
    stdEnums: { standard: { alpha: { type: 'Number', value: 1 } } },
    async mergeIntoEnums(enums) {
      calls.enumMerges.push(enums)
    },
    registerEffect(name, instance) {
      calls.effects.push([name, instance])
    },
    registerOp(name, spec) {
      calls.ops.push([name, spec])
    },
    registerStarterOps(names) {
      calls.starters.push(names)
    },
    sanitizeEnumName(name) {
      return name.replace(/\s+(.)/g, (_match, character) => character.toUpperCase())
    },
  }
}

test('bootCore registers standard enums and starter ops once per core instance', async () => {
  const firstCore = createFakeCore()
  const secondCore = createFakeCore()

  await bootCore(firstCore)
  await bootCore(firstCore)
  await bootCore(secondCore)

  assert.deepEqual(firstCore.calls.enumMerges, [firstCore.stdEnums])
  assert.deepEqual(firstCore.calls.starters, [undefined])
  assert.deepEqual(secondCore.calls.enumMerges, [secondCore.stdEnums])
  assert.deepEqual(secondCore.calls.starters, [undefined])
})

test('registerEffectInstance registers aliases, op metadata, starters, enums, and aliases once', async () => {
  const firstCore = createFakeCore()
  const secondCore = createFakeCore()
  const instance = {
    enums: { local: { enabled: { type: 'Number', value: 1 } } },
    func: 'spark',
    globals: {
      tint: {
        default: [1, 0.5, 0.25, 1],
        max: 1,
        min: 0,
        type: 'vec4',
        uniform: 'tint',
      },
      mode: {
        choices: { 'Modes:': 0, soft: 1, 'hard edge': 2 },
        default: 1,
        type: 'int',
      },
    },
    paramAliases: { oldTint: 'tint' },
    passes: [{ inputs: {}, name: 'render' }],
  }
  const choices = {}

  assert.equal(
    await registerEffectInstance(firstCore, 'synth', 'sparkle', instance, choices),
    true,
  )
  assert.equal(
    await registerEffectInstance(firstCore, 'synth', 'sparkle', { ...instance }, choices),
    false,
  )
  assert.equal(
    await registerEffectInstance(secondCore, 'synth', 'sparkle', { ...instance }, {}),
    true,
  )

  assert.deepEqual(
    firstCore.calls.effects.map(([name]) => name),
    ['spark', 'synth.spark', 'synth/sparkle', 'synth.sparkle'],
  )
  assert.ok(firstCore.calls.effects.every(([, registered]) => registered === instance))
  assert.deepEqual(firstCore.calls.ops, [
    [
      'synth.spark',
      {
        name: 'spark',
        args: [
          {
            choices: undefined,
            default: [1, 0.5, 0.25, 1],
            enum: undefined,
            enumPath: undefined,
            max: 1,
            min: 0,
            name: 'tint',
            type: 'color',
            uniform: 'tint',
          },
          {
            choices: { 'Modes:': 0, soft: 1, 'hard edge': 2 },
            default: 1,
            enum: 'synth.spark.mode',
            enumPath: 'synth.spark.mode',
            max: undefined,
            min: undefined,
            name: 'mode',
            type: 'int',
            uniform: undefined,
          },
        ],
      },
    ],
  ])
  assert.deepEqual(firstCore.calls.starters, [['spark', 'synth.spark']])
  assert.deepEqual(firstCore.calls.enumMerges, [instance.enums])
  assert.deepEqual(choices, {
    synth: {
      spark: {
        mode: {
          soft: { type: 'Number', value: 1 },
          'hard edge': { type: 'Number', value: 2 },
          hardEdge: { type: 'Number', value: 2 },
        },
      },
    },
  })
  assert.deepEqual(getParamAliasCompatibility(firstCore, 'synth.spark'), {
    oldTint: 'tint',
  })
  assert.equal(getParamAliasCompatibility(secondCore, 'synth.spark').oldTint, 'tint')
})

test('registerEffectInstance instantiates class exports and attaches static shaders', async () => {
  const core = createFakeCore()
  let constructions = 0

  class ClassEffect {
    static shaders = { render: { glsl: 'void main() {}' } }

    constructor() {
      constructions += 1
      this.func = 'classEffect'
      this.globals = {}
      this.passes = [{ inputs: { source: 'inputTex' }, name: 'render' }]
    }
  }

  const choices = {}
  assert.equal(
    await registerEffectInstance(core, 'filter', 'classEffect', ClassEffect, choices),
    true,
  )
  assert.equal(
    await registerEffectInstance(core, 'filter', 'classEffect', ClassEffect, choices),
    false,
  )

  const registered = core.calls.effects[0][1]
  assert.ok(registered instanceof ClassEffect)
  assert.equal(registered.shaders, ClassEffect.shaders)
  assert.equal(constructions, 1)
  assert.deepEqual(core.calls.starters, [])
})

test('finalizeEnums merges accumulated choices once per core and choice object', async () => {
  const core = createFakeCore()
  const choices = { synth: { spark: { mode: { soft: { type: 'Number', value: 1 } } } } }

  await finalizeEnums(core, choices)
  await finalizeEnums(core, choices)
  await finalizeEnums(core, {})

  assert.deepEqual(core.calls.enumMerges, [choices])
})
