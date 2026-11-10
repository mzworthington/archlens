# TraceLens

**TraceLens** attaches git signals to architecture nodes. Those signals are churn, authors, and temporal coupling, plus structural metrics such as AST complexity and lines of code, and blueprint connections such as schema dependencies and import overlays.

![TraceLens ranked offenders](../screenshots/tracelens.gif)

Git analysis is on by default in the ArchLens CLI. Pass `--no-git` to skip it. Set the window with `--git-since=365`, in days.

<!-- vale Google.Contractions = NO -->
<!-- vale Google.Passive = NO -->

## What is stored

<!-- vale Google.Contractions = YES -->
<!-- vale Google.Passive = YES -->

On component nodes, joined by `properties.filepath`.

| Field                                | Meaning                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `complexity`                         | Cyclomatic complexity from the AST                                        |
| `loc` and `sloc`                     | Lines, and source lines, of code                                          |
| `churn`                              | Edits in the lookback window                                              |
| `authorCount` and `topAuthorPercent` | How concentrated ownership is                                             |
| `authors`                            | Per-author commit counts in the lookback window                           |
| `hotspotScore`                       | Relative risk from complexity times churn                                 |
| `hotspotScoreByWeek`                 | Weekly relative hotspot score, oldest week first                          |
| `classifications`                    | For example `hotspot` and `knowledge-silo`                                |
| `coupledFiles`                       | Temporally coupled peers. Each row has a score and a shared-commit count. |
| `sinceDays`                          | Lookback window used for this run                                         |

Containers and context systems get rollups: `fileCount`, `hotspotCount`, `knowledgeSiloCount`, max and sum metrics, and the same `sinceDays`.

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

### Explorer panel

Open the **Explorer** panel on the left. On desktop that's the chevron rail. On mobile it's the **Explorer** chip. Select the **TraceLens** tab for architecture signal tools.

- **Workspace display** covers test components, externals, dependency focus, the risk heatmap, and the coupling lens.
- **Node details** shows git metrics, schema dependencies, coupled and import peers, and a mini-graph for the Canvas node you select.
- **View worst offenders** opens the full TraceLens estate page.

The **Schema** tab in the same panel shows YAML, JSON, and Mermaid for the active diagram. Mermaid is export-only.

### TraceLens estate

Open `/workspace?lens=tracelens`. The header badge reads `TRACELENS`. You can also use **View worst offenders** in the TraceLens tab.

The page title is **TraceLens**. The tabs are **TraceLens** and **AdviceLens**.

**Workspace complexity**, at the top of the page, summarizes the loaded estate: diagrams, nodes, dependencies, forensics file coverage, lines of code, max and average complexity, and hotspot and knowledge-silo counts. Totals come from TraceLens blocks on blueprint nodes. Re-scan with git enabled if those blocks are missing.

### Snapshot and trend

`hotspotScore` is one number for the whole `--git-since` window. It says this file is high relative to the rest of the scan. It doesn't say whether the file is heating up.

When git history is present, TraceLens also stores `hotspotScoreByWeek`, oldest week on the left. Each week uses today's complexity and that week's churn. It's not a stash of previous CLI scans, and it doesn't reconstruct old AST complexity.

On the estate list and in Explorer, then TraceLens, the sparkline next to a hotspot uses that series. The label **getting worse**, **easing**, or **steady** compares the last four weeks with the four before them. Dual-window `churn30` against `churn365` still shows raw commit acceleration.

The **Trend dashboard** on a selected node shows the hotspot score sparkline first, then weekly commit churn, then the author and complexity histograms.

| Tab            | Content                                                                                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TraceLens**  | Ranked **Worst offenders**, as components or containers, filtered by hotspots, silos, or refactor. Click a row for a **refactor plan** slide-over. The slide-over shows the boundary, the ownership, and the rationale. **Open on Canvas** turns on guided navigation. That navigation uses coupling focus and boundary highlights. |
| **AdviceLens** | Estate-wide recommendations. See [AdviceLens](./advicelens.md).                                                                                                                                                                                                                                                                     |

### On the Canvas

Select an enriched node, then open Explorer, then **TraceLens**, for read-only metrics, helper text, and a lookback value such as `90d`. When the ArchLens CLI runs with `--git`, it stores per-author commit counts on `forensics.authors` and rolls them up to containers.

Concern badges on nodes:

- `HOT` means a hotspot.
- `SILO` means a knowledge silo.

### Risk heatmap

The heatmap is off by default.

1. Open Explorer, then the **TraceLens** tab, then **Workspace display**, and toggle **Risk Heatmap**.
2. Nodes tint by `hotspotScore`. Redder means higher. The MiniMap uses the same scale.
3. The YAML stays unchanged. Heat is display-only.

While ChaosLens is active, from the bottom toolbar **Resilience** button, the TraceLens risk heatmap stays hidden so blast-radius heat can use the same visual channel. See [ChaosLens](./chaoslens.md).

### Coupling lens

Coupling focus is off by default. With a node selected that has coupled peers:

1. Open Explorer, then the **TraceLens** tab, then **Workspace display**, and toggle **Coupling lens**.
2. With a node selected, the Canvas shows only that node and its coupled peers. Diagram-wide coupling edges appear when you select nothing.
3. Schema dependency links stay hidden during focus. Amber dashed coupling edges remain.
4. Peers get a **COUPLED** highlight. Unmapped file paths appear as dashed ghost nodes.

In the TraceLens tab you can use coupled and import peer links to jump between nodes on the Canvas.

Peers resolve through `coupledFiles[].path` and `properties.filepath` on the current diagram. Workspace-wide `entityRef` matches cover peers on other diagrams.

## Config

An optional `forensics` section in `blueprint.config.json`, or the YAML equivalent, sets the thresholds `hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, and `sinceDays`.

### Source code viewer

Click **View Code** on a node property card or a diagram node to open the in-browser source viewer.

- **Public repositories.** The viewer fetches source and highlights it from public git raw and API endpoints.
- **Private repositories.** The hosted app doesn't preview them. Canvas doesn't store GitHub tokens. Open the file on GitHub, or open the workspace folder locally so the app reads files from disk.
- **Local workspaces.** The ArchLens CLI and a local workspace folder read source files from disk, with no network credentials.

## Next

- [AdviceLens](./advicelens.md) for ranked recommendations from forensics and simulation, at `/workspace?lens=advicelens`
- [ArchLens Canvas](./canvas.md)
- [ChaosLens](./chaoslens.md)
- [ArchLens CLI](./cli.md)
