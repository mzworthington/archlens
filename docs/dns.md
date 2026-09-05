# DNS and Cloudflare zone ownership

The **Cloudflare zone** for product domains (for example `archlens.dev`) is managed in [`mzworthington/edge-dns`](https://github.com/mzworthington/edge-dns) (Pulumi stack named after the domain).

This repo continues to own:

- Cloudflare Pages project
- DNS records for product hostnames (apex, `www`, catalog subdomain, collab Worker, …)
- Pages custom domains, R2, collab `WorkersCustomDomain` and deploy pipelines

Do **not** create Cloudflare zones from this repository. If you need a new zone, add it in `edge-dns` first, then point product Pulumi at the existing `zoneId`.
