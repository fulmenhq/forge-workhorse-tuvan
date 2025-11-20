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
    app = await createServer(identity, config.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /version should return 200 OK and version info", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/version",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Identity checks
    expect(body.identity).toBeDefined();
    expect(body.identity.binary_name).toBe("tuvan");
    expect(body.identity.vendor).toBe("fulmen");

    // Version check
    expect(body.version).toBe(getVersion());

    // Structure checks
    expect(body.git_commit).toBeDefined();
    expect(body.build_date).toBeDefined();
    expect(body.runtime).toBeDefined();
  });
});
