# Tuvan Makefile
# Compliant with FulmenHQ Makefile Standard
# Quick Start Commands:
#   make help           - Show all available commands
#   make bootstrap      - Install dependencies and external tools
#   make test           - Run tests
#   make build          - Build distributable artifacts
#   make check-all      - Full quality check (lint, typecheck, test)

# Variables
VERSION := $(shell cat VERSION 2>/dev/null || echo "0.0.1")
BINARY_NAME := tuvan
BIN_DIR := ./bin
DIST_DIR := ./dist

.PHONY: help bootstrap bootstrap-force tools sync lint fmt test build build-all clean version version-set version-propagate
.PHONY: version-bump-major version-bump-minor version-bump-patch version-bump-calver
.PHONY: release-check release-prepare release-build typecheck check-all quality precommit prepush test-watch test-coverage run

# Default target
all: check-all

# Help target
help: ## Show this help message
	@echo "Tuvan - TypeScript Workhorse Template"
	@echo ""
	@echo "Required targets (Makefile Standard):"
	@echo "  help            - Show this help message"
	@echo "  bootstrap       - Install dependencies and external tools"
	@echo "  bootstrap-force - Force reinstall all tools"
	@echo "  tools           - Verify external tools are available"
	@echo "  sync            - Sync assets from SSOT (placeholder for template)"
	@echo "  lint            - Run linting checks"
	@echo "  test            - Run all tests"
	@echo "  build           - Build distributable artifacts"
	@echo "  build-all       - Build multi-platform binaries (N/A for Node.js template)"
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
	@echo "  run             - Run server in development mode"
	@echo "  typecheck       - Run TypeScript type checking"
	@echo "  test-watch      - Run tests in watch mode"
	@echo "  test-coverage   - Run tests with coverage report"
	@echo ""

# Bootstrap targets
bootstrap: ## Install dependencies and external tools
	@echo "Installing dependencies..."
	@if command -v bun >/dev/null 2>&1; then \
		echo "→ Using bun..."; \
		bun install; \
	else \
		echo "→ Using npm..."; \
		npm install; \
	fi
	@echo "✅ Bootstrap completed"
	@echo "Note: Goneat installation for SSOT sync is optional for workhorse templates"

bootstrap-force: ## Force reinstall dependencies and external tools
	@echo "Force reinstalling dependencies..."
	@if command -v bun >/dev/null 2>&1; then \
		rm -rf node_modules bun.lockb; \
		bun install; \
	else \
		rm -rf node_modules package-lock.json; \
		npm install; \
	fi
	@echo "✅ Force bootstrap completed"

tools: ## Verify external tools are available
	@echo "Verifying external tools..."
	@if command -v bun >/dev/null 2>&1; then \
		echo "✅ bun: $$(bun --version)"; \
	else \
		if command -v node >/dev/null 2>&1; then \
			echo "✅ node: $$(node --version)"; \
		else \
			echo "❌ Neither bun nor node found"; \
			exit 1; \
		fi; \
	fi
	@if command -v tsc >/dev/null 2>&1; then \
		echo "✅ tsc: $$(tsc --version)"; \
	else \
		echo "⚠️  tsc not in PATH (will use node_modules/.bin/tsc)"; \
	fi
	@echo "✅ All required tools present"

sync: ## Sync assets from SSOT (placeholder for template)
	@echo "⚠️  Tuvan workhorse template does not consume SSOT assets directly"
	@echo "   (tsfulmen library handles SSOT integration)"
	@echo "✅ Sync target satisfied (no-op)"

# Version management
version: ## Print current version
	@echo "$(VERSION)"

version-set: ## Update VERSION (usage: make version-set VERSION=x.y.z)
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ VERSION not set. Usage: make version-set VERSION=x.y.z"; \
		exit 1; \
	fi
	@echo "$(VERSION)" > VERSION
	@$(MAKE) version-propagate
	@echo "✅ Version set to $(VERSION) and propagated"

version-propagate: ## Propagate VERSION to package.json
	@echo "Propagating version to package.json..."
	@if command -v bun >/dev/null 2>&1; then \
		bun run scripts/sync-version.ts; \
	else \
		npx tsx scripts/sync-version.ts; \
	fi
	@echo "✅ Version propagated"

version-bump-major: ## Bump major version
	@echo "Bumping major version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	NEW_MAJOR=$$(($$MAJOR + 1)); \
	echo "$$NEW_MAJOR.0.0" > VERSION
	@$(MAKE) version-propagate
	@echo "✅ Version bumped to $$(cat VERSION)"

version-bump-minor: ## Bump minor version
	@echo "Bumping minor version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	NEW_MINOR=$$(($$MINOR + 1)); \
	echo "$$MAJOR.$$NEW_MINOR.0" > VERSION
	@$(MAKE) version-propagate
	@echo "✅ Version bumped to $$(cat VERSION)"

version-bump-patch: ## Bump patch version
	@echo "Bumping patch version..."
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW_PATCH=$$(($$PATCH + 1)); \
	echo "$$MAJOR.$$MINOR.$$NEW_PATCH" > VERSION
	@$(MAKE) version-propagate
	@echo "✅ Version bumped to $$(cat VERSION)"

version-bump-calver: ## Bump to CalVer (YYYY.0M.MICRO)
	@echo "Bumping to CalVer..."
	@YEAR=$$(date +%Y); \
	MONTH=$$(date +%m); \
	echo "$$YEAR.$$MONTH.0" > VERSION
	@$(MAKE) version-propagate
	@echo "✅ Version bumped to $$(cat VERSION) (CalVer)"

# Quality targets
lint: ## Run linting checks
	@echo "Linting TypeScript/JavaScript..."
	@if command -v bun >/dev/null 2>&1; then \
		bunx biome check --no-errors-on-unmatched src/; \
	else \
		npx biome check --no-errors-on-unmatched src/; \
	fi
	@echo "✅ All linting passed"

fmt: ## Format code
	@echo "Formatting TypeScript/JavaScript..."
	@if command -v bun >/dev/null 2>&1; then \
		bunx biome check --write src/; \
	else \
		npx biome check --write src/; \
	fi
	@echo "✅ Code formatted"

typecheck: ## Run TypeScript type checking
	@echo "Type checking with tsc..."
	@bunx tsc --noEmit
	@echo "✅ Type checking passed"

test: ## Run tests
	@echo "Running test suite..."
	@bunx vitest run

test-watch: ## Run tests in watch mode
	@echo "Running tests in watch mode..."
	@bunx vitest

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@bunx vitest run --coverage

check-all: lint typecheck test ## Run all quality checks
	@echo "✅ All quality checks passed"

quality: check-all build ## Run lint, typecheck, tests, and build
	@echo "✅ Quality checks and build completed"

# Build targets
build: ## Build distributable artifacts
	@echo "Building $(BINARY_NAME) $(VERSION)..."
	@mkdir -p $(DIST_DIR) $(BIN_DIR)
	@if command -v bun >/dev/null 2>&1; then \
		bunx tsc; \
	else \
		npx tsc; \
	fi
	@echo "Creating $(BIN_DIR)/$(BINARY_NAME) wrapper..."
	@echo '#!/usr/bin/env node' > $(BIN_DIR)/$(BINARY_NAME)
	@echo 'import("../dist/index.js");' >> $(BIN_DIR)/$(BINARY_NAME)
	@chmod +x $(BIN_DIR)/$(BINARY_NAME)
	@echo "✅ Build complete - $(BIN_DIR)/$(BINARY_NAME) ready"

build-all: build ## Build multi-platform binaries (N/A for Node.js - delegates to build)
	@echo "⚠️  Multi-platform native binaries not applicable for Node.js template"
	@echo "   Template distributes as npm package/source code"
	@echo "✅ Build-all satisfied via standard build"

# Clean target
clean: ## Remove build artifacts and caches
	@echo "Cleaning artifacts..."
	@rm -rf $(DIST_DIR)/ $(BIN_DIR)/ coverage/ .nyc_output/ *.tsbuildinfo
	@echo "✅ Clean completed"

# Development targets
run: ## Run server in development mode
	@echo "Starting $(BINARY_NAME) in development mode..."
	@if command -v bun >/dev/null 2>&1; then \
		bun run dev; \
	else \
		npm run dev; \
	fi

# Release targets
release-check: check-all ## Validate release readiness
	@echo "Checking release readiness..."
	@if [ ! -f VERSION ]; then \
		echo "❌ VERSION file missing"; \
		exit 1; \
	fi
	@if [ ! -f CHANGELOG.md ]; then \
		echo "⚠️  CHANGELOG.md missing (recommended)"; \
	fi
	@echo "✅ Release checks passed"

release-prepare: ## Prepare for release
	@echo "Preparing release..."
	@$(MAKE) check-all
	@echo "✅ Release prepared"

release-build: build-all ## Build release artifacts
	@echo "Building release for $(VERSION)..."
	@echo "✅ Release build complete"

# Pre-commit/push hooks
precommit: fmt lint typecheck ## Run pre-commit hooks
	@echo "✅ Pre-commit checks passed"

prepush: check-all ## Run pre-push hooks
	@echo "✅ Pre-push checks passed"
