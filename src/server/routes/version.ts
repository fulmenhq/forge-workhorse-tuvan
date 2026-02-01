/**
 * Version Endpoint
 *
 * Returns comprehensive version and build information including:
 * - App identity (vendor, binary name, description)
 * - Version number (from embedded identity)
 * - Git commit hash (if available)
 * - Build timestamp (if set at build time)
 * - Node.js/Bun runtime info
 * - Embedded dependency versions (tsfulmen, Crucible)
 *
 * CRITICAL: Uses embedded identity pattern - does NOT use directory walking.
 * Works correctly when binary is run outside the repository.
 *
 * Schema provides both runtime validation and OpenAPI documentation.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { getCrucibleVersion } from "@fulmenhq/tsfulmen/crucible";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getBuildDate, getGitCommit, getVersion } from "../../core/version.js";
import { type RuntimeInfo, type VersionResponse, VersionResponseSchema } from "../schemas/index.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * OpenAPI tags for version endpoint
 */
const VERSION_TAGS = ["infrastructure"];

/**
 * Get tsfulmen version from package.json
 */
function getTsfulmenVersion(): string {
  try {
    // Try multiple locations relative to the module
    const candidates = [
      join(__dirname, "..", "..", "..", "package.json"),
      join(__dirname, "..", "..", "package.json"),
      join(process.cwd(), "package.json"),
    ];
    for (const candidate of candidates) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf-8"));
        if (pkg.dependencies?.["@fulmenhq/tsfulmen"]) {
          return pkg.dependencies["@fulmenhq/tsfulmen"].replace(/^[\^~]/, "");
        }
      } catch {
        // Continue to next candidate
      }
    }
  } catch {
    // Fall through to default
  }
  return "unknown";
}

/**
 * Get runtime information
 */
function getRuntimeInfo(): RuntimeInfo {
  const isBun = typeof (globalThis as unknown as { Bun?: unknown }).Bun !== "undefined";

  return {
    name: isBun ? "bun" : "node",
    version: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Register version route
 */
export async function registerVersionRoute(
  server: FastifyInstance,
  identity: Identity,
): Promise<void> {
  /**
   * GET /version - Version information endpoint
   *
   * Returns comprehensive version and SSOT metadata.
   * Crucible version is REQUIRED by Workhorse Standard.
   */
  server.get(
    "/version",
    {
      schema: {
        summary: "Version information",
        description:
          "Returns comprehensive version, build metadata, runtime info, and dependency versions. " +
          "Crucible version is required by the Fulmen Forge Workhorse Standard.",
        tags: VERSION_TAGS,
        response: {
          200: VersionResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Get Crucible version from tsfulmen shim (REQUIRED by Workhorse Standard)
      const crucibleInfo = getCrucibleVersion();

      const response: VersionResponse = {
        identity: {
          vendor: identity.app.vendor,
          binary_name: identity.app.binary_name,
          description: identity.app.description,
        },
        version: getVersion(),
        git_commit: getGitCommit(),
        build_date: getBuildDate(),
        runtime: getRuntimeInfo(),
        dependencies: {
          tsfulmen: getTsfulmenVersion(),
          crucible: crucibleInfo.version,
        },
      };

      return reply.code(200).send(response);
    },
  );
}
