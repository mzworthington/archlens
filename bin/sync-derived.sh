#!/usr/bin/env bash
# Regenerate derived repo outputs and commit when anything changed.
# Invoked by .github/workflows/refresh-docs-media.yml (weekly + manual).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

head_msg="$(git log -1 --format=%s)"
if [[ "$head_msg" =~ ^chore\(derived\): ]] \
  || [[ "$head_msg" =~ ^chore\(artifacts\): ]] \
  || [[ "$head_msg" =~ ^chore\(docs-media\): ]] \
  || [[ "$head_msg" =~ ^chore\(changelog\): ]]; then
  echo "Skipping: HEAD is already a derived-output commit."
  exit 0
fi

(cd app && pnpm generate:schema)
(cd app && pnpm generate:features-unit)
node bin/changelog-render.mjs
(cd app && pnpm record:docs-media)
(cd app && pnpm --filter @archlens/cli build)
(cd app && pnpm test:vhs)
(cd app && pnpm format:write)

git add CHANGELOG.md docs/features-unit.md schemas/ docs/screenshots/

if git diff --staged --quiet; then
  echo "Derived outputs are already up to date."
  exit 0
fi

git commit -m "chore(artifacts): sync derived outputs"
git push origin HEAD

echo "Synced derived outputs on main."
