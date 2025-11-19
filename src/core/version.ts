/**
 * Version Resolution Utility
 *
 * Centralized version resolution that reads from VERSION file (Fulmen standard)
 * or falls back to package.json. Used by all endpoints to ensure consistency.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cached version to avoid repeated file reads
 */
let cachedVersion: string | null = null;

/**
 * Get application version from VERSION file or package.json
 *
 * Priority:
 * 1. VERSION file (Fulmen standard)
 * 2. package.json version field
 * 3. "0.0.0" fallback
 *
 * @returns Application version string
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  let version: string;

  try {
    // Try VERSION file first (Fulmen standard)
    const versionFile = join(process.cwd(), "VERSION");
    version = readFileSync(versionFile, "utf-8").trim();
  } catch {
    // Fallback to package.json
    try {
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
      version = packageJson.version || "0.0.0";
    } catch {
      version = "0.0.0";
    }
  }

  cachedVersion = version;
  return version;
}

/**
 * Clear the version cache (useful for testing or config reload)
 *
 * @returns The cleared version (always empty string)
 */
export function clearVersionCache(): string {
  cachedVersion = null;
  return "";
}

/**
 * Get git commit hash (short form)
 *
 * @returns Short git commit hash (8 chars) or undefined if not available
 */
export function getGitCommit(): string | undefined {
  try {
    const gitHead = join(process.cwd(), ".git", "HEAD");
    const headContent = readFileSync(gitHead, "utf-8").trim();

    // HEAD can be a ref or a direct commit hash
    if (headContent.startsWith("ref:")) {
      const refPath = headContent.substring(5).trim();
      const commitFile = join(process.cwd(), ".git", refPath);
      const commit = readFileSync(commitFile, "utf-8").trim();
      return commit.substring(0, 8); // Short hash
    }

    return headContent.substring(0, 8);
  } catch {
    return undefined;
  }
}

/**
 * Get build timestamp (placeholder - should be set at build time)
 *
 * @returns ISO 8601 timestamp
 */
export function getBuildDate(): string {
  // TODO: This should be replaced with a build-time constant
  // For now, return a placeholder
  return new Date().toISOString();
}
