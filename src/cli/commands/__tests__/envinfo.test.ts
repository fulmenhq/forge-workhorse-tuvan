import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { describe, expect, test } from "vitest";
import { createEnvinfoCommand } from "../envinfo.js";

const mockIdentity: Identity = {
  app: {
    vendor: "fulmen",
    binary_name: "tuvan",
    env_prefix: "TUVAN_",
    config_name: "tuvan",
    description: "Test workhorse",
  },
  metadata: {
    repository_category: "workhorse",
  },
};

describe("envinfo command", () => {
  test("should have --json option", () => {
    const command = createEnvinfoCommand(mockIdentity);
    const opt = command.options.find((o) => o.flags.includes("--json"));
    expect(opt).toBeDefined();
  });
});
