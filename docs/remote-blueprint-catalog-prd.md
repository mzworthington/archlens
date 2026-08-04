# Remote blueprint catalog — product requirements (PRD)

**Status:** Draft · **Last updated:** 2026-08-04 · **Contract:** [ADR-0010](./ADRs/0010-remote-blueprint-catalog-contract.md)

## Problem

Organisations want architecture diagrams that **track their codebase** without checking generated YAML into git or redeploying a documentation site on every merge. ArchLens already produces validated BlueprintSpec YAML in CI; we need a **reference pattern** — **pipeline → object storage → Canvas** — that we dogfood on `archlens.dev` and document for customers.

## Personas

| Persona                   | Need                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| **Platform engineer**     | Wire nightly (or per-merge) scan + publish in CI with clear failure signals |
| **Architect / developer** | Browse and drill into diagrams in Canvas with the same navigation as today  |
| **ArchLens team**         | Replace the static bundled sandbox with a remotely updated corpus           |

## Goals

1. **Prove end-to-end** on our own repo: CLI publish → R2 → sandbox on `archlens.dev`.
2. **Publish a repeatable integration** (contract + example workflow) for customer pipelines.
3. **Preserve hexagonal boundaries** — shared contract in core; storage and auth behind ports/adapters.

## Non-goals (initial releases)

- Bi-directional sync (Canvas edits → storage)
- Multi-user real-time collaboration
- Hosting or managing customer buckets for them
- Downloading the full corpus before browsing (catalog-first, lazy YAML only)

## User stories (summary)

| #   | As a…                     | I want…                                                | So that…                                        |
| --- | ------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| 1   | Platform engineer         | CI to publish after a green validate                   | Diagrams update without a site deploy           |
| 2   | Platform engineer         | Failed validation to skip publish                      | Bad snapshots never reach consumers             |
| 3   | Architect                 | Sandbox to load catalog + diagrams from remote storage | I see current architecture, not a stale build   |
| 4   | Architect                 | Notice when a newer snapshot exists                    | I can refresh without waiting for a SPA release |
| 5   | Platform engineer (later) | Canvas to connect to our bucket with a profile         | We use the same pattern as the dogfood sandbox  |

Full Gherkin scenarios: behavioral contract tests in `app/packages/core/src/lib/remoteCatalogSnapshot.test.ts`.

## Delivery slices

| Slice                | Outcome                                                                 | Success signal                                            |
| -------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| **S0 — Contract**    | `manifest.json` + `catalog.json` + YAML layout; CLI `publish --dry-run` | Contract tests in `@archlens/core`                        |
| **S1 — Dogfood**     | Nightly GHA → validate → R2; sandbox reads remote                       | 7 consecutive successful publishes; sandbox paths resolve |
| **S1b — Refresh**    | User-triggered catalog refresh when `latest` revision changes           | Refresh without full page redeploy                        |
| **S2 — Org connect** | Practitioner connection profile UI + one S3-compatible adapter          | Internal dry-run against non-dogfood bucket               |
| **S3 — Hardening**   | Signed URLs, edge proxy, audit logging                                  | Per security review                                       |

## Success metrics

- Dogfood sandbox loads **100%** of catalog paths from remote for **7 consecutive** nightly publishes.
- Median **time-to-first-diagram** ≤ today's bundled baseline **±20%**.
- One **integration guide** validated by an internal dry-run (not dogfood bucket).

## Constraints and dependencies

- **Read-only in Canvas** — write stays in CLI/CI unless explicitly redesigned.
- **No secrets in the SPA bundle** — dogfood uses public-read or edge proxy (ADR-0011); customer credentials via CI or connection profiles (ADR-0013).
- **Privacy** — published YAML may include repo metadata in `source` blocks; organisations must understand they publish architecture metadata, not source code.
- **Atomic publish** — `latest/manifest.json` updates only after the full snapshot is uploaded (ADR-0010).

## Open decisions

1. **Offline fallback** — keep static `/bundled-blueprints/` until remote is stable, or remove in S1?
2. **Public dogfood bucket** — acceptable to expose forensics metadata in published YAML?
3. **Slice 2 browser auth** — presigned URLs vs public bucket vs Worker broker (ADR-0013).

## References

- [ADR-0010 — Catalog contract](./ADRs/0010-remote-blueprint-catalog-contract.md)
- [ADR-0004 — Local-first workspaces](./ADRs/0004-local-first-fs-access-and-indexeddb-working-copy.md)
- [GitHub Actions workflows](./guide/ci-workflows.md)
