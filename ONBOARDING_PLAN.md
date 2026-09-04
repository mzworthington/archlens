# Onboarding action plan (remaining work)

This tracks work after shipping:

1. **Startup chooser on bare `/workspace`** (demo / browser lite scan / open folder; deep links still auto-open demo) - done; guide docs aligned
2. **Browser scan** via shared `@archlens/analysis` - done (structure only; tree-sitter WASM with lightweight fallback)
3. Remaining: CLI graduation copy affordances, ZIP fallback, optional generated-YAML commit path

Do not treat the browser scan as CLI parity (no git TraceLens / publish). Graduate users intentionally.

---

## Goals

| Beat | Outcome                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| 3    | Clear **CLI graduation** after browser scan / demo (git hotspots, CI publish, watch)         |
| 4    | ~~Shared analysis package~~ **Done** - `@archlens/analysis`; browser uses `CodebaseAnalyzer` |
| 4b   | ~~Browser tree-sitter `CodebaseParserPort`~~ **Done** - shared AST extractor + fallback      |
| 5    | Browser scan **UX polish** (progress/cancel UI, Safari/Firefox ZIP fallback)                 |
| 6    | Doc / marketing honesty (language coverage, limitations)                                     |

---

## Beat 3 - CLI graduation (product)

**Why:** Browser scan has no TraceLens, limited language AST depth vs CLI tree-sitter, no publish. Users who care need an obvious next step.

**Actions:**

- [x] Post-scan toast: “Install ArchLens CLI for git hotspots & CI” (copy-install/copy-scan affordance still desirable)
- [ ] After demo Chaos→Advice path, secondary CTA: “Scan your repo in the browser” then “Unlock TraceLens with the CLI”
- [x] Getting started guide: reorder to **Demo → Browser scan → CLI** (match Canvas entry)
- [x] Fix stale ChaosLens docs that still say “No headless CLI / CI gate” if AdviceLens/`archlens resilience` already covers it

**Done when:** A user who finished browser scan can find CLI install without leaving Canvas, and docs match the three-beat funnel.

---

## Beat 4 - Shared analysis (engineering) - DONE

- [x] Extract domain + writers into `@archlens/analysis`
- [x] Remove Node leaks (`baseWriter`, `discoverCsprojFiles`, `createCliCancellation`)
- [x] CLI depends on `@archlens/analysis`; adapters stay in CLI
- [x] Canvas `openBrowserLiteScan` runs `CodebaseAnalyzer` via memory FS + source parser adapters
- [x] Golden fixture: same TS repo → direct shared analyzer YAML vs browser scan runner YAML (semantic parity)
- [x] ADR: browser structural scan vs Bun CLI (no git in browser)

---

## Beat 4b - Browser tree-sitter parser

- [x] Extract shared AST→`ParsedSourceFile` walk from CLI `TreeSitterParserAdapter`
- [x] `BrowserTreeSitterParser` sharing the Canvas `treeSitterClient` bootstrap (worker-safe)
- [x] Cover the shared extractor with real WASM grammars (TS, Python, Go, Java, C#)
- Decision: keep canvas `extractTsImports` as the no-WASM fallback rather than deleting it

---

## Beat 5 - Browser scan UX

- [x] Move analysis execution off the main UI thread (worker wrapper; local fallback in tests)
- [x] Cancel: `AbortSignal` through walk → worker, superseded scans terminate the worker
- [x] Budget metadata manifests and cumulative bytes separately from the source-file cap
- [x] Unsupported-browser feedback; mark folder preference only after a successful scan
- [x] Apply structural ignore globs during the browser walk; prefer `src/` when capping
- [x] Progress (`files scanned / cap`) surfaced in startup + toolbar flows
- [ ] ZIP upload fallback where `showDirectoryPicker` is missing (scan input only - not persistence; ADR-0004)
- [ ] Optional: write generated YAML into a user-picked `blueprints/` folder (commit path) instead of memory-only port
- [x] E2E-style smoke: startup/store action → browser scan (mocked picker) → context workspace loaded

---

## Beat 6 - Honesty & coverage

- [x] Surface “structure only / TS·JS / no git” in UI and getting-started
- [ ] Align CLI language docs with analyzers that actually ship (Go/Java vs guide text)
- [x] ADR-0013 (practitioner connection profiles) restored on `main`

---

## Explicit non-goals (for now)

- Running the **Bun-compiled CLI binary** in the tab (WebContainer / OPFS “full CLI”)
- Browser **git** TraceLens / provenance
- Real-time multiplayer onboarding

---

## Suggested sequence

1. Beat 3 (copy + CTAs) - small, high leverage
2. Beat 4b tree-sitter browser parser - closes remaining adapter gap
3. Beat 5 progress/cancel - makes browser scan feel production-safe
4. Beat 6 continuously with doc PRs
