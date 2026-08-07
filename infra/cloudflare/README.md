# Cloudflare infrastructure (Pulumi)

Pages project + optional apex/`www` custom domains. The SPA is built in CI and deployed with `wrangler pages deploy`.

## Quick setup

See [docs/setup.md](../../docs/setup.md), then:

```bash
DOMAIN=example.com WWW_DOMAIN=www.example.com \
PAGES_PROJECT_NAME=my-app PULUMI_STACK=prod \
../../bin/setup-cloudflare-hosting.sh

pulumi up
```

Or merge to `main` — `.github/workflows/pulumi-cloudflare.yml` previews, then waits for **pulumi-prod** environment approval before `pulumi up`.

## Related

| Path                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `wrangler.toml`            | Pages project name + `dist` output |
| `public/_redirects`        | SPA routing                        |
| `.github/workflows/ci.yml` | Build + wrangler deploy            |
