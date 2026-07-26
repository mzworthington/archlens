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
BLUEPRINT_BIN="${BLUEPRINT_REPO}/app/dist/blueprint"
BLUEPRINTS_DIR="${BLUEPRINT_REPO}/blueprints"

BLUEPRINT_FLAGS=(--headless --output="${BLUEPRINTS_DIR}")

failures=()
succeeded=()

echo "Parent directory: ${PARENT_DIR}"
echo "Blueprints dir:   ${BLUEPRINTS_DIR}"
echo "Blueprint flags:  ${BLUEPRINT_FLAGS[*]} $*"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ build blueprint CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(
  cd "${BLUEPRINT_REPO}/app"
  pnpm --filter @blueprint/cli build
)
echo "✓ blueprint CLI built at ${BLUEPRINT_BIN}"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ clean blueprints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf "${BLUEPRINTS_DIR}"
mkdir -p "${BLUEPRINTS_DIR}"
echo "✓ removed ${BLUEPRINTS_DIR}"
echo

for name in "${DIRECTORIES[@]}"; do
  target="${PARENT_DIR}/${name}"

  if [[ ! -d "${target}" ]]; then
    echo "✗ skip ${name}: not found at ${target}" >&2
    failures+=("${name} (missing)")
    continue
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ ${name}"
  echo "  ${target}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if (
    cd "${target}"
    "${BLUEPRINT_BIN}" "${BLUEPRINT_FLAGS[@]}" "$@"
  ); then
    succeeded+=("${name}")
    echo
    echo "✓ ${name}"
  else
    code=$?
    failures+=("${name} (exit ${code})")
    echo
    echo "✗ ${name} failed (exit ${code})" >&2
  fi
  echo
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ generate artifacts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(
  cd "${BLUEPRINT_REPO}/app"
  pnpm generate
)
echo "✓ schema, features-unit, changelog, format, and lint"
echo

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done: ${#succeeded[@]} succeeded, ${#failures[@]} failed"
[[ ${#succeeded[@]} -gt 0 ]] && printf '  ok: %s\n' "${succeeded[@]}"
[[ ${#failures[@]} -gt 0 ]] && printf '  failed: %s\n' "${failures[@]}" >&2

[[ ${#failures[@]} -eq 0 ]]
