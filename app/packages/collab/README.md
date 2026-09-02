# ArchLens collab Worker

Durable Object room for Yjs share-links (`?room=`). Lives in the `app/` pnpm workspace like the CLI. It is **not** part of the Canvas Vite/Pages bundle.

| Environment                | How Canvas reaches rooms                       |
| -------------------------- | ---------------------------------------------- |
| Local `pnpm dev` (default) | BroadcastChannel (same-origin tabs only)       |
| Local with Worker          | `VITE_COLLAB_WS_URL=ws://127.0.0.1:8787`       |
| Production (`main` CI)     | `wss://collab.archlens.dev` baked into the SPA |

Hostname `collab.archlens.dev` is attached in Pulumi (`infra/cloudflare`). Script deploy is Wrangler (`wrangler deploy --var GIT_SHA:<sha>` in CI on `main`). `GET /health` returns `{ ok, sha }` for deploy smoke.

## Local

From `app/`:

```bash
pnpm --filter @archlens/collab dev
```

Canvas:

```bash
VITE_COLLAB_WS_URL=ws://127.0.0.1:8787 pnpm dev
```

Then open two browsers to the same `/workspace?...&room=...` URL. A valid `?room=` turns Live collaboration on in that browser.

## Production

On `main`, CI deploys this Worker then (separately) attaches the custom domain via Pulumi. Custom domains need a deployed Worker version first: if Pulumi apply races ahead of `deploy-collab`, re-run **Pulumi Cloudflare** after the Worker job is green.

## Protocol

Binary frames: byte 0 is `0` (full state), `1` (incremental update), `2` (awareness), or `3` (awareness query); the rest is the payload. Awareness frames are forwarded to peers and **not** persisted on the Durable Object.

Canvas clients reconnect with backoff after unexpected socket closes, and also on `online` / tab-visible signals (important on mobile when the OS suspends WebSockets). On each open they re-send full Yjs state plus awareness so peers converge after a flap.
