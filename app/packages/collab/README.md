# ArchLens collab Worker

Durable Object room for Yjs share-links (`?room=`). Lives in the `app/` pnpm workspace like the CLI. It is **not** part of the Canvas Vite/Pages bundle: run Wrangler separately, and talk to it from the SPA when `VITE_COLLAB_WS_URL` is set. Same-origin tabs still use BroadcastChannel.

## Local

From `app/`:

```bash
pnpm --filter @archlens/collab dev
```

Canvas:

```bash
VITE_COLLAB_WS_URL=ws://127.0.0.1:8787 pnpm dev
```

Then open two browsers to the same `/workspace?...&room=...` URL (with `feature-collaboration=true`).

## Protocol

Binary frames: byte 0 is `0` (full state) or `1` (incremental update); the rest is a Yjs update.
