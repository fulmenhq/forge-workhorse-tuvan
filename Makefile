# Tuvan Makefile
# Compliant with FulmenHQ Makefile Standard
# Quick Start Commands:
#   make help           - Show all available commands
#   make bootstrap      - Install dependencies and external tools
#   make test           - Run tests
#   make build          - Build distributable artifacts
#   make check-all      - Full quality check (lint, typecheck, test)

.PHONY: all help bootstrap bootstrap-force hooks-ensure tools sync dependencies lint fmt test build build-all clean version version-set version-propagate
.PHONY: version-bump-major version-bump-minor version-bump-patch version-bump-calver
.PHONY: release-check release-prepare release-build release-guard-tag-version typecheck check-all quality precommit prepush test-watch test-coverage run openapi
.PHONY: validate-app-identity sync-embedded-identity verify-embedded-identity doctor release-download release-checksums release-sign release-export-keys release-verify-checksums release-upload-provenance release-clean

# Variables
VERSION := $(shell cat VERSION 2>/dev/null || echo "0.0.1")
BINARY_NAME := tuvan
BIN_DIR := ./bin
DIST_DIR := ./dist
DIST_RELEASE := ./dist/release

# ============================================================================
# RELEASE SIGNING CONFIGURATION (optional - delete this section if not needed)
# ============================================================================
#
# CDRL Guide - Customizing for your project:
#   1. Change SIGNING_APP_NAME to your binary/app name
#   2. Change SIGNING_ENV_PREFIX to your app's uppercase prefix (e.g., MYAPP)
#   3. Set environment variables: ${SIGNING_ENV_PREFIX}_MINISIGN_KEY, etc.
#
# To REMOVE signing entirely:
#   1. Delete this section (lines through SIGNING_ENV_PREFIX)
#   2. Delete the "release-*" targets at the bottom of this file
#   3. Delete scripts/generate-checksums.sh, sign-release-manifests.sh,
#      export-release-keys.sh, release-download.sh, release-upload-provenance.sh,
#      verify-checksums.sh
#
# Environment variables (set via .envrc or CI secrets):
#   ${SIGNING_ENV_PREFIX}_MINISIGN_KEY - path to minisign secret key
#   ${SIGNING_ENV_PREFIX}_MINISIGN_PUB - path to minisign public key (optional)
#   ${SIGNING_ENV_PREFIX}_PGP_KEY_ID   - gpg key/fingerprint for PGP (optional)
#   ${SIGNING_ENV_PREFIX}_GPG_HOMEDIR  - isolated gpg homedir (required if PGP)
#
SIGNING_APP_NAME := tuvan
SIGNING_ENV_PREFIX := TUVAN

# Tool installation (user-space bin dir; overridable with BINDIR=...)
#
# Defaults:
# - macOS/Linux: $HOME/.local/bin
# - Windows (Git Bash / MSYS / MINGW / Cygwin): %USERPROFILE%\\bin (or $HOME/bin)
BINDIR ?=
BINDIR_RESOLVE = \
	BINDIR="$(BINDIR)"; \
	if [ -z "$$BINDIR" ]; then \
		OS_RAW="$$(uname -s 2>/dev/null || echo unknown)"; \
		case "$$OS_RAW" in \
			MINGW*|MSYS*|CYGWIN*) \
				if [ -n "$$USERPROFILE" ]; then \
					if command -v cygpath >/dev/null 2>&1; then \
						BINDIR="$$(cygpath -u "$$USERPROFILE")/bin"; \
					else \
						BINDIR="$$USERPROFILE/bin"; \
					fi; \
				elif [ -n "$$HOME" ]; then \
					BINDIR="$$HOME/bin"; \
				else \
					BINDIR="./bin"; \
				fi ;; \
			*) \
				if [ -n "$$HOME" ]; then \
					BINDIR="$$HOME/.local/bin"; \
				else \
					BINDIR="./bin"; \
				fi ;; \
		esac; \
	fi

# Tooling - minimum versions (won't downgrade existing installs)
GONEAT_VERSION ?= v0.5.13

# Trust anchor installer (sfetch). Bootstrap self-installs sfetch when missing
# so CI runners and fresh checkouts don't need it pre-provisioned.
SFETCH_INSTALL_URL ?= https://github.com/3leaps/sfetch/releases/latest/download/install-sfetch.sh

SFETCH_RESOLVE = \
	$(BINDIR_RESOLVE); \
	SFETCH=""; \
	if [ -x "$$BINDIR/sfetch" ]; then SFETCH="$$BINDIR/sfetch"; fi; \
	if [ -z "$$SFETCH" ]; then SFETCH="$$(command -v sfetch 2>/dev/null || true)"; fi

GONEAT_RESOLVE = \
	$(BINDIR_RESOLVE); \
	GONEAT=""; \
	if [ -x "$$BINDIR/goneat" ]; then GONEAT="$$BINDIR/goneat"; fi; \
	if [ -z "$$GONEAT" ]; then GONEAT="$$(command -v goneat 2>/dev/null || true)"; fi; \
	if [ -z "$$GONEAT" ]; then echo "goneat not found. Run 'make bootstrap' first."; exit 1; fi

# Default target
all: check-all

# Help target
help: ## Show this help message
	@echo "Tuvan - TypeScript Workhorse Template"
	@echo ""
	@echo "Required targets (Makefile Standard):"
	@echo "  help            - Show this help message"
	@echo "  bootstrap       - Install external tools (sfetch, goneat) and dependencies"
	@echo "  bootstrap-force - Force reinstall external tools"
	@echo "  hooks-ensure    - Ensure git hooks are installed"
	@echo "  tools           - Verify external tools are available"
	@echo "  sync            - Sync assets from SSOT (placeholder for template)"
	@echo "  dependencies    - Generate SBOM for supply-chain security"
	@echo "  lint            - Run linting checks"
	@echo "  test            - Run all tests"
	@echo "  build           - Build distributable artifacts"
	@echo "  build-all       - Build cross-platform binaries (bun build --compile)"
	@echo "  clean           - Remove build artifacts and caches"
	@echo "  fmt             - Format code"
	@echo "  version         - Print current version"
	@echo "  version-set     - Update VERSION and sync metadata (VERSION=x.y.z)"
	@echo "  version-bump-*  - Bump version (major/minor/patch/calver)"
	@echo "  check-all       - Run all quality checks"
	@echo "  quality         - Run lint, typecheck, tests, and build"
	@echo "  precommit       - Run pre-commit hooks"
	@echo "  prepush         - Run pre-push hooks"
	@echo "  release-check   - Validate release readiness"
	@echo "  release-prepare - Prepare for release"
	@echo "  release-build   - Build release artifacts"
	@echo ""
	@echo "Additional targets:"
	@echo "  run               - Run server in development mode"
	@echo "  typecheck         - Run TypeScript type checking"
	@echo "  test-watch        - Run tests in watch mode"
	@echo "  test-coverage     - Run tests with coverage report"
	@echo "  openapi           - Generate OpenAPI specification from TypeBox schemas"
	@echo "  validate-app-identity - Validate .fulmen/app.yaml against schema"
	@echo "  sync-embedded-identity  - Copy identity + VERSION into dist/"
	@echo "  verify-embedded-identity - Verify dist/ contains identity + VERSION"
	@echo "  doctor            - Run diagnostic checks (CLI)"
	@echo ""
	@echo "Release signing workflow (run after CI builds draft release):"
	@echo "  release-download          - Download assets from GitHub draft release"
	@echo "  release-checksums         - Generate SHA256SUMS and SHA512SUMS"
	@echo "  release-sign              - Sign checksum manifests (minisign + optional PGP)"
	@echo "  release-export-keys       - Export public signing keys to release dir"
	@echo "  release-verify-checksums  - Verify checksums against artifacts"
	@echo "  release-upload-provenance - Upload provenance to GitHub release"
	@echo "  release-clean             - Clean release artifacts directory"
	@echo ""

# Bootstrap targets
bootstrap: ## Install external tools (sfetch, goneat) and dependencies
	@echo "Installing external tools..."
	@$(BINDIR_RESOLVE); mkdir -p "$$BINDIR"; $(SFETCH_RESOLVE); if [ -z "$$SFETCH" ]; then \
		echo "-> sfetch not found; installing trust anchor into $$BINDIR..."; \
		if [ -n "$$GITHUB_TOKEN" ]; then \
			echo "   (using GITHUB_TOKEN for authenticated request)"; \
			curl -H "Authorization: token $$GITHUB_TOKEN" -sSfL "$(SFETCH_INSTALL_URL)" -o /tmp/install-sfetch.sh && bash /tmp/install-sfetch.sh --dir "$$BINDIR" --yes; \
		elif command -v curl >/dev/null 2>&1; then \
			curl -sSfL "$(SFETCH_INSTALL_URL)" -o /tmp/install-sfetch.sh && bash /tmp/install-sfetch.sh --dir "$$BINDIR" --yes; \
		else \
			echo "curl required to bootstrap sfetch" >&2; exit 1; \
		fi; \
		$(SFETCH_RESOLVE); if [ -z "$$SFETCH" ]; then echo "error: sfetch installation failed (binary not found in $$BINDIR)" >&2; exit 1; fi; \
	else \
		echo "-> sfetch already installed"; \
	fi
	@$(BINDIR_RESOLVE); mkdir -p "$$BINDIR"; echo "-> sfetch self-verify (trust anchor):"; $(SFETCH_RESOLVE); $$SFETCH --self-verify
	@$(BINDIR_RESOLVE); mkdir -p "$$BINDIR"; \
		GONEAT=""; if [ -x "$$BINDIR/goneat" ]; then GONEAT="$$BINDIR/goneat"; fi; if [ -z "$$GONEAT" ]; then GONEAT="$$(command -v goneat 2>/dev/null || true)"; fi; \
		CUR=""; if [ -n "$$GONEAT" ]; then CUR="$$("$$GONEAT" --version 2>/dev/null | head -n1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"; fi; \
		if [ "$(FORCE)" = "1" ] || [ "$(FORCE)" = "true" ] || [ "$$CUR" != "$(GONEAT_VERSION)" ]; then \
			if [ -n "$$CUR" ] && [ "$$CUR" != "$(GONEAT_VERSION)" ]; then echo "-> goneat $$CUR != pinned $(GONEAT_VERSION); reinstalling..."; fi; \
			rm -f "$$BINDIR/goneat" "$$BINDIR/goneat.exe"; \
			echo "-> Installing goneat $(GONEAT_VERSION) into $$BINDIR..."; \
			$(SFETCH_RESOLVE); $$SFETCH --repo fulmenhq/goneat --tag $(GONEAT_VERSION) --dest-dir "$$BINDIR"; \
			OS_RAW="$$(uname -s 2>/dev/null || echo unknown)"; case "$$OS_RAW" in MINGW*|MSYS*|CYGWIN*) if [ -f "$$BINDIR/goneat.exe" ] && [ ! -f "$$BINDIR/goneat" ]; then mv "$$BINDIR/goneat.exe" "$$BINDIR/goneat"; fi ;; esac; \
		else \
			echo "-> goneat $(GONEAT_VERSION) already installed, skipping (use FORCE=1 to reinstall)"; \
		fi; \
		$(GONEAT_RESOLVE); echo "-> goneat: $$($$GONEAT --version 2>&1 | head -n1 || true)"; \
		echo "-> Installing foundation tools via goneat doctor..."; \
		$$GONEAT doctor tools --scope foundation --install --install-package-managers --yes --no-cooling
	@echo "-> Installing Node.js dependencies..."
	@if command -v bun >/dev/null 2>&1; then \
		echo "-> Using bun..."; \
		bun install; \
	else \
		echo "-> Using npm..."; \
		npm install; \
	fi
	@$(MAKE) hooks-ensure
	@$(BINDIR_RESOLVE); echo "Bootstrap completed. Ensure $$BINDIR is on PATH"

bootstrap-force: ## Force reinstall external tools
	@$(MAKE) bootstrap FORCE=1

hooks-ensure: ## Ensure git hooks are installed (idempotent)
	@$(BINDIR_RESOLVE); \
	GONEAT=""; \
	if [ -x "$$BINDIR/goneat" ]; then GONEAT="$$BINDIR/goneat"; fi; \
	if [ -z "$$GONEAT" ]; then GONEAT="$$(command -v goneat 2>/dev/null || true)"; fi; \
	if [ -d ".git" ] && [ -n "$$GONEAT" ] && [ ! -x ".git/hooks/pre-commit" ]; then \
		echo "Installing git hooks with goneat..."; \
		$$GONEAT hooks install 2>/dev/null || true; \
	fi

tools: ## Verify external tools are available
	@echo "Verifying external tools..."
	@$(GONEAT_RESOLVE); echo "goneat: $$($$GONEAT --version 2>&1 | head -n1)"
	@if command -v bun >/dev/null 2>&1; then \
		echo "bun: $$(bun --version)"; \
	else \
		if command -v node >/dev/null 2>&1; then \
			echo "node: $$(node --version)"; \
		else \
			echo "Neither bun nor node found"; \
			exit 1; \
		fi; \
	fi
	@echo "All tools verified"

sync: ## Sync assets from SSOT (placeholder for template)
	@echo "Tuvan workhorse template does not consume SSOT assets directly"
	@echo "   (tsfulmen library handles SSOT integration)"
	@echo "Sync target satisfied (no-op)"

dependencies: ## Generate SBOM for supply-chain security
	@echo "Generating Software Bill of Materials (SBOM)..."
	@$(GONEAT_RESOLVE); $$GONEAT dependencies --sbom --sbom-output sbom/$(BINARY_NAME).cdx.json
	@echo "SBOM generated at sbom/$(BINARY_NAME).cdx.json"

# Version management
version: ## Print current version
	@echo "$(VERSION)"

version-set: ## Update VERSION (usage: make version-set VERSION=x.y.z)
	@if [ -z "$(VERSION)" ]; then \
		echo "VERSION not set. Usage: make version-set VERSION=x.y.z"; \
		exit 1; \
	fi
	@echo "$(VERSION)" > VERSION
	@$(MAKE) version-propagate
	@echo "Version set to $(VERSION) and propagated"

version-propagate: ## Propagate VERSION to package.json
	@echo "Propagating version to package.json..."
	@if command -v bun >/dev/null 2>&1; then \
		bun run scripts/sync-version.ts; \
	else \
		npx tsx scripts/sync-version.ts; \
	fi
	@echo "Version propagated"

version-bump-major: ## Bump major version
	@echo "Bumping major version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	NEW_MAJOR=$$(($$MAJOR + 1)); \
	echo "$$NEW_MAJOR.0.0" > VERSION
	@$(MAKE) version-propagate
	@echo "Version bumped to $$(cat VERSION)"

version-bump-minor: ## Bump minor version
	@echo "Bumping minor version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	NEW_MINOR=$$(($$MINOR + 1)); \
	echo "$$MAJOR.$$NEW_MINOR.0" > VERSION
	@$(MAKE) version-propagate
	@echo "Version bumped to $$(cat VERSION)"

version-bump-patch: ## Bump patch version
	@echo "Bumping patch version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW_PATCH=$$(($$PATCH + 1)); \
	echo "$$MAJOR.$$MINOR.$$NEW_PATCH" > VERSION
	@$(MAKE) version-propagate
	@echo "Version bumped to $$(cat VERSION)"

version-bump-calver: ## Bump to CalVer (YYYY.0M.MICRO)
	@echo "Bumping to CalVer..."
	@YEAR=$$(date +%Y); \
	MONTH=$$(date +%m); \
	echo "$$YEAR.$$MONTH.0" > VERSION
	@$(MAKE) version-propagate
	@echo "Version bumped to $$(cat VERSION) (CalVer)"

# Quality targets
lint: ## Run linting checks
	@echo "Linting TypeScript/JavaScript..."
	@if command -v bun >/dev/null 2>&1; then \
		bunx biome check --no-errors-on-unmatched src/; \
	else \
		npx biome check --no-errors-on-unmatched src/; \
	fi
	@echo "All linting passed"

fmt: ## Format code
	@echo "Formatting TypeScript/JavaScript..."
	@if command -v bun >/dev/null 2>&1; then \
		bunx biome check --write src/; \
	else \
		npx biome check --write src/; \
	fi
	@echo "Code formatted"

typecheck: ## Run TypeScript type checking
	@echo "Type checking with tsc..."
	@bunx tsc --noEmit
	@echo "Type checking passed"

test: ## Run tests
	@echo "Running test suite..."
	@bun run test

test-watch: ## Run tests in watch mode
	@echo "Running tests in watch mode..."
	@bunx vitest

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@bun run test:coverage

check-all: lint typecheck test ## Run all quality checks
	@echo "All quality checks passed"

quality: check-all build ## Run lint, typecheck, tests, and build
	@echo "Quality checks and build completed"

# Build targets
build: ## Build distributable artifacts
	@echo "Building $(BINARY_NAME) $(VERSION)..."
	@mkdir -p $(DIST_DIR) $(BIN_DIR)
	@if command -v bun >/dev/null 2>&1; then \
		bunx tsc; \
	else \
		npx tsc; \
	fi
	@$(MAKE) sync-embedded-identity
	@echo "Creating $(BIN_DIR)/$(BINARY_NAME) wrapper..."
	@echo '#!/usr/bin/env node' > $(BIN_DIR)/$(BINARY_NAME)
	@echo 'import("../dist/index.js");' >> $(BIN_DIR)/$(BINARY_NAME)
	@chmod +x $(BIN_DIR)/$(BINARY_NAME)
	@echo "Build complete - $(BIN_DIR)/$(BINARY_NAME) ready"

build-all: build ## Build cross-platform binaries (bun build --compile)
	@echo "Building cross-platform binaries..."
	@bun run build:all
	@echo "Cross-platform binaries built to $(DIST_RELEASE)/"

# OpenAPI specification generation
openapi: ## Generate OpenAPI specification from TypeBox schemas
	@echo "Generating OpenAPI specification..."
	@if command -v bun >/dev/null 2>&1; then \
		bun run scripts/generate-openapi.ts; \
	else \
		npx tsx scripts/generate-openapi.ts; \
	fi

# Clean target
clean: ## Remove build artifacts and caches
	@echo "Cleaning artifacts..."
	@rm -rf $(DIST_DIR)/ $(BIN_DIR)/ coverage/ .nyc_output/ *.tsbuildinfo sbom/
	@echo "Clean completed"

# Development targets
run: ## Run server in development mode
	@echo "Starting $(BINARY_NAME) in development mode..."
	@if command -v bun >/dev/null 2>&1; then \
		bun run dev; \
	else \
		npm run dev; \
	fi

# Release targets
release-guard-tag-version: ## Guard: VERSION == package.json (and == git tag when tagging)
	@./scripts/release-guard-tag-version.sh

release-check: check-all ## Validate release readiness
	@echo "Checking release readiness..."
	@if [ ! -f VERSION ]; then \
		echo "VERSION file missing"; \
		exit 1; \
	fi
	@if [ ! -f CHANGELOG.md ]; then \
		echo "CHANGELOG.md missing (recommended)"; \
	fi
	@$(MAKE) release-guard-tag-version
	@echo "Release checks passed"

release-prepare: ## Prepare for release
	@echo "Preparing release..."
	@$(MAKE) check-all
	@echo "Release prepared"

release-build: build-all ## Build release artifacts
	@echo "Packaging release for $(VERSION)..."
	@npm pack --pack-destination $(DIST_RELEASE)/
	@cd $(DIST_RELEASE) && for f in *.tgz; do [ -f "$$f" ] && mv "$$f" "$(BINARY_NAME)-$(VERSION).tgz" 2>/dev/null; break; done
	@./scripts/generate-checksums.sh "$(DIST_RELEASE)" "$(BINARY_NAME)"
	@echo "Release build complete — artifacts in $(DIST_RELEASE)/"

# Pre-commit/push hooks (called by goneat hooks, not directly)
precommit: ## Run pre-commit hooks
	@echo "Running pre-commit validation..."
	@$(GONEAT_RESOLVE); $$GONEAT format --types yaml,markdown; $$GONEAT assess --check --categories format,lint --fail-on critical
	@echo "Pre-commit checks passed"

prepush: ## Run pre-push hooks
	@echo "Running pre-push validation..."
	@$(GONEAT_RESOLVE); $$GONEAT format --types yaml,markdown; $$GONEAT assess --check --categories format,lint,security,dependencies --fail-on high
	@echo "Pre-push checks passed"

# App identity validation
validate-app-identity: ## Validate .fulmen/app.yaml against schema
	@echo "Validating .fulmen/app.yaml..."
	@./scripts/validate-app-identity.sh

sync-embedded-identity: ## Copy identity + VERSION into dist/ for standalone runs
	@node ./scripts/sync-embedded-identity.js

verify-embedded-identity: ## Verify dist/ contains correct identity + VERSION
	@node ./scripts/verify-embedded-identity.js

doctor: ## Run diagnostic checks (CLI)
	@if command -v bun >/dev/null 2>&1; then \
		bunx tsx src/index.ts doctor; \
	else \
		npx tsx src/index.ts doctor; \
	fi

# ============================================================================
# RELEASE SIGNING WORKFLOW (optional - delete if not needed)
# ============================================================================
#
# TAG FORMAT: vX.Y.Z (with 'v' prefix, e.g., v1.2.3)
#   - The 'v' prefix is REQUIRED for GitHub release conventions
#   - Scripts validate format and reject bare semver (1.2.3)
#
# Workflow (run locally AFTER CI builds draft release):
#   1. make release-download TAG=v1.2.3   # Download CI-built artifacts
#   2. make release-checksums             # Generate SHA256SUMS, SHA512SUMS
#   3. make release-sign TAG=v1.2.3       # Sign manifests (minisign + PGP)
#   4. make release-export-keys           # Export public keys for verification
#   5. make release-verify-checksums      # Sanity check before upload
#   6. make release-upload-provenance TAG=v1.2.3  # Upload to GitHub release
#
# See signing configuration section above for environment variable setup.
#

release-download: ## Download assets from GitHub draft release (TAG=vX.Y.Z required)
	@if [ -z "$(TAG)" ]; then echo "TAG not set. Usage: make release-download TAG=vX.Y.Z (v prefix required)"; exit 1; fi
	@./scripts/release-download.sh "$(TAG)" "$(DIST_RELEASE)"

release-checksums: ## Generate SHA256SUMS and SHA512SUMS from downloaded artifacts
	@./scripts/generate-checksums.sh "$(DIST_RELEASE)"

release-sign: ## Sign checksum manifests (minisign + optional PGP, TAG=vX.Y.Z required)
	@if [ -z "$(TAG)" ]; then echo "TAG not set. Usage: make release-sign TAG=vX.Y.Z (v prefix required)"; exit 1; fi
	@SIGNING_APP_NAME=$(SIGNING_APP_NAME) SIGNING_ENV_PREFIX=$(SIGNING_ENV_PREFIX) ./scripts/sign-release-manifests.sh "$(TAG)" "$(DIST_RELEASE)"

release-export-keys: ## Export public signing keys to release dir
	@SIGNING_APP_NAME=$(SIGNING_APP_NAME) SIGNING_ENV_PREFIX=$(SIGNING_ENV_PREFIX) ./scripts/export-release-keys.sh "$(DIST_RELEASE)"

release-verify-checksums: ## Verify checksums against artifacts
	@./scripts/verify-checksums.sh "$(DIST_RELEASE)"

release-upload-provenance: ## Upload provenance to GitHub release (TAG=vX.Y.Z required)
	@if [ -z "$(TAG)" ]; then echo "TAG not set. Usage: make release-upload-provenance TAG=vX.Y.Z (v prefix required)"; exit 1; fi
	@./scripts/release-upload-provenance.sh "$(TAG)" "$(DIST_RELEASE)"

release-clean: ## Clean release artifacts directory
	@echo "Cleaning release artifacts..."
	@rm -rf $(DIST_RELEASE)
	@echo "Release artifacts cleaned"
