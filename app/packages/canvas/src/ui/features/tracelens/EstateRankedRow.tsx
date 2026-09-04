import { classifyHotspotScoreTrend, formatHotspotScoreTrend } from '@archlens/core/forensics';
import type {
  EstateRecommendation,
  RankedEstateItem,
} from '../../../application/recommendations/buildEstateRecommendations';
import type { ConcernLevel } from '../../../application/forensics/concern';
import type { RankedOffender } from '../../../application/forensics/rankOffenders';
import { ChurnSparkline } from '../../components/ChurnSparkline/ChurnSparkline';

function scoreBarColor(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-400';
    case 'warning':
      return 'bg-amber-400';
    case 'info':
      return 'bg-slate-400';
    default:
      return 'bg-[#00f0ff]/70';
  }
}

function rowBorder(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'border-red-900/40 hover:border-red-700/50';
    case 'warning':
      return 'border-amber-900/40 hover:border-amber-700/50';
    default:
      return 'border-[#00f0ff]/10 hover:border-[#00f0ff]/25';
  }
}

export function EstateRankedRow({
  item,
  rank,
  onOpen,
  onSimulate,
  onAction,
}: {
  item: RankedEstateItem;
  rank: number;
  onOpen: (item: RankedEstateItem) => void;
  onSimulate: (offender: RankedOffender) => void;
  onAction: (action: EstateRecommendation['actions'][number], item: RankedEstateItem) => void;
}) {
  const { recommendation, offender } = item;
  const displayScore = recommendation.priority;
  const scoreLabel = 'priority';
  const scorePct = Math.max(0, Math.min(100, displayScore));
  const concernLevel: ConcernLevel =
    displayScore >= 85 ? 'danger' : displayScore >= 65 ? 'warning' : 'info';
  const hasChaosContext = Boolean(
    offender?.chaosRiskLabel || offender?.onResilienceCriticalPath || offender?.isResilienceSpof
  );
  const signals = [
    recommendation.source === 'chaoslens' || hasChaosContext ? 'CHAOS' : 'TRACE',
    recommendation.kind.startsWith('refactor-') ? 'REFACTOR' : null,
    offender?.classifications.includes('hotspot') ? 'HOT' : null,
    offender?.classifications.includes('knowledge-silo') ? 'SILO' : null,
    offender?.isResilienceSpof ? 'SPOF' : null,
    offender?.onResilienceCriticalPath ? 'BLAST' : null,
    item.isFallback ? 'FORENSICS' : null,
  ].filter(Boolean) as string[];
  const hotspotTrend =
    offender?.hotspotScoreByWeek && offender.hotspotScoreByWeek.length > 1
      ? classifyHotspotScoreTrend(offender.hotspotScoreByWeek)
      : null;

  return (
    <div
      className={`w-full grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)_5.5rem] gap-3 items-center rounded-xl border bg-[#040914]/60 px-3 py-3 transition-colors ${rowBorder(concernLevel)}`}
      data-testid={`estate-row-${recommendation.id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="contents text-left"
        aria-label={`Open refactor plan for ${recommendation.targetName}`}
      >
        <span className="font-mono text-xs text-slate-500 tabular-nums">#{rank}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{recommendation.title}</p>
          <p className="truncate font-mono text-[10px] text-slate-500">
            {recommendation.targetName} · {recommendation.kind}
          </p>
          {offender?.chaosRiskLabel ? (
            <p
              className="truncate text-[10px] text-red-300/90 mt-0.5"
              data-testid={`chaos-risk-label-${offender.entityRef}`}
            >
              {offender.chaosRiskLabel}
            </p>
          ) : null}
        </div>
        <p className="min-w-0 truncate text-xs text-slate-400">{recommendation.diagramName}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-slate-500">{scoreLabel}</span>
            <span className="font-mono text-[10px] text-slate-300">{displayScore}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreBarColor(concernLevel)}`}
              style={{ width: `${scorePct}%` }}
            />
          </div>
          {offender?.hotspotScoreByWeek && offender.hotspotScoreByWeek.length > 1 ? (
            <div className="flex items-center justify-end gap-1.5 text-[#00f0ff]/70">
              {hotspotTrend ? (
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                  {formatHotspotScoreTrend(hotspotTrend)}
                </span>
              ) : null}
              <ChurnSparkline
                data={offender.hotspotScoreByWeek}
                width={72}
                height={20}
                testId="hotspot-sparkline"
              />
            </div>
          ) : offender?.churnByWeek && offender.churnByWeek.length > 0 ? (
            <div className="flex justify-end text-[#00f0ff]/70">
              <ChurnSparkline data={offender.churnByWeek} width={72} height={20} />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex flex-wrap items-center gap-1.5 justify-end">
          {signals.map(signal => (
            <span
              key={signal}
              className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${
                signal === 'HOT'
                  ? 'bg-red-950/50 text-red-300 border-red-900/50'
                  : signal === 'REFACTOR'
                    ? 'bg-violet-950/50 text-violet-300 border-violet-900/50'
                    : signal === 'CHAOS' || signal === 'BLAST' || signal === 'SPOF'
                      ? 'bg-red-950/50 text-red-300 border-red-900/50'
                      : 'bg-amber-950/50 text-amber-300 border-amber-900/50'
              }`}
            >
              {signal}
            </span>
          ))}
          <span className="font-mono text-[10px] text-slate-500 truncate">
            {[
              offender && offender.dependencyCount > 0 ? `deps ${offender.dependencyCount}` : null,
              recommendation.evidence.compositeRiskScore != null
                ? `risk ${recommendation.evidence.compositeRiskScore.toFixed(2)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      </button>
      {offender ? (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onSimulate(offender);
          }}
          className="justify-self-end rounded-lg border border-red-500/35 bg-red-950/20 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-red-200 hover:bg-red-950/40 transition-colors"
          data-testid={`simulate-failure-${offender.entityRef}`}
          title="Simulate region outage in ChaosLens"
        >
          Simulate
        </button>
      ) : (
        <span className="justify-self-end" />
      )}
      {recommendation.actions.length > 0 ? (
        <div className="col-span-full flex flex-wrap gap-2 pt-1">
          {recommendation.actions.slice(0, 2).map(action => (
            <button
              key={`${recommendation.id}:${action.kind}:${action.targetEntityRef ?? 'global'}`}
              type="button"
              onClick={event => {
                event.stopPropagation();
                onAction(action, item);
              }}
              className="rounded-md border border-[#00f0ff]/20 bg-[#061125]/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:border-[#00f0ff]/40"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
