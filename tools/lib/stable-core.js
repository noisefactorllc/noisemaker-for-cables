import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// The release also contains experimental features. Derive this port from the
// previous stable core by carrying only shared, stable source changes.
export const coreSources = Object.freeze({
  base: {
    url: 'https://shaders.noisedeck.app/1.0.357/noisemaker-shaders-core.esm.js',
    sha256: '670d0c5bdfa20acb5e4709597b3145819fa76f58de46c174dc7f8cd21d0da4db',
  },
  baseline: {
    url: 'https://shaders.noisedeck.app/1.5.0/noisemaker-shaders-core.esm.js',
    sha256: '6596d11a2b54de9c80bbc21826d4797d3499d79715e5fafb1edb4597f73e20e7',
  },
  release: {
    url: 'https://shaders.noisedeck.app/1.5.17/noisemaker-shaders-core.esm.js',
    sha256: 'c7206401ddd1eecb9b750b075f2ad5aa49c1ec268df33fa6fd7733b080094ceb',
  },
})

function replaceOnce(source, before, after) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
    throw Error(`Stable core anchor is not unique: ${before.slice(0, 100)}`)
  }
  return source.replace(before, () => after)
}

function between(source, start, end) {
  const at = source.indexOf(start)
  const until = source.indexOf(end, at + start.length)
  if (at < 0 || until < 0) throw Error(`Stable core section missing: ${start}`)
  return source.slice(at, until)
}

function moduleSource(source, path) {
  const start = `// shaders/src/${path}\n`
  const at = source.lastIndexOf(start)
  if (at < 0) throw Error(`Stable core module missing: ${path}`)
  return between(source.slice(at), start, '\n// ')
}

function method(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^( +)(?:async )?${escaped}\\([^\\n]*`, 'm').exec(source)
  if (!match) throw Error(`Stable core method missing: ${name}`)
  const end = source.indexOf(`\n${match[1]}}`, match.index) + match[1].length + 2
  if (end < match.index) throw Error(`Stable core method end missing: ${name}`)
  return source.slice(match.index, end)
}

function align(source, indent) {
  const current = source.match(/^ */)[0].length
  return source.split('\n').map(line => ' '.repeat(indent) + line.slice(current)).join('\n')
}

function transplantMethods(base, release, names) {
  for (const name of names) {
    const old = method(base, name)
    base = replaceOnce(base, old, align(method(release, name), old.match(/^ */)[0].length))
  }
  return base
}

function deriveBaselineCore(base, release) {
  for (const [name, bytes] of [['base', base], ['baseline', release]]) {
    if (createHash('sha256').update(bytes).digest('hex') !== coreSources[name].sha256) {
      throw Error(`Stable core ${name} digest mismatch`)
    }
  }
  base = String(base)
  release = String(release)
  for (const path of ['lang/transform.js', 'runtime/resources.js']) {
    base = replaceOnce(base, moduleSource(base, path), moduleSource(release, path).replace('init_registry();\n', ''))
  }
  base = replaceOnce(base, moduleSource(base, 'runtime/obj-parser.js'),
    moduleSource(release, 'geometry/geometry.js') + '\n\n' + moduleSource(release, 'runtime/obj-parser.js'))

  let parser = moduleSource(release, 'lang/parser.js')
  const oldParser = moduleSource(base, 'lang/parser.js')
  parser = replaceOnce(parser, 'const allowMixed = true;', 'const allowMixed = nameToken.lexeme === "midi" || nameToken.lexeme === "audio";')
  parser = replaceOnce(parser, '    "LBRACKET",\n    "LBRACE",', '    "LBRACKET",')
  parser = replaceOnce(parser, between(parser, '      case "LBRACE": {', '      default:'), '')
  parser = replaceOnce(parser, between(parser, '    let posCursor = 0;', '    return {'),
    between(oldParser, '    for (let i = 0; i < paramOrder.length; i++) {', '    return {'))
  base = replaceOnce(base, oldParser, parser)

  base = replaceOnce(base, '  S008: { stage: "semantic", severity: "warning", message: "Deprecated effect" },',
    '  S008: { stage: "semantic", severity: "warning", message: "Deprecated effect" },\n  S009: { stage: "semantic", severity: "warning", message: "Too many positional arguments" },')
  // Descriptor fields already recurse through AUTOMATION_FIELDS in the base.
  base = replaceOnce(base, '        const merged = { type: "Call", name: val.name, args: mergedArgs };',
    '        const merged = { type: "Call", name: val.name, args: mergedArgs };\n        const loc = call.loc ?? val.loc;\n        if (loc) merged.loc = loc;')
  for (const node of ['c', 'node']) {
    const line = `let mappedCall = { type: "Call", name: ${node}.name, args: mappedArgs };`
    base = replaceOnce(base, line, line + `\n      if (${node}.loc) mappedCall.loc = ${node}.loc;`)
  }
  const hook = '        const hook = typeof call.name === "string" ? validatorHooks[call.name] : null;'
  base = replaceOnce(base, hook,
    '        if (call.args.length > specArgs.length) {\n          const extra = call.args[specArgs.length];\n          pushDiag("S009", extra || call, `Too many positional arguments for ${call.name}(): \'${call.name}\' takes ${specArgs.length}`);\n        }\n' + hook)

  const oldUnparser = moduleSource(base, 'lang/unparser.js')
  const newUnparser = moduleSource(release, 'lang/unparser.js')
  // Array bindings use the shared AST emitter, without scene block formatting
  // or the experimental object-literal production.
  let arrayEmitter = between(newUnparser, 'function formatSceneAst(', 'function formatMidi(')
  arrayEmitter = replaceOnce(arrayEmitter, 'function formatSceneAst(node, indent = null)', 'function formatSceneAst(node)')
  arrayEmitter = replaceOnce(arrayEmitter,
    between(arrayEmitter, '      if (indent !== null && SCENE_BLOCK_CALLS.has(node.name)', '      const parts = positionals.map'), '')
  arrayEmitter = replaceOnce(arrayEmitter, 'formatSceneAst(el, indent)', 'formatSceneAst(el)')
  arrayEmitter = replaceOnce(arrayEmitter, between(arrayEmitter, '    case "Object": {', '    case "Oscillator": {'), '')
  arrayEmitter = arrayEmitter.replaceAll('formatSceneAst', 'formatArrayAst')
  let unparser = replaceOnce(oldUnparser, 'function formatMidi(', arrayEmitter + 'function formatMidi(')
  unparser = replaceOnce(unparser, '      return expr.path.join(".");\n    case "Oscillator": {',
    '      return expr.path.join(".");\n    case "ArrayLiteral":\n      return formatArrayAst(expr);\n    case "Oscillator": {')
  base = replaceOnce(base, oldUnparser, unparser)

  for (const [path, methods, added] of [
    ['runtime/backend.js', [], ['waitForIdle']],
    ['runtime/backends/webgl2.js', ['ensureDepthBuffer', 'destroyTexture', 'readPixels'], ['releaseDepthBuffer', 'waitForIdle']],
    ['renderer/canvas.js', ['_packCacheAndUploadMesh', 'loadOBJFromURL', 'loadOBJFromString'], []],
  ]) {
    const old = moduleSource(base, path)
    const newer = moduleSource(release, path)
    let changed = transplantMethods(old, newer, methods)
    for (const name of added) {
      changed = replaceOnce(changed, '\n};', '\n' + align(method(newer, name), 2) + '\n};')
    }
    base = replaceOnce(base, old, changed)
  }

  const oldGpu = moduleSource(base, 'runtime/backends/webgpu.js')
  const newGpu = moduleSource(release, 'runtime/backends/webgpu.js')
  let gpu = transplantMethods(oldGpu, newGpu, ['parseDeclaredUniformBufferSize', 'getDepthTexture', 'destroy', 'readPixels'])
  gpu = replaceOnce(gpu, '    this.depthTexture = null;\n    this.depthTextureSize = { width: 0, height: 0 };',
    '    this.depthTextures = /* @__PURE__ */ new Map();')
  const helpers = between(newGpu, 'function stripWgslComments(source) {', 'function countFragmentOutputs(')
  gpu = 'var DEPTH_TEXTURE_CACHE_LIMIT = 4;\n' + helpers + '\n' + gpu
  for (const name of ['retireDepthTexture', 'waitForIdle']) {
    gpu = replaceOnce(gpu, '\n};', '\n' + align(method(newGpu, name), 2) + '\n};')
  }
  base = replaceOnce(base, oldGpu, gpu)

  const oldPipeline = moduleSource(base, 'runtime/pipeline.js')
  const newPipeline = moduleSource(release, 'runtime/pipeline.js')
  let cubemap = align(method(newPipeline, 'renderCubemap'), 2)
  cubemap = replaceOnce(cubemap, ', onFace = null', '')
  cubemap = replaceOnce(cubemap, '      if (onFace) this.render(time);\n', '')
  cubemap = replaceOnce(cubemap, '        if (onFace) await onFace(face);\n', '')
  cubemap = replaceOnce(cubemap,
    'the composition must write its result to it (e.g. .renderCubemapSurface().write(${outputSurface}), or scene(...).write(${outputSurface}))',
    'the composition must write its cubemap-renderer result to it (e.g. .renderCubemapSurface().write(${outputSurface}))')
  let pipeline = replaceOnce(oldPipeline, method(oldPipeline, 'renderCubemap'), cubemap)
  const rows = between(newPipeline, 'function reverseRows(image) {', '\n}') + '\n}'
  pipeline = rows + '\n' + pipeline
  base = replaceOnce(base, oldPipeline, pipeline)
  base = replaceOnce(base, ' * Build: 478f94ea', ' * Build: 084176b7 (stable subset from 478f94ea)')
  base = replaceOnce(base, ' * Date: 2026-11-23T02:11:00.447Z', ' * Date: 2026-11-23T23:34:55.045Z')
  return base
}

export function deriveStableCore(base, baseline, release) {
  if (createHash('sha256').update(release).digest('hex') !== coreSources.release.sha256) {
    throw Error('Stable core release digest mismatch')
  }
  let stable = deriveBaselineCore(base, baseline)
  const updates = JSON.parse(readFileSync(new URL('./stable-core-updates.json', import.meta.url), 'utf8'))
  for (const { module, before, after, count } of updates) {
    if (typeof before !== 'string' || before.length === 0 || typeof after !== 'string' ||
        !Number.isSafeInteger(count) || count < 1 || stable.split(before).length - 1 !== count) {
      throw Error(`Stable core update anchor differs: ${module}`)
    }
    stable = stable.replaceAll(before, () => after)
  }
  return stable
}
