# Cloudflare hosting — secrets checklist

Fresh setup for [archlens.dev](https://archlens.dev) on Cloudflare Pages (Pulumi + Wrangler + GitHub Actions).

## Bootstrap

```bash
export BWS_ACCESS_TOKEN="..."   # bws service account
export BWS_PROJECT_ID="..."     # bws project list

gh auth login                   # once
pulumi login                    # once (needed to mint PULUMI_ACCESS_TOKEN if missing)

# Add CLOUDFLARE_API_TOKEN to bws (see token scopes below)
bin/setup-cloudflare-hosting.sh
```

The script will:

1. Validate **bws** secrets (resolve account/zone IDs from the Cloudflare API if missing)
2. Mint a **Pulumi access token** via `pulumi api CreatePersonalToken` if missing or invalid
3. Sync secrets to **GitHub Actions**
4. Configure the **Pulumi** stack (`pulumi config set` — does not run `preview` or `up`)

After bootstrap, apply infra locally (`cd infra/cloudflare && pulumi up`) or merge to `main` for CI.

### Registrar nameservers (manual)

**Point your domain registrar's nameservers at Cloudflare.** The script prints the NS records when the zone is pending. Update NS at your registrar, then re-run the script.

## Secrets

| Key                     | Used by                                                  |
| ----------------------- | -------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | GitHub Actions (wrangler) + Pulumi                       |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions + Pulumi (auto-resolved if missing)       |
| `CLOUDFLARE_ZONE_ID`    | GitHub Actions + Pulumi (auto-resolved if missing)       |
| `PULUMI_ACCESS_TOKEN`   | GitHub Actions (pulumi workflow; auto-minted if missing) |

## Cloudflare API token

Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) and store in bws as `CLOUDFLARE_API_TOKEN`.

### Scopes

- Account → **Cloudflare Pages: Edit**
- Zone → **Zone: Read**
- Zone → **DNS: Edit**

## Deploy

Push to `main` — CI builds and `wrangler pages deploy` publishes.

## Cutover checklist (fix sandbox 404s)

If the app loads but `/bundled-blueprints/*` returns 404, the custom domain is probably still on **GitHub Pages**:

```bash
curl -sI https://archlens.dev/ | grep -i x-github-request-id   # should be empty
curl -sI https://archlens.dev/bundled-blueprints/catalog.json  # should be HTTP 200
```

1. **GitHub repo → Settings → Pages** — remove `archlens.dev` custom domain; disable GitHub Pages
2. **`cd infra/cloudflare && pulumi up`** — attaches apex + `www` to the Cloudflare Pages project
3. **Cloudflare DNS** — apex/`www` should point at Pages (Pulumi `PagesDomain` + active zone)
4. Re-test `https://archlens.dev/bundled-blueprints/catalog.json` (200) before relying on sandbox

Until cutover completes, the Cloudflare deploy URL (e.g. `archlens-ek7.pages.dev`) serves the full build including sandbox assets.

## Optional env overrides

```bash
DOMAIN=example.com PULUMI_STACK=prod bin/setup-cloudflare-hosting.sh
```
