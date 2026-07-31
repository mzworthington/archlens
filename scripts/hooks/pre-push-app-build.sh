#!/usr/bin/env sh
# Pre-push gate: full typecheck + production build when app/ commits are being pushed.
# Complements .husky/pre-commit (staged-file checks). Catches bypassed hooks and
# designer test files that tsc includes but vitest alone would not typecheck.

set -eu

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT"

if git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  RANGE='@{upstream}..HEAD'
elif git rev-parse --verify origin/main >/dev/null 2>&1; then
  RANGE='origin/main..HEAD'
else
  RANGE='HEAD~1..HEAD'
fi

CHANGED=$(git diff --name-only "$RANGE" 2>/dev/null || true)

if ! echo "$CHANGED" | grep -qE '^app/'; then
  exit 0
fi

echo "Pre-push: app/ changed in ${RANGE} — running typecheck and build..."
cd app
pnpm typecheck
pnpm build
