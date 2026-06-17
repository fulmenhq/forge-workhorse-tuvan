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

import { execFileSync } from "node:child_process";
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

/**
 * Build-time identity values injected into each compiled binary.
 *
 * Compiled single-file binaries carry no on-disk VERSION file or
 * .fulmen/app.yaml, so the runtime's filesystem discovery returns null inside
 * them (it would report version "0.0.0-unknown" and fail identity load). We
 * inject these via `bun build --define` so the embedded-identity module resolves
 * them at runtime. See src/core/embedded-identity.ts.
 */
interface BuildInfo {
  version: string;
  appYaml: string;
  gitCommit: string;
  buildDate: string;
  tsfulmenVersion: string;
  configDefaults: string;
  configSchema: string;
}

const CONFIG_DEFAULTS_PATH = "config/tuvan/v1.0.0/tuvan-defaults.yaml";
const CONFIG_SCHEMA_PATH = "schemas/tuvan/v1.0.0/config.schema.json";

function resolveTsfulmenVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync("node_modules/@fulmenhq/tsfulmen/package.json", "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function gitOrUnknown(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function gatherBuildInfo(): BuildInfo {
  return {
    version: readFileSync("VERSION", "utf-8").trim(),
    appYaml: readFileSync(".fulmen/app.yaml", "utf-8"),
    gitCommit: gitOrUnknown(["rev-parse", "--short=8", "HEAD"]),
    buildDate: new Date().toISOString(),
    tsfulmenVersion: resolveTsfulmenVersion(),
    configDefaults: readFileSync(CONFIG_DEFAULTS_PATH, "utf-8"),
    configSchema: readFileSync(CONFIG_SCHEMA_PATH, "utf-8"),
  };
}

/**
 * Map the current host platform/arch to a build target suffix, or null if the
 * host isn't one of our targets. Only the host-matching binary can be executed
 * for the smoke test — cross-compiled targets can't run on this machine.
 */
function hostTargetSuffix(): string | null {
  const key = `${process.platform}/${process.arch}`;
  const map: Record<string, string> = {
    "linux/x64": "linux-amd64",
    "linux/arm64": "linux-arm64",
    "darwin/x64": "darwin-amd64",
    "darwin/arm64": "darwin-arm64",
    "win32/x64": "windows-amd64",
  };
  return map[key] ?? null;
}

/**
 * Smoke-test the host-platform binary: it must run the consumer's own `version`
 * subcommand and report the expected version. This catches two classes of
 * silently-broken release binary that unit tests and `node dist` runs miss:
 *   - a startup crash (e.g. an un-embedded WASM/asset), and
 *   - a shadowed/empty CLI or unresolved version ("0.0.0-unknown").
 * Run from a temp dir so it can't accidentally pick up the repo's on-disk
 * VERSION/app.yaml and mask a broken embed.
 */
function smokeTest(binaryName: string, info: BuildInfo): boolean {
  const suffix = hostTargetSuffix();
  if (!suffix) {
    console.log(`Smoke test: skipped (host ${process.platform}/${process.arch} is not a target)`);
    return true;
  }
  const ext = process.platform === "win32" ? ".exe" : "";
  const binary = join(process.cwd(), OUT_DIR, `${binaryName}-${suffix}${ext}`);
  if (!existsSync(binary)) {
    console.error(`Smoke test FAILED: host binary not built (${binary})`);
    return false;
  }

  // 1) `version` — identity/version resolution and that the binary starts and
  //    runs its own CLI.
  process.stdout.write(`Smoke test: ${binaryName}-${suffix} version ... `);
  try {
    // Run outside the repo tree so on-disk VERSION/app.yaml can't mask a bad embed.
    const out = execFileSync(binary, ["version"], { encoding: "utf-8", cwd: "/" }).trim();
    if (out !== info.version) {
      console.log("FAILED");
      console.error(`    expected version "${info.version}", got "${out}"`);
      return false;
    }
    console.log(`ok (${out})`);
  } catch (err: unknown) {
    console.log("FAILED");
    console.error(`    ${smokeErr(err)}`);
    return false;
  }

  // 2) `doctor --json` — a config-backed command: exercises the embedded config
  //    defaults + schema and the diagnostic checks. Must exit 0 (no error-status
  //    checks) and emit parseable JSON when run outside the repo.
  process.stdout.write(`Smoke test: ${binaryName}-${suffix} doctor --json ... `);
  try {
    const out = execFileSync(binary, ["doctor", "--json"], { encoding: "utf-8", cwd: "/" });
    const parsed = JSON.parse(out);
    const errors = (parsed.results ?? []).filter((r: { status?: string }) => r.status === "error");
    if (errors.length > 0) {
      console.log("FAILED");
      console.error(
        `    doctor reported error checks: ${errors.map((e: { name?: string }) => e.name).join(", ")}`,
      );
      return false;
    }
    console.log("ok");
  } catch (err: unknown) {
    console.log("FAILED");
    console.error(`    ${smokeErr(err)}`);
    return false;
  }

  // 3) `serve` — the HTTP server isn't supported in the single-file binary yet
  //    (tsfulmen foundry catalogs are filesystem-backed). It must fail *cleanly*
  //    with the guidance message, not crash with a FoundryCatalogError.
  process.stdout.write(`Smoke test: ${binaryName}-${suffix} serve (graceful refusal) ... `);
  try {
    execFileSync(binary, ["serve", "--port", "18080"], { encoding: "utf-8", cwd: "/" });
    // serve must NOT start successfully in a compiled binary.
    console.log("FAILED");
    console.error("    serve unexpectedly started in the standalone binary");
    return false;
  } catch (err: unknown) {
    const msg = smokeErr(err);
    if (msg.includes("FoundryCatalogError") || !msg.includes("does not support the HTTP server")) {
      console.log("FAILED");
      console.error(`    serve did not refuse cleanly: ${msg.split("\n")[0]}`);
      return false;
    }
    console.log("ok (clean refusal)");
    return true;
  }
}

function smokeErr(err: unknown): string {
  return err instanceof Error
    ? (err as { stderr?: Buffer }).stderr?.toString().trim() || err.message
    : String(err);
}

function main(): void {
  const binaryName = getBinaryName();
  const info = gatherBuildInfo();

  console.log(`Building ${TARGETS.length} binaries for '${binaryName}' v${info.version}`);
  console.log(`  Entry point: ${ENTRY_POINT}`);
  console.log(`  Output dir:  ${OUT_DIR}`);
  console.log(`  Git commit:  ${info.gitCommit}`);
  console.log();

  if (!existsSync(ENTRY_POINT)) {
    console.error(`Error: entry point ${ENTRY_POINT} not found`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // Build-time identity injected into every binary (see embedded-identity.ts).
  // JSON.stringify yields a valid JS string literal that `bun --define` parses
  // as the value; passed as discrete argv tokens, so no shell quoting is needed.
  const defineArgs = [
    "--define",
    `__EMBEDDED_VERSION__=${JSON.stringify(info.version)}`,
    "--define",
    `__EMBEDDED_GIT_COMMIT__=${JSON.stringify(info.gitCommit)}`,
    "--define",
    `__EMBEDDED_BUILD_DATE__=${JSON.stringify(info.buildDate)}`,
    "--define",
    `__EMBEDDED_APP_YAML__=${JSON.stringify(info.appYaml)}`,
    "--define",
    `__EMBEDDED_TSFULMEN_VERSION__=${JSON.stringify(info.tsfulmenVersion)}`,
    "--define",
    `__EMBEDDED_CONFIG_DEFAULTS__=${JSON.stringify(info.configDefaults)}`,
    "--define",
    `__EMBEDDED_CONFIG_SCHEMA__=${JSON.stringify(info.configSchema)}`,
  ];

  let succeeded = 0;
  let failed = 0;

  for (const target of TARGETS) {
    const ext = target.os === "windows" ? ".exe" : "";
    const binaryFile = `${binaryName}-${target.suffix}${ext}`;
    const outfile = join(OUT_DIR, binaryFile);

    process.stdout.write(`  ${target.os}/${target.arch} -> ${binaryFile} ... `);

    try {
      execFileSync(
        "bun",
        [
          "build",
          ENTRY_POINT,
          "--compile",
          `--target=${target.bunTarget}`,
          "--outfile",
          outfile,
          ...defineArgs,
        ],
        { stdio: "pipe" },
      );
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

  // Gate: the host-platform binary must actually run and report its version.
  console.log();
  if (!smokeTest(binaryName, info)) {
    console.error("Release binaries failed the smoke test — see above.");
    process.exit(1);
  }
}

main();
