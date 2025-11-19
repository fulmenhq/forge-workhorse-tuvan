---
title: "Tuvan Template Overview"
description: "Comprehensive overview of the Tuvan TypeScript workhorse application template"
author: "TypeScript Forge Engineer"
date: "2025-11-16"
last_updated: "2025-11-16"
status: "active"
tags: ["overview", "template", "workhorse", "typescript", "fulmen"]
---

# Tuvan Template Overview

## Purpose & Scope

Tuvan is a production-ready TypeScript workhorse application template from the FulmenHQ ecosystem, providing enterprise-grade patterns for robust, scalable Node.js backends. Named after the Tuvan horse breed from the Russian steppe (renowned for strength, endurance, and reliability), it serves as the canonical TypeScript implementation of the Fulmen Forge Workhorse Standard.

**Target Audience**: TypeScript developers building production workloads, API services, background workers, and enterprise applications that need reliability, observability, and operational maturity from day one.

**Design Philosophy**: Progressive complexity with production-ready defaults. Simple deployments work out-of-the-box, while complex applications have access to full enterprise features including graceful shutdown, structured logging, metrics, and configuration management.

## Template Architecture

### Core Components

| Component           | Status              | Purpose                                                                        | Key Features                                                               |
| ------------------- | ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **HTTP Server**     | 🚧 Planned          | Fastify router with standard endpoints, graceful shutdown, middleware support | TypeScript-first, high performance, plugin ecosystem                       |
| **CLI Framework**   | 🚧 Planned          | Commander.js-based commands (serve, version, health, envinfo, doctor)          | Simple API, TypeScript-friendly, extensible                                |
| **Configuration**   | 🚧 Planned          | Defaults → file → environment variables with XDG compliance                    | Three-layer loading, schema validation, hot reload                         |
| **Observability**   | 🚧 Planned          | Structured logging, Prometheus metrics, health checks                          | Pino-based logging, Request correlation, OTLP export                       |
| **Signal Handling** | 🚧 Planned          | Graceful shutdown, config reload, double-tap force quit                        | Cross-platform, LIFO cleanup, HTTP admin endpoint                          |
| **App Identity**    | 🚧 Planned          | `.fulmen/app.yaml` for template customization                                  | Dynamic env vars, config paths, telemetry namespaces                       |
| **Exit Codes**      | 🚧 Planned          | Foundry exit codes with semantic meaning                                       | Shell script friendly, metadata logging, operational clarity               |

### Standard Endpoints

| Endpoint          | Method | Purpose                                          | Response                             |
| ----------------- | ------ | ------------------------------------------------ | ------------------------------------ |
| `/health`         | GET    | Aggregate application health across dependencies | JSON with status, timestamp, checks  |
| `/health/live`    | GET    | Fast liveness probe                              | JSON probe response (`200/503`)      |
| `/health/ready`   | GET    | Readiness probe w/ dependency checks             | JSON probe response (`200/503`)      |
| `/health/startup` | GET    | Startup probe to signal init completion          | JSON probe response (`200/503`)      |
| `/version`        | GET    | Version and identity information                 | JSON with app, SSOT, runtime details |
| `/metrics`        | GET    | Prometheus/OpenMetrics scrape endpoint           | OpenMetrics format for scraping      |

All non-2xx responses share a standardized error envelope ensuring consistent JSON errors for orchestrators and operators.

### CLI Commands

| Command   | Purpose              | Key Features                                      |
| --------- | -------------------- | ------------------------------------------------- |
| `serve`   | Start HTTP server    | Graceful shutdown, signal handling, config reload |
| `version` | Display version info | Basic and extended output with SSOT versions      |
| `health`  | Run health check     | Self-diagnosis with detailed status reporting     |
| `envinfo` | Show environment     | Comprehensive runtime and configuration info      |
| `doctor`  | System diagnostics   | Validates Node.js version, dependencies, config   |

## Integration Stack

### Fulmen Ecosystem Integration

| Module                   | Integration | Benefits                                             |
| ------------------------ | ----------- | ---------------------------------------------------- |
| **tsfulmen/appidentity** | 🚧 Planned  | Dynamic app name, config paths, env var prefixes     |
| **tsfulmen/logging**     | 🚧 Planned  | SIMPLE → STRUCTURED → ENTERPRISE profiles            |
| **tsfulmen/config**      | 🚧 Planned  | Three-layer loading with validation                  |
| **tsfulmen/telemetry**   | 🚧 Planned  | Counters, gauges, histograms with Prometheus export  |
| **tsfulmen/signals**     | 🚧 Planned  | Cross-platform graceful shutdown and config reload   |
| **tsfulmen/foundry**     | 🚧 Planned  | Exit codes, HTTP statuses, MIME types, patterns      |
| **tsfulmen/crucible**    | 🚧 Planned  | Schema validation, standards access                  |
| **tsfulmen/errors**      | 🚧 Planned  | Structured error types with severity and propagation |
| **tsfulmen/pathfinder**  | 🚧 Planned  | Safe filesystem traversal with checksums             |

### External Dependencies

| Dependency              | Version | Purpose                               | Integration              |
| ----------------------- | ------- | ------------------------------------- | ------------------------ |
| **fastify**             | ^5.0.0  | HTTP framework with TypeScript        | High performance routing |
| **commander**           | ^12.0.0 | CLI framework                         | Command structure        |
| **pino**                | ^9.0.0  | High-performance structured logging   | Via tsfulmen/logging     |
| **@fastify/cors**       | ^10.0.0 | CORS middleware                       | Security                 |
| **@fastify/helmet**     | ^12.0.0 | Security headers                      | Security                 |
| **vitest**              | ^4.0.0  | Fast, modern testing framework        | Testing                  |
| **@biomejs/biome**      | ^2.0.0  | Fast linting and formatting           | Code quality             |
| **@fulmenhq/tsfulmen**  | ^0.1.8  | Fulmen helper library                 | Ecosystem integration    |

## Configuration Management

### Three-Layer Loading

1. **Defaults**: Built-in sensible defaults for development
2. **File**: Optional YAML config file with XDG-compliant paths
3. **Environment**: Environment variables override file settings

### Config File Discovery

```
$XDG_CONFIG_HOME/fulmen/tuvan/config.yaml
~/.config/fulmen/tuvan/config.yaml (fallback)
```

### Environment Variables

All environment variables use the app identity prefix:

```bash
# Server configuration
TUVAN_SERVER_HOST=localhost
TUVAN_SERVER_PORT=8080

# Logging configuration
TUVAN_LOG_LEVEL=info
TUVAN_LOG_PROFILE=structured

# Metrics configuration
TUVAN_METRICS_ENABLED=true
```

## Observability Stack

### Logging Profiles

| Profile        | Use Case                   | Output                                   | Features                          |
| -------------- | -------------------------- | ---------------------------------------- | --------------------------------- |
| **SIMPLE**     | CLI tools, development     | Console output, basic severity           | Human-readable, color-coded       |
| **STRUCTURED** | Production services        | JSON output, correlation IDs, file sinks | Machine-parseable, searchable     |
| **ENTERPRISE** | Mission-critical workloads | Full envelope, middleware, throttling    | Policy enforcement, rate limiting |

### Metrics Collection

Built-in Prometheus metrics with standard exporters:

```typescript
// Counters for business metrics
import { counter } from '@fulmenhq/tsfulmen/telemetry';
const requestCounter = counter('http_requests_total');
requestCounter.inc();

// Gauges for system state
import { gauge } from '@fulmenhq/tsfulmen/telemetry';
const activeConnections = gauge('active_connections');
activeConnections.set(42);

// Histograms for performance
import { histogram } from '@fulmenhq/tsfulmen/telemetry';
const requestDuration = histogram('http_request_duration_seconds');
requestDuration.observe(0.123);
```

### Health Checks

Comprehensive health monitoring with:

- **Application Status**: Overall service health
- **Dependency Checks**: External service connectivity
- **Resource Metrics**: Memory, CPU, event loop metrics
- **Configuration Validation**: Required settings present

## Operational Patterns

### Graceful Shutdown

LIFO cleanup chain ensures proper resource release:

```typescript
import { onShutdown } from '@fulmenhq/tsfulmen/signals';

onShutdown(async () => {
  logger.info('Flushing metrics...');
  await telemetry.flush();
});

onShutdown(async () => {
  logger.info('Closing database...');
  await db.close();
});
```

### Config Reload

SIGHUP handling for zero-downtime configuration updates:

```typescript
import { onReload } from '@fulmenhq/tsfulmen/signals';

onReload(async () => {
  logger.info('Reloading configuration...');
  const newConfig = await loadConfig(configPath);
  if (!validateConfig(newConfig)) {
    throw new Error('Invalid config');
  }
  applyConfig(newConfig);
});
```

### Double-Tap Force Quit

Operator-friendly Ctrl+C handling with configurable window:

```typescript
import { enableDoubleTap } from '@fulmenhq/tsfulmen/signals';

enableDoubleTap({
  window: 2000, // 2 second window
  message: 'Press Ctrl+C again to force quit',
});
```

## CDRL Workflow

### Template Customization

The template is designed for CDRL (Clone → Degit → Refit → Launch):

1. **Clone**: `git clone` the repository
2. **Degit**: Remove git history
3. **Refit**: Customize `.fulmen/app.yaml`:
   ```yaml
   vendor: yourcompany
   binary_name: yourapp
   service_type: workhorse
   env_prefix: YOURAPP_
   config_name: yourapp
   ```
4. **Launch**: Run your customized application

Refer to the [Fulmen CDRL Guide](development/fulmen_cdrl_guide.md) for a detailed, step-by-step walkthrough of each phase. Once you've completed your own refit and no longer plan to distribute a reusable template, you can remove `docs/development/fulmen_cdrl_guide.md` from your project to avoid shipping internal guidance.

### Identity-Driven Customization

All application surfaces automatically adapt to your identity:

- **CLI Help**: Shows your app name and config paths
- **Logging**: Uses your app name as service identifier
- **Metrics**: Uses your telemetry namespace
- **Config**: Uses your vendor/config paths
- **Environment**: Uses your env var prefix

## Development Workflow

### Local Development

```bash
# Bootstrap development tools
make bootstrap

# Run tests
make test

# Build application
make build

# Run with hot reload
make run

# Lint and format
make lint
make fmt
```

### Quality Gates

```bash
# Full quality check
make check-all

# Individual checks
make test       # Run all tests
make lint       # Run Biome linting
make fmt        # Format code with Biome
make typecheck  # TypeScript type checking
make build      # Verify build succeeds
```

### Testing Strategy

- **Unit Tests**: Package-level testing with Vitest
- **Integration Tests**: End-to-end HTTP server testing
- **Observability Tests**: Logging and metrics validation
- **Signal Tests**: Graceful shutdown verification

## Production Deployment

### Container Support

Docker-ready with multi-stage builds:

```dockerfile
# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage
FROM oven/bun:1-slim
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/
WORKDIR /app
EXPOSE 8080
CMD ["bun", "run", "dist/index.js", "serve"]
```

### Configuration Management

Production-ready configuration patterns:

- **XDG Compliance**: Standard config directory locations
- **Environment First**: Production settings via env vars
- **Validation**: Schema validation for all configuration
- **Reload Support**: Zero-downtime configuration updates

### Observability Integration

- **Prometheus**: Standard metrics endpoint on `/metrics`
- **Structured Logs**: JSON format with correlation IDs
- **Health Endpoints**: `/health` for load balancer checks
- **Graceful Shutdown**: Proper resource cleanup on termination

## Security Considerations

### Input Validation

- **Schema Validation**: All configuration validated against schemas
- **Request Validation**: HTTP inputs validated with Fastify schemas
- **Path Safety**: Filesystem operations protected against traversal

### Operational Security

- **Signal Handling**: Proper signal handling prevents resource leaks
- **Graceful Shutdown**: Ensures data integrity on termination
- **Config Reload**: Validates configuration before applying changes
- **Helmet Integration**: Security headers via @fastify/helmet

## Performance Characteristics

### Resource Usage

- **Memory**: Efficient logging with Pino backend
- **CPU**: Minimal overhead for observability
- **Network**: Efficient HTTP routing with Fastify
- **Disk**: Lazy config loading with validation caching

### Scalability Patterns

- **Horizontal**: Stateless design supports multiple instances
- **Vertical**: Configurable resource limits and pools
- **Observability**: Built-in metrics for scaling decisions

## Extensibility Points

### Middleware Integration

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

// Add custom middleware to HTTP stack
async function customMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Custom logic here
}
```

### Logging Middleware

```typescript
import { createLogger } from '@fulmenhq/tsfulmen/logging';

const logger = createLogger('myapp', {
  profile: 'enterprise',
  middleware: [
    correlationMiddleware(),
    redactSecretsMiddleware(),
    customMiddleware(),
  ],
});
```

### Metrics Integration

```typescript
import { counter, gauge, histogram } from '@fulmenhq/tsfulmen/telemetry';

// Add custom metrics
const customCounter = counter('custom_operations_total');
const customGauge = gauge('custom_state');
const customHistogram = histogram('custom_duration_seconds');
```

## Standards Compliance

### Fulmen Forge Workhorse Standard

- 🚧 **App Identity**: `.fulmen/app.yaml` with dynamic configuration
- 🚧 **Signal Handling**: Cross-platform graceful shutdown and reload
- 🚧 **Exit Codes**: Standardized foundry exit codes
- 🚧 **Observability**: Structured logging and metrics
- 🚧 **Configuration**: Three-layer loading with XDG compliance
- 🚧 **CLI Framework**: Standard commands and help system

### Crucible Integration

- 🚧 **Schema Validation**: Embedded Crucible schemas for validation
- 🚧 **Standards Access**: Programmatic access to Crucible standards
- 🚧 **Version Alignment**: Synchronized with Crucible releases

## Current Status

🚧 **In Development** - Bootstrap phase active

**Completed:**
- ✅ Project planning and architecture
- ✅ Bootstrap plan documentation
- ✅ README and overview documentation
- ✅ .plans/ directory structure

**In Progress:**
- 🚧 Project structure setup
- 🚧 TypeScript configuration
- 🚧 Dependency installation

**Planned:**
- 📋 CLI framework implementation
- 📋 HTTP server with Fastify
- 📋 Standard endpoints
- 📋 Configuration management
- 📋 Observability integration
- 📋 Testing suite
- 📋 CI/CD setup

## Resources

### Documentation

- [README.md](../README.md) - Project overview and quick start
- [CDRL Guide](development/fulmen_cdrl_guide.md) - Full Clone → Degit → Refit → Launch instructions (safe to delete after refit if you ship a single app)
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development handbook (to be created)

### Standards & Specifications

- [Fulmen Forge Workhorse Standard](https://github.com/fulmenhq/crucible/blob/main/docs/architecture/fulmen-forge-workhorse-standard.md)
- [Fulmen Ecosystem Guide](https://github.com/fulmenhq/crucible/blob/main/docs/architecture/fulmen-ecosystem-guide.md)
- [Fulmen Technical Manifesto](https://github.com/fulmenhq/crucible/blob/main/docs/architecture/fulmen-technical-manifesto.md)

### External References

- [Fastify Documentation](https://fastify.dev/)
- [Commander.js](https://github.com/tj/commander.js)
- [Pino Logging](https://getpino.io/)
- [Vitest Testing](https://vitest.dev/)
- [Biome Linter](https://biomejs.dev/)

## Version Information

- **Current Version**: 0.0.1 (bootstrap)
- **TSFulmen Version**: 0.1.8+ (0.1.9 coming soon)
- **Crucible Version**: Embedded via tsfulmen
- **Node.js Version**: 20.0.0+
- **Bun Version**: 1.0.0+
- **TypeScript Version**: 5.7+
- **License**: MIT

## Contact & Support

- **Maintainer**: @3leapsdave (Dave Thompson)
- **AI Co-Maintainer**: ⚡ TypeScript Forge Engineer (@ts-forge-engineer)
- **Issues**: [GitHub Issues](https://github.com/fulmenhq/forge-workhorse-tuvan/issues)
- **Mattermost**: `#agents-tuvan` (provisioning in progress)

---

_This document serves as the comprehensive overview of the Tuvan template. For specific implementation details, see the package documentation and code comments once development progresses._
