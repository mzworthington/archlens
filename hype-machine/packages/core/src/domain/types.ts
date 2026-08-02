/** Feature frame at a single timestamp (seconds from session start). */
export type FeatureFrame = {
  tSec: number;
  /** Room-mic loudness / cheer energy, normalized 0–1 when present. */
  acousticEnergy?: number | undefined;
  /** Crowd motion / kinetic energy, normalized 0–1 when present. */
  kineticEnergy?: number | undefined;
};

export type HypePoint = {
  tSec: number;
  score: number;
};

export type HypePeak = {
  startSec: number;
  endSec: number;
  peakSec: number;
  peakScore: number;
};

export type DjAction = {
  tSec: number;
  /** Ubiquitous action class, e.g. drop, eq_kill, blend, fx. */
  action: string;
};

export type PatternCard = {
  action: string;
  /** Typical lag from action to peak start, seconds. */
  lagSec: number;
  support: number;
  confidence: number;
  description: string;
};

export type SessionDebrief = {
  sessionId: string;
  hypeCurve: HypePoint[];
  peaks: HypePeak[];
  patterns: PatternCard[];
};
