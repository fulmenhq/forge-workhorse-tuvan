import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { createSignalManager, onShutdown } from "@fulmenhq/tsfulmen/foundry";
import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { createControlPlaneServer } from "../control-plane.js";

// Mock observability/metrics to avoid prom-client runtime issues in test env
vi.mock("../../observability/metrics.js", () => {
  return {
    getPrometheusExporter: () => ({
      getMetrics: async () => "# HELP http_requests_total\nhttp_requests_total 1\n",
    }),
    initializeMetrics: () => async (_fastify: unknown) => {},
  };
});

describe("Control Plane", () => {
  it("POST {basePath}/signal requires bearer token when configured", async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();

    const manager = createSignalManager({
      doubleTapWindowMs: 2000,
      doubleTapExitCode: 130,
    });

    let shutdownCalled = false;
    await onShutdown(manager, async () => {
      shutdownCalled = true;
    });

    const controlPlane = {
      ...config.controlPlane,
      basePath: "/ops",
      auth: {
        ...config.controlPlane.auth,
        mode: "bearerToken" as const,
        bearerToken: "test-control-token-123456",
      },
    };

    const server = await createControlPlaneServer({
      identity,
      controlPlane,
      signalManager: manager,
    });

    const unauthorized = await server.inject({
      method: "POST",
      url: "/ops/signal",
      payload: {
        signal: "SIGTERM",
        reason: "test",
      },
    });

    expect([401, 403]).toContain(unauthorized.statusCode);
    expect(shutdownCalled).toBe(false);

    const authorized = await server.inject({
      method: "POST",
      url: "/ops/signal",
      headers: {
        authorization: "Bearer test-control-token-123456",
      },
      payload: {
        signal: "SIGTERM",
        reason: "test",
      },
    });

    expect(authorized.statusCode).toBe(202);
    expect(shutdownCalled).toBe(true);

    await server.close();
  }, 20000);

  it("POST {basePath}/config/reload requires auth and returns 200", async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();

    const manager = createSignalManager({
      doubleTapWindowMs: 2000,
      doubleTapExitCode: 130,
    });

    const controlPlane = {
      ...config.controlPlane,
      basePath: "/ops",
      auth: {
        ...config.controlPlane.auth,
        mode: "bearerToken" as const,
        bearerToken: "test-control-token-123456",
      },
    };

    const server = await createControlPlaneServer({
      identity,
      controlPlane,
      signalManager: manager,
    });

    const unauth = await server.inject({
      method: "POST",
      url: "/ops/config/reload",
    });

    expect(unauth.statusCode).toBe(401);

    const authed = await server.inject({
      method: "POST",
      url: "/ops/config/reload",
      headers: {
        authorization: "Bearer test-control-token-123456",
      },
    });

    expect(authed.statusCode).toBe(200);
    const body = authed.json() as { status: string };
    expect(body.status).toBe("reloaded");

    await server.close();
  }, 20000);
});
