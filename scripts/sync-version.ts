#!/usr/bin/env bun
/**
 * Version Sync Script
 *
 * Synchronizes the VERSION file (SSOT) to package.json and any other version metadata.
 * This ensures VERSION is the single source of truth for the project version.
 *
 * Usage:
 *   bun run scripts/sync-version.ts
 *   make version-propagate
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const VERSION_FILE = resolve(ROOT_DIR, "VERSION");
const PACKAGE_JSON = resolve(ROOT_DIR, "package.json");

function main() {
  try {
    // Read VERSION file (SSOT)
    const version = readFileSync(VERSION_FILE, "utf-8").trim();

    if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
      console.error(`❌ Invalid version in VERSION file: ${version}`);
      process.exit(1);
    }

    console.log(`→ Syncing version ${version} to package.json...`);

    // Update package.json
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
    packageJson.version = version;
    writeFileSync(PACKAGE_JSON, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");

    console.log(`✅ Version ${version} synchronized to package.json`);
  } catch (error) {
    console.error("❌ Version sync failed:", error);
    process.exit(1);
  }
}

main();
