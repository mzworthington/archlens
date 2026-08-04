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
- Account → **R2: Edit** (Pulumi bucket + custom domain)
- Zone → **Zone: Read**
- Zone → **DNS: Edit**

### Object storage (`@archlens/storage`)

Publish uses the shared storage port. Configure via env (all providers) or CLI flags.

| Key                                                     | Used by                               |
| ------------------------------------------------------- | ------------------------------------- |
| `OBJECT_STORAGE_PROVIDER`                               | `r2` (default), `s3`, or `azure`      |
| `OBJECT_STORAGE_BUCKET` / `R2_BUCKET` / `AWS_S3_BUCKET` | Bucket or container name              |
| `OBJECT_STORAGE_KEY_PREFIX`                             | Optional key prefix inside the bucket |
| `R2_ACCOUNT_ID` / `CLOUDFLARE_ACCOUNT_ID`               | R2 S3 endpoint account id             |
| `R2_ACCESS_KEY_ID` / `AWS_ACCESS_KEY_ID`                | S3-compatible access key              |
| `R2_SECRET_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY`        | S3-compatible secret key              |
| `AWS_REGION`                                            | AWS S3 region (default `us-east-1`)   |
| `AZURE_STORAGE_CONNECTION_STRING`                       | Azure Blob connection string          |
| `AZURE_STORAGE_CONTAINER`                               | Azure container name                  |

Legacy `R2_BLUEPRINT_CATALOG_*` GitHub secrets map to the same publish workflow. The workflow installs `archlens` from the latest GitHub release (not from monorepo source); cut a CLI release that includes `archlens publish` before the first successful nightly run.

### R2 catalog publish token (CI only)

Create an **R2 API token** with Object Read & Write on `archlens-blueprint-catalog` only. Store in bws / GitHub Actions:

| Key                                      | Used by                                                 |
| ---------------------------------------- | ------------------------------------------------------- |
| `R2_BLUEPRINT_CATALOG_BUCKET`            | Nightly publish workflow (`archlens-blueprint-catalog`) |
| `R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID`     | S3-compatible upload                                    |
| `R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY` | S3-compatible upload                                    |

`CLOUDFLARE_ACCOUNT_ID` is reused as `R2_ACCOUNT_ID` in the publish workflow.

## Deploy

Push to `main` — CI builds and `wrangler pages deploy` publishes.

## Health check

```bash
curl -sI https://archlens.dev/bundled-blueprints/catalog.json  # bundled fallback (HTTP 200)
curl -sI https://blueprints.archlens.dev/latest/manifest.json  # remote catalog pointer
```

If the apex still serves GitHub Pages (`x-github-request-id` header), update apex/`www` DNS in Cloudflare to CNAME → your `*.pages.dev` subdomain, then `cd infra/cloudflare && pulumi up`.

## Optional env overrides

```bash
DOMAIN=example.com PULUMI_STACK=prod bin/setup-cloudflare-hosting.sh
```
