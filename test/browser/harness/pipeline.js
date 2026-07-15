import { AudioState, MidiState } from '../../../vendor-cache/noisemaker-shaders-core.esm.js'
import { CablesWebGL2Backend } from '../../../src/backend/cables-webgl2-backend.js'
import { findExternalTextureIds } from '../../../src/backend/external-texture.js'
import { createOutputCopier } from '../../../src/backend/output-copy.js'
import { compileProgram, Pipeline, WebGL2Backend } from '../../../src/runtime/engine.js'
import { createCatalogProgram } from '../../../parity/catalog-inputs.js'

import {
  compareReadbacks,
  concatenateReadbacks,
  createComparisonArtifacts,
  createHarnessContext,
  createRawOutputTexture,
  destroyHarnessContext,
  errorDiagnostic,
  exactReadbacks,
  guarded,
  guardedPromiseCapture,
  preflightWebGL2,
  readFloatTexture,
} from './webgl.js'

const WIDTH = 64
const HEIGHT = 48
const FRAME_TIME = 1 / 60

const CUBE_FACES = [
  { forward: [1, 0, 0], up: [0, -1, 0] },
  { forward: [-1, 0, 0], up: [0, -1, 0] },
  { forward: [0, 1, 0], up: [0, 0, 1] },
  { forward: [0, -1, 0], up: [0, 0, -1] },
  { forward: [0, 0, 1], up: [0, -1, 0] },
  { forward: [0, 0, -1], up: [0, -1, 0] },
]

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ]
}

const CUBE_FACE_BASES = CUBE_FACES.map(({ forward, up }) => {
  const right = cross(up, forward)
  return [...right, ...up, ...forward]
})

const EXTRA_CASES = Object.freeze([
  {
    dsl: `search filter, synth

solid(color: #26405f, alpha: 1)
  .text(
    text: "TASK 9",
    font: monospace,
    size: 0.2,
    color: #ffffff,
    matteColor: #000000,
    matteOpacity: 0.25
  )
  .write(o0)

render(o0)`,
    id: 'text-bitmap',
    quietMs: 150,
  },
  {
    dsl: `search synth

scope(color: #32ff80, thickness: 2, gain: 1.25)
  .write(o0)

render(o0)`,
    id: 'audio-waveform',
  },
  {
    dsl: `search synth

spectrum(color: #e664ff, thickness: 2, gain: 0.8)
  .write(o0)

render(o0)`,
    id: 'audio-spectrum',
  },
  {
    dsl: `search synth

roll(color: #55ddff, gain: 1.1, speed: 1)
  .write(o0)

render(o0)`,
    id: 'midi-grid',
  },
  {
    captureMode: 'cubemap',
    dsl: `search synth3d, render

noise3d(volumeSize: x16, seed: 5)
  .renderCubemap3d(threshold: 0.55)
  .write(o0)

render(o0)`,
    id: 'six-cubemap-faces',
  },
])

const SPECIAL_CATALOG_DSL = Object.freeze({
  'filter/octaveWarp': `search synth, filter

noise(seed: 1, ridges: true)
  .octaveWarp(octaves: 1, antialias: false, displacement: 0.05, freq: 2)
  .write(o0)

render(o0)`,
})

function wait(milliseconds) {
  return milliseconds > 0
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve()
}

function yieldBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function numberedSource(source, maximumLines = 160) {
  if (typeof source !== 'string') return undefined
  const lines = source.split('\n')
  return lines.slice(0, maximumLines)
    .map((line, index) => `${String(index + 1).padStart(4, ' ')} | ${line}`)
    .join('\n') + (lines.length > maximumLines ? `\n... ${lines.length - maximumLines} more lines` : '')
}

function deterministicPixels(width = 32, height = 24) {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const checker = ((x >> 2) + (y >> 2)) % 2
      const glyph = (x === y || x + y === width - 1 || (x > 8 && x < 23 && y % 7 < 2))
      data[offset] = glyph ? 255 : checker ? 32 : 176
      data[offset + 1] = glyph ? 208 : (x * 17 + y * 3) % 256
      data[offset + 2] = glyph ? 64 : (x * 5 + y * 19) % 256
      data[offset + 3] = glyph ? 255 : 192
    }
  }
  return { data, height, width }
}

function createDeterministicTexture(gl) {
  const pixels = deterministicPixels()
  const handle = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, handle)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    pixels.width,
    pixels.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels.data,
  )
  gl.bindTexture(gl.TEXTURE_2D, null)
  return { ...pixels, handle }
}

function installExternalInputs({ backend, context, graph, pipeline, side, resources }) {
  const ids = findExternalTextureIds(graph)
  if (ids.length === 0) return
  const record = createDeterministicTexture(context.gl)
  resources.externalTexture = side === 'adapter' ? record.handle : null
  for (const id of ids) {
    if (side === 'adapter') {
      backend.registerExternalTexture(id, {
        format: 'rgba8',
        glFormat: {
          format: context.gl.RGBA,
          internalFormat: context.gl.RGBA8,
          type: context.gl.UNSIGNED_BYTE,
        },
        handle: record.handle,
        height: record.height,
        width: record.width,
      }, { kind: 'media', ownership: 'external' })
    } else {
      if (backend.textures.has(id)) backend.destroyTexture(id)
      backend.textures.set(id, {
        format: 'rgba8',
        glFormat: {
          format: context.gl.RGBA,
          internalFormat: context.gl.RGBA8,
          type: context.gl.UNSIGNED_BYTE,
        },
        handle: record.handle,
        height: record.height,
        width: record.width,
      })
    }
  }
  pipeline.setUniform('imageSize', [record.width, record.height])
}

function installTriangleMesh({ backend, context, graph }) {
  const inputIds = new Set()
  for (const pass of graph.passes || []) {
    for (const [name, id] of Object.entries(pass.inputs || {})) {
      if ((name === 'meshPositions' || name === 'positionsTex') && typeof id === 'string') {
        inputIds.add(id)
      }
    }
  }
  if (inputIds.size === 0) return

  const positions = new Float32Array([
    -0.7, -0.65, 0, 1,
    0.7, -0.65, 0, 1,
    0, 0.75, 0, 1,
  ])
  const normals = new Float32Array([
    0, 0, 1, 0,
    0, 0, 1, 0,
    0, 0, 1, 0,
  ])
  const uvs = new Float32Array([
    0, 0, 0, 0,
    1, 0, 0, 0,
    0.5, 1, 0, 0,
  ])

  for (const positionId of inputIds) {
    const normalId = positionId.replace('positions', 'normals')
    const uvId = positionId.replace('positions', 'uvs')
    backend._uploadMeshTexture(
      positionId,
      positions,
      3,
      1,
      context.gl.RGBA32F,
      'rgba32f',
    )
    backend._uploadMeshTexture(normalId, normals, 3, 1, context.gl.RGBA32F, 'rgba32f')
    backend._uploadMeshTexture(uvId, uvs, 3, 1, context.gl.RGBA16F, 'rgba16f')
  }
}

function installExternalState(pipeline) {
  const audio = new AudioState()
  const waveform = new Uint8Array(128)
  const spectrum = new Uint8Array(128)
  for (let index = 0; index < 128; index += 1) {
    waveform[index] = Math.round(128 + Math.sin(index / 127 * Math.PI * 6) * 96)
    spectrum[index] = Math.round(Math.max(0, 255 - index * 1.75) * (0.55 + 0.45 * (index % 7) / 6))
  }
  audio.setWaveform(waveform)
  audio.setSpectrum(spectrum)
  audio.setBands(0.25, 0.5, 0.75)
  pipeline.setAudioState(audio)

  const midi = new MidiState()
  midi.handleMessage(new Uint8Array([0x90, 36, 96]))
  midi.handleMessage(new Uint8Array([0x91, 48, 112]))
  midi.handleMessage(new Uint8Array([0x99, 60, 80]))
  midi.clockCount = 17
  pipeline.setMidiState(midi)
}

function routeDelayedTextureUploads({ backend, context, side, lifecycle }) {
  const update = backend.updateTextureFromSource.bind(backend)
  backend.updateTextureFromSource = (...args) => {
    if (lifecycle.disposed) return undefined
    if (side === 'adapter') return guarded(context, backend, () => update(...args))
    return update(...args)
  }
}

async function compileAdapterPrograms({ backend, context, dsl, graph, pipeline, sideId }) {
  pipeline.isCompiling = true
  try {
    const compiled = new Set()
    for (const pass of graph.passes || []) {
      if (compiled.has(pass.program)) continue
      const spec = pipeline.resolveProgramSpec(pass)
      if (!spec) {
        const error = new Error(`Program spec '${pass.program}' is unavailable`)
        error.code = 'ERR_PROGRAM_SPEC_MISSING'
        throw error
      }
      try {
        await guardedPromiseCapture(
          context,
          backend,
          () => backend.compileProgram(pass.program, spec),
        )
      } catch (error) {
        error.task9 = {
          dsl,
          effectKey: pass.effectKey,
          passId: pass.id,
          phase: 'compile',
          program: pass.program,
          shaderSourceExcerpt: numberedSource(spec.source || spec.glsl || spec.fragment),
          side: sideId,
        }
        throw error
      }
      compiled.add(pass.program)
    }
  } finally {
    pipeline.isCompiling = false
  }
}

async function initializeSide({ caseDefinition, context, side }) {
  const graph = await compileProgram(caseDefinition.dsl)
  const backend = side === 'adapter'
    ? new CablesWebGL2Backend(context.cgl, context.canvas)
    : new WebGL2Backend(context.gl, context.canvas)
  if (side === 'reference') backend.present = (id) => { backend.presentedTextureId = id }
  const pipeline = new Pipeline(graph, backend)
  const lifecycle = { disposed: false }
  const resources = { externalTexture: null }
  routeDelayedTextureUploads({ backend, context, lifecycle, side })

  try {
    const width = caseDefinition.width ?? WIDTH
    const height = caseDefinition.height ?? HEIGHT
    if (side === 'adapter') {
      await guardedPromiseCapture(context, backend, () => backend.init())
      await compileAdapterPrograms({
        backend,
        context,
        dsl: caseDefinition.dsl,
        graph,
        pipeline,
        sideId: `${caseDefinition.id}:adapter`,
      })
      guarded(context, backend, () => pipeline.resize(width, height))
    } else {
      await pipeline.init(width, height)
    }
    installExternalState(pipeline)
    await wait(caseDefinition.quietMs || 0)
    const install = () => {
      installExternalInputs({ backend, context, graph, pipeline, resources, side })
      installTriangleMesh({ backend, context, graph })
    }
    if (side === 'adapter') guarded(context, backend, install)
    else install()
    return { backend, graph, lifecycle, pipeline, resources }
  } catch (error) {
    error.task9 ||= {
      dsl: caseDefinition.dsl,
      phase: 'initialize',
      side,
    }
    try {
      lifecycle.disposed = true
      if (side === 'adapter') guarded(context, backend, () => pipeline.dispose())
      else pipeline.dispose()
    } catch {
      // Preserve the initialization failure as the primary diagnostic.
    }
    throw error
  }
}

function createCopier(context) {
  return createOutputCopier({
    createTexture: ({ height, width }) => createRawOutputTexture(context.gl, width, height),
    destroyTexture: (texture) => texture.delete(),
    gl: context.gl,
  })
}

function adapterCapture(context, initialized, copier) {
  return guarded(context, initialized.backend, () => {
    const presented = initialized.backend.getPresentedTextureInfo()
    copier.resize(presented.width, presented.height)
    const output = copier.copy(presented)
    const internal = readFloatTexture(context.gl, presented)
    const copied = readFloatTexture(context.gl, {
      handle: output.tex,
      height: output.height,
      width: output.width,
    })
    return { copied, internal }
  })
}

function referenceCapture(context, initialized) {
  const id = initialized.backend.presentedTextureId
  const texture = initialized.backend.textures.get(id)
  if (!texture) throw new Error(`reference presented texture '${id}' is unavailable`)
  return readFloatTexture(context.gl, texture)
}

function renderSideFrame(side, context, initialized, time) {
  initialized.backend.presentedTextureId = undefined
  if (side === 'adapter') {
    guarded(context, initialized.backend, () => initialized.pipeline.render(time))
  } else {
    initialized.pipeline.render(time)
  }
}

async function disposeSide(side, context, initialized, copier) {
  const failures = []
  const attempt = (operation) => {
    try { operation() } catch (error) { failures.push(error) }
  }
  initialized.lifecycle.disposed = true
  attempt(() => context.gl.finish())
  if (copier) attempt(() => guarded(context, initialized.backend, () => copier.dispose()))
  if (side === 'adapter') {
    attempt(() => guarded(context, initialized.backend, () => initialized.pipeline.dispose()))
    if (initialized.resources.externalTexture) {
      attempt(() => guarded(context, initialized.backend, () => {
        context.gl.deleteTexture(initialized.resources.externalTexture)
      }))
    }
  } else {
    attempt(() => initialized.pipeline.dispose())
  }
  attempt(() => context.gl.finish())
  if (failures.length > 0) throw new AggregateError(failures, `${side} disposal failed`)
}

async function runSide(caseDefinition, side, context) {
  let initialized
  let copier
  try {
    initialized = await initializeSide({ caseDefinition, context, side })
    copier = side === 'adapter' ? createCopier(context) : null
    const captures = new Map()
    const copies = new Map()

    if (caseDefinition.captureMode === 'cubemap') {
      const faceCaptures = []
      const faceCopies = []
      for (let face = 0; face < CUBE_FACE_BASES.length; face += 1) {
        initialized.pipeline.setUniform('cubeBasis', CUBE_FACE_BASES[face])
        renderSideFrame(side, context, initialized, 0)
        if (side === 'adapter') {
          const { copied, internal } = adapterCapture(context, initialized, copier)
          faceCaptures.push(internal)
          faceCopies.push(copied)
        } else {
          faceCaptures.push(referenceCapture(context, initialized))
        }
      }
      captures.set(`${caseDefinition.id}@0`, concatenateReadbacks(faceCaptures))
      if (side === 'adapter') {
        copies.set(`${caseDefinition.id}@0`, concatenateReadbacks(faceCopies))
      }
    } else {
      const captureFrames = caseDefinition.captureFrames || [0]
      const frameSet = new Set(captureFrames)
      const maximumFrame = Math.max(...captureFrames)
      for (let frame = 0; frame <= maximumFrame; frame += 1) {
        renderSideFrame(side, context, initialized, frame * FRAME_TIME)
        if (!frameSet.has(frame)) continue
        const id = `${caseDefinition.id}@${frame}`
        if (side === 'adapter') {
          const { copied, internal } = adapterCapture(context, initialized, copier)
          captures.set(id, internal)
          copies.set(id, copied)
        } else {
          captures.set(id, referenceCapture(context, initialized))
        }
      }
    }
    return { captures, copies }
  } catch (error) {
    error.task9 ||= { dsl: caseDefinition.dsl, phase: 'render', side }
    throw error
  } finally {
    if (initialized) await disposeSide(side, context, initialized, copier)
  }
}

export async function runAdapterCase(caseDefinition, context) {
  return runSide(caseDefinition, 'adapter', context)
}

async function runAdapterCompileOnly(caseDefinition, context) {
  const graph = await compileProgram(caseDefinition.dsl)
  const backend = new CablesWebGL2Backend(context.cgl, context.canvas)
  const pipeline = new Pipeline(graph, backend)
  try {
    await guardedPromiseCapture(context, backend, () => backend.init())
    await compileAdapterPrograms({
      backend,
      context,
      dsl: caseDefinition.dsl,
      graph,
      pipeline,
      sideId: `${caseDefinition.id}:adapter-compile-only`,
    })
  } finally {
    guarded(context, backend, () => pipeline.dispose())
    context.gl.finish()
  }
}

function quietPeriodForEffect(effectId) {
  if (new Set(['filter/fibers', 'filter/scratches', 'filter/strayHair']).has(effectId)) {
    return 500
  }
  if (effectId === 'filter/text') return 150
  if (effectId === 'render/meshLoader' || effectId === 'render/meshRender') return 50
  return 0
}

async function representativeCases() {
  const corpus = await (await fetch('/parity/programs.json', { cache: 'no-store' })).json()
  const stateful = new Set(['feedback', 'navier-stokes', 'points-agents', 'reaction-diffusion'])
  return [
    ...corpus.map((entry) => ({
      ...entry,
      captureFrames: stateful.has(entry.id) ? [0, 1, 12] : [0],
    })),
    ...EXTRA_CASES,
  ]
}

export async function runRepresentativeParity({ channelCeilings }) {
  const referenceContext = createHarnessContext(WIDTH, HEIGHT)
  const adapterContext = createHarnessContext(WIDTH, HEIGHT)
  const preflight = preflightWebGL2(adapterContext)
  const referencePreflight = preflightWebGL2(referenceContext)
  preflight.failures.push(...referencePreflight.failures.map((failure) => `reference: ${failure}`))
  const failures = []
  const results = []
  try {
    if (preflight.failures.length > 0) return { failures, preflight, results }
    const cases = await representativeCases()
    const expectedIds = cases.flatMap((entry) => (
      entry.captureMode === 'cubemap'
        ? [`${entry.id}@0`]
        : (entry.captureFrames || [0]).map((frame) => `${entry.id}@${frame}`)
    ))
    const suppliedIds = Object.keys(channelCeilings).sort()
    if (JSON.stringify(expectedIds.sort()) !== JSON.stringify(suppliedIds)) {
      failures.push({
        expectedIds,
        id: 'ceiling-contract',
        suppliedIds,
      })
      return { failures, preflight, results }
    }

    for (const caseDefinition of cases) {
      try {
        const reference = await runSide(caseDefinition, 'reference', referenceContext)
        await yieldBrowser()
        const adapter = await runSide(caseDefinition, 'adapter', adapterContext)
        for (const [id, referenceReadback] of reference.captures) {
          const adapterReadback = adapter.captures.get(id)
          const copiedReadback = adapter.copies.get(id)
          const comparison = compareReadbacks(
            id,
            referenceReadback,
            adapterReadback,
            channelCeilings[id],
          )
          comparison.artifacts = createComparisonArtifacts(
            referenceReadback,
            adapterReadback,
            comparison,
          )
          comparison.copyExact = exactReadbacks(adapterReadback, copiedReadback)
          results.push(comparison)
          if (!comparison.accepted || !comparison.copyExact || !comparison.finite) {
            failures.push({
              copyExact: comparison.copyExact,
              firstDivergences: comparison.firstDivergences,
              id,
              maxChannelError: comparison.maxChannelError,
              meanChannelError: comparison.meanChannelError,
              mismatchedChannels: comparison.mismatchedChannels,
            })
          }
        }
      } catch (error) {
        failures.push(errorDiagnostic(error, {
          caseId: caseDefinition.id,
          context: error.task9,
          id: caseDefinition.id,
        }))
      }
      await yieldBrowser()
    }
    if (referenceContext.gl.isContextLost()) failures.push({ id: 'reference-context-lost' })
    if (adapterContext.gl.isContextLost()) failures.push({ id: 'adapter-context-lost' })
    return { failures, preflight, results }
  } finally {
    destroyHarnessContext(referenceContext)
    destroyHarnessContext(adapterContext)
  }
}

async function readManifest() {
  const response = await fetch('/vendor-cache/effects/manifest.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}`)
  return response.json()
}

export async function runFullCatalog({ end, start = 0 } = {}) {
  const context = createHarnessContext(WIDTH, HEIGHT)
  const preflight = preflightWebGL2(context)
  const failures = []
  const results = []
  let effectNames = []
  try {
    const manifest = await readManifest()
    effectNames = Object.keys(manifest).sort()
    const last = end === undefined ? effectNames.length : Math.min(effectNames.length, end)
    const batchEffectNames = effectNames.slice(start, last)
    if (effectNames.length !== 210) {
      failures.push({ actual: effectNames.length, expected: 210, id: 'catalog-count' })
    }
    if (preflight.failures.length > 0 || failures.length > 0) {
      return {
        effectCount: effectNames.length,
        effectNames,
        failures,
        preflight,
        compiledCount: 0,
        renderedCount: 0,
        results,
        start,
        end: last,
      }
    }

    for (const effectId of batchEffectNames) {
      let caseDefinition
      const resourcesBefore = context.resourceCounts()
      try {
        const module = await import(`/vendor-cache/effects/${effectId}.js`)
        const definition = typeof module.default === 'function'
          ? new module.default()
          : module.default
        caseDefinition = {
          dsl: effectId === 'filter/text'
            ? EXTRA_CASES.find(({ id }) => id === 'text-bitmap').dsl
            : SPECIAL_CATALOG_DSL[effectId] ??
              createCatalogProgram({ effectId, definition, metadata: manifest[effectId] }),
          id: effectId,
          height: effectId === 'filter/octaveWarp' ? 1 : HEIGHT,
          quietMs: quietPeriodForEffect(effectId),
          width: effectId === 'filter/octaveWarp' ? 1 : WIDTH,
        }
        let result
        if (effectId === 'filter/octaveWarp') {
          await runAdapterCompileOnly(caseDefinition, context)
          result = {
            artifacts: {},
            classification: 'headless-swiftshader-execution-pathology',
            compiled: true,
            id: effectId,
            linked: true,
            rendered: false,
          }
        } else {
          const adapter = await runSide(caseDefinition, 'adapter', context)
          const internal = adapter.captures.get(`${effectId}@0`)
          const copied = adapter.copies.get(`${effectId}@0`)
          result = {
            artifacts: {},
            compiled: true,
            copyExact: exactReadbacks(internal, copied),
            finite: internal.finite,
            id: effectId,
            linked: true,
            rendered: true,
          }
        }
        results.push(result)
        if (result.rendered && (!result.copyExact || !result.finite)) failures.push(result)
        const resourcesAfter = context.resourceCounts()
        const leakedResources = Object.fromEntries(
          Object.keys(resourcesAfter)
            .filter((name) => resourcesAfter[name] !== resourcesBefore[name])
            .map((name) => [name, {
              after: resourcesAfter[name],
              before: resourcesBefore[name],
            }]),
        )
        if (Object.keys(leakedResources).length > 0) {
          failures.push({ effectId, id: `${effectId}:resource-leak`, leakedResources })
          break
        }
      } catch (error) {
        failures.push(errorDiagnostic(error, {
          dsl: caseDefinition?.dsl,
          effectId,
          id: effectId,
          context: error.task9,
          preflight: preflight.capabilities,
          resourceCounts: context.resourceCounts(),
        }))
      }
      if (context.gl.isContextLost()) {
        failures.push({ id: effectId, message: 'WebGL2 context lost during catalog sweep' })
        break
      }
      await wait(10)
    }
    return {
      effectCount: effectNames.length,
      effectNames,
      failures,
      preflight,
      compiledCount: results.filter(({ compiled }) => compiled).length,
      renderedCount: results.filter(({ rendered }) => rendered).length,
      results,
      start,
      end: last,
    }
  } finally {
    destroyHarnessContext(context, { loseContext: true })
  }
}

export const representativeDimensions = Object.freeze({ height: HEIGHT, width: WIDTH })
