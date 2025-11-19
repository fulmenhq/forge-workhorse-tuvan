/**
 * Serve Command
 *
 * Starts the HTTP server with graceful shutdown support.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { createSignalManager, onReload, onShutdown } from "@fulmenhq/tsfulmen/foundry";
import { Command } from "commander";
import type { FastifyInstance } from "fastify";

/**
 * Server configuration options (CLI flags)
 */
interface ServeOptions {
  port?: string;
  host?: string;
}

/**
 * Create the serve command
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Start server with defaults (localhost:8080)
 * tuvan serve
 *
 * # Custom port
 * tuvan serve --port 9000
 *
 * # Custom host and port
 * tuvan serve --host 0.0.0.0 --port 9000
 *
 * # Via environment variables
 * TUVAN_HOST=0.0.0.0 TUVAN_PORT=9000 tuvan serve
 * ```
 */
export function createServeCommand(identity: Identity): Command {
  const command = new Command("serve");
  const binaryName = identity.app.binary_name;
  const envPrefix = identity.app.env_prefix;

  command
    .description("Start the HTTP server")
    .option("-p, --port <port>", `Port to listen on (env: ${envPrefix}PORT, default: 8080)`)
    .option("-H, --host <host>", `Host to bind to (env: ${envPrefix}HOST, default: localhost)`)
    .action(async (options: ServeOptions) => {
      try {
        // Load config from three layers (defaults → user → env)
        const { loadConfig, applyCliOverrides } = await import("../../config/loader.js");
        const baseConfig = await loadConfig();

        // Apply CLI flag overrides (CLI > env > user > defaults)
        const config = applyCliOverrides(baseConfig, options);

        console.log(`[${binaryName}] Starting HTTP server...`);
        console.log(`[${binaryName}] Host: ${config.server.host}`);
        console.log(`[${binaryName}] Port: ${config.server.port}`);
        console.log(`[${binaryName}] Logging: ${config.logging.profile} (${config.logging.level})`);
        console.log("");

        // Import server factory
        const { createServer, stopServer } = await import("../../server/app.js");

        // Create server
        const server: FastifyInstance = await createServer(identity, {
          host: config.server.host,
          port: config.server.port,
          logging: true,
          logLevel: config.logging.level,
        });

        // Create signal manager for graceful shutdown
        const signalManager = createSignalManager({
          doubleTapWindowMs: 2000, // 2 second window for Ctrl+C double-tap
          doubleTapExitCode: 130, // Standard SIGINT exit code
        });

        // Register shutdown handler (handles SIGTERM and SIGINT with double-tap)
        await onShutdown(signalManager, async (signal: NodeJS.Signals) => {
          console.log(`\n[${binaryName}] Received ${signal}, shutting down gracefully...`);

          try {
            // LIFO cleanup sequence
            await stopServer(server);
            console.log(`[${binaryName}] Server stopped cleanly`);
            process.exit(0);
          } catch (error) {
            console.error(`[${binaryName}] Error during shutdown:`, error);
            process.exit(1);
          }
        });

        // Register config reload handler (SIGHUP)
        await onReload(signalManager, async (signal: NodeJS.Signals) => {
          console.log(`\n[${binaryName}] Received ${signal}, reloading configuration...`);

          try {
            const { reloadConfig } = await import("../../config/loader.js");
            await reloadConfig();

            console.log(`[${binaryName}] Configuration reloaded successfully`);
            console.log("");

            // Log what changes require restart vs. can be applied hot
            console.log(
              `[${binaryName}] ⚠️  Changes requiring restart: server.host, server.port, logging.profile`,
            );
            console.log(
              `[${binaryName}] ℹ️  Changes applied on next request: logging.level, metrics.*`,
            );
            console.log(
              `[${binaryName}] 💡 Tip: Restart server for host/port/profile changes to take effect`,
            );

            // Future work (out of scope for Priority 5):
            // - Hot-apply log level changes to existing logger instance
            // - Hot-toggle metrics collection on/off
            // - Hot-update telemetry namespace in registry
          } catch (error) {
            console.error(`[${binaryName}] Config reload failed (keeping current config):`, error);
            // Don't exit - preserve current config and continue running
          }
        });

        // Start server
        await server.listen({ host: config.server.host, port: config.server.port });

        console.log(
          `[${binaryName}] Server listening on http://${config.server.host}:${config.server.port}`,
        );
        console.log("");
        console.log("Available endpoints:");
        console.log(`  Root:          http://${config.server.host}:${config.server.port}/`);
        console.log(`  Health:        http://${config.server.host}:${config.server.port}/health`);
        console.log(
          `  Health (live): http://${config.server.host}:${config.server.port}/health/live`,
        );
        console.log(
          `  Health (ready):http://${config.server.host}:${config.server.port}/health/ready`,
        );
        console.log(`  Version:       http://${config.server.host}:${config.server.port}/version`);
        console.log(`  Metrics:       http://${config.server.host}:${config.server.port}/metrics`);
        console.log("");
        console.log("Press Ctrl+C to stop (Ctrl+C twice for force quit)");
      } catch (error) {
        // Check if it's a configuration error
        const { ConfigInvalidError } = await import("../../config/types.js");
        if (error instanceof ConfigInvalidError) {
          console.error(`[${binaryName}] Configuration error:`, error.message);
          if (error.details) {
            console.error(`[${binaryName}] Field: ${error.details.field}`);
            console.error(`[${binaryName}] Expected: ${error.details.expected}`);
            console.error(`[${binaryName}] Actual: ${error.details.actual}`);
          }
          process.exit(30); // Foundry exit code: ConfigInvalid
        }

        console.error(`[${binaryName}] Failed to start server:`, error);
        process.exit(1);
      }
    });

  return command;
}
