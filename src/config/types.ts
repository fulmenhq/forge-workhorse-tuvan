/**
 * Tuvan Workhorse Configuration Types
 *
 * TypeScript interfaces matching config.schema.json
 */

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Bind address (default: 0.0.0.0) */
  host: string;
  /** HTTP port (1-65535) */
  port: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Logging profile (simple, structured, enterprise) */
  profile: "simple" | "structured" | "enterprise";
  /** Log level threshold */
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable Prometheus metrics */
  enabled: boolean;
  /** Metrics port (0 = use server port, 1-65535 = dedicated port) */
  port: number;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Metrics namespace (default: fulmen.tuvan) */
  namespace: string;
}

/**
 * Top-level Tuvan configuration
 */
export interface TuvanConfig {
  server: ServerConfig;
  logging: LoggingConfig;
  metrics: MetricsConfig;
  telemetry: TelemetryConfig;
}

/**
 * Config metadata for introspection by doctor/envinfo commands
 */
export interface ConfigMetadata {
  /** Resolved path to defaults file (Layer 1) */
  defaultsPath: string;

  /** Resolved path to user config file (Layer 2), null if not found */
  userConfigPath: string | null;

  /** Environment variable prefix used (Layer 3) */
  envPrefix: string;

  /** App identity information */
  identity: {
    vendor: string;
    binaryName: string;
  };

  /** Which layers contributed to final config */
  activeLayers: ("defaults" | "user" | "env" | "cli")[];
}

/**
 * Extended config with metadata for getCurrentConfig()
 */
export interface ConfigWithMetadata {
  config: TuvanConfig;
  metadata: ConfigMetadata;
}

/**
 * Typed error for config validation failures
 * Maps to Foundry exit code 30 (ConfigInvalid)
 */
export class ConfigInvalidError extends Error {
  constructor(
    message: string,
    public readonly details?: { field?: string; expected?: string; actual?: unknown },
  ) {
    super(message);
    this.name = "ConfigInvalidError";

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigInvalidError);
    }
  }
}
