/**
 * Version Command
 *
 * Displays application version information with optional extended metadata.
 * Basic mode shows version only; extended mode shows full SSOT metadata.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { Command } from "commander";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extended version metadata interface
 */
interface ExtendedVersionInfo {
  version: string;
  appIdentity: {
    vendor: string;
    binaryName: string;
    category: string;
  };
  runtime: {
    node: string;
    platform: string;
    arch: string;
  };
  dependencies: {
    tsfulmen: string;
  };
}

/**
 * Get extended version information including SSOT metadata
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Extended version metadata
 *
 * @example
 * ```typescript
 * const identity = await loadIdentity();
 * const info = getExtendedVersionInfo(identity);
 * console.log(info.version); // "0.1.0"
 * ```
 */
function getExtendedVersionInfo(identity: Identity): ExtendedVersionInfo {
  // Read VERSION file
  const versionPath = join(__dirname, "..", "..", "..", "VERSION");
  const version = readFileSync(versionPath, "utf-8").trim();

  // Read package.json for dependency versions
  const packagePath = join(__dirname, "..", "..", "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
  const tsfulmenVersion = packageJson.dependencies?.["@fulmenhq/tsfulmen"] || "unknown";

  return {
    version,
    appIdentity: {
      vendor: identity.app.vendor,
      binaryName: identity.app.binary_name,
      category: identity.metadata?.repository_category || "unknown",
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    dependencies: {
      tsfulmen: tsfulmenVersion,
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
    "",
    "Runtime:",
    `  Node.js: ${info.runtime.node}`,
    `  Platform: ${info.runtime.platform}`,
    `  Architecture: ${info.runtime.arch}`,
    "",
    "Dependencies:",
    `  tsfulmen: ${info.dependencies.tsfulmen}`,
  ];

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
  const versionPath = join(__dirname, "..", "..", "..", "VERSION");
  const version = readFileSync(versionPath, "utf-8").trim();

  const command = new Command("version");

  command
    .description("Display version information")
    .option("-e, --extended", "Show extended version metadata (SSOT info)")
    .action((options: { extended?: boolean }) => {
      if (options.extended) {
        const info = getExtendedVersionInfo(identity);
        console.log(formatExtendedInfo(info));
      } else {
        console.log(version);
      }
    });

  return command;
}
