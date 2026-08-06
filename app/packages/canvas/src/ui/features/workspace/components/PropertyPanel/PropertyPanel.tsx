import React from 'react';
import { formatAppVersionLabel } from '../../../../../application/pwa/buildInfo';
import { PropertyPanelContent } from './PropertyPanelContent';
import { PropertyPanelHeader } from './PropertyPanelHeader';
import { usePropertyPanelModel } from './usePropertyPanelModel';

export const PropertyPanel: React.FC = () => {
  const model = usePropertyPanelModel();

  return (
    <div
      data-testid="right-panel"
      className={`h-full flex flex-col bg-slate-950/80 glass-panel transition-all duration-300 ease-in-out ${
        model.rightCollapsed
          ? 'w-0 border-l-0 opacity-0 overflow-hidden pointer-events-none'
          : 'w-full sm:w-80 border-l border-slate-900'
      }`}
    >
      <PropertyPanelHeader
        titleType={model.titleType}
        selectedNodeId={model.selectedNodeId}
        selectedEdgeId={model.selectedEdgeId}
        selectNode={model.selectNode}
        selectEdge={model.selectEdge}
        toggleRightCollapsed={model.toggleRightCollapsed}
        isResilienceMode={model.isResilienceMode}
        resiliencePanelTab={model.resiliencePanelTab}
        setResiliencePanelTab={model.setResiliencePanelTab}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <PropertyPanelContent model={model} />
      </div>

      <div className="p-4 border-t border-slate-900 text-center">
        <span
          className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider break-all leading-relaxed"
          data-testid="app-version-label"
          title={`Build ${formatAppVersionLabel({ fullBuildId: true })}`}
        >
          Blueprint Engine {formatAppVersionLabel()}
        </span>
      </div>
    </div>
  );
};
