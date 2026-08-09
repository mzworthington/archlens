---
status: Accepted
date: 2026-08-09
deciders: ['ArchLens maintainers']
---

# 0017. Keep browser scan structural and graduate forensics to the CLI

## Context and Problem Statement

Onboarding needs instant feedback from **Scan my repo in the browser**, but the full ArchLens CLI includes capabilities that do not map cleanly to a browser tab: git history, publish workflows, local watcher mode, and the complete filesystem/runtime surface. We need the browser path to share domain analysis without pretending it has CLI parity.

## Decision Drivers

- Fast onboarding: first value without shell install or repo mutation
- Boundary clarity: browser adapters must stay file-handle/memory based, not Node/Bun based
- Trust: UI and docs must be honest about missing git TraceLens and CI publish
- Maintainability: CLI and Canvas should share analysis domain logic rather than fork graph construction

## Considered Options

- Option A — Browser structural scan using shared `@archlens/analysis`, memory filesystem, and tree-sitter WASM where available
- Option B — Compile/run the Bun CLI in the browser with WebContainer/OPFS
- Option C — Keep browser scan as a separate lightweight regex-only implementation

## Decision Outcome

Chosen option: "**Option A**", because it gives instant feedback while preserving the CLI as the source of git forensics, watch mode, and publish workflows. The browser adapter runs shared analyzer logic off the UI thread and uses tree-sitter WASM when available, with a lightweight TypeScript/JavaScript import fallback for unsupported runtimes and tests.

### Consequences

- Good, because browser and CLI graph construction share the same analyzer and writer contracts
- Good, because users can try ArchLens without installing anything
- Good, because browser scan can stay read-only and avoid local repository writes
- Bad, because browser scan remains structure-only and cannot show TraceLens/git hotspots
- Follow-up: ZIP upload fallback for browsers without File System Access API

## Links

- Related ADRs: [ADR-0004](./0004-local-first-fs-access-and-indexeddb-working-copy.md), [ADR-0007](./0007-shared-archlens-core-as-published-language.md)
- Docs: [Getting started](../guide/getting-started.md)
