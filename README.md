# react-cloudflare-template

GitHub template for a **React + TypeScript + Tailwind** app on **Cloudflare Pages**, with CI, changelog, docs media, Lighthouse, and Pulumi.

Use this repository as a [GitHub Template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) (Settings → Template repository), or:

```bash
gh repo create my-app --template mzworthington/react-cloudflare-template --public --clone
cd my-app
```

## What's included

| Area         | Details                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| App          | Vite 8, React 19, TypeScript 7, Tailwind 4 (no custom theme)                                   |
| Docs         | Markdown under `docs/`, rendered in-app                                                        |
| Quality      | Prettier, oxlint, Vitest, knip, Husky, CodeQL                                                  |
| Changelog    | git-cliff + day-bucketed `bin/changelog-render.mjs`                                            |
| Derived sync | Weekly workflow: changelog + docs screenshots                                                  |
| Lighthouse   | Separate weekly workflow + report artifact                                                     |
| Hosting      | Pulumi (Pages + optional custom domain) + Wrangler deploy                                      |
| Agents       | Thin `AGENTS.md` → [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit) |

## Nothing → live site

1. **Create from template** and clone.
2. **Local app**

   ```bash
   bin/setup-dev-env.sh
   pnpm dev
   ```

3. **Rename the Pages project** in `wrangler.toml` (and plan your `PAGES_PROJECT_NAME`).
4. **Bootstrap Cloudflare** (API token with Pages Edit; Zone DNS Edit if using a custom domain):

   ```bash
   # With Bitwarden Secrets Manager:
   export BWS_ACCESS_TOKEN=... BWS_PROJECT_ID=...
   # Or export CLOUDFLARE_API_TOKEN (and optionally ACCOUNT_ID / ZONE_ID) directly.

   DOMAIN=example.com WWW_DOMAIN=www.example.com \
   PAGES_PROJECT_NAME=my-app PULUMI_STACK=prod \
   bin/setup-cloudflare-hosting.sh
   ```

5. **Apply infra** — `cd infra/cloudflare && pulumi up`, or merge to `main` and approve the **pulumi-prod** GitHub Environment.
6. **Deploy** — push to `main`; CI builds and runs `wrangler pages deploy`.
7. Open `https://<PAGES_PROJECT_NAME>.pages.dev` (custom domain after DNS/NS are active).

See [docs/setup.md](docs/setup.md) for details.

## Scripts

| Command                    | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `pnpm dev`                 | Dev server                                  |
| `pnpm test` / `pnpm build` | Unit tests / production build               |
| `pnpm test:lighthouse`     | Lighthouse CI (after build)                 |
| `pnpm record:docs-media`   | Capture docs screenshots                    |
| `bin/sync-derived.sh`      | Changelog + docs media; commit when changed |

## Styling policy

Tailwind is wired via `@tailwindcss/vite`. The starter UI is intentionally unstyled beyond document structure — add your own utilities or design system in the generated project.
