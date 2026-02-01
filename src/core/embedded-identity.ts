/**
 * Embedded Identity Registration
 *
 * Registers the application identity at startup so the binary works
 * correctly when run outside the repository directory.
 *
 * CRITICAL: This solves the "directory walking" anti-pattern where
 * version/identity is discovered via filesystem traversal from CWD.
 * When the binary is copied elsewhere (e.g., /usr/local/bin), filesystem
 * discovery fails. Embedded identity provides a fallback.
 *
 * Discovery precedence (with embedded fallback):
 * 1. Explicit path parameter
 * 2. FULMEN_APP_IDENTITY_PATH environment variable
 * 3. Ancestor search from CWD
 * 4. Embedded identity fallback (registered here)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasEmbeddedIdentity, registerEmbeddedIdentity } from "@fulmenhq/tsfulmen/appidentity";

// Get directory of this module (works in dist/ after build)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Embedded version string (set at build time or from VERSION file)
 *
 * This is the SINGLE SOURCE OF TRUTH for version when running outside repo.
 * Build scripts should replace this with actual version, or we read from
 * the bundled VERSION file.
 */
let embeddedVersion: string | null = null;

/**
 * Embedded git commit (set at build time)
 */
let embeddedGitCommit: string | null = null;

/**
 * Embedded build date (set at build time)
 */
let embeddedBuildDate: string | null = null;

/**
 * Try to read VERSION file from various locations relative to module
 */
function discoverVersionFile(): string | null {
  // Possible locations relative to this module's location
  const candidates = [
    join(__dirname, "..", "VERSION"), // dist/core -> dist/VERSION
    join(__dirname, "..", "..", "VERSION"), // dist/core -> VERSION (project root)
    join(__dirname, "VERSION"), // Same directory
  ];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        return readFileSync(candidate, "utf-8").trim();
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Try to read app.yaml from various locations relative to module
 */
function discoverAppYaml(): string | null {
  // Possible locations relative to this module's location
  const candidates = [
    join(__dirname, "..", ".fulmen", "app.yaml"), // dist/core -> dist/.fulmen/app.yaml
    join(__dirname, "..", "..", ".fulmen", "app.yaml"), // dist/core -> .fulmen/app.yaml (project root)
    join(__dirname, ".fulmen", "app.yaml"), // Same directory
  ];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        return readFileSync(candidate, "utf-8");
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Initialize embedded identity and version at application startup
 *
 * MUST be called before any code that uses loadIdentity() or getVersion().
 * Safe to call multiple times (idempotent after first success).
 *
 * @returns true if embedded identity was registered, false if already registered or failed
 */
export async function initializeEmbeddedIdentity(): Promise<boolean> {
  // Skip if already registered
  if (hasEmbeddedIdentity()) {
    return false;
  }

  // Try to discover and register app.yaml
  const appYaml = discoverAppYaml();
  if (appYaml) {
    try {
      await registerEmbeddedIdentity(appYaml);
    } catch {
      // Registration failed (maybe invalid YAML) - continue without embedded identity
      // loadIdentity() will fall back to filesystem discovery
      return false;
    }
  }

  // Cache version from VERSION file
  embeddedVersion = discoverVersionFile();

  return hasEmbeddedIdentity();
}

/**
 * Get the embedded version string
 *
 * @returns Version string or null if not available
 */
export function getEmbeddedVersion(): string | null {
  return embeddedVersion;
}

/**
 * Set embedded version (for build-time injection)
 *
 * @param version - Version string to embed
 */
export function setEmbeddedVersion(version: string): void {
  embeddedVersion = version;
}

/**
 * Get the embedded git commit
 *
 * @returns Git commit hash or null if not available
 */
export function getEmbeddedGitCommit(): string | null {
  return embeddedGitCommit;
}

/**
 * Set embedded git commit (for build-time injection)
 *
 * @param commit - Git commit hash to embed
 */
export function setEmbeddedGitCommit(commit: string): void {
  embeddedGitCommit = commit;
}

/**
 * Get the embedded build date
 *
 * @returns Build date (ISO 8601) or null if not available
 */
export function getEmbeddedBuildDate(): string | null {
  return embeddedBuildDate;
}

/**
 * Set embedded build date (for build-time injection)
 *
 * @param date - Build date (ISO 8601) to embed
 */
export function setEmbeddedBuildDate(date: string): void {
  embeddedBuildDate = date;
}

/**
 * Check if embedded identity is available
 *
 * @returns true if registerEmbeddedIdentity() succeeded
 */
export { hasEmbeddedIdentity };
