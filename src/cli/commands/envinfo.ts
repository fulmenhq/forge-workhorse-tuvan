/**
 * Environment Info Command
 *
 * Displays environment information including app identity, config paths,
 * environment variables, and SSOT versions. Useful for debugging.
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
 * Get all environment variables matching the app's prefix
 *
 * @param envPrefix - Environment variable prefix (e.g., "TUVAN_")
 * @returns Object with matching environment variables
 */
function getAppEnvVars(envPrefix: string): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const key in process.env) {
    if (key.startsWith(envPrefix)) {
      const value = process.env[key];
      if (value !== undefined) {
        envVars[key] = value;
      }
    }
  }

  return envVars;
}

/**
 * Format environment info as human-readable output
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Formatted string for console output
 */
function formatEnvInfo(identity: Identity): string {
  const lines: string[] = ["Environment Information", ""];

  // App Identity Section
  lines.push("App Identity:");
  lines.push(`  Vendor: ${identity.app.vendor}`);
  lines.push(`  Binary Name: ${identity.app.binary_name}`);
  lines.push(`  Category: ${identity.metadata?.repository_category || "unknown"}`);
  lines.push(`  Env Prefix: ${identity.app.env_prefix}`);
  lines.push(`  Config Name: ${identity.app.config_name}`);
  lines.push("");

  // Version Info
  try {
    const versionPath = join(__dirname, "..", "..", "..", "VERSION");
    const version = readFileSync(versionPath, "utf-8").trim();
    lines.push("Version:");
    lines.push(`  Current: ${version}`);
    lines.push("");
  } catch {
    lines.push("Version:");
    lines.push("  Current: unknown (VERSION file not found)");
    lines.push("");
  }

  // Runtime Info
  lines.push("Runtime:");
  lines.push(`  Node.js: ${process.version}`);
  lines.push(`  Platform: ${process.platform}`);
  lines.push(`  Architecture: ${process.arch}`);
  lines.push(`  PID: ${process.pid}`);
  lines.push(`  CWD: ${process.cwd()}`);
  lines.push("");

  // Environment Variables
  const envPrefix = identity.app.env_prefix;
  const appEnvVars = getAppEnvVars(envPrefix);
  lines.push(`Environment Variables (${envPrefix}*):`);

  if (Object.keys(appEnvVars).length === 0) {
    lines.push("  (none set)");
  } else {
    for (const [key, value] of Object.entries(appEnvVars)) {
      // Mask potential secrets (anything with KEY, TOKEN, PASSWORD, SECRET)
      const shouldMask = /KEY|TOKEN|PASSWORD|SECRET/i.test(key);
      const displayValue = shouldMask ? "***" : value;
      lines.push(`  ${key}=${displayValue}`);
    }
  }
  lines.push("");

  // Dependencies
  try {
    const packagePath = join(__dirname, "..", "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    const tsfulmenVersion = packageJson.dependencies?.["@fulmenhq/tsfulmen"] || "unknown";

    lines.push("Dependencies:");
    lines.push(`  tsfulmen: ${tsfulmenVersion}`);
  } catch {
    lines.push("Dependencies:");
    lines.push("  (package.json not found)");
  }

  return lines.join("\n");
}

/**
 * Create the envinfo command
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * tuvan envinfo
 * # Displays app identity, environment variables, runtime info, and dependencies
 * ```
 */
export function createEnvinfoCommand(identity: Identity): Command {
  const command = new Command("envinfo");

  command
    .description("Display environment information (config, env vars, SSOT versions)")
    .action(() => {
      console.log(formatEnvInfo(identity));
    });

  return command;
}
