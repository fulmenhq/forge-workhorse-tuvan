---
title: "Data Plane Auth and Route Policy"
description: "Add a starter auth mechanism and an allowlist/denylist policy for the data plane"
author: "forge-workhorse-tuvan maintainers"
date: "2026-01-28"
status: "accepted"
tags: ["adr", "auth", "data-plane", "policy", "workhorse"]
---

# ADR-0003: Data Plane Auth and Route Policy

## Context

CDRL users often need a quick, low-complexity way to gate endpoints while they stand up a production-grade auth solution.
We want to provide starter auth without forcing it on by default.

We also need a simple way to express three endpoint categories:

- Denied (not exposed)
- Public (allowed with no auth)
- Conditional (allowed with no auth, but may return more detail when authenticated)
- Protected (requires auth)

## Decision

We add `dataPlaneAuth` to config and wire it into the data plane server via a Fastify hook.

- Default: `dataPlaneAuth.enabled=false`
- Starter modes: `basicAuth` and `bearerToken`
- Policy is expressed as prefix lists evaluated in order:
  1. `denyPrefixes`
  2. `publicPrefixes`
  3. `conditionalPrefixes`
  4. `protectedPrefixes`
  - If no prefixes match, the default is `protected` when auth is enabled.

The hook attaches `request.auth` and `request.authCategory` so handlers can implement the conditional “more detail if authenticated” pattern when appropriate.

## Consequences

Positive:

- CDRL users can enable auth quickly with a small set of env vars.
- Route categorization is explicit and easy to reason about.
- Conditional responses are supported without forcing information disclosure.

Tradeoffs:

- Prefix policy is intentionally simple; complex routing/auth rules should move to a real auth middleware layer.
- OpenAPI security metadata is not fully per-route unless consumers add it.
