# ArchLens collab Worker

Durable Object room for Yjs share-links (`?room=`). Lives in the `app/` pnpm workspace like the CLI. It is **not** part of the Canvas Vite/Pages bundle.

| Environment                | How Canvas reaches rooms                       |
| -------------------------- | ---------------------------------------------- |
| Local `pnpm dev` (default) | BroadcastChannel (same-origin tabs only)       |
| Local with Worker          | `VITE_COLLAB_WS_URL=ws://127.0.0.1:8787`       |
| Production (`main` CI)     | `wss://collab.archlens.dev` baked into the SPA |

Hostname `collab.archlens.dev` is attached in Pulumi (`infra/cloudflare`). Script deploy is Wrangler (`pnpm --filter @archlens/collab run deploy` in CI on `main`).

## Local

From `app/`:

```bash
pnpm --filter @archlens/collab dev
```

Canvas:

```bash
VITE_COLLAB_WS_URL=ws://127.0.0.1:8787 pnpm dev
```

Then open two browsers to the same `/workspace?...&room=...` URL after turning **Live collaboration** on from **More actions → Feature flags**.

## Production

On `main`, CI deploys this Worker then (separately) attaches the custom domain via Pulumi. Custom domains need a deployed Worker version first: if Pulumi apply races ahead of `deploy-collab`, re-run **Pulumi Cloudflare** after the Worker job is green.

## Protocol

Binary frames: byte 0 is `0` (full state) or `1` (incremental update); the rest is a Yjs update.
