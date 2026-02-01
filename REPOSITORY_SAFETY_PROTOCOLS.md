# Repository Safety Protocols

This repository is a Fulmen workhorse template. The default posture is: safe-by-default, production-reliability first, and supervised changes (human review before commits/releases).

## Safety Priorities

- Prevent irreversible actions by default (force pushes, history rewrites, destructive deletes).
- Prevent secret leaks (tokens, keys, credentials, private URLs).
- Preserve CDRL ergonomics (Clone -> Degit -> Refit -> Launch) for downstream users.

## Allowed vs Prohibited Operations

Allowed:

- Adding new files and code that improves reliability, observability, and standard compliance.
- Refactors that preserve behavior and improve clarity (with tests updated as needed).
- Updating documentation to reflect actual behavior and Fulmen standards.

Prohibited unless explicitly requested by a human maintainer:

- `git push --force` / rewriting shared history.
- `git reset --hard`, destructive `git clean -fdx`, or mass deletion of files.
- Publishing releases, tags, or packages.
- Changing security posture (auth defaults, TLS posture, public exposure) without review.

## Secret Handling

- Never commit secrets or real credentials.
- Keep `.env` gitignored; use `.env.example` as the template.
- Treat anything in `scripts/release-*` as potentially sensitive (signing keys, provenance).

## Network and External Dependencies

- No network calls or external downloads during tests.
- If a tool is required (e.g., `sfetch`, `goneat`), bootstrap MUST be explicit and documented via `make bootstrap`.

## Template Integrity (CDRL)

- The canonical customization surface is `.fulmen/app.yaml`.
- Avoid hardcoding the breed name (`tuvan`) in source code; derive naming/paths/telemetry from app identity.
- Do not commit anything under `.plans/` (permanent gitignore).

## Quality Gates

Before any commit (human-supervised mode):

- `make fmt`
- `make lint`
- `make typecheck`
- `make test`

## Escalation

- Escalation contact: `@3leapsdave` (see `MAINTAINERS.md`).
- If an action could impact release integrity, supply chain, or security posture: stop and escalate.
