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
