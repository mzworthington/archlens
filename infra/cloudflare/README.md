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

## Quick setup

See [docs/cloudflare-secrets.md](../../docs/cloudflare-secrets.md), then from the repo root:

```bash
export BWS_ACCESS_TOKEN=...
export BWS_PROJECT_ID=...
bin/setup-cloudflare-hosting.sh
```

Then apply infrastructure:

```bash
cd infra/cloudflare
pulumi up
```

Or merge to `main` — `.github/workflows/pulumi-cloudflare.yml` runs Pulumi on CI.

**Manual run:** GitHub → Actions → **Pulumi Cloudflare** → Run workflow → choose `up` or `preview`.

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
| `app/packages/designer/public/_redirects` | SPA routing |
| `.github/workflows/pulumi-cloudflare.yml` | Pulumi on PR / main; manual `workflow_dispatch` |
| `.github/workflows/ci.yml` | Build + wrangler deploy; manual `workflow_dispatch` on `main` |
| `.github/workflows/publish-blueprint-catalog.yml` | Nightly `archlens publish` to R2 (CLI from latest GitHub release) |
| `Pulumi.prod.yaml.example` | Committed stack defaults (local `Pulumi.prod.yaml` is gitignored) |
| `bin/setup-cloudflare-hosting.sh` | Bootstrap: bws → gh + pulumi config |
