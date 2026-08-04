# Product guide

ArchLens helps teams **catch architecture risk before it becomes an outage** — model failures on living diagrams, surface code hotspots, and get a ranked fix list while design is still cheap to change.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Product             | Role                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **ArchLens Canvas** | C4 canvas (PWA): local folder authoring, Mermaid import, YAML/JSON sync, and read-only published catalogs          |
| **ArchLens**        | Static analysis that writes `blueprints/*.yaml` and can publish corpora to object storage for a shared estate view |
| **TraceLens**       | Optional (on by default) git + complexity signals attached onto nodes as `forensics`                               |
| **ChaosLens**       | Fault injection, blast-radius heatmap, and SLA telemetry on the live diagram                                       |
| **AdviceLens**      | Ranked, evidence-backed recommendations merging TraceLens + ChaosLens (studio, CLI, CI)                            |
| **BlueprintSpec**   | Declarative architecture contract - public schema URLs, `entityRef` identity, validation rules                     |
| **ChaosSpec**       | Declarative failure scenarios - public schema URLs, `diagramRef` binding, faults without duplicating topology      |

## Typical flow

1. **Install ArchLens** with the install script (`curl … | sh` on macOS/Linux) - see [Getting started](./getting-started.md).
2. Run **ArchLens** against a codebase to generate blueprint YAML (optionally **publish** from CI to object storage).
3. Open **ArchLens Canvas** - on bare `/workspace`, pick **Load sandbox** (bundled or remote catalog), open a local `blueprints/` folder, or import Mermaid.
4. Explore hierarchy (context → container → component), open Explorer → **TraceLens** for display filters and forensics, inspect signals on selected nodes.
5. Toggle **ChaosLens** in the bottom toolbar to simulate failures on the active diagram.
6. Review **AdviceLens** at [`/advicelens`](/advicelens), in TraceLens (AdviceLens tab), or the ChaosLens telemetry panel.
7. Commit draft YAML via Pending Changes (folder workspaces) - **BlueprintSpec** is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) - install ArchLens, scan a repo, open the app
- [ArchLens Canvas](./canvas.md) - startup, panels, Mermaid import, externals, display toggles
- [ArchLens](./cli.md) - scanners, flags, outputs
- [TraceLens](./tracelens.md) - metrics, coupling overlay, lookback
- [ChaosLens](./chaoslens.md) - fault injection, blast radius, SLA telemetry
- [AdviceLens](./advicelens.md) - ranked recommendations, estate CLI sweep, YAML studio export, narration (planned)
- [BlueprintSpec](./schema.md) - public contract URLs, entity references, live latest schema
- [ChaosSpec](./chaos-spec.md) - public contract URLs, diagram-bound failure scenarios, live latest schema
- [Interface tour & journeys](../journeys.md) - day-one flow across products (links to per-product demos)

## Contributor reference

For building ArchLens or extending the engine — still Markdown in this repo.

### Tech

- [Design system](../design-system.md) - visual assets & identity sandbox
- [Setup & local development](../setup.md)
- [GitHub Actions workflows](./ci-workflows.md) - every workflow, purpose, and trigger
- [Technology stack](../tech-stack.md) — React, Pulumi, Cloudflare, CI, and toolchain
- [Architecture & security](../architecture.md)
- [ChaosLens engine](../chaoslens-engine.md) - Go/WASM core, local build, contributor API
- [AdviceLens engine](../advicelens-engine.md) - recommendation pipeline, estate runner, narration contract
