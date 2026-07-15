#!/usr/bin/env node

import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entryPoint = resolve(projectRoot, 'src/browser.js')
const outputPath = resolve(
  projectRoot,
  'Ops.Extension.Noisemaker/Ops.Extension.Noisemaker.Program/lib_noisemaker-cablesgl.js',
)
const corePath = resolve(projectRoot, 'vendor-cache/noisemaker-shaders-core.esm.js')

async function main() {
  const coreSource = await readFile(corePath, 'utf8')
  const licenseHeader = coreSource.match(/^\/\*\*[\s\S]*?\*\//)?.[0]
  if (!licenseHeader) throw new Error('Vendored core license header is missing')

  await mkdir(dirname(outputPath), { recursive: true })
  await build({
    banner: { js: licenseHeader },
    bundle: true,
    charset: 'utf8',
    entryPoints: [entryPoint],
    format: 'iife',
    globalName: 'NoisemakerCablesGL',
    legalComments: 'inline',
    minify: true,
    outfile: outputPath,
    platform: 'browser',
    sourcemap: false,
    target: ['es2022'],
    treeShaking: true,
  })

  const output = await readFile(outputPath, 'utf8')
  if (output.includes('/Users/')) throw new Error('Bundle contains an absolute workspace path')
  if (output.includes('shaders.noisedeck.app')) {
    throw new Error('Bundle contains a mutable Noisemaker CDN reference')
  }
  if (output.includes('sourceMappingURL')) throw new Error('Bundle contains a source map reference')

  const { size } = await stat(outputPath)
  console.log(`Built NoisemakerCablesGL (${size} bytes)`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
