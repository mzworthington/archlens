#!/usr/bin/env bash
# Fail when a Cloudflare Pages upload would include a file over the per-file cap.
set -euo pipefail

dir="${1:?dist directory}"
max_mib="${2:-24}"
max_bytes=$((max_mib * 1024 * 1024))
fail=0

while IFS= read -r -d '' file; do
  size=$(stat -c%s "$file")
  if (( size > max_bytes )); then
    mib=$(awk -v bytes="$size" 'BEGIN { printf "%.1f", bytes / 1024 / 1024 }')
    echo "Pages asset over ${max_mib} MiB: ${file} (${mib} MiB)"
    fail=1
  fi
done < <(find "$dir" -type f -print0)

if (( fail )); then
  echo "Cloudflare Pages rejects a single file over 25 MiB." >&2
  exit 1
fi
