import React from 'react';
import { SAFEGUARD_KEY_ORDER, SAFEGUARD_SHORT_LABELS } from '@archlens/core/resilience';
import type { NodeSafeguards } from '@archlens/core/resilience';

type Props = {
  typeLabel: string;
  showHotBadge: boolean;
  showSiloBadge: boolean;
  couplingHighlight?: boolean;
  refactorBoundaryHighlight?: boolean;
  dependencyRole?: 'selected' | 'upstream' | 'downstream';
  activeSafeguards?: NodeSafeguards | null;
  showAvailabilityRisk: boolean;
  showIntegrityRisk: boolean;
  isTest?: boolean;
};

/** Footer type label + forensics / dependency / resilience badges (full chrome only). */
export const BlueprintNodeBadges: React.FC<Props> = ({
  typeLabel,
  showHotBadge,
  showSiloBadge,
  couplingHighlight,
  refactorBoundaryHighlight,
  dependencyRole,
  activeSafeguards,
  showAvailabilityRisk,
  showIntegrityRisk,
  isTest,
}) => (
  <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold gap-2">
    <span className="truncate">{typeLabel}</span>
    <div className="flex items-center gap-1 shrink-0">
      {showHotBadge && (
        <span
          data-testid="forensics-badge-hot"
          className="bg-red-950/50 text-red-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-900/40 tracking-normal"
        >
          HOT
        </span>
      )}
      {showSiloBadge && (
        <span
          data-testid="forensics-badge-silo"
          className="bg-amber-950/50 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-900/40 tracking-normal"
        >
          SILO
        </span>
      )}
      {couplingHighlight && (
        <span
          data-testid="forensics-badge-coupled"
          className="bg-amber-950/50 text-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-800/50 tracking-normal"
        >
          COUPLED
        </span>
      )}
      {refactorBoundaryHighlight && (
        <span
          data-testid="forensics-badge-boundary"
          className="bg-violet-950/50 text-violet-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-violet-800/50 tracking-normal"
        >
          BOUNDARY
        </span>
      )}
      {dependencyRole === 'upstream' && (
        <span
          data-testid="dependency-badge-caller"
          className="bg-violet-950/50 text-violet-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-violet-800/50 tracking-normal"
        >
          CALLER
        </span>
      )}
      {dependencyRole === 'downstream' && (
        <span
          data-testid="dependency-badge-depends"
          className="bg-emerald-950/50 text-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-800/50 tracking-normal"
        >
          DEPENDS
        </span>
      )}
      {activeSafeguards
        ? SAFEGUARD_KEY_ORDER.filter(key => activeSafeguards[key]).map(key => (
            <span
              key={key}
              data-testid={`resilience-badge-${key}`}
              title={key}
              className="bg-emerald-950/50 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-800/50 tracking-normal"
            >
              {SAFEGUARD_SHORT_LABELS[key]}
            </span>
          ))
        : null}
      {showAvailabilityRisk ? (
        <span
          data-testid="resilience-badge-sla"
          className="bg-red-950/50 text-red-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-800/50 tracking-normal"
        >
          SLA
        </span>
      ) : null}
      {showIntegrityRisk ? (
        <span
          data-testid="resilience-badge-data"
          className="bg-amber-950/50 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-dashed border-amber-700/60 tracking-normal"
        >
          DATA
        </span>
      ) : null}
      {isTest && (
        <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-500/20 tracking-normal normal-case">
          TEST
        </span>
      )}
    </div>
  </div>
);
