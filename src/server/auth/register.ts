import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { AuthHook } from "@fulmenhq/tsfulmen/foundry";
import type { FastifyInstance } from "fastify";
import type { DataPlaneAuthConfig } from "../../config/types.js";
import { categorizeRequestPath } from "./policy.js";

export interface RequestAuthContext {
  authenticated: boolean;
  identity?: string;
  reason?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: RequestAuthContext;
    authCategory?: "deny" | "public" | "conditional" | "protected";
  }
}

export async function registerDataPlaneAuth(options: {
  server: FastifyInstance;
  identity: Identity;
  config: DataPlaneAuthConfig;
  authHook: AuthHook;
}): Promise<void> {
  const { server, config, authHook } = options;

  if (!config.enabled) return;

  server.addHook("onRequest", async (request, reply) => {
    const category = categorizeRequestPath(request.url, config.policy);
    request.authCategory = category;

    if (category === "deny") {
      return reply.code(404).send({
        error: {
          code: "NOT_FOUND",
          message: `Route ${request.method} ${request.url} not found`,
        },
      });
    }

    const result = await authHook(request);
    request.auth = {
      authenticated: result.authenticated,
      identity: result.identity,
      reason: result.reason,
    };

    if (category === "protected" && !result.authenticated) {
      return reply.code(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // public + conditional proceed regardless; handlers may inspect request.auth
  });
}
