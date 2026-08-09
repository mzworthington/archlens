# ChaosSpec

**ChaosSpec** is the declarative failure-scenario format - the shared contract ChaosLens, AdviceLens, and CI use to describe what-if faults against a BlueprintSpec diagram. This page is for teams integrating with ChaosSpec YAML: whether you author game-day scenarios by hand, export them from **ArchLens Canvas**, or load them in `archlens resilience`. It explains the **JSON Schema** validation surface and how scenarios bind to diagrams via **`diagramRef`**.

ChaosSpec does **not** duplicate topology. It references an existing BlueprintSpec diagram and lists faults (and optional safeguard overrides) against that diagram’s `entityRef`s.

---

## What ChaosSpec guarantees

Every chaos-spec file describes one named failure scenario: which diagram it targets, which nodes fault, and (optionally) safeguard overrides and Monte Carlo settings. ChaosSpec ensures that:

- The same file loads in ArchLens Canvas (ChaosSpec dialog), validates against public JSON Schema, and runs in headless AdviceLens sweeps.
- External tools can validate YAML without running ArchLens - by pointing at a public ChaosSpec URL.
- Topology stays in BlueprintSpec; scenarios stay small, reviewable, and version-controlled under `chaos-specs/`.
- Breaking changes are rare and versioned; non-breaking additions ship on the `latest` channel.

Under the hood, rules are defined once in `@archlens/core` (`chaosSpecDocument`) and published as JSON Schema for editors and integrators.

---

## Binding to a diagram (`diagramRef`)

### Purpose

A ChaosSpec targets exactly one BlueprintSpec diagram. Display names (`metadata.name`) are for people; **`metadata.diagramRef` is for linking**.

We use it to:

- **Anchor the scenario** to the diagram whose nodes and dependencies the simulation will read.
- **Reject mismatched loads** - Canvas and estate runners refuse a spec when the active (or scanned) diagram’s `entityRef` does not equal `diagramRef`.
- **Keep scenarios portable** - the same YAML works in Canvas import, repo fixtures, and `archlens resilience --chaos-specs=…` without embedding a copy of the graph.

`diagramRef` must equal the target diagram’s `metadata.entityRef` (same rules as BlueprintSpec entity references).

### Fault targets (`nodeId`)

Each fault’s `nodeId` is an **`entityRef`** that appears on that diagram as a node, or as an endpoint of a dependency (so external proxies in the simulation closure can be targeted). Prefer fully qualified refs that match the blueprint.

### Practical guidance for integrators

- One scenario file per named game-day or CI probe; keep `faults` focused.
- Prefer **stable BlueprintSpec refs** already committed in `blueprints/` - do not invent parallel IDs.
- Pin the **ChaosSpec URL** (below) in consumer pipelines so validation behaviour does not shift unexpectedly.
- When AdviceLens or Canvas rejects a load, check `diagramRef` first, then whether each `nodeId` exists on that diagram.

---

## Document shape

| Field        | Required | Meaning                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `version`    | yes      | Public ChaosSpec JSON Schema URL (`v1` or `latest` channel)                                     |
| `metadata`   | yes      | `name`, `diagramRef`, optional `description`                                                    |
| `faults`     | yes      | At least one fault: `nodeId`, `faultType`, optional `severity` (0-1) and per-fault `safeguards` |
| `safeguards` | no       | Map of `entityRef` → safeguard toggles applied for the run (overrides / supplements node YAML)  |
| `monteCarlo` | no       | `iterations`, optional `seed`, optional `severityJitter` (0-1) for trial bands                  |

### Fault types and default severity

When `severity` is omitted, defaults apply:

| `faultType`     | Default severity |
| --------------- | ---------------- |
| `region-outage` | `1.0`            |
| `error-rate`    | `0.8`            |
| `packet-loss`   | `0.6`            |
| `latency`       | `0.4`            |

### Safeguards

Same flags as BlueprintSpec node `resilience` / ChaosLens UI:

- `circuitBreaker`
- `bulkhead`
- `retry`
- `localCache`

Document-level `safeguards` apply across the run; a fault may also carry its own `safeguards` block.

---

## Public ChaosSpec URLs

| Channel                            | URL                                                     | Use when                                                |
| ---------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| **Versioned (preferred for pins)** | `https://archlens.dev/schemas/v1/chaos.schema.json`     | External repos that should not break on ChaosSpec bumps |
| **Latest**                         | `https://archlens.dev/schemas/latest/chaos.schema.json` | Tracking ChaosSpec on `main`                            |

Locally (and on this docs site), the same paths are available under the app origin:

- `/schemas/v1/chaos.schema.json`
- `/schemas/latest/chaos.schema.json`

Contributors: regenerating checked-in schema files, pre-commit checks, and major version bumps - [Setup & local development](../setup.md#chaosspec-json-schema).

---

## Pointing an editor at ChaosSpec

Each chaos-spec file sets `version` to the public ChaosSpec URL. Writers also emit an IDE directive:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/chaos.schema.json
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Payment and database compound outage
  description: Game-day scenario with two simultaneous faults.
  diagramRef: chaoslens-stress/ecommerce
faults:
  - nodeId: chaoslens-stress/ecommerce/payment
    faultType: region-outage
  - nodeId: chaoslens-stress/ecommerce/db
    faultType: error-rate
    severity: 0.6
safeguards:
  chaoslens-stress/ecommerce/api:
    circuitBreaker: true
    localCache: true
monteCarlo:
  iterations: 1000
  severityJitter: 0.15
  seed: 42
```

Repo fixtures live under [`chaos-specs/`](../../chaos-specs/). Example: `chaos-specs/payment-outage.yaml`.

## Live ChaosSpec (latest)

The block below fetches the **latest** ChaosSpec served with this app and pretty-prints it. Refresh the page after a new deploy to see updates on the hosted site.

```live-schema
chaos latest
```

## Using ChaosSpec in products

| Surface             | How                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ArchLens Canvas** | **Open → Browse ChaosSpecs** (catalog → navigate + load), **Load ChaosSpec** (paste/upload), Export, or the ChaosLens panel **Browse** / **Paste YAML** |
| **ChaosLens**       | Load a scenario onto the active diagram; export the current multi-fault setup as YAML                                                                   |
| **AdviceLens CLI**  | `archlens resilience ./blueprints --chaos-specs=./chaos-specs`                                                                                          |
| **Library**         | `parseChaosSpecFromYaml` → `chaosSpecDocumentToRuntime` → `runResilienceSimulation` from `@archlens/core/resilience`                                    |

Validation against the active diagram: `validateChaosSpecForDiagram(doc, schema, diagramRef)`.

## ChaosSpec vs BlueprintSpec

| Concern                                   | BlueprintSpec                                                            | ChaosSpec                                         |
| ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| What it stores                            | Topology, layout, forensics, node `resilience`                           | Named faults + optional run overrides             |
| Identity field                            | `metadata.entityRef`                                                     | `metadata.diagramRef` (points at a BlueprintSpec) |
| Public schema major                       | `v4` today                                                               | `v1` today                                        |
| Editable source of truth for architecture | Yes ([ADR-0001](../ADRs/0001-yaml-blueprintspec-as-canonical-format.md)) | No - scenarios only                               |

## Next

- [ChaosLens](./chaoslens.md) - running simulations on the canvas
- [AdviceLens](./advicelens.md) - estate sweeps that consume `chaos-specs/`
- [BlueprintSpec](./schema.md) - `entityRef` and diagram identity
- [ChaosLens engine](../chaoslens-engine.md) - Go/WASM core (contributors)
