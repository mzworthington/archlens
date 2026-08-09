# Onboarding action plan (remaining work)

This tracks **beat 3+** after shipping:

1. **Demo-first insight** on bare `/workspace` (ChaosLens golden journey)
2. **Browser lite scan** (“Scan my repo in the browser” — structural TS/JS only)

Do not treat the browser scan as CLI parity. Graduate users intentionally.

---

## Goals

| Beat | Outcome                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 3    | Clear **CLI graduation** after lite scan / demo (git hotspots, CI publish, watch)            |
| 4    | **Shared analysis package** — reuse `CodebaseAnalyzer` in browser via ports (not regex lite) |
| 5    | Browser scan **UX polish** (progress, cancel, Safari/Firefox ZIP fallback)                   |
| 6    | Doc / marketing honesty (language coverage, limitations)                                     |

---

## Beat 3 — CLI graduation (product)

**Why:** Lite scan has no TraceLens, no multi-language AST depth, no publish. Users who care need an obvious next step without re-learning the product.

**Actions:**

- [ ] Post-scan toast / empty-forensics banner: “Install ArchLens CLI for git hotspots & CI” with copy-install + copy-scan (reuse `CLI_*` constants)
- [ ] After demo Chaos→Advice path, secondary CTA: “Scan your repo in the browser” then “Unlock TraceLens with the CLI”
- [ ] Getting started guide: reorder to **Demo → Browser scan → CLI** (match Canvas entry)
- [ ] Fix stale ChaosLens docs that still say “No headless CLI / CI gate” if AdviceLens/`archlens resilience` already covers it

**Done when:** A user who finished lite scan can find CLI install without leaving Canvas, and docs match the three-beat funnel.

---

## Beat 4 — Shared analysis (engineering)

**Why:** Regex lite scan is good for onboarding instant feedback; long-term quality should share CLI domain (`CodebaseAnalyzer` + writers) behind browser adapters.

**Actions:**

- [ ] Remove Node leaks from analysis import graph (`baseWriter` `node:fs`, `discoverCsprojFiles` → pathFilter/gitignore, etc.)
- [ ] Add `@archlens/cli` (or `@archlens/analysis`) exports for browser-safe domain + writers
- [ ] Browser `AnalysisFileSystemPort` + tree-sitter parser adapter (reuse Canvas `treeSitterClient`)
- [ ] Replace `buildLiteScanSchemas` path with shared analyzer; keep caps + progress UI
- [ ] ADR: browser structural scan vs Bun CLI (scope, non-goals: no git in browser)

**Done when:** Browser scan and `archlens --headless` produce comparable BlueprintSpec for a TS fixture repo (golden test).

---

## Beat 5 — Browser scan UX

- [ ] Progress (`files scanned / cap`) and cancel (`AbortSignal`) in startup + toolbar flows
- [ ] ZIP upload fallback where `showDirectoryPicker` is missing (scan input only — not persistence; ADR-0004)
- [ ] Optional: write generated YAML into a user-picked `blueprints/` folder (commit path) instead of memory-only port
- [ ] E2E smoke: startup → browser scan (mocked picker) → context diagram visible

---

## Beat 6 — Honesty & coverage

- [ ] Surface “structure only / TS·JS / no git” in UI and getting-started
- [ ] Align CLI language docs with analyzers that actually ship (Go/Java vs guide text)
- [ ] Add/restore missing ADR-0013 if connection profiles remain on the roadmap

---

## Explicit non-goals (for now)

- Running the **Bun-compiled CLI binary** in the tab (WebContainer / OPFS “full CLI”)
- Browser **git** TraceLens / provenance
- Real-time multiplayer onboarding

---

## Suggested sequence

1. Beat 3 (copy + CTAs) — small, high leverage
2. Beat 5 progress/cancel — makes lite scan feel production-safe
3. Beat 4 shared analyzer — when lite scan quality becomes the complaint
4. Beat 6 continuously with doc PRs
