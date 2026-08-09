# Cloudflare infrastructure (Pulumi)

Pages project, custom domains, and DNS for [archlens.dev](https://archlens.dev). The SPA is built in CI and deployed with `wrangler pages deploy`.

## Resources

| Resource | Purpose |
|----------|---------|
| `PagesProject` | Direct-upload project (`archlens`) |
| `DnsRecord` (`apex-pages`, `www-pages`) | Proxied CNAMEs → `pagesProject.subdomain` |
| `PagesDomain` | Attaches apex + `www` to the Pages project (SSL / hostname binding) |
| `WebAnalyticsSite` | Zone RUM / Web Analytics (`autoInstall`) |
| `ObservatoryScheduledTest` | Synthetic Speed test for the apex hostname |
| `R2Bucket` | Published blueprint catalog corpus (`archlens-blueprint-catalog`) |
| `R2BucketCors` | Browser GET/HEAD from `archlens.dev` and local dev |
| `R2CustomDomain` | Public read at `blueprints.archlens.dev` |

If Web Analytics or Observatory was enabled in the dashboard first, import before `pulumi up`:

```bash
pulumi import 'cloudflare:index/webAnalyticsSite:WebAnalyticsSite' web-analytics '<account_id>/<site_id>'
pulumi import 'cloudflare:index/observatoryScheduledTest:ObservatoryScheduledTest' observatory-apex '<zone_id>/<url>'
```

Catalog objects follow ADR-0010 under `estates/samples/` for the hosted samples estate (ADR-0014): hand-authored samples, ArchLens scan, and batch demos each publish a fragment with a distinct `productId`, then compose. Production Canvas uses `https://blueprints.archlens.dev/estates/samples/`.

## Quick setup

See [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md), then from the repo root:

```bash
export BWS_ACCESS_TOKEN=... BWS_PROJECT_ID=...
bin/setup-cloudflare-hosting.sh
```

Then apply infrastructure:

```bash
cd infra/cloudflare
pulumi up
```

Or merge to `main` - `.github/workflows/pulumi-cloudflare.yml` calls the reusable edge-dns workflow (preview → **pulumi-prod** approval → `up`).

**Manual gate:** GitHub → Settings → Environments → create **`pulumi-prod`** with **Required reviewers**.

**Manual run:** GitHub → Actions → **Pulumi Cloudflare** → Run workflow.

## Local Pulumi commands

```bash
cd infra/cloudflare
pnpm install
pulumi stack select prod
pulumi preview
pulumi up
```

## Token permissions

`CLOUDFLARE_API_TOKEN` needs Pages, R2, DNS, Account Settings (Read + Edit), and Zone Settings Edit. Full list: [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md).

## Stack config

`Pulumi.prod.yaml` is **gitignored** - it may contain account IDs and an encrypted Cloudflare API token after bootstrap. Committed template: `Pulumi.prod.yaml.example`. CI configures the stack from **GitHub Actions secrets** on each run (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`).

## Related files

| Path | Purpose |
|------|---------|
| `wrangler.toml` | Pages project name + output directory |
| `app/packages/canvas/public/_redirects` | SPA routing |
| `.github/workflows/pulumi-cloudflare.yml` | Thin caller → edge-dns reusable workflow |
| `.github/workflows/ci.yml` | Build + wrangler deploy; manual `workflow_dispatch` on `main` |
| `.github/workflows/publish-blueprint-catalog.yml` | Scan → fragment → compose `estates/samples/` (product `archlens`) |
| `.github/workflows/publish-demo-catalog.yml` | Matrix demos → fragment; one final compose `estates/samples/` |
| `.github/workflows/publish-samples.yml` | `samples/` → fragment → compose `estates/samples/` |
| `.github/workflows/compose-catalog.yml` | Hourly safety-net compose for `estates/samples/` |
| `.github/actions/setup-archlens-cli` | Install CLI from GitHub Releases for catalog workflows |

Workflow index (all triggers): [docs/guide/ci-workflows.md](../../docs/guide/ci-workflows.md).

| `Pulumi.prod.yaml.example` | Committed stack defaults (local `Pulumi.prod.yaml` is gitignored) |
| `bin/setup-cloudflare-hosting.sh` | Thin shim → edge-dns bootstrap (bws → gh + pulumi config) |
