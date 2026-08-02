import { describe, expect, it } from "vitest";

import { detectPeaks } from "./detectPeaks.js";
import type { HypePoint } from "./types.js";

function curveFrom(scores: number[]): HypePoint[] {
  return scores.map((score, i) => ({ tSec: i, score }));
}

describe("detectPeaks", () => {
  it("detects a sustained rise above baseline", () => {
    const curve = curveFrom([
      0.1, 0.1, 0.12, 0.11, 0.1, 0.12, 0.11, 0.1, 0.55, 0.7, 0.68, 0.6, 0.2, 0.15,
    ]);

    const peaks = detectPeaks(curve, {
      baselineWindow: 6,
      riseThreshold: 0.2,
      minDurationFrames: 3,
    });

    expect(peaks).toHaveLength(1);
    expect(peaks[0]?.startSec).toBe(8);
    expect(peaks[0]?.peakScore).toBeGreaterThan(0.6);
  });

  it("ignores a one-frame blip", () => {
    const curve = curveFrom([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.9, 0.1, 0.1, 0.1]);
    const peaks = detectPeaks(curve, {
      baselineWindow: 5,
      riseThreshold: 0.2,
      minDurationFrames: 3,
    });
    expect(peaks).toHaveLength(0);
  });
});
