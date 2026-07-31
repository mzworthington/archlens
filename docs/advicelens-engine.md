# AdviceLens engine

This page is for **contributors** building or extending AdviceLens—the deterministic recommendation pipeline and optional narration layer in `@archlens/core/recommendations`.

For using AdviceLens in ArchLens Canvas and the CLI, see the [product guide](./guide/advicelens.md).

---

## Stack

| Layer                 | Location                                                          | Role                                                        |
| --------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| **Core orchestrator** | `app/packages/core/src/recommendations/buildRecommendations.ts`   | Merges resilience, forensics, refactor builders             |
| **Estate runner**     | `app/packages/core/src/recommendations/runEstateResilience.ts`    | Multi-diagram worst-case simulation + ranked output         |
| **Scenario library**  | `app/packages/core/src/recommendations/estateScenarios.ts`        | Default headless chaos scenarios per diagram                |
| **Narration (stub)**  | `app/packages/core/src/recommendations/narrateRecommendations.ts` | Phase 5 LLM contract; identity pass without narrator        |
| **Designer adapter**  | `app/packages/designer/src/application/recommendations/`          | `buildDiagramRecommendations`, `buildEstateRecommendations` |
| **CLI**               | `app/packages/cli/src/cli/resilienceRun.ts`                       | `archlens resilience` estate sweep                          |

---

## Core API

```ts
import {
  buildRecommendations,
  runEstateResilience,
  narrateRecommendations,
  listEvidenceCitations,
  type Recommendation,
} from '@archlens/core/recommendations';

const recommendations = buildRecommendations({
  schema,
  simulation,
  sessionSafeguards,
  refactorBoundaries,
  ownershipByEntityRef,
});

// Optional narration — returns input unchanged when no narrator is provided
const narrated = await narrateRecommendations(recommendations, {
  estateLabel: 'checkout-platform', // optional prompt context only
});
```

### Builders

| Function                           | Source signals                                |
| ---------------------------------- | --------------------------------------------- |
| `buildResilienceRecommendations()` | ChaosLens simulation (SPOFs, heat, integrity) |
| `buildForensicsRecommendations()`  | TraceLens hotspot × blast composite risk      |
| `buildRefactorRecommendations()`   | TraceLens refactor boundary clusters          |

### Types

- `Recommendation` — `id`, `kind`, `source`, `priority`, `evidence`, `actions`, optional `narration`
- `Recommendation.source` — `'chaoslens' | 'tracelens'` (signal provenance, not narration)
- `RecommendationNarration` — `provider: 'adviceLens'`, `detail`, `citations`, optional `model`

---

## Evidence citations

`listEvidenceCitations(evidence)` produces stable keys for narration grounding, e.g.:

- `compositeRiskScore:0.42`
- `blastRadius:0.82`
- `hotspotScore:0.71`
- `classification:hotspot`

Phase 5 narrators should only cite keys present in this list.

---

## Estate scenarios

Default scenarios per diagram (`buildDefaultEstateScenarios`):

| Kind              | Fault                                    | Purpose                     |
| ----------------- | ---------------------------------------- | --------------------------- |
| Region outage     | `region-outage` per container            | Baseline blast-radius sweep |
| High fan-in probe | `latency` / `error-rate` on fan-in nodes | Structural weak points      |
| Publisher fault   | `region-outage` on pub-sub publishers    | Integrity / staleness risk  |

Additional scenarios: `chaos-specs/*.yaml` via `chaosSpecDocument.ts`.

---

## Tests

```bash
pnpm --filter @archlens/core test -- recommendations
```

Key files:

- `buildRecommendations.test.ts`
- `runEstateResilience.test.ts`
- `estateScenarios.test.ts`
- `narrateRecommendations.test.ts`

---

## Product naming

- **AdviceLens** — user-facing product name for the recommendation layer
- **AdviceLens Core** — deterministic ranking (CI-safe)
- **AdviceLens Narration** — optional LLM enrichment (Phase 5)

Do not confuse with CLI `productName` in system discovery—that hub slug is for monorepo context diagrams only.
