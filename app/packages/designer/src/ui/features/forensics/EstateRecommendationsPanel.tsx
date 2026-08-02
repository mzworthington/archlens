import React, { useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import type {
  EstateRecommendation,
  RankedEstateItem,
} from '../../../application/recommendations/buildEstateRecommendations';
import {
  filterEstateRecommendations,
  type EstateRecommendationsReport,
} from '../../../application/recommendations/buildEstateRecommendations';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';
import type { Recommendation, RecommendationAction } from '@archlens/core/recommendations';
import { RecommendationsList } from '../recommendations/RecommendationsList';
import { useAdviceLensExport } from './useAdviceLensExport';

type SourceFilter = 'all' | Recommendation['source'];

type Props = {
  items: readonly RankedEstateItem[];
  summary: EstateRecommendationsReport['summary'];
  report: EstateRecommendationsReport | null;
  systems: readonly LoadedSystemRef[];
  scopeEntityRef: string | null;
  onOpenRecommendation: (recommendation: EstateRecommendation) => void;
  onAction: (action: RecommendationAction, recommendation: EstateRecommendation) => void;
};

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#00f0ff]/15 bg-[#040914]/80 p-0.5">
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-100 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#00f0ff]/10 bg-[#040914]/70 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

export const EstateRecommendationsPanel: React.FC<Props> = ({
  items,
  summary,
  report,
  systems,
  scopeEntityRef,
  onOpenRecommendation,
  onAction,
}) => {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { canExport, copying, downloading, handleCopy, handleDownload } =
    useAdviceLensExport(report);

  const recommendations = useMemo(() => items.map(item => item.recommendation), [items]);

  const visible = useMemo(() => {
    return filterEstateRecommendations(recommendations, {
      scopeEntityRef,
      systems,
      source: sourceFilter,
      query: searchQuery,
    });
  }, [recommendations, scopeEntityRef, systems, sourceFilter, searchQuery]);

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 px-5 py-10 text-center"
        data-testid="estate-recommendations-empty"
      >
        <p className="text-sm text-slate-300">
          Load blueprints to scan the estate for recommendations.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="estate-recommendations-panel">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryStat label="Recommendations" value={visible.length} />
        <SummaryStat label="Diagrams scanned" value={summary.diagramCount} />
        <SummaryStat label="Scenarios run" value={summary.totalScenarios} />
        <SummaryStat label="Worst SLA" value={`${summary.worstOverallSla.toFixed(0)}%`} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            { id: 'all', label: 'All sources' },
            { id: 'chaoslens', label: 'ChaosLens' },
            { id: 'tracelens', label: 'TraceLens' },
          ]}
        />
        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!canExport || copying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f0ff]/20 bg-[#040914]/80 px-3 py-2 text-xs font-mono uppercase tracking-wider text-[#00f0ff] transition-colors hover:border-[#00f0ff]/40 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="advicelens-export-copy"
          >
            <Copy className="w-3.5 h-3.5" />
            {copying ? 'Copying…' : 'Copy JSON'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!canExport || downloading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#00f0ff]/20 bg-[#040914]/80 px-3 py-2 text-xs font-mono uppercase tracking-wider text-[#00f0ff] transition-colors hover:border-[#00f0ff]/40 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="advicelens-export-download"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Saving…' : 'Download'}
          </button>
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search recommendations…"
            className="w-full sm:w-64 rounded-lg border border-[#00f0ff]/15 bg-[#040914]/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#00f0ff]/40 focus:outline-none"
            data-testid="estate-recommendations-search"
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
            {visible.length} shown
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 px-5 py-10 text-center">
          <p className="text-sm text-slate-300">
            {searchQuery.trim() || sourceFilter !== 'all' || scopeEntityRef
              ? 'No recommendations match the current filters.'
              : 'No recommendations for the loaded estate.'}
          </p>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {scopeEntityRef
              ? 'Try clearing the scope picker or widening the source filter.'
              : 'Run `archlens` with git forensics on your blueprints, or load stress fixtures with dependencies.'}
          </p>
        </div>
      ) : (
        <RecommendationsList
          recommendations={visible}
          title="AdviceLens"
          showDiagram
          onSelect={recommendation => onOpenRecommendation(recommendation as EstateRecommendation)}
          onAction={(action, recommendation) =>
            onAction(action, recommendation as EstateRecommendation)
          }
          testId="estate-recommendations-list"
        />
      )}
    </div>
  );
};
