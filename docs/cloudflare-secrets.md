# Cloudflare hosting — secrets checklist

## Bootstrap

```bash
# Optional: Bitwarden Secrets Manager
export BWS_ACCESS_TOKEN="..."
export BWS_PROJECT_ID="..."

gh auth login
pulumi login

# Put CLOUDFLARE_API_TOKEN in bws, or export it in the shell
DOMAIN=example.com \
WWW_DOMAIN=www.example.com \
PAGES_PROJECT_NAME=my-app \
PULUMI_STACK=prod \
./bin/setup-cloudflare-hosting.sh
```

Then `cd infra/cloudflare && pulumi up`, or merge to `main` for CI.

### Registrar nameservers (custom domain only)

Point your domain's nameservers at Cloudflare when the zone is pending. `*.pages.dev` works without this step.

## Secrets / vars

| Key                         | Kind     | Used by              |
| --------------------------- | -------- | -------------------- |
| `CLOUDFLARE_API_TOKEN`      | secret   | Wrangler + Pulumi    |
| `CLOUDFLARE_ACCOUNT_ID`     | secret   | Wrangler + Pulumi    |
| `CLOUDFLARE_ZONE_ID`        | secret   | Pulumi DNS / domains |
| `PULUMI_ACCESS_TOKEN`       | secret   | Pulumi workflow      |
| `PULUMI_PAGES_PROJECT_NAME` | variable | Deploy + Pulumi      |
| `PULUMI_APEX_DOMAIN`        | variable | Pulumi               |
| `PULUMI_WWW_DOMAIN`         | variable | Pulumi               |

## API token scopes

- Account → **Cloudflare Pages: Edit**
- Zone → **Zone: Read**
- Zone → **DNS: Edit** (custom domains)
