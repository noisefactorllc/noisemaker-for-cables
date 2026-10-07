# Updating the Noisemaker for Cables catalog

The current lock contains 210 effects and 212 total artifacts: the core engine,
the effect manifest, and one bundle for each effect. Artifact byte sizes and
SHA-256 digests are recorded in `vendor.lock.json`; the installed op never
depends on a mutable runtime download.

The verified `vendor-cache/` is a source input and must be versioned with the
lock. The mutable `/1/` CDN alias is used only by an explicit `vendor:update`;
ordinary builds and verification use the checked-in bytes without downloading.

An intentional catalog refresh is:

```sh
npm run vendor:update
node tools/generate-effect-entry.mjs
npm run vendor:verify
npm run build
npm run test:browser
node scripts/parity-summary
```

Review the lock diff before accepting it. The manifest count, locked bundles,
generated static imports, runtime registrations, catalog compiler sweep, and
browser sweep must all agree. A missing, duplicate, renamed, or hash-mismatched
effect is a hard failure.

Once the browser sweep and the parity summary pass, rebind
`checkpoint.authority` in `parity/coverage-matrix.json` to the new core: the
`Build:` id from the core header and the SHA-256 of
`vendor-cache/noisemaker-shaders-core.esm.js`. The compatibility gate and its
unit tests refuse a core that does not match that pin. Then run
`npm run verify` and `node tools/compat-gate.mjs`.

`parity/programs.json` is the hand-authored full-DSL corpus.
`parity/catalog-inputs.js` creates valid explicit programs for every effect,
including surface inputs, high-arity remapping, points, 3D rendering, and
special media or mesh data. Update these fixtures when a changed effect
contract cannot be represented by the existing generator; do not weaken the
coverage assertion or silently exclude it.

Only rebuild the installed bundle after the lock and generated imports verify.
The package dry run must contain the op directory, user documentation, example,
parity fixtures, and lock file, with no build cache or machine-local path.
