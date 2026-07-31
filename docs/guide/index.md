# Product guide

ArchLens helps you **see and edit systems architecture** as living diagrams that stay faithful to **BlueprintSpec**.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Product             | Role                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **ArchLens Canvas** | Local-first (PWA) canvas for C4 diagrams, Mermaid import, property editing, and YAML/JSON sync |
| **ArchLens**        | Static analysis that discovers systems/containers/components and writes `blueprints/*.yaml`    |
| **TraceLens**       | Optional (on by default) git + complexity signals attached onto nodes as `forensics`           |
| **ChaosLens**       | Fault injection, blast-radius heatmap, and SLA telemetry on the live diagram                   |
| **AdviceLens**      | Ranked, evidence-backed recommendations merging TraceLens + ChaosLens (studio, CLI, CI)        |
| **BlueprintSpec**   | Declarative architecture contract - public schema URLs, `entityRef` identity, validation rules |

## Typical flow

1. **Install ArchLens** with the install script (`curl … | sh` on macOS/Linux) - see [Getting started](./getting-started.md).
2. Run **ArchLens** against a codebase to generate blueprint YAML.
3. Open **ArchLens Canvas** - on bare `/workspace`, pick **Load sandbox** (bundled demo), open a local `blueprints/` folder, or import Mermaid.
4. Explore hierarchy (context → container → component), manage externals / display filters, inspect **TraceLens** signals.
5. Toggle **ChaosLens** in the bottom toolbar to simulate failures on the active diagram.
6. Review **AdviceLens** recommendations in TraceLens (Recommendations tab) or the ChaosLens telemetry panel.
7. Commit draft YAML via Pending Changes (folder workspaces) - **BlueprintSpec** is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) - install ArchLens, scan a repo, open the app
- [ArchLens Canvas](./canvas.md) - startup, panels, Mermaid import, externals, display toggles
- [ArchLens](./cli.md) - scanners, flags, outputs
- [TraceLens](./tracelens.md) - metrics, coupling overlay, lookback
- [ChaosLens](./chaoslens.md) - fault injection, blast radius, SLA telemetry
- [AdviceLens](./advicelens.md) - ranked recommendations, estate CLI sweep, narration (planned)
- [BlueprintSpec](./schema.md) - public contract URLs, entity references, live latest schema
- [Design system](./design-system.md) - visual assets & identity sandbox

## Contributor reference

For building ArchLens or extending the engine - still Markdown in this repo:

- [Setup & local development](../setup.md)
- [ChaosLens engine](../chaoslens-engine.md) - Go/WASM core, local build, contributor API
- [AdviceLens engine](../advicelens-engine.md) - recommendation pipeline, estate runner, narration contract
- [Architecture & security](../architecture.md)
- [Interface tour & journeys](../journeys.md) - day-one flow across products (links to per-product demos)
