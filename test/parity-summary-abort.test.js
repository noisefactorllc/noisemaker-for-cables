import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/parity-summary', import.meta.url))

test('a full-catalog abort still reports the authority denominator (expected 210)', async () => {
  // Force an abort after the script's own startup work: an invalid
  // PLAYWRIGHT_BROWSERS_PATH makes chromium.launch throw (or, in environments
  // that forbid binding sockets, the fixture dev server exits before
  // readiness and aborts immediately). Either way the abort summary must keep
  // the no-argument denominator — the authority catalog's 210 cases — instead
  // of reporting expected 0.
  const child = spawn(process.execPath, [script], {
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: '/nonexistent-parity-summary-browsers',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  const code = await new Promise((resolve) => child.on('close', resolve))
  const summaryLine = stdout.trim().split('\n').pop()
  assert.match(summaryLine, /^PARITY-SUMMARY /)
  const counts = JSON.parse(summaryLine.slice('PARITY-SUMMARY '.length))
  assert.equal(counts.expected, 210)
  assert.equal(counts.executed, 0)
  assert.equal(counts.fail, 1)
  assert.equal(code, 1)
}, { timeout: 120_000 })