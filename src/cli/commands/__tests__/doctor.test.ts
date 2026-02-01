import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { describe, expect, test } from "vitest";
import { createDoctorCommand } from "../doctor.js";

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

describe("doctor command", () => {
  test("should have --json option", () => {
    const command = createDoctorCommand(mockIdentity);
    const opt = command.options.find((o) => o.flags.includes("--json"));
    expect(opt).toBeDefined();
  });
});
