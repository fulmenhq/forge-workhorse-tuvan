/**
 * Health Command Tests
 *
 * Tests for the health command functionality.
 */

import type { Identity } from "@fulmenhq/tsfulmen/appidentity";
import { describe, expect, test } from "vitest";

import { createHealthCommand } from "../health.js";

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

describe("health command", () => {
  test("should create command with correct name", () => {
    const command = createHealthCommand(mockIdentity);
    expect(command.name()).toBe("health");
  });

  test("should have description", () => {
    const command = createHealthCommand(mockIdentity);
    expect(command.description()).toBeTruthy();
    expect(command.description()).toContain("health");
  });

  test("should not have any required options", () => {
    const command = createHealthCommand(mockIdentity);
    const requiredOptions = command.options.filter((opt) => opt.required);
    expect(requiredOptions.length).toBe(0);
  });
});
