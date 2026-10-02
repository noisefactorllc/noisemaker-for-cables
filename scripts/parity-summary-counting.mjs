// Pure counting core for scripts/parity-summary.
//
// Extracted so the summary's counting contract is unit-testable
// (test/parity-summary-counting.test.js): harness sweep failures — resource
// leaks, thrown diagnostics — must surface as `fail` for the affected case,
// never leave a pass count behind, and must not inflate counts for cases that
// were not requested.

const RESOURCE_LEAK_SUFFIX = ':resource-leak'

// Harness failures carry either the bare effect id (thrown diagnostics) or
// `<effectId>:resource-leak` (per-effect GL resource accounting).
export function failureEffectId(failure) {
  const raw = String(failure?.effectId ?? failure?.id ?? '')
  return raw.endsWith(RESOURCE_LEAK_SUFFIX)
    ? raw.slice(0, raw.length - RESOURCE_LEAK_SUFFIX.length)
    : raw
}

const ZERO_COUNTS = () => ({
  defer: 0,
  exact: 0,
  executed: 0,
  fail: 0,
  missing: 0,
  near: 0,
  skip: 0,
  strict: 0,
})

// Counts the requested cases against harness results and sweep failures.
// targetIds: requested case ids (defining `expected`); resultsById: Map of
// harness results by id; sweepFailures: harness failure records.
// Returns { counts, records } where records are the per-case JSON lines.
export function countCases(targetIds, resultsById, sweepFailures) {
  const counts = ZERO_COUNTS()
  counts.expected = targetIds.length
  const failedIds = new Set(sweepFailures.map(failureEffectId))
  const records = []
  for (const id of targetIds) {
    const result = resultsById.get(id)
    if (!result) {
      // A harness failure attributed to this id (a thrown compile/render/
      // dispose diagnostic) is a definitive fail, not an absent catalog id.
      if (failedIds.has(id)) {
        counts.executed += 1
        counts.fail += 1
        records.push({ id, status: 'fail' })
      } else {
        counts.missing += 1
        records.push({ id, status: 'missing' })
      }
      continue
    }
    if (result.rendered === false) {
      counts.executed += 1
      // A harness failure attributed to this case (e.g. a GL resource leak on
      // a compile-only case) overrides the visible skip with a real fail.
      const status = failedIds.has(id) ? 'fail' : 'skip'
      counts[status] += 1
      records.push({
        classification: result.classification ?? null,
        compiled: result.compiled === true,
        id,
        linked: result.linked === true,
        reason: result.reason ?? null,
        status,
      })
      continue
    }
    const withinCeiling = (result.mismatchedChannels ?? Number.POSITIVE_INFINITY)
      <= (result.channelCeiling ?? 0)
    // The published contract requires every rendered case to satisfy all
    // gates: zero-ceiling channel match, exact internal→CGL output copy,
    // finite readback, and no leaked GL resources
    // (test/browser/full-catalog.spec.js, parity/coverage-matrix.json
    // checkpoint). Any unmet gate is a fail — within-ceiling cases that miss
    // the copy/finite/resource gates are NOT strict passes, so a closure
    // could never hide a broken copy, a non-finite readback, or a leaked
    // context resource behind exact+strict.
    const gatesPass = withinCeiling && result.copyExact === true &&
      result.finite === true && result.resourceLeak === undefined
    const status = failedIds.has(id) || !gatesPass
      ? 'fail'
      : (result.mismatchedChannels === 0 ? 'exact' : 'strict')
    counts.executed += 1
    counts[status] += 1
    records.push({
      comparedChannels: result.comparedChannels,
      copyExact: result.copyExact === true,
      finite: result.finite === true,
      firstDivergences: result.firstDivergences ?? [],
      id,
      maxChannelError: result.maxChannelError ?? null,
      mismatchedChannels: result.mismatchedChannels ?? null,
      status,
    })
  }
  return { counts, records }
}