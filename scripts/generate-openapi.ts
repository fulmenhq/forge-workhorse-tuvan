#!/usr/bin/env node
/**
 * OpenAPI Specification Generator
 *
 * Generates OpenAPI specification at build time by:
 * 1. Creating a temporary server instance
 * 2. Extracting the generated OpenAPI spec
 * 3. Writing to dist/openapi.yaml
 *
 * This ensures the spec is always in sync with the actual route schemas.
 *
 * Usage:
 *   make openapi
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { createServer } from "../src/server/app.js";

const ROOT_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_DIR = resolve(ROOT_DIR, "dist");
const OPENAPI_YAML = resolve(DIST_DIR, "openapi.yaml");
const OPENAPI_JSON = resolve(DIST_DIR, "openapi.json");

async function main() {
  console.log("Generating OpenAPI specification...");

  try {
    // Load app identity
    const identity = await loadIdentity();

    // Create server instance (don't start it)
    const server = await createServer(identity, {
      host: "localhost",
      port: 8080,
      logging: false, // Disable logging during generation
    });

    // Wait for Fastify to be ready (registers all routes and plugins)
    await server.ready();

    // Extract OpenAPI spec
    const yamlSpec = server.swagger({ yaml: true });
    const jsonSpec = server.swagger();

    // Ensure dist directory exists
    mkdirSync(DIST_DIR, { recursive: true });

    // Write specs
    writeFileSync(OPENAPI_YAML, yamlSpec as string, "utf-8");
    writeFileSync(OPENAPI_JSON, JSON.stringify(jsonSpec, null, 2), "utf-8");

    // Close server
    await server.close();

    console.log("OK: OpenAPI specification generated:");
    console.log(`- ${OPENAPI_YAML}`);
    console.log(`- ${OPENAPI_JSON}`);
  } catch (error) {
    console.error("ERROR: Failed to generate OpenAPI spec:", error);
    process.exit(1);
  }
}

main();
