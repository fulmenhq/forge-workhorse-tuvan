import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { createServer } from "../app.js";

// Mock observability/metrics to avoid prom-client runtime issues in test env
vi.mock("../../observability/metrics.js", () => {
  return {
    getPrometheusExporter: () => ({
      getMetrics: async () => "# HELP http_requests_total\nhttp_requests_total 1\n",
    }),
    initializeMetrics: () => async (_fastify: unknown) => {},
  };
});

function basicHeader(user: string, pass: string): string {
  const b64 = Buffer.from(`${user}:${pass}`, "utf-8").toString("base64");
  return `Basic ${b64}`;
}

describe("Data Plane Auth", () => {
  it("enforces protected endpoints and allows public endpoints", async () => {
    const base = await loadConfig();
    const identity = await loadIdentity();

    const server = await createServer(identity, {
      ...base.server,
      dataPlaneAuth: {
        enabled: true,
        auth: {
          mode: "basicAuth",
          basicUser: "admin",
          basicPassword: "change-me",
          allowUnauthenticatedLoopback: false,
          rateLimitPerMinute: 0,
        },
        policy: {
          denyPrefixes: ["/openapi.json"],
          publicPrefixes: ["/health", "/version", "/"],
          conditionalPrefixes: [],
          protectedPrefixes: ["/metrics"],
        },
      },
    });

    const health = await server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const metricsNoAuth = await server.inject({ method: "GET", url: "/metrics" });
    expect(metricsNoAuth.statusCode).toBe(401);

    const metricsAuth = await server.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        authorization: basicHeader("admin", "change-me"),
      },
    });
    expect(metricsAuth.statusCode).toBe(200);

    const denied = await server.inject({ method: "GET", url: "/openapi.json" });
    expect(denied.statusCode).toBe(404);

    await server.close();
  }, 20000);
});
