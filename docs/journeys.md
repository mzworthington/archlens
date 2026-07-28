# Interface tour & journeys

This page is a **day-one narrative** across ArchLens products. Visual demos live on each product guide — not duplicated here.

## Product demos

| Product             | Guide                             | Demo                                          |
| ------------------- | --------------------------------- | --------------------------------------------- |
| **ArchLens Canvas** | [Canvas](./guide/canvas.md)       | ![Canvas tour](./screenshots/canvas-tour.gif) |
| **ArchLens CLI**    | [CLI](./guide/cli.md)             | ![CLI prompts](./screenshots/cli.gif)         |
| **TraceLens**       | [TraceLens](./guide/tracelens.md) | ![TraceLens](./screenshots/tracelens.gif)     |
| **ChaosLens**       | [ChaosLens](./guide/chaoslens.md) | ![ChaosLens](./screenshots/chaoslens.gif)     |

Static PNGs for dense UI (startup chooser, Mermaid merge preview, workspace display) remain on the [canvas guide](./guide/canvas.md).

---

## Typical flow

1. Run **ArchLens CLI** against a codebase → `blueprints/*.yaml`
2. Open **ArchLens Canvas** — load sandbox, a local folder, or import Mermaid
3. Explore hierarchy (context → container → component), externals, and **TraceLens** signals
4. Toggle **ChaosLens** to simulate failures on the active diagram
5. Commit draft YAML via Pending Changes (folder workspaces) — **BlueprintSpec** is the source of truth

## Journeys by product

### Canvas

- [Opening a workspace](./guide/canvas.md#opening-a-workspace) — sandbox, folder, Mermaid, deep links
- [C4 navigation](./guide/canvas.md#c4-navigation) — drill-in, breadcrumbs, zoom out
- [Import Mermaid](./guide/canvas.md#import-mermaid) — merge preview and conflict resolution
- [Workspace display](./guide/canvas.md#workspace-display--external-dependencies) — externals, heatmap, dependency focus

### TraceLens

- [Ranked offenders](./guide/tracelens.md#in-blueprint-canvas) — `/tracelens`, refactor plan, open on canvas
- [Risk heatmap](./guide/tracelens.md#risk-heatmap-opt-in) — workspace display toggle

### ChaosLens

- [Fault injection](./guide/chaoslens.md#running-a-simulation) — Resilience mode, Simulate, blast-radius heat
- Stress scenarios ship under `blueprints/chaoslens-stress/` (e-commerce SPOF, safeguards, large graph)

### CLI

- [Interactive scan](./guide/cli.md) — prompts, glob, TraceLens opt-out
- [Headless CI](./guide/cli.md#modes) — flags for automation

---

## Contributors

Refresh product GIFs locally (`mise install` provides `ffmpeg` and `vhs`; on macOS also `brew install ttyd` for the CLI tape):

```bash
mise install
brew install ttyd   # macOS only — VHS requires a terminal server
cd app && pnpm record:docs-media   # chaoslens, tracelens, canvas-tour GIFs
cd app && pnpm test:vhs            # cli.gif
```

Outputs land in `docs/screenshots/`. CI refreshes these via **Sync Derived Outputs** (see [Setup](./setup.md#testing-formatting--quality-control)).

Designer E2E (`pnpm test:e2e`) includes a ChaosLens smoke test. See [Setup & local development](./setup.md#testing-formatting--quality-control).
