import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import test from 'node:test'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'vendor-cache/effects/filter/feedback.js'), 'utf8')
const between = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end))
const glsl = between(source, 'vec3 hsv2rgb(', 'vec3 rgb2hsv(')
const wgsl = between(source, 'fn hsv2rgb(', 'fn rgb2hsv(')

test('filter/feedback glsl hsv2rgb takes every hue from 5/6 up, 1.0 included', () => {
  assert.match(glsl, /float h = fract\(hsv\.x\);/,
      'hsv2rgb must wrap the hue with fract()')
  assert.doesNotMatch(glsl, /h < 1\.0\)/,
      'the last sector must not leave h = 1.0 out')
  assert.match(glsl, /\} else \{\n(?:\s*\/\/[^\n]*\n)*\s*rgb = vec3\(c, 0\.0, x\);\n\s*\}\n\n\s*return rgb/,
      'the last sector must take every hue the earlier sectors leave')
})

test('filter/feedback wgsl hsv2rgb takes every hue the earlier sectors leave', () => {
  assert.match(wgsl, /\} else \{\n\s*rgb = vec3<f32>\(c, 0\.0, x\);\n\s*\}\n\n\s*return rgb/,
      'the last sector must take every hue the earlier sectors leave')
})
