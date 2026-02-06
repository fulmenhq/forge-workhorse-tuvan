# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/fulmenhq/forge-workhorse-tuvan/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/fulmenhq/forge-workhorse-tuvan/releases/tag/v0.1.0
