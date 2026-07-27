# `@blueprint/core` — Business Domain Layer

Shared, pure domain models and rules for Blueprint. No I/O adapters — browser and CLI depend on this package for one contract.

---

## Key Submodules

### `@blueprint/core` (kernel)

- **[schema.ts](./src/models/schema.ts):** TypeScript types for diagrams (`SystemSchema`, nodes, dependencies) and the `EntityRef` helpers.
- **[graph.ts](./src/rules/graph.ts):** Zod schema contracts, cycle validation, YAML/JSON parse & serialize, Mermaid export.
- **[entityRef.ts](./src/lib/entityRef.ts):** Workspace entity-ref resolution helpers.
- **[schemaMerge.ts](./src/rules/schemaMerge.ts):** Import merge plans and conflict resolution.
- **[workspaceExternals.ts](./src/rules/workspaceExternals.ts):** Cross-diagram external dependency materialization.

### Subpath exports

| Import                           | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `@blueprint/core`                | Kernel: models, graph, entity refs, merge, externals, paths |
| `@blueprint/core/import-mermaid` | Mermaid → `SystemSchema` import wizard                      |
| `@blueprint/core/import-iac`     | Terraform / Pulumi → `SystemSchema` import                  |
| `@blueprint/core/layout`         | Layout merge and parent/child grouping helpers              |
| `@blueprint/core/forensics`      | Refactor scoring, ownership, trend rollups                  |
| `@blueprint/core/cli`            | CLI-only scan helpers (e.g. `.csproj` references)           |

### `src/lib/`

- **[slug.ts](./src/lib/slug.ts):** Canonical `slugify` used by designer and CLI.

### `src/rules/`

- **[path.ts](./src/rules/path.ts):** Relative path utilities for multi-file blueprints.

---

## JSON Schema for IDEs

```bash
pnpm --filter @blueprint/core generate:schema
# or from app/: pnpm generate:schema
```

Writes `schemas/blueprint.schema.json` plus `schemas/v{n}/` and `schemas/latest/` copies at the repo root. Use `-- --check` in CI and pre-commit to fail if files are stale.

Public URLs (after GitHub Pages deploy):

- https://blueprint.mzworthington.co.uk/schemas/v4/blueprint.schema.json
- https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json

On-disk YAML is a mapping with `apiVersion`, `kind`, `metadata`, and `spec` (level, nodes, dependencies). See [docs/setup.md — YAML format](../../docs/setup.md#yaml-format-v4).

---

## Testing

```bash
pnpm --filter @blueprint/core test
```
