# ChaosLens resilience simulation engine (Go)

Monte Carlo blast-radius simulation for Blueprint. The same Go code compiles to:

- **WebAssembly** for the designer (`chaoslens.wasm`)
- **CLI** for headless CI checks (`chaoslens`)

Contributor docs: [docs/chaoslens-engine.md](../docs/chaoslens-engine.md). Product guide: [docs/guide/resilience.md](../docs/guide/resilience.md).

## Prerequisites

- Go 1.22+ (1.26 recommended)

## Commands

```bash
# Unit tests
make test

# CI / pre-commit checks (gofmt, go vet)
make check

# Build WASM + copy into designer public assets (local dev + CI build)
make copy-wasm
make ensure-wasm   # copy only when artifacts are missing

# Build native CLI binary
make build-cli
```

## CLI usage

Pipe a simulation request JSON on stdin:

```bash
cat request.json | ./dist/chaoslens
./dist/chaoslens -monte-carlo 2000 -seed 42 < request.json
```

Request shape matches `@blueprint/core/resilience` `WasmSimulationRequest` (schema + spec + optional `monteCarlo`).

## WASM bridge

The browser loads `wasm_exec.js` + `chaoslens.wasm` and calls:

```js
const json = chaosLensSimulate(JSON.stringify(request));
```

Returns a JSON `SimulationResult` string (or `{"error":"..."}` on failure).

## Architecture

```
internal/graph   — group boundary expansion for dependencies
internal/sim     — blast radius, SPOF detection, Monte Carlo
api              — JSON request/response entry
wasm             — syscall/js export for designer
cmd/chaoslens    — stdin/stdout CLI
```

TypeScript in `@blueprint/core/resilience` keeps a deterministic fallback when WASM is unavailable.
