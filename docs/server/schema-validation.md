---
title: "Schema Validation"
description: "JSON Schema draft support and format enforcement in forge-workhorse-tuvan"
author: "Fulmen Workhorse Maintainers"
date: "2026-02-01"
last_updated: "2026-02-01"
status: "active"
tags: ["jsonschema", "ajv", "validation", "workhorse"]
---

# Schema Validation

This workhorse relies on JSON Schema in two places:

- Config validation (defaults -> user -> env)
- Runtime HTTP validation (Fastify route schemas)

## Supported Drafts

Via `@fulmenhq/tsfulmen/schema`, this template supports multiple common JSON Schema dialects:

- Draft-04: `http://json-schema.org/draft-04/schema#`
- Draft-06: `http://json-schema.org/draft-06/schema#`
- Draft-07: `http://json-schema.org/draft-07/schema#`
- Draft 2019-09: `https://json-schema.org/draft/2019-09/schema`
- Draft 2020-12: `https://json-schema.org/draft/2020-12/schema`

New schemas should prefer Draft 2020-12.

## Format Enforcement (uuid, email, uri, ...)

Fastify uses AJV for JSON Schema validation, but `format` support is not always enabled by default.

This template configures Fastify to apply Fulmen-standard formats so `format: "uuid"` and similar keywords are enforced.

## References

- `@fulmenhq/tsfulmen` guide: `docs/guides/fastify-ajv-formats.md`
