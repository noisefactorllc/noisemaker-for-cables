import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { promisify } from 'node:util'
import { test } from 'node:test'

const execFileAsync = promisify(execFile)
const projectRoot = new URL('..', import.meta.url)

const declaredFiles = [
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
]

const expectedArchiveFiles = [
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/Ops.Extension.Noisemaker.Program.js',
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/Ops.Extension.Noisemaker.Program.json',
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/Ops.Extension.Noisemaker.Program.md',
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/lib_noisemaker-cablesgl.js',
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.json',
  'README.md',
  'docs/architecture.md',
  'docs/catalog-update.md',
  'docs/installation.md',
  'examples/README.md',
  'examples/noisemaker-program.cables',
  'package.json',
  'parity/catalog-inputs.js',
  'parity/programs.json',
  'vendor.lock.json',
].sort()

async function walkFiles(root, directory = root) {
  const files = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walkFiles(root, path))
    else if (entry.isFile()) files.push(relative(root, path))
  }

  return files
}

test('npm archive is the exact self-contained Cables Standalone distribution', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'noisemaker-for-cables-pack-'))

  try {
    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    assert.deepEqual(packageJson.files, declaredFiles)

    const { stdout } = await execFileAsync(
      'npm',
      ['pack', '--json', '--pack-destination', temporaryDirectory],
      { cwd: projectRoot },
    )
    const packResult = JSON.parse(stdout)
    assert.equal(packResult.length, 1)
    assert.equal(packResult[0].entryCount, 15)
    assert.equal(
      packResult[0].files.some((file) => file.path.startsWith('vendor-cache/')),
      false,
    )

    const archivePath = join(temporaryDirectory, packResult[0].filename)
    assert.equal((await stat(archivePath)).isFile(), true)
    await execFileAsync('tar', ['-xzf', archivePath, '-C', temporaryDirectory])

    const packageRoot = join(temporaryDirectory, 'package')
    const actualFiles = (await walkFiles(packageRoot)).sort()
    assert.deepEqual(actualFiles, expectedArchiveFiles)

    const forbidden = /localhost|\/Users\/|\/home\//i
    for (const path of actualFiles) {
      const bytes = await readFile(join(packageRoot, path))
      const text = bytes.toString('utf8')
      assert.doesNotMatch(text, forbidden, `${path} contains a machine-local or cache reference`)
    }

    const opDirectory = join(
      packageRoot,
      'Ops.Extension.Noisemaker',
      'Ops.Extension.Noisemaker.Program',
    )
    const metadata = JSON.parse(await readFile(join(
      opDirectory,
      'Ops.Extension.Noisemaker.Program.json',
    ), 'utf8'))
    assert.equal(metadata.libs, undefined)
    assert.deepEqual(metadata.dependencies, [{
      src: './lib_noisemaker-cablesgl.js',
      type: 'commonjs',
    }])
    for (const dependency of metadata.dependencies) {
      assert.equal((await stat(join(opDirectory, basename(dependency.src)))).isFile(), true)
    }

    const example = JSON.parse(await readFile(
      join(packageRoot, 'examples/noisemaker-program.cables'),
      'utf8',
    ))
    assert.deepEqual(example.dirs?.ops, ['../Ops.Extension.Noisemaker'])
    assert.equal(
      example.ops.some((op) => op.objName === 'Ops.Extension.Noisemaker.Program'),
      true,
    )
    assert.equal(
      example.ops.some((op) => op.objName === 'Ops.Ui.VizTexture'),
      true,
    )
    assert.equal(
      example.ops.some((op) => op.objName === 'Ops.Gl.ImageCompose.DrawImage_v3'),
      false,
    )
    const program = example.ops.find((op) => op.objName === 'Ops.Extension.Noisemaker.Program')
    const viz = example.ops.find((op) => op.objName === 'Ops.Ui.VizTexture')
    const textureLinks = program.portsOut
      ?.find((port) => port.name === 'Texture')
      ?.links || []
    assert.equal(
      textureLinks.some((link) => (
        link.objIn === viz.id &&
        link.portIn === 'Texture In' &&
        link.objOut === program.id
      )),
      true,
    )
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true })
  }
})

test('documented media DSL compiles with the pinned full Polymorphic catalog', async () => {
  const documentation = await readFile(new URL('../examples/README.md', import.meta.url), 'utf8')
  const match = /For media,[\s\S]*?```text\n([\s\S]*?)\n```/.exec(documentation)
  assert.ok(match, 'media example code block is missing')

  globalThis.HTMLElement ||= class {}
  globalThis.customElements ||= { define() {}, get() {}, whenDefined: () => Promise.resolve() }
  globalThis.window ||= globalThis
  globalThis.document ||= {
    body: { appendChild() {} },
    createElement: () => ({ appendChild() {}, getContext: () => null, style: {} }),
    createElementNS: () => ({ style: {} }),
    head: { appendChild() {} },
  }
  const { compileProgram } = await import('../src/runtime/engine.js')
  const graph = await compileProgram(match[1])
  assert.ok(graph.passes.length > 0)
})
