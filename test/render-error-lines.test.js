import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isDriverPerformanceNotice,
  isRenderErrorLine,
  renderErrorLines,
} from '../tools/lib/render-error-lines.js'

// The Apple M4 physical-GPU leg reports this driver advice under a WebGL
// context tag.
const performanceNotice =
  '[.WebGL-0x13000158d00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): ' +
  'GPU stall due to ReadPixels'

test('physical-GPU driver performance notices are not render errors', () => {
  assert.equal(isRenderErrorLine(performanceNotice), false)
  assert.equal(isRenderErrorLine('[.WebGL-0x1]GL Driver Message (OpenGL, Performance, 0, Medium): Program undergoing recompile'), false)
  assert.deepEqual(renderErrorLines([performanceNotice, performanceNotice]), [])
  assert.equal(isDriverPerformanceNotice(performanceNotice), true)
  assert.equal(isDriverPerformanceNotice('[.WebGL-0x1]GL Driver Message (OpenGL, Error, 0, High): x'), false)
})

test('driver messages of other types still fail the smoke', () => {
  const driverError = '[.WebGL-0x1]GL Driver Message (OpenGL, Error, GL_INVALID_OPERATION, High): glDrawArrays: no program'
  const undefinedBehavior = '[.WebGL-0x1]GL Driver Message (OpenGL, Undefined behavior, 0, High): feedback loop'
  assert.equal(isRenderErrorLine(driverError), true)
  assert.equal(isRenderErrorLine(undefinedBehavior), true)
})

test('WebGL errors from a broken shader or draw still fail the smoke', () => {
  const lines = [
    '[.WebGL-0x1]GL_INVALID_OPERATION: glDrawArrays: no valid shader program in use',
    '[.WebGL-0x1]RENDER WARNING: there is no texture bound to the unit 0',
    'WebGL: INVALID_VALUE: uniform4fv: invalid location',
    '[0x1]GL ERROR :GL_INVALID_FRAMEBUFFER_OPERATION : glClear: framebuffer incomplete',
    'Uncaught (in promise) Error: shader compile failed',
    'Unhandled promise rejection: TypeError',
  ]
  assert.deepEqual(renderErrorLines(lines), lines)
})

test('unrelated editor output is ignored', () => {
  assert.deepEqual(renderErrorLines([
    'cables standalone 0.11.3 ready',
    '[smoke] booting reload instance',
    'loaded op Ops.Extension.Noisemaker.Program',
  ]), [])
})
