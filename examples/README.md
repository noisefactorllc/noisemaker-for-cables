# Noisemaker for Cables example patch

Open `noisemaker-program.cables` in Cables Standalone 0.11.0. Its project-local
op directory points to the sibling `Ops.Extension.Noisemaker` directory, so no
global installation or published package is required.

The patch connects `Ops.Gl.MainLoop_v2` to the Program **Render** input,
`Ops.Anim.Timer_v2` to **Time**, and **Texture** to the ordinary
`Ops.Ui.VizTexture` display/pass-through op. The animated noise appears in the
VizTexture preview once the Program op reports **Ready**. The output is also a
normal CGL texture, so it can feed any compatible Cables texture, shader, or
display chain. Use **Next** for work that specifically needs to follow
completion of the current Noisemaker frame.

To test transactional editing, replace the DSL with this deliberately invalid
program:

```text
search synth

thisEffectDoesNotExist()
  .write(o0)

render(o0)
```

The **Error** port and op UI should report the compile error while the prior
valid program keeps rendering. Restore the example DSL to hot-swap back to a
valid graph.

For media, connect any ordinary Cables texture to **Input Texture** and use:

```text
search synth, classicNoisedeck

media()
  .kaleido()
  .write(o0)

render(o0)
```

Every `media()` step receives that one input texture without a CPU readback or
copy.
