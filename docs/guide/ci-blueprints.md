# Blueprint CI: contracts, sample scans, and remote catalog publish

Pin BlueprintSpec in pull requests the same way Structurizr Cloud or Backstage scorecards enforce architecture contracts. Dogfood shows how to **scan a codebase and publish to object storage** — YAML never needs to be committed.

## Layout

| Path                                  | Role                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `samples/`                            | Committed hand-authored demos                           |
| `blueprints/`                         | **Gitignored** scan output (local or CI workspace only) |
| `scripts/blueprint-sample-repos.json` | Example codebases for the sample-repo matrix job        |

## One-command customer pattern

```bash
archlens scan --headless --output=blueprints --context=my-app --publish
```

`--publish` uploads the scan output with the same credentials as `archlens publish … --no-dry-run` (`OBJECT_STORAGE_*` / `R2_*` env).

## Dogfood workflows

| Workflow                                                                                 | What it does                                                      |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`publish-blueprint-catalog.yml`](../../.github/workflows/publish-blueprint-catalog.yml) | Customer example: install latest CLI → scan this repo → publish   |
| [`scan-sample-repos.yml`](../../.github/workflows/scan-sample-repos.yml)                 | Matrix over `blueprint-sample-repos.json`: clone → scan → publish |
| [`ci.yml`](../../.github/workflows/ci.yml) `publish-samples`                             | On `main` pushes that touch `samples/**`: publish demos           |

Nothing is pushed back to git. Bundled Canvas fallback mirrors `samples/` only; production prefers the remote catalog.

## Blueprint contract (PRs)

Use the composite action with your own committed blueprint tree (customer repos), not this repo’s gitignored `blueprints/`.

Contract: [ADR-0010](../ADRs/0010-remote-blueprint-catalog-contract.md). Secrets: [cloudflare-secrets.md](../cloudflare-secrets.md).
