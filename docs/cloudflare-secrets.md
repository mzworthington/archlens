# Cloudflare hosting - secrets checklist

Fresh setup for [archlens.dev](https://archlens.dev) on Cloudflare Pages (Pulumi + Wrangler + GitHub Actions).

The **zone** is owned by [`edge-dns`](https://github.com/mzworthington/edge-dns) - see [dns.md](./dns.md). Shared CI/bootstrap tooling also lives there ([reusable Cloudflare CI](https://github.com/mzworthington/edge-dns/blob/main/docs/reusable-cloudflare-ci.md)). This repo keeps thin shims only.

## Bootstrap

```bash
export BWS_ACCESS_TOKEN="..."
export BWS_PROJECT_ID="..."

gh auth login
pulumi login

# Site identity is defaulted in the shim; BWS needs CLOUDFLARE_API_TOKEN (+ optional account/Pulumi/R2).
bin/setup-cloudflare-hosting.sh
```

The shim downloads [`scripts/setup-cloudflare-hosting.sh`](https://github.com/mzworthington/edge-dns/blob/main/scripts/setup-cloudflare-hosting.sh) from edge-dns (`EDGE_DNS_REF`, default `main`). Defaults: `DOMAIN=archlens.dev`, apex+www, Pages `archlens`, catalog bucket/domain.

The script will:

1. Validate **bws** secrets (resolve account/zone IDs from the Cloudflare API if missing)
2. Mint a **Pulumi access token** if missing or invalid
3. Reuse or mint **R2 catalog S3 credentials**, store in bws
4. Sync hosting + `R2_BLUEPRINT_CATALOG_*` secrets to **GitHub Actions**
5. Configure the **Pulumi** stack (does not run `preview` / `up`)

If automatic R2 token mint fails, create an R2 Object Read & Write token for the catalog bucket, put the three `R2_BLUEPRINT_CATALOG_*` values in bws, and re-run.

After bootstrap: `cd infra/cloudflare && pulumi up`, or merge to `main` (preview → **pulumi-prod** approval → `up`).

### Registrar nameservers (manual)

**Point your domain registrar's nameservers at Cloudflare.** The script prints the NS records when the zone is pending.

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
- Account → **Workers Scripts: Edit** (collab Worker deploy)
- Account → **Account Settings: Read** + **Edit** (Web Analytics)
- Zone → **Zone: Read**
- Zone → **DNS: Edit**
- Zone → **Workers Routes: Edit** (collab custom domain)
- Zone → **Zone Settings: Edit** (Observatory scheduled tests)

### Object storage (`@archlens/storage`)

Publish uses the shared storage port. Configure via env (all providers) or CLI flags.

| Key                                                     | Used by                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `OBJECT_STORAGE_PROVIDER`                               | `r2` (default), `s3`, or `azure`                                                        |
| `OBJECT_STORAGE_BUCKET` / `R2_BUCKET` / `AWS_S3_BUCKET` | Bucket or container name                                                                |
| `OBJECT_STORAGE_KEY_PREFIX`                             | Optional key prefix inside the bucket (samples estate: `estates/samples`; see ADR-0014) |
| `R2_ACCOUNT_ID` / `CLOUDFLARE_ACCOUNT_ID`               | R2 S3 endpoint account id                                                               |
| `R2_ACCESS_KEY_ID` / `AWS_ACCESS_KEY_ID`                | S3-compatible access key                                                                |
| `R2_SECRET_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY`        | S3-compatible secret key                                                                |
| `AWS_REGION`                                            | AWS S3 region (default `us-east-1`)                                                     |
| `AZURE_STORAGE_CONNECTION_STRING`                       | Azure Blob connection string                                                            |
| `AZURE_STORAGE_CONTAINER`                               | Azure container name                                                                    |

Legacy `R2_BLUEPRINT_CATALOG_*` GitHub secrets map to the same publish workflow.

### R2 catalog publish token (CI only)

Managed by the edge-dns bootstrap (via the local shim). Nightly publish uses:

| Key                                      | Used by                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `R2_BLUEPRINT_CATALOG_BUCKET`            | Nightly publish workflow (`CATALOG_BUCKET_NAME`) |
| `R2_BLUEPRINT_CATALOG_ACCESS_KEY_ID`     | S3-compatible upload                             |
| `R2_BLUEPRINT_CATALOG_SECRET_ACCESS_KEY` | S3-compatible upload                             |

`CLOUDFLARE_ACCOUNT_ID` is reused as `R2_ACCOUNT_ID` in the publish workflow.

## Deploy

Push to `main` — CI builds the Canvas SPA (`wrangler pages deploy`), deploys the collab Worker (`pnpm --filter @archlens/collab run deploy`), and bakes `VITE_COLLAB_WS_URL=wss://collab.archlens.dev` into the production bundle. Pulumi attaches `collab.archlens.dev` when `infra/cloudflare` changes (or on a manual **Pulumi Cloudflare** run).

Custom domains need a deployed Worker version first. If the first Pulumi apply fails on `WorkersCustomDomain`, wait for **deploy-collab** to finish and re-run Pulumi.

## Health check

```bash
curl -sI "https://archlens.dev/bundled-blueprints/catalog.json"
curl -sI "https://blueprints.archlens.dev/latest/manifest.json"
curl -sI "https://collab.archlens.dev/room/abcdefgh"
```

A plain GET to `/` on the collab hostname is `404`. A room path without a WebSocket upgrade is `426`. Either proves the Worker and custom domain are attached.
