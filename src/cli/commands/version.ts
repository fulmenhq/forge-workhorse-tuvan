/**
 * Version Command
 *
 * Displays application version information with optional extended metadata.
 * Basic mode shows version only; extended mode shows full SSOT metadata
 * including Crucible version from tsfulmen.
 *
 * CRITICAL: Uses embedded identity pattern - does NOT use directory walking.
 * Works correctly when binary is run outside the repository.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { getCrucibleVersion } from "@fulmenhq/tsfulmen/crucible";
import { Command } from "commander";
import { getBuildDate, getGitCommit, getVersion } from "../../core/version.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extended version metadata interface
 */
interface ExtendedVersionInfo {
  version: string;
  gitCommit?: string;
  buildDate?: string;
  appIdentity: {
    vendor: string;
    binaryName: string;
    category: string;
  };
  runtime: {
    name: string;
    version: string;
    platform: string;
    arch: string;
  };
  dependencies: {
    tsfulmen: string;
    crucible: string;
  };
}

/**
 * Get runtime information
 */
function getRuntimeInfo(): ExtendedVersionInfo["runtime"] {
  const isBun = typeof (globalThis as unknown as { Bun?: unknown }).Bun !== "undefined";

  return {
    name: isBun ? "bun" : "node",
    version: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Get extended version information including SSOT metadata
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Extended version metadata
 */
function getExtendedVersionInfo(identity: Identity): ExtendedVersionInfo {
  // Get version from embedded identity (not directory walking)
  const version = getVersion();
  const gitCommit = getGitCommit();
  const buildDate = getBuildDate();

  // Get tsfulmen version from package.json
  let tsfulmenVersion = "unknown";
  try {
    // Try multiple locations relative to the module
    const candidates = [
      join(__dirname, "..", "..", "..", "package.json"),
      join(__dirname, "..", "..", "package.json"),
      join(process.cwd(), "package.json"),
    ];
    for (const candidate of candidates) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf-8"));
        if (pkg.dependencies?.["@fulmenhq/tsfulmen"]) {
          tsfulmenVersion = pkg.dependencies["@fulmenhq/tsfulmen"].replace(/^[\^~]/, "");
          break;
        }
      } catch {
        // Continue to next candidate
      }
    }
  } catch {
    // Keep default "unknown"
  }

  // Get Crucible version from tsfulmen shim
  const crucibleInfo = getCrucibleVersion();

  return {
    version,
    gitCommit,
    buildDate,
    appIdentity: {
      vendor: identity.app.vendor,
      binaryName: identity.app.binary_name,
      category: identity.metadata?.repository_category || "unknown",
    },
    runtime: getRuntimeInfo(),
    dependencies: {
      tsfulmen: tsfulmenVersion.replace(/^[\^~]/, ""),
      crucible: crucibleInfo.version,
    },
  };
}

/**
 * Format extended version info as human-readable output
 *
 * @param info - Extended version information
 * @returns Formatted string for console output
 */
function formatExtendedInfo(info: ExtendedVersionInfo): string {
  const lines = [
    `${info.appIdentity.binaryName} ${info.version}`,
    "",
    "App Identity:",
    `  Vendor: ${info.appIdentity.vendor}`,
    `  Binary: ${info.appIdentity.binaryName}`,
    `  Category: ${info.appIdentity.category}`,
  ];

  if (info.gitCommit) {
    lines.push(`  Git Commit: ${info.gitCommit}`);
  }
  if (info.buildDate) {
    lines.push(`  Build Date: ${info.buildDate}`);
  }

  lines.push(
    "",
    "Runtime:",
    `  ${info.runtime.name === "bun" ? "Bun" : "Node.js"}: ${info.runtime.version}`,
    `  Platform: ${info.runtime.platform}`,
    `  Architecture: ${info.runtime.arch}`,
    "",
    "Dependencies:",
    `  tsfulmen: ${info.dependencies.tsfulmen}`,
    `  crucible: ${info.dependencies.crucible}`,
  );

  return lines.join("\n");
}

/**
 * Create the version command
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Commander command instance
 *
 * @example
 * Basic usage:
 * ```bash
 * tuvan version
 * # Output: 0.1.0
 * ```
 *
 * Extended usage:
 * ```bash
 * tuvan version --extended
 * # Output: Full version metadata with app identity, runtime, and dependencies
 * ```
 */
export function createVersionCommand(identity: Identity): Command {
  const command = new Command("version");

  command
    .description("Display version information")
    .option("-e, --extended", "Show extended version metadata (SSOT info)")
    .action((options: { extended?: boolean }) => {
      if (options.extended) {
        const info = getExtendedVersionInfo(identity);
        console.log(formatExtendedInfo(info));
      } else {
        // Use embedded version (not directory walking)
        console.log(getVersion());
      }
    });

  return command;
}
