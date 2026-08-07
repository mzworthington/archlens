#!/usr/bin/env bash
# Regenerate derived outputs (changelog, docs media) and commit when anything changed.
# Invoked by .github/workflows/refresh-derived.yml (weekly + manual).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

head_msg="$(git log -1 --format=%s 2>/dev/null || true)"
if [[ "$head_msg" =~ ^chore\(derived\): ]] \
  || [[ "$head_msg" =~ ^chore\(artifacts\): ]] \
  || [[ "$head_msg" =~ ^chore\(docs-media\): ]] \
  || [[ "$head_msg" =~ ^chore\(changelog\): ]]; then
  echo "Skipping: HEAD is already a derived-output commit."
  exit 0
fi

node bin/changelog-render.mjs

if [[ "${SKIP_DOCS_MEDIA:-}" != "1" ]]; then
  pnpm record:docs-media
fi

pnpm format

git add CHANGELOG.md docs/screenshots/

if git diff --staged --quiet; then
  echo "Derived outputs are already up to date."
  exit 0
fi

git commit -m "chore(artifacts): sync derived outputs"
if [[ "${SKIP_PUSH:-}" != "1" ]]; then
  git push origin HEAD
fi

echo "Synced derived outputs."
