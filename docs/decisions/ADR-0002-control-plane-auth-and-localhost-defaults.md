---
title: "Control Plane Auth and Localhost Defaults"
description: "Default control plane binding to loopback and provide a starter bearer-token auth mechanism"
author: "forge-workhorse-tuvan maintainers"
date: "2026-01-28"
status: "accepted"
tags: ["adr", "auth", "security", "control-plane", "workhorse"]
---

# ADR-0002: Control Plane Auth and Localhost Defaults

## Context

Workhorse templates must ship with reliable operational patterns, but must not encourage insecure defaults.

Control endpoints (e.g. signal injection) are sensitive:

- They should not be publicly reachable by default.
- They should have a low-complexity auth option that downstream users can keep or replace.

## Decision

We adopt the following default posture:

- The control plane binds to loopback by default (`127.0.0.1`).
- Control endpoints support a simple **bearer token** auth mode.
- If the control plane is configured to bind to a non-loopback host, the template enforces:
  - `controlPlane.auth.mode` must be `bearerToken`
  - `controlPlane.auth.bearerToken` must be set and reasonably long (>= 16 chars)

For local development, when `bearerToken` is not configured and the request originates from loopback,
the control plane can optionally allow requests (`allowUnauthenticatedLoopback: true`).

## Consequences

Positive:

- Safe-by-default exposure: loopback binding prevents accidental remote access.
- Starter auth is simple enough for CDRL users to keep initially.
- Remote exposure requires an explicit decision and configuration.

Tradeoffs:

- Bearer token auth is intentionally minimal; production deployments should replace or strengthen it (mTLS, OIDC, etc.).
- Loopback unauth allowance is a convenience; users should disable it in hardened environments.

## Alternatives Considered

- No auth (loopback-only): rejected (encourages unsafe promotion to non-loopback).
- mTLS by default: rejected (too complex for template bootstrap).
- Basic auth: rejected (worse ergonomics and password-handling expectations).
