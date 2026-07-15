# @noisefactor/noisemaker-cablesgl

`@noisefactor/noisemaker-cablesgl` is a WebGL2 adapter for running Noisemaker's
Polymorphic programs in Cables GL without a second rendering context or CPU
readback.

The first release exposes one native Cables op:
`Ops.Extension.Noisemaker.Program`. Generated per-effect ops are outside the
initial package scope.

The bundle contains the pinned reference Noisemaker compiler, engine, GLSL, and
all 210 locked effects. It accepts complete Polymorphic programs, including
multi-pass graphs, feedback, points, simulations, 3D volumes, cubemaps, UBO
remapping, and media input.

- [Install the op in Cables Standalone](docs/installation.md)
- [Open the example patch](examples/README.md)
- [Read the runtime architecture](docs/architecture.md)
- [Update the pinned effect catalog](docs/catalog-update.md)
