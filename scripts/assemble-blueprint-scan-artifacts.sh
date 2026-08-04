#!/usr/bin/env bash
# Merge per-repo scan artifacts into blueprints/, reinstall sandbox products, validate.
# Usage: assemble-blueprint-scan-artifacts.sh <artifacts-root>
# Expects: <artifacts-root>/scan-<id>/… or <artifacts-root>/<id>/… YAML trees.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUEPRINT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACTS_ROOT="${1:?Usage: $0 <artifacts-root>}"
BLUEPRINTS_DIR="${BLUEPRINT_REPO}/blueprints"
ARCHLENS_BIN="${ARCHLENS_BIN:-${BLUEPRINT_REPO}/app/dist/archlens}"
CATALOG="${SCRIPT_DIR}/blueprint-sample-repos.json"

[[ -d "${ARTIFACTS_ROOT}" ]] || {
  echo "Artifacts root not found: ${ARTIFACTS_ROOT}" >&2
  exit 1
}

expected="$(jq 'length' "${CATALOG}")"

# Resolve artifact dirs first — never wipe blueprints/ if a matrix leg is missing.
declare -a merge_from=()
missing=()
while IFS= read -r entry; do
  candidates=("${ARTIFACTS_ROOT}/scan-${entry}" "${ARTIFACTS_ROOT}/${entry}")
  scan_dir=""
  for c in "${candidates[@]}"; do
    if [[ -d "${c}" ]]; then
      scan_dir="${c}"
      break
    fi
  done
  if [[ -z "${scan_dir}" ]]; then
    missing+=("${entry}")
    continue
  fi
  merge_from+=("${entry}|${scan_dir}")
done < <(jq -r '.[].id' "${CATALOG}")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing scan artifacts (${#missing[@]}/${expected}): ${missing[*]}" >&2
  exit 1
fi

[[ ${#merge_from[@]} -gt 0 ]] || {
  echo "No scan artifacts under ${ARTIFACTS_ROOT}" >&2
  exit 1
}

echo "→ clean ${BLUEPRINTS_DIR}"
mkdir -p "${BLUEPRINTS_DIR}"
shopt -s dotglob nullglob
for entry in "${BLUEPRINTS_DIR}"/*; do
  [[ -e "${entry}" ]] || continue
  rm -rf "${entry}"
done
shopt -u dotglob nullglob

merged=0
for item in "${merge_from[@]}"; do
  entry="${item%%|*}"
  scan_dir="${item#*|}"
  echo "→ merge ${entry} from ${scan_dir}"
  cp -a "${scan_dir}/." "${BLUEPRINTS_DIR}/"
  merged=$((merged + 1))
done

echo "→ sandbox products"
node "${SCRIPT_DIR}/merge-sandbox-context.mjs" "${BLUEPRINTS_DIR}"

if [[ -x "${ARCHLENS_BIN}" ]]; then
  echo "→ validate"
  "${ARCHLENS_BIN}" validate "${BLUEPRINTS_DIR}"
elif command -v archlens >/dev/null; then
  echo "→ validate (PATH archlens)"
  archlens validate "${BLUEPRINTS_DIR}"
else
  echo "⚠ skipping validate — archlens binary not found" >&2
fi

echo "✓ assembled ${merged}/${expected} scan artifact(s) into ${BLUEPRINTS_DIR}"
