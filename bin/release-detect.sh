#!/usr/bin/env bash
# Emit GitHub Actions outputs for which release channels should run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=bin/lib/release-common.sh
source "$ROOT/bin/lib/release-common.sh"

GITHUB_OUTPUT="${GITHUB_OUTPUT:-}"

emit() {
  if [[ -n "$GITHUB_OUTPUT" ]]; then
    printf '%s\n' "$1" >>"$GITHUB_OUTPUT"
  else
    echo "$1"
  fi
}

HEAD_MSG="$(git log -1 --format=%s)"
if [[ "$HEAD_MSG" =~ ^chore\(changelog\): ]]; then
  emit "skip=true"
  emit "release_cli=false"
  emit "release_schema=false"
  echo "Skipping releases: HEAD is a changelog commit."
  exit 0
fi

emit "skip=false"

LAST_CLI=""
if [[ -n "$(last_cli_tag)" ]]; then
  LAST_CLI="cli-$(last_cli_tag)"
fi

if cli_changed_since "$LAST_CLI"; then
  emit "release_cli=true"
  echo "CLI paths changed since ${LAST_CLI:-initial commit}."
else
  emit "release_cli=false"
  echo "No CLI changes since ${LAST_CLI:-initial commit}."
fi

if schema_breaking_since_last_release; then
  emit "release_schema=true"
  echo "Breaking schema change detected (major version increased)."
else
  emit "release_schema=false"
  echo "No breaking schema change."
fi
