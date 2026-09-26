# noisemaker-for-cables: completion gaps

Current compatibility matrix: [compatibility report](COMPATIBILITY.md).

## 1. Scope and source revisions

Daily review: 2026-09-25. Current inspected source: [`6a5a9048471621a86cb8025bc10ce650b7efa842`](https://github.com/noisefactorllc/noisemaker-for-cables/commit/6a5a9048471621a86cb8025bc10ce650b7efa842).
Full rendered parity remains **unverified**. No release approval or new closure follows from this review.
Current upstream discovery: `bbdeb56c4b75cf33379766c3e87b0f5a18bcbba8`. Published Noisemaker authority: `1.0.179`, source `fca611fd8f91424661d4e531d39313d24ea21134`, 210 effect IDs.
The observations below retain their original source and authority identities. They do not qualify later updates.
Current served kit: `0.1.24`, source `6a5a9048471621a86cb8025bc10ce650b7efa842`. [Retrieved inventory and hashes](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/current-served-inventories.json). Artifact identity does not establish host qualification.

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
| CLAIM-002 | README.md | Pixel-level parity and complete programs | partial | The audit matched eleven cases and rejected landscape filtering. The review matches all twelve against the retained authority. Rendered scope remains incomplete. |
| CLAIM-003 | docs/installation.md | Native editor installation, media, resize, reset, and recovery | supported | The retry passes on macOS arm64 with Standalone 0.11.0. The first welcome-dialog timeout remains recorded. See GAP-003 for limits. |
| CLAIM-004 | docs/installation.md and export README template | Last-good rendering and recovery | supported | The player preserves rejected-edit pixels. Recovery renders the replacement color. |
| CLAIM-005 | examples/README.md and Error port documentation | Useful error reporting | partial | The user sees a generic compile failure. The compiler's diagnostic does not reach that message. See GAP-004. |
| CLAIM-006 | Project-local op directory and self-contained bundle | Ecosystem fit | partial | The directory layout follows official Cables guidance. Isolated package installation succeeds. The declared editor passes on macOS arm64. |
| CLAIM-007 | Export-kit workflow and published kit | Release readiness | partial | All 17 kit hashes match. Exact-source publication CI succeeds. It does not execute the repository's runtime or host suites. See GAP-005. |

## 3. Methods and evidence

Review CI boundary: Exact-source runs: Export kit. A passing export dispatch does not qualify rendered parity. Current complete-render enforcement remains an open verification requirement. [Exact-source responses and workflows](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/noisemaker-for-cables-remote-evidence.json).

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
- Qualifying behavior: bundle `8f640b46027d9efe13f33fb9db627cbc3ead79e2c26c252e2267d827ea836d7f` at source `f214871b48fc7352c142c369ab44f320910e914c`, authority runtime `noisemaker@8eeb7b5a` (core `092c3b776003bc1539bed91aa86f421f839b40b1aa8b81ea09a5ec5e6b7bd3c7`). Both filtering choices are accepted, and both modes match the declared authority.
- Recorded hashes: `differential.json` records the bundle, authority, op-bundle, and vendor-lock SHA-256 values; `authority-comparison.json` records the authority comparison.
- Raw evidence: `evidence/gap-001-20260926/` holds the executed-run logs (`compiler-parity.log`, `unit.log`, `vendor.log`, `browser.log`, all exit 0), the per-case comparison JSON, and the raw reference and adapter frames (PNG) for both landscape cases, produced by `tools/landscape-evidence.mjs`.
- Required starting check: `node --test test/polymorphic-parity.test.js` passes 35 of 35 tests at this source, exit 0 (2026-09-26).
- Compiler comparison: both `renderLandscape3d(filtering: voxel)` and `(filtering: isosurface)` graphs compiled through the port facade match the vendored reference compiler after removing only `compiledAt`, with matching warnings (test/polymorphic-parity.test.js).
- Rendered comparison: the browser harness renders both modes through the reference WebGL2 backend and the public Cables adapter backend with deterministic inputs at 64 by 48 pixels; both frames match with zero differing float channels, exact internal-to-CGL copies, and finite readback (test/browser/pixel-parity.spec.js, cases `landscape-voxel@0` and `landscape-isosurface@0`).
- Existing checkpoints: `npm run test:browser` passes all three suites at this source (210/210 compile and link, 209 rendered catalog effects including the default voxel landscape fixture, 26 representative frame comparisons, state hygiene). `npm run vendor:verify` passes 210/210 effects and 212 artifacts against `vendor.lock.json`.
- Remaining limits: the standalone player and native editor boundary still requires the `CABLES_APP` host harness and remains under GAP-003. The kit's unrestricted `compat.mode: all` declaration and builder-side pre-delivery rejection behavior remain outside this repository.
- Last verification: 2026-09-26 for compiler and rendered behavior of both landscape filtering modes.

### GAP-002: Broad rendered parity lacks complete evidence

- Status: open. Priority: P1. Category: verification.
- Affected scope: effect parameters, define choices, stateful frames, media, sizes, seeds, and chains.
- Expected behavior: parity claims state their tested denominator, authority, exclusions, and comparison method.
- Observed behavior: the full-catalog harness checks finite output and internal-to-output copying, not independent authority pixels for every effect.
- Evidence: `test/browser/harness/pipeline.js`, `test/browser/full-catalog.spec.js`, and `test/browser/pixel-parity.spec.js`.
- The harness explicitly compiles `filter/octaveWarp` without rendering it.
- The representative suite defines 24 frame comparisons at 64 by 48 pixels against the pinned engine.
- Next action: retain every exclusion and define the required parameter and behavior matrix at the existing checkpoint.
- Dependencies: GAP-001 defines the authority boundary.
- Acceptance criteria: required cases have source-bound measurements. Every skip, refusal, timeout, and unsupported case remains visible.
- Required checks: independent rendered comparisons and host resource checks. Compilation and same-pipeline copying cannot close this gap.
- Last verification: 2026-09-22.

### GAP-003: Host qualification covers one environment

- Status: open. Priority: P2. Category: ecosystem.
- Affected scope: supported platforms, host versions, accessibility, and saved-project upgrades.
- Expected behavior: qualification covers the declared release environments and ordinary saved-project lifecycle.
- Observed behavior: the retry passes in Standalone `0.11.0` on macOS arm64. Other platforms and newer versions remain untested.
- Evidence: `standalone-retry.log`, `host-retry-evidence/standalone-smoke.json`, and its screenshot.
- The first attempt times out at the welcome-dialog Close control. `standalone.log` preserves that failure.
- Next action: define the supported platform matrix and qualify saved-project reload, upgrades, and accessible editor controls.
- Dependencies: declared host versions and available target machines. Other-platform qualification remains unavailable in this run.
- Acceptance criteria: each declared environment passes installation, visible output, external input, recovery, reset, and saved-project removal or upgrade.
- Required checks: real editor interactions, screenshots, cleanup, keyboard/focus checks, and saved-project reload.
- Retain Windows, Linux, newer Cables releases, and untested GPU drivers as unsupported evidence dimensions.
- Last verification: 2026-09-22.

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

Current first action: Run the existing landscape fixture through the native Cables Program op with immutable reference input. Compare actual pixels at the existing tolerance and at zero tolerance. Then test an exported patch with parameter changes, resize, a failing program, and recovery. Require useful output and a visible diagnostic.
Subsequent historical actions remain dependent on that evidence. No implementation is authorized by this audit.

1. Record GAP-001's updated authority and bundle hashes. Run `node --test test/polymorphic-parity.test.js`. Require all 35 checks to pass.
   Compare default, voxel, and isosurface outputs with the declared authority. Preserve tolerances and include both projection modes.
2. Run `npm run test:standalone` with the declared `CABLES_APP` after the bundle change. Preserve both earlier native attempts.
   Require visible output, media binding, resize, rejection recovery, reset, and recreation. Record saved-project reload separately.
3. Preserve GAP-002's denominator and add missing evidence only within the authorized checkpoint.
4. Correct GAP-004 in the separate implementation job. Preserve last-good rendering and error codes.
5. Assess GAP-005 against the actual distribution and the declared host/platform matrix.

Affected implementation areas are the vendor boundary, compatibility declaration, controller diagnostics, host harness, and release evidence.
These actions are handoff criteria, not permission to change those files in this audit.
The operator does not authorize additional effects or parity checkpoint advancement.

## 6. Pass history

2026-09-25 daily review at `6a5a9048471621a86cb8025bc10ce650b7efa842`: source freshness and bounded evidence reviewed. Open qualification limits retained. [Retained review evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/cables-current-probe.json). No new closure claimed.

| Date | Reviewed source | Change | Tested scope | Remaining limits |
| --- | --- | --- | --- | --- |
| 2026-09-22 | `0d860724f5305b854c6ffa64aed3de701157d2da` | Initial audit and README link. Five stable gaps recorded. | Unit checks, locked files, current compiler differential, package installation, published player recovery, native editor retry, bundle reproduction, artifact hashes, exact-source CI. | Broad parity, wider host qualification, actionable diagnostics, and release acceptance remain incomplete. |
| 2026-09-23 | `a911c39a69c78ec13606019eeacdf7b680468872` | Corrected the stale landscape rejection. Added executable qualification actions. | Reviewed worker raw logs. Passed 13 compiler tests and 12 independent graph comparisons. Checked current kit changes and exact-source CI. | Five gaps remain. Current-bundle rendered and host qualification remains incomplete. No closure. |
| 2026-09-26 | `7fe3b1627251a916d380124a46f6dac14c5192aa` | Closed GAP-001's rendered qualification; residual pre-delivery rejection tracked as GAP-006. Added source-bound compiler comparison and rendered fixtures for both `renderLandscape3d` filtering modes; recorded bundle and authority hashes in `differential.json` and `authority-comparison.json`; committed raw run logs and rendered frames under `evidence/gap-001-20260926/`, re-executed at this exact source: 35 compiler tests pass; unit suite 245 pass, 0 fail; browser suites pass with zero differing channels for `landscape-voxel` and `landscape-isosurface`; vendor verification 210/210. | Standalone player and native editor qualification remains under GAP-003. Builder-side pre-delivery rejection for the unrestricted kit declaration remains open under GAP-006. |
