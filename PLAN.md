# ChaosLens: System Resilience & Outage Blast-Radius Simulator

**Product Integration Target:** Embedded Module inside [blueprint.mzworthington.co.uk/resilience](https://blueprint.mzworthington.co.uk/resilience) & Standalone WASM/CLI Engine

## 1. Executive Working Backwards Press Release (Amazon PR/FAQ Style)

**FOR IMMEDIATE RELEASE**

London, UK – October 15, 2026

### ChaosLens Launches Real-Time Outage & Blast-Radius Simulator to Guarantee System Resilience Before Production Incidents Hit

Today, platform engineering and site reliability teams face an ongoing operational challenge: predicting how a single point of failure in a microservice architecture will cascade across complex systems. ChaosLens, a lightweight, declarative chaos engineering and blast-radius simulator, gives architects and reliability engineers the power to visually map, stress-test, and model catastrophic failures before they impact real customers.

Unlike traditional chaos tools that execute risky live experiments directly in staging or production environments, ChaosLens provides a zero-risk WebAssembly-powered simulation sandbox. Engineers can import their service topology, configure failure scenarios—such as cloud region outages, database connection pool exhaustion, or downstream API latency spikes—and instantly observe the cascading blast radius across top-level SLAs and business metrics.

> "Before ChaosLens, our resilience testing was reactive and destructive. We had to break real infrastructure during game days to understand cascading failures. ChaosLens lets our architects simulate complex multi-region failovers and circuit-breaker behavior in seconds right in the browser, saving hundreds of hours in incident post-mortems and avoiding costly downtime."
>
> — VP of Infrastructure

ChaosLens is open-source, runs natively in the browser or as a CI/CD pipeline check, and integrates with OpenTelemetry and Kubernetes topologies. It is featured as an interactive live studio module at [blueprint.mzworthington.co.uk/resilience](https://blueprint.mzworthington.co.uk/resilience).

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
- **Executive Mode Toggle:** Switches telemetry between detailed SRE metrics (entity refs, SPOF lists, per-entry-point SLAs) and high-level plain-English business continuity summaries (revenue/SLO risk, journey impact) for leadership stakeholders. Deferred from MVP — label-only stub removed; full view filtering and copy to ship here.

### Iteration 3 (Version 3.0) – CI/CD Guardrails & AI Recommendation Engine

- **Headless CLI & PR Checks:** GitHub Action blocking PRs if an architectural change increases top-level outage blast radius beyond defined SLO thresholds.
- **AI Recommendation Engine:** Suggests concrete code/infra fixes (e.g., "Add a 200ms timeout with fallback caching on Payment-Service to prevent connection pool starvation on DB-Primary").
- **URL Hash State:** Shareable URL state allowing exact outage scenarios to be linked directly in architectural RFCs and presentation decks.

## 5. UX & UI Architecture within Blueprint

### Navigation Integration

Blueprint header keeps **Workspace** as the primary studio route. **Resilience (ChaosLens)** is a **mode toggle** on the workspace bottom toolbar (same canvas, panels, and URL under `/workspace`).

### Workspace Resilience Mode

- **Activation:** **Resilience** button in the bottom toolbar toggles simulation mode on the active diagram.
- **Left Pane:** Schema Explorer (unchanged).
- **Center Pane (Canvas):** Same Blueprint canvas with blast-radius heatmap overlay.
- **Right Pane:** Fault injection controls, safeguard toggles, SLA/SLO telemetry, SPOF list, and advice (replaces property editing while mode is on).
- **Bottom Toolbar:** **Resilience** toggle + **Simulate** when mode is active.

## 6. Simulation Engine: Go (WASM) vs TypeScript

Using Go (compiled to WebAssembly) for the simulation engine rather than TypeScript comes down to three main architectural reasons: deterministic performance, concurrency models, and execution portability. While TypeScript could run a basic graph traversal for small topologies, it faces performance bottlenecks when scaling to complex enterprise simulations.

Here is why Go is the ideal choice for this specific workload, and where TypeScript falls short:

### 1. High-Frequency Monte Carlo & Graph Simulations

To model real-world cascade failures, the simulator runs Monte Carlo simulations—executing thousands of randomized trials per second (e.g., simulating 10,000 requests passing through a 50-node graph with variable latencies, drop rates, and retry policies).

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

_Last updated: July 2026_

**Legend:** ✅ Done · 🚧 Partial · ⏳ Pending

### MVP (Version 1.0)

| Item                                                                | Status | Notes                                                                                                                           |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Drag-and-drop canvas (reuse Blueprint workspace)                    | ✅     | Same canvas under `/workspace`; no separate route.                                                                              |
| Fault injection controls (latency, 5xx, packet loss, region outage) | ✅     | Right panel + **Simulate** toolbar action.                                                                                      |
| Safeguard toggles (circuit breaker, bulkhead, retry, local cache)   | ✅     | Session toggles; optional YAML via `properties.resilience`.                                                                     |
| Visual blast-radius heatmap                                         | ✅     | Node tint by heat, SPOF labels, fault-target border.                                                                            |
| Animated blast-radius ripple                                        | ✅     | Hop-by-hop propagation via `useBlastRippleAnimation` / `blastRipple`; respects `preferReducedMotion` and `liteCanvas`.          |
| TraceLens heatmap suppressed in resilience mode                     | ✅     | Hotspot overlay disabled while ChaosLens is active.                                                                             |
| Simulation core (TypeScript fallback)                               | ✅     | Deterministic propagation, group-boundary parity, safeguards, SPOF detection, entry-point SLA, `heatHops` for animation.        |
| Go/WASM Monte Carlo engine                                          | ✅     | `resilience-engine/` — blast radius, P5/mean/P95, group boundaries; bridge via `runResilienceSimulationAsync`.                  |
| Docs & discoverability                                              | ✅     | [Product guide](../docs/guide/chaoslens.md) + [engine docs](../docs/chaoslens-engine.md); `mise.toml` `build-wasm` / `test-go`. |
| CI (engine tests + WASM build)                                      | ✅     | Go tests in `.github/workflows/ci.yml`; WASM built during `pnpm build` (not checked into git).                                  |
| Stress fixtures                                                     | ✅     | `blueprints/chaoslens-stress/` container scenarios for manual and automated validation.                                         |
| Stress-test harness                                                 | ✅     | Vitest regression in `@blueprint/core/resilience` loads fixtures, asserts SLA/SPOF/latency (KR3: &lt;5s).                       |

### Iteration 2 (Version 2.0)

| Item                                        | Status | Notes                                                                                                |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| OpenTelemetry ingestion                     | ⏳     | No trace/Jaeger/Prometheus import yet.                                                               |
| Monte Carlo on TS fallback                  | 🚧     | WASM path runs 1k jittered trials; TypeScript fallback stays deterministic.                          |
| Multi-fault UI + Chaos Spec YAML            | 🚧     | Engine supports multiple faults in one run; UI still one fault target per run; no saved chaos specs. |
| Resilience comparison (current vs proposed) | ⏳     | Not started.                                                                                         |
| Executive mode toggle                       | ⏳     | SRE telemetry only; plain-English business summaries deferred.                                       |

### Iteration 3 (Version 3.0)

| Item                                | Status | Notes                                                                    |
| ----------------------------------- | ------ | ------------------------------------------------------------------------ |
| Headless `chaoslens` CLI            | 🚧     | `make build-cli` target exists; `cmd/chaoslens` package not in repo yet. |
| GitHub Action PR gate               | ⏳     | Depends on CLI; no workflow step today.                                  |
| URL hash / shareable scenario state | ⏳     | Resilience mode and fault config are not encoded in the workspace URL.   |
| AI recommendation engine            | ⏳     | Rule-based advice shipped; no context-aware infra/code suggestions yet.  |

### OKR validation (ongoing)

| KR      | Target                                        | Status | Gap                                                                                                |
| ------- | --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| **KR1** | 50+ node topology at 60 FPS with WASM sim     | 🚧     | `large-graph` stress fixture exists; no automated FPS/latency benchmark.                           |
| **KR2** | 100% SPOF / missing circuit-breaker detection | 🚧     | Structural SPOF detection shipped; no OTel-derived graph validation.                               |
| **KR3** | Deterministic SLA report in &lt;5s            | 🚧     | TS regression harness enforces &lt;5s on stress fixtures; WASM Monte Carlo perf budget still open. |

### Suggested next slice

1. ⏳ Implement `cmd/chaoslens` CLI and wire a GitHub Action PR gate.
2. ⏳ OTel ingestion, then resilience comparison and executive mode.
3. ⏳ WASM Monte Carlo perf budget on `large-graph` stress fixture (KR1/KR3).
