# AdviceLens

**AdviceLens** is ArchLens’s evidence-backed recommendation layer. It merges **TraceLens** code-health signals with **ChaosLens** failure simulation into a **ranked action list**—what to fix first, and why.

Unlike a generic “AI insights” panel, AdviceLens **Core** is fully deterministic: priority and evidence come from structured simulation and forensics. Optional **Narration** (Phase 5) can enrich detail text with LLM-generated fixes grounded on that evidence—without changing rank order.

## The lens family

| Lens       | Question                                       |
| ---------- | ---------------------------------------------- |
| TraceLens  | Where is the code fragile, coupled, or siloed? |
| ChaosLens  | What fails and how far does damage spread?     |
| AdviceLens | What should we fix first, and why?             |

TraceLens and ChaosLens **observe**. AdviceLens **prescribes**—synthesizing their signals into comparable recommendations with evidence.

## Where to see AdviceLens

AdviceLens is **cross-surface** — it prescribes fixes wherever TraceLens and ChaosLens observe signals. The canonical studio entry is **`/advicelens`**, which opens TraceLens on the estate recommendations tab (`/tracelens?view=recommendations`).

| Surface           | Location                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| **AdviceLens**    | `/advicelens` or `/tracelens?view=recommendations` — estate-wide ranked list |
| **TraceLens**     | `/tracelens` → **AdviceLens** tab — same estate recommendations view         |
| **Refactor plan** | Slide-over on an offender → AdviceLens list for that boundary                |
| **ChaosLens**     | Workspace **Resilience** mode → telemetry panel advice list                  |
| **CLI**           | `archlens resilience <path>` — headless estate sweep                         |

Product docs: [AdviceLens engine](../advicelens-engine.md) (contributors).

## What you get

Each recommendation includes:

| Field       | Meaning                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `kind`      | Action type (e.g. `add-circuit-breaker`, `reduce-composite-risk`, `refactor-split-by-container`) |
| `priority`  | 0–100 urgency score (higher = more urgent)                                                       |
| `source`    | Signal provenance: `chaoslens` or `tracelens`                                                    |
| `evidence`  | Structured backing (blast radius, hotspot score, composite risk, applicability scope, etc.)      |
| `actions`   | Optional UI actions (e.g. enable circuit breaker on canvas)                                      |
| `narration` | Optional AI-enriched detail (Phase 5; `provider: 'adviceLens'`)                                  |

Recommendations are **display-only** by default—they are not written into BlueprintSpec YAML.

## In TraceLens

1. Open **`/advicelens`** or **`/tracelens?view=recommendations`**, or open **`/tracelens`** and switch to the **AdviceLens** tab.
2. Load blueprints (sandbox or folder workspace).
3. Filter by source (ChaosLens / TraceLens / all) or search by target name.
4. Click a row to open the refactor slide-over with evidence.

The list combines estate resilience simulation (worst-case scenarios per diagram) with refactor-boundary recommendations where forensics data is available.

## In ChaosLens

1. Open **`/workspace`**, load a diagram, toggle **Resilience**.
2. Select a node, configure a fault, click **Simulate**.
3. The right telemetry panel shows **AdviceLens** recommendations for the active simulation.

Signal badges still show **ChaosLens** or **TraceLens** (where the underlying signal came from).

## Headless estate sweep (CLI)

From a directory of blueprint YAML files:

```bash
archlens resilience ./blueprints
archlens resilience ./blueprints --format=json
archlens resilience ./blueprints --chaos-specs=./chaos-specs
```

Output header: **AdviceLens estate report** — diagram count, worst SLA, SPOF totals, and top ranked recommendations with evidence.

Optional chaos specs in `chaos-specs/*.yaml` extend the default scenario set (region outage sweep, high fan-in latency probes, publisher faults).

## Applicability matrix

AdviceLens distinguishes **where signals are observed** from **where actions belong**. Real architecture reviews rarely prescribe circuit breakers on source-file nodes.

| Diagram level | Estate chaos simulation | Resilience safeguards (`add-circuit-breaker`, timeouts, staleness) | TraceLens composite risk |
| ------------- | ----------------------- | ------------------------------------------------------------------ | ------------------------ |
| `context`     | Yes                     | On runtime nodes (services, data stores, brokers)                  | Yes                      |
| `container`   | Yes                     | On runtime nodes                                                   | Yes                      |
| `component`   | No                      | No — forensics/refactor only                                       | Rolled up to `entityRef` |
| `code`        | No                      | No — forensics/refactor only                                       | Rolled up to `entityRef` |

**SPOF handling:** shared dependencies are still detected, but `add-circuit-breaker` targets **callers** (outbound isolation), not the shared callee. Evidence includes `simulation.dependencyEntityRef` and `evidence.applicabilityScope` for the shared dependency.

Core helpers: `isResilienceAdviceTarget()`, `isEstateResilienceDiagramLevel()`, `resolveAdviceApplicability()` in `@archlens/core/recommendations`.

## Signal → recommendation mapping

| Signal combination                  | Recommendation kind                                             |
| ----------------------------------- | --------------------------------------------------------------- |
| SPOF + no circuit breaker           | `add-circuit-breaker` (on **callers** of the shared dependency) |
| Blast heat ≥ 0.7                    | `review-timeouts-fallbacks`                                     |
| Pub-sub integrity heat              | `handle-event-staleness`                                        |
| Integrity without availability loss | `verify-integrity-handling`                                     |
| High hotspot × high blast           | `reduce-composite-risk`                                         |
| High coupling + cross-container     | `refactor-split-by-container`, `refactor-define-api-boundary`   |
| Knowledge silo / solo ownership     | `refactor-add-second-owner`                                     |

## AdviceLens Core vs Narration

| Layer         | Role                                              | CI-safe?                 |
| ------------- | ------------------------------------------------- | ------------------------ |
| **Core**      | `buildRecommendations()`, `runEstateResilience()` | Yes                      |
| **Narration** | `narrateRecommendations()` — optional LLM detail  | Optional; never re-ranks |

Narration attaches `narration.citations` (evidence keys the model must ground on). Ranking always uses Core output.

## Related guides

- [TraceLens](./tracelens.md) — forensics signals that feed composite risk
- [ChaosLens](./chaoslens.md) — simulation that feeds blast radius and SPOFs
- [ArchLens CLI](./cli.md) — scanning and `archlens resilience`
