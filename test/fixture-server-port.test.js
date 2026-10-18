import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../test/browser/server.mjs', import.meta.url))

// Candidate fixture ports: the sandboxed macOS GPU host only allows
// listeners on 43117-43126 (binding 0 or 4173 fails with EPERM there), and the
// same range binds fine in ordinary environments. The first candidate the
// server can actually bind wins, so the test never silently skips.
const candidates = Array.from({ length: 10 }, (_, i) => 43117 + i)

// Resolves { child, baseUrl } once the server reports readiness and stays up,
// or null when the environment cannot bind this candidate at all.
const attempt = (candidate) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, CABLES_FIXTURE_PORT: String(candidate) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let out = ''
  let err = ''
  let settled = false
  const stop = (fn) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    fn()
  }
  const timer = setTimeout(() => stop(() => {
    child.kill('SIGTERM')
    child.on('close', () => reject(new Error('server did not report readiness')))
  }), 10_000)
  child.stdout.on('data', (chunk) => {
    out += chunk
    const match = out.match(/listening on (http:\/\/\S+)/)
    if (match) stop(() => resolve({ child, baseUrl: match[1] }))
  })
  child.stderr.on('data', (chunk) => { err += chunk })
  child.on('exit', (code) => {
    const unbindable = ['EPERM', 'EACCES', 'EADDRINUSE']
    if (unbindable.some((name) => err.includes(name))) stop(() => resolve(null))
    else stop(() => reject(new Error(`server exited early (code ${code}): ${err.slice(0, 300)}`)))
  })
})

const stopServer = (child) => new Promise((resolve) => {
  child.once('exit', resolve)
  child.kill('SIGTERM')
})

test('CABLES_FIXTURE_PORT overrides the fixture server port', async () => {
  let running = null
  let baseUrl = null
  let bound = null
  try {
    for (const candidate of candidates) {
      const started = await attempt(candidate)
      if (started !== null) {
        running = started.child
        baseUrl = started.baseUrl
        bound = candidate
        break
      }
    }
    assert.notEqual(baseUrl, null, 'no bindable fixture port among candidates')
    const port = Number(new URL(baseUrl).port)
    assert.notEqual(port, 0)
    assert.equal(port, bound)
    const response = await fetch(`${baseUrl}/test/browser/fixture.html`)
    assert.equal(response.status, 200)
    await response.arrayBuffer()
  } finally {
    if (running) await stopServer(running)
  }
}, { timeout: 120_000 })