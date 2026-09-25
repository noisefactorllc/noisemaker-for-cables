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

function sourcePosition(lex, source, line, column) {
  const matches = lex(source).filter(
    (token) => token.position && token.position.line === line && token.position.column === column,
  )
  assert.ok(matches.length <= 1, `expected at most 1 token match for (${line}, ${column}) in source`)
  if (matches.length === 0) return null
  return { start: matches[0].position.start, end: matches[0].position.end }
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
    [],
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

test('public compiler rejects output surfaces outside o0-o7 in every DSL position', async () => {
  const core = await import('../vendor-cache/noisemaker-shaders-core.esm.js')
  const { compile } = core

  assert.throws(
    () => compile('search synth\nnoise().write(o0)\nrender(o8)'),
    /Output surface reference 'o8' is out of range; expected o0-o7/,
  )
  assert.throws(
    () => compile('search synth\nread(o99).write(o0)\nrender(o0)'),
    /Output surface reference 'o99' is out of range; expected o0-o7/,
  )
  assert.throws(
    () => compile('search synth\nnoise().write(o10)\nrender(o0)'),
    /Output surface reference 'o10' is out of range; expected o0-o7/,
  )

  const boundary = compile('search synth\nread(o0).write(o7)\nrender(o7)')
  assert.deepEqual(boundary.plans[0].chain[0].args.tex, { kind: 'output', name: 'o0' })
  assert.deepEqual(boundary.plans[0].write, { kind: 'output', name: 'o7' })
  assert.equal(boundary.render, 'o7')

  const memberSegments = compile(`search synth
let low = foo.o0
let high = foo.o7
let extended = foo.o8
let many = foo.o99
let source = s99
let vol = vol99
let geo = geo99
let xyz = xyz99
let vel = vel99
let rgba = rgba99
let mesh = mesh99`)
  assert.deepEqual(
    memberSegments.vars.map(({ expr }) => expr.path || expr.name),
    [
      ['foo', 'o0'],
      ['foo', 'o7'],
      ['foo', 'o8'],
      ['foo', 'o99'],
      's99',
      'vol99',
      'geo99',
      'xyz99',
      'vel99',
      'rgba99',
      'mesh99',
    ],
  )
})

test('mutation introspection excludes builtin pipeline steps', async () => {
  const core = await createReferenceCompiler()
  const { compile, listSteps, replaceEffect, getCompatibleReplacements } = core

  const compiled = compile('search synth, filter\nnoise(10).bloom(0.5).write(o0)')
  const steps = listSteps(compiled)

  assert.equal(steps.length, 2, 'Should have 2 editable effect steps')
  assert.equal(steps[0].effectName, 'synth.noise')
  assert.equal(steps[0].stepIndex, 0)
  assert.equal(steps[1].effectName, 'filter.bloom')
  assert.equal(steps[1].stepIndex, 1)

  const builtinStep = compiled.plans[0].chain.find((step) => step.builtin)
  assert.ok(builtinStep, 'Compiled plan should contain a builtin blit/write step')

  const replaceResult = replaceEffect(compiled, builtinStep.temp, 'blur')
  assert.equal(replaceResult.success, false)
  assert.equal(replaceResult.error, `Step with index ${builtinStep.temp} not found`)

  const compatResult = getCompatibleReplacements(compiled, builtinStep.temp)
  assert.equal(compatResult.success, false)
  assert.equal(compatResult.error, `Step with index ${builtinStep.temp} not found`)
})

test('diagnostic locations preserve source columns', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, validate } = core

  const result = compile('search synth\n  read(123).write(o0)')
  assert.deepEqual(
    result.diagnostics.map((d) => ({ code: d.code, location: d.location })),
    [
      { code: 'S001', location: { line: 2, column: 3 } },
      { code: 'S005', location: { line: 2, column: 13 } },
    ],
  )

  const ast = parse(lex('search synth\n  read(123).write(o0)'))
  ast.plans[0].chain[0].loc.column = 9
  const customLocResult = validate(ast)
  assert.deepEqual(customLocResult.diagnostics[0].location, { line: 2, column: 9 })

  const unlocatedResult = compile('search synth\n  missing().write(o0)')
  const missingDiag = unlocatedResult.diagnostics.find((d) => d.identifier === 'missing')
  assert.equal(missingDiag.code, 'S001')
  assert.equal(Object.hasOwn(missingDiag, 'location'), false)
})

test('structured DSL lexer diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex } = core

  const cases = [
    {
      source: '@',
      code: 'L001',
      stage: 'lexer',
      severity: 'error',
      message: "Unexpected character '@' at line 1 col 1",
      location: { line: 1, column: 1 },
      span: { start: 0, end: 1 },
    },
    {
      source: '"unterminated',
      code: 'L002',
      stage: 'lexer',
      severity: 'error',
      message: 'Unterminated string literal at line 1 col 1',
      location: { line: 1, column: 1 },
      span: { start: 0, end: 13 },
    },
    {
      source: '/* unclosed',
      code: 'L003',
      stage: 'lexer',
      severity: 'error',
      message: 'Unterminated comment at line 1 col 1',
      location: { line: 1, column: 1 },
      span: { start: 0, end: 11 },
    },
    {
      source: 'search synth\nrender(o99)',
      code: 'L004',
      stage: 'lexer',
      severity: 'error',
      message: "Output surface reference 'o99' is out of range; expected o0-o7 at line 2 col 8",
      location: { line: 2, column: 8 },
      span: { start: 20, end: 23 },
    },
  ]

  for (const { source, code, stage, severity, message, location, span } of cases) {
    for (const entryPoint of [lex, compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          assert.deepEqual(err.diagnostic, { code, stage, severity, message, location, span })
          return true
        },
      )
    }
  }
})

test('structured DSL parser expectation diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse } = core

  const parserExpectFailures = [
    ['identifier', 'search synth\nlet = 1', 'P001', 'Expected identifier at line 2 col 5', 2, 5],
    ['assignment sign', 'search synth\nlet x 1', 'P001', "Expect '=' at line 2 col 7", 2, 7],
    ['block opening', 'search synth\nif(true) return 1', 'P001', "Expect '{' at line 2 col 10", 2, 10],
    ['end of input', 'search synth\nrender(o0) xyz', 'P001', 'Expected end of input at line 2 col 12', 2, 12],
    ['call closing parenthesis', 'search synth\nfoo(1', 'P002', "Expect ')' at line 2 col 6", 2, 6],
    [
      'write3d separator',
      'search synth\nfoo().write3d(tex3d0 geo0)',
      'P001',
      "Expect ',' between tex3d and geo in write3d() at line 2 col 22",
      2,
      22,
    ],
    ['CRLF and tab', '// 😀\r\nsearch synth\r\n\trender(o0', 'P002', "Expect ')' at line 3 col 11", 3, 11],
    ['UTF-16 column', 'search synth\nlet x = "😀"; render o0', 'P001', "Expect '(' at line 2 col 22", 2, 22],
  ]

  for (const [, source, code, message, line, column] of parserExpectFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code,
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser expectation diagnostics represent unavailable caller-token coordinates explicitly', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse } = core

  for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
    const tokens = lex('search synth\nrender o0').map((token) => {
      if (token.type !== 'OUTPUT_REF') return token
      return { type: token.type, lexeme: token.lexeme, ...coordinates }
    })
    assert.throws(
      () => parse(tokens),
      (err) => {
        assert.equal(err.message, `Expect '(' at line ${coordinates.line} col ${coordinates.col}`)
        assert.deepEqual(err.diagnostic, {
          code: 'P001',
          stage: 'parser',
          severity: 'error',
          message: err.message,
          location: null,
          span: null,
        })
        return true
      },
    )
  }
})

test('renderLandscape3d filtering modes match the vendored reference compiler and select expected defines', async () => {
  installTestDomShim()
  const reference = await createReferenceCompiler()
  const { compileProgram } = await import('../src/browser.js')

  const isosurfaceProgram =
    'search synth, synth3d, render\n\nheightmap3d(heightTex: read(o1), tex: read(o2)).renderLandscape3d(filtering: isosurface).write(o0)\n\nrender(o0)'
  const voxelProgram =
    'search synth, synth3d, render\n\nheightmap3d(heightTex: read(o1), tex: read(o2)).renderLandscape3d(filtering: voxel).write(o0)\n\nrender(o0)'

  for (const [program, expectedFiltering] of [[isosurfaceProgram, 0], [voxelProgram, 1]]) {
    const expected = await captureWarnings(() => reference.compileGraph(program))
    const actual = await captureWarnings(() => compileProgram(program))

    assert.deepEqual(normalizeCompilerValue(actual.value), normalizeCompilerValue(expected.value))
    assert.deepEqual(actual.warnings, expected.warnings)

    const pass = actual.value.passes.find((p) => p.effectFunc === 'renderLandscape3d')
    assert.ok(pass, 'renderLandscape3d pass found')
    assert.equal(actual.value.programs[pass.program].defines.FILTERING, expectedFiltering)
  }
})

test('structured DSL automation diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse } = core

  const automationFailures = [
    ['osc(type: oscKind.sine, bogus: 1)', "osc() unknown parameter 'bogus'", '. Valid: type, min, max, speed, offset, seed'],
    ['midi(1, 2, 3, 4, 5, 6)', 'midi() name, id, cc, nrpn, zone and members are keyword-only', ''],
    ['midi(bogus: 1)', "midi() unknown parameter 'bogus'", '. Valid: channel, mode, min, max, sensitivity, name, id, cc, nrpn, zone, members'],
    ['midi(1, 2, 3, 4, 5, channel: 1)', 'midi() has an excess positional argument', ''],
    ['midi()', "midi() requires 'channel' or 'zone' argument", ''],
    ['midi(1, zone: 1)', "midi() 'channel' and 'zone' are mutually exclusive", ''],
    ['midi(1, members: 2)', "midi() 'members' requires 'zone'", ''],
    ['midi(1, id: "port")', "midi() 'id' requires readable 'name'", ''],
    ['midi(1, name: 1)', "midi() 'name' requires a quoted string", ''],
    ['midi(1, name: "")', "midi() 'name' must not be empty", ''],
    ['midi(1, name: "port", id: 1)', "midi() 'id' requires a quoted string", ''],
    ['midi(1, name: "port", id: "")', "midi() 'id' must not be empty", ''],
    ['audio(1, 2, 3, 4)', 'audio() channel, name and id are keyword-only', ''],
    ['audio(bogus: 1)', "audio() unknown parameter 'bogus'", '. Valid: band, min, max, channel, name, id'],
    ['audio(1, 2, 3, band: 1)', 'audio() has an excess positional argument', ''],
    ['audio()', "audio() requires 'band' argument", ''],
    ['audio(1, id: "device")', "audio() 'id' requires readable 'name'", ''],
    ['audio(1, name: "device")', "audio() selected device requires both 'name' and 'channel'", ''],
    ['audio(1, channel: 1, name: 1)', "audio() 'name' requires a quoted string", ''],
    ['audio(1, channel: 1, name: "")', "audio() 'name' must not be empty", ''],
    ['audio(1, channel: 1, name: "device", id: 1)', "audio() 'id' requires a quoted string", ''],
    ['audio(1, channel: 1, name: "device", id: "")', "audio() 'id' must not be empty", ''],
  ]

  for (const [invocation, prefix, suffix = ''] of automationFailures) {
    const source = `search synth\nlet x = ${invocation}`
    const message = `${prefix} at line 2 col 9${suffix}`
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P003',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line: 2, column: 9 },
            span: sourcePosition(lex, source, 2, 9),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser automation diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse } = core

  for (const invocation of ['osc(type: 1, bogus: 1)', 'midi()', 'audio()']) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(`search synth\nlet x = ${invocation}`).map((token) => {
        if (!['osc', 'midi', 'audio'].includes(token.lexeme)) return token
        return { type: token.type, lexeme: token.lexeme, ...coordinates }
      })
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.ok(err.message.includes(`at line ${coordinates.line} col ${coordinates.col}`))
          assert.deepEqual(err.diagnostic, {
            code: 'P003',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('valid automation invocations retain AST defaults and keys', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse } = core

  const source = 'search synth\nlet a = osc(); let b = midi(1); let c = audio(audioBand.low)'
  assert.deepEqual(
    parse(lex(source)).vars.map((variable) => variable.expr),
    [
      {
        type: 'Oscillator',
        oscType: { type: 'Member', path: ['oscKind', 'sine'] },
        min: { type: 'Number', value: 0 },
        max: { type: 'Number', value: 1 },
        speed: { type: 'Number', value: 1 },
        offset: { type: 'Number', value: 0 },
        seed: { type: 'Number', value: 1 },
        loc: { line: 2, col: 9 },
      },
      {
        type: 'Midi',
        channel: { type: 'Number', value: 1 },
        mode: { type: 'Member', path: ['midiMode', 'velocity'] },
        min: { type: 'Number', value: 0 },
        max: { type: 'Number', value: 1 },
        sensitivity: { type: 'Number', value: 1 },
        cc: undefined,
        nrpn: undefined,
        zone: undefined,
        members: undefined,
        name: undefined,
        id: undefined,
        loc: { line: 2, col: 24 },
      },
      {
        type: 'Audio',
        band: { type: 'Member', path: ['audioBand', 'low'] },
        min: { type: 'Number', value: 0 },
        max: { type: 'Number', value: 1 },
        channel: undefined,
        name: undefined,
        id: undefined,
        loc: { line: 2, col: 41 },
      },
    ],
  )
})

test('structured DSL search directive diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse } = core

  const missingSearchMessage =
    "Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order."
  const searchFailures = [
    ['empty program', '', missingSearchMessage, 1, 1],
    ['missing directive after statements', 'let x = 1', missingSearchMessage, 1, 10],
    [
      'duplicate directive',
      'search synth search filter',
      'Only one search directive is allowed per program at line 1 col 14',
      1,
      14,
    ],
    [
      'invalid namespace',
      'search bogus',
      "Invalid namespace 'bogus' at line 1 col 8. Valid namespaces: io, classicNoisedeck, synth, mixer, filter, render, points, synth3d, filter3d, user",
      1,
      8,
    ],
    ['missing first namespace', 'search', 'Expected namespace identifier after search at line 1 col 7', 1, 7],
    ['missing additional namespace', 'search synth,', 'Expected namespace identifier after comma at line 1 col 14', 1, 14],
    [
      'misplaced directive',
      'let x = 1; search synth',
      "'search' directive must appear before other statements at line 1 col 12",
      1,
      12,
    ],
    [
      'nested directive',
      'search synth\nif(true) { search filter }',
      "'search' directive is only allowed at the start of the program at line 2 col 12",
      2,
      12,
    ],
    ['CRLF and tab', '// 😀\r\n\tsearch 1', 'Expected namespace identifier after search at line 2 col 9', 2, 9],
    [
      'UTF-16 column',
      'search synth\nlet x = "😀"; search filter',
      "'search' directive must appear before other statements at line 2 col 15",
      2,
      15,
    ],
  ]

  for (const [, source, message, line, column] of searchFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P004',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser search diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse } = core

  const missingSearchMessage =
    "Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order."
  const searchFailures = [
    ['empty program', '', missingSearchMessage, 1, 1],
    ['missing directive after statements', 'let x = 1', missingSearchMessage, 1, 10],
    [
      'duplicate directive',
      'search synth search filter',
      'Only one search directive is allowed per program at line 1 col 14',
      1,
      14,
    ],
  ]

  for (const [, source] of searchFailures) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(source).map(({ type, lexeme }) => ({ type, lexeme, ...coordinates }))
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.deepEqual(err.diagnostic, {
            code: 'P004',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('valid search directives retain namespace order, keyword namespaces, and compiled indexes', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const source = '/* leading */ search render, synth, synth; diagProbe().write(o0)'
  const ast = parse(lex(source))
  assert.deepEqual(ast.namespace.searchOrder, ['render', 'synth', 'synth'])
  const result = compile(source)
  assert.deepEqual(result.searchNamespaces, ['render', 'synth', 'synth'])
  assert.deepEqual(result.diagnostics, [])
  assert.deepEqual(result.plans[0].chain, [
    { op: 'synth.diagProbe', args: {}, from: null, temp: 0 },
    { op: '_write', args: { tex: { kind: 'output', name: 'o0' } }, from: 0, temp: 1, builtin: true },
  ])
  assert.deepEqual(Object.keys(result).sort(), ['diagnostics', 'plans', 'render', 'searchNamespaces', 'vars'])
})

test('structured DSL output validation diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const outputFailures = [
    ['invalid render target', 'search synth\nrender(1)', 'Expected output reference in render()', 2, 8],
    ['render target at EOF', 'search synth\nrender(', 'Expected output reference in render()', 2, 8],
    [
      'write in expression',
      'search synth\nlet x = diagProbe().write(o0)',
      "'.write()' is only allowed in statement context at line 2 col 21",
      2,
      21,
    ],
    [
      'write3d in expression',
      'search synth\nlet x = diagProbe().write3d(vol0, geo0)',
      "'.write()' is only allowed in statement context at line 2 col 21",
      2,
      21,
    ],
    [
      'missing write surface',
      'search synth\ndiagProbe().write()',
      'write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 19',
      2,
      19,
    ],
    [
      'write surface at EOF',
      'search synth\ndiagProbe().write(',
      'write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 19',
      2,
      19,
    ],
    [
      'invalid write surface',
      'search synth\ndiagProbe().write(1)',
      'write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line 2 col 19',
      2,
      19,
    ],
    [
      'invalid write3d texture',
      'search synth\ndiagProbe().write3d(1, geo0)',
      'Expected tex3d reference in write3d() at line 2 col 21',
      2,
      21,
    ],
    [
      'write3d texture at EOF',
      'search synth\ndiagProbe().write3d(',
      'Expected tex3d reference in write3d() at line 2 col 21',
      2,
      21,
    ],
    [
      'invalid write3d geometry',
      'search synth\ndiagProbe().write3d(vol0, 1)',
      'Expected geo reference in write3d() at line 2 col 27',
      2,
      27,
    ],
    [
      'write3d geometry at EOF',
      'search synth\ndiagProbe().write3d(vol0,',
      'Expected geo reference in write3d() at line 2 col 26',
      2,
      26,
    ],
    ['CRLF and tab render target', '// 😀\r\nsearch synth\r\n\trender("😀")', 'Expected output reference in render()', 3, 9],
    [
      'UTF-16 render target column',
      'search synth\nlet x = "😀"; render(none)',
      'Expected output reference in render()',
      2,
      22,
    ],
  ]

  for (const [, source, message, line, column] of outputFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P005',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser output diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const outputFailures = [
    'search synth\nrender(1)',
    'search synth\nlet x = diagProbe().write(o0)',
    'search synth\ndiagProbe().write(1)',
    'search synth\ndiagProbe().write3d(1, geo0)',
    'search synth\ndiagProbe().write3d(vol0, 1)',
  ]

  for (const source of outputFailures) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(source).map(({ type, lexeme }) => ({ type, lexeme, ...coordinates }))
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.deepEqual(err.diagnostic, {
            code: 'P005',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('structured DSL subchain validation diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const subchainFailures = [
    [
      'non-string argument',
      'search synth\nread(o0).subchain(name: 1) { .diagProbe() }',
      'Expected string value for subchain name at line 2 col 25',
      2,
      25,
    ],
    [
      'argument at EOF',
      'search synth\nread(o0).subchain(name:',
      'Expected string value for subchain name at line 2 col 24',
      2,
      24,
    ],
    [
      'missing body dot',
      'search synth\nread(o0).subchain() { diagProbe() }',
      "Expected '.' before chain element in subchain body at line 2 col 23",
      2,
      23,
    ],
    [
      'body at EOF',
      'search synth\nread(o0).subchain() {',
      "Expected '.' before chain element in subchain body at line 2 col 22",
      2,
      22,
    ],
    [
      'empty body',
      'search synth\nread(o0).subchain() {}',
      'Subchain body cannot be empty at line 2 col 10',
      2,
      10,
    ],
    [
      'comment-only body',
      'search synth\nread(o0).subchain() { /* empty */ }',
      'Subchain body cannot be empty at line 2 col 10',
      2,
      10,
    ],
    [
      'CRLF tab and UTF-16 argument',
      '// 😀\r\nsearch synth\r\n\tread(o0).subchain(name: "😀", id: 1) { .diagProbe() }',
      'Expected string value for subchain id at line 3 col 36',
      3,
      36,
    ],
    [
      'missing dot after comment',
      'search synth\nread(o0).subchain() { /* 😀 */ missing() }',
      "Expected '.' before chain element in subchain body at line 2 col 32",
      2,
      32,
    ],
    [
      'unclosed nonempty body',
      'search synth\nread(o0).subchain() { .diagProbe()',
      "Expected '.' before chain element in subchain body at line 2 col 35",
      2,
      35,
    ],
  ]

  for (const [, source, message, line, column] of subchainFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P006',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser subchain diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const subchainFailures = [
    'search synth\nread(o0).subchain(name: 1) { .diagProbe() }',
    'search synth\nread(o0).subchain() { diagProbe() }',
    'search synth\nread(o0).subchain() {}',
  ]

  for (const source of subchainFailures) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(source).map(({ type, lexeme }) => ({ type, lexeme, ...coordinates }))
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.deepEqual(err.diagnostic, {
            code: 'P006',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('valid subchains preserve permissive arguments, defaults, body and compiled indexes', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp } = core

  registerOp('synth.diagFilter', { name: 'diagFilter', args: [] })

  for (const [args, name, id] of [
    ['', null, null],
    ['"positional"', 'positional', null],
    ['name: "named", id: "s"', 'named', 's'],
    ['foo: "x" name: "a" name: "b" id: "s"', 'b', 's'],
  ]) {
    const source = `search synth\nread(o0).subchain(${args}) { .diagFilter() }.write(o1)`
    const ast = parse(lex(source))
    assert.deepEqual(ast.plans[0].chain[1], {
      type: 'Subchain',
      name,
      id,
      body: [{ type: 'Call', name: 'diagFilter', args: [] }],
      loc: { line: 2, col: 10 },
    })
    const result = compile(source)
    assert.deepEqual(
      result.diagnostics.map((d) => d.code),
      args.includes('foo') ? ['P008', 'P010', 'P010', 'P009', 'P010'] : [],
    )
    assert.deepEqual(result.plans[0].chain, [
      { op: '_read', args: { tex: { kind: 'output', name: 'o0' } }, from: null, temp: 0, builtin: true },
      { op: '_subchain_begin', args: { name, id }, from: 0, temp: 1, builtin: true },
      { op: 'synth.diagFilter', args: {}, from: 1, temp: 2 },
      { op: '_subchain_end', args: { name, id }, from: 2, temp: 3, builtin: true },
      { op: '_write', args: { tex: { kind: 'output', name: 'o1' } }, from: 3, temp: 4, builtin: true },
    ])
    assert.equal(result.render, null)
  }
})

test('subchain syntax preserves shared expectation diagnostic precedence', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse } = core

  for (const [source, code, message] of [
    ['search synth\nread(o0).subchain(1) {}', 'P002', "Expect ')' after subchain arguments at line 2 col 19"],
    ['search synth\nread(o0).subchain() { . }', 'P001', 'Expected identifier at line 2 col 25'],
  ]) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.message, message)
          assert.equal(err.diagnostic.code, code)
          return true
        },
      )
    }
  }
})

test('structured DSL call form diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerOp('synth.probe', { name: 'probe', args: [] })
  registerStarterOps(['synth.diagProbe', 'synth.probe'])

  const callFormFailures = [
    ['from named arguments', 'search synth\nlet x = from(a: 1, b: 2)', "'from' does not support named arguments at line 2 col 9", 2, 9],
    ['from missing second argument', 'search synth\nlet x = from(synth)', "'from' requires exactly two arguments (namespace, call) at line 2 col 9", 2, 9],
    ['from namespace not an identifier', 'search synth\nlet x = from(1, probe())', "'from' namespace argument must be an identifier at line 2 col 9", 2, 9],
    ['from second argument not a call', 'search synth\nlet x = from(synth, 1)', "'from' second argument must be a call expression at line 2 col 9", 2, 9],
    ['inline namespace', 'search synth\nnd.noise()', "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead, at line 2 col 1", 2, 1],
    ['positional then keyword', 'search synth\ndiagProbe(1, x: 2)', 'Cannot mix positional and keyword arguments at line 2 col 14', 2, 14],
    ['keyword then positional', 'search synth\ndiagProbe(x: 1, 2)', 'Cannot mix positional and keyword arguments at line 2 col 17', 2, 17],
    ['CRLF tab and UTF-16', '// 😀\r\nsearch synth\r\n\tdiagProbe(1, x: 2)', 'Cannot mix positional and keyword arguments at line 3 col 15', 3, 15],
    ['UTF-16 inline namespace column', 'search synth\nlet x = "😀"; nd.noise()', "Inline namespace syntax 'nd.noise()' is not allowed. Use 'search nd' at the start of the program instead, at line 2 col 15", 2, 15],
  ]

  for (const [, source, message, line, column] of callFormFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P007',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser call form diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerOp('synth.probe', { name: 'probe', args: [] })
  registerStarterOps(['synth.diagProbe', 'synth.probe'])

  const callFormFailures = [
    'search synth\nlet x = from(a: 1, b: 2)',
    'search synth\nlet x = from(synth)',
    'search synth\nlet x = from(1, probe())',
    'search synth\nlet x = from(synth, 1)',
    'search synth\nnd.noise()',
    'search synth\ndiagProbe(1, x: 2)',
    'search synth\ndiagProbe(x: 1, 2)',
  ]

  for (const source of callFormFailures) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(source).map(({ type, lexeme }) => ({ type, lexeme, ...coordinates }))
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.deepEqual(err.diagnostic, {
            code: 'P007',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('structured DSL remaining expectation diagnostics attach diagnostic metadata to thrown SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const remainingExpectFailures = [
    ['expected expression in assignment', 'search synth\nlet x = ;', "Expected expression after '=' at line 2 col 9", 2, 9],
    ['expected expression in keyword argument', 'search synth\ndiagProbe(a: )', "Expected expression after '=' at line 2 col 14", 2, 14],
    ['expected closing bracket', 'search synth\nlet x = [1 2]', "Expected ']' at line 2 col 12", 2, 12],
    ['expected identifier after dot', 'search synth\nlet x = foo.+', "Expected identifier after '.' at line 2 col 13", 2, 13],
    ['unexpected primary token', 'search synth\ndiagProbe(; 1)', 'Unexpected token SEMICOLON at line 2 col 11', 2, 11],
    ['UTF-16 column', 'search synth\nlet x = "😀"; let y = [1 2]', "Expected ']' at line 2 col 26", 2, 26],
  ]

  for (const [, source, message, line, column] of remainingExpectFailures) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, message)
          const expected = {
            code: 'P001',
            stage: 'parser',
            severity: 'error',
            message,
            location: { line, column },
            span: sourcePosition(lex, source, line, column),
          }
          assert.deepEqual(err.diagnostic, expected)
          return true
        },
      )
    }
  }
})

test('parser remaining expectation diagnostics preserve unavailable caller-token coordinates', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const remainingExpectFailures = [
    'search synth\nlet x = ;',
    'search synth\ndiagProbe(a: )',
    'search synth\nlet x = [1 2]',
    'search synth\nlet x = foo.+',
    'search synth\ndiagProbe(; 1)',
  ]

  for (const source of remainingExpectFailures) {
    for (const coordinates of [{}, { line: 1 }, { line: 0, col: 1 }, { line: 1, col: NaN }]) {
      const tokens = lex(source).map(({ type, lexeme }) => ({ type, lexeme, ...coordinates }))
      assert.throws(
        () => parse(tokens),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.deepEqual(err.diagnostic, {
            code: 'P001',
            stage: 'parser',
            severity: 'error',
            message: err.message,
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }
})

test('number coercion diagnostics represent unavailable locations explicitly and preserve available locations', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  for (const source of ['search synth\nlet x = 1 + o0', 'search synth\nlet x = diagProbe() + 1']) {
    for (const entryPoint of [(src) => parse(lex(src)), compile]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.message, 'Expected number')
          assert.deepEqual(err.diagnostic, {
            code: 'P001',
            stage: 'parser',
            severity: 'error',
            message: 'Expected number',
            location: null,
            span: null,
          })
          return true
        },
      )
    }
  }

  const locatedSource = 'search synth\nlet x = 1 + [1, 2]'
  for (const entryPoint of [(src) => parse(lex(src)), compile]) {
    assert.throws(
      () => entryPoint(locatedSource),
      (err) => {
        assert.equal(err.name, 'SyntaxError')
        assert.equal(err.message, 'Expected number')
        assert.deepEqual(err.diagnostic, {
          code: 'P001',
          stage: 'parser',
          severity: 'error',
          message: 'Expected number',
          location: { line: 2, column: 13 },
          span: sourcePosition(lex, locatedSource, 2, 13),
        })
        return true
      },
    )
  }
})

test('valid call forms retain from override namespaces and mixed automation arguments', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.probe', { name: 'probe', args: [] })
  registerStarterOps(['synth.probe'])

  const ast = parse(lex('search synth\nlet x = from(synth, probe())'))
  assert.deepEqual(ast.vars[0].expr, {
    type: 'Call',
    name: 'probe',
    args: [],
    namespace: {
      name: 'synth',
      path: ['synth'],
      explicit: true,
      source: 'from',
      resolved: 'synth',
      searchOrder: ['synth'],
      fromOverride: true,
    },
  })

  const mixed = parse(lex('search synth\nlet a = midi(1, channel: 2)'))
  assert.equal(mixed.vars[0].expr.channel.value, 2)
})

test('GAP-027: subchain argument validation contract exposes P008, P009, P010 diagnostics in permissive mode', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerOp('synth.diagFilter', { name: 'diagFilter', args: [] })
  registerStarterOps(['synth.diagProbe'])

  // P008: unknown subchain key reported as warning, discarded from AST
  const p008Source = 'search synth\nread(o0).subchain(nme: "typo", name: "ok") { .diagFilter() }.write(o1)'
  const p008Result = compile(p008Source)
  const p008Subchain = p008Result.plans[0].chain.find((step) => step.op === '_subchain_begin')
  assert.equal(p008Subchain.args.name, 'ok')
  assert.equal(p008Subchain.args.id, null)
  const p008Diags = p008Result.diagnostics.filter((d) => d.code === 'P008')
  assert.equal(p008Diags.length, 1)
  assert.match(p008Diags[0].message, /nme/)
  assert.equal(p008Diags[0].severity, 'warning')
  assert.deepEqual(p008Diags[0].location, { line: 2, column: 19 })
  const p008Ast = parse(lex(p008Source))
  const p008Node = p008Ast.plans[0].chain.find((node) => node.type === 'Subchain')
  assert.equal(p008Node.subchainArgumentDiagnostics.length, 1)
  assert.deepEqual(p008Node.subchainArgumentDiagnostics[0].span, sourcePosition(lex, p008Source, 2, 19))

  // P009: duplicate subchain key reported as warning, last value wins
  const p009Source = 'search synth\nread(o0).subchain(name: "first", name: "second") { .diagFilter() }.write(o1)'
  const p009Result = compile(p009Source)
  const p009Subchain = p009Result.plans[0].chain.find((step) => step.op === '_subchain_begin')
  assert.equal(p009Subchain.args.name, 'second')
  const p009Diags = p009Result.diagnostics.filter((d) => d.code === 'P009')
  assert.equal(p009Diags.length, 1)
  assert.match(p009Diags[0].message, /name/)
  assert.equal(p009Diags[0].severity, 'warning')
  assert.deepEqual(p009Diags[0].location, { line: 2, column: 34 })

  // P010: missing comma separator reported as warning, parses successfully
  const p010Source = 'search synth\nread(o0).subchain(name: "a" id: "b") { .diagFilter() }.write(o1)'
  const p010Result = compile(p010Source)
  const p010Subchain = p010Result.plans[0].chain.find((step) => step.op === '_subchain_begin')
  assert.deepEqual(p010Subchain.args, { name: 'a', id: 'b' })
  const p010Diags = p010Result.diagnostics.filter((d) => d.code === 'P010')
  assert.equal(p010Diags.length, 1)
  assert.equal(p010Diags[0].severity, 'warning')
  assert.deepEqual(p010Diags[0].location, { line: 2, column: 29 })

  // Co-occurring violations reported in source order
  const coSource = 'search synth\nread(o0).subchain(nme: "x", name: "a" name: "b") { .diagFilter() }.write(o1)'
  const coResult = compile(coSource)
  assert.deepEqual(coResult.diagnostics.map((d) => d.code), ['P008', 'P010', 'P009'])
})
test('upstream texture-policy fields (mipmaps/persistent/3D filter) propagate from effect definitions into compiled texture specs', async () => {
  const core = await createReferenceCompiler()
  const { Effect, registerEffect, registerOp, registerStarterOps, compileGraph } = core

  const policyProbe = new Effect({
    name: 'Texture Policy Probe',
    namespace: 'synth',
    func: 'texturePolicyProbe',
    description: 'Texture policy probe used by tests',
    tags: ['noise', 'util'],
    textures: {
      acc: { width: 64, height: 64, format: 'rgba16f', mipmaps: true, persistent: true }
    },
    textures3d: {
      vol: { width: 8, height: 8, depth: 8, format: 'rgba16f', filter: 'nearest' }
    },
    passes: [
      { program: 'probe', inputs: {}, outputs: { color: 'acc' } }
    ],
  })
  // Upstream convention (shaders/tests/test_mip_controls.js): the Effect
  // constructor copies config.textures and config.outputTex3d but not
  // config.textures3d — shipped 3D-effect definitions set textures3d as an
  // instance field. Mirror that here rather than diverging from upstream.
  policyProbe.textures3d = {
    vol: { width: 8, height: 8, depth: 8, format: 'rgba16f', filter: 'nearest' }
  }
  policyProbe.outputTex3d = 'vol'
  // Register under both the bare func and dotted 'namespace.func' ids: the DSL
  // resolves effects through the namespace registry ('search synth'), while
  // starter-op registration needs the dotted form (mirrors upstream's
  // test_mip_controls.js registration order).
  registerEffect('texturePolicyProbe', policyProbe)
  registerEffect('synth.texturePolicyProbe', policyProbe)
  registerOp('synth.texturePolicyProbe', {
    name: 'texturePolicyProbe',
    args: Object.entries(policyProbe.globals || {}).map(([key, spec]) => ({
      name: key,
      type: spec.type,
      default: spec.default,
    })),
  })
  registerStarterOps(['synth.texturePolicyProbe'])

  const plainProbe = new Effect({
    name: 'Plain Texture Probe',
    namespace: 'synth',
    func: 'plainTextureProbe',
    description: 'Default texture probe used by tests',
    tags: ['noise', 'util'],
    textures: {
      scratch: { width: 32, height: 32, format: 'rgba16f' }
    },
    passes: [
      { program: 'probe', inputs: {}, outputs: { color: 'scratch' } }
    ],
  })
  registerEffect('plainTextureProbe', plainProbe)
  registerEffect('synth.plainTextureProbe', plainProbe)
  registerOp('synth.plainTextureProbe', {
    name: 'plainTextureProbe',
    args: Object.entries(plainProbe.globals || {}).map(([key, spec]) => ({
      name: key,
      type: spec.type,
      default: spec.default,
    })),
  })
  registerStarterOps(['synth.plainTextureProbe'])

  const policyGraph = compileGraph('search synth\ntexturePolicyProbe().write(o0)\nrender(o0)')
  const specs = [...policyGraph.textures.entries()]
  assert.ok(
    specs.some(([, spec]) => spec.mipmaps === true && spec.persistent === true),
    `no texture spec carries mipmaps+persistent: ${JSON.stringify(specs)}`,
  )
  assert.ok(
    specs.some(([, spec]) => spec.is3D === true && spec.filter === 'nearest'),
    `no 3D texture spec carries filter 'nearest': ${JSON.stringify(specs)}`,
  )

  const plainGraph = compileGraph('search synth\nplainTextureProbe().write(o0)\nrender(o0)')
  for (const [, spec] of plainGraph.textures) {
    assert.equal(spec.mipmaps, undefined, 'plain 2D spec must not carry mipmaps')
    assert.equal(spec.persistent, undefined, 'plain 2D spec must not carry persistent')
    assert.equal(spec.filter, undefined, 'plain spec must not carry filter')
  }
})

test('GAP-027: strict opt-in mode rejects subchain argument violations with SyntaxError', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerOp('synth.diagFilter', { name: 'diagFilter', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const strictCases = [
    {
      source: 'search synth\nread(o0).subchain(nme: "typo", name: "ok") { .diagFilter() }.write(o1)',
      code: 'P008',
      line: 2,
      column: 19,
    },
    {
      source: 'search synth\nread(o0).subchain(name: "a", name: "b") { .diagFilter() }.write(o1)',
      code: 'P009',
      line: 2,
      column: 30,
    },
    {
      source: 'search synth\nread(o0).subchain(name: "a" id: "b") { .diagFilter() }.write(o1)',
      code: 'P010',
      line: 2,
      column: 29,
    },
  ]

  for (const { source, code, line, column } of strictCases) {
    for (const entryPoint of [
      (src) => parse(lex(src), { subchainArguments: 'strict' }),
      (src) => compile(src, { subchainArguments: 'strict' }),
    ]) {
      assert.throws(
        () => entryPoint(source),
        (err) => {
          assert.equal(err.name, 'SyntaxError')
          assert.equal(err.diagnostic.code, code)
          assert.equal(err.diagnostic.stage, 'parser')
          assert.equal(err.diagnostic.severity, 'error')
          assert.deepEqual(err.diagnostic.location, { line, column })
          assert.deepEqual(err.diagnostic.span, sourcePosition(lex, source, line, column))
          return true
        },
      )
    }
  }
})

test('parser diagnostic source coordinates survive scanner drift', async () => {
  const core = await createReferenceCompiler()
  const { compile, lex, parse, registerOp, registerStarterOps } = core

  registerOp('synth.diagProbe', { name: 'diagProbe', args: [] })
  registerStarterOps(['synth.diagProbe'])

  const crlfSource = '/*\r\n * header\r\n */\r\nsearch synth\r\nlet x = "hello\\nworld";\r\nlet y = [1 2]'
  for (const entryPoint of [(src) => parse(lex(src)), compile]) {
    assert.throws(
      () => entryPoint(crlfSource),
      (err) => {
        assert.equal(err.name, 'SyntaxError')
        assert.equal(err.diagnostic.code, 'P001')
        assert.deepEqual(err.diagnostic.location, { line: 6, column: 12 })
        assert.deepEqual(err.diagnostic.span, sourcePosition(lex, crlfSource, 6, 12))
        return true
      },
    )
  }
})

test('caller tokens lacking position attributes preserve null spans in subchain reporting', async () => {
  const core = await createReferenceCompiler()
  const { lex, parse, registerOp } = core

  registerOp('synth.diagFilter', { name: 'diagFilter', args: [] })

  const subchainSource = 'search synth\nread(o0).subchain(bogus: "val") { .diagFilter() }.write(o1)'
  const tokensWithoutPositions = lex(subchainSource).map(({ type, lexeme, line, col }) => ({ type, lexeme, line, col }))

  assert.throws(
    () => parse(tokensWithoutPositions, { subchainArguments: 'strict' }),
    (err) => {
      assert.equal(err.name, 'SyntaxError')
      assert.equal(err.diagnostic.code, 'P008')
      assert.deepEqual(err.diagnostic.location, { line: 2, column: 19 })
      assert.equal(err.diagnostic.span, null)
      return true
    },
  )
})
