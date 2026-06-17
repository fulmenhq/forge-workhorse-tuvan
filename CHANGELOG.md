# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.7] - 2026-06-17

### Fixed

- **Compiled release binaries were dead-on-arrival.** The `bun build --compile`
  single-file binaries shipped by `release.yml` crashed at startup and/or ran the
  wrong CLI. The root causes were upstream and are resolved by adopting
  `@fulmenhq/tsfulmen` v0.3.2 (see Changed):
  - `@3leaps/string-metrics-wasm` loaded its WASM eagerly via a top-level
    `readFileSync(new URL())` that `--compile` does not embed → startup `ENOENT`.
    Fixed upstream in 0.3.10 (base64-embedded WASM, lazy init).
  - tsfulmen's bundled `tsfulmen-schema` CLI self-executed inside compiled
    binaries (a main-module guard that is not compile-safe), hijacking the host
    CLI. Fixed upstream in tsfulmen 0.3.2.
- **Identity and version resolution inside compiled binaries.** A single-file
  binary has no on-disk `VERSION` or `.fulmen/app.yaml`, and tsfulmen's schema
  registry (used to validate identity) is filesystem-backed and absent in the
  binary. Identity, version, git commit, and build date are now injected at build
  time and resolved via a new `resolveIdentity()` fallback, so the binary reports
  its real version and identity instead of `0.0.0-unknown` or failing to start.
- **Config-backed commands inside compiled binaries.** The config defaults and
  schema were read from cwd-relative paths absent in a single-file binary. They
  are now embedded at build time and materialized to a temp path at runtime;
  schema validation is skipped in-binary (the embedded defaults are validated in
  CI, and tuvan still enforces its own invariants). `doctor`/`envinfo` now load
  config standalone.
- **`health`/`doctor` are embedded-aware.** They no longer report a compiled
  binary as unhealthy/misinstalled for missing on-disk `VERSION`/`.fulmen/app.yaml`/
  `package.json`; they recognize the embedded identity/version and bundled tsfulmen.
- **`--json` output is clean.** Config-bootstrap diagnostics now write to stderr,
  so `doctor --json` / `envinfo --json` emit only JSON on stdout (pipeable to `jq`).

### Added

- Build-time embedding in `scripts/build-all.ts`: version, git commit, build
  date, `.fulmen/app.yaml`, and the config defaults + schema are injected into
  every compiled binary via `bun --define`.
- A host-platform **release smoke test** in `build:all` (and therefore
  `release.yml`): it runs the binary's `version`, `doctor --json`, and `serve`
  from outside the repo and fails the build on a startup crash, an
  unresolved/shadowed version, a config-load error, or a non-graceful `serve`.
- `version --extended` now reports the `@fulmenhq/tsfulmen` version inside
  compiled binaries (injected at build time, since there is no `package.json` on
  disk), and attributes `crucible` to the bundling tsfulmen (e.g. `via
  @fulmenhq/tsfulmen 0.3.2`) when the app does not sync crucible SSOT directly,
  instead of showing `unknown`.

### Changed

- Upgraded `@fulmenhq/tsfulmen` `0.3.0` → **`0.3.2`** (brings string-metrics-wasm
  0.3.10 and compile-safe CLIs/bins). Added `yaml` as a direct dependency (already
  present transitively) to parse the build-time injected identity.
- Regenerated the goneat git hooks **without** the guardian browser-intercept
  (`goneat hooks generate` without `--with-guardian`), suited to direct-push
  workflows. Also picked up newer-template improvements (`set -f` glob guard,
  `--staged-only` pre-commit) and removed an orphaned guardian comment goneat
  leaves behind on regeneration.

### Scope

- The `bun --compile` standalone binaries are **CLI/diagnostic tools** in this
  release (`version`, `health`, `doctor`, `envinfo`). The **HTTP server
  (`serve`) is not yet supported in the standalone binary** — `@fulmenhq/tsfulmen`
  loads SSOT assets (foundry catalogs, schemas) from the filesystem, absent in a
  single-file binary. Run the server from a Node/npm install (`node dist/index.js
  serve`); in the binary, `serve` exits with a clear message pointing there. Full
  standalone server support is tracked upstream (tsfulmen compile-safe assets).

### Notes

- Versions **0.1.3–0.1.6** appear above but were never git-tagged or released —
  they were unreleased internal iterations (and their compiled binaries were
  affected by the bugs fixed here). 0.1.7 is tagged from the current branch; no
  retroactive tags are created for 0.1.3–0.1.6.

## [0.1.6] - 2026-06-08

### Changed

- Upgraded the TypeScript toolchain to align with tsfulmen v0.3.0's dev stack:
  - `typescript` `^5.7.2` → **`^6.0.3`**
  - `@biomejs/biome` `^2.3.14` → **`^2.4.16`**
  - `vitest`, `@vitest/coverage-v8`, `@vitest/ui` `^4.0.18` → **`^4.1.8`**
  - `tsx` `^4.21.0` → **`^4.22.4`**
  - `bun-types` `^1.3.8` → **`^1.3.14`**
- `@types/node` intentionally held on the **`^22.19.9`** (Node 22) line to match the declared runtime floor (`>=22.12.0`), rather than following tsfulmen to the Node 25 types.

All dev-only; no runtime dependency or public API change. Verified under TypeScript 6: typecheck, biome lint, vitest (35/35), build, and a runtime CLI smoke.

### Fixed

- Synced `package.json` `version` to `0.1.6` via `make version-set` (it had drifted from the `VERSION` file). A stale `package.json` version mislabels the `npm pack` tarball in the release workflow.

### Added

- `make release-guard-tag-version` (`scripts/release-guard-tag-version.sh`): asserts `VERSION`, `package.json` version, and the git tag all agree. Wired into `make release-check` and the release workflow (replacing the weaker tag-only check), and documented in `RELEASE_CHECKLIST.md`. Catches the VERSION↔package.json drift class going forward.

## [0.1.5] - 2026-06-08

### Changed

- Upgraded `commander` from `^14.0.3` to **`^15.0.0`**. This aligns tuvan's direct CLI dependency with the commander 15 that tsfulmen adopted in v0.3.0, removing the major-version split between the app's commander and the SDK's. Enabled now that the Node engine floor is `>=22.12.0` (commander 15 is ESM-only). tuvan's CLI surface is unchanged — verified by typecheck, the full vitest suite, biome, build, and a runtime smoke of `--help`/`version`/`doctor --json`.

## [0.1.4] - 2026-06-07

### Changed

- Upgraded `@fulmenhq/tsfulmen` to **v0.3.0** (downstream adoption of the v0.3.0 majors wave — archiver 8, pino 10, commander 15, TypeScript 6 — all internal to tsfulmen; tuvan's public API is unchanged).
- **BREAKING (toolchain): raised the Node engine floor to `>=22.12.0`** (was `>=20.0.0`), matching tsfulmen v0.3.0. The floor is driven by commander 15 being ESM-only. The Bun floor is unchanged.

### Fixed

- Bridged an ajv type-identity mismatch surfaced by the bump: tsfulmen v0.3.0 depends on `ajv ^8.20.0` while Fastify's `@fastify/ajv-compiler` bundles `ajv 8.17.1`, so the two `ajv` copies are distinct TypeScript class identities. The Fastify AJV plugin entry is now cast at the type boundary in `src/server/app.ts` and `src/server/control-plane.ts`. No runtime change — `applyFulmenAjvFormats` applies formats to whatever ajv instance Fastify hands the plugin (compatible across ajv 8.x). Fastify's compiler ajv is intentionally left un-deduped.
- Reordered re-exports in `src/observability/logger.ts` to satisfy Biome `organizeImports`.

## [0.1.3] - 2026-06-07

### Added

- **CI/CD workflows**: GitHub Actions for the CI quality gate (`ci.yml` — format, lint, typecheck, test, build), release artifact generation (`release.yml`), and an npm publish template (`publish.yml`).
- **Cross-platform binaries**: `scripts/build-all.ts` compiles 5 targets via `bun build --compile`; wired into `build:all` (Makefile + package.json). Checksum globbing updated for the new binary naming.
- **Release checklist**: `RELEASE_CHECKLIST.md` adapted from fulseed.

### Changed

- Expanded the CDRL guide and `docs/tuvan-overview.md` with CI/CD documentation.

## [0.1.2] - 2026-02-06

### Added

- **LICENSE file**: MIT license with trademark notices and acceptable use guidelines, adapted from the gofulmen canonical template. Required for public repository readiness.

### Changed

- Bumped `fastify` from 5.7.2 to **5.7.4** (patch).
- Bumped `@biomejs/biome` from 2.3.13 to **2.3.14** (patch, dev).
- Bumped `@types/node` from 22.19.7 to **22.19.9** (patch, dev).

### Security

- Verified zero vulnerabilities across 146 packages via goneat/grype SBOM scan.
- Verified zero copyleft (GPL/LGPL/AGPL) license dependencies via license-checker.

## [0.1.1] - 2026-02-01

### Added

- **Control plane**: Operational endpoints (including signal injection) with safe-by-default auth behavior.
- **Starter auth wiring**: Optional auth policy for the data plane (basic auth or bearer token).
- **Machine-readable diagnostics**: `tuvan doctor --json` and `tuvan envinfo --json` for automation.
- **Release signing scaffolding**: CDRL-friendly release verification infrastructure for downstream consumers.

### Changed

- Upgraded `@fulmenhq/tsfulmen` to **v0.2.3**.

- Upgraded `@fulmenhq/tsfulmen` to **v0.2.7**.
- Improved environment variable ergonomics (aliases + richer `envinfo`/`doctor` reporting).
- Defaulted control plane base path to `/control`.

### Fixed

- Avoided directory-walking patterns by using embedded app identity.

## [0.1.0] - 2025-11-20

### Added

- **Configuration System**: Three-layer configuration loader (Defaults, User Config, Environment Variables) using `@fulmenhq/tsfulmen`.
- **HTTP Server**: Fastify-based server with standard endpoints (`/health`, `/version`, `/metrics`).
- **CLI Framework**: Commander.js integration with `serve`, `version`, `health`, `doctor`, and `envinfo` commands.
- **Observability**:
  - Structured logging via `tsfulmen/logging`.
  - Prometheus metrics via `tsfulmen/telemetry`.
  - Request correlation IDs and performance timing.
- **Reliability**:
  - Graceful shutdown on SIGTERM/SIGINT.
  - SIGHUP config reload support.
  - Comprehensive error handling and standard exit codes.
- **Testing**:
  - Vitest setup with 100% pass rate (29/29 tests).
  - Integration tests for all endpoints.
  - Unit tests for config loader and CLI commands.

### Changed

- Updated dependency on `@fulmenhq/tsfulmen` to v0.1.13 for full configuration support.
- Refactored project structure to align with Fulmen Forge Workhorse Standard.

[Unreleased]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.7...HEAD
[0.1.7]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.2...v0.1.7
[0.1.2]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/fulmenhq/forge-workhorse-tuvan/releases/tag/v0.1.0
