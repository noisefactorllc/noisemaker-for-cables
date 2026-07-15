# Architecture

Noisemaker for Cables is a thin same-context adapter. It bundles the pinned
Noisemaker compiler, Pipeline, WebGL2 backend, GLSL, effect registry, and full
Polymorphic DSL. Cables supplies the existing WebGL2 context and receives a
stable CGL texture; there is no shader translation, second canvas, or CPU
readback bridge.

The Program op follows this frame path:

```text
Polymorphic DSL -> reference compileGraph -> reference Pipeline
                -> Cables WebGL2 backend -> GPU texture copy
                -> stable CGL.Texture -> ordinary downstream Cables ops
```

The backend records the texture selected by Noisemaker's final `present()` and
copies it on the GPU into one Cables-owned RGBA16F output. Internal ping-pong
textures may change identity without invalidating downstream Cables references.
An optional input CGL texture is registered as a non-owning external texture;
Noisemaker never deletes it.

Every compile, allocation, resize, render, copy, reset, and teardown operation
is bracketed by a full WebGL state guard. Raw bindings, indexed buffers,
framebuffers, texture units, samplers, blend/depth/stencil/raster state,
pixel-store settings, and CGL's program and mesh caches are restored or
invalidated coherently. Unsupported CGL cache layouts fail closed.

The controller serializes GPU work, uses generation and context-epoch tokens,
and promotes candidates transactionally. The old pipeline remains active while
a new DSL graph compiles. Failed edits and failed output replacement preserve
the last-good graph and texture. Disposal retains failed cleanup handles for a
later retry rather than silently losing owned GPU resources.

The browser bundle is the installed boundary. The small native op wrapper asks
that facade to create a controller and install the exact Cables port contract.
All 210 effects are statically imported and registered once through a
retry-safe readiness gate.

The product and package use the Noisemaker for Cables name. The installed
`Ops.Extension.Noisemaker.Program` namespace, `NoisemakerCablesGL` browser
global, and `lib_noisemaker-cablesgl.js` dependency filename remain stable so
saved Cables patches do not require migration.
