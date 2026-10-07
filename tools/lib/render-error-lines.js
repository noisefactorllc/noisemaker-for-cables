// Classifies editor terminal, console, and page messages for the standalone
// smoke. A matching line is a render or promise error that fails the smoke.
//
// Chromium forwards GL debug output as
// `GL Driver Message (<source>, <type>, <id>, <severity>): <text>`. On a
// physical GPU the driver reports performance notices such as
// `GPU stall due to ReadPixels`; those are advice, not errors, so a driver
// message whose type is Performance does not count. Driver messages of any
// other type, and every other WebGL or GL error, still do.

const RENDER_ERROR_PATTERN = /webgl|gl_invalid|\bgl error\b|unhandled|uncaught.*promise|promise rejection/i
const DRIVER_PERFORMANCE_NOTICE = /GL Driver Message \([^,()]*,\s*Performance\s*,[^()]*\)/i

export function isRenderErrorLine(line) {
  const text = String(line)
  return RENDER_ERROR_PATTERN.test(text) && !DRIVER_PERFORMANCE_NOTICE.test(text)
}

export function renderErrorLines(lines) {
  return lines.filter(isRenderErrorLine)
}
