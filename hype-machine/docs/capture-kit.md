# Capture kit

Goal: record a **synced** multimodal session pack your first night. Analysis quality dies without clock sync and without separating room response from the mix.

## Minimum gear

| Channel | Role | Notes |
|---------|------|-------|
| 1–2 room mics | Crowd acoustic energy | Point at the floor/crowd, not the PA horns if avoidable |
| Master / booth tap | What the DJ played | Learn correlations, not hype itself |
| Mixer MIDI/HID | DJAction stream | Crossfader, EQ, FX, hotcues if available |
| 1 wide camera | Kinetic energy | Crowd-facing; no face ID — blur in post or at capture |

Optional later: second camera on booth hands/faders, wireless crowd mics, DJ software track metadata (Serato/Rekordbox).

## Sync

1. Start a single capture clock (laptop NTP + one recorder process, or slate clap visible/audible on all streams).
2. Put a loud clap / visual slate at T0 and note it in `session.json`.
3. Prefer one machine ingesting all streams (OBS + audio interface + MIDI) over free-running phones.

## Session pack layout

```text
my-set/
  session.json      # HypeSession manifest
  features.json     # precomputed frames (or produce via extractors later)
  actions.json      # DJAction list
  audio/
  video/
  midi/
```

See `fixtures/sample-session/` for a synthetic example.

## Privacy defaults

- Local-first storage; do not upload raw club video by default.
- Blur faces before any share; prefer exporting **features only** to the commons.
- Get venue/promoter consent for cameras.
- Never ship biometric identity features.

## First night checklist

1. [ ] Room mics level-checked against a cheer test
2. [ ] Master tap not clipping
3. [ ] Camera sees most of the floor
4. [ ] MIDI from mixer arriving
5. [ ] Slate clap recorded
6. [ ] `session.json` filled with stream paths
7. [ ] After the set: label 5–10 peaks by ear/eye on the timeline (future UI; for now notes are fine)
