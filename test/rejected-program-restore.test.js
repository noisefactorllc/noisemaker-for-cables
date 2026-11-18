// Ported from upstream noisemaker's shaders/tests/test_pipeline.js
// ("FIX: keep the running program when a recompiled shader is rejected",
// vendored at Build b631fc2c): when Pipeline.compilePrograms(graph) compiles a
// candidate graph and one program fails, the backend gets back the programs it
// held before the call, so a rejected candidate never replaces a program that
// the current graph renders with. The candidate's own programs are released,
// the pipeline graph and isCompiling state stay unchanged.
import assert from 'node:assert/strict'
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

installTestDomShim(globalThis)

const { Backend, Pipeline } = await import('../vendor-cache/noisemaker-shaders-core.esm.js')

class MockBackend extends Backend {
  constructor() {
    super(null)
  }

  async init() {}

  async compileProgram(id, spec) {
    this.programs.set(id, {
      handle: `mock_program_${id}`,
      type: spec.type || 'render',
    })
    return this.programs.get(id)
  }

  getName() {
    return 'Mock'
  }

  static isAvailable() {
    return true
  }
}

test('pinned core Pipeline keeps the accepted programs when a candidate graph is rejected', async () => {
  const backend = new MockBackend()
  const released = []
  backend.releaseProgram = (program) => released.push(program.handle)
  const accepted = {
    passes: [{ id: 'a', program: 'node_0_solid' }],
    programs: { node_0_solid: { source: 'accepted solid' } },
    textures: new Map(),
  }
  const pipeline = new Pipeline(accepted, backend)
  await pipeline.compilePrograms()
  const acceptedSolid = backend.programs.get('node_0_solid')

  // The candidate reuses the accepted program's id with another source, adds
  // a program that compiles, and then one that the backend rejects.
  backend.compileProgram = async (id, spec) => {
    if (spec.source === 'invalid') throw { code: 'ERR_SHADER_COMPILE', program: id }
    backend.programs.set(id, { handle: `candidate_${id}` })
  }
  const candidate = {
    passes: [
      { id: 'a', program: 'node_0_solid' },
      { id: 'b', program: 'node_1_extra' },
      { id: 'c', program: 'node_2_colorize' },
    ],
    programs: {
      node_0_solid: { source: 'candidate solid' },
      node_1_extra: { source: 'extra' },
      node_2_colorize: { source: 'invalid' },
    },
    textures: new Map(),
  }

  let rejection = null
  try {
    await pipeline.compilePrograms(candidate)
  } catch (error) {
    rejection = error
  }

  assert.equal(rejection?.code, 'ERR_SHADER_COMPILE', 'The rejected program must fail the candidate compile')
  assert.equal(pipeline.graph, accepted, 'compilePrograms(candidate) must not change the pipeline graph')
  assert.equal(pipeline.isCompiling, false, 'isCompiling must clear after a rejection')
  assert.equal(backend.programs.get('node_0_solid'), acceptedSolid, 'the accepted program was not restored')
  assert.deepEqual([...backend.programs.keys()], ['node_0_solid'], 'Expected only the accepted program')
  assert.deepEqual(
    [...released].sort(),
    ['candidate_node_0_solid', 'candidate_node_1_extra'],
    'Expected the candidate programs to be released',
  )
})
