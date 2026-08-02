# AdviceLens gate in CI

Block pull requests when estate failure simulations drop SLA below your threshold, and publish a structured AdviceLens JSON artifact for review.

## Quick start

```yaml
name: AdviceLens gate

on:
  pull_request:
    branches: [main]
    paths:
      - 'blueprints/**'
      - 'chaos-specs/**'

jobs:
  advicelens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/advicelens-gate
        with:
          blueprints-path: blueprints
          min-sla: '95'
```

See [`.github/workflows/advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).

## What it does

1. **`archlens resilience`** — runs default ChaosLens estate scenarios (and optional ChaosSpecs) across the blueprint tree.
2. **JSON artifact** — writes `.archlens/advicelens-report.json` (`kind: advicelens-estate-report`) and uploads it as `advicelens-report`.
3. **PR comment** — posts worst SLA, SPOF count, and top recommendations.
4. **Gate** — exits non-zero when `summary.worstOverallSla` is below `--min-sla` (default in the action: `95`). Optionally also fail when any recommendation is emitted.

## CLI usage

```bash
# Text summary (fails when worst SLA < 100 by default)
archlens resilience blueprints/

# CI-friendly artifact
archlens resilience blueprints/ \
  --format=json \
  --output=.archlens/advicelens-report.json \
  --min-sla=95

# Also fail when recommendations are present
archlens resilience blueprints/ --fail-on-recommendations --min-sla=95
```

Artifact shape (same as designer **Copy JSON** / **Download** on the AdviceLens tab):

```json
{
  "kind": "advicelens-estate-report",
  "version": 1,
  "summary": {
    "diagramCount": 1,
    "totalScenarios": 4,
    "worstOverallSla": 94,
    "totalSpofs": 2,
    "recommendationCount": 3
  },
  "recommendations": [],
  "diagrams": []
}
```

Heat maps are plain JSON objects (not `Map`), so the file is safe for artifacts and PR tooling.

## Action inputs

| Input                     | Default                            | Purpose                                      |
| ------------------------- | ---------------------------------- | -------------------------------------------- |
| `blueprints-path`         | `blueprints`                       | Blueprint tree relative to repo root         |
| `chaos-specs-path`        | _(empty)_                          | Optional ChaosSpec YAML directory            |
| `min-sla`                 | `95`                               | Fail when worst estate SLA is below this %   |
| `fail-on-recommendations` | `false`                            | Also fail when any recommendation is emitted |
| `post-comment`            | `true`                             | Comment on PR with a report summary          |
| `artifact-path`           | `.archlens/advicelens-report.json` | Where to write the JSON artifact             |

## Designer export

On **TraceLens → AdviceLens**, use **Copy JSON** or **Download** to export the same artifact from the loaded estate (handy for RFCs and attaching to PRs without the CLI).
