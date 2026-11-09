# Workflows

These are the GitHub Actions workflows under [`.github/workflows/`](../../.github/workflows/). An Architecture Decision Record (ADR) number in this page points at `docs/ADRs/`.

| Name                       | Workflow                                                                                 | Purpose                                                                                                                                                                  | Triggers                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| CI and deployment pipeline | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate and Canvas build. On `main` it deploys Pages and collab, smokes the commit secure hash, and rolls back on failure. `merge-gate` aggregates required checks. | `push` or `pull_request` to `main`, and `workflow_dispatch`                |
| Publish samples catalog    | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | `samples/` becomes a fragment, then compose writes `estates/samples/`.                                                                                                   | `push` to `main` when `samples/**` changes, and `workflow_dispatch`        |
| Publish blueprint catalog  | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Scan this repo. The scan hydrates committed `blueprints/archlens/context.yaml`, then fragment, then compose.                                                             | Cron daily at 05:00 UTC, and `workflow_dispatch`                           |
| Publish demo catalog       | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: assemble `contextDeclaration` from JSON, scan the demo, then fragment. One final compose.                                                                        | Cron Sundays at 06:00 UTC, and `workflow_dispatch`                         |
| Compose catalog            | [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml)                     | Safety-net compose for the shared samples estate. It reads fragments and overlays.                                                                                       | Cron hourly at :15 UTC, and `workflow_dispatch`                            |
| Prune catalog              | [`prune-catalog.yml`](../../.github/workflows/prune-catalog.yml)                         | Retention GC. Keep `latest` and 7 snapshots or 14 days, and 2 fragment runs per key.                                                                                     | Cron daily at 07:00 UTC, and `workflow_dispatch`                           |
| Pulumi Cloudflare          | [`pulumi-cloudflare.yml`](../../.github/workflows/pulumi-cloudflare.yml)                 | Thin caller of the edge-dns reusable workflow. Preview, then a `pulumi-prod` gated `up`.                                                                                 | `infra/cloudflare/**` on a pull request or `main`, and `workflow_dispatch` |
| CodeQL analysis            | [`codeql.yml`](../../.github/workflows/codeql.yml)                                       | CodeQL for JavaScript and TypeScript, including Pulumi TypeScript, Go ChaosLens, and GitHub Actions. Results go to GitHub Security.                                      | `push` or `pull_request` to `main`, and cron daily at 12:00 UTC            |
| Lighthouse                 | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)                               | Canvas Lighthouse CI and a report artifact.                                                                                                                              | Cron Sundays at 00:00 UTC, and `workflow_dispatch`                         |
| Refresh docs and media     | [`refresh-docs-media.yml`](../../.github/workflows/refresh-docs-media.yml)               | Regenerate the schema, the feature report, the changelog, and guide recordings. Commit to `main` when the output changed.                                                | Cron Sundays at 06:00 UTC, and `workflow_dispatch`                         |

Customer template files, not enabled here: [`blueprint-contract.yml.example`](../../.github/workflows/blueprint-contract.yml.example) and [`advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).

## Visual Studio Marketplace

`publish-vscode-marketplace` stays commented out in [`ci.yml`](../../.github/workflows/ci.yml). No workflow runs `vsce publish` or `ovsx publish`. A merge to `main` leaves the Visual Studio Marketplace listing unchanged, and it leaves the Open VSX listing that Cursor searches unchanged.

The unit-tests job runs `package:pre-release` and uploads the `archlens-vscode-pre-release` artifact. That file is for sideload. It's not a Marketplace release.

`publish-cli-release` in that same file ships the ArchLens CLI to GitHub Releases. The catalog workflows in the table publish BlueprintSpec to object storage. Those jobs stay enabled. They don't list the editor extension.

See [Editor extension](./vscode.md) for the local sandbox, VSIX sideload, and the manual pre-release command.

Make `merge-gate` the required status check on `main` for both pull requests and pushes. Pull requests skip smoke. The gate treats that skip as success and requires smoke only when `main` deploys.

## Shared samples estate

All catalog publishers stage fragments into one prefix so Canvas can peer-switch across contexts.

| Fragment product            | Workflow                             | Notes                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `samples`                   | Publish samples catalog              | Hand-authored trees under `samples/`                                                                                                                                                                                |
| `archlens`                  | Publish blueprint catalog            | Committed [`blueprints/archlens/context.yaml`](../../blueprints/archlens/context.yaml). The scan hydrates that file in place.                                                                                       |
| `{id}`, such as `backstage` | Publish demo catalog, per matrix leg | The job assembles `contextDeclaration` in [`scripts/blueprint-sample-repos.json`](../../scripts/blueprint-sample-repos.json) before the scan. Optional `cloneDepth`, default 100, caps git history for large repos. |

**Declared context, ADR-0015.** This repo commits its ArchLens context under `blueprints/`, the same way any consumer would. Demo catalog jobs still assemble synthetic seeds from JSON for external sample repos via [`scripts/assemble-context-seed.mjs`](../../scripts/assemble-context-seed.mjs).

Consumer: `VITE_REMOTE_CATALOG_BASE_URL=https://blueprints.archlens.dev/estates/samples/` on `main`.

## Compose triggers

Stitching isn't storage-event driven. The samples estate uses three paths.

1. **Primary.** `publish-samples` and `publish-blueprint-catalog` run `catalog publish-fragment` and then `catalog compose` in the same job. `publish-demo-catalog` publishes fragments in parallel matrix legs, then runs one compose job after the matrix. That single compose avoids concurrent compare-and-swap on `latest/manifest.json`.
2. **Safety net.** [`compose-catalog.yml`](../../.github/workflows/compose-catalog.yml) re-composes `estates/samples/` hourly. `--allow-empty` means an empty fragment set doesn't fail the job. When the composed content hash already matches `latest.revision`, compose is a no-op and doesn't re-upload the snapshot. The workflow stays a thin caller. Transient R2 `InternalError` and 5xx handling, and CAS backoff, live in the CLI. Canvas consume uses the HTTP adapter's matching 8-attempt 5xx budget. `@archlens/storage` `catalogPublishConsumeLoad.test.ts` covers concurrent publish and consume under injected 5xx. That test isn't a live R2 soak.
3. **Retention.** [`prune-catalog.yml`](../../.github/workflows/prune-catalog.yml) runs daily at 07:00 UTC. The default is a dry run. Enable deletes with workflow input `execute=true` or repo variable `PRUNE_CATALOG_EXECUTE=true`. Policy: keep the `latest` revision, plus at least the 7 newest snapshots and anything within 14 days, and keep the 2 newest runs per fragment key. The job never deletes `latest/` or `overlays/`. It requires a CLI release that includes `archlens catalog prune`.

Compose jobs share the GitHub Actions concurrency group `samples-estate-compose`, so only one samples-estate stitch runs at a time. Compose reloads fragments and backs off on CAS conflicts and transient R2 errors, using `--max-retries`, default 8. Fragment load reads every staged manifest but fetches YAML bodies only for the freshest run per `fragmentKey`.

[`.github/actions/setup-archlens-cli`](../../.github/actions/setup-archlens-cli/action.yml) installs the CLI for these jobs from GitHub Releases, through `scripts/install.sh`.

After a CLI release that nests matching context and system refs under `…/system`, which is ADR-0002 Zoom identity, re-run **Publish demo catalog** and **Publish blueprint catalog** so remote corpora pick up the new `entityRefs`. Zoom on production requires both the new CLI publish and a Canvas deploy.

Publish paths prefer visibility over gating. Validation doesn't block catalog push by default. Use `archlens validate` or `--validate` only when a pipeline wants an optional hard gate. `--skip-validation` is always allowed.
