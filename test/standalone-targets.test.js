import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { SUPPORTED_CABLES_STANDALONE_VERSIONS } from '../tools/lib/cables-standalone-identity.js'

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

// GitHub-hosted runner labels for each declared Standalone target. The
// Apple-silicon labels are arm64 images; macos-15-intel is the x86_64 image.
const DECLARED_TARGETS = {
  'Windows x64': ['windows-2025'],
  'Intel macOS': ['macos-15-intel'],
  'macOS arm64': ['macos-15', 'macos-14', 'macos-26'],
  'Linux x64': ['ubuntu-24.04'],
}

function standaloneJob(workflow) {
  const lines = workflow.split('\n')
  const start = lines.indexOf('  standalone:')
  assert.notEqual(start, -1, 'export-kit.yml has a standalone job')
  let end = lines.findIndex((line, index) => index > start && /^ {2}\S/.test(line))
  if (end === -1) end = lines.length
  return lines.slice(start, end).join('\n')
}

function matrixList(job, key) {
  const match = new RegExp(`^\\s+${key}: \\[([^\\]]*)\\]`, 'm').exec(job)
  assert.ok(match, `standalone matrix declares ${key}`)
  return match[1].split(',').map((value) => value.trim().replace(/^'|'$/g, ''))
}

test('the standalone matrix runs every declared target on every declared Standalone version', async () => {
  const job = standaloneJob(await readProjectFile('.github/workflows/export-kit.yml'))
  const runners = matrixList(job, 'os')
  for (const [target, labels] of Object.entries(DECLARED_TARGETS)) {
    assert.ok(runners.some((runner) => labels.includes(runner)), `no standalone leg for ${target} (runners: ${runners.join(', ')})`)
  }
  assert.deepEqual(matrixList(job, 'version'), SUPPORTED_CABLES_STANDALONE_VERSIONS)
  assert.doesNotMatch(job, /\bexclude:/, 'no declared target and version pair may be excluded')
})

test('each macOS leg mounts the distribution for its own architecture and runs it natively', async () => {
  const job = standaloneJob(await readProjectFile('.github/workflows/export-kit.yml'))
  assert.match(job, /cables-\$\{CABLES_VERSION\}-mac-\$\{DISTRIBUTION\}\.dmg/)
  assert.match(job, /ARM64\) DISTRIBUTION=arm64 MACHINE=arm64/)
  assert.match(job, /X64\) DISTRIBUTION=x64 MACHINE=x86_64/)
  // The machine is native (not Rosetta) and the executable carries that architecture.
  assert.match(job, /test "\$\(uname -m\)" = "\$MACHINE"/)
  assert.match(job, /sysctl\.proc_translated/)
  assert.match(job, /lipo -archs "\$app"/)
})

test('the installation guide states the declared platform contract, macOS arm64 included', async () => {
  const guide = await readProjectFile('docs/installation.md')
  const prose = guide.replace(/\s+/g, ' ')
  for (const target of Object.keys(DECLARED_TARGETS)) {
    assert.ok(prose.includes(target), `docs/installation.md does not name ${target}`)
  }
  // Every Standalone version statement names exactly the declared versions.
  const statements = prose.match(/Standalone 0\.11\.\d+(?:(?: \/ |, | and )0\.11\.\d+)*/g) ?? []
  assert.ok(statements.length > 0)
  for (const statement of statements) {
    assert.deepEqual(statement.match(/0\.11\.\d+/g), SUPPORTED_CABLES_STANDALONE_VERSIONS, statement)
  }
  // The guide says how the macOS arm64 leg is measured and where results live.
  assert.match(prose, /macOS arm64[^.]*ANGLE Metal/)
  assert.match(prose, /https:\/\/github\.com\/noisefactorllc\/noisemaker-for-cables\/issues\/5/)
})
