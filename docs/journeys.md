# Interface tour & journeys

The interactive golden journey lives at **`/journeys`** in the designer app.

## Golden journey estate

| Asset                             | Path                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| Estate context (group boundaries) | `blueprints/golden-journey/containers.yaml`                                |
| Checkout API components           | `blueprints/golden-journey/checkout-platform/checkout-api-components.yaml` |
| ChaosSpec                         | `chaos-specs/golden-journey-payment-gateway-outage.yaml`                   |

The estate diagram places **Catalog**, **Identity**, **Checkout**, and **Billing** product groups in one context window. Checkout and Billing share an external **Payment Gateway** — the golden-path outage and AdviceLens circuit-breaker ranking.

Source copies for sandbox merge: `scripts/sandbox-blueprints/golden-journey/`.

## Recording the demo GIF

```bash
mise install
brew install ttyd   # macOS only — VHS requires a terminal server
cd app && pnpm record:docs-media   # includes golden-journey.gif
```

Output: `docs/screenshots/golden-journey.gif`

## E2E smoke

```bash
cd app/packages/designer && pnpm exec playwright test e2e-golden-journey.spec.ts
```

## Other product demos

Individual lens GIFs remain on each product guide (canvas, CLI, TraceLens, ChaosLens). See [Setup](./setup.md#testing-formatting--quality-control).
