/**
 * Version Resolution Utility
 *
 * Provides version information using embedded identity pattern.
 *
 * CRITICAL: Does NOT use directory walking (process.cwd() or __dirname traversal).
 * Version is embedded at startup via initializeEmbeddedIdentity() so the binary
 * works correctly when copied outside the repository.
 *
 * For build-time version injection, use setEmbeddedVersion() before any
 * version queries.
 */

import {
  getEmbeddedBuildDate,
  getEmbeddedGitCommit,
  getEmbeddedVersion,
} from "./embedded-identity.js";

/**
 * Get application version
 *
 * Priority:
 * 1. Embedded version (set via initializeEmbeddedIdentity or setEmbeddedVersion)
 * 2. Fallback to "0.0.0-unknown"
 *
 * @returns Application version string
 */
export function getVersion(): string {
  const embedded = getEmbeddedVersion();
  if (embedded) {
    return embedded;
  }

  // Fallback - should not happen if initializeEmbeddedIdentity() was called
  return "0.0.0-unknown";
}

/**
 * Get git commit hash (short form)
 *
 * @returns Short git commit hash (8 chars) or undefined if not available
 */
export function getGitCommit(): string | undefined {
  return getEmbeddedGitCommit() ?? undefined;
}

/**
 * Get build timestamp
 *
 * @returns ISO 8601 timestamp or undefined if not set at build time
 */
export function getBuildDate(): string | undefined {
  return getEmbeddedBuildDate() ?? undefined;
}
