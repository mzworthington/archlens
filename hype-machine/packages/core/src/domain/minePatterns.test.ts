import { describe, expect, it } from "vitest";

import { minePatterns } from "./minePatterns.js";

describe("minePatterns", () => {
  it("creates a pattern card when drops precede peaks", () => {
    const cards = minePatterns(
      [
        { tSec: 10, action: "drop" },
        { tSec: 40, action: "drop" },
        { tSec: 70, action: "eq_kill" },
      ],
      [
        { startSec: 13, endSec: 20, peakSec: 15, peakScore: 0.8 },
        { startSec: 44, endSec: 50, peakSec: 46, peakScore: 0.75 },
      ],
      { minLagSec: 0.5, maxLagSec: 12 },
    );

    const drop = cards.find((c) => c.action === "drop");
    expect(drop).toBeDefined();
    expect(drop?.support).toBe(2);
    expect(drop?.confidence).toBe(1);
    expect(drop?.lagSec).toBeGreaterThan(2);
    expect(drop?.lagSec).toBeLessThan(5);
  });

  it("does not attribute peaks outside the lag window", () => {
    const cards = minePatterns(
      [{ tSec: 0, action: "drop" }],
      [{ startSec: 30, endSec: 35, peakSec: 32, peakScore: 0.9 }],
      { maxLagSec: 12 },
    );
    expect(cards).toHaveLength(0);
  });
});
