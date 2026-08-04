# GitHub Actions workflows

Every workflow under [`.github/workflows/`](../../.github/workflows/).

| Name                      | Workflow                                                                                 | Purpose                                                                                  | Triggers                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CI & Deployment Pipeline  | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate, designer build; on `main` deploys Pages and may release the CLI            | `push` / `pull_request` → `main`; `workflow_dispatch`          |
| Publish samples catalog   | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | `samples/` → fragment → compose `estates/samples/`                                       | `push` → `main` when `samples/**` changes; `workflow_dispatch` |
| Publish blueprint catalog | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Scan this repo → fragment → compose `estates/archlens/`                                  | Cron daily **05:00 UTC**; `workflow_dispatch`                  |
| Publish demo catalog      | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: scan demo repos → fragment → compose `estates/demos/{id}/`                       | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |
| Compose catalog           | [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml)                     | Safety-net compose for all dogfood estates (fragments + overlays)                        | Cron hourly **:15 UTC**; `workflow_dispatch`                   |
| Pulumi Cloudflare         | [`pulumi-cloudflare.yml`](../../.github/workflows/pulumi-cloudflare.yml)                 | Pulumi preview / apply for Pages, DNS, and catalog R2                                    | `infra/cloudflare/**` on PR / `main`; `workflow_dispatch`      |
| CodeQL Analysis           | [`codeql.yml`](../../.github/workflows/codeql.yml)                                       | CodeQL (JS/TS) → GitHub Security                                                         | `push` / `pull_request` → `main`; cron daily **12:00 UTC**     |
| Lighthouse                | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)                               | Designer Lighthouse CI + report artifact                                                 | Cron Sundays **00:00 UTC**; `workflow_dispatch`                |
| Refresh docs & media      | [`refresh-docs-media.yml`](../../.github/workflows/refresh-docs-media.yml)               | Regenerate schema, feature report, changelog, and guide GIFs; commit to `main` if needed | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |

Customer template files (not enabled here): [`blueprint-contract.yml.example`](../../.github/workflows/blueprint-contract.yml.example), [`advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).

## Catalog key prefixes (ADR-0014 Phase 0)

Publish jobs write under separate object-storage prefixes so they do not clobber one `latest`:

| Prefix                | Workflow                              | Canvas base URL                                                                                |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `estates/archlens/`   | Publish blueprint catalog             | `https://blueprints.archlens.dev/estates/archlens/` (`VITE_REMOTE_CATALOG_BASE_URL` on `main`) |
| `estates/samples/`    | Publish samples catalog               | optional secondary catalog                                                                     |
| `estates/demos/{id}/` | Publish demo catalog (per matrix leg) | per-demo catalog                                                                               |

## Compose triggers (ADR-0014)

Stitching is **not** storage-event driven. Dogfood uses:

1. **Primary** — each publish workflow runs `catalog publish-fragment` then `catalog compose` in the same job.
2. **Safety net** — [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml) re-composes every dogfood estate hourly (`--allow-empty` so estates without fragments do not fail).

CLI for these jobs is built from the checkout via [`.github/actions/setup-archlens-cli`](../../.github/actions/setup-archlens-cli/action.yml) (catalog commands may not be on the latest GitHub Release yet).

Publish paths prefer visibility over gating: validation does not block catalog push by default. Use `archlens validate` or `--validate` only when a pipeline wants an optional hard gate; `--skip-validation` is always allowed.
