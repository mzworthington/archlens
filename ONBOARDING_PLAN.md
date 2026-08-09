# Onboarding action plan (remaining work)

This tracks work after shipping:

1. **Demo-first insight** on bare `/workspace` (ChaosLens golden journey) — done
2. **Browser scan** via shared `@archlens/analysis` — done (structure only; parser adapter is lightweight)
3. Remaining: CLI graduation UX, tree-sitter browser parser parity, polish

Do not treat the browser scan as CLI parity (no git TraceLens / publish). Graduate users intentionally.

---

## Goals

| Beat | Outcome                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 3    | Clear **CLI graduation** after browser scan / demo (git hotspots, CI publish, watch)         |
| 4    | ~~Shared analysis package~~ **Done** — `@archlens/analysis`; browser uses `CodebaseAnalyzer` |
| 4b   | Browser **tree-sitter** `CodebaseParserPort` (replace lightweight specifier extract)         |
| 5    | Browser scan **UX polish** (progress, cancel, Safari/Firefox ZIP fallback)                   |
| 6    | Doc / marketing honesty (language coverage, limitations)                                     |

---

## Beat 3 — CLI graduation (product)

**Why:** Browser scan has no TraceLens, limited language AST depth vs CLI tree-sitter, no publish. Users who care need an obvious next step.

**Actions:**

- [ ] Post-scan toast / empty-forensics banner: “Install ArchLens CLI for git hotspots & CI” with copy-install + copy-scan (reuse `CLI_*` constants)
- [ ] After demo Chaos→Advice path, secondary CTA: “Scan your repo in the browser” then “Unlock TraceLens with the CLI”
- [ ] Getting started guide: reorder to **Demo → Browser scan → CLI** (match Canvas entry)
- [ ] Fix stale ChaosLens docs that still say “No headless CLI / CI gate” if AdviceLens/`archlens resilience` already covers it

**Done when:** A user who finished browser scan can find CLI install without leaving Canvas, and docs match the three-beat funnel.

---

## Beat 4 — Shared analysis (engineering) — DONE

- [x] Extract domain + writers into `@archlens/analysis`
- [x] Remove Node leaks (`baseWriter`, `discoverCsprojFiles`, `createCliCancellation`)
- [x] CLI depends on `@archlens/analysis`; adapters stay in CLI
- [x] Canvas `openBrowserLiteScan` runs `CodebaseAnalyzer` via memory FS + source parser adapters
- [ ] Golden fixture: same TS repo → CLI headless YAML vs browser analyzer YAML (comparable, not byte-identical)
- [ ] ADR: browser structural scan vs Bun CLI (no git in browser)

---

## Beat 4b — Browser tree-sitter parser

- [ ] Extract shared AST→`ParsedSourceFile` walk from CLI `TreeSitterParserAdapter`
- [ ] `BrowserTreeSitterParser` using Canvas `treeSitterClient` WASM URLs
- [ ] Delete canvas `extractTsImports` once tree-sitter path is green

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
2. Beat 4b tree-sitter browser parser — closes remaining adapter gap
3. Beat 5 progress/cancel — makes browser scan feel production-safe
4. Beat 6 continuously with doc PRs
