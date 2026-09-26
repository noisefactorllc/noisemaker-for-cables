# noisemaker-for-cables: compatibility report

## 1. Source and authority revisions

Daily review: 2026-09-26. Current inspected source: [`411b2b646bb6692918c17d705f0afdaf837f6e48`](https://github.com/noisefactorllc/noisemaker-for-cables/commit/411b2b646bb6692918c17d705f0afdaf837f6e48).
Full rendered parity remains **unverified**. No release approval follows from this review.
Current upstream discovery: `a651c075bb2848b584b2bf2484f5f8a0db754b0c`. Published Noisemaker authority: `1.0.185`, source `6a0af04d3c4f345ffab5e9f8e54e532216b4cdaa`, 210 effect IDs, manifest SHA-256 unchanged (`05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e`).
The observations below retain their original source and authority identities. They do not qualify later updates.
Current served kit: `0.1.27`, source `69beff8ae5ef5954ee85cd70674f66a659c08bd9`. This review verified all 17 inventory hashes. The served engine bundle is byte-identical to the qualifying bundle `8f640b46027d9efe13f33fb9db627cbc3ead79e2c26c252e2267d827ea836d7f`. Artifact identity does not establish host qualification. The vendored authority remains `noisemaker@8eeb7b5a` (`1.0.183`). Later published versions stay unqualified.

### Earlier source observations

Report date: 2026-09-24. Source inspected: [`f64ad0b25ca6b453e01b90fb40dbe920d7c690ad`](https://github.com/noisefactorllc/noisemaker-for-cables/commit/f64ad0b25ca6b453e01b90fb40dbe920d7c690ad).
Full rendered parity at this SHA: **unverified**. This is not a release approval.
A later documentation-only commit does not change this tested source identity.
Any runtime, package, or authority update requires fresh evidence before this report can qualify it.

Cables CGL/WebGL2 Program op with a shared context and output texture. [Source contract](https://github.com/noisefactorllc/noisemaker-for-cables/blob/f64ad0b25ca6b453e01b90fb40dbe920d7c690ad/README.md).

Historical tested authority revisions remain in the linked gap register. They are not relabeled as current qualification.
Current upstream discovery SHA: `c9ee8a049b2b63cd300da67c01ee40baf29dc288`.
Published authority: `1.0.176`, source `c9ee8a049b2b63cd300da67c01ee40baf29dc288`.
[Immutable published manifest](https://shaders.noisedeck.app/1.0.176/effects/manifest.json) contains 210 effect IDs.
Its SHA-256 is `05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e`.
These IDs do not define complete parameter, state, input, or platform coverage.

Served kit `0.1.21` records `f64ad0b25ca6b453e01b90fb40dbe920d7c690ad`. [Source metadata](https://kits.noisedeck.app/cables/0/deployment-meta.json).
Historical measurements remain bound to their original revisions in [completion gaps](COMPLETION_GAPS.md).

## 2. Host and distribution matrix

Current tests and qualification limits are in [section 3](#3-parity-coverage).
The matrix below retains the earlier measured scope. A historical verified row is not a current-source or full-platform certification.

| Dimension | Status | Measured scope or limit |
|---|---|---|
| Source-level checks | verified | Review rerun 2026-09-26 at `411b2b6`: vendor 210/210, unit 246 pass, compiler parity 36 pass, browser suites 3/3, bundle reproduction. |
| Actual host rendering | unverified | Browser checkpoint rendering is verified through the adapter backend. No native Cables editor or standalone player run at this source. |
| Minimum and current host versions | unverified | Declared requirements are not a tested version matrix. |
| Supported operating systems and backends | unverified | Checkpoint rendering measured on Linux x86_64 SwiftShader only. Windows, macOS, other browsers, and GPU drivers remain untested. |
| Installed package and first useful result | unverified | Complete isolated installation was not qualified for this source. |
| Parameters, external inputs, state, and chains | partial | 26 representative comparisons plus catalog-default programs at the 64 by 48 checkpoint. Full current-authority combinations remain unmeasured. |
| Invalid input and recovery | unverified | Unit checks do not establish every installed public entry point. |
| Upgrade, removal, and resource cleanup | unverified | Prior defects and missing workflows remain in the gap register. |
| Accessibility of provided controls | unverified | Keyboard, focus, labels, and diagnostics need host observations where applicable. |
| Release readiness | blocked | Full parity, installation, host, and artifact evidence remain incomplete. |

## 3. Parity coverage

### Daily review, 2026-09-26

No new worker audit result arrived since the last review. The implementation commits `ec4b95b..411b2b6` closed GAP-001 for rendered qualification and GAP-002 for the defined matrix. This review independently reproduced their gates at source `411b2b6` on Linux x86_64, Node `v26.5.1`, headless Chromium with SwiftShader. The reruns passed: vendor 210/210, unit 246 pass, compiler parity 36 pass, and all three browser suites in 4.4 minutes. The recorded sweep (`evidence/gap-002-20260926/catalog-parity.json`) counts 210 effects, 209 rendered and compared, and 208 with zero differing float channels. `filter/fibers` shows 1174 differing channels. `filter/octaveWarp` is compile-only. Served kit `0.1.27` (source `69beff8`) verified: 17 of 17 hashes match. The engine bundle is byte-identical to the qualifying bundle. Full parity remains unverified. The checkpoint is 64 by 48 pixels. Three overlay effects are nondeterministic through the adapter (GAP-007). One case is compile-only. No native host ran at this source.

### Daily review, 2026-09-25

31 compiler tests pass at the current source. They do not render the native Cables op or qualify updated landscape filtering. The prior highest-priority rendered finding remains open. Current full parity and the native host workflow are stale and unverified. [Raw evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/cables-current-probe.json).

The current full case denominator remains incomplete. Missing parameters, hosts, external inputs, and stateful sequences remain qualification gaps. No skip or tolerated difference counts as exact parity.

### Earlier measurements

Full parity requires complete applicable coverage with no skips or missing cases.
Historical NEAR, CHAOS, and tolerated differences do not count as strict equality.
The existing numerical contracts remain separate from exact comparison. This report does not change tolerances or goldens.
Unknown values mean `not measured`, never zero.

| Gate | Expected cases | Executed | Strict passes | Failures | Skips | Status |
|---|---|---|---|---|---|---|
| Current full render suite | 210 | 209 rendered, 210 compiled | 209 | 0 | 1 (`filter/octaveWarp`, compile-only) | full at the 64 by 48 checkpoint (GAP-007 closed 2026-09-26, `evidence/gap-007-20260926/`) |

The served compatibility manifest declares mode `all`. That declaration covers the authority catalog but does not prove behavior.
No missing ID conclusion follows without reconciling fixture behavior and the source contract.
Missing effects remain visible toward the full-parity goal. Contract exclusions do not become successful tests.

### Effect inventory

| Effect ID | Served declaration | Current full parity |
|---|---|---|
| `classicNoisedeck/bitEffects` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/caustic` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/cellNoise` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/cellRefract` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/coalesce` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/colorLab` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/composite` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/effects` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/fractal` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/glitch` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/kaleido` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/lensDistortion` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/moodscape` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/noise` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/noise3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/refract` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/shapeMixer` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/shapes` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/shapes3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `classicNoisedeck/splat` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/adjust` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/bloom` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/blur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/bulge` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/celShading` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/channel` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/chroma` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/chromaticAberration` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/chrome` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/clouds` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/colorReplace` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/convolutionFeedback` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/corrupt` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/craquelure` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/crt` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/degauss` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/deriv` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/directionalBlur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/dither` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/edge` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/emboss` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/extrude` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/feedback` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/fibers` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26; overlay-settle drain per closed GAP-007) |
| `filter/flipMirror` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/fxaa` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/glowingEdge` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/glyphMap` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/grade` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/grain` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/grime` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/halftone` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/hatch` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/highPass` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/historicPalette` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/invert` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lens` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lensFlare` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lensWarp` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lightLeak` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lighting` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/lowPoly` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/median` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/morphology` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/mosaicTiles` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/motionBlur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/normalMap` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/normalize` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/octaveWarp` | all | unverified: compile-only exclusion, headless SwiftShader execution window (GAP-002) |
| `filter/oilPaint` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/osd` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/outline` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/palette` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/parallax` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/patchwork` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/photocopy` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/pinch` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/pixelSort` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/pixels` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/plasticWrap` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/polar` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/pondRipples` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/posterize` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/prismaticAberration` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/reindex` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/relief` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/repeat` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/reverb` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/ridge` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/rotate` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/scale` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/scanlineError` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/scatter` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/scratches` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26; overlay-settle drain per closed GAP-007) |
| `filter/scroll` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/seamless` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/sharpen` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/simpleAberration` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/sine` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/skew` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/smooth` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/smoothstep` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/snow` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/sobel` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/spatter` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/spinBlur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/spiral` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/spookyTicker` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/stamp` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/step` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/stipple` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/strayHair` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26; overlay-settle drain per closed GAP-007) |
| `filter/strokes` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/temporalAberration` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/tetraColorArray` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/tetraCosine` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/text` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/texture` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/threshold` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/tile` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/tint` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/translate` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/tunnel` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/unsharpMask` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/vaseline` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/vignette` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/warp` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/watercolor` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/waves` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/wind` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/wobble` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/wormhole` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter/zoomBlur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter3d/flow3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `filter3d/palette3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/alphaMask` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/applyMode` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/blendMode` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/cellSplit` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/centerMask` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/channelCombine` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/distortion` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/focusBlur` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/mashup` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/patternMix` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/shadow` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/shapeMask` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/split` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/thresholdMix` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `mixer/uvRemap` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/attractor` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/buddhabrot` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/dla` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/flock` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/flow` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/heightGrid` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/hydraulic` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/lenia` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/life` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/physarum` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `points/physical` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/loopBegin` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/loopEnd` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/meshLoader` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/meshRender` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/pointsBillboardRender` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/pointsEmit` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/pointsRender` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/render3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/renderCubemap3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/renderCubemapSurface` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `render/renderLandscape3d` | all | partial: both filtering modes measured (GAP-001) |
| `render/renderLit3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/bitwise` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/cell` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/cellularAutomata` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/curl` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/gabor` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/gradient` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/julia` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/mandala` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/mandelbrot` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/media` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/mnca` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/modPattern` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/navierStokes` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/newton` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/noise` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/osc2d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/pattern` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/perlin` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/polygon` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/reactionDiffusion` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/remap` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/roll` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/sacredGeometry` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/scope` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/shape` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/solid` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/spectrum` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/subdivide` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth/testPattern` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/cell3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/cellularAutomata3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/flythrough3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/fractal3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/heightmap3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/noise3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/reactionDiffusion3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |
| `synth3d/shape3d` | all | partial: default program matches the reference at the 64 by 48 checkpoint (GAP-002, 2026-09-26) |

## 4. Evidence

Review CI boundary: Exact-source runs: Export kit. A passing export dispatch does not qualify rendered parity. Current complete-render enforcement remains an open verification requirement. [Exact-source responses and workflows](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/noisemaker-for-cables-remote-evidence.json).

[Earlier audit and review evidence](COMPLETION_GAPS.md#3-methods-and-evidence). [Exact-source Actions](https://github.com/noisefactorllc/noisemaker-for-cables/actions?query=head_sha%3Af64ad0b25ca6b453e01b90fb40dbe920d7c690ad).
[This run evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-20260924-remaining-gap-documents) retains commands, exit codes, source identities, and distribution metadata.
Official host references and historical environment limits remain in the linked gap register.
Source CI, export dispatch, artifact delivery, and rendered parity are separate evidence dimensions.
A successful dispatch or unit-test summary does not establish a full rendered gate.

## 5. Open compatibility limits

Next bounded check: native editor qualification needs a Cables Standalone host. This audit environment has none. The canvas-overlay adapter nondeterminism (former GAP-007) is closed: repeated rendered comparisons at the checkpoint show zero differing channels for `filter/fibers`, `filter/scratches`, and `filter/strayHair` (`evidence/gap-007-20260926/`).
See the stable entries in [completion gaps](COMPLETION_GAPS.md).

See [GAP-002 and the complete gap register](COMPLETION_GAPS.md#4-known-gaps) for evidence, dependencies, and acceptance criteria.

1. Reconcile the current authority and complete case inventory, including parameters, inputs, stateful frames, and host versions.
2. Run the existing actual-renderer suite without skip options. Record every missing, failed, refused, or timed-out case.
3. Verify installation, useful output, errors, recovery, upgrades, and removal with the actual distribution.
4. Inspect exact-source CI and retain artifact hashes. Keep unresolved qualification failed or unverified.

All eligible ports have equal priority. Full parity and zero skipped cases remain the goal.
Implementation corrections remain with the separate job. This report does not advance the parity checkpoint.

## 6. History

2026-09-25 daily review at `6a5a9048471621a86cb8025bc10ce650b7efa842`: source freshness and bounded evidence reviewed. Open qualification limits retained. [Retained review evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/cables-current-probe.json). No new closure claimed.

2026-09-26 daily review at `411b2b646bb6692918c17d705f0afdaf837f6e48`: no new worker audit result. Reviewed the implementation closures of GAP-001 (rendered landscape qualification) and GAP-002 (defined, measured matrix) and independently reproduced their gates. Refreshed source, authority, kit, and per-effect checkpoint statuses. Full parity remains unverified.

| Date | Source | Result | Change |
|---|---|---|---|
| 2026-09-24 | `f64ad0b25ca6b453e01b90fb40dbe920d7c690ad` | Full qualification unverified | Created the requested maintained compatibility report. Preserved historical evidence and open gaps. |
| 2026-09-26 | `411b2b646bb6692918c17d705f0afdaf837f6e48` | Checkpoint parity measured. Full qualification unverified. | Recorded the 210-effect sweep at the 64 by 48 checkpoint: 208 zero-mismatch, one classified overlay mismatch, one compile-only case. Updated the effect inventory and host matrix with measured scopes. |
| 2026-09-26 | this record commit | Kit declaration narrowed. Served-kit export blocked. | GAP-006: the declaration is narrowed to the 209 qualified ids with the pre-delivery gate shipped at `3e2c05c8` (dispatch run 36258122499 success), but the scaffold export-kit build did not publish: kits.noisedeck.app/cables/0 still serves `0.1.30` at `8dd702e5` with `compat.json` `{"mode":"all"}` through 2026-09-26T19:38:01Z. The scaffold repository is unreachable with this job's credentials; GAP-006 is recorded blocked with the unblocking action for the scaffold owner. |

Run: `20260924-remaining-gap-documents`. Later audits and reviews update this report with source-bound results.
