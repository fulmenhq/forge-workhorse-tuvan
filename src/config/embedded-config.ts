/**
 * Embedded config assets
 *
 * tsfulmen's loadConfig() reads its defaults + schema from filesystem PATHS, not
 * inline content. A compiled single-file binary (`bun build --compile`) carries
 * no `config/` or `schemas/` directory on disk, so the usual cwd-relative paths
 * resolve to files that do not exist and config load fails (ENOENT).
 *
 * The build (scripts/build-all.ts) embeds the defaults YAML and schema JSON via
 * `bun --define`. At runtime, when the on-disk assets are absent, we materialize
 * the embedded copies to a temp directory once and hand those real paths to
 * loadConfig(). In dev/node runs the identifiers are undefined and on-disk assets
 * are used as before.
 */

import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

declare const __EMBEDDED_CONFIG_DEFAULTS__: string | undefined;
declare const __EMBEDDED_CONFIG_SCHEMA__: string | undefined;

function injectedConfigDefaults(): string | null {
  return typeof __EMBEDDED_CONFIG_DEFAULTS__ !== "undefined" ? __EMBEDDED_CONFIG_DEFAULTS__ : null;
}

function injectedConfigSchema(): string | null {
  return typeof __EMBEDDED_CONFIG_SCHEMA__ !== "undefined" ? __EMBEDDED_CONFIG_SCHEMA__ : null;
}

export interface ConfigAssetPaths {
  defaultsPath: string;
  schemaPath: string;
  /** True when the paths point at temp files materialized from embedded content. */
  embedded: boolean;
}

let materialized: ConfigAssetPaths | null = null;

/**
 * Resolve the config defaults + schema to real filesystem paths that
 * tsfulmen's loadConfig() can read.
 *
 * Precedence:
 * 1. On-disk assets (cwd-relative) when present — dev/node runs from the repo.
 * 2. Build-time embedded copies, materialized to a temp dir once (compiled
 *    single-file binaries, where the assets are not on disk).
 *
 * @returns the resolved paths, or null if neither on-disk nor embedded assets
 *          are available.
 */
export function resolveConfigAssetPaths(
  defaultsRel: string,
  schemaRel: string,
): ConfigAssetPaths | null {
  const onDiskDefaults = resolve(defaultsRel);
  const onDiskSchema = resolve(schemaRel);
  if (existsSync(onDiskDefaults) && existsSync(onDiskSchema)) {
    return { defaultsPath: onDiskDefaults, schemaPath: onDiskSchema, embedded: false };
  }

  if (materialized) {
    return materialized;
  }

  const defaults = injectedConfigDefaults();
  const schema = injectedConfigSchema();
  if (defaults === null || schema === null) {
    return null;
  }

  const dir = mkdtempSync(join(tmpdir(), "tuvan-config-"));
  const defaultsPath = join(dir, "tuvan-defaults.yaml");
  const schemaPath = join(dir, "config.schema.json");
  writeFileSync(defaultsPath, defaults, "utf-8");
  writeFileSync(schemaPath, schema, "utf-8");
  materialized = { defaultsPath, schemaPath, embedded: true };
  return materialized;
}
