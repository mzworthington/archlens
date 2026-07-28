# Product guide

ArchLens helps you **see and edit systems architecture** as living diagrams that stay faithful to **BlueprintSpec**.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Product             | Role                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **ArchLens Canvas** | Local-first (PWA) canvas for C4 diagrams, Mermaid import, property editing, and YAML/JSON sync |
| **Blueprint CLI**   | Static analysis that discovers systems/containers/components and writes `blueprints/*.yaml`    |
| **TraceLens**       | Optional (on by default) git + complexity signals attached onto nodes as `forensics`           |
| **ChaosLens**       | Fault injection, blast-radius heatmap, and SLA telemetry on the live diagram                   |
| **BlueprintSpec**   | Declarative architecture contract — public schema URLs, `entityRef` identity, validation rules |

## Typical flow

1. Run **Blueprint CLI** against a codebase to generate blueprint YAML.
2. Open **ArchLens Canvas** — on bare `/workspace`, pick **Load sandbox** (bundled demo), open a local `blueprints/` folder, or import Mermaid.
3. Explore hierarchy (context → container → component), manage externals / display filters, inspect **TraceLens** signals.
4. Toggle **ChaosLens** in the bottom toolbar to simulate failures on the active diagram.
5. Commit draft YAML via Pending Changes (folder workspaces) — **BlueprintSpec** is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) — install Blueprint CLI, scan a repo, open the app
- [ArchLens Canvas](./canvas.md) — startup, panels, Mermaid import, externals, display toggles
- [Blueprint CLI](./cli.md) — scanners, flags, outputs
- [TraceLens](./tracelens.md) — metrics, coupling overlay, lookback
- [ChaosLens](./chaoslens.md) — fault injection, blast radius, SLA telemetry
- [BlueprintSpec](./schema.md) — public contract URLs, entity references, live latest schema
- [Design system](./design-system.md) — visual assets & identity sandbox

## Contributor reference

For building ArchLens or extending the engine — still Markdown in this repo:

- [Setup & local development](../setup.md)
- [ChaosLens engine](../chaoslens-engine.md) — Go/WASM core, local build, contributor API
- [Architecture & security](../architecture.md)
- [Interface tour & journeys](../journeys.md) — day-one flow across products (links to per-product demos)
