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
