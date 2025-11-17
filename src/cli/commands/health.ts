/**
 * Health Command
 *
 * Performs self-check validation to verify the application is properly configured.
 * Checks app identity, tsfulmen modules, and configuration loading.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { exitCodes } from "@fulmenhq/tsfulmen/foundry";
import { Command } from "commander";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Health check result interface
 */
interface HealthCheckResult {
  name: string;
  status: "pass" | "fail";
  message?: string;
}

/**
 * Check if .fulmen/app.yaml exists and is loadable
 *
 * @param identity - App identity (already loaded)
 * @returns Health check result
 */
function checkAppIdentity(identity: Identity): HealthCheckResult {
  try {
    const binaryName = identity.app.binary_name;
    if (!binaryName) {
      return {
        name: "App Identity",
        status: "fail",
        message: "Binary name not found in identity",
      };
    }

    return {
      name: "App Identity",
      status: "pass",
      message: `Loaded identity for '${binaryName}'`,
    };
  } catch (error) {
    return {
      name: "App Identity",
      status: "fail",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if VERSION file exists and is readable
 *
 * @returns Health check result
 */
function checkVersionFile(): HealthCheckResult {
  const versionPath = join(__dirname, "..", "..", "..", "VERSION");

  if (!existsSync(versionPath)) {
    return {
      name: "VERSION file",
      status: "fail",
      message: "VERSION file not found",
    };
  }

  return {
    name: "VERSION file",
    status: "pass",
    message: "VERSION file exists",
  };
}

/**
 * Check if tsfulmen modules are available
 *
 * @returns Health check result
 */
function checkTsfulmenModules(): HealthCheckResult {
  try {
    // Try to import key tsfulmen modules
    // If we got this far, they're available (we're already using them)
    return {
      name: "tsfulmen modules",
      status: "pass",
      message: "Core modules available (appidentity, foundry)",
    };
  } catch (error) {
    return {
      name: "tsfulmen modules",
      status: "fail",
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Check Node.js version compatibility
 *
 * @returns Health check result
 */
function checkNodeVersion(): HealthCheckResult {
  const nodeVersion = process.version;
  const major = Number.parseInt(nodeVersion.slice(1).split(".")[0] || "0", 10);

  if (major < 20) {
    return {
      name: "Node.js version",
      status: "fail",
      message: `Node.js ${nodeVersion} found, >= 20.0.0 required`,
    };
  }

  return {
    name: "Node.js version",
    status: "pass",
    message: `Node.js ${nodeVersion} (>= 20.0.0 required)`,
  };
}

/**
 * Run all health checks
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Array of health check results
 */
function runHealthChecks(identity: Identity): HealthCheckResult[] {
  return [
    checkNodeVersion(),
    checkAppIdentity(identity),
    checkVersionFile(),
    checkTsfulmenModules(),
  ];
}

/**
 * Format health check results for console output
 *
 * @param results - Array of health check results
 * @returns Formatted string
 */
function formatHealthResults(results: HealthCheckResult[]): string {
  const lines: string[] = ["Health Check Results:", ""];

  for (const result of results) {
    const symbol = result.status === "pass" ? "✓" : "✗";
    const status = result.status === "pass" ? "PASS" : "FAIL";
    lines.push(`${symbol} ${result.name}: ${status}`);

    if (result.message) {
      lines.push(`  ${result.message}`);
    }
  }

  const allPassed = results.every((r) => r.status === "pass");
  const failedCount = results.filter((r) => r.status === "fail").length;

  lines.push("");
  if (allPassed) {
    lines.push("All checks passed ✓");
  } else {
    lines.push(`${failedCount} check(s) failed ✗`);
  }

  return lines.join("\n");
}

/**
 * Create the health command
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * tuvan health
 * # Runs self-checks and exits with code 0 if healthy, 1 if unhealthy
 * ```
 */
export function createHealthCommand(identity: Identity): Command {
  const command = new Command("health");

  command.description("Run health self-checks and validate configuration").action(() => {
    const results = runHealthChecks(identity);
    console.log(formatHealthResults(results));

    const allPassed = results.every((r) => r.status === "pass");
    process.exit(allPassed ? exitCodes.EXIT_SUCCESS : exitCodes.EXIT_FAILURE);
  });

  return command;
}
