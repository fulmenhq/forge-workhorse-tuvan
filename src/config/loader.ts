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

import { readFileSync } from "node:fs";
import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { createStructuredLogger } from "@fulmenhq/tsfulmen/logging";
// TODO: Add tuvan_config_reload_total to Tuvan metrics taxonomy
// import { metrics } from "@fulmenhq/tsfulmen/telemetry";
import { parse as parseYaml } from "yaml";
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
 * Currently implements Layer 1 (defaults) only.
 *
 * @returns Fully merged and validated config
 * @throws ConfigInvalidError if config validation fails
 */
export async function loadConfig(): Promise<TuvanConfig> {
  const logger = getLogger();
  const identity = await loadIdentity();

  const defaultsPath = "config/tuvan/v1.0.0/tuvan-defaults.yaml";

  logger.debug("Loading configuration", {
    defaultsPath,
    envPrefix: identity.app.env_prefix,
  });

  try {
    // Layer 1: Load defaults from YAML
    const yamlContent = readFileSync(defaultsPath, "utf-8");
    const config = parseYaml(yamlContent) as TuvanConfig;

    // TODO: Add schema validation when tsfulmen/config provides it
    // TODO: Add Layer 2 (user config) when tsfulmen/config supports it
    // TODO: Add Layer 3 (env vars) when tsfulmen/config supports it

    // Build metadata for introspection
    const metadata: ConfigMetadata = {
      defaultsPath,
      userConfigPath: null, // Layer 2 not implemented yet
      envPrefix: identity.app.env_prefix,
      identity: {
        vendor: identity.app.vendor,
        binaryName: identity.app.binary_name,
      },
      activeLayers: ["defaults"], // Only Layer 1 active for now
    };

    // Cache config WITH metadata
    cachedConfigWithMetadata = { config, metadata };

    logger.info("Configuration loaded successfully", {
      server: `${config.server.host}:${config.server.port}`,
      loggingProfile: config.logging.profile,
      metricsEnabled: config.metrics.enabled,
    });

    return config;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Configuration load failed", err);
    throw new ConfigInvalidError("Failed to load configuration", {
      field: "config",
      expected: "valid YAML",
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
