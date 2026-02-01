/**
 * Health Check Endpoints
 *
 * Implements standard health check endpoints following the Fulmen Forge Workhorse Standard:
 * - GET /health - Aggregate health with semantic status
 * - GET /health/live - Liveness probe (fast, no dependency checks)
 * - GET /health/ready - Readiness probe (checks dependencies)
 * - GET /health/startup - Startup probe (initialization complete)
 *
 * All responses include RFC3339 timestamps and version metadata.
 * Schemas provide both runtime validation and OpenAPI documentation.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getVersion } from "../../core/version.js";
import {
  type HealthCheck,
  type HealthResponse,
  HealthResponseSchema,
  type HealthStatus,
} from "../schemas/index.js";

/**
 * OpenAPI tags for health endpoints
 */
const HEALTH_TAGS = ["infrastructure"];

/**
 * Application startup time for uptime calculation
 */
const startupTime = Date.now();

/**
 * Get current RFC3339 timestamp
 */
function getRFC3339Timestamp(): string {
  return new Date().toISOString();
}

/**
 * Get application uptime in seconds
 */
function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startupTime) / 1000);
}

/**
 * Perform a health check
 */
async function performCheck(name: string, checkFn: () => Promise<boolean>): Promise<HealthCheck> {
  const start = Date.now();
  const timestamp = getRFC3339Timestamp();

  try {
    const result = await checkFn();
    const duration_ms = Date.now() - start;

    return {
      name,
      status: result ? "healthy" : "unhealthy",
      timestamp,
      duration_ms,
    };
  } catch (error) {
    const duration_ms = Date.now() - start;
    const message = error instanceof Error ? error.message : "Check failed";

    return {
      name,
      status: "unhealthy",
      message,
      timestamp,
      duration_ms,
    };
  }
}

/**
 * Calculate aggregate status from individual checks
 */
function calculateAggregateStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.length === 0) return "healthy";

  const unhealthyCount = checks.filter((c) => c.status === "unhealthy").length;
  const degradedCount = checks.filter((c) => c.status === "degraded").length;

  if (unhealthyCount > 0) return "unhealthy";
  if (degradedCount > 0) return "degraded";
  return "healthy";
}

/**
 * Liveness check - Is the process alive?
 * Fast check with no external dependencies
 */
async function livenessCheck(): Promise<boolean> {
  // Process is alive if we can execute this function
  return true;
}

/**
 * Readiness check - Is the service ready to accept traffic?
 * Checks dependencies like databases, message queues, etc.
 */
async function readinessCheck(): Promise<boolean> {
  // TODO: Add checks for:
  // - Database connectivity
  // - Message queue connectivity
  // - External service dependencies
  // For now, assume ready if alive
  return true;
}

/**
 * Startup check - Has initialization completed?
 * Used to determine if the service has finished starting up
 */
async function startupCheck(): Promise<boolean> {
  // TODO: Add checks for:
  // - Configuration loaded
  // - Database migrations applied
  // - Cache warmed up
  // For now, assume started if alive
  return true;
}

/**
 * Register health check routes
 */
export async function registerHealthRoutes(
  server: FastifyInstance,
  identity: Identity,
): Promise<void> {
  const binaryName = identity.app.binary_name;
  const version = getVersion();

  /**
   * GET /health - Aggregate health endpoint
   */
  server.get(
    "/health",
    {
      schema: {
        summary: "Aggregate health check",
        description:
          "Returns overall health status with individual check results for liveness, readiness, and startup.",
        tags: HEALTH_TAGS,
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const checks: HealthCheck[] = await Promise.all([
        performCheck("liveness", livenessCheck),
        performCheck("readiness", readinessCheck),
        performCheck("startup", startupCheck),
      ]);

      const status = calculateAggregateStatus(checks);
      const response: HealthResponse = {
        status,
        service: binaryName,
        version,
        timestamp: getRFC3339Timestamp(),
        checks,
        uptime_seconds: getUptimeSeconds(),
      };

      // Set appropriate HTTP status code
      const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;
      return reply.code(httpStatus).send(response);
    },
  );

  /**
   * GET /health/live - Liveness probe
   */
  server.get(
    "/health/live",
    {
      schema: {
        summary: "Liveness probe",
        description:
          "Fast liveness check for container orchestration. Returns healthy if the process is running.",
        tags: HEALTH_TAGS,
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const check = await performCheck("liveness", livenessCheck);
      const status = check.status;

      const response: HealthResponse = {
        status,
        service: binaryName,
        version,
        timestamp: getRFC3339Timestamp(),
        checks: [check],
        uptime_seconds: getUptimeSeconds(),
      };

      const httpStatus = status === "healthy" ? 200 : 503;
      return reply.code(httpStatus).send(response);
    },
  );

  /**
   * GET /health/ready - Readiness probe
   */
  server.get(
    "/health/ready",
    {
      schema: {
        summary: "Readiness probe",
        description:
          "Readiness check for load balancer integration. Checks if the service is ready to accept traffic.",
        tags: HEALTH_TAGS,
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const checks: HealthCheck[] = await Promise.all([
        performCheck("liveness", livenessCheck),
        performCheck("readiness", readinessCheck),
      ]);

      const status = calculateAggregateStatus(checks);
      const response: HealthResponse = {
        status,
        service: binaryName,
        version,
        timestamp: getRFC3339Timestamp(),
        checks,
        uptime_seconds: getUptimeSeconds(),
      };

      const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;
      return reply.code(httpStatus).send(response);
    },
  );

  /**
   * GET /health/startup - Startup probe
   */
  server.get(
    "/health/startup",
    {
      schema: {
        summary: "Startup probe",
        description:
          "Startup check for slow-starting containers. Returns healthy once initialization is complete.",
        tags: HEALTH_TAGS,
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const check = await performCheck("startup", startupCheck);
      const status = check.status;

      const response: HealthResponse = {
        status,
        service: binaryName,
        version,
        timestamp: getRFC3339Timestamp(),
        checks: [check],
        uptime_seconds: getUptimeSeconds(),
      };

      const httpStatus = status === "healthy" ? 200 : 503;
      return reply.code(httpStatus).send(response);
    },
  );
}
