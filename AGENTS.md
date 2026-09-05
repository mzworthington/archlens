# Agent Handshake

Standards and lifecycle agents live in `~/.agents` ([Waykit](https://github.com/mzworthington/waykit)).

Start from `~/.agents/AGENTS.md` (thin index). **Do not** bulk-read philosophy, SOPs or skills up front.

If `~/.agents` is missing: sibling `../waykit` (or `../agent-lifecycle-kit`), Cursor Cloud `/agent/repos/waykit` or `bin/setup-dev-env.sh` (set `SKIP_LIFECYCLE_KIT=1` to skip). Prefer `./install.sh` in that clone so `~/.agents` points at it.

| Situation                          | Load                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Any task                           | `~/.agents/AGENTS.md` invariants + phase table                           |
| Architecture / new structure       | `CODING_PHILOSOPHY.md` (or kit-knowledge `get_philosophy_section`)       |
| Feature lifecycle                  | `skills/agent-orchestrator`                                              |
| Bug / CI / live symptom            | `skills/agent-debug`                                                     |
| Cloudflare Pages / RUM / beacon    | `skills/agent-cloudflare-ops` (`wk mcp cloudflare-ops --project`)        |
| Prompt / MCP tool / routing change | `docs/edd.md` + EDD SOP (`wk eval run\|ci`)                              |
| Handshake / kit bootstrap          | `wk align .` (pointers, MCP, commit-msg). Community files: `wk doctor .` |
| SOP / handover lookup              | kit-knowledge MCP                                                        |
| Durable project facts              | memory MCP (glossary, SLOs, prefs — never secrets)                       |

Phase handovers: `~/.agents/handover/archlens/`. Dead-code and complexity backlogs live there (`agent-prune`).

For bugs and failed jobs, use `agent-debug`. Do not open the full feature lifecycle unless RCA needs a new capability.

For non-trivial feature work, before coding: inventory tests (functional + XFN), complete an XFN apply/skip matrix, then orchestrator routing (grill if unsettled → spec → TDD → XFN → audit → release).

## ArchLens invariants

- **Canonical format:** YAML `SystemSchema` (BlueprintSpec) linked by `entityRef`. Mermaid is a derived export (`serializeSchemaToMermaid` in `@archlens/core`).
- **Imports:** External diagrams enter via import wizards into `SystemSchema` with conflict preview. Do not make export-only views editable.
- **Workspaces:** Prefer merge-into-active-diagram. Disk writes go through the DiffMenu commit flow.
- **TDD for parsers/merge:** Red → green → refactor in `@archlens/core`. UI stays in canvas adapters. Core modules: `mermaidImport/`, `schema/schemaMerge.ts`. Terraform parsing is CLI-only (`terraformImport.ts`).

## Toolchain

Declared in `mise.toml` (node, bun, pnpm, go). Cloud: `.cursor/environment.json` → `bin/setup-dev-env.sh`. Details: [docs/setup.md](docs/setup.md).

MCP: kit `default` in `.cursor/mcp.json`. Do not stack Cloudflare onto that file. For live CF work, compose `wk mcp cloudflare-ops --project` for that session, then restore `wk mcp default --project`.

Before handover: `agent-pre-commit` when `.husky/pre-commit` exists. If you touched `app/packages/canvas` or tests under `src/`, also `cd app && pnpm typecheck && pnpm build`.
