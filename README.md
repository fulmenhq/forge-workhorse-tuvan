# forge-workhorse-tuvan

> A Fulmen workhorse application template for robust, scalable TypeScript backends and CLIs

Named after the Tuvan horse breed from the Russian steppe (Tuva Republic, southern Siberia), renowned for exceptional strength, endurance in harsh conditions, and reliability in demanding environments. The binary is simply called `tuvan`.

## Overview

`forge-workhorse-tuvan` is a **Level 2 template** in the Fulmen ecosystem—a production-ready starter that provides:

- ✅ HTTP server with standard endpoints (`/health`, `/version`, `/metrics`)
- ✅ CLI with required subcommands (serve, version, health, envinfo, doctor)
- ✅ Control plane for ops endpoints (signal injection, config reload)
- ✅ Starter auth wiring (control plane + data plane)
- ✅ Structured logging with progressive profiles (via tsfulmen)
- ✅ Three-layer configuration management (Crucible → User → Runtime)
- ✅ Graceful shutdown and signal handling
- ✅ Observability and telemetry built-in
- ✅ Automation-friendly JSON output for diagnostics (`doctor --json`, `envinfo --json`)
- ✅ CDRL philosophy: Clone → Degit → Refit → Launch

## Fulmen Ecosystem Layers

```
Level 3: Your Application ← You are here after refitting
Level 2: forge-workhorse-tuvan ← We are here (template)
Level 1: tsfulmen + goneat (helpers + tooling)
Level 0: Crucible (SSOT - schemas, standards, docs)
```

## Quick Start

### Prerequisites

- Node.js 20.0.0+ ([install](https://nodejs.org/))
- Bun 1.0.0+ ([install](https://bun.sh/)) _or_ npm/pnpm
- TypeScript 5.7+ (installed via dependencies)

### Bootstrap

```bash
# Clone template
git clone https://github.com/fulmenhq/forge-workhorse-tuvan.git my-app
cd my-app

# Install dependencies
make bootstrap

# Run server
make run
```

The server will start at `http://localhost:8080` with:

- Health checks: `http://localhost:8080/health/*` (live, ready, startup)
- Version info: `http://localhost:8080/version`
- Metrics: `http://localhost:8080/metrics` (Prometheus format)

## Architecture

### Directory Structure

```
forge-workhorse-tuvan/
├── src/
│   ├── cli/                    # Commander.js CLI commands
│   │   └── commands/           # serve, version, health, envinfo, doctor
│   ├── server/                 # Fastify HTTP server
│   │   ├── app.ts              # Server factory
│   │   ├── routes/             # Endpoint handlers
│   │   │   ├── health.ts       # Health check endpoints
│   │   │   ├── version.ts      # Version endpoint
│   │   │   └── metrics.ts      # Prometheus metrics
│   │   └── middleware/         # Request logging, correlation IDs
│   ├── core/                   # Business logic (your code here)
│   ├── config/                 # Config management
│   └── observability/          # Logging, metrics setup
├── config/
│   └── tuvan/
│       └── v1.0.0/
│           └── tuvan-defaults.yaml  # Template defaults (Layer 1)
├── schemas/
│   └── tuvan/
│       └── v1.0.0/
│           └── config.schema.json   # Config validation schema
├── docs/
│   ├── README.md
│   ├── DEVELOPMENT.md
│   ├── tuvan-overview.md       # Comprehensive architecture guide
│   └── development/
│       └── fulmen_cdrl_guide.md  # How to refit this template
├── .fulmen/
│   └── app.yaml                # App identity (binary name, env prefix)
├── .env.example                # Standard env vars (copy to .env)
├── Makefile                    # Development targets
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript configuration
```

### Dependencies

- **@fulmenhq/tsfulmen v0.2.3+** - Fulmen helper library (config, logging, telemetry, schema validation)
- **fastify** - HTTP framework (performance, TypeScript-first)
- **commander** - CLI framework (simple, proven)
- **pino** - High-performance logging (via tsfulmen)
- **vitest** - Fast, modern testing

## CLI Commands

```bash
# Server management
tuvan serve                 # Start HTTP server
tuvan serve --port 9000     # Custom port

# Information commands
tuvan version               # Basic version
tuvan version --extended    # Full version + SSOT info
tuvan health                # Self-check
tuvan envinfo               # Dump config/env/SSOT
tuvan envinfo --json        # Machine-readable env/config report

# Diagnostics
tuvan doctor                # Run checks, suggest fixes
tuvan doctor --json         # Machine-readable diagnostics
```

## Configuration

Tuvan uses **tsfulmen/config** for canonical three-layer configuration with schema validation.

### Three-Layer Config Pattern

1. **Layer 1 (Template Defaults)**: `config/tuvan/v1.0.0/tuvan-defaults.yaml`
   - Shipped with the template
   - Provides sensible defaults for all configuration options
   - Validated against `schemas/tuvan/v1.0.0/config.schema.json`

2. **Layer 2 (User Overrides)**: `~/.config/<vendor>/<binary-name>/config.yaml`
   - Discovered via app identity (`.fulmen/app.yaml`)
   - Merged on top of template defaults
   - Optional (falls back to defaults if not present)

3. **Layer 3 (Runtime Overrides)**: Environment variables and CLI flags
   - Highest priority
   - Environment variables use prefix from app identity (default: `TUVAN_`)
   - CLI flags override everything

**Priority**: CLI flags > Environment variables > User config > Template defaults

### Schema Validation

Configuration is validated against the JSON Schema at:

```
schemas/tuvan/v1.0.0/config.schema.json
```

Validation happens on load and reload. Invalid configuration prevents application startup or reload (falls back to previous valid config).

### Environment Variables

All env vars use the prefix from app identity (default: `TUVAN_`):

```bash
TUVAN_PORT=8080
TUVAN_HOST=localhost
TUVAN_LOG_LEVEL=info
TUVAN_METRICS_ENABLED=true
# ... see .env.example for full list
```

Copy `.env.example` to `.env` and customize for local development.

## Development

### Make Targets

```bash
make help          # Show all targets
make bootstrap     # Install dependencies (first-time setup)
make build         # Build TypeScript to dist/
make run           # Run in development mode
make test          # Run tests
make test-coverage # Run tests with coverage
make lint          # Run linting
make fmt           # Format code
make clean         # Clean build artifacts
make check-all     # Run lint + typecheck + test
make version       # Print current version
```

### Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test file
bun run test -- src/server/__tests__/health.test.ts
```

### Linting

```bash
# Run all linters
make lint

# Auto-fix issues
bun run biome check --write
```

## CDRL: Refit This Template

To create your own application from this template:

1. **Clone** the template:

   ```bash
   git clone https://github.com/fulmenhq/forge-workhorse-tuvan.git my-app
   cd my-app
   ```

2. **Degit** (remove template git history):

   ```bash
   rm -rf .git
   git init
   ```

3. **Refit** (customize for your app):

   **Step 1: Update App Identity** (`.fulmen/app.yaml`)

   ```yaml
   vendor: mycompany # Your organization
   binary_name: myapi # Your application name
   service_type: workhorse # Keep this for workhorse templates
   env_prefix: MYAPI_ # Your env var prefix (uppercase with underscore)
   config_name: myapi # Your config file name
   ```

   **Step 2: Update Package Info**
   - Update `package.json`: Change name, description, author, repository
   - Example: `"name": "@mycompany/myapi"`

   **Step 3: Update Environment Variables**
   - Customize `.env.example` with your variables
   - No need to rename prefixes - app identity handles this!

   **Step 4: Update Config and Schema Files**
   - See [CDRL Guide](docs/development/fulmen_cdrl_guide.md) for detailed config/schema renaming instructions

   **Step 5: Customize Application**
   - Replace placeholder business logic in `src/core/`
   - Update `README.md`, `LICENSE`, etc.
   - Update CLI command descriptions in `src/cli/`

4. **Launch**:
   ```bash
   make bootstrap
   make run
   ```

**Key Benefit**: With App Identity integration, you only need to update `.fulmen/app.yaml` and the codebase automatically uses your new identity for env vars, config paths, and telemetry namespaces!

For detailed refitting instructions, see [docs/development/fulmen_cdrl_guide.md](docs/development/fulmen_cdrl_guide.md).

## Observability

### Logging

Uses tsfulmen's progressive logging profiles:

- **SIMPLE**: Console output for CLI (default for commands)
- **STRUCTURED**: JSON output with correlation IDs (default for server)
- **ENTERPRISE**: Full envelope with middleware, throttling, policy enforcement

Configure via:

- Config file: `logging.profile: "structured"`
- Environment: `TUVAN_LOG_LEVEL=debug`
- CLI flag: `--verbose`

### Metrics

Prometheus metrics exposed at `/metrics`:

- `http_requests_total` - Total HTTP requests by method/path/status
- `http_request_duration_ms` - Request latency histogram
- Request ID correlation for tracing
- Standard Node.js runtime metrics (memory, event loop, etc.)

**Request ID Correlation**: Every request gets a unique X-Request-ID header for tracing and debugging.

### Tracing

Tracing is not enabled by default in this template. If you need distributed tracing, wire in OpenTelemetry in your refit.

## Production Reliability

### Graceful Shutdown

Tuvan implements production-grade signal handling with graceful shutdown:

```bash
# Start server
tuvan serve

# Graceful shutdown (SIGINT/SIGTERM)
# Ctrl+C or kill <pid>
# - Stops accepting new requests
# - Completes in-flight requests
# - Closes database connections
# - Flushes logs and metrics
# - Clean exit

# Force quit (double-tap)
# Press Ctrl+C twice within 2 seconds
# Immediate exit if shutdown hangs
```

**Shutdown Sequence** (LIFO order):

1. Stop accepting new connections
2. Shutdown HTTP server (wait for in-flight requests)
3. Flush logger (ensure all logs written)
4. Exit cleanly

### Config Reload

Send SIGHUP to reload configuration without restart:

```bash
# Send SIGHUP signal
kill -HUP $(pgrep tuvan)

# Config reload attempts to re-read config file and apply changes
# Some changes may still require restart (e.g., port changes)
```

### Exit Codes

Tuvan uses standardized exit codes from the Foundry catalog for operational clarity:

| Code | Name          | When                                                |
| ---- | ------------- | --------------------------------------------------- |
| 0    | Success       | Command completed successfully                      |
| 1    | Failure       | Generic failure (default for unspecified errors)    |
| 30   | ConfigInvalid | Configuration file is invalid or logger init failed |
| 50   | FileNotFound  | Required file not found (e.g., `.fulmen/app.yaml`)  |

**Usage in Shell Scripts:**

```bash
# Check exit codes for automation
tuvan health
if [ $? -eq 0 ]; then
    echo "Service is healthy"
fi

# Handle specific failures
tuvan serve
exit_code=$?
case $exit_code in
    0)
        echo "Server stopped cleanly"
        ;;
    30)
        echo "Configuration error - check config file"
        ;;
    50)
        echo "Missing required file - check .fulmen/app.yaml"
        ;;
    *)
        echo "Server error (exit code: $exit_code)"
        ;;
esac
```

## Standard Endpoints

### Health Checks

- `GET /health` – Aggregate health with semantic status (`healthy`, `degraded`, `unhealthy`)
- `GET /health/live` – Liveness probe (fast timeout)
- `GET /health/ready` – Readiness probe (checks dependencies)
- `GET /health/startup` – Startup probe (initialization complete)

Each response includes version metadata, RFC3339 timestamps, and per-check statuses.

### Version Information

- `GET /version` – Returns app identity, version, git commit, build date, Node.js info, and embedded tsfulmen/Crucible dependency versions

### Metrics

- `GET /metrics` – Prometheus/OpenMetrics format for scraping

## Control Plane

Tuvan runs a separate **control plane** HTTP server for operational endpoints.

- Default bind: `127.0.0.1:8081`
- Default base path: `/control`
- Primary endpoint: `POST /control/signal` (signal injection for containerized environments)

### Control Plane Auth (Starter)

- If you set `TUVAN_ADMIN_TOKEN`, requests must include `Authorization: Bearer <token>`.
- If you bind the control plane to a non-loopback host, the server requires a configured token (startup fails otherwise).

## Data Plane Auth (Starter)

The data plane (main API server) includes optional starter auth wiring.

- Config: `dataPlaneAuth.enabled` + `dataPlaneAuth.auth.mode` (`basicAuth` or `bearerToken`)
- Policy: endpoints are categorized as `deny`, `public`, `conditional`, `protected` via prefix lists

Recommended quick start (basic auth):

```bash
export TUVAN_AUTH_ENABLED=true
export TUVAN_AUTH_MODE=basicAuth
export TUVAN_AUTH_BASIC_USER=admin
export TUVAN_AUTH_BASIC_PASSWORD=change-me
```

Env var notes:

- Canonical server keys are nested (e.g. `TUVAN_SERVER_PORT`); this template also supports aliases like `TUVAN_PORT`.
- Canonical logging keys are nested (e.g. `TUVAN_LOGGING_LEVEL`); aliases `TUVAN_LOG_LEVEL` and `TUVAN_LOG_PROFILE` are supported.

### Standardized Errors

All non-2xx responses use a consistent JSON envelope:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found"
  }
}
```

## Current Status

✅ **v0.1.1 Released** - Production Ready

This template is now fully operational and compliant with the Fulmen Forge Workhorse Standard.

**Feature Completeness:**

- [x] Project structure and dependencies
- [x] CLI framework with all required commands
- [x] HTTP server with Fastify
- [x] Standard endpoints (/health, /version, /metrics)
- [x] Three-layer configuration management
- [x] Graceful shutdown and signal handling
- [x] Structured logging (tsfulmen)
- [x] Prometheus metrics (tsfulmen)
- [x] App Identity integration
- [x] Semantic exit codes
- [x] Control plane (operational endpoints + signal injection)
- [x] Starter auth wiring (control plane + data plane)
- [x] Comprehensive tests (100% pass rate)
- [x] Complete documentation

## Contributing

See [MAINTAINERS.md](MAINTAINERS.md) for governance and project team information.

## Resources

### FulmenHQ Ecosystem

- [Crucible](https://github.com/fulmenhq/crucible) - SSOT for schemas, standards, docs
- [TSFulmen](https://github.com/fulmenhq/tsfulmen) - TypeScript helper library
- [Goneat](https://github.com/fulmenhq/goneat) - DX CLI tool

### Documentation

- [Template Overview](docs/tuvan-overview.md) - Comprehensive guide to template architecture
- [Developer Handbook](docs/DEVELOPMENT.md) - Development setup and workflows
- [CDRL Guide](docs/development/fulmen_cdrl_guide.md) - Template customization guide

### Standards Applied

Tuvan implements standards from the Fulmen ecosystem including the Forge Workhorse Standard, TypeScript coding standards, CLI structure patterns, and HTTP REST standards. See the [Crucible repository](https://github.com/fulmenhq/crucible) for complete standard specifications.

## License

Licensed under the MIT License. See [LICENSE](LICENSE) file for complete details.

**Trademarks**: "Fulmen" and "3 Leaps" are trademarks of 3 Leaps, LLC. While code is open source, please use distinct names for derivative works to prevent confusion. See LICENSE for full guidelines.

### OSS Policies (Organization-wide)

- Authoritative policies repository: https://github.com/3leaps/oss-policies/
- Code of Conduct: https://github.com/3leaps/oss-policies/blob/main/CODE_OF_CONDUCT.md
- Security Policy: https://github.com/3leaps/oss-policies/blob/main/SECURITY.md
- Contributing Guide: https://github.com/3leaps/oss-policies/blob/main/CONTRIBUTING.md

---

<div align="center">

⚡ **Strong. Enduring. Reliable.** ⚡

_TypeScript workhorse template for the FulmenHQ ecosystem_

<br><br>

**Built with ⚡ by the 3 Leaps team**
**Part of the [Fulmen Ecosystem](https://fulmenhq.dev) - Lightning-fast enterprise development**

**Level 2 Template** • **Production Ready** • **Batteries Included**

</div>
