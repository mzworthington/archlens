# Agent Handshake

Standards and lifecycle agents live in `~/.agents` ([agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit)).

Before starting work, read:

- `~/.agents/AGENTS.md` — bootstrap and lifecycle routing
- `~/.agents/CODING_PHILOSOPHY.md` — hexagonal architecture, DDD, vertical slices, clean code
- `~/.agents/SOPs/behavior-catalog-and-xfn.md` — tests as behavior catalog; XFN matrix
- `~/.agents/skills/agent-adr/SKILL.md` — sparse ADRs in `docs/ADRs/`

## Toolchain

- Declared in `mise.toml` (Node, pnpm; optional ffmpeg for docs media).
- Cursor Cloud: `.cursor/environment.json` → `bin/setup-dev-env.sh`.
- Set `SKIP_LIFECYCLE_KIT=1` to skip cloning the lifecycle kit.

## Project notes

- Tailwind is installed; **do not add a custom theme or design system** in this template — consumers own styling.
- Docs are Markdown under `docs/`, rendered in-app (not a separate docs framework).
- Hosting is Cloudflare Pages via Pulumi + Wrangler (no R2/catalog).
- Before handover: run pre-commit checks (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`).
