# GitHub Actions workflows

Every workflow under [`.github/workflows/`](../../.github/workflows/).

| Name                      | Workflow                                                                                 | Purpose                                                                                     | Triggers                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| CI & Deployment Pipeline  | [`ci.yml`](../../.github/workflows/ci.yml)                                               | Quality gate, designer build; on `main` deploys Pages and may release the CLI               | `push` / `pull_request` → `main`; `workflow_dispatch`          |
| Publish samples catalog   | [`publish-samples.yml`](../../.github/workflows/publish-samples.yml)                     | Publish committed `samples/` demos to the remote catalog (`--skip-validation`)              | `push` → `main` when `samples/**` changes; `workflow_dispatch` |
| Publish blueprint catalog | [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Install latest CLI → `scan --publish` this repo (`--skip-validation`)                       | Cron daily **05:00 UTC**; `workflow_dispatch`                  |
| Publish demo catalog      | [`publish-demo-catalog.yml`](../../.github/workflows/publish-demo-catalog.yml)           | Matrix: clone repos in `blueprint-sample-repos.json` → scan → publish (`--skip-validation`) | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |
| Pulumi Cloudflare         | [`pulumi-cloudflare.yml`](../../.github/workflows/pulumi-cloudflare.yml)                 | Pulumi preview / apply for Pages, DNS, and catalog R2                                       | `infra/cloudflare/**` on PR / `main`; `workflow_dispatch`      |
| CodeQL Analysis           | [`codeql.yml`](../../.github/workflows/codeql.yml)                                       | CodeQL (JS/TS) → GitHub Security                                                            | `push` / `pull_request` → `main`; cron daily **12:00 UTC**     |
| Lighthouse                | [`lighthouse.yml`](../../.github/workflows/lighthouse.yml)                               | Designer Lighthouse CI + report artifact                                                    | Cron Sundays **00:00 UTC**; `workflow_dispatch`                |
| Refresh docs & media      | [`refresh-docs-media.yml`](../../.github/workflows/refresh-docs-media.yml)               | Regenerate schema, feature report, changelog, and guide GIFs; commit to `main` if needed    | Cron Sundays **06:00 UTC**; `workflow_dispatch`                |

Customer template files (not enabled here): [`blueprint-contract.yml.example`](../../.github/workflows/blueprint-contract.yml.example), [`advicelens-gate.yml.example`](../../.github/workflows/advicelens-gate.yml.example).
