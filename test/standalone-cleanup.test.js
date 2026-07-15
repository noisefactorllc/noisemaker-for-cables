import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('temporary Standalone cleanup requests bounded recursive ENOTEMPTY retries', async () => {
  const cleanupModule = await import('../tools/lib/remove-temporary-directory.js')
  const calls = []

  await cleanupModule.removeTemporaryDirectory('/tmp/cables-profile', {
    remove: async (...args) => calls.push(args),
  })

  assert.deepEqual(calls, [[
    '/tmp/cables-profile',
    {
      force: true,
      maxRetries: 10,
      recursive: true,
      retryDelay: 100,
    },
  ]])
})

test('temporary Standalone cleanup propagates a persistent failure after Node exhausts retries', async () => {
  const cleanupModule = await import('../tools/lib/remove-temporary-directory.js')
  const persistent = Object.assign(new Error('profile remains non-empty'), { code: 'ENOTEMPTY' })
  let calls = 0

  await assert.rejects(
    cleanupModule.removeTemporaryDirectory('/tmp/cables-profile', {
      remove: async () => {
        calls += 1
        throw persistent
      },
    }),
    (error) => error === persistent,
  )
  assert.equal(calls, 1)
})

test('Standalone finally cleanup remains browser close then child stop then retried temp removal', async () => {
  const source = await readFile(
    new URL('../tools/standalone-smoke.mjs', import.meta.url),
    'utf8',
  )
  const browserClose = source.lastIndexOf('if (browser) await browser.close(')
  const childStop = source.lastIndexOf('if (child) await stopChild(child)')
  const tempRemoval = source.lastIndexOf('await removeTemporaryDirectory(userDataDirectory)')

  assert.ok(browserClose >= 0, 'browser close is missing from finally cleanup')
  assert.ok(childStop > browserClose, 'child stop must follow browser close')
  assert.ok(tempRemoval > childStop, 'temp removal must follow awaited child stop')
})
