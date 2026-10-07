import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'

import { stopChild } from '../tools/lib/stop-child.js'

test('waits for child exit after escalating from SIGTERM to SIGKILL', async () => {
  const child = new EventEmitter()
  const signals = []
  let elapseGrace
  let observeSigkill

  child.exitCode = null
  const sigkillSent = new Promise((resolve) => {
    observeSigkill = resolve
  })
  child.kill = (signal) => {
    signals.push(signal)
    if (signal === 'SIGKILL') observeSigkill()
    return true
  }

  const delay = () => new Promise((resolve) => {
    elapseGrace = resolve
  })
  let settled = false
  const stopped = stopChild(child, { delay, graceMilliseconds: 5 }).then(() => {
    settled = true
  })

  await Promise.resolve()
  assert.deepEqual(signals, ['SIGTERM'])
  assert.equal(settled, false)

  elapseGrace()
  await sigkillSent
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL'])
  assert.equal(settled, false, 'stopChild resolved before the SIGKILL exit event')

  child.exitCode = 0
  child.emit('exit', 0, 'SIGKILL')
  await stopped
  assert.equal(settled, true)
})

test('releases the child stdio pipes once the child is gone', async () => {
  const destroyed = []
  const stream = (name) => ({ destroy: () => destroyed.push(name) })
  const exitedChild = Object.assign(new EventEmitter(), {
    exitCode: 0,
    stderr: stream('stderr'),
    stdin: null,
    stdout: stream('stdout'),
  })
  await stopChild(exitedChild)
  assert.deepEqual(destroyed.sort(), ['stderr', 'stdout'])

  destroyed.length = 0
  const runningChild = Object.assign(new EventEmitter(), {
    exitCode: null,
    stderr: stream('stderr'),
    stdout: stream('stdout'),
  })
  runningChild.kill = () => {
    runningChild.exitCode = 0
    runningChild.emit('exit', 0, null)
    return true
  }
  await stopChild(runningChild, { delay: () => new Promise(() => {}) })
  assert.deepEqual(destroyed.sort(), ['stderr', 'stdout'])
})
