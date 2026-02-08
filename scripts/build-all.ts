#!/usr/bin/env bun

/**
 * Cross-platform binary builder using `bun build --compile`.
 *
 * Reads binary name from .fulmen/app.yaml and builds standalone binaries
 * for all supported platforms. Each binary embeds the Bun runtime (~50-90 MB).
 *
 * CDRL: This script automatically uses your refitted binary_name from app.yaml.
 *
 * Non-bun users: Compiled binaries require Bun to build. Alternative approaches:
 *   - `bun build --target node` for lighter JS bundles (see brooklyn-mcp pattern)
 *   - Standard `tsc` + `node dist/index.js` for traditional Node.js deployment
 *
 * Usage:
 *   bun scripts/build-all.ts
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

interface BuildTarget {
  os: string;
  arch: string;
  bunTarget: string;
  suffix: string;
}

const TARGETS: BuildTarget[] = [
  {
    os: "linux",
    arch: "amd64",
    bunTarget: "bun-linux-x64",
    suffix: "linux-amd64",
  },
  {
    os: "linux",
    arch: "arm64",
    bunTarget: "bun-linux-arm64",
    suffix: "linux-arm64",
  },
  {
    os: "darwin",
    arch: "amd64",
    bunTarget: "bun-darwin-x64",
    suffix: "darwin-amd64",
  },
  {
    os: "darwin",
    arch: "arm64",
    bunTarget: "bun-darwin-arm64",
    suffix: "darwin-arm64",
  },
  {
    os: "windows",
    arch: "amd64",
    bunTarget: "bun-windows-x64",
    suffix: "windows-amd64",
  },
];

const ENTRY_POINT = "src/index.ts";
const OUT_DIR = "dist/release";

function getBinaryName(): string {
  try {
    const content = readFileSync(".fulmen/app.yaml", "utf-8");
    // Match binary_name on non-comment lines only
    for (const line of content.split("\n")) {
      if (line.trim().startsWith("#")) continue;
      const match = line.match(/binary_name:\s*(\S+)/);
      if (match) return match[1];
    }
    return "tuvan";
  } catch {
    console.warn("Warning: Could not read .fulmen/app.yaml, defaulting to 'tuvan'");
    return "tuvan";
  }
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function main(): void {
  const binaryName = getBinaryName();

  console.log(`Building ${TARGETS.length} binaries for '${binaryName}'`);
  console.log(`  Entry point: ${ENTRY_POINT}`);
  console.log(`  Output dir:  ${OUT_DIR}`);
  console.log();

  if (!existsSync(ENTRY_POINT)) {
    console.error(`Error: entry point ${ENTRY_POINT} not found`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let succeeded = 0;
  let failed = 0;

  for (const target of TARGETS) {
    const ext = target.os === "windows" ? ".exe" : "";
    const binaryFile = `${binaryName}-${target.suffix}${ext}`;
    const outfile = join(OUT_DIR, binaryFile);
    const cmd = `bun build ${ENTRY_POINT} --compile --target=${target.bunTarget} --outfile ${outfile}`;

    process.stdout.write(`  ${target.os}/${target.arch} -> ${binaryFile} ... `);

    try {
      execSync(cmd, { stdio: "pipe" });
      const size = formatSize(statSync(outfile).size);
      console.log(`ok (${size})`);
      succeeded++;
    } catch (err: unknown) {
      console.log("FAILED");
      const msg =
        err instanceof Error
          ? (err as { stderr?: Buffer }).stderr?.toString().trim() || err.message
          : String(err);
      console.error(`    ${msg}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done: ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
