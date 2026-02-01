---
title: "Telemetry Plane Deferred"
description: "Keep telemetry endpoints on the data plane for now; reserve future split"
author: "forge-workhorse-tuvan maintainers"
date: "2026-01-28"
status: "accepted"
tags: ["adr", "telemetry", "metrics", "health", "workhorse"]
---

# ADR-0004: Telemetry Plane Deferred

## Context

Some deployments prefer separating operational telemetry endpoints (e.g. `/metrics`, sometimes `/health`) onto a separate port or interface.
This can reduce exposure and simplify firewalling.

However, a third HTTP server increases template complexity and introduces more cross-plane decisions (what belongs where, how to auth, how to document OpenAPI).

## Decision

We do not introduce a dedicated telemetry plane server in this repo at this time.

- `/metrics` remains on the data plane and can be protected using `dataPlaneAuth` policy.
- `/health/*` remains public by default for orchestrator integration.
- The existing `metrics.port` config remains reserved for a future split if we decide to formalize it.

## Consequences

- The template stays simpler (two planes instead of three).
- Downstream users can still isolate metrics by enabling auth or handling it at the network layer.
