# Product guide

ArchLens is Canvas, a CLI, and lenses on **BlueprintSpec**. The YAML in git is the map. Scan a repository, overlay git hotspots, simulate a failure, and get a ranked list.

Use this guide for the product, not the internals.

## What you get

| Product             | Role                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ArchLens Canvas** | Interactive Canvas and a progressive web app for local folder authoring, live share rooms, Mermaid import, diagrams that stay in sync, and read-only published catalogs |
| **ArchLens CLI**    | Static analysis that writes BlueprintSpec and can publish corpora to object storage for a shared estate view                                                            |
| **TraceLens**       | Git and complexity signals on nodes as `forensics`. On by default. You can turn it off.                                                                                 |
| **ChaosLens**       | Fault injection, a blast-radius heatmap, and Service Level Agreement (SLA) telemetry on the live diagram                                                                |
| **AdviceLens**      | Ranked recommendations from TraceLens and ChaosLens, in the studio, the CLI, and CI                                                                                     |
| **BlueprintSpec**   | Architecture as code: opinionated YAML, a public schema, and `entityRef` identity. Diagrams are a view of the file.                                                     |
| **ChaosSpec**       | Failure scenarios: public schema URLs, a `diagramRef` binding, and faults that don't duplicate topology                                                                 |

## Typical flow

1. Open **ArchLens Canvas** at `/workspace`. The startup chooser appears, and nothing loads on its own. Pick **Investigate**, **Collaborate**, or **Ideate**, or use **Try the demo** for a ChaosLens run. **Collaborate** copies a live editing link with named cursors and an optional room secret. Disk commit stays on Pending Changes.
2. When you need TraceLens git forensics or a CI publish, install the ArchLens CLI. See [Getting started](../tutorials/getting-started.md).
3. Run the CLI against a codebase to generate BlueprintSpec. You can also publish from CI to object storage.
4. Return to Canvas and choose **Open existing blueprints folder**, or keep exploring the demo. Import Mermaid or IaC from the toolbar **Open** menu once a diagram is active.
5. Move through context, container, and component. Open Explorer, then **TraceLens**, for display filters and forensics, and inspect signals on the selected node.
6. Toggle **ChaosLens** in the bottom toolbar to simulate failures on the active diagram.
7. Review **AdviceLens** at [`/workspace?lens=advicelens`](/workspace?lens=advicelens), on the AdviceLens tab in TraceLens, or in the ChaosLens telemetry panel.
8. Commit drafts via Pending Changes on folder workspaces. **BlueprintSpec** is the architecture contract.

## Guide chapters

- [Getting started](../tutorials/getting-started.md) - scan a repository and open the first diagram
- [CLI reference](../reference/cli.md) - commands, flags, defaults, and exit codes
- [Config schema](../reference/config-schema.md) - `blueprint.config.json` keys
- [Container diagrams in GitHub Actions](../how-to/github-actions-c4.md)
- [Configure monorepo boundaries](../how-to/monorepo-boundaries.md)
- [Architecture concepts](../explanation/architecture-concepts.md)
- [Jobs for today](./jobs.md) - pick a job: demo, share, Mermaid, scan, catalog, ChaosLens, AdviceLens, or CI
- [ArchLens Canvas](./canvas.md) - startup chooser, panels, Mermaid import, externals, and display toggles
- [Collaborate](./collaborate.md) - share, rooms, and comments. [Send this page](https://archlens.dev/guide/collaborate).
- [ArchLens CLI](./cli.md) - scanners, flags, outputs, [declare then scan](./cli.md#declare-then-scan), and [meaningful IaC externals](./cli.md#meaningful-external-dependencies)
- [TraceLens](./tracelens.md) - metrics, coupling overlay, and lookback
- [ChaosLens](./chaoslens.md) - fault injection, blast radius, and SLA telemetry
- [AdviceLens](./advicelens.md) - ranked recommendations, an estate CLI sweep, studio export, and the narration stub in Phase 5
- [BlueprintSpec](./schema.md) - public contract URLs, entity references, and [declared system context](./schema.md#declared-system-context), including infra spokes
- [ChaosSpec](./chaos-spec.md) - public contract URLs, diagram-bound failure scenarios, and the current schema
- [Interface tour and journeys](../journeys.md) - day-one flow across products, with links to per-product demos

## Contributor reference

For building ArchLens or extending the engine. These pages stay Markdown in this repo.

### Tech

- [Design system](../design-system.md) - visual assets and the identity sandbox
- [Setup and local development](../setup.md)
- [GitHub Actions workflows](./ci-workflows.md) - every workflow, its purpose, and its trigger
- [Editor extension](./vscode.md) - local sandbox, VSIX sideload, and manual pre-release for VS Code and Cursor
- [Technology stack](../tech-stack.md) - React, Pulumi, Cloudflare, CI, and the toolchain
- [Architecture and security](../architecture.md)
- [ChaosLens engine](../chaoslens-engine.md) - Go and WebAssembly (WASM) core, local build, and the contributor API
- [AdviceLens engine](../advicelens-engine.md) - recommendation pipeline, estate runner, and narration contract
