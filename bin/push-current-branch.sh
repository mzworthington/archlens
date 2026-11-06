#!/usr/bin/env bash
# Push the current commit to origin/main.
# Derived jobs run for several minutes; main can move, so rebase and retry.
set -euo pipefail

remote="${1:-origin}"
branch="${2:-main}"
attempts="${PUSH_ATTEMPTS:-3}"

for ((attempt = 1; attempt <= attempts; attempt++)); do
  git fetch "$remote" "$branch"
  git rebase "$remote/$branch"
  if git push "$remote" "HEAD:$branch"; then
    exit 0
  fi
  echo "Push to ${remote}/${branch} rejected (attempt ${attempt}/${attempts})." >&2
done

echo "Failed to push ${remote}/${branch} after ${attempts} attempts." >&2
exit 1
