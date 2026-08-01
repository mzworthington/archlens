# Agent guidance

## Lifecycle kit location

Lifecycle agents, skills, and SOPs are **not** in this repo. Resolve the kit root in this order:

1. **`~/.agents`** — preferred. Local installs symlink this to a clone of [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit) via that repo’s `install.sh`.
2. **If `~/.agents` is missing** — use a checkout of `agent-lifecycle-kit` instead. Look for (first match wins):
   - sibling of this repo: `../agent-lifecycle-kit`
   - Cursor Cloud multi-repo path: `/agent/repos/agent-lifecycle-kit`
   - otherwise clone: `git clone https://github.com/mzworthington/agent-lifecycle-kit.git` (then prefer `./install.sh` so `~/.agents` points at it)

Treat that directory as the kit root (same layout as `~/.agents`: `AGENTS.md`, `CODING_PHILOSOPHY.md`, `skills/`, `SOPs/`, `handover/`). Read `<kit>/AGENTS.md` and `<kit>/CODING_PHILOSOPHY.md` before phase work. Skills live at `<kit>/skills/<name>/SKILL.md`.

Phase handover artifacts: `<kit>/handover/archlens/` (when using `~/.agents`, that is `~/.agents/handover/archlens/`).

Invoke phase work via skills such as `agent-orchestrator`, `agent-spec`, `agent-tdd`, `agent-adapter`, `agent-security`, `agent-arch-drift`, `agent-prune`, `agent-telemetry`, and `agent-pre-commit`.

Dead-code backlog: `<kit>/handover/blueprint/dead-code-backlog.md` (maintain via `agent-prune`).

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

## Cursor Cloud / agent toolchain

Toolchain is declared in `mise.toml` (node, **bun**, pnpm, go). Cloud agents should boot via `.cursor/environment.json`, which runs `bin/setup-dev-env.sh` (installs mise if needed, `mise install node pnpm bun go`, `pnpm install`, ChaosLens WASM, and bootstraps [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit) into `~/.agents` when missing). Bun must be on `PATH` for CLI build and husky **pre-push**.

If a shell is missing tools: `eval "$(mise activate bash --shims)"` or re-run `bin/setup-dev-env.sh`. Set `SKIP_LIFECYCLE_KIT=1` to skip the kit clone. Docs-media (`ffmpeg`/`vhs`) and Playwright browsers are not part of the default agent install — add them only when needed (`mise install` / `pnpm --filter @archlens/designer exec playwright install`).
