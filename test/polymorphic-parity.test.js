import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

function installTestDomShim(target = globalThis) {
  target.HTMLElement ||= class {}
  target.customElements ||= {
    define() {},
    get() {},
    whenDefined() {
      return Promise.resolve()
    },
  }
  target.window ||= target
  target.document ||= {
    createElement() {
      return {
        appendChild() {},
        getContext() {
          return null
        },
        setAttribute() {},
        style: {},
      }
    },
    createElementNS() {
      return { style: {} }
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
  }
}

function normalizeCompilerValue(value) {
  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
      .map(([key, entry]) => [key, normalizeCompilerValue(entry)])
  }
  if (ArrayBuffer.isView(value)) return value
  if (Array.isArray(value)) return value.map(normalizeCompilerValue)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => key !== 'compiledAt')
      .sort()
      .map((key) => [key, normalizeCompilerValue(value[key])]),
  )
}

async function createReferenceCompiler() {
  const referenceUrl = new URL(
    '../vendor-cache/noisemaker-shaders-core.esm.js?polymorphic-reference',
    import.meta.url,
  )
  const reference = await import(referenceUrl)
  const manifest = JSON.parse(
    await readFile(new URL('../vendor-cache/effects/manifest.json', import.meta.url), 'utf8'),
  )
  const effectIds = Object.keys(manifest).sort()
  const effects = await Promise.all(
    effectIds.map(async (effectId) => {
      const url = new URL(`../vendor-cache/effects/${effectId}.js`, import.meta.url)
      url.searchParams.set('polymorphic-reference', effectId)
      const exported = (await import(url)).default
      const instance = typeof exported === 'function' ? new exported() : exported
      if (!instance.shaders && exported.shaders) instance.shaders = exported.shaders
      return [effectId, instance]
    }),
  )
  const registrar = new reference.CanvasRenderer()
  await reference.mergeIntoEnums(reference.stdEnums)
  for (const [effectId, instance] of effects) {
    const [namespace, name] = effectId.split('/')
    if (!instance.namespace) instance.namespace = namespace
    const effect = { instance, name, namespace }
    const choices = registrar.registerEffectWithRuntime(effect)
    registrar.registerStarterOpForEffect(effect)
    if (choices && Object.keys(choices).length > 0) {
      await reference.mergeIntoEnums(choices)
    }
  }
  return reference
}

async function captureWarnings(run) {
  const previousWarn = console.warn
  const warnings = []
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    return { value: await run(), warnings }
  } finally {
    console.warn = previousWarn
  }
}

function valueToDsl(value, type) {
  if (type === 'member') return String(value)
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'color') {
    if (typeof value === 'string') return value
    const channels = value.map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel * 255)))
        .toString(16)
        .padStart(2, '0'),
    )
    return `#${channels.join('')}`
  }
  assert.equal(typeof value, 'number', `unsupported ${type} alias value`)
  return String(value)
}

function replaceOrInsertKeyword(program, func, canonicalName, keywordName, value) {
  const callPattern = new RegExp(`\\b${func}\\s*\\(`)
  const match = callPattern.exec(program)
  assert.ok(match, `${func}() is missing from its catalog program`)
  const argsStart = match.index + match[0].length
  let depth = 1
  let argsEnd = argsStart
  let quote = null
  for (; argsEnd < program.length; argsEnd += 1) {
    const character = program[argsEnd]
    if (quote) {
      if (character === '\\') argsEnd += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (depth === 0) break
  }
  assert.ok(argsEnd < program.length, `${func}() has an unterminated argument list`)

  const args = program.slice(argsStart, argsEnd)
  const canonicalPattern = new RegExp(`\\b${canonicalName}(?=\\s*:)`)
  const updatedArgs = canonicalPattern.test(args)
    ? args.replace(canonicalPattern, keywordName)
    : args.trim()
      ? `${keywordName}: ${value}, ${args}`
      : `${keywordName}: ${value}`
  return `${program.slice(0, argsStart)}${updatedArgs}${program.slice(argsEnd)}`
}

async function loadCompatibilityCases() {
  const manifest = JSON.parse(
    await readFile(new URL('../vendor-cache/effects/manifest.json', import.meta.url), 'utf8'),
  )
  const parameterAliases = []
  const deprecatedEffects = []

  for (const effectId of Object.keys(manifest).sort()) {
    const module = await import(`../vendor-cache/effects/${effectId}.js`)
    const definition =
      typeof module.default === 'function' ? new module.default() : module.default
    const func = definition.func || effectId.split('/').at(-1)
    for (const [oldName, newName] of Object.entries(definition.paramAliases || {})) {
      parameterAliases.push({
        definition,
        effectId,
        func,
        metadata: manifest[effectId],
        newName,
        oldName,
      })
    }
    if (definition.hidden && definition.deprecatedBy) {
      deprecatedEffects.push({
        definition,
        deprecatedBy: definition.deprecatedBy,
        effectId,
        func,
        metadata: manifest[effectId],
      })
    }
  }

  return { deprecatedEffects, parameterAliases }
}

test('legacy noiseType parameter compiles with the pinned reference diagnostic', async () => {
  installTestDomShim()
  const dsl = `search synth\n\nnoise(noiseType: 10)\n  .write(o0)\n\nrender(o0)`
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()

  const expected = await captureWarnings(() => reference.compileGraph(dsl))
  const actual = await captureWarnings(() => compileProgram(dsl))

  assert.deepEqual(normalizeCompilerValue(actual.value), normalizeCompilerValue(expected.value))
  assert.deepEqual(actual.warnings, expected.warnings)
  assert.deepEqual(actual.warnings, [
    "[noisemaker] S007: param 'noiseType' is deprecated, use 'type' instead. Aliases will be removed on 2026-09-01.",
  ])
})

test('canonical parameters win over legacy aliases while retaining the native warning', async () => {
  installTestDomShim()
  const dsl = `search synth\n\nnoise(noiseType: 0, type: 10)\n  .write(o0)\n\nrender(o0)`
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()

  const expected = await captureWarnings(() => reference.compileGraph(dsl))
  const actual = await captureWarnings(() => compileProgram(dsl))

  assert.deepEqual(normalizeCompilerValue(actual.value), normalizeCompilerValue(expected.value))
  assert.ok(Object.keys(actual.value.programs).some((name) => name.includes('NOISE_TYPE_10')))
  assert.deepEqual(actual.warnings, expected.warnings)
  assert.deepEqual(actual.warnings, [
    "[noisemaker] S007: param 'noiseType' is deprecated, use 'type' instead. Aliases will be removed on 2026-09-01.",
  ])
})

test('legacy aliases do not leak into a same-named effect in another namespace', async () => {
  installTestDomShim()
  const dsl = `search classicNoisedeck\n\nnoise(xScale: 50, yScale: 50)\n  .write(o0)\n\nrender(o0)`
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()

  const expected = await captureWarnings(() => reference.compileGraph(dsl))
  const actual = await captureWarnings(() => compileProgram(dsl))

  assert.deepEqual(normalizeCompilerValue(actual.value), normalizeCompilerValue(expected.value))
  assert.deepEqual(actual.warnings, expected.warnings)
  assert.deepEqual(actual.warnings, [])
})

test('every pinned legacy parameter alias matches the independently registered reference', async () => {
  installTestDomShim()
  const { createCatalogProgram } = await import('../parity/catalog-inputs.js')
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()
  const { parameterAliases } = await loadCompatibilityCases()

  assert.equal(parameterAliases.length, 84)
  assert.ok(
    parameterAliases.some(
      ({ effectId, newName, oldName }) =>
        effectId === 'synth/noise' && oldName === 'noiseType' && newName === 'type',
    ),
  )

  for (const alias of parameterAliases) {
    const { definition, effectId, func, metadata, newName, oldName } = alias
    const canonical = definition.globals[newName]
    const fixture = createCatalogProgram({ effectId, definition, metadata })
    const dsl = replaceOrInsertKeyword(
      fixture,
      func,
      newName,
      oldName,
      valueToDsl(canonical.default, canonical.type),
    )
    const expected = await captureWarnings(() => reference.compileGraph(dsl))
    const actual = await captureWarnings(() => compileProgram(dsl))

    assert.deepEqual(
      normalizeCompilerValue(actual.value),
      normalizeCompilerValue(expected.value),
      `${effectId} alias ${oldName} diverged from the pinned compiler`,
    )
    assert.deepEqual(
      actual.warnings,
      expected.warnings,
      `${effectId} alias ${oldName} warning diverged from the pinned compiler`,
    )
    assert.ok(
      actual.warnings.includes(
        `[noisemaker] S007: param '${oldName}' is deprecated, use '${newName}' instead. Aliases will be removed on 2026-09-01.`,
      ),
      `${effectId} alias ${oldName} did not emit its deprecation warning`,
    )
  }
})

test('every pinned deprecated effect emits the reference deprecation diagnostic', async () => {
  installTestDomShim()
  const { createCatalogProgram } = await import('../parity/catalog-inputs.js')
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()
  const { deprecatedEffects } = await loadCompatibilityCases()

  assert.deepEqual(
    deprecatedEffects.map(({ effectId, deprecatedBy }) => [effectId, deprecatedBy]),
    [
      ['filter/bc', 'adjust'],
      ['filter/colorspace', 'adjust'],
      ['filter/hs', 'adjust'],
    ],
  )

  for (const deprecated of deprecatedEffects) {
    const { definition, deprecatedBy, effectId, func, metadata } = deprecated
    const dsl = createCatalogProgram({ effectId, definition, metadata })
    const expected = await captureWarnings(() => reference.compileGraph(dsl))
    const actual = await captureWarnings(() => compileProgram(dsl))

    assert.deepEqual(
      normalizeCompilerValue(actual.value),
      normalizeCompilerValue(expected.value),
      `${effectId} diverged from the pinned compiler`,
    )
    assert.deepEqual(
      actual.warnings,
      expected.warnings,
      `${effectId} warning diverged from the pinned compiler`,
    )
    assert.ok(
      actual.warnings.includes(
        `[noisemaker] S008: effect '${func}' is deprecated, use '${deprecatedBy}' instead. Aliases will be removed on 2026-09-01.`,
      ),
      `${effectId} did not emit its deprecation warning`,
    )
  }
})

test('full Polymorphic corpus matches the separately instantiated pinned compiler', async () => {
  installTestDomShim()
  const programs = JSON.parse(
    await readFile(new URL('../parity/programs.json', import.meta.url), 'utf8'),
  )
  const { compileProgram } = await import('../src/runtime/engine.js')
  const reference = await createReferenceCompiler()

  const requiredCases = new Set([
    'starter',
    'named-subchain-and-outputs',
    'feedback',
    'media',
    'points-agents',
    'navier-stokes',
    'reaction-diffusion',
    'volume-cubemap',
    'remap-ubo',
    'mesh',
    'artistic-chain',
  ])
  assert.equal(programs.length, requiredCases.size)
  assert.deepEqual(new Set(programs.map(({ id }) => id)), requiredCases)

  const requiredDslPatterns = {
    'artistic-chain': [/\.chrome\(/, /\.craquelure\(/, /\.oilPaint\(/, /\.watercolor\(/],
    feedback: [/\.feedback\(/],
    media: [/\bmedia\(/],
    mesh: [/\bmeshLoader\(/, /\.meshRender\(/],
    'named-subchain-and-outputs': [/\.subchain\(/, /\.write\(o0\)/, /\.write\(o1\)/, /\.write\(o2\)/, /read\(o0\)/],
    'navier-stokes': [/\bnavierStokes\(/, /tex:\s*read\(o0\)/],
    'points-agents': [/\.pointsEmit\(/, /\.life\(/, /\.pointsRender\(/],
    'reaction-diffusion': [/\breactionDiffusion\(/, /tex:\s*read\(o0\)/],
    'remap-ubo': [/\bremap\(/, /zoneCount:\s*2/, /zone0_tex:\s*read\(o0\)/, /zone1_tex:\s*read\(o1\)/],
    starter: [/\bsolid\(/, /color:\s*#336699/],
    'volume-cubemap': [/\.write3d\(/, /\bread3d\(/, /\.renderCubemap3d\(/],
  }

  for (const { id, dsl } of programs) {
    assert.equal(typeof dsl, 'string', `${id} must provide DSL source`)
    assert.match(dsl, /\brender\s*\(/, `${id} must select a presentation surface`)
    for (const pattern of requiredDslPatterns[id]) {
      assert.match(dsl, pattern, `${id} no longer covers ${pattern}`)
    }
    const actual = await compileProgram(dsl)
    const expected = reference.compileGraph(dsl)
    assert.deepEqual(
      normalizeCompilerValue(actual),
      normalizeCompilerValue(expected),
      `${id} diverged from the pinned compiler`,
    )
  }

  const actualCore = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
  for (const effectId of Object.keys(
    JSON.parse(await readFile(new URL('../vendor-cache/effects/manifest.json', import.meta.url))),
  )) {
    assert.notEqual(
      actualCore.getEffect(effectId),
      reference.getEffect(effectId),
      `${effectId} must use a fresh reference definition`,
    )
  }
})
