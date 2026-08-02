import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  analyzeSession,
  resolveInsideSession,
  SessionPathError,
} from "./AnalyzeSessionHandler.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../../../fixtures/sample-session");

describe("analyzeSession", () => {
  it("produces a debrief from the sample session pack", () => {
    const debrief = analyzeSession({ sessionDir: fixtureDir });

    expect(debrief.sessionId).toBe("fixture-warehouse-01");
    expect(debrief.hypeCurve.length).toBeGreaterThan(10);
    expect(debrief.peaks.length).toBeGreaterThanOrEqual(1);
    expect(debrief.patterns.some((p) => p.action === "drop")).toBe(true);
  });
});

describe("resolveInsideSession", () => {
  it("allows nested files under the session root", () => {
    const resolved = resolveInsideSession(fixtureDir, "features.json");
    expect(resolved).toBe(path.join(fixtureDir, "features.json"));
  });

  it("rejects parent-directory traversal", () => {
    expect(() => resolveInsideSession(fixtureDir, "../secrets.env")).toThrow(SessionPathError);
    expect(() => resolveInsideSession(fixtureDir, "audio/../../etc/passwd")).toThrow(
      SessionPathError,
    );
  });

  it("rejects absolute paths", () => {
    expect(() => resolveInsideSession(fixtureDir, "/etc/passwd")).toThrow(SessionPathError);
  });
});
