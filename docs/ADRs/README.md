# Architecture Decision Records

Sparse [MADR](https://adr.github.io/madr/)-style records for choices that are **hard to reverse** or **deliberately off-norm**. Recorded with the lifecycle kit skill `agent-adr`.

| ADR                                                                | Title                                                      | Status   | Date       |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | -------- | ---------- |
| [0001](./0001-yaml-blueprintspec-as-canonical-format.md)           | YAML BlueprintSpec as the sole editable source of truth    | Accepted | 2026-08-03 |
| [0002](./0002-entityref-hierarchical-diagram-identity.md)          | Hierarchical entityRef as diagram and node identity        | Accepted | 2026-08-03 |
| [0003](./0003-public-json-schema-major-version-channels.md)        | Public JSON Schema major-version channels                  | Accepted | 2026-08-03 |
| [0004](./0004-local-first-fs-access-and-indexeddb-working-copy.md) | Local-first FS Access and IndexedDB working copy           | Accepted | 2026-08-03 |
| [0005](./0005-go-wasm-chaoslens-with-typescript-fallback.md)       | Go WASM ChaosLens with TypeScript fallback                 | Accepted | 2026-08-03 |
| [0006](./0006-import-as-merge-into-active-diagram.md)              | Import external diagrams as merge into the active diagram  | Accepted | 2026-08-03 |
| [0007](./0007-shared-archlens-core-as-published-language.md)       | Shared `@archlens/core` as published language              | Accepted | 2026-08-03 |
| [0008](./0008-workspace-external-proxy-nodes.md)                   | Workspace external proxy nodes for cross-diagram endpoints | Accepted | 2026-08-03 |
| [0009](./0009-cloudflare-pages-static-hosting.md)                  | Cloudflare Pages static hosting with Pulumi and Wrangler   | Accepted | 2026-08-03 |

New ADRs: copy the kit template (`~/.agents/templates/adr.md`) to `docs/ADRs/NNNN-short-title.md`. Prefer not adding an ADR unless the gate in `agent-adr` applies.
