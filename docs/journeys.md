# Interface tour & journeys

The interactive golden journey lives at **`/journeys`** in ArchLens Canvas.

## Golden journey estate

| Asset                             | Path                                                                    |
| --------------------------------- | ----------------------------------------------------------------------- |
| Estate context (group boundaries) | `samples/golden-journey/containers.yaml`                                |
| Checkout API components           | `samples/golden-journey/checkout-platform/checkout-api-components.yaml` |
| ChaosSpec                         | `chaos-specs/golden-journey-payment-gateway-outage.yaml`                |

The estate diagram places **Catalog**, **Identity**, **Checkout**, and **Billing** product groups in one context window. Checkout and Billing share an external **Payment Gateway** - the demo outage and AdviceLens circuit-breaker ranking.

Source of truth: `samples/golden-journey/`.

## Recording the demo GIF

```bash
mise install
brew install ttyd   # macOS only - VHS requires a terminal server
cd app && pnpm record:docs-media   # includes golden-journey.gif
```

Output: `docs/screenshots/golden-journey.gif`

## E2E coverage

Lean smoke suite (parallel workers in CI). Prefer unit tests for edge cases.

```bash
cd app/packages/canvas
pnpm test:e2e:bundled          # workspace UI, import-merge, DiffMenu, lenses, a11y smoke
pnpm test:e2e:remote-catalog   # ADR-0010 fixture consume (local mock, not live R2)
pnpm exec playwright test e2e-golden-journey.spec.ts
```

| Spec                            | Covers                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `e2e.spec.ts`                   | Startup chooser, panels + zoom, phone chrome                                        |
| `e2e-import-merge-diff.spec.ts` | Mermaid merge, DiffMenu revert/commit download, conflict keep-existing + idempotent |
| `e2e-collab-join.spec.ts`       | Share-link join: display name then connected count includes you                     |
| `e2e-remote-catalog.spec.ts`    | Publish→consume via fixture `latest/manifest.json` + snapshot                       |
| `e2e-golden-journey.spec.ts`    | Payment Gateway outage → AdviceLens circuit-breaker                                 |
| `e2e-chaoslens.spec.ts`         | Large-graph resilience simulation smoke                                             |
| `e2e-forensics.spec.ts`         | TraceLens offenders from a loaded estate                                            |
| `a11y.spec.ts`                  | axe smoke on docs home + sandbox workspace                                          |

## Other product demos

Individual lens GIFs remain on each product guide (canvas, CLI, TraceLens, ChaosLens). See [Setup](./setup.md#testing-formatting--quality-control).
