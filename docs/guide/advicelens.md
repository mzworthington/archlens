# AdviceLens

**AdviceLens** ranks what to change. It merges **TraceLens** code-health signals with **ChaosLens** failure simulation into an ordered list of what to fix first, and why.

AdviceLens **Core** is deterministic. Priority and evidence come from simulation and forensics, not a chatbot. Optional **Narration**, Phase 5, can enrich detail text with large language model fixes grounded on that evidence, without changing rank order.

## The lens family

| Lens       | Question                                      |
| ---------- | --------------------------------------------- |
| TraceLens  | Where's the code fragile, coupled, or siloed? |
| ChaosLens  | What fails, and how far does damage spread?   |
| AdviceLens | What should a team fix first, and why?        |

TraceLens and ChaosLens **observe**. AdviceLens **prescribes**. It turns their signals into comparable recommendations with evidence.

## Where to see AdviceLens

AdviceLens is **cross-surface**. It prescribes fixes wherever TraceLens and ChaosLens observe signals. The canonical studio entry is **`/workspace?lens=advicelens`**, which opens the **AdviceLens** tab on the TraceLens estate page.

| Surface           | Location                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **AdviceLens**    | `/workspace?lens=advicelens` on the **TraceLens** estate page, **AdviceLens** tab                |
| **TraceLens**     | `/workspace?lens=tracelens` on the **TraceLens** estate page, **TraceLens** tab, worst offenders |
| **Refactor plan** | Slide-over on an offender, then the AdviceLens list for that boundary                            |
| **ChaosLens**     | Workspace **Resilience** mode, then the telemetry panel advice list                              |
| **CLI**           | `archlens resilience <path>` for a headless estate sweep                                         |

Contributor docs: [AdviceLens engine](../advicelens-engine.md).

## What you get

Each recommendation includes these fields.

| Field       | Meaning                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `kind`      | Action type, for example `add-circuit-breaker`, `reduce-composite-risk`, or `refactor-split-by-container` |
| `priority`  | Urgency score from 0 to 100. A higher score is more urgent.                                               |
| `source`    | Signal provenance, `chaoslens` or `tracelens`                                                             |
| `evidence`  | Structured backing such as blast radius, hotspot score, composite risk, and applicability scope           |
| `actions`   | Optional UI actions, for example enabling a circuit breaker in Canvas                                     |
| `narration` | Optional AI-enriched detail for Phase 5, with `provider: 'adviceLens'`                                    |

Recommendations are **display-only** by default. They aren't written into BlueprintSpec.

## In TraceLens

1. Open **`/workspace?lens=advicelens`**, or open **`/workspace?lens=tracelens`** and switch to the **AdviceLens** tab on the **TraceLens** estate page.
2. Load blueprints from the sandbox or a folder workspace.
3. Filter by source, ChaosLens, TraceLens, or all, or search by target name.
4. Click a row to open the refactor slide-over with evidence.

The list combines estate resilience simulation, using the worst-case scenarios per diagram, with refactor-boundary recommendations where forensics data is available.

## In ChaosLens

1. Open **`/workspace`**, load a diagram, and toggle **Resilience**.
2. Select a node, configure a fault, and click **Simulate**.
3. The right telemetry panel shows **AdviceLens** recommendations for the active simulation.

Signal badges still show **ChaosLens** or **TraceLens**, which is where the underlying signal came from.

## Estate sweep from the CLI

From a directory of BlueprintSpec files:

```bash
archlens resilience ./blueprints
archlens resilience ./blueprints --format=json --output=.archlens/advicelens-report.json --min-sla=95
archlens resilience ./blueprints --format=yaml --output=advicelens-report.yaml
archlens resilience ./blueprints --chaos-specs=./chaos-specs
```

The output header is **AdviceLens estate report**. It includes the diagram count, the worst SLA, single point of failure totals, and the top ranked recommendations with evidence.

Structured output is a versioned artifact, `kind: advicelens-estate-report`, with plain-object heat maps. **CI uses JSON**. The studio **Copy YAML** and **Download** actions default to YAML, with the same fields.

Gate flags:

| Flag                        | Default | Effect                                                         |
| --------------------------- | ------- | -------------------------------------------------------------- |
| `--min-sla=<percent>`       | `100`   | Exit `1` when `summary.worstOverallSla` is below the threshold |
| `--fail-on-recommendations` | off     | Also exit `1` when the run emits any recommendation            |
| `--format=text\|json\|yaml` | `text`  | Human summary, or a structured JSON or YAML artifact           |
| `--output=<file>`           | unset   | Write the structured artifact to disk, which suits CI          |

Optional [ChaosSpec](./chaos-spec.md) files in `chaos-specs/*.yaml` extend the default scenario set: a region outage sweep, high fan-in latency probes, and publisher faults.

## CI guardrails

Use the composite action [`.github/actions/advicelens-gate`](../../.github/actions/advicelens-gate) to upload the AdviceLens artifact and fail pull requests when SLA drops below your threshold. See the [AdviceLens gate workflow example](../../.github/workflows/advicelens-gate.yml.example).

## Studio export

On **TraceLens, then AdviceLens**, use **Copy YAML** or **Download** to get `advicelens-report.yaml` for design notes and pull request attachments. The shape matches `archlens resilience --format=yaml`. CI gates still prefer `--format=json`.

## Applicability matrix

AdviceLens distinguishes **where a signal shows up** from **where an action belongs**. Resilience safeguards are **application-runtime** concerns such as outbound clients, consumer logic, and retries. They aren't IaC or shared infrastructure provisioning.

**Who can receive advice.** Owned services, apps, and workers can receive advice. C4 persons and product personas never can. Third-party vendors never can. Safeguards apply on **your** outbound clients instead.

**External nodes.** `external: true` means a workspace proxy, which is another diagram in your estate. Add `properties.classification: third-party` for vendors and SaaS outside your control. Canvas shows `Workspace` and `Third-party` badges.

| Diagram level | Estate chaos simulation | Resilience safeguards, `add-circuit-breaker`, timeouts, and staleness                | TraceLens composite risk |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------ | ------------------------ |
| `context`     | Yes                     | On **calling** services, APIs, and workers. Brokers and databases stay out of scope. | Yes                      |
| `container`   | Yes                     | On **calling** services, APIs, and workers                                           | Yes                      |
| `component`   | No                      | No. Refactor and forensics only, and the result rolls up to the container.           | Rolled up to `entityRef` |
| `code`        | No                      | No. Refactor and forensics only, and the result rolls up to the container.           | Rolled up to `entityRef` |

**Single point of failure handling.** Shared dependencies such as databases and brokers are still detected, but `add-circuit-breaker` targets **callers**. Add isolation in the calling service's outbound client. Leave the shared resource and its Terraform module unchanged. Third-party dependencies, `classification: third-party`, use caller-side wording and `dependencyOwnership: third-party` in evidence. IaC-imported nodes, with `iac.address` or `iac.kind` properties, are never safeguard targets. Evidence includes `simulation.dependencyEntityRef` and `evidence.applicabilityScope` for the shared dependency.

Core helpers in `@archlens/core/recommendations` are `isResilienceAdviceTarget()`, `isAdviceActionable()`, `isThirdPartyDependency()`, `isEstateResilienceDiagramLevel()`, and `resolveAdviceApplicability()`. Ownership helpers in `@archlens/core` are `isHumanActorNode()` and `resolveExternalNodeKind()`.

## Signal to recommendation mapping

| Signal combination                              | Recommendation kind                                              |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Single point of failure, and no circuit breaker | `add-circuit-breaker` on **callers** of the shared dependency    |
| Blast heat at or above 0.7                      | `review-timeouts-fallbacks`                                      |
| Pub-sub integrity heat                          | `handle-event-staleness`                                         |
| Integrity without availability loss             | `verify-integrity-handling`                                      |
| High hotspot and high blast                     | `reduce-composite-risk`                                          |
| High coupling and a cross-container split       | `refactor-split-by-container` and `refactor-define-api-boundary` |
| Knowledge silo or solo ownership                | `refactor-add-second-owner`                                      |

## Deterministic core and narration

| Layer         | Role                                                                | Safe for CI                     |
| ------------- | ------------------------------------------------------------------- | ------------------------------- |
| **Core**      | `buildRecommendations()` and `runEstateResilience()`                | Yes                             |
| **Narration** | `narrateRecommendations()` for optional large language model detail | Optional, and it never re-ranks |

Narration attaches `narration.citations`, which are the evidence keys the model must ground on. Ranking always uses Core output.

## Related guides

- [TraceLens](./tracelens.md) for the forensics signals that feed composite risk
- [ChaosLens](./chaoslens.md) for the simulation that feeds blast radius and single points of failure
- [ArchLens CLI](./cli.md) for scanning and `archlens resilience`
