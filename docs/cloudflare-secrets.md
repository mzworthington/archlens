# Cloudflare hosting — secrets checklist

Fresh setup for [archlens.dev](https://archlens.dev) on Cloudflare Pages (Pulumi + Wrangler + GitHub Actions).

## Bootstrap

```bash
export BWS_ACCESS_TOKEN="..."   # bws service account
export BWS_PROJECT_ID="..."     # bws project list

gh auth login                   # once
pulumi login                    # once (needed to mint PULUMI_ACCESS_TOKEN if missing)

# Add CLOUDFLARE_API_TOKEN to bws (see token scopes below)
DOMAIN=archlens.dev \
WWW_DOMAIN=www.archlens.dev \
PAGES_PROJECT_NAME=archlens \
CATALOG_BUCKET_NAME=archlens-blueprint-catalog \
CATALOG_DOMAIN=blueprints.archlens.dev \
PULUMI_STACK=prod \
./bin/setup-cloudflare-hosting.sh
```

The script will:

1. Validate **bws** secrets (resolve account/zone IDs from the Cloudflare API if missing; refuses to guess when multiple accounts exist)
2. Mint a **Pulumi access token** via `pulumi api CreatePersonalToken` if missing or invalid
3. Reuse or mint **R2 catalog S3 credentials** (bucket-scoped), store in bws
4. Sync hosting + `R2_BLUEPRINT_CATALOG_*` secrets to **GitHub Actions**
5. Configure the **Pulumi** stack (`pulumi config set` — does not run `preview` or `up`)

If automatic R2 token mint fails (API token lacks User/Account API Tokens permission), create an R2 Object Read & Write token for `CATALOG_BUCKET_NAME` in the dashboard, put the three `R2_BLUEPRINT_CATALOG_*` values in bws, and re-run.

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
- Account → **R2: Edit** (Pulumi bucket + custom domain)
- Zone → **Zone: Read**
- Zone → **DNS: Edit**

### Object storage (`@archlens/storage`)

Publish uses the shared storage port. Configure via env (all providers) or CLI flags.

| Key                                                     | Used by                                                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `OBJECT_STORAGE_PROVIDER`                               | `r2` (default), `s3`, or `azure`                                                                                              |
| `OBJECT_STORAGE_BUCKET` / `R2_BUCKET` / `AWS_S3_BUCKET` | Bucket or container name                                                                                                      |
| `OBJECT_STORAGE_KEY_PREFIX`                             | Optional key prefix inside the bucket (dogfood: `estates/archlens`, `estates/samples`, or `estates/demos/{id}`; see ADR-0014) |
| `R2_ACCOUNT_ID` / `CLOUDFLARE_ACCOUNT_ID`               | R2 S3 endpoint account id                                                                                                     |
| `R2_ACCESS_KEY_ID` / `AWS_ACCESS_KEY_ID`                | S3-compatible access key                                                                                                      |
| `R2_SECRET_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY`        | S3-compatible secret key                                                                                                      |
| `AWS_REGION`                                            | AWS S3 region (default `us-east-1`)                                                                                           |
| `AZURE_STORAGE_CONNECTION_STRING`                       | Azure Blob connection string                                                                                                  |
| `AZURE_STORAGE_CONTAINER`                               | Azure container name                                                                                                          |

Legacy `R2_BLUEPRINT_CATALOG_*` GitHub secrets map to the same publish workflow. The workflow installs `archlens` from the latest GitHub release (not from monorepo source); cut a CLI release that includes `archlens publish` before the first successful nightly run.

### R2 catalog publish token (CI only)

Managed by `bin/setup-cloudflare-hosting.sh` (reuse from bws, or mint / prompt). Nightly publish uses:

| Key                                      | Used by                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `R2_BLUEPRINT_CATALOG_BUCKET`            | Nightly publish workflow (`CATALOG_BUCKET_NAME`) |
| `R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID`     | S3-compatible upload                             |
| `R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY` | S3-compatible upload                             |

`CLOUDFLARE_ACCOUNT_ID` is reused as `R2_ACCOUNT_ID` in the publish workflow.

## Deploy

Push to `main` — CI builds and `wrangler pages deploy` publishes.

## Health check

```bash
curl -sI "https://${DOMAIN}/bundled-blueprints/catalog.json"   # bundled fallback (HTTP 200)
curl -sI "https://${CATALOG_DOMAIN}/latest/manifest.json"     # remote catalog pointer
```

If the apex still serves GitHub Pages (`x-github-request-id` header), update apex/`www` DNS in Cloudflare to CNAME → your `*.pages.dev` subdomain, then `cd infra/cloudflare && pulumi up`.
