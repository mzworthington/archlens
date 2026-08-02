import type { DjAction, HypePeak, PatternCard } from "./types.js";

export type MinePatternsOptions = {
  /** Max seconds after an action to attribute a peak start. */
  maxLagSec?: number;
  /** Min seconds after an action (ignore simultaneous noise). */
  minLagSec?: number;
};

/**
 * Mine action → hype-rise pattern cards from lagged co-occurrence.
 */
export function minePatterns(
  actions: readonly DjAction[],
  peaks: readonly HypePeak[],
  options: MinePatternsOptions = {},
): PatternCard[] {
  const maxLagSec = options.maxLagSec ?? 12;
  const minLagSec = options.minLagSec ?? 0.5;

  type Hit = { action: string; lagSec: number };
  const hits: Hit[] = [];

  for (const action of actions) {
    for (const peak of peaks) {
      const lag = peak.startSec - action.tSec;
      if (lag >= minLagSec && lag <= maxLagSec) {
        hits.push({ action: action.action, lagSec: lag });
        break;
      }
    }
  }

  const byAction = new Map<string, number[]>();
  for (const hit of hits) {
    const list = byAction.get(hit.action) ?? [];
    list.push(hit.lagSec);
    byAction.set(hit.action, list);
  }

  const actionCounts = new Map<string, number>();
  for (const action of actions) {
    actionCounts.set(action.action, (actionCounts.get(action.action) ?? 0) + 1);
  }

  const cards: PatternCard[] = [];
  for (const [action, lags] of byAction) {
    const support = lags.length;
    const total = actionCounts.get(action) ?? support;
    const confidence = total === 0 ? 0 : support / total;
    const lagSec = average(lags);
    cards.push({
      action,
      lagSec,
      support,
      confidence,
      description: `${action} preceded a hype rise by ~${lagSec.toFixed(1)}s (${support}/${total} support)`,
    });
  }

  return cards.sort((a, b) => b.support - a.support || b.confidence - a.confidence);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
