#!/usr/bin/env bash
# Fetch failed GitHub Actions logs to speed CI triage (agent-debug).
# Usage (from a git checkout):
#   debug-ci-failed.sh                  # latest failed run on default branch
#   debug-ci-failed.sh --run 123456789  # specific run id
#   debug-ci-failed.sh --workflow "Sync Derived Outputs"
#   debug-ci-failed.sh --branch main --limit 5
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI required (https://cli.github.com/)" >&2
  exit 1
fi

RUN_ID=""
WORKFLOW=""
BRANCH=""
LIMIT=1
REPO_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run)
      RUN_ID="${2:-}"; shift 2 ;;
    --workflow)
      WORKFLOW="${2:-}"; shift 2 ;;
    --branch)
      BRANCH="${2:-}"; shift 2 ;;
    --limit)
      LIMIT="${2:-}"; shift 2 ;;
    --repo)
      REPO_ARGS+=(--repo "${2:-}"); shift 2 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${RUN_ID}" ]]; then
  LIST_ARGS=(run list --status failure --limit "${LIMIT}" --json databaseId,displayTitle,workflowName,headBranch,url,conclusion,createdAt)
  if [[ -n "${WORKFLOW}" ]]; then
    LIST_ARGS+=(--workflow "${WORKFLOW}")
  fi
  if [[ -n "${BRANCH}" ]]; then
    LIST_ARGS+=(--branch "${BRANCH}")
  fi

  echo "== Failed runs =="
  gh "${REPO_ARGS[@]}" "${LIST_ARGS[@]}"

  RUN_ID="$(gh "${REPO_ARGS[@]}" "${LIST_ARGS[@]}" --jq '.[0].databaseId // empty')"
  if [[ -z "${RUN_ID}" ]]; then
    echo "No failed runs found." >&2
    exit 1
  fi
  echo ""
  echo "== Using run ${RUN_ID} =="
fi

echo ""
echo "== Run summary =="
gh "${REPO_ARGS[@]}" run view "${RUN_ID}"

echo ""
echo "== Failed job logs =="
# Prefer failed-only logs; fall back to full log if the flag is unavailable.
if gh "${REPO_ARGS[@]}" run view "${RUN_ID}" --log-failed 2>/dev/null; then
  :
else
  echo "(--log-failed unavailable; showing full log)" >&2
  gh "${REPO_ARGS[@]}" run view "${RUN_ID}" --log
fi

echo ""
echo "Tip: classify as flake | config-drift | tool-missing | auth | product-bug before editing code."
echo "See: ~/.agents/SOPs/hypothesis-driven-debug.md"
