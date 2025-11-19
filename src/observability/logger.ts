/**
 * Logging Module - Identity-aware logger with progressive profiles
 *
 * Provides tsfulmen/logging integration with:
 * - Identity-aware namespace from app.binary_name
 * - Progressive profiles (SIMPLE for CLI, STRUCTURED for server)
 * - Security middleware (RedactSecretsMiddleware) for sensitive data
 * - Lazy initialization per TypeScript Coding Standard
 *
 * CRITICAL: Following lessons from forge-workhorse-groningen, we configure
 * RedactSecretsMiddleware from the start to prevent security-sensitive data
 * from leaking into logs (passwords, tokens, API keys, cookies, headers).
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import {
  createStructuredLoggerWithRedaction,
  createLogger as createTSFulmenLogger,
  createSimpleLogger as createTSFulmenSimpleLogger,
  createStructuredLogger as createTSFulmenStructuredLogger,
  LoggingProfile,
  RedactSecretsMiddleware,
  type Logger as TSFulmenLogger,
} from "@fulmenhq/tsfulmen/logging";

/**
 * Logger instance (lazy initialized)
 */
let logger: TSFulmenLogger | null = null;

/**
 * Application identity (set during initialization)
 */
let appIdentity: Identity | null = null;

/**
 * Current logging profile
 */
let currentProfile: LoggingProfile = LoggingProfile.STRUCTURED;

/**
 * Initialize the global logger with app identity
 *
 * IMPORTANT: Must be called before using getLogger()
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @param profile - Logging profile (SIMPLE for CLI, STRUCTURED for server)
 * @param customSecretKeys - Additional secret keys to redact (beyond defaults)
 *
 * @example
 * ```typescript
 * import { loadAppIdentity } from "@fulmenhq/tsfulmen/appidentity";
 * import { initializeLogger, LoggingProfile } from "./observability/logger";
 *
 * const identity = loadAppIdentity();
 * initializeLogger(identity, LoggingProfile.STRUCTURED, [
 *   'x-api-token',      // Custom HTTP header
 *   'sessionId',         // Session cookie
 *   'privateKey',        // Application-specific
 * ]);
 * ```
 */
export function initializeLogger(
  identity: Identity,
  profile: LoggingProfile = LoggingProfile.STRUCTURED,
  customSecretKeys?: string[],
): void {
  appIdentity = identity;
  currentProfile = profile;

  const serviceName = identity.app.binary_name;

  // Create logger based on profile
  switch (profile) {
    case LoggingProfile.SIMPLE:
      // Simple logger for CLI - no middleware needed
      logger = createTSFulmenSimpleLogger(serviceName);
      break;

    case LoggingProfile.STRUCTURED:
      // Structured logger with security middleware (DEFAULT for server)
      // As of tsfulmen v0.1.11, STRUCTURED now supports middleware via
      // createStructuredLoggerWithRedaction() helper (secure-by-default)
      {
        const defaultSecretKeys = [
          // HTTP headers (common security-sensitive headers)
          "cookie",
          "set-cookie",
          "x-csrf-token",
          "x-api-key",
          "x-auth-token",
          "x-access-token",
        ];

        const allSecretKeys = customSecretKeys
          ? [...defaultSecretKeys, ...customSecretKeys]
          : defaultSecretKeys;

        logger = createStructuredLoggerWithRedaction(serviceName, {
          customFields: allSecretKeys,
          useDefaultPatterns: true, // Use gofulmen-aligned patterns
        });
      }
      break;

    case LoggingProfile.ENTERPRISE:
      // Enterprise logger with full middleware pipeline
      // Configure RedactSecretsMiddleware with custom keys
      {
        const defaultSecretKeys = [
          // Standard credentials
          "password",
          "apiKey",
          "api_key",
          "token",
          "secret",
          "authorization",
          "auth",
          "accessToken",
          "access_token",
          "refreshToken",
          "refresh_token",
          // HTTP headers (common security-sensitive headers)
          "x-api-key",
          "x-api-token",
          "x-auth-token",
          "x-access-token",
          "cookie",
          "set-cookie",
          // Session/OAuth
          "sessionId",
          "session_id",
          "csrfToken",
          "csrf_token",
          "oauthToken",
          "oauth_token",
          // Cryptographic
          "privateKey",
          "private_key",
          "publicKey",
          "public_key",
          "encryptionKey",
          "encryption_key",
          // Cloud/Infrastructure
          "awsAccessKey",
          "awsSecretKey",
          "gcpServiceAccount",
          "azureClientSecret",
        ];

        const allSecretKeys = customSecretKeys
          ? [...defaultSecretKeys, ...customSecretKeys]
          : defaultSecretKeys;

        const secretsMiddleware = new RedactSecretsMiddleware(allSecretKeys);

        logger = createTSFulmenLogger({
          service: serviceName,
          profile: LoggingProfile.ENTERPRISE,
          middleware: [secretsMiddleware],
        });
      }
      break;

    default:
      // Fallback to structured with redaction
      logger = createTSFulmenStructuredLogger(serviceName);
  }
}

/**
 * Get the global logger instance
 *
 * IMPORTANT: Must call initializeLogger() first, otherwise throws error
 *
 * @returns Logger instance
 * @throws {Error} If logger not initialized
 *
 * @example
 * ```typescript
 * const logger = getLogger();
 * logger.info("Server started", { port: 8080 });
 * logger.error("Failed to connect", new Error("timeout"), { host: "db.example.com" });
 * ```
 */
export function getLogger(): TSFulmenLogger {
  if (!logger) {
    throw new Error("Logger not initialized. Call initializeLogger(identity, profile) first.");
  }
  return logger;
}

/**
 * Get the current logging profile
 *
 * @returns Current logging profile
 */
export function getLoggingProfile(): LoggingProfile {
  return currentProfile;
}

/**
 * Get the app identity used for logger initialization
 *
 * @returns App identity or null if not initialized
 */
export function getAppIdentity(): Identity | null {
  return appIdentity;
}

/**
 * Check if logger is initialized
 *
 * @returns True if logger is ready to use
 */
export function isLoggerInitialized(): boolean {
  return logger !== null;
}

/**
 * Reset logger (primarily for testing)
 *
 * @internal
 */
export function resetLogger(): void {
  logger = null;
  appIdentity = null;
  currentProfile = LoggingProfile.STRUCTURED;
}

// Re-export types and enums for convenience
export { LoggingProfile };
export type { TSFulmenLogger as Logger };
