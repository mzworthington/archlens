---
title: Hypothesis-driven debugging
kind: sop
triggers:
  - bug
  - debug
  - failed job
  - root cause
  - reproduce
  - flake
  - Failed to fetch
  - live site
tools:
  - read
  - grep
  - shell
  - browser
---
# Standard Operating Procedure: Hypothesis-Driven Debugging

Owned by [SKILL.md](./SKILL.md). Use this when behavior is **wrong today**, not when designing a new feature.

Prefer `~/.agents/CODING_PHILOSOPHY.md` §4 (minimal change) when the lifecycle kit is linked: evidence before edits; smallest fix that kills the symptom.

## 1. Intake checklist

Fill before the first product-code edit (board: [debug-board.md](./debug-board.md)):

| Field | Required |
|-------|----------|
| Environment | prod / staging / local / CI job name |
| Exact user action | clicks, URL, diagram/system name |
| Expected vs actual | one sentence each |
| Evidence | screenshot(s), job URL, console/Network, YAML path |
| Media labels | for each image: before \| after \| unrelated |
| Recent change? | PR, deploy, catalog publish, dependency bump |

If the user omitted env or action, ask **once** with a tight list—or infer from artifacts and mark **inferred**.

## 2. Triage classes

| Class | Cheap first experiment |
|-------|------------------------|
| UI / layout | Reproduce load path; measure boxes/coords or capture screenshot |
| Published data | `curl`/fetch live catalog revision; compare named entity vs peers |
| CI / media / sync | Failed-step log; diff failing suite config vs a green suite (viewport, workers, webServer) |
| Fetch / bulk load | Single-URL probe → concurrency/SW → CORS last |
| Naming mismatch | Search peer entities when the named one looks fine in artifacts |
| Already on main? | Search merged PRs / `git log -S` for the feature before implementing |

## 3. Hypothesis rules

1. Cap at **5** active hypotheses; park the rest.
2. Every hypothesis needs a **kill experiment** that takes less than a deep refactor.
3. Run the **cheapest** kill first (config A/B, artifact count, one curl).
4. Update the board after every experiment (alive / killed / confirmed).
5. Stop adding theories when one is confirmed; implement the fix.

### Ban list

- Unbounded `_probe*.spec.ts` / throwaway probes without deleting them
- “Maybe CORS” before a single failing URL is identified
- UI-filter theories when the source YAML is empty or wiped
- Product deep-dives after a viewport/config mismatch already fits

## 4. Reproduce ladder

```text
Live / CI evidence  →  Local fixture or failing test  →  UI path (if UI symptom)
```

| Step | Pass criteria |
|------|----------------|
| Evidence | Can point to job log line, artifact field, or screenshot region |
| Fixture / test | Automated red that names the bug |
| UI | Same diagram/route shows the break on demand |

Never invert TDD: do not land green production code then “add tests later” for domain fixes.

## 5. Split the work

Separate PRs (or ask before combining) when any two differ:

| Bucket | Examples |
|--------|----------|
| Symptom fix | Layout bbox, stick merge, fetch retry |
| Data / publish | Catalog wipe guard, republish |
| Pipeline / release policy | “build from release only”, workflow triggers |
| UX redesign | Catalog-first open, new empty states |
| Unrelated CI | Redirect timeouts in e2e while debugging fetch |

## 6. Proof gates

| Claim | Proof |
|-------|-------|
| “Layout fixed” | Before/after visual of **initial load** (not only unit packing tests) |
| “Empty system fixed” | Named entity non-empty in **published** artifact or explicit republish TODO |
| “Job fixed” | Failing step green locally or in Actions |
| “On main” | `gh pr view` + compare squash tip to branch tip; open follow-up if tip diverged |

State merge/PR status in the user-facing summary without waiting to be asked.

## 7. CI / ops playbook

```bash
# Latest failed run logs (repo root)
.cursor/skills/agent-debug/scripts/debug-ci-failed.sh
# Or kit copy / specific run:
~/.agents/scripts/debug-ci-failed.sh --run <run-id>
```

When Actions cannot be dispatched (403):

1. Document the permission gap.
2. Run the documented local equivalent if the repo has one.
3. Mark handover **BLOCKED** on remote re-run if local is insufficient.

Install missing media/browser tools only when the failing step needs them (not by default).

## 8. Prior-run context

For recurring symptoms, use `cursor-cloud` MCP when available:

1. `list-cloud-agents` (filter by name/recency)
2. `batch-fetch-details` with `includeTranscripts` / `includeDiffMetadata`
3. Summarize via subagents — do not load huge transcripts inline

Prefer learning the prior RCA over rediscovering it.

## 9. Handover & lessons

- `handover_debug.md` — phase `debug`, status COMPLETE only when proof gates pass
- Append a lesson when the user corrected framing or the same anti-pattern repeated (`~/.agents/lessons/<project>/` when the kit is linked)

## 10. Orchestration routes

| Request | Route |
|---------|-------|
| Bug, failed job, live symptom | `agent-debug` → `agent-pre-commit` |
| UI/auth/SLO touched | + light XFN floor (`agent-orchestrator`) |
| RCA needs new capability | `agent-debug` (COMPLETE with RCA) → `agent-orchestrator` |
| Complexity-only cleanup | `agent-arch-drift` → `agent-prune` (not debug) |
