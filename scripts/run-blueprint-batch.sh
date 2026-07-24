#!/usr/bin/env bash
set -euo pipefail

DIRECTORIES=(
  backstage
  eshop
  gpio-build-monitor
  terraform-examples
  blueprint
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUEPRINT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
PARENT_DIR="${BLUEPRINT_BATCH_PARENT:-$(dirname "${BLUEPRINT_REPO}")}"

BLUEPRINT_FLAGS=(--headless)

failures=()
succeeded=()

echo "Parent directory: ${PARENT_DIR}"
echo "Blueprint flags:  ${BLUEPRINT_FLAGS[*]} $*"
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
    blueprint "${BLUEPRINT_FLAGS[@]}" "$@"
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
echo "Done: ${#succeeded[@]} succeeded, ${#failures[@]} failed"
[[ ${#succeeded[@]} -gt 0 ]] && printf '  ok: %s\n' "${succeeded[@]}"
[[ ${#failures[@]} -gt 0 ]] && printf '  failed: %s\n' "${failures[@]}" >&2

[[ ${#failures[@]} -eq 0 ]]
