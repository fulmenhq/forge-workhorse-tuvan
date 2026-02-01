#!/usr/bin/env bash

set -euo pipefail

# Download release artifacts from GitHub release
#
# Usage: release-download.sh <tag> [dest_dir]
#
# Requires: gh (GitHub CLI)

# Tag format: vX.Y.Z (with 'v' prefix, e.g., v1.2.3)
TAG="${1:-}"
DEST_DIR="${2:-dist/release}"

if [[ -z "${TAG}" ]]; then
    echo "usage: $0 vX.Y.Z [dest_dir]  (tag must be vX.Y.Z format)" >&2
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

mkdir -p "${DEST_DIR}"

echo "→ Downloading release assets for ${TAG} into ${DEST_DIR}"
# --clobber allows re-running safely
gh release download "${TAG}" --dir "${DEST_DIR}" --clobber

echo "✅ Download complete"
echo ""
echo "Contents of ${DEST_DIR}:"
ls -la "${DEST_DIR}"
