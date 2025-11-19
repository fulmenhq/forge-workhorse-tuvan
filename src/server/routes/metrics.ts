/**
 * Metrics Endpoint
 *
 * Exposes Prometheus-compatible metrics via tsfulmen/telemetry including:
 * - HTTP request counters (by method, route, status, service)
 * - HTTP request duration histograms (latency distribution)
 * - HTTP request/response size histograms
 * - HTTP active requests gauge
 * - Node.js runtime metrics (memory, event loop, GC, etc.)
 *
 * As of tsfulmen v0.1.11, HTTP metrics are automatically collected via
 * the Fastify plugin registered in app.ts. This endpoint simply exports
 * the metrics in Prometheus text format.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPrometheusExporter } from "../../observability/metrics.js";

/**
 * Register metrics route
 *
 * Exposes the /metrics endpoint for Prometheus scraping.
 * All HTTP metrics are automatically collected by the Fastify plugin.
 *
 * @param server - Fastify server instance
 * @param identity - App identity (not used, but kept for consistency)
 */
export async function registerMetricsRoute(
  server: FastifyInstance,
  _identity: Identity,
): Promise<void> {
  /**
   * GET /metrics - Prometheus metrics endpoint
   *
   * Returns metrics in Prometheus text format including:
   * - http_requests_total (counter)
   * - http_request_duration_seconds (histogram)
   * - http_request_size_bytes (histogram)
   * - http_response_size_bytes (histogram)
   * - http_active_requests (gauge)
   * - Node.js runtime metrics (heap, RSS, GC, event loop)
   *
   * @returns Prometheus text format metrics
   */
  server.get("/metrics", async (_request: FastifyRequest, reply: FastifyReply) => {
    const exporter = getPrometheusExporter();
    const metricsText = await exporter.getMetrics();

    return reply
      .code(200)
      .header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
      .send(metricsText);
  });
}
