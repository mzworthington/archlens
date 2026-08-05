import React from 'react';
import { Code, ShieldAlert } from 'lucide-react';
import type { SourceProvenance } from '@archlens/core';
import type { CoupledFileForensics } from '@archlens/core';
import type {
  OwnershipBreakdown,
  RefactorBoundary,
  RefactorSuggestion,
} from '@archlens/core/forensics';
import type { Recommendation } from '@archlens/core/recommendations';
import { RecommendationsList } from '../recommendations/RecommendationsList';
import type { RankedOffender } from '../../../application/forensics/rankOffenders';
import { useBlueprintStore } from '../../../application/store/store';

function signalChipClass(signal: string): string {
  switch (signal) {
    case 'hotspot':
      return 'bg-red-950/50 text-red-300 border-red-900/50';
    case 'knowledge-silo':
      return 'bg-amber-950/50 text-amber-300 border-amber-900/50';
    case 'cross-container':
      return 'bg-orange-950/50 text-orange-300 border-orange-900/50';
    case 'high-coupling':
      return 'bg-amber-950/40 text-amber-200 border-amber-800/40';
    default:
      return 'bg-violet-950/50 text-violet-300 border-violet-900/50';
  }
}

function concentrationLabel(concentration: OwnershipBreakdown['concentration']): string {
  switch (concentration) {
    case 'solo':
      return 'Solo ownership';
    case 'shared':
      return 'Shared ownership';
    default:
      return 'Distributed ownership';
  }
}

export interface RefactorPlanSlideOverProps {
  offender: RankedOffender;
  boundary: RefactorBoundary;
  ownership?: OwnershipBreakdown;
  suggestions?: RefactorSuggestion[];
  recommendations?: Recommendation[];
  coupledFiles?: CoupledFileForensics[];
  resolveSourceProvenance?: (entityRef: string) => SourceProvenance | undefined;
  onClose: () => void;
  onOpenCanvas: () => void;
  onSimulateFailure?: () => void;
  onApplyAsDraft?: () => void;
  canApplyAsDraft?: boolean;
  applyAsDraftHint?: string;
}

export const RefactorPlanSlideOver: React.FC<RefactorPlanSlideOverProps> = ({
  offender,
  boundary,
  ownership,
  suggestions = [],
  recommendations = [],
  coupledFiles = [],
  resolveSourceProvenance,
  onClose,
  onOpenCanvas,
  onSimulateFailure,
  onApplyAsDraft,
  canApplyAsDraft = true,
  applyAsDraftHint,
}) => {
  const openSourceCodeDialog = useBlueprintStore(state => state.openSourceCodeDialog);
  const offenderFilepath = boundary.members.find(m => m.entityRef === offender.entityRef)?.filepath;

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openSource = (filepath: string, entityRef: string) => {
    openSourceCodeDialog(filepath, resolveSourceProvenance?.(entityRef));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      data-testid="refactor-plan-slide-over"
      role="dialog"
      aria-modal="true"
      aria-label="Refactor plan"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close refactor plan"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full overflow-y-auto border-l border-[#00f0ff]/15 bg-[#040914] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#00f0ff]/10 bg-[#040914]/95 backdrop-blur px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff]">
              Refactor plan
            </p>
            <h2 className="text-lg font-bold text-white truncate">{offender.name}</h2>
            <p className="text-xs text-slate-500 truncate">{offender.parentLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Summary
            </h3>
            <div className="rounded-xl border border-[#00f0ff]/10 bg-[#061125]/60 p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {boundary.signals.map(signal => (
                  <span
                    key={signal}
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${signalChipClass(signal)}`}
                  >
                    {signal.toUpperCase()}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-300">
                Aggregate refactor score:{' '}
                <span className="font-mono text-white">
                  {Math.round(boundary.aggregateRefactorScore)}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {boundary.members.length} member{boundary.members.length === 1 ? '' : 's'} in this
                boundary
                {boundary.spansContainers ? ' · spans containers' : ''}
              </p>
              {offender.chaosRiskLabel ? (
                <p
                  className="text-xs text-red-300/90 leading-relaxed"
                  data-testid="refactor-chaos-risk-label"
                >
                  ChaosLens: {offender.chaosRiskLabel}
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Why refactor
            </h3>
            <ul className="space-y-2">
              {boundary.rationale.map(reason => (
                <li
                  key={reason}
                  className="rounded-lg border border-slate-900 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 leading-relaxed"
                >
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          {recommendations.length > 0 ? (
            <section>
              <RecommendationsList
                recommendations={recommendations}
                testId="refactor-recommendations"
              />
            </section>
          ) : null}

          {suggestions.length > 0 ? (
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Suggested actions
              </h3>
              <ul className="space-y-2" data-testid="refactor-suggestions">
                {suggestions.map(suggestion => (
                  <li
                    key={suggestion.kind}
                    className="rounded-lg border border-violet-900/40 bg-violet-950/20 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-violet-100">{suggestion.title}</p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      {suggestion.detail}
                    </p>
                    {suggestion.relatedSections.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {suggestion.relatedSections.map(section => (
                          <button
                            key={`${suggestion.kind}-${section}`}
                            type="button"
                            onClick={() => scrollToSection(`refactor-section-${section}`)}
                            className="rounded border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[10px] font-mono text-[#00f0ff] hover:border-[#00f0ff]/40 transition-colors"
                            data-testid={`refactor-link-${suggestion.kind}-${section}`}
                          >
                            {section === 'coupled-files'
                              ? 'Coupled files'
                              : section === 'ownership'
                                ? 'Ownership'
                                : 'Boundary members'}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="refactor-section-boundary-members">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Boundary members
            </h3>
            <div className="space-y-2" data-testid="refactor-boundary-members">
              {boundary.members.map(member => (
                <div
                  key={member.entityRef}
                  className="rounded-lg border border-slate-900 bg-slate-950/40 px-3 py-2"
                >
                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                  <p className="font-mono text-[10px] text-slate-500 truncate">
                    {member.entityRef}
                  </p>
                  {member.filepath ? (
                    <button
                      type="button"
                      onClick={() => openSource(member.filepath!, member.entityRef)}
                      className="mt-1 inline-flex max-w-full items-center gap-1 rounded border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-1.5 py-0.5 text-[10px] font-mono text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
                      title="View source code"
                      data-testid={`view-source-${member.entityRef}`}
                    >
                      <Code className="w-3 h-3 shrink-0" />
                      <span className="truncate">{member.filepath}</span>
                    </button>
                  ) : null}
                  <p className="font-mono text-[10px] text-violet-300 mt-1">
                    score {Math.round(member.refactorScore)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {ownership ? (
            <section id="refactor-section-ownership">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Ownership
              </h3>
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 space-y-3">
                <p className="text-xs text-slate-400">
                  {concentrationLabel(ownership.concentration)}
                </p>
                <div className="space-y-2" data-testid="ownership-breakdown">
                  {ownership.authors.map(author => (
                    <div key={author.email} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-slate-300 truncate">{author.email}</span>
                        <span className="text-slate-500 tabular-nums">
                          {Math.round(author.percent * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00f0ff]/70"
                          style={{ width: `${Math.round(author.percent * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {coupledFiles.length > 0 ? (
            <section id="refactor-section-coupled-files">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Coupled files
              </h3>
              <div className="space-y-1.5" data-testid="refactor-coupled-files">
                {coupledFiles.slice(0, 8).map(coupled => (
                  <div
                    key={coupled.path}
                    className="text-[11px] font-mono text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1 border border-slate-900 truncate"
                    title={`${coupled.path} - coupling score ${coupled.score.toFixed(2)}`}
                  >
                    {coupled.path}{' '}
                    <span className="text-slate-500">
                      {coupled.score.toFixed(2)} · {coupled.sharedCommits}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            {onSimulateFailure ? (
              <button
                type="button"
                onClick={onSimulateFailure}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 text-red-200 hover:bg-red-950/50 px-4 py-2.5 text-sm font-semibold transition-colors"
                data-testid="simulate-failure-from-tracelens"
              >
                <ShieldAlert className="w-4 h-4" />
                Simulate failure here
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenCanvas}
              className="w-full rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20 px-4 py-2.5 text-sm font-semibold transition-colors"
              data-testid="open-refactor-on-canvas"
            >
              Open on canvas
            </button>
            {onApplyAsDraft ? (
              <button
                type="button"
                onClick={onApplyAsDraft}
                disabled={!canApplyAsDraft}
                title={applyAsDraftHint}
                className="w-full rounded-xl border border-violet-500/40 bg-violet-950/30 text-violet-100 hover:bg-violet-950/50 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/40 disabled:text-slate-500 px-4 py-2.5 text-sm font-semibold transition-colors"
                data-testid="apply-refactor-as-draft"
              >
                Apply as draft
              </button>
            ) : null}
            {!canApplyAsDraft && applyAsDraftHint ? (
              <p className="text-[11px] text-slate-500 leading-relaxed">{applyAsDraftHint}</p>
            ) : null}
            {offenderFilepath ? (
              <button
                type="button"
                onClick={() => openSource(offenderFilepath, offender.entityRef)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 text-slate-200 hover:border-[#00f0ff]/35 hover:text-[#00f0ff] px-4 py-2.5 text-sm font-semibold transition-colors"
                data-testid="view-offender-source"
              >
                <Code className="w-4 h-4" />
                View source
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2 text-sm transition-colors"
            >
              Keep browsing rankings
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
