---
title: "Fulmen CDRL Guide – forge-workhorse-tuvan"
description: "Step-by-step instructions for cloning, degitting, refitting, and launching the Tuvan TypeScript workhorse template"
author: "Fulmen Enterprise Architect (@fulmen-ea-steward)"
date: "2025-11-19"
last_updated: "2025-11-19"
status: "bootstrap"
tags: ["cdrl", "template", "tuvan", "typescript", "workhorse"]
---

# Clone → Degit → Refit → Launch (CDRL) Guide for Tuvan

This guide explains how to transform `forge-workhorse-tuvan` into your own production-ready TypeScript backend while preserving Fulmen ecosystem guarantees. It draws from the Fulmen Ecosystem Guide, Workhorse Standard, and Technical Manifesto so every refit maintains Layer 0–3 alignment (Crucible → tsfulmen → template → DX automation).

## 0. Philosophy & Outcomes

- **Start fast, thrive on scale**: You inherit structured logging, telemetry, graceful shutdown, and app identity so you can focus on business logic.
- **Single source of truth**: App identity in `.fulmen/app.yaml` and three-layer config keep env vars, config paths, and telemetry names consistent.
- **Production reliability**: Make targets (`make lint`, `make typecheck`, `make test`, `make check-all`) enforce the Fulmen Technical Manifesto principles before every release.
- **CRDL predictability**: Every change flows through Clone → Degit → Refit → Launch so templates remain easy to customize without forking standards.

## 1. Prerequisites & Preflight Checklist

| Requirement | Minimum          | Notes                                             |
| ----------- | ---------------- | ------------------------------------------------- |
| Git         | 2.43+            | Needed for clone/degit                            |
| Node.js     | 20.0.0+          | Matches tsfulmen runtime floor                    |
| Bun         | 1.0.0+           | Preferred package manager (npm works as fallback) |
| Make        | POSIX-compatible | Executes bootstrap/check targets                  |

Before customizing:

1. Install dependencies: `make bootstrap`
2. Validate toolchain: `make tools`
3. Run the full gate once: `make check-all`
4. Inspect `.fulmen/app.yaml`, `package.json`, `VERSION`, and `src/` to understand defaults

## 2. CDRL Workflow Overview

1. **Clone** – get the template from FulmenHQ
2. **Degit** – remove template git history so your repo starts clean
3. **Refit** – rename identity, env vars, config directories, docs, and code
4. **Launch** – run, test, and ship your customized workhorse

Each phase below provides exact commands and the rationale behind them.

## 3. Clone

```bash
git clone https://github.com/fulmenhq/forge-workhorse-tuvan.git my-app
cd my-app
```

Recommended immediately after cloning:

- `cp .env.example .env` (adjust later)
- `bun install` or `npm install` if you prefer manual bootstrap
- `git status` to verify a clean working tree before degitting

## 4. Degit

Remove Fulmen git history and initialize your own repository:

```bash
rm -rf .git
git init -b main
git add .
git commit -m "chore: seed my-app from tuvan"
```

> Keep one reference commit locally or in an internal mirror so you can diff against upstream Tuvan releases later.

## 5. Refit (Customize for Your Application)

Refit is the heart of CRDL. Work through these sub-steps in order; each builds on the app identity defined in `.fulmen/app.yaml`.

### 5.1 Update App Identity (required first)

Edit `.fulmen/app.yaml`:

```yaml
app:
  vendor: acmecorp
  binary_name: data-api
  env_prefix: DATA_API_
  config_name: data-api
  description: "AcmeCorp data platform API"
```

Why it matters:

- CLI binary (`tuvan serve`) becomes `data-api serve`
- Env vars automatically pick up `DATA_API_`
- Config directories resolve to `~/.config/acmecorp/data-api`
- Telemetry/logging namespaces adopt your name

### 5.2 Update package metadata & versioning

1. `package.json`: change `name`, `description`, `repository`, `bugs`, `homepage`, and `author`
2. `VERSION`: set your semantic or CalVer string
3. Run `make version-propagate` to sync `package.json` and any other metadata
4. Update `src/core/version.ts` (or equivalent) if it exports app version info

### 5.3 Rename environment variables

1. Copy `.env.example` to `.env`
2. Replace every `TUVAN_` prefix in `.env.example`, `.env`, docs, and scripts with your `env_prefix`
3. Mention the new prefix in `README.md` and this guide for your consumers

Control plane env vars you will typically refit:

- `<PREFIX>CONTROL_PLANE_HOST`
- `<PREFIX>CONTROL_PLANE_PORT`
- `<PREFIX>ADMIN_BASE_PATH`
- `<PREFIX>ADMIN_TOKEN` (do not commit real tokens)

Data plane auth env vars you may refit (starter only):

- `<PREFIX>AUTH_ENABLED`
- `<PREFIX>AUTH_MODE`
- `<PREFIX>AUTH_BASIC_USER`
- `<PREFIX>AUTH_BASIC_PASSWORD`

### 5.4 Refresh configuration defaults & schemas (as modules land)

Even before config/schema assets are finalized, establish the naming pattern so upgrades remain mechanical:

```bash
# When config defaults ship, mirror this flow
mv config/tuvan config/data-api
mv config/data-api/v1.0.0/tuvan-defaults.yaml config/data-api/v1.0.0/data-api-defaults.yaml

mv schemas/tuvan schemas/data-api
# Update schema IDs inside files (e.g., tuvan/v1.0.0 → data-api/v1.0.0)
```

Update loader references (examples will live in `src/config/`):

```ts
const configPaths = {
  category: "data-api",
  defaultsFile: "data-api-defaults.yaml",
  schemaId: "data-api/v1.0.0/config",
};
```

### 5.5 Adjust CLI & server naming

- Rename CLI help strings in `src/cli/commands/*.ts` to use your application name
- Update logger instantiations (`createLogger('data-api', …)`) once observability modules arrive
- Ensure `/version`, `/health`, and `/metrics` handlers surface your identity string

### 5.6 Replace placeholder business logic

- `src/core/` becomes your domain layer; remove sample logic
- Add modules gradually, keeping TypeScript strict mode satisfied (no `any`)
- Maintain tsfulmen abstractions (config, logging, telemetry) so upstream updates stay smooth

### 5.7 Update docs & metadata

- `README.md`: swap template references, describe your product, update quick start commands
- `docs/tuvan-overview.md`: either rename or replace with your own architecture brief
- `docs/development/fulmen_cdrl_guide.md`: update this file to describe your refit specifics once you finish
- `LICENSE`, `MAINTAINERS.md`: set ownership and point-of-contact info

### 5.8 Configure automation

- Enable your CI provider (GitHub Actions, etc.) with equivalent lint/test/build steps
- Keep Makefile targets intact so Fulmen tooling works if you ever upstream fixes
- Document any deviations in `.plans/` for auditability (the directory stays gitignored)

## 6. Launch

With identity, config, and docs updated:

```bash
make bootstrap
make check-all   # runs lint + typecheck + vitest
make build       # emits dist/ and bin/tuvan (rename coming soon)
./bin/<binary-name> serve --port 8080
```

Verify endpoints:

- `GET /health`, `/health/live`, `/health/ready`, `/health/startup`
- `GET /version`
- `GET /metrics`

## 7. Verification Checklist

- [ ] `.fulmen/app.yaml` uses your vendor, binary name, env prefix, config name
- [ ] Env vars and `.env` match the new prefix
- [ ] `VERSION` + `package.json` are in sync via `make version-propagate`
- [ ] CLI help, logger service name, and Fastify routes show your identity
- [ ] Config loader points to renamed directories/files (once available)
- [ ] Tests pass (`make test` / `bunx vitest run`)
- [ ] Type checking passes (`make typecheck`)
- [ ] Biome linting passes (`make lint`)
- [ ] Documentation references (README, this guide) reflect your app

## 8. Troubleshooting

| Symptom                        | Likely Cause                                             | Fix                                                                     |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Env vars still show `TUVAN_`   | Missed prefix replacement in `.env` or code              | Search for `TUVAN_` with `rg` and replace                               |
| `/version` shows `tuvan`       | `core/version.ts` or logger metadata not updated         | Update identity imports to use `.fulmen/app.yaml` values                |
| Config file not found          | Config directories not renamed or `config_name` mismatch | Align names across `.fulmen/app.yaml`, config paths, and loader options |
| Tests fail on import paths     | Package name in `package.json` not updated               | Rename package + adjust `tsconfig.json` path aliases                    |
| Vitest cannot find Bun modules | Forgot `bun install` after degitting                     | Run `make bootstrap` or `bun install`                                   |

## 9. Advanced Customization Patterns

- **Additional CLI commands**: Add files under `src/cli/commands/`, import into `src/cli/index.ts`, and register with Commander. Document each new command in README and doctor outputs.
- **New Fastify routes**: Place handlers in `src/server/routes/`, ensure schemas validate inputs/outputs, and record metrics via tsfulmen telemetry helpers.
- **Custom config fields**: Extend defaults (Layer 1), update schema definitions (Layer 0 references), and document env overrides. Always validate with tsfulmen schema utilities.
- **Observability profiles**: Promote from SIMPLE → STRUCTURED → ENTERPRISE depending on deployment stage using config or env flags.

## 10. Best Practices (From the Fulmen Technical Manifesto)

1. **Be persnickety about code** – never skip lint, typecheck, or tests before committing.
2. **Ruthless type safety** – embrace strict TypeScript, prefer explicit types for public APIs.
3. **Observability from day one** – keep logging and metrics wired even in development.
4. **Schemas first** – update JSON/YAML schemas before adding new config or API fields.
5. **Zero-trust mindset** – plan for AAA even if not enabled yet; leave hooks for auth middleware.
6. **Automate governance** – rely on Make targets and future goneat integrations for consistency.
7. **Document refits** – keep this guide and README aligned so future maintainers know what changed.

## 11. Fulmen Resources

- [Fulmen Ecosystem Guide](../../../../crucible/docs/architecture/fulmen-ecosystem-guide.md)
- [Fulmen Forge Workhorse Standard](../../../../crucible/docs/architecture/fulmen-forge-workhorse-standard.md)
- [Fulmen Technical Manifesto](../../../../crucible/docs/architecture/fulmen-technical-manifesto.md)
- [tsfulmen (TypeScript helper library)](https://github.com/fulmenhq/tsfulmen)
- [FulmenHQ Portal](https://fulmenhq.dev)

---

**Remember:** CDRL keeps templates nimble. Update identity first, let helper modules propagate those values everywhere else, and keep production reliability (logging, metrics, graceful shutdown) intact while layering in your business logic.
