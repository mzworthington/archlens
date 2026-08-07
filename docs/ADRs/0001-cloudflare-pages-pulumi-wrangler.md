---
status: Accepted
date: 2026-08-07
deciders: ['template maintainers']
---

# 0001. Cloudflare Pages static hosting with Pulumi and Wrangler

## Context and Problem Statement

The template should take a new project from empty clone to a deployed site with infrastructure defined in git.

## Decision Drivers

- Reproducible deploy and DNS from the repository
- Minimal moving parts: one Vite production build
- Remote encrypted Pulumi state

## Considered Options

- Option A — GitHub Pages only
- Option B — Cloudflare Pages via dashboard Git integration
- Option C — Pulumi for Pages/domains + GitHub Actions + Wrangler upload

## Decision Outcome

Chosen option: "**Option C**". Pulumi manages the Pages project and optional custom domains; CI builds `dist/` and runs `wrangler pages deploy`. SPA routing uses `public/_redirects`.

### Consequences

- Good, because deploy stays behind quality gates
- Good, because `*.pages.dev` works before custom DNS is ready
- Bad, because registrar nameserver changes remain a one-time manual step for custom domains
