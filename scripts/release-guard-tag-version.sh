#!/usr/bin/env bash
set -euo pipefail

# Release guard for fulmenhq/forge-workhorse-tuvan.
#
# Asserts that the three sources of truth for the release version agree:
#   1. VERSION file
#   2. package.json "version" (must be propagated via `make version-set`)
#   3. the git tag for HEAD (when releasing)
#
# (2) exists specifically to catch the drift where VERSION was bumped by hand
# without running the propagation target, leaving package.json stale — npm
# names the pack tarball from package.json, so the release workflow would
# build a mislabeled artifact.
#
# Environment variables:
#   TUVAN_RELEASE_TAG   - Override the tag to check (e.g. in CI from the ref)
#   TUVAN_REQUIRE_TAG   - Set to 1 to require an exact tag on HEAD (CI release)

repo_root() {
	git rev-parse --show-toplevel
}

read_version() {
	if [ ! -f VERSION ]; then
		echo "error: VERSION file not found" >&2
		exit 1
	fi
	tr -d ' \t\r\n' <VERSION
}

read_pkg_version() {
	node -e "process.stdout.write(require('./package.json').version || '')"
}

normalize_tag() {
	local raw="${1:-}"
	if [ -z "$raw" ]; then
		printf '%s' ""
		return 0
	fi
	if [[ "$raw" == v* ]]; then
		printf '%s' "$raw"
	else
		printf 'v%s' "$raw"
	fi
}

detect_tag() {
	if [ -n "${TUVAN_RELEASE_TAG:-}" ]; then
		normalize_tag "${TUVAN_RELEASE_TAG}"
		return 0
	fi
	git describe --tags --exact-match 2>/dev/null || true
}

main() {
	local root
	root="$(repo_root)"
	cd "$root"

	local version pkg_version
	version="$(read_version)"
	pkg_version="$(read_pkg_version)"

	# (2) VERSION vs package.json — always checked, tag or not.
	if [ "$pkg_version" != "$version" ]; then
		echo "error: VERSION/package.json mismatch" >&2
		echo "  VERSION:              $version" >&2
		echo "  package.json.version: $pkg_version" >&2
		echo "  fix: make version-set VERSION=$version" >&2
		exit 1
	fi

	# (3) tag vs VERSION — only when a tag is present (or required).
	local expected="v${version}"
	local tag
	tag="$(detect_tag)"

	if [ -z "$tag" ]; then
		if [ "${TUVAN_REQUIRE_TAG:-}" = "1" ]; then
			echo "error: no exact tag found for HEAD and no TUVAN_RELEASE_TAG provided" >&2
			exit 1
		fi
		echo "✅ release guard: VERSION matches package.json ($version); no tag to check"
		exit 0
	fi

	if [ "$tag" != "$expected" ]; then
		echo "error: release tag/version mismatch" >&2
		echo "  tag:     $tag" >&2
		echo "  VERSION: $version (expected tag: $expected)" >&2
		exit 1
	fi

	echo "✅ release guard: VERSION, package.json, and tag all agree ($tag)"
}

main "$@"
