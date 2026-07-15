#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { inspectCablesStandalone } from './lib/cables-standalone-identity.js'
import { removeTemporaryDirectory } from './lib/remove-temporary-directory.js'
import { stopChild } from './lib/stop-child.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = resolve(projectRoot, 'examples/noisemaker-program.cables')
const reportRoot = resolve(projectRoot, 'test-report')
const screenshotPath = resolve(reportRoot, 'standalone-smoke.png')
const reportPath = resolve(reportRoot, 'standalone-smoke.json')
const executableInput = process.env.CABLES_APP
const cdpPort = Number(process.env.CABLES_CDP_PORT || 9334)

if (!executableInput) {
  throw new Error('Set CABLES_APP to the Cables Standalone executable')
}

const cablesStandalone = await inspectCablesStandalone(executableInput)
const executable = cablesStandalone.executablePath
assert.equal(cablesStandalone.asarIntegrity.algorithm, 'SHA256')
assert.equal(
  cablesStandalone.asarIntegrity.asarPath,
  join(cablesStandalone.appBundlePath, 'Contents/Resources/app.asar'),
)
assert.match(cablesStandalone.asarIntegrity.actualSha256, /^[0-9a-f]{64}$/)
assert.equal(
  cablesStandalone.asarIntegrity.actualSha256,
  cablesStandalone.asarIntegrity.expectedSha256,
)

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function waitFor(check, message, timeout = 30_000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeout) {
    try {
      const value = await check()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await sleep(100)
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ''}`)
}

const userDataDirectory = await mkdtemp(join(tmpdir(), 'noisemaker-cables-smoke-'))
const terminalLines = []
const consoleErrors = []
const pageErrors = []
let browser
let child

try {
  await mkdir(reportRoot, { recursive: true })
  child = spawn(executable, [
    `--patch=${patchPath}`,
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDirectory}`,
  ], {
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => terminalLines.push(...chunk.split(/\r?\n/).filter(Boolean)))
  }

  const cdpUrl = `http://127.0.0.1:${cdpPort}`
  await waitFor(async () => {
    const response = await fetch(`${cdpUrl}/json/version`)
    return response.ok
  }, 'Cables Standalone did not expose CDP')

  browser = await chromium.connectOverCDP(cdpUrl)
  const context = browser.contexts()[0]
  const page = await waitFor(() => context.pages()[0], 'Cables editor page did not open')
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const frame = await waitFor(
    () => page.frames().find((candidate) => candidate.url().includes('/dist/ui/')),
    'Cables editor frame did not load',
  )
  await waitFor(
    () => frame.evaluate(() => Boolean(globalThis.gui?.corePatch)),
    'Cables patch runtime did not initialize',
  )
  const introClose = frame.getByText('Close', { exact: true }).first()
  await introClose.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {})
  if (await introClose.isVisible().catch(() => false)) await introClose.click()

  const readProgramState = () => frame.evaluate(() => {
    const program = gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const texture = program?.getPort('Texture')?.get()
    return program ? {
      dsl: program.getPort('DSL').get(),
      error: program.getPort('Error').get(),
      height: texture?.height,
      ready: program.getPort('Ready').get(),
      texture: Boolean(texture?.tex),
      width: texture?.width,
    } : null
  })

  const readProgramPixels = () => frame.evaluate(() => {
    const patch = gui.corePatch()
    const texture = patch
      .getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
      ?.getPort('Texture')
      ?.get()
    if (!texture?.tex) throw new Error('Program output texture is unavailable')

    const gl = patch.cgl.gl
    const width = Math.min(texture.width, 128)
    const height = Math.min(texture.height, 96)
    const previous = {
      drawFramebuffer: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
      packAlignment: gl.getParameter(gl.PACK_ALIGNMENT),
      pixelPackBuffer: gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),
      readFramebuffer: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
    }
    const framebuffer = gl.createFramebuffer()
    if (!framebuffer) throw new Error('could not allocate readback framebuffer')

    try {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(
        gl.READ_FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture.tex,
        0,
      )
      const status = gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER)
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Program output framebuffer is incomplete: ${status}`)
      }
      gl.readBuffer(gl.COLOR_ATTACHMENT0)
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
      gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
      gl.finish()

      const pixels = new Float32Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixels)
      const words = new Uint32Array(pixels.buffer)
      let hash = 2166136261
      let maximum = -Infinity
      let minimum = Infinity
      let sum = 0
      for (let index = 0; index < pixels.length; index += 1) {
        const value = pixels[index]
        if (!Number.isFinite(value)) {
          throw new Error(`Program output is non-finite at channel ${index}`)
        }
        hash = Math.imul(hash ^ words[index], 16777619) >>> 0
        maximum = Math.max(maximum, value)
        minimum = Math.min(minimum, value)
        sum += value
      }
      return {
        hash: hash.toString(16).padStart(8, '0'),
        height,
        maximum,
        mean: sum / pixels.length,
        minimum,
        width,
      }
    } finally {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previous.drawFramebuffer)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous.readFramebuffer)
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, previous.pixelPackBuffer)
      gl.pixelStorei(gl.PACK_ALIGNMENT, previous.packAlignment)
      gl.deleteFramebuffer(framebuffer)
    }
  })

  const initial = await waitFor(async () => {
    const state = await readProgramState()
    return state?.ready && state.texture && state.error === '' ? state : null
  }, 'default Program op did not become ready')
  assert.match(initial.dsl, /noise\(seed:\s*1/)

  const facade = await frame.evaluate(() => {
    const result = NoisemakerCablesGL.inspectCapabilities(gui.corePatch().cgl, { CGL })
    return {
      effectCount: NoisemakerCablesGL.effectMetadata.effectCount,
      effectIds: NoisemakerCablesGL.effectMetadata.effectIds.length,
      issues: [...result.issues],
      packageVersion: NoisemakerCablesGL.packageVersion,
      supported: result.supported,
    }
  })
  assert.deepEqual(facade, {
    effectCount: 210,
    effectIds: 210,
    issues: [],
    packageVersion: '0.1.0',
    supported: true,
  })

  const downstream = await frame.evaluate(() => {
    const patch = gui.corePatch()
    const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const viz = patch.getOpsByObjName('Ops.Ui.VizTexture')[0]
    return {
      inputIsProgramTexture:
        viz?.getPort('Texture In').get() === program?.getPort('Texture').get(),
      outputIsProgramTexture:
        viz?.getPort('Texture Out').get() === program?.getPort('Texture').get(),
      vizPresent: Boolean(viz),
    }
  })
  assert.deepEqual(downstream, {
    inputIsProgramTexture: true,
    outputIsProgramTexture: true,
    vizPresent: true,
  })

  const firstPixels = await readProgramPixels()
  const firstTime = await frame.evaluate(() =>
    gui.corePatch().getOpsByObjName('Ops.Anim.Timer_v2')[0].getPort('Time').get())
  const secondTime = await waitFor(async () => {
    const time = await frame.evaluate(() =>
      gui.corePatch().getOpsByObjName('Ops.Anim.Timer_v2')[0].getPort('Time').get())
    return time > firstTime ? time : null
  }, 'Cables Timer did not advance Noisemaker time')
  const secondPixels = await waitFor(async () => {
    const pixels = await readProgramPixels()
    return pixels.hash !== firstPixels.hash ? pixels : null
  }, 'animated Noisemaker pixels did not change', 10_000)
  assert.ok(secondTime > firstTime)

  const solidDsl = [
    'search synth',
    '',
    'solid(color: #d7263d, alpha: 1)',
    '  .write(o0)',
    '',
    'render(o0)',
  ].join('\n')
  await frame.evaluate((dsl) => {
    gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program')[0].getPort('DSL').set(dsl)
  }, solidDsl)
  await sleep(1_000)
  const valid = await readProgramState()
  assert.equal(valid.ready, true)
  assert.equal(valid.error, '')
  const solidPixels = await waitFor(async () => {
    const pixels = await readProgramPixels()
    return pixels.hash !== secondPixels.hash ? pixels : null
  }, 'valid DSL hot-swap did not change pixels')

  const invalidDsl = [
    'search synth',
    '',
    'thisEffectDoesNotExist()',
    '  .write(o0)',
    '',
    'render(o0)',
  ].join('\n')
  await frame.evaluate((dsl) => {
    gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program')[0].getPort('DSL').set(dsl)
  }, invalidDsl)
  const invalid = await waitFor(async () => {
    const state = await readProgramState()
    return state?.ready && state.texture && state.error ? state : null
  }, 'invalid DSL did not report an error while retaining last-good')
  assert.equal(invalid.width, valid.width)
  assert.equal(invalid.height, valid.height)
  await sleep(400)
  const retainedPixels = await readProgramPixels()
  assert.equal(
    retainedPixels.hash,
    solidPixels.hash,
    'invalid DSL replaced last-good pixels',
  )

  const mediaDsl = [
    'search synth',
    '',
    'media()',
    '  .write(o0)',
    '',
    'render(o0)',
  ].join('\n')
  await frame.evaluate(async (dsl) => {
    const patch = gui.corePatch()
    const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const color = await new Promise((resolveAdd, rejectAdd) => {
      const timeout = setTimeout(() => rejectAdd(new Error('timed out adding ColorTexture')), 10_000)
      gui.patchView.addOp('Ops.Gl.Textures.ColorTexture', {
        onOpAdd(op) {
          clearTimeout(timeout)
          resolveAdd(op)
        },
      })
    })
    color.setUiAttribs({ subPatch: 0, translate: { x: 420, y: 420 } })
    color.getPort('r').set(0.1)
    color.getPort('g').set(0.8)
    color.getPort('b').set(0.35)
    color.getPort('a').set(1)
    const hostTexture = await new Promise((resolveTexture, rejectTexture) => {
      const started = Date.now()
      const poll = () => {
        const texture = color.getPort('texture_out').get()
        if (texture?.tex) {
          resolveTexture(texture)
          return
        }
        if (Date.now() - started >= 10_000) {
          rejectTexture(new Error('ColorTexture did not allocate a WebGL handle'))
          return
        }
        setTimeout(poll, 25)
      }
      poll()
    })
    const gl = patch.cgl.gl
    const originalBindTexture = gl.bindTexture
    const originalReadPixels = gl.readPixels
    const probe = {
      bindCount: 0,
      colorId: color.id,
      hostHandle: hostTexture?.tex,
      originalBindTexture,
      originalReadPixels,
      readPixelsCount: 0,
    }
    gl.bindTexture = function bindTexture(target, texture) {
      if (texture === probe.hostHandle) probe.bindCount += 1
      return originalBindTexture.call(this, target, texture)
    }
    gl.readPixels = function readPixels(...args) {
      probe.readPixelsCount += 1
      return originalReadPixels.apply(this, args)
    }
    globalThis.__noisemakerMediaProbe = probe
    patch.link(color, 'texture_out', program, 'Input Texture')
    program.getPort('DSL').set(dsl)
  }, mediaDsl)
  try {
    await waitFor(async () => {
      const state = await readProgramState()
      return state?.ready && state.texture && state.error === '' ? state : null
    }, 'media program did not become ready')
  } catch (error) {
    const diagnostics = await frame.evaluate(() => {
      const patch = gui.corePatch()
      const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
      const color = patch.getOpsByObjName('Ops.Gl.Textures.ColorTexture')[0]
      const input = program?.getPort('Input Texture')
      const hostTexture = color?.getPort('texture_out')?.get()
      return {
        colorPresent: Boolean(color),
        hostHandle: Boolean(hostTexture?.tex),
        inputLinked: Boolean(input?.isLinked()),
        inputSameTexture: input?.get() === hostTexture,
        program: program && {
          error: program.getPort('Error').get(),
          ready: program.getPort('Ready').get(),
        },
      }
    })
    error.message += `: ${JSON.stringify(diagnostics)}`
    throw error
  }
  await sleep(750)
  const mediaProbe = await frame.evaluate(() => {
    const gl = gui.corePatch().cgl.gl
    const probe = globalThis.__noisemakerMediaProbe
    gl.bindTexture = probe.originalBindTexture
    gl.readPixels = probe.originalReadPixels
    delete globalThis.__noisemakerMediaProbe
    return {
      bindCount: probe.bindCount,
      hostHandle: Boolean(probe.hostHandle),
      readPixelsCount: probe.readPixelsCount,
    }
  })
  assert.equal(mediaProbe.hostHandle, true)
  assert.ok(mediaProbe.bindCount > 0, 'media render never bound the original CGL texture handle')
  assert.equal(mediaProbe.readPixelsCount, 0, 'media path performed a CPU readback')

  const canvasResizeRequest = { height: 270, width: 480 }
  const canvasResizeBefore = await frame.evaluate(({ height, width }) => {
    const patch = gui.corePatch()
    const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const texture = program.getPort('Texture').get()
    globalThis.__noisemakerCanvasResizeProbe = { program, texture }
    const before = {
      canvasHeight: patch.cgl.canvasHeight,
      canvasWidth: patch.cgl.canvasWidth,
      height: texture?.height,
      mode: program.getPort('Size').get() === 0 ? 'Canvas' : program.getPort('Size').get(),
      programId: program.id,
      width: texture?.width,
    }
    patch.cgl.setSize(width, height)
    program.getPort('Render').trigger()
    return {
      ...before,
      requestedCss: { height, width },
      target: { height: patch.cgl.canvasHeight, width: patch.cgl.canvasWidth },
    }
  }, canvasResizeRequest)
  const canvasResizeTarget = canvasResizeBefore.target
  assert.equal(canvasResizeBefore.mode, 'Canvas')
  assert.notDeepEqual(
    { height: canvasResizeBefore.height, width: canvasResizeBefore.width },
    canvasResizeTarget,
    'Canvas resize target must differ from the initial Program texture size',
  )

  let canvasResize
  try {
    canvasResize = await waitFor(async () => frame.evaluate(({ height, width }) => {
    const patch = gui.corePatch()
    const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const texture = program?.getPort('Texture')?.get()
    const probe = globalThis.__noisemakerCanvasResizeProbe
    if (
      texture?.width !== width ||
      texture?.height !== height ||
      patch.cgl.canvasWidth !== width ||
      patch.cgl.canvasHeight !== height
    ) return null

    const result = {
      canvas: {
        height: patch.cgl.canvas.height,
        width: patch.cgl.canvas.width,
      },
      cgl: {
        canvasHeight: patch.cgl.canvasHeight,
        canvasWidth: patch.cgl.canvasWidth,
        drawingBufferHeight: patch.cgl.gl.drawingBufferHeight,
        drawingBufferWidth: patch.cgl.gl.drawingBufferWidth,
        viewPort: [...patch.cgl.viewPort],
      },
      error: program.getPort('Error').get(),
      height: texture.height,
      mode: program.getPort('Size').get() === 0 ? 'Canvas' : program.getPort('Size').get(),
      programId: program.id,
      ready: program.getPort('Ready').get(),
      replacedTexture: texture !== probe.texture,
      stableProgram: program === probe.program,
      texture: Boolean(texture.tex),
      width: texture.width,
    }
    delete globalThis.__noisemakerCanvasResizeProbe
    return result
    }, canvasResizeTarget), 'Canvas-mode Program texture did not follow the CGL canvas resize')
  } catch (error) {
    const diagnostics = await frame.evaluate(() => {
      const patch = gui.corePatch()
      const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
      const texture = program?.getPort('Texture')?.get()
      return {
        canvas: {
          clientHeight: patch.cgl.canvas.clientHeight,
          clientWidth: patch.cgl.canvas.clientWidth,
          height: patch.cgl.canvas.height,
          width: patch.cgl.canvas.width,
        },
        cgl: {
          canvasHeight: patch.cgl.canvasHeight,
          canvasWidth: patch.cgl.canvasWidth,
          drawingBufferHeight: patch.cgl.gl.drawingBufferHeight,
          drawingBufferWidth: patch.cgl.gl.drawingBufferWidth,
          viewPort: [...patch.cgl.viewPort],
        },
        program: {
          error: program?.getPort('Error')?.get(),
          height: texture?.height,
          mode: program?.getPort('Size')?.get(),
          ready: program?.getPort('Ready')?.get(),
          width: texture?.width,
        },
      }
    })
    error.message += `: ${JSON.stringify(diagnostics)}`
    throw error
  }
  assert.deepEqual(canvasResize, {
    canvas: canvasResizeTarget,
    cgl: {
      canvasHeight: canvasResizeTarget.height,
      canvasWidth: canvasResizeTarget.width,
      drawingBufferHeight: canvasResizeTarget.height,
      drawingBufferWidth: canvasResizeTarget.width,
      viewPort: [0, 0, canvasResizeTarget.width, canvasResizeTarget.height],
    },
    error: '',
    height: canvasResizeTarget.height,
    mode: 'Canvas',
    programId: canvasResizeBefore.programId,
    ready: true,
    replacedTexture: true,
    stableProgram: true,
    texture: true,
    width: canvasResizeTarget.width,
  })

  const resize = await frame.evaluate(async () => {
    const program = gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    program.getPort('Size').set('Manual')
    program.getPort('Width').set(320)
    program.getPort('Height').set(180)
    await new Promise((resolveResize) => setTimeout(resolveResize, 1_000))
    const before = program.getPort('Texture').get()
    program.getPort('Reset').trigger()
    await new Promise((resolveReset) => setTimeout(resolveReset, 1_000))
    const after = program.getPort('Texture').get()
    return {
      error: program.getPort('Error').get(),
      height: after?.height,
      ready: program.getPort('Ready').get(),
      stableTexture: before === after,
      width: after?.width,
    }
  })
  assert.deepEqual(resize, {
    error: '',
    height: 180,
    ready: true,
    stableTexture: true,
    width: 320,
  })

  const recreated = await frame.evaluate(async () => {
    const patch = gui.corePatch()
    const oldProgram = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
    const main = patch.getOpsByObjName('Ops.Gl.MainLoop_v2')[0]
    const timer = patch.getOpsByObjName('Ops.Anim.Timer_v2')[0]
    const viz = patch.getOpsByObjName('Ops.Ui.VizTexture')[0]
    patch.deleteOp(oldProgram.id)
    await new Promise((resolveDelete) => setTimeout(resolveDelete, 250))
    const program = await new Promise((resolveAdd, rejectAdd) => {
      const timeout = setTimeout(() => rejectAdd(new Error('timed out recreating Program')), 10_000)
      gui.patchView.addOp('Ops.Extension.Noisemaker.Program', {
        onOpAdd(op) {
          clearTimeout(timeout)
          resolveAdd(op)
        },
      })
    })
    program.setUiAttribs({ subPatch: 0, translate: { x: 420, y: 100 } })
    patch.link(main, 'trigger', program, 'Render')
    patch.link(timer, 'Time', program, 'Time')
    patch.link(program, 'Texture', viz, 'Texture In')
    return { id: program.id, oldId: oldProgram.id }
  })
  assert.notEqual(recreated.id, recreated.oldId)
  const finalState = await waitFor(async () => {
    const state = await readProgramState()
    return state?.ready && state.texture && state.error === '' ? state : null
  }, 'recreated Program op did not render successfully')
  assert.equal(finalState.ready, true)

  const screenshot = await page.screenshot({ path: screenshotPath })
  const glOrPromiseErrors = [...consoleErrors, ...pageErrors].filter((message) =>
    /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i.test(message))
  assert.deepEqual(glOrPromiseErrors, [])

  const terminalGlErrors = terminalLines.filter((line) =>
    /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i.test(line))
  assert.deepEqual(terminalGlErrors, [])

  const report = {
    cablesStandalone,
    canvasResize,
    canvasResizeBefore,
    consoleErrors,
    facade,
    finalState,
    initial,
    mediaProbe,
    pageErrors,
    pixels: {
      animated: { first: firstPixels, second: secondPixels },
      invalidRetainedHash: retainedPixels.hash,
      solid: solidPixels,
    },
    recreated,
    resize,
    screenshot: 'test-report/standalone-smoke.png',
    screenshotSha256: digest(screenshot),
    time: { first: firstTime, second: secondTime },
  }
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally {
  if (browser) await browser.close().catch(() => {})
  if (child) await stopChild(child)
  await removeTemporaryDirectory(userDataDirectory)
}
