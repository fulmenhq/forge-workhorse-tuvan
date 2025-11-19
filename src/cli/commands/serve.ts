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
 * Server configuration options
 */
interface ServeOptions {
  port?: string;
  host?: string;
}

/**
 * Get default server configuration from environment or defaults
 *
 * @param envPrefix - Environment variable prefix from app identity
 * @param options - Command-line options
 * @returns Server configuration
 */
function getServerConfig(envPrefix: string, options: ServeOptions): { host: string; port: number } {
  const defaultHost = "localhost";
  const defaultPort = 8080;

  // Priority: CLI options > Environment variables > Defaults
  const host = options.host || process.env[`${envPrefix}HOST`] || defaultHost;

  const portString = options.port || process.env[`${envPrefix}PORT`] || String(defaultPort);
  const port = Number.parseInt(portString, 10);

  return { host, port };
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
      const config = getServerConfig(envPrefix, options);

      console.log(`[${binaryName}] Starting HTTP server...`);
      console.log(`[${binaryName}] Host: ${config.host}`);
      console.log(`[${binaryName}] Port: ${config.port}`);
      console.log("");

      try {
        // Import server factory
        const { createServer, stopServer } = await import("../../server/app.js");

        // Create server
        const server: FastifyInstance = await createServer(identity, {
          host: config.host,
          port: config.port,
          logging: true,
          logLevel: "info",
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
        // TODO: Integrate with three-layer config in Priority 5
        await onReload(signalManager, async (signal: NodeJS.Signals) => {
          console.log(`\n[${binaryName}] Received ${signal} - config reload not yet implemented`);
          console.log(`[${binaryName}] Will be integrated with three-layer config in Phase 3A Priority 5`);
        });

        // Start server
        await server.listen({ host: config.host, port: config.port });

        console.log(`[${binaryName}] Server listening on http://${config.host}:${config.port}`);
        console.log("");
        console.log("Available endpoints:");
        console.log(`  Root:          http://${config.host}:${config.port}/`);
        console.log(`  Health:        http://${config.host}:${config.port}/health`);
        console.log(`  Health (live): http://${config.host}:${config.port}/health/live`);
        console.log(`  Health (ready):http://${config.host}:${config.port}/health/ready`);
        console.log(`  Version:       http://${config.host}:${config.port}/version`);
        console.log(`  Metrics:       http://${config.host}:${config.port}/metrics`);
        console.log("");
        console.log("Press Ctrl+C to stop (Ctrl+C twice for force quit)");
      } catch (error) {
        console.error(`[${binaryName}] Failed to start server:`, error);
        process.exit(1);
      }
    });

  return command;
}
