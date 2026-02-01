/**
 * Fastify Server Factory
 *
 * Creates and configures a Fastify HTTP server instance with:
 * - Security headers (Helmet)
 * - CORS support
 * - Request ID correlation
 * - Structured logging (tsfulmen/logging with security middleware)
 * - Standard endpoints (health, version, metrics)
 * - OpenAPI specification generation (@fastify/swagger)
 */

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { applyFulmenAjvFormats } from "@fulmenhq/tsfulmen/schema";
import type { default as Ajv } from "ajv";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import Fastify from "fastify";
import type { DataPlaneAuthConfig } from "../config/types.js";
import { getVersion } from "../core/version.js";
import {
  getLogger,
  initializeLogger,
  isLoggerInitialized,
  LoggingProfile,
} from "../observability/logger.js";
import { initializeMetrics } from "../observability/metrics.js";
import { createPlaneAuthHook } from "./auth/plane-auth.js";
import { registerDataPlaneAuth } from "./auth/register.js";
import { ServiceInfoSchema } from "./schemas/index.js";

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Host to bind to (default: localhost) */
  host: string;
  /** Port to listen on (default: 8080) */
  port: number;
  /** Enable request logging (default: true) */
  logging?: boolean;
  /** Log level (default: info) */
  logLevel?: "fatal" | "error" | "warn" | "info" | "debug" | "trace";

  /** Data plane auth configuration (optional) */
  dataPlaneAuth?: DataPlaneAuthConfig;
}

/**
 * Create a configured Fastify server instance
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @param config - Server configuration options
 * @returns Configured Fastify instance
 *
 * @example
 * ```typescript
 * const identity = loadAppIdentity();
 * const server = createServer(identity, { host: "0.0.0.0", port: 8080 });
 * await server.listen({ host: config.host, port: config.port });
 * ```
 */
export async function createServer(
  identity: Identity,
  config: ServerConfig,
): Promise<FastifyInstance> {
  const binaryName = identity.app.binary_name;
  const version = getVersion();

  // Initialize tsfulmen logger if not already initialized
  // Use STRUCTURED profile for server (v0.1.11+: now supports middleware)
  // RedactSecretsMiddleware enabled automatically via createStructuredLoggerWithRedaction
  if (!isLoggerInitialized()) {
    initializeLogger(identity, LoggingProfile.STRUCTURED, [
      // Custom secret keys for HTTP server (beyond defaults)
      "x-auth-token",
    ]);
  }

  const logger = getLogger();

  // Fastify's AJV plugin type intentionally accepts `unknown` options;
  // tsfulmen's helper uses a narrower options type.
  // Wrap it to keep typecheck/build stable across Fastify upgrades.
  const applyAjvFormats = (ajv: Ajv, options?: unknown): Ajv =>
    applyFulmenAjvFormats(ajv, options as never);

  // Configure Fastify with simplified Pino for HTTP request logging
  const fastifyOptions: FastifyServerOptions = {
    logger:
      config.logging !== false
        ? {
            level: config.logLevel || "info",
            // Simplified serializers (tsfulmen logger handles application logging)
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                remoteAddress: req.ip,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
          }
        : false,
    // Generate request IDs for correlation
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
    genReqId: () => crypto.randomUUID(),
    // We'll use custom logging hooks with tsfulmen logger
    disableRequestLogging: true,
    ajv: {
      plugins: [applyAjvFormats],
    },
  };

  const server: FastifyInstance = Fastify(fastifyOptions);

  // Optional data plane auth enforcement
  if (config.dataPlaneAuth) {
    await registerDataPlaneAuth({
      server,
      identity,
      config: config.dataPlaneAuth,
      authHook: createPlaneAuthHook(config.dataPlaneAuth.auth),
    });
  }

  // Register OpenAPI/Swagger documentation generator
  // Schemas defined on routes are automatically included in the spec
  await server.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: `${binaryName} API`,
        description: identity.app.description,
        version: version,
        contact: {
          name: identity.app.vendor,
          url: `https://github.com/${identity.app.vendor}/${binaryName}`,
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: `http://${config.host}:${config.port}`,
          description: "Local development server",
        },
      ],
      tags: [
        {
          name: "infrastructure",
          description: "Health, version, metrics, and OpenAPI endpoints",
        },
      ],
    },
  });

  // Register security headers (Helmet)
  await server.register(helmet, {
    // Allow inline scripts for development (adjust for production)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // Register CORS support
  await server.register(cors, {
    origin: true, // Allow all origins in template (users can restrict)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // Register HTTP metrics plugin (tsfulmen v0.1.11+)
  // Automatically instruments all requests with Prometheus metrics
  const metricsPlugin = initializeMetrics(identity);
  await server.register(metricsPlugin);

  // Add request timing decorator
  server.addHook("onRequest", async (request, _reply) => {
    request.requestTime = Date.now();

    // Log incoming request with tsfulmen logger
    logger.info("Incoming request", {
      method: request.method,
      url: request.url,
      requestId: request.id,
      remoteAddress: request.ip,
    });
  });

  // Add response time header and log completion
  server.addHook("onSend", async (request, reply) => {
    const duration = Date.now() - (request.requestTime || Date.now());
    reply.header("x-response-time", `${duration}ms`);

    // Ensure request ID is returned in response headers for correlation
    if (request.id) {
      reply.header("x-request-id", request.id);
    }
  });

  // Log request completion with tsfulmen logger
  server.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - (request.requestTime || Date.now());
    const logLevel = reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info";

    const logMessage = "Request completed";
    const logContext = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: duration,
      requestId: request.id,
    };

    if (logLevel === "error") {
      logger.error(logMessage, undefined, logContext);
    } else if (logLevel === "warn") {
      logger.warn(logMessage, logContext);
    } else {
      logger.info(logMessage, logContext);
    }
  });

  // Register routes
  const { registerHealthRoutes } = await import("./routes/health.js");
  const { registerVersionRoute } = await import("./routes/version.js");
  const { registerMetricsRoute } = await import("./routes/metrics.js");

  await registerHealthRoutes(server, identity);
  await registerVersionRoute(server, identity);
  await registerMetricsRoute(server, identity);

  // Root endpoint - service information
  server.get(
    "/",
    {
      schema: {
        summary: "Service information",
        description: "Returns basic service information and available endpoints.",
        tags: ["infrastructure"],
        response: {
          200: ServiceInfoSchema,
        },
      },
    },
    async (_request, _reply) => {
      return {
        service: binaryName,
        description: identity.app.description,
        version: version,
        endpoints: {
          health: "/health",
          version: "/version",
          metrics: "/metrics",
        },
      };
    },
  );

  // OpenAPI specification endpoint (Workhorse Standard requirement)
  server.get(
    "/openapi.yaml",
    {
      schema: {
        summary: "OpenAPI specification",
        description: "Returns the OpenAPI 3.1 specification for this API in YAML format.",
        tags: ["infrastructure"],
        produces: ["application/yaml"],
      },
    },
    async (_request, reply) => {
      const yaml = server.swagger({ yaml: true });
      return reply.type("application/yaml").send(yaml);
    },
  );

  // OpenAPI specification in JSON format
  server.get(
    "/openapi.json",
    {
      schema: {
        summary: "OpenAPI specification (JSON)",
        description: "Returns the OpenAPI 3.1 specification for this API in JSON format.",
        tags: ["infrastructure"],
        produces: ["application/json"],
      },
    },
    async (_request, reply) => {
      const json = server.swagger();
      return reply.type("application/json").send(json);
    },
  );

  // 404 handler
  // Note: setNotFoundHandler doesn't support schema option, so 404 responses
  // are not included in OpenAPI spec (which is standard behavior)
  server.setNotFoundHandler(async (request, reply) => {
    reply.code(404).send({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  // Global error handler with tsfulmen logger
  server.setErrorHandler(
    async (error: Error & { statusCode?: number; code?: string }, request, reply) => {
      // Log error with tsfulmen logger (security middleware will redact sensitive data)
      logger.error("Request error", error, {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: error.statusCode || 500,
        errorCode: error.code,
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== "production";

      reply.code(error.statusCode || 500).send({
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: isDevelopment ? error.message : "An internal error occurred",
          ...(isDevelopment && { stack: error.stack }),
        },
      });
    },
  );

  return server;
}

/**
 * Start the server and listen on configured host/port
 *
 * @param server - Fastify server instance
 * @param config - Server configuration
 * @returns Promise that resolves when server is listening
 */
export async function startServer(server: FastifyInstance, config: ServerConfig): Promise<void> {
  await server.listen({
    host: config.host,
    port: config.port,
  });
}

/**
 * Gracefully stop the server
 *
 * @param server - Fastify server instance
 * @returns Promise that resolves when server is closed
 */
export async function stopServer(server: FastifyInstance): Promise<void> {
  await server.close();
}

// Augment FastifyRequest with custom properties
declare module "fastify" {
  interface FastifyRequest {
    requestTime?: number;
  }
}
