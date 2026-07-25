#!/usr/bin/env bash
# Regenerate CHANGELOG.md and commit when it changed. Does not create GitHub releases.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bin/changelog

if git diff --quiet CHANGELOG.md; then
  echo "CHANGELOG.md is already up to date."
  exit 0
fi

git add CHANGELOG.md
git commit -m "chore(changelog): update"
git push origin HEAD

echo "Updated CHANGELOG.md on main."
