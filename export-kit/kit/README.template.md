# {{NM_PROGRAM_NAME}}

Your program as a cables patch, exported from Noisedeck. It runs on
`Ops.Extension.Noisemaker.Program`, a native cables op that hosts the whole Noisemaker engine inside
the patch's own WebGL2 context. It fetches nothing at runtime.

There are two ways to run it, and this export carries everything both of them need.

## Run it in a browser

`standalone/` is a complete cables player with your patch already in it. Browsers refuse to load a
player over `file://`, so serve the folder:

```
cd standalone
python3 -m http.server 8000
```

Open <http://localhost:8000/>. No backend, no build step, no npm.

## Open it in Cables Standalone

Tested with Cables Standalone 0.11.0.

1. Open `patch/program.cables`.
2. Add the `extension/` folder from this export as a project op directory (Settings, then op
   directories), and reload the patch.
3. `Ops.Extension.Noisemaker.Program` comes up with your program in its **DSL** port, and the
   preview starts once **Ready** goes true.

Step 2 is not optional. The op is not published to the cables op registry, so a patch that cannot
see `extension/` opens with the Noisemaker op missing.

## What's inside

| Path | What it is |
| --- | --- |
| `standalone/` | The player: the cables runtime, the op, and your patch at `js/program.json`. |
| `patch/program.cables` | Your patch, for the Cables Standalone editor. |
| `patch/example.cables` | The upstream example patch, untouched, showing how the op is wired. |
| `extension/` | The op, plus `lib_noisemaker-cablesgl.js`, the engine bundle it loads. Add this as a project op directory. |
| `program.dsl` | Your program's source, exactly as Noisedeck had it. |
| `noisedeck-export.json` | What was exported, when, against which engine build. |
| `shaders/` | The GLSL behind each effect you used. Present if you kept **include shader code** checked. Shaders you edited in the app ship beside them as `<program>.edited.<ext>` reference copies. |
| `LICENSES/` | Licenses for everything shipped here. |

The two patches hold the same program wired two ways. The editor patch previews through
`Ops.Ui.VizTexture`, which only draws inside cables itself, so the player patch draws to a
fullscreen rectangle instead. The player's browser tab reads `{{NM_PROGRAM_NAME}} · noisemaker`, and
its `<meta itemprop="name">` carries the same name. Neither affects what runs.

## The engine

**include engine code** is locked on here. The op is the engine, so the runtime always ships, in
`extension/`, however you set that checkbox for the other platforms. There is no unchecked state.

This export targets Noisemaker `{{NM_ENGINE_VERSION}}`. That version governs the shader sources
under `shaders/` and the build recorded in `noisedeck-export.json`.

What actually renders the patch is `lib_noisemaker-cablesgl.js`, the engine bundle inside the op. It
carries no version marker of its own; it is pinned by the revision this kit was built from, recorded
as `kitSha` in `noisedeck-export.json`. So the two can differ by a build, and the patch may not
match the app pixel for pixel. Both are pinned deliberately: whichever way they sit today, the
export keeps rendering the same way after the engine moves on.

## Editing the program

In the editor the program is the Program op's **DSL** port. Edits recompile as you type, and
compilation is transactional: an invalid program fills the **Error** port and leaves the last good
pipeline rendering, so the canvas never goes black while you work.

In the player the program is `standalone/js/program.json`. Find the op whose `objName` is
`Ops.Extension.Noisemaker.Program` and edit the `DSL` entry of its `portsIn` array.

The other ports worth knowing: **Render** takes a per-frame trigger, **Time** takes a clock,
**Size** switches between the cables canvas and manual **Width** and **Height**, **Input Texture**
feeds one cables texture to every `media()` step in your program, and **Reset** clears feedback and
simulation state.

## Effects used by this program

{{NM_EFFECT_LIST}}

## Requirements

The op needs WebGL2 with `EXT_color_buffer_float`, `OES_texture_float_linear` and `EXT_float_blend`
for the complete effect catalog, which current desktop browsers and Cables Standalone 0.11.0 both
provide. Hardware that falls short fails before **Ready** goes true and says why in **Error**.
cables CGP (WebGPU) is not a target of this op.

## License

The Noisemaker engine and the cables op are MIT licensed; see `LICENSES/`. `standalone/LICENCE` is
the cables player's own license, shipped with the runtime it covers. Your program and the imagery it
renders are yours.
