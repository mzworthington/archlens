# Hype Machine

Open-source kit for measuring **crowd hype** and learning the **patterns** that make a banger set.

This is not an autopilot DJ. It is a shared measurement language and insight loop: what moved the room, in what order, under what conditions — so DJs and researchers can compare notes at scale.

## Why

DJs already read rooms. What we lack is a **common model** of hype — acoustic + kinetic + control intent — so insights transfer across nights, venues, and communities.

## MVP (this repo)

- **`HypeSession` schema** — session pack manifest (`schemas/`, Zod in `@hype-machine/core`)
- **Interpretable hype scorer** — acoustic + kinetic feature frames → 0–1 curve
- **Peak detector** — sustained rises above a rolling baseline
- **Pattern miner** — DJ actions lagged against peaks → pattern cards
- **CLI** — `hype analyze <session-dir>` → JSON debrief
- **Synthetic fixture** — `fixtures/sample-session/`
- **Capture docs** — wire mics, mixer, cameras the same way

Raw DSP/vision extractors are next; MVP consumes precomputed `features.json`.

## Quick start

```bash
cd hype-machine
pnpm install
pnpm test
pnpm analyze fixtures/sample-session
```

## Package layout

```text
hype-machine/
  packages/core/     # domain + schema + analyze-session slice
  packages/cli/      # hype analyze
  schemas/           # JSON Schema for HypeSession
  fixtures/          # synthetic session pack
  docs/              # glossary + capture kit
```

## Ethos

- Amplify DJs; do not replace taste or reading the room
- Local-first; privacy by default (blur faces, export features not identities)
- Schema + calibration before heavy models
- Pattern cards stay human-readable

## Extracting to a standalone GitHub repo

This tree is bootstrapped inside ArchLens so the cloud agent can ship a PR. To promote it:

```bash
# from a fresh empty GitHub repo you create:
git subtree split -P hype-machine -b hype-machine-main
git push git@github.com:YOU/hype-machine.git hype-machine-main:main
```

## License

MIT
