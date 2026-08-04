#!/usr/bin/env bash
# Bootstrap Cloudflare Pages + catalog publish secrets:
# validate bws secrets, mint Pulumi / R2 catalog credentials if needed,
# sync to GitHub Actions, configure the Pulumi stack.
# Does not run pulumi preview/up.
#
# Requires env (no product defaults):
#   BWS_ACCESS_TOKEN, BWS_PROJECT_ID
#   PULUMI_STACK
#   DOMAIN, WWW_DOMAIN, PAGES_PROJECT_NAME
#   CATALOG_BUCKET_NAME, CATALOG_DOMAIN
#
# bws project secrets: CLOUDFLARE_API_TOKEN
# optional in bws: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID, PULUMI_ACCESS_TOKEN,
#   R2_BLUEPRINT_CATALOG_BUCKET, R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID,
#   R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY
#
# Also requires: gh auth, pulumi login (to mint Pulumi token if missing)
#
# Usage:
#   DOMAIN=example.com WWW_DOMAIN=www.example.com \
#   PAGES_PROJECT_NAME=my-pages CATALOG_BUCKET_NAME=my-catalog \
#   CATALOG_DOMAIN=blueprints.example.com PULUMI_STACK=prod \
#   bin/setup-cloudflare-hosting.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${BWS_ACCESS_TOKEN:?Set BWS_ACCESS_TOKEN}"
: "${BWS_PROJECT_ID:?Set BWS_PROJECT_ID}"
: "${PULUMI_STACK:?Set PULUMI_STACK (Pulumi stack name)}"
: "${DOMAIN:?Set DOMAIN (apex hostname)}"
: "${WWW_DOMAIN:?Set WWW_DOMAIN}"
: "${PAGES_PROJECT_NAME:?Set PAGES_PROJECT_NAME}"
: "${CATALOG_BUCKET_NAME:?Set CATALOG_BUCKET_NAME}"
: "${CATALOG_DOMAIN:?Set CATALOG_DOMAIN}"

STACK="${PULUMI_STACK}"

for c in bws gh pulumi jq curl pnpm openssl; do
  command -v "$c" >/dev/null || { echo "Missing: $c"; exit 1; }
done
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

export ROOT DOMAIN STACK BWS_PROJECT_ID PAGES_PROJECT_NAME WWW_DOMAIN CATALOG_BUCKET_NAME CATALOG_DOMAIN
bws run --project-id "$BWS_PROJECT_ID" -- \
  env BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN}" \
  bash <<'EOF'
set -euo pipefail

die() { echo "✗ $*" >&2; exit 1; }

require_secret() {
  local name=$1
  [[ -n "${!name:-}" ]] || die "${name} not set — add it to bws project ${BWS_PROJECT_ID}"
}

bws_put() {
  local key=$1 val=$2 id
  : "${BWS_ACCESS_TOKEN:?Missing BWS_ACCESS_TOKEN in child shell}"
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

pulumi_token_valid() {
  [[ -n "${PULUMI_ACCESS_TOKEN:-}" ]] \
    && PULUMI_ACCESS_TOKEN="$PULUMI_ACCESS_TOKEN" pulumi whoami >/dev/null 2>&1
}

mint_pulumi_token() {
  echo "→ Creating Pulumi access token (pulumi login required)"
  local token
  token=$( ( unset PULUMI_ACCESS_TOKEN
    pulumi whoami >/dev/null 2>&1 || pulumi login
    pulumi api CreatePersonalToken -F description="cloudflare-hosting-ci-${DOMAIN}" -F expires=0 --output json
  ) | jq -r '.tokenValue // empty')
  [[ -n "$token" ]] || die "pulumi api CreatePersonalToken failed — run: pulumi login"
  PULUMI_ACCESS_TOKEN="$token"
  export PULUMI_ACCESS_TOKEN
  echo "→ Saving Pulumi token to bws"
  bws_put PULUMI_ACCESS_TOKEN "$PULUMI_ACCESS_TOKEN"
}

# Cloudflare platform permission group id (not account-specific).
# Workers R2 Storage Bucket Item Write — see Cloudflare API permission_groups docs.
R2_BUCKET_ITEM_WRITE_PERMISSION_GROUP_ID="2efd5506f9c8494dacb1fa10a3e7d5b6"

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
    cat >&2 <<HINT

Could not create an R2-scoped API token automatically.
Your CLOUDFLARE_API_TOKEN likely lacks "User API Tokens: Edit" (or Account API Tokens).

Create an R2 API token in the dashboard (Object Read & Write on bucket ${CATALOG_BUCKET_NAME}),
then store in bws and re-run:

  bws secret create R2_BLUEPRINT_CATALOG_BUCKET '${CATALOG_BUCKET_NAME}' '${BWS_PROJECT_ID}'
  bws secret create R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID '<access-key-id>' '${BWS_PROJECT_ID}'
  bws secret create R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY '<secret-access-key>' '${BWS_PROJECT_ID}'

HINT
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

  echo "→ Saving R2 catalog credentials to bws"
  bws_put R2_BLUEPRINT_CATALOG_BUCKET "$R2_BLUEPRINT_CATALOG_BUCKET"
  bws_put R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID "$R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID"
  bws_put R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY "$R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY"
}

ensure_r2_catalog_credentials() {
  if [[ -n "${R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID:-}" && -n "${R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY:-}" ]]; then
    R2_BLUEPRINT_CATALOG_BUCKET="${R2_BLUEPRINT_CATALOG_BUCKET:-$CATALOG_BUCKET_NAME}"
    export R2_BLUEPRINT_CATALOG_BUCKET
    if [[ "$R2_BLUEPRINT_CATALOG_BUCKET" != "$CATALOG_BUCKET_NAME" ]]; then
      echo "→ Updating R2_BLUEPRINT_CATALOG_BUCKET in bws to match CATALOG_BUCKET_NAME"
      R2_BLUEPRINT_CATALOG_BUCKET="$CATALOG_BUCKET_NAME"
      export R2_BLUEPRINT_CATALOG_BUCKET
      bws_put R2_BLUEPRINT_CATALOG_BUCKET "$R2_BLUEPRINT_CATALOG_BUCKET"
    fi
    echo "→ R2 catalog credentials ok (from bws)"
    return 0
  fi
  mint_r2_catalog_credentials
}

echo "→ Checking bws secrets"
require_secret CLOUDFLARE_API_TOKEN
echo "  CLOUDFLARE_API_TOKEN ok (${#CLOUDFLARE_API_TOKEN} chars)"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  accounts_json=$(cf_api "https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50")
  account_count=$(jq -r '.result | length // 0' <<<"$accounts_json")
  if [[ "$account_count" == "1" ]]; then
    CLOUDFLARE_ACCOUNT_ID=$(jq -r '.result[0].id // empty' <<<"$accounts_json")
    [[ -n "$CLOUDFLARE_ACCOUNT_ID" ]] && bws_put CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
  elif [[ "$account_count" == "0" ]]; then
    die "No Cloudflare accounts visible to CLOUDFLARE_API_TOKEN — set CLOUDFLARE_ACCOUNT_ID in bws"
  else
    echo "Multiple Cloudflare accounts visible; set CLOUDFLARE_ACCOUNT_ID in bws:" >&2
    jq -r '.result[] | "  \(.id)  \(.name)"' <<<"$accounts_json" >&2
    die "CLOUDFLARE_ACCOUNT_ID required when more than one account is visible"
  fi
fi
require_secret CLOUDFLARE_ACCOUNT_ID

echo "→ Zone ${DOMAIN}"
if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  CLOUDFLARE_ZONE_ID=$(cf_api "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
    | jq -r '.result[0].id // empty')
  [[ -n "$CLOUDFLARE_ZONE_ID" ]] && bws_put CLOUDFLARE_ZONE_ID "$CLOUDFLARE_ZONE_ID"
fi
require_secret CLOUDFLARE_ZONE_ID

ZONE_STATUS=$(cf_api "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}" \
  | jq -r '.result.status // empty')
if [[ "$ZONE_STATUS" != "active" ]]; then
  echo "  Zone status: ${ZONE_STATUS} (need active — update registrar nameservers if pending)"
  cf_api "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}" \
    | jq -r '.result.name_servers[]?' | sed 's/^/  NS: /'
  die "Zone not active yet — fix nameservers and re-run"
fi

if [[ -z "${PULUMI_ACCESS_TOKEN:-}" ]]; then
  mint_pulumi_token
elif pulumi_token_valid; then
  echo "→ Pulumi access token ok (from bws)"
else
  echo "→ Pulumi access token in bws is invalid — minting a new one"
  mint_pulumi_token
fi

ensure_r2_catalog_credentials

echo "→ GitHub Actions secrets"
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID
printf '%s' "$CLOUDFLARE_ZONE_ID" | gh secret set CLOUDFLARE_ZONE_ID
printf '%s' "$PULUMI_ACCESS_TOKEN" | gh secret set PULUMI_ACCESS_TOKEN
printf '%s' "$R2_BLUEPRINT_CATALOG_BUCKET" | gh secret set R2_BLUEPRINT_CATALOG_BUCKET
printf '%s' "$R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID" | gh secret set R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID
printf '%s' "$R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY" | gh secret set R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY

echo "→ Pulumi stack ${STACK}"
cd "${ROOT}/infra/cloudflare"
pnpm install --frozen-lockfile
pulumi stack select "${STACK}" 2>/dev/null || pulumi stack init "${STACK}"
pulumi config set accountId "$CLOUDFLARE_ACCOUNT_ID"
pulumi config set zoneId "$CLOUDFLARE_ZONE_ID"
pulumi config set pagesProjectName "$PAGES_PROJECT_NAME"
pulumi config set apexDomain "$DOMAIN"
pulumi config set wwwDomain "$WWW_DOMAIN"
pulumi config set catalogBucketName "$CATALOG_BUCKET_NAME"
pulumi config set catalogDomain "$CATALOG_DOMAIN"
pulumi config set --secret cloudflare:apiToken "$CLOUDFLARE_API_TOKEN"

echo "→ Custom domain routing"
DOMAIN_HEADERS=$(curl -sSI "https://${DOMAIN}/" 2>/dev/null | tr -d '\r' || true)
if echo "$DOMAIN_HEADERS" | grep -qi 'x-github-request-id'; then
  echo "  ⚠ ${DOMAIN} still serves from GitHub Pages"
  echo "    Fix DNS in Cloudflare (apex/www CNAME → Pages subdomain), then: cd infra/cloudflare && pulumi up"
elif echo "$DOMAIN_HEADERS" | grep -qi '^HTTP/.* 404'; then
  echo "  ⚠ ${DOMAIN} returns 404 — run pulumi up and confirm Pages custom domain + DNS"
elif echo "$DOMAIN_HEADERS" | grep -qi '^HTTP/.* 200'; then
  echo "  ${DOMAIN} ok (Cloudflare Pages)"
else
  echo "  Could not verify ${DOMAIN} (check DNS / Pages custom domain)"
fi

SANDBOX_CHECK=$(curl -sSI "https://${DOMAIN}/bundled-blueprints/catalog.json" 2>/dev/null | tr -d '\r' || true)
if echo "$SANDBOX_CHECK" | grep -qi '^HTTP/.* 200'; then
  echo "  Sandbox catalog ok at /bundled-blueprints/catalog.json"
elif echo "$SANDBOX_CHECK" | grep -qi 'x-github-request-id'; then
  echo "  Sandbox assets missing — domain still on GitHub Pages (see above)"
else
  echo "  Sandbox catalog not reachable yet — confirm latest CI deploy finished"
fi

echo "Done. Run 'cd infra/cloudflare && pulumi up' or merge to main (CI runs pulumi + deploy)."
echo "Then run the Publish blueprint catalog workflow (or wait for nightly)."
EOF
