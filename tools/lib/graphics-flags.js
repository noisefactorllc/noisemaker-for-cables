// Chromium graphics switches for the Cables Standalone editor in the
// standalone smoke.
//
// The Linux CI container and GitHub's Intel macOS runners expose no usable
// GPU; without a software GL path the editor's WebGL context creation returns
// null and the renderer fails with "Cannot read properties of null (reading
// 'createBuffer')". They render through SwiftShader.
//
// Apple-silicon macOS renders on its Apple GPU through ANGLE Metal, the path
// its users run, in CI and outside it. GitHub's macos-15 arm64 runner exposes a
// virtual Apple GPU, and Standalone 0.11.0 (Electron 31) cannot create a WebGL
// context on SwiftShader there ("ContextResult::kFatalFailure: Failed to create
// context", export-kit run 37839626613). A run outside CI on an Apple-silicon
// or Intel Mac renders on the host GPU.
export function graphicsFlags ({ platform = process.platform, arch = process.arch, ci = Boolean(process.env.CI) } = {}) {
  if (platform === 'linux') {
    return ['--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      // The container's /dev/shm is 64 MiB; additional editor instances
      // crash their renderers without this flag.
      '--disable-dev-shm-usage']
  }
  if (platform === 'darwin' && ci && arch !== 'arm64') {
    return ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  }
  return []
}
