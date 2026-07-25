#!/usr/bin/env bash
# Shared helpers for Blueprint release scripts.
set -euo pipefail

CLI_CHANGE_PATHS=(
  app/packages/cli
  app/packages/core
)

schema_major_from_file() {
  grep -E '^export const SYSTEM_SCHEMA_MAJOR_VERSION' "$1" | sed -E 's/.*= ([0-9]+);/\1/'
}

schema_major_at_ref() {
  local ref="$1"
  schema_major_from_file <(git show "${ref}:app/packages/core/src/models/schemaVersion.ts")
}

last_cli_tag() {
  git tag -l 'cli-*' | sed 's/cli-//' | sort -n | tail -1
}

next_cli_tag() {
  local last
  last="$(last_cli_tag)"
  if [[ -z "$last" ]]; then
    echo "cli-1"
  else
    echo "cli-$((last + 1))"
  fi
}

last_schema_tag() {
  git tag -l 'schema-v*' | sort -V | tail -1
}

cli_changed_since() {
  local since="${1:-}"
  if [[ -z "$since" ]]; then
    git diff-tree --no-commit-id --name-only -r HEAD -- "${CLI_CHANGE_PATHS[@]}" | grep -q .
  else
    git diff --name-only "${since}"..HEAD -- "${CLI_CHANGE_PATHS[@]}" | grep -q .
  fi
}

schema_breaking_since_last_release() {
  local last_tag current_major last_major
  last_tag="$(last_schema_tag)"
  current_major="$(schema_major_at_ref HEAD)"

  if [[ -z "$last_tag" ]]; then
    return 1
  fi

  last_major="${last_tag#schema-v}"
  [[ "$current_major" -gt "$last_major" ]]
}

delete_release_assets() {
  local tag="$1"
  local id
  while read -r id; do
    [[ -n "$id" ]] || continue
    gh api -X DELETE "repos/${GITHUB_REPOSITORY}/releases/assets/${id}"
  done < <(gh release view "$tag" --json assets -q '.assets[].id')
}

stage_schema_assets() {
  local major="$1"
  local staging
  staging="$(mktemp -d)"
  cp "schemas/blueprint.schema.json" "$staging/"
  cp "schemas/v${major}/blueprint.schema.json" "$staging/blueprint-v${major}.schema.json"
  cp "schemas/latest/blueprint.schema.json" "$staging/blueprint-latest.schema.json"
  echo "$staging"
}
