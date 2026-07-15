import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  bindExternalTexture,
  findExternalTextureIds,
} from '../src/backend/external-texture.js'

function createBackend() {
  const registrations = []
  return {
    defaultTexture: 'transparent-default',
    registrations,
    registerExternalTexture(id, record, options) {
      registrations.push([id, record, options])
    },
  }
}

test('findExternalTextureIds detects every unique graph input ending in _step_N', () => {
  const graph = {
    passes: [
      {
        inputs: {
          first: 'imageTex_step_2',
          ignoredOutput: 'surface_chain_0',
          second: 'cameraTexture_step_9',
        },
      },
      {
        inputs: {
          duplicate: 'imageTex_step_2',
          nestedLookingButNotAnInput: { id: 'hidden_step_4' },
          suffixMustBeNumeric: 'bad_step_x',
          suffixMustEnd: 'bad_step_3_more',
          third: 'anything_step_11',
        },
      },
      { name: 'no-inputs' },
    ],
    unrelated: { input: 'not-a-pass_step_99' },
  }

  assert.deepEqual(findExternalTextureIds(graph), [
    'imageTex_step_2',
    'cameraTexture_step_9',
    'anything_step_11',
  ])
})

test('one CGL texture binds its .tex handle and dimensions to every external input', () => {
  const backend = createBackend()
  const uniformCalls = []
  const pipeline = {
    setUniform(...args) {
      uniformCalls.push(args)
    },
  }
  const graph = {
    passes: [
      { inputs: { image: 'imageTex_step_1' } },
      { inputs: { image: 'imageTex_step_8' } },
    ],
  }
  const hostCalls = []
  const texture = {
    delete() { hostCalls.push('delete') },
    dispose() { hostCalls.push('dispose') },
    getHeight: () => 45,
    getWidth: () => 80,
    readPixels() { hostCalls.push('readPixels') },
    tex: 'host-webgl-texture',
  }

  const result = bindExternalTexture({ backend, graph, pipeline, texture })

  assert.deepEqual(result, {
    height: 45,
    ids: ['imageTex_step_1', 'imageTex_step_8'],
    texture,
    width: 80,
  })
  assert.deepEqual(backend.registrations, [
    [
      'imageTex_step_1',
      {
        format: 'external',
        glFormat: null,
        handle: 'host-webgl-texture',
        height: 45,
        width: 80,
      },
      { kind: 'media', ownership: 'external' },
    ],
    [
      'imageTex_step_8',
      {
        format: 'external',
        glFormat: null,
        handle: 'host-webgl-texture',
        height: 45,
        width: 80,
      },
      { kind: 'media', ownership: 'external' },
    ],
  ])
  assert.deepEqual(uniformCalls, [['imageSize', [80, 45]]])
  assert.deepEqual(hostCalls, [])
})

test('disconnect binds transparent default records without deleting the prior host texture', () => {
  const backend = createBackend()
  const uniformCalls = []
  const pipeline = {
    setUniform(...args) {
      uniformCalls.push(args)
    },
  }
  const graph = { passes: [{ inputs: { image: 'imageTex_step_0' } }] }

  const result = bindExternalTexture({ backend, graph, pipeline, texture: null })

  assert.deepEqual(result, {
    height: 1,
    ids: ['imageTex_step_0'],
    texture: null,
    width: 1,
  })
  assert.deepEqual(backend.registrations, [[
    'imageTex_step_0',
    {
      format: 'rgba8',
      glFormat: null,
      handle: 'transparent-default',
      height: 1,
      width: 1,
    },
    { kind: 'media', ownership: 'default' },
  ]])
  assert.deepEqual(uniformCalls, [['imageSize', [1, 1]]])
})

test('rebinding after graph texture recreation replaces every detected record again', () => {
  const backend = createBackend()
  const pipeline = { setUniform() {} }
  const graph = {
    passes: [
      { inputs: { image: 'imageTex_step_1' } },
      { inputs: { image: 'cameraTexture_step_4' } },
    ],
  }
  const texture = { height: 36, tex: 'host-rebound', width: 64 }

  bindExternalTexture({ backend, graph, pipeline, texture })
  bindExternalTexture({ backend, graph, pipeline, texture })

  assert.deepEqual(
    backend.registrations.map(([id, record]) => [id, record.handle]),
    [
      ['imageTex_step_1', 'host-rebound'],
      ['cameraTexture_step_4', 'host-rebound'],
      ['imageTex_step_1', 'host-rebound'],
      ['cameraTexture_step_4', 'host-rebound'],
    ],
  )
})
