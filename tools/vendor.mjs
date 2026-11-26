#!/usr/bin/env node

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

import { sha256, updateArtifactLock, verifyArtifactLock } from './lib/artifact-lock.js'
import { coreSources, deriveStableCore } from './lib/stable-core.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const options = {
  cacheRoot: resolve(projectRoot, 'vendor-cache'),
  lockPath: resolve(projectRoot, 'vendor.lock.json'),
  sourceBaseUrl: 'https://shaders.noisedeck.app/1.5.17/',
}

async function derivationRecord() {
  return {
    tool: 'tools/lib/stable-core.js',
    toolSha256: await sha256(await readFile(new URL('./lib/stable-core.js', import.meta.url))),
    updates: {
      path: 'tools/lib/stable-core-updates.json',
      sha256: await sha256(await readFile(new URL('./lib/stable-core-updates.json', import.meta.url))),
    },
    sources: coreSources,
  }
}

async function main() {
  const [command, ...extraArguments] = process.argv.slice(2)
  if (extraArguments.length > 0 || !['update', 'verify'].includes(command)) {
    throw new Error('Usage: node tools/vendor.mjs <update|verify>')
  }

  if (command === 'update') {
    const lock = await updateArtifactLock({
      ...options,
      async fetchImplementation(url) {
        const response = await fetch(url)
        if (url !== coreSources.release.url || !response.ok) return response
        const baseResponse = await fetch(coreSources.base.url)
        if (!baseResponse.ok) throw Error(`Stable core base download: HTTP ${baseResponse.status}`)
        const baselineResponse = await fetch(coreSources.baseline.url)
        if (!baselineResponse.ok) throw Error(`Stable core baseline download: HTTP ${baselineResponse.status}`)
        return new Response(deriveStableCore(
          Buffer.from(await baseResponse.arrayBuffer()),
          Buffer.from(await baselineResponse.arrayBuffer()),
          Buffer.from(await response.arrayBuffer()),
        ))
      },
    })
    lock.coreDerivation = await derivationRecord()
    await writeFile(options.lockPath, `${JSON.stringify(lock, null, 2)}\n`)
    console.log(`Updated ${lock.effectCount} effects (${lock.artifacts.length} artifacts)`)
    return
  }

  const result = await verifyArtifactLock(options)
  const lock = JSON.parse(await readFile(options.lockPath, 'utf8'))
  if (JSON.stringify(lock.coreDerivation) !== JSON.stringify(await derivationRecord())) {
    throw Error('Stable core derivation differs from vendor.lock.json; run vendor:update')
  }
  console.log(
    `${result.verifiedEffectCount}/${result.effectCount} effects verified (${result.artifactCount} artifacts)`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
