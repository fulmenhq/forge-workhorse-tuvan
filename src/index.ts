#!/usr/bin/env node

/**
 * Tuvan CLI - Main Entry Point
 *
 * Production-ready TypeScript workhorse application template.
 * Provides CLI interface with Commander.js and integrates App Identity Module.
 *
 * CRITICAL: Initializes embedded identity FIRST to ensure the binary works
 * correctly when run outside the repository directory. This solves the
 * "directory walking" anti-pattern.
 */

import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { exitCodes } from "@fulmenhq/tsfulmen/foundry";
import { Command } from "commander";
import { createDoctorCommand } from "./cli/commands/doctor.js";
import { createEnvinfoCommand } from "./cli/commands/envinfo.js";
import { createHealthCommand } from "./cli/commands/health.js";
import { createServeCommand } from "./cli/commands/serve.js";
import { createVersionCommand } from "./cli/commands/version.js";
// Import embedded identity initialization (MUST be first)
import { initializeEmbeddedIdentity } from "./core/embedded-identity.js";
import { getVersion } from "./core/version.js";

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize embedded identity FIRST (enables binary to work outside repo)
    await initializeEmbeddedIdentity();

    // Load app identity (will use embedded fallback if filesystem discovery fails)
    const identity = await loadIdentity();
    const binaryName = identity.app.binary_name;

    // Get version from embedded identity
    const version = getVersion();

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
