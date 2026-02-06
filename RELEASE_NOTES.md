# Release Notes

## [Unreleased]

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
