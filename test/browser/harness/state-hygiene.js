import { CablesWebGL2Backend } from '../../../src/backend/cables-webgl2-backend.js'
import { createOutputCopier } from '../../../src/backend/output-copy.js'
import { compileProgram, Pipeline } from '../../../src/runtime/engine.js'
import { withGLState } from '../../../src/runtime/gl-state.js'

import { runAdapterCase } from './pipeline.js'
import {
  captureComparableState,
  compareReadbacks,
  createComparisonArtifacts,
  createHarnessContext,
  createHostileState,
  createProgram,
  createRawOutputTexture,
  destroyHarnessContext,
  diffSnapshots,
  errorDiagnostic,
  exactReadbacks,
  guarded,
  guardedPromiseCapture,
  phaseStateResult,
  preflightWebGL2,
  readFloatTexture,
  restoreComparableState,
} from './webgl.js'

const WIDTH = 64
const HEIGHT = 48
const FORCED_COMPILE_FAILURE_ID = '__task9_forced_compile_failure__'
const DSL = `search synth

solid(color: #496eaf, alpha: 1)
  .write(o0)

render(o0)`

function createCGLCacheConsumer(context) {
  const { CGL, cgl, gl } = context
  const output = createRawOutputTexture(gl, WIDTH, HEIGHT)
  const fbo = gl.createFramebuffer()
  const vao = gl.createVertexArray()
  const vertexBuffer = gl.createBuffer()
  const program = createProgram(gl, `#version 300 es
    precision highp float;
    out vec4 color;
    void main() {
      vec2 p = gl_FragCoord.xy / vec2(${WIDTH}.0, ${HEIGHT}.0);
      color = vec4(0.2 + p.x * 0.5, 0.1 + p.y * 0.6, 0.35, 1.0);
    }
  `, {
    vertexSource: `#version 300 es
      precision highp float;
      in vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `,
  })
  const position = gl.getAttribLocation(program, 'a_position')
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  const meshCacheKey = { id: 'task9-cgl-cache-consumer-mesh' }
  const programCacheKey = { id: 'task9-cgl-cache-consumer-program' }
  let meshBindCount = 0
  let programBindCount = 0

  return {
    cacheReport(exact) {
      return {
        cacheKeys: ['cgl.currentProgram', 'CGL.MESH.lastMesh'],
        exact,
        meshBindCount,
        programBindCount,
      }
    },
    dispose() {
      if (cgl.currentProgram === programCacheKey) cgl.currentProgram = null
      if (CGL.MESH.lastMesh === meshCacheKey) CGL.MESH.lastMesh = null
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.bindVertexArray(null)
      gl.useProgram(null)
      gl.deleteBuffer(vertexBuffer)
      gl.deleteFramebuffer(fbo)
      gl.deleteProgram(program)
      gl.deleteVertexArray(vao)
      output.delete()
    },
    render() {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(
        gl.DRAW_FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        output.tex,
        0,
      )
      if (gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('CGL cache consumer framebuffer is incomplete')
      }
      gl.drawBuffers([gl.COLOR_ATTACHMENT0])
      gl.viewport(0, 0, WIDTH, HEIGHT)
      gl.disable(gl.SCISSOR_TEST)
      gl.disable(gl.RASTERIZER_DISCARD)
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.CULL_FACE)
      gl.disable(gl.STENCIL_TEST)
      gl.disable(gl.BLEND)
      gl.colorMask(true, true, true, true)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (cgl.currentProgram !== programCacheKey) {
        gl.useProgram(program)
        cgl.currentProgram = programCacheKey
        programBindCount += 1
      }
      if (CGL.MESH.lastMesh !== meshCacheKey) {
        gl.bindVertexArray(vao)
        CGL.MESH.lastMesh = meshCacheKey
        meshBindCount += 1
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      const drawError = gl.getError()
      if (drawError !== gl.NO_ERROR) {
        throw new Error(
          `CGL cache consumer draw GL error ${drawError}; ` +
          `program=${gl.getParameter(gl.CURRENT_PROGRAM) === program}; ` +
          `vao=${gl.getParameter(gl.VERTEX_ARRAY_BINDING) === vao}; ` +
          `programBinds=${programBindCount}; meshBinds=${meshBindCount}; ` +
          `transformFeedbackActive=${gl.getParameter(gl.TRANSFORM_FEEDBACK_ACTIVE)}`,
        )
      }
      return readFloatTexture(gl, {
        handle: output.tex,
        height: HEIGHT,
        width: WIDTH,
      })
    },
  }
}

function createCopier(context) {
  return createOutputCopier({
    createTexture: ({ height, width }) => createRawOutputTexture(context.gl, width, height),
    destroyTexture: (texture) => texture.delete(),
    gl: context.gl,
  })
}

function snapshotPhase(context, backend, name, operation) {
  const maximum = backend.maxTextureUnits
  const before = captureComparableState(context, maximum)
  let value
  let error
  try {
    value = operation()
  } catch (caught) {
    error = caught
  }
  const after = captureComparableState(context, maximum)
  const phase = phaseStateResult(name, before, after)
  if (error) throw Object.assign(error, { task9Phase: phase })
  return { phase, value }
}

async function snapshotPromisePhase(context, backend, name, operation) {
  const maximum = backend.maxTextureUnits
  const before = captureComparableState(context, maximum)
  let value
  let error
  try {
    value = await operation()
  } catch (caught) {
    error = caught
  }
  const after = captureComparableState(context, maximum)
  const phase = phaseStateResult(name, before, after)
  if (error) throw Object.assign(error, { task9Phase: phase })
  return { phase, value }
}

async function compilePrograms(context, backend, pipeline, graph) {
  pipeline.isCompiling = true
  try {
    const compiled = new Set()
    for (const pass of graph.passes) {
      if (compiled.has(pass.program)) continue
      const spec = pipeline.resolveProgramSpec(pass)
      await guardedPromiseCapture(context, backend, () => backend.compileProgram(pass.program, spec))
      compiled.add(pass.program)
    }
  } finally {
    pipeline.isCompiling = false
  }
}

function createTransformFeedbackProbe(context) {
  const { gl } = context
  let resources
  guarded(context, null, () => {
    const program = createProgram(gl, `#version 300 es
      precision highp float;
      out vec4 color;
      void main() { color = vec4(1.0); }
    `, {
      transformFeedbackVaryings: ['captured'],
      vertexSource: `#version 300 es
        precision highp float;
        out float captured;
        void main() {
          captured = float(gl_VertexID);
          gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        }
      `,
    })
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer)
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 64, gl.DYNAMIC_DRAW)
    const feedback = gl.createTransformFeedback()
    const vao = gl.createVertexArray()
    resources = { buffer, feedback, program, vao }
  })
  return {
    ...resources,
    begin() {
      gl.useProgram(resources.program)
      gl.bindVertexArray(resources.vao)
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, resources.feedback)
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, resources.buffer)
      gl.enable(gl.RASTERIZER_DISCARD)
      gl.beginTransformFeedback(gl.POINTS)
      gl.drawArrays(gl.POINTS, 0, 1)
    },
    dispose() {
      guarded(context, null, () => {
        gl.deleteBuffer(resources.buffer)
        gl.deleteTransformFeedback(resources.feedback)
        gl.deleteProgram(resources.program)
        gl.deleteVertexArray(resources.vao)
      })
    },
  }
}

export async function runStateHygiene() {
  const context = createHarnessContext(WIDTH, HEIGHT)
  const neutralContext = createHarnessContext(WIDTH, HEIGHT)
  const preflight = preflightWebGL2(context)
  const neutralPreflight = preflightWebGL2(neutralContext)
  preflight.failures.push(...neutralPreflight.failures.map((failure) => `neutral: ${failure}`))
  const failures = []
  const phases = []
  const results = []
  let activeGuestTransformFeedback = 'not-run'
  let activeHostTransformFeedback = 'not-run'
  let cglCacheConsumer = {
    cacheKeys: ['cgl.currentProgram', 'CGL.MESH.lastMesh'],
    exact: false,
    meshBindCount: 0,
    programBindCount: 0,
  }
  let hostileCoverage = {
    distinctReadDrawFramebuffers: false,
    drawFramebufferComplete: false,
    readFramebufferComplete: false,
    transformFeedbackIndexedSlots: [],
    uniformIndexedSlots: [],
  }
  let neutralHostileOutputExact = false
  let thrownCompileObserved = false
  let hostile
  let hostConsumer
  let transformFeedbackProbe
  let backend
  let pipeline
  let copier
  let disposed = false

  try {
    if (preflight.failures.length > 0) {
      return {
        activeGuestTransformFeedback,
        activeHostTransformFeedback,
        cglCacheConsumer,
        failures,
        hostileCoverage,
        neutralHostileOutputExact,
        phases,
        preflight,
        results,
        thrownCompileObserved,
      }
    }

    const neutral = await runAdapterCase({ dsl: DSL, id: 'neutral-state' }, neutralContext)
    const neutralReadback = neutral.captures.get('neutral-state@0')

    hostConsumer = createCGLCacheConsumer(context)
    const beforeHostOutput = hostConsumer.render()
    hostile = createHostileState(
      context,
      Math.min(32, preflight.capabilities.maxFragmentTextureUnits),
    )
    hostileCoverage = hostile.coverage

    const graph = await compileProgram(DSL)
    backend = new CablesWebGL2Backend(context.cgl, context.canvas)
    pipeline = new Pipeline(graph, backend)
    copier = createCopier(context)

    phases.push((await snapshotPromisePhase(context, backend, 'initialize', () => (
      guardedPromiseCapture(context, backend, () => backend.init())
    ))).phase)

    phases.push((await snapshotPromisePhase(context, backend, 'compile', () => (
      compilePrograms(context, backend, pipeline, graph)
    ))).phase)

    const beforeThrownCompile = captureComparableState(context, backend.maxTextureUnits)
    try {
      await guardedPromiseCapture(context, backend, () => backend.compileProgram(
        FORCED_COMPILE_FAILURE_ID,
        {
          source: `#version 300 es
            precision highp float;
            out vec4 color;
            void main() { TASK9_INTENTIONAL_COMPILE_FAILURE }
          `,
        },
      ))
    } catch {
      thrownCompileObserved = !backend.programs.has(FORCED_COMPILE_FAILURE_ID)
    }
    const afterThrownCompile = captureComparableState(context, backend.maxTextureUnits)
    phases.push(phaseStateResult('thrown-compile', beforeThrownCompile, afterThrownCompile))
    if (!thrownCompileObserved) failures.push({ id: 'thrown-compile-not-observed' })

    phases.push(snapshotPhase(context, backend, 'reset', () => (
      guarded(context, backend, () => pipeline.resize(WIDTH, HEIGHT))
    )).phase)

    let hostileInternal
    phases.push(snapshotPhase(context, backend, 'render', () => guarded(context, backend, () => {
      pipeline.render(0)
      const presented = backend.getPresentedTextureInfo()
      copier.resize(presented.width, presented.height)
      const output = copier.copy(presented)
      hostileInternal = readFloatTexture(context.gl, presented)
      const copied = readFloatTexture(context.gl, {
        handle: output.tex,
        height: output.height,
        width: output.width,
      })
      if (!exactReadbacks(hostileInternal, copied)) {
        throw new Error('hostile adapter internal -> CGL output copy was not exact')
      }
    })).phase)

    const parity = compareReadbacks('neutral-vs-hostile', neutralReadback, hostileInternal, 0)
    parity.artifacts = createComparisonArtifacts(neutralReadback, hostileInternal, parity)
    parity.copyExact = true
    results.push(parity)
    neutralHostileOutputExact = parity.mismatchedChannels === 0
    if (!neutralHostileOutputExact) {
      failures.push({
        firstDivergences: parity.firstDivergences,
        id: 'neutral-vs-hostile',
        mismatchedChannels: parity.mismatchedChannels,
      })
    }

    const executePass = backend.executePass.bind(backend)
    backend.executePass = () => { throw new Error('intentional Task 9 render failure') }
    const beforeThrown = captureComparableState(context, backend.maxTextureUnits)
    let thrownRenderObserved = false
    try {
      guarded(context, backend, () => pipeline.render(1 / 60))
    } catch (error) {
      thrownRenderObserved = error.message === 'intentional Task 9 render failure'
    } finally {
      backend.executePass = executePass
    }
    const afterThrown = captureComparableState(context, backend.maxTextureUnits)
    phases.push(phaseStateResult('thrown-render', beforeThrown, afterThrown))
    if (!thrownRenderObserved) failures.push({ id: 'thrown-render-not-observed' })

    phases.push(snapshotPhase(context, backend, 'second-reset', () => (
      guarded(context, backend, () => pipeline.resize(WIDTH, HEIGHT))
    )).phase)

    transformFeedbackProbe = createTransformFeedbackProbe(context)
    phases.push(snapshotPhase(context, backend, 'guest-active-transform-feedback', () => (
      guarded(context, backend, () => transformFeedbackProbe.begin())
    )).phase)
    activeGuestTransformFeedback = context.gl.getParameter(context.gl.TRANSFORM_FEEDBACK_ACTIVE)
      ? 'leaked-active'
      : 'preserved'
    if (activeGuestTransformFeedback !== 'preserved') {
      failures.push({ id: 'guest-transform-feedback-remained-active' })
    }

    const hostileBeforeActiveHost = captureComparableState(context, backend.maxTextureUnits)
    transformFeedbackProbe.begin()
    let callbackRan = false
    let failureCode
    try {
      withGLState(context.gl, context.cgl, () => { callbackRan = true }, {
        CGL: context.CGL,
        maxTextureUnits: backend.maxTextureUnits,
      })
    } catch (error) {
      failureCode = error.code
    }
    const remainedActive = context.gl.getParameter(context.gl.TRANSFORM_FEEDBACK_ACTIVE)
    context.gl.endTransformFeedback()
    restoreComparableState(context, hostileBeforeActiveHost)
    const hostileAfterActiveHost = captureComparableState(context, backend.maxTextureUnits)
    phases.push(phaseStateResult(
      'host-active-transform-feedback',
      hostileBeforeActiveHost,
      hostileAfterActiveHost,
    ))
    activeHostTransformFeedback = !callbackRan && remainedActive &&
      failureCode === 'ERR_ACTIVE_HOST_TRANSFORM_FEEDBACK'
      ? 'failed-closed'
      : 'failed-open'
    if (activeHostTransformFeedback !== 'failed-closed') {
      failures.push({ callbackRan, failureCode, id: 'host-transform-feedback-fail-closed' })
    }

    phases.push(snapshotPhase(context, backend, 'disposal', () => guarded(context, backend, () => {
      copier.dispose()
      pipeline.dispose()
      disposed = true
    })).phase)

    const afterHostOutput = hostConsumer.render()
    const consumerParity = compareReadbacks(
      'cgl-cache-consumer',
      beforeHostOutput,
      afterHostOutput,
      0,
    )
    consumerParity.artifacts = createComparisonArtifacts(
      beforeHostOutput,
      afterHostOutput,
      consumerParity,
    )
    consumerParity.copyExact = true
    results.push(consumerParity)
    cglCacheConsumer = hostConsumer.cacheReport(consumerParity.mismatchedChannels === 0)
    if (!cglCacheConsumer.exact) {
      failures.push({
        firstDivergences: consumerParity.firstDivergences,
        id: 'cgl-cache-consumer-output-changed',
        mismatchedChannels: consumerParity.mismatchedChannels,
      })
    }

    for (const phase of phases) {
      if (!phase.exact) failures.push({ differences: phase.differences, id: phase.name })
    }
  } catch (error) {
    if (error.task9Phase) phases.push(error.task9Phase)
    failures.push(errorDiagnostic(error, { id: 'state-hygiene-exception' }))
  } finally {
    try { transformFeedbackProbe?.dispose() } catch (error) {
      failures.push(errorDiagnostic(error, { id: 'transform-feedback-cleanup' }))
    }
    if (!disposed && pipeline && backend) {
      try { guarded(context, backend, () => pipeline.dispose()) } catch (error) {
        failures.push(errorDiagnostic(error, { id: 'pipeline-cleanup' }))
      }
    }
    try { hostConsumer?.dispose() } catch (error) {
      failures.push(errorDiagnostic(error, { id: 'host-consumer-cleanup' }))
    }
    try { hostile?.dispose() } catch (error) {
      failures.push(errorDiagnostic(error, { id: 'hostile-cleanup' }))
    }
    if (context.gl.isContextLost()) failures.push({ id: 'state-context-lost' })
    if (neutralContext.gl.isContextLost()) failures.push({ id: 'neutral-context-lost' })
    destroyHarnessContext(context)
    destroyHarnessContext(neutralContext)
  }

  return {
    activeGuestTransformFeedback,
    activeHostTransformFeedback,
    cglCacheConsumer,
    failures,
    hostileCoverage,
    neutralHostileOutputExact,
    phases,
    preflight,
    results,
    thrownCompileObserved,
  }
}
