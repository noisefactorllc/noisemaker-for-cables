import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  compareReadbacks,
  concatenateReadbacks,
  exactReadbacks,
  readFloatTexture,
} from './browser/harness/webgl.js'

function createReadbackGL(values) {
  return {
    COLOR_ATTACHMENT0: 0x8ce0,
    FLOAT: 0x1406,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    NO_ERROR: 0,
    PACK_ALIGNMENT: 0x0d05,
    PACK_ROW_LENGTH: 0x0d02,
    PACK_SKIP_PIXELS: 0x0d04,
    PACK_SKIP_ROWS: 0x0d03,
    PIXEL_PACK_BUFFER: 0x88eb,
    READ_FRAMEBUFFER: 0x8ca8,
    RGBA: 0x1908,
    TEXTURE_2D: 0x0de1,
    bindBuffer() {},
    bindFramebuffer() {},
    checkFramebufferStatus() { return this.FRAMEBUFFER_COMPLETE },
    createFramebuffer() { return {} },
    deleteFramebuffer() {},
    framebufferTexture2D() {},
    getError() { return this.NO_ERROR },
    isContextLost() { return false },
    pixelStorei() {},
    readBuffer() {},
    readPixels(_x, _y, _width, _height, _format, _type, destination) {
      destination.set(values)
    },
  }
}

function readbackFor(value) {
  return readFloatTexture(createReadbackGL([value, 0, 0, 1]), {
    handle: {},
    height: 1,
    width: 1,
  })
}

function legacyRgba8(value) {
  return Math.max(0, Math.min(255, Math.round(value * 255)))
}

const MUTATIONS = Object.freeze([
  {
    adapter: Math.fround(0.25 + 1 / 1024),
    id: 'sub-RGBA8 fractional',
    reference: 0.25,
  },
  {
    adapter: -0.5,
    id: 'negative',
    reference: 0,
  },
  {
    adapter: 2,
    id: 'HDR',
    reference: 1,
  },
])

test('FLOAT readback stays top-down Float32 without clamping negative or HDR channels', () => {
  assert.equal(globalThis.document, undefined, 'the Node harness has no DOM shim')
  const bottomPixel = [-0.5, 2, 0.25, 1]
  const topPixel = [3, -2, 4, 1]

  const readback = readFloatTexture(
    createReadbackGL([...bottomPixel, ...topPixel]),
    { handle: {}, height: 2, width: 1 },
  )

  assert.equal(readback.data instanceof Float32Array, true)
  assert.deepEqual(readback, {
    data: new Float32Array([...topPixel, ...bottomPixel]),
    finite: true,
    height: 2,
    width: 1,
  })
})

test('FLOAT readback rejects non-finite channels', () => {
  assert.throws(
    () => readbackFor(Number.NaN),
    /non-finite float readback at channel 0/,
  )
})

for (const mutation of MUTATIONS) {
  test(`${mutation.id} differences invisible in RGBA8 fail native parity and exact copy`, () => {
    assert.equal(
      legacyRgba8(mutation.reference),
      legacyRgba8(mutation.adapter),
      'the regression mutation must be hidden by the legacy RGBA8 conversion',
    )
    const reference = readbackFor(mutation.reference)
    const adapter = readbackFor(mutation.adapter)

    const comparison = compareReadbacks(mutation.id, reference, adapter, 0)

    assert.equal(comparison.accepted, false)
    assert.equal(comparison.channelCeiling, 0)
    assert.equal(comparison.comparedChannels, 4)
    assert.equal(comparison.mismatchedChannels, 1)
    assert.equal(comparison.firstDivergences.length, 1)
    assert.equal(exactReadbacks(reference, adapter), false)
  })
}

test('concatenation preserves native negative and HDR float channels', () => {
  const concatenated = concatenateReadbacks([
    {
      data: new Float32Array([-0.5, 2, 0.25, 1]),
      finite: true,
      height: 1,
      width: 1,
    },
    {
      data: new Float32Array([4, -3, 0.5, 1]),
      finite: true,
      height: 1,
      width: 1,
    },
  ])

  assert.equal(concatenated.data instanceof Float32Array, true)
  assert.deepEqual(
    concatenated.data,
    new Float32Array([-0.5, 2, 0.25, 1, 4, -3, 0.5, 1]),
  )
})

test('exact readback comparison uses raw Float32 bits for signed zero and NaN payloads', () => {
  const fromBits = (bits) => ({
    data: new Float32Array(new Uint32Array(bits).buffer),
    finite: false,
    height: 1,
    width: 1,
  })
  const positiveZero = fromBits([0x00000000, 0, 0, 0x3f800000])
  const negativeZero = fromBits([0x80000000, 0, 0, 0x3f800000])
  const nanPayloadA = fromBits([0x7fc00001, 0, 0, 0x3f800000])
  const sameNanPayload = fromBits([0x7fc00001, 0, 0, 0x3f800000])
  const nanPayloadB = fromBits([0x7fc00002, 0, 0, 0x3f800000])

  assert.equal(exactReadbacks(positiveZero, negativeZero), false)
  assert.equal(exactReadbacks(nanPayloadA, sameNanPayload), true)
  assert.equal(exactReadbacks(nanPayloadA, nanPayloadB), false)
})
