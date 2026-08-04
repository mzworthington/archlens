# Cloudflare infrastructure (Pulumi)

Pages project, custom domains, and DNS for [archlens.dev](https://archlens.dev). The SPA is built in CI and deployed with `wrangler pages deploy`.

## Resources

| Resource | Purpose |
|----------|---------|
| `PagesProject` | Direct-upload project (`archlens`) |
| `DnsRecord` (`apex-pages`, `www-pages`) | Proxied CNAMEs → `pagesProject.subdomain` (apex uses CNAME flattening) |
| `PagesDomain` | Attaches apex + `www` to the Pages project (SSL / hostname binding) |

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

## Local Pulumi commands

```bash
cd infra/cloudflare
pnpm install
pulumi stack select prod
pulumi preview
pulumi up
```

## First apply with existing DNS

Pulumi creates apex/`www` CNAMEs. If the zone already has those names (common after GitHub Pages), either:

1. **Delete** the conflicting records in Cloudflare DNS, then `pulumi up`, or
2. **Import** them into the stack (record id from the Cloudflare DNS UI or API):

```bash
pulumi import 'cloudflare:index/dnsRecord:DnsRecord' apex-pages "<zoneId>/<recordId>"
pulumi import 'cloudflare:index/dnsRecord:DnsRecord' www-pages "<zoneId>/<recordId>"
pulumi up   # updates content to the Pages subdomain if needed
```

## Stack config

`Pulumi.prod.yaml` is **gitignored** — it may contain account IDs and an encrypted Cloudflare API token after bootstrap. Committed template: `Pulumi.prod.yaml.example`. CI configures the stack from **GitHub Actions secrets** on each run (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`).

## Related files

| Path | Purpose |
|------|---------|
| `wrangler.toml` | Pages project name + output directory |
| `app/packages/designer/public/_redirects` | SPA routing |
| `.github/workflows/pulumi-cloudflare.yml` | Pulumi on PR / main |
| `.github/workflows/ci.yml` | Build + wrangler deploy |
| `Pulumi.prod.yaml.example` | Committed stack defaults (local `Pulumi.prod.yaml` is gitignored) |
| `bin/setup-cloudflare-hosting.sh` | Bootstrap: bws → gh + pulumi config |
