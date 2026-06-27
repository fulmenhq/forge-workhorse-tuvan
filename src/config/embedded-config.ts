/**
 * Embedded config assets
 *
 * A compiled single-file binary (`bun build --compile`) carries no `config/` or
 * `schemas/` directory on disk, so tuvan's own defaults + schema cannot be read
 * from cwd-relative paths there. The build (scripts/build-all.ts) embeds the
 * defaults YAML and schema JSON via `bun --define`.
 *
 * tsfulmen >= 0.3.3 accepts inline config sources — a pre-parsed `defaults`
 * object and an inline `schema` string — so we hand the embedded content
 * straight to `loadConfig()` without the temp-file dance. tsfulmen >= 0.4.0
 * resolves its JSON-Schema metaschemas from build-embedded assets, so schema
 * validation works inside the binary too (no more skip-validation workaround).
 *
 * In dev/node runs the identifiers are undefined and on-disk assets are used.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

declare const __EMBEDDED_CONFIG_DEFAULTS__: string | undefined;
declare const __EMBEDDED_CONFIG_SCHEMA__: string | undefined;

function injectedConfigDefaults(): string | null {
  return typeof __EMBEDDED_CONFIG_DEFAULTS__ !== "undefined" ? __EMBEDDED_CONFIG_DEFAULTS__ : null;
}

function injectedConfigSchema(): string | null {
  return typeof __EMBEDDED_CONFIG_SCHEMA__ !== "undefined" ? __EMBEDDED_CONFIG_SCHEMA__ : null;
}

/**
 * Resolved config source for tsfulmen's `loadConfig()`.
 *
 * - `path`: on-disk defaults + schema files (dev/node runs from the repo).
 * - `inline`: build-embedded defaults (pre-parsed) + schema string (compiled
 *   single-file binaries, where the assets are not on disk).
 *
 * Both forms drive full schema validation; the binary no longer skips it.
 */
export type ConfigSource =
  | { kind: "path"; defaultsPath: string; schemaPath: string }
  | { kind: "inline"; defaults: Record<string, unknown>; schema: string };

/**
 * Resolve tuvan's config defaults + schema to a source `loadConfig()` accepts.
 *
 * Precedence:
 * 1. On-disk assets (cwd-relative) when present — dev/node runs from the repo.
 * 2. Build-time embedded copies, passed inline (compiled single-file binaries).
 *
 * @returns the resolved source, or null if neither on-disk nor embedded assets
 *          are available.
 */
export function resolveConfigSource(defaultsRel: string, schemaRel: string): ConfigSource | null {
  const onDiskDefaults = resolve(defaultsRel);
  const onDiskSchema = resolve(schemaRel);
  if (existsSync(onDiskDefaults) && existsSync(onDiskSchema)) {
    return { kind: "path", defaultsPath: onDiskDefaults, schemaPath: onDiskSchema };
  }

  const defaults = injectedConfigDefaults();
  const schema = injectedConfigSchema();
  if (defaults === null || schema === null) {
    return null;
  }

  return { kind: "inline", defaults: parseYaml(defaults) as Record<string, unknown>, schema };
}
