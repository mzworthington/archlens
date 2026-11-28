#!/usr/bin/env bash
# Mint and store R2 publish credentials for the blueprint catalog.
# The bucket and custom domain stay in this repo's Pulumi stack.
# Run after bin/setup-cloudflare-hosting.sh, or let that shim call this script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${CATALOG_BUCKET_NAME:=archlens-blueprint-catalog}"
: "${CATALOG_DOMAIN:=blueprints.archlens.dev}"
: "${PULUMI_STACK:=prod}"
# Workers R2 Storage Bucket Item Write. Platform permission group, not account-specific.
R2_BUCKET_ITEM_WRITE_PERMISSION_GROUP_ID="2efd5506f9c8494dacb1fa10a3e7d5b6"

die() { echo "✗ $*" >&2; exit 1; }

bws_put() {
  local key=$1 val=$2 id
  [[ "${USE_BWS:-0}" == "1" ]] || return 0
  : "${BWS_ACCESS_TOKEN:?Missing BWS_ACCESS_TOKEN}"
  id=$(bws -t "$BWS_ACCESS_TOKEN" secret list "$BWS_PROJECT_ID" -o json \
    | jq -r --arg k "$key" '.[]?|select(.key==$k)|.id' | head -1)
  if [[ -n "$id" && "$id" != "null" ]]; then
    bws -t "$BWS_ACCESS_TOKEN" secret edit --key "$key" --value "$val" "$id" >/dev/null
  else
    bws -t "$BWS_ACCESS_TOKEN" secret create "$key" "$val" "$BWS_PROJECT_ID" >/dev/null
  fi
}

cf_api() {
  curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" "$@"
}

print_r2_token_hint() {
  echo "" >&2
  echo "Could not create an R2-scoped API token automatically." >&2
  echo "Your CLOUDFLARE_API_TOKEN likely lacks \"User API Tokens: Edit\" (or Account API Tokens)." >&2
  echo "" >&2
  echo "Create an R2 API token in the dashboard (Object Read & Write on bucket ${CATALOG_BUCKET_NAME})," >&2
  echo "then store in bws (or env) and re-run:" >&2
  echo "" >&2
  echo "  R2_BLUEPRINT_CATALOG_BUCKET='${CATALOG_BUCKET_NAME}'" >&2
  echo "  R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID='<access-key-id>'" >&2
  echo "  R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY='<secret-access-key>'" >&2
  echo "" >&2
}

mint_r2_catalog_credentials() {
  echo "→ Minting R2 catalog S3 credentials (scoped to ${CATALOG_BUCKET_NAME})"
  local resource payload resp token_id token_value secret_key
  resource="com.cloudflare.edge.r2.bucket.${CLOUDFLARE_ACCOUNT_ID}_default_${CATALOG_BUCKET_NAME}"
  payload=$(jq -n \
    --arg name "r2-catalog-publish-${CATALOG_BUCKET_NAME}" \
    --arg pg "$R2_BUCKET_ITEM_WRITE_PERMISSION_GROUP_ID" \
    --arg resource "$resource" \
    '{
      name: $name,
      policies: [{
        effect: "allow",
        resources: {($resource): "*"},
        permission_groups: [{id: $pg}]
      }]
    }')

  resp=$(cf_api -X POST "https://api.cloudflare.com/client/v4/user/tokens" --data "$payload")
  if [[ "$(jq -r '.success // false' <<<"$resp")" != "true" ]]; then
    echo "$resp" | jq -r '.errors[]? | "  Cloudflare: \(.message // .)"' >&2 || true
    print_r2_token_hint
    die "R2 catalog credentials missing"
  fi

  token_id=$(jq -r '.result.id // empty' <<<"$resp")
  token_value=$(jq -r '.result.value // empty' <<<"$resp")
  [[ -n "$token_id" && -n "$token_value" ]] || die "Cloudflare token create returned no id/value"

  # S3 Secret Access Key = SHA-256 hex of the API token value (Cloudflare R2 docs).
  secret_key=$(printf '%s' "$token_value" | openssl dgst -sha256 -hex | awk '{print $NF}')

  R2_BLUEPRINT_CATALOG_BUCKET="$CATALOG_BUCKET_NAME"
  R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID="$token_id"
  R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY="$secret_key"
  export R2_BLUEPRINT_CATALOG_BUCKET R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY

  echo "→ Saving R2 catalog credentials to bws (if enabled)"
  bws_put R2_BLUEPRINT_CATALOG_BUCKET "$R2_BLUEPRINT_CATALOG_BUCKET"
  bws_put R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID "$R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID"
  bws_put R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY "$R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY"
}

ensure_r2_catalog_credentials() {
  if [[ -n "${R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID:-}" && -n "${R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY:-}" ]]; then
    R2_BLUEPRINT_CATALOG_BUCKET="${R2_BLUEPRINT_CATALOG_BUCKET:-$CATALOG_BUCKET_NAME}"
    export R2_BLUEPRINT_CATALOG_BUCKET
    if [[ "$R2_BLUEPRINT_CATALOG_BUCKET" != "$CATALOG_BUCKET_NAME" ]]; then
      echo "→ Updating R2_BLUEPRINT_CATALOG_BUCKET to match CATALOG_BUCKET_NAME"
      R2_BLUEPRINT_CATALOG_BUCKET="$CATALOG_BUCKET_NAME"
      export R2_BLUEPRINT_CATALOG_BUCKET
      bws_put R2_BLUEPRINT_CATALOG_BUCKET "$R2_BLUEPRINT_CATALOG_BUCKET"
    fi
    echo "→ R2 catalog credentials ok"
    return 0
  fi
  : "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
  : "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
  command -v openssl >/dev/null || die "Missing: openssl (needed for R2 catalog mint)"
  mint_r2_catalog_credentials
}

publish_catalog() {
  echo "→ GitHub Actions catalog secrets"
  printf '%s' "$R2_BLUEPRINT_CATALOG_BUCKET" | gh secret set R2_BLUEPRINT_CATALOG_BUCKET
  printf '%s' "$R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID" | gh secret set R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID
  printf '%s' "$R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY" | gh secret set R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY

  echo "→ Pulumi catalog config (${PULUMI_STACK})"
  cd "${ROOT}/infra/cloudflare"
  pulumi stack select "${PULUMI_STACK}" 2>/dev/null || pulumi stack init "${PULUMI_STACK}"
  pulumi config set catalogBucketName "$CATALOG_BUCKET_NAME"
  pulumi config set catalogDomain "$CATALOG_DOMAIN"
}

load_dotenv() {
  if [[ -f "${ROOT}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT}/.env"
    set +a
  fi
}

apply_catalog() {
  USE_BWS=0
  if [[ -n "${BWS_ACCESS_TOKEN:-}" && -n "${BWS_PROJECT_ID:-}" ]]; then
    USE_BWS=1
  fi
  ensure_r2_catalog_credentials
  publish_catalog
  echo "Catalog publish credentials stored for ${CATALOG_BUCKET_NAME} (${CATALOG_DOMAIN})."
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

if [[ "${SETUP_R2_CATALOG_PHASE:-}" == "apply" ]]; then
  apply_catalog
  exit 0
fi

load_dotenv
if [[ -n "${BWS_ACCESS_TOKEN:-}" && -n "${BWS_PROJECT_ID:-}" ]]; then
  exec bws run --project-id "$BWS_PROJECT_ID" -- \
    env BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN}" SETUP_R2_CATALOG_PHASE=apply \
    bash "$0"
fi

SETUP_R2_CATALOG_PHASE=apply bash "$0"
