# Product guide

ArchLens helps teams **catch architecture risk before it becomes an outage** - model failures on living diagrams, surface code hotspots, and get a ranked fix list while design is still cheap to change.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Product             | Role                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **ArchLens Canvas** | C4 canvas (PWA): local folder authoring, Mermaid import, YAML/JSON sync, and read-only published catalogs          |
| **ArchLens CLI**    | Static analysis that writes `blueprints/*.yaml` and can publish corpora to object storage for a shared estate view |
| **TraceLens**       | Optional (on by default) git + complexity signals attached onto nodes as `forensics`                               |
| **ChaosLens**       | Fault injection, blast-radius heatmap, and SLA telemetry on the live diagram                                       |
| **AdviceLens**      | Ranked, evidence-backed recommendations merging TraceLens + ChaosLens (studio, CLI, CI)                            |
| **BlueprintSpec**   | Declarative architecture contract - public schema URLs, `entityRef` identity, validation rules                     |
| **ChaosSpec**       | Declarative failure scenarios - public schema URLs, `diagramRef` binding, faults without duplicating topology      |

## Typical flow

1. Open **ArchLens Canvas** at `/workspace` - the **startup chooser** appears (nothing auto-loads). Pick **Try the demo** for ChaosLens insight, or **Browser lite scan** for a quick structural map of a local folder.
2. When you need TraceLens/git forensics or CI publish, **install ArchLens CLI** (`curl … | bash` on macOS/Linux) - see [Getting started](./getting-started.md).
3. Run **ArchLens CLI** against a codebase to generate blueprint YAML (optionally **publish** from CI to object storage).
4. Return to Canvas and choose **Open existing blueprints folder**, or keep exploring the demo. Import Mermaid/IaC from the toolbar **Open** menu once a diagram is active.
5. Explore hierarchy (context → container → component), open Explorer → **TraceLens** for display filters and forensics, inspect signals on selected nodes.
6. Toggle **ChaosLens** in the bottom toolbar to simulate failures on the active diagram.
7. Review **AdviceLens** at [`/workspace?lens=advicelens`](/workspace?lens=advicelens), in TraceLens (AdviceLens tab), or the ChaosLens telemetry panel.
8. Commit draft YAML via Pending Changes (folder workspaces) - **BlueprintSpec** is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) - demo → browser scan → CLI install
- [ArchLens Canvas](./canvas.md) - startup chooser, panels, Mermaid import, externals, display toggles
- [ArchLens CLI](./cli.md) - scanners, flags, outputs, [declare then scan](./cli.md#declare-then-scan), [meaningful IaC externals](./cli.md#meaningful-external-dependencies)
- [TraceLens](./tracelens.md) - metrics, coupling overlay, lookback
- [ChaosLens](./chaoslens.md) - fault injection, blast radius, SLA telemetry
- [AdviceLens](./advicelens.md) - ranked recommendations, estate CLI sweep, YAML studio export, narration stub (Phase 5)
- [BlueprintSpec](./schema.md) - public contract URLs, entity references, [declared system context](./schema.md#declared-system-context) (incl. infra spokes)
- [ChaosSpec](./chaos-spec.md) - public contract URLs, diagram-bound failure scenarios, live latest schema
- [Interface tour & journeys](../journeys.md) - day-one flow across products (links to per-product demos)

## Contributor reference

For building ArchLens or extending the engine - still Markdown in this repo.

### Tech

- [Design system](../design-system.md) - visual assets & identity sandbox
- [Setup & local development](../setup.md)
- [GitHub Actions workflows](./ci-workflows.md) - every workflow, purpose, and trigger
- [Technology stack](../tech-stack.md) - React, Pulumi, Cloudflare, CI, and toolchain
- [Architecture & security](../architecture.md)
- [ChaosLens engine](../chaoslens-engine.md) - Go/WASM core, local build, contributor API
- [AdviceLens engine](../advicelens-engine.md) - recommendation pipeline, estate runner, narration contract
