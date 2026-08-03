#!/usr/bin/env bash
# Bootstrap Cloudflare Pages hosting: validate bws secrets, mint Pulumi token if needed,
# sync to GitHub Actions, configure the Pulumi stack. Does not run pulumi preview/up.
#
# Requires: BWS_ACCESS_TOKEN, BWS_PROJECT_ID, gh auth, pulumi login (to mint token if missing)
# bws project secrets: CLOUDFLARE_API_TOKEN (+ optional CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID, PULUMI_ACCESS_TOKEN)
#
# Usage: bin/setup-cloudflare-hosting.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${DOMAIN:-archlens.dev}"
STACK="${PULUMI_STACK:-prod}"

: "${BWS_ACCESS_TOKEN:?Set BWS_ACCESS_TOKEN}"
: "${BWS_PROJECT_ID:?Set BWS_PROJECT_ID}"

for c in bws gh pulumi jq curl pnpm; do
  command -v "$c" >/dev/null || { echo "Missing: $c"; exit 1; }
done
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

export ROOT DOMAIN STACK BWS_PROJECT_ID
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
    bws -t "$BWS_ACCESS_TOKEN" secret edit --key "$key" --value "$val" "$id"
  else
    bws -t "$BWS_ACCESS_TOKEN" secret create "$key" "$val" "$BWS_PROJECT_ID"
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
    pulumi api CreatePersonalToken -F description="archlens-ci" -F expires=0 --output json
  ) | jq -r '.tokenValue // empty')
  [[ -n "$token" ]] || die "pulumi api CreatePersonalToken failed — run: pulumi login"
  PULUMI_ACCESS_TOKEN="$token"
  export PULUMI_ACCESS_TOKEN
  echo "→ Saving Pulumi token to bws"
  bws_put PULUMI_ACCESS_TOKEN "$PULUMI_ACCESS_TOKEN"
}

echo "→ Checking bws secrets"
require_secret CLOUDFLARE_API_TOKEN
echo "  CLOUDFLARE_API_TOKEN ok (${#CLOUDFLARE_API_TOKEN} chars)"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  CLOUDFLARE_ACCOUNT_ID=$(cf_api "https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1" \
    | jq -r '.result[0].id // empty')
  [[ -n "$CLOUDFLARE_ACCOUNT_ID" ]] && bws_put CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
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

echo "→ GitHub Actions secrets"
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID
printf '%s' "$PULUMI_ACCESS_TOKEN" | gh secret set PULUMI_ACCESS_TOKEN

echo "→ Pulumi stack ${STACK}"
cd "${ROOT}/infra/cloudflare"
pnpm install --frozen-lockfile
pulumi stack select "${STACK}" 2>/dev/null || pulumi stack init "${STACK}"
pulumi config set accountId "$CLOUDFLARE_ACCOUNT_ID"
pulumi config set zoneId "$CLOUDFLARE_ZONE_ID"
pulumi config set --secret cloudflare:apiToken "$CLOUDFLARE_API_TOKEN"

echo "Done. Run 'cd infra/cloudflare && pulumi up' or merge to main (CI runs pulumi + deploy)."
EOF
