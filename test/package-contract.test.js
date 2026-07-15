import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('private package metadata describes the portable Cables distribution', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'))

  assert.equal(packageJson.name, '@noisefactor/noisemaker-cablesgl')
  assert.equal(packageJson.private, true)
  assert.equal(packageJson.type, 'module')
  assert.equal(packageJson.exports, undefined)
})

test('published files are limited to package assets and lock metadata', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'))

  assert.deepEqual(packageJson.files, [
    'Ops.Extension.Noisemaker/',
    'README.md',
    'docs/architecture.md',
    'docs/catalog-update.md',
    'docs/installation.md',
    'examples/README.md',
    'examples/noisemaker-program.cables',
    'parity/catalog-inputs.js',
    'parity/programs.json',
    'vendor.lock.json',
  ])
})

test('package scripts expose the complete development workflow', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'))

  for (const script of [
    'test',
    'build',
    'vendor:update',
    'vendor:verify',
    'test:browser',
    'test:standalone',
    'verify',
  ]) {
    assert.equal(typeof packageJson.scripts[script], 'string', `missing ${script} script`)
  }
  assert.match(packageJson.scripts.verify, /npm pack --dry-run/)
})

test('source facade exposes only the planned bridge APIs', async () => {
  const source = await readProjectFile('src/index.js')

  assert.equal(
    source,
    [
      "export { createProgramController } from './controller/program-controller.js'",
      "export { CablesWebGL2Backend } from './backend/cables-webgl2-backend.js'",
      "export { captureGLState, restoreGLState, withGLState } from './runtime/gl-state.js'",
      '',
    ].join('\n'),
  )
})

test('README identifies the package and its single-op scope', async () => {
  const readme = await readProjectFile('README.md')

  assert.match(readme, /^# @noisefactor\/noisemaker-cablesgl$/m)
  assert.match(readme, /Ops\.Extension\.Noisemaker\.Program/)
})

test('reproducible vendor source is tracked while generated and local-only data is ignored', async () => {
  const gitignore = await readProjectFile('.gitignore')
  const patterns = new Set(
    gitignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )

  for (const pattern of [
    'node_modules/',
    'playwright-report/',
    'test-report/',
    'test-results/',
    'test/screenshots/',
    '.build/',
  ]) {
    assert.ok(patterns.has(pattern), `missing ignore pattern: ${pattern}`)
  }
  assert.equal(patterns.has('vendor-cache/'), false, 'vendor-cache must be versioned source input')
})

test('catalog documentation defines the versioned vendor-cache and update-only mutable alias', async () => {
  const documentation = await readProjectFile('docs/catalog-update.md')

  assert.match(documentation, /vendor-cache.*source input.*versioned/is)
  assert.match(documentation, /mutable.*\/1\/.*only.*explicit.*update/is)
})

test('agent process artifact directories are absent and ignored from initial staging', async () => {
  const gitignore = await readProjectFile('.gitignore')
  const patterns = new Set(
    gitignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )

  for (const directory of ['.superpowers/', 'docs/superpowers/']) {
    assert.ok(patterns.has(directory), `missing ignore pattern: ${directory}`)
    await assert.rejects(
      access(new URL(`../${directory}`, import.meta.url), constants.F_OK),
      (error) => error?.code === 'ENOENT',
      `${directory} must be absent from release source`,
    )
  }
})
