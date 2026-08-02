# Agent guidance — Hype Machine

Lifecycle kit: resolve `~/.agents` (or a checkout of [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit)). Read `<kit>/AGENTS.md` and `<kit>/CODING_PHILOSOPHY.md` before phase work.

Handover artifacts: `~/.agents/handover/hype-machine/`.

## Domain conventions

- Canonical session format: `HypeSession` JSON (`session.json`) + feature/action sidecars — not opaque model checkpoints.
- Hype scoring stays **interpretable** in core (`scoreHype`, `detectPeaks`, `minePatterns`).
- Capture/media I/O stays in adapters/CLI; pure domain logic in `@hype-machine/core`.
- Privacy: no face identity; prefer feature export over raw club video.

## TDD mandate

1. Red: failing unit/slice tests in `@hype-machine/core`
2. Green: minimal implementation
3. Refactor only after green

## Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm analyze fixtures/sample-session
```
