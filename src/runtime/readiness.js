export function createLazyReadiness(bootstrap) {
  if (typeof bootstrap !== 'function') throw new TypeError('bootstrap must be a function')

  let readiness = null

  return function ensureReady() {
    if (readiness) return readiness

    const attempt = Promise.resolve().then(bootstrap)
    const guarded = attempt.catch((error) => {
      if (readiness === guarded) readiness = null
      throw error
    })

    // Mark the lazy attempt handled immediately while preserving its rejection for every caller.
    guarded.catch(() => {})
    readiness = guarded
    return guarded
  }
}
