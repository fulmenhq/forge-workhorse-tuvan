/**
 * Control Plane: Signal Endpoint
 *
 * Implements POST {basePath}/signal using tsfulmen's framework-agnostic
 * createSignalEndpoint helper.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import {
  type ControlDiscoveryErrorResponse,
  type ControlDiscoveryResponse,
  type ControlEndpointDescriptor,
  createControlDiscoveryEndpoint,
  createSignalEndpoint,
  createSimpleRateLimiter,
  type SignalManager,
} from "@fulmenhq/tsfulmen/foundry";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ControlPlaneConfig } from "../../../config/types.js";
import { getVersion } from "../../../core/version.js";
import { createPlaneAuthHook } from "../../auth/plane-auth.js";

const SignalRequestSchema = Type.Object(
  {
    signal: Type.String({
      description: "Signal name or id (e.g. SIGTERM, SIGHUP)",
      examples: ["SIGTERM", "SIGHUP"],
    }),
    reason: Type.Optional(Type.String({ description: "Human-readable reason" })),
    correlation_id: Type.Optional(Type.String({ description: "Correlation id for traceability" })),
  },
  { additionalProperties: false },
);

const SignalAcceptedSchema = Type.Object(
  {
    status: Type.Literal("accepted"),
    signal: Type.String(),
    correlation_id: Type.String(),
    message: Type.String(),
  },
  { additionalProperties: false },
);

const SignalErrorSchema = Type.Object(
  {
    status: Type.Literal("error"),
    error: Type.String(),
    message: Type.String(),
    valid_signals: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false },
);

const ControlDiscoverySchema = Type.Object(
  {
    status: Type.Literal("ok"),
    service: Type.Object(
      {
        name: Type.String(),
        vendor: Type.String(),
        version: Type.String(),
      },
      { additionalProperties: false },
    ),
    runtime: Type.Object(
      {
        name: Type.String(),
        version: Type.Optional(Type.String()),
        platform: Type.String(),
        arch: Type.String(),
      },
      { additionalProperties: false },
    ),
    auth_summary: Type.Optional(Type.String()),
    endpoints: Type.Array(
      Type.Object(
        {
          method: Type.String(),
          path: Type.String(),
          summary: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

const ControlDiscoveryErrorSchema = Type.Object(
  {
    status: Type.Literal("error"),
    error: Type.String(),
    message: Type.String(),
  },
  { additionalProperties: false },
);

export async function registerControlSignalRoute(options: {
  server: FastifyInstance;
  identity: Identity;
  controlPlane: ControlPlaneConfig;
  signalManager: SignalManager;
}): Promise<void> {
  const { server, identity, controlPlane, signalManager } = options;

  const basePath = controlPlane.basePath;
  const auth = createPlaneAuthHook(controlPlane.auth);
  const rateLimit =
    controlPlane.auth.rateLimitPerMinute > 0
      ? createSimpleRateLimiter(controlPlane.auth.rateLimitPerMinute)
      : undefined;

  const handler = createSignalEndpoint({
    manager: signalManager,
    auth,
    rateLimit,
  });

  await server.register(
    async (scoped) => {
      scoped.post(
        "/signal",
        {
          schema: {
            summary: "Inject a process signal",
            description:
              "Control-plane endpoint for environments where OS signals are not available. " +
              "Auth is required when the control plane is bound to a non-loopback host.",
            tags: ["control"],
            body: SignalRequestSchema,
            response: {
              202: SignalAcceptedSchema,
              400: SignalErrorSchema,
              401: SignalErrorSchema,
              403: SignalErrorSchema,
            },
          },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const result = await handler(
            request.body as {
              signal: string;
              reason?: string;
              correlation_id?: string;
            },
            request,
          );

          if (result.status === "accepted") {
            return reply.code(202).send(result);
          }

          const statusCode = result.statusCode ?? 400;
          return reply.code(statusCode).send(result);
        },
      );

      // Minimal discovery endpoint for the control plane
      scoped.get(
        "/",
        {
          schema: {
            summary: "Control plane discovery",
            description: "Returns control plane discovery info.",
            tags: ["control"],
            response: {
              200: ControlDiscoverySchema,
              401: ControlDiscoveryErrorSchema,
            },
          },
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const version = getVersion();

          const endpoints: ControlEndpointDescriptor[] = [
            { method: "GET", path: `${basePath}/`, summary: "Control discovery" },
            { method: "POST", path: `${basePath}/signal`, summary: "Signal injection" },
            { method: "POST", path: `${basePath}/config/reload`, summary: "Config reload" },
          ];

          const tokenConfigured =
            controlPlane.auth.mode === "bearerToken"
              ? (controlPlane.auth.bearerToken || "").trim() !== ""
              : controlPlane.auth.mode === "basicAuth"
                ? (controlPlane.auth.basicUser || "").trim() !== "" &&
                  (controlPlane.auth.basicPassword || "").trim() !== ""
                : true;

          const authSummary = `${controlPlane.auth.mode} (configured=${tokenConfigured ? "yes" : "no"}, loopback-unauth=${controlPlane.auth.allowUnauthenticatedLoopback ? "on" : "off"})`;

          const discovery = createControlDiscoveryEndpoint({
            identity,
            version,
            endpoints,
            authSummary,
          });

          const result = await discovery(request);
          const statusCode = result.statusCode ?? (result.status === "ok" ? 200 : 500);
          return reply
            .code(statusCode)
            .send(result as ControlDiscoveryResponse | ControlDiscoveryErrorResponse);
        },
      );
    },
    { prefix: basePath },
  );
}
