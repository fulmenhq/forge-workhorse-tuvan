# Release Notes

## [Unreleased]

## v0.1.7 (2026-06-17): Working Compiled Binaries + De-Guardianed Hooks

This release makes the cross-platform `bun --compile` release binaries actually
work, and adds a release gate so they can't silently regress again.

### Highlights

- **Compiled binaries fixed for CLI/diagnostic use.** The standalone single-file
  binaries previously crashed at startup or ran the wrong CLI. Adopting
  `@fulmenhq/tsfulmen` v0.3.2 (with string-metrics-wasm 0.3.10 and compile-safe
  CLIs) plus build-time embedding of identity, version, and config assets means
  each binary now starts cleanly and runs `version`, `health`, `doctor`, and
  `envinfo` standalone. (The HTTP server is not yet supported in the binary —
  see Scope below.)
- **Release smoke test.** `build:all` (and the release workflow) now runs the
  freshly built host binary's `version`, `doctor --json`, and `serve` from
  outside the repo and fails the build unless they behave correctly — catching
  startup crashes, version regressions, and broken config loading.
- **Hooks without guardian.** The goneat git hooks were regenerated without the
  guardian browser-approval intercept, matching direct-push workflows.

### Scope: standalone binary vs. server

The single-file binaries are CLI/diagnostic tools in this release. `serve` (the
HTTP server) is not yet supported standalone — `@fulmenhq/tsfulmen` loads SSOT
assets (foundry catalogs, schemas) from the filesystem that aren't present in a
compiled binary. Run the server from a Node/npm install (`node dist/index.js
serve`); in the binary, `serve` exits with a message pointing there. Full
standalone server support is tracked upstream.

### Upgrading

Template/CDRL consumers: re-run `make hooks-ensure` (or `goneat hooks generate &&
goneat hooks install`) if you want the de-guardianed hooks, and rebuild binaries
with `make build:all` to pick up the embedded-identity build step.

### Note on 0.1.3–0.1.6

Those versions appear in the CHANGELOG but were unreleased internal iterations
and were never tagged; 0.1.7 is the next tagged release after 0.1.2.

## v0.1.2 (2026-02-06): Public Readiness — Licensing + Dependency Refresh

A small housekeeping release preparing forge-workhorse-tuvan for public visibility.

### Highlights

- **LICENSE file added**: MIT license with trademark notices and acceptable use guidelines, adapted from the gofulmen canonical template. The README already referenced this file — now it exists.
- **Dependency patch bumps**: fastify 5.7.4, @biomejs/biome 2.3.14, @types/node 22.19.9.
- **Clean security posture**: Zero vulnerabilities (146 packages scanned via grype), zero copyleft licenses confirmed via license-checker.

## v0.1.1 (2026-02-01): Control Plane + Starter Auth + Better DX

v0.1.1 expands Tuvan into a more complete CLI/server "workhorse" by adding an operational control plane, starter auth wiring, and better automation-friendly diagnostics.

### Highlights

- **Control plane (ops endpoints)**: A separate control plane server (default `127.0.0.1:8081/control`) supports operational workflows like signal injection for containerized environments.
- **Safe-by-default auth**: Control plane auth hardens automatically when bound to non-loopback hosts; the data plane includes optional starter auth modes (basic auth or bearer token).
- **Better diagnostics for automation**: `tuvan doctor --json` and `tuvan envinfo --json` make it easy to integrate checks into CI and scripts.
- **Updated foundation**: Upgraded to `@fulmenhq/tsfulmen` v0.2.7 and improved env var ergonomics.

## v0.1.0: The Production-Ready TypeScript Workhorse

We are proud to announce the first release of **forge-workhorse-tuvan**, a battle-tested template for building robust, scalable Node.js backends within the Fulmen ecosystem.

### Key Features

- **Three-Layer Configuration**: Stop hardcoding. Tuvan automatically loads config from template defaults, user-local overrides (`~/.config/<vendor>/<binary-name>/config.yaml`), and environment variables (`TUVAN_SERVER_PORT=9000`).
- **Enterprise Observability**: Built-in structured logging (Pino) and Prometheus metrics ensure you have visibility from day one.
- **Production Reliability**: Graceful shutdowns, signal handling, and correlation IDs are pre-wired, so you don't have to reinvent the wheel.
- **Developer Experience**: A powerful CLI with `doctor` and `envinfo` commands helps diagnose environment issues instantly.

### Quick Start

```bash
# Clone and start
git clone https://github.com/fulmenhq/forge-workhorse-tuvan.git my-app
cd my-app
make bootstrap
make run
```

### Upgrading

This is the initial release. No upgrade path required.

### Acknowledgments

Built by the 3 Leaps team as part of the Fulmen ecosystem.
