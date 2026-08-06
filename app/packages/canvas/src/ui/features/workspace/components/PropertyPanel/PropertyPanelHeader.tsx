import React from 'react';
import { ResiliencePanelTabs } from './ResiliencePanelTabs';
import type { PropertyPanelModel } from './usePropertyPanelModel';

type PropertyPanelHeaderProps = Pick<
  PropertyPanelModel,
  | 'titleType'
  | 'selectedNodeId'
  | 'selectedEdgeId'
  | 'selectNode'
  | 'selectEdge'
  | 'toggleRightCollapsed'
  | 'isResilienceMode'
  | 'resiliencePanelTab'
  | 'setResiliencePanelTab'
>;

export const PropertyPanelHeader: React.FC<PropertyPanelHeaderProps> = ({
  titleType,
  selectedNodeId,
  selectedEdgeId,
  selectNode,
  selectEdge,
  toggleRightCollapsed,
  isResilienceMode,
  resiliencePanelTab,
  setResiliencePanelTab,
}) => (
  <>
    <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40">
      <h3 className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs">
        Properties Panel - {titleType}
      </h3>
      <div className="flex items-center gap-2">
        {selectedNodeId ? (
          <button
            onClick={() => selectNode(null)}
            className="text-xs font-mono text-slate-400 hover:text-brand-400 cursor-pointer transition focus:outline-none"
          >
            Clear Selection
          </button>
        ) : null}
        {selectedEdgeId ? (
          <button
            onClick={() => selectEdge(null)}
            className="text-xs font-mono text-slate-400 hover:text-brand-400 cursor-pointer transition focus:outline-none"
          >
            Clear Selection
          </button>
        ) : null}
        <button
          onClick={toggleRightCollapsed}
          className="sm:hidden min-h-11 min-w-11 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center text-sm"
          title="Close Panel"
          aria-label="Close Properties Panel"
        >
          ✕
        </button>
      </div>
    </div>

    {isResilienceMode ? (
      <ResiliencePanelTabs activeTab={resiliencePanelTab} onTabChange={setResiliencePanelTab} />
    ) : null}
  </>
);
