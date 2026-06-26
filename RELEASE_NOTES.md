# Release Notes

## [Unreleased]

## v0.1.7 (2026-06-26): Full Standalone Compiled Binaries + De-Guardianed Hooks

This release makes the cross-platform `bun --compile` release binaries work as
**full standalone artifacts** — server included — and adds a release gate so they
can't silently regress again.

### Highlights

- **Full standalone single-file binaries.** Building on `@fulmenhq/tsfulmen`
  **v0.4.0** (compile-safe SSOT asset embedding), each binary starts cleanly,
  reports its own version/identity, and runs every command — `version`, `health`,
  `doctor`, `envinfo`, **and `serve`** — from anywhere, not just a repo checkout.
- **Real config validation in the binary.** Configuration is schema-validated
  inside the compiled binary, so invalid config is rejected (e.g.
  `TUVAN_SERVER_PORT=abc tuvan doctor --json` now fails and exits non-zero
  instead of silently passing).
- **Release smoke test asserts the server binds.** `build:all` (and the release
  workflow) runs the freshly built host binary's `version`, `doctor --json`, and
  `serve` from outside the repo and fails the build unless they behave correctly —
  the `serve` check now confirms the server actually binds.
- **Hooks without guardian.** The goneat git hooks were regenerated without the
  guardian browser-approval intercept, matching direct-push workflows.

### Upgrading

Template/CDRL consumers: re-run `make hooks-ensure` (or `goneat hooks generate &&
goneat hooks install`) if you want the de-guardianed hooks, and rebuild binaries
with `make build:all` — they now embed identity, version, and config assets and
run the server standalone.

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
