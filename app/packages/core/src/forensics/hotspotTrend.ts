import { computeHotspotScores } from './hotspotScoring';

export type HotspotScoreTrend = 'rising' | 'falling' | 'steady';

const TREND_WINDOW_WEEKS = 4;
const TREND_DELTA_THRESHOLD = 0.08;

export type HotspotScoreByWeekInput = {
  path: string;
  complexity: number;
  churnByWeek?: readonly number[];
};

/**
 * Relative hotspotScore for each week in the lookback window.
 * Uses current AST complexity × that week's commit churn (oldest week first).
 * This is not a replay of past scans: complexity is today's structure.
 */
export function computeHotspotScoreByWeek(
  files: ReadonlyArray<HotspotScoreByWeekInput>
): Map<string, number[]> {
  const scores = new Map<string, number[]>();
  const weekCount = Math.max(0, ...files.map(file => file.churnByWeek?.length ?? 0));
  if (weekCount === 0) return scores;

  for (let week = 0; week < weekCount; week++) {
    const weekScores = computeHotspotScores(
      files.map(file => ({
        path: file.path,
        complexity: file.complexity,
        churn: file.churnByWeek?.[week] ?? 0,
      }))
    );
    for (const file of files) {
      const series = scores.get(file.path) ?? [];
      series.push(weekScores.get(file.path) ?? 0);
      scores.set(file.path, series);
    }
  }

  return scores;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Compare the most recent up-to-4 weeks with the previous up-to-4 weeks.
 */
export function classifyHotspotScoreTrend(series: readonly number[]): HotspotScoreTrend | null {
  if (series.length < 2) return null;
  const window = Math.min(TREND_WINDOW_WEEKS, Math.floor(series.length / 2));
  if (window < 1) return null;
  const recent = mean(series.slice(-window));
  const earlier = mean(series.slice(-window * 2, -window));
  const delta = recent - earlier;
  if (delta >= TREND_DELTA_THRESHOLD) return 'rising';
  if (delta <= -TREND_DELTA_THRESHOLD) return 'falling';
  return 'steady';
}

export function formatHotspotScoreTrend(trend: HotspotScoreTrend): string {
  if (trend === 'rising') return 'getting worse';
  if (trend === 'falling') return 'easing';
  return 'steady';
}
