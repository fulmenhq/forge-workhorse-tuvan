import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const repoRoot = process.cwd();
  const srcAppYaml = join(repoRoot, ".fulmen", "app.yaml");
  const srcVersion = join(repoRoot, "VERSION");

  const distAppYaml = join(repoRoot, "dist", ".fulmen", "app.yaml");
  const distVersion = join(repoRoot, "dist", "VERSION");

  const srcApp = readFileSync(srcAppYaml, "utf-8");
  const distApp = readFileSync(distAppYaml, "utf-8");
  if (srcApp !== distApp) {
    throw new Error(
      "dist/.fulmen/app.yaml does not match .fulmen/app.yaml (run make sync-embedded-identity)",
    );
  }

  const srcVer = readFileSync(srcVersion, "utf-8").trim();
  const distVer = readFileSync(distVersion, "utf-8").trim();
  if (srcVer !== distVer) {
    throw new Error("dist/VERSION does not match VERSION (run make sync-embedded-identity)");
  }

  process.stdout.write("OK: embedded identity + VERSION verified\n");
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}
