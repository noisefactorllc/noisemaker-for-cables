#!/usr/bin/env node

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { updateArtifactLock, verifyArtifactLock } from './lib/artifact-lock.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const options = {
  cacheRoot: resolve(projectRoot, 'vendor-cache'),
  lockPath: resolve(projectRoot, 'vendor.lock.json'),
  sourceBaseUrl: 'https://shaders.noisedeck.app/1/',
}

async function main() {
  const [command, ...extraArguments] = process.argv.slice(2)
  if (extraArguments.length > 0 || !['update', 'verify'].includes(command)) {
    throw new Error('Usage: node tools/vendor.mjs <update|verify>')
  }

  if (command === 'update') {
    const lock = await updateArtifactLock(options)
    console.log(`Updated ${lock.effectCount} effects (${lock.artifacts.length} artifacts)`)
    return
  }

  const result = await verifyArtifactLock(options)
  console.log(
    `${result.verifiedEffectCount}/${result.effectCount} effects verified (${result.artifactCount} artifacts)`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
