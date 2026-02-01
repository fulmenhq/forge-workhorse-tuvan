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
import { analyzeEnvVar, type EnvVarDescriptor, type EnvVarStatus } from "../utils/envvars.js";

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
async function formatEnvInfo(identity: Identity): Promise<string> {
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

  // Config summary (optional)
  try {
    const { loadConfig } = await import("../../config/loader.js");
    const config = await loadConfig();

    lines.push("Config Summary:");
    lines.push(`  Data plane: http://${config.server.host}:${config.server.port}`);
    lines.push(
      `  Data plane auth: ${config.dataPlaneAuth.enabled ? "enabled" : "disabled"} (${config.dataPlaneAuth.auth.mode})`,
    );
    if (config.controlPlane.enabled) {
      lines.push(
        `  Control plane: http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}`,
      );
      lines.push(
        `  Control auth: ${config.controlPlane.auth.mode} (loopback-unauth=${config.controlPlane.auth.allowUnauthenticatedLoopback ? "on" : "off"})`,
      );
    } else {
      lines.push("  Control plane: disabled");
    }
    lines.push("");
  } catch {
    // Keep envinfo resilient; config load errors are surfaced by `tuvan doctor`.
  }

  // Environment Variables
  const envPrefix = identity.app.env_prefix;

  // Key env vars (canonical vs alias)
  lines.push("Key Environment Variables (canonical vs alias):");
  const prefix = envPrefix.endsWith("_") ? envPrefix : `${envPrefix}_`;
  const keyVars: EnvVarDescriptor[] = [
    {
      id: "server.host",
      description: "Data plane bind host",
      canonicalKey: `${prefix}SERVER_HOST`,
      aliasKey: `${prefix}HOST`,
    },
    {
      id: "server.port",
      description: "Data plane port",
      canonicalKey: `${prefix}SERVER_PORT`,
      aliasKey: `${prefix}PORT`,
    },
    {
      id: "logging.level",
      description: "Logging level",
      canonicalKey: `${prefix}LOGGING_LEVEL`,
      aliasKey: `${prefix}LOG_LEVEL`,
    },
    {
      id: "logging.profile",
      description: "Logging profile",
      canonicalKey: `${prefix}LOGGING_PROFILE`,
      aliasKey: `${prefix}LOG_PROFILE`,
    },
    {
      id: "controlPlane.host",
      description: "Control plane bind host",
      canonicalKey: `${prefix}CONTROL_PLANE_HOST`,
    },
    {
      id: "controlPlane.port",
      description: "Control plane port",
      canonicalKey: `${prefix}CONTROL_PLANE_PORT`,
    },
    {
      id: "controlPlane.basePath",
      description: "Control plane base path",
      canonicalKey: `${prefix}ADMIN_BASE_PATH`,
    },
    {
      id: "controlPlane.token",
      description: "Control plane bearer token",
      canonicalKey: `${prefix}ADMIN_TOKEN`,
      sensitive: true,
    },
    {
      id: "dataPlaneAuth.enabled",
      description: "Data plane auth enabled",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_ENABLED`,
      aliasKey: `${prefix}AUTH_ENABLED`,
    },
    {
      id: "dataPlaneAuth.mode",
      description: "Data plane auth mode",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_MODE`,
      aliasKey: `${prefix}AUTH_MODE`,
    },
    {
      id: "dataPlaneAuth.basicUser",
      description: "Data plane basic user",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BASIC_USER`,
      aliasKey: `${prefix}AUTH_BASIC_USER`,
    },
    {
      id: "dataPlaneAuth.basicPassword",
      description: "Data plane basic password",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BASIC_PASSWORD`,
      aliasKey: `${prefix}AUTH_BASIC_PASSWORD`,
      sensitive: true,
    },
    {
      id: "dataPlaneAuth.bearerToken",
      description: "Data plane bearer token",
      canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BEARER_TOKEN`,
      aliasKey: `${prefix}AUTH_BEARER_TOKEN`,
      sensitive: true,
    },
  ];

  const statuses: Array<EnvVarStatus & { description: string }> = keyVars.map((d) => {
    const s = analyzeEnvVar(d);
    return { ...s, description: d.description };
  });

  const canonicalHeader = "Canonical";
  const aliasHeader = "Alias";
  const effectiveHeader = "Effective";
  const sourceHeader = "Source";

  const canonicalValues = statuses.map((s) => s.canonicalKey ?? "-");
  const aliasValues = statuses.map((s) => s.aliasKey ?? "-");
  const effectiveValues = statuses.map((s) => {
    if (!s.effectiveKey) return "(unset)";
    if (s.sensitive) return "[set]";
    return s.effectiveValue ?? "";
  });
  const sourceValues = statuses.map((s) => {
    if (!s.effectiveKey) return "-";
    if (s.aliasKey && s.effectiveKey === s.aliasKey) return "alias";
    if (s.canonicalKey && s.effectiveKey === s.canonicalKey) return "canonical";
    return "-";
  });

  const col1 = Math.max(canonicalHeader.length, ...canonicalValues.map((v) => v.length));
  const col2 = Math.max(aliasHeader.length, ...aliasValues.map((v) => v.length));
  const col3 = Math.max(effectiveHeader.length, ...effectiveValues.map((v) => v.length));
  const col4 = Math.max(sourceHeader.length, ...sourceValues.map((v) => v.length));

  const pad = (s: string, n: number) => s.padEnd(n, " ");

  lines.push(
    `  ${pad(canonicalHeader, col1)}  ${pad(aliasHeader, col2)}  ${pad(effectiveHeader, col3)}  ${pad(sourceHeader, col4)}  Notes`,
  );
  lines.push(
    `  ${"-".repeat(col1)}  ${"-".repeat(col2)}  ${"-".repeat(col3)}  ${"-".repeat(col4)}  -----`,
  );

  for (const [i, s] of statuses.entries()) {
    const notes = s.conflict ? "CONFLICT" : "";
    lines.push(
      `  ${pad(canonicalValues[i] ?? "-", col1)}  ${pad(aliasValues[i] ?? "-", col2)}  ${pad(
        effectiveValues[i] ?? "",
        col3,
      )}  ${pad(sourceValues[i] ?? "-", col4)}  ${notes}`,
    );
  }

  lines.push("  Legend: [set] = value is set but masked (sensitive)");
  lines.push("");

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
    .option("--json", "Output in JSON format")
    .action(async () => {
      const opts = command.opts<{ json?: boolean }>();
      if (opts.json) {
        const envPrefix = identity.app.env_prefix;
        const prefix = envPrefix.endsWith("_") ? envPrefix : `${envPrefix}_`;

        const keyVars: EnvVarDescriptor[] = [
          {
            id: "server.host",
            description: "Data plane bind host",
            canonicalKey: `${prefix}SERVER_HOST`,
            aliasKey: `${prefix}HOST`,
          },
          {
            id: "server.port",
            description: "Data plane port",
            canonicalKey: `${prefix}SERVER_PORT`,
            aliasKey: `${prefix}PORT`,
          },
          {
            id: "logging.level",
            description: "Logging level",
            canonicalKey: `${prefix}LOGGING_LEVEL`,
            aliasKey: `${prefix}LOG_LEVEL`,
          },
          {
            id: "logging.profile",
            description: "Logging profile",
            canonicalKey: `${prefix}LOGGING_PROFILE`,
            aliasKey: `${prefix}LOG_PROFILE`,
          },
          {
            id: "controlPlane.host",
            description: "Control plane bind host",
            canonicalKey: `${prefix}CONTROL_PLANE_HOST`,
          },
          {
            id: "controlPlane.port",
            description: "Control plane port",
            canonicalKey: `${prefix}CONTROL_PLANE_PORT`,
          },
          {
            id: "controlPlane.basePath",
            description: "Control plane base path",
            canonicalKey: `${prefix}ADMIN_BASE_PATH`,
          },
          {
            id: "controlPlane.token",
            description: "Control plane token",
            canonicalKey: `${prefix}ADMIN_TOKEN`,
            sensitive: true,
          },
          {
            id: "dataPlaneAuth.enabled",
            description: "Data plane auth enabled",
            canonicalKey: `${prefix}DATA_PLANE_AUTH_ENABLED`,
            aliasKey: `${prefix}AUTH_ENABLED`,
          },
          {
            id: "dataPlaneAuth.mode",
            description: "Data plane auth mode",
            canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_MODE`,
            aliasKey: `${prefix}AUTH_MODE`,
          },
          {
            id: "dataPlaneAuth.basicUser",
            description: "Data plane basic user",
            canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BASIC_USER`,
            aliasKey: `${prefix}AUTH_BASIC_USER`,
          },
          {
            id: "dataPlaneAuth.basicPassword",
            description: "Data plane basic password",
            canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BASIC_PASSWORD`,
            aliasKey: `${prefix}AUTH_BASIC_PASSWORD`,
            sensitive: true,
          },
          {
            id: "dataPlaneAuth.bearerToken",
            description: "Data plane bearer token",
            canonicalKey: `${prefix}DATA_PLANE_AUTH_AUTH_BEARER_TOKEN`,
            aliasKey: `${prefix}AUTH_BEARER_TOKEN`,
            sensitive: true,
          },
        ];

        const envVarTable = keyVars
          .map((d) => ({ descriptor: d, status: analyzeEnvVar(d) }))
          .map(({ descriptor, status }) => {
            const effectiveValue = status.sensitive
              ? status.effectiveKey
                ? "[set]"
                : undefined
              : status.effectiveValue;
            const source = status.effectiveKey
              ? status.aliasKey && status.effectiveKey === status.aliasKey
                ? "alias"
                : status.canonicalKey && status.effectiveKey === status.canonicalKey
                  ? "canonical"
                  : "unknown"
              : "unset";

            return {
              id: descriptor.id,
              description: descriptor.description,
              canonicalKey: status.canonicalKey,
              aliasKey: status.aliasKey,
              effectiveKey: status.effectiveKey,
              effectiveValue,
              source,
              conflict: status.conflict,
              sensitive: status.sensitive,
            };
          });

        const appEnvVars = getAppEnvVars(envPrefix);
        const maskedEnv: Record<string, string> = {};
        for (const [k, v] of Object.entries(appEnvVars)) {
          maskedEnv[k] = /KEY|TOKEN|PASSWORD|SECRET/i.test(k) ? "***" : v;
        }

        let version: string | undefined;
        try {
          const versionPath = join(__dirname, "..", "..", "..", "VERSION");
          version = readFileSync(versionPath, "utf-8").trim();
        } catch {
          version = undefined;
        }

        let configSummary:
          | {
              dataPlane: string;
              dataPlaneAuth: { enabled: boolean; mode: string };
              controlPlane: { enabled: boolean; url?: string; authMode?: string };
            }
          | undefined;

        try {
          const { loadConfig } = await import("../../config/loader.js");
          const config = await loadConfig();
          configSummary = {
            dataPlane: `http://${config.server.host}:${config.server.port}`,
            dataPlaneAuth: {
              enabled: config.dataPlaneAuth.enabled,
              mode: config.dataPlaneAuth.auth.mode,
            },
            controlPlane: config.controlPlane.enabled
              ? {
                  enabled: true,
                  url: `http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}`,
                  authMode: config.controlPlane.auth.mode,
                }
              : { enabled: false },
          };
        } catch {
          configSummary = undefined;
        }

        let tsfulmenVersion: string | undefined;
        try {
          const packagePath = join(__dirname, "..", "..", "..", "package.json");
          const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
          tsfulmenVersion = packageJson.dependencies?.["@fulmenhq/tsfulmen"];
        } catch {
          tsfulmenVersion = undefined;
        }

        const payload = {
          identity: {
            vendor: identity.app.vendor,
            binaryName: identity.app.binary_name,
            category: identity.metadata?.repository_category || "unknown",
            envPrefix: identity.app.env_prefix,
            configName: identity.app.config_name,
          },
          version,
          runtime: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            cwd: process.cwd(),
          },
          configSummary,
          envVars: {
            keyTable: envVarTable,
            prefixed: maskedEnv,
          },
          dependencies: {
            tsfulmen: tsfulmenVersion,
          },
        };

        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(await formatEnvInfo(identity));
    });

  return command;
}
