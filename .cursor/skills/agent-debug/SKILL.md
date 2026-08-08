---
name: agent-debug
description: >-
  Runs hypothesis-driven debugging for bugs, CI failures, live-site symptoms,
  and fetch/runtime errors. Use when something is broken, a job failed, the UI
  looks wrong, the user reports Failed to fetch, layout overlap, empty
  diagrams, flaky tests, or when a fix needs reproduce → isolate → verify
  before the full feature lifecycle.
kind: role
phase: debug
triggers:
  - bug
  - debug
  - broken
  - failed
  - failure
  - flake
  - reproduce
  - root cause
  - regression
  - CI failed
  - job failed
  - Failed to fetch
  - overlap
  - empty diagram
  - live site
  - hypothesis
depends-on:
  - agent-tdd
  - agent-pre-commit
  - agent-xfn
tools:
  - read
  - grep
  - shell
  - browser
disable-model-invocation: false
---
# Role: Hypothesis-Driven Debugger

You fix **broken behavior** with a short, evidence-first loop. Do **not** open the full feature lifecycle (`agent-spec` → …) for a bug unless root cause expands into a new bounded context.

> **Location:** Project skill at `.cursor/skills/agent-debug/`. Prefer the lifecycle-kit copy at `~/.agents/skills/agent-debug/` when that kit version is newer (same name). Promote via `promote-to-agent-lifecycle-kit.patch`.

Procedure: [hypothesis-driven-debug.md](./hypothesis-driven-debug.md).
Board template: [debug-board.md](./debug-board.md).
Tooling: [scripts/init-debug-board.sh](./scripts/init-debug-board.sh), [scripts/debug-ci-failed.sh](./scripts/debug-ci-failed.sh).

## When to run

- User reports a bug, failed job, flake, wrong UI, empty data, or runtime/fetch error
- Mid-feature tests go red and product design is not the question
- Prior agent claimed a fix but the symptom remains
- You need forensics on live artifacts / CI logs before touching product code

**Skip** when the ask is a new feature, pure scoping (“how much work?”), or intentional redesign with no broken symptom.

## Scope gate (vs orchestrator)

| Request | Route |
|---------|-------|
| Bug / failed job / live-site symptom | **`agent-debug`** (this skill) |
| Bug that needs a new product capability after RCA | Debug → then `agent-orchestrator` / light feature path |
| “Is this already shipped?” / how-does-X-work | Triage only (§1); no impl |
| New feature / new bounded context | `agent-orchestrator` |

## Mandatory loop

```text
Triage → Reproduce → Hypothesize → Falsify (cheap first) → Fix → Prove → Handover
```

Do not skip **Reproduce** or **Prove**. Unit green alone is not enough for UI or published-artifact bugs.

### 1. Triage (first minutes)

Classify before deep code walks:

| Class | First move |
|-------|------------|
| **UI / layout / empty canvas** | Label user screenshots (before/after); load same diagram; visual repro |
| **Live catalog / published data** | Fetch live revision artifacts; count nodes in the **named** entity |
| **CI / workflow / docs-media** | `scripts/debug-ci-failed.sh` → classify flake vs config drift vs tool/auth |
| **Fetch / network** | One failing URL + status vs `TypeError`; recent diff on that path |
| **Already shipped?** | `git log` / PR search for the capability before implementing |

Normalize vocabulary once (“packages” vs “plugins”, “caps” vs ChaosSpec). If live data contradicts the user’s label, **ask once** immediately.

Scaffold a board (writes under `~/.agents/handover/<project>/` when the kit is linked):

```bash
.cursor/skills/agent-debug/scripts/init-debug-board.sh archlens "<short title>"
# or, after kit promotion:
~/.agents/scripts/init-debug-board.sh archlens "<short title>"
```

### 2. Reproduce before edit

| Layer | Proof |
|-------|--------|
| UI | Browser / computerUse / RecordScreen of **broken** state; same path after fix |
| Data | Exact YAML/JSON node counts or empty-file evidence for the target entity |
| CI | Failed job log excerpt + command that fails locally (or documented blocker) |
| Fetch | Single request that fails (or state “inferred” and ask) |

If you cannot reproduce, say so and stop guessing—or time-box one instrumentation pass.

### 3. Hypothesis board (kill criteria)

Keep ≤ **5** live hypotheses. Each needs:

- Claim
- Evidence that would **kill** it
- Cheap experiment first

Prefer controlled A/B (config parity, one probe) over probe-spec sprawl (`_probe*.spec.ts` spam = stop).

Kill UI theories when artifacts contradict them. Kill product deep-dives when a config/viewport/tool mismatch already explains the failure.

### 4. Fix after root cause

1. Write a **failing regression** closest to the bug (core/unit preferred; then slice; UI e2e only if needed) — `agent-tdd` for the regression only.
2. Minimal fix. No drive-by refactors. No second bug bolted on without asking.
3. Split PRs when symptoms diverge (layout ≠ catalog wipe ≠ pipeline policy).

### 5. Prove (Definition of Done)

| Symptom class | Done means |
|---------------|------------|
| UI | After screenshot/recording of the **same** path; unit tests green |
| Live catalog | Code fix **and** explicit republish/compose note (code ≠ published) |
| CI job | Local or Actions green for the failing step; or BLOCKED with permission/tool gap |
| Fetch | Repro path succeeds; errors are actionable if partial failure remains |

Then run `agent-pre-commit`. For UI/auth/SLO touches, apply the orchestrator **light XFN floor**.

### 6. Handover

Write `~/.agents/handover/<project>/handover_debug.md` (or `.cursor/skills/agent-debug/handover/` if the kit is unavailable). Include:

- Root cause (one sentence)
- Hypotheses killed
- Proof of fix (paths, screenshots, job URL)
- Ops follow-ups (republish, workflow_dispatch, tool install)
- Whether a feature slice is still needed

## Tooling map

| Need | Tool |
|------|------|
| Init board | `scripts/init-debug-board.sh` |
| Failed Actions logs | `scripts/debug-ci-failed.sh` (`gh`) |
| Prior cloud-agent context | `cursor-cloud` MCP: `list-cloud-agents` → `batch-fetch-details` (transcripts via subagents) |
| Instrumented deep dive | Cursor **debug** subagent / Debug mode (hypothesis + runtime logs) |
| UI verify | computerUse / browser / RecordScreen — required for visual bugs |
| Domain regression | Vitest in `@archlens/core` / canvas as appropriate |

## Anti-patterns (from ArchLens sessions)

- Opening `agent-orchestrator` ceremony for a forensic bug
- Fixing from screenshots without labeling before/after or reproducing
- Trusting the user’s entity name when a peer system is the empty one
- Declaring done from unit tests while live/UI still broken
- Conflating resilience patch, UX redesign, and CI redirect fixes in one PR
- Abandoning a cheap config-parity hypothesis for long product forensics
- Shipping workflow/release policy changes the user did not ask for
- Leaving the user to ask “Pushed to main?” / “Merged yet?” — state branch/PR/merge status unprompted

## After debug

- Optional lesson under `~/.agents/lessons/<project>/` when the user corrected framing or the same friction repeated
- If RCA needs a new capability, hand off to `agent-orchestrator` with the debug board as intake
