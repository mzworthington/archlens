#!/usr/bin/env bash
# Bootstrap Cloudflare Pages secrets + Pulumi stack config.
# Validates bws secrets (optional), syncs to GitHub Actions, configures Pulumi.
# Does not run pulumi preview/up.
#
# Requires env:
#   PULUMI_STACK, DOMAIN, WWW_DOMAIN, PAGES_PROJECT_NAME
# Optional bws:
#   BWS_ACCESS_TOKEN, BWS_PROJECT_ID
#   (if unset, reads CLOUDFLARE_* / PULUMI_ACCESS_TOKEN from the environment)
#
# Usage:
#   DOMAIN=example.com WWW_DOMAIN=www.example.com \
#   PAGES_PROJECT_NAME=my-app PULUMI_STACK=prod \
#   bin/setup-cloudflare-hosting.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${PULUMI_STACK:?Set PULUMI_STACK (Pulumi stack name)}"
: "${DOMAIN:?Set DOMAIN (apex hostname)}"
: "${WWW_DOMAIN:?Set WWW_DOMAIN}"
: "${PAGES_PROJECT_NAME:?Set PAGES_PROJECT_NAME}"

STACK="${PULUMI_STACK}"

for c in gh pulumi jq curl pnpm; do
  command -v "$c" >/dev/null || { echo "Missing: $c"; exit 1; }
done
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

USE_BWS=0
if [[ -n "${BWS_ACCESS_TOKEN:-}" && -n "${BWS_PROJECT_ID:-}" ]]; then
  command -v bws >/dev/null || { echo "Missing: bws (or unset BWS_* to use env secrets)"; exit 1; }
  USE_BWS=1
fi

run_body() {
set -euo pipefail

die() { echo "✗ $*" >&2; exit 1; }

require_secret() {
  local name=$1
  [[ -n "${!name:-}" ]] || die "${name} not set"
}

bws_put() {
  local key=$1 val=$2 id
  [[ "$USE_BWS" == "1" ]] || return 0
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
  echo "→ Saving Pulumi token"
  bws_put PULUMI_ACCESS_TOKEN "$PULUMI_ACCESS_TOKEN"
}

echo "→ Checking secrets"
require_secret CLOUDFLARE_API_TOKEN
echo "  CLOUDFLARE_API_TOKEN ok (${#CLOUDFLARE_API_TOKEN} chars)"

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  accounts_json=$(cf_api "https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50")
  account_count=$(jq -r '.result | length // 0' <<<"$accounts_json")
  if [[ "$account_count" == "1" ]]; then
    CLOUDFLARE_ACCOUNT_ID=$(jq -r '.result[0].id // empty' <<<"$accounts_json")
    [[ -n "$CLOUDFLARE_ACCOUNT_ID" ]] && bws_put CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
  elif [[ "$account_count" == "0" ]]; then
    die "No Cloudflare accounts visible — set CLOUDFLARE_ACCOUNT_ID"
  else
    echo "Multiple Cloudflare accounts; set CLOUDFLARE_ACCOUNT_ID:" >&2
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
  echo "→ Pulumi access token ok"
else
  echo "→ Pulumi access token invalid — minting a new one"
  mint_pulumi_token
fi

echo "→ GitHub Actions secrets + vars"
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID
printf '%s' "$CLOUDFLARE_ZONE_ID" | gh secret set CLOUDFLARE_ZONE_ID
printf '%s' "$PULUMI_ACCESS_TOKEN" | gh secret set PULUMI_ACCESS_TOKEN
gh variable set PULUMI_PAGES_PROJECT_NAME --body "$PAGES_PROJECT_NAME"
gh variable set PULUMI_APEX_DOMAIN --body "$DOMAIN"
gh variable set PULUMI_WWW_DOMAIN --body "$WWW_DOMAIN"

echo "→ Pulumi stack ${STACK}"
cd "${ROOT}/infra/cloudflare"
pnpm install --frozen-lockfile
pulumi stack select "${STACK}" 2>/dev/null || pulumi stack init "${STACK}"
pulumi config set accountId "$CLOUDFLARE_ACCOUNT_ID"
pulumi config set zoneId "$CLOUDFLARE_ZONE_ID"
pulumi config set pagesProjectName "$PAGES_PROJECT_NAME"
pulumi config set apexDomain "$DOMAIN"
pulumi config set wwwDomain "$WWW_DOMAIN"
pulumi config set --secret cloudflare:apiToken "$CLOUDFLARE_API_TOKEN"

echo "Done. Run 'cd infra/cloudflare && pulumi up' or merge to main (CI runs pulumi + deploy)."
echo "Site will also be available at https://${PAGES_PROJECT_NAME}.pages.dev after first Pages deploy."
}

export ROOT DOMAIN STACK WWW_DOMAIN PAGES_PROJECT_NAME USE_BWS
export BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN:-}" BWS_PROJECT_ID="${BWS_PROJECT_ID:-}"

if [[ "$USE_BWS" == "1" ]]; then
  export DOMAIN STACK BWS_PROJECT_ID PAGES_PROJECT_NAME WWW_DOMAIN USE_BWS
  bws run --project-id "$BWS_PROJECT_ID" -- \
    env BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN}" USE_BWS=1 \
    bash -c "$(declare -f run_body); run_body"
else
  run_body
fi
