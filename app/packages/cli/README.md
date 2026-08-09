# `@archlens/cli` - Command Line AST Analyzer

![ArchLens Interactive Prompts](../../docs/screenshots/cli.gif)

Scans a local codebase, extracts modules and dependencies via static analysis, and writes C4-style YAML under `blueprints/`. Diagram layout is handled by ArchLens Canvas (autolayout on open; optional `x`/`y` when you customize positions in the UI).

Supports **multi-system** / monorepo discovery, **product hubs** on the context diagram, **type hydration**, **gitignore + structural filters**, **optional Git forensics**, and **cancelable** runs (Ctrl+C).

---

## Running the analyzer

From the repository `app/` directory:

```bash
pnpm dev:cli
```

### Modes

1. **Quick scan:** `archlens scan` or `archlens --scan` — headless run using `blueprint.config.json` / defaults (context `blueprint`, output `blueprints`, default glob). Add flags as needed (`--no-git`, `--output=…`).
2. **Enrich existing YAML:** `archlens enrich` — re-run the externals pass on blueprint files already on disk (adds missing dependency edges and `external: true` proxy nodes; no AST re-scan). Use after upgrading ArchLens or when hand-authored YAML is missing couplings.
3. **Interactive (default):** step-by-step prompts for context, glob, output, and whether to enrich with Git forensics.
4. **Headless / CI:** non-TTY, or when flags are supplied:

```bash
pnpm dev:cli scan
pnpm dev:cli enrich
pnpm dev:cli --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

### Flags

| Flag                               | Purpose                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `scan`                             | Non-interactive scan with defaults (same as `--scan`)           |
| `--scan`                           | Non-interactive scan with defaults                              |
| `enrich`                           | Re-run externals pass on existing YAML (no source re-scan)      |
| `--enrich-only`                    | Same as `enrich` subcommand                                     |
| `--version`, `-V`                  | Print CLI version (`dev` in source runs; release tag in binary) |
| `update`                           | Download and install the latest release, then re-launch         |
| `--no-update-check`                | Skip interactive startup update prompt                          |
| `--watch`                          | Re-run analysis when source files change                        |
| `--watch-debounce=<ms>`            | Debounce file changes before re-run (default `500`)             |
| `--headless`                       | Disable interactive prompts                                     |
| `--parser=tree-sitter \| ts-morph` | AST engine (`tree-sitter` default; `ts-morph` via flag only)    |
| `--glob="<pattern>"`               | Files to consider (still subject to filters)                    |
| `--output="<path>"`                | Output folder (or `ARCHLENS_OUTPUT_DIR`)                        |
| `--context="<name>"`               | Blueprint root / `entityRef` slug (default: `blueprint`)        |
| `--system-name="<name>"`           | Software system for this repo when part of a multi-repo product |
| `--ignore="<a,b>"`                 | Extra ignore globs (comma-separated)                            |
| `--systems="<a,b>"`                | Restrict discovery to these system roots                        |
| `--rollup-modules`                 | Collapse `*-module-*` packages into a prefix system             |
| `--git`                            | Explicitly enable Git forensics (on by default)                 |
| `--no-git`                         | Skip Git forensics enrichment                                   |
| `--git-only`                       | Headless architecture + forensics enrich (same deliverable)     |
| `--git-since=<days>`               | Forensics lookback window (default 365)                         |

### Git forensics examples

```bash
# Architecture + forensics (default) attached onto blueprint nodes
pnpm dev:cli --headless --output=blueprints

# Architecture without forensics
pnpm dev:cli --headless --no-git --output=blueprints

# Headless enrich with custom lookback
pnpm --filter @archlens/cli exec tsx src/cli/archlens.ts --git-only --git-since=90
```

Forensics attach a typed `forensics` object onto component nodes (per-file metrics via `filepath`) and rolled-up summaries onto containers and context system nodes. Optional `forensics` section in `blueprint.config.json` for thresholds (`hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`).

### Architecture health (`validate`) and structural `diff`

Pin architecture risk in CI without re-scanning source. Default `validate` reports **what to fix in the codebase** — actionable module `direct-call` cycles (not external-proxy / inter-container loops) and TraceLens forensics (hotspots, knowledge silos, heating churn) — with remediation text. Other coupling cycles are listed as informational and do not fail the gate. Scan with git forensics enabled first so hotspot/silo/heating signals are attached.

```bash
archlens validate blueprints/
archlens validate blueprints/ --since-commit=HEAD~1
archlens validate blueprints/ --baseline=.archlens/base-blueprints --format=json
archlens validate blueprints/ --contract   # optional BlueprintSpec wiring/schema gate

archlens diff base-blueprints/ head-blueprints/
archlens diff --baseline=main-tree --current=pr-tree --format=json
```

`--since-commit` materializes the blueprint path from git (`git archive`) and fails when health **deteriorates** versus that revision. Use `--baseline` when you already scanned the other revision into a folder (typical for estates that do not commit YAML). `--contract` is the older wiring check (invalid connections / broken entityRefs); publish `--validate` still uses that contract gate.

`diff` remains a structural tree compare (added/removed/modified nodes and dependencies).

GitHub Action template: [`.github/actions/validate-blueprints`](../../../.github/actions/validate-blueprints/action.yml) and [workflow example](../../../.github/workflows/blueprint-contract.yml.example). See [GitHub Actions workflows](../../../docs/guide/ci-workflows.md).

---

## What gets generated

| Artifact                                | Content                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `blueprints/[<ctx>/]context.yaml`       | System context (personas, systems, third-parties). Ctx folder optional; scan hydrates into a declared seed or creates one |
| `blueprints/<system>/containers.yaml`   | Containers for that system                                                                                                |
| `blueprints/<tf-root>/containers.yaml`  | Meaningful IaC **products** per provider pack (e.g. Pages, Lambda) under the infra spoke; noise filtered                  |
| `blueprints/<system>/*-components.yaml` | Component graphs per container                                                                                            |

After all writers complete, an **externals pass** walks every schema in the output tree, rolls component-level cross-container dependencies up onto container diagrams where needed, adds **service-level coupling edges** on container diagrams when component evidence exists (for example `api → auth-service` rather than only container-to-container rollup), and materializes unresolved dependency endpoints as `external: true` proxy nodes on component and container diagrams.

Terraform and Pulumi roots are placed on the context diagram under the **same product group as code** (longest matching repo path), or under a declared **infra spoke** (`role: infrastructure`, `serves: …`) for dedicated infra packages/repos. IaC scan classifies resources by provider pack (Cloudflare, AWS, Azure, GCP): **container** diagrams keep primary products; **context** receives one proposed third-party per vendor (`proposedThirdParties`). Product guide: [Meaningful external dependencies](../../../docs/guide/cli.md#meaningful-external-dependencies).

### Multi-system discovery

By default the analyzer finds systems from:

- `package.json` / `pnpm-workspace.yaml` workspace members
- Standalone package roots at the scan root
- Optional `systems` from config or `--systems=`

A **product hub** node is added when multiple subsystems share a product, so Blueprint vs Backstage (different `productId`s) stay disconnected.

For **multi-repo products** (several git repos, one landscape), scan each repo with the same `--context` and a distinct `--system-name` (or `systemName` in config). Re-runs hydrate into the same context seed (`blueprints/<ctx>/context.yaml` or root `blueprints/context.yaml` when the folder is omitted).

**Declared context:** commit a sparse `level: context` BlueprintSpec with stable software-system anchors (`entityRef`, optional `name`), optional `product-persona` persons, and optional `external: true` third-parties. Omit `name` to derive a label from the `entityRef` leaf; merges prefer an explicit name over a derived one. Scan upserts discoveries onto those anchors, preserves author-owned personas/externals/edges, skips the fallback `User` actor when personas exist, and prunes only scan-owned systems whose `rootPath` is in the current scan’s scope.

This repository commits its ArchLens seed at `blueprints/archlens/context.yaml`. Demo catalog jobs assemble seeds for external sample repos from `contextDeclaration` entries in `scripts/blueprint-sample-repos.json` via `scripts/assemble-context-seed.mjs`.

### Filtering

Files are included only if they pass **all** of:

1. Glob match
2. `.gitignore` (and nested gitignores)
3. Built-in **structural** ignores (docs, scripts, e2e, storybook, `dist`, `build`, coverage, `.github`, …)
4. Optional config / CLI `--ignore`
5. Optional config `include` allow-list

Test paths stay in the model and are tagged `isTest` (ArchLens Canvas can hide them). Detection covers
JS/TS (`*.test.ts`, `__tests__`), .NET (`*.UnitTests`, `FooTests.cs`), Go, Java, and Python
conventions. Pure test projects are also tagged at the **container** level so they hide with
“Show test components” off.

### Type hydration

After extraction, nodes/edges are classified from imports, constructors, and path cues (e.g. gateway, relational DB, event broker, REST) and connected with suitable dependency types (`read-write`, `publish-subscribe`, …).

### Dependency resolution (TypeScript / JavaScript)

- **Relative imports** (`./foo`, `../bar`) - matched to components by filename within the repo scan.
- **Workspace package imports** (`@scope/pkg`, including subpaths like `@scope/pkg/rules/graph`) - resolved via each package’s `package.json` `name` to its container (`packages/canvas` → `canvas`, `@archlens/core` → `core`). These emit both **inter-container** edges and **component-level** edges (default target: the package entry `index` component).
- **Node.js built-ins** (`path`, `fs`, `node:path`, …) - ignored; they no longer fuzzy-match local files with the same basename.
- **npm dependencies** (`react`, `lodash`, …) - not linked to in-repo containers unless they appear as workspace packages.

After writers finish, an **externals pass** enriches component and container YAML with proxy nodes for unresolved cross-diagram dependency endpoints, and synthesizes missing **dependency edges** from component-level evidence when a container diagram shows service nodes (for example API → external Auth). That is how, for example, canvas → core package usage surfaces as external nodes on the canvas component diagram, and cross-container calls appear on container-level storefront diagrams for ChaosLens.

For **C# / .NET**, the analyzer also resolves `.csproj` `<ProjectReference>` edges and cross-namespace `using` dependencies. See [C# and .NET analysis](../../README.md#c-and-net-analysis) for current coverage and roadmap items (Aspire, integration events, HTTP/gRPC clients).

---

## Config file

Optional `blueprint.config.json` (or `.yml` / `.yaml`) beside the scan root:

```json
{
  "ignore": ["**/generated/**"],
  "include": [],
  "systems": ["packages", "plugins"],
  "rollupModules": false,
  "glob": "**/*.{ts,tsx}",
  "context": "my-product",
  "systemName": "frontend-api"
}
```

---

## Source layout

```
src/
  cli/                 # entry, argv, interactive prompts
  analysis/
    domain/            # analyzer, extraction, discovery, testPath
      languages/       # csharp | python | typescript | go | java strategies
    adapters/
      parsing/         # ts-morph, tree-sitter, wasm paths
      pathFilter/      # gitignore + structural ignores
  forensics/           # git metrics (domain + adapters)
  writers/             # C4 YAML writers (+ baseWriter)
  test/                # shared fakes
```

---

## Building standalone binaries

```bash
pnpm --filter @archlens/cli build
```

Uses `scripts/emitBuildVersion.ts` before compile; release CI sets `ARCHLENS_VERSION` to the release tag (otherwise `dev`).

Produces `dist/archlens` (or `dist/archlens.exe`) and copies supported tree-sitter language `.wasm` files next to the binary. Releases ship those parsers in the same archive.

```bash
./dist/archlens --version
./dist/archlens --headless --parser=tree-sitter
```

Install script for end users: [`scripts/install.sh`](../../../scripts/install.sh) (also documented in [Getting started](../../docs/guide/getting-started.md)).

---

## Testing

```bash
pnpm test:cli
```

### VHS terminal demo

Records the interactive CLI against this repo into `docs/screenshots/cli.gif`
(requires `vhs`, `ttyd`, `ffmpeg`, and `bun` - `ffmpeg` and `vhs` from `mise.toml`; on macOS `brew install ttyd`):

```bash
mise install
brew install ttyd   # macOS only
pnpm test:vhs
```

Tape source: `tapes/cli-demo.tape` (scans `app/packages/cli/**/*.{ts,tsx}`, writes to `.vhs-out/`).
