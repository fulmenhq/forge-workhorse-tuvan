# Forge-Workhorse-Tuvan – Maintainers

**Project**: forge-workhorse-tuvan
**Purpose**: Production-ready workhorse application template for robust, scalable TypeScript backends
**Governance Model**: 3leaps Initiative

## Human Maintainers

### @3leapsdave (Dave Thompson)

- **Role**: Project Lead & Primary Maintainer
- **Responsibilities**: Template architecture, workhorse standard compliance, integration oversight, production readiness
- **Contact**: dave.thompson@3leaps.net | GitHub [@3leapsdave](https://github.com/3leapsdave) | X [@3leapsdave](https://x.com/3leapsdave)
- **Supervision**: All AI agent contributions

## Agentic Roles

This repository uses role-based agentic development. Agents operate under roles defined in the FulmenHQ role catalog, accessed via tsfulmen's crucible shim.

### Accessing Role Definitions

```typescript
import {
  listConfigDefaults,
  getConfigDefaults,
} from "@fulmenhq/tsfulmen/crucible";

// List available roles
const roles = await listConfigDefaults("agentic");

// Load a specific role definition
const devlead = await getConfigDefaults("agentic", "roles/devlead");
```

Role YAML files are embedded at:
`node_modules/@fulmenhq/tsfulmen/config/crucible-ts/agentic/roles/`

### Available Roles

| Role       | Slug       | Category   | Use When                                     |
| ---------- | ---------- | ---------- | -------------------------------------------- |
| Dev Lead   | `devlead`  | agentic    | Implementation, architecture, feature work   |
| Dev Review | `devrev`   | review     | Code review, bug finding, four-eyes audit    |
| QA         | `qa`       | review     | Testing, validation, dogfooding              |
| UX Dev     | `uxdev`    | agentic    | TUI and web frontend development             |
| Info Arch  | `infoarch` | agentic    | Documentation, schemas, standards            |
| Ent Arch   | `entarch`  | governance | Cross-repo coordination, ecosystem alignment |
| CI/CD      | `cicd`     | automation | Pipelines, builds, GitHub Actions            |
| Sec Review | `secrev`   | review     | Security analysis, vulnerabilities           |
| Data Eng   | `dataeng`  | agentic    | Database design, data pipelines              |
| Prod Mktg  | `prodmktg` | marketing  | Messaging, personas, branding                |

### Operating Modes

**Supervised Mode** (current):

- All agent work requires human review before commit
- Human maintainer (@3leapsdave) is Committer-of-Record
- See [Git Commit Attribution Baseline](https://github.com/fulmenhq/crucible/blob/main/docs/standards/agentic-attribution.md)

**Autonomous Mode** (future):

- Agents operate within defined boundaries
- Escalation contact for issues: @3leapsdave
- Requires `Autonomous-Agent:` and `Escalation-Contact:` trailers

## Attribution Guidelines

Follow the [Git Commit Attribution Baseline](https://github.com/fulmenhq/crucible/blob/main/docs/standards/agentic-attribution.md).

### Required Trailers

```
Co-Authored-By: <Model> <noreply@3leaps.net>
Role: <role>
Committer-of-Record: Dave Thompson <dave.thompson@3leaps.net> [@3leapsdave]
```

### Key Requirements

- Use `noreply@3leaps.net` (NOT vendor defaults like `noreply@anthropic.com`)
- Include `Role:` trailer matching the operating role from the catalog
- Include `Committer-of-Record:` for human accountability

## Governance Structure

- Human maintainers approve architecture, releases, and supervise AI agents
- AI agents execute tasks under defined roles with human oversight
- See `REPOSITORY_SAFETY_PROTOCOLS.md` for guardrails and escalation paths

## Communication Channels

- **Primary**: GitHub Issues and Pull Requests
- **Escalation**: Direct contact with @3leapsdave for critical issues

## Contribution Guidelines

All contributors (human and AI) must:

- Follow Fulmen Forge Workhorse Standard
- Follow TypeScript coding standards from Crucible (via tsfulmen)
- Maintain test coverage above 80%
- Run `make check-all` before commits
- Document all template features for CDRL users
- Ensure backward compatibility for template consumers
- Coordinate breaking changes with @3leapsdave

## TypeScript-Specific Standards

### Code Quality

- **TypeScript Version**: 5.7+
- **Strict Mode**: Enabled (`strict: true` in tsconfig.json)
- **No Implicit Any**: All functions must have explicit types
- **Null Safety**: Strict null checks enabled
- **Import Style**: ES modules (ESM) only
- **Formatting**: Biome for linting and formatting
- **Testing**: Vitest with 80%+ coverage requirement

### Production Patterns

- **Error Handling**: Use tsfulmen/errors for structured error types
- **Logging**: Use tsfulmen/logging with Pino backend
- **Configuration**: Three-layer config via tsfulmen/config
- **Metrics**: Prometheus via tsfulmen/telemetry
- **Signal Handling**: Cross-platform via tsfulmen/signals
- **App Identity**: Dynamic configuration via tsfulmen/appidentity

## Quality Standards

### Required Quality Gates

- TypeScript compilation with zero errors (strict mode)
- All tests passing (Vitest)
- Test coverage >= 80%
- Linting passing (Biome)
- No `any` types (except well-documented escape hatches)
- Documentation complete and accurate
- CDRL guide up to date

## Contact Information

### Primary Maintainer

- **Name**: Dave Thompson
- **Email**: dave.thompson@3leaps.net
- **GitHub**: [@3leapsdave](https://github.com/3leapsdave)
- **X**: [@3leapsdave](https://x.com/3leapsdave)

## License & Legal

- **Software License**: MIT License (see LICENSE file)
- **Documentation**: CC BY 4.0
- **Trademarks**: "Fulmen" and "3 Leaps" are trademarks of 3 Leaps, LLC
- **Attribution**: Required per Agentic Attribution Standard

---

**Last Updated**: 2026-01-27
**Status**: Active Development
