/**
 * Control Plane Server Factory
 *
 * A separate Fastify instance intended for operational endpoints.
 * Default posture:
 * - Bind to loopback host (127.0.0.1)
 * - Auth-gated control endpoints (bearer token starter)
 */

import crypto from "node:crypto";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { SignalManager } from "@fulmenhq/tsfulmen/foundry";
import { applyFulmenAjvFormats } from "@fulmenhq/tsfulmen/schema";
import type { default as Ajv } from "ajv";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import Fastify from "fastify";
import type { ControlPlaneConfig } from "../config/types.js";
import { getVersion } from "../core/version.js";
import {
  getLogger,
  initializeLogger,
  isLoggerInitialized,
  LoggingProfile,
} from "../observability/logger.js";
import { initializeMetrics } from "../observability/metrics.js";
import { registerControlConfigRoutes } from "./routes/control/config.js";
import { registerControlSignalRoute } from "./routes/control/signal.js";

export async function createControlPlaneServer(options: {
  identity: Identity;
  controlPlane: ControlPlaneConfig;
  signalManager: SignalManager;
}): Promise<FastifyInstance> {
  const { identity, controlPlane, signalManager } = options;
  const version = getVersion();

  if (!isLoggerInitialized()) {
    initializeLogger(identity, LoggingProfile.STRUCTURED, ["authorization"]);
  }
  const logger = getLogger();

  // Fastify's AJV plugin type intentionally accepts `unknown` options;
  // tsfulmen's helper uses a narrower options type.
  // Wrap it to keep typecheck/build stable across Fastify upgrades.
  const applyAjvFormats = (ajv: Ajv, options?: unknown): Ajv =>
    applyFulmenAjvFormats(ajv, options as never);

  const fastifyOptions: FastifyServerOptions = {
    logger: {
      level: "info",
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
    genReqId: () => crypto.randomUUID(),
    disableRequestLogging: true,
    ajv: {
      plugins: [applyAjvFormats],
    },
  };

  const server = Fastify(fastifyOptions);

  // Security headers; no CORS by default on control plane
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // OpenAPI generator for control plane endpoints
  await server.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: `${identity.app.binary_name} Control Plane`,
        description: "Operational endpoints (control plane)",
        version,
      },
      tags: [
        {
          name: "control",
          description: "Control plane endpoints (admin/control)",
        },
      ],
      servers: [
        {
          url: `http://${controlPlane.host}:${controlPlane.port}`,
          description: "Control plane server",
        },
      ],
    },
  });

  // Metrics instrumentation (shares registry with data plane)
  const metricsPlugin = initializeMetrics(identity);
  await server.register(metricsPlugin);

  // Minimal request logging via tsfulmen logger
  server.addHook("onRequest", async (request) => {
    logger.info("Control request", {
      method: request.method,
      url: request.url,
      requestId: request.id,
      remoteAddress: request.ip,
    });
  });

  // OpenAPI endpoints for control plane
  server.get("/openapi.yaml", async (_request, reply) => {
    const yaml = server.swagger({ yaml: true });
    return reply.type("application/yaml").send(yaml);
  });

  server.get("/openapi.json", async (_request, reply) => {
    const json = server.swagger();
    return reply.type("application/json").send(json);
  });

  // Control plane routes
  await registerControlConfigRoutes({
    server,
    controlPlane,
  });
  await registerControlSignalRoute({
    server,
    identity,
    controlPlane,
    signalManager,
  });

  // Global error handler
  server.setErrorHandler(
    async (error: Error & { statusCode?: number; code?: string }, request, reply) => {
      logger.error("Control request error", error, {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: error.statusCode || 500,
        errorCode: error.code,
      });

      reply.code(error.statusCode || 500).send({
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: "An internal error occurred",
        },
      });
    },
  );

  return server;
}
