function appendPresentation(program) {
  if (/\brender\s*\(/.test(program)) return program.trim()
  const surfaces = [...program.matchAll(/\.write\s*\(\s*([A-Za-z][A-Za-z0-9_]*)/g)]
  const surface = surfaces.at(-1)?.[1]
  if (!surface) throw new Error('catalog defaultProgram does not write a 2D surface')
  return `${program.trim()}\n\nrender(${surface})`
}

function ordinaryProcessor(namespace, func) {
  return `search synth, ${namespace}\n\nnoise(seed: 1, ridges: true)\n  .${func}()\n  .write(o0)\n\nrender(o0)`
}

function starter(namespace, func) {
  return `search ${namespace}\n\n${func}()\n  .write(o0)\n\nrender(o0)`
}

function pointsProgram(func) {
  return `search synth, points, render\n\nperlin()\n  .pointsEmit(stateSize: x64)\n  .${func}()\n  .pointsRender()\n  .write(o0)\n\nrender(o0)`
}

function volumeProgram(namespace, func) {
  const chain = namespace === 'synth3d' ? `${func}(volumeSize: x32)` : `noise3d(volumeSize: x32)\n  .${func}()`
  return `search synth3d, filter3d, render\n\n${chain}\n  .render3d()\n  .write(o0)\n\nrender(o0)`
}

function volumeRenderer(func) {
  return `search synth3d, render\n\nnoise3d(volumeSize: x32)\n  .${func}()\n  .write(o0)\n\nrender(o0)`
}

function surfaceInputNames(definition) {
  return Object.entries(definition.globals || {})
    .filter(([, spec]) => spec?.type === 'surface')
    .map(([name]) => name)
}

function defaultProgramWiresSurfaces(program, names) {
  return names.every((name) => new RegExp(`\\b${name}\\s*:\\s*read\\s*\\(`).test(program))
}

function surfaceInputProgram(namespace, func, names, isStarter) {
  if (names.length > 7) {
    throw new Error(`${namespace}/${func} requires an explicit high-arity surface fixture`)
  }
  const colors = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#6d597a', '#ff70a6']
  const seeds = names
    .map((_, index) => `solid(color: ${colors[index]}).write(o${index})`)
    .join('\n\n')
  const args = names.map((name, index) => `${name}: read(o${index})`).join(', ')
  const call = isStarter
    ? `${func}(${args})`
    : `noise(seed: 1, ridges: true)\n  .${func}(${args})`
  const output = `o${names.length}`
  const namespaces = [...new Set(['synth', namespace])].join(', ')
  return `search ${namespaces}\n\n${seeds}\n\n${call}\n  .write(${output})\n\nrender(${output})`
}

function remapProgram() {
  const colors = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#6d597a', '#ff70a6', '#70d6ff']
  const seeds = colors
    .map((color, index) => `solid(color: ${color}).write(o${index})`)
    .join('\n\n')
  const zones = colors.map((_, index) => {
    const left = index / colors.length
    const right = (index + 1) / colors.length
    return [
      `zone${index}_tex: read(o${index})`,
      `zone${index}_count: 4`,
      `zone${index}_v0: [${left}, 0, ${right}, 0]`,
      `zone${index}_v1: [${right}, 1, ${left}, 1]`,
    ].join(',\n  ')
  }).join(',\n  ')
  return `search synth\n\n${seeds}\n\nremap(\n  zoneCount: 8,\n  ${zones}\n)\n  .write(o0)\n\nrender(o0)`
}

function mashupProgram() {
  const colors = ['#111111', '#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#6d597a', '#ff70a6']
  const seeds = colors
    .map((color, index) => `solid(color: ${color}).write(o${index})`)
    .join('\n\n')
  const layers = colors
    .map((_, index) => `layer${index}_tex: read(o${index})`)
    .join(',\n  ')
  return `search synth, mixer\n\n${seeds}\n\nmashup(\n  source: read(o0),\n  layers: 8,\n  ${layers}\n)\n  .write(o0)\n\nrender(o0)`
}

const SPECIAL_PROGRAMS = {
  'render/loopBegin': `search synth, filter, render\n\nnoise()\n  .loopBegin()\n  .warp()\n  .loopEnd()\n  .write(o0)\n\nrender(o0)`,
  'render/loopEnd': `search synth, filter, render\n\nnoise()\n  .loopBegin()\n  .warp()\n  .loopEnd()\n  .write(o0)\n\nrender(o0)`,
  'render/meshLoader': `search render\n\nmeshLoader()\n  .meshRender()\n  .write(o0)\n\nrender(o0)`,
  'render/meshRender': `search render\n\nmeshLoader()\n  .meshRender()\n  .write(o0)\n\nrender(o0)`,
  'render/pointsEmit': `search synth, points, render\n\nperlin()\n  .pointsEmit(stateSize: x64)\n  .pointsRender()\n  .write(o0)\n\nrender(o0)`,
  'render/pointsRender': `search synth, points, render\n\nperlin()\n  .pointsEmit(stateSize: x64)\n  .pointsRender()\n  .write(o0)\n\nrender(o0)`,
  'render/pointsBillboardRender': `search synth, points, render\n\nsolid(color: #ffffff)\n  .write(o0)\n\nperlin()\n  .pointsEmit(stateSize: x64)\n  .pointsBillboardRender(tex: read(o0))\n  .write(o1)\n\nrender(o1)`,
}

export function createCatalogProgram({ effectId, definition, metadata = {} }) {
  if (typeof definition === 'function') definition = new definition()
  if (!definition || typeof definition !== 'object') {
    throw new TypeError(`${effectId} has no effect definition`)
  }
  if (SPECIAL_PROGRAMS[effectId]) return SPECIAL_PROGRAMS[effectId]
  if (effectId === 'synth/remap') return remapProgram()
  if (effectId === 'mixer/mashup') return mashupProgram()

  const namespace = definition.namespace || effectId.split('/')[0]
  const func = definition.func || effectId.split('/').at(-1)
  const surfaces = surfaceInputNames(definition)

  if (
    definition.defaultProgram &&
    (surfaces.length === 0 || defaultProgramWiresSurfaces(definition.defaultProgram, surfaces))
  ) {
    return appendPresentation(definition.defaultProgram)
  }
  if (surfaces.length > 0) {
    return surfaceInputProgram(namespace, func, surfaces, Boolean(metadata.starter))
  }

  if (namespace === 'points') return pointsProgram(func)
  if (namespace === 'filter3d') return volumeProgram(namespace, func)
  if (namespace === 'synth3d') return volumeProgram(namespace, func)
  if (
    namespace === 'render' &&
    new Set(['render3d', 'renderLit3d', 'renderCubemap3d', 'renderCubemapSurface']).has(func)
  ) {
    return volumeRenderer(func)
  }
  if (namespace === 'render') {
    throw new Error(`${effectId} requires an explicit render fixture`)
  }
  if (metadata.starter) return starter(namespace, func)
  return ordinaryProcessor(namespace, func)
}
