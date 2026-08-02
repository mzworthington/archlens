# ArchLens

**ArchLens** scans source, discovers systems, extracts components and dependencies, lays them out with Dagre, and writes multi-level blueprint YAML.

![CLI prompts](../screenshots/cli.gif)

## Install

macOS / Linux (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | sh
```

Windows: `irm https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.ps1 | iex`

Then verify with `archlens --version`. Full options, manual downloads, and the scan → canvas flow: [Getting started](./getting-started.md).

## Modes

1. **Quick scan** - `archlens scan` (or `archlens --scan`) runs headless with defaults from `blueprint.config.json` / env (no prompts)
2. **Enrich existing YAML** - `archlens enrich` re-runs the externals pass on blueprint files already on disk (no source re-scan)
3. **Validate blueprints** - `archlens validate [path]` checks schema, cycles, and entityRef links (CI-friendly)
4. **Diff blueprint trees** - `archlens diff <baseline> <current>` structural compare for PR gates
5. **AdviceLens estate sweep** - `archlens resilience [path]` runs ChaosLens scenarios and ranks recommendations
6. **Interactive** - bare `archlens` prompts for context, glob, output, and TraceLens (git signals)
7. **Headless** - flags or non-TTY / CI; suitable for automation

```bash
archlens scan
archlens enrich
archlens enrich --output=custom-blueprints
archlens validate blueprints/
archlens diff base-blueprints/ pr-blueprints/
archlens resilience blueprints/ --format=json --output=.archlens/advicelens-report.json --min-sla=95
archlens --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

See [Blueprint contract in CI](./ci-blueprints.md) and [AdviceLens gate in CI](./ci-advicelens.md) for GitHub Actions workflows.

## Useful flags

| Flag                               | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `scan`                             | Non-interactive scan with defaults (same as `--scan`)            |
| `--scan`                           | Non-interactive scan with defaults                               |
| `enrich`                           | Re-run externals pass on existing YAML (no source re-scan)       |
| `--enrich-only`                    | Same as `enrich` subcommand                                      |
| `validate [path]`                  | Validate blueprint tree (schema, cycles, entityRef links)        |
| `diff [baseline] [current]`        | Structural diff between two blueprint trees                      |
| `resilience [path]`                | AdviceLens estate sweep + SLA gate (`--min-sla`, `--output`)     |
| `--format=text \| json`            | Output format for `validate` / `diff` / `resilience`             |
| `--version`, `-V`                  | Print installed CLI version and exit                             |
| `update`                           | Download and install the latest release, then re-launch          |
| `--no-update-check`                | Skip interactive startup update prompt                           |
| `--watch`                          | Re-run analysis when source files change                         |
| `--watch-debounce=<ms>`            | Debounce file changes before re-run (default `500`)              |
| `--headless`                       | No prompts                                                       |
| `--parser=tree-sitter \| ts-morph` | AST engine (default `tree-sitter`; `ts-morph` via flag only)     |
| `--glob`                           | Inclusion pattern                                                |
| `--output`                         | Output folder                                                    |
| `--context`                        | Context / root name                                              |
| `--system-name`                    | Software system for this repo (multi-repo products)              |
| `--ignore`                         | Extra ignore globs (csv)                                         |
| `--systems`                        | Limit discovery to roots                                         |
| `--rollup-modules`                 | Collapse `*-module-*` packages                                   |
| `--git` / `--no-git`               | TraceLens on (default) or off                                    |
| `--git-since=<days>`               | Lookback window (default 365)                                    |
| `--no-relayout`                    | Preserve existing `x`/`y` on re-scan (default recomputes layout) |

With the default `tree-sitter` parser, language strategies cover TypeScript, C#, and Python (WASM grammars ship with the release binary). Pass `--parser=ts-morph` for TypeScript-only trees if needed.

Terraform (`.tf` / `.tf.json`) and Pulumi (`Pulumi.yaml` projects) are auto-detected under the scan root and mapped by separate IaC passes when root modules or projects are found - no extra flag. The default glob includes `*.tf` so those paths stay in scope; AST parsers skip them.

Contributor reference: full flag table and analyzer config in the [CLI README](https://github.com/mzworthington/archlens/blob/main/app/packages/cli/README.md).

## Deliverable

YAML under the output directory - **not** a separate TraceLens report. Architecture graphs are the product; git signals attach onto `node.forensics` when enabled.

### Dependency resolution

The analyzer links containers and components from:

- **Relative imports** within the scanned tree
- **Workspace `package.json` names** in monorepos (`/core` → `packages/core`, etc.), including subpath imports
- **`.csproj` project references** and C# `using` resolution (see [README - C# and .NET analysis](https://github.com/mzworthington/archlens#c-and-net-analysis))

Node.js built-in modules are excluded from in-repo matching. Run `archlens enrich` to re-apply the externals pass on existing YAML without a full source scan (adds missing cross-diagram edges and external proxy nodes after CLI or core upgrades).

### Terraform

When the scan root contains Terraform (`.tf` / `.tf.json`), the CLI also emits infrastructure diagrams:

- Discovers **root modules** (directories with `.tf` files; nested module dirs are skipped as separate systems)
- Parses statically (no `terraform init` / plan)
- Adds an **Infrastructure** hub on `context.yaml` and links each TF root as a spoke (same pattern as code product hubs)
- Writes `blueprints/<root>/containers.yaml` per root module
- Context diagrams are laid out with **d3-hierarchy** (person → hubs → subsystems); container/component levels keep Dagre

No flag required - if Terraform files exist under the scan root, they are mapped.

### Pulumi

When the scan root contains Pulumi projects (`Pulumi.yaml`), the CLI also emits infrastructure diagrams:

- Discovers **Pulumi projects** (directories with `Pulumi.yaml`; nested projects under an outer root are skipped)
- Parses statically (no `pulumi preview` / stack export)
- Adds an **Infrastructure** hub on `context.yaml` and links each project as a spoke (same pattern as Terraform roots)
- Writes `blueprints/<project>/containers.yaml` per project
- Collects source files by runtime:
  - **yaml** - `*.yaml` / `*.yml` in the project directory (excluding stack config files like `Pulumi.prod.yaml`)
  - **nodejs** - `*.ts` / `*.tsx` in the project directory
  - **python**, **go**, **dotnet** - projects are discovered for diagram structure; static parsing coverage is strongest for YAML and TypeScript runtimes today

No flag required - if `Pulumi.yaml` exists under the scan root, projects are mapped.

You can also import Terraform or Pulumi into an **existing** diagram from ArchLens Canvas - see [Import infrastructure](./canvas.md#import-infrastructure).

### IDE validation

Install the YAML extension. Generated files set `version` to the public schema URL. You can also point the language server at **latest**:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
```

Prefer the versioned URL (`/schemas/v4/…`) when pinning a contract. `/schemas/latest/…` tracks the latest BlueprintSpec. Format and IDE setup: [BlueprintSpec](./schema.md); wire-format details for contributors: [Setup - YAML format](../setup.md#yaml-format-v4).

## Next

- [TraceLens](./tracelens.md)
- [BlueprintSpec](./schema.md)
- [ArchLens Canvas](./canvas.md)
