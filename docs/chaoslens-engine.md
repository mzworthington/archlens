# ChaosLens engine

This page is for **contributors** building or extending ChaosLens - the Go Monte Carlo core, WASM bridge and TypeScript fallback in `@archlens/core/resilience`.

For using ChaosLens in ArchLens Canvas, see the [product guide](./guide/chaoslens.md).

---

## Stack

| Layer           | Location                            | Role                                                                                    |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| **Go engine**   | `resilience-engine/`                | Blast radius, single point of failure detection, Monte Carlo P5, mean, and P95          |
| **WASM bridge** | `resilience-engine/wasm/`           | `chaosLensSimulate` export for the browser                                              |
| **TypeScript**  | `app/packages/core/src/resilience/` | `runResilienceSimulation`, WASM client, deterministic fallback when WASM is unavailable |

When ArchLens Canvas serves a built WASM module from `/resilience-engine/chaoslens.wasm`, simulations run 1,000 jittered trials and report P5 and P95 SLA bands. Without WASM, deterministic TypeScript propagation still runs.

---

## Prerequisites

- Go 1.22 or newer. Prefer Go 1.26.
- Mise at the repo root, with `mise run build-wasm` and `mise run test-go`.

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

This compiles `chaoslens.wasm` and copies `wasm_exec.js` into `app/packages/canvas/public/resilience-engine/`. Git ignores these artifacts. CI builds them with `pnpm build`, or the first `pnpm dev` builds them. Restart or refresh the ArchLens Canvas dev server after rebuilding.

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

`go test ./internal/sim` loads `blueprints/chaoslens-stress/large-graph-containers.yaml` and asserts default WASM Monte Carlo settings, `1000` iterations and `availabilityJitter` `0.12`, finish in under 5 seconds. The check runs through both `sim.RunMonteCarlo` and `api.RunRequest`, which is the WASM bridge path.

---

## WASM bridge

The browser loads `wasm_exec.js` + `chaoslens.wasm` and calls:

```js
const json = chaosLensSimulate(JSON.stringify(request));
```

Returns a JSON `SimulationResult` string, or `{"error":"..."}` on failure.

Request shape matches `@archlens/core/resilience` `WasmSimulationRequest`: schema, fault spec, and optional `monteCarlo`.

---

## CLI

**Product headless path:** use ArchLens CLI AdviceLens, `archlens resilience` and `.github/actions/advicelens-gate`. See [AdviceLens](./guide/advicelens.md). That runs ChaosLens simulation rules via `@archlens/core`. WASM runs when it's available, and TypeScript is the fallback.

**Go stdin `chaoslens` binary:** planned as `make build-cli` and `cmd/chaoslens`. It isn't in this repo yet. Don't treat it as shipping.

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

Exports: `computeBlastRadius`, `computeIntegrityRadius`, `detectSpofs`, `faultSpec` types, and `runResilienceSimulationAsync` on the WASM path.

`SimulationResult` includes availability, `heat` and `overallSla`, and data integrity, `integrityHeat` and `overallIntegrity`, as separate tracks. Monte Carlo jitter applies to availability only.

Canvas state: `app/packages/canvas/src/application/store/states/resilienceState.ts`.

---

## Related

- [Setup & local development](./setup.md) - Mise tasks including `build-wasm`
- [Architecture & security](./architecture.md) - `@archlens/core/resilience` in the domain layer
- [resilience-engine/README.md](../resilience-engine/README.md) - short repo-local README
