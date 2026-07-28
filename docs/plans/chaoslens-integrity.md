# ChaosLens: data integrity & async propagation

Plan for dual-track resilience simulation: **availability** (existing) and **data integrity** (new), with dependency-type-aware rules for `publish-subscribe`.

**Status:** Shipped (TypeScript core, Go/WASM engine, designer UI).

Related: [ChaosLens product guide](../guide/chaoslens.md), [ChaosLens engine](../chaoslens-engine.md).

---

## Goals

1. **Availability** (existing): synchronous dependency pressure → entry-point SLA, red heatmap.
2. **Data integrity** (new): event-stream / correctness degradation → separate score, amber heatmap, distinct advice.
3. **Dependency-type-aware propagation**: `publish-subscribe` is asymmetric; `direct-call` / `read-write` stay as today.
4. **Single source of truth** for node/edge semantics without bloating YAML.

---

## Taxonomy: core module, not schema

**Do not** add `theme` or `typeGroup` to `SystemNode` in YAML for v1.

| Approach                              | Verdict                                               |
| ------------------------------------- | ----------------------------------------------------- |
| Persist `node.theme` on every node    | Reject — duplicates `type`, drifts from CLI inference |
| Persist optional `node.role` override | Defer — only if diagrams mis-classify                 |
| **Derived taxonomy in `/core`**       | **Yes** — maps from `NodeType` / `DependencyType`     |

Module: `app/packages/core/src/taxonomy/`

### `NodeRole` (from `NodeType`)

| Role                     | Types                                                     |
| ------------------------ | --------------------------------------------------------- |
| `user-facing`            | person, web-app, mobile-app, single-page-app, gateway-api |
| `sync-service`           | microservice, rest-api, grpc-service                      |
| `async-worker`           | background-worker                                         |
| `message-infrastructure` | event-broker                                              |
| `data-store`             | database, relational-database, cache-store                |
| `serverless`             | serverless-app, serverless-function                       |
| `structural`             | group, container, component, code-module, software-system |

### `DependencySemantics` (from `DependencyType`)

| Semantics      | Types                        |
| -------------- | ---------------------------- |
| `synchronous`  | direct-call, inter-container |
| `async-stream` | publish-subscribe            |
| `data-access`  | read-write                   |

---

## Propagation model

### Availability heat (`heat`) — unchanged

- Upstream only (`buildDependents`).
- Drives `entryPointSlas`, `overallSla`, Monte Carlo.
- Safeguards: circuit breaker, bulkhead, retry, local cache.

### Integrity heat (`integrityHeat`) — new

**Publisher faults** (`from` on `publish-subscribe`):

```text
fault: domain-orders (publisher)
  integrity → data-events (broker)           severity × 1.0
  integrity → peer subscribers on topic      severity × INTEGRITY_PEER_FACTOR (0.5)
  availability → sync callers only (unchanged)
```

**Broker faults** (`to` on `publish-subscribe`):

```text
fault: data-events
  availability → all attached from-nodes (current)
  integrity → same set at full severity
```

**Constants:**

| Constant                | Value  | Meaning                                  |
| ----------------------- | ------ | ---------------------------------------- |
| `INTEGRITY_PEER_FACTOR` | `0.5`  | Siblings on topic — stale/missing stream |
| `INTEGRITY_DECAY`       | `0.65` | Reserved for multi-hop integrity chains  |

Integrity does **not** reduce entry-point SLA. Monte Carlo v1: jitter availability only; integrity deterministic.

---

## API: `SimulationResult`

```ts
interface SimulationResult {
  // existing
  heat: Map<EntityRef, number>;
  overallSla: number;
  ...

  // new
  integrityHeat: Map<EntityRef, number>;
  overallIntegrity: number;
  integrityImpactedNodes: EntityRef[];
  integrityImpactedDomains: string[];
}
```

Go/WASM JSON mirrors these fields. Missing fields → empty maps, `overallIntegrity = 100`.

---

## Safeguards & schema

**v1:** No YAML change — integrity uses graph + dependency type only.

**v2 (optional):** `deadLetterQueue`, `eventRetention` on `NodeResilience` — requires schema version bump.

---

## UI (designer)

| Surface        | Change                                            |
| -------------- | ------------------------------------------------- |
| Canvas         | `integrityHeat` amber overlay; red = availability |
| TelemetryPanel | “Data integrity” section                          |
| Advice         | Availability vs integrity strings                 |

---

## Implementation phases

| Phase | Scope                                   | Status |
| ----- | --------------------------------------- | ------ |
| 0     | Fixtures + TDD scenarios                | Done   |
| 1     | `taxonomy/` module                      | Done   |
| 2     | `integrityRadius.ts` + `simulation.ts`  | Done   |
| 3     | Designer UI                             | Done   |
| 4     | Go/WASM parity                          | Done   |
| 5     | Docs (`guide/chaoslens.md`, engine doc) | Done   |

WASM bridge still overlays TypeScript integrity only when an older `chaoslens.wasm` omits `integrityHeat` (rebuild with `mise run build-wasm`).

### Fixture

`blueprints/chaoslens-stress/pub-sub-integrity-containers.yaml`

---

## Out of v1

- `read-write` integrity (stale reads after writer fault)
- Per-topic identity beyond shared `to` entityRef
- CI gates on `overallIntegrity`
- Executive-mode business summaries for integrity

---

## Decision summary

| Question             | Decision                                 |
| -------------------- | ---------------------------------------- |
| Themes in YAML?      | No for v1                                |
| Themes in core?      | Yes — `NodeRole` + `DependencySemantics` |
| Two heat maps?       | Yes                                      |
| Change SLA formula?  | No — availability-only                   |
| Schema version bump? | Not required for v1                      |
