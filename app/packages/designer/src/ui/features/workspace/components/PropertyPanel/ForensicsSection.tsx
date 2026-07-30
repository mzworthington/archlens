import React from 'react';
import type { NodeForensics } from '@archlens/core';
import type { ForensicsTrendDashboard } from '../../../../../application/forensics/buildForensicsTrendDashboard';
import {
  buildForensicsPanelModel,
  concernBadgeClasses,
  COUPLED_FILES_HELP,
  COUPLING_SCHEMA_DEPS_HELP,
  IMPORTED_FILES_HELP,
  FORENSICS_SECTION_HELP,
} from '../../../../../application/forensics/buildForensicsPanelModel';
import { CouplingMiniGraph } from './CouplingMiniGraph';
import { ForensicsTrendPanel } from './ForensicsTrendPanel';

interface ForensicsSectionProps {
  forensics: NodeForensics;
  trendDashboard?: ForensicsTrendDashboard;
  centerLabel?: string;
  linkedCouplingPaths?: ReadonlySet<string>;
  linkedImportPaths?: ReadonlySet<string>;
  /** Whether a node is currently selected on the canvas. */
  hasSelectedNode?: boolean;
  showCoupling?: boolean;
  showCouplingSchemaDeps?: boolean;
  onToggleShowCouplingSchemaDeps?: () => void;
  /** How many coupled files resolve to nodes on the current canvas. */
  linkedCouplingCount?: number;
  /** Coupled files that coupling focus can show (canvas peers + ghosts). */
  focusCouplingCount?: number;
  /** Select a coupled peer on the canvas by filepath. */
  onSelectCoupledPeer?: (path: string) => void;
  /** Select an import-graph peer on the canvas by filepath. */
  onSelectImportPeer?: (path: string) => void;
  /** ChaosLens blast exposure for the selected node (0–1). */
  blastRadius?: number;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function MetricRow({
  label,
  value,
  help,
  tone,
}: {
  label: string;
  value: string;
  help?: string;
  tone?: 'danger' | 'warning' | 'none';
}) {
  const valueClass =
    tone === 'danger' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : 'text-slate-300';

  return (
    <div
      className="bg-slate-950/40 rounded-xl px-3 py-2 border border-slate-900"
      data-testid={`forensics-metric-${label}`}
      title={help}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-brand-400/80 text-xs shrink-0">{label}</span>
        <span className={`text-xs font-semibold text-right break-all ${valueClass}`}>{value}</span>
      </div>
      {help && (
        <p
          className="mt-1 text-[10px] leading-snug text-slate-500"
          data-testid={`forensics-help-${label}`}
        >
          {help}
        </p>
      )}
    </div>
  );
}

export const ForensicsSection: React.FC<ForensicsSectionProps> = ({
  forensics,
  trendDashboard,
  centerLabel = 'this',
  linkedCouplingPaths,
  linkedImportPaths,
  hasSelectedNode = false,
  showCoupling = false,
  onToggleShowCouplingSchemaDeps,
  showCouplingSchemaDeps = false,
  linkedCouplingCount = 0,
  focusCouplingCount = 0,
  onSelectCoupledPeer,
  onSelectImportPeer,
  blastRadius,
}) => {
  const {
    concern,
    badgeLabel,
    ownership,
    metricRows,
    coupledFilesPreview: coupled,
    importedFilesPreview: imported,
    focusableCouplingCount,
  } = buildForensicsPanelModel({
    forensics,
    blastRadius,
    linkedCouplingCount,
    focusCouplingCount,
  });

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="forensics-section">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider">
          TraceLens
        </h4>
        <span
          data-testid="forensics-concern-badge"
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${concernBadgeClasses(concern.level)}`}
        >
          {badgeLabel}
        </span>
      </div>

      <p
        className="text-[10px] leading-snug text-slate-500 mb-3"
        data-testid="forensics-section-help"
      >
        {FORENSICS_SECTION_HELP}
      </p>

      {concern.reasons.length > 1 && (
        <p className="text-[10px] font-mono text-slate-400 mb-2">{concern.reasons.join(' · ')}</p>
      )}

      {trendDashboard ? <ForensicsTrendPanel dashboard={trendDashboard} /> : null}

      {ownership ? (
        <div
          className="mb-3 rounded-xl border border-slate-900 bg-slate-950/40 p-3"
          data-testid="forensics-ownership-breakdown"
        >
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            Ownership breakdown
          </p>
          <div className="space-y-2">
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
      ) : null}

      <div className="space-y-2 mb-3">
        {metricRows.map(row => (
          <MetricRow
            key={row.label}
            label={row.label}
            value={row.value}
            help={row.help}
            tone={row.tone}
          />
        ))}
      </div>

      {coupled.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
            Coupling graph
          </p>
          <CouplingMiniGraph
            centerLabel={centerLabel}
            coupled={forensics.coupledFiles ?? []}
            linkedPaths={linkedCouplingPaths}
            onPeerClick={onSelectCoupledPeer}
          />
        </div>
      )}

      {coupled.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Coupled files
            </p>
          </div>
          <p
            className="text-[10px] leading-snug text-slate-500"
            data-testid="forensics-help-coupled"
          >
            {COUPLED_FILES_HELP}
          </p>
          <p className="text-[10px] text-slate-500" data-testid="forensics-coupling-lens-hint">
            {showCoupling
              ? hasSelectedNode
                ? `Coupling lens is on — focusing ${focusableCouplingCount} peer${focusableCouplingCount === 1 ? '' : 's'} for this node.`
                : 'Coupling lens is on — diagram-wide coupling is visible. Select this node to focus its peers.'
              : 'Use the Lenses group in the toolbar or Workspace display to turn on coupling lens.'}
          </p>
          {onToggleShowCouplingSchemaDeps && showCoupling ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Schema dependencies
              </span>
              <button
                type="button"
                data-testid="toggle-show-coupling-schema-deps"
                aria-pressed={showCouplingSchemaDeps}
                onClick={onToggleShowCouplingSchemaDeps}
                title={
                  showCouplingSchemaDeps
                    ? 'Hide declared schema dependencies'
                    : 'Show declared schema dependencies between coupled peers'
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showCouplingSchemaDeps ? 'bg-cyan-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showCouplingSchemaDeps ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ) : null}
          {onToggleShowCouplingSchemaDeps && showCoupling ? (
            <p
              className="text-[10px] leading-snug text-slate-500"
              data-testid="forensics-help-coupling-schema-deps"
            >
              {COUPLING_SCHEMA_DEPS_HELP}
            </p>
          ) : null}
          {coupled.map(c => (
            <div
              key={c.path}
              className="text-[11px] font-mono text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1 border border-slate-900 truncate"
              title={`${c.path} - coupling score ${c.score.toFixed(2)}, ${c.sharedCommits} shared commits`}
            >
              {c.path}{' '}
              <span className="text-slate-500">
                {c.score.toFixed(2)} · {c.sharedCommits}
              </span>
            </div>
          ))}
          {(forensics.coupledFiles?.length ?? 0) > 5 && (
            <p className="text-[10px] text-slate-500 italic">
              +{(forensics.coupledFiles?.length ?? 0) - 5} more
            </p>
          )}
        </div>
      )}

      {imported.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Imported files
          </p>
          <p
            className="text-[10px] leading-snug text-slate-500"
            data-testid="forensics-help-imported"
          >
            {IMPORTED_FILES_HELP}
          </p>
          {imported.map(entry => {
            const linked = linkedImportPaths?.has(entry.path);
            const clickable = linked && onSelectImportPeer;
            return (
              <button
                key={entry.path}
                type="button"
                disabled={!clickable}
                data-testid={
                  linked
                    ? `import-peer-${basename(entry.path)}`
                    : `import-peer-unlinked-${basename(entry.path)}`
                }
                onClick={() => onSelectImportPeer?.(entry.path)}
                className={`w-full text-left text-[11px] font-mono rounded-lg px-2.5 py-1 border truncate ${
                  linked
                    ? 'text-cyan-300 bg-cyan-950/20 border-cyan-900/50 hover:border-cyan-700/60 cursor-pointer'
                    : 'text-slate-400 bg-slate-950/40 border-slate-900 cursor-default'
                }`}
                title={`${entry.path} - ${entry.kind} import${linked ? ' (on canvas)' : ''}`}
              >
                {entry.path} <span className="text-slate-500">{entry.kind}</span>
              </button>
            );
          })}
          {(forensics.importedFiles?.length ?? 0) > 5 && (
            <p className="text-[10px] text-slate-500 italic">
              +{(forensics.importedFiles?.length ?? 0) - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
};
