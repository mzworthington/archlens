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

## E2E smoke

```bash
cd app/packages/canvas && pnpm exec playwright test e2e-golden-journey.spec.ts
```

## Other product demos

Individual lens GIFs remain on each product guide (canvas, CLI, TraceLens, ChaosLens). See [Setup](./setup.md#testing-formatting--quality-control).
