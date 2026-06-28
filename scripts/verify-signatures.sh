#!/usr/bin/env bash

set -euo pipefail

# Verify minisign + PGP signatures over the release checksum manifests.
#
# Usage: verify-signatures.sh [dir] [app_name]
#
# Checks each present manifest (SHA256SUMS, SHA512SUMS) against:
#   - minisign: <app_name>-minisign.pub + <manifest>.minisig
#   - PGP/GPG:  fulmenhq-release-signing-key.asc + <manifest>.asc
#
# A signature that is present but does not verify is a hard failure. A signature
# type with no files present is skipped (with a note). At least one signature
# across the manifests must verify, or the script fails.

DIR=${1:-dist/release}
APP_NAME=${2:-tuvan}

if [ ! -d "${DIR}" ]; then
    echo "error: directory ${DIR} not found" >&2
    exit 1
fi

MINISIGN_PUB="${DIR}/${APP_NAME}-minisign.pub"
GPG_PUB="${DIR}/fulmenhq-release-signing-key.asc"
MANIFESTS="SHA256SUMS SHA512SUMS"

verified_any=false
gpg_home=""

cleanup() {
    if [ -n "${gpg_home}" ] && [ -d "${gpg_home}" ]; then
        rm -rf "${gpg_home}"
    fi
}
trap cleanup EXIT

# Import the PGP key once into an isolated keyring (never touches the user's).
if [ -f "${GPG_PUB}" ]; then
    if ! command -v gpg > /dev/null 2>&1; then
        echo "error: ${GPG_PUB} present but gpg not found in PATH" >&2
        exit 1
    fi
    gpg_home="$(mktemp -d)"
    gpg --homedir "${gpg_home}" --quiet --import "${GPG_PUB}" 2> /dev/null
fi

for manifest in ${MANIFESTS}; do
    manifest_path="${DIR}/${manifest}"
    [ -f "${manifest_path}" ] || continue

    # minisign
    if [ -f "${manifest_path}.minisig" ]; then
        if [ ! -f "${MINISIGN_PUB}" ]; then
            echo "error: ${manifest}.minisig present but ${MINISIGN_PUB} missing" >&2
            exit 1
        fi
        if ! command -v minisign > /dev/null 2>&1; then
            echo "error: ${manifest}.minisig present but minisign not found in PATH" >&2
            exit 1
        fi
        if minisign -Vqm "${manifest_path}" -p "${MINISIGN_PUB}" > /dev/null 2>&1; then
            echo "✅ minisign: ${manifest} verified"
            verified_any=true
        else
            echo "❌ minisign: ${manifest} FAILED verification" >&2
            exit 1
        fi
    fi

    # PGP / GPG
    if [ -f "${manifest_path}.asc" ]; then
        if [ -z "${gpg_home}" ]; then
            echo "error: ${manifest}.asc present but ${GPG_PUB} missing" >&2
            exit 1
        fi
        if gpg --homedir "${gpg_home}" --verify "${manifest_path}.asc" "${manifest_path}" > /dev/null 2>&1; then
            echo "✅ pgp: ${manifest} verified"
            verified_any=true
        else
            echo "❌ pgp: ${manifest} FAILED verification" >&2
            exit 1
        fi
    fi
done

if [ "${verified_any}" != "true" ]; then
    echo "error: no signatures found to verify in ${DIR} (expected *.minisig and/or *.asc)" >&2
    exit 1
fi

echo ""
echo "✅ Signatures verified"
