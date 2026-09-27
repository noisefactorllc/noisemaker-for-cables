import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, createReadStream as createNodeReadStream } from 'node:fs'
import {
  access as accessFile,
  open as openFile,
  realpath as resolveRealpath,
  stat as statFile,
} from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { readFile as readFileUtf8Default } from 'node:fs/promises'
import { promisify } from 'node:util'
import { readWindowsAsarIntegrity } from './windows-asar-integrity.js'

export const EXPECTED_CABLES_STANDALONE_VERSION = '0.11.0'
export const SUPPORTED_CABLES_STANDALONE_VERSIONS = ['0.11.0', '0.11.3']

const CABLES_STANDALONE_BUNDLE_IDENTIFIER = 'gl.cables.standalone'
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const SHA256_CASE_INSENSITIVE_PATTERN = /^[0-9a-f]{64}$/i
const ASAR_INTEGRITY_PATH = 'Resources/app.asar'
const ASAR_HEADER_OFFSET = 16
const execFileAsync = promisify(execFileCallback)
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function cloneJson(value, name) {
  try {
    const json = JSON.stringify(value)
    if (json === undefined) throw new TypeError(`${name} is not JSON-serializable`)
    return JSON.parse(json)
  } catch (error) {
    throw new TypeError(`${name} is not JSON-serializable`, { cause: error })
  }
}

function requireMacAppExecutable(executablePath) {
  const macOsPath = dirname(executablePath)
  const contentsPath = dirname(macOsPath)
  const appBundlePath = dirname(contentsPath)

  if (
    basename(macOsPath) !== 'MacOS' ||
    basename(contentsPath) !== 'Contents' ||
    !basename(appBundlePath).endsWith('.app')
  ) {
    throw new Error(
      `Cables executable must resolve directly under a .app/Contents/MacOS directory: ${executablePath}`,
    )
  }

  return { appBundlePath, contentsPath, macOsPath }
}

function isCablesProductName(value) {
  return typeof value === 'string' && /(^|[^a-z])cables([^a-z]|$)/i.test(value)
}

function validateInfoPlist(plist, executablePath, macOsPath) {
  if (!plist || typeof plist !== 'object' || Array.isArray(plist)) {
    throw new TypeError('Cables Info.plist must decode to a dictionary')
  }

  if (!SUPPORTED_CABLES_STANDALONE_VERSIONS.includes(plist.CFBundleShortVersionString)) {
    throw new Error(
      `Cables Standalone version ${SUPPORTED_CABLES_STANDALONE_VERSIONS.join(' or ')} is required; ` +
      `Info.plist reports ${String(plist.CFBundleShortVersionString)}`,
    )
  }
  if (typeof plist.CFBundleVersion !== 'string' || plist.CFBundleVersion.trim() === '') {
    throw new Error('Info.plist CFBundleVersion must be a non-empty build version')
  }
  if (plist.CFBundleIdentifier !== CABLES_STANDALONE_BUNDLE_IDENTIFIER) {
    throw new Error(
      `Info.plist CFBundleIdentifier must identify Cables Standalone as ` +
      `${CABLES_STANDALONE_BUNDLE_IDENTIFIER}; received ${String(plist.CFBundleIdentifier)}`,
    )
  }
  if (!isCablesProductName(plist.CFBundleName)) {
    throw new Error(
      `Info.plist bundle product name must identify Cables; received ${String(plist.CFBundleName)}`,
    )
  }
  if (
    plist.CFBundleDisplayName !== undefined &&
    !isCablesProductName(plist.CFBundleDisplayName)
  ) {
    throw new Error(
      `Info.plist bundle product name must identify Cables; ` +
      `received ${String(plist.CFBundleDisplayName)}`,
    )
  }

  const executableName = basename(executablePath)
  if (
    plist.CFBundleExecutable !== executableName ||
    join(macOsPath, plist.CFBundleExecutable) !== executablePath
  ) {
    throw new Error(
      `Info.plist CFBundleExecutable ${String(plist.CFBundleExecutable)} ` +
      `does not match resolved executable ${executableName}`,
    )
  }
}

function selectInfoPlistFields(plist) {
  const selected = {
    CFBundleDisplayName: plist.CFBundleDisplayName,
    CFBundleExecutable: plist.CFBundleExecutable,
    CFBundleIdentifier: plist.CFBundleIdentifier,
    CFBundleName: plist.CFBundleName,
    CFBundleShortVersionString: plist.CFBundleShortVersionString,
    CFBundleVersion: plist.CFBundleVersion,
  }

  if (plist.ElectronAsarIntegrity !== undefined) {
    selected.ElectronAsarIntegrity = cloneJson(
      plist.ElectronAsarIntegrity,
      'Info.plist ElectronAsarIntegrity',
    )
  }

  return selected
}

function requireAsarIntegrity(plist, contentsPath) {
  const record = plist.ElectronAsarIntegrity?.[ASAR_INTEGRITY_PATH]
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(
      `Info.plist ElectronAsarIntegrity must contain ${ASAR_INTEGRITY_PATH}`,
    )
  }

  const algorithm = typeof record.algorithm === 'string'
    ? record.algorithm.toUpperCase()
    : ''
  if (algorithm !== 'SHA256') {
    throw new Error(
      `Info.plist app.asar integrity algorithm must be SHA256; ` +
      `received ${String(record.algorithm)}`,
    )
  }
  if (
    typeof record.hash !== 'string' ||
    !SHA256_CASE_INSENSITIVE_PATTERN.test(record.hash)
  ) {
    throw new Error('Info.plist app.asar expected SHA-256 must be 64 hexadecimal characters')
  }

  return {
    algorithm,
    asarPath: join(contentsPath, ASAR_INTEGRITY_PATH),
    expectedSha256: record.hash.toLowerCase(),
  }
}

export async function readMacAppInfoPlist(
  plistPath,
  { execFile = execFileAsync } = {},
) {
  const { stdout } = await execFile(
    '/usr/bin/plutil',
    ['-convert', 'json', '-o', '-', plistPath],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 },
  )

  try {
    const plist = JSON.parse(stdout)
    if (!plist || typeof plist !== 'object' || Array.isArray(plist)) {
      throw new TypeError('decoded value is not a dictionary')
    }
    return plist
  } catch (error) {
    throw new Error(`Could not decode Info.plist JSON from ${plistPath}`, { cause: error })
  }
}

export async function sha256File(
  filePath,
  { createReadStream = createNodeReadStream } = {},
) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

export async function sha256AsarHeader(
  filePath,
  {
    createReadStream = createNodeReadStream,
    open = openFile,
    stat = statFile,
  } = {},
) {
  const metadata = await stat(filePath)
  if (!metadata.isFile() || metadata.size < ASAR_HEADER_OFFSET) {
    throw new Error(`app.asar is truncated before its framed header: ${filePath}`)
  }

  const prefix = Buffer.alloc(ASAR_HEADER_OFFSET)
  const handle = await open(filePath, 'r')
  let bytesRead
  try {
    ({ bytesRead } = await handle.read(prefix, 0, prefix.byteLength, 0))
  } finally {
    await handle.close()
  }
  if (bytesRead !== prefix.byteLength) {
    throw new Error(`app.asar is truncated before its framed header: ${filePath}`)
  }

  const outerPayloadSize = prefix.readUInt32LE(0)
  const headerPickleSize = prefix.readUInt32LE(4)
  const headerPayloadSize = prefix.readUInt32LE(8)
  const headerByteLength = prefix.readUInt32LE(12)
  if (outerPayloadSize !== 4) {
    throw new Error(
      `app.asar outer pickle payload must be 4 bytes; received ${outerPayloadSize}`,
    )
  }

  const paddingSize = headerPayloadSize - 4 - headerByteLength
  if (
    headerPickleSize !== headerPayloadSize + 4 ||
    headerPayloadSize < 4 ||
    headerPayloadSize % 4 !== 0 ||
    headerByteLength === 0 ||
    paddingSize < 0 ||
    paddingSize > 3
  ) {
    throw new Error('app.asar header pickle framing is invalid')
  }

  const framedHeaderEnd = 8 + headerPickleSize
  const jsonHeaderEnd = ASAR_HEADER_OFFSET + headerByteLength
  if (framedHeaderEnd > metadata.size || jsonHeaderEnd > framedHeaderEnd) {
    throw new Error('app.asar is truncated or its header bounds are invalid')
  }

  const hash = createHash('sha256')
  const chunks = []
  let streamedBytes = 0
  for await (const chunk of createReadStream(filePath, {
    end: jsonHeaderEnd - 1,
    start: ASAR_HEADER_OFFSET,
  })) {
    hash.update(chunk)
    chunks.push(chunk)
    streamedBytes += chunk.byteLength
  }
  if (streamedBytes !== headerByteLength) {
    throw new Error(
      `app.asar JSON header byte length is truncated: ` +
      `expected ${headerByteLength}; received ${streamedBytes}`,
    )
  }

  let header
  try {
    header = JSON.parse(utf8Decoder.decode(Buffer.concat(chunks, streamedBytes)))
  } catch (error) {
    throw new Error('app.asar header JSON is invalid', { cause: error })
  }
  if (!header || typeof header !== 'object' || Array.isArray(header)) {
    throw new Error('app.asar header JSON must decode to a dictionary')
  }
  if (!header.files || typeof header.files !== 'object' || Array.isArray(header.files)) {
    throw new Error('app.asar header JSON files must be a dictionary')
  }

  return {
    actualSha256: hash.digest('hex'),
    headerByteLength,
    headerOffset: ASAR_HEADER_OFFSET,
  }
}

export async function readLinuxAppVersion(desktopEntryPath, { readFile: readFileUtf8 = readFileUtf8Default } = {}) {
  let text
  try {
    text = await readFileUtf8(desktopEntryPath, 'utf8')
  } catch (error) {
    throw new Error(`Cables Standalone desktop entry is required at ${desktopEntryPath}`, { cause: error })
  }
  const entry = {}
  for (const line of text.split(/\r?\n/)) {
    const match = /^([^=#\s][^=]*)=(.*)$/.exec(line.trim())
    if (match) entry[match[1].trim()] = match[2].trim()
  }
  const version = entry['X-AppImage-Version']
  if (typeof version !== 'string' || version === '') {
    throw new Error(
      `Cables Standalone desktop entry at ${desktopEntryPath} must declare X-AppImage-Version`,
    )
  }
  if (!SUPPORTED_CABLES_STANDALONE_VERSIONS.includes(version)) {
    throw new Error(
      `Cables Standalone version ${SUPPORTED_CABLES_STANDALONE_VERSIONS.join(' or ')} is required; ` +
      `desktop entry reports ${version}`,
    )
  }
  if (!isCablesProductName(entry.Name)) {
    throw new Error(
      `Cables Standalone desktop entry Name must identify Cables; received ${String(entry.Name)}`,
    )
  }
  return { version, entry }
}

export async function readWindowsAppVersion(asarPath) {
  // The official Windows archives disable executable metadata editing. Read
  // their packed package.json; the executable's ASAR resource is checked below.
  const handle = await openFile(asarPath, 'r')
  try {
    const { size } = await handle.stat()
    async function readExact(length, position) {
      const bytes = Buffer.alloc(length)
      const result = await handle.read(bytes, 0, length, position)
      if (result.bytesRead !== length) throw new Error('app.asar package metadata is truncated')
      return bytes
    }
    const prefix = await readExact(16, 0)
    const headerPickleSize = prefix.readUInt32LE(4)
    const payloadSize = prefix.readUInt32LE(8)
    const jsonSize = prefix.readUInt32LE(12)
    const padding = payloadSize - 4 - jsonSize
    const dataOffset = 8 + headerPickleSize
    if (prefix.readUInt32LE(0) !== 4 || headerPickleSize !== payloadSize + 4 ||
        payloadSize % 4 !== 0 || padding < 0 || padding > 3 ||
        jsonSize === 0 || jsonSize > 16 * 1024 * 1024 || dataOffset > size) {
      throw new Error('app.asar package header framing is invalid')
    }
    const header = JSON.parse(utf8Decoder.decode(await readExact(jsonSize, 16)))
    const entry = header?.files?.['package.json']
    const offset = Number(entry?.offset)
    if (!entry || entry.link !== undefined || entry.unpacked ||
        typeof entry.offset !== 'string' || !/^\d+$/.test(entry.offset) ||
        !Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(entry.size) || entry.size <= 0 || entry.size > 1024 * 1024 ||
        !Number.isSafeInteger(dataOffset + offset + entry.size) ||
        dataOffset + offset + entry.size > size) {
      throw new Error('app.asar must contain a bounded, packed package.json')
    }
    const pkg = JSON.parse(utf8Decoder.decode(await readExact(entry.size, dataOffset + offset)))
    if (pkg.name !== 'cables_electron') {
      throw new Error(`app.asar package name must identify cables_electron; received ${String(pkg.name)}`)
    }
    if (!SUPPORTED_CABLES_STANDALONE_VERSIONS.includes(pkg.version)) {
      throw new Error(`Unsupported Cables Standalone package version: ${String(pkg.version)}`)
    }
    return { version: pkg.version, packageName: pkg.name }
  } finally {
    await handle.close()
  }
}

async function inspectDirectoryCablesStandalone({
  executablePath,
  executableSha256,
  access,
  hashAsarHeader,
  hashFile,
  readLinuxAppVersion: readLinuxAppVersionDependency,
  readWindowsAppVersion: readWindowsAppVersionDependency,
  readWindowsAsarIntegrity: readWindowsAsarIntegrityDependency,
  platform,
}) {
  const appDirectory = dirname(executablePath)
  const desktopEntryPath = join(appDirectory, 'cables.desktop')
  const asarPath = join(appDirectory, 'resources', 'app.asar')
  const { version, entry, packageName } = platform === 'windows'
    ? await readWindowsAppVersionDependency(asarPath)
    : await readLinuxAppVersionDependency(desktopEntryPath)
  try {
    await access(asarPath, constants.R_OK)
  } catch (error) {
    throw new Error(
      `Cables Standalone app.asar is required at ${asarPath}`,
      { cause: error },
    )
  }
  const headerIntegrity = await hashAsarHeader(asarPath)
  const expectedSha256 = platform === 'windows'
    ? await readWindowsAsarIntegrityDependency(executablePath)
    : null
  if (platform === 'windows' && (!SHA256_PATTERN.test(expectedSha256) ||
      headerIntegrity.actualSha256 !== expectedSha256)) {
    throw new Error(`app.asar SHA-256 mismatch: expected ${expectedSha256}; actual ${headerIntegrity.actualSha256}`)
  }
  if (!SHA256_PATTERN.test(headerIntegrity?.actualSha256)) {
    throw new Error(
      `app.asar actual header SHA-256 is invalid: ${String(headerIntegrity?.actualSha256)}`,
    )
  }
  if (
    headerIntegrity.headerOffset !== ASAR_HEADER_OFFSET ||
    !Number.isSafeInteger(headerIntegrity.headerByteLength) ||
    headerIntegrity.headerByteLength <= 0
  ) {
    throw new Error('app.asar header SHA-256 byte range is invalid')
  }
  const wholeFileSha256 = await hashFile(asarPath)
  if (!SHA256_PATTERN.test(wholeFileSha256)) {
    throw new Error(`app.asar whole-file SHA-256 is invalid: ${String(wholeFileSha256)}`)
  }

  return deepFreeze({
    platform,
    appDirectory,
    ...(platform === 'windows' ? { packageName } : { appUpdate: deepFreeze({
      owner: entry['X-AppImage-Version'] !== undefined ? entry['owner'] ?? null : null,
      repo: entry['repo'] ?? null,
      provider: entry['provider'] ?? null,
    }) }),
    asarIntegrity: deepFreeze({
      // Linux has no embedded expectation. Windows verifies its PE resource.
      algorithm: 'SHA256',
      asarPath,
      expectedSha256,
      ...headerIntegrity,
      wholeFileSha256,
    }),
    expectedVersion: version,
    executablePath,
    executableSha256,
    version,
  })
}

export async function inspectCablesStandalone(
  inputPath,
  {
    access = accessFile,
    hashAsarHeader = sha256AsarHeader,
    hashFile = sha256File,
    readInfoPlist = readMacAppInfoPlist,
    readLinuxAppVersion: readLinuxAppVersionDependency = readLinuxAppVersion,
    readWindowsAppVersion: readWindowsAppVersionDependency = readWindowsAppVersion,
    readWindowsAsarIntegrity: readWindowsAsarIntegrityDependency = readWindowsAsarIntegrity,
    realpath = resolveRealpath,
  } = {},
) {
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new TypeError('Cables Standalone executable path must be a non-empty string')
  }

  const executablePath = await realpath(inputPath)
  await access(executablePath, constants.X_OK)

  const isMacAppBundle = (() => {
    const macOsPath = dirname(executablePath)
    const contentsPath = dirname(macOsPath)
    return (
      basename(macOsPath) === 'MacOS' &&
      basename(contentsPath) === 'Contents' &&
      basename(dirname(contentsPath)).endsWith('.app')
    )
  })()

  const executableSha256 = await hashFile(executablePath)
  if (!SHA256_PATTERN.test(executableSha256)) {
    throw new Error(`Executable SHA-256 is invalid: ${String(executableSha256)}`)
  }

  if (!isMacAppBundle) {
    return inspectDirectoryCablesStandalone({
      platform: basename(executablePath).toLowerCase().endsWith('.exe') ? 'windows' : 'linux',
      executablePath,
      executableSha256,
      access,
      hashAsarHeader,
      hashFile,
      readLinuxAppVersion: readLinuxAppVersionDependency,
      readWindowsAppVersion: readWindowsAppVersionDependency,
      readWindowsAsarIntegrity: readWindowsAsarIntegrityDependency,
    })
  }

  const { appBundlePath, contentsPath, macOsPath } = requireMacAppExecutable(executablePath)
  const plist = await readInfoPlist(join(contentsPath, 'Info.plist'))
  validateInfoPlist(plist, executablePath, macOsPath)
  const asarIntegrity = requireAsarIntegrity(plist, contentsPath)

  try {
    await access(asarIntegrity.asarPath, constants.R_OK)
  } catch (error) {
    throw new Error(
      `Cables Standalone app.asar is required at ${asarIntegrity.asarPath}`,
      { cause: error },
    )
  }
  const headerIntegrity = await hashAsarHeader(asarIntegrity.asarPath)
  if (!SHA256_PATTERN.test(headerIntegrity?.actualSha256)) {
    throw new Error(
      `app.asar actual header SHA-256 is invalid: ${String(headerIntegrity?.actualSha256)}`,
    )
  }
  if (
    headerIntegrity.headerOffset !== ASAR_HEADER_OFFSET ||
    !Number.isSafeInteger(headerIntegrity.headerByteLength) ||
    headerIntegrity.headerByteLength <= 0
  ) {
    throw new Error('app.asar header SHA-256 byte range is invalid')
  }
  if (headerIntegrity.actualSha256 !== asarIntegrity.expectedSha256) {
    throw new Error(
      `app.asar SHA-256 mismatch: expected ${asarIntegrity.expectedSha256}; ` +
      `actual ${headerIntegrity.actualSha256}`,
    )
  }
  const wholeFileSha256 = await hashFile(asarIntegrity.asarPath)
  if (!SHA256_PATTERN.test(wholeFileSha256)) {
    throw new Error(`app.asar whole-file SHA-256 is invalid: ${String(wholeFileSha256)}`)
  }

  return deepFreeze({
    platform: 'macos',
    expectedVersion: plist.CFBundleShortVersionString,
    appBundlePath,
    asarIntegrity: {
      ...asarIntegrity,
      ...headerIntegrity,
      wholeFileSha256,
    },
    executablePath,
    executableSha256,
    infoPlist: selectInfoPlistFields(plist),
  })
}
