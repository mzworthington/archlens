# Cloudflare infrastructure (Pulumi)

Pages project, custom domains, and DNS for [archlens.dev](https://archlens.dev). The SPA is built in CI and deployed with `wrangler pages deploy`.

## Resources

| Resource | Purpose |
|----------|---------|
| `PagesProject` | Direct-upload project (`archlens`) |
| `DnsRecord` (`apex-pages`, `www-pages`) | Proxied CNAMEs → `pagesProject.subdomain` |
| `PagesDomain` | Attaches apex + `www` to the Pages project (SSL / hostname binding) |
| `R2Bucket` | Published blueprint catalog corpus (`archlens-blueprint-catalog`) |
| `R2BucketCors` | Browser GET/HEAD from `archlens.dev` and local dev |
| `R2CustomDomain` | Public read at `blueprints.archlens.dev` |

Catalog objects follow ADR-0010 under `estates/samples/` for the hosted samples estate (ADR-0014): hand-authored samples, ArchLens scan, and batch demos each publish a fragment with a distinct `productId`, then compose. Production Canvas uses `https://blueprints.archlens.dev/estates/samples/`.

## Quick setup

See [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md), then from the repo root:

```bash
export BWS_ACCESS_TOKEN=...
export BWS_PROJECT_ID=...
DOMAIN=… WWW_DOMAIN=… PAGES_PROJECT_NAME=… \
CATALOG_BUCKET_NAME=… CATALOG_DOMAIN=… PULUMI_STACK=prod \
bin/setup-cloudflare-hosting.sh
```

(No hard-coded product defaults — see [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md).)

Then apply infrastructure:

```bash
cd infra/cloudflare
pulumi up
```

Or merge to `main` — `.github/workflows/pulumi-cloudflare.yml` runs **preview** (rich `--diff` in the Actions log + job summary), prints the **Pulumi Cloud** dashboard URL, then waits for a **pulumi-prod** environment approval before `pulumi up`.

**Manual gate:** GitHub → Settings → Environments → create **`pulumi-prod`** with **Required reviewers**. Without reviewers the apply job still runs after preview (no pause).

**Manual run:** GitHub → Actions → **Pulumi Cloudflare** → Run workflow → leave **apply** checked to preview then wait for approval and `up` (uncheck for preview-only).

## Local Pulumi commands

```bash
cd infra/cloudflare
pnpm install
pulumi stack select prod
pulumi preview
pulumi up
```

## Token permissions

`CLOUDFLARE_API_TOKEN` needs **Account → Cloudflare Pages: Edit** and **Zone → DNS: Edit**. Full scope list: [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md).

## Stack config

`Pulumi.prod.yaml` is **gitignored** — it may contain account IDs and an encrypted Cloudflare API token after bootstrap. Committed template: `Pulumi.prod.yaml.example`. CI configures the stack from **GitHub Actions secrets** on each run (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`).

## Related files

| Path | Purpose |
|------|---------|
| `wrangler.toml` | Pages project name + output directory |
| `app/packages/canvas/public/_redirects` | SPA routing |
| `.github/workflows/pulumi-cloudflare.yml` | Preview on PR/main; gated `up` via `pulumi-prod` |
| `.github/actions/setup-pulumi-cloudflare` | Shared Node/pnpm + stack config for that workflow |
| `.github/workflows/ci.yml` | Build + wrangler deploy; manual `workflow_dispatch` on `main` |
| `.github/workflows/publish-blueprint-catalog.yml` | Scan → fragment → compose `estates/samples/` (product `archlens`) |
| `.github/workflows/publish-demo-catalog.yml` | Matrix demos → fragment; one final compose `estates/samples/` |
| `.github/workflows/publish-samples.yml` | `samples/` → fragment → compose `estates/samples/` |
| `.github/workflows/compose-catalog.yml` | Hourly safety-net compose for `estates/samples/` |
| `.github/actions/setup-archlens-cli` | Install CLI from GitHub Releases for catalog workflows |

Workflow index (all triggers): [docs/guide/ci-workflows.md](../../docs/guide/ci-workflows.md).

| `Pulumi.prod.yaml.example` | Committed stack defaults (local `Pulumi.prod.yaml` is gitignored) |
| `bin/setup-cloudflare-hosting.sh` | Bootstrap: bws → gh + pulumi config |
