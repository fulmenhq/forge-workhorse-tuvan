/**
 * Fastify Server Factory
 *
 * Creates and configures a Fastify HTTP server instance with:
 * - Security headers (Helmet)
 * - CORS support
 * - Request ID correlation
 * - Structured logging (tsfulmen/logging with security middleware)
 * - Standard endpoints (health, version, metrics)
 */

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import Fastify from "fastify";
import { getVersion } from "../core/version.js";
import { LoggingProfile, getLogger, initializeLogger, isLoggerInitialized } from "../observability/logger.js";
import { initializeMetrics } from "../observability/metrics.js";

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
  };

  const server: FastifyInstance = Fastify(fastifyOptions);

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
  });

  // Log request completion with tsfulmen logger
  server.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - (request.requestTime || Date.now());
    const logLevel = reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info";

    const logMessage = `Request completed`;
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

  // Root endpoint
  server.get("/", async (_request, _reply) => {
    return {
      service: binaryName,
      description: identity.app.description,
      version: getVersion(),
      endpoints: {
        health: "/health",
        version: "/version",
        metrics: "/metrics",
      },
    };
  });

  // 404 handler
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
      logger.error(
        "Request error",
        error,
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: error.statusCode || 500,
          errorCode: error.code,
        },
      );

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
