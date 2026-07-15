const EXTERNAL_INPUT_SUFFIX = /_step_\d+$/

function assertGraph(graph) {
  if (!graph || !Array.isArray(graph.passes)) {
    throw new TypeError('compiled graph.passes must be an array')
  }
}

function textureDimension(texture, property, getter) {
  const value = typeof texture?.[getter] === 'function'
    ? texture[getter]()
    : texture?.[property]
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`CGL texture ${property} must be a positive finite number`)
  }
  return value
}

function defaultTextureRecord(backend) {
  if (typeof backend.getDefaultTextureInfo === 'function') {
    const info = backend.getDefaultTextureInfo()
    return {
      format: info.format ?? 'rgba8',
      glFormat: info.glFormat ?? null,
      handle: info.handle,
      height: info.height ?? 1,
      width: info.width ?? 1,
    }
  }
  if (backend.defaultTexture === undefined || backend.defaultTexture === null) {
    throw new TypeError('backend transparent default texture is unavailable')
  }
  return {
    format: 'rgba8',
    glFormat: null,
    handle: backend.defaultTexture,
    height: 1,
    width: 1,
  }
}

export function findExternalTextureIds(graph) {
  assertGraph(graph)
  const ids = []
  const seen = new Set()

  for (const pass of graph.passes) {
    if (!pass?.inputs || typeof pass.inputs !== 'object') continue
    for (const id of Object.values(pass.inputs)) {
      if (typeof id !== 'string' || !EXTERNAL_INPUT_SUFFIX.test(id) || seen.has(id)) {
        continue
      }
      seen.add(id)
      ids.push(id)
    }
  }

  return ids
}

export function bindExternalTexture({ backend, graph, pipeline, texture }) {
  if (!backend || typeof backend.registerExternalTexture !== 'function') {
    throw new TypeError('backend.registerExternalTexture is required')
  }
  if (!pipeline || typeof pipeline.setUniform !== 'function') {
    throw new TypeError('pipeline.setUniform is required')
  }

  const ids = findExternalTextureIds(graph)
  let record
  let ownership

  if (texture === undefined || texture === null) {
    record = defaultTextureRecord(backend)
    ownership = 'default'
  } else {
    if (texture.tex === undefined || texture.tex === null) {
      throw new TypeError('CGL input texture must expose its WebGL handle as .tex')
    }
    record = {
      format: 'external',
      glFormat: null,
      handle: texture.tex,
      height: textureDimension(texture, 'height', 'getHeight'),
      width: textureDimension(texture, 'width', 'getWidth'),
    }
    ownership = 'external'
  }

  for (const id of ids) {
    backend.registerExternalTexture(id, record, { kind: 'media', ownership })
  }
  if (ids.length > 0) pipeline.setUniform('imageSize', [record.width, record.height])

  return {
    height: record.height,
    ids,
    texture: texture ?? null,
    width: record.width,
  }
}
