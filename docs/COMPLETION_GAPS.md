# noisemaker-for-cables: completion gaps

## 1. Scope and source revisions

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

## 2. Completion claims

| Claim ID | Claim source | Claimed scope | Finding | Evidence |
| --- | --- | --- | --- | --- |
| CLAIM-001 | README.md and docs/architecture.md | Complete locked effect catalog | supported | The lock verifies 210 effects and 212 artifacts. Both current and pinned manifests contain 210 IDs. |
| CLAIM-002 | README.md | Pixel-level parity and complete programs | partial | Eleven compiler cases match current authority. The current landscape filtering case fails in the candidate. See GAP-001 and GAP-002. |
| CLAIM-003 | docs/installation.md | Native editor installation, media, resize, reset, and recovery | supported | The retry passes on macOS arm64 with Standalone 0.11.0. The first welcome-dialog timeout remains recorded. See GAP-003 for limits. |
| CLAIM-004 | docs/installation.md and export README template | Last-good rendering and recovery | supported | The player preserves rejected-edit pixels. Recovery renders the replacement color. |
| CLAIM-005 | examples/README.md and Error port documentation | Useful error reporting | partial | The user sees a generic compile failure. The compiler's diagnostic does not reach that message. See GAP-004. |
| CLAIM-006 | Project-local op directory and self-contained bundle | Ecosystem fit | partial | The directory layout follows official Cables guidance. Isolated package installation succeeds. The declared editor passes on macOS arm64. |
| CLAIM-007 | Export-kit workflow and published kit | Release readiness | partial | All 17 kit hashes match. Exact-source publication CI succeeds. It does not execute the repository's runtime or host suites. See GAP-005. |

## 3. Methods and evidence

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

## 4. Known gaps

### GAP-001: Port rejects current landscape filtering

- Status: open. Priority: P1. Category: authority.
- Affected scope: current-authority exports using landscape filtering and the kit's unrestricted compatibility declaration.
- Expected behavior: compatibility claims identify the accepted authority and reject unsupported exports before delivery.
- Observed behavior: current authority accepts `renderLandscape3d(filtering: isosurface)`. The bundled compiler rejects the `filtering` argument.
- Evidence: `differential.json`, `authority-comparison.json`, `vendor.lock.json`, and `export-kit/kit.config.json` with `compat.mode: all`.
- Next action: define the accepted authority boundary and compare changed landscape options without advancing the existing parity checkpoint.
- Dependencies: separate implementation authorization for runtime or compatibility changes.
- Acceptance criteria: supported exports execute against their declared authority. Unsupported authority features receive an explicit compatibility refusal.
- Required checks: source-bound compiler and rendered comparisons for landscape filtering modes and the existing checkpoint cases.
- Last verification: 2026-09-22.

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

## 5. Ordered next actions

1. Resolve GAP-001's authority contract before interpreting broader parity results.
2. Define GAP-003's host qualification matrix and preserve both native test attempts.
3. Preserve GAP-002's denominator and add missing evidence only within the authorized checkpoint.
4. Correct GAP-004 in the separate implementation job. Preserve last-good rendering and error codes.
5. Assess GAP-005 against the actual distribution and the declared host/platform matrix.

Affected implementation areas are the vendor boundary, compatibility declaration, controller diagnostics, host harness, and release evidence.
These actions are handoff criteria, not permission to change those files in this audit.
The operator does not authorize additional effects or parity checkpoint advancement.

## 6. Pass history

| Date | Reviewed source | Change | Tested scope | Remaining limits |
| --- | --- | --- | --- | --- |
| 2026-09-22 | `0d860724f5305b854c6ffa64aed3de701157d2da` | Initial audit and README link. Five stable gaps recorded. | Unit checks, locked files, current compiler differential, package installation, published player recovery, native editor retry, bundle reproduction, artifact hashes, exact-source CI. | Broad parity, wider host qualification, actionable diagnostics, and release acceptance remain incomplete. |
