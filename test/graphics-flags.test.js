import assert from 'node:assert/strict'
import { test } from 'node:test'

import { graphicsFlags } from '../tools/lib/graphics-flags.js'

const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

test('Linux renders through SwiftShader with the container /dev/shm workaround', () => {
  for (const ci of [true, false]) {
    assert.deepEqual(graphicsFlags({ platform: 'linux', arch: 'x64', ci }), [...SWIFTSHADER, '--disable-dev-shm-usage'])
  }
})

test('Intel macOS CI runners have no usable GPU and render through SwiftShader', () => {
  assert.deepEqual(graphicsFlags({ platform: 'darwin', arch: 'x64', ci: true }), SWIFTSHADER)
})

test('Apple-silicon macOS renders on its Apple GPU through ANGLE Metal, in CI and outside it', () => {
  // Cables Standalone 0.11.0 (Electron 31) cannot create a WebGL context on
  // SwiftShader on GitHub's macos-15 arm64 runner; the runner's virtual
  // Apple GPU is the Metal device Apple-silicon users render on.
  assert.deepEqual(graphicsFlags({ platform: 'darwin', arch: 'arm64', ci: true }), [])
  assert.deepEqual(graphicsFlags({ platform: 'darwin', arch: 'arm64', ci: false }), [])
})

test('macOS outside CI and Windows use the host GPU', () => {
  assert.deepEqual(graphicsFlags({ platform: 'darwin', arch: 'x64', ci: false }), [])
  assert.deepEqual(graphicsFlags({ platform: 'win32', arch: 'x64', ci: true }), [])
})
