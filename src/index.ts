#!/usr/bin/env node

/**
 * Tuvan CLI - Main Entry Point
 *
 * Production-ready TypeScript workhorse application template.
 * Provides CLI interface with Commander.js and integrates App Identity Module.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";

import { exitCodes } from "@fulmenhq/tsfulmen/foundry";
import { Command } from "commander";
import { createDoctorCommand } from "./cli/commands/doctor.js";
import { createEnvinfoCommand } from "./cli/commands/envinfo.js";
import { createHealthCommand } from "./cli/commands/health.js";
import { createServeCommand } from "./cli/commands/serve.js";
import { createVersionCommand } from "./cli/commands/version.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    // Load app identity early
    const identity = await loadIdentity();
    const binaryName = identity.app.binary_name;

    // Read version from VERSION file
    const versionPath = join(__dirname, "..", "VERSION");
    const version = readFileSync(versionPath, "utf-8").trim();

    // Create CLI program
    const program = new Command();

    program
      .name(binaryName)
      .description(
        identity.app.description || "TypeScript workhorse template for production-ready backends",
      )
      .version(version, "-V, --version", "Output the current version")
      .helpOption("-h, --help", "Display help for command");

    // Global options
    program.option("-v, --verbose", "Enable verbose output (increases logging verbosity)");
    program.option(
      "-c, --config <path>",
      "Specify custom config file path (overrides default config discovery)",
    );

    // Register commands
    program.addCommand(createServeCommand(identity));
    program.addCommand(createVersionCommand(identity));
    program.addCommand(createHealthCommand(identity));
    program.addCommand(createEnvinfoCommand(identity));
    program.addCommand(createDoctorCommand(identity));

    // Parse arguments
    await program.parseAsync(process.argv);
  } catch (error) {
    // Global error handling
    console.error("Fatal error:", error instanceof Error ? error.message : error);

    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    process.exit(exitCodes.EXIT_FAILURE);
  }
}

// Execute main
main();
