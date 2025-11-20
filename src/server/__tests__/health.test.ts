import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { createServer } from "../app.js";

describe("Health Endpoints", () => {
  let app: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();
    app = await createServer(identity, config.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health should return 200 OK and healthy status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
    // identity.app.binary_name is "tuvan" from app.yaml
    expect(body.service).toBe("tuvan");
    expect(body.version).toBeDefined();
    expect(Array.isArray(body.checks)).toBe(true);
  });

  it("GET /health/live should return 200 OK", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
  });

  it("GET /health/ready should return 200 OK", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
  });

  it("GET /health/startup should return 200 OK", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/startup",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
  });
});
