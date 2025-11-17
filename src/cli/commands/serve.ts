/**
 * Serve Command
 *
 * Starts the HTTP server. This is a stub implementation for Phase 2.
 * Full HTTP server implementation will be completed in Phase 3.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { Command } from "commander";

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
    .action((options: ServeOptions) => {
      const config = getServerConfig(envPrefix, options);

      console.log(`[${binaryName}] Starting HTTP server...`);
      console.log(`[${binaryName}] Host: ${config.host}`);
      console.log(`[${binaryName}] Port: ${config.port}`);
      console.log("");
      console.log("⚠️  HTTP server implementation coming in Phase 3");
      console.log("   This is a stub - full Fastify server will be implemented next.");
      console.log("");
      console.log(`Server would be available at: http://${config.host}:${config.port}/`);
      console.log(`  Health checks: http://${config.host}:${config.port}/health`);
      console.log(`  Version info: http://${config.host}:${config.port}/version`);
      console.log(`  Metrics: http://${config.host}:${config.port}/metrics`);
    });

  return command;
}
