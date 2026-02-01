/**
 * TypeBox Schema Exports
 *
 * All API schemas are defined using TypeBox, which provides:
 * - TypeScript type inference (Static<typeof Schema>)
 * - JSON Schema output (for OpenAPI generation)
 * - Runtime validation (via Fastify's AJV integration)
 *
 * Usage:
 * ```typescript
 * import { HealthResponseSchema, type HealthResponse } from "./schemas/index.js";
 *
 * // Use schema in route for validation + OpenAPI docs
 * server.get("/health", {
 *   schema: {
 *     response: { 200: HealthResponseSchema }
 *   }
 * }, handler);
 * ```
 */

export type { ErrorResponse, ServiceInfo } from "./common.js";
// Common schemas
export { ErrorResponseSchema, ServiceInfoSchema, TimestampSchema } from "./common.js";
export type { HealthCheck, HealthResponse, HealthStatus } from "./health.js";
// Health schemas
export {
  HealthCheckSchema,
  HealthResponseSchema,
  HealthStatusSchema,
} from "./health.js";
export type { AppIdentity, DependencyVersions, RuntimeInfo, VersionResponse } from "./version.js";
// Version schemas
export {
  AppIdentitySchema,
  DependencyVersionsSchema,
  RuntimeInfoSchema,
  VersionResponseSchema,
} from "./version.js";
