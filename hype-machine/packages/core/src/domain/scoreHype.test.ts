import { describe, expect, it } from "vitest";

import { scoreHype } from "./scoreHype.js";

describe("scoreHype", () => {
  it("scores high when acoustic and kinetic energy are high", () => {
    const curve = scoreHype([
      { tSec: 0, acousticEnergy: 0.1, kineticEnergy: 0.1 },
      { tSec: 1, acousticEnergy: 0.9, kineticEnergy: 0.85 },
    ]);

    expect(curve).toHaveLength(2);
    expect(curve[0]?.score).toBeGreaterThanOrEqual(0);
    expect(curve[0]?.score).toBeLessThanOrEqual(1);
    expect(curve[1]?.score).toBeGreaterThan(curve[0]!.score);
    expect(curve[1]?.score).toBeGreaterThan(0.7);
  });

  it("falls back to acoustic alone when kinetic is missing", () => {
    const curve = scoreHype([
      { tSec: 0, acousticEnergy: 0.42 },
      { tSec: 1, acousticEnergy: 0.8 },
    ]);

    expect(curve[0]?.score).toBeCloseTo(0.42);
    expect(curve[1]?.score).toBeCloseTo(0.8);
  });

  it("clamps out-of-range inputs into 0–1", () => {
    const curve = scoreHype([{ tSec: 0, acousticEnergy: 1.5, kineticEnergy: -0.2 }]);
    expect(curve[0]?.score).toBeGreaterThanOrEqual(0);
    expect(curve[0]?.score).toBeLessThanOrEqual(1);
  });
});
