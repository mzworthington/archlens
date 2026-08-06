# GitHub Actions workflows

Every workflow under [`.github/workflows/`](../../.github/workflows/).

| Name                      | Workflow                                                                                 | Purpose                                                                                     | Triggers                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CI & Deployment Pipeline  | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate, canvas build; on `main` deploys Pages and may release the CLI                 | `push` / `pull_request` → `main`; `workflow_dispatch`          |
| Publish samples catalog   | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | `samples/` → fragment → compose `estates/samples/`                                          | `push` → `main` when `samples/**` changes; `workflow_dispatch` |
| Publish blueprint catalog | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Scan this repo (hydrates committed `blueprints/archlens/context.yaml`) → fragment → compose | Cron daily **05:00 UTC**; `workflow_dispatch`                  |
| Publish demo catalog      | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: assemble `contextDeclaration` from JSON → scan demo → fragment; one final compose   | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |
| Compose catalog           | [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml)                     | Safety-net compose for the shared samples estate (fragments + overlays)                     | Cron hourly **:15 UTC**; `workflow_dispatch`                   |
| Prune catalog             | [`prune-catalog.yml`](../../.github/workflows/prune-catalog.yml)                         | Retention GC: keep `latest` ∪ 7 snapshots / 14 days; 2 fragment runs per key                | Cron daily **07:00 UTC**; `workflow_dispatch`                  |
| Pulumi Cloudflare         | [`pulumi-cloudflare.yml`](../../.github/workflows/pulumi-cloudflare.yml)                 | Preview always; `pulumi up` only after **pulumi-prod** environment approval                 | `infra/cloudflare/**` on PR / `main`; `workflow_dispatch`      |
| CodeQL Analysis           | [`codeql.yml`](../../.github/workflows/codeql.yml)                                       | CodeQL (JS/TS) → GitHub Security                                                            | `push` / `pull_request` → `main`; cron daily **12:00 UTC**     |
| Lighthouse                | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)                               | Canvas Lighthouse CI + report artifact                                                      | Cron Sundays **00:00 UTC**; `workflow_dispatch`                |
| Refresh docs & media      | [`refresh-docs-media.yml`](../../.github/workflows/refresh-docs-media.yml)               | Regenerate schema, feature report, changelog, and guide GIFs; commit to `main` if needed    | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |

Customer template files (not enabled here): [`blueprint-contract.yml.example`](../../.github/workflows/blueprint-contract.yml.example), [`advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).

## Shared samples estate (ADR-0014)

All catalog publishers stage fragments into one prefix so Canvas can peer-switch across contexts:

| Fragment product        | Workflow                              | Notes                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `samples`               | Publish samples catalog               | Hand-authored trees under `samples/`                                                                                                                                                                   |
| `archlens`              | Publish blueprint catalog             | Committed [`blueprints/archlens/context.yaml`](../../blueprints/archlens/context.yaml); scan hydrates in place                                                                                         |
| `{id}` (e.g. backstage) | Publish demo catalog (per matrix leg) | `contextDeclaration` in [`scripts/blueprint-sample-repos.json`](../../scripts/blueprint-sample-repos.json) assembled before scan; optional `cloneDepth` (default 100) caps git history for large repos |

**Declared context (ADR-0015):** this repo commits its ArchLens context under `blueprints/` like any consumer would. Demo catalog jobs still assemble synthetic seeds from JSON for external sample repos via [`scripts/assemble-context-seed.mjs`](../../scripts/assemble-context-seed.mjs).

Consumer: `VITE_REMOTE_CATALOG_BASE_URL=https://blueprints.archlens.dev/estates/samples/` on `main`.

## Compose triggers (ADR-0014)

Stitching is **not** storage-event driven. The samples estate uses:

1. **Primary** — `publish-samples` and `publish-blueprint-catalog` run `catalog publish-fragment` then `catalog compose` in the same job. `publish-demo-catalog` publishes fragments in parallel matrix legs, then runs **one** compose job after the matrix (avoids concurrent CAS on `latest/manifest.json`).
2. **Safety net** — [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml) re-composes `estates/samples/` hourly (`--allow-empty` so an empty fragment set does not fail).
3. **Retention** — [`prune-catalog.yml`](../../.github/workflows/prune-catalog.yml) runs daily at **07:00 UTC**. Default is **dry-run**; enable deletes via workflow input `execute=true` or repo variable `PRUNE_CATALOG_EXECUTE=true`. Policy: keep the `latest` revision, plus at least the 7 newest snapshots and anything within 14 days; keep 2 newest runs per fragment key. Never deletes `latest/` or `overlays/`. Requires a CLI release that includes `archlens catalog prune`.

Compose jobs share the GitHub Actions concurrency group `samples-estate-compose` so only one samples-estate stitch runs at a time. Compose also reloads fragments and backs off on CAS conflicts (`--max-retries`, default 8).

CLI for these jobs is installed from GitHub Releases via [`.github/actions/setup-archlens-cli`](../../.github/actions/setup-archlens-cli/action.yml) (`scripts/install.sh`).

After a CLI release that nests matching context/system refs under `…/system` (ADR-0002 Zoom identity), re-run **Publish demo catalog** and **Publish blueprint catalog** so remote corpora pick up the new entityRefs; Zoom on production requires both the new CLI publish and a Canvas deploy.

Publish paths prefer visibility over gating: validation does not block catalog push by default. Use `archlens validate` or `--validate` only when a pipeline wants an optional hard gate; `--skip-validation` is always allowed.
