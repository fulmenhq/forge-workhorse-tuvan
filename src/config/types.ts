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
 * Plane auth configuration
 */
export interface PlaneAuthConfig {
  /** Authentication mode */
  mode: "disabled" | "bearerToken" | "basicAuth";

  /**
   * Bearer token used for Authorization: Bearer <token>
   *
   * Recommended: set via environment variable (e.g. TUVAN_ADMIN_TOKEN)
   * rather than committing into config files.
   */
  bearerToken?: string;

  /** Basic auth username */
  basicUser?: string;

  /** Basic auth password */
  basicPassword?: string;

  /**
   * Allow unauthenticated access when the request originates from loopback.
   *
   * This provides a low-friction local-dev default while keeping remote exposure
   * blocked by binding to loopback host by default.
   */
  allowUnauthenticatedLoopback: boolean;

  /** Optional in-memory rate limit for auth failures (0 disables) */
  rateLimitPerMinute: number;
}

/**
 * Data plane auth policy
 *
 * Policies are evaluated in order:
 * 1) denyPrefixes
 * 2) publicPrefixes
 * 3) conditionalPrefixes
 * 4) protectedPrefixes
 */
export interface DataPlaneAuthPolicy {
  denyPrefixes: string[];
  publicPrefixes: string[];
  conditionalPrefixes: string[];
  protectedPrefixes: string[];
}

/**
 * Data plane auth configuration
 */
export interface DataPlaneAuthConfig {
  enabled: boolean;
  auth: PlaneAuthConfig;
  policy: DataPlaneAuthPolicy;
}

/**
 * Control plane configuration
 */
export interface ControlPlaneConfig {
  /** Enable control plane HTTP server */
  enabled: boolean;
  /** Bind address (recommended: 127.0.0.1) */
  host: string;
  /** Port for control plane server */
  port: number;
  /** Base path prefix for control endpoints (default: /control) */
  basePath: string;
  /** Control plane auth */
  auth: PlaneAuthConfig;
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
  dataPlaneAuth: DataPlaneAuthConfig;
  controlPlane: ControlPlaneConfig;
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
