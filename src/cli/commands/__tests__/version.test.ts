/**
 * Version Command Tests
 *
 * Tests for the version command functionality.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { describe, expect, test } from "vitest";

import { createVersionCommand } from "../version.js";

/**
 * Mock app identity for testing
 */
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

describe("version command", () => {
  test("should create command with correct name", () => {
    const command = createVersionCommand(mockIdentity);
    expect(command.name()).toBe("version");
  });

  test("should have description", () => {
    const command = createVersionCommand(mockIdentity);
    expect(command.description()).toBeTruthy();
    expect(command.description()).toContain("version");
  });

  test("should have extended option", () => {
    const command = createVersionCommand(mockIdentity);
    const options = command.options;

    const extendedOption = options.find((opt) => opt.flags.includes("--extended"));
    expect(extendedOption).toBeDefined();
    expect(extendedOption?.short).toBe("-e");
  });
});
