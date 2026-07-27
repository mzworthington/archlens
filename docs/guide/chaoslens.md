# ChaosLens

**ChaosLens** simulates **what-if failures** on the architecture you already have open in Blueprint canvas — without a separate diagram or route. ChaosLens runs on the normal workspace canvas against the active diagram.

Results are **illustrative**: statistical availability bands from simplified propagation, not production SLO guarantees.

## Turning it on

1. Open **`/workspace`** and load a diagram (sandbox, folder, or deep link).
2. In the **bottom toolbar**, click **Resilience** (shield icon) to open ChaosLens.
3. The header badge switches to **CHAOSLENS** and the right panel shows fault controls + telemetry instead of property editing.

Click **Resilience** again to exit ChaosLens. Simulation state and safeguard toggles are cleared.

## Running a simulation

1. **Select a node** on the canvas (single click — use the **Zoom** button or double-click to drill into child diagrams).
2. In the right panel, choose:
   - **Fault type** — high latency, 5xx error rate, packet loss, or region outage
   - **Severity** — 0–100% slider
   - **Safeguards** — circuit breaker, bulkhead, retry, local cache (session toggles on the selected node)
3. Click **Simulate** in the bottom toolbar.

The right panel opens if it was collapsed. Re-run after changing fault or safeguards.

When the Monte Carlo engine is available, telemetry also shows **P5 / mean / P95** SLA bands from jittered trials (typically 1,000 runs). Without WASM, the TypeScript fallback runs the same propagation rules (including group boundaries) and reports a single overall SLA.

## What the simulation models

Dependencies use Blueprint’s usual direction: `{ from: 'web', to: 'api' }` means **Web calls API**.

Failures propagate **upstream** to callers (who depend on the faulted node), not downstream to dependencies.

| Step            | Behavior                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| Origin          | Faulted node gets base severity (region outage ≈ 100%, latency ≈ 40%, etc.) |
| Propagation     | Each hop upstream multiplies severity by **0.75**                           |
| Circuit breaker | Stops propagation above that node; node still shows local impact            |
| Local cache     | Halves incoming severity on that caller                                     |
| Retry           | Amplifies severity by **×1.2** (retries worsen cascades)                    |
| Bulkhead        | Caps propagation to **2 hops** past that node                               |

**Entry points** are nodes nothing else depends on (top of the call chain). Each entry point’s SLA is `(1 − heat) × 100%`. **Overall SLA** is the average across entry points.

**SPOFs** (single points of failure) are dependencies with **two or more callers** and no circuit breaker recorded on the node (see schema below).

## On the canvas

After simulation:

- Nodes tint **red** by blast heat (display-only — YAML is unchanged).
- The **fault target** gets an orange border.
- **SPOF** nodes get an amber label.
- The **Risk heatmap** (TraceLens) is suppressed while ChaosLens is active.

Heat is transient canvas styling, same pattern as the TraceLens hotspot overlay.

## Right panel telemetry

| Section                      | Meaning                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **SLA / SLO**                | Overall and per-entry-point availability after the fault                      |
| **Monte Carlo**              | When available — mean, P5, and P95 SLA across jittered trials                 |
| **Single points of failure** | Shared dependencies lacking circuit breakers (structural, not fault-specific) |
| **Impacted domains**         | First path segment of impacted `entityRef` values                             |
| **Resilience advice**        | Rule-generated suggestions (SPOFs, contained blast radius, high-impact nodes) |

## Persisting safeguards in YAML (optional)

UI safeguard toggles are **session-only**. To record circuit breakers in the schema, add JSON on the node’s `properties`:

```yaml
nodes:
  - entityRef: shop/api
    name: API Gateway
    type: gateway-api
    properties:
      resilience: '{"safeguards":{"circuitBreaker":true}}'
```

The simulation reads `properties.resilience` when no UI override exists for that node.

## Limitations (today)

- One fault target per run
- No saved chaos specs or export yet
- No headless CLI / CI gate in the product yet
- No OpenTelemetry import
- SLA numbers are heuristic, not queue/timeout/pool modeling
- Executive-mode business summaries are planned for a later iteration

## Next

- [Blueprint canvas](./canvas.md) — panels, display toggles, navigation
- [TraceLens](./tracelens.md) — hotspot heatmap (disabled during ChaosLens)
- [BlueprintSpec](./schema.md) — `dependencies` and `entityRef` rules
- [ChaosLens engine](../chaoslens-engine.md) — Go/WASM engine, local WASM build, core API (contributors)
