#!/usr/bin/env bash
# Regenerate blueprints/ by scanning sibling repos (or paths from BLUEPRINT_BATCH_PARENT).
# Repo list / contexts: scripts/blueprint-sample-repos.json (shared with publish-demo-catalog.yml).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUEPRINT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
CATALOG="${SCRIPT_DIR}/blueprint-sample-repos.json"
PARENT_DIR="${BLUEPRINT_BATCH_PARENT:-$(dirname "${BLUEPRINT_REPO}")}"
BLUEPRINT_BIN="${BLUEPRINT_REPO}/app/dist/archlens"
BLUEPRINTS_DIR="${BLUEPRINT_REPO}/blueprints"

command -v jq >/dev/null || {
  echo "Missing: jq (needed to read ${CATALOG})" >&2
  exit 1
}
[[ -f "${CATALOG}" ]] || {
  echo "Missing catalog: ${CATALOG}" >&2
  exit 1
}

mapfile -t DIRECTORIES < <(jq -r '.[].id' "${CATALOG}")

failures=()
succeeded=()

scan_context() {
  # Prefer explicit .context; otherwise use id so batch paths match demo catalog fragments.
  jq -r --arg id "$1" '.[] | select(.id == $id) | (.context // .id)' "${CATALOG}"
}

scan_git_since() {
  jq -r --arg id "$1" '.[] | select(.id == $id) | .gitSinceDays // 365' "${CATALOG}"
}

echo "Parent directory: ${PARENT_DIR}"
echo "Blueprints dir:   ${BLUEPRINTS_DIR}"
echo "Catalog:          ${CATALOG}"
echo

ensure_app_deps() {
  local marker="${BLUEPRINT_REPO}/app/packages/cli/node_modules/@clack/prompts/package.json"
  if [[ ! -f "${marker}" ]]; then
    echo "App dependencies missing or incomplete - running pnpm install..."
    (cd "${BLUEPRINT_REPO}/app" && pnpm install)
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ build archlens"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ensure_app_deps
cd "${BLUEPRINT_REPO}/app"
pnpm --filter @archlens/cli build
echo "✓ archlens built at ${BLUEPRINT_BIN}"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ build ChaosLens WASM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
make -C "${BLUEPRINT_REPO}/resilience-engine" copy-wasm
echo "✓ chaoslens.wasm copied to canvas public assets"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ clean blueprints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -d "${BLUEPRINTS_DIR}" ]]; then
  shopt -s dotglob nullglob
  for entry in "${BLUEPRINTS_DIR}"/*; do
    [[ -e "${entry}" ]] || continue
    rm -rf "${entry}"
  done
  shopt -u dotglob nullglob
else
  mkdir -p "${BLUEPRINTS_DIR}"
fi
echo "✓ cleaned ${BLUEPRINTS_DIR}"
echo

for name in "${DIRECTORIES[@]}"; do
  target="${PARENT_DIR}/${name}"

  if [[ ! -d "${target}" ]]; then
    echo "✗ skip ${name}: not found at ${target}" >&2
    failures+=("${name}: missing")
    continue
  fi

  context="$(scan_context "${name}")"
  git_since="$(scan_git_since "${name}")"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ ${name}"
  echo "  ${target}"
  echo "  context=${context} git-since=${git_since}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if (
    cd "${target}"
    "${BLUEPRINT_BIN}" --headless --output="${BLUEPRINTS_DIR}" --context="${context}" --git-since="${git_since}" "$@"
  ); then
    succeeded+=("${name}")
    echo
    echo "✓ ${name}"
  else
    code=$?
    failures+=("${name}: exit ${code}")
    echo
    echo "✗ ${name} failed with exit ${code}" >&2
  fi
  echo
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ install sample products"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node "${SCRIPT_DIR}/merge-samples.mjs" "${BLUEPRINTS_DIR}"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ format"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd "${BLUEPRINT_REPO}/app" && pnpm format:write)
echo "✓ format:write"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done: ${#succeeded[@]} succeeded, ${#failures[@]} failed"
[[ ${#succeeded[@]} -gt 0 ]] && printf '  ok: %s\n' "${succeeded[@]}"
[[ ${#failures[@]} -gt 0 ]] && printf '  failed: %s\n' "${failures[@]}" >&2

[[ ${#failures[@]} -eq 0 ]]
