#!/usr/bin/env bash

set -euo pipefail

# Generate SHA256SUMS and SHA512SUMS for release artifacts
#
# Usage: generate-checksums.sh [dir] <binary_name>
#
# For TypeScript workhorses, this checksums:
# - npm tarball (if present)
# - source archive (if present)
# - any platform-specific bundles

DIR=${1:-dist/release}
BINARY_NAME=${2:-}

if [ -z "${BINARY_NAME}" ]; then
    echo "usage: $0 [dir] <binary_name>" >&2
    exit 1
fi

if [ ! -d "${DIR}" ]; then
    echo "error: directory ${DIR} not found" >&2
    exit 1
fi

cd "${DIR}"

rm -f SHA256SUMS SHA256SUMS.* SHA512SUMS SHA512SUMS.*

# Find release artifacts (npm tarball, source archive, or platform bundles)
artifacts=()

# npm tarball pattern
for f in "${BINARY_NAME}-"*.tgz; do
    [ -f "$f" ] && artifacts+=("$f")
done

# Source archive patterns
for f in "${BINARY_NAME}-"*.tar.gz "${BINARY_NAME}-"*.zip; do
    [ -f "$f" ] && artifacts+=("$f")
done

# Platform bundle patterns (if Bun compile is used)
for f in "${BINARY_NAME}-"*-darwin-* "${BINARY_NAME}-"*-linux-* "${BINARY_NAME}-"*-windows-*; do
    [ -f "$f" ] && artifacts+=("$f")
done

if [ ${#artifacts[@]} -eq 0 ]; then
    echo "error: no artifacts found matching ${BINARY_NAME}-* in ${DIR}" >&2
    echo "Expected: npm tarball (*.tgz), source archive (*.tar.gz, *.zip), or platform bundles" >&2
    exit 1
fi

echo "Generating checksums for ${#artifacts[@]} artifact(s)..."

if command -v sha256sum > /dev/null 2>&1; then
    sha256sum "${artifacts[@]}" > SHA256SUMS
else
    shasum -a 256 "${artifacts[@]}" > SHA256SUMS
fi

if command -v sha512sum > /dev/null 2>&1; then
    sha512sum "${artifacts[@]}" > SHA512SUMS
else
    shasum -a 512 "${artifacts[@]}" > SHA512SUMS
fi

echo "✅ Wrote ${DIR}/SHA256SUMS and ${DIR}/SHA512SUMS"
echo ""
echo "Artifacts checksummed:"
for f in "${artifacts[@]}"; do
    echo "  - $f"
done
