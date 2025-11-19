/**
 * Metrics Module - HTTP metrics via tsfulmen/telemetry
 *
 * Provides Prometheus-compatible metrics for HTTP servers using:
 * - tsfulmen/telemetry/http module (v0.1.11+)
 * - Automatic Fastify integration
 * - AppIdentity-aware service labeling
 * - Standard HTTP metrics from Crucible v0.2.18 taxonomy
 *
 * Metrics Emitted:
 * - http_requests_total (counter) - Total requests by method/route/status/service
 * - http_request_duration_seconds (histogram) - Request latency distribution
 * - http_request_size_bytes (histogram) - Request body size distribution
 * - http_response_size_bytes (histogram) - Response body size distribution
 * - http_active_requests (gauge) - Currently active requests
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { metrics } from "@fulmenhq/tsfulmen/telemetry";
import { createFastifyMetricsPlugin } from "@fulmenhq/tsfulmen/telemetry/http";
import { PrometheusExporter } from "@fulmenhq/tsfulmen/telemetry/prometheus";
import type { FastifyPluginCallback } from "fastify";

/**
 * Metrics plugin instance (lazy initialized)
 */
let metricsPlugin: FastifyPluginCallback | null = null;

/**
 * Prometheus exporter instance (lazy initialized)
 */
let prometheusExporter: PrometheusExporter | null = null;

/**
 * Initialize HTTP metrics plugin for Fastify
 *
 * Creates a Fastify plugin that automatically instruments all HTTP requests
 * with Prometheus metrics following Crucible v0.2.18 taxonomy.
 *
 * @param identity - App identity from .fulmen/app.yaml
 * @returns Fastify plugin for HTTP metrics
 *
 * @example
 * ```typescript
 * import { loadAppIdentity } from "@fulmenhq/tsfulmen/appidentity";
 * import { initializeMetrics } from "./observability/metrics";
 *
 * const identity = loadAppIdentity();
 * const plugin = initializeMetrics(identity);
 * await fastify.register(plugin);
 * ```
 */
export function initializeMetrics(identity: Identity): FastifyPluginCallback {
  const serviceName = identity.app.binary_name;

  // Create Prometheus exporter for the metrics registry
  prometheusExporter = new PrometheusExporter({
    registry: metrics,
    namespace: serviceName,
  });

  // Create Fastify metrics plugin with service name from app identity
  metricsPlugin = createFastifyMetricsPlugin({
    serviceName,
    trackBodySizes: true, // Enable request/response body size tracking
  });

  return metricsPlugin;
}

/**
 * Get the Prometheus exporter for metrics export
 *
 * Returns the exporter that converts metrics to Prometheus format.
 * Used by /metrics endpoint to export Prometheus text format.
 *
 * @returns Prometheus exporter
 * @throws {Error} If metrics not initialized
 *
 * @example
 * ```typescript
 * import { getPrometheusExporter } from "./observability/metrics";
 *
 * fastify.get("/metrics", async () => {
 *   const exporter = getPrometheusExporter();
 *   return await exporter.getMetrics();
 * });
 * ```
 */
export function getPrometheusExporter(): PrometheusExporter {
  if (!prometheusExporter) {
    throw new Error(
      "Metrics not initialized. Call initializeMetrics(identity) first.",
    );
  }
  return prometheusExporter;
}

/**
 * Check if metrics are initialized
 *
 * @returns True if metrics plugin is ready
 */
export function isMetricsInitialized(): boolean {
  return metricsPlugin !== null;
}

/**
 * Reset metrics (primarily for testing)
 *
 * @internal
 */
export function resetMetrics(): void {
  metricsPlugin = null;
  prometheusExporter = null;
  // Note: Registry reset handled by tsfulmen/telemetry
}
