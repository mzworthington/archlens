# AdviceLens

**AdviceLens** ranks what to change. It merges **TraceLens** code-health signals with **ChaosLens** failure simulation into an ordered list: what to fix first and why.

AdviceLens **Core** is deterministic. Priority and evidence come from simulation and forensics, not a chatbot. Optional **Narration** (Phase 5) can enrich detail text with LLM-generated fixes grounded on that evidence, without changing rank order.

## The lens family

| Lens       | Question                                       |
| ---------- | ---------------------------------------------- |
| TraceLens  | Where is the code fragile, coupled, or siloed? |
| ChaosLens  | What fails and how far does damage spread?     |
| AdviceLens | What should we fix first, and why?             |

TraceLens and ChaosLens **observe**. AdviceLens **prescribes** - it turns their signals into comparable recommendations with evidence.

## Where to see AdviceLens

AdviceLens is **cross-surface** - it prescribes fixes wherever TraceLens and ChaosLens observe signals. The canonical studio entry is **`/workspace?lens=advicelens`**, which opens the **AdviceLens** tab on the TraceLens estate page.

| Surface           | Location                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **AdviceLens**    | `/workspace?lens=advicelens` - **TraceLens** estate page, **AdviceLens** tab                 |
| **TraceLens**     | `/workspace?lens=tracelens` - **TraceLens** estate page, **TraceLens** tab (worst offenders) |
| **Refactor plan** | Slide-over on an offender → AdviceLens list for that boundary                                |
| **ChaosLens**     | Workspace **Resilience** mode → telemetry panel advice list                                  |
| **CLI**           | `archlens resilience <path>` - headless estate sweep                                         |

Product docs: [AdviceLens engine](../advicelens-engine.md) (contributors).

## What you get

Each recommendation includes:

| Field       | Meaning                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `kind`      | Action type (e.g. `add-circuit-breaker`, `reduce-composite-risk`, `refactor-split-by-container`) |
| `priority`  | 0-100 urgency score (higher = more urgent)                                                       |
| `source`    | Signal provenance: `chaoslens` or `tracelens`                                                    |
| `evidence`  | Structured backing (blast radius, hotspot score, composite risk, applicability scope, etc.)      |
| `actions`   | Optional UI actions (e.g. enable circuit breaker on canvas)                                      |
| `narration` | Optional AI-enriched detail (Phase 5; `provider: 'adviceLens'`)                                  |

Recommendations are **display-only** by default - they are not written into BlueprintSpec.

## In TraceLens

1. Open **`/workspace?lens=advicelens`**, or **`/workspace?lens=tracelens`** and switch to the **AdviceLens** tab on the **TraceLens** estate page.
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

From a directory of BlueprintSpec files:

```bash
archlens resilience ./blueprints
archlens resilience ./blueprints --format=json --output=.archlens/advicelens-report.json --min-sla=95
archlens resilience ./blueprints --format=yaml --output=advicelens-report.yaml
archlens resilience ./blueprints --chaos-specs=./chaos-specs
```

Output header: **AdviceLens estate report** - diagram count, worst SLA, SPOF totals, and top ranked recommendations with evidence.

Structured output is a versioned artifact (`kind: advicelens-estate-report`) with plain-object heat maps. **CI uses JSON**; the studio **Copy YAML** / **Download** defaults to YAML (same fields).

Gate flags:

| Flag                        | Default | Effect                                                         |
| --------------------------- | ------- | -------------------------------------------------------------- |
| `--min-sla=<percent>`       | `100`   | Exit `1` when `summary.worstOverallSla` is below the threshold |
| `--fail-on-recommendations` | off     | Also exit `1` when any recommendation is emitted               |
| `--format=text\|json\|yaml` | `text`  | Human summary, or structured JSON/YAML artifact                |
| `--output=<file>`           | unset   | Write the structured artifact to disk (CI-friendly)            |

Optional [ChaosSpec](./chaos-spec.md) files in `chaos-specs/*.yaml` extend the default scenario set (region outage sweep, high fan-in latency probes, publisher faults).

## CI guardrails

Use the composite action [`.github/actions/advicelens-gate`](../../.github/actions/advicelens-gate) to upload the AdviceLens artifact and fail PRs when SLA drops below your threshold. See the [AdviceLens gate workflow example](../../.github/workflows/advicelens-gate.yml.example).

## Export from the studio

On **TraceLens → AdviceLens**, use **Copy YAML** or **Download** (`advicelens-report.yaml`) for RFCs and PR attachments. Same artifact shape as `archlens resilience --format=yaml` (CI gates still prefer `--format=json`).

## Applicability matrix

AdviceLens distinguishes **where signals are observed** from **where actions belong**. Resilience safeguards are **application-runtime** concerns (outbound clients, consumer logic, retries) - not IaC or shared infrastructure provisioning.

**Who can receive advice:** owned services, apps, and workers - never C4 persons/product personas, and never third-party vendors (safeguards apply on **your** outbound clients instead).

**External nodes:** `external: true` means a workspace proxy (another diagram in your estate). Add `properties.classification: third-party` for vendors/SaaS outside your control. Canvas shows `(Workspace)` vs `(Third-party)` badges.

| Diagram level | Estate chaos simulation | Resilience safeguards (`add-circuit-breaker`, timeouts, staleness) | TraceLens composite risk |
| ------------- | ----------------------- | ------------------------------------------------------------------ | ------------------------ |
| `context`     | Yes                     | On **calling** services, APIs, and workers (not on brokers/DBs)    | Yes                      |
| `container`   | Yes                     | On **calling** services, APIs, and workers                         | Yes                      |
| `component`   | No                      | No - forensics/refactor only; rolls up to container                | Rolled up to `entityRef` |
| `code`        | No                      | No - forensics/refactor only; rolls up to container                | Rolled up to `entityRef` |

**SPOF handling:** shared dependencies (databases, brokers) are still detected, but `add-circuit-breaker` targets **callers** - add isolation in the calling service's outbound client, not on the shared resource or its Terraform module. Third-party dependencies (`classification: third-party`) use caller-side wording and `dependencyOwnership: third-party` in evidence. IaC-imported nodes (`iac.address` / `iac.kind` properties) are never safeguard targets. Evidence includes `simulation.dependencyEntityRef` and `evidence.applicabilityScope` for the shared dependency.

Core helpers: `isResilienceAdviceTarget()`, `isAdviceActionable()`, `isThirdPartyDependency()`, `isEstateResilienceDiagramLevel()`, `resolveAdviceApplicability()` in `@archlens/core/recommendations`. Ownership helpers: `isHumanActorNode()`, `resolveExternalNodeKind()` in `@archlens/core`.

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
| **Narration** | `narrateRecommendations()` - optional LLM detail  | Optional; never re-ranks |

Narration attaches `narration.citations` (evidence keys the model must ground on). Ranking always uses Core output.

## Related guides

- [TraceLens](./tracelens.md) - forensics signals that feed composite risk
- [ChaosLens](./chaoslens.md) - simulation that feeds blast radius and SPOFs
- [ArchLens CLI](./cli.md) - scanning and `archlens resilience`
