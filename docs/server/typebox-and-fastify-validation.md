---
title: "TypeBox and Fastify Validation"
description: "How this template uses TypeBox schemas for runtime validation and OpenAPI"
author: "Fulmen Workhorse Maintainers"
date: "2026-01-28"
last_updated: "2026-01-28"
status: "active"
tags: ["typebox", "fastify", "ajv", "openapi", "validation"]
---

# TypeBox and Fastify Validation

This workhorse uses TypeBox schemas inside Fastify route `schema` blocks.

## What You Get

- Runtime validation: Fastify validates request input with AJV before your handler runs.
- OpenAPI: `@fastify/swagger` reads the same schemas to produce `/openapi.yaml`.

## Conventions

### Reject Unknown Fields

For request objects, prefer:

```ts
Type.Object(
  {
    name: Type.String(),
  },
  { additionalProperties: false },
);
```

This prevents silently accepting fields that your handler ignores.

### Use Constraints

Add constraints for anything operationally meaningful:

- `minLength` / `maxLength`
- `pattern`
- `enum`

### Formats

If you use JSON Schema `format` values like `uuid`, ensure AJV has format support enabled.
Without this, formats may be treated as documentation-only.

## Conditional Responses

If an endpoint can return a minimal response unauthenticated and a richer response authenticated,
document it explicitly (e.g. `oneOf` for the response schema) and keep handler behavior aligned.
