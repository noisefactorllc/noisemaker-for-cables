import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

// Contract guard ported from upstream Noisemaker's
// shaders/tests/test_contract_frame_lifetime.mjs (a3d96b66): the engine's
// texture and frame-lifetime semantics were corrected and pinned there
// against shaders/src; this repo vendors the compiled engine instead, so the
// same four statements are pinned to the vendored core's source. A vendor
// refresh that reverts any of them turns the unit suite red instead of
// waiting for an audit.
//
//   1. Graph feedback surfaces and surfaces whose global texture spec sets
//      persistent: true keep their final frame-local bindings across skipped
//      writes; frame-local scratch still swaps.
//   2. A mipmapped persistent source takes the fullscreen resample path on
//      WebGPU resize even when dimensions match.
//   3. WebGPU uploads willReadFrequently 2D canvases from getImageData
//      through queue.writeTexture so both backends sample the same bytes.
//   4. WebGPU resolves a sampler per binding from the sampled 3D texture's
//      authored filter, defaulting to linear instead of the historical
//      nearest.

const core = readFileSync(
  new URL('../vendor-cache/noisemaker-shaders-core.esm.js', import.meta.url),
  'utf8',
)

test('feedback and persistent surfaces keep final bindings across skipped writes', () => {
  // The feedback set is reads-before-write intersected with writes.
  assert.match(core, /const readBeforeWriteSurfaces = /)
  assert.match(
    core,
    /\[\.\.\.readBeforeWriteSurfaces\]\.filter\(\(name\) => writtenSurfaces\.has\(name\)\)/,
  )
  // swapBuffers persists state surfaces, feedback surfaces, and explicitly
  // persistent globals.
  assert.match(
    core,
    /isStateSurface\(name\) \|\| this\._feedbackSurfaces\?\.has\(name\) \|\| this\.graph\?\.textures\?\.get\?\.\(`global_\$\{name\}`\)\?\.persistent === true/,
  )
})

test('a mipmapped persistent source resamples on WebGPU resize even at matching dimensions', () => {
  assert.match(
    core,
    /A mipmapped source is copied through the WebGPU resample\s*\n\s*\/\/ path even when this temporary has the same dimensions\./,
  )
  // The temporary must be renderable for the resample pass.
  assert.match(core, /usage: \["render", "sample", "copySrc", "copyDst"\]/)
  assert.match(
    core,
    /srcTex\.width !== dstTex\.width \|\| srcTex\.height !== dstTex\.height \|\| srcTex\.mipLevels > 1 \|\| dstTex\.mipLevels > 1/,
    'vendored core copyTexture no longer routes mipmapped sources to the resample pass',
  )
})

test('WebGPU uploads willReadFrequently canvases from getImageData', () => {
  // The getImageData upload is gated on willReadFrequently...
  assert.match(
    core,
    /getContextAttributes\?\.\(\)\.willReadFrequently/,
  )
})

test('unauthored 3D sampling uses the linear default on WebGPU', () => {
  // The 3D texture record defaults to linear, matching WebGL2.
  assert.match(core, /filter: spec\.filter \|\| "linear"/)
  // The render and compute sampler paths both infer from the 3D record.
  assert.match(
    core,
    /sampledTexture\?\.is3D \? sampledTexture\.filter === "nearest" \? "nearest" : "default" : inputSamplerDefault/,
    'vendored core render-path sampler resolution no longer follows the 3D texture filter',
  )
  assert.match(
    core,
    /texRec\?\.is3D \? texRec\.filter === "linear" \? "default" : "nearest"/,
    'vendored core compute-path sampler resolution no longer follows the 3D texture filter',
  )
})
