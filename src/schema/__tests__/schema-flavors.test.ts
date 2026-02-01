import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchema, validateData } from "@fulmenhq/tsfulmen/schema";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadSchemaFixture(name: string): Promise<unknown> {
  const p = join(__dirname, "fixtures", name);
  return JSON.parse(readFileSync(p, "utf-8")) as unknown;
}

describe("Schema Flavors", () => {
  it("compiles and validates draft-04/06/07/2019-09/2020-12 fixtures", async () => {
    const fixtures = [
      "draft-04-sample.schema.json",
      "draft-06-sample.schema.json",
      "draft-07-sample.schema.json",
      "draft-2019-09-sample.schema.json",
      "draft-2020-12-sample.schema.json",
    ];

    for (const file of fixtures) {
      const schema = await loadSchemaFixture(file);
      const validator = await compileSchema(schema as Record<string, unknown>);

      const ok = validateData({ id: "550e8400-e29b-41d4-a716-446655440000" }, validator);
      expect(ok.valid, `expected valid for fixture ${file}`).toBe(true);

      const bad = validateData({ id: "not-a-uuid" }, validator);
      expect(bad.valid, `expected invalid for fixture ${file}`).toBe(false);
    }
  }, 20000);
});
