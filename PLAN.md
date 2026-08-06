# ChaosLens: System Resilience & Outage Blast-Radius Simulator

**Product Integration Target:** Embedded Module inside [archlens.dev/resilience](https://archlens.dev/resilience) & Standalone WASM/CLI Engine

## 1. Executive Working Backwards Press Release (Amazon PR/FAQ Style)

**FOR IMMEDIATE RELEASE**

London, UK – October 15, 2026

### ChaosLens Launches Real-Time Outage & Blast-Radius Simulator to Guarantee System Resilience Before Production Incidents Hit

Today, platform engineering and site reliability teams face an ongoing operational challenge: predicting how a single point of failure in a microservice architecture will cascade across complex systems. ChaosLens, a lightweight, declarative chaos engineering and blast-radius simulator, gives architects and reliability engineers the power to visually map, stress-test, and model catastrophic failures before they impact real customers.

Unlike traditional chaos tools that execute risky live experiments directly in staging or production environments, ChaosLens provides a zero-risk WebAssembly-powered simulation sandbox. Engineers can import their service topology, configure failure scenarios-such as cloud region outages, database connection pool exhaustion, or downstream API latency spikes-and instantly observe the cascading blast radius across top-level SLAs and business metrics.

> "Before ChaosLens, our resilience testing was reactive and destructive. We had to break real infrastructure during game days to understand cascading failures. ChaosLens lets our architects simulate complex multi-region failovers and circuit-breaker behavior in seconds right in the browser, saving hundreds of hours in incident post-mortems and avoiding costly downtime."
>
> - VP of Infrastructure

ChaosLens is open-source, runs natively in the browser or as a CI/CD pipeline check, and integrates with OpenTelemetry and Kubernetes topologies. It is featured as an interactive live studio module at [archlens.dev/resilience](https://archlens.dev/resilience).

## 2. Product Requirements Document (PRD)

### Problem Statement

Microservice architectures are inherently non-deterministic under strain. Outages in downstream third-party dependencies or sudden database latency spikes often cause unexpected cascading failures across seemingly unrelated upstream services. Teams lack a safe, non-destructive way to model "what-if" failure scenarios during the architectural design phase.

### Objectives & Key Results (OKRs)

- **KR1:** Allow architects to model and simulate a 50+ node service topology at 60 FPS in WebAssembly.
- **KR2:** Automatically identify unhandled single points of failure (SPOFs) and missing circuit breakers in 100% of imported service graphs.
- **KR3:** Provide a deterministic SLA/SLO degradation report in <5 seconds for any simulated fault injection.

### User Personas

- **Principal Software Architects:** Want to evaluate resilience trade-offs (asynchronous messaging vs. synchronous REST/gRPC, bulkheads, retries) before writing code.
- **Site Reliability Engineers (SREs):** Want to run "dry-run" incident scenarios during post-mortem analyses and game-day planning.
- **VP / Engineering Leadership:** Wants high-level visual proof of business continuity and risk mitigation across critical user journeys.

## 3. Tech Stack Architecture

| Layer                   | Technology                                | Rationale                                                                                              |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Simulation Core Engine  | Go / Rust compiled to WebAssembly (WASM)  | High-performance, memory-safe execution of Monte Carlo failure simulations directly in browser or CLI. |
| Visualization Canvas UI | React + D3.js / Cytoscape.js              | Hardware-accelerated rendering of complex directed graphs and glowing heat-map ripples.                |
| Data Ingestion          | OpenTelemetry (OTel) & Kubernetes Parsers | Auto-generates service graphs from live distributed traces and K8s manifests.                          |
| Configuration Spec      | Declarative YAML / JSON Schema            | Portable, version-controlled "Chaos Specs" stored alongside application code.                          |

## 4. MVP & Iterative Roadmap

### MVP (Version 1.0) – Interactive Simulation Canvas & Basic Faults

- **Drag-and-Drop Canvas:** Interactive node/edge graph editor representing Microservices, Databases, Caches, and Third-Party APIs.
- **Fault Injection Controls:** Trigger simulated conditions per node/edge: High Latency, Packet Loss, 5xx Error Rates, Region Outages.
- **Visual Blast-Radius Heatmap:** Real-time animated ripple showing how downstream failures impact top-level entrypoints.
- **Pattern Guardrails:** Toggles for Circuit Breakers, Bulkheads, Retries, and Local Caches to test mitigation effectiveness in real time.

### Iteration 2 (Version 2.0) – OTel Ingestion, Monte Carlo & Executive View

- **OpenTelemetry Ingestion:** Import OTel trace exports or connect to Prometheus/Jaeger endpoints to auto-generate real service graphs.
- **Monte Carlo Engine:** Runs thousands of randomized failure iterations to generate statistical availability percentages (e.g., "Under a 10% payment gateway slowdown, checkout SLA drops to 94.2%").
- **Resilience Comparison:** Side-by-side comparison of "Current Architecture" vs. "Proposed Architecture with Fallback Cache".
- **Executive Mode Toggle:** Switches telemetry between detailed SRE metrics (entity refs, SPOF lists, per-entry-point SLAs) and high-level plain-English business continuity summaries (revenue/SLO risk, journey impact) for leadership stakeholders. Deferred from MVP - label-only stub removed; full view filtering and copy to ship here.

### Iteration 3 (Version 3.0) – CI/CD Guardrails & AdviceLens

- **Headless CLI & PR Checks:** GitHub Action blocking PRs if an architectural change increases top-level outage blast radius beyond defined SLO thresholds.
- **AdviceLens:** Evidence-backed recommendation ranking (TraceLens + ChaosLens) with optional AI narration for concrete infra/code fixes (e.g., "Add a 200ms timeout with fallback caching on Payment-Service to prevent connection pool starvation on DB-Primary").
- **URL Hash State:** Shareable workspace query state (`?lens=chaoslens&fault=…`) so exact outage scenarios can be linked in RFCs and decks.

## 5. UX & UI Architecture within ArchLens

### Navigation Integration

The ArchLens header keeps **Workspace** as the primary studio route. **Resilience (ChaosLens)** is a **mode toggle** on the workspace bottom toolbar (same canvas, panels, and URL under `/workspace`).

### Workspace Resilience Mode

- **Activation:** **Resilience** button in the bottom toolbar toggles simulation mode on the active diagram.
- **Left Pane:** Schema Explorer (unchanged).
- **Center Pane (Canvas):** Same ArchLens Canvas with blast-radius heatmap overlay.
- **Right Pane:** Fault injection controls, safeguard toggles, SLA/SLO telemetry, SPOF list, and advice (replaces property editing while mode is on).
- **Bottom Toolbar:** **Resilience** toggle + **Simulate** when mode is active.

## 6. Simulation Engine: Go (WASM) vs TypeScript

Using Go (compiled to WebAssembly) for the simulation engine rather than TypeScript comes down to three main architectural reasons: deterministic performance, concurrency models, and execution portability. While TypeScript could run a basic graph traversal for small topologies, it faces performance bottlenecks when scaling to complex enterprise simulations.

Here is why Go is the ideal choice for this specific workload, and where TypeScript falls short:

### 1. High-Frequency Monte Carlo & Graph Simulations

To model real-world cascade failures, the simulator runs Monte Carlo simulations-executing thousands of randomized trials per second (e.g., simulating 10,000 requests passing through a 50-node graph with variable latencies, drop rates, and retry policies).

- **Go (WASM):** Compiles to raw machine-level WebAssembly instructions. It operates on linear memory with minimal runtime overhead, achieving near-native performance (~1.2x to 1.5x native speeds). It easily calculates 60 FPS visual state updates while running background statistical trials.
- **TypeScript:** Runs on V8's Just-In-Time (JIT) compiler. While V8 is extremely fast for standard web apps, heavy nested loops over thousands of graph nodes cause significant CPU spikes.

### 2. Garbage Collection & Event-Loop Jitter

In an interactive visual simulator rendering at 60 FPS, frame drops (jank) ruin the user experience.

- **TypeScript / JavaScript:** JS relies on a single-threaded event loop and V8's generational Garbage Collector (GC). During heavy object allocation (creating thousands of temporary trace objects or state frames per second during a failure ripple), V8's GC will periodically trigger Stop-The-World (STW) pauses. This causes noticeable stuttering in the visual canvas.
- **Go:** Go's garbage collector is engineered for sub-millisecond pauses and low latency. When compiled to WASM, memory allocation is tightly controlled within a fixed memory buffer, preventing visual UI freezing during heavy failure propagation.

### 3. Concurrency Model (Goroutines vs. Single Threading)

Simulating distributed systems requires modeling independent services acting concurrently (e.g., multiple services handling incoming request queues simultaneously).

- **Go:** Uses light-weight concurrency (goroutines and channels). Modeling 100 concurrent microservices receiving independent traffic spikes maps naturally to Go's concurrency model, even inside a WASM thread.
- **TypeScript:** Single-threaded by nature. Modeling concurrent service queues requires complex `Promise.all` async event loops or Web Workers. Web Workers introduce significant structured-clone serialization overhead when passing large graph state objects back and forth to the main UI thread.

### 4. Headless CLI Portability & Code Reuse

One of the key requirements in the roadmap is running the simulator in CI/CD pipelines (GitHub Actions) as a headless CLI to block non-compliant PRs.

- **Go:** Generates a single, lightweight static binary (e.g., `chaoslens-cli`) with zero external dependencies. The exact same Go simulation code used in the CLI is compiled directly to `.wasm` for the browser.
- **TypeScript:** Requires a Node.js/Bun runtime environment in CI/CD, leading to larger container sizes, dependency management overhead (`node_modules`), and slower cold-start execution times in build pipelines.

### Summary: The Ideal Hybrid Division of Labor

The best approach isn't choosing only Go or TypeScript, but leveraging both where they excel:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER / UI LAYER                            │
│                                                                         │
│   TypeScript + React + D3.js                                            │
│   └─ UI Layout, Drag-and-Drop Canvas, Controls, State Management        │
│                                                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ High-Speed Memory Bridge
┌────────────────────────────────────▼────────────────────────────────────┐
│                        CORE SIMULATION ENGINE                           │
│                                                                         │
│   Go (Compiled to WASM)                                                 │
│   └─ Monte Carlo Engine, Graph Traversal, Heatmap Propagation, SLOs     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Use TypeScript for:** The UI shell, interactive React layout, drag-and-drop canvas events, control panel toggles, and state orchestration.
- **Use Go (WASM) for:** The mathematical simulation core, pathfinding algorithms, OTel trace parsing, and Monte Carlo probability calculations.

## 7. Implementation Status & Remaining Work

_Last updated: August 2026 (ChaosLens CLI + PR gate)_

**Legend:** ✅ Done · 🚧 Partial · ⏳ Pending

### MVP (Version 1.0)

| Item                                                                | Status | Notes                                                                                                                                         |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag-and-drop canvas (reuse ArchLens Canvas workspace)              | ✅     | Same canvas under `/workspace`; no separate route.                                                                                            |
| Fault injection controls (latency, 5xx, packet loss, region outage) | ✅     | Right panel + **Simulate** toolbar action.                                                                                                    |
| Safeguard toggles (circuit breaker, bulkhead, retry, local cache)   | ✅     | Session toggles; optional YAML via `resilience` on the node.                                                                                  |
| Visual blast-radius heatmap                                         | ✅     | Node tint by heat, SPOF labels, fault-target border.                                                                                          |
| Animated blast-radius ripple                                        | ✅     | Hop-by-hop propagation via `useBlastRippleAnimation` / `blastRipple`; respects `preferReducedMotion` and `liteCanvas`.                        |
| TraceLens heatmap suppressed in resilience mode                     | ✅     | Hotspot overlay disabled while ChaosLens is active.                                                                                           |
| Simulation core (TypeScript fallback)                               | ✅     | Deterministic propagation, group-boundary parity, safeguards, SPOF detection, entry-point SLA, `heatHops` for animation.                      |
| Go/WASM Monte Carlo engine                                          | ✅     | `resilience-engine/` - blast radius, P5/mean/P95, group boundaries; bridge via `runResilienceSimulationAsync`.                                |
| Docs & discoverability                                              | ✅     | [Product guide](../docs/guide/chaoslens.md) + [engine docs](../docs/chaoslens-engine.md); `mise.toml` `build-wasm` / `test-go`.               |
| CI (engine tests + WASM build)                                      | ✅     | Go tests in `.github/workflows/ci.yml`; WASM built during `pnpm build` (not checked into git).                                                |
| Stress fixtures                                                     | ✅     | `samples/chaoslens-stress/` container scenarios for manual and automated validation.                                                          |
| Stress-test harness                                                 | ✅     | Vitest regression in `/core/resilience` loads fixtures, asserts SLA/SPOF/latency (KR3: &lt;5s).                                               |
| External simulation scope (Phase 1)                                 | ✅     | `buildSimulationSchema` enriches graph with direct external neighbors; Canvas materializes on Simulate.                                       |
| External simulation scope (Phase 2)                                 | ✅     | Upstream transitive closure (`collectSimulationUpstreamRefs`); force-show scope + dim out-of-scope on canvas via `resilienceSimulationScope`. |
| External simulation scope (Phase 3)                                 | ✅     | Expand through external proxies into home diagrams; expand→materialize to a bounded fixpoint so deep home chains stay on the sim graph.       |

### Iteration 2 (Version 2.0)

| Item                                        | Status | Notes                                                                                                |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| OpenTelemetry ingestion                     | ⏳     | No trace/Jaeger/Prometheus import yet.                                                               |
| Monte Carlo on TS fallback                  | 🚧     | WASM path runs 1k jittered trials; TypeScript fallback stays deterministic.                          |
| Multi-fault UI + Chaos Spec YAML            | 🚧     | Engine supports multiple faults in one run; UI still one fault target per run; no saved chaos specs. |
| Resilience comparison (current vs proposed) | ⏳     | Not started.                                                                                         |
| Executive mode toggle                       | ✅     | SRE vs Executive toggle; journey/revenue mapping deferred.                                           |

### Iteration 3 (Version 3.0)

| Item                                | Status | Notes                                                                                                     |
| ----------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Headless `chaoslens` CLI            | ✅     | `cmd/chaoslens` stdin/stdout JSON; `-monte-carlo` / `-seed` / `-min-sla`; CI smoke in `ci.yml`.           |
| GitHub Action PR gate               | ✅     | Composite `.github/actions/chaoslens-gate` + `chaoslens-gate.yml.example` (customer template).            |
| URL hash / shareable scenario state | ✅     | Sticky `?lens=chaoslens` with `fault`/`type`/`severity` (or `faults=`); legacy `?resilience=1` redirects. |
| AdviceLens (recommendation engine)  | 🚧     | Core ranking + estate CLI + canvas wiring + CI gate/artifact + UI JSON export shipped; narration pending. |

### OKR validation (ongoing)

| KR      | Target                                        | Status | Gap                                                                                                             |
| ------- | --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| **KR1** | 50+ node topology at 60 FPS with WASM sim     | 🚧     | `large-graph` stress fixture (30 nodes) + Go Monte Carlo latency budget in CI; canvas FPS benchmark still open. |
| **KR2** | 100% SPOF / missing circuit-breaker detection | 🚧     | Structural SPOF detection shipped; no OTel-derived graph validation.                                            |
| **KR3** | Deterministic SLA report in &lt;5s            | ✅     | TS stress harness + Go/WASM Monte Carlo (`1000` trials on `large-graph`) both enforce &lt;5s in CI.             |

### Suggested next slice

1. ✅ **AdviceLens Phase 4** — CI guardrails, AdviceLens JSON artifact, and studio Copy/Download export.
2. ✅ Implement `cmd/chaoslens` CLI and wire a GitHub Action PR gate.
3. ⏳ OTel ingestion, then resilience comparison and executive mode.
4. ✅ WASM Monte Carlo perf budget on `large-graph` stress fixture (KR3; KR1 FPS still open).

## 9. AdviceLens

_Last updated: July 2026_

**AdviceLens** is ArchLens’s evidence-backed recommendation layer. It merges **TraceLens** forensics (code health, coupling, ownership) with **ChaosLens** failure simulation (blast radius, SPOFs, integrity heat) into a ranked action list—optionally narrated by AI—consumable in the studio, CLI, and CI.

| Lens       | Question it answers                        |
| ---------- | ------------------------------------------ |
| TraceLens  | Where is the code fragile or coupled?      |
| ChaosLens  | What fails and how far does damage spread? |
| AdviceLens | What should we fix first, and why?         |

**Legend:** ✅ Done · 🚧 Partial · ⏳ Pending

### Problem

Teams have forensics signals (hotspots, silos) and resilience signals (blast radius, SPOFs) in separate views. There is no unified, ranked list of evidence-backed recommendations that answers: _what should we fix first, and why?_

### Objectives

- **KR-R1:** Rank recommendations by composite risk (hotspot × blast exposure) across all diagrams in scope.
- **KR-R2:** Run headless failure simulations estate-wide without opening ArchLens Canvas.
- **KR-R3:** Emit structured, evidence-backed recommendations consumable by TraceLens UI, ChaosLens panel, and CI gates.
- **KR-R4:** Optional narration enriches recommendations with concrete fixes grounded on `Recommendation.evidence` without re-ranking.

### Two layers

| Layer                    | Role                                                            | Deterministic?                | Status     |
| ------------------------ | --------------------------------------------------------------- | ----------------------------- | ---------- |
| **AdviceLens Core**      | `buildRecommendations()`, estate sweep, priority + evidence     | Yes — CI-safe                 | ✅         |
| **AdviceLens Narration** | `narrateRecommendations()` — LLM detail from evidence citations | Optional — never changes rank | ⏳ Phase 5 |

`Recommendation.source` stays honest about **signal provenance** (`chaoslens` | `tracelens`). Narration is enrichment (`narration.provider: 'adviceLens'`), not a third signal source.

### Architecture

```
┌──────────────── TraceLens ────────────────┐
│  hotspots, coupling, refactor boundaries  │
└────────────────────┬──────────────────────┘
                     │
┌──────────────── ChaosLens ────────────────┐
│  simulation, blast radius, SPOFs          │
└────────────────────┬──────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   AdviceLens Core     │  @archlens/core/recommendations
         │   buildRecommendations│
         │   runEstateResilience │
         └───────────┬───────────┘
                     │ Recommendation[]
         ┌───────────▼───────────┐
         │ AdviceLens Narration  │  narrateRecommendations() (Phase 5)
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
 TraceLens UI   ChaosLens panel   CLI / GitHub Action
 (/tracelens)   (ResilienceSection)  archlens resilience
```

Recommendations are **ephemeral** (display-only) by default — not written to BlueprintSpec YAML. Persistence in schema v5 is deferred unless CI round-tripping is required. AdviceLens does **not** require CLI `productName` (system-discovery hub slug); diagram identity uses `schema.entityRef` / `name` and file paths.

### Phasing

| Phase  | Scope                                                                                                                                                | Status |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **1**  | Unified `Recommendation` type; `buildRecommendations()` in core; migrate `buildAdvice()` to structured resilience recommendations; unit tests.       | ✅     |
| **2**  | Headless estate simulation — batch-run default chaos scenarios per diagram; `archlens resilience` CLI command.                                       | ✅     |
| **3**  | Canvas integration — TraceLens ranked list shows unified recommendations; slide-over evidence panel; wire `rankOffenders` to `buildRecommendations`. | ✅     |
| **3b** | Product naming, docs (`docs/guide/advicelens.md`), narration types + `narrateRecommendations()` contract stub.                                       | ✅     |
| **4**  | CI guardrails — PR check when worst estate SLA exceeds threshold; AdviceLens artifact in CI (JSON) + Canvas Copy/Download YAML export.               | ✅     |
| **5**  | Narration implementation — LLM proposes concrete infra/code fixes grounded on structured `Recommendation.evidence` (not as ranker).                  | ⏳     |

### Core API

```ts
// @archlens/core/recommendations
import type { Recommendation } from '@archlens/core/recommendations';

buildRecommendations({
  schema: SystemSchema,
  simulation?: SimulationResult | null,
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>,
  refactorBoundaries?: RefactorBoundary[],
  ownershipByEntityRef?: Map<EntityRef, OwnershipBreakdown>,
}): Recommendation[]

// Phase 5 — optional narration (stub returns input unchanged without a narrator)
narrateRecommendations(
  recommendations: readonly Recommendation[],
  options?: { narrator?: AdviceLensNarrator; estateLabel?: string }
): Promise<Recommendation[]>
```

Supporting builders:

- `buildResilienceRecommendations()` — circuit breakers, timeouts, staleness, integrity handling.
- `buildForensicsRecommendations()` — composite risk (hotspotScore × blastRadius).
- `buildRefactorRecommendations()` — extract shared logic, split by container, ownership.

### Default estate scenario set (Phase 2)

| Scenario              | Fault                                         | Purpose                     |
| --------------------- | --------------------------------------------- | --------------------------- |
| Region outage         | `region-outage` per container                 | Baseline blast-radius sweep |
| Dependency SPOF probe | `latency` / `error-rate` on high-fan-in nodes | Structural weak points      |
| Publisher fault       | `region-outage` on pub-sub publishers         | Integrity / staleness risk  |

Scenarios stored in `chaos-specs/*.yaml` (existing `chaosSpecDocument.ts` bridge).

### Signal → recommendation mapping

| Signal combination                  | Recommendation kind                                           |
| ----------------------------------- | ------------------------------------------------------------- |
| SPOF + no circuit breaker           | `add-circuit-breaker`                                         |
| Blast heat ≥ 0.7                    | `review-timeouts-fallbacks`                                   |
| Pub-sub integrity heat              | `handle-event-staleness`                                      |
| Integrity without availability loss | `verify-integrity-handling`                                   |
| High hotspot × high blast           | `reduce-composite-risk`                                       |
| High coupling + cross-container     | `refactor-split-by-container`, `refactor-define-api-boundary` |
| Knowledge silo / solo ownership     | `refactor-add-second-owner`                                   |

### Integration points

| Consumer                   | Path                                                     | Phase |
| -------------------------- | -------------------------------------------------------- | ----- |
| TraceLens offender ranking | `canvas/.../rankOffenders.ts`                            | 3     |
| Refactor slide-over        | `canvas/.../RefactorPlanSlideOver.tsx`                   | 3     |
| ChaosLens advice panel     | `canvas/.../ResilienceSection.tsx`                       | 3     |
| Composite risk scoring     | `core/forensics/compositeRisk.ts`, `chaosRiskContext.ts` | 1 ✅  |
| CLI estate scan            | `archlens resilience`                                    | 2 ✅  |
| Chaos spec library         | `core/resilience/chaosSpecDocument.ts`                   | 2 ✅  |

### Phase 1 implementation status

| Item                                  | Status | Notes                                            |
| ------------------------------------- | ------ | ------------------------------------------------ |
| `Recommendation` type                 | ✅     | `core/src/recommendations/types.ts`              |
| `buildRecommendations()` orchestrator | ✅     | Merges resilience, forensics, refactor sources   |
| `buildResilienceRecommendations()`    | ✅     | Replaces ad-hoc `buildAdvice()` strings          |
| `buildForensicsRecommendations()`     | ✅     | Composite risk threshold                         |
| `buildRefactorRecommendations()`      | ✅     | Adapter over `buildRefactorSuggestions()`        |
| `SimulationResult.faultNodeIds`       | ✅     | Tracks resolved fault targets                    |
| Unit tests                            | ✅     | `buildRecommendations.test.ts`                   |
| Canvas wiring                         | ✅     | TraceLens slide-over + ChaosLens telemetry panel |
| CLI headless runner                   | ✅     | `archlens resilience` command                    |
| `buildDefaultEstateScenarios()`       | ✅     | Region outage, fan-in probe, publisher faults    |
| `runEstateResilience()`               | ✅     | Worst-case merge + ranked recommendations        |

## 8. External simulation scope

### Problem

ChaosLens runs against `schema.nodes` + `schema.dependencies`. Edges whose endpoints are missing from `schema.nodes` are **silently dropped** in `buildDependents` (`@archlens/core/resilience/graph.ts`). External proxy nodes may exist in the workspace but not on the active diagram, so simulations under-report blast radius and the canvas hides impacted neighbors.

Three blind spots:

| Layer                    | Symptom                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Unresolved endpoints** | `dependencies` reference `entityRef` values not in `schema.nodes` — propagation cannot cross the edge.    |
| **Hidden externals**     | External proxies on schema/canvas filtered by **Show Externals** toggles — heat computed but not visible. |
| **Proxy boundary**       | Without home-diagram expansion, materialized externals stay leaves and under-report blast radius.         |

### Design

On **Simulate**, build a **simulation closure** around the fault target before calling `runResilienceSimulationAsync`:

```
User selects node → buildSimulationSchema → materialize missing neighbors on canvas
                                            → run simulation on enriched schema
                                            → apply heatmap to all nodes in scope
```

**Transient scope:** pulled-in externals are materialized for the run (same as **Add external** / **Sync suggested**). Phase 2 may auto-show scope and dim out-of-scope nodes without persisting to draft.

### Phasing

| Phase | Scope                                                                                                                                                             | Status  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **1** | Direct dependency neighbors of fault target + unresolved endpoints on those edges; resolve from workspace index; materialize on canvas; simulate enriched schema. | ✅ Done |
| **2** | Upstream transitive closure; force-show scope during resilience mode; dim out-of-scope nodes.                                                                     | ✅ Done |
| **3** | Expand through external proxies into home diagrams (cross-boundary subgraph); rematerialize until closure stabilizes.                                             | ✅ Done |

### Core API (Phase 1)

```ts
// @archlens/core/resilience/simulationSchema.ts
buildSimulationSchema(
  activeSchema: SystemSchema,
  faultTarget: EntityRef,
  loadedSystems?: LoadedSystemInput[]
): {
  schema: SystemSchema;
  scope: EntityRef[];
  materialized: WorkspaceEntity[];
}
```

Reuses `buildWorkspaceEntityIndex`, `materializeExternalNodes`, `positionExternalNodes` from `rules/workspaceExternals.ts`. Container diagrams may call `enrichContainerSchemaFromComponentDeps` first when workspace is loaded.

### Canvas integration (Phase 1)

`resilienceState.runResilienceSimulation`:

1. Call `buildSimulationSchema(schema, selectedNodeId, loadedSystems)`.
2. `addExternalDependencies(materialized entityRefs)` when workspace is loaded.
3. Pass returned `schema` to `runResilienceSimulationAsync` (not the pre-enrichment store copy).
4. Store `resilienceSimulationScope` for canvas filtering (Phase 2) — done; Canvas force-shows scope and dims out-of-scope.

### Edge cases

- **No workspace loaded:** fall back to current behavior; no materialization.
- **Unresolved ref with no workspace match:** simulation unchanged; advice panel may note incomplete graph (later).
- **Container vs component:** container rollup before neighbor expansion when `loadedSystems` is present.
- **Performance:** Phase 1 is direct neighbors only; Phase 2 adds bounded transitive walk.
