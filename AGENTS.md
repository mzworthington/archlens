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

## Cursor Cloud specific instructions

The toolchain is provisioned with **mise** from `mise.toml` (node 26.4.0, pnpm 11.10.0, bun 1.3.14, go 1.26.5). mise is activated for interactive shells via `~/.bashrc`; if a non-interactive shell can't find `node`/`pnpm`/`go`, run `eval "$(mise activate bash)"` (or prepend `~/.local/share/mise/shims` to `PATH`). The startup update script already runs `mise install` + `pnpm install` (in `app/`) + `make ensure-wasm`, so deps are ready on boot — no need to reinstall.

- **Run the designer (primary app):** `cd app && pnpm dev` serves docs at `/` and the canvas at `/workspace` on http://localhost:5173/. `predev` runs `make -C resilience-engine ensure-wasm`, which compiles the ChaosLens Go→WASM bundle, so **Go must be on `PATH`** for the dev server (and build) to start. Standard build/test/lint commands live in `README.md`, `docs/setup.md`, and `app/package.json`.
- **Docs-media tooling is NOT installed:** `ffmpeg`/`vhs` from `mise.toml` are intentionally skipped in this environment, so `pnpm record:docs-media` and `pnpm test:vhs` will not work without installing them first.
- **Playwright browsers are NOT installed:** `pnpm test:e2e` / `test:a11y` / `test:lighthouse` need `pnpm --filter @archlens/designer exec playwright install` (plus system deps) before they can run. Unit tests (`pnpm test`) and Go tests (`make -C resilience-engine test`) work out of the box.
- **Quarantined Rust:** the `cli/` tree is unmaintained; `cargo build` fails unless `BLUEPRINT_RUST_ALLOW_BUILD=1`. Use `@archlens/cli` (TypeScript/Bun) instead.
- **Sibling repo in this cloud workspace:** `/agent/repos/mzworthington` is a Jekyll site (Ruby 3.3.4 via mise; the site needs `libssl-dev`, `libyaml-dev`, `libreadline-dev` to compile Ruby, already baked into the environment). Run it with `bundle exec jekyll serve` (defaults to http://localhost:4000/); the startup update script runs `bundle install` for it. `/agent/repos/agent-lifecycle-kit` is a markdown-only skills kit with nothing to build or run.
