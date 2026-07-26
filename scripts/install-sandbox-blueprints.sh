#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUEPRINT_REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
BLUEPRINTS_DIR="${1:-${BLUEPRINT_REPO}/blueprints}"

node "${SCRIPT_DIR}/merge-sandbox-context.mjs" "${BLUEPRINTS_DIR}"
