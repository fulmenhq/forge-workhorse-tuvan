#!/usr/bin/env bash

set -euo pipefail

# Verify the exported public signing keys are present and well-formed, and print
# their identifiers (minisign key ID, PGP fingerprint) so a maintainer can
# eyeball them against the expected signing identity before trusting a release.
#
# Usage: verify-keys.sh [dir] [app_name]
#
# This validates key *structure/identity* only; verify-signatures.sh confirms the
# keys actually signed the manifests.

DIR=${1:-dist/release}
APP_NAME=${2:-tuvan}

if [ ! -d "${DIR}" ]; then
    echo "error: directory ${DIR} not found" >&2
    exit 1
fi

MINISIGN_PUB="${DIR}/${APP_NAME}-minisign.pub"
GPG_PUB="${DIR}/fulmenhq-release-signing-key.asc"

found_any=false

# minisign public key: a 2-line file — an untrusted comment then a base64 line
# that starts with "RW" (Ed; the embedded 8-byte key ID follows the algo bytes).
if [ -f "${MINISIGN_PUB}" ]; then
    key_line="$(grep -v '^untrusted comment:' "${MINISIGN_PUB}" | head -n1)"
    if printf '%s' "${key_line}" | grep -qE '^RW[A-Za-z0-9+/]+=*$'; then
        comment="$(grep '^untrusted comment:' "${MINISIGN_PUB}" | head -n1 | sed 's/^untrusted comment: *//')"
        echo "✅ minisign public key: ${MINISIGN_PUB}"
        echo "   comment: ${comment:-<none>}"
        echo "   key:     ${key_line}"
        found_any=true
    else
        echo "❌ minisign public key malformed: ${MINISIGN_PUB}" >&2
        exit 1
    fi
else
    echo "note: minisign public key not found (${MINISIGN_PUB}) — skipping"
fi

# PGP public key: must import cleanly into an isolated keyring; print fingerprints.
if [ -f "${GPG_PUB}" ]; then
    if ! command -v gpg > /dev/null 2>&1; then
        echo "error: ${GPG_PUB} present but gpg not found in PATH" >&2
        exit 1
    fi
    gpg_home="$(mktemp -d)"
    # shellcheck disable=SC2064
    trap "rm -rf '${gpg_home}'" EXIT
    if gpg --homedir "${gpg_home}" --quiet --import "${GPG_PUB}" 2> /dev/null; then
        echo "✅ PGP public key: ${GPG_PUB}"
        gpg --homedir "${gpg_home}" --list-keys --with-fingerprint --with-colons 2> /dev/null |
            awk -F: '$1=="fpr"{print "   fingerprint: " $10} $1=="uid"{print "   uid:         " $10}'
        found_any=true
    else
        echo "❌ PGP public key failed to import: ${GPG_PUB}" >&2
        exit 1
    fi
else
    echo "note: PGP public key not found (${GPG_PUB}) — skipping"
fi

if [ "${found_any}" != "true" ]; then
    echo "error: no public signing keys found in ${DIR}" >&2
    exit 1
fi

echo ""
echo "✅ Public signing keys verified"
