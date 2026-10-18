#!/usr/bin/env bash
# Upload docs/screenshots/*.gif to the docs-media R2 bucket (guides/<name>).
# No-ops unless DOCS_MEDIA_PUBLISH=true, which should wait until Pulumi has created the bucket.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${DOCS_MEDIA_PUBLISH:-}" != "true" ]]; then
  echo "Skipping docs-media upload (set repository variable DOCS_MEDIA_PUBLISH=true after the R2 bucket exists)."
  exit 0
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "DOCS_MEDIA_PUBLISH is set but CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is missing." >&2
  exit 1
fi

BUCKET="${DOCS_MEDIA_BUCKET:-archlens-docs-media}"
shopt -s nullglob
gifs=("$ROOT"/docs/screenshots/*.gif)
if [[ ${#gifs[@]} -eq 0 ]]; then
  echo "No guide GIFs to upload." >&2
  exit 1
fi

for gif in "${gifs[@]}"; do
  name="$(basename "$gif")"
  echo "Uploading guides/${name}"
  (
    cd "$ROOT/app"
    pnpm --filter @archlens/collab exec wrangler r2 object put "${BUCKET}/guides/${name}" \
      --file "$gif" \
      --content-type image/gif \
      --cache-control "public, max-age=3600" \
      --remote
  )
done

echo "Published ${#gifs[@]} guide GIFs to ${BUCKET}."
