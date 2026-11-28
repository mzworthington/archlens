#!/usr/bin/env bash
# Domain defaults, then the edge-dns command on PATH. Catalog credentials stay in this repo.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${PULUMI_STACK:=prod}"
: "${DOMAIN:=archlens.dev}"
export PULUMI_STACK DOMAIN

command -v setup-cloudflare-hosting >/dev/null || {
  echo "Add edge-dns/cmd to PATH" >&2
  exit 1
}

setup-cloudflare-hosting "$@"
exec bin/setup-r2-catalog.sh
