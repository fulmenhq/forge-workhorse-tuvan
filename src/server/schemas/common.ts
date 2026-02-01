/**
 * Common TypeBox Schemas
 *
 * Shared schema definitions used across multiple endpoints.
 * These provide both runtime validation and OpenAPI documentation.
 *
 * @see https://github.com/sinclairzx81/typebox
 */

import { type Static, Type } from "@sinclair/typebox";

/**
 * RFC3339 Timestamp schema
 */
export const TimestampSchema = Type.String({
  format: "date-time",
  description: "RFC3339 timestamp",
  examples: ["2026-01-28T12:00:00.000Z"],
});

/**
 * Standard error response schema
 */
export const ErrorResponseSchema = Type.Object(
  {
    error: Type.Object({
      code: Type.String({
        description: "Machine-readable error code",
        examples: ["NOT_FOUND", "INTERNAL_SERVER_ERROR"],
      }),
      message: Type.String({
        description: "Human-readable error message",
        examples: ["Route GET /unknown not found"],
      }),
      stack: Type.Optional(
        Type.String({
          description: "Stack trace (development only)",
        }),
      ),
    }),
  },
  {
    $id: "ErrorResponse",
    title: "ErrorResponse",
    description: "Standard error response envelope",
  },
);

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

/**
 * Service info for root endpoint
 */
export const ServiceInfoSchema = Type.Object(
  {
    service: Type.String({
      description: "Service name",
      examples: ["tuvan"],
    }),
    description: Type.String({
      description: "Service description",
    }),
    version: Type.String({
      description: "Service version (semver)",
      examples: ["0.1.1"],
    }),
    endpoints: Type.Object({
      health: Type.String({ examples: ["/health"] }),
      version: Type.String({ examples: ["/version"] }),
      metrics: Type.String({ examples: ["/metrics"] }),
    }),
  },
  {
    $id: "ServiceInfo",
    title: "ServiceInfo",
    description: "Root service information",
  },
);

export type ServiceInfo = Static<typeof ServiceInfoSchema>;
