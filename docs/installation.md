# Installation and op contract

## Cables Standalone 0.11.0

Keep the package directory intact. In Cables Standalone, add
`Ops.Extension.Noisemaker` as a project op directory, or keep the shipped
example beside it and open `examples/noisemaker-program.cables`. The example
contains this portable relative setting:

```json
{
  "dirs": {
    "ops": ["../Ops.Extension.Noisemaker"]
  }
}
```

Cables loads `lib_noisemaker-cablesgl.js` as an op-local dependency. The bundle
is self-contained and does not fetch shader code at runtime.

From a source checkout, point `CABLES_APP` at the Standalone executable and run
`npm run test:standalone` for a local release check. The development harness is
not included in the portable 15-file archive. It opens the committed patch in
the real Electron editor, attaches over CDP, exercises edits, media, resize,
reset, and delete/recreate, and writes its ignored evidence under
`test-report/`.

## Inputs

- **Render** renders one frame. A Cables main-loop trigger is the normal source.
- **DSL** is a complete multiline Polymorphic program.
- **Input Texture** supplies the same optional CGL texture to every `media()`
  step without CPU transfer.
- **Size** chooses **Canvas** or **Manual** dimensions.
- **Width** and **Height** apply in Manual mode and are clamped to GPU limits.
- **Time** is passed unchanged to the Noisemaker pipeline.
- **Reset** rebuilds the current program and clears feedback or simulation
  state.

## Outputs

- **Texture** is a stable Cables-owned RGBA16F texture containing the last
  successful frame.
- **Next** fires after a successful asynchronous render and host-state restore.
- **Ready** is true while a usable compiled pipeline exists.
- **Error** is empty on success or contains the current capability, compile,
  allocation, render, context, or disposal error.

DSL compilation is transactional. A new valid graph replaces the active graph
only after initialization succeeds. An invalid edit updates **Error** but keeps
the last-good pipeline and pixels available. Reset and context restoration use
the same guarded lifecycle.

## Polymorphic DSL

The adapter runs the complete reference DSL rather than a reduced Cables
syntax. Named arguments, surface reads and writes, named subchains, feedback,
points and agents, simulations, volumes, cubemaps, remapping UBOs, meshes, and
all locked effect namespaces remain available.

```text
search synth, filter, mixer

noise(seed: 7, ridges: true)
  .subchain(name: "detail stack", id: "detail-v1") {
    .blur()
    .sharpen()
  }
  .write(o0)

gradient()
  .blendMode(tex: read(o0))
  .write(o1)

render(o1)
```

## Requirements and v1 boundaries

The op requires CGL with WebGL2, `EXT_color_buffer_float`,
`OES_texture_float_linear`, `EXT_float_blend` for the complete catalog, and the
pinned CGL program and mesh cache shape. Minimum limits are 4096 for maximum
texture size, 4 draw buffers, 9 fragment texture units, a 16,384-byte uniform
block, and 8 uniform-buffer bindings. Unsupported capabilities fail before
**Ready**.

Version 1 targets Cables CGL/WebGL2 and Standalone 0.11.0. Cables CGP/WebGPU,
generated one-op-per-effect authoring nodes, multiple independent media input
ports, and a second offscreen rendering context are not included.
