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
  controlHost?: string;
  controlPort?: string;
  adminBasePath?: string;
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
    .option(
      "-p, --port <port>",
      `Port to listen on (env: ${envPrefix}PORT or ${envPrefix}SERVER_PORT, default: 8080)`,
    )
    .option(
      "-H, --host <host>",
      `Host to bind to (env: ${envPrefix}HOST or ${envPrefix}SERVER_HOST, default: localhost)`,
    )
    .option(
      "--control-host <host>",
      `Control plane host (env: ${envPrefix}CONTROL_PLANE_HOST, default: 127.0.0.1)`,
    )
    .option(
      "--control-port <port>",
      `Control plane port (env: ${envPrefix}CONTROL_PLANE_PORT, default: 8081)`,
    )
    .option(
      "--admin-base-path <path>",
      `Control plane base path (env: ${envPrefix}ADMIN_BASE_PATH, default: /control)`,
    )
    .action(async (options: ServeOptions) => {
      try {
        // Load config from three layers (defaults → user → env)
        const { loadConfig, applyCliOverrides } = await import("../../config/loader.js");
        const baseConfig = await loadConfig();

        // Apply CLI flag overrides (CLI > env > user > defaults)
        const config = applyCliOverrides(baseConfig, options);

        console.log(`[${binaryName}] Starting HTTP server...`);
        console.log(
          `[${binaryName}] Data plane: http://${config.server.host}:${config.server.port}`,
        );
        console.log(
          `[${binaryName}] Data plane auth: ${config.dataPlaneAuth.enabled ? "enabled" : "disabled"} (${config.dataPlaneAuth.auth.mode})`,
        );
        if (config.controlPlane.enabled) {
          console.log(
            `[${binaryName}] Control plane: http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}`,
          );
          console.log(
            `[${binaryName}] Control auth: ${config.controlPlane.auth.mode} (loopback-unauth=${config.controlPlane.auth.allowUnauthenticatedLoopback ? "on" : "off"})`,
          );
        }
        console.log(`[${binaryName}] Logging: ${config.logging.profile} (${config.logging.level})`);
        console.log("");

        // Import server factories
        const { createServer, stopServer } = await import("../../server/app.js");
        const { createControlPlaneServer } = await import("../../server/control-plane.js");

        // Create data plane server
        const server: FastifyInstance = await createServer(identity, {
          host: config.server.host,
          port: config.server.port,
          logging: true,
          logLevel: config.logging.level,
          dataPlaneAuth: config.dataPlaneAuth,
        });

        // Create signal manager for graceful shutdown / reload
        const signalManager = createSignalManager({
          doubleTapWindowMs: 2000,
          doubleTapExitCode: 130,
        });

        // Optional: create control plane server
        const controlServer: FastifyInstance | null = config.controlPlane.enabled
          ? await createControlPlaneServer({
              identity,
              controlPlane: config.controlPlane,
              signalManager,
            })
          : null;

        // Register shutdown handler (handles SIGTERM and SIGINT with double-tap)
        await onShutdown(signalManager, async (signal: NodeJS.Signals) => {
          console.log(`\n[${binaryName}] Received ${signal}, shutting down gracefully...`);

          try {
            // LIFO cleanup sequence
            if (controlServer) {
              await stopServer(controlServer);
            }
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
              `[${binaryName}] NOTE: Restart required for server.host/server.port/logging.profile changes`,
            );
            console.log(
              `[${binaryName}] NOTE: Next-request changes include logging.level and metrics.*`,
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

        if (controlServer) {
          await controlServer.listen({
            host: config.controlPlane.host,
            port: config.controlPlane.port,
          });
        }

        console.log(
          `[${binaryName}] Server listening on http://${config.server.host}:${config.server.port}`,
        );
        console.log("");
        console.log("Data plane endpoints:");
        console.log(`  Root:    http://${config.server.host}:${config.server.port}/`);
        console.log(`  Health:  http://${config.server.host}:${config.server.port}/health`);
        console.log(`  Live:    http://${config.server.host}:${config.server.port}/health/live`);
        console.log(`  Ready:   http://${config.server.host}:${config.server.port}/health/ready`);
        console.log(`  Version: http://${config.server.host}:${config.server.port}/version`);
        console.log(`  Metrics: http://${config.server.host}:${config.server.port}/metrics`);
        console.log(`  OpenAPI: http://${config.server.host}:${config.server.port}/openapi.yaml`);

        if (controlServer) {
          console.log("");
          console.log("Control plane endpoints:");
          console.log(
            `  Discovery: http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}/`,
          );
          console.log(
            `  Signal:    http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}/signal`,
          );
          console.log(
            `  Reload:    http://${config.controlPlane.host}:${config.controlPlane.port}${config.controlPlane.basePath}/config/reload`,
          );
          console.log(
            `  OpenAPI:   http://${config.controlPlane.host}:${config.controlPlane.port}/openapi.yaml`,
          );
        }
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
