import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const repoRoot = process.cwd();
  const srcAppYaml = join(repoRoot, ".fulmen", "app.yaml");
  const srcVersion = join(repoRoot, "VERSION");

  const distDir = join(repoRoot, "dist");
  const distFulmenDir = join(distDir, ".fulmen");
  const distAppYaml = join(distFulmenDir, "app.yaml");
  const distVersion = join(distDir, "VERSION");

  const appYaml = readFileSync(srcAppYaml, "utf-8");
  const version = readFileSync(srcVersion, "utf-8").trim();

  mkdirSync(distFulmenDir, { recursive: true });

  writeFileSync(distAppYaml, appYaml, "utf-8");
  writeFileSync(distVersion, `${version}\n`, "utf-8");

  process.stdout.write(
    `synced embedded identity -> ${distAppYaml}\n` + `synced VERSION -> ${distVersion}\n`,
  );
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: failed to sync embedded identity: ${message}\n`);
  process.exit(1);
}
