import { defineConfig } from "vitest/config";

// Work around extensionless ESM deep-imports used by tsfulmen (ajv/dist/{2019,2020}).
// Vite/Vitest v7+ uses stricter Node-style ESM resolution, so we alias to the
// explicit .js entrypoints to keep tests (and template consumers) green.
export default defineConfig({
  test: {
    // Ensure Vite processes tsfulmen so alias resolution applies.
    server: {
      deps: {
        inline: ["@fulmenhq/tsfulmen"],
      },
    },
  },
  resolve: {
    alias: {
      "ajv/dist/2019": "ajv/dist/2019.js",
      "ajv/dist/2020": "ajv/dist/2020.js",
    },
  },
});
