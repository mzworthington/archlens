import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

const badgeClass = 'backdrop-blur-md shadow-lg shadow-black/30';

/** Diagram level and validation badges for the canvas top-left chrome. */
export const WorkspaceStatusBadges: React.FC = () => {
  const { schema, validationResult, schemaVersionWarning } = useBlueprintStore();

  return (
    <div
      className="flex flex-wrap items-center gap-2 max-w-[min(100%,20rem)] pointer-events-none"
      data-testid="workspace-status-badges"
    >
      <span
        className={`px-2 py-0.5 rounded bg-blue-950/90 border border-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-wider font-mono ${badgeClass}`}
      >
        {schema.level || 'Container'}
      </span>
      {schemaVersionWarning ? (
        <span
          className={`flex items-center gap-1 text-[10px] text-amber-300 font-semibold bg-amber-950/90 px-2 py-0.5 rounded border border-amber-900/40 max-w-[12rem] ${badgeClass}`}
          title={`${schemaVersionWarning.message} ${schemaVersionWarning.migrationHint}`}
          data-testid="schema-version-warning"
        >
          <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
          <span className="truncate">{schemaVersionWarning.title}</span>
        </span>
      ) : null}
      {validationResult.isValid ? (
        <span
          className={`flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-900/30 ${badgeClass}`}
        >
          <CheckCircle className="w-3 h-3 shrink-0" />
          <span>Valid</span>
        </span>
      ) : (
        <span
          className={`flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-950/90 px-2 py-0.5 rounded border border-red-900/30 animate-pulse ${badgeClass}`}
        >
          <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
          <span>Cycle Detected</span>
        </span>
      )}
    </div>
  );
};
