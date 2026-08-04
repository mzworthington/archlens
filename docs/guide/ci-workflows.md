# GitHub Actions workflows

Every workflow under [`.github/workflows/`](../../.github/workflows/).

| Name                      | Workflow                                                                                 | Purpose                                                                                  | Triggers                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CI & Deployment Pipeline  | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate, designer build; on `main` deploys Pages and may release the CLI            | `push` / `pull_request` → `main`; `workflow_dispatch`          |
| Publish samples catalog   | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | `samples/` → fragment → compose `estates/samples/`                                       | `push` → `main` when `samples/**` changes; `workflow_dispatch` |
| Publish blueprint catalog | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Scan this repo → fragment → compose `estates/samples/` (product `archlens`)              | Cron daily **05:00 UTC**; `workflow_dispatch`                  |
| Publish demo catalog      | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: scan demo repos → fragment → compose `estates/samples/` (product = demo id)      | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |
| Compose catalog           | [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml)                     | Safety-net compose for the shared samples estate (fragments + overlays)                  | Cron hourly **:15 UTC**; `workflow_dispatch`                   |
| Pulumi Cloudflare         | [`pulumi-cloudflare.yml`](../../.github/workflows/pulumi-cloudflare.yml)                 | Pulumi preview / apply for Pages, DNS, and catalog R2                                    | `infra/cloudflare/**` on PR / `main`; `workflow_dispatch`      |
| CodeQL Analysis           | [`codeql.yml`](../../.github/workflows/codeql.yml)                                       | CodeQL (JS/TS) → GitHub Security                                                         | `push` / `pull_request` → `main`; cron daily **12:00 UTC**     |
| Lighthouse                | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)                               | Designer Lighthouse CI + report artifact                                                 | Cron Sundays **00:00 UTC**; `workflow_dispatch`                |
| Refresh docs & media      | [`refresh-docs-media.yml`](../../.github/workflows/refresh-docs-media.yml)               | Regenerate schema, feature report, changelog, and guide GIFs; commit to `main` if needed | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |

Customer template files (not enabled here): [`blueprint-contract.yml.example`](../../.github/workflows/blueprint-contract.yml.example), [`advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).

## Shared samples estate (ADR-0014)

All dogfood publishers stage fragments into one catalog prefix so Canvas can peer-switch across contexts:

| Fragment product        | Workflow                              | Notes                                             |
| ----------------------- | ------------------------------------- | ------------------------------------------------- |
| `samples`               | Publish samples catalog               | Hand-authored trees under `samples/`              |
| `archlens`              | Publish blueprint catalog             | Scan of this repo                                 |
| `{id}` (e.g. backstage) | Publish demo catalog (per matrix leg) | `--context={id}` keeps BlueprintSpec paths unique |

Consumer: `VITE_REMOTE_CATALOG_BASE_URL=https://blueprints.archlens.dev/estates/samples/` on `main`.

## Compose triggers (ADR-0014)

Stitching is **not** storage-event driven. Dogfood uses:

1. **Primary** — each publish workflow runs `catalog publish-fragment` then `catalog compose` in the same job.
2. **Safety net** — [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml) re-composes `estates/samples/` hourly (`--allow-empty` so an empty fragment set does not fail).

CLI for these jobs is installed from GitHub Releases via [`.github/actions/setup-archlens-cli`](../../.github/actions/setup-archlens-cli/action.yml) (`scripts/install.sh`).

Publish paths prefer visibility over gating: validation does not block catalog push by default. Use `archlens validate` or `--validate` only when a pipeline wants an optional hard gate; `--skip-validation` is always allowed.
