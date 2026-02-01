---
title: "Control Plane and Data Plane Split"
description: "Introduce a separate control plane server with configurable base path and port"
author: "forge-workhorse-tuvan maintainers"
date: "2026-01-28"
status: "accepted"
tags: ["adr", "control-plane", "data-plane", "fastify", "workhorse"]
---

# ADR-0001: Control Plane and Data Plane Split

## Context

This repository is a workhorse template. We need a clear, safe-by-default pattern for:

- Operational endpoints (signal injection, admin controls)
- Minimizing exposure of control endpoints
- Allowing separate ports/binds for application (data plane) vs operations (control plane)

The template previously implied a single HTTP surface and had no explicit plane concept.

## Decision

We introduce a separate **control plane** Fastify server alongside the existing **data plane** server.

- Data plane continues to serve public endpoints (e.g. `/health`, `/version`, `/metrics`, `/openapi.yaml`).
- Control plane serves operational endpoints under a configurable `basePath` (default: `/control`).
- Control plane runs on its own configurable host/port (default: `127.0.0.1:8081`).

Configuration is added to `TuvanConfig`:

- `server` (data plane; existing)
- `controlPlane` (new)

## Consequences

Positive:

- Enables distinct bind/port separation for operational endpoints.
- Supports a safer default posture (control plane on loopback by default).
- Allows downstream consumers to harden or re-route control endpoints without invasive refactors.

Tradeoffs:

- OpenAPI specs are generated per-server; data plane OpenAPI will not include control plane endpoints.
- Two Fastify instances increases wiring complexity (startup/shutdown orchestration).

## Alternatives Considered

- Single server with a hardcoded `/control` prefix: rejected (cannot separate ports; harder to secure by default).
- Single server with configurable prefix: rejected (still no port separation).
- Dedicated “metrics plane” as a third server: deferred (not required for initial control-plane compliance).
