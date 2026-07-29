# ArchLens CLI: install, self-update, and watch mode

**Status:** Not started.

Related: [CLI guide](../guide/cli.md), [Getting started](../guide/getting-started.md), [`@archlens/cli` README](../../app/packages/cli/README.md).

**Legend:** ⏳ Pending

---

## Decisions (locked in)

| #   | Decision                  | Choice                                                          |
| --- | ------------------------- | --------------------------------------------------------------- |
| 1   | Default install location  | `$HOME/.local/bin` (no `sudo`; `--system` for `/usr/local/bin`) |
| 2   | Update prompt scope       | Interactive TTY only; skip headless, CI, and dev (`tsx`)        |
| 3   | Watch in interactive mode | Prompt once, then silent reruns                                 |
| 4   | Install script hosting    | GitHub raw URL interim; `archlens.dev/install.sh` when wired    |

---

## Phase A — Foundation

Unblocks self-update and watch. Nothing shipped yet.

| Task                                                                                        | Status |
| ------------------------------------------------------------------------------------------- | ------ |
| Embed `ARCHLENS_VERSION` at build time (CI + local `pnpm build`)                            | ⏳     |
| `--version` / `-V` flag                                                                     | ⏳     |
| `scripts/install.sh` (platform detect, download, extract, PATH hint)                        | ⏳     |
| `scripts/install.ps1` (Windows)                                                             | ⏳     |
| Release `checksums.txt` in CI; verify in install script when present                        | ⏳     |
| Update [getting-started.md](../guide/getting-started.md) — one-liner first, manual fallback | ⏳     |
| Update [cli.md](../guide/cli.md) with new flags                                             | ⏳     |

**Done when:** `curl -fsSL …/install.sh \| sh` installs binary + tree-sitter WASMs; `archlens --version` prints release tag.

---

## Phase B — Self-update

Depends on Phase A (embedded version + install/download logic).

| Task                                                                                                | Status |
| --------------------------------------------------------------------------------------------------- | ------ |
| `src/cli/version.ts`                                                                                | ⏳     |
| `src/cli/updateCheck.ts` — GitHub latest release, semver compare, 24h cache in `~/.cache/archlens/` | ⏳     |
| `src/cli/selfUpdate.ts` — download archive, replace install dir, re-exec same argv                  | ⏳     |
| Startup hook in `archlens.ts` **before** interactive prompts                                        | ⏳     |
| `--no-update-check` flag                                                                            | ⏳     |
| `archlens update` subcommand                                                                        | ⏳     |
| Windows self-update (`.exe.new` rename or spawn-and-exit)                                           | ⏳     |
| Unit tests: semver, cache TTL, skip conditions (mock GitHub)                                        | ⏳     |

**Done when:** interactive `archlens` prompts on newer release; approving updates and continues without manual re-download.

---

## Phase C — Watch mode

| Task                                                                          | Status |
| ----------------------------------------------------------------------------- | ------ |
| Add `chokidar` dependency                                                     | ⏳     |
| `--watch` and `--watch-debounce=<ms>` (default 500) in `parseArchlensArgv.ts` | ⏳     |
| `watchAndRerun()` — freeze plan after first run, debounced reruns             | ⏳     |
| Ignore output dir writes (no YAML feedback loop)                              | ⏳     |
| Abort in-flight run on new change (`cancellation.ts`)                         | ⏳     |
| Clean watcher shutdown on Ctrl+C                                              | ⏳     |
| Unit tests: debounce, output-dir ignore, frozen plan                          | ⏳     |

**Done when:** `archlens --headless --watch` reruns analysis on source changes until Ctrl+C.

---

## Suggested order

1. Phase A
2. Phase B
3. Phase C

---

## Out of scope (v1)

- Homebrew, Scoop, winget
- Auto-open ArchLens Canvas on watch rerun
- Update checks in headless / CI
- Rust `/cli` crate
