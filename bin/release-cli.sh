#!/usr/bin/env bash
# CLI release helper: detect whether to release, or publish the next v0.1.x GitHub release.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CLI_CHANGE_PATHS=(
  app/packages/cli
  app/packages/core
)

CLI_ASSETS=(
  dist/archlens-linux-x64.tar.gz
  dist/archlens-macos-x64.tar.gz
  dist/archlens-macos-arm64.tar.gz
  dist/archlens-windows-x64.zip
)

last_cli_version_tag() {
  if [[ -z "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]]; then
    return 0
  fi
  gh release list --limit 200 --json tagName -q '.[].tagName' \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V \
    | tail -1
}

next_cli_version_tag() {
  local last version major minor patch
  last="$(last_cli_version_tag)"
  if [[ -z "$last" ]]; then
    echo "v0.1.0"
    return
  fi
  version="${last#v}"
  IFS='.' read -r major minor patch <<< "$version"
  echo "v${major}.${minor}.$((patch + 1))"
}

release_commit_for_tag() {
  local tag="$1"
  gh release view "$tag" --json targetCommitish -q .targetCommitish
}

cli_changed_since() {
  local since="${1:-}"
  local base=""
  if [[ -n "$since" ]]; then
    base="$(release_commit_for_tag "$since")"
  fi
  if [[ -z "$base" ]]; then
    git diff-tree --no-commit-id --name-only -r HEAD -- "${CLI_CHANGE_PATHS[@]}" | grep -q .
  else
    git diff --name-only "${base}"..HEAD -- "${CLI_CHANGE_PATHS[@]}" | grep -q .
  fi
}

delete_release_assets() {
  local tag="$1"
  local id
  while read -r id; do
    [[ -n "$id" ]] || continue
    gh api -X DELETE "repos/${GITHUB_REPOSITORY}/releases/assets/${id}"
  done < <(gh release view "$tag" --json assets -q '.assets[].id')
}

emit() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s\n' "$1" >>"$GITHUB_OUTPUT"
  else
    echo "$1"
  fi
}

cmd_detect() {
  local head_msg last_cli
  head_msg="$(git log -1 --format=%s)"
  if [[ "$head_msg" =~ ^chore\(changelog\): ]] \
    || [[ "$head_msg" =~ ^chore\(derived\): ]]; then
    emit "skip=true"
    emit "release_cli=false"
    echo "Skipping releases: HEAD is a derived-output commit."
    return 0
  fi

  emit "skip=false"

  if [[ "$head_msg" =~ ^chore\(artifacts\): ]]; then
    emit "release_cli=true"
    echo "Releasing CLI: HEAD is a derived sync commit."
    return 0
  fi

  last_cli="$(last_cli_version_tag)"

  if cli_changed_since "$last_cli"; then
    emit "release_cli=true"
    echo "CLI paths changed since ${last_cli:-initial commit}."
  else
    emit "release_cli=false"
    echo "No CLI changes since ${last_cli:-initial commit}."
  fi
}

cmd_publish() {
  local release_tag asset target_sha repo
  if [[ -z "${GH_TOKEN:-}" ]]; then
    echo "GH_TOKEN is required." >&2
    exit 1
  fi

  for asset in "${CLI_ASSETS[@]}"; do
    if [[ ! -f "$asset" ]]; then
      echo "Missing release asset: $asset" >&2
      exit 1
    fi
  done

  release_tag="$(next_cli_version_tag)"
  target_sha="$(git rev-parse HEAD)"

  if gh release view "$release_tag" >/dev/null 2>&1; then
    echo "Re-publishing ${release_tag} (workflow re-run)."
    delete_release_assets "$release_tag"
    gh release upload "$release_tag" "${CLI_ASSETS[@]}" --clobber
  else
    gh release create "$release_tag" \
      --target "$target_sha" \
      --title "Release ${release_tag}" \
      --generate-notes \
      --latest \
      "${CLI_ASSETS[@]}"
  fi

  echo "Published CLI release ${release_tag} at ${target_sha}"
}

usage() {
  echo "Usage: $(basename "$0") detect|publish" >&2
  exit 1
}

case "${1:-}" in
  detect) cmd_detect ;;
  publish) cmd_publish ;;
  *) usage ;;
esac
