# ChaosLens engine

This page is for **contributors** building or extending ChaosLens - the Go Monte Carlo core, WASM bridge, and TypeScript fallback in `@archlens/core/resilience`.

For using ChaosLens in ArchLens Canvas, see the [product guide](./guide/chaoslens.md).

---

## Stack

| Layer           | Location                            | Role                                                                                    |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| **Go engine**   | `resilience-engine/`                | Blast radius, SPOF detection, Monte Carlo (P5/mean/P95)                                 |
| **WASM bridge** | `resilience-engine/wasm/`           | `chaosLensSimulate` export for the browser                                              |
| **TypeScript**  | `app/packages/core/src/resilience/` | `runResilienceSimulation`, WASM client, deterministic fallback when WASM is unavailable |

When WASM is built and served from ArchLens Canvas (`/resilience-engine/chaoslens.wasm`), simulations run 1,000 jittered trials and report P5/P95 SLA bands. Without WASM, deterministic TypeScript propagation still runs.

---

## Prerequisites

- Go 1.22+ (1.26 recommended)
- Mise (repo root) - `mise run build-wasm` and `mise run test-go`

---

## Build WASM for local dev

From the repository root:

```bash
mise run build-wasm
```

Or from `resilience-engine/`:

```bash
make copy-wasm
```

This compiles `chaoslens.wasm` and copies `wasm_exec.js` into `app/packages/canvas/public/resilience-engine/`. These artifacts are gitignored and built by CI (`pnpm build`) or on first `pnpm dev`. Restart or refresh ArchLens Canvas dev server after rebuilding.

---

## Go commands

```bash
cd resilience-engine

make test          # unit tests (includes KR3 Monte Carlo budget on large-graph)
make build-wasm    # dist/chaoslens.wasm
make build-cli     # reserved - cmd/chaoslens not in tree yet (product CLI is archlens resilience)
make copy-wasm     # WASM + wasm_exec.js → canvas public/
make build         # copy-wasm (WASM path used by Canvas)
make all           # test + build
```

`go test ./internal/sim` loads `blueprints/chaoslens-stress/large-graph-containers.yaml` and asserts default WASM Monte Carlo settings (`1000` iterations, `availabilityJitter` `0.12`) finish in under 5 seconds via both `sim.RunMonteCarlo` and `api.RunRequest` (the WASM bridge path).

---

## WASM bridge

The browser loads `wasm_exec.js` + `chaoslens.wasm` and calls:

```js
const json = chaosLensSimulate(JSON.stringify(request));
```

Returns a JSON `SimulationResult` string (or `{"error":"..."}` on failure).

Request shape matches `@archlens/core/resilience` `WasmSimulationRequest` (schema + fault spec + optional `monteCarlo`).

---

## CLI

**Product headless path:** use ArchLens CLI AdviceLens - `archlens resilience` and `.github/actions/advicelens-gate` (see [AdviceLens](./guide/advicelens.md)). That runs ChaosLens simulation rules via `@archlens/core` (WASM when available, TypeScript fallback otherwise).

**Go stdin `chaoslens` binary:** planned (`make build-cli` / `cmd/chaoslens`) - not present in this repo yet. Do not treat it as shipping.

## Go package layout

```
internal/graph   - group boundary expansion, publish-subscribe peer lookup
internal/sim     - blast radius, integrity radius, SPOF detection, Monte Carlo
api              - JSON request/response entry
wasm             - syscall/js export for Canvas
cmd/chaoslens    - planned stdin/stdout CLI (not checked in)
```

---

## TypeScript core API

For unit tests and future CLI integration:

```ts
import { runResilienceSimulation } from '@archlens/core/resilience';

const result = runResilienceSimulation(schema, {
  faults: [{ nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 }],
  safeguards: { 'shop/api': { circuitBreaker: true } },
});
```

Exports: `computeBlastRadius`, `computeIntegrityRadius`, `detectSpofs`, `faultSpec` types, `runResilienceSimulationAsync` (WASM path).

`SimulationResult` includes availability (`heat`, `overallSla`) and data integrity (`integrityHeat`, `overallIntegrity`) as separate tracks. Monte Carlo jitter applies to availability only.

Canvas state: `app/packages/canvas/src/application/store/states/resilienceState.ts`.

---

## Related

- [Setup & local development](./setup.md) - Mise tasks including `build-wasm`
- [Architecture & security](./architecture.md) - `@archlens/core/resilience` in the domain layer
- [resilience-engine/README.md](../resilience-engine/README.md) - short repo-local README
