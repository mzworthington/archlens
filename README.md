# ArchLens — Visual Systems Architecture Canvas

[![CI & Deployment Pipeline](https://github.com/mzworthington/archlens/actions/workflows/ci.yml/badge.svg)](https://github.com/mzworthington/archlens/actions/workflows/ci.yml) [![CodeQL Analysis](https://github.com/mzworthington/archlens/actions/workflows/codeql.yml/badge.svg)](https://github.com/mzworthington/archlens/actions/workflows/codeql.yml)
![GitHub last commit](https://img.shields.io/github/last-commit/mzworthington/archlens)

ArchLens is a local-first, bi-directionally synchronized visual diagramming platform designed to draft, validate, and persist systems architecture layouts. Diagrams are visual representations of a strict underlying **BlueprintSpec** YAML/JSON declarative schema, allowing designers to switch seamlessly between graphical composition and text configuration.

---

## ArchLens Canvas

![ArchLens Interface Tour & Catalog](./docs/screenshots/1-panels-expanded.png)

A front-end visual canvas web application client. Double-click boundary nodes to drill down into C4 container/component levels and edit schemas side-by-side with code-viewer synchronization.

👉 **Learn more:** [app/packages/designer/README.md](./app/packages/designer/README.md)

---

## Blueprint CLI

![Blueprint CLI Interactive Prompts](./docs/screenshots/cli.gif)

A command-line static analysis (AST) codebase scanner. It parses source files, extracts modules, identifies components and dependency references, computes an optimal layout using Dagre, and outputs valid BlueprintSpec YAML inside the `blueprints/` directory.

👉 **Learn more:** [app/packages/cli/README.md](./app/packages/cli/README.md)

---

## Workspace Component Catalog

| Component                           | Path                                               | Language/Framework                       | Description                                                                                  |
| :---------------------------------- | :------------------------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------- |
| **`@archlens/designer`**            | [app/packages/designer/](./app/packages/designer/) | TypeScript / React / Vite / React Flow   | Front-end visual diagramming client                                                          |
| **`@archlens/cli`**                 | [app/packages/cli/](./app/packages/cli/)           | TS / Node / Bun / Ts-Morph / Tree-Sitter | Production codebase scanner & Bun binary (`blueprint` executable)                            |
| **`@archlens/core`**                | [app/packages/core/](./app/packages/core/)         | TypeScript / Zod                         | Shared domain types, validation, entityRef rules (BlueprintSpec)                             |
| **`blueprint-rust` (unmaintained)** | [cli/](./cli/)                                     | Rust                                     | Quarantined — `cargo build` fails unless `BLUEPRINT_RUST_ALLOW_BUILD=1`; use `@archlens/cli` |

Schema source of truth is TypeScript + Zod in `@archlens/core` (no Protocol Buffers).

---

## Development & Build Commands

### Visual frontend & packages (`/app`)

```bash
cd app

pnpm install
pnpm dev                 # docs at / + canvas at /workspace
pnpm build
pnpm lint
pnpm format:check
pnpm test                # all workspace packages
pnpm test:designer
pnpm test:cli
pnpm test:e2e
```

### TypeScript CLI (`/app/packages/cli`)

```bash
cd app

pnpm dev:cli
pnpm dev:cli --headless --glob="packages/**/*.ts" --output="blueprints"
pnpm --filter @archlens/cli build
pnpm test:cli
```

---

## Deep-dive documentation

Product guide and reference live as Markdown under [`docs/`](./docs/) (same files locally, in git, and on the site):

- **[Product guide](./docs/guide/index.md)** — overview, ArchLens Canvas, Blueprint CLI, TraceLens, ChaosLens
- **[E2E Journeys & Interface Tour](./docs/journeys.md)**
- **[Unit test features](./docs/features-unit.md)** — generated Vitest feature report (`pnpm generate:features-unit`)
- **[System Architecture & Security](./docs/architecture.md)**
- **[Setup & Local Development](./docs/setup.md)**

```bash
cd app
pnpm dev   # docs (/) + workspace (/workspace) in one Vite app
```

Live site: [archlens.dev](https://archlens.dev) — documentation at `/`, canvas at `/workspace`.

---

## Roadmap

Outstanding enhancements planned for ArchLens:

### ChaosLens

Shipped (MVP):

- **ChaosLens** — fault injection, blast-radius heatmap, and SLA telemetry on the active diagram.
- **Safeguard what-ifs** — circuit breaker, bulkhead, retry, and local cache toggles per simulation run.
- **Monte Carlo engine** — Go/WASM core with P5/mean/P95 bands when WASM is loaded; TypeScript deterministic fallback with group-boundary parity.

Planned (see `PLAN.md`):

- OTel ingestion, CI guardrails, executive-mode summaries.

### TraceLens & refactoring

- **Guided refactor workflow:** Turn TraceLens rankings into actionable refactor boundaries, ownership breakdown, and one-click canvas navigation. _(shipped — `/tracelens` refactor plan slide-over, `forensics.authors` from Blueprint CLI)_

### Strategic differentiators

- **Code ↔ infrastructure linking:** Cross-diagram dependencies between product and infrastructure hubs (inferred from naming, tags, or annotations).
- **CI architecture drift gate:** `blueprint --headless` in CI diffs generated YAML against committed `blueprints/` and fails on unreviewed structural changes.
- **Architecture governance rules engine:** Configurable policy checks (e.g. no person→database at context level) surfaced as designer warnings.

### Integrations

- **Direct Git branch integration:** View active git branch states within the web app and commit/push schema changes to new branches.

### Designer canvas performance

Shipped:

- **Diagram loading overlay:** Full-canvas loading state when lazy-loading blueprints, switching diagrams, and running autolayout. Uses monotonic session tokens so only the active navigation clears the overlay (safe under React Strict Mode and fast drill-down).
- **Off-main-thread layout:** Dagre runs in a dedicated Web Worker for diagrams with 24+ nodes; graphs with 80+ nodes are laid out by connected component with UI yields between chunks.

### C# and .NET analysis

Shipped:

- **`.csproj` project references:** Inter-container edges from `<ProjectReference>` (e.g. `Ordering.API` → `Ordering.Domain`).
- **Namespace `using` resolution:** Cross-container and layer edges from `using` directives, with framework namespaces filtered (`System.*`, `Microsoft.*`, etc.).
- **Container discovery from `.csproj`:** Referenced projects appear even when no `.cs` files are in the scan glob (e.g. AppHost-only references).

### TypeScript / monorepo analysis

Shipped:

- **Workspace package imports:** `package.json` `name` → container mapping (e.g. `@archlens/core` → `core`) with component-level edges to the package entry (`index`) or subpath target.
- **Built-in module filtering:** Node.js core modules (`path`, `fs`, …) no longer match unrelated in-repo files by basename.
- **Externals enrichment pass:** Cross-container component dependencies materialize as `external: true` proxy nodes on component diagrams after scan.

Planned:

- **Aspire AppHost parsing:** Extract runtime topology from `builder.AddProject<...>()` and related Aspire hosting APIs.
- **Integration event wiring:** Detect `IIntegrationEventHandler<T>`, event bus registration (`AddRabbitMqEventBus`, etc.), and `IntegrationEvents/` folders to surface publish–subscribe edges between services.
- **HTTP / gRPC client edges:** Infer service-to-API calls from `HttpClient`, Refit clients, and gRPC stubs (namespace and naming conventions).
