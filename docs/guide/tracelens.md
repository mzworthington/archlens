# TraceLens

**TraceLens** enriches generated architecture nodes with **structural** (AST complexity, LOC) and **behavioral** (churn, authors, temporal coupling) signals from git history.

![TraceLens ranked offenders](../screenshots/tracelens.gif)

Git analysis is **on by default** in ArchLens. Pass `--no-git` to skip; set window with `--git-since=365` (days).

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
  classifications:
    - hotspot
  coupledFiles:
    - path: src/other.ts
      score: 0.8
      sharedCommits: 6
```

## In ArchLens Canvas

Open **`/tracelens`** (header: **TraceLens**) for a ranked “worst offenders” list across loaded blueprints - components or containers, filterable by hotspots/silos/refactor. Click a row to open a **refactor plan** slide-over with boundary members, ownership breakdown, and rationale. Use **Open on canvas** for guided navigation (coupling focus + boundary highlights).

Select an enriched node → **TraceLens** in the property panel shows metrics with helper text and a **lookback** value (e.g. `90d`). When ArchLens runs with `--git`, per-author commit counts are stored on `forensics.authors` and rolled up to containers.

Concern badges on the canvas:

- **HOT** - hotspot
- **SILO** - knowledge silo

### Risk heatmap (opt-in)

Heatmap is **off by default** and is a **workspace display** setting (not per-node):

1. Open the properties panel → **Workspace display** → toggle **Risk Heatmap**
2. Available with or without a node selected
3. Nodes tint by `hotspotScore` (red intensity); MiniMap uses the same scale
4. YAML is unchanged - heat is display-only

While **ChaosLens** is active (bottom toolbar **Resilience** button), the TraceLens risk heatmap is suppressed so blast-radius simulation heat can use the same visual channel. See [ChaosLens](./chaoslens.md).

### Coupling lens (opt-in)

Coupling focus is **off by default**. With a node selected that has coupled peers:

1. Turn on **Coupling** in the bottom toolbar **Lenses** group (link icon), or use **Workspace display** → **Coupling lens**
2. With a node selected, the canvas shows **only** that node and its coupled peers (diagram-wide coupling edges appear when nothing is selected)
3. Schema dependency links are hidden during focus; amber dashed coupling edges remain
4. Peers get a **COUPLED** highlight; unmapped filepaths appear as dashed ghost nodes

In the property panel **TraceLens** section you can toggle **Schema dependencies** while coupling lens is active, and use coupled/import peer links to jump between on-canvas nodes.

Peers resolve via `coupledFiles[].path` ↔ `properties.filepath` on the current diagram (and workspace-wide `entityRef` matches for cross-diagram peers).

## Config

Optional `forensics` section in `blueprint.config.json` (or yaml) for thresholds: `hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`.

## Next

- [ArchLens Canvas](./canvas.md)
- [ChaosLens](./chaoslens.md)
- [ArchLens](./cli.md)
