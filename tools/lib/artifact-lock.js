import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path'

const CORE_PATH = 'noisemaker-shaders-core.esm.js'
const MANIFEST_PATH = 'effects/manifest.json'
const LOCK_SCHEMA_VERSION = 1
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const textDecoder = new TextDecoder('utf-8', { fatal: true })

const compareStrings = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

function asBytes(value) {
  if (typeof value === 'string') {
    return Buffer.from(value)
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }

  throw new TypeError('bytes must be a string, ArrayBuffer, or typed array')
}

export async function sha256(bytes) {
  return createHash('sha256').update(asBytes(bytes)).digest('hex')
}

export function artifactPathForEffect(effectId) {
  if (
    typeof effectId !== 'string' ||
    effectId.length === 0 ||
    effectId.includes('\\') ||
    posix.isAbsolute(effectId) ||
    posix.normalize(effectId) !== effectId ||
    effectId.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid effect ID: ${String(effectId)}`)
  }

  return `effects/${effectId}.js`
}

function scanTopLevelManifestIds(json) {
  let index = 0
  const ids = []
  const seen = new Set()
  const skipWhitespace = () => {
    while (/\s/u.test(json[index] ?? '')) index += 1
  }
  const readString = () => {
    const start = index
    index += 1

    while (index < json.length) {
      if (json[index] === '\\') {
        index += 2
        continue
      }

      if (json[index] === '"') {
        index += 1
        return JSON.parse(json.slice(start, index))
      }

      index += 1
    }

    throw new SyntaxError('Unterminated JSON string')
  }
  const skipValue = () => {
    let depth = 0

    while (index < json.length) {
      const character = json[index]

      if (character === '"') {
        readString()
        continue
      }

      if (character === '{' || character === '[') {
        depth += 1
      } else if (character === ']' || (character === '}' && depth > 0)) {
        depth -= 1
      } else if (depth === 0 && (character === ',' || character === '}')) {
        return character
      }

      index += 1
    }

    throw new SyntaxError('Unterminated JSON value')
  }

  skipWhitespace()
  if (json[index] !== '{') throw new TypeError('Manifest must be a JSON object')
  index += 1
  skipWhitespace()

  if (json[index] === '}') return ids

  while (index < json.length) {
    if (json[index] !== '"') throw new SyntaxError('Manifest keys must be JSON strings')
    const effectId = readString()
    if (seen.has(effectId)) throw new Error(`Duplicate manifest ID: ${effectId}`)
    seen.add(effectId)
    ids.push(effectId)

    skipWhitespace()
    if (json[index] !== ':') throw new SyntaxError(`Missing value for manifest ID: ${effectId}`)
    index += 1
    skipWhitespace()

    const separator = skipValue()
    if (separator === '}') {
      index += 1
      skipWhitespace()
      if (index !== json.length) throw new SyntaxError('Unexpected data after manifest')
      return ids
    }

    index += 1
    skipWhitespace()
  }

  throw new SyntaxError('Unterminated manifest object')
}

export function validateManifest(manifest) {
  let parsed
  let rawIds

  if (typeof manifest === 'string' || manifest instanceof ArrayBuffer || ArrayBuffer.isView(manifest)) {
    const json = typeof manifest === 'string' ? manifest : textDecoder.decode(asBytes(manifest))
    rawIds = scanTopLevelManifestIds(json)
    parsed = JSON.parse(json)
  } else {
    parsed = manifest
    rawIds = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.keys(parsed)
      : []
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Manifest must be a JSON object')
  }

  for (const effectId of rawIds) {
    artifactPathForEffect(effectId)
    const descriptor = parsed[effectId]
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
      throw new TypeError(`Manifest descriptor must be an object: ${effectId}`)
    }
  }

  return [...rawIds].sort(compareStrings)
}

function normalizeSourceBaseUrl(sourceBaseUrl) {
  const url = new URL(sourceBaseUrl)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  url.search = ''
  url.hash = ''
  return url.href
}

function requirePath(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty path`)
  }
  return resolve(value)
}

function safeCachePath(cacheRoot, artifactPath) {
  if (
    typeof artifactPath !== 'string' ||
    artifactPath.length === 0 ||
    artifactPath.includes('\\') ||
    posix.isAbsolute(artifactPath) ||
    posix.normalize(artifactPath) !== artifactPath
  ) {
    throw new Error(`Artifact path escapes cache root: ${String(artifactPath)}`)
  }

  const root = resolve(cacheRoot)
  const destination = resolve(root, ...artifactPath.split('/'))
  const fromRoot = relative(root, destination)
  if (destination === root || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`Artifact path escapes cache root: ${artifactPath}`)
  }

  return destination
}

async function lstatIfExists(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

function assertCacheDirectory(stat, path) {
  if (stat.isSymbolicLink()) {
    throw new Error(`Symbolic link is not allowed within cache root: ${path}`)
  }
  if (!stat.isDirectory()) {
    throw new Error(`Cache path component is not a directory: ${path}`)
  }
}

function assertRealpathContained(realCacheRoot, realComponent, component) {
  const fromRoot = relative(realCacheRoot, realComponent)
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`Cache path resolves outside cache root: ${component}`)
  }
}

async function guardCacheArtifactPath(cacheRoot, artifactPath, { createDirectories }) {
  const destination = safeCachePath(cacheRoot, artifactPath)
  const root = resolve(cacheRoot)
  let rootStat = await lstatIfExists(root)

  if (!rootStat) {
    if (!createDirectories) return destination
    await mkdir(root, { recursive: true })
    rootStat = await lstat(root)
  }

  assertCacheDirectory(rootStat, root)
  const realCacheRoot = await realpath(root)
  let component = root

  for (const segment of artifactPath.split('/').slice(0, -1)) {
    component = resolve(component, segment)
    let componentStat = await lstatIfExists(component)

    if (!componentStat) {
      if (!createDirectories) return destination
      try {
        await mkdir(component)
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error
      }
      componentStat = await lstat(component)
    }

    assertCacheDirectory(componentStat, component)
    assertRealpathContained(realCacheRoot, await realpath(component), component)
  }

  const destinationStat = await lstatIfExists(destination)
  if (destinationStat?.isSymbolicLink()) {
    throw new Error(`Symbolic link is not allowed within cache root: ${destination}`)
  }

  return destination
}

async function atomicWrite(filePath, bytes) {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`

  try {
    await writeFile(temporaryPath, bytes)
    await rename(temporaryPath, filePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function atomicWriteCacheArtifact(cacheRoot, artifactPath, bytes) {
  const filePath = await guardCacheArtifactPath(cacheRoot, artifactPath, {
    createDirectories: true,
  })
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`

  try {
    await writeFile(temporaryPath, bytes, { flag: 'wx' })
    await guardCacheArtifactPath(cacheRoot, artifactPath, { createDirectories: false })
    await rename(temporaryPath, filePath)
    await guardCacheArtifactPath(cacheRoot, artifactPath, { createDirectories: false })
  } finally {
    try {
      await guardCacheArtifactPath(cacheRoot, artifactPath, { createDirectories: false })
      await rm(temporaryPath, { force: true })
    } catch {
      // Do not follow or remove through a path that became unsafe during the write.
    }
  }
}

async function readCacheArtifact(cacheRoot, artifactPath) {
  const filePath = await guardCacheArtifactPath(cacheRoot, artifactPath, {
    createDirectories: false,
  })
  let file

  try {
    file = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW)
    await guardCacheArtifactPath(cacheRoot, artifactPath, { createDirectories: false })
    const stat = await file.stat()
    if (!stat.isFile()) throw new Error(`Artifact is not a regular file: ${artifactPath}`)
    return await file.readFile()
  } catch (error) {
    if (error?.code === 'ELOOP') {
      throw new Error(`Symbolic link is not allowed within cache root: ${filePath}`)
    }
    throw error
  } finally {
    await file?.close()
  }
}

async function download(url, fetchImplementation) {
  const response = await fetchImplementation(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function mapConcurrent(values, concurrency, operation) {
  const results = new Array(values.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await operation(values[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  )
  return results
}

async function createArtifact(url, path, bytes) {
  return {
    bytes: bytes.byteLength,
    path,
    sha256: await sha256(bytes),
    url,
  }
}

export async function updateArtifactLock(options) {
  const sourceBaseUrl = normalizeSourceBaseUrl(options?.sourceBaseUrl)
  const cacheRoot = requirePath(options?.cacheRoot, 'cacheRoot')
  const lockPath = requirePath(options?.lockPath, 'lockPath')
  const fetchImplementation = options?.fetchImplementation ?? globalThis.fetch

  if (typeof fetchImplementation !== 'function') {
    throw new TypeError('A fetch implementation is required for update')
  }

  const coreUrl = new URL(CORE_PATH, sourceBaseUrl).href
  const manifestUrl = new URL(MANIFEST_PATH, sourceBaseUrl).href
  const [coreBytes, manifestBytes] = await Promise.all([
    download(coreUrl, fetchImplementation),
    download(manifestUrl, fetchImplementation),
  ])
  const effectIds = validateManifest(manifestBytes)
  const effectDownloads = await mapConcurrent(effectIds, 8, async (effectId) => {
    const path = artifactPathForEffect(effectId)
    const url = new URL(path, sourceBaseUrl).href
    return { bytes: await download(url, fetchImplementation), path, url }
  })
  const downloadedArtifacts = [
    { bytes: coreBytes, path: CORE_PATH, url: coreUrl },
    { bytes: manifestBytes, path: MANIFEST_PATH, url: manifestUrl },
    ...effectDownloads,
  ]
  const artifacts = await Promise.all(
    downloadedArtifacts.map(({ bytes, path, url }) => createArtifact(url, path, bytes)),
  )
  artifacts.sort((left, right) => compareStrings(left.path, right.path))

  for (const artifact of downloadedArtifacts) {
    await guardCacheArtifactPath(cacheRoot, artifact.path, { createDirectories: true })
  }
  for (const artifact of downloadedArtifacts) {
    await atomicWriteCacheArtifact(cacheRoot, artifact.path, artifact.bytes)
  }

  const lock = {
    schemaVersion: LOCK_SCHEMA_VERSION,
    sourceBaseUrl,
    generatedAt: new Date().toISOString(),
    effectCount: effectIds.length,
    artifacts,
  }
  await atomicWrite(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
  return lock
}

function validateLock(lock, cacheRoot) {
  if (!lock || typeof lock !== 'object' || Array.isArray(lock)) {
    throw new TypeError('Artifact lock must be a JSON object')
  }
  if (lock.schemaVersion !== LOCK_SCHEMA_VERSION) {
    throw new Error(`Unsupported artifact lock schema: ${String(lock.schemaVersion)}`)
  }
  if (!Number.isInteger(lock.effectCount) || lock.effectCount < 0) {
    throw new TypeError('Artifact lock effectCount must be a non-negative integer')
  }
  if (!Array.isArray(lock.artifacts)) {
    throw new TypeError('Artifact lock artifacts must be an array')
  }

  const paths = new Set()
  for (const artifact of lock.artifacts) {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
      throw new TypeError('Artifact records must be objects')
    }
    safeCachePath(cacheRoot, artifact.path)
    if (paths.has(artifact.path)) throw new Error(`Duplicate locked artifact path: ${artifact.path}`)
    paths.add(artifact.path)
    if (!Number.isInteger(artifact.bytes) || artifact.bytes < 0) {
      throw new TypeError(`Invalid byte count for ${artifact.path}`)
    }
    if (!SHA256_PATTERN.test(artifact.sha256)) {
      throw new TypeError(`Invalid SHA-256 digest for ${artifact.path}`)
    }
    try {
      new URL(artifact.url)
    } catch {
      throw new TypeError(`Invalid source URL for ${artifact.path}`)
    }
  }

  return paths
}

export async function verifyArtifactLock(options) {
  const cacheRoot = requirePath(options?.cacheRoot, 'cacheRoot')
  const lockPath = requirePath(options?.lockPath, 'lockPath')
  let lock

  try {
    lock = JSON.parse(await readFile(lockPath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Missing artifact lock file: ${lockPath}`)
    throw error
  }

  const lockedPaths = validateLock(lock, cacheRoot)
  if (!lockedPaths.has(CORE_PATH)) throw new Error(`Missing locked core artifact: ${CORE_PATH}`)
  if (!lockedPaths.has(MANIFEST_PATH)) throw new Error(`Missing locked manifest artifact: ${MANIFEST_PATH}`)

  const verifiedBytes = new Map()
  for (const artifact of lock.artifacts) {
    let bytes

    try {
      bytes = await readCacheArtifact(cacheRoot, artifact.path)
    } catch (error) {
      if (error?.code === 'ENOENT') throw new Error(`Missing artifact file: ${artifact.path}`)
      throw error
    }

    if (bytes.byteLength !== artifact.bytes) {
      throw new Error(
        `Byte size mismatch for ${artifact.path}: expected ${artifact.bytes}, received ${bytes.byteLength}`,
      )
    }
    const actualDigest = await sha256(bytes)
    if (actualDigest !== artifact.sha256) {
      throw new Error(
        `SHA-256 mismatch for ${artifact.path}: expected ${artifact.sha256}, received ${actualDigest}`,
      )
    }
    verifiedBytes.set(artifact.path, bytes)
  }

  const effectIds = validateManifest(verifiedBytes.get(MANIFEST_PATH))
  const expectedBundles = new Set(effectIds.map(artifactPathForEffect))
  const lockedBundles = new Set(
    lock.artifacts
      .map((artifact) => artifact.path)
      .filter((path) => path !== CORE_PATH && path !== MANIFEST_PATH),
  )

  for (const effectId of effectIds) {
    if (!lockedBundles.has(artifactPathForEffect(effectId))) {
      throw new Error(`Missing locked bundle for manifest effect: ${effectId}`)
    }
  }
  for (const bundlePath of [...lockedBundles].sort(compareStrings)) {
    if (!expectedBundles.has(bundlePath)) {
      throw new Error(`Extra locked bundle absent from manifest: ${bundlePath}`)
    }
  }
  if (lock.effectCount !== effectIds.length) {
    throw new Error(
      `Registration count mismatch: lock records ${lock.effectCount}, manifest contains ${effectIds.length}`,
    )
  }
  if (lock.artifacts.length !== lock.effectCount + 2) {
    throw new Error(
      `Artifact count mismatch: expected ${lock.effectCount + 2}, received ${lock.artifacts.length}`,
    )
  }

  return {
    artifactCount: lock.artifacts.length,
    effectCount: lock.effectCount,
    verifiedEffectCount: effectIds.length,
  }
}
