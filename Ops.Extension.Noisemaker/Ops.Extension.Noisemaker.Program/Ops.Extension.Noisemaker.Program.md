# Noisemaker Program

Runs a complete Noisemaker Polymorphic program inside the current Cables WebGL2
context and publishes the latest successful frame as a stable Cables texture.

Connect a trigger to **Render**. The op updates **Texture**, **Ready**, and
**Error** before firing **Next**. Program edits compile asynchronously; an
invalid edit leaves the last successfully compiled program and texture active.

**Size** defaults to **Canvas**, using the current Cables canvas dimensions.
Choose **Manual** to use **Width** and **Height**. **Time** is passed to the
Noisemaker pipeline unchanged. **Reset** rebuilds the active program and clears
feedback or simulation state.

The optional **Input Texture** is bound without copying to every `media()` step
in the program. Disconnecting or replacing it never deletes the Cables-owned
input texture.

The default DSL produces a deterministic noise image. A complete program names
its output and render surface, for example:

```text
search synth
noise(seed: 1, scaleX: 50, scaleY: 50).write(o0)
render(o0)
```
