import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { createServer } from "../app.js";

describe("Server Integration", () => {
  let app: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();
    app = await createServer(identity, { ...config.server, dataPlaneAuth: config.dataPlaneAuth });
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it("GET / should return service discovery info", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.service).toBe("tuvan");
    expect(body.endpoints).toBeDefined();
    expect(body.endpoints.health).toBe("/health");
    expect(body.endpoints.version).toBe("/version");
  });

  it("GET /unknown should return 404 with JSON error", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/unknown-endpoint-12345",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);

    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("not found");
  });

  it("Headers should include security headers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toBeDefined();
  });

  it("Headers should include request correlation ID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.headers["x-request-id"]).toBeDefined();
    expect(response.headers["x-response-time"]).toBeDefined();
  });
});
