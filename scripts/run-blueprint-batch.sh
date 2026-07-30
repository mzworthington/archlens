#!/usr/bin/env bash
set -euo pipefail

DIRECTORIES=(
  backstage
  blueprint
  eshop
  examples # github.com/pulumi/examples
  gpio-build-monitor
  terraform-examples
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUEPRINT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
PARENT_DIR="${BLUEPRINT_BATCH_PARENT:-$(dirname "${BLUEPRINT_REPO}")}"
BLUEPRINT_BIN="${BLUEPRINT_REPO}/app/dist/archlens"
BLUEPRINTS_DIR="${BLUEPRINT_REPO}/blueprints"

BLUEPRINT_FLAGS=(--headless --output="${BLUEPRINTS_DIR}" --git-since=60)

failures=()
succeeded=()

echo "Parent directory: ${PARENT_DIR}"
echo "Blueprints dir:   ${BLUEPRINTS_DIR}"
echo "Blueprint flags:  ${BLUEPRINT_FLAGS[*]} $*"
echo

ensure_app_deps() {
  local marker="${BLUEPRINT_REPO}/app/packages/cli/node_modules/@clack/prompts/package.json"
  if [[ ! -f "${marker}" ]]; then
    echo "App dependencies missing or incomplete - running pnpm install..."
    (cd "${BLUEPRINT_REPO}/app" && pnpm install)
  fi
}

pull_latest() {
  local name="$1"
  local target="$2"

  if ! git -C "${target}" rev-parse --is-inside-work-tree &>/dev/null; then
    echo "  skip pull: not a git repository"
    return 0
  fi

  echo "▶ pull ${name}"
  if git -C "${target}" pull --ff-only; then
    echo "✓ pulled ${name}"
    return 0
  fi

  echo "✗ pull failed for ${name}" >&2
  return 1
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
echo "✓ chaoslens.wasm copied to designer public assets"
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

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ ${name}"
  echo "  ${target}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # if ! pull_latest "${name}" "${target}"; then
  #   failures+=("${name}: pull failed")
  # fi

  if (
    cd "${target}"
    "${BLUEPRINT_BIN}" "${BLUEPRINT_FLAGS[@]}" "$@"
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
echo "▶ install sandbox blueprint products"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node "${SCRIPT_DIR}/merge-sandbox-context.mjs" "${BLUEPRINTS_DIR}"
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
