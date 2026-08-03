# Cloudflare infrastructure (Pulumi)

Pages project + custom domains for [archlens.dev](https://archlens.dev). The SPA is built in CI and deployed with `wrangler pages deploy`.

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

## Stack config

`Pulumi.prod.yaml` is **gitignored** — it may contain account IDs and an encrypted Cloudflare API token after bootstrap. Committed template: `Pulumi.prod.yaml.example`. CI reads stack config from **Pulumi Cloud** via `PULUMI_ACCESS_TOKEN`.

## Related files

| Path | Purpose |
|------|---------|
| `wrangler.toml` | Pages project name + output directory |
| `app/packages/designer/public/_redirects` | SPA routing |
| `.github/workflows/pulumi-cloudflare.yml` | Pulumi on PR / main |
| `.github/workflows/ci.yml` | Build + wrangler deploy |
| `Pulumi.prod.yaml.example` | Committed stack defaults (local `Pulumi.prod.yaml` is gitignored) |
| `bin/setup-cloudflare-hosting.sh` | Bootstrap: bws → gh + pulumi config |
