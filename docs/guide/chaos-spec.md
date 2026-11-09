# ChaosSpec

**ChaosSpec** is the failure-scenario format ChaosLens, AdviceLens, and CI use to describe what-if faults against a BlueprintSpec diagram. This page is for teams integrating with that contract. You can author scenarios by hand, export them from **ArchLens Canvas**, or load them in `archlens resilience`. It covers the **JSON Schema** validation surface and how scenarios bind to diagrams through **`diagramRef`**.

ChaosSpec doesn't duplicate topology. It references an existing BlueprintSpec diagram and lists faults, plus optional safeguard overrides, against that diagram's `entityRef` values.

## What a ChaosSpec file contains

Every chaos-spec file describes one named failure scenario. It names the diagram it targets, the nodes that fault, and the optional safeguard overrides and Monte Carlo settings. ChaosSpec keeps these properties:

- The same file loads in the ArchLens Canvas ChaosSpec dialog, validates against the public JSON Schema, and runs in headless AdviceLens sweeps.
- External tools can validate ChaosSpec without running ArchLens, by pointing at a public schema URL.
- Topology stays in BlueprintSpec. Scenarios stay small, reviewable, and version-controlled under `chaos-specs/`.
- Breaking changes are rare and versioned. Non-breaking additions ship on the `latest` channel.

`@archlens/core` defines the rules once, in `chaosSpecDocument`, and publishes them as JSON Schema for editors and integrators.

## Binding to a diagram

### Purpose

A ChaosSpec targets exactly one BlueprintSpec diagram. Display names in `metadata.name` are for people. **`metadata.diagramRef` is for linking**.

Use `diagramRef` to do three things.

- **Anchor the scenario** to the diagram whose nodes and dependencies the simulation reads.
- **Reject mismatched loads.** Canvas and estate runners refuse a spec when the active or scanned diagram's `entityRef` doesn't equal `diagramRef`.
- **Keep scenarios portable.** The same YAML works in Canvas import, repo fixtures, and `archlens resilience --chaos-specs=…` without embedding a copy of the graph.

`diagramRef` must equal the target diagram's `metadata.entityRef`. The same rules apply as for BlueprintSpec entity references.

### Fault targets

Each fault's `nodeId` is an **`entityRef`** that appears on that diagram as a node, or as an endpoint of a dependency, so the simulation can target external proxies in the closure. Prefer fully qualified refs that match the blueprint.

### Practical guidance for integrators

- Use one scenario file per named game-day or CI probe, and keep `faults` focused.
- Prefer **stable BlueprintSpec refs** already committed in `blueprints/`. Don't invent parallel IDs.
- Pin the **ChaosSpec URL** below in consumer pipelines so validation behaviour doesn't shift unexpectedly.
- When AdviceLens or Canvas rejects a load, check `diagramRef` first, then whether each `nodeId` exists on that diagram.

## Document shape

| Field        | Required | Meaning                                                                                                |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `version`    | yes      | Public ChaosSpec JSON Schema URL, on the `v1` or `latest` channel                                      |
| `metadata`   | yes      | `name`, `diagramRef`, and optional `description`                                                       |
| `faults`     | yes      | At least one fault: `nodeId`, `faultType`, optional `severity` from 0 to 1, and per-fault `safeguards` |
| `safeguards` | no       | Map of `entityRef` to safeguard toggles applied for the run. These override or supplement node YAML.   |
| `monteCarlo` | no       | `iterations`, optional `seed`, and optional `severityJitter` from 0 to 1 for trial bands               |

### Fault types and default severity

When you omit `severity`, these defaults apply.

| `faultType`     | Default severity |
| --------------- | ---------------- |
| `region-outage` | `1.0`            |
| `error-rate`    | `0.8`            |
| `packet-loss`   | `0.6`            |
| `latency`       | `0.4`            |

### Safeguards

The flags match BlueprintSpec node `resilience` and the ChaosLens UI.

- `circuitBreaker`
- `bulkhead`
- `retry`
- `localCache`

Document-level `safeguards` apply across the run. A fault may also carry its own `safeguards` block.

## Public ChaosSpec URLs

| Channel                           | URL                                                     | Use when                                               |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| **Versioned, preferred for pins** | `https://archlens.dev/schemas/v1/chaos.schema.json`     | External repos that shouldn't break on ChaosSpec bumps |
| **Tracking channel**              | `https://archlens.dev/schemas/latest/chaos.schema.json` | Tracking ChaosSpec on `main`                           |

Locally, and on this docs site, the same paths are available under the app origin.

- `/schemas/v1/chaos.schema.json`
- `/schemas/latest/chaos.schema.json`

Contributors regenerating checked-in schema files, pre-commit checks, and major version bumps should read [Setup and local development](../setup.md#chaosspec-json-schema).

## Pointing an editor at ChaosSpec

Each chaos-spec file sets `version` to the public ChaosSpec URL. Writers also emit an IDE directive.

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

Repo fixtures live under [`chaos-specs/`](../../chaos-specs/). One example is `chaos-specs/payment-outage.yaml`.

## Live ChaosSpec channel

The block below fetches the tracking ChaosSpec served with this app and pretty-prints it. Refresh the page after a new deploy to see updates on the hosted site.

```live-schema
chaos latest
```

## Using ChaosSpec in products

| Surface             | How                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ArchLens Canvas** | **Open, then Browse ChaosSpecs** for catalog navigate and load. **Load ChaosSpec** for paste or upload. Export, or use the ChaosLens panel **Browse** and **Paste YAML**. |
| **ChaosLens**       | Load a scenario onto the active diagram. Export the current multi-fault setup as YAML.                                                                                    |
| **AdviceLens CLI**  | `archlens resilience ./blueprints --chaos-specs=./chaos-specs`                                                                                                            |
| **Library**         | `parseChaosSpecFromYaml`, then `chaosSpecDocumentToRuntime`, then `runResilienceSimulation` from `@archlens/core/resilience`                                              |

Validation against the active diagram uses `validateChaosSpecForDiagram(doc, schema, diagramRef)`.

## ChaosSpec and BlueprintSpec

| Concern                                   | BlueprintSpec                                                                                | ChaosSpec                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| What it stores                            | Topology, layout, forensics, and node `resilience`                                           | Named faults and optional run overrides                |
| Identity field                            | `metadata.entityRef`                                                                         | `metadata.diagramRef`, which points at a BlueprintSpec |
| Public schema major                       | `v4` today                                                                                   | `v1` today                                             |
| Editable source of truth for architecture | Yes. See the [YAML decision record](../ADRs/0001-yaml-blueprintspec-as-canonical-format.md). | No. Scenarios only.                                    |

## Next

- [ChaosLens](./chaoslens.md) for running simulations in Canvas
- [AdviceLens](./advicelens.md) for estate sweeps that consume `chaos-specs/`
- [BlueprintSpec](./schema.md) for `entityRef` and diagram identity
- [ChaosLens engine](../chaoslens-engine.md) for the Go and WASM core, aimed at contributors
