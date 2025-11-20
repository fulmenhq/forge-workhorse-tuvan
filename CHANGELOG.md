# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
