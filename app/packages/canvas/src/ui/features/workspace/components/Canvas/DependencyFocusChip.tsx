import React, { useMemo } from 'react';
import { Panel } from '@xyflow/react';
import type { DependencyViewMode } from '../../../../../application/forensics/dependencyViewMode';
import { countDependencyFocusMetrics } from '../../../../../application/forensics/countDependencyFocusMetrics';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';

type Props = {
  selectedNodeId: string | null;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  dependencyViewMode: DependencyViewMode;
  isResilienceMode: boolean;
  onSetViewMode: (mode: DependencyViewMode) => void;
};

export const DependencyFocusChip: React.FC<Props> = ({
  selectedNodeId,
  nodes,
  edges,
  dependencyViewMode,
  isResilienceMode,
  onSetViewMode,
}) => {
  const metrics = useMemo(
    () => countDependencyFocusMetrics(selectedNodeId, nodes, edges, dependencyViewMode),
    [selectedNodeId, nodes, edges, dependencyViewMode]
  );

  if (!selectedNodeId || isResilienceMode || dependencyViewMode === 'full') {
    return null;
  }

  const showExternalsToggle =
    dependencyViewMode === 'focus'
      ? metrics.externalHidden > 0
      : dependencyViewMode === 'focus-externals';

  const label =
    dependencyViewMode === 'focus-externals'
      ? `Tree: ${metrics.internalCount} nodes · ${metrics.externalInTree} externals`
      : `Focus: ${metrics.internalCount} nodes${
          metrics.externalHidden > 0 ? ` · ${metrics.externalHidden} externals hidden` : ''
        }`;

  return (
    <Panel
      position="top-center"
      className="!mt-14 pointer-events-auto"
      data-testid="dependency-focus-chip"
    >
      <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1.5 text-[10px] font-mono text-slate-300 shadow-lg backdrop-blur-md">
        <span>{label}</span>
        {showExternalsToggle ? (
          <button
            type="button"
            className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 hover:bg-brand-500/20 cursor-pointer"
            data-testid="dependency-focus-chip-externals"
            onClick={() =>
              onSetViewMode(dependencyViewMode === 'focus-externals' ? 'focus' : 'focus-externals')
            }
          >
            {dependencyViewMode === 'focus-externals' ? 'Hide externals' : '+ Externals'}
          </button>
        ) : null}
      </div>
    </Panel>
  );
};
