# Setup & local development

## Prerequisites

- [Mise](https://mise.jdx.dev/) (installs Node and pnpm from `mise.toml`)
- Optional for docs media: `ffmpeg` (via mise), Playwright browsers

## Quick start

```bash
bin/setup-dev-env.sh
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## Quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Pre-commit (Husky + lint-staged) runs format, lint, and typecheck on staged changes.

## Cloudflare hosting

1. Create a Cloudflare API token (Pages Edit + Zone DNS Edit if using a custom domain).
2. Bootstrap secrets and Pulumi config:

   ```bash
   export BWS_ACCESS_TOKEN=...   # or set secrets directly in GitHub
   export BWS_PROJECT_ID=...
   DOMAIN=example.com WWW_DOMAIN=www.example.com \
   PAGES_PROJECT_NAME=my-app PULUMI_STACK=prod \
   bin/setup-cloudflare-hosting.sh
   ```

3. Apply infra: `cd infra/cloudflare && pulumi up` (or merge to `main` for CI).
4. Push to `main` — CI builds and runs `wrangler pages deploy`.

Without a custom domain, the site is available at `https://<PAGES_PROJECT_NAME>.pages.dev` after the first deploy.

## Derived outputs

Changelog, docs screenshots, and related artifacts:

```bash
bin/sync-derived.sh
```

CI runs the same steps weekly via **Refresh derived**.
