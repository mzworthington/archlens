#!/usr/bin/env bash
# Recreate git tags for CLI releases and re-publish any that became drafts after tag deletion.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]]; then
  echo "GH_TOKEN or GITHUB_TOKEN is required." >&2
  exit 1
fi

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

git fetch origin main

commit_for_release_created_at() {
  local created_at="$1"
  python3 - "$created_at" <<'PY'
import subprocess
import sys
from datetime import datetime

created = datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00"))
log = subprocess.check_output(
    ["git", "log", "origin/main", "--format=%H %cI"],
    text=True,
)
best_sha = ""
best_delta = None
for line in log.splitlines():
    sha, ts = line.split(" ", 1)
    commit = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    delta = abs((created - commit).total_seconds())
    if best_delta is None or delta < best_delta:
        best_delta = delta
        best_sha = sha

if best_delta is None or best_delta > 120:
    sys.exit(1)
print(best_sha)
PY
}

# Original release creation timestamps (before tag-deletion backfill overwrote metadata).
release_created_at() {
  case "$1" in
    v0.1.1) echo "2026-07-10T18:26:59Z" ;;
    v0.1.2) echo "2026-07-10T20:13:01Z" ;;
    v0.1.3) echo "2026-07-10T20:36:16Z" ;;
    v0.1.4) echo "2026-07-11T12:03:34Z" ;;
    v0.1.5) echo "2026-07-11T12:54:09Z" ;;
    v0.1.6) echo "2026-07-11T16:13:18Z" ;;
    v0.1.7) echo "2026-07-12T13:55:01Z" ;;
    v0.1.8) echo "2026-07-12T15:12:13Z" ;;
    v0.1.9) echo "2026-07-12T15:26:18Z" ;;
    v0.1.10) echo "2026-07-12T20:08:54Z" ;;
    v0.1.11) echo "2026-07-13T11:56:56Z" ;;
    v0.1.12) echo "2026-07-15T14:41:04Z" ;;
    v0.1.13) echo "2026-07-15T15:48:26Z" ;;
    v0.1.14) echo "2026-07-15T18:04:54Z" ;;
    v0.1.15) echo "2026-07-15T18:26:27Z" ;;
    v0.1.16) echo "2026-07-15T18:33:14Z" ;;
    v0.1.17) echo "2026-07-15T18:44:35Z" ;;
    v0.1.18) echo "2026-07-15T21:30:38Z" ;;
    v0.1.19) echo "2026-07-16T11:20:05Z" ;;
    v0.1.20) echo "2026-07-16T13:09:19Z" ;;
    v0.1.21) echo "2026-07-16T13:34:43Z" ;;
    v0.1.22) echo "2026-07-16T13:50:35Z" ;;
    v0.1.23) echo "2026-07-17T12:46:01Z" ;;
    v0.1.24) echo "2026-07-18T07:43:51Z" ;;
    v0.1.25) echo "2026-07-18T07:55:31Z" ;;
    v0.1.26) echo "2026-07-20T09:05:21Z" ;;
    v0.1.27) echo "2026-07-21T13:28:03Z" ;;
    v0.1.28) echo "2026-07-24T22:15:24Z" ;;
    v0.1.29) echo "2026-07-24T22:30:17Z" ;;
    v0.1.30) echo "2026-07-25T19:22:07Z" ;;
    v0.1.31) echo "2026-07-26T14:38:01Z" ;;
    v0.1.32) echo "2026-07-26T15:34:21Z" ;;
    v0.1.33) echo "2026-07-26T22:16:52Z" ;;
    v0.1.34) echo "2026-07-27T11:07:17Z" ;;
    v0.1.35) echo "2026-07-27T14:24:30Z" ;;
    v0.1.36) echo "2026-07-27T17:20:20Z" ;;
    v0.1.37) echo "2026-07-28T06:22:27Z" ;;
    v0.1.38) echo "2026-07-28T07:44:33Z" ;;
    v0.1.39) echo "2026-07-28T09:51:18Z" ;;
    *) return 1 ;;
  esac
}

tags=()
while IFS= read -r tag; do
  tags+=("$tag")
done < <(
  gh api "repos/${REPO}/releases?per_page=100" --jq '.[].tag_name' \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V
)

echo "Backfilling ${#tags[@]} CLI release tags..."
latest_tag="${tags[${#tags[@]}-1]}"

for tag in "${tags[@]}"; do
  release_json="$(gh api "repos/${REPO}/releases?per_page=100" --jq ".[] | select(.tag_name == \"${tag}\")")"
  if [[ -z "$release_json" ]]; then
    echo "${tag}: release not found, skipping." >&2
    continue
  fi

  release_id="$(printf '%s' "$release_json" | jq -r '.id')"
  is_draft="$(printf '%s' "$release_json" | jq -r '.draft')"
  created_at="$(release_created_at "$tag")"
  sha="$(commit_for_release_created_at "$created_at")"
  remote_sha="$(git ls-remote origin "refs/tags/${tag}^{}" | awk '{print $1}')"

  if [[ "$remote_sha" == "$sha" ]]; then
    echo "${tag}: remote tag already correct at ${sha:0:7}"
  else
    git tag -f -a "$tag" -m "Release ${tag}" "$sha" >/dev/null
    git push -f origin "$tag"
    if [[ -n "$remote_sha" ]]; then
      echo "${tag}: retargeted remote tag ${remote_sha:0:7} -> ${sha:0:7}"
    else
      echo "${tag}: created remote tag at ${sha:0:7}"
    fi
  fi

  make_latest="false"
  [[ "$tag" == "$latest_tag" ]] && make_latest="true"
  gh api -X PATCH "repos/${REPO}/releases/${release_id}" \
    -f draft=false \
    -f target_commitish="$sha" \
    -f tag_name="$tag" \
    -f make_latest="$make_latest" >/dev/null

  if [[ "$is_draft" == "true" ]]; then
    echo "${tag}: re-published release"
  else
    echo "${tag}: updated release target to ${sha:0:7}"
  fi
done

echo "Backfill complete."
