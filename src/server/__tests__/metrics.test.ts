import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { createServer } from "../app.js";

// Mock observability/metrics to avoid tsfulmen/prom-client runtime issues in test env
vi.mock("../../observability/metrics.js", () => {
  return {
    getPrometheusExporter: () => ({
      getMetrics: async () => "# HELP http_requests_total\nhttp_requests_total 1\n",
    }),
    initializeMetrics: () => async (_fastify: unknown) => {}, // no-op plugin
  };
});

describe("Metrics Endpoint", () => {
  let app: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();
    app = await createServer(identity, { ...config.server, dataPlaneAuth: config.dataPlaneAuth });
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it("GET /metrics should return 200 OK and Prometheus text", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");

    // Check for mock metrics
    expect(response.body).toContain("http_requests_total");
  });
});
