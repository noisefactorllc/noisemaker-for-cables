import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import {
  artifactPathForEffect,
  sha256,
  updateArtifactLock,
  validateManifest,
  verifyArtifactLock,
} from '../tools/lib/artifact-lock.js'

const fixtureManifest = {
  'synth/zeta': { description: 'Zeta fixture' },
  'filter/alpha': { description: 'Alpha fixture' },
}

const fixtureArtifacts = new Map([
  ['/1/noisemaker-shaders-core.esm.js', Buffer.from('export const core = true\n')],
  ['/1/effects/manifest.json', Buffer.from(JSON.stringify(fixtureManifest))],
  ['/1/effects/filter/alpha.js', Buffer.from("export const effectId = 'filter/alpha'\n")],
  ['/1/effects/synth/zeta.js', Buffer.from("export const effectId = 'synth/zeta'\n")],
])

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function withVendorFixture(run) {
  const requestedPaths = []
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://fixture.invalid').pathname
    requestedPaths.push(pathname)
    const bytes = fixtureArtifacts.get(pathname)

    if (!bytes) {
      response.writeHead(404)
      response.end('not found')
      return
    }

    response.writeHead(200, { 'content-type': 'application/octet-stream' })
    response.end(bytes)
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const directory = await mkdtemp(join(tmpdir(), 'noisemaker-vendor-lock-'))
  const address = server.address()
  const sourceBaseUrl = `http://127.0.0.1:${address.port}/1/`
  const cacheRoot = join(directory, 'vendor-cache')
  const lockPath = join(directory, 'vendor.lock.json')

  try {
    await run({ cacheRoot, lockPath, requestedPaths, sourceBaseUrl })
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    await rm(directory, { force: true, recursive: true })
  }
}

async function updateFixture(options) {
  return updateArtifactLock(options)
}

async function readLock(lockPath) {
  return JSON.parse(await readFile(lockPath, 'utf8'))
}

async function writeLock(lockPath, lock) {
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
}

async function replaceLockedArtifact({ cacheRoot, lockPath }, path, bytes) {
  const lock = await readLock(lockPath)
  const artifact = lock.artifacts.find((candidate) => candidate.path === path)
  assert.ok(artifact, `missing fixture artifact ${path}`)
  artifact.bytes = bytes.byteLength
  artifact.sha256 = digest(bytes)
  await writeFile(join(cacheRoot, ...path.split('/')), bytes)
  await writeLock(lockPath, lock)
}

test('sha256 returns canonical lowercase hexadecimal', async () => {
  const actual = await sha256(Buffer.from('abc'))

  assert.equal(actual, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.match(actual, /^[0-9a-f]{64}$/)
})

test('effect artifact paths cannot escape the cache root', () => {
  assert.equal(artifactPathForEffect('synth/zeta'), 'effects/synth/zeta.js')

  for (const effectId of [
    '',
    '../escape',
    '/absolute',
    'synth/../../escape',
    'synth/./escape',
    'synth//escape',
    'synth\\escape',
  ]) {
    assert.throws(() => artifactPathForEffect(effectId), /invalid effect ID/i, effectId)
  }
})

test('manifest duplicate detection runs before ordinary JSON parsing', () => {
  assert.throws(
    () => validateManifest('{"synth/zeta":{},"synth/zeta":{}, invalid'),
    /duplicate manifest ID.*synth\/zeta/i,
  )
})

test('update writes deterministic metadata and bytes for the complete manifest', async () => {
  await withVendorFixture(async (options) => {
    const lock = await updateFixture(options)
    const { generatedAt, ...stableLock } = lock
    const expectedPaths = [
      'effects/filter/alpha.js',
      'effects/manifest.json',
      'effects/synth/zeta.js',
      'noisemaker-shaders-core.esm.js',
    ]

    assert.match(generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    assert.equal(stableLock.schemaVersion, 1)
    assert.equal(stableLock.sourceBaseUrl, options.sourceBaseUrl)
    assert.equal(stableLock.effectCount, 2)
    assert.deepEqual(
      stableLock.artifacts.map((artifact) => artifact.path),
      expectedPaths,
    )
    assert.deepEqual(options.requestedPaths.sort(), [
      '/1/effects/filter/alpha.js',
      '/1/effects/manifest.json',
      '/1/effects/synth/zeta.js',
      '/1/noisemaker-shaders-core.esm.js',
    ])

    for (const artifact of stableLock.artifacts) {
      const expected = fixtureArtifacts.get(new URL(artifact.url).pathname)
      const actual = await readFile(join(options.cacheRoot, ...artifact.path.split('/')))

      assert.ok(expected, `unexpected source URL ${artifact.url}`)
      assert.deepEqual(actual, expected)
      assert.equal(artifact.bytes, expected.byteLength)
      assert.equal(artifact.sha256, digest(expected))
    }

    assert.deepEqual(await readLock(options.lockPath), lock)
    assert.deepEqual(await verifyArtifactLock(options), {
      artifactCount: 4,
      effectCount: 2,
      verifiedEffectCount: 2,
    })
  })
})

test('update rejects a symlinked cache root without touching its target', async () => {
  await withVendorFixture(async (options) => {
    const outsideRoot = join(dirname(options.cacheRoot), 'outside-cache-root')
    await mkdir(outsideRoot)
    await writeFile(join(outsideRoot, 'sentinel.txt'), 'preserve me')
    await symlink(outsideRoot, options.cacheRoot, 'dir')

    await assert.rejects(updateFixture(options), /symbolic link.*cache root/i)
    assert.deepEqual(await readdir(outsideRoot), ['sentinel.txt'])
    assert.equal(await readFile(join(outsideRoot, 'sentinel.txt'), 'utf8'), 'preserve me')
  })
})

test('update rejects a symlinked cache descendant without touching its target', async () => {
  await withVendorFixture(async (options) => {
    const outsideRoot = join(dirname(options.cacheRoot), 'outside-cache-descendant')
    await mkdir(options.cacheRoot)
    await mkdir(outsideRoot)
    await writeFile(join(outsideRoot, 'sentinel.txt'), 'preserve me')
    await symlink(outsideRoot, join(options.cacheRoot, 'effects'), 'dir')

    await assert.rejects(updateFixture(options), /symbolic link.*cache root/i)
    assert.deepEqual(await readdir(outsideRoot), ['sentinel.txt'])
    assert.equal(await readFile(join(outsideRoot, 'sentinel.txt'), 'utf8'), 'preserve me')
  })
})

test('verify rejects a symlinked cache root', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const outsideRoot = join(dirname(options.cacheRoot), 'outside-verified-cache')
    await rename(options.cacheRoot, outsideRoot)
    await symlink(outsideRoot, options.cacheRoot, 'dir')

    await assert.rejects(verifyArtifactLock(options), /symbolic link.*cache root/i)
  })
})

test('verify rejects a symlinked cache descendant', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const effectsRoot = join(options.cacheRoot, 'effects')
    const outsideRoot = join(dirname(options.cacheRoot), 'outside-verified-effects')
    await rename(effectsRoot, outsideRoot)
    await symlink(outsideRoot, effectsRoot, 'dir')

    await assert.rejects(verifyArtifactLock(options), /symbolic link.*cache root/i)
  })
})

test('verify rejects an artifact path that escapes the cache root', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const lock = await readLock(options.lockPath)
    lock.artifacts[0].path = '../escape.js'
    await writeLock(options.lockPath, lock)

    await assert.rejects(verifyArtifactLock(options), /cache root/i)
  })
})

test('verify rejects a modified byte even when the size is unchanged', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const path = 'effects/filter/alpha.js'
    const bytes = await readFile(join(options.cacheRoot, ...path.split('/')))
    bytes[0] ^= 0xff
    await writeFile(join(options.cacheRoot, ...path.split('/')), bytes)

    await assert.rejects(verifyArtifactLock(options), /SHA-256 mismatch.*filter\/alpha\.js/i)
  })
})

test('verify rejects a missing artifact file', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    await unlink(join(options.cacheRoot, 'effects/filter/alpha.js'))

    await assert.rejects(verifyArtifactLock(options), /missing artifact file.*filter\/alpha\.js/i)
  })
})

test('verify rejects duplicate manifest IDs even when the lock digest matches', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const duplicateManifest = Buffer.from(
      '{"filter/alpha":{},"synth/zeta":{},"synth/zeta":{"description":"duplicate"}}',
    )
    await replaceLockedArtifact(options, 'effects/manifest.json', duplicateManifest)

    await assert.rejects(verifyArtifactLock(options), /duplicate manifest ID.*synth\/zeta/i)
  })
})

test('verify rejects a manifest effect with no locked bundle', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const lock = await readLock(options.lockPath)
    lock.artifacts = lock.artifacts.filter(
      (artifact) => artifact.path !== 'effects/filter/alpha.js',
    )
    await writeLock(options.lockPath, lock)

    await assert.rejects(verifyArtifactLock(options), /missing locked bundle.*filter\/alpha/i)
  })
})

test('verify rejects a locked bundle absent from the manifest', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const lock = await readLock(options.lockPath)
    const path = 'effects/filter/extra.js'
    const bytes = Buffer.from("export const effectId = 'filter/extra'\n")
    await writeFile(join(options.cacheRoot, ...path.split('/')), bytes)
    lock.artifacts.push({
      bytes: bytes.byteLength,
      path,
      sha256: digest(bytes),
      url: new URL(path, options.sourceBaseUrl).href,
    })
    lock.artifacts.sort((left, right) => left.path.localeCompare(right.path))
    await writeLock(options.lockPath, lock)

    await assert.rejects(verifyArtifactLock(options), /extra locked bundle.*filter\/extra/i)
  })
})

test('verify rejects a registration count that differs from the manifest', async () => {
  await withVendorFixture(async (options) => {
    await updateFixture(options)
    const lock = await readLock(options.lockPath)
    lock.effectCount = 1
    await writeLock(options.lockPath, lock)

    await assert.rejects(verifyArtifactLock(options), /registration count mismatch.*1.*2/i)
  })
})

test('checked-in lock pins the initial complete 210-effect catalog', async () => {
  const lockPath = fileURLToPath(new URL('../vendor.lock.json', import.meta.url))
  const cacheRoot = fileURLToPath(new URL('../vendor-cache/', import.meta.url))
  const lock = JSON.parse(await readFile(lockPath, 'utf8'))

  assert.equal(lock.schemaVersion, 1)
  assert.equal(lock.effectCount, 210)
  assert.equal(lock.artifacts.length, lock.effectCount + 2)
  assert.deepEqual(await verifyArtifactLock({ cacheRoot, lockPath }), {
    artifactCount: 212,
    effectCount: 210,
    verifiedEffectCount: 210,
  })
})
