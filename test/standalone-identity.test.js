import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { test } from 'node:test'

import * as identityModule from '../tools/lib/cables-standalone-identity.js'
import { readWindowsAsarIntegrity } from '../tools/lib/windows-asar-integrity.js'

const {
  inspectCablesStandalone,
  readMacAppInfoPlist,
  readWindowsAppVersion,
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
    platform: 'macos',
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
    ['hashFile', executablePath],
    [
      'readInfoPlist',
      '/fixture/cables.app/Contents/Info.plist',
    ],
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

test('rejects a Linux bundle whose desktop entry is missing', async () => {
  const linuxExecutable = '/fixture/cables-linux/cables'

  await assert.rejects(
    inspectCablesStandalone(linuxExecutable, dependencies({
      realpath: async () => linuxExecutable,
    })),
    /desktop entry is required/i,
  )
})

test('rejects a Linux bundle whose desktop entry omits the AppImage version', async () => {
  const linuxExecutable = '/fixture/cables-linux/cables'
  const readInfoPlist = await import('../tools/lib/cables-standalone-identity.js')

  await assert.rejects(
    readInfoPlist.readLinuxAppVersion('/fixture/cables-linux/cables.desktop', {
      readFile: async () => '[Desktop Entry]\nName=cables\nExec=AppRun --no-sandbox %U\n',
    }),
    /must declare X-AppImage-Version/i,
  )
})

test('rejects a Linux bundle with an unsupported AppImage version', async () => {
  const readInfoPlist = await import('../tools/lib/cables-standalone-identity.js')

  await assert.rejects(
    readInfoPlist.readLinuxAppVersion('/fixture/cables-linux/cables.desktop', {
      readFile: async () => '[Desktop Entry]\nName=cables\nX-AppImage-Version=0.9.9\n',
    }),
    /version 0\.11\.0 or 0\.11\.3 is required; desktop entry reports 0\.9\.9/i,
  )
})

test('rejects a Linux bundle whose desktop entry name is not Cables', async () => {
  const readInfoPlist = await import('../tools/lib/cables-standalone-identity.js')

  await assert.rejects(
    readInfoPlist.readLinuxAppVersion('/fixture/cables-linux/cables.desktop', {
      readFile: async () => '[Desktop Entry]\nName=Other\nX-AppImage-Version=0.11.3\n',
    }),
    /desktop entry Name must identify Cables/i,
  )
})

test('attests the resolved Linux AppImage bundle identity without an embedded asar expectation', async () => {
  const readInfoPlist = await import('../tools/lib/cables-standalone-identity.js')
  const version = await readInfoPlist.readLinuxAppVersion('/fixture/cables-linux/cables.desktop', {
    readFile: async () => [
      '[Desktop Entry]',
      'Name=cables',
      'X-AppImage-Version=0.11.3',
      'Comment=cables standalone version',
    ].join('\n'),
  })
  assert.deepEqual(version, {
    version: '0.11.3',
    entry: {
      Comment: 'cables standalone version',
      Name: 'cables',
      'X-AppImage-Version': '0.11.3',
    },
  })
})

test('attests the Linux AppImage happy path through inspectCablesStandalone', async () => {
  const linuxExecutable = '/fixture/cables-linux/cables'
  const linuxAsarPath = '/fixture/cables-linux/resources/app.asar'
  const calls = []
  const identity = await inspectCablesStandalone(linuxExecutable, dependencies({
    access: async (path) => {
      calls.push(['access', path])
    },
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
      return args[0] === linuxAsarPath ? asarWholeFileSha256 : executableSha256
    },
    realpath: async () => linuxExecutable,
    readLinuxAppVersion: async (desktopEntryPath) => {
      calls.push(['readLinuxAppVersion', desktopEntryPath])
      return {
        version: '0.11.3',
        entry: { Name: 'cables', 'X-AppImage-Version': '0.11.3' },
      }
    },
  }))

  assert.deepEqual(identity, {
    platform: 'linux',
    appDirectory: '/fixture/cables-linux',
    appUpdate: { owner: null, repo: null, provider: null },
    asarIntegrity: {
      actualSha256: asarSha256,
      algorithm: 'SHA256',
      asarPath: linuxAsarPath,
      expectedSha256: null,
      headerByteLength: 123,
      headerOffset: 16,
      wholeFileSha256: asarWholeFileSha256,
    },
    expectedVersion: '0.11.3',
    executablePath: linuxExecutable,
    executableSha256,
    version: '0.11.3',
  })
  assert.deepEqual(calls, [
    ['access', linuxExecutable],
    ['hashFile', linuxExecutable],
    ['readLinuxAppVersion', '/fixture/cables-linux/cables.desktop'],
    ['access', linuxAsarPath],
    ['hashAsarHeader', linuxAsarPath],
    ['hashFile', linuxAsarPath],
  ])
  assert.equal(Object.isFrozen(identity), true)
  assert.equal(Object.isFrozen(identity.asarIntegrity), true)
})

test('rejects a Linux app.asar whose header hash is malformed', async () => {
  const linuxExecutable = '/fixture/cables-linux/cables'

  await assert.rejects(
    inspectCablesStandalone(linuxExecutable, dependencies({
      realpath: async () => linuxExecutable,
      readLinuxAppVersion: async () => ({
        version: '0.11.3',
        entry: { Name: 'cables', 'X-AppImage-Version': '0.11.3' },
      }),
      hashAsarHeader: async () => ({ actualSha256: 'nothex', headerByteLength: 1, headerOffset: 16 }),
    })),
    /app\.asar actual header SHA-256 is invalid/i,
  )
})

test('rejects a Linux app.asar with invalid header framing', async () => {
  const linuxExecutable = '/fixture/cables-linux/cables'

  await assert.rejects(
    inspectCablesStandalone(linuxExecutable, dependencies({
      realpath: async () => linuxExecutable,
      readLinuxAppVersion: async () => ({
        version: '0.11.3',
        entry: { Name: 'cables', 'X-AppImage-Version': '0.11.3' },
      }),
      hashAsarHeader: async () => ({
        actualSha256: asarSha256,
        headerByteLength: 0,
        headerOffset: 16,
      }),
    })),
    /app\.asar header SHA-256 byte range is invalid/i,
  )
})

test('attests Windows from the bundled package and verifies the embedded ASAR digest', async () => {
  const windowsExecutable = '/fixture/cables-win/Cables.exe'
  const identity = await inspectCablesStandalone(windowsExecutable, dependencies({
    realpath: async () => windowsExecutable,
    readWindowsAppVersion: async (path) => {
      assert.equal(path, '/fixture/cables-win/resources/app.asar')
      return { version: '0.11.3', packageName: 'cables_electron' }
    },
    readLinuxAppVersion: async () => assert.fail('Windows is not a Linux AppImage'),
    readWindowsAsarIntegrity: async () => asarSha256,
  }))
  assert.equal(identity.platform, 'windows')
  assert.equal(identity.version, '0.11.3')
  assert.equal(identity.packageName, 'cables_electron')
  assert.equal(identity.asarIntegrity.expectedSha256, asarSha256)
  assert.equal(identity.asarIntegrity.actualSha256, asarSha256)
  assert.equal(Object.isFrozen(identity), true)
})

test('rejects Windows ASAR bytes that differ from the executable integrity record', async () => {
  await assert.rejects(inspectCablesStandalone('/fixture/cables.exe', dependencies({
    realpath: async () => '/fixture/cables.exe',
    readWindowsAppVersion: async () => ({ version: '0.11.3', packageName: 'cables_electron' }),
    readWindowsAsarIntegrity: async () => 'd'.repeat(64),
  })), /app.asar SHA-256 mismatch/)
})

test('reads the Windows PE integrity resource and rejects missing, ambiguous, and corrupt records', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'cables-pe-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  const path = join(root, 'cables.exe')
  const record = { file: 'resources\\app.asar', alg: 'SHA256', value: asarSha256 }
  function image(records = [record]) {
    const b = Buffer.alloc(1536)
    b.write('MZ'); b.writeUInt32LE(64, 60)
    b.writeUInt32LE(0x4550, 64); b.writeUInt16LE(0x8664, 68)
    b.writeUInt16LE(1, 70); b.writeUInt16LE(240, 84)
    b.writeUInt16LE(0x20b, 88); b.writeUInt32LE(16, 196)
    b.writeUInt32LE(4096, 216); b.writeUInt32LE(1024, 220)
    b.writeUInt32LE(4096, 340); b.writeUInt32LE(1024, 344); b.writeUInt32LE(512, 348)
    const r = b.subarray(512)
    r.writeUInt16LE(1, 12); r.writeUInt32LE(0x80000080, 16); r.writeUInt32LE(0x80000018, 20)
    r.writeUInt16LE(1, 36); r.writeUInt32LE(0x80000096, 40); r.writeUInt32LE(0x80000030, 44)
    r.writeUInt16LE(1, 62); r.writeUInt32LE(1033, 64); r.writeUInt32LE(88, 68)
    r.writeUInt16LE(9, 128); r.write('INTEGRITY', 130, 'utf16le')
    r.writeUInt16LE(12, 150); r.write('ELECTRONASAR', 152, 'utf16le')
    const data = Buffer.from(JSON.stringify(records))
    r.writeUInt32LE(4352, 88); r.writeUInt32LE(data.length, 92); data.copy(r, 256)
    return b
  }
  await writeFile(path, image())
  assert.equal(await readWindowsAsarIntegrity(path), asarSha256)
  for (const records of [[], [record, record], [{ ...record, value: 'bad' }],
    [{ ...record, alg: 'MD5' }], [{ ...record, file: 'other.asar' }]]) {
    await writeFile(path, image(records))
    await assert.rejects(readWindowsAsarIntegrity(path), /integrity record is invalid/)
  }
  for (const mutate of [
    (b) => b.write('XX', 0),
    (b) => b.writeUInt16LE(0x14c, 68),
    (b) => b.writeUInt32LE(0xffffffff, 220),
    (b) => b.writeUInt32LE(0xffffffff, 532),
    (b) => b.writeUInt32LE(0xffffffff, 600),
  ]) {
    const bytes = image(); mutate(bytes); await writeFile(path, bytes)
    await assert.rejects(readWindowsAsarIntegrity(path))
  }
})

test('reads Windows package identity from a framed ASAR and rejects invalid metadata', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'cables-asar-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  const path = join(root, 'app.asar')
  function archive({ pkg = { name: 'cables_electron', version: '0.11.3' }, entry = {}, corrupt } = {}) {
    const body = Buffer.from(JSON.stringify(pkg))
    const header = Buffer.from(JSON.stringify({ files: {
      'package.json': { offset: '0', size: body.length, ...entry },
    } }))
    const padded = Math.ceil((4 + header.length) / 4) * 4
    const prefix = Buffer.alloc(16)
    prefix.writeUInt32LE(4, 0)
    prefix.writeUInt32LE(padded + 4, 4)
    prefix.writeUInt32LE(padded, 8)
    prefix.writeUInt32LE(header.length, 12)
    if (corrupt) corrupt(prefix)
    return Buffer.concat([prefix, header, Buffer.alloc(padded - 4 - header.length), body])
  }
  for (const version of ['0.11.0', '0.11.3']) {
    await writeFile(path, archive({ pkg: { name: 'cables_electron', version } }))
    assert.deepEqual(await readWindowsAppVersion(path), { version, packageName: 'cables_electron' })
  }
  const cases = [
    [{ pkg: { name: 'different', version: '0.11.3' } }, /package name/],
    [{ pkg: { name: 'cables_electron', version: '99.0.0' } }, /Unsupported.*version/],
    [{ entry: { unpacked: true } }, /bounded, packed/],
    [{ entry: { link: 'other' } }, /bounded, packed/],
    [{ entry: { offset: '-1' } }, /bounded, packed/],
    [{ entry: { offset: 0 } }, /bounded, packed/],
    [{ entry: { offset: '9999999999999999999999' } }, /bounded, packed/],
    [{ entry: { size: 0 } }, /bounded, packed/],
    [{ entry: { size: 1024 * 1024 + 1 } }, /bounded, packed/],
    [{ entry: { size: 300 } }, /bounded, packed/],
    [{ corrupt: (prefix) => prefix.writeUInt32LE(8, 0) }, /header framing/],
    [{ corrupt: (prefix) => prefix.writeUInt32LE(0xffffffff, 12) }, /header framing/],
  ]
  for (const [options, error] of cases) {
    await writeFile(path, archive(options))
    await assert.rejects(readWindowsAppVersion(path), error)
  }
  await writeFile(path, archive().subarray(0, 10))
  await assert.rejects(readWindowsAppVersion(path), /truncated/)
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
