---
title: "Development"
description: "Local development workflow for forge-workhorse-tuvan"
author: "Fulmen Workhorse Maintainers"
date: "2026-01-28"
last_updated: "2026-01-28"
status: "active"
tags: ["development", "workhorse", "typescript", "tuvan"]
---

# Development

## Prerequisites

- Node.js 20+
- Bun 1+
- Make

## Setup

```bash
make bootstrap
make tools
```

## Common Targets

```bash
make fmt
make lint
make typecheck
make test
make check-all
make build
make run
make doctor
```

## App Identity

Validate the template identity file:

```bash
make validate-app-identity
```

Ensure the built output contains a copy of identity + version (for running outside the repo):

```bash
make sync-embedded-identity
make verify-embedded-identity
```

## Planes (Local Dev)

`make run` / `tuvan serve` starts:

- Data plane: `http://localhost:8080`
- Control plane: `http://127.0.0.1:8081` (base path default `/control`)

If you enable data plane auth for local testing:

```bash
export TUVAN_AUTH_ENABLED=true
export TUVAN_AUTH_MODE=basicAuth
export TUVAN_AUTH_BASIC_USER=admin
export TUVAN_AUTH_BASIC_PASSWORD=change-me
```
