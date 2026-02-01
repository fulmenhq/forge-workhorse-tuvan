import { loadIdentity } from "@fulmenhq/tsfulmen/appidentity";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../config/loader.js";
import { getVersion } from "../../core/version.js";
import { createServer } from "../app.js";

describe("Version Endpoint", () => {
  let app: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const config = await loadConfig();
    const identity = await loadIdentity();
    app = await createServer(identity, { ...config.server, dataPlaneAuth: config.dataPlaneAuth });
  }, 20000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it("GET /version should return 200 OK and version info", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/version",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Identity checks (REQUIRED)
    expect(body.identity).toBeDefined();
    expect(body.identity.binary_name).toBe("tuvan");
    expect(body.identity.vendor).toBe("fulmen");

    // Version check (REQUIRED)
    expect(body.version).toBe(getVersion());

    // Runtime checks (REQUIRED)
    expect(body.runtime).toBeDefined();
    expect(body.runtime.name).toMatch(/^(node|bun)$/);
    expect(body.runtime.version).toBeDefined();
    expect(body.runtime.platform).toBeDefined();
    expect(body.runtime.arch).toBeDefined();

    // Dependencies checks (REQUIRED by Workhorse Standard)
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.tsfulmen).toBeDefined();
    expect(body.dependencies.crucible).toBeDefined(); // REQUIRED by Workhorse Standard

    // git_commit and build_date are OPTIONAL (only set at build time)
    // In dev mode these may be undefined, which is acceptable
    if (body.git_commit !== undefined) {
      expect(typeof body.git_commit).toBe("string");
    }
    if (body.build_date !== undefined) {
      expect(typeof body.build_date).toBe("string");
    }
  });
});
