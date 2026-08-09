# ChaosLens resilience simulation engine (Go)

Monte Carlo blast-radius simulation for ArchLens (ChaosLens). The Go code compiles to:

- **WebAssembly** for ArchLens Canvas (`chaoslens.wasm`)
- **(Planned)** native stdin/stdout CLI (`cmd/chaoslens`) - not checked in yet

**Product headless / CI path today:** `archlens resilience` and `.github/actions/advicelens-gate` (AdviceLens), which call the same simulation rules via `@archlens/core` (WASM when available, TypeScript fallback otherwise). See [AdviceLens](../docs/guide/advicelens.md).

Contributor docs: [docs/chaoslens-engine.md](../docs/chaoslens-engine.md). Product guide: [docs/guide/chaoslens.md](../docs/guide/chaoslens.md).

## Prerequisites

- Go 1.22+ (1.26 recommended)

## Commands

```bash
# Unit tests
make test

# CI / pre-commit checks (gofmt, go vet)
make check

# Build WASM + copy into canvas public assets (local dev + CI build)
make copy-wasm
make ensure-wasm   # copy only when artifacts are missing

# Reserved - fails until cmd/chaoslens lands
# make build-cli
```

## WASM bridge

The browser loads `wasm_exec.js` + `chaoslens.wasm` and calls:

```js
const json = chaosLensSimulate(JSON.stringify(request));
```

Returns a JSON `SimulationResult` string (or `{"error":"..."}` on failure).

## Architecture

```
internal/graph   - group boundary expansion for dependencies
internal/sim     - blast radius, SPOF detection, Monte Carlo
api              - JSON request/response entry
wasm             - syscall/js export for Canvas
cmd/chaoslens    - planned stdin/stdout CLI (not in tree)
```

TypeScript in `@archlens/core/resilience` keeps a deterministic fallback when WASM is unavailable.
