# Agent guidance

Lifecycle agents, skills, and SOPs live in `~/.agents` (user-global), not in this repo.

Phase handover artifacts: `~/.agents/handover/archlens/`

Invoke phase work via skills such as `agent-orchestrator`, `agent-spec`, `agent-tdd`, `agent-adapter`, `agent-security`, `agent-arch-drift`, `agent-prune`, `agent-telemetry`, and `agent-pre-commit`.

Dead-code backlog: `~/.agents/handover/blueprint/dead-code-backlog.md` (maintain via `agent-prune`).

Before handover or declaring work complete, run `agent-pre-commit` when `.husky/pre-commit` (or equivalent) exists — fix hook failures until green.

Before handover, also run `cd app && pnpm typecheck && pnpm build` when you touched `app/packages/designer` or added tests under `src/` (designer `tsc -b` includes `*.test.ts`; Vitest passing does not imply typecheck passes). Git hooks: **pre-commit** runs typecheck on staged `app/` files; **pre-push** runs typecheck + build on pushed `app/` commits.

## ArchLens domain conventions

- **Canonical format:** YAML `SystemSchema` files (BlueprintSpec) linked by `entityRef` - not Mermaid. Mermaid is a derived export (`serializeSchemaToMermaid` in `@archlens/core`).
- **Import direction:** External diagrams enter via **import wizards** that parse into `SystemSchema`, preview merge conflicts, and apply only user-approved changes. Do not make export-only views (e.g. Code Viewer Mermaid tab) editable.
- **Populated workspaces:** Prefer **merge-into-active-diagram** with conflict preview over wholesale file replacement. Disk writes go through the existing DiffMenu commit flow.

## TDD mandate

1. **Red:** Write failing unit tests in `@archlens/core` for pure domain logic (parsers, merge plans) before implementation.
2. **Green:** Minimal implementation to pass tests.
3. **Refactor:** Only after green; keep parsers and merge logic in core, UI in designer adapters.

Core import modules: `app/packages/core/src/rules/mermaidImport.ts`, `schemaMerge.ts`. Terraform parsing: `terraformImport.ts` (CLI only).
