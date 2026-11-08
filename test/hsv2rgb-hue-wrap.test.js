import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import test from 'node:test'
import assert from 'node:assert/strict'

// hsv2rgb must wrap the hue. fract() returns 1.0 for a hue just below a whole
// number, and these conversions took their last sector only below 1.0 and gave
// black above it. Mesa folds hsv2rgb's fract() into a fract() that wraps the
// hue before the call, so there a hue shift just below zero rendered saturated
// red as black. ANGLE and Dawn keep both calls, so a render cannot show it;
// the contract pins that each conversion wraps with fract() and that its last
// sector takes every hue from 5/6 up, 1.0 included, mirroring the upstream
// test_glsl_mod_parity.mjs hueWrapSources table. filter/feedback has its own
// contract in test/feedback-hue-wrap.test.js.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const hueWrapSources = {
  'classicNoisedeck/bitEffects': ['glsl', 'wgsl'],
  'classicNoisedeck/caustic': ['glsl', 'wgsl'],
  'classicNoisedeck/cellNoise': ['glsl', 'wgsl'],
  'classicNoisedeck/cellRefract': ['glsl'],
  'classicNoisedeck/coalesce': ['glsl'],
  'classicNoisedeck/colorLab': ['glsl'],
  'classicNoisedeck/composite': ['glsl'],
  'classicNoisedeck/effects': ['glsl', 'wgsl'],
  'classicNoisedeck/fractal': ['glsl', 'wgsl'],
  'classicNoisedeck/kaleido': ['glsl'],
  'classicNoisedeck/lensDistortion': ['glsl'],
  'classicNoisedeck/moodscape': ['glsl', 'wgsl'],
  'classicNoisedeck/noise': ['glsl'],
  'classicNoisedeck/noise3d': ['glsl'],
  'classicNoisedeck/shapeMixer': ['glsl'],
  'classicNoisedeck/shapes': ['glsl', 'wgsl'],
  'classicNoisedeck/shapes3d': ['glsl', 'wgsl'],
  'filter/prismaticAberration': ['glsl'],
}

function hsv2rgbSource(source, file, language) {
  const start = source.search(
    language === 'glsl' ? /^vec3 hsv2rgb\(/m : /^fn hsv2rgb\(/m,
  )
  assert.ok(start >= 0, `${file} has no hsv2rgb`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1)
  }
  throw new Error(`${file} hsv2rgb has no closing brace`)
}

for (const [effect, languages] of Object.entries(hueWrapSources)) {
  const source = readFileSync(
    join(root, 'vendor-cache/effects', `${effect}.js`),
    'utf8',
  )
  for (const language of languages) {
    const file = `${effect} (${language})`
    const body = hsv2rgbSource(source, file, language)

    if (language === 'glsl') {
      test(`${effect} glsl hsv2rgb wraps the hue and takes every hue from 5/6 up, 1.0 included`, () => {
        assert.match(
          body,
          /float h = fract\(hsv\.x\);/,
          'hsv2rgb must wrap the hue with fract()',
        )
        assert.doesNotMatch(
          body,
          /h < 1\.0\)/,
          'the last sector must not leave h = 1.0 out',
        )
        assert.match(
          body,
          /else \{\s*rgb = vec3\(c, 0\.0, x\);\s*\}\s*return rgb/,
          'the last sector must take every hue the earlier sectors leave',
        )
      })
    } else {
      test(`${effect} wgsl hsv2rgb takes every hue the earlier sectors leave`, () => {
        assert.match(
          body,
          /else \{\s*rgb = vec3(?:<f32>|f)?\(c, 0\.0, x\);\s*\}\s*return rgb/,
          'the last sector must take every hue the earlier sectors leave',
        )
      })
    }
  }
}
