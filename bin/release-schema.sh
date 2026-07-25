#!/usr/bin/env bash
# Publish a schema release when SYSTEM_SCHEMA_MAJOR_VERSION increases (breaking change).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=bin/lib/release-common.sh
source "$ROOT/bin/lib/release-common.sh"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required." >&2
  exit 1
fi

if ! schema_breaking_since_last_release; then
  echo "No breaking schema change since last schema release; skipping."
  exit 0
fi

MAJOR="$(schema_major_at_ref HEAD)"
RELEASE_TAG="schema-v${MAJOR}"
LAST_TAG="$(last_schema_tag)"

RELEASE_NOTES="Breaking schema contract v${MAJOR}."
if [[ -n "$LAST_TAG" ]]; then
  RELEASE_NOTES="$(git log "${LAST_TAG}..HEAD" --pretty=format:'- %s (%h)' -- \
    app/packages/core/src/models/schemaVersion.ts schemas/)"
fi
if [[ -z "${RELEASE_NOTES//[$'\t\n\r ']/}" ]]; then
  RELEASE_NOTES="Schema v${MAJOR} (breaking contract bump)."
fi

SCHEMA_STAGING="$(stage_schema_assets "$MAJOR")"
trap 'rm -rf "$SCHEMA_STAGING"' EXIT
ASSETS=("$SCHEMA_STAGING"/*)

if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Re-publishing ${RELEASE_TAG} (workflow re-run)."
  gh release edit "$RELEASE_TAG" --notes "$RELEASE_NOTES"
  delete_release_assets "$RELEASE_TAG"
  gh release upload "$RELEASE_TAG" "${ASSETS[@]}"
else
  gh release create "$RELEASE_TAG" \
    --title "Schema v${MAJOR}" \
    --notes "$RELEASE_NOTES" \
    "${ASSETS[@]}"
fi

echo "Published schema release ${RELEASE_TAG}"
