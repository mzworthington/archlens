# GitHub Actions workflows

Every workflow under [`.github/workflows/`](../../.github/workflows/).

| Name                      | Workflow                                                                                 | Purpose                                                                                  | Triggers                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CI & Deployment Pipeline  | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate, designer build; on `main` deploys Pages and may release the CLI            | `push` / `pull_request` → `main`; `workflow_dispatch`          |
| Publish samples catalog   | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | Publish `samples/` to `estates/samples/` (`--skip-validation`)                           | `push` → `main` when `samples/**` changes; `workflow_dispatch` |
| Publish blueprint catalog | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Scan this repo → `estates/archlens/` (`--skip-validation`)                               | Cron daily **05:00 UTC**; `workflow_dispatch`                  |
| Publish demo catalog      | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: each demo → `estates/demos/{id}/` (`--skip-validation`)                          | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |
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

Fragment compose (many pipelines → one estate) is available via `archlens catalog publish-fragment` + `archlens catalog compose` ([ADR-0014](../ADRs/0014-estate-fragments-and-compose-before-publish.md)). Accepted suggestions stage as `archlens catalog accept-overlay` and are merged on compose; reject tombstones via `reject-overlay`. Dogfood workflows still use whole-tree publish under isolated prefixes until they switch to fragment staging.

Publish paths prefer visibility over gating: validation does not block catalog push by default. Use `archlens validate` or `--validate` only when a pipeline wants an optional hard gate; `--skip-validation` is always allowed.
