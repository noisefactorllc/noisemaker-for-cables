#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
assert.match(cablesStandalone.asarIntegrity.actualSha256, /^[0-9a-f]{64}$/)
if (cablesStandalone.platform === 'linux') {
  // Linux bundles ship no ElectronAsarIntegrity manifest; the identity check
  // records the computed header and whole-file digests instead.
  assert.equal(cablesStandalone.asarIntegrity.expectedSha256, null)
} else {
  assert.equal(
    cablesStandalone.asarIntegrity.asarPath,
    join(cablesStandalone.appBundlePath, 'Contents/Resources/app.asar'),
  )
  assert.equal(
    cablesStandalone.asarIntegrity.actualSha256,
    cablesStandalone.asarIntegrity.expectedSha256,
  )
}

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
    // Linux Electron bundles in CI-like environments cannot use the SUID
    // chrome-sandbox helper, and Cables' editor needs WebGL, which on
    // GPU-less hosts only initializes through the SwiftShader ANGLE backend.
    ...(process.platform === 'linux'
      ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : []),
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
  const introClose = frame.locator('.introjs-skipbutton', { hasText: 'Close' }).first()
  await introClose.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  if (await introClose.isVisible().catch(() => false)) {
    await introClose.click({ timeout: 5_000 }).catch(() => {})
  }

  const keyboardFocus = await (async () => {
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      ;(canvas ?? document.body).focus()
    })
    const pageState = await page.evaluate(() => ({
      activeElement: document.activeElement?.tagName ?? null,
      hasFocus: document.hasFocus(),
    }))
    const tags = [await frame.evaluate(() => document.activeElement?.tagName ?? null)]
    for (const press of [1, 2]) {
      await page.keyboard.press('Tab')
      await sleep(150)
      tags.push(await frame.evaluate(() => document.activeElement?.tagName ?? null))
    }
    const after = await page.evaluate(() => document.activeElement?.tagName ?? null)
    await page.keyboard.press('Escape')
    return { after, hasFocus: pageState.hasFocus, pageActive: pageState.activeElement, tags }
  })()
  assert.equal(
    keyboardFocus.hasFocus,
    true,
    'the editor page did not own keyboard focus',
  )
  assert.equal(
    keyboardFocus.after,
    'IFRAME',
    'Tab did not move host focus into the editor frame',
  )
  assert.ok(
    keyboardFocus.tags.some((tag, index) => index > 0 && tag !== keyboardFocus.tags[index - 1]),
    `Tab did not traverse editor focus: ${JSON.stringify(keyboardFocus.tags)}`,
  )

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

  // Saved-project lifecycle: copy the committed project (patch file plus the op
  // directory it references) into a fresh location and open it in further
  // Standalone instances. This exercises the ordinary saved-project lifecycle:
  // the project loads after a full editor restart and renders again, the
  // Noisemaker op can be removed from the saved project and the reduced project
  // still loads cleanly, and a legacy-parameter saved project (deprecated
  // parameter aliases) still loads and renders through the current op.
  const bootProjectInstance = async (patchPath, cdpPort) => {
    const profile = await mkdtemp(join(tmpdir(), 'noisemaker-cables-project-profile-'))
    const terminalLines = []
    const url = `http://127.0.0.1:${cdpPort}`
    const child = spawn(executable, [
      `--patch=${patchPath}`,
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profile}`,
      ...(process.platform === 'linux'
        ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        : []),
    ], {
      env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8')
      stream.on('data', (chunk) => terminalLines.push(...chunk.split(/\r?\n/).filter(Boolean)))
    }
    let browser
    let frame
    try {
      await waitFor(async () => {
        const response = await fetch(`${url}/json/version`)
        return response.ok
      }, 'reloaded saved project did not expose CDP')
      browser = await chromium.connectOverCDP(url)
      const page = await waitFor(
        () => browser.contexts()[0].pages()[0],
        'reloaded editor page did not open',
      )
      frame = await waitFor(
        () => page.frames().find((candidate) => candidate.url().includes('/dist/ui/')),
        'reloaded editor frame did not load',
      )
      await waitFor(
        () => frame.evaluate(() => Boolean(globalThis.gui?.corePatch)),
        'reloaded patch runtime did not initialize',
      )
      const readProgramState = async () => frame.evaluate(() => {
        const program = gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
        if (!program) return null
        const texture = program.getPort('Texture')?.get()
        return {
          dsl: program.getPort('DSL').get(),
          error: program.getPort('Error').get(),
          height: texture?.height,
          ready: program.getPort('Ready').get(),
          texture: Boolean(texture?.tex),
          width: texture?.width,
        }
      })
      return { browser, child, frame, profile, readProgramState, terminalLines }
    } catch (error) {
      if (browser) await browser.close().catch(() => {})
      await stopChild(child)
      await removeTemporaryDirectory(profile)
      throw error
    }
  }

  const reloadRoot = await mkdtemp(join(tmpdir(), 'noisemaker-cables-reload-'))
  const reloadProjectDirectory = join(reloadRoot, 'project')
  const reloadPatchPath = join(reloadProjectDirectory, 'noisemaker-program.cables')
  await cp(patchPath, reloadPatchPath)
  await cp(
    resolve(projectRoot, 'Ops.Extension.Noisemaker'),
    join(reloadRoot, 'Ops.Extension.Noisemaker'),
    { recursive: true },
  )
  const reloadPatchSha256 = digest(await readFile(reloadPatchPath))
  const reloadCdpPort = cdpPort + 1
  let savedProjectReload
  console.error('[smoke] booting reload instance')
  let instance = await bootProjectInstance(reloadPatchPath, reloadCdpPort)
  try {
    const reloadedState = await waitFor(async () => {
      const state = await instance.readProgramState()
      return state?.ready && state.texture && state.error === '' ? state : null
    }, 'reloaded saved project did not render the committed Program op')
    assert.match(reloadedState.dsl, /noise\(seed:\s*1/)
    savedProjectReload = {
      patchSha256: reloadPatchSha256,
      ready: reloadedState.ready,
      size: { height: reloadedState.height, width: reloadedState.width },
    }

    // Removal from a saved project: delete the Noisemaker op in the loaded
    // saved project, persist the reduced patch, and reopen it in a fresh
    // editor instance.
    const removal = await instance.frame.evaluate(() => {
      const patch = gui.corePatch()
      const program = patch.getOpsByObjName('Ops.Extension.Noisemaker.Program')[0]
      patch.deleteOp(program.id)
      const serialized = typeof patch.serialize === 'function'
        ? patch.serialize()
        : (typeof patch.toJSON === 'function' ? patch.toJSON() : null)
      return {
        opCount: patch.getOpsByObjName('Ops.Extension.Noisemaker.Program').length,
        opIds: patch.ops ? patch.ops.map((op) => op.objName) : null,
        serialized: serialized === null ? null : (typeof serialized === 'string' ? serialized : JSON.stringify(serialized)),
      }
    })
    assert.equal(removal.opCount, 0, 'Noisemaker Program op was not removed from the loaded saved project')
    const removalTerminalErrors = instance.terminalLines.filter((line) =>
      /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i.test(line))
    assert.deepEqual(removalTerminalErrors, [], 'removing the op from the saved project logged errors')
    // Persist the reduced project in the original saved format (the editor's
    // serialize() omits objName, so its output is not reloadable): take the
    // saved project file, drop the Program op entry and the links that
    // referenced it, and reopen the result in a fresh editor instance.
    const originalProject = JSON.parse(await readFile(reloadPatchPath, 'utf8'))
    const removedProgramIds = new Set(
      originalProject.ops
        .filter((op) => op.objName === 'Ops.Extension.Noisemaker.Program')
        .map((op) => op.id),
    )
    const reducedProject = {
      ...originalProject,
      ops: originalProject.ops.filter((op) => !removedProgramIds.has(op.id)),
    }
    for (const op of reducedProject.ops) {
      for (const portsKey of ['portsIn', 'portsOut']) {
        for (const port of op[portsKey] ?? []) {
          for (const linkKey of ['links']) {
            if (Array.isArray(port[linkKey])) {
              port[linkKey] = port[linkKey].filter((link) =>
                !removedProgramIds.has(link.objIn) && !removedProgramIds.has(link.objOut))
            }
          }
        }
      }
    }
    await writeFile(reloadPatchPath, `${JSON.stringify(reducedProject, null, 2)}\n`)
  } finally {
    if (instance.browser) await instance.browser.close().catch(() => {})
    await stopChild(instance.child)
    await removeTemporaryDirectory(instance.profile)
  }

  console.error('[smoke] booting reduced instance')
  const reducedInstance = await bootProjectInstance(reloadPatchPath, reloadCdpPort + 1)
  let savedProjectRemoval
  try {
    const reducedState = await waitFor(() => reducedInstance.frame.evaluate(() => {
      const mainLoop = gui.corePatch().getOpsByObjName('Ops.Gl.MainLoop_v2').length
      if (mainLoop !== 1) return null
      return {
        noisemakerOps: gui.corePatch().getOpsByObjName('Ops.Extension.Noisemaker.Program').length,
        mainLoop,
      }
    }), 'reduced saved project did not load its remaining ops')
    assert.equal(reducedState.noisemakerOps, 0, 'reduced saved project still contains the Noisemaker op')
    assert.equal(reducedState.mainLoop, 1, 'reduced saved project lost its other ops')
    const reducedTerminalErrors = reducedInstance.terminalLines.filter((line) =>
      /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i.test(line))
    assert.deepEqual(reducedTerminalErrors, [], 'the reduced saved project logged errors on reload')
    savedProjectRemoval = { noisemakerOps: reducedState.noisemakerOps, mainLoop: reducedState.mainLoop, opCount: reducedState.opCount }
  } finally {
    if (reducedInstance.browser) await reducedInstance.browser.close().catch(() => {})
    await stopChild(reducedInstance.child)
    await removeTemporaryDirectory(reducedInstance.profile)
  }

  // Saved-project upgrade: a project saved against an older parameter surface
  // (deprecated parameter aliases) must still load and render through the
  // current op.
  const upgradePatchPath = join(reloadProjectDirectory, 'noisemaker-program-legacy-parameters.cables')
  const upgradedProject = JSON.parse(await readFile(patchPath, 'utf8'))
  const legacyDsl = 'search classicNoisedeck\ncellNoise(cellSmooth: 20, cellVariation: 50, loopAmp: 2).write(o0)\nrender(o0)'
  for (const op of upgradedProject.ops) {
    if (op.objName === 'Ops.Extension.Noisemaker.Program') {
      const dslPort = op.portsIn.find((port) => port.name === 'DSL')
      dslPort.value = legacyDsl
    }
  }
  await writeFile(upgradePatchPath, `${JSON.stringify(upgradedProject, null, 2)}\n`)
  console.error('[smoke] booting legacy-parameter instance')
  const upgradeInstance = await bootProjectInstance(upgradePatchPath, reloadCdpPort + 2)
  let savedProjectUpgrade
  try {
    const upgradedState = await waitFor(async () => {
      const state = await upgradeInstance.readProgramState()
      return state?.ready && state.texture && state.error === '' ? state : null
    }, 'legacy-parameter saved project did not render through the current op')
    assert.match(upgradedState.dsl, /cellSmooth:/)
    const upgradeTerminalErrors = upgradeInstance.terminalLines.filter((line) =>
      /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i.test(line))
    assert.deepEqual(upgradeTerminalErrors, [], 'the legacy-parameter saved project logged errors on reload')
    savedProjectUpgrade = {
      ready: upgradedState.ready,
      rendered: upgradedState.texture,
      size: { height: upgradedState.height, width: upgradedState.width },
    }
  } finally {
    if (upgradeInstance.browser) await upgradeInstance.browser.close().catch(() => {})
    await stopChild(upgradeInstance.child)
    await removeTemporaryDirectory(upgradeInstance.profile)
  }
  console.error('[smoke] removing reload tree')
  await removeTemporaryDirectory(reloadRoot)

  console.error('[smoke] screenshot')
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
    keyboardFocus,
    mediaProbe,
    pageErrors,
    pixels: {
      animated: { first: firstPixels, second: secondPixels },
      invalidRetainedHash: retainedPixels.hash,
      solid: solidPixels,
    },
    recreated,
    resize,
    savedProjectRemoval,
    savedProjectReload,
    savedProjectUpgrade,
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
