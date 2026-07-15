import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { test } from 'node:test'

import * as identityModule from '../tools/lib/cables-standalone-identity.js'

const {
  inspectCablesStandalone,
  readMacAppInfoPlist,
  sha256AsarHeader,
  sha256File,
} = identityModule

const executablePath = '/fixture/cables.app/Contents/MacOS/cables'
const executableSha256 = 'a'.repeat(64)
const asarPath = '/fixture/cables.app/Contents/Resources/app.asar'
const asarSha256 = 'b'.repeat(64)
const asarWholeFileSha256 = 'c'.repeat(64)
const validPlist = {
  CFBundleDisplayName: 'cables',
  CFBundleExecutable: 'cables',
  CFBundleIdentifier: 'gl.cables.standalone',
  CFBundleName: 'cables',
  CFBundleShortVersionString: '0.11.0',
  CFBundleVersion: '0.11.0',
  ElectronAsarIntegrity: {
    'Resources/app.asar': {
      algorithm: 'SHA256',
      hash: asarSha256,
    },
  },
}

function dependencies(overrides = {}) {
  return {
    access: async () => {},
    hashAsarHeader: async () => ({
      actualSha256: asarSha256,
      headerByteLength: 123,
      headerOffset: 16,
    }),
    hashFile: async (path) => path === asarPath ? asarWholeFileSha256 : executableSha256,
    readInfoPlist: async () => structuredClone(validPlist),
    realpath: async () => executablePath,
    ...overrides,
  }
}

test('attests the resolved Cables Standalone 0.11.0 app identity', async () => {
  const calls = []
  const identity = await inspectCablesStandalone('/Applications/cables', dependencies({
    access: async (...args) => calls.push(['access', ...args]),
    hashAsarHeader: async (...args) => {
      calls.push(['hashAsarHeader', ...args])
      return {
        actualSha256: asarSha256,
        headerByteLength: 123,
        headerOffset: 16,
      }
    },
    hashFile: async (...args) => {
      calls.push(['hashFile', ...args])
      return args[0] === asarPath ? asarWholeFileSha256 : executableSha256
    },
    readInfoPlist: async (...args) => {
      calls.push(['readInfoPlist', ...args])
      return structuredClone(validPlist)
    },
    realpath: async (...args) => {
      calls.push(['realpath', ...args])
      return executablePath
    },
  }))

  assert.deepEqual(identity, {
    expectedVersion: '0.11.0',
    appBundlePath: '/fixture/cables.app',
    asarIntegrity: {
      actualSha256: asarSha256,
      algorithm: 'SHA256',
      asarPath,
      expectedSha256: asarSha256,
      headerByteLength: 123,
      headerOffset: 16,
      wholeFileSha256: asarWholeFileSha256,
    },
    executablePath,
    executableSha256,
    infoPlist: validPlist,
  })
  assert.deepEqual(calls, [
    ['realpath', '/Applications/cables'],
    ['access', executablePath, constants.X_OK],
    [
      'readInfoPlist',
      '/fixture/cables.app/Contents/Info.plist',
    ],
    ['hashFile', executablePath],
    ['access', asarPath, constants.R_OK],
    ['hashAsarHeader', asarPath],
    ['hashFile', asarPath],
  ])
  assert.equal(Object.isFrozen(identity), true)
  assert.equal(Object.isFrozen(identity.infoPlist), true)
  assert.equal(Object.isFrozen(identity.infoPlist.ElectronAsarIntegrity), true)
  assert.equal(Object.isFrozen(identity.asarIntegrity), true)
  assert.deepEqual(JSON.parse(JSON.stringify(identity)), identity)
})

test('rejects a missing Cables Standalone app.asar file', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      access: async (path) => {
        if (path === asarPath) {
          const error = new Error('missing fixture app.asar')
          error.code = 'ENOENT'
          throw error
        }
      },
    })),
    /app\.asar.*required|missing.*app\.asar/i,
  )
})

test('rejects a missing app.asar integrity record', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({
        ...validPlist,
        ElectronAsarIntegrity: {},
      }),
    })),
    /ElectronAsarIntegrity.*Resources\/app\.asar/i,
  )
})

test('rejects malformed app.asar integrity algorithms and hashes', async (context) => {
  await context.test('algorithm', async () => {
    await assert.rejects(
      inspectCablesStandalone(executablePath, dependencies({
        readInfoPlist: async () => ({
          ...validPlist,
          ElectronAsarIntegrity: {
            'Resources/app.asar': { algorithm: 'SHA512', hash: asarSha256 },
          },
        }),
      })),
      /app\.asar.*algorithm.*SHA256/i,
    )
  })

  await context.test('hash', async () => {
    await assert.rejects(
      inspectCablesStandalone(executablePath, dependencies({
        readInfoPlist: async () => ({
          ...validPlist,
          ElectronAsarIntegrity: {
            'Resources/app.asar': { algorithm: 'SHA256', hash: 'not-a-sha256' },
          },
        }),
      })),
      /app\.asar.*expected.*SHA-?256.*64/i,
    )
  })
})

test('rejects an app.asar whose independently computed hash mismatches the plist', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      hashAsarHeader: async () => ({
        actualSha256: 'd'.repeat(64),
        headerByteLength: 123,
        headerOffset: 16,
      }),
    })),
    /app\.asar.*SHA-?256 mismatch.*expected.*actual/i,
  )
})

function asarHeaderFixture({
  fileSize,
  headerBytes = Buffer.from('{"files":{}}'),
  prefixOverrides = {},
  streamBytes = headerBytes,
} = {}) {
  const padding = (4 - ((4 + headerBytes.byteLength) % 4)) % 4
  const headerPayloadSize = 4 + headerBytes.byteLength + padding
  const headerPickleSize = 4 + headerPayloadSize
  const prefix = Buffer.alloc(16)
  prefix.writeUInt32LE(4, 0)
  prefix.writeUInt32LE(headerPickleSize, 4)
  prefix.writeUInt32LE(headerPayloadSize, 8)
  prefix.writeUInt32LE(headerBytes.byteLength, 12)
  for (const [offset, value] of Object.entries(prefixOverrides)) {
    prefix.writeUInt32LE(value, Number(offset))
  }
  const calls = []
  return {
    calls,
    dependencies: {
      createReadStream(path, options) {
        calls.push(['createReadStream', path, options])
        return Readable.from([streamBytes])
      },
      open: async (path, flags) => {
        calls.push(['open', path, flags])
        return {
          async close() {
            calls.push(['close'])
          },
          async read(buffer, offset, length, position) {
            calls.push(['read', offset, length, position])
            prefix.copy(buffer, offset, 0, Math.min(prefix.length, length))
            return { bytesRead: Math.min(prefix.length, length) }
          },
        }
      },
      stat: async (path) => {
        calls.push(['stat', path])
        return {
          isFile: () => true,
          size: fileSize ?? 8 + headerPickleSize,
        }
      },
    },
    headerBytes,
  }
}

test('streams and hashes the exact framed ASAR JSON header bytes', async () => {
  assert.equal(typeof sha256AsarHeader, 'function')
  const fixture = asarHeaderFixture()
  const result = await sha256AsarHeader('/fixture/app.asar', fixture.dependencies)

  assert.deepEqual(result, {
    actualSha256: createHash('sha256').update(fixture.headerBytes).digest('hex'),
    headerByteLength: fixture.headerBytes.byteLength,
    headerOffset: 16,
  })
  assert.deepEqual(fixture.calls, [
    ['stat', '/fixture/app.asar'],
    ['open', '/fixture/app.asar', 'r'],
    ['read', 0, 16, 0],
    ['close'],
    [
      'createReadStream',
      '/fixture/app.asar',
      { end: 15 + fixture.headerBytes.byteLength, start: 16 },
    ],
  ])
})

test('rejects malformed, truncated, or invalid ASAR header framing', async (context) => {
  await context.test('outer pickle', async () => {
    const fixture = asarHeaderFixture({ prefixOverrides: { 0: 8 } })
    await assert.rejects(
      sha256AsarHeader('/fixture/app.asar', fixture.dependencies),
      /outer pickle.*4/i,
    )
  })

  await context.test('inner pickle bounds', async () => {
    const fixture = asarHeaderFixture({ prefixOverrides: { 4: 8 } })
    await assert.rejects(
      sha256AsarHeader('/fixture/app.asar', fixture.dependencies),
      /header pickle.*bounds|framing/i,
    )
  })

  await context.test('truncated file', async () => {
    const fixture = asarHeaderFixture({ fileSize: 16 })
    await assert.rejects(
      sha256AsarHeader('/fixture/app.asar', fixture.dependencies),
      /truncated.*header|header.*bounds/i,
    )
  })

  await context.test('truncated stream', async () => {
    const fixture = asarHeaderFixture({ streamBytes: Buffer.from('{') })
    await assert.rejects(
      sha256AsarHeader('/fixture/app.asar', fixture.dependencies),
      /truncated.*JSON header|header.*byte length/i,
    )
  })

  await context.test('invalid JSON shape', async () => {
    const fixture = asarHeaderFixture({ headerBytes: Buffer.from('[]') })
    await assert.rejects(
      sha256AsarHeader('/fixture/app.asar', fixture.dependencies),
      /header JSON.*dictionary|files.*dictionary/i,
    )
  })
})

test('rejects a Cables Standalone version other than 0.11.0', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({
        ...validPlist,
        CFBundleShortVersionString: '0.10.0',
      }),
    })),
    /Cables Standalone version 0\.11\.0.*0\.10\.0/i,
  )
})

test('rejects a missing Cables Standalone build version', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({ ...validPlist, CFBundleVersion: '  ' }),
    })),
    /CFBundleVersion.*non-empty/i,
  )
})

test('rejects a bundle executable that does not match the resolved executable', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({ ...validPlist, CFBundleExecutable: 'other' }),
    })),
    /CFBundleExecutable.*does not match/i,
  )
})

test('rejects a non-Cables bundle identifier', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({ ...validPlist, CFBundleIdentifier: 'com.example.app' }),
    })),
    /CFBundleIdentifier.*Cables/i,
  )
})

test('rejects a non-Cables bundle product name', async () => {
  await assert.rejects(
    inspectCablesStandalone(executablePath, dependencies({
      readInfoPlist: async () => ({
        ...validPlist,
        CFBundleDisplayName: 'Example',
        CFBundleName: 'Example',
      }),
    })),
    /bundle product name.*Cables/i,
  )
})

test('rejects an executable outside an app Contents/MacOS directory', async () => {
  const nonAppExecutable = '/tmp/cables'

  await assert.rejects(
    inspectCablesStandalone(nonAppExecutable, dependencies({
      realpath: async () => nonAppExecutable,
    })),
    /\.app\/Contents\/MacOS/i,
  )
})

test('reads XML or binary app plists through plutil JSON conversion', async () => {
  const calls = []
  const plistPath = '/Applications/cables.app/Contents/Info.plist'
  const plist = await readMacAppInfoPlist(plistPath, {
    execFile: async (...args) => {
      calls.push(args)
      return { stdout: JSON.stringify(validPlist) }
    },
  })

  assert.deepEqual(plist, validPlist)
  assert.deepEqual(calls, [[
    '/usr/bin/plutil',
    ['-convert', 'json', '-o', '-', plistPath],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 },
  ]])
})

test('streams executable bytes into a canonical SHA-256 digest', async () => {
  let openedPath
  const actual = await sha256File('/fixture/cables', {
    createReadStream(path) {
      openedPath = path
      return Readable.from([Buffer.from('a'), Buffer.from('bc')])
    },
  })

  assert.equal(openedPath, '/fixture/cables')
  assert.equal(actual, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('standalone smoke attests identity before temp creation or spawn and reports it', async () => {
  const source = await readFile(
    new URL('../tools/standalone-smoke.mjs', import.meta.url),
    'utf8',
  )
  const inspection = source.indexOf('await inspectCablesStandalone(')
  const temporaryDirectory = source.indexOf('await mkdtemp(')
  const spawnCall = source.indexOf('spawn(executable')

  assert.ok(inspection >= 0, 'standalone smoke does not inspect the executable identity')
  assert.ok(inspection < temporaryDirectory, 'identity inspection occurs after temp creation')
  assert.ok(inspection < spawnCall, 'identity inspection occurs after process spawn')
  assert.match(source, /const report = \{[\s\S]*?\n    cablesStandalone,/)
})
