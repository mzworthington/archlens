# Interface tour & journeys

The interactive golden journey lives at **`/journeys`** in ArchLens Canvas.

## Golden journey estate

| Asset                             | Path                                                                    |
| --------------------------------- | ----------------------------------------------------------------------- |
| Estate context (group boundaries) | `samples/golden-journey/containers.yaml`                                |
| Checkout API components           | `samples/golden-journey/checkout-platform/checkout-api-components.yaml` |
| ChaosSpec                         | `chaos-specs/golden-journey-payment-gateway-outage.yaml`                |

The estate diagram places **Catalog**, **Identity**, **Checkout**, and **Billing** product groups in one context window. Checkout and Billing share an external **Payment Gateway** — the demo outage and AdviceLens circuit-breaker ranking.

Source of truth: `samples/golden-journey/`.

## Recording the demo GIF

```bash
mise install
brew install ttyd   # macOS only — VHS requires a terminal server
cd app && pnpm record:docs-media   # includes golden-journey.gif
```

Output: `docs/screenshots/golden-journey.gif`

## E2E coverage

```bash
cd app/packages/canvas
pnpm test:e2e:bundled          # sandbox UI, import-merge, DiffMenu, golden journey, …
pnpm test:e2e:remote-catalog   # ADR-0010 fixture consume (local mock, not live R2)
pnpm exec playwright test e2e-golden-journey.spec.ts
```

Deepened journeys (no File System Access):

| Spec                            | Covers                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `e2e-import-merge-diff.spec.ts` | Mermaid merge apply, conflicts, Pending Changes / revert / sandbox commit download |
| `e2e-sandbox-catalog.spec.ts`   | Bundled catalog navigation between estates                                         |
| `e2e-remote-catalog.spec.ts`    | Publish→consume via fixture `latest/manifest.json` + snapshot                      |

## Other product demos

Individual lens GIFs remain on each product guide (canvas, CLI, TraceLens, ChaosLens). See [Setup](./setup.md#testing-formatting--quality-control).
