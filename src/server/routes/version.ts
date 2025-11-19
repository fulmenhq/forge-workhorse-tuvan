/**
 * Version Endpoint
 *
 * Returns comprehensive version and build information including:
 * - App identity (vendor, binary name, description)
 * - Version number
 * - Git commit hash (if available)
 * - Build timestamp
 * - Node.js/Bun runtime info
 * - Embedded dependency versions (tsfulmen, Crucible)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getBuildDate, getGitCommit, getVersion } from "../../core/version.js";

/**
 * Version information response
 */
export interface VersionResponse {
  /** Application identity */
  identity: {
    vendor: string;
    binary_name: string;
    description: string;
  };
  /** Version number */
  version: string;
  /** Git commit hash (short) */
  git_commit?: string;
  /** Build timestamp (RFC3339) */
  build_date?: string;
  /** Runtime information */
  runtime: {
    name: string; // "node" or "bun"
    version: string;
    platform: string;
    arch: string;
  };
  /** Dependency versions */
  dependencies: {
    tsfulmen?: string;
    crucible?: string;
  };
}

/**
 * Get tsfulmen version from package.json
 */
function getTsfulmenVersion(): string | undefined {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    return packageJson.dependencies?.["@fulmenhq/tsfulmen"]?.replace(/^[\^~]/, "");
  } catch {
    return undefined;
  }
}

/**
 * Get runtime information
 */
function getRuntimeInfo(): VersionResponse["runtime"] {
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
   */
  server.get("/version", async (_request: FastifyRequest, reply: FastifyReply) => {
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
        // TODO: Add Crucible version if/when it's tracked
      },
    };

    return reply.code(200).send(response);
  });
}
