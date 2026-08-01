# ArchLens CLI: install, self-update, and watch mode

**Status:** Complete.

Related: [CLI guide](../guide/cli.md), [Getting started](../guide/getting-started.md), [`@archlens/cli` README](../../app/packages/cli/README.md).

**Legend:** ✅ Done

---

## Phase A — Foundation

| Task                                                                            | Status |
| ------------------------------------------------------------------------------- | ------ |
| Embed `ARCHLENS_VERSION` at build time (`emitBuildVersion.ts` + generated file) | ✅     |
| `--version` / `-V` flag                                                         | ✅     |
| `scripts/install.sh`                                                            | ✅     |
| `scripts/install.ps1`                                                           | ✅     |
| Release `checksums.txt` in CI                                                   | ✅     |
| Update [getting-started.md](../guide/getting-started.md)                        | ✅     |
| Update [cli.md](../guide/cli.md)                                                | ✅     |

---

## Phase B — Self-update

| Task                                           | Status |
| ---------------------------------------------- | ------ |
| `src/cli/updateCheck.ts`                       | ✅     |
| `src/cli/selfUpdate.ts`                        | ✅     |
| Startup hook in `archlens.ts` (before prompts) | ✅     |
| `--no-update-check` flag                       | ✅     |
| `archlens update` subcommand                   | ✅     |
| Windows self-update                            | ✅     |
| Unit tests (mock GitHub)                       | ✅     |

---

## Phase C — Watch mode

| Task                                 | Status |
| ------------------------------------ | ------ |
| `chokidar` dependency                | ✅     |
| `--watch` / `--watch-debounce`       | ✅     |
| `watchAndRerun()` wrapper            | ✅     |
| Ignore output dir / cancel in-flight | ✅     |
| Unit tests                           | ✅     |
