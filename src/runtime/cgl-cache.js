const PINNED_CABLES_CORE_COMMIT = 'd9c551c8b0d167ff7d8f00695636905214763711'

export class UnsupportedCGLCacheShapeError extends Error {
  constructor(missing) {
    super(
      `Unsupported Cables CGL cache shape; missing ${missing.join(', ')} ` +
      `(expected core ${PINNED_CABLES_CORE_COMMIT})`,
    )
    this.name = 'UnsupportedCGLCacheShapeError'
    this.code = 'ERR_UNSUPPORTED_CGL_CACHE_SHAPE'
    this.missing = [...missing]
    this.pinnedCoreCommit = PINNED_CABLES_CORE_COMMIT
  }
}

function isObject(value) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function resolveNamespace(cgl, options) {
  if (isObject(options.CGL)) return options.CGL
  if (isObject(cgl?.CGL)) return cgl.CGL
  if (isObject(globalThis.CGL)) return globalThis.CGL
  return undefined
}

export function createCGLCacheInvalidator(cgl, options = {}) {
  const CGL = resolveNamespace(cgl, options)
  const meshCache = isObject(CGL?.MESH) ? CGL.MESH : undefined
  const hasProgramCache = isObject(cgl) && 'currentProgram' in cgl
  const hasMeshCache = isObject(meshCache) && 'lastMesh' in meshCache
  const missing = []
  if (!hasProgramCache) missing.push('currentProgram')
  if (!hasMeshCache) missing.push('CGL.MESH.lastMesh')

  const customInvalidator = options.cacheInvalidator
  if (customInvalidator !== undefined && typeof customInvalidator !== 'function') {
    throw new TypeError('cacheInvalidator must be a function')
  }

  if (missing.length > 0) throw new UnsupportedCGLCacheShapeError(missing)

  return function invalidateCGLCaches() {
    const failures = []
    const attempt = (operation) => {
      try {
        operation()
      } catch (error) {
        failures.push(error)
      }
    }

    if (hasProgramCache) attempt(() => { cgl.currentProgram = null })
    if (hasMeshCache) attempt(() => { meshCache.lastMesh = null })
    if (isObject(cgl) && 'lastMesh' in cgl) attempt(() => { cgl.lastMesh = null })
    if (customInvalidator) {
      attempt(() => customInvalidator({ CGL, cgl, missing: [] }))
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'CGL cache invalidation failed')
    }
  }
}

export function invalidateCGLCaches(cgl, options = {}) {
  createCGLCacheInvalidator(cgl, options)()
}

export const cablesCoreCompatibility = Object.freeze({
  commit: PINNED_CABLES_CORE_COMMIT,
  meshCache: 'CGL.MESH.lastMesh',
  programCache: 'cgl.currentProgram',
})
