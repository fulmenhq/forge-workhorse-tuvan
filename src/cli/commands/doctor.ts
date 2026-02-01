/**
 * Doctor Command
 *
 * Runs comprehensive diagnostic checks and suggests fixes for common issues.
 * More detailed than health command - provides actionable remediation steps.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { exitCodes } from "@fulmenhq/tsfulmen/foundry";
import { Command } from "commander";
import { analyzeEnvVar, type EnvVarDescriptor } from "../utils/envvars.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Diagnostic check result interface
 */
interface DiagnosticResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  suggestion?: string;
}

function checkEnvVarConflicts(identity: Identity): DiagnosticResult {
  const prefix = identity.app.env_prefix.endsWith("_")
    ? identity.app.env_prefix
    : `${identity.app.env_prefix}_`;

  const descriptors: EnvVarDescriptor[] = [
    {
      id: "server.host",
      description: "server.host",
      canonicalKey: `${prefix}SERVER_HOST`,
      aliasKey: `${prefix}HOST`,
    },
    {
      id: "server.port",
      description: "server.port",
      canonicalKey: `${prefix}SERVER_PORT`,
      aliasKey: `${prefix}PORT`,
    },
    {
      id: "logging.level",
      description: "logging.level",
      canonicalKey: `${prefix}LOGGING_LEVEL`,
      aliasKey: `${prefix}LOG_LEVEL`,
    },
    {
      id: "logging.profile",
      description: "logging.profile",
      canonicalKey: `${prefix}LOGGING_PROFILE`,
      aliasKey: `${prefix}LOG_PROFILE`,
    },
    {
      id: "dataPlaneAuth.enabled",
      description: "dataPlaneAuth.enabled",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_ENABLED`,
      aliasKey: `${prefix}AUTH_ENABLED`,
    },
    {
      id: "dataPlaneAuth.mode",
      description: "dataPlaneAuth.auth.mode",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_MODE`,
      aliasKey: `${prefix}AUTH_MODE`,
    },
  ];

  const conflicts = descriptors
    .map((d) => analyzeEnvVar(d))
    .filter((s) => s.conflict)
    .map((s) => s.id);

  if (conflicts.length === 0) {
    return {
      name: "Env Var Conflicts",
      status: "ok",
      message: "No alias vs canonical env var conflicts detected",
    };
  }

  return {
    name: "Env Var Conflicts",
    status: "warning",
    message: `Conflicting env vars detected for: ${conflicts.join(", ")}`,
    suggestion:
      "Unset either the alias (e.g. TUVAN_PORT) or the canonical nested key (e.g. TUVAN_SERVER_PORT) so behavior is unambiguous",
  };
}

/**
 * Check Node.js version and suggest upgrade if needed
 *
 * @returns Diagnostic result
 */
function checkNodeVersion(): DiagnosticResult {
  const nodeVersion = process.version;
  const major = Number.parseInt(nodeVersion.slice(1).split(".")[0] || "0", 10);

  if (major < 20) {
    return {
      name: "Node.js Version",
      status: "error",
      message: `Node.js ${nodeVersion} detected (< 20.0.0)`,
      suggestion: "Upgrade to Node.js 20.0.0 or higher: https://nodejs.org/",
    };
  }

  if (major === 20) {
    return {
      name: "Node.js Version",
      status: "warning",
      message: `Node.js ${nodeVersion} (consider upgrading to latest LTS)`,
      suggestion: "Node.js 22.x LTS is recommended for best performance",
    };
  }

  return {
    name: "Node.js Version",
    status: "ok",
    message: `Node.js ${nodeVersion} (>= 20.0.0)`,
  };
}

/**
 * Check if .fulmen/app.yaml exists and is valid
 *
 * @param identity - App identity (already loaded)
 * @returns Diagnostic result
 */
function checkAppIdentityFile(identity: Identity): DiagnosticResult {
  const appYamlPath = join(__dirname, "..", "..", "..", ".fulmen", "app.yaml");

  if (!existsSync(appYamlPath)) {
    return {
      name: "App Identity File",
      status: "error",
      message: ".fulmen/app.yaml not found",
      suggestion: "Create .fulmen/app.yaml with app identity metadata",
    };
  }

  const binaryName = identity.app.binary_name;
  if (!binaryName) {
    return {
      name: "App Identity File",
      status: "error",
      message: "binary_name not found in .fulmen/app.yaml",
      suggestion: "Add 'binary_name' field to .fulmen/app.yaml",
    };
  }

  return {
    name: "App Identity File",
    status: "ok",
    message: `.fulmen/app.yaml exists and valid (binary: ${binaryName})`,
  };
}

/**
 * Check if VERSION file exists
 *
 * @returns Diagnostic result
 */
function checkVersionFile(): DiagnosticResult {
  const versionPath = join(__dirname, "..", "..", "..", "VERSION");

  if (!existsSync(versionPath)) {
    return {
      name: "VERSION File",
      status: "error",
      message: "VERSION file not found at repository root",
      suggestion: "Create VERSION file with semantic version (e.g., '0.1.0')",
    };
  }

  return {
    name: "VERSION File",
    status: "ok",
    message: "VERSION file exists",
  };
}

/**
 * Check if tsfulmen is installed
 *
 * @returns Diagnostic result
 */
function checkTsfulmenInstallation(): DiagnosticResult {
  try {
    const packagePath = join(__dirname, "..", "..", "..", "package.json");
    if (!existsSync(packagePath)) {
      return {
        name: "tsfulmen Installation",
        status: "error",
        message: "package.json not found",
        suggestion: "Run 'npm install' or 'bun install' to install dependencies",
      };
    }

    // If we got this far, tsfulmen is available (we're using it)
    return {
      name: "tsfulmen Installation",
      status: "ok",
      message: "@fulmenhq/tsfulmen is installed and available",
    };
  } catch (_error) {
    return {
      name: "tsfulmen Installation",
      status: "error",
      message: "Failed to check tsfulmen installation",
      suggestion: "Run 'npm install' or 'bun install'",
    };
  }
}

/**
 * Check if Makefile exists
 *
 * @returns Diagnostic result
 */
function checkMakefile(): DiagnosticResult {
  const makefilePath = join(__dirname, "..", "..", "..", "Makefile");

  if (!existsSync(makefilePath)) {
    return {
      name: "Makefile",
      status: "warning",
      message: "Makefile not found",
      suggestion:
        "Makefile is recommended for standardized build targets (make test, make build, etc.)",
    };
  }

  return {
    name: "Makefile",
    status: "ok",
    message: "Makefile exists",
  };
}

async function checkConfigLoad(): Promise<DiagnosticResult> {
  try {
    const { loadConfig } = await import("../../config/loader.js");
    const config = await loadConfig();

    const dataPlane = `${config.server.host}:${config.server.port}`;
    const controlPlane = config.controlPlane.enabled
      ? `${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}`
      : "disabled";

    return {
      name: "Configuration Load",
      status: "ok",
      message: `Config loaded successfully (data=${dataPlane}, control=${controlPlane})`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name: "Configuration Load",
      status: "error",
      message: `Failed to load config: ${message}`,
      suggestion:
        "Run `tuvan envinfo` to inspect env vars and resolve config validation errors (or unset conflicting alias/canonical env vars)",
    };
  }
}

/**
 * Run all diagnostic checks
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Array of diagnostic results
 */
async function runDiagnostics(identity: Identity): Promise<DiagnosticResult[]> {
  return [
    checkNodeVersion(),
    checkAppIdentityFile(identity),
    checkVersionFile(),
    checkTsfulmenInstallation(),
    checkMakefile(),
    checkEnvVarConflicts(identity),
    await checkConfigLoad(),
  ];
}

/**
 * Format diagnostic results for console output
 *
 * @param results - Array of diagnostic results
 * @returns Formatted string
 */
function formatDiagnosticResults(results: DiagnosticResult[]): string {
  const lines: string[] = ["Diagnostic Check Results:", ""];

  for (const result of results) {
    let symbol = "";
    let status = "";

    switch (result.status) {
      case "ok":
        symbol = "✓";
        status = "OK";
        break;
      case "warning":
        symbol = "⚠";
        status = "WARNING";
        break;
      case "error":
        symbol = "✗";
        status = "ERROR";
        break;
    }

    lines.push(`${symbol} ${result.name}: ${status}`);
    lines.push(`  ${result.message}`);

    if (result.suggestion) {
      lines.push(`  → ${result.suggestion}`);
    }

    lines.push("");
  }

  const errors = results.filter((r) => r.status === "error").length;
  const warnings = results.filter((r) => r.status === "warning").length;

  if (errors === 0 && warnings === 0) {
    lines.push("All checks passed! System is healthy. ✓");
  } else if (errors > 0) {
    lines.push(`${errors} error(s), ${warnings} warning(s) found.`);
    lines.push("Fix errors before using this application.");
  } else {
    lines.push(`${warnings} warning(s) found.`);
    lines.push("Application should work, but consider addressing warnings.");
  }

  return lines.join("\n");
}

/**
 * Create the doctor command
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * tuvan doctor
 * # Runs comprehensive diagnostics and suggests fixes
 * # Exits with code 0 if no errors, 1 if errors found
 * ```
 */
export function createDoctorCommand(identity: Identity): Command {
  const command = new Command("doctor");

  command
    .description("Run comprehensive diagnostic checks and suggest fixes for issues")
    .option("--json", "Output in JSON format")
    .action(async () => {
      const opts = command.opts<{ json?: boolean }>();
      const results = await runDiagnostics(identity);

      if (opts.json) {
        console.log(
          JSON.stringify(
            {
              results,
              ok: results.every((r) => r.status !== "error"),
            },
            null,
            2,
          ),
        );
      } else {
        console.log(formatDiagnosticResults(results));
      }

      const hasErrors = results.some((r) => r.status === "error");
      process.exit(hasErrors ? exitCodes.EXIT_FAILURE : exitCodes.EXIT_SUCCESS);
    });

  return command;
}
