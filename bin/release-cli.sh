#!/usr/bin/env bash
# Publish the next sequential CLI release (cli-1, cli-2, …). Caller must gate on CLI changes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=bin/lib/release-common.sh
source "$ROOT/bin/lib/release-common.sh"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "GH_TOKEN is required." >&2
  exit 1
fi

CLI_ASSETS=(
  dist/blueprint-linux-x64.tar.gz
  dist/blueprint-macos-x64.tar.gz
  dist/blueprint-macos-arm64.tar.gz
  dist/blueprint-windows-x64.zip
)

for asset in "${CLI_ASSETS[@]}"; do
  if [[ ! -f "$asset" ]]; then
    echo "Missing release asset: $asset" >&2
    exit 1
  fi
done

RELEASE_TAG="$(next_cli_tag)"
LAST_TAG=""
if [[ "$(last_cli_tag)" != "" ]]; then
  LAST_TAG="cli-$(last_cli_tag)"
fi

if [[ -n "$LAST_TAG" ]]; then
  RELEASE_NOTES="$(git log "${LAST_TAG}..HEAD" --pretty=format:'- %s (%h)' -- "${CLI_CHANGE_PATHS[@]}")"
else
  RELEASE_NOTES="$(git log --pretty=format:'- %s (%h)' -- "${CLI_CHANGE_PATHS[@]}")"
fi

if [[ -z "${RELEASE_NOTES//[$'\t\n\r ']/}" ]]; then
  RELEASE_NOTES="CLI binaries for ${RELEASE_TAG}."
fi

if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Re-publishing ${RELEASE_TAG} (workflow re-run)."
  gh release edit "$RELEASE_TAG" --notes "$RELEASE_NOTES" --latest
  delete_release_assets "$RELEASE_TAG"
  gh release upload "$RELEASE_TAG" "${CLI_ASSETS[@]}"
else
  gh release create "$RELEASE_TAG" \
    --title "$RELEASE_TAG" \
    --notes "$RELEASE_NOTES" \
    --latest \
    "${CLI_ASSETS[@]}"
fi

echo "Published CLI release ${RELEASE_TAG}"
