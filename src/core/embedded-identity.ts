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
import {
  hasEmbeddedIdentity,
  type Identity,
  loadIdentity,
  registerEmbeddedIdentity,
} from "@fulmenhq/tsfulmen/appidentity";

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
 * Build-time injected identity values.
 *
 * Single-file binaries produced by `bun build --compile` carry no on-disk
 * VERSION file or `.fulmen/app.yaml`, so filesystem discovery returns null
 * inside them. The build (scripts/build-all.ts) injects the values below via
 * `bun build --define`, which replaces these identifiers with string literals
 * at compile time. In non-compiled runs (tsx/node) the identifiers are
 * undefined; the `typeof` guards yield null and on-disk discovery remains the
 * source of truth. `typeof <undeclared>` is the one identifier reference that
 * does not throw at runtime, so the guards are safe when nothing is injected.
 */
declare const __EMBEDDED_APP_YAML__: string | undefined;
declare const __EMBEDDED_VERSION__: string | undefined;
declare const __EMBEDDED_GIT_COMMIT__: string | undefined;
declare const __EMBEDDED_BUILD_DATE__: string | undefined;
declare const __EMBEDDED_TSFULMEN_VERSION__: string | undefined;

/**
 * Resolved @fulmenhq/tsfulmen version, injected at build time.
 *
 * In dev/node, version --extended reads this from package.json on disk; a
 * compiled binary has no package.json, so the build injects the resolved
 * version here for the extended-version output.
 */
export function getInjectedTsfulmenVersion(): string | null {
  return typeof __EMBEDDED_TSFULMEN_VERSION__ !== "undefined"
    ? __EMBEDDED_TSFULMEN_VERSION__
    : null;
}

function buildInjectedAppYaml(): string | null {
  return typeof __EMBEDDED_APP_YAML__ !== "undefined" ? __EMBEDDED_APP_YAML__ : null;
}

function buildInjectedVersion(): string | null {
  return typeof __EMBEDDED_VERSION__ !== "undefined" ? __EMBEDDED_VERSION__ : null;
}

function buildInjectedGitCommit(): string | null {
  return typeof __EMBEDDED_GIT_COMMIT__ !== "undefined" ? __EMBEDDED_GIT_COMMIT__ : null;
}

function buildInjectedBuildDate(): string | null {
  return typeof __EMBEDDED_BUILD_DATE__ !== "undefined" ? __EMBEDDED_BUILD_DATE__ : null;
}

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

  // Register the app.yaml: the on-disk file in dev/node runs, or the build-time
  // injected copy in a compiled single-file binary (which has no app.yaml on
  // disk). tsfulmen >= 0.4.0 resolves the app-identity schema from build-embedded
  // assets, so registerEmbeddedIdentity validates in the binary too — no
  // skip-validation workaround needed.
  const appYaml = discoverAppYaml() ?? buildInjectedAppYaml();
  if (appYaml) {
    try {
      await registerEmbeddedIdentity(appYaml);
    } catch {
      // Registration failed (maybe invalid YAML) - continue without embedded identity
      // loadIdentity() will fall back to filesystem discovery
      return false;
    }
  }

  // Cache version: prefer the on-disk VERSION file (dev/node), falling back to
  // the build-time injected value (compiled binaries have no VERSION on disk).
  embeddedVersion = discoverVersionFile() ?? buildInjectedVersion();

  // Git commit and build date are only available via build-time injection.
  if (!embeddedGitCommit) {
    embeddedGitCommit = buildInjectedGitCommit();
  }
  if (!embeddedBuildDate) {
    embeddedBuildDate = buildInjectedBuildDate();
  }

  return hasEmbeddedIdentity();
}

let cachedIdentity: Identity | null = null;

/**
 * Resolve the application identity, working in every runtime context.
 *
 * `initializeEmbeddedIdentity()` (called at CLI startup) registers the embedded
 * identity from the on-disk app.yaml (dev/node) or the build-injected copy
 * (compiled single-file binary), so tsfulmen's loadIdentity() returns it without
 * touching the filesystem in the binary. Result is memoized so repeated calls
 * (CLI startup + config loader) are cheap and consistent.
 */
export async function resolveIdentity(): Promise<Identity> {
  if (cachedIdentity) {
    return cachedIdentity;
  }
  cachedIdentity = await loadIdentity();
  return cachedIdentity;
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
