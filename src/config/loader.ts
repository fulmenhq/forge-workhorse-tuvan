/**
 * Three-Layer Config Loader
 *
 * Loads configuration from:
 *   Layer 1: Template defaults (config/tuvan/v1.0.0/tuvan-defaults.yaml)
 *   Layer 2: User config (~/.config/fulmen/tuvan/config.yaml) [TODO]
 *   Layer 3: Environment variables (TUVAN_*) [TODO]
 *
 * CLI flags are applied as post-load overrides (handled by caller).
 *
 * NOTE: Currently implements Layer 1 only. Layers 2-3 will be added when
 * tsfulmen/config module provides three-layer loading support.
 */

import { resolve } from "node:path";
import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { loadConfig as tsfulmenLoadConfig } from "@fulmenhq/tsfulmen/config";
import { createStructuredLogger } from "@fulmenhq/tsfulmen/logging";
import type { ConfigMetadata, ConfigWithMetadata, TuvanConfig } from "./types.js";
import { ConfigInvalidError } from "./types.js";

let cachedConfigWithMetadata: ConfigWithMetadata | null = null;

// Logger for config operations (initialized on first use)
let configLogger: ReturnType<typeof createStructuredLogger> | null = null;

/**
 * Get or create the config logger
 */
function getLogger() {
  if (!configLogger) {
    configLogger = createStructuredLogger("tuvan.config");
  }
  return configLogger;
}

/**
 * Load configuration from all three layers
 *
 * Layers:
 * 1. Defaults: config/tuvan/v1.0.0/tuvan-defaults.yaml
 * 2. User: ~/.config/fulmen/tuvan/config.yaml (XDG paths)
 * 3. Env: TUVAN_* environment variables
 *
 * @returns Fully merged and validated config
 * @throws ConfigInvalidError if config validation fails
 */
export async function loadConfig(): Promise<TuvanConfig> {
  const logger = getLogger();
  const identity = await loadIdentity();

  const defaultsPath = resolve("config/tuvan/v1.0.0/tuvan-defaults.yaml");
  const schemaPath = resolve("schemas/tuvan/v1.0.0/config.schema.json");

  logger.debug("Loading configuration", {
    defaultsPath,
    schemaPath,
    envPrefix: identity.app.env_prefix,
  });

  try {
    // Load via tsfulmen (handles layers 1, 2, 3 and validation)
    const result = await tsfulmenLoadConfig<TuvanConfig>({
      identity: {
        vendor: identity.app.vendor,
        app: identity.app.binary_name,
      },
      defaultsPath,
      schemaPath,
      envPrefix: identity.app.env_prefix.endsWith("_")
        ? identity.app.env_prefix.slice(0, -1)
        : identity.app.env_prefix,
    });

    // Build metadata for introspection
    const metadata: ConfigMetadata = {
      defaultsPath: result.metadata.defaultsPath,
      userConfigPath: result.metadata.userConfigPath,
      envPrefix: result.metadata.envPrefix,
      identity: {
        vendor: identity.app.vendor,
        binaryName: identity.app.binary_name,
      },
      activeLayers: result.metadata.activeLayers as ("defaults" | "user" | "env" | "cli")[],
    };

    // Cache config WITH metadata
    cachedConfigWithMetadata = { config: result.config, metadata };

    logger.info("Configuration loaded successfully", {
      server: `${result.config.server.host}:${result.config.server.port}`,
      loggingProfile: result.config.logging.profile,
      metricsEnabled: result.config.metrics.enabled,
      activeLayers: metadata.activeLayers,
    });

    return result.config;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Configuration load failed", err);

    // Map tsfulmen errors to our ConfigInvalidError
    // If it's a schema validation error, tsfulmen might provide details we could extract
    // For now, we pass the message through
    throw new ConfigInvalidError("Failed to load configuration", {
      field: "config",
      expected: "valid configuration matching schema",
      actual: err.message,
    });
  }
}

/**
 * Reload configuration from disk
 *
 * Used by SIGHUP handler to reload user config changes.
 * Validates reloaded config before returning.
 *
 * @returns Newly loaded config
 * @throws ConfigInvalidError if reloaded config is invalid (preserves current config)
 */
export async function reloadConfig(): Promise<TuvanConfig> {
  const logger = getLogger();

  logger.info("Reloading configuration");

  try {
    // Load fresh config (bypasses cache)
    const newConfig = await loadConfig();

    // TODO: Track successful reload with tuvan_config_reload_total{result="success"}
    // metrics.counter("tuvan_config_reload_total").inc(1, { result: "success" });

    logger.info("Configuration reloaded successfully");

    return newConfig;
  } catch (error) {
    // TODO: Track failed reload with tuvan_config_reload_total{result="failure"}
    // metrics.counter("tuvan_config_reload_total").inc(1, { result: "failure" });

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Configuration reload failed", err);

    throw error;
  }
}

/**
 * Get currently loaded config with metadata (from cache)
 *
 * @returns Cached config with metadata or null if not loaded yet
 */
export function getCurrentConfig(): ConfigWithMetadata | null {
  return cachedConfigWithMetadata;
}

/**
 * Validate CLI option as integer within range
 *
 * @param value - String value from CLI flag
 * @param name - Field name for error messages
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Parsed integer
 * @throws ConfigInvalidError if validation fails
 */
function validateCliInteger(value: string, name: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new ConfigInvalidError(`${name}: must be a valid integer`, {
      field: name,
      expected: "integer",
      actual: value,
    });
  }

  if (parsed < min || parsed > max) {
    throw new ConfigInvalidError(`${name}: must be between ${min} and ${max}`, {
      field: name,
      expected: `${min}-${max}`,
      actual: parsed,
    });
  }

  return parsed;
}

/**
 * Apply CLI flag overrides to loaded config
 *
 * tsfulmen loader handles defaults → user → env, but doesn't know
 * about Commander CLI flags. This function applies CLI overrides
 * to preserve the full precedence chain:
 *   CLI flags > Env vars > User config > Template defaults
 *
 * Validates CLI inputs to prevent NaN/invalid values from bypassing schema validation.
 *
 * @param config - Base config from three-layer loader
 * @param cliOptions - CLI options from Commander
 * @returns Config with CLI overrides applied
 * @throws ConfigInvalidError if CLI options fail validation (exit code 30)
 */
export function applyCliOverrides(
  config: TuvanConfig,
  cliOptions: { host?: string; port?: string },
): TuvanConfig {
  const logger = getLogger();

  // Validate port if provided (prevent NaN from parseInt)
  const portOverride = cliOptions.port
    ? validateCliInteger(cliOptions.port, "server.port", 1, 65535)
    : config.server.port;

  const hasOverrides = cliOptions.host !== undefined || cliOptions.port !== undefined;

  if (hasOverrides) {
    logger.debug("Applying CLI overrides", cliOptions);

    // Update metadata to reflect CLI layer
    if (cachedConfigWithMetadata) {
      cachedConfigWithMetadata.metadata.activeLayers.push("cli");
    }
  }

  return {
    ...config,
    server: {
      ...config.server,
      host: cliOptions.host ?? config.server.host,
      port: portOverride,
    },
  };
}
