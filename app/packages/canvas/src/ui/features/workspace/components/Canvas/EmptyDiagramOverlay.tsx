import React from 'react';
import { Inbox } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { EMPTY_WORKSPACE_PATH } from '../../../../../application/store/states/diagramState/resetToEmptyWorkspace';

/**
 * Shown when a loaded diagram schema has zero nodes (e.g. a wiped containers.yaml).
 * Distinct from the intentional blank "Empty Workspace" starter canvas.
 */
export const EmptyDiagramOverlay: React.FC = () => {
  const isLoading = useBlueprintStore(state => state.isLoading);
  const nodes = useBlueprintStore(state => state.nodes);
  const schemaName = useBlueprintStore(state => state.schema?.name);
  const currentFilePath = useBlueprintStore(state => state.currentFilePath);

  if (isLoading || nodes.length > 0) return null;
  if (!currentFilePath || currentFilePath === EMPTY_WORKSPACE_PATH) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 pointer-events-none px-6"
      role="status"
      aria-live="polite"
      data-testid="empty-diagram-overlay"
    >
      <div className="p-5 rounded-2xl bg-[#061125]/90 border border-[#00f0ff]/20 shadow-[0_0_30px_rgba(0,240,255,0.12)] flex flex-col items-center gap-3 max-w-[280px] text-center pointer-events-none">
        <Inbox className="w-8 h-8 text-slate-400" aria-hidden />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-200">No nodes in this diagram</p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {schemaName ? (
              <>
                <span className="text-slate-300">{schemaName}</span> loaded but has no nodes.
                Re-scan or republish the catalog if this view should show containers.
              </>
            ) : (
              <>This diagram loaded but has no nodes.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
