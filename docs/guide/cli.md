# ArchLens CLI

**ArchLens CLI** scans source, discovers systems and dependencies, lays them out with Dagre and writes multi-level blueprint YAML.

![CLI prompts](../screenshots/cli.gif)

## Install

macOS / Linux (recommended):

```bash
curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | bash
```

Windows: `irm https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.ps1 | iex`

Then verify with `archlens --version`. Full options, manual downloads, and the scan → canvas flow: [Getting started](./getting-started.md).

## Modes

1. **Interactive** - bare `archlens` opens a menu: scan wizard, publish snapshot, publish fragment, compose estate, accept/reject overlays
2. **Quick scan** - `archlens scan` (or `archlens --scan`) runs headless with defaults from `blueprint.config.json` / env (no prompts)
3. **Enrich existing YAML** - `archlens enrich` re-runs the externals pass on blueprint files already on disk (no source re-scan)
4. **Validate architecture health** - `archlens validate [path]` reports actionable module cycles + forensics fix actions (informational coupling separate); optional `--since-commit` regression and `--contract` wiring checks
5. **Diff blueprint trees** - `archlens diff <baseline> <current>` structural compare for PR gates
6. **AdviceLens estate sweep** - `archlens resilience [path]` runs ChaosLens scenarios and ranks recommendations
7. **Headless flags / CI** - flags or non-TTY; suitable for automation

```bash
archlens
archlens scan
archlens enrich
archlens enrich --output=custom-blueprints
archlens validate blueprints/
archlens diff base-blueprints/ pr-blueprints/
archlens resilience blueprints/ --format=json --output=.archlens/advicelens-report.json --min-sla=95
archlens catalog publish-fragment blueprints/ --estate=acme --product=payments --source-ref=repo@sha --no-dry-run
archlens catalog compose --estate=acme --no-dry-run
archlens --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

See [GitHub Actions workflows](./ci-workflows.md) for publish → fragment → compose jobs.

## Remote catalog (fragments + compose)

BlueprintSpec YAML is unchanged. Multi-pipeline publishing stages **fragments** and optional **suggestion overlays**, then **composes** them into an ADR-0010 `latest` snapshot ([ADR-0014](../ADRs/0014-estate-fragments-and-compose-before-publish.md)).

| Command                                             | Purpose                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `archlens publish [path]`                           | Whole-tree snapshot upload (single complete tree)          |
| `archlens catalog publish-fragment [path]`          | Stage a product/slice under `fragments/`                   |
| `archlens catalog compose --estate=<id>`            | Stitch fragments + overlays → `snapshots/` + CAS `latest/` |
| `archlens catalog accept-overlay --file=<yaml>`     | Stage an accepted suggestion overlay                       |
| `archlens catalog reject-overlay --overlay-id=<id>` | Tombstone an overlay                                       |

Publish/compose paths prefer **visibility over gating**: validation does not block upload by default. Use `archlens validate` or `--validate` for an optional hard gate; `--skip-validation` is always allowed.

Object storage uses `OBJECT_STORAGE_*` / R2 credentials (see [cloudflare-secrets](../cloudflare-secrets.md)). Samples estate key prefix: `estates/samples/` (shared estate; products `samples`, `archlens`, demo ids).

## Useful flags

| Flag                               | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `scan`                             | Non-interactive scan with defaults (same as `--scan`)                     |
| `--scan`                           | Non-interactive scan with defaults                                        |
| `enrich`                           | Re-run externals pass on existing YAML (no source re-scan)                |
| `--enrich-only`                    | Same as `enrich` subcommand                                               |
| `validate [path]`                  | Architecture health (cycles + forensics); `--since-commit` / `--contract` |
| `diff [baseline] [current]`        | Structural diff between two blueprint trees                               |
| `resilience [path]`                | AdviceLens estate sweep + SLA gate (`--min-sla`, `--output`)              |
| `--format=text \| json \| yaml`    | Output format for `validate` / `diff` / `resilience`                      |
| `--version`, `-V`                  | Print installed CLI version and exit                                      |
| `update`                           | Download and install the latest release, then re-launch                   |
| `--no-update-check`                | Skip interactive startup update prompt                                    |
| `--watch`                          | Re-run analysis when source files change                                  |
| `--watch-debounce=<ms>`            | Debounce file changes before re-run (default `500`)                       |
| `--headless`                       | No prompts                                                                |
| `--parser=tree-sitter \| ts-morph` | AST engine (default `tree-sitter`; `ts-morph` via flag only)              |
| `--glob`                           | Inclusion pattern                                                         |
| `--output`                         | Output folder                                                             |
| `--context`                        | Context / root name                                                       |
| `--system-name`                    | Software system for this repo (multi-repo products)                       |
| `--ignore`                         | Extra ignore globs (csv)                                                  |
| `--systems`                        | Limit discovery to roots                                                  |
| `--rollup-modules`                 | Collapse `*-module-*` packages                                            |
| `--git` / `--no-git`               | TraceLens on (default) or off                                             |
| `--git-since=<days>`               | Lookback window (default 365)                                             |
| `--no-relayout`                    | Preserve existing `x`/`y` on re-scan (default recomputes layout)          |
| `publish [path]`                   | Plan/upload whole-tree remote catalog snapshot                            |
| `catalog …`                        | Fragment / compose / overlay commands (see above)                         |
| `--publish`                        | After scan, upload output tree (`--no-dry-run`)                           |
| `--validate`                       | With publish/compose: fail when workspace validation fails                |
| `--skip-validation`                | Allow publish/compose without a validation gate (default)                 |
| `--key-prefix=<path>`              | Object key prefix inside the bucket                                       |
| `--estate=<id>` / `--product=<id>` | Catalog compose / fragment identity                                       |

With the default `tree-sitter` parser, language coverage includes TypeScript/JavaScript, C#, Python, Go, and Java (WASM grammars ship with the release binary; default glob is `**/*.{ts,tsx,cs,java,go,py,tf}`). Pass `--parser=ts-morph` for TypeScript-only trees if needed.

Terraform (`.tf` / `.tf.json`) and Pulumi (`Pulumi.yaml` projects) are auto-detected under the scan root and mapped by separate IaC passes when root modules or projects are found - no extra flag. The default glob includes `*.tf` so those paths stay in scope; AST parsers skip them.

Contributor reference: full flag table and analyzer config in the [CLI README](https://github.com/mzworthington/archlens/blob/main/app/packages/cli/README.md).

## Declare then scan

By default a scan **creates** a system context when none exists (discovered systems plus a fallback `User` actor). You can instead **declare** a sparse context BlueprintSpec so scan extends that landscape ([ADR-0015](../ADRs/0015-declared-context-hydration.md), shape in [BlueprintSpec - Declared system context](./schema.md#declared-system-context)).

### Workflow

1. Author (or assemble) a `level: context` seed under the output dir:
   - `blueprints/<ctx>/context.yaml`, or
   - `blueprints/context.yaml` when the context folder is omitted  
     Prefer an existing seed path on re-run.
2. Run scan with the same `--context` (and `--output`) so the writer loads that file as the merge base.
3. Open the result in Canvas - personas and third-parties stay; systems are hydrated from the repo.

```bash
# Example: seed already at blueprints/acme/context.yaml
archlens scan --headless --output=blueprints --context=acme
```

### What scan does to a declared seed

| Situation                                       | Result                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Seed missing                                    | Create context + systems + fallback `User` (today’s path)                                           |
| Seed present                                    | Upsert discovered systems onto matching `entityRef`s; keep personas, third-parties, and their edges |
| ≥1 product persona                              | Do **not** inject the fallback `User`                                                               |
| System disappeared from this scan’s `rootPath`s | Prune that **scan-owned** orphan only (other repos’ systems stay)                                   |
| Unreadable seed                                 | Warn, then create a fresh context                                                                   |

**Display names:** omit `name` on declared nodes to derive a label from the `entityRef` leaf. Author-owned labels win over scan defaults; estate compose prefers curated names over derived ones.

### Multi-repo products

Scan each repo with the **same** `--context` and a distinct `--system-name` (or `systemName` in config). Share stable system `entityRef`s in the declared seed so every repo hydrates the same anchors. Personas and third-parties union by `entityRef` when fragments compose ([ADR-0014](../ADRs/0014-estate-fragments-and-compose-before-publish.md)).

You do **not** need a “home vs secondary” seed flag - omit redundant `name`s and keep one shared identity per entity.

### Infrastructure packages and repos

When Terraform or Pulumi lives in a **separate package or repo**, declare an **infra spoke** in the shared context seed and list the product systems it supports:

```yaml
# blueprints/acme/context.yaml (shared landscape seed)
nodes:
  - entityRef: acme/checkout
    type: software-system
  - entityRef: acme/cloudflare
    type: software-system
    name: Cloudflare Hosting
    properties:
      role: infrastructure
      serves: acme/checkout # comma-separated for several products
```

Then scan the infra root with the **same** `--context` (and a seed already present under `--output`):

```bash
# Explicit infra package / repo - cwd is the Pulumi/Terraform project
cd infra/cloudflare
archlens scan --headless --output=/path/to/blueprints --context=acme
```

Scan attaches container products under that spoke and proposes vendor third-parties with edges from each `serves` target. See [Meaningful external dependencies](#meaningful-external-dependencies).

### This repository

ArchLens commits its own seed at [`blueprints/archlens/context.yaml`](https://github.com/mzworthington/archlens/blob/main/blueprints/archlens/context.yaml) - the same path consumers use. Publish scans hydrate into that file; no separate JSON assemble step.

External **demo** repos have no in-tree seed, so [publish-demo-catalog](./ci-workflows.md) assembles a synthetic context from `contextDeclaration` on each entry in [`scripts/blueprint-sample-repos.json`](https://github.com/mzworthington/archlens/blob/main/scripts/blueprint-sample-repos.json) via `scripts/assemble-context-seed.mjs` before scan.

## Deliverable

YAML under the output directory - **not** a separate TraceLens report. Architecture graphs are the product; git signals attach onto `node.forensics` when enabled.

### Dependency resolution

The analyzer links containers and components from:

- **Relative imports** within the scanned tree
- **Workspace `package.json` names** in monorepos (`/core` → `packages/core`, etc.), including subpath imports
- **`.csproj` project references** and C# `using` resolution (see [C# and .NET analysis](../../README.md#c-and-net-analysis))

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

### Meaningful external dependencies

IaC stacks are often noisy, and one Pulumi or Terraform project may mix **many providers**. ArchLens CLI treats **Pulumi/Terraform as packaging** (one infra spoke per project) and **providers as the external vocabulary**. Each resource is classified by a provider pack so diagrams stay useful.

**IaC vs infrastructure (ADR-0016):** primary resources become two linked nodes; supporting/noise stay as IaC only -

| Node                     | Ownership                             | Flags                                            | Role                                                     |
| ------------------------ | ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **IaC declaration**      | Owned code (every classified address) | internal, `iac.view: declaration`                | Full code graph (incl. DNS, IAM, CORS, …)                |
| **Provisioned resource** | Cloud product (primaries only)        | `external` + `third-party`, `iac.view: resource` | Runtime / external summary                               |
| **Edge**                 | Primary declaration → resource        | type `provisions`                                | Not a runtime call (ChaosLens skips it for blast radius) |

Supporting and noise declarations keep `iac.significance` but do **not** get a provisioned companion.

#### What you get at each C4 level

| Level         | Grain                                                                                                                                                               | Example from one stack                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Context**   | One third-party per **vendor** that had at least one primary product                                                                                                | `vendor-cloudflare`, `vendor-aws`                    |
| **Container** | Full IaC declaration graph under the infra spoke; only **primary** products get a provisioned companion + `provisions` edge; supporting/noise stay declaration-only | PagesProject (+ Pages), DNSRecord (declaration only) |

Author-declared third-parties in the seed (for example a curated “Cloudflare R2 Catalog”) **survive** hydration. Scan proposes vendors via ADR-0015; it does not replace your labels.

#### Provider packs

| Pack         | Example primaries                                   | Typically filtered as supporting / noise            |
| ------------ | --------------------------------------------------- | --------------------------------------------------- |
| Cloudflare   | Pages, R2                                           | DNS records, Pages domains, CORS, zone data         |
| AWS          | Lambda, S3, RDS, DynamoDB, messaging, edge, compute | IAM roles/policies, security groups, bucket helpers |
| Azure        | Functions, SQL, Redis, compute, storage, edge       | Role assignments, NSGs, private endpoints           |
| Google Cloud | Cloud Functions, Cloud SQL, GCS, Pub/Sub, compute   | IAM bindings, firewalls, data sources               |

Unknown providers (for example Datadog) pass through unchanged until a pack exists.

#### Multi-provider stack (same Pulumi project)

A project that provisions Cloudflare Pages **and** AWS Lambda + S3 yields:

- **Containers** under the infra spoke: IaC declarations for every classified resource, provisioned product nodes for primaries only (Pages, Lambda, S3), and `provisions` edges from those primaries
- **Context** third-parties: Cloudflare and AWS, each with a dependency from systems listed in `serves`

IAM roles, DNS records, and bucket policies remain as IaC declaration nodes; they are not projected as third-party products.

#### Infra membership

Declare `properties.role: infrastructure` and `properties.serves: <system-ref>[,…]` on the infra spoke in the seed ([Declared system context](./schema.md#declared-system-context)). When the Pulumi project **is** the scan root (dedicated infra package/repo), the system id is the **directory name** (for example `cloudflare`), so seed `entityRef`s like `acme/cloudflare` match.

#### Dogfood in this repository

ArchLens uses [`infra/cloudflare`](../../infra/cloudflare) with the committed seed [`blueprints/archlens/context.yaml`](../../blueprints/archlens/context.yaml) (`archlens/cloudflare` serves `archlens`).

Canvas **Import infrastructure** still merges parsed resources into the active diagram without this significance filter - use CLI scan when you want vendor/product projection. See [Import infrastructure](./canvas.md#import-infrastructure).

### IDE validation

Install the YAML extension. Generated files set `version` to the public schema URL. You can also point the language server at **latest**:

```yaml
# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json
```

Prefer the versioned URL (`/schemas/v4/…`) when pinning a contract. `/schemas/latest/…` tracks the latest BlueprintSpec. Format and IDE setup: [BlueprintSpec](./schema.md); wire-format details for contributors: [Setup - YAML format](../setup.md#yaml-format-v4).

## Next

- [TraceLens](./tracelens.md)
- [BlueprintSpec](./schema.md) - including [declared system context](./schema.md#declared-system-context)
- [ArchLens Canvas](./canvas.md)
- [GitHub Actions workflows](./ci-workflows.md)
