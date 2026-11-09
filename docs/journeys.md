# Interface tour and journeys

The interactive golden journey lives at `/journeys` in ArchLens Canvas.

## Golden journey estate

| Asset                            | Path                                                                    |
| -------------------------------- | ----------------------------------------------------------------------- |
| Estate context, group boundaries | `samples/golden-journey/containers.yaml`                                |
| Checkout API components          | `samples/golden-journey/checkout-platform/checkout-api-components.yaml` |
| ChaosSpec                        | `chaos-specs/golden-journey-payment-gateway-outage.yaml`                |

The estate diagram places **Catalog**, **Identity**, **Checkout**, and **Billing** product groups in one context window. Checkout and Billing share an external **Payment Gateway**. That shared gateway is the demo outage and the AdviceLens circuit-breaker ranking.

Source of truth: `samples/golden-journey/`.

## Recording the demo

The recording is a Graphics Interchange Format (GIF).

```bash
mise install
brew install ttyd   # macOS only. VHS requires a terminal server.
cd app && pnpm record:docs-media   # includes golden-journey.gif
```

Output: `docs/screenshots/golden-journey.gif`.

## End-to-end coverage

Lean smoke suite, with parallel workers in CI. Prefer unit tests for edge cases.

```bash
cd app/packages/canvas
pnpm test:e2e:bundled          # workspace UI, import-merge, DiffMenu, lenses, a11y smoke
pnpm test:e2e:remote-catalog   # ADR-0010 fixture consume. Local mock, not live R2.
pnpm exec playwright test e2e-golden-journey.spec.ts
```

| Spec                            | Covers                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `e2e.spec.ts`                   | Startup chooser, panels and zoom, and phone chrome                                                               |
| `e2e-import-merge-diff.spec.ts` | Mermaid merge, DiffMenu revert and commit download, and conflict keep-existing plus idempotent                   |
| `e2e-collab-join.spec.ts`       | Share-link join. Display name, then the connected count includes you.                                            |
| `e2e-collab-cursors.spec.ts`    | Five guests join. The host Canvas shows named cursors. Writes `9-collab-cursors.png` when `RECORD_DOCS_MEDIA=1`. |
| `e2e-remote-catalog.spec.ts`    | Publish, then consume, via fixture `latest/manifest.json` and a snapshot                                         |
| `e2e-golden-journey.spec.ts`    | Payment Gateway outage, then the AdviceLens circuit-breaker                                                      |
| `e2e-chaoslens.spec.ts`         | Large-graph resilience simulation smoke                                                                          |
| `e2e-forensics.spec.ts`         | TraceLens offenders from a loaded estate                                                                         |
| `a11y.spec.ts`                  | axe smoke on the docs home and the sandbox workspace                                                             |

## Other product demos

Individual lens recordings stay on each product guide: Canvas, the CLI, TraceLens, and ChaosLens. See [Setup](./setup.md#testing-formatting--quality-control).
