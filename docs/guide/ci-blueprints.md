# Blueprint validation in CI

Pin BlueprintSpec in pull requests the same way Structurizr Cloud or Backstage scorecards enforce architecture contracts.

## Quick start

Add a workflow that uses the composite action shipped in this repository:

```yaml
name: Blueprint contract

on:
  pull_request:
    branches: [main]
    paths:
      - 'blueprints/**'
      - 'blueprint.config.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: ./.github/actions/validate-blueprints
        with:
          blueprints-path: blueprints
```

## What it does

1. **`archlens validate`** — schema (Zod), dependency cycles, invalid local connections, and broken `entityRef` hierarchy links across the blueprint tree.
2. **`archlens diff`** — structural diff of the PR blueprint tree vs the base branch (nodes, dependencies, added/removed files).
3. **PR comment + artifact** — when diffs exist, posts a summary comment and uploads `blueprint-diff.json`.

## CLI usage

```bash
# Validate a blueprint tree (defaults to blueprints/)
archlens validate
archlens validate custom-blueprints/
archlens validate --format=json

# Structural diff between two trees
archlens diff base-blueprints/ head-blueprints/
archlens diff --baseline=main-blueprints --current=blueprints --format=json
```

Exit codes:

- `validate` — `0` when all files pass, `1` on schema/graph/entityRef issues or empty tree.
- `diff` — `0` when trees match structurally, `1` when changes exist (or parse errors).

## Local PR rehearsal

```bash
git fetch origin main
mkdir -p .archlens/base-blueprints
git archive origin/main -- blueprints | tar -x -C .archlens/base-blueprints --strip-components=1
archlens validate blueprints
archlens diff --baseline=.archlens/base-blueprints --current=blueprints
```

## Action inputs

| Input             | Default      | Purpose                                      |
| ----------------- | ------------ | -------------------------------------------- |
| `blueprints-path` | `blueprints` | Blueprint tree relative to repo root         |
| `post-comment`    | `true`       | Comment on PR when diffs are found           |
| `fail-on-diff`    | `true`       | Fail the job when the tree differs from base |

Set `fail-on-diff: false` to report diffs without blocking merges (useful while bootstrapping adoption).

## Weekly sample corpus refresh

Dogfood sample YAML under `blueprints/` is regenerated from upstream demo repos listed in [`scripts/blueprint-sample-repos.json`](../../scripts/blueprint-sample-repos.json).

| Path                                          | Role                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `scripts/blueprint-sample-repos.json`         | Shared catalog (`id`, clone URL, `context`, lookback)             |
| `scripts/run-blueprint-batch.sh`              | Local regen from sibling checkouts under `BLUEPRINT_BATCH_PARENT` |
| `.github/workflows/regenerate-blueprints.yml` | Weekly matrix: clone → `archlens` scan → assemble → PR            |

Workflow shape:

1. **prepare** — emit the Actions matrix from the JSON catalog.
2. **scan** (matrix) — install released `archlens` via [`scripts/install.sh`](../../scripts/install.sh) (same as publish), clone each sample repo, run headless scan into a per-repo artifact.
3. **assemble** — merge artifacts into `blueprints/`, reinstall sandbox products, validate, open a PR on `chore/regenerate-sample-blueprints`.

Optional `workflow_dispatch` input `archlens-version` pins the CLI release tag (leave empty for latest).

Schedule: Monday 03:00 UTC (+ `workflow_dispatch`). Merge the PR to refresh the committed corpus; the nightly publish workflow then uploads to R2.

Local equivalent (expects sibling clones named by catalog `id`):

```bash
scripts/run-blueprint-batch.sh
```

## Remote catalog publish (dogfood)

ArchLens dogfood publishes the `blueprints/` tree to object storage nightly so [archlens.dev](https://archlens.dev) can load diagrams from a remote corpus instead of a static bundle baked into the Pages deploy.

The workflow [`.github/workflows/publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) mirrors what customers should run:

1. Check out the repository (blueprint YAML only — no monorepo build).
2. Install **`archlens` from the latest [GitHub release](https://github.com/mzworthington/archlens/releases)** via [`scripts/install.sh`](../../scripts/install.sh).
3. `archlens validate blueprints/`
4. `archlens publish blueprints/ --no-dry-run` with R2 credentials in env (see [Cloudflare secrets](../cloudflare-secrets.md#r2-catalog-publish-token-ci-only)).

Example for your own pipeline:

```yaml
- uses: actions/checkout@v4

- name: Install ArchLens CLI
  run: |
    curl -fsSL https://raw.githubusercontent.com/mzworthington/archlens/main/scripts/install.sh | sh
    echo "$HOME/.local/bin" >> "$GITHUB_PATH"

- name: Validate and publish
  env:
    OBJECT_STORAGE_PROVIDER: r2
    OBJECT_STORAGE_BUCKET: ${{ secrets.R2_BLUEPRINT_CATALOG_BUCKET }}
    R2_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
    R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
  run: |
    archlens validate blueprints/
    archlens publish blueprints/ --no-dry-run --format=json
```

Contract and layout: [ADR-0010](../ADRs/0010-remote-blueprint-catalog-contract.md).
