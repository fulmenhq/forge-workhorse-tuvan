/**
 * Health Check TypeBox Schemas
 *
 * Schema definitions for health check endpoints following the
 * Fulmen Forge Workhorse Standard.
 */

import { type Static, Type } from "@sinclair/typebox";

/**
 * Health status enum values
 */
export const HealthStatusSchema = Type.Union(
  [Type.Literal("healthy"), Type.Literal("degraded"), Type.Literal("unhealthy")],
  {
    title: "HealthStatus",
    description: "Health status indicator",
  },
);

export type HealthStatus = Static<typeof HealthStatusSchema>;

/**
 * Individual health check result
 */
export const HealthCheckSchema = Type.Object(
  {
    name: Type.String({
      description: "Name of the health check",
      examples: ["liveness", "readiness", "startup"],
    }),
    status: HealthStatusSchema,
    message: Type.Optional(
      Type.String({
        description: "Optional status message or error details",
      }),
    ),
    timestamp: Type.String({
      format: "date-time",
      description: "Timestamp of the check (RFC3339)",
    }),
    duration_ms: Type.Optional(
      Type.Number({
        description: "Check duration in milliseconds",
        examples: [1, 5, 100],
      }),
    ),
  },
  {
    title: "HealthCheck",
    description: "Individual health check result",
  },
);

export type HealthCheck = Static<typeof HealthCheckSchema>;

/**
 * Health response envelope
 */
export const HealthResponseSchema = Type.Object(
  {
    status: HealthStatusSchema,
    service: Type.String({
      description: "Service name",
      examples: ["tuvan"],
    }),
    version: Type.String({
      description: "Service version",
      examples: ["0.1.1"],
    }),
    timestamp: Type.String({
      format: "date-time",
      description: "Current timestamp (RFC3339)",
    }),
    checks: Type.Array(HealthCheckSchema, {
      description: "Individual health check results",
    }),
    uptime_seconds: Type.Number({
      description: "Service uptime in seconds",
      examples: [3600, 86400],
    }),
  },
  {
    $id: "HealthResponse",
    title: "HealthResponse",
    description: "Health check response envelope",
  },
);

export type HealthResponse = Static<typeof HealthResponseSchema>;
