import React from 'react';
import type { Recommendation } from '@archlens/core/recommendations';

type RecommendationRow = Recommendation & {
  diagramName?: string;
};

type Props = {
  recommendations: readonly RecommendationRow[];
  title?: string;
  emptyMessage?: string;
  limit?: number;
  testId?: string;
  showDiagram?: boolean;
  onSelect?: (recommendation: RecommendationRow) => void;
  onAction?: (action: Recommendation['actions'][number], recommendation: RecommendationRow) => void;
};

function sourceLabel(source: Recommendation['source']): string {
  return source === 'chaoslens' ? 'ChaosLens' : 'TraceLens';
}

function displayDetail(recommendation: Recommendation): string {
  return recommendation.narration?.detail ?? recommendation.detail;
}

function kindAccent(kind: Recommendation['kind']): string {
  if (kind.startsWith('refactor-')) {
    return 'border-violet-900/40 bg-violet-950/20';
  }
  if (kind === 'reduce-composite-risk') {
    return 'border-amber-900/40 bg-amber-950/20';
  }
  return 'border-cyan-900/40 bg-cyan-950/20';
}

export const RecommendationsList: React.FC<Props> = ({
  recommendations,
  title = 'AdviceLens',
  emptyMessage,
  limit,
  testId = 'recommendations-list',
  showDiagram = false,
  onSelect,
  onAction,
}) => {
  if (recommendations.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-slate-400" data-testid={testId}>
        {emptyMessage}
      </p>
    ) : null;
  }

  const visible = limit ? recommendations.slice(0, limit) : recommendations;

  return (
    <div data-testid={testId}>
      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{title}</h3>
      <ul className="space-y-2">
        {visible.map(recommendation => {
          const interactive = Boolean(onSelect);
          const Tag = interactive ? 'button' : 'div';

          return (
            <li key={recommendation.id}>
              <Tag
                type={interactive ? 'button' : undefined}
                onClick={interactive ? () => onSelect?.(recommendation) : undefined}
                className={`w-full text-left rounded-lg border px-3 py-2.5 ${kindAccent(recommendation.kind)} ${
                  interactive ? 'cursor-pointer transition-colors hover:border-[#00f0ff]/30' : ''
                }`}
                data-testid={`recommendation-${recommendation.kind}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{recommendation.title}</p>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
                    {recommendation.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {displayDetail(recommendation)}
                </p>
                <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  {recommendation.targetName} · {sourceLabel(recommendation.source)}
                  {recommendation.narration ? ' · AdviceLens' : ''}
                  {showDiagram && recommendation.diagramName
                    ? ` · ${recommendation.diagramName}`
                    : ''}
                </p>
                {recommendation.evidence.compositeRiskScore != null ? (
                  <p className="mt-1 text-[10px] font-mono text-amber-300/90">
                    Composite risk {(recommendation.evidence.compositeRiskScore * 100).toFixed(0)}%
                  </p>
                ) : null}
                {onAction && recommendation.actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendation.actions.map(action => (
                      <button
                        key={`${recommendation.id}:${action.kind}:${action.targetEntityRef ?? 'global'}`}
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          onAction(action, recommendation);
                        }}
                        className="rounded-md border border-[#00f0ff]/20 bg-[#061125]/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:border-[#00f0ff]/40"
                        data-testid={`recommendation-action-${action.kind}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Tag>
            </li>
          );
        })}
      </ul>
      {limit && recommendations.length > limit ? (
        <p className="mt-2 text-[11px] text-slate-500">
          +{recommendations.length - limit} more recommendation
          {recommendations.length - limit === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  );
};
