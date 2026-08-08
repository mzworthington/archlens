# Interactive ArchLens demo - renders docs/screenshots/cli.gif
# Run from app/packages/cli:  vhs tapes/cli-demo.tape
# Or:                        pnpm test:vhs

Output ../../../docs/screenshots/cli.gif

Require bun
Require ttyd
Require ffmpeg

Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 520
Set TypingSpeed 45ms
Set Framerate 24
Set Padding 16
Set Theme "Catppuccin Mocha"

# Record against the real ArchLens repo (not a toy fixture).
Hide
Type "cd ../../.."
Enter
Type "unset CI ARCHLENS_OUTPUT_DIR"
Enter
Type "export ARCHLENS_INTERACTIVE=1"
Enter
Type "rm -rf .vhs-out"
Enter
Type "clear"
Enter
Show

Type "./app/dist/archlens"
Enter
Sleep 1.5s

# Main menu - accept default (Scan architecture). Enter confirms the
# highlighted first option; arrow keys are unreliable under VHS/ttyd.
Enter
Sleep 900ms

# Context name - accept default
Enter
Sleep 900ms

# Optional software system name - leave blank
Enter
Sleep 900ms

# Rollup confirm - accept initialValue (false / No)
Enter
Sleep 900ms

# Glob - CLI package only (keeps VHS recording fast enough for CI).
Type "app/packages/cli/**/*.{ts,tsx}"
Enter
Sleep 900ms

# Scratch output so the demo does not rewrite committed blueprints/
Type ".vhs-out"
Enter
Sleep 900ms

# Git forensics - accept default (Yes); confirm works in VHS (unlike select + arrow keys).
Enter
Sleep 900ms

# Git lookback window - accept default (365 days)
Enter
Sleep 900ms

# Analysis + git metrics run while frames are hidden (faster than recording spinners).
Hide
Sleep 90s
Show

# Leave the success line on screen briefly
Sleep 2s
