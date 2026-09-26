# noisemaker-for-cables: completion gaps

Current compatibility matrix: [compatibility report](COMPATIBILITY.md).

## 1. Scope and source revisions

Core sync review: 2026-09-26. Current inspected source: [`9534c5701cac86095fdcac6edf2ef800a1153897`](https://github.com/noisefactorllc/noisemaker-for-cables/commit/9534c5701cac86095fdcac6edf2ef800a1153897).
The catalog matrix was re-verified by execution at this source (see the core sync review below). Full-parameter parity, native host qualification, and release acceptance remain open.
Current upstream discovery: `a651c075bb2848b584b2bf2484f5f8a0db754b0c`. Published Noisemaker authority: `1.0.185`, source `6a0af04d3c4f345ffab5e9f8e54e532216b4cdaa`, 210 effect IDs. The effect-manifest SHA-256 `05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e` is unchanged through `1.0.185`.
The observations below retain their original source and authority identities. They do not qualify later updates.
Current served kit: `0.1.28`, source `9534c5701cac86095fdcac6edf2ef800a1153897`. This review verified all 17 inventory hashes 2026-09-26. The served engine bundle `d44c32e4a6a1ee28c2b96170cc26aed6a21e7765ef9902b4125d04c8c153fade` (4134801 bytes) is byte-identical to the committed op bundle built from the refreshed core. The vendored engine authority is now `noisemaker@6a0af04d3c4f` (`1.0.185`, core `8b9f9eee0cffdb88e96907d32eb8d73128cca6ccdbaefb47b5eb026b894a8469`, header `Build: 6a0af04d`), following the core sync at `332e86b`. The earlier `8eeb7b5a` (`1.0.183`) qualification statements retain their original source identities; the `6a0af04d` authority is qualified by the executed checks below, not inherited.

### Earlier source observations

Audit date: 2026-09-22. Run: `20260922-cables-03`.

| Item | Revision |
| --- | --- |
| Reviewed repository | `0d860724f5305b854c6ffa64aed3de701157d2da` |
| Bundled Noisemaker authority | `643b2be1e28b62e3282a4009c2ea65c583ed6ccc` |
| Current Noisemaker authority | `ae4e3302e2d379450ad56745da5be506b329f84d`, published runtime `1.0.168` |
| Published Cables kit | `0.1.18`, source equals the reviewed repository SHA |
| Package metadata | `@noisefactor/noisemaker-for-cables`, `0.1.0`, private package |
| Intended host | Cables CGL/WebGL2 and Cables Standalone `0.11.0` |

The contract is one native Program op with a shared WebGL2 context and a stable CGL output texture.
The op accepts Polymorphic programs and one external texture for all media steps.
CGP/WebGPU and generated per-effect ops remain outside scope.

This audit does not declare port completion or release readiness.
It preserves the current parity checkpoint.
Implementation, additional effect ports, and authority updates belong to the separate implementation job.
Only this document and its README link form the audit publication.
These paths trigger no workflow in the reviewed repository.
The shared audit state records the publication commit and remote checks.

Review date: 2026-09-23. Current source: `a911c39a69c78ec13606019eeacdf7b680468872`.
Current kit `0.1.19` records that source. Earlier measurements retain their original source and date.
The current bundle incorporates landscape filtering after the worker audit.

Live upstream at review: `532ed64775000635e43caac085e4451c06e71afc`. Published runtime: `1.0.169` at `44bc4ed4ac729bddaa95b083d64bee942ade35da`.
The review does not qualify every upstream change after the recorded port authority.

## 2. Completion claims

| Claim ID | Claim source | Claimed scope | Finding | Evidence |
| --- | --- | --- | --- | --- |
| CLAIM-001 | README.md and docs/architecture.md | Complete locked effect catalog | supported | The lock verifies 210 effects and 212 artifacts. Both current and pinned manifests contain 210 IDs. |
| CLAIM-002 | README.md | Pixel-level parity and complete programs | partial | The 2026-09-26 sweep rendered 209 of 210 effects at 64 by 48. 208 matched the reference with zero differing channels. One overlay effect mismatched. One case is compile-only. Full-parameter parity remains incomplete. |
| CLAIM-003 | docs/installation.md | Native editor installation, media, resize, reset, and recovery | supported | The retry passes on macOS arm64 with Standalone 0.11.0, and the full editor smoke (media, resize, recovery, reset, recreation, keyboard focus, saved-project reload) passes on Linux x64 with Standalone 0.11.3 on 2026-09-26 (`evidence/gap-003-20260926/`). The first welcome-dialog timeout remains recorded. Windows, macOS Intel, and physical-GPU hosts remain untested. See GAP-003 for limits. |
| CLAIM-004 | docs/installation.md and export README template | Last-good rendering and recovery | supported | The player preserves rejected-edit pixels. Recovery renders the replacement color. |
| CLAIM-005 | examples/README.md and Error port documentation | Useful error reporting | partial | The user sees a generic compile failure. The compiler's diagnostic does not reach that message. See GAP-004. |
| CLAIM-006 | Project-local op directory and self-contained bundle | Ecosystem fit | partial | The directory layout follows official Cables guidance. Isolated package installation succeeds. The declared editor passes on macOS arm64 (Standalone 0.11.0) and Linux x64 (Standalone 0.11.3, including a project-local op-directory reload from a copied project tree). |
| CLAIM-007 | Export-kit workflow and published kit | Release readiness | partial | Kit `0.1.27` at source `69beff8ae5ef5954ee85cd70674f66a659c08bd9`: all 17 inventory hashes verified 2026-09-26. Exact-source export dispatch succeeded at that source. It does not execute the repository's runtime or host suites. See GAP-005. |

## 3. Methods and evidence

Review CI boundary: Exact-source runs: Export kit. The latest export dispatch ([run 36222300492](https://github.com/noisefactorllc/noisemaker-for-cables/actions/runs/36222300492)) succeeded at head source `9534c5701cac86095fdcac6edf2ef800a1153897` and published kit `0.1.28` (verified below). The sync's core/artifact commits were covered by that run; the follow-up evidence-record and review commits match no workflow path filter and are exempt by the task contract (no required checks declared). A passing export dispatch does not by itself qualify rendered parity; rendered parity at this source is qualified by the executed browser sweep below. Complete-render enforcement as a required CI check remains open; complete rendering at the candidate source is evidenced, not enforced in CI.

### Core sync review, 2026-09-26 (upstream `6a0af04d3c4f`)

Executed at source `332e86b`/`9534c57` on Linux x86_64, Node `v26.5.1`, headless Chromium with SwiftShader. No native Cables host exists in this environment. Host checks stay unverified.

| Check | Command or method | Exit | Observed result |
| --- | --- | --- | --- |
| Locked artifacts | `npm run vendor:verify` | 0 | 210 effects and 212 artifacts verified at the refreshed core. `evidence/core-sync-6a0af04d-20260926/vendor.log`. |
| Unit suite | `npm test` | 0 | 246 pass, zero fail, zero skip. `evidence/core-sync-6a0af04d-20260926/unit.log`. |
| Compiler parity | `node --test test/polymorphic-parity.test.js` | 0 | 36 pass, including the full Polymorphic corpus and landscape filtering define selection at the refreshed core. `evidence/core-sync-6a0af04d-20260926/compiler-parity.log`. |
| Browser suites | `npm run test:browser` | 0 | Full-catalog sweep passes the coverage-matrix gate (210 compile+link, 209 rendered at zero differing float channels under the matrix's zero-channel gate, one compile-only), 26 representative frame comparisons, and state hygiene. `evidence/core-sync-6a0af04d-20260926/browser.log`. |
| Rendered differential | `tools/landscape-evidence.mjs` | 0 | Both landscape filtering modes match the reference at zero mismatched channels; frames and JSON in `evidence/core-sync-6a0af04d-20260926/`. |
| Upstream range audit | Upstream checkout diff | n/a | `fca611fd8f91` verified ancestor of `6a0af04d3c4f`; 40 range commits touch only `shaders/src/lang`, `shaders/src/runtime`, and `shaders/tests`; no effect-definition files changed; manifest and all 210 effect bundles byte-identical. `differential.json` `upstreamRangeAudit`. |
| Exact-source CI | Export kit run `36222300492` | success | Push of `9534c57` to `refs/heads/main` triggered and succeeded on that head SHA; the run published kit `0.1.28`. |
| Published distribution | Fetch kit `0.1.28` files and hash | 0 | 17 of 17 inventory hashes match; served engine bundle equals the committed op bundle `d44c32e4...` (`Build: 6a0af04d`). |
| Compat declaration | Fetch kit `0.1.28/compat.json` | n/a | Mode unchanged (`all`); GAP-006 stays open. |

Complete-render status at this source: the full catalog renders through the Cables adapter with reference parity and the full-catalog browser gate passes with committed logs, so the previously open "complete-render enforcement" verification requirement is satisfied by execution for this candidate. It is not yet a required repository check; the CI boundary statement above records that limit. No GAP status changes: this is a Tearoff port sync, not a gap closure. Full-parameter parity, native host qualification, and release acceptance remain open under their existing GAP records.

### Daily review, 2026-09-26

This review independently rechecked both new closures at the inspected source `411b2b646bb6692918c17d705f0afdaf837f6e48` on Linux x86_64, Node `v26.5.1`, headless Chromium with SwiftShader. No native Cables host exists in this environment. Host checks stay unverified.

| Check | Command or method | Exit | Observed result |
| --- | --- | --- | --- |
| Locked artifacts | `npm run vendor:verify` | 0 | 210 effects and 212 artifacts verified. |
| Unit suite | `npm test` | 0 | 246 pass, zero fail, zero skip. |
| Compiler parity | `node --test test/polymorphic-parity.test.js` | 0 | 36 pass at the current source (35 recorded at the qualifying source). |
| Browser suites | `npm run test:browser` | 0 | Full-catalog sweep, pixel parity, and state hygiene suites pass in 4.4 minutes. |
| Bundle reproduction | `npm run build`, then SHA-256 | 0 | Rebuilt bundle equals `8f640b46027d9efe13f33fb9db627cbc3ead79e2c26c252e2267d827ea836d7f`. |
| Served distribution | Fetch kit `0.1.27` files and hash | 0 | 17 of 17 inventory hashes match. The served engine bundle is byte-identical to the qualifying bundle. |
| Compat declaration | Fetch kit `0.1.27/compat.json` | 0 | Still `mode: all`. GAP-006 stays open. |
| Recorded sweep data | Parse `evidence/gap-002-20260926/catalog-parity.json` | 0 | 210 effects, 209 rendered, 208 zero-mismatch, `filter/fibers` 1174 differing channels, `filter/octaveWarp` compile-only. Matches the document claims. |
| Published authority | Fetch `1.0.185` manifest and tags | 0 | Manifest SHA unchanged (`05c4d7b7...`). `1.0.185` at `6a0af04d`. Upstream head `a651c075`. |

The GAP-001 qualifying evidence is executed at source `7fe3b1627251a916d380124a46f6dac14c5192aa` per `differential.json` and `authority-comparison.json`. The GAP-002 sweep record was captured at 2026-09-26T04:52:58Z. Commit `411b2b6` followed six minutes later. Both closures are retained. Full-parameter parity, native host qualification, and release acceptance remain open.

### Daily review, 2026-09-25

31 compiler tests pass at the current source. They do not render the native Cables op or qualify updated landscape filtering. The prior highest-priority rendered finding remains open. Current full parity and the native host workflow are stale and unverified. [Raw evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/cables-current-probe.json).
The review checked source changes, worker evidence, source-bound CI where present, and current served inventories. Full installed-host and platform qualification remains incomplete.

Evidence belongs to run `20260922-cables-03` in the designated automation store.
The result record identifies its evidence directory.
No machine-specific paths or generated evidence enter this repository.
`source-hashes.json` records all 296 tracked files before the audit edits.

Environment: macOS on arm64, Node `24.7.0`, repository Playwright Chromium, and mounted Cables Standalone `0.11.0`.
The native host harness creates a temporary user profile and removes its child process after each attempt.

| Check | Command or method | Exit | Observed result and reference |
| --- | --- | --- | --- |
| Unit behavior | `npm test` | 0 | 217 passes, zero failures, zero skips. `unit.log`. |
| Locked artifacts | `npm run vendor:verify` | 0 | 210 effects and 212 artifacts verified. `vendor.log`. |
| Browser suite | `npm run test:browser` | 0 | Three suites pass. 210 compile/link, 209 render/copy, one compile-only exclusion, 24 representative frame comparisons, and state restoration. `browser.log`. |
| Native host | Set `CABLES_APP`, then run `npm run test:standalone` | 1 | Welcome-dialog Close click exceeds 30 seconds. `standalone.log`. |
| Native host retry | Repeat the unchanged host command | 0 | Editor checks pass. These include media, resize, recovery, reset, and removal/recreation. `standalone-retry.log`. |
| Package candidate | `npm pack --pack-destination <audit store> --json` | 0 | 17 files. `pack.json`. |
| Isolated installation | `npm install --ignore-scripts --no-audit --no-fund <local tarball>` | 0 | Installation succeeds in an empty private project. `install.log`. |
| Installed entry point | Compile the starter through the installed browser facade | 0 | Compilation succeeds. `consumer-compile.json`. |
| Package removal | `npm uninstall --ignore-scripts --no-audit --no-fund <package>` | 0 | The isolated project removes the package. `uninstall.log`. |
| Bundle reproduction | Existing esbuild options with `write:false` | 0 | Rebuilt and committed SHA-256 values match. `build-verification.json`. |
| Published distribution | Fetch kit `0.1.18` and check every inventory hash and byte count | 0 | 17 of 17 files match. `kit-verification.json`. |
| Current authority | Compare all 212 locked artifact paths with runtime `1.0.168` | 0 | 210 match. Core differences are build metadata. Landscape shader and parameter differences are substantive. `authority-comparison.json`. |
| Independent compiler probe | `node differential.mjs` in the audit store | 0 | Eleven graph results match. Current landscape isosurface filtering succeeds only in the authority. `differential.json`. |
| Published player workflow | `node player-probe.mjs` in the audit store | 0 | First result, rejection retention, visible error, and recovery succeed. `player-probe.json`. |

The compiler probe uses the committed browser facade and the separately downloaded current authority.
It removes only `compiledAt` during graph comparison.
A probe exit of zero means the probe recorded its observations. It does not mean every comparison matched.

The player probe uses the downloaded kit files without runtime modifications.
It inserts the program into the published patch template and serves the player from an isolated directory.
This checks the assembled player boundary, not the Noisedeck export-dialog workflow.
The player makes six local requests and no external requests.

The initial program requests solid `#336699` at 640 by 480 pixels.
Float readback returns `[0.199951171875, 0.39990234375, 0.60009765625, 1]`.
An invalid effect preserves that pixel and keeps Ready true.
The replacement `#cc3319` returns `[0.7998046875, 0.199951171875, 0.0980224609375, 1]`.
The screenshot shows the retained blue image and the visible generic error.
This is a bounded functional test, not catalog-wide pixel parity.

The browser suites pass with their original tolerances and fixtures.
All 24 representative comparisons allow zero differing float channels.
The catalog suite renders 209 of 210 effects and checks exact internal-to-output copies.
It compiles the remaining octaveWarp case without rendering it.
The state suite checks compile, render, rejection, reset, disposal, and hostile host state.

The first native attempt stops before media, resize, reset, and deletion assertions.
The unchanged retry passes after the browser suite finishes.
The first timeout remains recorded. This audit does not establish its cause.
The retry binds the Cables executable and archive hashes to its results.
The example visibly renders animated noise in VizTexture.
The media probe observes 38 host-texture bindings and zero CPU readbacks.
Manual resizing reaches 320 by 180 pixels, and canvas resizing reaches 960 by 540 pixels.
The final recreated Program reports Ready with an empty Error port.
Saved historical host results remain separate from both current attempts.
Keyboard access, focus, and accessibility in the editor remain unverified.
Windows, Linux, other browsers, and other GPU drivers remain unqualified by this pass.

The audit checked these official ecosystem references on 2026-09-22:

- [Cables Standalone](https://cables.gl/standalone) advertises version `0.11.2`.
- [Coding Ops](https://cables.gl/docs/6_2_standalone/1_coding_ops/coding_ops) documents project op directories.
- [Sharing Ops](https://cables.gl/docs/6_2_standalone/2_sharing_ops/sharing_ops) permits directory distribution and npm-compatible packages.

The port's explicit `0.11.0` target is valid as a limited contract.
This audit does not infer support for `0.11.2`.
The private package flag does not invalidate directory distribution.
No native binary ships in this op package, so separate op signing or notarization is not applicable.
The kit includes both Noisemaker license files and the Cables player license.
A successful isolated install does not qualify editor loading, upgrade behavior, or removal from a saved patch.

Exact-source [Export kit run 35752180752](https://github.com/noisefactorllc/noisemaker-for-cables/actions/runs/35752180752) succeeds.
It dispatches [Scaffold run 35752194924](https://github.com/noisefactorllc/scaffold/actions/runs/35752194924).
That run checks out the reviewed SHA, passes 119 builder tests without skips, and publishes kit `0.1.18`.
The builder tests do not replace this repository's unit, browser, or native host tests.
The [kit inventory](https://kits.noisedeck.app/cables/0.1.18/kit.json) records the same source SHA.

### Daily review evidence, 2026-09-23

Review evidence resides in `review-20260923-01/noisemaker-for-cables` in the shared store.
`node --test test/polymorphic-parity.test.js` passes 13 tests, exit 0.
The independent probe loads the committed bundle and the worker's retained authority `ae4e3302` separately.
All 12 graph results match after removing only `compiledAt`. The previously rejected isosurface case now passes.
The existing compiler suite also checks voxel and isosurface specialization. These checks do not compare rendered pixels.
`differential.json` preserves the complete inputs and results.

Kit `0.1.19` contains 17 files. Both changed bundle files match freshly downloaded bytes and inventory hashes.
The other 15 inventory hashes match the prior kit. A fresh compatibility-file download also matches.
[Current source CI](https://github.com/noisefactorllc/noisemaker-for-cables/actions/runs/35808132023) passed.
[Downstream CI](https://github.com/noisefactorllc/scaffold/actions/runs/35808144297) passed 119 builder tests without a test skip.
The workflow excluded other-kit suites. Neither workflow executes the port's native host or browser parity suite.

The reviewer checked the worker's first timeout, successful native retry, player pixels, recovery messages, installation, removal, and browser logs.
That evidence qualifies the old bundle on Standalone `0.11.0`, not the current bundle or every supported environment.
The review did not repeat native editor interaction or the browser suites after the bundle change.
The current official Sharing Ops guide still permits project directories and npm-compatible packages.
The Standalone page advertises `0.11.2`. Support for that version remains unverified.

## 4. Known gaps

### GAP-001: Updated landscape filtering lacks rendered qualification

- Status: closed for rendered qualification. The residual expected behavior (pre-delivery rejection of unsupported exports under the kit's unrestricted compatibility declaration) is tracked as GAP-006. Priority: P1. Category: authority.
- Affected scope: current-authority exports using landscape filtering and the kit's unrestricted compatibility declaration.
- Expected behavior: compatibility claims identify the accepted authority and reject unsupported exports before delivery.
- Historical behavior: the audited bundle rejected `renderLandscape3d(filtering: isosurface)`.
- Qualifying behavior: bundle `8f640b46027d9efe13f33fb9db627cbc3ead79e2c26c252e2267d827ea836d7f` at the executed source `7fe3b1627251a916d380124a46f6dac14c5192aa`, authority runtime `noisemaker@8eeb7b5a` (core `092c3b776003bc1539bed91aa86f421f839b40b1aa8b81ea09a5ec5e6b7bd3c7`). Both filtering choices are accepted, and both modes match the declared authority.
- Recorded hashes: `differential.json` records the bundle, authority, op-bundle, and vendor-lock SHA-256 values; `authority-comparison.json` records the authority comparison.
- Raw evidence: `evidence/gap-001-20260926/` holds the executed-run logs (`compiler-parity.log`, `unit.log`, `vendor.log`, `browser.log`, all exit 0), the per-case comparison JSON, and the raw reference and adapter frames (PNG) for both landscape cases, produced by `tools/landscape-evidence.mjs`.
- Required starting check: `node --test test/polymorphic-parity.test.js` passes 35 of 35 tests at this source, exit 0 (2026-09-26).
- Compiler comparison: both `renderLandscape3d(filtering: voxel)` and `(filtering: isosurface)` graphs compiled through the port facade match the vendored reference compiler after removing only `compiledAt`, with matching warnings (test/polymorphic-parity.test.js).
- Rendered comparison: the browser harness renders both modes through the reference WebGL2 backend and the public Cables adapter backend with deterministic inputs at 64 by 48 pixels; both frames match with zero differing float channels, exact internal-to-CGL copies, and finite readback (test/browser/pixel-parity.spec.js, cases `landscape-voxel@0` and `landscape-isosurface@0`).
- Existing checkpoints: `npm run test:browser` passes all three suites at this source (210/210 compile and link, 209 rendered catalog effects including the default voxel landscape fixture, 26 representative frame comparisons, state hygiene). `npm run vendor:verify` passes 210/210 effects and 212 artifacts against `vendor.lock.json`.
- Remaining limits: the standalone player and native editor boundary still requires the `CABLES_APP` host harness and remains under GAP-003. The kit's unrestricted `compat.mode: all` declaration and builder-side pre-delivery rejection behavior remain outside this repository.
- Last verification: 2026-09-26 for compiler and rendered behavior of both landscape filtering modes.

### GAP-002: Broad rendered parity lacks complete evidence

- Status: closed for the defined matrix. The adapter nondeterminism for the three canvas-overlay effects was subsequently root-caused and closed under GAP-007 (2026-09-26). Priority: P1. Category: verification.
- Affected scope: effect parameters, define choices, stateful frames, media, sizes, seeds, and chains.
- Expected behavior: parity claims state their tested denominator, authority, exclusions, and comparison method.
- Historical behavior: the full-catalog harness checked finite output and internal-to-output copying, not independent authority pixels for every effect.
- Qualifying behavior: the full-catalog sweep now renders every executable effect twice through independent programs — the reference `WebGL2Backend` and the public `CablesWebGL2Backend` adapter — with identical deterministic inputs, audio/MIDI state, external media texture, and seeds, and compares the presented RGBA float readbacks pixel-for-pixel at the existing checkpoint (64 by 48 pixels, zero mismatched channels). The adapter's internal texture must still copy bit-exactly to the CGL output, both readbacks must be finite, and per-effect GL resource accounting on both contexts must return to baseline (host resource check). `filter/octaveWarp` remains the single visible compile-only exclusion (`headless-swiftshader-execution-pathology`).
- Coverage matrix: `parity/coverage-matrix.json` defines the tested denominator (210 catalog effects, 209 rendered and compared, 1 compile-only exclusion), the authority (`noisemaker@8eeb7b5a`, core `092c3b776003bc1539bed91aa86f421f839b40b1aa8b81ea09a5ec5e6b7bd3c7`), the comparison method, the parameter/behavior dimensions (catalog default programs plus the 26 source-bound representative comparisons with parameters, define choices, stateful frames 0/1/12, media, sizes, seeds, and chains), the deterministic overlay-settle drain for the three canvas-overlay effects (see GAP-007), and how every skip, refusal, timeout, and context loss stays visible. `test/browser/full-catalog.spec.js` asserts the report against this matrix.
- Raw evidence: `evidence/gap-002-20260926/` holds the executed-run logs (`browser.log` with 3/3 suites, `unit.log` 246 pass, `vendor.log` 210/210 effects and 212 artifacts, all exit 0) and `catalog-parity.json` with the per-effect comparison records for all 210 effects at this exact source.
- Measured result: in the recorded run, 208 of the 209 rendered effects match the independent reference with zero differing float channels; `filter/fibers` reproduced with run-to-run differences under the classified `nondeterministic-canvas-overlay-generation` record (1174 differing channels in the recorded run; adapter-vs-adapter deltas of 198–238 of 12288 channels observed across repeated identical runs, tracked under GAP-007). `filter/scratches` showed 129 differing channels in a separate sweep run and matched zero in the recorded run; `filter/strayHair` matched zero in both. The representative suite's 26 comparisons continue to pass at zero differing channels. The residual nondeterminism was later root-caused to the fixed quiet window expiring mid-drawing on the adapter and closed under GAP-007.
- Remaining limits: native editor host qualification remains under GAP-003; the checkpoint stays at 64 by 48 pixels.
- Last verification: 2026-09-26.

### GAP-007: Canvas-overlay effects reproduce nondeterministically through the adapter

- Status: closed (2026-09-26). Priority: P2. Category: verification.
- Affected scope: `filter/fibers`, `filter/scratches`, and `filter/strayHair` through the Cables adapter (`CablesWebGL2Backend`).
- Expected behavior: identical deterministic inputs, state, and seeds reproduce identical adapter pixels run-to-run, as the reference backend does.
- Historical behavior: these effects draw their overlay through async 2D-canvas `asyncInit` passes that continue past pipeline initialization. Even after a fully drained settle window (3 s) the adapter reproduced them with small run-to-run differences (observed adapter-vs-adapter deltas of 198–238 of 12288 float channels for `filter/fibers` at identical inputs), while the reference backend settled exactly. Cross-backend mismatch counts varied per run (observed 129 and 3773 differing channels in one sweep for `filter/scratches` and `filter/fibers`).
- Root cause: the `asyncInit` drawing uploads progress to `overlayTex` every few strokes. On the reference backend each upload lands in about 4 ms, so the full generation finishes in well under a second (instrumented: `filter/fibers` performs 133 uploads spanning ~530 ms). On the adapter backend every upload crosses the guarded shared-CGL state transition and takes about 28–35 ms (observed inter-upload gaps of 29–54 ms), so the same generation needs roughly 3–4.6 s. The fixed 3000 ms quiet window therefore expired mid-drawing on the adapter: the instrumented probe captured `filter/fibers` with only 91–105 of 133 uploads landed, so both the reference-vs-adapter comparison (observed 1124–1636 differing channels in repeated instrumented runs) and the adapter-vs-adapter repeats (observed 124–702 channels) raced a partially drawn overlay. `filter/scratches` (25 uploads, ~800 ms) and `filter/strayHair` (3 uploads) drained inside the window, which is why they matched zero in some runs and showed 129 differing channels for `filter/scratches` in another.
- Qualifying behavior: `runSide` now drains the overlay generation to completion before rendering for these three effects — after the initial quiet period it waits until no overlay source upload has occurred for 1500 ms, with a 60000 ms cap that fails the case visibly instead of capturing a partial overlay. The `nondeterministic-canvas-overlay-generation` classification was removed from `test/browser/harness/pipeline.js`, `test/browser/full-catalog.spec.js`, and `parity/coverage-matrix.json`; the zero-mismatch ceiling is asserted for all 209 rendered effects, and the matrix documents the drain under `checkpoint.overlaySettle`.
- Measured result: 21 repeated comparisons at the existing 64 by 48 checkpoint (1 reference run plus 4 independent adapter runs per effect; reference-vs-adapter for each run and adapter-vs-adapter for consecutive runs) all show zero differing float channels with zero max and mean channel error, and every run completes the full generation (upload counts 133/25/3, matching the reference's completed drawing on every adapter run).
- Evidence: `evidence/gap-007-20260926/` holds `overlay-settle.json` from `tools/overlay-settle-evidence.mjs` — the 21 comparisons (each labelled with its effect ID and pair), and the `generation` drain-sufficiency records: per-run overlay source upload counts and timings showing every adapter run performs exactly the reference's completed generation (133/25/3 uploads) before capture — plus the raw reference frame and every adapter run frame (PNG) per effect, and the executed-run logs (`vendor.log` 210/210 effects verified, `unit.log` 246 pass, `compiler-parity.log` 36 pass, `browser.log` 3/3 suites including the full catalog sweep at the zero ceiling), all exit 0 at this source.
- Dependencies: none beyond the GAP-002 harness.
- Acceptance criteria: met — the three effects match the independent reference with zero differing float channels on repeated runs, and the classification is removed from the matrix and harness.
- Required checks: repeated independent rendered comparisons at the existing checkpoint — executed via `tools/overlay-settle-evidence.mjs` (4 adapter runs per effect) and asserted by the full catalog sweep.
- Last verification: 2026-09-26.

### GAP-003: Host qualification covers two of four declared environments

- Status: open. Priority: P2. Category: ecosystem.
- Affected scope: supported platforms, host versions, accessibility, and saved-project upgrades.
- Expected behavior: qualification covers the declared release environments and ordinary saved-project lifecycle.
- Supported platform matrix (declared release artifacts of [`cables-gl/cables_electron`](https://github.com/cables-gl/cables_electron/releases)): macOS arm64 `.dmg`, macOS Intel `.dmg`, Windows x64 `.zip`, Linux x64 `.AppImage`; releases `0.11.0` and `0.11.3` are the accepted standalone versions (`SUPPORTED_CABLES_STANDALONE_VERSIONS` in `tools/lib/cables-standalone-identity.js`).
- Observed behavior: macOS arm64 Standalone `0.11.0` passes the retry (`standalone-retry.log` in the retained host-retry evidence; the first attempt timed out at the welcome-dialog Close control and `standalone.log` preserves that failure). Linux x64 Standalone `0.11.3` passes the full editor smoke 2026-09-26 in this environment: identity-attested AppImage, visible animated output, media texture binding without CPU readback, invalid-DSL recovery with retained last-good pixels, canvas and manual resize, reset, op delete/recreate, keyboard focus traversal, and a saved-project reload into a second editor instance from a freshly copied project directory. The run rendered through SwiftShader ANGLE (no physical GPU here).
- Evidence: `evidence/gap-003-20260926/standalone-smoke.log`, `standalone-smoke.json`, and `standalone-smoke.png` (screenshot SHA-256 `1fc523313ff2e7e3fe1c8f0ece3180e75758dd7568efff3e62d0be53db99fdcb`); retained `standalone-retry.log`, `host-retry-evidence/standalone-smoke.json`, and its screenshot for macOS arm64.
- Next action: qualify Windows x64, macOS Intel, and macOS arm64 on `0.11.3`, and re-run on a host with a physical GPU driver, using the same harness (`CABLES_APP=<standalone> npm run test:standalone`).
- Dependencies: available target machines. Windows and macOS qualification remains unavailable in this Linux run.
- Acceptance criteria: each declared environment passes installation, visible output, external input, recovery, reset, and saved-project removal or upgrade.
- Required checks: real editor interactions, screenshots, cleanup, keyboard/focus checks, and saved-project reload — executed on Linux x64 `0.11.3` (2026-09-26) and macOS arm64 `0.11.0` (earlier retry); not yet executed on Windows, macOS Intel, or physical GPUs.
- Retain Windows, macOS Intel, newer Cables releases beyond `0.11.3`, and untested GPU drivers as unsupported evidence dimensions.
- Last verification: 2026-09-26 (Linux x64 `0.11.3`; macOS arm64 `0.11.0` last verified 2026-09-22).

### GAP-004: Compiler diagnostics do not reach the user

- Status: open. Priority: P2. Category: usability.
- Affected scope: DSL errors in the Program Error port and exported player message.
- Expected behavior: invalid input identifies the rejected operation or argument and gives enough detail for correction.
- Observed behavior: `invalidEffect()` shows only `Noisemaker controller compile failed`.
- The compiler supplies structured diagnostics, but the controller reads only `error.message`.
- Evidence: `player-probe.json`, `player-invalid.png`, `src/controller/errors.js:30`, and `src/op/install-program-op.js`.
- Last-good pixels remain intact, and a valid replacement clears the error.
- Next action: preserve structured diagnostic details through the controller and op message in the separate implementation job.
- Dependencies: retain transactional recovery and existing error codes.
- Acceptance criteria: the visible error identifies an invalid effect and invalid argument without losing the last-good image.
- Required checks: public op/player errors, recovery, and retained structured diagnostic tests.
- Last verification: 2026-09-22.

### GAP-005: Release CI does not qualify port behavior

- Status: open. Priority: P2. Category: release.
- Affected scope: release acceptance, exact-source runtime evidence, host versions, and upgrade/removal qualification.
- Expected behavior: a release decision identifies tested behavior, supported environments, and unresolved limits for its source SHA.
- Observed behavior: the only repository workflow dispatches the export-kit builder. Its green result does not execute the port's runtime suites.
- Evidence: `.github/workflows/export-kit.yml`, the two CI runs above, and the verified published inventory.
- Next action: define the release acceptance boundary and attach exact-source runtime and host evidence through existing systems.
- Dependencies: GAP-001 through GAP-004 and explicit audience/platform limits.
- Acceptance criteria: the actual distribution installs, renders, recovers, upgrades, and removes correctly on each declared target.
- Required checks: unit and browser suites, native workflow, package inventory, notices, reproducible bundle, and exact-source CI.
- This audit checks artifact integrity and reproducible bytes. It does not approve a release.
- Last verification: 2026-09-22.

### GAP-006: Kit compatibility declaration lacks pre-delivery rejection

- Status: open. Priority: P2. Category: authority.
- Affected scope: the kit's unrestricted compatibility declaration for exports the port has not qualified, including landscape filtering beyond the measured cases.
- Expected behavior: compatibility claims identify the accepted authority and reject unsupported exports before delivery (residual from GAP-001's expected behavior).
- Observed behavior: `export-kit/kit.config.json` still declares `compat.mode: all`, and no builder-side rejection of unqualified exports exists.
- Evidence: `export-kit/kit.config.json`, `authority-comparison.json`, and GAP-001's rendered qualification, which covers only the measured landscape cases through the op runtime boundary.
- Next action: implement pre-delivery rejection of unsupported exports in the export-kit builder and narrow or annotate the declaration to the accepted authority.
- Dependencies: the builder implementation lives outside this repository (scaffold export-kit builder); this record tracks the residual behavior.
- Acceptance criteria: unsupported exports are rejected before delivery, and the shipped declaration matches the tested authority scope.
- Required checks: builder rejection tests and exact-source kit export.
- Last verification: 2026-09-26 (declaration recorded as still unrestricted).

## 5. Ordered next actions

Current first action: correct GAP-004 in the separate implementation job. Preserve last-good rendering and error codes. Require a visible structured diagnostic for an invalid effect. GAP-003's Linux x64 host qualification is done (2026-09-26, Standalone 0.11.3, SwiftShader); its Windows, macOS Intel, and physical-GPU qualification still needs those target machines.

1. Correct GAP-004 in the separate implementation job. Preserve last-good rendering and error codes. Require a visible structured diagnostic for an invalid effect.
2. Run `npm run test:standalone` with a declared `CABLES_APP` host on the remaining GAP-003 environments (Windows x64, macOS Intel, macOS arm64 on `0.11.3`, and a physical-GPU host). The Linux x64 `0.11.3` environment passed the full smoke on 2026-09-26 (`evidence/gap-003-20260926/`).
3. Implement GAP-006's builder-side rejection in the scaffold export-kit builder. Narrow or annotate the kit declaration to the accepted authority.
4. Define GAP-005's release acceptance after GAP-003 and GAP-004 pass. Attach exact-source runtime and host evidence through existing systems.

Affected implementation areas are the vendor boundary, compatibility declaration, controller diagnostics, host harness, and release evidence.
These actions are handoff criteria, not permission to change those files in this audit.
The operator does not authorize additional effects or parity checkpoint advancement.

## 6. Pass history

2026-09-25 daily review at `6a5a9048471621a86cb8025bc10ce650b7efa842`: source freshness and bounded evidence reviewed. Open qualification limits retained. [Retained review evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/cables-current-probe.json). No new closure claimed.

2026-09-26 review at `411b2b646bb6692918c17d705f0afdaf837f6e48`: no new worker audit result arrived since the last review. The review checked the implementation commits `ec4b95b..411b2b6` and their closure claims. Both new closures (GAP-001 rendered qualification, GAP-002 defined matrix) were independently rechecked and retained. The GAP-001 qualifying source was corrected to the executed SHA. Served kit `0.1.27` verified. Full parity, native host, diagnostics, builder rejection, overlay nondeterminism, and release acceptance remain open.

| Date | Reviewed source | Change | Tested scope | Remaining limits |
| --- | --- | --- | --- | --- |
| 2026-09-22 | `0d860724f5305b854c6ffa64aed3de701157d2da` | Initial audit and README link. Five stable gaps recorded. | Unit checks, locked files, current compiler differential, package installation, published player recovery, native editor retry, bundle reproduction, artifact hashes, exact-source CI. | Broad parity, wider host qualification, actionable diagnostics, and release acceptance remain incomplete. |
| 2026-09-23 | `a911c39a69c78ec13606019eeacdf7b680468872` | Corrected the stale landscape rejection. Added executable qualification actions. | Reviewed worker raw logs. Passed 13 compiler tests and 12 independent graph comparisons. Checked current kit changes and exact-source CI. | Five gaps remain. Current-bundle rendered and host qualification remains incomplete. No closure. |
| 2026-09-26 | `7fe3b1627251a916d380124a46f6dac14c5192aa` | Closed GAP-001's rendered qualification; residual pre-delivery rejection tracked as GAP-006. Added source-bound compiler comparison and rendered fixtures for both `renderLandscape3d` filtering modes; recorded bundle and authority hashes in `differential.json` and `authority-comparison.json`; committed raw run logs and rendered frames under `evidence/gap-001-20260926/`, re-executed at this exact source: 35 compiler tests pass; unit suite 245 pass, 0 fail; browser suites pass with zero differing channels for `landscape-voxel` and `landscape-isosurface`; vendor verification 210/210. | Standalone player and native editor qualification remains under GAP-003. Builder-side pre-delivery rejection for the unrestricted kit declaration remains open under GAP-006. |
| 2026-09-26 | `411b2b646bb6692918c17d705f0afdaf837f6e48` | Implementation measured and closed GAP-002 for the defined matrix (`parity/coverage-matrix.json`, `evidence/gap-002-20260926/`): 210-effect sweep, 209 rendered, 208 zero-mismatch, `filter/fibers` 1174 differing channels, `filter/octaveWarp` compile-only. Opened GAP-007 for the overlay nondeterminism. Added the upstream texture-policy compiler test. | Review rerun at this source: vendor 210/210, unit 246 pass, compiler parity 36 pass, browser suites, bundle reproduction, kit `0.1.27` hashes. | GAP-003 host, GAP-004 diagnostics, GAP-006 builder rejection, GAP-007 overlay nondeterminism, GAP-005 release acceptance. Full parity unverified. |
| 2026-09-26 | this record commit | GAP-003: defined the supported platform matrix (cables_electron release artifacts for macOS arm64/Intel, Windows x64, Linux x64; standalone versions 0.11.0/0.11.3) and qualified Linux x64 Standalone `0.11.3` with the full editor smoke: identity-attested AppImage, animated output, media binding, invalid-DSL recovery, canvas and manual resize, reset, op delete/recreate, keyboard focus traversal, and saved-project reload in a second editor instance from a copied project directory. Harness now supports Linux AppImage identity, Linux launch flags, a keyboard/focus check, and the saved-project reload; evidence in `evidence/gap-003-20260926/` (`standalone-smoke.log` exit 0, `standalone-smoke.json`, screenshot). Unit suite 250 pass, 0 fail. | Rendered through SwiftShader ANGLE on a GPU-less Linux container; no physical GPU. | GAP-003 remains open for Windows x64, macOS Intel, macOS arm64 on `0.11.3`, and physical-GPU hosts. GAP-004, GAP-006, GAP-005 unchanged. |
