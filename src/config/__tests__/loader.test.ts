import { describe, expect, it } from "vitest";
import { applyCliOverrides, getCurrentConfig, loadConfig, reloadConfig } from "../loader.js";
import { ConfigInvalidError } from "../types.js";

describe("Config Loader", () => {
  describe("loadConfig", () => {
    it("should load default config from YAML", async () => {
      const config = await loadConfig();

      // Check server defaults
      expect(config.server.host).toBe("localhost");
      expect(config.server.port).toBe(8080);

      // Check logging defaults
      expect(config.logging.profile).toBe("structured");
      expect(config.logging.level).toBe("info");

      // Check metrics defaults
      expect(config.metrics.enabled).toBe(true);
      expect(config.metrics.port).toBe(0);

      // Check telemetry defaults
      expect(config.telemetry.namespace).toBe("tuvan");
    });
  });

  describe("applyCliOverrides", () => {
    it("should apply CLI port override", async () => {
      const baseConfig = await loadConfig();
      const config = applyCliOverrides(baseConfig, { port: "9000" });

      expect(config.server.port).toBe(9000);
    });

    it("should apply CLI host override", async () => {
      const baseConfig = await loadConfig();
      const config = applyCliOverrides(baseConfig, { host: "127.0.0.1" });

      expect(config.server.host).toBe("127.0.0.1");
    });

    it("should apply both host and port overrides", async () => {
      const baseConfig = await loadConfig();
      const config = applyCliOverrides(baseConfig, {
        host: "127.0.0.1",
        port: "9000",
      });

      expect(config.server.host).toBe("127.0.0.1");
      expect(config.server.port).toBe(9000);
    });

    it("should throw ConfigInvalidError for invalid port string", async () => {
      const baseConfig = await loadConfig();

      expect(() => {
        applyCliOverrides(baseConfig, { port: "invalid" });
      }).toThrow(ConfigInvalidError);
    });

    it("should throw ConfigInvalidError for NaN port", async () => {
      const baseConfig = await loadConfig();

      expect(() => {
        applyCliOverrides(baseConfig, { port: "NaN" });
      }).toThrow(ConfigInvalidError);
    });

    it("should throw ConfigInvalidError for port too low", async () => {
      const baseConfig = await loadConfig();

      expect(() => {
        applyCliOverrides(baseConfig, { port: "0" });
      }).toThrow(ConfigInvalidError);
    });

    it("should throw ConfigInvalidError for port too high", async () => {
      const baseConfig = await loadConfig();

      expect(() => {
        applyCliOverrides(baseConfig, { port: "65536" });
      }).toThrow(ConfigInvalidError);
    });

    it("should ignore undefined overrides", async () => {
      const baseConfig = await loadConfig();
      const originalPort = baseConfig.server.port;
      const config = applyCliOverrides(baseConfig, {});

      expect(config.server.port).toBe(originalPort);
    });
  });

  describe("getCurrentConfig", () => {
    it("should return config with metadata after load", async () => {
      await loadConfig();
      const result = getCurrentConfig();

      expect(result).not.toBeNull();
      expect(result?.config).toBeDefined();
      expect(result?.metadata).toBeDefined();
      expect(result?.metadata.defaultsPath).toContain("tuvan-defaults.yaml");
      expect(result?.metadata.activeLayers).toContain("defaults");
      expect(result?.metadata.identity.vendor).toBe("fulmen");
      expect(result?.metadata.identity.binaryName).toBe("tuvan");
    });

    // Note: Testing "return null before load" is tricky because other tests might have run.
    // In a clean separate test file execution it works, but in a suite sharing state it might fail.
    // We'll skip it or mock the module state if needed, but for now let's focus on the positive case.
  });

  describe("reloadConfig", () => {
    it("should reload and cache config", async () => {
      await loadConfig();
      // In a real scenario we'd modify the file, but here we just want to ensure it runs
      // and updates the cache logic.
      const config1 = getCurrentConfig();

      const reloadedConfig = await reloadConfig();
      const config2 = getCurrentConfig();

      expect(reloadedConfig).toBeDefined();
      expect(config2).not.toBeNull();
      expect(config2?.config).toBeDefined();
      // Content should be the same since we didn't change the file
      expect(JSON.stringify(config2?.config)).toBe(JSON.stringify(config1?.config));
    });
  });

  describe("ConfigInvalidError", () => {
    it("should include details field", () => {
      const error = new ConfigInvalidError("Test error", {
        field: "server.port",
        expected: "1-65535",
        actual: 99999,
      });

      expect(error.name).toBe("ConfigInvalidError");
      expect(error.message).toBe("Test error");
      expect(error.details?.field).toBe("server.port");
      expect(error.details?.expected).toBe("1-65535");
      expect(error.details?.actual).toBe(99999);
    });

    it("should be instance of Error", () => {
      const error = new ConfigInvalidError("Test");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConfigInvalidError);
    });
  });
});
