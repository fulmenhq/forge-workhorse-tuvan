#!/usr/bin/env bash

set -euo pipefail

# Upload provenance assets (checksums, signatures, keys, notes) to GitHub release
#
# Usage: release-upload-provenance.sh <tag> [source_dir]
#
# This script uploads ONLY provenance outputs to avoid clobbering CI-built artifacts:
# - SHA256SUMS, SHA512SUMS
# - SHA256SUMS.minisig/.asc, SHA512SUMS.minisig/.asc
# - *.pub and *release-signing-key.asc
# - release-notes-*.md
#
# Requires: gh (GitHub CLI)

# Tag format: vX.Y.Z (with 'v' prefix, e.g., v1.2.3)
TAG="${1:-}"
SOURCE_DIR="${2:-dist/release}"

if [[ -z "${TAG}" ]]; then
    echo "usage: $0 vX.Y.Z [source_dir]  (tag must be vX.Y.Z format)" >&2
    exit 1
fi

if [[ ! "${TAG}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    echo "error: tag must be in vX.Y.Z format (e.g., v1.2.3), got: ${TAG}" >&2
    exit 1
fi

if ! command -v gh > /dev/null 2>&1; then
    echo "❌ gh (GitHub CLI) not found in PATH" >&2
    echo "Install: https://cli.github.com/" >&2
    exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
    echo "❌ Source dir not found: ${SOURCE_DIR}" >&2
    exit 1
fi

# Upload only provenance outputs (never binaries) to avoid clobbering CI-built assets.
shopt -s nullglob

assets=()
assets+=("${SOURCE_DIR}/SHA256SUMS" "${SOURCE_DIR}/SHA512SUMS")
assets+=("${SOURCE_DIR}/SHA256SUMS."* "${SOURCE_DIR}/SHA512SUMS."*)
assets+=("${SOURCE_DIR}"/*.pub)
assets+=("${SOURCE_DIR}"/*release-signing-key.asc)
assets+=("${SOURCE_DIR}"/release-notes-*.md)

final_assets=()
for f in "${assets[@]}"; do
    if [[ -f "$f" ]]; then
        final_assets+=("$f")
    fi
done

if [[ ${#final_assets[@]} -eq 0 ]]; then
    echo "❌ No provenance assets found to upload from ${SOURCE_DIR}" >&2
    exit 1
fi

echo "→ Uploading ${#final_assets[@]} provenance asset(s) to ${TAG} (clobber)"
for f in "${final_assets[@]}"; do
    echo "  - $(basename "$f")"
done

gh release upload "${TAG}" "${final_assets[@]}" --clobber

echo ""
echo "✅ Upload complete"
