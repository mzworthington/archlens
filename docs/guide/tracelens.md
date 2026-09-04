# TraceLens

**TraceLens** attaches **git signals** (churn, authors, temporal coupling), **structural metrics** (AST complexity, LOC) and **blueprint connections** (schema dependencies, import/coupling overlays) to architecture nodes.

![TraceLens ranked offenders](../screenshots/tracelens.gif)

Git analysis is **on by default** in ArchLens CLI. Pass `--no-git` to skip; set window with `--git-since=365` (days).

## What is stored

On component nodes (joined by `properties.filepath`):

| Field                              | Meaning                                            |
| ---------------------------------- | -------------------------------------------------- |
| `complexity`                       | Cyclomatic complexity from the AST                 |
| `loc` / `sloc`                     | Lines / source lines of code                       |
| `churn`                            | Edits in the lookback window                       |
| `authorCount` / `topAuthorPercent` | Ownership concentration                            |
| `authors`                          | Per-author commit counts in the lookback window    |
| `hotspotScore`                     | Relative risk from complexity × churn              |
| `hotspotScoreByWeek`               | Weekly relative hotspotScore (oldest week first)   |
| `classifications`                  | e.g. `hotspot`, `knowledge-silo`                   |
| `coupledFiles`                     | Temporally coupled peers (scores + shared commits) |
| `sinceDays`                        | Lookback window used for this run                  |

Containers and context systems get **rollups** (`fileCount`, `hotspotCount`, `knowledgeSiloCount`, max/sum metrics, and the same `sinceDays`).

Example YAML fragment:

```yaml
forensics:
  complexity: 22
  churn: 8
  hotspotScore: 0.9
  sinceDays: 90
  hotspotScoreByWeek: [0.1, 0.2, 0.4, 0.9]
  classifications:
    - hotspot
  coupledFiles:
    - path: src/other.ts
      score: 0.8
      sharedCommits: 6
```

## In ArchLens Canvas

### Explorer panel (TraceLens tab)

Open the **Explorer** panel on the left (chevron rail on desktop, **Explorer** chip on mobile). Select the **TraceLens** tab for architecture signal tools:

- **Workspace display** - test components, externals, dependency focus, risk heatmap, coupling lens
- **Node details** - select a canvas node for git metrics, schema dependencies, coupled/import peers, and mini-graph
- **View worst offenders** - opens the full **TraceLens** estate page

The **Schema** tab in the same panel shows YAML / JSON / Mermaid for the active diagram (Mermaid is export-only).

### TraceLens estate (full page)

Open **`/workspace?lens=tracelens`** (header badge **TRACELENS**) or use **View worst offenders** in the TraceLens tab.

The page title is **TraceLens**, with tabs **TraceLens | AdviceLens**.

**Workspace complexity** (top of the page) summarizes the loaded estate: diagrams, nodes, dependencies, forensics file coverage, LOC/SLOC, max/avg complexity, hotspot and knowledge-silo counts. Totals come from TraceLens blocks on blueprint nodes (re-scan with git enabled if they are missing).

### Snapshot vs trend

`hotspotScore` is one number for the whole `--git-since` window: this file is currently high relative to the rest of the scan. That does not tell you whether the file is heating up.

When git history is present, TraceLens also stores `hotspotScoreByWeek` (oldest week on the left). Each week is the same relative score, using **today's** complexity and that week's churn. It is not a stash of previous CLI scans, and it does not reconstruct old AST complexity.

On the estate list and in Explorer → TraceLens, the sparkline next to a hotspot uses that series. The label **getting worse** / **easing** / **steady** compares the last four weeks with the four before them. Dual-window `churn30` vs `churn365` still shows raw commit acceleration.

The **Trend dashboard** on a selected node shows the hotspotScore sparkline first, then weekly commit churn and the author/complexity histograms.

| Tab            | Content                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TraceLens**  | Ranked **Worst offenders** list - components or containers, filterable by hotspots / silos / refactor. Click a row for a **refactor plan** slide-over (boundary, ownership, rationale). **Open on canvas** enables guided navigation (coupling focus + boundary highlights). |
| **AdviceLens** | Estate-wide recommendations - see [AdviceLens](./advicelens.md).                                                                                                                                                                                                             |

### On the canvas

Select an enriched node, then open Explorer → **TraceLens** for readonly metrics with helper text and a **lookback** value (e.g. `90d`). When ArchLens CLI runs with `--git`, per-author commit counts are stored on `forensics.authors` and roll up to containers.

Concern badges on nodes:

- **HOT** - hotspot
- **SILO** - knowledge silo

### Risk heatmap (opt-in)

Heatmap is **off by default**:

1. Open Explorer → **TraceLens** tab → **Workspace display** → toggle **Risk Heatmap**
2. Nodes tint by `hotspotScore` (red intensity); MiniMap uses the same scale
3. YAML is unchanged - heat is display-only

While **ChaosLens** is active (bottom toolbar **Resilience** button), the TraceLens risk heatmap is suppressed so blast-radius simulation heat can use the same visual channel. See [ChaosLens](./chaoslens.md).

### Coupling lens (opt-in)

Coupling focus is **off by default**. With a node selected that has coupled peers:

1. Open Explorer → **TraceLens** tab → **Workspace display** → toggle **Coupling lens**
2. With a node selected, the canvas shows **only** that node and its coupled peers (diagram-wide coupling edges appear when nothing is selected)
3. Schema dependency links are hidden during focus; amber dashed coupling edges remain
4. Peers get a **COUPLED** highlight; unmapped filepaths appear as dashed ghost nodes

In the TraceLens tab forensics section you can use coupled/import peer links to jump between on-canvas nodes.

Peers resolve via `coupledFiles[].path` ↔ `properties.filepath` on the current diagram (and workspace-wide `entityRef` matches for cross-diagram peers).

## Config

Optional `forensics` section in `blueprint.config.json` (or yaml) for thresholds: `hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`.

### Source Code Viewer

Click **View Code** on any node property card or diagram node to open the in-browser source code viewer.

- **Public repositories**: Source code is fetched and syntax-highlighted automatically via public git raw/API endpoints.
- **Private repositories**: In-browser preview is not available from the hosted app (Canvas does not store GitHub tokens). Open the file on GitHub, or open the workspace folder locally so files are read from disk.
- **Local workspaces**: When running ArchLens CLI or opening a local workspace folder, source files are read directly from disk without network credentials.

## Next

- [AdviceLens](./advicelens.md) - ranked recommendations from forensics + simulation (`/workspace?lens=advicelens`)
- [ArchLens Canvas](./canvas.md)
- [ChaosLens](./chaoslens.md)
- [ArchLens CLI](./cli.md)
