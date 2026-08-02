#!/usr/bin/env node
import path from "node:path";

import { analyzeSession } from "@hype-machine/core";

function usage(): never {
  console.error(`Hype Machine CLI

Usage:
  hype analyze <session-dir>

Reads session.json, features.json, and optional actions.json from the session pack
and prints a JSON debrief (hype curve, peaks, pattern cards).
`);
  process.exit(1);
}

function main(argv: string[]): void {
  const args = argv.filter((arg) => arg !== "--");
  const [command, sessionDir] = args;
  if (command !== "analyze" || !sessionDir) {
    usage();
  }

  const debrief = analyzeSession({ sessionDir: path.resolve(sessionDir) });
  const summary = {
    sessionId: debrief.sessionId,
    frames: debrief.hypeCurve.length,
    peaks: debrief.peaks,
    patterns: debrief.patterns,
    hypeCurve: debrief.hypeCurve,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main(process.argv.slice(2));
