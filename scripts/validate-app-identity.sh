#!/usr/bin/env bash

set -euo pipefail

# Validate .fulmen/app.yaml against schema using tsfulmen
#
# Usage: validate-app-identity.sh [identity_path]
#
# Validates:
# 1. File exists and is valid YAML
# 2. Required fields present (binary_name, vendor, env_prefix, config_name, description)
# 3. Field patterns match Crucible app-identity schema

IDENTITY_PATH="${1:-.fulmen/app.yaml}"

if [ ! -f "${IDENTITY_PATH}" ]; then
    echo "ERROR: App identity file not found: ${IDENTITY_PATH}" >&2
    exit 1
fi

echo "Validating app identity: ${IDENTITY_PATH}"

# Check if yq is available for YAML parsing
if ! command -v yq > /dev/null 2>&1; then
    echo "ERROR: yq not found in PATH" >&2
    echo "Install: brew install yq (macOS) or see https://github.com/mikefarah/yq" >&2
    exit 1
fi

# Extract required fields
binary_name=$(yq '.app.binary_name // ""' "${IDENTITY_PATH}")
vendor=$(yq '.app.vendor // ""' "${IDENTITY_PATH}")
env_prefix=$(yq '.app.env_prefix // ""' "${IDENTITY_PATH}")
config_name=$(yq '.app.config_name // ""' "${IDENTITY_PATH}")
description=$(yq '.app.description // ""' "${IDENTITY_PATH}")

errors=0

# Validate binary_name (lowercase kebab-case, 2-64 chars)
if [ -z "${binary_name}" ]; then
    echo "ERROR: app.binary_name is required" >&2
    errors=$((errors + 1))
elif ! [[ "${binary_name}" =~ ^[a-z][a-z0-9-]{0,62}[a-z0-9]$|^[a-z]$ ]]; then
    echo "ERROR: app.binary_name must be lowercase kebab-case (2-64 chars): ${binary_name}" >&2
    errors=$((errors + 1))
else
    echo "OK: app.binary_name: ${binary_name}"
fi

# Validate vendor (lowercase alphanumeric, 2-64 chars, no hyphens)
if [ -z "${vendor}" ]; then
    echo "ERROR: app.vendor is required" >&2
    errors=$((errors + 1))
elif ! [[ "${vendor}" =~ ^[a-z][a-z0-9]{0,62}[a-z0-9]$|^[a-z]$ ]]; then
    echo "ERROR: app.vendor must be lowercase alphanumeric (2-64 chars, no hyphens): ${vendor}" >&2
    errors=$((errors + 1))
else
    echo "OK: app.vendor: ${vendor}"
fi

# Validate env_prefix (uppercase, must end with _)
if [ -z "${env_prefix}" ]; then
    echo "ERROR: app.env_prefix is required" >&2
    errors=$((errors + 1))
elif ! [[ "${env_prefix}" =~ ^[A-Z][A-Z0-9_]*_$ ]]; then
    echo "ERROR: app.env_prefix must be uppercase and end with underscore: ${env_prefix}" >&2
    errors=$((errors + 1))
else
    echo "OK: app.env_prefix: ${env_prefix}"
fi

# Validate config_name (lowercase kebab-case, 2-64 chars)
if [ -z "${config_name}" ]; then
    echo "ERROR: app.config_name is required" >&2
    errors=$((errors + 1))
elif ! [[ "${config_name}" =~ ^[a-z][a-z0-9-]{0,62}[a-z0-9]$|^[a-z]$ ]]; then
    echo "ERROR: app.config_name must be lowercase kebab-case (2-64 chars): ${config_name}" >&2
    errors=$((errors + 1))
else
    echo "OK: app.config_name: ${config_name}"
fi

# Validate description (10-200 chars)
if [ -z "${description}" ]; then
    echo "ERROR: app.description is required" >&2
    errors=$((errors + 1))
elif [ ${#description} -lt 10 ] || [ ${#description} -gt 200 ]; then
    echo "ERROR: app.description must be 10-200 characters (got ${#description}): ${description}" >&2
    errors=$((errors + 1))
else
    echo "OK: app.description: ${description}"
fi

echo ""

if [ ${errors} -gt 0 ]; then
    echo "ERROR: Validation failed with ${errors} error(s)" >&2
    exit 1
fi

echo "OK: App identity validation passed"
