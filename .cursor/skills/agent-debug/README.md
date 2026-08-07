# agent-debug (ArchLens project skill)

Hypothesis-driven debugging role for bugs, CI failures, and live-site symptoms.

| File | Purpose |
|------|---------|
| [SKILL.md](./SKILL.md) | Cursor skill (invoke on bug/CI/live symptoms) |
| [hypothesis-driven-debug.md](./hypothesis-driven-debug.md) | Full SOP |
| [debug-board.md](./debug-board.md) | Intake + hypothesis board template |
| [scripts/init-debug-board.sh](./scripts/init-debug-board.sh) | Scaffold board under `~/.agents/handover/` |
| [scripts/debug-ci-failed.sh](./scripts/debug-ci-failed.sh) | Fetch failed GitHub Actions logs via `gh` |
| [promote-to-agent-lifecycle-kit.patch](./promote-to-agent-lifecycle-kit.patch) | Apply to [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit) when write access is available |

## Quick start

```bash
.cursor/skills/agent-debug/scripts/init-debug-board.sh archlens "<symptom title>"
.cursor/skills/agent-debug/scripts/debug-ci-failed.sh --workflow "Sync Derived Outputs"
```

## Promote to lifecycle kit

This cloud environment can only push to `archlens`. The canonical home for lifecycle roles is the kit. When you can push there:

```bash
cd /path/to/agent-lifecycle-kit
git checkout -b cursor/agent-debug-skill-a5c7
git am < /path/to/archlens/.cursor/skills/agent-debug/promote-to-agent-lifecycle-kit.patch
# or: git apply … && git add -A && git commit
git push -u origin HEAD
```

After the kit lands `agent-debug`, this project overlay can stay as a thin pointer or be removed.
