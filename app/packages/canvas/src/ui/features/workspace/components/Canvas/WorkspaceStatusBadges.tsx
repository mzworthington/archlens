import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

const badgeClass =
  'canvas-status-chip px-2 py-0.5 rounded border text-[10px] font-semibold backdrop-blur-md shadow-lg shadow-black/30';

/** Diagram level and validation badges for the canvas top-left chrome. */
export const WorkspaceStatusBadges: React.FC = () => {
  const {
    schema,
    validationResult,
    schemaVersionWarning,
    isBrowserLiteWorkspace,
    setIsValidationOpen,
  } = useBlueprintStore();

  return (
    <div
      className="flex flex-wrap items-center gap-2 max-w-[min(100%,20rem)]"
      data-testid="workspace-status-badges"
    >
      {isBrowserLiteWorkspace ? (
        <span
          className={`${badgeClass} bg-amber-950/90 border-amber-500/40 text-amber-300 uppercase tracking-wider font-mono`}
          title="Browser scan — git hotspots when `.git` is readable"
          data-status-tone="warn"
          data-testid="browser-lite-workspace-badge"
        >
          Lite scan
        </span>
      ) : null}
      <span
        className={`${badgeClass} bg-blue-950/90 border-blue-900/40 text-blue-400 uppercase tracking-wider font-mono`}
        data-status-tone="level"
        data-testid="schema-level-badge"
      >
        {schema.level || 'Container'}
      </span>
      {schemaVersionWarning ? (
        <span
          className={`${badgeClass} flex items-center gap-1 text-amber-300 bg-amber-950/90 border-amber-900/40 max-w-[12rem]`}
          title={`${schemaVersionWarning.message} ${schemaVersionWarning.migrationHint}`}
          data-status-tone="warn"
          data-testid="schema-version-warning"
        >
          <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
          <span className="truncate">{schemaVersionWarning.title}</span>
        </span>
      ) : null}
      {validationResult.isValid ? (
        <span
          className={`${badgeClass} flex items-center gap-1 text-emerald-400 bg-emerald-950/90 border-emerald-900/30`}
          title="Architecture graph is valid"
          data-status-tone="ok"
          data-testid="validation-status-badge"
        >
          <CheckCircle className="w-3 h-3 shrink-0" />
          <span>Valid</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsValidationOpen(true)}
          className={`${badgeClass} flex items-center gap-1 text-red-400 bg-red-950/90 hover:bg-red-900/90 border-red-900/30 animate-pulse transition cursor-pointer`}
          title="Click to inspect validation issues"
          data-status-tone="alert"
          data-testid="validation-status-badge"
        >
          <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
          <span>Cycle Detected</span>
        </button>
      )}
    </div>
  );
};
