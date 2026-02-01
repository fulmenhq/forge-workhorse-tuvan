/**
 * Three-Layer Config Loader
 *
 * Loads configuration from:
 *   Layer 1: Template defaults (config/tuvan/v1.0.0/tuvan-defaults.yaml)
 *   Layer 2: User config (~/.config/fulmen/tuvan/config.yaml)
 *   Layer 3: Environment variables (TUVAN_*)
 *
 * CLI flags are applied as post-load overrides (handled by caller).
 *
 * This loader delegates the three-layer merge + schema validation to
 * `@fulmenhq/tsfulmen/config` and then applies small template-friendly env
 * aliases plus workhorse invariants.
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

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1";
}

function normalizeBasePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed === "") return "/control";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // Strip trailing slash (except root)
  if (withLeading.length > 1 && withLeading.endsWith("/")) {
    return withLeading.slice(0, -1);
  }
  return withLeading;
}

function getEnvKey(prefix: string, name: string): string {
  const p = prefix.endsWith("_") ? prefix : `${prefix}_`;
  return `${p}${name}`;
}

function applyEnvAliases(
  identityEnvPrefix: string,
  config: TuvanConfig,
  logger: ReturnType<typeof getLogger>,
): { config: TuvanConfig; usedAliases: string[] } {
  // This repo documents Fulmen-standard env vars like TUVAN_PORT and TUVAN_HOST.
  // tsfulmen/config maps nested fields via e.g. TUVAN_SERVER_PORT -> server.port.
  // We support both by applying these aliases after the three-layer loader.

  const usedAliases: string[] = [];

  const host = process.env[getEnvKey(identityEnvPrefix, "HOST")];
  const port = process.env[getEnvKey(identityEnvPrefix, "PORT")];

  // Canonical (tsfulmen/config) nested keys for server
  const serverHost = process.env[getEnvKey(identityEnvPrefix, "SERVER_HOST")];
  const serverPort = process.env[getEnvKey(identityEnvPrefix, "SERVER_PORT")];

  const controlHost = process.env[getEnvKey(identityEnvPrefix, "CONTROL_PLANE_HOST")];
  const controlPort = process.env[getEnvKey(identityEnvPrefix, "CONTROL_PLANE_PORT")];
  const adminBasePath = process.env[getEnvKey(identityEnvPrefix, "ADMIN_BASE_PATH")];
  const adminToken = process.env[getEnvKey(identityEnvPrefix, "ADMIN_TOKEN")];

  // Logging aliases (template ergonomics)
  const logLevel = process.env[getEnvKey(identityEnvPrefix, "LOG_LEVEL")];
  const logProfile = process.env[getEnvKey(identityEnvPrefix, "LOG_PROFILE")];

  // Canonical nested keys for logging
  const loggingLevel = process.env[getEnvKey(identityEnvPrefix, "LOGGING_LEVEL")];
  const loggingProfile = process.env[getEnvKey(identityEnvPrefix, "LOGGING_PROFILE")];

  // Data plane auth aliases (short keys for template ergonomics)
  const authEnabled = process.env[getEnvKey(identityEnvPrefix, "AUTH_ENABLED")];
  const authMode = process.env[getEnvKey(identityEnvPrefix, "AUTH_MODE")];
  const authBearerToken = process.env[getEnvKey(identityEnvPrefix, "AUTH_BEARER_TOKEN")];
  const authBasicUser = process.env[getEnvKey(identityEnvPrefix, "AUTH_BASIC_USER")];
  const authBasicPassword = process.env[getEnvKey(identityEnvPrefix, "AUTH_BASIC_PASSWORD")];

  let next = config;

  if (
    host !== undefined &&
    serverHost !== undefined &&
    host.trim() !== "" &&
    serverHost.trim() !== "" &&
    host.trim() !== serverHost.trim()
  ) {
    logger.warn("Conflicting env vars for server.host; alias will take precedence", {
      alias: getEnvKey(identityEnvPrefix, "HOST"),
      canonical: getEnvKey(identityEnvPrefix, "SERVER_HOST"),
      aliasValue: host,
      canonicalValue: serverHost,
    });
  }

  if (
    port !== undefined &&
    serverPort !== undefined &&
    port.trim() !== "" &&
    serverPort.trim() !== "" &&
    port.trim() !== serverPort.trim()
  ) {
    logger.warn("Conflicting env vars for server.port; alias will take precedence", {
      alias: getEnvKey(identityEnvPrefix, "PORT"),
      canonical: getEnvKey(identityEnvPrefix, "SERVER_PORT"),
      aliasValue: port,
      canonicalValue: serverPort,
    });
  }

  if (host !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "HOST"));
    next = {
      ...next,
      server: {
        ...next.server,
        host,
      },
    };
  }

  if (port !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "PORT"));
    next = {
      ...next,
      server: {
        ...next.server,
        port: validateCliInteger(port, "server.port", 1, 65535),
      },
    };
  }

  if (controlHost !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "CONTROL_PLANE_HOST"));
    next = {
      ...next,
      controlPlane: {
        ...next.controlPlane,
        host: controlHost,
      },
    };
  }

  if (controlPort !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "CONTROL_PLANE_PORT"));
    next = {
      ...next,
      controlPlane: {
        ...next.controlPlane,
        port: validateCliInteger(controlPort, "controlPlane.port", 1, 65535),
      },
    };
  }

  if (adminBasePath !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "ADMIN_BASE_PATH"));
    next = {
      ...next,
      controlPlane: {
        ...next.controlPlane,
        basePath: normalizeBasePath(adminBasePath),
      },
    };
  }

  if (adminToken !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "ADMIN_TOKEN"));
    next = {
      ...next,
      controlPlane: {
        ...next.controlPlane,
        auth: {
          ...next.controlPlane.auth,
          bearerToken: adminToken,
        },
      },
    };
  }

  if (
    logLevel !== undefined &&
    loggingLevel !== undefined &&
    logLevel.trim() !== "" &&
    loggingLevel.trim() !== "" &&
    logLevel.trim() !== loggingLevel.trim()
  ) {
    logger.warn("Conflicting env vars for logging.level; alias will take precedence", {
      alias: getEnvKey(identityEnvPrefix, "LOG_LEVEL"),
      canonical: getEnvKey(identityEnvPrefix, "LOGGING_LEVEL"),
      aliasValue: logLevel,
      canonicalValue: loggingLevel,
    });
  }

  if (
    logProfile !== undefined &&
    loggingProfile !== undefined &&
    logProfile.trim() !== "" &&
    loggingProfile.trim() !== "" &&
    logProfile.trim() !== loggingProfile.trim()
  ) {
    logger.warn("Conflicting env vars for logging.profile; alias will take precedence", {
      alias: getEnvKey(identityEnvPrefix, "LOG_PROFILE"),
      canonical: getEnvKey(identityEnvPrefix, "LOGGING_PROFILE"),
      aliasValue: logProfile,
      canonicalValue: loggingProfile,
    });
  }

  if (logLevel !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "LOG_LEVEL"));
    const level = logLevel.trim();
    if (
      level === "trace" ||
      level === "debug" ||
      level === "info" ||
      level === "warn" ||
      level === "error" ||
      level === "fatal"
    ) {
      next = {
        ...next,
        logging: {
          ...next.logging,
          level,
        },
      };
    } else {
      logger.warn("Ignoring invalid LOG_LEVEL env var", {
        key: getEnvKey(identityEnvPrefix, "LOG_LEVEL"),
        value: logLevel,
      });
    }
  }

  if (logProfile !== undefined) {
    usedAliases.push(getEnvKey(identityEnvPrefix, "LOG_PROFILE"));
    const profile = logProfile.trim();
    if (profile === "simple" || profile === "structured" || profile === "enterprise") {
      next = {
        ...next,
        logging: {
          ...next.logging,
          profile,
        },
      };
    } else {
      logger.warn("Ignoring invalid LOG_PROFILE env var", {
        key: getEnvKey(identityEnvPrefix, "LOG_PROFILE"),
        value: logProfile,
      });
    }
  }

  if (authEnabled !== undefined) {
    const enabled = authEnabled.trim().toLowerCase();
    next = {
      ...next,
      dataPlaneAuth: {
        ...next.dataPlaneAuth,
        enabled: enabled === "true" || enabled === "1" || enabled === "yes" || enabled === "on",
      },
    };
  }

  if (authMode !== undefined) {
    const mode = authMode.trim();
    if (mode === "disabled" || mode === "bearerToken" || mode === "basicAuth") {
      next = {
        ...next,
        dataPlaneAuth: {
          ...next.dataPlaneAuth,
          auth: {
            ...next.dataPlaneAuth.auth,
            mode,
          },
        },
      };
    }
  }

  if (authBearerToken !== undefined) {
    next = {
      ...next,
      dataPlaneAuth: {
        ...next.dataPlaneAuth,
        auth: {
          ...next.dataPlaneAuth.auth,
          bearerToken: authBearerToken,
        },
      },
    };
  }

  if (authBasicUser !== undefined) {
    next = {
      ...next,
      dataPlaneAuth: {
        ...next.dataPlaneAuth,
        auth: {
          ...next.dataPlaneAuth.auth,
          basicUser: authBasicUser,
        },
      },
    };
  }

  if (authBasicPassword !== undefined) {
    next = {
      ...next,
      dataPlaneAuth: {
        ...next.dataPlaneAuth,
        auth: {
          ...next.dataPlaneAuth.auth,
          basicPassword: authBasicPassword,
        },
      },
    };
  }

  return { config: next, usedAliases };
}

function validateControlPlaneConfig(config: TuvanConfig): void {
  if (!config.controlPlane.enabled) return;

  if (config.controlPlane.port === config.server.port) {
    throw new ConfigInvalidError("controlPlane.port must not equal server.port", {
      field: "controlPlane.port",
      expected: "a port different from server.port",
      actual: config.controlPlane.port,
    });
  }

  const isLoopback = isLoopbackHost(config.controlPlane.host);
  const token = (config.controlPlane.auth.bearerToken || "").trim();
  const authMode = config.controlPlane.auth.mode;

  if (!isLoopback) {
    if (authMode !== "bearerToken") {
      throw new ConfigInvalidError(
        "Control plane must require auth when bound to a non-loopback host",
        {
          field: "controlPlane.auth.mode",
          expected: "bearerToken",
          actual: authMode,
        },
      );
    }
    if (token.length < 16) {
      throw new ConfigInvalidError(
        "Control plane bearer token must be set (>= 16 chars) when bound to a non-loopback host",
        {
          field: "controlPlane.auth.bearerToken",
          expected: ">= 16 characters",
          actual: token.length,
        },
      );
    }
  }
}

function validateDataPlaneAuthConfig(config: TuvanConfig): void {
  if (!config.dataPlaneAuth.enabled) return;

  const mode = config.dataPlaneAuth.auth.mode;
  if (mode === "disabled") {
    throw new ConfigInvalidError("dataPlaneAuth.enabled=true requires auth.mode != disabled", {
      field: "dataPlaneAuth.auth.mode",
      expected: "bearerToken or basicAuth",
      actual: mode,
    });
  }

  if (mode === "bearerToken") {
    const token = (config.dataPlaneAuth.auth.bearerToken || "").trim();
    if (token.length < 16) {
      throw new ConfigInvalidError("data plane bearer token must be set (>= 16 chars)", {
        field: "dataPlaneAuth.auth.bearerToken",
        expected: ">= 16 characters",
        actual: token.length,
      });
    }
  }

  if (mode === "basicAuth") {
    const user = (config.dataPlaneAuth.auth.basicUser || "").trim();
    const pass = (config.dataPlaneAuth.auth.basicPassword || "").trim();
    if (user === "" || pass === "") {
      throw new ConfigInvalidError("data plane basic auth requires basicUser and basicPassword", {
        field: "dataPlaneAuth.auth.basicUser/basicPassword",
        expected: "non-empty",
        actual: { userLength: user.length, passwordLength: pass.length },
      });
    }
  }
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

  // Most processes load config once at startup.
  // Caching avoids repeated schema compilation work in tests and long-running processes.
  if (cachedConfigWithMetadata) {
    return cachedConfigWithMetadata.config;
  }

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

    // Apply env var aliases for template-friendly keys (TUVAN_PORT, etc.)
    const aliasResult = applyEnvAliases(identity.app.env_prefix, result.config, logger);
    const withAliases = aliasResult.config;

    // If aliases were used, ensure metadata reflects env involvement.
    if (aliasResult.usedAliases.length > 0 && !metadata.activeLayers.includes("env")) {
      metadata.activeLayers.push("env");
    }

    // Validate plane invariants (safe-by-default)
    validateControlPlaneConfig(withAliases);
    validateDataPlaneAuthConfig(withAliases);

    // Cache config WITH metadata
    cachedConfigWithMetadata = { config: withAliases, metadata };

    logger.info("Configuration loaded successfully", {
      server: `${withAliases.server.host}:${withAliases.server.port}`,
      controlPlaneEnabled: withAliases.controlPlane.enabled,
      controlPlane: `${withAliases.controlPlane.host}:${withAliases.controlPlane.port}${withAliases.controlPlane.basePath}`,
      loggingProfile: withAliases.logging.profile,
      metricsEnabled: withAliases.metrics.enabled,
      activeLayers: metadata.activeLayers,
    });

    return withAliases;
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
  const previous = cachedConfigWithMetadata;

  logger.info("Reloading configuration");

  try {
    // Load fresh config (bypass cache); preserve current cache on failure.
    cachedConfigWithMetadata = null;
    const newConfig = await loadConfig();

    // TODO: Track successful reload with tuvan_config_reload_total{result="success"}
    // metrics.counter("tuvan_config_reload_total").inc(1, { result: "success" });

    logger.info("Configuration reloaded successfully");

    return newConfig;
  } catch (error) {
    cachedConfigWithMetadata = previous;
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
  cliOptions: {
    host?: string;
    port?: string;
    controlHost?: string;
    controlPort?: string;
    adminBasePath?: string;
  },
): TuvanConfig {
  const logger = getLogger();

  // Validate port if provided (prevent NaN from parseInt)
  const portOverride = cliOptions.port
    ? validateCliInteger(cliOptions.port, "server.port", 1, 65535)
    : config.server.port;

  const hasOverrides =
    cliOptions.host !== undefined ||
    cliOptions.port !== undefined ||
    cliOptions.controlHost !== undefined ||
    cliOptions.controlPort !== undefined ||
    cliOptions.adminBasePath !== undefined;

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
    controlPlane: {
      ...config.controlPlane,
      host: cliOptions.controlHost ?? config.controlPlane.host,
      port: cliOptions.controlPort
        ? validateCliInteger(cliOptions.controlPort, "controlPlane.port", 1, 65535)
        : config.controlPlane.port,
      basePath: cliOptions.adminBasePath
        ? normalizeBasePath(cliOptions.adminBasePath)
        : config.controlPlane.basePath,
    },
  };
}
