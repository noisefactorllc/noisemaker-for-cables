import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

function installTestDomShim(target = globalThis) {
  target.HTMLElement ||= class {}
  target.customElements ||= { define() {}, get() {}, whenDefined: () => Promise.resolve() }
  target.window ||= target
  target.document ||= {
    createElement: () => ({ appendChild() {}, getContext: () => null, style: {} }),
    createElementNS: () => ({ style: {} }),
    head: { appendChild() {} },
    body: { appendChild() {} },
  }
}

test('every locked effect has an explicit valid Polymorphic catalog program', async () => {
  installTestDomShim()
  const manifest = JSON.parse(
    await readFile(new URL('../vendor-cache/effects/manifest.json', import.meta.url), 'utf8'),
  )
  const effectIds = Object.keys(manifest).sort()
  const { compileProgram } = await import('../src/runtime/engine.js')
  const { createCatalogProgram } = await import('../parity/catalog-inputs.js')

  assert.equal(effectIds.length, 210)
  const compiled = []
  const failures = []

  for (const effectId of effectIds) {
    try {
      const module = await import(`../vendor-cache/effects/${effectId}.js`)
      const definition =
        typeof module.default === 'function' ? new module.default() : module.default
      const fixture = createCatalogProgram({ effectId, definition, metadata: manifest[effectId] })
      assert.equal(typeof fixture, 'string', `${effectId} fixture must be a DSL string`)
      assert.ok(fixture.trim(), `${effectId} fixture must not be empty`)
      const surfaceInputs = Object.entries(definition.globals || {})
        .filter(([, spec]) => spec?.type === 'surface')
        .map(([name]) => name)
      for (const name of surfaceInputs) {
        const connection = fixture.match(
          new RegExp(`\\b${name}\\s*:\\s*read\\s*\\(\\s*(o[0-7])\\s*\\)`),
        )
        assert.match(
          fixture,
          new RegExp(`\\b${name}\\s*:\\s*read\\s*\\(`),
          `${effectId} fixture leaves surface input ${name} disconnected`,
        )
        assert.ok(connection, `${effectId} fixture must connect ${name} to o0-o7`)
      }
      const graph = await compileProgram(fixture)
      const expectedKey = `${definition.namespace}.${definition.func}`
      const targetPasses = graph.passes.filter((pass) => pass.effectKey === expectedKey)
      assert.ok(
        targetPasses.length > 0,
        `${effectId} fixture did not compile the target effect ${expectedKey}`,
      )
      for (const name of surfaceInputs) {
        const surface = fixture.match(
          new RegExp(`\\b${name}\\s*:\\s*read\\s*\\(\\s*(o[0-7])\\s*\\)`),
        )[1]
        assert.ok(
          targetPasses.some((pass) =>
            Object.values(pass.inputs || {}).includes(`global_${surface}`),
          ),
          `${effectId} did not connect compiled surface input ${name}`,
        )
      }
      assert.ok(graph.renderSurface, `${effectId} fixture has no presentation target`)
      compiled.push(effectId)
    } catch (error) {
      failures.push(`${effectId}: ${error?.stack || error}`)
    }
  }

  assert.deepEqual(compiled, effectIds, failures.join('\n\n'))
  assert.equal(compiled.length, 210, '210/210 catalog programs compiled')
})
