/**
 * Control Plane: Config Reload Endpoint
 */

import {
  type ConfigReloadErrorResponse,
  type ConfigReloadResponse,
  createConfigReloadEndpoint,
  createSimpleRateLimiter,
} from "@fulmenhq/tsfulmen/foundry";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { reloadConfig } from "../../../config/loader.js";
import type { ControlPlaneConfig } from "../../../config/types.js";
import { createPlaneAuthHook } from "../../auth/plane-auth.js";

export async function registerControlConfigRoutes(options: {
  server: FastifyInstance;
  controlPlane: ControlPlaneConfig;
}): Promise<void> {
  const { server, controlPlane } = options;

  const auth = createPlaneAuthHook(controlPlane.auth);
  const limiter =
    controlPlane.auth.rateLimitPerMinute > 0
      ? createSimpleRateLimiter(controlPlane.auth.rateLimitPerMinute)
      : undefined;

  const handler = createConfigReloadEndpoint({
    loader: async () => {
      return await reloadConfig();
    },
    auth,
    rateLimit: limiter
      ? async (identity: string) => {
          return await limiter(identity, "config.reload");
        }
      : undefined,
  });

  await server.register(
    async (scoped) => {
      scoped.post(
        "/config/reload",
        {
          schema: {
            summary: "Reload configuration",
            description:
              "Triggers a config reload using the three-layer loader (defaults -> user -> env).",
            tags: ["control"],
          },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const result = await handler((request.body ?? {}) as object, request);
          const statusCode = result.statusCode ?? (result.status === "reloaded" ? 200 : 500);
          return reply
            .code(statusCode)
            .send(result as ConfigReloadResponse | ConfigReloadErrorResponse);
        },
      );
    },
    { prefix: controlPlane.basePath },
  );
}
